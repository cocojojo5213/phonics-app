const express = require('express');
const router = express.Router();
const ttsService = require('../services/tts');

// 允许的域名白名单
const ALLOWED_ORIGINS = [
    'phonics.thetruetao.com',
    'localhost',
    '127.0.0.1'
];

// Referer 检查中间件（防止直接下载和盗链）
const checkReferer = (req, res, next) => {
    const referer = req.get('Referer') || '';
    const origin = req.get('Origin') || '';

    // 检查是否来自允许的域名
    const isAllowed = ALLOWED_ORIGINS.some(domain =>
        referer.includes(domain) || origin.includes(domain)
    );

    if (!isAllowed && referer) {
        console.log(`⚠️ 拒绝外站请求: ${referer}`);
        return res.status(403).json({ error: '禁止访问' });
    }

    next();
};

// GET /api/tts/word/:text - 单词发音
router.get('/word/:text', async (req, res) => {
    try {
        const result = await ttsService.generateWordSpeech(req.params.text);
        res.set({
            'Content-Type': result.type,
            'Content-Length': result.buffer.length,
            'Cache-Control': 'public, max-age=31536000'
        });
        res.send(result.buffer);
    } catch (error) {
        console.error('TTS 错误:', error.message);
        res.status(500).json({ error: 'TTS Failed', message: error.message });
    }
});

// GET /api/tts/pattern/:pattern - 发音模式（加防盗链）
router.get('/pattern/:pattern', checkReferer, async (req, res) => {
    try {
        const result = await ttsService.generatePhonemeSound(req.params.pattern);
        res.set({
            'Content-Type': result.type,
            'Content-Length': result.buffer.length,
            'Cache-Control': 'public, max-age=31536000'
        });
        res.send(result.buffer);
    } catch (error) {
        console.error('TTS 错误:', error.message);
        res.status(500).json({ error: 'TTS Failed', message: error.message });
    }
});

// GET /api/tts/rule/:pattern/:type - 规则/提示语音（预生成的中文语音）
router.get('/rule/:pattern/:type', checkReferer, (req, res) => {
    try {
        const { pattern, type } = req.params;
        const result = ttsService.getRuleAudio(pattern, type);

        if (!result) {
            return res.status(404).json({
                error: 'Audio Not Found',
                message: `规则语音不存在: ${pattern}_${type}`
            });
        }

        res.set({
            'Content-Type': result.type,
            'Content-Length': result.buffer.length,
            'Cache-Control': 'public, max-age=31536000'
        });
        res.send(result.buffer);
    } catch (error) {
        console.error('规则语音错误:', error.message);
        res.status(500).json({ error: 'Audio Failed', message: error.message });
    }
});

// GET /api/tts/status - 服务状态
router.get('/status', (req, res) => {
    res.json({
        available: ttsService.isAvailable(),
        phonicsAudio: ttsService.getAvailablePhonicsAudio(),
        rulesAudio: ttsService.getAvailableRulesAudio()
    });
});

module.exports = router;
