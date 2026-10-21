/**
 * 记账完成 Cut-in（真实 src/components/LedgerSavedModal.tsx → p3 频道 = BandCutInP3 eyebrow「记账完成」ghost「SAVED」）。
 * 时序同 BandCutInP3：带体自右 spring 滑入 → 勾弹出 + 碎片迸溅 → 摘要斜块裁切揭示 → 三圈波纹循环 → 3s 自动关闭（自左退场）。
 * 路由：?variant=batch&n=3（「共 N 笔已入账」）；?title=… 自定义摘要；?phase=hold 直达主演出终态。
 */
import type { OverlayProps } from '@pink/registry/types';
import { BandCutInPink, type FxStart } from '@pink/screens/pkg5/fx';

export function LedgerSavedModalView({ open, onClose, title, startAt }: { open: boolean; onClose: () => void; title: string; startAt?: FxStart }) {
  return <BandCutInPink open={open} onClose={onClose} title={title} eyebrow="记账完成" ghost="SAVED" startAt={startAt} />;
}

export default function LedgerSavedModal({ open, onClose, params }: OverlayProps) {
  const batch = params?.get('variant') === 'batch';
  const n = Number(params?.get('n') ?? 3) || 3;
  const title = params?.get('title') ?? (batch ? `共 ${n} 笔已入账` : '−¥28 · 咖啡 + 可颂');
  return <LedgerSavedModalView open={open} onClose={onClose} title={title} startAt={params?.get('phase') === 'hold' ? 'hold' : 'enter'} />;
}
