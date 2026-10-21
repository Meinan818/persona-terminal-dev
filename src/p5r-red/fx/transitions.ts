/**
 * 页面间 P5R 转场 + Cut-in 舞台（原 shared/transitions.js，参数逐项沿用 P5_MOTION_SPEC.md）。
 * 命令式实现（直接挂到 document.body，播完卸载），与原生逐帧一致；外壳 / 页面都可调用：
 *
 *   waterNav(origin, swap)        §2 底栏/侧栏切页：两圈水波纹 + 新页从指尖揭示 540ms（transform/opacity，见 P0-14；swap 返回新页元素）
 *   starTear(swap)                §3「仪式点」跳页：红黑斜刀 + 纸条 + TAKE YOUR TIME 字砖 + 星印，260ms 切页，14 尖星幕收缩
 *   cutIn(card, { autoMs, sfx })  §4 庆祝舞台（card：HTML 字符串 或 ReactNode）
 *   cutInTodoDone(title, gain)    今日完成（TodoCompleteP5）
 * 页面里一般不直接调 waterNav/starTear，而是 shellBus.navigate(id, { via: 'water' | 'tear' })。
 * 低动效（isLowMotion）时：转场同步切页、Cut-in 仍出现但不做入场动效。
 */
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { shape } from '@/p5r-red/lib/shape';
import { lerp } from '@/p5r-red/lib/rng';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import { spring } from './spring';
import { slamTiles } from './motion';
import { sfx as playSfx, type SfxKey } from './sfx';
import { ui } from '@/p5r-red/kit/html';

let busy = false;
export type Origin = { x: number; y: number };

/* ── §2 水波纹 + 圆形揭示 ── */
export function waterNav(origin: Origin, swap: () => HTMLElement | null | void): void {
  const w = innerWidth, h = innerHeight;
  const ox = Math.min(Math.max(origin.x, 0), w), oy = Math.min(Math.max(origin.y, 0), h);
  const R0 = isLowMotion();
  if (!R0) {
    const full = Math.hypot(Math.max(ox, w - ox), Math.max(oy, h - oy)) * 2.1, k = Math.min(1.5, Math.max(0.8, Math.min(w, h) / 390));
    ([[41, 1, 0.5, 0, 0.72, '#d71920', 0.78], [65, 0.86, 0.62, 0.07, 0.62, '#131313', 0.55]] as const).forEach(([lw, reach, d, delay, o, col, a]) => {
      const dia = Math.round(full * reach * 0.63), c = document.createElement('canvas'); c.width = c.height = 512;
      const g = c.getContext('2d')!, s = 512 / dia; g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = lw * k * s;
      g.beginPath(); g.arc(256, 256, 256 - lw * k * s / 2, 0, 7); g.stroke();
      Object.assign(c.style, { position: 'fixed', left: ox + 'px', top: oy + 'px', width: dia + 'px', height: dia + 'px', pointerEvents: 'none', zIndex: '9999' });
      document.body.appendChild(c); const dur = Math.round(d * 0.53 * 1000), from = Math.max(0.03, 76 / dia);
      c.animate([{ transform: `translate(-50%,-50%) scale(${from})` }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: dur, delay: delay * 1000, easing: 'cubic-bezier(.55,.06,.68,.19)', fill: 'both' });
      c.animate([{ opacity: o }, { opacity: o * 0.88, offset: 0.6 }, { opacity: o * 0.46, offset: 0.88 }, { opacity: 0 }], { duration: dur, delay: delay * 1000, fill: 'both' }).onfinish = () => c.remove();
    });
  }
  const el = swap();
  if (!el || R0) return;
  // P0-14 / fx-circle-reveal：原生是 clip-path circle 0→R 540ms（违反「只动 transform/opacity」）。
  // React 版改为：新页以指尖为原点 scale .9→1 + opacity 0→1，540ms cubic-bezier(.3,0,.2,1)；水波纹两圈不变。低动效同步切页。
  const r = el.getBoundingClientRect();
  el.style.transformOrigin = `${ox - r.left}px ${oy - r.top}px`;
  el.animate([{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 540, easing: 'cubic-bezier(.3,0,.2,1)' })
    .onfinish = () => { el.style.transformOrigin = ''; };
}

/* ── §3 星形反撕 ── */
const buildStar = (cx: number, cy: number, spikes: number, oR: number, iR: number, jit: number, seed: number) => {
  const rnd = (s: number) => { const x = Math.sin(s * 99991.1234) * 43758.5453; return x - Math.floor(x); };
  const v: [number, number][] = [];
  for (let i = 0; i < spikes * 2; i++) { const a = i / (spikes * 2) * Math.PI * 2 - Math.PI / 2, j = 1 + (rnd(seed + i * 1.37) - 0.5) * jit, r = (i % 2 ? iR : oR) * j; v.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return v;
};
const TYT: [string, number?, number?][] = [['T', 25, -6], ['A', 20, 5], ['K', 23, -3], ['E', 19, 7], [' '], ['Y', 20, -7], ['O', 24, 4], ['U', 19, -4], ['R', 22, 6], [' '], ['T', 23, -5], ['I', 18, 8], ['M', 25, -4], ['E', 20, 5]];
const TYT_PAL = [['#f0e9df', '#c00008'], ['#c00008', '#f8f8f6'], ['#9b9791', '#050505'], ['#f0e9df', '#050505']];

export function starTear(swap: () => void): void {
  if (busy || isLowMotion()) { swap(); return; }
  busy = true;
  const w = innerWidth, h = innerHeight, M = Math.max(w, h), k = Math.min(1.6, Math.max(1, Math.min(w, h) / 390));
  const cur = document.createElement('div');
  cur.style.cssText = 'position:fixed;inset:0;z-index:9990;overflow:hidden;pointer-events:all';
  const bar = (bg: string, d: number) => { const b = document.createElement('i'); b.style.cssText = `position:absolute;top:-20%;bottom:-20%;left:-30%;width:160%;background:${bg};transform:translateX(-140%) skewX(-20deg)`; cur.appendChild(b); b.animate([{ transform: 'translateX(-140%) skewX(-20deg)' }, { transform: 'translateX(0) skewX(-20deg)' }], { duration: 180, delay: d, easing: 'cubic-bezier(.215,.61,.355,1)', fill: 'both' }); };
  bar('#c00008', 0); bar('#0b0b12', 40);
  (cur.children[1] as HTMLElement).style.clipPath = 'polygon(0 54%, 100% 40%, 100% 100%, 0 100%)';
  const paper = document.createElement('i'); paper.style.cssText = 'position:absolute;inset:0;background:#f0e9df;clip-path:polygon(0 46%,100% 34%,100% 44%,0 56%)'; cur.appendChild(paper);
  paper.animate([{ transform: 'translateX(150%)' }, { transform: 'none' }], { duration: 200, delay: 60, easing: 'cubic-bezier(.215,.61,.355,1)', fill: 'both' });
  const st = document.createElement('div'); const S = 190 * k;
  st.style.cssText = `position:absolute;left:50%;top:50%;width:${S}px;height:${S}px;margin:${-S / 2}px 0 0 ${-S / 2}px`;
  st.innerHTML = `<svg viewBox="0 0 100 100" width="100%" height="100%"><polygon points="${shape.starPts(50, 52, 50)}" fill="#f0e9df"/><polygon points="${shape.starPts(50, 52, 41)}" fill="#050505"/><polygon points="${shape.starPts(50, 52, 33)}" fill="#c00008"/></svg>`;
  cur.appendChild(st);
  st.animate([{ transform: 'scale(0) rotate(-40deg)' }, { transform: 'scale(1.12) rotate(-12deg)', offset: 0.7 }, { transform: 'scale(1) rotate(-8deg)' }], { duration: 180, delay: 140, easing: 'ease-out', fill: 'both' });
  const row = document.createElement('div'); row.style.cssText = `position:absolute;left:3.5%;top:66%;display:flex;align-items:flex-end;gap:${3 * k}px;transform:rotate(-13deg);transform-origin:left center`;
  let ci = 0;
  TYT.forEach(([ch, fs = 0, rot = 0]) => {
    if (ch === ' ') { const s = document.createElement('span'); s.style.width = 10 * k + 'px'; row.appendChild(s); return; }
    const [bg, fg] = TYT_PAL[ci % 4]; const t = document.createElement('span'); const F = fs * k;
    t.textContent = ch; t.style.cssText = `display:grid;place-items:center;width:${F + 9}px;height:${F + 13}px;font:900 ${F}px/1 var(--f-title);background:${bg};color:${fg};box-shadow:2.5px 2.5px 0 rgba(0,0,0,.5);transform:rotate(${rot}deg)`;
    row.appendChild(t); t.animate([{ transform: `translateY(130%) rotate(${rot}deg)`, opacity: 0 }, { transform: `translateY(0) rotate(${rot}deg)`, opacity: 1 }], { duration: 150, delay: 120 + ci * 13, easing: 'cubic-bezier(.34,2,.64,1)', fill: 'both' }); ci++;
  });
  cur.appendChild(row);
  document.body.appendChild(cur);
  setTimeout(() => swap(), 260);
  setTimeout(() => {
    const A = buildStar(w / 2, h / 2, 14, M * 2.2, M * 1.18, 0.42, 23), B = buildStar(w / 2, h / 2, 14, 4, 2, 0.2, 7), t0 = performance.now(), ms = 380;
    cur.style.pointerEvents = 'none';
    const fr = (now: number) => {
      const p = Math.min(1, (now - t0) / ms), e = p * p;
      cur.style.clipPath = 'polygon(' + A.map((a, i) => `${a[0] + (B[i][0] - a[0]) * e}px ${a[1] + (B[i][1] - a[1]) * e}px`).join(',') + ')';
      if (p < 1) requestAnimationFrame(fr); else { cur.remove(); busy = false; }
    };
    fr(t0);
  }, 340);
}

/* ── §4 Cut-in 舞台 ── */
export interface CutInOpts { autoMs?: number; sfx?: SfxKey; onClose?: () => void }
export function cutIn(card: string | ReactNode, { autoMs = 3000, sfx = 'success', onClose }: CutInOpts = {}): HTMLElement {
  playSfx(sfx, 0.54);
  const low = isLowMotion();
  const veil = document.createElement('div');
  veil.style.cssText = 'position:fixed;inset:0;background:rgba(4,4,4,.74);display:grid;place-items:center;overflow:hidden;z-index:9000';
  const bands = document.createElement('div'); const D = Math.min(780, Math.max(innerWidth, innerHeight) * 1.1);
  bands.style.cssText = `position:absolute;width:${D}px;height:${D}px;left:50%;top:50%;margin:${-D / 2}px 0 0 ${-D / 2}px;pointer-events:none`;
  const cols = ['#2a0003', '#5c0004', '#110000', '#8e0010', '#1a0000', '#5c0004', '#000', '#8e0010', '#2a0003'];
  bands.innerHTML = `<svg viewBox="0 0 100 100" width="100%" height="100%">${cols.map((c, i) => `<polygon points="${shape.starPts(50, 52, 49 * (1 - i * 0.085))}" fill="${c}"/>`).join('')}</svg>`;
  const lines = document.createElement('div'); lines.className = 'cut-lines';
  const gate = document.createElement('i'); gate.style.cssText = 'position:absolute;top:-10%;bottom:-10%;left:0;width:150%;background:#D7000F;clip-path:polygon(0 0,100% 0,84% 100%,0 100%);pointer-events:none';
  const shake = document.createElement('div'); shake.style.cssText = 'position:relative;display:grid;place-items:center';
  const cardEl = document.createElement('div'); cardEl.className = 'cut-card'; cardEl.style.opacity = '0';
  let root: ReturnType<typeof createRoot> | null = null;
  if (typeof card === 'string') cardEl.innerHTML = card;
  else { root = createRoot(cardEl); root.render(card as ReactNode); }
  shake.appendChild(cardEl);
  const bar = document.createElement('i'); bar.style.cssText = 'position:absolute;left:0;right:0;bottom:0;height:7px;background:#D7000F;transform-origin:left';
  const x = document.createElement('button'); x.textContent = '✕'; x.setAttribute('aria-label', '关闭');
  x.style.cssText = 'position:absolute;right:18px;top:18px;width:44px;height:44px;background:#F2E9DA;color:#111;font:900 22px/1 var(--f-title);clip-path:polygon(12% 0,100% 8%,88% 100%,0 90%);box-shadow:3px 4px 0 #111;transform:scale(0)';
  veil.append(bands, lines, gate, shake, bar, x);
  document.body.appendChild(veil);
  if (low) {
    cardEl.style.opacity = '1'; x.style.transform = 'rotate(-4deg)'; gate.remove(); lines.remove();
    veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: 'both' });
  } else {
    veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: 'both' });
    bands.animate([{ transform: 'scale(.42) rotate(-22deg)', opacity: 0 }, { transform: 'scale(1) rotate(-9deg)', opacity: 1 }], { duration: 850, delay: 60, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
    gate.animate([{ transform: 'translateX(-120%)' }, { transform: 'translateX(130%)' }], { duration: 600, easing: 'cubic-bezier(.72,0,.28,1)', fill: 'both' });
    lines.animate([{ transform: 'translate(-50%,-50%) scale(.3) rotate(0)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1) rotate(2.2deg)', opacity: 1, offset: 0.32 }, { transform: 'translate(-50%,-50%) scale(1.12) rotate(7deg)', opacity: 0 }], { duration: 780, delay: 140, easing: 'cubic-bezier(0,0,.58,1)', fill: 'both' });
    [0.18, 0.42, 0.66].forEach((d) => { const r = document.createElement('div'); r.className = 'cut-ring'; r.innerHTML = `<svg viewBox="0 0 100 100"><polygon points="${shape.starPts(50, 52, 46)}" fill="none" stroke="#7d0007" stroke-width="2.4"/></svg>`; veil.insertBefore(r, shake); r.animate([{ transform: 'translate(-50%,-50%) scale(.22)', opacity: 0 }, { opacity: 0.95, offset: 0.5 }, { transform: 'translate(-50%,-50%) scale(1.55)', opacity: 0 }], { duration: 1200, delay: d * 1000, easing: 'cubic-bezier(.16,.7,.35,1)', fill: 'both' }); });
    spring({ stiffness: 320, damping: 20, delay: 0.15, onUpdate: (p) => { cardEl.style.transform = `scale(${lerp(1.75, 1, p)}) rotate(${lerp(-13, 0, p)}deg)`; cardEl.style.opacity = String(Math.min(1, p * 1.5)); } });
    setTimeout(() => shake.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-8px,5px)' }, { transform: 'translate(7px,-4px)' }, { transform: 'translate(-4px,3px)' }, { transform: 'translate(2px,-1px)' }, { transform: 'translate(0,0)' }], { duration: 360, easing: 'linear' }), 340);
    for (let i = 0; i < 10; i++) {
      const c = document.createElement('i'), red = i % 2, star = i % 3 === 0;
      c.style.cssText = `position:absolute;left:50%;top:50%;width:${14 + (i % 4) * 5}px;height:${14 + (i % 4) * 5}px;background:${red ? '#D7000F' : '#111'};clip-path:${star ? `polygon(${shape.starPts(50, 52, 50).split(' ').map((p) => p.split(',').map((v) => v + '%').join(' ')).join(',')})` : 'polygon(50% 0,100% 100%,0 100%)'};pointer-events:none`;
      veil.appendChild(c); const a = (i / 10) * Math.PI * 2 + 0.3, dist = 150 + (i * 37) % 150;
      c.animate([{ transform: 'translate(-50%,-50%)', opacity: 0 }, { opacity: 1, offset: 0.16 }, { opacity: 1, offset: 0.7 }, { transform: `translate(calc(-50% + ${Math.cos(a) * dist}px), calc(-50% + ${Math.sin(a) * dist}px)) rotate(${(i % 2 ? 1 : -1) * (120 + i * 30)}deg)`, opacity: 0 }], { duration: 850, delay: 340 + i * 12, easing: 'cubic-bezier(.12,.8,.3,1)', fill: 'both' });
    }
    spring({ stiffness: 420, damping: 18, delay: 0.5, onUpdate: (p) => { x.style.transform = `scale(${p}) rotate(${lerp(-120, -4, p)}deg)`; } });
  }
  bar.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: autoMs, easing: 'linear', fill: 'both' });
  let closed = false;
  const close = () => {
    if (closed) return; closed = true; clearTimeout(t);
    cardEl.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(.72) rotate(9deg)', opacity: 0 }], { duration: 220, fill: 'both' });
    veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, delay: 80, fill: 'both' }).onfinish = () => { root?.unmount(); veil.remove(); onClose?.(); };
  };
  const t = setTimeout(close, autoMs);
  veil.onclick = close;
  return cardEl;
}

/** 今日完成 Cut-in（§4 TodoCompleteP5）：红面板 + 圆环外扩 + 纸白巨星 + 黑勾 + 纸条 */
export function cutInTodoDone(title: string, gain: string): void {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
  const card = cutIn(`
    <div class="cut-panel">
      <div class="cut-rings"></div>
      <svg class="cut-bigstar" viewBox="0 0 100 100"><polygon points="${shape.starPts(50, 53, 48)}" fill="#F2E9DA" stroke="#111" stroke-width="3"/><path class="cut-check" d="M30 52 L45 66 L72 36" fill="none" stroke="#111" stroke-width="9" stroke-linecap="square" pathLength="1"/></svg>
      <div class="cut-head">${ui.ransom('CLEAR!', { h: 46, seed: 4 })}</div>
      <div class="cut-strip"><b>今日完成</b><span>${esc(title)}</span><em>${esc(gain)}</em></div>
    </div>`);
  if (isLowMotion()) return;
  const big = card.querySelector<SVGElement>('.cut-bigstar')!, chk = card.querySelector<SVGPathElement>('.cut-check')!, strip = card.querySelector<HTMLElement>('.cut-strip')!;
  big.style.transform = 'scale(0) rotate(60deg)';
  spring({ stiffness: 250, damping: 16, delay: 0.3, onUpdate: (p) => { big.style.transform = `scale(${p}) rotate(${lerp(60, -13, p)}deg)`; } });
  chk.style.strokeDasharray = '1'; chk.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 400, delay: 620, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'both' });
  strip.style.transform = 'translateX(-34px) rotate(-5deg)'; strip.style.opacity = '0';
  spring({ stiffness: 340, damping: 20, delay: 0.72, onUpdate: (p) => { strip.style.opacity = String(Math.min(1, p * 2)); strip.style.transform = `translateX(${lerp(-34, 0, p)}px) rotate(${lerp(-5, -1.2, p)}deg)`; } });
  slamTiles(card.querySelectorAll('.cut-head img'), 0.045);
}
