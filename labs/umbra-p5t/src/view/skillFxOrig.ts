// r14：技能命中 / 召唤特效换原版贴图（Codex batch-05 skills_arsene → tools/fetch-p5t-skillfx.sh → public/p5t-fx/skill/*.webp，不入库）。
// 原版对应关系（umbra-assets p5t/1_data/skills.csv 的 UseEffect 字段，原始数据，不是猜的）：
//   Zio 40301 = [10300, 30100]、Garu 40401 = [10300, 30200]、Eiha 40801 = [10300, 30000]、Agi 40101 = [10300, 30300]、Bufu 40201 = [10300, 30400]
//   10300 = 共通层（common_010300：Fire_5x2 蓝焰翻页 + flash_tex00 横向光条 + flash_tex01 冲击环）
// 原版粒子是 Unity VFX Graph，.vfx 的寿命/尺寸/速度表达式没导出 → 粒子行为是「重建」：贴图/翻页格数是原版，时长/尺寸/轨迹按参考帧
//   （hit_1722 吉欧、hit_1803_5 耶哈命中红球+白色斩痕、summon_v98_1838/1840 与 summon_v58_5650 召唤蓝焰）目测取值。
// 召唤 Persona：Joker = 原版 Arsene（persona_1001000 Ps1001_000.glb，原版动作 SkillActStart→SkillActLoop）；Skull/Mona 的 Persona 模型未导出 → 只有共通蓝焰。
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const BASE = 'p5t-fx/skill/';
const cache = new Map<string, THREE.Texture | null>();
const loader = new THREE.TextureLoader();
function T(n: string): THREE.Texture | null {
  if (cache.has(n)) return cache.get(n)!;
  cache.set(n, null);
  loader.load(BASE + n + '.webp', (t) => { t.colorSpace = THREE.SRGBColorSpace; cache.set(n, t); }, undefined, () => {});
  return null;
}
const NAMES = ['common_010300_Fire_5x2', 'common_010300_flash_tex00', 'common_010300_flash_tex01', 'zio_zio_bolt_eff_new', 'zio_zio_bolt_eff_blue_new',
  'garu_Grain', 'garu_Smoke', 'eiha_Ground', 'agi_agi_effect', 'agi_agi_effect_flash', 'bufu_ice'];
export function preloadSkillFx() { NAMES.forEach(T); void loadArsene(); }
/** 这个技能有原版贴图版（贴图都到了才算） */
export function hasOrigSkillFx(skillId: string) {
  const need = SK[origKey(skillId) ?? '']; return !!need && need.every((n) => !!cache.get(n)) && !!cache.get('common_010300_flash_tex01');
}
const SK: Record<string, string[]> = {
  zio: ['zio_zio_bolt_eff_new', 'zio_zio_bolt_eff_blue_new'], garu: ['garu_Grain', 'garu_Smoke'], eiha: ['eiha_Ground', 'common_010300_flash_tex00'],
};
const origKey = (id: string) => (/zio/.test(id) ? 'zio' : /garu/.test(id) ? 'garu' : /eiha|eiga/.test(id) ? 'eiha' : null);

// ---------- 通用：翻页公告板材质（贴图 RGB×A 或「只用 alpha、颜色另给」两种） ----------
/** alphaOnly: true = 只用贴图 alpha、颜色另给；'lum' = 贴图不带透明（原版加色材质：黑底白图，alpha 全 255）→ 亮度当 alpha */
function fbMat(tex: THREE.Texture, color: THREE.ColorRepresentation, alphaOnly: boolean | 'lum', blending: THREE.Blending = THREE.AdditiveBlending) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending, side: THREE.DoubleSide,
    uniforms: { map: { value: tex }, uC: { value: new THREE.Color(color) }, uO: { value: 1 }, uF: { value: new THREE.Vector4(0, 0, 1, 1) }, uA: { value: alphaOnly === 'lum' ? 2 : alphaOnly ? 1 : 0 } },
    vertexShader: 'varying vec2 vUv; uniform vec4 uF; void main(){ vUv = uF.xy + uv * uF.zw; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D map; uniform vec3 uC; uniform float uO; uniform float uA; varying vec2 vUv;
      void main(){ vec4 t = texture2D(map, vUv); vec3 c = uA > 1.5 ? uC : mix(t.rgb * uC, uC, uA);
        float a = (uA > 1.5 ? max(t.r, max(t.g, t.b)) : t.a) * uO; gl_FragColor = vec4(c * a, a); }`,
  });
}
type FbMat = ReturnType<typeof fbMat>;
/** 翻页：cols×rows 网格（Unity 习惯第 0 帧在左上），帧号 f */
function setFrame(m: FbMat, cols: number, rows: number, f: number) {
  const i = Math.max(0, Math.floor(f)); const cx = i % cols, cy = Math.floor(i / cols);
  m.uniforms.uF.value.set(cx / cols, 1 - (cy + 1) / rows, 1 / cols, 1 / rows);
}
function quad(m: THREE.Material, anchorBottom = true) {
  const g = new THREE.PlaneGeometry(1, 1); if (anchorBottom) g.translate(0, 0.5, 0);
  const q = new THREE.Mesh(g, m); q.frustumCulled = false; q.renderOrder = 6; return q;
}
const _q = new THREE.Quaternion(), _e = new THREE.Euler();
/** 只绕 Y 轴面向相机（竖直特效：雷柱、火焰） */
function faceY(o: THREE.Object3D, cam: THREE.Camera) {
  const wp = o.getWorldPosition(new THREE.Vector3()); const cp = cam.getWorldPosition(new THREE.Vector3());
  o.rotation.set(0, Math.atan2(cp.x - wp.x, cp.z - wp.z), 0);
}
/** 完全面向相机 */
function faceCam(o: THREE.Object3D, cam: THREE.Camera, roll = 0) {
  cam.getWorldQuaternion(_q); o.quaternion.copy(_q); _e.set(0, 0, roll); o.quaternion.multiply(new THREE.Quaternion().setFromEuler(_e));
}
let camRef: THREE.Camera | null = null;
export function setSkillFxCamera(c: THREE.Camera) { camRef = c; }

function run(dur: number, step: (k: number, ms: number) => void, done: () => void) {
  const t0 = performance.now();
  return new Promise<void>((res) => {
    const f = () => {
      if (document.body.classList.contains('frozen')) { requestAnimationFrame(f); return; }
      const ms = performance.now() - t0; const k = Math.min(1, ms / dur);
      step(k, ms);
      if (k < 1) requestAnimationFrame(f); else { done(); res(); }
    };
    f();
  });
}
function disposeGroup(parent: THREE.Object3D, g: THREE.Object3D) {
  parent.remove(g);
  g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } });
}
/** 地面冲击环（common flash_tex01，重建：0→r 米、淡出） */
function groundRing(g: THREE.Group, color: number, r: number) {
  const m = fbMat(T('common_010300_flash_tex01')!, color, 'lum');
  const q = quad(m, false); q.rotation.x = -Math.PI / 2; q.position.y = 0.04; g.add(q);
  return (k: number) => { const s = 0.2 + r * 2 * Math.sin(Math.min(1, k * 1.8) * Math.PI / 2); q.scale.set(s, s, 1); m.uniforms.uO.value = Math.max(0, 1 - k * 1.4); };
}
/** 柔光芯（重建：原版这一层的 glow 贴图不在导出里 → 着色器径向衰减） */
function glow(g: THREE.Group, color: number, y: number) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: { uC: { value: new THREE.Color(color) }, uO: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 uC; uniform float uO; varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; float a = pow(max(0.0, 1.0 - d), 2.2) * uO; gl_FragColor = vec4(uC * a + vec3(a * a * a * 0.25), a); }',
  });
  const q = quad(m, false); q.position.y = y; q.renderOrder = 7; g.add(q); return { q, m };
}

// ---------- 技能命中 ----------
export function origSkillHit(parent: THREE.Object3D, at: THREE.Vector3, skillId: string, height = 1.1, speed = 1): Promise<void> {
  const key = origKey(skillId)!;
  const g = new THREE.Group(); g.position.copy(at); parent.add(g);
  const cam = camRef;
  if (key === 'zio') {
    // 30100：zio_bolt_eff_new（黄）/ _blue_new（青）各 4×2 翻 8 帧；雷柱自上而下落在目标身上，两道错开（重建：时长 0.42s/道）
    const bolts = [0, 1, 2].map((i) => {
      const m = fbMat(T(i === 1 ? 'zio_zio_bolt_eff_blue_new' : 'zio_zio_bolt_eff_new')!, i === 1 ? 0xffffff : 0xffffff, false);
      const q = quad(m); q.scale.set(height * 1.5 * (i === 1 ? 1.15 : 1), height * 3.4, 1); q.position.set((i - 1) * 0.12, -0.05, (i - 1) * 0.05); g.add(q);
      return { m, q, delay: i * 90 };
    });
    const ring = groundRing(g, 0xffe640, 1.1);
    const gl = glow(g, 0xfff07a, height * 0.55);
    const dur = 760 / speed;
    return run(dur, (k, ms) => {
      ring(k);
      bolts.forEach((b, i) => {
        const lk = (ms * speed - b.delay) / 420;
        b.q.visible = lk >= 0 && lk < 1;
        if (b.q.visible) { setFrame(b.m, 4, 2, lk * 8); b.m.uniforms.uO.value = lk > 0.75 ? (1 - lk) / 0.25 : 1; if (cam) faceY(b.q, cam); b.q.scale.x = Math.abs(b.q.scale.x) * (i === 2 ? -1 : 1); }
      });
      const s = height * (k < 0.15 ? k / 0.15 * 1.8 : 1.8 - (k - 0.15) * 1.6); gl.q.scale.set(Math.max(0.01, s), Math.max(0.01, s), 1); gl.m.uniforms.uO.value = Math.max(0, 1 - k * 1.2); if (cam) faceCam(gl.q, cam);
    }, () => disposeGroup(parent, g));
  }
  if (key === 'garu') {
    // 30200：Grain（月牙白粒）+ Smoke（灰噪声）；疾风绿旋风环绕目标上卷（重建：12 片月牙螺旋上升 0.8s、烟团 3 片扩散）
    const N = 12;
    const grains = Array.from({ length: N }, (_, i) => {
      const m = fbMat(T('garu_Grain')!, i % 3 ? 0x7dffa0 : 0xe8fff0, 'lum'); const q = quad(m, false); g.add(q);
      return { m, q, ph: (i / N) * Math.PI * 2, y0: (i % 4) * 0.12, sp: 1 + (i % 3) * 0.25 };
    });
    const smokes = [0, 1, 2].map((i) => { const m = fbMat(T('garu_Smoke')!, 0x5fe089, 'lum'); const q = quad(m, false); g.add(q); return { m, q, i }; });
    const ring = groundRing(g, 0x6dff96, 0.9);
    const dur = 880 / speed;
    return run(dur, (k) => {
      ring(k);
      grains.forEach((p) => {
        const a = p.ph + k * Math.PI * 4 * p.sp; const r = 0.35 + 0.35 * k;
        p.q.position.set(Math.cos(a) * r, p.y0 + k * height * 1.5, Math.sin(a) * r);
        const s = 0.32 * (1 - 0.4 * k); p.q.scale.set(s, s, 1);
        if (cam) faceCam(p.q, cam, -a); p.m.uniforms.uO.value = k < 0.1 ? k / 0.1 : k > 0.7 ? (1 - k) / 0.3 : 1;
      });
      smokes.forEach((s) => { const sc = height * (0.6 + k * (1.1 + s.i * 0.3)); s.q.scale.set(sc, sc, 1); s.q.position.y = height * (0.35 + s.i * 0.25); if (cam) faceCam(s.q, cam, s.i * 2 + k); s.m.uniforms.uO.value = 0.45 * (1 - k); });
    }, () => disposeGroup(parent, g));
  }
  // eiha（30000）：Ground 暗色地面印 + 红色光球 + 白色斩痕（flash_tex00 横条，hit_1803_5 里的白色弧形划痕）；红球柔光 = 重建
  const gm = fbMat(T('eiha_Ground')!, 0xffffff, false, THREE.NormalBlending);
  const gq = quad(gm, false); gq.rotation.x = -Math.PI / 2; gq.position.y = 0.03; g.add(gq);
  const core = glow(g, 0xff1030, height * 0.55);
  const ring = groundRing(g, 0xff2040, 1.0);
  const slashes = [0, 1, 2, 3].map((i) => { const m = fbMat(T('common_010300_flash_tex00')!, 0xffffff, 'lum'); const q = quad(m, false); q.position.y = height * (0.45 + 0.12 * (i % 2)); g.add(q); return { m, q, roll: [0.5, -0.35, 1.1, -0.9][i], d: i * 70 }; });
  const dur = 900 / speed;
  return run(dur, (k, ms) => {
    ring(k);
    const s = 0.4 + 1.6 * Math.min(1, k * 2.5); gq.scale.set(s, s, 1); gm.uniforms.uO.value = k > 0.7 ? (1 - k) / 0.3 : 1;
    const cs = height * (k < 0.2 ? 0.6 + k * 6 : Math.max(0.2, 1.8 - (k - 0.2) * 1.5)); core.q.scale.set(cs, cs, 1); core.m.uniforms.uO.value = k < 0.75 ? 1 : (1 - k) / 0.25; if (cam) faceCam(core.q, cam);
    slashes.forEach((sl) => {
      const lk = (ms * speed - sl.d) / 320; sl.q.visible = lk >= 0 && lk < 1;
      if (!sl.q.visible) return;
      sl.q.scale.set(height * 2.6 * Math.min(1, lk * 3), height * 0.32 * (1 - lk * 0.6), 1); sl.m.uniforms.uO.value = 1 - lk; if (cam) faceCam(sl.q, cam, sl.roll);
    });
  }, () => disposeGroup(parent, g));
}

// ---------- 召唤共通层：Fire_5x2 蓝焰（施法者脚下，9 帧翻页）——给 SummonDim（屏幕层）和 3D 世界共用 ----------
export function summonFlameTex() { return cache.get('common_010300_Fire_5x2') ?? null; }
export const FIRE_COLS = 5, FIRE_ROWS = 2, FIRE_FRAMES = 9;
export { fbMat as flipbookMaterial, setFrame as setFlipbookFrame };

/** 施法者身上蓝焰 + 地面冲击环，持续 ms（3D，Persona 出现期间） */
export function summonAura(parent: THREE.Object3D, at: THREE.Vector3, height: number, ms: number) {
  const tex = summonFlameTex(); if (!tex || !cache.get('common_010300_flash_tex01')) return Promise.resolve();
  const g = new THREE.Group(); g.position.copy(at); parent.add(g);
  const fl = [0, 1, 2, 3].map((i) => { const m = fbMat(tex, i % 2 ? 0x3aa8ff : 0x2a5cff, true); const q = quad(m); g.add(q); return { m, q, i }; });
  const ring = groundRing(g, 0x40a0ff, 1.2);
  const cam = camRef;
  return run(ms, (k, t) => {
    ring(Math.min(1, k * 3));
    fl.forEach((f) => {
      const a = (f.i / 4) * Math.PI * 2 + t / 600;
      f.q.position.set(Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32);
      const h = height * (1.2 + 0.2 * (f.i % 2)) * Math.min(1, k * 6);
      f.q.scale.set(h * 0.55, h, 1); setFrame(f.m, FIRE_COLS, FIRE_ROWS, ((t / 55) + f.i * 2) % FIRE_FRAMES);
      f.m.uniforms.uO.value = k > 0.85 ? (1 - k) / 0.15 : 1; if (cam) faceY(f.q, cam);
    });
  }, () => disposeGroup(parent, g));
}

// ---------- Arsene ----------
let arsene: { scene: THREE.Group; clips: THREE.AnimationClip[] } | null = null;
let arseneP: Promise<void> | null = null;
function loadArsene() {
  if (arseneP) return arseneP;
  arseneP = new Promise<void>((res) => {
    new GLTFLoader().load('p5t-fx/persona/arsene.glb', (gl) => {
      gl.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.frustumCulled = false; const mt = m.material as THREE.MeshStandardMaterial; if (mt.map) mt.map.colorSpace = THREE.SRGBColorSpace; mt.metalness = 0; mt.roughness = 1;
        // Persona 外缘蓝光（原版 Persona 着色器未导出 → 菲涅尔边缘光重建，颜色按 summon_v58_5650 取）
        mt.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(0.15, 0.5, 1.0) * pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 4.0) * 0.9;'); }; } });
      arsene = { scene: gl.scene, clips: gl.animations }; res();
    }, undefined, () => res());
  });
  return arseneP;
}
export const PERSONA_OF: Record<string, 'arsene'> = { joker: 'arsene' };
/** 原版 Persona 在施法者身后现身（SkillActStart → SkillActLoop），直到 end()。位置/大小按 summon_v58_5650 / hit_1803_5（约 2 倍施法者身高、浮在身后上方）——重建 */
export function showPersona(parent: THREE.Object3D, caster: THREE.Object3D, target: THREE.Vector3, casterH: number, speed = 1) {
  if (!arsene) return null;
  const root = new THREE.Group(); const body = arsene.scene; root.add(body);
  body.scale.setScalar(1); body.position.set(0, 0, 0); body.rotation.set(0, 0, 0); body.updateMatrixWorld(true);
  const mixer = new THREE.AnimationMixer(body);
  const start = arsene.clips.find((c) => /SkillActStart/.test(c.name)), loop = arsene.clips.find((c) => /SkillActLoop/.test(c.name));
  if (start) { const a = mixer.clipAction(start); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.play(); }
  mixer.update(0); body.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(body, true); const h = Math.max(0.01, bb.max.y - bb.min.y);
  const s = (casterH * 1.5) / h; body.scale.setScalar(s); body.position.y = -bb.min.y * s;
  const cp = caster.getWorldPosition(new THREE.Vector3());
  const dir = target.clone().sub(cp).setY(0); if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1); dir.normalize();
  // 站位：施法者斜后方、离镜头更远的一侧（hit_1803_5 / summon_v58_5650：Persona 在施法者侧上方，不挡施法者和目标）
  const cam = camRef; const fwd = new THREE.Vector3(0, 0, -1), right = new THREE.Vector3(1, 0, 0);
  if (cam) { const q = cam.getWorldQuaternion(new THREE.Quaternion()); fwd.applyQuaternion(q).setY(0).normalize(); right.applyQuaternion(q).setY(0).normalize(); }
  const side = right.dot(dir) > 0 ? -1 : 1; // 放到目标的另一侧
  root.position.copy(cp).addScaledVector(right, side * casterH * 1.15).addScaledVector(fwd, casterH * 0.1).add(new THREE.Vector3(0, casterH * 0.3, 0));
  root.rotation.y = Math.atan2(dir.x, dir.z);
  parent.add(root);
  const mats: THREE.Material[] = []; body.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { const mt = m.material as THREE.Material; mt.transparent = true; mats.push(mt); } });
  mixer.addEventListener('finished', () => { if (loop) { mixer.stopAllAction(); mixer.clipAction(loop).play(); } });
  let last = performance.now(), t0 = last, ending = 0, alive = true;
  const step = () => {
    if (!alive) return;
    const now = performance.now(); mixer.update(((now - last) / 1000) * speed); last = now;
    const fin = Math.min(1, (now - t0) / (180 / speed)); const out = ending ? Math.max(0, 1 - (now - ending) / (220 / speed)) : 1;
    mats.forEach((m) => { m.opacity = fin * out; });
    if (ending && out <= 0) { alive = false; parent.remove(root); mixer.stopAllAction(); root.remove(body); return; }
    requestAnimationFrame(step);
  };
  step();
  return { end: () => { if (!ending) ending = performance.now(); } };
}
