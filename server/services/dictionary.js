/**
 * 离线词典服务
 * 
 * 使用 ecdict (ECDICT 英汉词典) + cmu-pronouncing-dictionary (CMUdict 发音词典)
 * 完全离线，不需要 AI API
 */

const ecdict = require('ecdict');
const cmudict = require('cmu-pronouncing-dictionary');

// ARPABET 到 IPA 的映射
const ARPABET_TO_IPA = {
    // 元音
    'AA': 'ɑː', 'AE': 'æ', 'AH': 'ʌ', 'AO': 'ɔː', 'AW': 'aʊ',
    'AY': 'aɪ', 'EH': 'ɛ', 'ER': 'ɜːr', 'EY': 'eɪ', 'IH': 'ɪ',
    'IY': 'iː', 'OW': 'oʊ', 'OY': 'ɔɪ', 'UH': 'ʊ', 'UW': 'uː',
    // 辅音
    'B': 'b', 'CH': 'tʃ', 'D': 'd', 'DH': 'ð', 'F': 'f',
    'G': 'g', 'HH': 'h', 'JH': 'dʒ', 'K': 'k', 'L': 'l',
    'M': 'm', 'N': 'n', 'NG': 'ŋ', 'P': 'p', 'R': 'r',
    'S': 's', 'SH': 'ʃ', 'T': 't', 'TH': 'θ', 'V': 'v',
    'W': 'w', 'Y': 'j', 'Z': 'z', 'ZH': 'ʒ',
};

// ARPABET 到 TTS 发音指导
const ARPABET_TO_TTS = {
    'AA': 'ah', 'AE': 'a', 'AH': 'uh', 'AO': 'aw', 'AW': 'ow',
    'AY': 'eye', 'EH': 'eh', 'ER': 'er', 'EY': 'ay', 'IH': 'ih',
    'IY': 'ee', 'OW': 'oh', 'OY': 'oy', 'UH': 'oo', 'UW': 'oo',
    'B': 'b', 'CH': 'ch', 'D': 'd', 'DH': 'th', 'F': 'f',
    'G': 'g', 'HH': 'h', 'JH': 'j', 'K': 'k', 'L': 'l',
    'M': 'm', 'N': 'n', 'NG': 'ng', 'P': 'p', 'R': 'r',
    'S': 's', 'SH': 'sh', 'T': 't', 'TH': 'th', 'V': 'v',
    'W': 'w', 'Y': 'y', 'Z': 'z', 'ZH': 'zh',
};

class DictionaryService {
    constructor() {
        // CMUdict 的数据在 .dictionary 属性里
        const cmuModule = require('cmu-pronouncing-dictionary');
        this.cmudict = cmuModule.dictionary || cmuModule;
        console.log(`📖 ECDICT 英汉词典已加载`);
        console.log(`📖 CMUdict 发音词典已加载，包含 ${Object.keys(this.cmudict).length} 个单词`);
    }

    /**
     * 查询单词的完整信息 (ECDICT)
     */
    lookup(word) {
        const lower = word.toLowerCase();
        try {
            const result = ecdict.searchWord(lower);
            if (result && result.word) {
                return {
                    word: result.word,
                    phonetic: result.phonetic || null,
                    translation: result.translation || null,
                    definition: result.definition || null,
                    collins: result.collins || null,
                    oxford: result.oxford || null,
                };
            }
        } catch (e) {
            // 查询失败
        }
        return null;
    }

    /**
     * 获取中文翻译
     */
    getTranslation(word) {
        const entry = this.lookup(word);
        if (entry && entry.translation) {
            // 取第一行翻译，简化显示
            // 格式通常是 "n. 苹果, 家伙\\n[医] 苹果"
            const firstLine = entry.translation.split('\\n')[0];
            // 去掉词性前缀，只保留中文
            const match = firstLine.match(/[a-z]+\.\s*(.+)/);
            return match ? match[1].split(',')[0].trim() : firstLine.trim();
        }
        return null;
    }

    /**
     * 批量获取翻译
     */
    translateBatch(words) {
        const translations = {};
        for (const word of words) {
            const trans = this.getTranslation(word);
            if (trans) {
                translations[word] = trans;
            }
        }
        return translations;
    }

    /**
     * 获取 CMUdict ARPABET 发音
     */
    getArpabet(word) {
        return this.cmudict[word.toLowerCase()] || null;
    }

    /**
     * 将 ARPABET 转换为 IPA
     */
    arpabetToIPA(arpabet) {
        if (!arpabet) return null;
        const phonemes = arpabet.split(' ');
        const ipaSymbols = phonemes.map(p => {
            const base = p.replace(/[012]/g, '');
            return ARPABET_TO_IPA[base] || base.toLowerCase();
        });
        return `/${ipaSymbols.join('')}/`;
    }

    /**
     * 获取单词的 IPA 音标 (优先 CMUdict，回退 ECDICT)
     */
    getIPA(word) {
        const arpabet = this.getArpabet(word);
        if (arpabet) {
            return this.arpabetToIPA(arpabet);
        }
        const entry = this.lookup(word);
        if (entry && entry.phonetic) {
            return `/${entry.phonetic}/`;
        }
        return null;
    }

    /**
     * 获取单词的发音信息 (用于 TTS)
     */
    getPronunciationGuide(word) {
        const arpabet = this.getArpabet(word);
        if (!arpabet) return null;

        const phonemes = arpabet.split(' ');
        const guides = phonemes.map(p => {
            const base = p.replace(/[012]/g, '');
            return ARPABET_TO_TTS[base] || base.toLowerCase();
        });

        return {
            word: word,
            arpabet: arpabet,
            ipa: this.arpabetToIPA(arpabet),
            guides: guides,
            ttsText: guides.join(', ') + ', ' + word
        };
    }

    /**
     * 检查单词是否在词典中
     */
    hasWord(word) {
        return !!this.cmudict[word.toLowerCase()] || !!this.lookup(word);
    }
}

module.exports = new DictionaryService();
