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
 *   'p5' → 红黑剪报版（ConfidantRankUpCutInP5）
 *   'p4' → 黄色电视节目版（ConfidantRankUpCutInP4）
 *   'p3' → 深蓝水下版（原有实现，含粉主题换色皮）
 *   null → 本期不出新演出（中性 neutral 维持既有行为）
 *
 * 抽成纯函数是为了能单测——本项目 vitest 只收 `src/**\/*.test.ts`、且惯例是让这层判据
 * 脱离 React / store 独立可测（见 backSkin.ts 的同款理由）。组件里的包装只做一次 `if`。
 *
 * ⚠ 修复来历：此前演出只认 `channel === 'p3'`，红主题（red→p5）被判为「非 p3」直接跳过——
 * 红主题用户升羁绊时**看不到演出**，只剩事后打开档案的补弹兜底。这不是皮不对，是功能缺失。
 */
export const rankUpVariantFor = (channel: UIChannel): 'p5' | 'p4' | 'p3' | null =>
  channel === 'p5' ? 'p5' : channel === 'p4' ? 'p4' : channel === 'p3' ? 'p3' : null;

/** 以 0 为中心的对称随机抖动 */
export const rand = (n: number) => (Math.random() - 0.5) * n;

/**
 * 手机档的「轻量演出」判据。
 *
 * 演出的装饰件（碎片/火星/集中线/同心星层）在桌面上是质感，在手机上主要是
 * 每帧的样式重算与大面积合成。宽度 ≤640px 时减量；不改信息、不改主分镜。
 */
export const compactFx = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 640px)').matches;

/**
 * 开发预览（`?rankup`）在**没有任何**同伴时用的占位同伴——全新档案 / 无头浏览器
 * 也能把演出本身放出来核对。只有 `notice.preview` 为真时才会用到它。
 */
export const PREVIEW_CONFIDANT = {
  id: '__rankup_preview__',
  userId: '__preview__',
  source: 'offline',
  name: '预览同伴',
  // 取「太阳」是为了与已验收的红版 demo 第二页（RANK 5 /《太阳》/挚友）同数据，
  // ?celebrate / ?rankup 的截图才能和 demo 做有意义的像素对账。
  arcanaId: 'sun',
  orientation: 'upright',
  description: '',
  aiInterpretation: '',
  aiAdvice: '',
  intimacy: 5,
  intimacyPoints: 0,
  // 与 demo 第二页同样的「新解锁的能力」一条，否则该纸卡整块不渲染、对账缺一块
  buffs: [{
    id: '__preview_buff__',
    kind: 'attribute',
    attribute: 'charm',
    value: 1,
    unlockAtLevel: 5,
    title: '太阳的指引',
    description: '每天首次为「灵巧」加点时，额外 +1 点（乘区外，每日一次）',
  }],
  decayEnabled: false,
  // 星移次数：演出不读这个字段，但「恭喜整页」用它决定按钮组（有次数→两键）。
  // 给 1 是为了 ?celebrate 预览能看到完整的两键形态。
  starShiftCharges: 1,
  createdAt: new Date(0),
} as unknown as Confidant;
