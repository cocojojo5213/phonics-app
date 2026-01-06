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
const categoryCache = require('../services/categoryCache');
const aiClassifier = require('../services/aiClassifier');
const sentenceService = require('../services/sentenceService');

/**
 * 获取所有发音模式分类
 * GET /api/phonics/categories
 * 
 * 只返回有真人发音的分类
 * 新上传的音频如果已被 AI 分类，会合并到对应分类中
 */
router.get('/categories', (req, res) => {
    // 获取所有有音频但未在 phonicsData 中的模式
    const extraPatterns = audioScanner.getExtraPatterns().all;

    // 按分类统计额外模式
    const extraCountByCategory = {};
    const unclassifiedPatterns = [];

    for (const pattern of extraPatterns) {
        const cachedCategory = categoryCache.getPatternCategory(pattern);
        if (cachedCategory && cachedCategory !== 'supplementary') {
            extraCountByCategory[cachedCategory] = (extraCountByCategory[cachedCategory] || 0) + 1;
        } else {
            unclassifiedPatterns.push(pattern);
        }
    }

    // 计算每个分类中有真人发音的模式数量（包括缓存分类的额外模式）
    const countWithAudio = (categoryData, categoryId) => {
        const baseCount = categoryData.filter(p => audioScanner.hasAudio(p.pattern)).length;
        const extraCount = extraCountByCategory[categoryId] || 0;
        return baseCount + extraCount;
    };

    const allCategories = [
        { id: 'letters', name: '26个字母', data: phonicsData.letters },
        { id: 'short_vowels', name: '短元音组合', data: phonicsData.short_vowels },
        { id: 'long_vowels', name: '长元音组合', data: phonicsData.long_vowels },
        { id: 'consonant_blends', name: '辅音组合', data: phonicsData.consonant_blends },
        { id: 'r_controlled', name: 'R控制元音', data: phonicsData.r_controlled },
        { id: 'other_vowels', name: '其他元音', data: phonicsData.other_vowels },
    ];

    // 只返回有真人发音模式的分类
    const categories = allCategories
        .map(cat => {
            // 获取分类描述
            const desc = phonicsData.categoryDescriptions?.[cat.id] || {};
            return {
                id: cat.id,
                name: cat.name,
                count: countWithAudio(cat.data, cat.id),
                description: desc.description || '',
                tip: desc.tip || ''
            };
        })
        .filter(cat => cat.count > 0);

    // 如果有未分类的模式，显示补充内容
    if (unclassifiedPatterns.length > 0) {
        categories.push({
            id: 'supplementary',
            name: '📁 待分类',
            count: unclassifiedPatterns.length,
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

    // 获取此分类的额外音频模式（通过 AI 或手动分类的）
    const extraPatterns = audioScanner.getExtraPatterns().all;
    const classifiedExtras = extraPatterns.filter(p =>
        categoryCache.getPatternCategory(p) === categoryId
    );

    // 处理补充分类（未分类的）
    if (categoryId === 'supplementary') {
        const unclassified = extraPatterns.filter(p => {
            const cached = categoryCache.getPatternCategory(p);
            return !cached || cached === 'supplementary';
        });

        const patterns = unclassified.map(pattern => {
            const aiWords = wordStore.getWords(categoryId, pattern);
            return {
                pattern: pattern,
                displayName: pattern,
                pronunciation: '',
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

    // 只返回有真人发音的模式（来自 phonicsData）
    const patterns = data
        .filter(p => audioScanner.hasAudio(p.pattern))
        .map(p => {
            const aiWords = wordStore.getWords(categoryId, p.pattern);
            return {
                pattern: p.pattern,
                pronunciation: p.pronunciation,
                rule: p.rule || '',
                tip: p.tip || '',
                baseCount: p.words.length,
                aiCount: aiWords.length,
                totalCount: p.words.length + aiWords.length,
                exampleWord: p.words[0]?.word || '',
                hasAudio: true
            };
        });

    // 添加已分类的额外模式
    for (const extraPattern of classifiedExtras) {
        const aiWords = wordStore.getWords(categoryId, extraPattern);
        // 从缓存或预定义获取发音
        const cachedPronunciation = categoryCache.getPatternPronunciation(extraPattern);
        const knownPronunciation = aiClassifier.getKnownPronunciation(extraPattern);
        const pronunciation = cachedPronunciation || knownPronunciation || '';

        patterns.push({
            pattern: extraPattern,
            pronunciation: pronunciation,
            baseCount: 0,
            aiCount: aiWords.length,
            totalCount: aiWords.length,
            hasAudio: true,
            isExtra: true
        });
    }

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

    // 处理补充分类（待分类）
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
            totalCount: aiWords.length,
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

    // 如果模式不在 phonicsData 中，检查是否是已分类的额外模式
    if (!patternData) {
        // 检查是否是通过 categoryCache 被分类到此分类的额外模式
        const cachedCategory = categoryCache.getPatternCategory(pattern);
        if (cachedCategory === categoryId && audioScanner.hasAudio(pattern)) {
            // 这是一个已分类的额外模式（只有 AI 词）
            const aiWords = wordStore.getWords(categoryId, pattern).map(w => ({
                ...w,
                phonetic: dictionaryService.getIPA(w.word),
                source: 'ai'
            }));

            // 从缓存获取发音，如果没有则尝试从预定义获取
            const cachedPronunciation = categoryCache.getPatternPronunciation(pattern);
            const knownPronunciation = aiClassifier.getKnownPronunciation(pattern);
            const pronunciation = cachedPronunciation || knownPronunciation || '';

            return res.json({
                pattern: pattern,
                pronunciation: pronunciation,
                categoryId,
                words: aiWords,
                baseCount: 0,
                aiCount: aiWords.length,
                totalCount: aiWords.length,
                isExtra: true,
                hasAudio: true
            });
        }

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

    // 获取 limit 参数（默认30，最大100）
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);

    // 随机抽取词（使用 Fisher-Yates 洗牌算法）
    const shuffled = [...allWords];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const displayWords = shuffled.slice(0, limit);

    res.json({
        pattern: patternData.pattern,
        pronunciation: patternData.pronunciation,
        rule: patternData.rule || '',
        tip: patternData.tip || '',
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
            // 检查是否是通过 categoryCache 分类的额外模式（如 "up"）
            const cachedCategory = categoryCache.getPatternCategory(pattern);
            if (cachedCategory === categoryId) {
                // 是额外模式，从缓存或预定义获取发音
                const cachedPronunciation = categoryCache.getPatternPronunciation(pattern);
                const knownPronunciation = aiClassifier.getKnownPronunciation(pattern);
                pronunciation = cachedPronunciation || knownPronunciation || '';
                baseWords = [];
            } else {
                return res.status(404).json({ error: '发音模式不存在' });
            }
        } else {
            pronunciation = patternData.pronunciation;
            baseWords = patternData.words.map(w => w.word);
        }
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

// ========== 自动扩词 API ==========

const autoExpand = require('../services/autoExpand');

/**
 * 开始自动扩词
 * POST /api/phonics/auto-expand/start
 */
router.post('/auto-expand/start', (req, res) => {
    const result = autoExpand.start();
    res.json(result);
});

/**
 * 停止自动扩词
 * POST /api/phonics/auto-expand/stop
 */
router.post('/auto-expand/stop', (req, res) => {
    const result = autoExpand.stop();
    res.json(result);
});

/**
 * 获取自动扩词状态
 * GET /api/phonics/auto-expand/status
 */
router.get('/auto-expand/status', (req, res) => {
    const status = autoExpand.getStatus();
    res.json(status);
});

// ========== 模式分类 API ==========

/**
 * 手动设置模式分类
 * POST /api/phonics/classify
 * body: { pattern: "tion", categoryId: "consonant_blends" }
 */
router.post('/classify', (req, res) => {
    const { pattern, categoryId } = req.body;

    if (!pattern || !categoryId) {
        return res.status(400).json({ error: '缺少参数' });
    }

    categoryCache.setPatternCategory(pattern, categoryId);
    res.json({ success: true, pattern, categoryId });
});

/**
 * AI 自动分类未分类的模式（同时生成发音）
 * POST /api/phonics/auto-classify
 */
router.post('/auto-classify', async (req, res) => {
    const extraPatterns = audioScanner.getExtraPatterns().all;
    const unclassified = extraPatterns.filter(p => {
        const cached = categoryCache.getPatternCategory(p);
        return !cached || cached === 'supplementary';
    });

    if (unclassified.length === 0) {
        return res.json({ success: true, message: '没有需要分类的模式', classified: 0 });
    }

    let classified = 0;
    const results = [];

    for (const pattern of unclassified) {
        try {
            // 使用完整分类（分类 + 发音）
            const { category, pronunciation } = await aiClassifier.classifyPatternFull(pattern);
            if (category) {
                // 保存分类和发音信息
                categoryCache.setPatternInfo(pattern, category, pronunciation);
                results.push({ pattern, category, pronunciation });
                classified++;
            }
        } catch (e) {
            console.error(`分类 ${pattern} 失败:`, e.message);
        }
    }

    res.json({ success: true, classified, results });
});

/**
 * 获取未分类的模式列表
 * GET /api/phonics/unclassified
 */
router.get('/unclassified', (req, res) => {
    const extraPatterns = audioScanner.getExtraPatterns().all;
    const unclassified = extraPatterns.filter(p => {
        const cached = categoryCache.getPatternCategory(p);
        return !cached || cached === 'supplementary';
    });

    res.json({ patterns: unclassified });
});

// ========== 例句 API ==========

/**
 * 获取单词的例句
 * GET /api/phonics/sentence/:word
 */
router.get('/sentence/:word', (req, res) => {
    const { word } = req.params;
    const sentence = sentenceService.getSentence(word);

    if (!sentence) {
        return res.status(404).json({
            error: '例句不存在',
            word: word
        });
    }

    res.json({
        word: word.toLowerCase(),
        ...sentence
    });
});

/**
 * 批量获取例句
 * POST /api/phonics/sentences
 * Body: { words: ["cat", "dog", "cake"] }
 */
router.post('/sentences', (req, res) => {
    const { words } = req.body;

    if (!Array.isArray(words)) {
        return res.status(400).json({ error: '参数错误：words 必须是数组' });
    }

    const sentences = sentenceService.getSentences(words);

    res.json({
        count: Object.keys(sentences).length,
        sentences
    });
});

/**
 * 获取例句统计
 * GET /api/phonics/sentences/stats
 */
router.get('/sentences/stats', (req, res) => {
    res.json({
        count: sentenceService.getCount(),
        words: sentenceService.getWords().slice(0, 100)  // 只返回前100个词
    });
});

module.exports = router;

