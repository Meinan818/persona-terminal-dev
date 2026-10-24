/**
 * 等级与称号（真实 src/components/org/OrgTitlesSheet.tsx）
 * 说明 · 等级名字 Lv.1…6（默认名 placeholder，「现在」）· 称号（内置 9 个可改名）· 自定义称号（改/删）·
 * 新增表单：称号名字（最多 6 个字）+ 条件 + 减一/加一 + 取消/加上·改好了 ·「＋ 加一个称号」· 取消/保存
 * 路由：#/overlay/hideout-titles?leader=0&form=1
 */
import { useEffect, useState } from 'react';
import type { OrgView } from '@real/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Sheet, P4Button, P4Input, P4Chip, useToast } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { buildView, LEVEL, ORG_BUILTIN_TITLES, ORG_CUSTOM_TITLES_MAX, ORG_LEVEL_NAMES, ORG_TITLE_CONDS, ORG_TITLE_NAME_MAX, condText, type CondType } from '@yellow/mock/pkg4-org';
import { refreshOrg, updateOrgCustomFromUi } from '@/services/orgSync';
import { orgLevelOfView } from '@/utils/orgOps';

interface Custom { id: string; name: string; cond: { type: CondType; value: number } }
const clip = (v: string, n: number) => [...v].slice(0, n).join('');

export function OrgTitles({ view, open, onClose, leader, startForm, onFlash }: { view: OrgView; open: boolean; onClose: () => void; leader: boolean; startForm?: boolean; onFlash: (s: string) => void }) {
  const [levels, setLevels] = useState<string[]>(view.org.custom?.levelNames ?? ['', '', '', '', '', '']);
  const [names, setNames] = useState<Record<string, string>>(view.org.custom?.titleNames ?? {});
  const [titles, setTitles] = useState<Custom[]>(view.org.custom?.titles ?? []);
  const [form, setForm] = useState<Custom | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const startNew = () => { setError(''); setForm({ id: `c${Date.now()}`, name: '', cond: { type: 'week_days', value: 5 } }); };
  useEffect(() => {
    if (!open) return;
    setLevels(view.org.custom?.levelNames ?? ['', '', '', '', '', '']);
    setNames(view.org.custom?.titleNames ?? {});
    setTitles(view.org.custom?.titles ?? []);
    setForm(null);
    if (startForm && leader) startNew();
    // eslint-disable-next-line
  }, [open, view.org.custom]);
  const def = form ? ORG_TITLE_CONDS.find((c) => c.type === form.cond.type)! : null;
  const step = (d: number) => setForm((f) => (f && def ? { ...f, cond: { ...f.cond, value: Math.max(def.min, Math.min(def.max, f.cond.value + d)) } } : f));
  const commit = () => { if (!form) return; const n = form.name.trim(); if (!n) { setError('给称号起个名字'); return; } setError(''); setTitles((l) => (l.some((t) => t.id === form.id) ? l.map((t) => (t.id === form.id ? { ...form, name: n } : t)) : [...l, { ...form, name: n }])); setForm(null); };
  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await updateOrgCustomFromUi(view.org.id, { levelNames: levels, titleNames: names, titles });
      await refreshOrg(view.org.id);
      onFlash('改好了：之后的纪要用新名字');
      onClose();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : '没保存成功，请重试');
    } finally {
      setBusy(false);
    }
  };
  const sec = (t: string, meta?: string) => <div className="mb-2 flex items-center gap-1.5"><span aria-hidden className="inline-block h-3.5 w-1.5 -skew-x-12 bg-p4g-orange" /><span className="font-display text-meta font-bold text-p4g-ink">{t}</span>{meta && <span className="ml-auto font-display text-2xs font-bold text-p4g-ink-soft">{meta}</span>}</div>;
  const rowBg = { background: 'var(--p4g-surface-grad)' };
  return (
    <P4Sheet open={open} onClose={() => !busy && onClose()} title="等级与称号" en="RANK & TITLES" size="tall"
      footer={leader ? <div className="flex gap-2"><P4Button variant="secondary" className="flex-1" onClick={onClose} disabled={busy}>取消</P4Button><P4Button className="flex-1" variant="black" onClick={save} disabled={busy || !!form} busy={busy}>{busy ? '存着…' : '保存'}</P4Button></div> : undefined}>
      <div className="space-y-5 pt-1">
        <p className="text-meta leading-relaxed text-p4g-ink-soft">{leader ? '队长可以给每一级起名字、给称号改名，也可以加自己的称号。改名只影响之后的纪要，称号册里改名前后算同一个称号。' : '据点每一级的名字、每周纪要里发的称号都在这里。名字由队长定。'}</p>
        <section>
          {sec('等级名字', `现在 Lv.${orgLevelOfView(view).level}`)}
          <div className="space-y-1.5">
            {ORG_LEVEL_NAMES.map((d, i) => {
              const cur = i + 1 === orgLevelOfView(view).level;
              return (
                <div key={d} className={cx('flex min-w-0 items-center gap-2 rounded-sm border-3 px-2 py-1.5', cur ? 'border-p4g-select bg-p4g-select text-[color:var(--p4g-select-ink)]' : 'border-p4g-line text-p4g-ink')} style={cur ? undefined : rowBg}>
                  <span className="w-11 shrink-0 font-display text-body font-bold italic">Lv.{i + 1}</span>
                  {leader ? <P4Input wrapClassName="min-w-0 flex-1" aria-label={`Lv.${i + 1} 的名字（默认：${d}）`} placeholder={d} value={levels[i]} onChange={(e) => setLevels((l) => l.map((x, k) => (k === i ? clip(e.target.value, 6) : x)))} />
                    : <span className="min-w-0 flex-1 truncate font-display text-body font-bold">{levels[i] || d}</span>}
                  {cur && <span className="shrink-0 rounded-xs bg-p4g-orange px-1.5 py-[2px] font-display text-2xs font-bold text-p4g-black">现在</span>}
                </div>
              );
            })}
          </div>
        </section>
        <section>
          {sec('称号', `${ORG_BUILTIN_TITLES.length} 个`)}
          <ul className="space-y-1.5">
            {ORG_BUILTIN_TITLES.map((t) => (
              <li key={t.id} className="rounded-sm border-3 border-p4g-line px-2.5 py-2" style={rowBg}>
                {leader ? <P4Input aria-label={`称号「${t.name}」改名`} placeholder={t.name} value={names[t.id] ?? ''} onChange={(e) => setNames((n) => ({ ...n, [t.id]: clip(e.target.value, ORG_TITLE_NAME_MAX) }))} />
                  : <div className="font-display text-body font-bold text-p4g-ink">{names[t.id] || t.name}</div>}
                <div className="mt-1 text-2xs font-bold leading-relaxed text-p4g-ink-soft">{t.how}</div>
              </li>
            ))}
          </ul>
        </section>
        <section>
          {sec('自定义称号', `${titles.length} / ${ORG_CUSTOM_TITLES_MAX}`)}
          {titles.length ? (
            <ul className="space-y-1.5">
              {titles.map((t) => (
                <li key={t.id} className="flex min-w-0 items-center gap-2 rounded-sm border-3 border-p4g-line px-2.5 py-2" style={rowBg}>
                  <div className="min-w-0 flex-1"><div className="truncate font-display text-body font-bold text-p4g-ink">{t.name}</div><div className="truncate text-2xs font-bold text-p4g-ink-soft">{condText(t.cond)}</div></div>
                  {leader && <><P4Button size="sm" variant="secondary" onClick={() => { setError(''); setForm({ ...t }); }}>改</P4Button><P4Button size="sm" variant="danger" onClick={() => setTitles((l) => l.filter((x) => x.id !== t.id))}>删</P4Button></>}
                </li>
              ))}
            </ul>
          ) : <p className="text-meta font-bold text-p4g-ink-soft">{leader ? '还没有。比如「夜猫子」：这周记录天数 ≥ 6 天。' : '队长还没加。'}</p>}
          {form && def && (
            <div className="mt-2 space-y-2.5 rounded-sm border-3 border-p4g-black bg-p4g-surface-2 p-3 shadow-hard night:border-p4g-yellow">
              <P4Input aria-label="称号名字" placeholder={`称号名字（最多 ${ORG_TITLE_NAME_MAX} 个字）`} value={form.name} onChange={(e) => setForm({ ...form, name: clip(e.target.value, ORG_TITLE_NAME_MAX) })} />
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="条件">
                {ORG_TITLE_CONDS.map((c) => <P4Chip key={c.type} size="sm" tone="outline" selected={form.cond.type === c.type} onClick={() => setForm({ ...form, cond: { type: c.type, value: c.def } })}>{c.label}</P4Chip>)}
              </div>
              {!('noValue' in def) && (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => step(-1)} disabled={form.cond.value <= def.min} aria-label="减一" className="p4g-press flex h-10 w-10 items-center justify-center rounded-sm border-3 border-p4g-line bg-p4g-yellow font-display text-h3 font-bold text-p4g-black disabled:opacity-30">−</button>
                  <span className="min-w-[4rem] text-center"><span className="p4g-num text-h2 text-p4g-ink">{form.cond.value}</span><span className="ml-1 text-meta font-bold text-p4g-ink-soft">{def.unit}</span></span>
                  <button type="button" onClick={() => step(1)} disabled={form.cond.value >= def.max} aria-label="加一" className="p4g-press flex h-10 w-10 items-center justify-center rounded-sm border-3 border-p4g-line bg-p4g-yellow font-display text-h3 font-bold text-p4g-black disabled:opacity-30">+</button>
                </div>
              )}
              <div className="text-2xs font-bold leading-relaxed text-p4g-ink-soft">每周一发纪要时，{condText(form.cond)}的人拿到「{form.name.trim() || '…'}」，挂一周。</div>
              {error && <div className="text-meta font-bold text-p4g-danger">{error}</div>}
              <div className="flex justify-end gap-2"><P4Button size="sm" variant="secondary" onClick={() => { setForm(null); setError(''); }}>取消</P4Button><P4Button size="sm" onClick={commit} disabled={!form.name.trim()}>{titles.some((t) => t.id === form.id) ? '改好了' : '加上'}</P4Button></div>
            </div>
          )}
          {leader && !form && titles.length < ORG_CUSTOM_TITLES_MAX && <div className="mt-2"><P4Button size="sm" variant="secondary" onClick={startNew}>＋ 加一个称号</P4Button></div>}
        </section>
      </div>
    </P4Sheet>
  );
}

export default function OrgTitlesSheet({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  return <OrgTitles view={buildView()} open={open} onClose={onClose} leader={params?.get('leader') !== '0'} startForm={params?.get('form') === '1'} onFlash={(s) => toast.success(s)} />;
}
