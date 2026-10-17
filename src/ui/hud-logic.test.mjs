import test from 'node:test';
import assert from 'node:assert/strict';
import {
    SUIT_AI_NAME, PROJECTILE_HIT_RADIUS, PROJECTILE_RANGE,
    clamp01, formatSpeed, rayHitDistance, selectTarget, bracketWorldSize,
    isLowHealth, statusLine, panelText,
} from './hud-logic.js';

const v = (x, y, z) => ({ x, y, z });
const enemy = (x, y, z) => ({ position: v(x, y, z) });
const FORWARD = { pos: v(0, 0, 0), dir: v(0, 0, -1) };

test('SUIT_AI_NAME is the neutral placeholder', () => {
    assert.equal(SUIT_AI_NAME, 'SUIT AI');
});

test('lock geometry mirrors the real projectile (5 m hitbox, 150 m/s x 2 s)', () => {
    assert.equal(PROJECTILE_HIT_RADIUS, 5);
    assert.equal(PROJECTILE_RANGE, 300);
});

test('clamp01 handles range and non-finite input', () => {
    assert.equal(clamp01(-1), 0);
    assert.equal(clamp01(2), 1);
    assert.equal(clamp01(0.5), 0.5);
    assert.equal(clamp01(NaN), 0);
});

test('formatSpeed converts m/s to km/h and Mach, and is safe on bad input', () => {
    assert.deepEqual(formatSpeed(0), { kmh: '0', mach: '0.00' });
    assert.deepEqual(formatSpeed(10), { kmh: '36', mach: '0.03' });
    assert.deepEqual(formatSpeed(343), { kmh: '1235', mach: '1.00' });
    assert.deepEqual(formatSpeed(1000), { kmh: '3600', mach: '2.92' });
    assert.deepEqual(formatSpeed(NaN), { kmh: '0', mach: '0.00' });
    assert.deepEqual(formatSpeed(-5), { kmh: '0', mach: '0.00' });
});

test('rayHitDistance: hit, near miss, behind, out of range', () => {
    assert.equal(rayHitDistance(v(0, 0, 0), v(0, 0, -1), v(0, 0, -20), 5, 300), 20);
    assert.equal(rayHitDistance(v(0, 0, 0), v(0, 0, -1), v(4.9, 0, -20), 5, 300), 20);
    assert.equal(rayHitDistance(v(0, 0, 0), v(0, 0, -1), v(5.1, 0, -20), 5, 300), -1);
    assert.equal(rayHitDistance(v(0, 0, 0), v(0, 0, -1), v(0, 0, 20), 5, 300), -1);
    assert.equal(rayHitDistance(v(0, 0, 0), v(0, 0, -1), v(0, 0, -400), 5, 300), -1);
});

test('selectTarget: no enemies -> no target, no lock', () => {
    assert.deepEqual(selectTarget([], FORWARD, FORWARD), { target: null, locked: false, distance: 0 });
    assert.deepEqual(selectTarget(undefined, FORWARD, null), { target: null, locked: false, distance: 0 });
});

test('selectTarget: nearest enemy in the view cone, not locked when aim is elsewhere', () => {
    const near = enemy(5, 0, -30), far = enemy(0, 0, -80), behind = enemy(0, 0, 10);
    const aimUp = { pos: v(0, 0, 0), dir: v(0, 1, 0) };
    const r = selectTarget([far, behind, near], FORWARD, aimUp);
    assert.equal(r.target, near);
    assert.equal(r.locked, false);
    assert.ok(Math.abs(r.distance - Math.hypot(5, 30)) < 1e-9);
});

test('selectTarget: enemies outside the cone or beyond range are ignored', () => {
    const side = enemy(-50, 0, -10);          // ~79 deg off-axis
    const tooFar = enemy(0, 0, -1000);
    assert.equal(selectTarget([side, tooFar], FORWARD, null).target, null);
});

test('selectTarget: an enemy on the aim ray wins and is locked, even if farther', () => {
    const near = enemy(20, 0, -30);
    const aimed = enemy(0, 0, -100);
    const r = selectTarget([near, aimed], FORWARD, FORWARD);
    assert.equal(r.target, aimed);
    assert.equal(r.locked, true);
});

test('selectTarget: lock works for an enemy outside the head cone (hand aim, not gaze)', () => {
    const offSide = enemy(-40, 0, 0);
    const aimLeft = { pos: v(0, 0, 0), dir: v(-1, 0, 0) };
    const r = selectTarget([offSide], FORWARD, aimLeft);
    assert.equal(r.target, offSide);
    assert.equal(r.locked, true);
});

test('selectTarget: no lock beyond the real projectile range', () => {
    const e = enemy(0, 0, -350);
    const r = selectTarget([e], FORWARD, FORWARD);
    assert.equal(r.target, e);
    assert.equal(r.locked, false);
});

test('selectTarget: keeps previous target unless a new one is clearly closer', () => {
    const a = enemy(0, 0, -50), b = enemy(10, 0, -46);
    const aimUp = { pos: v(0, 0, 0), dir: v(0, 1, 0) };
    assert.equal(selectTarget([a, b], FORWARD, aimUp, a).target, a);      // b only ~5% closer
    const c = enemy(5, 0, -20);
    assert.equal(selectTarget([a, c], FORWARD, aimUp, a).target, c);      // c much closer
});

test('selectTarget: a destroyed (removed) previous target is not kept', () => {
    const a = enemy(0, 0, -50), b = enemy(0, 0, -60);
    const aimUp = { pos: v(0, 0, 0), dir: v(0, 1, 0) };
    assert.equal(selectTarget([b], FORWARD, aimUp, a).target, b);
});

test('bracketWorldSize has a floor around the enemy and grows with distance', () => {
    assert.equal(bracketWorldSize(0), 6);
    assert.equal(bracketWorldSize(10), 6);
    assert.ok(bracketWorldSize(300) > 20);
    assert.ok(bracketWorldSize(300) < bracketWorldSize(400));
});

test('isLowHealth thresholds', () => {
    assert.equal(isLowHealth(5, 5), false);
    assert.equal(isLowHealth(2, 5), false);
    assert.equal(isLowHealth(1, 5), true);
    assert.equal(isLowHealth(2, 8), true);
    assert.equal(isLowHealth(0, 5), false); // game over screen handles 0
});

test('statusLine priority: low health > lock > target > boost > idle, always prefixed by SUIT_AI_NAME', () => {
    const base = { health: 5, maxHealth: 5, locked: false, hasTarget: false, targetDistance: 0, boost: 100, maxBoost: 100 };
    assert.equal(statusLine(base), `${SUIT_AI_NAME}: ALL SYSTEMS GO`);
    assert.equal(statusLine({ ...base, boost: 3 }), `${SUIT_AI_NAME}: BOOST RECHARGING`);
    assert.equal(statusLine({ ...base, hasTarget: true, targetDistance: 42.4 }), `${SUIT_AI_NAME}: TARGET 42 M`);
    assert.equal(statusLine({ ...base, hasTarget: true, locked: true }), `${SUIT_AI_NAME}: TARGET LOCKED - FIRE!`);
    assert.equal(statusLine({ ...base, health: 1, locked: true }), `${SUIT_AI_NAME}: WARNING - LOW HEALTH`);
});

test('panelText keys change only when displayed values change', () => {
    const s = { health: 4, maxHealth: 5, coins: 12, kills: 3, speed: 10.01, boost: 50.4, maxBoost: 100, gear: 5,
        locked: false, hasTarget: false, targetDistance: 0 };
    const a = panelText(s);
    const b = panelText({ ...s, speed: 10.02, boost: 50.9 });  // same rounded readouts
    assert.equal(a.suit, b.suit);
    assert.equal(a.flight, b.flight);
    assert.equal(a.status, b.status);
    assert.notEqual(a.flight, panelText({ ...s, coins: 13 }).flight);
    assert.notEqual(a.suit, panelText({ ...s, health: 3 }).suit);
    assert.notEqual(a.status, panelText({ ...s, hasTarget: true, locked: true }).status);
    assert.equal(a.boostPct, 50);
    assert.equal(panelText({ ...s, boost: null }).boostPct, null);
});

test('no fake bio/GPS telemetry in HUD strings', () => {
    const s = { health: 1, maxHealth: 5, coins: 0, kills: 0, speed: 0, boost: 0, maxBoost: 100, gear: 1,
        locked: true, hasTarget: true, targetDistance: 1 };
    const all = JSON.stringify(panelText(s)) + statusLine({ ...s, health: 5 });
    for (const banned of [/heart/i, /oxygen/i, /\bO2\b/, /gps/i, /pulse/i, /temp/i]) {
        assert.ok(!banned.test(all), `found ${banned}`);
    }
});
