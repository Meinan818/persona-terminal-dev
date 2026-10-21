/**
 * ★ 人格星象（五维雷达）—— 原 shared/radar.js（MOTION_SPEC §1 灵魂动画，参数原样）：
 *   几何 viewBox 360×344，中心 (180,172)，R=150，臂角 -90+i*72；levelRadius = R*(0.26+0.74*l/max)
 *   平面 skewX(-13deg) scaleY(1.16)；点标签 → 星层 scale 1→1.4, rotate 0→-118°, x 12%, y 14%, opacity →.1（spring 190/24）
 *   红圈涟漪 16→250px .6s；档案标题曲线飞入 .5s times[0,.58,1]；档案子项 fromRight 118% spring 250/26 stagger .06 delay .03
 * 注：§1 雷达星旋转按规范例外，不受低动效控制（与原生一致）。DOM / 类名与原生相同（样式在 legacy/css/home.css）。
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { ATTR, ATTR_ORDER, RANKS, type AttrId } from '@/p5r-red/mock/data';
import { spring } from './spring';
import { lerp } from '@/p5r-red/lib/rng';

const CX = 180, CY = 172, R = 150, rad = (d: number) => d * Math.PI / 180, arm = (i: number) => -90 + i * 72;
const pt = (a: number, r: number): [number, number] => [CX + r * Math.cos(rad(a)), CY + r * Math.sin(rad(a))];
const LR = (l: number, m: number) => R * (0.26 + 0.74 * Math.max(0, Math.min(1, l / Math.max(1, m))));
const starPath = (r: number[]) => { let d = ''; for (let i = 0; i < 5; i++) { const [ox, oy] = pt(arm(i), r[i]); const ir = ((r[i] + r[(i + 1) % 5]) / 2) * 0.4; const [ix, iy] = pt(arm(i) + 36, ir); d += `${i ? 'L' : 'M'}${ox.toFixed(1)},${oy.toFixed(1)} L${ix.toFixed(1)},${iy.toFixed(1)} `; } return d + 'Z'; };
const ringColor = (l: number, n: number) => { const t = l / n; return `rgb(${Math.round(222 - t * 130)},${Math.round(216 - t * 128)},${Math.round(203 - t * 122)})`; };
const COMMON: Record<AttrId, string> = { knowledge: '自习', guts: '运动', kindness: '帮忙', dexterity: '手作', charm: '社交' };

export interface RadarAttrs { [k: string]: { level: number; pts: number; next: number } }
export interface PersonaRadarProps { attrs: Record<AttrId, { level: number; pts: number; next: number }>; maxLevel: number; /** 首页：舞台高度 = 星层自然高度（原 home.js fitRadar） */ fitHeight?: boolean; /** 直达原地档案（?attr=knowledge） */ initialAttr?: AttrId }

export function PersonaRadar({ attrs, maxLevel, fitHeight = false, initialAttr }: PersonaRadarProps) {
  const stageRef = useRef<HTMLDivElement>(null), layerRef = useRef<HTMLDivElement>(null), dosRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<{ id: AttrId; n: number } | null>(initialAttr ? { id: initialAttr, n: 1 } : null);
  const [open, setOpen] = useState(false);
  const [ripples, setRipples] = useState<{ k: number; x: number; y: number }[]>([]);
  const cur = useRef(0), stop = useRef<null | (() => void)>(null);

  const svg = useMemo(() => {
    const n = Math.min(10, maxLevel);
    const rings = [] as { d: string; fill: string }[];
    for (let k = 0; k < n; k++) { const l = n - k, r = LR(l, n); rings.push({ d: starPath([r, r, r, r, r]), fill: ringColor(l, n) }); }
    return { shadow: starPath(Array(5).fill(LR(n, n))), rings, data: starPath(ATTR_ORDER.map((id) => LR(attrs[id].level, maxLevel))) };
  }, [attrs, maxLevel]);

  const anim = (to: 0 | 1) => {
    const layer = layerRef.current!; stop.current?.();
    const from = cur.current;
    layer.style.pointerEvents = to ? 'none' : 'auto';
    const apply = (p: number) => { layer.style.transform = `translateX(${lerp(0, 12, p)}%) translateY(${lerp(0, 14, p)}%) scale(${lerp(1, 1.4, p)}) rotate(${lerp(0, -118, p)}deg)`; layer.style.opacity = String(lerp(1, 0.1, p)); };
    stop.current = spring({ stiffness: 190, damping: 24, onUpdate: (x) => { cur.current = lerp(from, to, x); apply(cur.current); } });
  };
  useEffect(() => () => stop.current?.(), []);

  // 点标签后：量高度 → 展开 → 标题曲线飞入 + 子项甩入（顺序与原生一致：先量高再加 .open）
  useLayoutEffect(() => {
    if (!sel) return;
    const dos = dosRef.current!;
    // 量高时 .open 的 padding-top:26px 还没加（border-box），补上；展开结束后放成 auto，防止字体 / 宽度晚到导致换行后「返回」被裁
    const wasOpen = stageRef.current!.classList.contains('open');
    const from = wasOpen ? dos.offsetHeight : 0;
    dos.style.height = 'auto'; const H = dos.offsetHeight + (wasOpen ? 0 : 26); dos.style.height = from + 'px'; void dos.offsetHeight;
    dos.style.height = H + 'px';
    if (H === from) dos.style.height = 'auto';
    const onEnd = (ev: TransitionEvent) => { if (ev.target === dos && ev.propertyName === 'height' && dos.style.height !== '0px') dos.style.height = 'auto'; };
    dos.addEventListener('transitionend', onEnd);
    setOpen(true); anim(1);
    const head = dos.querySelector<HTMLElement>('.ds-head')!; head.style.transformOrigin = 'top left';
    head.animate([{ transform: 'translate(34%,44px) scale(.56)' }, { transform: 'translate(9%,-10px) scale(.94)', offset: 0.58 }, { transform: 'none' }], { duration: 500, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' });
    const stops: (() => void)[] = [];
    dos.querySelectorAll<HTMLElement>('.ds-item').forEach((el, i) => { el.style.transform = 'translateX(118%)'; stops.push(spring({ stiffness: 250, damping: 26, delay: 0.03 + i * 0.06, onUpdate: (x) => { el.style.transform = `translateX(${lerp(118, 0, x)}%)`; } })); });
    const back = dos.querySelector<HTMLElement>('.ds-back')!; back.style.transform = 'translateX(-116%)';
    stops.push(spring({ stiffness: 250, damping: 26, delay: 0.03 + 4 * 0.06, onUpdate: (x) => { back.style.transform = `translateX(${lerp(-116, 0, x)}%)`; } }));
    return () => { stops.forEach((s) => s()); dos.removeEventListener('transitionend', onEnd); };
  }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps

  // 首页：舞台 min-height 跟随星层自然高度（resize / 字体就绪后重算）
  useEffect(() => {
    if (!fitHeight) return;
    const fit = () => { const st = stageRef.current, l = layerRef.current; if (st && l) st.style.minHeight = l.offsetHeight + 'px'; };
    fit(); addEventListener('resize', fit); document.fonts?.ready.then(fit);
    return () => removeEventListener('resize', fit);
  }, [fitHeight]);

  const onClick = (e: MouseEvent) => {
    const t = e.target as Element;
    const b = t.closest<HTMLElement>('.rd-lbl');
    if (b) {
      const r = stageRef.current!.getBoundingClientRect();
      setRipples((rs) => [...rs, { k: Date.now() + Math.random(), x: e.clientX - r.left, y: e.clientY - r.top }]);
      setSel((s) => ({ id: b.dataset.attr as AttrId, n: (s?.n ?? 0) + 1 }));
      return;
    }
    if (open && t.closest('.rd-dossier')) { const d = dosRef.current!; d.style.height = d.offsetHeight + 'px'; void d.offsetHeight; d.style.height = '0px'; setOpen(false); anim(0); }
  };

  const a = sel ? attrs[sel.id] : null, ranks = sel ? RANKS[sel.id] : [];
  return (
    <div className={`rd-stage${open ? ' open' : ''}`} ref={stageRef} onClick={onClick}>
      <div className="rd-layer" ref={layerRef}>
        <div className="rd-plane">
          <svg viewBox="0 0 360 344">
            <path d={svg.shadow} fill="#000" transform="translate(7 9)" />
            {svg.rings.map((g, i) => <path key={i} d={g.d} fill={g.fill} />)}
            <path className="rd-data" d={svg.data} fill="#5c0004" transform="translate(4 5)" />
            <path className="rd-data" d={svg.data} fill="#c00008" />
          </svg>
          {ATTR_ORDER.map((id, i) => {
            const [x, y] = pt(arm(i), R * 1.03), dx = x - CX, dy = y - CY;
            const tx = dx > 30 ? -6 : dx < -30 ? -94 : -50, ty = dy > 30 ? -6 : dy < -30 ? -96 : -50;
            const at = attrs[id];
            return (
              <button key={id} className="rd-lbl" data-attr={id} style={{ left: `${(x / 360 * 100).toFixed(2)}%`, top: `${(y / 344 * 100).toFixed(2)}%`, transform: `translate(${tx}%,${ty}%) skewX(13deg) scaleY(${(1 / 1.16).toFixed(3)})` }}>
                <span className="rd-name">{ATTR[id].name}</span><b className="rd-lv">{at.level}</b><small className="rd-title">{RANKS[id][at.level - 1]}</small>
              </button>
            );
          })}
        </div>
      </div>
      <div className="rd-dossier" ref={dosRef}>
        {sel && a && (
          <div key={sel.n} style={{ display: 'contents' }}>
            <div className="ds-head"><span className="ds-name">{ATTR[sel.id].name}</span><span className="ds-lv">LV<b>{a.level}</b></span></div>
            <div className="ds-item"><div className="ds-bar"><i style={{ width: `${Math.round(a.pts / a.next * 100)}%` }} /></div><small>{a.pts} / {a.next} 点 · 距下一级还差 {a.next - a.pts} 点</small></div>
            <div className="ds-item ds-ladder">{ranks.map((t, i) => <span key={i} className={`${i < a.level ? 'got' : ''} ${i === a.level - 1 ? 'now' : ''}`}>{i + 1} · {t}</span>)}</div>
            <div className="ds-item"><b className="ds-k">精通</b> 最近 7 天该维度记录 {2 + a.level} 次 · 最常见：{COMMON[sel.id]}</div>
            <div className="ds-item"><b className="ds-k">关联成就</b> 「{ATTR[sel.id].name}的门槛」 已解锁</div>
            <button className="ds-back">◀ 返回</button>
          </div>
        )}
      </div>
      {ripples.map((r) => <span key={r.k} className="rd-ripple" style={{ left: r.x, top: r.y }} onAnimationEnd={() => setRipples((rs) => rs.filter((x) => x.k !== r.k))} />)}
    </div>
  );
}
