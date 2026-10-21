/**
 * 祈愿特效（真实 PrayerEffectOverlay）：径向光晕 → 外圈辐射 → 中心四角星脉冲 → 卡片「谁 → 谁」→ 八方星粒；sent 1.8s / reciprocal 2.4s 自动消失。
 * 时序原值：光晕 1.2s(sent)/1.8s(recip) · 外圈 1.0/1.4s 扩 2.6/3.2 倍 · 星 1.5/2.0s（recip 带 -30°→0→10° 旋转）· 卡片 0.3s 弹入 · 星粒 10/16 颗 · 距离 140/180。
 * 粉白 P3R：金换成樱玫红 + 藕紫 + 珊瑚；卡片 = 墨色斜切台词卡 + 玫红角；不拦截交互（pointer-events:none）。
 *   #/overlay/bond-prayer-fx?kind=sent   #/overlay/bond-prayer-fx?kind=reciprocal   &name=由加莉
 * 入口：同伴页 卡墙卡背「✦ 祈愿」/ 列表右侧 ✦ 快捷键 / 好友名片「祈愿」。
 */
import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { OverlayProps } from '@pink/registry/types';
import { Portal, P3R, slantClip } from '@pink/kit';
import { useBoldness } from '@pink/lib/prefs';

export type PrayerEffectKind = 'sent' | 'reciprocal';
const DURATION_SENT = 1800;
const DURATION_RECIP = 2400;

export function PrayerEffect({ isOpen, kind, targetName, onDismiss }: { isOpen: boolean; kind: PrayerEffectKind; targetName: string; onDismiss: () => void }) {
  const bold = useBoldness();
  const isRecip = kind === 'reciprocal';
  const primary = isRecip ? 'var(--p3r-blue)' : 'var(--p3r-blue)';
  const second = isRecip ? 'var(--p3r-cyan)' : 'var(--p3r-magenta)';
  const particles = useMemo(() => {
    const count = isRecip ? 16 : 10; const dist = isRecip ? 180 : 140;
    return Array.from({ length: count }, (_, i) => {
      const a = (Math.PI * 2 * i) / count + (isRecip ? 0 : Math.PI / 8);
      return { tx: Math.cos(a) * dist, ty: Math.sin(a) * dist, delay: i * 0.02, size: 5 + Math.random() * 4, alt: i % 3 === 0 };
    });
  }, [isRecip]);
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(onDismiss, isRecip ? DURATION_RECIP : DURATION_SENT);
    return () => clearTimeout(t);
  }, [isOpen, isRecip, onDismiss]);
  if (!isOpen) return null;
  return (
    <Portal>
      <motion.div className="pointer-events-none fixed inset-0 flex items-center justify-center" style={{ zIndex: 'var(--p3r-z-cutin)' as unknown as number }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} role="status" aria-live="polite" aria-label={isRecip ? `你与 ${targetName} 今日互祈` : `愿望已送达 ${targetName}`}>
        <span aria-hidden className="absolute inset-0" style={{ background: 'rgb(var(--p3r-bg-rgb) / 0.35)' }} />
        {/* 径向光晕（固定 560 方块，只动 transform/opacity） */}
        {bold && (
          <motion.div aria-hidden className="absolute h-[560px] w-[560px] max-h-[110vh] max-w-[130vw]"
            style={{ background: 'radial-gradient(circle at 50% 50%, rgb(var(--p3r-blue-rgb) / 0.55) 0%, rgb(var(--p3r-cyan-rgb) / 0.22) 26%, transparent 58%)' }}
            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: [0, 0.95, 0], scale: [0.6, 1.2, 1.6] }} transition={{ duration: isRecip ? 1.8 : 1.2, times: [0, 0.4, 1], ease: 'easeOut' }} />
        )}
        {/* 外圈辐射（双圈：玫红实 + 藕紫虚） */}
        {bold && [0, 1].map((i) => (
          <motion.div key={i} aria-hidden className="absolute h-40 w-40 rounded-full" style={{ border: `${i ? 2 : 3}px ${i ? 'dashed' : 'solid'} ${i ? second : primary}` }}
            initial={{ opacity: 0.8, scale: 0.4 }} animate={{ opacity: 0, scale: (isRecip ? 3.2 : 2.6) - i * 0.5 }} transition={{ duration: isRecip ? 1.4 : 1.0, ease: 'easeOut', delay: i * 0.08 }} />
        ))}
        {/* 中心四角星 */}
        <motion.div aria-hidden className="relative" initial={bold ? { opacity: 0, scale: 0.3, rotate: isRecip ? -30 : 0 } : { opacity: 1 }}
          animate={bold ? { opacity: [0, 1, 1, 0], scale: isRecip ? [0.3, 1.1, 1.05, 0.9] : [0.3, 1, 0.95, 0.85], rotate: isRecip ? [-30, 0, 0, 10] : 0 } : { opacity: 1 }}
          transition={{ duration: isRecip ? 2.0 : 1.5, times: [0, 0.25, 0.7, 1], ease: 'easeOut' }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <g transform="translate(60 60)">
              {isRecip && <path d="M 0 -54 L 10 -10 L 54 0 L 10 10 L 0 54 L -10 10 L -54 0 L -10 -10 Z" fill="var(--p3r-cyan)" transform="rotate(45) scale(.72)" opacity=".85" />}
              <path d="M 0 -54 L 10 -10 L 54 0 L 10 10 L 0 54 L -10 10 L -54 0 L -10 -10 Z" fill="var(--p3r-blue)" stroke="var(--p3r-panel)" strokeWidth="2" strokeLinejoin="round" />
              <circle r="7" fill="var(--p3r-cream)" />
            </g>
          </svg>
        </motion.div>
        {/* 卡片 */}
        <motion.div className="absolute bottom-[24%] min-w-[230px] max-w-[86vw] px-6 py-3 text-center" style={{ background: 'var(--p3r-mulberry)', clipPath: slantClip(14) }}
          initial={bold ? { opacity: 0, y: 16, scale: 0.94 } : { opacity: 0 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={bold ? { delay: 0.3, type: 'spring', damping: 20, stiffness: 260 } : { duration: 0.15 }}>
          <span aria-hidden className="absolute bottom-0 right-4 h-[7px] w-[18px]" style={{ background: P3R.magenta, clipPath: 'polygon(30% 0, 100% 0, 70% 100%, 0 100%)' }} />
          <div className="mb-1 font-cond text-[12px] tracking-[0.36em]" style={{ color: 'var(--pk-petal-a)' }}>{isRecip ? 'RECIPROCAL' : 'A PRAYER SENT'}</div>
          <div className="font-heavy text-[19px] leading-tight" style={{ color: 'var(--p3r-cream)' }}>{isRecip ? '愿望之光交汇' : '愿望已送达'}</div>
          <div className="mt-1 text-[12px] font-bold leading-relaxed" style={{ color: 'rgba(255,240,246,0.82)' }}>
            {isRecip ? <>你与 <span style={{ color: 'var(--pk-petal-a)' }}>{targetName}</span> 今日互祈 · 反射 +1 SP</> : <>送给 <span style={{ color: 'var(--pk-petal-a)' }}>{targetName}</span> · 双方 +2 SP</>}
          </div>
        </motion.div>
        {/* 星粒 */}
        {bold && particles.map((p, i) => (
          <motion.span key={i} aria-hidden className="absolute" style={{ width: p.size, height: p.size, background: p.alt ? second : primary, clipPath: i % 2 ? 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' : undefined, borderRadius: i % 2 ? 0 : '50%' }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }} animate={{ x: p.tx, y: p.ty, opacity: [0, 1, 0], scale: [0.4, 1, 0.3] }} transition={{ duration: isRecip ? 1.4 : 1.0, delay: p.delay, ease: 'easeOut' }} />
        ))}
      </motion.div>
    </Portal>
  );
}

export default function PrayerEffectOverlay({ open, onClose, params }: OverlayProps) {
  const kind: PrayerEffectKind = params?.get('kind') === 'reciprocal' ? 'reciprocal' : 'sent';
  return <PrayerEffect isOpen={open} kind={kind} targetName={params?.get('name') || (kind === 'reciprocal' ? '风花' : '由加莉')} onDismiss={onClose} />;
}
