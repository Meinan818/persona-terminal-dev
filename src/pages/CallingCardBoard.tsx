import { useUiChannel } from '@/ui/useUiChannel';
import CallingCardBoardP4 from '@yellow/screens/pages/CallingCardBoard.p4g';
import { P4Host } from '@/themes/integration/P4Host';

/** 宣告卡总览（2026-10-21 用户追加）。黄色主题先接；蓝/粉/红后续按各自 demo 接。 */
export function CallingCardBoard() {
  if (useUiChannel() === 'p4') return <P4Host><CallingCardBoardP4 pageId="callingcard" params={new URLSearchParams()} /></P4Host>;
  return null;
}
