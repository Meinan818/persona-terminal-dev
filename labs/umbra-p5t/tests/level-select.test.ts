// Q12 关卡选择（逻辑部分）
import { describe, expect, it } from 'vitest';
import { levelEntries, trackResult } from '../src/game/levelSelect';
import { levelMap } from '../src/game/levels';
import { loadSave, newSave, recordResult, type KV } from '../src/game/save';
import { Battle } from '../src/rules';

class Mem implements KV { m = new Map<string, string>(); getItem(k: string) { return this.m.get(k) ?? null; } setItem(k: string, v: string) { this.m.set(k, v); } removeItem(k: string) { this.m.delete(k); } }

describe('Q12 关卡选择', () => {
  it('列出 L01–L10（名字、目标、星、解锁）', () => {
    const s = newSave();
    recordResult(s, 'L01', { outcome: 'won', turn: 4, crowns: { clear: true, withinTurns: true, noKo: false, count: 2, items: [{ id: 'clear', label: '', ok: true }, { id: 'withinTurns', label: '', ok: true }, { id: 'noKo', label: '', ok: false }] } });
    const list = levelEntries(s);
    expect(list.map((l) => l.id)).toEqual(['L01', 'L02', 'L03', 'L04', 'L05', 'L06', 'L07', 'L08', 'L09', 'L10']);
    expect(list[0]).toMatchObject({ name: '城下町·广场入口', stars: 2, cleared: true, unlocked: true });
    expect(list[1].unlocked).toBe(true);
    expect(list[2].unlocked).toBe(false);
    expect(list[5].objective).toBe('护送 Toshiro 到出口');
  });
  it('选关开局后，战斗结束自动写存档', () => {
    const st = new Mem();
    const b = new Battle(levelMap('L01'));
    trackResult(b, 'L01', st);
    b.start();
    for (const e of b.alive('enemy')) { e.hp = 0; e.ko = true; }
    b.checkEnd();
    expect(b.phase).toBe('won');
    expect(loadSave(st).levels.L01.cleared).toBe(true);
  });
});
