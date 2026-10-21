/**
 * 余额对账 / 设置当前余额（真实 src/pages/Ledger.tsx#AdjustSheet，多账户对账）。
 * 每账户一行：现在余额（负债显示「欠 ¥N」）+ 输入；提交按钮多态。?variant=initial（开局，不占轮数）| used（本月对账已用完）| loading（账本还在读取…）
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Sheet, P4Button, useToast } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { CNY, LEDGER_ACCOUNTS, fmtMoney, fmtPlain, fmtSigned, roundMoney, sanitizeMoneyInput, type P5Account } from '@yellow/adapters/pkg5';

export function LedgerReconcileSheetView({ open, onClose, initial, remaining = 2, ready = true, accounts = LEDGER_ACCOUNTS, onSaved }: { open: boolean; onClose: () => void; initial?: boolean; remaining?: number; ready?: boolean; accounts?: P5Account[]; onSaved?: () => void }) {
  const toast = useToast();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setVals({}); setBusy(false); } }, [open]);
  const total = accounts.reduce((s, a) => s + a.balance, 0);
  const changed = accounts.filter((a) => { const raw = vals[a.name] ?? ''; return raw.trim() !== '' && raw !== '-' && Number.isFinite(Number(raw)) && roundMoney(Number(raw)) !== a.balance; });
  const canSave = ready && !busy && (initial || remaining > 0) && changed.length > 0;
  const label = !ready ? '账本还在读取…' : busy ? '记录中…' : initial ? (changed.length ? `就这么记（${changed.length} 个账户）` : '填一个账户的余额') : remaining > 0 ? (changed.length ? `校准 ${changed.length} 个账户` : '改了哪个账户就校准哪个') : '本月对账已用完';
  const balanceText = (a: P5Account) => (a.isDebt && a.balance < 0 ? `欠 ${CNY}${fmtMoney(-a.balance)}` : fmtSigned(a.balance));
  return (
    <P4Sheet open={open} onClose={onClose} title={initial ? '设置当前余额' : '余额对账'} en={initial ? 'OPENING BALANCE' : 'RECONCILE'} size="tall"
      footer={<P4Button block size="lg" disabled={!canSave} onClick={() => { setBusy(true); window.setTimeout(() => { onClose(); onSaved ? onSaved() : toast.success(initial ? '余额已记下' : `已校准 ${changed.length} 个账户`); }, 420); }}>{label}</P4Button>}>
      <div className="flex min-w-0 flex-col gap-3 pt-1">
        <p className="text-body leading-relaxed text-p4g-ink-soft">
          {initial
            ? '按账户填入你现在的余额（支付宝 / 微信 / 银行卡…，只填一个也行），之后随时可「对账」修正；这一次不占对账轮数。'
            : <>把各账户校准到真实余额（打开支付宝 / 微信对一下）。一次提交算一轮，本月还可对账 <b className="p4g-num text-p4g-ink">{Math.max(0, remaining)}</b> 轮。信用卡这类负债账户余额可以是负数。</>}
        </p>
        {!initial && (
          <div className="flex min-w-0 items-baseline justify-between rounded-sm border-3 border-p4g-black bg-p4g-black px-3 py-2 text-white night:border-p4g-yellow">
            <span className="font-display text-meta font-bold">总余额：</span>
            <span className="p4g-num text-h2 text-p4g-yellow">{fmtSigned(total)}</span>
          </div>
        )}
        {accounts.map((a, i) => (
          <div key={a.name} className="min-w-0 rounded-sm border-3 border-p4g-line px-3 py-2.5" style={{ background: 'var(--p4g-surface-grad)' }}>
            <div className="flex min-w-0 items-center justify-between gap-2 text-meta">
              <span className="flex min-w-0 items-center gap-1.5 font-display font-bold text-p4g-ink">
                <span className="truncate">{a.name}</span>
                {a.isDebt && <span className="shrink-0 rounded-xs bg-p4g-danger px-1.5 py-[1px] text-2xs text-[color:var(--p4g-danger-ink)]">负债</span>}
                {a.unassigned && <span className="shrink-0 text-2xs text-p4g-ink-soft">没填账户的流水</span>}
              </span>
              <span className={cx('shrink-0 p4g-num', a.isDebt && a.balance < 0 ? 'text-p4g-danger' : 'text-p4g-ink-soft')}>现在 {balanceText(a)}</span>
            </div>
            <label className="mt-1.5 flex min-w-0 items-center gap-2 rounded-xs border-thin border-p4g-line bg-p4g-surface-2 px-2">
              <span className="p4g-num text-lead text-p4g-ink-soft">{CNY}</span>
              <input type="text" inputMode="decimal" autoFocus={i === 0} aria-label={`${a.name} 余额`} value={vals[a.name] ?? ''}
                onChange={(e) => setVals((v) => ({ ...v, [a.name]: sanitizeMoneyInput(e.target.value, { allowNegative: true }) }))}
                placeholder={a.isDebt ? (a.balance < 0 ? `-${fmtPlain(-a.balance)}` : '0（欠款填负数）') : fmtPlain(a.balance)}
                className="h-10 min-w-0 flex-1 bg-transparent p4g-num text-h3 text-p4g-ink outline-none focus-visible:outline-none placeholder:text-p4g-muted" />
            </label>
          </div>
        ))}
      </div>
    </P4Sheet>
  );
}

export default function LedgerReconcileSheet({ open, onClose, params }: OverlayProps) {
  const v = params?.get('variant');
  return <LedgerReconcileSheetView open={open} onClose={onClose} initial={v === 'initial'} remaining={v === 'used' ? 0 : 2} ready={v !== 'loading'} />;
}
