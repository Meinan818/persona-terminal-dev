/**
 * 看图大图（真实 src/components/ImageLightbox.tsx）：
 * 上一张 / 下一张、页码点「第 N 张」、提示「左右滑动切换 · 点空白处关闭」、保存、删除 → 确认删除、关闭；左右滑动（drag x）。
 * 转场：电视画面放大弹出（tvPowerVariants）。
 */
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { Portal, useEscape, useScrollLock, IconClose, IconBack, IconChevron, useToast } from '@yellow/kit';
import { tvPowerVariants } from '@yellow/fx';
import { useLowMotion } from '@yellow/lib/prefs';
import { p4gAsset } from '@yellow/lib/asset';
import { cx } from '@yellow/lib/cx';

const DEMO = ['town-day.webp', 'town-night.webp', 'tv-world-fog.webp'];
export default function ImageLightbox({ open, onClose, images, index: idx0 = 0, caption, onDelete }: OverlayProps & { images?: string[]; index?: number; caption?: string; onDelete?: (i: number) => void }) {
  const low = useLowMotion();
  const toast = useToast();
  const [list, setList] = useState<string[]>(images ?? DEMO);
  const [i, setI] = useState(idx0);
  const [confirm, setConfirm] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setList(images ?? DEMO); setI(idx0); setConfirm(false); setHint(null); } }, [open]); // eslint-disable-line
  useScrollLock(open);
  useEscape(open, onClose);
  const n = list.length;
  const go = (d: number) => { if (n < 2) return; setI((v) => (v + d + n) % n); setConfirm(false); };
  useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });
  useEffect(() => { if (open && n === 0) onClose(); }, [n, open, onClose]);
  const src = list[i];
  const btn = 'p4g-press rounded-sm border-3 border-p4g-black px-3 py-1.5 font-display text-meta font-bold shadow-hard-sm disabled:opacity-50';
  const save = () => { setBusy(true); setTimeout(() => { setBusy(false); setHint('已保存到相册'); toast.success('已保存'); }, 500); };
  const del = () => {
    onDelete?.(i);
    setList((l) => l.filter((_, j) => j !== i));
    setI((v) => Math.max(0, Math.min(v, n - 2)));
    setConfirm(false);
  };
  return (
    <Portal>
      <AnimatePresence>
        {open && src && (
          <motion.div key="ilb" role="dialog" aria-modal="true" aria-label="查看图片" className="fixed inset-0 flex flex-col bg-black/90 text-white" style={{ zIndex: 'var(--p4g-z-system)' as unknown as number }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <div aria-hidden className="h-2 shrink-0 p4g-candy-h" />
            <div className="flex shrink-0 items-center gap-2 px-3 py-3" style={{ paddingTop: 'calc(10px + env(safe-area-inset-top))' }} onClick={(e) => e.stopPropagation()}>
              <span className="rounded-pill bg-p4g-yellow px-3 py-1 p4g-date-type text-meta text-p4g-black">{String(i + 1).padStart(2, '0')}/{String(n).padStart(2, '0')}</span>
              <div className="flex-1" />
              {confirm ? (
                <>
                  <button type="button" onClick={del} className={cx(btn, 'bg-p4g-danger text-[color:var(--p4g-danger-ink)]')}>确认删除</button>
                  <button type="button" onClick={() => setConfirm(false)} className={cx(btn, 'bg-white text-p4g-black')}>取消</button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirm(true)} className={cx(btn, 'bg-white text-p4g-black')}>删除</button>
              )}
              <button type="button" onClick={save} disabled={busy} className={cx(btn, 'bg-white text-p4g-black')}>保存</button>
              <button type="button" onClick={onClose} aria-label="关闭" className={cx(btn, 'flex h-10 w-10 items-center justify-center bg-p4g-yellow px-0 text-p4g-black')}><IconClose size={16} /></button>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
              <AnimatePresence mode="wait" initial={false}>
                <motion.img key={src + i} src={p4gAsset(src)} alt={`第 ${i + 1} 张`} draggable={false}
                  variants={tvPowerVariants(low)} initial="off" animate="on" exit="off"
                  drag={n > 1 && !low ? 'x' : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.5}
                  onDragEnd={(_: unknown, info: PanInfo) => { if (info.offset.x < -60) go(1); else if (info.offset.x > 60) go(-1); }}
                  onClick={(e) => e.stopPropagation()}
                  className="max-h-full max-w-full cursor-grab border-[6px] border-white object-contain shadow-[8px_8px_0_var(--p4g-yellow)] active:cursor-grabbing" style={{ maxHeight: 'calc(100vh - 170px)' }} />
              </AnimatePresence>
              {n > 1 && (
                <>
                  <button type="button" aria-label="上一张" onClick={(e) => { e.stopPropagation(); go(-1); }} className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-sm border-3 border-p4g-black bg-p4g-yellow text-p4g-black shadow-hard-sm sm:flex"><IconBack size={16} /></button>
                  <button type="button" aria-label="下一张" onClick={(e) => { e.stopPropagation(); go(1); }} className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-sm border-3 border-p4g-black bg-p4g-yellow text-p4g-black shadow-hard-sm sm:flex"><IconChevron size={16} /></button>
                </>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-center gap-2 px-4 py-4" style={{ paddingBottom: 'calc(14px + env(safe-area-inset-bottom))' }}>
              {n > 1 && (
                <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {list.map((_, j) => <button key={j} type="button" aria-label={`第 ${j + 1} 张`} onClick={() => setI(j)} className={cx('h-2.5 border-2 border-white transition-all', j === i ? 'w-6 bg-p4g-yellow' : 'w-2.5 bg-transparent')} />)}
                </div>
              )}
              <p className="max-w-full truncate rounded-sm bg-p4g-black px-3 py-1 text-meta font-bold text-white">{hint ?? caption ?? (n > 1 ? '左右滑动切换 · 点空白处关闭' : '点空白处关闭')}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
