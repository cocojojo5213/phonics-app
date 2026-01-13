const CACHE_NAME = 'phonics-v2-cache-v11';
const AUDIO_CACHE_NAME = 'phonics-v2-audio-v1';
const MAX_AUDIO_ENTRIES = 200;
const MAX_AUDIO_BYTES = 30 * 1024 * 1024; // 30MB（移动端更保守，避免占满配额）


const ASSET_VERSION = '20260113a';
const ASSETS_TO_CACHE = [
    './',
    './index.html',

    // 版本化资源（与 index.html 保持一致，确保离线可用）
    `./css/style.css?v=${ASSET_VERSION}`,
    `./js/app.js?v=${ASSET_VERSION}`,
    `./js/audio-loader.js?v=${ASSET_VERSION}`,
    `./js/data-loader.js?v=${ASSET_VERSION}`,


    // 兼容：无 query 版本
    './css/style.css',
    './js/app.js',
    './js/audio-loader.js',
    './js/data-loader.js',

    './data/rules-master.json'
];

// 安装阶段：预缓存核心资源
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

// 激活阶段：清理旧缓存
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            const keep = new Set([
                CACHE_NAME,
                AUDIO_CACHE_NAME
            ]);
            return Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key)));
        })
    );
});

async function trimCache(cacheName, maxEntries, maxBytes) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    const shouldTrimByEntries = typeof maxEntries === 'number' && maxEntries >= 0;
    const shouldTrimByBytes = typeof maxBytes === 'number' && maxBytes > 0;

    if (!shouldTrimByEntries && !shouldTrimByBytes) return;

    let totalBytes = 0;
    if (shouldTrimByBytes) {
        for (const req of keys) {
            const res = await cache.match(req);
            const len = res ? parseInt(res.headers.get('content-length') || '0', 10) : 0;
            totalBytes += Number.isFinite(len) ? len : 0;
        }
    }

    for (const req of keys) {
        const tooManyEntries = shouldTrimByEntries && (await cache.keys()).length > maxEntries;
        const tooManyBytes = shouldTrimByBytes && totalBytes > maxBytes;
        if (!tooManyEntries && !tooManyBytes) break;

        const res = await cache.match(req);
        const len = res ? parseInt(res.headers.get('content-length') || '0', 10) : 0;
        if (Number.isFinite(len)) totalBytes -= len;
        await cache.delete(req);
    }
}


// 请求拦截：缓存优先策略（针对资源），音频单独缓存并限量
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    // 避免缓存 Range 请求（音频在移动端经常走分段请求，缓存会造成异常/膨胀）
    if (event.request.headers.has('range')) {
        event.respondWith(fetch(event.request));
        return;
    }

    const url = new URL(event.request.url);
    const isSameOrigin = url.origin === self.location.origin;


    // 音频：单独缓存，避免挤占核心资源缓存，并限制条目数量
    if (isSameOrigin && url.pathname.startsWith('/audio/')) {
        event.respondWith(
            (async () => {
                const audioCache = await caches.open(AUDIO_CACHE_NAME);
                const cached = await audioCache.match(event.request);
                if (cached) return cached;

                const response = await fetch(event.request);
                if (response.ok) {
                    audioCache.put(event.request, response.clone());
                    trimCache(AUDIO_CACHE_NAME, MAX_AUDIO_ENTRIES, MAX_AUDIO_BYTES);
                }
                return response;
            })()
        );
        return;
    }

    // 其他静态资源：核心缓存优先
    event.respondWith(
        (async () => {
            const cachedResponse = await caches.match(event.request);
            if (cachedResponse) return cachedResponse;

            const response = await fetch(event.request);
            if (!response.ok) return response;

            // 只缓存同源静态资源（避免跨域缓存导致 install/fetch 不稳定）
            if (isSameOrigin && (url.pathname.startsWith('/css/') || url.pathname.startsWith('/js/') || url.pathname.startsWith('/data/') || url.pathname.startsWith('/fonts/'))) {
                const cache = await caches.open(CACHE_NAME);
                cache.put(event.request, response.clone());
            }

            return response;
        })()
    );
});
