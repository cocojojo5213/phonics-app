/**
 * 生成规则讲解音频
 * 读取 phonicsData.js，生成规则和提示的中文语音
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');
const { getAccessToken, synthesizeSpeech } = require('./google-auth');

/**
 * 从 phonicsData.js 提取规则和提示
 */
function extractRulesFromPhonicsData() {
    const content = fs.readFileSync(config.paths.phonicsData, 'utf8');
    const rules = [];

    // 按块分割，每个块是一个发音模式
    const blocks = content.split(/\{\s*\n?\s*pattern:/);

    for (let i = 1; i < blocks.length; i++) {
        const block = 'pattern:' + blocks[i];

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

async function run(args) {
    console.log('🎤 生成规则讲解音频');
    console.log('====================\n');

    const dryRun = args.includes('--dry-run');

    // 检查 phonicsData.js
    if (!fs.existsSync(config.paths.phonicsData)) {
        console.error(`❌ 找不到 phonicsData.js: ${config.paths.phonicsData}`);
        return;
    }

    // 提取规则
    console.log('📖 从 phonicsData.js 提取规则...');
    const rules = extractRulesFromPhonicsData();
    console.log(`📚 共提取 ${rules.length} 条规则/提示\n`);

    if (rules.length === 0) {
        console.log('⚠️ 没有找到规则数据');
        return;
    }

    // 创建输出目录
    if (!fs.existsSync(config.paths.rulesAudioDir)) {
        fs.mkdirSync(config.paths.rulesAudioDir, { recursive: true });
    }

    // 检查已存在的文件
    const existingFiles = new Set(
        fs.readdirSync(config.paths.rulesAudioDir)
            .filter(f => f.endsWith('.mp3'))
            .map(f => f.replace('.mp3', ''))
    );

    const rulesToGenerate = rules.filter(r => !existingFiles.has(r.filename));
    console.log(`⏭️  已存在 ${existingFiles.size} 个，需生成 ${rulesToGenerate.length} 个\n`);

    if (rulesToGenerate.length === 0) {
        console.log('✅ 所有规则语音已生成完毕！');
        return;
    }

    if (dryRun) {
        console.log('🔍 Dry run 模式，显示前 10 个待生成:');
        rulesToGenerate.slice(0, 10).forEach(r => console.log(`  - ${r.filename}: ${r.text.substring(0, 30)}...`));
        return;
    }

    // 获取 access token
    console.log('🔐 获取 Google Cloud 认证...');
    const accessToken = await getAccessToken();
    console.log('✅ 认证成功\n');

    // 批量生成（中文语音请求较慢，减少并发）
    console.log('🎵 开始生成语音...\n');

    let completed = 0;
    let failed = 0;
    const startTime = Date.now();
    const failedItems = [];

    // 分批处理
    for (let i = 0; i < rulesToGenerate.length; i += 3) {
        const batch = rulesToGenerate.slice(i, i + 3);

        const promises = batch.map(async (rule) => {
            try {
                const audioBuffer = await synthesizeSpeech(
                    rule.text,
                    accessToken,
                    config.chineseVoice,
                    config.chineseAudioConfig
                );
                const outputPath = path.join(config.paths.rulesAudioDir, `${rule.filename}.mp3`);
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
        if (i + 3 < rulesToGenerate.length) {
            await new Promise(r => setTimeout(r, 1500));
        }
    }

    console.log('\n');
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ 完成！成功: ${completed}, 失败: ${failed}`);
    console.log(`⏱️  耗时: ${totalTime}s`);
    console.log(`📁 音频保存在: ${config.paths.rulesAudioDir}`);

    if (failedItems.length > 0) {
        console.log('\n❌ 失败项目:');
        failedItems.forEach(item => console.log(`  - ${item.filename}: ${item.error}`));
    }
}

module.exports = { run };
