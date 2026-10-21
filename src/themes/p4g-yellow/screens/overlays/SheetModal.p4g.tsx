/**
 * 底部抽屉 / 居中弹窗基座（真实 src/components/SheetModal.tsx）。?position=bottom|center&busy=1
 * 标题、内容区（可滚动）、sticky footer、showHandle、busy 锁死关闭通道、下滑 / 点遮罩关闭、宽屏底部抽屉自动居中。
 */
import { useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P6Sheet } from '@yellow/screens/pkg6/sheet';
import { CfgInput } from '@yellow/screens/pkg6/cfg';
import { P4Button, useToast } from '@yellow/kit';

export default function SheetModal({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const [pos, setPos] = useState<'bottom' | 'center'>(params?.get('position') === 'center' ? 'center' : 'bottom');
  const [busy, setBusy] = useState(params?.get('busy') === '1');
  return (
    <>
      <div className="fixed inset-x-0 bottom-28 z-[1] flex justify-center gap-2">
        <P4Button size="sm" variant={pos === 'bottom' ? 'black' : 'secondary'} onClick={() => setPos('bottom')}>bottom</P4Button>
        <P4Button size="sm" variant={pos === 'center' ? 'black' : 'secondary'} onClick={() => setPos('center')}>center</P4Button>
      </div>
      <P6Sheet open={open} onClose={onClose} position={pos} busy={busy} title="编辑记录" en="SHEET MODAL"
        footer={<div className="flex gap-3"><P4Button variant="secondary" block disabled={busy} onClick={onClose}>取消</P4Button><P4Button block disabled={busy} onClick={() => { setBusy(true); setTimeout(() => { setBusy(false); toast.success('已保存'); onClose(); }, 900); }}>{busy ? '保存中…' : '保存'}</P4Button></div>}>
        <div className="space-y-3 pt-1">
          <p className="text-meta text-p4g-ink-soft">{pos === 'bottom' ? '按住顶部彩条往下拖可以关闭；点遮罩也行。' : '居中卡片：表单 / 裁切类。'}{busy && ' 提交中：遮罩 / Esc / 关闭按钮已锁定。'}</p>
          <CfgInput placeholder="标题" defaultValue="图书馆看书两小时" aria-label="标题" />
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="rounded-[3px] bg-p4g-surface px-3 py-2.5 text-body">内容行 {i + 1} · 可滚动区域</div>)}
        </div>
      </P6Sheet>
    </>
  );
}
