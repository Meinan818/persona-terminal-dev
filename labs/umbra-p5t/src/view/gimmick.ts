// r8：原版 P5T gimmick 单位（掩体块 / 炸弹桶 / 真理惠军旗帜）——Codex 515c714 导出的原版预制体 GLB，
// tools/fetch-p5t-gimmick.sh 压到 public/models/private/gimmick/（不入库）。落点 = 原版 m_GimmickList（gimmickData.ts）。
// 只摆放 + 材质换算（Unity 卡通着色器 → Lambert 照 BaseMap，近似，同 origMap），不改美术。按关加载、换关释放。
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GIMMICK_PLACEMENTS, GIMMICK_UNITS } from './gimmickData';
import { patchOrigLit } from './origMap';

const BASE = 'models/private/gimmick/';
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const cache = new Map<string, Promise<THREE.Group | null>>();
const done = new Map<string, THREE.Group>();

function conv(src: THREE.Material): THREE.Material {
  const s = src as THREE.MeshStandardMaterial;
  const m = new THREE.MeshLambertMaterial({ map: s.map, color: s.color, transparent: s.transparent, alphaTest: s.alphaTest || (s.transparent ? 0.3 : 0), side: s.side });
  m.name = s.name;
  patchOrigLit(m); // r9：同地图——原版环境光/方向光比例/雾（gimmick 不在 lightmap 里，用 Trilight 环境光）
  return m;
}
export function loadGimmick(file: string): Promise<THREE.Group | null> {
  let p = cache.get(file);
  if (!p) {
    p = loader.loadAsync(BASE + file).then((g) => {
      const root = g.scene;
      root.traverse((o) => {
        const mesh = o as THREE.Mesh; if (!mesh.isMesh) return;
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(conv) : conv(mesh.material);
        mesh.castShadow = true; mesh.receiveShadow = true;
      });
      done.set(file, root);
      return root;
    }).catch((e) => { console.warn('[gimmick] load failed', file, e); return null; });
    cache.set(file, p);
  }
  return p;
}
/** 原版 direction（0..3，Unity 绕 Y 90° 步进）→ 引擎绕 Y 角度。
 *  Unity→glTF 镜像 X（角度取反），原版场景 → 引擎再转 180°（见 origMap.ts）⇒ π − dir·π/2（推断，掩体块近似对称，看不出错） */
export const dirToYaw = (dir: number) => Math.PI - dir * Math.PI / 2;

export const gimmickPlacements = (levelId: string) => GIMMICK_PLACEMENTS[levelId] ?? [];
export const gimmickUnit = (id: number) => GIMMICK_UNITS[id];

/** 关卡开始：把该关的原版掩体单位摆到 world（异步）。返回原版已占用的格（不需要 Kenney 占位） */
export function attachGimmicks(world: THREE.Group, levelId: string, hAt: (x: number, y: number) => number, onDone?: (n: number) => void): Set<string> {
  const rows = gimmickPlacements(levelId);
  const cells = new Set(rows.filter((r) => gimmickUnit(r[0])?.type !== 1).map((r) => `${r[1]},${r[2]}`));
  const files = [...new Set(rows.map((r) => gimmickUnit(r[0])?.file).filter(Boolean) as string[])];
  releaseGimmicks(files);
  void Promise.all(files.map(loadGimmick)).then(() => {
    if (!world.parent) return;
    const g = new THREE.Group(); g.name = 'origGimmicks';
    let n = 0;
    for (const [id, x, y, dir] of rows) {
      if (gimmickUnit(id)?.type === 1) continue; // 炸弹桶 = 规则里的道具单位（props barrel），由 addUnitMesh 画
      const u = gimmickUnit(id); const tpl = u && done.get(u.file); if (!tpl) continue;
      const o = tpl.clone(true);
      o.position.set(x, hAt(x, y), y); o.rotation.y = dirToYaw(dir);
      o.userData = { x, y };
      g.add(o); n++;
    }
    world.add(g); onDone?.(n);
  });
  return cells;
}
/** 道具单位（炸弹桶 / 旗帜）：异步换成原版模型；没有文件 → 保留调用方的占位 */
export function swapPropModel(group: THREE.Group, kind: 'barrel' | 'flag', onSwap?: () => void) {
  const file = kind === 'barrel' ? 'unit_20001010.glb' : 'unit_20001240.glb';
  void loadGimmick(file).then((tpl) => {
    if (!tpl) return;
    for (const c of [...group.children]) if (c.userData.placeholder) c.removeFromParent();
    const o = tpl.clone(true);
    if (kind === 'flag') o.scale.setScalar(0.8);
    o.traverse((m) => { if ((m as THREE.Mesh).isMesh) m.userData = { ...group.userData }; });
    group.add(o); onSwap?.();
  });
}
/** 换关：释放本关不用的模型（几何/贴图） */
export function releaseGimmicks(keep: string[] = []) {
  for (const [file, root] of done) {
    if (keep.includes(file) || file === 'unit_20001010.glb' || file === 'unit_20001240.glb') continue;
    root.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; m.geometry.dispose(); for (const mm of [m.material].flat() as THREE.MeshLambertMaterial[]) { mm.map?.dispose(); mm.dispose(); } });
    done.delete(file); cache.delete(file);
  }
}
