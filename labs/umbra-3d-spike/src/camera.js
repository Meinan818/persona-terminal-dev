// 镜头编排：战斗事件 → 镜头动作（硬切 / 推拉 / 甩镜 / 荷兰角 / 震屏 / 冲击变焦）。
// 纯函数：给定事件日志和时间 T，算出机位，所以固定 t 截图和实时播放结果一致。
// 节奏参考 108245：开场低机位绕场 ~2.5s → 切指令菜单（0.35s 快推）→ 选定后 0.3s 甩镜 → 出招跟拍带倾斜 → 命中顿帧+震屏 → 拉远收尾。
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const EASE = {
  lin: (x) => x,
  inOut: (x) => x * x * (3 - 2 * x),
  outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outBack: (x) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
const cl = (x) => Math.max(0, Math.min(1, x));
const noise = (t, s) => Math.sin(t * 37.1 + s) * 0.5 + Math.sin(t * 61.7 + s * 2.3) * 0.3 + Math.sin(t * 97.3 + s * 4.1) * 0.2;

/** 机位：{pos, tgt, fov, roll(弧度)} */
function pose(pos, tgt, fov = 50, roll = 0) { return { pos, tgt, fov, roll }; }
function lerpPose(a, b, k) { return pose(a.pos.clone().lerp(b.pos, k), a.tgt.clone().lerp(b.tgt, k), a.fov + (b.fov - a.fov) * k, a.roll + (b.roll - a.roll) * k); }
/** 甩镜插值：绕相机位置转视线（而不是直线移动目标点），转速大 → 方向模糊 */
function whipPose(a, b, k) {
  const p = a.pos.clone().lerp(b.pos, k);
  const da = a.tgt.clone().sub(a.pos).normalize(), db = b.tgt.clone().sub(b.pos).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(da, db); const qk = new THREE.Quaternion().slerp(q, k);
  const dist = a.tgt.distanceTo(a.pos) * (1 - k) + b.tgt.distanceTo(b.pos) * k;
  return pose(p, p.clone().add(da.applyQuaternion(qk).multiplyScalar(dist)), a.fov + (b.fov - a.fov) * k, a.roll + (b.roll - a.roll) * k);
}

// —— 机位库（对过参考帧：idle≈f017、menu≈f029、attack≈f033）——
export const FRAMINGS = {
  // 开场：绕敌群低机位环拍，T=1.2 时落在 f017 构图
  intro: (lt) => { const piv = V(2.9, 0.95, -1.8); const a = -0.085 + (1.2 - lt) * 0.13; const r = 4.12 - lt * 0.06; return pose(V(piv.x + Math.sin(a) * r, 0.62 + lt * 0.015, piv.z + Math.cos(a) * r), piv, 50); },
  menuFar: () => pose(V(-1.7, 2.0, 9.2), V(1.4, 0.85, 0.0), 52),
  menu: (lt) => pose(V(-1.05 - lt * 0.05, 1.62, 7.35), V(1.6, 0.85, 0.1), 50, 0.0),
  whipMid: () => pose(V(-0.7, 1.45, 6.6), V(4.6, 1.0, -0.6), 50, -0.12),
  attack: (lt, ctx) => {
    const k = EASE.inOut(cl((lt - 0.2) / 1.0)) * 0.4;
    const p = V(-0.3, 1.3, 5.7).lerp(V(0.1, 1.2, 4.9), k), t = V(2.0, 0.9, 0.2).lerp(V(2.4, 0.95, -0.4), k);
    return pose(p, t, 52, -0.07 * (1 - cl((lt - 1.4) / 0.4)));
  },
  wide: (lt) => pose(V(-3.4 - lt * 0.15, 2.2 + lt * 0.05, 7.6 + lt * 0.2), V(1.4, 0.9, -0.4), 48, 0.02),
};

// —— 事件 → 镜头动作（改这张表就能改编排）——
// type: cut=硬切；push=从 from 机位推到 to；whip=甩镜；hold=沿用当前机位只叠特效
export const CHOREO = {
  'battle:start': { type: 'cut', to: 'intro' },
  'turn:menu': { type: 'push', from: 'menuFar', to: 'menu', dur: 0.35, ease: 'outExpo' },
  'cmd:confirm': { type: 'whip', via: 'whipMid', to: 'attack', toAt: 0, dur: 0.3, ease: 'inOutCubic' },
  'attack:launch': { type: 'cut', to: 'attack', localFrom: 0 },
  'attack:hit': { type: 'hold', shake: { amp: 0.045, dur: 0.38 }, punch: { fov: -5, dur: 0.16 }, roll: { amt: 0.05, dur: 0.3 } },
  'attack:end': { type: 'push', from: 'current', to: 'wide', dur: 0.8, ease: 'outExpo' },
};

export class Director {
  constructor(events, framings = FRAMINGS, choreo = CHOREO) { this.ev = events.slice().sort((a, b) => a.t - b.t); this.F = framings; this.C = choreo; }
  /** 某事件的「主机位动作」（hold 不改机位）在 T 时刻的机位 */
  base(T, ctx, depth = 0) {
    let idx = -1; for (let i = 0; i < this.ev.length; i++) if (this.ev[i].t <= T && this.C[this.ev[i].name] && this.C[this.ev[i].name].type !== 'hold') idx = i;
    if (idx < 0) return this.F.intro(T, ctx);
    const e = this.ev[idx], c = this.C[e.name], lt = T - e.t;
    // 镜头内本地时间：attack 机位用出招时间轴（launch 之前的甩镜按 toAt 取样）
    const F = (name, l) => this.F[name](l, ctx);
    if (c.type === 'cut') return F(c.to, lt);
    if (c.type === 'push') {
      const k = EASE[c.ease || 'inOut'](cl(lt / c.dur));
      const from = c.from === 'current' ? (depth < 2 ? this.base(e.t - 1e-4, ctx, depth + 1) : F(c.to, 0)) : F(c.from, 0);
      return lerpPose(from, F(c.to, lt), k);
    }
    if (c.type === 'whip') {
      const from = depth < 2 ? this.base(e.t - 1e-4, ctx, depth + 1) : F(c.to, 0);
      const to = F(c.to, c.toAt ?? 0);
      const k = EASE[c.ease || 'inOutCubic'](cl(lt / c.dur));
      if (c.via) { const mid = F(c.via, 0); return k < 0.5 ? whipPose(from, mid, k * 2) : whipPose(mid, to, (k - 0.5) * 2); }
      return whipPose(from, to, k);
    }
    return F('intro', T);
  }
  evaluate(T, ctx = {}) {
    const p = this.base(T, ctx);
    let fxShake = 0, fov = p.fov, roll = p.roll;
    for (const e of this.ev) {
      const c = this.C[e.name]; if (!c || e.t > T) continue; const lt = T - e.t;
      if (c.shake && lt < c.shake.dur) fxShake = Math.max(fxShake, c.shake.amp * Math.pow(1 - lt / c.shake.dur, 2));
      if (c.punch && lt < c.punch.dur * 3) { const k = lt < c.punch.dur ? EASE.outExpo(lt / c.punch.dur) : 1 - EASE.inOut((lt - c.punch.dur) / (c.punch.dur * 2)); fov += c.punch.fov * k; }
      if (c.roll && lt < c.roll.dur) roll += c.roll.amt * Math.sin(lt / c.roll.dur * Math.PI);
    }
    const pos = p.pos.clone(), tgt = p.tgt.clone();
    if (fxShake > 0) { pos.x += noise(T, 1) * fxShake; pos.y += noise(T, 7) * fxShake * 0.7; tgt.x += noise(T, 3) * fxShake * 0.5; }
    return { pos, tgt, fov, roll, shake: fxShake };
  }
  /** 应用到相机；返回给后处理的方向模糊（按视线角速度） */
  apply(camera, T, ctx, dt = 1 / 60) {
    const a = this.evaluate(T, ctx), b = this.evaluate(Math.max(0, T - dt), ctx);
    camera.position.copy(a.pos); camera.fov = a.fov; camera.updateProjectionMatrix(); camera.lookAt(a.tgt);
    camera.rotateZ(a.roll); camera.updateMatrixWorld();
    // 角速度 → 屏幕方向模糊（只在同一镜头内连续运动时生效，硬切不算）
    const da = a.tgt.clone().sub(a.pos).normalize(), db = b.tgt.clone().sub(b.pos).normalize();
    const cut = a.pos.distanceTo(b.pos) > 0.6;
    const yaw = cut ? 0 : Math.atan2(da.x, da.z) - Math.atan2(db.x, db.z);
    const blurX = Math.max(-0.06, Math.min(0.06, yaw * 0.9));
    return { blurX: Math.abs(blurX) > 0.004 ? blurX : 0, shake: a.shake };
  }
}
