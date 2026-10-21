/**
 * 总攻击演出（真实 AllOutOverlay）：羁绊之影共斗里「共鸣 / 总攻击」出手时的 1.8s 全屏演出，不拦截交互。
 * 幕 1 0–0.6s 中心闪光 · 幕 2 双斩（0.15s 左→右 / 0.35s 右→左，各 0.8s）· 粒子 24 颗 0.3s 起散射 0.9s
 * 幕 3 0.25s 起 ALL-OUT / ATTACK! 大字（0.3→1.15→1，1.55s）+ 双人名 · 伤害数字请求回来那一刻砸下 · 上下电影黑边（这里换莓紫墨边，scaleY 伸缩）。
 * 粉白 P3R：红金换樱玫红 / 珊瑚 / 藕紫；字用窄斜体 + 奶油描边。
 *   #/overlay/bond-allout?persona=Orpheus&partner=由加莉&damage=128
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { OverlayProps } from '@pink/registry/types';
import { Portal } from '@pink/kit';
import { useBoldness } from '@pink/lib/prefs';

const TOTAL = 1.8;
const COLORS = ['var(--p3r-blue)', 'var(--p3r-magenta)', 'var(--p3r-cyan)', 'var(--p3r-cream)'];
const PARTICLES = Array.from({ length: 24 }, (_, i) => ({ id: i, angle: (i / 24) * 360, distance: 140 + (i % 4) * 30, size: 3 + (i % 3) * 2, delay: (i % 6) * 0.02, color: COLORS[i % 4] }));

export function AllOut({ isFiring, personaName, partnerName, damage }: { isFiring: boolean; personaName: string; partnerName?: string; damage?: number | null }) {
  const bold = useBoldness();
  return (
    <Portal>
      <AnimatePresence>
        {isFiring && (
          <motion.div key="allout" className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden" style={{ zIndex: 'var(--p3r-z-cutin)' as unknown as number }}
            initial={{ opacity: bold ? 1 : 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} role="status" aria-label="总攻击">
            {/* 幕 1：闪光 */}
            <motion.div aria-hidden className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: bold ? [0, 1, 0.6, 0] : 0.5 }} transition={{ duration: 0.6, times: [0, 0.15, 0.4, 1] }}
              style={{ background: 'radial-gradient(circle at center, rgb(var(--p3r-cream-rgb) / 0.95) 0%, rgb(var(--p3r-blue-rgb) / 0.6) 30%, rgb(var(--p3r-mulberry-rgb) / 0.3) 60%, transparent 90%)' }} />
            {/* 幕 2：双斩 */}
            {bold && <>
              <motion.div aria-hidden className="absolute top-1/4 h-1/2 w-[140%]" initial={{ x: '-120%', skewX: -18 }} animate={{ x: '120%' }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                style={{ background: 'linear-gradient(90deg, transparent, rgb(var(--p3r-blue-rgb) / 0.85), rgb(var(--p3r-magenta-rgb) / 0.85), transparent)' }} />
              <motion.div aria-hidden className="absolute top-[30%] h-[40%] w-[140%]" initial={{ x: '120%', skewX: 18 }} animate={{ x: '-120%' }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
                style={{ background: 'linear-gradient(90deg, transparent, rgb(var(--p3r-cyan-rgb) / 0.85), rgb(var(--p3r-cream-rgb) / 0.8), transparent)' }} />
              <div className="absolute left-1/2 top-1/2">
                {PARTICLES.map((p) => (
                  <motion.span key={p.id} aria-hidden className="absolute block" style={{ width: p.size, height: p.size, background: p.color, clipPath: p.id % 2 ? 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' : undefined, borderRadius: p.id % 2 ? 0 : '50%' }}
                    initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }} animate={{ x: Math.cos((p.angle * Math.PI) / 180) * p.distance, y: Math.sin((p.angle * Math.PI) / 180) * p.distance, opacity: [0, 1, 0], scale: [0.5, 1.2, 0.3] }}
                    transition={{ duration: 0.9, delay: 0.3 + p.delay, ease: 'easeOut' }} />
                ))}
              </div>
            </>}
            {/* 幕 3：大字 */}
            <motion.div className="relative select-none px-4 text-center" initial={bold ? { scale: 0.3, opacity: 0, rotate: -4 } : { opacity: 1 }}
              animate={bold ? { scale: [0.3, 1.15, 1, 1], opacity: [0, 1, 1, 0], rotate: [-4, 0, 0, 2] } : { opacity: 1 }} transition={{ duration: TOTAL - 0.25, times: [0, 0.2, 0.78, 1], delay: 0.25 }}>
              <div className="font-cond text-[clamp(56px,16vw,96px)] leading-none tracking-[0.06em]" style={{ color: 'var(--p3r-cream)', WebkitTextStroke: '2px var(--p3r-blue-deep)', textShadow: '5px 5px 0 var(--p3r-blue)' }}>ALL-OUT</div>
              <div className="mt-1 font-cond text-[clamp(34px,10vw,58px)] leading-none tracking-[0.14em]" style={{ color: 'var(--p3r-blue)', WebkitTextStroke: '1px var(--p3r-mulberry)', textShadow: '3px 3px 0 var(--p3r-cream)' }}>ATTACK!</div>
              <motion.div className="mt-3 inline-block px-4 py-1 font-cond text-[14px] tracking-[0.2em]" style={{ background: 'var(--p3r-mulberry)', color: 'var(--p3r-cream)', clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)' }}
                initial={bold ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.25 }}>
                {personaName.toUpperCase()}{partnerName && <><span className="mx-2" style={{ color: 'var(--pk-petal-a)' }}>×</span><span>@{partnerName}</span></>}
              </motion.div>
              {typeof damage === 'number' && (
                <motion.div key={`dmg-${damage}`} className="mt-2 font-cond text-[44px] leading-none tabular-nums" style={{ color: 'var(--p3r-cream)', WebkitTextStroke: '1.5px var(--p3r-magenta)', textShadow: '3px 3px 0 var(--p3r-magenta)' }}
                  initial={bold ? { scale: 2.4, opacity: 0, y: -10 } : false} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }}>−{damage}</motion.div>
              )}
            </motion.div>
            {/* 上下电影边（scaleY） */}
            {bold && ['top-0 origin-top', 'bottom-0 origin-bottom'].map((cls) => (
              <motion.div key={cls} aria-hidden className={`absolute left-0 right-0 h-[12%] ${cls}`} style={{ background: 'var(--p3r-mulberry)' }}
                initial={{ scaleY: 0 }} animate={{ scaleY: [0, 1, 1, 0] }} transition={{ duration: TOTAL, times: [0, 0.14, 0.8, 1] }} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export default function AllOutOverlay({ open, onClose, params }: OverlayProps) {
  const [damage, setDamage] = useState<number | null>(null);
  // 伤害由「请求回来」驱动：0.9s 后挂上；整段 1.8s 后收场（再留 0.3s 让退场淡出）
  useEffect(() => {
    if (!open) return;
    setDamage(null);
    const a = window.setTimeout(() => setDamage(Number(params?.get('damage') ?? 128)), 900);
    const b = window.setTimeout(onClose, TOTAL * 1000 + 300);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return <AllOut isFiring={open} personaName={params?.get('persona') || 'Orpheus'} partnerName={params?.get('partner') || '由加莉'} damage={damage} />;
}
