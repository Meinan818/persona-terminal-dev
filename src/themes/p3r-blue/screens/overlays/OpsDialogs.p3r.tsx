/**
 * 作战菜单与确认（真实 src/components/org/OpsSection.tsx 的 ActionSheet + ConfirmDialog）
 * 菜单：举报这个X / 屏蔽发起人（只在本机生效）·解除屏蔽发起人；举报理由四项；
 * 确认：「这次不参加？」/「取消这个X？」+ 说明，「不参加了 / 取消X」「再想想」
 * 路由：#/overlay/hideout-op-dialogs?step=menu|report|out|cancel
 */
import { useEffect, useState } from 'react';
import type { OrgOperation } from '@real/types';
import type { OverlayProps } from '@blue/registry/types';
import { P3ActionSheet, P3Dialog, useToast } from '@blue/kit';
import { OPS, OP_KIND_LABEL, REPORT_REASONS } from '@blue/mock/pkg4-org';

export type OpsStep = 'menu' | 'report' | 'out' | 'cancel' | null;
export function OpsDialogs({ op, step, onStep, blocked, onClose, onBlock, onReported, onConfirm }: { op: OrgOperation | null; step: OpsStep; onStep: (s: OpsStep) => void; blocked: boolean; onClose: () => void; onBlock: () => void; onReported: () => void; onConfirm: (kind: 'out' | 'cancel') => void }) {
  const kl = op ? OP_KIND_LABEL[op.kind] : '';
  return (
    <>
      <P3ActionSheet open={step === 'menu' && !!op} onClose={onClose} title={op?.title} actions={[{ id: 'report', label: `举报这个${kl}` }, { id: 'block', label: blocked ? '解除屏蔽发起人' : '屏蔽发起人（只在本机生效）' }]}
        onSelect={(id) => (id === 'report' ? window.setTimeout(() => onStep('report'), 30) : onBlock())} />
      <P3ActionSheet open={step === 'report'} onClose={onClose} title="举报的理由" actions={REPORT_REASONS} onSelect={() => onReported()} />
      <P3Dialog open={step === 'out' || step === 'cancel'} onClose={onClose} tone="danger"
        title={step === 'out' ? '这次不参加？' : `取消这个${kl}？`}
        description={step === 'out' ? '你会从这场作战的名单里退出，任务里那条会收起来。退出之后不能再回来。' : `「${op?.title ?? ''}」：所有人任务里的这一条都会收起来，已经做完的不受影响。这一步不能撤销。`}
        confirmText={step === 'out' ? '不参加了' : `取消${kl}`} cancelText="再想想" onConfirm={() => { onConfirm(step === 'out' ? 'out' : 'cancel'); onClose(); }} />
    </>
  );
}

export default function OpsDialogsHarness({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const init = (['menu', 'report', 'out', 'cancel'].includes(params?.get('step') ?? '') ? params!.get('step') : 'menu') as OpsStep;
  const [step, setStep] = useState<OpsStep>(null);
  useEffect(() => { setStep(open ? init : null); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => { setStep(null); onClose(); };
  const op = init === 'cancel' ? OPS[1] : OPS[0];
  return <OpsDialogs op={op} step={step} onStep={setStep} blocked={false} onClose={close} onBlock={() => { toast('已屏蔽，不再显示 Ta 的动态'); close(); }} onReported={() => { toast.success('已举报，会在 2 天内处理'); close(); }}
    onConfirm={(k) => toast(k === 'out' ? '这次不参加了，任务里那条已经收起来' : `${OP_KIND_LABEL[op.kind]}已取消`)} />;
}
