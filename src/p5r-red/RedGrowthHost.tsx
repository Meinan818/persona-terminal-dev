import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { celebrationCutIn, killCutIn, playQueue, type QueueStep } from '@/p5r-red/screens/overlays/cutins.p5r';

/** 红色频道的跨页成长消费者：完成条关闭后，按升级 → 成就 → 技能顺序播放。 */
export function RedGrowthHost() {
  const levelUp = useAppStore((s) => s.levelUpNotification);
  const achievement = useAppStore((s) => s.achievementNotification);
  const skill = useAppStore((s) => s.skillNotification);
  const blocker = useAppStore((s) => s.modalBlocker);
  const bigDeal = useAppStore((s) => s.bigDealClear);
  const wishCut = useAppStore((s) => s.wishProgressCut);
  const [busy, setBusy] = useState(false);
  const playing = useRef(false);
  const cancel = useRef<null | (() => void)>(null);

  useEffect(() => () => cancel.current?.(), []);

  useEffect(() => {
    if (blocker || busy || playing.current) return;
    if (levelUp || achievement || skill) {
      const state = useAppStore.getState();
      const steps: QueueStep[] = [];
      if (levelUp) steps.push({ kind: 'level', attr: levelUp.displayName, level: levelUp.level, stars: levelUp.masteryStars });
      if (achievement) steps.push({ kind: 'achievement', name: achievement.title });
      if (skill) steps.push({ kind: 'skill', name: skill.name });
      state.setLevelUpNotification(null);
      state.setAchievementNotification(null);
      state.setSkillNotification(null);
      playing.current = true;
      setBusy(true);
      cancel.current = playQueue(steps, () => {
        playing.current = false;
        setBusy(false);
        cancel.current = null;
      });
      return;
    }
    if (bigDeal) {
      const names = bigDeal.attrs
        .map((id) => useAppStore.getState().settings.attributeNames[id] ?? id)
        .join('、');
      playing.current = true;
      setBusy(true);
      const card = celebrationCutIn({
        icon: '◆',
        title: '大功告成',
        subtitle: bigDeal.title,
        body: `<b class="oa-cb-big">+${bigDeal.sp} SP</b><p>${bigDeal.stepsCount} 步全成 · ${names} 各 +1</p>`,
        particles: 24,
        autoMs: 4500,
        onClose: () => {
          useAppStore.getState().clearBigDealClear();
          playing.current = false;
          setBusy(false);
          cancel.current = null;
        },
      });
      cancel.current = () => killCutIn(card);
      return;
    }
    if (wishCut) {
      const delta = wishCut.delta >= 0 ? `+${wishCut.delta}%` : `${wishCut.delta}%`;
      playing.current = true;
      setBusy(true);
      const card = celebrationCutIn({
        icon: '✦',
        title: wishCut.delta > 0 ? '又近了一步' : '进度持平',
        subtitle: `愿望「${wishCut.wishTitle}」`,
        body: `<b class="oa-cb-big">${delta} → ${wishCut.pct}%</b><p>已完成相关任务 ${wishCut.times} 次 · ${wishCut.source === 'ai' ? 'AI 估算' : '本地估算'}</p>`,
        particles: 18,
        autoMs: 3600,
        onClose: () => {
          useAppStore.getState().clearWishProgressCut();
          playing.current = false;
          setBusy(false);
          cancel.current = null;
        },
      });
      cancel.current = () => killCutIn(card);
    }
  }, [blocker, busy, levelUp, achievement, skill, bigDeal, wishCut]);

  return null;
}
