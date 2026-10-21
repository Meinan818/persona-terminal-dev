/**
 * 蓝白母题层 · 环境适配（已接入 p3r-blue：useBoldness / Portal 来自外壳）。
 * fork 到 repo/demo/p3r-blue/src/fx/motifs/ 时，把本文件整体换成：
 *   export { useBoldness } from '@blue/lib/prefs';
 *   export { Portal } from '@blue/kit/Portal';
 *   export { useSyncFallback, useTimeline, stepEase, slantClip, tickClip, zVar } from './_helpers';
 * （或直接保留本文件，只删掉 useBoldness / Portal 两段自带实现、改为上面两行 re-export。）
 *
 * 低动效口径与粉版一致：系统 prefers-reduced-motion 或 <html data-boldness="0"> → useBoldness() === false。
 */
import { useEffect, useRef } from 'react';

/** fork 接线：低动效与 Portal 统一走 demo 外壳（Dev 胶囊 / ?__motion=low / 系统 prefers-reduced-motion） */
export { useBoldness } from '@blue/lib/prefs';
export { Portal } from '@blue/kit/Portal';

/** 低动效：active 一来就同步回调 onCovered → onDone（外壳照常切页） */
export function useSyncFallback(active: boolean, anim: boolean, onCovered?: () => void, onDone?: () => void) {
  const cb = useRef({ onCovered, onDone });
  cb.current = { onCovered, onDone };
  useEffect(() => {
    if (!active || anim) return;
    cb.current.onCovered?.(); cb.current.onDone?.();
  }, [active, anim]);
}
/** 完整动效：遮满时 onCovered（外壳在此切页），播完 onDone。回调走 ref，父组件重渲染不重置定时器。 */
export function useTimeline(active: boolean, anim: boolean, coverAt: number, doneAt: number, onCovered?: () => void, onDone?: () => void) {
  const cb = useRef({ onCovered, onDone });
  cb.current = { onCovered, onDone };
  useEffect(() => {
    if (!active || !anim) return;
    const a = window.setTimeout(() => cb.current.onCovered?.(), coverAt);
    const b = window.setTimeout(() => cb.current.onDone?.(), doneAt);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [active, anim, coverAt, doneAt]);
}

/** 步进缓动（原作的水是跳帧的）：framer-motion 的 ease 接受函数 */
export const stepEase = (n: number) => (t: number) => (t >= 1 ? 1 : Math.floor(t * n) / n);

/** 平行四边形（与粉版 kit/base slantClip 同签名，母题层自带一份以免依赖 kit） */
export const slantClip = (cut = 7, dir: 'lead' | 'tail' = 'lead') =>
  dir === 'lead'
    ? `polygon(${cut}px 0, 100% 0, calc(100% - ${cut}px) 100%, 0 100%)`
    : `polygon(0 0, calc(100% - ${cut}px) 0, 100% 100%, ${cut}px 100%)`;
export const tickClip = 'polygon(30% 0, 100% 0, 70% 100%, 0 100%)';
/** z 轴变量 → style.zIndex（TS 只认 number） */
export const zVar = (name: string) => `var(--p3r-z-${name})` as unknown as number;

/** 确定性伪随机（碎片 / 焦散每次渲染形状一致，截图可复现） */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
