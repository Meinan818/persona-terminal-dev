/**
 * 愿望实现（真实 src/components/wish/WishFulfillDialog.tsx，p3 SKIN：panel 面 + 玫红 accent + 斜切 polygon(0 3%,100% 0,100% 97%,0 100%) + stamp「归档」）：
 *   长按确认态：WISH FULFILLED / 愿望名 / 「你为它记下过 N 次。确认实现后…」/「长按确认实现」（HOLD 1100ms 填充条，松手即断）/「再等等」；按住时卡片 scale .985。
 *   触发后（正在收束…）→ 结算态：✦ spring(14/220) 炸开 + 光环扩散 + 「归档」+ 标题 +「这一路你为它记下了 N 次」+「同时收起了 N 条在途任务」+「记录这一刻」。
 * 直达：?stage=hold（演出：0.5s 后自动按住 1.1s → 收束 → 结算）；?stage=done（直接结算 + 炸开）；?auto=0 不自动按。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { Wish } from '@/types';
import type { OverlayProps } from '@pink/registry/types';
import { Portal, useEscape, P3R, slantClip } from '@pink/kit';
import { PetalBurst } from '@pink/fx';
import { useBoldness } from '@pink/lib/prefs';
import { actionsOps, useActionsData } from '@pink/adapters/pkg2';

const HOLD_MS = 1100;
const CLIP = 'polygon(0 3%, 100% 0, 100% 97%, 0 100%)';
export default function WishFulfillDialog({ open, onClose, params, wish, onFulfilled }: OverlayProps & { wish?: Wish | null; onFulfilled?: (id: string) => void }) {
  const anim = useBoldness();
  const { WISHES, WISH_TIMES } = useActionsData();
  const w = wish ?? WISHES[0];
  const stage = params?.get('stage');
  const times = WISH_TIMES[w.id] ?? 0;
  const [pressing, setPressing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ title: string; timesLogged: number; archivedTodos: number } | null>(null);
  const timer = useRef(0);
  const auto = useRef<number[]>([]);
  useEscape(open && !busy, onClose);
  useEffect(() => { if (open && stage !== 'done') { setResult(null); setBusy(false); setPressing(false); } }, [open]); // eslint-disable-line
  useEffect(() => () => { clearTimeout(timer.current); auto.current.forEach(clearTimeout); }, []);
  const fire = async () => {
    setPressing(false); setBusy(true);
    try {
      const payload = await actionsOps.fulfillWish(w.id);
      if (payload) {
        setResult(payload);
        onFulfilled?.(w.id);
      }
    } finally {
      setBusy(false);
    }
  };
  const down = () => { if (busy || result) return; setPressing(true); timer.current = window.setTimeout(() => void fire(), anim ? HOLD_MS : 300); };
  const up = () => { if (!pressing) return; clearTimeout(timer.current); setPressing(false); };
  // 演出直达：?stage=hold → 自动走一遍「按住 → 收束 → 结算」
  useEffect(() => {
    if (!open || stage !== 'hold' || params?.get('auto') === '0') return;
    auto.current.push(window.setTimeout(() => { setPressing(true); auto.current.push(window.setTimeout(() => void fire(), anim ? HOLD_MS : 300)); }, 600));
  }, [open]); // eslint-disable-line
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="wish-fulfill" className="fixed inset-0 z-cutin flex items-center justify-center px-6" style={{ background: 'rgba(27, 8, 22, 0.76)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={() => { if (!busy) onClose(); }}>
            {result && anim && (
              <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
                {[0, 1, 2].map((k) => (
                  <motion.span key={k} className="absolute h-[200px] w-[200px] rounded-full" style={{ border: `${6 - k * 2}px solid ${k === 1 ? 'var(--p3r-cyan)' : 'var(--p3r-blue)'}` }}
                    initial={{ scale: 0.2, opacity: 0.9 }} animate={{ scale: 3.2 + k, opacity: 0 }} transition={{ duration: 1.1, delay: 0.05 + k * 0.12, ease: [0.16, 0.7, 0.35, 1] }} />
                ))}
                <motion.span className="absolute h-[60vh] w-[22px]" style={{ background: 'var(--p3r-cream)', rotate: 24 }} initial={{ scaleY: 0, opacity: 1 }} animate={{ scaleY: 1.4, opacity: 0 }} transition={{ duration: 0.6 }} />
              </div>
            )}
            <motion.div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm"
              initial={{ scale: anim ? 0.9 : 1, y: anim ? 14 : 0 }} animate={{ scale: pressing && !result ? 0.985 : 1, y: 0 }} transition={{ type: 'spring', damping: 22, stiffness: 280 }}>
              <span aria-hidden className="absolute inset-0 translate-x-[8px] translate-y-[8px]" style={{ background: P3R.blue, clipPath: CLIP, opacity: 0.55 }} />
              <div className="relative px-6 py-7 text-center" style={{ background: P3R.panel, color: P3R.ink, clipPath: CLIP }}>
                <AnimatePresence mode="wait" initial={false}>
                  {result ? (
                    <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <motion.div className="mx-auto mb-3 font-heavy text-[44px] leading-none" style={{ color: P3R.blue }} initial={{ scale: anim ? 0.4 : 1, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 14, stiffness: 220 }}>✦</motion.div>
                      <div className="font-cond text-[13px] tracking-[0.4em]" style={{ color: P3R.roseInk }}>归档 · ARCHIVED</div>
                      <div className="mt-2 font-heavy text-[22px] leading-tight">{result.title}</div>
                      <motion.div className="mt-4 space-y-1 text-[12px] font-bold" style={{ color: P3R.inkSoft }} initial={anim ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                        <div>这一路你为它记下了 <span className="font-cond text-[16px]" style={{ color: P3R.roseInk }}>{result.timesLogged}</span> 次</div>
                        {result.archivedTodos > 0 && <div>同时收起了 {result.archivedTodos} 条在途任务</div>}
                      </motion.div>
                      <motion.button type="button" onClick={onClose} className="mt-6 w-full py-3 text-[14px] font-black" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(10) }}
                        initial={anim ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>记录这一刻</motion.button>
                    </motion.div>
                  ) : (
                    <motion.div key="hold" exit={{ opacity: 0 }}>
                      <div className="font-cond text-[12px] tracking-[0.36em]" style={{ color: P3R.roseInk }}>WISH FULFILLED</div>
                      <div className="mt-2 font-heavy text-[21px] leading-tight">{w.title}</div>
                      <p className="mt-3 text-[12px] leading-relaxed" style={{ color: P3R.inkSoft }}>
                        {times > 0 ? <>你为它记下过 <span className="font-cond text-[15px]" style={{ color: P3R.roseInk }}>{times}</span> 次。确认实现后，名下的子愿望与在途任务会一并收起。</> : <>确认实现后，名下的子愿望与在途任务会一并收起。</>}
                      </p>
                      <button type="button" disabled={busy} onPointerDown={down} onPointerUp={up} onPointerLeave={up} onPointerCancel={up} onContextMenu={(e) => e.preventDefault()}
                        onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) down(); }} onKeyUp={up}
                        className="relative mt-6 w-full select-none overflow-hidden py-3.5 text-[14px] font-black" style={{ clipPath: slantClip(10), background: P3R.blue, touchAction: 'none' }}>
                        <span aria-hidden className="absolute inset-[2px]" style={{ background: P3R.panel, clipPath: slantClip(9) }} />
                        <motion.span aria-hidden className="absolute inset-y-0 left-0 w-full origin-left" style={{ background: P3R.blue }}
                          initial={{ scaleX: 0 }} animate={{ scaleX: pressing || busy ? 1 : 0 }} transition={{ duration: pressing ? (anim ? HOLD_MS / 1000 : 0.3) : 0.18, ease: 'linear' }} />
                        <span className="relative" style={{ color: pressing || busy ? P3R.onBlue : P3R.roseInk }}>{busy ? '正在收束…' : '长按确认实现'}</span>
                      </button>
                      <button type="button" onClick={onClose} disabled={busy} className="mt-2 w-full py-2 text-[12px] font-bold" style={{ color: P3R.grey }}>再等等</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
            {result && <PetalBurst active />}
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
