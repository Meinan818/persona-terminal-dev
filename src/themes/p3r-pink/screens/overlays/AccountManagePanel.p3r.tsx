/**
 * 账号管理（真实 src/components/auth/AccountManagePanel.tsx）：四个视图 home / userid / password_change / password_reset（视图切换斜切滑入）。
 * home：邮箱 / UserID（未设置 · 修改 → / 设置 →，说明）/ 密码（用邮件链接设置 / 重置密码、我知道旧密码，直接改 + 说明；原 📨🔑 换单色字形）
 * userid：新的 UserID + 规则 + 取消 / 保存新的 UserID（保存中…）；password_change：当前密码 / 新密码 (至少 8 位) / 再次输入 + 取消 / 确认修改
 * password_reset：给 <邮箱> 发重置链接 + 返回 / 发送重置邮件（发送中…）。路由：?view=userid|password_change|password_reset  ?nouid=1
 */
import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { OverlayProps } from '@pink/registry/types';
import { P3Sheet, P3Button, P3Input, P3Field, P3R, slantClip } from '@pink/kit';
import { useBoldness } from '@pink/lib/prefs';
import { NoteBox } from '@pink/screens/pkg5/ui';
import { CLOUD_USER } from '@pink/adapters/pkg5';

type View = 'home' | 'userid' | 'password_change' | 'password_reset';
const Box = ({ cap, children, badge }: { cap: string; children: ReactNode; badge?: ReactNode }) => (
  <div className="min-w-0 py-2.5 pl-5 pr-4" style={{ clipPath: slantClip(10), background: 'var(--p3r-row)' }}>
    <div className="mb-1 flex items-center gap-1.5"><span className="font-cond text-[11px] tracking-widest" style={{ color: P3R.grey }}>{cap}</span>{badge}</div>
    {children}
  </div>
);
const MailGlyph = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden><path d="M3 5h18v14H3z" /><path d="m3 5 9 8 9-8" /></svg>;
const KeyGlyph = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden><circle cx="8" cy="15" r="4" /><path d="M11 12 20 3M16 7l3 3" /></svg>;

export function AccountManagePanelView({ open, onClose, initialView = 'home', userId: uid0 = CLOUD_USER.username, onUserIdChange }: { open: boolean; onClose: () => void; initialView?: View; userId?: string | null; onUserIdChange?: (v: string) => void }) {
  const anim = useBoldness();
  const [view, setView] = useState<View>(initialView);
  const [uid, setUid] = useState<string | null>(uid0);
  const [draft, setDraft] = useState('');
  const [oldPw, setOldPw] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (open) { setView(initialView); setUid(uid0); setError(''); setInfo(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setError(''); setDraft(uid ?? ''); setOldPw(''); setPw1(''); setPw2(''); }, [view]); // eslint-disable-line react-hooks/exhaustive-deps
  const fake = (fn: () => void) => { setLoading(true); window.setTimeout(() => { setLoading(false); fn(); }, 700); };
  const saveUid = () => {
    setError(''); setInfo('');
    if (!/^[a-z0-9._-]{3,18}$/.test(draft.trim())) { setError('UserID 应为 3-18 位小写字母 / 数字 / ._-'); return; }
    fake(() => { setInfo(uid ? 'UserID 已更新' : 'UserID 已设置。好友系统现在可用了'); setUid(draft.trim()); onUserIdChange?.(draft.trim()); setView('home'); });
  };
  const changePw = () => {
    setError(''); setInfo('');
    if (!oldPw) { setError('请输入当前密码'); return; }
    if (pw1.length < 8) { setError('新密码至少 8 位'); return; }
    if (pw1 !== pw2) { setError('两次输入的新密码不一致'); return; }
    fake(() => { setInfo('密码已更新'); setView('home'); });
  };
  const sendReset = () => fake(() => { setInfo(`重置密码链接已发到 ${CLOUD_USER.email}`); });
  const Msg = () => (<>
    {error && <p role="alert" className="px-3 py-1.5 text-[12px] font-black" style={{ background: 'rgb(var(--p3r-magenta-rgb) / 0.14)', color: 'var(--p3r-coral-ink)', clipPath: slantClip(6) }}>{error}</p>}
    {info && <p className="px-3 py-1.5 text-[12px] font-black" style={{ background: P3R.cyanPale, color: P3R.ink, clipPath: slantClip(6) }}>✓ {info}</p>}
  </>);
  return (
    <P3Sheet open={open} onClose={onClose} title="账号管理" en="ACCOUNT" onBack={view !== 'home' ? () => setView('home') : undefined}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={view} className="flex min-w-0 flex-col gap-3 pt-1" initial={anim ? { opacity: 0, x: 18 } : { opacity: 0 }} animate={{ opacity: 1, x: 0 }} exit={anim ? { opacity: 0, x: -18 } : { opacity: 0 }} transition={{ duration: 0.18 }}>
          <p className="text-[12px] font-bold" style={{ color: P3R.grey }}>{view === 'home' ? '修改 UserID / 密码等账号信息' : view === 'userid' ? (uid ? '修改 UserID' : '设置 UserID') : view === 'password_change' ? '修改密码' : '邮件链接重置密码'}</p>
          {view === 'home' && (
            <>
              <Msg />
              <Box cap="邮箱"><div className="truncate text-[15px] font-black" style={{ color: P3R.ink }}>{CLOUD_USER.email}</div></Box>
              <Box cap="UserID" badge={!uid ? <span className="px-1.5 text-[10px] font-black text-white" style={{ background: P3R.magenta, clipPath: slantClip(3) }}>未设置</span> : undefined}>
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-mono text-[15px] font-bold" style={{ color: P3R.ink }}>{uid ? `@${uid}` : '还没设置'}</span>
                  <P3Button size="sm" tone="ink" onClick={() => setView('userid')}>{uid ? '修改 →' : '设置 →'}</P3Button>
                </div>
                <p className="mt-1 text-[11px]" style={{ color: P3R.grey }}>需要它才能让其他客人通过 UserID 找到你、发起好友申请。</p>
              </Box>
              <Box cap="密码">
                <div className="flex flex-col gap-2">
                  <P3Button tone="soft" block leading={<MailGlyph />} onClick={() => setView('password_reset')}>用邮件链接设置 / 重置密码</P3Button>
                  <P3Button tone="soft" block leading={<KeyGlyph />} onClick={() => setView('password_change')}>我知道旧密码，直接改</P3Button>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed" style={{ color: P3R.grey }}>仅用邮箱验证码登录过的老账号，旧密码是随机生成的——请用"邮件链接"那条设一个。</p>
              </Box>
            </>
          )}
          {view === 'userid' && (
            <>
              <P3Field label={uid ? '新的 UserID' : 'UserID'} hint="3-18 位小写字母 / 数字 / ._-；注册后仍可修改，但要注意好友会通过它找你。">
                <P3Input lead="@" value={draft} onChange={(e) => setDraft(e.target.value.toLowerCase())} placeholder="alice_in_velvet" autoFocus />
              </P3Field>
              <Msg />
              <div className="grid grid-cols-2 gap-2"><P3Button tone="soft" onClick={() => setView('home')}>取消</P3Button><P3Button corner onClick={saveUid} busy={loading} busyText="保存中…">{uid ? '保存新的 UserID' : '设置 UserID'}</P3Button></div>
            </>
          )}
          {view === 'password_change' && (
            <>
              <P3Field label="当前密码"><P3Input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} autoComplete="current-password" /></P3Field>
              <P3Field label="新密码 (至少 8 位)"><P3Input type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} autoComplete="new-password" /></P3Field>
              <P3Field label="再次输入新密码"><P3Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></P3Field>
              <p className="text-[11px]" style={{ color: P3R.grey }}>如果忘记了旧密码，请回上一步选"用邮件链接"。</p>
              <Msg />
              <div className="grid grid-cols-2 gap-2"><P3Button tone="soft" onClick={() => setView('home')}>取消</P3Button><P3Button corner onClick={changePw} busy={loading} busyText="保存中…">确认修改</P3Button></div>
            </>
          )}
          {view === 'password_reset' && (
            <>
              <NoteBox>点击下方按钮，我们会给 <b style={{ color: P3R.roseInk }}>{CLOUD_USER.email}</b> 发一条重置链接，在链接里设置新密码即可。<span className="mt-1 block text-[12px]" style={{ color: P3R.grey }}>没登录过密码的老账号（OTP 注册），这是最稳的设密码方式。</span></NoteBox>
              <P3Field label="你的邮箱"><P3Input value={CLOUD_USER.email} readOnly /></P3Field>
              <Msg />
              <div className="grid grid-cols-2 gap-2"><P3Button tone="soft" onClick={() => setView('home')}>返回</P3Button><P3Button corner onClick={sendReset} busy={loading} busyText="发送中…">发送重置邮件</P3Button></div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </P3Sheet>
  );
}

export default function AccountManagePanel({ open, onClose, params }: OverlayProps) {
  const v = params?.get('view') as View | null;
  return <AccountManagePanelView open={open} onClose={onClose} initialView={v ?? 'home'} userId={params?.get('nouid') === '1' ? null : CLOUD_USER.username} />;
}
