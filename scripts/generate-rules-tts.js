/**
 * 批量生成 Phonics 规则语音文件
 * 使用 Google Cloud Text-to-Speech API (高质量中文语音)
 * 
 * 从 phonicsData.js 提取所有 rule 和 tip 文本，生成对应的 mp3 文件
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// ============ 配置 ============
const CONFIG = {
    // Google Cloud 服务账号密钥文件路径
    keyFilePath: path.join(__dirname, '..', 'google-tts-key.json'),

    // phonicsData.js 路径
    phonicsDataPath: path.join(__dirname, '..', 'data', 'phonicsData.js'),

    // 输出目录（规则语音）
    outputDir: path.join(__dirname, '..', 'data', 'rules-audio'),

    // TTS 配置 - 使用高质量中文女声
    voice: {
        languageCode: 'cmn-CN',  // 中文普通话
        name: 'cmn-CN-Chirp3-HD-Aoede',  // Chirp3 HD 高质量女声
        // 其他可选高质量声音:
        // 'cmn-CN-Chirp3-HD-Kore' - 另一个女声
        // 'cmn-CN-Chirp3-HD-Puck' - 男声
    },
    audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 0.95,  // 稍微慢一点，适合学习
        pitch: 0,
    },

    // 并发控制
    concurrency: 3,  // 同时请求数（中文语音较慢，减少并发）
    delayBetweenBatches: 1500,  // 批次间延迟(ms)
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

// ============ 从 phonicsData.js 提取规则 ============
function extractRulesFromPhonicsData() {
    // 读取 phonicsData.js
    const content = fs.readFileSync(CONFIG.phonicsDataPath, 'utf8');

    // 使用正则表达式提取 pattern, rule, tip
    const rules = [];

    // 匹配每个包含 pattern 的对象
    const patternRegex = /pattern:\s*['"]([^'"]+)['"]/g;
    const ruleRegex = /rule:\s*['"]([^'"]+)['"]/g;
    const tipRegex = /tip:\s*['"]([^'"]+)['"]/g;

    // 按块分割，每个块是一个发音模式
    const blocks = content.split(/\{\s*\n?\s*pattern:/);

    for (let i = 1; i < blocks.length; i++) {
        const block = 'pattern:' + blocks[i];

        // 提取 pattern
        const patternMatch = block.match(/pattern:\s*['"]([^'"]+)['"]/);
        const ruleMatch = block.match(/rule:\s*['"]([^'"]+)['"]/);
        const tipMatch = block.match(/tip:\s*['"]([^'"]+)['"]/);

        if (patternMatch) {
            const pattern = patternMatch[1];
            if (ruleMatch) {
                rules.push({
                    pattern,
                    type: 'rule',
                    text: ruleMatch[1],
                    filename: `${pattern.replace(/_/g, '-')}_rule`
                });
            }
            if (tipMatch) {
                rules.push({
                    pattern,
                    type: 'tip',
                    text: tipMatch[1],
                    filename: `${pattern.replace(/_/g, '-')}_tip`
                });
            }
        }
    }

    return rules;
}

// ============ 主程序 ============
async function main() {
    console.log('🎤 Phonics 规则语音生成器');
    console.log('========================\n');

    // 检查密钥文件
    if (!fs.existsSync(CONFIG.keyFilePath)) {
        console.error(`❌ 找不到密钥文件: ${CONFIG.keyFilePath}`);
        console.log('请把 Google Cloud 服务账号 JSON 密钥文件放到项目根目录，命名为 google-tts-key.json');
        process.exit(1);
    }

    // 检查 phonicsData.js
    if (!fs.existsSync(CONFIG.phonicsDataPath)) {
        console.error(`❌ 找不到 phonicsData.js: ${CONFIG.phonicsDataPath}`);
        process.exit(1);
    }

    // 提取规则
    console.log('📖 从 phonicsData.js 提取规则...');
    const rules = extractRulesFromPhonicsData();
    console.log(`📚 共提取 ${rules.length} 条规则/提示\n`);

    if (rules.length === 0) {
        console.log('⚠️ 没有找到规则数据');
        return;
    }

    // 显示前几条
    console.log('示例:');
    rules.slice(0, 5).forEach(r => {
        console.log(`  - [${r.pattern}] ${r.type}: ${r.text.substring(0, 30)}...`);
    });
    console.log('\n');

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

    const rulesToGenerate = rules.filter(r => !existingFiles.has(r.filename));
    console.log(`⏭️  已存在 ${existingFiles.size} 个，需生成 ${rulesToGenerate.length} 个\n`);

    if (rulesToGenerate.length === 0) {
        console.log('✅ 所有规则语音已生成完毕！');
        return;
    }

    // 获取 access token
    console.log('🔐 获取 Google Cloud 认证...');
    const accessToken = await getAccessToken(CONFIG.keyFilePath);
    console.log('✅ 认证成功\n');

    // 批量生成
    console.log('🎵 开始生成语音...\n');

    let completed = 0;
    let failed = 0;
    const startTime = Date.now();
    const failedItems = [];

    // 分批处理
    for (let i = 0; i < rulesToGenerate.length; i += CONFIG.concurrency) {
        const batch = rulesToGenerate.slice(i, i + CONFIG.concurrency);

        const promises = batch.map(async (rule) => {
            try {
                const audioBuffer = await synthesizeSpeech(rule.text, accessToken);
                const outputPath = path.join(CONFIG.outputDir, `${rule.filename}.mp3`);
                fs.writeFileSync(outputPath, audioBuffer);
                completed++;
                return { rule, success: true };
            } catch (err) {
                failed++;
                failedItems.push({ filename: rule.filename, error: err.message });
                console.error(`  ❌ ${rule.filename}: ${err.message}`);
                return { rule, success: false, error: err.message };
            }
        });

        await Promise.all(promises);

        // 进度显示
        const progress = ((i + batch.length) / rulesToGenerate.length * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        process.stdout.write(`\r  进度: ${progress}% (${completed}/${rulesToGenerate.length}) - ${elapsed}s`);

        // 延迟
        if (i + CONFIG.concurrency < rulesToGenerate.length) {
            await new Promise(r => setTimeout(r, CONFIG.delayBetweenBatches));
        }
    }

    console.log('\n\n========================');
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ 完成！成功: ${completed}, 失败: ${failed}`);
    console.log(`⏱️  耗时: ${totalTime}s`);
    console.log(`📁 音频保存在: ${CONFIG.outputDir}`);

    if (failedItems.length > 0) {
        console.log('\n❌ 失败项目:');
        failedItems.forEach(item => console.log(`  - ${item.filename}: ${item.error}`));
    }
}

main().catch(console.error);
