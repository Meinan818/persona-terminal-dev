// P5T 正版战斗 Q 版角色共用加载器（Hark 美术区）：Joker / Skull / Mona / Em0001 敌兵 / Marie Boss。
// 模型与动作 = Codex 从本机 P5T 提取（umbra-assets/p5t/1_battle/batch-02，Joker 缺 batch-02 时退回 pilot）；仅本地私用、不入 git：
// tools/fetch-private-models.sh 拷到 public/models/private/p5t/<key>.glb（+ <key>/shade.json 与 ShadeMap）。缺文件 → preload 返回 false，
// 调用方退回程序化 chibiRig（Skull/Mona/敌兵）或社区模型（Joker）。
// 动作：THREE.AnimationMixer 播原版 clip（名字去掉 A_<角色>_BTLxxxx_BASE_ 前缀与 _StepHokan 后缀，大小写统一），crossFade 0.2s。
//   待机 Idle / 移动 Run / 射击 GunStart→GunFire→GunLoop→GunEnd / 近战 Attack / 技能 SkillStart→SkillActStart→SkillActLoop→SkillActEnd /
//   受击 Damage / 倒地 DownStart→DownGround→DownGroundLoop→DownReturn / 死亡 Dead。
//   原版没有的 clip 不编：Em0001 无 Dead、Marie 无 Attack/Dead → 见 CharSpec.melee / die 的说明（只用该角色原版已有的 clip）。
// 材质：Unity 角色 shader 网页跑不了 → 自制近似：BaseMap 亮面 / ShadeMap 暗面硬分界赛璐璐 + 反向外壳描边；脸/眼/嘴/面具平涂；
//   隐藏 Unity 专用网格（*Outline / ModelOutline 描边网格、F00_Sh0x 脸部阴影叠片、备用嘴型/眼型、刀光 Blur）。
// 身高：所有角色用同一个「模型单位 → 世界格」比例（以 Joker 绑定姿势 1.1 格为基准），各角色相对身高 = 原模型比例。
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { outlineMat } from './chibiRig';
import type { UnitRig, AimKind, Pose } from './chibiRig';

const BASE = `${import.meta.env.BASE_URL ?? './'}models/private/`;
const XFADE = 0.2;
/** Run→Idle 停步 crossFade */
const STOP_FADE = 0.28;
/** Joker PC0001_151 绑定姿势全身高（模型单位，GLB 网格包围盒实测 0.01336）→ 1.1 格；其余角色同一比例 */
export const JOKER_MODEL_H = 0.01336;
export const WORLD_PER_UNIT = 1.1 / JOKER_MODEL_H;
/** 脸皮深度后推（模型单位；Joker 头高约 0.0035；用时 × WORLD_PER_UNIT 换成视空间） */
const FACE_PUSH = 0.0011;
/** 描边宽（模型单位） */
const OUTLINE_W = 0.000055;

export type ClipKey = 'Idle' | 'Run' | 'GunStart' | 'GunLoop' | 'GunFire' | 'GunEnd' | 'Attack' | 'Damage'
  | 'DownStart' | 'DownStartLoop' | 'DownGround' | 'DownGroundLoop' | 'DownReturn' | 'Dead'
  | 'SkillStart' | 'SkillStartLoop' | 'SkillActStart' | 'SkillActLoop' | 'SkillActEnd' | 'SkillCancel'
  | 'Personal' | 'ChainFishingStart' | 'ChainFishingLoop' | 'ChainFishingEnd' | 'BombStart' | 'BombLoop' | 'BombEnd'
  | 'ReadyStart' | 'ReadyLoop' | 'ReadyReturn' | 'HideL' | 'HideR';
const LOOPS: ClipKey[] = ['Idle', 'Run', 'GunLoop', 'DownStartLoop', 'DownGroundLoop', 'SkillStartLoop', 'SkillActLoop', 'ChainFishingLoop', 'BombLoop', 'ReadyLoop'];
/** 按住型 base：到时自动收（Loop → End） */
const HOLD_END: Partial<Record<ClipKey, ClipKey>> = { GunLoop: 'GunEnd', SkillActLoop: 'SkillActEnd', ChainFishingLoop: 'ChainFishingEnd' };

export interface CharSpec {
  key: string;
  /** public/models/private/ 下的候选文件（按顺序找第一个存在的）；shade 目录 = 同名去 .glb */
  files: string[];
  /** 近战动作：原版 Attack；没有 Attack 的角色用该角色原版里的近距离技能 clip 序列（写明出处） */
  melee?: { seq: ClipKey[]; hold?: ClipKey };
  /** 武器 GLB（静态，挂到原版挂点） */
  weapons?: { file: string; loc: string; show: (k: ClipKey) => boolean }[];
}

/** 持枪/持近战武器的手：原版数据没写，按原版 GunLoop / Attack 姿势里哪只手的 Loc_Wp_* 挂点在身前实测（tools/hand-probe.mjs） */
const HAND: Record<string, { gun: 'L' | 'R'; sword: 'L' | 'R' }> = {
  // 实测（10-26）：GunLoop 末帧挂点 z（身前）L/R —— Joker 参照 -0.26/0.39（右手，与已验收一致）、Skull 0.33/0.10、Mona 0.14/-0.23、
  //   Panther 0.27/0.03、Fox 0.41/0.23；Attack 挂点路程 L/R —— Skull 6.23/4.05、Mona 4.60/5.52、Panther 5.01/5.81、Fox 3.01/3.76。
  //   Skull/Mona 另拍 L/R 对照图目检（notes/shots/2026-10-26/hand-*.png）一致。
  skull: { gun: 'L', sword: 'L' }, mona: { gun: 'L', sword: 'R' }, panther: { gun: 'L', sword: 'R' }, fox: { gun: 'L', sword: 'R' },
};
function wp(gun: string, sword: string, h: { gun: 'L' | 'R'; sword: 'L' | 'R' }): CharSpec['weapons'] {
  return [
    { file: `p5t/wp_${gun}.glb`, loc: `Loc_Wp_Gun_${h.gun}`, show: (k) => /^Gun/.test(k) },
    { file: `p5t/wp_${sword}.glb`, loc: `Loc_Wp_Sword_${h.sword}`, show: (k) => k === 'Attack' },
  ];
}

export const SPECS: Record<string, CharSpec> = {
  joker: {
    key: 'joker', files: ['p5t/joker.glb', 'joker_pc0001_151.glb'],
    weapons: [
      { file: 'p5t/wp_gn01000.glb', loc: 'Loc_Wp_Gun_R', show: (k) => /^Gun/.test(k) },
      { file: 'p5t/wp_wp01900.glb', loc: 'Loc_Wp_Sword_R', show: (k) => k === 'Attack' },
    ],
  },
  skull: { key: 'skull', files: ['p5t/skull.glb'], weapons: wp('gn02000', 'wp02900', HAND.skull) },
  mona: { key: 'mona', files: ['p5t/mona.glb'], weapons: wp('gn03000', 'wp03900', HAND.mona) },
  // batch-03：Panther PC0004_151 / Fox PC0005_151 / Queen PC0006_151 / Erina PC0011_000（Queen/Erina 正版武器未导出 → 空手）
  // 武器按原版数据：units.csv 4051(Panther) GunId 4000 / SwordId 20401→PrefabNo 4900（鞭），5051(Fox) GunId 5000 / SwordId 20501→5900（刀）。
  //   batch-03 文件夹把 Gn04000/Wp04900 放在 Fox 下、Gn05000/Wp05900 放在 Panther 下 —— 与数据表相反，这里按数据表挂（已回报 Codex）
  panther: { key: 'panther', files: ['p5t/panther.glb'], weapons: wp('gn04000', 'wp04900', HAND.panther) },
  fox: { key: 'fox', files: ['p5t/fox.glb'], weapons: wp('gn05000', 'wp05900', HAND.fox) },
  queen: { key: 'queen', files: ['p5t/queen.glb'] },
  erina: { key: 'erina', files: ['p5t/erina.glb'] },
  // 被洗脑（举止异常的）Panther / Fox：PC0004_053 / PC0005_053
  // 洗脑款 4053/5053（关卡 4054/5054 的 PrefabNo 也是 4053/5053）原版 GunId 10000401/10000501 未导出 → 沿用本人正版武器（Gn04000/Wp04900、Gn05000/Wp05900）
  panther_bw: { key: 'panther_bw', files: ['p5t/panther_bw.glb'], weapons: wp('gn04000', 'wp04900', HAND.panther) },
  fox_bw: { key: 'fox_bw', files: ['p5t/fox_bw.glb'], weapons: wp('gn05000', 'wp05900', HAND.fox) },
  // 敌兵：Em0001_016 狙击火枪手（10001015/016）、Em0002_010 Grenadier（守卫 10002010；无枪 clip / 无 Dead）、Em0003_010 Drummer（伴奏者 10003010）
  em0001_016: { key: 'em0001_016', files: ['p5t/em0001_016.glb'] },
  em0002_010: { key: 'em0002_010', files: ['p5t/em0002_010.glb'] },
  em0003_010: { key: 'em0003_010', files: ['p5t/em0003_010.glb'] },
  // Em0001_110 = 火枪手（unit_10001110 用 T_Em0001_010 贴图，与关卡里 10001010 系火枪手同一外观；枪在模型里）
  em0001_110: { key: 'em0001_110', files: ['p5t/em0001_110.glb'] },
  // Em0001_610 = 暴徒（unitdatabase 10001610 系「暴徒」，玛丽王国 L01–L10 没有登场；接好待用）
  em0001_610: { key: 'em0001_610', files: ['p5t/em0001_610.glb'] },
  // Marie Em0501_010：原版动作集没有 Attack → 近战 = 原版锁链技能 ChainFishingStart→Loop→End（她唯一的近身技能动作）
  marie: { key: 'marie', files: ['p5t/marie.glb'], melee: { seq: ['ChainFishingStart'], hold: 'ChainFishingLoop' } },
};

interface Proto {
  scene: THREE.Object3D; clips: Map<ClipKey, THREE.AnimationClip>; shade: Map<string, THREE.Texture>;
  weapons: { scene: THREE.Object3D; loc: string; show: (k: ClipKey) => boolean }[];
}
const protos = new Map<string, Proto>();
const loading = new Map<string, Promise<boolean>>();

async function exists(url: string) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok && /octet|gltf|model|image|json/.test(res.headers.get('content-type') ?? ''); // dev 服务器对缺文件可能回 index.html
  } catch { return false; }
}
async function loadTex(url: string): Promise<THREE.Texture | null> {
  try {
    const t = await new THREE.TextureLoader().loadAsync(url);
    t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  } catch { return null; }
}
/** 原版 clip 名 → ClipKey（A_PC0001_BTL0011_BASE_GunStart / A_Em0501_BTL0001_BASE_idle / ..._Attack_StepHokan） */
export function clipKey(name: string): ClipKey | null {
  if (/_ADDB_/.test(name)) return null; // 叠加姿势（瞄准俯仰/转头），网页不做叠加层
  const m = /_BASE_(.+)$/.exec(name);
  if (!m) return null;
  const k = m[1].replace(/_StepHokan$/, '');
  return (k.charAt(0).toUpperCase() + k.slice(1)) as ClipKey;
}

/** 旧接口：Joker 试点路径（pilot 目录 ShadeMap） */
const LEGACY_SHADE: Record<string, string> = {
  'T_PC0001_C051_BaseMap_High.png': 'joker_pc0001_151/T_PC0001_C051_ShadeMap_High.png',
  'T_PC0001_H000_BaseMap_High.png': 'joker_pc0001_151/T_PC0001_H000_ShadeMap_High.png',
};

export function preloadChar(key: string): Promise<boolean> {
  const spec = SPECS[key];
  if (!spec) return Promise.resolve(false);
  let p = loading.get(key);
  if (p) return p;
  p = (async () => {
    let file: string | null = null;
    for (const f of spec.files) if (await exists(BASE + f)) { file = f; break; }
    if (!file) return false;
    try {
      const g = await new GLTFLoader().loadAsync(BASE + file);
      const clips = new Map<ClipKey, THREE.AnimationClip>();
      for (const c of g.animations) { const k = clipKey(c.name); if (k && !clips.has(k)) clips.set(k, c); }
      if (!clips.has('Idle')) return false;
      // ShadeMap：<key>/shade.json（BaseMap 图名 → ShadeMap 文件）；旧 pilot 路径用 LEGACY_SHADE
      const dir = file.replace(/\.glb$/, '/');
      let map: Record<string, string> = {};
      if (await exists(BASE + dir + 'shade.json')) {
        try { map = Object.fromEntries(Object.entries(await (await fetch(BASE + dir + 'shade.json')).json() as Record<string, string>).map(([a, b]) => [a, dir + b])); } catch { /* 无 */ }
      } else if (key === 'joker') map = LEGACY_SHADE;
      // retex.json：GLB 图名 → 替换 BaseMap（Marie 灰度 011 → 彩色 000，见 fetch 脚本）
      const retex = new Map<string, THREE.Texture>();
      if (await exists(BASE + dir + 'retex.json')) {
        try {
          const rt = await (await fetch(BASE + dir + 'retex.json')).json() as Record<string, string>;
          await Promise.all(Object.entries(rt).map(async ([a, b]) => { const t = await loadTex(BASE + dir + b); if (t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; retex.set(a.replace(/\.png$/, ''), t); } }));
        } catch { /* 无 */ }
      }
      if (retex.size) g.scene.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        const t = m?.map && retex.get(m.map.name.replace(/\.png$/, ''));
        if (t && m) { const n = m.map!.name; m.map = t; t.name = n; }
      });
      const shade = new Map<string, THREE.Texture>();
      await Promise.all(Object.entries(map).map(async ([base, f]) => { const t = await loadTex(BASE + f); if (t) shade.set(base.replace(/\.png$/, ''), t); }));
      const weapons: Proto['weapons'] = [];
      for (const w of spec.weapons ?? []) {
        if (!(await exists(BASE + w.file))) continue; // 缺正版武器就不拿（不再程序化）
        try { const wg = await new GLTFLoader().loadAsync(BASE + w.file); weapons.push({ scene: wg.scene, loc: w.loc, show: w.show }); } catch { /* 跳过 */ }
      }
      protos.set(key, { scene: g.scene, clips, shade, weapons });
      return true;
    } catch { return false; }
  })();
  loading.set(key, p);
  return p;
}
export const charReady = (key: string) => protos.has(key);
export function makeChar(key: string): P5tRig | null { return protos.has(key) ? new P5tRig(SPECS[key], protos.get(key)!) : null; }

// ---------- 材质（自制近似：Unity 角色 shader 网页跑不了） ----------
type Tint = { value: THREE.Color };
function celMat(src: THREE.MeshStandardMaterial, shade: THREE.Texture | null): { m: THREE.Material; tint: Tint } {
  const blend = src.transparent;
  const m = new THREE.MeshToonMaterial({ map: src.map, color: 0xffffff, name: src.name, transparent: blend, alphaTest: blend ? 0.02 : 0.5 * Number(!!src.alphaTest), side: src.side });
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
  m.customProgramCacheKey = () => `p5t-cel-${shade ? 1 : 0}-${blend ? 1 : 0}`;
  return { m, tint };
}
function flatMat(src: THREE.MeshStandardMaterial, push = 0): { m: THREE.MeshBasicMaterial; tint: Tint } {
  const blend = src.transparent;
  const m = new THREE.MeshBasicMaterial({ map: src.map, name: src.name, transparent: blend, depthWrite: !blend, alphaTest: blend ? 0.02 : 0, side: src.side });
  const tint: Tint = { value: m.color };
  if (push > 0) {
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        { vec4 pb = projectionMatrix * ( mvPosition + vec4( 0.0, 0.0, -${push.toFixed(5)}, 0.0 ) ); gl_Position.z = pb.z / pb.w * gl_Position.w; }`);
    };
    m.customProgramCacheKey = () => `p5t-face-${push.toFixed(5)}`;
  }
  return { m, tint };
}
function hullMat(w: number, push = 0) {
  if (!push) return outlineMat(w);
  const m = new THREE.MeshBasicMaterial({ color: 0x050508, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n transformed += normalize( normal ) * ${w.toFixed(6)};`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        { vec4 pb = projectionMatrix * ( mvPosition + vec4( 0.0, 0.0, -${push.toFixed(5)}, 0.0 ) ); gl_Position.z = pb.z / pb.w * gl_Position.w; }`);
  };
  m.customProgramCacheKey = () => `p5t-hull-${w.toFixed(6)}-${push.toFixed(5)}`;
  return m;
}

/** Unity 专用网格：描边网格、脸部阴影叠片、备用嘴型/眼型（表情切换用）、刀光 */
export function hiddenMesh(meshName: string, matName: string): boolean {
  if (/Outline/.test(meshName) || /^DefaultMaterial$|Outline/.test(matName) || /_Sh0\d$/.test(matName)) return true;
  if (/^Obj_Mouth\d+/.test(meshName) && meshName !== 'Obj_Mouth00') return true;
  if (/^Obj_Eye\d+$/.test(meshName) && !/^Obj_Eye(00|100)$/.test(meshName)) return true;
  if (/Blur/.test(meshName)) return true;
  return false;
}
/** 平涂类：眼/嘴/脸贴片（_Fa）/面具；脸皮（_F00 / F0xx）单独后推 */
const isFace = (mat: string) => /_F\d\d$/.test(mat);
const isFlat = (mat: string) => /_(E\d\d|M\d\d)(_|$)|_Fa$/.test(mat);

export class P5tRig implements UnitRig {
  readonly root = new THREE.Group();
  readonly height: number;
  readonly key: string;
  private inner = new THREE.Group();
  private model: THREE.Object3D;
  readonly mixer: THREE.AnimationMixer;
  private act = new Map<ClipKey, THREE.AnimationAction>();
  private cur: THREE.AnimationAction | null = null;
  oneShot: ClipKey | null = null;
  private shotEnd = 0;
  private seq: ClipKey[] = [];
  baseKey: ClipKey = 'Idle';
  private tints: Tint[] = [];
  private yaw = 0; private yawT = 0;
  private running = false; private downed = false; private dead = false;
  private aimUntil = 0;
  private dimmed = false;
  private last = performance.now();
  private wps: { obj: THREE.Object3D; show: (k: ClipKey) => boolean }[] = [];
  private clock = 0;

  constructor(private spec: CharSpec, P: Proto) {
    this.key = spec.key;
    this.model = skClone(P.scene);
    const s = WORLD_PER_UNIT;
    // 身高：同一比例下的绑定姿势包围盒（不含隐藏网格）
    const box = new THREE.Box3();
    this.model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !hiddenMesh(m.name, ((m.material as THREE.Material).name) || '')) { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox!); }
    });
    this.height = Math.max(0.3, (box.max.y - box.min.y) * s);
    this.root.add(this.inner);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, this.height, 8), new THREE.MeshBasicMaterial());
    hit.position.y = this.height / 2; hit.visible = false; hit.name = 'rigHit';
    this.root.add(hit);

    const outlineSrc: { sm: THREE.SkinnedMesh; push: number }[] = [];
    this.model.traverse((o) => {
      const sm = o as THREE.SkinnedMesh;
      if (!sm.isMesh) return;
      sm.frustumCulled = false; sm.raycast = () => {};
      const mats = (Array.isArray(sm.material) ? sm.material : [sm.material]) as THREE.MeshStandardMaterial[];
      if (mats.every((m) => hiddenMesh(sm.name, m.name || ''))) { sm.visible = false; return; }
      let face = false, body = false;
      const out = mats.map((src) => {
        const n = src.name || '';
        if (hiddenMesh(sm.name, n)) return new THREE.MeshBasicMaterial({ visible: false });
        let r: { m: THREE.Material; tint: Tint };
        if (isFace(n)) { r = flatMat(src, FACE_PUSH * s); face = true; }
        else if (isFlat(n)) r = flatMat(src);
        else { r = celMat(src, P.shade.get((src.map?.name ?? '').replace(/\.png$/, '')) ?? null); body = true; }
        this.tints.push(r.tint);
        return r.m;
      });
      sm.material = Array.isArray(sm.material) ? out : out[0];
      if (mats.some((m) => /_E\d\d/.test(m.name))) sm.renderOrder = 2; // 半透明虹膜在眼白之后
      if (body || face) { sm.castShadow = body; if ((sm as THREE.SkinnedMesh).isSkinnedMesh && !Array.isArray(sm.material)) outlineSrc.push({ sm, push: face ? FACE_PUSH * s : 0 }); }
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

    // 正版武器（静态 GLB，模型单位与角色一致）挂原版挂点
    for (const w of P.weapons) {
      const loc = this.model.getObjectByName(w.loc);
      if (!loc) continue;
      const obj = skClone(w.scene);
      obj.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        m.frustumCulled = false; m.raycast = () => {};
        const src = m.material as THREE.MeshStandardMaterial;
        if (hiddenMesh(m.name, src.name || '')) { m.visible = false; return; }
        const r = celMat(src, null); m.material = r.m; this.tints.push(r.tint); m.castShadow = true;
      });
      obj.visible = false; obj.name = 'wp_' + w.loc;
      loc.add(obj); this.wps.push({ obj, show: w.show });
    }

    this.mixer = new THREE.AnimationMixer(this.model);
    for (const [k, c] of P.clips) {
      const a = this.mixer.clipAction(c);
      if (LOOPS.includes(k)) a.setLoop(THREE.LoopRepeat, Infinity);
      else { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
      this.act.set(k, a);
    }
    this.play('Idle', 0);
    this.mixer.update(Math.random() * 2);
  }

  has(k: ClipKey) { return this.act.has(k); }
  /**
   * 走格步速：原版 Run clip 不带根位移（原地跑），按「半个循环 = 一步 = 一格」换算（Joker/Skull/Em0001 0.667s → 333ms/格，
   * Mona 0.533s → 267ms/格，Marie 1.733s → 867ms/格）。脚掌前后摆幅实测约 0.64–0.97 格（Mona 0.20 格），见 notes。
   */
  get msPerTile() { return Math.round(this.dur('Run') * 1000 / 2); }
  /** 等单次动作序列播完（不被后续事件打断） */
  settle(maxMs = 2500): Promise<void> {
    const t0 = performance.now();
    return new Promise((res) => {
      const tick = () => (!this.oneShot && !this.seq.length) || performance.now() - t0 > maxMs ? res() : setTimeout(tick, 30);
      tick();
    });
  }
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
  private enqueue(keys: ClipKey[]) { this.seq = keys.filter((k) => this.act.has(k)); this.next(); }
  private next() {
    const k = this.seq.shift();
    if (k) { this.oneShot = k; this.play(k); this.shotEnd = this.clock + Math.max(0.12, this.dur(k) - XFADE * 0.6); }
    else { this.oneShot = null; if (!(this.dead && this.cur === this.act.get(this.baseKey) && !LOOPS.includes(this.baseKey))) this.play(this.baseKey); }
  }
  private setBase(k: ClipKey) {
    if (k === this.baseKey) return;
    const prev = this.baseKey; this.baseKey = k;
    if (this.oneShot) return;
    const end = HOLD_END[prev];
    if (end && k !== 'Dead' && k !== 'DownGroundLoop') this.enqueue([end]);
    else this.play(k);
  }
  private idleBase(): ClipKey { return this.running ? 'Run' : 'Idle'; }
  private hold(k: ClipKey): ClipKey { return this.act.has(k) ? k : this.idleBase(); }
  private updateWeapons() {
    const k = this.oneShot ?? this.baseKey;
    const ok = !this.downed && !this.dead;
    for (const w of this.wps) w.obj.visible = ok && w.show(k);
  }

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
    if (HOLD_END[this.baseKey]) return;
    if (on && this.oneShot) { this.seq = []; this.oneShot = null; }
    if (!on && !this.oneShot && this.baseKey === 'Run') { this.baseKey = 'Idle'; this.play('Idle', STOP_FADE); return; }
    this.setBase(this.idleBase());
  }
  aim(target: THREE.Vector3 | null, kind: AimKind = 'gun', ms = 1600) {
    if (target) this.faceTo(target);
    this.aimUntil = performance.now() + ms;
    if (this.downed || this.dead) return;
    if (kind === 'gun') {
      const already = this.baseKey === 'GunLoop';
      this.baseKey = this.hold('GunLoop');
      this.enqueue(already ? ['GunFire'] : ['GunStart', 'GunFire']);
    } else if (kind === 'melee') {
      const m = this.spec.melee ?? { seq: ['Attack'] as ClipKey[] };
      this.baseKey = m.hold ? this.hold(m.hold) : this.idleBase();
      this.enqueue(m.seq);
    } else {
      // 技能 / 召唤人格面具：原版 Skill* clip
      this.baseKey = this.hold('SkillActLoop');
      this.enqueue(['SkillStart', 'SkillActStart']);
    }
  }
  endAim() { this.aimUntil = 0; }
  flinch(from?: THREE.Vector3) {
    if (this.dead) return;
    if (from && !this.downed) this.faceTo(from);
    if (this.downed) return;
    if (HOLD_END[this.baseKey]) this.baseKey = this.idleBase();
    this.enqueue(['Damage']);
  }
  setDowned(on: boolean) {
    if (on === this.downed || this.dead) return;
    this.downed = on;
    if (on) { this.baseKey = this.hold('DownGroundLoop'); this.enqueue(['DownStart', 'DownGround']); }
    else { this.baseKey = this.idleBase(); this.enqueue(['DownReturn']); }
  }
  /** 死亡：原版 Dead；没有 Dead 的（Em0001 / Marie）照原版倒地 DownStart→DownGround→躺地（之后由画面层按 KO 移除） */
  die() {
    if (this.dead) return;
    this.dead = true; this.seq = []; this.oneShot = null;
    if (this.act.has('Dead')) { this.baseKey = 'Dead'; this.enqueue(['Dead']); return; }
    this.baseKey = this.hold('DownGroundLoop');
    this.enqueue(this.downed ? [] : ['DownStart', 'DownGround']);
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
    const end = HOLD_END[this.baseKey];
    if (end && now >= this.aimUntil && !this.downed && !this.dead) {
      this.baseKey = this.idleBase();
      if (this.oneShot) { if (!this.seq.includes(end)) this.seq.push(end); }
      else this.enqueue([end]);
    }
    if (this.oneShot && this.clock >= this.shotEnd) this.next();
    this.mixer.update(dt);
    let d = this.yawT - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * 14);
    this.inner.rotation.y = this.yaw;
    this.updateWeapons();
  }
}
