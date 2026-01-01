/**
 * 发音模式分类缓存
 * 
 * 存储 AI 自动识别的分类结果
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
 * 获取某个模式的分类
 */
function getPatternCategory(pattern) {
    const cache = getCache();
    return cache[pattern.toLowerCase()] || null;
}

/**
 * 设置某个模式的分类
 */
function setPatternCategory(pattern, categoryId) {
    const cache = getCache();
    cache[pattern.toLowerCase()] = categoryId;
    saveCache(cache);
}

/**
 * 批量设置分类
 */
function setBatchCategories(mappings) {
    const cache = getCache();
    for (const [pattern, categoryId] of Object.entries(mappings)) {
        cache[pattern.toLowerCase()] = categoryId;
    }
    saveCache(cache);
}

module.exports = {
    getCache,
    getPatternCategory,
    setPatternCategory,
    setBatchCategories
};
