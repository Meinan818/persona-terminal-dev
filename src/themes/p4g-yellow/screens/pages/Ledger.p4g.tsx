/**
 * 心相记账（真实 src/pages/Ledger.tsx · P4 分支）P4G Golden 重制。
 * 页头 LEDGER SHOW → 记账 / 资产 → 余额 Status 面板（月余额 ⇄ 总余额、预算环、今日还可花、收入剩余/结转、近9日）
 * → 编辑预算/设置预算 · 对账 → 一句话记多笔 + 记一笔 + 📷 拍小票 → 流水 / 统计。
 * 路由：?tab=book|assets &view=list|stats &state=first|empty|loading
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PageProps } from '@yellow/registry/types';
import type { LedgerEntry } from '@real/types';
import { P4PageHeader, P4Tabs, P4SegmentTabs, P4Card, P4List, P4Loading, P4Outline, useToast } from '@yellow/kit';
import { CollageStagger, CollageItem, NoiseLayer } from '@yellow/fx';
import { navigate } from '@yellow/shell/shellBus';
import { cx } from '@yellow/lib/cx';
import { useLowMotion } from '@yellow/lib/prefs';
import { DevStateBar, MonthNav, Ring } from '@yellow/screens/pkg5/ui';
import { LedgerStats } from '@yellow/screens/pkg5/LedgerStats';
import { AssetBoard } from '@yellow/screens/pkg5/AssetBoard';
import { LedgerEntrySheetView, emptyDraft, type EntryDraft } from '@yellow/screens/overlays/LedgerEntrySheet.p4g';
import { LedgerBatchSheetView, SAMPLE_BATCH } from '@yellow/screens/overlays/LedgerBatchSheet.p4g';
import { LedgerBudgetSheetView } from '@yellow/screens/overlays/LedgerBudgetSheet.p4g';
import { LedgerReconcileSheetView } from '@yellow/screens/overlays/LedgerReconcileSheet.p4g';
import { LedgerDeleteConfirmView } from '@yellow/screens/overlays/LedgerDeleteConfirm.p4g';
import { LedgerSavedModalView } from '@yellow/screens/overlays/LedgerSavedModal.p4g';
import { CNY, INCOME_META, catMeta, daysAgoKey, fmtMoney, fmtSigned, ledgerDateLabel, monthLabel, roundMoney, shiftMonth, weekdayCN } from '@yellow/mock/pkg5';
import { useLedgerData } from '@yellow/adapters/pkg5';

const WEEK_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function LedgerRow({ e, onClick }: { e: LedgerEntry; onClick: () => void }) {
  const isExp = e.direction === 'expense';
  const isInc = e.direction === 'income';
  const meta = isExp ? catMeta(e.type) : null;
  const sign = isInc ? '+' : isExp ? '−' : e.amount < 0 ? '−' : '+';
  const incomeLabel = e.category || INCOME_META[e.incomeType ?? 'other'].label;
  const sub = isInc ? [incomeLabel, e.channel].filter(Boolean).join(' · ') : e.direction === 'adjust' ? [e.note || '余额对账', e.channel].filter(Boolean).join(' · ') : [meta?.label, e.category, e.channel].filter(Boolean).join(' · ');
  const title = e.note || (isInc ? incomeLabel : meta?.label ?? '记录');
  return (
    <button type="button" onClick={onClick} className="group relative flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-p4g-select hover:text-[color:var(--p4g-select-ink)] active:translate-x-[2px]" style={{ background: 'var(--p4g-surface-grad)' }}>
      <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border-[3px] text-lg', isInc ? 'border-p4g-green bg-p4g-yellow-pale' : e.direction === 'adjust' ? 'border-p4g-muted bg-p4g-yellow-pale' : 'border-p4g-orange bg-p4g-yellow-pale')}>{isExp ? meta!.icon : isInc ? '💰' : '⚖️'}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-lead font-bold text-p4g-ink group-hover:text-inherit">{title}</span>
        {sub && <span className="block truncate text-meta text-p4g-ink-soft group-hover:text-inherit group-hover:opacity-80">{sub}</span>}
      </span>
      <span className={cx('shrink-0 p4g-num text-lead', isInc ? 'text-p4g-success' : e.direction === 'adjust' ? 'text-p4g-muted' : 'text-p4g-ink', 'group-hover:text-inherit')}>{sign}{CNY}{fmtMoney(e.amount)}</span>
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] group-hover:opacity-0" style={{ background: 'var(--p4g-separator-a)' }} />
    </button>
  );
}

export default function Ledger({ tab, params }: PageProps) {
  const toast = useToast();
  const { LEDGER_ACCOUNTS, LEDGER_BUDGET, LEDGER_ENTRIES, LEDGER_SAVINGS, P5_TODAY, CURRENT_MONTH } = useLedgerData();
  const low = useLowMotion();
  const [state, setState] = useState(params.get('state') ?? 'normal');
  const [mode, setMode] = useState<'ledger' | 'assets'>(tab === 'assets' ? 'assets' : 'ledger');
  const [view, setView] = useState<'list' | 'stats'>(params.get('view') === 'stats' ? 'stats' : 'list');
  const [entries, setEntries] = useState<LedgerEntry[]>(LEDGER_ENTRIES);
  const [balanceView, setBalanceView] = useState<'month' | 'total'>('month');
  const [listMonth, setListMonth] = useState(CURRENT_MONTH);
  const [nlText, setNlText] = useState('');
  const [nlBusy, setNlBusy] = useState(false);
  const [shotBusy, setShotBusy] = useState(false);
  const [shotHint, setShotHint] = useState<string | null>(null);
  const [draft, setDraft] = useState<EntryDraft | null>(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [del, setDel] = useState<LedgerEntry | null>(null);
  const [delOpen, setDelOpen] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const shotRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setEntries(LEDGER_ENTRIES); }, [LEDGER_ENTRIES]);

  const list = state === 'first' ? [] : state === 'empty' ? entries.filter((e) => !e.date.startsWith(CURRENT_MONTH)) : entries;
  const needsSetup = list.length === 0;
  const hasBudget = state !== 'first';
  const lim = LEDGER_BUDGET.monthlyLimit;
  const monthExpense = roundMoney(list.filter((e) => e.direction === 'expense' && e.date.startsWith(CURRENT_MONTH)).reduce((s, e) => s + e.amount, 0));
  const monthIncome = roundMoney(list.filter((e) => e.direction === 'income' && e.date.startsWith(CURRENT_MONTH)).reduce((s, e) => s + e.amount, 0));
  const total = needsSetup ? 0 : LEDGER_ACCOUNTS.reduce((s, a) => s + a.balance, 0);
  const budgetLeft = roundMoney(lim - monthExpense);
  const over = hasBudget && budgetLeft < 0;
  const remainingRatio = hasBudget && lim > 0 ? budgetLeft / lim : 1;
  const ringColor = !hasBudget ? 'var(--p4g-muted)' : over ? 'var(--p4g-danger)' : remainingRatio <= 0.2 ? 'var(--p4g-orange)' : 'var(--p4g-green)';
  const spentToday = list.filter((e) => e.direction === 'expense' && e.date === P5_TODAY).reduce((s, e) => s + e.amount, 0);
  const daysLeft = 12;
  const base = roundMoney(lim - (monthExpense - spentToday));
  const todayLeft = hasBudget && base > 0 ? roundMoney(base / daysLeft - spentToday) : 0;
  const todayOver = hasBudget && base > 0 && todayLeft < 0;
  const fundIncome = Math.max(0, monthIncome - monthExpense);
  const fundCarried = Math.max(0, total - fundIncome);
  const savings = needsSetup ? 0 : LEDGER_SAVINGS;

  const last9 = useMemo(() => {
    const days = Array.from({ length: 9 }, (_, i) => { const key = daysAgoKey(8 - i); return { key, spent: list.filter((e) => e.direction === 'expense' && e.date === key).reduce((s, e) => s + e.amount, 0) }; });
    const max = Math.max(1, ...days.map((d) => d.spent));
    const avg = days.reduce((s, d) => s + d.spent, 0) / 9;
    return { days, max, avg };
  }, [list]);

  const grouped = useMemo(() => {
    const m = new Map<string, LedgerEntry[]>();
    [...list].sort((a, b) => b.date.localeCompare(a.date)).forEach((e) => { const arr = m.get(e.date) ?? []; arr.push(e); m.set(e.date, arr); });
    return [...m.entries()].filter(([d]) => d.startsWith(listMonth));
  }, [list, listMonth]);
  const monthSum = grouped.reduce((acc, [, es]) => { es.forEach((e) => { if (e.direction === 'expense') acc.exp += e.amount; else if (e.direction === 'income') acc.inc += e.amount; }); return acc; }, { exp: 0, inc: 0 });

  const startDraft = (d: EntryDraft) => { setDraft(d); setDraftOpen(true); };
  const handleEntry = () => {
    if (nlBusy) return;
    const t = nlText.trim();
    if (!t) { setShotHint(null); startDraft(emptyDraft()); return; }
    setNlBusy(true);
    window.setTimeout(() => {
      setNlBusy(false);
      if (/[，,、和]|\s/.test(t)) setBatchOpen(true);
      else { const num = t.match(/\d+(\.\d+)?/); startDraft({ ...emptyDraft(), amount: num ? num[0] : '', note: t.replace(/\d+(\.\d+)?/, '').replace(/元|块/g, '').trim() }); }
    }, 650);
  };
  const handleShot = () => {
    setShotBusy(true); setShotHint(null);
    window.setTimeout(() => { setShotBusy(false); setShotHint('看图读的，核对一下金额'); startDraft({ ...emptyDraft(), amount: '36.5', note: '便利店', type: 'food' }); }, 1200);
  };
  const onSaved = (s: string) => { setNlText(''); setSaved(s); };

  if (state === 'loading') {
    return (<><P4PageHeader title="心相记账" en="LEDGER SHOW" onBack={() => navigate('menu')} hud={false} /><div className="flex min-h-[50vh] items-center justify-center"><P4Loading label="账本还在读取" /></div><DevStateBar value={state} onChange={setState} items={[{ id: 'normal', label: '正常' }, { id: 'first', label: '首次未设余额' }, { id: 'empty', label: '本月空' }, { id: 'loading', label: '读取中' }]} /></>);
  }

  return (
    <>
      <P4PageHeader title="心相记账" en="LEDGER SHOW" onBack={() => navigate('menu')} hud={false} />
      <P4Tabs value={mode} onChange={(v) => setMode(v as 'ledger' | 'assets')} items={[{ id: 'ledger', label: '记账' }, { id: 'assets', label: '资产' }]} className="-mx-2 mb-4" ariaLabel="记账 / 资产" />

      {mode === 'ledger' ? (
        <CollageStagger key={state} className="flex min-w-0 flex-col gap-5">
          {needsSetup && (
            <CollageItem>
              <button type="button" onClick={() => setAdjustOpen(true)} className="group relative block w-full min-w-0 text-left">
                <span aria-hidden className="absolute inset-0 translate-x-[8px] translate-y-[8px] rounded-sm bg-[color:var(--p4g-msg-plate-2)]" />
                <span aria-hidden className="absolute inset-0 translate-x-[4px] translate-y-[4px] rounded-sm bg-[color:var(--p4g-msg-plate)]" />
                <span className="relative flex min-w-0 items-center gap-3 rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] px-4 pb-3 pt-7 night:border-p4g-yellow">
                  <span className="absolute left-3 top-0 rounded-b-sm bg-p4g-yellow px-3 py-0.5 font-display text-meta font-bold text-p4g-black">FIRST STEP</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-lead font-bold text-p4g-yellow">👋 先设置你当前的余额</span>
                    <span className="mt-1 block text-meta leading-relaxed text-[color:var(--p4g-msg-ink)]">告诉我你现在大概有多少钱，记账才准——之后随时可「对账」修正。</span>
                  </span>
                  <span aria-hidden className="h-0 w-0 shrink-0 border-y-[9px] border-l-[13px] border-y-transparent border-l-p4g-yellow transition-transform group-active:translate-x-1" />
                </span>
              </button>
            </CollageItem>
          )}

          {/* 余额 Status 面板 */}
          <CollageItem>
            <div className="relative min-w-0 overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-black text-white shadow-hard-lg night:border-p4g-yellow">
              <div aria-hidden className="h-3 p4g-candy" />
              <div className="relative grid min-w-0 grid-cols-1 gap-4 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
                <div className="relative mx-auto">
                  <div aria-hidden className="absolute -inset-3 rounded-full bg-p4g-yellow" />
                  <div aria-hidden className="absolute -inset-1 rounded-full border-[6px] border-p4g-orange" />
                  {balanceView === 'month' ? (
                    <Ring size={196} stroke={24} total={1} track="var(--p4g-black)" segments={[{ value: Math.max(0, Math.min(1, remainingRatio)), color: ringColor }]}>
                      <button type="button" onClick={() => setBalanceView('total')} aria-label="切换到总余额" className="flex flex-col items-center text-p4g-black active:scale-95">
                        <span className="font-display text-meta font-bold">{hasBudget ? '月余额' : '本月已花'} <span className="text-2xs opacity-70">⇄ 总余额</span></span>
                        <span className="p4g-num text-[clamp(20px,6.4vw,26px)] leading-none">{hasBudget ? fmtSigned(budgetLeft) : `${CNY}${fmtMoney(monthExpense)}`}</span>
                        <span className="mt-0.5 font-display text-2xs font-bold opacity-80">{hasBudget ? `预算 ${CNY}${fmtMoney(lim)}` : '未设预算'}</span>
                      </button>
                    </Ring>
                  ) : (
                    <Ring size={196} stroke={24} total={total + monthExpense || 1} track="var(--p4g-black)" segments={[{ value: fundIncome, color: 'var(--p4g-green)' }, { value: fundCarried, color: 'var(--p4g-cyan)' }]}>
                      <button type="button" onClick={() => setBalanceView('month')} aria-label="切换到月余额" className="flex flex-col items-center text-p4g-black active:scale-95">
                        <span className="font-display text-meta font-bold">总余额 <span className="text-2xs opacity-70">⇄ 月余额</span></span>
                        <span className="p4g-num text-[clamp(20px,6.4vw,26px)] leading-none">{fmtSigned(total)}</span>
                        {savings > 0 && <span className="mt-0.5 font-display text-2xs font-bold">🐷 攒下 {CNY}{fmtMoney(savings)}</span>}
                      </button>
                    </Ring>
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <P4Outline size={22} stroke={4} fill="var(--p4g-yellow)" strokeColor="var(--p4g-black)" italic>{balanceView === 'month' ? 'MONTH' : 'TOTAL'}</P4Outline>
                    <span className="h-[3px] flex-1 bg-p4g-yellow/60" />
                    <span className="shrink-0 rounded-pill bg-p4g-yellow px-2.5 py-0.5 p4g-date-type text-2xs text-p4g-black">10/20 TUE</span>
                  </div>
                  {balanceView === 'month' ? (
                    hasBudget ? (over ? (
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="w-max rounded-xs bg-p4g-red px-2 py-1 font-display text-meta font-bold">本月已超 <b className="p4g-num text-lead">{CNY}{fmtMoney(-budgetLeft)}</b></span>
                        <span className="text-meta text-white/80">预算 {CNY}{fmtMoney(lim)} · 已花 {CNY}{fmtMoney(monthExpense)}</span>
                      </div>
                    ) : (
                      <div className="flex min-w-0 flex-col gap-1.5">
                        {(todayLeft > 0 || todayOver) && (
                          <span className={cx('flex w-max max-w-full items-baseline gap-2 rounded-xs px-2 py-1 font-display text-meta font-bold', todayOver ? 'bg-p4g-red text-white' : 'bg-p4g-green text-p4g-black')}>
                            {todayOver ? '今日已超' : '今日还可花'} <b className="p4g-num text-h2 leading-none">{CNY}{fmtMoney(Math.abs(todayLeft))}</b>
                          </span>
                        )}
                        <span className="text-meta text-white/85">本月预算剩 <b className="p4g-num text-p4g-yellow">{CNY}{fmtMoney(budgetLeft)}</b> / {CNY}{fmtMoney(lim)}</span>
                      </div>
                    )) : <span className="text-meta text-white/80">本月还没设预算</span>
                  ) : (
                    <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-meta text-white/85">
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 -skew-x-12 bg-p4g-green" />收入剩余 <b className="p4g-num text-white">{CNY}{fmtMoney(fundIncome)}</b></span>
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 -skew-x-12 bg-p4g-cyan" />结转 <b className="p4g-num text-white">{CNY}{fmtMoney(fundCarried)}</b></span>
                    </div>
                  )}
                  {/* 近9日：P4G 天气预报式日格 */}
                  <div className="min-w-0" title="近 9 日支出">
                    <div className="mb-1 font-display text-2xs font-bold tracking-widest text-p4g-yellow">近9日</div>
                    <div className="grid grid-cols-9 gap-1">
                      {last9.days.map((d, i) => {
                        const today = i === 8;
                        const hot = d.spent > last9.avg * 1.5;
                        const [y, m, dd] = d.key.split('-').map(Number);
                        const wk = new Date(y, m - 1, dd).getDay();
                        return (
                          <div key={d.key} className={cx('flex min-w-0 flex-col items-center gap-0.5 rounded-xs px-0.5 py-1', today ? 'bg-p4g-yellow text-p4g-black' : 'bg-white/10')}>
                            <span className={cx('text-[8px] font-bold leading-none', wk === 0 ? 'text-p4g-red' : wk === 6 ? 'text-p4g-cyan' : '')}>{WEEK_EN[wk].slice(0, 2)}</span>
                            <div className="relative h-8 w-2.5 overflow-hidden rounded-[1px] bg-white/15">
                              <div className={cx('absolute inset-x-0 bottom-0 h-full origin-bottom', d.spent === 0 ? 'bg-white/30' : hot ? 'bg-p4g-red' : today ? 'bg-p4g-black' : 'bg-p4g-orange')} style={{ transform: `scaleY(${d.spent === 0 ? 0.08 : Math.max(0.12, d.spent / last9.max)})` }} />
                            </div>
                            <span className="p4g-num text-[9px] leading-none">{dd}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex min-w-0 gap-2.5 pt-1">
                    <button type="button" onClick={() => setBudgetOpen(true)} className="p4g-press min-w-0 flex-1 -skew-x-12 border-3 border-p4g-yellow bg-p4g-yellow py-2 font-display text-body font-bold text-p4g-black shadow-[3px_3px_0_var(--p4g-orange)]"><span className="block skew-x-12 truncate">✿ {hasBudget ? '编辑预算' : '设置预算'}</span></button>
                    <button type="button" onClick={() => setAdjustOpen(true)} className="p4g-press min-w-0 flex-1 -skew-x-12 border-3 border-p4g-orange bg-p4g-orange py-2 font-display text-body font-bold text-p4g-black shadow-[3px_3px_0_var(--p4g-yellow)]"><span className="block skew-x-12 truncate">✿ 对账</span></button>
                  </div>
                </div>
              </div>
            </div>
          </CollageItem>

          {/* 录入条 */}
          <CollageItem>
            <div className="flex min-w-0 items-stretch gap-0">
              <label className="relative flex min-w-0 flex-1 items-center rounded-l-sm border-3 border-r-0 border-p4g-line bg-p4g-surface-2 focus-within:shadow-[4px_4px_0_var(--p4g-yellow)] night:focus-within:shadow-[4px_4px_0_var(--p4g-orange)]">
                <span aria-hidden className="ml-3 shrink-0 font-display text-lead font-bold text-p4g-orange">&gt;</span>
                <input value={nlText} onChange={(e) => setNlText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleEntry(); }} placeholder="一句话记多笔；空着点 = 手动填" aria-label="一句话记账"
                  className="h-14 min-w-0 flex-1 bg-transparent px-2 text-body font-bold text-p4g-ink outline-none focus-visible:outline-none placeholder:font-normal placeholder:text-p4g-muted" />
              </label>
              <button type="button" onClick={handleEntry} disabled={nlBusy} className="p4g-press relative h-14 shrink-0 overflow-hidden rounded-r-sm border-3 border-p4g-black bg-p4g-black px-5 font-display text-lead font-bold text-p4g-yellow shadow-hard disabled:opacity-50 night:border-p4g-yellow">
                <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-p4g-orange" />
                {nlBusy ? '…' : '记一笔'}
              </button>
            </div>
            <div className="mt-2 flex min-w-0 items-center gap-2">
              <input ref={shotRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleShot(); }} />
              <button type="button" onClick={() => { if (!shotBusy) handleShot(); }} onDoubleClick={() => shotRef.current?.click()} title="演示：单击模拟读图；双击打开真实相册选择" disabled={shotBusy}
                className="p4g-press relative h-9 shrink-0 overflow-hidden rounded-xs border-thin border-dashed border-p4g-line bg-p4g-surface-2 px-3 font-display text-meta font-bold text-p4g-ink disabled:opacity-60">
                {shotBusy && <NoiseLayer animate={!low} />}
                <span className="relative">{shotBusy ? '读图中…' : '📷 拍小票'}</span>
              </button>
              {shotHint && <span className="min-w-0 flex-1 truncate font-display text-meta font-bold text-[color:var(--p4g-on-stage)] opacity-80">{shotHint}</span>}
            </div>
          </CollageItem>

          <CollageItem>
            <P4SegmentTabs value={view} onChange={(v) => setView(v as 'list' | 'stats')} items={[{ id: 'list', label: '流水' }, { id: 'stats', label: '统计' }]} />
          </CollageItem>

          {view === 'list' ? (
            <CollageItem className="flex min-w-0 flex-col gap-4">
              <MonthNav label={monthLabel(listMonth)} sub={<>支出 <b className="p4g-num">{CNY}{fmtMoney(monthSum.exp)}</b>{monthSum.inc > 0 && <> · 收入 <b className="p4g-num">{CNY}{fmtMoney(monthSum.inc)}</b></>}</>}
                onPrev={() => setListMonth((m) => shiftMonth(m, -1))} onNext={() => setListMonth((m) => shiftMonth(m, 1))} nextDisabled={listMonth >= CURRENT_MONTH} />
              {grouped.length === 0 && (
                <P4Card tone="msg" className="mx-auto w-full max-w-md">
                  <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <span className="rounded-xs bg-p4g-yellow px-2 py-0.5 font-display text-2xs font-bold tracking-[0.2em] text-p4g-black">NO SIGNAL</span>
                    <span className="font-display text-lead font-bold text-p4g-yellow">{list.length === 0 ? '还没有记录，记一笔开始吧' : '这个月还没有记录'}</span>
                    <span className="text-meta opacity-75">{list.length === 0 ? '暂无可追踪的信号' : '翻到别的月份看看'}</span>
                  </div>
                </P4Card>
              )}
              {grouped.map(([date, es]) => {
                const [y, m, d] = date.split('-').map(Number);
                const wk = new Date(y, m - 1, d).getDay();
                return (
                  <div key={date} className="min-w-0">
                    <div className="mb-1.5 flex min-w-0 items-center gap-2 px-1">
                      <span className="rounded-pill bg-p4g-black px-3 py-0.5 p4g-date-type text-meta text-white night:bg-p4g-yellow night:text-p4g-black">{String(m).padStart(2, '0')}/{String(d).padStart(2, '0')}</span>
                      <span className={cx('rounded-xs px-1.5 py-0.5 font-display text-2xs font-bold', wk === 0 ? 'bg-p4g-red text-white' : wk === 6 ? 'bg-p4g-info text-p4g-info-ink' : 'bg-p4g-surface-2 text-p4g-ink')}>{WEEK_EN[wk]}</span>
                      <span className="truncate font-display text-meta font-bold text-[color:var(--p4g-on-stage)]">{ledgerDateLabel(date)} · {weekdayCN(date)}</span>
                    </div>
                    <P4List>{es.map((e) => <LedgerRow key={e.id} e={e} onClick={() => { setDel(e); setDelOpen(true); }} />)}</P4List>
                  </div>
                );
              })}
            </CollageItem>
          ) : (
            <CollageItem><LedgerStats entries={list} forceEmpty={state === 'empty'} /></CollageItem>
          )}
        </CollageStagger>
      ) : (
        <AssetBoard empty={state === 'first'} />
      )}

      <DevStateBar value={state} onChange={setState} items={[{ id: 'normal', label: '正常' }, { id: 'first', label: '首次未设余额' }, { id: 'empty', label: '本月空' }, { id: 'loading', label: '读取中' }]} />

      <LedgerEntrySheetView open={draftOpen} onClose={() => setDraftOpen(false)} initial={draft ?? undefined} hint={shotHint} onSaved={onSaved} />
      <LedgerBatchSheetView open={batchOpen} onClose={() => setBatchOpen(false)} initial={SAMPLE_BATCH} onSaved={onSaved} />
      <LedgerBudgetSheetView open={budgetOpen} onClose={() => setBudgetOpen(false)} onSaved={(m) => toast.success(`预算已定：${CNY}${fmtMoney(m)}`)} />
      <LedgerReconcileSheetView open={adjustOpen} onClose={() => setAdjustOpen(false)} initial={needsSetup} onSaved={() => { if (needsSetup) setState('normal'); toast.success(needsSetup ? '余额已记下' : '对账完成'); }} />
      <LedgerDeleteConfirmView open={delOpen} target={del} onClose={() => setDelOpen(false)} onConfirm={() => { if (del) setEntries((xs) => xs.filter((x) => x.id !== del.id)); toast('已删除这一笔'); }} />
      <LedgerSavedModalView open={!!saved} onClose={() => setSaved(null)} title={saved ?? ''} />
    </>
  );
}
