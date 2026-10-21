/**
 * AppShell —— 外壳（原 shared/app.js 的 DOM 骨架：#stage-bg / #side / #view > .page / #bnav / #demo-ctl，id 与类名逐字一致）：
 *   舞台：#stage-bg 按页面注册表 stage(wide) 渲染矢量放射背景 + 剪影 + 颗粒
 *   导航：竖屏底栏 #bnav；700–1023 横屏窄侧栏 / ≥1024 横屏宽侧栏 #side（CSS 媒体查询，同原生）
 *   内容：#view > .page[.flush][data-page]（每次切页是新元素 → 水波纹圆形揭示作用在它上面）
 *   全局：长按轮盘、助手面板、OverlayHost（openOverlay）、SurpriseFx、DevCapsule
 * 转场：shellBus.navigate(id, { via }) → water（默认，底栏/侧栏/返回键）| tear（仪式点）| none。
 * 浏览器前进/后退 / 手改 hash：页面之间播星形反撕（src/shell/historyTear.ts，main.tsx 在路由之前安装），同原生 v3。
 */
import { Suspense, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { BottomNav, Sidebar } from './Navigation.p5r';
import { ShellRadialWheel } from './RadialWheelP5.p5r';
import { __registerNavigator, __setCurrent, closeAssistant, pageHref, useShellState, type NavigateOptions } from './shellBus';
import { DevCapsule } from './DevCapsule';
import { OverlayHost } from './OverlayHost';
import AssistantPlaceholder from './AssistantPlaceholder';
import { OVERLAYS } from '@/p5r-red/registry/overlays';
import { PAGES } from '@/p5r-red/registry/pages';
import { lazyOf } from './lazyRegistry';
import { useWide } from '@/p5r-red/lib/layout';
import { P5StageLayers, defaultStage } from '@/p5r-red/fx/bg';
import { waterNav, starTear } from '@/p5r-red/fx/transitions';
import { installSurpriseFx } from '@/p5r-red/fx/surprise';

function AssistantHost() {
  const { assistantOpen } = useShellState();
  const entry = OVERLAYS['assistant-window'];
  if (!entry) return <AssistantPlaceholder open={assistantOpen} onClose={closeAssistant} />;
  const C = lazyOf('overlay:assistant-window', entry.load);
  return <Suspense fallback={null}><C open={assistantOpen} onClose={closeAssistant} /></Suspense>;
}

export function AppShell({ pageId, children, chromeless = false }: { pageId: string; children: ReactNode; chromeless?: boolean }) {
  const nav = useNavigate();
  const loc = useLocation();
  const wide = useWide();
  const entry = PAGES[pageId];
  const stage = entry?.stage ? entry.stage(wide, new URLSearchParams(loc.search)) : defaultStage(wide);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => { __setCurrent(pageId); document.title = `${entry?.title || pageId} · MASKARIA P5R demo`; }, [pageId, entry]);
  useEffect(() => installSurpriseFx(), []);
  useEffect(() => { history.scrollRestoration = 'manual'; }, []);

  const go = useCallback((href: string, replace?: boolean) => {
    flushSync(() => nav(href.replace(/^#/, ''), { replace }));
    window.scrollTo(0, 0);
  }, [nav]);

  useEffect(() => {
    __registerNavigator((id: string, opts: NavigateOptions) => {
      const href = pageHref(id, opts.params);
      if (href === `#${loc.pathname}${loc.search}`) return;
      const via = opts.via ?? 'water';
      window.scrollTo(0, 0);
      if (via === 'tear') starTear(() => go(href, opts.replace));
      else if (via === 'none') go(href, opts.replace);
      else waterNav(opts.origin ?? { x: innerWidth / 2, y: innerHeight / 2 }, () => { go(href, opts.replace); return pageRef.current; });
    });
    return () => __registerNavigator(null);
  }, [go, loc.pathname, loc.search, pageId]);

  return (
    <>
      <div id="stage-bg" aria-hidden="true"><P5StageLayers stage={stage} /></div>
      {!chromeless && <Sidebar />}
      <main id="view">
        <div key={loc.pathname + loc.search} ref={pageRef} className={`page${entry?.flush ? ' flush' : ''}`} data-page={pageId}>{children}</div>
      </main>
      {!chromeless && <BottomNav />}
      <ShellRadialWheel />
      <AssistantHost />
      <OverlayHost />
      <DevCapsule />
    </>
  );
}
