"use strict";
(() => {
  // src/web/sw/precacheStrategy.ts
  var NAVIGATION_TIMEOUT_MS = 3e3;
  var SHELL = [
    /^\.\/$/,
    /^\.\/index\.html$/,
    /^\.\/manifest\.webmanifest$/,
    /^\.\/icons\//,
    /^\.\/assets\/[^/]+\.(?:js|css)$/
  ];
  var BUNDLE_REF = /assets\/[\w.-]+\.(?:js|css)/g;
  function isShellUrl(url) {
    return SHELL.some((re) => re.test(url));
  }
  function splitPrecache(urls) {
    return {
      shell: urls.filter(isShellUrl),
      extras: urls.filter((url) => !isShellUrl(url))
    };
  }
  function fetchStrategy(req, scope2) {
    if (req.method !== "GET" || !req.url.startsWith(scope2)) return "passthrough";
    if (req.mode === "navigate") return "network-first";
    const path = new URL(req.url).pathname;
    const scopePath = new URL(scope2).pathname;
    return path === scopePath || path === `${scopePath}index.html` ? "network-first" : "cache-first";
  }
  function freshRequest(url, base) {
    return new Request(new URL(url, base).href, { cache: "reload", credentials: "same-origin" });
  }
  function bundleRefs(html) {
    return [...new Set(html.match(BUNDLE_REF) ?? [])].map((ref) => `./${ref}`);
  }
  function indexMatchesBundle(html, precacheUrls) {
    const refs = bundleRefs(html);
    const known = new Set(precacheUrls);
    return refs.some((ref) => ref.endsWith(".js")) && refs.every((ref) => known.has(ref));
  }

  // src/web/sw/serviceWorker.ts
  var PRECACHE_URLS = ["./","./assets/index-CCTWV4PN.js","./assets/index-FayDK0xC.css","./assets/music/jimbob-theme.mp3","./audio/charlie/MANIFEST.json","./audio/charlie/boss_defeat_01.mp3","./audio/charlie/boss_hurt_01.mp3","./audio/charlie/boss_hurt_02.mp3","./audio/charlie/boss_low_health_01.mp3","./audio/charlie/boss_minigun_01.mp3","./audio/charlie/boss_phase2_01.mp3","./audio/charlie/boss_phase2_02.mp3","./audio/charlie/boss_phase2_corwin.mp3","./audio/charlie/boss_rockets_01.mp3","./audio/charlie/boss_tail_01.mp3","./audio/charlie/boss_taunt_01.mp3","./audio/charlie/boss_taunt_02.mp3","./audio/charlie/boss_taunt_03.mp3","./audio/charlie/boss_taunt_04.mp3","./audio/charlie/boss_taunt_05.mp3","./audio/charlie/boss_taunt_06.mp3","./audio/charlie/boss_wake_01.mp3","./audio/charlie/player_down_01.mp3","./audio/chuck/MANIFEST.json","./audio/chuck/charlie_defeated_01.mp3","./audio/chuck/charlie_defeated_02.mp3","./audio/chuck/charlie_defeated_03.mp3","./audio/chuck/charlie_wake_01.mp3","./audio/chuck/charlie_wake_02.mp3","./audio/chuck/charlie_wake_03.mp3","./audio/chuck/coin_haul_01.mp3","./audio/chuck/coin_haul_02.mp3","./audio/chuck/coin_haul_03.mp3","./audio/chuck/coin_haul_04.mp3","./audio/chuck/idle_training_01.mp3","./audio/chuck/idle_training_02.mp3","./audio/chuck/idle_training_03.mp3","./audio/chuck/kills_15_01.mp3","./audio/chuck/kills_15_02.mp3","./audio/chuck/kills_15_03.mp3","./audio/chuck/kills_15_04.mp3","./audio/chuck/kills_15_05.mp3","./audio/chuck/kills_15_06.mp3","./audio/chuck/low_health_01.mp3","./audio/chuck/low_health_02.mp3","./audio/chuck/low_health_03.mp3","./audio/chuck/low_health_04.mp3","./audio/chuck/no_damage_streak_01.mp3","./audio/chuck/no_damage_streak_02.mp3","./audio/chuck/no_damage_streak_03.mp3","./audio/chuck/nuke_fired_01.mp3","./audio/chuck/nuke_fired_02.mp3","./audio/chuck/nuke_fired_03.mp3","./audio/chuck/player_down_01.mp3","./audio/chuck/player_down_02.mp3","./audio/chuck/player_down_03.mp3","./audio/chuck/player_down_04.mp3","./audio/chuck/respawn_01.mp3","./audio/chuck/respawn_02.mp3","./audio/chuck/respawn_03.mp3","./audio/chuck/respawn_04.mp3","./audio/chuck/upgrade_bought_01.mp3","./audio/chuck/upgrade_bought_02.mp3","./audio/chuck/upgrade_bought_03.mp3","./audio/chuck/upgrade_bought_04.mp3","./audio/chuck/weapon_bought_01.mp3","./audio/chuck/weapon_bought_02.mp3","./audio/chuck/weapon_bought_03.mp3","./audio/chuck/weapon_bought_04.mp3","./audio/jimbob/MANIFEST.json","./audio/jimbob/big_coin_haul_01.mp3","./audio/jimbob/boot_01.mp3","./audio/jimbob/boot_02.mp3","./audio/jimbob/cant_afford_01.mp3","./audio/jimbob/chest_beam_01.mp3","./audio/jimbob/cluster_missiles_01.mp3","./audio/jimbob/coins_pickup_01.mp3","./audio/jimbob/coins_pickup_02.mp3","./audio/jimbob/coins_pickup_03.mp3","./audio/jimbob/coins_pickup_04.mp3","./audio/jimbob/critical_health_01.mp3","./audio/jimbob/death_respawn_01.mp3","./audio/jimbob/enemy_down_01.mp3","./audio/jimbob/enemy_down_02.mp3","./audio/jimbob/enemy_down_03.mp3","./audio/jimbob/enemy_down_04.mp3","./audio/jimbob/enemy_spotted_01.mp3","./audio/jimbob/enemy_spotted_02.mp3","./audio/jimbob/enemy_spotted_03.mp3","./audio/jimbob/heal_01.mp3","./audio/jimbob/idle_flying_01.mp3","./audio/jimbob/idle_flying_02.mp3","./audio/jimbob/idle_flying_03.mp3","./audio/jimbob/idle_flying_04.mp3","./audio/jimbob/lasers_upgraded_01.mp3","./audio/jimbob/low_health_01.mp3","./audio/jimbob/low_health_02.mp3","./audio/jimbob/low_health_03.mp3","./audio/jimbob/menu_open_01.mp3","./audio/jimbob/multi_kill_01.mp3","./audio/jimbob/multi_kill_02.mp3","./audio/jimbob/mushroom_cloud_01.mp3","./audio/jimbob/nano_blade_01.mp3","./audio/jimbob/nuclear_chicken_01.mp3","./audio/jimbob/speed_boost_01.mp3","./audio/jimbob/target_locked_01.mp3","./audio/jimbob/target_locked_02.mp3","./audio/jimbob/training_start_01.mp3","./audio/jimbob/training_start_02.mp3","./audio/jimbob/upgrade_bought_blaster_01.mp3","./audio/jimbob/upgrade_bought_firerate_01.mp3","./audio/jimbob/upgrade_bought_generic_01.mp3","./audio/jimbob/upgrade_bought_health_01.mp3","./audio/jimbob/upgrade_bought_magnet_01.mp3","./audio/walter/MANIFEST.json","./audio/walter/boss_cannon_01.mp3","./audio/walter/boss_cannon_02.mp3","./audio/walter/boss_cannon_03.mp3","./audio/walter/boss_cannon_04.mp3","./audio/walter/boss_defeat_01.mp3","./audio/walter/boss_defeat_02.mp3","./audio/walter/boss_defeat_03.mp3","./audio/walter/boss_hurt_01.mp3","./audio/walter/boss_hurt_02.mp3","./audio/walter/boss_hurt_03.mp3","./audio/walter/boss_hurt_04.mp3","./audio/walter/boss_hurt_05.mp3","./audio/walter/boss_low_health_01.mp3","./audio/walter/boss_low_health_02.mp3","./audio/walter/boss_low_health_03.mp3","./audio/walter/boss_phase2_01.mp3","./audio/walter/boss_phase2_02.mp3","./audio/walter/boss_phase2_03.mp3","./audio/walter/boss_sling_bomb_01.mp3","./audio/walter/boss_sling_bomb_02.mp3","./audio/walter/boss_sling_bomb_03.mp3","./audio/walter/boss_sling_bomb_04.mp3","./audio/walter/boss_sling_melee_01.mp3","./audio/walter/boss_sling_melee_02.mp3","./audio/walter/boss_sling_melee_03.mp3","./audio/walter/boss_sling_melee_04.mp3","./audio/walter/boss_taunt_01.mp3","./audio/walter/boss_taunt_02.mp3","./audio/walter/boss_taunt_03.mp3","./audio/walter/boss_taunt_04.mp3","./audio/walter/boss_taunt_05.mp3","./audio/walter/boss_taunt_06.mp3","./audio/walter/boss_taunt_07.mp3","./audio/walter/boss_taunt_08.mp3","./audio/walter/boss_wake_01.mp3","./audio/walter/boss_wake_02.mp3","./audio/walter/boss_wake_03.mp3","./audio/walter/boss_wake_04.mp3","./audio/walter/player_down_01.mp3","./audio/walter/player_down_02.mp3","./audio/walter/player_down_03.mp3","./audio/walter/player_down_04.mp3","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-maskable-192.png","./icons/icon-maskable-512.png","./images/chuck/cheer.png","./images/chuck/laugh.png","./images/chuck/point.png","./images/chuck/pout.png","./images/chuck/shocked.png","./images/chuck/smug.png","./index.html","./manifest.webmanifest","./models/big-back-suit.glb","./models/charlie-minigun.glb","./models/charlie-rocket-box.glb","./models/charlie-tail-mace.glb","./models/charlie.glb","./models/chick-gunner.glb","./models/enemy-flyer.glb","./models/enemy-grunt.glb","./models/enemy-tank.glb","./models/prop-chicken-launcher.glb","./models/prop-chicken.glb","./models/prop-missile-pod.glb","./models/prop-nano-blade-hilt.glb","./models/roger-bawk-launcher.glb","./models/roger-beak-lance.glb","./models/roger-egg-pod.glb","./models/roger.glb","./xr-input-profiles/LICENSE.md","./xr-input-profiles/meta-quest-touch-plus-v2/left.glb","./xr-input-profiles/meta-quest-touch-plus-v2/profile.json","./xr-input-profiles/meta-quest-touch-plus-v2/right.glb","./xr-input-profiles/meta-quest-touch-plus/left.glb","./xr-input-profiles/meta-quest-touch-plus/profile.json","./xr-input-profiles/meta-quest-touch-plus/right.glb","./xr-input-profiles/profilesList.json"];
  var VERSION = "7e0c3bcb67a6";
  var CACHE_NAME = `bigback-cache-${VERSION}`;
  var UPDATED_MESSAGE = "BIGBACK_SW_UPDATED";
  var SKIP_WAITING_MESSAGE = "BIGBACK_SKIP_WAITING";
  var PAGE_URLS = ["./", "./index.html"];
  var scope = () => self.registration.scope;
  async function precacheShell(cache, shell) {
    const fetched = await Promise.all(
      shell.map(async (url) => {
        const response = await fetch(freshRequest(url, scope()));
        if (!response.ok) throw new Error(`precache ${url}: HTTP ${response.status}`);
        if (PAGE_URLS.includes(url)) {
          const html = await response.clone().text();
          if (!indexMatchesBundle(html, PRECACHE_URLS)) {
            throw new Error(`precache ${url}: index.html is from another build`);
          }
        }
        return [url, response];
      })
    );
    await Promise.all(fetched.map(([url, res]) => cache.put(new URL(url, scope()).href, res)));
  }
  async function precacheExtras(cache, extras) {
    const results = await Promise.allSettled(
      extras.map((url) => cache.add(freshRequest(url, scope())))
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed) console.warn(`precache: ${failed} of ${extras.length} extras left for later`);
  }
  self.addEventListener("install", (event) => {
    const { shell, extras } = splitPrecache(PRECACHE_URLS);
    event.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        await precacheShell(cache, shell);
        await precacheExtras(cache, extras);
      }).then(() => self.skipWaiting())
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
  self.addEventListener("message", (event) => {
    if (event.data?.type === SKIP_WAITING_MESSAGE) {
      void self.skipWaiting();
    }
  });
  async function keepIfOurs(url, response) {
    if (!response.ok || response.type !== "basic") return;
    const copy = response.clone();
    if (!indexMatchesBundle(await response.clone().text(), PRECACHE_URLS)) return;
    await (await caches.open(CACHE_NAME)).put(url, copy);
  }
  function cachedPage(url) {
    return caches.match(url, { ignoreSearch: true }).then((hit) => hit ?? caches.match(new URL("./index.html", scope()).href));
  }
  async function networkFirst(event) {
    const { url, redirect } = event.request;
    const network = fetch(url, { cache: "no-cache", credentials: "same-origin", redirect }).then(
      async (response) => {
        await keepIfOurs(url, response).catch(() => {
        });
        return response;
      }
    );
    event.waitUntil(
      network.then(
        () => void 0,
        () => void 0
      )
    );
    const timeout = new Promise((resolve) => setTimeout(resolve, NAVIGATION_TIMEOUT_MS, null));
    const first = await Promise.race([network.catch(() => null), timeout]);
    if (first && (first.ok || first.type === "opaqueredirect")) return first;
    return await cachedPage(url) ?? network;
  }
  async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.status === 200 && response.type !== "opaque") {
      const copy = response.clone();
      void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    }
    return response;
  }
  self.addEventListener("fetch", (event) => {
    const strategy = fetchStrategy(event.request, scope());
    if (strategy === "network-first") event.respondWith(networkFirst(event));
    else if (strategy === "cache-first") event.respondWith(cacheFirst(event.request));
  });
})();
