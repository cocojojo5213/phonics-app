/**
 * AI 扩词服务
 * 
 * 使用 OpenAI 兼容 API（支持官方和各种代理）
 */

// 默认模型
const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * 调用 OpenAI 兼容 API
 * 支持普通响应和 SSE 流式响应（有些代理强制流式）
 */
async function callOpenAI(prompt, userApi) {
    const apiKey = userApi?.apiKey;
    const baseUrl = userApi?.apiBase || 'https://api.openai.com/v1';
    const model = userApi?.model || DEFAULT_MODEL;

    // 创建 AbortController 用于超时控制
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30秒超时

    try {
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
                max_tokens: 2000,
                stream: false
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API 错误: ${error}`);
        }

        const text = await response.text();

        // 检查是否是 SSE 流式响应（以 "data:" 开头）
        if (text.startsWith('data:')) {
            // 解析 SSE 流式响应，合并所有 content
            let content = '';
            const lines = text.split('\n');
            for (const line of lines) {
                if (line.startsWith('data:') && !line.includes('[DONE]')) {
                    try {
                        const json = JSON.parse(line.slice(5).trim());
                        const delta = json.choices?.[0]?.delta?.content;
                        if (delta) content += delta;
                    } catch (e) {
                        // 忽略解析错误
                    }
                }
            }
            return content;
        }

        // 普通 JSON 响应
        const data = JSON.parse(text);
        return data.choices?.[0]?.message?.content || '';
    } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
            throw new Error('API 请求超时（30秒）');
        }
        throw error;
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
        const response = await callOpenAI(prompt, userApi);
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
    return true;
}

module.exports = {
    expandWords,
    isAvailable,
    callOpenAI,
    DEFAULT_MODEL
};
