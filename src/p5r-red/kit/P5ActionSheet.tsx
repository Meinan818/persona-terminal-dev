/**
 * 长按菜单 ActionSheet（原 P5.actionSheet）：碑牌逐个从右侧甩入（spring 340/26，间隔 .03），末尾「取消」。
 *   <P5ActionSheet open title="晨跑 5 公里" actions={[{label:'编辑',onClick}, {label:'删除',tone:'danger',onClick}]} onClose={…} />
 */
import { useLayoutEffect, useRef } from 'react';
import { Portal } from './Portal';
import { P5Button } from './P5Button';
import { spring } from '@/p5r-red/fx/spring';
import { lerp } from '@/p5r-red/lib/rng';
import { isLowMotion } from '@/p5r-red/lib/prefs';

export interface SheetAction { label: string; tone?: 'danger' | ''; onClick: () => void }
export function P5ActionSheet({ open, title, actions, onClose }: { open: boolean; title: string; actions: SheetAction[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const v = ref.current!; v.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: 'both' });
    if (isLowMotion()) return;
    const stops = [...v.querySelectorAll<HTMLElement>('.act')].map((el, i) => { el.style.transform = 'translateX(120%) rotate(8deg)'; return spring({ stiffness: 340, damping: 26, delay: 0.03 * i, onUpdate: (p) => { el.style.transform = `translateX(${lerp(120, 0, p)}%) rotate(${lerp(8, i % 2 ? 1.2 : -1.2, p)}deg)`; } }); });
    return () => stops.forEach((s) => s());
  }, [open]);
  if (!open) return null;
  const close = (fn?: () => void) => { const v = ref.current; if (v) v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'both' }).onfinish = () => { onClose(); fn?.(); }; else onClose(); };
  return (
    <Portal>
      <div className="asheet" ref={ref} onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
        <div className="ttl">{title}</div>
        {actions.map((a, i) => <P5Button key={i} tone={a.tone === 'danger' ? 'red' : i % 2 ? 'ink' : 'paper'} seed={40 + i} size="lg" className={`act ${a.tone || ''}`} onClick={() => close(a.onClick)}>{a.label}</P5Button>)}
        <P5Button tone="ink" seed={60} className="act" onClick={() => close()}>取消</P5Button>
      </div>
    </Portal>
  );
}
