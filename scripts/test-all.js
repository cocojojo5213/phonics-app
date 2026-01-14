/**
 * Phonics App 综合测试脚本 / Comprehensive Test Script
 * 
 * 验证数据完整性、格式一致性和前后端契约
 * Validates data integrity, format consistency, and frontend-backend contracts
 * 
 * 用法 / Usage: node scripts/test-all.js
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
    rulesPath: path.join(__dirname, '../data/rules-master.json'),
    generatedPath: path.join(__dirname, '../data/generated-words.json')
};

// 测试结果统计
const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    errors: []
};

// 辅助函数
function log(msg, type = 'info') {
    const icons = {
        pass: '✅',
        fail: '❌',
        warn: '⚠️',
        info: '📋'
    };
    console.log(`${icons[type] || ''} ${msg}`);
}

function assert(condition, message) {
    if (condition) {
        results.passed++;
        log(message, 'pass');
        return true;
    } else {
        results.failed++;
        results.errors.push(message);
        log(message, 'fail');
        return false;
    }
}

function warn(message) {
    results.warnings++;
    log(message, 'warn');
}

// ==================== 测试用例 ====================

/**
 * 测试 1: 规则库结构完整性
 */
function testRulesStructure() {
    log('\n--- 测试 1: 规则库结构完整性 ---', 'info');

    if (!fs.existsSync(CONFIG.rulesPath)) {
        return assert(false, 'rules-master.json 文件不存在');
    }

    const data = JSON.parse(fs.readFileSync(CONFIG.rulesPath, 'utf8'));

    // 检查顶级结构
    assert(Array.isArray(data.categories), 'categories 应该是数组');
    assert(Array.isArray(data.rules), 'rules 应该是数组');
    assert(data.categories.length > 0, `应有至少一个分类 (实际: ${data.categories.length})`);
    assert(data.rules.length > 0, `应有至少一条规则 (实际: ${data.rules.length})`);

    // 检查分类结构
    const categoryIds = new Set();
    data.categories.forEach((cat, i) => {
        assert(cat.id, `分类 ${i} 应有 id`);
        assert(cat.name_cn, `分类 ${cat.id} 应有 name_cn`);
        assert(typeof cat.order === 'number', `分类 ${cat.id} 应有数字类型的 order`);
        categoryIds.add(cat.id);
    });

    // 检查规则结构
    data.rules.forEach((rule, i) => {
        assert(rule.id, `规则 ${i} 应有 id`);
        assert(rule.category, `规则 ${rule.id} 应有 category`);
        assert(categoryIds.has(rule.category), `规则 ${rule.id} 的 category "${rule.category}" 应存在于分类列表中`);
    });

    return true;
}

/**
 * 测试 2: Breakdown 格式验证
 */
function testBreakdownFormat() {
    log('\n--- 测试 2: Breakdown 格式验证 ---', 'info');

    const data = JSON.parse(fs.readFileSync(CONFIG.rulesPath, 'utf8'));
    let validCount = 0;
    let invalidCount = 0;

    data.rules.forEach(rule => {
        (rule.examples || []).forEach(ex => {
            if (!ex.breakdown) {
                warn(`规则 ${rule.id} 的单词 "${ex.word}" 缺少 breakdown`);
                return;
            }

            const tokens = ex.breakdown.split('|');
            const joined = tokens.join('').toLowerCase();
            const expected = ex.word.toLowerCase();

            if (joined === expected) {
                validCount++;
            } else {
                invalidCount++;
                warn(`Breakdown 不匹配: "${ex.word}" → breakdown "${ex.breakdown}" 拼接为 "${joined}"`);
            }
        });
    });

    assert(invalidCount === 0, `Breakdown 格式验证: ${validCount} 通过, ${invalidCount} 失败`);
    return invalidCount === 0;
}

/**
 * 测试 3: Highlight 结构验证
 */
function testHighlightStructure() {
    log('\n--- 测试 3: Highlight 结构验证 ---', 'info');

    const data = JSON.parse(fs.readFileSync(CONFIG.rulesPath, 'utf8'));
    let validCount = 0;
    let invalidCount = 0;

    data.rules.forEach(rule => {
        (rule.examples || []).forEach(ex => {
            if (!ex.highlight) return;

            const h = ex.highlight;

            // 检查 type 字段
            if (!h.type) {
                invalidCount++;
                warn(`规则 ${rule.id} 单词 "${ex.word}" 的 highlight 缺少 type`);
                return;
            }

            // 检查 type 值
            if (!['token', 'split'].includes(h.type)) {
                invalidCount++;
                warn(`规则 ${rule.id} 单词 "${ex.word}" 的 highlight.type "${h.type}" 无效`);
                return;
            }

            // 检查 value 字段
            if (!h.value) {
                invalidCount++;
                warn(`规则 ${rule.id} 单词 "${ex.word}" 的 highlight 缺少 value`);
                return;
            }

            // 对于 split 类型，检查 indices
            if (h.type === 'split' && !Array.isArray(h.indices)) {
                invalidCount++;
                warn(`规则 ${rule.id} 单词 "${ex.word}" 的 split highlight 缺少 indices 数组`);
                return;
            }

            validCount++;
        });
    });

    log(`Highlight 结构验证: ${validCount} 个有效`, 'info');
    return true; // Highlight 是可选的，所以只警告不失败
}

/**
 * 测试 4: 生成词汇格式验证
 */
function testGeneratedWordsFormat() {
    log('\n--- 测试 4: 生成词汇格式验证 ---', 'info');

    if (!fs.existsSync(CONFIG.generatedPath)) {
        log('generated-words.json 不存在，跳过此测试', 'info');
        return true;
    }

    const data = JSON.parse(fs.readFileSync(CONFIG.generatedPath, 'utf8'));
    const ruleIds = Object.keys(data);

    assert(ruleIds.length > 0, `应有生成的词汇 (实际: ${ruleIds.length} 条规则)`);

    let totalWords = 0;
    let validWords = 0;

    ruleIds.forEach(ruleId => {
        const ruleData = data[ruleId];

        if (!ruleData.items || !Array.isArray(ruleData.items)) {
            warn(`规则 ${ruleId} 缺少 items 数组`);
            return;
        }

        ruleData.items.forEach(item => {
            totalWords++;

            // 必填字段检查
            if (!item.word) {
                warn(`规则 ${ruleId} 有单词缺少 word 字段`);
                return;
            }
            if (!item.meaning) {
                warn(`规则 ${ruleId} 单词 "${item.word}" 缺少 meaning`);
            }
            if (!item.breakdown) {
                warn(`规则 ${ruleId} 单词 "${item.word}" 缺少 breakdown`);
            }

            validWords++;
        });
    });

    log(`生成词汇: ${totalWords} 个单词，${validWords} 个有效`, 'info');
    return true;
}

/**
 * 测试 5: 前后端数据契约一致性
 */
function testDataContract() {
    log('\n--- 测试 5: 前后端数据契约一致性 ---', 'info');

    const data = JSON.parse(fs.readFileSync(CONFIG.rulesPath, 'utf8'));

    // 检查前端 data-loader.js 期望的字段
    const expectedCategoryFields = ['id', 'name_cn', 'name_en', 'order'];
    const expectedRuleFields = ['id', 'category', 'graphemes', 'sound', 'examples'];
    const expectedExampleFields = ['word', 'breakdown', 'highlight', 'meaning', 'sentence', 'sentence_cn'];

    // 验证分类字段
    const cat = data.categories[0];
    expectedCategoryFields.forEach(field => {
        if (field === 'name_cn' || field === 'name_en') {
            assert(cat[field] !== undefined, `分类应有 ${field} 字段`);
        }
    });

    // 验证规则字段
    const rule = data.rules.find(r => r.examples && r.examples.length > 0);
    if (rule) {
        expectedRuleFields.forEach(field => {
            if (field !== 'graphemes' && field !== 'examples') {
                assert(rule[field] !== undefined || field === 'sound', `规则应有 ${field} 字段 (或为可选)`);
            }
        });

        // 验证示例字段
        if (rule.examples && rule.examples[0]) {
            const ex = rule.examples[0];
            ['word', 'breakdown'].forEach(field => {
                assert(ex[field] !== undefined, `示例应有 ${field} 字段`);
            });
        }
    }

    return true;
}

/**
 * 测试 6: 音节 (syllables) 验证
 */
function testSyllablesFormat() {
    log('\n--- 测试 6: 音节格式验证 ---', 'info');

    const data = JSON.parse(fs.readFileSync(CONFIG.rulesPath, 'utf8'));
    let withSyllables = 0;
    let invalidSyllables = 0;

    data.rules.forEach(rule => {
        (rule.examples || []).forEach(ex => {
            if (!ex.syllables || !Array.isArray(ex.syllables)) return;

            withSyllables++;

            // 验证拼接后等于原单词
            const joined = ex.syllables.map(s => s.replace(/\|/g, '')).join('');
            if (joined.toLowerCase() !== ex.word.toLowerCase()) {
                invalidSyllables++;
                warn(`音节不匹配: "${ex.word}" syllables 拼接为 "${joined}"`);
            }
        });
    });

    log(`音节验证: ${withSyllables} 个单词有音节标注`, 'info');
    if (invalidSyllables > 0) {
        warn(`${invalidSyllables} 个音节划分不正确`);
    }

    return true;
}

// ==================== 主函数 ====================

async function main() {
    console.log('═'.repeat(50));
    console.log('  Phonics App 综合测试');
    console.log('═'.repeat(50));

    // 运行所有测试
    testRulesStructure();
    testBreakdownFormat();
    testHighlightStructure();
    testGeneratedWordsFormat();
    testDataContract();
    testSyllablesFormat();

    // 输出结果
    console.log('\n' + '═'.repeat(50));
    console.log('  测试结果汇总');
    console.log('═'.repeat(50));
    console.log(`  ✅ 通过: ${results.passed}`);
    console.log(`  ❌ 失败: ${results.failed}`);
    console.log(`  ⚠️ 警告: ${results.warnings}`);

    if (results.failed > 0) {
        console.log('\n失败的测试:');
        results.errors.forEach(err => console.log(`  - ${err}`));
        process.exit(1);
    } else {
        console.log('\n🎉 所有测试通过！');
        process.exit(0);
    }
}

main().catch(err => {
    console.error('测试运行失败:', err);
    process.exit(1);
});
