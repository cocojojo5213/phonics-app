/**
 * 测试不同声音
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const keyFilePath = path.join(__dirname, '..', 'google-tts-key.json');
const outputDir = path.join(__dirname, '..', 'public', 'audio', 'test-voices');

// 全部 30 个 Chirp3 HD 声音
const voices = [
    { name: 'en-US-Chirp3-HD-Achernar', desc: '👩 Achernar' },
    { name: 'en-US-Chirp3-HD-Achird', desc: '👨 Achird' },
    { name: 'en-US-Chirp3-HD-Algenib', desc: '👨 Algenib' },
    { name: 'en-US-Chirp3-HD-Algieba', desc: '👨 Algieba' },
    { name: 'en-US-Chirp3-HD-Alnilam', desc: '👨 Alnilam' },
    { name: 'en-US-Chirp3-HD-Aoede', desc: '👩 Aoede' },
    { name: 'en-US-Chirp3-HD-Autonoe', desc: '👩 Autonoe' },
    { name: 'en-US-Chirp3-HD-Callirrhoe', desc: '👩 Callirrhoe' },
    { name: 'en-US-Chirp3-HD-Charon', desc: '👨 Charon' },
    { name: 'en-US-Chirp3-HD-Despina', desc: '👩 Despina' },
    { name: 'en-US-Chirp3-HD-Enceladus', desc: '👨 Enceladus' },
    { name: 'en-US-Chirp3-HD-Erinome', desc: '👩 Erinome' },
    { name: 'en-US-Chirp3-HD-Fenrir', desc: '👨 Fenrir' },
    { name: 'en-US-Chirp3-HD-Gacrux', desc: '👩 Gacrux' },
    { name: 'en-US-Chirp3-HD-Iapetus', desc: '👨 Iapetus' },
    { name: 'en-US-Chirp3-HD-Kore', desc: '👩 Kore' },
    { name: 'en-US-Chirp3-HD-Laomedeia', desc: '👩 Laomedeia' },
    { name: 'en-US-Chirp3-HD-Leda', desc: '👩 Leda' },
    { name: 'en-US-Chirp3-HD-Orus', desc: '👨 Orus' },
    { name: 'en-US-Chirp3-HD-Puck', desc: '👨 Puck' },
    { name: 'en-US-Chirp3-HD-Pulcherrima', desc: '👩 Pulcherrima' },
    { name: 'en-US-Chirp3-HD-Rasalgethi', desc: '👨 Rasalgethi' },
    { name: 'en-US-Chirp3-HD-Sadachbia', desc: '👨 Sadachbia' },
    { name: 'en-US-Chirp3-HD-Sadaltager', desc: '👨 Sadaltager' },
    { name: 'en-US-Chirp3-HD-Schedar', desc: '👨 Schedar' },
    { name: 'en-US-Chirp3-HD-Sulafat', desc: '👩 Sulafat' },
    { name: 'en-US-Chirp3-HD-Umbriel', desc: '👨 Umbriel' },
    { name: 'en-US-Chirp3-HD-Vindemiatrix', desc: '👩 Vindemiatrix' },
    { name: 'en-US-Chirp3-HD-Zephyr', desc: '👩 Zephyr' },
    { name: 'en-US-Chirp3-HD-Zubenelgenubi', desc: '👨 Zubenelgenubi' },
];

const testWord = 'apple';

async function getAccessToken(keyFile) {
    const key = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
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
                if (result.access_token) resolve(result.access_token);
                else reject(new Error(`Token 失败: ${data}`));
            });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

async function synthesize(text, voiceName, accessToken) {
    const requestBody = JSON.stringify({
        input: { text },
        voice: { languageCode: 'en-US', name: voiceName },
        audioConfig: { audioEncoding: 'MP3', speakingRate: 0.9 },
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
                const result = JSON.parse(data);
                if (result.audioContent) resolve(Buffer.from(result.audioContent, 'base64'));
                else reject(new Error(`TTS 失败: ${data}`));
            });
        });
        req.on('error', reject);
        req.write(requestBody);
        req.end();
    });
}

async function main() {
    console.log('🎤 声音测试 - 生成样本\n');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('🔐 获取认证...');
    const token = await getAccessToken(keyFilePath);
    console.log('✅ 认证成功\n');

    console.log(`📝 测试单词: "${testWord}"\n`);

    for (const voice of voices) {
        try {
            const audio = await synthesize(testWord, voice.name, token);
            const filename = `${voice.name}.mp3`;
            fs.writeFileSync(path.join(outputDir, filename), audio);
            console.log(`✅ ${voice.desc}`);
            console.log(`   文件: public/audio/test-voices/${filename}\n`);
        } catch (err) {
            console.log(`❌ ${voice.desc}: ${err.message}\n`);
        }
    }

    console.log('========================');
    console.log(`📁 样本保存在: ${outputDir}`);
    console.log('\n播放这些文件，选一个你喜欢的声音告诉我！');
}

main().catch(console.error);
