// Procedural low-poly character rigs + a pose-blending animator.
// LBA2 used hierarchical bodies driven by keyframed animations ("ANIM" files);
// here each animation is a function producing target joint angles,
// and joints ease toward them, which gives smooth blending for free.
import * as THREE from 'three';
import { damp } from './math.js';

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05, ...opts }));
  return matCache.get(key);
}

function part(geo, material, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function joint(parent, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

/**
 * opts: skin, tunic, pants, hair, boots, scale, ponytail, ears, helmet, visor, beard, robe, staff, gun, hat, apron, pads
 */
export function createHumanoid(opts = {}) {
  const o = {
    skin: '#f0c49b', tunic: '#2d6fdc', pants: '#efe6cf', hair: '#3b2414', boots: '#5a3b22', scale: 1, ...opts,
  };
  const root = new THREE.Group();
  const body = joint(root, 0, 0, 0);
  const hips = joint(body, 0, 0.95, 0);

  const tunicMat = mat(o.tunic);
  const skinMat = mat(o.skin);
  const pantsMat = mat(o.pants);

  // torso
  const torso = joint(hips, 0, 0.05, 0);
  part(new THREE.CapsuleGeometry(0.27, 0.42, 4, 10), tunicMat, torso, 0, 0.32, 0);
  if (o.pads) {
    part(new THREE.SphereGeometry(0.16, 10, 8), mat(o.pads, { metalness: 0.5, roughness: 0.35 }), torso, 0.3, 0.6, 0);
    part(new THREE.SphereGeometry(0.16, 10, 8), mat(o.pads, { metalness: 0.5, roughness: 0.35 }), torso, -0.3, 0.6, 0);
  }
  part(new THREE.CylinderGeometry(0.285, 0.285, 0.08, 14), mat('#6b4423'), torso, 0, 0.08, 0); // belt
  if (o.apron) part(new THREE.BoxGeometry(0.4, 0.5, 0.05), mat(o.apron), torso, 0, 0.15, 0.25);

  // head
  const neck = joint(torso, 0, 0.78, 0);
  const head = joint(neck, 0, 0.18, 0);
  part(new THREE.SphereGeometry(0.25, 16, 12), skinMat, head, 0, 0, 0);
  const eyeMat = mat('#1a1a22', { roughness: 0.2 });
  part(new THREE.SphereGeometry(0.035, 8, 6), eyeMat, head, 0.09, 0.03, 0.22);
  part(new THREE.SphereGeometry(0.035, 8, 6), eyeMat, head, -0.09, 0.03, 0.22);
  part(new THREE.SphereGeometry(0.05, 8, 6), skinMat, head, 0, -0.03, 0.25); // nose
  const hairMat = mat(o.hair);
  if (!o.helmet && !o.hat) {
    const cap = part(new THREE.SphereGeometry(0.262, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat, head, 0, 0.02, -0.01);
    cap.rotation.x = -0.25;
  }
  let tail = null;
  if (o.ponytail) {
    tail = joint(head, 0, 0.12, -0.2);
    let seg = tail;
    const segs = [];
    for (let i = 0; i < 4; i++) {
      const s = joint(seg, 0, i === 0 ? 0 : -0.13, 0);
      part(new THREE.SphereGeometry(0.075 - i * 0.012, 8, 6), hairMat, s, 0, -0.06, 0);
      segs.push(s);
      seg = s;
    }
    tail.segs = segs;
  }
  if (o.ears) {
    const earMat = mat(o.ears);
    for (const sx of [-1, 1]) {
      const e = joint(head, sx * 0.1, 0.2, -0.02);
      e.rotation.z = -sx * 0.15;
      const m = part(new THREE.CapsuleGeometry(0.06, 0.38, 4, 8), earMat, e, 0, 0.22, 0);
      m.scale.z = 0.5;
    }
  }
  if (o.helmet) {
    part(new THREE.SphereGeometry(0.29, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), mat(o.helmet, { metalness: 0.6, roughness: 0.35 }), head, 0, 0.02, 0);
    if (o.visor) {
      const v = part(new THREE.BoxGeometry(0.32, 0.06, 0.06), new THREE.MeshStandardMaterial({ color: o.visor, emissive: o.visor, emissiveIntensity: 3 }), head, 0, 0.04, 0.24);
      v.castShadow = false;
      root.userData.visor = v;
    }
  }
  if (o.hat) {
    part(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 16), mat(o.hat), head, 0, 0.14, 0);
    part(new THREE.CylinderGeometry(0.2, 0.25, 0.22, 14), mat(o.hat), head, 0, 0.25, 0);
  }
  if (o.beard) {
    const b = part(new THREE.ConeGeometry(0.2, 0.55, 10), mat(o.beard), head, 0, -0.32, 0.12);
    b.rotation.x = Math.PI + 0.25;
  }

  // arms
  const mkArm = (sx) => {
    const sh = joint(torso, sx * 0.36, 0.6, 0);
    part(new THREE.CapsuleGeometry(0.075, 0.24, 4, 8), tunicMat, sh, 0, -0.16, 0);
    const el = joint(sh, 0, -0.34, 0);
    part(new THREE.CapsuleGeometry(0.065, 0.22, 4, 8), skinMat, el, 0, -0.14, 0);
    const hand = joint(el, 0, -0.3, 0);
    part(new THREE.SphereGeometry(0.075, 8, 6), skinMat, hand, 0, 0, 0);
    return { sh, el, hand };
  };
  const armL = mkArm(1), armR = mkArm(-1);
  if (o.gun) {
    const g = part(new THREE.BoxGeometry(0.1, 0.12, 0.55), mat('#2a2d33', { metalness: 0.7, roughness: 0.3 }), armR.hand, 0, -0.02, 0.18);
    root.userData.muzzle = joint(armR.hand, 0, 0, 0.5);
    g.castShadow = true;
  }
  if (o.staff) {
    const s = part(new THREE.CylinderGeometry(0.04, 0.04, 2.0, 8), mat('#7a5230'), armL.hand, 0, 0.3, 0);
    s.rotation.x = 0.1;
    const orb = part(new THREE.SphereGeometry(0.12, 12, 10), new THREE.MeshStandardMaterial({ color: '#9ff', emissive: '#4cf', emissiveIntensity: 2.5 }), armL.hand, 0, 1.33, 0.1);
    orb.castShadow = false;
  }

  // legs
  const mkLeg = (sx) => {
    const hip = joint(hips, sx * 0.14, 0, 0);
    part(new THREE.CapsuleGeometry(0.095, 0.3, 4, 8), pantsMat, hip, 0, -0.2, 0);
    const knee = joint(hip, 0, -0.44, 0);
    part(new THREE.CapsuleGeometry(0.085, 0.28, 4, 8), pantsMat, knee, 0, -0.18, 0);
    const foot = part(new THREE.BoxGeometry(0.16, 0.1, 0.3), mat(o.boots), knee, 0, -0.42, 0.06);
    return { hip, knee, foot };
  };
  const legL = mkLeg(1), legR = mkLeg(-1);
  if (o.robe) {
    legL.hip.visible = legR.hip.visible = false;
    part(new THREE.ConeGeometry(0.48, 1.0, 14, 1, true), mat(o.robe, { side: THREE.DoubleSide }), hips, 0, -0.45, 0);
  }

  root.scale.setScalar(o.scale);
  const rig = new Rig(root, { body, hips, torso, neck, head, tail, armL, armR, legL, legR });
  return rig;
}

export class Rig {
  constructor(root, j) {
    this.root = root;
    this.j = j;
    this.phase = 0;
    this.t = 0;
    this.actionT = 0;
    this.anim = 'idle';
    this.flash = 0;
    this._mats = null;
  }

  play(anim) {
    if (this.anim !== anim) {
      this.anim = anim;
      this.actionT = 0;
    }
  }

  // Briefly tint the whole body (hit feedback).
  hitFlash() { this.flash = 1; }

  _collectMats() {
    this._mats = [];
    this.root.traverse((m) => {
      if (m.isMesh && m.material && !this._mats.includes(m.material)) {
        // clone so flashing one actor doesn't flash all
        m.material = m.material.clone();
        this._mats.push(m.material);
      }
    });
    this._baseEmissive = this._mats.map((m) => m.emissive.clone());
    this._baseIntensity = this._mats.map((m) => m.emissiveIntensity);
  }

  update(dt, speed = 0) {
    const j = this.j;
    this.t += dt;
    this.actionT += dt;
    const a = this.anim;
    const T = {}; // target rotations (x unless noted)
    let hipsY = 0.95, bodyRotX = 0, bodyRotZ = 0, torsoX = 0, torsoY = 0, headX = 0;

    const walkLike = a === 'walk' || a === 'run' || a === 'sneak';
    if (walkLike) {
      const freq = a === 'run' ? 2.0 : a === 'sneak' ? 1.0 : 1.55;
      this.phase += dt * Math.max(0.6, speed) * freq;
      const s = Math.sin(this.phase * 2.2);
      const c = Math.cos(this.phase * 2.2);
      const amp = a === 'run' ? 0.95 : a === 'sneak' ? 0.5 : 0.6;
      T.legL = s * amp; T.legR = -s * amp;
      T.kneeL = Math.max(0, -c) * amp * 1.3 + 0.1;
      T.kneeR = Math.max(0, c) * amp * 1.3 + 0.1;
      T.armL = -s * amp * 0.8; T.armR = s * amp * 0.8;
      T.elL = -0.3 - (a === 'run' ? 0.9 : 0.2); T.elR = T.elL;
      hipsY = 0.95 + Math.abs(c) * (a === 'run' ? 0.08 : 0.04);
      if (a === 'run') torsoX = 0.25;
      if (a === 'sneak') {
        hipsY = 0.72; torsoX = 0.45; headX = -0.35;
        T.armL = 0.9; T.armR = 0.9; T.elL = -1.1; T.elR = -1.1;
        T.kneeL += 0.6; T.kneeR += 0.6; T.legL -= 0.3; T.legR -= 0.3;
      }
    } else if (a === 'idle' || a === 'talk') {
      const b = Math.sin(this.t * 1.8);
      hipsY = 0.95 + b * 0.008;
      T.armL = 0.05 + b * 0.03; T.armR = 0.05 - b * 0.03;
      T.elL = -0.15; T.elR = -0.15;
      T.legL = 0; T.legR = 0; T.kneeL = 0.02; T.kneeR = 0.02;
      if (a === 'talk') { headX = Math.sin(this.t * 6) * 0.08; T.armR = -0.4 + Math.sin(this.t * 4) * 0.25; T.elR = -0.9; }
    } else if (a === 'hide') {
      hipsY = 0.5; torsoX = 0.7; headX = -0.4;
      T.legL = -1.4; T.legR = -1.4; T.kneeL = 2.2; T.kneeR = 2.2;
      T.armL = -0.5; T.armR = -0.5; T.elL = -1.6; T.elR = -1.6;
    } else if (a === 'jump' || a === 'fall') {
      T.legL = -0.9; T.legR = 0.3; T.kneeL = 1.3; T.kneeR = 0.5;
      T.armL = -2.4; T.armR = -2.2; T.elL = -0.3; T.elR = -0.3;
      torsoX = 0.15;
    } else if (a === 'punch' || a === 'punch2') {
      const r = a === 'punch';
      const k = Math.min(1, this.actionT / 0.09);
      torsoY = (r ? -0.5 : 0.5) * k;
      T.armR = r ? -1.55 * k : 0.3; T.elR = r ? -0.1 : -1.8;
      T.armL = r ? 0.3 : -1.55 * k; T.elL = r ? -1.8 : -0.1;
      T.legL = -0.3; T.legR = 0.3; T.kneeL = 0.3; T.kneeR = 0.2;
      hipsY = 0.9;
    } else if (a === 'kick') {
      const k = Math.min(1, this.actionT / 0.12);
      T.legR = -1.6 * k; T.kneeR = 0.15; T.legL = 0.2; T.kneeL = 0.3;
      T.armL = -0.8; T.armR = 0.6; T.elL = -1.2; T.elR = -1.0;
      torsoX = -0.3 * k;
    } else if (a === 'throw') {
      const k = this.actionT / 0.3;
      T.armR = k < 0.45 ? -2.8 : -1.2; T.elR = k < 0.45 ? -0.9 : 0;
      T.armL = 0.4; T.elL = -0.4;
      torsoY = k < 0.45 ? 0.4 : -0.35;
      T.legL = -0.3; T.legR = 0.3; T.kneeL = 0.2; T.kneeR = 0.1;
    } else if (a === 'shoot') {
      T.armR = -1.5; T.elR = 0; T.armL = -1.2; T.elL = -0.7; torsoY = 0.3;
    } else if (a === 'hurt') {
      torsoX = -0.5; headX = 0.3; T.armL = 0.7; T.armR = 0.7; T.elL = -0.8; T.elR = -0.8;
    } else if (a === 'dead') {
      bodyRotX = -Math.PI / 2; hipsY = 0.3;
      T.armL = -2.8; T.armR = -2.6;
    } else if (a === 'cheer') {
      const b = Math.abs(Math.sin(this.t * 6));
      hipsY = 0.95 + b * 0.15;
      T.armL = -2.9; T.armR = -2.9; T.elL = -0.2; T.elR = -0.2;
    }

    const R = 18;
    const set = (obj, key, v, axis = 'x') => { obj.rotation[axis] = damp(obj.rotation[axis], v ?? 0, R, dt); };
    set(j.legL.hip, 'legL', T.legL); set(j.legR.hip, 'legR', T.legR);
    set(j.legL.knee, 'kneeL', T.kneeL); set(j.legR.knee, 'kneeR', T.kneeR);
    set(j.armL.sh, 'armL', T.armL); set(j.armR.sh, 'armR', T.armR);
    set(j.armL.el, 'elL', T.elL); set(j.armR.el, 'elR', T.elR);
    j.hips.position.y = damp(j.hips.position.y, hipsY, R, dt);
    j.torso.rotation.x = damp(j.torso.rotation.x, torsoX, R, dt);
    j.torso.rotation.y = damp(j.torso.rotation.y, torsoY, R, dt);
    j.head.rotation.x = damp(j.head.rotation.x, headX, R, dt);
    j.body.rotation.x = damp(j.body.rotation.x, bodyRotX, 8, dt);
    j.body.rotation.z = damp(j.body.rotation.z, bodyRotZ, 8, dt);
    // arms hang slightly outward
    j.armL.sh.rotation.z = 0.08; j.armR.sh.rotation.z = -0.08;

    // ponytail secondary motion
    if (j.tail) {
      const sway = Math.sin(this.t * 3) * 0.1 + (speed > 0.1 ? 0.5 + Math.sin(this.phase * 4.4) * 0.15 : 0.15);
      j.tail.segs.forEach((s, i) => { s.rotation.x = damp(s.rotation.x, sway * (i + 1) * 0.35, 10, dt); });
    }

    if (this.flash > 0) {
      if (!this._mats) this._collectMats();
      this.flash = Math.max(0, this.flash - dt * 4);
      this._mats.forEach((m, i) => {
        m.emissive.copy(this._baseEmissive[i]).lerp(new THREE.Color(1, 1, 1), this.flash);
        m.emissiveIntensity = Math.max(this._baseIntensity[i], this.flash * 1.2);
      });
    }
  }
}
