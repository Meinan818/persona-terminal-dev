/**
 * 发起 COOP 提议（真实 CoopProposeModal + ArcanaPickerForm）：选方式（星象匹配 / 手动输入）→ 表单 → 发出提议 → 已送出。
 *   #/overlay/bond-coop-propose?via=manual|ai&state=sent
 * 入口：卡墙好友牌背面「缔结 COOP」· 好友名片「邀请 COOP」。
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import { P3Button, P3R, P3Sheet, slantClip, tickClip } from '@pink/kit';
import { ArcanaPickerForm, type ArcanaPickValue } from '@pink/screens/pkg3/ArcanaPickerForm';
import { MatchingSpinner, Sparkle } from '@pink/screens/pkg3/ui';
import { PK3_CONFIDANTS } from '@pink/mock/pkg3';
import { CoopAiMatchSheet } from './CoopAiMatchModal.p3r';

type Mode = 'choose' | 'manual' | 'ai' | 'sent';

export function ModeCards({ targetName, onPick, accept }: { targetName: string; onPick: (m: 'ai' | 'manual') => void; accept?: boolean }) {
  return (
    <div>
      <p className="mb-3 text-[13px] leading-relaxed" style={{ color: P3R.grey }}>{accept ? '选一种方式回应 —— 两种方式最终都会完成接受。' : `选一种方式为 ${targetName} 挑一张塔罗 —— 两种方式最终都会发出提议，对方接受后建立 COOP 契约。`}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => onPick('ai')} className="relative min-w-0 px-5 py-4 text-left" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(14) }}>
          <span aria-hidden className="absolute bottom-0 right-5 h-[7px] w-[16px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
          <div className="flex items-center gap-2 font-heavy text-[19px]"><Sparkle size={16} />星象匹配</div>
          <p className="mt-1 text-[12px] font-bold opacity-90">{accept ? '星象推演一张塔罗。结果页可改加成属性和留言。' : '星象从 22 张里推演一张。结果页可改加成属性和留言。'}</p>
        </button>
        <button type="button" onClick={() => onPick('manual')} className="min-w-0 px-5 py-4 text-left" style={{ background: P3R.panel, color: P3R.ink, clipPath: slantClip(14), boxShadow: 'var(--p3r-shadow)' }}>
          <div className="font-heavy text-[19px]">手动输入</div>
          <p className="mt-1 text-[12px]" style={{ color: P3R.grey }}>{accept ? '自己挑塔罗、正逆位、等级、加成属性，写一句回给 Ta 的话。' : '自己挑塔罗、正逆位、等级、加成属性，写一句想说的话。契约建立时默认仍由 AI 生成解读，可用下方开关关闭。'}</p>
        </button>
      </div>
    </div>
  );
}
export const BackLink = ({ onClick }: { onClick: () => void }) => <button type="button" onClick={onClick} className="mb-3 text-[13px] font-black" style={{ color: P3R.roseInk }}>‹ 换一种方式</button>;

export function CoopProposeSheet({ isOpen, onClose, targetName, initialMode = 'choose' }: { isOpen: boolean; onClose: () => void; targetName: string; initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [submitting, setSubmitting] = useState(false);
  const [v, setV] = useState<ArcanaPickValue>({ arcanaId: 'magician', orientation: 'upright', level: 3, attr: 'dexterity', message: '', skipAi: false });
  useEffect(() => { if (isOpen) setMode(initialMode); }, [isOpen, initialMode]);
  const taken = PK3_CONFIDANTS.filter((c) => !c.archivedAt).map((c) => c.arcanaId);
  const submit = () => { setSubmitting(true); window.setTimeout(() => { setSubmitting(false); setMode('sent'); }, 700); };
  return (
    <>
      <P3Sheet open={isOpen} onClose={onClose} title={`和 ${targetName} 缔结契约`} en="COOP" size="tall" busy={submitting}
        footer={mode === 'manual' ? <div className="grid grid-cols-2 gap-3"><P3Button tone="soft" block disabled={submitting} onClick={onClose}>再想想</P3Button><P3Button block corner busy={submitting} busyText="发送中…" onClick={submit}>发出提议</P3Button></div>
          : mode === 'sent' ? <P3Button block size="lg" onClick={onClose}>好的</P3Button> : undefined}>
        <p className="-mt-1 mb-4 text-[13px]" style={{ color: P3R.grey }}>挑一张塔罗代表 Ta 在你眼里的样子。Ta 接受后，你们的在线同伴卡会自动建立。</p>
        {mode === 'choose' && <ModeCards targetName={targetName} onPick={setMode} />}
        {(mode === 'manual' || mode === 'ai') && <BackLink onClick={() => setMode('choose')} />}
        {mode === 'manual' && <ArcanaPickerForm value={v} onChange={setV} taken={taken} hint="从下方 22 张大阿卡纳中挑一张" messagePlaceholder={`对 ${targetName} 说点什么（可选）`} />}
        {mode === 'ai' && <MatchingSpinner title="星象匹配进行中……" sub="在弹出的窗口里完成几个小问题即可返回。" />}
        {mode === 'sent' && (
          <div className="py-8 text-center">
            <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center" style={{ background: P3R.blue, clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' }}><Sparkle size={28} style={{ color: P3R.onBlue }} /></span>
            <p className="font-heavy text-[19px]" style={{ color: P3R.ink }}>提议已送出</p>
            <p className="mt-1 text-[13px] leading-relaxed" style={{ color: P3R.grey }}>{targetName} 收到后会挑一张自己的塔罗。<br />接受后，你们的在线同伴卡会自动建立。14 天未响应会自动过期。</p>
          </div>
        )}
      </P3Sheet>
      <CoopAiMatchSheet isOpen={isOpen && mode === 'ai'} onClose={() => setMode((m) => (m === 'ai' ? 'choose' : m))} targetName={targetName} onConfirm={() => window.setTimeout(submit, 50)} />
    </>
  );
}

export default function CoopProposeModal({ open, onClose, params }: OverlayProps) {
  const m = params?.get('state') === 'sent' ? 'sent' : (params?.get('via') as Mode) || 'choose';
  return <CoopProposeSheet isOpen={open} onClose={onClose} targetName="顺平" initialMode={m} />;
}
