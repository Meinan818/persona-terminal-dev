/**
 * UnlockCutIn.p3r —— 解锁连播（成就 → 技能 排队依次播放）。
 * 真实口径：App.tsx 的三路通知按优先级门控——levelUp 在时不放成就、成就在时不放技能；一次行为同时解锁多项时，
 *   成就弹窗关闭（自动 4500ms / 点击跳过）后技能弹窗才挂上（CelebrationCutIn violet，4000ms）。两段之间是前一段 exit 动画的空档。
 * 路由：#/overlay/global-achievement-unlock?queue=2（一镜到底）；&from=skill 从第二段直达；&queue=3 先放升级再放两段（level → achievement → skill）。
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import { MOCK_ACH_UNLOCK, MOCK_LEVELUP, MOCK_SKILL_UNLOCK } from '@pink/adapters/pkg1';
import { StageChip } from '@pink/screens/pkg1/fxbits';
import { AchievementUnlockP3 } from './AchievementUnlockModal.p3r';
import { SkillUnlockP3 } from './SkillUnlockModal.p3r';
import { LevelUpP3 } from './LevelUpModal.p3r';

type Slot = 'level' | 'ach' | 'skill' | 'gap' | 'end';

export default function UnlockChain({ open, onClose, params }: OverlayProps) {
  const n = Math.max(2, Math.min(3, Number(params?.get('queue') ?? 2) || 2));
  const order: Slot[] = n === 3 ? ['level', 'ach', 'skill'] : ['ach', 'skill'];
  const from = params?.get('from') as Slot | null;
  const [idx, setIdx] = useState(() => Math.max(0, from ? order.indexOf(from) : 0));
  const [showing, setShowing] = useState(true);
  useEffect(() => { if (!open) setShowing(false); }, [open]);
  const cur = order[idx];
  const next = () => {
    setShowing(false);
    // 前一段 exit（≈220ms）播完再挂下一段：同真实「上一条通知清空 → 下一条渲染」
    window.setTimeout(() => {
      if (idx + 1 >= order.length) { onClose(); return; }
      setIdx(idx + 1); setShowing(true);
    }, 280);
  };
  const live = open && showing;
  return (
    <>
      {open && <StageChip text={`UNLOCK QUEUE ${idx + 1}/${order.length}`} />}
      <LevelUpP3 isOpen={live && cur === 'level'} onClose={next} attributeName={MOCK_LEVELUP.attr} newLevel={MOCK_LEVELUP.level} />
      <AchievementUnlockP3 isOpen={live && cur === 'ach'} onClose={next} achievementTitle={MOCK_ACH_UNLOCK.title} />
      <SkillUnlockP3 isOpen={live && cur === 'skill'} onClose={next} skillName={MOCK_SKILL_UNLOCK.name} />
    </>
  );
}
