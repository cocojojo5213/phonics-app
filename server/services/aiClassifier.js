/**
 * AI 分类服务
 * 
 * 自动识别新的发音模式应该归到哪个分类
 */

require('dotenv').config();
const phonicsData = require('../../data/phonicsData');
const aiService = require('./ai');

// 分类定义
const CATEGORIES = {
    letters: '26个字母（单个字母如 a, b, c）',
    short_vowels: '短元音组合（如 at, an, ad, ap, ig, op）',
    long_vowels: '长元音组合（如 ai, ay, ea, ee, ie, oa, ue）',
    consonant_blends: '辅音组合（如 bl, ch, sh, th, ck, ng）',
    r_controlled: 'R控制元音（如 ar, er, ir, or, ur）',
    other_vowels: '其他元音（如 ow, ou, oo, oi, oy, aw）'
};

/**
 * 使用 AI 判断发音模式应该归到哪个分类
 */
async function classifyPattern(pattern) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.log('⚠️ 没有配置 OPENAI_API_KEY，无法自动分类');
        return null;
    }

    const categoryDescriptions = Object.entries(CATEGORIES)
        .map(([id, desc]) => `- ${id}: ${desc}`)
        .join('\n');

    const prompt = `判断以下英语发音模式应该归到哪个分类：

发音模式: "${pattern}"

分类选项:
${categoryDescriptions}

只返回分类 ID（如 letters, short_vowels 等），不要其他文字。
如果无法确定，返回 null。`;

    try {
        const userApi = {
            apiKey,
            apiBase: process.env.OPENAI_BASE_URL || null,
            // 分类用最强模型，反正调用少
            model: process.env.OPENAI_CLASSIFY_MODEL || 'gpt-5.2'
        };

        const response = await aiService.callOpenAI(prompt, userApi);
        const categoryId = response.trim().toLowerCase();

        if (CATEGORIES[categoryId]) {
            console.log(`🏷️ AI 分类: ${pattern} → ${categoryId}`);
            return categoryId;
        }

        console.log(`❓ AI 无法分类: ${pattern} (返回: ${response})`);
        return null;

    } catch (error) {
        console.error('AI 分类失败:', error.message);
        return null;
    }
}

/**
 * 检查发音模式是否已经在 phonicsData 中定义
 */
function isPatternDefined(pattern) {
    for (const categoryId of Object.keys(phonicsData)) {
        const data = phonicsData[categoryId];
        if (Array.isArray(data)) {
            if (data.some(p => p.pattern.toLowerCase() === pattern.toLowerCase())) {
                return true;
            }
        }
    }
    return false;
}

/**
 * 获取发音模式所在的分类
 */
function getPatternCategory(pattern) {
    for (const categoryId of Object.keys(phonicsData)) {
        const data = phonicsData[categoryId];
        if (Array.isArray(data)) {
            if (data.some(p => p.pattern.toLowerCase() === pattern.toLowerCase())) {
                return categoryId;
            }
        }
    }
    return null;
}

module.exports = {
    classifyPattern,
    isPatternDefined,
    getPatternCategory,
    CATEGORIES
};
