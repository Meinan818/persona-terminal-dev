/**
 * 羁绊 RANK UP 演出（真实 ConfidantRankUpCutIn#RankUpCutInP3，App 顶层常驻，队列 confidantRankUpQueue 驱动）。
 *   #/overlay/bond-rankup-cutin?phase=playing   播放段（牌坠入 → RANK UP! → 副题 → 数字跳变 → 胶囊 → 碎裂退场 → 确认态）
 *   #/overlay/bond-rankup-cutin?phase=confirm   确认段直达（退场后的确认态）
 *   #/overlay/bond-rankup-chain                 一镜到底（RANK UP → 恭喜页 → 星移，自动推进；?start=confirm|celebrate|shift 从中间开播；?manual=1 关自动）
 * 参数：?id=c-yukari &from=6 &to=7 &star=1 &charges=1
 * 确认 → 恭喜整页 → 「✧ 使用星移」→ 星移弹窗（与真实「确认后接着弹星移」定案 A 一致）。
 */
import type { OverlayProps } from '@pink/registry/types';
import type { AIFail } from '@pink/fx';
import { RankUpChain, type ChainPage, type ShiftStage } from '@pink/screens/pkg3/rankup';
import { PK3_CONFIDANTS } from '@pink/adapters/pkg3';

export function demoNotice(params?: URLSearchParams) {
  const c = PK3_CONFIDANTS.find((x) => x.id === params?.get('id')) ?? PK3_CONFIDANTS[0];
  const to = Math.max(1, Math.min(10, Number(params?.get('to') ?? 7) || 7));
  const from = Math.max(0, Number(params?.get('from') ?? to - 1));
  const star = Number(params?.get('star') ?? 1);
  const chargesParam = params?.get('charges');
  const charges = chargesParam != null ? Number(chargesParam) : (c.starShiftCharges ?? 0) + star;
  return { c, notice: { oldLevel: from, newLevel: to, starShiftGained: star }, charges };
}

export default function ConfidantRankUpCutIn({ open, onClose, params }: OverlayProps) {
  const { c, notice, charges } = demoNotice(params);
  const start: ChainPage = params?.get('phase') === 'confirm' ? 'confirm' : 'playing';
  return <RankUpChain open={open} onClose={onClose} confidant={c} notice={notice} start={start} charges={charges} />;
}

/** 升级链一镜到底（bond-rankup-chain） */
export function RankUpChainOverlay({ open, onClose, params }: OverlayProps) {
  const { c, notice, charges } = demoNotice(params);
  const s = params?.get('start');
  const start: ChainPage = s === 'confirm' || s === 'celebrate' || s === 'shift' ? s : 'playing';
  return <RankUpChain open={open} onClose={onClose} confidant={c} notice={notice} start={start} charges={charges} auto={params?.get('manual') !== '1'}
    shiftStage={(params?.get('stage') as ShiftStage) || 'input'} fail={params?.get('fail') as AIFail} />;
}
