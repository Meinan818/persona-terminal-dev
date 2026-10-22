// 屏幕空间玻璃碎裂 v2（全程序化）。
// 做法：把「扣扳机前一帧」完整渲染成 HDR 快照 → 以冲击点（太阳穴枪口的屏幕位置）为圆心切成放射状大块碎片（辐条 × 环，相邻共用顶点，开裂瞬间严丝合缝）→
// v2：每片是有厚度的棱柱（正面 + 背面 + 侧面），正面是快照的高饱和蓝色双色调（原作碎片上那种蓝色切入画面），半不透明，白色高光边；侧面是亮青白的玻璃厚度。
// 运动：0.05s 开裂停顿 → 慢动作（外移、浮向镜头）→ 加速飞散（冲向镜头 + 向四周，3D 翻转，重力）。
// 档位只改碎片数（high 11×5、mid 9×4、low 7×4），效果种类不删。
import * as THREE from 'three';
import { rng } from './arena.js';

export const SHATTER_TIERS = { high: [11, 5], mid: [9, 4], low: [7, 4] };
const FOV = 40, H = Math.tan(THREE.MathUtils.degToRad(FOV / 2)); // 碎片平面放在 z=-1，半高 = H

const VS = /* glsl */`
  attribute vec3 cen; attribute vec2 uv0; attribute vec4 rnd; attribute float edge; attribute float ring; attribute float face; attribute vec3 fn;
  uniform float t; uniform vec2 impact; uniform float slowEnd;
  varying vec2 vUv0; varying vec3 vN; varying float vE; varying vec4 vR; varying float vP; varying vec3 vView; varying float vF; varying float vRing;
  vec3 rot(vec3 v, vec3 k, float a){ float c=cos(a), s=sin(a); return v*c + cross(k,v)*s + k*dot(k,v)*(1.-c); }
  void main(){
    vec3 local = position - cen;
    vec2 d2 = cen.xy - impact; float dist = length(d2); vec2 dir = dist > 1e-4 ? d2/dist : vec2(0.,1.);
    float delay = ring * 0.05;
    float tt = max(t - 0.05 - delay, 0.);
    float s1 = min(tt / max(slowEnd - 0.05, 0.01), 1.); s1 = s1*(2.-s1);
    float f = max(t - slowEnd - delay * 0.4, 0.);
    vec3 axis = normalize(rnd.xyz - 0.5 + vec3(0.,0.,0.0001));
    float ang = (0.12 + 0.35 * rnd.w) * s1 * (rnd.x > .5 ? 1. : -1.) + f * (2.5 + 6.0 * rnd.w) * (rnd.y > .5 ? 1. : -1.);
    // 慢动作：轻微外移 + 浮向镜头（内圈更快）
    vec3 off = vec3(dir * (0.06 + 0.09 * rnd.z + 0.22 * (1. - ring)) * s1, (0.12 + 0.14 * rnd.w) * s1 * (1.2 - ring)); // 内圈向外让开：中间先露出召唤者（A 13.40）
    // 飞散：向四周 + 强烈冲向镜头（会越过镜头），轻重力
    float v0 = 0.35 + 0.6 * rnd.z + 0.2 / (dist + 0.25);
    off += vec3(dir * (v0 * f * 0.8 + 0.9 * f * f), 0.) + vec3(0., -0.3 * f * f, (0.25 + 0.55 * (1. - ring) + 0.3 * rnd.w) * (f * 0.6 + f * f * 1.2));
    vec3 p = cen + off + rot(local, axis, ang);
    vN = rot(fn, axis, ang);
    vUv0 = uv0; vE = edge; vR = rnd; vP = clamp(s1 * 0.5 + f * 1.6, 0., 1.); vF = face; vRing = ring;
    vec4 mv = modelViewMatrix * vec4(p, 1.); vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }`;
const FS = /* glsl */`
  uniform sampler2D snap; uniform float t; uniform float edgeK; uniform float fade;
  varying vec2 vUv0; varying vec3 vN; varying float vE; varying vec4 vR; varying float vP; varying vec3 vView; varying float vF; varying float vRing;
  vec3 duo(float l){ // 高饱和蓝色双色调：深蓝 → 宝蓝 → 青白
    vec3 a = vec3(0.01, 0.03, 0.22), b = vec3(0.08, 0.32, 1.25), c = vec3(0.75, 0.95, 1.35);
    return l < 0.42 ? mix(a, b, l / 0.42) : mix(b, c, (l - 0.42) / 0.58);
  }
  void main(){
    vec3 n = normalize(vN); vec3 V = normalize(vView);
    if (vF > 0.5 && vF < 1.5) { // 侧面：玻璃厚度，亮青白，朝光更亮
      float k = 0.55 + 0.45 * abs(dot(n, normalize(vec3(-0.3, 0.6, 0.7))));
      gl_FragColor = vec4(vec3(0.55, 0.85, 1.35) * k * 1.25, fade); return;
    }
    vec2 refr = n.xy * (0.025 + 0.04 * vP) + (vR.zw - 0.5) * 0.01 * vP;
    vec2 ca = refr * 0.2 + vec2(0.002);
    vec3 s = vec3(texture2D(snap, vUv0 + refr + ca).r, texture2D(snap, vUv0 + refr).g, texture2D(snap, vUv0 + refr - ca).b);
    float l = pow(clamp(dot(s, vec3(0.3, 0.55, 0.15)) * 1.25, 0., 1.), 1.35);
    // 每片亮度不同（有的偏深蓝、有的偏亮青），斜向条纹 = 玻璃内反射
    float band = 0.5 + 0.5 * sin((vUv0.x * 0.8 + vUv0.y) * 38. + vR.x * 6.28);
    l = clamp(l * (0.5 + 0.8 * vR.y) + 0.28 * band * vR.z * vR.y + (vR.x > 0.72 ? 0.35 : 0.), 0., 1.); // 约三成碎片偏亮青白
    vec3 c = duo(l);
    if (vF > 1.5) c *= 0.45; // 背面更暗
    // 高光：转到光源方向时整片闪白
    vec3 Ld = normalize(vec3(-0.35, 0.55, 0.75));
    float sp = pow(max(dot(reflect(-Ld, n), V), 0.), 18.);
    c += vec3(0.9, 1.0, 1.25) * sp * 1.6;
    // 白色高光边（细，HDR 进 Bloom）
    float w = fwidth(vE) * 0.9;
    float rim = 1. - smoothstep(0., w, 1. - vE);
    float rim2 = 1. - smoothstep(0., w * 4., 1. - vE);
    c += vec3(0.9, 1.0, 1.15) * rim * edgeK * (0.7 + 0.5 * vR.x) + vec3(0.2, 0.45, 1.0) * rim2 * 0.2;
    float a = (0.86 + 0.1 * vR.w) * fade;
    gl_FragColor = vec4(c, max(a, rim * fade));
  }`;

export class Shatter {
  constructor(renderer, tierName) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.01, 10);
    this.snapRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 0 });
    this.mat = new THREE.ShaderMaterial({
      uniforms: { snap: { value: this.snapRT.texture }, t: { value: 0 }, impact: { value: new THREE.Vector2() }, slowEnd: { value: 0.34 }, edgeK: { value: 1 }, fade: { value: 1 } },
      vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide, transparent: true, depthTest: true, depthWrite: true,
    });
    this.mesh = null; this.tierName = tierName; this.key = '';
    // 冲击点：小而锐的蓝白星芒（不再是大片白雾）
    const fc = document.createElement('canvas'); fc.width = fc.height = 256; const g = fc.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 60); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(160,220,255,0.6)'); gr.addColorStop(1, 'rgba(0,40,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    g.translate(128, 128); g.fillStyle = 'rgba(220,240,255,1)';
    for (let i = 0; i < 12; i++) { g.rotate(Math.PI * 2 / 12 + (i % 3) * 0.09); g.beginPath(); g.moveTo(0, -2.5); g.lineTo(70 + (i * 37 % 56), 0); g.lineTo(0, 2.5); g.fill(); }
    const ft = new THREE.CanvasTexture(fc);
    this.flash = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ft, color: new THREE.Color(1.0, 1.2, 1.6), transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false }));
    this.flash.renderOrder = 10; this.scene.add(this.flash);
  }
  build(uv, aspect, tierName) {
    const key = `${uv.x.toFixed(3)},${uv.y.toFixed(3)},${aspect.toFixed(3)},${tierName}`;
    if (key === this.key) return; this.key = key; this.tierName = tierName;
    if (this.mesh) { this.scene.remove(this.mesh); this.mesh.geometry.dispose(); }
    const [S, R] = SHATTER_TIERS[tierName] || SHATTER_TIERS.mid;
    const A = aspect, r = rng(77);
    const toP = (u, v) => [(u - 0.5) * 2 * A * H, (v - 0.5) * 2 * H];
    const ip = toP(uv.x, uv.y);
    const maxR = Math.hypot(A * H * 2, H * 2) * 1.05;
    const ang = []; for (let j = 0; j < S; j++) ang.push((j + (r() - 0.5) * 0.75) / S * Math.PI * 2 + 0.3);
    const rad = []; for (let j = 0; j < S; j++) { const row = [0]; for (let i = 1; i <= R; i++) { const base = Math.pow(i / R, 1.35) * maxR; row.push(i === R ? maxR * 1.25 : base * (0.8 + r() * 0.4)); } rad.push(row); }
    const P = (j, i) => { const jj = (j + S) % S; const a = ang[jj], rr = rad[jj][i]; return [ip[0] + Math.cos(a) * rr, ip[1] + Math.sin(a) * rr]; };
    const polys = [];
    for (let j = 0; j < S; j++) for (let i = 0; i < R; i++) {
      const poly = i === 0 ? [P(j, 0), P(j, 1), P(j + 1, 1)] : [P(j, i), P(j, i + 1), P(j + 1, i + 1), P(j + 1, i)];
      if (poly.length === 4 && r() < 0.3) { if (r() < 0.5) { polys.push([[poly[0], poly[1], poly[2]], i]); polys.push([[poly[0], poly[2], poly[3]], i]); } else { polys.push([[poly[0], poly[1], poly[3]], i]); polys.push([[poly[1], poly[2], poly[3]], i]); } }
      else polys.push([poly, i]);
    }
    const pos = [], cen = [], uv0 = [], rnd = [], edge = [], ring = [], face = [], fn = [];
    const toUv = (p) => [p[0] / (2 * A * H) + 0.5, p[1] / (2 * H) + 0.5];
    const push = (x, y, z, c, u, rr, e, rg, f, n) => { pos.push(x, y, z); cen.push(c[0], c[1], -1); uv0.push(u[0], u[1]); rnd.push(...rr); edge.push(e); ring.push(rg); face.push(f); fn.push(...n); };
    for (const [poly, i] of polys) {
      const c = poly.reduce((s, p) => [s[0] + p[0] / poly.length, s[1] + p[1] / poly.length], [0, 0]);
      const rr = [r(), r(), r(), r()];
      const area = Math.abs(poly.reduce((s, p, k) => { const q = poly[(k + 1) % poly.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
      const th = Math.min(0.05, 0.012 + Math.sqrt(area) * 0.09); // 厚度：越大越厚
      const rg = i / R, zf = -1 + th / 2, zb = -1 - th / 2;
      for (let k = 0; k < poly.length; k++) {
        const a = poly[k], b = poly[(k + 1) % poly.length];
        const ua = toUv(a), ub = toUv(b), uc = toUv(c);
        // 正面
        push(c[0], c[1], zf, c, uc, rr, 0, rg, 0, [0, 0, 1]); push(a[0], a[1], zf, c, ua, rr, 1, rg, 0, [0, 0, 1]); push(b[0], b[1], zf, c, ub, rr, 1, rg, 0, [0, 0, 1]);
        // 背面
        push(c[0], c[1], zb, c, uc, rr, 0, rg, 2, [0, 0, -1]); push(b[0], b[1], zb, c, ub, rr, 1, rg, 2, [0, 0, -1]); push(a[0], a[1], zb, c, ua, rr, 1, rg, 2, [0, 0, -1]);
        // 侧面（厚度）
        const ex = b[0] - a[0], ey = b[1] - a[1], el = Math.hypot(ex, ey) || 1; const sn = [ey / el, -ex / el, 0];
        push(a[0], a[1], zf, c, ua, rr, 1, rg, 1, sn); push(a[0], a[1], zb, c, ua, rr, 1, rg, 1, sn); push(b[0], b[1], zb, c, ub, rr, 1, rg, 1, sn);
        push(a[0], a[1], zf, c, ua, rr, 1, rg, 1, sn); push(b[0], b[1], zb, c, ub, rr, 1, rg, 1, sn); push(b[0], b[1], zf, c, ub, rr, 1, rg, 1, sn);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('cen', new THREE.Float32BufferAttribute(cen, 3));
    geo.setAttribute('uv0', new THREE.Float32BufferAttribute(uv0, 2));
    geo.setAttribute('rnd', new THREE.Float32BufferAttribute(rnd, 4));
    geo.setAttribute('edge', new THREE.Float32BufferAttribute(edge, 1));
    geo.setAttribute('ring', new THREE.Float32BufferAttribute(ring, 1));
    geo.setAttribute('face', new THREE.Float32BufferAttribute(face, 1));
    geo.setAttribute('fn', new THREE.Float32BufferAttribute(fn, 3));
    this.mesh = new THREE.Mesh(geo, this.mat); this.mesh.frustumCulled = false; this.scene.add(this.mesh);
    this.mat.uniforms.impact.value.set(ip[0], ip[1]);
    this.flash.position.set(ip[0], ip[1], -0.95);
    this.count = polys.length;
  }
  setSize(w, h, dpr) { this.snapRT.setSize(Math.round(w * dpr), Math.round(h * dpr)); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); }
  /** lt：从碎裂起算的本地时间 */
  update(lt, life = 0.8) {
    const u = this.mat.uniforms; u.t.value = lt;
    u.edgeK.value = lt < 0.05 ? 1.1 : Math.max(0.6, 1.1 - lt);
    u.fade.value = lt < life - 0.15 ? 1 : Math.max(0, 1 - (lt - life + 0.15) / 0.15);
    const fk = lt < 0.03 ? 1 : Math.max(0, 1 - (lt - 0.03) / 0.12);
    this.flash.material.opacity = fk * 0.85; this.flash.scale.setScalar(0.1 + lt * 0.6);
  }
  render(renderer) {
    const ac = renderer.autoClear; renderer.autoClear = false; renderer.clearDepth();
    renderer.render(this.scene, this.cam); renderer.autoClear = ac;
  }
}
