/**
 * Evoker 召唤 Cut-in（B4 的演出形态）—— 抽象化：不画召唤器 / 枪口 / 指头。
 * 用「白闪 → 召唤环扩散 → 玻璃碎裂迸射 → 蓝白斜带对扫 → 眼部特写插槽 → 大号倾斜标题」表达召唤瞬间。
 *
 *   <EvokerCutIn open={o} onClose={…} eyebrow="SUMMON" title="ORPHEUS" sub="目标达成 · Lv.12" ghost="PERSONA" autoCloseMs={2600}>
 *     <button>继续</button>        // 可选：底部动作
 *   </EvokerCutIn>
 * props 与 CutInBand 对齐（open / onClose / title / eyebrow / sub / ghost / autoCloseMs / children / scrim）。
 * 眼部特写走插槽 slot:cutin-eyes（eyes prop）；demo 用两道横向光缝 + 焦散占位。
 * 点击任意处 / ESC 关闭；低动效：直出终态 + 淡入淡出。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';
import { Portal, rng, slantClip, useBoldness, zVar } from './_env';
import { Caustics } from './Water';
import { TiltTitle } from './Bands';

export interface EvokerCutInProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  eyebrow?: ReactNode;
  sub?: ReactNode;
  ghost?: string;
  autoCloseMs?: number;
  children?: ReactNode;
  /** 官方素材插槽 slot:cutin-eyes（角色眼部特写） */
  eyes?: ReactNode;
  scrim?: 'light' | 'dark';
}

const FLY = (() => {
  const r = rng(11);
  return Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 + r() * 0.4;
    const s = 10 + r() * 22;
    const pts = `0,${-s} ${s * (0.4 + r() * 0.4)},${s * (0.2 + r() * 0.5)} ${-s * (0.3 + r() * 0.5)},${s * 0.6}`;
    return { a, dist: 120 + r() * 160, pts, rot: (r() - 0.5) * 220 };
  });
})();

export const EvokerCutIn = ({ open, onClose, title, eyebrow = 'SUMMON', sub, ghost = 'PERSONA', autoCloseMs, children, eyes, scrim = 'dark' }: EvokerCutInProps) => {
  const anim = useBoldness();
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current(); };
    window.addEventListener('keydown', k);
    const t = autoCloseMs ? window.setTimeout(() => close.current(), autoCloseMs) : 0;
    return () => { window.removeEventListener('keydown', k); if (t) clearTimeout(t); };
  }, [open, autoCloseMs]);
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div role="dialog" aria-modal="true" onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: zVar('cutin'), overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: scrim === 'dark' ? 'linear-gradient(170deg, var(--bk-abyss-3) 0%, var(--bk-abyss-2) 50%, var(--bk-abyss-1) 100%)' : 'var(--p3r-scrim)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
            <Caustics opacity={0.22} fps={3} scale={1.4} />
            {/* 幽灵大字 */}
            {ghost && (
              <div aria-hidden style={{ position: 'absolute', left: '-4%', top: '6%', fontFamily: 'var(--p3r-font-cond)', fontStyle: 'italic', fontWeight: 800, fontSize: 'clamp(90px, 30vw, 260px)', lineHeight: 0.8, color: 'transparent', WebkitTextStroke: '1.5px var(--bk-sea-1)', opacity: 0.35, transform: 'rotate(-12deg)', whiteSpace: 'nowrap' }}>{ghost}</div>
            )}
            {/* 白闪 */}
            {anim && <motion.div aria-hidden style={{ position: 'absolute', inset: 0, background: 'var(--p3r-cream)' }} initial={{ opacity: 0.95 }} animate={{ opacity: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }} />}
            {/* 召唤环（抽象：同心细环扩散） */}
            {anim && [0, 1, 2].map((i) => (
              <motion.span key={i} aria-hidden style={{ position: 'absolute', left: '50%', top: '46%', width: 220, height: 220, marginLeft: -110, marginTop: -110, borderRadius: '50%', boxShadow: `inset 0 0 0 ${3 - i}px var(--bk-sea-1)` }}
                initial={{ scale: 0.15, opacity: 1 }} animate={{ scale: 2.6 + i * 0.6, opacity: 0 }} transition={{ duration: 0.8, delay: 0.06 + i * 0.08, ease: [0.16, 1, 0.3, 1] }} />
            ))}
            {/* 玻璃碎片迸射 */}
            {anim && (
              <svg aria-hidden width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
                <g transform={`translate(${typeof window === 'undefined' ? 195 : window.innerWidth / 2} ${typeof window === 'undefined' ? 388 : window.innerHeight * 0.46})`}>
                  {FLY.map((f, i) => (
                    <motion.polygon key={i} points={f.pts} style={{ fill: 'var(--bk-shard)', stroke: 'var(--bk-shard-edge)', strokeWidth: 1.4 }}
                      initial={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
                      animate={{ opacity: [0, 1, 1, 0], x: Math.cos(f.a) * f.dist, y: Math.sin(f.a) * f.dist + 40, rotate: f.rot }}
                      transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }} />
                  ))}
                </g>
              </svg>
            )}
            {/* 蓝白斜带对扫（剃刀直边） */}
            <motion.div aria-hidden style={{ position: 'absolute', left: '-20%', width: '140%', top: '58%', height: 70, background: 'var(--p3r-cream)', rotate: -12 }}
              initial={anim ? { x: '-110%' } : false} animate={{ x: '0%' }} transition={{ duration: 0.32, delay: 0.12, ease: [0.22, 0.9, 0.3, 1] }} />
            <motion.div aria-hidden style={{ position: 'absolute', left: '-20%', width: '140%', top: 'calc(58% + 74px)', height: 18, background: 'var(--bk-sea-2)', rotate: -12 }}
              initial={anim ? { x: '110%' } : false} animate={{ x: '0%' }} transition={{ duration: 0.32, delay: 0.18, ease: [0.22, 0.9, 0.3, 1] }} />
            {/* 眼部特写插槽（横向光缝） */}
            <motion.div data-slot="cutin-eyes" aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: '20%', height: '13%', overflow: 'hidden', background: 'linear-gradient(90deg, var(--bk-abyss-3), var(--bk-sea-3) 50%, var(--bk-abyss-3))', boxShadow: '0 -2px 0 var(--bk-sea-1), 0 2px 0 var(--bk-sea-1)' }}
              initial={anim ? { scaleY: 0 } : false} animate={{ scaleY: 1 }} transition={{ duration: 0.18, delay: 0.22 }}>
              {eyes ?? (
                <>
                  <Caustics opacity={0.4} fps={4} scale={0.8} />
                  <div style={{ position: 'absolute', left: '22%', top: '46%', width: '18%', height: 3, background: 'var(--bk-moon)', boxShadow: '0 0 12px var(--bk-sea-1)' }} />
                  <div style={{ position: 'absolute', right: '22%', top: '46%', width: '18%', height: 3, background: 'var(--bk-moon)', boxShadow: '0 0 12px var(--bk-sea-1)' }} />
                </>
              )}
            </motion.div>
            {/* 标题组 */}
            <div style={{ position: 'relative', marginTop: '18%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '0 20px', maxWidth: '100%' }}>
              {eyebrow && (
                <motion.div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--p3r-font-cond)', fontStyle: 'italic', fontWeight: 800, fontSize: 15, letterSpacing: '0.4em', color: 'var(--bk-sea-1)' }}
                  initial={anim ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  {eyebrow}<span style={{ width: 14, height: 10, background: 'var(--bk-red)', clipPath: slantClip(4) }} />
                </motion.div>
              )}
              <TiltTitle text={title} size="clamp(44px, 14vw, 112px)" color="var(--p3r-cream)" shadow="var(--bk-sea-2)" tilt={-8} />
              {sub && (
                <motion.div style={{ marginTop: 10, padding: '6px 16px', background: 'var(--p3r-cream)', color: 'var(--p3r-mulberry)', fontFamily: 'var(--p3r-font-heavy)', fontWeight: 900, fontSize: 'clamp(14px, 4vw, 20px)', clipPath: slantClip(10), maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  initial={anim ? { opacity: 0, x: -20 } : false} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.46 }}>{sub}</motion.div>
              )}
            </div>
            {children && (
              <motion.div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(28px + env(safe-area-inset-bottom))', display: 'flex', justifyContent: 'center', padding: '0 24px' }}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: anim ? 0.6 : 0 }}>{children}</motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};
