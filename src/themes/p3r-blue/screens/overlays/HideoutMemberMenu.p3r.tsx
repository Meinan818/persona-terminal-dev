/**
 * 成员操作菜单（真实 src/pages/Hideout.tsx 的 ActionSheet menuFor；p3 = P3R 暂停菜单子项 + 光标楔）
 * 自己：查看成员牌 / 修改我的牌；别人：查看成员牌 / 同调（有展示面具）/ 屏蔽此人（只在本机生效）·解除屏蔽 / 转让队长 / 请离…（队长）/ 取消
 * 路由：#/overlay/hideout-member-menu?m=0（自己）|1（别人，默认）&leader=0&blocked=1
 */
import type { OrgMember } from '@/types';
import type { OverlayProps } from '@blue/registry/types';
import { P3ActionSheet, useToast } from '@blue/kit';
import { MEMBERS } from '@blue/adapters/pkg4-org';
import { displayCodename } from '@blue/screens/pkg4/org/common';

export type MemberMenuAction = 'view' | 'edit-card' | 'sync' | 'block' | 'leader';

export function MemberMenu({ member, open, onClose, isMe, leader, blocked, onAction }: { member: OrgMember | null; open: boolean; onClose: () => void; isMe: boolean; leader: boolean; blocked: boolean; onAction: (a: MemberMenuAction) => void }) {
  const list = !member ? [] : isMe
    ? [{ id: 'view', label: '查看成员牌' }, { id: 'edit-card', label: '修改我的牌' }]
    : [
      { id: 'view', label: '查看成员牌' },
      ...((member.card.personas?.length ?? 0) > 0 ? [{ id: 'sync', label: '同调', desc: '借 Ta 展示的面具带进本周的战斗' }] : []),
      { id: 'block', label: blocked ? '解除屏蔽' : '屏蔽此人（只在本机生效）' },
      ...(leader ? [{ id: 'leader', label: '转让队长 / 请离…', tone: 'danger' as const }] : []),
    ];
  return <P3ActionSheet open={open && !!member} onClose={onClose} title={member ? displayCodename(member) : undefined} actions={list} onSelect={(id) => onAction(id as MemberMenuAction)} />;
}

export default function HideoutMemberMenu({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const i = Number(params?.get('m') ?? 1);
  const blocked = params?.get('blocked') === '1';
  return <MemberMenu member={MEMBERS[i] ?? MEMBERS[1]} open={open} onClose={onClose} isMe={i === 0} leader={params?.get('leader') !== '0'} blocked={blocked}
    onAction={(a) => toast(a === 'block' ? (blocked ? '已解除屏蔽' : '已屏蔽，之后不再显示 Ta 的动态') : a === 'view' ? '打开成员牌' : a === 'sync' ? '打开同调' : a === 'edit-card' ? '打开选代表牌' : '打开据点设置')} />;
}
