/**
 * B 组（账号 / 设置 / 同步 / AI）小件 —— 迁移自 v3 overlays/b.js 的 h.* 助手 + card + fakeAsync + stateBar + obSheet + confirmDlg + openCrop。
 * DOM / 类名与 v3 一致（.ob-*，样式在 legacy/css/b.css），所以视觉逐像素沿用。pkg2 全部页面 / 弹层共用。
 *   <ObCard title="天气" en="WEATHER" seed={341}>…</ObCard>         撕纸卡 + 斜标题牌
 *   <ObRow label hint tag>{控件}</ObRow>  <ObSw/> <ObSeg/> <ObInp/> <ObRange/> <ObChip/> <ObFold/>
 *   <BusyBtn label busy="保存中…" msg="已保存" fail="…" to={setMsg}/>   假异步按钮（v3 data-busy）
 *   <ObSheet open title states state onState wide>…</ObSheet>        = P5Sheet + .ob-sheet（可带 DEMO 状态条）
 *   <ObConfirm open title desc list warn danger busy fail … />       二段确认（取消恒左、主操作恒右；危险 = 红）
 *   <ObCrop open onClose onDone/>                                     头像裁切（v3 openCrop；拖动 + 缩放）
 */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { P5Shp, type ShpTone } from '@/p5r-red/kit/P5Shp';
import { P5Plate } from '@/p5r-red/kit/P5Plate';
import { P5Button, type P5ButtonProps } from '@/p5r-red/kit/P5Button';
import { P5Tag } from '@/p5r-red/kit/P5Tag';
import { P5BurstImg } from '@/p5r-red/kit/P5BurstImg';
import { P5Sheet } from '@/p5r-red/kit/P5Sheet';
import { Portal } from '@/p5r-red/kit/Portal';
import { toast } from '@/p5r-red/kit/P5Toast';
import ImageCropDialog from './ImageCropDialog.p5r';
import { panelIn } from '@/p5r-red/fx/motion';
import { spring } from '@/p5r-red/fx/spring';
import { sfx, type SfxKey } from '@/p5r-red/fx/sfx';
import { lerp } from '@/p5r-red/lib/rng';
import { isLowMotion } from '@/p5r-red/lib/prefs';

const strip = (s: string) => s.replace(/<[^>]+>/g, '');

/* ── 原子件 ── */
export function ObSw({ on: init = false, label, locked, onToggle, on2 }: { on?: boolean; label: string; locked?: string; onToggle?: (v: boolean) => void; /** 受控 */ on2?: boolean }) {
  const [onS, setOn] = useState(init);
  const on = on2 ?? onS;
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { setOn(init); }, [init]);
  return (
    <button ref={ref} type="button" role="switch" className={`ob-sw${on ? ' on' : ''}`} aria-checked={on} aria-label={label} data-locked={locked != null ? locked : undefined}
      onClick={() => {
        if (locked != null) { toast(locked || '这一组必须同步'); return; }
        setOn(!on); sfx('nav', 0.3); onToggle?.(!on);
        if (!isLowMotion()) ref.current?.animate([{ transform: 'scale(1.12) rotate(-3deg)' }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      }}><i /></button>
  );
}

type SegOpt = string | [string, ReactNode, ReactNode?];
export function ObSeg({ opts, sel, multi, max = 0, aria = '', cls = '', onChange }: { opts: SegOpt[]; sel: string | string[]; multi?: boolean; max?: number; aria?: string; cls?: string; onChange?: (v: string, all: string[]) => void }) {
  const [cur, setCur] = useState<string[]>(Array.isArray(sel) ? sel : [sel]);
  useEffect(() => { setCur(Array.isArray(sel) ? sel : [sel]); }, [String(sel)]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`ob-seg ${cls}`} role={multi ? 'group' : 'radiogroup'} aria-label={aria}>
      {opts.map((o) => {
        const [v, l, sub] = Array.isArray(o) ? o : [o, o];
        const on = cur.includes(v);
        return (
          <button key={v} type="button" aria-pressed={on} onClick={() => {
            let next: string[];
            if (multi) { if (!on && max && cur.length >= max) { toast(`最多同时开启 ${max} 个`); return; } next = on ? cur.filter((x) => x !== v) : [...cur, v]; }
            else next = [v];
            setCur(next); onChange?.(v, next);
          }}>{l}{sub ? <small>{sub}</small> : null}</button>
        );
      })}
    </div>
  );
}

export function ObInp({ ph = '', val = '', aria, type = 'text', cls = '', ...rest }: { ph?: string; val?: string | number; aria?: string; type?: string; cls?: string; [k: string]: unknown }) {
  return <input className={`ob-inp ${cls}`.trim()} type={type} placeholder={ph} defaultValue={val} aria-label={aria ?? ph} {...rest} />;
}
export function ObTa({ ph = '', val = '', rows = 3, aria }: { ph?: string; val?: string; rows?: number; aria?: string }) {
  return <textarea className="ob-inp ob-ta" rows={rows} placeholder={ph} defaultValue={val} aria-label={aria ?? ph} />;
}
export function ObSel({ opts, val, aria, onChange }: { opts: (string | [string, string])[]; val: string; aria: string; onChange?: (v: string) => void }) {
  return <select className="ob-inp ob-sel" aria-label={aria} value={val} onChange={(e) => onChange?.(e.target.value)}>{opts.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return <option key={v} value={v}>{l}</option>; })}</select>;
}
export function ObRange({ v: init, aria, min = 0, max = 100, step = 5, unit = '%', preview, onInput }: { v: number; aria: string; min?: number; max?: number; step?: number; unit?: string; preview?: string; onInput?: (v: number) => void }) {
  const [v, setV] = useState(init);
  return (
    <span className="ob-range-w">
      <input type="range" className="ob-range" min={min} max={max} step={step} value={v} aria-label={aria} style={{ '--p': `${((v - min) / (max - min)) * 100}%` } as CSSProperties}
        onChange={(e) => { setV(+e.target.value); onInput?.(+e.target.value); }} onPointerUp={() => preview && toast(preview)} onKeyUp={() => preview && toast(preview)} />
      <output>{v}{unit}</output>
    </span>
  );
}
export function ObRow({ label, hint, tag, cls = '', children, style }: { label: ReactNode; hint?: ReactNode; tag?: string; cls?: string; children?: ReactNode; style?: CSSProperties }) {
  return (
    <div className={`ob-row ${cls}`.trim()} style={style}>
      <div className="ob-row-m"><b>{label}{tag ? <> <P5Tag tone={tag === '实验性' || tag === '新' ? '' : 'ink'}>{tag}</P5Tag></> : null}</b>{hint ? <small>{hint}</small> : null}</div>
      {children != null && <div className="ob-row-c">{children}</div>}
    </div>
  );
}
export type MsgKind = 'ok' | 'err' | 'warn' | 'info';
export function ObMsg({ kind, children, className = '' }: { kind: MsgKind; children: ReactNode; className?: string }) {
  return <p className={`ob-msg ${kind} ${className}`.trim()} role={kind === 'err' ? 'alert' : 'status'}>{children}</p>;
}
export function ObChip({ label, on: init = false, noflip, onClick, title }: { label: ReactNode; on?: boolean; noflip?: boolean; onClick?: () => void; title?: string }) {
  const [on, setOn] = useState(init);
  useEffect(() => setOn(init), [init]);
  return <button type="button" className="ob-chip" aria-pressed={on} title={title} onClick={() => { if (!noflip) setOn(!on); onClick?.(); }}>{label}</button>;
}
export const ObSub = ({ children }: { children: ReactNode }) => <h5 className="ob-sub"><i />{children}</h5>;
export const ObNote = ({ children }: { children: ReactNode }) => <p className="ob-note">{children}</p>;
export const ObHint = ({ children, c }: { children: ReactNode; c?: boolean }) => <p className={`ob-hint${c ? ' ob-c' : ''}`}>{children}</p>;
export function ObLink({ children, danger, onClick, toastMsg, aria }: { children: ReactNode; danger?: boolean; onClick?: () => void; toastMsg?: string; aria?: string }) {
  return <button type="button" className="ob-link" data-danger={danger ? '' : undefined} aria-label={aria} onClick={() => { if (toastMsg) toast(toastMsg); onClick?.(); }}>{children}</button>;
}
export function ObBtn({ tone = 'red', seed = 7, children, toastMsg, onClick, ...rest }: P5ButtonProps & { toastMsg?: string }) {
  return <P5Button tone={tone} seed={seed} onClick={(e) => { if (toastMsg) toast(toastMsg); onClick?.(e); }} {...rest}>{children}</P5Button>;
}

/** 折叠头（v3 h.fold）：展开时子项从右甩入 */
export function ObFold({ title, meta, open: init = false, children }: { title: ReactNode; meta?: ReactNode; open?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(init);
  const body = useRef<HTMLDivElement>(null), first = useRef(true);
  useEffect(() => setOpen(init), [init]);
  useLayoutEffect(() => { if (first.current) { first.current = false; return; } if (open && body.current) return panelIn(body.current.children, { from: 'right', stagger: 0.025 }); }, [open]);
  return (
    <div className={`ob-fold${open ? ' open' : ''}`}>
      <button type="button" className="ob-fold-h" aria-expanded={open} onClick={() => setOpen(!open)}><b>{title}</b><small>{meta}</small><i className="ob-caret">{open ? '▲' : '▼'}</i></button>
      <div className="ob-fold-b" hidden={!open} ref={body}>{children}</div>
    </div>
  );
}

/** 撕纸卡（v3 card()） */
export function ObCard({ title, en, seed = 11, tone = 'paper', cls = '', children, id, style }: { title?: ReactNode; en?: string; seed?: number; tone?: ShpTone; cls?: string; children: ReactNode; id?: string; style?: CSSProperties }) {
  return (
    <P5Shp as="section" kind="torn" seed={seed} tone={tone} className={`ob-card ${cls}`} id={id} style={style}>
      {title ? <h4 className="ob-card-h"><P5Plate fs={15} rot={-1.5}>{title}</P5Plate>{en ? <small>{en}</small> : null}</h4> : null}
      {children}
    </P5Shp>
  );
}

/** 列表项按钮（.ob-li：斜墨底悬停变红） */
export function ObLi({ children, onClick, cls = '' }: { children: ReactNode; onClick?: () => void; cls?: string }) {
  return <button type="button" className={`ob-li ${cls}`.trim()} onClick={onClick}><i className="ob-li-bg" />{children}</button>;
}

/** 假异步按钮（v3 fakeAsync：busy 文案 → done / fail；fail 时第二次点击失败交替演示） */
export function BusyBtn({ label, busy, done, msg, kind = 'ok', fail, failLabel, ms = 900, revert, sfxKey, to, tone = 'red', seed = 7, size = '', className = '', disabled, onDone }: {
  label: ReactNode; busy: ReactNode; done?: ReactNode; msg?: ReactNode; kind?: MsgKind; fail?: ReactNode; failLabel?: ReactNode; ms?: number; revert?: number; sfxKey?: SfxKey;
  to?: (m: ReactNode) => void; tone?: ShpTone; seed?: number; size?: '' | 'sm' | 'lg'; className?: string; disabled?: boolean; onDone?: (ok: boolean) => void;
}) {
  const [lab, setLab] = useState<ReactNode>(label);
  const [b, setB] = useState(false);
  const n = useRef(0);
  useEffect(() => setLab(label), [label]);
  return (
    <P5Button tone={tone} seed={seed} size={size} className={`${b ? 'ob-busy' : ''} ${className}`} disabled={disabled || b} onClick={() => {
      const willFail = fail != null && n.current === 1; n.current = n.current === 1 ? 0 : 1;
      setB(true); setLab(busy);
      setTimeout(() => {
        setB(false); setLab(willFail ? (failLabel ?? label) : (done ?? label));
        const m = willFail ? <ObMsg kind="err">{fail}</ObMsg> : msg != null ? <ObMsg kind={kind}>{msg}</ObMsg> : null;
        if (to) to(m); else if (m) toast(strip(String(willFail ? (typeof fail === 'string' ? fail : '失败') : (typeof msg === 'string' ? msg : '完成'))));
        if (!willFail && sfxKey) sfx(sfxKey, 0.5);
        if (revert) setTimeout(() => setLab(label), revert);
        onDone?.(!willFail);
      }, ms);
    }}>{lab}</P5Button>
  );
}

/** 消息盒（v3 .ob-msgbox）：BusyBtn to={set} 写入；新消息斜甩入 */
export function useMsgBox(init: ReactNode = null): [ReactNode, (m: ReactNode) => void] {
  const [m, setM] = useState<ReactNode>(init);
  const [k, setK] = useState(0);
  const box = <MsgBox key={k} m={m} />;
  return [box, (x) => { setM(x); setK((i) => i + 1); }];
}
function MsgBox({ m }: { m: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { const c = ref.current?.firstElementChild as HTMLElement | null; if (c && !isLowMotion()) c.animate([{ opacity: 0, transform: 'translateX(30px) skewX(-10deg)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.9,.3,1)' }); }, []);
  return <div className="ob-msgbox" ref={ref}>{m}</div>;
}

/** DEMO 状态条（v3 stateBar） */
export function ObStateBar({ states, cur, onPick }: { states: [string, string][]; cur: string; onPick: (k: string) => void }) {
  return (
    <div className="ob-demo" role="tablist" aria-label="演示状态"><span>DEMO 状态</span>
      {states.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={k === cur} onClick={() => onPick(k)}>{l}</button>)}
    </div>
  );
}

/** 抽屉（v3 obSheet = P5.sheet + .ob-sheet；wide = .ob-sheet-w 760px）。states 给出时顶部带 DEMO 状态条，切换 = 子项右甩入 */
export function ObSheet({ open, onClose, title, seed = 31, wide, states, state, onState, cls = '', children }: {
  open: boolean; onClose: () => void; title: ReactNode; seed?: number; wide?: boolean; states?: [string, string][]; state?: string; onState?: (k: string) => void; cls?: string; children: ReactNode;
}) {
  const body = useRef<HTMLDivElement>(null), first = useRef(true);
  useLayoutEffect(() => { if (first.current) { first.current = false; return; } if (body.current) return panelIn(body.current.children, { from: 'right', stagger: 0.03 }); }, [state]);
  return (
    <P5Sheet open={open} onClose={onClose} title={title} seed={seed} className={`ob-sheet${wide ? ' ob-sheet-w' : ''}`}>
      {states && state != null && <ObStateBar states={states} cur={state} onPick={(k) => onState?.(k)} />}
      <div className={`ob-sbody ${cls}`.trim()} ref={body}>{children}</div>
    </P5Sheet>
  );
}

/** 二段确认（v3 confirmDlg：ConfirmDialog 基座的 B 组形态 —— 切角纸卡 + 星爆章 + 双钮） */
export interface ObConfirmProps {
  open: boolean; onClose: () => void; title: ReactNode; desc?: ReactNode; list?: ReactNode[]; warn?: ReactNode; extra?: ReactNode;
  confirm?: string; cancel?: string; danger?: boolean; busy?: string; fail?: ReactNode; failNow?: () => boolean; onConfirm?: () => void | Promise<void>; seed?: number;
}
export function ObConfirm({ open, onClose, title, desc, list, warn, extra, confirm = '确认', cancel = '取消', danger, busy, fail, failNow, onConfirm, seed = 77 }: ObConfirmProps) {
  const [mounted, setMounted] = useState(open);
  const [isBusy, setBusy] = useState(false);
  const [err, setErr] = useState<ReactNode>(null);
  const veil = useRef<HTMLDivElement>(null), box = useRef<HTMLElement>(null);
  useEffect(() => { if (open) { setMounted(true); setErr(null); setBusy(false); } }, [open]);
  useLayoutEffect(() => {
    if (!mounted || !open) return;
    veil.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: 'both' });
    const b = box.current; if (!b) return;
    if (isLowMotion()) { b.style.transform = 'rotate(-1deg)'; return; }
    b.style.transform = 'scale(1.4) rotate(-8deg)'; b.style.opacity = '0'; sfx('nav', 0.4);
    return spring({ stiffness: 420, damping: 22, onUpdate: (p) => { b.style.opacity = String(Math.min(1, p * 1.6)); b.style.transform = `scale(${lerp(1.4, 1, p)}) rotate(${lerp(-8, -1, p)}deg)`; } });
  }, [mounted, open]);
  useEffect(() => {
    if (open || !mounted) return;
    const v = veil.current; if (!v) { setMounted(false); return; }
    v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'both' }).onfinish = () => setMounted(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isBusy) { e.stopImmediatePropagation(); onClose(); } }; window.addEventListener('keydown', k, true); return () => window.removeEventListener('keydown', k, true); }, [open, isBusy, onClose]);
  if (!mounted) return null;
  const ok = () => {
    if (isBusy) return;
    let result: void | Promise<void>;
    try {
      result = onConfirm?.();
    } catch (error) {
      setErr(<ObMsg kind="err">{error instanceof Error ? error.message : '操作失败，请重试'}</ObMsg>);
      return;
    }
    if (result && typeof (result as Promise<void>).then === 'function') {
      setBusy(true);
      setErr(null);
      result.then(
        () => { setBusy(false); onClose(); },
        (error) => {
          setBusy(false);
          setErr(<ObMsg kind="err">{error instanceof Error ? error.message : '操作失败，请重试'}</ObMsg>);
        },
      );
      return;
    }
    if (busy) { setBusy(true); setTimeout(() => { setBusy(false); if (fail && failNow?.()) { setErr(<ObMsg kind="err">{fail}</ObMsg>); return; } onClose(); onConfirm?.(); }, 1000); }
    else { onClose(); onConfirm?.(); }
  };
  return (
    <Portal>
      <div className="ob-dlg-veil" style={{ zIndex: 880 }} ref={veil} onClick={(e) => { if (e.target === e.currentTarget && !isBusy) onClose(); }}>
        <P5Shp as="div" ref={box} kind="cut" seed={seed} tone="paper" className="ob-dlg" role="alertdialog" aria-modal="true">
          <div className="ob-dlg-stamp" aria-hidden="true"><P5BurstImg tone={danger ? 'red' : 'ink'} sz={64} rot={-12}>{danger ? '!' : '?'}</P5BurstImg></div>
          <h3 className="ob-dlg-t">{title}</h3>
          {desc ? <p className="ob-dlg-d">{desc}</p> : null}
          {list ? <ul className="ob-dlg-l">{list.map((x, i) => <li key={i}>{x}</li>)}</ul> : null}
          {extra}
          {warn ? <p className="ob-dlg-w">{warn}</p> : null}
          <div className="ob-dlg-msg">{err}</div>
          <div className="ob-dlg-a">
            <P5Button tone="paper" seed={78} disabled={isBusy} onClick={onClose}>{cancel}</P5Button>
            <P5Button tone={danger ? 'red' : 'ink'} seed={79} size="lg" disabled={isBusy} onClick={ok}>{isBusy ? busy : confirm}</P5Button>
          </div>
        </P5Shp>
      </div>
    </Portal>
  );
}

/** 头像裁切 —— 阶段 3 统一为 pkg1 的 ImageCropDialog（真实 src/components/ImageCropDialog.tsx：设置 / 助手 / 同伴选头像都走它）。
 *  旧 ObCrop（v3 openCrop 的 ob 版）已撤；保留同名同参薄包装，调用方不用改。 */
export function ObCrop({ open, onClose, onDone, src, title = '调整头像' }: { open: boolean; onClose: () => void; onDone?: () => void; src?: string; title?: string }) {
  return <ImageCropDialog open={open} onClose={onClose} onDone={onDone} src={src} params={new URLSearchParams({ title })} doneToast={onDone ? null : '头像已更新'} />;
}

/** 入场：容器直接子项从右甩入（v3 P5.panelIn(body.children, { from:'right', stagger:.06, delay:.2 })） */
export function usePanelIn(ref: RefObject<HTMLElement>, deps: unknown[] = [], opts: { stagger?: number; delay?: number } = {}) {
  useLayoutEffect(() => { if (ref.current) return panelIn(ref.current.children, { from: 'right', stagger: opts.stagger ?? 0.06, delay: opts.delay ?? 0.1 }); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}
