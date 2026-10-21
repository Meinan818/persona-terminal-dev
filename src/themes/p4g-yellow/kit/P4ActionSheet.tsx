/**
 * P4ActionSheet —— 操作菜单（长按条目 / "更多" 按钮）：底部消息框 + P4G 选项列表 + 取消。
 *   <P4ActionSheet open={o} onClose={()=>setO(false)} title="这条记录" message="选择操作"
 *     actions={[{id:'edit',label:'编辑'},{id:'del',label:'删除',danger:true}]} onSelect={id=>…} onCancel={()=>…} />
 *
 * 回调分离（集成期从各包反馈提升）：
 *   onSelect(id)   选中某个动作（旧名 onAction 仍可用，等价）
 *   onCancel()     点「取消」/ 点遮罩 / Esc —— 与选中动作区分开（真实 ActionSheet 的 onCancel 语义）
 *   onClose()      无论哪种方式结束都会调用（用于收起 open 状态）
 *   keepOpen       选中后不自动关闭（boolean，或按 id 判断的函数，如「切换置顶」后菜单留在原地）
 *   busy           锁住遮罩 / Esc / 全部选项（异步动作进行中）
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, type ReactNode } from 'react';
import { Portal, useEscape, useScrollLock } from './Portal';
import { useLowMotion } from '@yellow/lib/prefs';
import { P4ChoiceList, type P4Choice } from './P4ChoiceList';

export interface P4ActionSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  message?: ReactNode;
  actions: P4Choice[];
  /** @deprecated 用 onSelect；保留兼容 */
  onAction?: (id: string) => void;
  onSelect?: (id: string) => void;
  onCancel?: () => void;
  keepOpen?: boolean | ((id: string) => boolean);
  busy?: boolean;
  cancelText?: string | null;
}

export function P4ActionSheet({ open, onClose, title, message, actions, onAction, onSelect, onCancel, keepOpen, busy, cancelText = '取消' }: P4ActionSheetProps) {
  const low = useLowMotion();
  useScrollLock(open);
  const cancel = useCallback(() => { if (busy) return; onCancel?.(); onClose(); }, [busy, onCancel, onClose]);
  useEscape(open, cancel);
  const pick = (id: string) => {
    if (busy) return;
    if (id === '__cancel') { cancel(); return; }
    const stay = typeof keepOpen === 'function' ? keepOpen(id) : !!keepOpen;
    if (!stay) onClose();
    (onSelect ?? onAction)?.(id);
  };
  const items: P4Choice[] = [...actions.map((a) => (busy ? { ...a, disabled: true } : a)), ...(cancelText ? [{ id: '__cancel', label: cancelText, disabled: busy }] : [])];
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="as" className="fixed inset-0 flex items-end justify-center p-3 wide:items-center" style={{ zIndex: 'var(--p4g-z-sheet)' as unknown as number, paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-[color:var(--p4g-scrim)]" onClick={cancel} />
            <motion.div role="menu" aria-busy={busy || undefined} className="relative w-full max-w-[460px] min-w-0"
              initial={low ? { opacity: 0 } : { y: 40, opacity: 0, skewX: -6 }} animate={low ? { opacity: 1 } : { y: 0, opacity: 1, skewX: 0 }} exit={low ? { opacity: 0 } : { y: 40, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.2, 0.9, 0.1, 1] }}>
              <div aria-hidden className="absolute inset-0 translate-x-[6px] translate-y-[6px] rounded-sm bg-[color:var(--p4g-msg-plate)]" />
              <div className="relative overflow-hidden rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] night:border-p4g-yellow">
                {(title || message) && (
                  <div className="border-b-2 border-dashed border-white/15 px-5 pb-3 pt-4">
                    {title && <div className="p4g-clamp-1 font-display text-lead font-bold text-p4g-yellow">{title}</div>}
                    {message && <div className="mt-1 p4g-clamp-2 text-meta text-[color:var(--p4g-msg-ink)]/80">{message}</div>}
                  </div>
                )}
                <div className="max-h-[70vh] overflow-y-auto p-2">
                  <P4ChoiceList items={items} onSelect={pick} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
