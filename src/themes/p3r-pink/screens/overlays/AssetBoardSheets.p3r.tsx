/**
 * 资产板块抽屉（真实 src/components/ledger/AssetBoard.tsx）：
 *   AssetAddSheet「登记资产」：名称（如 索尼相机）/ 类别 chips / 购入价 / 状态（在用·闲置·已出）/ 日期 → 保存
 *   AssetDetailSheet「<资产名>」：总价 + 购入 · 日期 / 状态切换 / 附加费用列表（删除）+ 新增「名称」「金额」「加」/ 删除这件资产 → 确认框
 * default = 登记资产；DetailOverlay = 资产详情（overlays.pkg5 用 .then 取命名导出）。
 */
import { useEffect, useRef, useState } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import type { LedgerAsset } from '@/types';
import { P3Sheet, P3Button, P3Input, P3Segment, P3R, slantClip, IconClose, useToast } from '@pink/kit';
import { Chip, FLabel, AmountInput, CatMark } from '@pink/screens/pkg5/ui';
import { AssetDeleteConfirmView } from './AssetBoardDeleteConfirm.p3r';
import { ASSET_CATEGORIES, ASSET_STATUS, CNY, LEDGER_ASSETS, P5_TODAY, assetCat, assetTotal, fmtMoney } from '@pink/adapters/pkg5';

const STATUSES = ['inuse', 'idle', 'soldout'] as const;

export function AssetAddSheetView({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave?: (a: LedgerAsset) => void | Promise<unknown> }) {
  const toast = useToast();
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('digital');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('inuse');
  const [date, setDate] = useState(P5_TODAY);
  useEffect(() => { if (open) { setName(''); setCategory('digital'); setPrice(''); setStatus('inuse'); setDate(P5_TODAY); } }, [open]);
  const canSave = !!name.trim() && Number(price) > 0;
  return (
    <P3Sheet open={open} onClose={onClose} title="登记资产" en="REGISTER"
      footer={<P3Button block size="lg" corner disabled={busy || !canSave || !Number.isFinite(Number(price))} onClick={async () => { if (saving.current) return; saving.current = true; setBusy(true); try { const a: LedgerAsset = { id: `as_${Date.now()}`, name: name.trim(), category, price: Number(price), purchaseDate: date, status, createdAt: new Date() }; if (onSave) await onSave(a); else toast.success(`已登记：${a.name}`); onClose(); } catch { toast('资产保存失败，请重试'); } finally { saving.current = false; setBusy(false); } }}>保存</P3Button>}>
      <div className="flex min-w-0 flex-col gap-4 pt-1">
        <P3Input value={name} onChange={(e) => setName(e.target.value)} placeholder="名称（如 索尼相机）" aria-label="名称" autoFocus />
        <div className="flex min-w-0 flex-col gap-2">
          <FLabel>类别</FLabel>
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {ASSET_CATEGORIES.map((c) => <Chip key={c.key} on={category === c.key} onClick={() => setCategory(c.key)}><span className="font-heavy not-italic opacity-80">{c.icon}</span> {c.label}</Chip>)}
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <FLabel>购入价</FLabel>
          <AmountInput value={price} onChange={(v) => setPrice(v.replace(/[^\d.]/g, ''))} ariaLabel="购入价" />
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <P3Segment value={status} onChange={(v) => setStatus(v as typeof status)} items={STATUSES.map((s) => ({ id: s, label: ASSET_STATUS[s].label }))} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value || P5_TODAY)} aria-label="日期" className="h-11 min-w-0 px-4 font-cond text-[16px] outline-none" style={{ background: 'var(--p3r-field)', color: P3R.ink, clipPath: slantClip(8) }} />
        </div>
      </div>
    </P3Sheet>
  );
}

export function AssetDetailSheetView({ asset: initial, open, onClose, onChange, onDelete, confirmOpen }: { asset: LedgerAsset | null; open: boolean; onClose: () => void; onChange?: (a: LedgerAsset) => void | Promise<unknown>; onDelete?: (id: string) => void | Promise<unknown>; confirmOpen?: boolean }) {
  const [asset, setAsset] = useState<LedgerAsset | null>(initial);
  const [n, setN] = useState('');
  const [amt, setAmt] = useState('');
  const [confirm, setConfirm] = useState(!!confirmOpen);
  useEffect(() => { setAsset(initial); setN(''); setAmt(''); }, [initial, open]);
  const toast = useToast();
  const saving = useRef(false);
  const patch = async (p: Partial<LedgerAsset>) => {
    if (!asset || saving.current) return false;
    saving.current = true;
    try { const next = { ...asset, ...p }; await onChange?.(next); setAsset(next); return true; }
    catch { toast('资产修改失败，请重试'); return false; }
    finally { saving.current = false; }
  };
  if (!asset) return null;
  const addOns = asset.addOns ?? [];
  return (
    <>
      <P3Sheet open={open} onClose={onClose} title={asset.name} en="ASSET">
        <div className="flex min-w-0 flex-col gap-4 pt-1">
          <div className="flex min-w-0 items-center gap-3">
            <CatMark glyph={assetCat(asset.category).icon} color={P3R.blue} size={60} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-cond text-[clamp(30px,9vw,40px)] leading-none" style={{ color: P3R.blue }}>{CNY}{fmtMoney(assetTotal(asset))}</div>
              <div className="mt-1 truncate text-[12px] font-bold" style={{ color: P3R.grey }}>购入 {CNY}{fmtMoney(asset.price)} · {asset.purchaseDate} · {assetCat(asset.category).label}</div>
            </div>
          </div>
          <P3Segment value={asset.status} onChange={(v) => patch({ status: v as LedgerAsset['status'] })} items={STATUSES.map((s) => ({ id: s, label: ASSET_STATUS[s].label }))} />
          <div className="min-w-0">
            <FLabel className="mb-2">附加费用</FLabel>
            {addOns.length ? (
              <div className="mb-2 flex flex-col gap-1">
                {addOns.map((o, i) => (
                  <div key={`ao-${i}`} className="flex min-w-0 items-center gap-2 py-1.5 pl-4 pr-2" style={{ clipPath: slantClip(8), background: i % 2 ? 'var(--p3r-row-alt)' : 'var(--p3r-row)' }}>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-black" style={{ color: P3R.ink }}>{o.name}</span>
                    <span className="shrink-0 font-cond text-[16px]" style={{ color: P3R.grey }}>{CNY}{fmtMoney(o.amount)}</span>
                    <button type="button" aria-label="删除附加费用" onClick={() => patch({ addOns: addOns.filter((_, j) => j !== i) })} className="flex h-8 w-8 shrink-0 items-center justify-center" style={{ color: 'var(--p3r-coral-ink)' }}><IconClose size={14} /></button>
                  </div>
                ))}
              </div>
            ) : <p className="mb-2 text-[12px] font-bold" style={{ color: P3R.grey }}>如手机壳、配件、维修费…</p>}
            <div className="flex min-w-0 gap-2">
              <span className="min-w-0 flex-1"><P3Input value={n} onChange={(e) => setN(e.target.value)} placeholder="名称" aria-label="附加费用名称" /></span>
              <span className="w-24 shrink-0"><P3Input type="number" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="金额" aria-label="附加费用金额" /></span>
              <span className="shrink-0"><P3Button tone="ink" disabled={!n.trim() || !(Number(amt) > 0)} onClick={async () => { if (await patch({ addOns: [...addOns, { name: n.trim(), amount: Number(amt) }] })) { setN(''); setAmt(''); } }}>加</P3Button></span>
            </div>
          </div>
          <P3Button tone="danger" block onClick={() => setConfirm(true)}>删除这件资产</P3Button>
        </div>
      </P3Sheet>
      <AssetDeleteConfirmView open={confirm} onClose={() => setConfirm(false)} name={asset.name} onConfirm={async () => { if (saving.current) return; saving.current = true; try { await onDelete?.(asset.id); onClose(); } catch { toast('资产删除失败，请重试'); } finally { saving.current = false; } }} />
    </>
  );
}

export function RegisterOverlay({ open, onClose }: OverlayProps) { return <AssetAddSheetView open={open} onClose={onClose} />; }
export function DetailOverlay({ open, onClose }: OverlayProps) { return <AssetDetailSheetView open={open} onClose={onClose} asset={LEDGER_ASSETS[0]} />; }
export default RegisterOverlay;
