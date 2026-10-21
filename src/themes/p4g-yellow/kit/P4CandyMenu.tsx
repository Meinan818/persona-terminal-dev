/**
 * P4CandyMenu —— P4G 暂停菜单 1:1：彩虹竖条背景带 + 黑色粗体条目，选中项放大（"Equip"），
 * 底部白字黑描边说明（"Change/view equipment"）。用于菜单页、侧栏。
 *   <P4CandyMenu value={cur} onChange={setCur} items={[{id:'skill',label:'技能',desc:'查看技能'}, …]} onEnter={id=>…} />
 * 选中项：字号 ×1.6，左侧小黑三角；条目单行不换行，过长省略。
 */
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cx } from '@yellow/lib/cx';
import { useLowMotion } from '@yellow/lib/prefs';
import { useSlotExists, slotUrl } from '@yellow/lib/slots';

export interface P4CandyItem { id: string; label: ReactNode; desc?: ReactNode; icon?: ReactNode; badge?: ReactNode }
export interface P4CandyMenuProps { items: P4CandyItem[]; value: string; onChange?: (id: string) => void; onEnter?: (id: string) => void; className?: string; showDesc?: boolean; size?: 'md' | 'lg' }

export function P4CandyMenu({ items, value, onChange, onEnter, className, showDesc = true, size = 'lg' }: P4CandyMenuProps) {
  const low = useLowMotion();
  const official = useSlotExists('menu-bg');
  const cur = items.find((i) => i.id === value);
  return (
    <div className={cx('relative min-w-0 overflow-hidden border-x-[3px] border-p4g-black', className)} style={official ? { backgroundImage: `url(${slotUrl('menu-bg')})`, backgroundSize: 'cover' } : { background: 'var(--p4g-candy)' }}>
      <nav className="relative flex flex-col px-4 py-5">
        {items.map((it) => {
          const on = it.id === value;
          return (
            <motion.button
              key={it.id} type="button" layout={!low}
              onMouseEnter={() => onChange?.(it.id)} onFocus={() => onChange?.(it.id)}
              onClick={() => { onChange?.(it.id); onEnter?.(it.id); }}
              className="relative flex min-w-0 items-center gap-2 py-[2px] text-left"
              transition={{ duration: 0.14, ease: [0.2, 0.9, 0.1, 1] }}
            >
              {on && <span aria-hidden className="absolute -left-3 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[8px] border-l-[11px] border-y-transparent border-l-p4g-black" />}
              {it.icon && <span className="flex shrink-0 text-p4g-black">{it.icon}</span>}
              <span
                className="min-w-0 truncate font-display font-bold leading-[1.05] text-p4g-black"
                style={{ fontSize: on ? (size === 'lg' ? 'clamp(34px, 9vw, 46px)' : '30px') : (size === 'lg' ? 'clamp(22px, 6vw, 28px)' : '20px'), textShadow: '0 0 0 #000, 2px 0 0 rgba(255,255,255,.55), -2px 0 0 rgba(255,255,255,.55), 0 2px 0 rgba(255,255,255,.55), 0 -2px 0 rgba(255,255,255,.55)', transition: 'font-size var(--p4g-dur-fast) var(--p4g-ease-snap)' }}
              >{it.label}</span>
              {it.badge && <span className="shrink-0">{it.badge}</span>}
            </motion.button>
          );
        })}
      </nav>
      {showDesc && cur?.desc && <div className="relative px-4 pb-4 p4g-outline-sm font-display text-body font-bold p4g-clamp-2">{cur.desc}</div>}
    </div>
  );
}
