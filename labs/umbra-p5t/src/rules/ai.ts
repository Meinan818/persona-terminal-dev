// 敌人简单 AI：找最近的我方 → 选一个能打到它、且尽量有掩体的位置 → 打。
import type { Battle } from './battle';
import { RESIST_MULT } from './battle';
import { DIRS, key, manhattan } from './grid';
import type { Intent, Unit, Vec } from './types';

function nearestAlly(b: Battle, e: Unit): Unit | null {
  let best: Unit | null = null, bd = Infinity;
  for (const a of b.alive('ally')) {
    const d = b.grid.pathDistance(e.pos, a.pos, b.blockedFor(e));
    const dd = d === Infinity ? 1000 + manhattan(e.pos, a.pos) : d;
    if (dd < bd || (dd === bd && best && a.hp < best.hp)) { bd = dd; best = a; }
  }
  return best;
}

function reachTiles(b: Battle, e: Unit): Vec[] {
  const r = b.grid.reachable(e.pos, b.moveRange(e), b.blockedFor(e), b.occupiedSet(e));
  return [...r.values()].filter((n) => n.dist >= 0).map((n) => n.pos);
}

function canHitFrom(b: Battle, e: Unit, t: Unit, from: Vec): 'gun' | 'melee' | null {
  if (e.ai === 'ranged' && b.canShoot(e, t, from)) return 'gun';
  if (b.canMelee(e, t, from)) return 'melee';
  if (e.ai !== 'ranged' && b.canShoot(e, t, from)) return 'gun';
  return null;
}

export function computeIntents(b: Battle): Intent[] {
  return b.alive('enemy').map((e) => {
    const target = nearestAlly(b, e);
    const moveTiles = reachTiles(b, e);
    const threat = new Map<string, Vec>();
    const range = Math.max(1, e.gun && e.ammo > 0 ? e.gun.range : 1);
    // 注意：意图在我方回合开始时计算，用的是敌人当前位置与移动力（不预判我方之后的走位）
    for (const m of moveTiles) {
      for (let dx = -range; dx <= range; dx++) for (let dy = -range; dy <= range; dy++) {
        const p = { x: m.x + dx, y: m.y + dy };
        const d = Math.abs(dx) + Math.abs(dy);
        if (d === 0 || d > range || !b.grid.inBounds(p) || b.grid.tile(p) === 'wall') continue;
        if (d > 1 && !b.grid.lineOfSight(m, p)) continue;
        threat.set(key(p), p);
      }
    }
    return { enemyId: e.id, targetId: target?.id ?? null, moveTiles, threatTiles: [...threat.values()] };
  });
}

export function runEnemyTurn(b: Battle) {
  for (const e of b.alive('enemy')) {
    if (b.phase !== 'enemy') return;
    // 敌人也能 1 More：打倒（不同的）我方后再走再打，最多连锁 3 次防死循环
    for (let chain = 0; chain < 4; chain++) {
      if (e.ko || b.phase !== 'enemy') break;
      e.anchor = { ...e.pos };
      const downed = enemyAct(b, e);
      if (b.checkEnd()) return;
      if (!downed || !b.opts.enemyOneMore) break;
      b.emit({ type: 'oneMore', unitId: e.id });
    }
  }
}

/** 一次移动+行动；返回是否打倒了我方 */
function enemyAct(b: Battle, e: Unit): boolean {
  const target = nearestAlly(b, e);
  if (!target) return false;
  // 候选落点打分：能打到最近目标 +100；能打到任一我方 +60；能打出倒地 +15；自身有掩体 +25/级；离目标近一点 -1/格
  let bestPos = e.pos, bestScore = -Infinity, bestTarget: Unit | null = null, bestKind: 'gun' | 'melee' | null = null;
  const allies = b.alive('ally');
  for (const p of reachTiles(b, e)) {
    let score = 0, tgt: Unit | null = null, kind: 'gun' | 'melee' | null = null;
    const k1 = canHitFrom(b, e, target, p);
    if (k1) { score += 100; tgt = target; kind = k1; }
    else {
      for (const a of allies) {
        const k = canHitFrom(b, e, a, p);
        if (k) { score += 60; tgt = a; kind = k; break; }
      }
    }
    if (tgt && kind === 'gun' && b.grid.fullCoverFacing(tgt.pos, p)) score -= 80; // 打全掩体正面会落空
    if (tgt && !tgt.downed && !b.hasResistance(tgt, p)) score += 15;
    score += 25 * (b.opts.coverModel === 'p5t' ? b.grid.hasAnyCover(p) : b.grid.coverAgainst(p, target.pos));
    const pd = b.grid.pathDistance(p, target.pos, b.blockedFor(e));
    score -= pd === Infinity ? 50 : pd;
    if (score > bestScore) { bestScore = score; bestPos = p; bestTarget = tgt; bestKind = kind; }
  }
  b.emit({ type: 'enemyThink', enemyId: e.id, targetId: bestTarget?.id ?? null, dest: bestPos });
  if (key(bestPos) !== key(e.pos)) {
    const path = b.pathFor(e, bestPos);
    const from = { ...e.pos };
    e.pos = { ...bestPos };
    b.emit({ type: 'move', unitId: e.id, path, from });
  }
  if (!bestTarget || !bestKind) return false;
  return enemyAttack(b, e, bestTarget, bestKind);
}

function enemyAttack(b: Battle, e: Unit, t: Unit, kind: 'gun' | 'melee'): boolean {
  b.emit({ type: 'attack', kind, attackerId: e.id, targetId: t.id });
  if (kind === 'gun') {
    e.ammo--;
    if (b.grid.fullCoverFacing(t.pos, e.pos)) { b.emit({ type: 'miss', unitId: t.id, reason: 'fullCover' }); return false; }
  }
  const resist = b.hasResistance(t, e.pos);
  const base = kind === 'gun' ? e.gun!.power : e.melee;
  b.applyDamage(t, Math.max(1, Math.round(base * (resist ? RESIST_MULT : 1))), b.coverOf(t, e.pos), resist, kind);
  if (kind === 'melee' && !t.ko) {
    const old = { ...t.pos };
    if (b.push(t, b.dirFrom(e.pos, t.pos))) { e.pos = old; b.emit({ type: 'meleeStep', unitId: e.id, to: old }); }
    b.breakResist(t);
  }
  if (!t.ko && !resist && !t.downed) {
    t.downed = true; // 我方倒地：下个我方回合开始起身
    b.emit({ type: 'down', unitId: t.id });
    return true;
  }
  return false;
}
