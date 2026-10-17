// Tactical suit HUD for QUEST SUIT VR — camera-attached panels + one world-space target bracket,
// rendered by the host app's single scene/renderer/XR session/animation loop (this module never
// creates its own renderer, scene, camera or loop).
//
// Donor-derived code: createCurvedPlane(), drawCorners() and drawBracket() are adapted from
// jposn3r's HUD project, https://github.com/jposn3r/iron-man-hud (MIT per its README; no LICENSE
// file in that repo), commit 68e81567c1f159ee15bef0eebd08b28ea4063eb4. Changes: the curve now bends
// toward the viewer (cylinder axis through the eye), branding/telemetry removed, all values come from
// real game state. See docs/THIRD_PARTY.md.

import * as THREE from 'three';
import {
    SUIT_AI_NAME, HUD_UPDATE_HZ, clamp01, selectTarget, bracketWorldSize, isLowHealth, panelText,
} from './hud-logic.js';

export { SUIT_AI_NAME };

// Panels sit on a sphere of this radius around the eye (metres). Placement is in degrees
// (azimuth: + is right, elevation: + is up), all outside the central ~30 degree cone.
const HUD_DISTANCE = 2.0;
const HUD_RENDER_ORDER = 900; // below the VR menu (1000) and game-over panel (2000)

const CYAN = '#00d4ff';
const RED = '#ff3b3b';
const AMBER = '#ffb300';
const GREEN = '#3dff7a';
const GOLD = '#ffd54a';
const BG = 'rgba(0, 12, 24, 0.55)';
const FONT = 'bold {px}px "DejaVu Sans Mono", "Courier New", monospace';
const font = (px) => FONT.replace('{px}', px);

// --- Donor-derived geometry (adapted) ---------------------------------------------------------
// Plane bent along a cylinder of `radius`. With the mesh placed at z = -radius, the cylinder axis
// passes through the eye, so every column of the panel is the same distance away.
function createCurvedPlane(width, height, radius, segments) {
    const geo = new THREE.PlaneGeometry(width, height, segments, 1);
    const pos = geo.attributes.position;
    const arcAngle = width / radius;
    for (let i = 0; i < pos.count; i++) {
        const angle = (pos.getX(i) / width) * arcAngle;
        pos.setX(i, Math.sin(angle) * radius);
        pos.setZ(i, radius - Math.cos(angle) * radius);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
}

function drawCorners(ctx, x, y, w, h, size, color, lineW) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineW;
    ctx.beginPath();
    ctx.moveTo(x, y + size); ctx.lineTo(x, y); ctx.lineTo(x + size, y);
    ctx.moveTo(x + w - size, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + size);
    ctx.moveTo(x, y + h - size); ctx.lineTo(x, y + h); ctx.lineTo(x + size, y + h);
    ctx.moveTo(x + w - size, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - size);
    ctx.stroke();
    ctx.restore();
}

// Target bracket: outer + inner corner brackets, crosshair ticks, centre diamond. Drawn once per
// state (normal / locked) at creation and reused — never redrawn per frame.
function drawBracket(ctx, S, locked) {
    const color = locked ? RED : CYAN;
    ctx.clearRect(0, 0, S, S);
    const m = 14, s = 62;
    drawCorners(ctx, m, m, S - 2 * m, S - 2 * m, s, color, locked ? 9 : 6);
    if (locked) drawCorners(ctx, 46, 46, S - 92, S - 92, 34, color, 4);
    const c = S / 2;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(c - 40, c); ctx.lineTo(c - 16, c);
    ctx.moveTo(c + 16, c); ctx.lineTo(c + 40, c);
    ctx.moveTo(c, c - 40); ctx.lineTo(c, c - 16);
    ctx.moveTo(c, c + 16); ctx.lineTo(c, c + 40);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(c, c - 10); ctx.lineTo(c + 10, c); ctx.lineTo(c, c + 10); ctx.lineTo(c - 10, c);
    ctx.closePath();
    if (locked) { ctx.fillStyle = color; ctx.fill(); } else ctx.stroke();
    if (locked) {
        ctx.fillStyle = color;
        ctx.font = font(30);
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('LOCK', c, m + 10);
    }
}
// --- end donor-derived ------------------------------------------------------------------------

function makeCanvasTexture(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false;          // re-uploads stay cheap; texel density ~ display density
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return { canvas, ctx, tex };
}

function hudMaterial(map) {
    return new THREE.MeshBasicMaterial({
        map, transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false,
    });
}

function makePanel(texW, texH, geoW, geoH, azDeg, elDeg, draw) {
    const { canvas, ctx, tex } = makeCanvasTexture(texW, texH);
    const mesh = new THREE.Mesh(createCurvedPlane(geoW, geoH, HUD_DISTANCE, 24), hudMaterial(tex));
    mesh.position.set(0, 0, -HUD_DISTANCE);
    mesh.renderOrder = HUD_RENDER_ORDER;
    mesh.frustumCulled = false;
    const pivot = new THREE.Object3D();
    pivot.rotation.order = 'YXZ';
    pivot.rotation.set(THREE.MathUtils.degToRad(elDeg), THREE.MathUtils.degToRad(-azDeg), 0);
    pivot.add(mesh);
    return { pivot, mesh, canvas, ctx, tex, draw, key: null };
}

function panelBackground(ctx, W, H, accent) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    drawCorners(ctx, 4, 4, W - 8, H - 8, 34, accent, 5);
}

function drawBar(ctx, x, y, w, h, frac, color, segments) {
    ctx.fillStyle = 'rgba(0, 212, 255, 0.12)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * clamp01(frac), h);
    if (segments > 1) {
        ctx.fillStyle = 'rgba(0, 12, 24, 0.9)';
        for (let i = 1; i < segments; i++) ctx.fillRect(x + (w * i) / segments - 2, y, 4, h);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
}

// Left panel: health, boost, gear.
function drawSuitPanel(p, s, t) {
    const { ctx, canvas } = p; const W = canvas.width, H = canvas.height;
    const low = isLowHealth(s.health, s.maxHealth);
    panelBackground(ctx, W, H, low ? RED : CYAN);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left'; ctx.fillStyle = CYAN; ctx.font = font(36);
    ctx.fillText(SUIT_AI_NAME, 28, 62, W - 56);

    const hpColor = low ? RED : s.health / s.maxHealth <= 0.6 ? AMBER : GREEN;
    ctx.font = font(44); ctx.fillStyle = CYAN; ctx.fillText('HEALTH', 28, 130);
    ctx.textAlign = 'right'; ctx.fillStyle = hpColor; ctx.fillText(`${s.health}/${s.maxHealth}`, W - 28, 130);
    drawBar(ctx, 28, 148, W - 56, 52, s.maxHealth > 0 ? s.health / s.maxHealth : 0, hpColor, Math.min(s.maxHealth, 12));

    if (t.boostPct !== null) {
        ctx.textAlign = 'left'; ctx.fillStyle = CYAN; ctx.fillText('BOOST', 28, 262);
        ctx.textAlign = 'right'; ctx.fillStyle = t.boostPct <= 5 ? AMBER : CYAN; ctx.fillText(`${t.boostPct}%`, W - 28, 262);
        drawBar(ctx, 28, 280, W - 56, 36, t.boostPct / 100, t.boostPct <= 5 ? AMBER : CYAN, 0);
    }
    ctx.textAlign = 'left'; ctx.fillStyle = CYAN; ctx.font = font(44);
    ctx.fillText(`GEAR ${s.gear}`, 28, 382);
}

// Right panel: speed (from the real velocity), Mach, coins, kills.
function drawFlightPanel(p, s, t) {
    const { ctx, canvas } = p; const W = canvas.width, H = canvas.height;
    panelBackground(ctx, W, H, CYAN);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left'; ctx.fillStyle = CYAN; ctx.font = font(36);
    ctx.fillText('SPEED', 28, 62);
    ctx.textAlign = 'right'; ctx.fillText(`MACH ${t.speed.mach}`, W - 28, 62);
    ctx.font = font(104); ctx.fillStyle = '#ffffff';
    ctx.fillText(t.speed.kmh, W - 150, 172, W - 190);
    ctx.textAlign = 'left'; ctx.font = font(36); ctx.fillStyle = CYAN;
    ctx.fillText('KM/H', W - 136, 172);
    ctx.font = font(52); ctx.fillStyle = GOLD;
    ctx.fillText(`COINS ${s.coins}`, 28, 278, W - 56);
    ctx.font = font(44); ctx.fillStyle = CYAN;
    ctx.fillText(`KILLS ${s.kills}`, 28, 370, W - 56);
}

// Bottom strip: suit AI status line + lock indicator.
function drawStatusStrip(p, s, t, view) {
    const { ctx, canvas } = p; const W = canvas.width, H = canvas.height;
    const low = isLowHealth(s.health, s.maxHealth);
    const color = view.locked ? RED : low ? AMBER : CYAN;
    panelBackground(ctx, W, H, color);
    if (view.locked) {
        ctx.strokeStyle = RED; ctx.lineWidth = 8; ctx.strokeRect(10, 10, W - 20, H - 20);
    }
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.font = font(60);
    ctx.fillText(view.status, W / 2, H / 2, W - 60);
}

/**
 * Create the suit HUD inside the host's existing scene/camera.
 * @param {{ scene: THREE.Scene, camera: THREE.Camera, enabled?: boolean }} opts
 * @returns hud with update(gameState, dt), setEnabled(bool), isEnabled(), reset(), dispose()
 *
 * gameState fields: health, maxHealth, coins, kills, speed (m/s, from the real velocity), boost,
 * maxBoost (null boost hides the bar), gear, menuOpen, gameOver, enemies (array of Object3D whose
 * .position is world-space), aim (Object3D for the right-hand aim, or null to use the camera).
 */
export function createHud({ scene, camera, enabled = true }) {
    const group = new THREE.Group();
    group.name = 'SUIT_HUD';
    camera.add(group);

    // Left / right panels: 0.62 x 0.50 m at 2 m (~18 x 14 deg), centred 27 deg out and 12 deg down.
    // Bottom strip: 0.92 x 0.16 m (~26 x 5 deg), 24 deg down. Nearest edges are ~18 deg off-centre.
    const panels = [
        makePanel(512, 416, 0.62, 0.50, -27, -12, drawSuitPanel),
        makePanel(512, 416, 0.62, 0.50, 27, -12, drawFlightPanel),
        makePanel(1024, 176, 0.92, 0.16, 0, -24, drawStatusStrip),
    ];
    const panelKeys = ['suit', 'flight', 'status'];
    panels.forEach((p) => group.add(p.pivot));

    // World-space bracket placed at the target itself, so both eyes converge on the enemy
    // (a head-locked marker at 2 m would fight the enemy's real depth).
    const bracketSkins = [false, true].map((locked) => {
        const c = makeCanvasTexture(256, 256);
        drawBracket(c.ctx, 256, locked);
        c.tex.needsUpdate = true;
        return { tex: c.tex, mat: hudMaterial(c.tex) };
    });
    const bracketGeo = new THREE.PlaneGeometry(1, 1);
    const bracket = new THREE.Mesh(bracketGeo, bracketSkins[0].mat);
    bracket.name = 'SUIT_HUD_BRACKET';
    bracket.renderOrder = HUD_RENDER_ORDER;
    bracket.frustumCulled = false;
    bracket.visible = false;
    scene.add(bracket);

    // Reused temporaries (no per-frame allocation).
    const head = { pos: new THREE.Vector3(), dir: new THREE.Vector3() };
    const aim = { pos: new THREE.Vector3(), dir: new THREE.Vector3() };
    const camQuat = new THREE.Quaternion();
    const camPos = new THREE.Vector3();
    const tickInterval = 1 / HUD_UPDATE_HZ;
    let sinceTick = tickInterval; // draw on the first update
    let target = null, locked = false, targetDistance = 0;
    let disposed = false;

    function setEnabled(on) {
        enabled = !!on;
        group.visible = enabled;
        if (!enabled) bracket.visible = false;
        panels.forEach((p) => { p.key = null; });
        sinceTick = tickInterval;
    }

    function readPose(obj, out) {
        obj.updateWorldMatrix(true, false);
        out.pos.setFromMatrixPosition(obj.matrixWorld);
        out.dir.set(0, 0, -1).transformDirection(obj.matrixWorld);
    }

    function tick(s) {
        if (s.menuOpen || s.gameOver) {
            target = null; locked = false; targetDistance = 0;
        } else {
            readPose(camera, head);
            if (s.aim) readPose(s.aim, aim);
            const r = selectTarget(s.enemies, head, s.aim ? aim : head, target);
            target = r.target; locked = r.locked; targetDistance = r.distance;
        }
        const view = { ...s, locked, hasTarget: !!target, targetDistance };
        const text = panelText(view);
        view.status = text.status.slice(0, text.status.lastIndexOf('|'));
        panels.forEach((p, i) => {
            const key = text[panelKeys[i]];
            if (key === p.key) return;
            p.key = key;
            p.draw(p, s, text, view);
            p.tex.needsUpdate = true;
        });
    }

    function placeBracket() {
        if (!target || !target.parent) { bracket.visible = false; return; }
        camera.getWorldPosition(camPos);
        camera.getWorldQuaternion(camQuat);
        bracket.position.copy(target.position);
        bracket.quaternion.copy(camQuat);
        bracket.scale.setScalar(bracketWorldSize(camPos.distanceTo(target.position)));
        bracket.material = bracketSkins[locked ? 1 : 0].mat;
        bracket.visible = true;
    }

    function update(s, dt) {
        if (disposed || !enabled) return;
        sinceTick += dt;
        if (sinceTick >= tickInterval) {
            sinceTick = 0;
            tick(s);
        }
        placeBracket();
    }

    // Forget the current target and force a full redraw next update (run reset / respawn / travel).
    function reset() {
        target = null; locked = false; targetDistance = 0;
        bracket.visible = false;
        panels.forEach((p) => { p.key = null; });
        sinceTick = tickInterval;
    }

    function dispose() {
        if (disposed) return;
        disposed = true;
        camera.remove(group);
        scene.remove(bracket);
        panels.forEach((p) => { p.mesh.geometry.dispose(); p.mesh.material.dispose(); p.tex.dispose(); });
        bracketGeo.dispose();
        bracketSkins.forEach((b) => { b.mat.dispose(); b.tex.dispose(); });
        target = null;
    }

    setEnabled(enabled);
    return { update, setEnabled, isEnabled: () => enabled, reset, dispose, group };
}
