/**
 * 邀请在线同伴（真实 AddOnlineConfidantModal）：搜 UserID → 找到对方 → 留言 → 发送申请 → 已送出。
 * 试：fuuka.y / yukari.t / junpei_i 能搜到；其他报「没找到这个 UserID」；me 报不能加自己；格式不对报规则。
 *   #/overlay/bond-add-online   ?login=0（未登录提示）&step=found|sent
 * 入口：结识同伴「在线同伴」卡 / 同伴页（在线筛选）。
 */
import { useEffect, useState } from 'react';
import type { CloudProfile } from '@/types';
import type { OverlayProps } from '@blue/registry/types';
import { P3Avatar, P3Button, P3Field, P3Input, P3R, P3Sheet, P3Textarea, slantClip, tickClip } from '@blue/kit';
import { navigate } from '@blue/shell/shellBus';
import { Sparkle } from '@blue/screens/pkg3/ui';
import { searchUserByUserId, sendFriendRequest } from '@/services/friends';

type Step = 'search' | 'found' | 'sent';
const RE = /^[a-z0-9._-]{3,18}$/;

export function AddOnlineSheet({ isOpen, onClose, loggedIn = true, initialStep = 'search' }: { isOpen: boolean; onClose: () => void; loggedIn?: boolean; initialStep?: Step }) {
  const [step, setStep] = useState<Step>(initialStep);
  const [uid, setUid] = useState('');
  const [found, setFound] = useState<CloudProfile | null>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (isOpen) { setStep(initialStep); setError(null); setFound(null); } }, [isOpen, initialStep]);
  const search = () => {
    const v = uid.trim().toLowerCase();
    if (!RE.test(v)) return setError('UserID 应为 3-18 位小写字母 / 数字 / ._-');
    if (v === 'me' || v === 'myself') return setError('不能加自己为好友');
    setLoading(true); setError(null);
    void searchUserByUserId(v).then((profile) => {
      if (profile) { setFound(profile); setStep('found'); }
      else setError('没找到这个 UserID');
    }).catch((error) => setError(error instanceof Error ? error.message : '搜索失败，请稍后再试')).finally(() => setLoading(false));
  };
  const send = () => {
    if (!found) return;
    setLoading(true);
    void sendFriendRequest({ targetUserId: found.id, message: msg.trim() || undefined })
      .then(() => setStep('sent'))
      .catch((error) => setError(error instanceof Error ? error.message : '发送失败，请稍后再试'))
      .finally(() => setLoading(false));
  };
  return (
    <P3Sheet open={isOpen} onClose={onClose} busy={loading && step === 'found'} title={<span className="inline-flex items-center gap-2"><Sparkle size={18} style={{ color: P3R.cyan }} />邀请在线同伴</span>} en="ONLINE"
      footer={!loggedIn ? <P3Button block corner onClick={() => { onClose(); navigate('settings', undefined, { params: { group: 'account' } }); }}>去登录</P3Button>
        : step === 'found' ? <div className="grid grid-cols-2 gap-3"><P3Button tone="soft" block onClick={() => setStep('search')}>返回搜索</P3Button><P3Button block corner busy={loading} busyText="发送中…" onClick={send}>发送申请</P3Button></div>
        : step === 'sent' ? <P3Button block size="lg" onClick={onClose}>好的</P3Button> : undefined}>
      <p className="-mt-1 mb-4 text-[13px]" style={{ color: P3R.grey }}>输入对方的 UserID 来发起好友申请</p>
      {!loggedIn ? (
        <div className="px-4 py-4 text-[14px] font-black" style={{ background: P3R.cyanPale, color: P3R.ink, clipPath: slantClip(10) }}>邀请在线同伴之前，请先在设置页登录云端账号。</div>
      ) : step === 'search' ? (
        <div>
          <div className="flex min-w-0 items-end gap-2">
            <P3Field className="min-w-0 flex-1" label="对方的 UserID" error={error ?? undefined}><P3Input lead="@" value={uid} invalid={!!error} onChange={(e) => setUid(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} autoCapitalize="off" placeholder="fuuka.y" /></P3Field>
            <P3Button className={error ? 'mb-[22px] shrink-0' : 'shrink-0'} busy={loading} busyText="查找中…" onClick={search}>搜索</P3Button>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed" style={{ color: P3R.grey }}>UserID 是对方在注册时选的唯一标识（3-18 位小写字母/数字/._-），<br />不区分大小写，精确匹配后才能找到。</p>
        </div>
      ) : step === 'found' && found ? (
        <div className="grid grid-cols-1 gap-4">
          <div className="relative flex min-w-0 items-center gap-3 px-4 py-3" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(12) }}>
            <span aria-hidden className="absolute bottom-0 right-4 h-[6px] w-[14px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
            <P3Avatar name={found.nickname ?? ''} size={54} tone="ink" />
            <div className="min-w-0"><div className="truncate font-heavy text-[22px]">{found.nickname}</div><div className="text-[13px] font-bold opacity-90">@{found.userId} · <span className="font-cond">LV {found.totalLv}</span></div></div>
          </div>
          <P3Field label="留言（可选，≤ 200 字）" count={`${msg.length} / 200`}><P3Textarea rows={3} maxLength={200} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="嗨，是我……" /></P3Field>
        </div>
      ) : (
        <div className="py-8 text-center">
          <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center" style={{ background: P3R.cyan, clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' }}><Sparkle size={28} style={{ color: 'var(--p3r-mulberry)' }} /></span>
          <p className="font-heavy text-[19px]" style={{ color: P3R.ink }}>申请已送出</p>
          <p className="mt-1 text-[13px] leading-relaxed" style={{ color: P3R.grey }}>对方接受后，你们会在各自的同伴列表顶部出现。<br />21 天未响应，申请会自动作废。</p>
        </div>
      )}
    </P3Sheet>
  );
}

export default function AddOnlineConfidantModal({ open, onClose, params }: OverlayProps) {
  return <AddOnlineSheet isOpen={open} onClose={onClose} loggedIn={params?.get('login') !== '0'} initialStep={(params?.get('step') as Step) || 'search'} />;
}
