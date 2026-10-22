/**
 * 资产板块抽屉（真实 src/components/ledger/AssetBoard.tsx）：
 *   AssetAddSheet「登记资产」：名称 / 类别 chips / 购入价 / 状态（在用·闲置·已出）/ 日期 → 保存
 *   AssetDetailSheet「<资产名>」：总价 + 购入 · 日期 / 状态切换 / 附加费用列表（删除）+ 新增「名称」「金额」「加」/ 删除这件资产 → 确认
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import type { LedgerAsset } from '@real/types';
import { P4Sheet, P4Button, P4Input, P4SegmentTabs, IconClose, useToast } from '@yellow/kit';
import { P5Label, P5Pick } from '@yellow/screens/pkg5/ui';
import { AssetDeleteConfirmView } from './AssetBoardDeleteConfirm.p4g';
import { ASSET_CATEGORIES, ASSET_STATUS, CNY, LEDGER_ASSETS, P5_TODAY, assetCat, assetTotal, fmtMoney } from '@yellow/mock/pkg5';

const STATUSES = ['inuse', 'idle', 'soldout'] as const;

export function AssetAddSheetView({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave?: (a: LedgerAsset) => void }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('digital');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('inuse');
  const [date, setDate] = useState(P5_TODAY);
  useEffect(() => { if (open) { setName(''); setCategory('digital'); setPrice(''); setStatus('inuse'); setDate(P5_TODAY); } }, [open]);
  const canSave = name.trim() && Number(price) > 0;
  return (
    <P4Sheet open={open} onClose={onClose} title="登记资产" en="REGISTER ASSET"
      footer={<P4Button block size="lg" disabled={!canSave} onClick={() => { const a: LedgerAsset = { id: `as_${Date.now()}`, name: name.trim(), category, price: Number(price), purchaseDate: date, status, createdAt: new Date() }; onClose(); onSave ? onSave(a) : toast.success(`已登记：${a.name}`); }}>保存</P4Button>}>
      <div className="flex min-w-0 flex-col gap-4 pt-1">
        <P4Input value={name} onChange={(e) => setName(e.target.value)} placeholder="名称（如 索尼相机）" aria-label="名称" autoFocus />
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {ASSET_CATEGORIES.map((c) => <P5Pick key={c.key} on={category === c.key} onClick={() => setCategory(c.key)}>{c.icon} {c.label}</P5Pick>)}
        </div>
        <label className="flex min-w-0 items-center gap-2 rounded-sm border-3 border-p4g-line bg-p4g-surface-2 px-3 focus-within:shadow-[4px_4px_0_var(--p4g-yellow)]">
          <span className="p4g-num text-h2 text-p4g-ink-soft">{CNY}</span>
          <input type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="购入价" aria-label="购入价" className="h-14 min-w-0 flex-1 bg-transparent p4g-num text-[clamp(24px,7vw,32px)] text-p4g-ink outline-none focus-visible:outline-none placeholder:text-p4g-muted placeholder:text-h3" />
        </label>
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <P4SegmentTabs value={status} onChange={(v) => setStatus(v as typeof status)} items={STATUSES.map((s) => ({ id: s, label: ASSET_STATUS[s].label }))} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value || P5_TODAY)} aria-label="日期" className="h-11 min-w-0 rounded-sm border-3 border-p4g-line bg-p4g-surface-2 px-3 p4g-num-upright text-body text-p4g-ink outline-none focus-visible:outline-none" />
        </div>
      </div>
    </P4Sheet>
  );
}

export function AssetDetailSheetView({ asset: initial, open, onClose, onChange, onDelete }: { asset: LedgerAsset | null; open: boolean; onClose: () => void; onChange?: (a: LedgerAsset) => void; onDelete?: (id: string) => void }) {
  const [asset, setAsset] = useState<LedgerAsset | null>(initial);
  const [n, setN] = useState('');
  const [amt, setAmt] = useState('');
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { setAsset(initial); setN(''); setAmt(''); }, [initial, open]);
  const patch = (p: Partial<LedgerAsset>) => setAsset((a) => { if (!a) return a; const next = { ...a, ...p }; onChange?.(next); return next; });
  if (!asset) return null;
  const addOns = asset.addOns ?? [];
  return (
    <>
      <P4Sheet open={open} onClose={onClose} title={asset.name} en="ASSET DETAIL">
        <div className="flex min-w-0 flex-col gap-4 pt-1">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-sm border-3 border-p4g-black bg-p4g-yellow text-[34px] shadow-hard-sm">{assetCat(asset.category).icon}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate p4g-num text-[clamp(28px,8vw,36px)] leading-none text-p4g-ink">{CNY}{fmtMoney(assetTotal(asset))}</div>
              <div className="mt-1 truncate text-meta font-bold text-p4g-ink-soft">购入 {CNY}{fmtMoney(asset.price)} · {asset.purchaseDate}</div>
            </div>
          </div>
          <P4SegmentTabs value={asset.status} onChange={(v) => patch({ status: v as LedgerAsset['status'] })} items={STATUSES.map((s) => ({ id: s, label: ASSET_STATUS[s].label }))} />
          <div className="min-w-0">
            <P5Label className="mb-2">附加费用</P5Label>
            {addOns.length ? (
              <div className="mb-2 overflow-hidden rounded-sm border-3 border-p4g-line">
                {addOns.map((o, i) => (
                  <div key={i} className="flex min-w-0 items-center gap-2 border-b-2 px-3 py-2 last:border-b-0" style={{ background: 'var(--p4g-surface-grad)', borderColor: 'var(--p4g-separator-a)' }}>
                    <span className="min-w-0 flex-1 truncate font-display text-body font-bold text-p4g-ink">{o.name}</span>
                    <span className="shrink-0 p4g-num text-body text-p4g-ink-soft">{CNY}{fmtMoney(o.amount)}</span>
                    <button type="button" aria-label="删除附加费用" onClick={() => patch({ addOns: addOns.filter((_, j) => j !== i) })} className="flex h-8 w-8 shrink-0 items-center justify-center text-p4g-danger"><IconClose size={14} /></button>
                  </div>
                ))}
              </div>
            ) : <p className="mb-2 text-meta text-p4g-ink-soft">如手机壳、配件、维修费…</p>}
            <div className="flex min-w-0 gap-2">
              <input value={n} onChange={(e) => setN(e.target.value)} placeholder="名称" aria-label="附加费用名称" className="h-11 min-w-0 flex-1 rounded-sm border-3 border-p4g-line bg-p4g-surface-2 px-3 text-body text-p4g-ink outline-none focus-visible:outline-none placeholder:text-p4g-muted" />
              <input type="number" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="金额" aria-label="附加费用金额" className="h-11 w-24 shrink-0 rounded-sm border-3 border-p4g-line bg-p4g-surface-2 px-3 p4g-num-upright text-body text-p4g-ink outline-none focus-visible:outline-none placeholder:text-p4g-muted" />
              <P4Button variant="black" disabled={!n.trim() || !(Number(amt) > 0)} onClick={() => { patch({ addOns: [...addOns, { name: n.trim(), amount: Number(amt) }] }); setN(''); setAmt(''); }}>加</P4Button>
            </div>
          </div>
          <P4Button variant="danger" block onClick={() => setConfirm(true)}>删除这件资产</P4Button>
        </div>
      </P4Sheet>
      <AssetDeleteConfirmView open={confirm} onClose={() => setConfirm(false)} name={asset.name} onConfirm={() => { onDelete?.(asset.id); onClose(); }} />
    </>
  );
}

export function RegisterOverlay({ open, onClose }: OverlayProps) { return <AssetAddSheetView open={open} onClose={onClose} />; }
export function DetailOverlay({ open, onClose }: OverlayProps) { return <AssetDetailSheetView open={open} onClose={onClose} asset={LEDGER_ASSETS[0]} />; }
export default RegisterOverlay;
