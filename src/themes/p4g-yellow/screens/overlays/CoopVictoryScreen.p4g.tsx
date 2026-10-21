/**
 * 共战结算（真实 CoopVictoryScreen）——P4G 战斗 RESULT 版式：黄底方块阵 + 斜彩带 + 黑条奖励行逐行砸入。
 * #/overlay/bond-victory?kind=victory|retreat
 */
import { AnimatePresence, motion } from 'framer-motion';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Outline, Portal, useScrollLock } from '@yellow/kit';
import { useLowMotion } from '@yellow/lib/prefs';
import { ATTR_NAMES } from '@yellow/screens/pkg3/arcana';
import { RankUpBackdrop } from '@yellow/screens/pkg3/cinema';
import { PK3_SHADOW_IMG } from '@yellow/screens/pkg3/ui';

export function VictoryScreen({ isOpen, onClose, kind = 'victory', partnerName, shadowName }: { isOpen: boolean; onClose: () => void; kind?: 'victory' | 'retreat'; partnerName: string; shadowName: string }) {
  const low = useLowMotion();
  useScrollLock(isOpen);
  const isVictory = kind === 'victory';
  const reward = { attr: 2, intimacy: 2, streak: 3, spBase: 10, spStreak: 3, spBond: 2, spFinisher: 3 };
  const attrName = ATTR_NAMES.guts;
  const spTotal = reward.spBase + reward.spStreak + reward.spBond + reward.spFinisher;
  const spBreakdown = [`基础 ${reward.spBase}`, reward.spStreak > 0 ? `连胜 +${reward.spStreak}` : null, reward.spBond > 0 ? `羁绊 +${reward.spBond}` : null, reward.spFinisher > 0 ? `终结者 +${reward.spFinisher}` : null].filter(Boolean).join(' · ');
  const rows = isVictory
    ? [
        { icon: '🔥', label: `${attrName}（弱点属性）`, value: `+${reward.attr}` },
        { icon: '♥', label: `与 @${partnerName} 的羁绊${reward.streak >= 3 ? ' · 连胜加成' : ''}`, value: `+${reward.intimacy} 亲密度` },
        { icon: '✦', label: 'SP · 战斗点数', value: `+${spTotal}`, sub: spBreakdown },
        { icon: '📿', label: '羁绊纪念', value: '已刻入' },
      ]
    : [
        { icon: '♥', label: '虽然没封印，但我们都在。', value: '+1 亲密度' },
        { icon: '✦', label: '慰问 SP', value: '+3' },
      ];
  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div key="vic" role="dialog" aria-modal="true" aria-label={isVictory ? 'COOP VICTORY' : 'SHADOW RETREATED'} className="fixed inset-0 overflow-y-auto" style={{ zIndex: 'var(--p4g-z-celebration)' as unknown as number }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <RankUpBackdrop className="fixed" run={!low} />
            <div className="relative mx-auto flex min-h-full w-full max-w-[640px] flex-col justify-center gap-3 px-4 py-8">
              <motion.div initial={low ? false : { x: '-110%' }} animate={{ x: 0 }} transition={{ duration: 0.4, ease: [0.15, 0.95, 0.1, 1] }} className="-mx-4 flex items-center gap-3 bg-p4g-black px-5 py-3">
                <img src={PK3_SHADOW_IMG} alt="" className={`h-16 w-16 shrink-0 object-contain ${isVictory ? 'opacity-50 grayscale' : ''}`} />
                <div className="min-w-0">
                  <P4Outline size="clamp(28px, 8vw, 48px)" stroke={6} italic fill="var(--p4g-yellow)" strokeColor="var(--p4g-black)">{isVictory ? 'COOP VICTORY' : 'SHADOW RETREATED'}</P4Outline>
                  <div className="truncate font-display text-body font-bold text-white">{isVictory ? <>你们封印了《<span className="text-p4g-yellow">{shadowName}</span>》</> : <>《{shadowName}》悄然离去</>}</div>
                </div>
              </motion.div>
              <div className="flex items-center gap-2">
                <span className="rounded-[2px] bg-p4g-black px-2 py-0.5 font-display text-meta font-bold text-white">与 @{partnerName} 的共战记录</span>
                {isVictory && reward.streak > 1 && <span className="rounded-[2px] bg-p4g-red px-2 py-0.5 font-display text-meta font-bold text-white">🔥 连胜 ×{reward.streak}</span>}
              </div>
              {rows.map((r, i) => (
                <motion.div key={r.label} initial={low ? false : { x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.35 + i * 0.12, duration: 0.3 }}
                  className="flex min-w-0 items-center gap-3 rounded-sm border-3 border-p4g-black px-3 py-2.5 text-p4g-black shadow-hard" style={{ background: 'linear-gradient(90deg, var(--p4g-yellow) 0%, var(--p4g-yellow-pale) 100%)' }}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-p4g-black text-lead text-p4g-yellow">{r.icon}</span>
                  <div className="min-w-0 flex-1"><div className="truncate font-display text-body font-bold">{r.label}</div>{r.sub && <div className="truncate text-2xs opacity-75">{r.sub}</div>}</div>
                  <b className="shrink-0 p4g-num text-h3 text-[color:var(--p4g-orange-deep)]">{r.value}</b>
                </motion.div>
              ))}
              {isVictory && (
                <motion.div initial={low ? false : { scale: 1.6, opacity: 0, rotate: -8 }} animate={{ scale: 1, opacity: 1, rotate: -2 }} transition={{ delay: 0.9, duration: 0.3 }} className="mx-auto mt-2 max-w-full rounded-sm border-[3px] border-dashed border-p4g-red bg-p4g-cream px-4 py-2 text-center text-p4g-black">
                  <div className="font-display text-cap font-bold tracking-[0.2em] text-p4g-red">MEMORIAL · 共战纪念</div>
                  <div className="text-meta">"{new Date('2026-10-20T21:30:00+08:00').toLocaleDateString('zh-CN')} · 与 @{partnerName} 共击 {shadowName}"</div>
                </motion.div>
              )}
              {isVictory && <p className="text-center text-cap font-bold text-p4g-black/75">在同伴详情页「共战纪念」中查看所有图章</p>}
              <button type="button" onClick={onClose} className="p4g-press mx-auto mt-2 rounded-full border-3 border-p4g-black bg-p4g-orange px-8 py-3 font-display text-lead font-bold text-p4g-black shadow-hard">{isVictory ? '不负相见' : '下次再战'}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export default function CoopVictoryScreen({ open, onClose, params }: OverlayProps) {
  return <VictoryScreen isOpen={open} onClose={onClose} kind={params?.get('kind') === 'retreat' ? 'retreat' : 'victory'} partnerName="千枝" shadowName="镜中之影" />;
}
