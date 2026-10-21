/**
 * 工作包 4 · 页面通用小件（kit 的本地扩展，不改 kit）：
 *   <PkgHeader title en backLabel onBack actions hud weather />  P4PageHeader 的变体：返回按钮 aria 可配（真实页「返回首页」）
 *   <DevStrip items value onChange />                            页内 Dev 状态切换（隐藏 Dev 胶囊时不渲染 → 截图干净）
 *   <Kicker>…</Kicker>                                           黑底黄字斜签（小节眉标）
 *   <StateFade>                                                  状态切换：淡入 + 雪花噪点 120ms
 *   <MsgBox speaker>…</MsgBox>                                   P4G 消息框（暗棕 + 黄偏移底板）
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { cx } from '@yellow/lib/cx';
import { usePrefs, useLowMotion } from '@yellow/lib/prefs';
import { P4Outline, P4DateWeather, IconBack, type P4Weather } from '@yellow/kit';
import { NoiseLayer } from '@yellow/fx';

export function PkgHeader({ title, en, onBack, backLabel = '返回', actions, hud = true, weather = 'sunny', sub, className }: { title: ReactNode; en?: string; onBack?: () => void; backLabel?: string; actions?: ReactNode; hud?: boolean; weather?: P4Weather; sub?: ReactNode; className?: string }) {
  return (
    <header className={cx('relative -mx-4 mb-3 px-4 pt-1 wide:-mx-8 wide:px-8', className)}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-4 h-[18px] p4g-candy-h wide:-top-8" />
      <div className="relative flex min-w-0 items-start gap-3 pt-4">
        {onBack && (
          <button type="button" aria-label={backLabel} onClick={onBack} className="p4g-press mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border-3 border-p4g-black bg-p4g-yellow text-p4g-black shadow-hard-sm night:border-p4g-yellow">
            <IconBack size={16} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          {en && (
            <div className="mb-0.5 flex items-center gap-2">
              <span className="inline-block min-w-0 max-w-full truncate whitespace-nowrap rounded-xs bg-p4g-black px-1.5 py-[2px] font-display text-2xs font-bold italic uppercase tracking-[0.18em] text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black">{en}</span>
              <span aria-hidden className="h-[3px] min-w-[12px] flex-1 bg-p4g-black/80 night:bg-p4g-yellow/60" />
            </div>
          )}
          <div className="min-w-0 overflow-hidden pb-1 pl-1">
            {typeof title === 'string' ? <P4Outline as="h1" size="clamp(30px, 9vw, 46px)" stroke={5} className="max-w-full">{title}</P4Outline> : title}
          </div>
          {sub && <div className="mt-0.5 min-w-0">{sub}</div>}
        </div>
        {(hud || actions) && (
          <div className="flex shrink-0 flex-col items-end gap-2">
            {hud && <P4DateWeather weather={weather} variant="hud" className="mr-1 mt-1" />}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
      </div>
    </header>
  );
}

export interface DevItem { id: string; label: string }
export function DevStrip({ title = 'DEV · 演示状态', items, value, onChange, className }: { title?: string; items: DevItem[]; value: string; onChange: (id: string) => void; className?: string }) {
  const p = usePrefs();
  if (p.devHidden) return null;
  return (
    <div className={cx('min-w-0 rounded-sm border-thin border-dashed border-p4g-line bg-p4g-surface-2/80 p-2', className)}>
      <div className="mb-1 font-display text-2xs font-bold uppercase tracking-[0.2em] text-p4g-ink-soft">{title}</div>
      <div className="flex flex-wrap gap-1">
        {items.map((it) => (
          <button key={it.id} type="button" onClick={() => onChange(it.id)} aria-pressed={value === it.id}
            className={cx('rounded-xs border-thin px-1.5 py-0.5 font-display text-2xs font-bold', value === it.id ? 'border-p4g-select bg-p4g-select text-[color:var(--p4g-select-ink)]' : 'border-p4g-line bg-p4g-surface text-p4g-ink')}>{it.label}</button>
        ))}
      </div>
    </div>
  );
}

export function Kicker({ children, className, tone = 'black' }: { children: ReactNode; className?: string; tone?: 'black' | 'orange' | 'yellow' }) {
  const t = tone === 'orange' ? 'bg-p4g-orange text-p4g-black' : tone === 'yellow' ? 'bg-p4g-yellow text-p4g-black border-thin border-p4g-black' : 'bg-p4g-black text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black';
  return <span className={cx('inline-flex min-w-0 max-w-full -skew-x-12 items-center px-2 py-[2px]', t, className)}><span className="block min-w-0 skew-x-12 truncate font-display text-2xs font-bold uppercase tracking-[0.18em]">{children}</span></span>;
}

/** 状态切换：淡入 + 一层 120ms 雪花闪 */
export function StateFade({ k, children, className }: { k: string; children: ReactNode; className?: string }) {
  const low = useLowMotion();
  const [noise, setNoise] = useState(false);
  useEffect(() => { if (low) return; setNoise(true); const t = setTimeout(() => setNoise(false), 120); return () => clearTimeout(t); }, [k, low]);
  return (
    <div className={cx('relative min-w-0', className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={k} className="min-w-0" initial={{ opacity: 0, y: low ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: low ? 0.12 : 0.18 }}>
          {children}
        </motion.div>
      </AnimatePresence>
      {noise && <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-sm opacity-40"><NoiseLayer animate opacity={1} /></div>}
    </div>
  );
}

export function MsgBox({ children, speaker, className }: { children: ReactNode; speaker?: ReactNode; className?: string }) {
  return (
    <div className={cx('relative min-w-0', className)}>
      <div aria-hidden className="absolute inset-0 translate-x-[6px] translate-y-[6px] rounded-sm bg-[color:var(--p4g-msg-plate)]" />
      <div className="relative overflow-hidden rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] text-[color:var(--p4g-msg-ink)] night:border-p4g-yellow">
        <div aria-hidden className="h-[5px] p4g-candy" />
        {speaker && <div className="absolute left-3 top-[5px] rounded-b-sm bg-p4g-yellow px-2.5 py-0.5 font-display text-meta font-bold text-p4g-black">{speaker}</div>}
        <div className={cx('px-4 pb-3.5', speaker ? 'pt-8' : 'pt-3')}>{children}</div>
      </div>
    </div>
  );
}

/** 简单的「标签：值」小节标题（卡片内） */
export function CardLabel({ children, en, right }: { children: ReactNode; en?: string; right?: ReactNode }) {
  return (
    <div className="mb-2 flex min-w-0 items-center gap-2">
      <span aria-hidden className="inline-block h-3.5 w-1.5 shrink-0 -skew-x-12 bg-p4g-orange" />
      <span className="shrink-0 font-display text-meta font-bold text-p4g-ink">{children}</span>
      {en && <span className="min-w-0 truncate font-display text-2xs font-bold italic uppercase tracking-[0.18em] text-p4g-ink-soft">{en}</span>}
      {right && <span className="ml-auto flex shrink-0 items-center gap-1">{right}</span>}
    </div>
  );
}
