/**
 * 总攻击 ALL-OUT 全屏特效（真实 AllOutOverlay，1.8s）：
 * 全屏闪 → 两道对角斩击交叉 → 「ALL-OUT ATTACK!」扫入 + 「Persona × 同伴」→ 伤害数字砸下。
 * P4G 版：黄黑速度线（cutin-speedlines）+ 黑描边白字 + 橙色硬投影；只动 transform/opacity。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Outline, Portal } from '@yellow/kit';
import { p4gAsset } from '@yellow/lib/asset';
import { useLowMotion } from '@yellow/lib/prefs';

export function AllOut({ isFiring, personaName, partnerName, damage }: { isFiring: boolean; personaName: string; partnerName?: string; damage?: number | null }) {
  const low = useLowMotion();
  return (
    <Portal>
      <AnimatePresence>
        {isFiring && (
          <motion.div key="ao" aria-live="assertive" className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 'var(--p4g-z-cutin)' as unknown as number }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }}>
            <motion.div className="absolute inset-0 bg-p4g-red" initial={{ opacity: 1 }} animate={{ opacity: low ? 0.85 : [1, 0.2, 0.85] }} transition={{ duration: 0.6 }} />
            <motion.img src={p4gAsset('cutin-speedlines.webp')} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '30% 50%' }} initial={{ scale: 1.15, opacity: 0 }} animate={{ scale: 1, opacity: 0.9 }} transition={{ duration: 0.5 }} />
            {!low && [-1, 1].map((d, i) => (
              <motion.div key={d} className="absolute left-1/2 top-1/2 h-[14px] w-[160vmax] -translate-x-1/2 -translate-y-1/2 bg-white" style={{ rotate: d * 32, boxShadow: '0 0 0 4px var(--p4g-black)' }}
                initial={{ scaleX: 0, opacity: 1 }} animate={{ scaleX: [0, 1, 1], opacity: [1, 1, 0] }} transition={{ duration: 0.9, delay: 0.15 + i * 0.22, times: [0, 0.4, 1] }} />
            ))}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
              <motion.div initial={low ? false : { x: '-120%', skewX: -12 }} animate={{ x: 0, skewX: -6 }} transition={{ delay: 0.25, duration: 0.35, ease: [0.15, 0.95, 0.1, 1] }}>
                <P4Outline size="clamp(40px, 12vw, 110px)" stroke={9} italic fill="var(--p4g-yellow)" strokeColor="var(--p4g-black)" drop={6}>ALL-OUT ATTACK!</P4Outline>
              </motion.div>
              <motion.div className="mt-2 max-w-full truncate rounded-[2px] bg-p4g-black px-4 py-1 font-display text-lead font-bold text-white" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                {personaName}{partnerName ? <> <span className="text-p4g-orange">×</span> @{partnerName}</> : null}
              </motion.div>
              {damage != null && (
                <motion.div className="mt-4 p4g-num text-[clamp(56px,18vw,150px)] leading-none text-white" style={{ WebkitTextStroke: '5px var(--p4g-black)', textShadow: '6px 6px 0 var(--p4g-orange)' }}
                  initial={{ scale: 2.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.8, duration: 0.25, ease: [0.15, 0.95, 0.1, 1] }}>{damage}</motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export default function AllOutOverlay({ open, onClose }: OverlayProps) {
  const [dmg, setDmg] = useState<number | null>(null);
  useEffect(() => {
    if (!open) return;
    setDmg(null);
    const a = window.setTimeout(() => setDmg(252), 300);
    const b = window.setTimeout(onClose, 1800);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [open, onClose]);
  return <AllOut isFiring={open} personaName="Izanagi" partnerName="千枝" damage={dmg} />;
}
