import type { Confidant, ConfidantEvent } from '@/types';

/**
 * 羁绊升级「已庆祝」标记 —— 从 ConfidantDetailModal 抽出来，供两处共用：
 *   · App 顶层的升级演出（ConfidantRankUpCutIn）在**播放开始**时标记；
 *   · 详情弹窗打开档案时扫描「未庆祝的升级」并补弹（兜底：万一演出没播成，
 *     例如写库与演出之间 app 被杀，打开档案仍能看到祝贺，不会漏）。
 *
 * 两处共用同一把 localStorage 键，所以演出播过的等级不会再被档案补弹一次。
 * localStorage 不可用（隐私模式 / 被禁）时一律静默降级：
 * 读不到 = 当作没庆祝过，写不进 = 下次还会补弹一次——宁可多弹一次，也不要静默丢失。
 */
export const LEVEL_UP_CELEBRATED_PREFIX = 'velvet_confidant_level_celebrated';

export const levelCelebrationKey = (confidantId: string, level: number) =>
  `${LEVEL_UP_CELEBRATED_PREFIX}_${confidantId}_${level}`;

/** 从 level_up 事件里取「升到了几级」：优先新字段 toLevel，老数据退回解析 narrative 的 Lv.X */
export const parseLevelUpLevel = (event: ConfidantEvent): number | null => {
  if (typeof event.toLevel === 'number' && Number.isFinite(event.toLevel)) return event.toLevel;
  const match = event.narrative?.match(/Lv\.?\s*(\d+)/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
};

export const wasLevelCelebrated = (confidantId: string, level: number) => {
  try {
    return localStorage.getItem(levelCelebrationKey(confidantId, level)) === '1';
  } catch {
    return false;
  }
};

export const markLevelCelebrated = (confidantId: string, level: number) => {
  try {
    localStorage.setItem(levelCelebrationKey(confidantId, level), '1');
  } catch { /* ignore unavailable localStorage */ }
};

/** 扫出该同伴「已升到但还没庆祝过」的等级（升序、同级去重） */
export const findUncelebratedLevelUps = (confidant: Confidant, events: ConfidantEvent[]) => {
  const seen = new Set<number>();
  return events
    .filter(e => e.confidantId === confidant.id && e.type === 'level_up')
    .map(event => ({ event, level: parseLevelUpLevel(event) }))
    .filter((item): item is { event: ConfidantEvent; level: number } =>
      item.level !== null
      && item.level > 1
      && item.level <= confidant.intimacy
      && !seen.has(item.level)
      && !wasLevelCelebrated(confidant.id, item.level),
    )
    .sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return new Date(a.event.createdAt).getTime() - new Date(b.event.createdAt).getTime();
    })
    .filter(item => {
      if (seen.has(item.level)) return false;
      seen.add(item.level);
      return true;
    });
};
