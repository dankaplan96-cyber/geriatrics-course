
// ---------------------------------------------------------------- cats
const CAT_LOOK = {
 latifa: { eye: '#c9df52', collar: ['#e04f4a', '#7cb8ef', '#6fd8b4', '#c99ae6'], coat: '#141619', sheen: '#55657e', slim: .94 },
 pablo: { eye: '#f2b33d', collar: ['#e8bf46', '#7cb8ef', '#6fd8b4', '#c99ae6'], coat: '#17181c', sheen: '#6a6274', slim: 1.12 }
};
class Cat {
 constructor(scene, kind = 'latifa') {
  this.kind = kind; this.scale = kind === 'pablo' ? 1.22 : 1; const look = CAT_LOOK[kind];
  this.root = new THREE.Group(); this.visual = new THREE.Group(); this.root.add(this.visual); scene.add(this.root);
  this.visual.scale.set(this.scale * look.slim, this.scale, this.scale);
  this.coat = new THREE.MeshPhysicalMaterial({ color: look.coat, roughness: .6, sheen: 1, sheenRoughness: .42, sheenColor: new THREE.Color(look.sheen), envMapIntensity: .8 });
  this.coat.onBeforeCompile = shader => { shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `float catRim = pow(1.0 - max(dot(normalize(normal), normalize(vViewPosition)), 0.0), 2.6);\noutgoingLight += vec3(0.22, 0.27, 0.34) * catRim * 0.55;\n#include <opaque_fragment>`); };
  const sphere = new THREE.SphereGeometry(1, 28, 20);
  const P = (parent, geo, pos, scl, mat, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.scale.set(...scl); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; };
  const coat = this.coat, muzzle = new THREE.MeshStandardMaterial({ color: '#25272d', roughness: .75 });
  // torso
  this.body = new THREE.Group(); this.body.position.y = .47; this.visual.add(this.body);
  P(this.body, sphere, [0, 0, -.06], [.24, .245, .43], coat); P(this.body, sphere, [0, .035, .19], [.235, .265, .24], coat); P(this.body, sphere, [0, -.005, -.31], [.25, .24, .22], coat);
  P(this.body, sphere, [0, .17, .29], [.15, .18, .16], coat);
  // head
  this.head = new THREE.Group(); this.head.position.set(0, .36, .37); this.body.add(this.head); const h = this.head;
  P(h, sphere, [0, 0, 0], [.25, .215, .22], coat); for (const s of [-1, 1]) P(h, sphere, [s * .1, -.055, .07], [.13, .11, .13], coat);
  for (const s of [-1, 1]) P(h, sphere, [s * .045, -.083, .178], [.064, .05, .055], muzzle, false); P(h, sphere, [0, -.122, .15], [.05, .03, .045], muzzle, false);
  P(h, sphere, [0, -.043, .217], [.03, .02, .02], new THREE.MeshStandardMaterial({ color: '#3a272d', roughness: .25 }), false);
  const earGeo = new THREE.ConeGeometry(.098, .2, 4, 1); earGeo.rotateY(Math.PI / 4); const innerGeo = new THREE.ConeGeometry(.07, .15, 4, 1); innerGeo.rotateY(Math.PI / 4); const earInner = new THREE.MeshStandardMaterial({ color: '#5c3e46', roughness: .9 });
  this.ears = []; for (const s of [-1, 1]) { const e = new THREE.Group(); e.position.set(s * .135, .14, -.03); e.rotation.set(-.12, 0, -s * .3); h.add(e); P(e, earGeo, [0, .08, 0], [1, 1, .55], coat, false); P(e, innerGeo, [0, .065, .028], [1, 1, .32], earInner, false); this.ears.push(e); }
  const eyeMat = new THREE.MeshPhysicalMaterial({ color: look.eye, emissive: look.eye, emissiveIntensity: .28, roughness: .08, clearcoat: 1, clearcoatRoughness: .04 });
  const pupilMat = new THREE.MeshBasicMaterial({ color: '#07080a' }), shine = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  this.eyes = []; this.pupils = [];
  for (const s of [-1, 1]) { const g = new THREE.Group(); g.position.set(s * .094, .008, .168); g.rotation.y = s * .33; h.add(g); P(g, sphere, [0, 0, 0], [.07, .066, .046], eyeMat, false); const pupil = P(g, sphere, [0, 0, .03], [.02, .054, .02], pupilMat, false); pupil.userData.keep = true; this.pupils.push(pupil); P(g, sphere, [-.018, .024, .042], [.013, .016, .008], shine, false); P(g, sphere, [.02, -.02, .043], [.006, .007, .004], shine, false); this.eyes.push(g); }
  const whiskers = []; for (const s of [-1, 1]) for (let i = 0; i < 3; i++) whiskers.push(s * .08, -.09 - i * .012, .2, s * (.3 + i * .015), -.05 - i * .05, .2 + i * .01);
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(whiskers, 3)); h.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: '#d6dbd8', transparent: true, opacity: .65 })));
  // collar & bell
  this.collarMaterial = new THREE.MeshStandardMaterial({ color: look.collar[0], roughness: .45 });
  const collar = P(this.body, new THREE.TorusGeometry(.158, .028, 10, 28), [0, .16, .3], [1, 1, 1], this.collarMaterial, false); collar.rotation.x = Math.PI / 2 - .55;
  this.bell = P(this.body, sphere, [0, .06, .42], [.045, .048, .042], new THREE.MeshStandardMaterial({ color: '#f1c75a', metalness: .9, roughness: .22 }), false);
  this.bell.userData.keep = true;
  // legs: hip -> knee -> paw
  this.legs = []; const upperGeo = new THREE.CapsuleGeometry(.062, .16, 4, 12), lowerGeo = new THREE.CapsuleGeometry(.052, .12, 4, 12);
  for (const [x, z, front] of [[-.12, .22, true], [.12, .22, true], [-.13, -.3, false], [.13, -.3, false]]) {
   const hip = new THREE.Group(); hip.position.set(x, -.05, z); this.body.add(hip);
   if (!front) P(hip, sphere, [0, -.02, -.01], [.095, .15, .14], coat);
   P(hip, upperGeo, [0, -.13, 0], [1, 1, 1], coat); const knee = new THREE.Group(); knee.position.y = -.23; hip.add(knee);
   P(knee, lowerGeo, [0, -.08, 0], [1, 1, 1], coat); P(knee, sphere, [0, -.152, .03], [.066, .042, .085], coat);
   this.legs.push({ hip, knee, front, side: Math.sign(x) });
  }
  // tail: a chain of tapering capsules
  this.tailBase = new THREE.Group(); this.tailBase.position.set(0, .07, -.5); this.body.add(this.tailBase); this.tail = []; let parent = this.tailBase;
  for (let i = 0; i < 7; i++) { const r = .046 - i * .0032, len = .105; const seg = new THREE.Group(); if (i > 0) seg.position.y = len; parent.add(seg); P(seg, new THREE.CapsuleGeometry(r, len, 3, 10), [0, len / 2, 0], [1, 1, 1], coat, i < 3); this.tail.push(seg); parent = seg; }
  for (const g of [this.body, this.head, ...this.eyes, ...this.ears, ...this.legs.flatMap(l => [l.hip, l.knee])]) mergeDirect(g);
  // soft blob shadow (helps on low quality where real shadows are off)
  const sc = document.createElement('canvas'); sc.width = sc.height = 64; const s2 = sc.getContext('2d'); const gr = s2.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, 'rgba(20,16,14,.42)'); gr.addColorStop(1, 'rgba(20,16,14,0)'); s2.fillStyle = gr; s2.fillRect(0, 0, 64, 64);
  this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false })); this.shadow.rotation.x = -Math.PI / 2; scene.add(this.shadow);
  this.yaw = 0; this.stride = 0; this.run = 0; this.air = 0; this.squash = 0; this.wasGrounded = true; this.lastVy = 0; this.blink = 0; this.blinkTimer = 2; this.earTimer = 3; this.earTwitch = 0; this.headYaw = 0; this.swipe = 0;
 }
 setCosmetic(index) { const look = CAT_LOOK[this.kind]; this.collarMaterial.color.set(look.collar[index] || look.collar[0]); }
 update(dt, position, state, lookAt = null) {
  this.root.position.set(position.x, position.y - .395 * this.scale, position.z); this.root.visible = !(state.flash > 0) || Math.floor(state.simTime * 13) % 2 === 0;
  this.yaw += angleDelta(this.yaw, state.facing) * (1 - Math.exp(-14 * dt)); this.root.rotation.y = this.yaw;
  const t = state.simTime; this.run = damp(this.run, Math.min(state.speed / 3.6, 1), 10, dt); const r = this.run;
  if (state.grounded && !this.wasGrounded) this.squash = Math.min(.32, .06 + Math.max(0, -this.lastVy) * .022);
  this.wasGrounded = state.grounded; this.lastVy = state.velocity.y; this.squash *= Math.exp(-9 * dt);
  this.air = damp(this.air, state.grounded ? 0 : 1, 12, dt); const air = this.air;
  if (state.grounded) this.stride += dt * (2 + r * 12.5);
  // body
  const bob = Math.abs(Math.sin(this.stride)) * .04 * r, breathe = Math.sin(t * 2.3) * .01 * (1 - r);
  this.body.position.y = .47 + bob + breathe - this.squash * .1 + (state.slam ? .05 : 0);
  this.body.rotation.x = Math.sin(this.stride * 2) * .035 * r + clamp(-state.velocity.y * .035, -.3, .3) * air + (state.slam ? .5 : 0);
  this.body.rotation.z = 0;
  const stretch = 1 + clamp(state.velocity.y * .02, -.05, .1) * air; this.body.scale.set(1 + this.squash * .45, 1 - this.squash * .55, (1 + this.squash * .25) * stretch);
  // legs
  this.swipe = state.attackTime > 0 ? Math.sin(state.attackTime / .3 * Math.PI) : 0;
  for (const L of this.legs) {
   const off = L.front ? (L.side > 0 ? Math.PI : 0) : (L.side > 0 ? 0 : Math.PI); const ph = this.stride + off;
   let hip = Math.sin(ph) * .7 * r, knee = Math.max(0, Math.cos(ph)) * (L.front ? .9 : .7) * r;
   hip = lerp(hip, L.front ? -.85 : .75, air); knee = lerp(knee, L.front ? .55 : .35, air);
   if (state.slam) { hip = L.front ? -1.3 : 1.2; knee = .2; }
   if (L.front && L.side > 0 && this.swipe > 0) { hip = -2.1 * this.swipe; knee = -.2 * this.swipe; }
   L.hip.rotation.x = hip; L.knee.rotation.x = knee; L.hip.rotation.z = L.side * .04 * this.squash * 6;
  }
  // head: idle glances, looks toward the target, lifts on jumps
  let targetYaw = Math.sin(t * .45) * .3 * (1 - r) * (1 - air);
  if (lookAt) { const a = Math.atan2(lookAt.x - position.x, lookAt.z - position.z); targetYaw = clamp(angleDelta(this.yaw, a), -.8, .8); }
  this.headYaw = damp(this.headYaw, targetYaw, 6, dt); this.head.rotation.y = this.headYaw;
  this.head.rotation.x = Math.sin(t * .9) * .04 * (1 - r) - air * .15 + this.swipe * .2 - r * .08; this.head.rotation.z = Math.sin(t * .6) * .05 * (1 - r);
  // eyes: blink, pupils widen when excited
  this.blinkTimer -= dt; if (this.blinkTimer < 0) { this.blink = .13; this.blinkTimer = 1.8 + Math.random() * 3.5; } this.blink = Math.max(0, this.blink - dt);
  const lid = this.blink > 0 ? .12 : 1; for (const e of this.eyes) e.scale.y = damp(e.scale.y, lid, 40, dt);
  const wide = lookAt || state.slam || state.dash > 0 ? 2.1 : 1; for (const p of this.pupils) p.scale.x = damp(p.scale.x, .02 * wide, 8, dt);
  // ears
  this.earTimer -= dt; if (this.earTimer < 0) { this.earTwitch = .25; this.earTimer = 2 + Math.random() * 5; this.earSide = Math.random() < .5 ? 0 : 1; } this.earTwitch = Math.max(0, this.earTwitch - dt);
  this.ears.forEach((e, i) => { const s = i ? 1 : -1; e.rotation.z = -s * .3 + (this.earTwitch > 0 && this.earSide === i ? Math.sin(this.earTwitch * 60) * .25 : 0) - s * r * .15; e.rotation.x = -.12 - r * .25 - air * .2; });
  // tail
  this.tailBase.rotation.x = lerp(-.95, -1.45, r) + air * -.35; this.tailBase.rotation.z = Math.sin(t * 1.4) * .15 * (1 - r);
  this.tail.forEach((seg, i) => { const curl = i < 4 ? -.08 : .3 * (1 - r * .6); seg.rotation.x = curl + Math.sin(t * 2.4 - i * .55) * .05 + (i > 0 ? air * .05 : 0); seg.rotation.z = Math.sin(t * (1.7 + r * 3) - i * .5) * (.1 + .08 * (1 - r)); });
  this.bell.rotation.z = Math.sin(this.stride) * r * .5;
  this.shadow.position.set(position.x, (state.groundY ?? 0) + .016, position.z); const height = Math.max(0, position.y - .395 * this.scale - (state.groundY ?? 0)); this.shadow.scale.setScalar(this.scale * (1 + height * .25)); this.shadow.material.opacity = Math.max(.15, 1 - height * .5);
 }
}

// ---------------------------------------------------------------- breakables
const PLANTS = ['plant', 'basil', 'cactus', 'hanging'];
const HALF = { stool: [.38, .38, .35], glass: [.12, .15, .12], paper: [.17, .2, .2], mug: [.085, .085, .085], book: [.15, .04, .11], bowl: [.15, .065, .15], lamp: [.13, .25, .13], frame: [.12, .14, .04] };
function objectGeometry(kind) {
 const list = []; const cube = (c, p, s, r) => list.push(piece(new THREE.BoxGeometry(1, 1, 1), c, p, s, r));
 if (PLANTS.includes(kind)) {
  const pot = new THREE.LatheGeometry([[.0, -.19], [.17, -.19], [.19, -.17], [.245, .13], [.26, .14], [.262, .19], [.225, .19], [.22, .16], [.0, .16]].map(([x, y]) => new THREE.Vector2(x, y)), 20);
  list.push(piece(pot, kind === 'cactus' ? '#e6dccb' : kind === 'basil' ? '#d6d9cf' : '#c9744c')); list.push(piece(new THREE.CylinderGeometry(.218, .218, .02, 18), '#4c3527', [0, .17, 0]));
  if (kind === 'cactus') { list.push(piece(new THREE.CapsuleGeometry(.11, .38, 4, 12), '#4f9466', [0, .46, 0])); for (const side of [-1, 1]) { list.push(piece(new THREE.CapsuleGeometry(.06, .14, 3, 8), '#5ea06a', [side * .16, .45 + side * .04, 0], [1, 1, 1], [0, 0, side * .9])); for (let i = 0; i < 5; i++) list.push(piece(new THREE.ConeGeometry(.012, .07, 3), '#f6e7c0', [side * .1, .3 + i * .1, .07], [1, 1, 1], [Math.PI / 2, 0, -side * 1.3])); } list.push(piece(new THREE.SphereGeometry(.05, 8, 6), '#ff8fa3', [0, .72, 0])); }
  else { const n = kind === 'basil' ? 14 : 11; for (let i = 0; i < n; i++) { const a = i * 2.399, rr = .06 + (i % 4) * .045, up = kind === 'basil' ? .3 + (i % 3) * .07 : .32 + (i % 4) * .1; list.push(piece(new THREE.SphereGeometry(1, 10, 6), i % 3 === 0 ? '#3f8c5f' : i % 3 === 1 ? '#5aa86a' : '#7fbf73', [Math.cos(a) * rr, up, Math.sin(a) * rr], kind === 'basil' ? [.07, .025, .1] : [.07, .02, .2], [0, -a + Math.PI / 2, -.6 - (i % 3) * .2])); list.push(piece(new THREE.CylinderGeometry(.006, .008, up, 4), '#3f7a4a', [Math.cos(a) * rr * .5, up / 2 + .1, Math.sin(a) * rr * .5])); } }
 } else if (kind === 'glass') { list.push(piece(new THREE.CylinderGeometry(.12, .09, .3, 16, 1, true), '#bfe3df')); list.push(piece(new THREE.CylinderGeometry(.09, .09, .02, 16), '#d5eeea', [0, -.14, 0])); list.push(piece(new THREE.CylinderGeometry(.105, .085, .12, 16), '#e8a33d', [0, -.08, 0])); }
 else if (kind === 'vase') { const v = new THREE.LatheGeometry([[0, -.27], [.13, -.27], [.24, -.12], [.25, 0], [.18, .14], [.1, .22], [.12, .32], [0, .3]].map(([x, y]) => new THREE.Vector2(x, y)), 20); list.push(piece(v, '#e3b558')); list.push(piece(new THREE.TorusGeometry(.22, .015, 6, 24), '#2f5d62', [0, .02, 0], [1, 1, 1], [Math.PI / 2, 0, 0])); }
 else if (kind === 'stool') { const top = new RoundedBoxGeometry(.75, .1, .7, 2, .04); list.push(piece(top, '#c79563', [0, .3, 0])); for (const x of [-.27, .27]) for (const z of [-.25, .25]) list.push(piece(new THREE.CylinderGeometry(.04, .03, .58, 8), '#7d5741', [x, -.02, z], [1, 1, 1], [z * .3, 0, -x * .3])); }
 else if (kind === 'paper') { list.push(piece(new THREE.CylinderGeometry(.2, .2, .33, 18), '#fbf5e8', [0, 0, 0], [1, 1, 1], [0, 0, Math.PI / 2])); list.push(piece(new THREE.CylinderGeometry(.07, .07, .34, 10), '#c2a680', [0, 0, 0], [1, 1, 1], [0, 0, Math.PI / 2])); }
 else if (kind === 'fish') { list.push(piece(new THREE.SphereGeometry(.14, 12, 8), '#f0b94a', [0, 0, 0], [1.5, .7, .55])); list.push(piece(new THREE.ConeGeometry(.11, .16, 4), '#f7d77d', [-.24, 0, 0], [1, 1, .4], [0, 0, Math.PI / 2])); list.push(piece(new THREE.SphereGeometry(.025, 6, 4), '#2b2b2b', [.14, .03, .06])); }
 else if (kind === 'mug') { list.push(piece(new THREE.CylinderGeometry(.075, .07, .16, 16), '#efe8da')); list.push(piece(new THREE.TorusGeometry(.045, .014, 6, 12), '#efe8da', [.085, 0, 0])); list.push(piece(new THREE.CylinderGeometry(.065, .065, .01, 14), '#5a3a22', [0, .07, 0])); list.push(piece(new THREE.CylinderGeometry(.076, .076, .03, 16), '#e07a5f', [0, .02, 0])); }
 else if (kind === 'book') { cube('#a8493c', [0, 0, 0], [.3, .07, .22]); cube('#f3ead6', [.012, 0, 0], [.28, .055, .205]); cube('#2f5d62', [0, .065, 0], [.26, .06, .2], [0, .3, 0]); cube('#f3ead6', [.012, .065, 0], [.24, .045, .185], [0, .3, 0]); }
 else if (kind === 'bowl') { const b = new THREE.LatheGeometry([[0, -.06], [.09, -.06], [.15, .02], [.16, .065], [.145, .065], [.13, .02], [0, -.04]].map(([x, y]) => new THREE.Vector2(x, y)), 20); list.push(piece(b, '#d9a066')); for (let i = 0; i < 4; i++) list.push(piece(new THREE.SphereGeometry(.045, 8, 6), ['#e76f51', '#f4a261', '#9bc53d', '#e9c46a'][i], [Math.cos(i * 1.6) * .06, .03, Math.sin(i * 1.6) * .06])); }
 else if (kind === 'lamp') { list.push(piece(new THREE.CylinderGeometry(.09, .11, .05, 16), '#2f5d62', [0, -.22, 0])); list.push(piece(new THREE.SphereGeometry(.09, 14, 10), '#2f5d62', [0, -.12, 0], [1, 1.1, 1])); list.push(piece(new THREE.CylinderGeometry(.012, .012, .15, 6), '#d9a952', [0, 0, 0])); list.push(piece(new THREE.CylinderGeometry(.08, .14, .16, 18, 1, true), '#fbe9c6', [0, .14, 0])); list.push(piece(new THREE.CylinderGeometry(.08, .08, .01, 14), '#fbe9c6', [0, .22, 0])); }
 else if (kind === 'frame') { cube('#8b6a4f', [0, 0, 0], [.24, .28, .03]); cube('#7cb8ef', [0, .02, .017], [.18, .2, .005]); cube('#121318', [0, -.02, .02], [.08, .1, .004]); cube('#8b6a4f', [0, -.08, -.06], [.03, .2, .03], [.5, 0, 0]); }
 return mergeGeometry(list);
}
const BREAK_STYLE = { glass: { color: '#cfeae6', decal: '#8fc7d6', decalOpacity: .45, score: 40, sound: 'glass' }, mug: { color: '#efe8da', decal: '#6b4326', decalOpacity: .7, score: 50, sound: 'glass' }, bowl: { color: '#d9a066', decal: '#c0563a', decalOpacity: .5, score: 55, sound: 'break' }, vase: { color: '#e3b558', decal: '#8fc7d6', decalOpacity: .4, score: 60, sound: 'break' }, lamp: { color: '#fbe9c6', score: 75, sound: 'glass' }, frame: { color: '#8b6a4f', score: 50, sound: 'glass' }, book: { color: '#f3ead6', score: 45, sound: 'paw' }, stool: { color: '#b28259', score: 90, sound: 'break' }, paper: { color: '#f1e8d8', score: 55, sound: 'paw' }, plant: { color: '#c9744c', decal: '#4a3324', decalOpacity: .85, score: 100, sound: 'break' } };
const styleOf = kind => BREAK_STYLE[PLANTS.includes(kind) ? 'plant' : kind] || BREAK_STYLE.plant;

class Effects {
 constructor(root, physics) {
  this.physics = physics; this.matrix = new THREE.Matrix4(); this.quat = new THREE.Quaternion(); this.scale = new THREE.Vector3(); this.pos = new THREE.Vector3(); this.color = new THREE.Color();
  this.fragmentCursor = 0; this.particleCursor = 0; this.decalCursor = 0; this.N = 300; this.F = 48; this.D = 48;
  this.particles = Array.from({ length: this.N }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, size: .05, drag: 0, grav: 9 }));
  this.particleMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.05, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .8 }), this.N); this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.particleMesh.frustumCulled = false; this.particleMesh.castShadow = false; root.add(this.particleMesh); this.particleMesh.setColorAt(0, this.color.set('#fff'));
  this.fragmentMesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.075, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .5 }), this.F); this.fragmentMesh.frustumCulled = false; this.fragmentMesh.castShadow = true; root.add(this.fragmentMesh); this.fragmentMesh.setColorAt(0, this.color.set('#fff'));
  this.decalMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: TEX.splat(), transparent: true, depthWrite: false, roughness: .35, polygonOffset: true, polygonOffsetFactor: -4 }), this.D); this.decalMesh.frustumCulled = false; this.decalMesh.renderOrder = 1; root.add(this.decalMesh); this.decalMesh.setColorAt(0, this.color.set('#fff'));
  for (let i = 0; i < this.D; i++) this.decalMesh.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
  this.paperCursor = 0; this.paperMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(.16, .95), material('#f5eedc', { side: THREE.DoubleSide }), 18); this.paperMesh.visible = false; this.paperMesh.frustumCulled = false; root.add(this.paperMesh); for (let i = 0; i < 18; i++) this.paperMesh.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
  this.fragments = [];
  for (let i = 0; i < this.F; i++) { const body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setEnabled(false)); physics.world.createCollider(RAPIER.ColliderDesc.cuboid(.05, .04, .06).setRestitution(.25).setFriction(.8).setCollisionGroups(0x00020001), body); this.fragments.push({ body, life: 0, s: 1 }); }
  this.update(0, 1);
 }
 burst(p, color = '#694a33', count = 22, power = 1, opts = {}) {
  this.color.set(color);
  for (let i = 0; i < count; i++) { const idx = this.particleCursor++ % this.N, v = this.particles[idx], a = Math.random() * Math.PI * 2; Object.assign(v, { life: .5 + Math.random() * .8, max: 1.3, x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * (1 + Math.random()) * power, vy: (opts.flat ? .3 : 1 + Math.random() * 3) * power, vz: Math.sin(a) * (1 + Math.random()) * power, size: (opts.size || 1) * (.5 + Math.random()), drag: opts.drag || 0, grav: opts.grav ?? 9 }); this.particleMesh.setColorAt(idx, this.color); }
  this.particleMesh.instanceColor.needsUpdate = true;
 }
 dust(p, power = 1) { this.burst({ x: p.x, y: p.y + .05, z: p.z }, '#d9cbb4', Math.round(8 + 10 * power), .9 + power, { flat: true, drag: 4, grav: -.6, size: 1.6 }); }
 decal(p, color, opacity = .7, size = .9) {
  const ray = new RAPIER.Ray({ x: p.x, y: p.y + .3, z: p.z }, { x: 0, y: -1, z: 0 }); const hit = this.physics.world.castRay(ray, 6, true, RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC | RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC);
  const y = hit ? p.y + .3 - hit.timeOfImpact + .006 : .006; const i = this.decalCursor++ % this.D;
  this.quat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.random() * 6.28)); this.pos.set(p.x, y, p.z); const s = size * (.8 + Math.random() * .5); this.scale.set(s, s, 1);
  this.matrix.compose(this.pos, this.quat, this.scale); this.decalMesh.setMatrixAt(i, this.matrix); this.color.set(color).multiplyScalar(opacity + (1 - opacity) * .2); this.decalMesh.setColorAt(i, this.color); this.decalMesh.instanceMatrix.needsUpdate = true; this.decalMesh.instanceColor.needsUpdate = true;
 }
 unroll(p) { this.paperMesh.visible = true; for (let j = 0; j < 6; j++) { const i = this.paperCursor++ % 18, a = j * .45; const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, a)); this.matrix.compose(new THREE.Vector3(p.x + Math.sin(a) * j * .35, .018, p.z + j * .4), q, new THREE.Vector3(1, 1, 1)); this.paperMesh.setMatrixAt(i, this.matrix); } this.paperMesh.instanceMatrix.needsUpdate = true; }
 shatter(p, color, quality, soil = true) {
  this.burst(p, soil ? '#5a3d2a' : color, quality === 0 ? 10 : 24);
  const n = quality === 0 ? 4 : 8; this.color.set(color);
  for (let j = 0; j < n; j++) { const i = this.fragmentCursor++ % this.F, f = this.fragments[i]; f.life = 7 + Math.random() * 3; f.s = .6 + Math.random() * .8; f.body.setEnabled(true); f.body.setTranslation({ x: p.x + (Math.random() - .5) * .2, y: p.y + .1, z: p.z + (Math.random() - .5) * .2 }, true); f.body.setLinvel({ x: (Math.random() - .5) * 3.5, y: 2 + Math.random() * 2.5, z: (Math.random() - .5) * 3.5 }, true); f.body.setAngvel({ x: Math.random() * 8, y: Math.random() * 8, z: Math.random() * 8 }, true); this.fragmentMesh.setColorAt(i, this.color); }
  this.fragmentMesh.instanceColor.needsUpdate = true;
 }
 update(dt) {
  for (let i = 0; i < this.N; i++) { const p = this.particles[i]; p.life = Math.max(0, p.life - dt); if (p.life > 0) { p.vy -= p.grav * dt; const k = Math.exp(-p.drag * dt); p.vx *= k; p.vz *= k; p.x += p.vx * dt; p.y = Math.max(.025, p.y + p.vy * dt); p.z += p.vz * dt; this.pos.set(p.x, p.y, p.z); this.scale.setScalar(p.size * Math.min(1, p.life * 3)); } else { this.pos.set(0, -20, 0); this.scale.setScalar(0); } this.matrix.compose(this.pos, this.quat, this.scale); this.particleMesh.setMatrixAt(i, this.matrix); }
  this.particleMesh.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < this.F; i++) { const f = this.fragments[i]; if (f.life > 0) { f.life -= dt; if (f.life <= 0) f.body.setEnabled(false); const p = f.body.translation(), q = f.body.rotation(); this.pos.set(p.x, p.y, p.z); this.quat.set(q.x, q.y, q.z, q.w); this.scale.setScalar(f.s * Math.min(1, f.life)); } else { this.pos.set(0, -20, 0); this.scale.setScalar(0); } this.matrix.compose(this.pos, this.quat, this.scale); this.fragmentMesh.setMatrixAt(i, this.matrix); }
  this.quat.identity(); this.fragmentMesh.instanceMatrix.needsUpdate = true;
 }
}
class Objects {
 constructor(root, physics, defs, effects, onBreak) {
  this.physics = physics; this.effects = effects; this.onBreak = onBreak; this.items = []; this.byCollider = new Map(); this.meshes = new Map(); this.matrix = new THREE.Matrix4(); this.pos = new THREE.Vector3(); this.quat = new THREE.Quaternion(); this.scale = new THREE.Vector3(); this.age = 0;
  const counts = {}; for (const d of defs) counts[d.kind] = (counts[d.kind] || 0) + 1;
  for (const [kind, count] of Object.entries(counts)) { const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: kind === 'glass' ? .1 : kind === 'vase' || kind === 'mug' ? .25 : .65, metalness: 0, emissive: kind === 'fish' ? '#6b4a10' : '#000000', side: kind === 'glass' || kind === 'lamp' ? THREE.DoubleSide : THREE.FrontSide }); const mesh = new THREE.InstancedMesh(objectGeometry(kind), mat, count); mesh.frustumCulled = false; mesh.castShadow = kind !== 'fish'; mesh.receiveShadow = true; root.add(mesh); this.meshes.set(kind, mesh); }
  const ids = {};
  for (const d of defs) {
   const plant = PLANTS.includes(d.kind), fish = d.kind === 'fish'; const half = HALF[d.kind] || [.24, .22, .24];
   const item = { ...d, index: ids[d.kind] || 0, plant, fish, broken: false, hits: 0, body: null, position: { x: d.x, y: d.y, z: d.z }, spawn: { x: d.x, y: d.y, z: d.z }, joint: null, wobble: 0 }; ids[d.kind] = item.index + 1;
   if (!fish) {
    item.body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(d.x, d.y, d.z).setLinearDamping(.2).setAngularDamping(.25).setCanSleep(true).setCcdEnabled(true));
    item.collider = physics.world.createCollider(RAPIER.ColliderDesc.cuboid(...half).setMass(d.kind === 'stool' ? 5 : d.kind === 'lamp' ? 1 : .8).setFriction(.65).setRestitution(.1).setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(60), item.body); this.byCollider.set(item.collider.handle, item);
    if (d.kind === 'hanging') { const anchor = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(d.x, d.y + 1.3, d.z)); item.anchor = anchor; item.joint = physics.world.createImpulseJoint(RAPIER.JointData.spherical({ x: 0, y: 0, z: 0 }, { x: 0, y: 1.3, z: 0 }), anchor, item.body, true); }
   }
   this.items.push(item);
  }
  this.hanging = this.items.filter(x => x.kind === 'hanging'); if (this.hanging.length) { this.ropes = new THREE.InstancedMesh(new THREE.CylinderGeometry(.012, .012, 1, 5), material('#ded0ac'), this.hanging.length); this.ropes.frustumCulled = false; root.add(this.ropes); }
  this.draw();
 }
 hit(o, cat, force = 1) {
  if (o.broken) return; const p = cat.position; let dx = o.position.x - p.x, dz = o.position.z - p.z, n = Math.hypot(dx, dz); if (n < .01) { dx = Math.sin(cat.facing); dz = Math.cos(cat.facing); n = 1; } o.hits++; o.wobble = .35;
  if (o.joint) { this.physics.world.removeImpulseJoint(o.joint, true); o.joint = null; }
  o.body.applyImpulseAtPoint({ x: dx / n * force, y: .25 * force, z: dz / n * force }, { x: o.position.x, y: o.position.y + .2, z: o.position.z }, true);
  if (o.kind === 'paper' || o.hits >= 3 || force > 3) this.break(o);
 }
 break(o) {
  if (o.broken || o.fish) return; o.broken = true; if (o.joint) { this.physics.world.removeImpulseJoint(o.joint, true); o.joint = null; } o.body.setEnabled(false);
  const st = styleOf(o.kind); this.effects.shatter(o.position, st.color, this.quality || 0, o.plant);
  if (st.decal) this.effects.decal(o.position, st.decal, st.decalOpacity, o.plant ? 1.1 : .8);
  if (o.kind === 'paper') this.effects.unroll(o.position);
  if (o.plant) this.effects.burst(o.position, '#6fae66', 14, 1.1, { size: 1.3 });
  if (o.kind === 'book') this.effects.burst(o.position, '#f6efe0', 14, 1.2, { drag: 2, grav: 3, size: 1.4 });
  this.onBreak(o);
 }
 step(dt, quality) {
  this.age += dt; this.quality = quality;
  this.physics.events.drainContactForceEvents(event => { if (this.age < .8) return; for (const handle of [event.collider1(), event.collider2()]) { const item = this.byCollider.get(handle); if (item && !item.broken && event.totalForceMagnitude() > (item.kind === 'stool' ? 300 : item.kind === 'book' ? 160 : 95)) this.break(item); } });
  for (const o of this.items) { o.wobble = Math.max(0, o.wobble - dt); if (o.broken || o.fish) continue; o.position = { ...o.body.translation() }; if (o.position.y < -2 || Math.abs(o.position.x) > 30 || Math.abs(o.position.z) > 30) this.break(o); }
 }
 draw() {
  for (const o of this.items) {
   if (o.broken) { this.pos.set(0, -30, 0); this.scale.setScalar(0); this.quat.identity(); }
   else { this.pos.set(o.position.x, o.position.y, o.position.z); const w = o.wobble > 0 ? 1 + Math.sin(o.wobble * 40) * o.wobble * .25 : 1; this.scale.set(w, 2 - w, w); if (o.body) { const q = o.body.rotation(); this.quat.set(q.x, q.y, q.z, q.w); } else { this.pos.y += Math.sin(this.age * 3 + o.index) * .07; this.quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.age * 1.8); this.scale.setScalar(1 + Math.sin(this.age * 6 + o.index) * .06); } }
   this.matrix.compose(this.pos, this.quat, this.scale); this.meshes.get(o.kind).setMatrixAt(o.index, this.matrix);
  }
  for (const m of this.meshes.values()) m.instanceMatrix.needsUpdate = true;
  if (this.ropes) { this.hanging.forEach((o, i) => { if (o.joint && !o.broken) { const a = o.anchor.translation(), b = o.position; this.pos.set((a.x + b.x) / 2, (a.y + b.y + .3) / 2, (a.z + b.z) / 2); const delta = new THREE.Vector3(b.x - a.x, b.y + .3 - a.y, b.z - a.z); this.scale.set(1, Math.max(.02, delta.length()), 1); this.quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); } else { this.scale.setScalar(0); this.pos.set(0, -30, 0); } this.matrix.compose(this.pos, this.quat, this.scale); this.ropes.setMatrixAt(i, this.matrix); }); this.ropes.instanceMatrix.needsUpdate = true; }
 }
 get plantsLeft() { return this.items.filter(o => o.plant && !o.broken).length; }
}

// ---------------------------------------------------------------- hazards
class Enemies {
 constructor(root, physics, level, effects, audio, onHurt, onCall) {
  this.physics = physics; this.level = level; this.effects = effects; this.audio = audio; this.onHurt = onHurt; this.onCall = onCall; this.time = 0; this.distracted = 0; this.vacuums = []; this.sprayers = []; this.birds = [];
  for (const [i, p] of level.patrols.entries()) {
   const group = new THREE.Group(); root.add(group);
   cyl(group, material('#ecebe6', { roughness: .3, metalness: .1 }), 0, .1, 0, .43, .45, .13, 40, true); cyl(group, material('#d3d2cc', { roughness: .4 }), 0, .17, 0, .4, .43, .03, 40, true); cyl(group, material('#1d2328', { roughness: .1, metalness: .4 }), 0, .19, 0, .3, .3, .02, 32);
   shape(group, new THREE.TorusGeometry(.44, .03, 6, 40, Math.PI), material('#2e3438', { roughness: .6 }), [0, .09, 0], [1, 1, 1]).rotation.x = Math.PI / 2;
   cyl(group, material('#3a4146'), 0, .215, -.12, .05, .05, .02, 16);
   const led = new THREE.MeshStandardMaterial({ color: '#111', emissive: '#59e1ff', emissiveIntensity: 2.5 }); const ring = shape(group, new THREE.TorusGeometry(.2, .012, 6, 40), led, [0, .205, 0]); ring.rotation.x = Math.PI / 2; ring.userData.keep = true;
   const eye = shape(group, new THREE.SphereGeometry(.03, 10, 8), led, [0, .14, .43]); eye.userData.keep = true;
   for (const s of [-1, 1]) { const brush = new THREE.Group(); brush.position.set(s * .3, .03, .3); group.add(brush); for (let k = 0; k < 3; k++) box(brush, material('#7a7f84'), 0, 0, 0, .16, .01, .015).rotation.y = k * 1.05; brush.userData.keep = true; brush.traverse(o => o.userData.keep = true); }
   mergeStatic(group);
   const body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x, .15, p.z)); physics.world.createCollider(RAPIER.ColliderDesc.cylinder(.12, .43), body);
   this.vacuums.push({ group, body, led, brushes: group.children.filter(c => c.isGroup), ...p, phase: i * 1.4, cooldown: 0, stun: 0, position: { x: p.x, y: .2, z: p.z } });
  }
  for (const p of level.sprays) {
   const group = new THREE.Group(); group.position.set(p.x, 0, p.z); root.add(group);
   const bottle = new THREE.LatheGeometry([[0, 0], [.15, 0], [.16, .05], [.15, .32], [.1, .4], [.05, .44], [0, .44]].map(([x, y]) => new THREE.Vector2(x, y)), 20);
   shape(group, bottle, new THREE.MeshPhysicalMaterial({ color: '#9fd8cc', roughness: .15, transmission: .0, clearcoat: 1 }), [0, 0, 0], [1, 1, 1], true);
   box(group, material('#e08a55', { roughness: .4 }), 0, .52, 0, .12, .16, .12, true, .03); box(group, material('#e08a55', { roughness: .4 }), 0, .57, .1, .1, .08, .2, true, .02); box(group, material('#e08a55'), 0, .46, .1, .04, .12, .04, true);
   mergeStatic(group); this.sprayers.push({ ...p, group, phase: 0, cooldown: 0, warning: false });
  }
  for (const p of level.parrots) {
   const group = new THREE.Group(); group.position.set(p.x, 0, p.z); root.add(group);
   box(group, material('#a88b6c', { roughness: .6 }), 0, .65, 0, .62, 1.3, .58, true, .04); cyl(group, material('#d4c8a8', { metalness: .6, roughness: .3 }), 0, 1.34, 0, .45, .45, .06, 24, true);
   const bars = material('#d4c8a8', { metalness: .6, roughness: .3 }); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; cyl(group, bars, Math.cos(a) * .42, 1.94, Math.sin(a) * .42, .008, .008, 1.18, 4); }
   shape(group, new THREE.SphereGeometry(.43, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), material('#d4c8a8', { metalness: .6, roughness: .3, wireframe: true }), [0, 2.5, 0]); cyl(group, bars, 0, 1.75, 0, .015, .015, .8, 6).rotation.z = Math.PI / 2;
   mergeStatic(group);
   const bird = new THREE.Group(); bird.position.set(0, 1.78, 0); group.add(bird); const green = material('#4fae6b', { roughness: .5 });
   shape(bird, new THREE.SphereGeometry(.15, 16, 12), green, [0, .14, 0], [.9, 1.3, .9], true); shape(bird, new THREE.SphereGeometry(.12, 16, 12), material('#f0cf5a', { roughness: .5 }), [0, .36, .03], [1, 1, 1], true);
   const beak = shape(bird, new THREE.ConeGeometry(.045, .1, 8), material('#2d2d2d', { roughness: .3 }), [0, .34, .14]); beak.rotation.x = Math.PI / 2 + .5;
   for (const s of [-1, 1]) { shape(bird, new THREE.SphereGeometry(.02, 8, 6), material('#111'), [s * .06, .39, .1]); shape(bird, new THREE.SphereGeometry(.1, 10, 8), material('#3d8f5a'), [s * .12, .12, -.02], [.35, 1, .8], true).rotation.z = s * .2; }
   shape(bird, new THREE.ConeGeometry(.06, .3, 6), material('#d9534f'), [0, -.08, -.12], [1, 1, .5], true).rotation.x = -2.6;
   this.birds.push({ ...p, group, bird, meter: 0, cooldown: 0 });
  }
 }
 distract(position) { this.distracted = 7; this.decoy = { ...position }; this.audio.play('meow'); for (const b of this.birds) b.meter = Math.max(0, b.meter - .6); }
 slam(p) { for (const v of this.vacuums) if (Math.hypot(v.position.x - p.x, v.position.z - p.z) < 2.6) { v.stun = 3; this.effects.burst(v.position, '#e8d989', 12); } }
 update(dt, noise) {
  this.time += dt; this.distracted = Math.max(0, this.distracted - dt); const player = this.physics.player; let maxAlert = 0;
  for (const v of this.vacuums) {
   v.cooldown = Math.max(0, v.cooldown - dt); v.stun = Math.max(0, v.stun - dt);
   let tx = v.x + Math.sin(this.time * v.speed * .55 + v.phase) * v.range, tz = v.z + Math.cos(this.time * v.speed * .55 + v.phase) * v.range * .45;
   if (this.distracted > 0 && this.decoy && Math.hypot(this.decoy.x - v.x, this.decoy.z - v.z) < 5) { tx = this.decoy.x; tz = this.decoy.z; }
   if (v.stun <= 0) { const dx = tx - v.position.x, dz = tz - v.position.z, d = Math.hypot(dx, dz); if (d > .03) { v.position.x += dx / d * Math.min(d, dt * v.speed); v.position.z += dz / d * Math.min(d, dt * v.speed); v.group.rotation.y = damp(v.group.rotation.y, v.group.rotation.y + angleDelta(v.group.rotation.y, Math.atan2(dx, dz)), 8, dt); } }
   v.body.setNextKinematicTranslation({ x: v.position.x, y: .15, z: v.position.z }); v.group.position.set(v.position.x, .012 + Math.sin(this.time * 8) * .006, v.position.z); v.group.rotation.z = v.stun > 0 ? Math.sin(this.time * 18) * .12 : 0;
   const near = Math.hypot(player.position.x - v.position.x, player.position.z - v.position.z); v.led.emissive.set(v.stun > 0 ? '#7dffb0' : this.distracted > 0 ? '#ffd166' : near < 2.2 ? '#ff4d3d' : '#59e1ff'); v.led.emissiveIntensity = 2 + Math.sin(this.time * (near < 2.2 ? 14 : 3)) * .8;
   for (const b of v.brushes) b.rotation.y += dt * (v.stun > 0 ? 2 : 18);
   if (v.cooldown <= 0 && v.stun <= 0 && near < .83 && player.position.y < .9 && player.invulnerable <= 0) { v.cooldown = 3; this.onHurt('השואב תפס אותך. חוזרים לנקודה בטוחה.', true); }
  }
  for (const s of this.sprayers) { s.cooldown = Math.max(0, s.cooldown - dt); const d = Math.hypot(player.position.x - s.x, player.position.z - s.z); if (d < 1.35 && s.cooldown <= 0) { s.phase += dt; s.warning = true; if (s.phase > .85) { this.effects.burst({ x: s.x, y: .7, z: s.z }, '#c9eef2', 26, 1.1, { size: .8 }); this.audio.play('spray'); if (d < 1.25 && player.position.y < 1.3) this.onHurt('שפריץ! אפשר לקפוץ מעליו.', false); s.phase = 0; s.cooldown = 3; s.warning = false; } } else { s.phase = 0; s.warning = false; } s.group.scale.setScalar(s.warning ? 1 + Math.sin(this.time * 18) * .08 : 1); }
  for (const b of this.birds) { b.cooldown = Math.max(0, b.cooldown - dt); const d = Math.hypot(player.position.x - b.x, player.position.z - b.z); const exposed = d < 3.2 && this.distracted <= 0; const active = exposed && (player.speed > 1.2 || noise > 0); b.meter = Math.max(0, Math.min(1, b.meter + dt * (active ? .22 : -.1))); b.bird.rotation.y = damp(b.bird.rotation.y, Math.atan2(player.position.x - b.x, player.position.z - b.z), 6, dt); b.bird.position.y = 1.78 + (b.meter > .3 ? Math.abs(Math.sin(this.time * 10)) * .06 * b.meter : 0); if (b.meter >= 1 && b.cooldown <= 0) { b.cooldown = 12; b.meter = .15; this.onCall(); this.audio.play('alarm'); } maxAlert = Math.max(maxAlert, b.meter); }
  return maxAlert;
 }
}
