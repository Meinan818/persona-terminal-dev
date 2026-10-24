/**
 * 心相记账（真实 src/pages/Ledger.tsx · p3 分支「p3-ledger-reference-v2」）粉白 P3R 重制。
 * 页头 P3PageHeader「记账」+ 左上双片 → 记账 / 资产（SegmentTabs）→ 首次「先设置你当前的余额」浅樱斜条
 * → 白大斜卡：左侧近 9 日梯级（宽 ∝ 当日支出，今天玫红、超均值 1.5× 珊瑚）+ 超大玫红斜体金额（点数字切 月余额 ⇄ 总余额）
 * → 预算消耗条 → 今日还可花 / 本月已超 → 编辑预算 · 对账 → 录入条（白斜输入 + 玫红斜块「记一笔」+ 珊瑚角）+ 拍小票
 * → 流水 / 统计。状态机 / 假数据改写自黄色版 Ledger（只读参考）。
 * 路由：?tab=book|assets &view=list|stats &state=first|empty|loading|over
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PageProps } from '@pink/registry/types';
import type { LedgerEntry } from '@real/types';
import { P3PageHeader, P3Segment, P3R, slantClip, tickClip, useToast, Glyph } from '@pink/kit';
import { P3Stagger, P3StaggerItem } from '@pink/fx';
import { navigate } from '@pink/shell/shellBus';
import { useBoldness } from '@pink/lib/prefs';
import { CatMark, GlassSlab, MonthNav, SlabBtn, LoadingBlock } from '@pink/screens/pkg5/ui';
import { LedgerStats } from '@pink/screens/pkg5/LedgerStats';
import { AssetBoard } from '@pink/screens/pkg5/AssetBoard';
import { LedgerEntrySheetView, emptyDraft, CameraGlyph, type EntryDraft } from '@pink/screens/overlays/LedgerEntrySheet.p3r';
import { LedgerBatchSheetView, type BatchRow } from '@pink/screens/overlays/LedgerBatchSheet.p3r';
import { LedgerBudgetSheetView } from '@pink/screens/overlays/LedgerBudgetSheet.p3r';
import { LedgerReconcileSheetView } from '@pink/screens/overlays/LedgerReconcileSheet.p3r';
import { LedgerDeleteConfirmView } from '@pink/screens/overlays/LedgerDeleteConfirm.p3r';
import { LedgerSavedModalView } from '@pink/screens/overlays/LedgerSavedModal.p3r';
import { CNY, INCOME_META, catMeta } from '@pink/mock/pkg5';
import { daysAgoKey, fmtMoney, fmtSigned, ledgerDateLabel, monthLabel, roundMoney, shiftMonth, weekdayCN, useLedgerData } from '@pink/adapters/pkg5';
import { ledgerOps } from '@/themes/ledgerOperations';
import { readAsDataUrl, downscaleDataUrl } from '@/utils/imageCrop';
import { parseLedgerBatch, parseLedgerShot } from '@/utils/ledgerAI';
import { useAppStore } from '@/store';

const WEEK_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function LedgerRow({ e, onClick, alt }: { e: LedgerEntry; onClick: () => void; alt?: boolean }) {
  const isExp = e.direction === 'expense';
  const isInc = e.direction === 'income';
  const meta = isExp ? catMeta(e.type) : null;
  const sign = isInc ? '+' : isExp ? '−' : e.amount < 0 ? '−' : '+';
  const incomeLabel = e.category || INCOME_META[e.incomeType ?? 'other'].label;
  const sub = isInc ? [incomeLabel, e.channel].filter(Boolean).join(' · ') : e.direction === 'adjust' ? [e.note || '余额对账', e.channel].filter(Boolean).join(' · ') : [meta?.label, e.category, e.channel].filter(Boolean).join(' · ');
  const title = e.note || (isInc ? incomeLabel : meta?.label ?? '记录');
  return (
    <button type="button" onClick={onClick} className="relative flex w-full min-w-0 items-center gap-3 py-2.5 pl-5 pr-4 text-left active:scale-[0.99]" style={{ clipPath: slantClip(12), background: alt ? 'var(--p3r-row-alt)' : 'var(--p3r-row)' }}>
      {isExp ? <CatMark type={e.type} /> : <CatMark glyph={isInc ? '收' : '账'} color={isInc ? 'var(--p3r-mint)' : P3R.grey} />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-black" style={{ color: P3R.ink }}>{title}</span>
        {sub && <span className="block truncate text-[12px] font-bold" style={{ color: P3R.grey }}>{sub}</span>}
      </span>
      <span className="shrink-0 font-cond text-[19px] tabular" style={{ color: isInc ? 'var(--p3r-lilac-ink)' : e.direction === 'adjust' ? P3R.grey : P3R.ink }}>{sign}{CNY}{fmtMoney(e.amount)}</span>
    </button>
  );
}

export default function Ledger({ tab, params }: PageProps) {
  const toast = useToast();
  const anim = useBoldness();
  const settings = useAppStore((s) => s.settings);
  const { LEDGER_ACCOUNTS, LEDGER_BUDGET, LEDGER_ENTRIES, LEDGER_SAVINGS, LEDGER_LOADED, HAS_BUDGET, P5_TODAY, CURRENT_MONTH, LEDGER_RESET_DAY, LEDGER_CYCLE, LEDGER_DAYS_LEFT, ADJUST_LEFT } = useLedgerData();
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
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
  const [batchDate, setBatchDate] = useState(P5_TODAY);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [del, setDel] = useState<LedgerEntry | null>(null);
  const [delOpen, setDelOpen] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const shotRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setEntries(LEDGER_ENTRIES); }, [LEDGER_ENTRIES]);

  const inCycle = (date: string) => date >= LEDGER_CYCLE.start && date <= LEDGER_CYCLE.end;
  const list = state === 'first' ? [] : state === 'empty' ? entries.filter((e) => !inCycle(e.date)) : entries;
  const needsSetup = state === 'first' || (LEDGER_LOADED && entries.length === 0);
  const hasBudget = state === 'first' ? false : state === 'over' ? true : HAS_BUDGET;
  const lim = state === 'over' ? 4000 : LEDGER_BUDGET.monthlyLimit;
  const monthExpense = roundMoney(list.filter((e) => e.direction === 'expense' && inCycle(e.date)).reduce((s, e) => s + e.amount, 0));
  const monthIncome = roundMoney(list.filter((e) => e.direction === 'income' && inCycle(e.date)).reduce((s, e) => s + e.amount, 0));
  const total = needsSetup ? 0 : LEDGER_ACCOUNTS.reduce((s, a) => s + a.balance, 0);
  const budgetLeft = roundMoney(lim - monthExpense);
  const over = hasBudget && budgetLeft < 0;
  const spentToday = list.filter((e) => e.direction === 'expense' && e.date === P5_TODAY).reduce((s, e) => s + e.amount, 0);
  const daysLeft = LEDGER_DAYS_LEFT;
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
  const handleEntry = async () => {
    if (nlBusy) return;
    const t = nlText.trim();
    if (!t) { setShotHint(null); startDraft(emptyDraft()); return; }
    setNlBusy(true);
    try {
      const results = await parseLedgerBatch(t, settings);
      if (results.length >= 2) {
        setBatchDate(results.find((r) => r.date)?.date ?? P5_TODAY);
        setBatchRows(results.map((r) => ({
          direction: r.direction,
          amount: String(r.amount),
          type: r.type ?? 'other',
          channel: settings.ledgerLastChannel || '微信',
          incomeSource: r.incomeType === 'labor' ? '工资' : r.category || '其它收入',
          note: r.note,
        })));
        setBatchOpen(true);
      } else if (results.length === 1) {
        const r = results[0];
        startDraft({
          ...emptyDraft(),
          direction: r.direction,
          amount: String(r.amount),
          type: r.type ?? 'other',
          incomeSource: r.incomeType === 'labor' ? '工资' : r.category || '',
          category: r.category || '',
          channel: settings.ledgerLastChannel || '',
          note: r.note,
          date: r.date ?? P5_TODAY,
        });
      } else {
        startDraft({ ...emptyDraft(), note: t.replace(/\d+(\.\d+)?/g, '').trim() });
      }
    } finally {
      setNlBusy(false);
    }
  };
  const handleShot = async (file: File) => {
    if (shotBusy) return;
    setShotBusy(true); setShotHint(null);
    try {
      const dataUrl = await downscaleDataUrl(await readAsDataUrl(file));
      const shot = await parseLedgerShot(dataUrl, settings);
      if (shot.results.length >= 2) {
        setBatchDate(shot.results.find((r) => r.date)?.date ?? P5_TODAY);
        setBatchRows(shot.results.map((r) => ({
          direction: r.direction,
          amount: String(r.amount),
          type: r.type ?? 'other',
          channel: settings.ledgerLastChannel || '微信',
          incomeSource: r.incomeType === 'labor' ? '工资' : r.category || '其它收入',
          note: r.note,
        })));
        setShotHint('视觉模型读出多笔，请核对');
        setBatchOpen(true);
        return;
      }
      if (shot.results.length === 1) {
        const r = shot.results[0];
        setShotHint(shot.via === 'vision' ? '视觉模型已读出，请核对金额和说明' : '本机识别完成，请核对金额和说明');
        startDraft({
          ...emptyDraft(),
          direction: r.direction,
          amount: String(r.amount),
          type: r.type ?? 'other',
          incomeSource: r.incomeType === 'labor' ? '工资' : r.category || '',
          category: r.category || '',
          channel: settings.ledgerLastChannel || '',
          note: r.note,
          date: r.date ?? P5_TODAY,
        });
        return;
      }
      if (shot.ocrText?.trim()) {
        setNlText(shot.ocrText.trim().slice(0, 100));
        setShotHint('读到了文字，但没有识别出金额，请补充后重试');
      } else {
        setShotHint(shot.via === 'none' ? '没有可用的视觉模型，也没有读出本机文字，请手动填写' : '这张没读出金额，请手动填写');
        startDraft(emptyDraft());
      }
    } catch {
      setShotHint('图片读取失败，换一张或手动填写');
    } finally {
      setShotBusy(false);
    }
  };
  const onSaved = (s: string) => { setNlText(''); setSaved(s); };
  const bigNum = balanceView === 'month' ? (hasBudget ? fmtSigned(budgetLeft) : `${CNY}${fmtMoney(monthExpense)}`) : fmtSigned(total);

  const header = (
    <div className="relative">
      <span aria-hidden className="absolute left-[2px] top-[34px] flex gap-1">
        <span className="h-[11px] w-[15px]" style={{ background: P3R.blue, clipPath: tickClip }} />
        <span className="h-[11px] w-[12px]" style={{ background: 'var(--pk-petal-a)', clipPath: tickClip }} />
      </span>
      <P3PageHeader title="记账" en="LEDGER" onBack={() => navigate('menu')} className="pt-2" />
    </div>
  );

  if (state === 'loading') return (<>{header}<LoadingBlock text="账本还在读取…" /></>);

  return (
    <div className="relative mx-auto min-w-0 max-w-2xl pb-8">
      {header}
      <P3Segment value={mode} onChange={(v) => setMode(v as 'ledger' | 'assets')} items={[{ id: 'ledger', label: '记账' }, { id: 'assets', label: '资产' }]} className="mb-4" />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={mode} initial={anim ? { opacity: 0, x: mode === 'assets' ? 18 : -18 } : false} animate={{ opacity: 1, x: 0 }} exit={anim ? { opacity: 0, x: mode === 'assets' ? -18 : 18 } : { opacity: 0 }} transition={{ duration: 0.2 }}>
          {mode === 'ledger' ? (
            <P3Stagger key={state} className="flex min-w-0 flex-col gap-4">
              {needsSetup && (
                <P3StaggerItem>
                  <button type="button" onClick={() => setAdjustOpen(true)} className="relative w-full px-5 py-3 text-left active:scale-[0.99]" style={{ clipPath: slantClip(12), background: P3R.cyanPale }}>
                    <div className="flex items-center gap-2 text-[14px] font-black" style={{ color: P3R.roseInk }}>
                      <span aria-hidden className="flex h-5 w-5 items-center justify-center font-cond text-[13px]" style={{ background: P3R.magenta, color: '#fff', clipPath: slantClip(3) }}>!</span> 先设置你当前的余额
                    </div>
                    <div className="mt-0.5 pl-7 pr-6 text-[12px] font-bold" style={{ color: P3R.ink }}>告诉我你现在大概有多少钱，记账才准——之后随时可「对账」修正。</div>
                    <span aria-hidden className="absolute right-2 top-1/2 h-4 w-5 -translate-y-1/2" style={{ background: P3R.cyan, clipPath: 'polygon(0 100%, 100% 0, 100% 100%)' }} />
                  </button>
                </P3StaggerItem>
              )}

              {/* 余额大斜卡 */}
              <P3StaggerItem>
                <GlassSlab cut={34}>
                  <div className="relative px-6 py-7">
                    <div aria-hidden className="absolute bottom-6 left-7 top-6 flex w-[56px] flex-col justify-between" title="近 9 日支出">
                      {last9.days.map((d, i) => {
                        const today = i === last9.days.length - 1;
                        const w = d.spent === 0 ? 8 : 12 + (d.spent / last9.max) * 36;
                        const hot = !today && last9.avg > 0 && d.spent > last9.avg * 1.5;
                        return (
                          <motion.span key={d.key} className="h-[9px] origin-left" style={{ width: w, marginLeft: (last9.days.length - 1 - i) * 1.6, background: d.spent === 0 ? 'rgb(var(--p3r-grey-rgb) / 0.35)' : today ? P3R.blue : hot ? P3R.magenta : P3R.cyan, clipPath: 'polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)' }}
                            initial={anim ? { scaleX: 0 } : false} animate={{ scaleX: 1 }} transition={{ duration: 0.35, delay: 0.05 * i }} />
                        );
                      })}
                      <span className="mt-0.5 text-[9px] font-black leading-none" style={{ color: P3R.grey }}>近9日</span>
                    </div>
                    <button type="button" onClick={() => setBalanceView((v) => (v === 'month' ? 'total' : 'month'))} aria-label={balanceView === 'month' ? '切换到总余额' : '切换到月余额'} className="relative mx-auto block w-full min-w-0 pl-14 text-center focus-visible:outline-none">
                      <div className="text-[16px] font-black" style={{ color: P3R.roseInk }}>{balanceView === 'month' ? (hasBudget ? '月余额' : '本月已花') : '总余额'} <span className="text-[11px] opacity-70">{balanceView === 'month' ? '⇄ 总余额' : '⇄ 月余额'}</span></div>
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div key={balanceView} className="mt-1 truncate font-cond text-[clamp(40px,13vw,56px)] leading-none tabular" style={{ color: over && balanceView === 'month' ? 'var(--p3r-coral-ink)' : P3R.blue }}
                          initial={anim ? { opacity: 0, y: 10, clipPath: 'inset(0 100% 0 0)' } : false} animate={{ opacity: 1, y: 0, clipPath: 'inset(0 -10% 0 0)' }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28 }}>{bigNum}</motion.div>
                      </AnimatePresence>
                      <div aria-hidden className="mx-auto mt-3.5 flex h-[2px] w-[min(210px,80%)] items-center" style={{ background: 'rgb(var(--p3r-blue-rgb) / 0.45)' }}><span className="h-[4px] w-8" style={{ background: P3R.blue }} /></div>
                      {balanceView === 'month' ? (
                        <div className="mt-2.5 text-[14px] font-bold" style={{ color: P3R.grey }}>{hasBudget ? `预算 ${CNY}${fmtMoney(lim)} · ∇ 点击看总余额` : '未设预算'}</div>
                      ) : (
                        <div className="mt-2.5 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12px] font-bold" style={{ color: P3R.inkSoft }}>
                          <span className="flex items-center gap-1.5"><span aria-hidden className="h-2 w-2.5" style={{ background: 'var(--p3r-mint)', clipPath: slantClip(2) }} />收入剩余 <b className="font-cond text-[14px]">{CNY}{fmtMoney(fundIncome)}</b></span>
                          <span className="flex items-center gap-1.5"><span aria-hidden className="h-2 w-2.5" style={{ background: P3R.cyan, clipPath: slantClip(2) }} />结转 <b className="font-cond text-[14px]">{CNY}{fmtMoney(fundCarried)}</b></span>
                          {savings > 0 && <span><Glyph name="piggy" /> 攒下 {CNY}{fmtMoney(savings)}</span>}
                        </div>
                      )}
                    </button>
                    <span aria-hidden className="absolute bottom-0 right-10 h-5 w-9" style={{ background: P3R.cyan, clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
                  </div>
                </GlassSlab>
                {balanceView === 'month' && hasBudget && (
                  <div className="mt-3.5 px-6">
                    <div className="relative h-[11px] w-full overflow-hidden" style={{ background: 'rgb(var(--p3r-wash) / 0.8)', clipPath: slantClip(3) }}>
                      <motion.div className="absolute inset-y-0 left-0 w-full origin-left" style={{ background: over ? P3R.magenta : `linear-gradient(90deg, ${P3R.blue}, ${P3R.cyan})` }}
                        initial={anim ? { scaleX: 0 } : false} animate={{ scaleX: Math.max(0.03, Math.min(1, lim > 0 ? monthExpense / lim : 0)) }} transition={{ type: 'spring', stiffness: 110, damping: 20, delay: 0.1 }} />
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] font-black" style={{ color: P3R.grey }}><span>已花 {CNY}{fmtMoney(monthExpense)}</span><span>{lim > 0 ? Math.round((monthExpense / lim) * 100) : 0}%</span></div>
                  </div>
                )}
                {balanceView === 'month' && hasBudget && (over ? (
                  <div className="mt-2.5 flex flex-col items-center gap-1">
                    <div className="inline-flex items-baseline gap-1.5 px-4 py-1" style={{ clipPath: slantClip(8), background: 'rgb(var(--p3r-magenta-rgb) / 0.12)' }}>
                      <span className="text-[12px] font-bold" style={{ color: 'var(--p3r-coral-ink)' }}>本月已超</span>
                      <span className="font-cond text-[20px]" style={{ color: 'var(--p3r-coral-ink)' }}>{CNY}{fmtMoney(-budgetLeft)}</span>
                    </div>
                    <span className="text-[12px] font-bold" style={{ color: P3R.grey }}>预算 {CNY}{fmtMoney(lim)} · 已花 {CNY}{fmtMoney(monthExpense)}</span>
                  </div>
                ) : (
                  <div className="mt-2.5 flex flex-col items-center gap-1">
                    {(todayLeft > 0 || todayOver) && (
                      <div className="inline-flex items-baseline gap-1.5 px-4 py-1" style={{ clipPath: slantClip(8), background: todayOver ? 'rgb(var(--p3r-magenta-rgb) / 0.12)' : 'rgb(var(--p3r-cyan-rgb) / 0.2)' }}>
                        <span className="text-[12px] font-bold" style={{ color: todayOver ? 'var(--p3r-coral-ink)' : P3R.roseInk }}>{todayOver ? '今日已超' : '今日还可花'}</span>
                        <span className="font-cond text-[20px]" style={{ color: todayOver ? 'var(--p3r-coral-ink)' : P3R.roseInk }}>{CNY}{fmtMoney(Math.abs(todayLeft))}</span>
                      </div>
                    )}
                    <span className="text-[12px] font-bold" style={{ color: P3R.grey }}>本月预算剩 <b className="font-cond text-[14px]">{CNY}{fmtMoney(budgetLeft)}</b> / {CNY}{fmtMoney(lim)}</span>
                  </div>
                ))}
                {balanceView === 'month' && !hasBudget && <div className="mt-2 text-center text-[12px] font-bold" style={{ color: P3R.grey }}>本月还没设预算</div>}
                <div className="mt-3.5 flex justify-center gap-2.5">
                  <SlabBtn onClick={() => setBudgetOpen(true)}>{hasBudget ? '编辑预算' : '设置预算'}</SlabBtn>
                  <SlabBtn onClick={() => setAdjustOpen(true)}>对账</SlabBtn>
                </div>
              </P3StaggerItem>

              {/* 录入条 */}
              <P3StaggerItem>
                <div className="flex min-w-0 items-stretch">
                  <div className="min-w-0 flex-1" style={{ clipPath: slantClip(12), background: P3R.panel }}>
                    <input value={nlText} onChange={(e) => setNlText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void handleEntry(); }} placeholder="一句话记多笔；空着点 = 手动填" aria-label="一句话记账"
                      className="h-full w-full bg-transparent px-5 py-3.5 text-[14px] font-bold outline-none placeholder:font-semibold" style={{ color: P3R.ink }} />
                  </div>
                  <button type="button" onClick={() => { void handleEntry(); }} disabled={nlBusy} className="relative -ml-2 shrink-0 px-5 py-3.5 text-[15px] font-black active:scale-[0.96] disabled:opacity-60" style={{ clipPath: slantClip(12), background: P3R.blue, color: P3R.onBlue }}>
                    {nlBusy ? <span className="pk-spin inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent align-middle" aria-label="识别中" /> : '记一笔'}
                    <span aria-hidden className="absolute bottom-0 right-3 h-[6px] w-[14px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
                  </button>
                </div>
                <div className="mt-2 flex min-w-0 items-center gap-2">
                  <input ref={shotRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void handleShot(f); }} />
                  <button type="button" onClick={() => { if (!shotBusy) shotRef.current?.click(); }} title="打开相册识别小票" disabled={shotBusy}
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 px-3 text-[12px] font-black disabled:opacity-60" style={{ clipPath: slantClip(6), boxShadow: 'inset 0 0 0 1.5px rgb(var(--p3r-blue-rgb) / 0.55)', color: P3R.roseInk }}>
                    {shotBusy ? <span className="pk-spin inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent" aria-hidden /> : <CameraGlyph />}{shotBusy ? '读图中…' : '拍小票'}
                  </button>
                  {shotHint && <span className="min-w-0 flex-1 truncate text-[11px] font-bold" style={{ color: P3R.grey }}>{shotHint}</span>}
                </div>
              </P3StaggerItem>

              <P3StaggerItem>
                <P3Segment value={view} onChange={(v) => setView(v as 'list' | 'stats')} items={[{ id: 'list', label: '流水' }, { id: 'stats', label: '统计' }]} />
              </P3StaggerItem>

              {view === 'list' ? (
                <P3StaggerItem className="flex min-w-0 flex-col gap-4">
                  <MonthNav label={monthLabel(listMonth)} sub={<>支出 <b className="font-cond text-[14px]">{CNY}{fmtMoney(monthSum.exp)}</b>{monthSum.inc > 0 && <> · 收入 <b className="font-cond text-[14px]">{CNY}{fmtMoney(monthSum.inc)}</b></>}</>}
                    onPrev={() => setListMonth((m) => shiftMonth(m, -1))} onNext={() => setListMonth((m) => shiftMonth(m, 1))} nextDisabled={listMonth >= CURRENT_MONTH} />
                  {grouped.length === 0 && (
                    <div className="relative mx-auto flex min-h-[150px] w-full max-w-md flex-col items-center justify-center gap-1.5 overflow-hidden px-6 py-6 text-center" style={{ clipPath: slantClip(26), background: 'rgb(var(--p3r-wash) / 0.72)' }}>
                      <span aria-hidden className="pointer-events-none absolute -top-2 left-3 font-cond text-[64px] leading-none" style={{ color: 'var(--p3r-ghost)' }}>EMPTY</span>
                      <span className="relative text-[16px] font-black" style={{ color: P3R.ink }}>{list.length === 0 ? '还没有记录，记一笔开始吧' : '这个月还没有记录'}</span>
                      <span className="relative text-[13px] font-bold" style={{ color: P3R.grey }}>暂无可追踪的信号</span>
                    </div>
                  )}
                  {grouped.map(([date, es]) => {
                    const [y, m, d] = date.split('-').map(Number);
                    const wk = new Date(y, m - 1, d).getDay();
                    return (
                      <div key={date} className="min-w-0">
                        <div className="mb-1.5 flex min-w-0 items-center gap-2 px-1">
                          <span className="px-3 py-0.5 font-cond text-[14px]" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(5) }}>{String(m).padStart(2, '0')}/{String(d).padStart(2, '0')}</span>
                          <span className="px-1.5 py-0.5 font-cond text-[11px]" style={{ background: wk === 0 || wk === 6 ? P3R.blue : 'var(--p3r-chip)', color: wk === 0 || wk === 6 ? P3R.onBlue : P3R.ink, clipPath: slantClip(3) }}>{WEEK_EN[wk]}</span>
                          <span className="truncate text-[12px] font-black" style={{ color: P3R.inkSoft }}>{ledgerDateLabel(date)} · {weekdayCN(date)}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">{es.map((e, i) => <LedgerRow key={e.id} e={e} alt={i % 2 === 1} onClick={() => { setDel(e); setDelOpen(true); }} />)}</div>
                      </div>
                    );
                  })}
                </P3StaggerItem>
              ) : (
                <P3StaggerItem><LedgerStats entries={list} forceEmpty={state === 'empty'} /></P3StaggerItem>
              )}
            </P3Stagger>
          ) : (
            <AssetBoard empty={state === 'first'} />
          )}
        </motion.div>
      </AnimatePresence>

      <LedgerEntrySheetView open={draftOpen} onClose={() => setDraftOpen(false)} initial={draft ?? undefined} hint={shotHint} onSaved={onSaved} />
      <LedgerBatchSheetView open={batchOpen} onClose={() => setBatchOpen(false)} initial={batchRows} initialDate={batchDate} onSaved={onSaved} />
      <LedgerBudgetSheetView open={budgetOpen} onClose={() => setBudgetOpen(false)} days={Math.max(1, Math.round((new Date(`${LEDGER_CYCLE.end}T00:00:00`).getTime() - new Date(`${LEDGER_CYCLE.start}T00:00:00`).getTime()) / 86_400_000) + 1)}
        onSaved={(m, savings, resetDay) => ledgerOps.saveBudget(m, savings, resetDay).then(() => { setListMonth(CURRENT_MONTH); toast.success(`预算已定：${CNY}${fmtMoney(m)}`); })} />
      <LedgerReconcileSheetView open={adjustOpen} onClose={() => setAdjustOpen(false)} initial={needsSetup} remaining={ADJUST_LEFT} accounts={LEDGER_ACCOUNTS} onSaved={() => { if (needsSetup) setState('normal'); toast.success(needsSetup ? '余额已记下' : '对账完成'); }} />
      <LedgerDeleteConfirmView open={delOpen} target={del} onClose={() => setDelOpen(false)} onConfirm={() => { if (del) ledgerOps.remove(del.id).then(() => toast('已删除这一笔')).catch((e) => toast(`删除失败：${(e as Error)?.message ?? '请重试'}`)); }} />
      <LedgerSavedModalView open={!!saved} onClose={() => setSaved(null)} title={saved ?? ''} />
    </div>
  );
}
