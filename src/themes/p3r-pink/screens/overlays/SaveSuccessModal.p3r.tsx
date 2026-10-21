/**
 * 记录成功 Cut-in（真实 SaveSuccessModal.tsx p3 分支 → BandCutInP3 eyebrow「记录成功」ghost「SAVED」）。
 * 时序（真实）：斜带自右 spring(24/220) → 碎裂勾 .12s 弹入 → 任务名斜块 .2s 揭示 → 幽灵词 .26s → 迸溅 .34s → 水波 ping 循环 → 3000ms 自动关。
 * ?variant=unlock：附「✦ 你解锁了新成就 / 新技能！」（unlockHint）；?points=N 点数（默认 3）。
 */
import type { OverlayProps } from '@pink/registry/types';
import { BandCutIn } from '@pink/screens/pkg2/cutins';

export default function SaveSuccessModal({ open, onClose, params, description, totalPoints, unlock }: OverlayProps & { description?: string; totalPoints?: number; unlock?: boolean }) {
  const v = params?.get('variant');
  const pts = totalPoints ?? Number(params?.get('points') ?? 3);
  return (
    <BandCutIn open={open} onClose={onClose} eyebrow="记录成功" ghost="SAVED" title={description ?? '在图书馆读完了第 4 章'} totalPoints={pts} unlockHint={unlock ?? v === 'unlock'} />
  );
}
