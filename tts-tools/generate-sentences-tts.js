/**
 * 生成例句音频（英文）
 * 
 * 读取 sentences.json，使用 Google Cloud TTS 生成英语语音
 * 
 * 使用前：
 * 1. 在 config.js 填入 googleServiceAccount
 * 2. 先运行 generate-sentences.js 生成例句
 */

const fs = require('fs');
const path = require('path');
const textToSpeech = require('@google-cloud/text-to-speech');
const config = require('./config');

// 配置
const SENTENCES_FILE = path.join(__dirname, 'output', 'sentences.json');
const OUTPUT_DIR = path.join(__dirname, 'output', 'sentences-audio');

// 音频配置
const AUDIO_CONFIG = {
    audioEncoding: 'MP3',
    speakingRate: 0.9,
    pitch: 0
};

// 并发配置（Chirp3-HD 每分钟限制200次）
const CONCURRENT = 1;    // 单线程
const DELAY_MS = 350;    // 350ms延迟，每分钟约170次，安全在配额内

async function main() {
    console.log('🎤 例句音频生成器\n');
    console.log(`声音: ${config.sentencesVoice.name}\n`);

    // 检查配置
    if (!config.googleServiceAccount || !config.googleServiceAccount.private_key) {
        console.error('❌ 请在 config.js 填入 googleServiceAccount');
        process.exit(1);
    }

    // 检查例句文件
    if (!fs.existsSync(SENTENCES_FILE)) {
        console.error('❌ 例句文件不存在，请先运行 generate-sentences.js');
        process.exit(1);
    }

    // 创建输出目录
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // 加载例句
    const sentences = JSON.parse(fs.readFileSync(SENTENCES_FILE, 'utf8'));
    const words = Object.keys(sentences);

    console.log(`📚 例句数量: ${words.length}\n`);

    // 创建 TTS 客户端
    const client = new textToSpeech.TextToSpeechClient({
        credentials: config.googleServiceAccount
    });

    let success = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < words.length; i += CONCURRENT) {
        const batch = words.slice(i, i + CONCURRENT);

        const promises = batch.map(async (word) => {
            const sentence = sentences[word];
            if (!sentence || !sentence.en) return { word, status: 'skip' };

            const filename = `${word}.mp3`;
            const filepath = path.join(OUTPUT_DIR, filename);

            if (fs.existsSync(filepath)) {
                return { word, status: 'skip' };
            }

            try {
                const request = {
                    input: { text: sentence.en },
                    voice: config.sentencesVoice,
                    audioConfig: AUDIO_CONFIG
                };

                const [response] = await client.synthesizeSpeech(request);
                fs.writeFileSync(filepath, response.audioContent);

                return { word, status: 'success' };
            } catch (err) {
                return { word, status: 'fail', error: err.message };
            }
        });

        const results = await Promise.all(promises);

        for (const result of results) {
            if (result.status === 'success') {
                success++;
                console.log(`✅ ${result.word}`);
            } else if (result.status === 'skip') {
                skipped++;
            } else {
                failed++;
                console.log(`❌ ${result.word}: ${result.error}`);
            }
        }

        const total = success + failed + skipped;
        if (total % 50 === 0 && total > 0) {
            console.log(`\n📊 进度: ${total}/${words.length}\n`);
        }

        await new Promise(r => setTimeout(r, DELAY_MS));
    }

    console.log('\n=============================');
    console.log(`✅ 成功: ${success}`);
    console.log(`❌ 失败: ${failed}`);
    console.log(`⏭️ 跳过: ${skipped}`);
    console.log(`📁 输出: ${OUTPUT_DIR}`);
}

main().catch(console.error);
