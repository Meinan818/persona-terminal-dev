/**
 * AssetBoard（真实 src/components/ledger/AssetBoard.tsx）蓝白 P3R 版：
 * 总财富环（流动资产 / 存款 / 固定资产）→ 存款条目（自律攒下 · 历月预算结余累积，× 收起 / 显示存款条目）
 * → ＋ 登记一件资产 → 按类目分组的固定资产（状态 · 日期 · +N 附加）→ 点开详情；空「还没有登记的固定资产…」。
 */
import { useEffect, useMemo, useState } from 'react';
import type { LedgerAsset } from '@real/types';
import { P3R, slantClip, IconClose, useToast, P3Button, Glyph } from '@blue/kit';
import { P3Stagger, P3StaggerItem } from '@blue/fx';
import { CatMark, GlassSlab, MiniHead, Ring } from './ui';
import { AssetAddSheetView, AssetDetailSheetView } from '@blue/screens/overlays/AssetBoardSheets.p3r';
import { ASSET_CATEGORIES, ASSET_STATUS, CNY, assetCat, assetTotal, fmtMoney, fmtSigned, ledgerOps, useLedgerData } from '@blue/adapters/pkg5';

export function AssetBoard({ empty }: { empty?: boolean }) {
  const toast = useToast();
  const { LEDGER_ACCOUNTS, LEDGER_ASSETS, LEDGER_SAVINGS } = useLedgerData();
  const [assets, setAssets] = useState<LedgerAsset[]>(empty ? [] : LEDGER_ASSETS);
  const [savingsHidden, setSavingsHidden] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  useEffect(() => { setAssets(empty ? [] : LEDGER_ASSETS); }, [LEDGER_ASSETS, empty]);
  const liquid = empty ? 0 : LEDGER_ACCOUNTS.reduce((s, a) => s + a.balance, 0);
  const savingsAmt = Math.max(0, Math.min(empty ? 0 : LEDGER_SAVINGS, liquid));
  const savingsShown = !savingsHidden && savingsAmt > 0;
  const fixed = assets.filter((a) => a.status !== 'soldout').reduce((s, a) => s + assetTotal(a), 0);
  const liquidFree = liquid - (savingsShown ? savingsAmt : 0);
  const net = liquid + fixed;
  const segs = [
    { key: 'liquid', color: P3R.cyan, amt: liquidFree, label: '流动资产' },
    ...(savingsShown ? [{ key: 'savings', color: 'var(--p3r-mint)', amt: savingsAmt, label: '存款' }] : []),
    { key: 'fixed', color: P3R.blue, amt: fixed, label: '固定资产' },
  ];
  const grouped = useMemo(() => ASSET_CATEGORIES.map((cat) => ({ cat, items: assets.filter((a) => a.category === cat.key) })).filter((g) => g.items.length), [assets]);
  const detail = assets.find((a) => a.id === detailId) ?? null;
  const ringTotal = segs.reduce((s, x) => s + Math.max(0, x.amt), 0);
  return (
    <P3Stagger className="flex min-w-0 flex-col gap-4">
      <P3StaggerItem>
        <GlassSlab cut={26}>
          <div className="px-7 py-5">
            <MiniHead title="总财富" en="NET WORTH" className="mb-3" />
            <div className="flex min-w-0 flex-col items-center gap-4 sm:flex-row">
              <Ring size={168} stroke={20} total={ringTotal || 1} segments={segs.map((s) => ({ value: Math.max(0, s.amt), color: s.color }))}>
                <div className="text-center">
                  <div className="text-[11px] font-black" style={{ color: P3R.grey }}>总财富</div>
                  <div className="font-cond text-[clamp(20px,5.4vw,26px)] leading-none" style={{ color: P3R.blue }}>{fmtSigned(net)}</div>
                </div>
              </Ring>
              <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5">
                {segs.map((s, i) => (
                  <div key={s.key} className="flex min-w-0 items-center gap-2 py-2 pl-4 pr-3" style={{ clipPath: slantClip(8), background: i % 2 ? 'var(--p3r-row-alt)' : 'var(--p3r-row)' }}>
                    <span className="h-3.5 w-4 shrink-0" style={{ background: s.color, clipPath: slantClip(3) }} />
                    <span className="min-w-0 flex-1 truncate text-[14px] font-black" style={{ color: P3R.ink }}>{s.label}</span>
                    <span className="shrink-0 font-cond text-[17px]" style={{ color: P3R.ink }}>{fmtSigned(s.amt)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GlassSlab>
      </P3StaggerItem>
      {savingsShown ? (
        <P3StaggerItem>
          <div className="flex min-w-0 items-center gap-3 py-3 pl-5 pr-3" style={{ clipPath: slantClip(14), background: 'var(--p3r-mint)', color: 'var(--p3r-mulberry)' }}>
            <span className="shrink-0 text-[26px] leading-none" aria-hidden><Glyph name="piggy" /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-black">存款</div>
              <div className="truncate text-[12px] font-bold opacity-80">自律攒下 · 历月预算结余累积</div>
            </div>
            <span className="shrink-0 font-cond text-[22px]">{CNY}{fmtMoney(savingsAmt)}</span>
            <button type="button" aria-label="收起存款条目" onClick={() => setSavingsHidden(true)} className="flex h-9 w-9 shrink-0 items-center justify-center" style={{ clipPath: slantClip(6), background: 'rgba(255,255,255,0.55)' }}><IconClose size={14} /></button>
          </div>
        </P3StaggerItem>
      ) : savingsHidden ? (
        <P3StaggerItem>
          <button type="button" onClick={() => setSavingsHidden(false)} className="h-10 w-full text-[13px] font-black" style={{ clipPath: slantClip(10), boxShadow: 'inset 0 0 0 2px rgb(var(--p3r-blue-rgb) / 0.45)', color: P3R.roseInk }}><Glyph name="piggy" /> 显示存款条目（{CNY}{fmtMoney(savingsAmt)}）</button>
        </P3StaggerItem>
      ) : null}
      <P3StaggerItem>
        <P3Button block size="lg" corner onClick={() => setAddOpen(true)}>＋ 登记一件资产</P3Button>
      </P3StaggerItem>
      {assets.length === 0 ? (
        <P3StaggerItem><p className="py-8 text-center text-[14px] font-black leading-relaxed" style={{ color: P3R.grey }}>还没有登记的固定资产。<br />把买过的设备 / 乐器登记进来，看看钱变成了什么。</p></P3StaggerItem>
      ) : grouped.map((g) => (
        <P3StaggerItem key={g.cat.key}>
          <div className="mb-1.5 flex min-w-0 items-center gap-2 px-1">
            <span aria-hidden className="h-[13px] w-[9px] shrink-0" style={{ background: P3R.blue, clipPath: 'polygon(32% 0, 100% 0, 68% 100%, 0 100%)' }} />
            <span className="truncate text-[14px] font-black" style={{ color: P3R.ink }}>{g.cat.label}</span>
            <span aria-hidden className="h-[2px] min-w-[10px] flex-1" style={{ background: 'rgb(var(--p3r-cyan-rgb) / 0.5)' }} />
            <span className="shrink-0 font-cond text-[15px]" style={{ color: P3R.roseInk }}>{CNY}{fmtMoney(g.items.reduce((s, a) => s + assetTotal(a), 0))}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {g.items.map((a, i) => (
              <button key={a.id} type="button" onClick={() => { setDetailId(a.id); setDetailOpen(true); }} className="relative flex w-full min-w-0 items-center gap-3 py-2.5 pl-5 pr-4 text-left active:scale-[0.99]"
                style={{ clipPath: slantClip(12), background: i % 2 ? 'var(--p3r-row-alt)' : 'var(--p3r-row)' }}>
                <CatMark glyph={assetCat(a.category).icon} color={a.status === 'soldout' ? P3R.grey : i % 2 ? P3R.cyan : P3R.blue} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-black" style={{ color: P3R.ink }}>{a.name}</span>
                  <span className="block truncate text-[12px] font-bold" style={{ color: P3R.grey }}>
                    <span style={{ color: a.status === 'inuse' ? P3R.roseInk : a.status === 'idle' ? 'var(--p3r-lilac-ink)' : P3R.grey }}>{ASSET_STATUS[a.status].label}</span>
                    {' · '}{a.purchaseDate}{a.addOns?.length ? ` · +${a.addOns.length} 附加` : ''}
                  </span>
                </span>
                <span className={`shrink-0 font-cond text-[18px] ${a.status === 'soldout' ? 'line-through' : ''}`} style={{ color: a.status === 'soldout' ? P3R.grey : P3R.ink }}>{CNY}{fmtMoney(assetTotal(a))}</span>
              </button>
            ))}
          </div>
        </P3StaggerItem>
      ))}
      <AssetAddSheetView open={addOpen} onClose={() => setAddOpen(false)} onSave={(a) => { void ledgerOps.addAsset(a).then(() => toast.success(`已登记：${a.name}`)).catch((error) => toast.error(error instanceof Error ? error.message : '登记失败')); }} />
      <AssetDetailSheetView open={detailOpen && !!detail} asset={detail} onClose={() => setDetailOpen(false)} onChange={(a) => { void ledgerOps.updateAsset(a).catch((error) => toast.error(error instanceof Error ? error.message : '保存失败')); }} onDelete={(id) => { void ledgerOps.removeAsset(id).then(() => toast('已删除')).catch((error) => toast.error(error instanceof Error ? error.message : '删除失败')); }} />
    </P3Stagger>
  );
}
