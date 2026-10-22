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

function flameTex() {
  return glowTex((g, w, h) => {
    // 尖刺状火焰：底宽顶尖，中心白，外圈蓝
    for (let i = 0; i < 3; i++) {
      const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, ['rgba(80,120,255,0.9)', 'rgba(140,190,255,0.95)', 'rgba(255,255,255,1)'][i]); gr.addColorStop(1, 'rgba(40,60,255,0)');
      g.fillStyle = gr; const k = 1 - i * 0.3;
      g.beginPath(); g.moveTo(w * (0.5 - 0.45 * k), h); g.quadraticCurveTo(w * (0.5 - 0.12 * k), h * 0.45, w * 0.5, h * (0.02 + i * 0.12)); g.quadraticCurveTo(w * (0.5 + 0.12 * k), h * 0.45, w * (0.5 + 0.45 * k), h); g.fill();
    }
  }, 64, 256);
}

/** 脚下蓝焰：一圈朝镜头的尖刺火焰（原作召唤者脚下的蓝色火焰冠） */
export function makeBlueFlame(tier) {
  const g = new THREE.Group(); const t = flameTex(); const r = rng(31);
  const N = Math.round(26 * Math.max(0.5, tier.particles));
  const items = [];
  for (let i = 0; i < N; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ map: t, color: HDR(i % 3 ? 0x4a6bff : 0x8fd0ff, 2.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    const a = r() * Math.PI * 2, rr = 0.15 + r() * 0.42;
    items.push({ m, a, rr, h: 0.35 + r() * 0.9, w: 0.12 + r() * 0.16, ph: r() * 10, sp: 6 + r() * 6, tilt: (r() - 0.5) * 0.5 });
    g.add(m);
  }
  const glow = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ map: glowTex((c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(140,200,255,1)'); gr.addColorStop(0.4, 'rgba(60,90,255,0.5)'); gr.addColorStop(1, 'rgba(0,0,80,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, w); }, 128, 128), color: HDR(0xffffff, 1.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.02; g.add(glow);
  return {
    group: g,
    update(t, k, camera) {
      g.visible = k > 0.001;
      if (!g.visible) return;
      for (const it of items) {
        const fl = 0.75 + 0.25 * Math.sin(t * it.sp + it.ph) + 0.12 * Math.sin(t * it.sp * 2.3 + it.ph * 3);
        it.m.position.set(Math.cos(it.a) * it.rr, 0, Math.sin(it.a) * it.rr);
        it.m.scale.set(it.w * (0.8 + 0.4 * k), it.h * fl * k * (1.3 - it.rr), 1);
        // 只绕 y 轴朝镜头（圆柱公告板）
        const wp = it.m.getWorldPosition(new THREE.Vector3());
        it.m.rotation.set(0, Math.atan2(camera.position.x - wp.x, camera.position.z - wp.z), it.tilt);
        it.m.material.opacity = Math.min(1, k * 1.3);
      }
      glow.scale.setScalar(0.9 + 0.2 * Math.sin(t * 9)); glow.material.opacity = k;
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
  const NF = Math.round(60 * tier.particles), NS = Math.round(100 * tier.particles);
  const fm = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.07, 0.17), new THREE.MeshBasicMaterial({ map: featherTex(), color: HDR(0xffffff, 1.25), transparent: true, alphaTest: 0.05, side: THREE.DoubleSide, depthWrite: false, fog: false }), NF);
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
        const tt = Math.max(0, lt - f.d); const out = f.sp * (1 - Math.exp(-tt * 2.2)) * 0.9;
        p.set(Math.cos(f.a) * Math.cos(f.el) * out, Math.sin(f.el) * out - tt * tt * 0.12 - tt * 0.25, Math.sin(f.a) * Math.cos(f.el) * out).add(origin);
        p.x += Math.sin(tt * 2 + f.ph) * 0.25;
        q.setFromAxisAngle(f.ax, tt * f.rs + f.ph); sc.setScalar(tt > 0 ? 1.4 : 0);
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

/** 晶翼：两侧各 7 片长刃羽（白→青渐变 HDR），从收拢到展开 */
export function makeWings() {
  const g = new THREE.Group();
  const blade = (len, wid) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, wid * 0.5, len * 0.35, 0, 0, len, 0, -wid * 0.35, len * 0.3, 0], 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute([0.3, 0.42, 0.8, 0.85, 0.82, 0.72, 1.0, 1.05, 1.25, 0.55, 0.62, 0.85], 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]); return geo;
  };
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, side: THREE.DoubleSide, depthWrite: true, fog: false });
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0x0a1030, side: THREE.FrontSide, fog: false }); // 只从正面看到描边层；背面看是白刃
  const glowMat = new THREE.MeshBasicMaterial({ color: HDR(0x3a7cff, 0.7), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const bl = [];
  for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
    const len = 1.3 + Math.sin(i / 6 * Math.PI) * 0.9, wid = 0.26 - i * 0.012;
    const m = new THREE.Mesh(blade(len, wid), mat); const pv = new THREE.Group(); pv.add(m);
    const back = new THREE.Mesh(blade(len * 1.05, wid * 1.45).translate(0, -len * 0.02, 0), edgeMat); back.position.z = -0.012; pv.add(back);
    const glowB = new THREE.Mesh(blade(len * 1.12, wid * 2.2).translate(0, -len * 0.04, 0), glowMat); glowB.position.z = -0.03; pv.add(glowB);
    g.add(pv); bl.push({ pv, side, i });
  }
  return {
    group: g,
    update(t, open, k) {
      g.visible = k > 0.01; if (!g.visible) return;
      for (const b of bl) {
        const spread = (-0.2 + b.i * 0.33) * open + 0.15 * (1 - open);
        b.pv.rotation.set(0.15 * Math.sin(t * 1.8 + b.i), 0.35 * b.side, b.side * -(0.35 + spread) + Math.sin(t * 2.4 + b.i * 0.5) * 0.03 * open);
        b.pv.position.set(b.side * 0.12, 0, -0.05 - b.i * 0.012);
        b.pv.scale.setScalar(0.35 + 0.65 * open);
      }
      mat.opacity = k; glowMat.opacity = 0.5 * k; mat.transparent = k < 0.99;
    },
  };
}

/** 亚基（火球）：命中闪光 → 火球膨胀 + 放射火舌 + 余烬 */
export function makeFireball(tier) {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, k: { value: 0 } },
    vertexShader: `uniform float t; varying vec3 vN; varying vec3 vV; varying vec3 vP; float h(vec3 p){ return fract(sin(dot(p,vec3(12.9,78.2,37.7)))*43758.5); }
      void main(){ vP=position; vec3 p=position*(1.+0.12*sin(position.y*9.+t*20.)*sin(position.x*7.-t*14.)); vec4 mv=modelViewMatrix*vec4(p,1.); vN=normalize(normalMatrix*normal); vV=-mv.xyz; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform float t; uniform float k; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){ float fr = abs(dot(normalize(vN), normalize(vV))); float n = 0.5+0.5*sin(vP.x*11.+t*18.)*sin(vP.y*13.-t*22.)*sin(vP.z*9.+t*15.);
        vec3 core = vec3(1.45,0.95,0.4), mid = vec3(1.35,0.34,0.05), edge = vec3(0.75,0.06,0.02);
        vec3 c = mix(edge, mix(mid, core, smoothstep(0.55,0.95,fr)), smoothstep(0.1,0.6,fr*0.8+n*0.3));
        gl_FragColor = vec4(c*k, 1.); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  g.add(ball);
  const rayT = glowTex((c, w, h) => { const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.4, 'rgba(255,120,40,0.9)'); gr.addColorStop(1, 'rgba(200,20,0,0)'); c.fillStyle = gr; c.beginPath(); c.moveTo(0, h * 0.2); c.lineTo(w, h * 0.5); c.lineTo(0, h * 0.8); c.fill(); }, 256, 32);
  const rays = []; const r = rng(55);
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5).translate(0.5, 0, 0), new THREE.MeshBasicMaterial({ map: rayT, color: HDR(0xffffff, 2.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); m.material.depthTest = false; m.renderOrder = 5; rays.push({ m, a: r() * Math.PI * 2, l: 2.6 + r() * 3.2, e: (r() - 0.5) * 0.8 }); g.add(m); }
  const NE = Math.round(160 * tier.particles); const ep = new Float32Array(NE * 3); const ed = []; for (let i = 0; i < NE; i++) ed.push([r() - 0.5, r() * 0.9, r() - 0.5, 1 + r() * 3]);
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  const dot = glowTex((c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,230,160,1)'); gr.addColorStop(0.4, 'rgba(255,110,20,0.8)'); gr.addColorStop(1, 'rgba(120,10,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, w); }, 32, 32);
  const em = new THREE.Points(eg, new THREE.PointsMaterial({ map: dot, color: HDR(0xffffff, 2.0), size: 0.09, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(em);
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTex((c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,240,230,0.7)'); gr.addColorStop(1, 'rgba(255,200,200,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, w); }, 128, 128), color: HDR(0xffffff, 1.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  g.add(flash);
  return {
    group: g,
    /** lt：从命中闪光起算（0=闪光，0.1=火球） */
    update(lt, camera) {
      g.visible = lt >= 0 && lt < 1.6; if (!g.visible) return;
      flash.quaternion.copy(camera.quaternion);
      const fk = lt < 0.12 ? smooth(lt / 0.05) * (1 - smooth((lt - 0.06) / 0.08)) : 0; flash.scale.setScalar(0.8 + lt * 4); flash.material.opacity = fk; flash.position.y = 0.6;
      const bt = lt - 0.1;
      const grow = bt < 0 ? 0 : smooth(bt / 0.12) * (1 - smooth((bt - 0.55) / 0.35));
      ball.scale.setScalar(0.05 + grow * (0.85 + bt * 0.35)); ball.position.y = 0.6 + Math.max(0, bt) * 0.15; ball.material.uniforms.t.value = lt; ball.material.uniforms.k.value = grow;
      ball.visible = grow > 0.01;
      for (const ry of rays) {
        const rk = bt < 0 ? 0 : smooth(bt / 0.05) * (1 - smooth((bt - 0.2) / 0.35));
        ry.m.visible = rk > 0.01; ry.m.position.set(0, 0.6, 0);
        ry.m.quaternion.copy(camera.quaternion); ry.m.rotateZ(ry.a); ry.m.rotateY(ry.e);
        ry.m.scale.set(ry.l * (0.5 + Math.min(Math.max(0, bt), 0.4) * 2.5), 1 + Math.max(0, bt) * 1.5, 1); ry.m.material.opacity = rk;
      }
      for (let i = 0; i < NE; i++) { const d = ed[i]; const tt = Math.max(0, bt); ep[i * 3] = d[0] * d[3] * tt * 1.6; ep[i * 3 + 1] = 0.3 + d[1] * tt * 2.5 - tt * tt * 0.6; ep[i * 3 + 2] = d[2] * d[3] * tt * 1.6; }
      eg.attributes.position.needsUpdate = true; em.material.opacity = bt < 0 ? 0 : Math.max(0, 1 - bt / 1.4); em.visible = bt > 0;
    },
  };
}
