/**
 * 响应 COOP 提议（真实 CoopAcceptModal）：看「Ta 眼里的你」那张牌 → 选方式挑一张代表 Ta → 接受 & 缔结 / 拒绝（3 天冷却）。
 * #/overlay/bond-coop-accept?via=manual|ai&status=linked|rejected|expired|severed
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Sheet, showToast } from '@yellow/kit';
import { ATTR_NAMES, TAROT_BY_ID } from '@yellow/screens/pkg3/arcana';
import { ArcanaPickerForm, type ArcanaPickValue } from '@yellow/screens/pkg3/ArcanaPickerForm';
import { MatchingSpinner, MiniLabel, TarotCard } from '@yellow/screens/pkg3/ui';
import { coopBondOps, useCooperationData } from '@yellow/adapters/pkg3';
import { CoopAiMatchSheet } from './CoopAiMatchModal.p4g';
import { ModeCards } from './CoopProposeModal.p4g';
import type { CoopBond } from '@real/types';

type Status = 'pending' | 'linked' | 'rejected' | 'expired' | 'severed';

export function CoopAcceptSheet({ isOpen, onClose, proposerName, bond = null, status = 'pending', initialMode = 'choose', theirPicked = true, onAccepted }: { isOpen: boolean; onClose: () => void; proposerName?: string; bond?: CoopBond | null; status?: Status; initialMode?: 'choose' | 'manual' | 'ai'; theirPicked?: boolean; onAccepted?: () => void }) {
  const { confidants } = useCooperationData();
  const [mode, setMode] = useState(initialMode);
  const [submitting, setSubmitting] = useState<'' | 'accept' | 'reject'>('');
  const [error, setError] = useState('');
  const [v, setV] = useState<ArcanaPickValue>({ arcanaId: 'chariot', orientation: 'upright', level: 4, attr: 'guts', message: '', skipAi: false });
  useEffect(() => { if (isOpen) setMode(initialMode); }, [isOpen, initialMode]);
  const me = coopBondOps.currentUserId();
  const side = bond && me ? coopBondOps.viewFromMySide(bond, me) : null;
  const card = side?.theirArcanaId ? TAROT_BY_ID[side.theirArcanaId] : null;
  const theirSide = card ? { arcanaId: card.id, orientation: side?.theirArcanaOrientation ?? 'upright', intimacy: side?.theirIntimacy ?? 1, skillAttribute: side?.theirSkillAttribute ?? 'guts', message: side?.theirMessage ?? '' } : null;
  const hasTheirPick = theirPicked && !!theirSide;
  const resolvedName = proposerName || bond?.otherProfile?.nickname || bond?.otherProfile?.userId || '对方';
  const taken = confidants.filter((c) => !c.archivedAt && c.arcanaId !== 'chariot').map((c) => c.arcanaId);
  const effectiveStatus = bond?.status ?? status;
  const go = async (k: 'accept' | 'reject') => {
    if (!bond || submitting) return;
    setSubmitting(k);
    setError('');
    try {
      if (k === 'accept') {
        await coopBondOps.accept({
          bondId: bond.id,
          arcanaId: v.arcanaId,
          orientation: v.orientation,
          intimacyLevel: v.level,
          skillAttribute: v.attr,
          message: v.message,
        });
      } else {
        await coopBondOps.reject(bond.id);
      }
      showToast(k === 'accept' ? '已缔结 COOP' : '已拒绝这次提议');
      if (k === 'accept') onAccepted?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : k === 'accept' ? '接受失败' : '拒绝失败');
    } finally {
      setSubmitting('');
    }
  };
  const closed = effectiveStatus !== 'pending';
  const statusText = effectiveStatus === 'linked' ? '此 COOP 已缔结，无需再响应。' : effectiveStatus === 'rejected' ? '此提议已被拒绝。' : effectiveStatus === 'expired' ? '此提议已过期。' : '此 COOP 已解除。';
  return (
    <>
      <P4Sheet open={isOpen} onClose={onClose} title={`${resolvedName} 想与你缔结契约`} en="COOP REQUEST" size="tall"
        footer={!bond ? undefined : closed ? <P4Button block onClick={onClose}>知道了</P4Button> : mode === 'manual' ? (
          <div className="flex gap-3"><P4Button variant="secondary" block disabled={!!submitting} onClick={() => go('reject')}>{submitting === 'reject' ? '处理中…' : '拒绝（3 天冷却）'}</P4Button><P4Button block busy={submitting === 'accept'} onClick={() => go('accept')}>{submitting === 'accept' ? '缔结中…' : '接受 & 缔结'}</P4Button></div>
        ) : undefined}>
        {!bond ? <p className="py-8 text-center text-body text-p4g-ink-soft">还没有待响应的 COOP 提议。</p> : closed ? <p className="py-8 text-center text-body text-p4g-ink-soft">{statusText}</p> : (
          <>
            <p className="-mt-1 mb-3 text-meta text-p4g-ink-soft">Ta 为你选了一张塔罗。看看代表你的这张牌 —— 然后挑一张代表 Ta。</p>
            <div className="mb-4 rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] p-3 text-[color:var(--p4g-msg-ink)] shadow-plate">
              <div className="mb-2 font-display text-cap font-bold tracking-[0.18em] text-p4g-yellow">Ta 眼里的你</div>
              {hasTheirPick && theirSide ? (
                <div className="flex min-w-0 items-center gap-3">
                  <TarotCard arcanaId={theirSide.arcanaId} orientation={theirSide.orientation} width={64} />
                  <div className="min-w-0 text-meta">
                    <div className="font-display text-h3 font-bold">《{TAROT_BY_ID[theirSide.arcanaId].name}》{theirSide.orientation === 'reversed' ? '逆位' : '正位'}</div>
                    <div>Ta 希望起点 Lv.{theirSide.intimacy}</div>
                    <div>能力倾向「{ATTR_NAMES[theirSide.skillAttribute]}」</div>
                    {theirSide.message && <div className="mt-1 text-[color:var(--p4g-msg-ink)]/80">「{theirSide.message}」</div>}
                  </div>
                </div>
              ) : <p className="text-meta">对方尚未挑选塔罗。</p>}
            </div>
            <MiniLabel>在你眼里的 {resolvedName}</MiniLabel>
            {mode === 'choose' && (
              <>
                <ModeCards targetName={resolvedName} onPick={setMode} accept />
                <button type="button" onClick={() => go('reject')} disabled={!!submitting} className="mt-4 w-full text-center font-display text-meta font-bold text-p4g-danger underline underline-offset-4">{submitting === 'reject' ? '处理中…' : '拒绝这次提议（3 天冷却）'}</button>
              </>
            )}
            {mode !== 'choose' && <button type="button" onClick={() => setMode('choose')} className="mb-3 font-display text-meta font-bold text-p4g-ink-soft underline decoration-p4g-orange decoration-2 underline-offset-4">‹ 换一种方式</button>}
            {mode === 'manual' && <ArcanaPickerForm value={v} onChange={setV} taken={taken} hint="挑一张塔罗代表 Ta（已为你预选 Ta 那张）" messagePlaceholder={`回给 ${resolvedName} 的一句话（可选）`} />}
            {mode === 'ai' && <MatchingSpinner title="星象匹配进行中……" sub="在弹出的窗口里完成几个小问题即可返回。" />}
            {error && <p className="mt-3 text-meta font-bold text-p4g-danger">{error}</p>}
          </>
        )}
      </P4Sheet>
      <CoopAiMatchSheet isOpen={isOpen && mode === 'ai' && !closed && !!bond} onClose={() => setMode((m) => (m === 'ai' ? 'choose' : m))} targetName={resolvedName} onConfirm={() => window.setTimeout(() => go('accept'), 50)} />
    </>
  );
}

export default function CoopAcceptModal({ open, onClose, params }: OverlayProps) {
  const { coopBonds } = useCooperationData();
  const bondId = params?.get('bond');
  const bond = (bondId ? coopBonds.find((item) => item.id === bondId) : null) ?? coopBonds.find((item) => item.status === 'pending') ?? null;
  return <CoopAcceptSheet isOpen={open} onClose={onClose} bond={bond} status={(params?.get('status') as Status) || 'pending'} initialMode={(params?.get('via') as 'manual' | 'ai') || 'choose'} theirPicked={params?.get('picked') !== '0'} />;
}
