/**
 * Breakdown Fixer Script
 * 修复 rules-master.json 中把 digraph/trigraph 错误拆开的 breakdown
 */

const fs = require('fs');
const path = require('path');

// 需要保持完整的 digraph/trigraph 列表（按长度降序排列，优先匹配长的）
const DIGRAPHS = [
    // Trigraphs
    'tch', 'dge', 'igh', 'scr', 'spl', 'spr', 'str', 'thr',
    // Digraphs
    'ch', 'ck', 'sh', 'th', 'wh', 'ph', 'gh', 'ng', 'nk', 'qu',
    'ai', 'ay', 'ea', 'ee', 'ie', 'oa', 'oe', 'oo', 'ou', 'ow', 'oy', 'oi', 'au', 'aw',
    'ar', 'er', 'ir', 'or', 'ur',
    'ff', 'll', 'ss', 'zz',
    'wr', 'kn', 'gn', 'mb'
];

function fixBreakdown(breakdown) {
    const units = breakdown.split('|');
    const fixed = [];
    let i = 0;

    while (i < units.length) {
        let matched = false;

        // 尝试匹配 trigraphs (3个单位)
        if (i + 2 < units.length) {
            const tri = units[i] + units[i + 1] + units[i + 2];
            if (DIGRAPHS.includes(tri.toLowerCase())) {
                fixed.push(tri);
                i += 3;
                matched = true;
            }
        }

        // 尝试匹配 digraphs (2个单位)
        if (!matched && i + 1 < units.length) {
            const di = units[i] + units[i + 1];
            if (DIGRAPHS.includes(di.toLowerCase())) {
                fixed.push(di);
                i += 2;
                matched = true;
            }
        }

        // 无匹配，保留原单位
        if (!matched) {
            fixed.push(units[i]);
            i++;
        }
    }

    return fixed.join('|');
}

// 读取文件
const filePath = path.join(__dirname, '../data/rules-master.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

let fixCount = 0;

// 遍历所有规则的 examples
data.rules.forEach(rule => {
    if (rule.examples) {
        rule.examples.forEach(ex => {
            if (ex.breakdown) {
                const original = ex.breakdown;
                const fixed = fixBreakdown(original);
                if (original !== fixed) {
                    console.log(`[FIX] ${ex.word}: "${original}" -> "${fixed}"`);
                    ex.breakdown = fixed;
                    fixCount++;
                }
            }
        });
    }
});

// 保存修复后的文件
fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
console.log(`\n✅ 修复完成！共修正 ${fixCount} 处 breakdown。`);
