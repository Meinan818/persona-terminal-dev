/**
 * SeasonStampBadge.p4g —— 真实 components/dashboard/SeasonStampBadge：节气/节日小签，点开气泡
 *（「岁时册 · 已收录」/「今天记一条，就收进岁时册」），4.5s 自动收起，再点收起。
 * 这里把两种状态（未收录 / 已收录）并排放在一块首页页头示意板上，可直接点。
 */
import type { OverlayProps } from '@yellow/registry/types';
import { P4Card, P4Outline } from '@yellow/kit';
import { SeasonStamp } from '@yellow/screens/pkg1/bits';

export default function SeasonStampBadgeDemo({ open }: OverlayProps) {
  if (!open) return null;
  return (
    <div className="relative z-10 mx-auto mt-40 flex max-w-[520px] flex-col gap-10 px-4 pb-24">
      {[false, true].map((collected) => (
        <P4Card key={String(collected)} tone="surface" cut="br" padding="lg">
          <div className="font-display text-2xs font-bold uppercase tracking-[0.24em]">{collected ? '已收录（实心签）' : '未收录（虚线签）'}</div>
          <P4Outline size={30} stroke={5} italic>MASKARIA</P4Outline>
          <div className="mt-1 font-display text-meta font-bold">TODAY&apos;S SHOW · <span className="text-p4g-orange">04</span></div>
          <div className="mt-2"><SeasonStamp collected={collected} pop="below" defaultOpen={collected} /></div>
          <div className="h-20" />
        </P4Card>
      ))}
    </div>
  );
}
