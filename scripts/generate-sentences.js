/**
 * 例句生成脚本 - 使用 Vertex AI Gemini 2.0 Flash
 * 
 * 为核心 Phonics 词生成简单例句 + 中文翻译
 * 
 * 使用方法：
 * 1. 设置环境变量 GOOGLE_PROJECT_ID
 * 2. 运行 gcloud auth application-default login
 * 3. node scripts/generate-sentences.js
 * 
 * 或使用 API Key：
 * GOOGLE_API_KEY=xxx node scripts/generate-sentences.js
 */

const fs = require('fs');
const path = require('path');

// ============ 配置 ============
const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'your-project-id';
const LOCATION = 'us-central1';
const MODEL = 'gemini-2.0-flash-001';
const API_KEY = process.env.GOOGLE_API_KEY || '';

const DATA_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(DATA_DIR, 'sentences.json');
const PROGRESS_FILE = path.join(DATA_DIR, 'sentences-progress.json');

const BATCH_SIZE = 50;  // 每次请求处理的词数
const DELAY_MS = 300;   // 请求间隔（毫秒）

// ============ 从 phonicsData.js 提取核心词 ============
function extractCoreWords() {
    const phonicsDataPath = path.join(DATA_DIR, 'phonicsData.js');
    const phonicsDataContent = fs.readFileSync(phonicsDataPath, 'utf8');

    // 简单解析：提取所有 word: 'xxx' 的值
    const wordMatches = phonicsDataContent.match(/word:\s*['"]([^'"]+)['"]/g) || [];
    const coreWords = new Set();

    for (const match of wordMatches) {
        const word = match.match(/word:\s*['"]([^'"]+)['"]/)[1];
        coreWords.add(word.toLowerCase());
    }

    return Array.from(coreWords);
}

// ============ 从 ai-words.json 提取筛选后的词 ============
function extractFilteredWords() {
    const aiWordsPath = path.join(DATA_DIR, 'ai-words.json');
    if (!fs.existsSync(aiWordsPath)) {
        console.log('⚠️ ai-words.json 不存在，跳过');
        return [];
    }

    const aiWords = JSON.parse(fs.readFileSync(aiWordsPath, 'utf8'));
    const filteredWords = new Set();

    for (const pattern in aiWords) {
        for (const item of aiWords[pattern]) {
            const word = item.word.toLowerCase();

            // 筛选条件：
            // 1. 词长 <= 8 字母
            // 2. 音节数 <= 3（简单估算：元音字母数）
            if (word.length > 8) continue;

            const vowelCount = (word.match(/[aeiou]/gi) || []).length;
            if (vowelCount > 3) continue;

            filteredWords.add(word);
        }
    }

    return Array.from(filteredWords);
}

// ============ Gemini API 调用 ============
async function callGemini(prompt) {
    if (API_KEY) {
        // 使用 API Key
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 8192,
                    }
                })
            }
        );

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message);
        }
        return data.candidates[0].content.parts[0].text;
    } else {
        // 使用 gcloud 认证
        const { GoogleAuth } = require('google-auth-library');
        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        const response = await fetch(
            `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 8192,
                    }
                })
            }
        );

        const data = await response.json();
        if (data.error) {
            throw new Error(JSON.stringify(data.error));
        }
        return data.candidates[0].content.parts[0].text;
    }
}

// ============ 生成例句 ============
async function generateSentences(words) {
    const prompt = `为以下英语单词各生成1个简单例句：
要求：
1. 句子非常简短（4-8个单词）
2. 适合儿童/初学者
3. 包含中文翻译
4. 只用常见词
5. 句子要自然、生活化
6. 返回纯 JSON，不要markdown代码块

单词：${words.join(', ')}

返回格式（严格JSON）：
{"word1": {"en": "The cat is sleeping.", "zh": "猫在睡觉。"}, "word2": {...}}`;

    const response = await callGemini(prompt);

    // 清理响应，提取 JSON
    let jsonStr = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

    // 尝试解析 JSON
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error('JSON 解析失败:', e.message);
        console.error('原始响应:', response.substring(0, 200));
        return {};
    }
}

// ============ 主程序 ============
async function main() {
    console.log('📖 例句生成脚本');
    console.log('================\n');

    // 1. 提取核心词
    const phonicsWords = extractCoreWords();
    const filteredWords = extractFilteredWords();

    // 合并并去重
    const allCoreWords = [...new Set([...phonicsWords, ...filteredWords])];

    // 限制词数（测试时可以减少）
    const wordLimit = parseInt(process.env.WORD_LIMIT) || 8000;
    const wordList = allCoreWords.slice(0, wordLimit);

    console.log(`📚 核心词库: ${wordList.length} 个词`);
    console.log(`  - phonicsData.js 例词: ${phonicsWords.length}`);
    console.log(`  - 筛选后的 AI 扩展词: ${filteredWords.length}`);
    console.log('');

    // 2. 加载已有结果和进度
    let results = {};
    let startIndex = 0;

    if (fs.existsSync(OUTPUT_FILE)) {
        results = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
        console.log(`📁 加载已有例句: ${Object.keys(results).length} 个`);
    }

    if (fs.existsSync(PROGRESS_FILE)) {
        const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
        startIndex = progress.lastIndex || 0;
        console.log(`📍 从上次进度继续: ${startIndex}`);
    }

    // 过滤掉已有例句的词
    const pendingWords = wordList.filter(w => !results[w]);
    console.log(`⏳ 待生成: ${pendingWords.length} 个词\n`);

    if (pendingWords.length === 0) {
        console.log('✅ 所有例句已生成完毕！');
        return;
    }

    // 3. 批量生成
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < pendingWords.length; i += BATCH_SIZE) {
        const batch = pendingWords.slice(i, i + BATCH_SIZE);
        const progress = `[${i + 1}-${Math.min(i + BATCH_SIZE, pendingWords.length)}/${pendingWords.length}]`;

        console.log(`${progress} 生成中: ${batch.slice(0, 5).join(', ')}...`);

        try {
            const batchResults = await generateSentences(batch);
            const newCount = Object.keys(batchResults).length;

            Object.assign(results, batchResults);
            successCount += newCount;

            console.log(`  ✅ 成功 ${newCount} 个`);

            // 每批保存一次
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
            fs.writeFileSync(PROGRESS_FILE, JSON.stringify({
                lastIndex: i + BATCH_SIZE,
                timestamp: new Date().toISOString()
            }));

            // 延迟防止限速
            await new Promise(r => setTimeout(r, DELAY_MS));

        } catch (err) {
            console.error(`  ❌ 批次失败: ${err.message}`);
            failCount += batch.length;

            // 失败后等待更长时间
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    // 4. 完成
    console.log('\n================');
    console.log(`✅ 完成！`);
    console.log(`  - 成功: ${successCount} 个词`);
    console.log(`  - 失败: ${failCount} 个词`);
    console.log(`  - 总计: ${Object.keys(results).length} 个例句`);
    console.log(`📁 输出文件: ${OUTPUT_FILE}`);

    // 清理进度文件
    if (fs.existsSync(PROGRESS_FILE)) {
        fs.unlinkSync(PROGRESS_FILE);
    }
}

// 运行
main().catch(err => {
    console.error('❌ 脚本错误:', err);
    process.exit(1);
});
