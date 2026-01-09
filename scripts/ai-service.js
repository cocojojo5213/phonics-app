const { GenAI } = require("@google/genai");

/**
 * AI Service Manager (2026 Edition)
 * Uses the Unified Google Gen AI SDK (@google/genai)
 * Handles both Vertex AI (ADC) and Gemini AI (API Key) seamlessly.
 */
class AIService {
    constructor(config = {}) {
        this.apiKey = config.apiKey;
        // In 2026 SDK, if apiKey is provided, it uses Gemini API.
        // If not provided, it automatically looks for ADC / Vertex environment.
        this.clientConfig = this.apiKey ? { apiKey: this.apiKey } : {};

        this.client = new GenAI.Client(this.clientConfig);

        // Gemini 3 Flash is the 2026 workhorse
        this.modelName = config.model || "gemini-3-flash";
    }

    /**
     * Generate structured data from a prompt
     * @param {string} prompt 
     * @param {object} schema JSON Schema for the output
     */
    async generateSchema(prompt, schema) {
        console.log(`[AI] Generating content with ${this.modelName}...`);

        const response = await this.client.models.generateContent({
            model: this.modelName,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema
            }
        });

        // The 2026 SDK returns a clean parsed object or text
        const result = response.text();
        try {
            return JSON.parse(result);
        } catch (e) {
            console.error("[AI] Failed to parse JSON response:", result);
            throw new Error("AI returned invalid JSON format.");
        }
    }
}

module.exports = AIService;
