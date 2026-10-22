/**
 * 新建 / 编辑倒计时（宣告卡编辑器，真实 src/components/callingCard/CallingCardEditor.tsx）：
 * 标题「新建倒计时 / 编辑倒计时」；「模式」日期 / 任务清单 / 兼有（三句说明）；「标题」（例如 高考 / 婚礼 / v3 上线）；「宣告台词（可选）」；
 * 「日期」起算日 / 目标日（校验「起算日不能晚于目标日」「目标日不能早于今天」+ 共 N 天 · 还剩 · 已征途）；
 * 「关联任务（已选 N / M）」勾选、「‹ 上一组」「下一组 ›」；「纹理 / 图标」斜纹 / 网格 / 点阵 / 纯色 + 图标；「📌 钉到首页」开关（说明）；「✦ 立此宣告 / 保存修改」。
 * ?variant=edit 编辑态；?state=invalid 目标日早于今天的校验态。
 */
import { useEffect, useState, type ReactNode } from 'react';
import type { CallingCard, CallingCardTone } from '@real/types';
import type { OverlayProps } from '@blue/registry/types';
import { P3Button, P3Check, P3ConfigRow, P3Input, P3OnOff, P3Segment, P3Sheet, useToast, P3R, slantClip, tickClip, Glyph } from '@blue/kit';
import { CALLING_CARDS, TODAY_KEY, TODOS } from '@blue/mock/pkg2';
import { daysBetween, toneBg } from '@blue/screens/pkg2/common';

const ICONS = ['✦', '◆', '★', '❖', '◈', '✧', '♥', '☾'];
const TONES: { id: CallingCardTone; label: string }[] = [{ id: 'lines', label: '斜纹' }, { id: 'grid', label: '网格' }, { id: 'dots', label: '点阵' }, { id: 'plain', label: '纯色' }];
const PER = 5; const MAX = 7;
const Section = ({ label, children }: { label: ReactNode; children: ReactNode }) => (
  <section className="min-w-0">
    <div className="mb-1.5 flex items-center gap-2"><span aria-hidden className="h-[12px] w-[8px]" style={{ background: P3R.blue, clipPath: tickClip }} /><span className="text-[13px] font-black" style={{ color: P3R.ink }}>{label}</span></div>
    {children}
  </section>
);

export default function CallingCardEditor({ open, onClose, params, initialCard, onSave }: OverlayProps & { initialCard?: CallingCard | null; onSave?: (c: CallingCard) => void }) {
  const toast = useToast();
  const init = initialCard ?? (params?.get('variant') === 'edit' ? CALLING_CARDS[0] : null);
  const invalid = params?.get('state') === 'invalid';
  const [mode, setMode] = useState<CallingCard['mode']>('deadline');
  const [title, setTitle] = useState('');
  const [sub, setSub] = useState('');
  const [start, setStart] = useState(TODAY_KEY);
  const [target, setTarget] = useState('2026-11-20');
  const [linked, setLinked] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [tone, setTone] = useState<CallingCardTone>('lines');
  const [icon, setIcon] = useState('✦');
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    if (!open) return;
    setMode(init?.mode ?? 'deadline'); setTitle(init?.title ?? ''); setSub(init?.subtitle ?? ''); setStart(init?.startDate ?? TODAY_KEY);
    setTarget(invalid ? '2026-10-12' : init?.targetDate ?? '2026-11-20'); if (invalid) setTitle('期末考试'); setLinked(init?.linkedTodoIds ?? []); setTone(init?.tone ?? 'lines'); setIcon(init?.icon ?? '✦'); setPinned(init?.pinned ?? false); setPage(0);
  }, [open]); // eslint-disable-line
  const active = TODOS.filter((t) => t.isActive && !t.completedAt && !t.archivedAt);
  const pages = Math.max(1, Math.ceil(active.length / PER));
  const pageTodos = active.slice(page * PER, (page + 1) * PER);
  const needDate = mode !== 'todos';
  const needTodos = mode !== 'deadline';
  const errStart = needDate && start > target;
  const errPast = needDate && target < TODAY_KEY;
  const otherPinned = CALLING_CARDS.some((c) => c.pinned && c.id !== init?.id);
  const preview = needDate && !errStart && !errPast ? { total: daysBetween(start, target), left: daysBetween(TODAY_KEY, target), elapsed: Math.max(0, daysBetween(start, TODAY_KEY)) } : null;
  const valid = title.trim() && (!needDate || (!errStart && !errPast)) && (!needTodos || linked.length > 0);
  const save = () => {
    if (!valid) return;
    const c = { id: init?.id ?? `cc${Date.now()}`, title: title.trim(), subtitle: sub.trim() || undefined, mode, startDate: start, targetDate: needDate ? target : undefined, linkedTodoIds: needTodos ? linked : undefined, tone, icon, pinned, archived: false } as CallingCard;
    if (onSave) onSave(c); else toast.success(init ? '已保存修改' : '宣告已立下');
    onClose();
  };
  return (
    <P3Sheet open={open} onClose={onClose} title={init ? '编辑倒计时' : '新建倒计时'} en="CALLING CARD" size="tall"
      footer={<P3Button block size="lg" corner disabled={!valid} onClick={save}>{init ? '保存修改' : '✦ 立此宣告'}</P3Button>}>
      <div className="space-y-4">
        <Section label="模式">
          <P3Segment items={[{ id: 'deadline', label: '日期' }, { id: 'todos', label: '任务清单' }, { id: 'both', label: '兼有' }]} value={mode} onChange={(v) => setMode(v as CallingCard['mode'])} />
          <p className="mt-1.5 text-[12px]" style={{ color: P3R.grey }}>
            {mode === 'deadline' && '只看日期：到那天自动归档（"时之至"）'}
            {mode === 'todos' && '只看任务：选定项全部完成时自动归档（"达成"）'}
            {mode === 'both' && '两条都设：先到的为准（先做完所有任务 / 先到日子）'}
          </p>
        </Section>
        <Section label="标题"><P3Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如 高考 / 婚礼 / v3 上线" maxLength={24} aria-label="标题" /></Section>
        <Section label="宣告台词（可选）"><P3Input value={sub} onChange={(e) => setSub(e.target.value)} placeholder="命运在此倾覆 / 我宣告 …" maxLength={40} aria-label="宣告台词" /></Section>
        {needDate && (
          <Section label="日期">
            <div className="grid grid-cols-2 gap-2">
              <label className="min-w-0"><div className="mb-1 text-[11px] font-black" style={{ color: P3R.grey }}>起算日</div><P3Input type="date" value={start} onChange={(e) => setStart(e.target.value)} aria-label="起算日" /></label>
              <label className="min-w-0"><div className="mb-1 text-[11px] font-black" style={{ color: P3R.grey }}>目标日</div><P3Input type="date" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="目标日" /></label>
            </div>
            {errStart && <p className="mt-1 text-[12px] font-black" style={{ color: 'var(--p3r-coral-ink)' }}>起算日不能晚于目标日</p>}
            {errPast && <p className="mt-1 text-[12px] font-black" style={{ color: 'var(--p3r-coral-ink)' }}>目标日不能早于今天</p>}
            {preview && <p className="mt-1.5 text-[12px]" style={{ color: P3R.grey }}>共 <b className="font-cond text-[15px]" style={{ color: P3R.ink }}>{preview.total}</b> 天 · 还剩 <b className="font-cond text-[15px]" style={{ color: P3R.roseInk }}>{preview.left}</b> 天 · 已征途 <b className="font-cond text-[15px]" style={{ color: P3R.ink }}>{preview.elapsed}</b> 天</p>}
          </Section>
        )}
        {needTodos && (
          <Section label={`关联任务（已选 ${linked.length} / ${MAX}）`}>
            {active.length === 0 ? <p className="text-[12px]" style={{ color: P3R.grey }}>还没有活跃任务。先到上方"任务"区添加，再回来选。</p> : (
              <>
                <div className="grid grid-cols-1 gap-1.5">
                  {pageTodos.map((t) => {
                    const on = linked.includes(t.id);
                    return (
                      <div key={t.id} className="flex min-w-0 items-center gap-2 px-4 py-2" style={{ background: on ? P3R.cyanPale : 'var(--p3r-row)', clipPath: slantClip(8), opacity: !on && linked.length >= MAX ? 0.45 : 1 }}>
                        <P3Check checked={on} disabled={!on && linked.length >= MAX} onChange={() => setLinked((l) => (on ? l.filter((x) => x !== t.id) : [...l, t.id]))} label={<span className="block truncate">{t.title}</span>} />
                        <span className="ml-auto shrink-0 text-[11px] font-black" style={{ color: P3R.grey }}>{t.repeatDaily ? '每日' : t.isLongTerm ? '长期' : '单次'}</span>
                      </div>
                    );
                  })}
                </div>
                {pages > 1 && (
                  <div className="mt-2 flex items-center justify-between text-[13px] font-black" style={{ color: P3R.ink }}>
                    <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-30">‹ 上一组</button>
                    <span className="font-cond">{page + 1}/{pages}</span>
                    <button type="button" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-30">下一组 ›</button>
                  </div>
                )}
              </>
            )}
          </Section>
        )}
        <Section label="纹理 / 图标">
          <div className="grid grid-cols-4 gap-2">
            {TONES.map((o) => (
              <button key={o.id} type="button" onClick={() => setTone(o.id)} aria-pressed={tone === o.id} className="min-w-0 overflow-hidden text-center" style={{ clipPath: slantClip(7) }}>
                <div className="h-9" style={{ background: `${toneBg(o.id, 'rgba(255,248,240,0.45)')}, var(--p3r-blue)` }} />
                <div className="py-0.5 text-[12px] font-black" style={{ background: tone === o.id ? P3R.ink : P3R.cyanFaint, color: tone === o.id ? 'var(--p3r-on-ink)' : P3R.ink }}>{o.label}</div>
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ICONS.map((em) => <button key={em} type="button" onClick={() => setIcon(em)} aria-pressed={icon === em} aria-label={`图标 ${em}`} className="flex h-10 w-11 items-center justify-center text-[18px] font-black" style={{ clipPath: slantClip(6), background: icon === em ? P3R.blue : P3R.cyanFaint, color: icon === em ? P3R.onBlue : P3R.ink }}>{em}</button>)}
          </div>
        </Section>
        <P3ConfigRow label={<><Glyph name="pin" /> 钉到首页</>} hint={otherPinned ? '会替换当前已钉选的另一张卡' : '在首页宣言卡位常驻显示这张卡'}><P3OnOff value={pinned} onChange={setPinned} ariaLabel="钉到首页" /></P3ConfigRow>
      </div>
    </P3Sheet>
  );
}
