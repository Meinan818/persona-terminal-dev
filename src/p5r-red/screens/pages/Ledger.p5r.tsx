/**
 * 【2026-10-21 parity 修复】页头回到原生 v3 pages_b.js ledger：LEDGER 剪报 +「心相记账」标题牌 +「劳动所得 · 记账 +10 SP · 每日封顶 +2」+ 返回；
 *   页头下 v3 pg-tools 两钮：「统计 · 心相结算」（= 流水⇄统计，v3 打开 LedgerStats）/「资产」（= 资产 Tab，v3 打开 AssetBoard）；余额牌默认总余额（v3），对账回到快记卡左下。
 *   撤回此前自造的「返回方钮 + 心相记账瓷砖拼贴 + LEDGER 纸条 + 斜纸 Tab」与「流水 / 统计」分段。
 * 心相记账页 Ledger（真实 src/pages/Ledger.tsx p5 分支；P1-07）。
 * 头：返回方钮 + P5 拼贴「心 相 记 账」+ LEDGER 纸条；记账 / 资产 两 Tab（平级）。
 *   记账 Tab：@/screens/pkg4/ledger4（余额牌 / 一句话记多笔 + 📷 拍小票 / 记一笔 / 对账 / 近 9 日 / 流水⇄统计 / 月份切换 / 删除这一笔？）
 *   资产 Tab：AssetBoard（v3 overlays/d.js 逐字迁移，inline 渲染；登记资产 / 资产详情（附加费用）/ 删除这件资产？）
 * 路由：?tab=book|assets  ?view=list|stats  ?state=empty|first|over|nobudget  ?ocr=ok|multi|none|novision|fail  ?assets=empty
 */
import { useLayoutEffect, useRef } from 'react';
import type { PageProps } from '@/p5r-red/registry/types';
import { P5PageHeader, P5Back } from '@/p5r-red/kit/P5PageHeader';
import { P5Button } from '@/p5r-red/kit/P5Button';
import { navigate } from '@/p5r-red/shell/shellBus';
import { sfx } from '@/p5r-red/fx/sfx';
import { V3Host } from '@/p5r-red/screens/pkg4/bridge';
import { applyLedgerParams, ledgerEnter, ledgerMount, ledgerRender } from '@/p5r-red/screens/pkg4/ledger4';
import { INLINE, OD } from '@/p5r-red/screens/pkg4/d4';
import { DevStateBar } from '@/p5r-red/kit/DevStateBar';
import '@/p5r-red/screens/pkg4/pkg4.css';

function Assets({ empty }: { empty: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { INLINE.host = ref.current; OD.openAssetBoard(empty ? 'empty' : 'data'); INLINE.host = null; }, [empty]);
  return <div ref={ref} className="p4-led-assets" />;
}

export default function Ledger({ params, wide }: PageProps) {
  const tab: 'book' | 'assets' = params.get('tab') === 'assets' ? 'assets' : 'book';
  const stats = params.get('view') === 'stats';
  const go = (q: Record<string, string>) => { sfx('nav', 0.4); navigate('ledger', { via: 'none', params: q, replace: true }); };
  return (
    <div className="p4-ledger led5p">
      <P5PageHeader ransom="LEDGER" cn="心相记账" sub="劳动所得 · 记账 +10 SP · 每日封顶 +2" seed={91} right={<P5Back to="menu" />} />
      <div className="pg-tools">
        {tab === 'book'
          ? <P5Button tone="paper" size="sm" seed={410} aria-pressed={stats} onClick={() => go(stats ? {} : { view: 'stats' })}>{stats ? '流水 · 本月' : '统计 · 心相结算'}</P5Button>
          : <P5Button tone="paper" size="sm" seed={410} onClick={() => go({})}>记账</P5Button>}
        <P5Button tone="ink" size="sm" seed={411} aria-pressed={tab === 'assets'} onClick={() => go(tab === 'assets' ? {} : { tab: 'assets' })}>资产</P5Button>
      </div>
      {tab === 'book'
        ? <V3Host dep={`${params.toString()}|${wide}`} render={() => { applyLedgerParams(params); return ledgerRender(); }} mount={ledgerMount} enter={ledgerEnter} />
        : <Assets empty={params.get('assets') === 'empty'} />}
      <DevStateBar page="ledger" items={[
        { label: '默认', q: '' }, { label: '月余额', q: 'bal=month' }, { label: '统计', q: 'view=stats' }, { label: '超预算', q: 'state=over' }, { label: '未设预算', q: 'state=nobudget' }, { label: '空', q: 'state=empty' },
        { label: '首次未设余额', q: 'state=first' }, { label: '小票多笔', q: 'ocr=multi' }, { label: '小票没读出', q: 'ocr=none' }, { label: '未配视觉', q: 'ocr=novision' },
        { label: '资产', q: 'tab=assets' }, { label: '资产 · 空', q: 'tab=assets&assets=empty' },
      ]} />
    </div>
  );
}
