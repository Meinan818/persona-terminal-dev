/**
 * 占卜数据适配（红频道 · adapter/，允许修改）
 *
 * 红频道的星象页 / 图鉴原本读 d4.ts 里的演示常量（DRAW3 / LR_CARDS / PERIOD / 固定档案行）。
 * 这里把真实仓库的占卜状态投影成同形状的数据，并建立「真实塔罗 id → demo 卡对象」的映射，
 * 让 d4.ts 的 tarotFace / cardBack 继续按原样渲染，只把内容换成真实的。
 *
 * 数据来源：
 *   · 今日塔罗      useAppStore.dailyDivination（date === 今天才有效）
 *   · 中长期占卜    useAppStore.longReadings + saveLongReading / appendLongReadingFollowUp / archiveLongReading / deleteLongReading
 *   · 抽牌与解读    utils/tarotJobs（与蓝粉黄同一套任务：切页不打断、可续写）
 *   · 牌面素材      d4.ts 的 MAJ_FILE 顺序与 constants/tarot.ts 的 MAJOR_ARCANA 逐位对应
 */
import { TAROT_BY_ID, MAJOR_ARCANA, SPREAD_POSITIONS, BASE_POSITION, PERIOD_LABELS } from '@/constants/tarot';
import { drawRandomCards, randomOrientation, randomBonusMultiplier } from '@/constants/tarot';
import type { DailyDivination, DrawnCard, LongReading, LongReadingPeriod, TarotOrientation } from '@/types';

/** demo 卡对象（d4.ts MAJ 的形状）：只需要 id / name / en / no / major 这几个字段给 tarotFace 用 */
export interface DemoCard { id: string; name: string; en: string; no: string; major: boolean; nameEn?: string }

/**
 * 真实塔罗 id（fool / high_priestess / …）→ demo 卡对象。
 * MAJ_FILE 的顺序就是 MAJOR_ARCANA 的顺序，所以按下标取即可；小阿卡纳按 id 还原 suit_rank。
 */
export function demoCardOf(realId: string): DemoCard | null {
  const idx = MAJOR_ARCANA.findIndex((c) => c.id === realId);
  if (idx >= 0) {
    const c = MAJOR_ARCANA[idx];
    return { id: 'm' + idx, name: c.name, en: c.nameEn, no: c.roman ?? String(c.number), major: true };
  }
  const real = TAROT_BY_ID[realId];
  if (!real) return null;
  // 小阿卡纳：demo id 形如 wands0..pentacles13，用 suit + 序号还原，牌名与 constants 一致
  const suitKey = realId.replace(/\d+$/, '');
  const num = Number(realId.slice(suitKey.length));
  if (!Number.isFinite(num)) return null;
  return { id: `${suitKey}${num - 1}`, name: real.name, en: real.nameEn, no: real.roman ?? String(num), major: false };
}

/** 逆位标记 → demo 的 rev 参数 */
export const demoRev = (o: TarotOrientation | undefined): boolean => o === 'reversed';

/** 牌阵位置（真实 constants/tarot.ts 与 demo PERIOD 同口径，按周期切换） */
export function spreadPositions(period: LongReadingPeriod, count: number): string[] {
  const base = SPREAD_POSITIONS[period] as readonly string[];
  return count === base.length + 1 ? [BASE_POSITION, ...base] : [...base];
}

/** 周期标签（demo PERIOD 的展示位：名称 / 副标题 / 时效） */
export const periodLabel = (period: LongReadingPeriod): { label: string; hint: string; days: string } => {
  const m = PERIOD_LABELS[period];
  return { label: m.label, hint: m.hint, days: m.days };
}

/** 今日塔罗是否已抽（只认今天那一张） */
export function todayDivination(s: { dailyDivination: DailyDivination | null }, today: string): DailyDivination | null {
  const d = s.dailyDivination;
  return d && d.date === today ? d : null;
}

/** 洗牌：从 22 张大阿卡纳抽三张候选（与蓝粉黄同口径） */
export function rollDailyCandidates(): DrawnCard[] {
  return drawRandomCards(3, MAJOR_ARCANA).map((card) => ({ cardId: card.id, orientation: randomOrientation() }));
}

/** 加成倍率（正位 1.5 / 逆位 1.2，与真实仓库 randomBonusMultiplier 同源） */
export const bonusMultiplierOf = (o: TarotOrientation): number => randomBonusMultiplier(o);

/** 中长期：抽 6 张候选 */
export function rollLongCandidates(): DrawnCard[] {
  return drawRandomCards(6, MAJOR_ARCANA).map((card) => ({ cardId: card.id, orientation: randomOrientation() }));
}

/** 中长期档案行（真实 longReadings → demo 档案列表形状） */
export interface ArchiveRow { id: string; question: string; period: LongReadingPeriod; date: string; state: 'active' | 'archived' }
export function archiveRows(readings: LongReading[], today: string): ArchiveRow[] {
  return [...readings]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .map((r) => ({
      id: r.id,
      question: r.question,
      period: r.period,
      date: dotDate(r.createdAt),
      state: r.archived || r.expiresAt < today ? 'archived' : 'active',
    }));
}

const dotDate = (d: Date | string): string => {
  const x = new Date(d);
  const p = (n: number) => String(n).padStart(2, '0');
  return Number.isNaN(+x) ? '' : `${x.getFullYear()}.${p(x.getMonth() + 1)}.${p(x.getDate())}`;
};
