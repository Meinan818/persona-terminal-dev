// P3R 风「塔尔塔洛斯」战斗场（全程序化，无任何原作素材）：
// 薄荷/深青棋盘格亮面反射地板 + 红色血迹斑（程序化）+ 深青墙板 + 高处绿色发光窗格 + 冷光柱 + 飘浮光点。
// 对照 108246 召唤段（11.5–16s、23.4–28.3s）的场景配色手调。
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { toonMat } from '../toon.js';

export function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
export const HDR = (hex, k) => new THREE.Color(hex).multiplyScalar(k);

const FloorShader = {
  name: 'P3RFloor',
  uniforms: {
    color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
    reflStr: { value: 0.55 }, blur: { value: 1 }, texel: { value: new THREE.Vector2(1 / 512, 1 / 512) }, time: { value: 0 },
    dim: { value: 1 }, splat: { value: null },
  },
  vertexShader: /* glsl */`
    uniform mat4 textureMatrix; varying vec4 vRuv; varying vec3 vW; varying vec3 vV;
    void main(){ vRuv = textureMatrix * vec4(position,1.); vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; vec4 mv = viewMatrix * w; vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform sampler2D splat; uniform float reflStr; uniform float blur; uniform vec2 texel; uniform float time; uniform float dim;
    varying vec4 vRuv; varying vec3 vW; varying vec3 vV;
    float h12(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    void main(){
      vec2 p = vW.xz / 0.9;
      vec2 f = fract(p); vec2 i = floor(p);
      float ch = mod(i.x + i.y, 2.0);
      // 原作：浅薄荷 / 深青交替，接缝有细暗线
      vec3 a = vec3(0.50, 0.80, 0.72), b = vec3(0.07, 0.28, 0.27);
      vec3 base = mix(b, a, ch);
      float seam = smoothstep(0.0, 0.025, min(min(f.x, 1.-f.x), min(f.y, 1.-f.y)));
      base *= mix(0.55, 1.0, seam);
      base *= 0.92 + 0.08 * h12(i);
      // 血迹（程序化 splat 贴图，世界坐标）
      vec4 sp = texture2D(splat, vW.xz / 28. + 0.5);
      base = mix(base, vec3(0.42, 0.02, 0.04), sp.a * 0.85);
      vec3 V = normalize(cameraPosition - vW);
      float fres = mix(0.22, 1.0, pow(1. - abs(V.y), 3.0));
      vec2 ruv = vRuv.xy / vRuv.w;
      vec2 o = texel * 2.0 * blur; vec3 refl = vec3(0.);
      refl += texture2D(tDiffuse, ruv).rgb * 0.4;
      refl += texture2D(tDiffuse, ruv + vec2(0., o.y*2.)).rgb * 0.2; refl += texture2D(tDiffuse, ruv - vec2(0., o.y*2.)).rgb * 0.2;
      refl += texture2D(tDiffuse, ruv + vec2(o.x, 0.)).rgb * 0.1; refl += texture2D(tDiffuse, ruv - vec2(o.x, 0.)).rgb * 0.1;
      float d = length(vW.xz);
      vec3 c = base * (0.42 + 0.3 * smoothstep(16., 3., d));
      c += refl * fres * reflStr * (0.6 + 0.4 * ch);
      c *= smoothstep(22., 14., d) * 0.85 + 0.15;
      c *= dim;
      gl_FragColor = vec4(c, 1.);
    }`,
};

function splatTex() {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); const r = rng(21);
  const blob = (x, y, R) => {
    g.beginPath(); const n = 18;
    for (let k = 0; k <= n; k++) { const a = k / n * Math.PI * 2; const rr = R * (0.6 + 0.5 * r()); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7); }
    g.fill();
    for (let k = 0; k < 7; k++) { const a = r() * 7, d = R * (1 + r() * 1.4); g.beginPath(); g.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, R * 0.12 * (0.5 + r()), R * 0.06, a, 0, 7); g.fill(); }
  };
  g.fillStyle = 'rgba(255,255,255,1)';
  for (const [x, y, R] of [[0.62, 0.47, 34], [0.55, 0.42, 22], [0.4, 0.55, 26], [0.7, 0.58, 18], [0.47, 0.36, 15], [0.33, 0.47, 20], [0.6, 0.66, 28]]) blob(x * S, y * S, R);
  for (let i = 0; i < 26; i++) blob((0.25 + r() * 0.55) * S, (0.25 + r() * 0.5) * S, 4 + r() * 9);
  const t = new THREE.CanvasTexture(c); return t;
}

export function glowTex(draw, w = 64, h = 64) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
export function addMat(map, col, k, op = 1) { return new THREE.MeshBasicMaterial({ map, color: HDR(col, k), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }); }

function windowTex() {
  return glowTex((g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const cols = 4, rows = 7, pw = w / cols, ph = h / rows;
    for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) {
      g.fillStyle = (x + y * 3) % 11 === 4 ? '#2a8a3a' : '#5cff6c';
      g.fillRect(x * pw + pw * 0.14, y * ph + ph * 0.12, pw * 0.72, ph * 0.76);
    }
  }, 128, 224);
}

export function buildArena(scene, tier) {
  scene.background = new THREE.Color(0x02060c);
  const g = new THREE.Group(); scene.add(g);
  const dpr = window.devicePixelRatio || 1;
  const w0 = Math.round(window.innerWidth * dpr * tier.reflScale), h0 = Math.round(window.innerHeight * dpr * tier.reflScale);
  const floor = new Reflector(new THREE.PlaneGeometry(48, 48), { shader: FloorShader, textureWidth: w0, textureHeight: h0, clipBias: 0.003, multisample: 0, color: 0xffffff });
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const fu = floor.material.uniforms; fu.blur.value = tier.reflBlur; fu.texel.value.set(1 / w0, 1 / h0); fu.splat.value = splatTex();
  // 墙：深青墙板（八边形围合），高处绿色窗格，竖向冷光条
  const wallM = toonMat({ color: 0x1d4f55, shadeTint: 0x0b2a33, rim: 0.12, side: THREE.BackSide });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(17, 17, 26, 8, 1, true), wallM); wall.position.y = 13; wall.rotation.y = Math.PI / 8; g.add(wall);
  const wt = windowTex();
  const winM = new THREE.MeshBasicMaterial({ map: wt, color: HDR(0xffffff, 1.35), fog: false });
  const stripT = glowTex((c, w, h) => { const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, '#cff'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }, 32, 8);
  const r = rng(5);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2; const R = 16.2;
    for (const off of [-0.17, 0.17]) {
      const aa = a + off;
      const w = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 4.6), winM); w.position.set(Math.cos(aa) * R, 4.4, Math.sin(aa) * R); w.lookAt(0, 4.4, 0); g.add(w);
      const w2 = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.2), winM); w2.position.set(Math.cos(aa) * R, 8.4, Math.sin(aa) * R); w2.lookAt(0, 8.4, 0); g.add(w2);
    }
    // 柱 + 冷光边
    const pa = a + Math.PI / 8; const pil = new THREE.Mesh(new THREE.BoxGeometry(1.4, 26, 1.2), toonMat({ color: 0x163f46, shadeTint: 0x08202a, rim: 0.3 }));
    pil.position.set(Math.cos(pa) * 15.6, 13, Math.sin(pa) * 15.6); pil.lookAt(0, 13, 0); g.add(pil);
    const st = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 20), addMat(stripT, 0x6fffe8, 0.9, 0.7)); st.position.copy(pil.position).multiplyScalar(0.955); st.position.y = 10; st.lookAt(0, 10, 0); g.add(st);
    // 低处青色灯（原作墙脚的小灯）
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: HDR(0x9ffcff, 2.2), fog: false }));
    lamp.position.set(Math.cos(a + 0.4) * 15.9, 2.6 + r() * 0.6, Math.sin(a + 0.4) * 15.9); g.add(lamp);
  }
  // 地脚冷光圈
  const trim = new THREE.Mesh(new THREE.TorusGeometry(16.6, 0.03, 4, 128), new THREE.MeshBasicMaterial({ color: HDR(0x5fffe0, 0.8), fog: false })); trim.rotation.x = Math.PI / 2; trim.position.y = 0.6; g.add(trim);
  // 飘浮光点
  const dot = glowTex((dg, w) => { const grd = dg.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.3, 'rgba(160,255,240,0.7)'); grd.addColorStop(1, 'rgba(60,200,255,0)'); dg.fillStyle = grd; dg.fillRect(0, 0, w, w); }, 64, 64);
  const N = Math.round(360 * tier.particles); const pos = new Float32Array(N * 3); const base = new Float32Array(N * 3); const pr = rng(9);
  for (let i = 0; i < N; i++) { const a = pr() * 7, rr = Math.sqrt(pr()) * 14; base[i * 3] = Math.cos(a) * rr; base[i * 3 + 1] = pr() * 8; base[i * 3 + 2] = Math.sin(a) * rr; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: dot, color: HDR(0xbffff4, 1.2), size: 0.06, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(pts);
  return {
    group: g, floor,
    setTier(t) { fu.blur.value = t.reflBlur; },
    resize(w, h, d) { const rw = Math.max(64, Math.round(w * d * tier.reflScale)), rh = Math.max(64, Math.round(h * d * tier.reflScale)); floor.getRenderTarget().setSize(rw, rh); fu.texel.value.set(1 / rw, 1 / rh); },
    /** dim：召唤时场景压暗（原作扣扳机前整体暗到近黑） */
    update(t, dim = 1) {
      fu.time.value = t; fu.dim.value = dim; winM.color.copy(HDR(0xffffff, 1.35 * (0.25 + 0.75 * dim)));
      for (let i = 0; i < N; i++) { pos[i * 3] = base[i * 3] + Math.sin(t * 0.6 + i) * 0.2; pos[i * 3 + 1] = (base[i * 3 + 1] + t * 0.12 * (1 + i % 5 * 0.2)) % 8; pos[i * 3 + 2] = base[i * 3 + 2]; }
      geo.attributes.position.needsUpdate = true;
    },
  };
}
