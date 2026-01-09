/**
 * Phonics V2 Core Engine
 * Handcrafted for Performance and Elegance
 */

const state = {
  currentCategory: null,
  currentPattern: null,
  patterns: [],
  words: [],
  allWords: [],
  wordLimit: 15,
  currentWordIndex: 0,
  theme: localStorage.getItem('theme') || 'light',
  dataLoaded: false
};

const dom = {
  main: document.getElementById('main'),
  app: document.getElementById('app')
};

// --- Initializers ---
async function init() {
  initTheme();

  // 加载数据
  state.dataLoaded = await loadPhonicsData();

  initRouter();
}

function initTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('theme', state.theme);
}

// --- Router ---
function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

function handleRoute() {
  const hash = window.location.hash || '#/';
  const path = hash.split('/')[1] || 'home';

  // Update Nav Links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === hash);
  });

  // Content Switching with simple fade effect
  dom.main.style.opacity = 0;
  setTimeout(() => {
    switch (path) {
      case 'home': renderHome(); break;
      case 'learn': renderLearn(); break;
      default: renderHome();
    }
    dom.main.style.opacity = 1;
  }, 150);
}

// --- Renderers ---

function renderHome() {
  const stats = state.dataLoaded ? `${getCategories().length} 个分类` : '加载中...';

  dom.main.innerHTML = `
        <section class="hero">
            <div class="container">
                <h1>自然拼读，从零开始</h1>
                <p>系统学习 100+ 发音规则，掌握「见词能读、听音能写」的核心能力。适合英语初学者和教学工作者。</p>
                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <a href="#/learn" class="btn btn-primary">开始学习</a>
                    <a href="https://github.com/cocojojo5213/phonics-app" target="_blank" class="btn" style="border: 1px solid var(--border-soft)">GitHub</a>
                </div>
                
                <div class="category-grid" style="margin-top: 5rem; text-align: left;">
                    <div class="card">
                        <h3 style="margin-bottom: 0.5rem;">科学分类</h3>
                        <p style="font-size: 0.9rem; color: var(--text-muted)">16 大发音分类，从字母到音节，循序渐进。</p>
                    </div>
                    <div class="card">
                        <h3 style="margin-bottom: 0.5rem;">拼读分解</h3>
                        <p style="font-size: 0.9rem; color: var(--text-muted)">每个单词标注音素拆解，彩色高亮核心发音。</p>
                    </div>
                    <div class="card">
                        <h3 style="margin-bottom: 0.5rem;">真人发音</h3>
                        <p style="font-size: 0.9rem; color: var(--text-muted)">高质量语音合成，支持单词和例句朗读。</p>
                    </div>
                </div>
            </div>
        </section>
    `;
}

async function renderLearn() {
  if (!state.dataLoaded) {
    dom.main.innerHTML = `<div class="container" style="padding-top: 100px; text-align: center;">
            <p>正在加载数据...</p>
        </div>`;
    return;
  }

  dom.main.innerHTML = `
        <div class="container" style="padding-top: 40px;">
            <div style="margin-bottom: 3rem;">
                <h2 style="font-size: 2rem; margin-bottom: 0.5rem;">学习路径</h2>
                <p style="color: var(--text-muted)">选择一个发音分类，开始您的阶梯式练习。</p>
            </div>
            
            <div class="category-grid" id="category-list">
                <!-- Loaded by JS -->
            </div>
            
            <div id="pattern-section" style="margin-top: 2rem; display:none;">
                <div id="pattern-list" class="pattern-box"></div>
                <div id="practice-container"></div>
            </div>
        </div>
    `;

  loadCategories();
}

function loadCategories() {
  const categories = getCategories();
  const container = document.getElementById('category-list');
  if (!container) return;

  container.innerHTML = categories.map(cat => `
        <div class="card" onclick="selectCategory('${cat.id}')">
            <h3 style="margin-bottom: 0.4rem;">${cat.name}</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted)">${cat.desc}</p>
        </div>
    `).join('');
}

function selectCategory(catId) {
  state.currentCategory = catId;
  const patternSection = document.getElementById('pattern-section');
  patternSection.style.display = 'block';

  // Smooth scroll to patterns
  patternSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const patterns = getPatternsByCategory(catId);
  const container = document.getElementById('pattern-list');

  if (patterns.length === 0) {
    container.style.display = 'none';
    document.getElementById('practice-container').innerHTML = `
            <div style="text-align: center; padding: 4rem; color: var(--text-muted);">
                该分类暂时没有数据，请选择其他分类练习。
            </div>
        `;
    return;
  }

  container.style.display = 'flex';
  container.innerHTML = patterns.map(p => `
        <button class="pattern-chip ${state.currentPattern === p.pattern ? 'active' : ''}" 
                onclick="selectPattern('${p.pattern}')">
            <span class="p-text">${p.pattern}</span>
            <span class="p-ipa">${p.pronunciation}</span>
        </button>
    `).join('');

  selectPattern(patterns[0].pattern);
}

function selectPattern(pattern) {
  state.currentPattern = pattern;
  const pInfo = getPatternInfo(state.currentCategory, pattern);

  state.allWords = pInfo.words || [];
  state.currentWordIndex = 0;

  renderPracticeAction(pInfo);
}

function nextWord() {
  if (state.currentWordIndex < state.allWords.length - 1) {
    state.currentWordIndex++;
    renderPracticeAction();
  }
}

function prevWord() {
  if (state.currentWordIndex > 0) {
    state.currentWordIndex--;
    renderPracticeAction();
  }
}

function renderPracticeAction(data) {
  const container = document.getElementById('practice-container');
  const pInfo = data || getPatternInfo(state.currentCategory, state.currentPattern);
  if (!pInfo) return;

  const word = state.allWords[state.currentWordIndex];
  if (!word) {
    container.innerHTML = `<div class="card" style="margin-top:2rem">请选择一个有效的发音模式</div>`;
    return;
  }

  container.innerHTML = `
        <div class="practice-stage" style="margin-top: 3rem; position: relative;">
            <!-- Header Info (Clickable for Real Human Voice) -->
            <div style="text-align: center; margin-bottom: 3rem; cursor: pointer;" onclick="app.playPattern()">
                <div style="font-size: 5rem; font-family: Outfit; font-weight: 800; line-height: 1; color: var(--text-main);">${pInfo.pattern}</div>
                <div style="font-size: 1.5rem; color: var(--text-muted); font-weight: 300; margin-top: 0.5rem;">${pInfo.pronunciation}</div>
            </div>

            <!-- Flashcard Frame -->
            <div class="flashcard-wrapper">
                <button class="nav-btn prev" onclick="prevWord()" ${state.currentWordIndex === 0 ? 'disabled' : ''}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
                </button>

                <div class="card flashcard active" id="current-flashcard" onclick="app.playWord('${word.word}')">
                    <div class="word-main" style="font-size: 4rem; margin-bottom: 0.5rem;">${formatWord(word.word, pInfo.pattern)}</div>
                    
                    ${word.breakdown ? `
                        <div class="breakdown-display">
                            ${formatBreakdown(word.breakdown, word.highlight, pInfo.pattern, word.tokenFlags)}
                        </div>
                    ` : ''}
                    
                    ${formatSyllables(word.syllables)}
                    
                    <div class="word-meaning" style="font-size: 1.5rem; margin-bottom: 2rem; color: var(--text-muted);">${word.meaning || ''}</div>
                    
                    ${word.sentence ? `
                        <div class="sentence-box" onclick="app.playSentence(event, '${word.word}', '${escapeHtml(word.sentence)}')">
                            <div class="sentence-en">${word.sentence}</div>
                            <div class="sentence-cn">${word.sentence_cn || ''}</div>
                            <div class="play-tag">🔊 点击阅读例句</div>
                        </div>
                    ` : ''}
                </div>

                <button class="nav-btn next" onclick="nextWord()" ${state.currentWordIndex === state.allWords.length - 1 ? 'disabled' : ''}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
                </button>
            </div>

            <div style="text-align: center; margin-top: 2rem; color: var(--text-muted); font-size: 0.9rem; font-weight: 500;">
                ${state.currentWordIndex + 1} / ${state.allWords.length}
            </div>
            <div class="mobile-hint" style="text-align: center; margin-top: 1rem; font-size: 0.8rem; color: var(--slate-400); display: none;">
                左右滑动切换单词
            </div>
        </div>
    `;

  initTouchEvents();
}

let touchStartX = 0;
function initTouchEvents() {
  const card = document.getElementById('current-flashcard');
  if (!card) return;

  card.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  card.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    handleSwipe(touchStartX, touchEndX);
  }, { passive: true });
}

function handleSwipe(start, end) {
  const threshold = 50;
  if (start - end > threshold) {
    nextWord(); // Swipe Left
  } else if (end - start > threshold) {
    prevWord(); // Swipe Right
  }
}

// 音素颜色配置
const PHONEME_COLORS = [
  'var(--phoneme-1)',  // 蓝色
  'var(--phoneme-2)',  // 绿色
  'var(--phoneme-3)',  // 橙色
  'var(--phoneme-4)',  // 紫色
  'var(--phoneme-5)',  // 红色
  'var(--phoneme-6)',  // 青色
];

// 元音和 digraph 的识别
const VOWELS = ['a', 'e', 'i', 'o', 'u'];
const DIGRAPHS = ['sh', 'ch', 'th', 'wh', 'ph', 'ck', 'ng', 'nk', 'tch', 'dge',
  'ai', 'ay', 'ee', 'ea', 'oa', 'ow', 'oi', 'oy', 'ou', 'au', 'aw', 'oo', 'igh',
  'ar', 'er', 'ir', 'or', 'ur'];

function formatWord(word, pattern, highlight) {
  // 简单高亮模式（向后兼容）
  const regex = new RegExp(`(${escapeRegex(pattern)})`, 'gi');
  return word.replace(regex, `<span class="word-highlight">$1</span>`);
}

function formatBreakdown(breakdown, highlight, pattern, tokenFlags = []) {
  if (!breakdown) return '';

  const tokens = breakdown.split('|');
  const highlightValue = highlight?.value?.toLowerCase() || pattern?.toLowerCase() || '';
  const highlightType = highlight?.type || 'token';
  const highlightIndices = highlight?.indices || [];

  // 创建静音索引 Set
  const silentIndices = new Set();
  if (tokenFlags && Array.isArray(tokenFlags)) {
    tokenFlags.forEach(flag => {
      if (flag.flag === 'silent') {
        silentIndices.add(flag.index);
      }
    });
  }

  return tokens.map((token, index) => {
    const tokenLower = token.toLowerCase();
    let isHighlight = false;
    let isSilent = silentIndices.has(index);

    // 检查是否是高亮部分
    if (highlightType === 'split') {
      // Split digraph（如 a_e）：高亮 indices 数组中的位置
      isHighlight = highlightIndices.includes(index);
    } else {
      // Token 类型：匹配完整 token
      isHighlight = highlightValue && tokenLower === highlightValue;
    }

    // 分配颜色索引（循环使用）
    const colorIndex = index % PHONEME_COLORS.length;

    // 判断音素类型
    let typeClass = 'phoneme-consonant';
    if (DIGRAPHS.includes(tokenLower)) {
      typeClass = 'phoneme-digraph';
    } else if (VOWELS.includes(tokenLower)) {
      typeClass = 'phoneme-vowel';
    }

    // 静音字母特殊处理
    if (isSilent) {
      typeClass = 'phoneme-silent';
    }

    return `<span class="phoneme ${typeClass} ${isHighlight ? 'phoneme-focus' : ''}" style="--phoneme-color: ${PHONEME_COLORS[colorIndex]}">${token}</span>`;
  }).join('<span class="phoneme-sep">·</span>');
}

// 音节显示格式化
function formatSyllables(syllables) {
  if (!syllables || !Array.isArray(syllables) || syllables.length <= 1) {
    return ''; // 单音节不显示
  }

  // 提取每个音节的字母（去掉 | 分隔符）
  const syllableText = syllables.map(s => s.replace(/\|/g, '')).join(' · ');
  return `<div class="syllables-display">${syllableText}</div>`;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// --- Global App Object ---
window.app = {
  toggleTheme: toggleTheme,
  playPattern: () => {
    AudioLoader.playPattern(state.currentCategory, state.currentPattern);
  },
  playWord: (word) => {
    AudioLoader.playWord(state.currentCategory, state.currentPattern, word);
  },
  playSentence: (event, word, sentence) => {
    if (event) event.stopPropagation();
    AudioLoader.playSentence(state.currentCategory, state.currentPattern, word, sentence);
  }
};

// --- Start ---
window.onload = init;
