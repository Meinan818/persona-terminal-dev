/**
 * 据点设置确认框（真实 src/components/org/OrgSettingsSheet.tsx 的 ConfirmDialog）
 * 换码 / 请离（勾选「同时删除 Ta 的动态和标签」）/ 转让（转让并退出）/ 退出 / 解散
 * 路由：#/overlay/hideout-settings-confirm?kind=rotate|kick|transfer|transfer-leave|leave|dissolve
 */
import { useState } from 'react';
import type { OrgMember } from '@real/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Dialog, useToast } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { MEMBERS, ORG } from '@yellow/mock/pkg4-org';
import { displayCodename } from '@yellow/screens/pkg4/org/common';

export type SettingsConfirm = { kind: 'rotate' } | { kind: 'kick'; member: OrgMember } | { kind: 'transfer'; member: OrgMember; leaving?: boolean } | { kind: 'leave' } | { kind: 'dissolve' };

export function confirmCopy(c: SettingsConfirm, orgName: string) {
  if (c.kind === 'rotate') return { title: '换一个邀请码？', desc: '旧码会立即作废，已经在组织里的人不受影响。', ok: '换码', danger: false };
  if (c.kind === 'kick') return { title: `请「${displayCodename(c.member)}」离开？`, desc: '对方会从名册里消失；邀请码会一起换掉，旧码不能再用。', ok: '请离', danger: true };
  if (c.kind === 'transfer') return { title: `把队长交给「${displayCodename(c.member)}」？`, desc: c.leaving ? '你已经加入了另一个组织（每人最多加入一个），转让之后你会退出这里。' : '转让之后你是普通成员，改资料、换码、请离都由新队长来做。', ok: c.leaving ? '转让并退出' : '转让', danger: true };
  if (c.kind === 'leave') return { title: `退出「${orgName}」？`, desc: '你的成员牌会从名册里拿掉，你在这里分享的动态和贴的标签也会一起删除；以后想回来要重新拿邀请码。', ok: '退出', danger: true };
  return { title: `解散「${orgName}」？`, desc: '组织、名册会一起删除，所有成员都会收到「你已不在」的提示。这一步不能撤销。', ok: '解散', danger: true };
}

export function OrgSettingsConfirm({ confirm, orgName, onClose, onConfirm }: { confirm: SettingsConfirm | null; orgName: string; onClose: () => void; onConfirm: (c: SettingsConfirm, purge: boolean) => void | Promise<void> }) {
  const [purge, setPurge] = useState(true);
  const c = confirm ? confirmCopy(confirm, orgName) : null;
  return (
    <P4Dialog open={!!confirm} onClose={onClose} title={c?.title} message={c?.desc} confirmText={c?.ok} cancelText="取消" danger={c?.danger} onConfirm={async () => { if (!confirm) return; try { await onConfirm(confirm, purge); onClose(); } catch { /* 父层保留错误提示与当前确认框 */ } }}>
      {confirm?.kind === 'kick' && (
        <label className="flex cursor-pointer items-center gap-2.5">
          <button type="button" role="checkbox" aria-checked={purge} onClick={() => setPurge((v) => !v)} className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-xs border-3 border-p4g-yellow font-bold', purge ? 'bg-p4g-yellow text-p4g-black' : 'bg-transparent text-transparent')}>✓</button>
          <span className="text-body font-bold">同时删除 Ta 的动态和标签</span>
        </label>
      )}
    </P4Dialog>
  );
}

export default function OrgSettingsSheetConfirm({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const k = params?.get('kind') ?? 'kick';
  const m = MEMBERS[1];
  const c: SettingsConfirm = k === 'rotate' ? { kind: 'rotate' } : k === 'transfer' ? { kind: 'transfer', member: m } : k === 'transfer-leave' ? { kind: 'transfer', member: m, leaving: true } : k === 'leave' ? { kind: 'leave' } : k === 'dissolve' ? { kind: 'dissolve' } : { kind: 'kick', member: m };
  return <OrgSettingsConfirm confirm={open ? c : null} orgName={ORG.name} onClose={onClose} onConfirm={(cc, purge) => toast(cc.kind === 'rotate' ? '换好了，旧码已经作废' : cc.kind === 'kick' ? `已请离「${displayCodename(m)}」，邀请码也换了新的${purge ? '' : '（保留了动态）'}` : cc.kind === 'transfer' ? `队长已经交给「${displayCodename(m)}」` : '完成')} />;
}
