/**
 * 成就 / 技能解锁 Cut-in（真实 src/components/AchievementUnlockModal.tsx · AchievementUnlockP3 分支）蓝白版。时序 1:1 真实 p3：
 *   0.00 幕淡入　0.04+k×0.13 三圈水波扩散（1.2s）　0.00 UNLOCK 幽灵字裁切揭示（0.5s）　右上三角 + ✕
 *   0.00 菱形面板弹簧入（scale .55 rotate -5 → 1/0，spring 260/20）　0.15 徽记 scale [0,1.25,1] + 0.42 起 8 片碎片迸溅
 *   0.24 斜带 scaleX 0→1　0.30+i×0.055「成就解锁！」逐字弹入　0.52 角戳 SLAM　0.60 成就名行　0.72 副文　autoClose 4500ms（底部倒计时条）
 * 页内「盖章」前奏（achv-unlock-stamp）：stamp=true 时先在被点卡上盖「UNLOCK」印（0–0.55s），再开本 cut-in（总 3.8s 观感）。低动效：直出终态。
 */
import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Portal, P3R, slantClip, IconClose, useEscape } from '@blue/kit';
import { useBoldness } from '@blue/lib/prefs';

export function UnlockCutIn({ open, onClose, title = '成就解锁！', eyebrow = 'UNLOCK', icon, name, sub, autoCloseMs = 4500 }: { open: boolean; onClose: () => void; title?: string; eyebrow?: string; icon: string; name: string; sub?: string; autoCloseMs?: number }) {
  const anim = useBoldness();
  const cb = useRef(onClose); cb.current = onClose;
  useEscape(open, onClose);
  useEffect(() => { if (!open) return; const t = window.setTimeout(() => cb.current(), autoCloseMs); return () => clearTimeout(t); }, [open, autoCloseMs]);
  const d = (s: number) => (anim ? s : 0);
  const chars = Array.from(title);
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="unlock" role="dialog" aria-modal="true" aria-label={`${title} ${name}`} className="fixed inset-0 flex items-center justify-center overflow-hidden" style={{ zIndex: 'var(--p3r-z-celebration)' as unknown as number }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }} onClick={onClose}>
            <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 46%, rgb(var(--p3r-blue-rgb) / 0.35), transparent 60%), var(--p3r-scrim)' }} />
            {/* 三圈水波 */}
            {anim && [0, 1, 2].map((k) => (
              <motion.span key={`ring-${k}`} aria-hidden className="absolute left-1/2 top-[46%] h-[300px] w-[300px] rounded-full" style={{ marginLeft: -150, marginTop: -150, border: `3px solid ${k === 1 ? P3R.cyan : P3R.blue}` }}
                initial={{ scale: 0.2, opacity: 0.9 }} animate={{ scale: 2.4, opacity: 0 }} transition={{ duration: 1.2, delay: 0.04 + k * 0.13, ease: 'easeOut' }} />
            ))}
            {/* UNLOCK 幽灵字 */}
            <motion.div aria-hidden className="pointer-events-none absolute left-0 right-0 top-[12%] whitespace-nowrap text-center font-cond leading-none" style={{ fontSize: 'clamp(90px, 28vw, 240px)', color: 'rgba(255,255,255,0.14)' }}
              initial={anim ? { clipPath: 'inset(0 100% 0 0)' } : false} animate={{ clipPath: 'inset(0 0% 0 0)' }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>{eyebrow}</motion.div>
            {/* 右上三角 + ✕ */}
            <span aria-hidden className="absolute right-0 top-0 h-28 w-28" style={{ background: P3R.blue, clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }} />
            <button type="button" aria-label="关闭" onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center text-white" style={{ marginTop: 'env(safe-area-inset-top)' }}><IconClose size={20} /></button>

            <div className="relative flex w-[min(86vw,380px)] flex-col items-center" onClick={(e) => e.stopPropagation()}>
              {/* 菱形面板 */}
              <motion.div className="relative flex w-full flex-col items-center px-6 pb-7 pt-10" style={{ background: P3R.panel, clipPath: 'polygon(50% 0, 100% 18%, 100% 82%, 50% 100%, 0 82%, 0 18%)' }}
                initial={anim ? { scale: 0.55, rotate: -5, opacity: 0 } : false} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
                {/* 徽记 */}
                <div className="relative">
                  <motion.span className="flex h-20 w-20 items-center justify-center font-heavy text-[38px]" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' }}
                    initial={anim ? { scale: 0 } : false} animate={{ scale: anim ? [0, 1.25, 1] : 1 }} transition={{ duration: 0.5, delay: d(0.15), times: [0, 0.6, 1] }}>{icon}</motion.span>
                  {anim && Array.from({ length: 8 }).map((_, i) => {
                    const a = (Math.PI * 2 * i) / 8;
                    return (
                      <motion.span key={`sh-${i}`} aria-hidden className="absolute left-1/2 top-1/2 h-3 w-3" style={{ marginLeft: -6, marginTop: -6, background: i % 2 ? P3R.cyan : P3R.magenta, clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }}
                        initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }} animate={{ x: Math.cos(a) * 70, y: Math.sin(a) * 70, opacity: 0, rotate: 180 }} transition={{ duration: 0.6, delay: 0.42 + i * 0.015, ease: 'easeOut' }} />
                    );
                  })}
                </div>
                {/* 斜带 + 逐字标题 */}
                <div className="relative mt-5 w-[112%]">
                  <motion.span aria-hidden className="absolute inset-0 origin-left" style={{ background: 'var(--bk-band)', clipPath: slantClip(12) }} initial={anim ? { scaleX: 0 } : false} animate={{ scaleX: 1 }} transition={{ duration: 0.3, delay: d(0.24), ease: [0.16, 1, 0.3, 1] }} />
                  <div className="relative flex justify-center py-2">
                    {chars.map((c, i) => (
                      <motion.span key={`c-${i}`} className="font-heavy text-[clamp(26px,8vw,34px)] leading-none" style={{ color: 'var(--p3r-cream)' }}
                        initial={anim ? { y: 18, scale: 1.6, opacity: 0 } : false} animate={{ y: 0, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 22, delay: d(0.3 + i * 0.055) }}>{c}</motion.span>
                    ))}
                  </div>
                  {/* 角戳 */}
                  <motion.span aria-hidden className="absolute -right-1 -top-4 px-2 py-0.5 font-cond text-[13px]" style={{ background: P3R.magenta, color: '#fff', clipPath: slantClip(4), rotate: 8 }}
                    initial={anim ? { scale: 2.6, opacity: 0 } : false} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 18, delay: d(0.52) }}>CLEAR!</motion.span>
                </div>
                <motion.div className="mt-4 max-w-full truncate px-2 text-center font-heavy text-[20px]" style={{ color: P3R.ink }} initial={anim ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: d(0.6) }}>{name}</motion.div>
                {sub && <motion.div className="mt-1 max-w-full px-2 text-center text-[13px] font-bold" style={{ color: P3R.grey }} initial={anim ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ delay: d(0.72) }}>{sub}</motion.div>}
              </motion.div>
              {/* 倒计时条 */}
              <div className="relative mt-4 h-[4px] w-[60%] overflow-hidden" style={{ background: 'rgba(255,255,255,0.25)' }}>
                <motion.span className="absolute inset-0 origin-left" style={{ background: P3R.blue }} initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: autoCloseMs / 1000, ease: 'linear' }} />
              </div>
              <span className="mt-1.5 text-[11px] font-bold text-white/80">点击任意处关闭</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
