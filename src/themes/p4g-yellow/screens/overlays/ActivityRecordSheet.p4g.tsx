/**
 * 记录一件事（新增 / 补录抽屉）—— 真实 src/pages/Activities.tsx（SheetModal showInput）。
 * 控件：描述输入、⭐ 这很重要、读图代打字 / 附一张图 / 移除这张图 / ＋ 顺便把这张截图附上、分析关键词 → ✦ AI 分析、
 *       挂到愿望（WishMountPicker）、调整点数 五维 Stepper（0–5）、保存记录。
 * ?variant=backdate 补录模式（带日期）；?step=analyzed 直接展示分析后状态。
 */
import { useEffect, useState } from 'react';
import type { AttributeId } from '@/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Chip, P4Sheet, P4Stepper, P4Textarea, useToast, IconClose } from '@yellow/kit';
import { p4gAsset } from '@yellow/lib/asset';
import { analyzeActivityLocally, ATTR_IDS, useActionAttributes, useActionsData } from '@yellow/adapters/pkg2';
import { prepareActivityImage, type PreparedImage } from '@/utils/activityImages';
import { useAppStore } from '@/store';
import { cx } from '@yellow/lib/cx';

export interface RecordSavePayload { description: string; points: Record<AttributeId, number>; important: boolean; images: PreparedImage[]; backdate?: string; wishId?: string }

const zero = (): Record<AttributeId, number> => ({ knowledge: 0, guts: 0, dexterity: 0, kindness: 0, charm: 0 });

export function WishMountPicker({ value, onChange, compact }: { value?: string; onChange: (id: string | undefined) => void; compact?: boolean }) {
  const { WISHES } = useActionsData();
  const active = WISHES.filter((w) => w.status === 'active' && !w.parentId);
  if (!active.length) return null;
  return (
    <div className="space-y-1.5">
      {!compact && <div className="text-meta font-bold text-p4g-ink">挂到愿望 <span className="font-normal text-p4g-muted">可不选；挂上后会计入那个愿望的进度</span></div>}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 p4g-noscroll">
        {active.map((w) => {
          const on = value === w.id;
          return (
            <P4Chip key={w.id} tone={on ? 'black' : 'outline'} selected={on} onClick={() => onChange(on ? undefined : w.id)} className="shrink-0">
              {on ? '✓ ' : ''}{w.title.length > 12 ? `${w.title.slice(0, 12)}…` : w.title}
            </P4Chip>
          );
        })}
      </div>
    </div>
  );
}

export default function ActivityRecordSheet({ open, onClose, params, backdate, onSave }: OverlayProps & { backdate?: string | null; onSave?: (p: RecordSavePayload) => void }) {
  const { TODAY_KEY } = useActionsData();
  const { ATTR_NAMES } = useActionAttributes();
  const toast = useToast();
  const bd = backdate ?? (params?.get('variant') === 'backdate' ? TODAY_KEY : null);
  const [desc, setDesc] = useState('');
  const [important, setImportant] = useState(false);
  const [images, setImages] = useState<PreparedImage[]>([]);
  const [imgBusy, setImgBusy] = useState(false);
  const [shotBusy] = useState(false);
  const [shotHint, setShotHint] = useState<string | null>(null);
  const [shotCandidates, setShotCandidates] = useState<{ text: string; on: boolean }[] | null>(null);
  const [analyzed, setAnalyzed] = useState<Record<AttributeId, number> | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiReason, setAiReason] = useState<string | null>(null);
  const [wish, setWish] = useState<string | undefined>();
  useEffect(() => {
    if (!open) return;
    if (params?.get('step') === 'analyzed') {
      const description = '在图书馆把第 4 章读完了，还帮同桌讲了两道题';
      setDesc(description);
      setAnalyzed(analyzeActivityLocally(description));
    }
  }, [open, params]);

  const reset = () => { setDesc(''); setImportant(false); setImages([]); setAnalyzed(null); setAiReason(null); setShotHint(null); setShotCandidates(null); setWish(undefined); };
  const attach = () => {
    if (images.length >= 6) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setImgBusy(true);
      try {
        const prepared = await prepareActivityImage(file);
        setImages((v) => [...v, prepared].slice(0, 3));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '图片处理失败');
      } finally {
        setImgBusy(false);
      }
    };
    input.click();
  };
  const readShot = () => {
    setShotHint('当前未配置图片识别服务，请手动描述这次完成的事');
  };
  const analyze = () => { setAnalyzed(analyzeActivityLocally(desc)); };
  const ai = async () => {
    setAiBusy(true);
    try {
      const { analyzeActivityAI } = await import('@/utils/activityAI');
      const result = await analyzeActivityAI(desc, useAppStore.getState().settings.attributeNames, useAppStore.getState().settings);
      setAnalyzed(result.points);
      setAiReason(result.reason || null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'AI 分析失败');
    } finally {
      setAiBusy(false);
    }
  };
  const save = async () => {
    if (imgBusy) { toast('图片还在处理，稍等一下再保存'); return; }
    if (!desc.trim()) { toast.error('先写下你做了什么'); return; }
    const p = analyzed ?? analyzeActivityLocally(desc);
    try {
      await onSave?.({ description: desc.trim(), points: p, important, images, backdate: bd ?? undefined, wishId: wish });
      if (!onSave) toast.success('记录成功');
      reset(); onClose();
    } catch {
      // 页面层保留表单与错误提示，允许直接重试。
    }
  };

  return (
    <P4Sheet open={open} onClose={onClose} title={bd ? '补录历史记录' : '记录一件事'} en={bd ? 'BACKDATE' : 'NEW RECORD'} size="tall"
      footer={
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setImportant((v) => !v)} aria-pressed={important}
            className={cx('p4g-press flex h-11 shrink-0 items-center gap-1 rounded-sm border-3 px-3 font-display text-body font-bold shadow-hard-sm', important ? 'border-p4g-black bg-p4g-orange text-p4g-black' : 'border-p4g-line bg-p4g-surface-2 text-p4g-ink')}>
            ⭐ 这很重要
          </button>
          <P4Button block size="lg" onClick={save} aria-label="保存记录">保存记录</P4Button>
        </div>
      }>
      {bd && <div className="mb-3 inline-flex items-center gap-1.5 rounded-sm border-thin border-p4g-black bg-p4g-yellow px-2.5 py-1 font-display text-meta font-bold text-p4g-black"><span className="p4g-date-type">记录日期：{bd.replace(/-/g, '/')}</span></div>}
      <P4Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="描述你刚才做了什么..." rows={4} aria-label="描述你刚才做了什么" />

      {/* 附件筹码 */}
      <div className="mt-3 flex flex-wrap gap-2">
        <P4Chip tone="outline" onClick={shotBusy ? undefined : readShot} icon={<span>📷</span>}>{shotBusy ? '正在读图…' : '读图代打字'}</P4Chip>
        <P4Chip tone="outline" onClick={imgBusy ? undefined : attach} icon={<span>🖼</span>}>{imgBusy ? '处理中…' : images.length ? `已附 ${images.length} 张` : '附一张图'}</P4Chip>
      </div>
      {shotHint && <p className="mt-2 text-meta font-bold text-p4g-ink-soft">▶ {shotHint}</p>}
      {shotCandidates && (
        <div className="mt-2 space-y-1.5 rounded-sm border-thin border-p4g-line bg-p4g-surface p-2">
          {shotCandidates.map((c, i) => (
            <label key={i} className="flex min-w-0 cursor-pointer items-center gap-2 text-body text-p4g-ink">
              <input type="checkbox" checked={c.on} onChange={() => setShotCandidates((rows) => rows && rows.map((r, j) => (j === i ? { ...r, on: !r.on } : r)))} className="h-4 w-4 accent-[var(--p4g-orange)]" />
              <span className="min-w-0 truncate">{c.text}</span>
            </label>
          ))}
        </div>
      )}
      {images.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 p4g-noscroll">
          {images.map((img, i) => (
            <div key={i} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xs border-3 border-p4g-black bg-p4g-black shadow-hard-sm night:border-p4g-yellow">
              <img src={p4gAsset(img.thumbDataUrl)} alt="" className="h-full w-full object-cover" />
              <button type="button" aria-label="移除这张图" onClick={() => setImages((v) => v.filter((_, j) => j !== i))} className="absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-xs bg-p4g-black text-p4g-yellow"><IconClose size={11} /></button>
            </div>
          ))}
        </div>
      )}

      {/* 分析按钮：双形态 */}
      <div className="mt-4 flex justify-center">
        {!analyzed ? (
          <P4Button variant="black" size="lg" disabled={!desc.trim()} onClick={analyze} aria-label="分析关键词" className="px-10">分析关键词</P4Button>
        ) : (
          <P4Button variant="secondary" size="lg" disabled={!desc.trim() || aiBusy} onClick={ai} aria-label="AI 分析" className="px-10">{aiBusy ? '⋯ AI 思考中' : '✦ AI 分析'}</P4Button>
        )}
      </div>
      {aiReason && <div className="mt-2 rounded-sm bg-p4g-msg px-3 py-2 text-meta leading-relaxed text-[color:var(--p4g-msg-ink)]"><span className="mr-1 font-bold text-p4g-yellow">AI:</span>{aiReason}</div>}

      {analyzed && (
        <div className="mt-4 space-y-3">
          <WishMountPicker value={wish} onChange={setWish} />
          <div className="flex items-center gap-2"><span className="rounded-xs bg-p4g-black px-2 py-0.5 font-display text-meta font-bold text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black">关键词分析</span><span className="text-meta font-bold text-p4g-ink-soft">调整点数</span></div>
          <div className="grid grid-cols-1 gap-2">
            {ATTR_IDS.map((a) => (
              <div key={a} className="flex min-w-0 items-center justify-between gap-3 border-b-2 border-dashed border-p4g-line/30 pb-2">
                <span className="min-w-0 truncate font-display text-body font-bold text-p4g-ink">{ATTR_NAMES[a]}</span>
                <P4Stepper value={analyzed[a]} min={0} max={5} onChange={(v) => setAnalyzed((p) => (p ? { ...p, [a]: v } : p))} label={`${ATTR_NAMES[a]}点数`} />
              </div>
            ))}
          </div>
        </div>
      )}
    </P4Sheet>
  );
}
