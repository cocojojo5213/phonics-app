// 加载环境变量
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// 存储运行中的任务和日志
const runningTasks = new Map();
const taskLogs = new Map();
const sseClients = new Set();

// 广播日志到所有 SSE 客户端
function broadcastLog(task, type, message) {
    const logEntry = { task, type, message, timestamp: new Date().toISOString() };

    // 保存到日志缓存
    if (!taskLogs.has(task)) {
        taskLogs.set(task, []);
    }
    taskLogs.get(task).push(logEntry);

    // 限制日志条数
    if (taskLogs.get(task).length > 500) {
        taskLogs.get(task).shift();
    }

    // 广播给所有客户端
    const data = JSON.stringify(logEntry);
    sseClients.forEach(client => {
        client.write(`data: ${data}\n\n`);
    });
}

// --- API Endpoints ---

/**
 * SSE 实时日志流
 */
app.get('/api/logs/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // 发送初始连接成功消息
    res.write(`data: ${JSON.stringify({ type: 'connected', message: '已连接到日志流' })}\n\n`);

    sseClients.add(res);

    req.on('close', () => {
        sseClients.delete(res);
    });
});

/**
 * 获取任务状态
 */
app.get('/api/tasks/status', (req, res) => {
    const status = {};
    runningTasks.forEach((value, key) => {
        status[key] = { running: true, pid: value.pid };
    });
    res.json({ success: true, tasks: status });
});

/**
 * 获取规则库
 */
app.get('/api/rules', (req, res) => {
    try {
        const rulesPath = path.join(__dirname, '../data/rules-master.json');
        if (fs.existsSync(rulesPath)) {
            const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
            res.json({
                success: true,
                categories: rules.categories?.length || 0,
                rules: rules.rules?.length || 0
            });
        } else {
            res.status(404).json({ success: false, message: 'Rules file not found.' });
        }
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

/**
 * 获取统计信息
 */
app.get('/api/stats', (req, res) => {
    try {
        const rulesPath = path.join(__dirname, '../data/rules-master.json');
        const generatedPath = path.join(__dirname, '../data/generated-words.json');
        const audioPath = path.join(__dirname, '../audio');

        const rules = fs.existsSync(rulesPath) ? JSON.parse(fs.readFileSync(rulesPath, 'utf8')) : { rules: [] };
        const generated = fs.existsSync(generatedPath) ? JSON.parse(fs.readFileSync(generatedPath, 'utf8')) : {};

        // 统计音频文件数量
        let wordAudioCount = 0;
        let sentenceAudioCount = 0;

        if (fs.existsSync(audioPath)) {
            const files = fs.readdirSync(audioPath).filter(f => f.endsWith('.mp3'));
            wordAudioCount = files.length;
        }

        const sentencePath = path.join(audioPath, 'sentences');
        if (fs.existsSync(sentencePath)) {
            sentenceAudioCount = fs.readdirSync(sentencePath).filter(f => f.endsWith('.mp3')).length;
        }

        res.json({
            success: true,
            stats: {
                categories: rules.categories?.length || 0,
                rules: rules.rules?.length || 0,
                generatedRules: Object.keys(generated).length,
                wordAudios: wordAudioCount,
                sentenceAudios: sentenceAudioCount
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

/**
 * 执行任务（带实时日志）
 */
app.post('/api/run', async (req, res) => {
    const { task, apiKey, baseURL, model } = req.body;

    broadcastLog(task, 'info', `接收任务: ${task}`);
    if (model) broadcastLog(task, 'info', `模型: ${model}`);

    // 检查任务是否正在运行
    if (runningTasks.has(task)) {
        return res.json({ success: false, message: `任务 ${task} 正在运行中` });
    }

    try {
        let scriptPath;
        let args = [];

        switch (task) {
            case 'generate':
                scriptPath = path.join(__dirname, 'generate-words.js');
                break;
            case 'tts':
                scriptPath = path.join(__dirname, 'generate-tts.js');
                args = ['all'];
                break;
            case 'merge':
                scriptPath = path.join(__dirname, 'merge-words.js');
                break;
            case 'fix':
                scriptPath = path.join(__dirname, 'fix-breakdown.js');
                break;
            case 'clean':
                const generatedPath = path.join(__dirname, '../data/generated-words.json');
                if (fs.existsSync(generatedPath)) {
                    fs.unlinkSync(generatedPath);
                }
                broadcastLog(task, 'success', '已清空生成的词汇文件');
                return res.json({ success: true, message: '已清空生成的词汇文件' });
            default:
                return res.json({ success: false, message: `未知任务: ${task}` });
        }

        if (!fs.existsSync(scriptPath)) {
            return res.json({ success: false, message: `脚本不存在: ${scriptPath}` });
        }

        // 设置环境变量
        const env = { ...process.env };
        if (apiKey) env.AI_API_KEY = apiKey;
        if (baseURL) env.AI_BASE_URL = baseURL;
        if (model) env.AI_MODEL = model;

        // 清空之前的日志
        taskLogs.set(task, []);

        // 启动子进程（使用 pipe 捕获输出）
        const child = spawn('node', [scriptPath, ...args], {
            cwd: path.join(__dirname, '../'),
            env,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        runningTasks.set(task, child);

        // 捕获 stdout
        child.stdout.on('data', (data) => {
            const lines = data.toString().split('\n').filter(l => l.trim());
            lines.forEach(line => {
                console.log(line);
                broadcastLog(task, 'stdout', line);
            });
        });

        // 捕获 stderr
        child.stderr.on('data', (data) => {
            const lines = data.toString().split('\n').filter(l => l.trim());
            lines.forEach(line => {
                console.error(line);
                broadcastLog(task, 'stderr', line);
            });
        });

        child.on('close', (code) => {
            runningTasks.delete(task);
            const msg = `任务 ${task} 完成，退出码 ${code}`;
            console.log(`[STUDIO] ${msg}`);
            broadcastLog(task, code === 0 ? 'success' : 'error', msg);
        });

        res.json({
            success: true,
            message: `任务已启动，日志将实时显示`
        });

    } catch (e) {
        console.error(e);
        broadcastLog(task, 'error', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

/**
 * 暂停任务（优雅暂停，保存进度）
 */
app.post('/api/pause', (req, res) => {
    const { task } = req.body;

    if (task === 'generate') {
        // 创建信号文件，让脚本自己检测并暂停
        const signalPath = path.join(__dirname, '../.stop-generate');
        fs.writeFileSync(signalPath, new Date().toISOString());
        broadcastLog(task, 'warn', '暂停信号已发送，等待当前规则处理完成后暂停...');
        res.json({ success: true, message: '暂停信号已发送' });
    } else {
        res.json({ success: false, message: `任务 ${task} 不支持暂停` });
    }
});

/**
 * 强制停止任务（立即终止）
 */
app.post('/api/stop', (req, res) => {
    const { task } = req.body;

    if (runningTasks.has(task)) {
        const child = runningTasks.get(task);
        child.kill('SIGTERM');
        runningTasks.delete(task);
        broadcastLog(task, 'warn', `任务 ${task} 已被强制停止`);
        res.json({ success: true, message: `任务 ${task} 已停止` });
    } else {
        res.json({ success: false, message: `任务 ${task} 未在运行` });
    }
});

app.listen(PORT, () => {
    console.log(`
===========================================
  Phonics Workshop Studio
===========================================
  URL:    http://localhost:${PORT}/admin.html
  Mode:   Development & Data Generation
  Logs:   Real-time via SSE
===========================================
    `);
});
