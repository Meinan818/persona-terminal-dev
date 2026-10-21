/** 账号页确认框（真实 src/pages/Account.tsx 4 个 ConfirmDialog）：?variant=logout（默认）| reset | deleteCloud（正在删除… / 失败交替）| pull */
import type { OverlayProps } from '@/p5r-red/registry/types';
import { AccountConfirm, type AccountConfirmKind } from './AccountBlocks';
export default function AccountConfirms({ open, onClose, params }: OverlayProps) {
  const v = (params?.get('variant') ?? 'logout') as AccountConfirmKind;
  return <AccountConfirm kind={['logout', 'reset', 'deleteCloud', 'pull'].includes(v) ? v : 'logout'} open={open} onClose={onClose} />;
}
