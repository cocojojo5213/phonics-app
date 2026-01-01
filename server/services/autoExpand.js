/**
 * 自动扩词服务
 * 
 * 使用 Key 池轮流调用 API，自动为所有发音模式扩展词汇
 */

require('dotenv').config();
const aiService = require('./ai');
const wordStore = require('./wordStore');
const audioScanner = require('./audioScanner');
const phonicsData = require('../../data/phonicsData');
const dictionaryService = require('./dictionary');

// 状态管理
let isRunning = false;
let shouldStop = false;
let currentKeyIndex = 0;
let callsWithCurrentKey = 0;
let stats = {
    totalWords: 0,
    totalCalls: 0,
    currentPattern: '',
    errors: []
};

// 每个 Key 调用的次数上限
const CALLS_PER_KEY = 10;
// 每次调用间隔（毫秒）
const CALL_INTERVAL = 3000;

/**
 * 获取 Key 池
 */
function getKeyPool() {
    const poolStr = process.env.OPENAI_KEY_POOL || '';
    const singleKey = process.env.OPENAI_API_KEY || '';

    if (poolStr) {
        return poolStr.split(',').map(k => k.trim()).filter(Boolean);
    }

    if (singleKey) {
        return [singleKey];
    }

    return [];
}

/**
 * 获取下一个 Key
 */
function getNextKey() {
    const pool = getKeyPool();
    if (pool.length === 0) return null;

    // 如果当前 Key 调用次数达到上限，切换到下一个
    if (callsWithCurrentKey >= CALLS_PER_KEY) {
        currentKeyIndex = (currentKeyIndex + 1) % pool.length;
        callsWithCurrentKey = 0;
        console.log(`🔄 切换到 Key #${currentKeyIndex + 1}`);
    }

    return pool[currentKeyIndex];
}

/**
 * 切换到下一个 Key（用于错误时强制切换）
 */
function switchToNextKey() {
    const pool = getKeyPool();
    if (pool.length <= 1) return false;

    currentKeyIndex = (currentKeyIndex + 1) % pool.length;
    callsWithCurrentKey = 0;
    console.log(`⚠️ 强制切换到 Key #${currentKeyIndex + 1}`);
    return true;
}

/**
 * 获取所有需要扩词的模式（按词汇量从少到多排序）
 */
function getAllPatterns() {
    const patterns = [];

    // 遍历所有分类
    for (const categoryId of Object.keys(phonicsData)) {
        const data = phonicsData[categoryId];
        if (!Array.isArray(data)) continue;

        for (const p of data) {
            // 只处理有真人发音的模式
            if (audioScanner.hasAudio(p.pattern)) {
                const baseWords = p.words.map(w => w.word);
                const aiWords = wordStore.getWords(categoryId, p.pattern);
                const totalCount = baseWords.length + aiWords.length;

                patterns.push({
                    categoryId,
                    pattern: p.pattern,
                    pronunciation: p.pronunciation,
                    existingWords: baseWords,
                    totalCount
                });
            }
        }
    }

    // 按词汇量从少到多排序
    patterns.sort((a, b) => a.totalCount - b.totalCount);

    return patterns;
}

/**
 * 为单个模式扩词
 */
async function expandSinglePattern(patternInfo) {
    const { categoryId, pattern, pronunciation, existingWords } = patternInfo;

    const apiKey = getNextKey();
    if (!apiKey) {
        throw new Error('没有可用的 API Key');
    }

    const userApi = {
        apiKey,
        apiBase: process.env.OPENAI_BASE_URL || null,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    };

    // 获取已有的 AI 词
    const aiWords = wordStore.getWords(categoryId, pattern);
    const allExisting = [...existingWords, ...aiWords.map(w => w.word)];

    // 如果已有词汇超过50个，跳过
    if (allExisting.length >= 50) {
        console.log(`⏭️ ${pattern}: 已有 ${allExisting.length} 词，跳过`);
        return 0;
    }

    try {
        const newWords = await aiService.expandWords(
            pattern,
            pronunciation,
            allExisting,
            20,  // 每次扩展 20 个词
            userApi
        );

        callsWithCurrentKey++;
        stats.totalCalls++;

        if (newWords.length > 0) {
            // 验证并添加音标
            const validatedWords = newWords.filter(w => dictionaryService.hasWord(w.word));
            const wordsWithPhonetic = validatedWords.map(w => ({
                ...w,
                phonetic: dictionaryService.getIPA(w.word) || ''
            }));

            // 保存
            const saveResult = await wordStore.saveWords(categoryId, pattern, wordsWithPhonetic);
            stats.totalWords += saveResult.added;

            console.log(`📝 ${pattern}: +${saveResult.added} 词`);
            return saveResult.added;
        }

        return 0;

    } catch (error) {
        console.error(`❌ ${pattern} 扩词失败:`, error.message);
        stats.errors.push({ pattern, error: error.message });

        // 尝试切换 Key
        if (error.message.includes('429') || error.message.includes('quota')) {
            switchToNextKey();
        }

        return 0;
    }
}

/**
 * 开始自动扩词
 */
function start() {
    if (isRunning) {
        return { success: false, message: '已经在运行中' };
    }

    const keyPool = getKeyPool();
    if (keyPool.length === 0) {
        return { success: false, message: '没有配置 API Key' };
    }

    isRunning = true;
    shouldStop = false;
    stats = { totalWords: 0, totalCalls: 0, currentPattern: '', errors: [] };
    currentKeyIndex = 0;
    callsWithCurrentKey = 0;

    console.log(`开始自动扩词，共 ${keyPool.length} 个 Key`);

    const patterns = getAllPatterns();

    // 过滤掉已经足够多的模式
    const needExpand = patterns.filter(p => p.totalCount < 50);
    console.log(`共 ${patterns.length} 个模式，${needExpand.length} 个需要扩展（词汇量<50）`);

    if (needExpand.length > 0) {
        console.log(`优先处理: ${needExpand.slice(0, 5).map(p => `${p.pattern}(${p.totalCount}词)`).join(', ')}...`);
    }

    // 异步执行，不阻塞
    (async () => {
        for (const pattern of needExpand) {
            if (shouldStop) {
                console.log('用户停止');
                break;
            }

            stats.currentPattern = pattern.pattern;
            await expandSinglePattern(pattern);

            // 等待间隔
            await new Promise(r => setTimeout(r, CALL_INTERVAL));
        }

        isRunning = false;
        console.log(`自动扩词完成，共添加 ${stats.totalWords} 个词`);
    })();

    return { success: true, message: '已开始', keyCount: keyPool.length };
}

/**
 * 停止自动扩词
 */
function stop() {
    if (!isRunning) {
        return { success: false, message: '没有在运行' };
    }

    shouldStop = true;
    return { success: true, message: '正在停止...' };
}

/**
 * 获取当前状态
 */
function getStatus() {
    return {
        isRunning,
        ...stats,
        keyCount: getKeyPool().length,
        currentKeyIndex: currentKeyIndex + 1
    };
}

module.exports = {
    start,
    stop,
    getStatus
};
