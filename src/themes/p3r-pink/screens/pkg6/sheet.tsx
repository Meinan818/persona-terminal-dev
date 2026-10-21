/**
 * P6 私有：SheetModal 基座（真实 src/components/SheetModal.tsx 全部能力）—— 直接落在 kit P3Sheet 上
 * （P3R 子菜单抽屉：顶缘单斜 + 藕紫斜片把手 + 左缘玫红细带 + 大黑斜体标题；拖把手 / 标题区下滑 >90px 关闭；busy 锁三条关闭通道）。
 * 只补黄色版 API 的差异：hideClose / z / tone（tone 在粉版统一为 sheet-grad）。
 */
import type { ReactNode } from 'react';
import { P3Sheet } from '@pink/kit';

export interface P6SheetProps {
  open: boolean; onClose: () => void; title?: ReactNode; en?: string; children?: ReactNode; footer?: ReactNode;
  position?: 'bottom' | 'center'; showHandle?: boolean; busy?: boolean; closeOnBackdrop?: boolean; size?: 'auto' | 'tall' | 'full' | 'screen';
  hideClose?: boolean; className?: string; bodyClassName?: string; tone?: 'paper' | 'msg'; headerExtra?: ReactNode; z?: 'sheet' | 'confirm'; onBack?: () => void;
}

export function P6Sheet({ open, onClose, title, en, children, footer, position = 'bottom', showHandle, busy, closeOnBackdrop = true, size = 'auto', hideClose, bodyClassName, headerExtra, onBack }: P6SheetProps) {
  return (
    <P3Sheet open={open} onClose={onClose} title={title} en={en} footer={footer} position={position} size={size} busy={busy}
      showHandle={position === 'bottom' ? showHandle : false} closeOnBackdrop={closeOnBackdrop} bodyClassName={bodyClassName} onBack={onBack}
      headerExtra={headerExtra ?? (hideClose ? <span /> : undefined)}>
      {children}
    </P3Sheet>
  );
}
