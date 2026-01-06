/**
 * 例句服务
 * 
 * 提供单词例句的加载和查询功能
 */

const fs = require('fs');
const path = require('path');

const SENTENCES_FILE = path.join(__dirname, '../../data/sentences.json');

class SentenceService {
    constructor() {
        this.sentences = {};
        this.load();
    }

    /**
     * 加载例句数据
     */
    load() {
        try {
            if (fs.existsSync(SENTENCES_FILE)) {
                this.sentences = JSON.parse(fs.readFileSync(SENTENCES_FILE, 'utf8'));
                console.log(`📝 已加载 ${Object.keys(this.sentences).length} 个例句`);
            } else {
                console.log('⚠️ 例句文件不存在，将使用空数据');
                this.sentences = {};
            }
        } catch (err) {
            console.error('❌ 加载例句失败:', err.message);
            this.sentences = {};
        }
    }

    /**
     * 获取单词的例句
     * @param {string} word - 单词
     * @returns {Object|null} { en: string, zh: string } 或 null
     */
    getSentence(word) {
        if (!word) return null;

        const key = word.toLowerCase().trim();
        return this.sentences[key] || null;
    }

    /**
     * 批量获取例句
     * @param {string[]} words - 单词列表
     * @returns {Object} { word: { en, zh } }
     */
    getSentences(words) {
        const result = {};
        for (const word of words) {
            const sentence = this.getSentence(word);
            if (sentence) {
                result[word.toLowerCase()] = sentence;
            }
        }
        return result;
    }

    /**
     * 检查单词是否有例句
     * @param {string} word 
     * @returns {boolean}
     */
    hasSentence(word) {
        if (!word) return false;
        return !!this.sentences[word.toLowerCase().trim()];
    }

    /**
     * 获取所有例句数量
     */
    getCount() {
        return Object.keys(this.sentences).length;
    }

    /**
     * 获取所有有例句的单词列表
     */
    getWords() {
        return Object.keys(this.sentences);
    }

    /**
     * 重新加载例句（用于热更新）
     */
    reload() {
        this.load();
    }

    /**
     * 添加或更新例句
     * @param {string} word 
     * @param {string} en 
     * @param {string} zh 
     */
    addSentence(word, en, zh) {
        const key = word.toLowerCase().trim();
        this.sentences[key] = { en, zh };
        this.save();
    }

    /**
     * 批量添加例句
     * @param {Object} sentences - { word: { en, zh } }
     */
    addSentences(sentences) {
        for (const word in sentences) {
            const key = word.toLowerCase().trim();
            this.sentences[key] = sentences[word];
        }
        this.save();
    }

    /**
     * 保存例句到文件
     */
    save() {
        try {
            fs.writeFileSync(SENTENCES_FILE, JSON.stringify(this.sentences, null, 2));
        } catch (err) {
            console.error('❌ 保存例句失败:', err.message);
        }
    }
}

module.exports = new SentenceService();
