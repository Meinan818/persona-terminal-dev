/**
 * 新建 / 编辑倒计时 CallingCardEditor（真实 src/components/callingCard/CallingCardEditor.tsx；红频道 = kit P5Sheet 纸面抽屉，v3 d.js openCCEditor 版式）。
 * pkg5 React 版（受控组件）。调用方：pkg5 宣告卡页 / 倒计时区块用 named export；pkg4 registry 'actions-cc-editor'（?step=new|edit）用 default export。
 * 字段 / 文案照真实：模式（日期 / 任务清单 / 兼有 + 说明）→ 标题（例如 高考 / 婚礼 / v3 上线）→ 宣告台词（可选）
 *   → 日期（起算日 / 目标日；「起算日不能晚于目标日」「目标日不能早于今天」；共 N 天 · 还剩 N 天 · 已征途 N 天）
 *   → 关联任务（已选 N / 7；每组 4 条，‹ 上一组 / 下一组 ›；无任务 =「还没有活跃任务。先到上方"任务"区添加，再回来选。」）
 *   → 纹理 / 图标（斜纹 网格 点阵 纯色 + 8 图标）→ 卡面预览 → 📌 钉到首页（会替换当前已钉选的另一张卡 / 在 HERO 卡片上常驻显示这张卡）
 *   → 「✦ 立此宣告」/「保存修改」（canSave = 标题 + 日期合法 + 需任务时至少一项；不可存 = 纯灰面）。
 * 直达：?mode=edit  ?step=todos|both|date-err|past-err|notodo|max
 */
import { useEffect, useMemo, useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Sheet } from '@/p5r-red/kit/P5Sheet';
import { P5Seg } from '@/p5r-red/kit/P5Seg';
import { P5Button } from '@/p5r-red/kit/P5Button';
import { P5Switch } from '@/p5r-red/kit/P5Switch';
import { P5Tag } from '@/p5r-red/kit/P5Tag';
import { toast } from '@/p5r-red/kit/P5Toast';
import { CC_TODOS, localKey, type MockCC } from '@/p5r-red/mock/pkg5-data';
import { CCLetter, type CCTexture } from './CallingCardLetter.p5r';
import '../pkg5.p5r.css';

const ICONS = ['★', '✦', '☾', '♛', '⚑', '✎', '♪', '⚡']; // = v3 d.js openCCEditor 图标组（真实：✦ ⚔️ 🦋 🔥 ◈ ✧ 🎯 🏔️，彩色 emoji 在红频道换成 v3 已验收的单色符号）
const TEX: { id: CCTexture; label: string }[] = [{ id: 'lines', label: '斜纹' }, { id: 'grid', label: '网格' }, { id: 'dots', label: '点阵' }, { id: 'plain', label: '纯色' }];
const TODOS_MAX = 7;
type Mode = 'deadline' | 'todos' | 'both';
const HINT: Record<Mode, string> = { deadline: '只看日期：到那天自动归档（"时之至"）', todos: '只看任务：选定项全部完成时自动归档（"达成"）', both: '两条都设：先到的为准（先做完所有任务 / 先到日子）' };
const off = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return localKey(d); };

export function CallingCardEditor({ open, onClose, initial, otherPinned = true, step, onSaved }: { open: boolean; onClose: () => void; initial?: MockCC | null; otherPinned?: boolean; step?: string; onSaved?: (c: Partial<MockCC>, isNew: boolean) => void }) {
  const [mode, setMode] = useState<Mode>('deadline');
  const [title, setTitle] = useState('');
  const [line, setLine] = useState('');
  const [start, setStart] = useState(off(0));
  const [target, setTarget] = useState(off(17));
  const [linked, setLinked] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [tex, setTex] = useState<CCTexture>('lines');
  const [icon, setIcon] = useState('★');
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    if (!open) return;
    setMode(initial?.mode ?? (step === 'todos' || step === 'notodo' || step === 'max' ? 'todos' : step === 'both' ? 'both' : 'deadline'));
    setTitle(initial?.title ?? (step ? '期末考试全科通过' : '')); setLine(initial?.subtitle ?? '');
    setStart(initial?.startDate ?? (step === 'date-err' ? off(20) : off(0))); setTarget(initial?.targetDate ?? (step === 'past-err' ? off(-3) : off(17)));
    setLinked(step === 'max' ? CC_TODOS.map((t) => t.id) : step === 'both' ? ['t1', 't2'] : initial?.mode === 'both' ? ['t1', 't4', 't6'] : initial?.mode === 'todos' ? ['t6', 't7'] : []);
    setPage(0); setTex(initial?.texture ?? 'lines'); setIcon(initial?.icon ?? '★'); setPinned(!!initial?.pinned);
  }, [open, initial, step]);

  const todos = step === 'notodo' ? [] : CC_TODOS;
  const needsDate = mode !== 'todos', needsTodos = mode !== 'deadline';
  const today = off(0);
  const startOk = !needsDate || (!!start && (!target || start <= target));
  const dateOk = !needsDate || (!!target && target >= today && target >= start);
  const canSave = !!title.trim() && startOk && dateOk && (!needsTodos || linked.length > 0);
  const prev = useMemo(() => {
    if (!needsDate || !target || !start) return null;
    const t0 = +new Date(today + 'T00:00'), s = +new Date(start + 'T00:00'), t = +new Date(target + 'T00:00');
    return { total: Math.max(1, Math.round((t - s) / 864e5)), elapsed: Math.max(0, Math.round((t0 - s) / 864e5)), left: Math.max(0, Math.round((t - t0) / 864e5)) };
  }, [needsDate, start, target, today]);
  const pages = Math.max(1, Math.ceil(todos.length / 4));
  const toggle = (id: string) => setLinked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= TODOS_MAX ? (toast(`最多 ${TODOS_MAX} 项`), p) : [...p, id]));
  const save = () => { if (!canSave) return; onSaved?.({ title: title.trim(), subtitle: line.trim() || undefined, mode, startDate: start, targetDate: target, texture: tex, icon, pinned, todosDone: 0, todosTotal: needsTodos ? linked.length : undefined }, !initial); onClose(); if (initial) toast('已保存'); };

  return (
    <P5Sheet open={open} onClose={onClose} title={initial ? '编辑倒计时' : '新建倒计时'} seed={73} className="cce">
      <div className="fld"><span>模式</span><P5Seg items={[{ id: 'deadline', label: '日期' }, { id: 'todos', label: '任务清单' }, { id: 'both', label: '兼有' }]} value={mode} onChange={setMode} /><p className="p5k-hint">{HINT[mode]}</p></div>
      <label className="fld"><span>标题</span><input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如 高考 / 婚礼 / v3 上线" maxLength={30} /></label>
      <label className="fld"><span>宣告台词（可选）</span><input className="inp" value={line} onChange={(e) => setLine(e.target.value)} placeholder="命运在此倾覆 / 我宣告 …" maxLength={40} /></label>
      {needsDate && (
        <div className="fld"><span>日期</span>
          <div className="od-cce-dates">
            <label className="cce-d"><small>起算日</small><input className="inp" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
            <label className="cce-d"><small>目标日</small><input className="inp" type="date" value={target} onChange={(e) => setTarget(e.target.value)} /></label>
          </div>
          {!startOk && <p className="p5k-err">起算日不能晚于目标日</p>}
          {startOk && !dateOk && <p className="p5k-err">目标日不能早于今天</p>}
          {prev && startOk && dateOk && <p className="od-cce-days">共 <b>{prev.total}</b> 天 · 还剩 <b>{prev.left}</b> 天 · 已征途 <b>{prev.elapsed}</b> 天</p>}
        </div>
      )}
      {needsTodos && (
        <div className="fld"><span>关联任务（已选 {linked.length} / {TODOS_MAX}）</span>
          {todos.length === 0 ? <p className="p5k-hint">还没有活跃任务。先到上方"任务"区添加，再回来选。</p> : <>
            <div className="od-cce-list">{todos.slice(page * 4, page * 4 + 4).map((t) => {
              const on = linked.includes(t.id);
              return <button key={t.id} type="button" className={`od-cce-t${on ? ' on' : ''}`} aria-pressed={on} onClick={() => toggle(t.id)}><i>{on ? '✓' : ''}</i><b>{t.title}</b><P5Tag tone={t.kind === '每日' ? '' : 'ink'}>{t.kind}</P5Tag></button>;
            })}</div>
            {pages > 1 && <div className="od-cce-pg"><P5Button tone="ink" size="sm" seed={711} disabled={page === 0} onClick={() => setPage(page - 1)}>‹ 上一组</P5Button><P5Button tone="ink" size="sm" seed={712} disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>下一组 ›</P5Button></div>}
          </>}
        </div>
      )}
      <div className="fld"><span>纹理 / 图标</span>
        <P5Seg items={TEX.map((t) => ({ id: t.id, label: t.label }))} value={tex} onChange={setTex} />
        <div className="od-cce-ic">{ICONS.map((g) => <button key={g} type="button" aria-pressed={icon === g} aria-label={`图标 ${g}`} onClick={() => setIcon(g)}>{g}</button>)}</div>
      </div>
      <div className="od-cce-pv"><CCLetter title={title || '新的宣言'} line={line || undefined} texture={tex} icon={icon} /></div>
      <div className="p5k-row"><div><b>钉到首页</b><small>{pinned && otherPinned && !initial?.pinned ? '会替换当前已钉选的另一张卡' : '在 HERO 卡片上常驻显示这张卡'}</small></div><P5Switch on={pinned} onChange={setPinned} label="钉到首页" /></div>
      <div className="p5k-acts full"><P5Button tone="red" size="lg" seed={714} disabled={!canSave} className={canSave ? '' : 'cce-off'} onClick={save}>{initial ? '保存修改' : '✦ 立此宣告'}</P5Button></div>
    </P5Sheet>
  );
}

export default function CallingCardEditorPreview({ open, onClose, params }: OverlayProps) {
  const edit = params?.get('mode') === 'edit' || params?.get('step') === 'edit';
  const init: MockCC | null = edit ? { id: 'cc1', title: '期末考试全科通过', subtitle: '偷走懒惰之心', icon: '★', texture: 'lines', mode: 'deadline', startDate: off(-5), targetDate: off(12), pinned: true } : null;
  const step = params?.get('step');
  return <CallingCardEditor open={open} onClose={onClose} initial={init} step={step && step !== 'new' && step !== 'edit' ? step : undefined} />;
}
