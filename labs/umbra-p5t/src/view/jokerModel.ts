// Joker 实体模型（Hark 美术区）：P5T 社区提取模型，仅本地私用，不入 git。
// 文件由 tools/fetch-private-models.sh 拷到 public/models/private/；缺文件时 preloadJoker() 返回 false，main.ts 继续用占位胶囊。
// 模型是 T-pose、无动画：这里用「从静止姿势出发、按模型空间轴旋转骨骼」的程序化动画做 待机呼吸 / 跑步 / 举枪 / 受击 / 倒地。
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

const BASE = `${import.meta.env.BASE_URL ?? './'}models/private/`;
/** 优先怪盗服（发色被 mod 改黄，加载后改回近黑）；没有再用学生服（眼镜片会渲成白色，隐藏镜片） */
const FILES = ['joker_thief.glb', 'joker_school.glb'];
const TARGET_H = 1.1; // P5T Q 版身高 ≈ 1.1 格
const HAIR = new THREE.Color(0x1a1a22);
const OUTLINE_W = 0.011; // 模型单位（缩放前）

let proto: THREE.Object3D | null = null;
let protoH = 1;
let loading: Promise<boolean> | null = null;

let grad: THREE.DataTexture | null = null;
function gradient() {
  if (grad) return grad;
  grad = new THREE.DataTexture(new Uint8Array([150, 150, 150, 255, 215, 215, 215, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter;
  grad.needsUpdate = true;
  return grad;
}

/** 加载一次；成功 true，文件不存在/损坏 false（不抛错） */
export function preloadJoker(): Promise<boolean> {
  if (loading) return loading;
  const loader = new GLTFLoader();
  loading = (async () => {
    for (const f of FILES) {
      try {
        const res = await fetch(BASE + f, { method: 'HEAD' });
        if (!res.ok || !(res.headers.get('content-type') ?? '').match(/octet|gltf|model/)) continue; // dev 服务器对缺文件可能回 index.html
        const g = await loader.loadAsync(BASE + f);
        prepare(g.scene);
        proto = g.scene;
        return true;
      } catch { /* 下一个 */ }
    }
    return false;
  })();
  return loading;
}
export const jokerReady = () => !!proto;

function toonOf(src: THREE.MeshStandardMaterial): THREE.Material | null {
  const n = src.name || '';
  if (/_G00$/.test(n)) return null; // 学生服眼镜片：隐藏（渲成白色）
  const common = { map: src.map, side: src.side, transparent: src.transparent, alphaTest: src.transparent ? 0.02 : 0, depthWrite: !src.transparent };
  // 脸/眼/嘴：不受光（P5T 脸是平涂）
  if (/_(F00|E00|M00)/.test(n)) return new THREE.MeshBasicMaterial({ ...common, name: n });
  const m = new THREE.MeshToonMaterial({ ...common, name: n, color: 0xffffff, gradientMap: gradient() });
  if (/_H00$/.test(n)) {
    // 发色：mod 贴图是黄色 → 只取亮度做明暗，颜色换成近黑
    m.color.copy(HAIR);
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>',
        '#ifdef USE_MAP\n vec4 sdc = texture2D( map, vMapUv );\n float lum = dot( sdc.rgb, vec3( 0.299, 0.587, 0.114 ) );\n diffuseColor.rgb *= mix( 0.55, 1.9, lum );\n#endif');
    };
    m.customProgramCacheKey = () => 'joker-hair';
  }
  return m;
}

function outlineMat() {
  const m = new THREE.MeshBasicMaterial({ color: 0x050508, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n transformed += normalize( normal ) * ${OUTLINE_W.toFixed(4)};`);
  };
  m.customProgramCacheKey = () => 'joker-outline';
  return m;
}

function prepare(root: THREE.Object3D) {
  const meshes: THREE.SkinnedMesh[] = [];
  root.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) meshes.push(o as THREE.SkinnedMesh); });
  const box = new THREE.Box3();
  for (const sm of meshes) {
    const mats = (Array.isArray(sm.material) ? sm.material : [sm.material]) as THREE.MeshStandardMaterial[];
    const tm = mats.map(toonOf);
    if (tm.every((x) => !x)) { sm.visible = false; continue; }
    sm.material = Array.isArray(sm.material) ? tm.map((x) => x ?? new THREE.MeshBasicMaterial({ visible: false })) : tm[0]!;
    sm.frustumCulled = false; // 程序化骨骼动画会让包围盒失真
    sm.geometry.computeBoundingBox(); box.union(sm.geometry.boundingBox!);
  }
  protoH = Math.max(0.5, box.max.y - box.min.y);
}

function addOutlines(root: THREE.Object3D) {
  const mat = outlineMat();
  const src: THREE.SkinnedMesh[] = [];
  root.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh && /Body|Hair/.test(o.name) && o.visible) src.push(o as THREE.SkinnedMesh); });
  for (const sm of src) {
    const o = new THREE.SkinnedMesh(sm.geometry, mat);
    o.bind(sm.skeleton, sm.bindMatrix);
    o.bindMode = sm.bindMode;
    o.frustumCulled = false;
    o.name = sm.name + '_outline';
    o.userData.outline = true;
    o.position.copy(sm.position); o.quaternion.copy(sm.quaternion); o.scale.copy(sm.scale);
    sm.parent!.add(o);
  }
}

type Pose = 'idle' | 'run' | 'aim' | 'downed';
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);
const BONES = ['Jnt_C_Hips_00', 'Jnt_C_Spine_00', 'Jnt_C_Spine_01', 'Jnt_C_Spine_02', 'Jnt_C_Neck_00', 'Jnt_C_Head_00',
  'Jnt_L_Arm_00', 'Jnt_R_Arm_00', 'Jnt_L_ForeArm_00', 'Jnt_R_ForeArm_00',
  'Jnt_L_UpLeg_00', 'Jnt_R_UpLeg_00', 'Jnt_L_Leg_00', 'Jnt_R_Leg_00'] as const;
type BoneName = typeof BONES[number];

/** 一个 Joker 实例：root 挂进单位 Group；inner 负责朝向/倒地；update() 每帧驱动骨骼 */
export class JokerRig {
  readonly root = new THREE.Group();
  private inner = new THREE.Group();
  private model: THREE.Object3D;
  private bone = new Map<BoneName, THREE.Bone>();
  private rest = new Map<THREE.Bone, THREE.Quaternion>();
  private sideL = 1; // 左臂在模型 +x 还是 -x
  private mats: { m: THREE.MeshToonMaterial | THREE.MeshBasicMaterial; base: THREE.Color }[] = [];
  private yaw = 0; private yawT = 0;
  private running = false; private runPhase = 0; private runW = 0;
  private aimUntil = 0; private aimW = 0; private aimKind: 'gun' | 'melee' | 'skill' = 'gun';
  private hitT = -10; private downed = false; private downW = 0; private dimmed = false;
  private last = performance.now();

  constructor() {
    this.model = skClone(proto!);
    // 材质按实例复制（行动后变暗互不影响）
    this.model.traverse((o) => {
      const sm = o as THREE.SkinnedMesh;
      if (!sm.isSkinnedMesh) return;
      const cp = (m: THREE.Material) => { const c = m.clone(); c.onBeforeCompile = m.onBeforeCompile; c.customProgramCacheKey = m.customProgramCacheKey; const cc = c as THREE.MeshToonMaterial; if (cc.color) this.mats.push({ m: cc, base: cc.color.clone() }); return c; };
      sm.material = Array.isArray(sm.material) ? sm.material.map(cp) : cp(sm.material);
      sm.raycast = () => {}; // 拾取走下面的包围柱，避免对 6 万面蒙皮网格逐顶点求交
      sm.castShadow = true;
    });
    addOutlines(this.model);
    this.model.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.raycast = () => {}; });
    for (const n of BONES) { const b = this.model.getObjectByName(n) as THREE.Bone | undefined; if (b) { this.bone.set(n, b); this.rest.set(b, b.quaternion.clone()); } }
    this.model.updateMatrixWorld(true);
    const hand = this.model.getObjectByName('Jnt_L_Hand_00') ?? this.model.getObjectByName('Jnt_L_ForeArm_00');
    if (hand) this.sideL = Math.sign(hand.getWorldPosition(new THREE.Vector3()).x) || 1;
    const s = TARGET_H / protoH;
    this.model.scale.setScalar(s);
    this.inner.add(this.model);
    this.root.add(this.inner);
    // 拾取用隐形包围柱（Raycaster 不看 visible）
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, TARGET_H, 8), new THREE.MeshBasicMaterial());
    hit.position.y = TARGET_H / 2; hit.visible = false; hit.castShadow = false;
    hit.name = 'jokerHit';
    this.root.add(hit);
    this.apply(0, 0);
  }

  /** 朝向世界坐标点（xz） */
  faceTo(worldTarget: THREE.Vector3) {
    const p = this.root.getWorldPosition(new THREE.Vector3());
    const dx = worldTarget.x - p.x, dz = worldTarget.z - p.z;
    if (dx * dx + dz * dz < 1e-4) return;
    this.yawT = Math.atan2(dx, dz);
  }
  setRunning(on: boolean) { this.running = on; }
  aim(target: THREE.Vector3 | null, kind: 'gun' | 'melee' | 'skill' = 'gun', ms = 1600) { if (target) this.faceTo(target); this.aimKind = kind; this.aimUntil = performance.now() + ms; }
  endAim() { this.aimUntil = 0; }
  flinch(from?: THREE.Vector3) { if (from && !this.downed) this.faceTo(from); this.hitT = performance.now() / 1000; }
  setDowned(on: boolean) { this.downed = on; }
  setDim(on: boolean) {
    if (on === this.dimmed) return;
    this.dimmed = on;
    for (const { m, base } of this.mats) m.color.copy(base).multiplyScalar(on ? 0.5 : 1);
  }
  get pose(): Pose { return this.downed ? 'downed' : performance.now() < this.aimUntil ? 'aim' : this.running ? 'run' : 'idle'; }

  update(now = performance.now()) {
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    const t = now / 1000;
    // 平滑转身（取最短角）
    let d = this.yawT - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * 14);
    const k = (cur: number, on: boolean, sp: number) => cur + ((on ? 1 : 0) - cur) * Math.min(1, dt * sp);
    this.runW = k(this.runW, this.running && !this.downed, 10);
    this.aimW = k(this.aimW, now < this.aimUntil && !this.downed, 12);
    this.downW = k(this.downW, this.downed, 8);
    if (this.running) this.runPhase += dt * 13;
    this.apply(t, dt);
  }

  // ---------- 骨骼 ----------
  private chainQ(b: THREE.Object3D): THREE.Quaternion {
    // b 相对模型根的世界朝向（只乘局部旋转，模型内节点均无非均匀缩放）
    const q = new THREE.Quaternion();
    const list: THREE.Object3D[] = [];
    for (let o: THREE.Object3D | null = b; o && o !== this.model; o = o.parent) list.push(o);
    for (let i = list.length - 1; i >= 0; i--) q.multiply(list[i].quaternion);
    return q;
  }
  /** 绕「模型空间」轴旋转骨骼 */
  private rot(n: BoneName, axis: THREE.Vector3, ang: number) {
    const b = this.bone.get(n);
    if (!b || Math.abs(ang) < 1e-5) return;
    const qp = b.parent ? this.chainQ(b.parent) : new THREE.Quaternion();
    const qd = new THREE.Quaternion().setFromAxisAngle(axis, ang);
    const inv = qp.clone().invert();
    b.quaternion.premultiply(inv.multiply(qd).multiply(qp));
  }

  private apply(t: number, _dt: number) {
    for (const [b, q] of this.rest) b.quaternion.copy(q);
    const L = this.sideL, R = -this.sideL;
    const run = this.runW, aim = this.aimW, down = this.downW;
    const hitAge = t - this.hitT, hit = hitAge < 0.45 ? Math.sin((hitAge / 0.45) * Math.PI) * (1 - hitAge / 0.45 * 0.5) : 0;
    const ph = this.runPhase, sw = Math.sin(ph);
    const breath = Math.sin(t * 2.2);

    // 躯干：呼吸 + 跑步前倾 + 受击后仰 + 举枪侧身
    this.rot('Jnt_C_Spine_00', AX, 0.18 * run - 0.42 * hit);
    this.rot('Jnt_C_Spine_01', AX, 0.025 * breath * (1 - run));
    this.rot('Jnt_C_Spine_01', AY, R * 0.25 * aim * (this.aimKind === 'gun' ? 1 : 0.4));
    this.rot('Jnt_C_Spine_02', AY, sw * 0.12 * run);
    this.rot('Jnt_C_Head_00', AX, -0.2 * hit + 0.02 * breath - 0.1 * run);
    this.rot('Jnt_C_Head_00', AY, -R * 0.15 * aim);

    // 手臂：T-pose → 自然下垂（A-pose），跑步前后摆，倒地张开
    const lower = 1.22 * (1 - 0.55 * down);
    const idleSway = 0.04 * breath * (1 - run);
    // 左臂
    this.rot('Jnt_L_Arm_00', AZ, -L * (lower + idleSway));
    this.rot('Jnt_L_Arm_00', AX, sw * 0.75 * run + 0.12 * hit);
    this.rot('Jnt_L_ForeArm_00', AY, -L * (0.25 + 0.6 * run));
    // 右臂：举枪时直指前方（P5T 单手持枪）
    const rLower = lower * (1 - aim);
    this.rot('Jnt_R_Arm_00', AZ, -R * (rLower + idleSway));
    this.rot('Jnt_R_Arm_00', AX, -sw * 0.75 * run * (1 - aim) + 0.12 * hit);
    const aimYaw = this.aimKind === 'melee' ? 0.9 : Math.PI / 2;
    const aimUp = this.aimKind === 'skill' ? 0.9 : this.aimKind === 'melee' ? 0.5 : 0.08;
    this.rot('Jnt_R_Arm_00', AY, R * -aimYaw * aim);
    this.rot('Jnt_R_Arm_00', AX, -aimUp * aim);
    this.rot('Jnt_R_ForeArm_00', AY, -R * (0.25 + 0.6 * run) * (1 - aim));

    // 腿：跑步交替摆 + 屈膝；待机微屈
    this.rot('Jnt_L_UpLeg_00', AX, -sw * 0.7 * run);
    this.rot('Jnt_R_UpLeg_00', AX, sw * 0.7 * run);
    this.rot('Jnt_L_Leg_00', AX, (0.15 + 0.9 * Math.max(0, sw)) * run + 0.05 * (1 - run));
    this.rot('Jnt_R_Leg_00', AX, (0.15 + 0.9 * Math.max(0, -sw)) * run + 0.05 * (1 - run));

    // 整体：跑步上下颠 + 待机呼吸起伏；倒地 = 仰面躺下
    const bob = run * Math.abs(Math.cos(ph)) * 0.05 + (1 - run) * 0.006 * (breath + 1);
    this.inner.rotation.set(-Math.PI / 2 * down, this.yaw, 0, 'YXZ');
    this.inner.position.set(0, bob + down * 0.12 - hit * 0.02, 0);
    if (hit) { // 受击后退一小步（模型朝向反方向）
      this.inner.position.x -= Math.sin(this.yaw) * hit * 0.08;
      this.inner.position.z -= Math.cos(this.yaw) * hit * 0.08;
    }
  }
}

export function makeJoker(): JokerRig | null { return proto ? new JokerRig() : null; }
