/**
 * P4 真实页面宿主：挂 demo 的导航/偏好/名片桥，子节点由真实 src/pages 渲染。
 * demo 组件保持原样，store/回调仍走真实 App。
 */
import { useEffect, type ReactNode } from 'react';
import { PrefsBridge } from '@yellow/bridge/PrefsBridge';
import { RouteBridge } from '@yellow/bridge/RouteBridge';
import { setPresence, usePresence } from '@yellow/screens/pkg5/presence';
import { PresenceBridge } from './PresenceBridge';

function PresenceSync() {
  const presence = usePresence();
  return <PresenceBridge presence={presence} setPresence={setPresence} />;
}

/** demo 的 Portal 直接挂到 body，不在作用域容器里；挂载期间把含 p4g 类名的弹层标上同一作用域。 */
function usePortalScope() {
  useEffect(() => {
    const mark = () => {
      for (const node of Array.from(document.body.children)) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.id === 'root' || node.hasAttribute('data-p4g-scope')) continue;
        const own = node.className?.toString() ?? '';
        if (!own.includes('p4g-') && !node.querySelector('[class*="p4g-"]')) continue;
        node.setAttribute('data-p4g-scope', '');
        node.setAttribute('data-p4g-portal', '');
      }
    };
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(mark);
    };
    mark();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true });
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.querySelectorAll('[data-p4g-portal]').forEach((node) => {
        node.removeAttribute('data-p4g-portal');
        node.removeAttribute('data-p4g-scope');
      });
    };
  }, []);
}

export function P4Host({ children }: { children: ReactNode }) {
  usePortalScope();
  return (
    <div data-p4g-scope="" style={{ display: 'contents' }}>
      <PrefsBridge />
      <RouteBridge />
      <PresenceSync />
      {children}
    </div>
  );
}
