/** 注册表条目 → React.lazy 组件（按 key 缓存，避免每次渲染重建）。 */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const cache = new Map<string, LazyExoticComponent<ComponentType<any>>>();
export function lazyOf<P>(key: string, load: () => Promise<{ default: ComponentType<P> }>): LazyExoticComponent<ComponentType<P>> {
  let c = cache.get(key);
  if (!c) { c = lazy(load as () => Promise<{ default: ComponentType<any> }>); cache.set(key, c); }
  return c as LazyExoticComponent<ComponentType<P>>;
}
