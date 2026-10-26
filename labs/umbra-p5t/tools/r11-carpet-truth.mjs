// r11：原版场景「地毯红 / 石板」面积真值（不经过我们的压缩/着色）：原始 scene GLB（Codex 导出）+ 内嵌 BaseMap，
// 在关卡格子矩形内每格 4×4 采样，取最上层三角形 → 按 UV 取 BaseMap RGB（忽略 alpha）分类。
// 用法: node tools/r11-carpet-truth.mjs Lxx [Lxx...] → JSON（red=地毯红占比，floorRed=只算地面高度的样本）
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const req = createRequire(path.join(process.env.GLTF_TOOLS || '/workspace/work/gltf-tools', 'package.json'));
const imp = (m) => import(req.resolve(m));
const { NodeIO } = await imp('@gltf-transform/core');
const { ALL_EXTENSIONS } = await imp('@gltf-transform/extensions');
const sharp = (await imp('sharp')).default;
const src = fs.readFileSync(new URL('../src/view/origMap.ts', import.meta.url), 'utf8');
const UA = (process.env.UMBRA_ASSETS || '/workspace/work/umbra-assets') + '/p5t/1_battle/batch-03/maps';
const lvJson = (id) => JSON.parse(fs.readFileSync(new URL(`../src/game/levels/${id}.json`, import.meta.url), 'utf8'));
export const isRed = (r, g, b) => r > 70 && r > 2.2 * g && r > 2.2 * b;
const out = {};
for (const id of process.argv.slice(2)) {
  const m = new RegExp(`${id}: \\{ m: '(M\\d+)', file: '[^']+', rx: ([-\\d.]+), rz: ([-\\d.]+), D: (\\d+), base: ([-\\d.]+)`).exec(src);
  if (!m) { out[id] = 'no cfg'; continue; }
  const [, M, rx, rz, D, base] = [m[0], m[1], +m[2], +m[3], +m[4], +m[5]];
  let W = 0, H = 0;
  try { const L = lvJson(id); H = L.height; W = L.width; } catch { }
  const f = fs.readdirSync(path.join(UA, M)).find((x) => /^scene_map_.*\.glb$/.test(x));
  const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(path.join(UA, M, f));
  const texCache = new Map();
  const texOf = async (t) => { if (!t) return null; if (texCache.has(t)) return texCache.get(t); const r = await sharp(Buffer.from(t.getImage())).removeAlpha().raw().toBuffer({ resolveWithObject: true }); texCache.set(t, r); return r; };
  const tris = [];
  const kill = (n) => /^LOD_?[1-9]\b/i.test(n.getName() || '') || /_LOD[1-9]$/i.test(n.getName() || '');
  const skip = (n) => { for (let p = n; p; p = p.getParentNode()) if (kill(p) || /^(Roof|Ceiling)/i.test(p.getName() || '')) return true; return false; };
  for (const n of doc.getRoot().listNodes()) {
    const mesh = n.getMesh(); if (!mesh || skip(n)) continue;
    const wm = n.getWorldMatrix();
    for (const p of mesh.listPrimitives()) {
      const mat = p.getMaterial(); if (mat && /sky/i.test(mat.getName())) continue;
      const tex = await texOf(mat?.getBaseColorTexture()); const fac = mat?.getBaseColorFactor() ?? [1, 1, 1, 1];
      const pos = p.getAttribute('POSITION'), uv = p.getAttribute('TEXCOORD_0'), idx = p.getIndices();
      const V = [], T = [], e = [], t = [];
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, e);
        const x = wm[0] * e[0] + wm[4] * e[1] + wm[8] * e[2] + wm[12], y = wm[1] * e[0] + wm[5] * e[1] + wm[9] * e[2] + wm[13], z = wm[2] * e[0] + wm[6] * e[1] + wm[10] * e[2] + wm[14];
        // GLB → 引擎世界：绕 Y 180° + 平移 (rx−0.5, −base, rz+D−0.5)
        V.push([-x + rx - 0.5, y - base, -z + rz + D - 0.5]);
        if (uv) { uv.getElement(i, t); T.push([t[0], t[1]]); } else T.push([0, 0]);
      }
      const nT = idx ? idx.getCount() / 3 : pos.getCount() / 3;
      for (let k = 0; k < nT; k++) {
        const a = idx ? idx.getScalar(3 * k) : 3 * k, b = idx ? idx.getScalar(3 * k + 1) : 3 * k + 1, c = idx ? idx.getScalar(3 * k + 2) : 3 * k + 2;
        tris.push({ v: [V[a], V[b], V[c]], t: [T[a], T[b], T[c]], tex, fac });
      }
    }
  }
  // 粗网格加速
  const G = new Map(); const key = (i, j) => i * 100000 + j;
  for (const tr of tris) {
    const xs = tr.v.map((q) => q[0]), zs = tr.v.map((q) => q[2]);
    const i0 = Math.floor(Math.min(...xs)), i1 = Math.floor(Math.max(...xs)), j0 = Math.floor(Math.min(...zs)), j1 = Math.floor(Math.max(...zs));
    if (i1 < -2 || j1 < -2 || i0 > W + 2 || j0 > H + 2 || (i1 - i0) * (j1 - j0) > 40000) { if ((i1 - i0) * (j1 - j0) <= 40000) continue; }
    for (let i = Math.max(i0, -2); i <= Math.min(i1, W + 2); i++) for (let j = Math.max(j0, -2); j <= Math.min(j1, H + 2); j++) { const kk = key(i, j); (G.get(kk) ?? G.set(kk, []).get(kk)).push(tr); }
  }
  let n = 0, red = 0, nf = 0, redf = 0;
  const S = 4;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
    const px = x - 0.5 + (sx + 0.5) / S, pz = y - 0.5 + (sy + 0.5) / S;
    let best = null, by = -1e9, bw = null;
    for (const tr of G.get(key(Math.floor(px), Math.floor(pz))) ?? []) {
      const [A, B, C] = tr.v;
      const d = (B[2] - C[2]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[2] - C[2]); if (Math.abs(d) < 1e-9) continue;
      const l1 = ((B[2] - C[2]) * (px - C[0]) + (C[0] - B[0]) * (pz - C[2])) / d, l2 = ((C[2] - A[2]) * (px - C[0]) + (A[0] - C[0]) * (pz - C[2])) / d, l3 = 1 - l1 - l2;
      if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
      const yy = l1 * A[1] + l2 * B[1] + l3 * C[1];
      if (yy > 3.5) continue; // 高处（墙顶/二层）不算地面视角
      if (yy > by) { by = yy; best = tr; bw = [l1, l2, l3]; }
    }
    if (!best) continue;
    n++;
    let r = 255 * best.fac[0], g = 255 * best.fac[1], b = 255 * best.fac[2];
    if (best.tex) {
      const u = bw[0] * best.t[0][0] + bw[1] * best.t[1][0] + bw[2] * best.t[2][0], v = bw[0] * best.t[0][1] + bw[1] * best.t[1][1] + bw[2] * best.t[2][1];
      const { data, info } = best.tex; const X = Math.min(info.width - 1, Math.floor((((u % 1) + 1) % 1) * info.width)), Y = Math.min(info.height - 1, Math.floor((((v % 1) + 1) % 1) * info.height));
      const o = (Y * info.width + X) * info.channels; r *= data[o] / 255; g *= data[o + 1] / 255; b *= data[o + 2] / 255;
    }
    const rd = isRed(r, g, b); if (rd) red++;
    if (by < 0.35) { nf++; if (rd) redf++; }
  }
  out[id] = { M, W, H, samples: n, red: +(red / Math.max(1, n)).toFixed(3), floorSamples: nf, floorRed: +(redf / Math.max(1, nf)).toFixed(3) };
  console.error(id, JSON.stringify(out[id]));
}
console.log(JSON.stringify(out));
