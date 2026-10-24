// 场景布景 v2（Hark 美术区）：玛丽王国（P5T K1）——按 map.id 取主题，用 CC0 Kenney 模型（kitLib）+ 少量程序化补件搭布景。
// 纯装饰，不参与规则：
//   · 地图内 wall 格：成块（≥2 厚）= 3–4 层半木房屋（窗下花箱、遮阳篷、旗帜、斜屋顶）；1 格厚的线 = 2 格高石墙/城墙（墙面挂梯子装饰）
//   · half/full 掩体格：按主题配方摆成 桶组 / 木箱堆 / 石花坛 / 推车 / 摊位 / 树篱 / 沙袋 / 投石机 …（不再是灰盒子）
//   · 高差：高台外露侧面贴石墙板，边缘围石栏杆（有梯子/跳台连接的边留空）
//   · 地图外：紧贴边缘一圈「街边带」（路灯、花盆、长凳、木桶、推车、摊位），外面两排 3–5 层房屋 + 远景城堡塔楼；没有空地
//   · 横跨街道的彩旗串、紫→洋红渐变天空、粉藕色石板地（参考 notes/refs/p5t/INDEX.md「场景密度要点」）
// 近相机两侧的外圈：高处（2 楼以上、屋顶、远景）收起，底层压成矮墙，旋转镜头时平滑切换。
import * as THREE from 'three';
import type { MapDef } from '../rules';
import { Batch, loadKit, defineProc, hasModel, trs } from './kitLib';
import type { Part } from './kitLib';

export interface Theme {
  bg: number; fogNear: number; fogFar: number; hemiSky: number; hemiGround: number; hemiInt: number; sunColor: number; sunInt: number;
  tileA: number; tileB: number; tileHigh: number; tileHighB: number; wall: number; cobble: boolean;
}
type Style = 'town' | 'castle' | 'sewer' | 'interior' | 'garden';
interface Scene extends Theme {
  style: Style;
  sky: [string, string, string]; // 顶 → 中 → 地平线
  ground: number;
  wallTints: number[]; roofTints: number[];
  floors: [number, number];
  half: string[]; full: string[]; strip: string[];
  bunting: number; night?: boolean; carpet?: boolean;
}
const DARK: Theme = { bg: 0x141418, fogNear: 999, fogFar: 1000, hemiSky: 0xffffff, hemiGround: 0x302020, hemiInt: 1.4, sunColor: 0xffffff, sunInt: 1.6, tileA: 0x3b3b44, tileB: 0x33333b, tileHigh: 0x4a4656, tileHighB: 0x423e4d, wall: 0x55555f, cobble: false };

// P5T K1 基调：紫 → 洋红天空、粉藕石板（#C9A1AD）、暖粉主光 + 冷紫阴影、米白/灰粉墙、杂色屋顶
const K1 = {
  bg: 0x8a3aa6, fogNear: 44, fogFar: 90, hemiSky: 0xf6d8f4, hemiGround: 0x6a4a7a, hemiInt: 1.6, sunColor: 0xffd2c8, sunInt: 2.0,
  tileA: 0xc9a1ad, tileB: 0xbf97a4, tileHigh: 0xd6b3bd, tileHighB: 0xccaab4, wall: 0x8b6e8d, cobble: true,
  sky: ['#422a6a', '#652892', '#a22fb5'] as [string, string, string], ground: 0xb7909d,
  wallTints: [0xefe3dd, 0xe9dcd6, 0xb7a2a5, 0xf3e6dc, 0xd8c6c8], roofTints: [0xcc5050, 0x9b5e69, 0x695c99, 0xab6c8c, 0xd06a5a, 0x5a8aa0],
  floors: [3, 4] as [number, number], bunting: 2,
};
const S = (o: Partial<Scene> & { style: Style; half: string[]; full: string[]; strip: string[] }): Scene => ({ ...K1, ...o });
const SCENES: Record<string, Scene> = {
  // L01 城下町·广场入口：花坛 + 桶组 + 喷泉，彩旗
  L01: S({ style: 'town', half: ['planter', 'barrels', 'planter', 'crates'], full: ['crateStack', 'stall'], strip: ['lamp', 'pots', 'bench', 'barrels', 'stall', 'pots', 'cart', 'lamp', 'crates', 'bench'] }),
  // L02 兵营：木箱、沙袋、干草、推车；木结构房屋偏多
  L02: S({ style: 'town', wallTints: [0xe9d6c4, 0xd8bfae, 0xefe0cf, 0xcdb2a2], half: ['sandbags', 'crates', 'hay', 'barrels'], full: ['crateStack', 'cartHigh', 'spikes'], strip: ['crates', 'hay', 'lamp', 'barrels', 'cart', 'crates', 'spikes', 'lamp'], bunting: 0 }),
  // L03 钟楼：远景高塔，傍晚橙紫
  L03: S({ style: 'town', sky: ['#3a2a6e', '#8a3a9a', '#e0708a'], sunColor: 0xffc4a0, half: ['planter', 'crates', 'stone'], full: ['crateStack', 'statue'], strip: ['lamp', 'pots', 'bench', 'crates', 'lamp', 'barrels', 'pots', 'bench'], floors: [3, 5], bunting: 1 }),
  // L04 地下水道：暗紫蓝石壁、拱门、水渠、桶
  L04: S({ style: 'sewer', bg: 0x1c1430, fogNear: 40, fogFar: 70, sky: ['#120c22', '#1c1430', '#2a1c44'], hemiSky: 0xb8a8e8, hemiGround: 0x241838, hemiInt: 1.15, sunColor: 0xd8c8ff, sunInt: 1.4,
    tileA: 0x8a7a98, tileB: 0x80708e, tileHigh: 0x9a8aa8, tileHighB: 0x90809e, ground: 0x4a3c5c, wallTints: [0x9a88a8, 0x8c7a9c], half: ['barrels', 'stone', 'crates'], full: ['crateStack', 'bigBarrel'], strip: ['water'], bunting: 0, night: true }),
  // L05 城墙·双塔：城墙 + 塔楼 + 攻城器
  L05: S({ style: 'castle', half: ['sandbags', 'stone', 'barrels'], full: ['ballista', 'crateStack', 'catapult'], strip: ['flagpole', 'barrels', 'crates', 'sandbags'], bunting: 0 }),
  // L06 小巷·黄昏：窄巷高楼、彩旗多
  L06: S({ style: 'town', sky: ['#3a2466', '#7a2a96', '#d0509a'], half: ['barrels', 'crates', 'planter'], full: ['stall', 'crateStack'], strip: ['pots', 'lamp', 'barrels', 'bench', 'crates', 'pots', 'lamp', 'stall'], floors: [4, 5], bunting: 3 }),
  // L07 玛丽的旗帜·中央广场：大旗、花坛、雕像、节日彩旗
  L07: S({ style: 'town', half: ['planter', 'planter', 'barrels', 'stone'], full: ['statue', 'stall', 'crateStack'], strip: ['flagpole', 'pots', 'lamp', 'stall', 'bench', 'pots', 'flagpole', 'lamp'], bunting: 4 }),
  // L08 收容所·中庭（夜）：树篱花园、玫瑰花坛
  L08: S({ style: 'garden', sky: ['#1e1a4a', '#3a2a78', '#6a3a9a'], bg: 0x3a2a6a, hemiSky: 0xc0b0f0, hemiGround: 0x2a2a4a, sunColor: 0xd8c8ff, sunInt: 1.6,
    tileA: 0xb8b0c0, tileB: 0xaea6b6, tileHigh: 0xc8c0d0, tileHighB: 0xbeb6c6, ground: 0x78897f, half: ['hedge', 'planter', 'stone'], full: ['tree', 'hedgeTall', 'statue'], strip: ['hedge', 'lamp', 'tree', 'pots', 'hedge', 'bench'], bunting: 0, night: true }),
  // L09 篝火广场（夜）：火盆、摊位、拒马
  L09: S({ style: 'town', sky: ['#1a1440', '#4a2070', '#a03a7a'], bg: 0x4a2070, hemiSky: 0xd0b0e0, hemiGround: 0x2a1a3a, sunColor: 0xffb080, sunInt: 1.8, half: ['barrels', 'crates', 'sandbags'], full: ['spikes', 'stall', 'brazier'], strip: ['brazier', 'stall', 'barrels', 'lamp', 'crates', 'stall', 'brazier', 'pots'], bunting: 3, night: true }),
  // L10 玛丽城·王座厅：红地毯、金柱、长桌、书柜
  L10: S({ style: 'interior', bg: 0x2a0b1f, fogNear: 40, fogFar: 72, sky: ['#2a0b1f', '#3d1430', '#570716'], hemiSky: 0xffd8e0, hemiGround: 0x3a1a2a, hemiInt: 1.3, sunColor: 0xffe0c8, sunInt: 1.7,
    tileA: 0x93769a, tileB: 0x8a6e92, tileHigh: 0xa486aa, tileHighB: 0x9a7ea2, ground: 0x685271, wallTints: [0xb391a2, 0xa58598], half: ['table', 'bench', 'stone'], full: ['pillar', 'bookcase', 'statue'], strip: ['pillar', 'lampFloor', 'bookcase', 'lampFloor'], bunting: 0, carpet: true }),
};
export const themeFor = (mapId: string): Theme => SCENES[mapId] ?? DARK;

// ---------- 纹理 ----------
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
let _cobble: THREE.Texture | null = null;
/** 地砖：每格一块大方石板，石板间浅缝 + 小碎石点（与 tile 颜色相乘） */
export function cobbleTex() {
  return _cobble ??= canvasTex(128, 128, (g) => {
    g.fillStyle = '#ececec'; g.fillRect(0, 0, 128, 128);
    const rnd = mulberry(7);
    for (const [x, y, w, h] of [[0, 0, 64, 64], [64, 0, 64, 40], [64, 40, 64, 24], [0, 64, 40, 64], [40, 64, 88, 64]]) {
      const v = 225 + rnd() * 25 | 0; g.fillStyle = `rgb(${v},${v - 4},${v - 2})`; g.fillRect(x + 3, y + 3, w - 6, h - 6);
    }
    g.strokeStyle = 'rgba(80,55,80,.45)'; g.lineWidth = 4;
    for (const [x, y, w, h] of [[0, 0, 64, 64], [64, 0, 64, 40], [64, 40, 64, 24], [0, 64, 40, 64], [40, 64, 88, 64]]) g.strokeRect(x + 1, y + 1, w - 2, h - 2);
    for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(90,60,90,${0.04 + rnd() * 0.06})`; g.fillRect(rnd() * 128, rnd() * 128, 3 + rnd() * 6, 3 + rnd() * 6); }
  });
}
function skyTex(c: [string, string, string]) {
  return canvasTex(4, 256, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, c[0]); gr.addColorStop(0.55, c[1]); gr.addColorStop(1, c[2]);
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  });
}
function mulberry(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seedOf(s: string) { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }

// ---------- 程序化补件（Kenney 包里没有的：石花坛、沙袋、干草、拒马、火盆、地毯、宝座、彩旗、石块） ----------
const mat = (c: number, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
const box = (w: number, h: number, d: number, x = 0, y = h / 2, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
let procDone = false;
function defineProcs() {
  if (procDone) return; procDone = true;
  const stone = mat(0xefe6ea), leaf = mat(0x5f8a5a), rose = mat(0xf6f0f4, { emissive: 0x302830 }), wood = mat(0x8a5a3a), dark = mat(0x3b2d25);
  const blobs = (n: number, w: number, d: number, y: number, r: number, seed: number) => {
    const rnd = mulberry(seed); const gs: THREE.BufferGeometry[] = [];
    for (let i = 0; i < n; i++) gs.push(new THREE.IcosahedronGeometry(r * (0.7 + rnd() * 0.5), 0).translate((rnd() - 0.5) * w, y + rnd() * r * 0.6, (rnd() - 0.5) * d));
    return merge(gs);
  };
  defineProc('proc/planter', [
    { geo: merge([box(0.88, 0.34, 0.88), box(0.94, 0.06, 0.94, 0, 0.34)]), mat: stone },
    { geo: blobs(9, 0.66, 0.66, 0.42, 0.13, 3), mat: leaf },
    { geo: blobs(7, 0.62, 0.62, 0.5, 0.075, 9), mat: rose },
  ]);
  defineProc('proc/stone', [{ geo: merge([box(0.8, 0.46, 0.8), box(0.86, 0.06, 0.86, 0, 0.46)]), mat: mat(0xe8dde2) }]);
  const bagG: THREE.BufferGeometry[] = [];
  for (let r = 0; r < 3; r++) for (let i = 0; i < 3 - (r === 2 ? 1 : 0); i++) bagG.push(new THREE.CapsuleGeometry(0.1, 0.16, 3, 6).rotateZ(Math.PI / 2).scale(1, 0.75, 1.25).translate(-0.3 + i * 0.3 + (r % 2) * 0.15, 0.08 + r * 0.14, (r === 1 ? 0.04 : 0)));
  defineProc('proc/sandbags', [{ geo: merge(bagG).scale(1, 1, 1.6), mat: mat(0x9a9294) }]);
  defineProc('proc/hay', [{ geo: merge([new THREE.CylinderGeometry(0.26, 0.26, 0.7, 10).rotateZ(Math.PI / 2).translate(0, 0.26, -0.18), new THREE.CylinderGeometry(0.26, 0.26, 0.7, 10).rotateZ(Math.PI / 2).translate(0, 0.26, 0.18)]), mat: mat(0xe0c060) },
    { geo: merge([box(0.72, 0.03, 0.04, 0, 0.27, -0.18), box(0.72, 0.03, 0.04, 0, 0.27, 0.18)]).scale(1, 18, 1).translate(0, -4.6, 0), mat: mat(0xa07830) }]);
  const sp: THREE.BufferGeometry[] = [box(0.9, 0.1, 0.1, 0, 0.3)];
  for (let i = 0; i < 4; i++) sp.push(new THREE.CylinderGeometry(0.035, 0.05, 1.3, 5).translate(0, 0.65, 0).rotateX(i % 2 ? 0.6 : -0.6).translate(-0.36 + i * 0.24, 0, 0));
  defineProc('proc/spikes', [{ geo: merge(sp), mat: wood }]);
  defineProc('proc/brazier', [
    { geo: merge([new THREE.CylinderGeometry(0.06, 0.08, 0.7, 6).translate(0, 0.35, 0), new THREE.CylinderGeometry(0.3, 0.16, 0.22, 10).translate(0, 0.8, 0)]), mat: dark },
    { geo: merge([new THREE.ConeGeometry(0.22, 0.5, 7).translate(0, 1.12, 0), new THREE.ConeGeometry(0.13, 0.35, 6).translate(0.08, 1.2, 0.05)]), mat: mat(0xff8a30, { emissive: 0xff5a10, emissiveIntensity: 1.4 }) },
  ]);
  defineProc('proc/statue', [
    { geo: merge([box(0.8, 0.5, 0.8), box(0.66, 0.1, 0.66, 0, 0.55)]), mat: stone },
    { geo: merge([new THREE.CylinderGeometry(0.16, 0.24, 0.55, 8).translate(0, 0.88, 0), new THREE.SphereGeometry(0.15, 10, 8).translate(0, 1.28, 0), new THREE.ConeGeometry(0.2, 0.22, 3).translate(0, 1.47, 0)]), mat: mat(0xd8d0d6) },
  ]);
  defineProc('proc/throne', [
    { geo: merge([box(1.2, 0.3, 1.0), box(1.0, 0.5, 0.8, 0, 0.55), box(1.0, 1.8, 0.18, 0, 1.2, -0.36), box(0.16, 0.5, 0.8, -0.5, 0.75), box(0.16, 0.5, 0.8, 0.5, 0.75)]), mat: mat(0xd4a017, { metalness: 0.3, roughness: 0.5 }) },
    { geo: merge([box(0.8, 0.12, 0.62, 0, 0.86), box(0.74, 1.4, 0.06, 0, 1.25, -0.25)]), mat: mat(0xa0102a) },
  ]);
  defineProc('proc/goldpillar', [{ geo: merge([box(0.5, 0.18, 0.5), new THREE.CylinderGeometry(0.15, 0.17, 1.5, 12).translate(0, 0.93, 0), box(0.44, 0.14, 0.44, 0, 1.72)]), mat: mat(0xe0b030, { metalness: 0.35, roughness: 0.45 }) }]);
  defineProc('proc/carpet', [{ geo: merge([box(1, 0.02, 1, 0, 0.012), box(0.08, 0.025, 1, -0.46, 0.013), box(0.08, 0.025, 1, 0.46, 0.013)]), mat: mat(0x570716, { roughness: 0.95 }) }]);
  defineProc('proc/water', [{ geo: box(1, 0.04, 1, 0, -0.08), mat: mat(0x3a7ab0, { emissive: 0x18406a, emissiveIntensity: 0.5, roughness: 0.2 }) }]);
  defineProc('proc/rail', [{ geo: merge([box(1, 0.06, 0.08, 0, 0.42), box(1, 0.05, 0.06, 0, 0.2), box(0.09, 0.48, 0.09, -0.45, 0.24), box(0.09, 0.48, 0.09, 0.45, 0.24), box(0.06, 0.4, 0.06, 0, 0.2)]), mat: mat(0xb391a2) }]);
  defineProc('proc/flowerbox', [{ geo: box(0.08, 0.12, 0.6, 0, 0.06), mat: mat(0xe070b0) }, { geo: blobs(5, 0.06, 0.5, 0.12, 0.07, 5), mat: mat(0xf8c8e0, { emissive: 0x402030 }) }]);
  defineProc('proc/pole', [{ geo: new THREE.CylinderGeometry(0.035, 0.045, 3.2, 6).translate(0, 1.6, 0), mat: dark }, { geo: box(0.02, 1.0, 0.62, 0.02, 2.55, 0.33), mat: mat(0xc0101e) }]);
  defineProc('proc/ladder', [{ geo: merge([box(0.05, 1.3, 0.05, 0, 0.65, -0.2), box(0.05, 1.3, 0.05, 0, 0.65, 0.2), ...[0.15, 0.4, 0.65, 0.9, 1.15].map((y) => box(0.04, 0.04, 0.4, 0, y, 0))]), mat: mat(0xc9a050) }]);
  defineProc('proc/scaffold', [{ geo: merge([...[[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]].map(([x, z]) => box(0.07, 1.25, 0.07, x, 0.62, z)), box(0.98, 0.07, 0.07, 0, 1.2, -0.45), box(0.98, 0.07, 0.07, 0, 1.2, 0.45), box(0.07, 0.07, 0.98, -0.45, 1.2, 0), box(0.07, 0.07, 0.98, 0.45, 1.2, 0), box(0.98, 0.05, 0.98, 0, 0.62, 0)]), mat: dark },
    { geo: box(1.04, 0.04, 1.04, 0, 1.28), mat: mat(0xe8dcc8) }]);
}
function merge(gs: THREE.BufferGeometry[]) {
  // 简单合并（只保留 position/normal，去掉 uv 以免属性不一致）
  const pos: number[] = [], nor: number[] = [];
  for (const g0 of gs) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.push(...(g.attributes.position.array as Float32Array)); nor.push(...(g.attributes.normal.array as Float32Array));
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}

// ---------- 用到的 Kenney 件 ----------
const T = (n: string) => `town/${n}`, C = (n: string) => `castle/${n}`;
const WALLS_PLASTER = ['wall', 'wall-window-shutters', 'wall-window-glass', 'wall-window-round'].map(T);
const WALLS_WOOD = ['wall-wood', 'wall-wood-window-shutters', 'wall-wood-window-glass'].map(T);
const ALL_MODELS = [
  ...WALLS_PLASTER, ...WALLS_WOOD, ...['wall-window-stone', 'wall-door', 'wall-doorway-round', 'wall-wood-door', 'wall-arch', 'roof', 'roof-gable', 'roof-point', 'roof-flat', 'overhang', 'balcony-wall-fence', 'banner-red', 'banner-green', 'chimney',
    'stall', 'stall-red', 'stall-green', 'stall-bench', 'stall-stool', 'cart', 'cart-high', 'lantern', 'hedge-large', 'hedge', 'fence', 'pillar-stone', 'pillar-wood', 'tree', 'tree-high-round', 'rock-wide', 'fountain-round', 'wheel'].map(T),
  ...['wall', 'tower-square-base', 'tower-square-mid-windows', 'tower-square-roof', 'tower-square-top-roof-high', 'flag-banner-long', 'flag', 'siege-ballista', 'siege-catapult', 'tower-hexagon-base', 'tower-hexagon-mid', 'tower-hexagon-roof'].map(C),
  'survival/barrel', 'survival/box-large', 'survival/box', 'survival/bucket', 'pirate/crate', 'pirate/barrel', 'pirate/crate-bottles',
  'furniture/bench', 'furniture/bookcaseClosedWide', 'furniture/lampSquareFloor', 'furniture/pottedPlant', 'furniture/tableCloth', 'furniture/chairCushion',
];
let kitPromise: Promise<void> | null = null;
export function preloadKit() { defineProcs(); return kitPromise ??= loadKit(ALL_MODELS); }

const DIRS: [number, number][] = [[1, 0], [0, 1], [-1, 0], [0, -1]];
/** 让 +x 朝向 (dx,dz) 的绕 Y 角度 */
const rotFor = (dx: number, dz: number) => Math.atan2(-dz, dx);

interface Outer { g: THREE.Group; lo: THREE.Group; nx: number; nz: number; full: number }
export class SceneKit {
  private outers: Outer[] = [];
  private center = new THREE.Vector3();
  private snap = true;
  private token = 0;
  private flames: THREE.Object3D[] = [];
  ready = false;

  /** 返回被布景占用的格（主程序不再画灰盒）；模型异步加载完再挂到 world 上 */
  build(world: THREE.Group, map: MapDef): Set<string> {
    this.outers = []; this.snap = true; this.flames = []; this.ready = false;
    const tok = ++this.token;
    const claimed = new Set<string>();
    const sc = SCENES[map.id];
    const scene = world.parent as THREE.Scene | null;
    if (!sc) return claimed;
    if (scene) scene.background = skyTex(sc.sky);
    this.center.set((map.width - 1) / 2, 0, (map.height - 1) / 2);
    const doorCells = new Set((map.doors ?? []).flatMap((d) => d.cells.map((c) => `${c.x},${c.y}`)));
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
      const t = map.tiles[y][x];
      if ((t === 'wall' || t === 'half' || t === 'full') && !doorCells.has(`${x},${y}`)) claimed.add(`${x},${y}`);
    }
    void preloadKit().then(() => { if (tok === this.token && world.parent) { this.dress(world, map, sc, claimed); this.ready = true; } });
    return claimed;
  }

  private dress(world: THREE.Group, map: MapDef, sc: Scene, claimed: Set<string>) {
    const rnd = mulberry(seedOf(map.id));
    const pick = <X>(a: X[]) => a[(rnd() * a.length) | 0];
    const W = map.width, H = map.height;
    const hOf = (x: number, y: number) => map.heights?.[y]?.[x] ?? 0;
    const LV = 0.6;
    const inner = new Batch();

    // ---- 地面延伸（地图外也铺满） + 地毯 ----
    const gmat = new THREE.MeshStandardMaterial({ color: sc.ground, roughness: 0.95, map: sc.cobble ? cobbleTex().clone() : null });
    if (gmat.map) { gmat.map.wrapS = gmat.map.wrapT = THREE.RepeatWrapping; gmat.map.repeat.set(70, 70); gmat.map.needsUpdate = true; }
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), gmat);
    ground.rotation.x = -Math.PI / 2; ground.position.set(this.center.x, -0.21, this.center.z); ground.receiveShadow = true;
    world.add(ground);
    if (sc.carpet) {
      const cx = Math.floor(W / 2) - 0.5;
      for (let y = 0; y < H; y++) for (const x of [cx - 0.5, cx + 0.5]) if (map.tiles[y][Math.round(x)] !== 'wall') inner.put('proc/carpet', x, hOf(Math.round(x), y) * LV, y, 0, 1);
    }

    // ---- 地图内 wall：连通块 ----
    const wallSet = new Set<string>();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (map.tiles[y][x] === 'wall' && claimed.has(`${x},${y}`)) wallSet.add(`${x},${y}`);
    const seen = new Set<string>();
    for (const k of wallSet) {
      if (seen.has(k)) continue;
      const comp: [number, number][] = []; const st = [k]; seen.add(k);
      while (st.length) { const c = st.pop()!; const [cx, cy] = c.split(',').map(Number); comp.push([cx, cy]);
        for (const [dx, dy] of DIRS) { const n = `${cx + dx},${cy + dy}`; if (wallSet.has(n) && !seen.has(n)) { seen.add(n); st.push(n); } } }
      const cs = new Set(comp.map(([x, y]) => `${x},${y}`));
      const thick = comp.some(([x, y]) => cs.has(`${x + 1},${y}`) && cs.has(`${x},${y + 1}`) && cs.has(`${x + 1},${y + 1}`));
      if (map.id === 'L01' && comp.length === 4 && thick && comp.every(([x]) => x > 2 && x < W - 3)) { // L01 中央 2×2 = 喷泉
        const cx = (Math.min(...comp.map((c) => c[0])) + Math.max(...comp.map((c) => c[0]))) / 2, cz = (Math.min(...comp.map((c) => c[1])) + Math.max(...comp.map((c) => c[1]))) / 2;
        inner.put(T('fountain-round'), cx, 0, cz, 0, 1); inner.put('proc/statue', cx, 0.1, cz, 0, 0.9);
        continue;
      }
      if (thick && sc.style !== 'interior' && sc.style !== 'sewer') this.house(inner, inner, comp, cs, sc, rnd, pick(sc.wallTints), pick(sc.roofTints), sc.floors[0] + ((rnd() * (sc.floors[1] - sc.floors[0] + 1)) | 0), null, hOf);
      else this.wallLine(inner, comp, cs, sc, rnd, map, hOf);
    }

    // ---- 掩体：按主题配方 ----
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = map.tiles[y][x]; if ((t !== 'half' && t !== 'full') || !claimed.has(`${x},${y}`)) continue;
      const list = t === 'half' ? sc.half : sc.full;
      // 相邻同类掩体用同一配方（成组）
      const left = x > 0 && map.tiles[y][x - 1] === t, up = y > 0 && map.tiles[y - 1][x] === t;
      const r = left || up ? (seedOf(`${map.id}${t}${left ? x - 1 : x}${left ? y : y - 1}`) % list.length) : ((rnd() * list.length) | 0);
      this.recipe(inner, list[r], x, hOf(x, y) * LV, y, rnd);
    }

    // ---- 高差：高台侧面石墙 + 边缘栏杆（梯子/跳台的边留空） ----
    const linked = new Set<string>();
    for (const l of map.links ?? []) { linked.add(`${l.a.x},${l.a.y}>${l.b.x},${l.b.y}`); linked.add(`${l.b.x},${l.b.y}>${l.a.x},${l.a.y}`); }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const h = hOf(x, y); if (h <= 0 || map.tiles[y][x] === 'wall') continue;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        const nh = nx < 0 || ny < 0 || nx >= W || ny >= H ? 0 : hOf(nx, ny);
        if (nh >= h) continue;
        const nwall = !(nx < 0 || ny < 0 || nx >= W || ny >= H) && map.tiles[ny][nx] === 'wall';
        if (nwall) continue;
        const ry = rotFor(dx, dy);
        inner.put(T('wall'), x, nh * LV - 0.2, y, ry, 1, 0x8b6e8d, (h - nh) * LV + 0.2); // 石墙面
        if (!linked.has(`${x},${y}>${nx},${ny}`)) inner.add('proc/rail', trs(x + dx * 0.42, h * LV, y + dy * 0.42, ry + Math.PI / 2)); // 梯子由 mapObjects 画
      }
    }

    world.add(inner.build());

    // ---- 地图外：街边带 + 两排房屋 + 远景 ----
    const sides: { nx: number; nz: number; lo: Batch; hi: Batch }[] = DIRS.map(([dx, dy]) => ({ nx: dx, nz: dy, lo: new Batch(), hi: new Batch() }));
    const sideOf = (x: number, y: number) => {
      const ox = x < 0 ? -x : x >= W ? x - W + 1 : 0, oy = y < 0 ? -y : y >= H ? y - H + 1 : 0;
      if (oy >= ox) return y < 0 ? sides[3] : sides[1];
      return x < 0 ? sides[2] : sides[0];
    };
    const R = 1; // 街边带宽
    const occ = new Map<string, number>(); // 外圈建筑格 → 层数
    const blocks: { cells: [number, number][]; floors: number; front: [number, number] }[] = [];
    // 前排（距边 2–3）与后排（距边 4–5），沿边切成 2–4 格宽的块
    const ringRows = (d0: number, d1: number, fMin: number, fMax: number) => {
      const lines: { cells: (i: number) => [number, number][]; n0: number; n1: number; front: [number, number] }[] = [
        { n0: -d1, n1: W - 1 + d1, cells: (i) => { const o: [number, number][] = []; for (let d = d0; d <= d1; d++) o.push([i, -d]); return o; }, front: [0, 1] },
        { n0: -d1, n1: W - 1 + d1, cells: (i) => { const o: [number, number][] = []; for (let d = d0; d <= d1; d++) o.push([i, H - 1 + d]); return o; }, front: [0, -1] },
        { n0: -d0 + 1, n1: H - 2 + d0, cells: (i) => { const o: [number, number][] = []; for (let d = d0; d <= d1; d++) o.push([-d, i]); return o; }, front: [1, 0] },
        { n0: -d0 + 1, n1: H - 2 + d0, cells: (i) => { const o: [number, number][] = []; for (let d = d0; d <= d1; d++) o.push([W - 1 + d, i]); return o; }, front: [-1, 0] },
      ];
      for (const L of lines) {
        let i = L.n0;
        while (i <= L.n1) {
          const w = Math.min(L.n1 - i + 1, 2 + ((rnd() * 3) | 0));
          const cells: [number, number][] = [];
          for (let j = 0; j < w; j++) for (const c of L.cells(i + j)) if (!occ.has(`${c[0]},${c[1]}`)) cells.push(c);
          if (cells.length) {
            const floors = fMin + ((rnd() * (fMax - fMin + 1)) | 0);
            for (const [x, y] of cells) occ.set(`${x},${y}`, floors);
            blocks.push({ cells, floors, front: L.front });
          }
          i += w;
        }
      }
    };
    if (sc.style === 'interior' || sc.style === 'sewer') ringRows(R + 1, R + 2, sc.style === 'interior' ? 5 : 3, sc.style === 'interior' ? 5 : 3);
    else { ringRows(R + 1, R + 2, sc.floors[0], sc.floors[1]); ringRows(R + 3, R + 4, sc.floors[0] + 1, sc.floors[1] + 1); }
    for (const b of blocks) {
      const s = sideOf(b.cells[0][0], b.cells[0][1]);
      const cs = new Set(b.cells.map(([x, y]) => `${x},${y}`));
      if (sc.style === 'interior' || sc.style === 'sewer' || sc.style === 'castle') this.ringWall(s.lo, s.hi, b.cells, cs, b.floors, b.front, sc, rnd, occ);
      else this.house(s.lo, s.hi, b.cells, cs, sc, rnd, pick(sc.wallTints), pick(sc.roofTints), b.floors, b.front, () => 0, occ);
    }
    // 街边带（距边 1）：按主题循环摆
    if (sc.carpet) { const s = sideOf(Math.floor(W / 2), -1); s.lo.put('proc/throne', Math.floor(W / 2) - 0.5, (map.heights?.[0]?.[Math.floor(W / 2)] ?? 0) * LV, -1.1, 0, 1.15); }
    let si = 0;
    const stripCell = (x: number, y: number, fx: number, fz: number) => {
      const s = sideOf(x, y);
      this.recipe(s.lo, sc.strip[si++ % sc.strip.length], x, 0, y, rnd, rotFor(fx, fz));
    };
    for (let x = -R; x < W + R; x++) { stripCell(x, -1, 0, 1); stripCell(x, H, 0, -1); }
    for (let y = 0; y < H; y++) { stripCell(-1, y, 1, 0); stripCell(W, y, -1, 0); }
    // 远景：城堡塔楼（每侧 2–3 座，很高）
    for (const s of sc.style === 'sewer' || sc.style === 'interior' ? [] : sides) {
      const along = s.nx === 0 ? W : H; const n = 2 + ((rnd() * 2) | 0);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n * along + (rnd() - 0.5) * 2;
        const dist = 8 + rnd() * 3;
        const x = s.nx === 0 ? t : s.nx > 0 ? W - 1 + dist : -dist, z = s.nz === 0 ? t : s.nz > 0 ? H - 1 + dist : -dist;
        this.tower(s.hi, x, z, 1.7 + rnd() * 0.6, 4 + ((rnd() * 4) | 0), sc);
      }
    }
    // 彩旗串：横跨地图（高处）+ 沿街（前排房屋檐下）
    if (sc.bunting > 0) {
      const g = new THREE.Group();
      for (let i = 0; i < sc.bunting; i++) {
        const x = ((i + 1) / (sc.bunting + 1)) * (W - 1) + (rnd() - 0.5);
        g.add(bunting(new THREE.Vector3(x - 1.5, 3.6, -2.4), new THREE.Vector3(x + 1.5, 3.6, H + 1.4), rnd));
      }
      world.add(g);
    }
    for (const s of sides) {
      const lo = s.lo.build(), hi = s.hi.build();
      const g = new THREE.Group(); g.add(lo, hi);
      world.add(g);
      this.outers.push({ g: hi, lo, nx: s.nx, nz: s.nz, full: 1 });
    }
    this.snap = true;
  }

  /** 房屋：外露面贴墙板（底层门/窗/遮阳篷，上层窗+花箱/旗帜/阳台），每格按外露方向放斜屋顶 */
  private house(lo: Batch, hi: Batch, cells: [number, number][], cs: Set<string>, sc: Scene, rnd: () => number, tint: number, roofTint: number, floors: number, front: [number, number] | null, hOf: (x: number, y: number) => number, occ?: Map<string, number>) {
    const wood = rnd() < (sc.wallTints[0] === 0xe9d6c4 ? 0.7 : 0.35);
    const walls = wood ? WALLS_WOOD : WALLS_PLASTER;
    const FH = 1; // 每层高
    for (const [x, y] of cells) {
      const base = hOf(x, y) * 0.6;
      for (const [dx, dy] of DIRS) {
        const nk = `${x + dx},${y + dy}`;
        if (cs.has(nk)) continue;
        const nf = occ?.get(nk) ?? 0;
        const ry = rotFor(dx, dy);
        const isFront = !front || (dx === front[0] && dy === front[1]);
        for (let f = nf; f < floors; f++) {
          const b = f === 0 ? lo : hi;
          const y0 = base + f * FH;
          let piece = pick(walls, rnd);
          if (f === 0 && isFront) piece = rnd() < 0.35 ? T(wood ? 'wall-wood-door' : rnd() < 0.5 ? 'wall-door' : 'wall-doorway-round') : pick(walls.slice(1), rnd);
          b.put(piece, x, y0, y, ry, 1, tint);
          if (!isFront || f === 0 && rnd() < 0.5) { if (f === 0 && isFront && rnd() < 0.6) b.put(T('overhang'), x, y0, y, ry, 1); continue; }
          // 上层：窗下花箱（P5T 特征）、偶尔旗帜/阳台
          if (f > 0) {
            const r = rnd();
            if (r < 0.62) b.add('proc/flowerbox', trs(x + dx * 0.55, y0 + 0.18, y + dy * 0.55, ry));
            else if (r < 0.78) b.put(T(rnd() < 0.7 ? 'banner-red' : 'banner-green'), x, y0, y, ry, 1);
            else if (r < 0.88) b.put(T('balcony-wall-fence'), x + dx * 0.12, y0, y + dy * 0.12, ry, 1);
          }
        }
      }
      // 屋顶
      const top = base + floors * FH;
      const miss = DIRS.filter(([dx, dy]) => !cs.has(`${x + dx},${y + dy}`));
      if (miss.length === 4) hi.put(T('roof-point'), x, top, y, 0, 1, roofTint);
      else if (miss.length >= 2 && miss.some(([a, b]) => miss.some(([c, d]) => a === -c && b === -d && (a || b)))) {
        const alongX = miss.some(([, b]) => b !== 0) && !miss.every(([a]) => a !== 0);
        hi.put(T('roof-gable'), x, top, y, alongX ? 0 : Math.PI / 2, 1, roofTint);
      } else if (miss.length) {
        const [dx, dy] = miss[0];
        hi.put(T('roof'), x, top, y, rotFor(dx, dy) + Math.PI, 1, roofTint);
        if (rnd() < 0.18) hi.put(T('chimney'), x, top + 0.1, y, rotFor(dx, dy) + Math.PI, 1);
      } else hi.put(T('roof-flat'), x, top + 0.5, y, 0, 1, roofTint);
    }
  }
  /** 地图内 1 格厚墙：城下町 = 2 格高石墙（顶部压条 + 墙面梯子装饰）；城墙 = Kenney 城墙段；室内 = 墙板 + 金柱 */
  private wallLine(b: Batch, comp: [number, number][], cs: Set<string>, sc: Scene, rnd: () => number, map: MapDef, hOf: (x: number, y: number) => number) {
    for (const [x, y] of comp) {
      const base = hOf(x, y) * 0.6;
      if (sc.style === 'castle') { b.put(C('wall'), x, base, y, cs.has(`${x + 1},${y}`) || cs.has(`${x - 1},${y}`) ? 0 : Math.PI / 2, 1, 0xf0e2f0, 1.25); continue; }
      const tint = sc.style === 'interior' ? sc.wallTints[0] : sc.style === 'sewer' ? sc.wallTints[1] : 0xb391a2;
      for (const [dx, dy] of DIRS) {
        if (cs.has(`${x + dx},${y + dy}`)) continue;
        const ry = rotFor(dx, dy);
        for (let f = 0; f < 2; f++) b.put(T(f === 1 && sc.style === 'interior' ? 'wall-window-round' : sc.style === 'sewer' && f === 0 && rnd() < 0.3 ? 'wall-arch' : 'wall-window-stone'), x, base + f, y, ry, 1, tint);
        const nx = x + dx, ny = y + dy;
        const walk = nx >= 0 && ny >= 0 && nx < map.width && ny < map.height && map.tiles[ny][nx] !== 'wall';
        if (walk && sc.style === 'interior' && rnd() < 0.25) b.put(T('banner-red'), x, base + 0.9, y, ry, 1);
      }
      b.put(T('roof-flat'), x, base + 2, y, 0, 1, 0x9b8aa0);
      if (sc.style === 'interior' && (x + y) % 3 === 0) b.put('proc/goldpillar', x, base + 2.05, y, 0, 0.6);
    }
  }
  /** 外圈实墙（室内大厅 / 水道 / 城墙）：连续高墙，城墙每隔几段一座塔 */
  private ringWall(lo: Batch, hi: Batch, cells: [number, number][], cs: Set<string>, floors: number, front: [number, number], sc: Scene, rnd: () => number, occ: Map<string, number>) {
    for (const [x, y] of cells) {
      if (sc.style === 'castle') {
        const tower = ((x + y) & 7) === 0 && rnd() < 0.8;
        lo.put(C(tower ? 'tower-square-base' : 'wall'), x, 0, y, rotFor(front[0], front[1]) + Math.PI / 2, 1, 0xf0e2f0, tower ? 1.3 : 1.4);
        if (tower) { hi.put(C('tower-square-mid-windows'), x, 1.3, y, 0, 1, null, 1.3); hi.put(C('tower-square-mid-windows'), x, 2.6, y, 0, 1, null, 1.3); hi.put(C('tower-square-top-roof-high'), x, 3.9, y, 0, 1); }
        else if (rnd() < 0.3) hi.put(C('flag-banner-long'), x + front[0] * 0.5, 1.6, y + front[1] * 0.5, rotFor(front[0], front[1]), 0.8);
        continue;
      }
      for (const [dx, dy] of DIRS) {
        const nk = `${x + dx},${y + dy}`; if (cs.has(nk)) continue;
        const nf = occ.get(nk) ?? 0; const ry = rotFor(dx, dy);
        for (let f = nf; f < floors; f++) {
          const b = f === 0 ? lo : hi;
          const p = sc.style === 'sewer' ? (f === 0 && rnd() < 0.4 ? 'wall-arch' : 'wall-window-stone') : f % 2 ? 'wall-window-round' : 'wall-window-stone';
          b.put(T(p), x, f, y, ry, 1, pick(sc.wallTints, rnd));
          if (sc.style === 'interior' && f === 2 && dx === front[0] && dy === front[1] && (x + y) % 2 === 0) hi.put(T('banner-red'), x, 1.6, y, ry, 1, null, 2.2);
        }
      }
    }
  }
  private tower(b: Batch, x: number, z: number, s: number, mids: number, sc: Scene) {
    const tint = sc.style === 'interior' || sc.style === 'sewer' ? 0x8b6e8d : 0xf2e4ee;
    b.put(C('tower-square-base'), x, 0, z, 0, s, tint);
    for (let i = 0; i < mids; i++) b.put(C('tower-square-mid-windows'), x, s * (1 + i), z, 0, s, tint);
    b.put(C('tower-square-top-roof-high'), x, s * (1 + mids), z, 0, s, 0xd8c0f0);
  }

  /** 一格的道具配方（坐标为格中心，y0 = 地面高度，ry = 朝向） */
  private recipe(b: Batch, name: string, x: number, y0: number, z: number, rnd: () => number, ry = rnd() * 4 | 0) {
    const r = typeof ry === 'number' && Number.isInteger(ry) ? ry * Math.PI / 2 : ry;
    const j = () => (rnd() - 0.5) * 0.12;
    switch (name) {
      case 'planter': b.put('proc/planter', x, y0, z, r, 1); break;
      case 'stone': b.put('proc/stone', x, y0, z, r, 1); break;
      case 'barrels': { const n = 2 + ((rnd() * 2) | 0); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rnd(); b.put('survival/barrel', x + Math.cos(a) * 0.22, y0, z + Math.sin(a) * 0.22, rnd() * 6, 1.55); } if (n === 2) b.put('survival/box-large', x + j(), y0, z + j(), r, 1.3); break; }
      case 'crates': b.put('pirate/crate', x + j(), y0, z + j(), r, 0.62); if (rnd() < 0.6) b.put('survival/box-large', x + j(), y0 + 0.47, z + j(), r + 0.4, 1.1); break;
      case 'crateStack': b.put('pirate/crate', x, y0, z, r, 0.7, null, 0.72); b.put('pirate/crate-bottles', x + j(), y0 + 0.55, z + j(), r + 0.3, 0.55); break;
      case 'bigBarrel': b.put('pirate/barrel', x, y0, z, r, 0.62, null, 0.85); break;
      case 'sandbags': b.put('proc/sandbags', x, y0, z, r, 1); break;
      case 'hay': b.put('proc/hay', x, y0, z, r, 1); break;
      case 'spikes': b.put('proc/spikes', x, y0, z, r, 1); break;
      case 'brazier': b.put('proc/brazier', x, y0, z, 0, 1); break;
      case 'statue': b.put('proc/statue', x, y0, z, r, 1); break;
      case 'stall': b.put(T(rnd() < 0.5 ? 'stall-red' : 'stall-green'), x, y0, z, r, 0.9); b.put('survival/box', x + 0.2, y0 + 0.36, z + j(), 0, 1.2); break;
      case 'cart': b.put(T('cart'), x, y0, z, r + 0.3, 0.72); break;
      case 'cartHigh': b.put(T('cart-high'), x, y0, z, r + 0.2, 0.72); b.put('survival/barrel', x, y0 + 0.4, z, 0, 1.4); break;
      case 'hedge': b.put(T('hedge-large'), x, y0, z, r, 1, null, 0.85); b.put(T('hedge-large'), x, y0, z, r + Math.PI, 1, null, 0.85); break;
      case 'hedgeTall': b.put(T('hedge-large'), x, y0, z, r, 1, null, 1.9); b.put(T('hedge-large'), x, y0, z, r + Math.PI, 1, null, 1.9); break;
      case 'tree': b.put(T(rnd() < 0.5 ? 'tree' : 'tree-high-round'), x, y0, z, rnd() * 6, 0.6); break;
      case 'ballista': b.put(C('siege-ballista'), x, y0 + 0.14, z, r, 0.7); break;
      case 'catapult': b.put(C('siege-catapult'), x, y0 + 0.12, z, r, 0.48); break;
      case 'pillar': b.put('proc/goldpillar', x, y0, z, 0, 1); break;
      case 'bookcase': b.put('furniture/bookcaseClosedWide', x, y0, z, r, 1.15, null, 1.5); break;
      case 'table': b.put('furniture/tableCloth', x, y0, z, r, 0.9, null, 1.1); break;
      case 'bench': b.put(sc_bench(rnd), x, y0, z, r, sc_bench(rnd) === 'furniture/bench' ? 1.6 : 1); break;
      case 'lamp': b.put(T('lantern'), x, y0, z, 0, 1.15); break;
      case 'lampFloor': b.put('furniture/lampSquareFloor', x, y0, z, 0, 1.8); b.put('furniture/pottedPlant', x + 0.25, y0, z + 0.2, 0, 1.4); break;
      case 'pots': for (let i = 0; i < 2; i++) b.put('furniture/pottedPlant', x - 0.2 + i * 0.4, y0, z + j(), rnd() * 6, 1.5); break;
      case 'flagpole': b.put('proc/pole', x, y0, z, r, 1); break;
      case 'water': b.put('proc/water', x, y0, z, 0, 1); if (rnd() < 0.3) b.put('survival/barrel', x, y0 - 0.1, z, 0, 1.4); break;
      default: b.put('proc/stone', x, y0, z, r, 1);
    }
  }

  /** 每帧：近相机两侧外圈收起高处、底层压矮；火焰闪烁 */
  update(yaw: number, t: number) {
    const cx = Math.sin(yaw), cz = Math.cos(yaw);
    for (const o of this.outers) {
      const near = o.nx * cx + o.nz * cz;
      const target = near > 0.2 ? 0 : 1;
      o.full = this.snap ? target : o.full + (target - o.full) * 0.14;
      o.g.scale.y = Math.max(0.01, o.full); o.g.visible = o.full > 0.03;
      o.lo.scale.y = 0.32 + 0.68 * o.full;
    }
    this.snap = false;
    void t;
  }
}
function pick<X>(a: X[], rnd: () => number) { return a[(rnd() * a.length) | 0]; }
function sc_bench(rnd: () => number) { void rnd; return hasModel('furniture/bench') ? 'furniture/bench' : T('stall-bench'); }

/** 彩旗串：下垂的悬链线 + 交替颜色三角旗（单个合并网格） */
function bunting(a: THREE.Vector3, b: THREE.Vector3, rnd: () => number) {
  const n = Math.max(8, Math.round(a.distanceTo(b) / 0.45));
  const cols = [0xe5191c, 0xffe000, 0x2bd9e8, 0xffffff, 0xf06aa8].map((c) => new THREE.Color(c));
  const pos: number[] = [], col: number[] = [];
  const line: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) { const k = i / n; const p = a.clone().lerp(b, k); p.y -= Math.sin(k * Math.PI) * 0.9; line.push(p); }
  for (let i = 0; i < n; i++) {
    const p0 = line[i], p1 = line[i + 1], m = p0.clone().lerp(p1, 0.5); m.y -= 0.28;
    const c = cols[(i + ((rnd() * 2) | 0)) % cols.length];
    pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, m.x, m.y, m.z);
    for (let v = 0; v < 3; v++) col.push(c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const tri = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8 }));
  const rope = new THREE.Line(new THREE.BufferGeometry().setFromPoints(line), new THREE.LineBasicMaterial({ color: 0x3b2d25 }));
  const grp = new THREE.Group(); grp.add(tri, rope);
  return grp;
}
export type { Part };
