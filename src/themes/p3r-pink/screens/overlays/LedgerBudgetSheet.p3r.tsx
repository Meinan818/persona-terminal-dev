/**
 * 本月预算 / 新的一程 · 立个目标（真实 src/pages/Ledger.tsx#BudgetSheet + BudgetDualInput）。
 * 月预算 ⇄ 日均 联动；省钱挑战默认收起（每月限改 2 次，用完锁定）；每月重置日（发薪日）。
 * 路由：?variant=newCycle（新周期首次打开）| locked（本月修改次数已用完）
 */
import { useEffect, useRef, useState } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import { P3Sheet, P3Button, P3Stepper, P3R, useToast } from '@pink/kit';
import { FLabel, MoneyBox, NoteBox, TrophyGlyph } from '@pink/screens/pkg5/ui';
import { CNY, fmtMoney, fmtPlain, monthLabel } from '@pink/mock/pkg5';
import { useRealLedgerBudget } from '@/themes/ledgerBudgetData';

export function LedgerBudgetSheetView({ open, onClose, newCycle, locked: forceLocked, days = 31, onSaved }: { open: boolean; onClose: () => void; newCycle?: boolean; locked?: boolean; days?: number; onSaved?: (monthly: number) => void }) {
  const toast = useToast();
  // 预算 / 省钱目标 / 修改次数 / 重置日全部取真实 store，不再用演示常量 6000 / 500。
  const budget = useRealLedgerBudget();
  const current = budget.monthlyLimit;
  const editsLeft = forceLocked ? 0 : Math.max(0, 2 - budget.savingsGoalEdits);
  const [monthly, setMonthly] = useState('');
  const [daily, setDaily] = useState('');
  const [savings, setSavings] = useState('');
  const [challenge, setChallenge] = useState(false);
  const [resetDay, setResetDay] = useState(budget.resetDay);
  const fromDaily = useRef<string | null>(null);
  const dailyOf = (m: string) => { const n = Number(m); return n > 0 ? fmtPlain(n / days) : ''; };
  useEffect(() => { if (open) { setMonthly(String(current)); setDaily(dailyOf(String(current))); setSavings(String(budget.savingsGoal)); setChallenge(!newCycle); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (fromDaily.current === monthly) { fromDaily.current = null; return; } setDaily(dailyOf(monthly)); }, [monthly]); // eslint-disable-line react-hooks/exhaustive-deps
  const m = Number(monthly);
  const locked = editsLeft <= 0;
  return (
    <P3Sheet open={open} onClose={onClose} title={newCycle ? '新的一程 · 立个目标' : '本月预算'} en={newCycle ? 'NEW CYCLE' : 'BUDGET'}
      footer={<P3Button block size="lg" corner disabled={!(m > 0)} onClick={() => { onClose(); if (onSaved) onSaved(m); else toast.success(`预算已定：${CNY}${fmtMoney(m)}`); }}>{newCycle ? '就这么定' : '保存'}</P3Button>}>
      <div className="flex min-w-0 flex-col gap-4 pt-1">
        <NoteBox>
          {newCycle ? '新的一程开始了——给自己定个花费节奏，和一个想攒下的小目标。' : '设一个本月的花费上限——它是你的纪律线，不影响总余额。'}
          {budget.carriedFrom && <span className="mt-1 block text-[12px] font-bold" style={{ color: P3R.roseInk }}>花费目标沿用了上期（{monthLabel(budget.carriedFrom)}）的 {CNY}{fmtMoney(current)}，可以直接改。</span>}
        </NoteBox>
        <div className="flex min-w-0 flex-col gap-2">
          <FLabel aside={`改一个，另一个按 ${days} 天自动算`}>花费目标</FLabel>
          <div className="grid grid-cols-2 gap-2">
            <MoneyBox label="月预算" value={monthly} placeholder="3000" onChange={setMonthly} />
            <MoneyBox label="日均" value={daily} placeholder="100" accent onChange={(v) => { setDaily(v); const d = Number(v); const next = d > 0 ? fmtPlain(d * days) : ''; fromDaily.current = next; setMonthly(next); }} />
          </div>
        </div>
        {challenge ? (
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
              <FLabel><TrophyGlyph /> 省钱挑战 · 这个月想省下</FLabel>
              <span className="shrink-0 text-[11px] font-black" style={{ color: locked ? 'var(--p3r-coral-ink)' : P3R.grey }}>{locked ? '本月修改次数已用完' : `还可改 ${editsLeft} 次`}</span>
            </div>
            <MoneyBox label="想省下" value={savings} placeholder="500" disabled={locked} onChange={setSavings} />
            <p className="text-[12px] font-bold" style={{ color: P3R.grey }}>月底「预算 − 实际花费」达到这个数，次月结算 +10 SP · 每月最多改 2 次，免得边花边改目标。</p>
          </div>
        ) : (
          <button type="button" onClick={() => setChallenge(true)} className="w-max text-[13px] font-black underline decoration-2 underline-offset-4" style={{ color: P3R.inkSoft, textDecorationColor: P3R.blue }}>＋ 立个省钱挑战（可选）</button>
        )}
        <div className="flex min-w-0 flex-col gap-2">
          <FLabel aside="发薪日 · 决定何时提醒你规划新一程">每月重置日 | 发薪日</FLabel>
          <div className="flex items-center gap-3">
            <P3Stepper value={resetDay} onChange={setResetDay} min={1} max={28} unit="号" />
            <span className="text-[12px] font-bold" style={{ color: P3R.grey }}>{resetDay === 1 ? '（自然月初）' : '起算一个周期'}</span>
          </div>
        </div>
      </div>
    </P3Sheet>
  );
}

export default function LedgerBudgetSheet({ open, onClose, params }: OverlayProps) {
  const v = params?.get('variant');
  return <LedgerBudgetSheetView open={open} onClose={onClose} newCycle={v === 'newCycle'} locked={v === 'locked'} />;
}
