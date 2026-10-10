// The island of Solmere: terrain, props, colliders, interactables.
// Everything is generated from code (no ripped assets).
import * as THREE from 'three';
import { Terrain } from '../engine/terrain.js';
import { Physics } from '../engine/physics.js';
import { ZoneSystem } from '../engine/scripts.js';
import { fbm, noise2, smoothstep, lerp, rng, distToSegment } from '../engine/math.js';
import { mat } from '../engine/rig.js';

export const POI = {
  start: { x: -38, z: 4 },
  village: { x: -42, z: -4 },
  lighthouse: { x: 2, z: -80 },
  sage: { x: 4, z: -73 },
  plateau: { x: 55, z: -25, r: 11, h: 14 },
  stonesStart: { x: 34, z: -6 },
  target: { x: 31, z: -12 },
  camp: { x: 8, z: 52 },
  chest: { x: 9, z: 57 },
  fort: { x: 48, z: 36, half: 11 },
};

const FLATS = [
  { ...POI.village, r: 20, h: 2.2 },
  { ...POI.camp, r: 15, h: 2.6 },
  { ...POI.fort, r: 16, h: 3.0 },
  { x: 2, z: -77, r: 8, h: 9.5 },
];

export const PATHS = [
  [[-42, -4], [-30, -30], [-14, -55], [2, -72]],
  [[-42, -4], [-28, 18], [-6, 42], [8, 52]],
  [[8, 52], [26, 44], [36, 36]],
  [[-42, -4], [-12, -8], [14, -7], [33, -7]],
  [[36, 36], [40, 16], [34, -2]],
];

function pathDist(x, z) {
  let d = 1e9;
  for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) d = Math.min(d, distToSegment(x, z, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]));
  return d;
}

export function islandHeight(x, z) {
  const r = Math.hypot(x, z);
  const a = Math.atan2(z, x);
  const coast = 96 + noise2(Math.cos(a) * 1.6 + 5, Math.sin(a) * 1.6 + 5) * 8 + fbm(x * 0.03, z * 0.03, 2) * 4;
  const t = r / coast;
  let h = 3.2 + fbm(x * 0.018, z * 0.018) * 3.2 + fbm(x * 0.07, z * 0.07, 2) * 0.6;
  h = lerp(h, 0.6, smoothstep(0.72, 0.9, t));
  h -= smoothstep(0.88, 1.12, t) * 7;
  // lighthouse headland
  const dl = Math.hypot(x - 2, z + 76);
  h += Math.exp(-(dl * dl) / (2 * 15 * 15)) * 8.5;
  // flattened areas
  for (const f of FLATS) {
    const d = Math.hypot(x - f.x, z - f.z);
    h = lerp(h, f.h, 1 - smoothstep(f.r * 0.65, f.r, d));
  }
  // plateau ("Whispering Cliffs")
  const P = POI.plateau;
  const dp = Math.hypot(x - P.x, (z - P.z) * 1.15);
  const pw = 1 - smoothstep(P.r, P.r + 2.4, dp);
  h = lerp(h, P.h + fbm(x * 0.2, z * 0.2, 2) * 0.25, pw);
  return h;
}

function islandColor(x, z, h, slope, c) {
  const n = fbm(x * 0.15, z * 0.15, 2);
  if (h < 0.15) c.setRGB(0.55 + n * 0.05, 0.5, 0.36);
  else if (h < 1.0) c.setRGB(0.86 + n * 0.04, 0.79 + n * 0.04, 0.56);
  else c.setRGB(0.27 + n * 0.06, 0.5 + n * 0.08, 0.2);
  if (slope > 0.75 && h > 0.5) {
    const k = smoothstep(0.75, 1.2, slope);
    c.lerp(new THREE.Color(0.45 + n * 0.05, 0.41, 0.36), k);
  }
  if (h > 0.9) {
    const pd = pathDist(x, z);
    if (pd < 2.2) c.lerp(new THREE.Color(0.58, 0.48, 0.33), smoothstep(2.2, 1.0, pd) * 0.9);
  }
  // cobbled plazas
  const vd = Math.hypot(x - POI.village.x, z - POI.village.z);
  if (vd < 9) c.lerp(new THREE.Color(0.62, 0.6, 0.56), smoothstep(9, 7, vd) * (0.8 + n * 0.2));
  const fd = Math.max(Math.abs(x - POI.fort.x), Math.abs(z - POI.fort.z));
  if (fd < 10.5) c.setRGB(0.5 + n * 0.04, 0.48, 0.45);
  const cd = Math.hypot(x - POI.camp.x, z - POI.camp.z);
  if (cd < 12) c.lerp(new THREE.Color(0.48, 0.4, 0.3), smoothstep(12, 8, cd) * 0.8);
}

function add(scene, geo, material, x, y, z, { rx = 0, ry = 0, rz = 0, cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = cast;
  m.receiveShadow = receive;
  scene.add(m);
  return m;
}

export function buildWorld(scene) {
  const terrain = new Terrain({ size: 260, segs: 200, heightFn: islandHeight, colorFn: islandColor });
  scene.add(terrain.mesh);
  const physics = new Physics(terrain);
  const zones = new ZoneSystem();
  const H = (x, z) => terrain.heightAt(x, z);
  const W = {
    terrain, physics, zones, H, POI,
    interactables: [], ballTargets: [], crates: [], updaters: [], lights: [], swayMats: [],
  };
  const rand = rng(42);

  // ---------- foliage sway shader ----------
  const swayU = { uTime: { value: 0 }, uWind: { value: 1 } };
  W.swayU = swayU;
  const sway = (m, amount) => {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = swayU.uTime;
      sh.uniforms.uWind = swayU.uWind;
      sh.vertexShader = 'uniform float uTime; uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        #else
          vec3 ip = vec3(0.0);
        #endif
        float sw = sin(uTime * (1.3 + uWind) + ip.x * 0.31 + ip.z * 0.23) * ${amount.toFixed(3)} * uWind * max(position.y, 0.0);
        transformed.x += sw; transformed.z += sw * 0.6;`);
    };
    m.customProgramCacheKey = () => 'sway' + amount;
    return m;
  };

  // ---------- trees / grass / rocks ----------
  const exclusions = [
    { ...POI.village, r: 22 }, { ...POI.camp, r: 17 }, { x: POI.fort.x, z: POI.fort.z, r: 18 },
    { x: 2, z: -77, r: 10 }, { ...POI.target, r: 5 }, { x: 40, z: -14, r: 9 },
  ];
  const okSpot = (x, z, clear = 3) => {
    const h = H(x, z);
    if (h < 1.3) return false;
    if (terrain.slopeAt(x, z) > 0.55) return false;
    for (const e of exclusions) if (Math.hypot(x - e.x, z - e.z) < e.r) return false;
    if (pathDist(x, z) < clear) return false;
    return true;
  };
  const trees = [];
  for (let i = 0; i < 1600 && trees.length < 420; i++) {
    const x = (rand() - 0.5) * 200, z = (rand() - 0.5) * 200;
    const forest = x > 12 && z < 22 && z > -60;
    const north = z < -30 && x < 0;
    const p = forest ? 0.85 : north ? 0.45 : 0.18;
    if (rand() > p) continue;
    if (!okSpot(x, z)) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 2.6)) continue;
    trees.push({ x, z, h: H(x, z), s: 0.8 + rand() * 0.6, pine: forest ? rand() < 0.65 : rand() < 0.3, ry: rand() * 6.28 });
  }
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 2.2, 7); trunkGeo.translate(0, 1.1, 0);
  const pineGeo = new THREE.ConeGeometry(1.6, 3.2, 8); pineGeo.translate(0, 3.6, 0);
  const pine2 = new THREE.ConeGeometry(1.15, 2.4, 8); pine2.translate(0, 5.0, 0);
  const blobGeo = new THREE.IcosahedronGeometry(1.7, 1); blobGeo.translate(0, 3.6, 0);
  const trunkMat = mat('#6b4a2e');
  const pineMat = sway(new THREE.MeshStandardMaterial({ color: '#2f6b3a', roughness: 0.85 }), 0.025);
  const leafMat = sway(new THREE.MeshStandardMaterial({ color: '#4f8f3a', roughness: 0.85 }), 0.03);
  const mkInst = (geo, m, list) => {
    const im = new THREE.InstancedMesh(geo, m, Math.max(1, list.length));
    im.castShadow = true; im.receiveShadow = true;
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    list.forEach((t, i) => {
      o.position.set(t.x, t.h - 0.1, t.z); o.rotation.set(0, t.ry, 0); o.scale.setScalar(t.s); o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
      col.setHSL(0.27 + (rand() - 0.5) * 0.06, 0.45, 0.32 + rand() * 0.12);
      im.setColorAt(i, col);
    });
    im.count = list.length;
    scene.add(im);
    return im;
  };
  mkInst(trunkGeo, trunkMat, trees);
  mkInst(pineGeo, pineMat, trees.filter((t) => t.pine));
  mkInst(pine2, pineMat, trees.filter((t) => t.pine));
  mkInst(blobGeo, leafMat, trees.filter((t) => !t.pine));
  for (const t of trees) physics.add({ type: 'cyl', x: t.x, z: t.z, r: 0.45 * t.s, camR: 1.5 * t.s, top: t.h + 7 * t.s, seeThrough: false });
  W.trees = trees;

  // grass tufts + flowers
  const grass = [], flowers = [];
  for (let i = 0; i < 9000 && grass.length < 3200; i++) {
    const x = (rand() - 0.5) * 210, z = (rand() - 0.5) * 210;
    const h = H(x, z);
    if (h < 1.2 || terrain.slopeAt(x, z) > 0.6) continue;
    if (Math.hypot(x - POI.village.x, z - POI.village.z) < 9) continue;
    if (Math.max(Math.abs(x - POI.fort.x), Math.abs(z - POI.fort.z)) < 11) continue;
    if (pathDist(x, z) < 1.4) continue;
    grass.push({ x, z, h, s: 0.7 + rand() * 0.8, ry: rand() * 6.28 });
    if (rand() < 0.12) flowers.push({ x: x + 0.3, z: z + 0.2, h: H(x + 0.3, z + 0.2), s: 1, ry: 0 });
  }
  const tuft = new THREE.ConeGeometry(0.22, 0.6, 5, 1, true); tuft.translate(0, 0.28, 0);
  const grassMat = sway(new THREE.MeshStandardMaterial({ color: '#5f9a3c', roughness: 0.9, side: THREE.DoubleSide }), 0.18);
  const gi = mkInst(tuft, grassMat, grass);
  gi.castShadow = false;
  const flowerGeo = new THREE.IcosahedronGeometry(0.09, 0); flowerGeo.translate(0, 0.45, 0);
  const fi = new THREE.InstancedMesh(flowerGeo, new THREE.MeshStandardMaterial({ roughness: 0.6 }), flowers.length || 1);
  const fo = new THREE.Object3D();
  const palette = ['#ffd84a', '#ff6fa3', '#ffffff', '#b28cff', '#ff8a3d'].map((c) => new THREE.Color(c));
  flowers.forEach((f, i) => { fo.position.set(f.x, f.h, f.z); fo.updateMatrix(); fi.setMatrixAt(i, fo.matrix); fi.setColorAt(i, palette[i % palette.length]); });
  scene.add(fi);

  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rocks = [];
  for (let i = 0; i < 600 && rocks.length < 140; i++) {
    const x = (rand() - 0.5) * 220, z = (rand() - 0.5) * 220;
    const h = H(x, z);
    if (h < -1 || h > 13) continue;
    if (!okSpot(x, z, 2.5) && h > 1.3) continue;
    rocks.push({ x, z, h: h - 0.2, s: 0.3 + rand() * 0.9, ry: rand() * 6 });
  }
  const ri = new THREE.InstancedMesh(rockGeo, mat('#8a8378', { roughness: 0.95 }), rocks.length);
  ri.castShadow = ri.receiveShadow = true;
  const ro = new THREE.Object3D();
  rocks.forEach((r, i) => { ro.position.set(r.x, r.h, r.z); ro.rotation.set(r.ry, r.ry * 2, 0); ro.scale.set(r.s * 1.3, r.s, r.s); ro.updateMatrix(); ri.setMatrixAt(i, ro.matrix); });
  scene.add(ri);
  for (const r of rocks) if (r.s > 0.7) physics.add({ type: 'cyl', x: r.x, z: r.z, r: r.s * 1.1, top: r.h + r.s * 0.9, seeThrough: true });

  // ---------- village of Port Lumen ----------
  const wallMat = mat('#f1ece2', { roughness: 0.9 });
  const roofCols = ['#3c6fd1', '#c8452f', '#e08a2c', '#3c9a8a', '#8f4fc1'];
  const winMat = new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb347', emissiveIntensity: 1.6 });
  const house = (x, z, ry, w, d, roofCol) => {
    const g = H(x, z);
    const grp = new THREE.Group();
    grp.position.set(x, g, z); grp.rotation.y = ry;
    scene.add(grp);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 3.2, d), wallMat);
    wall.position.y = 1.5; wall.castShadow = wall.receiveShadow = true; grp.add(wall);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, d) * 0.62, 2.4, 4), mat(roofCol, { roughness: 0.7 }));
    roof.position.y = 4.3; roof.rotation.y = Math.PI / 4; roof.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); roof.castShadow = true; grp.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.9, 0.1), mat('#6a4224'));
    door.position.set(0, 0.95, d / 2 + 0.02); grp.add(door);
    for (const sx of [-1, 1]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.08), winMat);
      win.position.set(sx * w * 0.3, 1.9, d / 2 + 0.03); grp.add(win);
    }
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), mat('#9c8a7a'));
    ch.position.set(w * 0.25, 4.6, -d * 0.15); ch.castShadow = true; grp.add(ch);
    physics.add({ type: 'box', x, z, hw: w / 2, hd: d / 2, rot: ry, top: g + 6 });
  };
  const V = POI.village;
  house(V.x - 9, V.z - 11, 0.25, 6, 5, roofCols[0]);
  house(V.x + 8, V.z - 12, -0.3, 5, 5, roofCols[1]);
  house(V.x - 13, V.z + 6, Math.PI / 2 + 0.2, 6, 4.5, roofCols[2]);
  house(V.x + 11, V.z + 10, Math.PI + 0.5, 5.5, 5, roofCols[3]);
  house(V.x - 3, V.z + 15, Math.PI - 0.1, 5, 4.5, roofCols[4]);

  // well (hidden object zone)
  {
    const g = H(V.x, V.z);
    add(scene, new THREE.CylinderGeometry(1.2, 1.3, 1, 16, 1, true), mat('#9b948a', { side: THREE.DoubleSide }), V.x, g + 0.5, V.z);
    add(scene, new THREE.CircleGeometry(1.15, 16), mat('#173040'), V.x, g + 0.3, V.z, { rx: -Math.PI / 2 });
    for (const sx of [-1, 1]) add(scene, new THREE.BoxGeometry(0.15, 2.3, 0.15), mat('#6b4a2e'), V.x + sx * 1.1, g + 1.15, V.z);
    add(scene, new THREE.ConeGeometry(1.7, 0.9, 4), mat('#b5462f'), V.x, g + 2.6, V.z, { ry: Math.PI / 4 });
    physics.add({ type: 'cyl', x: V.x, z: V.z, r: 1.35, top: g + 1.0, noStand: true, seeThrough: true });
    W.well = { x: V.x, z: V.z };
  }
  // market stall
  {
    const sx = V.x + 7, sz = V.z + 1, g = H(sx, sz);
    add(scene, new THREE.BoxGeometry(3, 1, 1.2), mat('#8a5a32'), sx, g + 0.5, sz);
    add(scene, new THREE.BoxGeometry(3.4, 0.1, 2), mat('#e9d34a'), sx, g + 2.4, sz + 0.3, { rx: 0.25 });
    for (const px of [-1.5, 1.5]) add(scene, new THREE.BoxGeometry(0.12, 2.4, 0.12), mat('#6b4a2e'), sx + px, g + 1.2, sz - 0.5);
    for (let i = 0; i < 5; i++) add(scene, new THREE.SphereGeometry(0.16, 8, 6), mat(['#e03a3a', '#f0a030', '#7ac943', '#5ab0f0', '#e0e04a'][i]), sx - 1 + i * 0.5, g + 1.15, sz);
    physics.add({ type: 'box', x: sx, z: sz, hw: 1.5, hd: 0.6, rot: 0, top: g + 1.0, noStand: true, seeThrough: true });
    W.stall = { x: sx, z: sz + 1.6 };
  }
  // lanterns
  const lantern = (x, z, light = false) => {
    const g = H(x, z);
    add(scene, new THREE.CylinderGeometry(0.07, 0.09, 3, 6), mat('#2d2d2d', { metalness: 0.6 }), x, g + 1.5, z);
    add(scene, new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ffb050', emissiveIntensity: 3 }), x, g + 3.1, z, { cast: false });
    physics.add({ type: 'cyl', x, z, r: 0.15, top: g + 3, seeThrough: true });
    if (light) {
      const l = new THREE.PointLight('#ffb36b', 12, 14, 2);
      l.position.set(x, g + 3, z);
      scene.add(l);
      W.lights.push(l);
    }
  };
  lantern(V.x + 4, V.z - 5, true);
  lantern(V.x - 5, V.z + 5, true);
  lantern(V.x - 6, V.z - 6);

  // pier
  {
    let px = V.x - 14;
    while (H(px, V.z) > 0.5 && px > -120) px -= 0.5;
    const len = 18;
    const top = Math.max(1.0, H(px, V.z) + 0.4);
    const cx = px - len / 2 + 0.5;
    add(scene, new THREE.BoxGeometry(len, 0.25, 2.6), mat('#8b6440'), cx, top - 0.12, V.z);
    for (let i = 0; i < 7; i++) for (const s of [-1, 1]) add(scene, new THREE.CylinderGeometry(0.14, 0.14, 4, 6), mat('#5b4028'), px - i * 2.8, top - 2, V.z + s * 1.2);
    physics.add({ type: 'box', x: cx, z: V.z, hw: len / 2, hd: 1.3, rot: 0, top, seeThrough: true });
    W.pierEnd = { x: px - len + 2.5, z: V.z, y: top };
    // little boat
    const bx = px - len + 1, bz = V.z + 3.2;
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(4, 0.8, 1.6), mat('#c0392b'));
    hull.position.y = 0.2; boat.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.5), mat('#ddd'));
    mast.position.y = 2; boat.add(mast);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), mat('#f4efe2', { side: THREE.DoubleSide }));
    sail.position.set(0.8, 2.2, 0); boat.add(sail);
    boat.position.set(bx, 0, bz);
    boat.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(boat);
    W.updaters.push((dt, t) => { boat.position.y = Math.sin(t * 1.3) * 0.15 * (0.5 + W.storm); boat.rotation.z = Math.sin(t * 1.1) * 0.06 * (0.5 + W.storm * 2); });
  }

  // ---------- lighthouse ----------
  {
    const L = POI.lighthouse, g = H(L.x, L.z);
    const grp = new THREE.Group(); grp.position.set(L.x, g, L.z); scene.add(grp);
    const segH = 3.2;
    for (let i = 0; i < 5; i++) {
      const r0 = 3.0 - i * 0.3, r1 = 3.0 - (i + 1) * 0.3;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, segH, 24), mat(i % 2 ? '#d23b2f' : '#f4f1ea', { roughness: 0.6 }));
      m.position.y = segH * i + segH / 2; m.castShadow = m.receiveShadow = true; grp.add(m);
    }
    const topY = segH * 5;
    const balcony = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.3, 24), mat('#333', { metalness: 0.6 }));
    balcony.position.y = topY; grp.add(balcony);
    const lampMat = new THREE.MeshStandardMaterial({ color: '#444', emissive: '#ffefb0', emissiveIntensity: 0.05, transparent: true, opacity: 0.85 });
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 2, 16), lampMat);
    lamp.position.y = topY + 1.1; grp.add(lamp);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.4, 16), mat('#d23b2f'));
    cap.position.y = topY + 2.8; cap.castShadow = true; grp.add(cap);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.2), mat('#5a3a20'));
    door.position.set(0, 1.1, 2.95); grp.add(door);
    // the beam (visible once the Sun Lens is restored)
    const beamGeo = new THREE.ConeGeometry(4, 60, 24, 1, true);
    beamGeo.translate(0, -30, 0); beamGeo.rotateZ(Math.PI / 2);
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: '#fff2c0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    beam.position.y = topY + 1.1;
    grp.add(beam);
    const light = new THREE.PointLight('#ffe9b0', 0, 40, 1.5);
    light.position.y = topY + 1.1; grp.add(light);
    physics.add({ type: 'cyl', x: L.x, z: L.z, r: 3.1, top: g + 20 });
    W.lighthouse = { lampMat, beam, light, power: 0 };
    W.updaters.push((dt, t) => {
      const p = W.lighthouse.power;
      lampMat.emissiveIntensity = 0.05 + p * 6;
      beam.material.opacity = p * 0.22;
      light.intensity = p * 60;
      beam.rotation.y = t * 0.8;
    });
    // sage's hut barrels (hidden flask)
    for (const [ox, oz] of [[4.5, 2.5], [5.3, 1.6]]) {
      const bx = L.x + ox, bz = L.z + oz;
      add(scene, new THREE.CylinderGeometry(0.45, 0.4, 1.1, 12), mat('#7b5532'), bx, H(bx, bz) + 0.55, bz);
      physics.add({ type: 'cyl', x: bx, z: bz, r: 0.45, top: H(bx, bz) + 1.1, noStand: true, seeThrough: true });
    }
    W.barrels = { x: L.x + 4.9, z: L.z + 2.1 };
  }

  // ---------- Whispering Cliffs: target + rising stepping stones ----------
  {
    const P = POI.plateau, S = POI.stonesStart;
    const dx = P.x - S.x, dz = P.z - S.z;
    const dl = Math.hypot(dx, dz);
    const ux = dx / dl, uz = dz / dl;
    // last stone just outside the cliff edge
    const edge = dl - (P.r + 1.6) / Math.hypot(ux, uz * 1.15);
    const base = H(S.x, S.z);
    const n = Math.ceil((P.h - base) / 1.05);
    W.stones = [];
    const stoneMat = mat('#8d8578', { roughness: 0.95 });
    const mossMat = mat('#5d8a3a', { roughness: 0.95 });
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      const wob = Math.sin(i * 1.7) * 1.2;
      const x = S.x + ux * edge * k - uz * wob, z = S.z + uz * edge * k + ux * wob;
      const top = base + 1.0 + (P.h - 0.15 - base - 1.0) * k;
      const r = 1.15;
      const grp = new THREE.Group();
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.15, 30, 9), stoneMat);
      pillar.position.y = -15; pillar.castShadow = pillar.receiveShadow = true; grp.add(pillar);
      const moss = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.12, 9), mossMat);
      moss.position.y = -0.05; grp.add(moss);
      const ground = H(x, z);
      grp.position.set(x, ground - 0.3, z);
      scene.add(grp);
      const c = physics.add({ type: 'cyl', x, z, r, top: ground - 0.3, enabled: false });
      W.stones.push({ grp, c, top, ground: ground - 0.3, delay: i * 0.25 });
    }
    W.stonesRisen = false;
    W.raiseStones = (instant = false) => {
      W.stonesRisen = true;
      W.stones.forEach((s) => { s.c.enabled = true; s.t = instant ? 99 : -s.delay; });
    };
    W.updaters.push((dt) => {
      if (!W.stonesRisen) return;
      for (const s of W.stones) {
        s.t += dt;
        const k = smoothstep(0, 1.4, s.t);
        const y = lerp(s.ground, s.top, k);
        s.grp.position.y = y;
        s.c.top = y;
      }
    });

    // ball target
    const T = POI.target, g = H(T.x, T.z);
    const ty = g + 1.9;
    add(scene, new THREE.CylinderGeometry(0.15, 0.2, 1.9, 8), mat('#6b4a2e'), T.x, g + 0.95, T.z);
    const ringMat = new THREE.MeshStandardMaterial({ color: '#ff8a2a', emissive: '#ff6a00', emissiveIntensity: 2.2 });
    const disc = add(scene, new THREE.TorusGeometry(0.6, 0.14, 10, 24), ringMat, T.x, ty, T.z, { ry: Math.PI / 2 });
    add(scene, new THREE.CircleGeometry(0.5, 20), mat('#f4efe2', { side: THREE.DoubleSide }), T.x, ty, T.z, { ry: Math.PI / 2 });
    physics.add({ type: 'cyl', x: T.x, z: T.z, r: 0.25, top: g + 2.4, seeThrough: true });
    W.target = { x: T.x, y: ty, z: T.z, ringMat, disc, hit: false };
    W.updaters.push((dt, t) => { if (!W.target.hit) disc.rotation.x = Math.sin(t * 2) * 0.2; });

    // shard pedestal on top of the plateau
    const pg = H(P.x, P.z);
    add(scene, new THREE.CylinderGeometry(0.8, 1.0, 1.0, 8), mat('#cfc6b4'), P.x, pg + 0.5, P.z);
    physics.add({ type: 'cyl', x: P.x, z: P.z, r: 0.9, top: pg + 1.0 });
    W.shard1Spot = { x: P.x, y: pg + 2.0, z: P.z };
    // some standing stones up there
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = P.x + Math.cos(a) * 6.5, z = P.z + Math.sin(a) * 6.5 / 1.15;
      add(scene, new THREE.BoxGeometry(0.9, 3 + (i % 2), 0.6), stoneMat, x, H(x, z) + 1.5, z, { ry: -a });
      physics.add({ type: 'cyl', x, z, r: 0.6, top: H(x, z) + 3.5 });
    }
  }

  // ---------- Sentinel camp ----------
  {
    const C = POI.camp, g = H(C.x, C.z);
    const tent = (x, z, ry, col) => {
      const tg = H(x, z);
      add(scene, new THREE.ConeGeometry(2.4, 3.0, 6), mat(col, { roughness: 0.9 }), x, tg + 1.5, z, { ry });
      physics.add({ type: 'cyl', x, z, r: 2.0, top: tg + 3 });
    };
    tent(C.x - 7, C.z - 3, 0.3, '#59606b');
    tent(C.x + 7, C.z - 4, 1.1, '#4d5560');
    tent(C.x - 5, C.z + 7, 0.8, '#59606b');
    tent(C.x + 6, C.z + 7, 0.1, '#4d5560');
    // campfire
    const fx = C.x, fz = C.z;
    for (let i = 0; i < 4; i++) add(scene, new THREE.CylinderGeometry(0.12, 0.12, 1.4, 6), mat('#4b3020'), fx, g + 0.15, fz, { rz: Math.PI / 2, ry: (i * Math.PI) / 4 });
    const flameMat = new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#ff6a00', emissiveIntensity: 4, transparent: true, opacity: 0.9 });
    const flame = add(scene, new THREE.ConeGeometry(0.45, 1.2, 8), flameMat, fx, g + 0.75, fz, { cast: false });
    const fl = new THREE.PointLight('#ff8a3a', 25, 18, 2);
    fl.position.set(fx, g + 1.5, fz); scene.add(fl);
    physics.add({ type: 'cyl', x: fx, z: fz, r: 0.8, top: g + 0.6, noStand: true, seeThrough: true });
    W.updaters.push((dt, t) => {
      const f = 0.85 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.07;
      flame.scale.set(f, 0.9 + Math.sin(t * 9) * 0.15, f);
      fl.intensity = 22 * f;
    });
    // palisade
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      if (Math.abs(Math.sin(a / 2 - 0.9)) < 0.18) continue; // entrances
      if (Math.abs(Math.sin(a / 2 - 2.6)) < 0.14) continue;
      const x = C.x + Math.cos(a) * 13.5, z = C.z + Math.sin(a) * 13.5;
      add(scene, new THREE.CylinderGeometry(0.22, 0.25, 2.6, 6), mat('#6b4a2e'), x, H(x, z) + 1.0, z);
      physics.add({ type: 'cyl', x, z, r: 0.5, top: H(x, z) + 2.4, seeThrough: true });
    }
    // chest
    const K = POI.chest, kg = H(K.x, K.z);
    const chest = new THREE.Group(); chest.position.set(K.x, kg, K.z); chest.rotation.y = Math.PI; scene.add(chest);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.7, 0.8), mat('#8a5528')); body.position.y = 0.35; body.castShadow = true; chest.add(body);
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.12, 0.84), mat('#d4a93a', { metalness: 0.8, roughness: 0.3 })); band.position.y = 0.55; chest.add(band);
    const lidPivot = new THREE.Group(); lidPivot.position.set(0, 0.7, -0.4); chest.add(lidPivot);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.3, 12, 1, false, 0, Math.PI), mat('#8a5528'));
    lid.rotation.z = Math.PI / 2; lid.rotation.y = Math.PI / 2; lid.position.z = 0.4; lid.castShadow = true; lidPivot.add(lid);
    physics.add({ type: 'box', x: K.x, z: K.z, hw: 0.7, hd: 0.45, rot: 0, top: kg + 1.0, noStand: true, seeThrough: true });
    W.chest = { x: K.x, z: K.z, lidPivot, open: false, openT: 0 };
    W.updaters.push((dt) => { if (W.chest.open) { W.chest.openT = Math.min(1, W.chest.openT + dt * 2); lidPivot.rotation.x = -W.chest.openT * 1.9; } });
  }

  // ---------- Old fort ----------
  {
    const F = POI.fort, g = H(F.x, F.z), s = F.half;
    const stone = mat('#9a9184', { roughness: 0.95 });
    const wall = (x, z, w, d) => {
      add(scene, new THREE.BoxGeometry(w, 6, d), stone, x, g + 3, z);
      physics.add({ type: 'box', x, z, hw: w / 2, hd: d / 2, rot: 0, top: g + 6 });
      // crenellations
      const n = Math.floor(Math.max(w, d) / 1.6);
      for (let i = 0; i < n; i++) {
        const k = (i + 0.5) / n - 0.5;
        add(scene, new THREE.BoxGeometry(w > d ? 0.8 : d === w ? 0.8 : 1.4, 0.8, w > d ? 1.4 : 0.8), stone, x + (w > d ? k * w : 0), g + 6.4, z + (w > d ? 0 : k * d));
      }
    };
    wall(F.x, F.z - s, 2 * s, 1.4); // north
    wall(F.x, F.z + s, 2 * s, 1.4); // south
    wall(F.x + s, F.z, 1.4, 2 * s); // east
    // west wall with a gate gap
    const gap = 2.4;
    const seg = (2 * s - 2 * gap) / 2;
    wall(F.x - s, F.z - gap - seg / 2, 1.4, seg);
    wall(F.x - s, F.z + gap + seg / 2, 1.4, seg);
    for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = F.x + cx * s, z = F.z + cz * s;
      add(scene, new THREE.CylinderGeometry(1.9, 2.1, 8.5, 12), stone, x, g + 4.25, z);
      add(scene, new THREE.ConeGeometry(2.4, 2.4, 12), mat('#5a6170'), x, g + 9.7, z);
      physics.add({ type: 'cyl', x, z, r: 2.1, top: g + 9 });
    }
    // banners (Sentinel colours)
    for (const dz of [-gap - 1.2, gap + 1.2]) {
      add(scene, new THREE.PlaneGeometry(1.2, 2.6), mat('#7a1f2a', { side: THREE.DoubleSide }), F.x - s - 0.75, g + 4, F.z + dz, { ry: Math.PI / 2 });
    }
    // gate
    const gateMat = mat('#4a3420', { roughness: 0.8 });
    const gate = add(scene, new THREE.BoxGeometry(0.5, 5, gap * 2), gateMat, F.x - s, g + 2.5, F.z);
    for (let i = -2; i <= 2; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 0.12), mat('#3a3a3a', { metalness: 0.7 }));
      bar.position.z = i * 0.9; gate.add(bar);
    }
    const gc = physics.add({ type: 'box', x: F.x - s, z: F.z, hw: 0.4, hd: gap, rot: 0, top: g + 6 });
    W.gate = { mesh: gate, c: gc, open: false, t: 0, x: F.x - s - 1.2, z: F.z, y0: g + 2.5 };
    W.updaters.push((dt) => {
      if (!W.gate.open) return;
      W.gate.t = Math.min(1, W.gate.t + dt * 0.6);
      gate.position.y = W.gate.y0 - W.gate.t * 5.2;
    });
    // inner decor: braziers
    for (const [ox, oz] of [[6, -6], [6, 6]]) {
      const x = F.x + ox, z = F.z + oz;
      add(scene, new THREE.CylinderGeometry(0.5, 0.3, 1.2, 10), mat('#333', { metalness: 0.6 }), x, g + 0.6, z);
      add(scene, new THREE.ConeGeometry(0.4, 0.9, 8), new THREE.MeshStandardMaterial({ color: '#ff9a3a', emissive: '#ff5a00', emissiveIntensity: 4 }), x, g + 1.6, z, { cast: false });
      physics.add({ type: 'cyl', x, z, r: 0.55, top: g + 1.2, noStand: true, seeThrough: true });
    }
    const fl = new THREE.PointLight('#ff7a30', 18, 24, 2);
    fl.position.set(F.x + 6, g + 3, F.z); scene.add(fl);
    W.arena = { x: F.x, z: F.z, half: s - 1 };
  }

  // ---------- signs ----------
  W.signs = [];
  const sign = (x, z, ry, key) => {
    const g = H(x, z);
    add(scene, new THREE.BoxGeometry(0.15, 1.8, 0.15), mat('#6b4a2e'), x, g + 0.9, z);
    add(scene, new THREE.BoxGeometry(1.4, 0.7, 0.1), mat('#c9a66b'), x, g + 1.6, z, { ry });
    physics.add({ type: 'cyl', x, z, r: 0.2, top: g + 2, seeThrough: true });
    W.signs.push({ x, z, key });
  };
  sign(V.x + 15, V.z - 4, 0.2, 'sign_village');
  sign(-25, -30, 0.6, 'sign_lighthouse');
  sign(14, -10, 0, 'sign_cliffs');
  sign(-8, 40, 0.8, 'sign_camp');
  sign(32, 38, 1.2, 'sign_fort');

  // ---------- breakable crates ----------
  const crateMat = mat('#a0703c', { roughness: 0.85 });
  const crate = (x, z) => {
    const g = H(x, z);
    const m = add(scene, new THREE.BoxGeometry(1, 1, 1), crateMat, x, g + 0.5, z, { ry: x * 0.3 });
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: '#5a3a1a' }));
    m.add(edges);
    const c = physics.add({ type: 'box', x, z, hw: 0.5, hd: 0.5, rot: x * 0.3, top: g + 1, seeThrough: true });
    W.crates.push({ mesh: m, c, x, z, y: g + 0.5, alive: true });
  };
  [[-30, 0], [-31, 1.3], [-52, -2], [3, 46], [14, 46], [15, 47.3], [-2, 58], [38, 30], [25, -9], [-16, -54]].forEach(([x, z]) => crate(x, z));

  // ---------- zones (LBA-style) ----------
  zones.add({ type: 'checkpoint', id: 'cp_village', x: V.x, z: V.z, r: 8 });
  zones.add({ type: 'checkpoint', id: 'cp_lighthouse', x: POI.sage.x, z: POI.sage.z + 3, r: 6 });
  zones.add({ type: 'checkpoint', id: 'cp_cliffs', x: POI.stonesStart.x - 3, z: POI.stonesStart.z, r: 5 });
  zones.add({ type: 'checkpoint', id: 'cp_fort', x: POI.fort.x - POI.fort.half - 6, z: POI.fort.z, r: 4 });
  zones.add({ type: 'checkpoint', id: 'cp_plateau', x: POI.plateau.x, z: POI.plateau.z, r: 6, y0: POI.plateau.h - 1 });
  zones.add({ type: 'arena', id: 'arena', x: POI.fort.x, z: POI.fort.z, hw: POI.fort.half - 1, hd: POI.fort.half - 1 });
  zones.add({ type: 'region', id: 'camp', x: POI.camp.x, z: POI.camp.z, r: 15 });
  zones.add({ type: 'hint', id: 'hint_target', x: POI.target.x - 4, z: POI.target.z + 3, r: 6, once: true });

  // hidden-object search spots
  W.searchSpots = [
    { id: 'well', x: W.well.x, z: W.well.z, r: 2.3, reward: 'coins5' },
    { id: 'barrels', x: W.barrels.x, z: W.barrels.z, r: 2.0, reward: 'flask' },
    { id: 'stump', x: 46, z: -2, r: 2.0, reward: 'clover' },
  ];
  // the stump
  add(scene, new THREE.CylinderGeometry(0.7, 0.9, 0.8, 10), mat('#6b4a2e'), 46, H(46, -2) + 0.4, -2);
  physics.add({ type: 'cyl', x: 46, z: -2, r: 0.8, top: H(46, -2) + 0.8, seeThrough: true });

  W.storm = 1;
  W.update = (dt, t) => {
    swayU.uTime.value = t;
    swayU.uWind.value = 0.4 + W.storm * 1.2;
    for (const u of W.updaters) u(dt, t);
  };
  return W;
}
