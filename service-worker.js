const VERSION = 'bigback-v1';
const CACHE_NAME = `bigback-cache-${VERSION}`;

const PRECACHE_URLS = [
    './',
    './index.html',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-192.png',
    './icons/icon-maskable-512.png',
    './assets/music/jimbob-theme.mp3',
    './src/systems/economy.js',
    './src/ui/hud-logic.js',
    './src/ui/hud-overlay.js',
    './vendor/three/build/three.module.js',
    './vendor/three/examples/jsm/webxr/VRButton.js',
    './vendor/three/examples/jsm/webxr/XRControllerModelFactory.js',
    './vendor/three/examples/jsm/loaders/RGBELoader.js',
    './vendor/three/examples/jsm/loaders/GLTFLoader.js',
    './vendor/three/examples/jsm/objects/Sky.js',
    './vendor/three/examples/jsm/utils/BufferGeometryUtils.js',
    './vendor/three/examples/jsm/libs/motion-controllers.module.js',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
            .then(() => self.clients.matchAll())
            .then((clients) => {
                clients.forEach((client) => client.postMessage({ type: 'BIGBACK_SW_UPDATED', version: VERSION }));
            })
    );
});

// Cache-first: serve from cache when present, otherwise fetch and store for next time.
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;

            return fetch(event.request).then((response) => {
                if (!response || response.status !== 200 || response.type === 'opaque') {
                    return response;
                }
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                return response;
            }).catch(() => cached);
        })
    );
});
