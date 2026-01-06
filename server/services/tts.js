/**
 * TTS 语音合成服务
 * 
 * - 发音模式：优先使用真人发音（data/phonics-audio/）
 * - 单词：使用 Edge TTS
 * - 规则语音：使用预生成的 Google TTS 高质量中文语音（data/rules-audio/）
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Communicate } = require('edge-tts-universal');

// 目录
const PHONICS_AUDIO_DIR = path.join(__dirname, '../../data/phonics-audio');
const RULES_AUDIO_DIR = path.join(__dirname, '../../data/rules-audio');
const CACHE_DIR = path.join(__dirname, '../../data/audio');

if (!fs.existsSync(PHONICS_AUDIO_DIR)) {
    fs.mkdirSync(PHONICS_AUDIO_DIR, { recursive: true });
}
if (!fs.existsSync(RULES_AUDIO_DIR)) {
    fs.mkdirSync(RULES_AUDIO_DIR, { recursive: true });
}
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

class TTSService {
    constructor() {
        this.voice = 'en-US-JennyNeural';
        this.checkPhonicsAudio();
    }

    checkPhonicsAudio() {
        const files = fs.readdirSync(PHONICS_AUDIO_DIR);
        const audioFiles = files.filter(f => f.endsWith('.mp3') || f.endsWith('.wav'));
        if (audioFiles.length > 0) {
            console.log(`🎵 已加载 ${audioFiles.length} 个真人发音音频`);
        } else {
            console.log('📁 原声音频目录为空');
        }
    }

    /**
     * 查找真人录制的发音音频
     * 增加路径安全检查，防止路径遍历攻击
     */
    findPhonicsAudio(pattern) {
        // 安全检查：只允许字母、数字、下划线
        const safePattern = pattern.replace(/[^a-zA-Z0-9_-]/g, '');
        if (!safePattern || safePattern !== pattern.replace(/[^a-zA-Z0-9_-]/g, '')) {
            return null;
        }

        const key = safePattern.toLowerCase().trim();
        const keyUpper = safePattern.toUpperCase().trim();

        const variants = [key, keyUpper, safePattern];
        const extensions = ['.mp3', '.wav', '.ogg'];

        for (const name of variants) {
            for (const ext of extensions) {
                const filePath = path.join(PHONICS_AUDIO_DIR, `${name}${ext}`);
                // 确保路径在允许的目录内
                if (!filePath.startsWith(PHONICS_AUDIO_DIR)) {
                    return null;
                }
                if (fs.existsSync(filePath)) {
                    return filePath;
                }
            }
        }
        return null;
    }

    getCachePath(key) {
        const hash = crypto.createHash('md5').update(key).digest('hex');
        return path.join(CACHE_DIR, `${hash}.mp3`);
    }

    /**
     * 使用 Edge TTS 合成语音
     */
    async synthesizeWithEdgeTTS(text) {
        const cachePath = this.getCachePath(`edge_${text}`);

        if (fs.existsSync(cachePath)) {
            return { buffer: fs.readFileSync(cachePath), type: 'audio/mpeg' };
        }

        try {
            const tts = new Communicate(text, { voice: this.voice });
            const chunks = [];
            for await (const chunk of tts.stream()) {
                if (chunk.type === 'audio') {
                    chunks.push(Buffer.from(chunk.data, 'base64'));
                }
            }

            const buffer = Buffer.concat(chunks);
            if (buffer.length > 0) {
                fs.writeFileSync(cachePath, buffer);
            }
            return { buffer, type: 'audio/mpeg' };
        } catch (error) {
            console.error('Edge TTS 失败:', error.message);
            throw error;
        }
    }

    /**
     * 生成发音模式的声音
     * 优先使用真人发音，没有则用 Edge TTS
     */
    async generatePhonemeSound(pattern) {
        // 1. 先查找真人录制的音频
        const audioPath = this.findPhonicsAudio(pattern);
        if (audioPath) {
            const ext = path.extname(audioPath).toLowerCase();
            const mimeType = ext === '.mp3' ? 'audio/mpeg' : ext === '.wav' ? 'audio/wav' : 'audio/ogg';
            return {
                buffer: fs.readFileSync(audioPath),
                type: mimeType
            };
        }

        // 2. 没有预录音频，使用 Edge TTS
        return await this.synthesizeWithEdgeTTS(pattern);
    }

    /**
     * 生成单词发音（始终用 Edge TTS）
     */
    async generateWordSpeech(word) {
        return await this.synthesizeWithEdgeTTS(word);
    }

    isAvailable() {
        return true;
    }

    getAvailablePhonicsAudio() {
        const files = fs.readdirSync(PHONICS_AUDIO_DIR);
        return files
            .filter(f => f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.ogg'))
            .map(f => path.basename(f, path.extname(f)));
    }

    /**
     * 获取规则/提示语音
     * @param {string} pattern - 发音模式（如 'a', 'sh', 'a_e'）
     * @param {string} type - 类型 'rule' 或 'tip'
     * @returns {Object|null} { buffer, type } 或 null
     */
    getRuleAudio(pattern, type) {
        // 安全检查：只允许字母、数字、下划线、连字符
        const safePattern = pattern.replace(/[^a-zA-Z0-9_-]/g, '');
        const safeType = type === 'tip' ? 'tip' : 'rule';

        // 文件名格式：pattern_type.mp3（下划线替换为连字符）
        const filename = `${safePattern.replace(/_/g, '-')}_${safeType}.mp3`;
        const filePath = path.join(RULES_AUDIO_DIR, filename);

        // 确保路径在允许的目录内
        if (!filePath.startsWith(RULES_AUDIO_DIR)) {
            return null;
        }

        if (fs.existsSync(filePath)) {
            return {
                buffer: fs.readFileSync(filePath),
                type: 'audio/mpeg'
            };
        }

        return null;
    }

    /**
     * 获取可用的规则语音列表
     */
    getAvailableRulesAudio() {
        if (!fs.existsSync(RULES_AUDIO_DIR)) return [];
        const files = fs.readdirSync(RULES_AUDIO_DIR);
        return files
            .filter(f => f.endsWith('.mp3'))
            .map(f => path.basename(f, '.mp3'));
    }
}

module.exports = new TTSService();
