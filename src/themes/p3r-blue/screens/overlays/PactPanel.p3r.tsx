/**
 * 一起进步面板（真实 PactPanel + PactPanelModal + PactQuickEntry）。
 * 状态：none（发起）/ mine（已邀请，可撤回）/ theirs（对方邀请，查看并回应）/ active（打卡进度 + 催一下 + 结束约定）/ guest（未登录）
 *   #/overlay/bond-pact-panel?state=none|mine|theirs|active|guest
 * 入口：同伴详情操作区「一起进步」· 好友名片。
 */
import { useState } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { P3Button, P3Progress, P3R, P3Sheet, slantClip } from '@blue/kit';
import { cx } from '@blue/lib/cx';
import { Sparkle } from '@blue/screens/pkg3/ui';
import { PactProposeSheet, PactRespondSheet, describePactTerms } from './PactModals.p3r';

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
  const sub = (t: string) => <div className="mt-0.5 text-[12px]" style={{ color: P3R.grey }}>{t}</div>;
  let body;
  if (state === 'guest') body = <p className="text-[13px]" style={{ color: P3R.grey }}>登录后可以和 {partnerName} 约一起进步。</p>;
  else if (state === 'none') body = (<>
    <p className="text-[13px] leading-relaxed" style={{ color: P3R.inkSoft }}>约好一件事各自去做：每天打卡，或者截止日前各完成一次。{isConfidant ? '同一天两人都完成，亲密度 +1。' : '互相看得到进度，没完成可以催一下。'}</p>
    <P3Button className="mt-3" block size="md" corner onClick={() => setProposeOpen(true)}>{proposeLabel}</P3Button>
  </>);
  else if (state === 'mine') body = (<>
    <div className="font-heavy text-[15px]" style={{ color: P3R.ink }}>已邀请：「{pact.titleFrom}」</div>
    {sub(`${describePactTerms(pact)} · 等 ${partnerName} 回应（3 天内有效）`)}
    <P3Button className="mt-3" tone="soft" block disabled={!!busy} busy={busy === 'end'} busyText="…" onClick={() => run('end', () => setState('none'))}>撤回邀请</P3Button>
  </>);
  else if (state === 'theirs') body = (<>
    <div className="font-heavy text-[15px]" style={{ color: P3R.ink }}>{partnerName} 邀请你：「{pact.titleFrom}」</div>
    {sub(describePactTerms(pact))}
    <P3Button className="mt-3" block corner onClick={() => setAcceptOpen(true)}>查看并回应</P3Button>
  </>);
  else body = (<>
    <div className="font-heavy text-[16px]" style={{ color: P3R.ink }}>你：「{pact.titleFrom}」</div>
    <div className="mt-0.5 font-cond text-[13px]" style={{ color: P3R.lilacInk }}>DAY 6 / 14 · SYNC 5 · STREAK 3</div>
    {sub('第 6 天 / 共 14 天 · 同步 5 天 · 连续 3 天')}
    <div className="mt-2"><P3Progress variant="segments" value={6} max={14} /></div>
    <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] font-black">
      <button type="button" aria-pressed={mineDone} onClick={() => setMineDone(!mineDone)} className="px-3 py-2 text-left" style={{ clipPath: slantClip(8), background: mineDone ? P3R.cyan : P3R.cyanFaint, color: mineDone ? 'var(--p3r-mulberry)' : P3R.ink }}>你今天：{mineDone ? '已完成 ✓' : '还没完成'}</button>
      <div className="px-3 py-2" style={{ clipPath: slantClip(8), background: P3R.cyan, color: 'var(--p3r-mulberry)' }}>{partnerName}今天：已完成 ✓</div>
    </div>
    {!mineDone && <p className="mt-2 text-[12px] font-black" style={{ color: 'var(--p3r-coral-ink)' }}>{partnerName} 今天催你了</p>}
    {isConfidant && <p className="mt-2 text-[11px]" style={{ color: P3R.grey }}>同一天都完成，亲密度 +1；连续同步满 7 天再 +2。</p>}
    {confirmEnd ? (
      <div className="mt-3 grid grid-cols-2 gap-2"><P3Button size="sm" tone="soft" onClick={() => setConfirmEnd(false)}>不结束</P3Button><P3Button size="sm" tone="danger" disabled={!!busy} busy={busy === 'end'} busyText="…" onClick={() => run('end', () => setState('none'))}>确定结束</P3Button></div>
    ) : (
      <div className="mt-3 grid grid-cols-2 gap-2"><P3Button size="sm" disabled={nudged || !!busy} busy={busy === 'nudge'} busyText="…" onClick={() => run('nudge', () => setNudged(true))}>{nudged ? '今天催过了' : '催一下'}</P3Button><P3Button size="sm" tone="soft" onClick={() => setConfirmEnd(true)}>结束约定</P3Button></div>
    )}
  </>);
  return (
    <div className={cx('relative min-w-0', !bare && 'px-4 py-3')} style={bare ? undefined : { background: P3R.panel, clipPath: slantClip(12), boxShadow: 'var(--p3r-shadow)' }}>
      {bare && <div className="mb-3 flex items-center gap-2"><span className="flex h-9 w-10 items-center justify-center" style={{ background: P3R.blue, clipPath: slantClip(7) }}><Sparkle size={18} style={{ color: P3R.onBlue }} /></span><span className="font-cond text-[13px] tracking-[0.2em]" style={{ color: P3R.roseInk }}>{state.toUpperCase()}</span></div>}
      {!bare && <div className="mb-1.5 flex items-center gap-1.5"><Sparkle size={12} style={{ color: P3R.blue }} /><span className="text-[13px] font-black">一起进步</span></div>}
      {body}
      <PactProposeSheet isOpen={proposeOpen} onClose={() => setProposeOpen(false)} onSent={() => setState('mine')} partnerName={partnerName} isConfidant={isConfidant} />
      <PactRespondSheet isOpen={acceptOpen} onClose={() => setAcceptOpen(false)} onDone={(r) => setState(r === 'accepted' ? 'active' : 'none')} name={partnerName} />
    </div>
  );
}

export function PactPanelModal({ open, onClose, partnerName, initialState }: { open: boolean; onClose: () => void; partnerName: string; initialState?: PactState }) {
  return <P3Sheet open={open} onClose={onClose} title={`和 ${partnerName} 一起进步`} en="TOGETHER"><PactPanelBody partnerName={partnerName} initialState={initialState} bare /></P3Sheet>;
}

export default function PactPanel({ open, onClose, params }: OverlayProps) {
  return <PactPanelModal open={open} onClose={onClose} partnerName="由加莉" initialState={(params?.get('state') as PactState) || 'active'} />;
}
