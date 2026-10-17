(() => {
  const PRECACHE_URLS = ["./","./assets/index-CvFDAOY1.js","./assets/index-DYv0XvtS.css","./assets/music/jimbob-theme.mp3","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-maskable-192.png","./icons/icon-maskable-512.png","./index.html","./manifest.webmanifest","./xr-input-profiles/LICENSE.md","./xr-input-profiles/meta-quest-touch-plus-v2/left.glb","./xr-input-profiles/meta-quest-touch-plus-v2/profile.json","./xr-input-profiles/meta-quest-touch-plus-v2/right.glb","./xr-input-profiles/meta-quest-touch-plus/left.glb","./xr-input-profiles/meta-quest-touch-plus/profile.json","./xr-input-profiles/meta-quest-touch-plus/right.glb","./xr-input-profiles/profilesList.json"];
  const VERSION = "1f398807803f";
  const CACHE_NAME = `bigback-cache-${VERSION}`;
  const UPDATED_MESSAGE = "BIGBACK_SW_UPDATED";
  self.addEventListener("install", (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
    );
  });
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then(
        (keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      ).then(() => self.clients.claim()).then(() => self.clients.matchAll()).then((clients) => {
        clients.forEach(
          (client) => client.postMessage({ type: UPDATED_MESSAGE, version: VERSION })
        );
      })
    );
  });
  self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type === "opaque") return response;
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        }).catch(() => cached);
      })
    );
  });
})();
