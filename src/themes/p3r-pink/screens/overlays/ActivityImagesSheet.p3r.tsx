/**
 * 记录图片管理抽屉（真实 src/components/ActivityImagesSheet.tsx）：
 * 标题「记录图片」；缩略「查看第 N 张」；「删除这张图」→ 删除 / 取消；「添加（还可 N 张）」；空态「这条记录还没有图片。图片只存在本机…」；提示「每条记录最多 N 张…」「已经满了」。
 * ?state=empty 空态；?state=full 已满（6 张）。
 */
import { useEffect, useState } from 'react';
import type { ActivityImage } from '@/types';
import type { OverlayProps } from '@pink/registry/types';
import { P3Sheet, P3Empty, P3R, slantClip, IconPlus, IconTrash } from '@pink/kit';
import { MAX_IMAGES_PER_ACTIVITY } from '@pink/adapters/pkg2';
import { addActivityImages, prepareActivityImage, removeActivityImage } from '@/utils/activityImages';
import { Photo } from '@pink/screens/pkg2/common';
import ImageLightbox from './ImageLightbox.p3r';

const pickFiles = () => new Promise<File[]>((resolve) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = () => resolve(Array.from(input.files ?? []));
  input.click();
});

export default function ActivityImagesSheet({ open, onClose, params, title, images = [], activityId, onChange }: OverlayProps & { title?: string; images?: ActivityImage[]; activityId?: string; onChange?: (imgs: ActivityImage[]) => void }) {
  const [confirm, setConfirm] = useState<number | null>(null);
  const [lb, setLb] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  useEffect(() => { if (open) { setHint(null); setConfirm(null); } }, [open]);
  const room = MAX_IMAGES_PER_ACTIVITY - images.length;
  const add = async () => {
    if (room <= 0) { setHint('已经满了'); return; }
    if (!activityId) { setHint('这条演示记录没有真实记录 ID，无法写入图片'); return; }
    const files = await pickFiles();
    if (!files.length) return;
    setBusy(true);
    try {
      const prepared = await Promise.all(files.slice(0, room).map(prepareActivityImage));
      const added = await addActivityImages(activityId, prepared);
      onChange?.([...images, ...added]);
      setHint(files.length > room ? `每条记录最多 ${MAX_IMAGES_PER_ACTIVITY} 张，多出的没有加` : null);
    } catch (error) {
      setHint(error instanceof Error ? error.message : '图片处理失败');
    } finally {
      setBusy(false);
    }
  };
  const removeAt = async (index: number) => {
    const row = images[index];
    if (!row) return;
    await removeActivityImage(row.id);
    onChange?.(images.filter((_, i) => i !== index));
    setConfirm(null);
  };
  const urls = images.map((row) => row.thumbDataUrl);
  return (
    <>
      <P3Sheet open={open} onClose={onClose} title={title ?? '记录图片'} en="PHOTOS">
        {images.length === 0 && <P3Empty ghost="PHOTO" text="这条记录还没有图片" sub="图片只存在本机，不上云，可在「账号与数据」单独导出图片包。" />}
        <div className="grid grid-cols-3 gap-2.5">
          {images.map((image, i) => (
            <div key={image.id} className="relative aspect-square min-w-0 overflow-hidden" style={{ clipPath: slantClip(8), background: P3R.ink }}>
              <button type="button" onClick={() => setLb(i)} className="block h-full w-full" aria-label={`查看第 ${i + 1} 张`}><Photo src={image.thumbDataUrl} /></button>
              <span className="pointer-events-none absolute left-0 top-0 px-2 font-cond text-[12px]" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(4) }}>{String(i + 1).padStart(2, '0')}</span>
              {confirm === i ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-[12px] font-black" style={{ background: 'rgba(27,8,22,0.82)' }}>
                  <button type="button" onClick={() => void removeAt(i)} className="px-4 py-1" style={{ background: P3R.magenta, color: '#fff', clipPath: slantClip(5) }}>删除</button>
                  <button type="button" onClick={() => setConfirm(null)} className="px-4 py-1" style={{ background: 'var(--p3r-cream)', color: 'var(--p3r-mulberry)', clipPath: slantClip(5) }}>取消</button>
                </div>
              ) : (
                <button type="button" aria-label="删除这张图" onClick={() => setConfirm(i)} className="absolute right-1 top-1 flex h-7 w-8 items-center justify-center" style={{ background: 'var(--p3r-cream)', color: 'var(--p3r-mulberry)', clipPath: slantClip(5) }}><IconTrash size={13} /></button>
              )}
            </div>
          ))}
          {room > 0 ? (
            <button type="button" onClick={add} disabled={busy} className="flex aspect-square min-w-0 flex-col items-center justify-center gap-1" style={{ background: P3R.cyanFaint, color: P3R.ink, clipPath: slantClip(8) }}>
              {busy ? <span aria-hidden className="pk-spin h-5 w-5 rounded-full border-2 border-current border-t-transparent" /> : <IconPlus size={22} />}
              <span className="px-1 text-center text-[11px] font-black">{busy ? '处理中…' : `添加（还可 ${room} 张）`}</span>
            </button>
          ) : (
            <button type="button" onClick={add} className="flex aspect-square min-w-0 flex-col items-center justify-center gap-1 opacity-60" style={{ background: 'var(--p3r-row-alt)', color: P3R.grey, clipPath: slantClip(8) }}>
              <span className="px-1 text-center text-[11px] font-black">已满 {MAX_IMAGES_PER_ACTIVITY} 张</span>
            </button>
          )}
        </div>
        {hint && <p className="mt-3 text-center text-[12px] font-black" style={{ color: 'var(--p3r-coral-ink)' }}>{hint}</p>}
        {images.length > 0 && <p className="mt-3 text-center text-[11px]" style={{ color: P3R.grey }}>每条记录最多 {MAX_IMAGES_PER_ACTIVITY} 张 · 图片只存在本机</p>}
      </P3Sheet>
      <ImageLightbox open={lb !== null} onClose={() => setLb(null)} images={urls} index={lb ?? 0} onDelete={(i) => void removeAt(i)} />
    </>
  );
}
