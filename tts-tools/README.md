# TTS 工具集

用于生成 Phonics App 的音频文件：例句朗读、规则讲解等。

## 安装

```bash
cd tts-tools
npm install
```

## 配置

1. 复制配置模板：
```bash
cp config.example.js config.js
```

2. 编辑 `config.js`，填入你的密钥：
   - **Google Cloud** 服务账号密钥（Text-to-Speech API 和 Vertex AI）
   - **Azure Speech**（可选，用于中文讲解）

## 使用

### 1. 生成例句文本（AI）

使用 Gemini 为词库中的单词生成简单例句和中文翻译：

```bash
npm run sentences
# 或
node generate-sentences.js
```

- 输入：`data/phonicsData.js` + `data/ai-words.json`
- 输出：`output/sentences.json`

### 2. 生成例句音频（TTS）

将例句转换为 MP3 音频：

```bash
npm run sentences-tts
# 或
node generate-sentences-tts.js
```

- 输入：`output/sentences.json`
- 输出：`output/sentences-audio/*.mp3`
- 声音：Chirp3-HD-Achernar（Google 最新高质量女声）

### 3. 生成规则讲解音频

生成每个拼读模式的规则讲解和学习技巧音频：

```bash
npm run rules
# 或
node generate-rules-tts.js
```

- 输出：`output/rules/*_rule.mp3` 和 `*_tip.mp3`
- 声音：XiaoxiaoNeural（Azure 中文女声）

## 输出目录

```
output/
├── sentences.json          # 例句数据（word -> {en, zh}）
├── sentences-audio/        # 例句音频
│   ├── apple.mp3
│   └── ...
└── rules/                  # 规则讲解音频
    ├── a_rule.mp3
    ├── a_tip.mp3
    └── ...
```

## 同步到静态版

生成完成后，复制到 phonics-static：

```powershell
# 例句数据
Copy-Item output/sentences.json ../phonics-static/data/

# 例句音频
Copy-Item output/sentences-audio/* ../phonics-static/audio/sentences/

# 规则音频
Copy-Item output/rules/* ../phonics-static/audio/rules/
```

## 配额说明

| 声音类型 | 每分钟限制 | 每月免费额度 |
|----------|-----------|-------------|
| Chirp3-HD | 200 次 | 100万字符 |
| Journey | 30 次 | 较少 |
| Standard | 无 | 400万字符 |

⚠️ 建议使用 Chirp3-HD，音质好且配额充足。
