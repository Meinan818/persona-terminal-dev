/**
 * P4DateWeather —— P4G 日历 HUD（右上角）1:1：
 *   黑色圆头胶囊里宽字距白字 "10/20 TUE"（夜：黄底黑字）→ 下方白字黑描边时段 "放学后 / After School"
 *   → 右侧黄色同心弧 + 天气徽（深灰圆角方块黄框图标）。
 *   <P4DateWeather date={new Date()} weather="rain" />
 *   <P4DateWeather date={d} weather="sunny" period="傍晚" variant="compact" />      仅胶囊 + 小图标
 *   <P4DateWeather date={d} weather="fog" variant="calendar" />                      大号日历块（首页头图用）：
 *        巨大斜体日期数字 + 星期标签 + 天气图标 + 时段条
 *   align="right"（默认，放页头右侧）| "left"
 */
import { cx } from '@yellow/lib/cx';
import { periodOf, WEEK_EN, WEEK_ZH, WeatherIcon, WEATHER_LABEL, type P4Weather } from './weather';

export interface P4DateWeatherProps { date?: Date; weather?: P4Weather; period?: string; periodEn?: string; variant?: 'hud' | 'compact' | 'calendar'; align?: 'left' | 'right'; className?: string; showRings?: boolean; /** 胶囊配色：auto=随日夜（日黑/夜黄），yellow / black 强制 */ pill?: 'auto' | 'yellow' | 'black' }

const pad = (n: number) => String(n).padStart(2, '0');

export function P4DateWeather({ date = new Date(), weather = 'sunny', period, periodEn, variant = 'hud', align = 'right', className, showRings = true, pill = 'auto' }: P4DateWeatherProps) {
  const p = periodOf(date);
  const label = period ?? p.zh;
  const wk = date.getDay();
  const mmdd = `${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;

  if (variant === 'calendar') {
    return (
      <div className={cx('relative inline-flex min-w-0 items-end gap-2', className)} aria-label={`${date.getMonth() + 1}月${date.getDate()}日 星期${WEEK_ZH[wk]} ${WEATHER_LABEL[weather]} ${label}`}>
        <div className="flex flex-col items-start">
          <span className="rounded-xs bg-p4g-black px-1.5 py-0.5 p4g-date-type text-2xs text-white night:bg-p4g-yellow night:text-p4g-black">{date.getFullYear()}</span>
          <span className="flex items-baseline leading-none">
            <span className="p4g-num text-[clamp(44px,13vw,72px)] text-p4g-black night:text-p4g-yellow" style={{ textShadow: '3px 3px 0 var(--p4g-white)' }}>{date.getMonth() + 1}</span>
            <span className="mx-0.5 p4g-num text-[clamp(28px,8vw,44px)] text-p4g-black night:text-p4g-yellow">/</span>
            <span className="p4g-num text-[clamp(44px,13vw,72px)] text-p4g-black night:text-p4g-yellow" style={{ textShadow: '3px 3px 0 var(--p4g-white)' }}>{date.getDate()}</span>
          </span>
        </div>
        <div className="mb-1 flex flex-col items-center gap-1">
          <WeatherIcon kind={weather} size={46} />
          <span className={cx('rounded-sm px-2 py-[3px] font-display text-meta font-bold leading-none', wk === 0 ? 'bg-p4g-red text-white' : wk === 6 ? 'bg-p4g-info text-p4g-info-ink' : 'bg-p4g-black text-white night:bg-p4g-yellow night:text-p4g-black')}>{WEEK_EN[wk]}</span>
        </div>
        <span className="absolute -bottom-6 left-0 p4g-outline-sm font-display text-meta font-bold">{label}{periodEn !== '' && <span className="ml-1.5 opacity-90">{periodEn ?? p.en}</span>}</span>
      </div>
    );
  }

  const compact = variant === 'compact';
  return (
    <div className={cx('relative inline-flex min-w-0 shrink-0 items-start gap-1.5', align === 'left' && 'flex-row-reverse', className)} aria-label={`${mmdd} 星期${WEEK_ZH[wk]} ${WEATHER_LABEL[weather]} ${label}`}>
      <div className={cx('flex min-w-0 flex-col', align === 'right' ? 'items-end' : 'items-start')}>
        <span className={cx('rounded-pill p4g-date-type leading-none', pill === 'yellow' ? 'bg-p4g-yellow text-p4g-black' : pill === 'black' ? 'bg-p4g-black text-white' : 'bg-[color:var(--p4g-date-bg)] text-[color:var(--p4g-date-ink)]', compact ? 'px-2.5 py-1 text-meta' : 'px-3 py-1.5 text-[13px] wide:px-3.5 wide:text-body')}>
          {mmdd}<span className="ml-[0.5em]">{WEEK_EN[wk]}</span>
        </span>
        {!compact && <span className="mt-0.5 whitespace-nowrap pr-1 p4g-outline-sm font-display text-body font-bold leading-tight wide:text-lead">{label}</span>}
      </div>
      <span className={cx('relative flex shrink-0 items-center justify-center', !compact && showRings && (align === 'right' ? 'ml-4 mr-1' : 'mr-4 ml-1'))} style={{ width: compact ? 30 : 46, height: compact ? 30 : 46 }}>
        {showRings && !compact && (
          <svg aria-hidden className="pointer-events-none absolute" width="68" height="68" viewBox="0 0 76 76" style={{ left: -11, top: -11 }}>
            <circle cx="38" cy="38" r="35" fill="#111" />
            <circle cx="38" cy="38" r="31" fill="none" stroke="var(--p4g-yellow)" strokeWidth="5" />
          </svg>
        )}
        <WeatherIcon kind={weather} size={compact ? 30 : 40} className="relative" />
      </span>
    </div>
  );
}
