/**
 * 看图大图（真实 src/components/ImageLightbox.tsx）：
 * 上一张 / 下一张、页码点「第 N 张」、提示「左右滑动切换 · 点空白处关闭」、保存、删除 → 确认删除、关闭；左右滑动（drag x）。
 * P3R：莓紫墨暗幕 + 斜切相框（玫红错位色片作影）+ 顶部斜切页码签；转场 = 居中斜向弹入（scale .92 + 位移）。
 */
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import { Portal, useEscape, useScrollLock, useToast, P3R, slantClip, IconBack, IconChevron, IconClose } from '@pink/kit';
import { useBoldness } from '@pink/lib/prefs';
import { Photo } from '@pink/screens/pkg2/common';

const DEMO = ['bailu.webp', 'chunfen.webp', 'dongzhi.webp'];
const Btn = ({ children, onClick, tone = 'glass', label, disabled }: { children: React.ReactNode; onClick: () => void; tone?: 'glass' | 'danger' | 'rose'; label?: string; disabled?: boolean }) => (
  <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="flex h-10 min-w-0 items-center justify-center px-4 text-[13px] font-black disabled:opacity-50"
    style={{ clipPath: slantClip(8), background: tone === 'danger' ? P3R.magenta : tone === 'rose' ? P3R.blue : 'rgba(255,248,240,0.14)', color: tone === 'rose' ? P3R.onBlue : '#fff' }}>{children}</button>
);
export default function ImageLightbox({ open, onClose, images, index: idx0 = 0, caption, onDelete }: OverlayProps & { images?: string[]; index?: number; caption?: string; onDelete?: (i: number) => void }) {
  const anim = useBoldness();
  const toast = useToast();
  const [list, setList] = useState<string[]>(images ?? DEMO);
  const [i, setI] = useState(idx0);
  const [dir, setDir] = useState(1);
  const [confirm, setConfirm] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setList(images ?? DEMO); setI(idx0); setConfirm(false); setHint(null); } }, [open]); // eslint-disable-line
  useScrollLock(open);
  useEscape(open, onClose);
  const n = list.length;
  const go = (d: number) => { if (n < 2) return; setDir(d); setI((v) => (v + d + n) % n); setConfirm(false); };
  useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });
  useEffect(() => { if (open && n === 0) onClose(); }, [n, open, onClose]);
  const src = list[i];
  const save = () => { setBusy(true); window.setTimeout(() => { setBusy(false); setHint('已保存到相册'); toast.success('已保存'); }, 500); };
  const del = () => { onDelete?.(i); setList((l) => l.filter((_, j) => j !== i)); setI((v) => Math.max(0, Math.min(v, n - 2))); setConfirm(false); };
  return (
    <Portal>
      <AnimatePresence>
        {open && src && (
          <motion.div key="ilb" role="dialog" aria-modal="true" aria-label="查看图片" className="fixed inset-0 z-system flex flex-col overflow-hidden" style={{ background: 'rgba(27, 8, 22, 0.92)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <div aria-hidden className="pointer-events-none absolute -left-[10%] top-[8%] h-[28%] w-[70%]" style={{ background: 'rgb(var(--p3r-blue-rgb) / 0.18)', clipPath: 'polygon(0 30%, 100% 0, 92% 70%, 6% 100%)' }} />
            <div className="relative flex shrink-0 items-center gap-2 px-3 py-3" style={{ paddingTop: 'calc(10px + env(safe-area-inset-top))' }} onClick={(e) => e.stopPropagation()}>
              <span className="px-3 py-1 font-cond text-[16px] tabular" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(6) }}>{String(i + 1).padStart(2, '0')}<span className="opacity-70">/{String(n).padStart(2, '0')}</span></span>
              <div className="flex-1" />
              {confirm ? (<><Btn tone="danger" onClick={del}>确认删除</Btn><Btn onClick={() => setConfirm(false)}>取消</Btn></>) : <Btn onClick={() => setConfirm(true)}>删除</Btn>}
              <Btn onClick={save} disabled={busy}>{busy ? '保存中…' : '保存'}</Btn>
              <Btn tone="rose" label="关闭" onClick={onClose}><IconClose size={15} /></Btn>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center px-6">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={src + i} className="relative max-h-full" onClick={(e) => e.stopPropagation()}
                  initial={anim ? { opacity: 0, x: 40 * dir, scale: 0.92 } : { opacity: 0 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={anim ? { opacity: 0, x: -40 * dir, scale: 0.96 } : { opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                  drag={n > 1 && anim ? 'x' : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.5}
                  onDragEnd={(_: unknown, info: PanInfo) => { if (info.offset.x < -60) go(1); else if (info.offset.x > 60) go(-1); }}>
                  <span aria-hidden className="absolute inset-0 translate-x-[10px] translate-y-[10px]" style={{ background: P3R.blue, clipPath: slantClip(18) }} />
                  <div className="relative overflow-hidden p-[6px]" style={{ background: 'var(--p3r-cream)', clipPath: slantClip(18) }}>
                    <div className="overflow-hidden" style={{ clipPath: slantClip(14) }}>
                      <Photo src={src} alt={`第 ${i + 1} 张`} className="block max-h-[calc(100dvh-210px)] w-auto max-w-[min(86vw,720px)] cursor-grab active:cursor-grabbing" style={{ height: 'auto' }} />
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
              {n > 1 && (<>
                <button type="button" aria-label="上一张" onClick={(e) => { e.stopPropagation(); go(-1); }} className="absolute left-3 top-1/2 hidden h-12 w-11 -translate-y-1/2 items-center justify-center sm:flex" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(8) }}><IconBack size={16} /></button>
                <button type="button" aria-label="下一张" onClick={(e) => { e.stopPropagation(); go(1); }} className="absolute right-3 top-1/2 hidden h-12 w-11 -translate-y-1/2 items-center justify-center sm:flex" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(8) }}><IconChevron size={16} /></button>
              </>)}
            </div>
            <div className="relative flex shrink-0 flex-col items-center gap-2 px-4 py-4" style={{ paddingBottom: 'calc(14px + env(safe-area-inset-bottom))' }}>
              {n > 1 && (
                <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {list.map((_, j) => <button key={j} type="button" aria-label={`第 ${j + 1} 张`} onClick={() => { setDir(j > i ? 1 : -1); setI(j); }} className="h-[8px] transition-all" style={{ width: j === i ? 26 : 12, background: j === i ? P3R.blue : 'rgba(255,248,240,0.35)', clipPath: slantClip(3) }} />)}
                </div>
              )}
              <p className="max-w-full truncate px-4 py-1 text-[12px] font-bold" style={{ background: 'rgba(255,248,240,0.12)', color: 'var(--p3r-cream)', clipPath: slantClip(6) }}>{hint ?? caption ?? (n > 1 ? '左右滑动切换 · 点空白处关闭' : '点空白处关闭')}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
