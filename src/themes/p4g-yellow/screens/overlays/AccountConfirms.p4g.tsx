/**
 * 账号页 4 个确认框（真实 src/pages/Account.tsx · ConfirmDialog ×4）：
 *   reset  「确认重置数据」+ 清单 + 此操作无法撤销！→ 确认重置 / 取消
 *   pull   「从云端拉取数据？」→ 确认拉取
 *   logout 「退出登录？」→ 确认退出
 *   delete 「永久删除云端账号？」+ 清单 + 此操作无法撤销！→ 永久删除（正在删除…）
 * Harness：?which=reset|pull|logout|delete（默认带切换条）
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Dialog, P4Button, useToast } from '@yellow/kit';

export type ConfirmKind = 'reset' | 'pull' | 'logout' | 'delete';
const Lines = ({ items }: { items: string[] }) => (
  <ul className="flex flex-col gap-1 text-meta">{items.map((t) => <li key={t} className="flex gap-2"><span className="shrink-0 text-p4g-yellow">•</span><span className="min-w-0">{t}</span></li>)}</ul>
);
const Irrev = () => <p className="mt-3 text-center font-display text-body font-bold text-[#ff8a7a]">此操作无法撤销！</p>;

export function AccountConfirmView({ kind, open, onClose, onConfirm }: { kind: ConfirmKind | null; open: boolean; onClose: () => void; onConfirm?: (k: ConfirmKind) => void | Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const k = kind ?? 'reset';
  useEffect(() => {
    if (!open) return;
    setBusy(false);
    setError('');
  }, [open, kind]);
  const run = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await onConfirm?.(k);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请重试');
    } finally {
      setBusy(false);
    }
  };
  const failure = error ? <p role="alert" className="mt-3 rounded-sm bg-p4g-red px-3 py-2 text-meta font-bold text-white">{error}</p> : null;
  if (k === 'reset') return (
    <P4Dialog open={open} onClose={onClose} danger speaker="数据管理" title="确认重置数据" message="此操作将删除所有用户数据，包括：" confirmText="确认重置" cancelText="取消" keepOpen busy={busy} busyText="处理中…" onConfirm={() => void run()}>
      <Lines items={['所有行为记录', '所有成就进度', '所有技能解锁', '所有属性进度']} /><Irrev />{failure}
    </P4Dialog>
  );
  if (k === 'pull') return <P4Dialog open={open} onClose={onClose} speaker="云同步" title="从云端拉取数据？" message={<>会用云端数据<b className="text-p4g-yellow">覆盖本机</b>。如果本机有未同步的改动，请先点"立即同步到云端"。</>} confirmText="确认拉取" cancelText="取消" keepOpen busy={busy} busyText="拉取中…" onConfirm={() => void run()}>{failure}</P4Dialog>;
  if (k === 'logout') return <P4Dialog open={open} onClose={onClose} speaker="云同步" title="退出登录？" message="退出后此设备将停止同步，但本机数据不会被删除。下次登录同一账号可继续。" confirmText="确认退出" cancelText="取消" keepOpen busy={busy} busyText="退出中…" onConfirm={() => void run()}>{failure}</P4Dialog>;
  return (
    <P4Dialog open={open} onClose={() => !busy && onClose()} danger speaker="危险" title="永久删除云端账号？" message="将删除：" actions="none">
      <Lines items={['云端账号（邮箱 / UserID / 档案）', '云端同步的全部数据', '与好友的 COOP 关联']} />
      <p className="mt-2 text-meta">本机数据不受影响，仍完整保留在此设备上。</p>
      <Irrev />
      {failure}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <P4Button variant="secondary" disabled={busy} onClick={onClose}>取消</P4Button>
        <P4Button variant="danger" disabled={busy} onClick={() => void run()}>{busy ? '正在删除…' : '永久删除'}</P4Button>
      </div>
    </P4Dialog>
  );
}

export default function AccountConfirms({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const [which, setWhich] = useState<ConfirmKind>((params?.get('which') as ConfirmKind) || 'reset');
  const [o, setO] = useState(true);
  const isOpen = open && o;
  return (
    <>
      <div className="fixed inset-x-0 top-14 z-[5] flex flex-wrap justify-center gap-1.5 px-3">
        {(['reset', 'pull', 'logout', 'delete'] as const).map((k) => <P4Button key={k} size="sm" variant={k === which ? 'black' : 'secondary'} onClick={() => { setWhich(k); setO(false); setTimeout(() => setO(true), 60); }}>{({ reset: '重置', pull: '拉取', logout: '退出', delete: '删号' })[k]}</P4Button>)}
      </div>
      <AccountConfirmView kind={which} open={isOpen} onClose={() => { setO(false); onClose(); setTimeout(() => setO(true), 0); }} onConfirm={(k) => toast.success(({ reset: '数据已重置', pull: '已从云端拉取', logout: '已退出登录', delete: '云端账号已删除' })[k])} />
    </>
  );
}
