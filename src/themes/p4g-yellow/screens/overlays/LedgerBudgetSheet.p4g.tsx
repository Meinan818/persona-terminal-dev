/**
 * 本月预算 / 新的一程 · 立个目标（真实 src/pages/Ledger.tsx#BudgetSheet + BudgetDualInput）。
 * 月预算 ⇄ 日均 联动；省钱挑战默认收起（每月限改 2 次）；每月重置日（发薪日）。?variant=newCycle
 */
import { useEffect, useRef, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Sheet, P4Button, P4Stepper, useToast } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { P5Label } from '@yellow/screens/pkg5/ui';
import { CNY, LEDGER_BUDGET, LEDGER_RESET_DAY, fmtMoney, fmtPlain, monthLabel, sanitizeMoneyInput } from '@yellow/adapters/pkg5';

function MoneyBox({ label, value, onChange, placeholder, accent, disabled }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; accent?: boolean; disabled?: boolean }) {
  return (
    <label className={cx('flex min-w-0 cursor-text flex-col rounded-sm border-3 px-3 py-2', accent ? 'border-p4g-black bg-p4g-yellow text-p4g-black' : 'border-p4g-line bg-p4g-surface-2 text-p4g-ink', disabled && 'opacity-60')}>
      <span className="font-display text-2xs font-bold tracking-wider opacity-75">{label}</span>
      <span className="flex min-w-0 items-baseline gap-1">
        <span className="p4g-num text-body opacity-60">{CNY}</span>
        <input type="text" inputMode="decimal" value={value} placeholder={placeholder} disabled={disabled} onChange={(e) => onChange(sanitizeMoneyInput(e.target.value))}
          className="min-w-0 flex-1 bg-transparent p4g-num text-[clamp(22px,6vw,28px)] outline-none focus-visible:outline-none placeholder:opacity-40 disabled:cursor-not-allowed" />
      </span>
    </label>
  );
}

export function LedgerBudgetSheetView({ open, onClose, newCycle, days = 31, onSaved }: { open: boolean; onClose: () => void; newCycle?: boolean; days?: number; onSaved?: (monthly: number) => void }) {
  const toast = useToast();
  const current = LEDGER_BUDGET.monthlyLimit;
  const editsLeft = Math.max(0, 2 - LEDGER_BUDGET.savingsGoalEdits);
  const [monthly, setMonthly] = useState('');
  const [daily, setDaily] = useState('');
  const [savings, setSavings] = useState('');
  const [challenge, setChallenge] = useState(false);
  const [resetDay, setResetDay] = useState(LEDGER_RESET_DAY);
  const fromDaily = useRef<string | null>(null);
  const dailyOf = (m: string) => { const n = Number(m); return n > 0 ? fmtPlain(n / days) : ''; };
  useEffect(() => { if (open) { setMonthly(String(current)); setDaily(dailyOf(String(current))); setSavings(String(LEDGER_BUDGET.savingsGoal)); setChallenge(newCycle ? false : true); } }, [open]); // eslint-disable-line
  useEffect(() => { if (fromDaily.current === monthly) { fromDaily.current = null; return; } setDaily(dailyOf(monthly)); }, [monthly]); // eslint-disable-line
  const m = Number(monthly);
  const locked = editsLeft <= 0;
  return (
    <P4Sheet open={open} onClose={onClose} title={newCycle ? '新的一程 · 立个目标' : '本月预算'} en={newCycle ? 'NEW CYCLE' : 'BUDGET'}
      footer={<P4Button block size="lg" disabled={!(m > 0)} onClick={() => { onClose(); onSaved ? onSaved(m) : toast.success(`预算已定：${CNY}${fmtMoney(m)}`); }}>{newCycle ? '就这么定' : '保存'}</P4Button>}>
      <div className="flex min-w-0 flex-col gap-4 pt-1">
        <div className="relative min-w-0 rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] px-4 py-3 text-body leading-relaxed text-[color:var(--p4g-msg-ink)] shadow-plate night:border-p4g-yellow">
          <span aria-hidden className="mr-1 text-p4g-yellow">&gt;</span>
          {newCycle ? '新的一程开始了——给自己定个花费节奏，和一个想攒下的小目标。' : '设一个本月的花费上限——它是你的纪律线，不影响总余额。'}
          {LEDGER_BUDGET.carriedFrom && <span className="mt-1 block text-meta text-p4g-yellow">花费目标沿用了上期（{monthLabel(LEDGER_BUDGET.carriedFrom)}）的 {CNY}{fmtMoney(current)}，可以直接改。</span>}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <P5Label aside={`改一个，另一个按 ${days} 天自动算`}>花费目标</P5Label>
          <div className="grid grid-cols-2 gap-2">
            <MoneyBox label="月预算" value={monthly} placeholder="3000" onChange={setMonthly} />
            <MoneyBox label="日均" value={daily} placeholder="100" accent onChange={(v) => { setDaily(v); const d = Number(v); const next = d > 0 ? fmtPlain(d * days) : ''; fromDaily.current = next; setMonthly(next); }} />
          </div>
        </div>
        {challenge ? (
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex min-w-0 items-baseline justify-between gap-2">
              <P5Label>🏆 省钱挑战 · 这个月想省下</P5Label>
              <span className="shrink-0 font-display text-2xs font-bold text-p4g-ink-soft">{locked ? '本月修改次数已用完' : `还可改 ${editsLeft} 次`}</span>
            </div>
            <MoneyBox label="想省下" value={savings} placeholder="500" disabled={locked} onChange={setSavings} />
            <p className="text-meta text-p4g-ink-soft">月底「预算 − 实际花费」达到这个数，次月结算 +10 SP 🎉</p>
          </div>
        ) : (
          <button type="button" onClick={() => setChallenge(true)} className="w-max font-display text-meta font-bold text-p4g-ink-soft underline decoration-p4g-orange decoration-2 underline-offset-4">＋ 立个省钱挑战（可选）</button>
        )}
        <div className="flex min-w-0 flex-col gap-2">
          <P5Label aside="发薪日 · 决定何时提醒你规划新一程">每月重置日</P5Label>
          <div className="flex items-center gap-3">
            <P4Stepper value={resetDay} onChange={setResetDay} min={1} max={28} label="每月重置日" />
            <span className="font-display text-meta font-bold text-p4g-ink-soft">号{resetDay === 1 ? '（自然月初）' : '起算'}</span>
          </div>
        </div>
      </div>
    </P4Sheet>
  );
}

export default function LedgerBudgetSheet({ open, onClose, params }: OverlayProps) {
  return <LedgerBudgetSheetView open={open} onClose={onClose} newCycle={params?.get('variant') === 'newCycle'} />;
}
