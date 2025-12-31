/**
 * Phonics API 路由
 * 
 * 核心功能：
 * 1. 获取发音分类和模式（来自讲义 + 音频目录）
 * 2. AI 扩词并保存到服务端
 * 3. 获取保存的 AI 扩词
 */

const express = require('express');
const router = express.Router();
const phonicsData = require('../../data/phonicsData');
const dictionaryService = require('../services/dictionary');
const aiService = require('../services/ai');
const wordStore = require('../services/wordStore');
const audioScanner = require('../services/audioScanner');

/**
 * 获取所有发音模式分类
 * GET /api/phonics/categories
 */
router.get('/categories', (req, res) => {
    const categories = [
        { id: 'letters', name: '26个字母', count: phonicsData.letters.length },
        { id: 'short_vowels', name: '短元音组合', count: phonicsData.short_vowels.length },
        { id: 'long_vowels', name: '长元音组合', count: phonicsData.long_vowels.length },
        { id: 'consonant_blends', name: '辅音组合', count: phonicsData.consonant_blends.length },
        { id: 'r_controlled', name: 'R控制元音', count: phonicsData.r_controlled.length },
        { id: 'other_vowels', name: '其他元音', count: phonicsData.other_vowels.length },
    ];

    // 检查是否有补充内容
    const supplementary = audioScanner.getSupplementaryCategory();
    if (supplementary && supplementary.patterns.length > 0) {
        categories.push({
            id: 'supplementary',
            name: '📁 补充内容',
            count: supplementary.patterns.length,
            isExtra: true
        });
    }

    res.json({ categories });
});

/**
 * 获取某个分类下的所有发音模式
 * GET /api/phonics/category/:categoryId
 */
router.get('/category/:categoryId', (req, res) => {
    const { categoryId } = req.params;

    // 处理补充分类
    if (categoryId === 'supplementary') {
        const supplementary = audioScanner.getSupplementaryCategory();
        if (!supplementary) {
            return res.json({ categoryId, patterns: [] });
        }

        const patterns = supplementary.patterns.map(p => {
            const aiWords = wordStore.getWords(categoryId, p.pattern);
            return {
                pattern: p.pattern,
                displayName: p.displayName,
                pronunciation: p.pronunciation || '',
                baseCount: 0,
                aiCount: aiWords.length,
                totalCount: aiWords.length,
                hasAudio: true,
                isExtra: true
            };
        });

        return res.json({ categoryId, patterns });
    }

    // 处理讲义分类
    const data = phonicsData[categoryId];
    if (!data) {
        return res.status(404).json({ error: '分类不存在' });
    }

    const patterns = data.map(p => {
        const aiWords = wordStore.getWords(categoryId, p.pattern);
        return {
            pattern: p.pattern,
            pronunciation: p.pronunciation,
            baseCount: p.words.length,
            aiCount: aiWords.length,
            totalCount: p.words.length + aiWords.length,
            exampleWord: p.words[0]?.word || '',
            hasAudio: audioScanner.hasAudio(p.pattern)
        };
    });

    res.json({
        categoryId,
        patterns
    });
});

/**
 * 获取某个发音模式的详情（含例词）
 * GET /api/phonics/pattern/:categoryId/:pattern
 */
router.get('/pattern/:categoryId/:pattern', (req, res) => {
    const { categoryId, pattern } = req.params;

    // 处理补充分类
    if (categoryId === 'supplementary') {
        const supplementary = audioScanner.getSupplementaryCategory();
        const patternInfo = supplementary?.patterns.find(p => p.pattern === pattern);

        if (!patternInfo) {
            return res.status(404).json({ error: '发音模式不存在' });
        }

        // 补充分类只有 AI 扩展词
        const aiWords = wordStore.getWords(categoryId, pattern).map(w => ({
            ...w,
            phonetic: dictionaryService.getIPA(w.word),
            source: 'ai'
        }));

        return res.json({
            pattern: patternInfo.pattern,
            displayName: patternInfo.displayName,
            pronunciation: patternInfo.pronunciation || '',
            categoryId,
            words: aiWords,
            baseCount: 0,
            aiCount: aiWords.length,
            isExtra: true,
            hasAudio: true
        });
    }

    // 处理讲义分类
    const category = phonicsData[categoryId];
    if (!category) {
        return res.status(404).json({ error: '分类不存在' });
    }

    const patternData = category.find(p => p.pattern === pattern);
    if (!patternData) {
        return res.status(404).json({ error: '发音模式不存在' });
    }

    // 基础词（来自讲义）
    const baseWords = patternData.words.map(w => {
        const translation = dictionaryService.getTranslation(w.word);
        const ipa = dictionaryService.getIPA(w.word);
        return {
            ...w,
            meaning: translation || '',
            phonetic: ipa || null,
            source: 'base'
        };
    });

    // AI 扩展词（从存储读取）
    const aiWords = wordStore.getWords(categoryId, pattern).map(w => ({
        ...w,
        phonetic: dictionaryService.getIPA(w.word),
        source: 'ai'
    }));

    // 合并所有词
    const allWords = [...baseWords, ...aiWords];

    // 随机抽取最多 30 个词（使用 Fisher-Yates 洗牌算法）
    const shuffled = [...allWords];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const displayWords = shuffled.slice(0, 30);

    res.json({
        pattern: patternData.pattern,
        pronunciation: patternData.pronunciation,
        categoryId,
        words: displayWords,
        baseCount: baseWords.length,
        aiCount: aiWords.length,
        totalCount: allWords.length,
        displayCount: displayWords.length,
        hasAudio: audioScanner.hasAudio(pattern)
    });
});

/**
 * 获取统计信息
 * GET /api/phonics/stats
 */
router.get('/stats', (req, res) => {
    const storeStats = wordStore.getStats();
    res.json({
        aiAvailable: aiService.isAvailable(),
        aiWords: storeStats
    });
});

/**
 * AI 智能扩词（并保存到服务端）
 * POST /api/phonics/ai-expand
 * 
 * Body: { categoryId, pattern, count, userApi }
 * 
 * 注意：userApi 中的 apiKey 仅在本次请求中使用，不会保存到服务器
 */
router.post('/ai-expand', async (req, res) => {
    const { categoryId, pattern, count = 20, userApi } = req.body;

    // 检查是否有可用的 API（用户提供或服务端配置）
    if (!userApi?.apiKey && !aiService.isAvailable()) {
        return res.status(503).json({
            error: 'AI 服务未配置',
            hint: '请点击右上角 ⚙️ 配置您的 API Key'
        });
    }

    if (!categoryId || !pattern) {
        return res.status(400).json({ error: '缺少必要参数' });
    }

    let pronunciation = '';
    let baseWords = [];

    // 处理补充分类
    if (categoryId === 'supplementary') {
        const supplementary = audioScanner.getSupplementaryCategory();
        const patternInfo = supplementary?.patterns.find(p => p.pattern === pattern);
        if (!patternInfo) {
            return res.status(404).json({ error: '发音模式不存在' });
        }
        pronunciation = patternInfo.pronunciation || '';
        baseWords = [];
    } else {
        // 处理讲义分类
        const category = phonicsData[categoryId];
        if (!category) {
            return res.status(404).json({ error: '分类不存在' });
        }

        const patternData = category.find(p => p.pattern === pattern);
        if (!patternData) {
            return res.status(404).json({ error: '发音模式不存在' });
        }
        pronunciation = patternData.pronunciation;
        baseWords = patternData.words.map(w => w.word);
    }

    // 获取已保存的 AI 词
    const savedAiWords = wordStore.getWords(categoryId, pattern).map(w => w.word);
    const existingWords = [...baseWords, ...savedAiWords];

    try {
        // 固定每次生成 20 个词，没有上限
        const newWords = await aiService.expandWords(
            pattern,
            pronunciation,
            existingWords,
            20,
            userApi
        );

        if (newWords.length === 0) {
            return res.json({
                pattern,
                newWords: [],
                saved: 0,
                message: 'AI 没有生成新词'
            });
        }

        // 验证词是否真实存在于词典中（过滤 AI 编造的词）
        const validatedWords = newWords.filter(w => {
            const exists = dictionaryService.hasWord(w.word);
            if (!exists) {
                console.log(`⚠️ 词典中不存在: ${w.word}`);
            }
            return exists;
        });

        console.log(`词典验证: ${newWords.length} -> ${validatedWords.length}`);

        if (validatedWords.length === 0) {
            return res.json({
                pattern,
                newWords: [],
                saved: 0,
                message: 'AI 生成的词均未通过词典验证'
            });
        }

        // 添加音标（AI 返回的其他字段已经完整）
        const wordsWithPhonetic = validatedWords.map(w => ({
            ...w,
            phonetic: dictionaryService.getIPA(w.word) || ''
        }));

        // 保存到存储（异步，支持并发）
        const saveResult = await wordStore.saveWords(categoryId, pattern, wordsWithPhonetic);

        // 记录日志
        const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
        console.log(`📝 [${timestamp}] AI扩词: ${pattern} +${saveResult.added}词 (总${saveResult.total})`);

        res.json({
            pattern,
            pronunciation,
            newWords: wordsWithPhonetic,
            saved: saveResult.added,
            total: saveResult.total
        });

    } catch (error) {
        console.error('❌ AI 扩词错误:', error);
        res.status(500).json({ error: 'AI 扩词失败', message: error.message });
    }
});

/**
 * 清空某个模式的 AI 词
 * DELETE /api/phonics/ai-words/:categoryId/:pattern
 * 
 * 【已禁用】为防止误操作，此功能已关闭
 */
router.delete('/ai-words/:categoryId/:pattern', (req, res) => {
    // 禁用删除功能
    res.status(403).json({ error: '此功能已禁用' });
});

module.exports = router;
