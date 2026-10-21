/**
 * 记录图片管理抽屉（真实 src/components/ActivityImagesSheet.tsx）：
 * 标题「记录图片」/「图片 · 摘要」；缩略「查看第 N 张」；「删除这张图」→ 删除 / 取消；「添加（还可 N 张）」；空态；提示「每条记录最多 N 张…」「已经满了」。
 * ?state=empty 空态。
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Sheet, IconPlus, IconTrash } from '@yellow/kit';
import { p4gAsset } from '@yellow/lib/asset';
import { actionsOps, MAX_IMAGES_PER_ACTIVITY } from '@yellow/adapters/pkg2';
import { prepareActivityImage } from '@/utils/activityImages';
import ImageLightbox from './ImageLightbox.p4g';

export default function ActivityImagesSheet({ open, onClose, params, title, activityId, images: init, onChange }: OverlayProps & { title?: string; activityId?: string; images?: string[]; onChange?: () => void }) {
  const [imgs, setImgs] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<number | null>(null);
  const [lb, setLb] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  useEffect(() => { if (open) { setImgs(init ?? []); setHint(null); setConfirm(null); } }, [open, init]); // eslint-disable-line
  const update = (v: string[]) => { setImgs(v); onChange?.(); };
  const room = MAX_IMAGES_PER_ACTIVITY - imgs.length;
  const add = () => {
    if (room <= 0) { setHint('已经满了'); return; }
    if (!activityId) { setHint('记录尚未保存，暂时不能添加图片'); return; }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = room > 1;
    input.onchange = async () => {
      const files = [...(input.files ?? [])];
      if (!files.length) return;
      setBusy(true);
      try {
        const prepared = await Promise.all(files.map((file) => prepareActivityImage(file)));
        await actionsOps.addActivityImages(activityId, prepared);
        onChange?.();
      } catch (e) {
        setHint(e instanceof Error ? e.message : '图片添加失败');
      } finally {
        setBusy(false);
      }
    };
    input.click();
  };
  return (
    <>
      <P4Sheet open={open} onClose={onClose} title={title ?? '记录图片'} en="PHOTOS">
        <div className="grid grid-cols-3 gap-2.5">
          {imgs.map((src, i) => (
            <div key={`${src}-${i}`} className="relative aspect-square min-w-0 overflow-hidden rounded-xs border-3 border-p4g-black bg-p4g-black shadow-hard-sm night:border-p4g-yellow">
              <button type="button" onClick={() => setLb(i)} className="block h-full w-full" aria-label={`查看第 ${i + 1} 张`}>
                <img src={p4gAsset(src)} alt="" className="h-full w-full object-cover" />
              </button>
              <span className="pointer-events-none absolute left-0 top-0 bg-p4g-yellow px-1 p4g-num text-2xs text-p4g-black">{String(i + 1).padStart(2, '0')}</span>
              {confirm === i ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/80 text-meta font-bold">
                  <button type="button" onClick={async () => { if (activityId) await actionsOps.removeActivityImageAt(activityId, i); update(imgs.filter((_, j) => j !== i)); setConfirm(null); }} className="rounded-xs bg-p4g-danger px-3 py-1 text-[color:var(--p4g-danger-ink)]">删除</button>
                  <button type="button" onClick={() => setConfirm(null)} className="rounded-xs bg-white px-3 py-1 text-p4g-black">取消</button>
                </div>
              ) : (
                <button type="button" aria-label="删除这张图" onClick={() => setConfirm(i)} className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-xs border-2 border-p4g-black bg-p4g-yellow text-p4g-black"><IconTrash size={13} /></button>
              )}
            </div>
          ))}
          {room > 0 && (
            <button type="button" onClick={add} disabled={busy} className="flex aspect-square min-w-0 flex-col items-center justify-center gap-1 rounded-xs border-3 border-dashed border-p4g-line bg-p4g-surface text-p4g-ink">
              <IconPlus size={22} />
              <span className="px-1 text-center text-cap font-bold">{busy ? '处理中…' : `添加（还可 ${room} 张）`}</span>
            </button>
          )}
        </div>
        {hint && <p className="mt-3 text-center text-meta font-bold text-p4g-danger">{hint}</p>}
        {imgs.length === 0 && <p className="mt-3 text-center text-meta text-p4g-ink-soft">这条记录还没有图片。图片只存在本机，不上云，可在「账号与数据」单独导出图片包。</p>}
      </P4Sheet>
      <ImageLightbox open={lb !== null} onClose={() => setLb(null)} images={imgs} index={lb ?? 0} onDelete={async (i) => { if (activityId) await actionsOps.removeActivityImageAt(activityId, i); update(imgs.filter((_, j) => j !== i)); }} />
    </>
  );
}
