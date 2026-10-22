// 竞技场：参考 P5R 挑战战斗（紫色地面金色花纹、深蓝看台阴影观众红眼、斜立蓝钢柱、青色霓虹标、飘落光点）。
import * as THREE from 'three';
import { toonMat, SHARED } from './toon.js';

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function floorTexture() {
  const S = 2048, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); const R = S / 2;
  const grd = g.createRadialGradient(R, R, 0, R, R, R);
  grd.addColorStop(0, '#8e6cb4'); grd.addColorStop(0.55, '#8060a8'); grd.addColorStop(0.85, '#654a92'); grd.addColorStop(1, '#3e2c66');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  const r = rng(7);
  // 石面斑驳
  for (let i = 0; i < 2600; i++) { const x = r() * S, y = r() * S, rr = 4 + r() * 40; g.fillStyle = `rgba(${r() < 0.5 ? '40,20,70' : '150,120,190'},${0.03 + r() * 0.05})`; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
  g.translate(R, R);
  const gold = 'rgba(214,170,96,0.82)', goldD = 'rgba(150,108,52,0.7)';
  g.lineCap = 'round';
  const ring = (rad, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(0, 0, rad, 0, 7); g.stroke(); };
  ring(R * 0.95, 10, goldD); ring(R * 0.92, 5, gold); ring(R * 0.62, 7, gold); ring(R * 0.585, 3, goldD); ring(R * 0.2, 6, gold);
  // 月桂叶环
  const leaf = (rad, a, s, flip) => {
    g.save(); g.rotate(a); g.translate(rad, 0); g.rotate(flip ? -0.9 : 0.9 + Math.PI);
    g.fillStyle = gold; g.beginPath(); g.ellipse(0, 0, s, s * 0.32, 0, 0, 7); g.fill();
    g.strokeStyle = goldD; g.lineWidth = 2; g.beginPath(); g.moveTo(-s, 0); g.lineTo(s, 0); g.stroke(); g.restore();
  };
  for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2; leaf(R * 0.75, a, 34, false); leaf(R * 0.79, a + 0.03, 30, true); }
  g.strokeStyle = gold; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, R * 0.77, 0, 7); g.stroke();
  // 大卷草纹
  g.lineWidth = 9; g.strokeStyle = gold;
  for (let k = 0; k < 6; k++) {
    g.save(); g.rotate(k / 6 * Math.PI * 2);
    g.beginPath(); g.moveTo(R * 0.22, 0); g.bezierCurveTo(R * 0.32, R * 0.16, R * 0.46, -R * 0.12, R * 0.56, R * 0.06); g.stroke();
    g.beginPath(); g.arc(R * 0.5, R * 0.1, R * 0.05, 0.3, 5.2); g.stroke();
    g.beginPath(); g.arc(R * 0.34, -R * 0.02, R * 0.035, 2.5, 8.2); g.stroke();
    g.restore();
  }
  // 外圈刻字带
  g.fillStyle = goldD; g.font = 'bold 44px serif';
  for (let i = 0; i < 48; i++) { g.save(); g.rotate(i / 48 * Math.PI * 2); g.translate(0, -R * 0.865); g.fillText('ⅠⅤⅩ'.charAt(i % 3), -12, 14); g.restore(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function crowdTexture() {
  const W = 2048, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); const r = rng(3);
  g.fillStyle = '#04060f'; g.fillRect(0, 0, W, H);
  for (let row = 0; row < 5; row++) {
    const y = H - 40 - row * 92, sc = 1 - row * 0.1;
    for (let x = -20; x < W + 40; x += 34 + r() * 22) {
      const hh = (70 + r() * 40) * sc, ww = (30 + r() * 16) * sc;
      g.fillStyle = r() < 0.18 ? `rgb(${30 + row * 6},${52 + row * 8},${120 + row * 12})` : `rgb(${8 + row * 2},${11 + row * 3},${28 + row * 5})`;
      g.beginPath(); g.ellipse(x, y - hh, ww * 0.42, ww * 0.5, 0, 0, 7); g.fill();
      g.beginPath(); g.moveTo(x - ww, y + 10); g.quadraticCurveTo(x - ww * 0.8, y - hh * 0.8, x, y - hh * 0.75); g.quadraticCurveTo(x + ww * 0.8, y - hh * 0.8, x + ww, y + 10); g.fill();
      if (r() < 0.22) { g.fillStyle = r() < 0.8 ? '#ff2a2a' : '#ffd23a'; const ey = y - hh - 2; g.fillRect(x - 7 * sc, ey, 4 * sc, 3 * sc); g.fillRect(x + 3 * sc, ey, 4 * sc, 3 * sc); }
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.x = 3;
  return t;
}

function glowRing(col = 0x2ee6ff) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.shadowColor = '#3cf'; g.shadowBlur = 30; g.strokeStyle = '#9ff6ff'; g.lineWidth = 18;
  g.beginPath(); g.ellipse(128, 128, 60, 90, 0, 0, 7); g.stroke();
  g.lineWidth = 8; g.beginPath(); g.ellipse(128, 128, 30, 52, 0, 0, 7); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: col, fog: false });
}

export function buildArena(scene) {
  scene.background = new THREE.Color(0x03050f);
  scene.fog = new THREE.Fog(SHARED.fogCol.value.getHex(), SHARED.fogNear.value, SHARED.fogFar.value);
  const g = new THREE.Group(); scene.add(g);
  // 地面
  const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 128), floorMat(floorTexture()));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const outer = new THREE.Mesh(new THREE.RingGeometry(14, 40, 96), new THREE.MeshBasicMaterial({ color: 0x1a1430 }));
  outer.rotation.x = -Math.PI / 2; outer.position.y = -0.01; g.add(outer);
  // 场边矮墙
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(14.6, 14.6, 1.1, 96, 1, true), toonMat({ color: 0x1c2442, shadeTint: 0x55608a, rim: 0.2, side: THREE.BackSide }));
  wall.position.y = 0.55; g.add(wall);
  // 看台观众
  const crowd = new THREE.Mesh(new THREE.CylinderGeometry(24, 21, 12, 96, 1, true), new THREE.MeshBasicMaterial({ map: crowdTexture(), side: THREE.BackSide, fog: false, color: 0x40405c }));
  crowd.position.y = 6.2; g.add(crowd);
  // 斜立钢柱 + 霓虹
  const r = rng(11);
  const pm = toonMat({ color: 0x2c3a5e, shadeTint: 0x2a3150, rim: 0.5 });
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + 0.13;
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.1, 18, 0.8), pm);
    const rad = 15.6 + r() * 1.5;
    p.position.set(Math.cos(a) * rad, 7, Math.sin(a) * rad);
    p.lookAt(0, 7, 0); p.rotateZ((r() - 0.5) * 0.35); p.rotateX(-0.12);
    g.add(p);
    if (i % 3 === 0) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), glowRing());
      s.position.set(Math.cos(a) * (rad - 0.6), 4.2 + r() * 2, Math.sin(a) * (rad - 0.6)); s.lookAt(0, s.position.y, 0); g.add(s);
    }
  }
  // 青色光带（参考帧左上）
  const band = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.7), new THREE.MeshBasicMaterial({ color: 0x18d6ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, fog: false }));
  band.position.set(-10, 6.5, -11); band.lookAt(0, 6.5, 0); g.add(band);
  // 背景幽蓝火焰（参考帧上方蓝色剪影光）
  const fc = document.createElement('canvas'); fc.width = 128; fc.height = 256; const fg = fc.getContext('2d');
  const fgr = fg.createRadialGradient(64, 170, 4, 64, 150, 120); fgr.addColorStop(0, 'rgba(90,140,255,0.9)'); fgr.addColorStop(0.5, 'rgba(40,70,200,0.35)'); fgr.addColorStop(1, 'rgba(10,20,80,0)');
  fg.fillStyle = fgr; fg.beginPath(); fg.moveTo(64, 0); fg.bezierCurveTo(130, 120, 128, 256, 64, 256); fg.bezierCurveTo(0, 256, -2, 120, 64, 0); fg.fill();
  const ftex = new THREE.CanvasTexture(fc);
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2 + r(); const rad = 19;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(3 + r() * 3, 6 + r() * 5), new THREE.MeshBasicMaterial({ map: ftex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.06 + r() * 0.12 }));
    f.position.set(Math.cos(a) * rad, 5 + r() * 3, Math.sin(a) * rad); f.lookAt(0, f.position.y, 0); g.add(f);
  }
  // 飘落光点
  const N = 500, pos = new Float32Array(N * 3); const pr = rng(5);
  for (let i = 0; i < N; i++) { const a = pr() * 7, rr = Math.sqrt(pr()) * 13; pos[i * 3] = Math.cos(a) * rr; pos[i * 3 + 1] = pr() * 9; pos[i * 3 + 2] = Math.sin(a) * rr; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: dotTex(), color: 0xcfe6ff, size: 0.09, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(pts);
  const base = pos.slice();
  return {
    update(t) {
      for (let i = 0; i < N; i++) { pos[i * 3 + 1] = ((base[i * 3 + 1] - t * (0.25 + (i % 7) * 0.04)) % 9 + 9) % 9; pos[i * 3] = base[i * 3] + Math.sin(t * 0.7 + i) * 0.15; }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

export function blobShadow(rad = 0.6) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, 'rgba(10,0,25,0.75)'); grd.addColorStop(1, 'rgba(10,0,25,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(rad * 2, rad * 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.01; return m;
}

function dotTex() { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32); grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.3, 'rgba(200,230,255,0.7)'); grd.addColorStop(1, 'rgba(120,170,255,0)'); g.fillStyle = grd; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }

function floorMat(map) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, fogCol: SHARED.fogCol, fogNear: SHARED.fogNear, fogFar: SHARED.fogFar },
    vertexShader: `varying vec2 vUv; varying vec3 vV; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vec4 mv=viewMatrix*w; vV=-mv.xyz; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 fogCol; uniform float fogNear; uniform float fogFar; varying vec2 vUv; varying vec3 vV; varying vec3 vW;
      void main(){ vec3 c=texture2D(map,vUv).rgb; vec3 V=normalize(cameraPosition-vW); float gr=1.-abs(V.y); float sheen=pow(gr,14.)*0.55;
        float d=length(vW.xz); c*=0.68+0.24*smoothstep(13.5,3.,d);
        c=mix(c, vec3(0.78,0.70,0.95), sheen);
        float fd=smoothstep(fogNear,fogFar,length(vV)); c=mix(c,fogCol,fd*0.45);
        gl_FragColor=vec4(c,1.);
        #include <colorspace_fragment>
      }`,
  });
}
