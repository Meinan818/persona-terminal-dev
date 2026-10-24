/**
 * 转场 FX（全部 transform / opacity；低动效 → 同步切页，不挂层）：
 *   RippleIris   水波 → 蓝光圈扩散 + 白光片（真实底导 playHeavyTransition({effect:'water', origin}) 的 WaterRippleAct；
 *                真实 RIPPLE_PALETTE 没有 pink → 蓝室会落到 p3 的蓝青环，这里换成蓝 / 青 / 奶油三环）
 *   WaveSlice    三枚斜板交错切入（真实 p3 频道幕布 WaveSliceAct：侧栏 / 轮盘 / 页内跳转）
 *   CutInSweep   -12° 斜带横扫一次 + 巨字（Rank Up / 阶段切换的过场，不拦截交互）
 *   PageEnter    新页斜切入场（内容层从左裁切揭示）
 * 约定：active 变 true 开播；遮满时回调 onCovered（外壳在此切页）；播完 onDone。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';
import { Portal } from '@blue/kit/Portal';
import { useBoldness } from '@blue/lib/prefs';
import { P3R, slantClip, tickClip } from '@blue/kit/base';

interface FxProps { active: boolean; onCovered?: () => void; onDone?: () => void }

/** 低动效 / 未激活时的同步兜底：active 一来就依次回调 */
function useSyncFallback(active: boolean, anim: boolean, onCovered?: () => void, onDone?: () => void) {
  useEffect(() => {
    if (!active || anim) return;
    onCovered?.(); onDone?.();
  }, [active, anim]); // eslint-disable-line react-hooks/exhaustive-deps
}
function useTimeline(active: boolean, anim: boolean, coverAt: number, doneAt: number, onCovered?: () => void, onDone?: () => void) {
  const cb = useRef({ onCovered, onDone });
  cb.current = { onCovered, onDone };
  useEffect(() => {
    if (!active || !anim) return;
    const a = window.setTimeout(() => cb.current.onCovered?.(), coverAt);
    const b = window.setTimeout(() => cb.current.onDone?.(), doneAt);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [active, anim, coverAt, doneAt]);
}

/** 水波 → 蓝光圈：从 origin 依次扩开蓝 / 青 / 奶油三层实心圆（scale），遮满后奶油层淡出露新页 */
export const RippleIris = ({ active, origin, onCovered, onDone }: FxProps & { origin?: { x: number; y: number } | null }) => {
  const anim = useBoldness();
  useSyncFallback(active, anim, onCovered, onDone);
  useTimeline(active, anim, 430, 860, onCovered, onDone);
  if (!active || !anim) return null;
  const o = origin ?? { x: window.innerWidth / 2, y: window.innerHeight - 40 };
  const R = Math.hypot(Math.max(o.x, window.innerWidth - o.x), Math.max(o.y, window.innerHeight - o.y)) + 20;
  const disc = (bg: string, delay: number, extra?: ReactNode) => (
    <motion.span className="absolute rounded-full" style={{ left: o.x - R, top: o.y - R, width: R * 2, height: R * 2, background: bg }}
      initial={{ scale: 0.02 }} animate={{ scale: 1 }} transition={{ duration: 0.42, delay, ease: [0.3, 0.7, 0.2, 1] }}>{extra}</motion.span>
  );
  return (
    <Portal>
      <motion.div aria-hidden className="pointer-events-auto fixed inset-0 overflow-hidden" style={{ zIndex: 'var(--p3r-z-transition)' as unknown as number }}
        initial={{ opacity: 1 }} animate={{ opacity: [1, 1, 0] }} transition={{ duration: 0.86, times: [0, 0.6, 1] }}>
        {disc(P3R.blue, 0)}
        {disc(P3R.cyan, 0.07)}
        {disc('var(--p3r-bg)', 0.14)}
        {/* 光圈细环 + 白光片 */}
        <motion.span className="absolute rounded-full" style={{ left: o.x - 60, top: o.y - 60, width: 120, height: 120, boxShadow: 'inset 0 0 0 3px var(--p3r-blue)' }}
          initial={{ scale: 0.2, opacity: 1 }} animate={{ scale: 6, opacity: 0 }} transition={{ duration: 0.7, delay: 0.1 }} />
        <motion.span className="absolute inset-y-0 w-[30vw]" style={{ background: 'rgba(255,255,255,0.6)', skewX: -20 }} initial={{ x: '-40vw' }} animate={{ x: '140vw' }} transition={{ duration: 0.6, delay: 0.25 }} />
      </motion.div>
    </Portal>
  );
};

const SLABS = [
  { bg: 'var(--p3r-cyan-pale)', from: 1 },
  { bg: 'var(--p3r-blue)', from: -1 },
  { bg: 'var(--p3r-cyan)', from: 1 },
];
/** 三枚斜板交错切入 → 中央句点签名 → 反向切出（真实 WaveSliceAct） */
export const WaveSlice = ({ active, onCovered, onDone }: FxProps) => {
  const anim = useBoldness();
  useSyncFallback(active, anim, onCovered, onDone);
  useTimeline(active, anim, 360, 780, onCovered, onDone);
  if (!active || !anim) return null;
  return (
    <Portal>
      <div aria-hidden className="pointer-events-auto fixed inset-0 overflow-hidden" style={{ zIndex: 'var(--p3r-z-transition)' as unknown as number }}>
        {SLABS.map((s, i) => (
          <motion.div key={i} className="absolute -inset-x-[20%]" style={{ top: `${i * 33.4 - 4}%`, height: '40%', background: s.bg, clipPath: 'polygon(6% 0, 100% 0, 94% 100%, 0 100%)' }}
            initial={{ x: `${s.from * 120}%` }} animate={{ x: ['' + s.from * 120 + '%', '0%', '0%', `${-s.from * 120}%`] }}
            transition={{ duration: 0.78, times: [0, 0.42, 0.56, 1], delay: i * 0.04, ease: [0.6, 0.05, 0.3, 1] }} />
        ))}
        <motion.span className="absolute left-1/2 top-1/2 -ml-[40px] -mt-[18px] block h-[36px] w-[80px]" initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1, 1, 1.3] }} transition={{ duration: 0.78, times: [0.2, 0.42, 0.6, 0.8] }}>
          <span className="absolute left-0 top-0 h-full w-[52px]" style={{ background: 'var(--p3r-cream)', clipPath: tickClip }} />
          <span className="absolute left-[44px] top-[10px] h-[26px] w-[36px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
        </motion.span>
      </div>
    </Portal>
  );
};

/** -12° 斜带横扫一次（不拦截交互）：<CutInSweep active={x} text="RANK UP" sub="恋人 · Lv.5" onDone={…} /> */
export const CutInSweep = ({ active, text, sub, onDone, tone = 'rose' }: { active: boolean; text: ReactNode; sub?: ReactNode; onDone?: () => void; tone?: 'rose' | 'ink' }) => {
  const anim = useBoldness();
  const cb = useRef(onDone); cb.current = onDone;
  useEffect(() => { if (!active) return; const t = window.setTimeout(() => cb.current?.(), anim ? 1100 : 600); return () => clearTimeout(t); }, [active, anim]);
  return (
    <Portal>
      <AnimatePresence>
        {active && (
          <motion.div aria-hidden className="pointer-events-none fixed inset-0 flex items-center overflow-hidden" style={{ zIndex: 'var(--p3r-z-cutin)' as unknown as number }} exit={{ opacity: 0 }}>
            <motion.div className="relative -ml-[20vw] w-[140vw] py-4" style={{ rotate: -12, background: tone === 'rose' ? 'var(--bk-band)' : P3R.ink, boxShadow: '0 -3px 0 var(--bk-band-edge), 0 3px 0 var(--p3r-cyan)' }}
              initial={anim ? { x: '-100%' } : { opacity: 0 }} animate={anim ? { x: ['-100%', '0%', '0%', '100%'] } : { opacity: [0, 1, 1, 0] }} transition={{ duration: anim ? 1.1 : 0.6, times: [0, 0.3, 0.7, 1], ease: [0.5, 0, 0.3, 1] }}>
              <div className="flex items-baseline justify-center gap-4 whitespace-nowrap">
                <span className="font-cond text-[clamp(44px,13vw,110px)] leading-none" style={{ color: 'var(--p3r-cream)' }}>{text}</span>
                {sub && <span className="font-heavy text-[clamp(16px,4vw,26px)]" style={{ color: 'var(--p3r-cream)' }}>{sub}</span>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};

/** 新页斜切入场：从左滑入 + 斜切光片扫过（只动 transform/opacity）；低动效直出 */
export const PageEnter = ({ children, k, className }: { children: ReactNode; k: string; className?: string }) => {
  const anim = useBoldness();
  return (
    <motion.div key={k} className={className}
      initial={anim ? { opacity: 0.72 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: anim ? 0.28 : 0, ease: [0.22, 0.7, 0.2, 1] }}>
      {children}
    </motion.div>
  );
};

/** 斜切小徽：两片句点（加载 / 过场里用） */
export const PeriodMark = ({ size = 1 }: { size?: number }) => (
  <span aria-hidden className="relative inline-block" style={{ width: 80 * size, height: 36 * size }}>
    <span className="absolute left-0 top-0 h-full" style={{ width: 52 * size, background: P3R.blue, clipPath: tickClip }} />
    <span className="absolute" style={{ left: 44 * size, top: 10 * size, width: 36 * size, height: 26 * size, background: P3R.magenta, clipPath: slantClip(6) }} />
  </span>
);
