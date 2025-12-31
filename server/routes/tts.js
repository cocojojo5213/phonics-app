const express = require('express');
const router = express.Router();
const ttsService = require('../services/tts');

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

// GET /api/tts/pattern/:pattern - 发音模式
router.get('/pattern/:pattern', async (req, res) => {
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

// GET /api/tts/status - 服务状态
router.get('/status', (req, res) => {
    res.json({
        available: ttsService.isAvailable(),
        phonicsAudio: ttsService.getAvailablePhonicsAudio()
    });
});

module.exports = router;
