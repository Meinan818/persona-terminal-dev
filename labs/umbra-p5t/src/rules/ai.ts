// 敌人 AI：按 Cogito AAA115 的敌人类型分别行动
//  shooter 只开枪、从掩体到掩体；brute 近战；revenger 近战（被打会反击，见 battle.onHitReaction）；
//  shielder 不移动、只开枪；teleporter 近战/开枪（被打换位）；launcher 投掷附近单位或扔石头；supporter 回复/加速/攻击技能
import type { Battle } from './battle';
import { DIRS, add, eq, key, manhattan } from './grid';
import type { Intent, SkillDef, Unit, Vec } from './types';

const PLAYER = 'ally' as const;

function nearestFoe(b: Battle, e: Unit): Unit | null {
  let best: Unit | null = null, bd = Infinity;
  for (const a of b.alive(PLAYER)) {
    const d = b.grid.pathDistance(e.pos, a.pos, b.blockedFor(e));
    const dd = d === Infinity ? 1000 + manhattan(e.pos, a.pos) : d;
    if (dd < bd || (dd === bd && best && a.hp < best.hp)) { bd = dd; best = a; }
  }
  return best;
}

function reachTiles(b: Battle, e: Unit): Vec[] {
  const r = b.grid.reachable(e.pos, b.moveRange(e), b.blockedFor(e), b.occupiedSet(e), true);
  return [...r.values()].filter((n) => n.dist >= 0).map((n) => n.pos);
}

function attackRange(b: Battle, e: Unit) {
  const sk = e.skills.filter((s) => s.kind === 'attack').map((s) => s.range);
  return Math.max(1, b.gunRange(e), ...sk);
}

export function computeIntents(b: Battle): Intent[] {
  return b.alive('enemy').map((e) => {
    const target = nearestFoe(b, e);
    const moveTiles = reachTiles(b, e);
    const threat = new Map<string, Vec>();
    const range = attackRange(b, e);
    // 意图在我方回合开始时计算：用敌人当前位置与移动力（不预判我方之后的走位）
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

export function runEnemyTurn(b: Battle) {
  for (const e of [...b.alive('enemy')]) {
    if (b.phase !== 'enemy') return;
    if (e.ko || b.noAction.has(e.id)) continue;
    // 敌人也能 1 More：打倒（不同的）我方后再走再打；最多连锁 3 次防死循环（原作无此上限说明）
    for (let chain = 0; chain < 4; chain++) {
      if (e.ko || b.phase !== 'enemy') break;
      e.anchor = { ...e.pos };
      const downed = enemyAct(b, e);
      if (b.checkEnd()) return;
      if (!downed || !b.opts.enemyOneMore || e.ko) break;
      b.emit({ type: 'oneMore', unitId: e.id });
    }
  }
}

type Plan =
  | { kind: 'melee' | 'gun'; pos: Vec; target: Unit; score: number }
  | { kind: 'skill'; pos: Vec; target: Unit; skill: SkillDef; score: number }
  | { kind: 'heave'; pos: Vec; victim: Unit; dest: Vec; score: number }
  | { kind: 'none'; pos: Vec; score: number };

function coverScore(b: Battle, e: Unit, p: Vec, target: Unit) {
  const lv = b.opts.coverModel === 'p5t' ? b.grid.hasAnyCover(p) : b.grid.coverAgainst(p, target.pos);
  const w = e.role === 'brute' || e.role === 'revenger' ? 8 : 25;
  return lv * w;
}

/** 一次移动+行动；返回是否打倒了我方 */
function enemyAct(b: Battle, e: Unit): boolean {
  const target = nearestFoe(b, e);
  if (!target) return false;
  const foes = b.alive(PLAYER);
  const canAttack = !b.noAttack.has(e.id);
  const plans: Plan[] = [];
  for (const p of reachTiles(b, e)) {
    const pd = b.grid.pathDistance(p, target.pos, b.blockedFor(e));
    const baseScore = coverScore(b, e, p, target) - (pd === Infinity ? 50 : pd);
    plans.push({ kind: 'none', pos: p, score: baseScore });
    if (!canAttack) continue;
    for (const t of foes) {
      const prio = t === target ? 100 : 60;
      const opts: ('melee' | 'gun')[] = [];
      if (e.role !== 'shooter' && e.role !== 'shielder' && b.canMelee(e, t, p)) opts.push('melee');
      if (b.canShoot(e, t, p)) opts.push('gun');
      for (const k of opts) {
        const pv = b.previewDamage(e, t, k, undefined, p);
        if (pv.miss) continue;
        const pref = (e.role === 'brute' || e.role === 'revenger') && k === 'melee' ? 10 : e.role === 'shooter' && k === 'gun' ? 10 : 0;
        plans.push({ kind: k, pos: p, target: t, score: baseScore + prio + pref + (pv.willDown ? 15 : 0) + pv.amount * 0.3 });
      }
      for (const s of e.skills) {
        if (s.kind !== 'attack' || !b.canSkill(e, s, t, p)) continue;
        const pv = b.previewDamage(e, t, 'skill', s, p);
        plans.push({ kind: 'skill', pos: p, target: t, skill: s, score: baseScore + prio + 5 + pv.amount * 0.3 });
      }
    }
    // 支援者：回复受伤同伴 / 给近战同伴加速
    if (e.role === 'supporter') {
      for (const s of e.skills) {
        if (s.kind === 'attack') continue;
        for (const f of b.alive('enemy')) {
          if (!b.canSkill(e, s, f, p)) continue;
          if (s.kind === 'heal' && f.hp / f.maxHp < 0.6) plans.push({ kind: 'skill', pos: p, target: f, skill: s, score: baseScore + 130 });
          if (s.buff === 'move' && (f.role === 'revenger' || f.role === 'brute') && !b.hasBuff(f, 'move')) plans.push({ kind: 'skill', pos: p, target: f, skill: s, score: baseScore + 90 });
        }
      }
    }
    // 投掷者：把身边的同伴扔到我方身边 / 把身边的我方扔走（可扔下高台）
    if (e.role === 'launcher' && canAttack) {
      for (const d of DIRS) {
        const v = b.unitAt(add(p, d));
        if (!v || v === e || v.prop || v.role === 'shielder' || b.grid.h(v.pos) !== b.grid.h(p)) continue;
        if (v.side === 'enemy') {
          for (const f of foes) {
            if (manhattan(f.pos, p) > 6) continue;
            const spot = DIRS.map((dd) => add(f.pos, dd)).find((q) => b.grid.walkable(q) && !b.unitAt(q) && !eq(q, p));
            if (spot) plans.push({ kind: 'heave', pos: p, victim: v, dest: spot, score: baseScore + 110 + (f === target ? 5 : 0) });
          }
        } else if (v.side === PLAYER) {
          for (let k = 4; k >= 1; k--) {
            const q = add(v.pos, d, k);
            if (!b.grid.walkable(q) || b.unitAt(q) || b.grid.h(q) > b.grid.h(v.pos)) continue;
            const drop = b.grid.h(q) < b.grid.h(v.pos);
            plans.push({ kind: 'heave', pos: p, victim: v, dest: q, score: baseScore + 105 + (drop ? 40 : 0) });
            break;
          }
        }
      }
    }
  }
  plans.sort((a, b2) => b2.score - a.score);
  const best = plans[0];
  b.emit({ type: 'enemyThink', enemyId: e.id, targetId: 'target' in best ? best.target.id : 'victim' in best ? best.victim.id : null, dest: best.pos });
  if (!eq(best.pos, e.pos)) {
    const path = b.pathFor(e, best.pos);
    const from = { ...e.pos };
    e.pos = { ...best.pos };
    b.emit({ type: 'move', unitId: e.id, path, from });
    for (let i = 1; i < path.length; i++) {
      const l = b.grid.linkBetween(path[i - 1], path[i]);
      if (l) b.emit({ type: 'dash', unitId: e.id, from: path[i - 1], to: path[i], kind: l.kind });
    }
  }
  if (best.kind === 'none') return false;
  if (best.kind === 'heave') { b.heave(e, best.victim, best.dest); return false; }
  const hits = best.kind === 'melee' ? b.doMelee(e, best.target)
    : best.kind === 'gun' ? b.doShoot(e, best.target)
      : b.doSkill(e, (best as Extract<Plan, { kind: 'skill' }>).skill, best.target.pos);
  if (e.ko) return false;
  return b.markDowns(hits.filter((h) => h.t.side === PLAYER));
}
