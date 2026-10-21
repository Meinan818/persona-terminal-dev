/**
 * 庆祝 Cut-in 族（真实 src/components/p5r/cutins.tsx：LevelUpP5 05 / TodoCompleteP5 06 / UnlockCutInP5 07 + CelebrationCutIn p5 分支）。
 * 逐字迁移自 v3 overlays/a.js §7（levelUp / todoDone / unlock / celebration）——DOM、类名（.oa-*，样式在 legacy/css/a.css）、
 * 时序参数原样；舞台走 fx/transitions cutIn（§4）。命令式：直接把卡片串交给 cutIn，播完 / 点幕 / ✕ 自动卸载。
 *   levelUpP5({ attr, level, stars, onClose })     stars>0 = 精通提升 ★
 *   todoCompleteP5({ title, points, unlock, heading, onClose })   heading = 今日完成 | 记录成功 | 记账完成（SaveSuccess / LedgerSaved 复用）
 *   unlockCutInP5({ heading, name, lines, onClose })   成就解锁！/ 技能解锁！
 *   celebrationCutIn({ icon, title, subtitle, body, particles, onClose })   基座
 *   playQueue([...])   首页真实演出队列：今日完成 → 升级/精通 → 成就/技能（前一段 onClose 后接下一段）
 * 只动 transform / opacity（strokeDashoffset 勾线为 SVG 属性动画，同 v3）；低动效档 cutIn 只淡入、跳过飞入与粒子。
 */
import { useEffect } from 'react';
import { cutIn } from '@/p5r-red/fx/transitions';
import { spring } from '@/p5r-red/fx/spring';
import { lerp } from '@/p5r-red/lib/rng';
import { shape } from '@/p5r-red/lib/shape';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import { ui } from '@/p5r-red/kit/html';

const R = () => isLowMotion();
export const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/* ── 基础件（a.js 基础件的字符串版） ── */
export function rough(seed: number, { face = 'var(--red)', frame = '#111', sh = '#111', jag = 4, d = [3, 4], inset = 3 }: { face?: string; frame?: string; sh?: string; jag?: number; d?: number[]; inset?: number } = {}): string {
  const q = shape.quad;
  return `<i class="oa-r" aria-hidden="true"><i style="background:${sh};clip-path:${q(seed + 11, jag)};transform:translate(${d[0]}px,${d[1]}px)"></i><i style="background:${frame};clip-path:${q(seed, jag)}"></i><i style="background:${face};clip-path:${q(seed + 5, jag)};inset:${inset}px"></i></i>`;
}
export const starPts = (R0: number, inner?: number) => shape.starPts(50, 52, R0, -90, inner);
export function star(size: number, fill = 'var(--red)', { stroke = '', sw = 0, rot = 0, cls = '', style = '' } = {}): string {
  return `<svg class="oa-star ${cls}" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true" style="transform:rotate(${rot}deg);${style}"><polygon points="${starPts(48)}" fill="${fill}" ${stroke ? `stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="miter"` : ''}/></svg>`;
}
export const ringStar = (size: number, cls = '') => `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">${([[49, '#111'], [42, 'var(--p5r-paper)'], [34, 'var(--red)'], [24, 'var(--p5r-paper)'], [15, '#111']] as const).map(([r, c]) => `<polygon points="${starPts(r)}" fill="${c}"/>`).join('')}</svg>`;
export const xg = (s = 17, c = '#111') => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><path d="M4.6 1.8 L12 9.2 L19.4 1.8 L22.2 4.6 L14.8 12 L22.2 19.4 L19.4 22.2 L12 14.8 L4.6 22.2 L1.8 19.4 L9.2 12 L1.8 4.6 Z" fill="${c}"/></svg>`;
export function closeKey(variant: 'tile' | 'star' = 'tile', cls = ''): string {
  if (variant === 'star') return `<button type="button" class="oa-xk star ${cls}" aria-label="关闭"><svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="${starPts(49)}" fill="var(--p5r-paper)"/><polygon points="${starPts(43)}" fill="#111"/></svg><span>${xg(18, 'var(--p5r-paper)')}</span></button>`;
  return `<button type="button" class="oa-xk tile ${cls}" aria-label="关闭">${rough(471, { face: 'var(--p5r-paper)', frame: 'var(--p5r-paper)', jag: 4 })}<span class="oa-xk-in">${xg(17)}</span></button>`;
}
const CYC = [['var(--p5r-paper)', 'var(--red)'], ['var(--p5r-paper)', '#111'], ['var(--red)', '#fbf7ef'], ['#111', '#fbf7ef'], ['#9b9791', '#111']];
const TROT = [-3.5, 2.4, -2, 3, -2.8, 1.8, -3.2, 2.6], TDY = [0, 6, 2, 7, 3, 5, 1, 6];
export function collage(text: string, size = 40, cls = ''): string {
  let k = 0;
  return `<span class="oa-collage ${cls}" role="img" aria-label="${esc(text)}" style="--s:${size}px">` + [...text].map((ch) => {
    if (/[\s·、，。：；（）()「」【】…—-]/.test(ch)) return `<i class="oa-cp">${ch === ' ' ? '&nbsp;' : ch}</i>`;
    const [bg, fg] = CYC[k % 5]; const t = `<b class="oa-ct" data-r="${TROT[k % 8]}" style="background:${bg};color:${fg};transform:rotate(${TROT[k % 8]}deg);margin-top:${TDY[k % 8]}px">${ch}</b>`; k++; return t;
  }).join('') + '</span>';
}
export function slam(els: ArrayLike<Element>, gap = 45, delay = 0): void {
  if (R()) return;
  Array.from(els).forEach((el, i) => { const r = +((el as HTMLElement).dataset.r || 0); el.animate([{ transform: `rotate(${r * 3}deg) scale(1.5)`, opacity: 0 }, { transform: `rotate(${r}deg) scale(1)`, opacity: 1 }], { duration: 360, delay: delay + i * gap, easing: 'cubic-bezier(.2,1.5,.4,1)', fill: 'backwards' }); });
}

/* ── §7 Cut-in ── */
const straddle = (text: string, size: number) => `<div class="oa-straddle" style="top:${-(size * 0.56)}px">${collage(text, size)}</div>`;
const veilOf = (card: HTMLElement) => card.parentElement!.parentElement as HTMLElement;
function afterCut(card: HTMLElement, { notes = 0 } = {}): HTMLElement {
  const veil = veilOf(card);
  slam(card.querySelectorAll('.oa-straddle .oa-ct'), 45, 220);
  if (notes > 0 && !R()) {
    for (let i = 0; i < Math.min(notes, 8); i++) {
      const n = document.createElement('i'); n.className = 'oa-note-fly'; n.textContent = i % 2 ? '♫' : '♪';
      n.style.left = `${18 + ((i * 37) % 64)}%`; veil.appendChild(n);
      n.animate([{ transform: 'translateY(0) rotate(0)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: `translateY(-${180 + (i % 3) * 60}px) rotate(${i % 2 ? 18 : -18}deg)`, opacity: 0 }], { duration: 1500, delay: 500 + i * 110, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' });
    }
  }
  return veil;
}

export interface CutInCb { onClose?: () => void; autoMs?: number }
/** 05 · LevelUpP5（真实 LevelUpModal → LevelUpP5；stars>0 = 精通 ★） */
export function levelUpP5({ attr = '知识', level = 4, stars = 0, onClose, autoMs = 3600 }: { attr?: string; level?: number; stars?: number } & CutInCb = {}): HTMLElement {
  const mastery = stars > 0;
  const card = cutIn(`<div class="oa-ci oa-lv" role="dialog" aria-label="${mastery ? `精通提升！${esc(attr)} ★${stars}` : `恭喜升级！${esc(attr)} Lv.${level}`}">
      ${ui.shp('div', { cls: 'oa-lv-panel', kind: 'torn', seed: 410, tone: 'red', jag: 2.4 }, `
        <i class="oa-clip" style="clip-path:${shape.torn(415, { jag: 2.4 })}"><i class="cut-rings"></i></i>
        <div class="oa-lv-stars" aria-hidden="true">${star(228, '#8d8880', { style: 'position:absolute;left:-13px;top:10px' })}${star(228, 'var(--p5r-paper)', { style: 'position:absolute;left:0;top:0' })}</div>
        <div class="oa-lv-body">
          <span class="oa-lv-attr">${rough(411, { face: 'var(--red)', frame: '#111', jag: 5 })}<b>${esc(attr)}</b></span>
          <div class="oa-lv-row"><span class="oa-lv-chip old">${rough(414, { face: '#111', frame: 'var(--p5r-paper)', sh: '#5c0004', jag: 5 })}<b>${mastery ? `★${stars - 1}` : `Lv.${Math.max(0, level - 1)}`}</b></span><i class="oa-lv-arrow"></i><span class="oa-lv-chip new">${rough(417, { face: '#ff1a2a', frame: 'var(--p5r-paper)', jag: 5 })}<b>${mastery ? `★${stars}` : `Lv.${level}`}</b></span></div>
          <div class="oa-lv-strip">${rough(418, { face: 'var(--p5r-paper)', frame: '#111', jag: 6, d: [4, 5] })}<b>${mastery ? '满级之后，你还在往前走。' : '继续加油，你越来越强了！'}</b></div>
        </div>`)}
      ${straddle(mastery ? '精通提升！' : '恭喜升级！', 46)}
      ${closeKey('tile', 'oa-lv-x')}
    </div>`, { autoMs, sfx: 'level', onClose });
  afterCut(card);
  if (!R()) {
    const st = card.querySelector<HTMLElement>('.oa-lv-stars')!; st.style.transform = 'translateX(-50%) scale(0) rotate(-70deg)';
    spring({ stiffness: 260, damping: 17, delay: 0.3, onUpdate: (p) => { st.style.transform = `translateX(-50%) scale(${p}) rotate(${lerp(-70, 0, p)}deg)`; } });
    ([['.oa-lv-attr', 'scale(1.4)', 460], ['.oa-lv-row', 'translateY(20px)', 580], ['.oa-lv-strip', 'translateX(-26px)', 700]] as const).forEach(([s, f, d]) => card.querySelector(s)!.animate([{ transform: f, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, delay: d, easing: 'cubic-bezier(.2,1.3,.4,1)', fill: 'backwards' }));
  }
  return card;
}

/** 06 · TodoCompleteP5（TodoCompleteModal；SaveSuccessModal heading=记录成功、LedgerSavedModal heading=记账完成 复用） */
export function todoCompleteP5({ title = '晨跑 5 公里', points = 2, unlock = false, heading = '今日完成', onClose, autoMs = 3000 }: { title?: string; points?: number; unlock?: boolean; heading?: string } & CutInCb = {}): HTMLElement {
  const card = cutIn(`<div class="oa-ci oa-td" role="dialog" aria-label="${esc(heading)}：${esc(title)}">
      <div class="oa-td-panel"><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i><i class="oa-td-rings"><i class="cut-rings"></i></i>
        <div class="oa-td-star" aria-hidden="true"><svg viewBox="0 0 100 100" width="208" height="208"><defs><clipPath id="oa-chk"><polygon points="${starPts(39.5)}"/></clipPath></defs>
          <polygon points="${starPts(53)}" fill="#111" transform="translate(3 4)"/><polygon points="${starPts(52.5)}" fill="var(--p5r-paper)"/><polygon points="${starPts(46)}" fill="#111"/><polygon points="${starPts(39.5)}" fill="var(--p5r-paper)"/>
          <g clip-path="url(#oa-chk)"><polyline class="oa-td-chk" points="36,52 46,62 75,33" fill="none" stroke="#111" stroke-width="11.5" stroke-linejoin="miter" pathLength="1"/></g></svg></div>
        <div class="oa-td-strip">${rough(433, { face: 'var(--p5r-paper)', frame: '#111', jag: 5 })}<span class="oa-td-box"><svg viewBox="0 0 24 24" width="17" height="17"><polyline points="4,12 10,18 21,4" fill="none" stroke="var(--red)" stroke-width="4.6"/></svg></span><span class="oa-td-t">${esc(title)}</span>${points > 0 ? `<span class="oa-td-pts">+${points}</span>` : ''}${star(15, 'var(--red)', { cls: 's1', stroke: '#111', sw: 8, rot: -14 })}${star(12, '#111', { cls: 's2', rot: 12 })}</div>
        ${unlock ? '<p class="oa-td-unlock">★ 你解锁了新成就 / 新技能！</p>' : ''}
      </div>
      ${straddle(heading, heading.length > 4 ? 44 : 52)}
      ${closeKey('star', 'oa-td-x')}
    </div>`, { autoMs, sfx: 'success', onClose });
  afterCut(card, { notes: points });
  if (!R()) {
    const s = card.querySelector<HTMLElement>('.oa-td-star')!; s.style.transform = 'scale(0) rotate(60deg)';
    spring({ stiffness: 250, damping: 16, delay: 0.3, onUpdate: (p) => { s.style.transform = `scale(${p}) rotate(${lerp(60, -13, p)}deg)`; } });
    card.querySelector('.oa-td-chk')!.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 400, delay: 620, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'both' });
    card.querySelector('.oa-td-strip')!.animate([{ transform: 'translateX(-34px) rotate(-5deg)', opacity: 0 }, { transform: 'rotate(-1.2deg)', opacity: 1 }], { duration: 420, delay: 720, easing: 'cubic-bezier(.2,1.3,.4,1)', fill: 'backwards' });
  }
  return card;
}

/** 07 · UnlockCutInP5（AchievementUnlockModal「成就解锁！」/ SkillUnlockModal「技能解锁！」） */
export function unlockCutInP5({ heading = '成就解锁！', name = '野生之心', lines = ['恭喜你达成新成就！', '继续努力解锁更多内容'], onClose, autoMs = 4500 }: { heading?: string; name?: string; lines?: [string, string] | string[] } & CutInCb = {}): HTMLElement {
  const card = cutIn(`<div class="oa-ci oa-ul" role="dialog" aria-label="${esc(heading)}${esc(name)}">
      <i class="oa-ul-d a"></i><i class="oa-ul-d b"></i><i class="oa-ul-d c"></i>
      ${ui.shp('div', { cls: 'oa-ul-panel', kind: 'quad', seed: 450, tone: 'paper', jag: 13 }, `
        <div class="oa-ul-star">${ringStar(158)}${star(26, '#6b6862', { rot: -14, style: 'position:absolute;left:-12px;bottom:22px' })}${star(21, 'var(--red)', { rot: 12, style: 'position:absolute;right:-7px;top:12px' })}</div>
        <div class="oa-ul-name">${rough(455, { face: '#111', frame: '#111', sh: 'var(--red)', jag: 4, d: [4, 5], inset: 0 })}<b>${esc(name)}</b></div>
        <div class="oa-ul-lines"><p>${esc(lines[0])}</p><p>${esc(lines[1])}</p>${star(14, '#111')}</div>`)}
      ${straddle(heading, 42)}
      ${closeKey('star', 'oa-ul-x')}
    </div>`, { autoMs, sfx: 'level', onClose });
  afterCut(card);
  if (!R()) {
    const s = card.querySelector<HTMLElement>('.oa-ul-star')!; s.style.transform = 'scale(0) rotate(-110deg)';
    spring({ stiffness: 260, damping: 15, delay: 0.24, onUpdate: (p) => { s.style.transform = `scale(${p}) rotate(${lerp(-110, 0, p)}deg)`; } });
    card.querySelector('.oa-ul-name')!.animate([{ transform: 'scaleX(.2)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 360, delay: 460, easing: 'cubic-bezier(.2,1.2,.4,1)', fill: 'backwards' });
    card.querySelector('.oa-ul-lines')!.animate([{ transform: 'translateY(14px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 360, delay: 580, easing: 'cubic-bezier(.2,1.2,.4,1)', fill: 'backwards' });
  }
  return card;
}

/** CelebrationCutIn 基座（红舞台通用卡：icon / title / subtitle / body / 粒子 / 关闭；自动关 + 点幕 + ✕ 三通道） */
export function celebrationCutIn({ icon = '🏆', title = '逆影击破！', subtitle = '第 12 层 · 守门之影', body = '<b class="oa-cb-big">+120 SP</b><p>获得「影之残片」×3</p>', particles = 18, onClose, autoMs = 3000 }: { icon?: string; title?: string; subtitle?: string; body?: string; particles?: number } & CutInCb = {}): HTMLElement {
  const card = cutIn(`<div class="oa-ci oa-cb" role="dialog" aria-label="${esc(title)}">
      ${ui.shp('div', { cls: 'oa-cb-panel', kind: 'torn', seed: 520, tone: 'ink', jag: 2.4 }, `<div class="oa-cb-ic" aria-hidden="true">${star(120, 'var(--red)', { stroke: 'var(--p5r-paper)', sw: 4 })}<span>${icon}</span></div><p class="oa-cb-sub">${esc(subtitle)}</p><div class="oa-cb-body">${body}</div>`)}
      ${straddle(title, 40)}${closeKey('tile', 'oa-lv-x')}
    </div>`, { autoMs, sfx: 'fanfare', onClose });
  const veil = afterCut(card);
  if (!R()) for (let i = 0; i < particles; i++) {
    const p = document.createElement('i'); p.className = 'oa-confetti'; p.style.cssText = `left:${(i * 53) % 100}%;background:${['var(--red)', 'var(--p5r-paper)', '#111', 'var(--yellow)'][i % 4]}`; veil.appendChild(p);
    p.animate([{ transform: 'translateY(-10vh) rotate(0)' }, { transform: `translateY(110vh) rotate(${i % 2 ? 540 : -540}deg)` }], { duration: 1800 + (i % 5) * 300, delay: (i % 7) * 90, easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'both' });
  }
  return card;
}

/* ── 首页真实演出队列（FIXLIST 四「需特别处理」末条 / 黄色 FX-AUDIT 第 12 条） ──
   真实：完成任务 → TodoCompleteModal（含解锁提示）关闭后 → LevelUpModal（升级 / 精通）→ AchievementUnlockModal / SkillUnlockModal。
   每段在上一段 onClose 后 260ms 接上；低动效档同序，每段只淡入。 */
export type QueueStep =
  | { kind: 'todo'; title: string; points: number; unlock?: boolean; heading?: string }
  | { kind: 'level'; attr: string; level: number; stars?: number }
  | { kind: 'achievement'; name: string; lines?: [string, string] }
  | { kind: 'skill'; name: string; lines?: [string, string] };
/** 卸载一个仍在播的 Cut-in（cutIn 返回的卡片 → 舞台 veil） */
export const killCutIn = (card: HTMLElement | null | undefined) => { const v = card?.parentElement?.parentElement; if (v && v.parentElement === document.body) v.remove(); };
export function playQueue(steps: QueueStep[], onDone?: () => void, gap = 260): () => void {
  let cancelled = false, t = 0, cur: HTMLElement | null = null;
  const run = (i: number) => {
    if (cancelled) return;
    if (i >= steps.length) { onDone?.(); return; }
    const next = () => { t = window.setTimeout(() => run(i + 1), gap); };
    const s = steps[i];
    if (s.kind === 'todo') cur = todoCompleteP5({ title: s.title, points: s.points, unlock: s.unlock, heading: s.heading, onClose: next });
    else if (s.kind === 'level') cur = levelUpP5({ attr: s.attr, level: s.level, stars: s.stars, onClose: next });
    else if (s.kind === 'achievement') cur = unlockCutInP5({ heading: '成就解锁！', name: s.name, lines: s.lines ?? ['感谢您的努力，', '您是最棒的客人。'], onClose: next });
    else cur = unlockCutInP5({ heading: '技能解锁！', name: s.name, lines: s.lines ?? ['新技能已激活', '属性加成自动生效'], onClose: next });
  };
  run(0);
  return () => { cancelled = true; clearTimeout(t); killCutIn(cur); };
}

/** 弹层包装用：open 时播一次（播完调 onClose），卸载时把仍在播的舞台撤掉（连播切段 / StrictMode 双调用） */
export function useCutIn(open: boolean, play: (onClose: () => void) => HTMLElement | (() => void), onClose: () => void): void {
  useEffect(() => {
    if (!open) return;
    let alive = true, r: HTMLElement | (() => void) | null = null;
    // 推迟一拍：StrictMode（dev）同步「挂 → 卸 → 再挂」时第一次不真正开演出（见 pkg3/host.tsx 同名注释）
    const go = window.setTimeout(() => { r = play(() => { if (alive) onClose(); }); }, 0);
    return () => { alive = false; clearTimeout(go); if (!r) return; if (typeof r === 'function') r(); else killCutIn(r); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
}
