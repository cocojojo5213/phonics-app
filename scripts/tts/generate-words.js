/**
 * 生成单词音频
 * 读取 ai-words.json，生成所有单词的发音
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');
const { getAccessToken, synthesizeSpeech } = require('./google-auth');

async function run(args) {
    console.log('🎤 生成单词音频');
    console.log('================\n');

    const dryRun = args.includes('--dry-run');

    // 读取词库
    console.log('📖 读取词库...');
    if (!fs.existsSync(config.paths.aiWords)) {
        console.error(`❌ 找不到词库: ${config.paths.aiWords}`);
        return;
    }

    const wordsData = JSON.parse(fs.readFileSync(config.paths.aiWords, 'utf8'));

    // 提取所有唯一单词
    const allWords = new Set();
    for (const pattern in wordsData) {
        for (const item of wordsData[pattern]) {
            if (item.word) {
                allWords.add(item.word.toLowerCase());
            }
        }
    }

    const wordList = Array.from(allWords).sort();
    console.log(`📚 共 ${wordList.length} 个唯一单词\n`);

    // 创建输出目录
    if (!fs.existsSync(config.paths.audioDir)) {
        fs.mkdirSync(config.paths.audioDir, { recursive: true });
    }

    // 检查已存在的文件
    const existingFiles = new Set(
        fs.readdirSync(config.paths.audioDir)
            .filter(f => f.endsWith('.mp3'))
            .map(f => f.replace('.mp3', ''))
    );

    const wordsToGenerate = wordList.filter(w => !existingFiles.has(w));
    console.log(`⏭️  已存在 ${existingFiles.size} 个，需生成 ${wordsToGenerate.length} 个\n`);

    if (wordsToGenerate.length === 0) {
        console.log('✅ 所有音频已生成完毕！');
        return;
    }

    if (dryRun) {
        console.log('🔍 Dry run 模式，显示前 10 个待生成:');
        wordsToGenerate.slice(0, 10).forEach(w => console.log(`  - ${w}`));
        return;
    }

    // 获取 access token
    console.log('🔐 获取 Google Cloud 认证...');
    const accessToken = await getAccessToken();
    console.log('✅ 认证成功\n');

    // 批量生成
    console.log('🎵 开始生成音频...\n');

    let completed = 0;
    let failed = 0;
    const startTime = Date.now();

    // 分批处理
    for (let i = 0; i < wordsToGenerate.length; i += config.concurrency) {
        const batch = wordsToGenerate.slice(i, i + config.concurrency);

        const promises = batch.map(async (word) => {
            try {
                const audioBuffer = await synthesizeSpeech(
                    word,
                    accessToken,
                    config.englishVoice,
                    config.englishAudioConfig
                );
                const outputPath = path.join(config.paths.audioDir, `${word}.mp3`);
                fs.writeFileSync(outputPath, audioBuffer);
                completed++;
                return { word, success: true };
            } catch (err) {
                failed++;
                console.error(`  ❌ ${word}: ${err.message}`);
                return { word, success: false, error: err.message };
            }
        });

        await Promise.all(promises);

        // 进度显示
        const progress = ((i + batch.length) / wordsToGenerate.length * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        process.stdout.write(`\r  进度: ${progress}% (${completed}/${wordsToGenerate.length}) - ${elapsed}s`);

        // 延迟
        if (i + config.concurrency < wordsToGenerate.length) {
            await new Promise(r => setTimeout(r, config.delayBetweenBatches));
        }
    }

    console.log('\n');
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ 完成！成功: ${completed}, 失败: ${failed}`);
    console.log(`⏱️  耗时: ${totalTime}s`);
    console.log(`📁 音频保存在: ${config.paths.audioDir}`);
}

module.exports = { run };
