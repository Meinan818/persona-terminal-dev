/**
 * 余额对账 / 设置当前余额（真实 src/pages/Ledger.tsx#ReconcileSheet，多账户对账）。
 * 每账户一行：现在余额（负债显示「欠 ¥N」+「负债」签）+ 输入；「没填账户的流水」行；提交按钮多态：
 *   就这么记（N 个账户）/ 填一个账户的余额 / 校准 N 个账户 / 改了哪个账户就校准哪个 / 本月对账已用完 / 账本还在读取… / 记录中…
 * 路由：?variant=initial（开局，不占轮数）| used（本月对账已用完）| loading（账本还在读取…）
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { P3Sheet, P3Button, P3R, slantClip, useToast } from '@blue/kit';
import { CNY, LEDGER_ACCOUNTS, fmtMoney, fmtPlain, fmtSigned, roundMoney, sanitizeMoneyInput, type P5Account } from '@blue/mock/pkg5';
import { NoteBox } from '@blue/screens/pkg5/ui';

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
    <P3Sheet open={open} onClose={onClose} title={initial ? '设置当前余额' : '余额对账'} en={initial ? 'OPENING' : 'RECONCILE'} size="tall" busy={busy}
      footer={<P3Button block size="lg" corner disabled={!canSave && !busy} busy={busy} busyText="记录中…" onClick={() => { setBusy(true); window.setTimeout(() => { onClose(); if (onSaved) onSaved(); else toast.success(initial ? '余额已记下' : `已校准 ${changed.length} 个账户`); }, 520); }}>{label}</P3Button>}>
      <div className="flex min-w-0 flex-col gap-3 pt-1">
        <NoteBox>
          {initial
            ? '按账户填入你现在的余额（支付宝 / 微信 / 银行卡…，只填一个也行），之后随时可「对账」修正；这一次不占对账轮数。'
            : <>把各账户校准到真实余额（打开支付宝 / 微信对一下）。一次提交算一轮，本月还可对账 <b className="font-cond text-[16px]" style={{ color: P3R.roseInk }}>{Math.max(0, remaining)}</b> 轮。信用卡这类负债账户余额可以是负数。</>}
        </NoteBox>
        {!initial && (
          <div className="flex min-w-0 items-baseline justify-between px-5 py-2.5" style={{ background: P3R.ink, clipPath: slantClip(12) }}>
            <span className="text-[13px] font-black" style={{ color: 'var(--p3r-on-ink)' }}>总余额：</span>
            <span className="font-cond text-[26px] leading-none" style={{ color: P3R.blue }}>{fmtSigned(total)}</span>
          </div>
        )}
        {accounts.map((a, i) => (
          <div key={a.name} className="min-w-0 px-4 py-2.5" style={{ clipPath: slantClip(10), background: i % 2 ? 'var(--p3r-row-alt)' : 'var(--p3r-row)' }}>
            <div className="flex min-w-0 items-center justify-between gap-2 text-[12px]">
              <span className="flex min-w-0 items-center gap-1.5 font-black" style={{ color: P3R.ink }}>
                <span className="truncate text-[14px]">{a.name}</span>
                {a.isDebt && <span className="shrink-0 px-1.5 py-[1px] text-[10px] text-white" style={{ background: P3R.magenta, clipPath: slantClip(3) }}>负债</span>}
                {a.unassigned && <span className="shrink-0 text-[11px] font-bold" style={{ color: P3R.grey }}>没填账户的流水</span>}
              </span>
              <span className="shrink-0 font-cond text-[14px]" style={{ color: a.isDebt && a.balance < 0 ? 'var(--p3r-coral-ink)' : P3R.grey }}>现在 {balanceText(a)}</span>
            </div>
            <label className="mt-1.5 flex min-w-0 items-center gap-2 px-3" style={{ background: 'var(--p3r-field)', clipPath: slantClip(6), borderBottom: `2px solid ${P3R.cyan}` }}>
              <span className="font-cond text-[18px]" style={{ color: P3R.grey }}>{CNY}</span>
              <input type="text" inputMode="decimal" aria-label={`${a.name} 余额`} value={vals[a.name] ?? ''}
                onChange={(e) => setVals((v) => ({ ...v, [a.name]: sanitizeMoneyInput(e.target.value, { allowNegative: true }) }))}
                placeholder={a.isDebt ? (a.balance < 0 ? `-${fmtPlain(-a.balance)}` : '0（欠款填负数）') : fmtPlain(a.balance)}
                className="h-10 min-w-0 flex-1 bg-transparent font-cond text-[22px] outline-none placeholder:opacity-35" style={{ color: P3R.blue }} />
            </label>
          </div>
        ))}
      </div>
    </P3Sheet>
  );
}

export default function LedgerReconcileSheet({ open, onClose, params }: OverlayProps) {
  const v = params?.get('variant');
  return <LedgerReconcileSheetView open={open} onClose={onClose} initial={v === 'initial'} remaining={v === 'used' ? 0 : 2} ready={v !== 'loading'} />;
}
