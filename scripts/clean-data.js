/**
 * 数据清理脚本
 * 1. 去除重复单词
 * 2. 验证音节划分与单词匹配
 * 3. 检查 breakdown 格式
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/rules-master.json');

function cleanData() {
    console.log('📦 加载数据...');
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    
    let totalDuplicates = 0;
    let totalSyllableIssues = 0;
    let totalBreakdownIssues = 0;
    
    data.rules.forEach(rule => {
        if (!rule.examples || !Array.isArray(rule.examples)) return;
        
        // 1. 去重：按 word 去重，保留第一个完整的
        const seen = new Map();
        const uniqueExamples = [];
        
        rule.examples.forEach(ex => {
            const word = ex.word?.toLowerCase();
            if (!word) return;
            
            if (seen.has(word)) {
                totalDuplicates++;
                console.log(`  ⚠️ 重复: ${word} (规则: ${rule.id})`);
                // 如果新的更完整，替换
                const existing = seen.get(word);
                if ((!existing.meaning && ex.meaning) || (!existing.sentence && ex.sentence)) {
                    const idx = uniqueExamples.indexOf(existing);
                    if (idx !== -1) {
                        uniqueExamples[idx] = ex;
                        seen.set(word, ex);
                    }
                }
            } else {
                seen.set(word, ex);
                uniqueExamples.push(ex);
            }
        });
        
        rule.examples = uniqueExamples;
        
        // 2. 验证音节划分
        rule.examples.forEach(ex => {
            if (ex.syllables && Array.isArray(ex.syllables)) {
                const joined = ex.syllables.map(s => s.replace(/\|/g, '')).join('');
                if (joined.toLowerCase() !== ex.word.toLowerCase()) {
                    totalSyllableIssues++;
                    console.log(`  ❌ 音节不匹配: ${ex.word} -> ${joined} (规则: ${rule.id})`);
                }
            }
            
            // 3. 验证 breakdown
            if (ex.breakdown) {
                const breakdownJoined = ex.breakdown.replace(/\|/g, '');
                if (breakdownJoined.toLowerCase() !== ex.word.toLowerCase()) {
                    totalBreakdownIssues++;
                    console.log(`  ❌ Breakdown 不匹配: ${ex.word} -> ${breakdownJoined} (规则: ${rule.id})`);
                }
            }
        });
    });
    
    // 保存清理后的数据
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
    
    console.log('\n📊 清理完成:');
    console.log(`  - 移除重复: ${totalDuplicates} 个`);
    console.log(`  - 音节问题: ${totalSyllableIssues} 个`);
    console.log(`  - Breakdown 问题: ${totalBreakdownIssues} 个`);
}

cleanData();
