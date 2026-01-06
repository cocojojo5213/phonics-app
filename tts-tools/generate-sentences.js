/**
 * 生成例句数据 (Vertex AI 版)
 * 
 * 使用 Google Cloud Vertex AI Gemini 为核心词生成简单例句 + 中文翻译
 */

const fs = require('fs');
const path = require('path');
const { VertexAI } = require('@google-cloud/vertexai');
const config = require('./config');

// 配置
const PHONICS_DATA_PATH = path.join(__dirname, 'data', 'phonicsData.js');
const AI_WORDS_PATH = path.join(__dirname, 'data', 'ai-words.json');
const OUTPUT_FILE = path.join(__dirname, 'output', 'sentences.json');

const MODEL = 'gemini-2.0-flash';
const BATCH_SIZE = 50;
const DELAY_MS = 500;

// 敏感词过滤列表（污言秽语、不适合儿童的词）
const BLOCKED_WORDS = [
    // 脏话
    'fuck', 'shit', 'damn', 'hell', 'ass', 'bitch', 'bastard', 'crap',
    'dick', 'cock', 'pussy', 'whore', 'slut', 'fag', 'nigger', 'retard',
    // 暴力相关
    'kill', 'die', 'dead', 'murder', 'blood', 'gun', 'shoot', 'stab', 'knife',
    // 恐怖/负面
    'hate', 'ugly', 'stupid', 'idiot', 'dumb', 'fool', 'loser', 'fat', 'devil',
    // 不适合儿童
    'sex', 'naked', 'drunk', 'alcohol', 'beer', 'wine', 'drug', 'smoke', 'cigarette',
    'gambling', 'casino', 'porn', 'adult',
    // 其他敏感
    'covid', 'virus', 'disease', 'cancer', 'war', 'bomb', 'terrorist', 'suicide'
];

// 检查句子是否包含敏感词
function containsBlockedWords(text) {
    const lowerText = text.toLowerCase();
    for (const word of BLOCKED_WORDS) {
        // 使用单词边界匹配，避免误判（如 "glass" 不应该匹配 "ass"）
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        if (regex.test(lowerText)) {
            return word;
        }
    }
    return null;
}

// 初始化 Vertex AI
const vertexAI = new VertexAI({
    project: config.vertexServiceAccount.project_id,
    location: 'us-central1', // Vertex AI 常用区域
    googleAuthOptions: {
        credentials: config.vertexServiceAccount
    }
});

const generativeModel = vertexAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
    }
});

// 从 phonicsData.js 提取核心词
function extractCoreWords() {
    const content = fs.readFileSync(PHONICS_DATA_PATH, 'utf8');
    const wordMatches = content.match(/word:\s*['"]([^'"]+)['"]/g) || [];
    const words = new Set();
    for (const match of wordMatches) {
        const word = match.match(/word:\s*['"]([^'"]+)['"]/)[1];
        words.add(word.toLowerCase());
    }
    return Array.from(words);
}

// 从 ai-words.json 提取词
function extractFilteredWords() {
    if (!fs.existsSync(AI_WORDS_PATH)) return [];
    const aiWords = JSON.parse(fs.readFileSync(AI_WORDS_PATH, 'utf8'));
    const words = new Set();
    for (const pattern in aiWords) {
        for (const item of aiWords[pattern]) {
            const word = item.word.toLowerCase();
            if (word.length > 8) continue;
            words.add(word);
        }
    }
    return Array.from(words);
}

// 调用 Vertex AI
async function generateSentences(words) {
    const prompt = `为以下英语单词各生成1个简单例句：

【整体风格 - 阳光积极乐观】
🌞 句子必须传递快乐、温暖、积极向上的情感
🌈 场景要美好：玩耍、探索、学习、家庭亲情、友谊、自然美景
💪 使用鼓励性语言：I can! / Let's! / Wow! / Yay! / Great!
❤️ 强调爱、分享、帮助、感谢、快乐

【核心要求】
1. 句子简短：4-8个单词
2. 语法100%正确（冠词a/an/the、介词in/on/at不能省略）
3. 适合4-8岁儿童，内容纯真美好
4. 只用常见简单词汇

【句型多样化 - 均匀分布，禁止重复句式】
- 20% 鼓励动作：I can run fast! / Let's play together!
- 20% 快乐问句：Do you like ice cream? / Can we play now?
- 20% 惊喜感叹：Wow, so beautiful! / Yay, I did it!
- 20% 爱与分享：I love my family. / Thank you, Mom!
- 20% 美好描述：The rainbow is pretty. / Birds sing happily.

【禁止内容】
❌ 禁止 "The X is very Y" 单调句式
❌ 禁止任何负面词：sad, cry, hurt, bad, wrong, ugly, hate, angry, scary
❌ 禁止无聊描述，每句都要有情感或动作

【中文翻译】
- 翻译活泼可爱，符合儿童口吻

单词：${words.join(', ')}

返回纯JSON（不要markdown）：
{"cat": {"en": "I love my fluffy cat!", "zh": "我爱我的毛茸茸的猫！"}, "sun": {"en": "The sun makes me happy!", "zh": "太阳让我开心！"}}`;

    try {
        const result = await generativeModel.generateContent(prompt);
        const response = result.response;
        const text = response.candidates[0].content.parts[0].text;

        // 清理可能存在的 markdown 代码块
        let jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(jsonStr);

        // 过滤敏感内容
        const filtered = {};
        let blockedCount = 0;
        for (const [word, data] of Object.entries(parsed)) {
            const blockedWord = containsBlockedWords(data.en);
            if (blockedWord) {
                console.log(`  ⚠️ 过滤 "${word}": 包含敏感词 "${blockedWord}"`);
                blockedCount++;
            } else {
                filtered[word] = data;
            }
        }
        if (blockedCount > 0) {
            console.log(`  🚫 已过滤 ${blockedCount} 个包含敏感词的句子`);
        }
        return filtered;
    } catch (e) {
        console.error('AI 生成失败:', e.message);
        return {};
    }
}

async function main() {
    console.log('📝 例句生成器 (Vertex AI)\n');

    if (!fs.existsSync(path.dirname(OUTPUT_FILE))) {
        fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    }

    const phonicsWords = extractCoreWords();
    const aiFilteredWords = extractFilteredWords();
    const allWords = [...new Set([...phonicsWords, ...aiFilteredWords])];
    console.log(`合计: ${allWords.length} 词\n`);

    let results = {};
    if (fs.existsSync(OUTPUT_FILE)) {
        results = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    }

    const pendingWords = allWords.filter(w => !results[w]);
    console.log(`⏳ 待生成: ${pendingWords.length} 个词\n`);

    for (let i = 0; i < pendingWords.length; i += BATCH_SIZE) {
        const batch = pendingWords.slice(i, i + BATCH_SIZE);
        console.log(`[${i + 1}-${Math.min(i + BATCH_SIZE, pendingWords.length)}/${pendingWords.length}] 生成中...`);

        const batchResults = await generateSentences(batch);
        const newCount = Object.keys(batchResults).length;

        Object.assign(results, batchResults);
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

        console.log(`  ✅ 成功 ${newCount} 个`);
        await new Promise(r => setTimeout(r, DELAY_MS));
    }

    console.log('\n✅ 全部例句生成完毕！');
}

main().catch(console.error);
