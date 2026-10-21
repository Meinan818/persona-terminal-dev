/**
 * 确认框 ConfirmDialog（迁移自 overlays/a.js openConfirm；真实 src/components/ConfirmDialog.tsx 的 p5 渲染）。
 *   <P5Confirm open title="删除这个任务？" description tone="danger" confirmText="删除" busyMs={900} onConfirm onCancel onClose />
 *   三选项：actions={[{label:'合并',tone:'primary',onClick}, {label:'覆盖',tone:'danger',onClick}, {label:'取消',onClick}]}
 */
import { useEffect, useState, type ReactNode } from 'react';
import { P5Dialog } from './P5Dialog';

export interface ConfirmAction { label: string; tone?: 'primary' | 'danger' | ''; onClick: () => void }
export interface P5ConfirmProps {
  open: boolean; onClose: () => void; title?: string; description?: string; icon?: ReactNode; tone?: 'default' | 'danger' | 'warning';
  confirmText?: string; cancelText?: string; onConfirm?: () => void; onCancel?: () => void; actions?: ConfirmAction[]; children?: ReactNode; busyMs?: number;
}
export function P5Confirm({ open, onClose, title = '确认操作', description = '', icon, tone = 'default', confirmText = '确认', cancelText = '取消', onConfirm, onCancel, actions, children, busyMs = 0 }: P5ConfirmProps) {
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setBusy(false); }, [open]);
  const cancel = () => { if (busy) return; onClose(); onCancel?.(); };
  const ok = () => { if (busy) return; if (busyMs) { setBusy(true); setTimeout(() => { onClose(); onConfirm?.(); }, busyMs); } else { onClose(); onConfirm?.(); } };
  return (
    <P5Dialog open={open} onClose={cancel} role="alertdialog" escClose={!busy} title={title} icon={icon ?? (tone === 'default' ? '❓' : '⚠️')} description={description}
      footer={actions ? actions.slice(0, 3).map((a, i) => (
        <button key={i} className={`oa-cf-b ${a.tone === 'primary' || a.tone === 'danger' ? 'red' : 'paper'}`} style={{ ['--r' as string]: `${[-0.8, 0.6, -0.4][i]}deg` }} onClick={() => { onClose(); a.onClick(); }}>{a.label}</button>
      )) : (
        <>
          <button className="oa-cf-b paper" style={{ ['--r' as string]: '-0.8deg' }} disabled={busy} onClick={cancel}>{cancelText}</button>
          <button className={`oa-cf-b red ${tone}`} style={{ ['--r' as string]: '0.8deg' }} disabled={busy} onClick={ok}><i className="oa-bspin" hidden={!busy} />{confirmText}</button>
        </>
      )}>
      {children}
    </P5Dialog>
  );
}
