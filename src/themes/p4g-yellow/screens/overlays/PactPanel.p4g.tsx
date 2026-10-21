/**
 * 一起进步面板（真实 PactPanel + PactPanelModal + PactQuickEntry）。
 * 状态：none（发起）/ mine（已邀请，可撤回）/ theirs（对方邀请，查看并回应）/ active（打卡进度 + 催一下 + 结束约定）/ guest（未登录）
 * #/overlay/bond-pact-panel?state=none|mine|theirs|active|guest
 */
import { useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Sheet, P4Progress } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { Sparkle } from '@yellow/screens/pkg3/ui';
import { PactProposeSheet, PactRespondSheet, describePactTerms } from './PactModals.p4g';

export type PactState = 'none' | 'mine' | 'theirs' | 'active' | 'guest';

export function PactPanelBody({ partnerName, isConfidant = true, initialState = 'active', proposeLabel = '发起一起进步', bare = false }: { partnerName: string; isConfidant?: boolean; initialState?: PactState; proposeLabel?: string; bare?: boolean }) {
  const [state, setState] = useState<PactState>(initialState);
  const [busy, setBusy] = useState('');
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [mineDone, setMineDone] = useState(false);
  const [nudged, setNudged] = useState(false);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const pact = { titleFrom: '晨跑 3 公里', kind: 'daily' as const, days: 14, mode: 'same' as const };
  const run = (k: string, fn: () => void) => { setBusy(k); window.setTimeout(() => { fn(); setBusy(''); setConfirmEnd(false); }, 500); };

  let body;
  if (state === 'guest') body = <p className="text-cap text-p4g-ink-soft">登录后可以和 {partnerName} 约一起进步。</p>;
  else if (state === 'none') body = (
    <>
      <p className="text-cap text-p4g-ink-soft">约好一件事各自去做：每天打卡，或者截止日前各完成一次。{isConfidant ? '同一天两人都完成，亲密度 +1。' : '互相看得到进度，没完成可以催一下。'}</p>
      <P4Button className="mt-2.5" block size="sm" onClick={() => setProposeOpen(true)}>{proposeLabel}</P4Button>
    </>
  );
  else if (state === 'mine') body = (
    <>
      <div className="font-display text-meta font-bold">已邀请：「{pact.titleFrom}」</div>
      <div className="mt-0.5 text-cap text-p4g-ink-soft">{describePactTerms(pact)} · 等 {partnerName} 回应（3 天内有效）</div>
      <P4Button className="mt-2.5" variant="secondary" block size="sm" disabled={!!busy} onClick={() => run('end', () => setState('none'))}>{busy === 'end' ? '…' : '撤回邀请'}</P4Button>
    </>
  );
  else if (state === 'theirs') body = (
    <>
      <div className="font-display text-meta font-bold">{partnerName} 邀请你：「{pact.titleFrom}」</div>
      <div className="mt-0.5 text-cap text-p4g-ink-soft">{describePactTerms(pact)}</div>
      <P4Button className="mt-2.5" block size="sm" onClick={() => setAcceptOpen(true)}>查看并回应</P4Button>
    </>
  );
  else body = (
    <>
      <div className="font-display text-body font-bold">你：「{pact.titleFrom}」</div>
      <div className="mt-0.5 text-cap text-p4g-ink-soft">第 6 天 / 共 14 天 · 同步 5 天 · 连续 3 天</div>
      <div className="mt-2"><P4Progress variant="segments" value={6} max={14} segments={14} /></div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-cap">
        <button type="button" onClick={() => setMineDone(!mineDone)} className={cx('rounded-sm border-2 px-2 py-1.5 text-left font-bold', mineDone ? 'border-p4g-black bg-p4g-success text-p4g-success-ink' : 'border-p4g-line bg-p4g-surface-2')}>你今天：{mineDone ? '已完成 ✓' : '还没完成'}</button>
        <div className="rounded-sm border-2 border-p4g-black bg-p4g-success px-2 py-1.5 font-bold text-p4g-success-ink">{partnerName}今天：已完成 ✓</div>
      </div>
      {!mineDone && <p className="mt-2 text-cap font-bold text-p4g-danger">{partnerName} 今天催你了</p>}
      {isConfidant && <p className="mt-2 text-2xs text-p4g-ink-soft">同一天都完成，亲密度 +1；连续同步满 7 天再 +2。</p>}
      {confirmEnd ? (
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <P4Button size="sm" variant="secondary" onClick={() => setConfirmEnd(false)}>不结束</P4Button>
          <P4Button size="sm" variant="danger" disabled={!!busy} onClick={() => run('end', () => setState('none'))}>{busy === 'end' ? '…' : '确定结束'}</P4Button>
        </div>
      ) : (
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <P4Button size="sm" disabled={nudged || !!busy} onClick={() => run('nudge', () => setNudged(true))}>{busy === 'nudge' ? '…' : nudged ? '今天催过了' : '催一下'}</P4Button>
          <P4Button size="sm" variant="secondary" onClick={() => setConfirmEnd(true)}>结束约定</P4Button>
        </div>
      )}
    </>
  );
  return (
    <div className={cx('min-w-0', !bare && 'rounded-sm border-3 border-p4g-line bg-p4g-surface p-3')}>
      {bare && <div className="mb-2 text-center text-h2 text-p4g-orange" aria-hidden>✦</div>}
      {!bare && <div className="mb-1.5 flex items-center gap-1.5"><Sparkle size={12} className="text-p4g-orange" /><span className="font-display text-meta font-bold">一起进步</span></div>}
      {body}
      <PactProposeSheet isOpen={proposeOpen} onClose={() => { setProposeOpen(false); setState('mine'); }} partnerName={partnerName} isConfidant={isConfidant} />
      <PactRespondSheet isOpen={acceptOpen} onClose={() => { setAcceptOpen(false); setState('active'); }} name={partnerName} />
    </div>
  );
}

export function PactPanelModal({ open, onClose, partnerName, initialState }: { open: boolean; onClose: () => void; partnerName: string; initialState?: PactState }) {
  return (
    <P4Sheet open={open} onClose={onClose} title={`和 ${partnerName} 一起进步`} en="TOGETHER · 一起进步">
      <PactPanelBody partnerName={partnerName} initialState={initialState} bare />
    </P4Sheet>
  );
}

export default function PactPanel({ open, onClose, params }: OverlayProps) {
  return <PactPanelModal open={open} onClose={onClose} partnerName="千枝" initialState={(params?.get('state') as PactState) || 'active'} />;
}
