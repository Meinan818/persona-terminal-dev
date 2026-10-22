/**
 * 愿望实现（长按确认，真实 src/components/wish/WishFulfillDialog.tsx，P4 印章「达成」）：
 * 确认态：「你为它记下过 N 次。确认实现后，名下的子愿望与在途任务会一并收起。」+ 长按 1.1s「长按确认实现」（填充条，松手即断）→「正在收束…」+「再等等」
 * 结算态：✦「这一路你为它记下了 N 次」「同时收起了 N 条在途任务」「记录这一刻」。?step=done 直接看结算。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { Wish } from '@real/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Outline, Portal, useEscape, useScrollLock } from '@yellow/kit';
import { tvPowerVariants, TVFlash } from '@yellow/fx';
import { useLowMotion } from '@yellow/lib/prefs';
import { WISHES, WISH_TIMES } from '@yellow/mock/pkg2';

const HOLD = 1100;
export default function WishFulfillDialog({ open, onClose, params, wish, onFulfilled }: OverlayProps & { wish?: Wish | null; onFulfilled?: (id: string) => void }) {
  const low = useLowMotion();
  const w = wish ?? WISHES[0];
  const times = WISH_TIMES[w.id] ?? 0;
  const [pressing, setPressing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ timesLogged: number; archivedTodos: number } | null>(null);
  const t = useRef(0);
  useEffect(() => { if (open) { setResult(params?.get('step') === 'done' ? { timesLogged: times, archivedTodos: 1 } : null); setBusy(false); } }, [open]); // eslint-disable-line
  useScrollLock(open);
  useEscape(open, onClose);
  const down = () => { if (busy) return; setPressing(true); t.current = window.setTimeout(() => { setPressing(false); setBusy(true); window.setTimeout(() => { setBusy(false); setResult({ timesLogged: times, archivedTodos: 1 }); onFulfilled?.(w.id); }, 600); }, low ? 300 : HOLD); };
  const up = () => { clearTimeout(t.current); setPressing(false); };
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="wf" className="fixed inset-0 flex items-center justify-center p-5" style={{ zIndex: 'var(--p4g-z-confirm)' as unknown as number }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-[color:var(--p4g-scrim)]" onClick={busy ? undefined : onClose} />
            <motion.div role="alertdialog" aria-modal="true" aria-label={w.title} className="relative w-full max-w-[400px] min-w-0" variants={tvPowerVariants(low)} initial="off" animate="on" exit="off">
              <div aria-hidden className="absolute inset-0 translate-x-[8px] translate-y-[8px] bg-p4g-orange" />
              <div className="relative overflow-hidden border-3 border-p4g-black bg-p4g-cream px-5 pb-5 pt-6 text-center text-p4g-black night:border-p4g-yellow">
                <div aria-hidden className="absolute inset-x-0 top-0 h-2 p4g-candy-h" />
                <span className="absolute right-3 top-4 rotate-12 border-3 border-p4g-red px-2 font-display text-h3 font-black text-p4g-red opacity-90">达成</span>
                <div className="mx-auto mb-1 inline-block rounded-xs bg-p4g-black px-2 font-display text-2xs font-bold italic tracking-[0.2em] text-p4g-yellow">WISH</div>
                <div className="px-6"><P4Outline as="h2" size="clamp(22px,6vw,30px)" stroke={5} wrap>{w.title}</P4Outline></div>
                {result ? (
                  <>
                    <motion.div className="mt-3 text-[44px] leading-none text-p4g-orange-deep" initial={low ? false : { scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 14, stiffness: 220 }}>✦</motion.div>
                    <div className="mt-2 space-y-1 font-display text-body font-bold">
                      <div>这一路你为它记下了 <span className="p4g-num text-h3 text-p4g-orange-deep">{result.timesLogged}</span> 次</div>
                      {result.archivedTodos > 0 && <div>同时收起了 {result.archivedTodos} 条在途任务</div>}
                    </div>
                    <P4Button block variant="black" className="mt-4" onClick={onClose}>记录这一刻</P4Button>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-body leading-relaxed">{times > 0 ? <>你为它记下过 <b className="p4g-num text-p4g-orange-deep">{times}</b> 次。确认实现后，名下的子愿望与在途任务会一并收起。</> : <>确认实现后，名下的子愿望与在途任务会一并收起。</>}</p>
                    <button type="button" disabled={busy} onPointerDown={down} onPointerUp={up} onPointerLeave={up} onPointerCancel={up} onContextMenu={(e) => e.preventDefault()}
                      className="relative mt-4 h-12 w-full select-none overflow-hidden border-3 border-p4g-black bg-white font-display text-lead font-bold text-p4g-black shadow-hard-sm">
                      <motion.span aria-hidden className="absolute inset-y-0 left-0 w-full origin-left bg-p4g-orange" initial={{ scaleX: 0 }} animate={{ scaleX: pressing || busy ? 1 : 0 }} transition={{ duration: pressing ? (low ? 0.3 : HOLD / 1000) : 0.18, ease: 'linear' }} />
                      <span className="relative">{busy ? '正在收束…' : '长按确认实现'}</span>
                    </button>
                    <button type="button" onClick={onClose} className="mt-2 font-display text-body font-bold text-p4g-black/70 underline decoration-p4g-orange decoration-[3px] underline-offset-4">再等等</button>
                  </>
                )}
              </div>
              <TVFlash low={low} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
