/**
 * TTS 工具配置
 */

const path = require('path');

module.exports = {
    // 路径配置
    paths: {
        // 数据源
        aiWords: path.join(__dirname, '..', '..', 'data', 'ai-words.json'),
        phonicsData: path.join(__dirname, '..', '..', 'data', 'phonicsData.js'),
        sentences: path.join(__dirname, '..', '..', 'data', 'sentences.json'),

        // 输出到静态站点
        staticDir: path.join(__dirname, '..', '..', '..', 'phonics-static'),
        audioDir: path.join(__dirname, '..', '..', '..', 'phonics-static', 'audio'),
        bundleDir: path.join(__dirname, '..', '..', '..', 'phonics-static', 'bundles'),
        rulesAudioDir: path.join(__dirname, '..', '..', '..', 'phonics-static', 'audio', 'rules'),
    },

    // 英文声音配置（单词、例句）
    englishVoice: {
        languageCode: 'en-US',
        name: 'en-US-Chirp3-HD-Achernar',  // 2025 最新高质量女声
    },
    englishAudioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 0.9,  // 稍慢，适合学习
        pitch: 0,
    },

    // 中文声音配置（规则讲解）
    chineseVoice: {
        languageCode: 'cmn-CN',
        name: 'cmn-CN-Chirp3-HD-Aoede',  // 高质量中文女声
    },
    chineseAudioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 0.95,
        pitch: 0,
    },

    // 并发控制
    concurrency: 5,           // 同时请求数
    delayBetweenBatches: 1000, // 批次间延迟(ms)
};
