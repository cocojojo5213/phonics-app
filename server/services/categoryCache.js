/**
 * 发音模式分类缓存
 * 
 * 存储 AI 自动识别的分类结果和发音信息
 * 
 * 新格式：
 * {
 *   "pattern": { "category": "short_vowels", "pronunciation": "/ɛl/" }
 * }
 * 
 * 兼容旧格式：
 * {
 *   "pattern": "short_vowels"
 * }
 */

const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../../data/pattern-categories.json');

/**
 * 读取缓存
 */
function getCache() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const data = fs.readFileSync(CACHE_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('读取分类缓存失败:', e.message);
    }
    return {};
}

/**
 * 保存缓存
 */
function saveCache(cache) {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    } catch (e) {
        console.error('保存分类缓存失败:', e.message);
    }
}

/**
 * 获取某个模式的分类（兼容新旧格式）
 */
function getPatternCategory(pattern) {
    const cache = getCache();
    const entry = cache[pattern.toLowerCase()];

    if (!entry) return null;

    // 新格式: { category: "...", pronunciation: "..." }
    if (typeof entry === 'object' && entry.category) {
        return entry.category;
    }

    // 旧格式: "category_name"
    return entry;
}

/**
 * 获取某个模式的发音
 */
function getPatternPronunciation(pattern) {
    const cache = getCache();
    const entry = cache[pattern.toLowerCase()];

    if (!entry) return null;

    // 新格式: { category: "...", pronunciation: "..." }
    if (typeof entry === 'object' && entry.pronunciation) {
        return entry.pronunciation;
    }

    return null;
}

/**
 * 设置某个模式的分类和发音
 */
function setPatternInfo(pattern, categoryId, pronunciation = null) {
    const cache = getCache();
    cache[pattern.toLowerCase()] = {
        category: categoryId,
        pronunciation: pronunciation || ''
    };
    saveCache(cache);
}

/**
 * 设置某个模式的分类（兼容旧接口）
 */
function setPatternCategory(pattern, categoryId) {
    const cache = getCache();
    const existing = cache[pattern.toLowerCase()];

    // 保留已有的发音信息
    if (typeof existing === 'object' && existing.pronunciation) {
        cache[pattern.toLowerCase()] = {
            category: categoryId,
            pronunciation: existing.pronunciation
        };
    } else {
        cache[pattern.toLowerCase()] = {
            category: categoryId,
            pronunciation: ''
        };
    }
    saveCache(cache);
}

/**
 * 批量设置分类
 */
function setBatchCategories(mappings) {
    const cache = getCache();
    for (const [pattern, categoryId] of Object.entries(mappings)) {
        const existing = cache[pattern.toLowerCase()];
        if (typeof existing === 'object' && existing.pronunciation) {
            cache[pattern.toLowerCase()] = {
                category: categoryId,
                pronunciation: existing.pronunciation
            };
        } else {
            cache[pattern.toLowerCase()] = {
                category: categoryId,
                pronunciation: ''
            };
        }
    }
    saveCache(cache);
}

module.exports = {
    getCache,
    getPatternCategory,
    getPatternPronunciation,
    setPatternCategory,
    setPatternInfo,
    setBatchCategories
};
