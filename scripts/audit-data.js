/**
 * Phonics Data Audit & Cleaning Script
 * 使用 Gemini 3 Pro (High Intelligence) 审计和修复词汇数据
 * 重点修复：音节划分 (Syllabification)、音素拆解 (Breakdown)、高亮准确性
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const AIService = require('./ai-service');

// 配置
const CONFIG = {
    rulesPath: path.join(__dirname, '../data/rules-master.json'),
    // 使用更高智能的模型进行审计
    model: process.env.AUDIT_MODEL || 'gemini-3-pro-preview',
    concurrency: 2, // 审计并发不用太高，求稳
    batchSize: 10,  // 每批检查多少个词
    saveInterval: 50 // 每处理多少个词保存一次
};

// 系统提示词 - 专门用于审计和纠错
const AUDIT_PROMPT = `你是语言学专家，专门负责校对自然拼读（Phonics）数据。
你需要检查输入单词的【音节划分】和【音素拆解】是否准确。

## 输入数据结构
[
  { "id": "word_id", "word": "example", "pattern": "a_e", "breakdown": "...", "syllables": [...] }
]

## 你的任务
对每个单词进行检查，严格遵守以下标准：

1. **音节划分 (Syllables)** [最重要]
   - 必须遵循标准英语音节划分规则 (VCCV, VCV 等)。
   - 必须显示所有音节，即使是单音节词（单音节数组长度为1）。
   - 音节内部必须保留 '|' 分隔符，与 breakdown 对齐（如果可能）。
   - 示例: "rabbit" -> ["r|a|b", "b|i|t"] (VCCV)
   - 示例: "music" -> ["m|u", "s|i|c"] (VCV)

2. **音素拆解 (Breakdown)**
   - 检查是否正确拆分了 Digraphs (sh, ch, th...) 和 Vowel Teams (ai, ee, oa...)。
   - 拆解后的字母拼起来必须等于原单词。
   - 双辅音 (rabbit -> b|b) 必须拆开。

3. **高亮 (Highlight)**
   - 确保 target pattern 在 breakdown 中能被找到。
   - 如果是 Split Digraph (a_e)，确保 indices 正确。

## 输出格式
返回一个 JSON 数组，包含**所有**输入的单词。
如果原数据正确，syllables 和 breakdown 保持原样。
如果原数据有误，请修正。

{
  "results": [
    {
      "word": "winning",
      "syllables": ["w|i|n", "n|ing"],
      "breakdown": "w|i|n|n|ing",
      "corrected": true  // 如果你做了修改，标记为 true
    }
  ]
}
`;

async function auditBatch(ai, items) {
    const prompt = `${AUDIT_PROMPT}\n\n待检查单词:\n${JSON.stringify(items, null, 2)}`;

    const schema = {
        type: "object",
        properties: {
            results: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        word: { type: "string" },
                        syllables: { type: "array", items: { type: "string" } },
                        breakdown: { type: "string" },
                        corrected: { type: "boolean" }
                    },
                    required: ["word", "syllables", "breakdown"]
                }
            }
        },
        required: ["results"]
    };

    try {
        const response = await ai.generateSchema(prompt, schema);
        return response.results;
    } catch (error) {
        console.error(`⚠️ 批次审计失败: ${error.message}`);
        return null;
    }
}

async function main() {
    console.log("🔍 开始 Phonics 数据审计...");
    console.log(`🤖 使用模型: ${CONFIG.model}`);

    // 加载数据
    const rulesData = JSON.parse(fs.readFileSync(CONFIG.rulesPath, 'utf8'));

    // 收集所有需要检查的词
    // 扁平化结构： { ruleIndex, wordIndex, wordData }
    let allTargets = [];

    rulesData.rules.forEach((rule, rIdx) => {
        if (!rule.words && rule.examples) {
            // 兼容旧数据结构，确保存储在 words 字段
            rule.words = rule.examples;
        }

        if (rule.words) {
            rule.words.forEach((word, wIdx) => {
                // 筛选条件：
                // 1. syllables 缺失
                // 2. 或者 syllables 长度为0
                // 3. (可选) 全量检查：注释掉下面这行即可检查所有词
                // const needsAudit = !word.syllables || word.syllables.length === 0;

                // 这里我们默认检查【所有多音节词】和【缺失syllables的词】
                // 简单起见，我们先跑全量检查（或者你可以改逻辑只跑一部分）
                // 为了演示，我们检查所有词，利用 Gemini 的判断力

                allTargets.push({
                    ruleId: rule.id,
                    pattern: rule.graphemes ? rule.graphemes[0] : null,
                    rIdx,
                    wIdx,
                    word: word.word,
                    breakdown: word.breakdown,
                    syllables: word.syllables
                });
            });
        }
    });

    console.log(`📋 共找到 ${allTargets.length} 个单词待审计`);

    const ai = new AIService({ model: CONFIG.model });

    let processed = 0;
    let corrected = 0;

    // 分批处理
    for (let i = 0; i < allTargets.length; i += CONFIG.batchSize) {
        const batch = allTargets.slice(i, i + CONFIG.batchSize);

        // 构造仅包含必要信息的请求对象
        const requestItems = batch.map(t => ({
            id: `${t.rIdx}_${t.wIdx}`, // 临时ID用于追踪
            word: t.word,
            pattern: t.pattern,
            breakdown: t.breakdown,
            syllables: t.syllables
        }));

        console.log(`Processing batch ${Math.floor(i / CONFIG.batchSize) + 1}/${Math.ceil(allTargets.length / CONFIG.batchSize)}...`);

        const results = await auditBatch(ai, requestItems);

        if (results) {
            // 应用修正
            results.forEach(res => {
                // 找到对应的原始引用
                // 注意：这里我们依靠结果的顺序或单词匹配，最稳妥是 map 回去
                const target = batch.find(b => b.word === res.word);
                if (target) {
                    const originalWordObj = rulesData.rules[target.rIdx].words[target.wIdx];

                    // 检查是否有实质变化
                    const syHasChanged = JSON.stringify(originalWordObj.syllables) !== JSON.stringify(res.syllables);
                    const bdHasChanged = originalWordObj.breakdown !== res.breakdown;

                    if (syHasChanged || bdHasChanged) {
                        originalWordObj.syllables = res.syllables;
                        originalWordObj.breakdown = res.breakdown;
                        corrected++;
                        console.log(`   ✏️ Fixed: ${target.word} -> ${JSON.stringify(res.syllables)}`);
                    }
                }
            });
        }

        processed += batch.length;

        // 定期保存
        if (processed % CONFIG.saveInterval === 0) {
            fs.writeFileSync(CONFIG.rulesPath, JSON.stringify(rulesData, null, 2));
            console.log(`💾 进度保存 (已处理 ${processed})`);
        }

        // 避免速率限制
        await new Promise(r => setTimeout(r, 1000));
    }

    // 最终保存
    fs.writeFileSync(CONFIG.rulesPath, JSON.stringify(rulesData, null, 2));
    console.log(`✅ 审计完成！共处理 ${processed} 个词，修正了 ${corrected} 个词的数据。`);
}

main().catch(console.error);
