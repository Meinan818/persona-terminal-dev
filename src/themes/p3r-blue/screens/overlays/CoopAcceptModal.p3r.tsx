/**
 * 响应 COOP 提议（真实 CoopAcceptModal）：看「Ta 眼里的你」那张牌 → 选方式挑一张代表 Ta → 接受 & 缔结 / 拒绝（3 天冷却）。
 *   #/overlay/bond-coop-accept?via=manual|ai&status=linked|rejected|expired|severed&picked=0
 * 入口：通知「COOP 关系提议 · 响应」· 好友名片「响应 COOP」。
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { P3Button, P3R, P3Sheet, showToast, slantClip } from '@blue/kit';
import { ATTR_NAMES, TAROT_BY_ID } from '@blue/screens/pkg3/arcana';
import { ArcanaPickerForm, type ArcanaPickValue } from '@blue/screens/pkg3/ArcanaPickerForm';
import { MatchingSpinner, MiniLabel, Tarot } from '@blue/screens/pkg3/ui';
import { PK3_CONFIDANTS } from '@blue/mock/pkg3';
import { CoopAiMatchSheet } from './CoopAiMatchModal.p3r';
import { BackLink, ModeCards } from './CoopProposeModal.p3r';

type Status = 'pending' | 'linked' | 'rejected' | 'expired' | 'severed';

export function CoopAcceptSheet({ isOpen, onClose, proposerName, status = 'pending', initialMode = 'choose', theirPicked = true, onAccepted }: { isOpen: boolean; onClose: () => void; proposerName: string; status?: Status; initialMode?: 'choose' | 'manual' | 'ai'; theirPicked?: boolean; onAccepted?: () => void }) {
  const [mode, setMode] = useState(initialMode);
  const [submitting, setSubmitting] = useState<'' | 'accept' | 'reject'>('');
  const [v, setV] = useState<ArcanaPickValue>({ arcanaId: 'magician', orientation: 'upright', level: 4, attr: 'dexterity', message: '', skipAi: false });
  useEffect(() => { if (isOpen) setMode(initialMode); }, [isOpen, initialMode]);
  const theirSide = { arcanaId: 'fool', orientation: 'upright' as const, intimacy: 4, skillAttribute: 'guts' as const };
  const taken = PK3_CONFIDANTS.filter((c) => !c.archivedAt).map((c) => c.arcanaId);
  const go = (k: 'accept' | 'reject') => { setSubmitting(k); window.setTimeout(() => { setSubmitting(''); showToast(k === 'accept' ? '已缔结 COOP' : '已拒绝这次提议'); if (k === 'accept') onAccepted?.(); onClose(); }, 700); };
  const closed = status !== 'pending';
  const statusText = status === 'linked' ? '此 COOP 已缔结，无需再响应。' : status === 'rejected' ? '此提议已被拒绝。' : status === 'expired' ? '此提议已过期。' : '此 COOP 已解除。';
  return (
    <>
      <P3Sheet open={isOpen} onClose={onClose} title={`${proposerName} 想与你缔结契约`} en="REQUEST" size="tall" busy={!!submitting}
        footer={closed ? <P3Button block size="lg" onClick={onClose}>知道了</P3Button> : mode === 'manual' ? (
          <div className="grid grid-cols-2 gap-3"><P3Button tone="soft" block disabled={!!submitting} busy={submitting === 'reject'} busyText="处理中…" onClick={() => go('reject')}>拒绝（3 天冷却）</P3Button><P3Button block corner busy={submitting === 'accept'} busyText="缔结中…" onClick={() => go('accept')}>接受 & 缔结</P3Button></div>
        ) : undefined}>
        {closed ? <p className="py-8 text-center text-[15px] font-black" style={{ color: P3R.grey }}>{statusText}</p> : (
          <>
            <p className="-mt-1 mb-4 text-[13px]" style={{ color: P3R.grey }}>Ta 为你选了一张塔罗。看看代表你的这张牌 —— 然后挑一张代表 Ta。</p>
            <div className="relative mb-4 px-5 py-3" style={{ background: 'var(--p3r-mulberry)', color: 'var(--p3r-cream)', clipPath: slantClip(12) }}>
              <div className="mb-2 font-cond text-[12px] tracking-[0.18em]" style={{ color: 'var(--bk-bubble-a)' }}>IN THEIR EYES · Ta 眼里的你</div>
              {theirPicked ? (
                <div className="flex min-w-0 items-center gap-3">
                  <Tarot arcanaId={theirSide.arcanaId} width={60} />
                  <div className="min-w-0 text-[13px]">
                    <div className="font-heavy text-[19px]">《{TAROT_BY_ID[theirSide.arcanaId].name}》正位</div>
                    <div className="opacity-85">Ta 希望起点 Lv.{theirSide.intimacy} · 能力倾向「{ATTR_NAMES[theirSide.skillAttribute]}」</div>
                    <div className="mt-1 opacity-80">「搭档，一起把那只影干掉吧！」</div>
                  </div>
                </div>
              ) : <p className="text-[13px] opacity-85">对方尚未挑选塔罗。</p>}
            </div>
            <MiniLabel>在你眼里的 {proposerName}</MiniLabel>
            {mode === 'choose' && (<>
              <ModeCards targetName={proposerName} onPick={setMode} accept />
              <button type="button" onClick={() => go('reject')} disabled={!!submitting} className="mt-4 w-full py-2 text-center text-[13px] font-black" style={{ color: 'var(--p3r-coral-ink)', background: 'var(--bk-danger-wash)', clipPath: slantClip(8) }}>{submitting === 'reject' ? '处理中…' : '拒绝这次提议（3 天冷却）'}</button>
            </>)}
            {mode !== 'choose' && <BackLink onClick={() => setMode('choose')} />}
            {mode === 'manual' && <ArcanaPickerForm value={v} onChange={setV} taken={taken} hint="挑一张塔罗代表 Ta" messagePlaceholder={`回给 ${proposerName} 的一句话（可选）`} />}
            {mode === 'ai' && <MatchingSpinner title="星象匹配进行中……" sub="在弹出的窗口里完成几个小问题即可返回。" />}
          </>
        )}
      </P3Sheet>
      <CoopAiMatchSheet isOpen={isOpen && mode === 'ai' && !closed} onClose={() => setMode((m) => (m === 'ai' ? 'choose' : m))} targetName={proposerName} onConfirm={() => window.setTimeout(() => go('accept'), 50)} />
    </>
  );
}

export default function CoopAcceptModal({ open, onClose, params }: OverlayProps) {
  return <CoopAcceptSheet isOpen={open} onClose={onClose} proposerName="顺平" status={(params?.get('status') as Status) || 'pending'} initialMode={(params?.get('via') as 'manual' | 'ai') || 'choose'} theirPicked={params?.get('picked') !== '0'} />;
}
