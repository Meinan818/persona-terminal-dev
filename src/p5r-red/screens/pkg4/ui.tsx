/**
 * pkg4 React 小件：真实 p5 页头（返回方钮 + P5Collage 拼贴标题 + P5SubBar 纸条）、斜纸片段签（星象三 Tab / 记账 · 资产）。
 * 几何沿用真实 kit（roughSlant / P5Collage / P5SubBar），颜色走 v3 token。
 */
import type { ReactNode } from 'react';
import { P5Collage, P5SubBar, roughSlant, type CollageTile } from '@/p5r-red/kit/p5r';
import { navigate } from '@/p5r-red/shell/shellBus';
import { sfx } from '@/p5r-red/fx/sfx';

export function P4PageHead({ tiles, sub, back = 'menu', backLabel = '返回', size = 30, right }: { tiles: CollageTile[]; sub: string; back?: string; backLabel?: string; size?: number; right?: ReactNode }) {
  return (
    <header className="p4-phd">
      <button type="button" className="p4-back" aria-label={backLabel} onClick={(e) => { sfx('nav'); navigate(back, { via: 'water', origin: { x: e.clientX, y: e.clientY } }); }}><span aria-hidden="true" /></button>
      <div className="p4-phd-t"><P5Collage size={size} tiles={tiles} /><div className="p4-phd-sub"><P5SubBar segs={[{ t: sub }]} star={false} rot={-1.2} /></div></div>
      {right && <div className="p4-phd-r">{right}</div>}
    </header>
  );
}

export function P4SlantTabs<T extends string>({ items, value, onChange, seed = 280 }: { items: { id: T; label: string; hint?: string }[]; value: T; onChange: (v: T) => void; seed?: number }) {
  return (
    <div className="p4-stabs" role="tablist">
      {items.map((t, i) => {
        const on = t.id === value;
        return (
          <button key={t.id} type="button" role="tab" aria-selected={on} className={`p4-stab ${on ? 'on' : ''}`} style={{ marginLeft: i ? -9 : 0, zIndex: on ? 4 : 3 - i }} onClick={() => onChange(t.id)}>
            <span aria-hidden="true" className="l0" style={{ clipPath: roughSlant(seed + i, 13, 3) }} />
            <span aria-hidden="true" className="l1" style={{ clipPath: roughSlant(seed + 3 + i, 13, 3) }} />
            <span aria-hidden="true" className="l2" style={{ clipPath: roughSlant(seed + 6 + i, 12, 3) }} />
            <b>{t.label}</b>{t.hint != null && <small>{t.hint}</small>}
          </button>
        );
      })}
    </div>
  );
}
