/**
 * 路由（HashRouter，dist 可 file:// 打开）：
 *   #/                 首页 dashboard
 *   #/p/:pageId?tab=&view=&state=   页面注册表（pageId = 真实 currentPage：dashboard / actions / cooperation / menu / ledger /
 *                      settings / account / astrology / achievements / statistics / hideout / battle / reset-password；启动类 #/p/boot，通用状态 #/p/states）
 *   #/overlay/:id?step=&state=&variant=   弹层单独预览（OverlayHarness）；#/overlay/fx-showreel 演出连播
 *   #/__index          隐藏索引（src/inventory.ts）
 *   #/__kit            Kit 全组件展示
 *   #/:legacyId        原生 v3 旧链接（#/home、#/todos、#/coop…）→ 重定向到真实 id
 * 外壳 URL 参数一律 __ 前缀：?__mode=day|night&__motion=low|full&__dev=0&__fx=0&__snd=0
 */
import { HashRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { AppShell } from '@/p5r-red/shell/AppShell';
import { PageHost, isChromeless } from '@/p5r-red/screens/demo-harness/PageHost';
import { OverlayHarness } from '@/p5r-red/screens/demo-harness/OverlayHarness';
import { IndexPage } from '@/p5r-red/screens/demo-harness/IndexPage';
import { KitShowcase } from '@/p5r-red/screens/demo-harness/KitShowcase';
import { usePrefsEffect } from '@/p5r-red/lib/prefs';
import { normalizePage, pageHref } from '@/p5r-red/shell/shellBus';

function ShellPage({ forceId }: { forceId?: string }) {
  const { pageId = 'dashboard' } = useParams();
  const id = normalizePage(forceId ?? pageId).id;
  return <AppShell pageId={id} chromeless={isChromeless(id)}><PageHost pageId={id} /></AppShell>;
}
function Legacy() {
  const { legacy = '' } = useParams();
  const loc = useLocation();
  const q = Object.fromEntries(new URLSearchParams(loc.search));
  return <Navigate to={pageHref(legacy, q).slice(1)} replace />;
}

export default function App() {
  usePrefsEffect();
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ShellPage forceId="dashboard" />} />
        <Route path="/p/:pageId" element={<ShellPage />} />
        <Route path="/overlay/:id" element={<OverlayHarness />} />
        <Route path="/__index" element={<IndexPage />} />
        <Route path="/__kit" element={<KitShowcase />} />
        <Route path="/:legacy" element={<Legacy />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
