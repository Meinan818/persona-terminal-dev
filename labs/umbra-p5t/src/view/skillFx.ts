// 技能演出（Hark 自制 —— 原版技能 VFX 是 Unity VFX Graph，网页跑不了；Codex 导出的 VFX JSON 只是参数，不能直接播放）：
//  1) SummonDim：召唤切入的暗屏改成「只压背景」——三遍渲染：整场景 → 暗幕 + 施法者身后蓝焰（正交全屏层）→ 清深度后只画施法者（layer 1），
//     施法者的 SkillStart→SkillActStart 动作不再被盖住。
//  2) SkillHit：技能命中特效落在目标身上（按属性配色：火/冰/电/风/核/念/祝/咒/万能）。
import * as THREE from 'three';

export const CASTER_LAYER = 1;

/** 属性 → 主色 / 亮芯色（自制配色，参考 P5 系列技能颜色） */
const ELEM: Record<string, [number, number]> = {
  fire: [0xff4a10, 0xffd060], ice: [0x48c8ff, 0xe8fbff], elec: [0xffe020, 0xffffff], wind: [0x40e070, 0xd8ffe0],
  nuke: [0x40e8ff, 0xffffff], psy: [0xff50c8, 0xffd8f4], bless: [0xfff0a0, 0xffffff], curse: [0x8a10b8, 0xff2a3a], almighty: [0xc0c0ff, 0xffffff],
  phys: [0xff2030, 0xffffff],
};
const SKILL_ELEM: Record<string, string> = {
  agi: 'fire', maragi: 'fire', agilao: 'fire', bufu: 'ice', mabufu: 'ice', bufula: 'ice', zio: 'elec', zionga: 'elec', mazio: 'elec',
  garu: 'wind', magaru: 'wind', frei: 'nuke', mafrei: 'nuke', psi: 'psy', mapsi: 'psy', kouha: 'bless', makouha: 'bless',
  eiha: 'curse', maeiha: 'curse', eiga: 'curse', megido: 'almighty',
};
export const elemOf = (skillId: string) => SKILL_ELEM[skillId] ?? (/^ma?agi/.test(skillId) ? 'fire' : /bufu/.test(skillId) ? 'ice' : /zio/.test(skillId) ? 'elec' : /garu/.test(skillId) ? 'wind'
  : /frei/.test(skillId) ? 'nuke' : /psi/.test(skillId) ? 'psy' : /kou/.test(skillId) ? 'bless' : /eiha|eiga/.test(skillId) ? 'curse' : 'phys');

function flameTex(core: string, mid: string) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(32, 100, 2, 32, 80, 60);
  gr.addColorStop(0, core); gr.addColorStop(0.35, mid); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(32, 0); g.bezierCurveTo(60, 50, 64, 90, 50, 120); g.lineTo(14, 120); g.bezierCurveTo(0, 90, 4, 50, 32, 0); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const css = (n: number) => '#' + n.toString(16).padStart(6, '0');
const texCache = new Map<string, THREE.Texture>();
const tex = (a: number, b: number) => { const k = `${a}-${b}`; let t = texCache.get(k); if (!t) { t = flameTex(css(b), css(a)); texCache.set(k, t); } return t; };

export class SummonDim {
  private scene = new THREE.Scene();
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
  private quad: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private flames: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private t0 = 0; private dur = 950;
  caster: THREE.Object3D | null = null;
  private ndc = new THREE.Vector2(); private ndcTop = new THREE.Vector2();

  constructor() {
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      transparent: true, depthTest: false, depthWrite: false,
      uniforms: { uA: { value: 0 }, uC: { value: new THREE.Vector2() }, uAsp: { value: 1 } },
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      // 暗幕：施法者附近深蓝、外圈近黑（原 CSS radial-gradient #001a4d → #000 的同一配色）
      fragmentShader: `uniform float uA; uniform vec2 uC; uniform float uAsp; varying vec2 vP;
        void main(){ vec2 d = (vP - uC) * vec2(uAsp, 1.0); float r = clamp(length(d) / 1.4, 0.0, 1.0);
          vec3 c = mix(vec3(0.0, 0.10, 0.30), vec3(0.0), smoothstep(0.0, 0.6, r));
          gl_FragColor = vec4(c, uA * mix(0.8, 0.82, r)); }`,
    }));
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex(i === 1 ? 0x2a8cff : 0x1f6bff, 0xbff4ff), transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false }));
      m.frustumCulled = false; this.scene.add(m); this.flames.push(m);
    }
  }
  start(caster: THREE.Object3D, ms: number) {
    this.stop();
    this.caster = caster; this.t0 = performance.now(); this.dur = ms;
    caster.traverse((o) => o.layers.enable(CASTER_LAYER));
  }
  stop() {
    if (this.caster) this.caster.traverse((o) => o.layers.disable(CASTER_LAYER));
    this.caster = null;
  }
  get active() { return !!this.caster; }
  /** 施法者头顶的屏幕坐标（0..1，左上原点），给 DOM 面具碎片/文字条定位 */
  screenOf(cam: THREE.Camera, h = 1.0) {
    if (!this.caster) return null;
    const p = this.caster.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, h, 0)).project(cam);
    return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 };
  }
  render(r: THREE.WebGLRenderer, scene: THREE.Scene, cam: THREE.Camera) {
    r.render(scene, cam);
    if (!this.caster) return;
    const k = (performance.now() - this.t0) / this.dur;
    if (k >= 1) { this.stop(); return; }
    const a = k < 0.08 ? k / 0.08 : k > 0.85 ? (1 - k) / 0.15 : 1;
    const base = this.caster.getWorldPosition(new THREE.Vector3());
    const p0 = base.clone().project(cam), p1 = base.clone().add(new THREE.Vector3(0, 1.3, 0)).project(cam);
    this.ndc.set(p0.x, p0.y); this.ndcTop.set(p1.x, p1.y);
    const size = r.getSize(new THREE.Vector2());
    const asp = size.x / Math.max(1, size.y);
    const u = this.quad.material.uniforms; u.uA.value = a; u.uC.value.copy(this.ndc); u.uAsp.value = asp;
    // 施法者身后蓝焰（人格面具召唤）：脚下起、高约 1.6 倍身高
    const hN = Math.max(0.25, (this.ndcTop.y - this.ndc.y) * 1.6);
    const grow = Math.min(1, k / 0.3);
    this.flames.forEach((f, i) => {
      const off = (i - 1) * hN * 0.28 / asp;
      const hh = hN * (i === 1 ? 1 : 0.78) * (0.1 + 0.9 * grow) * (1 + 0.05 * Math.sin(performance.now() / 70 + i));
      f.scale.set(hN * 0.55 / asp, hh, 1);
      f.position.set(this.ndc.x + off, this.ndc.y + hh / 2 - hN * 0.06, 0);
      f.material.opacity = a * 0.9;
    });
    const ac = r.autoClear; r.autoClear = false;
    r.render(this.scene, this.cam);
    r.clearDepth();
    const mask = cam.layers.mask; cam.layers.set(CASTER_LAYER);
    const bg = scene.background, env = scene.environment; scene.background = null; // 第三遍不能再画背景/天空（否则把前两遍盖掉）
    r.render(scene, cam);
    scene.background = bg; scene.environment = env;
    cam.layers.mask = mask; r.autoClear = ac;
  }
}

/** 技能命中特效：目标脚下属性色光环 + 3 片上升火舌 + 亮芯闪光，约 700ms（自制） */
export function skillHit(parent: THREE.Object3D, at: THREE.Vector3, skillId: string, height = 1.1, speed = 1) {
  const [main, core] = ELEM[elemOf(skillId)];
  const g = new THREE.Group(); g.position.copy(at); parent.add(g);
  const add = (m: THREE.Mesh) => { m.renderOrder = 5; g.add(m); return m; };
  const ringM = new THREE.MeshBasicMaterial({ color: main, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const ring = add(new THREE.Mesh(new THREE.RingGeometry(0.25, 0.42, 32), ringM)); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03;
  const flames: THREE.Sprite[] = [];
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(main, core), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.renderOrder = 6; g.add(s); flames.push(s);
  }
  const flashM = new THREE.MeshBasicMaterial({ color: core, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const flash = add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), flashM)); flash.position.y = height * 0.5;
  const t0 = performance.now(), dur = 720 / speed;
  return new Promise<void>((res) => {
    const step = () => {
      if (document.body.classList.contains('frozen')) { requestAnimationFrame(step); return; }
      const k = Math.min(1, (performance.now() - t0) / dur);
      ring.scale.setScalar(1 + k * 1.6); ringM.opacity = 0.9 * (1 - k);
      flames.forEach((s, i) => {
        const ph = i / flames.length * Math.PI * 2 + k * 2;
        const h = height * (0.6 + 0.9 * Math.sin(Math.min(1, k * 1.6) * Math.PI / 2)) * (i % 2 ? 0.8 : 1);
        s.scale.set(height * 0.55, h, 1);
        s.position.set(Math.cos(ph) * 0.18, h / 2, Math.sin(ph) * 0.18);
        (s.material as THREE.SpriteMaterial).opacity = k < 0.7 ? 1 : (1 - k) / 0.3;
      });
      flash.scale.setScalar(k < 0.2 ? 0.5 + k * 6 : Math.max(0, 1.7 - (k - 0.2) * 2.5)); flashM.opacity = Math.max(0, 0.9 - k * 1.3);
      if (k < 1) requestAnimationFrame(step);
      else { parent.remove(g); ringM.dispose(); flashM.dispose(); flames.forEach((s) => s.material.dispose()); res(); }
    };
    step();
  });
}
