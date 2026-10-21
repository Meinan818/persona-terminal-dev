/**
 * 公告板菜单 / 举报理由 / 删除确认（真实 src/components/org/BoardSection.tsx 的 ActionSheet + ConfirmDialog）
 * 菜单：举报这条 / 屏蔽此人（只在本机生效）·解除屏蔽 / 删除这条·删除这条（队长）
 * 路由：#/overlay/hideout-board-menus?step=menu|report|delete&mine=1&leader=1
 */
import { useEffect, useState } from 'react';
import type { OrgPost } from '@/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4ActionSheet, P4Dialog, useToast } from '@yellow/kit';
import { POSTS, REPORT_REASONS } from '@yellow/adapters/pkg4-org';

export function BoardMenus({ post, step, onStep, mine, leader, blocked, onClose, onBlock, onReported, onDeleted }: {
  post: OrgPost | null; step: 'menu' | 'report' | 'delete' | null; onStep: (s: 'menu' | 'report' | 'delete' | null) => void; mine: boolean; leader: boolean; blocked: boolean;
  onClose: () => void; onBlock: () => void; onReported: (reason: string) => void; onDeleted: () => void;
}) {
  const menu = !post ? [] : [
    ...(!mine ? [{ id: 'report', label: '举报这条' }, { id: 'block', label: blocked ? '解除屏蔽' : '屏蔽此人（只在本机生效）' }] : []),
    ...(post.kind === 'moment' && (mine || leader) ? [{ id: 'delete', label: mine ? '删除这条' : '删除这条（队长）', danger: true }] : []),
  ];
  return (
    <>
      <P4ActionSheet open={step === 'menu' && !!post} onClose={onClose} title={post?.text || '这条动态'} actions={menu}
        onAction={(id) => { if (id === 'report') setTimeout(() => onStep('report'), 30); else if (id === 'delete') setTimeout(() => onStep('delete'), 30); else onBlock(); }} />
      <P4ActionSheet open={step === 'report'} onClose={onClose} title="举报的理由" actions={REPORT_REASONS} onAction={(id) => onReported(id)} />
      <P4Dialog open={step === 'delete'} onClose={onClose} danger title="删除这条动态？" message={post ? `「${post.text}」和它上面的标签会一起删除。` : undefined} confirmText="删除" cancelText="取消" onConfirm={onDeleted} />
    </>
  );
}

export default function BoardMenusHarness({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const init = (params?.get('step') as 'menu') ?? 'menu';
  const [step, setStep] = useState<'menu' | 'report' | 'delete' | null>(null);
  useEffect(() => { setStep(open ? init : null); }, [open]); // eslint-disable-line
  const mine = params?.get('mine') === '1';
  const close = () => { setStep(null); onClose(); };
  return <BoardMenus post={mine ? POSTS[1] : POSTS[0]} step={step} onStep={setStep} mine={mine} leader={params?.get('leader') !== '0'} blocked={false} onClose={close}
    onBlock={() => { toast('已屏蔽，不再显示 Ta 的动态和标签'); close(); }} onReported={() => { toast.success('已举报，这条不再显示；会在 2 天内处理'); close(); }} onDeleted={() => { toast('删掉了'); close(); }} />;
}
