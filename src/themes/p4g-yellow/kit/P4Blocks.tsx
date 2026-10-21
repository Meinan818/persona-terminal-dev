/**
 * 版式小件：
 *   <P4DataBlock label="连续天数" value={12} unit="天" delta="+2" tone="orange" />
 *       Status 式大号斜体数字块：橙/黄/黑底，标签在左上，数字超大斜体；value 可为字符串（"¥3,280"）
 *   <P4Stripe />  <P4Stripe variant="candy" height={8} />  <P4Stripe variant="ribbon" />
 *       黄黑警示条 / 彩虹糖条 / Rank Up 斜彩带 分隔
 *   <P4Section title="今日节目单" en="TODAY" action={<button>全部</button>}>…</P4Section>
 *       分区：斜切黑标签 + 英文小字 + 黑粗分割线
 *   <P4KeyHint items={[{key:'○',label:'确认'},{key:'×',label:'返回'}]} />
 *       P4G 右下角按键提示（白字黑描边）
 */
import type { ReactNode } from 'react';
import { cx } from '@yellow/lib/cx';

export interface P4DataBlockProps { label: ReactNode; value: ReactNode; unit?: ReactNode; delta?: ReactNode; deltaTone?: 'up' | 'down' | 'flat'; tone?: 'orange' | 'yellow' | 'black' | 'surface'; icon?: ReactNode; className?: string; size?: 'md' | 'lg' }
export function P4DataBlock({ label, value, unit, delta, deltaTone = 'up', tone = 'orange', icon, className, size = 'md' }: P4DataBlockProps) {
  const t = tone === 'orange' ? 'bg-p4g-orange text-p4g-black' : tone === 'yellow' ? 'bg-p4g-yellow text-p4g-black' : tone === 'black' ? 'bg-p4g-black text-p4g-yellow' : 'text-p4g-ink';
  return (
    <div className={cx('relative min-w-0 overflow-hidden rounded-sm border-3 border-p4g-black p-3 shadow-hard night:border-p4g-yellow', t, className)} style={tone === 'surface' ? { background: 'var(--p4g-surface-grad)' } : undefined}>
      <div className="flex min-w-0 items-center gap-1.5">
        {icon && <span className="flex shrink-0">{icon}</span>}
        <span className="min-w-0 truncate font-display text-meta font-bold uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-1 flex min-w-0 items-baseline gap-1">
        <span className={cx('min-w-0 truncate p4g-num leading-none', size === 'lg' ? 'text-[clamp(40px,11vw,60px)]' : 'text-[clamp(30px,8.5vw,42px)]')}>{value}</span>
        {unit && <span className="shrink-0 font-display text-body font-bold">{unit}</span>}
      </div>
      {delta && (
        <span className={cx('mt-1 inline-block rounded-xs px-1.5 py-[2px] p4g-num text-meta', deltaTone === 'down' ? 'bg-p4g-black text-[#ff8a7a]' : deltaTone === 'flat' ? 'bg-p4g-black/80 text-white' : 'bg-p4g-black text-p4g-sp')}>{delta}</span>
      )}
      <span aria-hidden className="pointer-events-none absolute -right-3 -top-3 h-10 w-10 rotate-45 bg-p4g-black/10" />
    </div>
  );
}

export function P4Stripe({ variant = 'hazard', height = 10, className }: { variant?: 'hazard' | 'candy' | 'candy-h' | 'ribbon'; height?: number; className?: string }) {
  const cls = variant === 'hazard' ? 'p4g-hazard border-y-2 border-p4g-black' : variant === 'candy' ? 'p4g-candy' : variant === 'candy-h' ? 'p4g-candy-h' : 'p4g-ribbon';
  return <div aria-hidden className={cx('w-full', cls, className)} style={{ height }} />;
}

export interface P4SectionProps { title: ReactNode; en?: string; action?: ReactNode; children?: ReactNode; className?: string; id?: string }
export function P4Section({ title, en, action, children, className, id }: P4SectionProps) {
  return (
    <section id={id} className={cx('min-w-0', className)}>
      <div className="mb-2.5 flex min-w-0 items-end gap-2">
        <h2 className="relative shrink-0">
          <span aria-hidden className="absolute inset-0 -skew-x-12 bg-p4g-black shadow-[3px_3px_0_var(--p4g-orange)] night:bg-p4g-yellow" />
          <span className="relative block px-3 py-1 font-display text-body font-bold text-p4g-yellow night:text-p4g-black">{title}</span>
        </h2>
        {en && <span className="min-w-0 truncate pb-0.5 font-display text-2xs font-bold italic uppercase tracking-[0.2em] text-[color:var(--p4g-on-stage)] opacity-80">{en}</span>}
        <span aria-hidden className="mb-1 h-[3px] min-w-[16px] flex-1 bg-[color:var(--p4g-on-stage)] opacity-80" />
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export function P4KeyHint({ items, className }: { items: { key: string; label: string }[]; className?: string }) {
  return (
    <div className={cx('flex flex-wrap items-center gap-x-4 gap-y-1', className)}>
      {items.map((it) => (
        <span key={it.label} className="flex -rotate-6 items-center gap-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-pill border-2 border-white bg-p4g-black text-meta font-bold text-white">{it.key}</span>
          <span className="p4g-outline-sm font-display text-body font-bold">{it.label}</span>
        </span>
      ))}
    </div>
  );
}
