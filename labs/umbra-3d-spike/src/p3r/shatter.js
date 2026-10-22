// 屏幕空间玻璃碎裂（全程序化）。
// 做法：把「扣扳机前一帧」完整渲染成 HDR 快照 → 以冲击点（太阳穴枪口的屏幕位置）为圆心，按「辐条 × 环」切成放射状楔形碎片（相邻碎片共用顶点，开裂瞬间严丝合缝）→
// 每片在顶点着色器里做：开裂停顿 → 慢动作外移+微转 → 加速飞散（3D 旋转、冲向镜头、重力）；片元着色器采样快照，按碎片法线做折射偏移 + 色散，
// 叠加 HDR 裂纹亮边（进 Bloom）和转到光源方向时的玻璃高光闪。碎片之间的缝隙露出后面已经切好的「人格面具显形」镜头。
// 档位只改碎片数（high 16×7、mid 13×6、low 10×5），效果种类不删。
import * as THREE from 'three';
import { rng } from './arena.js';

export const SHATTER_TIERS = { high: [16, 7], mid: [13, 6], low: [10, 5] };
const FOV = 40, H = Math.tan(THREE.MathUtils.degToRad(FOV / 2)); // 碎片平面放在 z=-1，半高 = H

const VS = /* glsl */`
  attribute vec3 cen; attribute vec2 uv0; attribute vec4 rnd; attribute float edge; attribute float ring;
  uniform float t; uniform vec2 impact; uniform float slowEnd;
  varying vec2 vUv0; varying vec3 vN; varying float vE; varying vec4 vR; varying float vP; varying vec3 vView;
  vec3 rot(vec3 v, vec3 k, float a){ float c=cos(a), s=sin(a); return v*c + cross(k,v)*s + k*dot(k,v)*(1.-c); }
  void main(){
    vec3 local = position - cen;
    vec2 d2 = cen.xy - impact; float dist = length(d2); vec2 dir = dist > 1e-4 ? d2/dist : vec2(0.,1.);
    float delay = ring * 0.035;                       // 内圈先动
    float tt = max(t - 0.06 - delay, 0.);             // 0.06s 开裂停顿（裂纹亮起，碎片不动）
    float s1 = min(tt / max(slowEnd - 0.06, 0.01), 1.); s1 = s1*(2.-s1);
    float f = max(t - slowEnd - delay * 0.5, 0.);     // 飞散阶段
    vec3 axis = normalize(rnd.xyz - 0.5 + vec3(0.,0.,0.0001));
    float ang = (0.06 + 0.22 * rnd.w) * s1 * (rnd.x > .5 ? 1. : -1.) + f * (3.0 + 7.0 * rnd.w) * (rnd.y > .5 ? 1. : -1.);
    vec3 off = vec3(dir * (0.006 + 0.03 * rnd.z) * s1, 0.04 * s1 * (0.3 + rnd.w));           // 慢动作：轻微外移 + 浮向镜头
    float v0 = 0.25 + 0.55 * rnd.z + 0.25 / (dist + 0.25);
    off += vec3(dir * (v0 * f + 1.6 * f * f), 0.) + vec3(0., -0.55 * f * f, (0.25 + 0.9 * rnd.w) * f * f * 2.0);  // 加速飞散 + 重力 + 冲向镜头
    vec3 p = cen + off + rot(local, axis, ang);
    vN = rot(vec3(0.,0.,1.), axis, ang);
    vUv0 = uv0; vE = edge; vR = rnd; vP = clamp(s1 * 0.4 + f * 1.4, 0., 1.);
    vec4 mv = modelViewMatrix * vec4(p, 1.); vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }`;
const FS = /* glsl */`
  uniform sampler2D snap; uniform float t; uniform float edgeK; uniform float fade; uniform vec3 tint;
  varying vec2 vUv0; varying vec3 vN; varying float vE; varying vec4 vR; varying float vP; varying vec3 vView;
  void main(){
    vec3 n = normalize(vN);
    // 折射：法线越歪、越往后，偏移越大；三通道错开 = 色散
    vec2 refr = n.xy * (0.03 + 0.05 * vP) + (vR.zw - 0.5) * 0.012 * vP;
    vec2 ca = refr * 0.18 + vec2(0.0015);
    vec3 c = vec3(texture2D(snap, vUv0 + refr + ca).r, texture2D(snap, vUv0 + refr).g, texture2D(snap, vUv0 + refr - ca).b);
    c = mix(c, c * tint, 0.35 + 0.4 * vP);
    // 玻璃高光：碎片转到朝光方向时闪白（HDR）
    vec3 L = normalize(vec3(-0.35, 0.55, 0.75)); vec3 V = normalize(vView);
    float sp = pow(max(dot(reflect(-L, n), V), 0.), 28.);
    float fr = pow(1. - abs(n.z), 2.);
    c += vec3(0.85, 0.95, 1.2) * (sp * 2.2 + fr * 0.35);
    // 裂纹亮边：开裂瞬间最亮，随后保留一条细高光边
    float w = fwidth(vE) * 1.1;
    float rim = 1. - smoothstep(0., w, 1. - vE);
    float rimK = edgeK * (t < 0.06 ? 0.9 : 0.55 + 0.5 * vR.x);
    c += vec3(0.55, 0.8, 1.1) * rim * rimK;
    // 冲击点附近开裂时整体提亮
    gl_FragColor = vec4(c, fade);
  }`;

export class Shatter {
  constructor(renderer, tierName) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.01, 10);
    this.snapRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 0 });
    this.mat = new THREE.ShaderMaterial({
      uniforms: { snap: { value: this.snapRT.texture }, t: { value: 0 }, impact: { value: new THREE.Vector2() }, slowEnd: { value: 0.42 }, edgeK: { value: 1 }, fade: { value: 1 }, tint: { value: new THREE.Color(0.78, 0.98, 1.25) } },
      vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide, transparent: true, depthTest: true, depthWrite: true,
    });
    this.mesh = null; this.tierName = tierName; this.key = '';
    this.snapKey = '';
    // 冲击闪光 + 迸射碎屑（屏幕空间）
    const fc = document.createElement('canvas'); fc.width = fc.height = 256; const g = fc.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.15, 'rgba(200,240,255,0.9)'); gr.addColorStop(0.5, 'rgba(80,160,255,0.25)'); gr.addColorStop(1, 'rgba(0,40,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    g.translate(128, 128); g.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 14; i++) { g.rotate(Math.PI * 2 / 14 + (i % 3) * 0.07); g.beginPath(); g.moveTo(0, -3); g.lineTo(90 + (i * 29 % 38), 0); g.lineTo(0, 3); g.fill(); }
    const ft = new THREE.CanvasTexture(fc);
    this.flash = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ft, color: new THREE.Color(1.1, 1.3, 1.7), transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false }));
    this.flash.renderOrder = 10; this.scene.add(this.flash);
  }
  /** 冲击点（屏幕 uv）或档位变了就重建碎片网格 */
  build(uv, aspect, tierName) {
    const key = `${uv.x.toFixed(3)},${uv.y.toFixed(3)},${aspect.toFixed(3)},${tierName}`;
    if (key === this.key) return; this.key = key; this.tierName = tierName;
    if (this.mesh) { this.scene.remove(this.mesh); this.mesh.geometry.dispose(); }
    const [S, R] = SHATTER_TIERS[tierName] || SHATTER_TIERS.mid;
    const A = aspect, r = rng(77);
    const toP = (u, v) => [(u - 0.5) * 2 * A * H, (v - 0.5) * 2 * H];
    const ip = toP(uv.x, uv.y);
    const maxR = Math.hypot(A * H * 2, H * 2) * 1.05;
    // 辐条角（抖动）与每根辐条上的环半径（抖动、越外越宽）
    const ang = []; for (let j = 0; j < S; j++) ang.push((j + (r() - 0.5) * 0.7) / S * Math.PI * 2 + 0.3);
    const rad = []; for (let j = 0; j < S; j++) { const row = [0]; for (let i = 1; i <= R; i++) { const base = Math.pow(i / R, 1.55) * maxR; row.push(i === R ? maxR * 1.25 : base * (0.82 + r() * 0.34)); } rad.push(row); }
    const P = (j, i) => { const jj = (j + S) % S; const a = ang[jj], rr = rad[jj][i]; return [ip[0] + Math.cos(a) * rr, ip[1] + Math.sin(a) * rr]; };
    const polys = [];
    for (let j = 0; j < S; j++) for (let i = 0; i < R; i++) {
      const poly = i === 0 ? [P(j, 0), P(j, 1), P(j + 1, 1)] : [P(j, i), P(j, i + 1), P(j + 1, i + 1), P(j + 1, i)];
      // 一部分四边形沿对角线再劈开（碎片大小更随机）
      if (poly.length === 4 && r() < 0.35) { if (r() < 0.5) { polys.push([[poly[0], poly[1], poly[2]], i]); polys.push([[poly[0], poly[2], poly[3]], i]); } else { polys.push([[poly[0], poly[1], poly[3]], i]); polys.push([[poly[1], poly[2], poly[3]], i]); } }
      else polys.push([poly, i]);
    }
    const pos = [], cen = [], uv0 = [], rnd = [], edge = [], ring = [];
    const toUv = (p) => [p[0] / (2 * A * H) + 0.5, p[1] / (2 * H) + 0.5];
    for (const [poly, i] of polys) {
      const c = poly.reduce((s, p) => [s[0] + p[0] / poly.length, s[1] + p[1] / poly.length], [0, 0]);
      const rr = [r(), r(), r(), r()];
      for (let k = 0; k < poly.length; k++) {
        const a = poly[k], b = poly[(k + 1) % poly.length];
        for (const [p, e] of [[c, 0], [a, 1], [b, 1]]) {
          pos.push(p[0], p[1], -1); cen.push(c[0], c[1], -1); const u = toUv(p); uv0.push(u[0], u[1]); rnd.push(...rr); edge.push(e); ring.push(i / R);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('cen', new THREE.Float32BufferAttribute(cen, 3));
    geo.setAttribute('uv0', new THREE.Float32BufferAttribute(uv0, 2));
    geo.setAttribute('rnd', new THREE.Float32BufferAttribute(rnd, 4));
    geo.setAttribute('edge', new THREE.Float32BufferAttribute(edge, 1));
    geo.setAttribute('ring', new THREE.Float32BufferAttribute(ring, 1));
    this.mesh = new THREE.Mesh(geo, this.mat); this.mesh.frustumCulled = false; this.scene.add(this.mesh);
    this.mat.uniforms.impact.value.set(ip[0], ip[1]);
    this.flash.position.set(ip[0], ip[1], -0.99);
    this.count = polys.length;
  }
  setSize(w, h, dpr) { this.snapRT.setSize(Math.round(w * dpr), Math.round(h * dpr)); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); this.snapKey = ''; }
  /** lt：从碎裂起算的本地时间 */
  update(lt) {
    const u = this.mat.uniforms; u.t.value = lt;
    u.edgeK.value = lt < 0.06 ? 1.6 : Math.max(0.5, 1.2 - lt);
    u.fade.value = lt < 0.85 ? 1 : Math.max(0, 1 - (lt - 0.85) / 0.25);
    const fk = lt < 0.03 ? 1 : Math.max(0, 1 - (lt - 0.03) / 0.22);
    this.flash.material.opacity = fk * 0.8; this.flash.scale.setScalar(0.16 + lt * 0.9);
  }
  render(renderer) {
    const ac = renderer.autoClear; renderer.autoClear = false; renderer.clearDepth();
    renderer.render(this.scene, this.cam); renderer.autoClear = ac;
  }
}
