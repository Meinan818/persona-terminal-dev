// @ts-nocheck —— 逐字迁移自 v3 原生 overlays/d.js（D 组：行动 / 星象 / 图鉴 / 记账 段；命令式 DOM，类名 .od-*，样式 = legacy/css/d.css）。
// 改动（按 FIXLIST / 真实源码）：
//   · stage() 支持 inline（INLINE.host 设定时渲染进页面容器，不建全屏层）——星象三 Tab / 图鉴 Tab 用（P0-10 / P0-11）；
//   · confirm() 改走 ConfirmDialog（kit P5Confirm，真实删除协议）；演示态条 ?__dev=0 隐藏；
//   · 环 / 甜甜圈入场：v3 对 stroke-dasharray 做生长 → 改为整体 scale+opacity 弹入（FIXLIST 六：只动 transform/opacity）；
//   · LongReadingFlow reading：推演中（思索环 + 百分比）→ 逐字流 → 停止 / 被截断 → 接着写 / 就用这些 / 返回抽卡重试 → 追问逐字（仅一次）→ 回应失败重试 → 存进档案（P1-14）；
//   · 宣告卡编辑器 openCCEditor 增加 { card, onSaved } 参数（P0-07 行动页倒计时面复用）。
import { P5 } from './p5';
import { thinkingCircleHTML } from '@/p5r-red/fx/thinkingCircle';
const U = P5.ui;
const RM = () => P5.reduced();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const today = new Date();
const md = (d) => `${d.getMonth() + 1}月${d.getDate()}日`;
const addD = (n) => new Date(today.getTime() + n * 864e5);
const AN = (k) => P5.ATTR[k].name;
/** inline 模式：设 INLINE.host 后调用 openX()，stage() 渲染进该容器（页面内 Tab）；INLINE.onClose = 舞台 close 时回调 */
export const INLINE: any = { host: null, onClose: null };
export const YR: any = { show: null };
type LedgerDetailsBridge = typeof import('@/p5r-red/adapter/live').ledgerDetailsBridge;
let detailLedger: LedgerDetailsBridge | undefined;
export function connectLedgerDetails(bridge: LedgerDetailsBridge) { detailLedger = bridge; }
// 命令式区块随容器退出释放订阅，不重建正在编辑的表单。
function watchLedgerDetails(root, draw) {
  if (!detailLedger) return;
  const off = detailLedger.subscribe(() => { if (root.isConnected) draw(); });
  const observer = new MutationObserver(() => { if (!root.isConnected) { off(); observer.disconnect(); } });
  observer.observe(document.body, { childList: true, subtree: true });
  detailLedger.ready().then(() => { if (root.isConnected) draw(); }).catch(() => P5.toast('账目读取失败，请重试'));
}
let assetFormSequence = 0;
  /* ═════════ 通用件 ═════════ */
  /** 段落标题（墨楔 + 红影） */
  const ttl = (t, en = '') => `<div class="od-ttl"><b>${t}</b>${en ? `<small>${en}</small>` : ''}</div>`;
  const seg = (items, sel, attrs = '') => `<div class="seg od-seg" ${attrs}>${items.map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${k === sel}">${l}</button>`).join('')}</div>`;
  const sw = (on, attrs = '') => `<i class="sw ${on ? 'on' : ''}" role="switch" aria-checked="${!!on}" tabindex="0" ${attrs}></i>`;
  const stepper = (v, attrs = '') => `<span class="stepper" ${attrs}><button type="button" aria-label="减一">−</button><b>${v}</b><button type="button" aria-label="加一">＋</button></span>`;
  const bar = (p, cls = '') => `<span class="od-bar ${cls}"><i style="width:${Math.max(0, Math.min(100, p))}%"></i></span>`;
  const chip = (t, on, attrs = '') => `<button type="button" class="od-chip ${on ? 'on' : ''}" aria-pressed="${!!on}" ${attrs}>${on ? '✓ ' : ''}${t}</button>`;
  /** 绑定容器内的 seg / sw / stepper / chip（单选 seg；chip 多选） */
  function wire(root) {
    root.querySelectorAll('.od-seg').forEach((sg) => sg.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || b.disabled) return; sg.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b)); sg.dispatchEvent(new CustomEvent('pick', { detail: b.dataset.v })); }));
    root.querySelectorAll('.sw').forEach((w) => { if (w._w) return; w._w = 1; w.addEventListener('click', () => { w.classList.toggle('on'); w.setAttribute('aria-checked', w.classList.contains('on')); }); });
    root.querySelectorAll('.stepper').forEach((s) => { if (s._w) return; s._w = 1; const [m, p] = s.querySelectorAll('button'), v = s.querySelector('b'); const min = +(s.dataset.min || 1), max = +(s.dataset.max || 999); m.onclick = () => v.textContent = Math.max(min, +v.textContent - 1); p.onclick = () => v.textContent = Math.min(max, +v.textContent + 1); });
    root.querySelectorAll('.od-chip:not([data-solo])').forEach((c) => { if (c._w) return; c._w = 1; c.addEventListener('click', () => { const on = !c.classList.contains('on'); c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); c.textContent = (on ? '✓ ' : '') + c.textContent.replace(/^✓ /, ''); }); });
  }
  /** 演示态切换条（仅 demo 用） */
  const demoBar = (states, cur) => !P5.devOn() ? '' : `<div class="od-demo" role="tablist" aria-label="演示状态"><small>演示态</small>${states.map(([k, l]) => `<button type="button" data-st="${k}" aria-pressed="${k === cur}">${l}</button>`).join('')}</div>`;
  /** 有状态区块：root 里 [data-host] 由 render(state) 重绘 */
  function stateful(root, states, cur, render, bind) {
    const host = root.querySelector('[data-host]');
    const draw = (st, anim = true) => { cur = st; host.innerHTML = render(st); root.querySelectorAll('.od-demo button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.st === st)); wire(host); bind && bind(host, st, draw); if (anim) P5.panelIn(host.children, { stagger: .04 }); };
    root.querySelector('.od-demo')?.addEventListener('click', (e) => { const b = e.target.closest('[data-st]'); if (b) draw(b.dataset.st); });
    draw(cur, false);
    return draw;
  }

  /** 全屏舞台：红放射线矢量背板 + 剪影 + 关闭；内容在 .od-wrap */
  function stage({ title = '', en = '', seed = 7, cls = '', body = '', sil = null, onMount, onClose, x = true } = {}) {
    const wide = P5.isWide();
    if (INLINE.host) { // 页面内嵌（星象 Tab / 图鉴 Tab）：不建全屏层，不要头部与 ✕
      const host = INLINE.host, oc = INLINE.onClose; INLINE.host = null; INLINE.onClose = null;
      const v = document.createElement('div'); v.className = `od-inline ${cls}`; v.innerHTML = `<div class="od-wrap">${body}</div>`;
      host.innerHTML = ''; host.appendChild(v);
      const close = () => { onClose && onClose(); oc && oc(); };
      if (!RM()) P5.panelIn(v.querySelectorAll('.od-wrap > *'), { stagger: .05, delay: .06 });
      const wrap = v.querySelector('.od-wrap'); wire(wrap);
      onMount && onMount(wrap, close, v);
      return { el: v, wrap, close };
    }
    const v = document.createElement('div'); v.className = `od-stage ${cls}`; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true');
    v.innerHTML = `<div class="od-bg" aria-hidden="true">${P5.bgSVG({ seed, wide, fx: wide ? 1200 : 760, fy: wide ? 240 : 220 })}</div>
      ${sil ? `<div class="od-sil" aria-hidden="true">${P5.sil(sil, { style: 'height:100%;width:auto;display:block' })}</div>` : ''}
      ${x ? '<button class="od-x" aria-label="关闭">✕</button>' : ''}
      <div class="od-wrap">${title ? `<header class="od-hd">${en ? U.ransom(en, { h: wide ? 46 : Math.min(32, Math.floor(300 / Math.max(6, en.length))), seed }) : ''}<div>${U.plate(title, { fs: wide ? 24 : 19 })}</div></header>` : ''}${body}</div>`;
    document.body.appendChild(v);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    let closed = false;
    const close = () => { if (closed) return; closed = true; onClose && onClose(); v.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateX(-30px) skewX(4deg)' }], { duration: 200, fill: 'both' }).onfinish = () => { v.remove(); document.body.style.overflow = prev; }; };
    const xb = v.querySelector('.od-x'); if (xb) xb.onclick = close;
    const onKey = (e) => { if (e.key === 'Escape' && document.contains(v)) { close(); removeEventListener('keydown', onKey); } }; addEventListener('keydown', onKey);
    if (!RM()) {
      const gate = document.createElement('i'); gate.className = 'od-gate'; v.appendChild(gate);
      gate.animate([{ transform: 'translateX(-120%) skewX(-16deg)' }, { transform: 'translateX(130%) skewX(-16deg)' }], { duration: 520, easing: 'cubic-bezier(.72,0,.28,1)', fill: 'both' }).onfinish = () => gate.remove();
      v.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 140, fill: 'both' });
      P5.panelIn(v.querySelectorAll('.od-wrap > *'), { stagger: .05, delay: .12 });
    }
    const wrap = v.querySelector('.od-wrap'); wire(wrap);
    onMount && onMount(wrap, close, v);
    return { el: v, wrap, close };
  }
  /** 纸面抽屉（kit P5.sheet）+ 自动 wire */
  const sheet = (title, html, onMount, seed) => P5.sheet(title, html, { seed, onMount: (sh, close) => { wire(sh); onMount && onMount(sh, close); } });
  /** 二段确认 */
  const confirm = (title, text, okLabel, onOk, { danger = true, cancel = '取消' } = {}) => P5.confirmDlg({ title, description: text, confirmText: okLabel, cancelText: cancel, tone: danger ? 'danger' : 'default', onConfirm: () => onOk && onOk() });

  /** 进度环（WishRing：主观距离整圆 + 百分号；未评估 = 虚底轨 + ?） */
  const ring = (pct, { size = 64, evaluated = true, color = 'var(--red)', track = '#3a3530', fg = 'currentColor', label = true, sw: sw_ = 7 } = {}) => {
    const r = 50 - sw_ / 2 - 2, C = 2 * Math.PI * r;
    return `<svg class="od-ring" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${evaluated ? '距离 ' + pct + '%' : '还没评估过'}">
      <circle cx="50" cy="50" r="${r}" fill="none" stroke="${track}" stroke-width="${sw_}" ${evaluated ? '' : 'stroke-dasharray="4 6"'}/>
      ${evaluated ? `<circle class="od-ring-p" cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="${sw_ + 1}" stroke-dasharray="${(C * pct / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 50 50)" style="--c:${C.toFixed(1)}"/>` : ''}
      ${label ? `<text x="50" y="58" text-anchor="middle" font-family="Noto Sans SC Black, Velvet Sans SC, Noto Sans CJK SC, sans-serif" font-weight="900" font-size="${evaluated ? 26 : 34}" fill="${fg}">${evaluated ? pct + '<tspan font-size="14">%</tspan>' : '?'}</text>` : ''}</svg>`;
  };
  /** GoalArc：-4° 倾斜开口弧，270°，环心里程表数字 = 完成步数 */
  const arc = (done, total, { size = 96, fg = 'var(--ink)', track = 'rgba(17,17,17,.18)' } = {}) => {
    const r = 40, C = 2 * Math.PI * r, L = C * .75, p = total ? done / total : 0;
    return `<svg class="od-arc" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="完成 ${done} / ${total} 步"><g transform="rotate(131 50 50)">
      <circle cx="50" cy="50" r="${r}" fill="none" stroke="${track}" stroke-width="9" stroke-dasharray="${L.toFixed(1)} ${C.toFixed(1)}"/>
      <circle class="od-arc-p" cx="50" cy="50" r="${r}" fill="none" stroke="var(--red)" stroke-width="10" stroke-dasharray="${(L * p).toFixed(1)} ${C.toFixed(1)}" style="--l:${(L * p).toFixed(1)}"/></g>
      <text x="50" y="56" text-anchor="middle" font-family="Noto Sans SC Black, Velvet Sans SC, Noto Sans CJK SC, sans-serif" font-weight="900" font-size="28" fill="${fg}" font-style="italic">${done}</text>
      <text x="50" y="74" text-anchor="middle" font-family="Noto Sans SC Black, Velvet Sans SC, Noto Sans CJK SC, sans-serif" font-weight="900" font-size="10" fill="${fg}">/ ${total} 步</text></svg>`;
  };
  /** Donut：段按比例堆叠，total > Σ 时余下显灰轨 */
  const donut = (segs, total, { size = 132, sw: sw_ = 16, inner = '', track = 'rgba(17,17,17,.16)' } = {}) => {
    const r = 50 - sw_ / 2 - 1, C = 2 * Math.PI * r; let acc = 0;
    return `<span class="od-donut" style="width:${size}px;height:${size}px"><svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"><circle cx="50" cy="50" r="${r}" fill="none" stroke="${track}" stroke-width="${sw_}"/>
      ${segs.map((s) => { const len = C * s.value / total, o = acc; acc += len; return `<circle class="od-dn-s" cx="50" cy="50" r="${r}" fill="none" stroke="${s.color}" stroke-width="${sw_}" stroke-dasharray="${len.toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-o).toFixed(2)}" transform="rotate(-90 50 50)"/>`; }).join('')}</svg><span class="od-dn-in">${inner}</span></span>`;
  };
  /** ThinkingCircle：推演中（转动的星环 + 三点） */
  const thinking = thinkingCircleHTML; // 统一：@/fx/thinkingCircle（= pkg1 ThinkingCircleP5 同一份 DOM）
  /** 弹幕环境层 */
  const DANMAKU = ['今天也有好好努力的人', '一步一步来就好', '先完成，再完美', '你比昨天更近了', '慢慢来，比较快', '有人和你一起在路上', '坚持就是胜利', '辛苦了，休息一下也没关系'];
  const danmaku = (n = 6, seed = 3) => { const r = P5.rng(seed); return `<div class="od-dm" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<span style="top:${(8 + r() * 76).toFixed(1)}%;animation-delay:${(-r() * 12).toFixed(1)}s;animation-duration:${(10 + r() * 8).toFixed(1)}s">${DANMAKU[(i + seed) % DANMAKU.length]}</span>`).join('')}</div>`; };
  /** Cut-in 红面板（kit .cut-panel 同族），内容层奶白底板保证对比 */
  const cutPanel = (head, inner, { seed = 4, h = 40 } = {}) => `<div class="cut-panel od-cutp"><div class="cut-rings"></div><div class="cut-head">${U.ransom(head, { h, seed })}</div><div class="od-cut-in">${inner}</div></div>`;
  const cutAnim = (card) => { P5.slamTiles(card.querySelectorAll('.cut-head img'), .045); P5.panelIn(card.querySelectorAll('.od-cut-in > *'), { stagger: .08, delay: .55 }); };

  /* ═════════ 塔罗 / 岁时 数据 + 程序化卡面 ═════════ */
  const MAJ = [['愚者', 'THE FOOL', '0'], ['魔术师', 'THE MAGICIAN', 'I'], ['女祭司', 'THE HIGH PRIESTESS', 'II'], ['皇后', 'THE EMPRESS', 'III'], ['皇帝', 'THE EMPEROR', 'IV'], ['教皇', 'THE HIEROPHANT', 'V'], ['恋人', 'THE LOVERS', 'VI'], ['战车', 'THE CHARIOT', 'VII'], ['力量', 'STRENGTH', 'VIII'], ['隐士', 'THE HERMIT', 'IX'], ['命运之轮', 'WHEEL OF FORTUNE', 'X'], ['正义', 'JUSTICE', 'XI'], ['倒吊人', 'THE HANGED MAN', 'XII'], ['死神', 'DEATH', 'XIII'], ['节制', 'TEMPERANCE', 'XIV'], ['恶魔', 'THE DEVIL', 'XV'], ['塔', 'THE TOWER', 'XVI'], ['星星', 'THE STAR', 'XVII'], ['月亮', 'THE MOON', 'XVIII'], ['太阳', 'THE SUN', 'XIX'], ['审判', 'JUDGEMENT', 'XX'], ['世界', 'THE WORLD', 'XXI']]
    .map(([name, en, no], i) => ({ id: 'm' + i, name, en, no, major: true, glyph: name.slice(-1) === '人' && name.length > 2 ? '吊' : name[0] === '命' ? '轮' : name[0] }));
  const SUITS = [['wands', '权杖', 'WANDS', '火', '杖'], ['cups', '圣杯', 'CUPS', '水', '杯'], ['swords', '宝剑', 'SWORDS', '风', '剑'], ['pentacles', '星币', 'PENTACLES', '地', '币']];
  const RK = ['A', '二', '三', '四', '五', '六', '七', '八', '九', '十', '侍从', '骑士', '王后', '国王'], RKEN = ['ACE', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'PAGE', 'KNIGHT', 'QUEEN', 'KING'];
  const MIN = SUITS.flatMap(([k, n, en, el, g]) => RK.map((r, i) => ({ id: k + i, name: n + r, en: `${RKEN[i]} OF ${en}`, no: RKEN[i], suit: n, glyph: g, el, major: false })));
  const ALL = [...MAJ, ...MIN];
  const MAJ_FILE = ['fool', 'magician', 'high_priestess', 'empress', 'emperor', 'hierophant', 'lovers', 'chariot', 'strength', 'hermit', 'wheel_of_fortune', 'justice', 'hanged_man', 'death', 'temperance', 'devil', 'tower', 'star', 'moon', 'sun', 'judgement', 'world'];
  const tarotSlot = (c) => `slots/tarot/p5/${c.major ? MAJ_FILE[+c.id.slice(1)] : c.id.replace(/(\D+)(\d+)/, (_, s, n) => `${s}_${+n + 1}`)}.webp`;
  const MEAN = { up: ['希望正在靠近', '把今天交给一件小而确定的事', '意志驱动前进', '先动起来，方向会在路上变清楚'], rev: ['迟疑与内耗', '暂停不是失败', '把模糊的事写下来，它就小了一半'] };
  const rng0 = P5.rng(77);
  const COL = new Map(ALL.map((c) => { const u = rng0() < (c.major ? .62 : .3), r = rng0() < (c.major ? .32 : .14); return [c.id, { up: u ? 1 + Math.floor(rng0() * 5) : 0, rev: r ? 1 + Math.floor(rng0() * 3) : 0, first: `2026-0${1 + Math.floor(rng0() * 9)}-1${Math.floor(rng0() * 9)}` }]; }));
  /** P5 风程序化塔罗卡面（SVG，非位图）：奶白纸 + 黑框 + 红放射 + 巨型单字 + 墨楔牌名 */
  /** 塔罗卡面 = 素材插槽 slots/tarot/p5/<真实文件名>.webp（默认图由 scripts/slots/gen-slots.mjs 生成：v3 红黑白 + shared/sil 剪影；
   *  与真实仓库 public/tarot/p5 同名 → 把真图按同路径同文件名放进 dist/slots/tarot/p5/ 即替换）。逆位 = 整张旋转 180°。 */
  function tarotFace(c, { rev = false, w = 120 } = {}) {
    return `<img class="od-tf od-tf-img${rev ? ' rev' : ''}" src="${tarotSlot(c)}" width="${w}" height="${Math.round(w * 190 / 120)}" alt="${c.name}${rev ? ' 逆位' : ''}" draggable="false" decoding="async">`;
  }
  /** 旧程序化卡面（保留作源码参考，运行时不再使用） */
  function tarotFaceSVG(c, { rev = false, w = 120 } = {}) {
    const r = P5.rng(c.id.length * 31 + c.name.charCodeAt(0)), rot = (r() - .5) * 16;
    let rays = ''; for (let i = 0; i < 18; i++) { const a0 = i / 18 * Math.PI * 2 + rot / 60, a1 = a0 + .17; rays += `<polygon points="60,88 ${(60 + Math.cos(a0) * 120).toFixed(1)},${(88 + Math.sin(a0) * 120).toFixed(1)} ${(60 + Math.cos(a1) * 120).toFixed(1)},${(88 + Math.sin(a1) * 120).toFixed(1)}"/>`; }
    const pips = c.major ? '' : Array.from({ length: Math.min(10, RK.indexOf(c.name.replace(c.suit, '')) + 1) || 1 }, (_, i) => `<polygon points="${P5.shape.starPts(16 + (i % 5) * 22, 150 + Math.floor(i / 5) * 9, 4)}" fill="var(--ink)"/>`).join('');
    return `<svg class="od-tf" viewBox="0 0 120 190" width="${w}" role="img" aria-label="${c.name}${rev ? ' 逆位' : ''}"><defs><clipPath id="cf${c.id}"><rect x="6" y="6" width="108" height="178"/></clipPath></defs>
      <rect width="120" height="190" fill="#111"/><rect x="4" y="4" width="112" height="182" fill="#F2E9DA"/>
      <g clip-path="url(#cf${c.id})" ${rev ? 'transform="rotate(180 60 95)"' : ''}><rect x="6" y="6" width="108" height="178" fill="${c.major ? '#D7000F' : '#F2E9DA'}"/><g fill="${c.major ? '#a8000c' : '#e2d6c2'}">${rays}</g>
        <polygon points="${P5.shape.starPts(60, 90, 40, -90 + rot)}" fill="${c.major ? '#F2E9DA' : '#D7000F'}" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
        <text x="60" y="${c.glyph.length > 1 ? 100 : 103}" text-anchor="middle" font-family="Noto Sans SC Black, Velvet Sans SC, Noto Sans CJK SC, sans-serif" font-weight="900" font-size="38" fill="#111" transform="rotate(${(rot / 2).toFixed(1)} 60 92)">${c.glyph}</text>${pips}</g>
      <polygon points="30,8 90,10 86,30 34,28" fill="#111"/><text x="60" y="25" text-anchor="middle" font-family="Noto Sans SC Black, Velvet Sans SC, Noto Sans CJK SC, sans-serif" font-weight="900" font-size="${c.no.length > 4 ? 10 : 14}" fill="#F2E9DA" font-style="italic">${c.no}</text>
      <polygon points="10,158 112,154 108,182 12,180" fill="#111"/><text x="60" y="171" text-anchor="middle" font-family="Noto Sans SC Black, Velvet Sans SC, Noto Sans CJK SC, sans-serif" font-weight="900" font-size="${c.name.length > 4 ? 10 : 13}" fill="#F2E9DA">${c.name}</text>
      <text x="60" y="179" text-anchor="middle" font-family="Noto Sans SC Black, Velvet Sans SC, Noto Sans CJK SC, sans-serif" font-weight="900" font-size="5.5" fill="#D7000F" letter-spacing=".6">${c.en}</text></svg>`;
  }
  /** P5 风程序化卡背（红底 + 黑斜纹 + 星徽） */
  const cardBack = (w = 120, seed = 1) => `<svg class="od-tb" viewBox="0 0 120 190" width="${w}" aria-hidden="true"><defs><pattern id="cbp${seed}" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)"><rect width="14" height="14" fill="#D7000F"/><rect width="5" height="14" fill="#8E0010"/></pattern></defs>
    <rect width="120" height="190" fill="#111"/><rect x="5" y="5" width="110" height="180" fill="url(#cbp${seed})"/><rect x="12" y="12" width="96" height="166" fill="none" stroke="#F2E9DA" stroke-width="2"/>
    <polygon points="${P5.shape.starPts(60, 98, 38)}" fill="#111" stroke="#F2E9DA" stroke-width="3" stroke-linejoin="round"/><polygon points="${P5.shape.starPts(60, 98, 18, -54)}" fill="#D7000F"/>
    <text x="60" y="168" text-anchor="middle" font-family="Noto Sans SC Black, Velvet Sans SC, Noto Sans CJK SC, sans-serif" font-weight="900" font-size="9" fill="#F2E9DA" letter-spacing="2">MASKARIA</text></svg>`;
  /** 岁时：2026 年 24 节气 + 13 公历节日 + 7 农历节日 = 44 枚 */
  const TERMS = [['小寒', '01-05'], ['大寒', '01-20'], ['立春', '02-04'], ['雨水', '02-18'], ['惊蛰', '03-05'], ['春分', '03-20'], ['清明', '04-05'], ['谷雨', '04-20'], ['立夏', '05-05'], ['小满', '05-21'], ['芒种', '06-05'], ['夏至', '06-21'], ['小暑', '07-07'], ['大暑', '07-23'], ['立秋', '08-07'], ['处暑', '08-23'], ['白露', '09-07'], ['秋分', '09-23'], ['寒露', '10-08'], ['霜降', '10-23'], ['立冬', '11-07'], ['小雪', '11-22'], ['大雪', '12-07'], ['冬至', '12-22']];
  const FEST = [['元旦', '01-01'], ['情人节', '02-14'], ['妇女节', '03-08'], ['劳动节', '05-01'], ['青年节', '05-04'], ['儿童节', '06-01'], ['教师节', '09-10'], ['国庆节', '10-01'], ['万圣夜', '10-31'], ['双十一', '11-11'], ['平安夜', '12-24'], ['圣诞节', '12-25'], ['跨年夜', '12-31'], ['除夕', '02-16'], ['春节', '02-17'], ['元宵', '03-03'], ['端午', '06-19'], ['七夕', '08-19'], ['中秋', '09-25'], ['重阳', '10-18']];
  const NOTE = { 立春: '东风解冻，万物起头', 霜降: '草木黄落，添衣', 中秋: '月圆人团圆', 重阳: '登高望远', 寒露: '露气寒冷，将凝结' };
  const todayKey = `2026-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const MARKS = [...TERMS.map(([n, d]) => ({ name: n, kind: 'term', date: '2026-' + d })), ...FEST.map(([n, d]) => ({ name: n, kind: 'festival', date: '2026-' + d }))]
    .sort((a, b) => a.date < b.date ? -1 : 1).map((m, i) => ({ ...m, key: m.date + m.name, note: NOTE[m.name] || (m.kind === 'term' ? '节气 · 二十四分之一' : '节日 · 这一天值得记一笔'), collected: m.date < todayKey && P5.rng(i + 9)() < .7, missed: false }))
    .map((m) => ({ ...m, missed: m.date < todayKey && !m.collected }));
  const seasonOf = (d) => d < '2026-02-04' || d >= '2026-11-07' ? 'winter' : d < '2026-05-05' ? 'spring' : d < '2026-08-07' ? 'summer' : 'autumn';
  const SEASON = { spring: ['春', 'SPRING'], summer: ['夏', 'SUMMER'], autumn: ['秋', 'AUTUMN'], winter: ['冬', 'WINTER'] };
  const EXTRAS = [{ name: '满月', kind: 'moon', date: '2026-09-26', note: '满月夜记了一条' }, { name: '委托全清', kind: 'quest', date: '2026-10-12', note: '本周三张都收下了' }, { name: '暗影击退', kind: 'raid', date: '2026-09-27', note: '满月团战 · 4 人出手' }];
  /** 岁时卡面（SVG）：节气红带 / 节日墨带；未收 = 网点剪影 + ？ */
  const SEASON_FILE = { 小寒: 'xiaohan', 大寒: 'dahan', 立春: 'lichun', 雨水: 'yushui', 惊蛰: 'jingzhe', 春分: 'chunfen', 清明: 'qingming', 谷雨: 'guyu', 立夏: 'lixia', 小满: 'xiaoman', 芒种: 'mangzhong', 夏至: 'xiazhi', 小暑: 'xiaoshu', 大暑: 'dashu', 立秋: 'liqiu', 处暑: 'chushu', 白露: 'bailu', 秋分: 'qiufen', 寒露: 'hanlu', 霜降: 'shuangjiang', 立冬: 'lidong', 小雪: 'xiaoxue', 大雪: 'daxue', 冬至: 'dongzhi',
    元旦: 'festival_yuandan', 情人节: 'festival_qingrenjie', 妇女节: 'festival_funvjie', 劳动节: 'festival_laodongjie', 青年节: 'festival_qingnianjie', 儿童节: 'festival_ertongjie', 教师节: 'festival_jiaoshijie', 国庆节: 'festival_guoqingjie', 万圣夜: 'festival_wanshengye', 双十一: 'festival_shuangshiyi', 平安夜: 'festival_pinganye', 圣诞节: 'festival_shengdanjie', 跨年夜: 'festival_kuanianye', 除夕: 'festival_chuxi', 春节: 'festival_chunjie', 元宵: 'festival_yuanxiao', 端午: 'festival_duanwu', 七夕: 'festival_qixi', 中秋: 'festival_zhongqiu', 重阳: 'festival_chongyang' };
  /** 岁时卡面：已收的 44 枚节气 / 节日 = 素材插槽 slots/season/p5/<真实文件名>.webp（同名覆盖即换真图）；未收（灰纸 + ？）与额外印记仍为矢量。 */
  function seasonFace(m, { w = 96 } = {}) {
    const file = SEASON_FILE[m.name];
    if (file && m.collected !== false) return `<img class="od-sf od-sf-img" src="slots/season/p5/${file}.webp" width="${w}" height="${Math.round(w * 1.4)}" alt="${m.name}" draggable="false" decoding="async">`;
    const k = m.kind === 'term' ? '#D7000F' : m.kind === 'festival' ? '#111' : '#8E0010', got = m.collected !== false;
    const nm = [...m.name];
    return `<svg class="od-sf" viewBox="0 0 100 140" width="${w}" role="img" aria-label="${m.name}${got ? '' : '（未收录）'}"><rect width="100" height="140" fill="#111"/><rect x="3" y="3" width="94" height="134" fill="${got ? '#F2E9DA' : '#cfc6b6'}"/>
      <polygon points="3,3 97,3 97,26 3,32" fill="${got ? k : '#8f877b'}"/><text x="10" y="20" font-family="Noto Sans SC Black, Velvet Sans SC, Noto Sans CJK SC, sans-serif" font-weight="900" font-size="10" fill="#F2E9DA">${m.kind === 'term' ? '节气' : m.kind === 'festival' ? '节日' : m.kind === 'moon' ? '满月' : m.kind === 'quest' ? '委托' : '团战'}</text>
      <text x="90" y="20" text-anchor="end" font-family="Noto Sans SC Black, Velvet Sans SC, Noto Sans CJK SC, sans-serif" font-weight="900" font-size="9" fill="#F2E9DA" font-style="italic">${m.date.slice(5).replace('-', '.')}</text>
      ${got ? `<polygon points="${P5.shape.starPts(70, 100, 26, -80)}" fill="#D7000F" opacity=".18"/>${nm.map((ch, i) => `<text x="${nm.length > 2 ? 50 : 42}" y="${62 + i * (nm.length > 2 ? 22 : 30) - (nm.length > 2 ? 8 : 0)}" text-anchor="middle" font-family="Noto Sans SC Black, Velvet Sans SC, Noto Sans CJK SC, sans-serif" font-weight="900" font-size="${nm.length > 2 ? 22 : 30}" fill="#111">${ch}</text>`).join('')}
        <g transform="rotate(-14 76 118)"><polygon points="${P5.shape.starPts(76, 118, 15)}" fill="#D7000F" stroke="#111" stroke-width="1.6"/><text x="76" y="123" text-anchor="middle" font-family="Noto Sans SC Black, Velvet Sans SC, Noto Sans CJK SC, sans-serif" font-weight="900" font-size="11" fill="#F2E9DA">${m.kind === 'festival' && /春节|除夕/.test(m.name) ? '福' : '收'}</text></g>`
      : `<text x="50" y="92" text-anchor="middle" font-family="Noto Sans SC Black, Velvet Sans SC, Noto Sans CJK SC, sans-serif" font-weight="900" font-size="46" fill="#8f877b">？</text><text x="50" y="124" text-anchor="middle" font-family="Noto Sans SC Black, Velvet Sans SC, Noto Sans CJK SC, sans-serif" font-weight="900" font-size="11" fill="#6b6862">${m.name}</text>`}</svg>`;
  }

  /* 假数据（字段对齐 types：Wish / WeeklyGoal / BigDeal / LongReading / Org…） */
  const WISHES = [
    { id: 'w1', title: '去一次京都', progress: 34, evaluated: true, count: 6, subs: [{ t: '查好红叶季的机票价格', done: true }, { t: '每月存 800 元旅行基金', done: false }, { t: '学会 50 句日常日语', done: false }], status: '有了方向，钱在攒' },
    { id: 'w2', title: '学会冲浪', progress: 0, evaluated: false, count: 0, subs: [], status: '' },
    { id: 'w3', title: '写完一部短篇小说', progress: 72, evaluated: true, count: 14, subs: [{ t: '完成大纲', done: true }, { t: '写到第五章', done: true }, { t: '找两个朋友试读', done: false }], status: '第六章卡住了' },
  ];
  const BIG = { title: '准备雅思 7 分', days: 23, steps: [{ t: '做一套听力真题', done: true }, { t: '背完剑桥核心词 1–10', done: true }, { t: '每周两篇大作文', done: false }, { t: '约一次口语模考', done: false }], status: '听力稳了，写作还虚', pts: 2, sp: 30 };
  const ORG = { name: '夜读小队', motto: '一起熬过期末', code: 'MASK7Q2K', level: 3, emblem: '★', members: [['野鸡', '愚者', '0', true], ['坂本龙司', '战车', 'VII'], ['高卷杏', '恋人', 'VI'], ['新岛真', '女祭司', 'II'], ['佐仓双叶', '隐士', 'IX']] };

  /* ══════════════════ 愿望 wish/* ══════════════════ */
  const tone = (p) => p >= 85 ? '几乎到了' : p >= 60 ? '看得见了' : p >= 35 ? '走到一半' : p >= 15 ? '起步了' : '刚上路';
  const wishSub = (w) => { const d = w.subs.filter((s) => s.done).length; return w.count ? `已完成相关任务 <b>${w.count}</b> 次${w.subs.length ? ` · 子任务 ${d}/${w.subs.length}` : ''}` : w.subs.length ? `子任务 ${d}/${w.subs.length}` : '还没有记录挂到这里'; };
  const wishRow = (w, i) => `<div class="od-wish" data-i="${i}" style="--i:${i}"><i class="req-bg"></i>
    <button class="od-wish-ring" data-act="panel" aria-label="打开「${w.title}」的进度面板">${ring(w.progress, { size: 54, evaluated: w.evaluated, color: 'var(--red)', track: '#4a4440', fg: 'var(--paper)' })}</button>
    <span class="od-wish-m"><b>${w.title}</b><small>${wishSub(w)}</small></span>
    <button class="od-more" data-act="menu" aria-label="「${w.title}」的操作">⋯</button></div>`;
  function openWishBoard(st0 = 'list') {
    stage({ title: '愿望', en: 'WISH', seed: 11, sil: 'point', body: `${demoBar([['list', '有愿望'], ['review', '弹幕窄条 / 在审'], ['empty', '空态']], st0)}
      <div class="od-wb-hd">${U.plate('愿望', { fs: 22, tag: 'button', attrs: 'data-act="swap" aria-label="愿望（点击切回今日任务）"', suffix: '<svg class="od-swapmk" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 2l5 4-5 4" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>' })}<small class="od-note-c">远处的灯 · 不进今日任务</small></div>
      ${U.shp('section', { kind: 'torn', seed: 411, tone: 'red', cls: 'od-wb' }, '<div data-host></div>')}`,
      onMount(w, close) {
        stateful(w, [], st0, (st) => {
          const strip = st === 'review' ? `<div class="od-dmstrip"><span>${U.star('var(--paper)', 'var(--ink)')}你还有 <b>2</b> 次机会鼓励同样努力的人</span><button data-act="compose">去写 ›</button><small>1 条鼓励正在审核中</small></div>` : '';
          const list = st === 'empty' ? `<div class="od-empty"><b>还没有愿望。</b><p>写下一个远一点的——记录时把事挂上去，就能看见自己在靠近它。</p></div>` : WISHES.map(wishRow).join('');
          return `${strip}<div class="od-wish-list">${list}</div>
            <div class="od-wish-add"><button class="od-addline" data-act="add">＋ 记下一个愿望</button><div class="od-addbox" hidden><input class="inp" placeholder="想实现的事…" aria-label="愿望标题">${U.btn('记下', { tone: 'paper', seed: 412, attrs: 'data-act="save"' })}${U.btn('收起', { tone: 'ink', size: 'sm', seed: 413, attrs: 'data-act="fold"' })}</div></div>`;
        }, (h) => h.addEventListener('click', (e) => {
          const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act, row = b.closest('.od-wish'), wi = row ? WISHES[+row.dataset.i] : null;
          if (a === 'panel') openWishPanel(wi);
          if (a === 'menu') P5.actionSheet(wi.title, [{ label: '拆子任务', onClick: () => openWishPanel(wi) }, { label: '愿望已实现', onClick: () => openWishFulfill(wi) }, { label: '收起', onClick: () => { row.remove(); P5.toast('已收起 · 在 菜单 → 归档 里'); } }, { label: '删除', tone: 'danger', onClick: () => confirm('删除愿望', `「${wi.title}」和挂在它下面的进度记录会一起删掉。`, '删除', () => { row.remove(); P5.toast('已删除'); }) }]);
          if (a === 'add') { b.hidden = true; const bx = h.querySelector('.od-addbox'); bx.hidden = false; bx.querySelector('input').focus(); }
          if (a === 'fold') { h.querySelector('.od-addbox').hidden = true; h.querySelector('[data-act="add"]').hidden = false; }
          if (a === 'save') { const v = h.querySelector('.od-addbox input').value.trim() || '新的愿望'; const tmp = document.createElement('div'); tmp.innerHTML = wishRow({ title: esc(v), progress: 0, evaluated: false, count: 0, subs: [] }, WISHES.length); h.querySelector('.od-wish-list').appendChild(tmp.firstElementChild); P5.sfx('success'); P5.toast('愿望已记下'); }
          if (a === 'compose') sheet('写一句鼓励', `<p class="sh-p">先审后发 · 匿名。写一句话，送给同样在路上的人。</p><textarea class="inp" rows="3" maxlength="40" placeholder="写一句话，送给同样在路上的人"></textarea><div class="sh-acts">${U.btn('投稿', { tone: 'red', size: 'lg', seed: 414, attrs: 'data-ok' })}</div>`, (sh, c) => sh.querySelector('[data-ok]').onclick = () => { c(); P5.toast('已投稿，审核通过后会飘过别人的屏幕'); });
        }));
        w.querySelector('[data-act="swap"]').onclick = () => { close(); P5.toast('已切回今日任务'); };
      } });
  }
  function openWishPanel(w = WISHES[0], st0) {
    st0 = st0 || (w.evaluated ? 'eval' : 'none');
    sheet('愿望 · 进度', `${demoBar([['eval', '已评估'], ['none', '未评估'], ['done', '已了结']], st0)}<div data-host></div>`, (sh) => {
      stateful(sh, [], st0, (st) => {
        const ev = st !== 'none', subs = st === 'none' ? [] : w.subs, p = w.progress || 38;
        if (st === 'done') return `<div class="od-wp-hd">${ring(100, { size: 88, color: 'var(--red)', track: '#cfc6b6', fg: 'var(--ink)' })}<div><b class="od-wp-t">${w.title}</b><p class="sh-p">这条愿望已经了结了</p></div></div>`;
        return `<div class="od-wp-hd">${ring(p, { size: 92, evaluated: ev, color: 'var(--red)', track: '#cfc6b6', fg: 'var(--ink)' })}<div><small class="od-k">${ev ? `离这个愿望 · ${p}%` : '还没评估过距离'}</small><b class="od-wp-t">${w.title}</b>${ev ? `<em class="od-tone">${tone(p)}</em>` : ''}<p class="muted-d">${wishSub(w).replace(/<\/?b>/g, '')}</p></div></div>
          <div class="od-row-acts">${U.btn(ev ? '重新评估距离' : '评估一次距离', { tone: 'red', size: 'sm', seed: 421, attrs: 'data-act="eval"' })}${U.btn('手动设定', { tone: 'ink', size: 'sm', seed: 422, attrs: 'data-act="manual"' })}</div>
          <div class="od-manual" hidden><label class="fld"><span>你觉得走到哪了？</span><input type="range" min="0" max="100" value="${p}" class="od-range" aria-label="愿望进度百分比"><b class="od-range-v">${p}%</b></label>${U.btn('定为这个数', { tone: 'red', size: 'sm', seed: 423, attrs: 'data-act="setp"' })}</div>
          <label class="fld"><span>现在走到哪了（AI 评估会读它）</span><input class="inp" placeholder="一句话说说现在的位置…" aria-label="愿望现状" value="${esc(w.status)}"></label>
          <div class="fld"><span>子任务</span><div class="od-steps">${subs.length ? subs.map((s, i) => stepRow(s, i)).join('') : '<p class="muted-d od-empty-s">还没有子任务——先拆一个够得着的</p>'}</div></div>
          <div class="od-addrow"><input class="inp" placeholder="拆一个够得着的小步…" aria-label="新子任务">${U.btn('添加', { tone: 'ink', size: 'sm', seed: 424, attrs: 'data-act="addstep"' })}</div>
          <div class="od-row-acts">${U.btn('✦ 拆下一组', { tone: 'paper', size: 'sm', seed: 425, attrs: 'data-act="split"' })}</div>
          <div class="tg"><b>完成任务后自动重估</b><small>挂到愿望的记录一落，就重算距离并弹一张卡（作用于所有愿望）。</small>${sw(true, 'aria-label="完成任务后自动重估愿望进度"')}</div>
          <p class="muted-d">愿望的子任务勾掉<b>不加点</b>——它只是把路标出来。要拿点数，去今日任务建一条挂到这个愿望上。</p>`;
      }, (h) => {
        bindSteps(h, false);
        h.addEventListener('click', (e) => {
          const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
          if (a === 'eval') { const s = b.querySelector('span'); s.textContent = '评估中…'; b.disabled = true; setTimeout(() => { s.textContent = '重新评估距离'; b.disabled = false; P5.toast('按子步与记录估了个数：38%（配好 AI 会更准）'); }, 900); }
          if (a === 'manual') h.querySelector('.od-manual').hidden = false;
          if (a === 'setp') { P5.toast('定为 ' + h.querySelector('.od-range').value + '%'); h.querySelector('.od-manual').hidden = true; }
          if (a === 'split') { const s = b.querySelector('span'); s.textContent = '正在拆…'; setTimeout(() => { s.textContent = '✦ 拆下一组'; addSteps(h, ['周末去书店翻一本京都旅行书', '列一张想去的寺庙清单']); P5.toast('拆了 2 条——不合适的直接删'); }, 800); }
          if (a === 'addstep') { const i = b.closest('.od-addrow').querySelector('input'); addSteps(h, [i.value.trim() || '新的一小步']); i.value = ''; }
        });
        const r = h.querySelector('.od-range'); if (r) r.oninput = () => h.querySelector('.od-range-v').textContent = r.value + '%';
      });
    }, 43);
  }
  const stepRow = (s, i, lock = false) => `<div class="od-step ${s.done ? 'done' : ''}" style="--i:${i}"><button class="od-ck" data-act="ck" ${lock ? 'disabled' : ''} aria-label="${s.done ? '撤销这一步' : '完成这一步'}">${s.done ? '✓' : ''}</button><b>${esc(s.t)}</b>${lock ? '' : '<button class="od-del" data-act="delstep" aria-label="删除子任务">✕</button>'}</div>`;
  function addSteps(h, arr) { const box = h.querySelector('.od-steps'); const e0 = box.querySelector('.od-empty-s'); e0 && e0.remove(); arr.forEach((t) => { const d = document.createElement('div'); d.innerHTML = stepRow({ t, done: false }, box.children.length); box.appendChild(d.firstElementChild); P5.panelIn([box.lastElementChild], { from: 'right' }); }); }
  function bindSteps(h, award, onDone) {
    h.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act="ck"],[data-act="delstep"]'); if (!b) return; const row = b.closest('.od-step');
      if (b.dataset.act === 'delstep') { row.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateX(-30px)' }], { duration: 200, fill: 'both' }).onfinish = () => row.remove(); return; }
      const on = !row.classList.contains('done'); row.classList.toggle('done', on); b.textContent = on ? '✓' : ''; b.setAttribute('aria-label', on ? '撤销这一步' : '完成这一步');
      if (on) { b.animate([{ transform: 'scale(1.6) rotate(-20deg)' }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.34,1.56,.64,1)' }); onDone && onDone(row); }
    });
  }
  function openWishFulfill(w = WISHES[0], done0 = false) {
    const v = document.createElement('div'); v.className = 'od-veil od-ful';
    const draw = (done) => v.innerHTML = U.shp('div', { kind: 'quad', seed: 431, cls: 'od-ful-card', attrs: 'role="dialog" aria-modal="true"' }, done
      ? `<span class="od-stamp">夺回</span><b class="od-ful-t">${w.title}</b><p class="sh-p">这一路你为它记下了 <b>${w.count}</b> 次<br>同时收起了 <b>2</b> 条在途任务</p><div class="sh-acts">${U.btn('记录这一刻', { tone: 'red', size: 'lg', seed: 432, attrs: 'data-x' })}</div>`
      : `<small class="od-k">愿望已实现？</small><b class="od-ful-t">${w.title}</b><p class="sh-p">你为它记下过 <b>${w.count}</b> 次。确认实现后，名下的子愿望与在途任务会一并收起。</p>
        <button class="od-hold" aria-label="长按确认实现"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" fill="none" stroke="rgba(17,17,17,.2)" stroke-width="8"/><circle class="od-hold-p" cx="50" cy="50" r="44" fill="none" stroke="var(--red)" stroke-width="9" stroke-dasharray="0 277" transform="rotate(-90 50 50)"/></svg><span>长按确认实现</span></button>
        <div class="sh-acts">${U.btn('再等等', { tone: 'ink', seed: 433, attrs: 'data-x' })}</div>`);
    draw(done0); document.body.appendChild(v); v.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'both' });
    const close = () => v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'both' }).onfinish = () => v.remove();
    const bind = () => {
      v.querySelectorAll('[data-x]').forEach((b) => b.onclick = close);
      const hold = v.querySelector('.od-hold'); if (!hold) return;
      const p = hold.querySelector('.od-hold-p'), lab = hold.querySelector('span'), card = v.querySelector('.od-ful-card'); let t0 = 0, raf = 0;
      const step = (now) => { const k = Math.min(1, (now - t0) / (RM() ? 300 : 1100)); p.setAttribute('stroke-dasharray', `${(277 * k).toFixed(1)} 277`); card.style.transform = `scale(${1 - k * .04})`; if (k < 1) raf = requestAnimationFrame(step); else fire(); };
      const fire = () => { P5.sfx('fanfare', .5); card.style.transform = ''; if (!RM()) { const b = document.createElement('i'); b.className = 'od-ful-burst'; v.appendChild(b); b.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(3)', opacity: 0 }], { duration: 700, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' }).onfinish = () => b.remove(); } draw(true); bind(); P5.slamTiles(v.querySelectorAll('.od-stamp'), 0); };
      hold.addEventListener('pointerdown', (e) => { e.preventDefault(); t0 = performance.now(); lab.textContent = '正在收束…'; raf = requestAnimationFrame(step); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((k) => hold.addEventListener(k, () => { if (!raf) return; cancelAnimationFrame(raf); raf = 0; if (v.querySelector('.od-hold')) { p.setAttribute('stroke-dasharray', '0 277'); lab.textContent = '长按确认实现'; card.style.transform = ''; } }));
    };
    bind();
  }
  function openWishProposal() {
    sheet('要更新这个愿望的进度吗？', `<div class="od-prop">${ring(34, { size: 70, color: '#9b9791', track: '#cfc6b6', fg: 'var(--ink)' })}<span class="od-prop-ar">→</span>${ring(46, { size: 86, color: 'var(--red)', track: '#cfc6b6', fg: 'var(--ink)' })}</div>
      <p class="sh-p">听你刚才说的，「机票已经订好了，就差请假」——「去一次京都」好像比记录里更靠前了。</p><p class="sh-p">定为 <b>46%</b>？</p>
      <div class="sh-acts">${U.btn('先不用', { tone: 'ink', size: 'lg', seed: 441, attrs: 'data-x' })}${U.btn('更新', { tone: 'red', size: 'lg', seed: 442, attrs: 'data-ok' })}</div><p class="muted-d">不想被问可以在「设置 → 助手」里关掉主动提议。</p>`,
      (sh, c) => { sh.querySelector('[data-x]').onclick = c; sh.querySelector('[data-ok]').onclick = () => { c(); P5.toast('已定为 46%'); }; }, 45);
  }
  function openWishProgress(mode = 'up') {
    const flat = mode === true || mode === 'flat', local = mode === 'local';
    const card = P5.cutIn(cutPanel(flat ? 'HOLD' : 'CLOSER!', `<div class="od-cut-paper">${ring(flat ? 34 : 46, { size: 96, color: 'var(--red)', track: '#cfc6b6', fg: 'var(--ink)' })}<div><small class="od-k">离这个愿望 · 去一次京都</small><b class="od-cut-big">${flat ? '持平' : '又近了一步'}</b><p>${flat ? '这次没往前，但路还在脚下。' : '这一下是真的往前了。'}</p><em>${flat ? '34%' : '34% → 46%'} · 已完成相关任务 7 次${local ? '<span style="white-space:nowrap"> · 本地估算</span>' : ''}</em></div></div>`, { seed: 6 }), { autoMs: 3200 });
    cutAnim(card);
  }
  function openWishMount() {
    sheet('记录活动 · 挂到愿望', `<label class="fld"><span>描述</span><input class="inp" value="查了京都红叶季的酒店"></label>${mountPicker()}<div class="sh-acts">${U.btn('记录', { tone: 'red', size: 'lg', seed: 451, attrs: 'data-ok' })}</div>
      <p class="muted-d">紧凑态（黑猫记录卡里）：</p>${mountPicker(true)}`, (sh, c) => { sh.addEventListener('click', (e) => { const b = e.target.closest('.od-mount .od-chip'); if (!b) return; const box = b.closest('.od-mount'); const on = !b.classList.contains('on'); box.querySelectorAll('.od-chip').forEach((x) => { x.classList.remove('on'); x.setAttribute('aria-pressed', false); x.textContent = x.textContent.replace(/^✓ /, ''); }); if (on) { b.classList.add('on'); b.setAttribute('aria-pressed', true); b.textContent = '✓ ' + b.textContent; } }); sh.querySelector('[data-ok]').onclick = () => { c(); P5.toast('已记录 · 已计入「去一次京都」'); }; });
  }
  const mountPicker = (compact) => `<div class="od-mount ${compact ? 'cmp' : ''}">${compact ? '' : '<div class="od-mount-h"><b>挂到愿望</b><small>可不选；挂上后会计入那个愿望的进度</small></div>'}<div class="od-chips">${WISHES.map((w, i) => chip(w.title, i === 0, 'data-solo')).join('')}</div></div>`;
  function openRings() {
    sheet('环形件 WishRing · GoalArc', `<div class="od-ringgal">${[[34, true], [72, true], [0, false]].map(([p, e]) => `<figure>${ring(p, { size: 90, evaluated: e, track: '#cfc6b6', fg: 'var(--ink)' })}<figcaption>${e ? p + '% · ' + tone(p) : '未评估'}</figcaption></figure>`).join('')}</div>
      <div class="od-ringgal">${[[2, 4], [0, 3], [5, 5]].map(([d, t]) => `<figure>${arc(d, t)}<figcaption>GoalArc ${d}/${t}</figcaption></figure>`).join('')}</div><p class="muted-d">WishRing = 主观距离（整圆 + 百分号）；GoalArc = 客观计数（-4° 开口弧 270° + 里程表数字）。两者不互相替代。</p>`, (sh) => growRings(sh));
  }
  const growRings = (root) => { if (RM()) return; root.querySelectorAll('.od-ring,.od-arc').forEach((c) => c.animate([{ transform: 'scale(.6) rotate(-40deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 800, delay: 200, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' })); };

  /* ══════════════════ 本周目标 weeklyGoal/* ══════════════════ */
  const GOALS = [{ k: 'activity', l: '完成 N 次活动', d: '完成指定属性的记录次数', attr: 'knowledge', n: 3, cur: 2 }, { k: 'todo', l: '完成 N 次任务', d: '完成任务的次数', n: 5, cur: 5 }, { k: 'attr', l: '获得 N 点属性', d: '获得指定属性的点数', attr: 'guts', n: 6, cur: 3 }, { k: 'total', l: '获得 N 点总点数', d: '所有属性的总获得点数', n: 20, cur: 14 }];
  const goalLabel = (g) => g.k === 'activity' ? `完成 ${g.n} 次${AN(g.attr)}活动` : g.k === 'todo' ? `完成 ${g.n} 次任务` : g.k === 'attr' ? `获得 ${g.n} 点${AN(g.attr)}` : `获得 ${g.n} 点总点数`;
  function weeklyCard(st) {
    if (st === 'empty') return `<button class="od-goal-empty" data-act="setup">${U.shp('span', { kind: 'torn', seed: 461, cls: 'od-ge' }, `${U.star()}<b>设定本周目标</b>${U.star()}`)}</button>`;
    const gs = st === 'done' || st === 'claimed' ? GOALS.slice(0, 3).map((g) => ({ ...g, cur: g.n })) : GOALS.slice(0, 3);
    return U.shp('div', { kind: 'torn', seed: 462, cls: 'od-wg' }, `<div class="od-wg-hd">${U.plate('本周目标', { fs: 16 })}<span class="od-wg-wk">${md(addD(-((today.getDay() + 6) % 7)))} – ${md(addD(6 - (today.getDay() + 6) % 7))}</span><button class="od-more ink" data-act="opts" aria-label="修改选项">⋯</button></div>
      ${gs.map((g) => `<div class="od-wg-row ${g.cur >= g.n ? 'ok' : ''}"><span class="od-wg-st">${U.star(g.cur >= g.n ? 'var(--red)' : '#cfc6b6', 'var(--ink)')}</span><b>${goalLabel(g)}</b><em>${Math.min(g.cur, g.n)}/${g.n}</em>${bar(g.cur / g.n * 100)}</div>`).join('')}
      <div class="od-wg-rw">奖励：<b>周末去看一场电影</b></div>
      ${st === 'done' ? U.btn('目标达成！领取奖励', { tone: 'red', size: 'lg', seed: 463, attrs: 'data-act="claim"', cls: 'od-wide' }) : st === 'claimed' ? `<div class="od-wg-claimed">${U.tag('✓ 已获得')} <small>本周目标已完成，下周一再立新的</small></div>` : '<small class="muted-d">长按卡片：编辑 / 重置</small>'}`);
  }
  function openWeeklySection(st0 = 'progress') {
    stage({ title: '本周目标', en: 'WEEKLY', seed: 13, sil: 'crouch', body: `${demoBar([['empty', '未设定'], ['progress', '进行中'], ['done', '达成'], ['claimed', '已领取']], st0)}<div data-host></div>`, onMount(w) {
      stateful(w, [], st0, weeklyCard, (h, st, draw) => {
        h.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return; if (b.dataset.act === 'setup') openGoalSetup(); if (b.dataset.act === 'opts') goalMenu(draw); if (b.dataset.act === 'claim') openCelebration(() => { openClaimed(); draw('claimed'); }); });
        const card = h.querySelector('.od-wg'); if (card) { const hint = document.createElement('span'); hint.className = 'od-press-hint'; hint.textContent = '松手打开菜单…'; card.appendChild(hint); P5.longPress(card, () => goalMenu(draw)); }
      });
    } });
  }
  const goalMenu = (draw) => P5.actionSheet('本周目标', [{ label: '修改选项', onClick: () => openGoalSetup() }, { label: '重置本周目标', onClick: () => confirm('重置本周目标', '本周的目标设定会清空，已获得的点数不受影响。', '重置', () => { draw && draw('empty'); P5.toast('已重置'); }) }, { label: '删除本周目标记录', tone: 'danger', onClick: () => confirm('删除本周目标记录', '松手删除记录…这条本周目标将被删除。', '删除', () => { draw && draw('empty'); P5.toast('已删除'); }) }]);
  function openGoalSetup() {
    const sel = new Set(['activity', 'todo']);
    sheet('设定本周目标', `<p class="sh-p">至少选择 2 项</p><div class="od-gs">${GOALS.map((g) => `<div class="od-gs-row ${sel.has(g.k) ? 'on' : ''}" data-k="${g.k}"><span class="od-gs-stamp">${U.star('var(--red)', 'var(--ink)', 1.6)}</span>
        <button class="od-gs-head" data-act="tg" aria-expanded="${sel.has(g.k)}"><b>${g.l.replace('N', '<em>N</em>')}</b><small>${g.d}</small><span class="tag ${sel.has(g.k) ? '' : 'ink'}">${sel.has(g.k) ? '已选中' : '点击添加'}</span></button>
        <div class="od-gs-cfg" ${sel.has(g.k) ? '' : 'hidden'}><span class="od-k">目标</span>${g.attr ? seg(P5.ATTR_ORDER.map((a) => [a, AN(a)]), g.attr) : ''}${stepper(g.n)}</div></div>`).join('')}</div>
      <label class="fld"><span>完成奖励（选填）</span><input class="inp" placeholder="给自己一个奖励吧…"></label>
      <div class="sh-acts">${U.btn('取消', { tone: 'ink', seed: 471, attrs: 'data-x' })}${U.btn(`确认（${sel.size} 项）`, { tone: 'red', size: 'lg', seed: 472, attrs: 'data-ok' })}</div>`, (sh, close) => {
      const ok = sh.querySelector('[data-ok]'), upd = () => { ok.querySelector('span').textContent = `确认（${sel.size} 项）`; ok.disabled = sel.size < 2; ok.classList.toggle('od-dis', sel.size < 2); };
      sh.querySelectorAll('[data-act="tg"]').forEach((b) => b.onclick = () => { const r = b.closest('.od-gs-row'), k = r.dataset.k, on = !sel.has(k); on ? sel.add(k) : sel.delete(k); r.classList.toggle('on', on); b.setAttribute('aria-expanded', on); r.querySelector('.od-gs-cfg').hidden = !on; const t = b.querySelector('.tag'); t.textContent = on ? '已选中' : '点击添加'; t.classList.toggle('ink', !on); upd(); });
      sh.querySelector('[data-x]').onclick = close; ok.onclick = () => { if (sel.size < 2) return P5.toast('至少选择 2 项'); close(); P5.toast('本周目标已设定'); };
    }, 47);
  }
  function openCelebration(onClaim) {
    const card = P5.cutIn(`<div class="od-celeb">${U.shp('div', { kind: 'quad', seed: 481, cls: 'od-celeb-in' }, `${U.ransom('GOAL!', { h: 40, seed: 12 })}<b class="od-cut-big">本周目标达成！</b><p>选择这周最用力的方向，领取奖励</p>
      <div class="od-celeb-attrs">${P5.ATTR_ORDER.map((a, i) => `<button data-a="${a}" aria-pressed="${i === 0}"><b>${AN(a)}</b><small>${P5.ATTR[a].en}</small></button>`).join('')}</div>
      <div class="sh-acts">${U.btn('取消', { tone: 'ink', seed: 482, attrs: 'data-x' })}${U.btn('领取奖励 ✨', { tone: 'red', size: 'lg', seed: 483, attrs: 'data-ok' })}</div>`)}</div>`, { autoMs: 600000 });
    cutAnim(card); P5.slamTiles(card.querySelectorAll('.ransom img'), .05);
    const veil = card.parentElement.parentElement; veil.onclick = null;
    const close = () => veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'both' }).onfinish = () => veil.remove();
    veil.addEventListener('click', (e) => { if (e.target.textContent === '✕' && e.target.tagName === 'BUTTON') close(); });
    card.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => card.querySelectorAll('[data-a]').forEach((x) => x.setAttribute('aria-pressed', x === b)));
    card.querySelector('[data-x]').onclick = close; card.querySelector('[data-ok]').onclick = () => { close(); onClaim ? onClaim() : openClaimed(); };
  }
  function openClaimed() {
    const card = P5.cutIn(cutPanel('GET!', `<div class="od-cut-paper"><svg viewBox="0 0 100 100" width="80" aria-hidden="true"><polygon points="${P5.shape.starPts(50, 53, 46)}" fill="#F2E9DA" stroke="#111" stroke-width="3"/><text x="50" y="62" text-anchor="middle" font-family="Noto Sans SC Black, Velvet Sans SC, Noto Sans CJK SC, sans-serif" font-size="26" font-weight="900" fill="#D7000F">+5</text></svg><div><b class="od-cut-big">奖励已领取！</b><p>知识 +5 · 周末去看一场电影</p></div></div>`, { seed: 14 }), { autoMs: 2600 });
    cutAnim(card);
  }

  /* ══════════════════ BIG DEAL bigdeal/* ══════════════════ */
  const bdDue = (d) => d > 0 ? `剩 ${d} 天` : d === 0 ? '今天截止' : '已过截止';
  function bigHome(st = 'progress') {
    const steps = st === 'empty' ? [] : st === 'all' ? BIG.steps.map((s) => ({ ...s, done: true })) : BIG.steps, dn = steps.filter((s) => s.done).length, next = steps.find((s) => !s.done);
    const due = st === 'over' ? -2 : st === 'today' ? 0 : BIG.days;
    return U.shp('div', { kind: 'torn', seed: 491, cls: 'od-bdh', attrs: 'role="button" tabindex="0" data-act="open" aria-label="打开大事面板"' }, `<span class="od-bdh-corner" aria-hidden="true">BIG<br>DEAL</span>
      <div class="od-bdh-top"><b class="od-bdh-t">${BIG.title}</b><span class="tag ${due < 0 ? '' : 'ink'}">${bdDue(due)}</span><button class="od-more ink" data-act="manage" aria-label="管理这件大事">⋯</button></div>
      <div class="od-bdh-p"><small>总进度</small>${bar(steps.length ? dn / steps.length * 100 : 0)}<em>${dn}/${steps.length}</em></div>
      <div class="od-bdh-next">${!steps.length ? '<b>去拆第一步 ›</b>' : next ? `<span>下一步：</span><b>${next.t}</b>` : '<b class="red">全部完成——进去收官 ›</b>'}</div>`);
  }
  const bdMenu = () => P5.actionSheet(BIG.title, [{ label: '打开二级面板', onClick: () => openBigPanel() }, { label: '编辑', onClick: () => P5.toast('打开编辑（同任务编辑抽屉）') }, { label: '归档', onClick: () => P5.toast('已归档') }, { label: '删除', tone: 'danger', onClick: () => confirm('删除大事', `「${BIG.title}」及其子步将被删除。`, '删除', () => P5.toast('已删除')) }]);
  function openBigHome(st0 = 'progress') {
    stage({ title: '大事卡', en: 'BIG DEAL', seed: 15, sil: 'leap', body: `${demoBar([['progress', '进行中'], ['empty', '未拆步'], ['all', '全部完成'], ['today', '今天截止'], ['over', '已过截止']], st0)}<div data-host></div><p class="od-note">首页与任务页共用：只露总进度 + 未完成第一步；点卡进二级面板；⋯ 或长按 = 管理菜单（首页不传 ⋯）。</p>`, onMount(w) {
      stateful(w, [], st0, bigHome, (h) => { const c = h.querySelector('.od-bdh'); P5.longPress(c, bdMenu); c.addEventListener('click', (e) => { if (e.target.closest('[data-act="manage"]')) { e.stopPropagation(); return bdMenu(); } openBigPanel(); }); });
    } });
  }
  function openBigPanel(st0 = 'progress') {
    sheet('BIG DEAL', `${demoBar([['progress', '进行中'], ['ready', '全成待收官'], ['cleared', '已收官']], st0)}<div data-host></div>`, (sh, close) => {
      stateful(sh, [], st0, (st) => {
        const steps = st === 'progress' ? BIG.steps : BIG.steps.map((s) => ({ ...s, done: true })), dn = steps.filter((s) => s.done).length, lock = st === 'cleared';
        return `<div class="od-bp-hd">${arc(dn, steps.length)}<div><b class="od-wp-t">${BIG.title}</b><p class="od-bp-st">${lock ? U.tag('已收官', 'ink') : ''}${U.tag(`截止还剩 ${BIG.days} 天`, 'line')}${U.tag(`每步 +${BIG.pts}`)}</p><p class="muted-d">现状：${BIG.status}</p></div></div>
          <div class="fld"><span>子步</span><div class="od-steps">${steps.map((s, i) => stepRow(s, i, lock)).join('')}</div></div>
          ${lock ? `<p class="muted-d">收官之后唯一还能做的事：重建。</p>${U.btn('重建这件大事', { tone: 'ink', seed: 501, attrs: 'data-act="rebuild"' })}` : `<div class="od-addrow"><input class="inp" placeholder="追加一个够得着的小步…" aria-label="追加子步">${U.btn('添加', { tone: 'ink', size: 'sm', seed: 502, attrs: 'data-act="addstep"' })}</div>
          <div class="od-row-acts">${U.btn('✦ 续拆下一组', { tone: 'paper', size: 'sm', seed: 503, attrs: 'data-act="split"' })}</div>
          ${st === 'ready' ? U.btn(`收官 · 领取奖励（SP +${BIG.sp}）`, { tone: 'red', size: 'lg', seed: 504, attrs: 'data-act="clear"', cls: 'od-wide' }) : ''}`}`;
      }, (h, st, draw) => {
        bindSteps(h, true, (row) => { const all = [...h.querySelectorAll('.od-step')], dn = all.filter((r) => r.classList.contains('done')).length; if (dn === all.length) { close(); openBigClear(); } else openBigStep(dn, all.length, row.querySelector('b').textContent); });
        h.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
          if (a === 'addstep') { const i = h.querySelector('.od-addrow input'); addSteps(h, [i.value.trim() || '新的子步']); i.value = ''; }
          if (a === 'split') { const s = b.querySelector('span'); s.textContent = '正在续拆…'; setTimeout(() => { s.textContent = '✦ 续拆下一组'; addSteps(h, ['整理一页写作模板句', '限时 40 分钟写一篇小作文']); P5.toast('续拆了 2 条——不合适的直接删'); }, 800); }
          if (a === 'clear') { b.querySelector('span').textContent = '结算中…'; setTimeout(() => { close(); openBigClear(); }, 500); }
          if (a === 'rebuild') confirm('重建这件大事', '会新立一条同名同步骤的大事，子步全部重置为未完成；当前这条原样归档，已领的奖励和历史记录都不受影响。', '确认重建', () => P5.toast('已重建'), { cancel: '算了' });
        });
      });
    }, 49);
  }
  function openBigStep(n = 3, m = 4, t = '每周两篇大作文') {
    const card = P5.cutIn(cutPanel('STEP UP', `<div class="od-cut-paper"><b class="od-cut-n">${n}<small>/${m}</small></b><div><small class="od-k">推进一步 · 大事「${BIG.title}」</small><b class="od-cut-big">${t}</b><p>第 ${n} / ${m} 步 · 整件事的进度</p>${bar(n / m * 100)}</div></div>`, { seed: 16 }), { autoMs: 2200 });
    cutAnim(card);
  }
  function openBigClear() {
    P5.sfx('fanfare', .55);
    const v = document.createElement('div'); v.className = 'od-veil od-bdc';
    v.innerHTML = `<div class="od-bg" aria-hidden="true">${P5.bgSVG({ seed: 19, wide: P5.isWide(), fx: P5.isWide() ? 800 : 500, fy: 380 })}</div>${danmaku(8, 2)}
      <div class="od-bdc-in"><div class="od-bdc-stamp">${U.ransom('CLEAR!', { h: P5.isWide() ? 80 : 58, seed: 5 })}<b class="od-bdc-cn">大功告成</b></div>
      ${U.shp('div', { kind: 'torn', seed: 511, cls: 'od-bdc-card' }, `<small class="od-k">BIG DEAL</small><b class="od-wp-t">${BIG.title}</b>
        <div class="od-loot"><span>${U.burst('4', { sz: 52 })}<em>共 4 步</em></span><span>${U.burst('+' + BIG.sp, { sz: 52, tone: 'cream' })}<em>SP</em></span><span>${U.burst('+1', { sz: 52, tone: 'ink' })}<em>知识 · 灵巧</em></span></div>
        <div class="od-dmin"><input class="inp" maxlength="30" placeholder="写一句话，送给同样在路上的人"><small>你攒了 1 次投稿机会 · 先审后发 · 匿名</small>${U.btn('投稿', { tone: 'ink', size: 'sm', seed: 512, attrs: 'data-act="post"' })}</div>
        <div class="sh-acts">${U.btn('记录这一刻', { tone: 'red', size: 'lg', seed: 513, attrs: 'data-x' })}</div>`)}</div>`;
    document.body.appendChild(v);
    const close = () => v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'both' }).onfinish = () => v.remove();
    v.querySelector('[data-x]').onclick = close; v.querySelector('[data-act="post"]').onclick = () => P5.toast('已投稿，先审后发');
    v.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, fill: 'both' });
    P5.slamTiles(v.querySelectorAll('.od-bdc-stamp img'), .06);
    if (!RM()) { v.querySelector('.od-bdc-cn').animate([{ transform: 'scale(2.4) rotate(-20deg)', opacity: 0 }, { transform: 'rotate(-6deg)', opacity: 1 }], { duration: 320, delay: 520, easing: 'cubic-bezier(.15,.95,.1,1)', fill: 'backwards' }); P5.panelIn(v.querySelectorAll('.od-bdc-card, .od-loot > span'), { stagger: .09, delay: .7, from: 'up' }); }
  }

  /* ══════════════════ 命运抽签 fate/FateDrawSheet ══════════════════ */
  const FATE_POOL = [
    { src: 'todo', k: '今日待办', t: '读完《人间失格》第三章', why: '可能性的辉光折射出了新的方向' },
    { src: 'wish', k: '愿望纸片', t: '学会 50 句日常日语', why: '接住就转正成今天的任务，纸片功成身退' },
    { src: 'old', k: '旧日回响', t: '去河边散步半小时', why: '这两个月做过 4 次，上次是 9 天前，再做一次不需要勇气' },
    { src: 'quest', k: '今日委托', t: '给很久没联系的朋友发条消息', why: '委托板今天给的新鲜事，接住就进今日任务' },
  ];
  function openFateDraw(st0 = 'gate') {
    const src = { wish: true, old: true, quest: true };
    const pool = () => Math.min(12, 3 + (src.wish ? 3 : 0) + (src.old ? 4 : 0) + (src.quest ? 2 : 0));
    stage({ title: '命运抽签', en: 'FATE', seed: 23, cls: 'od-fate', body: `${demoBar([['gate', '闸门'], ['empty', '池空'], ['reveal', '揭示']], st0)}${danmaku(7, 5)}<div data-host></div>`, onMount(w, close) {
      const fan = (n) => `<div class="od-fan" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<span style="--a:${((i - (n - 1) / 2) * (60 / Math.max(1, n))).toFixed(1)}deg">${cardBack(64, 30 + i)}</span>`).join('')}</div>`;
      const draw = stateful(w, [], st0, (st) => {
        if (st === 'reveal') { const c = FATE_POOL[Math.floor(Math.random() * FATE_POOL.length)]; return `<div class="od-fate-rv"><div class="od-flip od-fate-card" data-src="${c.src}"><div class="od-flip-in on"><span class="od-flip-b">${cardBack(170, 9)}</span><span class="od-flip-f od-fate-f"><small class="tag">${c.k}</small><b>${c.t}</b><em>${c.why}</em><span class="od-fate-bonus">${U.star()}完成它会有额外奖励</span></span></div></div>
          <div class="od-fate-acts">${U.btn('去完成', { tone: 'red', size: 'lg', seed: 521, attrs: 'data-act="go"' })}${U.btn('再想想', { tone: 'paper', seed: 522, attrs: 'data-act="later"' })}${c.src === 'old' ? U.btn('以后别抽这件', { tone: 'ink', size: 'sm', seed: 523, attrs: 'data-act="ban"' }) : ''}</div><p class="od-note">关闭会重新抽取其他的可能性</p></div>`; }
        const n = st === 'empty' ? 0 : pool();
        return `${U.shp('div', { kind: 'torn', seed: 524, cls: 'od-fate-gate' }, `<b class="od-cut-big">不知道做什么好？</b><p>命运会替你选择</p>
          <div class="od-fate-src">${[['wish', '愿望', '愿望纸片 · 接住就转正成今天的任务'], ['old', '旧事', '旧日回响 · 你做过的事，再做一次不需要勇气'], ['quest', '委托', '今日委托 · 委托板今天给的新鲜事']].map(([k, l, d]) => `<div class="tg"><b>${l}</b><small>${d}</small>${sw(st !== 'empty' && src[k], `data-src="${k}" aria-label="${l}"`)}</div>`).join('')}</div>`)}
          ${n ? fan(n) : '<p class="od-fate-empty">命运的力量正在苏醒…请多记录几条再来</p>'}
          <p class="od-fate-n"><b>${n}</b> 张候选在池中</p>
          <div class="od-fate-acts">${U.btn('抽一张', { tone: 'red', size: 'lg', seed: 525, attrs: `data-act="draw" ${n ? '' : 'disabled'}`, cls: n ? '' : 'od-dis' })}${U.btn('今天先不抽', { tone: 'ink', seed: 526, attrs: 'data-act="skip"' })}</div>`;
      }, (h, st, draw) => {
        h.querySelectorAll('.sw[data-src]').forEach((s) => s.addEventListener('click', () => { src[s.dataset.src] = s.classList.contains('on'); const n = pool(); h.querySelector('.od-fate-n b').textContent = n; const f = h.querySelector('.od-fan'); if (f) f.outerHTML = fan(n); }));
        h.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
          if (a === 'skip') close();
          if (a === 'draw') { P5.sfx('tarot', .6); const f = h.querySelector('.od-fan'); if (RM()) return draw('reveal'); f.classList.add('shuffle'); b.disabled = true; setTimeout(() => draw('reveal'), 1000); }
          if (a === 'go') { close(); P5.toast('已加入今日任务 ✦ 签'); }
          if (a === 'later') { close(); P5.toast('零惩罚 · 这件今天沉底'); }
          if (a === 'ban') { close(); P5.toast('以后不会再抽到这件'); }
        });
        const fc = h.querySelector('.od-fate-card .od-flip-in'); if (fc) { fc.classList.remove('on'); requestAnimationFrame(() => setTimeout(() => fc.classList.add('on'), RM() ? 0 : 200)); }
      });
    } });
  }

  /* ══════════════════ 委托板 quests/QuestBoardSheet ══════════════════ */
  const LIFE = [['knowledge', '读 10 页闲书', '题库'], ['kindness', '给家人发一张今天的照片', '题库'], ['dexterity', '把桌面收拾到能放下一杯水', '题库'], ['charm', '今天换一件平时不常穿的衣服', 'AI 写的']];
  const WEEKQ = [{ t: '本周完成 10 件任务', g: '魅力 +4', n: 10, cur: 10, st: 'claim' }, { t: '本周记录 3 次运动', g: '胆量 +3', n: 3, cur: 1, st: 'doing', swap: true }, { t: '本周有 5 天写下记录', g: 'SP +20', n: 5, cur: 5, st: 'claimed', tag: '上周替你领的' }];
  function openQuestBoard(st0 = 'normal') {
    sheet('委托板', `${demoBar([['normal', '正常'], ['loading', '准备中'], ['allclear', '全清'], ['wait', '本周未刷新']], st0)}<div data-host></div>`, (sh) => {
      let li = 0, rer = 2;
      stateful(sh, [], st0, (st) => {
        const life = st === 'loading' ? `<div class="od-ql-load">${thinking('正在按你的属性准备今日委托')}</div>` : `<div class="od-ql"><div class="od-ql-track">${LIFE.map(([a, t, k], i) => U.shp('div', { kind: 'quad', seed: 531 + i, cls: 'od-qcard', attrs: `data-i="${i}" style="--r:${[-1.6, 1.2, -.8, 1.8][i]}deg"` }, `<span class="od-qk">${k === 'AI 写的' ? '✦ AI 写的' : '今日委托'}</span><b>${t}</b>${U.tag(AN(a) + ' +2')}<span class="od-qc-act">${U.btn('加入今日任务', { tone: 'red', size: 'sm', seed: 540 + i, attrs: 'data-act="join"' })}</span>`)).join('')}</div>
          <div class="od-ql-nav"><button data-act="prev" aria-label="上一张">‹</button><span class="od-dots2">${LIFE.map((_, i) => `<i class="${i === 0 ? 'on' : ''}" aria-label="第 ${i + 1} 张"></i>`).join('')}</span><button data-act="next" aria-label="下一张">›</button></div>
          <div class="od-row-acts">${U.btn(`换一批（今天剩 ${rer} 次）`, { tone: 'ink', size: 'sm', seed: 546, attrs: 'data-act="reroll"' })}</div>
          <p class="muted-d">有几项属性名是你自己起的，题库对不上就先不出这几类；配好 AI 服务后会自动对好。</p></div>`;
        const weekly = st === 'wait' ? '<p class="sh-p">本周的委托还在路上，稍后再来。</p>' : `<div class="od-qw">${WEEKQ.map((q, i) => { const s = st === 'allclear' ? 'claimed' : q.st; return U.shp('div', { kind: 'torn', seed: 551 + i, cls: `od-qwc ${s}`, attrs: `style="--r:${[-1, 1.4, -.6][i]}deg"` }, `${q.tag && s === 'claimed' ? U.tag(q.tag, 'line') : ''}${i === 1 && st === 'swapped' ? U.tag('换来的', 'line') : ''}<b>${q.t}</b>${U.tag(q.g)}<span class="od-slant">${bar(Math.min(1, (s === 'claimed' ? q.n : q.cur) / q.n) * 100)}</span><em>${s === 'claimed' ? q.n : q.cur}/${q.n}</em>
            <span class="od-qw-act">${s === 'claim' ? U.btn('领取', { tone: 'red', size: 'sm', seed: 560 + i, attrs: 'data-act="claim"' }) : s === 'claimed' ? '<span class="tag ink">✓ 已领取</span>' : q.swap ? U.btn('换一张', { tone: 'paper', size: 'sm', seed: 563, attrs: 'data-act="swap"' }) : ''}</span>`); }).join('')}</div>
          <p class="muted-d">${st === 'allclear' ? '本周三张都收下了，岁时册里多了一枚「委托全清」。' : '不想做的那张可以「换一张」，每周一次 · 做完的委托要自己来领；上周没领的，下周一会替你领。'}</p>`;
        return `<div class="od-qnotice">本周刷出了新委托 ${U.btn('知道了', { tone: 'ink', size: 'sm', seed: 529, attrs: 'data-act="ack"' })}</div>
          <section>${ttl('今日委托', '每天三张 · 左右滑着挑 · 三张题库 + 一张 AI 写的')}${life}</section><section>${ttl('本周委托', 'WEEKLY · 每周一三张')}${weekly}</section>`;
      }, (h) => {
        const track = h.querySelector('.od-ql-track'); const go = (d) => { li = Math.max(0, Math.min(LIFE.length - 1, li + d)); track.style.transform = `translateX(${-li * 84}%)`; h.querySelectorAll('.od-dots2 i').forEach((x, i) => x.classList.toggle('on', i === li)); };
        if (track) { let x0 = null; track.addEventListener('pointerdown', (e) => x0 = e.clientX); track.addEventListener('pointerup', (e) => { if (x0 != null && Math.abs(e.clientX - x0) > 40) go(e.clientX < x0 ? 1 : -1); x0 = null; }); }
        h.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
          if (a === 'prev') go(-1); if (a === 'next') go(1);
          if (a === 'join') { b.parentElement.innerHTML = '<span class="tag ink">✓ 已加入今日任务</span>'; P5.sfx('success'); h.querySelectorAll('.od-dots2 i')[li].classList.add('got'); }
          if (a === 'reroll') { if (rer <= 0) return; rer--; b.querySelector('span').textContent = rer ? `换一批（今天剩 ${rer} 次）` : '今天换不了了，明天再来'; if (!rer) { b.disabled = true; b.classList.add('od-dis'); } P5.panelIn(h.querySelectorAll('.od-qcard'), { from: 'right' }); }
          if (a === 'claim') { b.parentElement.innerHTML = '<span class="tag ink">✓ 已领取</span>'; b.closest && P5.sfx('success'); P5.toast('已收下 · 魅力 +4'); }
          if (a === 'swap') { const c = b.closest('.od-qwc'); c.querySelector('b').textContent = '本周早睡 3 天'; c.insertAdjacentHTML('afterbegin', U.tag('换来的', 'line')); b.parentElement.innerHTML = ''; P5.toast('本周的「换一张」用过了，下周一再来'); }
          if (a === 'ack') b.closest('.od-qnotice').remove();
        });
      });
    }, 51);
  }

  /* ══════════════════ 归来 return/* ══════════════════ */
  function openReturn(st0 = 'short', step = '') {
    stage({ title: '归来', en: 'WELCOME BACK', seed: 29, sil: 'cat', body: `${demoBar([['short', '离开 5 天'], ['long', '离开 38 天']], st0)}<div data-host></div>`, onMount(w, close) {
      stateful(w, [], st0, (st) => { const n = st === 'short' ? 5 : 38;
        return U.shp('section', { kind: 'torn', seed: 571, cls: 'od-ret' }, `<p class="od-ret-k">你不在的 <b>${n} 天</b> 里</p><b class="od-ret-big">流转的岁月并未削减你的勇气</b>${U.ransom('WELCOME', { h: 30, seed: 7 })}<b class="od-cut-big">欢迎回来</b>
          <p class="sh-p">${st === 'short' ? '想补上这几天也行，不补也行，空着的日子也是日子。' : '隔了有一阵子了。逐日回忆多半不准，不如用一句话说说这段时间。'}</p>
          <div class="od-ret-sum" hidden><label class="fld"><span>这段时间过得怎么样</span><textarea class="inp" rows="2" placeholder="一句话就够，比如：忙完了一个大项目" aria-label="这段时间的一句话概括"></textarea></label><div class="sh-acts">${U.btn('算了', { tone: 'ink', size: 'sm', seed: 572, attrs: 'data-act="cancel"' })}${U.btn('记下', { tone: 'red', seed: 573, attrs: 'data-act="savesum"' })}</div></div>
          <div class="od-ret-acts">${st === 'short' ? U.btn('补记这几天', { tone: 'paper', seed: 574, attrs: 'data-act="backfill"' }) : U.btn('用一句话概括', { tone: 'paper', seed: 575, attrs: 'data-act="sum"' })}${U.btn('我回来了', { tone: 'red', size: 'lg', seed: 576, attrs: 'data-act="back"' })}</div>
          <p class="muted-d">补记的条目<b>不加点数</b>，也<b>不会修复连续天数</b>。</p>`); }, (h) => h.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
          if (a === 'back') { close(); P5.toast('欢迎回来'); } if (a === 'backfill') openBackfill(); if (a === 'sum') h.querySelector('.od-ret-sum').hidden = false; if (a === 'cancel') h.querySelector('.od-ret-sum').hidden = true; if (a === 'savesum') { close(); P5.toast('已记下这段时间'); } }));
    } });
  }
  function openBackfill() {
    const away = [1, 2, 3, 4, 5].map((n) => addD(-n)), first = new Date(away[4].getFullYear(), away[4].getMonth(), 1), dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const isAway = (d) => away.some((x) => x.getDate() === d && x.getMonth() === first.getMonth());
    sheet('补记这几天', `<p class="sh-p">${first.getMonth() + 1} 月 · 点一天补一句</p><div class="od-cal"><div class="od-cal-wk">${'日一二三四五六'.split('').map((d) => `<b>${d}</b>`).join('')}</div><div class="od-cal-g">${Array.from({ length: first.getDay() }, () => '<i></i>').join('')}${Array.from({ length: dim }, (_, i) => `<button ${isAway(i + 1) ? `class="away" data-d="${first.getMonth() + 1}月${i + 1}日"` : 'disabled'}>${i + 1}</button>`).join('')}</div></div>
      <div class="od-bf" hidden><b class="od-bf-t"></b><input class="inp" placeholder="那天还做了什么…"><div class="sh-acts">${U.btn('那天在休息', { tone: 'ink', size: 'sm', seed: 581, attrs: 'data-act="rest"' })}${U.btn('记下', { tone: 'red', seed: 582, attrs: 'data-act="save"' })}</div></div>
      <div class="sh-acts">${U.btn('算了', { tone: 'ink', seed: 583, attrs: 'data-x' })}${U.btn('那几天在休息', { tone: 'paper', seed: 584, attrs: 'data-act="restall"' })}</div><p class="muted-d">补记的条目不加点数，也不会修复连续天数。</p>`, (sh, close) => {
      let cur = null;
      sh.addEventListener('click', (e) => { const d = e.target.closest('.od-cal-g .away'); if (d) { cur = d; sh.querySelectorAll('.od-cal-g .sel').forEach((x) => x.classList.remove('sel')); d.classList.add('sel'); const bf = sh.querySelector('.od-bf'); bf.hidden = false; bf.querySelector('.od-bf-t').textContent = `${d.dataset.d} 的记录`; bf.querySelector('input').value = ''; P5.panelIn([bf]); }
        const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
        if ((a === 'save' || a === 'rest') && cur) { cur.classList.add(a === 'rest' ? 'rest' : 'done'); cur.classList.remove('sel'); sh.querySelector('.od-bf').hidden = true; P5.toast(a === 'rest' ? '那天在休息' : '已补记'); }
        if (a === 'restall') { close(); P5.toast('那几天在休息 · 已标记'); } });
      sh.querySelector('[data-x]').onclick = close;
    }, 53);
  }

  /* ══════════════════ 年度回顾 annual/YearRecapStage ══════════════════ */
  function openYearRecap() {
    const P = [
      ['YEAR', `<small class="od-yr-k">这一年的你</small><b class="od-yr-big">这是你的一整个 2026</b><p>从1月1日到${md(today)}，一共 293 天</p>`],
      ['DAYS', `<small class="od-yr-k">来过的日子</small><b class="od-yr-num">212<i>天</i></b><p>6 月来得最勤（48 条）</p><p>多半是夜里写下的</p>`],
      ['NIGHT', `<small class="od-yr-k">最晚的一夜</small><b class="od-yr-num">03:12</b><p>4月17日 周五 · 凌晨</p><blockquote class="od-yr-q">「终于把毕业设计的第一版交上去了。」</blockquote><p>那天夜里，你写下了这一句。</p>`],
      ['GROWTH', `<small class="od-yr-k">长成的样子</small><b class="od-yr-num">+612<i>点</i></b><p>比去年多 128 点（去年 +484）</p><div class="od-yr-attrs">${P5.ATTR_ORDER.map((a, i) => `<span><b>${AN(a)}</b>${bar([82, 46, 58, 90, 34][i])}</span>`).join('')}</div>`],
      ['STREAK', `<small class="od-yr-k">没断过的日子</small><b class="od-yr-num">21<i>天</i></b><p>3月2日到3月22日，一天没落下</p>`],
      ['TODO', `<small class="od-yr-k">这一年的待办打卡</small><b class="od-yr-num">386<i>次</i></b><p>，最勤的是「晨跑 5 公里」（88 次）</p>`],
      ['PHOTO', `<small class="od-yr-k">高光时刻</small><p>这一年留下的 6 张照片</p><div class="od-yr-ph">${['海边', '毕业', '火锅', '红叶', '演唱会', '猫'].map((t, i) => `<span style="--r:${[-6, 4, -3, 7, -5, 3][i]}deg"><i aria-hidden="true">${U.star('var(--red)', 'var(--ink)')}</i><small>${t}</small></span>`).join('')}</div>`],
      ['COUNT', `<small class="od-yr-k">这一年立下的倒计时</small><b class="od-yr-num">4<i>个</i></b><p>倒计时走到了终点 · 达成 2 · 到了 1</p>`],
      ['FATE', `<small class="od-yr-k">命运与愿望</small><div class="od-yr-fate"><figure>${tarotFace(MAJ[17], { w: 96 })}<figcaption>命运之牌<br>来得最勤的是「星星」，9 次</figcaption></figure><figure>${ring(46, { size: 86, track: '#cfc6b6', fg: 'var(--ink)' })}<figcaption>离愿望更近<br>去一次京都 +34%</figcaption></figure></div>`],
      ['MEMORY', `<small class="od-yr-k">你的记忆</small><div class="od-yr-mem"><p><b>这一年的第一条</b>1月1日 · 「新年第一天，早起看了日出」</p><p class="od-yr-gap">中间隔着 292 天、1,204 条记录</p><p><b>最近的一条</b>${md(today)} · 「图书馆自习三小时」</p></div>`],
      ['WEATHER', `<small class="od-yr-k">这一年带着天气的记录</small><div class="od-yr-w"><span><b>晴天你记了</b><em>640 条</em></span><span><b>雨天你记了</b><em>212 条</em></span><span><b>雪天你记了</b><em>9 条</em></span></div><p>晴 640 条</p>`],
      ['LETTER', `<small class="od-yr-k">伊戈尔给你写了一封信</small><div data-letter></div>`],
    ];
    let page = 0, letter = 'writing';
    const v = document.createElement('div'); v.className = 'od-veil od-yr'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-label', '2026 年度回顾');
    v.innerHTML = `<div class="od-bg" aria-hidden="true"></div><div class="od-yr-bar">${P.map(() => '<i><b></b></i>').join('')}</div><button class="od-yr-skip">跳过 ›</button><div class="od-yr-ghost" aria-hidden="true"></div><div class="od-yr-stage"></div><p class="od-yr-tap">点击屏幕继续 · ← → 翻页</p>`;
    document.body.appendChild(v);
    const close = () => { removeEventListener('keydown', key); v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'both' }).onfinish = () => v.remove(); };
    const drawLetter = () => { const L = v.querySelector('[data-letter]'); if (!L) return; L.innerHTML = letter === 'writing' ? `${thinking('正在落笔', '正在落笔，已经写了 186 字…')}<div class="od-row-acts">${U.btn('先去看它边写 ›', { tone: 'ink', size: 'sm', seed: 611, attrs: 'data-l="ready"' })}${U.btn('（演示：写崩）', { tone: 'paper', size: 'sm', seed: 612, attrs: 'data-l="error"' })}</div>`
      : letter === 'ready' ? `<div class="od-yr-env">${U.btn('拆开这封信', { tone: 'red', size: 'lg', seed: 613, attrs: 'data-l="open"' })}</div>` : letter === 'open' ? `<div class="od-yr-letter">亲爱的客人：<br>这一年你来过 212 天。最晚的那一夜，你还是把事情做完了——这比任何牌面都说明问题。明年，也请继续把命运握在自己手里。<br><i>—— 伊戈尔</i></div>`
      : `<p>信没写成（网络断了）</p>${U.btn('回去看看 ›', { tone: 'ink', size: 'sm', seed: 614, attrs: 'data-l="writing"' })}`; };
    const show = (i) => {
      page = Math.max(0, Math.min(P.length - 1, i)); const [en, html] = P[page], rot = [14, -9, 6, -12, 10, -7, 12, -10, 8, -5][page % 10];
      v.querySelector('.od-bg').innerHTML = P5.bgSVG({ seed: 40 + page, wide: P5.isWide(), fx: 300 + page * 60, fy: 300 }) + `<i class="od-slab a" style="--r:${rot}deg"></i><i class="od-slab b" style="--r:${-rot}deg"></i>`;
      v.querySelector('.od-yr-ghost').textContent = en;
      v.querySelectorAll('.od-yr-bar i').forEach((b, k) => b.classList.toggle('on', k <= page));
      const st = v.querySelector('.od-yr-stage'); st.innerHTML = U.shp('section', { kind: 'quad', seed: 620 + page, cls: 'od-yr-card' }, html); drawLetter();
      if (!RM()) { st.firstElementChild.animate([{ transform: 'translateX(40px) rotate(3deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 360, easing: 'cubic-bezier(.16,1,.3,1)' }); const n = st.querySelector('.od-yr-num,.od-yr-big'); n && n.animate([{ transform: 'scale(1.8) rotate(-10deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 340, delay: 120, easing: 'cubic-bezier(.15,.95,.1,1)', fill: 'backwards' }); }
    };
    v.addEventListener('click', (e) => { if (e.target.closest('.od-yr-skip')) return close(); const l = e.target.closest('[data-l]'); if (l) { letter = l.dataset.l; drawLetter(); return; } if (e.target.closest('button')) return; if (page === P.length - 1) return; show(page + (e.clientX < innerWidth * .28 ? -1 : 1)); });
    const key = (e) => { if (e.key === 'ArrowRight') show(page + 1); if (e.key === 'ArrowLeft') show(page - 1); if (e.key === 'Escape') close(); }; addEventListener('keydown', key);
    v.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'both' }); show(0);
    YR.show = show; // 截图/演示用（?page=N 直达）
  }

  /* ══════════════════ 图鉴 codex/* ══════════════════ */
  /** FlipCardView：点一下或左右拖动翻面；背面是小注 */
  function openFlipCard(front, back, label = '图鉴', hint = '点一下或左右拖动翻面') {
    const v = document.createElement('div'); v.className = 'od-veil od-fcv'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-label', label);
    v.innerHTML = `<div class="od-fcv-in"><small class="od-fcv-l">${label}</small><div class="od-flip od-fcv-card" tabindex="0" aria-label="${hint}"><div class="od-flip-in"><span class="od-flip-f0">${front}</span><span class="od-flip-b0">${U.shp('div', { kind: 'torn', seed: 631, cls: 'od-fcv-back' }, back)}</span></div></div><p class="od-fcv-h">${hint}</p>${U.btn('关闭', { tone: 'paper', seed: 632, attrs: 'data-x' })}</div>`;
    document.body.appendChild(v);
    const inn = v.querySelector('.od-flip-in'); let deg = 0, x0 = null, d0 = 0;
    const set = (d, anim = true) => { deg = d; inn.style.transition = anim ? 'transform .6s cubic-bezier(.65,0,.35,1)' : 'none'; inn.style.transform = `rotateY(${d}deg)`; };
    const card = v.querySelector('.od-fcv-card');
    card.addEventListener('pointerdown', (e) => { x0 = e.clientX; d0 = deg; card.setPointerCapture(e.pointerId); });
    card.addEventListener('pointermove', (e) => { if (x0 == null) return; const dx = e.clientX - x0; if (Math.abs(dx) > 6) set(d0 + dx * .6, false); });
    card.addEventListener('pointerup', (e) => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; set(Math.abs(dx) < 6 ? d0 + 180 : Math.round((d0 + dx * .6) / 180) * 180); });
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') set(deg + 180); });
    const close = () => v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'both' }).onfinish = () => v.remove();
    v.querySelector('[data-x]').onclick = close; v.addEventListener('click', (e) => { if (e.target === v) close(); });
    v.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: 'both' });
    if (!RM()) P5.spring({ stiffness: 260, damping: 20, onUpdate: (p) => card.style.transform = `scale(${P5.lerp(.6, 1, p)}) rotate(${P5.lerp(-14, 0, p)}deg)` });
  }
  function openTarotFlip(c = MAJ[17]) {
    const e = COL.get(c.id), got = e.up || e.rev;
    openFlipCard(got ? tarotFace(c, { w: 230 }) : `<span class="od-unk">${cardBack(230, 3)}<b>（未收录）</b></span>`,
      `<b class="od-fcv-t">${c.name} · ${c.en}</b><div class="od-tfb"><p><span class="tag">正位</span>${MEAN.up[c.name.length % 4]}。${e.up ? `<small>首次 ${e.first} · ${e.up} 次</small>` : '<small>尚未抽到</small>'}</p><p><span class="tag ink">逆位</span>${MEAN.rev[c.name.length % 3]}。${e.rev ? `<small>首次 ${e.first} · ${e.rev} 次</small>` : '<small>尚未抽到</small>'}</p></div>`, `${c.name} · 图鉴`, '点一下或左右拖动翻面 · 背面是牌意');
  }
  function openSeasonCard(m) {
    m = m || MARKS.find((x) => x.name === '中秋');
    const state = m.collected ? `已收录 · ${m.date}` : m.date === todayKey ? '今天记一条，就收进岁时册' : m.date < todayKey ? '那天没有记录，这一枚空着了' : `${m.date.slice(5).replace('-', '.')} 那天记一条就能收`;
    openFlipCard(seasonFace(m, { w: 220 }), `<b class="od-fcv-t">${m.name} · ${m.kind === 'term' ? '节气' : m.kind === 'festival' ? '节日' : '印记'}</b><p class="sh-p">${m.note}</p><small class="muted-d">${state}</small>`, `${m.name} · 岁时册`, '点一下或左右拖动翻面 · 背面是小注');
  }
  function openSeasonGallery() {
    sheet('岁时卡 SeasonCard', `<div class="od-sgal">${[MARKS.find((m) => m.name === '春节'), MARKS.find((m) => m.name === '中秋'), MARKS.find((m) => m.name === '立冬'), MARKS.find((m) => m.missed) || MARKS[3], ...EXTRAS].map((m, i) => `<button data-i="${i}">${seasonFace(m, { w: 86 })}</button>`).join('')}</div><p class="muted-d">节气 = 红带；节日 = 墨带；春节 / 除夕盖「福」，其余盖「收」；未收 = 灰纸 + ？。点卡片翻面。</p>`, (sh) => {
      const arr = [MARKS.find((m) => m.name === '春节'), MARKS.find((m) => m.name === '中秋'), MARKS.find((m) => m.name === '立冬'), MARKS.find((m) => m.missed) || MARKS[3], ...EXTRAS.map((x) => ({ ...x, collected: true }))];
      sh.querySelectorAll('[data-i]').forEach((b) => b.onclick = () => openSeasonCard(arr[+b.dataset.i])); P5.panelIn(sh.querySelectorAll('[data-i]'), { from: 'up', stagger: .04 });
    }, 57);
  }
  function openCodex(tab0 = 'tarot') {
    stage({ title: '图鉴', en: 'CODEX', seed: 33, cls: 'od-codex', body: `<div class="od-codex-tabs">${seg([['tarot', '塔罗'], ['season', '岁时']], tab0, 'data-tab')}</div><div data-body></div>`, onMount(w) {
      const body = w.querySelector('[data-body]'); let year = '2026', season = seasonOf(todayKey);
      const cell = (c) => { const e = COL.get(c.id), got = e.up || e.rev; return `<button class="od-cx ${got ? '' : 'no'}" data-id="${c.id}" aria-label="${got ? c.name : c.name + '（未收录）'}">${got ? tarotFace(c, { w: 100 }) : cardBack(100, 7)}<span class="od-cx-n">${got ? c.name : '（未收录）'}</span><span class="od-cx-m"><i class="${e.up ? 'on' : ''}">正</i><i class="${e.rev ? 'on' : ''}">逆</i></span></button>`; };
      const slots = (cs) => cs.reduce((t, c) => t + (COL.get(c.id).up ? 1 : 0) + (COL.get(c.id).rev ? 1 : 0), 0);
      const tarot = () => `<section>${ttl('大阿卡纳', `${slots(MAJ)} / 44 · 正逆各算一格`)}<div class="od-cx-g">${MAJ.map(cell).join('')}</div></section>
        <section>${ttl('小阿卡纳', `${slots(MIN)} / 112 · 正逆各算一格`)}${SUITS.map(([k, n, en, el]) => `<div class="od-cx-suit"><b class="od-cx-sn">${n} <small>${en} · ${el}</small></b><div class="od-cx-g sm">${MIN.filter((c) => c.suit === n).map(cell).join('')}</div></div>`).join('')}</section>`;
      const hint = (m) => m.collected ? `已收录 · ${m.date.slice(5)}` : m.date === todayKey ? '今天记一条，就收进岁时册' : m.date < todayKey ? '那天没有记录，这一枚空着了' : `${m.date.slice(5).replace('-', '.')} 那天记一条就能收`;
      const seasonV = () => { const ms = MARKS.filter((m) => seasonOf(m.date) === season).map((m) => year === '2025' ? { ...m, collected: P5.rng(m.name.charCodeAt(0))() < .5, date: m.date.replace('2026', '2025') } : m);
        return `<div class="od-cx-yr"><span class="od-k">岁时 · ${year}</span>${seg([['2026', '2026'], ['2025', '2025']], year, 'data-year')}</div>
          <div class="od-cx-se">${seg(Object.entries(SEASON).map(([k, [n, en]]) => [k, `${n}<small> ${en}</small>`]), season, 'data-season')}</div>
          <div class="od-cx-page">${U.ransom(SEASON[season][1], { h: 30, seed: 3 })}<span class="od-cx-cnt">${ms.filter((m) => m.collected).length} / ${ms.length}</span></div>
          <div class="od-cx-sg">${ms.map((m, i) => `<button class="od-sx" data-m="${i}">${seasonFace(m, { w: 84 })}<small>${hint(m)}</small></button>`).join('')}</div>
          <section>${ttl('印记', `${EXTRAS.length} 枚 · 满月 / 委托 / 团战`)}<div class="od-cx-sg">${EXTRAS.map((m, i) => `<button class="od-sx" data-x="${i}">${seasonFace({ ...m, collected: true }, { w: 84 })}<small>${m.note}</small></button>`).join('')}</div></section>
          <p class="od-legend">${[['节气', '#D7000F'], ['节日', '#111'], ['满月', '#8E0010'], ['委托', '#8E0010'], ['团战', '#8E0010']].map(([n, c]) => `<span><i style="background:${c}"></i>${n}</span>`).join('')}</p>`; };
      const draw = (t) => { body.innerHTML = t === 'tarot' ? tarot() : seasonV(); wire(body); P5.panelIn(body.querySelectorAll('section, .od-cx-g > *, .od-cx-sg > *'), { stagger: .012, from: 'up' });
        if (t === 'season') { const ms = () => MARKS.filter((m) => seasonOf(m.date) === season);
          body.querySelector('[data-year]').addEventListener('pick', (e) => { year = e.detail; draw('season'); });
          body.querySelector('[data-season]').addEventListener('pick', (e) => { season = e.detail; draw('season'); });
          body.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => openSeasonCard(ms()[+b.dataset.m]));
          body.querySelectorAll('[data-x]').forEach((b) => b.onclick = () => openSeasonCard({ ...EXTRAS[+b.dataset.x], collected: true }));
          let x0 = null; const pg = body.querySelector('.od-cx-sg'); pg.addEventListener('pointerdown', (e) => x0 = e.clientX); pg.addEventListener('pointerup', (e) => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 60) { const ks = Object.keys(SEASON), i = ks.indexOf(season); season = ks[(i + (dx < 0 ? 1 : 3)) % 4]; draw('season'); } });
        } else body.querySelectorAll('[data-id]').forEach((b) => b.onclick = () => openTarotFlip(ALL.find((c) => c.id === b.dataset.id))); };
      w.querySelector('[data-tab]').addEventListener('pick', (e) => draw(e.detail)); draw(tab0);
    } });
  }

  /* ══════════════════ 星象 astrology/* ══════════════════ */
  const DRAW3 = [MAJ[17], MAJ[7], MAJ[18]];
  const nameReveal = (el, name, rev) => {
    el.innerHTML = `<span class="od-nr-n">${[...name].map((ch) => `<span>${ch}</span>`).join('')}</span><em class="od-nr-o">${rev ? '逆位' : '正位'}</em>`;
    if (RM()) return;
    el.querySelectorAll('.od-nr-n span').forEach((s, i) => { s.style.opacity = 0; P5.spring({ stiffness: 460, damping: 24, delay: i * .07, onUpdate: (p) => { s.style.opacity = Math.min(1, p * 1.5); s.style.transform = `translateY(${P5.lerp(26, 0, p)}px) scale(${P5.lerp(.7, 1, p)})`; } }); });
    const em = el.querySelector('em'); em.style.transform = 'scale(0) rotate(-18deg)'; P5.spring({ stiffness: 480, damping: 18, delay: .1 + name.length * .07, onUpdate: (p) => em.style.transform = `scale(${p}) rotate(${P5.lerp(-18, -4, p)}deg)` });
  };
  const shuffleHTML = () => `<div class="od-shuf" aria-label="正在洗牌">${[0, 1, 2, 3, 4, 5].map((i) => `<span style="--i:${i}">${cardBack(96, 60 + i)}</span>`).join('')}</div>`;
  const dailyDone = (c, rev, offline) => `<div class="od-dd-done"><figure class="od-dd-card ${rev ? 'rev' : ''}">${tarotFace(c, { w: 150, rev })}</figure><div class="od-dd-info">
      <div class="od-nr" data-nr></div><small class="od-en">${c.en}</small>${offline ? U.tag('离线', 'line') : ''}
      <p class="od-dd-eff">⚡ <b>${AN('knowledge')}</b> 加成 ×${rev ? '1.2' : '1.5'} <small>今日该属性记录额外加成</small></p>
      <blockquote class="od-dd-adv">今天适合把一件拖了很久的小事做完，然后奖励自己早点睡。</blockquote>
      <p class="od-kws">${['希望', '疗愈', '指引'].map((k) => U.tag(k, 'paper')).join(' ')}</p>
      <div class="od-dd-sec">${ttl('本牌含义')}<p>${rev ? '希望暂时被云遮住，但它没有离开。' : '黑夜里最亮的那颗星——方向正在变清楚。'}</p><p class="muted-d">反思：此刻你最想靠近的，是哪一盏灯？</p></div>
      <div class="od-dd-sec">${ttl('总体运势')}<b class="od-fortune">${rev ? '小吉' : '大吉'}</b></div><p class="od-note-c">每日一抽，明日再会。</p></div></div>`;
  function openDailyDraw(st0 = 'idle') {
    stage({ title: '今日星象', en: 'DAILY DRAW', seed: 37, cls: 'od-astro', body: `${demoBar([['idle', '未抽'], ['noapi', '未配置 API'], ['done', '已抽过'], ['error', '解读失败'], ['resume', '上次未完成']], st0)}<div data-host></div>`, onMount(w) {
      const draw = stateful(w, [], st0, (st) => {
        if (st === 'done') return dailyDone(DRAW3[0], false, false);
        if (st === 'error') return `${U.shp('div', { kind: 'torn', seed: 641, cls: 'od-dd-err' }, `<b class="od-cut-big">解读遇到了阻碍</b><p class="sh-p">上次的解读没能完成——这张牌已经为你留着，直接继续就好。</p><p class="muted-d">可重试 AI 或改用离线兜底</p><div class="sh-acts">${U.btn('使用离线兜底', { tone: 'ink', seed: 642, attrs: 'data-act="offline"' })}${U.btn('重试 AI 解读', { tone: 'red', size: 'lg', seed: 643, attrs: 'data-act="retry"' })}</div>`)}`;
        if (st === 'resume') return `${U.shp('div', { kind: 'torn', seed: 644, cls: 'od-dd-err' }, `<b class="od-cut-big">解读者正在落笔</b><p class="sh-p">上次的解读没写完，牌还是那张「星星 · 正位」。</p><div class="sh-acts">${U.btn('重新解读', { tone: 'ink', seed: 645, attrs: 'data-act="retry"' })}${U.btn('接着写', { tone: 'red', size: 'lg', seed: 646, attrs: 'data-act="retry"' })}</div>`)}`;
        return `<div class="od-dd-idle"><b class="od-cut-big">今日的星象正在汇聚</b><p>每日仅一次，慎重选择 · 正位 / 逆位皆有意义</p>${st === 'noapi' ? `<p class="od-warn">未配置 API — 选择任意卡牌将使用离线兜底</p>` : '<p class="muted-d">结合您近期的处境</p>'}<div class="od-dd-deck">${cardBack(130, 5)}</div>${U.btn('接入命运', { tone: 'red', size: 'lg', seed: 647, attrs: 'data-act="begin"' })}</div>`;
      }, (h, st) => {
        const nr = h.querySelector('[data-nr]'); if (nr) nameReveal(nr, '星星', false);
        h.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
          if (a === 'begin') runDraw(h, st === 'noapi');
          if (a === 'retry') reading(h, false); if (a === 'offline') { h.innerHTML = dailyDone(DRAW3[0], false, true); nameReveal(h.querySelector('[data-nr]'), '星星', false); } });
      });
      function runDraw(h, offline) {
        h.innerHTML = `<p class="od-dd-ph">正在洗牌…</p>${shuffleHTML()}`; P5.sfx('tarot', .6);
        setTimeout(() => {
          h.innerHTML = `<p class="od-dd-ph">从三张牌中选择一张</p><div class="od-dd-fan">${DRAW3.map((c, i) => `<button class="od-flip od-dd-pick" data-i="${i}" style="--r:${(i - 1) * 9}deg" aria-label="第 ${i + 1} 张"><span class="od-flip-in"><span class="od-flip-b">${cardBack(120, 70 + i)}</span><span class="od-flip-f">${tarotFace(c, { w: 120 })}</span></span></button>`).join('')}</div><p class="muted-d od-c">每日仅一次，慎重选择</p>`;
          const ps = h.querySelectorAll('.od-dd-pick'); ps.forEach((p, i) => p.animate([{ transform: 'translateY(-40vh) scale(.5)', opacity: 0 }, { transform: `rotate(${(i - 1) * 9}deg)`, opacity: 1 }], { duration: 480, delay: i * 110, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }));
          ps.forEach((p) => p.onclick = () => { if (h.querySelector('.od-flip-in.on')) return; P5.sfx('tarot', .6); h.querySelector('.od-dd-ph').textContent = '揭示命运…'; ps.forEach((o) => o !== p && o.animate([{ opacity: 1 }, { opacity: .15, transform: 'scale(.86)' }], { duration: 300, fill: 'forwards' })); p.querySelector('.od-flip-in').classList.add('on'); setTimeout(() => reading(h, offline), RM() ? 0 : 1100); });
        }, RM() ? 0 : 1300);
      }
      function reading(h, offline) {
        if (offline) { h.innerHTML = dailyDone(DRAW3[0], false, true); nameReveal(h.querySelector('[data-nr]'), '星星', false); return; }
        h.innerHTML = `<div class="od-dd-read"><figure>${tarotFace(DRAW3[0], { w: 120 })}</figure>${thinking('解读者正在思索', '离开这页也不会中断')}<p class="od-stream"></p></div>`;
        const s = '星星正位。今天适合把一件拖了很久的小事做完……', el = h.querySelector('.od-stream'); let i = 0;
        setTimeout(() => { h.querySelector('.od-think b').firstChild.textContent = '落笔中'; const t = setInterval(() => { el.textContent = s.slice(0, ++i); if (i >= s.length) { clearInterval(t); setTimeout(() => { h.innerHTML = dailyDone(DRAW3[0], false, false); nameReveal(h.querySelector('[data-nr]'), '星星', false); P5.panelIn(h.querySelectorAll('.od-dd-info > *'), { stagger: .05 }); }, 500); } }, 50); }, 900);
      }
    } });
  }
  function openShuffle() { sheet('洗牌 ShuffleAnim', `${shuffleHTML()}<p class="muted-d od-c">卡背左右交错抖动 0.9s（循环演示）；reduced-motion 时静止。</p>`, null, 59); }
  function openNameReveal() {
    sheet('牌名逐字 CardNameReveal', `<div class="od-nr od-nr-big" data-nr></div><div class="sh-acts">${U.btn('重放 · 正位', { tone: 'paper', seed: 651, attrs: 'data-u' })}${U.btn('重放 · 逆位', { tone: 'ink', seed: 652, attrs: 'data-r' })}</div><p class="muted-d">每字 spring 460/24、间隔 .07s；正 / 逆位章 spring 480/18。</p>`, (sh) => { const el = sh.querySelector('[data-nr]'); nameReveal(el, '命运之轮', false); sh.querySelector('[data-u]').onclick = () => nameReveal(el, '命运之轮', false); sh.querySelector('[data-r]').onclick = () => nameReveal(el, '倒吊人', true); }, 61);
  }
  function openThinking() { sheet('思索环 ThinkingCircle', `<div class="od-c">${thinking('推演中', '三张牌正在被放在一起推演')}</div>`, null, 63); }

  /* ── 深度解读 LongReadingFlow ── */
  const PERIOD = { recent: ['最近', '这几天的走向', '未来 2–3 天', ['昨日', '今日', '明日']], midterm: ['一段时间', '几周内的脉络', '2–4 周', ['现状', '阻碍', '方向']], longterm: ['长远打算', '月或更久的长期', '数月以上', ['根基', '进程', '结果']] };
  const LR_CARDS = [[MAJ[9], false], [MAJ[16], true], [MAJ[19], false]];
  const lrSpread = (per, base) => `<div class="od-lr-spread">${base ? `<figure class="base"><span>${tarotFace(MAJ[21], { w: 84 })}</span><figcaption>底色</figcaption></figure>` : ''}${LR_CARDS.map(([c, r], i) => `<figure><span>${tarotFace(c, { w: 92, rev: r })}</span><figcaption>${PERIOD[per][3][i]} · ${c.name}${r ? ' 逆' : ''}</figcaption></figure>`).join('')}</div>`;
  const lrText = `<div class="od-lr-txt"><h4>现状 · 隐士</h4><p>你正在一个人消化很多事。这不是坏事——安静的时候，问题会显出它真正的轮廓。</p><h4>阻碍 · 塔（逆位）</h4><p>你害怕的那场「崩塌」其实已经在慢慢发生，与其硬撑，不如主动拆掉一面不必要的墙。</p><h4>方向 · 太阳</h4><p>两到四周后会有一件让你松一口气的事。把精力留给它。</p><p class="od-fortune-line">吉凶：<b class="od-fortune">中吉</b></p></div>`;
  const LR_STREAM = '隐士、塔（逆位）、太阳。这三张放在一起，说的是一段先收、后放的路。\n\n现状 · 隐士：你正在一个人消化很多事。安静的时候，问题会显出它真正的轮廓。\n阻碍 · 塔（逆位）：你害怕的那场「崩塌」其实已经在慢慢发生，与其硬撑，不如主动拆掉一面不必要的墙。\n方向 · 太阳：两到四周后会有一件让你松一口气的事。把精力留给它。';
  function openLongReading(st0 = 'form') {
    let per = 'midterm', picked = [];
    stage({ title: '深度解读', en: 'READING', seed: 41, cls: 'od-astro', body: `${demoBar([['form', '提问'], ['pending', '上次未完成'], ['noapi', '未配置 API'], ['base', '长远 · 注入波纹'], ['picking', '六选三'], ['reading', '解读中'], ['stopped', '被截断'], ['error', '生成失败'], ['done', '解读详情'], ['followerr', '追问失败']], st0)}<div data-host></div>`, onMount(w, close) {
      const draw = stateful(w, [], st0, (st) => {
        const pos = (p) => (p === 'longterm' ? ['底色', ...PERIOD[p][3]] : PERIOD[p][3]).join(' · ');
        if (st === 'form' || st === 'noapi' || st === 'pending') return `${st === 'pending' ? U.shp('div', { kind: 'cut', seed: 661, tone: 'ink', cls: 'od-lr-pend' }, `<b>上次的占卜没有生成完</b><small>「最近总是睡不好，是不是该换份工作？」· 一段时间</small><span class="sh-acts">${U.btn('放弃', { tone: 'paper', size: 'sm', seed: 662, attrs: 'data-act="drop"' })}${U.btn('用同一副牌继续', { tone: 'red', size: 'sm', seed: 663, attrs: 'data-act="cont"' })}</span>`) : ''}
          ${U.shp('div', { kind: 'torn', seed: 664, cls: 'od-lr-form' }, `${st === 'noapi' ? '<p class="od-warn">中长期占卜需要 AI 解读，请先在「设置 → AI 服务」中配置 API 密钥。</p>' : ''}<label class="fld"><span>你想要询问什么？</span><textarea class="inp" rows="3" placeholder="例：我最近对工作的方向感到迷茫，接下来该如何取舍？"></textarea></label>
            <div class="fld"><span>时间周期</span><div class="od-per">${Object.entries(PERIOD).map(([k, [l, h, d]]) => `<button data-per="${k}" aria-pressed="${k === per}"><b>${l}</b><small>${h}</small><em>${d}</em></button>`).join('')}</div></div>
            <p class="od-lr-pos">牌阵：<b>${pos(per)}</b></p>${U.btn('🂠 开始洗牌', { tone: 'red', size: 'lg', seed: 665, attrs: `data-act="start" ${st === 'noapi' ? 'disabled' : ''}`, cls: `od-wide ${st === 'noapi' ? 'od-dis' : ''}` })}`)}`;
        if (st === 'base') return `<div class="od-lr-base"><b class="od-cut-big" data-bt>请您注入命运的波纹</b><p data-bs>长按牌堆，直到波纹注满</p><button class="od-hold od-deck" aria-label="长按注入命运的波纹"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="none" stroke="rgba(242,233,218,.3)" stroke-width="4"/><circle class="od-hold-p" cx="50" cy="50" r="46" fill="none" stroke="var(--paper)" stroke-width="5" stroke-dasharray="0 290" transform="rotate(-90 50 50)"/></svg><span class="od-deck-c">${cardBack(110, 81)}</span></button>${U.btn('返回', { tone: 'ink', size: 'sm', seed: 666, attrs: 'data-act="back"' })}</div>`;
        if (st === 'picking') return `<p class="od-dd-ph">从六张牌中选出三张 <b data-n>0</b>/3</p><div class="od-lr-six">${Array.from({ length: 6 }, (_, i) => `<button class="od-lr-c" data-i="${i}" aria-pressed="false" aria-label="第 ${i + 1} 张">${cardBack(90, 90 + i)}<small></small></button>`).join('')}</div><div class="sh-acts od-c">${U.btn('返回', { tone: 'ink', seed: 667, attrs: 'data-act="back"' })}${U.btn('揭示牌阵…', { tone: 'red', size: 'lg', seed: 668, attrs: 'data-act="reveal" disabled', cls: 'od-dis' })}</div>`;
        if (st === 'reading' || st === 'stopped' || st === 'error') return `<p class="od-dd-ph">三张牌依次翻开，等候星象的解读</p>${lrSpread(per, per === 'longterm')}<div class="p4-lr-box"><div data-think>${thinking('正在展开牌阵')}</div><div class="od-stream p4-lr-stream" data-stream hidden></div></div>
          <div class="sh-acts od-c" data-live hidden>${U.btn('停止', { tone: 'paper', size: 'sm', seed: 678, attrs: 'data-act="stop"' })}</div>
          <div class="p4-lr-err" data-err hidden><p class="od-warn" data-errmsg></p><div class="sh-acts od-c"><span data-trunc>${U.btn('接着写', { tone: 'red', size: 'sm', seed: 671, attrs: 'data-act="resume"' })}${U.btn('就用这些', { tone: 'paper', size: 'sm', seed: 670, attrs: 'data-act="done"' })}</span>${U.btn('返回抽卡重试', { tone: 'ink', size: 'sm', seed: 669, attrs: 'data-act="picking"' })}</div></div>
          <p class="muted-d od-c">离开这页也不会中断，回来接着看。</p>`;
        /* done / followerr */
        return `${U.shp('section', { kind: 'torn', seed: 672, cls: 'od-lr-done' }, `<div class="od-lr-q"><small class="od-k">问</small><b>最近总是睡不好，是不是该换份工作？</b><span>${U.tag(PERIOD[per][0])}${U.tag(md(today), 'ink')}${U.tag('活跃', 'line')}</span></div>${lrSpread(per, per === 'longterm')}${lrText}
          <div class="od-lr-follow"><button class="od-addline" data-act="follow">追问（仅一次） ▼</button><div class="od-lr-fbox" hidden><textarea class="inp" rows="2" placeholder="想对先前的解读再深入问什么？"></textarea><div class="sh-acts">${U.btn('收起', { tone: 'ink', size: 'sm', seed: 673, attrs: 'data-act="fold"' })}${U.btn('抽一张牌', { tone: 'red', seed: 674, attrs: 'data-act="fdraw"' })}</div></div></div>
          <div class="sh-acts">${U.btn('窥探命运', { tone: 'paper', size: 'sm', seed: 675, attrs: 'data-act="glimpse"' })}${U.btn('归档', { tone: 'ink', size: 'sm', seed: 676, attrs: 'data-act="arch"' })}${U.btn('删除', { tone: 'red', size: 'sm', seed: 677, attrs: 'data-act="del"' })}</div>`)}`;
      }, (h, st, draw) => {
        if (st === 'reading' || st === 'stopped' || st === 'error') {
          const full = LR_STREAM, el = h.querySelector('[data-stream]'), th = h.querySelector('[data-think]'), live = h.querySelector('[data-live]'), er = h.querySelector('[data-err]');
          P5.panelIn(h.querySelectorAll('.od-lr-spread figure'), { stagger: .25, from: 'up' });
          let i = 0, t = 0; const k = st === 'stopped' ? Math.floor(full.length * .45) : full.length;
          const showErr = (trunc) => { live.hidden = true; er.hidden = false; /* 文案 = 真实 utils/tarotJobs.ts（LENGTH_CUT / INTERRUPTED + CONTINUE_HINT）与 tarotAI.formatApiError（网络失败） */ h.querySelector('[data-errmsg]').textContent = trunc ? `${trunc === 'cut' ? '写到一半被截断了（模型输出预算不足）。' : '连接中途断开，正文没有收完。'}已写的部分留着，可以让它接着写。` : '连不上 AI 服务：网络断了或不稳定，稍后再试一次。网页版用中转站时，也可能是它没开放跨域访问（CORS）。'; h.querySelector('[data-trunc]').hidden = !trunc; };
          const run = (to) => { th.hidden = true; el.hidden = false; live.hidden = false; er.hidden = true; t = setInterval(() => { if (!document.contains(el)) return clearInterval(t); i = Math.min(to, i + 2); el.innerHTML = esc(full.slice(0, i)).replace(/\n/g, '<br>') + '<i class="oa-caret"></i>'; if (i >= to) { clearInterval(t); if (to < full.length) showErr('cut'); else { live.hidden = true; el.innerHTML = esc(full).replace(/\n/g, '<br>'); setTimeout(() => { if (document.contains(el)) draw('done'); }, 700); } } }, RM() ? 1 : 40); };
          if (st === 'error') { setTimeout(() => { th.hidden = true; showErr(false); }, RM() ? 0 : 900); }
          else { let pc = 0; const pi = setInterval(() => { if (!document.contains(th)) return clearInterval(pi); pc = Math.min(100, pc + 9); th.innerHTML = thinking('三张牌正在被放在一起推演', `${pc}%`); if (pc >= 100) { clearInterval(pi); run(k); } }, RM() ? 1 : 110); th.innerHTML = thinking('正在展开牌阵'); }
          h.__stop = () => { clearInterval(t); showErr('net'); };
          h.__resume = () => run(full.length);
        }
        if (st === 'base') { const hold = h.querySelector('.od-hold'), p = hold.querySelector('.od-hold-p'); let t0 = 0, raf = 0, done = false; const step = (n) => { const k = Math.min(1, (n - t0) / 1400); p.setAttribute('stroke-dasharray', `${(290 * k).toFixed(0)} 290`); hold.style.transform = `scale(${1 + k * .05}) rotate(${Math.sin(n / 40) * k * 2}deg)`; if (k < 1) raf = requestAnimationFrame(step); else { done = true; raf = 0; hold.style.transform = ''; h.querySelector('[data-bt]').textContent = '命运的波纹已注入'; h.querySelector('[data-bs]').textContent = '底色已定，稍后与三张牌一起翻开'; P5.sfx('tarot', .6); setTimeout(() => draw('picking'), 1100); } };
          hold.addEventListener('pointerdown', (e) => { if (done) return; e.preventDefault(); t0 = performance.now(); raf = requestAnimationFrame(step); }); ['pointerup', 'pointerleave'].forEach((k) => hold.addEventListener(k, () => { if (raf) { cancelAnimationFrame(raf); raf = 0; p.setAttribute('stroke-dasharray', '0 290'); hold.style.transform = ''; } })); }
        if (st === 'picking') { picked = []; const n = h.querySelector('[data-n]'), rv = h.querySelector('[data-act="reveal"]'); h.querySelectorAll('.od-lr-c').forEach((c) => c.onclick = () => { const i = picked.indexOf(c); if (i >= 0) picked.splice(i, 1); else if (picked.length < 3) picked.push(c); h.querySelectorAll('.od-lr-c').forEach((x) => { const k = picked.indexOf(x); x.setAttribute('aria-pressed', k >= 0); x.querySelector('small').textContent = k >= 0 ? PERIOD[per][3][k] : ''; }); n.textContent = picked.length; rv.disabled = picked.length < 3; rv.classList.toggle('od-dis', picked.length < 3); }); }
        h.addEventListener('click', (e) => { const pb = e.target.closest('[data-per]'); if (pb) { per = pb.dataset.per; h.querySelectorAll('[data-per]').forEach((x) => x.setAttribute('aria-pressed', x === pb)); h.querySelector('.od-lr-pos b').textContent = (per === 'longterm' ? ['底色', ...PERIOD[per][3]] : PERIOD[per][3]).join(' · '); return; }
          const b = e.target.closest('[data-act]'); if (!b || b.disabled) return; const a = b.dataset.act;
          if (a === 'start' || a === 'cont') { P5.sfx('tarot', .6); h.innerHTML = `<p class="od-dd-ph">正在洗牌…</p>${shuffleHTML()}`; setTimeout(() => draw(a === 'cont' ? 'reading' : per === 'longterm' ? 'base' : 'picking'), RM() ? 0 : 1100); }
          if (a === 'drop') b.closest('.od-lr-pend').remove();
          if (a === 'back') draw('form'); if (a === 'reveal') draw('reading'); if (a === 'picking') draw('picking'); if (a === 'done') draw('done'); if (a === 'reading') draw('reading');
          if (a === 'follow') { h.querySelector('.od-lr-fbox').hidden = false; b.textContent = '追问（仅一次） ▲'; }
          if (a === 'fold') { h.querySelector('.od-lr-fbox').hidden = true; h.querySelector('[data-act="follow"]').textContent = '追问（仅一次） ▼'; }
          if (a === 'stop') h.__stop && h.__stop();
          if (a === 'resume') h.__resume && h.__resume();
          if (a === 'fdraw') { const box = h.querySelector('.od-lr-fbox'); let fail = st === 'followerr'; box.innerHTML = `<p class="od-dd-ph">从三张中选一张</p><div class="od-dd-fan sm">${[MAJ[1], MAJ[14], MAJ[4]].map((c, i) => `<button class="od-flip od-dd-pick" data-f="${i}" style="--r:${(i - 1) * 8}deg"><span class="od-flip-in"><span class="od-flip-b">${cardBack(80, 100 + i)}</span><span class="od-flip-f">${tarotFace(c, { w: 80 })}</span></span></button>`).join('')}</div>`;
            const answer = (p) => { let pc = 0; box.innerHTML = thinking('正在思索'); const pi = setInterval(() => { if (!document.contains(box)) return clearInterval(pi); pc = Math.min(100, pc + 12); box.innerHTML = thinking('正在思索', `${pc}%`); if (pc < 100) return; clearInterval(pi);
              if (fail) { box.innerHTML = `<p class="od-warn">回应失败</p><div class="sh-acts">${U.btn('重试', { tone: 'red', size: 'sm', seed: 680, attrs: 'data-act="fretry"' })}</div>`; box.querySelector('[data-act="fretry"]').onclick = (ev) => { ev.stopPropagation(); fail = false; answer(p); }; return; }
              const name = ['魔术师', '节制', '皇帝'][+p.dataset.f], txt = '先不急着辞职。用两周时间把作息调回来，再判断累的是工作本身，还是长期睡眠不足。';
              box.innerHTML = `<div class="od-lr-txt"><h4>追问（1/1） · ${name}</h4><p data-ans></p></div><p class="muted-d" data-note hidden>追问已记录，可在档案中回看。</p>`; const ans = box.querySelector('[data-ans]'); let j = 0; const ti = setInterval(() => { if (!document.contains(ans)) return clearInterval(ti); j = Math.min(txt.length, j + 1); ans.innerHTML = esc(txt.slice(0, j)) + (j < txt.length ? '<i class="oa-caret"></i>' : ''); if (j >= txt.length) { clearInterval(ti); box.querySelector('[data-note]').hidden = false; } }, RM() ? 1 : 45);
              h.querySelector('[data-act="follow"]').disabled = true; h.querySelector('[data-act="follow"]').textContent = '追问（1/1）'; }, RM() ? 1 : 120); };
            box.querySelectorAll('[data-f]').forEach((p) => p.onclick = () => { p.querySelector('.od-flip-in').classList.add('on'); setTimeout(() => answer(p), RM() ? 0 : 800); }); }
          if (a === 'arch') { const on = b.querySelector('span').textContent === '归档'; b.querySelector('span').textContent = on ? '取消归档' : '归档'; const t = h.querySelector('.od-lr-q .tag.line'); t.textContent = on ? '已归档' : '活跃'; P5.toast(on ? '已归档' : '已取消归档'); }
          if (a === 'del') confirm('删除这次占卜', '这次占卜和追问会从档案里删除。', '确认删除', () => { close(); P5.toast('已删除'); });
          if (a === 'glimpse') openFateGlimpse();
        });
      });
    } });
  }
  function openReadingArchive(st0 = 'list') {
    const rows = [['最近总是睡不好，是不是该换份工作？', 'midterm', '10.18', 'active'], ['这学期能不能拿到奖学金？', 'longterm', '09.30', 'active'], ['周末的面试会顺利吗', 'recent', '09.02', 'archived'], ['要不要和老朋友和好', 'midterm', '07.11', 'archived']];
    sheet('占卜档案', `${demoBar([['list', '有档案'], ['empty', '空']], st0)}<div data-host></div>`, (sh) => {
      stateful(sh, [], st0, (st) => st === 'empty' ? `<div class="od-empty"><b>尚未有中长期占卜记录</b><p>发起一次占卜后，此处会保留全部档案</p></div>` : `${seg([['active', '活跃'], ['archived', '已归档']], 'active', 'data-t')}<div class="od-arch" data-l></div>`, (h) => {
        const l = h.querySelector('[data-l]'); if (!l) return;
        const draw = (t) => { l.innerHTML = rows.filter((r) => r[3] === t).map(([q, p, d], i) => `<button class="od-arch-r" data-i="${i}"><i class="req-bg"></i><span class="od-arch-cs">${LR_CARDS.map(([c, r]) => tarotFace(c, { w: 30, rev: r })).join('')}</span><span class="od-arch-m"><b>${q}</b><small>${PERIOD[p][0]} · ${d}${t === 'archived' ? ' · 已归档' : ''}</small></span><em>›</em></button>`).join(''); P5.panelIn(l.children, { from: 'right' }); l.querySelectorAll('button').forEach((b) => b.onclick = () => openLongReading('done')); };
        h.querySelector('[data-t]').addEventListener('pick', (e) => draw(e.detail)); draw('active');
      });
    }, 65);
  }
  /* ── 窥探命运 FateGlimpse（七日连星） ── */
  /** 当日塔罗回看（七日连星里点一颗已抽的星） */
  function openDayReview(day = 6) {
    const WK = '日一二三四五六', c = MAJ[day + 5], dd = addD(day - 6), rev = day % 3 === 0;
    return sheet('当日塔罗回看', `<div class="od-otd-g"><figure class="od-otd-c">${tarotFace(c, { w: 110, rev })}<figcaption>${c.name}${rev ? ' · 逆位' : ' · 正位'}</figcaption></figure><div>${ttl('当日解读', `${md(dd)} 周${WK[dd.getDay()]}`)}<p class="sh-p">${MEAN.up[day % 4]}。那天你记下了 3 条。</p></div></div><div class="sh-acts">${U.btn('关闭', { tone: 'ink', seed: 691, attrs: 'data-x' })}</div>`, (sh, c2) => sh.querySelector('[data-x]').onclick = c2, 67);
  }
  function openFateGlimpse(st0 = 'progress') {
    const WK = '日一二三四五六';
    stage({ title: '窥探命运', en: 'GLIMPSE', seed: 43, cls: 'od-astro', body: `${demoBar([['progress', '4 / 7'], ['ready', '七星连缀'], ['ritual', '仪式'], ['read', '解读'], ['bless', '祝福'], ['active', '祝福生效中']], st0)}<div data-host></div>`, onMount(w, close) {
      const stars = (n) => `<div class="od-gl-row">${Array.from({ length: 7 }, (_, i) => { const d = addD(i - 6), on = i >= 7 - n; return `<button class="od-gl-s ${on ? 'on' : ''}" ${on ? `data-day="${i}"` : 'disabled'} aria-label="${on ? `查看 ${md(d)} 的塔罗解读` : '未抽'}"><svg viewBox="0 0 40 40" aria-hidden="true"><polygon points="${P5.shape.starPts(20, 21, 18)}" fill="${on ? '#D7000F' : 'none'}" stroke="#F2E9DA" stroke-width="2"/></svg><small>${i === 6 ? '今日' : '周' + WK[d.getDay()]}</small></button>`; }).join('')}</div><svg class="od-gl-line" viewBox="0 0 700 20" preserveAspectRatio="none" aria-hidden="true"><path d="M50 10 L650 10" stroke="#F2E9DA" stroke-width="3" stroke-dasharray="${n >= 7 ? '0' : '6 8'}"/></svg>`;
      const draw = stateful(w, [], st0, (st) => {
        if (st === 'progress' || st === 'ready' || st === 'active') { const n = st === 'progress' ? 4 : 7;
          return `${U.shp('section', { kind: 'cut', seed: 681, tone: 'ink', cls: 'od-gl' }, `<b class="od-gl-t">七日连星</b>${stars(st === 'active' ? 2 : n)}<p>连续七日抽取每日塔罗，七星连缀之时，可窥探一次命运。</p>${st === 'active' ? '<p class="od-gl-bl">命运的祝福生效中：战场伤害 +10%，每日首次记录 +1 点。七日计数已重新开始。</p>' : ''}
            <div class="sh-acts">${U.btn('回顾上次', { tone: 'paper', size: 'sm', seed: 682, attrs: 'data-act="last"' })}${st === 'active' ? U.btn('查看解读', { tone: 'paper', size: 'sm', seed: 683, attrs: 'data-act="read"' }) : U.btn('窥 探 命 运', { tone: 'red', size: 'lg', seed: 684, attrs: `data-act="go" ${n < 7 ? 'disabled' : ''}`, cls: n < 7 ? 'od-dis' : '' })}</div>`)}`; }
        if (st === 'ritual') return `<div class="od-gl-rit"><p class="od-dd-ph" data-p>七日的牌正在聚拢……</p><div class="od-gl-ring">${Array.from({ length: 7 }, (_, i) => `<span style="--a:${i * 360 / 7}deg">${cardBack(54, 120 + i)}</span>`).join('')}<button class="od-hold od-gl-core" aria-label="长按中央的命运之牌"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="od-hold-p" cx="50" cy="50" r="46" fill="none" stroke="var(--paper)" stroke-width="5" stroke-dasharray="0 290" transform="rotate(-90 50 50)"/></svg>${cardBack(96, 130)}</button></div><p class="od-c" data-s>长按中央的命运之牌</p></div>`;
        if (st === 'read') return `${U.shp('section', { kind: 'torn', seed: 685, cls: 'od-lr-done' }, `<div class="od-gl-seven">${MAJ.slice(10, 17).map((c, i) => tarotFace(c, { w: 44, rev: i % 3 === 1 })).join('')}</div><div class="od-lr-txt"><h4>总结</h4><p>这七天你一直在「收拾残局」，但每一张牌都在说：底子还在。</p><h4>展望</h4><p>接下来三天适合开一个小头——不必是大计划。</p><h4>建议</h4><p>把最想逃避的那件事，拆成十分钟能做完的一步。</p></div><p class="muted-d">命运仍在落笔…… 卡住时：</p><div class="sh-acts">${U.btn('使用离线兜底', { tone: 'ink', size: 'sm', seed: 686, attrs: 'data-act="noop"' })}${U.btn('重试 AI 解读', { tone: 'paper', size: 'sm', seed: 687, attrs: 'data-act="noop"' })}${U.btn('重新解读', { tone: 'paper', size: 'sm', seed: 688, attrs: 'data-act="noop"' })}${U.btn('接着写', { tone: 'red', size: 'sm', seed: 689, attrs: 'data-act="bless"' })}</div>`)}`;
        return `<div class="od-gl-bless">${U.burst('×1.1', { sz: 120 })}<b class="od-cut-big">命运的祝福 · 三日</b><p>逆影战场伤害 <b>+10%</b> · 每日首次记录，最高的那项属性加点额外 <b>+1</b></p>${U.btn('收下命运的低语', { tone: 'red', size: 'lg', seed: 690, attrs: 'data-act="take"' })}</div>`;
      }, (h, st, draw) => {
        if (st === 'ritual') { setTimeout(() => { const p = h.querySelector('[data-p]'); if (p) p.textContent = '窥探命运'; }, 900); const hold = h.querySelector('.od-gl-core'), pp = hold.querySelector('.od-hold-p'), s = h.querySelector('[data-s]'); let t0, raf = 0;
          const step = (n) => { const k = Math.min(1, (n - t0) / 1600); pp.setAttribute('stroke-dasharray', `${(290 * k).toFixed(0)} 290`); if (k < 1) raf = requestAnimationFrame(step); else { raf = 0; s.textContent = '命运正在凝聚成文字……'; h.querySelector('.od-gl-ring').classList.add('gather'); setTimeout(() => draw('read'), 1200); } };
          hold.addEventListener('pointerdown', (e) => { e.preventDefault(); t0 = performance.now(); s.textContent = '别松手——命运正在显形'; raf = requestAnimationFrame(step); }); ['pointerup', 'pointerleave'].forEach((k) => hold.addEventListener(k, () => { if (raf) { cancelAnimationFrame(raf); raf = 0; pp.setAttribute('stroke-dasharray', '0 290'); s.textContent = '长按中央的命运之牌'; } })); }
        h.addEventListener('click', (e) => { const d = e.target.closest('[data-day]'); if (d) return openDayReview(+d.dataset.day); if (false) { const c = MAJ[0], dd = today; return sheet('当日塔罗回看', `<div class="od-otd-g"><figure class="od-otd-c">${tarotFace(c, { w: 110, rev: +d.dataset.day % 3 === 0 })}<figcaption>${c.name}${+d.dataset.day % 3 === 0 ? ' · 逆位' : ' · 正位'}</figcaption></figure><div>${ttl('当日解读', `${md(dd)} 周${WK[dd.getDay()]}`)}<p class="sh-p">${MEAN.up[+d.dataset.day % 4]}。那天你记下了 3 条。</p></div></div><div class="sh-acts">${U.btn('关闭', { tone: 'ink', seed: 691, attrs: 'data-x' })}</div>`, (sh, c2) => sh.querySelector('[data-x]').onclick = c2, 67); }
          const b = e.target.closest('[data-act]'); if (!b || b.disabled) return; const a = b.dataset.act;
          if (a === 'go') draw('ritual'); if (a === 'last' || a === 'read') draw('read'); if (a === 'bless') draw('bless'); if (a === 'take') { P5.sfx('level'); draw('active'); P5.toast('命运的祝福生效中'); } if (a === 'noop') P5.toast('已重新请求'); });
      });
    } });
  }

  /* ══════════════════ 宣告卡 callingCard/* ══════════════════ */
  /** 程序化预告信（SVG 红信纸 + 剪报台词），不用位图 */
  const ccLetter = (title, line = '命运在此倾覆', tex = 'stripe') => `<div class="od-ccl tex-${tex}"><span class="od-ccl-corner" aria-hidden="true">${U.star('var(--ink)', 'var(--paper)', 1.6)}</span>${U.ransom('TAKE YOUR HEART', { h: 22, seed: 8 })}<b class="od-ccl-t">${esc(title)}</b><i class="od-ccl-s">${esc(line)}</i><span class="od-ccl-sign">— MASKARIA</span></div>`;
  function openCCCutIn(kind = 'deadline') {
    const K = { deadline: ['宣告 · 时之至', '约定的那一日已经到来。'], todos: ['宣告 · 达成', '所有任务已被你跨过。'], archived: ['宣告 · 已收', '收存于档案。'] }[kind];
    P5.sfx('fanfare', .55);
    const v = document.createElement('div'); v.className = 'od-veil od-cci';
    v.innerHTML = `<div class="od-bg" aria-hidden="true">${P5.bgSVG({ seed: 71, wide: P5.isWide(), fx: P5.isWide() ? 800 : 500, fy: 360 })}</div><div class="od-cci-in"><span class="od-cci-stamp">${K[0]}</span><div class="od-cci-card">${ccLetter('期末考试全科通过', '偷走懒惰之心')}</div>
      <p class="od-cci-line">${K[1]}</p><small class="od-cci-sub">宣告卡 · 达成 · 共 17 天</small><div class="sh-acts">${U.btn('留下记录', { tone: 'paper', seed: 701, attrs: 'data-act="rec"' })}${U.btn('收下卡片', { tone: 'red', size: 'lg', seed: 702, attrs: 'data-x' })}</div></div><div class="od-demo od-cci-demo"><small>演示态</small>${[['deadline', '时之至'], ['todos', '达成'], ['archived', '已收']].map(([k, l]) => `<button data-k="${k}" aria-pressed="${k === kind}">${l}</button>`).join('')}</div>`;
    document.body.appendChild(v);
    const close = () => v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'both' }).onfinish = () => v.remove();
    v.querySelector('[data-x]').onclick = close;
    v.querySelectorAll('[data-k]').forEach((b) => b.onclick = () => { v.remove(); openCCCutIn(b.dataset.k); });
    v.querySelector('[data-act="rec"]').onclick = (e) => { const b = e.currentTarget, s = b.querySelector('span'); s.textContent = '正在落墨…'; b.disabled = true; setTimeout(() => s.textContent = '✓ 已留下记录', 900); };
    if (RM()) return;
    const card = v.querySelector('.od-cci-card');
    card.animate([{ transform: 'translate(60vw,-50vh) rotate(-50deg) scale(.4)', opacity: 0 }, { transform: 'rotate(-6deg) scale(1.08)', opacity: 1, offset: .6 }, { transform: 'rotate(-4deg)', opacity: 1 }], { duration: 800, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
    v.querySelector('.od-cci-stamp').animate([{ transform: 'scale(2.6) rotate(-24deg)', opacity: 0 }, { transform: 'rotate(-8deg)', opacity: 1 }], { duration: 320, delay: 700, easing: 'cubic-bezier(.15,.95,.1,1)', fill: 'backwards' });
    P5.slamTiles(v.querySelectorAll('.od-ccl .ransom img'), .03);
    P5.panelIn(v.querySelectorAll('.od-cci-line, .od-cci-sub, .od-cci-in .sh-acts'), { stagger: .1, delay: 1 });
  }
  function openCCEditor(edit = false, o = {}) {
    const C = o.card || (edit ? { title: '期末考试全科通过', subtitle: '偷走懒惰之心', target: '2026-11-06', start: todayKey, mode: 'deadline', pinned: true } : null);
    const TODOS = [['晨跑 5 公里', '每日'], ['读完《人间失格》第三章', '每日'], ['给妈妈打电话', '每日'], ['练习吉他 30 分钟', '长期'], ['整理房间', '单次'], ['背 50 个单词', '每日'], ['准备雅思 7 分', '长期']];
    const ICONS = ['★', '✦', '☾', '♛', '⚑', '✎', '♪', '⚡'];
    let mode = C ? ({ deadline: 'date', todos: 'todos', both: 'both' }[C.mode] || 'date') : 'date', page = 0;
    sheet(edit ? '编辑倒计时' : '新建倒计时', `<div class="fld"><span>模式</span>${seg([['date', '日期'], ['todos', '任务清单'], ['both', '兼有']], mode, 'data-mode')}<p class="muted-d" data-mh>只看日期：到那天自动归档（"时之至"）</p></div>
      <label class="fld"><span>标题</span><input class="inp" placeholder="例如 高考 / 婚礼 / v3 上线" value="${C ? esc(C.title) : ''}"></label>
      <label class="fld"><span>宣告台词（可选）</span><input class="inp" data-line placeholder="命运在此倾覆 / 我宣告 …" value="${C ? esc(C.subtitle || '') : ''}"></label>
      <div class="od-cce-dates" data-dates><label class="fld"><span>起算日</span><input class="inp" type="date" data-s value="${C ? C.start : todayKey}"></label><label class="fld"><span>目标日</span><input class="inp" type="date" data-t value="${C ? C.target : '2026-11-06'}"></label></div><p class="od-cce-days" data-days>共 <b>17</b> 天</p>
      <div class="fld" data-todos hidden><span>关联任务（已选 <b data-cnt>0</b> / 5）</span><div class="od-cce-list" data-list></div><div class="od-cce-pg">${U.btn('‹ 上一组', { tone: 'ink', size: 'sm', seed: 711, attrs: 'data-pg="-1"' })}${U.btn('下一组 ›', { tone: 'ink', size: 'sm', seed: 712, attrs: 'data-pg="1"' })}</div></div>
      <div class="fld"><span>纹理 / 图标</span>${seg([['stripe', '斜纹'], ['grid', '网格'], ['dots', '点阵'], ['solid', '纯色']], 'stripe', 'data-tex')}<div class="od-cce-ic">${ICONS.map((g, i) => `<button aria-pressed="${i === 0}" aria-label="图标 ${g}">${g}</button>`).join('')}</div></div>
      <div class="od-cce-pv" data-pv>${ccLetter(C ? C.title : '新的宣言', C ? C.subtitle || '命运在此倾覆' : '命运在此倾覆')}</div>
      <div class="tg"><b>📌 钉到首页</b><small>在 HERO 卡片上常驻显示这张卡 · 会替换当前已钉选的另一张卡</small>${sw(C ? !!C.pinned : false, 'data-pin')}</div>
      <div class="sh-acts">${U.btn('关闭', { tone: 'ink', seed: 713, attrs: 'data-x' })}${U.btn(edit ? '保存修改' : '✦ 立此宣告', { tone: 'red', size: 'lg', seed: 714, attrs: 'data-ok' })}</div>`, (sh, close) => {
      const sel = new Set();
      const hint = { date: '只看日期：到那天自动归档（"时之至"）', todos: '只看任务：选定项全部完成时自动归档（"达成"）', both: '两条都设：先到的为准（先做完所有任务 / 先到日子）' };
      const list = () => { const L = sh.querySelector('[data-list]'); L.innerHTML = TODOS.slice(page * 4, page * 4 + 4).map(([t, k], i) => { const id = page * 4 + i; return `<button class="od-cce-t ${sel.has(id) ? 'on' : ''}" data-id="${id}" aria-pressed="${sel.has(id)}"><i>${sel.has(id) ? '✓' : ''}</i><b>${t}</b>${U.tag(k, k === '每日' ? '' : 'ink')}</button>`; }).join(''); sh.querySelector('[data-cnt]').textContent = sel.size; };
      sh.querySelector('[data-mode]').addEventListener('pick', (e) => { mode = e.detail; sh.querySelector('[data-mh]').textContent = hint[mode]; sh.querySelector('[data-todos]').hidden = mode === 'date'; sh.querySelector('[data-dates]').hidden = mode === 'todos'; sh.querySelector('[data-days]').hidden = mode === 'todos'; list(); });
      sh.addEventListener('click', (e) => { const t = e.target.closest('.od-cce-t'); if (t) { const id = +t.dataset.id; if (sel.has(id)) sel.delete(id); else if (sel.size < 5) sel.add(id); else P5.toast('最多 5 项'); list(); } const p = e.target.closest('[data-pg]'); if (p) { page = Math.max(0, Math.min(1, page + +p.dataset.pg)); list(); } const ic = e.target.closest('.od-cce-ic button'); if (ic) sh.querySelectorAll('.od-cce-ic button').forEach((x) => x.setAttribute('aria-pressed', x === ic)); });
      sh.querySelector('[data-tex]').addEventListener('pick', (e) => { const l = sh.querySelector('.od-ccl'); l.className = `od-ccl tex-${e.detail}`; });
      const vd = () => { const s = sh.querySelector('[data-s]').value, t = sh.querySelector('[data-t]').value, d = Math.round((new Date(t) - new Date(s)) / 864e5), el = sh.querySelector('[data-days]'); el.innerHTML = s > t ? '<span class="od-err">起算日不能晚于目标日</span>' : t < todayKey ? '<span class="od-err">目标日不能早于今天</span>' : `共 <b>${d}</b> 天`; };
      sh.querySelectorAll('[data-s],[data-t]').forEach((i) => i.oninput = vd);
      sh.querySelectorAll('.inp:not([type])').forEach((i) => i.addEventListener('input', () => { const [t, l] = sh.querySelectorAll('.inp:not([type])'); sh.querySelector('.od-ccl-t').textContent = t.value || '新的宣言'; sh.querySelector('.od-ccl-s').textContent = l.value || '命运在此倾覆'; }));
      if (mode !== 'date') { sh.querySelector('[data-todos]').hidden = false; sh.querySelector('[data-dates]').hidden = mode === 'todos'; sh.querySelector('[data-days]').hidden = mode === 'todos'; sh.querySelector('[data-mh]').textContent = hint[mode]; }
      list(); sh.querySelector('[data-x]').onclick = close; sh.querySelector('[data-ok]').onclick = () => {
        const [ti, li] = sh.querySelectorAll('.inp:not([type])'), t = ti.value.trim();
        if (!t) { ti.classList.add('p4-bad'); ti.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 240 }); ti.focus(); return; }
        const s0 = sh.querySelector('[data-s]').value, t0 = sh.querySelector('[data-t]').value;
        if (mode !== 'todos' && (s0 > t0 || t0 < todayKey)) { sh.querySelector('[data-days]').animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 240 }); return; }
        if (mode !== 'date' && !sel.size) { sh.querySelector('[data-todos]').animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 240 }); return; }
        close(); o.onSaved && o.onSaved({ title: t, subtitle: li.value.trim() || '命运在此倾覆', mode: { date: 'deadline', todos: 'todos', both: 'both' }[mode], start: s0, target: mode === 'todos' ? t0 : t0, pinned: sh.querySelector('[data-pin]').classList.contains('on'), todosDone: 0, todosTotal: sel.size || undefined });
        P5.toast(edit ? '已保存' : '预告已发出'); };
    }, 73);
  }
  function openCCEmpty() {
    stage({ title: '宣告卡 · 空态', en: 'CALLING CARD', seed: 75, body: `<div class="od-cce-hint">${U.shp('div', { kind: 'torn', seed: 721, cls: 'od-cch' }, `<span class="od-cch-ic" aria-hidden="true">${U.star()}</span><p>为重要的事写一张「宣告卡」，倒计时随时在此映入眼帘</p><div class="sh-acts">${U.btn('不再提示', { tone: 'ink', size: 'sm', seed: 722, attrs: 'data-act="dismiss"' })}${U.btn('+ 新建', { tone: 'red', seed: 723, attrs: 'data-act="new"' })}</div>`)}</div><p class="od-note">出现在任务页「目标 · 倒计时」面与首页宣告条，没有任何宣告卡时显示。</p>`, onMount(w) {
      w.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return; if (b.dataset.act === 'new') openCCEditor(); else { const c = w.querySelector('.od-cch'); c.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(20px) rotate(4deg)' }], { duration: 240, fill: 'both' }); P5.toast('不再提示'); } });
    } });
  }

  function openShareToOrg(st0 = 'form') {
    sheet('分享到据点', `${demoBar([['form', '可分享'], ['used', '今天用完了'], ['ok', '分享好了']], st0)}<div data-host></div>`, (sh, close) => {
      stateful(sh, [], st0, (st) => st === 'ok' ? `<div class="od-ob-wel">${U.ransom('SHARED', { h: 34, seed: 2 })}<b class="od-cut-big">分享好了</b><p>大家打开据点的公告板就能看到，可以给你贴标签打气。</p><div class="sh-acts">${U.btn('好', { tone: 'ink', seed: 801, attrs: 'data-act="x"' })}${U.btn('去公告板看看', { tone: 'red', size: 'lg', seed: 802, attrs: 'data-act="board"' })}</div></div>`
        : `<p class="sh-p">大家打开据点的公告板就能看到，可以给你贴标签打气。</p><div class="fld"><span>分享到</span><div class="od-chips">${chip(`★ ${ORG.name}`, true, 'data-solo')}</div></div><label class="fld"><span>说一句</span><input class="inp" data-say maxlength="40" placeholder="比如：跑完了第一个五公里" aria-label="分享的那一句"></label>
          <div class="fld"><span>大家会看到</span>${U.shp('div', { kind: 'quad', seed: 803, tone: 'ink', cls: 'od-share-pv' }, `<b>野鸡</b><small>刚刚</small><p data-pv>（写一句）</p>${U.tag('胆量 +2')}`)}</div>
          <p class="muted-d">${st === 'used' ? `今天在「${ORG.name}」已经分享了 3 条，明天再来。` : `今天还能在「${ORG.name}」分享 2 条。`}</p>
          <div class="sh-acts">${U.btn(st === 'used' ? '今天的 3 条用完了' : '分享', { tone: 'red', size: 'lg', seed: 804, attrs: `data-act="share" ${st === 'used' ? 'disabled' : ''}`, cls: st === 'used' ? 'od-dis' : '' })}</div>`,
      (h, st, draw) => { const i = h.querySelector('[data-say]'); if (i) i.oninput = () => h.querySelector('[data-pv]').textContent = i.value || '（写一句）';
        h.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b || b.disabled) return; if (b.dataset.act === 'share') { b.querySelector('span').textContent = '分享中…'; setTimeout(() => draw('ok'), 500); } if (b.dataset.act === 'x') close(); if (b.dataset.act === 'board') { close(); P5.go('org', { via: 'tear' }); } }); });
    }, 87);
  }
  /* ══════════════════ 记账 ledger/LedgerStats · AssetBoard · Donut ══════════════════ */
  const CAT = [['餐饮', 1240, '#D7000F'], ['交通', 210, '#111'], ['学习', 460, '#8E0010'], ['娱乐', 320, '#6b6862'], ['日用', 180, '#b9b2a6']];
  const yen = (n) => '¥' + n.toLocaleString();
  function openLedgerStats(st0 = 'data', offset = 0) {
    stage({ title: '收支统计', en: 'STATS', seed: 91, cls: 'od-led', body: `${demoBar([['data', '有记录'], ['over', '超预算'], ['empty', '空']], st0)}<div data-host></div>`, onMount(w) {
      let mode = 'period', events;
      const draw = stateful(w, [], st0, (st) => { const live = detailLedger?.stats(offset, mode); if (live ? live.ex === 0 && live.inc === 0 : st === 'empty') return `<div class="od-empty"><b>这个月还没有记录。</b><p>记一笔之后，这里会出现类目、趋势和伊戈尔的提点。</p></div>`;
        const ex = live ? live.ex : st === 'over' ? 2860 : 2410, inc = live ? live.inc : 3200, bud = live ? live.budget ?? 0 : 2600;
        const overBudget = (!live || live.budget != null) && ex > bud;
        const cats = live ? live.cats.map(c => [c.name, c.value, c.color, c.change]) : CAT;
        return `<div class="od-ls-top">${seg([['month', '本月收支'], ['period', '本期收支']], detailLedger ? mode : 'month')}${U.btn('🔮 让伊戈尔结算（周 / 月）', { tone: 'red', size: 'sm', seed: 831, attrs: 'data-act="settle"' })}</div>
          <div class="od-ls-kpi">${[['支出', ex, ''], ['收入', inc, 'in'], ['结余', inc - ex, inc - ex >= 0 ? 'in' : '']].map(([k, v, c], i) => U.shp('div', { kind: 'cut', seed: 832 + i, tone: i === 0 ? 'red' : 'ink', cls: 'od-kpi' }, `<small>${k}</small><b class="${c}">${yen(v)}</b>`)).join('')}</div>
          ${U.shp('div', { kind: 'torn', seed: 836, cls: 'od-ls-bud' }, `<div class="od-ls-bh"><b>${live && live.budget == null ? '本月未设预算' : `本月预算 ${yen(bud)}`}</b><span>已花 <b>${yen(ex)}</b> · ${live && live.budget == null ? '未设预算' : overBudget ? `<em class="od-err">超 ${yen(ex - bud)}</em>` : `剩 ${yen(bud - ex)}`}</span></div>${bar(bud > 0 ? ex / bud * 100 : 0, overBudget ? 'over' : '')}<p class="muted-d">🏆 省钱挑战 · 想省 ${live ? live.savings == null ? '未设定' : yen(live.savings) : '¥300'} · 进度 ${live ? live.savings > 0 ? Math.round(Math.max(0, Math.min(100, (bud - ex) / live.savings * 100))) : 0 : ex > bud ? '0' : '62'}%</p>`)}
          <div class="od-ls-grid">${U.shp('div', { kind: 'torn', seed: 837, cls: 'od-ls-c' }, `${ttl('支出类目')}<div class="od-ls-dn">${donut(cats.map(([, v, c]) => ({ value: v, color: c })), cats.reduce((a, c) => a + c[1], 0), { inner: `<small>本月支出</small><b>${yen(ex)}</b>` })}<ul class="od-lg">${cats.map(([n, v, c]) => `<li><i style="background:${c}"></i>${n}<b>${yen(v)}</b></li>`).join('')}</ul></div>`)}
            ${U.shp('div', { kind: 'torn', seed: 838, cls: 'od-ls-c' }, `${ttl('环比上月')}<div class="od-mom">${cats.slice(0, 4).map(([n, v], i) => { const d = live ? cats[i][3] : [12, -8, 30, -15][i]; return `<span><b>${n}</b><em class="${d > 0 ? 'up' : 'dn'}">${d == null ? '暂无对比' : `${d > 0 ? '▲' : '▼'} ${Math.abs(Math.round(d))}%`}</em></span>`; }).join('')}</div>${ttl('月度支出趋势')}<div class="od-trend">${(live ? live.trend.map(t => t.value) : [1980, 2300, 2050, 2700, 2210, ex]).map((v, i) => `<span><i style="height:${live ? v / Math.max(1, ...live.trend.map(t => t.value)) * 100 : v / 30}%"></i><small>${live ? live.trend[i].label : `${(today.getMonth() - 4 + i + 12) % 12 || 12}月`}</small></span>`).join('')}</div>`)}
            ${U.shp('div', { kind: 'torn', seed: 839, cls: 'od-ls-c' }, `${ttl('支付渠道')}<div class="od-ls-dn">${donut(live ? live.channels : [{ value: 1400, color: '#D7000F' }, { value: 760, color: '#111' }, { value: 250, color: '#b9b2a6' }], live ? ex : 2410, { size: 110, inner: `<small>${live ? live.channels.length : 3} 种</small>` })}<ul class="od-lg">${(live ? live.channels : [{name:'微信',value:1400,color:'#D7000F'},{name:'支付宝',value:760,color:'#111'},{name:'银行卡',value:250,color:'#b9b2a6'}]).map(c => `<li><i style="background:${c.color}"></i>${esc(c.name)}<b>${yen(c.value)}</b></li>`).join('')}</ul></div>`)}
            ${U.shp('div', { kind: 'torn', seed: 840, cls: 'od-ls-c' }, `${ttl('收入构成')}<div class="od-inc"><span><b>劳动所得</b>${bar(live ? inc > 0 ? live.labor / inc * 100 : 0 : 84)}<em>${live ? yen(live.labor) : '¥2,700'}</em></span><span><b>其它收入</b>${bar(live ? inc > 0 ? live.other / inc * 100 : 0 : 16)}<em>${live ? yen(live.other) : '¥500'}</em></span></div><p class="muted-d">劳动所得 · 记账 +10 SP · 每日封顶 +2</p>`)}</div>`; },
      (h) => { events?.abort(); events = new AbortController(); h.querySelector('.od-ls-top .seg')?.addEventListener('pick', e => { mode = e.detail; draw(st0); }, {signal:events.signal}); h.addEventListener('click', (e) => { if (e.target.closest('[data-act="settle"]')) openSettle(offset, mode); }, {signal:events.signal}); });
      watchLedgerDetails(w, () => draw(st0, false));
      growDonuts(w);
    } });
  }
  const growDonuts = (root) => { if (RM()) return; root.querySelectorAll('.od-donut > svg').forEach((c, i) => c.animate([{ transform: 'scale(.6) rotate(-60deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 700, delay: 150 + i * 60, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' })); };
  function openSettle(offset = 0, mode = 'period') {
    sheet('心相结算', `${seg([['month', '按月'], ['week', '按周']], 'month', 'data-p')}<div data-body></div>`, (sh) => {
      let sequence = 0;
      const draw = (p) => { const b = sh.querySelector('[data-body]'); const current = ++sequence; b.innerHTML = detailLedger ? '正在读取本地账目…' : `<div class="od-c">${thinking('伊戈尔正凝视着你的账目……')}</div>`;
        const show = (live) => { if (!sh.isConnected || current !== sequence) return; const d = live?.data; b.innerHTML = `${live ? live.bonus || live.challenge !== null ? `<p class="od-sp">🎉 ${live.bonus ? '预算达标 · +10 SP' : ''}${live.challenge !== null ? ' 省钱挑战达成 · +10 SP' : ''}</p>` : '' : p === 'month' ? `<p class="od-sp">🎉 本月不超预算 · +10 SP</p>` : ''}<div class="od-ls-kpi sm">${[['支出', live ? d.totalExpense : p === 'month' ? 2410 : 560], ['收入', live ? d.totalIncome : p === 'month' ? 3200 : 300], ['结余', live ? d.totalIncome - d.totalExpense : p === 'month' ? 790 : -260]].map(([k, v]) => `<div class="q-row"><span class="q-k">${k}</span><b>${yen(v)}</b></div>`).join('')}</div>
          <div class="od-settle">${(live ? [['最贵一笔', d.extremes.priciestEntry ? `${d.extremes.priciestEntry.note} · ${yen(d.extremes.priciestEntry.amount)}` : '暂无'], ['花最多的一天', d.extremes.priciestDay ? `${d.extremes.priciestDay.date} · ${yen(d.extremes.priciestDay.amount)}` : '暂无'], ['花最少的一天', d.extremes.cheapestDay ? `${d.extremes.cheapestDay.date} · ${yen(d.extremes.cheapestDay.amount)}` : '暂无'], ['预期', d.periodBudget == null ? '未设预算' : `${yen(d.periodBudget)} · 省 ${yen(d.periodBudget - d.totalExpense)}`], [`共 ${d.days} 天`, `日均消费 ${yen(Math.round(d.actualDailyAvg * 100) / 100)}`]] : [['最贵一笔', '二手书 · ¥245'], ['花最多的一天', '10月6日 · ¥388'], ['花最少的一天', '10月14日 · ¥6'], ['预期', `¥${p === 'month' ? '2,600' : '600'} · 省 ¥${p === 'month' ? 190 : 40}`], [`共 ${p === 'month' ? 20 : 7} 天`, `日均消费 ¥${p === 'month' ? 120 : 80}`]]).map(([k, v]) => `<div class="od-os-row"><span class="od-k">${k}</span><b>${esc(v)}</b></div>`).join('')}</div>
          ${U.shp('div', { kind: 'quad', seed: 841, tone: 'ink', cls: 'od-igor' }, `<b>伊戈尔的提点</b><p>${live ? esc(`本地账目回顾（未调用 AI） · ${d.label}。${live.result.reflection.replace(/\*\*/g, '')} ${live.result.advice.join('；')}`) : '「吃饭花得最多，这无可厚非。但那本二手书……客人，知识是不会打折的，可你的钱包会。」'}</p>`)}`; P5.panelIn(b.children, { stagger: .06 }); }; if (detailLedger) detailLedger.settlement(p, offset, mode).then(show).catch(() => { if (sh.isConnected && current === sequence) { b.textContent = '本地结算读取失败，切换周期可重试'; P5.toast('结算失败，请重试'); } }); else setTimeout(() => show(null), RM() ? 0 : 900); };
      sh.querySelector('[data-p]').addEventListener('pick', (e) => draw(e.detail)); draw('month');
    }, 93);
  }
  function openAssetBoard(st0 = 'data') {
    stage({ title: '资产板', en: 'ASSETS', seed: 95, cls: 'od-led', body: `${demoBar([['data', '有资产'], ['empty', '无固定资产']], st0)}<div data-host></div>`, onMount(w) {
      let snapshot, events;
      const draw = stateful(w, [], st0, (st) => { const live = detailLedger?.assets(); snapshot = live; const fixed = live ? live.assets.map(a => [a.name, a.price + (a.addOns ?? []).reduce((n, x) => n + x.amount, 0), a.addOns?.length ?? 0]) : st === 'empty' ? [] : [['索尼相机 A7C', 9800, 2], ['雅马哈电钢琴', 4200, 0], ['iPad Air', 4400, 1]], fx = live ? live.fixed : fixed.reduce((a, f) => a + f[1], 0), liq = live ? live.liquid : 3268, dep = live ? live.deposit : 12000;
        return `<div class="od-ab-top">${donut([{ value: Math.max(0, liq), color: '#D7000F' }, { value: dep, color: '#111' }, { value: fx || 1, color: fx ? '#8E0010' : 'transparent' }], Math.max(0, liq + dep + fx), { size: P5.isWide() ? 200 : 168, sw: 14, inner: `<small>总财富</small><b>${yen(liq + dep + fx)}</b>` })}
            <ul class="od-lg big"><li><i style="background:#D7000F"></i>流动资产<b>${yen(liq)}</b></li><li><i style="background:#111"></i>存款<b>${yen(dep)}</b></li><li><i style="background:#8E0010"></i>固定资产<b>${yen(fx)}</b></li></ul></div>
          ${U.shp('div', { kind: 'cut', seed: 851, tone: 'ink', cls: 'od-ab-save' }, `<small>自律攒下 · 历月预算结余累积</small><b>${live ? yen(live.savings) : '¥2,140'}</b>`)}
          <section>${ttl('存款')}<button class="od-addline" data-act="dep">收起存款条目 ▲</button><div class="od-ab-dep">${(live ? live.deposit > 0 ? [['预算结余', live.deposit]] : [] : [['招行定期', 8000], ['余额宝', 4000]]).map(([n, v]) => `<div class="od-os-row"><span>${n}</span><b>${yen(v)}</b></div>`).join('')}</div></section>
          <section>${ttl('固定资产')}${fixed.length ? fixed.map(([n, v, a], i) => `<div class="od-ab-fx" data-i="${i}"><i class="req-bg"></i><b>${esc(n)}</b><small>${a ? ` · +${a} 附加` : ''}</small><em>${yen(v)}</em><button class="od-del" data-act="del" aria-label="删除这件资产">✕</button></div>`).join('') : `<div class="od-empty"><b>还没有登记的固定资产。</b><p>把买过的设备 / 乐器登记进来，看看钱变成了什么。</p></div>`}
            <button class="od-addline" data-act="add">＋ 登记一件资产</button></section>`; },
      (h) => { events?.abort(); events = new AbortController(); h.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) { const r = e.target.closest('.od-ab-fx'); if (r) assetForm(detailLedger ? snapshot.assets[+r.dataset.i]?.id : r.querySelector('b').textContent); return; } const a = b.dataset.act;
        if (a === 'dep') { const d = h.querySelector('.od-ab-dep'); d.hidden = !d.hidden; b.textContent = d.hidden ? '展开存款条目 ▼' : '收起存款条目 ▲'; }
        if (a === 'add') assetForm(); if (a === 'del') { e.stopPropagation(); const r = b.closest('.od-ab-fx'); confirm('删除这件资产？', `「${r.querySelector('b').textContent}」和它的附加费用会一起删除。`, '删除', async () => { if (!detailLedger) return r.remove(); if (r._deleting) return; r._deleting = true; try { await detailLedger.deleteAsset(snapshot.assets[+r.dataset.i].id); P5.toast('已删除'); } catch { P5.toast('删除失败，请重试'); } finally { r._deleting = false; } }); } }, {signal:events.signal}); });
      watchLedgerDetails(w, () => draw(st0, false));
      growDonuts(w);
    } });
  }
  function assetForm(name) {
    const live = detailLedger; const asset = live && name ? live.assets().assets.find(a => a.id === name) : undefined;
    if (live && name && !asset) { P5.toast('这件资产已不存在，请从资产列表重试'); return; }
    if (asset) name = asset.name;
    const requestId = `red-asset-${Date.now()}-${++assetFormSequence}`;
    const addon = (n = '', v = '') => `<div class="od-addon"><input class="inp" placeholder="名称" value="${esc(n)}" aria-label="名称"><input class="inp" type="number" placeholder="金额" value="${v}" aria-label="金额"><button class="od-del" data-act="rm" aria-label="删除附加费用">✕</button></div>`;
    sheet(name ? '资产' : '登记资产', `<label class="fld"><span>名称</span><input class="inp" placeholder="名称（如 索尼相机）" value="${esc(name || '')}"></label><label class="fld"><span>购入价</span><input class="inp" type="number" placeholder="购入价" value="${live ? asset?.price ?? '' : name ? 9800 : ''}"></label>
      <div class="fld"><span>附加费用</span><p class="muted-d">如手机壳、配件、维修费…</p><div data-addons>${live ? (asset?.addOns ?? []).map(a => addon(a.name, a.amount)).join('') : name ? addon('镜头', 1600) + addon('相机包', 280) : ''}</div><div class="od-addon">${'<input class="inp" placeholder="名称" aria-label="新附加费用名称"><input class="inp" type="number" placeholder="金额" aria-label="新附加费用金额">'}${U.btn('加', { tone: 'ink', size: 'sm', seed: 861, attrs: 'data-act="addon"' })}</div></div>
      <div class="sh-acts">${name ? U.btn('删除这件资产', { tone: 'paper', seed: 862, attrs: 'data-act="del"' }) : ''}${U.btn(name ? '保存' : '登记资产', { tone: 'red', size: 'lg', seed: 863, attrs: 'data-ok' })}</div>`, (sh, close) => {
      sh.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act; if (a === 'rm') b.closest('.od-addon').remove(); if (a === 'addon') { const [n, v] = b.closest('.od-addon').querySelectorAll('input'); sh.querySelector('[data-addons]').insertAdjacentHTML('beforeend', addon(n.value || '附加', v.value || 0)); n.value = v.value = ''; } if (a === 'del' && live) { confirm('删除这件资产？', '它和它的附加费用会一起删除。', '删除', async () => { const save = sh.querySelector('[data-ok]'); if (save.disabled) return; save.disabled = true; try { await live.deleteAsset(asset.id); close(); P5.toast('已删除'); } catch { P5.toast('删除失败，请重试'); } finally { save.disabled = false; } }); return; } if (a === 'del') { close(); confirm('删除这件资产？', '它和它的附加费用会一起删除。', '删除', () => P5.toast('已删除')); } });
      sh.querySelector('[data-ok]').onclick = async (e) => {
        if (!live) { close(); P5.toast('已保存'); return; }
        const button = e.currentTarget; if (button.disabled) return;
        const inputs = sh.querySelectorAll('input');
        const addOns = Array.from(sh.querySelectorAll('[data-addons] .od-addon')).map(row => { const [n, v] = row.querySelectorAll('input'); return {name:n.value, amount:live.amount(v.value)}; });
        const pending = sh.querySelector('[data-act="addon"]').closest('.od-addon').querySelectorAll('input');
        if (pending[0].value.trim() || pending[1].value.trim()) addOns.push({name:pending[0].value, amount:live.amount(pending[1].value)});
        button.disabled = true;
        try { await live.saveAsset({name:inputs[0].value, price:live.amount(inputs[1].value), addOns}, asset?.id, requestId); if (sh.isConnected) close(); P5.toast('已保存'); }
        catch { if (sh.isConnected) P5.toast('保存失败，请检查名称和金额后重试'); }
        finally { button.disabled = false; }
      };
    }, 97);
  }
  function openDonut() {
    sheet('甜甜圈环 Donut', `<div class="od-ringgal"><figure>${donut([{ value: 1140, color: '#D7000F' }], 2600, { size: 150, sw: 10, inner: '<small>月余额</small><b>¥1,140</b>' })}<figcaption>hero · 余额环</figcaption></figure><figure>${donut(CAT.map(([, v, c]) => ({ value: v, color: c })), 2410, { size: 120, inner: '<small>类目</small>' })}<figcaption>card · 类目环</figcaption></figure></div><p class="muted-d">segments 按比例堆叠，total 作分母（total > Σvalue 时余下显灰轨 = 未填满）。入场各段同步「填充」生长。</p>`, (sh) => growDonuts(sh), 99);
  }


export const OD: any = { openDayReview, openWishBoard, openWishPanel, openWishFulfill, openWishProposal, openWishProgress, openWishMount, openRings, openWeeklySection, openGoalSetup, openCelebration, openClaimed, openBigHome, openBigPanel, openBigStep, openBigClear, openFateDraw, openQuestBoard, openReturn, openBackfill, openYearRecap, openFlipCard, openTarotFlip, openSeasonCard, openSeasonGallery, openCodex, openDailyDraw, openShuffle, openNameReveal, openThinking, openLongReading, openReadingArchive, openFateGlimpse, openCCCutIn, openCCEditor, openCCEmpty, openShareToOrg, openLedgerStats, openSettle, openAssetBoard, assetForm, openDonut,
  tarotFace, cardBack, seasonFace, ring, arc, donut, thinking, danmaku, cutPanel, cutAnim, ttl, seg, sw, stepper, bar, chip, wire, demoBar, stateful, stage, sheet, confirm, ccLetter, MAJ, MIN, ALL, MARKS, WISHES, BIG, ORG, GOALS, goalLabel, weeklyCard, bigHome, mountPicker, growRings, growDonuts, DRAW3, LR_CARDS, PERIOD, shuffleHTML, nameReveal, dailyDone, CAT, yen };
