/**
 * Phonics App 服务器入口
 * 
 * 最小化版本 - 只保留核心功能
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 简单的请求频率限制（防刷）
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1分钟
const RATE_LIMIT_MAX = 100; // 每分钟最多100次API请求

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  } else {
    const record = requestCounts.get(ip);
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + RATE_LIMIT_WINDOW;
    } else {
      record.count++;
      if (record.count > RATE_LIMIT_MAX) {
        return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
      }
    }
  }
  next();
}

// 定期清理过期记录
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(ip);
    }
  }
}, 60000);

// 简单的请求日志（只记录 API 请求）
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') && !req.path.includes('/tts/') && !req.path.includes('/health')) {
    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    console.log(`🌐 [${timestamp}] ${req.method} ${req.path}`);
  }
  next();
});

// 中间件
app.use(cors({
  origin: true, // 允许所有来源但保留 CORS 安全性
  methods: ['GET', 'POST', 'DELETE'],
  maxAge: 86400
}));
app.use(express.json({ limit: '1mb' })); // 限制请求体大小
app.use(express.static(path.join(__dirname, '../public')));

// API 路由添加限流
app.use('/api/', rateLimit);

// API 路由
const ttsRouter = require('./routes/tts');
const phonicsRouter = require('./routes/phonics');

app.use('/api/tts', ttsRouter);
app.use('/api/phonics', phonicsRouter);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA 路由回退
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('❌ 服务器错误:', err.message);
  res.status(500).json({ error: '服务器内部错误' });
});

// 未捕获异常处理
process.on('uncaughtException', (err) => {
  console.error('❌ 未捕获异常:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的 Promise 拒绝:', reason);
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Phonics App 服务器运行在 http://localhost:${PORT}`);
});
