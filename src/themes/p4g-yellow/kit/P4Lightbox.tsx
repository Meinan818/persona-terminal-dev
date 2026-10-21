/**
 * P4Lightbox —— 看图大图：黑幕 + 电视开机式弹出 + 白边框照片 + 左右切换 + 计数 + 说明。
 *   <P4Lightbox open={o} onClose={()=>setO(false)} images={[{src, caption}]} index={i} onIndexChange={setI} />
 * 键盘 ← → Esc；图片 object-contain，不裁切。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { Portal, useEscape, useScrollLock } from './Portal';
import { useLowMotion } from '@yellow/lib/prefs';
import { tvPowerVariants } from '@yellow/fx/TVPower';
import { IconBack, IconChevron, IconClose } from './icons';

export interface P4LightboxImage { src: string; caption?: string; alt?: string }
export interface P4LightboxProps { open: boolean; onClose: () => void; images: P4LightboxImage[]; index?: number; onIndexChange?: (i: number) => void }

export function P4Lightbox({ open, onClose, images, index = 0, onIndexChange }: P4LightboxProps) {
  const low = useLowMotion();
  useScrollLock(open);
  useEscape(open, onClose);
  const n = images.length;
  const go = (d: number) => onIndexChange?.((index + d + n) % n);
  useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });
  const img = images[index];
  const nav = 'p4g-press flex h-11 w-11 items-center justify-center rounded-sm border-3 border-p4g-black bg-p4g-yellow text-p4g-black shadow-hard-sm';
  return (
    <Portal>
      <AnimatePresence>
        {open && img && (
          <motion.div key="lb" className="fixed inset-0 flex flex-col items-center justify-center bg-black/90 p-4" style={{ zIndex: 'var(--p4g-z-system)' as unknown as number }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-modal="true">
            <div className="absolute right-3 top-3 flex items-center gap-2" style={{ top: 'calc(12px + env(safe-area-inset-top))' }}>
              {n > 1 && <span className="rounded-pill bg-p4g-black px-3 py-1 p4g-date-type text-meta text-white">{String(index + 1).padStart(2, '0')}/{String(n).padStart(2, '0')}</span>}
              <button type="button" aria-label="关闭" className={nav} onClick={onClose}><IconClose size={16} /></button>
            </div>
            <motion.figure key={index} className="relative flex max-h-[80vh] max-w-full min-w-0 flex-col items-center" variants={tvPowerVariants(low)} initial="off" animate="on" exit="off" onClick={(e) => e.stopPropagation()}>
              <img src={img.src} alt={img.alt ?? img.caption ?? ''} className="max-h-[72vh] max-w-[92vw] border-[6px] border-white object-contain shadow-[8px_8px_0_var(--p4g-yellow)]" />
              {img.caption && <figcaption className="mt-4 max-w-[92vw] rounded-sm bg-p4g-black px-3 py-1.5 text-center text-body font-bold text-white p4g-clamp-2">{img.caption}</figcaption>}
            </motion.figure>
            {n > 1 && (
              <div className="absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between" onClick={(e) => e.stopPropagation()}>
                <button type="button" aria-label="上一张" className={nav} onClick={() => go(-1)}><IconBack size={16} /></button>
                <button type="button" aria-label="下一张" className={nav} onClick={() => go(1)}><IconChevron size={16} /></button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
