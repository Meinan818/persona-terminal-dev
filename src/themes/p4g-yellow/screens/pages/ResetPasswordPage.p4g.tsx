/**
 * 重置密码独立页（真实 src/pages/ResetPasswordPage.tsx，main.tsx 路由 /reset-password，无外壳）。
 * 电视画面弹出的卡片：标题「重置密码 / 密码已更新 / <错误标题>」；新密码（至少 8 位，显示/隐藏）、确认密码（再输一遍）、确认修改（正在修改…）、说明；
 * 成功「新密码已生效…」+「回到主站登录」；错误态 链接已失效 / 账号不存在 / 网络连接失败 / 修改失败 / 云同步未启用 / 链接无效 +「回到主站」。
 * ?state=success|expired|notfound|network|failed|disabled|invalid（页面底部也可切换）
 */
import { useState } from 'react';
import type { PageProps } from '@yellow/registry/types';
import { P4Button, P4Input, P4Outline } from '@yellow/kit';
import { TVPowerOn, FogRain, ScanlineOverlay } from '@yellow/fx';
import { DevStateBar } from '@yellow/screens/pkg5/ui';

const MIN_LEN = 8;
const FATAL: Record<string, { title: string; detail: string }> = {
  expired: { title: '链接已失效', detail: '这封重置邮件已经过期或被使用过。请回到应用重新申请一次，有效期内完成设置即可。' },
  notfound: { title: '账号不存在', detail: '找不到对应的用户记录。可能账号已被删除，请联系开发者。' },
  network: { title: '网络连接失败', detail: '请检查网络后重试。如果一直失败，可能是服务器暂时不可达。' },
  failed: { title: '修改失败', detail: '发生了未知错误，请稍后重试。' },
  disabled: { title: '云同步未启用', detail: '当前构建没有配置云端地址，重置密码需要云端支持。请联系开发者。' },
  invalid: { title: '链接无效', detail: '这条链接缺少校验令牌。请确认是从完整的重置邮件中点击进来的，或重新申请一次。' },
};

export default function ResetPasswordPage({ params }: PageProps) {
  const init = params.get('state') ?? 'form';
  const [phase, setPhase] = useState<'form' | 'submitting' | 'success' | 'fatal'>(init === 'success' ? 'success' : FATAL[init] ? 'fatal' : 'form');
  const [fatalKey, setFatalKey] = useState(FATAL[init] ? init : 'expired');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [show, setShow] = useState(false);
  const [formError, setFormError] = useState('');
  const fatal = FATAL[fatalKey];
  const submit = () => {
    setFormError('');
    if (pwd.length < MIN_LEN) { setFormError(`密码至少 ${MIN_LEN} 位`); return; }
    if (pwd !== pwd2) { setFormError('两次输入的密码不一致'); return; }
    setPhase('submitting');
    window.setTimeout(() => setPhase('success'), 1000);
  };
  const setDemo = (id: string) => { if (id === 'form') setPhase('form'); else if (id === 'success') setPhase('success'); else { setFatalKey(id); setPhase('fatal'); } };
  const title = phase === 'success' ? '密码已更新' : phase === 'fatal' ? fatal?.title ?? '出错了' : '重置密码';

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-10">
      <ScanlineOverlay />
      <FogRain fog rain={phase === 'fatal'} intensity={0.7} />
      <main aria-label="重置密码" className="relative mx-auto flex w-full max-w-[440px] flex-col items-center">
        <P4Outline size="clamp(22px,6vw,28px)" stroke={4} italic className="mb-5">MASKARIA</P4Outline>
        <TVPowerOn key={phase} className="w-full">
          <div className="relative w-full">
            <div aria-hidden className="absolute inset-0 translate-x-[10px] translate-y-[10px] rounded-sm bg-[color:var(--p4g-msg-plate-2)]" />
            <div aria-hidden className="absolute inset-0 translate-x-[5px] translate-y-[5px] rounded-sm bg-[color:var(--p4g-msg-plate)]" />
            <div className="relative overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-surface-2 text-p4g-ink night:border-p4g-yellow">
              <div aria-hidden className="h-3 p4g-candy-h" />
              <div className={phase === 'fatal' ? 'bg-p4g-red px-5 py-3 text-white' : phase === 'success' ? 'bg-p4g-green px-5 py-3 text-p4g-black' : 'bg-p4g-black px-5 py-3 text-p4g-yellow'}>
                <div className="font-display text-2xs font-bold tracking-[0.3em] opacity-80">{phase === 'fatal' ? 'SIGNAL LOST' : phase === 'success' ? 'CLEAR' : 'RESET PASSWORD'}</div>
                <h1 className="font-display text-h2 font-bold">{title}</h1>
              </div>
              <div className="p-5">
                {phase === 'fatal' ? (
                  <>
                    <p className="text-body leading-relaxed text-p4g-ink">{fatal.detail}</p>
                    <P4Button block size="lg" variant="black" className="mt-5" onClick={() => { window.location.hash = '#/'; }}>回到主站</P4Button>
                  </>
                ) : phase === 'success' ? (
                  <>
                    <p className="text-body leading-relaxed text-p4g-ink">新密码已生效。你现在可以回到应用，用这个密码登录了。</p>
                    <P4Button block size="lg" className="mt-5" onClick={() => { window.location.hash = '#/overlay/account-login?mode=password'; }}>回到主站登录</P4Button>
                  </>
                ) : (
                  <div className="flex flex-col gap-4">
                    <P4Input label="新密码" type={show ? 'text' : 'password'} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder={`至少 ${MIN_LEN} 位`} autoComplete="new-password" autoFocus
                      suffix={<button type="button" onClick={() => setShow((s) => !s)} className="rounded-xs bg-p4g-black px-2 py-1 font-display text-2xs font-bold text-p4g-yellow">{show ? '隐藏' : '显示'}</button>} />
                    <P4Input label="确认密码" type={show ? 'text' : 'password'} value={pwd2} onChange={(e) => setPwd2(e.target.value)} placeholder="再输一遍" autoComplete="new-password" onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} error={formError || undefined} />
                    <P4Button block size="lg" onClick={submit} disabled={phase === 'submitting'}>{phase === 'submitting' ? '正在修改…' : '确认修改'}</P4Button>
                    <p className="text-meta leading-relaxed text-p4g-ink-soft">提交后立即生效。如果你没有申请过重置密码，可以直接关闭此页面 —— 旧密码不会被改动。</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TVPowerOn>
        <div className="w-full"><DevStateBar value={phase === 'fatal' ? fatalKey : phase === 'success' ? 'success' : 'form'} onChange={setDemo} items={[{ id: 'form', label: '表单' }, { id: 'success', label: '成功' }, ...Object.entries(FATAL).map(([id, f]) => ({ id, label: f.title }))]} /></div>
      </main>
    </div>
  );
}
