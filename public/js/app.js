/**
 * Phonics App - 简洁版
 */

const API = '/api/phonics';

// 状态
const state = {
  currentCategory: null,
  currentPattern: null,
  currentPronunciation: null,
  patterns: [],
  words: [],
  allWords: [],  // 保存所有词，用于重新抽取
  wordLimit: 10, // 每次显示的词数
  expanded: false
};

// DOM
const main = document.getElementById('main');

// 路由
function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

function handleRoute() {
  const hash = window.location.hash || '#/';
  const [, path] = hash.match(/#\/(\w*)/) || [, ''];

  document.querySelectorAll('.nav-link').forEach(link => {
    const page = link.dataset.page;
    link.classList.toggle('active', page === path || (path === '' && page === 'home'));
  });

  switch (path) {
    case '':
    case 'home':
      renderHome();
      break;
    case 'learn':
      renderLearn();
      break;
    default:
      renderHome();
  }
}

// 首页
function renderHome() {
  main.innerHTML = `
        <div class="home">
            <h1>真正从基础开始学英语</h1>
            <p>通过自然拼读规则，学会「看词能读、听音能写」</p>
            <a href="#/learn" class="btn-start">开始学习</a>
        </div>
    `;
}

// 学习页面
async function renderLearn() {
  main.innerHTML = `
        <div class="learn-page">
            <h2>选择学习内容</h2>
            <div class="categories" id="categories"></div>
            <div class="patterns" id="patterns"></div>
            <div id="practice"></div>
        </div>
    `;

  await loadCategories();
}

// 加载分类
async function loadCategories() {
  try {
    const res = await fetch(`${API}/categories`);
    const data = await res.json();

    const container = document.getElementById('categories');
    container.innerHTML = data.categories.map(cat => `
            <div class="category-card ${state.currentCategory === cat.id ? 'active' : ''}" 
                 data-category="${cat.id}"
                 onclick="selectCategory('${cat.id}')">
                <h3>${cat.name}</h3>
                <span>${cat.count} 个发音</span>
            </div>
        `).join('');

    // 默认选中第一个
    if (!state.currentCategory && data.categories.length > 0) {
      selectCategory(data.categories[0].id);
    }
  } catch (e) {
    console.error('加载分类失败:', e);
  }
}

// 选择分类
async function selectCategory(categoryId) {
  state.currentCategory = categoryId;
  state.currentPattern = null;

  // 更新分类卡片状态 - 使用 data-category 精确匹配
  document.querySelectorAll('.category-card').forEach(card => {
    card.classList.toggle('active', card.dataset.category === categoryId);
  });

  // 加载该分类的发音模式
  try {
    const res = await fetch(`${API}/category/${categoryId}`);
    const data = await res.json();
    state.patterns = data.patterns;

    const container = document.getElementById('patterns');
    container.innerHTML = data.patterns.map(p => `
            <div class="pattern-chip ${state.currentPattern === p.pattern ? 'active' : ''}"
                 data-pattern="${p.pattern}"
                 onclick="selectPattern('${p.pattern}')">
                <span class="pattern-text">${p.pattern}</span>
                <span class="ipa">${p.pronunciation}</span>
            </div>
        `).join('');

    // 默认选中第一个
    if (data.patterns.length > 0) {
      selectPattern(data.patterns[0].pattern);
    }
  } catch (e) {
    console.error('加载发音模式失败:', e);
  }
}

// 选择发音模式
async function selectPattern(pattern, expand = false) {
  state.currentPattern = pattern;
  state.expanded = expand;

  // 更新芯片状态 - 使用 data-pattern 精确匹配
  document.querySelectorAll('.pattern-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.pattern === pattern);
  });

  // 加载单词
  await loadWords(pattern, expand);
}

// 加载单词
async function loadWords(pattern, expand = false) {
  const container = document.getElementById('practice');
  container.innerHTML = '<div class="loading">加载中...</div>';

  try {
    // 请求更多词（100个），让前端来控制显示数量
    const url = `${API}/pattern/${state.currentCategory}/${pattern}?limit=100`;
    const res = await fetch(url);
    const data = await res.json();

    // 保存所有词
    state.allWords = data.words || [];
    state.currentPronunciation = data.pronunciation;

    // 按当前限制随机抽取
    shuffleAndDisplay();
  } catch (e) {
    console.error('加载单词失败:', e);
    container.innerHTML = '<div class="empty">加载失败</div>';
  }
}

// 随机抽取并显示词汇
function shuffleAndDisplay() {
  // Fisher-Yates 洗牌
  const shuffled = [...state.allWords];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // 按限制截取
  state.words = shuffled.slice(0, state.wordLimit);

  renderPractice({
    pattern: state.currentPattern,
    pronunciation: state.currentPronunciation,
    words: state.words,
    totalCount: state.allWords.length
  });
}

// 设置词数并刷新
function setWordLimit(limit) {
  state.wordLimit = limit;
  shuffleAndDisplay();
}


// 渲染练习区域
function renderPractice(data) {
  const container = document.getElementById('practice');

  const wordsHtml = data.words.map(w => {
    const wordDisplay = w.prefix +
      `<span class="highlight">${w.highlight}</span>` +
      w.suffix;

    return `
            <div class="word-card" onclick="playWord('${w.word}')">
                <div class="word">${wordDisplay}</div>
                ${w.meaning ? `<div class="meaning">${w.meaning}</div>` : ''}
                ${w.phonetic ? `<div class="phonetic">${w.phonetic}</div>` : ''}
            </div>
        `;
  }).join('');

  // 词数选择按钮
  const limitBtns = [5, 10, 15, 30].map(n =>
    `<button class="limit-btn ${state.wordLimit === n ? 'active' : ''}" onclick="setWordLimit(${n})">${n}</button>`
  ).join('');

  container.innerHTML = `
        <div class="practice-area">
            <div class="practice-header">
                <div class="pattern">${data.pattern}</div>
                <div class="ipa">${data.pronunciation}</div>
                <button class="play-btn" onclick="playPatternSound()">▶</button>
            </div>
            <div class="word-controls">
                <div class="word-count">
                    显示 ${data.words.length} 个词，词库共 ${data.totalCount || data.words.length} 个词
                </div>
                <div class="limit-selector">
                    <span>每次显示：</span>${limitBtns}
                    <button class="shuffle-btn" onclick="shuffleAndDisplay()">🔀 换一批</button>
                </div>
            </div>
            <div class="word-list">${wordsHtml}</div>
            <div class="load-more">
                <button onclick="aiExpand()" class="ai-btn">🤖 AI扩词，丰富词库</button>
            </div>
        </div>
    `;
}

// 播放发音模式的声音（使用 SSML IPA 发音）
async function playPatternSound() {
  const pattern = state.currentPattern;
  try {
    // 添加时间戳防止浏览器缓存
    const audio = new Audio(`/api/tts/pattern/${encodeURIComponent(pattern)}?t=${Date.now()}`);
    await audio.play();
  } catch (e) {
    console.error('播放发音失败:', e);
  }
}

// 播放发音
async function playSound(text) {
  try {
    const audio = new Audio(`/api/tts/word/${encodeURIComponent(text)}?t=${Date.now()}`);
    await audio.play();
  } catch (e) {
    console.error('播放失败:', e);
  }
}

// 播放单词
async function playWord(word) {
  await playSound(word);
}

// AI 扩词
async function aiExpand() {
  const pattern = state.currentPattern;
  const categoryId = state.currentCategory;
  const container = document.getElementById('practice');
  const btn = container.querySelector('.ai-btn');

  // 获取用户的 API 设置
  const settings = getApiSettings();

  if (!settings.apiKey) {
    alert('请先配置 API Key！\n点击右上角 ⚙️ 按钮进行设置');
    openSettings();
    return;
  }

  if (btn) btn.textContent = '🤖 加载中...';

  try {
    const res = await fetch(`${API}/ai-expand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryId,
        pattern,
        count: 20,
        // 用户的 API 设置（在服务端使用，不保存）
        userApi: {
          apiKey: settings.apiKey,
          apiBase: settings.apiBase || null,
          model: settings.model || null
        }
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error + (data.hint ? `\n${data.hint}` : ''));
      if (btn) btn.textContent = '🤖 AI扩词';
      return;
    }

    if (data.newWords && data.newWords.length > 0) {
      // 合并新词到当前列表
      const currentWordSet = new Set(state.words.map(w => w.word));
      const uniqueNewWords = data.newWords.filter(w => !currentWordSet.has(w.word));

      state.words = [...state.words, ...uniqueNewWords];

      renderPractice({
        pattern: pattern,
        pronunciation: state.currentPronunciation,
        words: state.words
      });

      alert(`✅ AI 新增 ${uniqueNewWords.length} 个单词！`);
    } else {
      alert('AI 没有找到更多新单词');
    }
  } catch (e) {
    console.error('AI 扩词失败:', e);
    alert('AI 扩词失败: ' + e.message);
  }

  if (btn) btn.textContent = '🤖 AI扩词';
}

// 清空 AI 扩词
async function clearAiWords() {
  if (!confirm('确定要清空该模式下所有由 AI 扩展的单词吗？（讲义原词会保留）')) return;

  const pattern = state.currentPattern;
  const categoryId = state.currentCategory;

  try {
    const res = await fetch(`${API}/ai-words/${categoryId}/${pattern}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      // 重新加载当前页面数据
      loadPattern(categoryId, pattern);
      alert('已清空 AI 扩词');
    }
  } catch (e) {
    console.error('清空失败:', e);
    alert('清空失败');
  }
}
// ============== API 设置管理 ==============

const STORAGE_KEY = 'phonics_api_settings';

// 打开设置弹窗
function openSettings() {
  const modal = document.getElementById('settings-modal');
  modal.style.display = 'flex';

  // 加载已保存的设置
  const settings = getApiSettings();
  document.getElementById('api-key').value = settings.apiKey || '';
  document.getElementById('api-base').value = settings.apiBase || '';
  document.getElementById('api-model').value = settings.model || '';
}

// 关闭设置弹窗
function closeSettings() {
  document.getElementById('settings-modal').style.display = 'none';
}

// 保存设置到 localStorage
function saveSettings() {
  const settings = {
    apiKey: document.getElementById('api-key').value.trim(),
    apiBase: document.getElementById('api-base').value.trim(),
    model: document.getElementById('api-model').value.trim()
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  closeSettings();

  const modelInfo = settings.model || 'gpt-4o-mini';
  alert(`✅ 设置已保存（${modelInfo}）`);
}

// 清除设置
function clearSettings() {
  if (confirm('确定清除 API 设置吗？')) {
    localStorage.removeItem(STORAGE_KEY);
    document.getElementById('api-key').value = '';
    document.getElementById('api-base').value = '';
    document.getElementById('api-model').value = '';
    alert('设置已清除');
  }
}

// 获取保存的设置
function getApiSettings() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

// 检查是否已配置 API
function hasApiKey() {
  const settings = getApiSettings();
  return !!settings.apiKey;
}

// 点击弹窗背景关闭（不是拖拽）
let modalMouseDownTarget = null;
document.getElementById('settings-modal')?.addEventListener('mousedown', (e) => {
  modalMouseDownTarget = e.target;
});
document.getElementById('settings-modal')?.addEventListener('mouseup', (e) => {
  // 只有当 mousedown 和 mouseup 都在背景上时才关闭
  if (e.target.classList.contains('modal') && modalMouseDownTarget?.classList.contains('modal')) {
    closeSettings();
  }
  modalMouseDownTarget = null;
});

// ============== 自动扩词控制 ==============

let autoExpandInterval = null;

function openAutoExpand() {
  document.getElementById('auto-expand-modal').style.display = 'flex';
  refreshAutoExpandStatus();
}

function closeAutoExpand() {
  document.getElementById('auto-expand-modal').style.display = 'none';
  if (autoExpandInterval) {
    clearInterval(autoExpandInterval);
    autoExpandInterval = null;
  }
}

async function refreshAutoExpandStatus() {
  try {
    const res = await fetch(`${API}/auto-expand/status`);
    const status = await res.json();

    document.getElementById('ae-running').textContent = status.isRunning ? '运行中' : '未运行';
    document.getElementById('ae-running').style.color = status.isRunning ? '#4CAF50' : '#888';
    document.getElementById('ae-keys').textContent = status.keyCount || '0';
    document.getElementById('ae-pattern').textContent = status.currentPattern || '-';
    document.getElementById('ae-words').textContent = status.totalWords || '0';

    document.getElementById('ae-start-btn').disabled = status.isRunning;
    document.getElementById('ae-stop-btn').disabled = !status.isRunning;
  } catch (e) {
    console.error('获取状态失败:', e);
  }
}

async function startAutoExpand() {
  try {
    const res = await fetch(`${API}/auto-expand/start`, { method: 'POST' });
    const result = await res.json();

    if (result.success) {
      alert(`✅ 已开始自动扩词，共 ${result.keyCount} 个 Key`);
      // 定时刷新状态
      autoExpandInterval = setInterval(refreshAutoExpandStatus, 2000);
      refreshAutoExpandStatus();
    } else {
      alert(`❌ ${result.message}`);
    }
  } catch (e) {
    alert('启动失败: ' + e.message);
  }
}

async function stopAutoExpand() {
  try {
    const res = await fetch(`${API}/auto-expand/stop`, { method: 'POST' });
    const result = await res.json();

    if (result.success) {
      alert('✅ 正在停止...');
      if (autoExpandInterval) {
        clearInterval(autoExpandInterval);
        autoExpandInterval = null;
      }
      setTimeout(refreshAutoExpandStatus, 1000);
    } else {
      alert(`❌ ${result.message}`);
    }
  } catch (e) {
    alert('停止失败: ' + e.message);
  }
}

// 启动
initRouter();
