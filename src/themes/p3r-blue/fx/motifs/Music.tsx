/**
 * B6 耳机与音乐（结城理的 MP3）—— 蓝专属。
 *   <Headphones size={22} />                          耳机线描图标（头梁 + 两耳罩 + 一根线）
 *   <EqBars bars={5} playing height={16} />           音频均衡条：AI 思考中 / 正在播放（steps 跳高度，不平滑）
 *   <NowPlaying title="Want to be close" />           页头极窄「♪ 正在播放」斜切跑马灯；无曲名时不渲染
 *   <EqThinking label="正在思索…" sub="…" />           AI 思考行（耳机 + 均衡条 + 文案），对位通用 thinking 点
 */
import { memo, type CSSProperties, type ReactNode } from 'react';
import { slantClip } from './_env';

export const Headphones = memo(({ size = 22, className, style, color = 'currentColor' }: { size?: number; className?: string; style?: CSSProperties; color?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style} aria-hidden fill="none" stroke={color} strokeWidth="2" strokeLinecap="square">
    <path d="M4 15 V12 A8 8 0 0 1 20 12 V15" />
    <path d="M3 14 H7 V21 H3 Z" style={{ fill: color }} />
    <path d="M17 14 H21 V21 H17 Z" style={{ fill: color }} />
    <path d="M19 21 C19 23 15 23.4 12.5 23.4" strokeWidth="1.2" />
  </svg>
));

const EQ = [0.86, 1.12, 0.74, 1.3, 0.95, 1.05, 0.8];

export const EqBars = memo(({ bars = 5, playing = true, height = 16, barWidth = 3, gap = 2, color = 'var(--p3r-blue)', className, style }: {
  bars?: number; playing?: boolean; height?: number; barWidth?: number; gap?: number; color?: string; className?: string; style?: CSSProperties;
}) => (
  <span aria-hidden className={`bk-eq ${className ?? ''}`} data-paused={playing ? undefined : ''} style={{ display: 'inline-flex', alignItems: 'flex-end', gap, height, ...style }}>
    {Array.from({ length: bars }).map((_, i) => (
      <i key={i} style={{ width: barWidth, height: '100%', background: i === bars - 1 ? 'var(--p3r-cyan)' : color, ['--d' as string]: `${EQ[i % EQ.length] * 0.6}s`, ['--delay' as string]: `${-i * 0.13}s`, transform: playing ? undefined : `scaleY(${0.3 + (i % 3) * 0.2})` }} />
    ))}
  </span>
));

export const NowPlaying = ({ title, artist, className, style, speed = 12 }: { title?: string | null; artist?: string; className?: string; style?: CSSProperties; speed?: number }) => {
  if (!title) return null;
  const text = artist ? `${title} — ${artist}` : title;
  const item = (k: number) => (
    <span key={k} style={{ paddingRight: 32, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: 'var(--p3r-cyan)' }}>♪</span>{text}
    </span>
  );
  return (
    <div className={className} role="status" aria-label={`正在播放：${text}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 22, maxWidth: 220, padding: '0 10px 0 8px', background: 'var(--p3r-ink)', color: 'var(--p3r-on-ink)', clipPath: slantClip(7), ...style }}>
      <Headphones size={14} color="var(--p3r-cyan)" />
      <EqBars bars={4} height={10} barWidth={2} color="var(--p3r-on-ink)" />
      <span style={{ overflow: 'hidden', flex: 1, minWidth: 0, maskImage: 'linear-gradient(90deg, transparent, var(--p3r-cream) 10%, var(--p3r-cream) 90%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, var(--p3r-cream) 10%, var(--p3r-cream) 90%, transparent)' }}>
        <span className="bk-marquee" style={{ ['--d' as string]: `${speed}s`, fontFamily: 'var(--p3r-font-cond)', fontStyle: 'italic', fontWeight: 800, fontSize: 12, letterSpacing: '0.06em' }}>
          {item(0)}{item(1)}
        </span>
      </span>
    </div>
  );
};

export const EqThinking = ({ label = '正在思索…', sub, className }: { label?: ReactNode; sub?: ReactNode; className?: string }) => (
  <div className={className} role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <span style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, flexShrink: 0, background: 'var(--p3r-cyan-faint)', clipPath: 'polygon(10% 0, 100% 0, 90% 100%, 0 100%)' }}>
      <EqBars bars={5} height={18} />
    </span>
    <span style={{ minWidth: 0 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 900, color: 'var(--p3r-ink)' }}><Headphones size={14} color="var(--p3r-blue)" />{label}</span>
      {sub && <span style={{ display: 'block', fontSize: 12, color: 'var(--p3r-grey)' }}>{sub}</span>}
    </span>
  </div>
);
