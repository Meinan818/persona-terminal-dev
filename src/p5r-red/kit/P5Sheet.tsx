/**
 * 底部抽屉（原 P5.sheet(title, body)）：红闸门擦过 560ms + 纸面 translateY 110%→0、rotate -4→0（spring 300/26，delay .12）。
 * 宽屏（≥1024 横屏）居中。点遮罩 / ✕ 关闭。
 *   <P5Sheet open={open} onClose={() => setOpen(false)} title="主题" seed={31}>…</P5Sheet>
 * 低动效：只淡入淡出。
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Portal } from './Portal';
import { P5Shp } from './P5Shp';
import { P5Plate } from './P5Plate';
import { spring } from '@/p5r-red/fx/spring';
import { lerp } from '@/p5r-red/lib/rng';
import { isLowMotion } from '@/p5r-red/lib/prefs';

export interface P5SheetProps { open: boolean; onClose: () => void; title: ReactNode; seed?: number; children?: ReactNode; className?: string; /** 关闭动画播完后 */ onClosed?: () => void }

export function P5Sheet({ open, onClose, title, seed = 31, children, className = '', onClosed }: P5SheetProps) {
  const [mounted, setMounted] = useState(open);
  const veil = useRef<HTMLDivElement>(null), sh = useRef<HTMLElement>(null);
  useEffect(() => { if (open) setMounted(true); }, [open]);

  useLayoutEffect(() => {
    if (!mounted || !open) return;
    const v = veil.current!, s = sh.current!;
    v.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: 'both' });
    if (isLowMotion()) return;
    const gate = document.createElement('i');
    gate.style.cssText = 'position:absolute;top:-10%;bottom:-10%;left:0;width:150%;background:var(--red);clip-path:polygon(0 0,100% 0,84% 100%,0 100%);pointer-events:none;z-index:2';
    v.appendChild(gate);
    gate.animate([{ transform: 'translateX(-120%)' }, { transform: 'translateX(130%)' }], { duration: 560, easing: 'cubic-bezier(.72,0,.28,1)', fill: 'both' }).onfinish = () => gate.remove();
    s.style.transform = 'translateY(110%)';
    return spring({ stiffness: 300, damping: 26, delay: 0.12, onUpdate: (p) => { s.style.transform = `translateY(${lerp(110, 0, p)}%) rotate(${lerp(-4, 0, p)}deg)`; } });
  }, [mounted, open]);

  useEffect(() => {
    if (open || !mounted) return;
    const v = veil.current, s = sh.current; if (!v || !s) { setMounted(false); return; }
    v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'both' });
    s.animate([{ transform: 'none' }, { transform: 'translateY(60px) rotate(2deg)', opacity: 0 }], { duration: 200, fill: 'both' }).onfinish = () => { setMounted(false); onClosed?.(); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;
  return (
    <Portal>
      <div className="sheet-veil" ref={veil} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <P5Shp as="section" ref={sh} kind="torn" seed={seed} tone="paper" className={`sheet ${className}`} role="dialog" aria-modal="true">
          <h3><P5Plate fs={20}>{title}</P5Plate></h3>
          <button className="x" aria-label="关闭" onClick={onClose}>✕</button>
          <div className="sheet-body">{children}</div>
        </P5Shp>
      </div>
    </Portal>
  );
}
