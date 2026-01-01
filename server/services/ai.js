/**
 * AI 扩词服务
 * 
 * 支持三种 API：
 * - OpenAI (GPT-4o-mini)
 * - Google Gemini
 * - Anthropic Claude
 */

// 默认配置
const DEFAULT_MODELS = {
    openai: 'gpt-4o-mini',
    gemini: 'gemini-2.0-flash',  // 稳定版本
    claude: 'claude-3-5-haiku-latest'
};

/**
 * 调用 OpenAI 兼容 API
 */
async function callOpenAI(prompt, userApi) {
    const apiKey = userApi?.apiKey;
    const baseUrl = userApi?.apiBase || 'https://api.openai.com/v1';
    const model = userApi?.model || DEFAULT_MODELS.openai;

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
            max_tokens: 2000
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API 错误: ${error}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

/**
 * 调用 Google Gemini API
 * 使用 OpenAI 兼容接口
 */
async function callGemini(prompt, userApi) {
    const apiKey = userApi?.apiKey;
    const model = userApi?.model || DEFAULT_MODELS.gemini;

    // 支持自定义地址，否则使用官方地址
    const baseUrl = userApi?.apiBase || 'https://generativelanguage.googleapis.com/v1beta/openai';

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
            max_tokens: 2000
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API 错误: ${error}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

/**
 * 调用 Anthropic Claude API
 */
async function callClaude(prompt, userApi) {
    const apiKey = userApi?.apiKey;
    const model = userApi?.model || DEFAULT_MODELS.claude;

    // 支持自定义地址，否则使用官方地址
    const baseUrl = userApi?.apiBase || 'https://api.anthropic.com';

    const response = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model,
            max_tokens: 2000,
            messages: [{ role: 'user', content: prompt }]
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API 错误: ${error}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
}

/**
 * 根据 provider 调用对应的 API
 */
async function callAI(prompt, userApi) {
    const provider = userApi?.provider || 'openai';

    switch (provider) {
        case 'gemini':
            return await callGemini(prompt, userApi);
        case 'claude':
            return await callClaude(prompt, userApi);
        case 'openai':
        default:
            return await callOpenAI(prompt, userApi);
    }
}

/**
 * 根据发音模式扩展单词
 */
async function expandWords(pattern, pronunciation, existingWords = [], count = 20, userApi = null) {
    if (!userApi?.apiKey) {
        throw new Error('未配置 API Key');
    }

    // 把所有已有词都告诉 AI，避免重复
    const existingList = existingWords.join(', ');

    const prompt = `生成包含 "${pattern}" 且发音为 ${pronunciation || pattern} 的英语单词。

要求：
- 单词必须包含字母组合 "${pattern}"
- 这个 "${pattern}" 在单词中发 ${pronunciation || pattern} 的音
- 选择儿童常用词（动物、食物、玩具、颜色、动作等）
- 简单易记，3-7个字母优先
- 避免：人名地名、缩写、生僻词、专业术语

【重要】以下单词已经存在，不要重复生成：
${existingList || '（暂无）'}

返回格式：JSON 数组
[{"word": "cat", "meaning": "猫"}, {"word": "hat", "meaning": "帽子"}]

生成 ${count} 个不重复的新单词。只输出 JSON，不要其他文字。`;

    try {
        const response = await callAI(prompt, userApi);
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
        throw error;
    }
}

function isAvailable() {
    return true; // 用户自己配置 API Key
}

module.exports = {
    expandWords,
    isAvailable,
    DEFAULT_MODELS
};
