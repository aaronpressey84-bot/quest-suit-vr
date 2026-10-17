import test from 'node:test';
import assert from 'node:assert/strict';
import {
    UPGRADE_DEFS, UPGRADE_KEYS, ENEMY_TIERS,
    rollEnemyTier, hpForTier, coinValueForTier,
    defaultProgress, clampProgress, serialize, deserialize,
    maxLevelFor, valueForLevel, priceForNextLevel, purchaseUpgrade, addCoins,
} from './economy.js';

test('defaultProgress starts at zero coins and level 0 on every upgrade', () => {
    const p = defaultProgress();
    assert.equal(p.coins, 0);
    for (const key of UPGRADE_KEYS) assert.equal(p.levels[key], 0);
});

test('no thrust/speed upgrade exists', () => {
    assert.ok(!('speed' in UPGRADE_DEFS));
    assert.ok(!('thrust' in UPGRADE_DEFS));
    assert.deepEqual(UPGRADE_KEYS.sort(), ['damage', 'fireRate', 'magnetRange', 'maxHealth'].sort());
});

test('every upgrade has 3-5 tiers including the free base tier, escalating prices', () => {
    for (const key of UPGRADE_KEYS) {
        const tiers = UPGRADE_DEFS[key].tiers;
        assert.ok(tiers.length >= 4 && tiers.length <= 6, `${key} should have 3-5 purchasable tiers + base`);
        assert.equal(tiers[0].price, null);
        let lastPrice = -Infinity;
        for (let i = 1; i < tiers.length; i++) {
            assert.ok(tiers[i].price > lastPrice, `${key} prices must strictly increase`);
            lastPrice = tiers[i].price;
        }
    }
});

test('cheapest first upgrade is affordable within a couple minutes of training kills', () => {
    const cheapest = Math.min(...UPGRADE_KEYS.map((k) => UPGRADE_DEFS[k].tiers[1].price));
    const trainingKillsIn2Min = 8; // conservative estimate for a first-time player
    const coinsFromKills = trainingKillsIn2Min * coinValueForTier(1);
    assert.ok(coinsFromKills >= cheapest, `expected ${coinsFromKills} >= ${cheapest}`);
});

test('rollEnemyTier respects weighting at the boundaries', () => {
    assert.equal(rollEnemyTier(() => 0), 1);
    assert.equal(rollEnemyTier(() => 0.59), 1);
    assert.equal(rollEnemyTier(() => 0.61), 2);
    assert.equal(rollEnemyTier(() => 0.89), 2);
    assert.equal(rollEnemyTier(() => 0.91), 3);
    assert.equal(rollEnemyTier(() => 0.999), 3);
});

test('tougher enemies have more hp and drop more coins', () => {
    assert.equal(hpForTier(1), 1);
    assert.equal(hpForTier(2), 2);
    assert.equal(hpForTier(3), 3);
    assert.ok(coinValueForTier(1) < coinValueForTier(2));
    assert.ok(coinValueForTier(2) < coinValueForTier(3));
});

test('clampProgress rejects corrupted localStorage payloads', () => {
    assert.deepEqual(clampProgress(null), defaultProgress());
    assert.deepEqual(clampProgress({}), defaultProgress());
    assert.deepEqual(clampProgress({ coins: -5, levels: { damage: 99 } }), defaultProgress());
    assert.deepEqual(clampProgress('not an object'), defaultProgress());
    const valid = { coins: 42, levels: { damage: 1, fireRate: 2, maxHealth: 0, magnetRange: 3 } };
    assert.deepEqual(clampProgress(valid), valid);
});

test('serialize/deserialize round-trips and survives garbage input', () => {
    const p = addCoins(defaultProgress(), 100);
    const json = serialize(p);
    assert.deepEqual(deserialize(json), p);
    assert.deepEqual(deserialize('{not json'), defaultProgress());
    assert.deepEqual(deserialize(null), defaultProgress());
});

test('valueForLevel level 0 matches original unmodified game constants', () => {
    assert.equal(valueForLevel('damage', 0), 1);
    assert.equal(valueForLevel('fireRate', 0), 1.0);
    assert.equal(valueForLevel('maxHealth', 0), 5); // matches playerState.maxHealth baseline
    assert.equal(valueForLevel('magnetRange', 0), 6);
});

test('priceForNextLevel returns null once maxed out', () => {
    const maxLevel = maxLevelFor('maxHealth');
    assert.equal(priceForNextLevel('maxHealth', maxLevel), null);
    assert.ok(priceForNextLevel('maxHealth', 0) > 0);
});

test('purchaseUpgrade blocks on insufficient coins and never mutates input', () => {
    const start = defaultProgress();
    const result = purchaseUpgrade(start, 'magnetRange');
    assert.equal(result.bought, false);
    assert.equal(result.reason, 'insufficient-coins');
    assert.deepEqual(start, defaultProgress(), 'input progress must not be mutated');
});

test('purchaseUpgrade succeeds, deducts price, and bumps level by exactly one', () => {
    const price = UPGRADE_DEFS.magnetRange.tiers[1].price;
    const funded = addCoins(defaultProgress(), price);
    const result = purchaseUpgrade(funded, 'magnetRange');
    assert.equal(result.bought, true);
    assert.equal(result.price, price);
    assert.equal(result.progress.coins, 0);
    assert.equal(result.progress.levels.magnetRange, 1);
    assert.deepEqual(funded, addCoins(defaultProgress(), price), 'input progress must not be mutated');
});

test('purchaseUpgrade on maxHealth reports the heal-on-buy amount', () => {
    const funded = addCoins(defaultProgress(), 1000);
    const result = purchaseUpgrade(funded, 'maxHealth');
    assert.equal(result.bought, true);
    assert.equal(result.healAmount, valueForLevel('maxHealth', 1) - valueForLevel('maxHealth', 0));
    assert.equal(result.healAmount, 2);
});

test('purchaseUpgrade refuses once a track is maxed', () => {
    let progress = addCoins(defaultProgress(), 100000);
    let key = 'maxHealth';
    let last;
    for (let i = 0; i < 10; i++) {
        last = purchaseUpgrade(progress, key);
        if (!last.bought) break;
        progress = last.progress;
    }
    assert.equal(last.bought, false);
    assert.equal(last.reason, 'max-level');
    assert.equal(progress.levels[key], maxLevelFor(key));
});

test('addCoins never goes negative and floors fractional amounts', () => {
    const p = addCoins(defaultProgress(), 3.9);
    assert.equal(p.coins, 3);
    const p2 = addCoins(p, -50);
    assert.equal(p2.coins, 3);
});
