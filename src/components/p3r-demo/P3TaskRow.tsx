import { motion } from 'motion/react';
import type { TodoFrequency } from '@/types';
import { P3R, slantClip } from '@/components/p3r/kit';

type TagTone = 'lilac' | 'rose' | 'coral';

interface P3TaskRowProps {
  title: string;
  done: boolean;
  important: boolean;
  fateDrawn: boolean;
  count: number;
  target: number;
  frequency: TodoFrequency;
  points: number;
  attributeLabel: string;
  extraBoosts: Array<{ label: string; points: number }>;
  tags: Array<{ label: string; tone: TagTone }>;
  ripple: string | null;
  onTap: () => void;
}

/** Source-faithful P3R dashboard task row from the blue demo package. */
export const P3TaskRow = ({
  title,
  done,
  important,
  fateDrawn,
  count,
  target,
  frequency,
  points,
  attributeLabel,
  extraBoosts,
  tags,
  ripple,
  onTap,
}: P3TaskRowProps) => {
  const tagStyle = (tone: TagTone) => ({
    clipPath: slantClip(3),
    background: tone === 'lilac'
      ? 'rgb(var(--p3r-cyan-rgb) / 0.22)'
      : tone === 'rose'
        ? 'rgb(var(--p3r-blue-rgb) / 0.14)'
        : 'var(--bk-danger-wash)',
    color: tone === 'lilac'
      ? P3R.lilacInk
      : tone === 'rose'
        ? P3R.roseInk
        : P3R.coralInk,
  });

  return (
    <button
      type="button"
      disabled={done}
      onClick={onTap}
      className={`relative flex w-full items-center gap-3 overflow-hidden px-1.5 py-2 text-left ${done ? 'cursor-not-allowed opacity-55' : ''}`}
    >
      {ripple && (
        <motion.span
          key={ripple}
          aria-hidden
          className="pointer-events-none absolute left-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full"
          style={{ background: 'rgb(var(--p3r-cyan-rgb) / 0.35)' }}
          initial={{ scale: 0.2, opacity: 1 }}
          animate={{ scale: 9, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      )}
      <span
        aria-hidden
        className="relative h-[18px] w-[18px] shrink-0"
        style={{ clipPath: slantClip(4), background: done ? P3R.cyan : 'rgb(var(--p3r-cyan-rgb) / 0.45)' }}
      >
        {!done && <span className="absolute inset-[2.5px]" style={{ clipPath: slantClip(3), background: P3R.panel }} />}
        {done && (
          <svg viewBox="0 0 12 12" className="absolute inset-0 m-auto h-3 w-3" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="flex min-w-0 max-w-full items-center gap-1.5">
            {important && <span aria-label="重要" className="h-2 w-2 shrink-0" style={{ background: P3R.magenta, clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }} />}
            {fateDrawn && <span className="shrink-0 text-[11px] font-black" style={{ color: P3R.roseInk }} title="今日抽签选中">★</span>}
            <span className={`min-w-0 truncate text-[15px] font-black ${done ? 'line-through' : ''}`} style={{ color: done ? P3R.grey : P3R.ink }}>{title}</span>
          </span>
          {tags.map((tag, index) => (
            <span key={`${tag.label}-${index}`} className="shrink-0 px-1.5 py-[2px] text-[10px] font-black leading-none" style={tagStyle(tag.tone)}>{tag.label}</span>
          ))}
        </span>
        <span className="mt-0.5 block truncate text-[11px] font-semibold" style={{ color: P3R.grey }}>
          {attributeLabel} +{points}
          {extraBoosts.map((boost, index) => <span key={index}> · {boost.label} +{boost.points}</span>)}
        </span>
        {frequency === 'count' && (
          <span aria-hidden className="mt-1 flex max-w-[160px] gap-[3px]">
            {Array.from({ length: target }).map((_, index) => (
              <span key={index} className="h-[4px] flex-1" style={{ background: index < count ? P3R.cyan : 'var(--p3r-track)', clipPath: slantClip(2) }} />
            ))}
          </span>
        )}
      </span>
      <span className="relative shrink-0 font-cond text-[14px] tabular" style={{ color: done ? P3R.lilacInk : P3R.grey }}>{count}/{target}</span>
    </button>
  );
};
