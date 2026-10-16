/**
 * 羁绊链「恭喜整页 / 星移四屏」两件的换装判据 —— 计划 Wave 2 / Wave 3 共用。
 *
 * 口径：**只有红频道（p5）换 P5 红黑剪报版，其余频道（p3 / p4 / neutral）一律沿用原 P3R 版**。
 *
 * ⚠ 与演出那条判据（confidantRankUpShared.rankUpVariantFor）**不是同一条，别顺手复用**：
 *   演出在 p4 / neutral 下是「本期不出新演出」（那条返回 null，出队跳过）；
 *   而恭喜整页与星移四屏在 p4 / neutral 下**本来就在显示**（它们对所有频道都渲染，
 *   配色走各主题的 --p3r-* 变量）。若照搬演出的判据，p4 / neutral 用户点开这两件会看到
 *   一片空白 —— 那是行为倒退，不是「换皮」。
 *
 * 抽成纯函数的理由与 Wave 1 同：本项目 vitest 只收 `src/**\/*.test.ts`，
 * 判据脱离 React / store 独立可测；组件里的包装只做一次 `if`。
 */
import type { UIChannel } from '@/ui/channel';

export type ConfidantLivery = 'p5' | 'legacy';

/** 该频道下这两件走哪一版：p5 → 红黑剪报版；其余 → 原 P3R 版 */
export const confidantLiveryFor = (channel: UIChannel): ConfidantLivery =>
  channel === 'p5' ? 'p5' : 'legacy';
