/**
 * 工作包 4 · 页面通用小件（kit 的本地扩展，不改 kit）：
 *   <DevStrip items value onChange />   页内演示状态切换（Dev 胶囊隐藏 / 截图模式不渲染）
 *   <StateFade k>                       状态切换交叉淡入 160ms（低动效 120ms 纯淡入）
 *   <Slashes />                         真实 DailyDraw p3「// 标题 //」两侧斜杠（原青 → 藕紫）
 *   <PhaseTitle title sub />            真实 DailyDraw p3 动态说明（玫红深大字 + 斜杠 + 灰小字）
 *   <HintStrip>                         真实 p3 无 Key 提示：樱粉斜条 + 左玫红斜片
 *   <ErrStrip>                          真实 p3 错误条：珊瑚 9% 底斜条
 *   <Label en right>                    卡片内小节题（玫红斜片 + 粗斜体 + 窄斜体英文）
 *   <SlantAction tone>                  真实 p3 flex-1 斜切大按钮（primary 玫红 / soft 樱粉）
 */
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { P3R, slantClip } from '@pink/kit';
import { usePrefs, useLowMotion } from '@pink/lib/prefs';
import { cx } from '@pink/lib/cx';

export interface DevItem { id: string; label: string }
export function DevStrip({ title = 'DEV · 演示状态', items, value, onChange, className }: { title?: string; items: DevItem[]; value: string; onChange: (id: string) => void; className?: string }) {
  const p = usePrefs();
  if (p.devHidden) return null;
  return (
    <div className={cx('min-w-0 p-2', className)} style={{ background: 'rgb(var(--p3r-wash) / 0.7)', clipPath: slantClip(8) }}>
      <div className="mb-1 px-1 font-cond text-[10px] uppercase tracking-[0.2em]" style={{ color: P3R.grey }}>{title}</div>
      <div className="flex flex-wrap gap-1 px-1">
        {items.map((it) => {
          const on = value === it.id;
          return (
            <button key={it.id} type="button" onClick={() => onChange(it.id)} aria-pressed={on} className="h-6 px-2 text-[11px] font-black"
              style={{ clipPath: slantClip(4), background: on ? P3R.blue : 'var(--p3r-row)', color: on ? P3R.onBlue : P3R.ink }}>{it.label}</button>
          );
        })}
      </div>
    </div>
  );
}

export function StateFade({ k, children, className }: { k: string; children: ReactNode; className?: string }) {
  const low = useLowMotion();
  return (
    <div className={cx('relative min-w-0', className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={k} className="min-w-0" initial={{ opacity: 0, x: low ? 0 : 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: low ? 0 : -18 }} transition={{ duration: low ? 0.12 : 0.16 }}>
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export const Slashes = () => (
  <span aria-hidden className="flex shrink-0 gap-[3px]">
    {[0, 1].map((i) => <span key={`sl${i}`} className="block h-[16px] w-[5px]" style={{ background: P3R.cyan, transform: 'skewX(-24deg)' }} />)}
  </span>
);

export function PhaseTitle({ title, sub, className }: { title: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={cx('px-4 text-center', className)}>
      <h2 className="flex items-center justify-center gap-3 font-heavy text-[19px] tracking-[2px]" style={{ color: P3R.blueDeep }}>
        <Slashes /><span className="min-w-0">{title}</span><Slashes />
      </h2>
      {sub && <p className="mt-1.5 text-[12px] font-bold" style={{ color: P3R.grey }}>{sub}</p>}
    </div>
  );
}

export function HintStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('flex items-start gap-2.5 px-4 py-3', className)} style={{ clipPath: slantClip(10), background: P3R.cyanPale }}>
      <span aria-hidden className="mt-0.5 h-[14px] w-[10px] shrink-0" style={{ background: P3R.blue, clipPath: 'polygon(32% 0, 100% 0, 68% 100%, 0 100%)' }} />
      <div className="min-w-0 text-[12px] font-bold leading-relaxed" style={{ color: P3R.ink }}>{children}</div>
    </div>
  );
}

export function ErrStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('whitespace-pre-wrap p-3.5 text-[13px] font-bold', className)} role="alert" style={{ clipPath: slantClip(10), background: 'color-mix(in srgb, var(--p3r-magenta) 12%, transparent)', color: 'var(--p3r-coral-ink)' }}>{children}</div>
  );
}

export function Label({ children, en, right, className }: { children: ReactNode; en?: string; right?: ReactNode; className?: string }) {
  return (
    <div className={cx('mb-2 flex min-w-0 items-center gap-2', className)}>
      <span aria-hidden className="h-[14px] w-[10px] shrink-0" style={{ background: P3R.blue, clipPath: 'polygon(32% 0, 100% 0, 68% 100%, 0 100%)' }} />
      <span className="shrink-0 font-heavy text-[14px]" style={{ color: P3R.ink }}>{children}</span>
      {en && <span className="min-w-0 truncate font-cond text-[11px] uppercase tracking-[0.16em]" style={{ color: P3R.grey }}>{en}</span>}
      {right && <span className="ml-auto flex shrink-0 items-center gap-1">{right}</span>}
    </div>
  );
}

export function SlantAction({ children, onClick, tone = 'primary', className, disabled, ariaLabel }: { children: ReactNode; onClick?: () => void; tone?: 'primary' | 'soft' | 'ink'; className?: string; disabled?: boolean; ariaLabel?: string }) {
  const s = tone === 'primary' ? { background: P3R.blue, color: P3R.onBlue } : tone === 'ink' ? { background: P3R.ink, color: 'var(--p3r-on-ink)' } : { background: P3R.cyanPale, color: P3R.ink };
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={ariaLabel} className={cx('min-w-0 flex-1 truncate px-2 py-3 text-[14px] font-black active:brightness-95 disabled:opacity-40', className)} style={{ clipPath: slantClip(10), ...s }}>{children}</button>
  );
}
