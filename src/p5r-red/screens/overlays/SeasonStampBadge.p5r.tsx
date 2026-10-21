/**
 * 岁时小签 SeasonStampBadge（真实 src/components/dashboard/SeasonStampBadge.tsx，第 6 轮）：首页日期块上、星期旁，当天是节气 / 节日才出现。
 * 横排、和星期几一般大；红频道「朱签」：已收进岁时册 = 实心朱红 #c00008 + 纸字 + 墨硬影；当天还没记 = 虚线空签（红字红虚线）。
 * 点一下弹一行小注气泡（纸底墨字 + 3px 墨硬影，4.5s 自动收起）：「名 · 注」+「岁时册 · 已收录 / 今天记一条，就收进岁时册」。
 * 真实 rounded-xl 气泡在红频道按 v3「无圆角」语汇做成直角切纸。
 *   组件：SeasonStampBadge.chip.tsx <SeasonStampBadgeP5 name="霜降" collected align pop />（DashboardP5 日期卡挂它）
 *   预览 #/overlay/home-season-stamp?state=got|todo（默认 got；进入 600ms 后自动点开气泡）&mark=霜降
 */
import type { OverlayProps } from '@/p5r-red/registry/types';
import { Portal } from '@/p5r-red/kit/Portal';
import { DateCardP5 } from '@/p5r-red/screens/pages/DashboardP5.p5r';
export { SeasonStampBadgeP5, SEASON_NOTE } from './SeasonStampBadge.chip';

export default function SeasonStampBadge({ open, params }: OverlayProps) {
  const st = params?.get('state') ?? 'got';
  if (!open) return null;
  return (
    <Portal>
      <div className="home2" style={{ position: 'fixed', left: '50%', top: '40%', transform: 'translate(-50%,-50%)', width: 'min(440px, 92vw)', zIndex: 700, margin: 0 }}>
        <div className="hm-head" style={{ gridTemplateColumns: '1fr' }}>
          <DateCardP5 initialSky="moon" season={params?.get('mark') ?? '霜降'} seasonCollected={st === 'got'} seasonAutoOpen />
        </div>
      </div>
    </Portal>
  );
}
