/**
 * 确认这一笔（真实 src/pages/Ledger.tsx · draft SheetModal，p3 频道走 SheetModal p3 抽屉）。
 * 排布同真实（按填写频次）：进/出 + 金额 → 类目 / 来源 + 到账账户 → 日期 → 学习加点 → 值得吗 → 登记资产 → 渠道 / 细分类目 → 备注 → 保存。
 * 状态机改写自黄色版 LedgerEntrySheet（只读参考）。路由：?variant=income | study | shot（读图提示）| saving（保存中…）
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import type { AttributeId, LedgerExpenseType, SpendWorth } from '@real/types';
import { P3Sheet, P3Button, P3Input, P3R, slantClip, useToast } from '@pink/kit';
import { Chip, FLabel, TagPicker, DateQuickPicker, AmountInput, CatMark } from '@pink/screens/pkg5/ui';
import { ATTR_IDS, ATTR_NAMES, CATEGORY_KEYS, CNY, DEFAULT_CHANNELS, DEFAULT_INCOME_SOURCES, P5_TODAY, catMeta, fmtMoney, incomeTypeFromSource, isGrowthCategory, moneyFromInput, sanitizeMoneyInput } from '@pink/mock/pkg5';

export interface EntryDraft {
  direction: 'expense' | 'income'; amount: string; type: LedgerExpenseType; incomeSource: string; category: string; channel: string; note: string; date: string;
  attribute?: AttributeId; attrPoints: number; evalWorth?: SpendWorth; registerAsset: boolean;
}
export const emptyDraft = (): EntryDraft => ({ direction: 'expense', amount: '', type: 'food', incomeSource: '', category: '', channel: '微信', note: '', date: P5_TODAY, attrPoints: 1, registerAsset: false });

export const CameraGlyph = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="miter"><path d="M3 7h4l2-3h6l2 3h4v13H3z" /><circle cx="12" cy="13" r="4" /></svg>
);

export interface LedgerEntrySheetProps { open: boolean; onClose: () => void; initial?: EntryDraft; hint?: string | null; spendEval?: boolean; onSaved?: (summary: string) => void; forceSaving?: boolean }

export function LedgerEntrySheetView({ open, onClose, initial, hint, spendEval = true, onSaved, forceSaving }: LedgerEntrySheetProps) {
  const toast = useToast();
  const [d, setD] = useState<EntryDraft>(initial ?? emptyDraft());
  const [channels, setChannels] = useState(DEFAULT_CHANNELS);
  const [sources, setSources] = useState(DEFAULT_INCOME_SOURCES);
  const [subCats, setSubCats] = useState<string[]>(['早餐', '午饭', '咖啡']);
  const [chExpanded, setChExpanded] = useState(false);
  const [subOpen, setSubOpen] = useState(!!initial?.category);
  const [saving, setSaving] = useState(!!forceSaving);
  useEffect(() => { if (open) { setD(initial ?? emptyDraft()); setSubOpen(!!initial?.category); setSaving(!!forceSaving); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (p: Partial<EntryDraft>) => setD((x) => ({ ...x, ...p }));
  const amt = moneyFromInput(d.amount);
  const save = () => {
    if (!amt || saving) return;
    setSaving(true);
    window.setTimeout(() => {
      const label = d.note.trim() || (d.direction === 'income' ? d.incomeSource.trim() : d.category.trim() || d.channel.trim()) || (d.direction === 'expense' ? '支出' : '收入');
      const s = `${d.direction === 'expense' ? '−' : '+'}${CNY}${fmtMoney(amt)} · ${label}`;
      onClose();
      if (onSaved) onSaved(s); else toast.success(`记账完成 ${s}`);
    }, 520);
  };
  const add = (setter: (f: (x: string[]) => string[]) => void) => (v: string) => setter((xs) => (xs.includes(v) ? xs : [...xs, v]));

  return (
    <P3Sheet open={open} onClose={onClose} title="确认这一笔" en="ENTRY CHECK" size="tall" busy={saving}
      footer={<P3Button block size="lg" corner onClick={save} busy={saving} busyText="保存中…" disabled={!amt}>保存</P3Button>}>
      <div className="flex min-w-0 flex-col gap-4 pt-1">
        {hint && (
          <div className="flex min-w-0 items-start gap-2 px-4 py-2 text-[13px] font-bold" style={{ background: P3R.cyanPale, color: P3R.ink, clipPath: slantClip(10) }}>
            <span className="mt-0.5 shrink-0" style={{ color: P3R.blue }}><CameraGlyph /></span><span className="min-w-0">{hint}</span>
          </div>
        )}
        {/* 进 / 出 + 金额 */}
        <div className="flex min-w-0 items-stretch gap-2">
          <div className="flex shrink-0 flex-col gap-1.5">
            {(['expense', 'income'] as const).map((dir) => {
              const on = d.direction === dir;
              return (
                <button key={dir} type="button" onClick={() => set({ direction: dir })} aria-pressed={on} className="h-9 w-16 text-[13px] font-black active:scale-95"
                  style={{ clipPath: slantClip(7), background: on ? (dir === 'expense' ? P3R.ink : 'var(--p3r-mint)') : 'var(--p3r-chip)', color: on ? (dir === 'expense' ? 'var(--p3r-on-ink)' : 'var(--p3r-mulberry)') : P3R.inkSoft }}>
                  {dir === 'expense' ? '支出' : '收入'}
                </button>
              );
            })}
          </div>
          <div className="relative min-w-0 flex-1">
            <AmountInput value={d.amount} onChange={(v) => set({ amount: sanitizeMoneyInput(v) })} autoFocus prefix={CNY} />
            <span aria-hidden className="absolute -top-2 right-3 px-2 font-cond text-[11px]" style={{ background: P3R.magenta, color: '#fff', clipPath: slantClip(4) }}>{d.direction === 'expense' ? 'OUT' : 'IN'}</span>
          </div>
        </div>

        {d.direction === 'expense' ? (
          <div className="grid min-w-0 grid-cols-4 gap-2 sm:grid-cols-7">
            {CATEGORY_KEYS.map((t) => {
              const on = d.type === t;
              return (
                <button key={t} type="button" aria-pressed={on} onClick={() => set({ type: t })} className="relative flex min-w-0 flex-col items-center gap-1 py-2 active:scale-95"
                  style={{ clipPath: slantClip(8), background: on ? P3R.ink : 'var(--p3r-row)' }}>
                  <CatMark type={t} size={30} />
                  <span className="truncate text-[12px] font-black" style={{ color: on ? 'var(--p3r-on-ink)' : P3R.ink }}>{catMeta(t).label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-2">
            <FLabel>来源</FLabel>
            <TagPicker options={sources} value={d.incomeSource} onChange={(v) => set({ incomeSource: v })} onAdd={add(setSources)} addPlaceholder="新来源" />
            {incomeTypeFromSource(d.incomeSource) === 'labor' && <span className="w-max px-3 py-0.5 text-[12px] font-black" style={{ background: 'var(--p3r-mint)', color: 'var(--p3r-mulberry)', clipPath: slantClip(5) }}>劳动所得 · 记账 +10 SP</span>}
            <FLabel aside="可选" className="pt-1">到账账户</FLabel>
            <TagPicker options={channels} value={d.channel} onChange={(v) => set({ channel: v })} onAdd={add(setChannels)} addPlaceholder="新账户" collapsedCount={6} expanded={chExpanded} onToggleExpand={() => setChExpanded((x) => !x)} />
          </div>
        )}

        <div className="flex min-w-0 flex-col gap-2">
          <FLabel>日期</FLabel>
          <DateQuickPicker value={d.date} onChange={(v) => set({ date: v })} />
        </div>

        {d.direction === 'expense' && isGrowthCategory(d.type) && (
          <div className="min-w-0 px-4 py-3" style={{ background: P3R.cyanPale, clipPath: slantClip(12) }}>
            <div className="text-[13px] font-black" style={{ color: P3R.ink }}>这笔学习投入，让哪一维成长？<span className="font-bold" style={{ color: P3R.grey }}> 选了才加点</span></div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ATTR_IDS.map((id) => <Chip key={id} on={d.attribute === id} onClick={() => set({ attribute: d.attribute === id ? undefined : id })}>{ATTR_NAMES[id]}</Chip>)}
            </div>
            {d.attribute && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] font-black" style={{ color: P3R.ink }}>
                <span>加点</span>
                {[1, 2].map((p) => <Chip key={p} on={d.attrPoints === p} onClick={() => set({ attrPoints: p })}>+{p}</Chip>)}
                <span className="text-[12px] font-bold" style={{ color: P3R.grey }}>每日封顶 +2</span>
              </div>
            )}
          </div>
        )}

        {d.direction === 'expense' && spendEval && (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-[13px] font-black" style={{ color: P3R.ink }}>这笔值得吗？</span>
            {(['worth', 'notWorth'] as const).map((w) => <Chip key={w} on={d.evalWorth === w} onClick={() => set({ evalWorth: d.evalWorth === w ? undefined : w })}>{w === 'worth' ? '值得' : '不值'}</Chip>)}
            {d.evalWorth === 'worth' && <span className="font-cond text-[14px]" style={{ color: P3R.roseInk }}>+1 SP</span>}
          </div>
        )}

        {d.direction === 'expense' && amt >= 300 && (
          <button type="button" onClick={() => set({ registerAsset: !d.registerAsset })} aria-pressed={d.registerAsset}
            className="flex w-full min-w-0 items-center gap-2.5 px-4 py-2.5 text-left text-[14px] font-black"
            style={{ clipPath: slantClip(10), background: d.registerAsset ? P3R.blue : 'var(--p3r-row)', color: d.registerAsset ? P3R.onBlue : P3R.ink }}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[11px]" style={{ clipPath: slantClip(4), background: d.registerAsset ? 'var(--p3r-cream)' : 'var(--p3r-track)', color: 'var(--p3r-mulberry)' }}>{d.registerAsset ? '✓' : ''}</span>
            <span className="min-w-0 truncate">同时登记为固定资产</span>
          </button>
        )}

        {d.direction === 'expense' && (
          <>
            <div className="flex min-w-0 flex-col gap-2">
              <FLabel>支付渠道</FLabel>
              <TagPicker options={channels} value={d.channel} onChange={(v) => set({ channel: v })} onAdd={add(setChannels)} addPlaceholder="新渠道" collapsedCount={6} expanded={chExpanded} onToggleExpand={() => setChExpanded((x) => !x)} />
            </div>
            {subOpen ? (
              <div className="flex min-w-0 flex-col gap-2">
                <FLabel aside="可选">细分类目</FLabel>
                <TagPicker options={subCats} value={d.category} onChange={(v) => set({ category: v })} onAdd={add(setSubCats)} addPlaceholder="如：早餐" />
              </div>
            ) : (
              <button type="button" onClick={() => setSubOpen(true)} className="w-max text-[13px] font-black underline decoration-2 underline-offset-4" style={{ color: P3R.inkSoft, textDecorationColor: P3R.blue }}>＋ 细分类目（可选）</button>
            )}
          </>
        )}

        <P3Input value={d.note} onChange={(e) => set({ note: e.target.value })} placeholder="备注（可选）" aria-label="备注" />
      </div>
    </P3Sheet>
  );
}

export default function LedgerEntrySheet({ open, onClose, params }: OverlayProps) {
  const v = params?.get('variant');
  const initial: EntryDraft = v === 'income'
    ? { ...emptyDraft(), direction: 'income', amount: '6500', incomeSource: '工资', channel: '银行卡' }
    : v === 'study' ? { ...emptyDraft(), amount: '399', type: 'study', note: '线上课程 · 色彩构成', attribute: 'knowledge', channel: '支付宝' }
      : { ...emptyDraft(), amount: v === 'shot' ? '36.5' : v === 'saving' ? '28' : '', note: v === 'shot' ? '便利店' : v === 'saving' ? '咖啡 + 可颂' : '' };
  return <LedgerEntrySheetView open={open} onClose={onClose} initial={initial} hint={v === 'shot' ? '看图读的，核对一下金额' : null} forceSaving={v === 'saving'} />;
}
