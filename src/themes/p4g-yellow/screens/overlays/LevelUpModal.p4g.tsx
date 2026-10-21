/**
 * LevelUpModal.p4g —— 对应真实 LevelUpModal → p4r/cutins.tsx#LevelUpP4。
 * 文案：「恭喜升级！/精通提升！」、属性名 + Lv.N（旧 → 新）/ ★N、「继续加油，你越来越强了！/满级之后，你还在往前走。」、关闭。
 * autoClose 4.2s（同真实）；点击任意处收场。?variant=mastery 看精通提升（索引「演出总览」有独立入口）。
 * 时序对齐真实 LevelUpP4：主徽 .14 旋入 → 题板 .28 → 属性大字 .32 弹出 → Lv 行 .46 上推 → 蓝圆号 .62 旋入 → 星花 .42+ 迸开 → 旗标 .76。
 */
import { motion } from 'framer-motion';
import type { OverlayProps } from '@yellow/registry/types';
import { useLowMotion } from '@yellow/lib/prefs';
import type { AttributeId } from '@/types';
import { P4Outline } from '@yellow/kit';
import { CelebrationStage } from '@yellow/screens/pkg1/CelebrationStage';
import { Sparkle4 } from '@yellow/screens/pkg1/bits';
import { ATTR_NAMES } from '@yellow/adapters/pkg1';

export interface LevelUpP4GProps extends OverlayProps { attributeName?: string; newLevel?: number; masteryStars?: number }

export function LevelUpP4G({ open, onClose, attributeName, newLevel = 5, masteryStars }: LevelUpP4GProps) {
  const isMastery = (masteryStars ?? 0) > 0;
  const stars = masteryStars ?? 0;
  const name = attributeName ?? ATTR_NAMES.knowledge;
  const low = useLowMotion();
  const sp = (stiffness: number, damping: number, delay: number) => (low ? { duration: 0.14 } : { type: 'spring' as const, stiffness, damping, delay });
  return (
    <CelebrationStage
      open={open} onClose={onClose}
      ariaLabel={isMastery ? `精通提升！${name} ★${stars}` : `恭喜升级！${name} Lv.${newLevel}`}
      eyebrow={isMastery ? 'MASTERY UP!!' : 'LEVEL UP!!'}
      autoCloseMs={4200}
      badge={
        <div className="relative flex flex-col items-center">
          <Sparkle4 size={56} color="var(--p4g-cream)" className="absolute -top-[30%] drop-shadow-[3px_3px_0_#000]" />
          <motion.div initial={low ? { opacity: 0 } : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={sp(320, 18, 0.32)}>
            <P4Outline size="clamp(34px,10vw,52px)" stroke={6} className="leading-none">{name}</P4Outline>
          </motion.div>
          <motion.div className="mt-2 flex items-center gap-1.5 font-display font-bold text-p4g-black"
            initial={low ? { opacity: 0 } : { y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={sp(360, 24, 0.46)}>
            <span className="p4g-num text-lead opacity-70">{isMastery ? `★${stars - 1}` : `Lv.${Math.max(1, newLevel - 1)}`}</span>
            <span className="text-lead">▶</span>
            <span className="text-meta">{isMastery ? '★' : 'Lv.'}</span>
            <motion.span initial={low ? { opacity: 0 } : { scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={sp(420, 16, 0.62)}
              className="flex h-[clamp(40px,11vw,54px)] w-[clamp(40px,11vw,54px)] items-center justify-center rounded-pill border-[3px] border-p4g-black bg-p4g-blue p4g-num text-[clamp(24px,7vw,34px)] text-p4g-yellow shadow-[3px_3px_0_#000]">
              {isMastery ? stars : newLevel}
            </motion.span>
          </motion.div>
        </div>
      }
      plateDelay={0.28}
      ribbonDelay={0.76}
      plate={isMastery ? '精通提升！' : '恭喜升级！'}
      ribbon={isMastery ? '满级之后，你还在往前走。' : '继续加油，你越来越强了！'}
    />
  );
}

export default function LevelUpModal({ open, onClose, params }: OverlayProps) {
  const mastery = params?.get('variant') === 'mastery';
  const attr = (params?.get('attr') as AttributeId) || (mastery ? 'charm' : 'knowledge');
  return <LevelUpP4G open={open} onClose={onClose} attributeName={ATTR_NAMES[attr] ?? ATTR_NAMES.knowledge} newLevel={mastery ? 10 : 5} masteryStars={mastery ? 2 : undefined} />;
}
