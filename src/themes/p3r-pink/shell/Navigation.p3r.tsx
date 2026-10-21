/**
 * 导航外壳（真实 src/components/Navigation.tsx 的 p3 分支 1:1，粉变量）：
 *   BottomNav（竖屏）：首页 / 行动 / [猫 助手] / 羁绊 / 菜单；选中项 = 整格玫红实心斜块白字（layoutId 滑动）；
 *     中央裸猫（无壳，38px，--p3-cat）：短按开助手，按住 500ms 开轮盘（RadialWheelP3）；栏底奶油白 + 顶缘细线。
 *   Sidebar（html.layout-wide）：sheet-grad 底 + 右缘藕紫细线；MASKARIA + 句点；首页 / 行动 / 助手（藕紫斜片猫徽）/ 羁绊 / 记账 / 菜单；
 *     选中 = 玫红斜块白字 + 右下珊瑚小斜片。
 * 行为：已在「行动」再点 → 记录 ⇄ 任务；已在「羁绊」再点 → 同伴 ⇄ 组织（#/p/hideout）；底导切页 = 水波玫红光圈（origin=指尖），侧栏 = 三斜板幕布。
 */
import { motion } from 'framer-motion';
import { useEffect, useRef, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { IconBolt, IconCat, IconCoin, IconGrid, IconHeart, IconHome } from '@pink/kit/icons';
import { P3R, slantClip, tickClip, TitlePeriod } from '@pink/kit/base';
import { navigate, openAssistant, openWheel } from './shellBus';

const HOLD_MS = 500;
type NavItem = { id: string; label: string; Icon: (p: { filled?: boolean; size?: number }) => JSX.Element };
export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: '首页', Icon: IconHome },
  { id: 'actions', label: '行动', Icon: IconBolt },
  { id: 'cooperation', label: '羁绊', Icon: IconHeart },
  { id: 'menu', label: '菜单', Icon: IconGrid },
];
const SIDEBAR_LEDGER: NavItem = { id: 'ledger', label: '记账', Icon: IconCoin };

const isNavActive = (itemId: string, currentPage: string) =>
  currentPage === itemId || (itemId === 'actions' && (currentPage === 'todos' || currentPage === 'activities')) || (itemId === 'cooperation' && currentPage === 'hideout');

export function useCurrentPage(): { page: string; tab?: string } {
  const loc = useLocation();
  const m = loc.pathname.match(/^\/p\/([^/]+)/);
  const tab = new URLSearchParams(loc.search).get('tab') ?? undefined;
  return { page: m ? decodeURIComponent(m[1]) : 'dashboard', tab };
}

function selectItem(id: string, active: boolean, tab: string | undefined, page: string, origin?: { x: number; y: number }) {
  if (active) {
    if (id === 'actions') navigate('actions', tab === 'todos' ? 'activities' : 'todos', { transition: 'none', replace: true });
    if (id === 'cooperation') navigate(page === 'hideout' ? 'cooperation' : 'hideout', undefined, { transition: 'wave' });
    return;
  }
  navigate(id, undefined, origin ? { transition: 'water', origin } : { transition: 'wave' });
}
const clickOrigin = (e: RMouseEvent<HTMLElement>) => {
  if (e.detail > 0 && (e.clientX !== 0 || e.clientY !== 0)) return { x: e.clientX, y: e.clientY };
  const r = e.currentTarget.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

export function BottomNav() {
  const { page, tab } = useCurrentPage();
  const holdTimer = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const cancelHold = () => { if (holdTimer.current !== null) { clearTimeout(holdTimer.current); holdTimer.current = null; } };
  useEffect(() => cancelHold, []);
  const startHold = (e: RPointerEvent<HTMLButtonElement>) => {
    suppressClick.current = false;
    const r = e.currentTarget.getBoundingClientRect();
    const origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    cancelHold();
    holdTimer.current = window.setTimeout(() => { holdTimer.current = null; suppressClick.current = true; openWheel(origin, true); }, HOLD_MS);
  };
  const tabBtn = (item: NavItem) => {
    const active = isNavActive(item.id, page);
    return (
      <motion.button key={item.id} type="button" whileTap={{ scale: 0.88 }} aria-current={active ? 'page' : undefined}
        onClick={(e) => selectItem(item.id, active, tab, page, clickOrigin(e))}
        className="relative flex h-full flex-1 cursor-pointer flex-col items-center justify-center" style={{ color: active ? 'var(--p3r-on-blue)' : P3R.grey }}>
        {active && (
          <motion.div layoutId="bottomnav-active" transition={{ type: 'spring', stiffness: 520, damping: 34 }} aria-hidden className="absolute inset-x-0.5 bottom-1.5 top-1">
            <div className="absolute inset-0" style={{ background: P3R.blue, clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)' }} />
          </motion.div>
        )}
        <div className="relative flex flex-col items-center justify-center gap-1">
          <item.Icon filled={active} />
          <span className={`text-[10px] leading-none ${active ? 'font-black' : 'font-bold'}`}>{item.label}</span>
        </div>
      </motion.button>
    );
  };
  return (
    <motion.nav aria-label="底部导航" initial={{ y: 100 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 flex flex-col wide:hidden" style={{ zIndex: 'var(--p3r-z-nav)' as unknown as number, background: P3R.panel, borderTop: '1px solid rgb(var(--p3r-cyan-rgb) / 0.45)' }}>
      <div className="flex h-[var(--p3r-nav-h)] items-center px-0.5">
        {NAV_ITEMS.slice(0, 2).map(tabBtn)}
        <div className="relative h-full flex-1">
          <motion.button type="button" aria-label="助手（长按打开快捷跳转）" whileTap={{ scale: 0.9 }}
            onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } openAssistant(); }}
            onPointerDown={startHold} onPointerUp={cancelHold} onPointerLeave={cancelHold} onContextMenu={(e) => e.preventDefault()}
            className="absolute bottom-0 left-1/2 top-0 my-auto -ml-[30px] flex h-[60px] w-[60px] select-none items-center justify-center" style={{ color: 'var(--p3-cat)', touchAction: 'none' }}>
            <span aria-hidden className="absolute -inset-1.5" />
            <IconCat size={38} />
            <span aria-hidden className="absolute bottom-[9px] right-[9px] h-[6px] w-[11px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
          </motion.button>
        </div>
        {NAV_ITEMS.slice(2).map(tabBtn)}
      </div>
      <div aria-hidden style={{ height: 'env(safe-area-inset-bottom, 0px)', background: P3R.panel }} />
    </motion.nav>
  );
}

export function Sidebar({ ledger = true }: { ledger?: boolean }) {
  const { page, tab } = useCurrentPage();
  const item = (it: NavItem) => {
    const active = isNavActive(it.id, page);
    return (
      <motion.button key={it.id} type="button" whileTap={{ scale: 0.97 }} aria-current={active ? 'page' : undefined} onClick={() => selectItem(it.id, active, tab, page)}
        className="relative flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm font-black transition-colors duration-fast"
        style={active ? { clipPath: slantClip(10), background: P3R.blue, color: 'var(--p3r-on-blue)' } : { clipPath: slantClip(10), color: P3R.inkSoft }}>
        <it.Icon filled={active} />
        <span className="text-sm">{it.label}</span>
        {active && <span aria-hidden className="absolute bottom-0 right-4 h-[6px] w-[15px]" style={{ background: P3R.magenta, clipPath: tickClip }} />}
      </motion.button>
    );
  };
  return (
    <motion.aside aria-label="侧栏导航" initial={{ x: -280 }} animate={{ x: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed left-0 top-0 hidden h-screen w-[var(--p3r-sidebar-w)] flex-col wide:flex"
      style={{ zIndex: 'var(--p3r-z-nav)' as unknown as number, background: 'var(--p3r-sheet-grad)', borderRight: '1px solid rgb(var(--p3r-cyan-rgb) / 0.4)', boxShadow: 'var(--p3r-shadow)' }}>
      <div className="px-6 pb-5 pt-7">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center" style={{ clipPath: slantClip(5), background: P3R.blue, color: 'var(--p3r-on-blue)' }}><IconCat size={18} /></div>
          <div className="min-w-0">
            <h1 className="inline-flex items-end font-heavy text-[17px] leading-none" style={{ color: P3R.ink }}>MASKARIA<TitlePeriod className="mb-0 ml-1 scale-[0.6]" style={{ transformOrigin: 'left bottom' }} /></h1>
            <p className="mt-0.5 font-cond text-[10px] tracking-[0.14em]" style={{ color: P3R.blue }}>面具庭园</p>
          </div>
        </div>
      </div>
      <nav className="no-scrollbar min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {NAV_ITEMS.slice(0, 2).map(item)}
        <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => openAssistant()} className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm font-black" style={{ clipPath: slantClip(10), color: P3R.inkSoft }}>
          <span className="flex h-6 w-6 flex-none items-center justify-center" aria-hidden>
            <span className="flex h-[20px] w-[20px] items-center justify-center" style={{ background: P3R.cyan, clipPath: slantClip(4), color: 'var(--p3r-mulberry)' }}><IconCat size={14} /></span>
          </span>
          <span className="text-sm">助手</span>
        </motion.button>
        {item(NAV_ITEMS[2])}
        {ledger && item(SIDEBAR_LEDGER)}
        {item(NAV_ITEMS[3])}
      </nav>
    </motion.aside>
  );
}
