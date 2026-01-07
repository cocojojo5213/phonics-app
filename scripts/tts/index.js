#!/usr/bin/env node
/**
 * Phonics TTS 统一工具
 * 
 * 功能：
 *   - 生成单词音频
 *   - 生成规则讲解音频
 *   - 生成例句音频
 *   - 打包音频为 bundle
 * 
 * 用法：
 *   node scripts/tts words     # 生成单词音频
 *   node scripts/tts rules     # 生成规则讲解音频
 *   node scripts/tts sentences # 生成例句音频
 *   node scripts/tts bundle    # 打包音频为 JSON bundle
 *   node scripts/tts all       # 执行全部
 *   node scripts/tts --help    # 显示帮助
 */

const fs = require('fs');
const path = require('path');

// 子命令模块
const commands = {
    words: require('./generate-words'),
    rules: require('./generate-rules'),
    sentences: require('./generate-sentences'),
    bundle: require('./bundle-audio'),
};

// 帮助信息
function showHelp() {
    console.log(`
🎤 Phonics TTS 工具

用法：
  node scripts/tts <command> [options]

命令：
  words      生成单词音频（英文女声）
  rules      生成规则讲解音频（中文女声）
  sentences  生成例句音频（英文女声）
  bundle     打包音频为 JSON bundle（用于静态站）
  all        依次执行 words -> rules -> sentences -> bundle

选项：
  --help     显示帮助
  --dry-run  只显示要做什么，不实际执行

输出目录：
  音频生成到 phonics-static/audio/
  Bundle 生成到 phonics-static/bundles/

配置：
  密钥文件: phonics-app/google-tts-key.json
`);
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === '--help' || command === '-h') {
        showHelp();
        return;
    }

    if (command === 'all') {
        console.log('🎤 执行全部 TTS 任务\n');
        console.log('=====================================\n');

        for (const cmd of ['words', 'rules', 'sentences', 'bundle']) {
            console.log(`\n>>> ${cmd.toUpperCase()} <<<\n`);
            await commands[cmd].run(args.slice(1));
        }

        console.log('\n=====================================');
        console.log('✅ 全部完成！');
        return;
    }

    if (commands[command]) {
        await commands[command].run(args.slice(1));
    } else {
        console.error(`❌ 未知命令: ${command}`);
        console.log('使用 --help 查看可用命令');
    }
}

main().catch(err => {
    console.error('❌ 错误:', err.message);
    process.exit(1);
});
