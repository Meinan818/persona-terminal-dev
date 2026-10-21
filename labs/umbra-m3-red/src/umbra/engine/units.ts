// 场上单位：MeshPlane 常驻呼吸/摆动（meshIdle §1.5）、受击压扁、倒地姿态（portraitDown 的持久状态）。
import { Container, Graphics, MeshPlane, Mesh, Texture } from 'pixi.js';

export interface MeshIdleCfg { breath: number; period: number; swayPx: number; swayZone: string | number[][] }
export interface UnitNode {
  id: string; side: 'ally' | 'enemy';
  root: Container; body: Container; hit: Container; mesh: MeshPlane; shade: Mesh<any, any>; tex: Texture;
  home: { x: number; y: number }; h: number; s: number; facing: 1 | -1;
  idle: MeshIdleCfg; base: Float32Array; weights: Float32Array; phase: number;
  down: boolean; downT: number; stars: Container; reticle?: Container;
  headY: number;   // 头顶（相对 root，设计像素，负数）
  hitY: number;    // 命中点
}

function inPoly(x: number, y: number, p: number[]) {
  let c = false;
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
    const xi = p[i], yi = p[i + 1], xj = p[j], yj = p[j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export function makeUnit(id: string, side: 'ally' | 'enemy', tex: Texture, x: number, y: number, h: number, facing: 1 | -1, idle: MeshIdleCfg, phase: number, grid: [number, number]) {
  const mesh = new MeshPlane({ texture: tex, verticesX: grid[0], verticesY: grid[1] });
  const shade = new Mesh({ geometry: mesh.geometry, texture: tex });
  shade.tint = 0x000000; shade.alpha = side === 'enemy' ? 0.85 : 0.6; shade.position.set(side === 'enemy' ? 5 : -4, 3);
  const s = h / tex.height;
  const inner = new Container(); inner.addChild(shade, mesh);
  inner.scale.set(s * facing, s); inner.position.set((-tex.width * s * facing) / 2, -tex.height * s);
  const hit = new Container(); hit.addChild(inner);
  const body = new Container(); body.addChild(hit);
  const root = new Container();
  const floor = new Graphics().ellipse(0, 0, tex.width * s * 0.38, Math.max(10, h * 0.045)).fill({ color: 0x000000, alpha: 0.55 });
  const stars = new Container(); stars.visible = false;
  for (let i = 0; i < 3; i++) {
    const g = new Graphics().poly([0, -9, 3, -3, 9, 0, 3, 3, 0, 9, -3, 3, -9, 0, -3, -3]).fill(0xffe14a).stroke({ color: 0x000000, width: 2 });
    stars.addChild(g);
  }
  root.addChild(floor, body, stars);
  root.position.set(x, y);
  const buf = mesh.geometry.getBuffer('aPosition');
  const base = new Float32Array(buf.data as Float32Array);
  const weights = new Float32Array(base.length / 2);
  for (let i = 0; i < weights.length; i++) {
    const px = base[i * 2], py = base[i * 2 + 1], v = py / tex.height;
    if (typeof idle.swayZone === 'string') weights[i] = idle.swayZone === 'all' ? Math.max(0, 1 - v) ** 2 : 0;
    else weights[i] = idle.swayZone.some((p) => inPoly(px, py, p)) ? Math.max(0, 1 - v) ** 1.5 : 0;
  }
  const u: UnitNode = { id, side, root, body, hit, mesh, shade, tex, home: { x, y }, h, s, facing, idle, base, weights, phase, down: false, downT: 0, stars,
    headY: -h - 20, hitY: -h * 0.55 };
  return u;
}

export function updateUnit(u: UnitNode, t: number, dt: number) {
  const buf = u.mesh.geometry.getBuffer('aPosition');
  const d = buf.data as Float32Array, b = u.base, W = u.tex.width, H = u.tex.height;
  const w = (t / u.idle.period) * Math.PI * 2 + u.phase;
  const br = 1 + u.idle.breath * Math.sin(w);
  const sway = u.idle.swayPx / u.s;   // design px → texture px
  for (let i = 0, k = 0; i < d.length; i += 2, k++) {
    const x = b[i], y = b[i + 1], v = y / H;
    const ny = H - (H - y) * br;
    const sw = sway * Math.sin(w * 1.35 + v * 3.2) * u.weights[k];
    d[i] = W / 2 + (x - W / 2) * (1 - (br - 1) * 0.5 * (1 - v)) + sw; d[i + 1] = ny;
  }
  buf.update();
  if (u.down) {
    u.downT += dt;
    u.stars.children.forEach((s, i) => { const a = u.downT / 260 + (i * Math.PI * 2) / 3; s.position.set(Math.cos(a) * 46, -u.h * 0.32 + Math.sin(a) * 12); s.rotation = a; });
  }
}

/** 倒地姿态（P5R：横倒 + 头顶转星）。p: 0 站立 → 1 倒地 */
export function setDownPose(u: UnitNode, p: number) {
  u.body.rotation = -1.25 * p * (u.facing === 1 ? 1 : -1);
  u.body.y = -u.h * 0.06 * p;
  u.body.x = u.h * 0.32 * p;
  u.body.scale.set(1, 1 - 0.1 * p);
}
