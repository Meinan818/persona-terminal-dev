/** 分段选择（.seg，选中红底 rotate(-3) scale 1.06）。原生用 aria-pressed，这里一致。也作 P5Tabs 用。 */
import type { ReactNode } from 'react';
export interface SegItem<T extends string> { id: T; label: ReactNode }
export function P5Seg<T extends string>({ items, value, onChange, className = '' }: { items: SegItem<T>[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={`seg ${className}`.trim()} role="group">
      {items.map((it) => <button key={it.id} type="button" aria-pressed={it.id === value} onClick={() => onChange(it.id)}>{it.label}</button>)}
    </div>
  );
}
export const P5Tabs = P5Seg;
