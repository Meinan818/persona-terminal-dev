// UMBRA r9: 把原版 lightmap UV 贴回 AssetRipper 导出的场景 GLB（TEXCOORD_1）。
// 数据：umbra-assets p5t/1_battle/r7/lighting/missions/Mxx/{renderers_lightmap.json, uv_lightmap.bin, uv_lightmap_manifest.json}
//   - 原版是 Unity 静态合批：渲染器引用 "Combined Mesh (root: scene) N"，顶点在 Unity 世界坐标，
//     UV1 已经烘进了 m_LightmapTilingOffset（实测：同一合批网格里各 lightmapped 渲染器的 UV1 落在各自 scale/offset 矩形内，见 verify）。
//   - 非合批网格（少数）：UV1 在网格局部，需要 × scale + offset。
//   - GLB（AssetRipper）是按渲染器拆开的局部网格，节点路径 = 渲染器路径；Unity→glTF 为 X 取反。
// 做法：按节点路径找到渲染器，m_LightmapIndex==0 的才贴；把 GLB 三角形换到原版网格坐标后按“三个顶点位置”匹配原版三角形，逐角取 UV1。
// 编码（为了能和不贴 lightmap 的同材质图元一起合批 + 被 quantize）：TEXCOORD_1 = (0.5 + 0.5·u, v)，没有 lightmap 的顶点 = (0, 0)。
import fs from 'node:fs';
import path from 'node:path';

const Q = (v) => Math.round(v * 500); // 2mm 量化
const key3 = (x, y, z) => `${Q(x)},${Q(y)},${Q(z)}`;

export function loadLightmapData(dir) {
  const rends = JSON.parse(fs.readFileSync(path.join(dir, 'renderers_lightmap.json'), 'utf8'));
  const man = JSON.parse(fs.readFileSync(path.join(dir, 'uv_lightmap_manifest.json'), 'utf8'));
  const bin = fs.readFileSync(path.join(dir, 'uv_lightmap.bin'));
  const ab = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
  const meshes = new Map(); // name+file → data
  for (const m of man) {
    meshes.set(m.name + '|' + m.file, {
      name: m.name, channel: m.uv_channel,
      pos: new Float32Array(ab, m.vertices_offset, m.vertex_count * 3),
      uv: new Float32Array(ab, m.uvs_offset, m.uv_count * 2),
      idx: new Uint32Array(ab, m.indices_offset, m.index_count),
      tri: null,
    });
  }
  const byPath = new Map();
  for (const r of rends) {
    if (!byPath.has(r.path)) byPath.set(r.path, []);
    byPath.get(r.path).push(r);
  }
  return { rends, meshes, byPath };
}

function triIndex(md) {
  if (md.tri) return md.tri;
  const { pos, idx } = md;
  const vk = new Array(pos.length / 3);
  for (let i = 0; i < vk.length; i++) vk[i] = key3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
  const tri = new Map();
  for (let t = 0; t < idx.length; t += 3) {
    const ks = [vk[idx[t]], vk[idx[t + 1]], vk[idx[t + 2]]];
    const k = [...ks].sort().join('|');
    if (!tri.has(k)) tri.set(k, []);
    tri.get(k).push([idx[t], idx[t + 1], idx[t + 2], ks]);
  }
  md.vk = vk; md.tri = tri;
  return tri;
}

/** glTF 世界(X 取反) → 原版合批网格世界的平移：场景根位移没进 GLB（M01 实测 (2, 0, −3.25)）。
 *  多个 lightmapped 合批渲染器各自用“GLB 首顶点 − 原版任一顶点”出候选平移，按出现次数取前 12 个，
 *  再在所有样本顶点上数重合数，取最多的（平铺地砖会让单个节点的候选有歧义，所以要跨节点投票）。 */
function calibrate(L, root, pathOf) {
  const samples = []; const votes = new Map();
  for (const node of root.listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const r = (L.byPath.get(pathOf(node)) || []).find((q) => q.lightmap_index === 0 && /^Combined Mesh/.test(q.mesh_name));
    if (!r) continue;
    const md = L.meshes.get(r.mesh_name + '|' + r.mesh_file); if (!md) continue;
    if (!md.set) { md.set = new Set(); for (let j = 0; j < md.pos.length / 3; j++) md.set.add(key3(md.pos[j * 3], md.pos[j * 3 + 1], md.pos[j * 3 + 2])); }
    const W = node.getWorldMatrix(); const P = mesh.listPrimitives()[0].getAttribute('POSITION'); const v = [0, 0, 0];
    const g = [];
    for (let i = 0; i < Math.min(P.getCount(), 40); i++) { P.getElement(i, v); g.push([-(W[0] * v[0] + W[4] * v[1] + W[8] * v[2] + W[12]), W[1] * v[0] + W[5] * v[1] + W[9] * v[2] + W[13], W[2] * v[0] + W[6] * v[1] + W[10] * v[2] + W[14]]); }
    samples.push({ g, md });
    if (samples.length <= 12) {
      const seen = new Set();
      for (let j = 0; j < md.pos.length / 3; j++) {
        const t = [md.pos[j * 3] - g[0][0], md.pos[j * 3 + 1] - g[0][1], md.pos[j * 3 + 2] - g[0][2]];
        const k = key3(...t); if (seen.has(k)) continue; seen.add(k);
        const o = votes.get(k); if (o) o.n++; else votes.set(k, { n: 1, t });
      }
    }
    if (samples.length >= 40) break;
  }
  const cand = [...votes.values()].sort((a, b) => b.n - a.n).slice(0, 12);
  cand.push({ t: [0, 0, 0] });
  let best = [0, 0, 0], bc = -1;
  for (const { t } of cand) {
    let c = 0; for (const { g, md } of samples) for (const q of g) if (md.set.has(key3(q[0] + t[0], q[1] + t[1], q[2] + t[2]))) c++;
    if (c > bc) { bc = c; best = t; }
  }
  return best.map((q) => Math.round(q * 1e4) / 1e4);
}

/** doc: gltf-transform Document（LOD 已删）。detailMats = 用 _UVSec=1 细节贴图的材质名 → 这些图元另加 TEXCOORD_2 = 原版作者 UV1
 *  （合批 + lightmapped 的渲染器要把烘进去的 scale/offset 反算回来：(uv − offset) / scale）。返回统计。 */
export function applyLightmapUV(doc, dir, detailMats = new Set()) {
  const L = loadLightmapData(dir);
  const root = doc.getRoot();
  const pathOf = (n) => { const a = []; for (let p = n; p; p = p.getParentNode()) a.unshift(p.getName()); return a.join('/'); };
  const stats = { lmRenderers: 0, nodesMatched: 0, tris: 0, trisHit: 0, detailNodes: 0, detailTris: 0, detailHit: 0, verify: [], miss: [] };
  const T = calibrate(L, root, pathOf);
  stats.offset = T;
  const buf = root.listBuffers()[0];
  const isDetail = (p) => detailMats.has(p.getMaterial()?.getName());
  const ensure = (prim, sem) => {
    if (prim.getAttribute(sem)) return;
    const n = prim.getAttribute('POSITION').getCount();
    prim.setAttribute(sem, doc.createAccessor().setType('VEC2').setArray(new Float32Array(n * 2)).setBuffer(buf));
  };
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) { ensure(p, 'TEXCOORD_1'); if (isDetail(p)) ensure(p, 'TEXCOORD_2'); }
  const done = new Set();
  for (const node of root.listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const all = L.byPath.get(pathOf(node)) || [];
    const lmR = all.filter((r) => r.lightmap_index === 0);
    const wantDetail = mesh.listPrimitives().some(isDetail);
    const rs = lmR.length ? lmR : (wantDetail ? all.slice(0, 1) : []);
    if (!rs.length) continue;
    if (lmR.length) stats.lmRenderers++;
    if (wantDetail) stats.detailNodes++;
    let m2 = mesh;
    if (mesh.listParents().filter((p) => p.propertyType === 'Node').length > 1 || done.has(mesh)) {
      m2 = mesh.clone();
      for (const p of m2.listPrimitives()) for (const sem of ['TEXCOORD_1', 'TEXCOORD_2']) { const a = p.getAttribute(sem); if (a) p.setAttribute(sem, a.clone()); }
      node.setMesh(m2);
    }
    done.add(m2);
    const W = node.getWorldMatrix();
    let hit = 0, cnt = 0;
    for (const r of rs) {
      const md = L.meshes.get(r.mesh_name + '|' + r.mesh_file); if (!md) { stats.miss.push(r.path + ' (no mesh data)'); continue; }
      const combined = /^Combined Mesh/.test(r.mesh_name);
      const lm = r.lightmap_index === 0;
      const tri = triIndex(md);
      const so = r.lightmap_tiling_offset;
      const ub = [1e9, 1e9, -1e9, -1e9];
      for (const prim of m2.listPrimitives()) {
        const P = prim.getAttribute('POSITION');
        const U1 = prim.getAttribute('TEXCOORD_1'); const u1 = U1.getArray();
        const det = isDetail(prim); const U2 = det ? prim.getAttribute('TEXCOORD_2') : null; const u2 = U2 ? U2.getArray() : null;
        const n = P.getCount(); const ks = new Array(n); const v = [0, 0, 0];
        for (let i = 0; i < n; i++) {
          P.getElement(i, v);
          let x = v[0], y = v[1], z = v[2];
          if (combined) { // 局部 → glTF 世界 → Unity 世界（X 取反 + 场景根平移）
            const wx = W[0] * x + W[4] * y + W[8] * z + W[12], wy = W[1] * x + W[5] * y + W[9] * z + W[13], wz = W[2] * x + W[6] * y + W[10] * z + W[14];
            x = -wx + T[0]; y = wy + T[1]; z = wz + T[2];
          } else x = -x; // 非合批：Unity 网格局部（X 取反）
          ks[i] = key3(x, y, z);
        }
        const ind = prim.getIndices(); const ia = ind ? ind.getArray() : null; const nt = ia ? ia.length : n;
        for (let t = 0; t < nt; t += 3) {
          const a = ia ? [ia[t], ia[t + 1], ia[t + 2]] : [t, t + 1, t + 2];
          cnt++; if (det) stats.detailTris++;
          const c = tri.get([ks[a[0]], ks[a[1]], ks[a[2]]].sort().join('|')); if (!c) continue;
          hit++; if (det) stats.detailHit++;
          const [i0, i1, i2, oks] = c[0]; const oi = [i0, i1, i2];
          for (const gv of a) {
            const j = oi[oks.indexOf(ks[gv])];
            const ru = md.uv[j * 2], rv = md.uv[j * 2 + 1];
            // lightmap 坐标：合批的已烘好；非合批 × scale + offset
            const lu = combined ? ru : ru * so.x + so.z, lv = combined ? rv : rv * so.y + so.w;
            if (lm) {
              ub[0] = Math.min(ub[0], lu); ub[1] = Math.min(ub[1], lv); ub[2] = Math.max(ub[2], lu); ub[3] = Math.max(ub[3], lv);
              u1[gv * 2] = 0.5 + 0.5 * lu; u1[gv * 2 + 1] = lv;
            }
            if (u2) { // 作者 UV1：合批 + lightmapped → 反算；其余原样
              u2[gv * 2] = combined && lm ? (ru - so.z) / so.x : ru;
              u2[gv * 2 + 1] = combined && lm ? (rv - so.w) / so.y : rv;
            }
          }
        }
        U1.setArray(u1); if (U2) U2.setArray(u2);
      }
      if (lm && ub[0] < 1e8) stats.verify.push({ r: r.path.split('/').pop(), combined, uv: ub.map((q) => +q.toFixed(4)), rect: [so.z, so.w, so.z + so.x, so.w + so.y].map((q) => +q.toFixed(4)) });
    }
    stats.tris += cnt; stats.trisHit += hit; if (hit) stats.nodesMatched++; else stats.miss.push(pathOf(node));
  }
  return stats;
}
