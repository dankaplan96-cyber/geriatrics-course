// Heightfield terrain. Gameplay height queries interpolate the exact same
// triangles that are rendered, so feet never float or sink.
import * as THREE from 'three';

export class Terrain {
  constructor({ size, segs, heightFn, colorFn }) {
    this.size = size;
    this.segs = segs;
    this.half = size / 2;
    this.step = size / segs;
    const n = segs + 1;
    this.heights = new Float32Array(n * n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        this.heights[j * n + i] = heightFn(-this.half + i * this.step, -this.half + j * this.step);
      }
    }
    this.mesh = this._build(colorFn);
    this.heightTexture = this._heightTexture();
  }

  _h(i, j) {
    const n = this.segs + 1;
    i = Math.max(0, Math.min(this.segs, i));
    j = Math.max(0, Math.min(this.segs, j));
    return this.heights[j * n + i];
  }

  heightAt(x, z) {
    const gx = (x + this.half) / this.step;
    const gz = (z + this.half) / this.step;
    const i = Math.floor(gx), j = Math.floor(gz);
    const fx = gx - i, fz = gz - j;
    const h00 = this._h(i, j), h10 = this._h(i + 1, j), h01 = this._h(i, j + 1), h11 = this._h(i + 1, j + 1);
    // Triangles split along the (1,0)-(0,1) diagonal, matching _build().
    if (fx + fz < 1) return h00 + (h10 - h00) * fx + (h01 - h00) * fz;
    return h11 + (h01 - h11) * (1 - fx) + (h10 - h11) * (1 - fz);
  }

  slopeAt(x, z) {
    const e = this.step;
    const dx = this.heightAt(x + e, z) - this.heightAt(x - e, z);
    const dz = this.heightAt(x, z + e) - this.heightAt(x, z - e);
    return Math.hypot(dx, dz) / (2 * e);
  }

  _build(colorFn) {
    const n = this.segs + 1;
    const pos = new Float32Array(n * n * 3);
    const col = new Float32Array(n * n * 3);
    const c = new THREE.Color();
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        const x = -this.half + i * this.step, z = -this.half + j * this.step;
        const h = this.heights[k];
        pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
        const slope = Math.hypot(this._h(i + 1, j) - this._h(i - 1, j), this._h(i, j + 1) - this._h(i, j - 1)) / (2 * this.step);
        colorFn(x, z, h, slope, c);
        col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
      }
    }
    const idx = new Uint32Array(this.segs * this.segs * 6);
    let p = 0;
    for (let j = 0; j < this.segs; j++) {
      for (let i = 0; i < this.segs; i++) {
        const a = j * n + i, b = a + 1, d = a + n, e = d + 1;
        idx[p++] = a; idx[p++] = d; idx[p++] = b;
        idx[p++] = e; idx[p++] = b; idx[p++] = d;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.name = 'terrain';
    return mesh;
  }

  // Heights packed into an 8-bit texture (range -10..20m) for the water shader's shore foam.
  _heightTexture() {
    const n = this.segs + 1;
    const data = new Uint8Array(n * n);
    for (let k = 0; k < n * n; k++) data[k] = Math.max(0, Math.min(255, Math.round(((this.heights[k] + 10) / 30) * 255)));
    const tex = new THREE.DataTexture(data, n, n, THREE.RedFormat, THREE.UnsignedByteType);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }
}
