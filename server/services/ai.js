/**
 * AI 扩词服务
 * 
 * 固定使用 gpt-4o-mini 模型
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const FIXED_MODEL = 'gpt-4o-mini';

/**
 * 调用 OpenAI API
 */
async function callOpenAI(messages, options = {}, userApi = null) {
    const apiKey = userApi?.apiKey || OPENAI_API_KEY;
    const baseUrl = userApi?.apiBase || OPENAI_BASE_URL;
    const model = FIXED_MODEL;

    if (!apiKey) {
        throw new Error('未配置 API Key');
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: 0.3,
            max_tokens: 2000
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`API 错误: ${error}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

/**
 * 根据发音模式扩展单词
 * 每次固定生成 20 个词
 */
async function expandWords(pattern, pronunciation, existingWords = [], count = 20, userApi = null) {
    const existingList = existingWords.slice(0, 15).join(', ');

    const prompt = `生成包含 "${pattern}" 且发音为 ${pronunciation || pattern} 的英语单词。

要求：
- 单词必须包含 "${pattern}"，且 "${pattern}" 发 ${pronunciation || pattern} 音
- 选择儿童常用词（动物、物品、动作、颜色等）
- 简单易记，3-7个字母优先
- 避免：人名地名、缩写、生僻词
- 不要重复：${existingList}

返回 JSON：[{"word": "cat", "meaning": "猫"}]
生成 ${count} 个。只输出 JSON。`;

    try {
        const response = await callOpenAI([
            { role: 'user', content: prompt }
        ], {}, userApi);

        console.log('AI 响应长度:', response?.length);

        // 解析 JSON
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error('AI 返回格式错误:', response?.substring(0, 200));
            return [];
        }

        const rawWords = JSON.parse(jsonMatch[0]);
        console.log(`AI 返回 ${rawWords.length} 个词`);

        // 服务端处理：添加 highlight, prefix, suffix 等字段
        const existingSet = new Set(existingWords.map(w => w.toLowerCase()));
        const patternLower = pattern.toLowerCase();

        const processed = rawWords
            .filter(w => w.word && !existingSet.has(w.word.toLowerCase()))
            .map(w => {
                const word = w.word.toLowerCase();
                const idx = word.indexOf(patternLower);

                // 必须包含目标字母组合
                if (idx === -1) {
                    console.log(`⚠️ 不包含 ${pattern}: ${word}`);
                    return null;
                }

                return {
                    word: word,
                    meaning: w.meaning || '',
                    highlight: pattern,
                    prefix: word.substring(0, idx),
                    suffix: word.substring(idx + pattern.length),
                    source: 'ai',
                    phonetic: ''
                };
            })
            .filter(Boolean);

        console.log(`处理后 ${processed.length} 个词`);
        return processed;

    } catch (error) {
        console.error('AI 扩词失败:', error.message);
        return [];
    }
}

function isAvailable() {
    return !!OPENAI_API_KEY;
}

module.exports = {
    expandWords,
    isAvailable,
    FIXED_MODEL
};
