/**
 * 首次打开引导 WelcomeModal（真实 src/components/WelcomeModal.tsx；视觉 / 文案 / 状态机逐字迁移自 v3 overlays/a.js §3 openWelcome）。
 * 8 屏：welcome 面具庭园 → name 你叫什么名字 → preset 选择成长风格（自定义时就地填 5 个名，跳过 customize）→ customize 逐个改属性名
 *       → done 五项属性已就位 → guide 七件事 → blessing 馆长的赐福（建档；失败「建档没能完成：」+ 再试一次）；旁支 import 我已经是客人了。
 *   ?step=welcome|name|preset|customize|done|guide|blessing|import   直达（后续步骤预填 demo 数据：野鸡 / 学习成长）
 *   ?state=error（blessing：建档失败态）  ?variant=fin（blessing：已选赐福并自动播收尾演出 = fx-welcome-blessing）
 * 换屏：pane translateX(±70) skewX + 淡入 .34s；ransom 字砖砸落；选项 panelIn。Enter 下一步；Esc 返回。
 * 收尾演出（赐福）：从按下点扩开红幕 → 多环巨星旋入 → MASKARIA 巨词横穿 → 欢迎吐司。
 *   P0-14：v3 用 clip-path circle 扩散，这里改为圆形元素 scale 0→1 + 舞台 opacity 淡入（只动 transform / opacity）。
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Layer, P5OaStar, P5OaRingStar } from '@/p5r-red/kit/P5Layer';
import { P5Shp } from '@/p5r-red/kit/P5Shp';
import { P5Button } from '@/p5r-red/kit/P5Button';
import { P5Plate } from '@/p5r-red/kit/P5Plate';
import { P5Ransom } from '@/p5r-red/kit/P5Ransom';
import { toast } from '@/p5r-red/kit/P5Toast';
import { P5BgSVG } from '@/p5r-red/fx/bg';
import { P5Sil } from '@/p5r-red/fx/sil';
import { sfx } from '@/p5r-red/fx/sfx';
import { panelIn } from '@/p5r-red/fx/motion';
import { useWide } from '@/p5r-red/lib/layout';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import { openOverlay } from '@/p5r-red/shell/shellBus';
import { slam } from './cutins.p5r';
import './WelcomeModal.p5r.css';

type Step = 'welcome' | 'name' | 'preset' | 'customize' | 'done' | 'guide' | 'blessing' | 'import';
const PRESETS = [
  { label: '学习成长', desc: '看重知识积累，也照顾综合成长 · 知识 胆量 灵巧 温柔 魅力', names: ['知识', '胆量', '灵巧', '温柔', '魅力'] },
  { label: '冒险勇士', desc: '喜欢挑战，认行动不认空想 · 智慧 勇气 敏捷 仁慈 威望', names: ['智慧', '勇气', '敏捷', '仁慈', '威望'] },
  { label: '自定义', desc: '从空白开始，五个名字都由你定', custom: true, names: ['', '', '', '', ''] },
];
const ATTR_PH = ['如：知识、智慧、学识…', '如：胆量、勇气、意志…', '如：灵巧、敏捷、技艺…', '如：温柔、仁慈、共情…', '如：魅力、威望、气质…'];
const SEVEN: [string, string][] = [['记录今天', '一句话就够。它会进你的时间线。'], ['任务', '设目标、拆步骤，完成时给属性加点。'], ['记账', '收支与人格指数同屏，钱和成长一起看。'], ['同伴', '每张牌是一位同伴，亲密度随记录上涨。'], ['属性', '五项指数由你的行为自然长出来。'], ['影时间', '深夜的那一格，留给只有你能打的仗。'], ['主题', '四套频道皮肤：红 / 黄 / 蓝 / 粉，随时换。']];
const STEPS: Step[] = ['welcome', 'name', 'preset', 'customize', 'done', 'guide', 'blessing'];
const MOON = ['新月', '娥眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月'];
const moonPhase = (now: Date) => { const d = Math.floor((+now - +new Date(now.getFullYear(), 0, 1)) / 864e5); return ((((d - 5) % 29.53) + 29.53) % 29.53) / 29.53; };
const moonPath = (p: number) => { const r = 40; if (p <= 0.02 || p >= 0.98) return ''; const lit = p <= 0.5, k = lit ? p * 2 : (1 - p) * 2, rx = Math.abs(1 - 2 * k) * r, sw = (lit ? p < 0.25 : p > 0.75) ? 1 : 0; return `M 50 10 A 40 40 0 0 1 50 90 A ${rx.toFixed(2)} 40 0 0 ${sw} 50 10 Z`; };

function Status() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  const p = moonPhase(now), h = now.getHours(), inShadow = h === 0;
  return (
    <div className="oa-wel-status">
      <span className="oa-moon"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="7" opacity=".5" /><path d={moonPath(p)} fill="currentColor" /></svg><b>{MOON[Math.round(p * 8) % 8]} · {Math.round(p * 100)}%</b></span>
      <span>{String(h).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}</span>
      <span className={inShadow ? 'on' : ''}>影时间 · {inShadow ? '进行中' : '今夜降临'}</span>
    </div>
  );
}

export default function WelcomeModal({ open, onClose, params }: OverlayProps) {
  const wide = useWide();
  const step0 = (params?.get('step') as Step) || 'welcome';
  const deep = STEPS.indexOf(step0) > 1;
  const fin0 = params?.get('variant') === 'fin';
  const [step, setStep] = useState<Step>(step0);
  const [dir, setDir] = useState(1);
  const [name, setName] = useState(deep || fin0 ? '野鸡' : '');
  const [preset, setPreset] = useState<number | null>(deep || fin0 ? 0 : null);
  const [attrs, setAttrs] = useState<string[]>(deep || fin0 ? PRESETS[0].names.slice() : ['', '', '', '', '']);
  const [bless, setBless] = useState<number | null>(fin0 ? 0 : null);
  const [json, setJson] = useState('');
  const [err, setErr] = useState<string | null>(params?.get('state') === 'error' && step0 === 'blessing' ? '本地数据库写入失败（demo）' : null);
  const [submitting, setSubmitting] = useState(false);
  const [demoErr, setDemoErr] = useState(false);
  const [fin, setFin] = useState<{ x: number; y: number } | null>(null);
  const pane = useRef<HTMLDivElement>(null);
  const finRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const custom = preset === 2;
  const can = { name: name.trim().length > 0, preset: preset !== null && (!custom || attrs.every((a) => a.trim())), customize: attrs.every((a) => a.trim()) };

  useEffect(() => { if (fin0 && open) { const t = setTimeout(() => finish(), 700); return () => clearTimeout(t); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const p = pane.current; if (!p) return;
    if (!isLowMotion() && dir !== 0) {
      p.animate([{ transform: `translateX(${dir * 70}px) skewX(${-dir * 6}deg)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 340, easing: 'cubic-bezier(.2,.9,.2,1)', fill: 'backwards' });
      slam(p.querySelectorAll('.ransom img'), 60);
      panelIn(p.querySelectorAll('.oa-wel-pb,.oa-wel-attrs label,.oa-wel-seven li,.oa-wel-lvc,.oa-wel-bl button'), { stagger: 0.035, delay: 0.12 });
    }
    p.querySelector<HTMLInputElement>('#oa-gn')?.focus();
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (s: Step, d = 1) => { setDir(d); setStep(s); setErr(null); sfx('nav', 0.4); };
  const next = (x?: number, y?: number) => {
    if (step === 'welcome') go('name');
    else if (step === 'name' && can.name) go('preset');
    else if (step === 'preset' && can.preset) go(custom ? 'done' : 'customize');
    else if (step === 'customize' && can.customize) go('done');
    else if (step === 'done') go('guide');
    else if (step === 'guide') go('blessing');
    else if (step === 'blessing' && bless !== null && !submitting) finish(x, y);
    else if (step === 'import' && json.trim()) { toast('正在导入…（demo）'); setTimeout(() => { onClose(); toast('导入完成'); }, 700); }
  };
  const back = () => { const m: Record<Step, Step> = { welcome: 'welcome', name: 'welcome', preset: 'name', customize: 'preset', done: custom ? 'preset' : 'customize', guide: 'done', blessing: 'guide', import: 'welcome' }; if (step === 'import') setJson(''); go(m[step], -1); };
  const finish = (x?: number, y?: number) => {
    if (demoErr) { setSubmitting(true); setTimeout(() => { setSubmitting(false); setErr('本地数据库写入失败（demo）'); setDemoErr(false); }, 600); return; }
    const done = () => { onClose(); toast(`欢迎，${name || '客人'}`); };
    if (isLowMotion()) { setTimeout(done, 400); return; }
    setFin({ x: x ?? innerWidth / 2, y: y ?? innerHeight / 2 });
    sfx('level', 0.5);
    setTimeout(done, 1850);
  };
  useLayoutEffect(() => {
    const v = finRef.current; if (!fin || !v) return;
    const c = v.querySelector<HTMLElement>('.wel5-fin-c')!, bg = v.querySelector<HTMLElement>('.oa-wel-fin-v')!, card = v.querySelector<HTMLElement>('.oa-wel-fin-card')!, w = v.querySelector<HTMLElement>('.oa-wel-fin-w')!;
    c.animate([{ transform: 'translate(-50%,-50%) scale(0)' }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: 760, easing: 'cubic-bezier(.65,0,.2,1)', fill: 'both' });
    bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 420, fill: 'both' });
    card.animate([{ transform: 'scale(.3) rotate(-120deg)', opacity: 0 }, { transform: 'scale(1) rotate(0)', opacity: 1 }], { duration: 700, delay: 200, easing: 'cubic-bezier(.34,1.38,.5,1)', fill: 'both' });
    w.animate([{ transform: 'translate(-42%,-50%)', opacity: 0 }, { transform: 'translate(-4%,-50%)', opacity: 1 }], { duration: 300, delay: 760, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
    const t = setTimeout(() => w.animate([{ transform: 'translate(-4%,-50%)', opacity: 1 }, { transform: 'translate(34%,-50%)', opacity: 0 }], { duration: 300, fill: 'both' }), 1500);
    return () => clearTimeout(t);
  }, [fin]);

  const meta = (n: number) => <span className="oa-wel-meta">{String(n).padStart(2, '0')} / 07</span>;
  const H = (t: string, n?: number) => <div className="oa-wel-h"><P5Plate fs={24}>{t}</P5Plate>{n ? meta(n) : null}</div>;
  const act = (showBack: boolean, label: string, ok = true, tone: 'red' | 'ink' = 'red') => (
    <div className="oa-wel-act">
      {showBack && <P5Button tone="paper" seed={21} onClick={back}>返回</P5Button>}
      <P5Button tone={tone} seed={23} disabled={!ok} aria-disabled={!ok} className={ok ? '' : 'oa-dis'} onClick={(e) => next(e.clientX, e.clientY)}>{label}</P5Button>
    </div>
  );
  const card = (inner: ReactNode, seed = 61) => <P5Shp as="section" className="oa-wel-card" kind="torn" seed={seed} tone="paper">{inner}</P5Shp>;
  const attrInputs = (mini: boolean) => (
    <div className={`oa-wel-attrs${mini ? ' mini' : ''}`}>
      {attrs.map((a, i) => (
        <label key={i}><em>0{i + 1}</em>{!mini && <span className="sr">第 {i + 1} 项属性名称</span>}
          <input className="inp" maxLength={8} placeholder={ATTR_PH[i]} value={a} onChange={(e) => setAttrs((xs) => xs.map((x, k) => (k === i ? e.target.value : x)))} /></label>
      ))}
    </div>
  );

  let body: ReactNode = null;
  if (step === 'welcome') body = <>
    <div className="oa-wel-hero"><P5Ransom text="MASKARIA" h={wide ? 96 : 50} seed={8} /><div className="oa-wel-cn"><span>面具庭园</span><P5OaStar size={30} fill="var(--red)" stroke="#111" sw={6} /></div></div>
    {card(<><p className="oa-wel-p"><b>每一次行动，都化作灵魂成长的印记。</b><br />写下今天做了什么，它会变成你的五项人格指数。记录、任务、记账、同伴，与影时间的战斗，都从这里开始。</p>{act(false, '开始设定')}<button type="button" className="oa-link" onClick={() => go('import')}>我已经是客人了</button></>)}
  </>;
  if (step === 'name') body = card(<>{H('你叫什么名字', 1)}<p className="oa-wel-p">这将是你在面具庭园里的称呼。真名、笔名、代号都行。</p>
    <label className="sr" htmlFor="oa-gn">你的昵称</label><input id="oa-gn" className="inp oa-wel-inp" maxLength={16} placeholder="写下你的称呼" value={name} onChange={(e) => setName(e.target.value)} />
    <p className="oa-wel-hint">按 Enter 直接进入下一步，之后随时能在设置里改。</p>{act(true, '接入', can.name, 'ink')}</>);
  if (step === 'preset') body = card(<>{H('选择成长风格', 2)}<p className="oa-wel-p">它会预置你五项属性的名称。之后在设置里随时能改。</p>
    <div className="oa-wel-pre" role="group" aria-label="成长风格">{PRESETS.map((p, i) => (
      <button key={i} type="button" className={`oa-wel-pb ${preset === i ? 'on' : ''}`} aria-pressed={preset === i} onClick={() => { setDir(0); setPreset(i); setAttrs(i === 2 ? attrs.map((a) => a || '') : PRESETS[i].names.slice()); }}><i aria-hidden="true" /><span><b>{p.label}</b><small>{p.desc}</small></span></button>
    ))}</div>
    {custom && attrInputs(true)}
    {act(true, '记录', can.preset, 'ink')}</>);
  if (step === 'customize') body = card(<><div className="oa-wel-h"><P5Plate fs={24}>逐个改属性名</P5Plate><b className="oa-wel-big">5</b></div><p className="oa-wel-p">下面是预设的名，都能换成你更顺口的说法。两个字最好看。</p>{attrInputs(false)}{act(true, '归档', can.customize)}</>);
  if (step === 'done') body = card(<><div className="oa-wel-h"><P5Plate fs={26}>你好，{name || '客人'}</P5Plate></div><p className="oa-wel-p">五项属性已经就位。所有技能说明与成就文案，会跟着属性名一起变。</p>
    <div className="oa-wel-lv">{attrs.map((a, i) => <div key={i} className="oa-wel-lvc" style={{ ['--r' as string]: `${[-3, 2, -1.5, 2.5, -2][i]}deg` }}><b>1</b><span>{a}</span></div>)}</div>{act(true, '继续')}</>);
  if (step === 'guide') body = card(<><div className="oa-wel-h"><P5Plate fs={22}>七件事，看完就能开始</P5Plate><b className="oa-wel-big">7</b></div><p className="oa-wel-p">{name || '客人'}，七件事，看完就能开始。</p>
    <ol className="oa-wel-seven">{SEVEN.map(([t, d], i) => <li key={i}><em>{String(i + 1).padStart(2, '0')}</em><p><b>{t}</b>{d}</p></li>)}</ol>{act(true, '继续')}</>);
  if (step === 'blessing') body = card(<>{H('馆长的赐福', 7)}<p className="oa-wel-p">既然你踏进了面具庭园，说明不是等闲之辈。初次来访有一份礼遇，挑一项你最擅长的，往后每次加点都额外 +1。</p>
    <div className="oa-wel-bl">{attrs.map((a, i) => <button key={i} type="button" className={`seg-b ${bless === i ? 'on' : ''}`} aria-pressed={bless === i} onClick={() => { setDir(0); setBless(i); }}>{a || '未命名'}</button>)}</div>
    {err && <div className="oa-err" role="alert"><span>建档没能完成：</span>{err}</div>}
    {act(true, submitting ? '正在建档…' : err ? '再试一次' : '接受赐福，开始旅程', bless !== null && !submitting)}
    <button type="button" className="oa-link" onClick={() => { setDemoErr(true); toast('下一次提交会失败'); }}>（demo）模拟建档失败</button></>);
  if (step === 'import') body = card(<>{H('我已经是客人了')}<p className="oa-wel-p">登录云端同步，自动拉取你的所有数据；或用本地备份文件导入。</p>
    <div className="oa-wel-imp">
      <P5Button seed={31} onClick={() => openOverlay('account-login', { origin: 'welcome' })}>登录云端同步</P5Button>
      <textarea className="inp" rows={4} placeholder={'粘贴备份 JSON 文本\n（以 {"user":... 开头）'} value={json} onChange={(e) => { setJson(e.target.value); setErr(null); }} />
      <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; if (!f.name.endsWith('.json') && f.type !== 'application/json') { setErr('请选择 JSON 格式的备份文件'); return; } void f.text().then((t) => setJson(t)); }} />
      <P5Button tone="paper" seed={33} onClick={() => fileRef.current?.click()}>{json ? '✓ 文件已加载' : '选择备份文件（或拖拽至此）'}</P5Button>
      {err && <p className="oa-err" role="alert">{err}</p>}
    </div>
    {act(true, '确认导入', !!json.trim())}</>);

  const no = step === 'import' ? 0 : STEPS.indexOf(step) + 1;
  return (
    <P5Layer open={open} onClose={onClose} cls="oa-wel" z={880} escClose={false} onBackdrop={() => {}}>
      <div style={{ display: 'contents' }}
        onKeyDown={(e) => {
          const t = e.target as HTMLElement;
          if (e.key === 'Enter' && t.tagName !== 'TEXTAREA' && !t.closest('button')) { e.preventDefault(); next(); }
          if (e.key === 'Escape' && step !== 'welcome') { e.stopPropagation(); back(); }
        }}>
        <div className="oa-stage"><P5BgSVG seed={52} wide={wide} fx={wide ? 1200 : 760} fy={240} /></div>
        <div className="oa-wel-sil"><P5Sil name="point" style={{ height: '100%', width: 'auto' }} flip /></div>
        <div className="oa-wel-info"><span className="oa-wel-chip">MASKARIA</span><span className="oa-wel-no">第 {no} 步 · 共 7 步</span></div>
        <div className="oa-wel-view"><div className="oa-wel-pane" key={step} ref={pane}>{body}</div></div>
        <Status />
        {fin && (
          <div className="oa-wel-fin" ref={finRef}>
            <i className="wel5-fin-c" style={{ left: fin.x, top: fin.y }} />
            <i className="oa-wel-fin-v"><P5BgSVG seed={77} wide={wide} /></i>
            <div className="oa-wel-fin-card"><P5OaRingStar size={160} /></div>
            <span className="oa-wel-fin-w">MASKARIA</span>
          </div>
        )}
      </div>
    </P5Layer>
  );
}
