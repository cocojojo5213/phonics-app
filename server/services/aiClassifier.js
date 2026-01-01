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
    letters: '26个字母（仅限单个字母 a-z，长度必须为1）',
    short_vowels: '短元音组合（如 at, an, ad, ap, ed, ig, op, ub, ug, un, ell, ess, ill 等）',
    long_vowels: '长元音组合（如 ai, ay, ea, ee, ie, oa, ue, a_e, i_e, o_e, u_e 等）',
    consonant_blends: '辅音组合（如 bl, ch, sh, th, ck, ng, nk, wh, ph 等）',
    r_controlled: 'R控制元音（如 ar, er, ir, or, ur）',
    other_vowels: '其他元音（如 ow, ou, oo, oi, oy, aw, au 等）'
};

// 预分类规则（不需要 AI 直接判断的情况）
const PRE_CLASSIFY_RULES = {
    // 单个字母直接归 letters
    singleLetter: (pattern) => /^[a-z]$/i.test(pattern) ? 'letters' : null,

    // 常见短元音模式
    shortVowel: (pattern) => {
        const shortVowelPatterns = [
            'ad', 'ag', 'am', 'an', 'ap', 'at', 'ax',  // a 族
            'ed', 'eg', 'en', 'et', 'ell', 'ess',       // e 族
            'ib', 'id', 'ig', 'ill', 'im', 'in', 'ip', 'it', 'ix',  // i 族
            'ob', 'od', 'og', 'op', 'ot', 'ox',         // o 族
            'ub', 'ud', 'ug', 'ull', 'um', 'un', 'up', 'us', 'ut'   // u 族
        ];
        return shortVowelPatterns.includes(pattern.toLowerCase()) ? 'short_vowels' : null;
    },

    // Magic-E 长元音
    magicE: (pattern) => /^[aeiou]_e$/i.test(pattern) ? 'long_vowels' : null,

    // R 控制元音
    rControlled: (pattern) => /^[aeiou]r$/i.test(pattern) ? 'r_controlled' : null
};

/**
 * 使用预分类规则快速分类
 */
function preClassify(pattern) {
    for (const rule of Object.values(PRE_CLASSIFY_RULES)) {
        const result = rule(pattern);
        if (result) return result;
    }
    return null;
}

/**
 * 使用 AI 判断发音模式应该归到哪个分类
 */
async function classifyPattern(pattern) {
    // 先尝试预分类规则
    const preResult = preClassify(pattern);
    if (preResult) {
        console.log(`🏷️ 预分类: ${pattern} → ${preResult}`);
        return preResult;
    }

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

【重要规则】
1. letters 分类只能是单个英文字母 (a-z)，长度必须为1
2. 任何两个或更多字母的组合都不能归入 letters
3. 以元音+辅音结尾的组合通常是 short_vowels（如 ell, ess, ill）
4. Magic-E 模式（如 a_e, i_e）归入 long_vowels

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

        // 再次验证：如果 AI 返回 letters 但模式不是单字母，则拒绝
        if (categoryId === 'letters' && pattern.length !== 1) {
            console.log(`⚠️ AI 错误地将 "${pattern}" 归入 letters，已拒绝`);
            return 'short_vowels'; // 默认归入短元音
        }

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
