/**
 * AssetBoard（真实 src/components/ledger/AssetBoard.tsx）P4G 版：
 * 总财富环（流动资产 / 存款 / 固定资产）→ 存款条目（🐷 自律攒下 · 历月预算结余累积，× 收起 / 🐷 显示存款条目）
 * → ＋ 登记一件资产 → 按类目分组的固定资产（状态 · 日期 · +N 附加）→ 点开详情；空「还没有登记的固定资产…」
 */
import { useMemo, useState } from 'react';
import { P4Card, P4List, IconClose, useToast } from '@yellow/kit';
import { CollageStagger, CollageItem } from '@yellow/fx';
import { cx } from '@yellow/lib/cx';
import { CardHead, Ring } from './ui';
import { AssetAddSheetView, AssetDetailSheetView } from '@yellow/screens/overlays/AssetBoardSheets.p4g';
import { ASSET_CATEGORIES, ASSET_STATUS, CNY, assetCat, assetTotal, fmtMoney, fmtSigned, useLedgerData, ledgerOps } from '@yellow/adapters/pkg5';

export function AssetBoard({ empty }: { empty?: boolean }) {
  const { LEDGER_ACCOUNTS, LEDGER_ASSETS, LEDGER_SAVINGS } = useLedgerData();
  const toast = useToast();
  const assets = empty ? [] : LEDGER_ASSETS;
  const [savingsHidden, setSavingsHidden] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const liquid = LEDGER_ACCOUNTS.reduce((s, a) => s + a.balance, 0);
  const savingsAmt = Math.min(LEDGER_SAVINGS, liquid);
  const savingsShown = !savingsHidden && savingsAmt > 0;
  const fixed = assets.filter((a) => a.status !== 'soldout').reduce((s, a) => s + assetTotal(a), 0);
  const liquidFree = liquid - (savingsShown ? savingsAmt : 0);
  const net = liquid + fixed;
  const segs = [
    { key: 'liquid', color: 'var(--p4g-cyan)', amt: liquidFree, label: '流动资产' },
    ...(savingsShown ? [{ key: 'savings', color: 'var(--p4g-green)', amt: savingsAmt, label: '存款' }] : []),
    { key: 'fixed', color: 'var(--p4g-orange)', amt: fixed, label: '固定资产' },
  ];
  const grouped = useMemo(() => ASSET_CATEGORIES.map((cat) => ({ cat, items: assets.filter((a) => a.category === cat.key) })).filter((g) => g.items.length), [assets]);
  const detail = assets.find((a) => a.id === detailId) ?? null;

  return (
    <CollageStagger className="flex min-w-0 flex-col gap-4">
      <CollageItem>
        <P4Card tone="paper" cut="br" padding="lg">
          <CardHead en="NET WORTH">总财富</CardHead>
          <div className="flex min-w-0 flex-col items-center gap-4 sm:flex-row">
            <Ring size={172} stroke={22} total={segs.reduce((s, x) => s + Math.max(0, x.amt), 0)} segments={segs.map((s) => ({ value: Math.max(0, s.amt), color: s.color }))}>
              <div className="text-center">
                <div className="font-display text-2xs font-bold text-p4g-ink-soft">总财富</div>
                <div className="p4g-num text-[clamp(18px,5vw,24px)] leading-none text-p4g-ink">{fmtSigned(net)}</div>
              </div>
            </Ring>
            <div className="flex w-full min-w-0 flex-1 flex-col gap-2">
              {segs.map((s) => (
                <div key={s.key} className="flex min-w-0 items-center gap-2 rounded-sm border-thin border-p4g-line bg-p4g-surface-2 px-2.5 py-2">
                  <span className="h-4 w-4 shrink-0 -skew-x-12 border-thin border-p4g-black" style={{ background: s.color }} />
                  <span className="min-w-0 flex-1 truncate font-display text-body font-bold text-p4g-ink">{s.label}</span>
                  <span className="shrink-0 p4g-num text-body text-p4g-ink">{fmtSigned(s.amt)}</span>
                </div>
              ))}
            </div>
          </div>
        </P4Card>
      </CollageItem>

      {savingsShown ? (
        <CollageItem>
          <div className="flex min-w-0 items-center gap-3 rounded-sm border-3 border-p4g-black bg-p4g-green px-4 py-3 text-p4g-black shadow-hard">
            <span className="shrink-0 text-[28px]">🐷</span>
            <div className="min-w-0 flex-1">
              <div className="font-display text-body font-bold">存款</div>
              <div className="truncate text-meta font-bold opacity-75">自律攒下 · 历月预算结余累积</div>
            </div>
            <span className="shrink-0 p4g-num text-h3">{CNY}{fmtMoney(savingsAmt)}</span>
            <button type="button" aria-label="收起存款条目" onClick={() => setSavingsHidden(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xs border-thin border-p4g-black bg-white/60"><IconClose size={14} /></button>
          </div>
        </CollageItem>
      ) : savingsHidden ? (
        <CollageItem>
          <button type="button" onClick={() => setSavingsHidden(false)} className="p4g-press h-10 w-full rounded-sm border-3 border-dashed border-p4g-line font-display text-meta font-bold text-[color:var(--p4g-on-stage)]">🐷 显示存款条目（{CNY}{fmtMoney(savingsAmt)}）</button>
        </CollageItem>
      ) : null}

      <CollageItem>
        <button type="button" onClick={() => setAddOpen(true)} className="p4g-press relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-yellow font-display text-lead font-bold text-p4g-black shadow-hard night:border-p4g-yellow">
          <span aria-hidden className="absolute inset-y-0 left-0 w-4 p4g-hazard" />＋ 登记一件资产
        </button>
      </CollageItem>

      {assets.length === 0 ? (
        <CollageItem><p className="py-8 text-center font-display text-body font-bold leading-relaxed text-[color:var(--p4g-on-stage)]">还没有登记的固定资产。<br />把买过的设备 / 乐器登记进来，看看钱变成了什么。</p></CollageItem>
      ) : grouped.map((g) => (
        <CollageItem key={g.cat.key}>
          <div className="mb-1.5 flex min-w-0 items-center gap-2 px-1 font-display text-meta font-bold text-[color:var(--p4g-on-stage)]">
            <span className="truncate">{g.cat.icon} {g.cat.label}</span>
            <span aria-hidden className="h-[2px] min-w-[10px] flex-1 bg-[color:var(--p4g-on-stage)] opacity-40" />
            <span className="shrink-0 p4g-num">{CNY}{fmtMoney(g.items.reduce((s, a) => s + assetTotal(a), 0))}</span>
          </div>
          <P4List>
            {g.items.map((a) => (
              <button key={a.id} type="button" onClick={() => { setDetailId(a.id); setDetailOpen(true); }} className="group relative flex w-full min-w-0 items-center gap-3 px-3 py-3 text-left active:translate-x-[2px]" style={{ background: 'var(--p4g-surface-grad)' }}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border-[3px] border-p4g-orange bg-p4g-yellow-pale text-xl">{assetCat(a.category).icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-lead font-bold text-p4g-ink">{a.name}</span>
                  <span className="block truncate text-meta text-p4g-ink-soft">
                    <span className={cx('font-bold', a.status === 'inuse' ? 'text-p4g-success' : a.status === 'idle' ? 'text-[color:var(--p4g-rank)]' : 'text-p4g-muted')}>{ASSET_STATUS[a.status].label}</span>
                    {' · '}{a.purchaseDate}{a.addOns?.length ? ` · +${a.addOns.length} 附加` : ''}
                  </span>
                </span>
                <span className={cx('shrink-0 p4g-num text-lead', a.status === 'soldout' ? 'text-p4g-muted line-through' : 'text-p4g-ink')}>{CNY}{fmtMoney(assetTotal(a))}</span>
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: 'var(--p4g-separator-a)' }} />
              </button>
            ))}
          </P4List>
        </CollageItem>
      ))}
      <AssetAddSheetView open={addOpen} onClose={() => setAddOpen(false)} onSave={async (a) => { await ledgerOps.addAsset(a); toast.success(`已登记：${a.name}`); }} />
      <AssetDetailSheetView open={detailOpen && !!detail} asset={detail} onClose={() => setDetailOpen(false)} onChange={(a) => ledgerOps.updateAsset(a)} onDelete={async (id) => { await ledgerOps.removeAsset(id); toast('已删除'); }} />
    </CollageStagger>
  );
}
