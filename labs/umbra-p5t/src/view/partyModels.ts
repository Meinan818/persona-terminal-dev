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

/** 贴在球面上、绕法线再转 tilt 的扁椭球零件（脸上五官用）：局部 x = 宽，y = 厚（沿法线），z = 高 */
function face(r: number, th: number, ph: number, tilt = 0) {
  const o = onSphere(r, th, ph);
  return { p: o.p, q: o.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(Y, tilt)) };
}

// ---------------- Skull ----------------
// 比例对齐 Joker GLB：身高约 1.1、头（含发）约占 30%，腿约 1/3
const SKULL: BodySpec = { height: 1.1, legLen: 0.36, torso: 0.29, headR: 0.155, neck: 0.165, shoulderX: 0.125, hipX: 0.062, upperArm: 0.155, foreArm: 0.14, outline: 0.009 };
export function makeSkull(): UnitRig {
  const b = new ChibiBuilder(SKULL), s = SKULL;
  const SKIN = 0xf2c6a0, HAIR = 0xf4d03a, JACKET = 0x1c1c22, PANTS = 0x24242c, RED = 0xd8141e, SCARF = 0xf6c200, WHITE = 0xf6f3ec, HOLE = 0x0a0a0e;
  // 躯干：黑皮夹克 + 立领 + 黄围巾
  b.add('chest', G.capsule(0.098, 0.15), JACKET, { p: [0, 0.14, 0], s: [1, 1, 0.8] });
  b.add('chest', G.box(0.024, 0.24, 0.02), 0x3a3a44, { p: [0, 0.13, 0.08] }, { outline: false }); // 拉链
  for (const sx of [1, -1]) b.add('chest', G.box(0.09, 0.08, 0.022), JACKET, { p: [sx * 0.058, s.torso - 0.01, 0.04], r: [-0.35, sx * 0.5, sx * 0.35] }); // 翻领
  b.add('chest', G.torus(0.062, 0.028), SCARF, { p: [0, s.torso - 0.005, 0], r: [Math.PI / 2, 0, 0] });
  b.add('chest', G.box(0.055, 0.15, 0.025), SCARF, { p: [0.04, s.torso - 0.08, 0.085], r: [0.2, 0, -0.25] }); // 垂下的围巾尾
  b.add('hips', G.cyl(0.085, 0.09, 0.1), PANTS, { p: [0, -0.01, 0], s: [1, 1, 0.85] });
  b.add('hips', G.torus(0.088, 0.012), 0x5a4a3a, { p: [0, 0.03, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.85, 1] }, { outline: false });
  limbs(b, { sleeve: JACKET, glove: RED, pants: PANTS, boot: 0x141418, sole: 0x55555e, cuff: RED, armR: 0.04, legR: 0.048 });
  for (const sd of ['L', 'R'] as const) b.add(`arm${sd}`, G.sphere(0.052, 12, 8), JACKET, { p: [0, -0.01, 0] }); // 垫肩
  // 头：皮肤 + 白色骷髅面具（额头到上唇）
  const R = s.headR;
  b.add('head', G.sphere(R, 24, 18), SKIN);
  b.add('head', shell(R * 1.04, 0.8, 1.98, 1.18), WHITE);
  // 眼窝：外黑大椭圆（外眼角上挑）+ 内一圈更深的洞，看起来有深度
  for (const sx of [1, -1]) {
    const e = face(R * 1.035, 1.3, sx * 0.42, sx * 0.38);
    b.add('head', G.sphere(1, 16, 10), HOLE, { ...e, s: [0.27 * R, 0.06 * R, 0.22 * R] }, { outline: false });
    const rim = face(R * 1.03, 1.3, sx * 0.42, sx * 0.38);
    b.add('head', G.sphere(1, 16, 10), 0x55504a, { ...rim, s: [0.31 * R, 0.05 * R, 0.26 * R] }, { outline: false });
  }
  // 倒三角鼻孔
  { const n = face(R * 1.045, 1.6, 0); b.add('head', G.cone(1, 1, 3), HOLE, { p: n.p, q: n.q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))), s: [0.09 * R, 0.13 * R, 0.03 * R] }, { outline: false }); }
  // 牙齿线：面具下缘一条黑横线 + 竖线分出 7 颗牙
  b.add('head', shell(R * 1.048, 1.8, 1.84, 0.62), HOLE, undefined, { outline: false });
  for (let i = -3; i <= 3; i++) { const t = face(R * 1.05, 1.82, i * 0.15); b.add('head', G.box(0.012 * R / 0.155 * 0.5, 0.004, 0.12 * R), HOLE, t, { outline: false }); }
  // 面具下的咧嘴笑
  { const m = face(R * 0.99, 2.12, 0); b.add('head', G.torus(0.3 * R, 0.05 * R, Math.PI), 0x5a1810, { p: m.p, r: [-0.6, 0, Math.PI] }, { outline: false }); }
  // 金色刺头：头顶发帽 + 一圈尖刺
  const u = 0.72;
  b.add('head', new THREE.SphereGeometry(R * 1.06, 22, 10, 0, Math.PI * 2, 0, 1.0), HAIR);
  b.add('head', new THREE.SphereGeometry(R * 1.05, 22, 10, Math.PI * 1.5 - 1.5, 3.0, 0.9, 1.45), HAIR); // 后脑
  const spikes: [number, number, number][] = [[0.15, 0, 0.13], [0.45, 0.2, 0.14], [0.45, -0.2, 0.14], [0.55, 0.9, 0.13], [0.55, -0.9, 0.13], [0.75, 1.6, 0.12], [0.75, -1.6, 0.12], [0.6, 2.4, 0.13], [0.6, -2.4, 0.13], [0.5, Math.PI, 0.14], [0.95, 2.9, 0.11], [0.95, -2.9, 0.11], [0.85, 0.5, 0.1], [0.85, -0.5, 0.1], [1.05, 1.2, 0.09], [1.05, -1.2, 0.09]];
  for (const [th, ph, h0] of spikes) { const h = h0 * u; const o = onSphere(R * 0.98, th, ph); b.add('head', G.cone(0.062 * u, h + 0.04 * u, 6), HAIR, { p: [o.p[0] + o.n.x * h * 0.5, o.p[1] + o.n.y * h * 0.5 + 0.015, o.p[2] + o.n.z * h * 0.5], q: o.q }); }
  // 铁管
  b.add('weapon', G.cyl(0.017, 0.017, 0.5, 8), 0x8d929c, { p: [0, 0.2, 0] });
  for (const y of [-0.04, 0.44]) b.add('weapon', G.cyl(0.023, 0.023, 0.04, 8), 0x5c6068, { p: [0, y, 0] });
  b.add('weapon', G.cyl(0.02, 0.02, 0.1, 8), 0x2a2a2e, { p: [0, 0.02, 0] }, { outline: false });
  return new ProcRig(b, { idle: -0.75, attack: 'follow' });
}

// ---------------- Mona ----------------
// 身高约 Joker 的 0.8（含耳朵），猫头仍然偏大
const MONA: BodySpec = { height: 0.88, legLen: 0.14, torso: 0.15, headR: 0.2, neck: 0.18, shoulderX: 0.088, hipX: 0.05, upperArm: 0.072, foreArm: 0.066, outline: 0.009 };
export function makeMona(): UnitRig {
  const b = new ChibiBuilder(MONA), s = MONA;
  const BLACK = 0x17171d, WHITE = 0xf6f4ee, YEL = 0xf5c400, BLUE = 0x2f8cff, DBLUE = 0x0d2a6a;
  b.add('chest', G.capsule(0.075, 0.05), BLACK, { p: [0, 0.075, 0], s: [1, 1, 0.9] });
  b.add('chest', G.sphere(0.06, 14, 10), WHITE, { p: [0, 0.07, 0.04], s: [0.85, 1.15, 0.7] }, { outline: false }); // 白肚
  b.add('chest', G.torus(0.06, 0.029), YEL, { p: [0, s.torso + 0.005, 0], r: [Math.PI / 2, 0, 0] }); // 黄领巾
  b.add('chest', G.cone(0.06, 0.1, 3), YEL, { p: [0, s.torso - 0.045, -0.06], r: [-0.35, 0, Math.PI], s: [1, 1, 0.35] });
  b.add('hips', G.cyl(0.073, 0.078, 0.06), BLACK, { p: [0, -0.005, 0] });
  b.add('hips', G.torus(0.076, 0.017), YEL, { p: [0, 0.025, 0], r: [Math.PI / 2, 0, 0] }); // 黄腰带
  b.add('hips', G.box(0.043, 0.034, 0.018), 0xc89a10, { p: [0, 0.025, 0.078] });
  limbs(b, { sleeve: BLACK, glove: WHITE, pants: BLACK, boot: WHITE, armR: 0.031, legR: 0.036 });
  b.add('tail', G.capsule(0.019, 0.14), BLACK, { p: [0, 0.025, -0.085], r: [-1.1, 0, 0] });
  b.add('tail', G.capsule(0.017, 0.1), BLACK, { p: [0, 0.14, -0.16], r: [-0.25, 0, 0] });
  // 大圆黑头 + 白口鼻
  const R = s.headR, u = R / 0.25;
  b.add('head', G.sphere(R, 26, 18), BLACK, { s: [1.04, 0.96, 1] });
  b.add('head', G.sphere(0.13 * u, 18, 12), WHITE, { p: [0, -0.09 * u, R * 0.6], s: [1.4, 0.7, 0.78] });
  // 眼睛：黑眼眶 → 白眼 → 蓝虹膜 → 深蓝瞳 → 两点高光（一大一小），往外略斜
  for (const sx of [1, -1]) {
    const tilt = -sx * 0.18;
    b.add('head', G.sphere(1, 18, 12), 0x050507, { ...face(R * 1.0, 1.36, sx * 0.4, tilt), s: [0.3 * R, 0.08 * R, 0.37 * R] }, { outline: false });
    b.add('head', G.sphere(1, 18, 12), WHITE, { ...face(R * 1.02, 1.36, sx * 0.4, tilt), s: [0.255 * R, 0.07 * R, 0.32 * R] }, { outline: false });
    b.add('head', G.sphere(1, 16, 12), BLUE, { ...face(R * 1.04, 1.4, sx * 0.37, tilt), s: [0.19 * R, 0.06 * R, 0.25 * R] }, { outline: false });
    b.add('head', G.sphere(1, 14, 10), DBLUE, { ...face(R * 1.055, 1.42, sx * 0.36, tilt), s: [0.1 * R, 0.05 * R, 0.15 * R] }, { outline: false });
    b.add('head', G.sphere(1, 10, 8), 0xffffff, { ...face(R * 1.075, 1.31, sx * 0.33), s: [0.065 * R, 0.04 * R, 0.075 * R] }, { outline: false });
    b.add('head', G.sphere(1, 8, 6), 0xffffff, { ...face(R * 1.07, 1.5, sx * 0.4), s: [0.03 * R, 0.03 * R, 0.035 * R] }, { outline: false });
    // 耳朵
    const ea = onSphere(R * 0.82, 0.62, sx * 1.15);
    b.add('head', G.cone(0.095 * u, 0.2 * u, 10), BLACK, { p: [ea.p[0] + ea.n.x * 0.1 * u, ea.p[1] + ea.n.y * 0.1 * u, ea.p[2] + ea.n.z * 0.1 * u], q: ea.q, s: [1, 1, 0.6] });
    b.add('head', G.cone(0.055 * u, 0.12 * u, 8), 0x45404e, { p: [ea.p[0] + ea.n.x * 0.1 * u, ea.p[1] + ea.n.y * 0.1 * u - 0.004, ea.p[2] + ea.n.z * 0.1 * u + 0.024], q: ea.q, s: [1, 1, 0.3] }, { outline: false });
  }
  // 粉鼻头 + ω 小嘴
  const mz = R * 0.6 + 0.13 * u * 0.78; // 口鼻前表面 z
  b.add('head', G.sphere(0.024 * u, 10, 8), 0xe0607a, { p: [0, -0.06 * u, mz - 0.004], s: [1.3, 0.85, 0.8] }, { outline: false });
  for (const sx of [1, -1]) b.add('head', G.torus(0.017 * u, 0.0042 * u, Math.PI), 0x111116, { p: [sx * 0.017 * u, -0.088 * u, mz - 0.006], r: [-0.25, 0, Math.PI] }, { outline: false });
  b.add('head', G.box(0.004 * u, 0.022 * u, 0.004), 0x111116, { p: [0, -0.074 * u, mz - 0.002] }, { outline: false });
  // 弯刀：银色弧刃 + 金护手 + 棕柄
  const sh = new THREE.Shape();
  sh.moveTo(-0.022, 0.05); sh.quadraticCurveTo(-0.03, 0.26, 0.05, 0.42); sh.quadraticCurveTo(0.07, 0.25, 0.022, 0.05); sh.closePath();
  const blade = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false, curveSegments: 10 });
  blade.translate(0, 0, -0.006);
  b.add('weapon', blade, 0xdfe6f0, { s: [1.15, 0.95, 1.4] });
  b.add('weapon', G.box(0.09, 0.018, 0.028), 0xd8a820, { p: [0, 0.04, 0] });
  b.add('weapon', G.cyl(0.013, 0.013, 0.08, 8), 0x6b3f1f, { p: [0, -0.005, 0] });
  return new ProcRig(b, { idle: 0.55, attack: 'follow' });
}

// ---------------- Marie 军卫兵（Shadow） ----------------
// 暗色化：黑军装 + 暗红饰边、细长身形、白骨面具红眼发光（P5 Shadow 感，不再像玩具兵）
const SOLDIER: BodySpec = { height: 1.12, legLen: 0.37, torso: 0.3, headR: 0.15, neck: 0.165, shoulderX: 0.118, hipX: 0.055, upperArm: 0.165, foreArm: 0.15, outline: 0.009 };
const ROLE_ACCENT: Record<string, number> = { revenger: 0xb0207e, shielder: 0x2a5cb0, teleporter: 0x1f9a90, launcher: 0xb07a14, supporter: 0x2c9038 };
export function makeShadow(role?: string): UnitRig {
  const b = new ChibiBuilder(SOLDIER), s = SOLDIER;
  const COAT = 0x16121a, TRIM = 0x9a0e18, DRED = 0x5a0810, BLACK = 0x0c0a0e, GOLD = 0xa88430, MASK = 0xe6e0d4, EYE = 0xff2a1a;
  const acc = ROLE_ACCENT[role ?? ''] ?? TRIM;
  // 黑长军装（腰部收窄）+ 暗红斜挎带 + 暗金纽扣 + 红立领
  b.add('chest', G.capsule(0.085, 0.17), COAT, { p: [0, 0.14, 0], s: [1, 1, 0.78] });
  b.add('chest', G.box(0.028, 0.3, 0.018), acc, { p: [0, 0.13, 0.068], r: [0, 0, 0.55] }, { outline: false });
  for (const y of [0.05, 0.11, 0.17, 0.23]) b.add('chest', G.sphere(0.009, 6, 4), GOLD, { p: [-0.03, y, 0.07] }, { outline: false });
  b.add('chest', G.cyl(0.055, 0.065, 0.05), TRIM, { p: [0, s.torso + 0.0, 0] });
  // 燕尾下摆：向下张开的长衣摆
  b.add('hips', G.cyl(0.085, 0.12, 0.22, 14), COAT, { p: [0, -0.08, -0.005], s: [1, 1, 0.8] });
  b.add('hips', G.cyl(0.121, 0.122, 0.02, 14), TRIM, { p: [0, -0.185, -0.005], s: [1, 1, 0.8] }, { outline: false });
  b.add('hips', G.torus(0.086, 0.014), TRIM, { p: [0, 0.03, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.8, 1] });
  limbs(b, { sleeve: COAT, glove: BLACK, pants: BLACK, boot: BLACK, sole: 0x2a1a18, cuff: TRIM, armR: 0.034, legR: 0.04 });
  for (const sd of ['L', 'R'] as const) b.add(`arm${sd}`, G.sphere(0.048, 12, 8), DRED, { p: [0, 0.005, 0], s: [1.15, 0.5, 1] }); // 肩章
  // 头：黑影皮肤 + 白骨面具（尖下巴）+ 红纹 + 发光红眼
  const R = s.headR;
  b.add('head', G.sphere(R, 22, 16), BLACK);
  b.add('head', shell(R * 1.04, 1.0, 2.3, 1.1), MASK);
  b.add('head', G.cone(0.05, 0.07, 6), MASK, { p: [0, -R * 0.95, R * 0.42], r: [Math.PI + 0.35, 0, 0], s: [1.3, 1, 0.6] }); // 尖下巴
  for (const sx of [1, -1]) {
    const e = face(R * 1.035, 1.5, sx * 0.38, sx * 0.45);
    b.add('head', G.sphere(1, 12, 8), 0x050406, { ...e, s: [0.3 * R, 0.06 * R, 0.13 * R] }, { outline: false });
    const g = face(R * 1.06, 1.5, sx * 0.38, sx * 0.45);
    b.glow('head', new THREE.SphereGeometry(1, 10, 6), EYE, { ...g, s: [0.19 * R, 0.04 * R, 0.06 * R] }, 1.9); // 发光眼缝 + 加色光晕
    const m = face(R * 1.045, 1.85, sx * 0.3, sx * 0.2);
    b.add('head', G.box(0.012, 0.004, 0.07), TRIM, m, { outline: false }); // 面具红纹
  }
  // 黑色高筒头盔 + 暗红帽檐带 + 暗红马鬃
  b.add('head', new THREE.CylinderGeometry(R * 0.95, R * 1.08, R * 1.1, 18), BLACK, { p: [0, R * 0.92, -0.005] });
  b.add('head', G.torus(R * 1.07, 0.016), TRIM, { p: [0, R * 0.45, -0.005], r: [Math.PI / 2, 0, 0] });
  b.add('head', G.box(R * 1.2, 0.02, 0.08), BLACK, { p: [0, R * 0.4, R * 0.98], r: [0.35, 0, 0] }); // 前檐
  b.add('head', G.cone(0.025, 0.06, 6), GOLD, { p: [0, R * 1.52, 0] });
  b.add('head', G.cone(0.05, 0.26, 8), acc === TRIM ? DRED : acc, { p: [0, R * 1.47, -0.11], r: [-2.15, 0, 0], s: [0.5, 1, 1] });
// 长枪：木杆 + 银枪头 + 红缨
  b.add('weapon', G.cyl(0.013, 0.013, 1.05, 8), 0x2a1a12, { p: [0, 0.24, 0] });
  b.add('weapon', G.cone(0.03, 0.17, 4), 0xb8c0cc, { p: [0, 0.84, 0] });
  b.add('weapon', G.cone(0.032, 0.06, 8), TRIM, { p: [0, 0.73, 0], r: [Math.PI, 0, 0] });
  // 盾兵：左小臂挂盾
  if (role === 'shielder') {
    b.add('foreL', G.box(0.26, 0.34, 0.03), 0x24202a, { p: [0.04, -0.07, 0.06] });
    b.add('foreL', G.box(0.05, 0.22, 0.036), acc, { p: [0.04, -0.07, 0.075] }, { outline: false });
  }
  return new ProcRig(b, { idle: 0, attack: Math.PI / 2 - 0.05 }, 'soldier');
}
