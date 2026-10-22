// 竞技场 v2：对照 P5R 108245 挑战战斗参考帧重做。
// 亮面反射地板（平面反射 + 模糊 + 菲涅尔）、深紫地面金色卷草/月桂纹（金线带一点自发光进 Bloom）、
// 近黑深藏青背景、幽蓝鬼影看台（红眼自发光）、斜立暗钢架、蓝色霓虹「0」环、左上青色霓虹条、地面闪粉 + 飘落光点。
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { toonMat, SHARED } from './toon.js';

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const HDR = (hex, k) => new THREE.Color(hex).multiplyScalar(k); // >1 的颜色才会进 Bloom

function floorTexture() {
  const S = 2048, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); const R = S / 2;
  const grd = g.createRadialGradient(R, R, 0, R, R, R);
  grd.addColorStop(0, '#94689e'); grd.addColorStop(0.45, '#82578e'); grd.addColorStop(0.8, '#5a3a72'); grd.addColorStop(1, '#2c1842');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  const r = rng(7);
  // 深色大块云斑（原作地面的暗藏青斑块）
  for (let i = 0; i < 140; i++) { const x = r() * S, y = r() * S, rr = 60 + r() * 260; const gg = g.createRadialGradient(x, y, 0, x, y, rr); gg.addColorStop(0, `rgba(18,8,52,${0.18 + r() * 0.28})`); gg.addColorStop(1, 'rgba(18,8,52,0)'); g.fillStyle = gg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  // 亮斑与细颗粒
  for (let i = 0; i < 90; i++) { const x = r() * S, y = r() * S, rr = 40 + r() * 160; const gg = g.createRadialGradient(x, y, 0, x, y, rr); gg.addColorStop(0, `rgba(170,140,210,${0.08 + r() * 0.12})`); gg.addColorStop(1, 'rgba(170,140,210,0)'); g.fillStyle = gg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  for (let i = 0; i < 9000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(20,10,40,0.25)' : 'rgba(200,180,230,0.12)'; g.fillRect(r() * S, r() * S, 2 + r() * 3, 2 + r() * 3); }
  g.translate(R, R);
  const gold = '#c98e48', goldD = '#94643a';
  g.lineCap = 'round'; g.lineJoin = 'round';
  const ring = (rad, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(0, 0, rad, 0, 7); g.stroke(); };
  ring(R * 0.955, 7, goldD); ring(R * 0.93, 4, gold); ring(R * 0.64, 5, gold); ring(R * 0.62, 2.5, goldD); ring(R * 0.17, 5, gold); ring(R * 0.15, 2, gold);
  // 月桂双环（叶片成对、沿环交错）
  const leaf = (rad, a, s, flip) => {
    g.save(); g.rotate(a); g.translate(rad, 0); g.rotate(flip ? -0.75 : 0.75 + Math.PI);
    g.fillStyle = gold; g.beginPath(); g.moveTo(-s, 0); g.quadraticCurveTo(0, -s * 0.42, s, 0); g.quadraticCurveTo(0, s * 0.42, -s, 0); g.fill();
    g.strokeStyle = goldD; g.lineWidth = 2; g.beginPath(); g.moveTo(-s * 0.9, 0); g.lineTo(s * 0.9, 0); g.stroke(); g.restore();
  };
  for (let i = 0; i < 80; i++) { const a = i / 80 * Math.PI * 2; leaf(R * 0.745, a, 30, false); leaf(R * 0.795, a + 0.035, 27, true); }
  g.strokeStyle = gold; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, R * 0.77, 0, 7); g.stroke();
  // 大卷草纹（主枝 + 回旋 + 分叉叶尖），8 组
  for (let k = 0; k < 8; k++) {
    g.save(); g.rotate(k / 8 * Math.PI * 2 + 0.2);
    g.strokeStyle = gold; g.lineWidth = 11;
    g.beginPath(); g.moveTo(R * 0.19, 0); g.bezierCurveTo(R * 0.3, R * 0.14, R * 0.42, -R * 0.15, R * 0.585, R * 0.02); g.stroke();
    g.lineWidth = 7;
    g.beginPath(); for (let i = 0; i <= 40; i++) { const a = 0.4 + i / 40 * 5.2, rr = R * 0.07 * (1 - i / 48); g.lineTo(R * 0.47 + Math.cos(a) * rr, R * 0.05 + Math.sin(a) * rr); } g.stroke();
    g.beginPath(); for (let i = 0; i <= 30; i++) { const a = 3 + i / 30 * 4.8, rr = R * 0.045 * (1 - i / 36); g.lineTo(R * 0.31 + Math.cos(a) * rr, -R * 0.0 + Math.sin(a) * rr); } g.stroke();
    g.lineWidth = 5;
    g.beginPath(); g.moveTo(R * 0.38, -R * 0.07); g.quadraticCurveTo(R * 0.43, -R * 0.2, R * 0.52, -R * 0.17); g.stroke();
    g.fillStyle = gold; g.beginPath(); g.ellipse(R * 0.53, -R * 0.165, 18, 7, -0.3, 0, 7); g.fill();
    g.restore();
  }
  // 外圈刻纹带
  g.fillStyle = goldD;
  for (let i = 0; i < 120; i++) { g.save(); g.rotate(i / 120 * Math.PI * 2); g.fillRect(-3, -R * 0.905, 6, 26 + (i % 2) * 12); g.restore(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function crowdTextures() {
  const W = 2048, H = 512;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const e = document.createElement('canvas'); e.width = W; e.height = H; const ge = e.getContext('2d');
  const r = rng(3);
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H); ge.fillStyle = '#000'; ge.fillRect(0, 0, W, H);
  for (let row = 0; row < 5; row++) {
    const y = H - 30 - row * 95, sc = 1.05 - row * 0.1;
    for (let x = -20; x < W + 40; x += 30 + r() * 26) {
      const hh = (70 + r() * 40) * sc, ww = (30 + r() * 16) * sc;
      // 剪影本体近黑，只有边缘一圈幽蓝（原作看台是幽蓝鬼影）
      g.fillStyle = `rgb(${10 + row * 3},${16 + row * 4},${60 + row * 10})`;
      g.beginPath(); g.ellipse(x, y - hh, ww * 0.44, ww * 0.52, 0, 0, 7); g.fill();
      g.beginPath(); g.moveTo(x - ww, y + 12); g.quadraticCurveTo(x - ww * 0.8, y - hh * 0.8, x, y - hh * 0.75); g.quadraticCurveTo(x + ww * 0.8, y - hh * 0.8, x + ww, y + 12); g.fill();
      g.fillStyle = '#02030c';
      g.beginPath(); g.ellipse(x, y - hh + 3, ww * 0.36, ww * 0.44, 0, 0, 7); g.fill();
      g.beginPath(); g.moveTo(x - ww * 0.85, y + 14); g.quadraticCurveTo(x - ww * 0.7, y - hh * 0.72, x, y - hh * 0.68); g.quadraticCurveTo(x + ww * 0.7, y - hh * 0.72, x + ww * 0.85, y + 14); g.fill();
      if (r() < 0.16) { ge.fillStyle = r() < 0.85 ? '#ff2020' : '#ffcc30'; const ey = y - hh - 2; ge.fillRect(x - 8 * sc, ey, 5 * sc, 3 * sc); ge.fillRect(x + 3 * sc, ey, 5 * sc, 3 * sc); }
    }
  }
  const mk = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.x = 3; return t; };
  return [mk(c), mk(e)];
}

function glowTex(draw, w = 256, h = 256) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const addMat = (map, col, k, op = 1) => new THREE.MeshBasicMaterial({ map, color: HDR(col, k), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });

function zeroSign() {
  return glowTex((g, w, h) => {
    g.shadowColor = '#4af'; g.shadowBlur = 26; g.strokeStyle = '#bfe8ff'; g.lineWidth = 20;
    g.beginPath(); g.ellipse(w / 2, h / 2, 62, 96, 0, 0, 7); g.stroke();
    g.lineWidth = 7; g.beginPath(); g.ellipse(w / 2, h / 2, 36, 64, 0, 0, 7); g.stroke();
  });
}

const FloorShader = {
  uniforms: {
    color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
    map: { value: null }, reflStr: { value: 0.42 }, blur: { value: 1.0 }, texel: { value: new THREE.Vector2(1 / 512, 1 / 512) }, time: { value: 0 },
    fogCol: SHARED.fogCol, fogNear: SHARED.fogNear, fogFar: SHARED.fogFar,
  },
  vertexShader: /* glsl */`
    uniform mat4 textureMatrix; varying vec4 vRuv; varying vec2 vUv; varying vec3 vW; varying vec3 vV;
    void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vRuv=textureMatrix*vec4(position,1.); vec4 mv=viewMatrix*w; vV=-mv.xyz; gl_Position=projectionMatrix*mv; }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform sampler2D map; uniform float reflStr; uniform float blur; uniform vec2 texel; uniform float time;
    uniform vec3 fogCol; uniform float fogNear; uniform float fogFar;
    varying vec4 vRuv; varying vec2 vUv; varying vec3 vW; varying vec3 vV;
    float h12(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h12(i),h12(i+vec2(1,0)),f.x),mix(h12(i+vec2(0,1)),h12(i+1.),f.x),f.y); }
    void main(){
      vec3 base = texture2D(map, vUv).rgb;
      float gold = smoothstep(0.08, 0.22, base.r - base.b);
      vec3 V = normalize(cameraPosition - vW);
      float fres = mix(0.18, 0.95, pow(1. - abs(V.y), 3.0));
      // 地面微起伏扭曲反射（不是镜面，是打磨石面）
      vec2 n = vec2(vn(vW.xz*3.1)-.5, vn(vW.xz*3.1+17.)-.5) * 0.012;
      vec2 ruv = vRuv.xy / vRuv.w + n;
      vec3 refl = vec3(0.);
      vec2 o = texel * 2.5 * blur;
      refl += texture2D(tDiffuse, ruv).rgb * 0.28;
      refl += texture2D(tDiffuse, ruv + vec2(o.x, 0.)).rgb * 0.12; refl += texture2D(tDiffuse, ruv - vec2(o.x, 0.)).rgb * 0.12;
      refl += texture2D(tDiffuse, ruv + vec2(0., o.y*2.)).rgb * 0.16; refl += texture2D(tDiffuse, ruv - vec2(0., o.y*2.)).rgb * 0.16;
      refl += texture2D(tDiffuse, ruv + vec2(0., o.y*5.)).rgb * 0.08; refl += texture2D(tDiffuse, ruv - vec2(0., o.y*5.)).rgb * 0.08;
      float d = length(vW.xz);
      vec3 c = base * (0.5 + 0.28 * smoothstep(13.5, 2.5, d));
      c = mix(c, c * vec3(0.95, 0.8, 0.75), gold * 0.4) + base * gold * 0.18;                  // 金线微自发光
      c += refl * fres * reflStr * (1. - gold * 0.6);
      // 闪粉（屏幕外也稳定：按世界坐标网格）
      vec2 gp = vW.xz * 9.; vec2 gi = floor(gp); float sp = h12(gi);
      float tw = step(0.985, sp) * smoothstep(0.35, 0.0, length(fract(gp)-.5)) * (0.5 + 0.5*sin(time*3. + sp*40.));
      c += vec3(0.6,0.85,1.6) * tw * 0.9;
      float fd = smoothstep(fogNear, fogFar, length(vV)); c = mix(c, fogCol, fd*0.55);
      c *= smoothstep(14.2, 12.8, d) * 0.85 + 0.15;
      gl_FragColor = vec4(c, 1.);
    }`,
};

export function buildArena(scene, tier) {
  scene.background = new THREE.Color(0x010210);
  const g = new THREE.Group(); scene.add(g);
  // —— 反射地板 ——
  const w0 = Math.round(window.innerWidth * (window.devicePixelRatio || 1) * tier.reflScale), h0 = Math.round(window.innerHeight * (window.devicePixelRatio || 1) * tier.reflScale);
  const floor = new Reflector(new THREE.CircleGeometry(14, 128), { shader: FloorShader, textureWidth: w0, textureHeight: h0, clipBias: 0.003, multisample: 0, color: 0xffffff });
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const fu = floor.material.uniforms; fu.map.value = floorTexture(); fu.blur.value = tier.reflBlur; fu.texel.value.set(1 / w0, 1 / h0);
  floor.userData.noReflect = true;
  // 场外暗环
  const outer = new THREE.Mesh(new THREE.RingGeometry(14, 40, 96), new THREE.MeshBasicMaterial({ color: 0x07051a }));
  outer.rotation.x = -Math.PI / 2; outer.position.y = -0.01; g.add(outer);
  // 场边矮墙 + 顶沿青色细霓虹
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(14.6, 14.6, 1.1, 96, 1, true), toonMat({ color: 0x0e1430, shadeTint: 0x3a4470, rim: 0.15, side: THREE.BackSide }));
  wall.position.y = 0.55; g.add(wall);
  const trim = new THREE.Mesh(new THREE.TorusGeometry(14.55, 0.025, 4, 160), new THREE.MeshBasicMaterial({ color: HDR(0x2a6cff, 0.7), fog: false }));
  trim.rotation.x = Math.PI / 2; trim.position.y = 1.1; g.add(trim);
  // 看台：剪影层 + 红眼自发光层
  const [ct, et] = crowdTextures();
  const crowd = new THREE.Mesh(new THREE.CylinderGeometry(24, 21, 12, 96, 1, true), new THREE.MeshBasicMaterial({ map: ct, side: THREE.BackSide, fog: false, color: 0x3a4a80 }));
  crowd.position.y = 6.6; g.add(crowd);
  const eyes = new THREE.Mesh(new THREE.CylinderGeometry(23.9, 20.9, 12, 96, 1, true), new THREE.MeshBasicMaterial({ map: et, side: THREE.BackSide, fog: false, color: HDR(0xffffff, 1.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  eyes.position.y = 6.6; g.add(eyes);
  // 斜立暗钢架（原作是笼状金属框，暗藏青、边缘有冷光）
  const r = rng(11);
  const pm = toonMat({ color: 0x141c34, shadeTint: 0x1a2038, rim: 0.55 });
  const edgeM = new THREE.MeshBasicMaterial({ color: HDR(0x2a4cc0, 0.55), fog: false });
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2 + 0.13;
    const rad = 15.4 + r() * 1.6;
    const grp = new THREE.Group(); grp.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad); grp.lookAt(0, 0, 0);
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.9, 22, 0.6), pm); p.position.y = 9; grp.add(p);
    const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 22, 0.05), edgeM); e1.position.set(0.47, 9, 0.31); grp.add(e1);
    if (i % 2 === 0) { const cb = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.25, 0.25), pm); cb.position.set(1.7, 3 + r() * 4, 0); cb.rotation.z = 0.5; grp.add(cb); }
    grp.rotateZ((r() - 0.5) * 0.3); grp.rotateX(-0.1);
    g.add(grp);
  }
  // 蓝色霓虹「0」环（原作背景墙上的发光符号）
  const zt = zeroSign();
  for (const [a, y, s] of [[-1.5, 6.4, 3.2], [2.6, 5.6, 2.6]]) {
    const z = new THREE.Mesh(new THREE.PlaneGeometry(s, s), addMat(zt, 0x5a90ff, 1.7)); z.position.set(Math.cos(a) * 15.1, y, Math.sin(a) * 15.1); z.lookAt(0, y, 0); g.add(z);
  }
  // 左上青色霓虹条
  const barT = glowTex((g2, w, h) => { const gr = g2.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.3, '#7ff'); gr.addColorStop(0.7, '#7ff'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, w, h); }, 8, 64);
  for (const [a, y, wdt] of [[-2.25, 6.8, 7], [2.0, 7.4, 5]]) {
    const band = new THREE.Mesh(new THREE.PlaneGeometry(wdt, 0.75), addMat(barT, 0x18d6ff, 1.25, 0.8)); band.position.set(Math.cos(a) * 15.8, y, Math.sin(a) * 15.8); band.lookAt(0, y, 0); g.add(band);
  }
  // 幽蓝鬼影（背景高处的蓝色剪影光）
  const ftex = glowTex((fg, w, h) => {
    const fgr = fg.createRadialGradient(w / 2, h * 0.62, 4, w / 2, h * 0.55, h * 0.5); fgr.addColorStop(0, 'rgba(110,150,255,1)'); fgr.addColorStop(0.5, 'rgba(40,70,220,0.45)'); fgr.addColorStop(1, 'rgba(10,20,80,0)');
    fg.fillStyle = fgr; fg.beginPath(); fg.moveTo(w / 2, 0); fg.bezierCurveTo(w * 1.05, h * 0.45, w, h, w / 2, h); fg.bezierCurveTo(0, h, -w * 0.05, h * 0.45, w / 2, 0); fg.fill();
    fg.globalCompositeOperation = 'destination-out'; fg.fillStyle = 'rgba(0,0,0,0.7)'; fg.beginPath(); fg.ellipse(w * 0.38, h * 0.42, w * 0.06, h * 0.03, 0, 0, 7); fg.ellipse(w * 0.62, h * 0.42, w * 0.06, h * 0.03, 0, 0, 7); fg.fill();
  }, 128, 256);
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2 + r() * 0.3; const rad = 19.5;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(3.5 + r() * 3, 7 + r() * 5), addMat(ftex, 0x4a6cff, 0.8, 0.035 + r() * 0.06));
    f.position.set(Math.cos(a) * rad, 8.5 + r() * 3, Math.sin(a) * rad); f.lookAt(0, f.position.y, 0); g.add(f);
  }
  // 粒子：飘落光点 + 低空闪粉
  const dot = glowTex((dg, w) => { const grd = dg.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(200,230,255,0.8)'); grd.addColorStop(1, 'rgba(120,170,255,0)'); dg.fillStyle = grd; dg.fillRect(0, 0, w, w); }, 64, 64);
  const mkPts = (N, seed, hMax, size, col, k) => {
    const pos = new Float32Array(N * 3); const pr = rng(seed);
    for (let i = 0; i < N; i++) { const a = pr() * 7, rr = Math.sqrt(pr()) * 13; pos[i * 3] = Math.cos(a) * rr; pos[i * 3 + 1] = pr() * hMax; pos[i * 3 + 2] = Math.sin(a) * rr; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: dot, color: HDR(col, k), size, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    g.add(pts); return { pos, base: pos.slice(), geo, N, hMax };
  };
  const fall = mkPts(Math.round(520 * tier.particles), 5, 9, 0.08, 0xcfe6ff, 1.6);
  const glit = mkPts(Math.round(700 * tier.particles), 9, 0.9, 0.05, 0x7fe0ff, 2.2);
  return {
    floor,
    setTier(t) { fu.blur.value = t.reflBlur; },
    resize(w, h, dpr) { const rw = Math.max(64, Math.round(w * dpr * tier.reflScale)), rh = Math.max(64, Math.round(h * dpr * tier.reflScale)); floor.getRenderTarget().setSize(rw, rh); fu.texel.value.set(1 / rw, 1 / rh); },
    update(t) {
      fu.time.value = t;
      for (const P of [fall, glit]) {
        const sp = P === fall ? 0.25 : 0.05;
        for (let i = 0; i < P.N; i++) { P.pos[i * 3 + 1] = ((P.base[i * 3 + 1] - t * (sp + (i % 7) * sp * 0.15)) % P.hMax + P.hMax) % P.hMax; P.pos[i * 3] = P.base[i * 3] + Math.sin(t * 0.7 + i) * 0.15; }
        P.geo.attributes.position.needsUpdate = true;
      }
    },
  };
}

export function blobShadow(rad = 0.6) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, 'rgba(4,0,14,0.85)'); grd.addColorStop(1, 'rgba(4,0,14,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(rad * 2, rad * 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.012; return m;
}
