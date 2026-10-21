/**
 * 注册表条目 → 组件（按 key 缓存）。与 React.lazy 不同：模块一旦加载完就**同步渲染**，
 * 不再闪一帧 Suspense fallback（转场 swap 时新页必须立刻有 DOM，圆形揭示才对得上）。
 * 外壳启动时 preloadAll() 预热全部页面 / 弹层（dist 是单 IIFE 包，几乎零成本）。
 */
import type { ComponentType } from 'react';

type Mod<P> = { comp?: ComponentType<P>; promise?: Promise<void>; error?: unknown };
const mods = new Map<string, Mod<any>>();
const wrappers = new Map<string, ComponentType<any>>();

function ensure<P>(key: string, load: () => Promise<{ default: ComponentType<P> }>): Mod<P> {
  let m = mods.get(key) as Mod<P> | undefined;
  if (!m) {
    m = {};
    const mm = m;
    mm.promise = load().then((x) => { mm.comp = x.default; }, (e) => { mm.error = e; });
    mods.set(key, mm);
  }
  return m;
}
export const preload = <P,>(key: string, load: () => Promise<{ default: ComponentType<P> }>) => ensure(key, load).promise;

export function lazyOf<P extends object>(key: string, load: () => Promise<{ default: ComponentType<P> }>): ComponentType<P> {
  let W = wrappers.get(key) as ComponentType<P> | undefined;
  if (!W) {
    const Lazy = (props: P) => {
      const m = ensure(key, load);
      if (m.error) throw m.error;
      if (!m.comp) throw m.promise; // Suspense
      const C = m.comp; return <C {...props} />;
    };
    Lazy.displayName = `Lazy(${key})`;
    W = Lazy; wrappers.set(key, W);
  }
  return W;
}
