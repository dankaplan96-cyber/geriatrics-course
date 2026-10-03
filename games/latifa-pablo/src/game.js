
// ---------------------------------------------------------------- audio (all synthesized, no downloads)
class AudioSystem {
 constructor() { this.context = null; this.volume = .5; this.music = true; this.nextNote = 0; this.note = 0; }
 async unlock() { try { if (!this.context) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; this.context = new C(); this.master = this.context.createGain(); this.master.gain.value = this.volume * .4; const comp = this.context.createDynamicsCompressor(); this.master.connect(comp); comp.connect(this.context.destination); this.musicBus = this.context.createGain(); this.musicBus.gain.value = this.music ? .55 : 0; this.musicBus.connect(this.master); } if (this.context.state === 'suspended') await this.context.resume(); } catch { } }
 setVolume(value) { this.volume = value; if (this.master) this.master.gain.setTargetAtTime(value * .4, this.context.currentTime, .04); }
 setMusic(on) { this.music = on; if (this.musicBus) this.musicBus.gain.setTargetAtTime(on ? .55 : 0, this.context.currentTime, .1); }
 tone(freq, duration = .15, type = 'sine', gain = .15, end = freq, bus = this.master, delay = 0) { if (!this.context || this.context.state !== 'running') return; const t = this.context.currentTime + delay, o = this.context.createOscillator(), g = this.context.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + duration); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + duration); o.connect(g); g.connect(bus); o.start(t); o.stop(t + duration + .03); o.onended = () => { o.disconnect(); g.disconnect(); }; }
 noise(duration = .2, gain = .3, frequency = 1800, type = 'lowpass') { if (!this.context || this.context.state !== 'running') return; const ctx = this.context, n = Math.floor(ctx.sampleRate * duration), b = ctx.createBuffer(1, n, ctx.sampleRate), data = b.getChannelData(0); for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2); const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), g = ctx.createGain(); source.buffer = b; filter.type = type; filter.frequency.value = frequency; g.gain.value = gain; source.connect(filter); filter.connect(g); g.connect(this.master); source.start(); source.onended = () => { source.disconnect(); filter.disconnect(); g.disconnect(); }; }
 play(name) {
  const r = 1 + (Math.random() - .5) * .12;
  switch (name) {
   case 'break': this.noise(.3, .34, 3200); this.tone(420 * r, .18, 'triangle', .14, 110); this.tone(90, .2, 'sine', .2, 45); break;
   case 'glass': this.noise(.25, .25, 6000, 'highpass'); for (let i = 0; i < 4; i++) this.tone((1800 + Math.random() * 1600) * r, .25, 'sine', .05, 1500, this.master, i * .03); break;
   case 'paw': this.noise(.07, .14, 2600); this.tone(300 * r, .06, 'sine', .05, 180); break;
   case 'swipe': this.noise(.12, .12, 1400, 'bandpass'); break;
   case 'jump': this.tone(300 * r, .13, 'sine', .12, 640); break;
   case 'land': this.noise(.09, .16, 420); break;
   case 'meow': this.tone(560 * r, .32, 'sawtooth', .04, 760); this.tone(560 * r, .38, 'triangle', .08, 380); break;
   case 'slam': this.noise(.35, .4, 520); this.tone(110, .32, 'sine', .32, 30); break;
   case 'fish': this.tone(880, .12, 'sine', .15, 1200); this.tone(1320, .18, 'sine', .12, 1500, this.master, .09); break;
   case 'task': [660, 880, 1100].forEach((n, i) => this.tone(n, .2, 'triangle', .1, n, this.master, i * .07)); break;
   case 'combo': this.tone(500 + Math.random() * 300, .15, 'square', .035, 900); break;
   case 'hurt': this.tone(440, .22, 'triangle', .13, 130); this.noise(.14, .13, 600); break;
   case 'win': [523, 659, 784, 1047, 1319].forEach((n, i) => this.tone(n, .35, 'triangle', .13, n, this.master, i * .1)); break;
   case 'door': this.noise(.28, .35, 240); this.tone(80, .15, 'triangle', .15, 40); break;
   case 'key': this.noise(.2, .18, 5000); this.tone(2100, .1, 'sine', .06, 1400); break;
   case 'purr': for (let i = 0; i < 6; i++) this.tone(38, .12, 'sawtooth', .05, 30, this.master, i * .13); break;
   case 'alarm': this.tone(690, .2, 'square', .04, 500); this.tone(690, .2, 'square', .04, 500, this.master, .25); break;
   case 'spray': this.noise(.35, .2, 3500, 'highpass'); break;
   case 'click': this.tone(900, .05, 'sine', .06, 700); break;
  }
 }
 update() {
  if (!this.context || !this.music || this.context.state !== 'running') return; const t = this.context.currentTime; if (t < this.nextNote - .05) return;
  const step = .21, at = Math.max(t, this.nextNote); this.nextNote = at + step;
  const bar = Math.floor(this.note / 16) % 4, chords = [[262, 330, 392], [220, 262, 330], [175, 220, 262], [196, 247, 294]], ch = chords[bar], k = this.note % 16;
  const melody = [0, -1, 2, 1, -1, 0, 2, -1, 1, -1, 0, 2, -1, 1, 0, -1]; const m = melody[(k + bar * 3) % 16];
  if (m >= 0) this.tone(ch[m] * 2, .22, 'triangle', .05, ch[m] * 2, this.musicBus, at - t);
  if (k % 4 === 0) this.tone(ch[0] / 2, .4, 'sine', .09, ch[0] / 2, this.musicBus, at - t);
  if (k % 8 === 4) this.tone(ch[1], .3, 'sine', .035, ch[1], this.musicBus, at - t);
  if (k % 2 === 1) this.tone(5000, .03, 'square', .006, 4000, this.musicBus, at - t);
  this.note++;
 }
 pause() { if (this.context?.state === 'running') this.context.suspend().catch(() => { }); }
}

// ---------------------------------------------------------------- ui
class UI {
 constructor() { this.toastTimer = null; this.hintTimer = null; }
 progress(value, text) { document.getElementById('progress-fill').style.width = value + '%'; document.getElementById('loading-status').textContent = text; }
 showHint(text, seconds = 5) { const h = document.getElementById('hint'); h.querySelector('span').textContent = text; h.hidden = false; clearTimeout(this.hintTimer); this.hintTimer = setTimeout(() => { h.hidden = true; }, seconds * 1000); }
 dismissHint() { document.getElementById('hint').hidden = true; }
 toast(text) { const t = document.getElementById('toast'); t.textContent = text; t.hidden = true; void t.offsetWidth; t.hidden = false; clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => t.hidden = true, 2600); }
 callout(text) { const c = document.getElementById('callout'); c.textContent = text; c.classList.remove('show'); void c.offsetWidth; c.classList.add('show'); }
 flash() { const f = document.getElementById('flash'); f.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on'))); }
 screen(state) {
  clearTimeout(this.toastTimer); document.getElementById('toast').hidden = true;
  for (const id of ['home', 'levels-screen', 'closet-screen', 'settings-screen', 'pause-screen', 'summary-screen', 'story', 'loading']) document.getElementById(id).hidden = true;
  const id = { home: 'home', levels: 'levels-screen', closet: 'closet-screen', settings: 'settings-screen', pause: 'pause-screen', summary: 'summary-screen', cutscene: 'story', loading: 'loading' }[state]; if (id) document.getElementById(id).hidden = false;
  for (const name of ['hud', 'controls', 'game-feedback']) document.getElementById(name).hidden = state !== 'play';
  for (const name of ['context-hint', 'alert', 'minimap']) document.getElementById(name).hidden = true;
  if (state !== 'play') this.dismissHint();
 }
}

// ---------------------------------------------------------------- game feel: targeting, popups, tasks, objective arrow
class GameFeel {
 constructor(game) {
  this.game = game; this.target = null; this.cursor = 0; this.slamTime = 0;
  this.metrics = { paw: 0, slam: 0, climb: 0, boost: 0, high: 0, hanging: 0, fish: 0, chain: 0, zone: 0, distract: 0 };
  this.projected = new THREE.Vector3(); this.rayDirection = new THREE.Vector3();
  this.marker = document.getElementById('target-marker'); this.pointer = document.getElementById('objective');
  const host = document.getElementById('score-popups'); host.replaceChildren();
  this.popups = Array.from({ length: 12 }, () => { const element = document.createElement('div'); element.className = 'score-popup'; element.hidden = true; host.append(element); return { element, life: 0, p: { x: 0, y: 0, z: 0 }, dx: 0 }; });
  const definitions = [
   [['paw', 1, 'כפה ראשונה', 'מתקרבים לעציץ המסומן ולוחצים על הכפה'], ['zone', 1, 'עיצוב מחדש', 'מחזיקים כפה ליד הספה כדי לשרוט'], ['chain', 2, 'בלאגן כפול', 'שוברים שני חפצים בתוך 3 שניות']],
   [['zone', 1, 'פותחים הכול', 'כפה ליד דלת הארונית'], ['climb', 1, 'על השיש', 'לטיפה: יכולת ליד טבעת הטיפוס'], ['high', 1, 'פינוי מדפים', 'מפילים חפץ ממשטח גבוה']],
   [['boost', 1, 'עבודת צוות', 'לטיפה: יכולת בטבעת הזהובה ליד פאבלו'], ['chain', 3, 'אפקט הדומינו', 'שוברים 3 חפצים ברצף'], ['hanging', 1, 'גם התלוי ייפול', 'קופצים ומכים את העציץ התלוי']],
   [['climb', 1, 'חתולת וילונות', 'לטיפה: יכולת ליד הווילון'], ['slam', 1, 'נחיתה רכה?', 'פאבלו: יכולת ליד קקטוס או רהיט'], ['zone', 1, 'בדיקת ארון', 'פותחים את הארון במכת כפה']],
   [['chain', 3, 'בלי לעצור', 'שוברים 3 חפצים ברצף אחד'], ['slam', 2, 'פאבלו בפעולה', 'שתי נחיתות בטן'], ['high', 2, 'ניקוי מלמעלה', 'מפילים שני חפצים ממשטח גבוה']]
  ];
  this.tasks = definitions[game.index].map(([key, goal, title, help]) => ({ key, goal, title, help, done: false }));
  this.rings = new THREE.InstancedMesh(new THREE.RingGeometry(.86, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, depthWrite: false, side: THREE.DoubleSide }), Math.max(1, game.enemies.vacuums.length + game.enemies.sprayers.length + game.level.climbs.length + game.level.boosts.length));
  this.rings.frustumCulled = false; this.rings.renderOrder = 3; game.level.root.add(this.rings); this.matrix = new THREE.Matrix4(); this.rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)); this.scale = new THREE.Vector3(); this.point = new THREE.Vector3(); this.color = new THREE.Color();
  this.wave = new THREE.Mesh(new THREE.RingGeometry(.8, 1, 48), new THREE.MeshBasicMaterial({ color: '#ffdb89', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); this.wave.rotation.x = -Math.PI / 2; this.wave.visible = false; game.level.root.add(this.wave);
  this.reticle = new THREE.Mesh(new THREE.RingGeometry(.26, .33, 32), new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: .9, depthWrite: false, depthTest: false, side: THREE.DoubleSide })); this.reticle.rotation.x = -Math.PI / 2; this.reticle.renderOrder = 4; this.reticle.visible = false; game.level.root.add(this.reticle);
  this.taskIndex = -1;
 }
 visibleFrom(p, o) {
  const a = { x: p.x, y: p.y + .15, z: p.z }, b = o.position || o; this.rayDirection.set(b.x - a.x, b.y - a.y, b.z - a.z); const distance = this.rayDirection.length(); if (distance < .03) return true;
  this.rayDirection.multiplyScalar(1 / distance); const hit = this.game.physics.world.castRay(new RAPIER.Ray(a, this.rayDirection), distance, true, RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC | RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC);
  return !hit || hit.timeOfImpact > distance - .12;
 }
 acquire(range = 1.7, minFacing = -2) {
  const g = this.game, c = g.physics.player, p = c.position; let best = Infinity, target = null;
  for (const o of g.objects.items) {
   if (o.broken || o.fish) continue; const dx = o.position.x - p.x, dz = o.position.z - p.z, d = Math.hypot(dx, dz); if (d > range || Math.abs(p.y - o.position.y) > 1.18) continue;
   const facing = d > .01 ? (dx * Math.sin(c.facing) + dz * Math.cos(c.facing)) / d : 1; if (facing < minFacing) continue; const rank = d + (1 - facing) * .35 - (o === this.target?.object ? .1 : 0);
   if (rank < best && this.visibleFrom(p, o)) { best = rank; target = { object: o, position: o.position, kind: o.kind }; }
  }
  if (!target && range <= 1.8) for (const z of g.level.zones) { if (!z.done && Math.hypot(z.x - p.x, z.z - p.z) < 1.75 && this.visibleFrom(p, z)) { target = { zone: z, position: { x: z.x, y: z.y, z: z.z }, kind: z.kind }; break; } }
  if (range <= 1.8) this.target = target; return target;
 }
 ability() {
  const g = this.game, c = g.physics.player, p = c.position;
  if (c.id === 'pablo') return { label: 'בטן!', type: 'slam', detail: 'קפיצה ונחיתת בטן שמפילה הכול מסביב' };
  const boost = g.level.boosts.find(z => Math.hypot(z.x - p.x, z.z - p.z) < 1.6 && Math.hypot(g.physics.companion.position.x - p.x, g.physics.companion.position.z - p.z) < 2.8);
  if (boost && p.y < 1.1) return { label: 'הקפצה', type: 'boost', zone: boost, detail: 'פאבלו מקפיץ אותך למעלה' };
  const climb = g.level.climbs.find(z => Math.hypot(z.x - p.x, z.z - p.z) < 1.4 && p.y < z.y - .2);
  if (climb) return { label: 'טיפוס', type: 'climb', zone: climb, detail: `טיפוס ${climb.label}` };
  return { label: 'הסחה', type: 'distract', detail: 'מסיחים את השואב' };
 }
 event(key, n = 1) { this.metrics[key] = (this.metrics[key] || 0) + n; }
 popup(text, p, tone = 'gold') { const f = this.popups[this.cursor++ % this.popups.length]; f.life = 1.1; f.p = { ...p }; f.dx = (Math.random() - .5) * 40; f.element.textContent = text; f.element.className = 'score-popup ' + tone; f.element.hidden = false; }
 shock(p) { this.slamTime = .5; this.wave.position.set(p.x, p.y - .36, p.z); this.wave.visible = true; }
 project(p) { return this.projected.set(p.x, p.y, p.z).project(this.game.view.camera); }
 update(dt) {
  const g = this.game; this.acquire(); const W = innerWidth, H = innerHeight;
  for (const f of this.popups) { f.life = Math.max(0, f.life - dt); if (!f.life) { f.element.hidden = true; continue; } const age = 1.1 - f.life; const v = this.project({ x: f.p.x, y: f.p.y + .45 + age * .9, z: f.p.z }); f.element.hidden = v.z > 1 || v.z < -1; const s = age < .12 ? .4 + age / .12 * .8 : 1.2 - Math.min(.2, (age - .12) * .6); f.element.style.transform = `translate(calc(-50% + ${f.dx * age}px),-50%) scale(${s.toFixed(3)})`; f.element.style.left = (v.x * .5 + .5) * W + 'px'; f.element.style.top = (-v.y * .5 + .5) * H + 'px'; f.element.style.opacity = Math.min(1, f.life * 3); }
  const t = this.target;
  if (t) { const v = this.project({ x: t.position.x, y: t.position.y + .55, z: t.position.z }); this.marker.hidden = v.z > 1 || v.z < -1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1; this.marker.style.left = (v.x * .5 + .5) * W + 'px'; this.marker.style.top = (-v.y * .5 + .5) * H + 'px'; this.marker.dataset.danger = t.kind === 'cactus' ? 'true' : 'false'; this.marker.querySelector('span').textContent = t.kind === 'scratch' ? 'לשרוט!' : t.kind === 'cabinet' ? 'לפתוח!' : t.kind === 'cactus' ? 'קוצים!' : 'כפה!'; this.reticle.visible = true; const half = HALF[t.kind]?.[1] ?? .2; this.reticle.position.set(t.position.x, t.position.y - (t.zone ? .58 : half) + .02, t.position.z); this.reticle.scale.setScalar(1 + Math.sin(performance.now() * .012) * .12); this.reticle.material.color.set(t.kind === 'cactus' ? '#ff6b57' : '#ffd166'); }
  else { this.marker.hidden = true; this.reticle.visible = false; }
  this.progress(); this.updateTask(); this.updatePointer(); this.updateRings();
  this.slamTime = Math.max(0, this.slamTime - dt); this.wave.visible = this.slamTime > 0; if (this.slamTime) { this.wave.scale.setScalar((1 - this.slamTime / .5) * 2.6 + .2); this.wave.material.opacity = this.slamTime / .5 * .8; }
 }
 updateTask() { const task = this.tasks.find(t => !t.done), completed = this.tasks.filter(t => t.done).length, idx = this.tasks.indexOf(task); if (idx === this.taskIndex && this.taskCount === completed) return; this.taskIndex = idx; this.taskCount = completed; document.getElementById('task-title').textContent = task ? '🎯 ' + task.title : '🏆 מקצועני בלאגן'; document.getElementById('task-help').textContent = task ? task.help : 'כל בונוסי החדר הושלמו'; document.getElementById('task-progress').textContent = `${completed}/3`; const card = document.getElementById('task-card'); card.classList.toggle('complete', !task); card.hidden = false; clearTimeout(this.taskTimer); this.taskTimer = setTimeout(() => { card.hidden = true; }, 4500); }
 progress() {
  const g = this.game, p = g.physics.player.position; this.metrics.chain = Math.max(this.metrics.chain, g.combo);
  for (const current of this.tasks) if (!current.done && this.metrics[current.key] >= current.goal) { current.done = true; g.score += 75; this.popup('+75 משימה!', p, 'mint'); g.audio.play('task'); g.input.haptic([15, 30, 15]); g.ui.toast('בונוס: ' + current.title + ' ✓'); }
 }
 updatePointer() {
  const g = this.game, p = g.physics.player.position; let goal = g.goCouch ? g.level.couch : null, dist = Infinity;
  if (!goal) for (const o of g.objects.items) if (o.plant && !o.broken) { const d = Math.hypot(o.position.x - p.x, o.position.z - p.z) + Math.max(0, o.position.y - p.y) * 2; if (d < dist) { dist = d; goal = o.position; } }
  const el = this.pointer; if (!goal || (this.target?.object && this.target.object.position === goal)) { el.hidden = true; return; } el.hidden = false; dist = Math.hypot(goal.x - p.x, goal.z - p.z);
  const v = this.project({ x: goal.x, y: (goal.y || 0) + .7, z: goal.z }); let sx = v.x, sy = v.y; const behind = v.z > 1; if (behind) { sx = -sx; sy = -sy; }
  const onscreen = !behind && Math.abs(sx) < .82 && Math.abs(sy) < .7; if (onscreen) { el.hidden = true; return; }
  if (!onscreen) { const m = Math.max(Math.abs(sx) / .84, Math.abs(sy) / .62, 1e-4); sx /= m; sy /= m; if (behind && Math.abs(sy) < .62 && Math.abs(sx) < .84) { sy = -.62; } }
  el.style.left = (sx * .5 + .5) * innerWidth + 'px'; el.style.top = (-sy * .5 + .5) * innerHeight + 'px';
  el.querySelector('.arrow').style.transform = onscreen ? 'rotate(90deg)' : `rotate(${Math.atan2(-sy, sx)}rad)`;
  el.querySelector('span').textContent = (g.goCouch ? 'לספה' : goal.y - p.y > 1.3 ? 'עציץ למעלה' : 'עציץ') + ` · ${Math.max(1, Math.round(dist))} מ׳`;
 }
 updateRings() {
  const g = this.game, p = g.physics.player.position; let i = 0; const pulse = 1 + Math.sin(performance.now() * .006) * .04;
  const put = (x, y, z, r, color, show) => { this.point.set(x, y, z); this.scale.setScalar(show ? r * pulse : 0); this.matrix.compose(this.point, this.rotation, this.scale); this.rings.setMatrixAt(i, this.matrix); this.rings.setColorAt(i++, this.color.set(color)); };
  for (const v of g.enemies.vacuums) put(v.position.x, .02, v.position.z, .91, v.stun > 0 ? '#85efbe' : g.enemies.distracted > 0 ? '#e9d27b' : '#ff6d5a', Math.hypot(v.position.x - p.x, v.position.z - p.z) < 5);
  for (const s of g.enemies.sprayers) put(s.x, .02, s.z, 1.35, s.warning ? '#ff5f4a' : '#8edee5', s.cooldown <= 0 && Math.hypot(s.x - p.x, s.z - p.z) < 4);
  for (const z of g.level.climbs) put(z.x, .02, z.z, .56, '#6fe3c1', Math.hypot(z.x - p.x, z.z - p.z) < 4 && p.y < z.y - .2 && g.physics.player.id === 'latifa');
  for (const z of g.level.boosts) put(z.x, .02, z.z, .85, '#ffd166', Math.hypot(z.x - p.x, z.z - p.z) < 4 && p.y < 1.1 && g.physics.player.id === 'latifa');
  if (i === 0) put(0, -50, 0, 0, '#000', false);
  this.rings.instanceMatrix.needsUpdate = true; if (this.rings.instanceColor) this.rings.instanceColor.needsUpdate = true;
 }
}

// ---------------------------------------------------------------- main game
const COMBO_WORDS = { 3: 'בלאגן!', 5: 'הרס טוטאלי!', 7: 'אסון טבע!', 10: 'חתולי אפוקליפסה!' };
class Game {
 constructor(view, ui) {
  this.view = view; this.ui = ui; this.audio = new AudioSystem(); this.save = new SaveData(t => ui.toast(t)); this.quality = new Quality(view); this.state = 'loading'; this.index = 0; this.loading = false; this.contextLost = false; this.debug = new URLSearchParams(location.search).has('debug');
  this.accumulator = 0; this.last = performance.now(); this.fps = 0; this.frames = 0; this.frameElapsed = 0; this.maxCalls = 0; this.uiClock = 0; this.switchCooldown = 0; this.renderPosition = new THREE.Vector3(); this.cutLook = new THREE.Vector3(); this.cutPosition = new THREE.Vector3(); this.hitStop = 0; this.pendingPaw = 0; this.clock = 0; this.hud = {};
  this.input = new Input(document.getElementById('game'), () => this.togglePause(), () => this.audio.unlock()); this.input.enabled = false; this.bind(); this.applySettings();
 }
 applySettings() { const s = this.save.data.settings; this.quality.setMode(s.quality); this.audio.setVolume(s.volume); this.audio.setMusic(s.music); this.input.vibration = s.vibration; this.input.sensitivity = s.sensitivity; const $ = id => document.getElementById(id); $('quality').value = s.quality; $('vibration').checked = s.vibration; $('volume').value = s.volume; $('music').checked = s.music; $('sensitivity').value = s.sensitivity; $('autocam').checked = s.autoCam; }
 bind() {
  const $ = id => document.getElementById(id); const s = () => this.save.data.settings;
  $('play').onclick = () => { this.audio.unlock(); this.audio.play('click'); this.start(Math.min(4, this.save.data.unlocked - 1)); };
  $('level-menu').onclick = () => this.showLevels(); $('closet-menu').onclick = () => this.showCloset(); $('settings-menu').onclick = () => this.settings('home'); $('pause-settings').onclick = () => this.settings('pause'); $('settings-back').onclick = () => this.setState(this.settingsReturn || 'home');
  $('quality').onchange = e => { s().quality = e.target.value; this.quality.setMode(e.target.value); this.save.write(); };
  $('vibration').onchange = e => { this.input.vibration = e.target.checked; s().vibration = e.target.checked; this.save.write(); };
  $('volume').oninput = e => { this.audio.unlock(); this.audio.setVolume(+e.target.value); s().volume = +e.target.value; this.save.write(); };
  $('music').onchange = e => { this.audio.unlock(); this.audio.setMusic(e.target.checked); s().music = e.target.checked; this.save.write(); };
  $('sensitivity').oninput = e => { this.input.sensitivity = +e.target.value; s().sensitivity = +e.target.value; this.save.write(); };
  $('autocam').onchange = e => { s().autoCam = e.target.checked; if (this.camera) this.camera.auto = e.target.checked; this.save.write(); };
  $('recenter').onclick = () => { this.camera.recenter(this.physics.player.facing); this.resume(); };
  $('pause-button').onclick = () => this.togglePause(); $('resume').onclick = () => this.resume(); $('restart').onclick = () => this.start(this.index); $('exit-menu').onclick = () => this.home(); $('retry-level').onclick = () => this.start(this.index); $('next-level').onclick = () => this.index < 4 ? this.start(this.index + 1) : this.home();
  document.querySelectorAll('[data-home]').forEach(b => b.onclick = () => this.home()); $('skip-story').onclick = () => this.finishStory(); $('next-line').onclick = () => this.advanceStory(); $('bubble').onclick = () => this.advanceStory();
  if (!document.documentElement.requestFullscreen) $('fullscreen').hidden = true; else $('fullscreen').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else { await document.documentElement.requestFullscreen(); try { await screen.orientation?.lock?.('landscape'); } catch { } } } catch { this.ui.toast('מסך מלא אינו זמין בדפדפן הזה.'); } };
  document.addEventListener('visibilitychange', () => { if (document.hidden) { this.backgroundPause(); this.audio.pause(); } this.last = performance.now(); this.accumulator = 0; }); window.addEventListener('blur', () => this.backgroundPause()); window.addEventListener('resize', () => { this.view.resize(); this.input.resetStick(); });
  const canvas = $('game'); canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.contextLost = true; this.backgroundPause(); this.ui.toast('התצוגה נותקה לרגע. ממתינים לחידוש שלה…'); }); canvas.addEventListener('webglcontextrestored', () => { this.contextLost = false; this.view.resize(); this.ui.toast('התצוגה חזרה. אפשר להמשיך.'); });
 }
 setState(state) { this.state = state; this.input.enabled = state === 'play'; this.input.clear(); this.accumulator = 0; this.last = performance.now(); this.ui.screen(state); if (state === 'play' && this.index === 4) document.getElementById('minimap').hidden = false; if (state === 'play') this.hud = {}; }
 home() {
  this.setState('home'); this.view.dim(1); for (const c of this.cats || []) c.root.visible = true;
  const d = this.save.data; document.getElementById('home-stars').textContent = d.stars.reduce((a, b) => a + b, 0); document.getElementById('home-fish').textContent = d.fish;
  document.getElementById('play').innerHTML = d.unlocked > 1 ? `▶ &nbsp;להמשיך: ${LEVELS[Math.min(4, d.unlocked - 1)].name}` : '▶ &nbsp;יאללה בלאגן';
 }
 settings(from) { this.settingsReturn = from; this.setState('settings'); this.audio.unlock(); }
 showLevels() { this.setState('levels'); const list = document.getElementById('level-list'); list.replaceChildren(); LEVELS.forEach((l, i) => { const b = document.createElement('button'); b.className = 'level-card'; b.disabled = i >= this.save.data.unlocked; const st = this.save.data.stars[i]; b.innerHTML = `<span class="room-icon" style="--c:${l.color}">${b.disabled ? '🔒' : l.icon}</span><span><strong>${i + 1}. ${l.name}</strong><small>${l.tag}${this.save.data.best[i] ? ' · שיא ' + this.save.data.best[i] : ''}</small></span><span class="level-stars">${b.disabled ? '<span class="lock">נעול</span>' : '<b>★</b>'.repeat(st) + '★'.repeat(3 - st)}</span>`; b.onclick = () => { this.audio.unlock(); this.audio.play('click'); this.start(i); }; list.append(b); }); }
 showCloset() { this.setState('closet'); document.getElementById('fish-balance').textContent = `🐟 ${this.save.data.fish} חטיפי דג`; const list = document.getElementById('collar-list'); list.replaceChildren(); const names = ['הקלאסיקה', 'כוכב הלילה', 'פעמון מנטה', 'סגול מלכותי'], costs = [0, 4, 8, 12], colors = ['#e04f4a', '#7cb8ef', '#6fd8b4', '#c99ae6']; names.forEach((name, i) => { const b = document.createElement('button'); b.className = 'collar-card' + (this.save.data.collar === i ? ' on' : ''); const owned = this.save.data.collars.includes(i); b.innerHTML = `<i class="collar-swatch" style="--swatch:${colors[i]}"></i><strong>${name}</strong><span>${this.save.data.collar === i ? '✓ נבחר' : owned ? 'לבחירה' : '🐟 ' + costs[i]}</span>`; b.onclick = () => { if (!this.save.buy(i, costs[i])) { this.ui.toast('עוד קצת חטיפי דג, והקולר שלכם.'); return; } this.cats.forEach(c => c.setCosmetic(i)); this.audio.play('fish'); this.showCloset(); }; list.append(b); }); }
 togglePause() { if (this.state === 'pause') { this.resume(); return; } if (!['play', 'cutscene'].includes(this.state)) return; this.resumeState = this.state; this.setState('pause'); document.getElementById('pause-reason').textContent = `${LEVELS[this.index].name} · ${this.score} נקודות כאוס`; const task = this.feel?.tasks.find(t => !t.done); document.getElementById('pause-task').textContent = task ? `🎯 בונוס הבא: ${task.title} — ${task.help}` : '🏆 כל הבונוסים הושלמו'; this.audio.pause(); }
 backgroundPause() { if (['play', 'cutscene'].includes(this.state)) { this.resumeState = this.state; this.setState('pause'); document.getElementById('pause-reason').textContent = 'המשחק הושהה בזמן שהיית מחוץ לחלון.'; } this.input.clear(); }
 resume() { if (this.contextLost) return; this.audio.unlock(); this.setState(this.resumeState || 'play'); }
 async load(index) {
  if (this.level) { disposeTree(this.level.root); this.physics.dispose(); } resetMaterials(); this.index = index; this.physics = new PhysicsWorld(); this.level = new HouseLevel(this.view.scene, this.physics, index); this.view.setMood(index);
  const lamp = this.level.lamps[0]; if (lamp) this.view.lamp.position.set(lamp.x, lamp.y, lamp.z);
  this.cats = [new Cat(this.level.root, 'latifa'), new Cat(this.level.root, 'pablo')]; this.cats.forEach(c => c.setCosmetic(this.save.data.collar));
  const p = this.level.spawn; this.physics.place(this.physics.cats[0], p.x - .35, p.z); this.physics.place(this.physics.cats[1], p.x + .85, p.z + .05); this.physics.cats.forEach(c => { c.invulnerable = 2; c.facing = Math.PI; });
  this.effects = new Effects(this.level.root, this.physics); this.objects = new Objects(this.level.root, this.physics, this.level.defs, this.effects, o => this.destroyed(o));
  this.enemies = new Enemies(this.level.root, this.physics, this.level, this.effects, this.audio, (t, c) => this.hurt(t, c), () => { this.remaining = Math.max(8, this.remaining - 12); this.ui.toast('התוכי התקשר! הם הקדימו ב־12 שניות.'); this.ui.flash(); });
  this.camera = new FollowCamera(this.view.camera, this.physics); this.camera.auto = this.save.data.settings.autoCam;
  this.score = 0; this.displayScore = 0; this.combo = 0; this.comboTime = 0; this.elapsed = 0; this.remaining = LEVELS[index].time; this.captures = 0; this.damage = 0; this.fishCount = 0; this.destroyedCount = 0; this.totalPlants = this.objects.plantsLeft; this.firstPaw = true; this.slow = 0; this.noise = 0; this.keyPlayed = false; this.goCouch = false; this.finished = false; this.switchCooldown = 0; this.missTime = -2; this.hitStop = 0; this.pendingPaw = 0; this.feel = new GameFeel(this);
  for (let i = 0; i < 35; i++) this.physics.world.step(this.physics.events); this.physics.events.drainContactForceEvents(() => { });
  this.objects.items.forEach(o => { if (o.body) o.position = { ...o.body.translation() }; if (o.fish && this.save.data.found.includes(o.id)) o.broken = true; }); this.objects.draw();
  this.cats.forEach((cat, i) => cat.update(0, this.physics.cats[i].position, this.physics.cats[i])); this.camera.update(1 / 60, this.physics.player); this.view.follow(new THREE.Vector3(p.x, 0, p.z));
  this.view.renderer.compile(this.view.scene, this.view.camera);
 }
 async start(index) {
  if (this.loading) return; this.loading = true; this.setState('loading'); this.ui.progress(15, 'מסדרים חדר שאפשר לבלגן…'); await new Promise(r => requestAnimationFrame(r));
  try {
   await this.load(index); this.ui.progress(90, 'כולם במקום. כמעט…'); this.audio.unlock(); this.loading = false;
   const intro = index === 0 ? [['האדם', 'יוצאים לסוף השבוע. בלי שטויות, כן?'], ['', 'הדלת נסגרת. שני זוגות עיניים נפתחות בחושך.'], ...LEVELS[index].intro] : LEVELS[index].intro;
   this.story(intro, () => { this.setState('play'); this.ui.showHint(index === 0 ? 'גוררים משמאל כדי לזוז · מחליקים על המסך לסיבוב · הכפתור הכתום = כפה' : index === 4 ? 'כל העציצים, ואז שניכם לספה שבסלון. המפה מראה מה נשאר.' : 'טבעת טורקיז: טיפוס · טבעת זהובה: הקפצה · אדום: סכנה', 5); }, index === 0 ? 'intro' : 'brief');
  } catch (error) { this.loading = false; window.showBootError(error); }
 }
 story(lines, done, type = 'brief') { this.storyData = { lines, done, type, index: 0, time: 0 }; this.setState('cutscene'); this.setStoryLine(); }
 setStoryLine() { const s = this.storyData; if (!s) return; const [speaker, text] = s.lines[s.index]; const sp = document.getElementById('speaker'); sp.textContent = speaker; sp.dataset.who = speaker === 'פאבלו' ? 'pablo' : speaker === 'לטיפה' ? 'latifa' : 'human'; const t = document.getElementById('subtitle-text'); t.textContent = text; const b = document.getElementById('bubble'); b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; s.time = 0; if (s.type === 'intro' && s.index === 1) this.audio.play('door'); if (s.type === 'key' && s.index === 0) this.audio.play('key'); if (s.type === 'final' && s.index === 0) this.audio.play('door'); if (speaker === 'לטיפה' || speaker === 'פאבלו') this.audio.play('meow'); }
 advanceStory() { if (this.state !== 'cutscene' || !this.storyData) return; this.storyData.index++; if (this.storyData.index >= this.storyData.lines.length) this.finishStory(); else this.setStoryLine(); }
 finishStory() { if (!this.storyData) return; const done = this.storyData.done; this.storyData = null; this.view.dim(1); this.level.doors.forEach(d => d.rotation.y = 0); this.level.humans.forEach(h => h.visible = false); this.camera.reset(); this.camera.recenter(this.physics.player.facing); done(); }
 updateStory(dt) {
  const s = this.storyData; if (!s) return; s.time += dt; const c = this.physics.player.position; const isDoor = s.type === 'key' || s.type === 'intro' && s.index === 0 || s.type === 'final' && s.index === 0;
  if (isDoor && this.level.doors[0]) { const d = this.level.doors[0].position; this.cutPosition.set(d.x + 2.6, 2.0, d.z + 4); this.cutLook.set(d.x + .8, 1.4, d.z); if (s.type === 'intro') this.level.doors[0].rotation.y = -1.3 * (1 - Math.min(1, s.time / 2)); else if (s.type === 'final') this.level.doors[0].rotation.y = -Math.min(1.4, s.time * .5); }
  else { const speaker = s.lines[s.index][0]; const focus = speaker === 'פאבלו' ? this.physics.cats[1].position : speaker === 'לטיפה' ? this.physics.cats[0].position : c; const angle = .25 + Math.sin(s.time * .3) * .12 + (s.index % 2 ? -.6 : .35); this.cutPosition.set(focus.x + Math.sin(angle) * 2.4, focus.y + .75, focus.z + Math.cos(angle) * 2.4); this.cutLook.set(focus.x, focus.y + .35, focus.z); }
  this.level.humans.forEach(h => { h.visible = s.type === 'intro' && s.index === 0 || s.type === 'final' && s.index === 0; const d = this.level.doors[0]?.position; if (d) h.position.z = s.type === 'intro' ? d.z + .45 - Math.min(1, s.time / 2) * .9 : d.z - .35 + Math.min(1, s.time / 2) * .9; });
  this.view.dim(s.type === 'intro' && s.index === 1 ? .06 : 1);
  this.view.camera.position.lerp(this.cutPosition, 1 - Math.exp(-4 * dt)); this.view.camera.lookAt(this.cutLook); this.view.follow(new THREE.Vector3(c.x, 0, c.z)); if (s.time > Math.max(2.8, s.lines[s.index][1].length * .06)) this.advanceStory();
 }
 addScore(base) { this.combo = this.comboTime > 0 ? this.combo + 1 : 1; this.comboTime = 3; const gained = Math.round(base * (1 + Math.min(8, this.combo - 1) * .25)); this.score += gained; if (COMBO_WORDS[this.combo]) { this.ui.callout(COMBO_WORDS[this.combo]); this.camera.shake = Math.max(this.camera.shake, .5); } if (this.combo > 1) { this.audio.play('combo'); const c = document.getElementById('combo'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); } return gained; }
 destroyed(o) {
  this.destroyedCount++; const st = styleOf(o.kind); const gained = this.addScore(st.score); this.feel?.popup('+' + gained, o.position); if (o.spawn.y > 1) this.feel?.event('high'); if (o.kind === 'hanging') this.feel?.event('hanging');
  this.audio.play(st.sound === 'paw' ? 'swipe' : st.sound); if (o.plant) this.audio.play('break'); this.input.haptic(o.plant ? 30 : 18); this.noise = 1.3; this.camera.shake = Math.max(this.camera.shake, o.plant ? .45 : .3); this.hitStop = o.plant ? .07 : .04;
  if (this.destroyedCount === 1) this.ui.callout('קראש!'); if (o.plant && this.objects.plantsLeft === 0) this.ui.callout('אין עוד עציצים!');
  for (const n of this.objects.items) { if (n === o || n.broken || !n.body) continue; const dx = n.position.x - o.position.x, dz = n.position.z - o.position.z, d = Math.hypot(dx, dz); if (d > .05 && d < 1.15) n.body.applyImpulse({ x: dx / d * .85, y: .22, z: dz / d * .85 }, true); }
 }
 hurt(text, caught = false) { const c = this.physics.player; if (c.invulnerable > 0 || this.state !== 'play') return; c.invulnerable = 2; c.flash = 2; this.damage++; this.comboTime = 0; this.combo = 0; c.health--; this.audio.play('hurt'); this.input.haptic([40, 30, 40]); this.ui.toast(text); this.ui.flash(); this.camera.shake = .6; this.effects.burst(c.position, '#e3cca0', 12); if (caught || c.health <= 0) { this.captures++; c.health = 3; const p = this.level.nearestCheckpoint(c.position); this.physics.place(c, p.x, p.z); c.invulnerable = 2.5; c.flash = 2.5; this.camera.reset(); } else { c.velocity.y = 3.3; c.grounded = false; } }
 paw() {
  const c = this.physics.player; if (c.pawCooldown > 0) return;
  c.pawCooldown = c.id === 'pablo' ? .42 : .26; c.attackTime = .3; this.audio.play('swipe');
  const target = this.feel.acquire();
  if (!target) {
   // pounce toward something a few steps away instead of whiffing
   const far = this.feel.acquire(3.4, .1);
   if (far && c.grounded) { const dx = far.position.x - c.position.x, dz = far.position.z - c.position.z, n = Math.hypot(dx, dz) || 1; c.dash = Math.min(.3, (n - 1.1) / 7.5); c.dashDir = { x: dx / n, z: dz / n }; c.facing = Math.atan2(dx, dz); this.pendingPaw = c.dash + .15; c.pawCooldown = 0; c.attackTime = 0; this.effects.dust(c.position, .4); return; }
   if (this.elapsed - this.missTime > 1.2) { this.feel.popup('מתקרבים לחפץ', c.position, 'quiet'); this.missTime = this.elapsed; } return;
  }
  this.noise = 1; this.pendingPaw = 0;
  const o = target.object;
  if (o) {
   c.facing = Math.atan2(o.position.x - c.position.x, o.position.z - c.position.z);
   if (o.kind === 'cactus' && c.position.y - o.position.y < .75) { this.hurt('קוצים! קופצים לפני שמכים, או קוראים לפאבלו.'); return; }
   this.feel.event('paw'); this.objects.hit(o, c, c.id === 'pablo' ? 2.4 : 1.5); this.effects.burst(o.position, '#ffe3a1', 7, .6); this.audio.play('paw'); this.input.haptic(c.id === 'pablo' ? 22 : 12); this.camera.shake = Math.max(this.camera.shake, .2); this.hitStop = Math.max(this.hitStop, .03);
   if (this.firstPaw) { this.firstPaw = false; this.slow = .24; }
   return;
  }
  const z = target.zone;
  if (z) { z.hits++; this.effects.burst({ x: z.x, y: z.y, z: z.z }, z.kind === 'scratch' ? '#e2b783' : '#c6a474', 9, .6); this.audio.play('paw');
   if (z.kind === 'cabinet' || z.hits >= 4) { z.done = true; this.feel.event('zone'); const score = this.addScore(z.kind === 'scratch' ? 100 : 90); this.feel.popup('+' + score, { x: z.x, y: z.y, z: z.z }); this.ui.toast(z.kind === 'scratch' ? 'הספה קיבלה אופי.' : 'פתוח. כי ביקשנו יפה.'); if (z.kind === 'scratch') this.audio.play('purr'); else this.audio.play('door'); }
   else this.feel.popup(`${z.hits}/4`, { x: z.x, y: z.y, z: z.z }, 'mint');
  }
 }
 special() {
  const c = this.physics.player; if (c.specialCooldown > 0) return; const ability = this.feel.ability();
  if (c.id === 'pablo') { c.specialCooldown = 3.4; c.slam = true; c.climb = null; c.velocity.y = c.grounded ? 6 : -14; c.grounded = false; this.audio.play('meow'); return; }
  if (ability.type === 'climb') { c.climb = { ...ability.zone }; c.specialCooldown = 1.5; this.feel.event('climb'); this.feel.popup('מטפסים!', c.position, 'mint'); this.audio.play('paw'); }
  else if (ability.type === 'boost') { c.velocity.y = 10.4; c.grounded = false; c.jumpsLeft = 1; c.boosted = 2; c.specialCooldown = 3; this.physics.companion.attackTime = .3; this.feel.event('boost'); this.feel.popup('עבודת צוות!', c.position, 'mint'); this.effects.dust(c.position, 1); this.audio.play('jump'); }
  else { c.specialCooldown = 6; this.feel.event('distract'); this.enemies.distract(c.position); this.ui.toast('מיאו דרמטי! השואב מוסח ל־7 שניות.'); }
 }
 slam(c) { this.feel.event('slam'); this.feel.shock(c.position); this.audio.play('slam'); this.input.haptic(45); this.camera.shake = .9; this.noise = 2; this.hitStop = .08; this.effects.dust(c.position, 2); this.effects.burst(c.position, '#ccb283', 30, 2); for (const o of this.objects.items) if (!o.broken && !o.fish && Math.hypot(o.position.x - c.position.x, o.position.z - c.position.z) < 2.25 && Math.abs(o.position.y - c.position.y) < 1.6) this.objects.hit(o, c, 5); this.enemies.slam(c.position); for (const z of this.level.zones) if (z.kind === 'scratch' && !z.done && Math.hypot(z.x - c.position.x, z.z - c.position.z) < 2.3) { z.done = true; this.feel.event('zone'); this.addScore(100); } }
 land(c, v) { if (c !== this.physics.player) return; this.effects.dust(c.position, Math.min(1, -v / 12) * .7); if (-v > 7) { this.audio.play('land'); this.input.haptic(10); } }
 switchCat() { if (this.switchCooldown > 0) return; this.physics.active = 1 - this.physics.active; this.switchCooldown = .3; this.input.haptic(12); this.audio.play('meow'); this.feel.acquire(); this.hud = {}; this.effects.burst(this.physics.player.position, '#fff4d0', 10, .6); }
 simulate(dt) {
  this.elapsed += dt; this.remaining -= dt; this.comboTime = Math.max(0, this.comboTime - dt); if (this.comboTime === 0) this.combo = 0; this.noise = Math.max(0, this.noise - dt); this.switchCooldown = Math.max(0, this.switchCooldown - dt);
  const jumps = this.physics.player.jumps; this.physics.step(dt, this.input, this.camera.yaw, c => this.slam(c), (c, v) => this.land(c, v)); if (this.physics.player.jumps > jumps) { this.audio.play('jump'); this.input.haptic(8); if (this.physics.player.jumps - jumps && !this.physics.player.grounded && this.physics.player.airTime > .05) this.effects.burst(this.physics.player.position, '#ffffff', 8, .5, { drag: 3, grav: 0, size: .8 }); }
  this.objects.step(dt, this.quality.level); this.level.update(dt, this.clock); this.alert = this.enemies.update(dt, this.noise); this.effects.update(dt);
  const c = this.physics.player, p = c.position; for (const other of this.physics.cats) { if (other.position.y < -2) { const cp = this.level.nearestCheckpoint(other.position); this.physics.place(other, cp.x, cp.z); } }
  for (const o of this.objects.items) if (o.fish && !o.broken && Math.hypot(o.position.x - p.x, o.position.z - p.z) < .6 && Math.abs(o.position.y - p.y) < .8) { o.broken = true; if (this.save.fish(o.id)) { this.fishCount++; this.feel.event('fish'); this.feel.popup('+1 🐟', o.position, 'mint'); this.audio.play('fish'); this.effects.burst(o.position, '#efcf71', 12); } }
  for (const o of this.objects.items) if (o.kind === 'cactus' && !o.broken && Math.hypot(o.position.x - p.x, o.position.z - p.z) < .42 && p.y < o.position.y + .65) this.hurt('זה קקטוס. גם הקקטוס זוכר את זה.');
  this.feel.progress(); const follower = this.physics.companion; if (follower.grounded && p.y - follower.position.y > .5 && Math.hypot(p.x - follower.position.x, p.z - follower.position.z) < 3 && follower.specialCooldown <= 0) { follower.velocity.y = 6; follower.grounded = false; follower.specialCooldown = 1.5; }
 }
 checkGoals() {
  if (this.finished) return;
  if (this.index === 4 && !this.keyPlayed && (this.objects.plantsLeft <= 1 || this.remaining < 28)) { this.keyPlayed = true; this.remaining = Math.min(this.remaining, 28); this.story([['', 'המפתח מסתובב במנעול.'], ['לטיפה', this.objects.plantsLeft ? 'עציץ אחרון. ואז לספה. פנים תמימות!' : 'העציצים גמורים. לספה, מהר!']], () => this.setState('play'), 'key'); return; }
  if (this.objects.plantsLeft === 0 && this.score >= LEVELS[this.index].target) {
   if (this.index < 4) { this.win(); return; }
   if (!this.goCouch) { this.goCouch = true; this.ui.showHint('לספה בסלון! שניכם צריכים להיות עליה.', 30); this.audio.play('key'); }
   const s = this.level.couch; const c = this.physics.player, other = this.physics.companion; const onSofa = cat => Math.hypot(cat.position.x - s.x, cat.position.z - s.z) < 1.4 && cat.position.y > 1.1;
   if (onSofa(c) && Math.hypot(other.position.x - s.x, other.position.z - s.z) < 3) { other.climb = { x: s.x + (this.physics.active === 0 ? .5 : -.5), z: s.z + .05, y: 1.45 }; if (onSofa(other)) { other.climb = null; this.win(); return; } }
  }
  if (this.objects.plantsLeft === 0 && this.score < LEVELS[this.index].target && !this.needMoreHint) { this.needMoreHint = true; this.ui.showHint(`כל העציצים בחוץ! עוד ${LEVELS[this.index].target - this.score} נקודות כאוס — שברו עוד דברים.`, 6); }
  if (this.remaining <= 0) this.fail();
 }
 win() { this.finished = true; this.audio.play('win'); const stars = 1 + (this.score >= LEVELS[this.index].target * 1.2 ? 1 : 0) + (this.captures === 0 && this.damage <= 2 ? 1 : 0); this.save.complete(this.index, stars, this.score); this.result = { win: true, stars }; this.physics.cats.forEach(c => { c.velocity = { x: 0, y: 0, z: 0 }; c.speed = 0; c.facing = 0; c.invulnerable = 0; }); this.audio.play('purr'); const lines = [...LEVELS[this.index].report, ['דוח נזק', `${this.totalPlants} עציצים, ${this.destroyedCount} חפצים. הנזק: ${this.score} נקודות.`]]; this.story(lines, () => this.summary(), this.index === 4 ? 'final' : 'report'); }
 fail() { this.finished = true; this.result = { win: false, stars: 0 }; this.audio.play('door'); if (this.level.doors[0]) this.level.doors[0].rotation.y = -1.3; this.summary(); }
 summary() {
  this.setState('summary'); const win = this.result.win, $ = id => document.getElementById(id);
  $('summary-eyebrow').textContent = win ? `דוח נזק · ${LEVELS[this.index].name}` : 'המפתח היה מהיר יותר'; $('summary-title').textContent = win ? (this.index === 4 ? 'אנחנו? ישנו כל הזמן.' : 'החדר קיבל טיפול.') : 'תפסו אותנו על חם.';
  [...$('stars').children].forEach((s, i) => { s.className = ''; if (win && i < this.result.stars) setTimeout(() => { s.className = 'on'; this.audio.play('fish'); }, 350 + i * 300); });
  $('summary-text').textContent = win ? (this.index === 4 ? 'הבית הפוך. החתולים חמודים. התיק נסגר.' : 'העציצים בחוץ. אתם בדרך לחדר הבא.') : 'ההתקדמות הקודמת נשמרה. עוד ניסיון?';
  const end = this.score, t0 = performance.now(); const tick = () => { const k = Math.min(1, (performance.now() - t0) / 900); $('result-score').textContent = Math.round(end * (1 - Math.pow(1 - k, 3))); if (k < 1 && this.state === 'summary') requestAnimationFrame(tick); }; tick();
  $('result-broken').textContent = this.destroyedCount; $('result-fish').textContent = this.fishCount; const next = $('next-level'); next.hidden = !win; next.textContent = this.index === 4 ? 'בחזרה לבית' : 'לחדר הבא ›';
 }
 setText(id, v) { if (this.hud[id] !== v) { this.hud[id] = v; document.getElementById(id).textContent = v; } }
 updateHUD() {
  const p = this.physics.player, config = LEVELS[this.index], $ = id => document.getElementById(id), look = CAT_LOOK[p.id], other = CAT_LOOK[p.id === 'latifa' ? 'pablo' : 'latifa'], collar = this.save.data.collar;
  if (this.hud.cat !== p.id) { this.hud.cat = p.id; $('cat-name').textContent = p.id === 'latifa' ? 'לטיפה' : 'פאבלו'; const pt = $('hud-portrait'); pt.style.setProperty('--collar', look.collar[collar]); pt.style.setProperty('--eye', look.eye); const sp = $('switch-portrait'); sp.style.setProperty('--collar', other.collar[collar]); sp.style.setProperty('--eye', other.eye); $('switch-label').textContent = p.id === 'latifa' ? 'פאבלו' : 'לטיפה'; $('controls').dataset.cat = p.id; }
  if (this.hud.health !== p.health) { this.hud.health = p.health; $('health').innerHTML = [0, 1, 2].map(i => `<span class="${i < p.health ? '' : 'off'}">♥</span>`).join(''); }
  this.setText('plants-count', this.goCouch ? 'לספה!' : `${this.totalPlants - this.objects.plantsLeft}/${this.totalPlants}`);
  this.displayScore = Math.abs(this.displayScore - this.score) < 1 ? this.score : this.displayScore + (this.score - this.displayScore) * .35;
  this.setText('chaos-score', `${Math.round(this.displayScore)}/${config.target}`);
  const max = config.target * 1.2; $('chaos-fill').style.width = Math.min(100, this.score / max * 100) + '%'; $('tick1').classList.toggle('lit', this.score >= config.target); $('tick2').classList.toggle('lit', this.score >= max);
  const time = Math.max(0, Math.ceil(this.remaining)); this.setText('time-left', `${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`); $('timer').classList.toggle('low', time < 30);
  const combo = $('combo'); combo.hidden = this.combo < 2 || this.comboTime <= 0; this.setText('combo-value', `×${(1 + Math.min(8, this.combo - 1) * .25).toFixed(2).replace(/\.?0+$/, '')}`); $('combo-life').style.width = (this.comboTime / 3 * 100) + '%';
  this.setText('cooldown', p.specialCooldown > .2 ? String(Math.ceil(p.specialCooldown)) : ''); const maxCd = p.id === 'pablo' ? 3.4 : 6; $('special').style.setProperty('--cd', Math.min(1, p.specialCooldown / maxCd).toFixed(3));
  $('alert').hidden = this.alert < .45;
  const ability = this.feel.ability(), target = this.feel.target;
  this.setText('special-label', ability.label); $('special').setAttribute('aria-label', ability.label + ' — ' + ability.detail);
  $('paw').classList.toggle('ready', !!target); this.setText('paw-label', target?.kind === 'scratch' ? 'לשרוט' : target?.kind === 'cabinet' ? 'לפתוח' : 'כפה');
  this.setText('jump-label', p.id === 'latifa' && !p.grounded && p.jumpsLeft > 0 ? 'שוב!' : 'קפיצה');
  const hint = this.goCouch ? 'שניכם לספה בסלון!' : ability.type === 'climb' || ability.type === 'boost' ? '✦ ' + ability.detail : target?.kind === 'cactus' ? 'קופצים ומכים, או נחיתת בטן של פאבלו' : '';
  const ctx = $('context-hint'); ctx.hidden = !hint; this.setText('context-hint', hint); if (this.index === 4) this.drawMap();
 }
 drawMap() { const canvas = document.getElementById('minimap'), ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height; ctx.clearRect(0, 0, w, h); const at = p => ({ x: (p.x + 12) / 24 * (w - 12) + 6, y: (p.z + 10) / 20 * (h - 12) + 6 }); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.strokeRect(5, 5, w - 10, h - 10); ctx.beginPath(); ctx.moveTo(w / 2, 5); ctx.lineTo(w / 2, h - 5); ctx.moveTo(5, h / 2); ctx.lineTo(w - 5, h / 2); ctx.stroke(); for (const o of this.objects.items) if (o.plant && !o.broken) { const p = at(o.position); ctx.fillStyle = '#6fe3c1'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2); ctx.fill(); } if (this.goCouch) { const p = at(this.level.couch); ctx.fillStyle = '#ffd166'; ctx.fillRect(p.x - 5, p.y - 3, 10, 6); } this.physics.cats.forEach((c, i) => { const p = at(c.position); ctx.fillStyle = i === 0 ? '#ff8f76' : '#ffd166'; ctx.beginPath(); ctx.arc(p.x, p.y, i === this.physics.active ? 3.8 : 2.2, 0, Math.PI * 2); ctx.fill(); }); }
 groundUnder(p) { const hit = this.physics.world.castRay(new RAPIER.Ray({ x: p.x, y: p.y, z: p.z }, { x: 0, y: -1, z: 0 }), 8, true, RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC | RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC); return hit ? p.y - hit.timeOfImpact : 0; }
 frame(now) {
  requestAnimationFrame(t => this.frame(t)); const raw = (now - this.last) / 1000; this.last = now; if (document.hidden || this.contextLost || !this.level) return; const dt = Math.min(Math.max(raw, 0), .08); if (['pause', 'settings', 'levels', 'closet', 'loading'].includes(this.state)) return; this.clock += dt;
  if (this.state === 'play') {
   this.input.update(); const look = this.input.consumeLook(); this.camera.look(look.x, look.y);
   if (this.input.consume('switch')) this.switchCat(); if (this.input.consume('paw')) this.paw(); if (this.input.consume('special')) this.special();
   if (this.pendingPaw > 0) { this.pendingPaw -= dt; if (this.feel.acquire()) { this.physics.player.dash = 0; this.paw(); } }
   this.slow = Math.max(0, this.slow - dt); this.hitStop = Math.max(0, this.hitStop - dt);
   const simDt = dt * (this.hitStop > 0 ? .08 : this.slow > 0 ? .25 : 1); this.accumulator += simDt; let steps = 0; while (this.accumulator >= 1 / 60 && steps < 4) { this.simulate(1 / 60); this.accumulator -= 1 / 60; steps++; } if (this.accumulator >= 1 / 60) this.accumulator = 0;
   this.checkGoals(); this.objects.draw();
   this.cats.forEach((model, i) => { const c = this.physics.cats[i], alpha = this.accumulator * 60; this.renderPosition.set(lerp(c.previous.x, c.position.x, alpha), lerp(c.previous.y, c.position.y, alpha), lerp(c.previous.z, c.position.z, alpha)); c.groundY = this.groundUnder(c.position); model.update(simDt, this.renderPosition, c, i === this.physics.active ? this.feel.target?.position : null); });
   if (this.state === 'play') { this.camera.update(dt, this.physics.player); this.view.follow(this.renderPosition.set(this.physics.player.position.x, 0, this.physics.player.position.z)); this.feel.update(dt); }
   this.uiClock += dt; if (this.uiClock > .08 && this.state === 'play') { this.updateHUD(); this.uiClock = 0; }
  }
  else if (this.state === 'cutscene') { this.updateStory(dt); this.level.update(dt, this.clock); this.cats.forEach((cat, i) => { const c = this.physics.cats[i]; cat.update(dt, c.position, { ...c, invulnerable: 0, grounded: true, simTime: this.clock, speed: 0, groundY: this.groundUnder(c.position) }); }); }
  else if (this.state === 'home' || this.state === 'summary') { const p = this.level.spawn; const a = Math.sin(now * .00015) * .25; if (this.state === 'home') { this.view.camera.position.set(p.x + 1.7 + a, 1.25, p.z + 2.6); this.view.camera.lookAt(p.x + .6, .62, p.z); } this.level.update(dt, this.clock); this.cats.forEach((cat, i) => { const c = this.physics.cats[i]; cat.update(dt, c.position, { ...c, invulnerable: 0, grounded: true, simTime: this.clock + i * 1.3, speed: 0, facing: .35 - i * .3, attackTime: 0, slam: false }, this.state === 'home' ? this.view.camera.position : null); }); }
  this.audio.update(); this.view.draw(); if (this.state === 'play') this.quality.sample(raw);
  this.maxCalls = Math.max(this.maxCalls, this.view.renderer.info.render.calls); this.frames++; this.frameElapsed += raw; if (this.frameElapsed >= .5) { this.fps = this.frames / this.frameElapsed; this.frames = 0; this.frameElapsed = 0; if (this.debug) { const d = document.getElementById('diagnostics'); d.hidden = false; d.textContent = `${this.fps.toFixed(0)} FPS | ${this.view.renderer.info.render.calls} calls\n${this.view.renderer.info.render.triangles} tris | DPR ${this.view.renderer.getPixelRatio()} | Q${this.quality.level}\n${this.state} | bodies ${this.physics.world.bodies.len()}`; } }
 }
 snapshot() { return { state: this.state, level: this.index + 1, cat: this.physics.player.id, position: { ...this.physics.player.position }, grounded: this.physics.player.grounded, jumps: this.physics.player.jumps, health: this.physics.player.health, plantsLeft: this.objects.plantsLeft, totalPlants: this.totalPlants, score: this.score, target: LEVELS[this.index].target, time: this.remaining, goCouch: this.goCouch, captures: this.captures, damage: this.damage, destroyed: this.destroyedCount, stars: this.save.data.stars, unlocked: this.save.data.unlocked, fish: this.save.data.fish, fps: this.fps, drawCalls: this.view.renderer.info.render.calls, maxDrawCalls: this.maxCalls, bodies: this.physics.world.bodies.len(), quality: this.quality.level }; }
}
async function boot() {
 const started = performance.now(), ui = new UI(); ui.progress(18, 'מכינים קצת בלאגן…'); await RAPIER.init(); ui.progress(45, 'לטיפה ופאבלו כבר בדרך…');
 let saved = 'auto'; try { saved = JSON.parse(localStorage.getItem('mae-house-chaos-v1') || '{}')?.settings?.quality || 'auto'; } catch { }
 const weak = saved === 'low' || (saved === 'auto' && ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3));
 const view = new GameRenderer(document.getElementById('game'), weak); const game = new Game(view, ui); await game.load(0); ui.progress(85, 'מדליקים אור בבית…'); view.draw();
 const delay = Math.max(0, 1600 - (performance.now() - started)); await new Promise(r => setTimeout(r, delay)); const splash = document.getElementById('splash'); splash.style.opacity = '0'; setTimeout(() => splash.hidden = true, 500);
 ui.progress(100, 'הבית שלכם.'); window.gameReady = true; game.home(); window.catGame = { snapshot: () => game.snapshot() }; if (game.debug) window.catGame.debug = game; game.last = performance.now(); requestAnimationFrame(t => game.frame(t));
}
boot().catch(error => window.showBootError(error));
