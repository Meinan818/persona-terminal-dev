/**
 * 羁绊专辑墙（真实 ConfidantAlbumWall p3 分支 + WallSpinBackdrop#P3SwitchRipple）。
 *   · 3D 塔罗 cover flow：中央卡单击翻面（背面档案 + 祈愿 / 档案键）、横拖实时一张张切（STEP_X 92）、两侧卡点按 = 跳到它、
 *     下滑 >12px 松手打开档案（位移封顶 20）、上滑橡皮筋翻角（封顶 15）、背面横拖 >90 翻回、快甩多切一张；键盘 ←/→/Enter。
 *   · 手势：容器统一 pointer 处理；**pointerdown 时就记下命中的 targetIdx**（容器 setPointerCapture 之后 pointerup 的 target 会变成容器）。
 *   · 弹簧 stiffness 260 / damping 28；touch-none；虚拟化 ±3；两侧渐暗罩。
 *   · p3：跳卡条在铭牌上方；铭牌 = 罗马·牌名·正逆眉签 + 蓝斜片 + 大名字 + LV 蓝斜块（臂章红角）+ 属性冰白斜块 + 关系描述；提示行带青双三角。
 *   · 换卡水波：每翻一张从铭牌处推开两圈同心环（key=index 重挂）。
 *   · 低动效（D0）：横向 snap 列表。
 * 牌序：已缔结在线 → 未缔结好友 → 离线 → 归档 → 空白牌。
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import type { CloudProfile, Confidant } from '@real/types';
import { P3R, slantClip, tickClip } from '@blue/kit';
import { useBoldness } from '@blue/lib/prefs';
import { ATTR_NAMES, MAX_INTIMACY, TAROT_BY_ID, levelProgress } from './arcana';
import { NameFx, OnlineStar, PactTag, Tarot } from './ui';

export interface PrayerState { alreadyPrayed: boolean; waitingReciprocity: boolean; pending: boolean; onPray: () => void }
export interface FriendItem { kind: 'friend'; id: string; profile: CloudProfile; prayed: boolean; beenPrayedBy: boolean; face?: string }
export type WallItem = Confidant | FriendItem | 'add';
export const isFriend = (x: WallItem): x is FriendItem => x !== 'add' && (x as FriendItem).kind === 'friend';
const idOf = (x: WallItem) => (x === 'add' ? '__add__' : x.id);

const CARD_W = 182, SPACING = 88, FLIP_THRESHOLD = 90, OPEN_ARM = 12, DOWN_CAP = 20, UP_CAP = 15, STEP_X = 92;

/** 换牌水波：两圈同心环从铭牌处推开（r 补间，描边粗细恒定） */
export const P3SwitchRipple = () => {
  const bold = useBoldness();
  if (!bold) return null;
  return (
    <svg aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10" style={{ width: 460, height: 460, marginLeft: -230, marginTop: -212, overflow: 'visible' }} viewBox="0 0 460 460">
      {[0, 1].map((i) => (
        <motion.circle key={i} cx={230} cy={230} fill="none" stroke={i === 1 ? 'var(--p3r-blue)' : 'var(--p3r-cyan)'} strokeWidth={i === 1 ? 7 : 5.5}
          initial={{ r: 18, opacity: 0 }} animate={{ r: 158 + i * 70, opacity: [0, 0.5, 0.2, 0] }}
          transition={{ duration: 0.9, delay: i * 0.11, ease: [0.16, 0.7, 0.35, 1], opacity: { duration: 0.9, delay: i * 0.11, times: [0, 0.1, 0.38, 0.72] } }} />
      ))}
    </svg>
  );
};

/** 斜切描边（border 会被 clip-path 裁掉 → 画进形状内部的四条边带；斜边带厚 ≥ 斜切量） */
const edgeBand = (color: string, slantPx: number, flatPx = 2) => [
  `linear-gradient(to right, ${color} 0 ${slantPx}px, transparent ${slantPx}px)`, `linear-gradient(to left, ${color} 0 ${slantPx}px, transparent ${slantPx}px)`,
  `linear-gradient(to bottom, ${color} 0 ${flatPx}px, transparent ${flatPx}px)`, `linear-gradient(to top, ${color} 0 ${flatPx}px, transparent ${flatPx}px)`].join(', ');

const PrayBtn = ({ p }: { p: PrayerState }) => (
  <button type="button" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); if (!p.alreadyPrayed && !p.pending) p.onPray(); }}
    disabled={p.alreadyPrayed || p.pending} aria-label={p.alreadyPrayed ? '今日已祈愿' : p.waitingReciprocity ? '回敬祈愿' : '为 Ta 祈愿'}
    className="min-w-0 flex-1 truncate py-2 text-[11px] font-black"
    style={{ clipPath: slantClip(8), backgroundColor: p.waitingReciprocity && !p.alreadyPrayed ? P3R.blue : 'transparent', color: p.alreadyPrayed ? P3R.grey : p.waitingReciprocity ? P3R.onBlue : P3R.roseInk,
      backgroundImage: edgeBand(p.alreadyPrayed ? 'var(--p3r-track)' : 'var(--p3r-blue)', 8), backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' }}>
    {p.pending ? '祈愿中…' : p.alreadyPrayed ? '今日已祈愿' : p.waitingReciprocity ? '✦ 回敬祈愿' : '✦ 祈愿'}
  </button>
);
const FADE_TAIL: CSSProperties = { WebkitMaskImage: 'linear-gradient(180deg, #000 calc(100% - 10px), transparent)', maskImage: 'linear-gradient(180deg, #000 calc(100% - 10px), transparent)' };

function CardBackFace({ c, onOpen, p }: { c: Confidant; onOpen: () => void; p?: PrayerState }) {
  const card = TAROT_BY_ID[c.arcanaId]; const prog = levelProgress(c);
  return (
    <div className="flex h-full w-full flex-col px-4 py-4" style={{ background: P3R.panel, color: P3R.ink, clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)', boxShadow: 'var(--p3r-shadow)' }}>
      <div className="flex min-w-0 items-baseline justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          {c.source === 'online' && <OnlineStar glow={!!p?.waitingReciprocity && !p.alreadyPrayed} />}
          <NameFx waiting={!!p?.waitingReciprocity && !p.alreadyPrayed} maxBond={c.intimacy >= MAX_INTIMACY} className="block truncate font-heavy text-[18px]">{c.name}</NameFx>
        </span>
        <span className="shrink-0 text-[10px] font-black" style={{ color: P3R.roseInk }}>{card?.roman} {c.orientation === 'reversed' ? '逆位' : '正位'}</span>
      </div>
      <div className="mt-0.5 text-[12px] font-bold" style={{ color: P3R.inkSoft }}>{card?.name}</div>
      {c.source === 'online' && (c.linkedProfile as { goal?: string } | undefined)?.goal && <div className="mt-1.5 truncate text-[11px] font-bold" style={{ color: P3R.inkSoft }}>◎ {(c.linkedProfile as { goal?: string }).goal}</div>}
      <div className="mt-3">
        <div className="flex items-baseline justify-between font-cond text-[12px]" style={{ color: P3R.roseInk }}><span>RANK {c.intimacy}</span><span className="tabular-nums">{prog.isMax ? 'MAX' : `${prog.inLevel}/${prog.span}`}</span></div>
        <div className="mt-1 h-1.5 overflow-hidden" style={{ background: 'var(--p3r-track)', clipPath: slantClip(3) }}><div className="h-full origin-left" style={{ width: '100%', transform: `scaleX(${prog.pct / 100})`, background: `linear-gradient(90deg, ${P3R.cyan}, ${P3R.blue})` }} /></div>
      </div>
      {c.source === 'online' && !c.archivedAt && <div className="mt-2 flex flex-wrap gap-1"><PactTag text={c.id === 'c-yukari' ? `${c.name} 今天还没打卡` : `与 ${c.name} · 已同步 ✓`} tone={c.id === 'c-yukari' ? 'warm' : 'done'} /></div>}
      {(c.description || c.aiAdvice) && (
        <div className="mt-3 min-h-0 flex-1 overflow-hidden" style={FADE_TAIL}>
          {c.description && <p className="p3r-clamp-3 text-[11px] leading-relaxed" style={{ color: P3R.inkSoft }}>{c.description}</p>}
          {c.aiAdvice && <p className="p3r-clamp-2 mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--p3r-coral-ink)' }}>✦ {c.aiAdvice}</p>}
        </div>
      )}
      <div className="mt-auto flex gap-1.5 pt-1">
        {p && <PrayBtn p={p} />}
        <button type="button" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onOpen(); }}
          className={`${p ? 'flex-1' : 'w-full'} min-w-0 truncate py-2 text-[12px] font-black`} style={{ clipPath: slantClip(8), background: P3R.blue, color: P3R.onBlue }}>{p ? '档案 →' : '查看档案 →'}</button>
      </div>
    </div>
  );
}

function FriendFace({ f }: { f: FriendItem }) {
  const name = f.profile.nickname || f.profile.userId || '?';
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)' }}>
      {f.face ? <img src={f.face} alt="" className="h-full w-full object-cover" draggable={false} /> : (
        <div className="flex h-full w-full flex-col items-center justify-center" style={{ background: 'repeating-linear-gradient(-45deg, var(--p3r-cyan-pale) 0 10px, var(--p3r-cyan-faint) 10px 20px)' }}>
          <span className="text-[40px]" aria-hidden style={{ color: P3R.blue }}>✦</span>
          <span className="mt-1 font-cond text-[64px] leading-none" style={{ color: P3R.ink }}>{name[0].toUpperCase()}</span>
        </div>
      )}
      <span className="absolute right-3 top-3 px-1.5 text-[10px] font-black" style={{ background: P3R.panel, color: P3R.roseInk, clipPath: slantClip(4), backgroundImage: edgeBand('var(--p3r-blue)', 4, 1) }}>未缔结</span>
    </div>
  );
}

function FriendBack({ f, p, onProfile, onPropose, onCrop }: { f: FriendItem; p: PrayerState; onProfile: () => void; onPropose: () => void; onCrop: () => void }) {
  const name = f.profile.nickname || f.profile.userId || '未命名客人';
  const stop = { onPointerDown: (e: React.PointerEvent) => e.stopPropagation(), onPointerUp: (e: React.PointerEvent) => e.stopPropagation() };
  return (
    <div className="flex h-full w-full flex-col px-4 py-4" style={{ background: P3R.panel, color: P3R.ink, clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)', boxShadow: 'var(--p3r-shadow)' }}>
      <div className="flex min-w-0 items-baseline justify-between gap-2"><span className="flex min-w-0 items-center gap-1"><OnlineStar glow={p.waitingReciprocity && !p.alreadyPrayed} /><span className="truncate font-heavy text-[18px]">{name}</span></span><span className="shrink-0 font-cond text-[11px]" style={{ color: P3R.roseInk }}>GUEST</span></div>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-[12px] font-bold" style={{ color: P3R.inkSoft }}>
        <button type="button" {...stop} onClick={(e) => { e.stopPropagation(); onProfile(); }} className="min-w-0 max-w-full break-all text-left underline decoration-dashed underline-offset-2" style={{ textDecorationColor: 'var(--p3r-blue)' }}>@{f.profile.userId ?? '—'}</button>
        <span className="shrink-0 font-cond">LV {f.profile.totalLv ?? '—'}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1"><PactTag text={`与 ${name}`} /></div>
      <p className="mt-3 text-[11px] leading-relaxed" style={{ color: P3R.inkSoft }}>还未缔结 COOP 契约——两张塔罗尚未互相照亮。递出契约，Ta 就会正式落座这面墙。</p>
      <div className="mt-auto space-y-1.5">
        <div className="flex gap-1.5">
          <PrayBtn p={p} />
          <button type="button" {...stop} onClick={(e) => { e.stopPropagation(); onPropose(); }} className="min-w-0 flex-1 truncate px-1 py-2 text-[11px] font-black" style={{ clipPath: slantClip(8), background: P3R.blue, color: P3R.onBlue }}>缔结 COOP</button>
        </div>
        <button type="button" {...stop} onClick={(e) => { e.stopPropagation(); onCrop(); }} className="w-full py-1.5 text-[11px] font-black" style={{ clipPath: slantClip(6), background: P3R.cyanFaint, color: P3R.roseInk }}>✂ 裁切卡面</button>
      </div>
    </div>
  );
}

const BlankCard = () => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-3" style={{ clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)', background: 'var(--p3r-blank)', color: P3R.roseInk, backgroundImage: edgeBand('rgb(var(--p3r-cyan-rgb) / 0.8)', 2, 2) }}>
    <span className="text-5xl font-thin leading-none">+</span>
    <span className="text-[12px] font-black tracking-wide">缔结新的羁绊</span>
  </div>
);

const TriPair = () => (
  <span aria-hidden className="flex items-center gap-[3px]">
    <span className="h-0 w-0 border-y-[4px] border-r-[6px] border-y-transparent" style={{ borderRightColor: 'var(--p3r-cyan)' }} />
    <span className="h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent" style={{ borderLeftColor: 'var(--p3r-cyan)' }} />
  </span>
);

function WallScrubber({ items, index, onJump }: { items: WallItem[]; index: number; onJump: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null); const drag = useRef(false);
  const pick = (x: number) => { const r = ref.current?.getBoundingClientRect(); if (!r || !r.width) return index; return Math.max(0, Math.min(items.length - 1, Math.round(((x - r.left) / r.width) * (items.length - 1)))); };
  return (
    <div ref={ref} className="relative flex h-9 cursor-pointer touch-none items-center gap-[3px]" role="slider" aria-label="快速跳卡" aria-valuemin={0} aria-valuemax={items.length - 1} aria-valuenow={index} tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'ArrowLeft') onJump(index - 1); if (e.key === 'ArrowRight') onJump(index + 1); }}
      onPointerDown={(e) => { drag.current = true; onJump(pick(e.clientX)); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ } }}
      onPointerMove={(e) => { if (drag.current) onJump(pick(e.clientX)); }} onPointerUp={() => { drag.current = false; }} onPointerCancel={() => { drag.current = false; }}>
      {items.map((it, i) => {
        const active = i === index;
        return (
          <div key={idOf(it)} className="flex flex-1 items-center justify-center">
            {it === 'add' ? <motion.div aria-hidden className="rounded-full border-2" animate={{ width: active ? 12 : 8, height: active ? 12 : 8 }} style={{ borderColor: active ? 'var(--p3r-blue)' : 'rgb(var(--p3r-cyan-rgb) / 0.7)' }} />
              : <motion.div aria-hidden animate={{ width: active ? 7 : 3, height: active ? 24 : 10 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  style={{ background: active ? 'var(--p3r-blue)' : isFriend(it) ? 'rgb(var(--p3r-cyan-rgb) / 0.9)' : 'rgb(var(--p3r-grey-rgb) / 0.45)', transform: 'skewX(-14deg)' }} />}
          </div>
        );
      })}
    </div>
  );
}

export function AlbumWall({ confidants, friends, canCreate, prayerFor, friendPrayer, onOpenDetail, onCreate, onOpenFriend, onPropose, onCropFriend, autoDemo = false, initialFlipped = false }: {
  confidants: Confidant[]; friends: FriendItem[]; canCreate: boolean; prayerFor: (c: Confidant) => PrayerState | undefined; friendPrayer: (f: FriendItem) => PrayerState;
  onOpenDetail: (c: Confidant) => void; onCreate: () => void; onOpenFriend: (f: FriendItem) => void; onPropose: (f: FriendItem) => void; onCropFriend: (f: FriendItem) => void;
  /** 演出直达：自动每 620ms 翻一张（WallSpinBackdrop 演出） */ autoDemo?: boolean; initialFlipped?: boolean;
}) {
  const bold = useBoldness();
  const vh = typeof window !== 'undefined' ? window.innerHeight : 844;
  const vScale = vh < 760 ? Math.max(0.72, vh / 760) : 1;
  const cw = Math.round(CARD_W * vScale); const ch = Math.round(cw * 1.6);
  const spacing = Math.round(SPACING * vScale); const stepX = Math.round(STEP_X * vScale);
  const bonded = confidants.filter((c) => !c.archivedAt && c.source === 'online');
  const offline = confidants.filter((c) => !c.archivedAt && c.source !== 'online');
  const archived = confidants.filter((c) => !!c.archivedAt);
  const items: WallItem[] = [...bonded, ...friends, ...offline, ...archived, ...(canCreate ? (['add'] as const) : [])];
  const count = items.length;
  const [centerId, setCenterId] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(initialFlipped);
  const [dragRot, setDragRot] = useState(0); const [slideX, setSlideX] = useState(0); const [dragY, setDragY] = useState(0); const [dragDown, setDragDown] = useState(0);
  const anchored = centerId ? items.findIndex((it) => idOf(it) === centerId) : 0;
  const index = anchored === -1 ? 0 : anchored;
  const go = (n: number) => { const c = Math.max(0, Math.min(count - 1, n)); if (c !== index) { setFlipped(false); setCenterId(idOf(items[c])); } };
  const goRef = useRef(go); goRef.current = go;
  useEffect(() => { if (!autoDemo) return; let i = 0; const t = window.setInterval(() => { i = (i + 1) % Math.max(1, count); goRef.current(i); }, 620); return () => clearInterval(t); }, [autoDemo, count]);

  const g = useRef<{ mode: 'flip' | 'slide' | null; startX: number; startY: number; startT: number; targetIdx: number | null; axis: 'x' | 'y' | null; startIndex: number }>({ mode: null, startX: 0, startY: 0, startT: 0, targetIdx: null, axis: null, startIndex: 0 });
  const onPointerDown = (e: React.PointerEvent) => {
    const el = (e.target as HTMLElement).closest('[data-wall-idx]');
    const idx = el ? Number(el.getAttribute('data-wall-idx')) : null;
    g.current = { mode: idx === index ? 'flip' : 'slide', startX: e.clientX, startY: e.clientY, startT: performance.now(), targetIdx: idx, axis: null, startIndex: index };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* noop */ }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = g.current; if (!s.mode) return;
    const dx = e.clientX - s.startX; const dy = e.clientY - s.startY;
    if (s.mode === 'flip') {
      if (!s.axis && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) s.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (s.axis === 'y') {
        if (dy > 0 && items[index] !== 'add') { setDragDown(Math.min(DOWN_CAP, dy * 0.5)); setDragY(0); }
        else if (dy < 0) { setDragY(Math.max(-UP_CAP, dy * 0.5)); setDragDown(0); }
      } else if (s.axis === 'x') {
        if (flipped) { setDragRot(Math.max(-170, Math.min(170, dx * 0.42))); setSlideX(0); }
        else { const n = Math.round(-dx / stepX); go(s.startIndex + n); setSlideX(dx + n * stepX); setDragRot(0); }
      }
    } else { const n = Math.round(-dx / stepX); go(s.startIndex + n); setSlideX(dx + n * stepX); }
  };
  const endGesture = (e: React.PointerEvent) => {
    const s = g.current; if (!s.mode) return;
    const dx = e.clientX - s.startX; const dy = e.clientY - s.startY; const dt = Math.max(1, performance.now() - s.startT);
    const isTap = Math.abs(dx) < 8 && Math.abs(dy) < 8;
    if (e.type !== 'pointercancel') {
      if (s.mode === 'flip') {
        const item = items[index];
        if (isTap) { if (item === 'add') onCreate(); else setFlipped((f) => !f); }
        else if (s.axis === 'y' && dy > 0) { if (Math.min(DOWN_CAP, dy * 0.5) >= OPEN_ARM && item && item !== 'add') { if (isFriend(item)) onOpenFriend(item); else onOpenDetail(item); } }
        else if (s.axis === 'x') { if (flipped) { if (Math.abs(dx) > FLIP_THRESHOLD) setFlipped(false); } else { const v = dx / dt; if (Math.abs(v) > 0.5) go(index + (v < 0 ? 1 : -1)); } }
      } else if (isTap && s.targetIdx !== null) go(s.targetIdx);
      else { const v = dx / dt; if (Math.abs(v) > 0.5) go(index + (v < 0 ? 1 : -1)); }
    }
    setDragRot(0); setDragY(0); setDragDown(0); setSlideX(0);
    g.current.mode = null;
  };

  // ── D0 降级：横向 snap 列表 ──
  if (!bold) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 pt-2" style={{ scrollSnapType: 'x mandatory' }} aria-label="羁绊专辑墙">
        {items.map((it) => it === 'add' ? (
          <button key="add" type="button" onClick={onCreate} className="shrink-0" style={{ width: cw * 0.8, height: ch * 0.8, scrollSnapAlign: 'center' }}><BlankCard /></button>
        ) : isFriend(it) ? (
          <button key={it.id} type="button" onClick={() => onOpenFriend(it)} className="shrink-0" style={{ width: cw * 0.8, height: ch * 0.8, scrollSnapAlign: 'center' }}><FriendFace f={it} /></button>
        ) : (
          <button key={it.id} type="button" onClick={() => onOpenDetail(it)} className="shrink-0 text-center" style={{ scrollSnapAlign: 'center' }}>
            <Tarot arcanaId={it.arcanaId} reversed={it.orientation === 'reversed'} width={Math.round(cw * 0.8)} dim={!!it.archivedAt} />
            <div className="mt-1 truncate text-[12px] font-black" style={{ color: P3R.ink, maxWidth: cw * 0.8 }}>{it.name}</div>
          </button>
        ))}
      </div>
    );
  }

  const current = items[index];
  const cardH = Math.round(cw * 1.66);
  return (
    <div className="-mt-1 select-none">
      <div data-qa-allow-clip className="relative touch-none overflow-hidden outline-none" style={{ height: cardH + 22, perspective: 1100 }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endGesture} onPointerCancel={endGesture}
        tabIndex={0} role="listbox" aria-label="羁绊专辑墙"
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') go(index - 1); if (e.key === 'ArrowRight') go(index + 1);
          if (e.key === ' ') { e.preventDefault(); if (current === 'add') onCreate(); else setFlipped((f) => !f); }
          if (e.key === 'Enter' && current && current !== 'add') { if (isFriend(current)) onOpenFriend(current); else onOpenDetail(current); }
        }}>
        {items.map((it, i) => {
          const offset = i - index;
          if (Math.abs(offset) > 3) return null;
          const isCenter = offset === 0;
          const x = offset * spacing + slideX * 0.55;
          const rotY = isCenter ? (flipped ? 180 : 0) + dragRot : offset < 0 ? 38 : -38;
          const y = isCenter ? dragY + dragDown : 0;
          const rotX = isCenter ? dragY * 0.4 : 0;
          const scale = isCenter ? 1 + Math.min(0.05, dragDown / 300) : 0.78;
          return (
            <motion.div key={idOf(it)} data-wall-idx={i} role="option" aria-selected={isCenter}
              aria-label={it === 'add' ? '缔结新的羁绊' : isFriend(it) ? `${it.profile.nickname}（在线好友 · 未缔结 COOP）` : `${it.name}（${TAROT_BY_ID[it.arcanaId]?.name ?? ''}，RANK ${it.intimacy}）`}
              className="absolute left-1/2 top-3 cursor-pointer" style={{ width: cw, height: cardH, marginLeft: -cw / 2, transformStyle: 'preserve-3d', zIndex: 100 - Math.abs(offset) }}
              animate={{ x, y, rotateX: rotX, rotateY: rotY, scale }} transition={{ type: 'spring', stiffness: 260, damping: 28 }}>
              <div className="pk3-face absolute inset-0">
                {it === 'add' ? <BlankCard /> : isFriend(it) ? <FriendFace f={it} /> : <Tarot arcanaId={it.arcanaId} reversed={it.orientation === 'reversed'} width={cw} faceUrl={it.avatarAsCardFace ? (it.cardFaceDataUrl || it.customAvatarDataUrl) : undefined} dim={!!it.archivedAt} />}
                {!isCenter && <div aria-hidden className="absolute inset-0" style={{ background: 'var(--p3r-mulberry)', opacity: 0.1 + Math.abs(offset) * 0.12, clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }} />}
              </div>
              {it !== 'add' && (
                <div className="pk3-face absolute inset-0" style={{ transform: 'rotateY(180deg)' }}>
                  {isFriend(it) ? <FriendBack f={it} p={friendPrayer(it)} onProfile={() => onOpenFriend(it)} onPropose={() => onPropose(it)} onCrop={() => onCropFriend(it)} />
                    : <CardBackFace c={it} p={prayerFor(it)} onOpen={() => onOpenDetail(it)} />}
                </div>
              )}
            </motion.div>
          );
        })}
        {dragDown > 6 && current !== 'add' && (() => {
          const pr = Math.min(1, dragDown / OPEN_ARM); const armed = pr >= 1;
          return (
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-[120] flex justify-center" style={{ opacity: 0.4 + pr * 0.6 }}>
              <div className="flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-black" style={{ clipPath: slantClip(8), background: armed ? P3R.blue : P3R.ink, color: armed ? P3R.onBlue : 'var(--p3r-on-ink)' }}>↓ {armed ? '松手打开档案' : '下滑查看档案'}</div>
            </div>
          );
        })()}
      </div>

      {/* 铭牌 + 跳卡条（p3：跳卡条在铭牌上方） */}
      <div className="relative isolate mx-auto -mt-1 max-w-sm px-3">
        <P3SwitchRipple key={index} />
        {count > 1 && <div className="mb-3.5"><WallScrubber items={items} index={index} onJump={go} /></div>}
        {current === 'add' || !current ? (
          <div className="text-center"><div className="font-heavy text-[24px]" style={{ color: P3R.ink }}>缔结新的羁绊</div><div className="mt-0.5 text-[12px] font-bold" style={{ color: P3R.grey }}>点一下这张空白牌开始</div></div>
        ) : isFriend(current) ? (() => {
          const p = friendPrayer(current);
          return (
            <div className="text-center">
              <div className="font-cond text-[12px] tracking-[0.16em]" style={{ color: P3R.roseInk }}>GUEST · 未缔结 COOP</div>
              <div className="mt-0.5 flex min-w-0 items-center justify-center gap-2">
                <OnlineStar glow={p.waitingReciprocity && !p.alreadyPrayed} size={14} />
                <motion.h3 key={current.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="max-w-[80%] truncate pr-[0.18em] font-heavy text-[34px] leading-tight" style={{ color: P3R.ink }}>{current.profile.nickname || current.profile.userId || '未命名客人'}</motion.h3>
                <span className="shrink-0 px-2 py-1 font-cond text-[13px] leading-none" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(6) }}>LV {current.profile.totalLv ?? '—'}</span>
              </div>
              {p.waitingReciprocity && !p.alreadyPrayed && <p className="mx-auto mt-2 max-w-[21rem] text-[12px] font-black" style={{ color: 'var(--p3r-coral-ink)' }}>✦ 今日未回应对方祈愿</p>}
            </div>
          );
        })() : (
          <motion.div key={current.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }} className="text-center">
            <div className="flex items-center justify-center gap-2 text-[12px] font-black tracking-[0.14em]" style={{ color: P3R.roseInk }}>
              <TriPair />{TAROT_BY_ID[current.arcanaId]?.roman ? `${TAROT_BY_ID[current.arcanaId].roman} · ` : ''}{TAROT_BY_ID[current.arcanaId]?.name}{current.orientation === 'reversed' ? ' · 逆位' : ' · 正位'}
            </div>
            <div className="mt-1.5 flex min-w-0 items-center justify-center gap-2.5">
              <span aria-hidden className="h-[34px] w-[9px] shrink-0" style={{ background: P3R.blue, transform: 'skewX(-18deg)' }} />
              <h3 className="max-w-[80%] truncate pr-[0.18em] font-heavy text-[40px] leading-tight" style={{ color: P3R.ink }}>
                <NameFx waiting={!!prayerFor(current)?.waitingReciprocity && !prayerFor(current)?.alreadyPrayed} maxBond={current.intimacy >= MAX_INTIMACY}>{current.name}</NameFx>
              </h3>
            </div>
            <div className="mt-2.5 flex items-center justify-center gap-2">
              <span className="relative inline-flex items-center px-4 py-1" style={{ clipPath: slantClip(8), background: P3R.blue, color: P3R.onBlue }}>
                <span className="font-cond text-[12px] tracking-wider opacity-85">LV</span><span className="ml-1 font-cond text-[20px] leading-none tabular-nums">{current.intimacy}</span>
                <span aria-hidden className="absolute -bottom-[2px] right-1 h-[5px] w-[12px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
              </span>
              {current.skillAttribute && <span className="inline-block px-3.5 py-1 text-[13px] font-black" style={{ clipPath: slantClip(8), background: P3R.cyanPale, color: P3R.roseInk }}>{ATTR_NAMES[current.skillAttribute]}</span>}
              {current.archivedAt && <span className="inline-block px-3 py-1 text-[12px] font-black" style={{ clipPath: slantClip(8), background: 'var(--p3r-track)', color: P3R.inkSoft }}>归档</span>}
            </div>
            {current.description && <p className="p3r-clamp-2 mx-auto mt-2.5 max-w-[21rem] text-[13px] font-semibold leading-relaxed" style={{ color: P3R.inkSoft }}>{current.description}</p>}
          </motion.div>
        )}
        <div className="mt-2.5 flex items-center justify-center gap-2 text-[11px] font-black" style={{ color: P3R.roseInk }}><TriPair />左右切换 · 单击翻面 · 下滑看档案</div>
      </div>
    </div>
  );
}
