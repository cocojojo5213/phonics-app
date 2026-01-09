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
    wordsPerRule: 20,
    model: 'gemini-3-flash'
};

// 系统提示词（精简版）
const SYSTEM_PROMPT = `你是 Phonics 词库扩展专家。根据输入的规则 JSON，生成符合该规则的日常高频词汇。

输出格式（纯 JSON）：
{
  "ruleId": "规则ID",
  "items": [
    {
      "word": "单词",
      "meaning": "中文释义",
      "sentence": "英文例句",
      "sentence_cn": "中文翻译",
      "breakdown": "音素拆解（用|分隔）",
      "highlight": { "type": "token", "value": "高亮部分" }
    }
  ]
}

约束：
1. 只选日常高频词，3-7字母
2. 每个词的 focus 部分发音必须与规则一致
3. Breakdown 中 digraph 保持完整（sh,ch,ck,ai,ee 等）
4. 不输出规则中已有的 fewshot/examples 词
5. 例句 6-10 词，简单日常`;

async function generateWordsForRule(ai, rule) {
    const prompt = `${SYSTEM_PROMPT}

N=${CONFIG.wordsPerRule}
RULE_JSON=${JSON.stringify(rule, null, 2)}`;

    try {
        const schema = {
            type: 'object',
            properties: {
                ruleId: { type: 'string' },
                items: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            word: { type: 'string' },
                            meaning: { type: 'string' },
                            sentence: { type: 'string' },
                            sentence_cn: { type: 'string' },
                            breakdown: { type: 'string' },
                            highlight: { type: 'object' }
                        },
                        required: ['word', 'meaning', 'breakdown']
                    }
                }
            },
            required: ['ruleId', 'items']
        };

        const result = await ai.generateSchema(prompt, schema);
        console.log(`✅ ${rule.id}: 生成 ${result.items?.length || 0} 个词`);
        return result;
    } catch (error) {
        console.error(`❌ ${rule.id}: 生成失败 - ${error.message}`);
        return null;
    }
}

async function main() {
    const targetRuleId = process.argv[2];

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

    for (const rule of rulesToProcess) {
        const result = await generateWordsForRule(ai, rule);
        if (result) {
            generated[rule.id] = result;
            // 每处理一条就保存（防丢失）
            fs.writeFileSync(CONFIG.outputPath, JSON.stringify(generated, null, 2), 'utf8');
        }

        // 避免 API 限流
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n🎉 完成！共生成 ${Object.keys(generated).length} 条规则的词汇`);
    console.log(`📁 输出文件：${CONFIG.outputPath}`);
}

main().catch(console.error);
