import { forwardRef, useEffect, useRef, useState } from 'react';
import type { ForwardedRef, KeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  loginWithPassword,
  requestLoginOrSignupOTP,
  verifyOTP,
  requestPasswordReset,
} from '@/services/auth';
import { useBackHandler } from '@/utils/useBackHandler';
import { useAppStore } from '@/store';
import { CloudConsentNotice } from './CloudConsentNotice';
import type { VelvetRecord } from '@/services/velvetApi';
import { useUiChannel } from '@/ui/useUiChannel';
import { P5R, P5_FONT, P5Btn } from '@/components/p5r/kit';
import { P5CallingCard } from './P5CallingCard';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (record: VelvetRecord) => void;
  /** 入口位置：'welcome' 来自欢迎页，'settings' 来自设置页 */
  origin?: 'welcome' | 'settings';
}

type AuthMode = 'otp' | 'password';

const RESEND_COOLDOWN = 60;

export const LoginModal = ({ isOpen, onClose, onSuccess, origin = 'settings' }: Props) => {
  const p5Theme = useUiChannel() === 'p5';
  const [mode, setMode] = useState<AuthMode>('otp');
  // 免责声明闸门（FS1.2）：没同意过就先出声明页，同意后本弹窗原地切到登录表单。
  // 同意态存在 settings 里并随账号上云，多设备只需同意一次。
  const cloudConsentAt = useAppStore(s => s.settings.cloudConsentAt);
  const updateSettings = useAppStore(s => s.updateSettings);
  const needConsent = !cloudConsentAt;

  // 输入
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');

  // OTP 流程
  const [otpId, setOtpId] = useState('');
  const [code, setCode] = useState('');
  const [otpStep, setOtpStep] = useState<'input' | 'code'>('input');
  const p5CodeStep = p5Theme && mode === 'otp' && otpStep === 'code';
  const [cooldown, setCooldown] = useState(0);
  /** 本次发码是否附带了"新客人首次登记"的自动创建 —— 用来切文案 */
  const [signupInProgress, setSignupInProgress] = useState(false);

  // 状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMode('otp');
    setIdentity('');
    setPassword('');
    setOtpId('');
    setCode('');
    setOtpStep('input');
    setCooldown(0);
    setSignupInProgress(false);
    setError('');
    setInfo('');
    setLoading(false);
    const t = setTimeout(() => firstInputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    setError('');
    setInfo('');
  }, [mode]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Android 返回键：
  //   - OTP 已进到验证码输入步骤（code）→ 先回到邮箱输入步骤（匹配组件内"返回"按钮）
  //   - 其他情况 → 关闭整个登录弹窗（匹配"稍后再说"按钮）
  //   注意：login 流程 loading 期间，"稍后再说"按钮本就没 disabled，因此 back 同样允许
  useBackHandler(isOpen, () => {
    if (mode === 'otp' && otpStep === 'code') {
      setOtpStep('input');
      setError('');
      setInfo('');
      setSignupInProgress(false);
    } else {
      onClose();
    }
  });

  // ── 登录 · 密码 ──────────────────────────────────
  const handlePasswordLogin = async () => {
    setError(''); setInfo('');
    if (!identity.trim()) { setError('请输入 UserID 或邮箱'); return; }
    if (!password) { setError('请输入密码'); return; }
    setLoading(true);
    try {
      const record = await loginWithPassword(identity, password);
      onSuccess?.(record);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  // ── 登录或登记 · 验证码（一条路径） ──────────────
  const handleSendOTP = async () => {
    setError(''); setInfo('');
    if (cooldown > 0) { setError(`请稍后再试（还有 ${cooldown}s）`); return; }
    if (!identity.trim()) { setError('请输入 UserID 或邮箱'); return; }
    setLoading(true);
    try {
      const { otpId, wasSignup } = await requestLoginOrSignupOTP(identity);
      setOtpId(otpId);
      setOtpStep('code');
      setCooldown(RESEND_COOLDOWN);
      setSignupInProgress(wasSignup);
      setInfo(
        wasSignup
          ? `新客人登记中 —— 验证码已发到 ${identity.trim().toLowerCase()}`
          : '验证码已发送',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setError('');
    if (code.trim().length < 4) { setError('请输入完整的验证码'); return; }
    setLoading(true);
    try {
      const record = await verifyOTP(otpId, code);
      if (signupInProgress) {
        setInfo('登记完成 · 接下来完成房间初始化');
      }
      onSuccess?.(record);
      setTimeout(() => onClose(), signupInProgress ? 900 : 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证码错误或已过期');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (cooldown > 0) return;
    setError(''); setInfo('');
    setLoading(true);
    try {
      // 重发时账号已确认存在（上一次要么找到了要么刚建完）→ 直接按邮箱发
      // 这里 identity 可能是 UserID；但 requestLoginOrSignupOTP 会再次解析
      const { otpId, wasSignup } = await requestLoginOrSignupOTP(identity);
      setOtpId(otpId);
      setCode('');
      setCooldown(RESEND_COOLDOWN);
      setInfo(wasSignup ? '新客人登记验证码已重发' : '已重新发送');
    } catch (err) {
      setError(err instanceof Error ? err.message : '重发失败');
    } finally {
      setLoading(false);
    }
  };

  // ── 忘记密码 ──────────────────────────────────────
  const handleForgotPassword = async () => {
    if (!identity.trim()) { setError('请先填上邮箱或 UserID'); return; }
    setError(''); setInfo('');
    setLoading(true);
    try {
      await requestPasswordReset(identity);
      setInfo(`重置密码链接已发送`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败');
    } finally {
      setLoading(false);
    }
  };

  const title = needConsent
    ? '把数据交给云端之前'
    : origin === 'welcome'
      ? '欢迎归来，客人'
      : '登录MASKARIA';
  const subtitle = needConsent
    ? '几句实话，读完再决定'
    : '验证码最省心——没登记过的邮箱也能直接进';

  // portal 到 body：脱离 App.tsx `relative z-10` stacking context（见 zIndex.ts 头注释）。
  // createPortal 必须包在 AnimatePresence 外侧，否则 exit 失效（参考 ConfirmDialog）。
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          // z-[150]：system 段（见 zIndex.ts），值沿用
          className="fixed inset-0 z-[150] flex items-center justify-center p-4"
          style={{
            background: p5CodeStep
              ? 'rgba(5,5,5,0.88)'
              : 'radial-gradient(ellipse at center, rgba(30,20,60,0.85) 0%, rgba(8,6,20,0.96) 100%)',
            backdropFilter: 'blur(8px)',
          }}
          // 不在蒙层点击时关闭——用底部"稍后再说"按钮或右上关闭；避免误触丢掉输入
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            onClick={e => e.stopPropagation()}
            className={['relative w-full max-w-md', p5CodeStep ? 'max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-[3px]' : 'overflow-hidden rounded-2xl'].join(' ')}
            style={{
              background: p5CodeStep ? P5R.paper : 'linear-gradient(180deg, #1a1a3e 0%, #0f0f2e 100%)',
              border: p5CodeStep ? '3px solid #050505' : '1px solid rgba(196, 181, 253, 0.25)',
              boxShadow: p5CodeStep
                ? '0 28px 72px rgba(0,0,0,0.58), 6px 7px 0 #050505'
                : '0 30px 80px rgba(0,0,0,0.5), 0 0 40px rgba(124,58,237,0.25)',
            }}
          >
            {p5CodeStep ? (
              <P5CallingCard />
            ) : (
              <div className="px-7 pt-7 pb-2 text-center">
                <div className="text-[11px] tracking-[0.5em] font-semibold" style={{ color: '#a78bfa' }}>
                  MASKARIA
                </div>
                <div className="text-lg leading-none my-2" style={{ color: '#6b7ca8' }}>◆</div>
                <h2 className="text-xl font-serif" style={{ color: '#f5e6ff' }}>{title}</h2>
                <p className="text-xs mt-2 leading-relaxed" style={{ color: '#a89dc0' }}>{subtitle}</p>
              </div>
            )}

            <div
              className={p5CodeStep ? 'mx-5 my-3 h-[2px]' : 'mx-7 my-4 h-px'}
              style={{
                background: p5CodeStep ? P5R.red : 'linear-gradient(90deg, transparent, rgba(196,181,253,0.4), transparent)',
              }}
            />

            {needConsent ? (
              <CloudConsentNotice
                onAccept={() => { void updateSettings({ cloudConsentAt: new Date().toISOString() }); }}
                onDecline={onClose}
              />
            ) : (
            <div className="px-7 pb-6">
              {/* 两个 Tab：验证码（默认） / 密码 */}
              <div
                className={['grid grid-cols-2 gap-1 p-1 mb-5', p5CodeStep ? 'border-2 border-[#050505]' : 'rounded-lg'].join(' ')}
                style={{
                  background: p5CodeStep ? P5R.ink : 'rgba(124,58,237,0.08)',
                  border: p5CodeStep ? `2px solid ${P5R.ink}` : '1px solid rgba(196,181,253,0.15)',
                }}
              >
                {([
                  { id: 'otp', label: '验证码' },
                  { id: 'password', label: '密码' },
                ] as Array<{ id: AuthMode; label: string }>).map(t => {
                  const active = mode === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setMode(t.id)}
                      className={['py-1.5 text-[11px] font-semibold tracking-wider transition-all', p5CodeStep ? 'rounded-[2px]' : 'rounded-md'].join(' ')}
                      style={{
                        background: active ? (p5CodeStep ? P5R.red : 'rgba(167,139,250,0.25)') : 'transparent',
                        color: active ? (p5CodeStep ? P5R.paper : '#f5e6ff') : (p5CodeStep ? P5R.paperDim : '#a89dc0'),
                        border: active ? (p5CodeStep ? `1px solid ${P5R.paper}` : '1px solid rgba(196,181,253,0.4)') : '1px solid transparent',
                        fontFamily: p5CodeStep ? P5_FONT : undefined,
                      }}
                    >
                      {t.label}
                      {t.id === 'otp' && <span className="ml-1 text-[9px]" style={{ color: p5CodeStep ? P5R.paper : '#86efac' }}>· 推荐</span>}
                    </button>
                  );
                })}
              </div>

              {mode === 'otp' ? (
                otpStep === 'input' ? (
                  <>
                    <Label>UserID 或邮箱</Label>
                    <TextInput
                      ref={firstInputRef}
                      type="text"
                      value={identity}
                      onChange={v => setIdentity(v.toLowerCase())}
                      placeholder="alice_in_velvet 或 your@email.com"
                      autoComplete="username email"
                      onEnter={handleSendOTP}
                    />
                    <p className="mt-2 text-[10px] leading-relaxed" style={{ color: '#8b7ca8' }}>
                      新客人直接填邮箱——第一次验证就相当于登记。
                    </p>
                    {error && <ErrorText>{error}</ErrorText>}
                    {info && <InfoText>{info}</InfoText>}
                    <div className="mt-6">
                      <PrimaryButton loading={loading} onClick={handleSendOTP}>
                        {loading ? '发送中…' : '发送验证码'}
                      </PrimaryButton>
                    </div>
                  </>
                ) : (
                  <OTPCodeStep
                    code={code}
                    setCode={setCode}
                    error={error}
                    info={info}
                    loading={loading}
                    cooldown={cooldown}
                    signupInProgress={signupInProgress}
                    p5={p5CodeStep}
                    email={otpId}
                    onBack={() => { setOtpStep('input'); setError(''); setInfo(''); setSignupInProgress(false); }}
                    onVerify={handleVerifyOTP}
                    onResend={handleResendOTP}
                    firstInputRef={firstInputRef}
                  />
                )
              ) : (
                <>
                  <Label>UserID 或邮箱</Label>
                  <TextInput
                    ref={firstInputRef}
                    type="text"
                    value={identity}
                    onChange={v => setIdentity(v.toLowerCase())}
                    placeholder="alice_in_velvet 或 your@email.com"
                    autoComplete="username email"
                    onEnter={handlePasswordLogin}
                  />
                  <div className="h-4" />
                  <Label>密码</Label>
                  <TextInput
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="•••••••••"
                    autoComplete="current-password"
                    onEnter={handlePasswordLogin}
                  />
                  {error && <ErrorText>{error}</ErrorText>}
                  {info && <InfoText>{info}</InfoText>}
                  <div className="mt-6">
                    <PrimaryButton loading={loading} onClick={handlePasswordLogin}>
                      {loading ? '登录中…' : '进入房间'}
                    </PrimaryButton>
                  </div>
                </>
              )}

              {/* 忘记密码（仅密码 Tab 可见） */}
              {mode === 'password' && (
                <div className="mt-5 text-right">
                  <button
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="text-[11px] hover:opacity-80 transition-opacity disabled:opacity-40"
                    style={{ color: '#8b7ca8' }}
                  >
                    忘记密码？
                  </button>
                </div>
              )}

              <div
                className="mt-5 pt-4 border-t text-[10px] text-center leading-relaxed"
                style={{ borderColor: p5CodeStep ? P5R.paperDim : 'rgba(196,181,253,0.15)', color: p5CodeStep ? P5R.grey : '#6b7ca8' }}
              >
                新客人也可以直接填邮箱，第一次验证就等于登记
              </div>

              <div className="mt-3 text-center">
                <button
                  onClick={onClose}
                  className="text-xs hover:opacity-80 transition-opacity"
                  style={{ color: p5CodeStep ? P5R.grey : '#6b7ca8' }}
                >
                  稍后再说
                </button>
              </div>
            </div>
            )}

            <div
              className="pb-5 pt-1 text-center text-[10px] tracking-[0.3em]"
              style={{ color: p5CodeStep ? P5R.grey : '#4c4878' }}
            >
              {p5CodeStep ? '—— MASKARIA，参上！ ——' : '—— MASKARIA ——'}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

// ── OTP 验证码输入步骤 ─────────────────────────────────────

function OTPCodeStep({
  code, setCode, error, info, loading, cooldown, signupInProgress, p5, email,
  onBack, onVerify, onResend, firstInputRef,
}: {
  code: string;
  setCode: (v: string) => void;
  error: string;
  info: string;
  loading: boolean;
  cooldown: number;
  signupInProgress: boolean;
  p5: boolean;
  email: string;
  onBack: () => void;
  onVerify: () => void;
  onResend: () => void;
  firstInputRef: React.RefObject<HTMLInputElement>;
}) {
  useEffect(() => {
    const t = setTimeout(() => firstInputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [firstInputRef]);

  return (
    <>
      {p5 && (
        <div className="mb-4 border-b-2 pb-3" style={{ borderColor: P5R.paperDim }}>
          <p className="text-[12px] font-bold" style={{ color: P5R.grey }}>验证码已发送至</p>
          <p className="mt-1 break-all text-[13px] font-black" style={{ color: P5R.ink }}>{email}</p>
        </div>
      )}
      {signupInProgress && (
        <div
          className="mb-3 px-3 py-2 rounded-lg text-[11px] leading-relaxed"
          style={{
            background: p5 ? '#f8f8f6' : 'rgba(16,185,129,0.12)',
            border: p5 ? `1px solid ${P5R.red}` : '1px solid rgba(16,185,129,0.35)',
            color: p5 ? P5R.ink : '#86efac',
          }}
        >
          新客人登记中——输入验证码即为你开一个房间。UserID 可以稍后在设置里补。
        </div>
      )}
      {p5 ? (
        <label className="mb-2 block text-[12px] font-black tracking-wider" style={{ color: P5R.ink }}>潜入暗号 · 邮箱验证码</label>
      ) : <Label>验证码</Label>}
      <TextInput
        ref={firstInputRef}
        type="text"
        inputMode="numeric"
        value={code}
        onChange={v => setCode(v.replace(/\D/g, '').slice(0, 8))}
        placeholder={p5 ? '······' : '----'}
        autoComplete="one-time-code"
        onEnter={onVerify}
        centered
        mono
        p5={p5}
        ariaLabel="邮箱验证码"
      />
      {p5 && <p className="mt-2 text-[11px] font-semibold leading-relaxed" style={{ color: P5R.grey }}>此暗号仅用于本次登录，请勿转发；若不是你申请，可忽略邮件。</p>}
      {error && <ErrorText p5={p5}>{p5 && error === '验证码不正确或已过期' ? '暗号不正确或已过期。请检查邮件，或重新领取。' : error}</ErrorText>}
      {info && <InfoText p5={p5}>{p5 && info === '验证码已发送' ? '预告函已送达，请查收邮箱。' : p5 && info === '已重新发送' ? '新的预告函已寄出，请使用最新暗号。' : info}</InfoText>}
      <div className="mt-6">
        <PrimaryButton loading={loading} onClick={onVerify} p5={p5}>
          {loading ? (p5 ? '正在核对暗号…' : '验证中…') : (signupInProgress ? '完成登记 · 进入房间' : p5 ? '揭下面具 · 进入房间' : '进入房间')}
        </PrimaryButton>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <button
          onClick={onBack}
          className="hover:opacity-80 transition-opacity"
          style={{ color: p5 ? P5R.grey : '#6b7ca8', fontWeight: p5 ? 700 : undefined }}
        >
          {p5 ? '更换邮箱' : '← 换个身份'}
        </button>
        <button
          onClick={onResend}
          disabled={cooldown > 0 || loading}
          className="transition-opacity disabled:opacity-40"
          style={{ color: cooldown > 0 ? (p5 ? P5R.grey : '#4c4878') : (p5 ? P5R.red : '#a78bfa'), fontWeight: p5 ? 800 : undefined }}
        >
          {cooldown > 0 ? `${p5 ? '重寄' : '重发'} (${cooldown}s)` : p5 ? '重寄预告函' : '重新发送'}
        </button>
      </div>
    </>
  );
}

// ── 共享小组件 ─────────────────────────────────────────────

const Label = ({ children }: { children: ReactNode }) => (
  <label className="block text-xs mb-2 tracking-wider" style={{ color: '#c8c2e0' }}>
    {children}
  </label>
);

interface TextInputProps {
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'email';
  onEnter?: () => void;
  centered?: boolean;
  mono?: boolean;
  p5?: boolean;
  ariaLabel?: string;
}

const TextInput = forwardRef(
  (
    { type, value, onChange, placeholder, autoComplete, inputMode, onEnter, centered, mono, p5, ariaLabel }: TextInputProps,
    ref: ForwardedRef<HTMLInputElement>
  ) => {
    // iOS WKWebView + 中文输入法的经典坑（iPhone Air 实测拼音重复）：composition
    // 组合期间受控回写（尤其调用方 onChange 里 toLowerCase 等变换）会打断 IME 会话，
    // 拼音被反复提交。半受控修法：组合期间由本地 state 驱动、不上报 onChange；
    // compositionend 一次性上报最终值，调用方的变换结果再经 effect 同步回来。
    const [inner, setInner] = useState(value);
    const composingRef = useRef(false);
    useEffect(() => {
      if (!composingRef.current) setInner(value);
    }, [value]);
    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onEnter) {
        e.preventDefault();
        onEnter();
      }
    };
    const className = [
      'w-full px-4 py-3 text-sm outline-none transition-colors',
      p5 ? 'rounded-[2px] focus-visible:ring-2 focus-visible:ring-[#c00008] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f0e9df]' : 'rounded-lg focus:border-violet-400',
      centered ? 'text-center' : '',
      p5 && mono ? 'font-mono tracking-[0.48em] text-[24px] font-bold' : mono ? 'font-mono tracking-[0.4em] text-lg' : '',
    ].join(' ');
    return (
      <input
        ref={ref}
        type={type}
        value={inner}
        onChange={e => {
          const v = e.target.value;
          setInner(v);
          if (!composingRef.current) onChange(v);
        }}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={e => {
          composingRef.current = false;
          const v = e.currentTarget.value;
          setInner(v);
          onChange(v);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-label={ariaLabel}
        className={className}
        style={{
          background: p5 ? P5R.ink : 'rgba(124,58,237,0.08)',
          border: p5 ? `2px solid ${P5R.red}` : '1px solid rgba(196,181,253,0.22)',
          color: p5 ? P5R.paper : '#f5e6ff',
          caretColor: p5 ? P5R.red : undefined,
        }}
      />
    );
  }
);
TextInput.displayName = 'LoginTextInput';

const ErrorText = ({ children, p5 = false }: { children: ReactNode; p5?: boolean }) => (
  <motion.p
    initial={{ opacity: 0, y: -4 }}
    animate={{ opacity: 1, y: 0 }}
    className="mt-3 text-xs leading-relaxed whitespace-pre-wrap"
    style={{ color: p5 ? P5R.red : '#fca5a5', fontWeight: p5 ? 800 : undefined }}
  >
    {children}
  </motion.p>
);

const InfoText = ({ children, p5 = false }: { children: ReactNode; p5?: boolean }) => (
  <motion.p
    initial={{ opacity: 0, y: -4 }}
    animate={{ opacity: 1, y: 0 }}
    className="mt-3 text-xs leading-relaxed"
    style={{ color: p5 ? '#23613d' : '#86efac', fontWeight: p5 ? 700 : undefined }}
  >
    {children}
  </motion.p>
);

const PrimaryButton = ({
  loading,
  onClick,
  children,
  p5 = false,
}: {
  loading: boolean;
  onClick: () => void;
  children: ReactNode;
  p5?: boolean;
}) => p5 ? (
  <P5Btn disabled={loading} onClick={onClick} seed={319} rot={-1.2} className="w-full" bodyClassName="text-[14px]">
    {children}
  </P5Btn>
) : (
  <motion.button
    whileHover={{ scale: loading ? 1 : 1.01 }}
    whileTap={{ scale: loading ? 1 : 0.98 }}
    disabled={loading}
    onClick={onClick}
    className="w-full py-3 rounded-lg text-sm font-medium disabled:opacity-60 transition-opacity"
    style={{
      background: 'linear-gradient(135deg, #7c3aed, #6d28d9, #4f46e5)',
      boxShadow: '0 4px 22px rgba(124,58,237,0.38)',
      color: '#fff',
    }}
  >
    {children}
  </motion.button>
);
