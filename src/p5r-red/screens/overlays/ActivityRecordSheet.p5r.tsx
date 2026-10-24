/**
 * 记录一件事 / 补录历史记录（真实 src/pages/Activities.tsx 的 SheetModal showInput，P1-01）。红频道 = kit P5Sheet（红闸门 + 纸面）。
 * 结构照真实：描述框（框内底部附件条：📷 读图代打字〔配视觉档才出现〕/ 🖼 附一张图）→ 待存配图缩略图（× 移除这张图）→ 读图提示 + 拾取筹码
 *   →「分析关键词」（p5-modal-03：黑长条 + 白字 + 右端灰星，黑硬影错位；空描述 = 纯灰面）→ 分析后变「✦ AI 分析 / ⋯ AI 思考中」
 *   → AI 解释逐字出现（red-ai-record）/ AI 分析失败 → 挂到愿望（WishMountPicker）+ 调整点数（每属性步进器 0–5）
 *   → 底栏「⭐ 这很重要」+「保存记录」→ SaveSuccessModal（TodoCompleteP5 heading=记录成功，可带解锁提示）→ STAT UP。
 * 直达（?step=）：input（默认）| backdate | shot-busy | shot-ok | shot-empty | shot-fail | img-busy | img-wait | analyzed | ai-thinking | ai-done | ai-error | novision
 *   red-ai-record：?step=ai-play（填好 → 自动点分析 → AI 思考中 → 逐字）。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Sheet } from '@/p5r-red/kit/P5Sheet';
import { P5Stepper } from '@/p5r-red/kit/P5Stepper';
import { P5Button } from '@/p5r-red/kit/P5Button';
import { TypeOut } from '@/p5r-red/fx/TypeOut';
import { roughSlant, starPts } from '@/p5r-red/kit/p5r';
import { ATTR, ATTR_ORDER, D, type AttrId } from '@/p5r-red/mock/data';
import { playSaveSuccess } from './SaveSuccessModal.p5r';
import { playStatUp } from './ActivitiesStatUp.p5r';
import { useAppStore } from '@/store';
import { analyzeActivityAI } from '@/utils/activityAI';
import { extractActivitiesFromImage, VISION_UNCONFIGURED } from '@/utils/visionIntake';
import { readAsDataUrl, downscaleDataUrl } from '@/utils/imageCrop';
import '../pkg5.p5r.css';

const MAX_IMAGES = 3;
const RULES: [RegExp, AttrId][] = [[/书|学|自习|考|单词|读|课/, 'knowledge'], [/跑|健身|面试|勇|挑战|击破/, 'guts'], [/菜|做|吉他|画|修|手/, 'dexterity'], [/帮|妈|陪|照顾|搬家|志愿/, 'kindness'], [/社团|聚会|穿搭|演讲|约/, 'charm']];
const analyzeLocal = (s: string): Partial<Record<AttrId, number>> => {
  const out: Partial<Record<AttrId, number>> = {};
  RULES.forEach(([re, a]) => { if (re.test(s)) out[a] = 2; });
  return Object.keys(out).length ? out : { knowledge: 1 };
};
const AI_REASON = '这件事值 3 点：连续三小时的专注学习，知识 +3。它更像在为「期末考试全科通过」铺路，挂到相关愿望下会计入进度。';
const fakeThumb = (i: number) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" fill="${['#D7000F', '#111', '#8e0010'][i % 3]}"/><polygon points="${starPts(28, 30, 18)}" fill="#F2E9DA"/></svg>`)}`;

/** 附件小按钮（AttachChip p5：黑条纸字，active = 红） */
function AttachChip({ icon, label, onClick, disabled, active, seed }: { icon: string; label: string; onClick: () => void; disabled?: boolean; active?: boolean; seed: number }) {
  return (
    <button type="button" className={`ar-chip${active ? ' on' : ''}`} onClick={onClick} disabled={disabled}>
      <span aria-hidden="true" className="ar-chip-sh" style={{ clipPath: roughSlant(seed, 10, 2) }} />
      <span aria-hidden="true" className="ar-chip-fc" style={{ clipPath: roughSlant(seed + 1, 10, 2) }} />
      <span className="ar-chip-t"><span aria-hidden="true">{icon}</span> {label}</span>
    </button>
  );
}

export interface RecordSheetProps { open: boolean; onClose: () => void; step?: string; backdate?: string | null; vision?: boolean; onSaved?: (desc: string, pts: Partial<Record<AttrId, number>>, important: boolean) => void }

export function ActivityRecordSheet({ open, onClose, step = 'input', backdate = null, vision = true, onSaved }: RecordSheetProps) {
  const pre = step !== 'input' && step !== 'backdate' && step !== 'novision' && step !== 'ai-play';
  const [desc, setDesc] = useState(pre ? '图书馆自习三小时，把线代第四章刷完' : '');
  const [shotBusy, setShotBusy] = useState(step === 'shot-busy');
  const [shotHint, setShotHint] = useState<string | null>(step === 'shot-ok' ? '已回填，点「分析」给分' : step === 'shot-empty' ? '这张截图里没读出可入档的事——换一张试试' : step === 'shot-fail' ? '解析失败，稍后再试' : null);
  const [picks, setPicks] = useState<{ text: string; attribute?: AttrId }[] | null>(step === 'shot-ok' ? [{ text: '背单词 120 个', attribute: 'knowledge' }, { text: '跑步 5.2 公里', attribute: 'guts' }] : null);
  const [lastShot, setLastShot] = useState<string | null>(step === 'shot-ok' ? fakeThumb(2) : null);
  const [imgs, setImgs] = useState<string[]>(step === 'img-busy' || step === 'img-wait' || step === 'analyzed' ? [fakeThumb(0)] : []);
  const [imgBusy, setImgBusy] = useState(step === 'img-busy' || step === 'img-wait');
  const [imgHint, setImgHint] = useState<string | null>(step === 'img-wait' ? '图片还在处理，稍等一下再保存' : null);
  const analyzedInit = ['analyzed', 'ai-thinking', 'ai-done', 'ai-error', 'img-wait'].includes(step);
  const [points, setPoints] = useState<Partial<Record<AttrId, number>> | null>(analyzedInit ? { knowledge: 3 } : null);
  const [aiBusy, setAiBusy] = useState(step === 'ai-thinking');
  const [aiReason, setAiReason] = useState<string | null>(step === 'ai-done' ? AI_REASON : null);
  const [aiError, setAiError] = useState<string | null>(step === 'ai-error' ? '连接失败（网络超时），请稍后再试' : null);
  const [wish, setWish] = useState<string | undefined>(undefined);
  const [important, setImportant] = useState(false);
  const timers = useRef<number[]>([]);
  const shotInput = useRef<HTMLInputElement>(null);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const readShot = () => shotInput.current?.click();
  const readShotFile = async (file: File) => {
    setShotBusy(true); setShotHint(null);
    try {
      const dataUrl = await downscaleDataUrl(await readAsDataUrl(file));
      const settings = useAppStore.getState().settings;
      const items = await extractActivitiesFromImage(dataUrl, settings, settings.attributeNames);
      if (!items.length) {
        setShotHint('这张图里没有读出可入档的活动，请手动填写');
        return;
      }
      setDesc((current) => [current, ...items.map((item) => item.text)].filter(Boolean).join('\n'));
      setPicks(items.map((item) => ({ text: item.text, attribute: item.attribute ?? undefined })));
      setLastShot(dataUrl);
      setShotHint('视觉模型已回填，点「分析」给分');
    } catch (error) {
      const message = error instanceof Error ? error.message : '读图失败';
      setShotHint(message === VISION_UNCONFIGURED ? VISION_UNCONFIGURED : `读图失败：${message}`);
    } finally {
      setShotBusy(false);
    }
  };
  const attach = () => {
    setImgBusy(true); setImgHint(null);
    later(() => { setImgBusy(false); setImgs((a) => [...a, fakeThumb(a.length)].slice(0, MAX_IMAGES)); }, 1100);
  };
  const analyze = () => { if (!desc.trim()) return; setPoints(analyzeLocal(desc)); };
  const analyzeAI = async () => {
    if (!desc.trim() || aiBusy) return;
    setAiBusy(true); setAiError(null); setAiReason(null);
    try {
      const settings = useAppStore.getState().settings;
      const result = await analyzeActivityAI(desc.trim(), settings.attributeNames, settings);
      setPoints(result.points as Partial<Record<AttrId, number>>);
      setAiReason(result.reason || AI_REASON);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : '分析失败，请重试');
    } finally {
      setAiBusy(false);
    }
  };
  // red-ai-record：自动演一遍
  useEffect(() => {
    if (!open || step !== 'ai-play') return;
    let i = 0; const txt = '图书馆自习三小时，把线代第四章刷完';
    const iv = window.setInterval(() => { i += 2; setDesc(txt.slice(0, i)); if (i >= txt.length) { clearInterval(iv); later(() => setPoints(analyzeLocal(txt)), 300); later(analyzeAIRef.current, 900); } }, 40);
    return () => clearInterval(iv);
  }, [open, step]); // eslint-disable-line react-hooks/exhaustive-deps
  const analyzeAIRef = useRef(analyzeAI); analyzeAIRef.current = analyzeAI;

  const save = () => {
    if (imgBusy) { setImgHint('图片还在处理，稍等一下再保存'); return; }
    const pts = Object.fromEntries(Object.entries(points ?? {}).filter(([, v]) => (v ?? 0) > 0)) as Partial<Record<AttrId, number>>;
    const total = Object.values(pts).reduce((a, b) => a + (b ?? 0), 0);
    onClose();
    onSaved?.(desc, pts, important);
    setTimeout(() => playSaveSuccess({ title: desc || '一件小事', points: total, unlock: total >= 3, onClose: () => { if (total > 0) playStatUp(pts); } }), 260);
  };

  const pointRows = useMemo(() => ATTR_ORDER.map((a) => [a, points?.[a] ?? 0] as const), [points]);
  const hasDesc = !!desc.trim();

  return (
    <P5Sheet open={open} onClose={onClose} title={backdate ? '补录历史记录' : '记录一件事'} seed={41} className="ar-sheet">
      {backdate && <p className="ar-backdate"><span aria-hidden="true">▣</span> 记录日期：{backdate.replace(/-/g, '/')}</p>}
      <div className="ar-box">
        <textarea className="inp ar-ta" rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="描述你刚才做了什么..." aria-label="描述你刚才做了什么" />
        <div className="ar-tools">
          <input ref={shotInput} type="file" accept="image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void readShotFile(file); }} />
          {vision && <AttachChip icon="◉" label={shotBusy ? '正在读图…' : '读图代打字'} disabled={shotBusy} onClick={readShot} seed={31} />}
          <AttachChip icon="▣" label={imgBusy ? '处理中…' : imgs.length ? `已附 ${imgs.length} 张` : '附一张图'} active={imgs.length > 0} disabled={imgBusy || imgs.length >= MAX_IMAGES} onClick={attach} seed={57} />
        </div>
      </div>
      {(imgs.length > 0 || imgHint) && (
        <div className="ar-imgs">
          {imgs.length > 0 && <div className="ar-thumbs">{imgs.map((src, i) => (
            <span key={i} className="ar-thumb"><img src={src} alt="" /><button type="button" aria-label="移除这张图" onClick={() => setImgs((a) => a.filter((_, j) => j !== i))}>×</button></span>
          ))}</div>}
          {imgHint && <p className="p5k-hint">{imgHint}</p>}
        </div>
      )}
      {vision && (shotHint || lastShot || picks) && (
        <div className="ar-shot">
          {shotHint && <p className="p5k-hint">{shotHint}</p>}
          {lastShot && imgs.length < MAX_IMAGES && !imgs.includes(lastShot) && <button type="button" className="od-chip" onClick={() => setImgs((a) => [...a, lastShot].slice(0, MAX_IMAGES))}>＋ 顺便把这张截图附上</button>}
          {picks && <div className="ar-picks">{picks.map((it, i) => (
            <button key={i} type="button" className="od-chip on" onClick={() => { setDesc((d) => (d ? d + '\n' : '') + it.text); setPicks((p) => { const r = (p ?? []).filter((_, j) => j !== i); return r.length ? r : null; }); }}>＋ {it.text}{it.attribute ? ` · ${ATTR[it.attribute].name}` : ''}</button>
          ))}</div>}
        </div>
      )}

      {!points ? (
        <button type="button" className="ar-analyze" disabled={!hasDesc} onClick={analyze} aria-label="分析关键词">
          <span aria-hidden="true" className="ar-an-sh" style={{ clipPath: roughSlant(451, 14, 3) }} />
          <span aria-hidden="true" className="ar-an-fr" style={{ clipPath: roughSlant(451, 14, 3) }} />
          <span aria-hidden="true" className="ar-an-fc" style={{ clipPath: roughSlant(452, 13, 2.5), background: hasDesc ? '#050505' : '#6b6862' }} />
          <span className="ar-an-t">分析关键词</span>
          <svg viewBox="0 0 100 100" className="ar-an-star" aria-hidden="true"><polygon points={starPts(50, 50, 48)} fill="#9b9791" stroke="var(--p5r-paper)" strokeWidth="6" strokeLinejoin="miter" /></svg>
        </button>
      ) : (
        <button type="button" className="ar-analyze ai" disabled={!hasDesc || aiBusy} onClick={analyzeAI} aria-label="AI 分析">
          <span aria-hidden="true" className="ar-an-sh" style={{ clipPath: roughSlant(461, 14, 3) }} />
          <span aria-hidden="true" className="ar-an-fr" style={{ clipPath: roughSlant(461, 14, 3) }} />
          <span aria-hidden="true" className="ar-an-fc" style={{ clipPath: roughSlant(462, 13, 2.5) }} />
          <span className="ar-an-t">{aiBusy ? <>⋯ AI 思考中<i className="ar-dots"><b>.</b><b>.</b><b>.</b></i></> : '✦ AI 分析'}</span>
        </button>
      )}
      {aiError && <div className="ar-ai err">AI 分析失败：{aiError}</div>}
      {!aiError && aiReason && <div className="ar-ai"><b>AI:</b><TypeOut key={aiReason} text={aiReason} cps={30} /></div>}

      {points && (
        <div className="ar-result">
          <div className="ar-wish">
            <div className="ar-k">挂到愿望 <small>可不选；挂上后会计入那个愿望的进度</small></div>
            <div className="ar-wish-row">{D.wishes.filter((w) => w.status === 'active').map((w) => (
              <button key={w.title} type="button" className={`od-chip${wish === w.title ? ' on' : ''}`} aria-pressed={wish === w.title} onClick={() => setWish(wish === w.title ? undefined : w.title)}>{wish === w.title ? '✓ ' : ''}{w.title}</button>
            ))}</div>
          </div>
          <div className="ar-k">调整点数</div>
          {pointRows.map(([a, v]) => (
            <div key={a} className="ar-pt"><span>{ATTR[a].name}</span><P5Stepper value={v} min={0} max={5} onChange={(n) => setPoints((p) => ({ ...p, [a]: n }))} label={`${ATTR[a].name}点数`} /></div>
          ))}
          <div className="ar-foot">
            <label className="ar-imp"><input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} /><i aria-hidden="true" />★ 这很重要</label>
            <P5Button tone="red" size="lg" seed={503} onClick={save}>保存记录</P5Button>
          </div>
        </div>
      )}
    </P5Sheet>
  );
}

export default function ActivityRecordSheetPreview({ open, onClose, params }: OverlayProps) {
  const step = params?.get('step') ?? 'input';
  return <ActivityRecordSheet open={open} onClose={onClose} step={step} backdate={step === 'backdate' ? (() => { const d = new Date(); d.setDate(d.getDate() - 2); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })() : null} vision={step !== 'novision'} />;
}
