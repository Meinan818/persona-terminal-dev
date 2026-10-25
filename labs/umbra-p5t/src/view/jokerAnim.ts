// Joker 正版 Q 版战斗模型（Hark 美术区）：P5T PC0001_151 怪盗服 + 原版 14 个战斗动作（Codex 从本机 P5T 提取的试点）。
// 仅本地私用、不入 git：tools/fetch-private-models.sh 从 umbra-assets/p5t/1_battle/pilot 拷到 public/models/private/；
// 缺文件时 preloadJokerPilot() 返回 false，jokerModel.ts 退回社区模型 + 程序化摆骨，再缺就是占位胶囊。
// 动作 = THREE.AnimationMixer 播原版 clip（待机 Idle / 移动 Run / 射击 GunStart→GunFire→GunLoop→GunEnd / 近战 Attack /
// 受击 Damage / 倒地 DownStart→DownGround→DownGroundLoop→DownReturn / 死亡 Dead），动作间 crossFade 0.2s；不再程序化摆骨。
// 材质：Unity 角色 shader 无法还原，这里用「BaseMap 亮面 / ShadeMap 暗面」两色硬分界的赛璐璐（同 P5T 的双贴图思路）+ 反向外壳黑描边；
// 脸/眼/嘴/面具平涂不受光；原模型里给 Unity 专用 shader 的描边网格和脸部阴影叠片（Sh00/Sh01，直接渲染会把整张脸盖黑）隐藏；
// 眼睛/面具在原模型里略陷进脸皮（Unity 靠渲染队列画在脸上），脸皮在深度上往后推一点让它们露出来。
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { outlineMat } from './chibiRig';
import type { UnitRig, AimKind, Pose } from './chibiRig';

const BASE = `${import.meta.env.BASE_URL ?? './'}models/private/`;
const FILE = 'joker_pc0001_151.glb';
const SHADE_DIR = 'joker_pc0001_151/';
const TARGET_H = 1.1; // 与旧模型一致：P5T Q 版身高 ≈ 1.1 格（默认镜头约 56px@1280×720）
const XFADE = 0.2;
/** 脸皮深度后推量（模型原始单位；头高约 0.0035） */
const FACE_PUSH = 0.0011;
/** 描边宽（模型原始单位；全身高约 0.0134） */
const OUTLINE_W = 0.000055;

export type ClipKey = 'Idle' | 'Run' | 'GunStart' | 'GunLoop' | 'GunFire' | 'GunEnd' | 'Attack' | 'Damage'
  | 'DownStart' | 'DownStartLoop' | 'DownGround' | 'DownGroundLoop' | 'DownReturn' | 'Dead';
const LOOPS: ClipKey[] = ['Idle', 'Run', 'GunLoop', 'DownStartLoop', 'DownGroundLoop'];

interface Proto { scene: THREE.Object3D; clips: Map<ClipKey, THREE.AnimationClip>; h: number; shade: Map<string, THREE.Texture | null> }
let proto: Proto | null = null;
let loading: Promise<boolean> | null = null;

async function exists(url: string) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok && /octet|gltf|model|image/.test(res.headers.get('content-type') ?? ''); // dev 服务器对缺文件可能回 index.html
  } catch { return false; }
}
async function loadTex(name: string): Promise<THREE.Texture | null> {
  const url = BASE + SHADE_DIR + name;
  if (!(await exists(url))) return null;
  try {
    const t = await new THREE.TextureLoader().loadAsync(url);
    t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  } catch { return null; }
}

export function preloadJokerPilot(): Promise<boolean> {
  if (loading) return loading;
  loading = (async () => {
    if (!(await exists(BASE + FILE))) return false;
    try {
      const [g, c51, h00] = await Promise.all([
        new GLTFLoader().loadAsync(BASE + FILE),
        loadTex('T_PC0001_C051_ShadeMap_High.png'),
        loadTex('T_PC0001_H000_ShadeMap_High.png'),
      ]);
      const clips = new Map<ClipKey, THREE.AnimationClip>();
      for (const c of g.animations) {
        const k = c.name.replace(/^A_PC0001_BTL\d+_BASE_/, '') as ClipKey;
        clips.set(k, c);
      }
      if (!clips.has('Idle')) return false;
      const box = new THREE.Box3();
      g.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && !/Outline/.test(m.name)) { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox!); } });
      proto = { scene: g.scene, clips, h: Math.max(1e-4, box.max.y - box.min.y), shade: new Map([['C51', c51], ['H00', h00]]) };
      return true;
    } catch { return false; }
  })();
  return loading;
}
export const jokerPilotReady = () => !!proto;

// ---------- 材质 ----------
type Tint = { value: THREE.Color };
/** 赛璐璐：半兰伯特 > 阈值取 BaseMap，否则取 ShadeMap（没有 ShadeMap 时用偏冷的压暗色），× uTint（行动后变暗） */
function celMat(src: THREE.MeshStandardMaterial, shade: THREE.Texture | null): { m: THREE.Material; tint: Tint } {
  const m = new THREE.MeshToonMaterial({ map: src.map, color: 0xffffff, name: src.name });
  const tint: Tint = { value: new THREE.Color(1, 1, 1) };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uShade = { value: shade };
    sh.uniforms.uTint = tint;
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', 'uniform sampler2D uShade;\nuniform vec3 uTint;\nvoid main() {')
      .replace('#include <opaque_fragment>', `
        vec3 litC = diffuseColor.rgb;
        vec3 shC = ${shade ? 'texture2D( uShade, vMapUv ).rgb * diffuse' : 'litC * vec3( 0.58, 0.58, 0.7 )'};
        float nl = 0.75;
        #if NUM_DIR_LIGHTS > 0
          nl = dot( normalize( normal ), directionalLights[ 0 ].direction ) * 0.5 + 0.5;
        #endif
        float lit = smoothstep( 0.40, 0.44, nl );
        gl_FragColor = vec4( mix( shC, litC, lit ) * uTint, diffuseColor.a );`);
  };
  m.customProgramCacheKey = () => `jk-cel-${shade ? 1 : 0}`;
  return { m, tint };
}
/** 平涂（脸/眼/嘴/面具）；push > 0 = 深度后推（脸皮） */
function flatMat(src: THREE.MeshStandardMaterial, push = 0): { m: THREE.MeshBasicMaterial; tint: Tint } {
  const blend = src.transparent;
  const m = new THREE.MeshBasicMaterial({ map: src.map, name: src.name, transparent: blend, depthWrite: !blend, alphaTest: blend ? 0.02 : 0 });
  const tint: Tint = { value: m.color };
  if (push > 0) {
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        { vec4 pb = projectionMatrix * ( mvPosition + vec4( 0.0, 0.0, -${push.toFixed(5)}, 0.0 ) ); gl_Position.z = pb.z / pb.w * gl_Position.w; }`);
    };
    m.customProgramCacheKey = () => `jk-face-${push.toFixed(5)}`;
  }
  return { m, tint };
}

/** 反向外壳描边；push > 0 时与脸皮同样深度后推（否则脸的描边壳会盖住后推的脸） */
function hullMat(w: number, push = 0) {
  if (!push) return outlineMat(w);
  const m = new THREE.MeshBasicMaterial({ color: 0x050508, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n transformed += normalize( normal ) * ${w.toFixed(6)};`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        { vec4 pb = projectionMatrix * ( mvPosition + vec4( 0.0, 0.0, -${push.toFixed(5)}, 0.0 ) ); gl_Position.z = pb.z / pb.w * gl_Position.w; }`);
  };
  m.customProgramCacheKey = () => `jk-hull-${w.toFixed(6)}-${push.toFixed(5)}`;
  return m;
}

/** 小手枪（P5T：右手单手持枪）：枪管沿 +Z，握把朝 -Y，单位 = 世界格 */
function makePistol() {
  const g = new THREE.Group();
  const mat = new THREE.MeshToonMaterial({ color: 0x4a4d57 });
  const dark = new THREE.MeshToonMaterial({ color: 0x1c1d22 });
  const ol = outlineMat(0.006);
  const part = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, rx = 0) => {
    const a = new THREE.Mesh(geo, m); a.position.set(x, y, z); a.rotation.x = rx; a.castShadow = true;
    const o = new THREE.Mesh(geo, ol); o.position.copy(a.position); o.rotation.copy(a.rotation);
    g.add(a, o);
  };
  part(new THREE.BoxGeometry(0.032, 0.042, 0.15), mat, 0, 0.012, 0.045);
  part(new THREE.BoxGeometry(0.028, 0.075, 0.04), dark, 0, -0.03, -0.006, -0.25);
  part(new THREE.CylinderGeometry(0.009, 0.009, 0.04, 8), dark, 0, 0.018, 0.13, Math.PI / 2);
  g.traverse((o) => { (o as THREE.Mesh).raycast = () => {}; });
  return g;
}
/** 短刀（近战 Attack 时握在右手）：刃沿 +Z */
function makeKnife() {
  const g = new THREE.Group();
  const blade = new THREE.MeshToonMaterial({ color: 0xc9ccd6 });
  const grip = new THREE.MeshToonMaterial({ color: 0x1c1d22 });
  const ol = outlineMat(0.005);
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, 0.2), blade); b.position.z = 0.13;
  const h = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.07), grip); h.position.z = 0;
  for (const m of [b, h]) { const o = new THREE.Mesh(m.geometry, ol); o.position.copy(m.position); g.add(m, o); }
  g.traverse((o) => { (o as THREE.Mesh).raycast = () => {}; });
  return g;
}

/** 武器在挂点（Loc_Wp_*_R）局部坐标下的摆放：截图调过，枪管/刀刃朝手背前方 */
export const WEAPON_POSE = {
  gun: { r: new THREE.Euler(0, -Math.PI / 2, 0), p: new THREE.Vector3(0, 0, 0) },
  knife: { r: new THREE.Euler(0, -Math.PI / 2, 0), p: new THREE.Vector3(0, 0, 0) },
};

export class JokerAnimRig implements UnitRig {
  readonly root = new THREE.Group();
  readonly height = TARGET_H;
  private inner = new THREE.Group();
  private model: THREE.Object3D;
  readonly mixer: THREE.AnimationMixer;
  private act = new Map<ClipKey, THREE.AnimationAction>();
  private cur: THREE.AnimationAction | null = null;
  /** 当前播放的单次动作（null = 正在播 baseKey 循环） */
  oneShot: ClipKey | null = null;
  private shotEnd = 0;
  private seq: ClipKey[] = [];
  baseKey: ClipKey = 'Idle';
  private tints: Tint[] = [];
  private yaw = 0; private yawT = 0;
  private running = false; private downed = false; private dead = false;
  private aimUntil = 0; private aimKind: AimKind = 'gun';
  private dimmed = false;
  private last = performance.now();
  private pistol = makePistol();
  private knife = makeKnife();
  private clock = 0; // 秒，跟 mixer 同步

  constructor() {
    const P = proto!;
    this.root.add(this.inner);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, TARGET_H, 8), new THREE.MeshBasicMaterial());
    hit.position.y = TARGET_H / 2; hit.visible = false; hit.name = 'rigHit';
    this.root.add(hit);

    this.model = skClone(P.scene);
    const s = TARGET_H / P.h;
    const outlineSrc: { sm: THREE.SkinnedMesh; push: number }[] = [];
    this.model.traverse((o) => {
      const sm = o as THREE.SkinnedMesh;
      if (!sm.isMesh) return;
      sm.frustumCulled = false; sm.raycast = () => {};
      const src = sm.material as THREE.MeshStandardMaterial;
      const n = src.name || '';
      // Unity 专用：描边网格（靠自定义 shader 外推）、脸部阴影叠片、表情用的备用嘴型 → 隐藏
      if (/Outline/.test(sm.name) || /DefaultMaterial|Outline/.test(n) || /_Sh0\d$/.test(n) || (/^Obj_Mouth/.test(sm.name) && sm.name !== 'Obj_Mouth00')) { sm.visible = false; return; }
      let r: { m: THREE.Material; tint: Tint };
      if (/_F00$/.test(n)) { r = flatMat(src, FACE_PUSH * s); outlineSrc.push({ sm, push: FACE_PUSH * s }); }
      else if (/_(E00|M\d\d)/.test(n)) r = flatMat(src);
      else { r = celMat(src, P.shade.get(/_H00$/.test(n) ? 'H00' : /_C51$/.test(n) ? 'C51' : '') ?? null); outlineSrc.push({ sm, push: 0 }); sm.castShadow = true; }
      if (/_E00$/.test(n)) sm.renderOrder = 2; // 半透明虹膜在眼白之后
      sm.material = r.m; this.tints.push(r.tint);
    });
    for (const { sm, push } of outlineSrc) {
      const o = new THREE.SkinnedMesh(sm.geometry, hullMat(OUTLINE_W, push));
      o.bind(sm.skeleton, sm.bindMatrix); o.bindMode = sm.bindMode;
      o.frustumCulled = false; o.raycast = () => {}; o.name = sm.name + '_ol'; o.userData.outline = true;
      o.position.copy(sm.position); o.quaternion.copy(sm.quaternion); o.scale.copy(sm.scale);
      sm.parent!.add(o);
    }
    this.model.scale.setScalar(s);
    this.inner.add(this.model);

    const gunLoc = this.model.getObjectByName('Loc_Wp_Gun_R') ?? this.model.getObjectByName('Jnt_R_Hand_00');
    const swLoc = this.model.getObjectByName('Loc_Wp_Sword_R') ?? gunLoc;
    for (const [w, loc, pose] of [[this.pistol, gunLoc, WEAPON_POSE.gun], [this.knife, swLoc, WEAPON_POSE.knife]] as const) {
      if (!loc) continue;
      const holder = new THREE.Group(); holder.scale.setScalar(1 / s); holder.name = 'wpHolder';
      w.rotation.copy(pose.r); w.position.copy(pose.p);
      holder.add(w); loc.add(holder); w.visible = false;
    }

    this.mixer = new THREE.AnimationMixer(this.model);
    for (const [k, c] of P.clips) {
      const a = this.mixer.clipAction(c);
      if (LOOPS.includes(k)) a.setLoop(THREE.LoopRepeat, Infinity);
      else { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
      this.act.set(k, a);
    }
    this.play('Idle', 0);
    this.mixer.update(Math.random() * 2); // 多实例错开相位
  }

  // ---------- 动作播放 ----------
  private play(k: ClipKey, fade = XFADE) {
    const a = this.act.get(k);
    if (!a) return;
    if (a === this.cur && LOOPS.includes(k)) return;
    a.reset(); a.setEffectiveTimeScale(1); a.setEffectiveWeight(1); a.play();
    if (this.cur && this.cur !== a && fade > 0) this.cur.crossFadeTo(a, fade, false);
    else if (this.cur && this.cur !== a) this.cur.stop();
    this.cur = a;
    this.updateWeapons();
  }
  private dur(k: ClipKey) { return this.act.get(k)?.getClip().duration ?? 0.3; }
  /** 打断当前单次动作，依次播 keys，播完回到 baseKey */
  private enqueue(keys: ClipKey[]) { this.seq = keys.filter((k) => this.act.has(k)); this.next(); }
  private next() {
    const k = this.seq.shift();
    if (k) { this.oneShot = k; this.play(k); this.shotEnd = this.clock + Math.max(0.12, this.dur(k) - XFADE * 0.6); }
    else { this.oneShot = null; this.play(this.baseKey); }
  }
  private setBase(k: ClipKey) {
    if (k === this.baseKey) return;
    const prev = this.baseKey; this.baseKey = k;
    if (this.oneShot) return; // 单次动作播完自然接上
    if (prev === 'GunLoop' && k !== 'Dead' && k !== 'DownGroundLoop') this.enqueue(['GunEnd']);
    else this.play(k);
  }
  private idleBase(): ClipKey { return this.running ? 'Run' : 'Idle'; }
  private updateWeapons() {
    const k = this.oneShot ?? this.baseKey;
    const gun = /^Gun/.test(k) && !this.downed && !this.dead;
    this.pistol.visible = gun;
    this.knife.visible = k === 'Attack';
  }

  // ---------- UnitRig ----------
  faceTo(p: THREE.Vector3) {
    const w = this.root.getWorldPosition(new THREE.Vector3());
    const dx = p.x - w.x, dz = p.z - w.z;
    if (dx * dx + dz * dz < 1e-4) return;
    this.yawT = Math.atan2(dx, dz);
  }
  setRunning(on: boolean) {
    if (on === this.running) return;
    this.running = on;
    if (this.downed || this.dead) return;
    if (this.baseKey === 'GunLoop') return;
    if (on && this.oneShot) { this.seq = []; this.oneShot = null; }
    this.setBase(this.idleBase());
  }
  aim(target: THREE.Vector3 | null, kind: AimKind = 'gun', ms = 1600) {
    if (target) this.faceTo(target);
    this.aimKind = kind; this.aimUntil = performance.now() + ms;
    if (this.downed || this.dead) return;
    if (kind === 'gun') {
      const already = this.baseKey === 'GunLoop';
      this.baseKey = 'GunLoop';
      this.enqueue(already ? ['GunFire'] : ['GunStart', 'GunFire']);
    } else if (kind === 'melee') {
      this.baseKey = this.idleBase();
      this.enqueue(['Attack']);
    }
    // skill：原版试点没有召唤人格面具的动作，保持待机（面朝目标）
  }
  endAim() { this.aimUntil = 0; }
  flinch(from?: THREE.Vector3) {
    if (this.dead) return;
    if (from && !this.downed) this.faceTo(from);
    if (this.downed) return;
    if (this.baseKey === 'GunLoop') this.baseKey = this.idleBase();
    this.enqueue(['Damage']);
  }
  setDowned(on: boolean) {
    if (on === this.downed || this.dead) return;
    this.downed = on;
    if (on) { this.baseKey = 'DownGroundLoop'; this.enqueue(['DownStart', 'DownGround']); }
    else { this.baseKey = this.idleBase(); this.enqueue(['DownReturn']); }
  }
  die() {
    if (this.dead) return;
    this.dead = true; this.baseKey = 'Dead'; this.seq = []; this.oneShot = null; this.play('Dead');
  }
  revive() {
    if (!this.dead) return;
    this.dead = false; this.downed = false; this.baseKey = this.idleBase(); this.play(this.baseKey);
  }
  setDim(on: boolean) {
    if (on === this.dimmed) return;
    this.dimmed = on;
    for (const t of this.tints) t.value.setScalar(on ? 0.5 : 1);
  }
  get pose(): Pose { return this.dead ? 'dead' : this.downed ? 'downed' : performance.now() < this.aimUntil ? 'aim' : this.running ? 'run' : 'idle'; }

  update(now = performance.now()) {
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000)); this.last = now;
    this.clock += dt;
    // 举枪到时自动收枪
    if (this.baseKey === 'GunLoop' && now >= this.aimUntil && !this.downed && !this.dead) {
      this.baseKey = this.idleBase();
      if (this.oneShot) { if (!this.seq.includes('GunEnd')) this.seq.push('GunEnd'); }
      else this.enqueue(['GunEnd']);
    }
    if (this.oneShot && this.clock >= this.shotEnd) this.next();
    this.mixer.update(dt);
    let d = this.yawT - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * 14);
    this.inner.rotation.y = this.yaw;
    this.updateWeapons();
  }
}

export function makeJokerPilot(): JokerAnimRig | null { return proto ? new JokerAnimRig() : null; }
