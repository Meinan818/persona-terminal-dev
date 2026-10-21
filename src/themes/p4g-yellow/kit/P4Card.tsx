/**
 * P4Card —— 拼贴块：黑粗描边 + 硬投影（无 blur），可选斜切角、胶带、微倾。
 *   <P4Card>…</P4Card>
 *   <P4Card tone="black" cut="br" tape="left" tilt={-1.5} shadow="lg" padding="lg">…</P4Card>
 *   <P4Card tone="msg">消息框式（暗棕 + 黄色偏移底板）</P4Card>
 *   <P4Card as="button" onClick={…} interactive>可点卡片（按下位移）</P4Card>
 *
 * tone：surface（黄渐变行色，默认）/ paper（奶油纸，长文表单）/ yellow（舞台黄）/ black（黑面白字）/ orange / msg（消息框）
 * cut：none | br | tl | both —— 斜切时边框用双层 clip 实现，阴影改用 drop-shadow（0 模糊）。
 * 内容溢出：卡片自带 min-w-0；标题请配 .p4g-clamp-1/2。
 */
import type { CSSProperties, ReactNode, ElementType, MouseEventHandler } from 'react';
import { cx } from '@yellow/lib/cx';

export type P4CardTone = 'surface' | 'paper' | 'yellow' | 'black' | 'orange' | 'msg';
export interface P4CardProps {
  children?: ReactNode;
  tone?: P4CardTone;
  cut?: 'none' | 'br' | 'tl' | 'both';
  tape?: false | 'left' | 'right' | 'center';
  tilt?: number;
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'plate';
  stroke?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  as?: ElementType;
  className?: string;
  innerClassName?: string;
  style?: CSSProperties;
  onClick?: MouseEventHandler;
  [k: string]: unknown;
}

const TONE: Record<P4CardTone, { bg: string; fg: string }> = {
  surface: { bg: 'var(--p4g-surface-grad)', fg: 'var(--p4g-ink)' },
  paper: { bg: 'var(--p4g-surface-2)', fg: 'var(--p4g-ink)' },
  yellow: { bg: 'var(--p4g-yellow)', fg: '#111' },
  black: { bg: '#111', fg: '#fff' },
  orange: { bg: 'var(--p4g-tag)', fg: 'var(--p4g-tag-ink)' },
  msg: { bg: 'var(--p4g-msg)', fg: 'var(--p4g-msg-ink)' },
};
const PAD = { none: '', sm: 'p-2.5', md: 'p-4', lg: 'p-5 wide:p-6' };
const SHADOW = { none: 'none', sm: '2px 2px 0', md: '4px 4px 0', lg: '6px 6px 0', plate: '7px 7px 0' };
const clipFor = (cut: string, c = 'var(--p4g-cut)') =>
  cut === 'br' ? `polygon(0 0,100% 0,100% calc(100% - ${c}),calc(100% - ${c}) 100%,0 100%)`
    : cut === 'tl' ? `polygon(${c} 0,100% 0,100% 100%,0 100%,0 ${c})`
      : cut === 'both' ? `polygon(${c} 0,100% 0,100% calc(100% - ${c}),calc(100% - ${c}) 100%,0 100%,0 ${c})` : undefined;

export function P4Card({ children, tone = 'surface', cut = 'none', tape = false, tilt = 0, shadow = 'md', stroke = true, padding = 'md', interactive, as: Tag = 'div', className, innerClassName, style, onClick, ...rest }: P4CardProps) {
  const t = TONE[tone];
  const shadowColor = tone === 'msg' || shadow === 'plate' ? 'var(--p4g-msg-plate)' : 'var(--p4g-shadow-color)';
  const clip = clipFor(cut);
  const strokeColor = tone === 'black' ? 'var(--p4g-line)' : tone === 'msg' ? 'var(--p4g-msg-plate)' : 'var(--p4g-line)';
  const outer: CSSProperties = {
    transform: tilt ? `rotate(${tilt}deg)` : undefined,
    ...(clip
      ? { filter: shadow !== 'none' ? `drop-shadow(${SHADOW[shadow]} ${shadowColor})` : undefined }
      : { boxShadow: shadow !== 'none' ? `${SHADOW[shadow]} ${shadowColor}` : undefined, border: stroke ? `var(--p4g-stroke) solid ${strokeColor}` : undefined, background: t.bg, color: t.fg }),
    ...style,
  };
  return (
    <Tag
      className={cx('relative min-w-0', !clip && 'rounded-sm', interactive && 'p4g-press cursor-pointer text-left', className)}
      style={outer}
      onClick={onClick}
      {...rest}
    >
      {clip ? (
        <div className="relative" style={{ clipPath: clip, background: stroke ? strokeColor : 'transparent', padding: stroke ? 'var(--p4g-stroke)' : 0 }}>
          <div className={cx('relative min-w-0', PAD[padding], innerClassName)} style={{ clipPath: clipFor(cut, 'calc(var(--p4g-cut) - 2px)'), background: t.bg, color: t.fg }}>{children}</div>
        </div>
      ) : (
        <div className={cx('relative min-w-0', PAD[padding], innerClassName)}>{children}</div>
      )}
      {tape && (
        <span aria-hidden className={cx('pointer-events-none absolute -top-2.5 h-5 w-16 bg-p4g-black/85', tape === 'left' ? 'left-3 -rotate-6' : tape === 'right' ? 'right-3 rotate-6' : 'left-1/2 -ml-8 -rotate-2')} style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,229,0,.9) 0 6px, transparent 6px 12px)' }} />
      )}
    </Tag>
  );
}
