
// ---------------------------------------------------------------- levels
const LEVELS = [
 { name: 'הסלון', tag: 'קצת נימוסים, הרבה נזק', icon: '🛋️', color: '#3f7f73', target: 480, time: 240, wall: '#7fa89c', intro: [['לטיפה', 'הדלת סגורה?'], ['פאבלו', 'בדקתי. וגם המקרר. לצערי.'], ['לטיפה', 'טוב. נתחיל עם העציץ שמסתכל עליי.']], report: [['פאבלו', 'הספה נראית יותר מאווררת.'], ['לטיפה', 'זה נקרא עיצוב פתוח.']] },
 { name: 'המטבח', tag: 'השיש הוא רק המלצה', icon: '🍳', color: '#7d8a4a', target: 700, time: 240, wall: '#c3cfae', intro: [['לטיפה', 'למה הבזיליקום מקבל מים פעמיים ביום?'], ['פאבלו', 'ולנו אומרים: אכלתם כבר.']], report: [['לטיפה', 'הכוסות מסודרות.'], ['פאבלו', 'כן. כולן באותו גובה עכשיו.']] },
 { name: 'המרפסת', tag: 'הג׳ונגל מתקפל', icon: '🌿', color: '#3b7f8f', target: 900, time: 240, wall: '#93b6bb', intro: [['פאבלו', 'כמה עציצים יש פה?!'], ['לטיפה', 'תתחיל. אני אספור את החתיכות.']], report: [['לטיפה', 'נשאר הרבה יותר מקום לשמש.'], ['פאבלו', 'וגם לשכב בתוך אדמה.']] },
 { name: 'חדר השינה', tag: 'הקקטוס לא משתף פעולה', icon: '🛏️', color: '#7d5a86', target: 780, time: 240, wall: '#c2abb7', intro: [['לטיפה', 'הווילון הזה מגיע עד התקרה.'], ['פאבלו', 'שוב הזמנת לנו מתקן טיפוס?'], ['לטיפה', 'הוא הגיע עם הבית.']], report: [['פאבלו', 'נייר הטואלט נגמר.'], ['לטיפה', 'לא נגמר. נפרס.']] },
 { name: 'כל הבית', tag: 'המפתח כבר בדלת', icon: '🏠', color: '#9a5b3c', target: 1600, time: 160, wall: '#7fa89c', intro: [['לטיפה', 'רגע. שמעתי מפתח.'], ['פאבלו', 'אמרו סוף שבוע! זה לא עבר בוועדה.'], ['לטיפה', 'מסיימים את העציצים, ואז שנינו לספה. מהר.']], report: [['האדם', 'מה… קרה פה?'], ['לטיפה', 'מיאו.'], ['פאבלו', 'מיאו. אבל עייף.']] }
];
class HouseLevel {
 constructor(scene, physics, index) {
  this.index = index; this.config = LEVELS[index]; this.root = new THREE.Group(); this.static = new THREE.Group(); this.root.add(this.static); scene.add(this.root); this.physics = physics;
  this.defs = []; this.zones = []; this.patrols = []; this.sprays = []; this.parrots = []; this.climbs = []; this.boosts = []; this.counter = 0; this.doors = []; this.humans = []; this.checkpoints = []; this.motes = []; this.lamps = [];
  this.bounds = index === 4 ? { x: 12, z: 10 } : { x: 6, z: 5 };
  const woodTex = TEX.wood([1, 1], 6);
  this.mats = { cream: material('#efe4cc', { roughness: .55 }), wood: material('#e8c9a6', { map: woodTex, roughness: .5 }), darkwood: material('#8a6450', { map: woodTex, roughness: .55 }), metal: material('#c9ccc4', { metalness: .7, roughness: .3 }), brass: material('#d9a952', { metalness: .85, roughness: .28 }), cloth: material('#c98a63', { map: TEX.weave([3, 3]), roughness: .95 }), white: material('#f0ede4', { roughness: .4 }), black: material('#22282b', { roughness: .4 }) };
  if (index === 4) { this.room(-6, -5, 0, ['right', 'front']); this.room(6, -5, 1, ['left', 'front']); this.room(-6, 5, 2, ['right', 'back']); this.room(6, 5, 3, ['left', 'back']); this.spawn = { x: -6, z: -2.2 }; this.couch = { x: -8.7, z: -8.7, y: 1.05 }; }
  else { this.room(0, 0, index, []); this.spawn = { x: 0, z: 1.2 }; this.couch = { x: -2.7, z: -3.7, y: 1.05 }; }
  mergeStatic(this.static);
  this.buildMotes();
 }
 add(kind, x, y, z, extra = {}) { const d = { kind, x, y, z, id: `${this.index}:${this.counter++}`, ...extra }; this.defs.push(d); return d; }
 solid(x, y, z, w, h, d, mat = this.mats.wood, r = 0, shadow = true) { box(this.static, mat, x, y, z, w, h, d, shadow, r); this.physics.box(x, y, z, w / 2, h / 2, d / 2); }
 deco(list, shadow = true) { if (!list.length) return; const m = new THREE.Mesh(mergeGeometry(list), vcolor()); m.castShadow = shadow; m.receiveShadow = true; this.static.add(m); }
 flat(x, y, z, w, d, mat, rotation = 0) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.set(-Math.PI / 2, 0, rotation); m.position.set(x, y, z); m.receiveShadow = true; this.static.add(m); return m; }
 picture(x, y, z, w, h, kind, rotY = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; this.static.add(g);
  box(g, this.mats.darkwood, 0, 0, 0, w + .12, h + .12, .05, true); box(g, material('#f6f0e2'), 0, 0, .02, w + .02, h + .02, .02);
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w - .08, h - .08), material('#ffffff', { map: TEX.art(kind), roughness: .7 })); art.position.z = .032; g.add(art);
 }
 rug(x, z, w, d, colors, round = false, rot = 0) { this.flat(x, .011 + this.counter * .0001, z, w, d, new THREE.MeshStandardMaterial({ map: TEX.rug(...colors, round), transparent: true, alphaTest: .4, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 }), rot); }
 lamp(x, y, z) { this.lamps.push({ x, y, z }); }
 room(ox, oz, theme, open) {
  const { cream, wood, darkwood, metal, brass, cloth, white, black } = this.mats;
  const wall = material(LEVELS[theme].wall, { map: TEX.paint([4, 2], theme === 3), roughness: .92 }), lower = material(theme === 3 ? '#8e7b94' : theme === 1 ? '#7f9a78' : '#4f7a70', { roughness: .6 });
  const floorTex = theme === 1 ? TEX.tiles([6, 5], '#ebe5d2', '#bccaa9') : theme === 2 ? TEX.tiles([7, 6], '#cd8462', '#bf7556', '#e6cfb6') : TEX.wood([4, 5], theme === 3 ? -6 : 0);
  this.solid(ox, -.12, oz, 12, .24, 10, material('#ffffff', { map: floorTex, roughness: theme === 1 ? .35 : .55 }), 0, false);
  const wallSegment = (x, z, w, d) => { this.solid(x, 2.4, z, w, 4.8, d, wall, 0, true); box(this.static, lower, x, .5, z, w + .012, 1, d + .012); box(this.static, cream, x, .08, z, w + .05, .16, d + .05); box(this.static, cream, x, 1.02, z, w + .04, .05, d + .04); box(this.static, cream, x, 4.74, z, w + .05, .12, d + .05); };
  for (const side of ['back', 'front', 'left', 'right']) {
   const along = side === 'back' || side === 'front', length = along ? 12 : 10; const x = ox + (side === 'left' ? -6 : side === 'right' ? 6 : 0), z = oz + (side === 'back' ? -5 : side === 'front' ? 5 : 0);
   if (open.includes(side)) { const width = (length - 2.5) / 2; for (const sign of [-1, 1]) wallSegment(x + (along ? sign * (1.25 + width / 2) : 0), z + (along ? 0 : sign * (1.25 + width / 2)), along ? width : .16, along ? .16 : width); box(this.static, wall, x, 4.1, z, along ? 2.5 : .16, 1.4, along ? .16 : 2.5); this.physics.box(x, 4.1, z, along ? 1.25 : .08, .7, along ? .08 : 1.25); }
   else if (side === 'back') { wallSegment(ox - 5.45, oz - 5, 1.1, .16); wallSegment(ox + 1.4, oz - 5, 9.2, .16); this.solid(ox - 4.05, 3.95, oz - 5, 1.7, 1.7, .16, wall); this.physics.box(ox - 4.05, 1.5, oz - 5, .85, 1.5, .08); box(this.static, black, ox - 4.05, 1.5, oz - 5.13, 1.7, 3, .04); }
   else wallSegment(x, z, along ? 12 : .16, along ? .16 : 10);
  }
  this.physics.box(ox, 4.9, oz, 6, .1, 5);
  // window with a painted sky, a warm sun patch on the floor and drifting dust
  if (!open.includes('right')) {
   const wx = ox + 5.9; box(this.static, material('#ffffff', { emissive: '#ffffff', emissiveMap: TEX.sky(theme >= 2), emissiveIntensity: .95, roughness: .1, metalness: 0 }), wx + .01, 2.65, oz, .02, 2.3, 3.3);
   for (const [y, h] of [[1.47, .1], [3.82, .1]]) box(this.static, white, wx - .04, y, oz, .14, h, 3.55, true);
   for (const zz of [-1.72, 1.72]) box(this.static, white, wx - .04, 2.65, oz + zz, .14, 2.45, .1, true);
   box(this.static, white, wx - .06, 2.65, oz, .06, 2.3, .06); box(this.static, white, wx - .06, 2.65, oz, .06, .06, 3.35); box(this.static, white, wx - .15, 1.42, oz, .3, .05, 3.7, true);
   if (theme !== 3) { const curtain = material(theme === 2 ? '#e6dcc4' : '#d6ad86', { map: TEX.weave([2, 6]), roughness: 1 }); for (const s of [-1, 1]) for (let i = 0; i < 4; i++) box(this.static, curtain, wx - .16 - (i % 2) * .05, 2.55, oz + s * (1.95 + i * .17), .07, 3.6, .2, true, .03); box(this.static, brass, wx - .2, 4.42, oz, .04, .04, 4.8); }
   const patch = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.4), new THREE.MeshBasicMaterial({ map: TEX.sunPatch(), transparent: true, opacity: .42, blending: THREE.AdditiveBlending, depthWrite: false, color: theme === 3 ? '#ffb27a' : '#ffe2b0' }));
   patch.rotation.set(-Math.PI / 2, 0, 0); patch.position.set(ox + 3.6, .014, oz); patch.scale.x = 1.15; patch.renderOrder = 2; this.root.add(patch);
   this.motes.push({ x: ox + 3.6, z: oz });
  }
  // door with frame trim
  if (!open.includes('back')) {
   const door = new THREE.Group(); door.position.set(ox - 4.8, 0, oz - 4.86); this.root.add(door); box(door, material('#b07b52', { map: TEX.wood([1, 1], 2), roughness: .5 }), .8, 1.5, 0, 1.6, 3, .1, true); for (const y of [.8, 2.15]) box(door, material('#c6915f', { roughness: .5 }), .8, y, .06, 1.25, 1.0, .03, false, .01); shape(door, new THREE.SphereGeometry(.06, 14, 10), brass, [1.38, 1.4, .12]); mergeStatic(door); this.doors.push(door);
   for (const s of [-1, 1]) box(this.static, cream, ox - 4.05 + s * .9, 1.52, oz - 4.9, .12, 3.04, .1); box(this.static, cream, ox - 4.05, 3.06, oz - 4.9, 1.92, .12, .1);
  }
  if (theme === 0 && !this.humans.length) {
   for (let i = 0; i < 2; i++) { const human = new THREE.Group(); human.position.set(ox - 4.35 + i * .62, 0, oz - 4.45); this.root.add(human); const shirt = material(i ? '#c49a6c' : '#6f98b0', { roughness: .9 }), skin = material('#d8ad86', { roughness: .7 }), jeans = material('#3b4b62', { roughness: .9 });
    shape(human, new THREE.CapsuleGeometry(.2, .45, 6, 14), shirt, [0, 1.25, 0], [1, 1, .65], true); shape(human, new THREE.SphereGeometry(.15, 18, 14), skin, [0, 1.8, 0], [1, 1.08, 1], true); shape(human, new THREE.SphereGeometry(.155, 18, 12, 0, Math.PI * 2, 0, Math.PI * .55), material(i ? '#3a2a20' : '#6b4a2a'), [0, 1.84, -.01], [1.02, 1, 1.04]);
    for (const side of [-1, 1]) { shape(human, new THREE.CapsuleGeometry(.075, .65, 4, 10), jeans, [side * .1, .48, 0], [1, 1, 1], true); shape(human, new THREE.CapsuleGeometry(.055, .5, 4, 10), shirt, [side * .27, 1.22, 0], [1, 1, 1], true); shape(human, new THREE.SphereGeometry(.05, 10, 8), skin, [side * .28, .88, 0]); }
    if (i === 0) shape(human, new THREE.BoxGeometry(.32, .26, .12), material('#6d4c36'), [.33, .8, .05], [1, 1, 1], true);
    mergeStatic(human); human.visible = false; this.humans.push(human); }
  }
  this.checkpoints.push({ x: ox, z: oz + 1.2 });

  // ---- furniture builders (gameplay colliders stay identical to the original layout)
  const stand = (x, z, w = 1.7, h = .85, d = .9) => { this.solid(ox + x, h - .035, oz + z, w, .07, d, wood, .02); for (const sx of [-1, 1]) for (const sz of [-1, 1]) { cyl(this.static, darkwood, ox + x + sx * (w / 2 - .12), (h - .07) / 2, oz + z + sz * (d / 2 - .12), .045, .03, h - .07, 10, true); this.physics.box(ox + x + sx * (w / 2 - .1), h / 2 - .07, oz + z + sz * (d / 2 - .1), .06, (h - .14) / 2, .06); } box(this.static, darkwood, ox + x, h - .13, oz + z, w - .16, .06, d - .16, true); return h; };
  const shelf = (x, z, w, h) => { this.solid(ox + x, h, oz + z, w, .08, .6, wood, .015); for (const s of [-1, 1]) { box(this.static, brass, ox + x + s * (w / 2 - .25), h - .14, oz + z - .1, .04, .22, .4, true); } return h + .32; };
  const couch = (x, z) => {
   const X = ox + x, Z = oz + z, cushion = material('#dba27c', { map: TEX.weave([2, 2]), roughness: .95 });
   this.solid(X, .33, Z, 2.55, .42, 1.05, cloth, .08); this.physics.box(X, .46, Z, 1.275, .3, .525);
   this.solid(X, 1.0, Z - .44, 2.55, .82, .26, cloth, .12); for (const sx of [-1, 1]) this.solid(X + sx * 1.18, .78, Z, .24, .62, 1.1, cloth, .1);
   for (const dx of [-.62, .02, .66]) box(this.static, cushion, X + dx, .64, Z + .06, .66, .2, .86, true, .08);
   for (const dx of [-.62, .66]) box(this.static, cushion, X + dx, 1.05, Z - .26, .62, .5, .18, true, .08);
   const pillow = box(this.static, material('#4f8a7f', { map: TEX.weave([2, 2]), roughness: 1 }), X - .95, .86, Z - .12, .38, .36, .14, true, .07); pillow.rotation.set(-.3, .3, .15);
   for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(this.static, darkwood, X + sx * 1.15, .06, Z + sz * .42, .04, .03, .12, 8);
   const points = []; for (let i = 0; i < 5; i++) points.push(X - .45 + i * .2, .2, Z + .54, X - .27 + i * .2, .55, Z + .54);
   const mark = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(points, 3)), new THREE.LineBasicMaterial({ color: '#f7e0bd' })); mark.visible = false; this.root.add(mark);
   this.zones.push({ kind: 'scratch', x: X, y: .6, z: Z + .65, hits: 0, done: false, mark, label: 'הספה' });
  };
  const cabinet = (x, z) => { this.solid(ox + x, .9, oz + z, 1.7, 1.8, .65, theme === 3 ? wood : cream, .03); box(this.static, theme === 3 ? darkwood : wood, ox + x, 1.83, oz + z, 1.76, .06, .7, true); const hinge = new THREE.Group(); hinge.position.set(ox + x - .81, 0, oz + z + .35); this.root.add(hinge); box(hinge, theme === 3 ? darkwood : material('#9fb59a', { roughness: .5 }), .4, .9, 0, .8, 1.66, .05, true, .015); shape(hinge, new THREE.CylinderGeometry(.015, .015, .3, 8), brass, [.7, .95, .05]); mergeStatic(hinge); this.zones.push({ kind: 'cabinet', x: ox + x, y: .8, z: oz + z + .75, hits: 0, done: false, hinge, label: theme === 3 ? 'הארון' : 'הארונית' }); };
  const books = (x0, y, z, len, axis = 'z') => { const list = []; let t = 0; const colors = ['#a8493c', '#2f5d62', '#e9c46a', '#5b4a7a', '#d98e52', '#3d6b4f', '#efe4cc']; while (t < len - .1) { const w = .05 + rand() * .06, h = .2 + rand() * .14, c = colors[Math.floor(rand() * colors.length)]; const lean = rand() < .08 ? .25 : 0; const p = axis === 'z' ? [x0, y + h / 2, z - len / 2 + t + w / 2] : [x0 - len / 2 + t + w / 2, y + h / 2, z]; list.push(piece(new THREE.BoxGeometry(axis === 'z' ? .22 : w, h, axis === 'z' ? w : .22), c, p, [1, 1, 1], axis === 'z' ? [lean, 0, 0] : [0, 0, lean])); t += w + .005; if (rand() < .12) t += .15; } this.deco(list); };
  reseed(100 + theme);

  if (theme === 0) {
   couch(-2.7, -3.7); stand(.4, -.65, 2.3, .85, 1.3);
   this.add('plant', ox + 1.38, 1.09, oz - .7); this.add('glass', ox + .2, 1.02, oz - .15); this.add('vase', ox - .45, 1.18, oz - .7); this.add('plant', ox + 4, .23, oz - 2.7); this.add('plant', ox - 3.8, .23, oz + .4); this.add('stool', ox + 2.6, .4, oz + 2.2); this.add('fish', ox - 2.7, 1.08, oz - 3.7); this.add('fish', ox + 3.9, .4, oz + 3); this.add('fish', ox - 4.7, .4, oz - 2.2);
   this.patrols.push({ x: ox + 2.5, z: oz + 2, range: 1.6, speed: .8 });
   // decor: rug, tv console, floor lamp, bookcase, art
   this.rug(ox - .2, oz - .3, 5.4, 3.8, ['#b8644a', '#efc27a', '#2f5d62']);
   this.solid(ox + 2.9, .3, oz - 4.58, 2.4, .6, .55, darkwood, .03); box(this.static, black, ox + 2.9, 1.85, oz - 4.88, 2.1, 1.2, .07, true, .02); box(this.static, material('#0c1a24', { emissive: '#1d3a52', emissiveIntensity: .35, roughness: .15 }), ox + 2.9, 1.85, oz - 4.84, 1.98, 1.08, .01);
   cyl(this.static, black, ox + 5.3, .02, oz - 4.3, .2, .22, .04, 20, true); cyl(this.static, brass, ox + 5.3, .9, oz - 4.3, .02, .02, 1.75, 8, true); this.physics.box(ox + 5.3, .9, oz - 4.3, .05, .9, .05);
   shape(this.static, new THREE.CylinderGeometry(.18, .3, .36, 24, 1, true), material('#fff1d6', { emissive: '#ffd79a', emissiveIntensity: .9, side: THREE.DoubleSide, roughness: .9 }), [ox + 5.3, 1.85, oz - 4.3]); this.lamp(ox + 5.3, 1.7, oz - 4.3);
   const bx = ox - 5.66, bz = oz + 2.6; for (const s of [-1, 1]) this.solid(bx, 1.1, bz + s * 1.2, .5, 2.2, .06, darkwood); box(this.static, darkwood, bx - .23, 1.1, bz, .04, 2.2, 2.4, true);
   for (const [i, y] of [.05, .6, 1.15, 1.7, 2.22].entries()) { this.solid(bx, y, bz, .5, .05, 2.36, wood); if (i < 4) books(bx - .1, y + .025, bz, 2.2 - (i % 2) * .5); }
   this.picture(ox - 2.7, 2.45, oz - 4.9, 1.5, 1.05, 0); this.picture(ox - 5.9, 2.5, oz - 1.6, .8, 1.0, 1, Math.PI / 2); this.picture(ox - 5.9, 2.2, oz - .5, .6, .6, 3, Math.PI / 2);
   this.add('lamp', ox + 3.75, .86, oz - 4.55); this.add('mug', ox - .2, .94, oz - 1.05); this.add('book', ox - 5.62, 1.24, oz + 1.7); this.add('frame', ox + 2.1, .74, oz - 4.55);
  }
  if (theme === 1) {
   this.solid(ox, .5, oz - 4.25, 5.5, 1, 1.25, material('#9fb59a', { roughness: .5 }), .02); this.solid(ox, 1.06, oz - 4.25, 5.65, .14, 1.4, material('#f4f1ea', { roughness: .25, metalness: .05 }), .02); for (let i = 0; i < 4; i++) { box(this.static, material('#b3c7ad', { roughness: .5 }), ox - 2.06 + i * 1.375, .55, oz - 3.6, 1.28, .82, .03, false, .01); box(this.static, brass, ox - 2.06 + i * 1.375, .88, oz - 3.57, .4, .03, .03); }
   cabinet(-4, -3.8); const h = shelf(.3, -4.55, 3.4, 2.2);
   this.add('basil', ox - 1.8, 1.36, oz - 3.75); this.add('plant', ox + 1.35, 1.36, oz - 3.8); this.add('basil', ox + .3, h, oz - 4.48); this.add('plant', ox + 3.8, .23, oz + 1.4); for (let i = 0; i < 4; i++) this.add('glass', ox - 1 + i * .45, 1.28, oz - 3.64); stand(-.8, .6, 1.7, .65); this.add('stool', ox + 2, .4, oz - 2); this.add('fish', ox - .7, .9, oz + .6); this.add('fish', ox + .6, 2.7, oz - 4.4); this.add('fish', ox - 4, 2.15, oz - 3.7);
   this.climbs.push({ x: ox + 2.65, z: oz - 3.55, y: 1.65, label: 'לשיש' }); this.boosts.push({ x: ox + .1, z: oz - 3.2, y: 3.2 }); this.patrols.push({ x: ox + 2.1, z: oz + 1.8, range: 1.4, speed: 1.05 }); this.sprays.push({ x: ox + 3.8, z: oz - 2.8 });
   // decor: backsplash, upper cabinets, fridge, pendant lamps, runner
   box(this.static, material('#ffffff', { map: TEX.tiles([7, 1.2], '#f4f1e8', '#dfe9e2', '#cbc4b2', 8), roughness: .2 }), ox, 1.62, oz - 4.905, 5.6, .95, .01);
   for (const [x, w] of [[-2.0, 1.6], [2.4, 1.2]]) { this.solid(ox + x, 3.15, oz - 4.68, w, .9, .45, material('#e9eadf', { roughness: .45 }), .03); box(this.static, brass, ox + x, 2.78, oz - 4.44, .3, .025, .03); }
   this.solid(ox + 4.75, 1.05, oz - 4.42, 1.0, 2.1, .85, material('#e6ebe9', { roughness: .25, metalness: .25 }), .08); box(this.static, metal, ox + 4.32, 1.35, oz - 3.97, .04, .7, .04, true); box(this.static, material('#d9dfdd', { roughness: .3 }), ox + 4.75, 1.48, oz - 3.995, .96, .015, .02);
   this.picture(ox + 4.7, .95, oz - 3.97, .3, .35, 2); this.picture(ox - 5.9, 2.5, oz + .5, 1.0, .75, 1, Math.PI / 2);
   for (const x of [-1.25, -.35]) { cyl(this.static, black, ox + x, 3.6, oz + .6, .006, .006, 2.4, 4); shape(this.static, new THREE.CylinderGeometry(.08, .26, .24, 24, 1, true), material('#2f5d62', { side: THREE.DoubleSide, roughness: .4, metalness: .4 }), [ox + x, 2.32, oz + .6], [1, 1, 1], true); shape(this.static, new THREE.SphereGeometry(.07, 12, 8), material('#fff3d6', { emissive: '#ffd79a', emissiveIntensity: 2 }), [ox + x, 2.22, oz + .6]); }
   this.lamp(ox - .8, 2.1, oz + .6);
   this.rug(ox, oz - 2.95, 4.6, 1.0, ['#5b7f6a', '#e9d8a6', '#b8644a']);
   this.add('mug', ox + 2.25, 1.22, oz - 4.1); this.add('mug', ox - 2.4, 1.22, oz - 4.25); this.add('bowl', ox - 1.35, .72, oz + .45); this.add('book', ox - .6, 2.32, oz - 4.55);
  }
  if (theme === 2) {
   stand(-2.5, -2.9, 2.7, .65); stand(2.5, -2.9, 2, .9);
   const plantCount = this.index === 4 ? 3 : 6; for (let i = 0; i < plantCount; i++) { const locations = [[-3.45, .89, -2.8], [-1.5, .89, -2.8], [2.4, 1.14, -2.8], [-3.5, .23, 1], [2.8, .23, 1.6], [.4, .23, -.2]]; const [x, y, z] = locations[i]; this.add('plant', ox + x, y, oz + z); }
   this.add('hanging', ox + .4, 2.8, oz - 3.2); for (let i = 0; i < 3; i++) this.add('vase', ox - 2 + i * 1.6, .34, oz + 2.5); this.add('fish', ox - 2.5, 1, oz - 2.9); this.add('fish', ox + .4, 3.25, oz - 3.2); this.add('fish', ox + 4, .4, oz + 3.1);
   this.boosts.push({ x: ox + .4, z: oz - 2, y: 3.65 }); this.climbs.push({ x: ox + 2.4, z: oz - 2.1, y: 1.7, label: 'למדף' }); this.patrols.push({ x: ox + 2.4, z: oz + .3, range: 1.5, speed: 1.15 }); this.parrots.push({ x: ox - 4.7, z: oz - 3.5 }); this.sprays.push({ x: ox + 4.5, z: oz + .4 });
   // decor: string lights, planter with grasses, lounge chair, lanterns
   const bulbs = []; const pts = []; for (let i = 0; i <= 60; i++) { const t = i / 60, x = -5.6 + t * 11.2, sag = Math.sin((t * 3 % 1) * Math.PI) * .35; pts.push(new THREE.Vector3(ox + x, 3.75 - sag, oz - 4.82)); if (i % 4 === 2) bulbs.push([ox + x, 3.68 - sag, oz - 4.8]); }
   shape(this.static, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, .008, 4), black, [0, 0, 0]);
   const bulbMat = material('#fff4d0', { emissive: '#ffcf7a', emissiveIntensity: 3 }); for (const p of bulbs) shape(this.static, new THREE.SphereGeometry(.045, 10, 8), bulbMat, p, [1, 1.25, 1]);
   this.solid(ox - .5, .25, oz + 4.55, 5.2, .5, .6, darkwood, .03); const grass = []; for (let i = 0; i < 70; i++) { const x = -2.9 + rand() * 4.8, h = .4 + rand() * .7; grass.push(piece(new THREE.ConeGeometry(.03, h, 4), rand() < .5 ? '#5f9b5a' : '#7cb36a', [ox + x, .5 + h / 2, oz + 4.45 + rand() * .25], [1, 1, 1], [(rand() - .5) * .5, 0, (rand() - .5) * .6])); } for (let i = 0; i < 8; i++) grass.push(piece(new THREE.SphereGeometry(.05, 8, 6), ['#f4a261', '#e76f51', '#f7d26b'][i % 3], [ox - 2.6 + i * .6, 1.02 + rand() * .2, oz + 4.5])); this.deco(grass);
   const chair = []; for (let i = 0; i < 6; i++) chair.push(piece(new THREE.BoxGeometry(.75, .04, .12), '#c48a5a', [0, .42, -.4 + i * .15])); for (let i = 0; i < 4; i++) chair.push(piece(new THREE.BoxGeometry(.75, .04, .11), '#c48a5a', [0, .62 + i * .13, -.55 - i * .05], [1, 1, 1], [-.35, 0, 0])); for (const sx of [-.33, .33]) for (const sz of [-.35, .35]) chair.push(piece(new THREE.BoxGeometry(.05, .42, .05), '#8a5a3a', [sx, .21, sz])); const chairMesh = new THREE.Mesh(mergeGeometry(chair.map(g => { g.translate(ox - 4.4, 0, oz + 3); return g; })), vcolor()); chairMesh.castShadow = chairMesh.receiveShadow = true; this.static.add(chairMesh); this.physics.box(ox - 4.4, .22, oz + 3, .38, .22, .42);
   for (const [x, z] of [[4.9, -4.4], [-5.3, 1.8]]) { box(this.static, black, ox + x, .25, oz + z, .3, .5, .3, true, .03); shape(this.static, new THREE.SphereGeometry(.07, 12, 8), bulbMat, [ox + x, .25, oz + z]); }
   this.lamp(ox + 4.9, .6, oz - 4.2);
   this.rug(ox + .3, oz + .4, 4, 2.8, ['#e9d8a6', '#2f5d62', '#c97d5d']);
   this.add('lamp', ox + 3.1, 1.15, oz - 2.75); this.add('mug', ox - 2.5, .73, oz - 2.6);
  }
  if (theme === 3) {
   this.solid(ox - .7, .37, oz - 1.7, 2.8, .6, 3.4, darkwood, .04); box(this.static, white, ox - .7, .78, oz - 1.7, 2.75, .24, 3.3, true, .08); box(this.static, material('#6f8fa6', { map: TEX.weave([4, 4]), roughness: 1 }), ox - .7, .93, oz - 1.05, 2.82, .1, 2.1, true, .05);
   for (const x of [-1.35, -.1]) box(this.static, material('#f3ece0', { roughness: .95 }), ox + x, 1.0, oz - 2.75, 1, .2, .55, true, .09);
   this.solid(ox - .7, .8, oz - 3.46, 3.0, 1.6, .12, material('#7d6491', { map: TEX.weave([3, 3]), roughness: 1 }), .05);
   cabinet(3.8, -3.5); const h = shelf(-1, -4.5, 3.5, 2.5);
   this.add('plant', ox - 1, h, oz - 4.5); this.add('cactus', ox + 3.6, .23, oz + 1.6); this.add('plant', ox - 4.1, .23, oz + 1.8); this.add('plant', ox + 3.7, 2.07, oz - 3.5); for (let i = 0; i < 3; i++) this.add('paper', ox + 1.5 + i * .5, .25, oz + 1.5); this.add('stool', ox - 3.4, .4, oz - 2); this.add('fish', ox - .7, 1.2, oz - 1.2); this.add('fish', ox - 1, 3, oz - 4.5); this.add('fish', ox + 3.8, 2.2, oz - 3.5);
   const curtain = material('#c9a27e', { map: TEX.weave([2, 6]), roughness: 1 }); for (let i = 0; i < 7; i++) box(this.static, curtain, ox + 5.64 - (i % 2) * .05, 2.6, oz - 1.7 + i * .2, .09, 3.6, .18, true, .03);
   this.climbs.push({ x: ox + 5.2, z: oz - 1, y: 2.5, label: 'על הווילון' }); this.climbs.push({ x: ox - 1, z: oz - 3.8, y: 3.15, label: 'למדף' }); this.boosts.push({ x: ox + 3.7, z: oz - 2.5, y: 2.8 }); this.sprays.push({ x: ox + 3.6, z: oz + .8 }); this.parrots.push({ x: ox - 4.7, z: oz - 3.6 }); this.patrols.push({ x: ox + .4, z: oz + 2.2, range: 2.4, speed: 1.2 });
   // decor: nightstand + lamp, rug, art, fairy lights
   this.solid(ox + 1.25, .3, oz - 3.05, .62, .6, .5, wood, .03); box(this.static, brass, ox + 1.25, .42, oz - 2.79, .14, .025, .03);
   this.rug(ox - .7, oz + 1.25, 3.4, 3.4, ['#e9d8c8', '#7d6491', '#c97d5d'], true);
   this.picture(ox - 5.9, 2.4, oz - 1.4, 1.1, .8, 2, Math.PI / 2); this.picture(ox - 5.9, 2.3, oz + 1.2, .7, .9, 0, Math.PI / 2);
   const bulbMat = material('#fff4d0', { emissive: '#ffb86b', emissiveIntensity: 3 }); for (let i = 0; i < 14; i++) { const t = i / 13; shape(this.static, new THREE.SphereGeometry(.035, 8, 6), bulbMat, [ox - 2.1 + t * 2.8, 2.05 - Math.sin(t * Math.PI) * .25, oz - 3.42]); }
   this.lamp(ox + 1.25, 1.3, oz - 2.9);
   this.add('lamp', ox + 1.25, .86, oz - 3.05); this.add('book', ox + 1.1, .64, oz - 1.0); this.add('frame', ox - 3.4, .9, oz - 2.0);
  }
 }
 buildMotes() {
  const count = this.motes.length * 70; if (!count) return; const pos = new Float32Array(count * 3); this.moteData = [];
  this.motes.forEach((m, k) => { for (let i = 0; i < 70; i++) { const j = k * 70 + i; this.moteData.push({ bx: m.x - 1.6 + rand() * 3.2, by: .3 + rand() * 3, bz: m.z - 1.8 + rand() * 3.6, ph: rand() * 6.28, sp: .2 + rand() * .4 }); } });
  this.moteGeo = new THREE.BufferGeometry(); this.moteGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(this.moteGeo, new THREE.PointsMaterial({ map: TEX.glow(), size: .05, transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending, color: '#fff0c8' })); pts.frustumCulled = false; this.root.add(pts); this.updateMotes(0);
 }
 updateMotes(t) { if (!this.moteGeo) return; const a = this.moteGeo.attributes.position.array; this.moteData.forEach((m, i) => { a[i * 3] = m.bx + Math.sin(t * m.sp + m.ph) * .25; a[i * 3 + 1] = m.by + Math.sin(t * m.sp * .7 + m.ph * 2) * .3; a[i * 3 + 2] = m.bz + Math.cos(t * m.sp * .8 + m.ph) * .25; }); this.moteGeo.attributes.position.needsUpdate = true; }
 nearestCheckpoint(p) { return this.checkpoints.reduce((best, c) => Math.hypot(c.x - p.x, c.z - p.z) < Math.hypot(best.x - p.x, best.z - p.z) ? c : best, this.checkpoints[0]); }
 update(dt, t) { for (const z of this.zones) { if (z.hinge) z.hinge.rotation.y += ((z.done ? -1.65 : 0) - z.hinge.rotation.y) * (1 - Math.exp(-6 * dt)); if (z.mark) z.mark.visible = z.done; } this.updateMotes(t); }
}
