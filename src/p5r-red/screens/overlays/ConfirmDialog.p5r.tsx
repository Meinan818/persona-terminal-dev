/** ConfirmDialog（真实 src/components/ConfirmDialog.tsx p5 渲染 = kit P5Confirm）。
 *  ?variant=default（删除任务，危险 + 忙碌 900ms）| actions（三选项：合并 / 覆盖 / 取消）| warning */
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Confirm } from '@/p5r-red/kit/P5Confirm';
import { toast } from '@/p5r-red/kit/P5Toast';
export default function ConfirmDialogPreview({ open, onClose, params }: OverlayProps) {
  const v = params?.get('variant') ?? 'default';
  if (v === 'actions') return <P5Confirm open={open} onClose={onClose} title="发现本地已有数据" description="这份备份要怎么处理？" icon="📦" actions={[{ label: '合并', tone: 'primary', onClick: () => toast('已合并') }, { label: '覆盖', tone: 'danger', onClick: () => toast('已覆盖') }, { label: '取消', onClick: () => {} }]} />;
  if (v === 'warning') return <P5Confirm open={open} onClose={onClose} tone="warning" title="重新生成？" description="当前草稿会被丢弃。" confirmText="重新生成" />;
  return <P5Confirm open={open} onClose={onClose} tone="danger" title="删除这个任务？" description={'「晨跑 5 公里」会连同它的完成记录一起删除。\n此操作无法撤销。'} confirmText="删除" busyMs={900} onConfirm={() => toast('已删除')} />;
}
