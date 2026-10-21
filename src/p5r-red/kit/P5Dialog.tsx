/**
 * 居中对话框基座（ConfirmDialog 的壳：粗糙纸面 + 红巨星 + 黑小星 + ✕，迁移自 overlays/a.js .oa-cf）。
 * P5Confirm 在它上面加按钮行；其它「居中弹窗」也可直接用：
 *   <P5Dialog open onClose title="温馨提示" icon="⚠️" description="…" footer={<…按钮行/>}>…</P5Dialog>
 * 入场 spring 360/22（translateY 40→0, scale .86→1, rotate -6→-1.2）；低动效淡入。
 */
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { P5Layer, P5OaStar, P5OaRough, P5XGlyph } from './P5Layer';
import { spring } from '@/p5r-red/fx/spring';
import { lerp } from '@/p5r-red/lib/rng';
import { isLowMotion } from '@/p5r-red/lib/prefs';

export interface P5DialogProps { open: boolean; onClose: () => void; title?: ReactNode; icon?: ReactNode; description?: ReactNode; children?: ReactNode; footer?: ReactNode; escClose?: boolean; z?: number; role?: 'dialog' | 'alertdialog' }
export function P5Dialog({ open, onClose, title, icon, description, children, footer, escClose = true, z = 890, role = 'dialog' }: P5DialogProps) {
  const card = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const c = card.current; if (!c || isLowMotion()) return;
    return spring({ stiffness: 360, damping: 22, onUpdate: (p) => { c.style.transform = `translateY(${lerp(40, 0, p)}px) scale(${lerp(0.86, 1, p)}) rotate(${lerp(-6, -1.2, p)}deg)`; c.style.opacity = String(Math.min(1, p * 2)); } });
  }, [open]);
  return (
    <P5Layer open={open} onClose={onClose} cls="oa-cf" z={z} escClose={escClose}>
      <div className="oa-cf-card" role={role} aria-modal="true" aria-labelledby="oa-cf-t" ref={card}>
        <div className="oa-cf-paper"><P5OaRough seed={301} face="var(--p5r-paper)" frame="#111" jag={6} d={[6, 7]} /></div>
        <span className="oa-cf-bigstar" aria-hidden="true"><P5OaStar size={92} fill="var(--red)" stroke="var(--p5r-paper)" sw={6} rot={12} /></span>
        <span className="oa-cf-smstar" aria-hidden="true"><P5OaStar size={34} fill="#111" stroke="var(--p5r-paper)" sw={6} rot={-16} /></span>
        <button className="oa-cf-x" aria-label="关闭" onClick={onClose}><P5XGlyph s={15} c="var(--p5r-paper)" /></button>
        <div className="oa-cf-in">
          {icon != null && <div className="oa-cf-ic" aria-hidden="true">{icon}</div>}
          {title != null && <h2 id="oa-cf-t">{title}</h2>}
          {description && <p>{description}</p>}
          {children && <div className="oa-cf-ch">{children}</div>}
          {footer && <div className="oa-cf-row">{footer}</div>}
        </div>
      </div>
    </P5Layer>
  );
}
