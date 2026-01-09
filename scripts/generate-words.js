/**
 * AI 词汇生成脚本
 * 使用 Gemini 3 Flash 为每个规则扩展词汇
 * 
 * 用法：node scripts/generate-words.js [ruleId]
 * 如果不指定 ruleId，将处理所有规则
 */

const fs = require('fs');
const path = require('path');
const AIService = require('./ai-service');

// 配置
const CONFIG = {
    rulesPath: path.join(__dirname, '../data/rules-master.json'),
    outputPath: path.join(__dirname, '../data/generated-words.json'),
    wordsPerRule: 50,
    model: 'gemini-3-flash'
};

// 系统提示词（完整版 - 来自 提示词.md）
const SYSTEM_PROMPT = `你是"Phonics 词库扩展专家"，专为自然拼读教学生成高质量词汇数据。

## 核心任务
根据输入的 RULE_JSON，生成 N 个符合该规则的日常高频词汇（默认 N=20）。
输出必须是纯 JSON，不要任何解释、Markdown 或额外文字。

## 硬性约束（必须遵守）

### A. 词汇质量
| 规则 | 说明 |
|:---|:---|
| 日常高频 | 只选家庭、学校、食物、动物、身体、动作等初学者友好词汇 |
| 长度 | 优先 3–7 字母（多音节规则除外） |
| 禁止 | 专有名词、缩写、俚语、敏感词、生僻词、连字符词（如 yo-yo） |
| 禁止 | 多音词（read/lead 等有歧义的词） |
| 禁止 | 机械变形（加 s/ed/ing），除非规则本身是词尾变化类 |

### B. 规则匹配（最重要）
- 每个词必须包含 focus.value 对应的拼写
- 该部分发音必须与 sound.ipa 完全一致
- 若规则标注 wordListOnly: true 或 low productivity，宁少勿滥

### C. Breakdown 格式
- 分隔符：|（不是 -）
- 默认按单字母拆分：rabbit → r|a|b|b|i|t
- 允许合并为单个 token 的情况：
  - Digraph/Trigraph: sh, ch, th, ph, wh, ck, ng, nk, tch, dge
  - Vowel Teams: ai, ay, ee, ea, oa, ow, oi, oy, ou, au, aw, oo, igh
  - R-Controlled: ar, er, ir, or, ur
- 禁止合并：双辅音（bb, tt, pp, ll）必须拆开
- Split Digraph（如 a_e）：拆为单字母，用 tokenFlags 标记静音 e

### D. Highlight 格式
根据 focus.match 类型：

Type: token
"highlight": { "type": "token", "value": "sh" }
（value 必须作为完整 token 出现在 breakdown 中）

Type: split（如 a_e, i_e）
"highlight": { "type": "split", "value": "a_e", "indices": [1, 3] },
"tokenFlags": [{ "index": 3, "flag": "silent" }]

### E. Syllables 格式
- 必须输出，单音节词也要：["c|a|t"]
- 多音节用数组：["rab", "bit"] → ["r|a|b", "b|i|t"]
- 音节划分规则词（VCCV, C+le 等）必须体现切分意图

### F. 释义与例句
| 字段 | 要求 |
|:---|:---|
| meaning | 简短中文释义（2-4字） |
| sentence | 英文例句，6-10 词，简单日常 |
| sentence_cn | 自然中文翻译 |

## 去重规则
1. 不输出 fewshot 或 examples 中已有的词
2. 本次生成的 items 内不重复
3. 不输出大小写变体

## 输出格式（纯 JSON）
{
  "ruleId": "vowel.short.a",
  "soundIpa": "/æ/",
  "items": [
    {
      "word": "jam",
      "pos": "noun",
      "meaning": "果酱",
      "sentence": "I like jam on my toast.",
      "sentence_cn": "我喜欢在吐司上涂果酱。",
      "breakdown": "j|a|m",
      "highlight": { "type": "token", "value": "a" },
      "tokenFlags": [],
      "syllables": ["j|a|m"]
    }
  ]
}

## 输出前自检清单
- 每个词的 focus 部分发音与 sound.ipa 一致
- highlight.value 在 breakdown 中作为完整 token 存在
- Breakdown 粒度正确（digraph 合并，双辅音拆开）
- Syllables 数组格式正确
- 例句 6-10 词，目标词只出现一次
- 无重复、无 fewshot/examples 中的词

## 词不足 N 个时
若符合条件的常用词不足 N 个，输出所有符合条件的词即可，无需凑数。质量优先。

现在请根据以下输入生成词汇：`;

async function generateWordsForRule(ai, rule, dictionary) {
    const prompt = `${SYSTEM_PROMPT}

N=${CONFIG.wordsPerRule}
RULE_JSON=${JSON.stringify(rule, null, 2)}`;

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

    // 读取已有的生成结果（增量模式）
    let generated = {};
    if (fs.existsSync(CONFIG.outputPath)) {
        generated = JSON.parse(fs.readFileSync(CONFIG.outputPath, 'utf8'));
        console.log(`📦 已有生成结果：${Object.keys(generated).length} 条`);
    }

    // 筛选要处理的规则
    const rulesToProcess = targetRuleId
        ? rulesData.rules.filter(r => r.id === targetRuleId)
        : rulesData.rules.filter(r => !generated[r.id]);

    console.log(`🔄 待处理：${rulesToProcess.length} 条规则\n`);

    let totalGenerated = 0;
    let totalValid = 0;

    for (const rule of rulesToProcess) {
        const result = await generateWordsForRule(ai, rule, dictionary);
        if (result && result.items) {
            totalGenerated += result.items.length;
            totalValid += result.items.length;
            generated[rule.id] = result;
            // 每处理一条就保存（防丢失）
            fs.writeFileSync(CONFIG.outputPath, JSON.stringify(generated, null, 2), 'utf8');
        }

        // 避免 API 限流
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`🎉 完成！`);
    console.log(`   处理规则：${rulesToProcess.length} 条`);
    console.log(`   有效词汇：${totalValid} 个`);
    console.log(`📁 输出文件：${CONFIG.outputPath}`);
}

main().catch(console.error);

