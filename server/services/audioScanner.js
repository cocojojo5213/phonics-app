/**
 * 音频扫描服务
 * 
 * 自动扫描 phonics-audio 目录，识别补充的发音模式
 */

const fs = require('fs');
const path = require('path');
const phonicsData = require('../../data/phonicsData');

const PHONICS_AUDIO_DIR = path.join(__dirname, '../../data/phonics-audio');

/**
 * 获取所有已有音频的模式
 */
function getAudioPatterns() {
    if (!fs.existsSync(PHONICS_AUDIO_DIR)) {
        return [];
    }

    const files = fs.readdirSync(PHONICS_AUDIO_DIR);
    const patterns = files
        .filter(f => f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.ogg'))
        .map(f => {
            const name = path.basename(f, path.extname(f));
            return name.toLowerCase();
        });

    return [...new Set(patterns)];
}

/**
 * 获取 phonicsData 中所有已定义的模式
 */
function getDefinedPatterns() {
    const patterns = new Set();

    for (const category of Object.keys(phonicsData)) {
        if (Array.isArray(phonicsData[category])) {
            for (const item of phonicsData[category]) {
                if (item.pattern) {
                    patterns.add(item.pattern.toLowerCase());
                }
            }
        }
    }

    return patterns;
}

/**
 * 获取有音频但未在 phonicsData 中定义的模式
 */
function getExtraPatterns() {
    const audioPatterns = getAudioPatterns();
    const definedPatterns = getDefinedPatterns();

    const extra = audioPatterns.filter(p => !definedPatterns.has(p));

    // 按类型分组
    const grouped = {
        consonant_blends: [],  // 辅音组合 (bl, br, cl, etc.)
        digraphs: [],          // 二合字母 (sh, ch, th, etc.)
        endings: [],           // 结尾模式 (_y, _ing, etc.)
        other: []              // 其他
    };

    for (const pattern of extra) {
        if (pattern.startsWith('_') || pattern.startsWith('ending')) {
            grouped.endings.push(pattern);
        } else if (['bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'sc', 'sk', 'sl', 'sm', 'sn', 'sp', 'st', 'sw', 'tr', 'tw'].includes(pattern)) {
            grouped.consonant_blends.push(pattern);
        } else if (['sh', 'ch', 'th', 'wh', 'ph', 'gh', 'ng', 'nk', 'ck'].includes(pattern)) {
            grouped.digraphs.push(pattern);
        } else {
            grouped.other.push(pattern);
        }
    }

    return {
        all: extra,
        grouped
    };
}

/**
 * 生成补充分类的数据（用于 API）
 */
function getSupplementaryCategory() {
    const extra = getExtraPatterns();

    if (extra.all.length === 0) {
        return null;
    }

    // 为每个额外模式创建基础数据
    const patterns = extra.all.map(pattern => {
        // 生成显示名称
        let displayName = pattern;
        if (pattern.startsWith('_')) {
            displayName = `结尾 ${pattern.substring(1)}`;
        } else if (pattern.startsWith('ending_')) {
            displayName = `结尾 ${pattern.substring(7)}`;
        }

        return {
            pattern: pattern,
            pronunciation: '', // 需要 AI 或手动补充
            displayName: displayName,
            words: [],  // 初始为空，由 AI 扩词
            hasAudio: true
        };
    });

    return {
        id: 'supplementary',
        name: '补充内容',
        description: '来自音频目录的额外发音模式',
        patterns
    };
}

/**
 * 检查某个模式是否有音频
 */
function hasAudio(pattern) {
    const audioPatterns = getAudioPatterns();
    return audioPatterns.includes(pattern.toLowerCase());
}

module.exports = {
    getAudioPatterns,
    getDefinedPatterns,
    getExtraPatterns,
    getSupplementaryCategory,
    hasAudio
};
