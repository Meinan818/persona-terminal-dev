/**
 * TodoCompleteModal.p4g —— 对应真实 TodoCompleteModal → p4r/cutins.tsx#TodoCompleteP4。
 * 文案：「今日完成」、任务名 · +总点数、「✦ 你解锁了新成就 / 新技能！」（有解锁时）、关闭。
 * 跳音符（数量随加点，真实 MusicalNotes）挂在幕布层；autoClose 3.2s。?variant=unlock 看解锁提示。
 * 同一演出被 记录成功（SaveSuccessModal）/ 记账完成（LedgerSavedModal）复用，与真实 p4 分支一致。
 */
import { motion } from 'framer-motion';
import type { OverlayProps } from '@yellow/registry/types';
import { useLowMotion } from '@yellow/lib/prefs';
import { CelebrationStage } from '@yellow/screens/pkg1/CelebrationStage';

export interface TodoCompleteP4GProps extends OverlayProps { title?: string; totalPoints?: number; unlockHint?: { achievements: number; skills: number }; heading?: string; eyebrow?: string }

const StarCheck = () => (
  <svg viewBox="0 0 100 100" className="h-[84%] w-[84%] drop-shadow-[4px_4px_0_#000]" aria-hidden>
    <path d="M50 4 L61 37 L96 37 L68 58 L78 92 L50 72 L22 92 L32 58 L4 37 L39 37 Z" fill="var(--p4g-cream)" stroke="#111" strokeWidth="4" strokeLinejoin="miter" strokeMiterlimit="12" />
    <path d="M33 50 L46 63 L69 38" fill="none" stroke="var(--p4g-green)" strokeWidth="10" strokeLinecap="square" />
    <path d="M33 50 L46 63 L69 38" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="square" />
  </svg>
);

function MusicalNotes({ count }: { count: number }) {
  const low = useLowMotion();
  if (low) return null;
  const n = Math.min(14, Math.max(3, count * 2));
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: n }, (_, i) => (
        <motion.span key={i} className="absolute font-display text-[28px] font-bold text-p4g-yellow [text-shadow:2px_2px_0_#000]"
          style={{ left: `${8 + ((i * 37) % 84)}%`, top: '86%' }}
          initial={{ y: 0, opacity: 0, rotate: -12 }} animate={{ y: -320 - (i % 4) * 60, opacity: [0, 1, 1, 0], rotate: 12 }}
          transition={{ duration: 2.2, delay: 0.3 + i * 0.09, ease: 'easeOut' }}>{i % 3 ? '♪' : '♫'}</motion.span>
      ))}
    </div>
  );
}

export function TodoCompleteP4G({ open, onClose, title = '晨跑 3 公里', totalPoints = 4, unlockHint, heading = '今日完成', eyebrow }: TodoCompleteP4GProps) {
  return (
    <CelebrationStage
      open={open} onClose={onClose}
      ariaLabel={`${heading}：${title}`}
      eyebrow={eyebrow ?? (heading === '记录成功' ? 'RECORDED' : 'CLEAR!')}
      plateDelay={0.34}
      ribbonDelay={0.5}
      autoCloseMs={3200}
      badgeTone="yellow"
      badge={<StarCheck />}
      overlay={totalPoints > 0 ? <MusicalNotes count={totalPoints} /> : undefined}
      plate={heading}
      ribbon={<>{title}{totalPoints > 0 && <span className="text-p4g-orange-deep"> · +{totalPoints}</span>}</>}
      extra={unlockHint && (unlockHint.achievements > 0 || unlockHint.skills > 0)
        ? <p className="rounded-xs bg-p4g-black px-3 py-1 text-center font-display text-meta font-bold text-p4g-cream">✦ 你解锁了新成就 / 新技能！</p>
        : undefined}
    />
  );
}

export default function TodoCompleteModal({ open, onClose, params }: OverlayProps) {
  const unlock = params?.get('variant') === 'unlock';
  return <TodoCompleteP4G open={open} onClose={onClose} title={params?.get('title') ?? '晨跑 3 公里'} totalPoints={4} unlockHint={unlock ? { achievements: 1, skills: 1 } : undefined} />;
}
