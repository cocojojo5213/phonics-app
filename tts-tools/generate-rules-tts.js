/**
 * 生成规则讲解音频（针对教学优化的 Azure 版本）
 * 
 * 使用 Azure TTS 的“晓晓-活泼”风格生成自然拼读规则讲解
 */

const fs = require('fs');
const path = require('path');
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const config = require('./config');

// 配置
const PHONICS_DATA_PATH = path.join(__dirname, 'data', 'phonicsData.js');
const OUTPUT_DIR = path.join(__dirname, 'output', 'rules');

// 分类列表
const CATEGORIES = ['letters', 'short_vowels', 'long_vowels', 'consonant_blends', 'r_controlled', 'other_vowels'];

// 加载 phonicsData
function loadPhonicsData() {
    // 简单的 eval 处理，加载 js 格式的数据
    const content = fs.readFileSync(PHONICS_DATA_PATH, 'utf8');
    const phonicsData = eval(`(function() { ${content}; return phonicsData; })()`);
    return phonicsData;
}

// 提取所有规则
function extractRules(phonicsData) {
    const rules = [];
    for (const category of CATEGORIES) {
        const data = phonicsData[category];
        if (!data) continue;
        for (const item of data) {
            if (item.rule) {
                rules.push({ pattern: item.pattern, type: 'rule', text: item.rule });
            }
            if (item.tip) {
                rules.push({ pattern: item.pattern, type: 'tip', text: item.tip });
            }
        }
    }
    return rules;
}

// 生成文件名
function getFilename(pattern, type) {
    const safePattern = pattern.replace(/_/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
    return `${safePattern}_${type}.mp3`;
}

// Azure 合成函数
async function synthesizeAzure(text, filepath) {
    const speechConfig = sdk.SpeechConfig.fromSubscription(config.azure.key, config.azure.region);
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16khz32kBitrateMonoMp3;

    const audioConfig = sdk.AudioConfig.fromAudioFileOutput(filepath);
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    // 构建带风格的 SSML
    const ssml = `
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-CN">
            <voice name="${config.rulesVoice.voiceName}">
                <mstts:express-as style="${config.rulesVoice.style}">
                    ${text}
                </mstts:express-as>
            </voice>
        </speak>`;

    return new Promise((resolve, reject) => {
        synthesizer.speakSsmlAsync(ssml,
            result => {
                if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                    resolve();
                } else {
                    reject(result.errorDetails);
                }
                synthesizer.close();
            },
            err => {
                synthesizer.close();
                reject(err);
            });
    });
}

async function main() {
    console.log('🎤 规则讲解音频生成器 (Azure 高级版)\n');
    console.log(`音色: ${config.rulesVoice.voiceName} | 风格: ${config.rulesVoice.style}\n`);

    if (!config.azure.key) {
        console.error('❌ 请在 config.js 中配置 Azure Key');
        process.exit(1);
    }

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const phonicsData = loadPhonicsData();
    const rules = extractRules(phonicsData);
    console.log(`找到 ${rules.length} 条规则/提示\n`);

    let success = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        const filename = getFilename(rule.pattern, rule.type);
        const filepath = path.join(OUTPUT_DIR, filename);

        if (fs.existsSync(filepath)) {
            skipped++;
            continue;
        }

        console.log(`[${i + 1}/${rules.length}] 正在生成: ${rule.pattern} (${rule.type})...`);

        try {
            await synthesizeAzure(rule.text, filepath);
            console.log(`  ✅ ${filename}`);
            success++;
            // 稍微停一下，防止并发过快
            await new Promise(r => setTimeout(r, 50));
        } catch (err) {
            console.error(`  ❌ 失败: ${err}`);
            failed++;
        }
    }

    console.log('\n=============================');
    console.log(`✅ 成功: ${success}`);
    console.log(`❌ 失败: ${failed}`);
    console.log(`⏭️ 跳过: ${skipped}`);
    console.log(`📁 输出: ${OUTPUT_DIR}`);
}

main().catch(console.error);
