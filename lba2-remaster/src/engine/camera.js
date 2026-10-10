// Follow camera. "classic" reproduces LBA2's high, fixed isometric-style
// view; "modern" is a free third-person orbit with terrain avoidance.
import * as THREE from 'three';
import { clamp, damp, dampAngle } from './math.js';

export class CameraRig {
  constructor(camera, terrain, physics) {
    this.cam = camera;
    this.terrain = terrain;
    this.physics = physics;
    this.occDist = 99;
    this.mode = 'modern';
    this.yaw = Math.PI * 0.85;
    this.pitch = 0.42;
    this.dist = 10;
    this.target = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.shakeT = 0;
    this.idleT = 0;
    this.override = null; // {pos, look} for cutscenes
  }

  setMode(m) { this.mode = m; }

  occluded(t, cp, sp) {
    if (!this.physics) return this.dist;
    const P = this.physics;
    for (let d = 1.2; d <= this.dist; d += 0.5) {
      const x = t.x + Math.sin(this.yaw) * cp * d;
      const z = t.z + Math.cos(this.yaw) * cp * d;
      const y = t.y + 1.4 + sp * d;
      for (const c of P.near(x, z)) {
        if (!c.enabled || c.top < y || c.bottom > y) continue;
        if (c.type === 'cyl') {
          if (Math.hypot(x - c.x, z - c.z) < (c.camR ?? c.r) + 0.3) return Math.max(2, d - 0.6);
        } else if (P._inside(c, x, z, 0.3)) return Math.max(2, d - 0.6);
      }
    }
    return this.dist;
  }
  shake(s = 0.35) { this.shakeT = Math.max(this.shakeT, s); }

  forwardYaw() { return this.yaw; }

  update(dt, focus, heroAngle, moving, input) {
    const cam = this.cam;
    if (this.override) {
      cam.position.lerp(this.override.pos, 1 - Math.exp(-dt * 2));
      this.look.lerp(this.override.look, 1 - Math.exp(-dt * 3));
      cam.lookAt(this.look);
      return;
    }
    const classic = this.mode === 'classic';
    if (classic) {
      this.yaw = dampAngle(this.yaw, Math.PI * 0.75, 3, dt);
      this.pitch = damp(this.pitch, 0.68, 3, dt);
      this.dist = damp(this.dist, 26, 3, dt);
      cam.fov = damp(cam.fov, 32, 3, dt);
    } else {
      const d = input ? input.camera() : { dx: 0, dy: 0 };
      this.yaw -= d.dx;
      this.pitch = clamp(this.pitch + d.dy, 0.08, 1.2);
      if (d.dx !== 0 || d.dy !== 0) this.idleT = 0; else this.idleT += dt;
      // gentle auto-follow behind the hero while moving
      if (moving && this.idleT > 1.5) this.yaw = dampAngle(this.yaw, heroAngle + Math.PI, 0.7, dt);
      this.dist = damp(this.dist, 9.5, 3, dt);
      cam.fov = damp(cam.fov, 55, 3, dt);
    }
    cam.updateProjectionMatrix();
    this.target.lerp(focus, 1 - Math.exp(-dt * 10));
    const t = this.target;
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    let dist = this.dist;
    if (!classic) {
      // pull in when a wall, house or tree sits between the hero and the camera
      const want = this.occluded(t, cp, sp);
      this.occDist = want < this.occDist ? want : damp(this.occDist, want, 2, dt);
      dist = Math.min(dist, this.occDist);
    }
    let x = t.x + Math.sin(this.yaw) * cp * dist;
    let z = t.z + Math.cos(this.yaw) * cp * dist;
    let y = t.y + 1.4 + sp * dist;
    if (!classic) {
      // keep the camera above the ground between it and the hero
      for (let k = 0.3; k <= 1.0001; k += 0.35) {
        const px = t.x + (x - t.x) * k, pz = t.z + (z - t.z) * k;
        const gh = this.terrain.heightAt(px, pz) + 0.8;
        const ly = t.y + 1.4 + (y - t.y - 1.4) * k;
        if (gh > ly) y += (gh - ly) / k;
      }
      y = Math.max(y, 0.8);
    }
    cam.position.set(x, y, z);
    this.look.set(t.x, t.y + 1.3, t.z);
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const s = this.shakeT * 0.6;
      cam.position.x += (Math.random() - 0.5) * s;
      cam.position.y += (Math.random() - 0.5) * s;
    }
    cam.lookAt(this.look);
  }
}
