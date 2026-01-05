/**
 * 列出所有可用的 en-US 声音
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const keyFilePath = path.join(__dirname, '..', 'google-tts-key.json');

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

async function listVoices(accessToken) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'texttospeech.googleapis.com',
            path: '/v1/voices?languageCode=en-US',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const result = JSON.parse(data);
                resolve(result.voices || []);
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function main() {
    console.log('📋 查询所有 en-US 可用声音\n');

    const token = await getAccessToken(keyFilePath);
    const voices = await listVoices(token);

    // 按类型分组
    const groups = {};
    voices.forEach(v => {
        const type = v.name.split('-').slice(2, -1).join('-') || 'Other';
        if (!groups[type]) groups[type] = [];
        groups[type].push({
            name: v.name,
            gender: v.ssmlGender,
        });
    });

    console.log(`共 ${voices.length} 个声音:\n`);

    for (const type of Object.keys(groups).sort()) {
        console.log(`=== ${type} (${groups[type].length}个) ===`);
        groups[type].forEach(v => {
            const gender = v.gender === 'MALE' ? '👨' : v.gender === 'FEMALE' ? '👩' : '🧑';
            console.log(`  ${gender} ${v.name}`);
        });
        console.log('');
    }
}

main().catch(console.error);
