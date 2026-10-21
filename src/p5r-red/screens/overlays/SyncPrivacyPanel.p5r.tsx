/** SyncPrivacyPanel 的「确认删除云端数据？」二级确认（真实 src/components/auth/SyncPrivacyPanel.tsx confirm）。面板本体内嵌在账号页（#/p/account?sec=privacy）。 */
import type { OverlayProps } from '@/p5r-red/registry/types';
import { toast } from '@/p5r-red/kit/P5Toast';
import { DeleteCloudDataConfirm } from './AccountBlocks';
export default function SyncPrivacyPanelConfirm({ open, onClose }: OverlayProps) {
  return <DeleteCloudDataConfirm open={open} onClose={onClose} onDone={() => toast('已删除云端 1,284 条记录。本地数据未动。')} />;
}
