/**
 * 音频加载器
 * 
 * 支持两种模式：
 * 1. Bundle 模式：从打包的 JSON 文件加载（优先）
 * 2. 直接模式：从单独的 MP3 文件加载（回退）
 * 
 * 特性：
 * - 按需加载 bundle
 * - 自动缓存已加载的 bundle
 * - 支持预加载
 * - 平滑降级到浏览器 TTS
 */

const AudioLoader = (function () {
    // 缓存已加载的 bundle
    const bundleCache = new Map();

    // 当前正在加载的 bundle（避免重复请求）
    const loadingBundles = new Map();

    // 当前正在播放的音频（用于停止之前的播放）
    let currentAudio = null;

    // 正在播放的请求ID（用于防止重复播放）
    let currentPlayId = 0;

    // 正在加载的音频（用于显示加载状态）
    const loadingAudios = new Set();

    // 配置
    const config = {
        bundlesPath: 'bundles',
        audioPath: 'audio',
        useBundles: false, // 默认关闭：仅在检测到 bundles 可用时开启
        preloadEnabled: true,
        bundleIndex: null
    };

    /**
     * 停止当前正在播放的音频
     */
    function stopCurrent() {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            currentAudio = null;
        }
        // 同时取消浏览器 TTS
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
        }
    }

    /**
     * 显示加载状态
     */
    function showLoadingState(elementSelector) {
        const element = document.querySelector(elementSelector);
        if (element) {
            element.classList.add('audio-loading');
        }
    }

    /**
     * 隐藏加载状态
     */
    function hideLoadingState(elementSelector) {
        const element = document.querySelector(elementSelector);
        if (element) {
            element.classList.remove('audio-loading');
        }
    }

    /**
     * bundles 检测（懒加载 + 只检测一次）
     *
     * 目标：
     * - 没有 bundles 时不产生 /bundles/... 404 噪音
     * - 有 bundles 时才启用 bundle 加速
     */
    let bundlesAvailabilityPromise = null;

    async function checkBundlesAvailable() {
        try {
            const res = await fetch(`${config.bundlesPath}/index.json`, { cache: 'force-cache' });
            if (!res.ok) {
                config.useBundles = false;
                config.bundleIndex = null;
                return false;
            }

            const index = await res.json();
            config.bundleIndex = index;

            // 只有当 index 里确实声明了 bundles 时才开启
            config.useBundles = !!index && typeof index === 'object' && Object.keys(index).length > 0;
            return config.useBundles;
        } catch (e) {
            config.useBundles = false;
            config.bundleIndex = null;
            return false;
        }
    }

    async function ensureBundlesChecked() {
        if (!bundlesAvailabilityPromise) {
            bundlesAvailabilityPromise = checkBundlesAvailable();
        }
        return bundlesAvailabilityPromise;
    }

    function isBundleAvailable(category, pattern) {
        const index = config.bundleIndex;
        if (!index || typeof index !== 'object') return false;

        const fileName = pattern.replace('_', '-');
        const entry = index[category];

        // 支持几种常见 index 结构：
        // - { [category]: true }
        // - { [category]: ["a-e", "ai", ...] }
        // - { [category]: { "a-e": true, "ai": true } }
        if (entry === true) return true;
        if (Array.isArray(entry)) return entry.includes(fileName) || entry.includes(pattern);
        if (entry && typeof entry === 'object') return !!entry[fileName] || !!entry[pattern];
        return false;
    }


    /**
     * 加载指定 pattern 的 bundle
     */
    async function loadBundle(category, pattern) {
        const key = `${category}/${pattern}`;

        // 已缓存
        if (bundleCache.has(key)) {
            return bundleCache.get(key);
        }

        // 正在加载
        if (loadingBundles.has(key)) {
            return loadingBundles.get(key);
        }

        // 开始加载
        const loadPromise = (async () => {
            try {
                // pattern 中的 _ 在文件名中是 -（如 a_e -> a-e.json）
                const fileName = pattern.replace('_', '-');
                const url = `${config.bundlesPath}/${category}/${fileName}.json`;

                const res = await fetch(url);
                if (!res.ok) {
                    throw new Error(`Bundle not found: ${url}`);
                }

                const bundle = await res.json();
                bundleCache.set(key, bundle);
                // console.log(`📦 Bundle 已加载: ${key}`);
                return bundle;
            } catch (e) {
                console.warn(`Bundle 加载失败: ${key}`, e);
                return null;
            } finally {
                loadingBundles.delete(key);
            }
        })();

        loadingBundles.set(key, loadPromise);
        return loadPromise;
    }

    /**
     * 从 bundle 中获取音频并播放
     */
    function playFromBundle(bundle, audioKey) {
        if (!bundle || !bundle.audios || !bundle.audios[audioKey]) {
            return false;
        }

        try {
            // 先停止之前的音频
            stopCurrent();

            const audio = new Audio(bundle.audios[audioKey]);
            currentAudio = audio; // 保存当前音频实例

            audio.onended = () => {
                if (currentAudio === audio) {
                    currentAudio = null;
                }
            };

            audio.play().catch(e => console.warn('播放失败:', e));
            return true;
        } catch (e) {
            console.warn('创建音频失败:', e);
            return false;
        }
    }

    /**
     * 直接从文件播放（回退模式）
     */
    function playFromFile(audioPath, fallbackText) {
        return new Promise((resolve) => {
            // 先停止之前的音频
            stopCurrent();

            const audio = new Audio(audioPath);
            currentAudio = audio; // 保存当前音频实例

            audio.onended = () => {
                if (currentAudio === audio) {
                    currentAudio = null;
                }
                resolve(true);
            };
            audio.onerror = () => {
                if (currentAudio === audio) {
                    currentAudio = null;
                }
                if (fallbackText) {
                    speakWithBrowser(fallbackText);
                }
                resolve(false);
            };

            audio.play().catch(() => {
                if (currentAudio === audio) {
                    currentAudio = null;
                }
                if (fallbackText) {
                    speakWithBrowser(fallbackText);
                }
                resolve(false);
            });
        });
    }

    /**
     * 浏览器 TTS 回退
     */
    function speakWithBrowser(text) {
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.8;

            const voices = speechSynthesis.getVoices();
            const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Female'))
                || voices.find(v => v.lang.startsWith('en'));
            if (englishVoice) {
                utterance.voice = englishVoice;
            }

            speechSynthesis.speak(utterance);
        }
    }

    /**
     * 播放 pattern 发音
     */
    async function playPattern(category, pattern) {
        // 尝试 bundle 模式（仅当 index 声明可用时才加载，避免 404）
        await ensureBundlesChecked();
        if (config.useBundles && category && pattern && isBundleAvailable(category, pattern)) {
            const bundle = await loadBundle(category, pattern);
            if (bundle && playFromBundle(bundle, '_pattern')) {
                return;
            }
        }

        // 回退：直接从专门存写真人录音的文件夹加载
        // 路径: audio/patterns/at.mp3
        const fileName = pattern.replace('_', '-');
        await playFromFile(
            `${config.audioPath}/patterns/${fileName}.mp3`,
            pattern
        );
    }

    /**
     * 播放规则讲解
     */
    async function playRule(category, pattern) {
        // 尝试 bundle 模式（仅当 index 声明可用时才加载，避免 404）
        await ensureBundlesChecked();
        if (config.useBundles && category && pattern && isBundleAvailable(category, pattern)) {
            const bundle = await loadBundle(category, pattern);
            if (bundle && playFromBundle(bundle, '_rule')) {
                return;
            }
        }

        // 回退：从音频目录加载
        const fileName = pattern.replace('_', '-');
        await playFromFile(`${config.audioPath}/rules/${fileName}_rule.mp3`);
    }

    /**
     * 播放学习技巧
     */
    async function playTip(category, pattern) {
        // 尝试 bundle 模式（仅当 index 声明可用时才加载，避免 404）
        await ensureBundlesChecked();
        if (config.useBundles && category && pattern && isBundleAvailable(category, pattern)) {
            const bundle = await loadBundle(category, pattern);
            if (bundle && playFromBundle(bundle, '_tip')) {
                return;
            }
        }

        // 回退：从音频目录加载
        const fileName = pattern.replace('_', '-');
        await playFromFile(`${config.audioPath}/rules/${fileName}_tip.mp3`);
    }

    /**
     * 播放单词发音
     */
    async function playWord(category, pattern, word) {
        const wordLower = word.toLowerCase();

        // 尝试 bundle 模式（仅当 index 声明可用时才加载，避免 404）
        await ensureBundlesChecked();
        if (config.useBundles && category && pattern && isBundleAvailable(category, pattern)) {
            const bundle = await loadBundle(category, pattern);
            if (bundle && playFromBundle(bundle, wordLower)) {
                return;
            }
        }

        // 回退：从音频目录加载
        await playFromFile(
            `${config.audioPath}/${wordLower}.mp3`,
            word
        );
    }

    function normalizeSentence(text) {
        return text.trim().replace(/\s+/g, ' ');
    }

    async function getSentenceHash(text) {
        if (!text) {
            return null;
        }

        const normalized = normalizeSentence(text);
        if (!('crypto' in window) || !window.crypto.subtle) {
            return null;
        }

        const data = new TextEncoder().encode(normalized);
        const hashBuffer = await window.crypto.subtle.digest('SHA-1', data);
        return Array.from(new Uint8Array(hashBuffer))
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * 播放例句
     */
    async function playSentence(category, pattern, word, sentenceText) {
        const wordLower = (word || '').toLowerCase();
        const sentenceHash = sentenceText ? await getSentenceHash(sentenceText) : null;

        // 尝试 bundle 模式（仅当 index 声明可用时才加载，避免 404）
        await ensureBundlesChecked();
        if (config.useBundles && category && pattern && isBundleAvailable(category, pattern)) {
            const bundle = await loadBundle(category, pattern);
            if (bundle && sentenceHash && playFromBundle(bundle, sentenceHash)) {
                return;
            }
            if (bundle && wordLower && playFromBundle(bundle, `${wordLower}_sentence`)) {
                return;
            }
        }

        // 回退：从音频目录加载
        if (sentenceHash) {
            const played = await playFromFile(`${config.audioPath}/sentences/${sentenceHash}.mp3`);
            if (played) {
                return;
            }
        }

        if (wordLower) {
            const played = await playFromFile(`${config.audioPath}/sentences/${wordLower}.mp3`);
            if (!played && sentenceText) {
                speakWithBrowser(sentenceText);
            }
        } else if (sentenceText) {
            speakWithBrowser(sentenceText);
        }
    }


    /**
     * 播放拼读音频 (r-ai-n -> "r...ai...n...rain")
     */
    async function playSpelling(category, pattern, word) {
        const wordLower = (word || '').toLowerCase();

        // 尝试 bundle 模式（仅当 index 声明可用时才加载，避免 404）
        await ensureBundlesChecked();
        if (config.useBundles && category && pattern && isBundleAvailable(category, pattern)) {
            const bundle = await loadBundle(category, pattern);
            if (bundle && playFromBundle(bundle, `${wordLower}_spelling`)) {
                return;
            }
        }

        // 回退：从拼读音频目录加载
        await playFromFile(
            `${config.audioPath}/spelling/${wordLower}.mp3`,
            word
        );
    }

    /**
     * 预加载 bundle（用于提前加载即将使用的内容）
     */
    function preloadBundle(category, pattern) {
        if (!config.preloadEnabled) return;

        // 预加载不触发 bundles 检测，避免无意义网络请求
        if (!bundlesAvailabilityPromise) return;

        if (config.useBundles && category && pattern && isBundleAvailable(category, pattern)) {
            loadBundle(category, pattern);
        }
    }

    /**
     * 获取缓存统计
     */
    function getCacheStats() {
        let totalSize = 0;
        bundleCache.forEach((bundle) => {
            totalSize += JSON.stringify(bundle).length;
        });

        return {
            bundleCount: bundleCache.size,
            totalSizeKB: Math.round(totalSize / 1024)
        };
    }

    /**
     * 清空缓存
     */
    function clearCache() {
        bundleCache.clear();
        console.log('Bundle 缓存已清空');
    }

    // 初始化：检查 bundles（只做一次，结果写入 config）
    ensureBundlesChecked();

    // 预加载语音列表
    if ('speechSynthesis' in window) {
        speechSynthesis.getVoices();
        speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
    }

    // 导出 API
    return {
        playPattern,
        playRule,
        playTip,
        playWord,
        playSentence,
        playSpelling,
        preloadBundle,
        loadBundle,
        getCacheStats,
        clearCache,
        speakWithBrowser,
        stopCurrent,
        config
    };
})();

// 兼容全局访问
window.AudioLoader = AudioLoader;

