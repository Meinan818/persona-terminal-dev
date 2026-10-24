// 场景灰盒（Hark 美术区）：按关卡场景标签搭「王国城下町」布景——亮天空、石板地、围合建筑、喷泉、旗杆。
// 纯装饰，不参与规则；地图内的 wall 格若成块（≥6 格）画成房屋，2×2 小块画成喷泉。其余关卡沿用暗灰盒。
// 近相机一侧的外围建筑会随镜头旋转自动压低（避免挡住战场），远侧保持高。
import * as THREE from 'three';
import type { MapDef } from '../rules';

export interface Theme {
  bg: number; fogNear: number; fogFar: number; hemiSky: number; hemiGround: number; hemiInt: number; sunColor: number; sunInt: number;
  tileA: number; tileB: number; tileHigh: number; tileHighB: number; wall: number; cobble: boolean;
}
const DARK: Theme = { bg: 0x141418, fogNear: 999, fogFar: 1000, hemiSky: 0xffffff, hemiGround: 0x302020, hemiInt: 1.4, sunColor: 0xffffff, sunInt: 1.6, tileA: 0x3b3b44, tileB: 0x33333b, tileHigh: 0x4a4656, tileHighB: 0x423e4d, wall: 0x55555f, cobble: false };
const PLAZA: Theme = { bg: 0x9fcdf0, fogNear: 38, fogFar: 70, hemiSky: 0xdff0ff, hemiGround: 0xb59a78, hemiInt: 1.35, sunColor: 0xfff2d6, sunInt: 1.9, tileA: 0xcdbf9f, tileB: 0xbbad8e, tileHigh: 0xe0d2b0, tileHighB: 0xd0c19f, wall: 0xc9a77c, cobble: true };
const SCENES: Record<string, Theme> = { L01: PLAZA };
export const themeFor = (mapId: string): Theme => SCENES[mapId] ?? DARK;

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
let _cobble: THREE.Texture | null = null;
export function cobbleTex() {
  return _cobble ??= canvasTex(128, 128, (g) => {
    g.fillStyle = '#d9d9d9'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(70,60,45,.55)'; g.lineWidth = 3;
    for (let r = 0; r < 4; r++) {
      const off = r % 2 ? 16 : 0; const y = r * 32;
      g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke();
      for (let x = -off; x < 128; x += 32) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); }
    }
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${90 + Math.random() * 60 | 0},${80 + Math.random() * 50 | 0},60,.07)`; g.fillRect(Math.random() * 128, Math.random() * 128, 6, 6); }
  });
}
function facadeTex(base: string, trim: string, floors: number) {
  return canvasTex(128, 64 * floors, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, 128, 64 * floors);
    for (let f = 0; f < floors; f++) {
      const y = f * 64;
      g.fillStyle = trim; g.fillRect(0, y, 128, 5);
      for (const x of [20, 76]) {
        g.fillStyle = '#5a3b22'; g.fillRect(x - 3, y + 15, 38, 36);
        g.fillStyle = '#6fa6d6'; g.fillRect(x, y + 18, 32, 30);
        g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 3, y + 21, 10, 24);
        g.fillStyle = '#5a3b22'; g.fillRect(x + 14, y + 18, 4, 30); g.fillRect(x, y + 31, 32, 4);
      }
    }
    g.strokeStyle = trim; g.lineWidth = 4; g.strokeRect(2, 2, 124, 64 * floors - 4);
  });
}

interface Outer { g: THREE.Group; dx: number; dz: number; full: number; th?: number }
export class SceneKit {
  private outers: Outer[] = [];
  private flags: THREE.Mesh[] = [];
  private water: THREE.Mesh | null = null;
  private center = new THREE.Vector3();
  private snap = true;

  /** 返回被布景占用的 wall 格（主程序不再画灰色方块） */
  build(world: THREE.Group, map: MapDef): Set<string> {
    this.outers = []; this.flags = []; this.water = null; this.snap = true;
    const claimed = new Set<string>();
    if (themeFor(map.id) !== PLAZA) return claimed;
    this.center.set((map.width - 1) / 2, 0, (map.height - 1) / 2);
    const roof = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 });

    // 1) 地图内成块的 wall → 房屋 / 喷泉
    const seen = new Set<string>();
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
      if (map.tiles[y][x] !== 'wall' || seen.has(`${x},${y}`)) continue;
      const cells: [number, number][] = []; const st: [number, number][] = [[x, y]]; seen.add(`${x},${y}`);
      while (st.length) {
        const [cx, cy] = st.pop()!; cells.push([cx, cy]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height || seen.has(`${nx},${ny}`) || map.tiles[ny][nx] !== 'wall') continue;
          seen.add(`${nx},${ny}`); st.push([nx, ny]);
        }
      }
      const xs = cells.map((c) => c[0]), ys = cells.map((c) => c[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const w = x1 - x0 + 1, d = y1 - y0 + 1;
      if (cells.length !== w * d) continue; // 只处理矩形块
      cells.forEach(([cx, cy]) => claimed.add(`${cx},${cy}`));
      const cx = (x0 + x1) / 2, cz = (y0 + y1) / 2;
      if (cells.length >= 6) world.add(this.house(cx, cz, w - 0.1, d - 0.1, 3 + (cells.length > 12 ? 1 : 0), x0 === 0 ? 0xe9d8b0 : 0xe6c9a0, roof(x0 === 0 ? 0xb8402e : 0x3f6fa8)));
      else world.add(this.fountain(cx, cz, Math.max(w, d)));
    }

    // 2) 外围布景：四周一圈房屋，后方城堡塔楼
    const W = map.width, H = map.height, ring = 2.2;
    const bld: [number, number, number, number, number, number, number][] = []; // cx,cz,w,d,floors,wallHex,roofHex
    const wallC = [0xe9d8b0, 0xe6c9a0, 0xd9c7a4, 0xefe0c4], roofC = [0xb8402e, 0x3f6fa8, 0x9c3a2a, 0x2f7a6a];
    let k = 0;
    for (let x = -1; x < W + 2; x += 4.2) { for (const z of [-ring - 1, H - 1 + ring + 1]) { bld.push([x + 1, z, 3.8, 3.4, 2 + ((k + 1) % 2), wallC[k % 4], roofC[(k * 3) % 4]]); k++; } }
    for (let z = 3; z < H - 2; z += 4.2) { for (const x of [-ring - 1, W - 1 + ring + 1]) { bld.push([x, z + 1, 3.4, 3.8, 2 + (k % 2), wallC[k % 4], roofC[(k * 3) % 4]]); k++; } }
    for (const b of bld) {
      const [cx, cz, w, d, fl, wc, rc] = b;
      const g = this.house(cx, cz, w, d, fl, wc, roof(rc));
      world.add(g);
      this.outers.push({ g, dx: cx - this.center.x, dz: cz - this.center.z, full: 1 });
    }
    // 远景城堡主楼（地图 y<0 侧；旋转时也只作背景，不挡战场：很远）
    for (const [i, x] of [-2, W * 0.35, W * 0.7, W + 2].entries()) {
      const tw = this.tower(x, -ring - 9 - (i % 2) * 2, 2.2 + (i % 2) * 0.6, 9 + (i % 3) * 2);
      world.add(tw); this.outers.push({ g: tw, dx: x - this.center.x, dz: tw.position.z - this.center.z, full: 1, th: -0.45 });
    }
    const keep = this.house(W / 2, -ring - 12, W * 0.55, 4, 5, 0xdcd0bd, roof(0x384f8a)); world.add(keep); this.outers.push({ g: keep, dx: 0, dz: keep.position.z - this.center.z, full: 1, th: -0.45 });

    // 3) 旗杆（石板路口）
    for (const [fx, fz] of [[W / 2 - 1, H - 1.6], [W / 2, H - 1.6]]) world.add(this.pole(fx, fz, 0xd8202f));
    return claimed;
  }

  private house(cx: number, cz: number, w: number, d: number, floors: number, wallHex: number, roofMat: THREE.Material) {
    const g = new THREE.Group(); const h = floors * 1.0;
    const side = (rx: number, ry: number) => new THREE.MeshStandardMaterial({ map: facadeTex('#' + wallHex.toString(16).padStart(6, '0'), '#8a5a34', floors), roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), side(w, h));
    body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true;
    const r = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 1.5 + Math.max(w, d) * 0.12, 4), roofMat);
    r.rotation.y = Math.PI / 4; r.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); r.position.y = h + 0.8; r.castShadow = true;
    g.add(body, r); g.position.set(cx, 0, cz);
    (g as any).userData.h = h;
    return g;
  }
  private tower(x: number, z: number, r: number, h: number) {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, h, 12), new THREE.MeshStandardMaterial({ color: 0xdcd0bd, roughness: 0.9 }));
    b.position.y = h / 2; b.castShadow = true;
    const c = new THREE.Mesh(new THREE.ConeGeometry(r * 1.25, r * 2.2, 12), new THREE.MeshStandardMaterial({ color: 0x384f8a, roughness: 0.7 }));
    c.position.y = h + r * 1.1;
    g.add(b, c, this.pole(0, 0, 0xd8202f, h + r * 2.2)); g.position.set(x, 0, z);
    return g;
  }
  private pole(x: number, z: number, col: number, y0 = 0) {
    const g = new THREE.Group();
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), new THREE.MeshStandardMaterial({ color: 0x5a4a3a }));
    p.position.y = y0 + 1.1;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55, 6, 1), new THREE.MeshStandardMaterial({ color: col, side: THREE.DoubleSide, roughness: 0.8 }));
    f.position.set(0.47, y0 + 1.9, 0); this.flags.push(f);
    g.add(p, f); g.position.set(x, 0, z);
    return g;
  }
  private fountain(cx: number, cz: number, size: number) {
    const g = new THREE.Group(); const R = size * 0.52;
    const stone = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.8 });
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.06, 0.55, 20), stone); rim.position.y = 0.28; rim.castShadow = true;
    this.water = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.86, R * 0.86, 0.06, 20), new THREE.MeshStandardMaterial({ color: 0x58c4e8, roughness: 0.15, metalness: 0.2, emissive: 0x1a6a90, emissiveIntensity: 0.35 }));
    this.water.position.y = 0.52;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.0, 10), stone); col.position.y = 0.95;
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.3, 0.2, 14), stone); bowl.position.y = 1.4;
    const jet = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0xbfeaff, emissive: 0x4aa8d8, emissiveIntensity: 0.6, transparent: true, opacity: 0.75 })); jet.position.y = 1.85;
    g.add(rim, this.water, col, bowl, jet); g.position.set(cx, 0, cz);
    return g;
  }

  /** 每帧：近相机侧外围建筑压低；旗/水面微动 */
  update(yaw: number, t: number) {
    const cx = Math.sin(yaw), cz = Math.cos(yaw); // 相机相对地图中心的水平方向
    for (const o of this.outers) {
      const len = Math.hypot(o.dx, o.dz) || 1;
      const near = (o.dx * cx + o.dz * cz) / len; // >0 = 在相机一侧
      const target = near > (o.th ?? 0.2) ? 0.05 : 1;
      o.full = this.snap ? target : o.full + (target - o.full) * 0.12;
      o.g.scale.y = Math.max(0.02, o.full); o.g.visible = o.full > 0.12;
    }
    this.snap = false;
    for (const [i, f] of this.flags.entries()) {
      const pos = f.geometry.attributes.position as THREE.BufferAttribute;
      for (let v = 0; v < pos.count; v++) { const x = pos.getX(v) + 0.45; pos.setZ(v, Math.sin(t * 4 + x * 5 + i) * 0.06 * x); }
      pos.needsUpdate = true;
    }
    if (this.water) this.water.position.y = 0.52 + Math.sin(t * 2) * 0.012;
  }
}
