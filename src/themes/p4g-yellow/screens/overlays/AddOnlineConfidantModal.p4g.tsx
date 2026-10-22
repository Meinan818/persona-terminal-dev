/**
 * 邀请在线同伴（真实 AddOnlineConfidantModal）：搜 UserID → 找到对方 → 留言 → 发送申请 → 已送出。
 * 试：risette / chie.s 能搜到；其他报「没找到这个 UserID」；自己的 id「me」报不能加自己。
 * #/overlay/bond-add-online?login=0 看未登录提示；?step=found|sent
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Avatar, P4Button, P4Input, P4Sheet, P4Textarea } from '@yellow/kit';
import { PK3_PROFILES } from '@yellow/mock/pkg3';
import { Sparkle } from '@yellow/screens/pkg3/ui';

type Step = 'search' | 'found' | 'sent';
const RE = /^[a-z0-9._-]{3,18}$/;

export function AddOnlineSheet({ isOpen, onClose, loggedIn = true, initialStep = 'search' }: { isOpen: boolean; onClose: () => void; loggedIn?: boolean; initialStep?: Step }) {
  const [step, setStep] = useState<Step>(initialStep);
  const [uid, setUid] = useState(initialStep === 'search' ? '' : 'risette');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (isOpen) { setStep(initialStep); setError(null); } }, [isOpen, initialStep]);
  const found = Object.values(PK3_PROFILES).find((p) => p.userId === uid.trim().toLowerCase()) ?? PK3_PROFILES.rise;
  const search = () => {
    const v = uid.trim().toLowerCase();
    if (!RE.test(v)) return setError('UserID 应为 3-18 位小写字母 / 数字 / ._-');
    if (v === 'me' || v === 'myself') return setError('不能加自己为好友');
    setLoading(true); setError(null);
    window.setTimeout(() => { setLoading(false); if (Object.values(PK3_PROFILES).some((p) => p.userId === v)) setStep('found'); else setError('没找到这个 UserID'); }, 600);
  };
  const send = () => { setLoading(true); window.setTimeout(() => { setLoading(false); setStep('sent'); }, 700); };
  return (
    <P4Sheet open={isOpen} onClose={onClose} title={<span className="inline-flex items-center gap-2"><Sparkle size={18} className="text-p4g-success" />邀请在线同伴</span>} en="ONLINE INVITE"
      footer={!loggedIn ? undefined : step === 'found' ? <div className="flex gap-3"><P4Button variant="secondary" block onClick={() => setStep('search')}>返回搜索</P4Button><P4Button block busy={loading} onClick={send}>{loading ? '发送中…' : '发送申请'}</P4Button></div>
        : step === 'sent' ? <P4Button block onClick={onClose}>好的</P4Button> : undefined}>
      <p className="-mt-1 mb-3 text-meta text-p4g-ink-soft">输入对方的 UserID 来发起好友申请</p>
      {!loggedIn ? (
        <div className="rounded-sm border-3 border-p4g-black bg-p4g-orange p-4 text-body font-bold text-p4g-black">邀请在线同伴之前，请先在设置页登录云端账号。</div>
      ) : step === 'search' ? (
        <div>
          <div className="flex items-end gap-2">
            <P4Input wrapClassName="min-w-0 flex-1" label="对方的 UserID" prefix="@" value={uid} onChange={(e) => setUid(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} error={error ?? undefined} autoCapitalize="off" />
            <P4Button className="mb-[2px] shrink-0" busy={loading} onClick={search}>{loading ? '查找中…' : '搜索'}</P4Button>
          </div>
          <p className="mt-3 text-cap leading-relaxed text-p4g-ink-soft">UserID 是对方在注册时选的唯一标识（3-18 位小写字母/数字/._-），<br />不区分大小写，精确匹配后才能找到。</p>
        </div>
      ) : step === 'found' ? (
        <div className="grid grid-cols-1 gap-3">
          <div className="flex min-w-0 items-center gap-3 rounded-sm border-3 border-p4g-black bg-p4g-yellow p-3 text-p4g-black shadow-hard">
            <P4Avatar name={found.nickname} size={56} />
            <div className="min-w-0"><div className="truncate font-display text-h3 font-bold">{found.nickname}</div><div className="text-meta">@{found.userId} · <span className="p4g-num">LV {found.totalLv}</span></div></div>
          </div>
          <P4Textarea label="留言（可选，≤ 200 字）" rows={3} maxLength={200} showCount value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="嗨，是我……" />
        </div>
      ) : (
        <div className="py-8 text-center">
          <Sparkle size={52} className="pk3-twinkle mx-auto mb-3 text-p4g-success" />
          <p className="font-display text-lead font-bold">申请已送出</p>
          <p className="mt-1 text-meta text-p4g-ink-soft">对方接受后，你们会在各自的同伴列表顶部出现。<br />21 天未响应，申请会自动作废。</p>
        </div>
      )}
    </P4Sheet>
  );
}

export default function AddOnlineConfidantModal({ open, onClose, params }: OverlayProps) {
  return <AddOnlineSheet isOpen={open} onClose={onClose} loggedIn={params?.get('login') !== '0'} initialStep={(params?.get('step') as Step) || 'search'} />;
}
