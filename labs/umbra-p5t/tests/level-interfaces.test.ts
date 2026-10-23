// Q9：LEVELS.md 顶部「需要引擎新增的接口」，每个一条测试（小图，和 Q5/Q6 的整关测试互补）
import { describe, expect, it } from 'vitest';
import { loadLevel, type LevelJson } from '../src/game/level';
import { Battle } from '../src/rules';
import type { BattleEvent } from '../src/rules';

const base = (o: Partial<LevelJson> = {}): LevelJson => ({
  id: 'I', name: 'i', width: 8, height: 4, win: { type: 'defeatAll' }, turnTarget: 3,
  party: [['joker', 0, 3]], enemies: [{ id: 'e1', name: 'e1', role: 'brute', hp: 200, pos: [7, 0], zone: 'A' }],
  tiles: ['........', '........', '........', '........'], heights: ['00000000', '00000000', '00000000', '00000000'],
  zones: ['AAAABBBB', 'AAAABBBB', 'AAAABBBB', 'AAAABBBB'], unlockedZones: ['A', 'B'], ...o,
});
function go(j: LevelJson) {
  const b = new Battle(loadLevel(j));
  const ev: BattleEvent[] = [];
  b.on((e) => ev.push(e));
  b.start();
  return { b, ev };
}
const msg = (ev: BattleEvent[]) => ev.filter((e) => e.type === 'message').map((e) => (e as { text: string }).text);
const say = (text: string) => ({ type: 'message', text });

describe('Q9 事件触发', () => {
  it('doorOpened{id}', () => {
    const { b, ev } = go(base({ doors: [{ id: 'D1', cells: [[3, 0]], open: false }], events: [{ id: 'x', when: { type: 'doorOpened', id: 'D1' }, do: [say('开')] }] }));
    b.setDoor('D1', true); b.checkEnd();
    expect(msg(ev)).toContain('开');
  });
  it('zoneCleared{zone}', () => {
    const { b, ev } = go(base({ events: [{ id: 'x', when: { type: 'zoneCleared', zone: 'A' }, do: [say('清')] }], enemies: [{ id: 'e1', name: 'e', role: 'brute', hp: 1, pos: [0, 2], zone: 'A' }, { id: 'e2', name: 'e', role: 'brute', hp: 200, pos: [7, 0], zone: 'B' }] }));
    expect(msg(ev)).not.toContain('清');
    b.shoot('joker', 'e1');
    expect(msg(ev)).toContain('清');
  });
  it('enterZone{zone,side}', () => {
    const { b, ev } = go(base({ events: [{ id: 'x', when: { type: 'enterZone', zone: 'B', side: 'ally' }, do: [say('进')] }] }));
    b.move('joker', { x: 3, y: 3 });
    expect(msg(ev)).not.toContain('进');
    b.move('joker', { x: 4, y: 3 });
    expect(msg(ev)).toContain('进');
  });
  it('everyTurns{n,phase,whileAlive}：每 n 回合一次，whileAlive 的单位倒下就停', () => {
    const { b, ev } = go(base({ enemies: [{ id: 'e1', name: 'e', role: 'brute', hp: 200, pos: [7, 0], zone: 'B' }],
      props: [{ id: 'flag', kind: 'flag', pos: [7, 3], hp: 5 }],
      events: [{ id: 'x', when: { type: 'everyTurns', n: 2, phase: 'player', whileAlive: 'flag' }, do: [say('补')] }] }));
    b.endPlayerPhase(); b.endPlayerPhase(); b.endPlayerPhase(); // 到第 4 回合
    expect(msg(ev).filter((t) => t === '补')).toHaveLength(2);
    b.unit('flag').ko = true;
    b.endPlayerPhase(); b.endPlayerPhase();
    expect(msg(ev).filter((t) => t === '补')).toHaveLength(2);
  });
  it('everyTurns{flag}：事件执行时自动 setFlag 自己的 id', () => {
    const { b, ev } = go(base({ events: [
      { id: 'phase2', when: { type: 'turn', turn: 2, phase: 'player' }, do: [say('p2')] },
      { id: 'x', when: { type: 'everyTurns', n: 1, phase: 'player', flag: 'phase2' }, do: [say('召')] , repeat: true },
    ] }));
    expect(msg(ev)).not.toContain('召');
    b.endPlayerPhase();
    expect(b.rt.flags.has('phase2')).toBe(true);
    expect(msg(ev)).toContain('召');
  });
});

describe('Q9 事件动作', () => {
  it('unlockZone{zone}', () => {
    const { b } = go(base({ unlockedZones: ['A'], enemies: [{ id: 'e1', name: 'e', role: 'brute', hp: 200, pos: [7, 0], zone: 'B' }],
      events: [{ id: 'x', when: { type: 'turn', turn: 2, phase: 'player' }, do: [{ type: 'unlockZone', zone: 'B' }] }] }));
    expect(b.isDormant(b.unit('e1'))).toBe(true);
    b.endPlayerPhase();
    expect(b.isDormant(b.unit('e1'))).toBe(false);
  });
  it('moveUnit{unitId,pos}：瞬移', () => {
    const { b } = go(base({ events: [{ id: 'x', when: { type: 'turn', turn: 1, phase: 'player' }, do: [{ type: 'moveUnit', unitId: 'e1', pos: [5, 1] }] }] }));
    expect(b.unit('e1').pos).toEqual({ x: 5, y: 1 });
  });
});

describe('Q9 败北 lose[]', () => {
  it('allKo', () => {
    const { b } = go(base({ lose: [{ type: 'allKo' }] }));
    b.unit('joker').hp = 0; b.unit('joker').ko = true; b.checkEnd();
    expect(b.phase).toBe('lost');
  });
  it('unitKo{unitId}（我方 NPC 或敌方被保护单位都行）', () => {
    const { b } = go(base({ lose: [{ type: 'allKo' }, { type: 'unitKo', unitId: 'e1' }], enemies: [{ id: 'e1', name: 'e', role: 'brute', hp: 1, pos: [0, 2] }, { id: 'e2', name: 'e', role: 'brute', hp: 200, pos: [7, 0] }] }));
    b.shoot('joker', 'e1');
    expect(b.phase).toBe('lost');
  });
  it('turnLimit{n}', () => {
    const { b } = go(base({ lose: [{ type: 'allKo' }, { type: 'turnLimit', n: 2 }] }));
    b.endPlayerPhase();
    expect(b.phase).toBe('player');
    b.endPlayerPhase();
    expect(b.phase).toBe('lost');
  });
});

describe('Q9 敌人字段', () => {
  it('protected：打到 HP 1 停住、不倒地、不给 1 MORE', () => {
    const { b, ev } = go(base({ enemies: [{ id: 'p', name: 'p', role: 'brute', hp: 3, pos: [0, 2], protected: true }, { id: 'e2', name: 'e', role: 'brute', hp: 200, pos: [7, 0] }] }));
    b.melee('joker', 'p');
    expect(b.unit('p').hp).toBe(1);
    expect(b.unit('p').downed).toBe(false);
    expect(ev.some((e) => e.type === 'oneMore' && e.unitId === 'joker')).toBe(false);
  });
  it('staysInZone：AI 不离开该区域', () => {
    const { b } = go(base({ enemies: [{ id: 'boss', name: 'b', role: 'brute', hp: 200, pos: [4, 0], zone: 'B', staysInZone: 'B' }] }));
    for (let i = 0; i < 3 && b.phase === 'player'; i++) { b.endPlayerPhase(); expect(b.zoneOf(b.unit('boss').pos)).toBe('B'); }
  });
  it('aiTarget：AI 强制攻击指定目标（不打更近的）', () => {
    const { b } = go(base({ party: [['joker', 4, 1]], party_extra: [['toshiro', 2, 3]], width: 8,
      enemies: [{ id: 'k', name: 'k', role: 'brute', hp: 200, pos: [5, 1], aiTarget: 'toshiro' }] }));
    const hpJ = b.unit('joker').hp;
    b.endPlayerPhase();
    expect(b.unit('joker').hp).toBe(hpJ);
    expect(b.unit('toshiro').hp).toBeLessThan(b.unit('toshiro').maxHp);
  });
  it('gunRange 覆盖射程', () => {
    const { b } = go(base({ enemies: [{ id: 's', name: 's', role: 'shooter', hp: 60, pos: [7, 0], gunRange: 9 }] }));
    expect(b.gunRange(b.unit('s'))).toBe(9);
  });
  it('hpFloor 比例：锁在 50%，setUnit 解除后能打倒', () => {
    const { b } = go(base({ enemies: [{ id: 'boss', name: 'b', role: 'brute', hp: 100, pos: [0, 2], hpFloor: 0.5 }],
      events: [{ id: 'x', when: { type: 'hpBelow', unitId: 'boss', ratio: 0.5 }, do: [{ type: 'setUnit', unitId: 'boss', patch: { hpFloor: 0 } }] }] }));
    const boss = b.unit('boss');
    b.applyDamage(boss, 999, 0, false, 'gun', null);
    expect(boss.hp).toBe(50);
    b.checkEnd();
    b.applyDamage(boss, 999, 0, false, 'gun', null);
    expect(boss.ko).toBe(true);
  });
});

describe('Q9 props / chests', () => {
  it('box：提供全掩体（敌人贴木箱有 Guard）', () => {
    const { b } = go(base({ enemies: [{ id: 'e1', name: 'e', role: 'brute', hp: 200, pos: [6, 0] }], props: [{ id: 'box1', kind: 'box', pos: [5, 0] }] }));
    expect(b.grid.hasAnyCover({ x: 6, y: 0 })).toBe(2);
    expect(b.unit('e1').guard).toBe(true);
  });
  it('barrel：打中爆炸，波及 2 格内', () => {
    const { b, ev } = go(base({ enemies: [{ id: 'e1', name: 'e', role: 'brute', hp: 200, pos: [5, 0] }], props: [{ id: 'bar', kind: 'barrel', pos: [4, 0] }] }));
    b.shoot('joker', 'bar');
    expect(ev.some((e) => e.type === 'explode')).toBe(true);
    expect(b.unit('e1').hp).toBeLessThan(200);
  });
  it('speaker：关卡喇叭可被打掉', () => {
    const { b } = go(base({ props: [{ id: 'sp1', kind: 'speaker', pos: [2, 1], bans: ['skill'] }] }));
    expect(b.speakerBans().map((s) => s.ban)).toEqual(['skill']);
    expect(b.canShoot(b.unit('joker'), b.unit('sp1'))).toBe(true);
    for (let i = 0; i < 5 && !b.unit('sp1').ko; i++) { b.unit('joker').acted = false; b.shoot('joker', 'sp1'); }
    expect(b.unit('sp1').ko).toBe(true);
  });
  it('flag：有 hp、有光环（半径内敌人受伤降低），我方能打、不给我方回血', () => {
    const { b } = go(base({ enemies: [{ id: 'e1', name: 'e', role: 'brute', hp: 200, pos: [6, 2] }], props: [{ id: 'flag', kind: 'flag', pos: [7, 2], hp: 'PH', aura: 3 }] }));
    const f = b.unit('flag');
    expect(f.maxHp).toBe(60); // Hark 10-23：旗子 PH-tuned 60
    expect(b.enemyFlagAura(b.unit('e1').pos)).toBe(true);
    expect(b.enemyFlagAura(b.unit('joker').pos)).toBe(false);
    expect(b.canShoot(b.unit('joker'), f)).toBe(true);
  });
  it('chests：走上去 = 拿到，reward 记账', () => {
    const { b } = go(base({ chests: [{ id: 'c', pos: [2, 3], reward: { gp: 5 } }] }));
    b.move('joker', { x: 2, y: 3 });
    expect(b.loot).toEqual({ gp: 5 });
  });
});
