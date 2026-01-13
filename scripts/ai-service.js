/**
 * 通用 AI Service Manager
 * 支持多个 AI 提供商：Gemini、OpenAI、Claude、DeepSeek 等
 * 统一接口，按需切换
 */

// 尝试加载各 SDK（可选依赖）
let GoogleGenAI, OpenAI, Anthropic;
try { GoogleGenAI = require("@google/genai").GoogleGenAI; } catch { }
try { OpenAI = require("openai"); } catch { }
try { Anthropic = require("@anthropic-ai/sdk"); } catch { }

// 支持的模型配置
const PROVIDERS = {
    // Google Gemini
    'gemini-3-flash': { provider: 'gemini', model: 'gemini-3-flash' },
    'gemini-2.5-flash': { provider: 'gemini', model: 'gemini-2.5-flash' },
    'gemini-2.5-pro': { provider: 'gemini', model: 'gemini-2.5-pro' },

    // OpenAI
    'gpt-4o': { provider: 'openai', model: 'gpt-4o' },
    'gpt-4o-mini': { provider: 'openai', model: 'gpt-4o-mini' },
    'gpt-4-turbo': { provider: 'openai', model: 'gpt-4-turbo' },
    'o1': { provider: 'openai', model: 'o1' },
    'o3-mini': { provider: 'openai', model: 'o3-mini' },

    // Anthropic Claude
    'claude-3.5-sonnet': { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
    'claude-3.5-haiku': { provider: 'anthropic', model: 'claude-3-5-haiku-20241022' },
    'claude-3-opus': { provider: 'anthropic', model: 'claude-3-opus-20240229' },

    // DeepSeek
    'deepseek-chat': { provider: 'deepseek', model: 'deepseek-chat' },
    'deepseek-reasoner': { provider: 'deepseek', model: 'deepseek-reasoner' },

    // 兼容 OpenAI 格式的其他服务（通过 baseURL 自定义）
    'custom': { provider: 'openai-compatible', model: 'custom' }
};

class AIService {
    constructor(config = {}) {
        // 优先从环境变量读取配置（支持 admin 后台传递）
        this.apiKey = config.apiKey || process.env.AI_API_KEY;
        this.baseURL = config.baseURL || process.env.AI_BASE_URL;
        this.modelKey = config.model || process.env.AI_MODEL || 'gemini-3-flash-preview';

        // 自动识别提供商
        this.provider = this._detectProvider();
        this.modelName = this.modelKey;

        this._initClient();
    }

    _detectProvider() {
        // 根据 baseURL 或模型名自动识别提供商
        if (this.baseURL) {
            if (this.baseURL.includes('openai.com')) return 'openai';
            if (this.baseURL.includes('anthropic.com')) return 'anthropic';
            if (this.baseURL.includes('deepseek.com')) return 'openai'; // DeepSeek 兼容 OpenAI
            // 其他自定义 API 默认按 OpenAI 兼容格式
            return 'openai';
        }

        // 根据模型名识别
        if (this.modelKey.startsWith('gpt-') || this.modelKey.startsWith('o1') || this.modelKey.startsWith('o3')) return 'openai';
        if (this.modelKey.startsWith('claude')) return 'anthropic';
        if (this.modelKey.startsWith('deepseek')) return 'openai';

        // 默认 Gemini
        return 'gemini';
    }

    _initClient() {
        switch (this.provider) {
            case 'gemini':
                if (!GoogleGenAI) throw new Error('请安装 @google/genai: npm install @google/genai');

                // 检测是否使用 Vertex AI 模式
                const useVertexAI = process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true' ||
                    process.env.GOOGLE_GENAI_USE_VERTEXAI === 'True';

                let genaiConfig = {};
                if (useVertexAI) {
                    // Vertex AI 模式：使用 ADC 认证
                    genaiConfig = {
                        vertexai: true,
                        project: process.env.GOOGLE_CLOUD_PROJECT,
                        location: process.env.GOOGLE_CLOUD_LOCATION || 'global'
                    };
                    console.log(`[AI] 使用 Vertex AI 模式 (项目: ${genaiConfig.project}, 区域: ${genaiConfig.location})`);
                } else if (this.apiKey) {
                    // Google AI Studio 模式：使用 API Key
                    genaiConfig = { apiKey: this.apiKey };
                }

                this.client = new GoogleGenAI(genaiConfig);
                break;

            case 'openai':
                if (!OpenAI) throw new Error('请安装 openai: npm install openai');
                this.client = new OpenAI({
                    apiKey: this.apiKey || process.env.OPENAI_API_KEY,
                    baseURL: this.baseURL
                });
                break;

            case 'anthropic':
                if (!Anthropic) throw new Error('请安装 @anthropic-ai/sdk: npm install @anthropic-ai/sdk');
                this.client = new Anthropic({
                    apiKey: this.apiKey || process.env.ANTHROPIC_API_KEY
                });
                break;

            case 'deepseek':
                if (!OpenAI) throw new Error('请安装 openai: npm install openai');
                this.client = new OpenAI({
                    apiKey: this.apiKey || process.env.DEEPSEEK_API_KEY,
                    baseURL: 'https://api.deepseek.com'
                });
                this.provider = 'openai'; // DeepSeek 兼容 OpenAI 格式
                break;

            case 'openai-compatible':
                if (!OpenAI) throw new Error('请安装 openai: npm install openai');
                if (!this.baseURL) throw new Error('自定义模型需要提供 baseURL');
                this.client = new OpenAI({
                    apiKey: this.apiKey,
                    baseURL: this.baseURL
                });
                this.provider = 'openai';
                break;

            default:
                throw new Error(`不支持的 AI 提供商: ${this.provider}`);
        }

        console.log(`[AI] 初始化完成: ${this.provider} / ${this.modelName}`);
    }

    /**
     * 生成结构化数据
     * @param {string} prompt 提示词
     * @param {object} schema JSON Schema（仅 Gemini 原生支持，其他模型通过提示词模拟）
     */
    async generateSchema(prompt, schema) {
        console.log(`[AI] 正在生成: ${this.modelName}...`);

        let result;

        switch (this.provider) {
            case 'gemini':
                result = await this._geminiGenerate(prompt, schema);
                break;

            case 'openai':
                result = await this._openaiGenerate(prompt, schema);
                break;

            case 'anthropic':
                result = await this._anthropicGenerate(prompt, schema);
                break;

            default:
                throw new Error(`未实现的提供商: ${this.provider}`);
        }

        return result;
    }

    async _geminiGenerate(prompt, schema) {
        const maxRetries = 3;
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // 30秒超时限制
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('请求超时 (30s)')), 30000)
                );

                const responsePromise = this.client.models.generateContent({
                    model: this.modelName,
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: schema,
                        // Gemini 3 Flash 思考等级: LOW = 快速且稳定
                        thinkingConfig: {
                            thinkingLevel: 'LOW'
                        }
                    }
                });

                const response = await Promise.race([responsePromise, timeoutPromise]);

                // 新版 SDK: response.text 是属性，旧版是方法
                const text = typeof response.text === 'function' ? response.text() : response.text;
                if (!text) throw new Error('API 返回内容为空');
                return JSON.parse(text);
            } catch (error) {
                lastError = error;
                const errorName = error.name || 'Error';
                const errorMsg = error.message || '';

                if (attempt < maxRetries) {
                    const delay = 3000 * attempt; // 3s, 6s... 指数级退避
                    console.warn(`   ⚠️ [${this.modelName}] 第 ${attempt} 次重试中... 原因: ${errorName}: ${errorMsg.slice(0, 100)}`);
                    await new Promise(r => setTimeout(r, delay));
                }
            }
        }

        console.error(`   ❌ [${this.modelName}] 最终处理失败:`, lastError.message);
        throw lastError;
    }

    async _openaiGenerate(prompt, schema) {
        // OpenAI 使用 response_format 强制 JSON
        const response = await this.client.chat.completions.create({
            model: this.modelName,
            messages: [
                { role: 'system', content: '你是一个 JSON 生成器。只输出纯 JSON，不要任何额外文字。' },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7
        });

        const text = response.choices[0].message.content;
        return JSON.parse(text);
    }

    async _anthropicGenerate(prompt, schema) {
        // Claude 通过系统提示强制 JSON
        const response = await this.client.messages.create({
            model: this.modelName,
            max_tokens: 8192,
            system: '你是一个 JSON 生成器。只输出纯 JSON，不要任何额外文字、解释或 Markdown 代码块。',
            messages: [
                { role: 'user', content: prompt }
            ]
        });

        const text = response.content[0].text;
        // Claude 有时会包裹 ```json```，需要清理
        const cleaned = text.replace(/^```json\n?|\n?```$/g, '').trim();
        return JSON.parse(cleaned);
    }

    /**
     * 获取支持的模型列表
     */
    static getAvailableModels() {
        return Object.keys(PROVIDERS);
    }

    /**
     * 获取提供商信息
     */
    static getProviderInfo(modelKey) {
        return PROVIDERS[modelKey] || null;
    }
}

module.exports = AIService;
