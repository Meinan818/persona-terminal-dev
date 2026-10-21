/**
 * 天气工具：类型、中文名、P4G 风格 SVG 兜底图标、时段推算。
 * 图标优先级：官方插槽 official/weather-<k>.webp → 生成素材 p4g/weather-<k>.webp → 内联 SVG。
 */
import { p4gAsset } from '@yellow/lib/asset';
import { useSlot, useImageOk } from '@yellow/lib/slots';

export type P4Weather = 'sunny' | 'cloudy' | 'rain' | 'fog' | 'snow' | 'thunder' | 'night';
export const WEATHER_LABEL: Record<P4Weather, string> = { sunny: '晴', cloudy: '阴', rain: '雨', fog: '雾', snow: '雪', thunder: '雷', night: '晴夜' };

/** P4G 时段（游戏里 Early Morning / Morning / Lunchtime / Afternoon / After School / Evening / Night）*/
export const PERIODS = [
  { from: 0, zh: '深夜', en: 'Midnight' },
  { from: 5, zh: '清晨', en: 'Early Morning' },
  { from: 8, zh: '早晨', en: 'Morning' },
  { from: 11, zh: '午休', en: 'Lunchtime' },
  { from: 13, zh: '午后', en: 'Afternoon' },
  { from: 16, zh: '放学后', en: 'After School' },
  { from: 18, zh: '傍晚', en: 'Evening' },
  { from: 20, zh: '夜晚', en: 'Night' },
  { from: 23, zh: '深夜', en: 'Midnight' },
];
export const periodOf = (d: Date) => [...PERIODS].reverse().find((p) => d.getHours() >= p.from) ?? PERIODS[0];
export const WEEK_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const WEEK_ZH = ['日', '一', '二', '三', '四', '五', '六'];

const FallbackSvg = ({ kind, size }: { kind: P4Weather; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
    <rect x="3" y="3" width="58" height="58" rx="12" fill="#ffe500" />
    <rect x="9" y="9" width="46" height="46" rx="8" fill="#2c2c2c" />
    {kind === 'sunny' && <g fill="#f39800"><circle cx="32" cy="32" r="9" />{Array.from({ length: 8 }, (_, i) => <rect key={i} x="30" y="13" width="4" height="7" transform={`rotate(${i * 45} 32 32)`} />)}</g>}
    {(kind === 'cloudy' || kind === 'fog' || kind === 'thunder') && <path d="M18 40c-4 0-6-3-5-6 1-3 4-4 6-3 1-5 6-8 11-6 3-4 10-3 12 2 5 0 8 4 6 8-1 3-3 5-6 5z" fill="#d9ceb0" />}
    {kind === 'fog' && <g stroke="#bdbdbd" strokeWidth="3"><path d="M14 44h36M18 49h28" /></g>}
    {kind === 'thunder' && <path d="M33 38l-6 10h5l-3 8 9-12h-5l3-6z" fill="#ffe500" stroke="#111" strokeWidth="1.5" />}
    {kind === 'rain' && <g><path d="M14 32a18 14 0 0136 0z" fill="#39a8e0" /><path d="M32 32v13a3 3 0 01-6 0" stroke="#39a8e0" strokeWidth="3" fill="none" /></g>}
    {kind === 'snow' && <g stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><path d="M32 16v32M18 24l28 16M18 40l28-16" /></g>}
    {kind === 'night' && <path d="M38 18a14 14 0 1 0 8 24 12 12 0 0 1-8-24z" fill="#fff08a" />}
  </svg>
);

/** 天气图标（自带 P4G 深灰圆角方块 + 黄框）*/
export function WeatherIcon({ kind, size = 44, className }: { kind: P4Weather; size?: number; className?: string }) {
  const gen = p4gAsset(`weather-${kind}.webp`);
  const src = useSlot(`weather-${kind}`, gen);
  const ok = useImageOk(src);
  if (ok === false) return <span className={className}><FallbackSvg kind={kind} size={size} /></span>;
  return <img src={src} alt={WEATHER_LABEL[kind]} width={size} height={size} className={className} draggable={false} />;
}
