/**
 * 打包音频为 JSON Bundle
 * 把分散的 MP3 文件打包成按 pattern 分组的 JSON 文件
 * 便于静态站点按需加载
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');

/**
 * 读取 phonicsData.js 获取分类和模式信息
 */
function loadPhonicsData() {
    const content = fs.readFileSync(config.paths.phonicsData, 'utf8');

    // 简单解析，提取分类和模式
    const categories = {};
    const categoryNames = ['letters', 'short_vowels', 'long_vowels', 'consonant_blends', 'r_controlled', 'other_vowels'];

    for (const catName of categoryNames) {
        const regex = new RegExp(`${catName}:\\s*\\[([\\s\\S]*?)\\]\\s*,?\\s*(?=\\w+:|$)`, 'm');
        const match = content.match(regex);
        if (match) {
            // 提取该分类下的所有 pattern
            const patterns = [];
            const patternRegex = /pattern:\s*['"]([^'"]+)['"]/g;
            let m;
            while ((m = patternRegex.exec(match[1])) !== null) {
                patterns.push(m[1]);
            }
            categories[catName] = patterns;
        }
    }

    return categories;
}

/**
 * 读取 ai-words.json 获取每个 pattern 的单词列表
 */
function loadAiWords() {
    if (!fs.existsSync(config.paths.aiWords)) {
        return {};
    }
    return JSON.parse(fs.readFileSync(config.paths.aiWords, 'utf8'));
}

/**
 * 将文件转为 Base64 Data URL
 */
function fileToDataUrl(filePath) {
    if (!fs.existsSync(filePath)) {
        return null;
    }
    const buffer = fs.readFileSync(filePath);
    return `data:audio/mpeg;base64,${buffer.toString('base64')}`;
}

async function run(args) {
    console.log('📦 打包音频 Bundle');
    console.log('==================\n');

    const dryRun = args.includes('--dry-run');

    // 加载数据
    console.log('📖 加载数据...');
    const categories = loadPhonicsData();
    const aiWords = loadAiWords();

    let totalPatterns = 0;
    for (const cat in categories) {
        totalPatterns += categories[cat].length;
    }
    console.log(`  分类: ${Object.keys(categories).length}`);
    console.log(`  模式: ${totalPatterns}\n`);

    // 创建 bundle 目录
    if (!fs.existsSync(config.paths.bundleDir)) {
        fs.mkdirSync(config.paths.bundleDir, { recursive: true });
    }

    // 为每个分类创建子目录
    for (const category of Object.keys(categories)) {
        const categoryDir = path.join(config.paths.bundleDir, category);
        if (!fs.existsSync(categoryDir)) {
            fs.mkdirSync(categoryDir, { recursive: true });
        }
    }

    if (dryRun) {
        console.log('🔍 Dry run 模式，显示将要创建的 bundle:');
        for (const [category, patterns] of Object.entries(categories)) {
            console.log(`  ${category}/`);
            patterns.slice(0, 3).forEach(p => console.log(`    - ${p}.json`));
            if (patterns.length > 3) {
                console.log(`    ... 还有 ${patterns.length - 3} 个`);
            }
        }
        return;
    }

    // 生成 bundle
    console.log('🎵 生成 Bundle...\n');

    let bundleCount = 0;
    let audioCount = 0;
    const startTime = Date.now();

    // 创建索引
    const index = {};

    for (const [category, patterns] of Object.entries(categories)) {
        index[category] = [];

        for (const pattern of patterns) {
            const bundle = {
                pattern,
                category,
                audios: {}
            };

            // 1. Pattern 发音
            let patternFileName = pattern;
            if (/^[a-z]$/.test(pattern)) {
                patternFileName = pattern.toUpperCase();
            }
            const patternAudioPath = path.join(config.paths.audioDir, `${patternFileName}.mp3`);
            const patternAudio = fileToDataUrl(patternAudioPath);
            if (patternAudio) {
                bundle.audios['_pattern'] = patternAudio;
                audioCount++;
            }

            // 2. 规则讲解
            const ruleAudioPath = path.join(config.paths.rulesAudioDir, `${pattern.replace(/_/g, '-')}_rule.mp3`);
            const ruleAudio = fileToDataUrl(ruleAudioPath);
            if (ruleAudio) {
                bundle.audios['_rule'] = ruleAudio;
                audioCount++;
            }

            // 3. 学习技巧
            const tipAudioPath = path.join(config.paths.rulesAudioDir, `${pattern.replace(/_/g, '-')}_tip.mp3`);
            const tipAudio = fileToDataUrl(tipAudioPath);
            if (tipAudio) {
                bundle.audios['_tip'] = tipAudio;
                audioCount++;
            }

            // 4. 单词发音
            const patternKey = `${category}/${pattern}`;
            const words = aiWords[patternKey] || [];
            for (const wordItem of words) {
                const word = (wordItem.word || '').toLowerCase();
                if (!word) continue;

                const wordAudioPath = path.join(config.paths.audioDir, `${word}.mp3`);
                const wordAudio = fileToDataUrl(wordAudioPath);
                if (wordAudio) {
                    bundle.audios[word] = wordAudio;
                    audioCount++;
                }

                // 例句音频
                const sentenceAudioPath = path.join(config.paths.audioDir, 'sentences', `${word}.mp3`);
                const sentenceAudio = fileToDataUrl(sentenceAudioPath);
                if (sentenceAudio) {
                    bundle.audios[`${word}_sentence`] = sentenceAudio;
                    audioCount++;
                }
            }

            // 保存 bundle
            const bundleFileName = pattern.replace(/_/g, '-') + '.json';
            const bundlePath = path.join(config.paths.bundleDir, category, bundleFileName);
            fs.writeFileSync(bundlePath, JSON.stringify(bundle));
            bundleCount++;

            index[category].push(pattern);

            // 进度
            process.stdout.write(`\r  ${category}/${pattern} - ${Object.keys(bundle.audios).length} 个音频`);
        }
    }

    // 保存索引
    const indexPath = path.join(config.paths.bundleDir, 'index.json');
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

    console.log('\n');
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ 完成！`);
    console.log(`  Bundle 数量: ${bundleCount}`);
    console.log(`  音频数量: ${audioCount}`);
    console.log(`⏱️  耗时: ${totalTime}s`);
    console.log(`📁 Bundle 保存在: ${config.paths.bundleDir}`);
}

module.exports = { run };
