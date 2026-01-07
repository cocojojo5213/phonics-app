/**
 * 生成拼读音频
 * 
 * 功能：
 * 根据单词的 breakdown 分解，生成拼读语音
 * 例如：rain (r-ai-n) → "r ... ai ... n ... rain"
 * 
 * 用法：
 *   node scripts/tts/generate-spelling.js [--dry-run] [--pattern=xxx]
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');
const { getAccessToken, synthesizeSpeech } = require('./google-auth');

/**
 * 把 breakdown 转换成拼读文本
 * 例如：r-ai-n → "r, ai, n, rain"
 * 使用 SSML 控制停顿
 */
function createSpellingSSML(word, breakdown) {
    // 分解成音节
    const parts = breakdown.split('-').filter(p => p.trim());

    // 构建 SSML
    // 每个音节后面加停顿，最后读整个单词
    let ssml = '<speak>';

    for (const part of parts) {
        // 音节发音（慢速）
        ssml += `<prosody rate="slow">${part}</prosody>`;
        ssml += '<break time="400ms"/>';
    }

    // 最后读整个单词（正常速度）
    ssml += '<break time="600ms"/>';
    ssml += `<prosody rate="medium">${word}</prosody>`;

    ssml += '</speak>';

    return ssml;
}

/**
 * 使用 SSML 合成语音
 */
async function synthesizeSSML(ssml, accessToken) {
    const requestBody = JSON.stringify({
        input: { ssml },
        voice: config.englishVoice,
        audioConfig: config.englishAudioConfig,
    });

    const https = require('https');

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'texttospeech.googleapis.com',
            path: '/v1/text:synthesize',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody),
            },
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.audioContent) {
                        resolve(Buffer.from(result.audioContent, 'base64'));
                    } else {
                        reject(new Error(`TTS 失败: ${data}`));
                    }
                } catch (e) {
                    reject(new Error(`解析响应失败: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(requestBody);
        req.end();
    });
}

async function run(args = []) {
    console.log('🔤 生成拼读音频');
    console.log('================\n');

    const dryRun = args.includes('--dry-run');
    const patternArg = args.find(a => a.startsWith('--pattern='));
    const targetPattern = patternArg ? patternArg.split('=')[1] : null;

    // 读取分析后的词库
    const analyzedFile = path.join(config.paths.staticDir, '..', 'phonics-app', 'data', 'ai-words-analyzed.json');
    const originalFile = config.paths.aiWords;

    let wordsFile = fs.existsSync(analyzedFile) ? analyzedFile : originalFile;

    console.log('📖 读取词库...');
    if (!fs.existsSync(wordsFile)) {
        console.error(`❌ 找不到词库`);
        return;
    }

    const wordsData = JSON.parse(fs.readFileSync(wordsFile, 'utf8'));

    // 检查是否有 breakdown 字段
    let hasBreakdown = false;
    for (const pattern in wordsData) {
        if (wordsData[pattern][0]?.breakdown) {
            hasBreakdown = true;
            break;
        }
    }

    if (!hasBreakdown) {
        console.log('⚠️ 词库没有 breakdown 字段');
        console.log('请先运行: npm run phonics:analyze');
        return;
    }

    // 创建输出目录
    const spellingDir = path.join(config.paths.audioDir, 'spelling');
    if (!fs.existsSync(spellingDir)) {
        fs.mkdirSync(spellingDir, { recursive: true });
    }

    // 检查已存在的文件
    const existingFiles = new Set(
        fs.existsSync(spellingDir)
            ? fs.readdirSync(spellingDir).filter(f => f.endsWith('.mp3')).map(f => f.replace('.mp3', ''))
            : []
    );

    // 收集需要生成的单词
    const wordsToGenerate = [];

    for (const pattern in wordsData) {
        if (targetPattern && !pattern.includes(targetPattern)) continue;

        for (const item of wordsData[pattern]) {
            if (item.breakdown && !existingFiles.has(item.word.toLowerCase())) {
                wordsToGenerate.push({
                    word: item.word.toLowerCase(),
                    breakdown: item.breakdown
                });
            }
        }
    }

    console.log(`📚 需要生成: ${wordsToGenerate.length} 个拼读音频\n`);

    if (wordsToGenerate.length === 0) {
        console.log('✅ 所有拼读音频已生成！');
        return;
    }

    if (dryRun) {
        console.log('🔍 Dry run 模式，显示前 10 个:');
        wordsToGenerate.slice(0, 10).forEach(w => {
            console.log(`  ${w.word}: ${w.breakdown}`);
            console.log(`    SSML: ${createSpellingSSML(w.word, w.breakdown)}`);
        });
        return;
    }

    // 获取 access token
    console.log('🔐 获取 Google Cloud 认证...');
    const accessToken = await getAccessToken();
    console.log('✅ 认证成功\n');

    // 批量生成
    console.log('🎵 开始生成拼读音频...\n');

    let completed = 0;
    let failed = 0;
    const startTime = Date.now();

    for (let i = 0; i < wordsToGenerate.length; i += config.concurrency) {
        const batch = wordsToGenerate.slice(i, i + config.concurrency);

        const promises = batch.map(async (item) => {
            try {
                const ssml = createSpellingSSML(item.word, item.breakdown);
                const audioBuffer = await synthesizeSSML(ssml, accessToken);
                const outputPath = path.join(spellingDir, `${item.word}.mp3`);
                fs.writeFileSync(outputPath, audioBuffer);
                completed++;
                return { word: item.word, success: true };
            } catch (err) {
                failed++;
                console.error(`  ❌ ${item.word}: ${err.message}`);
                return { word: item.word, success: false };
            }
        });

        await Promise.all(promises);

        // 进度
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
    console.log(`📁 音频保存在: ${spellingDir}`);
}

module.exports = { run };

// 直接运行
if (require.main === module) {
    run(process.argv.slice(2)).catch(console.error);
}
