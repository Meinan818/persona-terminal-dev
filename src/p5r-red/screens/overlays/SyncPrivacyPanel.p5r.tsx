/** SyncPrivacyPanel 的「确认删除云端数据？」二级确认（真实 src/components/auth/SyncPrivacyPanel.tsx confirm）。面板本体内嵌在账号页（#/p/account?sec=privacy）。 */
import type { OverlayProps } from '@/p5r-red/registry/types';
import { toast } from '@/p5r-red/kit/P5Toast';
import { DeleteCloudDataConfirm } from './AccountBlocks';
import { deleteAllCloudData } from '@/services/sync';
export default function SyncPrivacyPanelConfirm({ open, onClose }: OverlayProps) {
  // 真实删除云端数据并显示真实条数（原来写死"已删除云端 1,284 条记录"）。
  return <DeleteCloudDataConfirm open={open} onClose={onClose} onDone={() => {
    void deleteAllCloudData()
      .then(({ deleted }) => toast(`已删除云端 ${deleted} 条记录。本地数据未动。`))
      .catch((e) => toast(e instanceof Error ? e.message : '删除失败'));
  }} />;
}
