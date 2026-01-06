# Vertex AI $300 额度使用计划

> 创建时间：2026-01-06
> 目标：用 Vertex AI 为 Phonics App 生成高质量学习资源

---

## 📊 资源概览

### 词库分层策略

| 层级 | 数量 | 生成例句 | 说明 |
|------|------|----------|------|
| **核心 Phonics 词** | 5k-8k | ✅ 每词1句 | CVC、Magic-E、常见组合等基础词 |
| **扩展词** | ~20k | ⚠️ 可选 | 符合 phonics 规则的进阶词 |
| **长尾/高级词** | 80k+ | ❌ 不生成 | 抽象词、专业词、不适合初学者 |

### 资源生成计划

| 资源 | 数量 | 说明 |
|------|------|------|
| 核心词例句 | 5k-8k 句 | 只为核心词生成 |
| 教学规则 | ~75 条 | rule + tip 字段 |
| 舌位动图 | ~45 个 | 每个音素一个 GIF |
| 规则讲解音频 | ~75 个 | 中文 TTS |

---

## 🎯 任务一：生成例句（核心词）

### 目标
只为 **核心 Phonics 词（5k-8k）** 生成 **1 个简单例句** + 中文翻译

### 核心词筛选标准
```
✅ 包含：
- phonicsData.js 中的所有例词
- CVC 结构词（cat, bed, sit, dog, cup）
- Magic-E 词（cake, bike, home）
- 常见元音组合词（rain, boat, bee）
- 辅音组合词（ship, chip, think）
- 高频词（Dolch/Fry 词表）

❌ 排除：
- 抽象词（democracy, philosophy）
- 专业术语（chromosome, algorithm）
- 不规则发音词（yacht, colonel）
- 多音节复杂词（5+ 音节）
```

### 输出格式
```json
{
  "cat": { "en": "The cat is sleeping.", "zh": "猫在睡觉。" },
  "cake": { "en": "I like chocolate cake.", "zh": "我喜欢巧克力蛋糕。" },
  "rain": { "en": "It is raining outside.", "zh": "外面在下雨。" }
}
```

### 技术方案

#### 1. 使用模型
- **Gemini 2.0 Flash** - 便宜、快速
- 定价：约 $0.10 / 1M input tokens, $0.40 / 1M output tokens

#### 2. 批量策略
- 每次请求处理 50-100 个单词
- 估算：8k 词 ÷ 50 = 160 次请求
- 并发控制：5-10 个并发，防止限速

#### 3. Prompt 设计
```
为以下英语单词各生成1个简单例句，要求：
1. 句子非常简短（4-8个单词）
2. 适合儿童/初学者
3. 包含中文翻译
4. 只使用常见词
5. 句子要自然、生活化

返回JSON格式：
{"word": {"en": "...", "zh": "..."}}

单词列表：
cat, dog, cake, bike, ...
```

#### 4. 成本估算
```
核心词：8,000 词
每次请求：50 词
总请求数：160 次

输入：~50词/请求 × 100 chars = 5,000 chars ≈ 1,500 tokens
输出：~50词 × 1句 × 40 chars = 2,000 chars ≈ 600 tokens
每次请求：~2,100 tokens

总 tokens：~336k tokens
成本：约 $0.05 - $0.20（非常便宜！）
```

### 脚本示例

```javascript
// scripts/generate-sentences.js
// 只为核心 Phonics 词生成例句

const fs = require('fs');
const { GoogleAuth } = require('google-auth-library');

// Vertex AI 配置
const PROJECT_ID = 'your-project-id';
const LOCATION = 'us-central1';
const MODEL = 'gemini-2.0-flash-001';

// ============ 核心词筛选 ============

// 从 phonicsData.js 提取所有例词（这些是最核心的）
const phonicsData = require('../data/phonicsData.js');

function extractCoreWords() {
    const coreWords = new Set();
    const categories = ['letters', 'short_vowels', 'long_vowels', 
                        'consonant_blends', 'r_controlled', 'other_vowels'];
    
    for (const cat of categories) {
        if (!phonicsData[cat]) continue;
        for (const item of phonicsData[cat]) {
            if (!item.words) continue;
            for (const wordObj of item.words) {
                coreWords.add(wordObj.word.toLowerCase());
            }
        }
    }
    
    return Array.from(coreWords);
}

// 从 ai-words.json 提取筛选后的核心词
function extractFilteredWords() {
    const aiWords = JSON.parse(fs.readFileSync('./data/ai-words.json', 'utf8'));
    const coreWords = new Set();
    
    for (const pattern in aiWords) {
        for (const item of aiWords[pattern]) {
            const word = item.word.toLowerCase();
            
            // 筛选条件：
            // 1. 词长 <= 8 字母（排除超长词）
            // 2. 音节数 <= 3（简单估算：元音字母数）
            // 3. 排除常见抽象词
            
            if (word.length > 8) continue;
            
            const vowelCount = (word.match(/[aeiou]/gi) || []).length;
            if (vowelCount > 3) continue;
            
            coreWords.add(word);
        }
    }
    
    return Array.from(coreWords);
}

// 合并核心词库
const phonicsWords = extractCoreWords();
const filteredWords = extractFilteredWords();
const allCoreWords = [...new Set([...phonicsWords, ...filteredWords])];

// 限制在 8000 词以内
const wordList = allCoreWords.slice(0, 8000);
console.log(`📚 核心词库: ${wordList.length} 个词`);
console.log(`  - phonicsData.js 例词: ${phonicsWords.length}`);
console.log(`  - 筛选后的 AI 扩展词: ${filteredWords.length}`);

// ============ 生成例句 ============

const BATCH_SIZE = 50;
const results = {};

async function generateSentences(words) {
    const prompt = `为以下英语单词各生成1个简单例句：
要求：
1. 句子非常简短（4-8个单词）
2. 适合儿童/初学者
3. 包含中文翻译
4. 只用常见词
5. 返回纯 JSON

单词：${words.join(', ')}

格式：{"word": {"en": "...", "zh": "..."}}`;

    const response = await callGemini(prompt);
    return JSON.parse(response.replace(/```json\n?|```\n?/g, '').trim());
}

async function callGemini(prompt) {
    // 方式1：使用 gcloud 认证
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
    return data.candidates[0].content.parts[0].text;
}

// 主程序
async function main() {
    for (let i = 0; i < wordList.length; i += BATCH_SIZE) {
        const batch = wordList.slice(i, i + BATCH_SIZE);
        console.log(`处理 ${i + 1} - ${i + batch.length} / ${wordList.length}`);
        
        try {
            const batchResults = await generateSentences(batch);
            Object.assign(results, batchResults);
            
            // 每100批保存一次
            if ((i / BATCH_SIZE) % 100 === 0) {
                fs.writeFileSync('./data/sentences.json', JSON.stringify(results, null, 2));
            }
            
            // 延迟防止限速
            await new Promise(r => setTimeout(r, 200));
        } catch (err) {
            console.error(`批次 ${i} 失败:`, err.message);
        }
    }
    
    // 最终保存
    fs.writeFileSync('./data/sentences.json', JSON.stringify(results, null, 2));
    console.log('✅ 完成！');
}

main();
```

---

## 🎯 任务二：例句 TTS 音频

### 目标
为所有例句生成英语语音

### 技术方案

#### 1. TTS 选择
- **Google Cloud TTS Chirp3-HD** - 最自然（Vertex AI 额度可用）
- **Edge TTS** - 免费备选

#### 2. 成本估算（核心词）
```
核心词：8,000 词
平均句子长度：30 字符

用 Google TTS:
8,000 词 × 30 字符 = 240,000 字符
Chirp3-HD 定价：$0.000016/字符
成本：~$3.84

用 Edge TTS：
成本：$0（免费）
```

#### 3. 脚本思路
```javascript
// generate-sentence-audio.js
const sentences = require('./data/sentences.json');

for (const word in sentences) {
    for (let i = 0; i < sentences[word].sentences.length; i++) {
        const sentence = sentences[word].sentences[i].en;
        const filename = `${word}_${i + 1}.mp3`;
        
        // 检查是否已存在
        if (fs.existsSync(`./audio/sentences/${filename}`)) continue;
        
        // 生成 TTS
        const audio = await synthesize(sentence);
        fs.writeFileSync(`./audio/sentences/${filename}`, audio);
    }
}
```

---

## 🎯 任务三：教学规则讲解音频

### 目标
为 phonicsData.js 中的 rule + tip 生成**中文**语音讲解

### 数据来源
```javascript
// phonicsData.js 中的规则
{
    pattern: 'a', pronunciation: '/æ/',
    rule: '字母A的短音：嘴巴张大，舌头放平，发"啊"和"诶"之间的音。',
    tip: 'A是元音字母，这里学的是它的短音。长音会在Magic-E部分学习。',
}
```

### 技术方案

#### 1. TTS 选择（中文）
- **Edge TTS** - 免费，中文质量不错
- 声音：`zh-CN-XiaoxiaoNeural`（女声）或 `zh-CN-YunxiNeural`（男声）

#### 2. 脚本思路
```javascript
// generate-rule-audio.js
const phonicsData = require('./data/phonicsData.js');

const categories = ['letters', 'short_vowels', 'long_vowels', 
                   'consonant_blends', 'r_controlled', 'other_vowels'];

for (const cat of categories) {
    for (const item of phonicsData[cat]) {
        const text = `${item.rule} ${item.tip || ''}`;
        const filename = `rule_${item.pattern}.mp3`;
        
        // Edge TTS 生成中文语音
        await generateEdgeTTS(text, filename, 'zh-CN-XiaoxiaoNeural');
    }
}
```

---

## 🎯 任务四：发音舌位图 / 动图

### 目标
为每个发音模式生成**舌位示意图**，展示发音时舌头、嘴唇、牙齿的位置

### 需要生成的音素（约 45 个）

| 类别 | 音素 |
|------|------|
| 元音 | /æ/, /ɛ/, /ɪ/, /ɒ/, /ʌ/, /eɪ/, /iː/, /aɪ/, /oʊ/, /juː/, /aʊ/, /ɔɪ/, /ɔː/, /uː/ |
| 辅音 | /b/, /p/, /d/, /t/, /g/, /k/, /f/, /v/, /s/, /z/, /ʃ/, /tʃ/, /dʒ/, /θ/, /ð/, /h/, /m/, /n/, /ŋ/, /l/, /r/, /w/, /j/ |
| R控制 | /ɑːr/, /ɜːr/, /ɔːr/, /ər/ |

---

### 方案 A：静态舌位图（Imagen 3）

#### 技术方案
使用 **Vertex AI Imagen 3** 生成专业的舌位示意图

#### Prompt 示例
```
Create a professional phonetics diagram showing tongue position for the English sound /æ/ (as in "cat").

Requirements:
- Side view cross-section of human mouth
- Clear anatomical labels in English
- Show tongue position highlighted in red
- Show lips, teeth, palate, uvula
- Clean, educational illustration style
- White background
- High contrast for clarity
```

#### 成本估算
```
45 个音素 × $0.04/张 = ~$2
```

#### 脚本示例
```javascript
// generate-tongue-diagrams.js
const fs = require('fs');
const { GoogleAuth } = require('google-auth-library');

const PROJECT_ID = 'your-project-id';
const LOCATION = 'us-central1';

// 需要生成舌位图的音素列表
const phonemes = [
    { ipa: '/æ/', name: 'short_a', example: 'cat' },
    { ipa: '/ɛ/', name: 'short_e', example: 'bed' },
    { ipa: '/ɪ/', name: 'short_i', example: 'sit' },
    { ipa: '/ɒ/', name: 'short_o', example: 'hot' },
    { ipa: '/ʌ/', name: 'short_u', example: 'cup' },
    { ipa: '/b/', name: 'b', example: 'bag' },
    { ipa: '/p/', name: 'p', example: 'pen' },
    { ipa: '/θ/', name: 'th_voiceless', example: 'think' },
    { ipa: '/ð/', name: 'th_voiced', example: 'this' },
    { ipa: '/ʃ/', name: 'sh', example: 'ship' },
    { ipa: '/tʃ/', name: 'ch', example: 'chip' },
    { ipa: '/ŋ/', name: 'ng', example: 'sing' },
    // ... 更多音素
];

async function generateTongueDiagram(phoneme) {
    const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const prompt = `Create a professional phonetics diagram showing tongue position for the English sound ${phoneme.ipa} (as in "${phoneme.example}").

Requirements:
- Side view cross-section of human mouth and throat
- Clear anatomical structure: tongue, lips, teeth, hard palate, soft palate, uvula
- Tongue position highlighted in red/orange
- Arrows showing airflow direction
- Clean, educational medical illustration style
- White background
- Label: "${phoneme.ipa}" in the corner`;

    const response = await fetch(
        `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/imagen-3.0-generate-001:predict`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                instances: [{ prompt }],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: '1:1',
                    outputMimeType: 'image/png',
                }
            })
        }
    );

    const data = await response.json();
    const imageBase64 = data.predictions[0].bytesBase64Encoded;
    
    fs.writeFileSync(
        `./public/images/tongue/${phoneme.name}.png`,
        Buffer.from(imageBase64, 'base64')
    );
    
    console.log(`✅ ${phoneme.ipa} -> ${phoneme.name}.png`);
}

async function main() {
    // 创建输出目录
    if (!fs.existsSync('./public/images/tongue')) {
        fs.mkdirSync('./public/images/tongue', { recursive: true });
    }

    for (const phoneme of phonemes) {
        try {
            await generateTongueDiagram(phoneme);
            await new Promise(r => setTimeout(r, 1000)); // 延迟防止限速
        } catch (err) {
            console.error(`❌ ${phoneme.ipa} 失败:`, err.message);
        }
    }
}

main();
```

---

### 方案 B：GIF 舌位动图（推荐 ⭐）

#### ✅ 选择理由
- 自动循环播放，无需交互
- 兼容性极好（所有浏览器）
- 文件体积适中
- 实现简单

#### 思路
1. 用 **Imagen 3** 生成 3 帧静态图（准备→发音→释放）
2. 用 **GIFEncoder** 合成 GIF 动图
3. 可选：同时生成 **WebP 动图**（更小）

---

```javascript
// scripts/generate-tongue-animation.js
// 从 phonicsData.js 读取教学规则，生成舌位动图

const fs = require('fs');
const path = require('path');
const GIFEncoder = require('gifencoder');
const { createCanvas, loadImage } = require('canvas');
const { GoogleAuth } = require('google-auth-library');

// ============ 配置 ============
const PROJECT_ID = 'your-project-id';
const LOCATION = 'us-central1';
const OUTPUT_DIR = './public/images/tongue';
const TEMP_DIR = './temp/tongue-frames';

// ============ 从 phonicsData.js 读取数据 ============
const phonicsData = require('../data/phonicsData.js');

// 发音口型描述（来自 phonics-rules.md）
const mouthDescriptions = {
    // 元音口型
    '/æ/': '嘴巴张大，像要咬苹果 | mouth wide open, tongue low and front, like biting an apple',
    '/ɛ/': '嘴微张，舌头放平 | mouth slightly open, tongue flat and mid-front',
    '/ɪ/': '嘴型扁平，像微笑 | mouth spread like smiling, tongue high-front',
    '/ɒ/': '嘴巴张圆 | mouth round and open, tongue low-back',
    '/ʌ/': '嘴微张，放松 | mouth slightly open and relaxed, tongue mid-central',
    '/eɪ/': '从/e/滑向/ɪ/ | tongue moves from mid to high front, mouth spreads',
    '/aɪ/': '从/a/滑向/ɪ/ | tongue moves from low open to high front',
    '/oʊ/': '从/o/滑向/ʊ/ | lips round then close, tongue moves back',
    '/aʊ/': '从/a/滑向/ʊ/ | mouth opens wide then rounds, tongue moves back',
    '/ɔɪ/': '从/ɔ/滑向/ɪ/ | lips start round then spread, tongue moves front',
    '/iː/': '嘴型扁平，舌头高前位 | mouth spread, tongue high and front',
    '/uː/': '嘴巴收圆，舌头后缩 | lips rounded, tongue high and back',
    '/juː/': '先发/j/再到/uː/ | starts with tongue high front, moves to rounded back',
    '/ɔː/': '嘴巴张圆 | mouth round and open',
    
    // 辅音口型
    '/b/': '双唇紧闭后爆破，声带振动 | lips pressed together then released, vocal cords vibrating',
    '/p/': '双唇紧闭后爆破，不振动 | lips pressed together then released with puff, no vibration',
    '/d/': '舌尖抵上齿龈后爆破，声带振动 | tongue tip against ridge then released, vibrating',
    '/t/': '舌尖抵上齿龈后爆破，不振动 | tongue tip against ridge then released, no vibration',
    '/g/': '舌根抵软腭后爆破，声带振动 | tongue back against soft palate then released',
    '/k/': '舌根抵软腭后爆破，不振动 | tongue back against soft palate then released with puff',
    '/f/': '上齿咬下唇吹气，不振动 | upper teeth on lower lip, air blowing through',
    '/v/': '上齿咬下唇，声带振动 | upper teeth on lower lip, vocal cords vibrating',
    '/s/': '舌尖接近齿龈，气流从中间出，嘶嘶声 | tongue tip near ridge, air through center, hissing',
    '/z/': '同/s/但声带振动，嗡嗡声 | same as /s/ but vibrating, buzzing sound',
    '/θ/': '舌头放在上下齿之间吹气 | tongue tip between teeth, air blowing through',
    '/ð/': '同/θ/但声带振动 | tongue tip between teeth, vibrating',
    '/ʃ/': '嘘声，舌头后缩，嘴唇略圆 | tongue pulled back and raised, lips slightly rounded',
    '/tʃ/': '像打喷嚏，先/t/再/ʃ/ | starts with /t/ then releases to /ʃ/',
    '/dʒ/': '同/tʃ/但声带振动 | same as /tʃ/ but vibrating',
    '/h/': '轻轻哈气 | gentle breath from throat, mouth open',
    '/m/': '双唇紧闭，从鼻子出气 | lips closed, air through nose',
    '/n/': '舌尖抵上齿龈，从鼻子出气 | tongue tip on ridge, air through nose',
    '/ŋ/': '舌根抵软腭，从鼻子出气 | tongue back on soft palate, air through nose',
    '/l/': '舌尖抵上齿龈，气流从两侧出 | tongue tip on ridge, air flows around sides',
    '/r/': '舌头卷起，不接触任何部位 | tongue curled back, not touching anything',
    '/w/': '双唇收圆后放开 | lips rounded then open',
    '/j/': '舌头中部抬高接近硬腭 | tongue mid-high near hard palate',
    
    // R控制元音
    '/ɑːr/': '嘴巴张开，舌头卷起 | mouth open, tongue curls back for r-color',
    '/ɜːr/': '舌头中央位置，略微卷舌 | tongue mid-central with slight curl',
    '/ɔːr/': '嘴唇圆，舌头后缩卷起 | lips round, tongue back and curled',
    '/ər/': '轻声卷舌音 | relaxed tongue with light r-color',
};

// ============ 从 phonicsData 提取音素信息 ============
function extractPhonemes() {
    const phonemes = [];
    const categories = ['letters', 'short_vowels', 'long_vowels', 'consonant_blends', 'r_controlled', 'other_vowels'];
    
    for (const cat of categories) {
        if (!phonicsData[cat]) continue;
        
        for (const item of phonicsData[cat]) {
            // 获取发音和例词
            const pronunciation = item.pronunciation;
            const example = item.words?.[0]?.word || item.pattern;
            const rule = item.rule || '';
            const tip = item.tip || '';
            
            // 获取口型描述
            const mouthDesc = mouthDescriptions[pronunciation] || '';
            
            phonemes.push({
                pattern: item.pattern,
                ipa: pronunciation,
                name: item.pattern.replace(/[^a-zA-Z0-9]/g, '_'),
                example: example,
                rule: rule,          // 来自 phonicsData.js 的教学规则
                tip: tip,            // 来自 phonicsData.js 的教学提示
                mouthDesc: mouthDesc, // 来自 phonics-rules.md 的口型描述
                category: cat,
            });
        }
    }
    
    return phonemes;
}

// ============ Imagen API 调用 ============
async function callImagen(prompt) {
    const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const response = await fetch(
        `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/imagen-3.0-generate-001:predict`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                instances: [{ prompt }],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: '1:1',
                    outputMimeType: 'image/png',
                }
            })
        }
    );

    const data = await response.json();
    if (data.predictions && data.predictions[0]) {
        return Buffer.from(data.predictions[0].bytesBase64Encoded, 'base64');
    }
    throw new Error(`Imagen API 错误: ${JSON.stringify(data)}`);
}

// ============ 生成单帧图片 ============
async function generateFrame(phoneme, stage) {
    // 使用来自 phonicsData.js 的教学规则
    const teachingInfo = phoneme.rule 
        ? `Teaching note: ${phoneme.rule}` 
        : '';
    
    const stageDescriptions = {
        preparation: 'mouth and tongue in resting neutral position, about to make the sound',
        articulation: `${phoneme.mouthDesc || 'producing the sound'}`,
        release: 'mouth returning to neutral position after making the sound',
    };

    const prompt = `Professional phonetics diagram showing the "${stage}" stage of pronouncing the English sound ${phoneme.ipa} (as in "${phoneme.example}").

Sound: ${phoneme.ipa} - ${phoneme.pattern}
Stage: ${stageDescriptions[stage]}
${teachingInfo}

Requirements:
- Side view cross-section (sagittal view) of human mouth and throat
- Clear anatomical structures: 
  * Tongue (highlighted in orange/red)
  * Lips (showing correct position)
  * Teeth (upper and lower)
  * Hard palate (roof of mouth)
  * Soft palate (velum)
  * Uvula
- Blue arrows showing airflow direction
- Clean, educational medical illustration style
- White/light gray background
- Small label "${phoneme.ipa}" in top-right corner
- Consistent style suitable for animation sequence
- No text except the IPA label`;

    console.log(`  生成 ${phoneme.pattern} ${phoneme.ipa} - ${stage}...`);
    return await callImagen(prompt);
}

// ============ 合成 GIF ============
async function createGIF(phoneme, framePaths) {
    const encoder = new GIFEncoder(400, 400);
    const outputPath = path.join(OUTPUT_DIR, `${phoneme.name}.gif`);
    
    const stream = fs.createWriteStream(outputPath);
    encoder.createReadStream().pipe(stream);
    
    encoder.start();
    encoder.setRepeat(0);     // 0 = 无限循环
    encoder.setDelay(600);    // 每帧 600ms
    encoder.setQuality(10);   // 质量 (1-20, 越小越好)
    
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext('2d');
    
    for (const framePath of framePaths) {
        const img = await loadImage(framePath);
        ctx.drawImage(img, 0, 0, 400, 400);
        encoder.addFrame(ctx);
    }
    
    encoder.finish();
    
    return new Promise((resolve, reject) => {
        stream.on('finish', () => {
            const stats = fs.statSync(outputPath);
            console.log(`  ✅ ${phoneme.name}.gif (${(stats.size / 1024).toFixed(1)} KB)`);
            resolve(outputPath);
        });
        stream.on('error', reject);
    });
}

// ============ 主程序 ============
async function main() {
    console.log('🎨 舌位动图生成器（基于 phonicsData.js 教学规则）');
    console.log('================================================\n');
    
    // 从 phonicsData.js 提取音素
    const phonemes = extractPhonemes();
    console.log(`📚 从 phonicsData.js 读取到 ${phonemes.length} 个发音模式\n`);
    
    // 显示前几个示例
    console.log('示例数据：');
    phonemes.slice(0, 3).forEach(p => {
        console.log(`  ${p.pattern} ${p.ipa}`);
        console.log(`    规则: ${p.rule?.substring(0, 40)}...`);
        console.log(`    口型: ${p.mouthDesc?.substring(0, 40)}...`);
    });
    console.log('');
    
    // 创建目录
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
    
    const stages = ['preparation', 'articulation', 'release'];
    let completed = 0;
    let failed = 0;
    
    for (const phoneme of phonemes) {
        console.log(`\n[${completed + failed + 1}/${phonemes.length}] ${phoneme.pattern} ${phoneme.ipa}`);
        
        try {
            const framePaths = [];
            
            // 生成 3 帧
            for (const stage of stages) {
                const framePath = path.join(TEMP_DIR, `${phoneme.name}_${stage}.png`);
                
                // 跳过已存在的帧
                if (fs.existsSync(framePath)) {
                    console.log(`  跳过 ${stage} (已存在)`);
                    framePaths.push(framePath);
                    continue;
                }
                
                const imageBuffer = await generateFrame(phoneme, stage);
                fs.writeFileSync(framePath, imageBuffer);
                framePaths.push(framePath);
                
                // 延迟防止限速
                await new Promise(r => setTimeout(r, 1000));
            }
            
            // 合成 GIF
            await createGIF(phoneme, framePaths);
            completed++;
            
        } catch (err) {
            console.error(`  ❌ 失败: ${err.message}`);
            failed++;
        }
        
        // 批次间延迟
        await new Promise(r => setTimeout(r, 500));
    }
    
    console.log('\n================================================');
    console.log(`✅ 完成: ${completed}`);
    console.log(`❌ 失败: ${failed}`);
    console.log(`📁 输出目录: ${OUTPUT_DIR}`);
}

main().catch(console.error);
```

---

#### 数据来源说明

脚本会自动从以下两个文件读取教学内容：

1. **phonicsData.js** - 读取每个发音模式的：
   - `pattern` - 字母组合（如 "a", "sh", "a_e"）
   - `pronunciation` - IPA 发音（如 "/æ/"）
   - `rule` - 教学规则（如 "字母A的短音：嘴巴张大..."）
   - `tip` - 学习提示
   - `words` - 例词

2. **phonics-rules.md** 的口型描述（硬编码在脚本中）：
   - 元音口型："/æ/ - 嘴巴张大，像要咬苹果"
   - 辅音口型："/θ/ - 舌头放在上下齿之间吹气"

#### Imagen Prompt 示例

生成 `/æ/` (cat) 的舌位图时，prompt 会包含：

```
Sound: /æ/ - a
Stage: mouth wide open, tongue low and front, like biting an apple
Teaching note: 字母A的短音：嘴巴张大，舌头放平，发"啊"和"诶"之间的音。
```

这样生成的舌位图会更准确地反映教学内容！

---

#### 安装依赖
```bash
npm install gifencoder canvas google-auth-library
```

#### 运行
```bash
node scripts/generate-tongue-animation.js
```

---

#### 输出文件结构
```
public/images/tongue/
├── short_a.gif      # /æ/ 舌位动图 (3帧循环)
├── short_e.gif      # /ɛ/ 舌位动图
├── th_voiceless.gif # /θ/ 舌位动图
├── sh.gif           # /ʃ/ 舌位动图
├── r.gif            # /r/ 舌位动图
└── ... (共约 20-45 个)
```

#### 前端使用
```html
<!-- 自动播放循环 -->
<img src="/images/tongue/short_a.gif" alt="/æ/ 舌位动图" class="tongue-gif">

<style>
.tongue-gif {
    width: 200px;
    height: 200px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
</style>
```

---

#### 成本估算
```
20 个音素 × 3 帧 = 60 张图
Imagen 3 定价: ~$0.04/张
总成本: ~$2.4

如果做 45 个音素:
45 × 3 = 135 张图 → ~$5.4
```

---

### 方案 C：使用现成资源（备选）

#### 免费舌位图资源
1. **IPA Chart with Audio** - https://www.ipachart.com/
2. **Wikimedia Commons** - 搜索 "tongue position phonetics"
3. **Interactive Sagittal Section** - https://seeingspeech.ac.uk/

#### 建议
1. 可以先用现成资源测试功能
2. 再用 Imagen 生成**统一风格**的自定义动图
3. 或者用静态图 + CSS 动画模拟

---

### 数据映射（添加到 phonicsData.js）
```javascript
{
    pattern: 'a', 
    pronunciation: '/æ/',
    rule: '...',
    tip: '...',
    tongueGif: 'short_a.gif',  // 新增：舌位动图文件名
    words: [...]
}
```

---

## 📋 执行顺序

### 第一步：准备工作
```bash
# 1. 安装依赖
npm install google-auth-library edge-tts-universal

# 2. 配置 gcloud 认证
gcloud auth application-default login

# 3. 设置项目
gcloud config set project YOUR_PROJECT_ID
```

### 第二步：生成例句（Gemini）
```bash
node scripts/generate-sentences.js
# 预计耗时：10-30分钟
# 成本：~$0.20（核心词 8k）
```

### 第三步：生成例句音频（TTS）
```bash
node scripts/generate-sentence-audio.js
# 预计耗时：1-2小时（取决于并发）
# 成本：~$4（Google TTS）或 $0（Edge TTS）
```

### 第四步：生成规则讲解音频
```bash
node scripts/generate-rule-audio.js
# 预计耗时：5分钟
# 成本：$0（Edge TTS）
```

### 第五步：生成舌位图（Imagen 3）
```bash
node scripts/generate-tongue-diagrams.js
# 预计耗时：10-20分钟
# 成本：~$2
```

### 第六步（可选）：生成舌位动图
```bash
# 安装额外依赖
npm install gifencoder canvas

node scripts/generate-tongue-animation.js
# 预计耗时：30分钟 - 1小时
# 成本：~$5（每个音素3帧）
```

---

## 💰 成本总结

| 任务 | 工具 | 预计成本 |
|------|------|----------|
| 例句生成（核心词 8k） | Gemini 2.0 Flash | ~$0.20 |
| 例句 TTS（核心词 8k） | Google Chirp3-HD | ~$4 |
| 规则讲解 TTS | Edge TTS | $0 |
| 舌位动图 | Imagen 3 + GIF | ~$5 |
| **总计** | | **~$10** |

> 💡 如果例句 TTS 也用 Edge TTS，总成本可降到 **~$5 左右**
> 
> ✅ **远低于 $300 预算，非常经济！**


---

## 🔧 备选方案

### 例句 TTS 用 Edge TTS（免费）
```javascript
const { Communicate } = require('edge-tts-universal');

async function generateEdgeTTS(text, outputPath, voice = 'en-US-JennyNeural') {
    const tts = new Communicate(text, { voice });
    const chunks = [];
    for await (const chunk of tts.stream()) {
        if (chunk.type === 'audio') {
            chunks.push(Buffer.from(chunk.data, 'base64'));
        }
    }
    fs.writeFileSync(outputPath, Buffer.concat(chunks));
}
```

### 使用 API Key 而非 gcloud
```javascript
// 如果有 Vertex AI API Key
const API_KEY = 'your-api-key';
const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
    {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    }
);
```

---

## ✅ 检查清单

### 准备工作
- [ ] Vertex AI 项目配置完成
- [ ] gcloud 认证设置好（`gcloud auth application-default login`）
- [ ] ai-words.json 词库就绪（110k 词）

### 目录结构
- [ ] 创建 `scripts/` 目录
- [ ] 创建 `audio/sentences/` 输出目录
- [ ] 创建 `audio/rules/` 输出目录
- [ ] 创建 `public/images/tongue/` 输出目录

### 脚本创建
- [ ] `scripts/generate-sentences.js` - 例句生成
- [ ] `scripts/generate-sentence-audio.js` - 例句 TTS
- [ ] `scripts/generate-rule-audio.js` - 规则讲解 TTS
- [ ] `scripts/generate-tongue-diagrams.js` - 舌位图生成
- [ ] `scripts/generate-tongue-animation.js` - 舌位动图（可选）

### 执行任务
- [ ] 运行例句生成脚本
- [ ] 运行例句 TTS 脚本
- [ ] 运行规则讲解 TTS 脚本
- [ ] 运行舌位图生成脚本
- [ ] 运行舌位动图脚本（可选）

### 收尾工作
- [ ] 验证生成结果
- [ ] 更新 phonicsData.js 添加 tongueImage 字段
- [ ] 推送到仓库

---

## 📝 备注

- Gemini 2.0 Flash 是目前最便宜的选择
- 如果遇到限速，调大延迟时间
- 建议先小规模测试（100个词）再全量运行
- 生成的文件较大，考虑分片存储
