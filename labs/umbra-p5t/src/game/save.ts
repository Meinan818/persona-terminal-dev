// Q8 存档：关卡进度、三星、队伍、道具 → localStorage（存储可注入，测试用假的）
import type { CrownResult } from '../rules/types';

export const SAVE_KEY = 'umbra-p5t-save';
export const SAVE_VERSION = 1;

/** localStorage 的最小接口（便于测试注入） */
export interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

export interface LevelProgress {
  cleared: boolean;
  /** 历史最好星数（0–3，按 CrownResult.count） */
  stars: number;
  /** 每一条奖励条件是否拿过（id → true），星数取并集还是单局最好：按原作「单项达成后永久记录」取并集 */
  awards: Record<string, boolean>;
  /** 最少通关回合 */
  bestTurns: number | null;
  plays: number;
}
export interface SaveData {
  version: number;
  levels: Record<string, LevelProgress>;
  /** 当前队伍（角色 id，出场顺序） */
  party: string[];
  /** 道具 / 货币（id → 数量），宝箱 reward 直接加进来 */
  items: Record<string, number>;
  updatedAt: number;
}

export const DEFAULT_PARTY = ['joker', 'skull', 'mona'];
export function newSave(): SaveData {
  return { version: SAVE_VERSION, levels: {}, party: [...DEFAULT_PARTY], items: {}, updatedAt: 0 };
}

function defaultStore(): KV | null {
  try { return (globalThis as { localStorage?: KV }).localStorage ?? null; } catch { return null; }
}

/** 读档：没有 / 损坏 / 版本不对 → 新档（损坏的原文备份到 KEY+'.bak'） */
export function loadSave(store: KV | null = defaultStore()): SaveData {
  if (!store) return newSave();
  const raw = store.getItem(SAVE_KEY);
  if (!raw) return newSave();
  try {
    const d = JSON.parse(raw) as Partial<SaveData>;
    if (d.version !== SAVE_VERSION || typeof d.levels !== 'object' || !d.levels) throw new Error('bad save');
    return {
      version: SAVE_VERSION,
      levels: d.levels,
      party: Array.isArray(d.party) && d.party.length ? d.party : [...DEFAULT_PARTY],
      items: d.items && typeof d.items === 'object' ? d.items : {},
      updatedAt: d.updatedAt ?? 0,
    };
  } catch {
    store.setItem(SAVE_KEY + '.bak', raw);
    return newSave();
  }
}

export function writeSave(s: SaveData, store: KV | null = defaultStore(), now = Date.now()): void {
  s.updatedAt = now;
  store?.setItem(SAVE_KEY, JSON.stringify(s));
}

export function clearSave(store: KV | null = defaultStore()) { store?.removeItem(SAVE_KEY); }

/** 记录一局结果（输赢都算一次游玩；赢了更新通关/星/回合，并把宝箱奖励记进道具） */
export function recordResult(s: SaveData, levelId: string, r: { outcome: 'won' | 'lost'; turn: number; crowns: CrownResult; loot?: Record<string, number> }): SaveData {
  const p: LevelProgress = s.levels[levelId] ?? { cleared: false, stars: 0, awards: {}, bestTurns: null, plays: 0 };
  p.plays++;
  if (r.outcome === 'won') {
    p.cleared = true;
    for (const it of r.crowns.items) if (it.ok) p.awards[it.id] = true;
    p.stars = Math.max(p.stars, r.crowns.count, Object.values(p.awards).filter(Boolean).length);
    p.stars = Math.min(3, p.stars);
    p.bestTurns = p.bestTurns == null ? r.turn : Math.min(p.bestTurns, r.turn);
    for (const [k, n] of Object.entries(r.loot ?? {})) s.items[k] = (s.items[k] ?? 0) + n;
  }
  s.levels[levelId] = p;
  return s;
}

/** 关卡解锁：第一关永远开；之后前一关通关才开 */
export function isUnlocked(s: SaveData, levelIds: string[], id: string): boolean {
  const i = levelIds.indexOf(id);
  if (i <= 0) return i === 0;
  return !!s.levels[levelIds[i - 1]]?.cleared;
}

export function setParty(s: SaveData, party: string[]): SaveData { s.party = [...party]; return s; }
export function addItem(s: SaveData, id: string, n = 1): SaveData { s.items[id] = Math.max(0, (s.items[id] ?? 0) + n); return s; }
