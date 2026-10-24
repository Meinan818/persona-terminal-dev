/**
 * 确认这一笔（真实 src/pages/Ledger.tsx · draft SheetModal）。
 * 排布同真实（按填写频次）：进/出+金额 → 类目/来源+到账账户 → 日期 → 学习加点 → 值得吗 → 登记资产 → 渠道/细分类目 → 备注。
 * 演示：?variant=income | study | shot（读图提示）
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import type { AttributeId, LedgerExpenseType, SpendWorth } from '@real/types';
import { P4Sheet, P4Button, P4Input, useToast } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { P5Label, P5Pick, TagPicker, DateQuickPicker } from '@yellow/screens/pkg5/ui';
import { ATTR_IDS, ATTR_NAMES, CATEGORY_KEYS, CNY, DEFAULT_CHANNELS, DEFAULT_INCOME_SOURCES, P5_TODAY, catMeta, fmtMoney, incomeTypeFromSource, isGrowthCategory, moneyFromInput, sanitizeMoneyInput } from '@yellow/adapters/pkg5';
import { ledgerOps } from '@/themes/ledgerOperations';
import { useAppStore } from '@/store';

export interface EntryDraft {
  direction: 'expense' | 'income'; amount: string; type: LedgerExpenseType; incomeSource: string; category: string; channel: string; note: string; date: string;
  attribute?: AttributeId; attrPoints: number; evalWorth?: SpendWorth; registerAsset: boolean;
}
export const emptyDraft = (): EntryDraft => ({ direction: 'expense', amount: '', type: 'food', incomeSource: '', category: '', channel: '微信', note: '', date: P5_TODAY, attrPoints: 1, registerAsset: false });

export interface LedgerEntrySheetProps { open: boolean; onClose: () => void; initial?: EntryDraft; hint?: string | null; spendEval?: boolean; onSaved?: (summary: string) => void }

export function LedgerEntrySheetView({ open, onClose, initial, hint, spendEval = true, onSaved }: LedgerEntrySheetProps) {
  const toast = useToast();
  const settings = useAppStore((s) => s.settings);
  const [d, setD] = useState<EntryDraft>(initial ?? emptyDraft());
  const [channels, setChannels] = useState(settings.ledgerChannels ?? DEFAULT_CHANNELS);
  const [sources, setSources] = useState(settings.ledgerIncomeSources ?? DEFAULT_INCOME_SOURCES);
  const [subCats, setSubCats] = useState<string[]>(settings.ledgerCategories ?? []);
  const [chExpanded, setChExpanded] = useState(false);
  const [subOpen, setSubOpen] = useState(!!initial?.category);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setD(initial ?? { ...emptyDraft(), channel: settings.ledgerLastChannel || emptyDraft().channel });
    setChannels(settings.ledgerChannels ?? DEFAULT_CHANNELS);
    setSources(settings.ledgerIncomeSources ?? DEFAULT_INCOME_SOURCES);
    setSubCats(settings.ledgerCategories ?? []);
    setSubOpen(!!initial?.category);
    setSaving(false);
  }, [open]); // eslint-disable-line
  const set = (p: Partial<EntryDraft>) => setD((x) => ({ ...x, ...p }));
  const amt = moneyFromInput(d.amount);
  const save = () => {
    if (!amt || saving) return;
    setSaving(true);
    const label = d.note.trim() || (d.direction === 'income' ? d.incomeSource.trim() : d.category.trim() || d.channel.trim()) || (d.direction === 'expense' ? '支出' : '收入');
    const s = `${d.direction === 'expense' ? '−' : '+'}${CNY}${fmtMoney(amt)} · ${label}`;
    ledgerOps.saveEntry({
      direction: d.direction,
      amount: amt,
      type: d.direction === 'expense' ? d.type : undefined,
      category: (d.direction === 'income' ? d.incomeSource : d.category).trim() || undefined,
      channel: d.channel || undefined,
      note: d.note || undefined,
      date: d.date,
      source: 'manual',
      incomeType: d.direction === 'income' ? incomeTypeFromSource(d.incomeSource) : undefined,
      ...(d.direction === 'expense' && isGrowthCategory(d.type) && d.attribute ? { attribute: d.attribute } : {}),
      ...(d.evalWorth ? { evalWorth: d.evalWorth } : {}),
    }, {
      attribute: d.attribute,
      attrPoints: d.attrPoints,
      evalWorth: d.evalWorth,
      registerAsset: d.direction === 'expense' && d.registerAsset,
    }).then(() => {
      onClose();
      onSaved ? onSaved(s) : toast.success(`记账完成 ${s}`);
    }).catch((e) => {
      setSaving(false);
      toast.error(`记账失败：${(e as Error)?.message ?? '请重试'}`);
    });
  };
  const add = (kind: 'channel' | 'incomeSource' | 'category', setter: (f: (x: string[]) => string[]) => void) => (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    setter((xs) => (xs.includes(v) ? xs : [...xs, v]));
    void ledgerOps.rememberOption(kind, v).catch((e) => toast.error(`选项保存失败：${(e as Error)?.message ?? '请重试'}`));
  };

  return (
    <P4Sheet open={open} onClose={onClose} title="确认这一笔" en="ENTRY CHECK" size="tall"
      footer={<P4Button block size="lg" onClick={save} disabled={saving || !amt}>{saving ? '保存中…' : '保存'}</P4Button>}>
      <div className="flex min-w-0 flex-col gap-4 pt-1">
        {hint && (
          <div className="flex min-w-0 items-start gap-2 rounded-sm border-thin border-p4g-line bg-p4g-yellow px-3 py-2 text-meta font-bold text-p4g-black">
            <span aria-hidden>📷</span><span className="min-w-0">{hint}</span>
          </div>
        )}
        {/* 进 / 出 + 金额 */}
        <div className="flex min-w-0 items-stretch gap-2">
          <div className="flex shrink-0 flex-col gap-1.5">
            {(['expense', 'income'] as const).map((dir) => (
              <button key={dir} type="button" onClick={() => set({ direction: dir })} aria-pressed={d.direction === dir}
                className={cx('p4g-press h-9 w-16 rounded-xs border-3 font-display text-meta font-bold', d.direction === dir ? (dir === 'expense' ? 'border-p4g-black bg-p4g-black text-p4g-yellow night:border-p4g-yellow' : 'border-p4g-black bg-p4g-green text-p4g-black') : 'border-p4g-line bg-p4g-surface-2 text-p4g-ink-soft')}>
                {dir === 'expense' ? '支出' : '收入'}
              </button>
            ))}
          </div>
          <label className="relative flex min-w-0 flex-1 items-center gap-2 rounded-sm border-3 border-p4g-line bg-p4g-surface-2 px-3 focus-within:shadow-[4px_4px_0_var(--p4g-yellow)]">
            <span className="p4g-num text-h2 text-p4g-ink-soft">{CNY}</span>
            <input type="text" inputMode="decimal" autoFocus value={d.amount} placeholder="0" aria-label="金额"
              onChange={(e) => set({ amount: sanitizeMoneyInput(e.target.value) })}
              className="min-w-0 flex-1 bg-transparent p4g-num text-[clamp(28px,8vw,38px)] text-p4g-ink outline-none focus-visible:outline-none placeholder:text-p4g-muted" />
            <span aria-hidden className="absolute -top-2.5 right-2 rotate-3 rounded-xs bg-p4g-orange px-1.5 font-display text-2xs font-bold italic text-p4g-black">{d.direction === 'expense' ? 'OUT' : 'IN'}</span>
          </label>
        </div>

        {d.direction === 'expense' ? (
          <div className="flex min-w-0 flex-wrap gap-2">
            {CATEGORY_KEYS.map((t) => <P5Pick key={t} on={d.type === t} onClick={() => set({ type: t })}>{catMeta(t).icon} {catMeta(t).label}</P5Pick>)}
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-2">
            <P5Label>来源</P5Label>
            <TagPicker options={sources} value={d.incomeSource} onChange={(v) => set({ incomeSource: v })} onAdd={add('incomeSource', setSources)} addPlaceholder="新来源" accent="green" />
            {incomeTypeFromSource(d.incomeSource) === 'labor' && <span className="w-max rounded-xs bg-p4g-green px-2 py-0.5 font-display text-meta font-bold text-p4g-black">劳动所得 · 记账 +10 SP</span>}
            <P5Label aside="可选" className="pt-1">到账账户</P5Label>
            <TagPicker options={channels} value={d.channel} onChange={(v) => set({ channel: v })} onAdd={add('channel', setChannels)} addPlaceholder="新账户" collapsedCount={6} expanded={chExpanded} onToggleExpand={() => setChExpanded((x) => !x)} />
          </div>
        )}

        <div className="flex min-w-0 flex-col gap-2">
          <P5Label>日期</P5Label>
          <DateQuickPicker value={d.date} onChange={(v) => set({ date: v })} />
        </div>

        {d.direction === 'expense' && isGrowthCategory(d.type) && (
          <div className="min-w-0 rounded-sm border-3 border-p4g-line bg-p4g-yellow p-3 text-p4g-black">
            <div className="font-display text-meta font-bold">这笔学习投入，让哪一维成长？<span className="font-normal opacity-70"> 选了才加点</span></div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ATTR_IDS.map((id) => <P5Pick key={id} tone="green" on={d.attribute === id} onClick={() => set({ attribute: d.attribute === id ? undefined : id })}>{ATTR_NAMES[id]}</P5Pick>)}
            </div>
            {d.attribute && (
              <div className="mt-2 flex items-center gap-2 text-meta font-bold">
                <span>加点</span>
                {[1, 2].map((p) => <button key={p} type="button" onClick={() => set({ attrPoints: p })} className={cx('p4g-press h-8 w-9 rounded-xs border-thin border-p4g-black p4g-num', d.attrPoints === p ? 'bg-p4g-black text-p4g-yellow' : 'bg-white text-p4g-black')}>+{p}</button>)}
                <span className="opacity-70">每日封顶 +2</span>
              </div>
            )}
          </div>
        )}

        {d.direction === 'expense' && spendEval && (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="font-display text-meta font-bold text-p4g-ink">这笔值得吗？</span>
            {(['worth', 'notWorth'] as const).map((w) => <P5Pick key={w} tone={w === 'worth' ? 'green' : 'danger'} on={d.evalWorth === w} onClick={() => set({ evalWorth: d.evalWorth === w ? undefined : w })}>{w === 'worth' ? '值得' : '不值'}</P5Pick>)}
            {d.evalWorth === 'worth' && <span className="font-display text-meta font-bold text-p4g-success">+1 SP</span>}
          </div>
        )}

        {d.direction === 'expense' && amt >= 300 && (
          <button type="button" onClick={() => set({ registerAsset: !d.registerAsset })} aria-pressed={d.registerAsset}
            className={cx('p4g-press flex w-full min-w-0 items-center gap-2.5 rounded-sm border-3 px-3 py-2.5 text-left font-display text-body font-bold', d.registerAsset ? 'border-p4g-black bg-p4g-orange text-p4g-black' : 'border-p4g-line bg-p4g-surface-2 text-p4g-ink')}>
            <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded-xs border-thin text-2xs', d.registerAsset ? 'border-p4g-black bg-p4g-black text-p4g-yellow' : 'border-p4g-line')}>{d.registerAsset ? '✓' : ''}</span>
            <span className="min-w-0 truncate">同时登记为固定资产</span>
          </button>
        )}

        {d.direction === 'expense' && (
          <>
            <div className="flex min-w-0 flex-col gap-2">
              <P5Label>支付渠道</P5Label>
              <TagPicker options={channels} value={d.channel} onChange={(v) => set({ channel: v })} onAdd={add('channel', setChannels)} addPlaceholder="新渠道" collapsedCount={6} expanded={chExpanded} onToggleExpand={() => setChExpanded((x) => !x)} />
            </div>
            {subOpen ? (
              <div className="flex min-w-0 flex-col gap-2">
                <P5Label aside="可选">细分类目</P5Label>
                <TagPicker options={subCats} value={d.category} onChange={(v) => set({ category: v })} onAdd={add('category', setSubCats)} addPlaceholder="如：早餐" />
              </div>
            ) : (
              <button type="button" onClick={() => setSubOpen(true)} className="w-max font-display text-meta font-bold text-p4g-ink-soft underline decoration-p4g-orange decoration-2 underline-offset-4">＋ 细分类目（可选）</button>
            )}
          </>
        )}

        <P4Input value={d.note} onChange={(e) => set({ note: e.target.value })} placeholder="备注（可选）" aria-label="备注" />
      </div>
    </P4Sheet>
  );
}

export default function LedgerEntrySheet({ open, onClose, params }: OverlayProps) {
  const v = params?.get('variant');
  const initial: EntryDraft = v === 'income'
    ? { ...emptyDraft(), direction: 'income', amount: '6500', incomeSource: '工资', channel: '银行卡' }
    : v === 'study' ? { ...emptyDraft(), amount: '399', type: 'study', note: '线上课程 · 色彩构成', attribute: 'knowledge', channel: '支付宝' }
      : { ...emptyDraft(), amount: v === 'shot' ? '36.5' : '', note: v === 'shot' ? '便利店' : '' };
  return <LedgerEntrySheetView open={open} onClose={onClose} initial={initial} hint={v === 'shot' ? '看图读的，核对一下金额' : null} />;
}
