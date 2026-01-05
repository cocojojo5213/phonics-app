/**
 * 批量生成 TTS 音频文件
 * 使用 Google Cloud Text-to-Speech API (WaveNet 声音，免费额度内)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ============ 配置 ============
const CONFIG = {
    // Google Cloud 服务账号密钥文件路径
    keyFilePath: path.join(__dirname, '..', 'google-tts-key.json'),

    // 词库文件路径
    wordsFilePath: path.join(__dirname, '..', 'data', 'ai-words.json'),

    // 输出目录
    outputDir: path.join(__dirname, '..', 'public', 'audio'),

    // TTS 配置
    voice: {
        languageCode: 'en-US',
        name: 'en-US-Chirp3-HD-Achernar',  // Chirp3 HD 女声，2025最新最自然
    },
    audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 0.9,  // 稍微慢一点，适合学习
        pitch: 0,
    },

    // 并发控制
    concurrency: 5,  // 同时请求数
    delayBetweenBatches: 1000,  // 批次间延迟(ms)
};

// ============ Google Cloud 认证 ============
async function getAccessToken(keyFile) {
    const key = JSON.parse(fs.readFileSync(keyFile, 'utf8'));

    // 创建 JWT
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
        iss: key.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
    };

    const crypto = require('crypto');
    const base64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const signatureInput = `${base64url(header)}.${base64url(payload)}`;

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    const signature = sign.sign(key.private_key, 'base64url');

    const jwt = `${signatureInput}.${signature}`;

    // 交换 access token
    return new Promise((resolve, reject) => {
        const postData = `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`;

        const req = https.request({
            hostname: 'oauth2.googleapis.com',
            path: '/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length,
            },
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const result = JSON.parse(data);
                if (result.access_token) {
                    resolve(result.access_token);
                } else {
                    reject(new Error(`获取 token 失败: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// ============ TTS 合成 ============
async function synthesizeSpeech(text, accessToken) {
    const requestBody = JSON.stringify({
        input: { text },
        voice: CONFIG.voice,
        audioConfig: CONFIG.audioConfig,
    });

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

// ============ 主程序 ============
async function main() {
    console.log('🎤 Phonics TTS 音频生成器');
    console.log('========================\n');

    // 检查密钥文件
    if (!fs.existsSync(CONFIG.keyFilePath)) {
        console.error(`❌ 找不到密钥文件: ${CONFIG.keyFilePath}`);
        console.log('请把 Google Cloud 服务账号 JSON 密钥文件放到项目根目录，命名为 google-tts-key.json');
        process.exit(1);
    }

    // 读取词库
    console.log('📖 读取词库...');
    const wordsData = JSON.parse(fs.readFileSync(CONFIG.wordsFilePath, 'utf8'));

    // 提取所有唯一单词
    const allWords = new Set();
    for (const pattern in wordsData) {
        for (const item of wordsData[pattern]) {
            allWords.add(item.word.toLowerCase());
        }
    }

    const wordList = Array.from(allWords).sort();
    console.log(`📚 共 ${wordList.length} 个唯一单词\n`);

    // 创建输出目录
    if (!fs.existsSync(CONFIG.outputDir)) {
        fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    // 检查已存在的文件，跳过
    const existingFiles = new Set(
        fs.readdirSync(CONFIG.outputDir)
            .filter(f => f.endsWith('.mp3'))
            .map(f => f.replace('.mp3', ''))
    );

    const wordsToGenerate = wordList.filter(w => !existingFiles.has(w));
    console.log(`⏭️  已存在 ${existingFiles.size} 个，需生成 ${wordsToGenerate.length} 个\n`);

    if (wordsToGenerate.length === 0) {
        console.log('✅ 所有音频已生成完毕！');
        return;
    }

    // 获取 access token
    console.log('🔐 获取 Google Cloud 认证...');
    const accessToken = await getAccessToken(CONFIG.keyFilePath);
    console.log('✅ 认证成功\n');

    // 批量生成
    console.log('🎵 开始生成音频...\n');

    let completed = 0;
    let failed = 0;
    const startTime = Date.now();

    // 分批处理
    for (let i = 0; i < wordsToGenerate.length; i += CONFIG.concurrency) {
        const batch = wordsToGenerate.slice(i, i + CONFIG.concurrency);

        const promises = batch.map(async (word) => {
            try {
                const audioBuffer = await synthesizeSpeech(word, accessToken);
                const outputPath = path.join(CONFIG.outputDir, `${word}.mp3`);
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
        if (i + CONFIG.concurrency < wordsToGenerate.length) {
            await new Promise(r => setTimeout(r, CONFIG.delayBetweenBatches));
        }
    }

    console.log('\n');
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('========================');
    console.log(`✅ 完成！成功: ${completed}, 失败: ${failed}`);
    console.log(`⏱️  耗时: ${totalTime}s`);
    console.log(`📁 音频保存在: ${CONFIG.outputDir}`);
}

main().catch(console.error);
