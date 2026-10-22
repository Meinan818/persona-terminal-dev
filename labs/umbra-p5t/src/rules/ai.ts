// 敌人 AI：按 Cogito AAA115 的敌人类型分别行动（原作 AI 公开资料只有行为描述，评分权重是我们定的 → 见 RULES-NOTES）
//  共通：回合结束贴掩体才有 Guard → 停在掩体旁加分；站在我方火力可及的空地减分；优先打能打倒的（GET EM）、
//        集火本回合已被打过的目标、优先攻击诱饵（Like a Phantom：「trick enemies into wasting a turn firing at them」）
//  shooter 只开枪、从掩体到掩体（Cogito：「moves from cover to cover and shoot you」）
//  brute / revenger 近战，优先能把目标推下高台/推向别人的方向
//  shielder 会转向我方（Gamer Guides：「These will face your character wherever you go」），只开枪
//  teleporter 近战/开枪（被打换位，见 battle.onHitReaction）
//  launcher 投掷身边最多 2 个单位或扔石头（Cogito：「can throw up to two nearby units, friend and foe, or stones」）
//  supporter 回复 / 给近战同伴 Sukukaja / 攻击 / 把我方一人与敌人换位（Cogito：「swap the position of an ally with a random enemy」，少用）
import type { Battle } from './battle';
import { DIRS, add, eq, key, manhattan } from './grid';
import type { Intent, SkillDef, Unit, Vec } from './types';

const PLAYER = 'ally' as const;

/** 目标：诱饵优先（距离视为更近），其次最近、HP 低 */
function nearestFoe(b: Battle, e: Unit): Unit | null {
  let best: Unit | null = null, bd = Infinity;
  for (const a of b.alive(PLAYER)) {
    const d = b.grid.pathDistance(e.pos, a.pos, b.blockedFor(e));
    let dd = d === Infinity ? 1000 + manhattan(e.pos, a.pos) : d;
    if (a.decoy) dd -= 4;
    if (a.downed) dd += 6; // 已倒地的打了也不会再给 1 More → 优先未倒地的
    if (dd < bd || (dd === bd && best && a.hp < best.hp)) { bd = dd; best = a; }
  }
  return best;
}

function reachTiles(b: Battle, e: Unit): Vec[] {
  const r = b.grid.reachable(e.pos, b.moveRange(e), b.blockedFor(e), b.occupiedSet(e), true, b.afterDash(e));
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

/** 本次敌方阶段里被打过的我方（集火用） */
const focus = new WeakMap<Battle, Map<string, number>>();

export function runEnemyTurn(b: Battle) {
  focus.set(b, new Map());
  for (const e of [...b.alive('enemy')]) {
    if (b.phase !== 'enemy') return;
    if (e.ko || b.noAction.has(e.id)) continue;
    // 盾兵转向自己的目标
    if (e.role === 'shielder') {
      const t = nearestFoe(b, e);
      if (t) { e.facing = b.dirFrom(e.pos, t.pos); b.emit({ type: 'shieldTurn', unitId: e.id, facing: e.facing }); }
    }
    // 敌人也能 1 More：打倒（不同的、未倒地的）我方后再走再打。原作没有次数上限——每次都要打倒一个新目标，所以天然有限；
    // 这里只留 opts.enemyChainCap（默认无限）和「我方人数 + 1」的安全上限
    const cap = Math.min(b.opts.enemyChainCap, b.alive(PLAYER).length + 1);
    for (let chain = 0; chain <= cap; chain++) {
      if (e.ko || b.phase !== 'enemy') break;
      e.anchor = { ...e.pos };
      const downed = enemyAct(b, e);
      if (b.checkEnd()) return;
      if (!downed || !b.opts.enemyOneMore || e.ko) break;
      b.emit({ type: 'oneMore', unitId: e.id });
    }
    if (e.role === 'shielder' && !e.ko) {
      const t = nearestFoe(b, e);
      if (t) { e.facing = b.dirFrom(e.pos, t.pos); b.emit({ type: 'shieldTurn', unitId: e.id, facing: e.facing }); }
    }
  }
}

type Plan =
  | { kind: 'melee' | 'gun'; pos: Vec; target: Unit; score: number }
  | { kind: 'skill'; pos: Vec; target: Unit; skill: SkillDef; score: number }
  | { kind: 'heave'; pos: Vec; throws: { victim: Unit; dest: Vec }[]; score: number }
  | { kind: 'swap'; pos: Vec; ally: Unit; enemy: Unit; score: number }
  | { kind: 'none'; pos: Vec; score: number };

const isMeleeRole = (e: Unit) => e.role === 'brute' || e.role === 'revenger';

/** 停在 p：回合结束能否拿到 Guard（贴掩体） */
function coverScore(b: Battle, e: Unit, p: Vec, target: Unit) {
  const lv = b.opts.coverModel === 'p5t' ? b.grid.hasAnyCover(p) : b.grid.coverAgainst(p, target.pos);
  return lv ? (isMeleeRole(e) ? 8 : 30) : 0;
}

/** 停在 p：下个我方回合有几名我方能用枪打到这里（只算没有掩体的格；有掩体的格回合结束会有 Guard） */
function exposure(b: Battle, p: Vec): number {
  if (b.grid.hasAnyCover(p) > 0) return 0;
  let n = 0;
  for (const a of b.mainAllies()) {
    if (!a.gun) continue;
    if (manhattan(a.pos, p) <= b.gunRange(a) + b.moveRange(a)) n++;
  }
  return n;
}

/** 近战把 t 往 d 方向推：会不会推下高台 / 撞到别人（加分） */
function pushValue(b: Battle, t: Unit, d: Vec): number {
  let cur = t.pos;
  for (let i = 0; i < 4; i++) {
    const n = add(cur, d);
    if (b.unitAt(n)) return 12;
    if (!b.grid.walkable(n) || b.grid.h(n) > b.grid.h(cur)) return 0;
    if (b.grid.h(n) < b.grid.h(cur)) return 30;
    cur = n;
  }
  return 0;
}

/** 一次移动+行动；返回是否打倒了我方 */
function enemyAct(b: Battle, e: Unit): boolean {
  const target = nearestFoe(b, e);
  if (!target) return false;
  const foes = b.alive(PLAYER);
  const canAttack = !b.noAttack.has(e.id);
  const hitBefore = focus.get(b) ?? new Map<string, number>();
  const plans: Plan[] = [];
  for (const p of reachTiles(b, e)) {
    const pd = b.grid.pathDistance(p, target.pos, b.blockedFor(e));
    const baseScore = coverScore(b, e, p, target) - (pd === Infinity ? 50 : pd) - exposure(b, p) * (isMeleeRole(e) ? 2 : 6);
    plans.push({ kind: 'none', pos: p, score: baseScore });
    if (!canAttack) continue;
    for (const t of foes) {
      const prio = t.decoy ? 125 : (t === target ? 100 : 70) + (hitBefore.get(t.id) ?? 0) * 8 + Math.round((1 - t.hp / t.maxHp) * 20) - (t.downed ? 35 : 0);
      const opts: ('melee' | 'gun')[] = [];
      if (e.role !== 'shooter' && e.role !== 'shielder' && e.role !== 'launcher' && b.canMelee(e, t, p)) opts.push('melee');
      if (b.canShoot(e, t, p)) opts.push('gun');
      for (const k of opts) {
        const pv = b.previewDamage(e, t, k, undefined, p);
        if (pv.miss) continue;
        const pref = isMeleeRole(e) && k === 'melee' ? 10 : e.role === 'shooter' && k === 'gun' ? 10 : 0;
        const push = k === 'melee' ? pushValue(b, t, b.dirFrom(p, t.pos)) : 0;
        const kill = pv.amount >= t.hp ? 25 : 0;
        plans.push({ kind: k, pos: p, target: t, score: baseScore + prio + pref + push + kill + (pv.willDown ? 25 : 0) + pv.amount * 0.3 });
      }
      for (const s of e.skills) {
        if (s.kind !== 'attack' || !b.canSkill(e, s, t, p)) continue;
        const pv = b.previewDamage(e, t, 'skill', s, p);
        plans.push({ kind: 'skill', pos: p, target: t, skill: s, score: baseScore + prio + 5 + pv.amount * 0.3 });
      }
    }
    // 支援者：回复受伤同伴 / 给近战同伴加速 / 把我方孤立
    if (e.role === 'supporter') {
      for (const s of e.skills) {
        if (s.kind === 'attack') continue;
        for (const f of b.alive('enemy')) {
          if (!b.canSkill(e, s, f, p)) continue;
          if (s.kind === 'heal' && f.hp / f.maxHp < 0.6) plans.push({ kind: 'skill', pos: p, target: f, skill: s, score: baseScore + 130 });
          if (s.buff === 'move' && isMeleeRole(f) && !b.hasBuff(f, 'move')) plans.push({ kind: 'skill', pos: p, target: f, skill: s, score: baseScore + 90 });
        }
      }
      // 换位：把射程内的我方与离我方最远的敌人交换（原作「rarely used」→ 分数低于其他行动）
      for (const a of b.mainAllies()) {
        if (manhattan(a.pos, p) > 5) continue;
        const far = b.alive('enemy').filter((x) => x !== e && !x.prop && x.role !== 'shielder')
          .sort((x, y) => foes.reduce((s, f) => s + manhattan(f.pos, y.pos), 0) - foes.reduce((s, f) => s + manhattan(f.pos, x.pos), 0))[0];
        if (far) plans.push({ kind: 'swap', pos: p, ally: a, enemy: far, score: baseScore + 60 });
      }
    }
    // 投掷者：身边最多 2 个单位——把同伴扔到我方身边 / 把我方扔走（可扔下高台）
    if (e.role === 'launcher' && canAttack) {
      const throws: { victim: Unit; dest: Vec; score: number }[] = [];
      const used = new Set<string>();
      for (const d of DIRS) {
        const v = b.unitAt(add(p, d));
        if (!v || v === e || v.prop || v.decoy || v.role === 'shielder' || b.grid.h(v.pos) !== b.grid.h(p)) continue;
        if (v.side === 'enemy') {
          for (const f of foes) {
            if (manhattan(f.pos, p) > 6 || f.decoy) continue;
            const spot = DIRS.map((dd) => add(f.pos, dd)).find((q) => b.grid.walkable(q) && !b.unitAt(q) && !eq(q, p) && !used.has(key(q)));
            if (spot) { throws.push({ victim: v, dest: spot, score: 55 + (f === target ? 5 : 0) }); used.add(key(spot)); break; }
          }
        } else if (v.side === PLAYER) {
          for (let k = 4; k >= 1; k--) {
            const q = add(v.pos, d, k);
            if (!b.grid.walkable(q) || b.unitAt(q) || b.grid.h(q) > b.grid.h(v.pos) || used.has(key(q))) continue;
            const drop = b.grid.h(q) < b.grid.h(v.pos);
            throws.push({ victim: v, dest: q, score: 52 + (drop ? 40 : 0) }); used.add(key(q));
            break;
          }
        }
      }
      throws.sort((x, y) => y.score - x.score);
      const pick = throws.slice(0, 2);
      if (pick.length) plans.push({ kind: 'heave', pos: p, throws: pick, score: baseScore + 50 + pick.reduce((s, t) => s + t.score, 0) });
    }
  }
  plans.sort((a, b2) => b2.score - a.score);
  const best = plans[0];
  const tgt = 'target' in best ? best.target.id : best.kind === 'heave' ? best.throws[0].victim.id : best.kind === 'swap' ? best.ally.id : null;
  b.emit({ type: 'enemyThink', enemyId: e.id, targetId: tgt, dest: best.pos, plan: best.kind });
  if (!eq(best.pos, e.pos)) {
    const path = b.pathFor(e, best.pos);
    b.moveAlong(e, path.length ? path : [e.pos, best.pos]);
    if (b.checkEnd()) return false;
  }
  if (best.kind === 'none') return false;
  if (best.kind === 'heave') { for (const t of best.throws) if (!t.victim.ko && manhattan(t.victim.pos, e.pos) === 1) b.heave(e, t.victim, t.dest); return false; }
  if (best.kind === 'swap') { b.swapUnits(e, best.ally, best.enemy); return false; }
  const hits = best.kind === 'melee' ? b.doMelee(e, best.target)
    : best.kind === 'gun' ? b.doShoot(e, best.target)
      : b.doSkill(e, (best as Extract<Plan, { kind: 'skill' }>).skill, best.target.pos);
  for (const h of hits) if (h.t.side === PLAYER) hitBefore.set(h.t.id, (hitBefore.get(h.t.id) ?? 0) + 1);
  if (e.ko) return false;
  return b.markDowns(hits.filter((h) => h.t.side === PLAYER));
}
