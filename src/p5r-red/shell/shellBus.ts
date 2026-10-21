/**
 * Shell 事件总线 —— 页面 / 弹层与外壳通信的**唯一**入口。
 *
 *   navigate('menu')                                   // 默认 water（水波纹 + 圆形揭示，原 P5.go 默认）
 *   navigate('astrology', { via: 'tear' })             // 星形反撕（「仪式点」跳页：菜单条目 / 首页入口卡 / 轮盘）
 *   navigate('actions', { tab: 'todos' })              // → #/p/actions?tab=todos（旧 id 'todos'/'activities' 自动归一）
 *   navigate('menu', { via: 'water', origin: { x, y } })  // 指定水波纹原点（clientX/Y）
 *   navigate('dashboard', { via: 'none' })             // 直接切
 *   openOverlay('OnThisDaySheet', { variant: 'x' })    // 打开注册表里的弹层（未登记 → 吐司「待移植」）
 *   openAssistant() / openWheel({x,y}, hold)           // 助手面板 / 长按轮盘
 *   back()
 * 状态订阅：const { assistantOpen, wheel, overlay, currentPage } = useShellState();
 * 路由：#/p/<真实 currentPage id>?tab=&view=&state=（dashboard / actions / cooperation / menu / ledger / settings / account /
 *       astrology / achievements / statistics / hideout / battle / reset-password / callingcard（用户更正：保留 v3 宣告卡页）；#/ = dashboard）；弹层 #/overlay/<id>?step=&state=&variant=。
 */
import { useSyncExternalStore } from 'react';

export type ShellVia = 'water' | 'tear' | 'none';
export interface NavigateOptions { via?: ShellVia; tab?: string; origin?: { x: number; y: number }; params?: Record<string, string>; replace?: boolean }
export interface WheelState { open: boolean; origin: { x: number; y: number } | null; hold: boolean }
export interface OverlayReq { id: string; params?: Record<string, string>; gen: number }
export interface ShellState { assistantOpen: boolean; wheel: WheelState; overlay: OverlayReq | null; currentPage: string }

type Navigator = (pageId: string, opts: NavigateOptions) => void;

let state: ShellState = { assistantOpen: false, wheel: { open: false, origin: null, hold: false }, overlay: null, currentPage: 'dashboard' };
const listeners = new Set<() => void>();
const set = (patch: Partial<ShellState>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };

let navigator: Navigator | null = null;
/** AppShell 内部注册真正的跳转实现（含转场）。页面不要调用。 */
export const __registerNavigator = (fn: Navigator | null) => { navigator = fn; };
export const __setCurrent = (currentPage: string) => { if (state.currentPage !== currentPage) set({ currentPage }); };

/** 原生 v3 旧 id → 真实 currentPage id（#/home、#/todos、#/coop … 旧链接与旧调用都能落到正确页） */
export const LEGACY_PAGE: Record<string, { id: string; tab?: string }> = {
  '': { id: 'dashboard' }, home: { id: 'dashboard' }, todos: { id: 'actions', tab: 'todos' }, activities: { id: 'actions', tab: 'activities' },
  coop: { id: 'cooperation' }, astro: { id: 'astrology' }, stats: { id: 'statistics' }, org: { id: 'hideout' },
};
export const normalizePage = (pageId: string, tab?: string): { id: string; tab?: string } => {
  const l = LEGACY_PAGE[pageId];
  return l ? { id: l.id, tab: tab ?? l.tab } : { id: pageId, tab };
};

export const pageHref = (pageId: string, params?: Record<string, string>): string => {
  const n = normalizePage(pageId, params?.tab);
  const q = new URLSearchParams(params); if (n.tab) q.set('tab', n.tab);
  const qs = q.toString();
  return `#/p/${n.id}${qs ? `?${qs}` : ''}`;
};

export function navigate(pageId: string, opts: NavigateOptions = {}): void {
  const n = normalizePage(pageId, opts.tab);
  const o = { ...opts, params: { ...opts.params, ...(n.tab ? { tab: n.tab } : {}) } };
  if (navigator) navigator(n.id, o);
  else window.location.hash = pageHref(n.id, o.params).slice(1);
}
export const back = () => window.history.back();

export const openAssistant = () => set({ assistantOpen: true, wheel: { ...state.wheel, open: false } });
export const closeAssistant = () => set({ assistantOpen: false });

export function openWheel(origin?: { x: number; y: number }, hold = false): void {
  set({ wheel: { open: true, origin: origin ?? { x: window.innerWidth / 2, y: window.innerHeight - 46 }, hold } });
}
export const closeWheel = () => set({ wheel: { ...state.wheel, open: false } });

let gen = 0;
export const openOverlay = (id: string, params?: Record<string, string>) => set({ overlay: { id, params, gen: ++gen } });
export const closeOverlay = () => set({ overlay: null });

const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const getShellState = () => state;
export const useShellState = (): ShellState => useSyncExternalStore(subscribe, getShellState, getShellState);
