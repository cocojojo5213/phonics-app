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

// 存储运行中的任务
const runningTasks = new Map();

// --- API Endpoints ---

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
 * 执行任务
 */
app.post('/api/run', async (req, res) => {
    const { task, apiKey } = req.body;
    console.log(`[STUDIO] Received task: ${task}`);

    // 检查任务是否正在运行
    if (runningTasks.has(task)) {
        return res.json({ success: false, message: `Task ${task} is already running.` });
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
                // 清理任务：删除 generated-words.json
                const generatedPath = path.join(__dirname, '../data/generated-words.json');
                if (fs.existsSync(generatedPath)) {
                    fs.unlinkSync(generatedPath);
                }
                return res.json({ success: true, message: 'Generated words file cleaned.' });
            default:
                return res.json({ success: false, message: `Unknown task: ${task}` });
        }

        // 检查脚本是否存在
        if (!fs.existsSync(scriptPath)) {
            return res.json({ success: false, message: `Script not found: ${scriptPath}` });
        }

        // 设置环境变量（如果有 API Key）
        const env = { ...process.env };
        if (apiKey) {
            env.GEMINI_API_KEY = apiKey;
        }

        // 启动子进程
        const child = spawn('node', [scriptPath, ...args], {
            cwd: path.join(__dirname, '../'),
            env,
            stdio: 'inherit'
        });

        runningTasks.set(task, child);

        child.on('close', (code) => {
            runningTasks.delete(task);
            console.log(`[STUDIO] Task ${task} finished with code ${code}`);
        });

        res.json({
            success: true,
            message: `Task ${task} started in background. Check terminal for progress.`
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`
===========================================
  Phonics Workshop Studio
===========================================
  URL:    http://localhost:${PORT}/admin.html
  Mode:   Development & Data Generation
===========================================
    `);
});
