/**
 * AccountManagePanel 账号管理（真实 src/components/auth/AccountManagePanel.tsx；视觉 = v3 b.js openAccountManage）。
 * 视图：home 主页 / home-noid 未设 UserID / userid 改 UserID / userid-new 设置 UserID / password_change 改密码 / password_reset 邮件重置；
 * 状态：保存中… / 成功 info / 报错 error（第二次点击演示失败）。路由 ?state=<视图>。
 */
import { useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Tag } from '@/p5r-red/kit/P5Tag';
import { ObSheet, ObInp, ObNote, ObLink, ObBtn, BusyBtn, useMsgBox } from './ObKit';
import { ObMsg } from './ObKit';
import { accountAuthOps, useAccountIdentity } from '@/themes/accountAuth';

const STATES: [string, string][] = [['home', '主页'], ['home-noid', '未设 UserID'], ['userid', '改 UserID'], ['password_change', '改密码'], ['password_reset', '邮件重置']];
export default function AccountManagePanel({ open, onClose, params }: OverlayProps) {
  const [st, setSt] = useState(params?.get('state') ?? 'home');
  return (
    <ObSheet open={open} onClose={onClose} title="账号管理" seed={207} states={STATES} state={st} onState={setSt}>
      <View key={st} st={st} go={setSt} />
    </ObSheet>
  );
}
function View({ st, go }: { st: string; go: (v: string) => void }) {
  const [msg, setMsg] = useMsgBox();
  // 邮箱 / UserID 取真实登录态；未登录就明确显示未登录，不填演示值。
  const identity = useAccountIdentity();
  const email = identity.email;
  const uid = identity.username;
  const [draft, setDraft] = useState('');
  const [oldPw, setOldPw] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const hasId = st !== 'home-noid' && st !== 'userid-new';
  const run = (fn: () => Promise<void>, okMsg: React.ReactNode) => {
    setBusy(true);
    fn().then(() => setMsg(<ObMsg kind="ok">{okMsg}</ObMsg>))
      .catch((e) => setMsg(<ObMsg kind="err">{e instanceof Error ? e.message : '操作失败'}</ObMsg>))
      .finally(() => setBusy(false));
  };
  if (st === 'home' || st === 'home-noid') return (
    <>
      <p className="ob-lead">修改 UserID / 密码等账号信息</p>
      <div className="ob-kv"><span>邮箱</span><b className="ob-mono">{email || '未登录'}</b></div>
      <div className="ob-kv"><span>UserID {hasId ? null : <P5Tag>· 未设置</P5Tag>}</span><b className="ob-mono">{hasId ? '@' + uid : '还没设置'}</b><ObLink onClick={() => go(hasId ? 'userid' : 'userid-new')}>{hasId ? '修改 →' : '设置 →'}</ObLink></div>
      <ObNote>需要它才能让其他客人通过 UserID 找到你、发起好友申请。</ObNote>
      <div className="ob-kv col"><span>密码</span>
        <button type="button" className="ob-li" onClick={() => go('password_reset')}><i className="ob-li-bg" /><b>📨 用邮件链接设置 / 重置密码</b><em>›</em></button>
        <button type="button" className="ob-li" onClick={() => go('password_change')}><i className="ob-li-bg" /><b>🔑 我知道旧密码，直接改</b><em>›</em></button></div>
      <ObNote>仅用邮箱验证码登录过的老账号，旧密码是随机生成的——请用"邮件链接"那条设一个。</ObNote>
    </>
  );
  if (st === 'userid' || st === 'userid-new') return (
    <>
      <p className="ob-lead">{hasId ? '修改 UserID' : '设置 UserID'}</p>
      <label className="ob-fld"><span>{hasId ? '新的 UserID' : 'UserID'}</span><span className="ob-at">@<input className="ob-inp ob-mono" value={draft || (hasId ? uid : '')} onChange={(e) => setDraft(e.target.value.toLowerCase())} placeholder="3-18 位" aria-label="UserID" /></span></label>
      <ObNote>3-18 位小写字母 / 数字 / ._-；注册后仍可修改，但要注意好友会通过它找你。</ObNote>
      {msg}
      <div className="ob-acts"><ObBtn tone="paper" seed={201} onClick={() => go('home')}>取消</ObBtn><ObBtn seed={202} disabled={busy} onClick={() => {
        const value = (draft || (hasId ? uid : '')).trim();
        if (!accountAuthOps.isValidUserId(value)) { setMsg(<ObMsg kind="err">UserID 应为 3-18 位小写字母 / 数字 / ._-</ObMsg>); return; }
        run(() => accountAuthOps.setUserId(value).then(() => { setDraft(''); go('home'); }), hasId ? 'UserID 已更新' : 'UserID 已设置。好友系统现在可用了');
      }}>{busy ? '保存中…' : hasId ? '保存新的 UserID' : '设置 UserID'}</ObBtn></div>
    </>
  );
  if (st === 'password_change') return (
    <>
      <p className="ob-lead">修改密码</p>
      <label className="ob-fld"><span>当前密码</span><input className="ob-inp" type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} aria-label="当前密码" /></label>
      <label className="ob-fld"><span>新密码 <i className="ob-dim">(至少 8 位)</i></span><input className="ob-inp" type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} aria-label="新密码" /></label>
      <label className="ob-fld"><span>再次输入新密码</span><input className="ob-inp" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} aria-label="再次输入新密码" /></label>
      <ObNote>如果忘记了旧密码，请回上一步选"用邮件链接"。</ObNote>
      {msg}
      <div className="ob-acts"><ObBtn tone="paper" seed={203} onClick={() => go('home')}>取消</ObBtn><ObBtn seed={204} disabled={busy} onClick={() => {
        if (!oldPw) { setMsg(<ObMsg kind="err">请输入当前密码</ObMsg>); return; }
        if (pw1.length < 8) { setMsg(<ObMsg kind="err">新密码至少 8 位</ObMsg>); return; }
        if (pw1 !== pw2) { setMsg(<ObMsg kind="err">两次输入的新密码不一致</ObMsg>); return; }
        run(() => accountAuthOps.changePassword(oldPw, pw1, pw2).then(() => { setOldPw(''); setPw1(''); setPw2(''); go('home'); }), '密码已更新');
      }}>{busy ? '保存中…' : '确认修改'}</ObBtn></div>
    </>
  );
  return (
    <>
      <p className="ob-lead">邮件链接重置密码</p>
      <p className="ob-p">点击下方按钮，我们会给 <b>{email || '你的邮箱'}</b> 发一条重置链接，在链接里设置新密码即可。</p>
      <ObNote>没登录过密码的老账号（OTP 注册），这是最稳的设密码方式。</ObNote>
      {msg}
      <div className="ob-acts"><ObBtn tone="paper" seed={205} onClick={() => go('home')}>返回</ObBtn><ObBtn seed={206} disabled={busy} onClick={() => {
        if (!email) { setMsg(<ObMsg kind="err">没有绑定邮箱</ObMsg>); return; }
        run(() => accountAuthOps.sendPasswordReset(email), `重置密码链接已发到 ${email}`);
      }}>{busy ? '发送中…' : '发送重置邮件'}</ObBtn></div>
    </>
  );
}
