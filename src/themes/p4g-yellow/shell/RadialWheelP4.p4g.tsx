/**
 * RadialWheelP4.p4g —— 对应真实 RadialQuickNav.tsx（手势/命中）+ RadialWheelP4.tsx（P4 演出层）。
 *
 * 入口与原版一致（七瓣定稿，一个不少）：塔罗 / 记录 / 任务 / 羁绊 / 记账 / 成就 / 设置
 *   （'todos'/'activities' 走行动页旧路由 id 兼容层直达子 tab）。
 * 手势（gesture 模式，底导 ◈ 长按 500ms 触发）：拇指不离屏移动 → 距 ◈ ≥ 48px 死区且在上半平面时
 *   按角度高亮对应瓣 → 松手跳转（跳台噪点转场）；滑回死区或下滑 = 取消态，松手只关闭。
 * 点选模式（openWheel() 无手势调用 / 键盘）：瓣是可点按钮，点遮罩关闭，Esc 关闭。
 *
 * P4G 视觉：黑幕 → Rank Up 斜彩带从两侧扫入 → 黄色天气徽式同心圆盘 → 七张"塔罗卡"徽（黑面黄框竖排字，
 *   选中翻黄面黑字放大外推 + 橙四角星）→ 中心上方白字粗黑描边大字 + 英文黑胶囊。
 * 跳转转场：WedgeCut 楔形切台（真实 P4 频道幕布）。低动效：改渲染 WheelD0Menu 垂直菜单（真实 D0 分支）。
 * 性能：只动 transform/opacity；无 backdrop-blur（真实 v2.7.1 教训）。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { closeWheel, navigate, useShellState } from './shellBus';
import { useLowMotion } from '@yellow/lib/prefs';
import { P4Outline } from '@yellow/kit/P4Outline';
import { IconSparkle } from '@yellow/kit/icons';
import { WheelD0Menu } from './WheelD0Menu';

export interface WheelItem { id: string; label: string; icon: string; en: string }

/** 真实 WHEEL_ITEMS（顺序、id、文案一致）*/
export const WHEEL_ITEMS: WheelItem[] = [
  { id: 'astrology', label: '塔罗', icon: '🔮', en: 'TAROT' },
  { id: 'activities', label: '记录', icon: '✍️', en: 'RECORD' },
  { id: 'todos', label: '任务', icon: '⚡', en: 'TASKS' },
  { id: 'cooperation', label: '羁绊', icon: '🃏', en: 'BOND' },
  { id: 'ledger', label: '记账', icon: '💰', en: 'ACCOUNT' },
  { id: 'achievements', label: '成就', icon: '🏆', en: 'ACHIEVE' },
  { id: 'settings', label: '设置', icon: '⚙️', en: 'SETTING' },
];

const DEAD_ZONE = 48;
const SPAN = 180;
const SEG = SPAN / WHEEL_ITEMS.length;

const pickIndex = (origin: { x: number; y: number }, cx: number, cy: number): number | null => {
  const dx = cx - origin.x;
  const dy = cy - origin.y;
  if (Math.hypot(dx, dy) < DEAD_ZONE || dy > 0) return null;
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  return Math.max(0, Math.min(WHEEL_ITEMS.length - 1, Math.floor((ang + 180) / SEG)));
};

export function RadialWheelP4() {
  const { wheel } = useShellState();
  const low = useLowMotion();
  const [active, setActive] = useState<number | null>(null);
  const activeRef = useRef<number | null>(null);
  const gen = useRef(0);
  const prevOpen = useRef(false);
  if (wheel.open && !prevOpen.current) gen.current += 1;
  prevOpen.current = wheel.open;

  const go = (idx: number) => {
    closeWheel();
    navigate(WHEEL_ITEMS[idx].id, undefined, { transition: 'wedge' });
  };

  // 手势追踪（window 级，手指从 ◈ 长按起从未离屏）
  useEffect(() => {
    if (!wheel.open || !wheel.origin) return;
    setActive(null);
    activeRef.current = null;
    if (!wheel.gesture || low) {
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeWheel(); };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
    const origin = wheel.origin;
    const onMove = (e: PointerEvent) => {
      const n = pickIndex(origin, e.clientX, e.clientY);
      if (n !== activeRef.current) { activeRef.current = n; setActive(n); if (n !== null) navigator.vibrate?.(8); }
    };
    const onUp = (e: PointerEvent) => {
      const idx = pickIndex(origin, e.clientX, e.clientY);
      if (idx !== null) go(idx); else closeWheel();
    };
    const onCancel = () => closeWheel();
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [wheel.open, wheel.origin, wheel.gesture, low]);

  if (!wheel.origin || typeof document === 'undefined') return null;
  // D0 / 低动效：真实 RadialQuickNav 在 useBoldness()=false 时改弹普通垂直菜单（点选跳转、无手势联动、无演出）
  if (low) return <WheelD0Menu open={wheel.open} origin={wheel.origin} onClose={closeWheel} />;
  const origin = wheel.origin;
  const radius = Math.min(148, window.innerWidth / 2 - 46);
  const R = radius * 1.06;
  const item = active === null ? null : WHEEL_ITEMS[active];

  return createPortal(
    <AnimatePresence>
      {wheel.open && (
        <motion.div
          key={gen.current}
          className="fixed inset-0 overflow-hidden"
          style={{ zIndex: 'var(--p4g-z-cutin)' as unknown as number, touchAction: 'none' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none' }}
          transition={{ duration: 0.16 }}
          role="menu"
          aria-label="快捷跳转轮盘"
        >
          <div className="absolute inset-0 bg-black/[0.74]" onClick={() => closeWheel()} />

          {/* Rank Up 斜彩带 ×2 */}
          {[{ rot: -24, from: '-110%', top: 0.2 }, { rot: 22, from: '110%', top: 0.5 }].map((b, i) => (
            <motion.div key={i} aria-hidden className="pointer-events-none absolute left-[-30%] right-[-30%] h-[54px] p4g-ribbon" style={{ top: `${b.top * 100}%`, rotate: b.rot }}
              initial={low ? { opacity: 0 } : { x: b.from, opacity: 1 }} animate={low ? { opacity: 0.9 } : { x: '0%', opacity: 0.9 }} transition={{ duration: 0.34, delay: 0.04 + i * 0.06, ease: [0.2, 0.9, 0.1, 1] }} />
          ))}

          {/* 同心圆盘（天气徽结构：黄粗环 + 黑环 + 黄面）*/}
          <motion.svg aria-hidden className="pointer-events-none absolute" width={R * 2 + 40} height={R * 2 + 40} viewBox={`0 0 ${R * 2 + 40} ${R * 2 + 40}`}
            style={{ left: origin.x - R - 20, top: origin.y - R - 20 }}
            initial={low ? { opacity: 0 } : { scale: 0.4, opacity: 0, rotate: -30 }} animate={low ? { opacity: 1 } : { scale: 1, opacity: 1, rotate: 0 }} transition={{ duration: 0.3, delay: 0.08, ease: [0.2, 0.9, 0.1, 1] }}>
            <circle cx={R + 20} cy={R + 20} r={R + 14} fill="none" stroke="var(--p4g-yellow)" strokeWidth={10} />
            <circle cx={R + 20} cy={R + 20} r={R + 3} fill="none" stroke="#111" strokeWidth={5} />
            <circle cx={R + 20} cy={R + 20} r={R - 2} fill="var(--p4g-yellow)" opacity={0.96} />
            <circle cx={R + 20} cy={R + 20} r={R * 0.62} fill="none" stroke="#111" strokeWidth={3} strokeDasharray="6 9" />
            <circle cx={R + 20} cy={R + 20} r={DEAD_ZONE} fill="#111" />
          </motion.svg>

          {/* 选中扇形指示 */}
          {active !== null && (
            <motion.svg aria-hidden className="pointer-events-none absolute" width={R * 2} height={R * 2} viewBox="0 0 200 200" style={{ left: origin.x - R, top: origin.y - R }}
              animate={{ rotate: -180 + ((active + 0.5) * 180) / WHEEL_ITEMS.length + 90 }} transition={{ type: 'tween', duration: low ? 0 : 0.12 }}>
              <path d={`M100 100 L${100 + 96 * Math.cos(((-90 - SEG / 2) * Math.PI) / 180)} ${100 + 96 * Math.sin(((-90 - SEG / 2) * Math.PI) / 180)} A96 96 0 0 1 ${100 + 96 * Math.cos(((-90 + SEG / 2) * Math.PI) / 180)} ${100 + 96 * Math.sin(((-90 + SEG / 2) * Math.PI) / 180)} Z`} fill="rgba(240,122,26,0.55)" />
            </motion.svg>
          )}

          {/* 七张塔罗卡徽 */}
          {WHEEL_ITEMS.map((it, i) => {
            const armDeg = -180 + ((i + 0.5) * SPAN) / WHEEL_ITEMS.length;
            const a = (armDeg * Math.PI) / 180;
            const on = active === i;
            const push = on ? R * 0.22 : 0;
            const x = origin.x + (R + push) * Math.cos(a);
            const y = origin.y + (R + push) * Math.sin(a);
            const W = on ? 62 : 48;
            const H = on ? 86 : 68;
            const rot = (armDeg + 90) * 0.5;
            const Tag = wheel.gesture ? 'div' : 'button';
            return (
              <motion.div key={it.id} className="absolute" style={{ left: x - W / 2, top: y - H / 2, width: W, height: H }}
                initial={low ? { opacity: 0 } : { opacity: 0, scale: 0.2, x: origin.x - x, y: origin.y - y }}
                animate={low ? { opacity: 1, rotate: rot } : { opacity: 1, scale: 1, x: 0, y: 0, rotate: rot }}
                exit={low ? { opacity: 0 } : { opacity: 0, scale: 0.2, x: origin.x - x, y: origin.y - y }}
                transition={{ duration: 0.24, delay: low ? 0 : 0.12 + i * 0.025, ease: [0.2, 0.9, 0.1, 1] }}>
                <Tag
                  {...(Tag === 'button' ? { type: 'button' as const, onClick: () => go(i), onMouseEnter: () => setActive(i), onFocus: () => setActive(i) } : {})}
                  role="menuitem" aria-label={it.label}
                  className={`relative flex h-full w-full items-center justify-center rounded-[5px] border-[3px] ${on ? 'border-p4g-black bg-p4g-yellow text-p4g-black shadow-[4px_4px_0_var(--p4g-orange)]' : 'border-p4g-yellow bg-p4g-black text-white shadow-[3px_3px_0_#000]'}`}
                >
                  <span aria-hidden className={`absolute inset-[3px] rounded-[2px] border ${on ? 'border-p4g-black/40' : 'border-p4g-yellow/35'}`} />
                  <span className="relative font-display font-bold leading-[1.05]" style={{ writingMode: 'vertical-rl', textOrientation: 'upright', fontSize: on ? 20 : 15 }}>{it.label}</span>
                  {on && <IconSparkle size={18} className="absolute -right-2 -top-2 text-p4g-orange" />}
                </Tag>
              </motion.div>
            );
          })}

          {/* 中心大字 */}
          <div aria-hidden className="pointer-events-none absolute flex flex-col items-center" style={{ left: origin.x, top: origin.y - R * 0.5, transform: 'translate(-50%,-50%)' }}>
            <AnimatePresence mode="popLayout">
              {item ? (
                <motion.div key={item.id} className="flex flex-col items-center gap-1" initial={low ? { opacity: 0 } : { scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                  <P4Outline size={40} stroke={5}>{item.label}</P4Outline>
                  <span className="rounded-pill bg-p4g-black px-2.5 py-0.5 font-display text-[10px] font-bold tracking-[0.24em] text-p4g-yellow">{item.en}</span>
                </motion.div>
              ) : (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <P4Outline size={22} stroke={4}>{wheel.gesture ? '滑向目标' : '选择目标'}</P4Outline>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div aria-hidden className="pointer-events-none absolute w-full -translate-x-1/2 text-center p4g-outline-sm font-display text-meta font-bold" style={{ left: origin.x, top: Math.max(16, origin.y - R - 96) }}>
            {wheel.gesture ? '松开前往 · 滑回中心取消' : '点选前往 · 点空白处取消'}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default RadialWheelP4;
