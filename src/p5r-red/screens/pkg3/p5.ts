/**
 * pkg3 命令式移植层的 P5 垫片 —— 把 v3 原生的 window.P5.* 映射到 React 工程已有的实现，
 * 让 overlays/c.js（羁绊弹层 / 演出）、overlays/d.js 据点段、pages/org.p5.js、pages/pages_a.js coop 段
 * 能按原 DOM / 类名 / 动效参数逐字迁移（吃 legacy/css 的 c.css / d.css / org.p5.css / pages.css）。
 * P5.sheet / actionSheet / longPress 为 core.js 逐字迁移（命令式版本；React 组件里请用 <P5Sheet/> 等）。
 */
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { ui } from '@/p5r-red/kit/html';
import { shape } from '@/p5r-red/lib/shape';
import { rng, lerp } from '@/p5r-red/lib/rng';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import { isWide } from '@/p5r-red/lib/layout';
import { sfx, type SfxKey } from '@/p5r-red/fx/sfx';
import { toast } from '@/p5r-red/kit/P5Toast';
import { spring } from '@/p5r-red/fx/spring';
import { panelIn, slamTiles } from '@/p5r-red/fx/motion';
import { cutIn } from '@/p5r-red/fx/transitions';
import { P5BgSVG } from '@/p5r-red/fx/bg';
import { SIL_DATA } from '@/p5r-red/fx/silData';
import { kitImg } from '@/p5r-red/lib/asset';
import { navigate } from '@/p5r-red/shell/shellBus';
import { ATTR, ATTR_ORDER, D } from '@/p5r-red/mock/data';

type SilOpts = { fill?: string; rim?: string; rw?: number; cls?: string; style?: string; flip?: boolean };
type Action = { label: string; tone?: string; onClick: () => void };

let rerenderHook: (() => void) | null = null;
/** 页面宿主登记「整页重渲染」（= 原生 P5.rerender） */
export const setRerender = (fn: (() => void) | null) => { rerenderHook = fn; };

/** 弹层根节点选择器（宿主据此判断「演出 / 弹层是否都已关闭」） */
export const LAYER_SEL = '.oc-veil,.oc-rk,.oc-cl,.oc-sf,.oc-sw,.oc-pray,.oc-ao,.sheet-veil,.asheet,.od-stage,.og-fv,.pk3-cut,.pk3-nf';

const sheet = (title: string, bodyHTML: string, { onMount, seed = 31 }: { onMount?: (sh: HTMLElement, close: () => void) => void; seed?: number } = {}) => {
  const veil = document.createElement('div'); veil.className = 'sheet-veil';
  veil.innerHTML = ui.shp('section', { cls: 'sheet', kind: 'torn', seed, tone: 'paper', attrs: 'role="dialog" aria-modal="true"' },
    `<h3>${ui.plate(title, { fs: 20 })}</h3><button class="x" aria-label="关闭">✕</button><div class="sheet-body">${bodyHTML}</div>`);
  document.body.appendChild(veil);
  const sh = veil.querySelector('.sheet') as HTMLElement;
  let closed = false;
  const close = () => { if (closed) return; closed = true; veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'both' }); sh.animate([{ transform: 'none' }, { transform: 'translateY(60px) rotate(2deg)', opacity: 0 }], { duration: 200, fill: 'both' }).onfinish = () => veil.remove(); };
  veil.addEventListener('click', (e) => { if (e.target === veil) close(); });
  (sh.querySelector('.x') as HTMLElement).onclick = close;
  const onKey = (e: KeyboardEvent) => { if (e.key !== 'Escape' || !document.contains(veil)) return; const vs = document.querySelectorAll('.sheet-veil'); if (vs[vs.length - 1] === veil) { e.stopPropagation(); close(); removeEventListener('keydown', onKey); } };
  addEventListener('keydown', onKey);
  veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: 'both' });
  if (!isLowMotion()) {
    const gate = document.createElement('i'); gate.style.cssText = 'position:absolute;top:-10%;bottom:-10%;left:0;width:150%;background:var(--red);clip-path:polygon(0 0,100% 0,84% 100%,0 100%);pointer-events:none;z-index:2';
    veil.appendChild(gate); gate.animate([{ transform: 'translateX(-120%)' }, { transform: 'translateX(130%)' }], { duration: 560, easing: 'cubic-bezier(.72,0,.28,1)', fill: 'both' }).onfinish = () => gate.remove();
    spring({ stiffness: 300, damping: 26, delay: 0.12, onUpdate: (p) => { sh.style.transform = `translateY(${lerp(110, 0, p)}%) rotate(${lerp(-4, 0, p)}deg)`; } });
    sh.style.transform = 'translateY(110%)';
  }
  onMount?.(sh, close);
  return close;
};

const actionSheet = (title: string, actions: Action[]) => {
  const v = document.createElement('div'); v.className = 'asheet';
  v.innerHTML = `<div class="ttl">${title}</div>` + actions.map((a, i) => ui.btn(a.label, { tone: a.tone === 'danger' ? 'red' : i % 2 ? 'ink' : 'paper', seed: 40 + i, cls: `act ${a.tone || ''}`, attrs: `data-i="${i}"`, size: 'lg' })).join('') + ui.btn('取消', { tone: 'ink', seed: 60, cls: 'act', attrs: 'data-i="-1"' });
  document.body.appendChild(v);
  const close = () => { v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'both' }).onfinish = () => v.remove(); };
  v.onclick = (e) => { const b = (e.target as HTMLElement).closest('[data-i]') as HTMLElement | null; if (!b && e.target !== v) return; close(); if (b && +b.dataset.i! >= 0) actions[+b.dataset.i!].onClick(); };
  v.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: 'both' });
  if (isLowMotion()) return;
  [...v.querySelectorAll<HTMLElement>('.act')].forEach((el, i) => { el.style.transform = 'translateX(120%) rotate(8deg)'; spring({ stiffness: 340, damping: 26, delay: 0.03 * i, onUpdate: (p) => { el.style.transform = `translateX(${lerp(120, 0, p)}%) rotate(${lerp(8, i % 2 ? 1.2 : -1.2, p)}deg)`; } }); });
};

const longPress = (el: HTMLElement, fn: (e: PointerEvent) => void, ms = 500) => {
  let t = 0, x0 = 0, y0 = 0, fired = false;
  el.addEventListener('pointerdown', (e) => { fired = false; x0 = e.clientX; y0 = e.clientY; el.classList.add('pressing'); t = window.setTimeout(() => { fired = true; el.classList.remove('pressing'); fn(e); }, ms); });
  const cancel = () => { clearTimeout(t); el.classList.remove('pressing'); };
  el.addEventListener('pointermove', (e) => { if (Math.hypot(e.clientX - x0, e.clientY - y0) > 10) cancel(); });
  (['pointerup', 'pointerleave', 'pointercancel'] as const).forEach((k) => el.addEventListener(k, cancel));
  el.addEventListener('click', (e) => { if (fired) { e.stopPropagation(); e.preventDefault(); fired = false; } }, true);
};

const sil = (n: keyof typeof SIL_DATA, { fill = 'var(--p5r-sil)', rim = 'var(--p5r-sil-rim)', rw = 5, cls = '', style = '', flip = false }: SilOpts = {}) => {
  const s = SIL_DATA[n];
  return `<svg class="sil ${cls}" viewBox="${-rw} ${-rw} ${s.w + rw * 2} ${s.h + rw * 2}" style="${style}" aria-hidden="true"${flip ? ' transform="scale(-1,1)"' : ''}><path d="${s.d}" fill="${fill}" fill-rule="evenodd" stroke="${rim}" stroke-width="${rw}" stroke-linejoin="round" paint-order="stroke"/></svg>`;
};

const maskHTML = (w = 80, tone = 'red', cls = '') => `<span class="mask5 ${cls}" data-tone="${tone}" style="width:${w}px;height:${w * (tone === 'red' ? 171 : 178) / 360}px"><img src="${kitImg('mask_' + tone + '_base')}" alt=""><img class="eo" src="${kitImg('mask_' + tone + '_eyes_open')}" alt=""><img class="ec" src="${kitImg('mask_' + tone + '_eyes_closed')}" alt=""></span>`;

/** 舞台背板：在 el 里渲染 <P5BgSVG/>（原 P5.bgSVG 字符串版），返回卸载函数 */
const bgInto = (el: HTMLElement, o: { seed?: number; wide?: boolean; fx?: number; fy?: number }) => { const r = createRoot(el); r.render(createElement(P5BgSVG, o)); return () => setTimeout(() => r.unmount(), 0); };

/** Cut-in（fx/transitions.cutIn）+ 给遮罩加 .pk3-cut 便于宿主追踪 */
const cutInP = (html: string, o: { autoMs?: number; sfx?: SfxKey; onClose?: () => void } = {}) => { const card = cutIn(html, o); const veil = card.parentElement?.parentElement; veil?.classList.add('pk3-cut'); return card; };

export const P5 = {
  ui, shape, rng, lerp,
  reduced: () => isLowMotion(),
  isWide: () => isWide(),
  sfx: (k: SfxKey, vol?: number) => sfx(k, vol),
  toast, spring, panelIn, slamTiles,
  sheet, actionSheet, longPress, sil, maskHTML, bgInto,
  cutIn: cutInP,
  ATTR, ATTR_ORDER, D,
  go: (id: string, o: { via?: 'water' | 'tear' | 'none' } = {}) => navigate(id, { via: o.via ?? 'tear' }),
  rerender: () => rerenderHook?.(),
  A: kitImg,
} as const;
export type P5T = typeof P5;
