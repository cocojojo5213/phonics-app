# Phonics - 自然拼读学习工具 | Phonics Learning Tool

<p align="center">
  <a href="#中文">🇨🇳 中文</a> | <a href="#english">🇺🇸 English</a>
</p>

[![Version](https://img.shields.io/badge/version-2.4.0-blue.svg)](https://github.com/cocojojo5213/phonics-app)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-ready-brightgreen.svg)](#pwa-支持)

---

<a id="中文"></a>

## 🇨🇳 中文

系统学习 100+ 自然拼读规则，掌握「见词能读、听音能写」的核心能力。  
适合英语初学者和教学工作者，支持自定义提示词以构建个人词库。

**在线体验**: [phonics.thetruetao.com](https://phonics.thetruetao.com)

### 重要声明

> **如果你使用了本项目的代码或数据，请署名！**
> 
> 在你的项目 README、关于页面或首页底部添加：
> ```
> 本项目基于 Phonics App (https://github.com/cocojojo5213/phonics-app) 开发
> ```

### 功能介绍

- **科学分类** - 16 大发音分类，从字母到音节，循序渐进
- **拼读分解** - 每个单词标注音素拆解，彩色高亮核心发音
- **高质量发音** - Google Cloud TTS 语音合成，支持单词和例句朗读
- **单词卡片模式** - 一次只显示一个单词，专注学习，支持左右滑动
- **例句学习** - 每个单词配有简单例句和中文翻译
- **PWA 支持** - 可安装到手机主屏幕，支持离线访问
- **Workshop 工具** - 内置 AI 词汇生成和 TTS 生成工具
- **自定义 AI 提示词** - 可定制词汇生成规则

### 快速开始

```bash
# 克隆项目
git clone https://github.com/cocojojo5213/phonics-app.git
cd phonics-app

# 本地预览
npx serve .
# 访问 http://localhost:3000
```

**Workshop 模式（AI 词汇生成）**：

```bash
npm install
npm run studio
# 访问 http://localhost:3000/admin.html
```

### NPM 脚本

| 命令 | 说明 |
|:---|:---|
| `npm run start` | 启动静态预览服务器 |
| `npm run studio` | 启动 Workshop 管理后台 |
| `npm run gen` | AI 生成词汇 |
| `npm run tts` | 生成 TTS 音频 |
| `npm run merge` | 合并生成的词汇到规则库 |
| `npm run test` | 运行测试脚本 |
| `npm run fix` | 修复 breakdown 格式 |

### 目录结构

```
phonics-app/
├── index.html              # 主页面 / Main page
├── admin.html              # Workshop 管理后台 / Admin panel
├── css/
│   └── style.css           # 设计系统 / Design system
├── js/
│   ├── app.js              # 核心逻辑 / Core logic
│   ├── audio-loader.js     # 音频加载器 / Audio loader
│   └── data-loader.js      # 数据加载器 / Data loader
├── data/
│   └── rules-master.json   # 规则库 / Rules database (16 categories, 100+ rules)
├── scripts/
│   ├── ai-service.js       # AI 服务层 / AI service layer
│   ├── generate-words.js   # AI 词汇生成 / AI word generation
│   ├── generate-tts.js     # TTS 音频生成 / TTS audio generation
│   ├── test-all.js         # 综合测试 / Comprehensive tests
│   ├── merge-words.js      # 数据合并 / Data merging
│   └── studio-server.js    # 本地服务器 / Local server
├── sw.js                   # Service Worker
├── manifest.json           # PWA 配置 / PWA config
└── _headers                # CDN 缓存配置 / CDN cache config
```

> **注意**: 音频文件需要单独生成或获取，本仓库为了减小体积不包含音频资源。

### 规则库说明

`rules-master.json` 包含 16 个发音分类：

| # | 分类 | 说明 |
|:---:|:---|:---|
| 1 | 单辅音字母 | b, c, d, f, g... |
| 2 | 短元音 | a, e, i, o, u |
| 3 | 辅音字母组合 | ch, sh, th, wh... |
| 4 | 辅音连读 | bl, cl, dr, tr... |
| 5 | 常见词尾 | -ck, -ff, -ll, -ss... |
| 6 | 魔法 E | a_e, i_e, o_e... |
| 7 | 长元音组合 | ai, ay, ee, ea... |
| 8 | R 控制音 | ar, er, ir, or, ur |
| 9 | 其他元音组合 | oi, oy, ou, ow... |
| 10 | 软音 C/G | ce, ci, ge, gi... |
| 11 | 词尾变化 | -s, -es, -ed, -ing |
| 12 | 后缀拼写变化 | 双写、去 e、y 变 i |
| 13 | 六大音节类型 | 开/闭/VCe/元音组合/R控/辅音+le |
| 14 | Schwa 弱读 | 非重读音节 |
| 15 | 音节划分 | VCCV, VCV, C+le... |
| 16 | 辅音清浊 | 发音倾向变化 |

### 配置

#### Google Cloud TTS

```bash
# 使用 ADC (推荐)
gcloud auth application-default login

# 或设置服务账号
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

#### AI 功能（通用接口）

| 服务 | API 地址 | 模型名称 |
|:---|:---|:---|
| **Gemini** | 留空 | `gemini-3-flash` |
| **OpenAI** | `https://api.openai.com/v1` | `gpt-4o` |
| **Claude** | `https://api.anthropic.com` | `claude-3-5-sonnet-20241022` |
| **DeepSeek** | `https://api.deepseek.com` | `deepseek-chat` |
| **本地 Ollama** | `http://localhost:11434/v1` | `llama3` |

### 版本历史

- **v2.4.0** - 通用 AI 接口、自定义提示词、综合测试脚本、双语文档
- **v2.3.0** - 完整重构：16分类规则库、彩色breakdown、Workshop工具
- **v2.0.0** - UI 全面重构，Flashcard 模式
- **v1.x** - 服务器版本

---

<a id="english"></a>

## 🇺🇸 English

Learn 100+ phonics rules systematically. Master the core skills of "read on sight, write by ear".  
Perfect for English beginners and educators, with custom AI prompts for building your own vocabulary.

**Live Demo**: [phonics.thetruetao.com](https://phonics.thetruetao.com)

### Important Notice

> **If you use this project's code or data, please give credit!**
> 
> Add to your project README, about page, or footer:
> ```
> Based on Phonics App (https://github.com/cocojojo5213/phonics-app)
> ```

### Features

- **Scientific Classification** - 16 pronunciation categories, progressive learning from letters to syllables
- **Phonics Breakdown** - Each word marked with phoneme breakdown, color-highlighted core sounds
- **High-Quality Audio** - Google Cloud TTS synthesis, supports word and sentence reading
- **Flashcard Mode** - One word at a time, focused learning with swipe navigation
- **Sentence Learning** - Each word includes a simple sentence with translation
- **PWA Support** - Install to home screen, offline access available
- **Workshop Tools** - Built-in AI vocabulary generation and TTS tools
- **Custom AI Prompts** - Customize vocabulary generation rules

### Quick Start

```bash
# Clone the project
git clone https://github.com/cocojojo5213/phonics-app.git
cd phonics-app

# Local preview
npx serve .
# Visit http://localhost:3000
```

**Workshop Mode (AI Vocabulary Generation)**:

```bash
npm install
npm run studio
# Visit http://localhost:3000/admin.html
```

### NPM Scripts

| Command | Description |
|:---|:---|
| `npm run start` | Start static preview server |
| `npm run studio` | Start Workshop admin panel |
| `npm run gen` | AI vocabulary generation |
| `npm run tts` | Generate TTS audio |
| `npm run merge` | Merge generated words to rules |
| `npm run test` | Run test scripts |
| `npm run fix` | Fix breakdown format |

### Rules Database

`rules-master.json` contains 16 pronunciation categories:

| # | Category | Examples |
|:---:|:---|:---|
| 1 | Single Consonants | b, c, d, f, g... |
| 2 | Short Vowels | a, e, i, o, u |
| 3 | Consonant Digraphs | ch, sh, th, wh... |
| 4 | Consonant Blends | bl, cl, dr, tr... |
| 5 | Common Endings | -ck, -ff, -ll, -ss... |
| 6 | Magic E | a_e, i_e, o_e... |
| 7 | Long Vowel Teams | ai, ay, ee, ea... |
| 8 | R-Controlled | ar, er, ir, or, ur |
| 9 | Other Vowel Teams | oi, oy, ou, ow... |
| 10 | Soft C/G | ce, ci, ge, gi... |
| 11 | Word Endings | -s, -es, -ed, -ing |
| 12 | Suffix Spelling | doubling, drop e, y to i |
| 13 | 6 Syllable Types | open/closed/VCe/vowel team/R-controlled/C+le |
| 14 | Schwa Sound | unstressed syllables |
| 15 | Syllable Division | VCCV, VCV, C+le... |
| 16 | Voiced/Voiceless | pronunciation tendency |

### Configuration

#### Google Cloud TTS

```bash
# Using ADC (recommended)
gcloud auth application-default login

# Or set service account
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

#### AI Integration (Universal Interface)

| Service | API URL | Model |
|:---|:---|:---|
| **Gemini** | Leave empty | `gemini-3-flash` |
| **OpenAI** | `https://api.openai.com/v1` | `gpt-4o` |
| **Claude** | `https://api.anthropic.com` | `claude-3-5-sonnet-20241022` |
| **DeepSeek** | `https://api.deepseek.com` | `deepseek-chat` |
| **Local Ollama** | `http://localhost:11434/v1` | `llama3` |

### Version History

- **v2.4.0** - Universal AI interface, custom prompts, comprehensive tests, bilingual docs
- **v2.3.0** - Full rewrite: 16-category rules, colored breakdown, Workshop tools
- **v2.0.0** - Complete UI redesign, Flashcard mode
- **v1.x** - Server version

---

## License / 许可证

MIT License

## Contributing / 贡献

Issues and Pull Requests are welcome!  
欢迎提交 Issue 和 Pull Request！

[GitHub Issues](https://github.com/cocojojo5213/phonics-app/issues)

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=cocojojo5213/phonics-app&type=timeline&legend=top-left)](https://www.star-history.com/#cocojojo5213/phonics-app&type=timeline&legend=top-left)
