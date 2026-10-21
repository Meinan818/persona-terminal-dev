/**
 * B3 心之海：焦散 · 气泡 · 下沉转场 —— 蓝专属。
 *   <Caustics fps={3} opacity={0.3} />                 步进焦散网（4 帧轮换，1–4 次/秒，不插值；原作就是跳帧的）
 *   <Bubbles count={6} />                              常驻上浮气泡层（父级 relative/fixed + overflow-hidden）
 *   <BubbleBurst active origin count={5} onDone />     一次性气泡上浮 3–6 颗（成功 / 保存 / Toast 进场），播完自卸
 *   <BubbleShape />                                    单颗气泡 SVG（白边 + 高光弧）
 *   <BlotIris active origin onCovered onDone />        前进转场：波形圆 blot（正弦边、边扩边转，内含放大偏蓝的焦散画面，第二层稍晚更快）
 *   <DoubleCircleIris active origin onCovered onDone /> 返回转场：双圆遮罩（两个圆从对角扩开合拢）
 * 全部 transform / opacity / clip-path；低动效：焦散停第 1 帧、气泡隐藏、转场同步回调。
 */
import { memo, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Portal, rng, stepEase, useBoldness, useSyncFallback, useTimeline, zVar } from './_env';

/* ───────────── 焦散 ───────────── */

/** 两族交叉正弦波线 = 焦散网的近似；seed 不同即一帧 */
function causticPaths(seed: number, w = 240, h = 240) {
  const r = rng(seed);
  const out: { d: string; sw: number }[] = [];
  for (let fam = 0; fam < 2; fam++) {
    for (let i = 0; i < 9; i++) {
      const base = (i + r() * 0.6) * (h / 8) - 20;
      const a1 = 6 + r() * 9, f1 = 0.02 + r() * 0.025, p1 = r() * 6.28;
      const a2 = 3 + r() * 5, f2 = 0.05 + r() * 0.03, p2 = r() * 6.28;
      let d = '';
      for (let x = -20; x <= w + 20; x += 12) {
        const y = base + a1 * Math.sin(x * f1 + p1) + a2 * Math.sin(x * f2 + p2);
        d += `${x === -20 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `;
      }
      out.push({ d, sw: 1.2 + r() * 2.6 });
    }
    void fam;
  }
  return out;
}

export interface CausticsProps {
  /** 每秒换帧次数（1–4） */
  fps?: number;
  opacity?: number;
  /** 图案缩放（越大网格越疏） */
  scale?: number;
  className?: string;
  style?: CSSProperties;
  seed?: number;
}

export const Caustics = memo(({ fps = 3, opacity = 0.3, scale = 1, className, style, seed = 7 }: CausticsProps) => {
  const id = useId().replace(/:/g, '');
  const frames = useMemo(() => [0, 1, 2, 3].map((k) => causticPaths(seed * 31 + k * 977)), [seed]);
  const cycle = 4 / Math.min(4, Math.max(1, fps));
  const tile = 240 * scale;
  return (
    <div aria-hidden className={className} style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', opacity, ...style }}>
      {frames.map((paths, k) => (
        <svg key={k} className="bk-caustic-frame" width="112%" height="112%"
          style={{ ['--bk-cycle' as string]: `${cycle}s`, animationDelay: `${-k * (cycle / 4)}s`, transform: `translate(${(k % 2) * 3}px, ${(k >> 1) * 2}px)` }}>
          <defs>
            <filter id={`${id}-soft-${k}`} x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="0.8" /></filter>
            <pattern id={`${id}-p-${k}`} width={tile} height={tile} patternUnits="userSpaceOnUse" patternTransform={`scale(${scale}) rotate(${k * 7 - 10})`}>
              <g fill="none" style={{ stroke: 'var(--bk-caustic)' }} strokeLinecap="round" filter={`url(#${id}-soft-${k})`}>
                {paths.map((p, i) => <path key={i} d={p.d} strokeWidth={p.sw} transform={i >= 9 ? 'rotate(62 120 120)' : undefined} />)}
              </g>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${id}-p-${k})`} />
        </svg>
      ))}
    </div>
  );
});

/* ───────────── 气泡 ───────────── */

export const BubbleShape = ({ fill = 'var(--bk-bubble)' }: { fill?: string }) => (
  <svg viewBox="0 0 20 20" width="100%" height="100%" aria-hidden style={{ display: 'block', overflow: 'visible' }}>
    <circle cx="10" cy="10" r="8.6" fill="none" style={{ stroke: fill }} strokeWidth="1.5" />
    <circle cx="10" cy="10" r="8.6" style={{ fill }} opacity={0.18} />
    <path d="M5.2 8.2 A5.4 5.4 0 0 1 9 4.6" fill="none" style={{ stroke: 'var(--bk-moon)' }} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const BUBBLES = [
  { left: '9%', s: 10, d: 11, delay: -2, bx: 8 },
  { left: '24%', s: 6, d: 9, delay: -6, bx: -6 },
  { left: '41%', s: 14, d: 13, delay: -9, bx: 10 },
  { left: '58%', s: 7, d: 10, delay: -1, bx: -8 },
  { left: '72%', s: 11, d: 12, delay: -4, bx: 6 },
  { left: '86%', s: 5, d: 8, delay: -7, bx: -4 },
  { left: '33%', s: 8, d: 10.5, delay: -11, bx: 5 },
  { left: '66%', s: 9, d: 14, delay: -3, bx: -7 },
];

/** 常驻上浮气泡。stepped=true（默认）：按 4 帧/秒跳升，与焦散同一节奏 */
export const Bubbles = memo(({ count = 6, stepped = true }: { count?: number; stepped?: boolean }) => (
  <>
    {BUBBLES.slice(0, Math.min(count, BUBBLES.length)).map((b, i) => (
      <span key={i} aria-hidden className="bk-bubble" data-smooth={stepped ? undefined : ''}
        style={{ left: b.left, width: b.s, height: b.s, ['--d' as string]: `${b.d}s`, ['--delay' as string]: `${b.delay}s`, ['--bx' as string]: `${b.bx}px`, ['--steps' as string]: Math.round(b.d * 4) }}>
        <BubbleShape />
      </span>
    ))}
  </>
));

/** 一次性气泡：从 origin 往上浮 3–6 颗（步进 10 帧），1.2s 后 onDone。默认 origin = 视口底部中线 */
export const BubbleBurst = ({ active, origin, count = 5, onDone }: { active: boolean; origin?: { x: number; y: number }; count?: number; onDone?: () => void }) => {
  const anim = useBoldness();
  const [gen, setGen] = useState(0);
  useEffect(() => { if (active) setGen((g) => g + 1); }, [active]);
  const done = useRef(onDone); done.current = onDone;
  useEffect(() => { if (!active) return; const t = window.setTimeout(() => done.current?.(), 1200); return () => clearTimeout(t); }, [active, gen]);
  if (!active || !anim) return null;
  const o = origin ?? { x: window.innerWidth / 2, y: window.innerHeight * 0.62 };
  const n = Math.max(3, Math.min(6, count));
  return (
    <div key={gen} aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: zVar('celebration') }}>
      {Array.from({ length: n }).map((_, i) => {
        const s = 8 + ((i * 7) % 4) * 4;
        const dx = (i - (n - 1) / 2) * 22 + ((i % 2) ? 6 : -6);
        return (
          <motion.span key={i} style={{ position: 'absolute', left: o.x - s / 2, top: o.y - s / 2, width: s, height: s }}
            initial={{ x: dx * 0.3, y: 0, opacity: 0, scale: 0.5 }}
            animate={{ x: dx, y: -(140 + (i % 3) * 50), opacity: [0, 1, 1, 0], scale: 1 }}
            transition={{ duration: 1.1, delay: i * 0.05, ease: stepEase(10) }}>
            <BubbleShape fill={i % 2 ? 'var(--bk-bubble)' : 'var(--p3r-cyan)'} />
          </motion.span>
        );
      })}
    </div>
  );
};

/* ───────────── 转场：BlotIris（前进）/ DoubleCircleIris（返回） ───────────── */

/** 单位半径的波形圆（边缘正弦起伏），供 scale 放大 */
function blotPath(lobes = 9, amp = 0.07, n = 72) {
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 1 + amp * Math.sin(a * lobes) + amp * 0.4 * Math.sin(a * (lobes + 4) + 1.3);
    d += `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(4)},${(Math.sin(a) * r).toFixed(4)} `;
  }
  return d + 'Z';
}
const BLOT_A = blotPath(9, 0.07);
const BLOT_B = blotPath(7, 0.09);

type Origin = { x: number; y: number } | null | undefined;
interface IrisProps { active: boolean; origin?: Origin; onCovered?: () => void; onDone?: () => void }

const coverR = (o: { x: number; y: number }) => Math.hypot(Math.max(o.x, window.innerWidth - o.x), Math.max(o.y, window.innerHeight - o.y)) * 1.12 + 24;

/** 前进：两层 blot 自 origin 扩开（第二层晚 60ms、快 15%），边扩边转；遮满 onCovered@430ms，整体 820ms 淡出 */
export const BlotIris = ({ active, origin, onCovered, onDone }: IrisProps) => {
  const anim = useBoldness();
  const id = useId().replace(/:/g, '');
  useSyncFallback(active, anim, onCovered, onDone);
  useTimeline(active, anim, 430, 820, onCovered, onDone);
  if (!active || !anim) return null;
  const o = origin ?? { x: window.innerWidth / 2, y: window.innerHeight - 40 };
  const R = coverR(o);
  const W = window.innerWidth, H = window.innerHeight;
  return (
    <Portal>
      <motion.div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: zVar('transition'), pointerEvents: 'auto', overflow: 'hidden' }}
        initial={{ opacity: 1 }} animate={{ opacity: [1, 1, 0] }} transition={{ duration: 0.82, times: [0, 0.6, 1] }}>
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <radialGradient id={`${id}-sea`} cx={o.x} cy={o.y} r={R} gradientUnits="userSpaceOnUse">
              <stop offset="0%" style={{ stopColor: 'var(--bk-sea-1)' }} />
              <stop offset="55%" style={{ stopColor: 'var(--bk-sea-2)' }} />
              <stop offset="100%" style={{ stopColor: 'var(--bk-sea-3)' }} />
            </radialGradient>
            <clipPath id={`${id}-clip`}>
              <motion.path d={BLOT_B} style={{ x: o.x, y: o.y }} initial={{ scale: 0.01, rotate: 0 }} animate={{ scale: R, rotate: 40 }}
                transition={{ duration: 0.36, delay: 0.06, ease: [0.33, 0, 0.15, 1] }} />
            </clipPath>
          </defs>
          {/* 第一层：偏蓝的海 */}
          <motion.path d={BLOT_A} fill={`url(#${id}-sea)`} style={{ x: o.x, y: o.y }} initial={{ scale: 0.01, rotate: 0 }} animate={{ scale: R, rotate: -30 }}
            transition={{ duration: 0.42, ease: [0.33, 0, 0.15, 1] }} />
          {/* 第二层：放大的冷白新页底 + 焦散（clip 在第二个 blot 里） */}
          <g clipPath={`url(#${id}-clip)`}>
            <rect width={W} height={H} style={{ fill: 'var(--p3r-bg)' }} />
          </g>
        </svg>
        <motion.div style={{ position: 'absolute', inset: 0 }} initial={{ opacity: 0, scale: 1.25 }} animate={{ opacity: [0, 1, 0], scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }}>
          <Caustics opacity={0.55} fps={4} scale={1.3} />
        </motion.div>
      </motion.div>
    </Portal>
  );
};

/** 返回：两个圆分别从 origin 与其对角扩开、在中间合拢（无光圈、无水纹），遮满 onCovered@330ms，680ms 淡出 */
export const DoubleCircleIris = ({ active, origin, onCovered, onDone }: IrisProps) => {
  const anim = useBoldness();
  useSyncFallback(active, anim, onCovered, onDone);
  useTimeline(active, anim, 330, 680, onCovered, onDone);
  if (!active || !anim) return null;
  const W = window.innerWidth, H = window.innerHeight;
  const a = origin ?? { x: W * 0.18, y: H - 40 };
  const b = { x: W - a.x, y: H - a.y };
  const R = Math.hypot(W, H) * 0.62;
  const disc = (c: { x: number; y: number }, bg: string, delay: number) => (
    <motion.span style={{ position: 'absolute', left: c.x - R, top: c.y - R, width: R * 2, height: R * 2, borderRadius: '50%', background: bg }}
      initial={{ scale: 0.02 }} animate={{ scale: 1 }} transition={{ duration: 0.32, delay, ease: [0.7, 0, 0.3, 1] }} />
  );
  return (
    <Portal>
      <motion.div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: zVar('transition'), pointerEvents: 'auto', overflow: 'hidden' }}
        initial={{ opacity: 1 }} animate={{ opacity: [1, 1, 0] }} transition={{ duration: 0.68, times: [0, 0.55, 1] }}>
        {disc(a, 'var(--bk-sea-2)', 0)}
        {disc(b, 'var(--bk-sea-3)', 0.03)}
        {disc(a, 'var(--p3r-bg)', 0.1)}
        {disc(b, 'var(--p3r-bg)', 0.13)}
      </motion.div>
    </Portal>
  );
};
