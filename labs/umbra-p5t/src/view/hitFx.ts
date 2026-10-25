// r7/r8 打击感（Hark）：顿帧时长 / 震屏 / 命中火花 / 受击后仰位移。
// r8：命中火花换成原版 physical_attack 贴图 + 原版 VFX Graph 参数重建（见下方说明）；顿帧/震屏/后仰的数值仍是自定。
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

// ---------- 命中火花：原版贴图 + 原版 VFX Graph 参数重建（r8，已标明为重建） ----------
// 贴图 = 原版 effect/physical_attack（Codex 3a56e5a）→ tools/fetch-p5t-fx.sh → public/p5t-fx/hit/*.webp（不入库）。
// Unity VFX Graph 不能直接跑 → 按原版系统结构重建（三角形 sprite + 翻页），取原版能确定的参数：
//   枪 = eff_020001_lw1：Impact×1（shotgun_Sheet_4x2 翻 8 帧，TexIndex 曲线 0→7.9；Impact_Yellow 渐变 (1,.92,.33)）、
//        Flare×1（Fire02_flash）、Shock×1（shockwave_2x2 翻 4 帧）、Fire_sub 容量 40（Grain 火星，HDR 渐变 (24,15,.63)→(24,.63,0)，α 1→.5）
//   近战 = eff_020201_lw1：impact×1（shockwave_2x2，TexIndex 0→4）、flare×1、line×5（Line，放射）、grenade_shot_fire×10（Grain，渐变 (1,.95,.03)→白）
// 未知（发布版字节码无语义名，Codex 未猜）：各系统寿命/尺寸/速度 → 按 P5T 观感取值（自定，已标明）。缺贴图 → 回退自制星形火花。
const FX = 'p5t-fx/hit/';
const texCache = new Map<string, THREE.Texture | null>();
const texLoader = new THREE.TextureLoader();
let fxOk: boolean | null = null;
function otex(name: string): THREE.Texture | null {
  if (texCache.has(name)) return texCache.get(name)!;
  texCache.set(name, null);
  texLoader.load(FX + name + '.webp', (t) => { t.colorSpace = THREE.SRGBColorSpace; texCache.set(name, t); fxOk = true; }, undefined, () => { if (fxOk === null) fxOk = false; });
  return null;
}
/** 预加载（关卡开始调用一次） */
export function preloadHitFx() { for (const n of ['shotgun_Sheet_4x2', 'shockwave_2x2', 'Fire02_flash', 'Grain', 'Line']) otex(n); }
const C = (r: number, g: number, b: number) => new THREE.Color(r, g, b);
/** HDR 渐变色（原版 >1）→ 加色混合里 clamp 前的亮度：除以最大分量再乘一点溢出感 */
const hdr = (r: number, g: number, b: number) => { const m = Math.max(r, g, b, 1); return C(r / m, g / m, b / m); };
function flip(name: string, cols: number, rows: number, color: THREE.Color, parent: THREE.Object3D, at: THREE.Vector3, size: number, dur: number, frames: number, rot = Math.random() * Math.PI * 2) {
  const base = otex(name); if (!base) return;
  const t = base.clone(); t.repeat.set(1 / cols, 1 / rows); t.needsUpdate = true;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, color, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true }));
  sp.material.rotation = rot; sp.position.copy(at); sp.renderOrder = 61; sp.scale.set(size, size, 1);
  parent.add(sp);
  lives.push({ o: sp, t0: performance.now(), dur, step: (k) => {
    const f = Math.min(frames - 1, Math.floor(k * frames)); // 原版 TexIndex 曲线线性 0→N
    t.offset.set((f % cols) / cols, 1 - (Math.floor(f / cols) + 1) / rows);
    sp.material.opacity = k < 0.8 ? 1 : (1 - k) / 0.2;
  }, extra: t });
}
function glow(name: string, color: THREE.Color, parent: THREE.Object3D, at: THREE.Vector3, s0: number, s1: number, dur: number, a0 = 1) {
  const tx = otex(name); if (!tx) return;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, color, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true }));
  sp.position.copy(at); sp.renderOrder = 60; parent.add(sp);
  lives.push({ o: sp, t0: performance.now(), dur, step: (k) => { const s = s0 + (s1 - s0) * Math.sqrt(k); sp.scale.set(s, s, 1); sp.material.opacity = a0 * (1 - k * k); } });
}
function sparks(name: string, n: number, c0: THREE.Color, c1: THREE.Color, parent: THREE.Object3D, at: THREE.Vector3, speed: number, size: number, dur: number, streak = false) {
  const tx = otex(name); if (!tx) return;
  for (let i = 0; i < n; i++) {
    const d = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 - 0.15, Math.random() - 0.5).normalize();
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, color: c0.clone(), blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true }));
    sp.position.copy(at); sp.renderOrder = 62; parent.add(sp);
    const v = speed * (0.5 + Math.random() * 0.7); const life = dur * (0.6 + Math.random() * 0.5); const sz = size * (0.6 + Math.random() * 0.8);
    lives.push({ o: sp, t0: performance.now(), dur: life, step: (k) => {
      const e = 1 - (1 - k) * (1 - k);
      sp.position.copy(at).addScaledVector(d, v * e).add(new THREE.Vector3(0, -0.25 * k * k, 0));
      (sp.material.color as THREE.Color).copy(c0).lerp(c1, k); sp.material.opacity = 1 - k * 0.5 - (k > 0.7 ? (k - 0.7) / 0.3 * 0.5 : 0);
      if (streak) { sp.scale.set(sz * 0.35, sz * (1.6 - k), 1); sp.material.rotation = Math.atan2(d.y, d.x) - Math.PI / 2; } else { const s = sz * (1 - 0.6 * k); sp.scale.set(s, s, 1); }
    } });
  }
}
function origSpark(parent: THREE.Object3D, at: THREE.Vector3, h: HitSpec): boolean {
  if (fxOk === false || !otex('shotgun_Sheet_4x2') || !otex('shockwave_2x2') || !otex('Fire02_flash') || !otex('Grain')) return false;
  const k = 1 + Math.min(1, h.ratio) * 0.3 + (h.heavy ? 0.25 : 0);
  if (h.kind === 'melee') {
    // eff_020201_lw1 重建
    flip('shockwave_2x2', 2, 2, hdr(1, 0.954, 0.034), parent, at, 0.75 * k, 260, 4);
    glow('Fire02_flash', hdr(0.985, 1, 0.169), parent, at, 0.25 * k, 0.6 * k, 180, 0.55);
    sparks('Line', 5, C(1, 1, 1), hdr(1, 0.954, 0.034), parent, at, 0.6 * k, 0.55 * k, 240, true);
    sparks('Grain', h.heavy ? 14 : 10, C(1, 0.95, 0.5), C(1, 0.6, 0.1), parent, at, 0.6 * k, 0.1 * k, 380);
  } else {
    // eff_020001_lw1 重建（枪 / 技能 / 其他）
    flip('shotgun_Sheet_4x2', 4, 2, C(1, 0.922, 0.329), parent, at, 0.6 * k, 300, 8);
    glow('Fire02_flash', C(1, 1, 1), parent, at, 0.2 * k, 0.55 * k, 170, 0.5);
    flip('shockwave_2x2', 2, 2, C(1, 0.95, 0.85), parent, at, 0.85 * k, 240, 4, 0);
    sparks('Grain', h.heavy ? 26 : 18, hdr(23.97, 15.06, 0.63), hdr(23.97, 0.63, 0), parent, at, 0.55 * k, 0.08 * k, 360);
  }
  return true;
}

// ---------- 自制星形火花（仅在原版贴图缺失时回退） ----------
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
interface Live { o: THREE.Object3D; t0: number; dur: number; step: (k: number) => void; extra?: THREE.Texture }
const lives: Live[] = [];
export let lastSparkKind: 'orig' | 'homemade' | null = null;
export function spark(parent: THREE.Object3D, at: THREE.Vector3, h: HitSpec, color = 0xffffff) {
  if (origSpark(parent, at, h)) { lastSparkKind = 'orig'; return; }
  lastSparkKind = 'homemade';
  const s0 = 0.55 + Math.min(1, h.ratio) * 0.5 + (h.heavy ? 0.45 : 0);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(), color, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true }));
  sp.position.copy(at); sp.renderOrder = 60; sp.material.rotation = Math.random() * Math.PI;
  parent.add(sp);
  lives.push({ o: sp, t0: performance.now(), dur: 200, step: (k) => { const s = s0 * (0.5 + 1.1 * Math.sqrt(k)); sp.scale.set(s, s, 1); sp.material.opacity = 1 - k * k; } });
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
      const m = l.o as THREE.Mesh; if (!(m as unknown as THREE.Sprite).isSprite) m.geometry?.dispose?.(); (m.material as THREE.Material)?.dispose?.(); l.extra?.dispose();
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
