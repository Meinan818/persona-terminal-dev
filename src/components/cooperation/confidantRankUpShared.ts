/**
 * 羁绊升级演出的两版（p3 蓝 / p5 红）共用的一小撮东西。
 *
 * 为什么单独成文件、而不是放在任一版里：两版读的是**同一条** store 队列（confidantRankUpQueue）、
 * 同一套缓动常量与同一个占位同伴；而包装组件又要按频道在两者间分流。
 * 若让 p5 版去 import p3 版，就会形成「p3 版 import p5 版（为了分流）、p5 版 import p3 版（为了常量）」
 * 的循环——抽到这里两边都只依赖本文件，方向单一。
 */
import type { Confidant } from '@/types';
import type { UIChannel } from '@/ui/channel';

/** 缓动：入场（慢出）、回弹、砸落 */
export const EXP = 'cubic-bezier(.16,1,.3,1)';
export const OVER = 'cubic-bezier(.34,1.56,.64,1)';
export const SLAM = 'cubic-bezier(.15,.95,.1,1)';

/**
 * 本次升级演出在这个频道下该走哪一版。
 *
 *   'p5' → 红黑剪报版（本文件所在目录的 ConfidantRankUpCutInP5）
 *   'p3' → 深蓝水下版（原有实现，含粉主题换色皮）
 *   null → 本期不出新演出（黄频道 p4 与中性 neutral 维持既有行为）
 *
 * 抽成纯函数是为了能单测——本项目 vitest 只收 `src/**\/*.test.ts`、且惯例是让这层判据
 * 脱离 React / store 独立可测（见 backSkin.ts 的同款理由）。组件里的包装只做一次 `if`。
 *
 * ⚠ 修复来历：此前演出只认 `channel === 'p3'`，红主题（red→p5）被判为「非 p3」直接跳过——
 * 红主题用户升羁绊时**看不到演出**，只剩事后打开档案的补弹兜底。这不是皮不对，是功能缺失。
 */
export const rankUpVariantFor = (channel: UIChannel): 'p5' | 'p3' | null =>
  channel === 'p5' ? 'p5' : channel === 'p3' ? 'p3' : null;

/** 以 0 为中心的对称随机抖动 */
export const rand = (n: number) => (Math.random() - 0.5) * n;

/**
 * 开发预览（`?rankup`）在**没有任何**同伴时用的占位同伴——全新档案 / 无头浏览器
 * 也能把演出本身放出来核对。只有 `notice.preview` 为真时才会用到它。
 */
export const PREVIEW_CONFIDANT = {
  id: '__rankup_preview__',
  userId: '__preview__',
  source: 'offline',
  name: '预览同伴',
  arcanaId: 'fool',
  orientation: 'upright',
  description: '',
  aiInterpretation: '',
  aiAdvice: '',
  intimacy: 4,
  intimacyPoints: 0,
  buffs: [],
  decayEnabled: false,
  createdAt: new Date(0),
} as unknown as Confidant;
