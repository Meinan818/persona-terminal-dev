/**
 * 路由（HashRouter，dist 可 file:// 打开）：
 *   #/                 首页（PAGES.dashboard，未登记 → 占位）
 *   #/p/:pageId?tab=   页面注册表（src/registry/pages.pkgN.ts）；chromeless 页隐藏外壳导航
 *   #/overlay/:id      弹窗注册表 + OverlayHarness（自动打开、重新打开、切日夜）
 *   #/__index          隐藏索引（src/inventory.ts）
 *   #/__kit            kit 全组件展示
 */
import { HashRouter, Route, Routes, useParams } from 'react-router-dom';
import { AppShell } from '@yellow/shell/AppShell';
import { PageHost, isChromeless } from '@yellow/screens/demo-harness/PageHost';
import { OverlayHarness } from '@yellow/screens/demo-harness/OverlayHarness';
import { IndexPage } from '@yellow/screens/demo-harness/IndexPage';
import { KitShowcase } from '@yellow/screens/demo-harness/KitShowcase';
import { P4ToastProvider } from '@yellow/kit';
import { usePrefsEffect } from '@yellow/lib/prefs';
/** 调试路由（#/__index、#/__kit、#/overlay/:id）只在 npm run dev 或 URL 带 ?__kitdev=1 时挂载 */
const KIT_DEV_ROUTES = import.meta.env.DEV || location.search.includes('__kitdev=1');

function ShellPage() {
  const { pageId } = useParams();
  return <AppShell chromeless={isChromeless(pageId)}><PageHost /></AppShell>;
}

export default function App() {
  usePrefsEffect();
  return (
    <HashRouter>
      <P4ToastProvider>
        <Routes>
          <Route path="/" element={<AppShell><PageHost forceId="dashboard" /></AppShell>} />
          <Route path="/p/:pageId" element={<ShellPage />} />
          {KIT_DEV_ROUTES && <Route path="/overlay/:id" element={<OverlayHarness />} />}
          {KIT_DEV_ROUTES && <Route path="/__index" element={<IndexPage />} />}
          {KIT_DEV_ROUTES && <Route path="/__kit" element={<KitShowcase />} />}
          <Route path="*" element={<AppShell><PageHost forceId="dashboard" /></AppShell>} />
        </Routes>
      </P4ToastProvider>
    </HashRouter>
  );
}
