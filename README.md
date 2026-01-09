# Phonics - 自然拼读学习工具

[![Version](https://img.shields.io/badge/version-2.3.0-blue.svg)](https://github.com/cocojojo5213/phonics-app)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-ready-brightgreen.svg)](#pwa-支持)

系统学习 100+ 自然拼读规则，掌握「见词能读、听音能写」的核心能力。适合英语初学者和教学工作者。（你可以自己修改提示词，获取属于自己的词库）

**在线体验**: [phonics.thetruetao.com](https://phonics.thetruetao.com)

---

## 重要声明

> **如果你使用了本项目的代码或数据，请署名！**
> 
> 在你的项目 README、关于页面或首页底部添加：
> ```
> 本项目基于 Phonics App (https://github.com/cocojojo5213/phonics-app) 开发
> ```

---

## 功能介绍

- **科学分类** - 16 大发音分类，从字母到音节，循序渐进
- **拼读分解** - 每个单词标注音素拆解，彩色高亮核心发音
- **高质量发音** - Google Cloud TTS 语音合成，支持单词和例句朗读
- **单词卡片模式** - 一次只显示一个单词，专注学习，支持左右滑动
- **例句学习** - 每个单词配有简单例句和中文翻译
- **PWA 支持** - 可安装到手机主屏幕，支持离线访问
- **Workshop 工具** - 内置 AI 词汇生成和 TTS 生成工具

---

## 快速开始

### 静态版（推荐）

直接把项目部署到任何静态托管服务（Cloudflare Pages、Vercel、GitHub Pages 等）：

```bash
# 本地预览
cd phonics-static
npx serve .
# 访问 http://localhost:3000
```

### Workshop 模式（AI 词汇生成）

```bash
cd phonics-static
npm install
npm run studio
# 访问 http://localhost:3000/admin.html
```

---

## NPM 脚本

| 命令 | 说明 |
|:---|:---|
| `npm run start` | 启动静态预览服务器 |
| `npm run studio` | 启动 Workshop 管理后台 |
| `npm run gen` | AI 生成词汇 |
| `npm run tts` | 生成 TTS 音频 |
| `npm run merge` | 合并生成的词汇到规则库 |
| `npm run fix` | 修复 breakdown 格式 |

---

## 目录结构

```
phonics-static/
├── index.html              # 主页面
├── admin.html              # Workshop 管理后台
├── css/
│   └── style.css           # 设计系统
├── js/
│   ├── app.js              # 核心逻辑
│   ├── audio-loader.js     # 音频加载器
│   └── data-loader.js      # 数据加载器
├── data/
│   └── rules-master.json   # 规则库 (16分类, 100+规则)
├── scripts/
│   ├── ai-service.js       # AI 服务层
│   ├── generate-words.js   # AI 词汇生成
│   ├── generate-tts.js     # TTS 音频生成
│   ├── merge-words.js      # 数据合并
│   └── studio-server.js    # 本地服务器
├── audio/
│   ├── patterns/           # 真人发音
│   ├── sentences/          # 例句音频
│   └── spelling/           # 拼读音频
├── sw.js                   # Service Worker
├── manifest.json           # PWA 配置
└── _headers                # CDN 缓存配置
```

---

## 规则库说明

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

---

## PWA 支持

- **安装到主屏幕** - 像原生 App 一样使用
- **离线访问** - 缓存静态资源和音频
- **iPhone 适配** - 支持全面屏安全区域
- **音频缓存** - 常用单词发音自动缓存

---

## 配置

### Google Cloud TTS

TTS 生成脚本使用 Google Cloud Text-to-Speech API。配置方式：

```bash
# 使用 ADC (推荐)
gcloud auth application-default login

# 或设置服务账号
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

### AI 功能

词汇生成使用 Google Gemini 3 Flash 模型：

```bash
# 使用 ADC (推荐)
gcloud auth application-default login

# 或在 admin.html 中输入 API Key
```

---

## 版本历史

- **v2.3.0 (2026-01-09)** - 完整重构：16分类规则库、彩色breakdown、Workshop工具
- **v2.0.0 (2026-01-09)** - UI 全面重构，Flashcard 模式
- **v1.x** - 服务器版本（仅修bug）

---

## 版权与署名

本项目采用 MIT 许可证。

### 署名要求

如果您使用了本项目的代码、数据或设计，请在以下任一位置添加署名：

- 项目 README 文件
- 网站页脚或关于页面
- 应用内的设置或关于界面

**署名格式**：
```
基于 Phonics App (https://github.com/cocojojo5213/phonics-app) 开发
```

### 禁止行为

- 直接复制并声称为原创作品
- 移除或修改原始版权声明
- 用于商业培训机构而不署名

---

## 贡献

欢迎提交 Issue 和 Pull Request！

如有问题，请在 [GitHub Issues](https://github.com/cocojojo5213/phonics-app/issues) 中反馈。

<iframe style="width:100%;height:auto;min-width:600px;min-height:400px;" src="https://www.star-history.com/embed?secret=Z2l0aHViX3BhdF8xMUJWQUhJUEkwNHFFc1hUYjhhWlBkX3dsYUVUWldsUWRGSGg1bTJsMFRPRDNpaGsyRjBUVjdBOVoxaXJLRER2TlVKWEgyUFVCR3NVTGZvNmt1#cocojojo5213/phonics-app&type=timeline&legend=top-left" frameBorder="0"></iframe>
