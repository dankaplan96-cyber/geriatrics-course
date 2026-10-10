// Sky, sea, weather and lighting. One "storm" value (1 = tempest, 0 = clear
// sunny sky) drives all of it so the ending can blend smoothly to sunshine.
import * as THREE from 'three';
import { lerp } from './math.js';

const SKY_VS = `
varying vec3 vDir;
void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * 0.99999; }`;
const SKY_FS = `
uniform float uTime, uStorm, uFlash; uniform vec3 uSunDir;
varying vec3 vDir;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=.5; } return s; }
void main(){
  vec3 d = normalize(vDir);
  float y = max(d.y, -0.2);
  vec3 clearTop = vec3(0.16,0.38,0.85), clearHor = vec3(0.75,0.85,0.95);
  vec3 stormTop = vec3(0.10,0.12,0.17), stormHor = vec3(0.32,0.35,0.40);
  vec3 top = mix(clearTop, stormTop, uStorm), hor = mix(clearHor, stormHor, uStorm);
  vec3 col = mix(hor, top, pow(clamp(y,0.,1.), 0.55));
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  col += (1.0-uStorm) * (vec3(1.0,0.85,0.6)*pow(sd, 600.0)*20.0 + vec3(1.0,0.7,0.4)*pow(sd, 8.0)*0.35);
  // clouds
  vec2 uv = d.xz / (y + 0.15) * 1.4 + vec2(uTime*0.02*(1.0+uStorm*2.0), uTime*0.01);
  float c = fbm(uv);
  float cover = mix(0.62, 0.32, uStorm);
  float cl = smoothstep(cover, cover+0.25, c) * smoothstep(-0.05, 0.25, y);
  vec3 cloudCol = mix(vec3(1.0,0.97,0.94), vec3(0.2,0.22,0.27), uStorm);
  cloudCol += (1.0-uStorm) * vec3(1.0,0.8,0.6) * pow(sd,4.0)*0.4;
  col = mix(col, cloudCol, cl * 0.9);
  col += uFlash * vec3(0.7,0.75,1.0) * (0.5 + c);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const WATER_VS = `
uniform float uTime, uStorm;
varying vec3 vWorld; varying vec3 vNormal;
#include <fog_pars_vertex>
vec3 wave(vec2 p, vec2 dir, float amp, float len, float spd, inout vec3 nrm){
  float k = 6.2831/len; float f = k*(dot(dir,p) - spd*uTime);
  nrm.x -= dir.x * k * amp * cos(f); nrm.z -= dir.y * k * amp * cos(f);
  return vec3(0.0, amp*sin(f), 0.0);
}
void main(){
  vec4 wp = modelMatrix * vec4(position,1.0);
  float a = mix(0.12, 0.45, uStorm);
  vec3 n = vec3(0.0,1.0,0.0);
  vec3 off = wave(wp.xz, normalize(vec2(1.0,0.3)), a, 18.0, 3.0, n)
           + wave(wp.xz, normalize(vec2(-0.4,1.0)), a*0.6, 9.0, 2.2, n)
           + wave(wp.xz, normalize(vec2(0.7,-0.8)), a*0.35, 5.0, 1.6, n);
  wp.xyz += off;
  vWorld = wp.xyz; vNormal = normalize(n);
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const WATER_FS = `
uniform float uTime, uStorm, uFlash, uSize, uSegs; uniform vec3 uSunDir, uDeep, uShallow, uSky; uniform sampler2D uHeight;
varying vec3 vWorld; varying vec3 vNormal;
#include <fog_pars_fragment>
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
void main(){
  vec2 uv = (vWorld.xz + uSize*0.5) / uSize;
  vec2 tuv = (uv * uSegs + 0.5) / (uSegs + 1.0);
  float ground = texture2D(uHeight, tuv).r * 30.0 - 10.0;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) ground = -10.0;
  float depth = max(vWorld.y - ground, 0.0);
  // ripples
  vec2 rp = vWorld.xz*0.6 + uTime*vec2(0.3,0.2);
  vec3 nrm = normalize(vNormal + vec3(n(rp)-0.5, 0.0, n(rp+7.3)-0.5) * 0.25);
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - max(dot(nrm, V), 0.0), 4.0);
  vec3 col = mix(uShallow, uDeep, smoothstep(0.0, 7.0, depth));
  col = mix(col, uSky, clamp(fres*0.8 + 0.1, 0.0, 1.0));
  vec3 L = normalize(uSunDir);
  float spec = pow(max(dot(reflect(-L, nrm), V), 0.0), 180.0) * (1.0 - uStorm*0.85) * 6.0;
  float foamN = n(vWorld.xz*1.3 + uTime*0.6);
  float foam = smoothstep(1.1, 0.0, depth) * smoothstep(0.35, 0.75, foamN + 0.35*sin(uTime*1.5 - depth*6.0));
  col += vec3(0.9) * foam * 0.7 + vec3(1.0,0.9,0.75) * spec;
  col += uFlash * 0.4;
  float alpha = mix(0.55, 0.96, smoothstep(0.0, 2.5, depth));
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export class Environment {
  constructor(scene, terrain) {
    this.scene = scene;
    this.storm = 1;
    this.time = 0;
    this.flash = 0;
    this.nextLightning = 6;
    this.onThunder = null;
    this.sunDir = new THREE.Vector3(-0.5, 0.8, -0.35).normalize();

    // Lights
    this.hemi = new THREE.HemisphereLight('#bcd3ff', '#4a5a3a', 0.9);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff3e0', 2.5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.near = 1; sc.far = 160;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.04;
    scene.add(this.sun, this.sun.target);

    this.fog = new THREE.FogExp2('#5d6670', 0.012);
    scene.fog = this.fog;

    // Sky dome
    this.skyU = { uTime: { value: 0 }, uStorm: { value: 1 }, uFlash: { value: 0 }, uSunDir: { value: this.sunDir } };
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(900, 32, 16),
      new THREE.ShaderMaterial({ uniforms: this.skyU, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false })
    );
    sky.renderOrder = -1;
    sky.frustumCulled = false;
    this.sky = sky;
    scene.add(sky);

    // Sea
    this.waterU = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, uStorm: { value: 1 }, uFlash: { value: 0 },
      uSunDir: { value: this.sunDir },
      uDeep: { value: new THREE.Color('#0b3a5a') }, uShallow: { value: new THREE.Color('#2fb3b0') }, uSky: { value: new THREE.Color('#8fa6b8') },
      uHeight: { value: terrain.heightTexture }, uSize: { value: terrain.size }, uSegs: { value: terrain.segs },
    }]);
    const wgeo = new THREE.PlaneGeometry(1400, 1400, 220, 220);
    wgeo.rotateX(-Math.PI / 2);
    this.water = new THREE.Mesh(wgeo, new THREE.ShaderMaterial({
      uniforms: this.waterU, vertexShader: WATER_VS, fragmentShader: WATER_FS, transparent: true, fog: true, depthWrite: false,
    }));
    this.water.renderOrder = 2;
    this.water.frustumCulled = false;
    scene.add(this.water);

    // Rain streaks around the camera
    const N = 2400;
    this.rainN = N;
    const rpos = new Float32Array(N * 6);
    this.rainData = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      this.rainData[i * 4] = (Math.random() - 0.5) * 70;
      this.rainData[i * 4 + 1] = Math.random() * 40;
      this.rainData[i * 4 + 2] = (Math.random() - 0.5) * 70;
      this.rainData[i * 4 + 3] = 28 + Math.random() * 10;
    }
    const rgeo = new THREE.BufferGeometry();
    rgeo.setAttribute('position', new THREE.BufferAttribute(rpos, 3));
    this.rain = new THREE.LineSegments(rgeo, new THREE.LineBasicMaterial({ color: '#a9bfd6', transparent: true, opacity: 0.45, depthWrite: false }));
    this.rain.frustumCulled = false;
    scene.add(this.rain);
  }

  setStorm(s) { this.storm = s; }

  update(dt, camera, focus) {
    this.time += dt;
    const s = this.storm;
    // lightning
    if (s > 0.5) {
      this.nextLightning -= dt;
      if (this.nextLightning <= 0) {
        this.flash = 1;
        this.nextLightning = 7 + Math.random() * 10;
        this._double = 0.18;
        const delay = 400 + Math.random() * 1200;
        setTimeout(() => this.onThunder?.(), delay);
      }
    }
    if (this._double > 0) { this._double -= dt; if (this._double <= 0) this.flash = 0.8; }
    this.flash = Math.max(0, this.flash - dt * 5);
    const f = this.flash * s;

    this.skyU.uTime.value = this.time;
    this.skyU.uStorm.value = s;
    this.skyU.uFlash.value = f;
    this.waterU.uTime.value = this.time;
    this.waterU.uStorm.value = s;
    this.waterU.uFlash.value = f;
    this.waterU.uSky.value.set(s > 0.5 ? '#6b7a88' : '#9cc4e4').lerp(new THREE.Color('#6b7a88'), s);
    this.waterU.uDeep.value.set('#0b4a6e').lerp(new THREE.Color('#0a2433'), s);
    this.waterU.uShallow.value.set('#36d1c4').lerp(new THREE.Color('#2b7d82'), s);

    this.sky.position.copy(camera.position);

    // light & fog
    this.sun.intensity = lerp(2.9, 0.35, s) + f * 4;
    this.sun.color.set('#ffe7c4').lerp(new THREE.Color('#9fb2d0'), s);
    this.hemi.intensity = lerp(1.0, 0.75, s) + f * 2.5;
    this.hemi.color.set('#cfe3ff').lerp(new THREE.Color('#7f8ea6'), s);
    this.fog.color.set('#b9d3e6').lerp(new THREE.Color('#4b545e'), s);
    this.fog.density = lerp(0.0045, 0.014, s);
    this.waterU.fogColor.value.copy(this.fog.color);
    this.waterU.fogDensity.value = this.fog.density;

    // shadow camera follows the player
    this.sun.position.copy(focus).addScaledVector(this.sunDir, 70);
    this.sun.target.position.copy(focus);

    // rain
    const op = s * 0.5;
    this.rain.visible = op > 0.02;
    if (this.rain.visible) {
      this.rain.material.opacity = op;
      const pos = this.rain.geometry.attributes.position.array;
      const d = this.rainData;
      const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
      const wind = 0.25;
      for (let i = 0; i < this.rainN; i++) {
        d[i * 4 + 1] -= d[i * 4 + 3] * dt;
        if (d[i * 4 + 1] < -12) { d[i * 4 + 1] += 40; d[i * 4] = (Math.random() - 0.5) * 70; d[i * 4 + 2] = (Math.random() - 0.5) * 70; }
        const x = cx + d[i * 4], y = cy + d[i * 4 + 1] - 10, z = cz + d[i * 4 + 2];
        pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z;
        pos[i * 6 + 3] = x - wind * 0.7; pos[i * 6 + 4] = y + 0.9; pos[i * 6 + 5] = z;
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
  }
}
