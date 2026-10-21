/**
 * CelebrationCutIn.p3r —— 庆祝基座（真实 src/components/CelebrationCutIn.tsx 的 p3 形态）1:1 蓝白重配。
 * 形：斜切卡（clip 22px 平行四边形）+ 主题渐变 + 左上青贴角 / 右下臂章红贴角 + 纵向高光 + 斜光带 + 粒子迸散 + 图标 + 白字标题 + 圆形 ✕ + 底部自动关闭倒计时条。
 * 时序（真实值）：幕淡入 → 卡 springSoft（scale .5 → 1，x -12 / y 12 斜向位移弹入）→ 粒子迸散 → autoCloseMs（缺省 3500）倒计时条 scaleX 1→0 → 关闭反向。
 * 三通道关闭：自动 / 点遮罩 / ✕（+ ESC）。主题：gold / violet / emerald / slate（真实四套渐变 → 蓝白无蓝重配：琥珀臂章红 / 青蓝 / 薄荷 / 深蓝墨）。
 * 被技能解锁（violet）/ 周目标领奖 / 组织庆祝等复用。演示：?theme=gold|violet|emerald|slate &ms=3500
 */
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { Portal, useEscape } from '@blue/kit';
import { useBoldness } from '@blue/lib/prefs';
import { useAutoClose, AutoCloseBar } from '@blue/screens/pkg1/fxbits';

export type CelebrationTheme = 'gold' | 'violet' | 'emerald' | 'slate';
const THEME_BG: Record<CelebrationTheme, string> = {
  gold: 'linear-gradient(135deg, #ffc531 0%, #f5a614 30%, #05070f 64%, #2a52d6 100%)',
  violet: 'linear-gradient(135deg, #74cae0 0%, #476cc4 52%, #2a478c 100%)',
  emerald: 'linear-gradient(135deg, #47b886 0%, #2f9a6c 55%, #2a7a5a 100%)',
  slate: 'linear-gradient(135deg, #45506b 0%, #2d374d 55%, #1a202f 100%)',
};
const THEME_PARTICLES: Record<CelebrationTheme, string[]> = {
  gold: ['#ffe08a', '#b8e7ff', '#ffb07a', '#ffffff'],
  violet: ['#ccf5ff', '#c4d6ff', '#b4f0ff', '#ffffff'],
  emerald: ['#b8f0d4', '#d9ffe9', '#9fe6c3', '#ffffff'],
  slate: ['#c4d6ff', '#e8d8e3', '#a6edff', '#ffffff'],
};

/** 粒子迸散（真实 ParticleBurst：自中心向四周飞散、淡出） */
const ParticleBurst = ({ count, colors }: { count: number; colors: string[] }) => (
  <div aria-hidden className="pointer-events-none absolute inset-0">
    {Array.from({ length: count }).map((_, i) => {
      const a = (Math.PI * 2 * i) / count + (i % 3) * 0.21;
      const dist = 110 + (i % 5) * 26;
      const s = 4 + (i % 3) * 3;
      return (
        <motion.span key={i} className="absolute left-1/2 top-1/2 rounded-full" style={{ width: s, height: s, marginLeft: -s / 2, marginTop: -s / 2, background: colors[i % colors.length] }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }} animate={{ x: Math.cos(a) * dist, y: Math.sin(a) * dist, opacity: 0, scale: 1 }}
          transition={{ duration: 1.2 + (i % 4) * 0.15, delay: 0.15 + (i % 5) * 0.03, ease: [0.2, 0.8, 0.3, 1] }} />
      );
    })}
  </div>
);

export interface CelebrationProps {
  isOpen: boolean; onClose: () => void; theme?: CelebrationTheme; icon?: ReactNode; title: string; subtitle?: string;
  children?: ReactNode; autoCloseMs?: number; particles?: number; showClose?: boolean; overlayExtras?: ReactNode;
}

export const CelebrationCutInP3 = ({ isOpen, onClose, theme = 'gold', icon, title, subtitle, children, autoCloseMs = 3500, particles = 24, showClose = true, overlayExtras }: CelebrationProps) => {
  const anim = useBoldness();
  useAutoClose(isOpen, autoCloseMs, onClose);
  useEscape(isOpen, onClose);
  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div key="cel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 'var(--p3r-z-celebration)' as unknown as number, background: 'rgba(10,15,27,0.6)' }} onClick={onClose}>
            <motion.div role="dialog" aria-modal="true" aria-label={title}
              initial={anim ? { scale: 0.5, opacity: 0, x: -12, y: 12 } : { opacity: 0 }} animate={{ scale: 1, opacity: 1, x: 0, y: 0 }} exit={anim ? { scale: 0.5, opacity: 0, x: -12, y: 12 } : { opacity: 0 }}
              transition={anim ? { type: 'spring', stiffness: 260, damping: 24 } : { duration: 0.16 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md overflow-hidden p-8" style={{ background: THEME_BG[theme], clipPath: 'polygon(22px 0, 100% 0, calc(100% - 22px) 100%, 0 100%)' }}>
              <span aria-hidden className="absolute left-0 top-0 z-10 h-[14px] w-[52px]" style={{ background: 'var(--p3r-cyan)', clipPath: 'polygon(0 0, 100% 0, 72% 100%, 0 100%)' }} />
              <span aria-hidden className="absolute bottom-0 right-6 z-10 h-[10px] w-[26px]" style={{ background: 'var(--p3r-magenta)', clipPath: 'polygon(30% 0, 100% 0, 70% 100%, 0 100%)' }} />
              <div aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(0deg, transparent, rgba(255,255,255,0.15), transparent)' }} />
              <div aria-hidden className="absolute -left-10 top-8 h-14 w-[150%]" style={{ background: 'rgba(255,255,255,0.1)', transform: anim ? 'rotate(-9deg)' : undefined }} />
              {particles > 0 && anim && <ParticleBurst count={particles} colors={THEME_PARTICLES[theme]} />}
              <div className="relative z-10 text-center">
                {icon && <div className="mb-4 flex justify-center text-[64px] leading-none text-white">{icon}</div>}
                <h2 className="font-heavy text-[30px] leading-tight text-white">{title}</h2>
                {subtitle && <p className="mt-2 text-base text-white/85">{subtitle}</p>}
                {children && <div className="mt-4 text-white/90">{children}</div>}
              </div>
              {showClose && (
                <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={onClose} aria-label="关闭"
                  className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full text-xl text-white/85 hover:text-white" style={{ background: 'rgba(255,255,255,0.2)' }}>×</motion.button>
              )}
              {autoCloseMs > 0 && <AutoCloseBar ms={autoCloseMs} />}
            </motion.div>
            {overlayExtras}
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};

/** 单色闪电（替代 ⚡ emoji） */
export const BoltGlyph = ({ size = 64 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden><path d="M13.6 1.5 5.2 13.4h5.1l-2 9.1L17.1 10h-5.2Z" fill="#fff" stroke="rgba(13,22,42,0.35)" strokeWidth="0.6" /></svg>
);
export const SparkGlyph = ({ size = 64 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden><path d="M12 1.5 14 10l8.5 2-8.5 2-2 8.5-2-8.5L1.5 12 10 10Z" fill="#fff" /></svg>
);

export default function CelebrationBaseOverlay({ open, onClose, params }: OverlayProps) {
  const theme = (params?.get('theme') as CelebrationTheme) || 'gold';
  const ms = Number(params?.get('ms') ?? 3500) || 3500;
  const anim = useBoldness();
  return (
    <CelebrationCutInP3 isOpen={open} onClose={onClose} theme={theme} autoCloseMs={ms} particles={24}
      icon={<motion.span className="inline-block" initial={anim ? { scale: 0, rotate: -90 } : false} animate={anim ? { scale: [0, 1.25, 1], rotate: 0 } : undefined} transition={{ duration: 0.7, delay: 0.15 }}><SparkGlyph /></motion.span>}
      title="本周目标达成！" subtitle="奖励已入账：全属性 +2">
      <p className="text-sm text-white/80">连续 3 周达成 · 下周目标已自动续上</p>
    </CelebrationCutInP3>
  );
}
