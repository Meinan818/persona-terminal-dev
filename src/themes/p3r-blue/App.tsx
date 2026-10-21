/**
 * 路由（HashRouter，dist 可 file:// 打开）：
 *   #/                 首页（PAGES.dashboard，未登记 → 占位）
 *   #/p/:pageId?tab=   页面注册表（src/registry/pages.pkgN.ts）；chromeless 页隐藏外壳导航
 *   #/overlay/:id      弹窗 / 演出注册表 + OverlayHarness（自动打开、阶段直达、重新打开、切日夜）
 *   #/__index          全部界面索引（src/inventory.ts + status/pkgN.json；含「演出总览」一键连播）
 *   #/__kit            kit 全组件展示
 * 外壳参数：?__mode=night|day  ?__motion=low|full  ?__dev=0（截图隐藏 Dev 胶囊）
 */
import { HashRouter, Route, Routes, useParams } from 'react-router-dom';
import { AppShell } from '@blue/shell/AppShell';
import { PageHost, isChromeless } from '@blue/screens/demo-harness/PageHost';
import { OverlayHarness } from '@blue/screens/demo-harness/OverlayHarness';
import { IndexPage } from '@blue/screens/demo-harness/IndexPage';
import { KitShowcase } from '@blue/screens/demo-harness/KitShowcase';
import { ReelBar } from '@blue/screens/demo-harness/ReelBar';
import { DevCapsule } from '@blue/shell/DevCapsule';
import { RadialWheelP3 } from '@blue/shell/RadialWheelP3.p3r';
import { P3ToastProvider } from '@blue/kit';
import { usePrefsEffect } from '@blue/lib/prefs';
import { DarkHourHost } from '@blue/shell/DarkHourHost';
/** 调试路由（#/__index、#/__kit、#/overlay/:id）只在 npm run dev 或 URL 带 ?__kitdev=1 时挂载 */
const KIT_DEV_ROUTES = import.meta.env.DEV || location.search.includes('__kitdev=1');

function ShellPage() {
  const { pageId } = useParams();
  return <AppShell chromeless={isChromeless(pageId)}><PageHost /></AppShell>;
}
/** 索引 / Kit 不挂外壳导航，但保留 Dev 胶囊与轮盘（Kit 里可打开轮盘） */
const Bare = ({ children }: { children: JSX.Element }) => (<>{children}<RadialWheelP3 /><DevCapsule /></>);

export default function App() {
  usePrefsEffect();
  return (
    <HashRouter>
      <P3ToastProvider>
        <ReelBar />
        <DarkHourHost />
        <Routes>
          <Route path="/" element={<AppShell><PageHost forceId="dashboard" /></AppShell>} />
          <Route path="/p/:pageId" element={<ShellPage />} />
          {KIT_DEV_ROUTES && <Route path="/overlay/:id" element={<OverlayHarness />} />}
          {KIT_DEV_ROUTES && <Route path="/__index" element={<Bare><IndexPage /></Bare>} />}
          {KIT_DEV_ROUTES && <Route path="/__kit" element={<Bare><KitShowcase /></Bare>} />}
          <Route path="*" element={<AppShell><PageHost forceId="dashboard" /></AppShell>} />
        </Routes>
      </P3ToastProvider>
    </HashRouter>
  );
}
