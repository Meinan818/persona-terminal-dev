// Joker 实体模型（Hark 美术区）：优先 jokerAnim.ts（P5T 正版 PC0001_151 + 原版动作）；缺文件时退回这里的 P5T 社区提取模型，仅本地私用，不入 git。
// 文件由 tools/fetch-private-models.sh 拷到 public/models/private/；缺文件时 preloadJoker() 返回 false，main.ts 继续用占位胶囊。
// 模型是 T-pose、无动画：这里用「从静止姿势出发、按模型空间轴旋转骨骼」的程序化动画做 待机呼吸 / 跑步 / 举枪 / 受击 / 倒地。
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { RigBase, toonGradient, outlineMat as sharedOutline, swingArm } from './chibiRig';
import type { AnimFrame, UnitRig } from './chibiRig';
import { preloadJokerPilot, makeJokerPilot, jokerPilotReady } from './jokerAnim';

const BASE = `${import.meta.env.BASE_URL ?? './'}models/private/`;
/** 优先怪盗服（发色被 mod 改黄，加载后改回近黑）；没有再用学生服（眼镜片会渲成白色，隐藏镜片） */
const FILES = ['joker_thief.glb', 'joker_school.glb'];
const TARGET_H = 1.1; // P5T Q 版身高 ≈ 1.1 格
const HAIR = new THREE.Color(0x1a1a22);
const OUTLINE_W = 0.011; // 模型单位（缩放前）

let proto: THREE.Object3D | null = null;
let protoH = 1;
let loading: Promise<boolean> | null = null;

const gradient = toonGradient;

/** 加载一次；成功 true，文件不存在/损坏 false（不抛错） */
export function preloadJoker(): Promise<boolean> {
  if (loading) return loading;
  const loader = new GLTFLoader();
  loading = (async () => {
    if (await preloadJokerPilot()) return true; // 正版试点模型 + 原版动作优先
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
export const jokerReady = () => jokerPilotReady() || !!proto;

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

const outlineMat = () => sharedOutline(OUTLINE_W);

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

const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);
const BONES = ['Jnt_C_Hips_00', 'Jnt_C_Spine_00', 'Jnt_C_Spine_01', 'Jnt_C_Spine_02', 'Jnt_C_Neck_00', 'Jnt_C_Head_00',
  'Jnt_L_Arm_00', 'Jnt_R_Arm_00', 'Jnt_L_ForeArm_00', 'Jnt_R_ForeArm_00', 'Jnt_R_Hand_00',
  'Jnt_L_UpLeg_00', 'Jnt_R_UpLeg_00', 'Jnt_L_Leg_00', 'Jnt_R_Leg_00'] as const;
type BoneName = typeof BONES[number];

/** Joker 小手枪（P5T：右手单手持枪）：枪管沿 +Z，握把朝 -Y；每帧贴到右手骨骼，枪管顺着小臂方向 */
function makePistol() {
  const g = new THREE.Group();
  const mat = new THREE.MeshToonMaterial({ color: 0x4a4d57, gradientMap: toonGradient() });
  const dark = new THREE.MeshToonMaterial({ color: 0x23242a, gradientMap: toonGradient() });
  const ol = sharedOutline(0.006);
  const part = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, rx = 0) => {
    const a = new THREE.Mesh(geo, m); a.position.set(x, y, z); a.rotation.x = rx; a.castShadow = true;
    const o = new THREE.Mesh(geo, ol); o.position.copy(a.position); o.rotation.copy(a.rotation);
    g.add(a, o);
  };
  part(new THREE.BoxGeometry(0.032, 0.042, 0.15), mat, 0, 0.012, 0.045);       // 枪身/套筒
  part(new THREE.BoxGeometry(0.028, 0.075, 0.04), dark, 0, -0.03, -0.006, -0.25); // 握把
  part(new THREE.CylinderGeometry(0.009, 0.009, 0.04, 8), dark, 0, 0.018, 0.13, Math.PI / 2); // 枪口
  g.traverse((o) => { (o as THREE.Mesh).raycast = () => {}; });
  return g;
}

/** 一个 Joker 实例：root 挂进单位 Group；动画状态机见 chibiRig.RigBase，这里把权重落到 GLB 骨骼上 */
export class JokerRig extends RigBase {
  private model: THREE.Object3D;
  private bone = new Map<BoneName, THREE.Bone>();
  private restQ = new Map<THREE.Bone, THREE.Quaternion>();
  private sideL = 1; // 左臂在模型 +x 还是 -x
  private pistol = makePistol();
  private ready = false;

  constructor() {
    super(TARGET_H);
    this.model = skClone(proto!);
    // 材质按实例复制（行动后变暗互不影响）
    this.model.traverse((o) => {
      const sm = o as THREE.SkinnedMesh;
      if (!sm.isSkinnedMesh) return;
      const cp = (m: THREE.Material) => { const c = m.clone(); c.onBeforeCompile = m.onBeforeCompile; c.customProgramCacheKey = m.customProgramCacheKey; const cc = c as THREE.MeshToonMaterial; if (cc.color) this.mats.push({ m: cc, base: cc.color.clone() }); return c; };
      sm.material = Array.isArray(sm.material) ? sm.material.map(cp) : cp(sm.material);
      sm.raycast = () => {}; // 拾取走包围柱，避免对 6 万面蒙皮网格逐顶点求交
      sm.castShadow = true;
    });
    addOutlines(this.model);
    this.model.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.raycast = () => {}; });
    for (const n of BONES) { const b = this.model.getObjectByName(n) as THREE.Bone | undefined; if (b) { this.bone.set(n, b); this.restQ.set(b, b.quaternion.clone()); } }
    this.model.updateMatrixWorld(true);
    const hand = this.model.getObjectByName('Jnt_L_Hand_00') ?? this.model.getObjectByName('Jnt_L_ForeArm_00');
    if (hand) this.sideL = Math.sign(hand.getWorldPosition(new THREE.Vector3()).x) || 1;
    this.model.scale.setScalar(TARGET_H / protoH);
    this.inner.add(this.model);
    this.root.add(this.pistol);
    this.ready = true;
    this.update();
  }

  // ---------- 骨骼 ----------
  private chainQ(b: THREE.Object3D): THREE.Quaternion {
    // b 相对模型根的朝向（只乘局部旋转，模型内节点均无非均匀缩放）
    const q = new THREE.Quaternion();
    const list: THREE.Object3D[] = [];
    for (let o: THREE.Object3D | null = b; o && o !== this.model; o = o.parent) list.push(o);
    for (let i = list.length - 1; i >= 0; i--) q.multiply(list[i].quaternion);
    return q;
  }
  /** 绕「模型空间」轴旋转骨骼 */
  private rot(n: BoneName, axis: THREE.Vector3, ang: number) {
    if (Math.abs(ang) < 1e-5) return;
    this.rotQ(n, new THREE.Quaternion().setFromAxisAngle(axis, ang));
  }
  private rotQ(n: BoneName, qd: THREE.Quaternion) {
    const b = this.bone.get(n);
    if (!b) return;
    const qp = b.parent ? this.chainQ(b.parent) : new THREE.Quaternion();
    const inv = qp.clone().invert();
    b.quaternion.premultiply(inv.multiply(qd).multiply(qp));
  }
  /** 把骨骼 n（朝向子骨骼 child）在模型空间里转向 dir，权重 w */
  private point(n: BoneName, child: BoneName, dir: THREE.Vector3, w: number) {
    const b = this.bone.get(n), c = this.bone.get(child);
    if (!b || !c || w < 1e-3) return;
    const cur = c.position.clone().applyQuaternion(this.chainQ(b)).normalize();
    const qd = new THREE.Quaternion().setFromUnitVectors(cur, dir.clone().normalize());
    this.rotQ(n, new THREE.Quaternion().slerp(qd, w));
  }

  protected applyPose(f: AnimFrame) {
    if (!this.ready) return;
    for (const [b, q] of this.restQ) b.quaternion.copy(q);
    const L = this.sideL, R = -this.sideL;
    const { run, aim, down, hit, sw, breath } = f;
    const gun = f.kind === 'gun';

    // 躯干：呼吸 + 跑步前倾 + 受击后仰 + 举枪侧身（右肩向前）
    this.rot('Jnt_C_Spine_00', AX, 0.18 * run - 0.42 * hit);
    this.rot('Jnt_C_Spine_01', AX, 0.025 * breath * (1 - run));
    this.rot('Jnt_C_Spine_01', AY, R * 0.3 * aim * (gun ? 1 : 0.4));
    this.rot('Jnt_C_Spine_02', AY, sw * 0.12 * run);
    this.rot('Jnt_C_Head_00', AX, -0.2 * hit + 0.02 * breath - 0.1 * run);
    this.rot('Jnt_C_Head_00', AY, -R * 0.22 * aim * (gun ? 1 : 0.5));

    // 手臂：T-pose → 自然下垂，跑步前后摆，倒地张开
    const lower = 1.22 * (1 - 0.55 * down);
    const idleSway = 0.04 * breath * (1 - run);
    this.rot('Jnt_L_Arm_00', AZ, -L * (lower + idleSway));
    this.rot('Jnt_L_Arm_00', AX, sw * 0.75 * run + 0.12 * hit);
    this.rot('Jnt_L_ForeArm_00', AY, -L * (0.25 + 0.6 * run));
    this.rot('Jnt_R_Arm_00', AZ, -R * (lower + idleSway));
    this.rot('Jnt_R_Arm_00', AX, -sw * 0.75 * run + 0.12 * hit);
    this.rot('Jnt_R_ForeArm_00', AY, -R * (0.25 + 0.6 * run));
    // 右臂攻击：直接求方向（模型空间 +Z = 正前方），上臂+小臂伸直
    if (aim > 1e-3) {
      let dir: THREE.Vector3;
      if (gun) dir = new THREE.Vector3(L * 0.1, 0.16, 1);                  // 平举略高、略向身体中线收：过肩镜头里枪口对准目标
      else if (f.kind === 'skill') dir = new THREE.Vector3(R * 0.15, 1.6, 0.6); // 技能：举手
      else { const a = -swingArm(f.aimAge); dir = new THREE.Vector3(R * 0.2, -Math.cos(a), Math.sin(a)); } // 近战：举刀劈下
      this.point('Jnt_R_Arm_00', 'Jnt_R_ForeArm_00', dir, aim);
      this.point('Jnt_R_ForeArm_00', 'Jnt_R_Hand_00', dir, aim);
    }

    // 腿：跑步交替摆 + 屈膝；待机微屈
    this.rot('Jnt_L_UpLeg_00', AX, -sw * 0.7 * run);
    this.rot('Jnt_R_UpLeg_00', AX, sw * 0.7 * run);
    this.rot('Jnt_L_Leg_00', AX, (0.15 + 0.9 * Math.max(0, sw)) * run + 0.05 * (1 - run));
    this.rot('Jnt_R_Leg_00', AX, (0.15 + 0.9 * Math.max(0, -sw)) * run + 0.05 * (1 - run));
  }

  update(now = performance.now()) {
    super.update(now);
    this.placePistol();
  }
  /** 手枪贴右手：位置 = 手骨，枪管方向 = 小臂 → 手 */
  private placePistol() {
    const fa = this.bone.get('Jnt_R_ForeArm_00'), h = this.bone.get('Jnt_R_Hand_00');
    if (!fa || !h) { this.pistol.visible = false; return; }
    this.root.updateMatrixWorld(true);
    const pf = fa.getWorldPosition(new THREE.Vector3()), ph = h.getWorldPosition(new THREE.Vector3());
    const dir = ph.clone().sub(pf).normalize();
    const at = ph.clone().addScaledVector(dir, 0.035);
    this.pistol.position.copy(this.root.worldToLocal(at.clone()));
    this.pistol.up.set(0, 1, 0);
    if (Math.abs(dir.y) > 0.97) this.pistol.up.set(0, 0, 1).applyQuaternion(this.inner.getWorldQuaternion(new THREE.Quaternion()));
    this.pistol.lookAt(at.clone().add(dir));
    this.pistol.scale.setScalar(this.inner.scale.x);
  }
}

export function makeJoker(): UnitRig | null { return makeJokerPilot() ?? (proto ? new JokerRig() : null); }
