/**
 * 红频道内核（接入件 · 整包原样拷入 · 不要改）。不依赖正式仓库的任何文件。
 * 渲染的就是 demo 的整个 App（HashRouter + AppShell + 全部页面 / 弹层 / 演出），和 dist 里看到的一模一样。
 *   dark      → 日 / 夜（demo token 的 [data-p5r-mode]）；不传 = 由 URL ?__mode= / 本机偏好决定（验收页用）
 *   lowMotion → 低动效（demo 的 [data-p5r-motion=low]）；不传 = 由 URL ?__motion= 决定
 *   battle    → 路由 #/p/battle 时显示正式仓库自己的逆影战场（demo 里那页是占位）
 *   live      → 真实数据通道（adapter/live.ts 提供）；不传 = 纯 mock（验收页用）
 */
import { Suspense, useEffect, useLayoutEffect, useSyncExternalStore, type ReactNode } from 'react';
import App from '@/p5r-red/App';
import '@/p5r-red/index.css';
import { initPrefs, setPrefs } from '@/p5r-red/lib/prefs';
import { PAGES } from '@/p5r-red/registry/pages';
import { OVERLAYS } from '@/p5r-red/registry/overlays';
import { preload } from '@/p5r-red/shell/lazyRegistry';
import { installHistoryTear } from '@/p5r-red/shell/historyTear';

export interface LiveChannel { start: () => (() => void) | void; subscribe: (cb: () => void) => () => void; version: () => number }

let booted = false;
function boot() {
  if (booted) return;
  booted = true;
  initPrefs();
  installHistoryTear();
  for (const [k, e] of Object.entries(PAGES)) preload(`page:${k}`, e.load);
  for (const [k, e] of Object.entries(OVERLAYS)) preload(`overlay:${k}`, e.load);
}
const subHash = (cb: () => void) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb); };
const getHash = () => window.location.hash;
const noSub = () => () => {};
const zero = () => 0;

export default function RedChannelCore({ dark, lowMotion, battle, live }: { dark?: boolean; lowMotion?: boolean; battle?: ReactNode; live?: LiveChannel }) {
  boot();
  useLayoutEffect(() => {
    if (dark === undefined && lowMotion === undefined) return;
    setPrefs({ ...(dark === undefined ? {} : { mode: dark ? 'night' : 'day' }), ...(lowMotion === undefined ? {} : { motion: lowMotion ? 'low' : 'full' }), devHidden: true });
  }, [dark, lowMotion]);
  useEffect(() => (live ? live.start() || undefined : undefined), [live]);
  useSyncExternalStore(live ? live.subscribe : noSub, live ? live.version : zero); // 真实数据变了 → 整棵重渲染（不重挂载）
  const hash = useSyncExternalStore(subHash, getHash);
  if (battle && /^#\/p\/battle(\?|$)/.test(hash)) return <Suspense fallback={null}>{battle}</Suspense>;
  return <App />;
}
