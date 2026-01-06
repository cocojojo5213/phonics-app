/**
 * TTS 工具配置文件示例
 * 
 * 使用前：
 * 1. 复制此文件并重命名为 config.js
 * 2. 填入你的 Google Cloud 服务账号密钥
 * 3. 填入 Azure 语音服务密钥（可选，用于中文讲解）
 */

module.exports = {
    // Google Cloud 服务账号 JSON（用于 TTS）
    // 从 Google Cloud Console 创建服务账号，启用 Text-to-Speech API
    // 下载 JSON 密钥文件，将内容粘贴到这里
    googleServiceAccount: {
        "type": "service_account",
        "project_id": "your-project-id",
        "private_key_id": "your-private-key-id",
        "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n",
        "client_email": "your-service-account@your-project-id.iam.gserviceaccount.com",
        "client_id": "123456789",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/...",
        "universe_domain": "googleapis.com"
    },

    // Vertex AI 服务账号（用于 Gemini 生成例句）
    // 需要启用 Vertex AI API
    vertexServiceAccount: {
        "type": "service_account",
        "project_id": "your-project-id",
        "private_key_id": "your-private-key-id",
        "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n",
        "client_email": "vertex-ai@your-project-id.iam.gserviceaccount.com",
        "client_id": "123456789",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/...",
        "universe_domain": "googleapis.com"
    },

    // Azure 语音配置（可选，用于中文规则讲解）
    // 从 Azure Portal 创建 Speech 资源获取
    azure: {
        key: 'YOUR_AZURE_SPEECH_KEY',  // 32位 Key
        region: 'japanwest'  // 或其他区域如 eastasia
    },

    // ============ 声音配置 ============

    // 规则讲解 - Azure 中文女声
    rulesVoice: {
        voiceName: 'zh-CN-XiaoxiaoNeural',
        style: 'cheerful'
    },

    // 例句朗读 - Google Chirp3-HD 英文女声
    // 可选声音：en-US-Chirp3-HD-Achernar, en-US-Journey-F
    sentencesVoice: {
        languageCode: 'en-US',
        name: 'en-US-Chirp3-HD-Achernar',
        ssmlGender: 'FEMALE'
    }
};
