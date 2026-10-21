/**
 * spring（原 P5.spring：framer 等价阻尼弹簧，1ms 子步积分）。参数与 framer-motion 一致：
 *   原生：P5.spring({ stiffness:300, damping:26, delay:.12, onUpdate:p=>… })
 *   React 声明式：<motion.div transition={{ type:'spring', stiffness:300, damping:26, delay:.12 }} />
 * 命令式场景（逐元素 ref 动画、需要与原生逐帧一致）用本函数；返回取消函数。
 */
export interface SpringOpts { stiffness?: number; damping?: number; mass?: number; delay?: number; onUpdate: (p: number) => void; onDone?: () => void }

export function spring({ stiffness = 100, damping = 10, mass = 1, delay = 0, onUpdate, onDone }: SpringOpts): () => void {
  let x = 0, v = 0, last: number | null = null, raf = 0;
  const t0 = performance.now() + delay * 1000;
  const step = (now: number) => {
    if (now < t0) { raf = requestAnimationFrame(step); return; }
    if (last === null) last = now;
    let dt = Math.min(64, now - last); last = now;
    for (; dt > 0; dt -= 1) { const h = Math.min(1, dt) / 1000; const a = (-stiffness * (x - 1) - damping * v) / mass; v += a * h; x += v * h; }
    onUpdate(x);
    if (Math.abs(1 - x) < 0.0005 && Math.abs(v) < 0.005) { onUpdate(1); onDone?.(); return; }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

/** framer-motion transition 写法（声明式迁移用） */
export const springT = (stiffness: number, damping: number, delay = 0, mass = 1) => ({ type: 'spring' as const, stiffness, damping, mass, delay });
