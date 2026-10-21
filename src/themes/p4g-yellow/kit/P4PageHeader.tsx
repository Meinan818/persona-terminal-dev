/**
 * P4PageHeader —— 页头（S.Link / Status 式）：
 *   顶部横向彩条（可关）→ 白字粗黑描边大标题（中文）+ 英文斜体小标 → 右侧 P4G 日期天气 HUD。
 *   <P4PageHeader title="羁绊" en="S.LINK" weather="rain" />
 *   <P4PageHeader title="设置" en="SYSTEM" onBack={() => back()} actions={<P4Button variant="icon">…</P4Button>} hud={false} />
 *   <P4PageHeader title="记账" en="LEDGER" subtitle="本月 ¥3,280" stripe={false} />
 * 标题过长：clamp 字号 + 单行省略（不换行、不溢出）。宽屏：标题更大、HUD 靠右。
 * 紧凑模式（compact='auto' 默认）：视口 <420px 时 HUD 自动换成「10/20 TUE + 小天气徽」胶囊，标题降一档。
 */
import type { ReactNode } from 'react';
import { cx } from '@yellow/lib/cx';
import { P4Outline } from './P4Outline';
import { P4DateWeather } from './P4DateWeather';
import type { P4Weather } from './weather';
import { IconBack } from './icons';

export interface P4PageHeaderProps {
  title: ReactNode;
  en?: string;
  subtitle?: ReactNode;
  onBack?: () => void;
  actions?: ReactNode;
  hud?: boolean;
  date?: Date;
  weather?: P4Weather;
  period?: string;
  stripe?: boolean;
  className?: string;
  /** 紧凑模式：'auto'（默认）= 视口 <420px（360–390 手机）自动把 HUD 换成小胶囊、标题降一档，避免 HUD 挤压标题；true 强制紧凑；false 关闭 */
  compact?: 'auto' | boolean;
}

export function P4PageHeader({ title, en, subtitle, onBack, actions, hud = true, date, weather = 'sunny', period, stripe = true, className, compact = 'auto' }: P4PageHeaderProps) {
  const auto = compact === 'auto';
  const titleVar = compact === true
    ? '[--p4g-ph-title:clamp(26px,7.6vw,34px)]'
    : auto ? '[--p4g-ph-title:clamp(30px,9vw,46px)] max-[419px]:[--p4g-ph-title:clamp(26px,7.6vw,34px)]' : '[--p4g-ph-title:clamp(30px,9vw,46px)]';
  return (
    <header className={cx('relative -mx-4 mb-4 px-4 pt-1 wide:-mx-8 wide:px-8', titleVar, className)}>
      {stripe && <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-4 h-[18px] p4g-candy-h wide:-top-8" />}
      <div className={cx('relative flex min-w-0 items-start gap-3', stripe && 'pt-4')}>
        {onBack && (
          <button type="button" aria-label="返回" onClick={onBack} className="p4g-press mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border-3 border-p4g-black bg-p4g-yellow text-p4g-black shadow-hard-sm night:border-p4g-yellow">
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
            <P4Outline as="h1" size="var(--p4g-ph-title)" stroke={5} className="max-w-full">{title}</P4Outline>
          </div>
        </div>
        {(hud || actions) && (
          <div className="flex shrink-0 flex-col items-end gap-2">
            {hud && compact !== true && <P4DateWeather date={date} weather={weather} period={period} variant="hud" className={cx('mr-1 mt-1', auto && 'max-[419px]:hidden')} />}
            {hud && compact !== false && <P4DateWeather date={date} weather={weather} period={period} variant="compact" className={cx('mt-1', auto && 'hidden max-[419px]:inline-flex')} />}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
      </div>
      {subtitle && <div className="relative mt-1 p4g-clamp-2 font-display text-body font-bold" style={{ color: 'var(--p4g-on-stage)' }}>{subtitle}</div>}
    </header>
  );
}
