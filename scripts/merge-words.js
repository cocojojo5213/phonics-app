/**
 * 数据合并脚本
 * 将 AI 生成的词汇合并回 rules-master.json
 * 
 * 用法：node scripts/merge-words.js
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
    rulesPath: path.join(__dirname, '../data/rules-master.json'),
    generatedPath: path.join(__dirname, '../data/generated-words.json'),
    backupPath: path.join(__dirname, '../data/rules-master.backup.json')
};

function main() {
    // 读取规则库
    const rulesData = JSON.parse(fs.readFileSync(CONFIG.rulesPath, 'utf8'));

    // 读取生成的词汇
    if (!fs.existsSync(CONFIG.generatedPath)) {
        console.log('❌ 未找到生成的词汇文件，请先运行 generate-words.js');
        return;
    }
    const generated = JSON.parse(fs.readFileSync(CONFIG.generatedPath, 'utf8'));

    console.log(`📚 规则库: ${rulesData.rules.length} 条`);
    console.log(`📦 生成词汇: ${Object.keys(generated).length} 条规则\n`);

    // 备份原文件
    fs.writeFileSync(CONFIG.backupPath, JSON.stringify(rulesData, null, 2), 'utf8');
    console.log(`💾 已备份原文件到 rules-master.backup.json\n`);

    // 合并词汇
    let mergedCount = 0;
    let addedWords = 0;

    rulesData.rules.forEach(rule => {
        const genData = generated[rule.id];
        if (!genData || !genData.items) return;

        // 获取现有词汇列表
        const existingWords = new Set((rule.examples || []).map(ex => ex.word.toLowerCase()));

        // 添加新词汇
        genData.items.forEach(item => {
            if (!existingWords.has(item.word.toLowerCase())) {
                rule.examples = rule.examples || [];
                rule.examples.push({
                    word: item.word,
                    breakdown: item.breakdown,
                    highlight: item.highlight || { type: 'token', value: rule.focus?.value || '' },
                    meaning: item.meaning,
                    sentence: item.sentence,
                    sentence_cn: item.sentence_cn
                });
                addedWords++;
            }
        });

        mergedCount++;
    });

    // 保存合并后的规则库
    fs.writeFileSync(CONFIG.rulesPath, JSON.stringify(rulesData, null, 2), 'utf8');

    console.log(`✅ 合并完成！`);
    console.log(`   处理规则: ${mergedCount} 条`);
    console.log(`   新增单词: ${addedWords} 个`);
}

main();
