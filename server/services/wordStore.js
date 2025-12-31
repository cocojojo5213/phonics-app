/**
 * AI 扩展词库存储
 * 
 * 将 AI 生成的单词保存到 JSON 文件中
 */

const fs = require('fs');
const path = require('path');

const WORDS_FILE = path.join(__dirname, '../../data/ai-words.json');

// 初始化空词库
function initWordsFile() {
    if (!fs.existsSync(WORDS_FILE)) {
        fs.writeFileSync(WORDS_FILE, JSON.stringify({}, null, 2));
    }
}

/**
 * 获取所有保存的词
 * 返回格式: { "分类ID/模式": [词列表] }
 */
function getAllWords() {
    initWordsFile();
    try {
        const data = fs.readFileSync(WORDS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return {};
    }
}

/**
 * 获取某个模式的词
 */
function getWords(categoryId, pattern) {
    const all = getAllWords();
    const key = `${categoryId}/${pattern}`;
    return all[key] || [];
}

/**
 * 保存词到某个模式
 */
function saveWords(categoryId, pattern, words) {
    const all = getAllWords();
    const key = `${categoryId}/${pattern}`;

    // 合并去重
    const existing = all[key] || [];
    const existingSet = new Set(existing.map(w => w.word.toLowerCase()));

    const newWords = words.filter(w => !existingSet.has(w.word.toLowerCase()));
    all[key] = [...existing, ...newWords];

    fs.writeFileSync(WORDS_FILE, JSON.stringify(all, null, 2));

    return {
        added: newWords.length,
        total: all[key].length
    };
}

/**
 * 获取统计信息
 */
function getStats() {
    const all = getAllWords();
    let totalWords = 0;
    let patterns = 0;

    for (const key in all) {
        patterns++;
        totalWords += all[key].length;
    }

    return { patterns, totalWords };
}

/**
 * 清空某个模式的词
 */
function clearWords(categoryId, pattern) {
    const all = getAllWords();
    const key = `${categoryId}/${pattern}`;
    delete all[key];
    fs.writeFileSync(WORDS_FILE, JSON.stringify(all, null, 2));
}

/**
 * 清空所有词
 */
function clearAll() {
    fs.writeFileSync(WORDS_FILE, JSON.stringify({}, null, 2));
}

module.exports = {
    getWords,
    saveWords,
    getAllWords,
    getStats,
    clearWords,
    clearAll
};
