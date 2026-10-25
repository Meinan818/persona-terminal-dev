// UMBRA r7: 原版 P5T 关卡 scene GLB → 手机运行时版（不改美术：删 AssetRipper 叠出来的 LOD_1/2、去重、
// 除 Roof 外按材质合批、贴图转 WebP 限尺寸、quantize + meshopt 压缩）。由 tools/fetch-private-maps.sh 调用。
// 依赖 @gltf-transform/{core,extensions,functions} + meshoptimizer + sharp，从 $GLTF_TOOLS/node_modules 解析（不进游戏依赖）。
// 用法: node tools/build-orig-map.mjs in.glb out.glb [maxTex=1024]
import { createRequire } from 'node:module';
import path from 'node:path';
const req = createRequire(path.join(process.env.GLTF_TOOLS || '/workspace/work/gltf-tools', 'package.json'));
const imp = (m) => import(req.resolve(m));
const { NodeIO } = await imp('@gltf-transform/core');
const { ALL_EXTENSIONS } = await imp('@gltf-transform/extensions');
const { dedup, prune, flatten, join, textureCompress, reorder, quantize, meshopt } = await imp('@gltf-transform/functions');
const { MeshoptEncoder, MeshoptDecoder } = await imp('meshoptimizer');
const sharp = (await imp('sharp')).default;

const [inp, out, maxTexS] = process.argv.slice(2);
const maxTex = Number(maxTexS || 1024);
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(inp);
const root = doc.getRoot();
// 1) Unity LODGroup 被 AssetRipper 全导出（LOD_0/1/2 叠在同一位置）→ 只留 LOD_0
let removed = 0;
const kill = (n) => { for (const c of n.listChildren()) kill(c); n.dispose(); };
for (const n of root.listNodes()) {
  if (n.isDisposed?.()) continue;
  const nm = n.getName() || '';
  if (/^LOD_?[1-9]\b/i.test(nm) || /_LOD[1-9]$/i.test(nm)) { kill(n); removed++; }
}
// 1b) r8 gimmick 单位（PREFAB_UNSCALE=1）：Codex 的 FBX→GLB 在 prefab 根上多了 0.01 缩放（顶点本身已是米）→ 改回 1
if (process.env.PREFAB_UNSCALE) for (const n of root.listNodes()) {
  const sc = n.getScale(); if (/^prefab_/.test(n.getName() || '') && Math.abs(sc[0] - 0.01) < 1e-4) n.setScale([1, 1, 1]);
}
// 1c) 同上：场景根上游离在 prefab 外、没有 Unity 坐标转换的网格节点（20001200 的 mesh1/mesh2 = 未挂 LOD 组的 LOD_1/LOD_2 副本）→ 删
if (process.env.PREFAB_UNSCALE) for (const sc of root.listScenes()) for (const n of sc.listChildren()) {
  if (!/^prefab_/.test(n.getName() || '') && n.getMesh()) { kill(n); removed++; }
}
// 1d) 同上：xxx_mesh0/_mesh1/_mesh2 三个同包围盒、三角形递减（96/60/26、1046/565/292…）= LOD0/1/2 叠放 → 只留 _mesh0
if (process.env.PREFAB_UNSCALE) {
  const names = new Set(root.listNodes().filter((n) => !n.isDisposed?.()).map((n) => n.getName()));
  for (const n of root.listNodes()) {
    if (n.isDisposed?.()) continue;
    const m = /^(.*)_mesh([12])$/.exec(n.getName() || '');
    if (m && names.has(m[1] + '_mesh0')) { kill(n); removed++; }
  }
}
// 2) 合并绘制：除 Roof（运行时隐藏用）外清空节点名 → flatten + join 按材质合批（不改几何/贴图，只减 draw call）
const KEEP = /^(Roof|Ceiling)/i;
const under = (n) => { for (let p = n; p; p = p.getParentNode()) if (KEEP.test(p.getName() || '')) return true; return false; };
for (const n of root.listNodes()) { if (n.isDisposed?.()) continue; if (under(n)) { if (n.getMesh()) n.setName('ROOF_' + (n.getName() || '')); } else n.setName(''); }
await doc.transform(
  dedup(),
  prune({ keepLeaves: false }),
  flatten(),
  join({ keepNamed: true }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [maxTex, maxTex], quality: 88 }),
  reorder({ encoder: MeshoptEncoder }),
  quantize(),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
await io.write(out, doc);
let tris = 0, prims = 0;
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) { prims++; const idx = p.getIndices(); tris += (idx ? idx.getCount() : p.getAttribute('POSITION').getCount()) / 3; }
console.log(JSON.stringify({ out, removedLOD: removed, meshes: root.listMeshes().length, prims, trisUnique: tris, textures: root.listTextures().length }));
