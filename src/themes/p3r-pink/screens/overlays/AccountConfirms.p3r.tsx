/**
 * 账号页 4 个确认框（真实 src/pages/Account.tsx · ConfirmDialog ×4）→ P3R 系统框：
 *   reset 「确认重置数据」+ 清单 + 此操作无法撤销！→ 确认重置 / 取消；pull「从云端拉取数据？」→ 确认拉取；
 *   logout「退出登录？」→ 确认退出；delete「永久删除云端账号？」+ 清单 → 永久删除（正在删除…，busy 锁）
 * Harness：?which=reset|pull|logout|delete（默认 reset，顶部切换条）
 */
import { useState, type ReactNode } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import { P3Dialog, P3Button, P3R, useToast } from '@pink/kit';

export type ConfirmKind = 'reset' | 'pull' | 'logout' | 'delete';
const Lines = ({ items }: { items: string[] }) => (
  <ul className="flex flex-col gap-1 text-[13px]" style={{ color: P3R.ink }}>{items.map((t) => <li key={t} className="flex gap-2"><span className="shrink-0" style={{ color: P3R.blue }}>▸</span><span className="min-w-0">{t}</span></li>)}</ul>
);
const Irrev = () => <p className="mt-3 text-center text-[14px] font-black" style={{ color: 'var(--p3r-coral-ink)' }}>此操作无法撤销！</p>;

export function AccountConfirmView({ kind, open, onClose, onConfirm }: { kind: ConfirmKind | null; open: boolean; onClose: () => void; onConfirm?: (k: ConfirmKind) => void }) {
  const [busy, setBusy] = useState(false);
  const k = kind ?? 'reset';
  const C: Record<ConfirmKind, { title: string; desc: ReactNode; extra?: ReactNode; ok: string; danger: boolean }> = {
    reset: { title: '确认重置数据', desc: '此操作将删除所有用户数据，包括：', extra: <><Lines items={['所有行为记录', '所有成就进度', '所有技能解锁', '所有属性进度']} /><Irrev /></>, ok: '确认重置', danger: true },
    pull: { title: '从云端拉取数据？', desc: '会用云端数据覆盖本机。如果本机有未同步的改动，请先点"立即同步到云端"，否则这些改动会丢失。', ok: '确认拉取', danger: false },
    logout: { title: '退出登录？', desc: '退出后此设备将停止同步，但本机数据不会被删除。下次登录同一账号可继续。', ok: '确认退出', danger: false },
    delete: { title: '永久删除云端账号？', desc: '将删除：', extra: <><Lines items={['云端账号（邮箱 / UserID / 档案）', '云端同步的全部数据', '与好友的 COOP 关联']} /><p className="mt-2 text-[12px] font-bold" style={{ color: P3R.inkSoft }}>本机数据不受影响，仍完整保留在此设备上。</p><Irrev /></>, ok: '永久删除', danger: true },
  };
  const c = C[k];
  return (
    <P3Dialog open={open} onClose={onClose} variant="system" tone={c.danger ? 'danger' : 'default'} title={c.title} description={c.desc} confirmText={c.ok} cancelText="取消"
      busy={busy} busyText={k === 'delete' ? '正在删除…' : '处理中…'}
      onConfirm={() => { if (k === 'delete') { setBusy(true); window.setTimeout(() => { setBusy(false); onClose(); onConfirm?.(k); }, 900); } else { onClose(); onConfirm?.(k); } }}>
      {c.extra}
    </P3Dialog>
  );
}

const DONE: Record<ConfirmKind, string> = { reset: '数据已重置', pull: '已从云端拉取', logout: '已退出登录', delete: '云端账号已删除' };
export default function AccountConfirms({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const [which, setWhich] = useState<ConfirmKind>((params?.get('which') as ConfirmKind) || 'reset');
  const [o, setO] = useState(true);
  return (
    <>
      <div className="fixed inset-x-0 top-14 z-[5] flex flex-wrap justify-center gap-1.5 px-3">
        {(['reset', 'pull', 'logout', 'delete'] as const).map((k) => <P3Button key={k} size="sm" tone={k === which ? 'ink' : 'soft'} onClick={() => { setWhich(k); setO(false); setTimeout(() => setO(true), 60); }}>{({ reset: '重置', pull: '拉取', logout: '退出', delete: '删号' })[k]}</P3Button>)}
      </div>
      <AccountConfirmView kind={which} open={open && o} onClose={() => { setO(false); onClose(); setTimeout(() => setO(true), 0); }} onConfirm={(k) => toast.success(DONE[k])} />
    </>
  );
}
