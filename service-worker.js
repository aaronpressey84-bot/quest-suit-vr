(() => {
  const PRECACHE_URLS = ["./","./assets/index-DYv0XvtS.css","./assets/index-ZqKo6WzG.js","./assets/music/jimbob-theme.mp3","./audio/jimbob/MANIFEST.json","./audio/jimbob/big_coin_haul_01.mp3","./audio/jimbob/boot_01.mp3","./audio/jimbob/boot_02.mp3","./audio/jimbob/cant_afford_01.mp3","./audio/jimbob/chest_beam_01.mp3","./audio/jimbob/cluster_missiles_01.mp3","./audio/jimbob/coins_pickup_01.mp3","./audio/jimbob/coins_pickup_02.mp3","./audio/jimbob/coins_pickup_03.mp3","./audio/jimbob/coins_pickup_04.mp3","./audio/jimbob/critical_health_01.mp3","./audio/jimbob/death_respawn_01.mp3","./audio/jimbob/enemy_down_01.mp3","./audio/jimbob/enemy_down_02.mp3","./audio/jimbob/enemy_down_03.mp3","./audio/jimbob/enemy_down_04.mp3","./audio/jimbob/enemy_spotted_01.mp3","./audio/jimbob/enemy_spotted_02.mp3","./audio/jimbob/enemy_spotted_03.mp3","./audio/jimbob/heal_01.mp3","./audio/jimbob/idle_flying_01.mp3","./audio/jimbob/idle_flying_02.mp3","./audio/jimbob/idle_flying_03.mp3","./audio/jimbob/idle_flying_04.mp3","./audio/jimbob/lasers_upgraded_01.mp3","./audio/jimbob/low_health_01.mp3","./audio/jimbob/low_health_02.mp3","./audio/jimbob/low_health_03.mp3","./audio/jimbob/menu_open_01.mp3","./audio/jimbob/multi_kill_01.mp3","./audio/jimbob/multi_kill_02.mp3","./audio/jimbob/mushroom_cloud_01.mp3","./audio/jimbob/nano_blade_01.mp3","./audio/jimbob/nuclear_chicken_01.mp3","./audio/jimbob/speed_boost_01.mp3","./audio/jimbob/target_locked_01.mp3","./audio/jimbob/target_locked_02.mp3","./audio/jimbob/training_start_01.mp3","./audio/jimbob/training_start_02.mp3","./audio/jimbob/upgrade_bought_blaster_01.mp3","./audio/jimbob/upgrade_bought_firerate_01.mp3","./audio/jimbob/upgrade_bought_generic_01.mp3","./audio/jimbob/upgrade_bought_health_01.mp3","./audio/jimbob/upgrade_bought_magnet_01.mp3","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-maskable-192.png","./icons/icon-maskable-512.png","./index.html","./manifest.webmanifest","./models/big-back-suit.glb","./models/enemy-flyer.glb","./models/enemy-grunt.glb","./models/enemy-tank.glb","./models/prop-chicken-launcher.glb","./models/prop-chicken.glb","./models/prop-missile-pod.glb","./models/prop-nano-blade-hilt.glb","./xr-input-profiles/LICENSE.md","./xr-input-profiles/meta-quest-touch-plus-v2/left.glb","./xr-input-profiles/meta-quest-touch-plus-v2/profile.json","./xr-input-profiles/meta-quest-touch-plus-v2/right.glb","./xr-input-profiles/meta-quest-touch-plus/left.glb","./xr-input-profiles/meta-quest-touch-plus/profile.json","./xr-input-profiles/meta-quest-touch-plus/right.glb","./xr-input-profiles/profilesList.json"];
  const VERSION = "b8ae29d5f8e4";
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
