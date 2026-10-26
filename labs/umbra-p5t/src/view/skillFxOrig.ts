// r14：技能命中 / 召唤特效换原版贴图（Codex batch-05 skills_arsene → tools/fetch-p5t-skillfx.sh → public/p5t-fx/skill/*.webp，不入库）。
// 原版对应关系（umbra-assets p5t/1_data/skills.csv 的 UseEffect 字段，原始数据，不是猜的）：
//   Zio 40301 = [10300, 30100]、Garu 40401 = [10300, 30200]、Eiha 40801 = [10300, 30000]、Agi 40101 = [10300, 30300]、Bufu 40201 = [10300, 30400]
//   10300 = 共通层（common_010300：Fire_5x2 蓝焰翻页 + flash_tex00 横向光条 + flash_tex01 冲击环）
// 原版粒子是 Unity VFX Graph，.vfx 的寿命/尺寸/速度表达式没导出 → 粒子行为是「重建」：贴图/翻页格数是原版，时长/尺寸/轨迹按参考帧
//   （hit_1722 吉欧、hit_1803_5 耶哈命中红球+白色斩痕、summon_v98_1838/1840 与 summon_v58_5650 召唤蓝焰）目测取值。
// 召唤 Persona：Joker = 原版 Arsene；r16 起 Skull/Mona/Panther/Fox/Queen/Noir/Crow/Kasumi/Erina 全员原版 Persona（batch-10），见下方 PERSONA_OF。
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
  'garu_Grain', 'garu_Smoke', 'eiha_Ground', 'agi_agi_effect', 'agi_agi_effect_flash', 'bufu_ice',
  'agi_agi_effect_particle_fire', 'agi_haretu_suprict_agi', 'agi_agi_eff_particle_second', 'agi_agi_eff_shine', 'bufu_Star_flare', 'bufu_alphacrunch'];
export function preloadSkillFx() { NAMES.forEach(T); void loadArsene(); }
/** 这个技能有原版贴图版（贴图都到了才算） */
export function hasOrigSkillFx(skillId: string) {
  const need = SK[origKey(skillId) ?? '']; return !!need && need.every((n) => !!cache.get(n)) && !!cache.get('common_010300_flash_tex01');
}
const SK: Record<string, string[]> = {
  zio: ['zio_zio_bolt_eff_new', 'zio_zio_bolt_eff_blue_new'],
  agi: ['agi_agi_effect', 'agi_agi_effect_flash', 'agi_agi_effect_particle_fire', 'agi_haretu_suprict_agi', 'agi_agi_eff_particle_second'],
  bufu: ['bufu_ice', 'bufu_Star_flare', 'bufu_alphacrunch'], garu: ['garu_Grain', 'garu_Smoke'], eiha: ['eiha_Ground', 'common_010300_flash_tex00'],
};
const origKey = (id: string) => (/agi/.test(id) ? 'agi' : /bufu/.test(id) ? 'bufu' : /zio/.test(id) ? 'zio' : /garu/.test(id) ? 'garu' : /eiha|eiga/.test(id) ? 'eiha' : null);

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
  if (key === 'agi') return agiHit(parent, g, height, speed);
  if (key === 'bufu') return bufuHit(parent, g, height, speed);
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

// ---------- 召唤 Persona（r16：全员原版） ----------
// Joker=Arsene（batch-05）；r16 batch-10：Skull=Captain Kidd(Ps1002)、Mona=Zorro(Ps1003)、Panther=Carmen(Ps1004)、Fox=Goemon(Ps1005)、
// Queen=Johanna(Ps1006)、Noir=Milady(Ps1007)、Crow=Robin Hood(Ps1009)、Kasumi=Cendrillon(Ps1010)、Erina=Ernesto(Ps1021)。
// 归属 = 原始数据 personas.csv / units.csv persona-id 列 + CA9999 PCxxxxSpecialACut clip 名（Codex 交叉核对，Hark 抽查 run_report.json）。
// 动作：普通技能 = 原版 BTL0007 SkillActStart → BTL0008 SkillActLoop（与 Joker/Arsene 同流程）；
//       Unique（总攻/专属技）= BTL0080 SpecialACut1 → 0081 SpecialACut2 → 0085 SpecialAActLoop（「特写段」含义是推测：clip 名只写 SpecialA，Codex README 亦标推测）。
type PersonaKey = 'arsene' | 'kidd' | 'zorro' | 'carmen' | 'goemon' | 'johanna' | 'milady' | 'robin' | 'cendrillon' | 'ernesto';
const personas = new Map<PersonaKey, { scene: THREE.Group; clips: THREE.AnimationClip[] } | null>();
const personaP = new Map<PersonaKey, Promise<void>>();
function loadPersona(k: PersonaKey) {
  const hit = personaP.get(k); if (hit) return hit;
  const p = new Promise<void>((res) => {
    new GLTFLoader().load(`p5t-fx/persona/${k}.glb`, (gl) => {
      gl.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.frustumCulled = false; const mts = (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[];
        for (const mt of mts) { if (mt.map) mt.map.colorSpace = THREE.SRGBColorSpace; mt.metalness = 0; mt.roughness = 1;
        // Persona 外缘蓝光（原版 Persona 着色器未导出 → 菲涅尔边缘光重建，颜色按 summon_v58_5650 取）
        mt.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(0.15, 0.5, 1.0) * pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 4.0) * 0.9;'); }; } } });
      personas.set(k, { scene: gl.scene, clips: gl.animations }); res();
    }, undefined, () => { personas.set(k, null); res(); });
  });
  personaP.set(k, p); return p;
}
function loadArsene() { return loadPersona('arsene'); }
export const PERSONA_OF: Record<string, PersonaKey> = {
  joker: 'arsene', skull: 'kidd', mona: 'zorro', panther: 'carmen', fox: 'goemon', queen: 'johanna', noir: 'milady', crow: 'robin', kasumi: 'cendrillon', erina: 'ernesto',
};
/** 预载本关上场角色的 Persona（GLB 2–3.3MB/个，按需） */
export function preloadPersonas(unitIds: string[]) { for (const id of unitIds) { const k = PERSONA_OF[id.replace(/[0-9]+$/, '')] ?? PERSONA_OF[id]; if (k) void loadPersona(k); } }
export function personaKeyOf(unitId: string): PersonaKey | undefined { return PERSONA_OF[unitId] ?? PERSONA_OF[unitId.replace(/[0-9]+$/, '')]; }
/** 原版 Persona 在施法者身后现身（SkillActStart → SkillActLoop；unique 时 SpecialACut1→2→SpecialAActLoop），直到 end()。
 *  位置/大小按 summon_v58_5650 / hit_1803_5（约 1.5 倍施法者身高、浮在身后侧上方）——重建 */
export function showPersona(parent: THREE.Object3D, caster: THREE.Object3D, target: THREE.Vector3, casterH: number, speed = 1, who = 'joker', special = false) {
  const key = personaKeyOf(who) ?? 'arsene'; const P = personas.get(key);
  if (!P) { void loadPersona(key); return null; }
  const root = new THREE.Group(); const body = P.scene; root.add(body);
  body.scale.setScalar(1); body.position.set(0, 0, 0); body.rotation.set(0, 0, 0); body.updateMatrixWorld(true);
  const mixer = new THREE.AnimationMixer(body);
  const find = (re: RegExp) => P.clips.find((c) => re.test(c.name));
  const seq = (special ? [find(/SpecialACut1/), find(/SpecialACut2/), find(/SpecialAActLoop/)] : [find(/SkillActStart/), find(/SkillActLoop/)]).filter((c): c is THREE.AnimationClip => !!c);
  if (!seq.length) { const st = find(/SkillActStart/), lp = find(/SkillActLoop/); if (st) seq.push(st); if (lp) seq.push(lp); }
  if (!seq.length && P.clips[0]) seq.push(P.clips[0]); // Necronomicon 只有 Idle
  let si = 0;
  const playAt = (i: number) => { mixer.stopAllAction(); const c = seq[i]; if (!c) return; const a = mixer.clipAction(c); const last = i === seq.length - 1; a.setLoop(last ? THREE.LoopRepeat : THREE.LoopOnce, last ? Infinity : 1); a.clampWhenFinished = !last; a.play(); };
  playAt(0);
  mixer.update(0); body.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(body, true); const h = Math.max(0.01, bb.max.y - bb.min.y, 0.7 * Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z)); // r16：Kidd 带整艘船、Johanna 是摩托 → 按「高 / 0.7×最大水平尺寸」较大者归一，免得宽体 Persona 撑满画面
  const s = (casterH * 1.5) / h; body.scale.setScalar(s); body.position.y = -bb.min.y * s;
  const cp = caster.getWorldPosition(new THREE.Vector3());
  const dir = target.clone().sub(cp).setY(0); if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1); dir.normalize();
  // 站位：施法者斜后方、离镜头更远的一侧（hit_1803_5 / summon_v58_5650：Persona 在施法者侧上方，不挡施法者和目标）
  const cam = camRef; const fwd = new THREE.Vector3(0, 0, -1), right = new THREE.Vector3(1, 0, 0);
  if (cam) { const q = cam.getWorldQuaternion(new THREE.Quaternion()); fwd.applyQuaternion(q).setY(0).normalize(); right.applyQuaternion(q).setY(0).normalize(); }
  const side = right.dot(dir) > 0 ? -1 : 1; // 放到目标的另一侧
  root.position.copy(cp).addScaledVector(right, side * casterH * 1.15).addScaledVector(fwd, casterH * 0.1).add(new THREE.Vector3(0, casterH * 0.3, 0));
  root.rotation.y = Math.atan2(dir.x, dir.z);
  root.name = 'persona:' + key;
  parent.add(root);
  const mats: THREE.Material[] = []; body.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { for (const mt of (Array.isArray(m.material) ? m.material : [m.material]) as THREE.Material[]) { mt.transparent = true; mats.push(mt); } } });
  mixer.addEventListener('finished', () => { if (si < seq.length - 1) playAt(++si); });
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
  return { key, end: () => { if (!ending) ending = performance.now(); } };
}

// ---------- r16：Agi 030300 / Bufu 030400 —— 按原版 VFX Graph typetree（skill_fx/params，Codex 9b9ba10）重建 ----------
// 能从 typetree 读到的（原始）：每个 system 的容量、spawn 时序（LoopDuration/Delay/Count/Rate/periodic nb+period）、输出贴图、颜色梯度。
// 读不到的：Initialize/Update 块（寿命、初速、尺寸曲线）被编译进 compute shader（processor PathID），typetree 里没有 → 寿命/速度/尺寸 = 重建（按 hit 参考帧目测）。
type P = { m: FbMat; q: THREE.Mesh; t0: number; life: number; v: THREE.Vector3; p0: THREE.Vector3; s0: number; s1: number; roll: number; spin: number; fade?: (k: number) => number };
function particles(g: THREE.Group, list: P[], cam: THREE.Camera | null, ms: number, sp: number) {
  for (const p of list) {
    const k = (ms * sp - p.t0) / p.life; p.q.visible = k >= 0 && k < 1; if (!p.q.visible) continue;
    p.q.position.copy(p.p0).addScaledVector(p.v, (k * p.life) / 1000);
    const s = p.s0 + (p.s1 - p.s0) * k; p.q.scale.set(s, s, 1);
    p.m.uniforms.uO.value = p.fade ? p.fade(k) : (k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.5) / 0.5));
    if (cam) faceCam(p.q, cam, p.roll + p.spin * k);
  }
}
const rnd = (() => { let x = 7; return () => ((x = (x * 16807) % 2147483647) / 2147483647); })();
function mkP(g: THREE.Group, tex: string, col: number, mode: boolean | 'lum', o: Partial<P> & { t0: number; life: number }): P {
  const m = fbMat(T(tex)!, col, mode); const q = quad(m, false); q.visible = false; g.add(q);
  return { m, q, v: new THREE.Vector3(), p0: new THREE.Vector3(), s0: 0.3, s1: 0.6, roll: rnd() * 6.28, spin: 0, ...o };
}
/** Agi 030300：System(9) 5 + System(11) 10 火团 t=0；System(1)/(2)/(3) 火球 0–0.45s periodic（nb 5–15 / 0.1–0.2s，容量 5/10/5）；
 *  System(4) 0.475s 爆发 25 + 速率 32×0.35s 上升火星（容量 25）；System(8) 0.5s 10 火团。颜色梯度（System 11）HDR (256,138,118)→(17,3.5,0) = 白热→橙红。总长 0.45+1.0s。 */
function agiHit(parent: THREE.Object3D, g: THREE.Group, h: number, sp: number) {
  const cam = camRef; const L: P[] = [];
  const hot = 0xffd2a0, red = 0xff5a10;
  for (let i = 0; i < 5; i++) L.push(mkP(g, 'agi_haretu_suprict_agi', hot, 'lum', { t0: 0, life: 500, p0: new THREE.Vector3((rnd() - 0.5) * 0.3, h * (0.3 + rnd() * 0.4), (rnd() - 0.5) * 0.3), s0: h * 0.4, s1: h * 1.3 }));
  for (let i = 0; i < 10; i++) L.push(mkP(g, 'agi_agi_effect_particle_fire', red, 'lum', { t0: 0, life: 650, p0: new THREE.Vector3((rnd() - 0.5) * 0.5, h * 0.2, (rnd() - 0.5) * 0.5), v: new THREE.Vector3(0, h * 1.2, 0), s0: h * 0.5, s1: h * 0.9 }));
  for (let i = 0; i < 10; i++) L.push(mkP(g, 'agi_agi_effect', hot, 'lum', { t0: (i % 3) * 140, life: 420, p0: new THREE.Vector3(0, h * 0.55, 0), s0: h * 0.6, s1: h * 1.6, spin: 1.2 }));
  for (let i = 0; i < 36; i++) { const a = rnd() * 6.28, r = rnd() * 0.35; L.push(mkP(g, 'agi_agi_eff_particle_second', 0xffb040, 'lum', { t0: 475 + (i < 25 ? 0 : (i - 25) * 31), life: 600 + rnd() * 300, p0: new THREE.Vector3(Math.cos(a) * r, h * 0.3, Math.sin(a) * r), v: new THREE.Vector3(Math.cos(a) * 0.4, h * (1.5 + rnd()), Math.sin(a) * 0.4), s0: 0.12, s1: 0.04 })); }
  L.push(mkP(g, 'agi_agi_effect_flash', 0xfff0d0, 'lum', { t0: 475, life: 300, p0: new THREE.Vector3(0, h * 0.55, 0), s0: h * 1.2, s1: h * 2.6, fade: (k) => 1 - k }));
  for (let i = 0; i < 10; i++) L.push(mkP(g, 'agi_agi_effect_particle_fire', red, 'lum', { t0: 500, life: 700, p0: new THREE.Vector3((rnd() - 0.5) * 0.6, h * 0.1, (rnd() - 0.5) * 0.6), v: new THREE.Vector3(0, h * 0.9, 0), s0: h * 0.4, s1: h * 1.0 }));
  const ring = groundRing(g, 0xff6a20, 1.0);
  const dur = 1450 / sp;
  return run(dur, (k, ms) => { ring(k); particles(g, L, cam, ms, sp); }, () => disposeGroup(parent, g));
}
/** Bufu 030400：Flare 1@0；IceCore 速率 16×0.25s（≈4 冰晶）；Small_ice_A 8×0.25@0.1、B 8×0.25@0.3；Star 速率 8×1.2s；
 *  ShockRay 6@1.0；Flash 1@1.1；Crunch 8@1.2（alpha 曲线 1→0，原始）；Ice_Grain 15@1.2。冰晶原版是 mesh 输出（ice 贴图），这里用公告板代替（重建）。 */
function bufuHit(parent: THREE.Object3D, g: THREE.Group, h: number, sp: number) {
  const cam = camRef; const L: P[] = [];
  const ice = 0xbfeaff;
  const hold = (k: number) => (k < 0.08 ? k / 0.08 : k > 0.85 ? (1 - k) / 0.15 : 1);
  L.push(mkP(g, 'bufu_Star_flare', 0xe8f8ff, false, { t0: 0, life: 350, p0: new THREE.Vector3(0, h * 0.55, 0), s0: h * 1.6, s1: h * 0.4, fade: (k) => 1 - k }));
  const crystal = (t0: number, s: number, i: number) => { const a = i * 1.7, r = 0.12 + 0.1 * (i % 3); L.push(mkP(g, 'bufu_ice', ice, 'lum', { t0, life: 1200 - t0, p0: new THREE.Vector3(Math.cos(a) * r, h * (0.25 + 0.15 * (i % 3)), Math.sin(a) * r), s0: s * 0.3, s1: s, roll: a, fade: hold })); };
  for (let i = 0; i < 4; i++) crystal(i * 62, h * 1.0, i);
  for (let i = 0; i < 2; i++) crystal(100 + i * 125, h * 0.55, i + 4);
  for (let i = 0; i < 2; i++) crystal(300 + i * 125, h * 0.55, i + 6);
  for (let i = 0; i < 10; i++) L.push(mkP(g, 'bufu_Star_flare', 0xffffff, false, { t0: i * 125, life: 400, p0: new THREE.Vector3((rnd() - 0.5) * 0.6, h * (0.2 + rnd() * 0.9), (rnd() - 0.5) * 0.6), s0: 0.05, s1: 0.35, fade: (k) => Math.sin(k * Math.PI) }));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.28; L.push(mkP(g, 'common_010300_flash_tex00', 0xc8f0ff, 'lum', { t0: 1000, life: 300, p0: new THREE.Vector3(0, h * 0.55, 0), s0: h * 0.4, s1: h * 2.2, roll: a, fade: (k) => 1 - k })); }
  L.push(mkP(g, 'bufu_Star_flare', 0xffffff, false, { t0: 1100, life: 300, p0: new THREE.Vector3(0, h * 0.55, 0), s0: h * 0.8, s1: h * 2.4, fade: (k) => 1 - k }));
  for (let i = 0; i < 8; i++) { const a = rnd() * 6.28; L.push(mkP(g, 'bufu_alphacrunch', 0xdff6ff, false, { t0: 1200, life: 700, p0: new THREE.Vector3(0, h * 0.5, 0), v: new THREE.Vector3(Math.cos(a) * 1.4, h * (0.6 + rnd()), Math.sin(a) * 1.4), s0: 0.3, s1: 0.2, spin: 4, fade: (k) => 1 - k })); }
  for (let i = 0; i < 15; i++) { const a = rnd() * 6.28; L.push(mkP(g, 'bufu_ice', ice, 'lum', { t0: 1200, life: 800, p0: new THREE.Vector3(0, h * 0.6, 0), v: new THREE.Vector3(Math.cos(a) * 1.1, -h * 0.4 + rnd() * h, Math.sin(a) * 1.1), s0: 0.16, s1: 0.08, spin: 6, fade: (k) => 1 - k })); }
  const ring = groundRing(g, 0x9fe4ff, 1.0);
  const dur = 2000 / sp;
  return run(dur, (k, ms) => { ring(Math.min(1, k * 2)); particles(g, L, cam, ms, sp); }, () => disposeGroup(parent, g));
}
