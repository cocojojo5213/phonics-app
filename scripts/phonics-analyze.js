/**
 * AI 自然拼读分解工具
 * 
 * 功能：
 * 1. 读取 ai-words.json 词库
 * 2. 用 AI 分析每个单词的自然拼读结构
 * 3. 输出分解后的结果，如 rain → r-ai-n
 * 4. 删除不符合自然拼读规则的不规则单词
 * 
 * 用法：
 *   node scripts/phonics-analyze.js [--dry-run] [--pattern=xxx]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();

// ============ 配置 ============
const CONFIG = {
    // 词库路径
    wordsFile: path.join(__dirname, '..', 'data', 'ai-words.json'),
    outputFile: path.join(__dirname, '..', 'data', 'ai-words-analyzed.json'),

    // AI 配置
    apiKey: process.env.OPENAI_API_KEY,
    apiBase: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',

    // 批量处理
    batchSize: 20,  // 每次发给 AI 的单词数
    delayMs: 1000,  // 请求间隔
};

// ============ AI 请求 ============
async function callAI(prompt) {
    const apiUrl = new URL(CONFIG.apiBase);

    const requestBody = JSON.stringify({
        model: CONFIG.model,
        messages: [
            {
                role: 'system',
                content: `你是一个自然拼读专家。你的任务是将英语单词按照自然拼读规则分解成发音单元。

规则：
1. 辅音字母单独一个单元：b, c, d, f, g, h, j, k, l, m, n, p, q, r, s, t, v, w, x, y, z
2. 辅音组合作为一个单元：sh, ch, th, wh, ph, ck, ng, nk, bl, cl, fl, gl, pl, sl, br, cr, dr, fr, gr, pr, tr, sc, sk, sm, sn, sp, st, sw, tw
3. 元音组合作为一个单元：ai, ay, ea, ee, ie, oa, oe, ue, oo, ou, ow, oi, oy, au, aw, ar, er, ir, or, ur, igh
4. Magic E (a_e, i_e, o_e, u_e)：元音和结尾的e一起标记，如 make → m-a_e-k
5. 短元音单独一个单元：a, e, i, o, u

输出格式：
- 用连字符 - 分隔每个发音单元
- 如果单词不符合自然拼读规则（不规则拼写），返回 "IRREGULAR"
- 只返回分解结果，不要解释`
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        temperature: 0.1,
    });

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: apiUrl.hostname,
            port: apiUrl.port || 443,
            path: apiUrl.pathname + '/chat/completions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.apiKey}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody),
            },
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.choices && result.choices[0]) {
                        resolve(result.choices[0].message.content.trim());
                    } else {
                        reject(new Error(`API 错误: ${data}`));
                    }
                } catch (e) {
                    reject(new Error(`解析失败: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(requestBody);
        req.end();
    });
}

// ============ 分析单词 ============
async function analyzeWords(words, pattern) {
    const prompt = `请将以下单词按自然拼读规则分解（这些单词都属于 "${pattern}" 模式）：

${words.map((w, i) => `${i + 1}. ${w.word}`).join('\n')}

请按格式返回：
1. 单词: 分解结果
2. 单词: 分解结果
...`;

    const response = await callAI(prompt);

    // 解析响应
    const results = {};
    const lines = response.split('\n');

    for (const line of lines) {
        // 匹配 "1. rain: r-ai-n" 或 "rain: r-ai-n"
        const match = line.match(/\d*\.?\s*(\w+):\s*(.+)/);
        if (match) {
            const word = match[1].toLowerCase();
            const breakdown = match[2].trim();
            results[word] = breakdown;
        }
    }

    return results;
}

// ============ 主程序 ============
async function main() {
    console.log('🔤 自然拼读分解工具');
    console.log('====================\n');

    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const patternArg = args.find(a => a.startsWith('--pattern='));
    const targetPattern = patternArg ? patternArg.split('=')[1] : null;

    // 检查 API Key
    if (!CONFIG.apiKey) {
        console.error('❌ 请设置 OPENAI_API_KEY 环境变量');
        console.log('在 .env 文件中添加: OPENAI_API_KEY=sk-xxx');
        process.exit(1);
    }

    // 读取词库
    console.log('📖 读取词库...');
    if (!fs.existsSync(CONFIG.wordsFile)) {
        console.error(`❌ 找不到词库: ${CONFIG.wordsFile}`);
        process.exit(1);
    }

    const wordsData = JSON.parse(fs.readFileSync(CONFIG.wordsFile, 'utf8'));
    const patterns = Object.keys(wordsData);
    console.log(`📚 共 ${patterns.length} 个模式\n`);

    if (targetPattern) {
        console.log(`🎯 只处理模式: ${targetPattern}\n`);
    }

    // 统计
    let totalWords = 0;
    let analyzedWords = 0;
    let irregularWords = 0;
    const results = {};

    // 逐个模式处理
    for (const patternKey of patterns) {
        if (targetPattern && !patternKey.includes(targetPattern)) {
            results[patternKey] = wordsData[patternKey];
            continue;
        }

        const words = wordsData[patternKey];
        totalWords += words.length;

        console.log(`\n>>> ${patternKey} (${words.length} 个词)`);

        if (dryRun) {
            console.log(`  示例: ${words.slice(0, 3).map(w => w.word).join(', ')}...`);
            results[patternKey] = words;
            continue;
        }

        // 分批处理
        const analyzedList = [];

        for (let i = 0; i < words.length; i += CONFIG.batchSize) {
            const batch = words.slice(i, i + CONFIG.batchSize);

            try {
                const breakdowns = await analyzeWords(batch, patternKey);

                for (const wordItem of batch) {
                    const word = wordItem.word.toLowerCase();
                    const breakdown = breakdowns[word];

                    if (breakdown === 'IRREGULAR' || !breakdown) {
                        irregularWords++;
                        console.log(`  ❌ ${word} (不规则)`);
                    } else {
                        analyzedWords++;
                        analyzedList.push({
                            ...wordItem,
                            breakdown: breakdown,  // 新增分解字段
                        });

                        if (analyzedWords % 50 === 0) {
                            console.log(`  ✅ ${word} → ${breakdown}`);
                        }
                    }
                }
            } catch (err) {
                console.error(`  ⚠️ 批次失败: ${err.message}`);
                // 保留原数据
                analyzedList.push(...batch);
            }

            // 延迟
            if (i + CONFIG.batchSize < words.length) {
                await new Promise(r => setTimeout(r, CONFIG.delayMs));
            }
        }

        results[patternKey] = analyzedList;
        process.stdout.write(`  进度: ${analyzedList.length}/${words.length}\n`);
    }

    // 保存结果
    if (!dryRun) {
        console.log('\n💾 保存结果...');
        fs.writeFileSync(CONFIG.outputFile, JSON.stringify(results, null, 2));
        console.log(`📁 保存到: ${CONFIG.outputFile}`);
    }

    // 统计
    console.log('\n====================');
    console.log(`📊 统计:`);
    console.log(`  总词数: ${totalWords}`);
    console.log(`  已分析: ${analyzedWords}`);
    console.log(`  不规则: ${irregularWords} (已删除)`);
    console.log(`  保留率: ${((analyzedWords / totalWords) * 100).toFixed(1)}%`);
}

main().catch(err => {
    console.error('❌ 错误:', err.message);
    process.exit(1);
});
