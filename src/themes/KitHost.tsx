/**
 * 【工具生成，勿手改；重跑 tools/integrate.mjs 会覆盖】主题整套切换。
 * user.theme ∈ {yellow, pink, blue} → 渲染对应 src/themes/<dir>/ThemeApp（整页替换，不再走旧页面）。
 * 其余主题（red / custom / 尚未接入的）→ kitThemeOf 返回 null，App.tsx 照旧渲染旧界面（红色 p5 一行不改）。
 * 紧急回退：浏览器控制台执行 localStorage.setItem('kit:off','1'); location.reload()  → 全部回旧界面。
 */
import { lazy, Suspense, useEffect, useLayoutEffect } from 'react';
import type { ThemeType } from '@/types';

const LOADERS = {
  yellow: lazy(() => import('@yellow/ThemeApp')),
  pink: lazy(() => import('@pink/ThemeApp')),
  blue: lazy(() => import('@blue/ThemeApp')),
} as const;
export type KitTheme = keyof typeof LOADERS;
const KIT_NAME: Record<KitTheme, string> = { yellow: 'p4g-yellow', pink: 'p3r-pink', blue: 'p3r-blue' };

export const kitThemeOf = (theme: ThemeType | undefined | null): KitTheme | null => {
  try { if (localStorage.getItem('kit:off') === '1') return null; } catch { /* ignore */ }
  return theme && theme in LOADERS ? (theme as KitTheme) : null;
};

/** 记住本次加载的是哪套；切到另一套（或切回红/自定义）时整页刷新，保证同一时刻页面里只有一套主题的 CSS */
const LOADED_KEY = '__kitLoaded';
export function useKitReloadGuard(theme: ThemeType | undefined | null) {
  useEffect(() => {
    if (!theme) return; // 未登录 / 尚未读到用户时不判断
    const w = window as unknown as Record<string, string | null | undefined>;
    const now = kitThemeOf(theme);
    if (w[LOADED_KEY] === undefined) { w[LOADED_KEY] = now; return; }
    if (w[LOADED_KEY] !== now) window.location.reload();
  }, [theme]);
}

export function KitHost({ theme }: { theme: KitTheme }) {
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-kit', KIT_NAME[theme]);
    return () => document.documentElement.removeAttribute('data-kit');
  }, [theme]);
  const C = LOADERS[theme];
  return <Suspense fallback={null}><C /></Suspense>;
}
