/**
 * 重置密码独立页（真实 src/pages/ResetPasswordPage.tsx，main.tsx 路由 /reset-password，无外壳 → chromeless）。
 * P3R：MASKARIA 句点大标 + 斜切白卡（墨色标题条 RESET PASSWORD / 珊瑚条 SIGNAL LOST / 玫红条 CLEAR）。
 * 新密码（至少 8 位，显示/隐藏）、确认密码（再输一遍）、确认修改（正在修改…）、说明；成功「密码已更新」「新密码已生效…」「回到主站登录」；
 * 错误态 链接已失效 / 账号不存在 / 网络连接失败 / 修改失败 / 云同步未启用 / 链接无效 +「回到主站」。
 * 路由：?state=success|submitting|expired|notfound|network|failed|disabled|invalid
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PageProps } from '@pink/registry/types';
import { P3Button, P3Input, P3Field, P3R, slantClip, tickClip, GhostWords } from '@pink/kit';
import { PeriodMark } from '@pink/fx';
import { useBoldness } from '@pink/lib/prefs';

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
  const anim = useBoldness();
  const init = params.get('state') ?? 'form';
  const [phase, setPhase] = useState<'form' | 'submitting' | 'success' | 'fatal'>(init === 'success' ? 'success' : init === 'submitting' ? 'submitting' : FATAL[init] ? 'fatal' : 'form');
  const fatalKey = FATAL[init] ? init : 'expired';
  const [pwd, setPwd] = useState(init === 'submitting' ? 'velvet-room-01' : '');
  const [pwd2, setPwd2] = useState(init === 'submitting' ? 'velvet-room-01' : '');
  const [show, setShow] = useState(false);
  const [formError, setFormError] = useState('');
  const fatal = FATAL[fatalKey];
  const submit = () => {
    setFormError('');
    if (pwd.length < MIN_LEN) { setFormError(`密码至少 ${MIN_LEN} 位`); return; }
    if (pwd !== pwd2) { setFormError('两次输入的密码不一致'); return; }
    setPhase('submitting');
    window.setTimeout(() => setPhase('success'), 1100);
  };
  const title = phase === 'success' ? '密码已更新' : phase === 'fatal' ? fatal.title : '重置密码';
  const bar = phase === 'fatal' ? P3R.magenta : phase === 'success' ? P3R.blue : P3R.ink;
  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-10">
      <GhostWords words={['RESET', 'PASSWORD']} className="-right-6 top-10 text-[clamp(70px,20vw,150px)]" />
      <main aria-label="重置密码" className="relative mx-auto flex w-full max-w-[440px] flex-col items-center">
        <div className="mb-6 flex items-end gap-1"><span className="font-cond text-[clamp(30px,9vw,40px)] leading-none" style={{ color: P3R.ink }}>MASKARIA</span><PeriodMark size={0.42} /></div>
        <AnimatePresence mode="wait">
          <motion.div key={phase === 'submitting' ? 'form' : phase} className="relative w-full" initial={anim ? { opacity: 0, scale: 0.92, x: -14, y: 14 } : { opacity: 0 }} animate={{ opacity: 1, scale: 1, x: 0, y: 0 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
            <span aria-hidden className="absolute inset-0 translate-x-[8px] translate-y-[8px]" style={{ background: phase === 'fatal' ? 'rgb(var(--p3r-magenta-rgb) / 0.45)' : 'var(--p3r-slab-back)', clipPath: slantClip(18) }} />
            <div className="relative overflow-hidden" style={{ background: P3R.panel, clipPath: slantClip(18) }}>
              <div className="px-7 py-3" style={{ background: bar }}>
                <div className="font-cond text-[11px] tracking-[0.3em]" style={{ color: phase === 'form' || phase === 'submitting' ? P3R.blue : '#fff', opacity: 0.9 }}>{phase === 'fatal' ? 'SIGNAL LOST' : phase === 'success' ? 'CLEAR' : 'RESET PASSWORD'}</div>
                <h1 className="font-heavy text-[24px] leading-tight" style={{ color: phase === 'success' ? P3R.onBlue : phase === 'fatal' ? '#fff' : 'var(--p3r-on-ink)' }}>{title}</h1>
              </div>
              <div className="px-7 pb-7 pt-5">
                {phase === 'fatal' ? (
                  <>
                    <p className="text-[14px] leading-relaxed" style={{ color: P3R.ink }}>{fatal.detail}</p>
                    <P3Button block size="lg" tone="ink" className="mt-5" onClick={() => { window.location.hash = '#/'; }}>回到主站</P3Button>
                  </>
                ) : phase === 'success' ? (
                  <>
                    <p className="text-[14px] leading-relaxed" style={{ color: P3R.ink }}>新密码已生效。你现在可以回到应用，用这个密码登录了。</p>
                    <P3Button block size="lg" corner className="mt-5" onClick={() => { window.location.hash = '#/overlay/account-login?mode=password'; }}>回到主站登录</P3Button>
                  </>
                ) : (
                  <div className="flex flex-col gap-4">
                    <P3Field label="新密码" hint={`至少 ${MIN_LEN} 位`}>
                      <span className="relative flex items-center">
                        <P3Input type={show ? 'text' : 'password'} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder={`至少 ${MIN_LEN} 位`} autoComplete="new-password" autoFocus style={{ paddingRight: 64 }} />
                        <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 px-2.5 py-1 text-[11px] font-black" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(4) }}>{show ? '隐藏' : '显示'}</button>
                      </span>
                    </P3Field>
                    <P3Field label="确认密码" error={formError || undefined}>
                      <P3Input type={show ? 'text' : 'password'} value={pwd2} invalid={!!formError} onChange={(e) => setPwd2(e.target.value)} placeholder="再输一遍" autoComplete="new-password" onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
                    </P3Field>
                    <P3Button block size="lg" corner onClick={submit} busy={phase === 'submitting'} busyText="正在修改…">确认修改</P3Button>
                    <p className="text-[12px] leading-relaxed" style={{ color: P3R.grey }}>提交后立即生效。如果你没有申请过重置密码，可以直接关闭此页面 —— 旧密码不会被改动。</p>
                  </div>
                )}
              </div>
            </div>
            <span aria-hidden className="absolute bottom-[4px] right-6 h-[8px] w-[20px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
