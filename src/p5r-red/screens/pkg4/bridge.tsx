/**
 * v3 命令式屏 ↔ React 的桥（pkg4）：
 *   useV3Layer(open, () => OD.openX(...), onClose)
 *     open=true 时调用 v3 的 openX()（它把层挂到 body）；记录新挂上的根节点，
 *     用户在层里关掉（节点被移除）→ 回调 onClose；React 侧 open=false / 卸载 → 撤掉仍在的层（含期间新开的子层）。
 *   <V3Host render mount enter dep/>   页面内容：innerHTML = render(wide) → mount(root) → enter(root)（低动效跳过 enter）
 */
import { useEffect, useLayoutEffect, useRef } from 'react';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import './pkg4.css';

const LAYER = '.sheet-veil,.asheet,.od-stage,.od-veil,.oa-layer,.p4-cut,.p4-cf-host,.toast';

export function useV3Layer(open: boolean, play: () => unknown, onClose: () => void, dep: unknown = null): void {
  const oc = useRef(onClose); oc.current = onClose;
  useEffect(() => {
    if (!open) return;
    // 推迟一拍：StrictMode（dev）同步「挂 → 卸 → 再挂」时第一次不真正开层（见 pkg3/host.tsx 同名注释）
    let started = false, stop = () => {};
    const go = window.setTimeout(() => { started = true; stop = start(); }, 0);
    return () => { clearTimeout(go); if (started) stop(); };
    function start(): () => void {
    const before = new Set(Array.from(document.body.children));
    play();
    // 新挂到 body 的全部节点（toast 除外）都归本次播放：卸载时一并撤掉。
    // 旧版只认 LAYER 类名，cut-in（cutins.p5r 的 todoCompleteP5 等）不在其中 → StrictMode 下 effect 先卸再挂时第一层撤不掉，
    // 正式仓库 dev 里出现两层叠加（ov-ledger-saved 演练像素差 30%）。
    const added = Array.from(document.body.children).filter((n) => !before.has(n) && !n.matches('.toast'));
    const layers = added.filter((n) => n.matches(LAYER));
    const roots = layers.length ? layers : added;
    const extra = new Set<Element>();
    let alive = true;
    const mo = new MutationObserver((ms) => {
      ms.forEach((m) => m.addedNodes.forEach((n) => { if (n instanceof Element && n.matches(LAYER) && !n.matches('.toast')) extra.add(n); }));
      if (alive && roots.length && roots.every((r) => !r.isConnected)) { alive = false; mo.disconnect(); setTimeout(() => oc.current(), 0); }
    });
    mo.observe(document.body, { childList: true });
    return () => { alive = false; mo.disconnect(); [...added, ...extra].forEach((r) => r.isConnected && r.remove()); document.body.style.overflow = ''; };
    }
  }, [open, dep]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function V3Host({ render, mount, enter, dep, className, tag = 'div' }: { render: () => string; mount?: (root: HTMLElement) => (() => void) | void; enter?: (root: HTMLElement) => void; dep?: unknown; className?: string; tag?: 'div' | 'section' }) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const host = ref.current!; // 每次重建子容器，旧监听随旧节点丢弃
    const root = document.createElement('div'); root.className = 'p4-v3root'; root.innerHTML = render();
    host.innerHTML = ''; host.appendChild(root);
    const off = mount?.(root);
    if (enter && !isLowMotion()) enter(root);
    return () => { if (typeof off === 'function') off(); };
  }, [dep]); // eslint-disable-line react-hooks/exhaustive-deps
  const T = tag;
  return <T ref={ref as never} className={className} />;
}

/** 自动演示步骤：[选择器, 延时 ms, 'click'|'hold']——单播 / 连播时把演出自动推进到目标阶段（低动效档压到 ≤60ms） */
export type AutoStep = [string, number, ('click' | 'hold' | 'tap')?];
const runAuto = (steps: AutoStep[]) => {
  const ts: number[] = []; let acc = 0;
  steps.forEach(([sel, ms, kind = 'click']) => {
    acc += isLowMotion() ? 60 : ms;
    ts.push(window.setTimeout(() => {
      const els = Array.from(document.querySelectorAll<HTMLElement>(sel)); const el = els[els.length - 1]; if (!el) return;
      if (kind === 'hold') el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1 }));
      else if (kind === 'tap') { const r = el.getBoundingClientRect(), o = { bubbles: true, cancelable: true, pointerId: 1, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }; el.dispatchEvent(new PointerEvent('pointerdown', o)); el.dispatchEvent(new PointerEvent('pointerup', o)); }
      else el.click();
    }, acc));
  });
  return () => ts.forEach(clearTimeout);
};
/** v3 命令式弹层 → OverlayProps 组件 */
export function v3Overlay(play: (p: URLSearchParams) => unknown, auto?: (p: URLSearchParams) => AutoStep[]) {
  return function V3Overlay({ open, onClose, params }: { open: boolean; onClose: () => void; params?: URLSearchParams }) {
    const p = params ?? new URLSearchParams();
    useV3Layer(open, () => play(p), onClose, p.toString());
    useEffect(() => { if (!open || !auto) return; return runAuto(auto(p)); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
  };
}
