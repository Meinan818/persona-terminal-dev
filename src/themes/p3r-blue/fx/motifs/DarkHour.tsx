/**
 * B2 影时间 Dark Hour —— 蓝专属（夜间 = 深蓝 + 影时间绿）。
 *   <DarkHourGlow pools={3} moon />                 绿月 + 地面绿色光晕水洼（原作血色水洼 → 绿光晕）+ 颗粒；夜间空态 / 舞台底
 *   <StoppedClock size={64} />                      停在 12 点的钟（空态「影时间里，一切都静止了」）
 *   <DarkHourFreeze active onCovered onDone />      日→夜切换演出：120ms 定格 → 绿色调自上扫过 → 钟针归 12 → 淡出
 * 只用 --bk-darkhour / --bk-darkhour-glow / --bk-abyss-* / --bk-moon；低动效：Freeze 同步回调、水洼不明灭。
 */
import { memo, useId, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Portal, useBoldness, useSyncFallback, useTimeline, zVar } from './_env';

export const StoppedClock = memo(({ size = 64, spin = false, className, style }: { size?: number; spin?: boolean; className?: string; style?: CSSProperties }) => {
  const anim = useBoldness();
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} style={style} aria-hidden>
      <circle cx="32" cy="32" r="29" fill="none" style={{ stroke: 'var(--bk-darkhour)' }} strokeWidth="2.5" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const r1 = i % 3 === 0 ? 21 : 24;
        return <line key={i} x1={32 + Math.sin(a) * r1} y1={32 - Math.cos(a) * r1} x2={32 + Math.sin(a) * 26} y2={32 - Math.cos(a) * 26} style={{ stroke: 'var(--bk-darkhour)' }} strokeWidth={i % 3 === 0 ? 2.5 : 1.2} />;
      })}
      {/* 指针：spin=true 时从 10:10 转到 12:00 后定住（演出用），否则直接停在 12 */}
      <motion.line x1="32" y1="32" x2="32" y2="13" style={{ stroke: 'var(--bk-darkhour)', originX: '32px', originY: '32px' }} strokeWidth="3" strokeLinecap="square"
        initial={spin && anim ? { rotate: -300 } : false} animate={{ rotate: 0 }} transition={{ duration: 0.5, ease: [0.7, 0, 0.2, 1] }} />
      <motion.line x1="32" y1="32" x2="32" y2="19" style={{ stroke: 'var(--bk-darkhour)', originX: '32px', originY: '32px' }} strokeWidth="4" strokeLinecap="square"
        initial={spin && anim ? { rotate: -60 } : false} animate={{ rotate: 0 }} transition={{ duration: 0.5, ease: [0.7, 0, 0.2, 1] }} />
      <rect x="29.5" y="29.5" width="5" height="5" style={{ fill: 'var(--bk-red)' }} transform="rotate(45 32 32)" />
    </svg>
  );
});

export interface DarkHourGlowProps {
  pools?: number;
  moon?: boolean;
  grain?: boolean;
  className?: string;
  style?: CSSProperties;
}

const POOLS = [
  { cx: 26, cy: 88, rx: 22, ry: 4.2, d: 6, delay: 0 },
  { cx: 70, cy: 93, rx: 16, ry: 3.2, d: 7.5, delay: -2 },
  { cx: 50, cy: 82, rx: 10, ry: 2.2, d: 5.2, delay: -3.4 },
  { cx: 88, cy: 86, rx: 9, ry: 1.9, d: 6.8, delay: -1.2 },
  { cx: 10, cy: 95, rx: 8, ry: 1.6, d: 5.8, delay: -4 },
];

/** 绿月 + 绿光晕水洼。父级 relative；默认铺满父级（absolute inset 0）。 */
export const DarkHourGlow = memo(({ pools = 3, moon = true, grain = true, className, style }: DarkHourGlowProps) => {
  const id = useId().replace(/:/g, '');
  return (
    <div aria-hidden className={className} style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', ...style }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax slice" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id={`${id}-pool`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: 'var(--bk-darkhour)', stopOpacity: 0.85 }} />
            <stop offset="45%" style={{ stopColor: 'var(--bk-darkhour)', stopOpacity: 0.35 }} />
            <stop offset="100%" style={{ stopColor: 'var(--bk-darkhour)', stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id={`${id}-moon`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: 'var(--bk-darkhour)', stopOpacity: 0.5 }} />
            <stop offset="100%" style={{ stopColor: 'var(--bk-darkhour)', stopOpacity: 0 }} />
          </radialGradient>
        </defs>
        {moon && (
          <g>
            <circle cx="74" cy="22" r="20" fill={`url(#${id}-moon)`} className="bk-halo" />
            <circle cx="74" cy="22" r="10.5" style={{ fill: 'var(--bk-moon)' }} />
            <circle cx="74" cy="22" r="10.5" style={{ fill: 'var(--bk-darkhour)' }} opacity={0.35} />
          </g>
        )}
        {/* 水洼倒映月光：同色细横线 */}
        {POOLS.slice(0, Math.max(0, Math.min(pools, POOLS.length))).map((p, i) => (
          <g key={i}>
            <ellipse className="bk-pool" cx={p.cx} cy={p.cy} rx={p.rx * 1.6} ry={p.ry * 2.4} fill={`url(#${id}-pool)`} style={{ ['--d' as string]: `${p.d}s`, ['--delay' as string]: `${p.delay}s` }} />
            <ellipse cx={p.cx} cy={p.cy} rx={p.rx * 0.55} ry={p.ry * 0.5} style={{ fill: 'var(--bk-darkhour)' }} opacity={0.75} />
            <line x1={p.cx - p.rx * 0.35} y1={p.cy} x2={p.cx + p.rx * 0.2} y2={p.cy} style={{ stroke: 'var(--bk-moon)' }} strokeWidth={0.35} opacity={0.8} />
          </g>
        ))}
      </svg>
      {grain && (
        <div className="bk-grain" style={{ position: 'absolute', inset: '-10%', opacity: 0.18,
          backgroundImage: 'radial-gradient(var(--bk-darkhour) 0.6px, transparent 0.8px), radial-gradient(var(--bk-moon) 0.5px, transparent 0.7px)',
          backgroundSize: '7px 9px, 11px 13px', backgroundPosition: '0 0, 3px 5px' }} />
      )}
    </div>
  );
});

/**
 * 日 → 夜（影时间）切换演出。约定同全部转场：active=true 开播；onCovered 时外壳切 .dark；onDone 播完。
 * 时序：0–120ms 透明拦截层「定格」（交互冻结）→ 120–420ms 绿色调自上而下扫过（clip-path）+ 钟针归 12 →
 *       onCovered@420ms → 0:00 字样 → 900ms 淡出。总长 1000ms。
 */
export const DarkHourFreeze = ({ active, onCovered, onDone, label = '影时间' }: { active: boolean; onCovered?: () => void; onDone?: () => void; label?: string }) => {
  const anim = useBoldness();
  useSyncFallback(active, anim, onCovered, onDone);
  useTimeline(active, anim, 420, 1000, onCovered, onDone);
  if (!active || !anim) return null;
  return (
    <Portal>
      <motion.div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: zVar('transition'), pointerEvents: 'auto', overflow: 'hidden' }}
        initial={{ opacity: 1 }} animate={{ opacity: [1, 1, 0] }} transition={{ duration: 1, times: [0, 0.82, 1] }}>
        {/* 绿色调扫过：群青底 + 绿膜，自上而下揭开 */}
        <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, var(--bk-abyss-3) 0%, var(--bk-abyss-2) 100%)' }}
          initial={{ clipPath: 'inset(0 0 100% 0)' }} animate={{ clipPath: 'inset(0 0 0% 0)' }} transition={{ delay: 0.12, duration: 0.3, ease: [0.7, 0, 0.84, 0] }} />
        <motion.div style={{ position: 'absolute', inset: 0, background: 'var(--bk-darkhour-glow)', mixBlendMode: 'screen' }}
          initial={{ clipPath: 'inset(0 0 100% 0)' }} animate={{ clipPath: 'inset(0 0 0% 0)' }} transition={{ delay: 0.16, duration: 0.3, ease: [0.7, 0, 0.84, 0] }} />
        {/* 扫描前沿：一条亮绿细线 */}
        <motion.div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 3, background: 'var(--bk-darkhour)' }}
          initial={{ y: 0, opacity: 0 }} animate={{ y: '100vh', opacity: [0, 1, 1, 0] }} transition={{ delay: 0.12, duration: 0.32, ease: [0.7, 0, 0.84, 0] }} />
        <DarkHourGlow pools={4} />
        <motion.div style={{ position: 'absolute', left: '50%', top: '42%', translateX: '-50%', translateY: '-50%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.12 }}>
          <StoppedClock size={84} spin />
          <span style={{ fontFamily: 'var(--p3r-font-cond)', fontStyle: 'italic', fontWeight: 800, fontSize: 44, lineHeight: 1, color: 'var(--bk-darkhour)', letterSpacing: '0.02em' }}>0:00</span>
          <span style={{ fontFamily: 'var(--p3r-font-heavy)', fontWeight: 900, fontSize: 15, letterSpacing: '0.5em', color: 'var(--bk-moon)' }}>{label}</span>
        </motion.div>
      </motion.div>
    </Portal>
  );
};
