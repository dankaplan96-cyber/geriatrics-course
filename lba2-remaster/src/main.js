// Sunshard Odyssey – game orchestration: states, quest logic, saves, UI.
import * as THREE from 'three';
import { Renderer } from './engine/renderer.js';
import { Environment } from './engine/environment.js';
import { AudioEngine } from './engine/audio.js';
import { Input } from './engine/input.js';
import { CameraRig } from './engine/camera.js';
import { lerp, angleDiff, smoothstep } from './engine/math.js';
import { buildWorld, POI } from './game/world.js';
import { Hero, NPC, Sentinel, MagicBall, Bolts, Pickups, Particles } from './game/actors.js';
import { HUD } from './game/hud.js';
import { t, setLang } from './game/i18n.js';

const SAVE_KEY = 'sunshard_save_v1';
const SET_KEY = 'sunshard_settings_v1';
const BOOT_KEY = 'sunshard_boot';
const $ = (s) => document.querySelector(s);
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

// ----------------------------------------------------------- actor defs
const NPCS = [
  { id: 'sage', name: 'n_sage', x: POI.sage.x, z: POI.sage.z, angle: Math.PI, look: { tunic: '#5b3f8f', robe: '#5b3f8f', beard: '#e8e8e8', hair: '#e8e8e8', staff: true, skin: '#e6b993' } },
  { id: 'pippa', name: 'n_pippa', x: POI.village.x + 7, z: POI.village.z + 2.7, angle: 0, look: { tunic: '#e58a3a', pants: '#6a4a8a', ears: '#f4e9dc', apron: '#ffffff', skin: '#f4e9dc', hair: '#f4e9dc' } },
  { id: 'doran', name: 'n_doran', x: 0, z: 0, pier: true, angle: -Math.PI / 2, look: { tunic: '#2f8a6a', pants: '#3a4a6a', hat: '#d8b94a', beard: '#7a5a3a', skin: '#d9a57e' } },
  {
    id: 'nilo', name: 'n_nilo', x: POI.village.x - 4, z: POI.village.z + 4, look: { tunic: '#e0c03a', pants: '#3a5a9a', scale: 0.72, hair: '#c06a2a' },
    track: [{ op: 'goto', x: POI.village.x - 4, z: POI.village.z + 4 }, { op: 'wait', t: 2 }, { op: 'goto', x: POI.village.x + 3, z: POI.village.z + 6 }, { op: 'wait', t: 1.5 }, { op: 'goto', x: POI.village.x + 2, z: POI.village.z - 4 }, { op: 'wait', t: 2 }, { op: 'loop' }],
  },
];

const C = POI.camp;
const ENEMIES = [
  { id: 'camp1', group: 'camp', x: C.x - 9, z: C.z + 1, track: [{ op: 'goto', x: C.x - 9, z: C.z + 1 }, { op: 'wait', t: 2 }, { op: 'goto', x: C.x - 2, z: C.z - 9 }, { op: 'wait', t: 2 }, { op: 'loop' }] },
  { id: 'camp2', group: 'camp', x: C.x + 9, z: C.z + 1, track: [{ op: 'goto', x: C.x + 9, z: C.z + 1 }, { op: 'wait', t: 1.5 }, { op: 'goto', x: C.x + 3, z: C.z + 10 }, { op: 'wait', t: 2.5 }, { op: 'loop' }] },
  { id: 'camp3', group: 'camp', x: C.x + 1, z: C.z + 4, angle: Math.PI, track: [{ op: 'face', a: Math.PI }, { op: 'wait', t: 3 }, { op: 'face', a: Math.PI / 2 }, { op: 'wait', t: 2.5 }, { op: 'face', a: -Math.PI / 2 }, { op: 'wait', t: 2.5 }, { op: 'loop' }] },
  { id: 'road1', group: 'road', x: -6, z: 30, track: [{ op: 'goto', x: -6, z: 30 }, { op: 'wait', t: 2 }, { op: 'goto', x: -24, z: 14 }, { op: 'wait', t: 2 }, { op: 'loop' }] },
  { id: 'forest1', group: 'forest', x: 22, z: -18, track: [{ op: 'goto', x: 22, z: -18 }, { op: 'wait', t: 2 }, { op: 'goto', x: 22, z: 2 }, { op: 'wait', t: 2 }, { op: 'loop' }] },
  { id: 'fort1', group: 'fort', x: POI.fort.x - POI.fort.half - 5, z: POI.fort.z - 6, track: [{ op: 'goto', x: POI.fort.x - POI.fort.half - 5, z: POI.fort.z - 6 }, { op: 'wait', t: 2 }, { op: 'goto', x: POI.fort.x - POI.fort.half - 5, z: POI.fort.z + 6 }, { op: 'wait', t: 2 }, { op: 'loop' }] },
  { id: 'boss', group: 'boss', boss: true, x: POI.fort.x + 4, z: POI.fort.z, angle: -Math.PI / 2 },
];

const COINS = [
  [-36, -8], [-46, 3], [-30, -24], [-20, -45], [-8, -62], [-26, 22], [-14, 34], [6, -8], [18, -8], [26, -14],
  [40, 18], [30, 42], [-58, -20], [-60, 12], [10, -40], [-30, -60], [64, 6], [20, 70], [-40, 40], [44, -36],
];

const SHOP = [
  { id: 'magic', key: 'shop_magic' },
  { id: 'potion', key: 'shop_potion', price: 6 },
  { id: 'flask', key: 'shop_flask', price: 5 },
  { id: 'clover', key: 'shop_clover', price: 22 },
];

// ----------------------------------------------------------- game
class Game {
  constructor() {
    this.settings = { lang: 'he', controls: 'modern', camera: 'modern', visual: '2026', quality: 'high', music: 0.55, sfx: 0.8, ...store.get(SET_KEY) };
    if (!store.get(SET_KEY) && !navigator.language.startsWith('he')) this.settings.lang = 'en';
    setLang(this.settings.lang);

    this.renderer = new Renderer($('#game'));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 2500);
    this.world = buildWorld(this.scene);
    this.terrain = this.world.terrain;
    this.physics = this.world.physics;
    this.env = new Environment(this.scene, this.terrain);
    this.renderer.setup(this.scene, this.camera);
    this.audio = new AudioEngine();
    this.env.onThunder = () => this.audio.play('thunder');
    this.input = new Input(this.renderer.canvas);
    this.camRig = new CameraRig(this.camera, this.terrain, this.physics);
    this.particles = new Particles(this.scene);
    this.pickups = new Pickups(this);
    this.bolts = new Bolts(this);
    this.ball = new MagicBall(this);
    this.hud = new HUD(this);
    this.hud.buildMapImage(this.terrain);

    this.state = 'loading';
    this.time = 0;
    this.storm = 1;
    this.flags = {};
    this.killed = [];
    this.collected = [];
    this.searched = [];
    this.brokenCrates = [];
    this.lastSafe = { x: POI.start.x, z: POI.start.z };
    this.saveTimer = 0;
    this.combat = 0;

    this.spawnActors();
    this.applySettings();
    this.wireUI();
    this.last = performance.now();
    requestAnimationFrame((t2) => this.loop(t2));

    const boot = sessionStorage.getItem(BOOT_KEY);
    sessionStorage.removeItem(BOOT_KEY);
    $('#loading').classList.add('hidden');
    if (boot === 'new') this.startNew();
    else if (boot === 'continue' && store.get(SAVE_KEY)) this.startContinue();
    else this.showScreen('title');
    if (matchMedia('(pointer: coarse)').matches) this.touch = true;
  }

  // ------------------------------------------------ spawning
  spawnActors() {
    this.hero = new Hero(this, POI.start.x, POI.start.z);
    this.hero.angle = Math.PI * 0.6;
    this.npcs = NPCS.map((d) => {
      const def = { ...d };
      if (d.pier) { def.x = this.world.pierEnd.x; def.z = this.world.pierEnd.z; }
      return new NPC(this, def);
    });
    this.enemies = ENEMIES.map((d) => new Sentinel(this, d));
    COINS.forEach(([x, z], i) => this.pickups.spawn('coin', x, this.physics.groundAt(x, z) + 0.5, z, { id: 'c' + i }));
    const s = this.world.shard1Spot;
    this.pickups.spawn('shard', s.x, s.y, s.z, { id: 'shard0', idx: 0 });
  }

  // ------------------------------------------------ saves
  snapshot() {
    const h = this.hero;
    return {
      v: 1,
      hero: { x: this.lastSafe.x, z: this.lastSafe.z, hp: Math.max(h.hp, 4), mp: h.mp, magicLevel: h.magicLevel, clovers: h.clovers, coins: h.coins, hasKey: h.hasKey, shards: h.shards, behaviour: h.behaviour },
      flags: this.flags, killed: this.killed, collected: this.collected, searched: this.searched, crates: this.brokenCrates,
    };
  }
  save(toast = true) {
    if (this.hero.dead) return;
    store.set(SAVE_KEY, this.snapshot());
    if (toast) this.hud.toast('toast_saved');
  }
  applySave(s) {
    const h = this.hero;
    Object.assign(h, { hp: s.hero.hp, mp: s.hero.mp, magicLevel: s.hero.magicLevel, clovers: s.hero.clovers, coins: s.hero.coins, hasKey: s.hero.hasKey, shards: [...s.hero.shards] });
    h.pos.set(s.hero.x, this.physics.groundAt(s.hero.x, s.hero.z), s.hero.z);
    h.behaviour = s.hero.behaviour || 'normal';
    this.lastSafe = { x: s.hero.x, z: s.hero.z };
    this.flags = s.flags || {};
    this.killed = s.killed || [];
    this.collected = s.collected || [];
    this.searched = s.searched || [];
    this.brokenCrates = s.crates || [];
    for (const e of this.enemies) if (this.killed.includes(e.id)) { e.state = 'dead'; e.deadT = 99; e.rig.root.visible = false; }
    for (const p of [...this.pickups.list]) if (p.id && this.collected.includes(p.id)) { this.scene.remove(p.mesh); this.pickups.list.splice(this.pickups.list.indexOf(p), 1); }
    this.brokenCrates.forEach((i) => this.breakCrate(this.world.crates[i], true));
    if (this.flags.target) this.hitTarget(true);
    if (this.flags.chest) { this.world.chest.open = true; this.world.chest.openT = 1; }
    if (this.flags.gate) { this.world.gate.open = true; this.world.gate.t = 1; this.world.gate.c.enabled = false; }
    if (this.flags.bossDead && !h.shards[2] && !this.collected.includes('shard2')) {
      const A = this.world.arena;
      this.pickups.spawn('shard', A.x, this.physics.groundAt(A.x, A.z) + 1.2, A.z, { id: 'shard2', idx: 2 });
    }
    if (this.flags.ending) { this.storm = 0; this.world.lighthouse.power = 1; this.audio.setMood('calm'); }
  }

  // ------------------------------------------------ flow
  startNew() {
    store.del(SAVE_KEY);
    this.beginPlay();
    this.hud.say('', [t('intro')], () => this.setState('play'));
    this.setState('dialog');
  }
  startContinue() {
    const s = store.get(SAVE_KEY);
    if (s) this.applySave(s);
    this.beginPlay();
    this.setState('play');
  }
  beginPlay() {
    this.audio.init();
    this.hideScreens();
    this.hud.show(true);
    this.hud.behaviour(this.hero.behaviour);
    this.camRig.yaw = this.hero.angle + Math.PI;
    this.camRig.target.copy(this.hero.pos);
    this.camRig.override = null;
    $('#touch').classList.toggle('hidden', !this.touch);
    this.updateObjective();
  }
  reloadInto(mode) {
    sessionStorage.setItem(BOOT_KEY, mode);
    $('#fade').classList.add('on');
    setTimeout(() => location.reload(), 500);
  }
  setState(s) { this.state = s; }
  gameOver() {
    this.setState('gameover');
    this.hud.show(false);
    this.showScreen('gameover');
  }

  // ------------------------------------------------ UI
  showScreen(id) {
    this.hideScreens();
    $('#' + id).classList.remove('hidden');
    if (id === 'title') $('#btn-continue').disabled = !store.get(SAVE_KEY);
    if (id === 'settings') this.syncSettingsUI();
    this.screen = id;
    this.menuSel = 0;
    this.focusMenu();
  }
  hideScreens() { document.querySelectorAll('.screen').forEach((e) => { if (e.id !== 'loading') e.classList.add('hidden'); }); this.screen = null; }
  menuButtons() { return this.screen ? [...document.querySelectorAll(`#${this.screen} .menu button:not(:disabled)`)] : []; }
  focusMenu() { this.menuButtons().forEach((b, i) => b.classList.toggle('sel', i === this.menuSel)); }

  wireUI() {
    document.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      this.audio.init();
      if (b.dataset.act) { this.audio.play('select'); this.act(b.dataset.act); }
      if (b.dataset.lang) { this.settings.lang = b.dataset.lang; this.applySettings(); }
      const seg = b.closest('.seg');
      if (seg && b.dataset.v) { this.settings[seg.dataset.setting] = b.dataset.v; this.applySettings(); this.syncSettingsUI(); }
    });
    document.querySelectorAll('[data-range]').forEach((r) => r.addEventListener('input', () => { this.settings[r.dataset.range] = +r.value; this.applySettings(); }));
    $('#pausebtn').addEventListener('click', () => this.pause());
  }

  act(a) {
    switch (a) {
      case 'continue': this.startContinue(); break;
      case 'new': if (this.dirty) this.reloadInto('new'); else this.startNew(); break;
      case 'settings': this.prevScreen = this.screen; this.showScreen('settings'); break;
      case 'controls': this.prevScreen = this.screen; this.showScreen('controls'); break;
      case 'back': this.showScreen(this.prevScreen || 'title'); break;
      case 'resume': this.hideScreens(); this.setState('play'); break;
      case 'quit': this.save(false); this.reloadInto('title'); break;
      case 'retry': this.reloadInto(store.get(SAVE_KEY) ? 'continue' : 'new'); break;
      case 'explore': this.hideScreens(); this.hud.show(true); this.camRig.override = null; this.setState('play'); this.updateObjective(); break;
    }
  }

  pause() {
    if (this.state !== 'play') return;
    this.setState('pause');
    this.showScreen('pause');
  }

  syncSettingsUI() {
    document.querySelectorAll('.seg').forEach((s) => s.querySelectorAll('button').forEach((b) => b.classList.toggle('on', String(this.settings[s.dataset.setting]) === b.dataset.v)));
    document.querySelectorAll('[data-range]').forEach((r) => { r.value = this.settings[r.dataset.range]; });
  }

  applySettings() {
    const s = this.settings;
    setLang(s.lang);
    document.documentElement.lang = s.lang;
    document.documentElement.dir = s.lang === 'he' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = t(e.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach((e) => { e.innerHTML = t(e.dataset.i18nHtml); });
    document.querySelectorAll('.langs button').forEach((b) => b.classList.toggle('sel', b.dataset.lang === s.lang));
    this.hud.refreshText();
    this.renderer.setQuality(s.quality);
    this.renderer.setRetro(s.visual === '1997');
    this.camRig.setMode(s.camera);
    this.audio.vol.music = s.music;
    this.audio.vol.sfx = s.sfx;
    this.audio.applyVolumes();
    if (this.hero) this.updateObjective();
    store.set(SET_KEY, s);
  }

  // ------------------------------------------------ quest
  updateObjective() {
    const h = this.hero, f = this.flags;
    const n = h.shards.filter(Boolean).length;
    let html;
    if (f.ending) html = `<b>${t('obj_done')}</b>`;
    else if (!f.talkedSage) html = `<b>${t('obj_sage')}</b>`;
    else if (n === 3) html = `<b>${t('obj_return')}</b>`;
    else {
      html = `<b>${t('obj_shards', { n })}</b>` + ['obj_s1', 'obj_s2', 'obj_s3'].map((k, i) => `<span class="s ${h.shards[i] ? 'ok' : ''}">◆ ${t(k)}</span>`).join('');
    }
    this.hud.objective(html);
  }

  mapMarkers() {
    const m = [];
    const f = this.flags, h = this.hero;
    const label = (k) => t(k);
    m.push({ x: POI.village.x, z: POI.village.z, color: '#fff', r: 3, label: label('sign_village').split('·')[0].trim() });
    for (const n of this.npcs) m.push({ x: n.pos.x, z: n.pos.z, color: '#5ab0ff', r: 3.5, label: n.def.id === 'sage' ? t('n_sage') : null });
    const gold = '#ffcf4a';
    if (!f.talkedSage || (h.shards.every(Boolean) && !f.ending)) m.push({ x: POI.sage.x, z: POI.sage.z, kind: 'star', color: gold, r: 8, edge: true });
    if (f.talkedSage) {
      if (!h.shards[0]) m.push({ x: POI.plateau.x, z: POI.plateau.z, kind: 'star', color: gold, r: 7, edge: true, label: t('obj_s1') });
      if (!h.shards[1]) m.push({ x: POI.chest.x, z: POI.chest.z, kind: 'star', color: gold, r: 7, edge: true, label: t('obj_s2') });
      if (!h.shards[2]) m.push({ x: POI.fort.x, z: POI.fort.z, kind: 'star', color: gold, r: 7, edge: true, label: t('obj_s3') });
    }
    for (const e of this.enemies) if (e.alive) m.push({ x: e.pos.x, z: e.pos.z, color: e.state === 'chase' ? '#ff3a2a' : '#c0464a', r: e.boss ? 5 : 3, minimapOnly: true });
    return m;
  }

  // ------------------------------------------------ interaction
  findInteractable() {
    const h = this.hero, W = this.world;
    let best = null, bd = 1e9;
    const consider = (d, max, o) => { if (d < max && d < bd) { bd = d; best = o; } };
    const dist = (x, z) => Math.hypot(h.pos.x - x, h.pos.z - z);
    for (const n of this.npcs) consider(dist(n.pos.x, n.pos.z), 2.6, { kind: 'npc', npc: n, label: n.def.id === 'pippa' ? 'p_shop' : 'p_talk' });
    for (const s of W.signs) consider(dist(s.x, s.z), 2.0, { kind: 'sign', sign: s, label: 'p_read' });
    if (!W.chest.open) consider(dist(W.chest.x, W.chest.z), 2.2, { kind: 'chest', label: 'p_open' });
    if (!W.gate.open) consider(dist(W.gate.x, W.gate.z), 3.0, { kind: 'gate', label: 'p_gate' });
    for (const s of W.searchSpots) if (!this.searched.includes(s.id)) consider(dist(s.x, s.z), s.r, { kind: 'search', spot: s, label: 'p_search' });
    return best;
  }

  tryInteract() {
    const it = this.findInteractable();
    if (!it) return;
    const h = this.hero, W = this.world;
    if (it.kind === 'npc') this.talkTo(it.npc);
    else if (it.kind === 'sign') this.say('', [t(it.sign.key)]);
    else if (it.kind === 'chest') {
      W.chest.open = true;
      this.flags.chest = true;
      this.audio.play('chest');
      this.alertGroup('camp', h.pos, 0.6);
      const k = W.chest;
      this.pickups.spawn('shard', k.x, this.physics.groundAt(k.x, k.z) + 1.4, k.z, { id: 'shard1', idx: 1, pop: true });
      h.hasKey = true;
      this.hud.toast('toast_key');
      this.say('n_hero', t('d_shard2'));
    } else if (it.kind === 'gate') {
      if (!h.hasKey) { this.audio.play('deny'); this.say('', [t('gate_locked')]); return; }
      W.gate.open = true; W.gate.c.enabled = false;
      this.flags.gate = true;
      this.audio.play('door');
      this.camRig.shake(0.5);
      this.hud.toast('toast_gate_open');
      this.save(false);
    } else if (it.kind === 'search') {
      this.searched.push(it.spot.id);
      const s = it.spot, y = this.physics.groundAt(s.x, s.z) + 1.2;
      if (s.reward === 'coins5') { for (let i = 0; i < 5; i++) this.pickups.spawn('coin', s.x, y, s.z, { pop: true, delay: 0 }); this.hud.toast('toast_coins', { n: 5 }); }
      if (s.reward === 'flask') { this.pickups.spawn('flask', s.x, y, s.z, { pop: true }); this.hud.toast('toast_flask'); }
      if (s.reward === 'clover') { this.pickups.spawn('clover', s.x, y, s.z, { pop: true }); this.hud.toast('toast_clover_found'); }
      this.audio.play('chest');
    }
  }

  say(name, lines, done) {
    this.setState('dialog');
    this.hud.prompt(null);
    this.hud.say(name, lines, () => { this.setState('play'); done?.(); });
  }

  talkTo(npc) {
    const id = npc.def.id, h = this.hero, f = this.flags;
    npc.talking = true;
    const end = () => { npc.talking = false; };
    if (id === 'sage') {
      const n = h.shards.filter(Boolean).length;
      if (f.ending) this.say('n_sage', t('d_sage_after'), end);
      else if (n === 3) this.say('n_sage', t('d_sage_done'), () => { end(); this.startEnding(); });
      else if (!f.talkedSage) this.say('n_sage', t('d_sage_1'), () => { end(); f.talkedSage = true; this.updateObjective(); this.save(); });
      else this.say('n_sage', t('d_sage_wait').map((l) => l.replace('{n}', n)), end);
    } else if (id === 'pippa') {
      this.say('n_pippa', t('d_pippa'), () => { end(); this.openShop(); });
    } else if (id === 'doran') this.say('n_doran', t('d_doran'), end);
    else if (id === 'nilo') this.say('n_nilo', t('d_nilo'), end);
  }

  openShop() {
    const h = this.hero;
    this.setState('shop');
    const items = () => SHOP.map((s) => {
      const it = { ...s };
      if (s.id === 'magic') { it.price = [0, 15, 30, 50][h.magicLevel] ?? 0; it.disabled = h.magicLevel >= 4; }
      if (s.id === 'clover') it.disabled = h.clovers >= 9;
      return it;
    });
    this.hud.openShop(items, (it) => {
      if (it.disabled) { this.hud.toast('shop_max'); this.audio.play('deny'); return; }
      if (h.coins < it.price) { this.hud.toast('shop_poor'); this.audio.play('deny'); return; }
      h.coins -= it.price;
      if (it.id === 'magic') { h.magicLevel++; h.mp = h.mpMax; this.hud.toast('toast_magic', { n: h.magicLevel }); }
      if (it.id === 'potion') h.hp = h.maxHp;
      if (it.id === 'flask') h.mp = h.mpMax;
      if (it.id === 'clover') h.clovers++;
      this.audio.play('heal');
      this.save(false);
    }, () => this.setState('play'));
  }

  // ------------------------------------------------ combat hooks
  meleeHit(hero, dmg, range) {
    let any = false;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = hero.distTo(e);
      if (d < range + e.radius && Math.abs(angleDiff(hero.angle, hero.angleTo(e))) < 0.95 && Math.abs(e.pos.y - hero.pos.y) < 1.5) {
        e.damage(dmg, hero.pos); any = true;
      }
    }
    for (const c of this.world.crates) {
      if (!c.alive) continue;
      const d = Math.hypot(c.x - hero.pos.x, c.z - hero.pos.z);
      const a = Math.atan2(c.x - hero.pos.x, c.z - hero.pos.z);
      if (d < range + 0.5 && Math.abs(angleDiff(hero.angle, a)) < 1) { this.breakCrate(c); any = true; }
    }
    if (any) this.camRig.shake(0.12);
  }

  ballHitTest(p) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const s = e.boss ? 1.45 : 1;
      if (Math.hypot(p.x - e.pos.x, p.z - e.pos.z) < 0.75 * s && p.y > e.pos.y && p.y < e.pos.y + 2 * s) {
        if (e.state === 'dormant') return true;
        e.damage(this.ball.damage, p);
        return true;
      }
    }
    for (const c of this.world.crates) if (c.alive && p.distanceTo(new THREE.Vector3(c.x, c.y, c.z)) < 0.9) { this.breakCrate(c); return true; }
    const T = this.world.target;
    if (!T.hit && Math.hypot(p.x - T.x, p.y - T.y, p.z - T.z) < 1.25) { this.hitTarget(); return true; }
    return false;
  }

  hitTarget(silent = false) {
    const T = this.world.target;
    T.hit = true;
    T.ringMat.color.set('#6aff7a'); T.ringMat.emissive.set('#20d040');
    this.flags.target = true;
    this.world.raiseStones(silent);
    if (!silent) {
      this.audio.play('rumble');
      this.camRig.shake(0.8);
      this.hud.toast('toast_stones');
      setTimeout(() => this.hud.toast('hint_jump'), 2400);
      this.save(false);
    }
  }

  breakCrate(c, silent = false) {
    if (!c || !c.alive) return;
    c.alive = false;
    c.c.enabled = false;
    this.scene.remove(c.mesh);
    const i = this.world.crates.indexOf(c);
    if (!this.brokenCrates.includes(i)) this.brokenCrates.push(i);
    if (silent) return;
    this.audio.play('break');
    this.particles.burst(c.x, c.y, c.z, '#c8904a', 24, 4);
    const r = Math.random();
    const type = r < 0.45 ? 'coin' : r < 0.7 ? 'heart' : r < 0.85 ? 'flask' : null;
    if (type) for (let k = 0; k < (type === 'coin' ? 2 : 1); k++) this.pickups.spawn(type, c.x, c.y + 0.4, c.z, { pop: true });
  }

  alertGroup(group, pos, chance = 1) {
    for (const e of this.enemies) if (e.group === group && e.alive && Math.random() < chance) e.alert(pos);
  }

  onEnemyKilled(e) {
    this.killed.push(e.id);
    const n = e.boss ? 6 : 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) this.pickups.spawn('coin', e.pos.x, e.pos.y + 1, e.pos.z, { pop: true });
    if (Math.random() < 0.35 || e.boss) this.pickups.spawn('heart', e.pos.x, e.pos.y + 1, e.pos.z, { pop: true });
    if (e.boss) {
      this.flags.bossDead = true;
      this.hud.boss(null);
      this.pickups.spawn('shard', e.pos.x, e.pos.y + 1.5, e.pos.z, { id: 'shard2', idx: 2, pop: true });
      this.camRig.shake(0.8);
      this.audio.play('victory');
    }
    this.save(false);
  }

  collect(p) {
    const h = this.hero;
    if (p.id) this.collected.push(p.id);
    switch (p.type) {
      case 'coin': h.coins++; this.audio.play('coin'); break;
      case 'heart': h.hp = Math.min(h.maxHp, h.hp + 3); this.audio.play('heal'); break;
      case 'flask': h.mp = h.mpMax; this.audio.play('heal'); break;
      case 'clover': h.clovers = Math.min(9, h.clovers + 1); this.audio.play('heal'); break;
      case 'shard':
        h.shards[p.idx] = true;
        this.audio.play('shard');
        this.hud.toast('toast_shard');
        this.camRig.shake(0.2);
        this.updateObjective();
        this.save(false);
        break;
    }
    this.particles.burst(p.pos.x, p.pos.y, p.pos.z, p.type === 'coin' ? '#ffd23a' : p.type === 'shard' ? '#fff0a0' : '#ffffff', p.type === 'shard' ? 40 : 10, p.type === 'shard' ? 5 : 2.5);
  }

  // ------------------------------------------------ zones
  onZoneEnter(z) {
    const h = this.hero;
    if (z.type === 'checkpoint') {
      this.lastSafe = { x: h.pos.x, z: h.pos.z };
      if (this.saveTimer <= 0) { this.save(true); this.saveTimer = 20; }
    } else if (z.type === 'arena') {
      const boss = this.enemies.find((e) => e.boss);
      if (boss && boss.state === 'dormant') {
        this.say('boss_name', t('d_boss'), () => {
          boss.state = 'chase';
          boss.alert(h.pos);
          this.hud.boss(boss.hp / boss.maxHp);
        });
      }
    } else if (z.type === 'hint' && !this.flags.target) this.hud.toast('hint_target');
  }

  // ------------------------------------------------ ending
  startEnding() {
    this.setState('cutscene');
    this.hud.show(false);
    this.flags.ending = true;
    this.cut = 0;
    const L = POI.lighthouse;
    const g = this.terrain.heightAt(L.x, L.z);
    this.camRig.override = { pos: new THREE.Vector3(L.x - 26, g + 14, L.z + 30), look: new THREE.Vector3(L.x, g + 12, L.z) };
    this.audio.play('rumble');
    this.save(false);
  }
  updateCutscene(dt) {
    this.cut += dt;
    const L = POI.lighthouse;
    const g = this.terrain.heightAt(L.x, L.z);
    const a = 2.2 + this.cut * 0.12;
    this.camRig.override.pos.set(L.x + Math.cos(a) * 34, g + 12 + this.cut * 0.5, L.z + Math.sin(a) * 34);
    this.world.lighthouse.power = smoothstep(1.5, 4, this.cut);
    this.storm = 1 - smoothstep(3.5, 11, this.cut);
    if (this.cut > 4 && this.audio.mood !== 'calm') { this.audio.setMood('calm'); this.audio.play('victory'); }
    for (const n of this.npcs) n.forceAnim = this.cut > 5 ? 'cheer' : null;
    this.hero.rig.play(this.cut > 5 ? 'cheer' : 'idle');
    this.hero.rig.update(dt, 0);
    if (this.cut > 12.5 && this.state === 'cutscene') { this.setState('ending'); this.showScreen('ending'); for (const n of this.npcs) n.forceAnim = null; }
  }

  // ------------------------------------------------ main loop
  loop(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.testFreeze) this.frame(dt, true);
    requestAnimationFrame((t2) => this.loop(t2));
  }

  // Deterministic stepping for automated tests: game.step(seconds).
  step(seconds, dt = 1 / 60) {
    for (let t = 0; t < seconds; t += dt) this.frame(dt, false);
  }

  frame(dt, render) {
    this.time += dt;
    const input = this.input;
    input.update();

    if (input.pressed('retro')) { this.settings.visual = this.settings.visual === '1997' ? '2026' : '1997'; this.applySettings(); }

    switch (this.state) {
      case 'title': case 'loading': this.titleCamera(dt); this.menuNav(); break;
      case 'play': this.updatePlay(dt); break;
      case 'dialog':
        this.hud.updateDialog(dt);
        if (input.pressed('interact') || input.pressed('action') || input.pressed('click')) this.hud.advance();
        this.hero.rig.play('idle'); this.hero.rig.update(dt, 0); this.hero.sync();
        for (const n of this.npcs) n.update(dt);
        this.camRig.update(dt, this.hero.pos, this.hero.angle, false, input);
        break;
      case 'shop': this.hud.shopNav(input); this.camRig.update(dt, this.hero.pos, this.hero.angle, false, null); break;
      case 'map':
        this.hud.drawHolomap(this.time);
        if (input.pressed('map') || input.pressed('pause')) { $('#holomap').classList.add('hidden'); this.setState('play'); }
        break;
      case 'pause': case 'gameover': case 'ending':
        this.menuNav();
        if (this.state === 'pause' && input.pressed('pause')) this.act('resume');
        if (this.state === 'ending') this.camRig.update(dt, this.hero.pos, 0, false, null);
        break;
      case 'cutscene': this.updateCutscene(dt); this.camRig.update(dt, this.hero.pos, 0, false, null); for (const n of this.npcs) n.update(dt); break;
    }

    this.world.storm = this.storm;
    this.env.setStorm(this.storm);
    this.audio.setStorm(this.storm);
    this.env.update(dt, this.camera, this.state === 'title' ? new THREE.Vector3(0, 0, 0) : this.hero.pos);
    this.world.update(dt, this.time);
    this.particles.update(dt);
    if (this.state !== 'title') this.pickups.update(this.state === 'play' ? dt : 0);
    if (render) this.renderer.render();
  }

  menuNav() {
    const btns = this.menuButtons();
    if (!btns.length) return;
    const i = this.input;
    if (i.pressed('down')) { this.menuSel = (this.menuSel + 1) % btns.length; this.focusMenu(); this.audio.play('blip'); }
    if (i.pressed('up')) { this.menuSel = (this.menuSel + btns.length - 1) % btns.length; this.focusMenu(); this.audio.play('blip'); }
    if (i.pressed('interact') || i.pressed('action')) { this.audio.init(); btns[this.menuSel]?.click(); }
  }

  titleCamera(dt) {
    const a = this.time * 0.05 + 2.2;
    this.camRig.override = { pos: new THREE.Vector3(Math.cos(a) * 120, 45, Math.sin(a) * 120), look: new THREE.Vector3(0, 4, 0) };
    if (!this._titleInit) { this._titleInit = true; this.camera.position.copy(this.camRig.override.pos); }
    this.camRig.update(dt, this.hero.pos, 0, false, null);
    for (const n of this.npcs) n.update(dt);
  }

  updatePlay(dt) {
    const input = this.input, h = this.hero;
    this.dirty = true;
    if (input.pressed('pause')) { this.pause(); return; }
    if (input.pressed('map')) { this.setState('map'); $('#holomap').classList.remove('hidden'); return; }
    this.saveTimer -= dt;

    h.update(dt, input);
    if (this.state !== 'play') return;
    for (const n of this.npcs) n.update(dt);
    for (const e of this.enemies) e.update(dt);
    this.ball.update(dt);
    this.bolts.update(dt);
    this.world.zones.update(h.pos, { enter: (z) => this.onZoneEnter(z) });

    // remember a safe spot to return to after a fall
    this.safeT = (this.safeT || 0) - dt;
    if (this.safeT <= 0 && h.onGround && h.pos.y > 0.4) { this.safeT = 1; this.lastSafe = { x: h.pos.x, z: h.pos.z }; }

    // adaptive combat music
    const chasing = this.enemies.some((e) => e.alive && e.state === 'chase');
    this.combat = lerp(this.combat, chasing ? 1 : 0, 1 - Math.exp(-dt * 1.5));
    this.audio.setCombat(this.combat);

    const it = this.findInteractable();
    this.hud.prompt(it ? t(it.label) : null);
    this.hud.stats(h);
    this.hud.drawMinimap();
    this.camRig.update(dt, h.pos, h.angle, h.speed > 0.5, input);
  }
}

window.game = new Game();
