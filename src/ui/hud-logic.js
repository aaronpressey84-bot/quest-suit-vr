// Pure suit-HUD logic — no DOM, no THREE, no window access.
// Kept isolated (like src/systems/economy.js) so it can be unit-tested with plain `node`.
// Vectors are any {x, y, z} object, so THREE.Vector3 instances can be passed straight in.

// The suit AI's display name. This is the ONE place to change it (the kid will pick a name later).
export const SUIT_AI_NAME = 'SUIT AI';

// Canvas panels redraw at most this often (and only when their text actually changed).
export const HUD_UPDATE_HZ = 10;

// Mirrors the real projectile in index.html (spawnProjectile: 150 m/s, 2.0 s life; hit test in
// updatePhysics: distance < 5). The lock indicator means "a shot fired now would hit".
export const PROJECTILE_HIT_RADIUS = 5;
export const PROJECTILE_RANGE = 150 * 2.0;

// Nearest-target bracket: only enemies roughly in front of the head, within this range.
export const TARGET_VIEW_CONE_DEG = 35;
export const TARGET_MAX_RANGE = 400;
// Keep the current target unless another one is clearly (25%) closer — stops the bracket flickering
// between two similarly distant enemies.
export const TARGET_SWITCH_RATIO = 0.8;

const SPEED_OF_SOUND_MPS = 343;

export function clamp01(v) {
    if (!Number.isFinite(v)) return 0;
    return v < 0 ? 0 : v > 1 ? 1 : v;
}

function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function len(a) { return Math.sqrt(dot(a, a)); }

// Speed readout from the real player velocity magnitude (world units are metres).
export function formatSpeed(metresPerSecond) {
    const mps = Number.isFinite(metresPerSecond) && metresPerSecond > 0 ? metresPerSecond : 0;
    return {
        kmh: String(Math.round(mps * 3.6)),
        mach: (mps / SPEED_OF_SOUND_MPS).toFixed(2),
    };
}

// Does a ray (origin + normalised dir) pass within `radius` of `center`, in front of the origin and
// within `range`? Returns the distance along the ray, or -1 for a miss.
export function rayHitDistance(origin, dir, center, radius, range) {
    const toC = sub(center, origin);
    const along = dot(toC, dir);
    if (along < 0 || along > range + radius) return -1;
    const perpSq = dot(toC, toC) - along * along;
    return perpSq <= radius * radius ? along : -1;
}

// Picks the enemy the HUD should bracket, and whether the right-hand aim is locked on it.
//   enemies:   array of objects with a `.position` {x,y,z} (THREE.Object3D works)
//   head:      { pos, dir }  — view origin and normalised forward
//   aim:       { pos, dir }  — aim origin and normalised forward (right controller, or the camera on desktop)
//   prevTarget: the target returned last time (same object reference), for hysteresis
// Rules: an enemy on the aim ray wins outright (locked). Otherwise the nearest enemy inside the
// view cone and range, keeping the previous target unless a new one is clearly closer.
export function selectTarget(enemies, head, aim, prevTarget = null, opts = {}) {
    const hitRadius = opts.hitRadius ?? PROJECTILE_HIT_RADIUS;
    const hitRange = opts.hitRange ?? PROJECTILE_RANGE;
    const maxRange = opts.maxRange ?? TARGET_MAX_RANGE;
    const cosCone = Math.cos(((opts.viewConeDeg ?? TARGET_VIEW_CONE_DEG) * Math.PI) / 180);

    let lockTarget = null, lockAlong = Infinity;
    let nearest = null, nearestDist = Infinity;
    let prevDist = -1;

    for (const e of enemies || []) {
        if (!e || !e.position) continue;
        if (aim) {
            const along = rayHitDistance(aim.pos, aim.dir, e.position, hitRadius, hitRange);
            if (along >= 0 && along < lockAlong) { lockAlong = along; lockTarget = e; }
        }
        const toE = sub(e.position, head.pos);
        const d = len(toE);
        if (d > maxRange) continue;
        if (d > 1e-6 && dot(toE, head.dir) / d < cosCone) continue;
        if (e === prevTarget) prevDist = d;
        if (d < nearestDist) { nearestDist = d; nearest = e; }
    }

    if (lockTarget) {
        return { target: lockTarget, locked: true, distance: len(sub(lockTarget.position, head.pos)) };
    }
    if (prevDist >= 0 && nearest !== prevTarget && nearestDist > prevDist * TARGET_SWITCH_RATIO) {
        return { target: prevTarget, locked: false, distance: prevDist };
    }
    return { target: nearest, locked: false, distance: nearest ? nearestDist : 0 };
}

// World-space bracket edge length so it keeps a roughly constant ~5 degree angular size, but never
// smaller than the enemy itself (octahedron radius 2 -> 4 m across, plus margin).
export function bracketWorldSize(distance) {
    const angular = 2 * Math.max(0, distance) * Math.tan((2.5 * Math.PI) / 180);
    return Math.max(6, angular);
}

export function isLowHealth(health, maxHealth) {
    return maxHealth > 0 && health > 0 && (health <= 1 || health / maxHealth <= 0.3);
}

// One status line from the suit AI. Priority: low health > lock > target in view > idle.
export function statusLine(s) {
    if (isLowHealth(s.health, s.maxHealth)) return `${SUIT_AI_NAME}: WARNING - LOW HEALTH`;
    if (s.locked) return `${SUIT_AI_NAME}: TARGET LOCKED - FIRE!`;
    if (s.hasTarget) return `${SUIT_AI_NAME}: TARGET ${Math.round(s.targetDistance)} M`;
    if (s.boost != null && s.maxBoost > 0 && s.boost <= 5) return `${SUIT_AI_NAME}: BOOST RECHARGING`;
    return `${SUIT_AI_NAME}: ALL SYSTEMS GO`;
}

// The exact strings each panel will draw. Panels redraw only when their key changes.
export function panelText(s) {
    const speed = formatSpeed(s.speed);
    const boostPct = s.boost == null || !(s.maxBoost > 0) ? null : Math.floor(clamp01(s.boost / s.maxBoost) * 100);
    const suit = `${s.health}/${s.maxHealth}|${boostPct}|${s.gear}`;
    const flight = `${speed.kmh}|${speed.mach}|${s.coins}|${s.kills}`;
    const status = `${statusLine(s)}|${s.locked ? 1 : 0}`;
    return { speed, boostPct, suit, flight, status };
}
