/**
 * 横滑轮播（真实 src/components/StackCarousel.tsx 的红频道对位）：每页全宽，autoPlay（默认 6000ms，低动效 / 隐藏页时不自动），
 * 指针横拖切页（>40px），底部斜条页码点可点。受控 page（外部设置后跳到该页）。只动 transform。
 *   <P5StackCarousel id="ritual-p5" autoPlayMs={6000} page={p}>{slides}</P5StackCarousel>
 */
import { Children, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLowMotion } from '@/p5r-red/lib/prefs';

export function P5StackCarousel({ id, children, autoPlayMs = 6000, page, initial = 0, className = '' }: { id: string; children: ReactNode; autoPlayMs?: number; page?: number; initial?: number; className?: string }) {
  const n = Children.count(children);
  const [cur, setCur] = useState(Math.min(initial, Math.max(0, n - 1)));
  const low = useLowMotion();
  const drag = useRef<{ x: number; dx: number } | null>(null);
  const [dx, setDx] = useState(0);
  const [hold, setHold] = useState(false);
  useEffect(() => { if (page !== undefined) setCur(Math.min(page, n - 1)); }, [page, n]);
  useEffect(() => { if (cur > n - 1) setCur(Math.max(0, n - 1)); }, [n, cur]);
  useEffect(() => {
    if (low || n < 2 || hold || !autoPlayMs) return;
    const t = window.setTimeout(() => { if (!document.hidden) setCur((c) => (c + 1) % n); }, autoPlayMs);
    return () => clearTimeout(t);
  }, [cur, n, low, hold, autoPlayMs]);
  return (
    <div className={`p5-stack ${className}`.trim()} id={id} onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)}>
      <div className="p5-stack-vp"
        onPointerDown={(e) => { drag.current = { x: e.clientX, dx: 0 }; }}
        onPointerMove={(e) => { if (!drag.current) return; drag.current.dx = e.clientX - drag.current.x; if (Math.abs(drag.current.dx) > 6) setDx(drag.current.dx); }}
        onPointerUp={() => { const d = drag.current?.dx ?? 0; drag.current = null; setDx(0); if (d < -40) setCur((c) => Math.min(n - 1, c + 1)); else if (d > 40) setCur((c) => Math.max(0, c - 1)); }}
        onPointerCancel={() => { drag.current = null; setDx(0); }}
        onClickCapture={(e) => { if (Math.abs(dx) > 6) { e.preventDefault(); e.stopPropagation(); } }}>
        <div className="p5-stack-track" style={{ transform: `translateX(calc(${-cur * 100}% + ${dx}px))`, transition: dx || low ? 'none' : 'transform .46s cubic-bezier(.2,.9,.2,1)' }}>
          {Children.map(children, (c, i) => <div className="p5-stack-item" aria-hidden={i !== cur}>{c}</div>)}
        </div>
      </div>
      {n > 1 && (
        <div className="p5-stack-dots" role="tablist" aria-label="切换">
          {Array.from({ length: n }, (_, i) => <button key={i} type="button" role="tab" aria-selected={i === cur} aria-label={`第 ${i + 1} 张`} onClick={() => setCur(i)} />)}
        </div>
      )}
    </div>
  );
}
