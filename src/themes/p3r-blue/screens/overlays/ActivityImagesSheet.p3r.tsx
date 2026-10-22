/**
 * 记录图片管理抽屉（真实 src/components/ActivityImagesSheet.tsx）：
 * 标题「记录图片」；缩略「查看第 N 张」；「删除这张图」→ 删除 / 取消；「添加（还可 N 张）」；空态「这条记录还没有图片。图片只存在本机…」；提示「每条记录最多 N 张…」「已经满了」。
 * ?state=empty 空态；?state=full 已满（6 张）。
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { P3Sheet, P3Empty, P3R, slantClip, IconPlus, IconTrash } from '@blue/kit';
import { MAX_IMAGES_PER_ACTIVITY, SPARE_IMAGES } from '@blue/mock/pkg2';
import { Photo } from '@blue/screens/pkg2/common';
import ImageLightbox from './ImageLightbox.p3r';

export default function ActivityImagesSheet({ open, onClose, params, title, images: init, onChange }: OverlayProps & { title?: string; images?: string[]; onChange?: (imgs: string[]) => void }) {
  const [imgs, setImgs] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<number | null>(null);
  const [lb, setLb] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const st = params?.get('state');
  useEffect(() => { if (open) { setImgs(init ?? (st === 'empty' ? [] : st === 'full' ? ['bailu.webp', 'chunfen.webp', 'dongzhi.webp', 'chushu.webp', 'dashu.webp', 'daxue.webp'] : ['bailu.webp', 'chunfen.webp'])); setHint(null); setConfirm(null); } }, [open]); // eslint-disable-line
  const update = (v: string[]) => { setImgs(v); onChange?.(v); };
  const room = MAX_IMAGES_PER_ACTIVITY - imgs.length;
  const add = () => {
    if (room <= 0) { setHint('已经满了'); return; }
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      const want = SPARE_IMAGES.slice(0, 3);
      const take = want.slice(0, room);
      setHint(want.length > take.length ? `每条记录最多 ${MAX_IMAGES_PER_ACTIVITY} 张，多出的没有加` : null);
      update([...imgs, ...take]);
    }, 500);
  };
  return (
    <>
      <P3Sheet open={open} onClose={onClose} title={title ?? '记录图片'} en="PHOTOS">
        {imgs.length === 0 && <P3Empty ghost="PHOTO" text="这条记录还没有图片" sub="图片只存在本机，不上云，可在「账号与数据」单独导出图片包。" />}
        <div className="grid grid-cols-3 gap-2.5">
          {imgs.map((src, i) => (
            <div key={`${src}-${i}`} className="relative aspect-square min-w-0 overflow-hidden" style={{ clipPath: slantClip(8), background: P3R.ink }}>
              <button type="button" onClick={() => setLb(i)} className="block h-full w-full" aria-label={`查看第 ${i + 1} 张`}><Photo src={src} /></button>
              <span className="pointer-events-none absolute left-0 top-0 px-2 font-cond text-[12px]" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(4) }}>{String(i + 1).padStart(2, '0')}</span>
              {confirm === i ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-[12px] font-black" style={{ background: 'rgba(8,14,27,0.82)' }}>
                  <button type="button" onClick={() => { update(imgs.filter((_, j) => j !== i)); setConfirm(null); }} className="px-4 py-1" style={{ background: P3R.magenta, color: '#fff', clipPath: slantClip(5) }}>删除</button>
                  <button type="button" onClick={() => setConfirm(null)} className="px-4 py-1" style={{ background: 'var(--p3r-cream)', color: 'var(--p3r-mulberry)', clipPath: slantClip(5) }}>取消</button>
                </div>
              ) : (
                <button type="button" aria-label="删除这张图" onClick={() => setConfirm(i)} className="absolute right-1 top-1 flex h-7 w-8 items-center justify-center" style={{ background: 'var(--p3r-cream)', color: 'var(--p3r-mulberry)', clipPath: slantClip(5) }}><IconTrash size={13} /></button>
              )}
            </div>
          ))}
          {room > 0 ? (
            <button type="button" onClick={add} disabled={busy} className="flex aspect-square min-w-0 flex-col items-center justify-center gap-1" style={{ background: P3R.cyanFaint, color: P3R.ink, clipPath: slantClip(8) }}>
              {busy ? <span aria-hidden className="bk-spin h-5 w-5 rounded-full border-2 border-current border-t-transparent" /> : <IconPlus size={22} />}
              <span className="px-1 text-center text-[11px] font-black">{busy ? '处理中…' : `添加（还可 ${room} 张）`}</span>
            </button>
          ) : (
            <button type="button" onClick={add} className="flex aspect-square min-w-0 flex-col items-center justify-center gap-1 opacity-60" style={{ background: 'var(--p3r-row-alt)', color: P3R.grey, clipPath: slantClip(8) }}>
              <span className="px-1 text-center text-[11px] font-black">已满 {MAX_IMAGES_PER_ACTIVITY} 张</span>
            </button>
          )}
        </div>
        {hint && <p className="mt-3 text-center text-[12px] font-black" style={{ color: 'var(--p3r-coral-ink)' }}>{hint}</p>}
        {imgs.length > 0 && <p className="mt-3 text-center text-[11px]" style={{ color: P3R.grey }}>每条记录最多 {MAX_IMAGES_PER_ACTIVITY} 张 · 图片只存在本机</p>}
      </P3Sheet>
      <ImageLightbox open={lb !== null} onClose={() => setLb(null)} images={imgs} index={lb ?? 0} onDelete={(i) => update(imgs.filter((_, j) => j !== i))} />
    </>
  );
}
