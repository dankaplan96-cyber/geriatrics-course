import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------------------------------------------------------------- utilities
let seed = 7;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const reseed = s => { seed = s; };
const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));
const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

function mergeGeometry(geometries) {
 const arrays = { position: [], normal: [], uv: [], color: [] }; let count = 0;
 for (const source of geometries) {
  const g = source.index ? source.toNonIndexed() : source; count += g.attributes.position.count;
  for (const k of Object.keys(arrays)) { const a = g.attributes[k]; arrays[k].push(a ? a.array : new Float32Array(g.attributes.position.count * (k === 'uv' ? 2 : 3)).fill(k === 'color' ? 1 : 0)); }
  if (g !== source) g.dispose();
 }
 const out = new THREE.BufferGeometry();
 for (const k of Object.keys(arrays)) { const joined = new Float32Array(count * (k === 'uv' ? 2 : 3)); let offset = 0; for (const a of arrays[k]) { joined.set(a, offset); offset += a.length; } out.setAttribute(k, new THREE.BufferAttribute(joined, k === 'uv' ? 2 : 3)); }
 out.computeBoundingSphere(); return out;
}
function mergeStatic(group) {
 group.updateMatrixWorld(true); const groups = new Map(); const remove = [];
 group.traverse(node => {
  if (!node.isMesh || node.isInstancedMesh || Array.isArray(node.material) || node.userData.keep) return;
  const key = node.material.uuid + ':' + node.castShadow + ':' + node.receiveShadow;
  let entry = groups.get(key); if (!entry) { entry = { material: node.material, cast: node.castShadow, receive: node.receiveShadow, geo: [] }; groups.set(key, entry); }
  const g = node.geometry.clone(); const matrix = new THREE.Matrix4().copy(group.matrixWorld).invert().multiply(node.matrixWorld); g.applyMatrix4(matrix); entry.geo.push(g); remove.push(node);
 });
 for (const node of remove) node.removeFromParent();
 for (const entry of groups.values()) { const mesh = new THREE.Mesh(mergeGeometry(entry.geo), entry.material); mesh.castShadow = entry.cast; mesh.receiveShadow = entry.receive; group.add(mesh); entry.geo.forEach(g => g.dispose()); }
}
function mergeDirect(group) {
 const groups = new Map();
 for (const node of [...group.children]) { if (!node.isMesh || node.userData.keep || node.isInstancedMesh) continue; const key = node.material.uuid + ':' + node.castShadow; let e = groups.get(key); if (!e) groups.set(key, e = { material: node.material, cast: node.castShadow, geo: [] }); node.updateMatrix(); const g = node.geometry.clone(); g.applyMatrix4(node.matrix); e.geo.push(g); node.removeFromParent(); }
 for (const e of groups.values()) { const m = new THREE.Mesh(mergeGeometry(e.geo), e.material); m.castShadow = e.cast; m.receiveShadow = true; group.add(m); e.geo.forEach(g => g.dispose()); }
}
const materialCache = new Map();
function resetMaterials() { materialCache.clear(); }
function material(color, extra = {}) {
 const key = color + JSON.stringify(Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, v?.isTexture ? v.uuid : v?.isColor ? v.getHex() : v])));
 if (!materialCache.has(key)) materialCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: .8, ...extra }));
 return materialCache.get(key);
}
const vcolor = () => material('#ffffff', { vertexColors: true, roughness: .7 });
function shape(parent, geometry, mat, position = [0, 0, 0], scale = [1, 1, 1], shadow = false) { const m = new THREE.Mesh(geometry, mat); m.position.set(...position); m.scale.set(...scale); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m; }
function box(parent, mat, x, y, z, w, h, d, shadow = false, r = 0) { const geo = r > 0 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2) * .98) : new THREE.BoxGeometry(w, h, d); return shape(parent, geo, mat, [x, y, z], [1, 1, 1], shadow); }
function cyl(parent, mat, x, y, z, rt, rb, h, seg = 16, shadow = false) { return shape(parent, new THREE.CylinderGeometry(rt, rb, h, seg), mat, [x, y, z], [1, 1, 1], shadow); }
function disposeTree(root) { const geometries = new Set(), materials = new Set(), textures = new Set(); root.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) { for (const m of Array.isArray(o.material) ? o.material : [o.material]) { materials.add(m); for (const v of Object.values(m)) if (v?.isTexture) textures.add(v); } } }); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); root.removeFromParent(); }
// piece(): bakes a transform and a flat vertex colour into a geometry so many parts share one draw call.
function piece(g, color, p = [0, 0, 0], s = [1, 1, 1], rotation = [0, 0, 0]) { const m = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...s)); g.applyMatrix4(m); const c = new THREE.Color(color), a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }

// ---------------------------------------------------------------- procedural textures
let TEX_ANISO = 8;
function canvasTexture(size, draw, repeat = [1, 1], { srgb = true, clampEdges = false, height = size } = {}) {
 const c = document.createElement('canvas'); c.width = size; c.height = height; const ctx = c.getContext('2d'); draw(ctx, size, height);
 const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
 t.wrapS = t.wrapT = clampEdges ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = TEX_ANISO; return t;
}
const TEX = {
 wood(repeat, tone = 0) { reseed(11 + tone); return canvasTexture(512, (ctx, s) => {
  const rows = 8, h = s / rows;
  for (let r = 0; r < rows; r++) { let x = -rand() * 200;
   while (x < s) { const w = 170 + rand() * 170, l = 50 + rand() * 12 + tone, hue = 26 + rand() * 8;
    for (const ox of [0, s]) { const px = x - ox; if (px + w < 0 || px > s) continue;
     ctx.fillStyle = `hsl(${hue},${40 + rand() * 12}%,${l}%)`; ctx.fillRect(px, r * h, w, h);
     for (let g = 0; g < 10; g++) { ctx.strokeStyle = `rgba(90,48,20,${.04 + rand() * .09})`; ctx.lineWidth = .6 + rand() * 1.6; ctx.beginPath(); const y = r * h + 3 + rand() * (h - 6); ctx.moveTo(px, y); ctx.bezierCurveTo(px + w * .3, y + (rand() - .5) * 5, px + w * .7, y + (rand() - .5) * 5, px + w, y + (rand() - .5) * 3); ctx.stroke(); }
     if (rand() < .25) { ctx.fillStyle = 'rgba(80,40,15,.18)'; ctx.beginPath(); ctx.ellipse(px + w * rand(), r * h + h / 2, 7, 3, 0, 0, 7); ctx.fill(); }
     ctx.fillStyle = 'rgba(55,30,12,.55)'; ctx.fillRect(px, r * h, 2, h);
    }
    x += w; }
   ctx.fillStyle = 'rgba(55,30,12,.6)'; ctx.fillRect(0, r * h, s, 2.5); ctx.fillStyle = 'rgba(255,240,210,.12)'; ctx.fillRect(0, r * h + 2.5, s, 1.5);
  }
 }, repeat); },
 tiles(repeat, a, b, grout = '#cfc6b4', n = 4) { reseed(23); return canvasTexture(512, (ctx, s) => {
  ctx.fillStyle = grout; ctx.fillRect(0, 0, s, s); const t = s / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const c = new THREE.Color((i + j) % 2 ? a : b).offsetHSL(0, 0, (rand() - .5) * .05); ctx.fillStyle = '#' + c.getHexString(); ctx.fillRect(i * t + 3, j * t + 3, t - 6, t - 6);
   const g = ctx.createLinearGradient(i * t, j * t, i * t + t, j * t + t); g.addColorStop(0, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(0,0,0,.08)'); ctx.fillStyle = g; ctx.fillRect(i * t + 3, j * t + 3, t - 6, t - 6);
   for (let k = 0; k < 40; k++) { ctx.fillStyle = `rgba(0,0,0,${rand() * .06})`; ctx.fillRect(i * t + 3 + rand() * (t - 6), j * t + 3 + rand() * (t - 6), 2, 2); } }
 }, repeat); },
 paint(repeat, stripes = false) { reseed(31); return canvasTexture(256, (ctx, s) => {
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, s, s);
  if (stripes) for (let x = 0; x < s; x += 32) { ctx.fillStyle = 'rgba(0,0,0,.05)'; ctx.fillRect(x, 0, 12, s); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x + 14, 0, 2, s); }
  for (let i = 0; i < 2600; i++) { ctx.fillStyle = `rgba(${rand() < .5 ? '0,0,0' : '255,255,255'},${rand() * .035})`; ctx.fillRect(rand() * s, rand() * s, 1 + rand() * 3, 1 + rand() * 3); }
 }, repeat); },
 weave(repeat) { reseed(41); return canvasTexture(128, (ctx, s) => {
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, s, s);
  for (let y = 0; y < s; y += 4) for (let x = 0; x < s; x += 4) { ctx.fillStyle = `rgba(0,0,0,${((x + y) / 4) % 2 ? .07 : .02 + rand() * .03})`; ctx.fillRect(x, y, 4, 4); }
 }, repeat); },
 rug(c1, c2, c3, round = false) { return canvasTexture(512, (ctx, s) => {
  ctx.clearRect(0, 0, s, s); ctx.save();
  const path = (inset) => { ctx.beginPath(); if (round) ctx.ellipse(s / 2, s / 2, s / 2 - inset, s / 2 - inset, 0, 0, 7); else ctx.roundRect(inset, inset, s - inset * 2, s - inset * 2, 22); };
  path(6); ctx.fillStyle = c1; ctx.fill(); path(30); ctx.lineWidth = 14; ctx.strokeStyle = c2; ctx.stroke(); path(58); ctx.lineWidth = 4; ctx.strokeStyle = c3; ctx.stroke();
  ctx.globalAlpha = .55; for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? c2 : c3; ctx.beginPath(); const cx = s / 2, cy = s / 2, r = 120 - i * 18; ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy); ctx.closePath(); ctx.fill(); }
  ctx.globalAlpha = 1; reseed(5); path(6); ctx.clip(); for (let i = 0; i < 9000; i++) { ctx.fillStyle = `rgba(${rand() < .5 ? '0,0,0' : '255,255,255'},${rand() * .07})`; ctx.fillRect(rand() * s, rand() * s, 2, 2); }
  ctx.restore();
 }, [1, 1], { clampEdges: true }); },
 sky(warm = false) { return canvasTexture(256, (ctx, s) => {
  const g = ctx.createLinearGradient(0, 0, 0, s); g.addColorStop(0, warm ? '#f7b27a' : '#8fc9f2'); g.addColorStop(.65, warm ? '#ffe2b0' : '#d9eefc'); g.addColorStop(.66, warm ? '#9bb08a' : '#a8c79a'); g.addColorStop(1, warm ? '#6f8a62' : '#7fa36e'); ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  reseed(3); for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(255,255,255,.75)'; const x = rand() * s, y = 20 + rand() * 90; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + k * 13, y + Math.sin(k) * 5, 10 + rand() * 9, 0, 7); ctx.fill(); } }
  for (let i = 0; i < 12; i++) { ctx.fillStyle = warm ? '#5e7552' : '#5f8a58'; ctx.beginPath(); ctx.arc(rand() * s, s * .7 + rand() * 20, 12 + rand() * 20, 0, 7); ctx.fill(); }
 }, [1, 1], { clampEdges: true }); },
 art(kind) { reseed(60 + kind); return canvasTexture(256, (ctx, s) => {
  const palettes = [['#e9c46a', '#f4a261', '#264653', '#2a9d8f'], ['#f1e3d3', '#99c1b9', '#d88c9a', '#8e7dbe'], ['#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff'], ['#2b2d42', '#8d99ae', '#edf2f4', '#ef233c']][kind % 4];
  ctx.fillStyle = palettes[0]; ctx.fillRect(0, 0, s, s);
  if (kind % 2 === 0) { // portrait of two black cats
   ctx.fillStyle = palettes[1]; ctx.beginPath(); ctx.arc(s / 2, s * .95, s * .55, 0, 7); ctx.fill();
   for (const [x, sc] of [[.36, 1], [.66, 1.2]]) { ctx.save(); ctx.translate(s * x, s * .62); ctx.scale(sc, sc); ctx.fillStyle = '#121318'; ctx.beginPath(); ctx.ellipse(0, 30, 34, 44, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(0, -16, 26, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(-24, -26); ctx.lineTo(-18, -54); ctx.lineTo(-4, -38); ctx.moveTo(24, -26); ctx.lineTo(18, -54); ctx.lineTo(4, -38); ctx.fill(); ctx.fillStyle = sc > 1 ? '#f2b33d' : '#c9df52'; for (const e of [-9, 9]) { ctx.beginPath(); ctx.ellipse(e, -16, 5, 6, 0, 0, 7); ctx.fill(); } ctx.restore(); }
  } else { for (let i = 0; i < 9; i++) { ctx.fillStyle = palettes[1 + i % 3]; ctx.globalAlpha = .85; ctx.beginPath(); ctx.arc(rand() * s, rand() * s, 18 + rand() * 60, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; ctx.strokeStyle = palettes[3]; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, s * .7); ctx.bezierCurveTo(s * .3, s * .4, s * .6, s * .9, s, s * .5); ctx.stroke(); }
 }, [1, 1], { clampEdges: true }); },
 splat() { reseed(77); return canvasTexture(128, (ctx, s) => {
  ctx.translate(s / 2, s / 2);
  for (let i = 0; i < 16; i++) { const a = rand() * 6.28, r = rand() * s * .3; ctx.fillStyle = `rgba(255,255,255,${.5 + rand() * .5})`; ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 5 + rand() * s * .14, 0, 7); ctx.fill(); }
  for (let i = 0; i < 10; i++) { const a = rand() * 6.28, r = s * (.32 + rand() * .12); ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 2 + rand() * 4, 0, 7); ctx.fill(); }
 }, [1, 1], { clampEdges: true }); },
 glow() { return canvasTexture(64, (ctx, s) => { const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, s, s); }, [1, 1], { clampEdges: true }); },
 sunPatch() { return canvasTexture(256, (ctx, s) => {
  const g = ctx.createRadialGradient(s / 2, s / 2, s * .1, s / 2, s / 2, s * .55); g.addColorStop(0, 'rgba(255,236,190,1)'); g.addColorStop(.7, 'rgba(255,220,160,.6)'); g.addColorStop(1, 'rgba(255,220,160,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,.85)'; ctx.fillRect(s / 2 - 5, 0, 10, s); ctx.fillRect(0, s / 2 - 5, s, 10);
 }, [1, 1], { clampEdges: true }); }
};

// ---------------------------------------------------------------- physics
class PhysicsWorld {
 constructor() { this.world = new RAPIER.World({ x: 0, y: -17, z: 0 }); this.world.timestep = 1 / 60; this.events = new RAPIER.EventQueue(true); this.cats = [this.createCat('latifa'), this.createCat('pablo')]; this.active = 0; this.time = 0; }
 createCat(id) {
  const size = id === 'pablo' ? 1.22 : 1; const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased());
  const collider = this.world.createCollider(RAPIER.ColliderDesc.capsule(.15 * size, .23 * size).setFriction(0), body);
  const controller = this.world.createCharacterController(.015); controller.enableSnapToGround(.12); controller.enableAutostep(.16, .14, false); controller.setApplyImpulsesToDynamicBodies(true); controller.setCharacterMass(id === 'pablo' ? 14 : 3);
  return { id, size, body, collider, controller, position: { x: 0, y: .4, z: 0 }, previous: { x: 0, y: .4, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, grounded: false, coyote: 0, jumpBuffer: 0, jumps: 0, jumpsLeft: id === 'latifa' ? 2 : 1, facing: 0, speed: 0, simTime: 0, health: 3, invulnerable: 0, specialCooldown: 0, pawCooldown: 0, slam: false, climb: null, attackTime: 0, boosted: 0, dash: 0, flash: 0, dashDir: { x: 0, z: 0 }, landed: 0, airTime: 0 };
 }
 get player() { return this.cats[this.active]; }
 get companion() { return this.cats[1 - this.active]; }
 box(x, y, z, hx, hy, hz) { return this.world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z)); }
 place(cat, x, z, y = .42) { const p = { x, y: y * cat.size, z }; cat.body.setTranslation(p, true); cat.body.setNextKinematicTranslation(p); cat.position = { ...p }; cat.previous = { ...p }; cat.velocity = { x: 0, y: 0, z: 0 }; cat.grounded = false; cat.coyote = 0; cat.climb = null; cat.slam = false; cat.dash = 0; }
 step(dt, input, yaw, onSlam, onLand) {
  this.time += dt;
  for (let i = 0; i < 2; i++) {
   const c = this.cats[i]; c.previous = { ...c.position }; c.simTime = this.time;
   for (const k of ['invulnerable', 'flash', 'specialCooldown', 'pawCooldown', 'attackTime', 'boosted']) c[k] = Math.max(0, c[k] - dt);
   let dx = 0, dz = 0, jump = false;
   if (i === this.active) { let mx = input.move.x, mz = input.move.y; const n = Math.hypot(mx, mz); if (n > 1) { mx /= n; mz /= n; } dx = mx * Math.cos(yaw) - mz * Math.sin(yaw); dz = -mx * Math.sin(yaw) - mz * Math.cos(yaw); jump = input.consumeJump(); }
   else { const p = this.player.position; const vx = p.x - c.position.x, vz = p.z - c.position.z, d = Math.hypot(vx, vz); if (d > 1.4) { dx = vx / d * Math.min(1, (d - 1.4)); dz = vz / d * Math.min(1, (d - 1.4)); } if (d > 9 && this.player.grounded) { this.place(c, p.x + .7, p.z + .5, p.y / c.size); } }
   const speed = c.id === 'latifa' ? 3.9 : 3.0; const ease = 1 - Math.exp(-(c.grounded ? 16 : 7) * dt);
   c.velocity.x += (dx * speed - c.velocity.x) * ease; c.velocity.z += (dz * speed - c.velocity.z) * ease;
   if (c.dash > 0) { c.dash -= dt; c.velocity.x = c.dashDir.x * 7.5; c.velocity.z = c.dashDir.z * 7.5; }
   if (c.grounded) { c.coyote = .12; c.jumpsLeft = c.id === 'latifa' ? 2 : 1; c.airTime = 0; } else { c.coyote = Math.max(0, c.coyote - dt); c.airTime += dt; }
   if (jump) c.jumpBuffer = .15; else c.jumpBuffer = Math.max(0, c.jumpBuffer - dt);
   if (c.jumpBuffer > 0 && (c.coyote > 0 || c.id === 'latifa' && c.jumpsLeft > 0)) {
    c.velocity.y = c.id === 'latifa' ? (c.coyote > 0 ? 6.6 : 6.0) : 5.5; c.jumpsLeft = c.coyote > 0 && c.id === 'latifa' ? 1 : 0; c.jumps++; c.jumpBuffer = 0; c.grounded = false; c.coyote = 0;
   }
   if (c.climb) { const target = c.climb; const vx = target.x - c.position.x, vz = target.z - c.position.z; c.velocity.x = vx * 4; c.velocity.z = vz * 4; c.velocity.y = 2.9; if (c.position.y > target.y) { c.climb = null; c.velocity.y = 2; c.boosted = 1; } }
   else if (c.grounded && c.velocity.y <= 0) c.velocity.y = -.6;
   else c.velocity.y = Math.max(c.slam ? -18 : -15, c.velocity.y - 17 * dt);
   const fallSpeed = c.velocity.y;
   c.controller.computeColliderMovement(c.collider, { x: c.velocity.x * dt, y: c.velocity.y * dt, z: c.velocity.z * dt }, undefined, undefined, other => other.handle !== this.cats[1 - i].collider.handle);
   const actual = c.controller.computedMovement(), p = c.body.translation(); c.body.setNextKinematicTranslation({ x: p.x + actual.x, y: p.y + actual.y, z: p.z + actual.z });
   const grounded = c.controller.computedGrounded() && c.velocity.y <= 0;
   if (grounded && !c.grounded && fallSpeed < -3) { c.landed = Math.min(1, -fallSpeed / 14); onLand?.(c, fallSpeed); }
   if (grounded && c.slam) { c.slam = false; onSlam(c); }
   if (c.velocity.y > 0 && actual.y < c.velocity.y * dt - .004) { c.velocity.y = 0; c.climb = null; }
   c.grounded = grounded; if (Math.hypot(dx, dz) > .08 && c.dash <= 0) c.facing = Math.atan2(dx, dz);
  }
  this.world.step(this.events);
  for (const c of this.cats) { c.position = { ...c.body.translation() }; c.speed = Math.hypot(c.position.x - c.previous.x, c.position.z - c.previous.z) / dt; }
 }
 dispose() { this.events.free(); this.world.free(); }
}

// ---------------------------------------------------------------- input
class Input {
 constructor(canvas, onPause, onActivity) {
  this.actions = new Set(); this.heldPaw = false; this.move = { x: 0, y: 0 }; this.touchMove = { x: 0, y: 0 }; this.keys = new Set();
  this.look = { x: 0, y: 0 }; this.jumpQueued = false; this.movePointer = null; this.lookPointer = null; this.lookActive = 0;
  this.center = { x: 0, y: 0 }; this.lastLook = { x: 0, y: 0 }; this.enabled = true; this.vibration = true; this.sensitivity = 1;
  this.zone = document.getElementById('move-zone'); this.joystick = document.getElementById('joystick'); this.stick = document.getElementById('stick'); this.jumpButton = document.getElementById('jump');
  this.zone.addEventListener('pointerdown', e => {
   if (!this.enabled || this.movePointer !== null) return;
   e.preventDefault(); onActivity(); this.movePointer = e.pointerId; this.zone.setPointerCapture(e.pointerId);
   const r = this.zone.getBoundingClientRect(); const size = this.joystick.offsetWidth;
   this.center = { x: Math.max(r.left + size / 2 + 8, Math.min(r.right - size / 2 - 8, e.clientX)), y: Math.max(r.top + size / 2 + 8, Math.min(r.bottom - size / 2 - 8, e.clientY)) };
   Object.assign(this.joystick.style, { left: (this.center.x - r.left - size / 2) + 'px', top: (this.center.y - r.top - size / 2) + 'px', bottom: 'auto' }); this.joystick.classList.add('active');
   this.updateStick(e);
  });
  this.zone.addEventListener('pointermove', e => { if (e.pointerId === this.movePointer) this.updateStick(e); });
  const releaseMove = e => { if (e.pointerId === this.movePointer) this.resetStick(); };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => this.zone.addEventListener(t, releaseMove));
  canvas.addEventListener('pointerdown', e => { if (!this.enabled || this.lookPointer !== null) return; e.preventDefault(); onActivity(); this.lookPointer = e.pointerId; this.lastLook = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (this.enabled && e.pointerId === this.lookPointer) { const k = (e.pointerType === 'mouse' ? .8 : 1.15) * this.sensitivity; this.look.x += (e.clientX - this.lastLook.x) * k; this.look.y += (e.clientY - this.lastLook.y) * k; this.lastLook = { x: e.clientX, y: e.clientY }; } });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => canvas.addEventListener(t, e => { if (e.pointerId === this.lookPointer) this.lookPointer = null; }));
  this.jumpButton.addEventListener('pointerdown', e => { if (!this.enabled) return; e.preventDefault(); onActivity(); this.jumpQueued = true; this.jumpButton.setPointerCapture(e.pointerId); this.jumpButton.classList.add('pressed'); this.haptic(10); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => this.jumpButton.addEventListener(t, () => this.jumpButton.classList.remove('pressed')));
  for (const action of ['paw', 'special', 'switch']) {
   const button = document.getElementById(action);
   button.addEventListener('pointerdown', e => { if (!this.enabled) return; e.preventDefault(); onActivity(); button.setPointerCapture(e.pointerId); this.actions.add(action); if (action === 'paw') this.heldPaw = true; this.haptic(10); button.classList.add('pressed'); });
   for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(event, () => { if (action === 'paw') this.heldPaw = false; button.classList.remove('pressed'); });
  }
  window.addEventListener('keydown', e => {
   if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
   if (e.code === 'Escape') { e.preventDefault(); if (!e.repeat) onPause(); return; }
   if (!this.enabled) return;
   if (['KeyF', 'KeyE', 'KeyQ', 'KeyJ', 'KeyK'].includes(e.code)) { e.preventDefault(); if (!e.repeat) this.actions.add({ KeyF: 'paw', KeyJ: 'paw', KeyE: 'special', KeyK: 'special', KeyQ: 'switch' }[e.code]); if (e.code === 'KeyF' || e.code === 'KeyJ') this.heldPaw = true; return; }
   if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) { e.preventDefault(); onActivity(); this.keys.add(e.code); if (e.code === 'Space' && !e.repeat) this.jumpQueued = true; }
  });
  window.addEventListener('keyup', e => { this.keys.delete(e.code); if (e.code === 'KeyF' || e.code === 'KeyJ') this.heldPaw = false; });
  window.addEventListener('blur', () => this.clear());
  canvas.addEventListener('contextmenu', e => e.preventDefault());
 }
 updateStick(e) { const dx = e.clientX - this.center.x, dy = e.clientY - this.center.y; const d = Math.hypot(dx, dy), radius = this.joystick.offsetWidth * .34; const scale = d > radius ? radius / d : 1; this.stick.style.transform = `translate(${dx * scale}px,${dy * scale}px)`; const n = Math.min(d / radius, 1); const strength = n < .1 ? 0 : Math.min(1, (n - .1) / .8); this.touchMove = { x: d ? dx / d * strength : 0, y: d ? -dy / d * strength : 0 }; }
 resetStick() { this.movePointer = null; this.touchMove = { x: 0, y: 0 }; this.stick.style.transform = ''; Object.assign(this.joystick.style, { left: '', top: '', bottom: '' }); this.joystick.classList.remove('active'); }
 update() {
  if (this.heldPaw) this.actions.add('paw');
  const k = this.keys;
  this.move.x = this.touchMove.x + (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
  this.move.y = this.touchMove.y + (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
 }
 consume(action) { const v = this.actions.has(action); this.actions.delete(action); return v; }
 consumeJump() { const v = this.jumpQueued; this.jumpQueued = false; return v; }
 consumeLook() { const v = { ...this.look }; this.look.x = this.look.y = 0; return v; }
 haptic(ms) { if (this.vibration && navigator.vibrate) try { navigator.vibrate(ms); } catch { } }
 clear() { this.actions.clear(); this.heldPaw = false; this.keys.clear(); this.move = { x: 0, y: 0 }; this.look = { x: 0, y: 0 }; this.jumpQueued = false; this.lookPointer = null; this.resetStick(); document.querySelectorAll('.action.pressed').forEach(b => b.classList.remove('pressed')); }
}

// ---------------------------------------------------------------- save
class SaveData {
 constructor(onError) {
  this.onError = onError;
  this.data = { version: 1, unlocked: 1, stars: [0, 0, 0, 0, 0], best: [0, 0, 0, 0, 0], fish: 0, found: [], collars: [0], collar: 0, settings: { quality: 'auto', volume: .5, vibration: true, music: true, sensitivity: 1, autoCam: true } };
  try {
   const s = JSON.parse(localStorage.getItem('mae-house-chaos-v1') || 'null');
   if (s?.version === 1) {
    this.data.unlocked = Math.max(1, Math.min(5, Number(s.unlocked) || 1));
    for (const k of ['stars', 'best']) if (Array.isArray(s[k])) this.data[k] = Array.from({ length: 5 }, (_, i) => Math.max(0, Math.min(k === 'stars' ? 3 : 1000000, Number(s[k][i]) || 0)));
    this.data.fish = Math.max(0, Number(s.fish) || 0); this.data.found = Array.isArray(s.found) ? s.found.filter(x => typeof x === 'string') : [];
    this.data.collars = Array.isArray(s.collars) ? s.collars.filter(x => [0, 1, 2, 3].includes(x)) : [0]; if (!this.data.collars.includes(0)) this.data.collars.push(0); this.data.collar = this.data.collars.includes(s.collar) ? s.collar : 0;
    if (s.settings) { const t = s.settings; this.data.settings = { quality: ['auto', 'high', 'medium', 'low'].includes(t.quality) ? t.quality : 'auto', volume: Math.max(0, Math.min(1, Number(t.volume ?? .5) || 0)), vibration: t.vibration !== false, music: t.music !== false, sensitivity: Math.max(.4, Math.min(2, Number(t.sensitivity) || 1)), autoCam: t.autoCam !== false }; }
   }
  } catch { this.unavailable = true; }
 }
 write() { try { localStorage.setItem('mae-house-chaos-v1', JSON.stringify(this.data)); return true; } catch { if (!this.warned) { this.onError?.('השמירה במכשיר חסומה. ההתקדמות נשמרת עד לסגירת המשחק.'); this.warned = true; } return false; } }
 fish(id) { if (this.data.found.includes(id)) return false; this.data.found.push(id); this.data.fish++; this.write(); return true; }
 complete(index, stars, score) { this.data.stars[index] = Math.max(stars, this.data.stars[index]); this.data.best[index] = Math.max(score, this.data.best[index]); this.data.unlocked = Math.max(this.data.unlocked, Math.min(5, index + 2)); this.write(); }
 buy(index, cost) { if (!this.data.collars.includes(index)) { if (this.data.fish < cost) return false; this.data.fish -= cost; this.data.collars.push(index); } this.data.collar = index; this.write(); return true; }
}

// ---------------------------------------------------------------- renderer
// Lighting moods per room: the sun always enters through the window side.
const MOODS = [
 { bg: '#e9d9c2', sun: '#ffe6bf', sunI: 3.0, dir: [3, 8, 2.4], hemiSky: '#fff3e2', hemiGround: '#9a7a5c', hemi: .9, env: .55, exp: 1.0, lamp: '#ffc07a', lampI: 4 },
 { bg: '#eef0e2', sun: '#fff4dc', sunI: 3.3, dir: [2.5, 8, 3], hemiSky: '#f6fbff', hemiGround: '#a2967a', hemi: 1.0, env: .62, exp: 1.02, lamp: '#ffd59a', lampI: 3 },
 { bg: '#f0c99c', sun: '#ffc285', sunI: 3.6, dir: [5, 6.2, 2], hemiSky: '#ffe2bf', hemiGround: '#8d6a50', hemi: .85, env: .5, exp: 1.0, lamp: '#ffb46b', lampI: 5 },
 { bg: '#c9a4a0', sun: '#ffb27a', sunI: 2.0, dir: [5, 5, 1.5], hemiSky: '#e5d2ee', hemiGround: '#6b4f50', hemi: .7, env: .42, exp: 1.05, lamp: '#ffae62', lampI: 9 },
 { bg: '#e9d9c2', sun: '#ffdcae', sunI: 3.1, dir: [3, 8, 2.4], hemiSky: '#fff3e2', hemiGround: '#9a7a5c', hemi: .95, env: .55, exp: 1.0, lamp: '#ffc07a', lampI: 4 }
];
class GameRenderer {
 constructor(canvas, lite = false) {
  this.lite = lite; this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: false, powerPreference: 'high-performance' });
  const r = this.renderer; r.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap; r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
  this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#e9d9c2'); this.scene.fog = new THREE.Fog('#e9d9c2', 16, 38);
  const pmrem = new THREE.PMREMGenerator(r); this.envMap = pmrem.fromScene(new RoomEnvironment(), .04).texture; this.scene.environment = this.envMap; pmrem.dispose(); this.envBoost = 1; this.scene.environmentIntensity = .55;
  this.camera = new THREE.PerspectiveCamera(58, 1, .06, 70);
  this.hemi = new THREE.HemisphereLight('#fff3e2', '#9a7a5c', .9); this.scene.add(this.hemi);
  this.sun = new THREE.DirectionalLight('#ffe6bf', 3); this.sun.castShadow = true; this.sunDir = new THREE.Vector3(3, 8, 2.4).normalize();
  this.sun.shadow.mapSize.set(1024, 1024); Object.assign(this.sun.shadow.camera, { left: -7.5, right: 7.5, top: 7.5, bottom: -7.5, near: .5, far: 30 });
  this.sun.shadow.normalBias = .03; this.sun.shadow.bias = -.0004; this.sun.shadow.radius = 2.5; this.scene.add(this.sun, this.sun.target);
  this.lamp = new THREE.PointLight('#ffc07a', 4, 7, 1.8); this.lamp.position.set(4.6, 2, -3.8); this.scene.add(this.lamp);
  this.focus = new THREE.Vector3(); this.composer = null; this.post = false; this.mood = MOODS[0];
  this.resize();
 }
 setEnv(on) { this.scene.environment = on ? this.envMap : null; this.envBoost = on ? 1 : 1.7; this.hemi.intensity = this.mood.hemi * this.envBoost; }
 setMood(i) { const m = this.mood = MOODS[i]; this.scene.background.set(m.bg); this.scene.fog.color.set(m.bg); this.sun.color.set(m.sun); this.sun.intensity = m.sunI; this.sunDir.set(...m.dir).normalize(); this.hemi.color.set(m.hemiSky); this.hemi.groundColor.set(m.hemiGround); this.hemi.intensity = m.hemi * this.envBoost; this.scene.environmentIntensity = m.env; this.renderer.toneMappingExposure = m.exp; this.lamp.color.set(m.lamp); this.lamp.intensity = m.lampI; }
 dim(k) { const m = this.mood; this.sun.intensity = m.sunI * k; this.hemi.intensity = m.hemi * this.envBoost * k; this.scene.environmentIntensity = m.env * Math.max(.15, k); this.lamp.intensity = m.lampI * Math.max(.3, k); }
 follow(p) { this.focus.lerp(p, .2); const t = new THREE.Vector3(Math.round(this.focus.x * 4) / 4, 0, Math.round(this.focus.z * 4) / 4); this.sun.target.position.copy(t); this.sun.position.copy(t).addScaledVector(this.sunDir, 14); }
 setPost(on) {
  this.post = on;
  if (on && !this.composer) {
   const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
   const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
   this.composer = new EffectComposer(this.renderer, target); this.composer.addPass(new RenderPass(this.scene, this.camera));
   this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), .22, .5, .92); this.composer.addPass(this.bloom); this.composer.addPass(new OutputPass());
  }
  this.resize();
 }
 resize() {
  const w = window.innerWidth, h = window.innerHeight; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.baseFov = w < h ? 70 : 56; this.camera.fov = this.camera.baseFov; this.camera.updateProjectionMatrix();
  if (this.composer) { this.composer.setPixelRatio(this.renderer.getPixelRatio()); this.composer.setSize(w, h); }
 }
 draw() { if (this.post && this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera); }
}
class Quality {
 constructor(view) { this.view = view; this.mode = 'auto'; this.level = 1; this.samples = []; this.elapsed = 0; this.good = 0; this.setLevel(1); }
 setMode(mode) { this.mode = mode; this.samples = []; this.elapsed = 0; this.good = 0; this.setLevel(mode === 'high' ? 2 : mode === 'low' ? 0 : 1); }
 setLevel(level) {
  const changed = level !== this.level || !this.applied; this.level = level; this.applied = true; const r = this.view.renderer;
  r.setPixelRatio(Math.min(devicePixelRatio, [1, 1.35, 2][level]));
  TEX_ANISO = [1, 4, 8][level]; this.view.setEnv(level > 0);
  const shadows = level > 0; this.view.sun.castShadow = shadows; r.shadowMap.enabled = shadows;
  const size = level === 2 ? 2048 : 1024; if (this.view.sun.shadow.mapSize.x !== size) { this.view.sun.shadow.mapSize.set(size, size); this.view.sun.shadow.map?.dispose(); this.view.sun.shadow.map = null; }
  this.view.setPost(level === 2);
  if (changed) this.view.scene.traverse(o => { if (o.material) for (const m of [].concat(o.material)) { m.needsUpdate = true; for (const v of Object.values(m)) if (v?.isTexture && v.anisotropy !== TEX_ANISO) { v.anisotropy = TEX_ANISO; v.needsUpdate = true; } } });
  this.samples = []; this.elapsed = 0;
 }
 sample(dt) {
  if (this.mode !== 'auto' || dt <= 0 || !Number.isFinite(dt)) return;
  dt = Math.min(dt, .5); this.samples.push(dt); this.elapsed += dt; if (this.elapsed < 3) return;
  const avg = this.elapsed / this.samples.length;
  if (avg > 1 / 45 && this.level > 0) { this.setLevel(this.level - 1); this.good = 0; }
  else if (avg < 1 / 57) { this.good += this.elapsed; if (this.good > 12 && this.level < 2) { this.setLevel(this.level + 1); this.good = 0; } }
  else this.good = 0;
  this.samples = []; this.elapsed = 0;
 }
}

// ---------------------------------------------------------------- camera
class FollowCamera {
 constructor(camera, physics) { this.camera = camera; this.physics = physics; this.yaw = .15; this.pitch = .36; this.target = new THREE.Vector3(); this.initialized = false; this.currentDistance = 4.5; this.probe = new RAPIER.Ball(.18); this.rotation = { x: 0, y: 0, z: 0, w: 1 }; this.direction = new THREE.Vector3(); this.anchor = new THREE.Vector3(); this.shake = 0; this.idle = 9; this.auto = true; this.ahead = new THREE.Vector3(); this.kick = 0; }
 look(dx, dy) { if (dx || dy) this.idle = 0; this.yaw -= dx * .0062; this.pitch = clamp(this.pitch + dy * .0042, .08, 1.05); }
 update(dt, cat) {
  const position = cat.position; this.idle += dt;
  if (this.auto && this.idle > 1.1 && cat.speed > .7 && !cat.climb) { const d = angleDelta(this.yaw, cat.facing + Math.PI); if (Math.abs(d) < 2.5) this.yaw += d * Math.min(1, dt * 1.1) * Math.min(1, cat.speed / 3.5); }
  this.ahead.lerp(new THREE.Vector3(cat.velocity.x * .12, 0, cat.velocity.z * .12), 1 - Math.exp(-3 * dt));
  this.anchor.set(position.x + this.ahead.x, position.y + .62, position.z + this.ahead.z);
  if (!this.initialized) { this.target.copy(this.anchor); this.initialized = true; } else { this.target.x = damp(this.target.x, this.anchor.x, 12, dt); this.target.z = damp(this.target.z, this.anchor.z, 12, dt); this.target.y = damp(this.target.y, this.anchor.y, cat.grounded ? 9 : 4, dt); }
  const bridge = new THREE.Vector3().copy(this.target).sub(new THREE.Vector3(position.x, position.y, position.z)); const length = bridge.length();
  if (length > .01) { bridge.multiplyScalar(1 / length); const block = this.physics.world.castShape(position, this.rotation, bridge, this.probe, 0, length, true, RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC | RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC); if (block) this.target.set(position.x, position.y, position.z).addScaledVector(bridge, Math.max(0, block.time_of_impact - .025)); }
  // In tight corners the camera rises over the walls instead of pushing into the cat.
  const distance = (this.camera.aspect < 1 ? 5.3 : 4.3) + this.pitch * .6, flags = RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC | RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC;
  const dirAt = pitch => this.direction.set(Math.sin(this.yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(this.yaw) * Math.cos(pitch));
  const probe = this.physics.world.castShape(this.target, this.rotation, dirAt(this.pitch), this.probe, 0, distance, true, flags);
  this.lift = damp(this.lift || 0, probe && probe.time_of_impact < distance * .65 ? Math.min(.75, 1.15 - this.pitch) : 0, 2.5, dt);
  const pitch = Math.min(1.25, this.pitch + this.lift); dirAt(pitch);
  const hit = this.physics.world.castShape(this.target, this.rotation, this.direction, this.probe, 0, distance, true, flags);
  const allowed = hit ? Math.max(.015, hit.time_of_impact - .035) : distance; this.currentDistance = allowed < this.currentDistance ? allowed : lerp(this.currentDistance, allowed, 1 - Math.exp(-4 * dt));
  this.camera.position.copy(this.target).addScaledVector(this.direction, this.currentDistance); this.camera.lookAt(this.target);
  this.shake = Math.max(0, this.shake - dt * 1.6); if (this.shake > 0) { const s = this.shake * this.shake * .5, t = performance.now() * .05; this.camera.position.x += Math.sin(t * 1.3) * s; this.camera.position.y += Math.sin(t * 1.7 + 1) * s; this.camera.rotation.z += Math.sin(t * 2.1) * s * .3; }
  const run = Math.min(1, cat.speed / 4); this.kick = damp(this.kick, run * 4 + (cat.dash > 0 ? 6 : 0), 5, dt); const fov = (this.camera.baseFov || 56) + this.kick; if (Math.abs(this.camera.fov - fov) > .05) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
 }
 recenter(facing) { this.yaw = facing + Math.PI; this.pitch = .36; this.idle = 0; }
 reset() { this.initialized = false; this.currentDistance = 4.5; }
}
