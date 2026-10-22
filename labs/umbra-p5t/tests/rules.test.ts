import { describe, expect, it } from 'vitest';
import { Battle, parseMap, JOKER, SKULL, PANTHER, testMap, pointInTriangle } from '../src/rules';
import type { MapDef, UnitDef, BattleEvent } from '../src/rules';

const dummy = (id: string, hp = 100, extra: Partial<UnitDef> = {}): UnitDef => ({
  id, name: id, side: 'enemy', ai: 'melee', maxHp: hp, maxSp: 0, move: 0, melee: 1, skills: [], ...extra,
});
function mk(rows: string[], place: Record<string, UnitDef>, extra: Partial<MapDef> = {}): Battle {
  const b = new Battle({ id: 't', name: 't', turnTarget: 3, win: { type: 'defeatAll' }, ...parseMap(rows, place), ...extra });
  b.start();
  return b;
}
const types = (ev: BattleEvent[]) => ev.map((e) => e.type);

const dmgOf = (ev: BattleEvent[], id?: string) =>
  ev.filter((e) => e.type === 'damage' && (!id || e.unitId === id)) as Extract<BattleEvent, { type: 'damage' }>[];

describe('掩体 / Resistance', () => {
  it('半掩体：Resistance → 伤害减半、不倒地、不给 1 More；全掩体正面：枪击落空', () => {
    const b = mk(['J . . . P', '. h . H .', '. 1 . 2 .', '. . . . .'], { J: JOKER, P: PANTHER, '1': dummy('e1'), '2': dummy('e2') });
    b.move('joker', { x: 1, y: 0 });
    const ev = b.shoot('joker', 'e1');
    expect(dmgOf(ev)[0].amount).toBe(6); // 12 × 0.5
    expect(dmgOf(ev)[0].resist).toBe(true);
    expect(b.unit('e1').downed).toBe(false);
    expect(types(ev)).not.toContain('oneMore');
    b.move('panther', { x: 3, y: 0 });
    const ev2 = b.shoot('panther', 'e2');
    expect(types(ev2)).toContain('miss');
    expect(dmgOf(ev2)).toHaveLength(0);
    expect(b.unit('e2').hp).toBe(100);
  });

  it('全掩体被绕到侧面：不再落空，但仍有 Resistance（p5t 模式）', () => {
    const b = mk(['. H . .', '. 1 . J', '. . . .'], { J: JOKER, '1': dummy('e1') });
    const ev = b.shoot('joker', 'e1');
    expect(types(ev)).not.toContain('miss');
    expect(dmgOf(ev)[0].amount).toBe(6);
    expect(b.unit('e1').downed).toBe(false);
  });

  it('p5t 模式：贴着掩体即 Resistance，与方向无关；directional 模式：侧面可打倒', () => {
    const rows = ['. h . .', '. 1 . J', '. . . .'];
    const p5t = mk(rows, { J: JOKER, '1': dummy('e1') });
    expect(p5t.hasResistance(p5t.unit('e1'), p5t.unit('joker').pos)).toBe(true);
    const dir = new Battle({ id: 't', name: 't', turnTarget: 3, win: { type: 'defeatAll' }, ...parseMap(rows, { J: JOKER, '1': dummy('e1') }) }, { coverModel: 'directional' });
    dir.start();
    expect(dir.hasResistance(dir.unit('e1'), dir.unit('joker').pos)).toBe(false);
    expect(dir.hasResistance(dir.unit('e1'), { x: 1, y: -2 })).toBe(true);
    expect(types(dir.shoot('joker', 'e1'))).toContain('oneMore');
  });

  it('技能打破 Resistance（本次不倒地），下一发即可打倒；技能无视墙体视线', () => {
    const b = mk(['. h . .', '. 1 # P', '. . . .', 'J . . .'], { J: JOKER, P: PANTHER, '1': dummy('e1') });
    expect(b.grid.lineOfSight(b.unit('panther').pos, b.unit('e1').pos)).toBe(false);
    const ev = b.skill('panther', 'agi', 'e1');
    expect(types(ev)).toContain('resistBroken');
    expect(types(ev)).not.toContain('down');
    // 灼烧轻微击退：向西推 1 格
    expect(b.unit('e1').pos).toEqual({ x: 0, y: 1 });
    const ev2 = b.shoot('joker', 'e1');
    expect(types(ev2)).toEqual(expect.arrayContaining(['down', 'oneMore']));
  });
});

describe('1 More', () => {
  it('命中无 Resistance 的敌人 → 倒地 → 1 More，可再移动再行动，且可对不同敌人连锁', () => {
    const b = mk(['. . . . .', '. 1 . 2 .', '. . . . .', 'J . . . .'], { J: JOKER, '1': dummy('e1'), '2': dummy('e2') });
    const j = b.unit('joker');
    b.move('joker', { x: 1, y: 3 });
    const ev = b.shoot('joker', 'e1');
    expect(types(ev)).toEqual(expect.arrayContaining(['down', 'oneMore']));
    expect(j.oneMore).toBe(true);
    expect(j.acted).toBe(false);
    // 1 More 后从新位置重新计算移动范围
    expect(j.anchor).toEqual({ x: 1, y: 3 });
    expect(types(b.move('joker', { x: 3, y: 3 }))).toContain('move');
    const ev2 = b.shoot('joker', 'e2');
    expect(types(ev2)).toEqual(expect.arrayContaining(['down', 'oneMore'])); // 连锁
    // 打已倒地的敌人：不再倒地、不给 1 More → 唯一我方行动完 → 敌方回合 → 第 2 回合
    const ev3 = b.shoot('joker', 'e1');
    expect(types(ev3)).not.toContain('oneMore');
    expect(b.turn).toBe(2);
  });

  it('行动前可反复改位置（从起点算范围），行动后不能再动', () => {
    const b = mk(['J . . . . .', '1 . . . . .'], { J: { ...JOKER, move: 3 }, '1': dummy('e1') });
    b.move('joker', { x: 3, y: 0 });
    expect(types(b.move('joker', { x: 2, y: 0 }))).toContain('move'); // 改主意
    expect(types(b.move('joker', { x: 5, y: 0 }))).toContain('error'); // 起点算超出 3 格
    b.move('joker', { x: 0, y: 0 });
    expect(b.unit('joker').moved).toBe(false);
  });

  it('倒地的敌人在敌方回合开始时起身', () => {
    const b = mk(['. 1 .', '. . .', 'J . .'], { J: JOKER, '1': dummy('e1') });
    b.shoot('joker', 'e1');
    const ev = b.endPlayerPhase();
    expect(types(ev)).toContain('standUp');
    expect(b.unit('e1').downed).toBe(false);
    expect(b.turn).toBe(2);
  });
});

describe('近战', () => {
  it('近战掩体里的敌人：减伤不倒地，但把它推出原格、攻击者占位、打破 Resistance', () => {
    const b = mk(['. h . .', '. 1 J .', '. . . P'], { J: JOKER, P: PANTHER, '1': dummy('e1') });
    const ev = b.melee('joker', 'e1');
    expect(dmgOf(ev)[0].amount).toBe(7); // 14 × 0.5
    expect(types(ev)).toEqual(expect.arrayContaining(['knockback', 'meleeStep', 'resistBroken']));
    expect(types(ev)).not.toContain('down');
    expect(b.unit('e1').pos).toEqual({ x: 0, y: 1 });
    expect(b.unit('joker').pos).toEqual({ x: 1, y: 1 });
    expect(types(b.shoot('panther', 'e1'))).toEqual(expect.arrayContaining(['down', 'oneMore']));
  });

  it('近战空地上的敌人：倒地 + 1 More', () => {
    const b = mk(['. . . .', '. 1 J .', '. . . .'], { J: JOKER, '1': dummy('e1') });
    expect(types(b.melee('joker', 'e1'))).toEqual(expect.arrayContaining(['down', 'oneMore']));
  });

  it('击退被墙挡住：原地不动，攻击者也不前进', () => {
    const b = mk(['#', '1', 'J'], { J: JOKER, '1': dummy('e1') });
    const ev = b.melee('joker', 'e1');
    const kb = ev.find((e) => e.type === 'knockback') as Extract<BattleEvent, { type: 'knockback' }>;
    expect(kb.blocked).toBe(true);
    expect(b.unit('e1').pos).toEqual({ x: 0, y: 1 });
    expect(b.unit('joker').pos).toEqual({ x: 0, y: 2 });
  });

  it('把敌人推向另一个敌人：两者都失去 Resistance', () => {
    const b = mk(['h h . .', '2 1 J P'], { J: JOKER, P: PANTHER, '1': dummy('e1'), '2': dummy('e2') });
    const ev = b.melee('joker', 'e1');
    const kb = ev.find((e) => e.type === 'knockback') as Extract<BattleEvent, { type: 'knockback' }>;
    expect(kb.collidedWith).toBe('e2');
    expect(b.unit('e2').resistBroken).toBe(true);
    expect(b.unit('e1').resistBroken).toBe(true);
  });
});

describe('Triple Threat', () => {
  it('倒地敌人在三名我方的三角内 → 可总攻，三角内敌人全部受伤', () => {
    const b = mk(['. . P . 3', '. . . . .', '. . 1 . .', '. . 2 . .', 'J . . . S'], {
      J: JOKER, S: SKULL, P: PANTHER, '1': dummy('e1'), '2': dummy('e2'), '3': dummy('e3'),
    });
    expect(b.triangleVictims().sort()).toEqual(['e1', 'e2']);
    const ev = b.shoot('joker', 'e1');
    expect(types(ev)).toContain('tripleThreatReady');
    expect(b.pendingTriple?.targetId).toBe('e1');
    const ev2 = b.tripleThreat();
    const tt = ev2.find((e) => e.type === 'tripleThreat') as Extract<BattleEvent, { type: 'tripleThreat' }>;
    expect(tt.victims.sort()).toEqual(['e1', 'e2']);
    const dmg = dmgOf(ev2);
    expect(dmg.map((d) => d.unitId).sort()).toEqual(['e1', 'e2']);
    expect(dmg[0].amount).toBe(14 + 18 + 10);
    expect(b.unit('e3').hp).toBe(100);
    expect(b.unit('joker').acted).toBe(true); // 总攻用掉 1 More
  });

  it('打倒后让未行动的队友走位围出三角，再发动（原作允许先调整站位）', () => {
    const b = mk(['. . 1 . .', '. . . . .', 'J . S P .', '. . . . .'], { J: JOKER, S: SKULL, P: PANTHER, '1': dummy('e1') });
    const ev = b.shoot('joker', 'e1');
    expect(types(ev)).toContain('oneMore');
    expect(types(ev)).not.toContain('tripleThreatReady'); // 三人共线
    expect(b.pendingTriple).toBeNull();
    b.move('panther', { x: 3, y: 0 }); // 杏走到敌人右侧上方
    b.move('skull', { x: 2, y: 3 }); // 龙司退到下方
    // 三角 J(0,2) P(3,0) S(2,3) 包住 e1(2,0)? 不在 → 调整：杏到 (4,0)，Joker 不动
    b.move('panther', { x: 4, y: 0 });
    b.move('skull', { x: 1, y: 0 });
    expect(b.pendingTriple?.victims).toContain('e1');
    expect(types(b.tripleThreat())).toContain('tripleThreat');
  });

  it('不在三角内 → 只给 1 More，不能总攻', () => {
    const b = mk(['. . . . 1', '. . . . .', 'J . S . P'], { J: JOKER, S: SKULL, P: PANTHER, '1': dummy('e1') });
    const ev = b.shoot('panther', 'e1');
    expect(types(ev)).toContain('oneMore');
    expect(types(ev)).not.toContain('tripleThreatReady');
    expect(types(b.tripleThreat())).toContain('error');
  });

  it('三角判定含边、共线不算', () => {
    expect(pointInTriangle({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 2 })).toBe(true);
    expect(pointInTriangle({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 })).toBe(false);
  });
});

describe('异常状态', () => {
  it('感电：敌人下回合不能移动；绝望：施法者下回合移动力 + 目标移动力', () => {
    const b = mk(['. . . . . .', 'S . 1 . . .', 'J . . . . .'], {
      J: JOKER, S: SKULL, '1': { ...dummy('e1', 100), move: 3, melee: 5 },
    });
    b.skill('skull', 'zio', 'e1');
    b.skill('joker', 'eiha', 'e1'); // 已有异常 → 无 Resistance，但已倒地不重复
    const ev = b.endPlayerPhase();
    expect(types(ev)).toContain('skipTurn');
    expect(b.unit('e1').pos).toEqual({ x: 2, y: 1 });
    expect(b.moveRange(b.unit('joker'))).toBe(4 + 3);
  });
});

describe('敌方回合与胜负', () => {
  it('敌人显示意图，敌方回合会移动并攻击最近的我方', () => {
    const b = mk(['. . . . . .', '. . . . . 1', 'J . . . . .'], {
      J: JOKER, '1': { ...dummy('e1', 50), move: 5, melee: 10 },
    });
    expect(b.intents[0].targetId).toBe('joker');
    expect(b.intents[0].threatTiles.length).toBeGreaterThan(0);
    const ev = b.endPlayerPhase();
    expect(types(ev)).toEqual(expect.arrayContaining(['enemyThink', 'move', 'attack', 'damage']));
    expect(b.unit('joker').hp).toBeLessThan(60);
  });

  it('敌人打倒空地上的我方也获得 1 More；我方在掩体旁则不会被打倒', () => {
    const b = mk(['J . 1 . S', '. . . . h'], { J: JOKER, S: SKULL, '1': { ...dummy('e1', 100), move: 0, melee: 3, ai: 'ranged', gun: { power: 4, range: 5 } } });
    const ev = b.endPlayerPhase();
    expect(types(ev)).toContain('oneMore');
    const downs = ev.filter((e) => e.type === 'down') as Extract<BattleEvent, { type: 'down' }>[];
    expect(downs.map((d) => d.unitId)).toContain('joker');
    expect(downs.map((d) => d.unitId)).not.toContain('skull'); // 龙司贴着半掩体
  });

  it('远程敌人倾向站到掩体后', () => {
    const b = mk(['J . . . . .', '. . . . . .', '. . . h . .', '. . . . . 1'], {
      J: JOKER, '1': { ...dummy('e1', 50), ai: 'ranged', move: 3, gun: { power: 8, range: 7, ammo: 9 } },
    });
    b.endPlayerPhase();
    const e = b.unit('e1');
    expect(b.grid.hasAnyCover(e.pos)).toBeGreaterThan(0);
  });

  it('击败全部 → 胜利 + 皇冠', () => {
    const b = mk(['. 1', 'J .'], { J: JOKER, '1': dummy('e1', 5) });
    const ev = b.shoot('joker', 'e1');
    const r = ev.find((e) => e.type === 'result') as Extract<BattleEvent, { type: 'result' }>;
    expect(r.outcome).toBe('won');
    expect(r.crowns.count).toBe(3);
  });

  it('到达出口 / 击败目标', () => {
    const b = mk(['J . E', '. . .', '. . 1'], { J: JOKER, '1': dummy('e1') }, { win: { type: 'reachExit' } });
    const ev = b.move('joker', { x: 2, y: 0 });
    expect(b.phase).toBe('won');
    expect(types(ev)).toContain('result');
    const b2 = mk(['J 1 2'], { J: JOKER, '1': dummy('boss', 5, { isTarget: true }), '2': dummy('e2') }, { win: { type: 'defeatTarget', targetId: 'boss' } });
    b2.melee('joker', 'boss');
    expect(b2.phase).toBe('won');
  });

  it('Joker 倒下 → 失败', () => {
    const b = mk(['J 1'], { J: { ...JOKER, maxHp: 5 }, '1': { ...dummy('e1'), melee: 20 } });
    b.endPlayerPhase();
    expect(b.phase).toBe('lost');
  });
});

describe('测试图整关', () => {
  it('贪心自动玩家能在回合上限内打完测试图', () => {
    const b = new Battle(testMap());
    b.start();
    let guard = 0;
    while (b.phase === 'player' && guard++ < 200) {
      if (b.pendingTriple) { b.tripleThreat(); continue; }
      const u = b.alive('ally').find((a) => !a.acted);
      if (!u) { b.endPlayerPhase(); continue; }
      // 找一个落点+目标：优先能打出倒地（无掩体）的，其次伤害最高
      let best: { dest: { x: number; y: number } | null; target: string; kind: 'melee' | 'gun' | 'skill'; skill?: string; score: number } | null = null;
      const dests = u.moved ? [u.pos] : [u.pos, ...b.moveTiles(u)];
      for (const d of dests) for (const e of b.alive('enemy')) {
        const opts: { kind: 'melee' | 'gun' | 'skill'; skill?: string; ok: boolean; pw: number }[] = [
          { kind: 'melee', ok: b.canMelee(u, e, d), pw: u.melee },
          { kind: 'gun', ok: b.canShoot(u, e, d), pw: u.gun?.power ?? 0 },
          ...u.skills.map((s) => ({ kind: 'skill' as const, skill: s.id, ok: b.canSkill(u, s, e, d), pw: s.power })),
        ];
        for (const o of opts) {
          if (!o.ok) continue;
          const cov = b.grid.coverAgainst(e.pos, d);
          const score = (cov === 0 && !e.downed ? 50 : 0) + o.pw * (cov ? 0.5 : 1) - (o.kind === 'skill' ? 3 : 0);
          if (!best || score > best.score) best = { dest: d === u.pos ? null : d, target: e.id, kind: o.kind, skill: o.skill, score };
        }
      }
      if (!best) {
        // 走向最近的敌人
        const e = b.alive('enemy')[0];
        const tiles = b.moveTiles(u).sort((p, q) => Math.abs(p.x - e.pos.x) + Math.abs(p.y - e.pos.y) - Math.abs(q.x - e.pos.x) - Math.abs(q.y - e.pos.y));
        if (tiles[0] && !u.moved) b.move(u.id, tiles[0]);
        b.wait(u.id);
        continue;
      }
      if (best.dest) b.move(u.id, best.dest);
      if (best.kind === 'melee') b.melee(u.id, best.target);
      else if (best.kind === 'gun') b.shoot(u.id, best.target);
      else b.skill(u.id, best.skill!, best.target);
    }
    expect(b.phase).toBe('won');
    expect(b.turn).toBeLessThanOrEqual(10);
  });
});
