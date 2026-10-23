// 敌人 AI v1 —— 严格照 umbra-assets/specs/ENEMY-AI.md（Hark 定的打分权重，Codex/引擎不改数）。
// 行为出处：Cogito AAA115 敌人类型 / Gamer Guides（盾兵转向）。权重表见下方常量 W，每条都对应规格里的一行。
//  0. 流程：离我方最近的先动、Boss 最后；跳过 KO/不能行动/未解锁区域/idle 未唤醒；对「可到达格 × 动作」打分取最高；
//     同分取离当前位置近的，再同分取 x 小、y 小（可复现）；打倒我方 → 敌方 1 MORE 重算。
import type { Battle } from './battle';
import { DIRS, add, eq, key, manhattan, pointInTriangle, supercover } from './grid';
import type { Intent, SkillDef, Unit, Vec } from './types';

const PLAYER = 'ally' as const;
/** launcher 投掷距离上限（沿用 1c 版的 6 格；规格没写，PH） */
const LAUNCH_RANGE = 6;

/** ENEMY-AI.md 的全部权重（不要改数；觉得不对写「待 Hark 决定」） */
export const W = {
  // 1. 行动分
  kill: 100, down: 60, normalBase: 30, normalDmg: 20,
  focus: 15, lowHp: 10, lowHpRatio: 0.4, aiTarget: 40, decoy: 25, downed: -20, push: 20,
  healBase: 40, healScale: 40, healBelow: 0.5, healBoss: 20, buff: 25, buffRange: 2,
  // 2. 站位分
  fullCover: 18, halfCover: 10, exposed: -25, triangle: -15, perLevel: 6,
  kite: 12, kiteClose: -12, kiteCloseDist: 2, flank: 15, buddy: 4, buddyMax: 8,
  // 3. 角色修正
  shooterNoTargetMult: 1.5, revenge: 30, shieldLine: 20, teleFlank: 20,
  launchIsolate: 50, launchBuddy: 35, supporterReach: -40,
  bossLeash: 3, bossBuddy: 10, bossFleeBelow: 0.3, bossExposed: -50,
  // 0. 唤醒
  wakeDist: 8,
} as const;

// ---------- 唤醒（idle → alert，整局不回退） ----------
/** 我方进入 8 格曼哈顿距离且有视线 → 唤醒 */
function wakeBySight(b: Battle, e: Unit) {
  if (e.alert) return;
  if (b.mainAllies().some((a) => manhattan(a.pos, e.pos) <= W.wakeDist && b.grid.lineOfSight(a.pos, e.pos))) e.alert = true;
}
/** 由 Battle 调用：区域刚解锁 → 该区敌人唤醒 */
export function wakeZone(b: Battle, z: string) {
  for (const e of b.alive('enemy')) if (e.zone === z) e.alert = true;
}
/** 由 Battle 调用：敌人被攻击 → 它和同区敌人唤醒（无区域系统 = 全图同区） */
export function wakeOnHit(b: Battle, t: Unit, by: Unit | null) {
  if (t.side !== 'enemy') return;
  t.alert = true;
  if (by && by.side === PLAYER) t.lastAttacker = by.id;
  const z = t.zone ?? b.zoneOf(t.pos);
  for (const o of b.alive('enemy')) if ((o.zone ?? b.zoneOf(o.pos)) === z) o.alert = true;
}

const isBoss = (e: Unit) => !!(e.isTarget || e.isLeader);
const meleeOnly = (e: Unit) => e.role === 'brute' || e.role === 'revenger' || !!e.protected;
const gunOnly = (e: Unit) => e.role === 'shooter' || e.role === 'shielder';

function reachTiles(b: Battle, e: Unit): Map<string, { pos: Vec; dist: number }> {
  const r = b.grid.reachable(e.pos, b.moveRange(e), b.blockedFor(e), b.occupiedSet(e), true, b.afterDash(e));
  const spawn = spawnOf(b, e);
  const out = new Map<string, { pos: Vec; dist: number }>();
  for (const [k, n] of r) {
    if (n.dist < 0) continue;
    if (e.staysInZone && b.zoneOf(n.pos) !== e.staysInZone) continue; // staysInZone：不允许离开该区
    if (isBoss(e) && (e.bossPhase ?? 1) === 1 && manhattan(n.pos, spawn) > W.bossLeash) continue; // Boss 阶段 1 不离开出生点 3 格
    out.set(k, { pos: n.pos, dist: n.dist });
  }
  return out;
}

const spawns = new WeakMap<Battle, Map<string, Vec>>();
function spawnOf(b: Battle, e: Unit): Vec {
  let m = spawns.get(b);
  if (!m) { m = new Map(); spawns.set(b, m); }
  if (!m.has(e.id)) m.set(e.id, { ...e.pos });
  return m.get(e.id)!;
}

function attackRange(b: Battle, e: Unit) {
  const sk = e.skills.filter((s) => s.kind === 'attack').map((s) => s.range);
  return Math.max(1, b.gunRange(e), ...sk);
}

/** 选目标（意图显示/盾兵转向用）：aiTarget 优先；protected 只按距离；否则最近（诱饵视为更近、已倒地视为更远） */
function nearestFoe(b: Battle, e: Unit): Unit | null {
  if (e.aiTarget) { const t = b.alive(PLAYER).find((a) => a.id === e.aiTarget); if (t) return t; }
  let best: Unit | null = null, bd = Infinity;
  for (const a of b.alive(PLAYER)) {
    let d = manhattan(e.pos, a.pos);
    if (!e.protected) { if (a.decoy) d -= 4; if (a.downed) d += 6; }
    if (d < bd || (d === bd && best && (a.pos.x < best.pos.x || (a.pos.x === best.pos.x && a.pos.y < best.pos.y)))) { bd = d; best = a; }
  }
  return best;
}

export function computeIntents(b: Battle): Intent[] {
  return b.alive('enemy').filter((e) => !b.isDormant(e)).map((e) => {
    const target = nearestFoe(b, e);
    const moveTiles = [...reachTiles(b, e).values()].map((n) => n.pos);
    const threat = new Map<string, Vec>();
    const range = attackRange(b, e);
    for (const m of moveTiles) {
      for (let dx = -range; dx <= range; dx++) for (let dy = -range; dy <= range; dy++) {
        const p = { x: m.x + dx, y: m.y + dy };
        const d = Math.abs(dx) + Math.abs(dy);
        if (d === 0 || d > range || !b.grid.inBounds(p) || b.grid.tile(p) === 'wall') continue;
        if (d > 1 && !b.grid.lineOfSight(m, p) && !e.skills.length) continue;
        threat.set(key(p), p);
      }
    }
    return { enemyId: e.id, targetId: target?.id ?? null, moveTiles, threatTiles: [...threat.values()] };
  });
}

/** 本次敌方阶段被打过的我方（集火） */
const focus = new WeakMap<Battle, Set<string>>();

/** 行动顺序：离我方最近的先动；Boss 最后；同距按 x、y */
function order(b: Battle, list: Unit[]): Unit[] {
  const allies = b.alive(PLAYER);
  const d = (e: Unit) => (allies.length ? Math.min(...allies.map((a) => manhattan(a.pos, e.pos))) : 0);
  return [...list].sort((p, q) => Number(isBoss(p)) - Number(isBoss(q)) || d(p) - d(q) || p.pos.x - q.pos.x || p.pos.y - q.pos.y);
}

export function runEnemyTurn(b: Battle) {
  focus.set(b, new Set());
  for (const e of b.alive('enemy')) spawnOf(b, e);
  for (const e of order(b, b.alive('enemy'))) {
    if (b.phase !== 'enemy') return;
    if (e.ko || b.noAction.has(e.id) || b.isDormant(e)) continue;
    wakeBySight(b, e);
    if (!e.alert) continue;
    if (e.role === 'shielder') faceTarget(b, e);
    const cap = Math.min(b.opts.enemyChainCap, b.alive(PLAYER).length + 1);
    for (let chain = 0; chain <= cap; chain++) {
      if (e.ko || b.phase !== 'enemy') break;
      e.anchor = { ...e.pos };
      const downed = enemyAct(b, e);
      if (b.checkEnd()) return;
      if (!downed || !b.opts.enemyOneMore || e.ko) break;
      b.emit({ type: 'oneMore', unitId: e.id });
    }
    e.lastAttacker = undefined; // revenger 的 +30 只在「被打后的下个敌方回合」
    if (e.role === 'shielder' && !e.ko) faceTarget(b, e);
  }
}

function faceTarget(b: Battle, e: Unit) {
  const t = nearestFoe(b, e);
  if (t) { e.facing = b.dirFrom(e.pos, t.pos); b.emit({ type: 'shieldTurn', unitId: e.id, facing: e.facing }); }
}

type Plan =
  | { kind: 'melee' | 'gun'; pos: Vec; target: Unit; score: number; dist: number }
  | { kind: 'skill'; pos: Vec; target: Unit; skill: SkillDef; score: number; dist: number }
  | { kind: 'heave'; pos: Vec; throws: { victim: Unit; dest: Vec }[]; score: number; dist: number }
  | { kind: 'none'; pos: Vec; score: number; dist: number };

/** 近战把 t 往 d 方向推：推下高台 / 推向油桶 / 推向别的单位 */
function pushUseful(b: Battle, t: Unit, d: Vec): boolean {
  let cur = t.pos;
  for (let i = 0; i < 4; i++) {
    const n = add(cur, d);
    if (b.unitAt(n)) return true;
    if (!b.grid.walkable(n) || b.grid.h(n) > b.grid.h(cur)) return false;
    if (b.grid.h(n) < b.grid.h(cur)) return true;
    cur = n;
  }
  return false;
}

/** m 是否在目标 t 的侧面或背后（相对 t 紧贴的掩体方向）；t 没贴掩体 → false */
function flanks(b: Battle, t: Unit, m: Vec): boolean {
  const covers = DIRS.filter((d) => b.grid.coverAt(add(t.pos, d)) > 0 || b.grid.h(add(t.pos, d)) > b.grid.h(t.pos));
  if (!covers.length) return false;
  return covers.every((d) => (m.x - t.pos.x) * d.x + (m.y - t.pos.y) * d.y <= 0);
}

/** 我方某人下回合能走到并打到 m */
function threatenedBy(b: Battle, m: Vec): Unit[] {
  return b.mainAllies().filter((a) => manhattan(a.pos, m) <= b.moveRange(a) + Math.max(1, b.gunRange(a)));
}

/** 站位分 */
function positionScore(b: Battle, e: Unit, m: Vec, hasTargetInRange: boolean): number {
  if (e.protected) return 0; // 被操控的龙司：无视站位分
  let s = 0;
  const cover = b.grid.hasAnyCover(m);
  if (e.role !== 'shielder') s += cover === 2 ? W.fullCover : cover === 1 ? W.halfCover : 0;
  const threats = threatenedBy(b, m);
  if (threats.length && !cover) s += isBoss(e) && e.hp < e.maxHp * W.bossFleeBelow ? W.bossExposed : W.exposed;
  const main = b.mainAllies();
  if (main.length >= 3) {
    const near = main.filter((a) => threats.includes(a));
    if (near.length >= 3 && pointInTriangle(m, near[0].pos, near[1].pos, near[2].pos)) s += W.triangle;
  }
  const dh = b.grid.h(m) - b.grid.h(e.pos);
  if (dh > 0) s += dh * W.perLevel;
  if (e.role === 'shooter') {
    const foes = b.alive(PLAYER);
    if (foes.length) {
      const d = Math.min(...foes.map((a) => manhattan(a.pos, m)));
      const r = b.gunRange(e);
      if (d <= W.kiteCloseDist) s += W.kiteClose;
      else if (d >= r - 1 && d <= r) s += W.kite;
    }
  }
  const buddies = b.alive('enemy').filter((o) => o !== e && manhattan(o.pos, m) === 1).length;
  if (isBoss(e)) { if (buddies) s += W.bossBuddy; } else s += Math.min(W.buddyMax, buddies * W.buddy);
  if (e.role === 'shielder') {
    const ward = b.units.find((u) => !u.ko && u !== e && ((u.side === 'enemy' && isBoss(u)) || (u.prop === 'flag' && u.flagSide === 'enemy')));
    const foe = nearestFoe(b, e);
    if (ward && foe && supercover(ward.pos, foe.pos).some((c) => eq(c, m))) s += W.shieldLine;
  }
  if (e.role === 'supporter' && b.mainAllies().some((a) => a.melee > 0 && manhattan(a.pos, m) <= b.moveRange(a) + 1)) s += W.supporterReach;
  if (e.role === 'shooter' && !hasTargetInRange) s *= W.shooterNoTargetMult;
  return s;
}

/** 行动分：攻击 */
function attackScore(b: Battle, e: Unit, t: Unit, amount: number, willDown: boolean, from: Vec, melee: boolean): number {
  let s = amount >= t.hp ? W.kill : willDown ? W.down : W.normalBase + (amount / t.maxHp) * W.normalDmg;
  if (focus.get(b)?.has(t.id)) s += W.focus;
  if (t.hp < t.maxHp * W.lowHpRatio) s += W.lowHp;
  if (e.aiTarget === t.id) s += W.aiTarget;
  if (t.decoy) s += W.decoy;
  if (t.downed) s += W.downed;
  if (melee && pushUseful(b, t, b.dirFrom(from, t.pos))) s += W.push;
  if (e.role === 'revenger' && e.lastAttacker === t.id) s += W.revenge;
  if (melee && flanks(b, t, from)) s += W.flank;
  if (e.role === 'teleporter' && (t.guard || b.grid.hasAnyCover(t.pos)) && flanks(b, t, from)) s += W.teleFlank;
  return s;
}

function better(a: Plan, c: Plan): boolean {
  if (a.score !== c.score) return a.score > c.score;
  if (a.dist !== c.dist) return a.dist < c.dist;
  if (a.pos.x !== c.pos.x) return a.pos.x < c.pos.x;
  return a.pos.y < c.pos.y;
}

/** 一次移动+行动；返回是否打倒了我方 */
function enemyAct(b: Battle, e: Unit): boolean {
  const all = b.alive(PLAYER);
  if (!all.length) return false;
  const forced = e.aiTarget ? all.find((a) => a.id === e.aiTarget) : undefined;
  const nearest = nearestFoe(b, e);
  // protected：选目标只按距离；aiTarget：强制只打它
  const foes = forced ? [forced] : e.protected && nearest ? [nearest] : all;
  const canAttack = !b.noAttack.has(e.id);
  const reach = reachTiles(b, e);
  // protected 会冲出来：用到最近目标的路径距离推进（规格「无视站位分（会冲出来）」）
  const rush = e.protected && nearest ? b.grid.reachable(nearest.pos, 999, b.blockedFor(e), new Set(), true, 999) : null;
  let best: Plan | null = null;
  let heaveBest: Plan | null = null;
  const consider = (p: Plan) => { if (!best || better(p, best)) best = p; };
  const anyInRange = [...reach.values()].some(({ pos }) => foes.some((t) => b.canShoot(e, t, pos)));
  for (const { pos: m, dist } of reach.values()) {
    const ps = positionScore(b, e, m, anyInRange);
    const rushScore = rush ? -(rush.get(key(m))?.dist ?? 999) : 0;
    consider({ kind: 'none', pos: m, score: ps + rushScore, dist });
    if (!canAttack) continue;
    for (const t of foes) {
      if (!gunOnly(e) && e.role !== 'launcher' && b.canMelee(e, t, m)) {
        const pv = b.previewDamage(e, t, 'melee', undefined, m);
        if (!pv.miss) consider({ kind: 'melee', pos: m, target: t, score: ps + rushScore + attackScore(b, e, t, pv.amount, pv.willDown, m, true), dist });
      }
      if (!meleeOnly(e) && b.canShoot(e, t, m)) {
        const pv = b.previewDamage(e, t, 'gun', undefined, m);
        if (!pv.miss) consider({ kind: 'gun', pos: m, target: t, score: ps + rushScore + attackScore(b, e, t, pv.amount, pv.willDown, m, false), dist });
      }
      if (!gunOnly(e) && !meleeOnly(e)) for (const s of e.skills) {
        if (s.kind !== 'attack' || !b.canSkill(e, s, t, m)) continue;
        const pv = b.previewDamage(e, t, 'skill', s, m);
        consider({ kind: 'skill', pos: m, target: t, skill: s, score: ps + attackScore(b, e, t, pv.amount, pv.willDown, m, false), dist });
      }
    }
    // supporter：回复 / 增益
    if (e.role === 'supporter') {
      for (const s of e.skills) {
        if (s.kind === 'attack') continue;
        for (const f of b.alive('enemy')) {
          if (!b.canSkill(e, s, f, m)) continue;
          const ratio = f.hp / f.maxHp;
          if (s.kind === 'heal' && ratio < W.healBelow) consider({ kind: 'skill', pos: m, target: f, skill: s, score: ps + W.healBase + (1 - ratio) * W.healScale + (isBoss(f) ? W.healBoss : 0), dist });
          if (s.buff === 'move' && f !== e && (f.role === 'brute' || f.role === 'revenger') && !b.hasBuff(f, 'move') && manhattan(m, f.pos) <= W.buffRange)
            consider({ kind: 'skill', pos: m, target: f, skill: s, score: ps + W.buff, dist });
        }
      }
    }
    // launcher：投掷身边最多 2 个单位
    if (e.role === 'launcher' && canAttack) {
      const throws: { victim: Unit; dest: Vec; score: number }[] = [];
      const used = new Set<string>();
      for (const d of DIRS) {
        const v = b.unitAt(add(m, d));
        if (!v || v === e || v.prop || v.decoy || v.role === 'shielder' || b.grid.h(v.pos) !== b.grid.h(m)) continue;
        if (v.side === 'enemy') {
          for (const f of foes) {
            const spot = DIRS.map((dd) => add(f.pos, dd)).find((q) => b.grid.walkable(q) && !b.unitAt(q) && !eq(q, m) && !used.has(key(q)) && manhattan(q, m) <= LAUNCH_RANGE);
            if (spot) { throws.push({ victim: v, dest: spot, score: W.launchBuddy }); used.add(key(spot)); break; }
          }
        } else if (v.side === PLAYER) {
          for (let k = 4; k >= 1; k--) {
            const q = add(v.pos, d, k);
            if (!b.grid.walkable(q) || b.unitAt(q) || b.grid.h(q) > b.grid.h(v.pos) || used.has(key(q))) continue;
            const drop = b.grid.h(q) < b.grid.h(v.pos);
            const isolated = !b.alive(PLAYER).some((a) => a !== v && manhattan(a.pos, q) <= 2);
            if (drop || isolated) { throws.push({ victim: v, dest: q, score: W.launchIsolate }); used.add(key(q)); }
            break;
          }
        }
      }
      throws.sort((x, y) => y.score - x.score);
      if (throws.length) {
        const hp: Plan = { kind: 'heave', pos: m, throws: throws.slice(0, 2), score: ps + throws[0].score, dist };
        consider(hp);
        if (!heaveBest || better(hp, heaveBest)) heaveBest = hp;
      }
    }
  }
  // launcher：能投掷时投掷，「否则扔石头（枪）」
  if (e.role === 'launcher' && heaveBest && best && (best as Plan).kind === 'gun') best = heaveBest;
  const plan = best as Plan | null;
  if (!plan) return false;
  const tgt = 'target' in plan ? plan.target.id : plan.kind === 'heave' ? plan.throws[0].victim.id : nearest?.id ?? null;
  b.emit({ type: 'enemyThink', enemyId: e.id, targetId: tgt, dest: plan.pos, plan: plan.kind });
  if (!eq(plan.pos, e.pos)) {
    const path = b.pathFor(e, plan.pos);
    b.moveAlong(e, path.length ? path : [e.pos, plan.pos]);
    if (b.checkEnd()) return false;
  }
  if (plan.kind === 'none') return false;
  if (plan.kind === 'heave') { for (const t of plan.throws) if (!t.victim.ko && manhattan(t.victim.pos, e.pos) === 1) b.heave(e, t.victim, t.dest); return false; }
  const hits = plan.kind === 'melee' ? b.doMelee(e, plan.target)
    : plan.kind === 'gun' ? b.doShoot(e, plan.target)
      : b.doSkill(e, (plan as Extract<Plan, { kind: 'skill' }>).skill, plan.target.pos);
  const f = focus.get(b);
  for (const h of hits) if (h.t.side === PLAYER) f?.add(h.t.id);
  if (e.ko) return false;
  return b.markDowns(hits.filter((h) => h.t.side === PLAYER));
}
