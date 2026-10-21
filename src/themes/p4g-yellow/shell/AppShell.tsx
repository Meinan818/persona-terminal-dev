/**
 * AppShell —— 外壳：舞台底 + 导航（竖屏底导 / 宽屏侧栏，按真实 layoutMode 规则）+ 内容列 + 全局浮层
 * （轮盘、助手面板、转场 fx、扫描线、Dev 胶囊）。
 *
 * 转场：shellBus.navigate(page, tab, { transition })
 *   water（底导，真实 effect:'water'）→ TideSquares 从指尖涨潮；wedge（轮盘跳转，真实 P4 频道幕布）→ WedgeCut；
 *   wipe（默认 / 侧栏 / 页内跳转）→ YellowWipe；noise → ChannelNoise；none → 直接切。低动效时各转场同步切页。
 *   浏览器前进/后退 → 内容层快速淡入。
 * 内容列：main 与真实一致（wide:ml-60 px-4 wide:px-8，底部留出底导高度 + 安全区），内层 max-w-page 居中。
 */
import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BottomNav, Sidebar, useCurrentPage } from './Navigation.p4g';
import { RadialWheelP4 } from './RadialWheelP4.p4g';
import { __registerNavigator, __setCurrent, closeAssistant, pageHref, useShellState, type NavigateOptions } from './shellBus';
import { YellowWipe } from '@yellow/fx/YellowWipe';
import { ChannelNoise } from '@yellow/fx/ChannelNoise';
import { TideSquares, WedgeCut } from '@yellow/fx/HeavyTransition';
import { ScanlineOverlay } from '@yellow/fx/ScanlineOverlay';
import { DevCapsule } from './DevCapsule';
import { OVERLAYS } from '@yellow/registry/overlays';
import { lazyOf } from './lazyRegistry';
import NavigatorPlaceholder from './NavigatorPlaceholder';
import { useLowMotion } from '@yellow/lib/prefs';
import { useSlotExists, slotUrl } from '@yellow/lib/slots';

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
  const low = useLowMotion();
  const { page, tab } = useCurrentPage();
  const [fx, setFx] = useState<null | { kind: 'wipe' | 'noise' | 'water' | 'wedge'; href: string; replace?: boolean; origin?: { x: number; y: number } }>(null);
  const pending = useRef<string | null>(null);
  const stageSlot = useSlotExists('stage-bg');

  useEffect(() => { __setCurrent(page, tab); }, [page, tab]);

  const go = useCallback((href: string, replace?: boolean) => {
    nav(href.replace(/^#/, ''), { replace });
    window.scrollTo(0, 0);
  }, [nav]);

  useEffect(() => {
    __registerNavigator((pageId: string, t: string | undefined, opts: NavigateOptions) => {
      const href = pageHref(pageId, t, opts.params);
      const cur = `#${loc.pathname}${loc.search}`;
      if (href === cur) return;
      const tr = opts.transition ?? 'wipe';
      if (tr === 'none' || fx) { go(href, opts.replace); return; }
      pending.current = href;
      setFx({ kind: tr, href, replace: opts.replace, origin: opts.origin ?? { x: window.innerWidth / 2, y: window.innerHeight - 30 } });
    });
    return () => __registerNavigator(null);
  }, [go, loc.pathname, loc.search, fx]);

  const onCovered = useCallback(() => { if (pending.current) { go(pending.current, fx?.replace); pending.current = null; } }, [go, fx]);
  const onDone = useCallback(() => setFx(null), []);

  return (
    <div className="p4g-stage relative min-h-screen" style={stageSlot ? { backgroundImage: `url(${slotUrl('stage-bg')})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' } : undefined}>
      <ScanlineOverlay />
      {!chromeless && <Sidebar />}
      {!chromeless && <BottomNav />}
      <main
        className={chromeless ? 'relative min-h-screen' : 'relative px-4 pb-[calc(var(--p4g-nav-h)+5px+env(safe-area-inset-bottom)+1rem)] pt-[calc(1rem+env(safe-area-inset-top))] wide:ml-[var(--p4g-sidebar-w)] wide:px-8 wide:pb-8 wide:pt-8'}
        style={{ overflowX: 'clip' }}
      >
        <motion.div
          key={loc.pathname + loc.search}
          className={chromeless ? '' : 'mx-auto w-full max-w-page min-w-0'}
          initial={{ opacity: fx ? 1 : 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: low ? 0.08 : 0.18 }}
        >
          {children}
        </motion.div>
      </main>
      <RadialWheelP4 />
      <AssistantHost />
      <YellowWipe active={fx?.kind === 'wipe'} onCovered={onCovered} onDone={onDone} />
      <ChannelNoise active={fx?.kind === 'noise'} onCovered={onCovered} onDone={onDone} />
      <TideSquares active={fx?.kind === 'water'} origin={fx?.origin ?? null} onCovered={onCovered} onDone={onDone} />
      <WedgeCut active={fx?.kind === 'wedge'} onCovered={onCovered} onDone={onDone} />
      <DevCapsule />
    </div>
  );
}
