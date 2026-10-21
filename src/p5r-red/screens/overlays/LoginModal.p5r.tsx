/**
 * LoginModal 登录弹层（真实 src/components/auth/LoginModal.tsx 的 p5 渲染；视觉 = v3 overlays/a.js openLogin）。
 * 流程：云同步免责闸门（CloudConsentNotice 内嵌，「把数据交给云端之前」）→ 验证码（推荐）/ 密码 两 Tab
 *   → 验证码：输入 UserID 或邮箱 → 发送验证码（发送中…）→ 验证码步（红频道头部 = P5CallingCard 预告函；60s 重寄倒计时；更换邮箱；
 *     核对暗号中… → 0000 / 000000 = 「暗号不正确或已过期」；新邮箱 = 完成登记 · 进入房间）
 *   → 密码：UserID 或邮箱 + 密码 → 进入房间；忘记密码？（未填 → 请先填上邮箱或 UserID；已填 → 重置邮件已发送）
 * 路由参数：?consent=1（先过免责闸门；默认 0 直接到表单）· ?mode=password · ?step=otp|code（otp = 已发验证码的输入步，同 code）
 *   · ?state=error（验证码步预填 0000 并报错）· ?origin=welcome（标题「欢迎归来，客人」）
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Layer, P5XGlyph } from '@/p5r-red/kit/P5Layer';
import { P5Shp } from '@/p5r-red/kit/P5Shp';
import { P5Plate } from '@/p5r-red/kit/P5Plate';
import { P5Button } from '@/p5r-red/kit/P5Button';
import { toast } from '@/p5r-red/kit/P5Toast';
import { P5BgSVG } from '@/p5r-red/fx/bg';
import { useWide } from '@/p5r-red/lib/layout';
import { P5CallingCardSection } from './P5CallingCard.p5r';

export const CLAUSES: [string, string, string][] = [
  ['🕯', '用爱发电，不保证永远在线', '同步服务器由开发者个人自费维护，没有服务等级承诺，也可能因为费用或精力而停运。真要关，会尽力提前公告并留出导出时间。'],
  ['🔒', '不看，不用，不给别人', '你的数据只用于"把这台设备的记录搬到另一台"这一件事。开发者不会翻阅内容，不做分析、不训练模型、不交给第三方。'],
  ['🏠', '有些东西根本不出门', '记账的每一笔、与助手和同伴的聊天原文，只存在你的设备里，永远不上传。愿望清单、助手的记忆默认也留在本地，要不要上云由你在「数据类目选择」里决定。'],
  ['🔑', 'AI 的 API Key 默认只留在本机', 'Key 默认不上传。想换设备不用重填的话，在「数据类目选择」里打开「AI 模型 API」，它才会随设置同步。'],
  ['🧺', '重要的东西请自己也存一份', '云端是方便，不是保险箱。随时可以关闭同步并一键删除云端数据；也建议偶尔用「数据与备份」导出一份放在自己手里。'],
];
const P5txt = (e: string) => (e === '验证码不正确或已过期' ? '暗号不正确或已过期。请检查邮件，或重新领取。' : e);
const Pinfo = (i: string) => (i === '验证码已发送' ? '预告函已送达，请查收邮箱。' : i === '已重新发送' ? '新的预告函已寄出，请使用最新暗号。' : i);

export default function LoginModal({ open, onClose, params }: OverlayProps) {
  const q = params ?? new URLSearchParams();
  const wide = useWide();
  const startCode = q.get('step') === 'code' || q.get('step') === 'otp';
  const err0 = q.get('state') === 'error';
  const [consent, setConsent] = useState(q.get('consent') !== '1');
  const [mode, setMode] = useState<'otp' | 'password'>(q.get('mode') === 'password' ? 'password' : 'otp');
  const [step, setStep] = useState<'input' | 'code'>(startCode ? 'code' : 'input');
  const [id, setId] = useState(startCode ? 'alice@velvet.room' : '');
  const [pw, setPw] = useState('');
  const [code, setCode] = useState(err0 ? '0000' : '');
  const [err, setErr] = useState(err0 ? '验证码不正确或已过期' : '');
  const [info, setInfo] = useState(startCode && !err0 ? '验证码已发送' : '');
  const [loading, setLoading] = useState(false);
  const [cd, setCd] = useState(startCode ? 60 : 0);
  const [signup, setSignup] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => { if (cd <= 0) return; const t = setTimeout(() => setCd(cd - 1), 1000); return () => clearTimeout(t); }, [cd]);
  const codeStep = consent && mode === 'otp' && step === 'code';
  useLayoutEffect(() => { if (scroll.current) scroll.current.scrollTop = 0; }, [consent, mode, step]);

  const busy = (fn: () => void, ms = 650) => { setLoading(true); setTimeout(() => { setLoading(false); fn(); }, ms); };
  const send = () => { setErr(''); setInfo(''); if (!id.trim()) { setErr('请输入 UserID 或邮箱'); return; } busy(() => { setStep('code'); setSignup(!id.includes('alice')); setInfo('验证码已发送'); setCd(60); }); };
  const verify = () => {
    setErr(''); if (code.trim().length < 4) { setErr('请输入完整的验证码'); return; }
    busy(() => { if (code === '0000' || code === '000000') { setErr('验证码不正确或已过期'); setInfo(''); return; } setInfo(signup ? '登记完成 · 接下来完成房间初始化' : ''); setTimeout(() => { onClose(); toast('已登录 · 正在同步'); }, 500); });
  };
  const pwLogin = () => { setErr(''); if (!id.trim()) { setErr('请输入 UserID 或邮箱'); return; } if (!pw) { setErr('请输入密码'); return; } busy(() => { onClose(); toast('已登录'); }); };
  const msg = (c: boolean) => <>{err && <p className="oa-err" role="alert">{c ? P5txt(err) : err}</p>}{info && <p className="oa-info" role="status">{c ? Pinfo(info) : info}</p>}</>;
  const tabs = (
    <div className="oa-tabs" role="tablist">
      {([['otp', '验证码'], ['password', '密码']] as const).map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => { setMode(k); setErr(''); setInfo(''); }}>{l}{k === 'otp' ? <small> · 推荐</small> : null}</button>)}
    </div>
  );
  const enter = (fn: () => void) => (e: React.KeyboardEvent) => { if (e.key === 'Enter') fn(); };

  let body;
  if (!consent) body = (
    <div className="oa-consent">
      {CLAUSES.map(([i, t, b], k) => <div key={t} className="oa-cl" style={{ ['--r' as string]: `${k % 2 ? 0.6 : -0.6}deg` }}><span className="oa-cl-i">{i}</span><div><b>{t}</b><p>{b}</p></div></div>)}
      <div className="oa-row"><P5Button tone="paper" seed={41} onClick={onClose}>先不用云同步</P5Button><P5Button seed={43} onClick={() => setConsent(true)}>我明白了，继续</P5Button></div>
      <p className="oa-fine">不同意也能照常使用，只是数据只留在这台设备上</p>
    </div>
  );
  else body = (
    <>
      {mode === 'otp' && step === 'input' && (
        <>{tabs}<label className="fld"><span>UserID 或邮箱</span><input className="inp" autoComplete="username email" placeholder="alice_in_velvet 或 your@email.com" value={id} onChange={(e) => setId(e.target.value.toLowerCase())} onKeyDown={enter(send)} /></label>
          <p className="oa-fine l">新客人直接填邮箱——第一次验证就相当于登记。</p>{msg(false)}
          <div className="oa-lg-cta"><P5Button seed={45} size="lg" disabled={loading} onClick={send}>{loading ? '发送中…' : '发送验证码'}</P5Button></div></>
      )}
      {mode === 'otp' && step === 'code' && (
        <>{tabs}<div className="oa-code-to"><p>验证码已发送至</p><b>{id}</b></div>
          <label className="oa-code-l" htmlFor="oa-code">潜入暗号 · 邮箱验证码</label>
          <input id="oa-code" className="inp oa-code" inputMode="numeric" maxLength={8} placeholder="······" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))} onKeyDown={enter(verify)} />
          <p className="oa-fine l">此暗号仅用于本次登录，请勿转发；若不是你申请，可忽略邮件。</p>{msg(true)}
          <div className="oa-lg-cta"><P5Button seed={47} size="lg" disabled={loading} onClick={verify}>{loading ? '正在核对暗号…' : signup ? '完成登记 · 进入房间' : '揭下面具 · 进入房间'}</P5Button></div>
          <div className="oa-lg-two"><button type="button" className="oa-link" onClick={() => { setStep('input'); setErr(''); setInfo(''); setSignup(false); }}>更换邮箱</button>
            <button type="button" className="oa-link red" disabled={cd > 0} onClick={() => { setCode(''); setErr(''); setInfo(signup ? '新客人登记验证码已重发' : '已重新发送'); setCd(60); }}>{cd > 0 ? `重寄 (${cd}s)` : '重寄预告函'}</button></div></>
      )}
      {mode === 'password' && (
        <>{tabs}<label className="fld"><span>UserID 或邮箱</span><input className="inp" autoComplete="username email" placeholder="alice_in_velvet 或 your@email.com" value={id} onChange={(e) => setId(e.target.value.toLowerCase())} onKeyDown={enter(pwLogin)} /></label>
          <label className="fld"><span>密码</span><input className="inp" type="password" autoComplete="current-password" placeholder="•••••••••" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={enter(pwLogin)} /></label>{msg(false)}
          <div className="oa-lg-cta"><P5Button seed={49} size="lg" disabled={loading} onClick={pwLogin}>{loading ? '登录中…' : '进入房间'}</P5Button></div>
          <div className="oa-lg-forgot"><button type="button" className="oa-link" onClick={() => { if (!id.trim()) { setErr('请先填上邮箱或 UserID'); setInfo(''); return; } setErr(''); setInfo('重置邮件已发送，请查收'); }}>忘记密码？</button></div></>
      )}
      <p className="oa-fine sep">新客人也可以直接填邮箱，第一次验证就等于登记</p>
      <div className="oa-lg-later"><button type="button" className="oa-link" onClick={onClose}>稍后再说</button></div>
    </>
  );
  return (
    <P5Layer open={open} onClose={onClose} cls="oa-login" z={870} ariaLabel="登录">
      <div className="oa-stage dim"><P5BgSVG seed={64} wide={wide} /></div>
      <div className="oa-login-scroll" ref={scroll} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="oa-login-box">
          <P5Shp kind="quad" seed={93} tone="paper" jag={7} className={`oa-lg-card${codeStep ? ' code' : ''}`} role="dialog" aria-modal="true">
            {codeStep ? <P5CallingCardSection key={step} /> : (
              <div className="oa-lg-hd"><span className="oa-lg-k">MASKARIA</span><P5Plate fs={22}>{!consent ? '把数据交给云端之前' : q.get('origin') === 'welcome' ? '欢迎归来，客人' : '登录MASKARIA'}</P5Plate><p>{!consent ? '几句实话，读完再决定' : '验证码最省心——没登记过的邮箱也能直接进'}</p></div>
            )}
            <i className="oa-lg-rule" /><div className="oa-lg-body">{body}</div>
            <div className="oa-lg-foot">{codeStep ? '—— MASKARIA，参上！ ——' : '—— MASKARIA ——'}</div>
            <button type="button" className="oa-lg-x" aria-label="关闭" onClick={onClose}><P5XGlyph s={16} c="var(--p5r-paper)" /></button>
          </P5Shp>
        </div>
      </div>
    </P5Layer>
  );
}
