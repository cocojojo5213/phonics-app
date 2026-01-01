# 真正从基础开始学英语

一款帮助学习英语自然拼读的 Web 应用。通过发音规则来认识单词，而不是死记硬背。

**在线体验**: [phonics.thetruetao.com](https://phonics.thetruetao.com)

我自己部署了一套服务，带有真人发音音频。欢迎大家使用自己的 API Key 来扩展词库，你贡献的单词会保存到服务器，其他学习者也能看到。一起学习，共同进步。

---

## 功能介绍

- **系统化学习**：26个字母、短元音、长元音、辅音组合等完整拼读体系
- **真人发音**：支持真人录制的发音音频，没有音频时使用微软 Edge TTS
- **AI 扩词**：用 GPT 智能扩展词汇，需要配置自己的 API Key
- **自动扩词**：服务器端 Key 池批量扩词，优先扩展词汇少的模式
- **智能分类**：新上传的音频自动归类到对应的发音分类
- **词典验证**：CMUdict + ECDICT 双词典验证，确保单词真实存在
- **词库共享**：AI 生成的词汇自动保存到服务器，所有用户共享
- **词汇统计**：首页显示词库总量和对应的英语水平（雅思/托福等）

## 快速开始

### 本地运行

```bash
npm install
npm start
# 访问 http://localhost:3000
```

### Docker 部署

```bash
# 开发环境
docker-compose up -d

# 生产环境（带 Nginx）
docker-compose -f docker-compose.prod.yml up -d
```

## 服务器部署

1. 安装 Docker

```bash
curl -fsSL https://get.docker.com | sh
```

2. 克隆代码并启动

```bash
git clone <repo-url> phonics-app
cd phonics-app
docker-compose up -d
```

3. 配置环境变量（可选）

创建 `.env` 文件：

```bash
# 服务端口
PORT=3000

# AI 扩词 API
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# 自动扩词 Key 池（多个 Key 逗号分隔）
OPENAI_KEY_POOL=sk-key1,sk-key2,sk-key3

# AI 分类用的模型
OPENAI_CLASSIFY_MODEL=gpt-5.2
```

## 配置 AI 扩词

点击页面右上角的「设置」按钮，输入你的 OpenAI API Key。

Key 只保存在你的浏览器本地，不会上传到服务器。AI 生成的单词会保存到服务器词库，供所有人学习。

## 自动扩词

服务器可配置 Key 池自动批量扩词：

- 从词汇量最少的模式开始
- 每次扩展 20 个词
- 已有 50 词以上的模式自动跳过
- 多个 Key 轮流使用，避免频率限制

## 添加真人发音

把音频文件放到 `data/phonics-audio/` 目录：

- 字母发音：`a.mp3`、`b.mp3`
- 组合发音：`sh.mp3`、`th.mp3`
- Magic E：`a_e.mp3`

支持 MP3、WAV、OGG 格式。新上传的音频会自动分类。

## 技术栈

- 后端：Node.js + Express
- 前端：原生 HTML/CSS/JS
- TTS：Edge TTS
- 词典：CMUdict + ECDICT
- AI：OpenAI GPT 系列
- 部署：Docker + Nginx

## 目录结构

```
phonics-app/
├── public/               # 前端文件
├── server/               # 后端服务
│   ├── routes/           # API 路由
│   └── services/         # 核心服务
├── data/
│   ├── phonicsData.js    # 发音规则数据
│   ├── phonics-audio/    # 真人发音音频
│   ├── ai-words.json     # AI 扩展词库
│   └── pattern-categories.json  # 分类缓存
├── Dockerfile
├── docker-compose.yml
└── nginx.conf
```

## 核心服务

| 服务 | 功能 |
|-----|------|
| `aiClassifier.js` | AI 分类 + 发音生成 |
| `autoExpand.js` | 自动扩词服务 |
| `ai.js` | OpenAI API 调用 |
| `wordStore.js` | 词库存储 |
| `tts.js` | 语音合成 |

## 安全特性

- 请求频率限制（100次/分钟/IP）
- 路径安全检查（防止目录遍历）
- API 请求超时（30秒）
- 全局错误处理

## 许可证

MIT

---

有问题或建议欢迎提 Issue。
