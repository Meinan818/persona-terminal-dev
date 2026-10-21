/**
 * 重置密码独立页（真实 src/pages/ResetPasswordPage.tsx，main.tsx 在 /reset-password 直接渲染：不走 store / 主题，无底栏）—— FIXLIST P1-15。
 * 流程：设新密码（显示 / 隐藏、再输一遍）→ 校验（密码至少 8 位 / 两次输入的密码不一致）→ 正在修改… → 密码已更新（回到主站登录）；
 * 报错页（文案照抄真实）：链接已失效 / 链接无效 / 账号不存在 / 网络连接失败 / 修改失败 / 云同步未启用。
 * 长相 = 红频道登录卡语汇（v3 a.js .oa-lg-card：红放射舞台压暗 + 纸面四角错动壳 + MASKARIA 红字眉 + 标题牌 + 红斜线）。
 * 路由：#/p/reset-password?state=form（默认）| mismatch | short | submitting | success | expired | invalid | notfound | network | failed | disabled
 */
import { useLayoutEffect, useRef, useState } from 'react';
import type { PageProps } from '@/p5r-red/registry/types';
import { P5Shp } from '@/p5r-red/kit/P5Shp';
import { P5Plate } from '@/p5r-red/kit/P5Plate';
import { P5Button } from '@/p5r-red/kit/P5Button';
import { P5Mask } from '@/p5r-red/kit/P5Mask';
import { DevStateBar } from '@/p5r-red/kit/DevStateBar';
import { navigate } from '@/p5r-red/shell/shellBus';
import { spring } from '@/p5r-red/fx/spring';
import { lerp } from '@/p5r-red/lib/rng';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import './ResetPasswordPage.p5r.css';

const MIN_LEN = 8;
const FATAL: Record<string, { title: string; detail: string; showHome: boolean }> = {
  expired: { title: '链接已失效', detail: '这封重置邮件已经过期或被使用过。请回到应用重新申请一次，有效期内完成设置即可。', showHome: true },
  invalid: { title: '链接无效', detail: '这条链接缺少校验令牌。请确认是从完整的重置邮件中点击进来的，或重新申请一次。', showHome: true },
  notfound: { title: '账号不存在', detail: '找不到对应的用户记录。可能账号已被删除，请联系开发者。', showHome: true },
  network: { title: '网络连接失败', detail: '请检查网络后重试。如果一直失败，可能是服务器暂时不可达。', showHome: false },
  failed: { title: '修改失败', detail: '发生了未知错误，请稍后重试。', showHome: false },
  disabled: { title: '云同步未启用', detail: '当前构建没有配置云端地址，重置密码需要云端支持。请联系开发者。', showHome: true },
};
const STATES: [string, string][] = [['form', '设新密码'], ['short', '少于 8 位'], ['mismatch', '两次不一致'], ['submitting', '正在修改'], ['success', '密码已更新'], ['expired', '链接已失效'], ['invalid', '链接无效'], ['notfound', '账号不存在'], ['network', '网络失败'], ['failed', '修改失败'], ['disabled', '云同步未启用']];

export default function ResetPasswordPage({ params }: PageProps) {
  const s0 = params.get('state') ?? 'form';
  const [phase, setPhase] = useState<'form' | 'submitting' | 'success' | 'fatal'>(s0 === 'submitting' ? 'submitting' : s0 === 'success' ? 'success' : FATAL[s0] ? 'fatal' : 'form');
  const [fatal, setFatal] = useState(FATAL[s0] ?? null);
  const [pwd, setPwd] = useState(s0 === 'short' ? 'abc12' : s0 === 'mismatch' || s0 === 'submitting' ? 'maskaria2026' : '');
  const [pwd2, setPwd2] = useState(s0 === 'short' ? 'abc12' : s0 === 'mismatch' ? 'maskaria2025' : s0 === 'submitting' ? 'maskaria2026' : '');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState(s0 === 'short' ? `密码至少 ${MIN_LEN} 位` : s0 === 'mismatch' ? '两次输入的密码不一致' : '');
  const card = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const c = card.current; if (!c || isLowMotion()) return;
    c.style.opacity = '0';
    return spring({ stiffness: 360, damping: 22, onUpdate: (p) => { c.style.opacity = String(Math.min(1, p * 1.8)); c.style.transform = `translateY(${lerp(40, 0, p)}px) rotate(${lerp(-5, -0.6, p)}deg) scale(${lerp(0.9, 1, p)})`; } });
  }, [phase]);
  const submit = () => {
    setErr('');
    if (pwd.length < MIN_LEN) { setErr(`密码至少 ${MIN_LEN} 位`); return; }
    if (pwd !== pwd2) { setErr('两次输入的密码不一致'); return; }
    setPhase('submitting');
    setTimeout(() => { if (pwd === 'fail12345') { setFatal(FATAL.expired); setPhase('fatal'); } else setPhase('success'); }, 1100);
  };
  const goHome = () => navigate('dashboard', { via: 'tear' });
  const title = phase === 'success' ? '密码已更新' : phase === 'fatal' ? (fatal?.title ?? '出错了') : '重置密码';
  return (
    <div className="rp5">
      <div className="rp5-box">
        <P5Shp ref={card} kind="quad" seed={93} tone="paper" jag={7} className="oa-lg-card rp5-card" role="main" aria-label="重置密码">
          <div className="oa-lg-hd">
            <span className="rp5-ic" aria-hidden="true"><P5Mask w={70} tone={phase === 'fatal' ? 'white' : 'red'} /></span>
            <span className="oa-lg-k">MASKARIA</span>
            <P5Plate fs={22}>{title}</P5Plate>
            <p>MASKARIA · MASKARIA</p>
          </div>
          <i className="oa-lg-rule" />
          <div className="oa-lg-body">
            {phase === 'fatal' && fatal && (
              <div className="rp5-col"><p className="rp5-p">{fatal.detail}</p>{fatal.showHome && <div className="oa-lg-cta"><P5Button seed={47} size="lg" onClick={goHome}>回到主站</P5Button></div>}</div>
            )}
            {phase === 'success' && (
              <div className="rp5-col"><p className="rp5-p">新密码已生效。你现在可以回到应用，用这个密码登录了。</p><div className="oa-lg-cta"><P5Button tone="ink" seed={49} size="lg" onClick={goHome}>回到主站登录</P5Button></div></div>
            )}
            {(phase === 'form' || phase === 'submitting') && (
              <form className="rp5-col" onSubmit={(e) => { e.preventDefault(); submit(); }}>
                <label className="fld"><span>新密码</span>
                  <span className="rp5-pw"><input className="inp" type={show ? 'text' : 'password'} autoComplete="new-password" placeholder={`至少 ${MIN_LEN} 位`} value={pwd} disabled={phase === 'submitting'} onChange={(e) => setPwd(e.target.value)} />
                    <button type="button" className="rp5-eye" aria-label={show ? '隐藏密码' : '显示密码'} onClick={() => setShow(!show)}>{show ? '隐藏' : '显示'}</button></span></label>
                <label className="fld"><span>确认密码</span><input className="inp" type={show ? 'text' : 'password'} autoComplete="new-password" placeholder="再输一遍" value={pwd2} disabled={phase === 'submitting'} onChange={(e) => setPwd2(e.target.value)} /></label>
                {err && <p className="oa-err" role="alert">{err}</p>}
                <div className="oa-lg-cta"><P5Button type="submit" seed={45} size="lg" disabled={phase === 'submitting' || !pwd || !pwd2}>{phase === 'submitting' ? '正在修改…' : '确认修改'}</P5Button></div>
                <p className="oa-fine">提交后立即生效。如果你没有申请过重置密码，可以直接关闭此页面 —— 旧密码不会被改动。</p>
              </form>
            )}
          </div>
          <div className="oa-lg-foot">—— MASKARIA ——</div>
        </P5Shp>
      </div>
      <DevStateBar page="reset-password" items={STATES.map(([k, l]) => ({ label: l, q: k === 'form' ? '' : `state=${k}` }))} />
    </div>
  );
}
