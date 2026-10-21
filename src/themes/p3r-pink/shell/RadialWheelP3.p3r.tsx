/**
 * 长按轮盘（真实 RadialQuickNav 的 p3 分支 + RadialWheelP3 演出层 1:1，粉变量）：
 *   遮罩：以 ◈ 为心向外渐暗（莓紫）+ 顶部下压；RingBurst 同心圆环（奶油 / 藕紫交替）+ 屏幕散点环；
 *   VelvetTime 背景大字「MASKED / TIME」；条目 = 一排竖直等长平行四边形（奶油白），英文转 90° 幽灵大字、中文竖排；
 *   选中项翻玫红 + 运动三角高亮 + 底缘小斜片由藕紫翻珊瑚；命中 = 横向等宽分带（p3Pick），抬过条带下缘 26px 容差，滑回下方取消。
 *   低动效（真实 useBoldness()=false）→ WheelD0Menu 纵向菜单（点选跳转）。
 * 打开：shellBus.openWheel(origin, gesture)。gesture=true 为手势模式（底导猫钮按住 500ms），false 为点选模式（索引 / 弹窗预览）。
 * 图标：真实用 emoji（🔮✍️⚡🃏💰🏆⚙️）；粉主题里 🔮 等会带蓝像素 → 换单色字形（有意偏差，见 HANDOFF）。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Portal } from '@pink/kit/Portal';
import { useBoldness } from '@pink/lib/prefs';
import { P3R, P3Highlight, slantClip, tickClip } from '@pink/kit/base';
import { closeWheel, navigate, useShellState } from './shellBus';

export interface WheelItem { id: string; label: string; icon: string; en: string }
export const WHEEL_ITEMS: WheelItem[] = [
  { id: 'astrology', label: '塔罗', icon: '✦', en: 'TAROT' },
  { id: 'activities', label: '记录', icon: '✎', en: 'RECORD' },
  { id: 'todos', label: '任务', icon: 'ϟ', en: 'TASKS' },
  { id: 'cooperation', label: '羁绊', icon: '♥', en: 'BOND' },
  { id: 'ledger', label: '记账', icon: '¥', en: 'ACCOUNT' },
  { id: 'achievements', label: '成就', icon: '★', en: 'ACHIEVE' },
  { id: 'settings', label: '设置', icon: '⚙', en: 'SETTING' },
];

export interface P3Strip { pitch: number; barW: number; barH: number; x0: number; bottom: number }
export const p3Strip = (origin: { x: number; y: number }, count: number): P3Strip => {
  const vw = window.innerWidth, vh = window.innerHeight;
  const pitch = Math.max(38, Math.min(56, (Math.min(vw, 460) - 20) / count));
  const total = pitch * count;
  const x0 = Math.max(8, Math.min(origin.x - total / 2, vw - total - 8));
  const bottom = Math.max(vh * 0.34, origin.y - 96);
  const barH = Math.min(226, Math.max(150, bottom - 132));
  return { pitch, barW: Math.round(pitch - 7), barH, x0, bottom };
};
export const p3Pick = (origin: { x: number; y: number }, count: number, cx: number, cy: number): number | null => {
  const { pitch, x0, bottom } = p3Strip(origin, count);
  if (cy > bottom + 26) return null;
  return Math.max(0, Math.min(count - 1, Math.floor((cx - x0) / pitch)));
};

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
      initial={{ clipPath: 'inset(-12% 103% -12% -3%)', x: drift < 0 ? 26 : -26 }} animate={{ clipPath: 'inset(-12% -6% -12% -3%)', x: 0 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 0.9, 0.3, 1] }}>
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

/** 低动效纵向菜单（真实 D0 分支：点选跳转、无演出） */
export function WheelD0Menu({ open, origin, onClose }: { open: boolean; origin: { x: number; y: number }; onClose: () => void }) {
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0" style={{ zIndex: 'var(--p3r-z-cutin)' as unknown as number }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
            <div className="absolute inset-0" style={{ background: 'var(--p3r-scrim)' }} onClick={onClose} />
            <div role="menu" aria-label="快捷跳转轮盘" className="absolute w-[212px] -translate-x-1/2 p-2"
              style={{ left: Math.min(Math.max(origin.x, 116), window.innerWidth - 116), bottom: Math.max(8, window.innerHeight - origin.y + 44), background: P3R.panel, clipPath: slantClip(12), boxShadow: 'var(--p3r-shadow-lg)' }}>
              {WHEEL_ITEMS.map((it) => (
                <button key={it.id} type="button" role="menuitem" className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[14px] font-black hover:bg-[color:var(--p3r-cyan-faint)] focus:bg-[color:var(--p3r-cyan-faint)] focus:outline-none" style={{ color: P3R.ink }}
                  onClick={() => { onClose(); navigate(it.id, undefined, { transition: 'none' }); }}>
                  <span aria-hidden className="w-6 text-center" style={{ color: P3R.blue }}>{it.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{it.label}</span>
                  <span className="font-cond text-[11px] tracking-[0.2em]" style={{ color: P3R.grey }}>{it.en}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export function RadialWheelP3() {
  const { wheel } = useShellState();
  const bold = useBoldness();
  const [active, setActive] = useState<number | null>(null);
  const activeRef = useRef<number | null>(null);
  const genRef = useRef(0);
  const prevOpen = useRef(false);
  if (wheel.open && !prevOpen.current) genRef.current += 1;
  prevOpen.current = wheel.open;
  const origin = wheel.origin;
  const go = (idx: number) => { closeWheel(); navigate(WHEEL_ITEMS[idx].id, undefined, { transition: 'wave' }); };

  useEffect(() => {
    if (!wheel.open || !origin || !bold) return;
    setActive(null); activeRef.current = null;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeWheel(); };
    window.addEventListener('keydown', onKey);
    if (!wheel.gesture) return () => window.removeEventListener('keydown', onKey);
    const onMove = (e: PointerEvent) => {
      const n = p3Pick(origin, WHEEL_ITEMS.length, e.clientX, e.clientY);
      if (n !== activeRef.current) { activeRef.current = n; setActive(n); }
    };
    const onUp = (e: PointerEvent) => { const idx = p3Pick(origin, WHEEL_ITEMS.length, e.clientX, e.clientY); if (idx !== null) go(idx); else closeWheel(); };
    const onCancel = () => closeWheel();
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onCancel); };
  }, [wheel.open, origin, wheel.gesture, bold]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!origin) return null;
  if (!bold) return <WheelD0Menu open={wheel.open} origin={origin} onClose={closeWheel} />;
  const strip = p3Strip(origin, WHEEL_ITEMS.length);
  return (
    <Portal>
      <AnimatePresence>
        {wheel.open && (
          <motion.div key={genRef.current} className="fixed inset-0" style={{ zIndex: 'var(--p3r-z-cutin)' as unknown as number }} role="menu" aria-label="快捷跳转轮盘"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, pointerEvents: 'none' }} transition={{ duration: 0.16 }}>
            <div className="absolute inset-0" onClick={() => closeWheel()} style={{
              background: [
                `radial-gradient(circle 76vmax at ${origin.x}px ${origin.y}px, var(--p3r-wheel-scrim-a) 0%, color-mix(in srgb, var(--p3r-wheel-scrim-b) 70%, transparent) 40%, var(--p3r-wheel-scrim-b) 100%)`,
                'linear-gradient(180deg, rgba(42,13,34,0.6) 0%, rgba(42,13,34,0.2) 30%, rgba(42,13,34,0) 60%)',
              ].join(','),
            }} />
            <div className="pointer-events-none absolute z-[70] w-full -translate-x-1/2 text-center" style={{ left: strip.x0 + (strip.pitch * WHEEL_ITEMS.length) / 2, top: strip.bottom + 16 }}>
              <div className="text-[11px] font-bold" style={{ color: 'rgba(255,253,252,0.7)' }}>{wheel.gesture ? '松开前往 · 滑回下方取消' : '点选前往 · 点空白处取消'}</div>
            </div>
            <RingBurst origin={origin} />
            <VelvetTime cx={strip.x0 + (strip.pitch * WHEEL_ITEMS.length) / 2} cy={strip.bottom - strip.barH - 118} />
            {WHEEL_ITEMS.map((it, i) => (
              <Bar key={it.id} item={it} index={i} count={WHEEL_ITEMS.length} strip={strip} state={active === i ? 'active' : active === null ? 'idle' : 'dim'}
                onPick={wheel.gesture ? undefined : () => go(i)} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
