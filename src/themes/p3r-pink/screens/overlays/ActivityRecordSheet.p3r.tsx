/**
 * 记录一件事（新增 / 补录抽屉）—— 真实 src/pages/Activities.tsx（SheetModal showInput，p3 = p3-modal-03 稿：字段 / 步进器换装，按钮与节标斜切）。
 * 控件：描述「描述你刚才做了什么...」、⭐ 这很重要、AttachChip「读图代打字」（正在读图…）/「附一张图」（已附 N 张 / 处理中…）/ 移除这张图 /「＋ 顺便把这张截图附上」+ 截图多条候选勾选、
 *       「分析关键词」→「✦ AI 分析」（⋯ AI 思考中）、挂愿望（可不选；挂上后会计入那个愿望的进度）、「关键词分析」+「调整点数」五维 Stepper、「保存记录」。
 * 直达：?variant=backdate（补录：带日期）；?step=analyzed（分析后）；?step=reading（读图中）；?step=ai（AI 思考中）。
 */
import { useEffect, useRef, useState } from 'react';
import type { AttributeId } from '@real/types';
import type { OverlayProps } from '@pink/registry/types';
import { P3Button, P3Check, P3Sheet, P3Stepper, P3Textarea, useToast, P3R, slantClip, tickClip, IconClose } from '@pink/kit';
import { AIThinking } from '@pink/fx';
import { ATTR_IDS, ATTR_NAMES, KEYWORD_RESULT, SPARE_IMAGES, WISHES } from '@pink/mock/pkg2';
import { MiniHead, Photo } from '@pink/screens/pkg2/common';

export interface RecordSavePayload { description: string; points: Record<AttributeId, number>; important: boolean; images: string[]; backdate?: string; wishId?: string }

/** 附件条小按钮（真实 AttachChip p3：斜切 6，active 玫红 / 否则 12% 玫红面） */
const AttachChip = ({ icon, label, onClick, disabled, active }: { icon: string; label: string; onClick?: () => void; disabled?: boolean; active?: boolean }) => (
  <button type="button" onClick={onClick} disabled={disabled} className="inline-flex items-center gap-1 whitespace-nowrap px-3 py-1.5 text-[12px] font-black leading-none active:scale-95 disabled:opacity-50"
    style={{ clipPath: slantClip(6), background: active ? P3R.blue : 'rgb(var(--p3r-blue-rgb) / 0.12)', color: active ? P3R.onBlue : P3R.ink }}>
    <span aria-hidden>{icon}</span>{label}
  </button>
);

/** 挂到愿望（真实 WishMountPicker）：横滑斜切 chip，单选可取消 */
export function WishMountPicker({ value, onChange, compact }: { value?: string; onChange: (id: string | undefined) => void; compact?: boolean }) {
  const active = WISHES.filter((w) => w.status === 'active' && !w.parentId);
  if (!active.length) return null;
  return (
    <div className="space-y-1.5">
      {!compact && <div className="text-[13px] font-black" style={{ color: P3R.ink }}>挂到愿望 <span className="text-[12px] font-bold" style={{ color: P3R.grey }}>可不选；挂上后会计入那个愿望的进度</span></div>}
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {active.map((w) => {
          const on = value === w.id;
          return (
            <button key={w.id} type="button" aria-pressed={on} onClick={() => onChange(on ? undefined : w.id)} className="shrink-0 whitespace-nowrap px-3.5 py-1.5 text-[12px] font-black"
              style={{ clipPath: slantClip(7), background: on ? P3R.ink : P3R.cyanFaint, color: on ? 'var(--p3r-on-ink)' : P3R.ink }}>
              {on ? '✓ ' : '✧ '}{w.title.length > 12 ? `${w.title.slice(0, 12)}…` : w.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ActivityRecordSheet({ open, onClose, params, backdate, onSave }: OverlayProps & { backdate?: string | null; onSave?: (p: RecordSavePayload) => void }) {
  const toast = useToast();
  const bd = backdate ?? (params?.get('variant') === 'backdate' ? '2026-10-17' : null);
  const [desc, setDesc] = useState('');
  const [important, setImportant] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [imgBusy, setImgBusy] = useState(false);
  const [shotBusy, setShotBusy] = useState(false);
  const [shotHint, setShotHint] = useState<string | null>(null);
  const [shotOffer, setShotOffer] = useState<string | null>(null);
  const [shotCandidates, setShotCandidates] = useState<{ text: string; on: boolean }[] | null>(null);
  const [analyzed, setAnalyzed] = useState<Record<AttributeId, number> | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiReason, setAiReason] = useState<string | null>(null);
  const [wish, setWish] = useState<string | undefined>();
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const readShot = () => {
    setShotBusy(true); setShotHint(null);
    later(() => {
      setShotBusy(false);
      setShotCandidates([{ text: '跑步 5.2 公里，配速 6\'10"', on: true }, { text: '拉伸 15 分钟', on: true }, { text: '喝水 2L', on: false }]);
      setShotOffer('chushu.webp');
      setDesc('跑步 5.2 公里，配速 6\'10"；拉伸 15 分钟');
      setShotHint('已回填，勾掉不要的那几条，再点「分析关键词」给分');
    }, 1300);
  };
  const ai = () => {
    setAiBusy(true);
    later(() => { setAiBusy(false); setAnalyzed({ knowledge: 2, guts: 1, dexterity: 0, kindness: 2, charm: 0 }); setAiReason('读书算知识；主动给同桌讲题是在照顾别人，给温柔；坚持去图书馆也要一点胆量。'); }, 2400);
  };
  useEffect(() => {
    if (!open) return;
    const st = params?.get('step');
    if (st === 'analyzed' || st === 'ai') { setDesc('在图书馆把第 4 章读完了，还帮同桌讲了两道题'); setAnalyzed({ ...KEYWORD_RESULT }); setImages(['bailu.webp']); }
    if (st === 'ai') ai();
    if (st === 'reading') readShot();
  }, [open]); // eslint-disable-line

  const reset = () => { setDesc(''); setImportant(false); setImages([]); setAnalyzed(null); setAiReason(null); setShotHint(null); setShotOffer(null); setShotCandidates(null); setWish(undefined); };
  const attach = () => {
    if (images.length >= 6) { toast('每条记录最多 6 张'); return; }
    setImgBusy(true);
    later(() => { setImgBusy(false); setImages((v) => [...v, SPARE_IMAGES[v.length % SPARE_IMAGES.length]]); }, 700);
  };
  const save = () => {
    if (imgBusy) { toast('图片还在处理，稍等一下再保存'); return; }
    if (!desc.trim()) { toast.error('先写下你做了什么'); return; }
    const p = analyzed ?? { ...KEYWORD_RESULT };
    if (onSave) onSave({ description: desc.trim(), points: p, important, images, backdate: bd ?? undefined, wishId: wish });
    else toast.success('记录成功');
    reset(); onClose();
  };

  return (
    <P3Sheet open={open} onClose={onClose} title={bd ? `记录一件事 · ${bd.slice(5).replace('-', '/')}` : '记录一件事'} en={bd ? 'BACKDATE' : 'NEW LOG'} size="tall"
      footer={
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setImportant((v) => !v)} aria-pressed={important} className="flex h-11 shrink-0 items-center gap-1 px-4 text-[14px] font-black"
            style={{ clipPath: slantClip(9), background: important ? P3R.gold : P3R.cyanFaint, color: important ? 'var(--p3r-mulberry)' : P3R.ink }}>
            <span aria-hidden>{important ? '★' : '☆'}</span> 这很重要
          </button>
          <P3Button block size="md" corner onClick={save} ariaLabel="保存记录">保存记录</P3Button>
        </div>
      }>
      {bd && (
        <div className="mb-3 inline-flex items-center gap-2 px-3 py-1" style={{ background: P3R.ink, clipPath: slantClip(6) }}>
          <span className="font-cond text-[13px]" style={{ color: 'var(--p3r-on-ink)' }}>补录 · {bd.replace(/-/g, '/')}</span>
          <span aria-hidden className="h-[8px] w-[10px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
        </div>
      )}
      <P3Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="描述你刚才做了什么..." rows={4} aria-label="描述你刚才做了什么" />

      <div className="mt-3 flex flex-wrap gap-2">
        <AttachChip icon="✎" label={shotBusy ? '正在读图…' : '读图代打字'} onClick={shotBusy ? undefined : readShot} disabled={shotBusy} active={shotBusy} />
        <AttachChip icon="▣" label={imgBusy ? '处理中…' : images.length ? `已附 ${images.length} 张` : '附一张图'} onClick={imgBusy ? undefined : attach} disabled={imgBusy} active={images.length > 0} />
      </div>
      {shotBusy && <AIThinking className="mt-3" label="正在读图…" sub="从截图里认出你做了什么" />}
      {shotHint && <p className="mt-2 text-[12px] font-bold" style={{ color: P3R.roseInk }}>▶ {shotHint}</p>}
      {shotCandidates && (
        <div className="mt-2 space-y-1.5 px-4 py-2.5" style={{ background: P3R.cyanFaint, clipPath: slantClip(9) }}>
          {shotCandidates.map((c, i) => (
            <P3Check key={i} checked={c.on} onChange={() => setShotCandidates((rows) => rows && rows.map((r, j) => (j === i ? { ...r, on: !r.on } : r)))} label={c.text} />
          ))}
        </div>
      )}
      {images.length > 0 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <div key={i} className="relative h-20 w-20 shrink-0 overflow-hidden" style={{ clipPath: slantClip(7) }}>
              <Photo src={src} />
              <button type="button" aria-label="移除这张图" onClick={() => setImages((v) => v.filter((_, j) => j !== i))} className="absolute right-0.5 top-0.5 flex h-6 w-7 items-center justify-center" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(4) }}><IconClose size={11} /></button>
            </div>
          ))}
        </div>
      )}
      {shotOffer && !images.includes(shotOffer) && (
        <button type="button" onClick={() => { setImages((v) => [...v, shotOffer]); setShotOffer(null); }} className="mt-2 text-[13px] font-black underline decoration-2 underline-offset-4" style={{ color: P3R.roseInk }}>＋ 顺便把这张截图附上</button>
      )}

      <div className="mt-4 flex justify-center">
        {!analyzed ? (
          <P3Button tone="ink" size="lg" disabled={!desc.trim()} onClick={() => setAnalyzed({ ...KEYWORD_RESULT })} ariaLabel="分析关键词" className="px-10">分析关键词</P3Button>
        ) : (
          <P3Button tone="outline" size="lg" disabled={!desc.trim()} busy={aiBusy} busyText="⋯ AI 思考中" onClick={ai} ariaLabel="AI 分析" className="px-10">✦ AI 分析</P3Button>
        )}
      </div>
      {aiReason && (
        <div className="mt-3 px-4 py-2.5 text-[13px] leading-relaxed" style={{ background: P3R.cyanFaint, color: P3R.ink, clipPath: slantClip(9) }}>
          <span className="mr-1 font-cond" style={{ color: P3R.roseInk }}>AI ›</span>{aiReason}
        </div>
      )}

      {analyzed && (
        <div className="mt-5 space-y-3">
          <WishMountPicker value={wish} onChange={setWish} />
          <MiniHead title="关键词分析" en="ANALYSIS" right={<span className="text-[12px] font-bold" style={{ color: P3R.grey }}>调整点数</span>} />
          <div className="grid grid-cols-1 gap-1.5">
            {ATTR_IDS.map((a) => (
              <div key={a} className="flex min-w-0 items-center justify-between gap-3 px-4 py-1.5" style={{ background: 'var(--p3r-row)', clipPath: slantClip(8) }}>
                <span className="min-w-0 truncate text-[15px] font-black" style={{ color: P3R.ink }}>{ATTR_NAMES[a]}</span>
                <P3Stepper value={analyzed[a]} min={0} max={5} onChange={(v) => setAnalyzed((p) => (p ? { ...p, [a]: v } : p))} />
              </div>
            ))}
          </div>
        </div>
      )}
    </P3Sheet>
  );
}
