// CC0 模型库（Hark 美术区）：Kenney Fantasy Town / Castle / Survival / Pirate / Furniture（来源与许可见 assets/third-party/LICENSES.md）。
// 每个 GLB 拍平成若干 {几何, 材质}（节点变换烘进几何）；Batch 把同一模型的所有摆放合成 InstancedMesh（一模型一 draw call）。
// 墙板/屋顶等「贴格子边」的件保持原点；道具类按包围盒把 xz 居中、底面贴 y=0，方便直接放在格子中心。
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface Part { geo: THREE.BufferGeometry; mat: THREE.Material }
const ready = new Map<string, Part[]>();
const pending = new Map<string, Promise<void>>();
const BASE = `${import.meta.env.BASE_URL ?? './'}models/`;
// 这些件按 Kenney 模块化网格贴在格子 +x 边（或本身跨整格），不能居中
const KEEP_ORIGIN = /^(town\/(wall|roof|overhang|banner|balcony|chimney|hedge|fence|wheel|stairs)|castle\/(wall|tower))/;

const loader = new GLTFLoader();
function loadOne(name: string): Promise<void> {
  if (ready.has(name)) return Promise.resolve();
  let p = pending.get(name);
  if (p) return p;
  p = loader.loadAsync(`${BASE}${name}.glb`).then((g) => {
    g.scene.updateMatrixWorld(true);
    const parts: Part[] = [];
    const box = new THREE.Box3();
    g.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const geo = m.geometry.clone().applyMatrix4(m.matrixWorld);
      geo.computeBoundingBox(); box.union(geo.boundingBox!);
      if (mats.length === 1) parts.push({ geo, mat: tune(mats[0]) });
      else for (const [gi, gr] of geo.groups.entries()) { const sub = geo.clone(); sub.clearGroups(); sub.setDrawRange(gr.start, gr.count); parts.push({ geo: sub, mat: tune(mats[gr.materialIndex ?? gi]) }); }
    });
    if (WHITEN.test(name)) for (const pt of parts) pt.mat = whiteMat(pt.mat);
    if (!KEEP_ORIGIN.test(name)) {
      const c = box.getCenter(new THREE.Vector3());
      for (const pt of parts) pt.geo.translate(-c.x, -box.min.y, -c.z);
    }
    ready.set(name, parts);
  }).catch((e) => { console.warn('kit load failed', name, e); ready.set(name, []); });
  pending.set(name, p);
  return p;
}
// Kenney 城镇墙面用棕色色块、屋顶用灰青色块，直接乘实例色会发暗发脏。
// 给墙/屋顶换一张「把这两块色板刷成近白」的贴图副本，实例色就等于真实墙色/屋顶色（P5T 米白墙 + 杂色屋顶）。
const WHITEN = /^town\/(wall(?!-wood)|roof|chimney|balcony)/;
const whiteCache = new Map<string, THREE.Material>();
function whiteMat(m: THREE.Material) {
  const s = m as THREE.MeshStandardMaterial;
  if (!s.map?.image) return m;
  let w = whiteCache.get(s.uuid);
  if (w) return w;
  const img = s.map.image as CanvasImageSource & { width: number; height: number };
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d')!;
  g.drawImage(img, 0, 0);
  const k = img.width / 512;
  const paint = (x: number, y: number, w0: number, h0: number, a: string, b: string) => { const gr = g.createLinearGradient(0, y * k, 0, (y + h0) * k); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(x * k, y * k, w0 * k, h0 * k); };
  paint(288, 384, 32, 128, '#ffffff', '#e6dede'); // 墙面
  paint(96, 352, 32, 160, '#ffffff', '#d6d2d8');  // 屋顶瓦
  const t = new THREE.CanvasTexture(c); t.flipY = s.map.flipY; t.colorSpace = THREE.SRGBColorSpace; t.magFilter = s.map.magFilter; t.minFilter = s.map.minFilter;
  w = s.clone(); (w as THREE.MeshStandardMaterial).map = t;
  whiteCache.set(s.uuid, w);
  return w;
}
function tune(m: THREE.Material) {
  const s = m as THREE.MeshStandardMaterial;
  if ('roughness' in s) { s.roughness = Math.max(0.7, s.roughness); s.metalness = 0; }
  if (s.map) { s.map.colorSpace = THREE.SRGBColorSpace; s.map.anisotropy = 4; }
  return m;
}
/** 程序化补件（干草垛、宝座等 Kenney 包里没有的），与模型共用 Batch */
export function defineProc(name: string, parts: Part[]) { ready.set(name, parts); }
export function loadKit(names: Iterable<string>) { return Promise.all([...new Set(names)].map(loadOne)).then(() => undefined); }
export const hasModel = (name: string) => (ready.get(name)?.length ?? 0) > 0;
export function modelSize(name: string) {
  const b = new THREE.Box3();
  for (const p of ready.get(name) ?? []) { p.geo.computeBoundingBox(); b.union(p.geo.boundingBox!); }
  return b;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export function trs(x: number, y: number, z: number, ry = 0, sx = 1, sy = sx, sz = sx) {
  _e.set(0, ry, 0); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz);
  return _m.clone().compose(_p, _q, _s);
}

/** 收集摆放 → build() 出一组 InstancedMesh */
export class Batch {
  private items = new Map<string, { m: THREE.Matrix4[]; c: (THREE.Color | null)[] }>();
  count = 0;
  add(name: string, m: THREE.Matrix4, color?: number | null) {
    let it = this.items.get(name);
    if (!it) { it = { m: [], c: [] }; this.items.set(name, it); }
    it.m.push(m); it.c.push(color == null ? null : new THREE.Color(color)); this.count++;
  }
  put(name: string, x: number, y: number, z: number, ry = 0, s = 1, color?: number | null, sy = s) { this.add(name, trs(x, y, z, ry, s, sy, s), color); }
  build(shadow = true): THREE.Group {
    const g = new THREE.Group();
    for (const [name, it] of this.items) {
      const parts = ready.get(name);
      if (!parts?.length) continue;
      const tinted = it.c.some((c) => c);
      for (const pt of parts) {
        const im = new THREE.InstancedMesh(pt.geo, pt.mat, it.m.length);
        it.m.forEach((m, i) => { im.setMatrixAt(i, m); if (tinted) im.setColorAt(i, it.c[i] ?? WHITE); });
        im.instanceMatrix.needsUpdate = true;
        im.castShadow = shadow; im.receiveShadow = true;
        im.computeBoundingSphere();
        g.add(im);
      }
    }
    return g;
  }
}
const WHITE = new THREE.Color(1, 1, 1);
