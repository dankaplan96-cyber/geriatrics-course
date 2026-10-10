// Interior scenes. LBA2 shows interiors ("cubes intérieurs") with a fixed
// isometric camera, rotated 45°, where only the two far walls are drawn so
// you can see inside. Rooms live far from the island in the same world and
// the outdoor scenery is hidden while you are inside.
import * as THREE from 'three';
import { mat } from '../engine/rig.js';
import { textures } from '../engine/textures.js';

const texMat = (tex, rx, ry, extra = {}) => {
  const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry);
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, ...extra });
};

class RoomBuilder {
  constructor(scene, physics, id, cx, cz) {
    this.physics = physics;
    this.cx = cx; this.cz = cz;
    this.group = new THREE.Group();
    this.group.position.set(cx, 0, cz);
    this.group.visible = false;
    scene.add(this.group);
    this.room = { id, center: new THREE.Vector3(cx, 0, cz), group: this.group, exits: [], zones: [], searches: [], ballTargets: [], lights: [], updaters: [], colliders: [] };
  }
  box(w, h, d, material, x, y, z, ry = 0, shadow = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z); m.rotation.y = ry;
    m.castShadow = shadow; m.receiveShadow = true;
    this.group.add(m);
    return m;
  }
  mesh(geo, material, x, y, z) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    this.group.add(m);
    return m;
  }
  // solid brick (local coords)
  col(x, z, hw, hd, top, extra = {}) {
    const c = this.physics.add({ type: 'box', x: this.cx + x, z: this.cz + z, hw, hd, rot: 0, top, ...extra });
    this.room.colliders.push(c);
    return c;
  }
  floor(w, d, material) {
    this.box(w, 0.2, d, material, 0, -0.1, 0, 0, false);
    this.col(0, 0, w / 2, d / 2, 0, { seeThrough: true, bottom: -1 });
  }
  // the two far walls are drawn; the two near ones are only a low skirting
  walls(w, d, h, material, skirtMat) {
    this.box(0.3, h, d + 0.3, material, -w / 2 - 0.15, h / 2, 0);
    this.box(w + 0.3, h, 0.3, material, 0, h / 2, -d / 2 - 0.15);
    this.box(0.3, 0.35, d + 0.3, skirtMat, w / 2 + 0.15, 0.175, 0);
    this.box(w + 0.3, 0.35, 0.3, skirtMat, 0, 0.175, d / 2 + 0.15);
    this.col(-w / 2 - 0.15, 0, 0.15, d / 2 + 0.3, h);
    this.col(w / 2 + 0.15, 0, 0.15, d / 2 + 0.3, h);
    this.col(0, -d / 2 - 0.15, w / 2 + 0.3, 0.15, h);
    this.col(0, d / 2 + 0.15, w / 2 + 0.3, 0.15, h);
  }
  light(color, intensity, dist, x, y, z) {
    const l = new THREE.PointLight(color, 0, dist, 2);
    l.position.set(x, y, z);
    l.userData.base = intensity;
    this.group.add(l);
    this.room.lights.push(l);
    return l;
  }
  world(x, z) { return { x: this.cx + x, z: this.cz + z }; }
}

// ------------------------------------------------------------------ Twinsen's house
function buildHouse(scene, physics) {
  const TX = textures();
  const B = new RoomBuilder(scene, physics, 'house', 1000, 0);
  const R = B.room;
  const W = 9, D = 7, H = 3.2;
  R.view = 10.5;
  R.follow = 0.25;
  B.floor(W, D, texMat(TX.wood, 4, 3));
  const wall = texMat(TX.plaster, 2, 1);
  const wood = texMat(TX.wood, 1, 1);
  B.walls(W, D, H, wall, wood);
  // beams along the top of the walls
  B.box(0.25, 0.25, D, wood, -W / 2 + 0.1, H - 0.1, 0);
  B.box(W, 0.25, 0.25, wood, 0, H - 0.1, -D / 2 + 0.1);

  // front door (exit) in the far wall
  const doorX = 2.6;
  B.box(1.3, 2.3, 0.12, mat('#2a1a0e'), doorX, 1.15, -D / 2 + 0.02, 0, false);
  B.box(1.1, 2.1, 0.08, wood, doorX - 0.25, 1.05, -D / 2 + 0.25).rotation.y = -1.0;
  B.box(1.4, 0.04, 0.9, mat('#8a3a2a'), doorX, 0.02, -D / 2 + 0.75, 0, false); // doormat
  R.exits.push({ ...B.world(doorX, -D / 2 + 0.45), r: 0.75, to: 'outdoor' });
  R.spawn = { ...B.world(doorX, -D / 2 + 1.9), a: 0 };

  // window with daylight
  const winGlow = new THREE.MeshStandardMaterial({ color: '#cfe8ff', emissive: '#9fd0ff', emissiveIntensity: 1.2 });
  B.box(0.1, 1.1, 1.5, mat('#f9f4ea'), -W / 2 + 0.02, 1.9, 1.2, 0, false);
  B.box(0.1, 0.9, 1.3, winGlow, -W / 2 + 0.06, 1.9, 1.2, 0, false);
  B.box(0.12, 0.06, 1.3, mat('#f9f4ea'), -W / 2 + 0.1, 1.9, 1.2, 0, false);

  // cupboard (the magic ball is in here, like LBA2's opening)
  const cup = B.box(0.7, 2.1, 1.5, wood, -W / 2 + 0.5, 1.05, -1.6);
  B.box(0.04, 1.8, 0.66, mat('#7d5029'), -W / 2 + 0.87, 1.05, -1.95, 0, false);
  B.box(0.04, 1.8, 0.66, mat('#7d5029'), -W / 2 + 0.87, 1.05, -1.25, 0, false);
  B.col(-W / 2 + 0.5, -1.6, 0.4, 0.8, 2.1, { noStand: true });
  R.searches.push({ id: 'cupboard', ...B.world(-W / 2 + 1.3, -1.6), r: 1.4, mesh: cup });

  // kitchen: stove with fire, shelves, pots
  B.box(1.4, 1.0, 0.8, mat('#8f8f96'), -2.3, 0.5, -D / 2 + 0.45);
  const fire = new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#ff6a00', emissiveIntensity: 3 });
  B.box(0.6, 0.3, 0.05, fire, -2.3, 0.45, -D / 2 + 0.86, 0, false);
  B.mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.3, 10), mat('#5a5a62', { metalness: 0.6 }), -2.0, 1.15, -D / 2 + 0.45);
  B.col(-2.3, -D / 2 + 0.45, 0.7, 0.4, 1.0, { noStand: true });
  B.box(2.2, 0.08, 0.35, wood, -0.4, 1.9, -D / 2 + 0.2, 0, false);
  ['#d8a13b', '#3b78d8', '#b8483b', '#5fb05f'].forEach((c, i) => B.mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.28, 8), mat(c), -1.2 + i * 0.5, 2.08, -D / 2 + 0.2));
  const stoveLight = B.light('#ff8a3a', 4, 5, -2.3, 1.0, -D / 2 + 1.2);

  // table + chairs
  B.box(1.6, 0.08, 1.0, wood, 0.4, 0.8, 0.4);
  for (const [lx, lz] of [[-0.7, -0.4], [0.7, -0.4], [-0.7, 0.4], [0.7, 0.4]]) B.box(0.08, 0.8, 0.08, wood, 0.4 + lx, 0.4, 0.4 + lz, 0, false);
  B.col(0.4, 0.4, 0.8, 0.5, 0.85, { noStand: true, seeThrough: true });
  for (const sx of [-1, 1]) {
    B.box(0.5, 0.06, 0.5, wood, 0.4 + sx * 1.15, 0.5, 0.4);
    B.box(0.06, 0.6, 0.5, wood, 0.4 + sx * 1.38, 0.8, 0.4);
    B.col(0.4 + sx * 1.15, 0.4, 0.3, 0.3, 0.5, { noStand: true, seeThrough: true });
  }
  B.mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.18, 10), mat('#f4efe2'), 0.2, 0.93, 0.3);
  B.mesh(new THREE.SphereGeometry(0.1, 8, 6), mat('#e03a3a'), 0.6, 0.93, 0.5);

  // bed + Arthur's corner
  B.box(1.3, 0.45, 2.2, wood, -W / 2 + 0.85, 0.22, 2.1);
  B.box(1.2, 0.18, 2.1, mat('#3b78d8'), -W / 2 + 0.85, 0.52, 2.15);
  B.box(0.9, 0.16, 0.4, mat('#f9f4ea'), -W / 2 + 0.85, 0.66, 1.25);
  B.col(-W / 2 + 0.85, 2.1, 0.65, 1.1, 0.7, { noStand: true });
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.3, 24), mat('#c8452f'));
  rug.rotation.x = -Math.PI / 2; rug.position.set(1.6, 0.015, 2.0); B.group.add(rug);
  const rug2 = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.0, 24), mat('#e9c46a'));
  rug2.rotation.x = -Math.PI / 2; rug2.position.set(1.6, 0.02, 2.0); B.group.add(rug2);
  ['#e03a3a', '#3b78d8', '#e9c46a', '#5fb05f'].forEach((c, i) => B.box(0.22, 0.22, 0.22, mat(c), 1.0 + (i % 2) * 0.35, 0.11 + Math.floor(i / 2) * 0.22, 2.6, i * 0.4));
  // a picture of the Dino-Fly on the wall
  B.box(0.06, 0.8, 1.1, mat('#6b4a2e'), -W / 2 + 0.03, 2.0, -0.3, 0, false);
  B.box(0.06, 0.66, 0.96, mat('#9fd0ff'), -W / 2 + 0.06, 2.0, -0.3, 0, false);
  B.box(0.06, 0.18, 0.5, mat('#3b9a5a'), -W / 2 + 0.09, 2.0, -0.3, 0, false);

  B.light('#ffd6a0', 10, 12, 0.4, 2.7, 0.4);
  B.mesh(new THREE.SphereGeometry(0.18, 10, 8), new THREE.MeshStandardMaterial({ color: '#fff0d0', emissive: '#ffcf80', emissiveIntensity: 2.5 }), 0.4, 2.85, 0.4);
  R.updaters.push((dt, t) => { stoveLight.intensity = stoveLight.userData.base * (0.85 + Math.sin(t * 11) * 0.1 + Math.sin(t * 7) * 0.05); });
  R.npcSpots = { zoe: { ...B.world(-1.6, -2.1), a: 0.6 }, arthur: { ...B.world(1.7, 2.0), a: -2.4 } };
  return R;
}

// ------------------------------------------------------------------ the well
function buildWell(scene, physics) {
  const TX = textures();
  const B = new RoomBuilder(scene, physics, 'well', 1100, 0);
  const R = B.room;
  const W = 21, D = 14, H = 4;
  R.view = 15;
  R.follow = 0.6;
  R.cave = true;
  const rock = texMat(TX.rock, 4, 1.5);
  B.floor(W, D, texMat(TX.rock, 6, 4, { color: '#9a8e80' }));
  B.walls(W, D, H, rock, rock);
  // rough wall bumps
  for (let i = 0; i < 14; i++) {
    const along = -W / 2 + 1 + i * (W / 14);
    const s = 1 + (i % 3) * 0.4;
    B.box(s, H * (0.7 + (i % 2) * 0.3), 1.2, rock, along, H * 0.35, -D / 2 + 0.4);
  }
  for (let i = 0; i < 9; i++) {
    const along = -D / 2 + 1 + i * (D / 9);
    B.box(1.2, H * (0.65 + (i % 2) * 0.35), 1 + (i % 3) * 0.4, rock, -W / 2 + 0.4, H * 0.35, along);
  }
  // dividing rock wall with a gap that crystals have grown shut
  const gx = 4.5;
  B.box(1.2, H, 5.2, rock, gx, H / 2, -4.4);
  B.box(1.2, 1.1, 5.2, rock, gx, 0.55, 4.4); // near half drawn low so the iso camera can see past it
  B.col(gx, -4.4, 0.6, 2.6, H);
  B.col(gx, 4.4, 0.6, 2.6, H);
  // pillars
  for (const [px, pz, pr] of [[-3, 1.5, 0.7], [1.5, -2.5, 0.6], [-6.5, -2, 0.8]]) {
    B.mesh(new THREE.CylinderGeometry(pr * 0.8, pr, H, 7), rock, px, H / 2, pz);
    physics.add({ type: 'cyl', x: B.cx + px, z: B.cz + pz, r: pr, top: H });
  }

  // warm puddles with steam
  const puddleMat = new THREE.MeshStandardMaterial({ color: '#4fb8c8', emissive: '#1a6a7a', emissiveIntensity: 0.6, roughness: 0.1, transparent: true, opacity: 0.85 });
  const puddles = [[-6, 3, 1.4], [-1.5, -4.5, 1.1], [2, 3.5, 1.3], [7.5, -3.5, 1.2]];
  for (const [px, pz, pr] of puddles) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(pr, 20), puddleMat);
    m.rotation.x = -Math.PI / 2; m.position.set(px, 0.02, pz); B.group.add(m);
  }
  const NS = 90;
  const sp = new Float32Array(NS * 3), sd = [];
  for (let i = 0; i < NS; i++) {
    const p = puddles[i % puddles.length];
    sd.push({ x: p[0] + (Math.random() - 0.5) * p[2], z: p[1] + (Math.random() - 0.5) * p[2], y: Math.random() * 3, v: 0.4 + Math.random() * 0.5 });
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const steam = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#e8f4ff', size: 0.35, transparent: true, opacity: 0.35, depthWrite: false }));
  B.group.add(steam);
  R.updaters.push((dt) => {
    for (let i = 0; i < NS; i++) {
      const s = sd[i]; s.y += s.v * dt; if (s.y > 3.2) s.y = 0;
      sp[i * 3] = s.x + Math.sin(s.y * 2 + i) * 0.15; sp[i * 3 + 1] = s.y; sp[i * 3 + 2] = s.z;
    }
    sg.attributes.position.needsUpdate = true;
  });

  // crystals that "weren't there before"
  const crystalMat = (c, e, k = 1.5) => new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: k, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.92 });
  const cyan = crystalMat('#aef6ff', '#2ad0ff', 1.6), violet = crystalMat('#e0c0ff', '#9a4aff', 1.4);
  const cluster = (x, y, z, n, s, m) => {
    for (let i = 0; i < n; i++) {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(s * (0.5 + Math.random() * 0.6), 0), m);
      c.scale.y = 2 + Math.random();
      c.position.set(x + (Math.random() - 0.5) * s * 1.6, y + (Math.random() - 0.3) * s, z + (Math.random() - 0.5) * s * 1.6);
      c.rotation.set((Math.random() - 0.5) * 0.9, Math.random() * 3, (Math.random() - 0.5) * 0.9);
      B.group.add(c);
    }
  };
  [[-9.6, 1.5, -4], [-9.6, 2.2, 3], [-3, 2.5, -6.6], [2.5, 1.5, -6.6], [-6, 0.3, -6.4]].forEach(([x, y, z], i) => cluster(x, y, z, 5, 0.35, i % 2 ? violet : cyan));

  // three crystal nodes to wake with the magic ball
  R.nodes = [];
  for (const [nx, nz] of [[-5, -4], [0.5, -5.2], [1, 4.8]]) {
    B.mesh(new THREE.CylinderGeometry(0.5, 0.65, 0.9, 7), rock, nx, 0.45, nz);
    physics.add({ type: 'cyl', x: B.cx + nx, z: B.cz + nz, r: 0.6, top: 0.9 });
    const m = crystalMat('#8a9aa8', '#000000', 0);
    const c = B.mesh(new THREE.OctahedronGeometry(0.4, 0), m, nx, 1.55, nz);
    c.scale.y = 1.6;
    const node = { mesh: c, mat: m, lit: false, ...B.world(nx, nz), y: 1.55 };
    R.nodes.push(node);
    R.ballTargets.push({ x: node.x, y: node.y, z: node.z, r: 1.0, node });
  }
  R.updaters.push((dt, t) => { R.nodes.forEach((n, i) => { n.mesh.rotation.y = t * (n.lit ? 2 : 0.3) + i; }); });

  // crystal barrier in the gap
  const barrier = new THREE.Group();
  for (let i = 0; i < 14; i++) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.5 + Math.random() * 0.4, 0), i % 2 ? cyan : violet);
    c.scale.y = 2.5 + Math.random() * 1.5;
    c.position.set(gx + (Math.random() - 0.5) * 0.8, 0.8 + Math.random() * 1.5, -1.6 + (i / 13) * 3.2);
    c.rotation.set((Math.random() - 0.5) * 0.6, Math.random() * 3, (Math.random() - 0.5) * 0.6);
    barrier.add(c);
  }
  B.group.add(barrier);
  R.barrier = { group: barrier, c: B.col(gx, 0, 0.6, 1.9, H) };

  // the vein: something under the island is calling the magic ball
  const veinMat = crystalMat('#d8fbff', '#40e0ff', 1.3);
  const vein = new THREE.Group();
  for (let i = 0; i < 22; i++) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.4 + Math.random() * 0.7, 0), i % 4 === 0 ? violet : veinMat);
    c.scale.y = 1.8 + Math.random() * 2;
    c.position.set(6 + Math.random() * 4, 0.4 + Math.random() * 3.2, -D / 2 + 0.5 + Math.random() * 0.9);
    c.rotation.set((Math.random() - 0.5) * 1.2, Math.random() * 3, (Math.random() - 0.5) * 1.2);
    vein.add(c);
  }
  B.group.add(vein);
  // on the far (north) wall of the last chamber, where the iso camera can see it
  B.col(8, -D / 2 + 0.9, 2.3, 0.9, H);
  const veinLight = B.light('#40d8ff', 22, 16, 8, 2.2, -D / 2 + 3);
  R.vein = { ...B.world(8, -D / 2 + 1.9), y: 1.7, mat: veinMat, light: veinLight, power: 0 };
  R.updaters.push((dt, t) => {
    const p = 0.75 + Math.sin(t * 2.2) * 0.25 + R.vein.power;
    veinMat.emissiveIntensity = 1.3 * Math.min(p, 1.8);
    veinLight.intensity = veinLight.userData.base * p;
  });
  R.chamberX = B.cx + gx + 1.2; // stepping past the barrier into the last chamber
  R.zones.push({ id: 'vein', ...B.world(gx + 2.5, 0), r: 2.4 });

  // the rope Twinsen came down on, under a shaft of daylight
  const ropeX = -8, ropeZ = 4.5;
  B.mesh(new THREE.CylinderGeometry(0.05, 0.05, 6, 6), mat('#c9a66b'), ropeX, 3, ropeZ);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, 8, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#fff4d0', transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  shaft.position.set(ropeX, 3.5, ropeZ); B.group.add(shaft);
  B.light('#fff1d0', 8, 8, ropeX, 3.5, ropeZ);
  B.light('#9a6aff', 6, 10, 0, 2.5, 0);
  R.exits.push({ ...B.world(ropeX, ropeZ), r: 0.7, to: 'outdoor-well' });
  R.spawn = { ...B.world(ropeX + 1.4, ropeZ - 1.2), a: Math.PI * 0.75 };
  R.mites = [B.world(-2, -1.5), B.world(2.5, 1), B.world(-4.5, 4.5), B.world(3, -4)];
  return R;
}

export function buildInteriors(scene, physics) {
  const rooms = { house: buildHouse(scene, physics), well: buildWell(scene, physics) };
  // rooms' colliders are always active but far from the island, so they never interfere
  return rooms;
}
