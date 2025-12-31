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

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

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

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Phonics App 服务器运行在 http://localhost:${PORT}`);
});
