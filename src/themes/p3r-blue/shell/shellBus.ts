/**
 * Shell 事件总线 —— 页面 / 弹窗代理与外壳通信的**唯一**入口。
 *
 *   import { openAssistant, openWheel, navigate, closeAssistant, useShellState } from '@blue/shell/shellBus';
 *
 *   navigate('ledger')                         // → #/p/ledger（默认 wave 三斜板幕布）
 *   navigate('actions', 'todos')               // → #/p/actions?tab=todos
 *   navigate('todos')                          // 旧路由 id 兼容：等价于 navigate('actions','todos')
 *   navigate('settings', undefined, { transition: 'water', origin: {x,y} })   // 水波蓝光圈
 *   navigate('dashboard')                      // → #/
 *   openAssistant()                            // 打开助手面板（NavigatorWindow；真实：中间按钮短按）
 *   openWheel()                                // 打开长按轮盘（点选模式；真实：中间按钮长按 ≥500ms）
 *   openWheel({ x, y }, true)                  // 手势模式（指针按住中，松手选中）——Navigation 内部用
 *   back()                                     // history.back()
 *
 * 状态订阅：const { assistantOpen, wheel } = useShellState();
 */
import { useSyncExternalStore } from 'react';

/**
 * water = 底导：水波 → 蓝光圈（真实 playHeavyTransition({effect:'water', origin})，RippleIris）
 * wave  = p3 频道幕布：三斜板交错（真实 WaveSliceAct；侧栏 / 轮盘 / 页内跳转默认）
 * none  = 直接切（同页切 tab）
 * 兼容黄色版写法：'wipe' | 'noise' | 'wedge' 一律按 'wave' 处理。
 */
export type ShellTransition = 'water' | 'wave' | 'none' | 'wipe' | 'noise' | 'wedge';
export interface NavigateOptions { transition?: ShellTransition; replace?: boolean; params?: Record<string, string>; /** water 的涨潮原点（clientX/Y）*/ origin?: { x: number; y: number } }
export interface WheelState { open: boolean; origin: { x: number; y: number } | null; gesture: boolean }
export interface ShellState { assistantOpen: boolean; wheel: WheelState; currentPage: string; currentTab?: string }

type Navigator = (pageId: string, tab: string | undefined, opts: NavigateOptions) => void;

let state: ShellState = { assistantOpen: false, wheel: { open: false, origin: null, gesture: false }, currentPage: 'dashboard' };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (patch: Partial<ShellState>) => { state = { ...state, ...patch }; emit(); };

let navigator: Navigator | null = null;
/** AppShell 内部注册真正的跳转实现（含转场）。页面代理不要调用。 */
export const __registerNavigator = (fn: Navigator | null) => { navigator = fn; };
/** AppShell 内部同步当前页（路由变化时）。 */
export const __setCurrent = (currentPage: string, currentTab?: string) => {
  if (state.currentPage !== currentPage || state.currentTab !== currentTab) set({ currentPage, currentTab });
};

/** 真实 App 的旧路由 id 兼容层（Navigation.isNavActive / Actions 内部归一） */
export const normalizePage = (pageId: string, tab?: string): { pageId: string; tab?: string } => {
  if (pageId === 'todos' || pageId === 'activities') return { pageId: 'actions', tab: tab ?? pageId };
  if (pageId === 'terminal') return { pageId: 'dashboard' };
  return { pageId, tab };
};

export const pageHref = (pageId: string, tab?: string, params?: Record<string, string>): string => {
  const n = normalizePage(pageId, tab);
  const q = new URLSearchParams(params);
  if (n.tab) q.set('tab', n.tab);
  const qs = q.toString();
  if (n.pageId === 'dashboard') return `#/${qs ? `?${qs}` : ''}`;
  return `#/p/${n.pageId}${qs ? `?${qs}` : ''}`;
};

export function navigate(pageId: string, tab?: string, opts: NavigateOptions = {}): void {
  const n = normalizePage(pageId, tab);
  if (navigator) navigator(n.pageId, n.tab, opts);
  else window.location.hash = pageHref(n.pageId, n.tab, opts.params).slice(1);
}

export const openAssistant = () => set({ assistantOpen: true, wheel: { ...state.wheel, open: false } });
export const closeAssistant = () => set({ assistantOpen: false });
export const toggleAssistant = () => set({ assistantOpen: !state.assistantOpen });

export function openWheel(origin?: { x: number; y: number }, gesture = false): void {
  const o = origin ?? { x: window.innerWidth / 2, y: window.innerHeight - 40 };
  set({ wheel: { open: true, origin: o, gesture } });
}
export const closeWheel = () => set({ wheel: { ...state.wheel, open: false } });

export const back = () => window.history.back();

const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const getShellState = () => state;
export const useShellState = (): ShellState => useSyncExternalStore(subscribe, getShellState, getShellState);
