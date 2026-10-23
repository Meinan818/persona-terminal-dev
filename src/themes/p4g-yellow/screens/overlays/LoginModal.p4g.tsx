/**
 * 登录弹窗（真实 src/components/auth/LoginModal.tsx，P4 频道 = 非 p5 文案）。
 * 首步（未同意过）先出 CloudConsentNotice（gate）→ 标题「欢迎归来，客人 / 登录MASKARIA」+ 副题
 * → 方式「验证码 · 推荐」/「密码」→ 验证码：UserID 或邮箱 + 新客人提示 + 发送验证码（发送中… / 冷却）
 * → 输入验证码步：新客人登记提示 / 验证码输入 / 错误 / 提示 / 进入房间（完成登记 · 进入房间 / 验证中…）/ ← 换个身份 / 重新发送（重发 Ns）
 * 密码：UserID 或邮箱 / 密码 / 进入房间（登录中…）/ 忘记密码？（→ 发送重置链接）/ 错误。底部「稍后再说」+「—— MASKARIA ——」。
 * 演示：?mode=password（截图时用 ?method=password，mode 会被外壳日夜参数占用）  ?step=otp  ?origin=welcome  ?consent=1  ?signup=1  ?error=1
 * 演示口令：验证码 000000 = 错误；密码 wrong = 错误。
 */
import { useEffect, useRef, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4SegmentTabs, P4Button, P4Input, useToast } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { CloudConsentBody, MsgHeader, MsgModal } from './CloudConsentNotice.p4g';
import { accountAuthOps } from '@/themes/accountAuth';

export interface LoginModalProps { open: boolean; onClose: () => void; origin?: 'account' | 'welcome'; needConsent?: boolean; initialMode?: 'otp' | 'password'; initialStep?: 'input' | 'code'; signup?: boolean; demoError?: boolean; onLoggedIn?: () => void }

export function LoginModalView({ open, onClose, origin = 'account', needConsent: needConsent0 = false, initialMode = 'otp', initialStep = 'input', signup = false, demoError, onLoggedIn }: LoginModalProps) {
  const toast = useToast();
  const [needConsent, setNeedConsent] = useState(needConsent0);
  const [mode, setMode] = useState<'otp' | 'password'>(initialMode);
  const [step, setStep] = useState<'input' | 'code'>(initialStep);
  const [identity, setIdentity] = useState(initialStep === 'code' ? 'yu.narukami@inaba.jp' : '');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [otpId, setOtpId] = useState('');
  const [cooldown, setCooldown] = useState(initialStep === 'code' ? 42 : 0);
  const [signupInProgress, setSignup] = useState(signup);
  const [error, setError] = useState(demoError ? (initialMode === 'password' ? '用户名或密码不正确' : '验证码不正确或已过期') : '');
  const [info, setInfo] = useState(initialStep === 'code' && !demoError ? (signup ? '新客人登记中 —— 验证码已发到 yu.narukami@inaba.jp' : '验证码已发送') : '');
  const [loading, setLoading] = useState(false);
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setNeedConsent(needConsent0); setMode(initialMode); setStep(initialStep); setLoading(false); setTimeout(() => first.current?.focus(), 120); } }, [open]); // eslint-disable-line
  useEffect(() => { setError(''); setInfo(''); }, [mode]);
  useEffect(() => { if (cooldown <= 0) return; const t = setTimeout(() => setCooldown((c) => c - 1), 1000); return () => clearTimeout(t); }, [cooldown]);

  const sendOtp = () => {
    setError(''); setInfo('');
    if (cooldown > 0) { setError(`请稍后再试（还有 ${cooldown}s）`); return; }
    if (!identity.trim()) { setError('请输入 UserID 或邮箱'); return; }
    setLoading(true);
    void accountAuthOps.sendLoginCode(identity).then(({ otpId: id, wasSignup }) => {
      setOtpId(id);
      setSignup(wasSignup);
      setStep('code');
      setCooldown(60);
      setInfo(wasSignup ? `新客人登记中 —— 验证码已发到 ${id}` : '验证码已发送');
    }).catch((e) => {
      setError(e instanceof Error ? e.message : '发送失败，请稍后重试');
    }).finally(() => setLoading(false));
  };
  const verify = () => {
    setError(''); setInfo('');
    if (code.trim().length < 4) { setError('请输入完整的验证码'); return; }
    setLoading(true);
    void accountAuthOps.verifyLoginCode(otpId || identity.trim().toLowerCase(), code).then(() => {
      if (signupInProgress) setInfo('登记完成 · 接下来完成房间初始化');
      onClose();
      onLoggedIn ? onLoggedIn() : toast.success('欢迎回来');
    }).catch((e) => {
      setError(e instanceof Error ? e.message : '验证码错误或已过期');
    }).finally(() => setLoading(false));
  };
  const resend = () => {
    setError(''); setInfo('');
    if (cooldown > 0) return;
    setLoading(true);
    void accountAuthOps.sendLoginCode(identity).then(({ otpId: id, wasSignup }) => {
      setOtpId(id);
      setSignup(wasSignup);
      setCode('');
      setCooldown(60);
      setInfo(wasSignup ? '新客人登记验证码已重发' : '已重新发送');
    }).catch((e) => {
      setError(e instanceof Error ? e.message : '重发失败');
    }).finally(() => setLoading(false));
  };
  const pwLogin = () => {
    setError(''); setInfo('');
    if (!identity.trim()) { setError('请输入 UserID 或邮箱'); return; }
    if (!password) { setError('请输入密码'); return; }
    setLoading(true);
    void accountAuthOps.loginWithPassword(identity, password).then(() => {
      onClose();
      onLoggedIn ? onLoggedIn() : toast.success('欢迎回来');
    }).catch((e) => {
      setError(e instanceof Error ? e.message : '登录失败');
    }).finally(() => setLoading(false));
  };
  const forgot = () => {
    setError(''); setInfo('');
    if (!identity.trim()) { setError('请先填上邮箱或 UserID'); return; }
    setLoading(true);
    void accountAuthOps.sendPasswordReset(identity).then(() => {
      setInfo('重置密码链接已发送');
    }).catch((e) => {
      setError(e instanceof Error ? e.message : '发送失败');
    }).finally(() => setLoading(false));
  };

  const title = needConsent ? '把数据交给云端之前' : origin === 'welcome' ? '欢迎归来，客人' : '登录MASKARIA';
  const subtitle = needConsent ? '几句实话，读完再决定' : '验证码最省心——没登记过的邮箱也能直接进';
  const Err = () => (error ? <p role="alert" className="flex items-start gap-1.5 rounded-xs bg-p4g-red px-2.5 py-1.5 text-meta font-bold text-white"><span aria-hidden>✕</span><span className="min-w-0">{error}</span></p> : null);
  const Info = () => (info ? <p className="flex items-start gap-1.5 rounded-xs bg-p4g-green px-2.5 py-1.5 text-meta font-bold text-p4g-black"><span aria-hidden>✓</span><span className="min-w-0">{info}</span></p> : null);
  const lbl = 'mb-1.5 block font-display text-meta font-bold text-p4g-yellow';
  const inp = 'h-12 w-full min-w-0 rounded-sm border-3 border-p4g-yellow bg-p4g-black/40 px-3 text-body font-bold text-white outline-none placeholder:font-normal placeholder:text-white/40 focus:shadow-[4px_4px_0_var(--p4g-orange)]';

  return (
    <MsgModal open={open} header={<MsgHeader title={title} subtitle={subtitle} />}>
      <div aria-hidden className="mb-4 h-[3px] p4g-hazard" />
      {needConsent ? (
        <CloudConsentBody variant="gate" onAccept={() => setNeedConsent(false)} onDecline={onClose} />
      ) : (
        <div className="flex min-w-0 flex-col gap-3">
          {!(mode === 'otp' && step === 'code') && (
            <P4SegmentTabs value={mode} onChange={(v) => setMode(v as 'otp' | 'password')} items={[{ id: 'otp', label: <>验证码 <span className="text-2xs opacity-75">· 推荐</span></> }, { id: 'password', label: '密码' }]} />
          )}
          {mode === 'otp' && step === 'input' && (
            <>
              <label className="block min-w-0"><span className={lbl}>UserID 或邮箱</span>
                <input ref={first} className={inp} value={identity} onChange={(e) => setIdentity(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendOtp(); }} placeholder="alice_in_velvet 或 your@email.com" autoComplete="username" />
              </label>
              <p className="text-2xs leading-relaxed text-[color:var(--p4g-msg-ink)]/75">新客人直接填邮箱——第一次验证就相当于登记。</p>
              <Err /><Info />
              <P4Button block size="lg" onClick={sendOtp} disabled={loading}>{loading ? '发送中…' : cooldown > 0 ? `发送验证码（${cooldown}s）` : '发送验证码'}</P4Button>
            </>
          )}
          {mode === 'otp' && step === 'code' && (
            <>
              <div className="rounded-sm border-thin border-white/20 bg-white/5 px-3 py-2">
                <p className="text-2xs font-bold text-[color:var(--p4g-msg-ink)]/70">验证码已发送至</p>
                <p className="truncate font-display text-body font-bold text-white">{identity || 'your@email.com'}</p>
              </div>
              {signupInProgress && <p className="rounded-sm border-thin border-p4g-green bg-p4g-green/15 px-3 py-2 text-meta font-bold text-p4g-green">新客人登记中——输入验证码即为你开一个房间。UserID 可以稍后在设置里补。</p>}
              <label className="block min-w-0"><span className={lbl}>验证码</span>
                <input ref={first} aria-label="邮箱验证码" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))} onKeyDown={(e) => { if (e.key === 'Enter') verify(); }} placeholder="----"
                  className={cx(inp, 'h-14 text-center font-mono text-[26px] tracking-[0.5em]')} />
              </label>
              <Err /><Info />
              <P4Button block size="lg" onClick={verify} disabled={loading}>{loading ? '验证中…' : signupInProgress ? '完成登记 · 进入房间' : '进入房间'}</P4Button>
              <div className="flex items-center justify-between gap-2 text-meta font-bold">
                <button type="button" onClick={() => { setStep('input'); setError(''); setInfo(''); setSignup(false); }} className="text-[color:var(--p4g-msg-ink)]/80 hover:text-p4g-yellow">← 换个身份</button>
                <button type="button" onClick={resend} disabled={cooldown > 0 || loading} className={cooldown > 0 ? 'text-white/35' : 'text-p4g-yellow underline decoration-2 underline-offset-4'}>{cooldown > 0 ? `重发 (${cooldown}s)` : '重新发送'}</button>
              </div>
            </>
          )}
          {mode === 'password' && (
            <>
              <label className="block min-w-0"><span className={lbl}>UserID 或邮箱</span>
                <input ref={first} className={inp} value={identity} onChange={(e) => setIdentity(e.target.value)} placeholder="alice_in_velvet 或 your@email.com" autoComplete="username" />
              </label>
              <label className="block min-w-0"><span className={lbl}>密码</span>
                <input type="password" className={inp} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') pwLogin(); }} autoComplete="current-password" />
              </label>
              <Err /><Info />
              <P4Button block size="lg" onClick={pwLogin} disabled={loading}>{loading ? '登录中…' : '进入房间'}</P4Button>
              <div className="text-right"><button type="button" onClick={forgot} className="font-display text-meta font-bold text-p4g-yellow underline decoration-2 underline-offset-4">忘记密码？</button></div>
            </>
          )}
          <div className="mt-2 border-t-2 border-dashed border-white/15 pt-3 text-center text-2xs leading-relaxed text-[color:var(--p4g-msg-ink)]/70">新客人也可以直接填邮箱，第一次验证就等于登记</div>
          <div className="text-center"><button type="button" onClick={onClose} className="font-display text-meta font-bold text-[color:var(--p4g-msg-ink)]/80 hover:text-p4g-yellow">稍后再说</button></div>
          <div className="text-center font-display text-2xs font-bold tracking-[0.3em] text-p4g-yellow/70">—— MASKARIA ——</div>
        </div>
      )}
    </MsgModal>
  );
}

export default function LoginModal({ open, onClose, params }: OverlayProps) {
  return (
    <LoginModalView open={open} onClose={onClose}
      origin={params?.get('origin') === 'welcome' ? 'welcome' : 'account'}
      needConsent={params?.get('consent') === '1'}
      initialMode={(params?.get('method') ?? params?.get('mode')) === 'password' ? 'password' : 'otp'}
      initialStep={params?.get('step') === 'otp' ? 'code' : 'input'}
      signup={params?.get('signup') === '1'}
      demoError={params?.get('error') === '1'} />
  );
}
