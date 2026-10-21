/**
 * P6 私有小件（粉白 P3R）：本包多个弹层共用的装饰 / 小组件。kit 里没有的才放这里（给 kit 的建议见 status/pkg6.json notes）。
 *   HeavyTitle   —— 超粗斜体中文大标题（可带玫红描边影）
 *   DateHud      —— 右上日期 HUD（P3R：月/日 + 星期窄斜体 + 月相 / 天气小签）
 *   WeatherIcon  —— 单色天气 / 月相字形（SVG，无彩色 emoji）
 *   WaterLayer   —— 水面细纹层（替代雪花噪点）
 *   popVariants  —— 弹层斜向弹入 variants（替代电视开机）
 *   sampleImg    —— 本 demo 自带示例图（樱色黄昏）
 */
import type { CSSProperties, ReactNode } from 'react';
import type { Variants } from 'framer-motion';
import duskDay from '@pink/assets/pink/pink-dusk-day.webp';
import duskNight from '@pink/assets/pink/pink-dusk-night.webp';
import { P3R, slantClip } from '@pink/kit';
import { cx } from '@pink/lib/cx';

export const sampleImg = (name: string): string => (/night/.test(name) ? duskNight : duskDay);

export function HeavyTitle({ children, size = 28, as: Tag = 'span', className, color, shadow = true, style }: { children: ReactNode; size?: number | string; as?: 'span' | 'h1' | 'h2' | 'h3' | 'div'; className?: string; color?: string; shadow?: boolean; style?: CSSProperties }) {
  return (
    <Tag className={cx('relative inline-block max-w-full font-heavy leading-[1.02]', className)} style={{ fontSize: size, color: color ?? P3R.ink, textShadow: shadow ? '3px 3px 0 rgb(var(--p3r-blue-rgb) / 0.28)' : undefined, ...style }}>
      {children}
    </Tag>
  );
}

const WD = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export function DateHud({ className, weather = 'rain', date = new Date() }: { className?: string; weather?: 'rain' | 'sun' | 'cloud' | 'night' | 'moon'; date?: Date; variant?: string }) {
  return (
    <div className={cx('items-end gap-2', className)} aria-label={`${date.getMonth() + 1}月${date.getDate()}日`}>
      <span className="font-cond text-[30px] leading-none tabular" style={{ color: P3R.ink }}>{date.getMonth() + 1}<span style={{ color: P3R.blue }}>/</span>{date.getDate()}</span>
      <span className="mb-[3px] flex flex-col items-start">
        <span className="px-1.5 font-cond text-[11px] leading-[14px]" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(3) }}>{WD[date.getDay()]}</span>
        <span className="mt-0.5 flex items-center gap-1 text-[10px] font-bold" style={{ color: 'var(--p3r-lilac-ink)' }}><WeatherIcon kind={weather} size={13} />{weather === 'night' || weather === 'moon' ? '上弦' : weather === 'sun' ? '晴' : weather === 'cloud' ? '多云' : '小雨'}</span>
      </span>
    </div>
  );
}

export function WeatherIcon({ kind, size = 20, className }: { kind: 'rain' | 'sun' | 'cloud' | 'night' | 'moon' | 'snow'; size?: number; className?: string }) {
  const s = { width: size, height: size };
  const stroke = 'currentColor';
  return (
    <svg viewBox="0 0 24 24" style={s} className={cx('shrink-0', className)} fill="none" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" aria-hidden>
      {kind === 'sun' && (<><circle cx="12" cy="12" r="4.2" fill="currentColor" /><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" /></>)}
      {(kind === 'cloud' || kind === 'rain' || kind === 'snow') && <path d="M7 16.5h10.2a3.8 3.8 0 00.4-7.6 5.4 5.4 0 00-10.4 1.3A3.2 3.2 0 007 16.5z" fill="currentColor" fillOpacity={0.18} />}
      {kind === 'rain' && <path d="M8.5 19l-1 2.5M12.5 19l-1 2.5M16.5 19l-1 2.5" />}
      {kind === 'snow' && <path d="M9 20h.01M13 20.5h.01M16.5 19.5h.01" strokeWidth={3} />}
      {(kind === 'night' || kind === 'moon') && <path d="M19 14.5A7.5 7.5 0 019.5 5a7.5 7.5 0 109.5 9.5z" fill="currentColor" fillOpacity={0.85} />}
    </svg>
  );
}

/** 水面细纹（静态斜线 + 横纹，可选缓漂）；装饰层 */
export function WaterLayer({ opacity = 0.5, drift = false, className }: { opacity?: number; drift?: boolean; className?: string }) {
  return <span aria-hidden className={cx('pointer-events-none absolute inset-0 overflow-hidden', className)} style={{ opacity }}><span className={cx('p6-water absolute -inset-x-10 inset-y-0', drift && 'p6-drift')} /></span>;
}

/** 弹层斜向弹入（P3R 菜单斜板入场）：off → on；低动效淡入 */
export const popVariants = (low: boolean): Variants => (low
  ? { off: { opacity: 0 }, on: { opacity: 1, transition: { duration: 0.15 } } }
  : {
    off: { opacity: 0, x: -24, y: 18, scale: 0.94, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
    on: { opacity: 1, x: 0, y: 0, scale: 1, transition: { type: 'spring', stiffness: 360, damping: 30 } },
  });
