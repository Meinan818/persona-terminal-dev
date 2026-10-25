// r7 打击感（Hark）：顿帧时长 / 震屏 / 命中火花 / 受击后仰位移。
// 原版命中 VFX（effect/physical_attack/eff_0200xx 的 bullet_sphere、Fire02_flash、shockwave_2x2 等贴图）在 P5T 包里有，但还没导出到 umbra-assets
// → 本文件的火花是自制（程序化星形闪光 + 冲击环 + 放射线），已标明，等 Codex 导出后换原版贴图。
import * as THREE from 'three';

export interface HitSpec { ratio: number; heavy: boolean; kind: 'gun' | 'melee' | 'skill' | 'other' }
/** 顿帧毫秒（P5T 观感：普通 ~60ms，弱点/暴击/打倒 ~120ms） */
export const hitstopMs = (h: HitSpec) => Math.round((h.heavy ? 115 : 55) + Math.min(1, h.ratio) * 50 + (h.kind === 'melee' ? 15 : 0));

// ---------- 震屏 ----------
let shakeAmp = 0, shakeT0 = 0, shakeDur = 1, shakeSeed = 1;
export function shake(h: HitSpec) {
  const a = 0.05 + Math.min(1, h.ratio) * 0.16 + (h.heavy ? 0.12 : 0) + (h.kind === 'melee' ? 0.03 : 0);
  if (a < shakeAmp * currentFall()) return;
  shakeAmp = a; shakeT0 = performance.now(); shakeDur = h.heavy ? 380 : 240; shakeSeed = Math.random() * 100;
}
const currentFall = () => { const k = (performance.now() - shakeT0) / shakeDur; return k >= 1 ? 0 : (1 - k) * (1 - k); };
const off = new THREE.Vector3();
/** 渲染前：给相机加偏移（世界单位，沿相机右/上）；返回偏移以便渲染后撤回 */
export function applyShake(cam: THREE.Camera, worldPerPx = 0): THREE.Vector3 | null {
  const f = currentFall();
  if (f <= 0 || shakeAmp <= 0) { shakeAmp = 0; return null; }
  const t = (performance.now() - shakeT0) / 1000;
  const a = shakeAmp * f * (worldPerPx > 0 ? 1 : 1);
  const sx = Math.sin(t * 61 + shakeSeed) * 0.7 + Math.sin(t * 97 + shakeSeed * 2) * 0.3;
  const sy = Math.cos(t * 53 + shakeSeed * 3) * 0.7 + Math.sin(t * 83 + shakeSeed) * 0.3;
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
  off.copy(right).multiplyScalar(sx * a).addScaledVector(up, sy * a);
  cam.position.add(off); cam.updateMatrixWorld();
  return off;
}
export function undoShake(cam: THREE.Camera, o: THREE.Vector3 | null) { if (o) { cam.position.sub(o); cam.updateMatrixWorld(); } }

// ---------- 命中火花（自制） ----------
let starTex: THREE.Texture | null = null;
function tex() {
  if (starTex) return starTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,250,210,1)'); gr.addColorStop(0.45, 'rgba(255,170,40,.55)'); gr.addColorStop(1, 'rgba(255,60,0,0)');
  g.fillStyle = gr; g.beginPath();
  const N = 8;
  for (let i = 0; i < N * 2; i++) { const r = i % 2 ? 16 : 64; const a = (i / (N * 2)) * Math.PI * 2; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); }
  g.closePath(); g.fill();
  starTex = new THREE.CanvasTexture(c); starTex.colorSpace = THREE.SRGBColorSpace;
  return starTex;
}
interface Live { o: THREE.Object3D; t0: number; dur: number; step: (k: number) => void }
const lives: Live[] = [];
export function spark(parent: THREE.Object3D, at: THREE.Vector3, h: HitSpec, color = 0xffffff) {
  const s0 = 0.55 + Math.min(1, h.ratio) * 0.5 + (h.heavy ? 0.45 : 0);
  // 1) 星形闪光（加色，面向相机）
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(), color, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true }));
  sp.position.copy(at); sp.renderOrder = 60; sp.material.rotation = Math.random() * Math.PI;
  parent.add(sp);
  lives.push({ o: sp, t0: performance.now(), dur: 200, step: (k) => { const s = s0 * (0.5 + 1.1 * Math.sqrt(k)); sp.scale.set(s, s, 1); sp.material.opacity = 1 - k * k; } });
  // 2) 冲击环
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 32), new THREE.MeshBasicMaterial({ color: h.heavy ? 0xffd400 : 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
  ring.position.copy(at); ring.renderOrder = 61;
  parent.add(ring);
  lives.push({ o: ring, t0: performance.now(), dur: 260, step: (k) => { ring.quaternion.copy((parent as THREE.Object3D & { __camQ?: THREE.Quaternion }).__camQ ?? ring.quaternion); const s = s0 * (0.3 + 1.4 * k); ring.scale.set(s, s, s); (ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k); } });
  // 3) 放射线（近战/重击多一些）
  const n = h.kind === 'melee' || h.heavy ? 9 : 6;
  const pos = new Float32Array(n * 6); const dirs: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) dirs.push(new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 - 0.2, Math.random() - 0.5).normalize());
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xfff2b0, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false }));
  lines.position.copy(at); lines.renderOrder = 62; lines.frustumCulled = false;
  parent.add(lines);
  lives.push({ o: lines, t0: performance.now(), dur: 220, step: (k) => {
    const r0 = s0 * (0.15 + 0.8 * k), r1 = s0 * (0.35 + 1.2 * Math.sqrt(k));
    dirs.forEach((d, i) => { pos.set([d.x * r0, d.y * r0, d.z * r0, d.x * r1, d.y * r1, d.z * r1], i * 6); });
    geo.attributes.position.needsUpdate = true; (lines.material as THREE.LineBasicMaterial).opacity = 1 - k;
  } });
}
/** 每帧推进火花；顿帧期间也推进（火花在冻结的画面上炸开 = P5 式命中定格） */
export function updateHitFx(cam: THREE.Camera, root: THREE.Object3D) {
  (root as THREE.Object3D & { __camQ?: THREE.Quaternion }).__camQ = cam.quaternion;
  const now = performance.now();
  for (let i = lives.length - 1; i >= 0; i--) {
    const l = lives[i]; const k = Math.min(1, (now - l.t0) / l.dur);
    l.step(k);
    if (k >= 1) {
      l.o.removeFromParent();
      const m = l.o as THREE.Mesh; m.geometry?.dispose?.(); (m.material as THREE.Material)?.dispose?.();
      lives.splice(i, 1);
    }
  }
}

// ---------- 受击后仰（沿攻击方向推开再弹回） ----------
export function recoil(obj: THREE.Object3D, dir: THREE.Vector3, h: HitSpec) {
  const d = dir.clone().setY(0); if (d.lengthSq() < 1e-6) return;
  d.normalize().multiplyScalar(0.1 + Math.min(1, h.ratio) * 0.12 + (h.heavy ? 0.1 : 0));
  const base = obj.position.clone(); const t0 = performance.now(); const dur = h.heavy ? 300 : 220;
  let lastOff = new THREE.Vector3();
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / dur);
    const e = k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75; // 快推慢回
    const o = d.clone().multiplyScalar(Math.max(0, e) * (k < 0.25 ? 1 : 1 - 0.0));
    obj.position.sub(lastOff).add(o); lastOff = o;
    if (k < 1) requestAnimationFrame(step); else { obj.position.sub(lastOff); void base; }
  };
  step();
}
