/**
 * pkg3 命令式移植层的 React 宿主。
 *  · <ImperativePage def wide before/>：等价原生 P5.page(id, { render(wide), mount(root, wide), enter(root) })；
 *    P5.rerender() → 换 key 重挂（新 DOM、新监听，同原生 render + mount + enter）。低动效不跑 enter。
 *  · imperativeOverlay(open)：#/overlay/<id> 弹层组件。open(params) 调命令式弹层；全部弹层 / 演出层（LAYER_SEL）
 *    离开 DOM 450ms 后回调 onClose；组件卸载时收掉残留层（演出层播完即卸载）。
 */
import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import { LAYER_SEL, setRerender } from './p5';
import { OC } from './oc';

export interface ImperativeDef { render: (wide: boolean) => string; mount?: (root: HTMLElement, wide: boolean) => void; enter?: (root: HTMLElement) => void }

export function ImperativePage({ def, wide, before, className }: { def: ImperativeDef; wide: boolean; before?: () => void; className?: string }) {
  const [gen, setGen] = useState(0);
  // 切页 / 卸载时收掉本页打开的命令式弹层（它们挂在 body 上）
  useEffect(() => () => clearLayers(), []);
  return <PageBody key={gen} def={def} wide={wide} before={gen === 0 ? before : undefined} onRerender={() => setGen((g) => g + 1)} className={className} />;
}

function PageBody({ def, wide, before, onRerender, className }: { def: ImperativeDef; wide: boolean; before?: () => void; onRerender: () => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    // 每次挂载用一个全新的根节点（StrictMode 双调用 / 重渲染时不叠监听）
    const root = document.createElement('div'); root.style.display = 'contents';
    ref.current!.appendChild(root);
    before?.();
    root.innerHTML = def.render(wide);
    def.mount?.(root, wide);
    if (!isLowMotion()) def.enter?.(root);
    setRerender(onRerender);
    return () => { setRerender(null); root.remove(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={ref} className={className} style={{ display: 'contents' }} />;
}

/** 收掉残留的命令式弹层（演出层播完即卸载；宿主卸载 / 切页时调用） */
export function clearLayers(): void {
  try { OC.closeAll(); } catch { /* noop */ }
  OC.hideHero?.();
  const left = Array.from(document.querySelectorAll(LAYER_SEL));
  setTimeout(() => left.forEach((el) => el.remove()), 260);
}

export function imperativeOverlay(open: (p: URLSearchParams) => unknown): ComponentType<OverlayProps> {
  return function Pkg3Overlay({ open: isOpen, onClose, params }: OverlayProps) {
    const oc = useRef(onClose); oc.current = onClose;
    useEffect(() => {
      if (!isOpen) return;
      let done = false, t = 0;
      const check = () => { clearTimeout(t); t = window.setTimeout(() => { if (!document.querySelector(LAYER_SEL)) { done = true; obs.disconnect(); oc.current(); } }, 450); };
      const obs = new MutationObserver(check);
      // 推迟一拍再开：StrictMode（dev）会同步「挂 → 卸 → 再挂」effect，命令式演出若在第一次挂载就开，
      // 其定时器 / 跨界面主角牌（oc-hero）会残留到第二次，dev 下与生产画面不一致（演练 ov-rankup 像素差）。生产无此问题，推迟一拍不改观感。
      let started = false;
      const go = window.setTimeout(() => { started = true; obs.observe(document.body, { childList: true }); open(params ?? new URLSearchParams()); check(); }, 0);
      return () => { clearTimeout(go); if (!started) return; obs.disconnect(); clearTimeout(t); if (!done) clearLayers(); };
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
  };
}

/** 某个真实组件的预览组件：按 params.k（缺省 defaultKey）分派到 openers.OPEN（同一文件承载多条 inventory / fx 入口） */
export function overlayFor(defaultKey: string, open: Record<string, (q: URLSearchParams) => unknown>): ComponentType<OverlayProps> {
  return imperativeOverlay((q) => { const k = q.get('k') || defaultKey; return (open[k] ?? open[defaultKey])(q); });
}
