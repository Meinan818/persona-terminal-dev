/**
 * AppShell —— 外壳：粉舞台（PinkStage）+ 导航（竖屏底导 / 宽屏侧栏，真实 layoutMode 规则）+ 内容列 + 全局浮层（轮盘、助手、转场、Dev 胶囊）。
 * 转场：shellBus.navigate(page, tab, { transition })
 *   water（底导）→ WaterRippleP3 两圈环 + 新页 circle() 540ms 揭示；wave（默认 / 侧栏 / 轮盘 / 页内）→ WaveSliceP3 五竖栅；none → 直接切（见 ShellTransition.tsx）。
 *   低动效：同步切页。新页内容层 PageEnter 斜切滑入。
 * 内容列：与真实一致（wide:ml-60 px-4 wide:px-8，底部留底导高度 + 安全区），内层 max-w-page 居中。
 * 舞台：页面路由 data 里 pageId==='dashboard' 时 variant='home'（首页自己挂 HomeHeroDecor）。
 */
import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BottomNav, Sidebar, useCurrentPage } from './Navigation.p3r';
import { RadialWheelP3 } from './RadialWheelP3.p3r';
import { __registerNavigator, __setCurrent, closeAssistant, pageHref, useShellState, type NavigateOptions } from './shellBus';
import { PageEnter } from '@pink/fx/Transitions';
import { ShellTransition, type ShellFx } from './ShellTransition';
import { useBoldness } from '@pink/lib/prefs';
import { PinkStage } from '@pink/fx/PinkStage';
import { DevCapsule } from './DevCapsule';
import { OVERLAYS } from '@pink/registry/overlays';
import { lazyOf } from './lazyRegistry';
import NavigatorPlaceholder from './NavigatorPlaceholder';

function AssistantHost() {
  const { assistantOpen } = useShellState();
  const entry = OVERLAYS.NavigatorWindow;
  if (!entry) return <NavigatorPlaceholder open={assistantOpen} onClose={closeAssistant} />;
  const C = lazyOf('overlay:NavigatorWindow', entry.load);
  return <Suspense fallback={null}><C open={assistantOpen} onClose={closeAssistant} /></Suspense>;
}


export function AppShell({ children, chromeless = false }: { children: ReactNode; chromeless?: boolean }) {
  const nav = useNavigate();
  const loc = useLocation();
  const { page, tab } = useCurrentPage();
  const [fx, setFx] = useState<ShellFx>(null);
  const pending = useRef<{ href: string; replace?: boolean } | null>(null);
  const fxId = useRef(0);
  const anim = useBoldness();
  const [reveal, setReveal] = useState<null | { x: number; y: number; id: number }>(null);

  useEffect(() => { __setCurrent(page, tab); }, [page, tab]);
  const go = useCallback((href: string, replace?: boolean) => { nav(href.replace(/^#/, ''), { replace }); window.scrollTo(0, 0); }, [nav]);

  useEffect(() => {
    __registerNavigator((pageId: string, t: string | undefined, opts: NavigateOptions) => {
      const href = pageHref(pageId, t, opts.params);
      const cur = `#${loc.pathname}${loc.search}`;
      if (href === cur) return;
      const tr = opts.transition ?? 'wave';
      if (tr === 'none' || fx) { go(href, opts.replace); return; }
      pending.current = { href, replace: opts.replace };
      const kind = tr === 'water' ? 'water' : 'wave';
      fxId.current += 1;
      if (kind === 'water' && anim) setReveal({ ...(opts.origin ?? { x: window.innerWidth / 2, y: window.innerHeight - 34 }), id: fxId.current });
      setFx({ kind, origin: opts.origin, id: fxId.current });
    });
    return () => __registerNavigator(null);
  }, [go, loc.pathname, loc.search, fx, anim]);

  const onCovered = useCallback(() => { const p = pending.current; if (p) { pending.current = null; go(p.href, p.replace); } }, [go]);
  const onDone = useCallback(() => { setFx(null); setReveal(null); }, []);
  const R = reveal ? Math.hypot(Math.max(reveal.x, window.innerWidth - reveal.x), Math.max(reveal.y, window.innerHeight - reveal.y)) + 40 : 0;

  return (
    <div className="relative min-h-screen" style={{ color: 'var(--p3r-ink)' }}>
      <PinkStage variant={page === 'dashboard' ? 'home' : 'page'} />
      {!chromeless && <Sidebar />}
      {!chromeless && <BottomNav />}
      <main className={chromeless ? 'relative z-10 min-h-screen' : 'relative z-10 px-4 pb-[calc(var(--p3r-nav-h)+5px+env(safe-area-inset-bottom)+1rem)] pt-[calc(1rem+env(safe-area-inset-top))] wide:ml-[var(--p3r-sidebar-w)] wide:px-8 wide:pb-8 wide:pt-8'}
        style={{ overflowX: 'clip' }}>
        <div style={reveal ? { animation: `${reveal.id % 2 ? 'pk-shell-rv-a' : 'pk-shell-rv-b'} 540ms cubic-bezier(0.3,0,0.2,1) both`, ['--rv-x' as string]: `${reveal.x}px`, ['--rv-y' as string]: `${reveal.y}px`, ['--rv-r' as string]: `${R}px` } : undefined}>
          <PageEnter k={loc.pathname + loc.search} className={chromeless ? '' : 'mx-auto w-full min-w-0 max-w-page'}>{children}</PageEnter>
        </div>
      </main>
      <RadialWheelP3 />
      <AssistantHost />
      <ShellTransition fx={fx} onCovered={onCovered} onDone={onDone} />
      <DevCapsule />
    </div>
  );
}
