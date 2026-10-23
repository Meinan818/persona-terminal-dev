/**
 * yellow 主题整套入口（由 tools/integrate.mjs 生成，可手改）。
 * 等价于 demo 的 src/main.tsx：同样的 CSS 引入顺序 + 同样的 init 调用，渲染 demo 原 App（HashRouter + 外壳 + 页面注册表）。
 * 两座桥：RouteBridge（store.currentPage ⇄ #/p/<page>）、PrefsBridge（settings.darkMode / 低动效 ⇄ demo prefs）。
 */
import './index.css';
import './tokens/p4g.css';
import DemoApp from './App';
import { initPrefs } from '@yellow/lib/prefs';
import { initLayout } from '@yellow/lib/layout';
import { installOfficialFonts } from '@yellow/lib/slots';
import { RouteBridge } from './bridge/RouteBridge';
import { PrefsBridge } from './bridge/PrefsBridge';
import { GlobalOverlayHost } from './bridge/GlobalOverlayHost';
import { CallingCardOverlayHost } from './bridge/CallingCardOverlayHost';
import { usePresence, setPresence } from '@yellow/screens/pkg5/presence';
import { PresenceBridge } from '@/themes/integration/PresenceBridge';
import { ThemeSfxBridge } from '@/ui/ThemeSfxBridge';

let inited = false;
function initOnce() {
  if (inited) return;
  inited = true;
  initPrefs();
  initLayout();
  installOfficialFonts();
}

export default function ThemeApp() {
  initOnce();
  return (
    <>
      <PrefsBridge />
      <RouteBridge />
      <PresenceSync />
      <DemoApp />
      <ThemeSfxBridge />
      <GlobalOverlayHost />
      <CallingCardOverlayHost />
    </>
  );
}

function PresenceSync() {
  const presence = usePresence();
  return <PresenceBridge presence={presence} setPresence={setPresence} />;
}
