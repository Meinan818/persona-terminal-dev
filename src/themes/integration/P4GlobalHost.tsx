import { useUiChannel } from '@/ui/useUiChannel';
import { GlobalOverlayHost } from '@yellow/bridge/GlobalOverlayHost';

/** 黄色主题的全局演出宿主；其他频道不渲染，避免和 App 顶层旧弹层重复。 */
export function P4GlobalHost() {
  if (useUiChannel() !== 'p4') return null;
  return <GlobalOverlayHost />;
}
