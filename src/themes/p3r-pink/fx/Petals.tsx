/**
 * 樱瓣点缀（粉专属次要装饰：小、稀、只走 transform/opacity；低动效隐藏）。
 *   <Petals count={6} />                    常驻飘落层（父级 relative/fixed + overflow-hidden）
 *   <PetalBurst active={x} origin={{x,y}} /> 一次性迸散（庆祝 / 解锁瞬间），播完自卸
 */
import { memo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useBoldness } from '@pink/lib/prefs';

const SEED = [
  { left: '8%', d: 17, delay: -2, x: -60, s: 1 },
  { left: '27%', d: 21, delay: -11, x: -30, s: 0.8 },
  { left: '46%', d: 15, delay: -6, x: -80, s: 0.9 },
  { left: '63%', d: 23, delay: -15, x: -40, s: 0.7 },
  { left: '78%', d: 18, delay: -4, x: -70, s: 1 },
  { left: '91%', d: 25, delay: -19, x: -50, s: 0.75 },
  { left: '36%', d: 19, delay: -8, x: -55, s: 0.85 },
  { left: '55%', d: 22, delay: -13, x: -35, s: 0.7 },
];

export const PetalShape = ({ fill }: { fill: string }) => (
  <svg viewBox="0 0 10 12" className="h-full w-full" aria-hidden>
    <path d="M5 0.6 C8.6 2.6 9.6 7 5.6 11.4 L5 10.2 L4.4 11.4 C0.4 7 1.4 2.6 5 0.6 Z" fill={fill} />
  </svg>
);

export const Petals = memo(({ count = 6 }: { count?: number }) => (
  <>
    {SEED.slice(0, Math.min(count, SEED.length)).map((p, i) => (
      <span key={i} aria-hidden className="pk-petal" style={{ left: p.left, ['--d' as string]: `${p.d}s`, ['--delay' as string]: `${p.delay}s`, ['--x' as string]: `${p.x}px`, width: 9 * p.s, height: 11 * p.s }}>
        <i><PetalShape fill={i % 2 ? 'var(--pk-petal-a)' : 'var(--pk-petal-b)'} /></i>
      </span>
    ))}
  </>
));

export const PetalBurst = ({ active, origin, count = 14, onDone }: { active: boolean; origin?: { x: number; y: number }; count?: number; onDone?: () => void }) => {
  const anim = useBoldness();
  const [gen, setGen] = useState(0);
  useEffect(() => { if (active) setGen((g) => g + 1); }, [active]);
  const done = useRef(onDone); done.current = onDone; // ref 持有：父组件重渲染不再重置 1.3s 定时器
  useEffect(() => { if (!active) return; const t = window.setTimeout(() => done.current?.(), 1300); return () => clearTimeout(t); }, [active, gen]);
  if (!active || !anim) return null;
  const o = origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  return (
    <div key={gen} aria-hidden className="pointer-events-none fixed inset-0" style={{ zIndex: 'var(--p3r-z-celebration)' as unknown as number }}>
      {Array.from({ length: count }).map((_, i) => {
        const a = (Math.PI * 2 * i) / count + (i % 3) * 0.3;
        const dist = 90 + (i % 4) * 34;
        return (
          <motion.span key={i} className="absolute h-[12px] w-[10px]" style={{ left: o.x - 5, top: o.y - 6 }}
            initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.6 }}
            animate={{ x: Math.cos(a) * dist, y: Math.sin(a) * dist + 60, rotate: 180 + i * 40, opacity: 0, scale: 1 }}
            transition={{ duration: 1.1, ease: [0.2, 0.8, 0.3, 1] }}>
            <PetalShape fill={i % 2 ? 'var(--pk-petal-a)' : 'var(--p3r-blue)'} />
          </motion.span>
        );
      })}
    </div>
  );
};
