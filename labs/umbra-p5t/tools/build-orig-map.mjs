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
