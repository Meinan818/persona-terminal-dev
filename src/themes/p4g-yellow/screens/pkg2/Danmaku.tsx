/**
 * 弹幕层实现（真实 src/components/danmaku/DanmakuLayer.tsx）：横向飘过（只动 transform），长按 500ms → 暂停 + 气泡「反馈并隐藏」→ toast「已反馈」。
 * 点气泡以外任意处散去。低动效：不飘，静止排布（真实 bold=false 时不渲染飘屏，这里保留静态以便可见）。
 * 容器需 relative overflow-hidden。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useLowMotion } from '@yellow/lib/prefs';
import { cx } from '@yellow/lib/cx';

export interface DanmakuItem { id: string; text: string }
export function DanmakuStrip({ items, topBase = 12, topStep = 14, durBase = 12, durStep = 3, tone = 'light' }: { items: DanmakuItem[]; topBase?: number; topStep?: number; durBase?: number; durStep?: number; tone?: 'light' | 'dark' }) {
  const low = useLowMotion();
  const [gone, setGone] = useState<string[]>([]);
  const [hold, setHold] = useState<{ id: string; x: number; y: number } | null>(null);
  const [toast, setToast] = useState(false);
  const t = useRef(0);
  const origin = useRef({ x: 0, y: 0 });
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => () => clearTimeout(t.current), []);
  useEffect(() => { if (!hold) return; const k = window.setTimeout(() => setHold(null), 4000); return () => clearTimeout(k); }, [hold]);
  const visible = items.filter((it) => !gone.includes(it.id));
  const begin = (id: string) => (e: React.PointerEvent<HTMLSpanElement>) => {
    const el = e.currentTarget; origin.current = { x: e.clientX, y: e.clientY };
    clearTimeout(t.current);
    t.current = window.setTimeout(() => {
      const r = el.getBoundingClientRect(); const b = box.current?.getBoundingClientRect();
      setHold({ id, x: r.left + r.width / 2 - (b?.left ?? 0), y: r.top - (b?.top ?? 0) });
    }, 500);
  };
  const cancel = () => clearTimeout(t.current);
  const move = (e: React.PointerEvent) => { const dx = e.clientX - origin.current.x; const dy = e.clientY - origin.current.y; if (dx * dx + dy * dy > 100) cancel(); };
  const confirm = () => { if (!hold) return; setGone((g) => [...g, hold.id]); setHold(null); setToast(true); window.setTimeout(() => setToast(false), 1800); };
  return (
    <div ref={box} data-qa-ignore className="pointer-events-none absolute inset-0 overflow-hidden">
      {visible.map((it, i) => {
        const paused = hold?.id === it.id;
        const dur = durBase + (i % 4) * durStep;
        return (
          <motion.span key={it.id} aria-label={`弹幕：${it.text}（长按可反馈）`}
            className={cx('pointer-events-auto absolute left-0 select-none whitespace-nowrap rounded-xs border-thin px-2 py-0.5 font-display text-meta font-bold', tone === 'light' ? 'border-p4g-black bg-white/90 text-p4g-black' : 'border-p4g-yellow bg-p4g-black/80 text-p4g-yellow', paused && 'bg-p4g-yellow text-p4g-black')}
            style={{ top: `${topBase + (i % 6) * topStep}%`, WebkitTouchCallout: 'none' }}
            initial={low ? { x: `${8 + ((i * 37) % 60)}vw` } : { x: '100vw' }}
            animate={low || paused ? undefined : { x: ['100vw', '-120%'] }}
            transition={low ? undefined : { duration: dur, repeat: Infinity, ease: 'linear', delay: (i * 1.7) % dur }}
            onPointerDown={begin(it.id)} onPointerMove={move} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel} onContextMenu={(e) => e.preventDefault()}>
            {it.text}
          </motion.span>
        );
      })}
      <AnimatePresence>
        {hold && (
          <motion.div key="hold" className="pointer-events-auto absolute inset-0 z-40" exit={{ opacity: 0 }}>
            <div className="absolute inset-0" onPointerDown={() => setHold(null)} />
            <motion.button type="button" onClick={confirm} initial={{ opacity: 0, scale: 0.85, y: 5, x: '-50%' }} animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
              className="absolute whitespace-nowrap rounded-sm border-3 border-p4g-black bg-p4g-danger px-3 py-1.5 font-display text-meta font-bold text-[color:var(--p4g-danger-ink)] shadow-hard-sm"
              style={{ left: Math.max(70, hold.x), top: Math.max(4, hold.y - 40) }}>反馈并隐藏</motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && <motion.div className="absolute inset-x-0 bottom-6 flex justify-center" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><span className="rounded-pill bg-p4g-black px-3.5 py-1.5 font-display text-cap font-bold text-white">已反馈</span></motion.div>}
      </AnimatePresence>
    </div>
  );
}
