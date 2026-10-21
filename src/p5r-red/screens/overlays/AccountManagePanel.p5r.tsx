/**
 * AccountManagePanel 账号管理（真实 src/components/auth/AccountManagePanel.tsx；视觉 = v3 b.js openAccountManage）。
 * 视图：home 主页 / home-noid 未设 UserID / userid 改 UserID / userid-new 设置 UserID / password_change 改密码 / password_reset 邮件重置；
 * 状态：保存中… / 成功 info / 报错 error（第二次点击演示失败）。路由 ?state=<视图>。
 */
import { useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Tag } from '@/p5r-red/kit/P5Tag';
import { ObSheet, ObInp, ObNote, ObLink, ObBtn, BusyBtn, useMsgBox } from './ObKit';

const ACC = { email: 'yeji.mask@example.com', uid: 'yeji_0610' };
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
  const hasId = st !== 'home-noid' && st !== 'userid-new';
  if (st === 'home' || st === 'home-noid') return (
    <>
      <p className="ob-lead">修改 UserID / 密码等账号信息</p>
      <div className="ob-kv"><span>邮箱</span><b className="ob-mono">{ACC.email}</b></div>
      <div className="ob-kv"><span>UserID {hasId ? null : <P5Tag>· 未设置</P5Tag>}</span><b className="ob-mono">{hasId ? '@' + ACC.uid : '还没设置'}</b><ObLink onClick={() => go(hasId ? 'userid' : 'userid-new')}>{hasId ? '修改 →' : '设置 →'}</ObLink></div>
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
      <label className="ob-fld"><span>{hasId ? '新的 UserID' : 'UserID'}</span><span className="ob-at">@<ObInp ph="3-18 位" val={hasId ? ACC.uid : ''} aria="UserID" cls="ob-mono" /></span></label>
      <ObNote>3-18 位小写字母 / 数字 / ._-；注册后仍可修改，但要注意好友会通过它找你。</ObNote>
      {msg}
      <div className="ob-acts"><ObBtn tone="paper" seed={201} onClick={() => go('home')}>取消</ObBtn><BusyBtn label={hasId ? '保存新的 UserID' : '设置 UserID'} busy="保存中…" seed={202} to={setMsg} msg={hasId ? 'UserID 已更新' : 'UserID 已设置。好友系统现在可用了'} fail="UserID 应为 3-18 位小写字母 / 数字 / ._-" /></div>
    </>
  );
  if (st === 'password_change') return (
    <>
      <p className="ob-lead">修改密码</p>
      <label className="ob-fld"><span>当前密码</span><ObInp type="password" aria="当前密码" /></label>
      <label className="ob-fld"><span>新密码 <i className="ob-dim">(至少 8 位)</i></span><ObInp type="password" aria="新密码" /></label>
      <label className="ob-fld"><span>再次输入新密码</span><ObInp type="password" aria="再次输入新密码" /></label>
      <ObNote>如果忘记了旧密码，请回上一步选"用邮件链接"。</ObNote>
      {msg}
      <div className="ob-acts"><ObBtn tone="paper" seed={203} onClick={() => go('home')}>取消</ObBtn><BusyBtn label="确认修改" busy="保存中…" seed={204} to={setMsg} msg="密码已更新" fail="请输入当前密码" /></div>
    </>
  );
  return (
    <>
      <p className="ob-lead">邮件链接重置密码</p>
      <p className="ob-p">点击下方按钮，我们会给 <b>{ACC.email}</b> 发一条重置链接，在链接里设置新密码即可。</p>
      <ObNote>没登录过密码的老账号（OTP 注册），这是最稳的设密码方式。</ObNote>
      {msg}
      <div className="ob-acts"><ObBtn tone="paper" seed={205} onClick={() => go('home')}>返回</ObBtn><BusyBtn label="发送重置邮件" busy="发送中…" seed={206} to={setMsg} msg={`重置密码链接已发到 ${ACC.email}`} fail="发送失败" /></div>
    </>
  );
}
