/**
 * Phonics Data Loader
 * 将 rules-master.json 转换为前端渲染所需的扁平化格式
 */

let phonicsData = {};
let phonicsCategories = [];

async function loadPhonicsData() {
    try {
        const response = await fetch('./data/rules-master.json', { cache: 'force-cache' });
        const rulesData = await response.json();

        // 提取分类信息
        phonicsCategories = rulesData.categories.map(cat => ({
            id: cat.id,
            name: cat.name_cn,
            desc: cat.name_en,
            order: cat.order
        }));

        // 按分类组织规则
        rulesData.rules.forEach(rule => {
            const catId = rule.category;
            if (!phonicsData[catId]) {
                phonicsData[catId] = [];
            }

            // 转换为前端期望的格式
            const patternData = {
                id: rule.id,
                // 对于有 graphemes 的规则使用第一个 grapheme，否则使用 sound.name_cn
                pattern: rule.graphemes && rule.graphemes.length > 0 
                    ? rule.graphemes[0] 
                    : (rule.sound?.name_cn || rule.id),
                // 对于没有 IPA 的规则（如拼写变化、音节类型），使用 name_en 作为说明
                pronunciation: rule.sound?.ipa || rule.sound?.name_en || '',
                rule: rule.tts?.zh || '',
                ruleEn: rule.tts?.en || '',
                // 转换 examples 为 words 格式
                words: (rule.examples || []).map(ex => ({
                    word: ex.word,
                    breakdown: ex.breakdown,
                    highlight: ex.highlight,
                    tokenFlags: ex.tokenFlags || [],
                    syllables: ex.syllables || null,
                    meaning: ex.meaning || '',
                    sentence: ex.sentence || '',
                    sentence_cn: ex.sentence_cn || ''
                }))
            };

            phonicsData[catId].push(patternData);
        });

        console.log(`✅ Phonics 数据加载完成：${rulesData.rules.length} 条规则，${phonicsCategories.length} 个分类`);
        return true;
    } catch (error) {
        console.error('❌ 加载 Phonics 数据失败:', error);
        return false;
    }
}

// 获取分类列表
function getCategories() {
    return phonicsCategories.sort((a, b) => a.order - b.order);
}

// 获取某分类下的所有规则
function getPatternsByCategory(categoryId) {
    return phonicsData[categoryId] || [];
}

// 获取某规则的详细信息
function getPatternInfo(categoryId, pattern) {
    const patterns = phonicsData[categoryId] || [];
    return patterns.find(p => p.pattern === pattern);
}

// 导出到全局
window.loadPhonicsData = loadPhonicsData;
window.getCategories = getCategories;
window.getPatternsByCategory = getPatternsByCategory;
window.getPatternInfo = getPatternInfo;
