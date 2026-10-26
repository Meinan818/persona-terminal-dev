// 共用角色骨架（Hark 美术区）：所有单位模型（Joker GLB、Skull/Mona/敌兵程序化 Q 版）共用的动画状态机。
// RigBase 只管「状态 → 权重」（待机呼吸 / 跑步 / 举枪·挥砍·技能 / 受击 / 倒地 / 死亡）和整体朝向、颠簸、倒地仰躺；
// 子类在 applyPose(f) 里把这些权重落到各自的骨骼上。ProcRig = 用几何体拼的 Q 版小人（关节 = Group），
// 每个关节的零件按顶点色合并成 1 个 toon 网格 + 1 个反向外壳描边，单个角色约 20 次 draw call。
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type AimKind = 'gun' | 'melee' | 'skill';
export type Pose = 'idle' | 'run' | 'aim' | 'downed' | 'dead';

export interface UnitRig {
  readonly root: THREE.Group;
  readonly height: number;
  readonly pose: Pose;
  faceTo(p: THREE.Vector3): void;
  setRunning(on: boolean): void;
  aim(target: THREE.Vector3 | null, kind?: AimKind, ms?: number): void;
  endAim(): void;
  flinch(from?: THREE.Vector3): void;
  setDowned(on: boolean): void;
  die(): void;
  revive(): void;
  setDim(on: boolean): void;
  update(now?: number): void;
  /** 走一格的毫秒数（正版 rig = 原版 Run 步速；缺省用 RUN_MS_PER_TILE） */
  readonly msPerTile?: number;
  /** r14：红色选中/锁定描边（正版 rig） */
  setHighlight?(on: boolean): void;
  /** 等当前单次动作（攻击/受击/倒地…）播完；maxMs 封顶 */
  settle?(maxMs?: number): Promise<void>;
  /** 等攻击动作的原版命中帧（正版 rig） */
  impact?(maxMs?: number): Promise<void>;
  /** 顿帧：动画时钟停住 */
  freeze?(now?: number): void;
}
/** 程序化/占位 rig 的走格时间：取正版 Joker/Skull/Em0001 Run 实测（半个循环 = 一步 = 一格，0.667s/2） */
export const RUN_MS_PER_TILE = 333;

// ---------- toon 材质 / 描边 ----------
let grad: THREE.DataTexture | null = null;
export function toonGradient() {
  if (grad) return grad;
  grad = new THREE.DataTexture(new Uint8Array([150, 150, 150, 255, 215, 215, 215, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter;
  grad.needsUpdate = true;
  return grad;
}
const outlineCache = new Map<string, THREE.MeshBasicMaterial>();
/** 反向外壳描边：顶点沿法线外推 w（几何单位） */
export function outlineMat(w: number) {
  const key = w.toFixed(4);
  let m = outlineCache.get(key);
  if (m) return m;
  m = new THREE.MeshBasicMaterial({ color: 0x050508, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n transformed += normalize( normal ) * ${key};`);
  };
  m.customProgramCacheKey = () => `chibi-outline-${key}`;
  outlineCache.set(key, m);
  return m;
}

export interface AnimFrame {
  t: number; dt: number;
  run: number; aim: number; down: number; hit: number; die: number;
  ph: number; sw: number; breath: number;
  kind: AimKind;
  /** 本次攻击开始后经过的秒数（挥砍/突刺曲线用） */
  aimAge: number;
}

const ease = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** 动画状态 + 整体变换；子类实现 applyPose() 摆骨骼 */
export abstract class RigBase implements UnitRig {
  readonly root = new THREE.Group();
  protected inner = new THREE.Group();
  protected mats: { m: THREE.Material & { color: THREE.Color }; base: THREE.Color }[] = [];
  private yaw = 0; private yawT = 0;
  private running = false; private runPhase = 0; private runW = 0;
  private aimUntil = 0; private aimStart = -10; private aimW = 0; protected aimKind: AimKind = 'gun';
  private hitT = -10; private downed = false; private downW = 0; private dimmed = false;
  private deadT = -1;
  private last = performance.now();

  constructor(readonly height: number) {
    this.root.add(this.inner);
    // 拾取用隐形包围柱（Raycaster 不看 visible）
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, height, 8), new THREE.MeshBasicMaterial());
    hit.position.y = height / 2; hit.visible = false; hit.castShadow = false;
    hit.name = 'rigHit';
    this.root.add(hit);
  }

  faceTo(worldTarget: THREE.Vector3) {
    const p = this.root.getWorldPosition(new THREE.Vector3());
    const dx = worldTarget.x - p.x, dz = worldTarget.z - p.z;
    if (dx * dx + dz * dz < 1e-4) return;
    this.yawT = Math.atan2(dx, dz);
  }
  setRunning(on: boolean) { this.running = on; }
  aim(target: THREE.Vector3 | null, kind: AimKind = 'gun', ms = 1600) {
    if (target) this.faceTo(target);
    const now = performance.now();
    if (now >= this.aimUntil || kind !== this.aimKind) this.aimStart = now / 1000;
    this.aimKind = kind; this.aimUntil = now + ms;
  }
  endAim() { this.aimUntil = 0; }
  flinch(from?: THREE.Vector3) { if (from && !this.downed) this.faceTo(from); this.hitT = performance.now() / 1000; }
  setDowned(on: boolean) { this.downed = on; }
  die() { if (this.deadT < 0) this.deadT = performance.now() / 1000; }
  revive() { this.deadT = -1; }
  setDim(on: boolean) {
    if (on === this.dimmed) return;
    this.dimmed = on;
    for (const { m, base } of this.mats) m.color.copy(base).multiplyScalar(on ? 0.5 : 1);
  }
  get pose(): Pose { return this.deadT >= 0 ? 'dead' : this.downed ? 'downed' : performance.now() < this.aimUntil ? 'aim' : this.running ? 'run' : 'idle'; }

  update(now = performance.now()) {
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    const t = now / 1000;
    let d = this.yawT - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * 14);
    const dead = this.deadT >= 0;
    const k = (cur: number, on: boolean, sp: number) => cur + ((on ? 1 : 0) - cur) * Math.min(1, dt * sp);
    this.runW = k(this.runW, this.running && !this.downed && !dead, 10);
    this.aimW = k(this.aimW, now < this.aimUntil && !this.downed && !dead, 12);
    this.downW = k(this.downW, this.downed || dead, dead ? 14 : 8);
    if (this.running) this.runPhase += dt * 13;
    const hitAge = t - this.hitT;
    const hit = hitAge < 0.45 ? Math.sin((hitAge / 0.45) * Math.PI) * (1 - (hitAge / 0.45) * 0.5) : 0;
    const f: AnimFrame = {
      t, dt, run: this.runW, aim: this.aimW, down: this.downW, hit,
      die: dead ? clamp01((t - this.deadT) / 0.7) : 0,
      ph: this.runPhase, sw: Math.sin(this.runPhase), breath: Math.sin(t * 2.2),
      kind: this.aimKind, aimAge: t - this.aimStart,
    };
    this.applyPose(f);
    this.placeInner(f);
  }

  protected abstract applyPose(f: AnimFrame): void;

  /** 整体：跑步上下颠 + 呼吸起伏；倒地 = 仰面躺下；受击后退半步；死亡 = 躺下后缩小沉下（P5 Shadow 化成黑雾） */
  private placeInner(f: AnimFrame) {
    const bob = f.run * Math.abs(Math.cos(f.ph)) * 0.05 + (1 - f.run) * 0.006 * (f.breath + 1);
    this.inner.rotation.set(-Math.PI / 2 * f.down, this.yaw, 0, 'YXZ');
    this.inner.position.set(0, bob + f.down * 0.12 - f.hit * 0.02, 0);
    if (f.hit) {
      this.inner.position.x -= Math.sin(this.yaw) * f.hit * 0.08;
      this.inner.position.z -= Math.cos(this.yaw) * f.hit * 0.08;
    }
    const vanish = ease(clamp01((f.die - 0.45) / 0.55));
    this.inner.scale.setScalar(1 - 0.95 * vanish);
    this.inner.position.y += vanish * 0.25;
  }
}

/** 挥砍曲线：0 → 举过头（向后）→ 劈到前下方，返回手臂绕 X 的角度（负 = 向前上抬） */
export function swingArm(age: number) {
  const p = clamp01(age / 0.55);
  if (p < 0.45) return -2.7 * ease(p / 0.45);
  if (p < 0.7) return -2.7 + 2.0 * ease((p - 0.45) / 0.25);
  return -0.7;
}
/** 突刺曲线：后拉蓄力 → 前刺（返回 0..1，1 = 刺出） */
export function thrust(age: number) {
  const p = clamp01(age / 0.5);
  if (p < 0.4) return -0.35 * ease(p / 0.4);
  if (p < 0.6) return -0.35 + 1.35 * ease((p - 0.4) / 0.2);
  return 1;
}

// ---------- 程序化 Q 版 ----------
export type JointName = 'hips' | 'chest' | 'head' | 'armL' | 'foreL' | 'handL' | 'armR' | 'foreR' | 'handR' | 'legL' | 'shinL' | 'legR' | 'shinR' | 'weapon' | 'tail';
export interface BodySpec {
  height: number;
  legLen: number;     // 胯 → 脚底
  torso: number;      // 胯 → 肩
  headR: number;      // 头半径（头约占身高 45%）
  neck: number;       // 肩 → 头中心
  shoulderX: number;  // 肩宽一半
  hipX: number;
  upperArm: number; foreArm: number;
  outline?: number;
}

type PartOpts = { outline?: boolean };
/** 零件累积器：每个关节一组；finalize() 按关节合并成顶点色网格 */
export class ChibiBuilder {
  readonly j = {} as Record<JointName, THREE.Group>;
  private parts = new Map<THREE.Group, { geo: THREE.BufferGeometry; outline: boolean }[]>();
  private glows: { joint: JointName; geo: THREE.BufferGeometry; color: number; at?: { p?: [number, number, number]; q?: THREE.Quaternion; s?: [number, number, number] }; halo: number }[] = [];
  constructor(readonly spec: BodySpec) {
    const s = spec, J = (n: JointName, parent: THREE.Object3D | null, x: number, y: number, z: number) => {
      const g = new THREE.Group(); g.name = n; g.position.set(x, y, z); g.rotation.order = 'YXZ'; parent?.add(g); this.j[n] = g; return g;
    };
    const hips = J('hips', null, 0, s.legLen, 0);
    const chest = J('chest', hips, 0, 0.02, 0);
    J('head', chest, 0, s.torso + s.neck, 0);
    for (const [side, sx] of [['L', 1], ['R', -1]] as const) {
      const arm = J(`arm${side}`, chest, sx * s.shoulderX, s.torso - 0.035, 0);
      const fore = J(`fore${side}`, arm, 0, -s.upperArm, 0);
      J(`hand${side}`, fore, 0, -s.foreArm, 0);
      const leg = J(`leg${side}`, hips, sx * s.hipX, 0, 0);
      J(`shin${side}`, leg, 0, -s.legLen * 0.5, 0);
    }
    J('weapon', this.j.handR, 0, -0.02, 0);
    J('tail', hips, 0, 0.02, -0.08);
  }
  /** 往关节 joint 上加一个零件：geo 已是关节局部坐标；可带位置/旋转/缩放 */
  add(joint: JointName, geo: THREE.BufferGeometry, color: number, at?: { p?: [number, number, number]; r?: [number, number, number]; s?: [number, number, number]; q?: THREE.Quaternion }, o: PartOpts = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...(at?.p ?? [0, 0, 0])),
      at?.q ?? new THREE.Quaternion().setFromEuler(new THREE.Euler(...(at?.r ?? [0, 0, 0]), 'YXZ')),
      new THREE.Vector3(...(at?.s ?? [1, 1, 1])));
    g.applyMatrix4(m);
    const c = new THREE.Color(color);
    const n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const jg = this.j[joint];
    if (!this.parts.has(jg)) this.parts.set(jg, []);
    this.parts.get(jg)!.push({ geo: g, outline: o.outline !== false });
    return this;
  }
  /** 自发光零件（不受光照/变暗影响，如敌兵面具红眼）：本体 + 加色光晕（halo = 光晕放大倍数，0 = 无） */
  glow(joint: JointName, geo: THREE.BufferGeometry, color: number, at?: { p?: [number, number, number]; q?: THREE.Quaternion; s?: [number, number, number] }, halo = 2.2) {
    this.glows.push({ joint, geo, color, at, halo });
    return this;
  }
  finalize(): { root: THREE.Group; mats: THREE.MeshToonMaterial[] } {
    for (const gl of this.glows) {
      const core = new THREE.Mesh(gl.geo, new THREE.MeshBasicMaterial({ color: gl.color, toneMapped: false }));
      if (gl.at?.p) core.position.set(...gl.at.p);
      if (gl.at?.q) core.quaternion.copy(gl.at.q);
      if (gl.at?.s) core.scale.set(...gl.at.s);
      core.raycast = () => {};
      this.j[gl.joint].add(core);
      if (gl.halo > 0) {
        const h = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: gl.color, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
        h.position.copy(core.position); h.quaternion.copy(core.quaternion);
        h.scale.copy(core.scale).multiplyScalar(gl.halo); h.scale.y = core.scale.y; // 只沿表面方向外扩
        h.raycast = () => {}; h.renderOrder = 5;
        this.j[gl.joint].add(h);
      }
    }
    const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient() });
    const ol = outlineMat(this.spec.outline ?? 0.012);
    for (const [jg, list] of this.parts) {
      const body = new THREE.Mesh(mergeGeometries(list.map((x) => x.geo))!, mat);
      body.castShadow = true; body.raycast = () => {};
      jg.add(body);
      const os = list.filter((x) => x.outline).map((x) => x.geo);
      if (os.length) { const o = new THREE.Mesh(mergeGeometries(os)!, ol); o.raycast = () => {}; o.userData.outline = true; jg.add(o); }
    }
    const root = new THREE.Group(); root.add(this.j.hips);
    return { root, mats: [mat] };
  }
}

// 常用几何
export const G = {
  sphere: (r: number, w = 18, h = 12) => new THREE.SphereGeometry(r, w, h),
  capsule: (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 4, 10),
  cyl: (rt: number, rb: number, h: number, seg = 12) => new THREE.CylinderGeometry(rt, rb, h, seg),
  cone: (r: number, h: number, seg = 8) => new THREE.ConeGeometry(r, h, seg),
  box: (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z),
  torus: (r: number, t: number, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, 6, 16, arc),
};

/** 武器姿态：idle = 不攻击时武器在世界里的俯仰（0 竖直朝上，+π/2 朝前）；attack = 攻击时同理；follow = 攻击时顺着手臂延长线 */
export interface WeaponPose { idle: number; attack: number | 'follow' }

/** 程序化 Q 版角色 */
export class ProcRig extends RigBase {
  protected j: Record<JointName, THREE.Group>;
  constructor(b: ChibiBuilder, private weapon: WeaponPose = { idle: 0, attack: 'follow' }, private style: 'hero' | 'soldier' = 'hero') {
    super(b.spec.height);
    const { root, mats } = b.finalize();
    this.j = b.j;
    for (const m of mats) this.mats.push({ m, base: m.color.clone() });
    this.inner.add(root);
    this.update();
  }
  protected applyPose(f: AnimFrame) {
    const j = this.j;
    for (const g of Object.values(j)) g.rotation.set(0, 0, 0);
    const { run, aim, hit, down, sw, breath } = f;
    const melee = f.kind === 'melee', skill = f.kind === 'skill', gun = f.kind === 'gun';
    // 躯干
    j.chest.rotation.x = 0.16 * run - 0.4 * hit + 0.1 * aim * (melee ? 1 : 0);
    j.chest.rotation.y = (gun ? 0.32 : 0.15) * aim + Math.sin(f.ph) * 0.1 * run;
    j.chest.scale.set(1 + 0.012 * breath * (1 - run), 1 + 0.015 * breath * (1 - run), 1);
    j.head.rotation.x = -0.22 * hit + 0.03 * breath - 0.08 * run;
    j.head.rotation.y = -0.25 * aim * (gun ? 1 : 0.4);
    j.head.rotation.z = 0.05 * Math.sin(f.t * 1.3) * (1 - run) * (1 - aim);
    // 手臂：自然下垂微外张；跑步前后摆；倒地张开
    const sway = 0.05 * breath * (1 - run);
    j.armL.rotation.z = 0.16 + sway + 1.0 * down;
    j.armR.rotation.z = -(0.16 + sway + 1.0 * down);
    j.armL.rotation.x = 0.8 * sw * run + 0.25 * hit;
    j.foreL.rotation.x = -(0.3 + 0.7 * run);
    let rArm = -0.8 * sw * run + 0.25 * hit, rFore = -(0.3 + 0.7 * run), rYaw = 0;
    if (this.style === 'soldier') rFore = -(1.35 - 0.4 * run); // 卫兵：右小臂端平，长枪竖握
    if (aim > 0.001) {
      let ax = rArm, af = rFore;
      if (melee && this.style === 'soldier') { const k = thrust(f.aimAge); ax = -0.35 - 1.0 * k; af = -1.35 + 1.35 * Math.max(0, k); }
      else if (melee) { ax = swingArm(f.aimAge); af = -0.25; }
      else if (skill) { ax = -2.5; af = -0.2; j.armL.rotation.x = j.armL.rotation.x * (1 - aim) - 1.4 * aim; }
      else { ax = -Math.PI / 2 - 0.12; af = 0; rYaw = -0.3; } // 举枪：手臂平伸指向目标（抵消上身侧转）
      rArm = rArm * (1 - aim) + ax * aim; rFore = rFore * (1 - aim) + af * aim; rYaw *= aim;
    }
    j.armR.rotation.x = rArm; j.armR.rotation.y = rYaw; j.foreR.rotation.x = rFore;
    // 腿
    j.legL.rotation.x = -0.7 * sw * run; j.legR.rotation.x = 0.7 * sw * run;
    j.shinL.rotation.x = (0.1 + 0.9 * Math.max(0, sw)) * run + 0.04;
    j.shinR.rotation.x = (0.1 + 0.9 * Math.max(0, -sw)) * run + 0.04;
    j.legL.rotation.z = 0.25 * down; j.legR.rotation.z = -0.25 * down;
    // 尾巴（Mona）
    j.tail.rotation.x = -0.5 + 0.12 * Math.sin(f.t * 3) + 0.3 * run;
    j.tail.rotation.z = 0.18 * Math.sin(f.t * 2.1);
    // 武器：先抵消手臂累计俯仰，再设世界俯仰
    const cum = rArm + rFore + j.chest.rotation.x;
    const want = this.weapon.attack === 'follow' ? null : this.weapon.attack;
    const idleW = this.weapon.idle - cum;
    const atkW = want == null ? Math.PI - 0.35 : want - cum;
    const wa = melee ? aim : aim * 0.6;
    j.weapon.rotation.x = idleW * (1 - wa) + atkW * wa;
  }
}
