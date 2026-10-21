/**
 * B8 臂章红双三角光标 —— 原作暂停菜单光标：红、白两个三角相叠（相加混色），空闲 2–4s 随机抽动一次；
 * 挂载（= 选中项变化）时先超出再回弹 3 段（0.2s / 0.1s / 0.1s）。
 *
 * 签名与 kit 的选择楔一致，可原位替换：父级 relative；
 *   <TriCursor className="-left-3 -right-6 inset-y-0" />          （Tailwind 定位类照用）
 *   <TriCursor style={{ left: -12, right: -24, top: 0, bottom: 0 }} />
 * 字压在其上用 --p3r-mulberry（固定深墨）或 --p3r-cream。低动效：不抽动、不回弹。
 */
import { memo, useId, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { useBoldness } from './_env';

export interface TriCursorProps {
  className?: string;
  style?: CSSProperties;
  /** 只显示红白双三角（不带后面的白色长底板），用于轮盘 / 小控件 */
  compact?: boolean;
  /** 空闲抽动周期基数（秒），每个实例在 2–4s 之间错开 */
  idle?: number;
}

export const TriCursor = memo(({ className, style, compact = false, idle }: TriCursorProps) => {
  const anim = useBoldness();
  const uid = useId();
  const n = [...uid].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7) % 7;
  const period = idle ?? 2 + (n % 5) * 0.45;
  return (
    <motion.span aria-hidden className={className} style={{ position: 'absolute', pointerEvents: 'none', ...(compact ? { width: 44, height: 30 } : null), ...style }}
      initial={anim ? { x: -16 } : false} animate={{ x: anim ? [-16, 7, -3, 0] : 0 }}
      transition={{ duration: 0.4, times: [0, 0.5, 0.75, 1], ease: [0.55, 0, 0.45, 1] }}>
      {/* 白长底板（剃刀平行四边形）：选中行的整格高亮 */}
      {!compact && <span style={{ position: 'absolute', inset: 0, background: 'var(--p3r-cream)', clipPath: 'polygon(3% 8%, 100% 0, 97% 92%, 0 100%)', boxShadow: '0 0 0 1px var(--p3r-cyan-pale)' }} />}
      {/* 红三角（大）+ 白三角（小，错位叠在其上）；mix-blend lighten = 相加混色感 */}
      <span className="bk-twitch" style={{ position: 'absolute', left: compact ? 0 : '-4%', top: compact ? 0 : '-18%', width: compact ? '100%' : 'min(38%, 120px)', height: compact ? '100%' : '136%', ['--d' as string]: `${period}s`, ['--delay' as string]: `${-n * 0.37}s` }}>
        <svg viewBox="0 0 120 80" preserveAspectRatio="none" width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <polygon points="0,10 120,34 6,80" style={{ fill: 'var(--bk-red)' }} />
          <polygon points="14,0 104,46 30,62" style={{ fill: 'var(--p3r-cream)', mixBlendMode: 'lighten' }} />
          <polygon points="14,0 104,46 30,62" fill="none" style={{ stroke: 'var(--p3r-mulberry)' }} strokeWidth="1.2" opacity="0.35" />
        </svg>
      </span>
    </motion.span>
  );
});

/** 演示用菜单列表：选中项挂 TriCursor，其余项青蓝字 + 轻微波动（原作未选中字带波动） */
export const TriMenu = ({ items, active, onPick, className }: { items: string[]; active: number; onPick?: (i: number) => void; className?: string }) => {
  const anim = useBoldness();
  return (
    <div className={className} role="listbox" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((it, i) => {
        const on = i === active;
        return (
          <button key={it} role="option" aria-selected={on} onClick={() => onPick?.(i)}
            style={{ position: 'relative', display: 'block', textAlign: 'left', border: 0, background: 'transparent', padding: '6px 20px 6px 22px', cursor: 'pointer', transform: `translateX(${i * 10}px)` }}>
            {on && <TriCursor key={`cur-${active}`} style={{ left: 0, right: -10, top: 2, bottom: 2 }} />}
            <motion.span style={{ position: 'relative', display: 'inline-block', fontFamily: 'var(--p3r-font-cond)', fontStyle: 'italic', fontWeight: 800, fontSize: on ? 30 : 24, lineHeight: 1, letterSpacing: '0.02em', textTransform: 'uppercase', color: on ? 'var(--p3r-mulberry)' : 'var(--p3r-blue)', opacity: on ? 1 : 0.82 }}
              animate={!on && anim ? { y: [0, -1.5, 0, 1, 0] } : { y: 0 }} transition={!on && anim ? { duration: 2.4, repeat: Infinity, delay: i * 0.3, ease: 'linear' } : { duration: 0 }}>{it}</motion.span>
          </button>
        );
      })}
    </div>
  );
};
