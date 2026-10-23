/**
 * 登录弹窗（真实 src/components/auth/LoginModal.tsx · p3 频道 = 非 p5 文案）→ P3R 系统大框。
 * 首步（未同意过）先出 CloudConsentNotice（gate）→ 标题「欢迎归来，客人 / 登录MASKARIA」+ 副题 → 方式「验证码 · 推荐」/「密码」
 * → 验证码：UserID 或邮箱 + 新客人提示 + 发送验证码（发送中… / 冷却 Ns）→ 输入验证码步：已发送至 X / 新客人登记提示 / 验证码 / 错误 / 提示 /
 *   进入房间（完成登记 · 进入房间 / 验证中…）/ ← 换个身份 / 重新发送（重发 Ns）
 * 密码：UserID 或邮箱 / 密码 / 进入房间（登录中…）/ 忘记密码？（→ 重置链接已发送）/ 错误。底部「稍后再说」+「—— MASKARIA ——」。
 * 路由：?mode=password（截图时也可 ?method=password）?step=otp ?origin=welcome ?consent=1 ?signup=1 ?error=1。演示口令：验证码 000000 / 密码 wrong = 错误。
 * 状态机改写自黄色版（只读参考）。
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { P3Segment, P3Button, P3R, slantClip, useToast } from '@blue/kit';
import { SysModal } from '@blue/screens/pkg5/sysmodal';
import { CloudConsentBody } from './CloudConsentNotice.p3r';
import { accountAuthOps } from '@/themes/accountAuth';

export interface LoginModalProps { open: boolean; onClose: () => void; origin?: 'account' | 'welcome'; needConsent?: boolean; initialMode?: 'otp' | 'password'; initialStep?: 'input' | 'code'; signup?: boolean; demoError?: boolean; onLoggedIn?: () => void }

const Lbl = ({ children }: { children: ReactNode }) => (
  <span className="mb-1.5 flex items-center gap-2"><span aria-hidden className="h-[10px] w-[7px]" style={{ background: P3R.blue, clipPath: 'polygon(30% 0, 100% 0, 70% 100%, 0 100%)' }} /><span className="text-[13px] font-black" style={{ color: P3R.ink }}>{children}</span></span>
);
const inpStyle = { background: 'var(--p3r-field)', color: P3R.ink, clipPath: slantClip(8), borderBottom: `3px solid ${P3R.cyan}` } as const;

export function LoginModalView({ open, onClose, origin = 'account', needConsent: needConsent0 = false, initialMode = 'otp', initialStep = 'input', signup = false, demoError, onLoggedIn }: LoginModalProps) {
  const toast = useToast();
  const [needConsent, setNeedConsent] = useState(needConsent0);
  const [mode, setMode] = useState<'otp' | 'password'>(initialMode);
  const [step, setStep] = useState<'input' | 'code'>(initialStep);
  const [identity, setIdentity] = useState(initialStep === 'code' ? 'minato.yuki@gekkoukan.jp' : '');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [otpId, setOtpId] = useState('');
  const [cooldown, setCooldown] = useState(initialStep === 'code' ? 42 : 0);
  const [signupInProgress, setSignup] = useState(signup);
  const [error, setError] = useState(demoError ? (initialMode === 'password' ? '用户名或密码不正确' : '验证码不正确或已过期') : '');
  const [info, setInfo] = useState(initialStep === 'code' && !demoError ? (signup ? '新客人登记中 —— 验证码已发到 minato.yuki@gekkoukan.jp' : '验证码已发送') : '');
  const [loading, setLoading] = useState(false);
  const first = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);
  useEffect(() => { if (open) { setNeedConsent(needConsent0); setMode(initialMode); setStep(initialStep); setLoading(false); setTimeout(() => first.current?.focus(), 120); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!mounted.current) { mounted.current = true; return; } setError(''); setInfo(''); }, [mode]);
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
      onClose();
      if (onLoggedIn) onLoggedIn(); else toast.success('欢迎回来');
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
      if (onLoggedIn) onLoggedIn(); else toast.success('欢迎回来');
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
  const Err = () => (error ? <p role="alert" className="flex items-start gap-1.5 px-3 py-1.5 text-[12px] font-black" style={{ background: 'var(--bk-danger-wash)', color: 'var(--p3r-coral-ink)', clipPath: slantClip(6) }}><span aria-hidden>✕</span><span className="min-w-0">{error}</span></p> : null);
  const Info = () => (info ? <p className="flex items-start gap-1.5 px-3 py-1.5 text-[12px] font-black" style={{ background: P3R.cyanPale, color: P3R.ink, clipPath: slantClip(6) }}><span aria-hidden style={{ color: P3R.blue }}>✓</span><span className="min-w-0">{info}</span></p> : null);
  return (
    <SysModal open={open} onClose={onClose} title={title} subtitle={subtitle}>
      {needConsent ? (
        <CloudConsentBody variant="gate" onAccept={() => setNeedConsent(false)} onDecline={onClose} />
      ) : (
        <div className="flex min-w-0 flex-col gap-3">
          {!(mode === 'otp' && step === 'code') && (
            <P3Segment value={mode} onChange={(v) => setMode(v as 'otp' | 'password')} items={[{ id: 'otp', label: <>验证码 <span className="text-[11px] opacity-80">· 推荐</span></> }, { id: 'password', label: '密码' }]} />
          )}
          {mode === 'otp' && step === 'input' && (
            <>
              <label className="block min-w-0"><Lbl>UserID 或邮箱</Lbl>
                <input ref={first} className="h-12 w-full min-w-0 px-4 text-[15px] font-bold outline-none placeholder:font-normal placeholder:opacity-50" style={inpStyle} value={identity} onChange={(e) => setIdentity(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendOtp(); }} placeholder="alice_in_velvet 或 your@email.com" autoComplete="username" />
              </label>
              <p className="text-[11px] font-bold leading-relaxed" style={{ color: P3R.grey }}>新客人直接填邮箱——第一次验证就相当于登记。</p>
              <Err /><Info />
              <P3Button block size="lg" corner onClick={sendOtp} busy={loading} busyText="发送中…">{cooldown > 0 ? `发送验证码（${cooldown}s）` : '发送验证码'}</P3Button>
            </>
          )}
          {mode === 'otp' && step === 'code' && (
            <>
              <div className="px-4 py-2" style={{ background: 'var(--p3r-row)', clipPath: slantClip(8) }}>
                <p className="text-[11px] font-bold" style={{ color: P3R.grey }}>验证码已发送至</p>
                <p className="truncate text-[15px] font-black" style={{ color: P3R.ink }}>{identity || 'your@email.com'}</p>
              </div>
              {signupInProgress && <p className="px-4 py-2 text-[12px] font-black" style={{ background: 'rgb(var(--p3r-mint-rgb) / 0.25)', color: P3R.ink, clipPath: slantClip(8) }}>新客人登记中——输入验证码即为你开一个房间。UserID 可以稍后在设置里补。</p>}
              <label className="block min-w-0"><Lbl>验证码</Lbl>
                <input ref={first} aria-label="邮箱验证码" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))} onKeyDown={(e) => { if (e.key === 'Enter') verify(); }} placeholder="----"
                  className="h-14 w-full min-w-0 px-4 text-center font-cond text-[28px] tracking-[0.5em] outline-none" style={{ ...inpStyle, color: P3R.blue }} />
              </label>
              <Err /><Info />
              <P3Button block size="lg" corner onClick={verify} busy={loading} busyText="验证中…">{signupInProgress ? '完成登记 · 进入房间' : '进入房间'}</P3Button>
              <div className="flex items-center justify-between gap-2 text-[13px] font-black">
                <button type="button" onClick={() => { setStep('input'); setError(''); setInfo(''); setSignup(false); }} style={{ color: P3R.inkSoft }}>← 换个身份</button>
                <button type="button" onClick={resend} disabled={cooldown > 0 || loading} className={cooldown > 0 ? 'opacity-40' : 'underline decoration-2 underline-offset-4'} style={{ color: cooldown > 0 ? P3R.grey : P3R.roseInk }}>{cooldown > 0 ? `重发 (${cooldown}s)` : '重新发送'}</button>
              </div>
            </>
          )}
          {mode === 'password' && (
            <>
              <label className="block min-w-0"><Lbl>UserID 或邮箱</Lbl>
                <input ref={first} className="h-12 w-full min-w-0 px-4 text-[15px] font-bold outline-none placeholder:font-normal placeholder:opacity-50" style={inpStyle} value={identity} onChange={(e) => setIdentity(e.target.value)} placeholder="alice_in_velvet 或 your@email.com" autoComplete="username" />
              </label>
              <label className="block min-w-0"><Lbl>密码</Lbl>
                <input type="password" aria-label="密码" className="h-12 w-full min-w-0 px-4 text-[15px] font-bold outline-none" style={inpStyle} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') pwLogin(); }} autoComplete="current-password" />
              </label>
              <Err /><Info />
              <P3Button block size="lg" corner onClick={pwLogin} busy={loading} busyText="登录中…">进入房间</P3Button>
              <div className="text-right"><button type="button" onClick={forgot} className="text-[13px] font-black underline decoration-2 underline-offset-4" style={{ color: P3R.roseInk }}>忘记密码？</button></div>
            </>
          )}
          <div className="mt-1 border-t-2 border-dotted pt-3 text-center text-[11px] font-bold leading-relaxed" style={{ borderColor: 'rgb(var(--p3r-cyan-rgb) / 0.5)', color: P3R.grey }}>新客人也可以直接填邮箱，第一次验证就等于登记</div>
          <div className="text-center"><button type="button" onClick={onClose} className="text-[13px] font-black" style={{ color: P3R.inkSoft }}>稍后再说</button></div>
          <div className="text-center font-cond text-[11px] tracking-[0.3em]" style={{ color: P3R.roseInk }}>—— MASKARIA ——</div>
        </div>
      )}
    </SysModal>
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
