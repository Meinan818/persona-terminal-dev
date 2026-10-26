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
import { ORIG_LIGHTING, type OrigLighting } from './origLighting';

export interface OrigMapCfg {
  /** 原版任务号（文件名） */
  m: string;
  /** GLB 文件（M2/M3 是同一几何，共用一份） */
  file: string;
  /** 场景内格子原点偏移（M1/M2/M3 见下方 r9 核对；其余 0） */
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
  // r9 重新核对 M01/M02/M03（r7 的 rz −3.25 / 1 让 4 个可走格压在场景几何里）：
  //  ① lightmap UV 匹配实测：GLB 世界(X 取反) + (2, 0, −3.25) = 原版 Unity 世界（M01/M02 相同，=场景根 Map 位移）；
  //  ② M02 的判定面 Plane.glb 是角点原点网格 [−9,0]×[0,14]，与 M04/M05/M09… 一样放在世界原点（这些图 rx=rz=0 已实测）→ M02 格心 GLB z = sz+0.5+3.25；
  //  ③ L02 的 tiles = L01 的前 14 行（同一广场、同一批掩体）→ M02 sz = M01 sz − 4 → M01 rz = −0.75；
  //  ④ 俯视占用栅格：rz 取这两个值时所有 '#' 格都有高于地面 0.25m 的几何、所有 '.' 格都没有（旧值各有 4 个 '.' 格被占）。rx=2 不变。
  L01: { m: 'M01', file: 'M01.glb', rx: 2, rz: -0.75, D: 18, base: 1, step: 0.6, ...DAY },
  L02: { m: 'M02', file: 'M02.glb', rx: 2, rz: 3.25, D: 14, base: 1, step: 0.6, ...DAY },
  L03: { m: 'M03', file: 'M02.glb', rx: 2, rz: 3.25, D: 14, base: 1, step: 0.6, ...DAY },
  L04: { m: 'M04', file: 'M04.glb', rx: 0, rz: 0, D: 30, base: 1, step: 0.6, ...DAY },
  L05: { m: 'M05', file: 'M05.glb', rx: 0, rz: 0, D: 20, base: 1, step: 0.6, ...DAY },
  L06: { m: 'M09', file: 'M09.glb', rx: 0, rz: 0, D: 35, base: 1, step: 3, ...DAY },
  // r8：L07 = M08（两层，原版可走高度 1.0 / 6.0 → 层高 5m）、L09 = M07（单层）；M7/M8 是封闭外壳 → 高处裁切
  L07: { m: 'M08', file: 'M08.glb', rx: 0, rz: 0, D: 28, base: 1, step: 5, clipY: 9.2, ...DAY },
  L09: { m: 'M07', file: 'M07.glb', rx: 0, rz: 0, D: 24, base: 1, step: 0.6, clipY: 4.2, ...INDOOR },
  L08: { m: 'M17', file: 'M17.glb', rx: 0, rz: 0, D: 28, base: 1, step: 4, clipY: 8.2, ...INDOOR },
};
export const origCfg = (id: string): OrigMapCfg | null => ORIG_MAPS[id] ?? null;

const BASE = 'models/private/maps/';
const failed = new Set<string>();
export const origFailed = (id: string) => failed.has(id);

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

interface Loaded { file: string; root: THREE.Group; lm: THREE.Texture | null; stats: { tris: number; meshes: number; bytes: number; lmBytes?: number } }
let cur: Loaded | null = null;
let pending: { file: string; p: Promise<Loaded | null> } | null = null;
/** 裁切高度 uniform（所有地图材质共用） */
const clipU = { value: 1e6 };
/** 镜头侧剖切（同 Kenney 版 fold 的思路，r7 改成着色器）：格子矩形外、朝镜头一侧 14m 内、高于 cutH 的片元丢弃，
 *  让近镜头的房屋/外墙不挡战场（只隐藏，不改原版几何）。 */
const rectU = { value: new THREE.Vector4(0, 0, 0, 0) };
const toCamU = { value: new THREE.Vector2(0, 1) };
const cutU = { value: 2.4 };

// ── r9 光照（原版数据，着色为重建）────────────────────────────────────────────
// 原版：每图唯一 Directional = Mixed（实时直射 + 实时阴影，间接光烘进 lightmap）；lightmapped 渲染器（地面/路沿/墙）用
// lightmap 当间接光，其余（m_LightProbeUsage 多为 0）用 RenderSettings Trilight 环境光。Point/Area（M07/M08/M17）是烘焙灯，只在 lightmap 里。
// 数值：view/origLighting.ts（tools/gen-orig-lighting.py 从原始 typetree 生成）。
// 重建/推断（已标明）：P5T 地图着色器源码不在包里 → 漫反射用 Lambert（albedo ×（间接 + N·L·直射·阴影）），不做原版卡通分阶/高光/边缘光；
// lightmap 解码：r13 起按 Codex 核实的 BC6H + Linear（m_TextureFormat=24, m_ColorSpace=0）→ EXR 值就是线性光照，×1（r9–r12 的 ×4.59 dLDR 推断作废）；Trilight 用 sky/equator/ground 按法线 y 线性插值（Unity 是转成 SH，略软）；
// 雾：原版是相机深度线性雾，这里按“到格子矩形的水平距离 + 15m（假定战斗镜头距离）”算，免得俯视正交镜头把整图雾掉。
const L = {
  uAmbSky: { value: new THREE.Color(1, 1, 1) }, uAmbEq: { value: new THREE.Color(0.5, 0.5, 0.5) }, uAmbGround: { value: new THREE.Color(0.1, 0.1, 0.1) },
  uDirScale: { value: new THREE.Vector3(1, 1, 1) },
  uLmOn: { value: 0 }, uLmScale: { value: 1.0 },
  uFogOn: { value: 0 }, uFogCol: { value: new THREE.Color(0.5, 0.3, 0.7) }, uFog: { value: new THREE.Vector3(20, 100, 15) },
};
// r13：过肩瞄准时「镜头—目标」之间的遮挡物抖动镂空（原版 14:21 帧：挡在镜头前的木箱变成网格状半透明）。
// 原版做法（着色器/脚本）未导出 → 重建：圆柱（半径 0.8m）内、比目标近、离地 >0.12m 的片元按 2×2 有序抖动丢 3/4。
const AIM = { uAimOn: { value: 0 }, uAimCam: { value: new THREE.Vector3() }, uAimTgt: { value: new THREE.Vector3() }, uAimFloor: { value: 0 } };
/** full = r16b 结算：圆柱内场景几何整块镂空（不做棋盘半透），半径 1.4m —— 第 2 页 Joker 特写机位前常有雕像/旗杆 */
export function setAimSeeThrough(cam: THREE.Vector3 | null, tgt?: THREE.Vector3, floorY = 0, full = false) {
  AIM.uAimOn.value = cam && tgt ? (full ? 2 : 1) : 0;
  if (cam && tgt) { AIM.uAimCam.value.copy(cam); AIM.uAimTgt.value.copy(tgt); AIM.uAimFloor.value = floorY + 0.12; }
}
let curLighting: OrigLighting | null = null;
let FOG_CAM_DIST = 15;
export const origLighting = () => curLighting;
const LM_DECODE = 1.0; // r13：BC6H 线性 HDR，原值直接用（CODEX-TO-HARK「缺口 2」）

/** 把原版光照（Trilight 环境光 + 方向光比例 + lightmap 间接光 + 雾）接到一个 Lambert 材质上；gimmick 单位也用（无 lightmap）。 */
export function patchOrigLit(m: THREE.MeshLambertMaterial, opts: { clip?: boolean } = {}) {
  const clip = opts.clip ?? false;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, L, AIM);
    if (clip) { sh.uniforms.uClipY = clipU; sh.uniforms.uRect = rectU; sh.uniforms.uToCam = toCamU; sh.uniforms.uCut = cutU; }
    else sh.uniforms.uRect = rectU;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWorldP;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWorldP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    let f = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWorldP;
uniform vec3 uAmbSky, uAmbEq, uAmbGround, uDirScale, uFogCol, uFog;
uniform float uLmOn, uLmScale, uFogOn;
uniform vec4 uRect;
uniform float uAimOn, uAimFloor; uniform vec3 uAimCam, uAimTgt;
${clip ? 'uniform float uClipY; uniform vec2 uToCam; uniform float uCut;' : ''}`);
    f = f.replace('void main() {', `void main() {
  if (uAimOn > 0.5 && vWorldP.y > uAimFloor) {
    vec3 ab = uAimTgt - uAimCam; float t = dot(vWorldP - uAimCam, ab) / max(dot(ab, ab), 1e-4);
    if (t > 0.0 && t < 0.9 && length(vWorldP - (uAimCam + ab * t)) < (uAimOn > 1.5 ? 1.4 : 0.8)) {
      vec2 q = mod(floor(gl_FragCoord.xy), 2.0); if (uAimOn > 1.5 || q.x + q.y > 0.5) discard;
    }
  }`);
    if (clip) f = f.replace('void main() {', `void main() {
  if (vWorldP.y > uClipY) discard;
  if (vWorldP.y > uCut) {
    vec2 q = clamp(vWorldP.xz, uRect.xy, uRect.zw);
    vec2 v = vWorldP.xz - q; float l = length(v);
    if (l > 0.01 && l < 14.0 && dot(v, uToCam) > 0.35 * l) discard;
  }`);
    // 细节层（原版 _DetailAlbedoMap，GLB 里借 occlusionTexture 槽 → three aoMap）：albedo = mix(base, detail.rgb, detail.a × _DetailMapValue)（混合方式为重建）
    f = f.replace('#include <map_fragment>', `#include <map_fragment>
#ifdef USE_AOMAP
  { vec4 dt = texture2D(aoMap, vAoMapUv); float bA = 1.0;
#ifdef USE_SPECULARMAP
    bA = texture2D(specularMap, vSpecularMapUv).g; // r10 推断：原版 BaseMap alpha=0 处（如 Field01 红地毯）不叠细节层（原版帧里红地毯干净无污渍）
#endif
    diffuseColor.rgb = mix(diffuseColor.rgb, dt.rgb, dt.a * aoMapIntensity * bA); }
#endif`).replace('#include <aomap_fragment>', '')
      .replace('#include <lights_fragment_maps>', `{
  vec3 wN = inverseTransformDirection(normal, viewMatrix);
  vec3 amb = uAmbEq + (uAmbSky - uAmbEq) * max(wN.y, 0.0) + (uAmbGround - uAmbEq) * max(-wN.y, 0.0);
#ifdef USE_LIGHTMAP
  if (uLmOn > 0.5 && vLightMapUv.x > 0.25) amb = texture2D(lightMap, vec2((vLightMapUv.x - 0.5) * 2.0, vLightMapUv.y)).rgb * uLmScale;
#endif
  irradiance = amb * PI; // three 的 BRDF_Lambert 带 1/π，Unity 不带
}`)
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nreflectedLight.directDiffuse *= uDirScale;')
      .replace('#include <opaque_fragment>', `#include <opaque_fragment>
if (uFogOn > 0.5) { vec2 fq = clamp(vWorldP.xz, uRect.xy, uRect.zw); float fd = length(vWorldP.xz - fq) + uFog.z;
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogCol, clamp((fd - uFog.x) / (uFog.y - uFog.x), 0.0, 1.0)); }`);
    sh.fragmentShader = f;
  };
  m.customProgramCacheKey = () => 'origlit-' + (clip ? 'c' : 'n');
}

let lmTex: THREE.Texture | null = null;
function convertMaterial(src: THREE.Material): THREE.Material {
  const s = src as THREE.MeshStandardMaterial;
  const name = s.name || '';
  if (/sky/i.test(name)) { // 天空球：不受光、不进雾
    const m = new THREE.MeshBasicMaterial({ map: s.map, color: 0xffffff, fog: false, depthWrite: false });
    m.name = name; return m;
  }
  // Unity 自定义卡通着色器（UTS 系，源码不在包里）→ Lambert（重建，已标明）。r9 按原版材质参数补绑：法线(_BumpScale)、自发光、细节层、_BaseColor、_AlphaClip
  const m = new THREE.MeshLambertMaterial({ map: s.map, color: s.color, transparent: s.transparent, alphaTest: s.alphaTest, side: s.side });
  if (s.normalMap) { m.normalMap = s.normalMap; m.normalScale.copy(s.normalScale); }
  if (s.emissiveMap) { m.emissiveMap = s.emissiveMap; m.emissive.copy(s.emissive); }
  if (s.aoMap) { s.aoMap.colorSpace = THREE.SRGBColorSpace; m.aoMap = s.aoMap; m.aoMapIntensity = s.aoMapIntensity; }
  // r10：原版 BaseMap 的 alpha 遮罩（build-orig-map 存进 metallicRoughness 槽）→ 借 Lambert 的 specularMap 槽取样（无 envMap，不影响光照）
  if (s.metalnessMap ?? s.roughnessMap) { m.specularMap = (s.metalnessMap ?? s.roughnessMap)!; m.specularMap.colorSpace = THREE.NoColorSpace; }
  if (lmTex) { m.lightMap = lmTex; m.lightMap.channel = 1; }
  m.name = name;
  patchOrigLit(m, { clip: true });
  return m;
}

async function loadLightmap(file: string): Promise<THREE.Texture | null> {
  try {
    const t = await new THREE.TextureLoader().loadAsync(BASE + file.replace(/\.glb$/, '_lm.webp'));
    t.colorSpace = THREE.SRGBColorSpace; t.channel = 1; t.flipY = false; // EXR 行序 = Unity 原始行序（第 0 行 = v 0）：实测桶/块落点处 lightmap 变暗只在不翻转时成立（0.72 vs 0.93） t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; // 图集：不做 mip，免得块间渗色
    return t;
  } catch { return null; } // 没有 lightmap 文件 → 全部用 Trilight 环境光
}
async function load(file: string): Promise<Loaded | null> {
  try {
    lmTex = await loadLightmap(file);
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
    return { file, root, lm: lmTex, stats: { tris: Math.round(tris), meshes, bytes: buf.byteLength } };
  } catch (e) {
    console.warn('[origMap] load failed', file, e);
    return null;
  }
}

function dispose(l: Loaded) {
  l.root.removeFromParent();
  l.lm?.dispose();
  l.root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const mm = m as THREE.MeshLambertMaterial;
      mm.map?.dispose(); mm.normalMap?.dispose(); mm.emissiveMap?.dispose(); mm.aoMap?.dispose(); mm.dispose();
    }
  });
}

/** 关卡开始：把原版场景挂到 world 下（异步）。同一文件重开关卡不重新下载；换关时释放上一关。 */
export function attachOrigMap(world: THREE.Group, id: string, size: { w: number; h: number }, onDone: (ok: boolean, stats?: Loaded['stats']) => void) {
  const cfg = ORIG_MAPS[id];
  if (!cfg) { onDone(false); return; }
  rectU.value.set(-0.5, -0.5, size.w - 0.5, size.h - 0.5);
  cutU.value = baseCut = cfg.step > 1 ? cfg.step + 2.2 : 2.4;
  clipU.value = cfg.clipY ?? 1e6;
  setLighting(cfg);
  const place = (l: Loaded) => {
    l.root.rotation.set(0, Math.PI, 0);
    l.root.position.set(cfg.rx - 0.5, -cfg.base, cfg.rz + cfg.D - 0.5);
    world.add(l.root);
  };
  if (cur && cur.file === cfg.file) { L.uLmOn.value = cur.lm ? 1 : 0; place(cur); onDone(true, cur.stats); return; }
  if (cur) { dispose(cur); cur = null; }
  if (!pending || pending.file !== cfg.file) pending = { file: cfg.file, p: load(cfg.file) };
  const mine = pending;
  void mine.p.then((l) => {
    if (pending === mine) pending = null;
    if (!l) { failed.add(id); onDone(false); return; }
    if (cur && cur !== l) dispose(cur);
    cur = l; L.uLmOn.value = l.lm ? 1 : 0;
    if (world.parent) { place(l); onDone(true, l.stats); } // 世界已被新一次 build 换掉：新 build 会再调本函数并直接复用 cur
  });
}
function setLighting(cfg: OrigMapCfg) {
  const lt = ORIG_LIGHTING[cfg.m] ?? null; curLighting = lt;
  if (!lt) return;
  const k = lt.ambientIntensity;
  L.uAmbSky.value.setRGB(lt.ambSky[0] * k, lt.ambSky[1] * k, lt.ambSky[2] * k, THREE.LinearSRGBColorSpace);
  L.uAmbEq.value.setRGB(lt.ambEquator[0] * k, lt.ambEquator[1] * k, lt.ambEquator[2] * k, THREE.LinearSRGBColorSpace);
  L.uAmbGround.value.setRGB(lt.ambGround[0] * k, lt.ambGround[1] * k, lt.ambGround[2] * k, THREE.LinearSRGBColorSpace);
  L.uFogOn.value = lt.fog.on && lt.fog.mode === 1 ? 1 : 0;
  L.uFogCol.value.setRGB(lt.fog.color[0], lt.fog.color[1], lt.fog.color[2], THREE.LinearSRGBColorSpace);
  L.uFog.value.set(lt.fog.start, lt.fog.end, FOG_CAM_DIST);
}
/** r9：主方向光按原版 Directional 的方向；地图材质的直射光强度/颜色按原版（uDirScale = π×原版线性颜色×强度 ÷ 当前 sun；π 抵消 three 的 BRDF_Lambert 1/π），
 *  角色仍用游戏里调好的 sun 强度（卡通角色材质不是原版地图着色器）。返回原版方向（光线行进方向）或 null。 */
export function applyOrigSun(sun: THREE.DirectionalLight, cfg: OrigMapCfg, center: THREE.Vector3): THREE.Vector3 | null {
  const lt = ORIG_LIGHTING[cfg.m]; if (!lt) return null;
  const d = new THREE.Vector3(...lt.sunDir).normalize();
  sun.position.copy(center).addScaledVector(d, -25); sun.target.position.copy(center);
  const c = sun.color, i = sun.intensity || 1;
  L.uDirScale.value.set(Math.PI * lt.sunColor[0] * lt.sunIntensity / Math.max(1e-3, c.r * i), Math.PI * lt.sunColor[1] * lt.sunIntensity / Math.max(1e-3, c.g * i), Math.PI * lt.sunColor[2] * lt.sunIntensity / Math.max(1e-3, c.b * i));
  sun.shadow.intensity = lt.shadowStrength;
  return d;
}
let baseCut = 2.4;
/** r11：技能透视镜头（低俯角）期间把「格子矩形外、朝镜头一侧」的裁切高度压低，免得近处花坛/推车/柱子挡住画面
 *（原版有 BattleCameraCollider 遮挡处理，具体做法未导出 → 这里是近似）。null = 还原关卡默认值 */
export function setOrigCamCut(h: number | null) { cutU.value = h == null ? baseCut : Math.min(baseCut, h); }
/** 当前关卡 lightmap 是否在用（调试/统计） */
export const origLmOn = () => L.uLmOn.value > 0.5;
/** r10 色调校准钩子（截图对比用）：lightmap 解码倍数 / 雾的假定镜头距离 */
export function origTone(o: { lm?: number; fogDist?: number } = {}) {
  if (o.lm != null) L.uLmScale.value = o.lm;
  if (o.fogDist != null) { FOG_CAM_DIST = o.fogDist; L.uFog.value.z = o.fogDist; }
  return { lm: L.uLmScale.value, fogDist: L.uFog.value.z };
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
