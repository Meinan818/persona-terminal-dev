/**
 * 公告板菜单 / 举报理由 / 删除确认（真实 src/components/org/BoardSection.tsx 的 ActionSheet + ConfirmDialog，p3 = 光标楔子项 + 白斜卡确认）
 * 菜单：举报这条 / 屏蔽此人（只在本机生效）·解除屏蔽 / 删除这条·删除这条（队长）
 * 路由：#/overlay/hideout-board-menus?step=menu|report|delete&mine=1&leader=0
 */
import { useEffect, useState } from 'react';
import type { OrgPost } from '@real/types';
import type { OverlayProps } from '@pink/registry/types';
import { P3ActionSheet, P3Dialog, useToast } from '@pink/kit';
import { POSTS, REPORT_REASONS } from '@pink/mock/pkg4-org';

export type BoardStep = 'menu' | 'report' | 'delete' | null;
export function BoardMenus({ post, step, onStep, mine, leader, blocked, onClose, onBlock, onReported, onDeleted }: {
  post: OrgPost | null; step: BoardStep; onStep: (s: BoardStep) => void; mine: boolean; leader: boolean; blocked: boolean;
  onClose: () => void; onBlock: () => void; onReported: (reason: string) => void; onDeleted: () => void;
}) {
  const menu = !post ? [] : [
    ...(!mine ? [{ id: 'report', label: '举报这条' }, { id: 'block', label: blocked ? '解除屏蔽' : '屏蔽此人（只在本机生效）' }] : []),
    ...(post.kind === 'moment' && (mine || leader) ? [{ id: 'delete', label: mine ? '删除这条' : '删除这条（队长）', tone: 'danger' as const }] : []),
  ];
  return (
    <>
      <P3ActionSheet open={step === 'menu' && !!post} onClose={onClose} title={post?.text || '这条动态'} actions={menu}
        onSelect={(id) => { if (id === 'report') window.setTimeout(() => onStep('report'), 30); else if (id === 'delete') window.setTimeout(() => onStep('delete'), 30); else onBlock(); }} />
      <P3ActionSheet open={step === 'report'} onClose={onClose} title="举报的理由" description="举报后这条不再显示，会在 2 天内处理。" actions={REPORT_REASONS} onSelect={(id) => onReported(id)} />
      <P3Dialog open={step === 'delete'} onClose={onClose} tone="danger" title="删除这条动态？" description={post ? `「${post.text}」和它上面的标签会一起删除。` : undefined} confirmText="删除" cancelText="取消" onConfirm={() => { onDeleted(); onClose(); }} />
    </>
  );
}

export default function BoardMenusHarness({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const init = (['menu', 'report', 'delete'].includes(params?.get('step') ?? '') ? params!.get('step') : 'menu') as BoardStep;
  const [step, setStep] = useState<BoardStep>(null);
  useEffect(() => { setStep(open ? init : null); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const mine = params?.get('mine') === '1';
  const close = () => { setStep(null); onClose(); };
  return <BoardMenus post={mine ? POSTS[1] : POSTS[0]} step={step} onStep={setStep} mine={mine} leader={params?.get('leader') !== '0'} blocked={params?.get('blocked') === '1'} onClose={close}
    onBlock={() => { toast('已屏蔽，不再显示 Ta 的动态和标签'); close(); }} onReported={() => { toast.success('已举报，这条不再显示；会在 2 天内处理'); close(); }} onDeleted={() => { toast('删掉了'); }} />;
}
