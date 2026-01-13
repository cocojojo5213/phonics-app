/**
 * 修复 Breakdown 和 Syllables 格式问题
 * 主要修复 Magic-E 单词的错误格式（如 ca_ek -> c|a|k|e）
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/rules-master.json');

// 特殊多音节词的正确音节划分
const SYLLABLE_FIXES = {
    'phrase': ['phrase'],  // 单音节
    'sphere': ['sphere'],  // 单音节
    'awoke': ['a', 'woke'],
    'angrier': ['an', 'gri', 'er'],
    'single': ['sin', 'gle'],
    'hopeful': ['hope', 'ful'],
    'useful': ['use', 'ful'],
    'remake': ['re', 'make'],
    'homeless': ['home', 'less'],
    'present': ['pres', 'ent'],
    'desert': ['des', 'ert'],
    'busy': ['bus', 'y'],
    'refuse': ['re', 'fuse'],
};

function fixBreakdown() {
    console.log('📦 加载数据...');
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    
    let fixedCount = 0;
    
    data.rules.forEach(rule => {
        if (!rule.examples || !Array.isArray(rule.examples)) return;
        
        rule.examples.forEach(ex => {
            const word = ex.word?.toLowerCase();
            if (!word) return;
            
            // 检查 breakdown 是否匹配
            if (ex.breakdown) {
                const breakdownJoined = ex.breakdown.replace(/\|/g, '');
                if (breakdownJoined.toLowerCase() !== word) {
                    // 尝试修复：检查是否是 Magic-E 格式错误
                    const newBreakdown = generateBreakdown(word, rule.id);
                    if (newBreakdown) {
                        console.log(`  🔧 修复 breakdown: ${ex.word} "${ex.breakdown}" -> "${newBreakdown}"`);
                        ex.breakdown = newBreakdown;
                        fixedCount++;
                    }
                }
            }
            
            // 修复 syllables - 使用预定义的修复表
            if (SYLLABLE_FIXES[word]) {
                const correctSyllables = SYLLABLE_FIXES[word];
                ex.syllables = correctSyllables.map(s => generateBreakdown(s, rule.id));
                console.log(`  🔧 修复 syllables: ${ex.word} -> ${correctSyllables.join(' · ')}`);
                fixedCount++;
            } else if (ex.syllables && Array.isArray(ex.syllables)) {
                const joined = ex.syllables.map(s => s.replace(/\|/g, '')).join('');
                if (joined.toLowerCase() !== word) {
                    // 单音节词：直接用 breakdown
                    if (word.length <= 6 && !hasMultipleSyllables(word)) {
                        ex.syllables = [ex.breakdown];
                        console.log(`  🔧 修复 syllables: ${ex.word} -> 单音节`);
                        fixedCount++;
                    }
                }
            }
        });
    });
    
    // 保存修复后的数据
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
    
    console.log(`\n📊 修复完成: ${fixedCount} 处`);
}

// 简单的多音节检测
function hasMultipleSyllables(word) {
    const vowels = word.match(/[aeiouy]+/gi) || [];
    if (word.endsWith('e') && word.length > 2) {
        return vowels.length > 2;
    }
    return vowels.length > 1;
}

// 生成正确的 breakdown
function generateBreakdown(word, ruleId) {
    const w = word.toLowerCase();
    
    // Magic-E 单词特殊处理
    if (ruleId && ruleId.includes('vce') || w.match(/[aeiou][bcdfghjklmnpqrstvwxyz]e$/)) {
        const chars = w.split('');
        return chars.join('|');
    }
    
    // 常见 digraph 处理
    const digraphs = ['sh', 'ch', 'th', 'wh', 'ph', 'ck', 'ng', 'nk', 'qu', 'wr', 'kn', 'mb', 'gn',
                      'ai', 'ay', 'ee', 'ea', 'oa', 'ow', 'oi', 'oy', 'ou', 'au', 'aw', 'oo',
                      'ar', 'er', 'ir', 'or', 'ur', 'll', 'ss', 'ff', 'zz'];
    
    let result = [];
    let i = 0;
    while (i < w.length) {
        let found = false;
        for (const dg of digraphs) {
            if (w.substring(i, i + dg.length) === dg) {
                result.push(dg);
                i += dg.length;
                found = true;
                break;
            }
        }
        if (!found) {
            result.push(w[i]);
            i++;
        }
    }
    
    return result.join('|');
}

fixBreakdown();
