// Q8 存档（mock localStorage）
import { describe, expect, it } from 'vitest';
import { loadSave, writeSave, recordResult, isUnlocked, setParty, addItem, clearSave, SAVE_KEY, newSave, type KV } from '../src/game/save';
import { LEVEL_IDS, levelMap } from '../src/game/levels';
import { Battle } from '../src/rules';
import type { CrownResult } from '../src/rules';

class Mem implements KV {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}
const crowns = (ok: boolean[]): CrownResult => {
  const items = ['clear', 'withinTurns', 'noKo'].map((id, i) => ({ id, label: id, ok: ok[i] }));
  return { clear: ok[0], withinTurns: ok[1], noKo: ok[2], items, count: ok.filter(Boolean).length };
};

describe('Q8 存档', () => {
  it('空存储 → 新档；写入后能原样读回（进度/三星/队伍/道具）', () => {
    const st = new Mem();
    const s = loadSave(st);
    expect(s).toEqual(newSave());
    recordResult(s, 'L01', { outcome: 'won', turn: 5, crowns: crowns([true, true, false]), loot: { gp: 3 } });
    setParty(s, ['joker', 'panther', 'fox']);
    addItem(s, 'medicine', 2);
    writeSave(s, st, 123);
    const back = loadSave(st);
    expect(back.levels.L01).toEqual({ cleared: true, stars: 2, awards: { clear: true, withinTurns: true }, bestTurns: 5, plays: 1 });
    expect(back.party).toEqual(['joker', 'panther', 'fox']);
    expect(back.items).toEqual({ gp: 3, medicine: 2 });
    expect(back.updatedAt).toBe(123);
  });
  it('三星取历史最好：单项达成永久记录；最少回合取最小；输了只加游玩次数', () => {
    const s = newSave();
    recordResult(s, 'L01', { outcome: 'won', turn: 8, crowns: crowns([true, false, true]) });
    recordResult(s, 'L01', { outcome: 'won', turn: 4, crowns: crowns([true, true, false]) });
    recordResult(s, 'L01', { outcome: 'lost', turn: 2, crowns: crowns([false, false, false]) });
    expect(s.levels.L01).toMatchObject({ stars: 3, bestTurns: 4, plays: 3, cleared: true });
  });
  it('关卡解锁：L01 永远开，后一关要前一关通关', () => {
    const s = newSave();
    expect(isUnlocked(s, LEVEL_IDS, 'L01')).toBe(true);
    expect(isUnlocked(s, LEVEL_IDS, 'L02')).toBe(false);
    recordResult(s, 'L01', { outcome: 'won', turn: 3, crowns: crowns([true, true, true]) });
    expect(isUnlocked(s, LEVEL_IDS, 'L02')).toBe(true);
    expect(isUnlocked(s, LEVEL_IDS, 'L03')).toBe(false);
  });
  it('损坏/旧版本存档 → 新档，原文备份到 .bak；clearSave 删除', () => {
    const st = new Mem();
    st.setItem(SAVE_KEY, '{oops');
    expect(loadSave(st)).toEqual(newSave());
    expect(st.getItem(SAVE_KEY + '.bak')).toBe('{oops');
    st.setItem(SAVE_KEY, JSON.stringify({ version: 0, levels: {} }));
    expect(loadSave(st).version).toBe(1);
    writeSave(newSave(), st);
    clearSave(st);
    expect(st.getItem(SAVE_KEY)).toBeNull();
  });
  it('没有 localStorage（node 环境）也不报错', () => {
    expect(loadSave(null)).toEqual(newSave());
    expect(() => writeSave(newSave(), null)).not.toThrow();
  });
  it('接战斗：真实一局的 crowns + 宝箱 loot 能记进存档', () => {
    const b = new Battle(levelMap('L02'));
    b.start();
    b.loot = { gp: 3 };
    const s = recordResult(newSave(), 'L02', { outcome: 'won', turn: 7, crowns: b.crowns('won'), loot: b.loot });
    expect(s.levels.L02.cleared).toBe(true);
    expect(s.items.gp).toBe(3);
  });
});
