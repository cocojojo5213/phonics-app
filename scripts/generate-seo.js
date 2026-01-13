/**
 * SEO 静态页面生成器
 * 将规则库和生成词汇转化为对搜索引擎友好的静态 HTML 页面
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
    rulesPath: path.join(__dirname, '../data/rules-master.json'),
    templatePath: path.join(__dirname, '../library/template.html'),
    outputDir: path.join(__dirname, '../library'),
    siteUrl: 'https://phonics-app.pages.dev' // 替换为你的实际域名
};

// 确保目录存在
if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

function slugify(text) {
    return text.toString()
        .toLowerCase()
        .replace(/\./g, '-')       // 替换点为连字符
        .replace(/\s+/g, '-')       // 替换空格为连字符
        .replace(/[^\w\-]+/g, '')   // 移除特殊字符
        .replace(/\-\-+/g, '-')      // 移除连续连字符
        .replace(/^-+/, '')         // 移除开头连字符
        .replace(/-+$/, '');        // 移除结尾连字符
}

function main() {
    console.log('🚀 开始生成 SEO 静态页面...');

    // 1. 加载数据
    const rulesData = JSON.parse(fs.readFileSync(CONFIG.rulesPath, 'utf8'));
    const template = fs.readFileSync(CONFIG.templatePath, 'utf8');

    const categoriesMap = {};
    rulesData.categories.forEach(cat => {
        categoriesMap[cat.id] = cat;
    });

    let totalPages = 0;
    const ruleLinks = [];

    // 2. 遍历规则并生成详情页
    rulesData.rules.forEach(rule => {
        const category = categoriesMap[rule.category] || { name_cn: '自然拼读规则' };
        const slug = slugify(rule.id);
        const fileName = `${slug}.html`;
        
        // 获取显示用的 pattern 和 IPA
        // 对于有 graphemes 的规则，使用第一个 grapheme；否则使用 sound.name_cn
        const displayPattern = (rule.graphemes && rule.graphemes.length > 0) 
            ? rule.graphemes[0] 
            : (rule.sound.name_cn || rule.id);
        // 对于没有 IPA 的规则（如拼写变化规则），显示规则名称
        const displayIPA = rule.sound.ipa || rule.sound.name_en || '';
        
        const ruleTitle = `自然拼读 {{PATTERN}} 的发音规则与单词表 (发音：{{IPA}})`;
        const ruleTitleProcessed = ruleTitle
            .replace(/{{PATTERN}}/g, displayPattern)
            .replace(/{{IPA}}/g, displayIPA);

        // 构造单词列表 HTML
        const words = rule.examples || [];
        const wordsHTML = words.map(w => `
            <div class="word-card" itemprop="educationalAlignment" itemscope itemtype="https://schema.org/AlignmentObject">
                <div class="word-text" itemprop="targetName">${w.word}</div>
                <div class="word-meaning">${w.meaning || ''}</div>
                <div class="sentence-box">
                    <div class="sentence-en">${w.sentence || ''}</div>
                    <div class="sentence-cn">${w.sentence_cn || ''}</div>
                </div>
            </div>
        `).join('');

        const wordListText = words.slice(0, 5).map(w => w.word).join('、');

        // 构造结构化数据 (仅 Course，FAQPage 已在模板 HTML 微数据中定义)
        const structuredData = {
            "@context": "https://schema.org",
            "@type": "Course",
            "name": ruleTitleProcessed,
            "description": rule.desc || `系统练习自然拼读规则 ${displayPattern}，掌握核心发音 ${displayIPA}。`,
            "provider": {
                "@type": "Organization",
                "name": "Phonics Workshop",
                "sameAs": CONFIG.siteUrl
            },
            "educationalLevel": "beginner",
            "inLanguage": "zh-CN",
            "teaches": `${displayPattern} 发音规则 ${displayIPA}`
        };

        // 生成描述文本
        const description = rule.desc || `系统练习自然拼读规则 ${displayPattern}，掌握核心发音 ${displayIPA}。包含 ${words.length} 个单词示例。`;

        // 替换模板
        let html = template
            .replace(/{{TITLE}}/g, ruleTitleProcessed)
            .replace(/{{PATTERN}}/g, displayPattern)
            .replace(/{{PATTERN_NAME}}/g, rule.name_cn || displayPattern)
            .replace(/{{IPA}}/g, displayIPA)
            .replace(/{{CATEGORY}}/g, category.name_cn)
            .replace(/{{DESC}}/g, description)
            .replace(/{{DESCRIPTION}}/g, description)
            .replace(/{{FILENAME}}/g, fileName)
            .replace(/{{COUNT}}/g, words.length)
            .replace(/{{WORDS_CONTENT}}/g, wordsHTML)
            .replace(/{{WORD_LIST_TEXT}}/g, wordListText)
            .replace(/{{STRUCTURED_DATA}}/g, JSON.stringify(structuredData, null, 2))
            .replace(/{{RELATED_RULES}}/g, ''); // 暂时留空，后续可添加相关规则

        fs.writeFileSync(path.join(CONFIG.outputDir, fileName), html, 'utf8');

        ruleLinks.push({
            id: rule.id,
            title: ruleTitleProcessed,
            url: fileName,
            category: category.name_cn
        });

        totalPages++;
    });

    // 3. 生成索引页 (Index Page)
    generateIndexPage(ruleLinks);

    console.log(`\n✅ SEO 页面生成完成！`);
    console.log(`   共生成详情页: ${totalPages} 个`);
    console.log(`   索引页: library/index.html`);
}

function generateIndexPage(links) {
    // 按分类分组
    const grouped = {};
    links.forEach(link => {
        if (!grouped[link.category]) grouped[link.category] = [];
        grouped[link.category].push(link);
    });

    let groupsHTML = '';
    for (const [category, itemLinks] of Object.entries(grouped)) {
        groupsHTML += `
            <div style="margin-bottom: 3rem;">
                <h2 class="section-title">${category}</h2>
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">
                    ${itemLinks.map(l => `
                        <a href="${l.url}" class="word-card" style="text-decoration:none; display:flex; flex-direction:column; justify-content:center; align-items:center; transition:0.2s;">
                            <span style="font-weight:800; color:var(--primary); font-size:1.2rem;">${l.title.split(' ')[0]}</span>
                            <span style="font-size:0.8rem; color:#64748b;">${l.title.split(' ')[1]}</span>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }

    const indexHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>自然拼读规则百科 - Phonics Rules Encyclopedia</title>
    <meta name="description" content="全网最全的自然拼读规则百科，包含107条核心发音规则，上千个真人发音示例，帮助孩子零基础学习英语拼读。">
    <link rel="stylesheet" href="../css/style.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Outfit:wght@800&display=swap" rel="stylesheet">
    <style>
        :root { --primary: #6366f1; --bg: #f8fafc; --text: #1e293b; }
        body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); padding: 0; margin: 0; }
        .hero { padding: 6rem 0 4rem; text-align: center; background: white; border-bottom: 1px solid #e2e8f0; }
        .container { max-width: 1000px; margin: 0 auto; padding: 0 2rem; }
        .section-title { font-size: 1.5rem; font-weight: 800; margin: 3rem 0 1.5rem; color: #1e293b; }
        .word-card { background: white; padding: 1.5rem; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #f1f5f9; }
        .word-card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); border-color: var(--primary); }
    </style>
</head>
<body>
    <header class="hero">
        <div class="container">
            <h1 style="font-size: 3.5rem; font-family: 'Outfit'; font-weight: 800; margin: 0;">规则百科</h1>
            <p style="font-size: 1.2rem; color: #64748b; margin-top: 1rem;">107 条自然拼读发音规则，零基础全掌握</p>
            <div style="margin-top: 2rem;">
                <a href="../#/" style="text-decoration:none; font-weight:600; color:var(--primary);">← 返回主程序</a>
            </div>
        </div>
    </header>

    <main class="container" style="padding-bottom: 5rem;">
        ${groupsHTML}
    </main>

    <footer style="padding: 4rem 0; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        <p>© 2026 Phonics Static Encyclopedia</p>
    </footer>
</body>
</html>`;

    fs.writeFileSync(path.join(CONFIG.outputDir, 'index.html'), indexHTML, 'utf8');
}

main();
