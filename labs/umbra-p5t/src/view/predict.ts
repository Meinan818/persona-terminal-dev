// 可预知的增援（只看 turn / everyTurns 触发的 spawn 事件）：提前一回合在落点画红色警告格。
import type { Battle, Vec } from '../rules';

export interface SpawnWarning { pos: Vec; turn: number; phase: 'player' | 'enemy'; eventId: string }

/** 下一个会触发的回合（≥ 当前回合；当前回合且阶段已过则顺延） */
function nextTurn(b: Battle, when: { type: string; turn?: number; n?: number; phase?: string; whileAlive?: string; flag?: string }): { turn: number; phase: 'player' | 'enemy' } | null {
  const ph = (when.phase as 'player' | 'enemy' | undefined) ?? 'enemy';
  const passed = (t: number) => t < b.turn || (t === b.turn && (b.phase === 'enemy' && ph === 'player'));
  if (when.type === 'turn' && when.turn != null) return passed(when.turn) ? null : { turn: when.turn, phase: ph };
  if (when.type === 'everyTurns' && when.n) {
    if (when.whileAlive && !b.units.some((u) => u.id === when.whileAlive && !u.ko)) return null;
    if (when.flag && !b.rt.flags.has(when.flag)) return null;
    let t = Math.max(when.n, Math.ceil(b.turn / when.n) * when.n);
    if (passed(t)) t += when.n;
    return { turn: t, phase: ph };
  }
  return null;
}

/** 当前应显示的增援警告（触发在本回合敌方阶段或下一回合内） */
export function spawnWarnings(b: Battle): SpawnWarning[] {
  if (b.phase !== 'player' && b.phase !== 'enemy') return [];
  const out: SpawnWarning[] = [];
  for (const e of b.map.events ?? []) {
    if (e.when.type !== 'everyTurns' && b.rt.events.has(e.id)) continue;
    const spawns = e.do.filter((a): a is Extract<typeof a, { type: 'spawn' }> => a.type === 'spawn');
    if (!spawns.length) continue;
    const nt = nextTurn(b, e.when as never);
    if (!nt) continue;
    if (e.when.type === 'everyTurns' && b.rt.events.has(`${e.id}@${nt.turn}`)) continue;
    if (nt.turn > b.turn + 1) continue; // 提前一回合预警
    for (const s of spawns) for (const u of s.units) {
      const z = b.zoneOf(u.pos);
      if (b.map.zones && z && !b.rt.unlocked.has(z)) continue; // 未解锁区域里的落点不剧透
      out.push({ pos: u.pos, turn: nt.turn, phase: nt.phase, eventId: e.id });
    }
  }
  return out;
}
