/**
 * Navigation.p4g —— 导航外壳核对页（真实 Navigation.tsx#BottomNav / #Sidebar + RadialQuickNav）。
 * 外壳本体在 src/shell/Navigation.p4g.tsx（地基代理实现，本包只读）。本页逐项列出真实控件并给出可点的入口，
 * 外加本包补齐的两件：底导切页「涨潮」转场（TideSquares）与轮盘 D0 垂直菜单（WheelD0Menu）。
 */
import { useState } from 'react';
import type { PageProps } from '@yellow/registry/types';
import { P4PageHeader, P4Section, P4List, P4ListRow, P4Button, P4Chip } from '@yellow/kit';
import { navigate, openAssistant, openWheel, useShellState } from '@yellow/shell/shellBus';
import { NAV_ITEMS, SIDEBAR_LEDGER, LEDGER_ENABLED } from '@yellow/shell/Navigation.p4g';
import { WHEEL_ITEMS } from '@yellow/shell/RadialWheelP4.p4g';
import { TideSquares, WedgeCut } from '@yellow/screens/pkg1/HeavyTransitions';
import { WheelD0Menu } from '@yellow/screens/overlays/RadialQuickNav.p4g';

export default function NavigationPage(_: PageProps) {
  const { currentPage } = useShellState();
  const [tide, setTide] = useState<{ n: number; o: { x: number; y: number }; to: string } | null>(null);
  const [wedge, setWedge] = useState<{ n: number; to: string } | null>(null);
  const [d0, setD0] = useState(false);
  const bottomOrigin = (i: number) => ({ x: (window.innerWidth / 5) * (i + 0.5), y: window.innerHeight - 32 });
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <P4PageHeader title="导航外壳" en="NAVIGATION" weather="cloudy" subtitle={`当前页：${currentPage}`} />

      <P4Section title="竖屏底部导航" en="BOTTOM NAV · 首页 / 行动 / ◈ / 羁绊 / 菜单">
        <P4List>
          {NAV_ITEMS.slice(0, 2).map((n, i) => <P4ListRow key={n.id} eyebrow={n.en} title={n.label} subtitle={n.id === 'actions' ? '已在「行动」再点：记录 ⇄ 任务' : '点击切页（黄方块推屏）'} trailing={<P4Button size="sm" onClick={() => setTide({ n: Date.now(), o: bottomOrigin(i), to: n.id })}>涨潮切页</P4Button>} />)}
          <P4ListRow eyebrow="◈" tag="CENTER" title="助手（长按打开快捷跳转）" subtitle="短按 → 助手面板；按住 500ms → 轮盘（滑动选择、松手跳转）" trailing={<span className="flex gap-1.5"><P4Button size="sm" variant="black" onClick={openAssistant}>短按</P4Button><P4Button size="sm" variant="secondary" onClick={() => openWheel()}>长按</P4Button></span>} />
          {NAV_ITEMS.slice(2).map((n, i) => <P4ListRow key={n.id} eyebrow={n.en} title={n.label} subtitle={n.id === 'cooperation' ? '已在「羁绊」再点：同伴 ⇄ 组织' : '点击切页'} trailing={<P4Button size="sm" onClick={() => setTide({ n: Date.now(), o: bottomOrigin(i + 3), to: n.id })}>涨潮切页</P4Button>} />)}
        </P4List>
      </P4Section>

      <P4Section title="横屏 / 桌面侧栏" en="SIDEBAR · html.layout-wide">
        <div className="flex flex-wrap gap-2">
          {[NAV_ITEMS[0], NAV_ITEMS[1]].map((n) => <P4Chip key={n.id} tone="black" onClick={() => navigate(n.id)}>{n.label}</P4Chip>)}
          <P4Chip tone="yellow" onClick={openAssistant}>助手</P4Chip>
          <P4Chip tone="black" onClick={() => navigate(NAV_ITEMS[2].id)}>{NAV_ITEMS[2].label}</P4Chip>
          {LEDGER_ENABLED && <P4Chip tone="black" onClick={() => navigate(SIDEBAR_LEDGER.id)}>{SIDEBAR_LEDGER.label}（记账开关开时）</P4Chip>}
          <P4Chip tone="black" onClick={() => navigate(NAV_ITEMS[3].id)}>{NAV_ITEMS[3].label}</P4Chip>
        </div>
      </P4Section>

      <P4Section title="长按轮盘" en="RADIAL QUICK NAV · 7">
        <P4List>
          {WHEEL_ITEMS.map((w) => <P4ListRow key={w.id} leading={<span className="w-6 text-center text-lead">{w.icon}</span>} eyebrow={w.en} title={w.label} trailing={<P4Button size="sm" variant="secondary" onClick={() => setWedge({ n: Date.now(), to: w.id })}>楔形切台</P4Button>} />)}
        </P4List>
        <div className="mt-3 flex flex-wrap gap-2">
          <P4Button variant="black" onClick={() => openWheel()}>打开轮盘（点选模式）</P4Button>
          <P4Button variant="secondary" onClick={() => setD0(true)}>D0 低动效垂直菜单</P4Button>
        </div>
      </P4Section>

      <P4Section title="核对结果" en="AUDIT">
        <ul className="flex list-none flex-col gap-1.5 text-body text-[color:var(--p4g-on-stage)]">
          <li>✓ 底导四格 + 中央 ◈（短按/长按 500ms/吞掉长按后的 click/热区外扩 9px）—— 外壳已实现</li>
          <li>✓ 再点规则（行动 记录⇄任务、羁绊 同伴⇄组织）—— 外壳已实现</li>
          <li>✓ 侧栏 首页/行动/助手/羁绊/记账/菜单 + Logo MASKARIA —— 外壳已实现</li>
          <li>△ 底导切页「从指尖处涨潮」：外壳用的是通用黄方块推屏；本包提供 TideSquares（建议外壳在底导点击时改用）</li>
          <li>△ 轮盘跳转「WedgeCut 楔形切台」：外壳用跳台噪点；本包提供 WedgeCut</li>
          <li>△ 轮盘 D0 垂直菜单：外壳低动效时仍是轮盘（仅淡入）；本包提供 WheelD0Menu</li>
        </ul>
      </P4Section>

      <TideSquares key={tide?.n} active={!!tide} origin={tide?.o ?? null} onCovered={() => tide && navigate(tide.to, undefined, { transition: 'none' })} onDone={() => setTide(null)} />
      <WedgeCut key={wedge?.n} active={!!wedge} onCovered={() => wedge && navigate(wedge.to, undefined, { transition: 'none' })} onDone={() => setWedge(null)} />
      <WheelD0Menu open={d0} origin={{ x: window.innerWidth / 2, y: window.innerHeight - 40 }} onClose={() => setD0(false)} />
    </div>
  );
}
