/**
 * 账号管理（真实 src/components/auth/AccountManagePanel.tsx）：四个视图 home / userid / password_change / password_reset。
 * home：邮箱 / UserID（未设置 · 修改 → / 设置 →，说明）/ 密码（📨 用邮件链接设置 / 重置密码、🔑 我知道旧密码，直接改 + 说明）
 * userid：新的 UserID 输入 + 规则 + 取消 / 保存新的 UserID（保存中…）；password_change：当前密码 / 新密码 (至少 8 位) / 再次输入 + 取消 / 确认修改
 * password_reset：给 <邮箱> 发重置链接 + 返回 / 发送重置邮件（发送中…）。错误 / 成功提示。?view=userid|password_change|password_reset  ?nouid=1
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Sheet, P4Button, P4Input } from '@yellow/kit';
import { accountAuthOps, useAccountIdentity } from '@/themes/accountAuth';

type View = 'home' | 'userid' | 'password_change' | 'password_reset';

export function AccountManagePanelView({ open, onClose, initialView = 'home', userId, onUserIdChange }: { open: boolean; onClose: () => void; initialView?: View; userId?: string | null; onUserIdChange?: (v: string) => void }) {
  const identity = useAccountIdentity();
  const uid0 = userId ?? identity.username;
  const email = identity.email;
  const [view, setView] = useState<View>(initialView);
  const [uid, setUid] = useState<string | null>(uid0);
  const [draft, setDraft] = useState('');
  const [oldPw, setOldPw] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (open) { setView(initialView); setUid(uid0); setError(''); setInfo(''); } }, [open]); // eslint-disable-line
  // 登录态晚于面板加载时，UserID 要跟着真实身份走，不留空。
  useEffect(() => { if (open && userId === undefined) setUid(uid0); }, [open, uid0, userId]); // eslint-disable-line
  useEffect(() => { setError(''); setDraft(uid ?? ''); setOldPw(''); setPw1(''); setPw2(''); }, [view]); // eslint-disable-line
  const saveUid = () => {
    setError(''); setInfo('');
    if (!accountAuthOps.isValidUserId(draft.trim())) { setError('UserID 应为 3-18 位小写字母 / 数字 / ._-'); return; }
    setLoading(true);
    void accountAuthOps.setUserId(draft.trim()).then((saved) => {
      setInfo(uid ? 'UserID 已更新' : 'UserID 已设置。好友系统现在可用了');
      setUid(saved);
      onUserIdChange?.(saved);
      setView('home');
    }).catch((e) => {
      setError(e instanceof Error ? e.message : '更新失败');
    }).finally(() => setLoading(false));
  };
  const changePw = () => {
    setError(''); setInfo('');
    if (!oldPw) { setError('请输入当前密码'); return; }
    if (pw1.length < 8) { setError('新密码至少 8 位'); return; }
    if (pw1 !== pw2) { setError('两次输入的新密码不一致'); return; }
    setLoading(true);
    void accountAuthOps.changePassword(oldPw, pw1, pw2).then(() => {
      setInfo('密码已更新');
      setView('home');
    }).catch((e) => {
      setError(e instanceof Error ? e.message : '修改失败');
    }).finally(() => setLoading(false));
  };
  const sendReset = () => {
    setError(''); setInfo('');
    if (!email) { setError('没有绑定邮箱'); return; }
    setLoading(true);
    void accountAuthOps.sendPasswordReset(email).then(() => {
      setInfo(`重置密码链接已发到 ${email}`);
    }).catch((e) => {
      setError(e instanceof Error ? e.message : '发送失败');
    }).finally(() => setLoading(false));
  };
  const sub = view === 'home' ? '修改 UserID / 密码等账号信息' : view === 'userid' ? (uid ? '修改 UserID' : '设置 UserID') : view === 'password_change' ? '修改密码' : '邮件链接重置密码';
  const box = 'min-w-0 rounded-sm border-3 border-p4g-line px-3 py-2.5';
  const cap = 'mb-1 font-display text-2xs font-bold tracking-widest text-p4g-ink-soft';
  const Msg = () => (<>{error && <p role="alert" className="rounded-xs bg-p4g-danger px-2.5 py-1.5 text-meta font-bold text-[color:var(--p4g-danger-ink)]">{error}</p>}{info && <p className="rounded-xs bg-p4g-green px-2.5 py-1.5 text-meta font-bold text-p4g-black">{info}</p>}</>);

  return (
    <P4Sheet open={open} onClose={onClose} title="账号管理" en={sub}>
      <div className="flex min-w-0 flex-col gap-3 pt-1">
        {view === 'home' && (
          <>
            <Msg />
            <div className={box} style={{ background: 'var(--p4g-surface-grad)' }}>
              <div className={cap}>邮箱</div>
              <div className="truncate font-display text-body font-bold text-p4g-ink">{email || '未登录'}</div>
            </div>
            <div className={box} style={{ background: 'var(--p4g-surface-grad)' }}>
              <div className="flex min-w-0 items-center gap-1.5"><span className={cap}>UserID</span>{!uid && <span className="mb-1 rounded-xs bg-p4g-orange px-1 font-display text-2xs font-bold text-p4g-black">· 未设置</span>}</div>
              <div className="flex min-w-0 items-center justify-between gap-2">
                <span className="min-w-0 truncate font-mono text-body font-bold text-p4g-ink">{uid ? `@${uid}` : '还没设置'}</span>
                <P4Button size="sm" variant="black" onClick={() => setView('userid')}>{uid ? '修改 →' : '设置 →'}</P4Button>
              </div>
              <p className="mt-1 text-2xs text-p4g-ink-soft">需要它才能让其他客人通过 UserID 找到你、发起好友申请。</p>
            </div>
            <div className={box} style={{ background: 'var(--p4g-surface-grad)' }}>
              <div className={cap}>密码</div>
              <div className="flex flex-col gap-2">
                <P4Button variant="secondary" block onClick={() => setView('password_reset')}>📨 用邮件链接设置 / 重置密码</P4Button>
                <P4Button variant="secondary" block onClick={() => setView('password_change')}>🔑 我知道旧密码，直接改</P4Button>
              </div>
              <p className="mt-2 text-2xs leading-relaxed text-p4g-ink-soft">仅用邮箱验证码登录过的老账号，旧密码是随机生成的——请用"邮件链接"那条设一个。</p>
            </div>
          </>
        )}
        {view === 'userid' && (
          <>
            <P4Input label={uid ? '新的 UserID' : 'UserID'} prefix="@" value={draft} onChange={(e) => setDraft(e.target.value.toLowerCase())} placeholder="alice_in_velvet" autoFocus
              hint="3-18 位小写字母 / 数字 / ._-；注册后仍可修改，但要注意好友会通过它找你。" />
            <Msg />
            <div className="grid grid-cols-2 gap-2"><P4Button variant="secondary" onClick={() => setView('home')}>取消</P4Button><P4Button onClick={saveUid} disabled={loading}>{loading ? '保存中…' : uid ? '保存新的 UserID' : '设置 UserID'}</P4Button></div>
          </>
        )}
        {view === 'password_change' && (
          <>
            <P4Input type="password" label="当前密码" value={oldPw} onChange={(e) => setOldPw(e.target.value)} autoComplete="current-password" />
            <P4Input type="password" label={<>新密码 <span className="text-2xs font-normal text-p4g-ink-soft">(至少 8 位)</span></>} value={pw1} onChange={(e) => setPw1(e.target.value)} autoComplete="new-password" />
            <P4Input type="password" label="再次输入新密码" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
            <p className="text-2xs text-p4g-ink-soft">如果忘记了旧密码，请回上一步选"用邮件链接"。</p>
            <Msg />
            <div className="grid grid-cols-2 gap-2"><P4Button variant="secondary" onClick={() => setView('home')}>取消</P4Button><P4Button onClick={changePw} disabled={loading}>{loading ? '保存中…' : '确认修改'}</P4Button></div>
          </>
        )}
        {view === 'password_reset' && (
          <>
            <div className="rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] px-4 py-3 text-body leading-relaxed text-[color:var(--p4g-msg-ink)] shadow-plate night:border-p4g-yellow">
              <span className="mr-1 text-p4g-yellow">&gt;</span>点击下方按钮，我们会给 <b className="text-p4g-yellow">{email || '你的邮箱'}</b> 发一条重置链接，在链接里设置新密码即可。
              <p className="mt-1 text-meta opacity-80">没登录过密码的老账号（OTP 注册），这是最稳的设密码方式。</p>
            </div>
            <Msg />
            <div className="grid grid-cols-2 gap-2"><P4Button variant="secondary" onClick={() => setView('home')}>返回</P4Button><P4Button onClick={sendReset} disabled={loading}>{loading ? '发送中…' : '发送重置邮件'}</P4Button></div>
          </>
        )}
      </div>
    </P4Sheet>
  );
}

export default function AccountManagePanel({ open, onClose, params }: OverlayProps) {
  const v = params?.get('view') as View | null;
  return <AccountManagePanelView open={open} onClose={onClose} initialView={v ?? 'home'} userId={params?.get('nouid') === '1' ? null : undefined} />;
}
