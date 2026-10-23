// 自动对战（Q10）：我方贪心 AI（tests/rules.test.ts 的 autoplay 加上关卡目标：开关/触发格/进区/出口/护送）
// 用途：测试每关「能赢、能输」；也可给 UI 做「自动」按钮。纯逻辑。
import type { Battle } from '../rules/battle';
import { key, manhattan } from '../rules/grid';
import type { Unit, Vec } from '../rules/types';

type Kind = 'melee' | 'gun' | 'skill';
interface Choice { dest: Vec | null; target: string; kind: Kind; skill?: string; score: number }

const same = (a: Vec, b: Vec) => a.x === b.x && a.y === b.y;

/** 现在可以作为攻击目标的敌方（含可破坏的敌方旗子/喇叭；排除受保护/不许打倒的） */
function targets(b: Battle): Unit[] {
  const w = b.map.win;
  const except = new Set(w.type === 'defeatAllExcept' ? w.exceptIds : []);
  for (const l of b.map.lose ?? []) if (l.type === 'unitKo') except.add(l.unitId);
  const want = w.type === 'defeatTarget' ? new Set(w.targetIds ?? (w.targetId ? [w.targetId] : [])) : null;
  return b.units.filter((u) => !u.ko && !except.has(u.id) && !u.protected && !b.isDormant(u) &&
    (u.side === 'enemy' || (u.side === 'neutral' && u.destructible && (want?.has(u.id) ?? false))));
}

/** 关卡目标格（没有可打的敌人时去这里）：出口 / 未触发的触发格 / 门还关着的开关 / 未进入的区域 */
function goals(b: Battle, u: Unit, stepped: Set<string>): Vec[] {
  const w = b.map.win;
  const out: Vec[] = [];
  const exits: Vec[] = [];
  for (let y = 0; y < b.map.height; y++) for (let x = 0; x < b.map.width; x++) if (b.grid.tile({ x, y }) === 'exit') exits.push({ x, y });
  if (w.type === 'reachExit' && (w.all || w.unitId === u.id || u.escort)) return exits;
  for (const ev of b.map.events ?? []) {
    if (b.rt.events.has(ev.id)) continue;
    if (ev.when.type === 'reach' && (ev.when.side ?? 'ally') === 'ally') out.push(ev.when.pos);
    if (ev.when.type === 'enterZone' && (ev.when.side ?? 'ally') === 'ally' && ev.do.some((a) => a.type === 'unlockZone')) {
      const z = ev.when.zone;
      for (let y = 0; y < b.map.height; y++) for (let x = 0; x < b.map.width; x++) if (b.zoneOf({ x, y }) === z && b.grid.walkable({ x, y })) out.push({ x, y });
    }
  }
  for (const sw of b.map.switches ?? []) {
    if (stepped.has(sw.id)) continue;
    if (sw.kind === 'elevator' || (sw.doors ?? []).some((d) => !b.doorOpen(d))) out.push(sw.pos);
  }
  return out;
}

/** 往 goal 走：选能到的格里离 goal 路径最近的（不停在不想踩的开关上） */
function stepToward(b: Battle, u: Unit, goalsList: Vec[], avoid: Set<string>): Vec | null {
  if (!goalsList.length) return null;
  const tiles = [u.pos, ...b.moveTiles(u)];
  const blocked = b.blockedFor(u);
  let best: Vec | null = null, bd = Infinity;
  const dist = new Map<string, number>();
  for (const g of goalsList) {
    const r = b.grid.reachable(g, 999, blocked, new Set(), true, 999);
    for (const [k, n] of r) if (n.dist >= 0 && (dist.get(k) ?? Infinity) > n.dist) dist.set(k, n.dist);
  }
  for (const t of tiles) {
    if (avoid.has(key(t)) && !goalsList.some((g) => same(g, t))) continue;
    const d = dist.get(key(t)) ?? 1000 + Math.min(...goalsList.map((g) => manhattan(g, t)));
    if (d < bd) { bd = d; best = t; }
  }
  return best && !same(best, u.pos) ? best : null;
}

export interface AutoOptions { mode: 'win' | 'lose'; maxTurns?: number; maxSteps?: number }

/**
 * 跑到结束（或 maxTurns）。mode='win'：尽量赢；mode='lose'：我方不攻击、只等待（让敌人打/超时）。
 * 返回最终 phase。
 */
export function autoBattle(b: Battle, o: AutoOptions): Battle['phase'] {
  const maxTurns = o.maxTurns ?? 40;
  const stepped = new Set<string>();
  const batonTried = new Set<string>();
  let steps = 0;
  const maxSteps = o.maxSteps ?? 4000;
  while ((b.phase === 'player' || b.phase === 'enemy') && b.turn <= maxTurns && steps++ < maxSteps) {
    if (b.phase !== 'player') break;
    if (o.mode === 'lose') { b.endPlayerPhase(); continue; }
    const ko = b.units.find((u) => u.side === 'ally' && u.ko && !u.escort && !u.reserve && !batonTried.has(u.id));
    if (ko && b.reserves.length && b.batonLeft > 0) {
      batonTried.add(ko.id);
      b.batonPass(ko.id, b.reserves[0].id);
      continue;
    }
    if (b.pendingTriple) { b.tripleThreat(); continue; }
    const u = b.alive('ally').find((a) => !a.acted && !a.decoy);
    if (!u) { b.endPlayerPhase(); continue; }
    const avoid = new Set((b.map.switches ?? []).filter((s) => stepped.has(s.id) || !(s.doors ?? []).some((d) => !b.doorOpen(d)) && s.kind !== 'elevator').map((s) => key(s.pos)));
    const swHere = () => { for (const s of b.map.switches ?? []) if (same(s.pos, u.pos)) stepped.add(s.id); };
    if (u.escort || b.noAction.has(u.id)) {
      const dest = u.moved ? null : stepToward(b, u, goals(b, u, stepped), avoid);
      if (dest) { b.move(u.id, dest); swHere(); }
      if (b.phase === 'player' && !b.unit(u.id).acted) b.wait(u.id);
      continue;
    }
    // reachExit 全队：已经站在出口的就别动
    const w = b.map.win;
    if (w.type === 'reachExit' && (w.all || w.unitId === u.id)) {
      const dest = u.moved ? null : stepToward(b, u, goals(b, u, stepped), avoid);
      if (dest) { b.move(u.id, dest); swHere(); }
      if (b.phase !== 'player') continue;
      if (!b.unit(u.id).acted) attackOrWait(b, u, true);
      continue;
    }
    attackOrWait(b, u, false, stepped, avoid);
    swHere();
  }
  return b.phase;
}

function attackOrWait(b: Battle, u: Unit, stay: boolean, stepped = new Set<string>(), avoid = new Set<string>()) {
  let best: Choice | null = null;
  const dests = u.moved || stay ? [u.pos] : [u.pos, ...b.moveTiles(u).filter((p) => !avoid.has(key(p)))];
  const ts = targets(b);
  for (const d of dests) for (const e of ts) {
    const opts: { kind: Kind; skill?: string; ok: boolean }[] = [
      { kind: 'melee', ok: b.canMelee(u, e, d) },
      { kind: 'gun', ok: b.canShoot(u, e, d) },
      ...u.skills.filter((s) => s.kind === 'attack' && s.shape === 'single').map((s) => ({ kind: 'skill' as const, skill: s.id, ok: b.canSkill(u, s, e, d) })),
    ];
    for (const op of opts) {
      if (!op.ok) continue;
      const pv = b.previewDamage(u, e, op.kind, op.skill ? u.skills.find((s) => s.id === op.skill) : undefined, d);
      if (pv.miss) continue;
      const kill = pv.amount >= e.hp ? 40 : 0;
      const score = (pv.willDown ? 50 : 0) + kill + pv.amount - (op.kind === 'skill' ? 4 : 0) + b.grid.hasAnyCover(d) * 3 + (e.isTarget || e.prop === 'flag' ? 30 : 0);
      if (!best || score > best.score) best = { dest: same(d, u.pos) ? null : d, target: e.id, kind: op.kind, skill: op.skill, score };
    }
  }
  if (!best) {
    if (!u.moved && !stay) {
      // 没得打：去最近的敌人；没有可见敌人就去关卡目标格（开关/触发格/进区）
      const vis = ts.map((e) => e.pos);
      const dest = stepToward(b, u, vis.length ? vis : goals(b, u, stepped), avoid);
      if (dest) b.move(u.id, dest);
    }
    if (b.phase === 'player' && !b.unit(u.id).acted) b.wait(u.id);
    return;
  }
  if (best.dest) b.move(u.id, best.dest);
  if (b.phase !== 'player' || b.unit(u.id).acted) return;
  if (best.kind === 'melee') b.melee(u.id, best.target);
  else if (best.kind === 'gun') b.shoot(u.id, best.target);
  else b.skill(u.id, best.skill!, best.target);
  // 指令被拒（error）时不要死循环
  if (b.phase === 'player' && !b.unit(u.id).acted && !b.unit(u.id).oneMore) b.wait(u.id);
}
