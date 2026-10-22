/**
 * 共战结算（真实 CoopVictoryScreen）：胜利 COOP VICTORY / 撤退 SHADOW RETREATED。
 * 时序原值：底淡入 → 卡片 spring(20/260) → 标识 0.7s 摇摆 → 眉签 0.2s → 标题 0.3s → 副题 0.4s → 连胜章 0.5s → 奖励行 → 纪念章 0.6s → 按钮。
 *   #/overlay/bond-victory              胜利（弱点属性 +2 / 亲密度 +2 / SP +21 分解 / 羁绊纪念已刻入 / 连胜 ×2 / 终结者）
 *   #/overlay/bond-victory?kind=retreat 撤退（+1 亲密度 / 慰问 SP +3 · 「下次再战」）
 * 触发：羁绊之影面板 onVictory（终结者）· 进同伴页扫到新鲜 memorial（非终结者 / 撤退）。
 */
import { useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { OverlayProps } from '@pink/registry/types';
import { Portal, P3R, slantClip, tickClip } from '@pink/kit';
import { useBoldness } from '@pink/lib/prefs';
import { ATTR_NAMES } from '@pink/screens/pkg3/arcana';
import { Sparkle } from '@pink/screens/pkg3/ui';
import { PK3_SHADOW } from '@pink/mock/pkg3';

const REWARD_SP_VICTORY = 10;
const REWARD_SP_RETREAT = 3;

export function VictoryScreen({ isOpen, onClose, kind = 'victory', partnerName, shadowName, streak = 2, finisher = true }: { isOpen: boolean; onClose: () => void; kind?: 'victory' | 'retreat'; partnerName: string; shadowName: string; streak?: number; finisher?: boolean }) {
  const bold = useBoldness();
  const isVictory = kind === 'victory';
  const reward = useMemo(() => { const spStreak = 5 * Math.min(streak - 1, 4); const spBond = 4; const spFinisher = finisher ? 2 : 0; return { attr: 2, intimacy: streak >= 3 ? 5 : 2, spStreak, spBond, spFinisher, sp: REWARD_SP_VICTORY + spStreak + spBond + spFinisher }; }, [streak, finisher]);
  const spParts = [`基础 ${REWARD_SP_VICTORY}`, reward.spStreak > 0 ? `连胜 +${reward.spStreak}` : null, reward.spBond > 0 ? `羁绊 +${reward.spBond}` : null, reward.spFinisher > 0 ? `终结者 +${reward.spFinisher}` : null].filter(Boolean).join(' · ');
  useEffect(() => { if (!isOpen) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [isOpen, onClose]);
  const rise = (delay: number) => (bold ? { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { delay } } : { initial: false as const, animate: { opacity: 1 } });
  const weak = ATTR_NAMES[PK3_SHADOW.weakness];
  const Row = ({ icon, label, sub, value, tone }: { icon: string; label: string; sub?: string; value: string; tone: 'rose' | 'lilac' | 'coral' | 'gold' }) => (
    <div className="flex min-w-0 items-center gap-2.5">
      <span aria-hidden className="flex h-7 w-8 shrink-0 items-center justify-center font-cond text-[14px]" style={{ clipPath: slantClip(5), background: tone === 'rose' ? P3R.blue : tone === 'lilac' ? P3R.cyan : tone === 'coral' ? P3R.magenta : P3R.gold, color: tone === 'lilac' || tone === 'gold' ? 'var(--p3r-mulberry)' : '#fff' }}>{icon}</span>
      <span className="min-w-0 flex-1"><span className="block text-[13px] font-bold" style={{ color: P3R.ink }}>{label}</span>{sub && <span className="mt-0.5 block text-[11px] leading-snug" style={{ color: P3R.grey }}>{sub}</span>}</span>
      <span className="shrink-0 font-cond text-[17px] tabular-nums" style={{ color: tone === 'coral' ? 'var(--p3r-coral-ink)' : tone === 'lilac' ? P3R.lilacInk : P3R.roseInk }}>{value}</span>
    </div>
  );
  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div key="bg" className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 'var(--p3r-z-celebration)' as unknown as number, background: 'var(--p3r-scrim)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <motion.div role="dialog" aria-modal="true" aria-label={isVictory ? '共战胜利' : '羁绊之影撤退'} onClick={(e) => e.stopPropagation()}
              className="relative max-h-[92dvh] w-full max-w-sm overflow-y-auto no-scrollbar" style={{ background: 'var(--p3r-sheet-grad)', clipPath: slantClip(18), boxShadow: 'var(--p3r-shadow-lg)' }}
              initial={bold ? { scale: 0.9, y: 20, opacity: 0 } : { opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, y: 20, opacity: 0 }} transition={{ type: 'spring', damping: 20, stiffness: 260 }}>
              {/* 顶部色带 + 幽灵大字 */}
              <div className="relative overflow-hidden px-6 pb-4 pt-6 text-center" style={{ background: isVictory ? P3R.blue : P3R.ink }}>
                <span aria-hidden className="pointer-events-none absolute -right-4 -top-3 select-none font-cond text-[86px] leading-none" style={{ color: 'rgba(255,255,255,0.12)', transform: 'rotate(-12deg)' }}>{isVictory ? 'WIN' : 'LOST'}</span>
                <motion.div aria-hidden className="mx-auto mb-2 flex h-14 w-14 items-center justify-center" initial={bold ? { scale: 0.4, opacity: 0 } : false} animate={{ scale: 1, opacity: 1, rotate: bold ? [0, -5, 5, 0] : 0 }} transition={{ duration: 0.7 }}>
                  {isVictory ? <Sparkle size={52} style={{ color: 'var(--p3r-cream)' }} /> : <span className="block h-12 w-12 rounded-full" style={{ background: 'var(--p3r-cream)', boxShadow: 'inset -12px -4px 0 rgb(var(--p3r-ink-rgb) / 0.85)' }} />}
                </motion.div>
                <motion.div {...rise(0.2)} className="font-cond text-[13px] tracking-[0.36em]" style={{ color: isVictory ? P3R.onBlue : 'var(--pk-petal-a)' }}>{isVictory ? 'COOP VICTORY' : 'SHADOW RETREATED'}</motion.div>
                <motion.h3 {...rise(0.3)} className="mt-1 font-heavy text-[21px] leading-snug" style={{ color: isVictory ? P3R.onBlue : 'var(--p3r-on-ink)' }}>
                  {isVictory ? <>你们封印了《{shadowName}》</> : <>《{shadowName}》悄然离去</>}
                </motion.h3>
                <motion.p {...rise(0.4)} className="mt-1 text-[12px] font-bold" style={{ color: isVictory ? P3R.onBlue : 'var(--p3r-on-ink)', opacity: 0.8 }}>与 @{partnerName} 的共战记录</motion.p>
                {isVictory && streak >= 2 && (
                  <motion.div initial={bold ? { opacity: 0, scale: 0.8 } : false} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, type: 'spring', stiffness: 320, damping: 18 }}
                    className="mt-2 inline-flex items-center gap-1 px-3 py-1 font-cond text-[14px] tracking-wider" style={{ background: 'var(--p3r-cream)', color: 'var(--p3r-mulberry)', clipPath: slantClip(6) }}>连胜 ×{streak}</motion.div>
                )}
              </div>
              <div className="px-6 py-5">
                <div className="space-y-3 px-4 py-4" style={{ background: P3R.panel, clipPath: slantClip(12), boxShadow: 'var(--p3r-shadow)' }}>
                  {isVictory ? <>
                    <Row icon="◆" label={`${weak}（弱点属性）`} value={`+${reward.attr}`} tone="gold" />
                    <Row icon="♡" label={`与 @${partnerName} 的羁绊${streak >= 3 ? ' · 连胜加成' : ''}`} value={`+${reward.intimacy} 亲密度`} tone="rose" />
                    <Row icon="✦" label="SP · 战斗点数" sub={spParts} value={`+${reward.sp}`} tone="lilac" />
                    <Row icon="◎" label="羁绊纪念" value="已刻入" tone="coral" />
                  </> : <>
                    <Row icon="♡" label="虽然没封印，但我们都在。" value="+1 亲密度" tone="rose" />
                    <Row icon="✦" label="慰问 SP" value={`+${REWARD_SP_RETREAT}`} tone="lilac" />
                  </>}
                </div>
                {isVictory && (
                  <motion.div {...rise(0.6)} className="relative mt-4 px-4 py-3 text-center" style={{ background: P3R.cyanFaint, clipPath: slantClip(10) }}>
                    <span aria-hidden className="absolute bottom-0 right-3 h-[6px] w-[14px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
                    <div className="mb-1 font-cond text-[11px] tracking-[0.28em]" style={{ color: P3R.roseInk }}>MEMORIAL · 共战纪念</div>
                    <div className="text-[13px] font-bold leading-relaxed" style={{ color: P3R.ink }}>"2026/10/21 · 与 @{partnerName} 共击 {shadowName}"</div>
                    <div className="mt-1.5 text-[11px]" style={{ color: P3R.grey }}>在同伴详情页「共战纪念」中查看所有图章</div>
                  </motion.div>
                )}
              </div>
              <div className="px-6 pb-6">
                <button type="button" onClick={onClose} className="relative h-12 w-full font-heavy text-[17px] tracking-[0.1em] active:scale-95"
                  style={{ clipPath: slantClip(12), background: isVictory ? P3R.blue : P3R.ink, color: isVictory ? P3R.onBlue : 'var(--p3r-on-ink)' }}>
                  {isVictory ? '不负相见' : '下次再战'}
                  <span aria-hidden className="absolute bottom-0 right-4 h-[7px] w-[16px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export default function CoopVictoryScreen({ open, onClose, params }: OverlayProps) {
  return <VictoryScreen isOpen={open} onClose={onClose} kind={params?.get('kind') === 'retreat' ? 'retreat' : 'victory'} partnerName={params?.get('partner') || '由加莉'} shadowName={params?.get('shadow') || '镜中之影'} streak={Number(params?.get('streak') ?? 2)} />;
}
