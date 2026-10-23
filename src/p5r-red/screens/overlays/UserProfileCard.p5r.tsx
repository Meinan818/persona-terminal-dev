/**
 * 用户资料抽屉（真实 src/pages/Menu.tsx profileSheetOpen → SheetModal「用户资料」+ src/components/UserProfileCard.tsx
 * + src/components/profile/ProfilePresenceEditor.tsx + UserProfileCard 内第二套 ImageCropModal）。
 * 视觉 / 文案迁移自 v3 overlays/b.js（profileHTML / openPresence / openCrop，.ob-* 类，legacy/css/b.css）。
 *   ?state=hasav（常态）| avatar（头像菜单展开）| name（改昵称）| err（上传失败「请选择图片文件」）| noav（无头像：首字）
 *   ?panel=status  直接叠开「名片 · 状态 / 目标」（ProfilePresenceEditor）；?pstate=status|set|goal|goalerr|nocard|audit|missing|empty
 *   ?step=crop     直接叠开头像裁切（ImageCropModal：拖动定位 + 缩放 100–300%）
 * 交互：头像 → 头像菜单（更换头像 → 裁切 / 移除头像 / 取消）；✎ → 改名（保存 / 取消）；@UserID 点击复制；＋状态 / ＋目标 → 名片编辑；总点数折叠展开五维条。
 * DEMO 状态条为 v3 演示件（?__dev=0 隐藏）。
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Sheet } from '@/p5r-red/kit/P5Sheet';
import { P5Shp } from '@/p5r-red/kit/P5Shp';
import { P5Button } from '@/p5r-red/kit/P5Button';
import { P5Tag } from '@/p5r-red/kit/P5Tag';
import { P5StarIcon } from '@/p5r-red/kit/P5StarIcon';
import { Portal } from '@/p5r-red/kit/Portal';
import { toast } from '@/p5r-red/kit/P5Toast';
import { P5Sil } from '@/p5r-red/fx/sil';
import { panelIn } from '@/p5r-red/fx/motion';
import { isLowMotion, usePrefs } from '@/p5r-red/lib/prefs';
import { useAccountIdentity } from '@/themes/accountAuth';
import { ATTR, ATTR_ORDER, D } from '@/p5r-red/mock/data';

type PSt = 'hasav' | 'avatar' | 'name' | 'err' | 'noav';
type PrSt = 'status' | 'set' | 'goal' | 'goalerr' | 'nocard' | 'audit' | 'missing' | 'empty';
const P_STATES: [PSt, string][] = [['hasav', '常态'], ['avatar', '头像菜单'], ['name', '改昵称'], ['err', '上传失败'], ['noav', '无头像']];
const PR_STATES: [PrSt, string][] = [['status', '挑状态'], ['set', '已设状态'], ['goal', '挂目标'], ['goalerr', '审核不过'], ['nocard', '没有宣告卡'], ['audit', '措辞提示'], ['missing', '卡不在本机'], ['empty', '空']];
const STATUS: [string, string, string][] = [['focus', '🎯', '专注中'], ['study', '📘', '在学习'], ['work', '💼', '加班中'], ['sprint', '⚡', '冲刺冲'], ['create', '🎨', '在创作'], ['read', '📖', '在读书'], ['run', '🏃', '别急'], ['travel', '🧭', '在路上'], ['cook', '🍳', '在做饭'], ['music', '🎧', '听歌中'], ['game', '🎮', '打游戏'], ['movie', '🎬', '看番'], ['coffee', '☕', '摸鱼中'], ['happy', '✨', '元气满满'], ['calm', '🌙', '想静静'], ['heal', '🌿', '慢慢来'], ['lowbat', '🔋', '电量不足'], ['rest', '🛌', '休息中'], ['sleepy', '😴', '似了']];
const CARDS: [string, number][] = [['期末绩点 3.8', 62], ['半马完赛', 35], ['读完 24 本书', 50]];

function DemoBar<T extends string>({ states, cur, onPick }: { states: [T, string][]; cur: T; onPick: (k: T) => void }) {
  if (usePrefs().devHidden) return null;
  return <div className="ob-demo" role="tablist" aria-label="演示状态"><span>DEMO 状态</span>{states.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={k === cur} onClick={() => onPick(k)}>{l}</button>)}</div>;
}
const Msg = ({ kind, children }: { kind: 'err' | 'warn'; children: ReactNode }) => <p className={`ob-msg ${kind}`} role={kind === 'err' ? 'alert' : 'status'}>{children}</p>;
/** 动画重绘：状态切换后子元素从右侧交错入场（v3 obSheet paint(true)） */
function usePaint(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null), first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } if (ref.current && !isLowMotion()) return panelIn(ref.current.children, { from: 'right', stagger: 0.03 }); }, [dep]);
  return ref;
}

/* ── 名片 · 状态 / 目标（ProfilePresenceEditor） ── */
export function PresenceSheet({ open, onClose, initial = 'status' }: { open: boolean; onClose: () => void; initial?: PrSt }) {
  const [st, setSt] = useState<PrSt>(initial);
  const [pick, setPick] = useState('focus');
  const [card, setCard] = useState(0);
  useEffect(() => { if (open) setSt(initial); }, [open, initial]);
  const body = usePaint(st);
  const hasStatus = st !== 'empty', hasGoal = st === 'set' || st === 'goal' || st === 'audit';
  return (
    <P5Sheet open={open} onClose={onClose} title="名片 · 状态 / 目标" seed={411} className="ob-sheet">
      <DemoBar states={PR_STATES} cur={st} onPick={setSt} />
      <div className="ob-sbody" ref={body}><div className="ob-pres-card">
        <div className="ob-pres">
          {hasStatus ? <button type="button" className="ob-pill on" title="改状态" onClick={() => setSt('status')}>🎯 专注中</button> : <button type="button" className="ob-pill" aria-expanded={false} onClick={() => setSt('status')}>＋状态</button>}
          {!hasGoal && <button type="button" className="ob-pill" aria-expanded={false} onClick={() => setSt('goal')}>＋目标</button>}
        </div>
        {hasGoal ? <button type="button" className="ob-goal" aria-label="目标进度 62%，点开修改" onClick={() => setSt('goal')}><small>GOAL</small><b>期末绩点 3.8</b><span className="ob-bar"><i style={{ width: '62%' }} /></span><em>62%</em></button>
          : st === 'nocard' ? null : <button type="button" className="ob-pill wide" onClick={() => setSt('goal')}>＋ 挂一张宣告卡作为目标</button>}
        {st === 'audit' && <Msg kind="warn">目标的文字需要稍微调整下措辞 · 点这里改</Msg>}
        {st === 'missing' && <Msg kind="warn">挂着的宣告卡不在这台设备上 · 点这里重新挑</Msg>}
        {(st === 'status' || st === 'set') && (
          <div className="ob-prespanel">
            <div className="ob-stgrid">{STATUS.map(([id, e, l]) => <button key={id} type="button" className="ob-st" aria-pressed={id === pick && hasStatus} onClick={() => { setPick(id); toast('状态：' + e + l); }}>{e}<span>{l}</span></button>)}</div>
            <p className="ob-hint">{hasStatus ? '设于 2 小时前 · ' : ''}24 小时后自动消失</p>
            {hasStatus && <button type="button" className="ob-link" data-danger onClick={() => toast('状态已清除')}>清除状态</button>}
          </div>
        )}
        {(st === 'goal' || st === 'goalerr' || st === 'nocard') && (
          <div className="ob-prespanel">
            <p className="ob-hint">挂一张宣告卡，进度跟着它走</p>
            {st === 'nocard' ? <p className="ob-p">还没有进行中的宣告卡——先去首页立一张，再回来把它挂上名片。</p> : <>
              <div className="ob-cards">{CARDS.map(([t, p], i) => <button key={t} type="button" className="ob-cc" aria-pressed={i === card} onClick={() => setCard(i)}><b>{t}</b><span className="ob-bar"><i style={{ width: `${p}%` }} /></span></button>)}</div>
              <label className="ob-fld"><span>对外显示为（可选：别人眼里你的目标叫什么）</span><input className="ob-inp" placeholder="期末绩点 3.8" aria-label="对外显示名" /></label>
            </>}
            {st === 'goalerr' && <Msg kind="err">包含联系方式（这是宣告卡上的文字——可以在下面写一个对外的说法）</Msg>}
            <div className="ob-acts">
              {hasGoal && <button type="button" className="ob-link" data-danger onClick={() => toast('已取下目标')}>取下目标</button>}
              <P5Button tone="paper" size="sm" seed={401} onClick={() => toast('已取消')}>取消</P5Button>
              <P5Button size="sm" seed={402} disabled={st === 'nocard'} onClick={() => toast('已挂上名片')}>挂上名片</P5Button>
            </div>
          </div>
        )}
      </div></div>
    </P5Sheet>
  );
}

/* ── 头像裁切（UserProfileCard 内第二套 ImageCropModal） ── */
export function ProfileCropDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [sc, setSc] = useState(120);
  const pos = useRef({ dx: 0, dy: 0, drag: null as null | [number, number] });
  const img = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const ap = () => { if (img.current) img.current.style.transform = `translate(${pos.current.dx}px,${pos.current.dy}px) scale(${sc / 100})`; };
  useEffect(ap, [sc, open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (open && veil.current && !isLowMotion()) veil.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 }); }, [open]);
  if (!open) return null;
  const close = (msg?: string) => { const v = veil.current; const done = () => { onClose(); if (msg) toast(msg); }; if (!v || isLowMotion()) return done(); v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'both' }).onfinish = done; };
  return (
    <Portal>
      <div className="ob-dlg-veil" style={{ zIndex: 885 }} ref={veil} onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
        <P5Shp kind="cut" seed={431} tone="paper" className="ob-dlg ob-crop" role="dialog" aria-modal="true">
          <h3 className="ob-dlg-t">调整我的头像</h3>
          <div className="ob-crop-a">
            <div className="ob-crop-img" ref={img}
              onPointerDown={(e) => { pos.current.drag = [e.clientX - pos.current.dx, e.clientY - pos.current.dy]; e.currentTarget.setPointerCapture(e.pointerId); }}
              onPointerMove={(e) => { const d = pos.current.drag; if (!d) return; pos.current.dx = e.clientX - d[0]; pos.current.dy = e.clientY - d[1]; ap(); }}
              onPointerUp={() => { pos.current.drag = null; }}><P5Sil name="point" style={{ height: '100%', width: 'auto' }} /></div>
            <i className="ob-crop-ring" aria-hidden="true" />
          </div>
          <div className="ob-row"><div className="ob-row-m"><b>缩放</b><small>拖动图片调整位置</small></div><div className="ob-row-c">
            <span className="ob-range-w"><input type="range" className="ob-range" min={100} max={300} step={10} value={sc} aria-label="缩放" style={{ ['--p' as string]: `${((sc - 100) / 200) * 100}%` }} onChange={(e) => setSc(+e.target.value)} /><output>{sc}%</output></span>
          </div></div>
          <div className="ob-dlg-a"><P5Button tone="paper" seed={432} onClick={() => close()}>取消</P5Button><P5Button seed={433} size="lg" onClick={() => close('头像已更新')}>确定</P5Button></div>
        </P5Shp>
      </div>
    </Portal>
  );
}

export default function UserProfileCard({ open, onClose, params }: OverlayProps) {
  // UserID / 邮箱取真实登录态（原来写死 yeji_0610 / yeji.mask@example.com）。
  const identity = useAccountIdentity();
  const st0 = (params?.get('state') as PSt) || 'hasav';
  const [st, setSt] = useState<PSt>(st0);
  const [pres, setPres] = useState(false);
  const [crop, setCrop] = useState(false);
  const [fold, setFold] = useState(false);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(D.user.name);
  useEffect(() => {
    if (!open) { setPres(false); setCrop(false); return; }
    setSt(st0);
    const ts = [params?.get('panel') === 'status' && window.setTimeout(() => setPres(true), 420), params?.get('step') === 'crop' && window.setTimeout(() => setCrop(true), 420)].filter(Boolean) as number[];
    return () => ts.forEach(clearTimeout);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!copied) return; const t = setTimeout(() => setCopied(false), 1500); return () => clearTimeout(t); }, [copied]);
  const body = usePaint(st);
  const foldRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (fold && foldRef.current && !isLowMotion()) return panelIn(foldRef.current.children, { from: 'right', stagger: 0.025 }); }, [fold]);
  const tot = ATTR_ORDER.reduce((s, k) => s + D.attrs[k].pts, 0), lv = ATTR_ORDER.reduce((s, k) => s + D.attrs[k].level, 0);
  const hasAv = st === 'hasav' || st === 'avatar';
  return (
    <>
      <P5Sheet open={open} onClose={onClose} title="用户资料" seed={441} className="ob-sheet">
        <DemoBar states={P_STATES} cur={st} onPick={setSt} />
        <div className="ob-sbody" ref={body}>
          <P5Shp kind="cut" seed={421} tone="paper" className="ob-prof">
            <div className="ob-av-w">
              <button type="button" className="ob-av" aria-label="头像菜单" aria-expanded={st === 'avatar'} onClick={() => setSt(st === 'avatar' ? 'hasav' : 'avatar')}>
                {hasAv ? <span className="ob-av-img"><P5Sil name="point" style={{ height: '120%', width: 'auto' }} /></span> : <b>{name.charAt(0)}</b>}
                <P5StarIcon fill="var(--red)" stroke="var(--paper)" sw={1.4} className="ob-av-star" />
              </button>
              {st === 'avatar' && (
                <div className="ob-avmenu" role="menu">
                  <P5Button tone="ink" size="sm" seed={422} role="menuitem" onClick={() => setCrop(true)}>更换头像</P5Button>
                  <P5Button tone="red" size="sm" seed={423} role="menuitem" onClick={() => { toast('头像已移除'); setSt('noav'); }}>移除头像</P5Button>
                  <P5Button tone="paper" size="sm" seed={424} role="menuitem" onClick={() => setSt('hasav')}>取消</P5Button>
                </div>
              )}
            </div>
            <div className="ob-prof-m">
              {st === 'name' ? (
                <div className="ob-namerow">
                  <input className="ob-inp" placeholder="名字" aria-label="用户名" maxLength={20} value={name} onChange={(e) => setName(e.target.value)} />
                  <P5Button size="sm" seed={425} onClick={() => { toast('已保存'); setSt('hasav'); }}>保存</P5Button>
                  <P5Button tone="paper" size="sm" seed={426} onClick={() => { setName(D.user.name); setSt('hasav'); }}>取消</P5Button>
                </div>
              ) : <div className="ob-namerow"><h3>{name}</h3><button type="button" className="ob-pen" aria-label="修改用户名" onClick={() => setSt('name')}>✎</button></div>}
              <div className="ob-lvrow"><P5Tag tone="ink">LV {lv}</P5Tag><div className="ob-pres"><button type="button" className="ob-pill" onClick={() => setPres(true)}>＋状态</button><button type="button" className="ob-pill" onClick={() => setPres(true)}>＋目标</button></div></div>
              <button type="button" className="ob-uid" title="点击复制 UserID" onClick={() => setCopied(true)}>{copied ? '已复制 ✓' : <><span>@</span>{identity.username || '未登录'}</>}</button>
              <small className="ob-mail">{identity.email || '未登录'}</small>
              {st === 'err' && <Msg kind="err">请选择图片文件</Msg>}
            </div>
            <div className="ob-prof-f">
              <div className={`ob-fold ${fold ? 'open' : ''}`}>
                <button type="button" className="ob-fold-h" aria-expanded={fold} onClick={() => setFold(!fold)}><b>总点数：<em>{tot}</em></b><small>{lv} 级累计</small><i className="ob-caret">{fold ? '▲' : '▼'}</i></button>
                <div className="ob-fold-b" hidden={!fold} ref={foldRef}>
                  <ul className="ob-attrs">{ATTR_ORDER.map((k) => <li key={k}><b>{ATTR[k].name}</b><span className="ob-bar"><i style={{ width: `${(D.attrs[k].pts / D.attrs[k].next) * 100}%` }} /></span><em>Lv{D.attrs[k].level}</em></li>)}</ul>
                </div>
              </div>
            </div>
          </P5Shp>
        </div>
      </P5Sheet>
      <PresenceSheet open={open && pres} onClose={() => setPres(false)} initial={(params?.get('pstate') as PrSt) || 'status'} />
      <ProfileCropDialog open={open && crop} onClose={() => setCrop(false)} />
    </>
  );
}
