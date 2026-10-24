/**
 * 红频道总入口（接入件 · 整包原样拷入 · 不要改）。
 * 正式仓库 src/App.tsx 只加两行（见 HANDOFF.md §0 第 5 步）：
 *   import RedChannelRoot from '@/p5r-red/RedChannelRoot';
 *   if ((uiChannel as string) === 'p5') return <RedChannelRoot battle={<BattleArena />} />;   ← 放在 `if (error) { … }` 之后（由 scripts/p5r-red/patch-app.mjs 加）
 * 与正式仓库的全部连接（store / 夜间 / 低动效）都在 ./adapter/live.ts —— 那里是唯一允许改的地方。
 */
import type { ReactNode } from 'react';
import RedChannelCore from '@/p5r-red/RedChannelCore';
import { RedGrowthHost } from '@/p5r-red/RedGrowthHost';
import { LIVE, useLiveFlags, syncLiveDataNow } from '@/p5r-red/adapter/live';
import { ConfidantRankUpCutIn, ConfidantStarShiftInvite } from '@/components/cooperation/ConfidantRankUpCutIn';
import { ConfidantP5FxLayer } from '@/components/cooperation/confidantP5Fx';

let firstSync = false;
export default function RedChannelRoot({ battle }: { battle?: ReactNode }) {
  // 首次渲染前同步一次：页面模块（pkg3 / pkg4 在模块初始化时读一次 mock）拿到的就是真实数据
  if (!firstSync) { firstSync = true; syncLiveDataNow(); }
  const { dark, lowMotion } = useLiveFlags();
  return (
    <>
      <RedChannelCore dark={dark} lowMotion={lowMotion} battle={battle} live={LIVE} />
      <RedGrowthHost />
      <ConfidantP5FxLayer />
      <ConfidantRankUpCutIn />
      <ConfidantStarShiftInvite />
    </>
  );
}
