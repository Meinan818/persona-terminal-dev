// 场上单位：MeshPlane 常驻呼吸/摆动（meshIdle §1.5）、受击压扁、倒地姿态（portraitDown 的持久状态）。
import { Container, Graphics, MeshPlane, Mesh, Texture } from 'pixi.js';

export interface Pose { lean: number; crouch: number; twist: number; raise: number; dx: number; dy: number }
export const POSE0: Pose = { lean: 0, crouch: 0, twist: 0, raise: 0, dx: 0, dy: 0 };
export interface MeshIdleCfg { breath: number; period: number; swayPx: number; swayZone: string | number[][] }
export interface UnitNode {
  id: string; side: 'ally' | 'enemy';
  root: Container; body: Container; hit: Container; mesh: MeshPlane; shade: Mesh<any, any>; tex: Texture;
  home: { x: number; y: number }; h: number; s: number; facing: 1 | -1;
  idle: MeshIdleCfg; base: Float32Array; weights: Float32Array; phase: number;
  down: boolean; downT: number; stars: Container; reticle?: Container;
  /** 2D 骨骼式姿态（网格变形参数，pose 原语按缓动连续插值；0 = 待机） */
  pose: Pose; arm: Float32Array;
  rim?: Mesh<any, any>;
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

export function makeUnit(id: string, side: 'ally' | 'enemy', tex: Texture, x: number, y: number, h: number, facing: 1 | -1, idle: MeshIdleCfg, phase: number, grid: [number, number], armZone?: number[]) {
  const mesh = new MeshPlane({ texture: tex, verticesX: grid[0], verticesY: grid[1] });
  const shade = new Mesh({ geometry: mesh.geometry, texture: tex });
  shade.tint = 0x000000; shade.alpha = side === 'enemy' ? 0.85 : 0.6; shade.position.set(side === 'enemy' ? 5 : -4, 3);
  const s = h / tex.height;
  const inner = new Container();
  if (side === 'enemy') { const rim = new Mesh({ geometry: mesh.geometry, texture: tex }); rim.tint = 0xff1a2a; rim.alpha = 0.95; rim.position.set(-4 / (h / tex.height), -3 / (h / tex.height)); rim.blendMode = 'add'; inner.addChild(rim); }
  let rimA: Mesh<any, any> | undefined;
  if (side === 'ally') { rimA = new Mesh({ geometry: mesh.geometry, texture: tex }); rimA.tint = 0xff2a36; rimA.alpha = 0.3; rimA.blendMode = 'add'; inner.addChild(rimA); }
  inner.addChild(shade, mesh);
  if (rimA) { inner.removeChild(rimA); inner.addChildAt(rimA, 0); }
  inner.scale.set(s * facing, s); inner.position.set((-tex.width * s * facing) / 2, -tex.height * s);
  const hit = new Container(); hit.addChild(inner);
  const body = new Container(); body.addChild(hit);
  const root = new Container();
  const floor = new Graphics().ellipse(0, 0, tex.width * s * 0.42, Math.max(12, h * 0.055)).fill({ color: 0x000000, alpha: 0.7 })
    .ellipse(0, 0, tex.width * s * 0.26, Math.max(7, h * 0.03)).fill({ color: 0x000000, alpha: 0.5 });
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
  // 手臂区（皮肤给多边形；默认取画面右上 45%×60% 区域，按到肩部的距离衰减）—— raise 姿态只抬这一块
  const arm = new Float32Array(base.length / 2);
  for (let i = 0; i < arm.length; i++) {
    const px = base[i * 2], py = base[i * 2 + 1], u0 = px / tex.width, v = py / tex.height;
    if (armZone) arm[i] = inPoly(px, py, armZone) ? 1 : 0;
    else arm[i] = Math.max(0, Math.min(1, (u0 - 0.5) / 0.35)) * Math.max(0, Math.min(1, (0.62 - v) / 0.3));
  }
  const u: UnitNode = { id, side, root, body, hit, mesh, shade, tex, home: { x, y }, h, s, facing, idle, base, weights, phase, down: false, downT: 0, stars, pose: { ...POSE0 }, arm,
    headY: -h - 20, hitY: -h * 0.55, rim: rimA };
  return u;
}

export function updateUnit(u: UnitNode, t: number, dt: number, camX = 0) {
  const buf = u.mesh.geometry.getBuffer('aPosition');
  const d = buf.data as Float32Array, b = u.base, W = u.tex.width, H = u.tex.height;
  const w = (t / u.idle.period) * Math.PI * 2 + u.phase;
  const br = 1 + u.idle.breath * Math.sin(w);
  const sway = u.idle.swayPx / u.s;   // design px → texture px
  const P = u.pose, lean = P.lean / u.s * u.facing, rise = P.raise / u.s, cr = 1 - P.crouch, tw = P.twist;
  for (let i = 0, k = 0; i < d.length; i += 2, k++) {
    const x = b[i], y = b[i + 1], v = y / H, up = 1 - v;
    const ny = H - (H - y) * br * cr;
    const sw = sway * Math.sin(w * 1.35 + v * 3.2) * u.weights[k] * (1 + Math.abs(P.lean) / 40);   // 动作时衣摆/头发摆幅加大
    const a = u.arm[k];
    d[i] = W / 2 + (x - W / 2) * (1 - (br - 1) * 0.5 * up) * (1 - tw * up) * (1 + P.crouch * 0.4 * v) + sw + lean * up ** 1.3 + a * rise * 0.35 * u.facing;
    d[i + 1] = ny - a * rise;
  }
  buf.update();
  // 敌人待机浮动/微抖（原作 Shadow 悬浮感）；姿态位移
  const bob = u.side === 'enemy' && !u.down ? Math.sin(w * 1.7) * 7 + Math.sin(t / 97) * 0.8 : 0;
  u.body.pivot.x = -P.dx; u.body.pivot.y = -(P.dy + bob);
  // 伪 3D：镜头环绕时人物按透视微倾（脚下不动、头部随视角偏），轮廓光方向随镜头转（光源固定在敌方一侧）、强度随呼吸起伏
  if (u.side === 'ally') {
    u.root.skew.x = -camX * 0.0011;
    if (u.rim) { const sc = 1 / u.s; u.rim.position.set((5 + camX * 0.12) * sc * u.facing, (-3 - Math.abs(camX) * 0.03) * sc); u.rim.alpha = 0.26 + 0.1 * Math.sin(w * 0.5) + Math.abs(P.lean) / 160; }
  } else u.root.skew.x = camX * 0.0003;
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
