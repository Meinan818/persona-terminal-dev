// 召唤演出特效（全程序化）：召唤器枪模、脚下蓝焰、光柱、羽毛、晶翼、3D 碎玻璃屑、火球（亚基）。
// 所有动画都是 t 的纯函数（固定 t 截图 = 实时播放同一帧）。HDR 颜色（>1）才进 Bloom。
import * as THREE from 'three';
import { toonMat, outlineMat } from '../toon.js';
import { rng, HDR, glowTex } from './arena.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };

/** 召唤器：程序化银色手枪（枪管朝 +z，握把朝 -y，原点在扳机处） */
export function makeEvoker() {
  const g = new THREE.Group();
  const silver = toonMat({ color: 0xa9b1c2, shadeTint: 0x4a5266, rim: 0.6 });
  const dark = toonMat({ color: 0x2a2d36, shadeTint: 0x101218, rim: 0.4 });
  const red = toonMat({ color: 0xc8202a, shadeTint: 0x601018, rim: 0.3 });
  const add = (geo, m, x, y, z, rx = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.x = rx; g.add(o); const ol = new THREE.Mesh(geo, outlineMat(0.6)); ol.position.copy(o.position); ol.rotation.copy(o.rotation); g.add(ol); return o; };
  add(new THREE.BoxGeometry(0.028, 0.034, 0.17), silver, 0, 0.03, 0.05);         // 套筒
  add(new THREE.CylinderGeometry(0.009, 0.009, 0.03, 8), silver, 0, 0.03, 0.145, Math.PI / 2); // 枪口
  add(new THREE.BoxGeometry(0.026, 0.1, 0.04), dark, 0, -0.035, -0.015, -0.25);    // 握把
  add(new THREE.BoxGeometry(0.008, 0.012, 0.03), red, 0, 0.051, -0.01);          // 红色标记
  add(new THREE.TorusGeometry(0.016, 0.003, 4, 12, Math.PI), dark, 0, 0.0, 0.03, Math.PI / 2);
  g.userData.muzzle = new THREE.Vector3(0, 0.03, 0.16);
  return g;
}

function flameTex(seed) {
  // 冰晶火焰：一簇锯齿尖刺，白芯、青蓝渐变、深蓝描边（原作脚下的冰晶蓝焰）
  return glowTex((g, w, h) => {
    const r = rng(seed);
    const spikes = []; const n = 5 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) spikes.push({ x: w * (0.12 + 0.76 * (i + r() * 0.6) / n), hh: h * (0.35 + 0.6 * r()), bw: w * (0.08 + 0.1 * r()), lean: (r() - 0.5) * w * 0.25 });
    spikes.sort((a, b) => b.hh - a.hh);
    const path = (s, k) => { g.beginPath(); g.moveTo(s.x - s.bw * k, h); g.lineTo(s.x - s.bw * 0.35 * k + s.lean * 0.4, h - s.hh * 0.45); g.lineTo(s.x - s.bw * 0.7 * k + s.lean * 0.5, h - s.hh * 0.55); g.lineTo(s.x + s.lean, h - s.hh * k); g.lineTo(s.x + s.bw * 0.5 * k + s.lean * 0.6, h - s.hh * 0.62); g.lineTo(s.x + s.bw * 0.3 * k + s.lean * 0.4, h - s.hh * 0.42); g.lineTo(s.x + s.bw * k, h); g.closePath(); };
    for (const s of spikes) {
      path(s, 1.15); g.fillStyle = 'rgba(20,50,200,0.95)'; g.fill();
      path(s, 1.0); const gr = g.createLinearGradient(0, h, 0, h - s.hh); gr.addColorStop(0, 'rgba(120,180,255,1)'); gr.addColorStop(0.45, 'rgba(225,245,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = gr; g.fill();
      g.strokeStyle = 'rgba(70,120,255,0.9)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(s.x + s.lean * 0.2, h); g.lineTo(s.x + s.lean, h - s.hh * 0.95); g.stroke();
    }
  }, 128, 256);
}

/** 脚下冰晶蓝焰：一圈朝镜头的锯齿冰晶（白芯蓝边，正常混合，看得出形状）+ 加色辉光底 */
export function makeBlueFlame(tier) {
  const g = new THREE.Group(); const r = rng(31);
  const texs = [flameTex(3), flameTex(7), flameTex(11)];
  const N = Math.round(30 * Math.max(0.4, tier.particles));
  const items = [];
  for (let i = 0; i < N; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ map: texs[i % 3], color: HDR(0xdfeaff, i % 4 ? 0.85 : 1.15), transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    const a = r() * Math.PI * 2, rr = 0.1 + r() * 0.5;
    items.push({ m, a, rr: rr * 1.15, h: 0.3 + r() * 0.5, w: 0.35 + r() * 0.35, ph: r() * 10, sp: 9 + r() * 8, tilt: (r() - 0.5) * 0.4 });
    g.add(m);
  }
  const halo = []; // 加色辉光尖刺（在冰晶后面）
  const ht = glowTex((c, w, h) => { const gr = c.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(90,140,255,1)'); gr.addColorStop(1, 'rgba(30,60,255,0)'); c.fillStyle = gr; c.beginPath(); c.moveTo(0, h); c.quadraticCurveTo(w * 0.4, h * 0.4, w * 0.5, 0); c.quadraticCurveTo(w * 0.6, h * 0.4, w, h); c.fill(); }, 64, 128);
  for (let i = 0; i < Math.round(10 * Math.max(0.5, tier.particles)); i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ map: ht, color: HDR(0x5a8cff, 2.0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); halo.push({ m, a: r() * 7, rr: r() * 0.3, h: 0.9 + r() * 0.9, ph: r() * 9 }); g.add(m); }
  const glow = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ map: glowTex((c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(170,215,255,1)'); gr.addColorStop(0.35, 'rgba(60,90,255,0.6)'); gr.addColorStop(1, 'rgba(0,0,80,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, w); }, 128, 128), color: HDR(0xffffff, 1.8), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.02; g.add(glow);
  const wpv = new THREE.Vector3();
  return {
    group: g,
    update(t, k, camera) {
      g.visible = k > 0.001;
      if (!g.visible) return;
      const face = (m) => { m.getWorldPosition(wpv); return Math.atan2(camera.position.x - wpv.x, camera.position.z - wpv.z); };
      for (const it of items) {
        // 冰晶「跳动」：每 ~0.08s 换一次高度（不是平滑抖动），更像原作逐帧火焰
        const step = Math.floor(t * it.sp + it.ph); const jit = 0.7 + 0.45 * ((Math.sin(step * 12.9898 + it.ph) * 43758.5) % 1 + 1) % 1;
        it.m.position.set(Math.cos(it.a) * it.rr, 0, Math.sin(it.a) * it.rr);
        it.m.scale.set(it.w * (0.7 + 0.4 * k) * (step % 2 ? -1 : 1), it.h * jit * k * (1.35 - it.rr), 1);
        it.m.rotation.set(0, face(it.m), it.tilt);
        it.m.material.opacity = Math.min(1, k * 1.4);
      }
      for (const hl of halo) { hl.m.position.set(Math.cos(hl.a) * hl.rr, 0, Math.sin(hl.a) * hl.rr); hl.m.scale.set(0.35, hl.h * k * (0.8 + 0.3 * Math.sin(t * 13 + hl.ph)), 1); hl.m.rotation.set(0, face(hl.m), 0); hl.m.material.opacity = k * 0.8; }
      glow.scale.setScalar(1.0 + 0.2 * Math.sin(t * 9)); glow.material.opacity = k;
    },
  };
}

/** 光柱：开口圆柱 + 上升条纹（HDR 青） */
export function makePillar() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, k: { value: 0 }, col: { value: HDR(0x4a9cff, 0.9) } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=-mv.xyz; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform float t; uniform float k; uniform vec3 col; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      float h(float x){ return fract(sin(x*91.7)*4375.5); }
      void main(){
        float ed = 1. - abs(dot(normalize(vN), normalize(vV)));
        float streak = 0.; for(int i=0;i<3;i++){ float fi=float(i); float u = vUv.x*(18.+fi*11.); float id=floor(u); streak += step(0.72, h(id+fi*7.)) * smoothstep(0.5,0.,abs(fract(u)-.5)) * fract(vUv.y*1.5 - t*(1.2+h(id)*1.5) + h(id*3.)); }
        float a = (0.06 + ed*0.5 + streak*0.55) * smoothstep(1.0, 0.25, vUv.y) * smoothstep(0., 0.04, vUv.y) * k;
        gl_FragColor = vec4(col * a, a);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.0, 9, 40, 1, true).translate(0, 4.5, 0), mat);
  return { mesh: m, update(t, k) { mat.uniforms.t.value = t; mat.uniforms.k.value = k; m.visible = k > 0.001; } };
}

function featherTex() {
  return glowTex((g, w, h) => {
    g.translate(w / 2, h / 2);
    const gr = g.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(170,215,255,0.9)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, -h * 0.48); g.bezierCurveTo(w * 0.42, -h * 0.2, w * 0.3, h * 0.3, 0, h * 0.42); g.bezierCurveTo(-w * 0.3, h * 0.3, -w * 0.42, -h * 0.2, 0, -h * 0.48); g.fill();
    g.strokeStyle = 'rgba(120,160,230,0.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -h * 0.45); g.lineTo(0, h * 0.5); g.stroke();
    g.strokeStyle = 'rgba(150,190,240,0.6)'; g.lineWidth = 1;
    for (let i = -8; i < 9; i++) { g.beginPath(); g.moveTo(0, i * h * 0.045); g.lineTo(w * 0.3 * Math.sign(i + 0.5), i * h * 0.045 - h * 0.06); g.stroke(); }
  }, 64, 160);
}

/** 羽毛 + 3D 碎玻璃屑（实例化），从 origin 迸出、飘落、旋转 */
export function makeDebris(tier) {
  const r = rng(91);
  const NF = Math.round(45 * tier.particles), NS = Math.round(110 * tier.particles);
  const fm = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.1, 0.25), new THREE.MeshBasicMaterial({ map: featherTex(), color: HDR(0xf0f6ff, 1.05), transparent: true, alphaTest: 0.08, side: THREE.DoubleSide, depthWrite: false, fog: false }), NF);
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.09, 0, -0.04, -0.05, 0, 0.05, -0.03, 0], 3)); sg.computeVertexNormals();
  const smat = new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * instanceMatrix * vec4(position,1.); vN = normalize(normalMatrix * mat3(instanceMatrix) * normal); vV=-mv.xyz; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float k; varying vec3 vN; varying vec3 vV; void main(){ vec3 n=normalize(vN); vec3 V=normalize(vV); float sp=pow(max(dot(reflect(-normalize(vec3(-.3,.7,.6)),n),V),0.),16.); float fr=1.-abs(dot(n,V)); vec3 c = vec3(0.35,0.7,1.1)*(0.5+fr) + vec3(1.6,1.8,2.2)*sp*2.; gl_FragColor=vec4(c*k, k); }`,
    uniforms: { k: { value: 1 } }, side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const sm = new THREE.InstancedMesh(sg, smat, NS);
  fm.frustumCulled = sm.frustumCulled = false;
  const F = [], Sd = [];
  for (let i = 0; i < NF; i++) F.push({ a: r() * 7, el: r() * 1.2 - 0.2, sp: 0.8 + r() * 2.2, ph: r() * 7, rs: 2 + r() * 5, ax: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), d: r() * 0.25 });
  for (let i = 0; i < NS; i++) Sd.push({ a: r() * 7, el: r() * 1.6 - 0.5, sp: 1.5 + r() * 4.5, ph: r() * 7, rs: 4 + r() * 12, ax: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), s: 0.5 + r() * 1.4, d: r() * 0.15 });
  const g = new THREE.Group(); g.add(fm, sm);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  return {
    group: g,
    /** lt：从迸发起算；origin：迸发中心；k：整体可见度 */
    update(lt, origin, k, camera) {
      g.visible = lt >= 0 && k > 0.01; if (!g.visible) return;
      F.forEach((f, i) => {
        const tt = Math.max(0, lt - f.d); const out = f.sp * (1 - Math.exp(-tt * 2.6)) * 1.3;
        p.set(Math.cos(f.a) * Math.cos(f.el) * out, Math.sin(f.el) * out * 0.9 + 0.3 - tt * 0.18, Math.sin(f.a) * Math.cos(f.el) * out).add(origin);
        p.x += Math.sin(tt * 2.4 + f.ph) * 0.3; p.z += Math.cos(tt * 1.9 + f.ph) * 0.2;
        q.setFromAxisAngle(f.ax, Math.sin(tt * 3 + f.ph) * 1.2 + f.ph); sc.setScalar(tt > 0 ? 1.0 + 0.6 * ((i * 7) % 5) / 5 : 0);
        m4.compose(p, q, sc); fm.setMatrixAt(i, m4);
      });
      Sd.forEach((s, i) => {
        const tt = Math.max(0, lt - s.d); const out = s.sp * (1 - Math.exp(-tt * 3.0));
        p.set(Math.cos(s.a) * Math.cos(s.el) * out, Math.sin(s.el) * out * 0.8 - tt * tt * 0.2, Math.sin(s.a) * Math.cos(s.el) * out).add(origin);
        q.setFromAxisAngle(s.ax, tt * s.rs + s.ph); sc.setScalar(tt > 0 ? s.s * 0.95 : 0);
        m4.compose(p, q, sc); sm.setMatrixAt(i, m4);
      });
      fm.instanceMatrix.needsUpdate = sm.instanceMatrix.needsUpdate = true;
      fm.material.opacity = k; smat.uniforms.k.value = k;
    },
  };
}

/** 一片镂空雕花金羽（Shape + 椭圆镂空孔，挤出成薄片）。沿 +y 生长，根部在原点 */
function featherShape(len, wid, holes, curl) {
  const sh = new THREE.Shape();
  const P = (u, side) => { const y = u * len; const w = wid * Math.sin(Math.min(1, u * 1.15) * Math.PI) * (1 - u * 0.35) + wid * 0.12; const bend = curl * u * u * len; return [side * w * 0.5 + bend, y]; };
  sh.moveTo(...P(0, -1)); for (let i = 1; i <= 12; i++) sh.lineTo(...P(i / 12, -1));
  sh.lineTo(curl * len + wid * 0.05, len * 1.06);
  for (let i = 12; i >= 0; i--) sh.lineTo(...P(i / 12, 1));
  for (let h = 0; h < holes; h++) {
    const u = 0.22 + 0.62 * (h + 0.5) / holes; const [cx, cy] = P(u, 0); const rw = wid * 0.2 * Math.sin(u * Math.PI) + wid * 0.04, rh = len * 0.24 / holes;
    const hp = new THREE.Path(); hp.absellipse(cx, cy, rw, rh, 0, Math.PI * 2, false, curl * 0.6); sh.holes.push(hp);
  }
  return new THREE.ExtrudeGeometry(sh, { depth: 0.035, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -0.017);
}

/** 人格面具外挂件（向原作 Hermes 剪影靠）：镂空雕花金翼（两侧多层）+ 头盔小翼 + 背后光环 + 披风。全程序化。
 *  group 放在人格面具 holder 的位置/朝向/缩放上（局部坐标：脚底原点，+z 朝前）。 */
export function makeWings(tier) {
  const g = new THREE.Group();
  const nF = tier && tier.particles < 0.6 ? 4 : 6; // 低档少两层羽，效果种类不变
  const gold = toonMat({ color: 0xd9c38c, shadeTint: 0x6a5a7a, rim: 0.7, side: THREE.DoubleSide });
  const goldD = toonMat({ color: 0xa8916a, shadeTint: 0x4a3a5a, rim: 0.6, side: THREE.DoubleSide });
  const glowM = new THREE.MeshBasicMaterial({ color: HDR(0x4a8cff, 1.1), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const olM = outlineMat(0.8);
  const feathers = [];
  const wingRoot = new THREE.Group(); wingRoot.position.set(0, 1.3, -0.3); wingRoot.scale.setScalar(1.45); g.add(wingRoot);
  for (const side of [-1, 1]) for (let i = 0; i < nF; i++) {
    const u = i / (nF - 1);
    const len = 1.5 + Math.sin(u * Math.PI) * 1.1 + (1 - u) * 0.3, wid = 0.42 - u * 0.12;
    const geo = featherShape(len, wid, 3, side * (0.15 + u * 0.1));
    const pv = new THREE.Group();
    const m = new THREE.Mesh(geo, i % 2 ? goldD : gold); pv.add(m);
    const ol = new THREE.Mesh(geo, olM); pv.add(ol);
    const gl = new THREE.Mesh(geo, glowM); gl.scale.set(1.12, 1.04, 1); gl.position.z = -0.03; pv.add(gl);
    wingRoot.add(pv); feathers.push({ pv, side, i, u });
  }
  // 头盔小翼
  const fins = [];
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const geo = featherShape(0.45 - i * 0.08, 0.13, 1, side * 0.1); const pv = new THREE.Group();
    pv.add(new THREE.Mesh(geo, gold), new THREE.Mesh(geo, olM)); pv.position.set(side * 0.42, 1.78, 0.05); g.add(pv); fins.push({ pv, side, i });
  }
  // 光环：细环 + 一圈短刺（HDR 青白）
  const halo = new THREE.Group(); halo.position.set(0, 1.85, -0.45); g.add(halo);
  const hm = new THREE.MeshBasicMaterial({ color: HDR(0xbfe8ff, 1.9), transparent: true, fog: false, side: THREE.DoubleSide });
  halo.add(new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.022, 6, 64), hm));
  halo.add(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.01, 4, 64), hm));
  for (let i = 0; i < 16; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.035, i % 2 ? 0.16 : 0.28, 4), hm); const a = i / 16 * Math.PI * 2; sp.position.set(Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0); sp.rotation.z = a - Math.PI / 2; halo.add(sp); }
  // 披风：两层（外深蓝、内暗红），顶点波动
  const capeGeo = new THREE.PlaneGeometry(0.7, 1.5, 6, 14).translate(0, -0.75, 0);
  const cBase = capeGeo.attributes.position.array.slice();
  const cape = new THREE.Group(); cape.position.set(0, 1.45, -0.38); g.add(cape);
  cape.add(new THREE.Mesh(capeGeo, toonMat({ color: 0x1c2458, shadeTint: 0x0a0c28, rim: 0.5, side: THREE.BackSide })));
  cape.add(new THREE.Mesh(capeGeo, toonMat({ color: 0x232a62, shadeTint: 0x0a0c28, rim: 0.5, side: THREE.FrontSide })));
  cape.add(new THREE.Mesh(capeGeo, outlineMat(0.7)));
  return {
    group: g,
    update(t, open, k) {
      g.visible = k > 0.01; if (!g.visible) return;
      for (const f of feathers) {
        // 收拢 → 展开：扇形张开（绕 z）+ 向后掠（绕 y）+ 缓慢扇动
        const fan = (0.1 + f.u * 0.75) * open + 0.08 * (1 - open);
        const flap = Math.sin(t * 2.2 - f.u * 0.8) * 0.06 * open;
        f.pv.rotation.set(-0.35 - 0.25 * f.u + flap, f.side * (0.75 - 0.1 * f.u), -f.side * (fan + flap)); // 向后上方掠（Hermes 式后掠翼）
        f.pv.position.set(f.side * 0.1, -f.u * 0.12, -f.u * 0.04);
        f.pv.scale.setScalar(0.3 + 0.7 * open);
      }
      for (const f of fins) { f.pv.rotation.set(-0.5, f.side * 0.4, -f.side * (0.9 + f.i * 0.35) * (0.4 + 0.6 * open)); f.pv.scale.setScalar(0.4 + 0.6 * open); }
      halo.scale.setScalar(0.2 + 0.8 * open); halo.rotation.z = t * 0.6;
      hm.opacity = k * Math.min(1, open * 1.3);
      const pa = capeGeo.attributes.position.array;
      for (let i = 0; i < pa.length; i += 3) { const x = cBase[i], y = cBase[i + 1]; const d = -y / 1.5; pa[i] = x * (1 - d * 0.55) * (1 + d * 0.3 * open); pa[i + 2] = cBase[i + 2] - d * d * (0.35 + 0.25 * Math.sin(t * 3.1 + y * 3 + x * 2)) - d * 0.1 * Math.sin(t * 4.3 + x * 4); }
      capeGeo.attributes.position.needsUpdate = true; capeGeo.computeVertexNormals();
      cape.scale.set(1, 0.4 + 0.6 * open, 1);
      glowM.opacity = 0.35 * k;
    },
  };
}

/** 亚基（火球）v2：命中闪光 → 大火球（橙黄底 + 暗红斑块纹理，红边）+ 长红橙火舌（弯曲锥形，向上/四周拖尾）+ 余烬 */
export function makeFireball(tier) {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 5), new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, k: { value: 0 } },
    vertexShader: `uniform float t; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      float hs(vec3 p){ return sin(p.x*5.1+t*9.)*sin(p.y*6.3-t*11.)*sin(p.z*4.7+t*7.); }
      void main(){ vP=position; vec3 p=position*(1.+0.09*hs(position*1.7)+0.05*hs(position*4.1)); vec4 mv=modelViewMatrix*vec4(p,1.); vN=normalize(normalMatrix*normal); vV=-mv.xyz; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform float t; uniform float k; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      vec3 h3(vec3 p){ p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6))); return fract(sin(p)*43758.5453); }
      float cell(vec3 p){ vec3 i=floor(p), f=fract(p); float d=1.; for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)for(int z=-1;z<=1;z++){ vec3 o=vec3(x,y,z); vec3 r=o+h3(i+o)-f; d=min(d,dot(r,r)); } return sqrt(d); }
      void main(){
        float fr = abs(dot(normalize(vN), normalize(vV)));
        vec3 q = vP*3.2 + vec3(0., -t*2.2, t*0.7);
        float c1 = cell(q), c2 = cell(q*2.1 + 3.);
        float blot = smoothstep(0.32, 0.12, c1) + 0.7*smoothstep(0.22, 0.08, c2);   // 暗红斑块
        vec3 core = vec3(1.15,0.78,0.22), mid = vec3(1.0,0.32,0.04), dark = vec3(0.42,0.04,0.015), edge = vec3(0.7,0.07,0.01);
        vec3 c = mix(mid, core, smoothstep(0.35,0.95,fr) * (0.6 + 0.4*c1));
        c = mix(c, dark, clamp(blot, 0., 0.85) * (0.4 + 0.6*fr));
        c = mix(edge, c, smoothstep(0.05, 0.45, fr));
        gl_FragColor = vec4(c*k, k*smoothstep(0.0,0.25,fr)); }`,
    transparent: true, depthWrite: false,
  }));
  g.add(ball);
  const glowB = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTex((c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,140,40,0.9)'); gr.addColorStop(0.5, 'rgba(220,40,0,0.4)'); gr.addColorStop(1, 'rgba(120,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, w); }, 128, 128), color: HDR(0xffffff, 0.8), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  g.add(glowB);
  // 火舌：锥形火焰带（黄芯→橙→红→透明，带锯齿边），沿一条弯曲路径拉长
  const tongueT = glowTex((c, w, h) => {
    for (const [k, col] of [[1, 'rgba(200,20,0,0.85)'], [0.7, 'rgba(255,110,10,0.95)'], [0.35, 'rgba(255,230,140,1)']]) {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, h * (0.5 - 0.45 * k));
      for (let i = 1; i <= 16; i++) { const x = w * i / 16; const ww = (1 - i / 16) * 0.45 * k * (1 + 0.25 * Math.sin(i * 2.7)); c.lineTo(x, h * (0.5 - ww)); }
      for (let i = 16; i >= 0; i--) { const x = w * i / 16; const ww = (1 - i / 16) * 0.45 * k * (1 + 0.25 * Math.cos(i * 3.1)); c.lineTo(x, h * (0.5 + ww)); }
      c.fill();
    }
  }, 512, 64);
  const r = rng(55);
  const NT = Math.max(7, Math.round(14 * tier.particles));
  const tongues = [];
  for (let i = 0; i < NT; i++) {
    const geo = new THREE.PlaneGeometry(1, 1, 16, 1).translate(0.5, 0, 0);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tongueT, color: HDR(0xffffff, 1.05), transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.renderOrder = 5; const up = r() < 0.65;
    tongues.push({ m, base: geo.attributes.position.array.slice(), a: up ? 0.35 + r() * 2.4 : r() * Math.PI * 2, l: 3.5 + r() * 5.5, w: 0.5 + r() * 0.5, bend: (r() - 0.5) * 1.6, d: r() * 0.12, ph: r() * 7 });
    g.add(m);
  }
  const NE = Math.round(200 * tier.particles); const ep = new Float32Array(NE * 3); const ed = []; for (let i = 0; i < NE; i++) ed.push([r() - 0.5, r() * 0.9, r() - 0.5, 1 + r() * 3]);
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  const dot = glowTex((c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,220,140,1)'); gr.addColorStop(0.4, 'rgba(255,90,10,0.85)'); gr.addColorStop(1, 'rgba(120,10,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, w); }, 32, 32);
  const em = new THREE.Points(eg, new THREE.PointsMaterial({ map: dot, color: HDR(0xffffff, 1.8), size: 0.12, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(em);
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTex((c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,230,200,0.7)'); gr.addColorStop(1, 'rgba(255,160,120,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, w); }, 128, 128), color: HDR(0xffffff, 1.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  g.add(flash);
  const camR = new THREE.Vector3(), camU = new THREE.Vector3(), camF = new THREE.Vector3(), dir = new THREE.Vector3(), side = new THREE.Vector3();
  return {
    group: g,
    update(lt, camera) {
      g.visible = lt >= 0 && lt < 1.8; if (!g.visible) return;
      flash.quaternion.copy(camera.quaternion);
      const fk = lt < 0.12 ? smooth(lt / 0.04) * (1 - smooth((lt - 0.05) / 0.07)) : 0; flash.scale.setScalar(0.8 + lt * 3); flash.material.opacity = fk; flash.position.y = 0.7;
      const bt = lt - 0.1;
      const grow = bt < 0 ? 0 : smooth(bt / 0.14) * (1 - smooth((bt - 0.75) / 0.4));
      const R = 0.05 + grow * (1.35 + bt * 0.45);
      ball.scale.setScalar(R); ball.position.y = 1.05 + Math.max(0, bt) * 0.25; ball.material.uniforms.t.value = lt; ball.material.uniforms.k.value = grow; ball.visible = grow > 0.01;
      glowB.quaternion.copy(camera.quaternion); glowB.position.copy(ball.position); glowB.scale.setScalar(R * 3.2); glowB.material.opacity = grow * 0.6;
      camera.matrixWorld.extractBasis(camR, camU, camF);
      for (const tg of tongues) {
        const tt = bt - tg.d;
        const rk = tt < 0 ? 0 : smooth(tt / 0.08) * (1 - smooth((tt - 0.35) / 0.45));
        tg.m.visible = rk > 0.01; if (!tg.m.visible) continue;
        // 屏幕平面内的方向（朝镜头的面片），沿路径弯曲；长度随时间拉长（拖尾）
        dir.copy(camR).multiplyScalar(Math.cos(tg.a)).addScaledVector(camU, Math.sin(tg.a));
        side.copy(camF).cross(dir).normalize();
        const L = tg.l * (0.35 + Math.min(tt, 0.5) * 1.6), W = tg.w * (0.8 + Math.min(tt, 0.4));
        const pa = tg.m.geometry.attributes.position.array, b = tg.base;
        for (let i = 0; i < pa.length; i += 3) {
          const u = b[i], v = b[i + 1];
          const bend = tg.bend * u * u + 0.12 * Math.sin(u * 6 + lt * 14 + tg.ph) * u;
          pa[i] = dir.x * u * L + side.x * (v * W + bend * L * 0.25);
          pa[i + 1] = dir.y * u * L + side.y * (v * W + bend * L * 0.25);
          pa[i + 2] = dir.z * u * L + side.z * (v * W + bend * L * 0.25);
        }
        tg.m.geometry.attributes.position.needsUpdate = true;
        tg.m.position.copy(ball.position).addScaledVector(dir, R * 0.55);
        tg.m.material.opacity = rk;
      }
      for (let i = 0; i < NE; i++) { const d = ed[i]; const tt = Math.max(0, bt); ep[i * 3] = d[0] * d[3] * tt * 2.0; ep[i * 3 + 1] = 0.4 + d[1] * tt * 3.0 - tt * tt * 0.6; ep[i * 3 + 2] = d[2] * d[3] * tt * 2.0; }
      eg.attributes.position.needsUpdate = true; em.material.opacity = bt < 0 ? 0 : Math.max(0, 1 - bt / 1.6); em.visible = bt > 0;
    },
  };
}
