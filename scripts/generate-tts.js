/**
 * TTS 音频生成脚本 / TTS Audio Generation Script
 * 使用 Google Cloud TTS 为单词和例句生成发音
 * Uses Google Cloud TTS to generate pronunciation for words and sentences
 * 
 * 用法 / Usage: node scripts/generate-tts.js [word|sentence|all]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');


// 配置
const CONFIG = {
    generatedWordsPath: path.join(__dirname, '../data/generated-words.json'),
    rulesPath: path.join(__dirname, '../data/rules-master.json'),
    audioOutputPath: path.join(__dirname, '../audio'),

    // TTS 语音配置
    // TTS 语音配置 (2026 最新推荐)
    wordVoice: {
        languageCode: 'en-US',
        name: 'en-US-Studio-O', // Studio 语音：目前清晰度最高，最适合单词教学
        ssmlGender: 'FEMALE'
    },
    sentenceVoice: {
        languageCode: 'en-US',
        name: 'en-US-Neural2-H', // Neural2-H：用户选择，配额1000RPM
        ssmlGender: 'FEMALE'
    },
    audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0, // 正常语速
        pitch: 0
    }
};

// 确保目录存在
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function normalizeSentence(text) {
    return text.trim().replace(/\s+/g, ' ');
}

function getSentenceHash(text) {
    const normalized = normalizeSentence(text);
    return crypto.createHash('sha1').update(normalized, 'utf8').digest('hex');
}


// 生成单个音频文件
async function generateAudio(client, text, outputPath, voiceConfig) {
    if (fs.existsSync(outputPath)) {
        console.log(`⏭️  跳过（已存在）: ${path.basename(outputPath)}`);
        return false;
    }

    try {
        const [response] = await client.synthesizeSpeech({
            input: { text },
            voice: voiceConfig,
            audioConfig: CONFIG.audioConfig
        });

        fs.writeFileSync(outputPath, response.audioContent, 'binary');
        console.log(`✅ 生成: ${path.basename(outputPath)}`);
        return true;
    } catch (error) {
        console.error(`❌ 失败: ${text} - ${error.message}`);
        return false;
    }
}

// 收集所有需要生成的单词
function collectWords() {
    const words = new Map(); // word -> { word, sentence, sentence_cn }

    // 从 rules-master.json 收集
    if (fs.existsSync(CONFIG.rulesPath)) {
        const rulesData = JSON.parse(fs.readFileSync(CONFIG.rulesPath, 'utf8'));
        rulesData.rules.forEach(rule => {
            (rule.examples || []).forEach(ex => {
                if (ex.word && !words.has(ex.word.toLowerCase())) {
                    words.set(ex.word.toLowerCase(), {
                        word: ex.word,
                        sentence: ex.sentence || null,
                        sentence_cn: ex.sentence_cn || null
                    });
                }
            });
        });
    }

    // 从 generated-words.json 收集
    if (fs.existsSync(CONFIG.generatedWordsPath)) {
        const generated = JSON.parse(fs.readFileSync(CONFIG.generatedWordsPath, 'utf8'));
        Object.values(generated).forEach(ruleResult => {
            (ruleResult.items || []).forEach(item => {
                if (item.word && !words.has(item.word.toLowerCase())) {
                    words.set(item.word.toLowerCase(), {
                        word: item.word,
                        sentence: item.sentence || null,
                        sentence_cn: item.sentence_cn || null
                    });
                }
            });
        });
    }

    return Array.from(words.values());
}

async function main() {
    const mode = process.argv[2] || 'all';
    console.log(`🔊 TTS 生成模式: ${mode}\n`);

    // 初始化 TTS 客户端（使用 ADC）
    const client = new TextToSpeechClient();

    // 收集单词
    const words = collectWords();
    console.log(`📚 共 ${words.length} 个单词需要处理\n`);

    // 确保目录存在
    ensureDir(CONFIG.audioOutputPath);
    ensureDir(path.join(CONFIG.audioOutputPath, 'sentences'));

    let wordCount = 0;
    let sentenceCount = 0;

    for (const item of words) {
        // 生成单词音频
        if (mode === 'word' || mode === 'all') {
            const wordPath = path.join(CONFIG.audioOutputPath, `${item.word.toLowerCase()}.mp3`);
            if (await generateAudio(client, item.word, wordPath, CONFIG.wordVoice)) {
                wordCount++;
            }
        }

        // 生成例句音频
        if ((mode === 'sentence' || mode === 'all') && item.sentence) {
            const sentenceHash = getSentenceHash(item.sentence);
            const sentencePath = path.join(CONFIG.audioOutputPath, 'sentences', `${sentenceHash}.mp3`);
            if (await generateAudio(client, item.sentence, sentencePath, CONFIG.sentenceVoice)) {
                sentenceCount++;
            }
        }


        // 避免 API 限流
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n🎉 完成！`);
    console.log(`   单词音频: ${wordCount} 个`);
    console.log(`   例句音频: ${sentenceCount} 个`);
    console.log(`   输出目录: ${CONFIG.audioOutputPath}`);
}

main().catch(console.error);
