/**
 * AI 扩展词库存储
 * 
 * 将 AI 生成的单词保存到 JSON 文件中
 * 支持并发写入保护
 */

const fs = require('fs');
const path = require('path');

const WORDS_FILE = path.join(__dirname, '../../data/ai-words.json');

// 写入锁，防止并发写入冲突
let writeLock = false;
const writeQueue = [];

/**
 * 带锁的写入操作
 */
async function safeWrite(data) {
    return new Promise((resolve, reject) => {
        const doWrite = () => {
            if (writeLock) {
                // 加入队列等待
                writeQueue.push({ data, resolve, reject });
                return;
            }

            writeLock = true;
            try {
                fs.writeFileSync(WORDS_FILE, JSON.stringify(data, null, 2));
                resolve();
            } catch (e) {
                reject(e);
            } finally {
                writeLock = false;
                // 处理队列中的下一个
                if (writeQueue.length > 0) {
                    const next = writeQueue.shift();
                    safeWrite(next.data).then(next.resolve).catch(next.reject);
                }
            }
        };
        doWrite();
    });
}

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
 * 保存词到某个模式（支持并发安全）
 */
async function saveWords(categoryId, pattern, words) {
    const all = getAllWords();
    const key = `${categoryId}/${pattern}`;

    // 合并去重
    const existing = all[key] || [];
    const existingSet = new Set(existing.map(w => w.word.toLowerCase()));

    const newWords = words.filter(w => !existingSet.has(w.word.toLowerCase()));
    all[key] = [...existing, ...newWords];

    await safeWrite(all);

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
async function clearWords(categoryId, pattern) {
    const all = getAllWords();
    const key = `${categoryId}/${pattern}`;
    delete all[key];
    await safeWrite(all);
}

/**
 * 清空所有词
 */
async function clearAll() {
    await safeWrite({});
}

module.exports = {
    getWords,
    saveWords,
    getAllWords,
    getStats,
    clearWords,
    clearAll
};
