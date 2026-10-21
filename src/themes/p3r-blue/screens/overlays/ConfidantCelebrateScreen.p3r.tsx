/**
 * 羁绊升级「恭喜」整页（真实 ConfidantCelebrateScreen#CelebrateP3）：牌 / RANK / 称谓 / 新解锁能力 / 星移机会 / 按钮组。
 *   #/overlay/bond-celebrate?charges=2   有星移次数 → 「稍后再说 / ✧ 使用星移」（点使用 → 星移弹窗）
 *   #/overlay/bond-celebrate?charges=0   无星移次数 → 单键「欣然接受」
 * 触发：升级演出点「确认」后（App 顶层 ConfidantStarShiftInvite）· 打开同伴档案时补弹未庆祝的升级（详情 ?celebrate=1）。
 */
import { useState } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { CelebrateScreen, StarShiftModal } from '@blue/screens/pkg3/rankup';
import { demoNotice } from './ConfidantRankUpCutIn.p3r';

export default function ConfidantCelebrateScreen({ open, onClose, params }: OverlayProps) {
  const { c, notice } = demoNotice(params);
  const charges = Number(params?.get('charges') ?? 2);
  const [shift, setShift] = useState(false);
  if (!open) return null;
  const cc = { ...c, intimacy: notice.newLevel };
  return shift
    ? <StarShiftModal confidant={cc} charges={charges} onClose={() => { setShift(false); onClose(); }} />
    : <CelebrateScreen confidant={cc} level={notice.newLevel} charges={charges} onClose={onClose} onUseStarShift={() => setShift(true)} />;
}
