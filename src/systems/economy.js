// Pure coin/upgrade economy logic — no DOM, no THREE, no window/localStorage access.
// Kept isolated so it can be unit-tested with `node --test` and imported by index.html as an ES module.

export const STORAGE_KEY = 'questSuitVrProgress_v1';

// level 0 is always the free starting tier (price: null). Each further entry is a purchasable tier.
// No thrust/speed upgrade here by design — protects SuperSonic's flight feel (see HANDOFF_LOG.md).
export const UPGRADE_DEFS = {
    damage: {
        label: 'Blaster Damage',
        tiers: [
            { level: 0, price: null, value: 1 },
            { level: 1, price: 60, value: 2 },
            { level: 2, price: 160, value: 3 },
            { level: 3, price: 380, value: 4 },
        ],
    },
    fireRate: {
        label: 'Fire Rate',
        tiers: [
            { level: 0, price: null, value: 1.0 },
            { level: 1, price: 50, value: 0.8 },
            { level: 2, price: 140, value: 0.6 },
            { level: 3, price: 320, value: 0.42 },
            { level: 4, price: 650, value: 0.3 },
        ],
    },
    maxHealth: {
        label: 'Max Health',
        tiers: [
            { level: 0, price: null, value: 5 },
            { level: 1, price: 45, value: 7 },
            { level: 2, price: 130, value: 9 },
            { level: 3, price: 300, value: 12 },
        ],
    },
    magnetRange: {
        label: 'Coin Magnet Range',
        tiers: [
            { level: 0, price: null, value: 6 },
            { level: 1, price: 20, value: 10 },
            { level: 2, price: 80, value: 15 },
            { level: 3, price: 200, value: 22 },
            { level: 4, price: 450, value: 32 },
        ],
    },
};

export const UPGRADE_KEYS = Object.keys(UPGRADE_DEFS);

// Enemy toughness tiers: higher tier = more HP (hits to kill) and a bigger coin drop.
export const ENEMY_TIERS = [
    { tier: 1, weight: 0.6, hp: 1, coin: 3 },
    { tier: 2, weight: 0.3, hp: 2, coin: 6 },
    { tier: 3, weight: 0.1, hp: 3, coin: 12 },
];

export function rollEnemyTier(rng = Math.random) {
    const roll = rng();
    let acc = 0;
    for (const t of ENEMY_TIERS) {
        acc += t.weight;
        if (roll < acc) return t.tier;
    }
    return ENEMY_TIERS[ENEMY_TIERS.length - 1].tier;
}

export function hpForTier(tier) {
    const found = ENEMY_TIERS.find((t) => t.tier === tier);
    return found ? found.hp : 1;
}

export function coinValueForTier(tier) {
    const found = ENEMY_TIERS.find((t) => t.tier === tier);
    return found ? found.coin : 1;
}

export function defaultProgress() {
    return {
        coins: 0,
        levels: UPGRADE_KEYS.reduce((acc, k) => { acc[k] = 0; return acc; }, {}),
    };
}

// Guards against corrupted/old localStorage payloads — always returns a valid progress object.
export function clampProgress(raw) {
    const base = defaultProgress();
    if (!raw || typeof raw !== 'object') return base;
    if (Number.isFinite(raw.coins) && raw.coins >= 0) base.coins = Math.floor(raw.coins);
    if (raw.levels && typeof raw.levels === 'object') {
        for (const key of UPGRADE_KEYS) {
            const maxLevel = UPGRADE_DEFS[key].tiers.length - 1;
            const lvl = raw.levels[key];
            if (Number.isFinite(lvl) && lvl >= 0 && lvl <= maxLevel) base.levels[key] = Math.floor(lvl);
        }
    }
    return base;
}

export function serialize(progress) {
    return JSON.stringify(clampProgress(progress));
}

export function deserialize(json) {
    if (!json) return defaultProgress();
    try {
        return clampProgress(JSON.parse(json));
    } catch {
        return defaultProgress();
    }
}

export function maxLevelFor(key) {
    return UPGRADE_DEFS[key].tiers.length - 1;
}

export function valueForLevel(key, level) {
    const tiers = UPGRADE_DEFS[key].tiers;
    const clamped = Math.max(0, Math.min(level, tiers.length - 1));
    return tiers[clamped].value;
}

// Returns null when already at max level (nothing left to buy).
export function priceForNextLevel(key, level) {
    const tiers = UPGRADE_DEFS[key].tiers;
    const nextLevel = level + 1;
    if (nextLevel >= tiers.length) return null;
    return tiers[nextLevel].price;
}

// Immutable: returns a NEW progress object plus a result descriptor. Never mutates the input.
export function purchaseUpgrade(progress, key) {
    const current = clampProgress(progress);
    if (!UPGRADE_DEFS[key]) return { progress: current, bought: false, reason: 'unknown-upgrade' };
    const level = current.levels[key];
    const price = priceForNextLevel(key, level);
    if (price === null) return { progress: current, bought: false, reason: 'max-level' };
    if (current.coins < price) return { progress: current, bought: false, reason: 'insufficient-coins' };

    const next = {
        coins: current.coins - price,
        levels: { ...current.levels, [key]: level + 1 },
    };
    const healAmount = key === 'maxHealth'
        ? valueForLevel('maxHealth', level + 1) - valueForLevel('maxHealth', level)
        : 0;
    return { progress: next, bought: true, price, newLevel: level + 1, healAmount };
}

export function addCoins(progress, amount) {
    const current = clampProgress(progress);
    return { ...current, coins: current.coins + Math.max(0, Math.floor(amount)) };
}
