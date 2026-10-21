/**
 * RadialWheel.p3r —— 长按轮盘演出层（真实 src/components/RadialWheelP3.tsx）的受控版：open / active / origin 全由外部给，供分阶段演示。
 *   遮罩：以 ◈ 为心向外渐暗 + 顶部下压 · RingBurst 四圈同心环（奶油 / 藕紫交替，.95s，错帧 .11）+ 五处散点环循环 ·
 *   VelvetTime「MASKED / TIME」背景大字裁切揭示 + 缓漂 · 七根竖直平行四边形条（奶油白）自底 scaleY 弹起（中间快两侧慢）·
 *   选中条翻玫红 + scale 1.16 + 运动三角高亮自下扫入 + 底缘小斜片藕紫 → 珊瑚；条外 dim。
 * 几何 / 命中：复用外壳 p3Strip / p3Pick（横向等宽分带，抬过条带下缘 26px 取消）。
 */
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Portal, P3R, P3Highlight, slantClip, tickClip } from '@pink/kit';
import { WHEEL_ITEMS, p3Strip, type P3Strip, type WheelItem } from '@pink/shell/RadialWheelP3.p3r';

const Ring = ({ cx, cy, r0, r1, stroke, width, delay, duration, repeat, fadeEarly }: { cx: number; cy: number; r0: number; r1: number; stroke: string; width: number; delay: number; duration: number; repeat?: boolean; fadeEarly?: boolean }) => (
  <motion.circle cx={cx} cy={cy} fill="none" stroke={stroke} strokeWidth={width} initial={{ r: r0, opacity: 0 }} animate={{ r: r1, opacity: [0, 0.85, 0.45, 0] }}
    transition={{ duration, delay, ease: [0.16, 0.7, 0.35, 1], opacity: { duration, delay, times: fadeEarly ? [0, 0.08, 0.34, 0.66] : [0, 0.12, 0.6, 1] }, ...(repeat ? { repeat: Infinity, repeatDelay: 0.5 } : {}) }} />
);
const SCATTER = [
  { fx: 0.18, fy: 0.24, r: 118, d: 0.18, dur: 2.1 }, { fx: 0.82, fy: 0.17, r: 96, d: 0.52, dur: 2.4 }, { fx: 0.72, fy: 0.46, r: 138, d: 0.05, dur: 2.6 },
  { fx: 0.12, fy: 0.58, r: 84, d: 0.78, dur: 2.2 }, { fx: 0.5, fy: 0.09, r: 108, d: 0.35, dur: 2.8 },
];
const RingBurst = ({ origin }: { origin: { x: number; y: number } }) => {
  const vw = window.innerWidth, vh = window.innerHeight;
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      {[0, 1, 2, 3].map((i) => <Ring key={`o${i}`} cx={origin.x} cy={origin.y} r0={16} r1={200 + i * 92} stroke={i % 2 === 1 ? 'var(--p3r-cyan)' : 'var(--p3r-cream)'} width={i % 2 === 1 ? 20 : 15} delay={i * 0.11} duration={0.95} fadeEarly />)}
      {SCATTER.map((s, i) => (
        <g key={`s${i}`}>
          <Ring cx={s.fx * vw} cy={s.fy * vh} r0={6} r1={s.r} stroke="var(--p3r-cyan)" width={3.5} delay={s.d} duration={s.dur} repeat />
          <Ring cx={s.fx * vw} cy={s.fy * vh} r0={6} r1={s.r * 0.62} stroke="rgba(255,253,252,0.8)" width={2.4} delay={s.d + 0.28} duration={s.dur} repeat />
        </g>
      ))}
    </svg>
  );
};
const VelvetTime = ({ cx, cy }: { cx: number; cy: number }) => {
  const size = Math.min(96, window.innerWidth * 0.21);
  const line = (text: string, color: string, delay: number, drift: number) => (
    <motion.div className="whitespace-nowrap font-cond leading-[0.84]" style={{ fontSize: size, color }}
      initial={{ clipPath: 'inset(-12% 103% -12% -3%)', x: drift < 0 ? 26 : -26 }} animate={{ clipPath: 'inset(-12% -6% -12% -3%)', x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, delay, ease: [0.22, 0.9, 0.3, 1] }}>
      <motion.span className="block" animate={{ x: [0, drift, 0], opacity: [1, 0.72, 1] }} transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut', delay: delay + 0.5 }}>{text}</motion.span>
    </motion.div>
  );
  return (
    <div aria-hidden className="pointer-events-none absolute select-none" style={{ left: cx, top: cy, transform: 'translate(-50%, -50%) rotate(-9deg)' }}>
      {line('MASKED', 'rgba(255,253,252,0.17)', 0.1, 7)}
      <div className="pl-[8%]">{line('TIME', 'var(--p3r-velvet)', 0.2, -9)}</div>
    </div>
  );
};
const BAR_CLIP = slantClip(11);
const Bar = ({ item, index, count, strip, state, onPick }: { item: WheelItem; index: number; count: number; strip: P3Strip; state: 'idle' | 'active' | 'dim'; onPick?: () => void }) => {
  const active = state === 'active';
  const { pitch, barW, barH, x0, bottom } = strip;
  const left = x0 + index * pitch + (pitch - barW) / 2;
  const d = Math.abs(index - (count - 1) / 2) / ((count - 1) / 2);
  const enSize = Math.min(46, (barH - 10) / (0.55 * Math.max(4, item.en.length)));
  const Tag = onPick ? motion.button : motion.div;
  return (
    <Tag type={onPick ? 'button' : undefined} role="menuitem" aria-label={item.label} onClick={onPick}
      className={onPick ? 'absolute cursor-pointer' : 'pointer-events-none absolute'} style={{ left, top: bottom - barH, width: barW, height: barH, transformOrigin: '50% 100%', zIndex: active ? 60 : 30 }}
      initial={{ scaleY: 0.06, y: 26, opacity: 0 }} animate={{ scaleY: 1, y: 0, opacity: 1, scale: active ? 1.16 : 1 }} exit={{ scaleY: 0.06, y: 26, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 470 - 190 * d, damping: 27, delay: 0.04 * d }}>
      <span aria-hidden className="absolute inset-0" style={{ clipPath: BAR_CLIP, background: 'var(--p3r-mulberry)', transform: 'translate(5px,5px)' }} />
      <span aria-hidden className="absolute inset-0" style={{ clipPath: BAR_CLIP, background: active ? P3R.blue : 'var(--p3r-wheel-bar)' }} />
      <span className="absolute inset-0 overflow-hidden" style={{ clipPath: BAR_CLIP }}>
        {active && (
          <motion.span aria-hidden className="absolute" style={{ width: barH, height: barW, left: barW / 2 - barH / 2, top: barH / 2 - barW / 2, rotate: 90 }} initial={{ y: barH }} animate={{ y: 0 }} transition={{ duration: 0.24, ease: [0.14, 0.85, 0.28, 1] }}>
            <P3Highlight live className="block h-full w-full" />
          </motion.span>
        )}
        <span aria-hidden className="absolute left-1/2 top-1/2 whitespace-nowrap font-cond leading-none" style={{ fontSize: enSize, color: active ? 'rgba(255,255,255,0.34)' : 'var(--p3r-bar-ghost)', transform: 'translate(-50%,-50%) rotate(90deg)' }}>{item.en}</span>
        <span className="absolute inset-x-0 top-[12px] flex justify-center text-[24px] font-black leading-[1.06]" style={{ writingMode: 'vertical-rl', textOrientation: 'upright', color: active ? '#fff' : P3R.ink, textShadow: active ? '0 2px 0 rgba(42,13,34,0.35)' : undefined }}>{item.label}</span>
      </span>
      <span aria-hidden className="absolute bottom-[7px] left-1/2 h-[7px] w-[18px] -translate-x-1/2" style={{ background: active ? P3R.magenta : P3R.cyan, clipPath: tickClip }} />
    </Tag>
  );
};

export const RadialWheelStage = ({ open, origin, active, hint, gesture = true, onPick, onBackdrop, children }: {
  open: boolean; origin: { x: number; y: number }; active: number | null; hint?: ReactNode; gesture?: boolean; onPick?: (i: number) => void; onBackdrop?: () => void; children?: ReactNode;
}) => {
  const strip = p3Strip(origin, WHEEL_ITEMS.length);
  const cx = strip.x0 + (strip.pitch * WHEEL_ITEMS.length) / 2;
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0" style={{ zIndex: 'var(--p3r-z-cutin)' as unknown as number }} role="menu" aria-label="快捷跳转轮盘"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, pointerEvents: 'none' }} transition={{ duration: 0.16 }}>
            <div className="absolute inset-0" onClick={onBackdrop} style={{ background: [
              `radial-gradient(circle 76vmax at ${origin.x}px ${origin.y}px, var(--p3r-wheel-scrim-a) 0%, color-mix(in srgb, var(--p3r-wheel-scrim-b) 70%, transparent) 40%, var(--p3r-wheel-scrim-b) 100%)`,
              'linear-gradient(180deg, rgba(42,13,34,0.6) 0%, rgba(42,13,34,0.2) 30%, rgba(42,13,34,0) 60%)',
            ].join(',') }} />
            <div className="pointer-events-none absolute z-[70] w-full -translate-x-1/2 text-center" style={{ left: cx, top: strip.bottom + 16 }}>
              {hint !== undefined && <div className="mb-1 font-heavy text-[17px]" style={{ color: '#fff' }}>{hint}</div>}
              <div className="text-[11px] font-bold" style={{ color: 'rgba(255,253,252,0.7)' }}>{gesture ? '松开前往 · 滑回下方取消' : '点选前往 · 点空白处取消'}</div>
            </div>
            <RingBurst origin={origin} />
            <VelvetTime cx={cx} cy={strip.bottom - strip.barH - 118} />
            {WHEEL_ITEMS.map((it, i) => (
              <Bar key={it.id} item={it} index={i} count={WHEEL_ITEMS.length} strip={strip} state={active === i ? 'active' : active === null ? 'idle' : 'dim'} onPick={onPick ? () => onPick(i) : undefined} />
            ))}
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};
