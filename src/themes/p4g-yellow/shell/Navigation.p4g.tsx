/**
 * Navigation.p4g —— 对应真实 src/components/Navigation.tsx（BottomNav + Sidebar），顺序与行为 1:1：
 *
 * 竖屏底部导航（wide 以外）：首页 / 行动 / [◈ 助手] / 羁绊 / 菜单
 *   · 中央 ◈：短按 → openAssistant()（真实 NavigatorWindow）；长按 500ms → 轮盘（RadialWheelP4.p4g），
 *     长按触发后吞掉随 pointerup 而来的 click；隐形热区向四周扩 9px；touch-action none。
 *   · 已在「行动」再点：记录 ⇄ 任务 互切（?tab=activities|todos）；已在「羁绊」再点：同伴 ⇄ 组织 互切（#/p/cooperation ⇄ #/p/hideout，真实 currentPage 'hideout'）。
 *   · 其余 tab 原地点击无操作；切页走 TideSquares 从指尖涨潮（真实 playHeavyTransition effect:'water'，原点=指针坐标）。
 * 横屏 / 桌面左侧栏（html.layout-wide）：首页 / 行动 / 助手 / 羁绊 / 记账（ledgerEnabled）/ 菜单
 *
 * P4G 视觉：
 *   底导 = P4G HUD 黑条 + 顶缘彩虹细条；选中格 = 黄色斜块 + 黑字 + 橙四角星；中央 = 黄圆黑猫 + 天气徽式同心环。
 *   侧栏 = 暂停菜单 1:1：彩虹竖条整面 + 黑色粗体条目，选中项放大 + 黑三角；底部黑色 "¥ 7,000" 式信息条。
 */
import { memo, useEffect, useRef } from 'react';
import type React from 'react';
import type { ComponentType, PointerEvent as RPointerEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { cx } from '@yellow/lib/cx';
import { IconBolt, IconCat, IconCoin, IconGrid, IconHeart, IconHome, IconSparkle } from '@yellow/kit/icons';
import { navigate, openAssistant, openWheel, useShellState } from './shellBus';
import { P4Outline } from '@yellow/kit/P4Outline';
import { SlotImg } from '@yellow/kit/SlotImg';
import { p4gAsset } from '@yellow/lib/asset';
import { P4DateWeather } from '@yellow/kit/P4DateWeather';
import { useLowMotion } from '@yellow/lib/prefs';

type NavIcon = ComponentType<{ filled?: boolean; size?: number }>;
interface NavItem { id: string; label: string; en: string; Icon: NavIcon }

/** 四格常规导航（真实 navItems）*/
export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: '首页', en: 'HOME', Icon: IconHome },
  { id: 'actions', label: '行动', en: 'ACTION', Icon: IconBolt },
  { id: 'cooperation', label: '羁绊', en: 'S.LINK', Icon: IconHeart },
  { id: 'menu', label: '菜单', en: 'MENU', Icon: IconGrid },
];
/** 侧栏专属：记账（插在「菜单」上方，受 ledgerEnabled 控制）*/
export const SIDEBAR_LEDGER: NavItem = { id: 'ledger', label: '记账', en: 'LEDGER', Icon: IconCoin };
/** demo 里的「记账总开关」（真实 settings.ledgerEnabled，默认开）*/
export const LEDGER_ENABLED = true;

/** 真实 isNavActive：兼容旧路由 id */
export const isNavActive = (itemId: string, currentPage: string): boolean =>
  currentPage === itemId ||
  (itemId === 'actions' && (currentPage === 'todos' || currentPage === 'activities')) ||
  (itemId === 'cooperation' && currentPage === 'hideout');

/** 从 location 解析当前页 / tab（#/ → dashboard）*/
export function useCurrentPage(): { page: string; tab?: string } {
  const loc = useLocation();
  const m = loc.pathname.match(/^\/p\/([^/]+)/);
  const tab = new URLSearchParams(loc.search).get('tab') ?? undefined;
  return { page: m ? decodeURIComponent(m[1]) : 'dashboard', tab };
}

/** 点击导航项（底导与侧栏同口径）*/
function selectItem(id: string, active: boolean, tab: string | undefined, origin?: { x: number; y: number }, page?: string) {
  if (active) {
    if (id === 'actions') navigate('actions', tab === 'todos' ? 'activities' : 'todos', { transition: 'none', replace: true });
    // 同伴 ⇄ 组织：真实 toggleBondView(currentPage) → 组织 = currentPage 'hideout'；与页内「同伴/组织」切换同一落点、同一转场
    if (id === 'cooperation') navigate(page === 'hideout' ? 'cooperation' : 'hideout', undefined, { transition: 'noise' });
    return;
  }
  // 底导（带 origin）：真实 playHeavyTransition({ effect: 'water', origin }) → 从指尖涨潮；侧栏：黄方块推屏
  navigate(id, undefined, origin ? { transition: 'water', origin } : { transition: 'wipe' });
}

/** 真实口径：手指真正落下的点优先；键盘 / 合成 click（detail=0 或 0,0）退回按钮中心 */
const clickOrigin = (e: React.MouseEvent<HTMLElement>) => {
  const real = e.detail > 0 && (e.clientX !== 0 || e.clientY !== 0);
  if (real) return { x: e.clientX, y: e.clientY };
  const r = e.currentTarget.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

// ═══════════════════════════════ 底部导航 ═══════════════════════════════
const HOLD_MS = 500; // 真实：◈ 按住 500ms 绽放轮盘（guide §22.5）

const BottomNavInner = () => {
  const { page, tab } = useCurrentPage();
  const { wheel } = useShellState();
  const low = useLowMotion();
  const holdTimer = useRef<number | null>(null);
  const suppressClick = useRef(false);

  const cancelHold = () => { if (holdTimer.current !== null) { clearTimeout(holdTimer.current); holdTimer.current = null; } };
  useEffect(() => cancelHold, []);

  const startHold = (e: RPointerEvent<HTMLButtonElement>) => {
    suppressClick.current = false;
    const r = e.currentTarget.getBoundingClientRect();
    const origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    cancelHold();
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      suppressClick.current = true;
      openWheel(origin, true);
    }, HOLD_MS);
  };

  const renderTab = (item: NavItem) => {
    const active = isNavActive(item.id, page);
    return (
      <button
        key={item.id}
        type="button"
        aria-current={active ? 'page' : undefined}
        aria-label={item.label}
        onClick={(e) => selectItem(item.id, active, tab, clickOrigin(e), page)}
        className="group relative flex h-full min-w-0 flex-1 cursor-pointer flex-col items-center justify-center"
      >
        {active && (
          <span aria-hidden className="absolute inset-x-1 bottom-[7px] top-[9px] bg-p4g-yellow" style={{ transform: 'skewX(-12deg)', boxShadow: '3px 3px 0 var(--p4g-orange)' }} />
        )}
        <span className={cx('relative flex flex-col items-center gap-[3px] transition-transform duration-instant group-active:scale-90', active ? 'text-p4g-black' : 'text-white')}>
          <item.Icon filled={active} size={22} />
          <span className="font-display text-[10px] font-bold leading-none">{item.label}</span>
        </span>
        {active && <IconSparkle size={12} className="absolute right-2 top-2.5 text-p4g-orange" />}
      </button>
    );
  };

  return (
    <nav
      aria-label="主导航"
      className="fixed inset-x-0 bottom-0 flex flex-col wide:hidden"
      style={{ zIndex: 'var(--p4g-z-nav)' as unknown as number }}
    >
      <div aria-hidden className="h-[5px] p4g-candy" />
      <div className="relative flex h-[var(--p4g-nav-h)] items-stretch border-t-2 border-p4g-black bg-p4g-black px-1">
        {NAV_ITEMS.slice(0, 2).map(renderTab)}
        {/* 中央 ◈ 助手 */}
        <div className="relative h-full min-w-0 flex-1">
          <button
            type="button"
            aria-label="助手（长按打开快捷跳转）"
            onClick={() => {
              if (suppressClick.current) { suppressClick.current = false; return; }
              openAssistant();
            }}
            onPointerDown={startHold}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            onPointerCancel={cancelHold}
            onContextMenu={(e) => e.preventDefault()}
            className="group absolute left-1/2 -top-[22px] -ml-[33px] flex h-[66px] w-[66px] select-none items-center justify-center"
            style={{ touchAction: 'none' }}
          >
            <span aria-hidden className="absolute -inset-[9px]" />
            {/* 天气徽式同心环 */}
            <svg aria-hidden className="pointer-events-none absolute -inset-[10px]" viewBox="0 0 86 86" style={{ animation: low ? undefined : 'p4g-spin 18s linear infinite' }}>
              <circle cx="43" cy="43" r="40" fill="none" stroke="var(--p4g-yellow)" strokeWidth="4" strokeDasharray="34 8" />
            </svg>
            <span className={cx('relative flex h-full w-full items-center justify-center rounded-pill border-[3px] border-p4g-black bg-p4g-yellow text-p4g-black shadow-[0_0_0_3px_var(--p4g-yellow),0_0_0_6px_#111] transition-transform duration-instant group-active:scale-90', wheel.open && 'scale-90')}>
              <IconCat size={32} />
            </span>
          </button>
        </div>
        {NAV_ITEMS.slice(2).map(renderTab)}
      </div>
      <div aria-hidden className="bg-p4g-black" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
    </nav>
  );
};

// ═══════════════════════════════ 左侧栏 ═══════════════════════════════
const SidebarInner = () => {
  const { page, tab } = useCurrentPage();
  const items: Array<NavItem | 'assistant'> = [NAV_ITEMS[0], NAV_ITEMS[1], 'assistant', NAV_ITEMS[2], ...(LEDGER_ENABLED ? [SIDEBAR_LEDGER] : []), NAV_ITEMS[3]];

  const label = (text: string, on: boolean) => (
    <span
      className="min-w-0 truncate font-display font-bold leading-[1.08] text-p4g-black"
      style={{ fontSize: on ? 34 : 22, textShadow: '2px 0 0 rgba(255,255,255,.7), -2px 0 0 rgba(255,255,255,.7), 0 2px 0 rgba(255,255,255,.7), 0 -2px 0 rgba(255,255,255,.7)', transition: 'font-size var(--p4g-dur-fast) var(--p4g-ease-snap)' }}
    >{text}</span>
  );

  return (
    <aside
      aria-label="侧栏导航"
      className="fixed left-0 top-0 hidden h-screen w-[var(--p4g-sidebar-w)] flex-col border-r-[3px] border-p4g-black wide:flex"
      style={{ zIndex: 'var(--p4g-z-nav)' as unknown as number, background: 'var(--p4g-candy)' }}
    >
      {/* Logo 区（官方插槽 logo-small → 生成吉祥物兜底）*/}
      <div className="flex shrink-0 items-center gap-2.5 bg-p4g-black px-4 py-3">
        <SlotImg slot="logo-small" fallback={p4gAsset('tv-mascot.webp')} alt="MASKARIA" className="h-9 w-9 shrink-0 rounded-sm border-2 border-p4g-yellow bg-p4g-yellow object-contain" />
        <div className="min-w-0">
          <P4Outline size={19} stroke={3} fill="var(--p4g-yellow)" strokeColor="#000" italic>MASKARIA</P4Outline>
          <div className="font-display text-[9px] font-bold tracking-[0.3em] text-white/80">面具庭园</div>
        </div>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col justify-center gap-0.5 overflow-y-auto px-5 py-4">
        {items.map((it) => {
          if (it === 'assistant') {
            return (
              <button key="assistant" type="button" onClick={() => openAssistant()} className="group relative flex min-w-0 items-center gap-2.5 py-0.5 text-left">
                <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border-2 border-p4g-black bg-p4g-yellow text-p4g-black"><IconCat size={15} /></span>
                {label('助手', false)}
              </button>
            );
          }
          const active = isNavActive(it.id, page);
          return (
            <button key={it.id} type="button" aria-current={active ? 'page' : undefined} onClick={() => selectItem(it.id, active, tab, undefined, page)} className="group relative flex min-w-0 items-center gap-2.5 py-0.5 text-left">
              {active && <span aria-hidden className="absolute -left-4 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[9px] border-l-[12px] border-y-transparent border-l-p4g-black" />}
              <span aria-hidden className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-xs', active ? 'bg-p4g-black text-p4g-yellow' : 'bg-p4g-black/85 text-white')}><it.Icon filled={active} size={15} /></span>
              {label(it.label, active)}
            </button>
          );
        })}
      </nav>
      {/* 底部 HUD：黑色信息条（实机左下 "¥ 7,000" 条）*/}
      <div className="shrink-0 px-3 pb-4">
        <div className="flex items-center justify-between gap-2 rounded-r-pill bg-p4g-black py-2 pl-3 pr-2 text-white">
          <span className="font-display text-[11px] font-bold italic tracking-wider text-p4g-yellow">{(NAV_ITEMS.find((n) => isNavActive(n.id, page)) ?? (page === 'ledger' ? SIDEBAR_LEDGER : null))?.en ?? page.toUpperCase()}</span>
          <P4DateWeather variant="compact" weather="sunny" pill="yellow" />
        </div>
      </div>
    </aside>
  );
};

export const BottomNav = memo(BottomNavInner);
export const Sidebar = memo(SidebarInner);
