// 原版 P5T 关卡场景（r7）：Codex 从本机 P5T 导出的逐关 scene GLB（umbra-assets p5t/1_battle/batch-03/maps），
// 由 tools/fetch-private-maps.sh 删重复 LOD / 合批 / WebP / meshopt 后放到 public/models/private/maps/（不入库）。
// 只做摆放、材质换算、隐藏屋顶/高处裁切，不改美术本身。
//
// 对齐（实测，见 notes/P5T-R7-MAPS-2026-10-26.md）：
//   GLB 里格心 = ( -(stage_x + 0.5) + rx ,  m_Height ,  stage_z + 0.5 + rz )
//   引擎格 (x, y) = (stage_x, D-1-stage_z)，世界坐标 (x, h, y)
//   ⇒ GLB → 引擎世界 = 绕 Y 转 180° + 平移 (rx - 0.5, -base, rz + D - 0.5)
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export interface OrigMapCfg {
  /** 原版任务号（文件名） */
  m: string;
  /** GLB 文件（M2/M3 是同一几何，共用一份） */
  file: string;
  /** 场景内格子原点偏移（M1/M2/M3 = 场景根 Map 的 Unity 位移；其余 0） */
  rx: number; rz: number;
  /** StageSettingData 深度（m_StageSize.y） */
  D: number;
  /** 引擎第 0 层对应的原版 m_Height */
  base: number;
  /** 引擎每层高度（= 原版两层可走高度差；单层图随便） */
  step: number;
  /** 高处裁切：世界 y 超过此值的片元丢弃（M7/M8/M17 这类封闭外壳：墙顶/屋顶挡镜头） */
  clipY?: number;
  /** 背景色（天空球外的清屏色） */
  bg: number;
  /** 灯光：半球天光 / 地面反光 / 强度、主光颜色 / 强度、主光方向 */
  hemi: [number, number, number]; sun: [number, number]; sunDir: [number, number, number];
  night?: boolean;
}
const DAY = { bg: 0x9ec8f0, hemi: [0xfff4ec, 0x8a7a7a, 1.15] as [number, number, number], sun: [0xfff0dc, 1.9] as [number, number], sunDir: [5, 12, 3] as [number, number, number] };
const INDOOR = { bg: 0x101018, hemi: [0xf0e8ff, 0x403040, 1.25] as [number, number, number], sun: [0xffe8d0, 1.5] as [number, number], sunDir: [3, 12, 5] as [number, number, number] };
export const ORIG_MAPS: Record<string, OrigMapCfg> = {
  L01: { m: 'M01', file: 'M01.glb', rx: 2, rz: -3.25, D: 18, base: 1, step: 0.6, ...DAY },
  L02: { m: 'M02', file: 'M02.glb', rx: 2, rz: 1, D: 14, base: 1, step: 0.6, ...DAY },
  L03: { m: 'M03', file: 'M02.glb', rx: 2, rz: 1, D: 14, base: 1, step: 0.6, ...DAY },
  L04: { m: 'M04', file: 'M04.glb', rx: 0, rz: 0, D: 30, base: 1, step: 0.6, ...DAY },
  L05: { m: 'M05', file: 'M05.glb', rx: 0, rz: 0, D: 20, base: 1, step: 0.6, ...DAY },
  L06: { m: 'M09', file: 'M09.glb', rx: 0, rz: 0, D: 35, base: 1, step: 3, ...DAY },
  L08: { m: 'M17', file: 'M17.glb', rx: 0, rz: 0, D: 28, base: 1, step: 4, clipY: 8.2, ...INDOOR },
};
export const origCfg = (id: string): OrigMapCfg | null => ORIG_MAPS[id] ?? null;

const BASE = 'models/private/maps/';
const failed = new Set<string>();
export const origFailed = (id: string) => failed.has(id);

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

interface Loaded { file: string; root: THREE.Group; stats: { tris: number; meshes: number; bytes: number } }
let cur: Loaded | null = null;
let pending: { file: string; p: Promise<Loaded | null> } | null = null;
/** 裁切高度 uniform（所有地图材质共用） */
const clipU = { value: 1e6 };
/** 镜头侧剖切（同 Kenney 版 fold 的思路，r7 改成着色器）：格子矩形外、朝镜头一侧 14m 内、高于 cutH 的片元丢弃，
 *  让近镜头的房屋/外墙不挡战场（只隐藏，不改原版几何）。 */
const rectU = { value: new THREE.Vector4(0, 0, 0, 0) };
const toCamU = { value: new THREE.Vector2(0, 1) };
const cutU = { value: 2.4 };

function convertMaterial(src: THREE.Material): THREE.Material {
  const s = src as THREE.MeshStandardMaterial;
  const name = s.name || '';
  if (/sky/i.test(name)) { // 天空球：不受光、不进雾
    const m = new THREE.MeshBasicMaterial({ map: s.map, color: 0xffffff, fog: false, depthWrite: false });
    m.name = name; return m;
  }
  // Unity 自定义卡通着色器被 AssetRipper 换成了只有 BaseMap 的 PBR（metallic 缺省=1 会发黑）→ 用 Lambert 照 BaseMap（近似，已标明）
  const m = new THREE.MeshLambertMaterial({ map: s.map, color: s.color, transparent: s.transparent, alphaTest: s.alphaTest, side: s.side });
  m.name = name;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uClipY = clipU; sh.uniforms.uRect = rectU; sh.uniforms.uToCam = toCamU; sh.uniforms.uCut = cutU;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWorldP;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWorldP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWorldP;\nuniform float uClipY;\nuniform vec4 uRect;\nuniform vec2 uToCam;\nuniform float uCut;')
      .replace('void main() {', `void main() {
  if (vWorldP.y > uClipY) discard;
  if (vWorldP.y > uCut) {
    vec2 q = clamp(vWorldP.xz, uRect.xy, uRect.zw);
    vec2 v = vWorldP.xz - q; float l = length(v);
    if (l > 0.01 && l < 14.0 && dot(v, uToCam) > 0.35 * l) discard;
  }`);
  };
  m.customProgramCacheKey = () => 'origmap-clip';
  return m;
}

async function load(file: string): Promise<Loaded | null> {
  try {
    const res = await fetch(BASE + file);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const g = await loader.parseAsync(buf, BASE);
    const root = new THREE.Group();
    root.name = 'origMap';
    let tris = 0, meshes = 0;
    g.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      meshes++;
      const geo = mesh.geometry;
      tris += (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(convertMaterial) : convertMaterial(mesh.material);
      const sky = /sky/i.test((mesh.material as THREE.Material).name);
      mesh.receiveShadow = !sky; mesh.castShadow = false;
      if (sky) { mesh.renderOrder = -10; mesh.frustumCulled = false; }
      if (/^ROOF_/.test(mesh.name)) mesh.visible = false; // 屋顶：战斗镜头下隐藏（不改美术）
    });
    root.add(g.scene);
    return { file, root, stats: { tris: Math.round(tris), meshes, bytes: buf.byteLength } };
  } catch (e) {
    console.warn('[origMap] load failed', file, e);
    return null;
  }
}

function dispose(l: Loaded) {
  l.root.removeFromParent();
  l.root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const mm = m as THREE.MeshLambertMaterial;
      mm.map?.dispose(); mm.dispose();
    }
  });
}

/** 关卡开始：把原版场景挂到 world 下（异步）。同一文件重开关卡不重新下载；换关时释放上一关。 */
export function attachOrigMap(world: THREE.Group, id: string, size: { w: number; h: number }, onDone: (ok: boolean, stats?: Loaded['stats']) => void) {
  const cfg = ORIG_MAPS[id];
  if (!cfg) { onDone(false); return; }
  rectU.value.set(-0.5, -0.5, size.w - 0.5, size.h - 0.5);
  cutU.value = cfg.step > 1 ? cfg.step + 2.2 : 2.4;
  clipU.value = cfg.clipY ?? 1e6;
  const place = (l: Loaded) => {
    l.root.rotation.set(0, Math.PI, 0);
    l.root.position.set(cfg.rx - 0.5, -cfg.base, cfg.rz + cfg.D - 0.5);
    world.add(l.root);
  };
  if (cur && cur.file === cfg.file) { place(cur); onDone(true, cur.stats); return; }
  if (cur) { dispose(cur); cur = null; }
  if (!pending || pending.file !== cfg.file) pending = { file: cfg.file, p: load(cfg.file) };
  const mine = pending;
  void mine.p.then((l) => {
    if (pending === mine) pending = null;
    if (!l) { failed.add(id); onDone(false); return; }
    if (cur && cur !== l) dispose(cur);
    cur = l;
    if (world.parent) { place(l); onDone(true, l.stats); } // 世界已被新一次 build 换掉：新 build 会再调本函数并直接复用 cur
  });
}
/** 离开原版地图关卡（换到自编关卡）时释放显存 */
export function releaseOrigMap() { if (cur) { dispose(cur); cur = null; } }
export const origMapStats = () => cur?.stats ?? null;

/** 每帧：镜头水平朝向（从目标指向相机） */
export function updateOrigMap(cam: THREE.Camera) {
  const d = new THREE.Vector3(); cam.getWorldDirection(d);
  const l = Math.hypot(d.x, d.z) || 1; toCamU.value.set(-d.x / l, -d.z / l);
}
/** 原版场景在格心处的地表高度（世界 y，未命中 = null）——用来判断掩体格原版场景里是否已有实物 */
export function origSurfaceY(x: number, y: number, from = 40): number | null {
  if (!cur || !cur.root.parent) return null;
  const rc = new THREE.Raycaster(new THREE.Vector3(x, from, y), new THREE.Vector3(0, -1, 0));
  const hit = rc.intersectObject(cur.root, true).find((h) => h.object.visible && !/sky/i.test((h.object as THREE.Mesh).material && ((h.object as THREE.Mesh).material as THREE.Material).name));
  return hit ? hit.point.y : null;
}
