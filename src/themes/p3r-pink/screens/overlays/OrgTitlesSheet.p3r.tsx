/**
 * 等级与称号（真实 src/components/org/OrgTitlesSheet.tsx，粉白 p3）
 * 说明 · 等级名字 Lv.1…6（默认名 placeholder，「现在」）· 称号（内置 9 个可改名）· 自定义称号（改/删）·
 * 新增表单：称号名字（最多 6 个字）+ 条件 + 减一/加一 + 取消/加上·改好了 ·「＋ 加一个称号」· 取消/保存
 * 路由：#/overlay/hideout-titles?leader=0&form=1
 */
import { useEffect, useState, type ReactNode } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import { P3Sheet, P3Button, P3Input, P3R, SectionMark, slantClip, useToast } from '@pink/kit';
import { LEVEL, ORG_BUILTIN_TITLES, ORG_CUSTOM_TITLES_MAX, ORG_LEVEL_NAMES, ORG_TITLE_CONDS, ORG_TITLE_NAME_MAX, condText, type CondType } from '@pink/mock/pkg4-org';

interface Custom { id: string; name: string; cond: { type: CondType; value: number } }
const clip = (v: string, n: number) => [...v].slice(0, n).join('');
const Box = ({ children, on }: { children: ReactNode; on?: boolean }) => (
  <div className="relative min-w-0 px-4 py-2" style={{ background: on ? P3R.ink : 'var(--p3r-row)', color: on ? 'var(--p3r-on-ink)' : P3R.ink, clipPath: slantClip(10), boxShadow: on ? undefined : 'inset 0 0 0 1px var(--p3r-track)' }}>{children}</div>
);

export function OrgTitles({ open, onClose, leader, startForm, onFlash }: { open: boolean; onClose: () => void; leader: boolean; startForm?: boolean; onFlash: (s: string) => void }) {
  const [levels, setLevels] = useState<string[]>(['', '', '', '', '', '']);
  const [names, setNames] = useState<Record<string, string>>({});
  const [titles, setTitles] = useState<Custom[]>([{ id: 'c1', name: '夜猫子', cond: { type: 'week_days', value: 6 } }]);
  const [form, setForm] = useState<Custom | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const startNew = () => { setError(''); setForm({ id: `c${Date.now()}`, name: '', cond: { type: 'week_days', value: 5 } }); };
  useEffect(() => { if (open && startForm && leader) startNew(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const def = form ? ORG_TITLE_CONDS.find((c) => c.type === form.cond.type)! : null;
  const step = (d: number) => setForm((f) => (f && def ? { ...f, cond: { ...f.cond, value: Math.max(def.min, Math.min(def.max, f.cond.value + d)) } } : f));
  const commit = () => { if (!form) return; const n = form.name.trim(); if (!n) { setError('给称号起个名字'); return; } setError(''); setTitles((l) => (l.some((t) => t.id === form.id) ? l.map((t) => (t.id === form.id ? { ...form, name: n } : t)) : [...l, { ...form, name: n }])); setForm(null); };
  const save = () => { setBusy(true); window.setTimeout(() => { setBusy(false); onFlash('改好了：之后的纪要用新名字'); onClose(); }, 600); };
  const meta = (t: string) => <span className="font-cond text-[13px]" style={{ color: P3R.blue }}>{t}</span>;
  const stepBtn = (label: string, d: number, dis: boolean) => <button type="button" onClick={() => step(d)} disabled={dis} aria-label={label} className="flex h-10 w-10 items-center justify-center text-[20px] font-black disabled:opacity-30" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(6) }}>{d < 0 ? '−' : '+'}</button>;
  return (
    <P3Sheet open={open} onClose={onClose} busy={busy} title="等级与称号" en="RANK & TITLES" size="tall"
      footer={leader ? <div className="flex gap-2"><P3Button tone="soft" className="flex-1" onClick={onClose} disabled={busy}>取消</P3Button><P3Button className="flex-1" corner onClick={save} disabled={!!form} busy={busy} busyText="存着…">保存</P3Button></div> : undefined}>
      <div className="space-y-5 pt-1">
        <p className="text-[12.5px] leading-relaxed" style={{ color: P3R.inkSoft }}>{leader ? '队长可以给每一级起名字、给称号改名，也可以加自己的称号。改名只影响之后的纪要，称号册里改名前后算同一个称号。' : '据点每一级的名字、每周纪要里发的称号都在这里。名字由队长定。'}</p>
        <section className="space-y-2">
          <SectionMark title="等级名字" en="RANK" meta={meta(`现在 Lv.${LEVEL.level}`)} />
          {ORG_LEVEL_NAMES.map((d, i) => {
            const cur = i + 1 === LEVEL.level;
            return (
              <Box key={d} on={cur}>
                <div className="flex min-w-0 items-center gap-2">
                  <span className="w-11 shrink-0 font-cond text-[16px]" style={{ color: P3R.blue }}>Lv.{i + 1}</span>
                  {leader ? <span className="min-w-0 flex-1"><P3Input aria-label={`Lv.${i + 1} 的名字（默认：${d}）`} placeholder={d} value={levels[i]} onChange={(e) => setLevels((l) => l.map((x, k) => (k === i ? clip(e.target.value, 6) : x)))} /></span>
                    : <span className="min-w-0 flex-1 truncate text-[14px] font-black">{levels[i] || d}</span>}
                  {cur && <span className="shrink-0 px-1.5 py-[2px] text-[10px] font-black" style={{ background: P3R.magenta, color: '#fff', clipPath: slantClip(3) }}>现在</span>}
                </div>
              </Box>
            );
          })}
        </section>
        <section className="space-y-2">
          <SectionMark title="称号" en="TITLES" meta={meta(`${ORG_BUILTIN_TITLES.length} 个`)} />
          {ORG_BUILTIN_TITLES.map((t) => (
            <Box key={t.id}>
              {leader ? <P3Input aria-label={`称号「${t.name}」改名`} placeholder={t.name} value={names[t.id] ?? ''} onChange={(e) => setNames((n) => ({ ...n, [t.id]: clip(e.target.value, ORG_TITLE_NAME_MAX) }))} />
                : <div className="text-[14px] font-black">{names[t.id] || t.name}</div>}
              <div className="mt-1 text-[10.5px] font-bold leading-relaxed" style={{ color: P3R.grey }}>{t.how}</div>
            </Box>
          ))}
        </section>
        <section className="space-y-2">
          <SectionMark title="自定义称号" en="CUSTOM" meta={meta(`${titles.length} / ${ORG_CUSTOM_TITLES_MAX}`)} />
          {titles.length ? titles.map((t) => (
            <Box key={t.id}>
              <div className="flex min-w-0 items-center gap-2">
                <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-black">{t.name}</div><div className="truncate text-[10.5px] font-bold" style={{ color: P3R.grey }}>{condText(t.cond)}</div></div>
                {leader && <><P3Button size="sm" tone="soft" onClick={() => { setError(''); setForm({ ...t }); }}>改</P3Button><P3Button size="sm" tone="danger" onClick={() => setTitles((l) => l.filter((x) => x.id !== t.id))}>删</P3Button></>}
              </div>
            </Box>
          )) : <p className="text-[12.5px] font-bold" style={{ color: P3R.grey }}>{leader ? '还没有。比如「夜猫子」：这周记录天数 ≥ 6 天。' : '队长还没加。'}</p>}
          {form && def && (
            <div className="space-y-2.5 px-4 py-3" style={{ background: 'var(--p3r-cyan-pale)', clipPath: slantClip(12) }}>
              <P3Input aria-label="称号名字" placeholder={`称号名字（最多 ${ORG_TITLE_NAME_MAX} 个字）`} value={form.name} onChange={(e) => setForm({ ...form, name: clip(e.target.value, ORG_TITLE_NAME_MAX) })} />
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="条件">
                {ORG_TITLE_CONDS.map((c) => { const on = form.cond.type === c.type; return <button key={c.type} type="button" role="radio" aria-checked={on} onClick={() => setForm({ ...form, cond: { type: c.type, value: c.def } })} className="px-2.5 py-1 text-[11.5px] font-black" style={{ clipPath: slantClip(5), background: on ? P3R.blue : 'var(--p3r-panel)', color: on ? P3R.onBlue : P3R.ink }}>{c.label}</button>; })}
              </div>
              {!('noValue' in def) && (
                <div className="flex items-center gap-2">
                  {stepBtn('减一', -1, form.cond.value <= def.min)}
                  <span className="min-w-[4rem] text-center"><span className="font-cond text-[28px]" style={{ color: P3R.ink }}>{form.cond.value}</span><span className="ml-1 text-[12px] font-bold" style={{ color: P3R.grey }}>{def.unit}</span></span>
                  {stepBtn('加一', 1, form.cond.value >= def.max)}
                </div>
              )}
              <div className="text-[11px] font-bold leading-relaxed" style={{ color: P3R.inkSoft }}>每周一发纪要时，{condText(form.cond)}的人拿到「{form.name.trim() || '…'}」，挂一周。</div>
              {error && <div className="text-[12px] font-black" style={{ color: 'var(--p3r-coral-ink)' }}>{error}</div>}
              <div className="flex justify-end gap-2"><P3Button size="sm" tone="ghost" onClick={() => { setForm(null); setError(''); }}>取消</P3Button><P3Button size="sm" onClick={commit} disabled={!form.name.trim()}>{titles.some((t) => t.id === form.id) ? '改好了' : '加上'}</P3Button></div>
            </div>
          )}
          {leader && !form && titles.length < ORG_CUSTOM_TITLES_MAX && <P3Button size="sm" tone="outline" onClick={startNew}>＋ 加一个称号</P3Button>}
        </section>
      </div>
    </P3Sheet>
  );
}

export default function OrgTitlesSheet({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  return <OrgTitles open={open} onClose={onClose} leader={params?.get('leader') !== '0'} startForm={params?.get('form') === '1'} onFlash={(s) => toast.success(s)} />;
}
