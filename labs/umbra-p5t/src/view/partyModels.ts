// 程序化 Q 版角色（Hark 美术区）：Skull / Mona / Marie 军卫兵 Shadow。
// 全部用基础几何体拼，按 P5T 比例（头约占身高 45–55%），toon 3 阶 + 黑描边，与 Joker 实体模型同一套动画（chibiRig.ts）。
import * as THREE from 'three';
import { ChibiBuilder, ProcRig, G } from './chibiRig';
import type { BodySpec, JointName, UnitRig } from './chibiRig';

const Y = new THREE.Vector3(0, 1, 0);
/** 球面上一点（th = 离头顶的角度，ph = 绕 Y：0 正前方，+ 向角色左侧）及让 +Y 朝外法线的旋转 */
function onSphere(r: number, th: number, ph: number, c: [number, number, number] = [0, 0, 0]) {
  const n = new THREE.Vector3(Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph));
  return { p: [c[0] + n.x * r, c[1] + n.y * r, c[2] + n.z * r] as [number, number, number], q: new THREE.Quaternion().setFromUnitVectors(Y, n), n };
}
/** 球壳一片（th0..th1 离头顶角度，ph 以正前方为中心 ±half） */
function shell(r: number, th0: number, th1: number, half: number) {
  // three 的球面参数：x = -cos(phi) sin(theta), z = sin(phi) sin(theta)；正前方 +z 对应 phi = π/2
  return new THREE.SphereGeometry(r, 20, 12, Math.PI / 2 - half, half * 2, th0, th1 - th0);
}

function limbs(b: ChibiBuilder, c: { sleeve: number; glove: number; pants: number; boot: number; sole?: number; armR?: number; legR?: number; cuff?: number }) {
  const s = b.spec, ar = c.armR ?? 0.045, lr = c.legR ?? 0.052;
  for (const side of ['L', 'R'] as const) {
    b.add(`arm${side}` as JointName, G.capsule(ar, s.upperArm - ar), c.sleeve, { p: [0, -s.upperArm / 2, 0] });
    b.add(`fore${side}` as JointName, G.capsule(ar * 0.92, s.foreArm - ar), c.sleeve, { p: [0, -s.foreArm / 2, 0] });
    if (c.cuff != null) b.add(`fore${side}` as JointName, G.cyl(ar * 1.25, ar * 1.05, 0.04), c.cuff, { p: [0, -s.foreArm + 0.02, 0] });
    b.add(`hand${side}` as JointName, G.sphere(ar * 1.2, 12, 8), c.glove, { p: [0, -0.01, 0] });
    b.add(`leg${side}` as JointName, G.capsule(lr, s.legLen * 0.5 - lr), c.pants, { p: [0, -s.legLen * 0.25, 0] });
    b.add(`shin${side}` as JointName, G.capsule(lr * 0.9, s.legLen * 0.32), c.pants, { p: [0, -s.legLen * 0.2, 0] });
    b.add(`shin${side}` as JointName, G.sphere(lr * 1.35, 12, 8), c.boot, { p: [0, -s.legLen * 0.5 + lr * 0.85, 0.03], s: [0.95, 0.8, 1.45] });
    if (c.sole != null) b.add(`shin${side}` as JointName, G.box(lr * 2.2, 0.025, lr * 3.6), c.sole, { p: [0, -s.legLen * 0.5 + 0.012, 0.035] }, { outline: false });
  }
}

// ---------------- Skull ----------------
const SKULL: BodySpec = { height: 1.05, legLen: 0.27, torso: 0.25, headR: 0.245, neck: 0.19, shoulderX: 0.135, hipX: 0.066, upperArm: 0.125, foreArm: 0.115 };
export function makeSkull(): UnitRig {
  const b = new ChibiBuilder(SKULL), s = SKULL;
  const SKIN = 0xf2c6a0, HAIR = 0xf4d03a, JACKET = 0x1c1c22, PANTS = 0x24242c, RED = 0xd8141e, SCARF = 0xf6c200, WHITE = 0xf4f1ea;
  // 躯干：黑皮夹克 + 立领 + 黄围巾
  b.add('chest', G.capsule(0.118, 0.11), JACKET, { p: [0, 0.135, 0], s: [1, 1, 0.82] });
  b.add('chest', G.box(0.03, 0.2, 0.02), 0x3a3a44, { p: [0, 0.13, 0.098] }, { outline: false }); // 拉链
  for (const sx of [1, -1]) b.add('chest', G.box(0.11, 0.09, 0.025), JACKET, { p: [sx * 0.07, s.torso + 0.01, 0.045], r: [-0.35, sx * 0.5, sx * 0.35] }); // 翻领
  b.add('chest', G.torus(0.08, 0.036), SCARF, { p: [0, s.torso + 0.02, 0], r: [Math.PI / 2, 0, 0] });
  b.add('chest', G.box(0.07, 0.17, 0.03), SCARF, { p: [0.05, s.torso - 0.06, 0.1], r: [0.2, 0, -0.25] }); // 垂下的围巾尾
  b.add('hips', G.cyl(0.1, 0.105, 0.09), PANTS, { p: [0, -0.01, 0], s: [1, 1, 0.85] });
  b.add('hips', G.torus(0.1, 0.014), 0x5a4a3a, { p: [0, 0.03, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.85, 1] }, { outline: false });
  limbs(b, { sleeve: JACKET, glove: RED, pants: PANTS, boot: 0x141418, sole: 0x55555e, cuff: RED });
  // 肩上的夹克垫肩
  for (const sd of ['L', 'R'] as const) b.add(`arm${sd}`, G.sphere(0.06, 12, 8), JACKET, { p: [0, -0.01, 0] });
  // 头：皮肤 + 白色骷髅面具（盖住上半脸）+ 黑眼窝/鼻孔 + 咧嘴笑
  const R = s.headR;
  b.add('head', G.sphere(R, 22, 16), SKIN);
  b.add('head', shell(R * 1.035, 0.95, 1.95, 1.05), WHITE);
  for (const sx of [1, -1]) { const e = onSphere(R * 0.98, 1.38, sx * 0.4); b.add('head', G.sphere(0.058, 12, 8), 0x0c0c10, { p: e.p, q: e.q, s: [1, 0.55, 1.1] }, { outline: false }); }
  for (const sx of [1, -1]) { const n = onSphere(R * 1.0, 1.72, sx * 0.08); b.add('head', G.sphere(0.018, 8, 6), 0x0c0c10, { p: n.p }, { outline: false }); }
  // 面具下缘的牙齿刻线
  for (let i = -2; i <= 2; i++) { const t = onSphere(R * 1.04, 1.9, i * 0.12); b.add('head', G.box(0.006, 0.03, 0.006), 0x2a2a30, { p: t.p, q: t.q }, { outline: false }); }
  b.add('head', G.torus(0.055, 0.009, Math.PI), 0x6a1a14, { p: [0, -0.15, R * 0.86], r: [-0.55, 0, Math.PI] }, { outline: false });
  // 金色刺头：头顶发帽 + 一圈尖刺
  b.add('head', new THREE.SphereGeometry(R * 1.05, 22, 10, 0, Math.PI * 2, 0, 1.05), HAIR);
  b.add('head', new THREE.SphereGeometry(R * 1.04, 22, 10, Math.PI * 1.5 - 1.5, 3.0, 0.9, 1.45), HAIR); // 后脑
  const spikes: [number, number, number][] = [[0.15, 0, 0.13], [0.45, 0.2, 0.14], [0.45, -0.2, 0.14], [0.55, 0.9, 0.13], [0.55, -0.9, 0.13], [0.75, 1.6, 0.12], [0.75, -1.6, 0.12], [0.6, 2.4, 0.13], [0.6, -2.4, 0.13], [0.5, Math.PI, 0.14], [0.95, 2.9, 0.11], [0.95, -2.9, 0.11], [0.85, 0.5, 0.1], [0.85, -0.5, 0.1], [1.05, 1.2, 0.09], [1.05, -1.2, 0.09]];
  for (const [th, ph, h] of spikes) { const o = onSphere(R * 0.98, th, ph); b.add('head', G.cone(0.062, h + 0.04, 6), HAIR, { p: [o.p[0] + o.n.x * h * 0.5, o.p[1] + o.n.y * h * 0.5 + 0.02, o.p[2] + o.n.z * h * 0.5], q: o.q }); }
  // 铁管
  b.add('weapon', G.cyl(0.019, 0.019, 0.52, 8), 0x8d929c, { p: [0, 0.2, 0] });
  for (const y of [-0.04, 0.44]) b.add('weapon', G.cyl(0.026, 0.026, 0.04, 8), 0x5c6068, { p: [0, y, 0] });
  b.add('weapon', G.cyl(0.022, 0.022, 0.1, 8), 0x2a2a2e, { p: [0, 0.02, 0] }, { outline: false });
  return new ProcRig(b, { idle: -0.75, attack: 'follow' });
}

// ---------------- Mona ----------------
const MONA: BodySpec = { height: 0.9, legLen: 0.16, torso: 0.17, headR: 0.25, neck: 0.205, shoulderX: 0.1, hipX: 0.055, upperArm: 0.08, foreArm: 0.075, outline: 0.011 };
export function makeMona(): UnitRig {
  const b = new ChibiBuilder(MONA), s = MONA;
  const BLACK = 0x17171d, WHITE = 0xf6f4ee, YEL = 0xf5c400, BLUE = 0x2f8cff;
  b.add('chest', G.capsule(0.088, 0.06), BLACK, { p: [0, 0.085, 0], s: [1, 1, 0.9] });
  b.add('chest', G.sphere(0.07, 14, 10), WHITE, { p: [0, 0.08, 0.045], s: [0.85, 1.15, 0.7] }, { outline: false }); // 白肚
  b.add('chest', G.torus(0.07, 0.034), YEL, { p: [0, s.torso + 0.005, 0], r: [Math.PI / 2, 0, 0] }); // 黄领巾
  b.add('chest', G.cone(0.07, 0.12, 3), YEL, { p: [0, s.torso - 0.05, -0.07], r: [-0.35, 0, Math.PI], s: [1, 1, 0.35] }); // 领巾后摆
  b.add('hips', G.cyl(0.085, 0.09, 0.07), BLACK, { p: [0, -0.005, 0] });
  b.add('hips', G.torus(0.088, 0.02), YEL, { p: [0, 0.03, 0], r: [Math.PI / 2, 0, 0] }); // 黄腰带
  b.add('hips', G.box(0.05, 0.04, 0.02), 0xc89a10, { p: [0, 0.03, 0.09] });
  limbs(b, { sleeve: BLACK, glove: WHITE, pants: BLACK, boot: WHITE, armR: 0.036, legR: 0.042 });
  // 尾巴：两节向后上翘
  b.add('tail', G.capsule(0.022, 0.16), BLACK, { p: [0, 0.03, -0.1], r: [-1.1, 0, 0] });
  b.add('tail', G.capsule(0.02, 0.12), BLACK, { p: [0, 0.16, -0.19], r: [-0.25, 0, 0] });
  // 大圆黑头 + 白口鼻 + 蓝大眼 + 耳朵
  const R = s.headR;
  b.add('head', G.sphere(R, 24, 18), BLACK, { s: [1.08, 0.96, 1] });
  b.add('head', G.sphere(0.13, 18, 12), WHITE, { p: [0, -0.085, R * 0.62], s: [1.35, 0.72, 0.75] });
  b.add('head', G.sphere(0.022, 8, 6), 0xe0607a, { p: [0, -0.045, R * 0.97] }, { outline: false }); // 鼻
  b.add('head', G.torus(0.035, 0.007, Math.PI), 0x111116, { p: [0, -0.095, R * 0.93], r: [-0.3, 0, Math.PI] }, { outline: false });
  for (const sx of [1, -1]) {
    const e = onSphere(R * 0.93, 1.42, sx * 0.36);
    b.add('head', G.sphere(0.07, 16, 12), WHITE, { p: e.p, q: e.q, s: [0.95, 0.5, 1.25] });
    const i = onSphere(R * 0.985, 1.42, sx * 0.33);
    b.add('head', G.sphere(0.048, 14, 10), BLUE, { p: i.p, q: i.q, s: [0.95, 0.5, 1.2] }, { outline: false });
    const pp = onSphere(R * 1.005, 1.43, sx * 0.32);
    b.add('head', G.sphere(0.026, 10, 8), 0x07070a, { p: pp.p, q: pp.q, s: [0.9, 0.5, 1.2] }, { outline: false });
    const hl = onSphere(R * 1.02, 1.33, sx * 0.3);
    b.add('head', G.sphere(0.012, 8, 6), 0xffffff, { p: hl.p }, { outline: false });
    // 耳朵
    const ea = onSphere(R * 0.82, 0.62, sx * 1.15);
    b.add('head', G.cone(0.095, 0.2, 10), BLACK, { p: [ea.p[0] + ea.n.x * 0.1, ea.p[1] + ea.n.y * 0.1, ea.p[2] + ea.n.z * 0.1], q: ea.q, s: [1, 1, 0.6] });
    b.add('head', G.cone(0.055, 0.12, 8), 0x45404e, { p: [ea.p[0] + ea.n.x * 0.1, ea.p[1] + ea.n.y * 0.1 - 0.005, ea.p[2] + ea.n.z * 0.1 + 0.03], q: ea.q, s: [1, 1, 0.3] }, { outline: false });
  }
  // 弯刀：银色弧刃 + 金护手 + 棕柄
  const sh = new THREE.Shape();
  sh.moveTo(-0.022, 0.05); sh.quadraticCurveTo(-0.03, 0.26, 0.05, 0.42); sh.quadraticCurveTo(0.07, 0.25, 0.022, 0.05); sh.closePath();
  const blade = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false, curveSegments: 10 });
  blade.translate(0, 0, -0.006);
  b.add('weapon', blade, 0xdfe6f0, { s: [1.3, 1.1, 1.6] });
  b.add('weapon', G.box(0.1, 0.02, 0.03), 0xd8a820, { p: [0, 0.045, 0] });
  b.add('weapon', G.cyl(0.015, 0.015, 0.09, 8), 0x6b3f1f, { p: [0, -0.005, 0] });
  return new ProcRig(b, { idle: 0.55, attack: 'follow' });
}

// ---------------- Marie 军卫兵（Shadow） ----------------
const SOLDIER: BodySpec = { height: 1.06, legLen: 0.28, torso: 0.26, headR: 0.235, neck: 0.185, shoulderX: 0.14, hipX: 0.068, upperArm: 0.13, foreArm: 0.12 };
const ROLE_ACCENT: Record<string, number> = { revenger: 0xd62ea0, shielder: 0x3a78e0, teleporter: 0x2ac6b8, launcher: 0xe0a020, supporter: 0x3cc04a };
export function makeShadow(role?: string): UnitRig {
  const b = new ChibiBuilder(SOLDIER), s = SOLDIER;
  const RED = 0xc4141c, DRED = 0x7e0a12, BLACK = 0x16141a, GOLD = 0xe2b33a, MASK = 0xf3efe6;
  const acc = ROLE_ACCENT[role ?? ''] ?? RED;
  // 红色军装上衣 + 下摆 + 黑腰带金扣 + 白斜挎带 + 金纽扣 + 黑立领
  b.add('chest', G.capsule(0.122, 0.11), RED, { p: [0, 0.135, 0], s: [1, 1, 0.84] });
  b.add('chest', G.box(0.035, 0.27, 0.02), 0xf2eee8, { p: [0, 0.13, 0.095], r: [0, 0, 0.62] }, { outline: false });
  for (const y of [0.06, 0.12, 0.18]) b.add('chest', G.sphere(0.011, 6, 4), GOLD, { p: [0.04, y, 0.102] }, { outline: false });
  b.add('chest', G.cyl(0.07, 0.08, 0.05), BLACK, { p: [0, s.torso + 0.01, 0] });
  if (acc !== RED) b.add('chest', G.box(0.04, 0.28, 0.022), acc, { p: [0, 0.13, -0.095], r: [0, 0, -0.62] }, { outline: false });
  b.add('hips', G.cyl(0.11, 0.15, 0.13, 14), RED, { p: [0, -0.03, 0], s: [1, 1, 0.85] });
  b.add('hips', G.torus(0.112, 0.02), BLACK, { p: [0, 0.03, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.85, 1] });
  b.add('hips', G.box(0.05, 0.04, 0.02), GOLD, { p: [0, 0.03, 0.1] }, { outline: false });
  limbs(b, { sleeve: RED, glove: BLACK, pants: BLACK, boot: BLACK, sole: 0x3a2a20, cuff: GOLD });
  // 金穗肩章
  for (const sd of ['L', 'R'] as const) b.add(`arm${sd}`, G.sphere(0.06, 12, 8), GOLD, { p: [0, 0.005, 0], s: [1.1, 0.55, 1] });
  // 头：黑色影子皮肤 + 白面具（红眼缝）+ 红黑头盔 + 黑檐 + 金顶 + 羽饰
  const R = s.headR;
  b.add('head', G.sphere(R, 22, 16), BLACK);
  b.add('head', shell(R * 1.03, 1.05, 2.25, 1.15), MASK);
  for (const sx of [1, -1]) {
    const e = onSphere(R * 1.0, 1.42, sx * 0.38);
    b.add('head', G.sphere(0.05, 12, 8), 0x0b0a0e, { p: e.p, q: e.q, s: [1.25, 0.45, 0.5] }, { outline: false });
    const g = onSphere(R * 1.03, 1.42, sx * 0.38);
    b.add('head', G.sphere(0.022, 8, 6), 0xff3030, { p: g.p, q: g.q, s: [1.3, 0.4, 0.5] }, { outline: false });
    const m = onSphere(R * 1.035, 1.85, sx * 0.3);
    b.add('head', G.box(0.012, 0.06, 0.006), DRED, { p: m.p, q: m.q }, { outline: false }); // 面具红纹
  }
  b.add('head', new THREE.SphereGeometry(R * 1.09, 22, 10, 0, Math.PI * 2, 0, 1.12), DRED);
  b.add('head', G.torus(R * 1.0, 0.026), BLACK, { p: [0, Math.cos(1.12) * R * 1.09, 0], r: [Math.PI / 2, 0, 0] });
  b.add('head', G.box(0.03, 0.07, R * 1.5), BLACK, { p: [0, R * 1.1, -0.01] });
  b.add('head', G.cone(0.03, 0.07, 6), GOLD, { p: [0, R * 1.2, 0.0] });
  b.add('head', G.cone(0.055, 0.24, 8), acc === RED ? 0xff3a2a : acc, { p: [0, R * 1.22, -0.1], r: [-2.1, 0, 0], s: [0.55, 1, 1] }); // 马鬃羽饰（向后垂）
  // 长枪：木杆 + 银枪头 + 红缨
  b.add('weapon', G.cyl(0.016, 0.016, 1.0, 8), 0x6b4423, { p: [0, 0.22, 0] });
  b.add('weapon', G.cone(0.036, 0.15, 6), 0xd6dde6, { p: [0, 0.79, 0] });
  b.add('weapon', G.cone(0.04, 0.07, 8), RED, { p: [0, 0.69, 0], r: [Math.PI, 0, 0] });
  // 盾兵：左小臂挂盾
  if (role === 'shielder') {
    b.add('foreL', G.box(0.3, 0.36, 0.035), 0x8fb8ff, { p: [0.04, -0.07, 0.07] });
    b.add('foreL', G.box(0.06, 0.24, 0.04), GOLD, { p: [0.04, -0.07, 0.085] }, { outline: false });
  }
  return new ProcRig(b, { idle: 0, attack: Math.PI / 2 - 0.05 }, 'soldier');
}
