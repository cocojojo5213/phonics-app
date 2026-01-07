/**
 * Google Cloud 认证模块
 * 共享的认证逻辑
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const KEY_FILE_PATH = path.join(__dirname, '..', '..', 'google-tts-key.json');

/**
 * 获取 Google Cloud Access Token
 */
async function getAccessToken(keyFilePath = KEY_FILE_PATH) {
    if (!fs.existsSync(keyFilePath)) {
        throw new Error(`找不到密钥文件: ${keyFilePath}\n请把 Google Cloud 服务账号 JSON 密钥文件放到项目根目录，命名为 google-tts-key.json`);
    }

    const key = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));

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

/**
 * 调用 Google TTS API
 */
async function synthesizeSpeech(text, accessToken, voiceConfig, audioConfig) {
    const requestBody = JSON.stringify({
        input: { text },
        voice: voiceConfig,
        audioConfig: audioConfig,
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

module.exports = {
    getAccessToken,
    synthesizeSpeech,
    KEY_FILE_PATH,
};
