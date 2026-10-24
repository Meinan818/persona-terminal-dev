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
import { toast } from '@/p5r-red/kit/P5Toast';
import { P5Sil } from '@/p5r-red/fx/sil';
import { panelIn } from '@/p5r-red/fx/motion';
import { isLowMotion, usePrefs } from '@/p5r-red/lib/prefs';
import { useAccountIdentity } from '@/themes/accountAuth';
import { D } from '@/p5r-red/mock/data';
import { useAppStore } from '@/store';
import ImageCropDialog from './ImageCropDialog.p5r';

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

export default function UserProfileCard({ open, onClose, params }: OverlayProps) {
  // UserID / 邮箱取真实登录态（原来写死 yeji_0610 / yeji.mask@example.com）。
  const identity = useAccountIdentity();
  const user = useAppStore((state) => state.user);
  const attributes = useAppStore((state) => state.attributes);
  const updateUser = useAppStore((state) => state.updateUser);
  const st0 = (params?.get('state') as PSt) || 'hasav';
  const [st, setSt] = useState<PSt>(st0);
  const [pres, setPres] = useState(false);
  const [crop, setCrop] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fold, setFold] = useState(false);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(user?.name ?? D.user.name);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setName(user?.name ?? D.user.name);
    if (!open) { setPres(false); setCrop(false); return; }
    setSt(st0);
    const ts = [params?.get('panel') === 'status' && window.setTimeout(() => setPres(true), 420), params?.get('step') === 'crop' && window.setTimeout(() => setCrop(true), 420)].filter(Boolean) as number[];
    return () => ts.forEach(clearTimeout);
  }, [open, user?.name]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!copied) return; const t = setTimeout(() => setCopied(false), 1500); return () => clearTimeout(t); }, [copied]);
  const body = usePaint(st);
  const foldRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (fold && foldRef.current && !isLowMotion()) return panelIn(foldRef.current.children, { from: 'right', stagger: 0.025 }); }, [fold]);
  const tot = attributes.reduce((sum, attribute) => sum + attribute.points, 0);
  const lv = attributes.reduce((sum, attribute) => sum + attribute.level, 0);
  const avatar = st === 'noav' ? null : user?.avatarDataUrl ?? null;
  const hasAv = !!avatar;
  const saveName = async () => {
    const next = name.trim();
    if (!next) { setName(user?.name ?? D.user.name); setSt('hasav'); return; }
    try {
      await updateUser({ name: next });
      setSt('hasav');
      toast('已保存');
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败');
    }
  };
  const saveAvatar = async (dataUrl: string) => {
    setCrop(false);
    setPendingFile(null);
    setUploading(true);
    try {
      await updateUser({ avatarDataUrl: dataUrl });
      setSt('hasav');
      toast('头像已更新');
    } catch (error) {
      toast(error instanceof Error ? error.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };
  const removeAvatar = async () => {
    setSt('hasav');
    try {
      await updateUser({ avatarDataUrl: undefined });
      setSt('noav');
      toast('头像已移除');
    } catch (error) {
      toast(error instanceof Error ? error.message : '移除失败');
    }
  };
  return (
    <>
      <P5Sheet open={open} onClose={onClose} title="用户资料" seed={441} className="ob-sheet">
        <DemoBar states={P_STATES} cur={st} onPick={setSt} />
        <div className="ob-sbody" ref={body}>
          <P5Shp kind="cut" seed={421} tone="paper" className="ob-prof">
            <div className="ob-av-w">
              <button type="button" className="ob-av" aria-label="头像菜单" aria-expanded={st === 'avatar'} disabled={uploading} onClick={() => setSt(st === 'avatar' ? 'hasav' : 'avatar')}>
                {hasAv ? <span className="ob-av-img"><img src={avatar!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /></span> : <b>{name.charAt(0)}</b>}
                <P5StarIcon fill="var(--red)" stroke="var(--paper)" sw={1.4} className="ob-av-star" />
                {uploading && <span style={{ position: 'absolute', inset: 6, zIndex: 2, display: 'grid', placeItems: 'center', background: 'rgba(17,17,17,.68)', color: '#fff', font: '900 11px/1 var(--f-title)' }}>上传中</span>}
              </button>
              {st === 'avatar' && (
                <div className="ob-avmenu" role="menu" style={{ position: 'relative', left: 'auto', top: 'auto', marginTop: 8 }}>
                  <P5Button tone="ink" size="sm" seed={422} role="menuitem" onClick={() => fileRef.current?.click()}>{hasAv ? '更换头像' : '上传头像'}</P5Button>
                  {hasAv && <P5Button tone="red" size="sm" seed={423} role="menuitem" onClick={() => void removeAvatar()}>移除头像</P5Button>}
                  <P5Button tone="paper" size="sm" seed={424} role="menuitem" onClick={() => setSt('hasav')}>取消</P5Button>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                if (!file.type.startsWith('image/')) { toast('请选择图片文件'); return; }
                setSt('hasav');
                setPendingFile(file);
                setCrop(true);
              }} />
            </div>
            <div className="ob-prof-m">
              {st === 'name' ? (
                <div className="ob-namerow">
                  <input className="ob-inp" placeholder="名字" aria-label="用户名" maxLength={20} value={name} onChange={(e) => setName(e.target.value)} />
                  <P5Button size="sm" seed={425} onClick={() => void saveName()}>保存</P5Button>
                  <P5Button tone="paper" size="sm" seed={426} onClick={() => { setName(user?.name ?? D.user.name); setSt('hasav'); }}>取消</P5Button>
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
                  <ul className="ob-attrs">{attributes.map((attribute) => <li key={attribute.id}><b>{attribute.displayName}</b><span className="ob-bar"><i style={{ width: `${Math.min(100, Math.max(0, attribute.level / Math.max(1, ...attributes.map((item) => item.level)) * 100))}%` }} /></span><em>Lv{attribute.level}</em></li>)}</ul>
                </div>
              </div>
            </div>
          </P5Shp>
        </div>
      </P5Sheet>
      <PresenceSheet open={open && pres} onClose={() => setPres(false)} initial={(params?.get('pstate') as PrSt) || 'status'} />
      <ImageCropDialog
        open={open && crop}
        onClose={() => { setCrop(false); setPendingFile(null); }}
        file={pendingFile}
        title="调整我的头像"
        onDone={(dataUrl) => void saveAvatar(dataUrl)}
        doneToast={null}
      />
    </>
  );
}
