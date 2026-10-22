/**
 * P4 真实页面宿主：挂 demo 的导航/偏好/名片桥，子节点由真实 src/pages 渲染。
 * demo 组件保持原样，store/回调仍走真实 App。
 */
import type { ReactNode } from 'react';
import { PrefsBridge } from '@yellow/bridge/PrefsBridge';
import { RouteBridge } from '@yellow/bridge/RouteBridge';
import { setPresence, usePresence } from '@yellow/screens/pkg5/presence';
import { PresenceBridge } from './PresenceBridge';

function PresenceSync() {
  const presence = usePresence();
  return <PresenceBridge presence={presence} setPresence={setPresence} />;
}

export function P4Host({ children }: { children: ReactNode }) {
  return (
    <>
      <PrefsBridge />
      <RouteBridge />
      <PresenceSync />
      {children}
    </>
  );
}
