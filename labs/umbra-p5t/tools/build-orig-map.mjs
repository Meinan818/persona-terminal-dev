// UMBRA r7: 原版 P5T 关卡 scene GLB → 手机运行时版（不改美术：删 AssetRipper 叠出来的 LOD_1/2、去重、
// 除 Roof 外按材质合批、贴图转 WebP 限尺寸、quantize + meshopt 压缩）。由 tools/fetch-private-maps.sh 调用。
// 依赖 @gltf-transform/{core,extensions,functions} + meshoptimizer + sharp，从 $GLTF_TOOLS/node_modules 解析（不进游戏依赖）。
// 用法: node tools/build-orig-map.mjs in.glb out.glb [maxTex=1024]
// r9 可选环境变量（fetch-private-maps.sh 传）：
//   LM_DIR   = umbra-assets r7/lighting/missions/Mxx → 贴回原版 lightmap UV（TEXCOORD_1，见 tools/orig-lightmap-uv.mjs）
//   MAT_JSON = umbra-assets r7/material_params/missions/Mxx/materials.json、TEX_DIR = batch-03/maps/Mxx/textures
//              → 按原版材质参数补绑 GLB 里缺的贴图槽：_BumpMap(+_BumpScale) → normalTexture、_EmissionMap(+_EmissionColor) → emissive、
//                _DetailAlbedoMap(_UVSec=1 → TEXCOORD_2 = 原版作者 UV1，_DetailMapValue) → 借 occlusionTexture 槽传给运行时
//                （运行时 origMap.ts 把它当细节层用，不当 AO）；_BaseColor、_AlphaClip/_Cutoff。
import { createRequire } from 'node:module';
import path from 'node:path';
const req = createRequire(path.join(process.env.GLTF_TOOLS || '/workspace/work/gltf-tools', 'package.json'));
const imp = (m) => import(req.resolve(m));
const { NodeIO } = await imp('@gltf-transform/core');
const { ALL_EXTENSIONS } = await imp('@gltf-transform/extensions');
const { dedup, prune, flatten, join, textureCompress, reorder, quantize, meshopt } = await imp('@gltf-transform/functions');
const { MeshoptEncoder, MeshoptDecoder } = await imp('meshoptimizer');
const fs = await import('node:fs');
const { applyLightmapUV } = await import(new URL('./orig-lightmap-uv.mjs', import.meta.url).href);
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
// 1e) r9：原版材质参数 → 补绑贴图槽
const s2l = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const detailMats = new Set();
const matLog = [];
if (process.env.MAT_JSON && fs.existsSync(process.env.MAT_JSON)) {
  const P = new Map(); for (const m of JSON.parse(fs.readFileSync(process.env.MAT_JSON, 'utf8'))) if (!P.has(m.material)) P.set(m.material, m);
  const texCache = new Map();
  const tex = (name) => {
    if (!name) return null;
    if (texCache.has(name)) return texCache.get(name);
    const f = path.join(process.env.TEX_DIR || '', name + '.png');
    const t = fs.existsSync(f) ? doc.createTexture(name).setImage(fs.readFileSync(f)).setMimeType('image/png').setURI(name + '.png') : null;
    texCache.set(name, t); return t;
  };
  for (const mat of root.listMaterials()) {
    const pm = P.get(mat.getName()); if (!pm) continue;
    const T = Object.fromEntries(pm.textures.filter((t) => t.texture).map((t) => [t.slot, t.texture]));
    const F = Object.fromEntries(pm.floats); const C = Object.fromEntries(pm.colors);
    const log = { m: mat.getName() };
    if (C._BaseColor) { const c = C._BaseColor; mat.setBaseColorFactor([s2l(c.r), s2l(c.g), s2l(c.b), c.a]); }
    if (T._BumpMap && (F._BumpScale ?? 1) > 0) { const t = tex(T._BumpMap); if (t) { mat.setNormalTexture(t); mat.getNormalTextureInfo().setTexCoord(0); mat.setNormalScale(F._BumpScale ?? 1); log.bump = F._BumpScale; } }
    const ec = C._EmissionColor;
    if (T._EmissionMap && ec && ec.r + ec.g + ec.b > 0) { const t = tex(T._EmissionMap); if (t) { mat.setEmissiveTexture(t); mat.setEmissiveFactor([s2l(ec.r), s2l(ec.g), s2l(ec.b)]); log.emis = [ec.r, ec.g, ec.b].map((q) => +q.toFixed(3)); } }
    if (T._DetailAlbedoMap && (F._DetailMapValue ?? 0) > 0) {
      const t = tex(T._DetailAlbedoMap);
      if (t) { mat.setOcclusionTexture(t); mat.getOcclusionTextureInfo().setTexCoord(F._UVSec === 1 ? 2 : 0); mat.setOcclusionStrength(F._DetailMapValue); if (F._UVSec === 1) detailMats.add(mat.getName()); log.detail = [F._UVSec, F._DetailMapValue]; }
    }
    if (F._AlphaClip === 1) { mat.setAlphaMode('MASK'); mat.setAlphaCutoff(F._Cutoff ?? 0.5); log.clip = F._Cutoff; }
    if (Object.keys(log).length > 1) matLog.push(log);
  }
}
// 1f) r9：原版 lightmap UV
let lmStats = null;
if (process.env.LM_DIR && fs.existsSync(path.join(process.env.LM_DIR, 'uv_lightmap.bin'))) {
  const st = applyLightmapUV(doc, process.env.LM_DIR, detailMats);
  lmStats = { offset: st.offset, lmRenderers: st.lmRenderers, nodes: st.nodesMatched, tris: st.tris, trisHit: st.trisHit, detailTris: st.detailTris, detailHit: st.detailHit, miss: st.miss.length };
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
  // r9：补绑的法线/自发光/细节层限 512（手机包体）；BaseMap 仍 ≤ maxTex
  textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(normalTexture|emissiveTexture|occlusionTexture)$/, resize: [512, 512], quality: 85 }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(?!normalTexture$|emissiveTexture$|occlusionTexture$).*$/, resize: [maxTex, maxTex], quality: 88 }),
  reorder({ encoder: MeshoptEncoder }),
  quantize({ quantizeTexcoord: 16 }), // r9：TEXCOORD_1 是 lightmap 图集坐标（2048 图集，12 bit 不够）
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
await io.write(out, doc);
let tris = 0, prims = 0;
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) { prims++; const idx = p.getIndices(); tris += (idx ? idx.getCount() : p.getAttribute('POSITION').getCount()) / 3; }
console.log(JSON.stringify({ out, lightmap: lmStats, mats: matLog.length, matLog: process.env.MAT_LOG ? matLog : undefined, removedLOD: removed, meshes: root.listMeshes().length, prims, trisUnique: tris, textures: root.listTextures().length }));
