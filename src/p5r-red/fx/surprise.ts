/**
 * 惊喜特效层 SurpriseFx + 常驻小件（原 shared/fx.js，逐字迁移）：
 *  - 偶发惊喜（首次 7–13s，之后每 15–30s；标签页隐藏不放）：预告信 card / 剪影一闪 sil / 红眼面具 mask / 页角撕纸 tear / 斜切闪光 slash
 *  - 点击迸星 + 剪报字母碎片（8 片，.7s）
 *  - .mask5 面具常驻眨眼
 * 关闭：DevCapsule「惊喜」/ ?__fx=0 / 低动效。只动 transform/opacity，播完卸载。
 * 外壳 AppShell 调 installSurpriseFx()（返回卸载函数）；DevCapsule「放一个惊喜」调 surprise()。
 */
import { kitImg } from '@/p5r-red/lib/asset';
import { fxEnabled, isLowMotion } from '@/p5r-red/lib/prefs';
import { isWide } from '@/p5r-red/lib/layout';
import { ui } from '@/p5r-red/kit/html';

let layer: HTMLDivElement | null = null;
const ensure = () => { if (!layer || !layer.isConnected) { layer = document.createElement('div'); layer.id = 'fx-layer'; layer.setAttribute('aria-hidden', 'true'); document.body.appendChild(layer); } return layer; };
const img = (n: string, css: string) => { const i = document.createElement('img'); i.src = kitImg(n); i.alt = ''; i.style.cssText = 'position:absolute;' + css; return i; };
const SIL = ['sil_leap_red', 'sil_point_red', 'sil_cape_red', 'sil_unmask_red'];
const LET = ['A', 'K', 'M', 'R', 'S', 'X', 'EXCL', 'QMARK', 'T', 'O'];

/** 红眼面具（可眨眼）HTML（原 P5.maskHTML）。React 里用 <P5Mask/>。 */
export const maskHTML = (w = 80, tone = 'red', cls = '') => `<span class="mask5 ${cls}" data-tone="${tone}" style="width:${w}px;height:${w * (tone === 'red' ? 171 : 178) / 360}px"><img src="${kitImg('mask_' + tone + '_base')}" alt=""><img class="eo" src="${kitImg('mask_' + tone + '_eyes_open')}" alt=""><img class="ec" src="${kitImg('mask_' + tone + '_eyes_closed')}" alt=""></span>`;
export const blink = (m: Element) => { m.classList.add('shut'); setTimeout(() => m.classList.remove('shut'), 100); };

export type SurpriseKind = 'card' | 'sil' | 'mask' | 'tear' | 'slash';
const KINDS: SurpriseKind[] = ['card', 'sil', 'mask', 'tear', 'slash'];
let last: SurpriseKind | null = null;

export function surprise(kind?: SurpriseKind): void {
  const L = ensure(), wide = isWide(), side = Math.random() < 0.5 ? 'left' : 'right';
  let k: SurpriseKind = kind || KINDS[Math.floor(Math.random() * KINDS.length)];
  if (k === last) k = KINDS[(KINDS.indexOf(k) + 1) % KINDS.length]; last = k;
  let el: HTMLElement, dur = 1200;
  if (k === 'card') {
    const cw = wide ? 210 : 124; el = img('card_flash', `top:${18 + Math.random() * 40}%;${side}:${wide ? 140 : -6}px;width:${cw}px`);
    const fx = side === 'right' ? 140 : -140, fr = side === 'right' ? 22 : -22;
    el.animate([{ opacity: 0, transform: `translateX(${fx}%) rotate(${fr}deg) scale(.7)` }, { opacity: 1, transform: `translateX(0) rotate(${-fr * 0.3}deg) scale(1.08)`, offset: 0.22 }, { transform: 'rotate(0) scale(1)', offset: 0.32 }, { opacity: 1, transform: 'rotate(0) scale(1)', offset: 0.7 }, { opacity: 0, transform: `translateX(${-fx * 0.25}%) translateY(-30%) rotate(${fr}deg) scale(.9)` }], { duration: dur, easing: 'cubic-bezier(.2,.9,.25,1)', fill: 'both' });
  } else if (k === 'sil') {
    el = img(SIL[Math.floor(Math.random() * 4)], `${side}:${wide ? '8%' : '-30px'};bottom:${10 + Math.random() * 40}%;width:${wide ? 440 : 240}px;${side === 'left' ? 'transform:scaleX(-1)' : ''}`);
    el.animate([{ opacity: 0 }, { opacity: 0.95, offset: 0.08 }, { opacity: 0.15, offset: 0.16 }, { opacity: 0.95, offset: 0.24 }, { opacity: 0.9, offset: 0.6 }, { opacity: 0 }], { duration: 900, easing: 'steps(1,end)', fill: 'both' }); dur = 900;
  } else if (k === 'mask') {
    el = document.createElement('div'); el.innerHTML = maskHTML(wide ? 150 : 100); el.style.cssText = `position:absolute;${side}:${wide ? 40 : 0}px;top:${30 + Math.random() * 30}%`;
    const fx = side === 'right' ? 120 : -120; dur = 2500;
    el.animate([{ opacity: 0, transform: `translateX(${fx}%) rotate(-12deg)` }, { opacity: 1, transform: 'translateX(0) rotate(-6deg)', offset: 0.18 }, { opacity: 1, transform: 'translateX(0) rotate(-6deg)', offset: 0.82 }, { opacity: 0, transform: `translateX(${fx}%) rotate(8deg)` }], { duration: dur, easing: 'cubic-bezier(.3,1.4,.4,1)', fill: 'both' });
    const host = el;
    setTimeout(() => { const m = host.querySelector('.mask5'); if (m) { blink(m); setTimeout(() => blink(m), 300); } }, 900);
  } else if (k === 'tear') {
    const top = Math.random() < 0.5; el = img(Math.random() < 0.5 ? 'torn_strip_red' : 'torn_strip_black', `${side}:-20px;${top ? 'top:0' : 'bottom:90px'};width:${wide ? 540 : 290}px;height:${wide ? 56 : 34}px;filter:drop-shadow(3px 4px 0 #111)`);
    const fx = side === 'right' ? 110 : -110, r = side === 'right' ? -9 : 9;
    el.animate([{ opacity: 0, transform: `translateX(${fx}%) rotate(${r}deg)` }, { opacity: 1, transform: `translateX(0) rotate(${r}deg)`, offset: 0.2 }, { opacity: 1, transform: `translateX(0) rotate(${r}deg)`, offset: 0.75 }, { opacity: 0, transform: `translateY(40px) rotate(${r * 2.4}deg)` }], { duration: dur, easing: 'cubic-bezier(.2,.9,.25,1)', fill: 'both' });
  } else {
    el = document.createElement('div'); el.className = 'fx-slash'; dur = 420;
    el.animate([{ backgroundPosition: '110% 0' }, { backgroundPosition: '-30% 0' }], { duration: dur, easing: 'linear', fill: 'both' });
  }
  L.appendChild(el); setTimeout(() => el.remove(), dur + 60);
}

/** 安装：偶发惊喜计时 + 点击迸星 + 面具眨眼。返回卸载函数。 */
export function installSurpriseFx(): () => void {
  let timer = 0;
  const schedule = (first: boolean) => { timer = window.setTimeout(() => { if (fxEnabled() && !document.hidden) surprise(); schedule(false); }, first ? 7000 + Math.random() * 6000 : 15000 + Math.random() * 15000); };
  schedule(true);
  const blinkT = window.setInterval(() => {
    if (isLowMotion()) return;
    document.querySelectorAll('.mask5').forEach((m) => { if (Math.random() < 0.35) { blink(m); if (Math.random() < 0.3) setTimeout(() => blink(m), 260); } });
  }, 2200);
  const onDown = (e: PointerEvent) => {
    const t = e.target as Element | null;
    if (!fxEnabled() || t?.closest?.('input,textarea,select')) return;
    const L = ensure(), host = document.createElement('span'); host.style.cssText = `position:absolute;left:${e.clientX}px;top:${e.clientY}px`;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.random() * 0.6, d = 36 + Math.random() * 46, letter = i % 4 === 3;
      let p: HTMLElement;
      if (letter) p = img('L_' + LET[Math.floor(Math.random() * LET.length)], `left:0;top:0;height:${16 + Math.random() * 6}px;filter:drop-shadow(1.5px 2px 0 #111)`);
      else { p = document.createElement('span'); const s = 9 + Math.random() * 9; p.style.cssText = `position:absolute;left:0;top:0;width:${s}px;height:${s}px`; p.innerHTML = ui.star(Math.random() < 0.6 ? '#D7000F' : '#F2E9DA', '#111', 2, 'fx-star'); }
      host.appendChild(p);
      p.animate([{ transform: 'translate(-50%,-50%) scale(.3) rotate(0)', opacity: 1 }, { opacity: 1, offset: 0.7 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(1) rotate(${(Math.random() - 0.5) * 220}deg)`, opacity: 0 }], { duration: 700, easing: 'cubic-bezier(.15,.8,.3,1)', fill: 'both' });
    }
    L.appendChild(host); setTimeout(() => host.remove(), 760);
  };
  document.addEventListener('pointerdown', onDown, { passive: true });
  return () => { clearTimeout(timer); clearInterval(blinkT); document.removeEventListener('pointerdown', onDown); };
}
