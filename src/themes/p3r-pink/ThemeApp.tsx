/**
 * pink 主题整套入口（由 tools/integrate.mjs 生成，可手改）。
 * 等价于 demo 的 src/main.tsx：同样的 CSS 引入顺序 + 同样的 init 调用，渲染 demo 原 App（HashRouter + 外壳 + 页面注册表）。
 * 两座桥：RouteBridge（store.currentPage ⇄ #/p/<page>）、PrefsBridge（settings.darkMode / 低动效 ⇄ demo prefs）。
 */
import './tokens/p3r.css';
import './index.css';
import DemoApp from './App';
import { initPrefs } from '@pink/lib/prefs';
import { initLayout } from '@pink/lib/layout';
import { RouteBridge } from './bridge/RouteBridge';
import { PrefsBridge } from './bridge/PrefsBridge';
import { GlobalOverlayHost } from './bridge/GlobalOverlayHost';
import { CallingCardOverlayHost } from './bridge/CallingCardOverlayHost';

let inited = false;
function initOnce() {
  if (inited) return;
  inited = true;
  initPrefs();
  initLayout();
}

export default function ThemeApp() {
  initOnce();
  return (
    <>
      <PrefsBridge />
      <RouteBridge />
      <DemoApp />
      <GlobalOverlayHost />
      <CallingCardOverlayHost />
    </>
  );
}
