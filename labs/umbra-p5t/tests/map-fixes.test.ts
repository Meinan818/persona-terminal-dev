// 10-23 Hark 图纸修正（gen_levels.py）：L10 阳台梯子、L05 地面↔塔顶 + 升降台↔两塔梯子 —— 用引擎自己的寻路验证真的走得上去
import { describe, expect, it } from 'vitest';
import { levelMap } from '../src/game/levels';
import { Battle } from '../src/rules';
import { key } from '../src/rules/grid';
import type { Vec } from '../src/rules/types';

/** 不限步数、可多次 Dash 的闭包（空场，只看地形/门/梯子） */
function closure(b: Battle, start: Vec): Set<string> {
  const seen = new Set<string>([key(start)]);
  let frontier: Vec[] = [start];
  while (frontier.length) {
    const next: Vec[] = [];
    for (const p of frontier) {
      for (const n of b.grid.reachable(p, 99, new Set(), new Set(), true, 99).values()) {
        const k = key(n.pos);
        if (!seen.has(k)) { seen.add(k); next.push(n.pos); }
      }
    }
    frontier = next;
  }
  return seen;
}

describe('Hark 图纸修正（10-23）', () => {
  it('L10：门打开后，从出发点能爬梯子上 C 区阳台（1 层）', () => {
    const b = new Battle(levelMap('L10'));
    b.start();
    expect(b.grid.linkUsable({ a: { x: 6, y: 4 }, b: { x: 6, y: 3 }, kind: 'ladder' })).toBe(true);
    b.setDoor('D1', true); b.setDoor('D2', true);
    const s = closure(b, b.unit('joker').pos);
    for (const p of [{ x: 6, y: 3 }, { x: 13, y: 3 }, { x: 9, y: 2 }]) expect(s.has(key(p))).toBe(true);
  });
  it('L05：地面能上两座塔顶（2 层）；升降台在低位时梯子通向两塔', () => {
    const b = new Battle(levelMap('L05'));
    b.start();
    const links = b.map.links ?? [];
    const has = (a: Vec, c: Vec) => links.some((l) => (key(l.a) === key(a) && key(l.b) === key(c)) || (key(l.a) === key(c) && key(l.b) === key(a)));
    expect(has({ x: 8, y: 5 }, { x: 5, y: 4 })).toBe(true);
    expect(has({ x: 9, y: 9 }, { x: 5, y: 4 })).toBe(true);
    expect(has({ x: 10, y: 9 }, { x: 14, y: 4 })).toBe(true);
    for (const l of links) expect(b.grid.linkUsable(l)).toBe(true);
    const s = closure(b, b.unit('joker').pos);
    expect(s.has(key({ x: 3, y: 2 }))).toBe(true);
    expect(s.has(key({ x: 16, y: 2 }))).toBe(true);
  });
});
