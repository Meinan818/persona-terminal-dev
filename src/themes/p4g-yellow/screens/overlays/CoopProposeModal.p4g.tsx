/**
 * 发起 COOP 提议（真实 CoopProposeModal + ArcanaPickerForm）：选方式（星象匹配 / 手动输入）→ 表单 → 发出提议 → 已送出。
 * #/overlay/bond-coop-propose?via=manual|ai&state=sent
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Sheet } from '@yellow/kit';
import { ArcanaPickerForm, type ArcanaPickValue } from '@yellow/screens/pkg3/ArcanaPickerForm';
import { MatchingSpinner, Sparkle } from '@yellow/screens/pkg3/ui';
import { PK3_CONFIDANTS } from '@yellow/adapters/pkg3';
import { CoopAiMatchSheet } from './CoopAiMatchModal.p4g';

type Mode = 'choose' | 'manual' | 'ai' | 'sent';

export function ModeCards({ targetName, onPick, accept }: { targetName: string; onPick: (m: 'ai' | 'manual') => void; accept?: boolean }) {
  return (
    <div>
      <p className="mb-3 text-meta text-p4g-ink-soft">{accept ? '选一种方式回应 —— 两种方式最终都会完成接受。' : `选一种方式为 ${targetName} 挑一张塔罗 —— 两种方式最终都会发出提议，对方接受后建立 COOP 契约。`}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => onPick('ai')} className="p4g-press min-w-0 rounded-sm border-3 border-p4g-black bg-p4g-black p-4 text-left text-white shadow-[4px_4px_0_var(--p4g-orange)]">
          <div className="flex items-center gap-2 font-display text-h3 font-bold text-p4g-yellow"><Sparkle size={16} />星象匹配</div>
          <p className="mt-1 text-cap text-white/80">{accept ? '星象推演一张塔罗。结果页可改加成属性和留言。' : '星象从 22 张里推演一张。结果页可改加成属性和留言。'}</p>
        </button>
        <button type="button" onClick={() => onPick('manual')} className="p4g-press min-w-0 rounded-sm border-3 border-p4g-line bg-p4g-surface p-4 text-left shadow-hard-sm">
          <div className="font-display text-h3 font-bold">手动输入</div>
          <p className="mt-1 text-cap text-p4g-ink-soft">{accept ? '自己挑塔罗、正逆位、等级、加成属性，写一句回给 Ta 的话。' : '自己挑塔罗、正逆位、等级、加成属性，写一句想说的话。契约建立时默认仍由 AI 生成解读，可用下方开关关闭。'}</p>
        </button>
      </div>
    </div>
  );
}

export function CoopProposeSheet({ isOpen, onClose, targetName, initialMode = 'choose' }: { isOpen: boolean; onClose: () => void; targetName: string; initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [submitting, setSubmitting] = useState(false);
  const [v, setV] = useState<ArcanaPickValue>({ arcanaId: 'magician', orientation: 'upright', level: 3, attr: 'dexterity', message: '', skipAi: false });
  useEffect(() => { if (isOpen) setMode(initialMode); }, [isOpen, initialMode]);
  const taken = PK3_CONFIDANTS.filter((c) => !c.archivedAt).map((c) => c.arcanaId);
  const submit = () => { setSubmitting(true); window.setTimeout(() => { setSubmitting(false); setMode('sent'); }, 700); };
  return (
    <>
      <P4Sheet open={isOpen} onClose={onClose} title={`和 ${targetName} 缔结契约`} en="COOP PROPOSAL" size="tall"
        footer={mode === 'manual' ? <div className="flex gap-3"><P4Button variant="secondary" block disabled={submitting} onClick={onClose}>再想想</P4Button><P4Button block busy={submitting} onClick={submit}>{submitting ? '发送中…' : '发出提议'}</P4Button></div>
          : mode === 'sent' ? <P4Button block onClick={onClose}>好的</P4Button> : undefined}>
        <p className="-mt-1 mb-3 text-meta text-p4g-ink-soft">挑一张塔罗代表 Ta 在你眼里的样子。Ta 接受后，你们的在线同伴卡会自动建立。</p>
        {mode === 'choose' && <ModeCards targetName={targetName} onPick={setMode} />}
        {(mode === 'manual' || mode === 'ai') && <button type="button" onClick={() => setMode('choose')} className="mb-3 font-display text-meta font-bold text-p4g-ink-soft underline decoration-p4g-orange decoration-2 underline-offset-4">‹ 换一种方式</button>}
        {mode === 'manual' && <ArcanaPickerForm value={v} onChange={setV} taken={taken} hint="从下方 22 张大阿卡纳中挑一张" messagePlaceholder={`对 ${targetName} 说点什么（可选）`} />}
        {mode === 'ai' && <div className="text-center"><MatchingSpinner title="星象匹配进行中……" sub="在弹出的窗口里完成几个小问题即可返回。" /></div>}
        {mode === 'sent' && (
          <div className="py-8 text-center">
            <div className="mb-3 text-5xl text-p4g-orange">✦</div>
            <p className="font-display text-lead font-bold">提议已送出</p>
            <p className="mt-1 text-meta text-p4g-ink-soft">{targetName} 收到后会挑一张自己的塔罗。<br />接受后，你们的在线同伴卡会自动建立。14 天未响应会自动过期。</p>
          </div>
        )}
      </P4Sheet>
      <CoopAiMatchSheet isOpen={isOpen && mode === 'ai'} onClose={() => setMode((m) => (m === 'ai' ? 'choose' : m))} targetName={targetName} onConfirm={() => window.setTimeout(submit, 50)} />
    </>
  );
}

export default function CoopProposeModal({ open, onClose, params }: OverlayProps) {
  const m = params?.get('state') === 'sent' ? 'sent' : (params?.get('via') as Mode) || 'choose';
  return <CoopProposeSheet isOpen={open} onClose={onClose} targetName="阿介" initialMode={m} />;
}
