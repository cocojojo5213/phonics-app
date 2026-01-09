/**
 * 单词验证脚本
 * 使用英语词典验证 AI 生成的单词是否为真实单词
 * 
 * 用法：node scripts/validate-words.js
 * 依赖：npm install an-array-of-english-words
 */

const fs = require('fs');
const path = require('path');

// 配置路径
const CONFIG = {
    inputPath: path.join(__dirname, '../data/generated-words.json'),
    outputPath: path.join(__dirname, '../data/validated-words.json'),
    rejectPath: path.join(__dirname, '../data/rejected-words.json')
};

async function loadDictionary() {
    try {
        // 使用 npm 包作为词典（需要先安装）
        const words = require('an-array-of-english-words');
        return new Set(words.map(w => w.toLowerCase()));
    } catch (e) {
        console.log('⚠️ 未安装词典包，尝试使用内置词典...');
        // 如果没安装，使用一个简单的在线检查
        return null;
    }
}

// 使用 Free Dictionary API 验证单词（备用方案）
async function checkWordOnline(word) {
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        return response.ok;
    } catch {
        return true; // 网络错误时默认通过
    }
}

async function main() {
    console.log('📖 加载词典...');
    const dictionary = await loadDictionary();

    if (!dictionary) {
        console.log('❌ 请先安装词典包：npm install an-array-of-english-words');
        console.log('   或者运行：npm run validate:online（使用在线API，较慢）');
        return;
    }

    console.log(`✅ 词典加载完成，包含 ${dictionary.size.toLocaleString()} 个单词\n`);

    // 读取生成的单词
    if (!fs.existsSync(CONFIG.inputPath)) {
        console.log('❌ 未找到生成的单词文件，请先运行 npm run gen');
        return;
    }

    const generated = JSON.parse(fs.readFileSync(CONFIG.inputPath, 'utf8'));
    const validated = {};
    const rejected = {};

    let totalWords = 0;
    let validCount = 0;
    let invalidCount = 0;

    for (const [ruleId, ruleData] of Object.entries(generated)) {
        if (!ruleData.items) continue;

        const validItems = [];
        const invalidItems = [];

        for (const item of ruleData.items) {
            totalWords++;
            const wordLower = item.word.toLowerCase();

            if (dictionary.has(wordLower)) {
                validItems.push(item);
                validCount++;
            } else {
                invalidItems.push(item);
                invalidCount++;
                console.log(`❌ ${ruleId}: "${item.word}" - 未在词典中找到`);
            }
        }

        // 保存验证结果
        validated[ruleId] = {
            ...ruleData,
            items: validItems
        };

        if (invalidItems.length > 0) {
            rejected[ruleId] = {
                ...ruleData,
                items: invalidItems
            };
        }
    }

    // 保存结果
    fs.writeFileSync(CONFIG.outputPath, JSON.stringify(validated, null, 2), 'utf8');
    fs.writeFileSync(CONFIG.rejectPath, JSON.stringify(rejected, null, 2), 'utf8');

    console.log('\n' + '='.repeat(50));
    console.log('📊 验证结果统计：');
    console.log(`   总单词数：${totalWords}`);
    console.log(`   ✅ 有效：${validCount} (${(validCount / totalWords * 100).toFixed(1)}%)`);
    console.log(`   ❌ 无效：${invalidCount} (${(invalidCount / totalWords * 100).toFixed(1)}%)`);
    console.log('='.repeat(50));
    console.log(`\n📁 有效单词已保存到：${CONFIG.outputPath}`);
    console.log(`📁 无效单词已保存到：${CONFIG.rejectPath}`);
}

main().catch(console.error);
