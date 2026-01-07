/**
 * 生成例句音频
 * 读取 sentences.json，生成例句的英文语音
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');
const { getAccessToken, synthesizeSpeech } = require('./google-auth');

async function run(args) {
    console.log('🎤 生成例句音频');
    console.log('================\n');

    const dryRun = args.includes('--dry-run');

    // 检查 sentences.json
    if (!fs.existsSync(config.paths.sentences)) {
        console.error(`❌ 找不到例句文件: ${config.paths.sentences}`);
        return;
    }

    // 读取例句
    console.log('📖 读取例句...');
    const sentencesData = JSON.parse(fs.readFileSync(config.paths.sentences, 'utf8'));
    const sentences = Object.entries(sentencesData).map(([word, data]) => ({
        word,
        text: data.en,
        filename: word.toLowerCase()
    }));

    console.log(`📚 共 ${sentences.length} 个例句\n`);

    if (sentences.length === 0) {
        console.log('⚠️ 没有例句数据');
        return;
    }

    // 创建输出目录
    const sentencesAudioDir = path.join(config.paths.audioDir, 'sentences');
    if (!fs.existsSync(sentencesAudioDir)) {
        fs.mkdirSync(sentencesAudioDir, { recursive: true });
    }

    // 检查已存在的文件
    const existingFiles = new Set(
        fs.readdirSync(sentencesAudioDir)
            .filter(f => f.endsWith('.mp3'))
            .map(f => f.replace('.mp3', ''))
    );

    const sentencesToGenerate = sentences.filter(s => !existingFiles.has(s.filename));
    console.log(`⏭️  已存在 ${existingFiles.size} 个，需生成 ${sentencesToGenerate.length} 个\n`);

    if (sentencesToGenerate.length === 0) {
        console.log('✅ 所有例句语音已生成完毕！');
        return;
    }

    if (dryRun) {
        console.log('🔍 Dry run 模式，显示前 10 个待生成:');
        sentencesToGenerate.slice(0, 10).forEach(s => console.log(`  - ${s.word}: ${s.text.substring(0, 40)}...`));
        return;
    }

    // 获取 access token
    console.log('🔐 获取 Google Cloud 认证...');
    const accessToken = await getAccessToken();
    console.log('✅ 认证成功\n');

    // 批量生成
    console.log('🎵 开始生成语音...\n');

    let completed = 0;
    let failed = 0;
    const startTime = Date.now();

    // 分批处理
    for (let i = 0; i < sentencesToGenerate.length; i += config.concurrency) {
        const batch = sentencesToGenerate.slice(i, i + config.concurrency);

        const promises = batch.map(async (sentence) => {
            try {
                const audioBuffer = await synthesizeSpeech(
                    sentence.text,
                    accessToken,
                    config.englishVoice,
                    config.englishAudioConfig
                );
                const outputPath = path.join(sentencesAudioDir, `${sentence.filename}.mp3`);
                fs.writeFileSync(outputPath, audioBuffer);
                completed++;
                return { sentence, success: true };
            } catch (err) {
                failed++;
                console.error(`  ❌ ${sentence.word}: ${err.message}`);
                return { sentence, success: false, error: err.message };
            }
        });

        await Promise.all(promises);

        // 进度显示
        const progress = ((i + batch.length) / sentencesToGenerate.length * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        process.stdout.write(`\r  进度: ${progress}% (${completed}/${sentencesToGenerate.length}) - ${elapsed}s`);

        // 延迟
        if (i + config.concurrency < sentencesToGenerate.length) {
            await new Promise(r => setTimeout(r, config.delayBetweenBatches));
        }
    }

    console.log('\n');
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ 完成！成功: ${completed}, 失败: ${failed}`);
    console.log(`⏱️  耗时: ${totalTime}s`);
    console.log(`📁 音频保存在: ${sentencesAudioDir}`);
}

module.exports = { run };
