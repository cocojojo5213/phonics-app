/**
 * 清理孤立资源
 * 
 * 功能：
 * 1. 读取清洗后的词库 (ai-words-analyzed.json 或 ai-words.json)
 * 2. 删除不在词库中的例句
 * 3. 删除不在词库中的音频文件（可选）
 * 
 * 用法：
 *   node scripts/cleanup-orphans.js [--dry-run] [--delete-audio]
 */

const fs = require('fs');
const path = require('path');

// ============ 配置 ============
const CONFIG = {
    // 词库路径（优先使用分析后的，没有则用原始的）
    analyzedWordsFile: path.join(__dirname, '..', 'data', 'ai-words-analyzed.json'),
    originalWordsFile: path.join(__dirname, '..', 'data', 'ai-words.json'),

    // 例句文件
    sentencesFile: path.join(__dirname, '..', 'data', 'sentences.json'),

    // 音频目录（静态站）
    audioDir: path.join(__dirname, '..', '..', 'phonics-static', 'audio'),
    sentencesAudioDir: path.join(__dirname, '..', '..', 'phonics-static', 'audio', 'sentences'),
};

// ============ 主程序 ============
async function main() {
    console.log('🧹 清理孤立资源');
    console.log('================\n');

    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const deleteAudio = args.includes('--delete-audio');

    if (dryRun) {
        console.log('📋 Dry-run 模式，只显示要删除的内容\n');
    }

    // 1. 读取词库，提取所有单词
    console.log('📖 读取词库...');

    let wordsFile = CONFIG.analyzedWordsFile;
    if (!fs.existsSync(wordsFile)) {
        wordsFile = CONFIG.originalWordsFile;
        console.log('  使用原始词库（未分析）');
    } else {
        console.log('  使用分析后的词库');
    }

    const wordsData = JSON.parse(fs.readFileSync(wordsFile, 'utf8'));

    // 提取所有单词
    const validWords = new Set();
    for (const pattern in wordsData) {
        for (const item of wordsData[pattern]) {
            if (item.word) {
                validWords.add(item.word.toLowerCase());
            }
        }
    }

    console.log(`  词库单词: ${validWords.size} 个\n`);

    // 2. 清理例句
    console.log('📝 检查例句...');

    if (fs.existsSync(CONFIG.sentencesFile)) {
        const sentences = JSON.parse(fs.readFileSync(CONFIG.sentencesFile, 'utf8'));
        const originalCount = Object.keys(sentences).length;

        const orphanSentences = [];
        const cleanedSentences = {};

        for (const word in sentences) {
            if (validWords.has(word.toLowerCase())) {
                cleanedSentences[word] = sentences[word];
            } else {
                orphanSentences.push(word);
            }
        }

        console.log(`  原有例句: ${originalCount} 条`);
        console.log(`  孤立例句: ${orphanSentences.length} 条`);

        if (orphanSentences.length > 0) {
            console.log(`  示例: ${orphanSentences.slice(0, 5).join(', ')}...`);

            if (!dryRun) {
                fs.writeFileSync(CONFIG.sentencesFile, JSON.stringify(cleanedSentences, null, 2));
                console.log(`  ✅ 已清理例句`);
            }
        } else {
            console.log('  ✅ 例句已是干净的');
        }
    } else {
        console.log('  ⚠️ 未找到例句文件');
    }

    // 3. 清理音频（可选）
    if (deleteAudio) {
        console.log('\n🔊 检查音频文件...');

        let deletedCount = 0;
        let keptCount = 0;

        // 单词音频
        if (fs.existsSync(CONFIG.audioDir)) {
            const audioFiles = fs.readdirSync(CONFIG.audioDir)
                .filter(f => f.endsWith('.mp3') && !f.startsWith('_'));

            for (const file of audioFiles) {
                const word = file.replace('.mp3', '').toLowerCase();

                if (!validWords.has(word)) {
                    deletedCount++;
                    if (!dryRun) {
                        fs.unlinkSync(path.join(CONFIG.audioDir, file));
                    }
                    if (deletedCount <= 10) {
                        console.log(`  🗑️ ${file}`);
                    }
                } else {
                    keptCount++;
                }
            }
        }

        // 例句音频
        if (fs.existsSync(CONFIG.sentencesAudioDir)) {
            const sentenceFiles = fs.readdirSync(CONFIG.sentencesAudioDir)
                .filter(f => f.endsWith('.mp3'));

            for (const file of sentenceFiles) {
                const word = file.replace('.mp3', '').toLowerCase();

                if (!validWords.has(word)) {
                    deletedCount++;
                    if (!dryRun) {
                        fs.unlinkSync(path.join(CONFIG.sentencesAudioDir, file));
                    }
                }
            }
        }

        console.log(`  保留音频: ${keptCount} 个`);
        console.log(`  删除音频: ${deletedCount} 个`);

        if (!dryRun && deletedCount > 0) {
            console.log('  ✅ 已清理音频');
        }
    } else {
        console.log('\n💡 提示：使用 --delete-audio 可同时清理音频文件');
    }

    // 统计
    console.log('\n================');
    console.log('✅ 清理完成！');

    if (dryRun) {
        console.log('\n⚠️ 这是 dry-run 模式，实际未删除任何内容');
        console.log('  去掉 --dry-run 参数来真正执行');
    }
}

main().catch(err => {
    console.error('❌ 错误:', err.message);
    process.exit(1);
});
