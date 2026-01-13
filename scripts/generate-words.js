/**
 * AI 词汇生成脚本
 * 使用 Gemini 3 Flash 为每个规则扩展词汇
 * 
 * 用法：node scripts/generate-words.js [ruleId]
 * 如果不指定 ruleId，将处理所有规则
 */

// 加载环境变量
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const AIService = require('./ai-service');

// 配置
const CONFIG = {
    rulesPath: path.join(__dirname, '../data/rules-master.json'),
    outputPath: path.join(__dirname, '../data/generated-words.json'),
    wordsPerBatch: 5,          // 每次 API 调用生成的词数
    targetWordsPerRule: 25,    // 每条规则的目标词数
    concurrency: 20,           // 并发数（DSQ动态配额，大胆试）
    model: process.env.AI_MODEL || 'gemini-3-flash-preview'
};

// 精简版提示词（保留关键规则，减少冗余）
const SYSTEM_PROMPT = `你是 Phonics 词库扩展专家。根据 RULE_JSON 生成词汇，输出纯 JSON，无解释。

## 词汇要求
- 日常高频词（3-7字母），禁止专有名词/俚语/多音词/连字符词
- 禁止机械变形（+s/ed/ing），除非规则本身是词尾类
- 词必须包含 focus.value，发音匹配 sound.ipa
- 不重复 fewshot/examples 或已有词

## Breakdown 规则（重要）
分隔符: |
- 默认单字母拆: rabbit → r|a|b|b|i|t
- 合并 Digraph: sh,ch,th,ph,wh,ck,ng,nk,tch,dge
- 合并 Vowel Teams: ai,ay,ee,ea,oa,ow,oi,oy,ou,au,aw,oo,igh
- 合并 R-Controlled: ar,er,ir,or,ur
- 双辅音bb,tt,pp,ll必须拆开
- Split Digraph(a_e): 拆为单字母，tokenFlags标记silent e

## Highlight 规则
Type token: {"type":"token","value":"sh"} - value必须在breakdown中作为完整token
Type split(a_e等): {"type":"split","value":"a_e","indices":[1,3]} + tokenFlags:[{"index":3,"flag":"silent"}]

## Syllables
单音节: ["c|a|t"]
多音节: ["sh|e|l","ter"] (每音节用|分隔)

## 输出格式
{"ruleId":"xxx","soundIpa":"/x/","items":[{"word":"cat","meaning":"猫","sentence":"The cat is cute.","sentence_cn":"这只猫很可爱。","breakdown":"c|a|t","highlight":{"type":"token","value":"a"},"tokenFlags":[],"syllables":["c|a|t"]}]}

生成词汇：`;

async function generateWordsForRule(ai, rule, dictionary, existingWords = []) {
    // 构建排除词列表
    const excludeList = existingWords.length > 0
        ? `\n\n## 已有词汇（请勿重复）\n${existingWords.join(', ')}`
        : '';

    const prompt = `${SYSTEM_PROMPT}

N=${CONFIG.wordsPerBatch}
RULE_JSON=${JSON.stringify(rule, null, 2)}${excludeList}`;

    try {
        const schema = {
            type: 'object',
            properties: {
                ruleId: { type: 'string' },
                soundIpa: { type: 'string' },
                items: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            word: { type: 'string' },
                            pos: { type: 'string' },
                            meaning: { type: 'string' },
                            sentence: { type: 'string' },
                            sentence_cn: { type: 'string' },
                            breakdown: { type: 'string' },
                            highlight: { type: 'object' },
                            tokenFlags: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        index: { type: 'integer' },
                                        flag: { type: 'string' }
                                    }
                                }
                            },
                            syllables: {
                                type: 'array',
                                items: { type: 'string' }
                            }
                        },
                        required: ['word', 'meaning', 'breakdown', 'syllables']
                    }
                }
            },
            required: ['ruleId', 'items']
        };

        const result = await ai.generateSchema(prompt, schema);

        // 实时验证：过滤掉不在词典中的单词
        const originalCount = result.items?.length || 0;
        if (dictionary && result.items) {
            const rejected = [];
            result.items = result.items.filter(item => {
                const wordLower = item.word.toLowerCase();
                if (dictionary.has(wordLower)) {
                    return true;
                } else {
                    rejected.push(item.word);
                    return false;
                }
            });

            const validCount = result.items.length;
            const rejectedCount = rejected.length;

            if (rejectedCount > 0) {
                console.log(`✅ ${rule.id}: 生成 ${originalCount} → 验证通过 ${validCount} 个`);
                console.log(`   ❌ 已丢弃: ${rejected.join(', ')}`);
            } else {
                console.log(`✅ ${rule.id}: 生成 ${validCount} 个词（全部验证通过）`);
            }
        } else {
            console.log(`✅ ${rule.id}: 生成 ${originalCount} 个词（未验证）`);
        }

        return result;
    } catch (error) {
        console.error(`❌ ${rule.id}: 生成失败 - ${error.message}`);
        return null;
    }
}

async function loadDictionary() {
    try {
        const words = require('an-array-of-english-words');
        const dict = new Set(words.map(w => w.toLowerCase()));
        console.log(`📖 词典加载完成：${dict.size.toLocaleString()} 个单词\n`);
        return dict;
    } catch (e) {
        console.log('⚠️ 未安装词典包，跳过验证（npm install an-array-of-english-words）\n');
        return null;
    }
}

async function main() {
    const targetRuleId = process.argv[2];

    // 加载词典（用于实时验证）
    const dictionary = await loadDictionary();

    // 读取规则库
    const rulesData = JSON.parse(fs.readFileSync(CONFIG.rulesPath, 'utf8'));
    console.log(`📚 规则库加载完成：${rulesData.rules.length} 条规则`);

    // 初始化 AI 服务（使用 ADC）
    const ai = new AIService({ model: CONFIG.model });

    // 读取已有的生成结果（增量模式 = 断点续传）
    let generated = {};
    if (fs.existsSync(CONFIG.outputPath)) {
        generated = JSON.parse(fs.readFileSync(CONFIG.outputPath, 'utf8'));
        console.log(`📦 已有生成结果：${Object.keys(generated).length} 条（断点续传）`);
    }

    // 暂停信号文件路径
    const STOP_SIGNAL = path.join(__dirname, '../.stop-generate');

    // 清除可能存在的旧信号文件
    if (fs.existsSync(STOP_SIGNAL)) {
        fs.unlinkSync(STOP_SIGNAL);
    }

    // 筛选要处理的规则（词数不足目标数的规则）
    // 按已有词汇数量从少到多排序，优先补充词少的规则
    const rulesToProcess = targetRuleId
        ? rulesData.rules.filter(r => r.id === targetRuleId)
        : rulesData.rules
            .filter(r => {
                const existing = generated[r.id]?.items?.length || 0;
                return existing < CONFIG.targetWordsPerRule;
            })
            .sort((a, b) => {
                const countA = generated[a.id]?.items?.length || 0;
                const countB = generated[b.id]?.items?.length || 0;
                return countA - countB; // 从少到多
            });

    const totalRules = rulesData.rules.length;
    const completedRules = rulesData.rules.filter(r =>
        (generated[r.id]?.items?.length || 0) >= CONFIG.targetWordsPerRule
    ).length;
    const pendingRules = rulesToProcess.length;

    console.log(`🎯 目标：每规则 ${CONFIG.targetWordsPerRule} 个词（每次 ${CONFIG.wordsPerBatch} 个，并发 ${CONFIG.concurrency}）`);
    console.log(`🔄 待处理：${pendingRules} 条规则（已完成 ${completedRules}/${totalRules}）`);
    console.log(`💡 提示：创建 .stop-generate 文件可暂停任务\n`);

    let processedCount = 0;
    let totalValid = 0;
    let stopped = false;
    const failedRules = new Map(); // 记录每个规则的连续失败次数
    const MAX_FAILURES = 2; // 连续失败2次就跳过

    // 处理单条规则的函数
    async function processRule(rule) {
        // 检查是否已经连续失败太多次
        if ((failedRules.get(rule.id) || 0) >= MAX_FAILURES) {
            console.log(`[${rule.id}] 跳过（连续失败 ${MAX_FAILURES} 次）`);
            return null;
        }

        // 获取最新的已有词汇（支持并发更新）
        const existingItems = generated[rule.id]?.items || [];
        const existingWords = existingItems.map(item => item.word.toLowerCase());
        const currentCount = existingWords.length;

        if (currentCount >= CONFIG.targetWordsPerRule) {
            return null;  // 跳过已达标的
        }

        console.log(`[${rule.id}] 当前 ${currentCount}/${CONFIG.targetWordsPerRule} 个词...`);

        try {
            const result = await generateWordsForRule(ai, rule, dictionary, existingWords);
            if (result && result.items && result.items.length > 0) {
                failedRules.delete(rule.id); // 成功了，清除失败记录
                return { rule, result, existingItems };
            } else {
                // 返回空结果也算失败
                failedRules.set(rule.id, (failedRules.get(rule.id) || 0) + 1);
                console.log(`[${rule.id}] 无合适词汇（失败 ${failedRules.get(rule.id)}/${MAX_FAILURES}）`);
            }
        } catch (error) {
            failedRules.set(rule.id, (failedRules.get(rule.id) || 0) + 1);
            console.error(`[${rule.id}] 生成失败 (${failedRules.get(rule.id)}/${MAX_FAILURES}): ${error.message}`);
        }
        return null;
    }

    // 并发处理（分批）
    for (let i = 0; i < rulesToProcess.length; i += CONFIG.concurrency) {
        // 检查暂停信号
        if (fs.existsSync(STOP_SIGNAL)) {
            console.log(`\n⏸️  检测到暂停信号，任务已暂停`);
            console.log(`   重新运行 generate 任务即可从断点继续`);
            fs.unlinkSync(STOP_SIGNAL);
            stopped = true;
            break;
        }

        // 取一批规则
        const batch = rulesToProcess.slice(i, i + CONFIG.concurrency);
        console.log(`\n📦 批次 ${Math.floor(i / CONFIG.concurrency) + 1}: 并发处理 ${batch.length} 条规则`);

        // 并发执行
        const results = await Promise.all(batch.map(rule => processRule(rule)));

        // 处理结果（串行保存，避免文件冲突）
        for (const res of results) {
            if (res) {
                const { rule, result, existingItems } = res;
                const mergedItems = [...existingItems, ...result.items];

                generated[rule.id] = {
                    ruleId: rule.id,
                    soundIpa: result.soundIpa || generated[rule.id]?.soundIpa,
                    items: mergedItems
                };

                totalValid += result.items.length;
                processedCount++;
                console.log(`   ✅ [${rule.id}] +${result.items.length} → ${mergedItems.length} 个`);
            }
        }

        // 每批保存一次
        if (results.some(r => r !== null)) {
            fs.writeFileSync(CONFIG.outputPath, JSON.stringify(generated, null, 2), 'utf8');
        }

        // 批次间延迟（避免 429 限流）
        if (i + CONFIG.concurrency < rulesToProcess.length) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒
        }
    }

    console.log(`\n${'='.repeat(50)}`);
    if (stopped) {
        console.log(`⏸️  任务已暂停`);
    } else {
        console.log(`🎉 全部完成！`);
    }
    console.log(`   处理规则：${processedCount} 条`);
    console.log(`   新增词汇：${totalValid} 个`);
    console.log(`📁 输出文件：${CONFIG.outputPath}`);
}

main().catch(console.error);

