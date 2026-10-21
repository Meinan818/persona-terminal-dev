/**
 * 通用 Coverflow（真实 org/TarotCoverflow.tsx、org/RosterWall.tsx 的翻牌墙手感）：
 * 左右滑动 / ← → 键 / 点两侧牌切换；中间那张放大；只动 transform/opacity。
 */
import { motion } from 'framer-motion';
import { useRef, type ReactNode } from 'react';
import { useLowMotion } from '@yellow/lib/prefs';

export function Coverflow<T>({ items, index, onIndex, render, cardW, ariaLabel, itemLabel, onCenterClick, height }: {
  items: T[]; index: number; onIndex: (i: number) => void; render: (it: T, i: number, center: boolean) => ReactNode; cardW: number; ariaLabel: string;
  itemLabel: (it: T, i: number, center: boolean) => string; onCenterClick?: () => void; height: number;
}) {
  const low = useLowMotion();
  const start = useRef<{ x: number; t: number } | null>(null);
  const moved = useRef(false);
  const go = (d: number) => onIndex(Math.max(0, Math.min(items.length - 1, index + d)));
  return (
    <div
      role="listbox" aria-label={ariaLabel} tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } if (e.key === 'Enter') onCenterClick?.(); }}
      onPointerDown={(e) => { start.current = { x: e.clientX, t: Date.now() }; moved.current = false; }}
      onPointerMove={(e) => { if (start.current && Math.abs(e.clientX - start.current.x) > 8) moved.current = true; }}
      onPointerUp={(e) => { if (!start.current) return; const dx = e.clientX - start.current.x; start.current = null; if (Math.abs(dx) > 36) go(dx < 0 ? Math.max(1, Math.round(-dx / (cardW * 0.6))) : -Math.max(1, Math.round(dx / (cardW * 0.6)))); }}
      data-qa-allow-clip className="relative w-full touch-pan-y select-none overflow-hidden outline-none"
      style={{ height }}
    >
      {items.map((it, i) => {
        const off = i - index;
        if (Math.abs(off) > 3) return null;
        const center = off === 0;
        const x = off * cardW * 0.62 + (off > 0 ? cardW * 0.12 : off < 0 ? -cardW * 0.12 : 0);
        return (
          <motion.div key={i} role="option" aria-selected={center} aria-label={itemLabel(it, i, center)}
            onClick={() => { if (moved.current) return; if (center) onCenterClick?.(); else onIndex(i); }}
            className="absolute left-1/2 top-1/2 cursor-pointer"
            style={{ width: cardW, marginLeft: -cardW / 2, zIndex: 10 - Math.abs(off) }}
            initial={false}
            animate={{ x, y: '-50%', scale: center ? 1 : 0.78 - Math.abs(off) * 0.04, rotateZ: low ? 0 : off * 3, opacity: Math.abs(off) > 2 ? 0 : center ? 1 : 0.75 }}
            transition={{ duration: low ? 0 : 0.26, ease: [0.2, 0.9, 0.1, 1] }}>
            {render(it, i, center)}
          </motion.div>
        );
      })}
    </div>
  );
}
