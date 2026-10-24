// @ts-nocheck —— 逐字迁移自 v3 原生 overlays/d.js 的「通用件 + 据点 org/*」段（类名 .od-*，样式 = legacy/css/d.css）。
// 据点页（pages/org.p5.js）里的入口都调这里：openHideoutMap / openRaid / openOpCreate / openMeeting / openShareToOrg /
// openOrgSettings / openOrgTitles / openBorrowMask / openOrgOnboard / openOrgCeleb。
import { P5 } from './p5';
import { thinkingCircleHTML } from '@/p5r-red/fx/thinkingCircle';
import { useAppStore } from '@/store';
import { useCloudSocialStore } from '@/store/cloudSocial';
import { getRedHideoutData } from '../../adapter/hideoutData';
import {
  acceptOrgRules, createOrgFromUi, dissolveFromUi, joinOrgFromUi, kickFromUi, leaveFromUi,
  previewOrg, refreshOrg, rotateCodeFromUi, saveMyCardFromUi, setShownMasksFromUi,
  setMemberBlocked, shareActivity, submitMeeting, transferFromUi, updateOrgCustomFromUi, updateOrgFromUi,
} from '@/services/orgSync';
import { allOutFromUi, strikeFromUi } from '@/services/orgRaidSync';
import { cancelOpFromUi, createOpFromUi, optOutFromUi, writeMyPartFromUi } from '@/services/orgOpsSync';
import { buildRaidPanelData } from '@/themes/orgData';
import { ORG_EMBLEMS, ORG_MAX_SHOWN_MASKS, ORG_POSTS_PER_DAY, canShareActivity, defaultShareText, meetingState, myPostsToday, normalizeInviteInput, orgWeekKey, shiftDayKey, zonedDay } from '@/utils/orgLogic';
import { normalizeOpDraft, opDeadlineRange } from '@/utils/orgOps';
import {
  ORG_BUILTIN_TITLES, ORG_CUSTOM_TITLES_MAX, ORG_LEVEL_NAMES, ORG_LEVEL_NAME_MAX,
  ORG_TITLE_CONDS, ORG_TITLE_NAME_MAX, condText, newCustomTitleId,
} from '@/utils/orgTitles';
import type { AttributeId, Org, OrgCodenameKind, OrgCustom, OrgCustomTitle, OrgView } from '@/types';
const U = P5.ui;
  const RM = () => P5.reduced();
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const today = new Date();
  const md = (d) => `${d.getMonth() + 1}月${d.getDate()}日`;
  const addD = (n) => new Date(today.getTime() + n * 864e5);
  const AN = (k) => P5.ATTR[k].name;

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
  const demoBar = (states, cur) => `<div class="od-demo" role="tablist" aria-label="演示状态"><small>演示态</small>${states.map(([k, l]) => `<button type="button" data-st="${k}" aria-pressed="${k === cur}">${l}</button>`).join('')}</div>`;
  /** 有状态区块：root 里 [data-host] 由 render(state) 重绘 */
  function stateful(root, states, cur, render, bind) {
    const host = root.querySelector('[data-host]');
    const draw = (st, anim = true) => { cur = st; host.innerHTML = render(st); root.querySelectorAll('.od-demo button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.st === st)); wire(host); bind && bind(host, st, draw); if (anim) P5.panelIn(host.children, { stagger: .04 }); };
    root.querySelector('.od-demo').addEventListener('click', (e) => { const b = e.target.closest('[data-st]'); if (b) draw(b.dataset.st); });
    draw(cur, false);
    return draw;
  }

  /** 全屏舞台：红放射线矢量背板 + 剪影 + 关闭；内容在 .od-wrap */
  function stage({ title = '', en = '', seed = 7, cls = '', body = '', sil = null, onMount, onClose, x = true } = {}) {
    const wide = P5.isWide();
    const v = document.createElement('div'); v.className = `od-stage ${cls}`; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true');
    v.innerHTML = `<div class="od-bg" aria-hidden="true"></div>
      ${sil ? `<div class="od-sil" aria-hidden="true">${P5.sil(sil, { style: 'height:100%;width:auto;display:block' })}</div>` : ''}
      ${x ? '<button class="od-x" aria-label="关闭">✕</button>' : ''}
      <div class="od-wrap">${title ? `<header class="od-hd">${en ? U.ransom(en, { h: wide ? 46 : Math.min(32, Math.floor(300 / Math.max(6, en.length))), seed }) : ''}<div>${U.plate(title, { fs: wide ? 24 : 19 })}</div></header>` : ''}${body}</div>`;
    document.body.appendChild(v); const unBg = P5.bgInto(v.querySelector('.od-bg'), { seed, wide, fx: wide ? 1200 : 760, fy: wide ? 240 : 220 });
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    let closed = false;
    const close = () => { if (closed) return; closed = true; onClose && onClose(); v.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateX(-30px) skewX(4deg)' }], { duration: 200, fill: 'both' }).onfinish = () => { v.remove(); unBg(); document.body.style.overflow = prev; }; };
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
  const confirm = (title, text, okLabel, onOk, { danger = true, cancel = '取消' } = {}) => sheet(title, `<p class="sh-p">${text}</p><div class="sh-acts">${U.btn(cancel, { tone: 'ink', seed: 801, attrs: 'data-x' })}${U.btn(okLabel, { tone: danger ? 'red' : 'paper', seed: 802, size: 'lg', attrs: 'data-ok' })}</div>`, (sh, close) => { sh.querySelector('[data-x]').onclick = close; sh.querySelector('[data-ok]').onclick = () => { close(); onOk && onOk(); }; });

  /** 进度环（WishRing：主观距离整圆 + 百分号；未评估 = 虚底轨 + ?） */
  const ring = (pct, { size = 64, evaluated = true, color = 'var(--red)', track = '#3a3530', fg = 'currentColor', label = true, sw: sw_ = 7 } = {}) => {
    const r = 50 - sw_ / 2 - 2, C = 2 * Math.PI * r;
    return `<svg class="od-ring" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${evaluated ? '距离 ' + pct + '%' : '还没评估过'}">
      <circle cx="50" cy="50" r="${r}" fill="none" stroke="${track}" stroke-width="${sw_}" ${evaluated ? '' : 'stroke-dasharray="4 6"'}/>
      ${evaluated ? `<circle class="od-ring-p" cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="${sw_ + 1}" stroke-dasharray="${(C * pct / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 50 50)" style="--c:${C.toFixed(1)}"/>` : ''}
      ${label ? `<text x="50" y="58" text-anchor="middle" font-family="Noto Sans SC Black" font-weight="900" font-size="${evaluated ? 26 : 34}" fill="${fg}">${evaluated ? pct + '<tspan font-size="14">%</tspan>' : '?'}</text>` : ''}</svg>`;
  };
  /** GoalArc：-4° 倾斜开口弧，270°，环心里程表数字 = 完成步数 */
  const arc = (done, total, { size = 96, fg = 'var(--ink)', track = 'rgba(17,17,17,.18)' } = {}) => {
    const r = 40, C = 2 * Math.PI * r, L = C * .75, p = total ? done / total : 0;
    return `<svg class="od-arc" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="完成 ${done} / ${total} 步"><g transform="rotate(131 50 50)">
      <circle cx="50" cy="50" r="${r}" fill="none" stroke="${track}" stroke-width="9" stroke-dasharray="${L.toFixed(1)} ${C.toFixed(1)}"/>
      <circle class="od-arc-p" cx="50" cy="50" r="${r}" fill="none" stroke="var(--red)" stroke-width="10" stroke-dasharray="${(L * p).toFixed(1)} ${C.toFixed(1)}" style="--l:${(L * p).toFixed(1)}"/></g>
      <text x="50" y="56" text-anchor="middle" font-family="Noto Sans SC Black" font-weight="900" font-size="28" fill="${fg}" font-style="italic">${done}</text>
      <text x="50" y="74" text-anchor="middle" font-family="Noto Sans SC Black" font-weight="900" font-size="10" fill="${fg}">/ ${total} 步</text></svg>`;
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
  const MEAN = { up: ['希望正在靠近', '把今天交给一件小而确定的事', '意志驱动前进', '先动起来，方向会在路上变清楚'], rev: ['迟疑与内耗', '暂停不是失败', '把模糊的事写下来，它就小了一半'] };
  const rng0 = P5.rng(77);
  const COL = new Map(ALL.map((c) => { const u = rng0() < (c.major ? .62 : .3), r = rng0() < (c.major ? .32 : .14); return [c.id, { up: u ? 1 + Math.floor(rng0() * 5) : 0, rev: r ? 1 + Math.floor(rng0() * 3) : 0, first: `2026-0${1 + Math.floor(rng0() * 9)}-1${Math.floor(rng0() * 9)}` }]; }));
  /** P5 风程序化塔罗卡面（SVG，非位图）：奶白纸 + 黑框 + 红放射 + 巨型单字 + 墨楔牌名 */
  function tarotFace(c, { rev = false, w = 120 } = {}) {
    const r = P5.rng(c.id.length * 31 + c.name.charCodeAt(0)), rot = (r() - .5) * 16;
    let rays = ''; for (let i = 0; i < 18; i++) { const a0 = i / 18 * Math.PI * 2 + rot / 60, a1 = a0 + .17; rays += `<polygon points="60,88 ${(60 + Math.cos(a0) * 120).toFixed(1)},${(88 + Math.sin(a0) * 120).toFixed(1)} ${(60 + Math.cos(a1) * 120).toFixed(1)},${(88 + Math.sin(a1) * 120).toFixed(1)}"/>`; }
    const pips = c.major ? '' : Array.from({ length: Math.min(10, RK.indexOf(c.name.replace(c.suit, '')) + 1) || 1 }, (_, i) => `<polygon points="${P5.shape.starPts(16 + (i % 5) * 22, 150 + Math.floor(i / 5) * 9, 4)}" fill="var(--ink)"/>`).join('');
    return `<svg class="od-tf" viewBox="0 0 120 190" width="${w}" role="img" aria-label="${c.name}${rev ? ' 逆位' : ''}"><defs><clipPath id="cf${c.id}"><rect x="6" y="6" width="108" height="178"/></clipPath></defs>
      <rect width="120" height="190" fill="#111"/><rect x="4" y="4" width="112" height="182" fill="#F2E9DA"/>
      <g clip-path="url(#cf${c.id})" ${rev ? 'transform="rotate(180 60 95)"' : ''}><rect x="6" y="6" width="108" height="178" fill="${c.major ? '#D7000F' : '#F2E9DA'}"/><g fill="${c.major ? '#a8000c' : '#e2d6c2'}">${rays}</g>
        <polygon points="${P5.shape.starPts(60, 90, 40, -90 + rot)}" fill="${c.major ? '#F2E9DA' : '#D7000F'}" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
        <text x="60" y="${c.glyph.length > 1 ? 100 : 103}" text-anchor="middle" font-family="Noto Sans SC Black" font-weight="900" font-size="38" fill="#111" transform="rotate(${(rot / 2).toFixed(1)} 60 92)">${c.glyph}</text>${pips}</g>
      <polygon points="30,8 90,10 86,30 34,28" fill="#111"/><text x="60" y="25" text-anchor="middle" font-family="Noto Sans SC Black" font-weight="900" font-size="${c.no.length > 4 ? 10 : 14}" fill="#F2E9DA" font-style="italic">${c.no}</text>
      <polygon points="10,158 112,154 108,182 12,180" fill="#111"/><text x="60" y="171" text-anchor="middle" font-family="Noto Sans SC Black" font-weight="900" font-size="${c.name.length > 4 ? 10 : 13}" fill="#F2E9DA">${c.name}</text>
      <text x="60" y="179" text-anchor="middle" font-family="Noto Sans SC Black" font-weight="900" font-size="5.5" fill="#D7000F" letter-spacing=".6">${c.en}</text></svg>`;
  }
  type RedOrgUiMember = [name: string, card: string, roman: string, leader: boolean, memberId: string, userId: string, masks: string[]];
  const EMPTY_ORG = {
    id: '', name: '', motto: '', code: '', level: 1, emblem: 'star',
    members: [] as RedOrgUiMember[], tz: 'Asia/Shanghai', custom: undefined as OrgCustom | undefined,
  };
  let ORG = { ...EMPTY_ORG };

  function orgView(): OrgView | undefined {
    const social = useCloudSocialStore.getState();
    return social.orgs.find((v) => v.org.id === social.hideoutOrgId) ?? social.orgs[0];
  }

  /** 每次打开弹层都从同一个 store 重新投影，避免延续上一次组织/成员的快照。 */
  function syncOrg() {
    const d = getRedHideoutData(useCloudSocialStore.getState().hideoutOrgId);
    const raw = orgView();
    Object.assign(ORG, {
      id: raw?.org.id ?? '',
      name: d.org?.name ?? '',
      motto: d.org?.motto ?? '',
      code: d.org?.code ?? '',
      level: d.org?.level ?? 1,
      emblem: raw?.org.emblem ?? 'star',
      members: d.members.map((m) => [m.name, m.card[0], m.card[2], m.leader, m.id, m.id, m.masks] as RedOrgUiMember),
      tz: raw?.org.tz ?? 'Asia/Shanghai',
      custom: raw?.org.custom,
    });
    return { data: d, view: raw };
  }
  const errText = (e: unknown, fallback: string) => e instanceof Error && e.message ? e.message : fallback;
  const markBusy = (button: Element | null, busyText: string) => {
    if (!(button instanceof HTMLElement)) return () => {};
    const text = button.querySelector('span');
    const oldText = text?.textContent ?? '';
    button.setAttribute('aria-busy', 'true');
    button.setAttribute('aria-disabled', 'true');
    if (text) text.textContent = busyText;
    return () => {
      button.removeAttribute('aria-busy');
      button.removeAttribute('aria-disabled');
      if (text) text.textContent = oldText;
    };
  };

  /* ══════════════════ 据点 org/* ══════════════════ */
  const memCard = (m, i, { sm = false, sel = false } = {}) => { const c = MAJ.find((x) => x.name === m[1]) || MAJ[0]; return `<span class="od-mem ${sm ? 'sm' : ''} ${sel ? 'sel' : ''}">${tarotFace(c, { w: sm ? 64 : 96 })}<b>${m[0]}${m[3] ? ' <i class="tag">队长</i>' : ''}</b></span>`; };
  function openOrgOnboard(flow: 'create' | 'join' | 'card' = 'create') {
    syncOrg();
    const initialStep = flow === 'card' ? 'card' : 'rules';
    let step = initialStep;
    let activeOrgId = ORG.id;
    let preview: Org | null = null;
    let selectedTarot = '';
    let nicknameKind: OrgCodenameKind = 'nickname';
    let custom = '';
    let ci = MAJ.findIndex((c) => c.id === (ORG.members.find((m) => m[5] === orgView()?.me.userId)?.[4] ? orgView()?.me.tarotId : ''));
    if (ci < 0) ci = 0;
    const steps = {
      create: ['rules', 'info', 'card', 'name', 'welcome'],
      join: ['rules', 'code', 'preview', 'card', 'name', 'welcome'],
      card: ['card', 'name', 'welcome'],
    };
    const nickname = () => [...(useAppStore.getState().user?.name ?? '').trim()].slice(0, 8).join('');
    sheet(flow === 'create' ? '建立组织' : flow === 'join' ? '加入组织' : '我的成员牌',
      `${demoBar([['create', '建立流程'], ['join', '加入流程']], flow === 'join' ? 'join' : 'create')}<div class="od-ob-steps" data-steps></div><div data-host></div>`,
      (sh) => {
        let busy = false;
        const render = (state) => {
          const v = orgView();
          const taken = new Set((v?.members ?? []).filter((m) => m.userId !== v?.me.userId).map((m) => m.tarotId).filter(Boolean));
          if (state === 'rules') return `${ttl('据点守则')}<p class="sh-p">组织是一小群人互相看见、互相打气的地方。第一次建立或加入之前，先读一下这几条：</p><ol class="od-rules"><li>这里是一小群人互相打气的地方。不发广告、不留联系方式和链接。</li><li>不骚扰、不攻击任何人，不发色情、暴力、违法或让人不适的内容。</li><li>违反守则的内容会被删除；队长可以请离成员，严重的账号会被限制使用。</li><li>看到不合适的内容，长按就能举报或屏蔽；举报会在 2 天内处理。</li></ol><div class="sh-acts">${U.btn('同意并继续', { tone: 'red', size: 'lg', seed: 731, attrs: 'data-next' })}</div>`;
          if (state === 'info') return `${ttl('建立组织')}<label class="fld"><span>组织名</span><input class="inp" data-name maxlength="12" placeholder="比如：夜读小队"></label><label class="fld"><span>口号（可以不写）</span><input class="inp" data-motto maxlength="30" placeholder="一句大家都认的话"></label><div class="fld"><span>徽记</span><div class="od-emb">${ORG_EMBLEMS.map((e) => `<button data-emblem="${e.id}" aria-pressed="${e.id === 'moon'}" aria-label="徽记：${e.label}">${e.label.slice(0, 1)}</button>`).join('')}</div></div><p class="muted-d">建好之后你是队长，坐 1 号座位；把邀请码发给朋友，最多 7 个人。每人最多自建一个、加入一个组织。</p><div class="sh-acts">${U.btn('建立组织', { tone: 'red', size: 'lg', seed: 732, attrs: 'data-next' })}</div>`;
          if (state === 'code') return `${ttl('加入组织')}<label class="fld"><span>邀请码</span><input class="inp od-code" data-code maxlength="8" placeholder="8 位字母和数字"></label><p class="muted-d">邀请码在队长的据点页底部。码里没有 0、O、1、I，看着像的都按别的字母输。</p><p class="od-err" data-err ${preview === null ? 'hidden' : ''}>${preview === null ? '' : '邀请码不对，或者组织已经换了新码'}</p><div class="sh-acts">${U.btn('查找', { tone: 'red', size: 'lg', seed: 734, attrs: 'data-next' })}</div>`;
          if (state === 'preview' && preview) return `${U.shp('div', { kind: 'cut', seed: 735, tone: 'ink', cls: 'od-ob-pv' }, `<span class="od-emb-b">${ORG_EMBLEMS.find((e) => e.id === preview!.emblem)?.label.slice(0, 1) ?? '★'}</span><b>${esc(preview.name)}</b><small>「${esc(preview.motto)}」· Lv.${ORG.level}</small>`)}<div class="sh-acts">${U.btn('换个码', { tone: 'ink', seed: 736, attrs: 'data-prev' })}${U.btn('加入', { tone: 'red', size: 'lg', seed: 737, attrs: 'data-next' })}</div>`;
          if (state === 'card') return `${ttl('选一张代表牌', '左右滑动挑一张 · 同一组织里每张只能一个人')}<div class="od-ob-cf"><button class="od-ob-nav" data-cf="-1" aria-label="上一张">‹</button><div class="od-ob-cards">${[-1, 0, 1].map((d) => { const c = MAJ[(ci + d + 22) % 22], used = taken.has(c.id); return `<span class="${d ? 'side' : 'mid'} ${used ? 'taken' : ''}">${tarotFace(c, { w: d ? 78 : 120 })}${used && !d ? '<em>这张已经有人了</em>' : ''}</span>`; }).join('')}</div><button class="od-ob-nav" data-cf="1" aria-label="下一张">›</button></div><div class="sh-acts">${U.btn(`就选「${MAJ[ci].name}」`, { tone: 'red', size: 'lg', seed: 738, attrs: `data-next ${taken.has(MAJ[ci].id) ? 'disabled' : ''}`, cls: taken.has(MAJ[ci].id) ? 'od-dis' : '' })}</div>`;
          if (state === 'name') {
            const fallback = nicknameKind === 'tarot' ? MAJ[ci].name : nicknameKind === 'nickname' ? nickname() : custom;
            return `${ttl('写一个代号')}<div class="fld"><span>代号</span>${seg([['nickname', '用昵称'], ['tarot', '用牌名'], ['custom', '自己写']], nicknameKind, 'data-cn')}</div><input class="inp" data-cv maxlength="8" value="${esc(custom || fallback)}" placeholder="（写一个代号）"><p class="muted-d">最多 8 个字 · 名册上显示为：<b data-cp>${esc(fallback || '（写一个代号）')}</b></p><div class="sh-acts">${U.btn(flow === 'card' ? '保存' : '放进名册', { tone: 'red', size: 'lg', seed: 739, attrs: 'data-next' })}</div>`;
          }
          return `<div class="od-ob-wel">${tarotFace(selectedTarot ? MAJ.find((c) => c.id === selectedTarot) ?? MAJ[ci] : MAJ[ci], { w: 120 })}<b class="od-cut-big">${flow === 'create' ? `今天起，你是「${ORG.name}」的一员` : `欢迎加入「${ORG.name}」`}</b><p>「${ORG.name}」收下了你的名字</p><small class="muted-d">点一下继续</small></div>`;
        };
        const host = sh.querySelector('[data-host]');
        const draw = () => {
          const list = steps[flow];
          sh.querySelector('[data-steps]').innerHTML = list.map((s, i) => `<i class="${i <= list.indexOf(step) ? 'on' : ''}"></i>`).join('');
          host.innerHTML = render(step);
          wire(host);
          P5.panelIn(host.children, { from: 'right', stagger: .04 });
          const cn = host.querySelector('[data-cn]');
          const cv = host.querySelector('[data-cv]');
          const cp = host.querySelector('[data-cp]');
          if (cv) cv.oninput = () => {
            custom = cv.value;
            if (cp) cp.textContent = cv.value || '（写一个代号）';
          };
          if (cn) cn.addEventListener('pick', (e) => {
            nicknameKind = e.detail as OrgCodenameKind;
            custom = nicknameKind === 'custom' ? cv?.value ?? '' : nicknameKind === 'tarot' ? MAJ[ci].name : nickname();
            if (cv) cv.value = custom;
            if (cp) cp.textContent = custom || '（写一个代号）';
            if (nicknameKind === 'custom') cv?.focus();
          });
          const welcome = host.querySelector('.od-ob-wel');
          if (welcome) {
            P5.sfx('fanfare', .5);
            welcome.onclick = () => {
              document.querySelector('.sheet-veil .x')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              P5.toast(flow === 'card' ? '成员牌改好了' : '进入据点');
              P5.rerender();
            };
          }
        };
        host.addEventListener('click', async (e) => {
          const target = e.target as HTMLElement;
          const next = target.closest('[data-next]') as HTMLElement | null;
          const prev = target.closest('[data-prev]');
          const flip = target.closest('[data-cf]') as HTMLElement | null;
          const emblem = target.closest('[data-emblem]') as HTMLElement | null;
          if (emblem) {
            host.querySelectorAll('[data-emblem]').forEach((x) => x.setAttribute('aria-pressed', x === emblem));
            return;
          }
          if (flip) {
            ci = (ci + Number(flip.dataset.cf) + 22) % 22;
            draw();
            return;
          }
          if (prev) {
            step = 'code';
            preview = null;
            draw();
            return;
          }
          if (!next || next.hasAttribute('disabled') || busy) return;
          busy = true;
          const done = markBusy(next, step === 'info' ? '建立中…' : step === 'code' ? '查找中…' : step === 'preview' ? '加入中…' : step === 'name' ? '保存中…' : '处理中…');
          try {
            if (step === 'rules') {
              acceptOrgRules();
              step = flow === 'card' ? 'card' : flow === 'join' ? 'code' : 'info';
            } else if (step === 'info') {
              const name = (host.querySelector('[data-name]') as HTMLInputElement | null)?.value?.trim() ?? '';
              const motto = (host.querySelector('[data-motto]') as HTMLInputElement | null)?.value?.trim() ?? '';
              const chosenEmblem = (host.querySelector('[data-emblem][aria-pressed="true"]') as HTMLElement | null)?.dataset.emblem ?? 'star';
              activeOrgId = await createOrgFromUi({ name, motto, emblem: chosenEmblem });
              syncOrg();
              step = 'card';
            } else if (step === 'code') {
              const input = host.querySelector('[data-code]') as HTMLInputElement | null;
              const code = normalizeInviteInput(input?.value ?? '');
              preview = await previewOrg(code);
              if (!preview) throw new Error('邀请码不对，或者组织已经换了新码');
              step = 'preview';
            } else if (step === 'preview') {
              const input = host.querySelector('[data-code]') as HTMLInputElement | null;
              activeOrgId = await joinOrgFromUi(normalizeInviteInput(input?.value ?? ''));
              syncOrg();
              step = 'card';
            } else if (step === 'card') {
              selectedTarot = MAJ[ci].id;
              step = 'name';
            } else if (step === 'name') {
              const typed = (host.querySelector('[data-cv]') as HTMLInputElement | null)?.value?.trim() ?? '';
              const kind = nicknameKind;
              const codename = kind === 'custom' ? typed : kind === 'tarot' ? MAJ[ci].name : nickname();
              if (!activeOrgId) throw new Error('找不到这个组织了');
              if (!selectedTarot) selectedTarot = orgView()?.me.tarotId ?? MAJ[ci].id;
              await saveMyCardFromUi(activeOrgId, { tarotId: selectedTarot, codenameKind: kind, codename });
              useCloudSocialStore.getState().setHideoutOrgId(activeOrgId);
              await refreshOrg(activeOrgId);
              syncOrg();
              if (flow === 'card') {
                close();
                P5.toast('成员牌改好了');
                P5.rerender();
                return;
              }
              step = 'welcome';
            } else {
              step = 'welcome';
            }
            draw();
          } catch (error) {
            P5.toast(errText(error, '操作没完成，稍后再试'));
            if (step === 'code') {
              const err = host.querySelector('[data-err]');
              if (err) {
                err.textContent = errText(error, '邀请码不对，或者组织已经换了新码');
                err.removeAttribute('hidden');
              }
            }
          } finally {
            busy = false;
            done();
          }
        });
        sh.querySelector('.od-demo')?.addEventListener('click', (e) => {
          const b = (e.target as HTMLElement).closest('[data-st]') as HTMLElement | null;
          if (!b) return;
          flow = b.dataset.st === 'join' ? 'join' : 'create';
          step = 'rules';
          preview = null;
          sh.querySelectorAll('.od-demo button').forEach((x) => x.setAttribute('aria-pressed', x === b));
          draw();
        });
        draw();
      }, 77);
  }
  function openOrgSettings(_previewLeader = true) {
    const { view } = syncOrg();
    if (!view) return P5.toast('找不到这个组织了');
    let editing = false;
    let rulesOpen = false;
    let selectedMasks = (view.me.card.personas ?? (view.me.card.persona ? [view.me.card.persona] : [])).map((p) => p.attribute);
    let currentName = view.org.name;
    let currentMotto = view.org.motto;
    let currentEmblem = view.org.emblem;

    const refreshView = async (orgId = ORG.id) => {
      await refreshOrg(orgId);
      syncOrg();
    };

    sheet('据点设置', '<div data-host></div>', (sh) => {
      let busy = false;
      const draw = () => {
        const v = orgView();
        if (!v) return;
        const L = v.org.leaderId === v.me.userId;
        const me = v.members.find((m) => m.userId === v.me.userId) ?? v.me;
        const maskAttrs = ['knowledge', 'guts', 'dexterity', 'kindness', 'charm'] as AttributeId[];
        const blocked = useCloudSocialStore.getState().orgBlocked;
        const blockedMembers = v.members.filter((m) => m.userId !== v.me.userId && blocked.includes(m.userId));
        const host = sh.querySelector('[data-host]');
        host.innerHTML = `
          <section class="od-os">${ttl('我的成员牌')}<div class="od-os-me">${memCard([me.codename, me.tarotId ?? '', '', L, me.id, me.userId, []], 0, { sm: true })}<span><b>代表牌与代号</b><small>${esc(me.tarotId || '还没选代表牌')} · ${esc(me.codename)}</small></span>${U.btn('修改', { tone: 'ink', size: 'sm', seed: 741, attrs: 'data-act="card"' })}</div>
            <div class="od-os-masks"><b>在名册背面展示的面具</b><small>最多展示 ${ORG_MAX_SHOWN_MASKS} 张</small><div>${maskAttrs.map((a) => {
              const p = v.me.card.personas?.find((x) => x.attribute === a) ?? (v.me.card.persona?.attribute === a ? v.me.card.persona : null);
              if (!p) return '';
              const idx = selectedMasks.indexOf(a);
              return `<button class="od-chip ${idx >= 0 ? 'on' : ''}" data-mask="${a}" aria-pressed="${idx >= 0}" aria-label="${esc(p.name)}${idx >= 0 ? `，第 ${idx + 1} 张` : ''}">${idx >= 0 ? '✓ ' : ''}${esc(p.name)}</button>`;
            }).join('') || '<small class="muted-d">还没有可展示的面具</small>'}</div></div></section>
          <section class="od-os">${ttl('等级与称号', L ? '给每一级起名字、给称号改名、加自己的称号' : '每一级叫什么、每个称号怎么拿')}<div class="od-os-row"><span>Lv.${ORG.level} · ${esc(v.org.custom?.levelNames?.[ORG.level - 1] || '')}</span>${U.btn(L ? '编辑' : '查看', { tone: 'ink', size: 'sm', seed: 742, attrs: 'data-act="titles"' })}</div></section>
          <section class="od-os">${ttl('组织资料')}<div class="od-os-row"><span><b>${esc(v.org.name)}</b> · 「${esc(v.org.motto)}」 · 徽记：${esc(ORG_EMBLEMS.find((e) => e.id === v.org.emblem)?.label ?? v.org.emblem)}</span>${L ? U.btn('修改', { tone: 'ink', size: 'sm', seed: 743, attrs: 'data-act="info"' }) : ''}</div>
            <div class="od-os-edit" ${editing ? '' : 'hidden'}><label class="fld"><span>组织名</span><input class="inp" data-info-name maxlength="12" value="${esc(currentName)}"></label><label class="fld"><span>口号（可以不写）</span><input class="inp" data-info-motto maxlength="30" value="${esc(currentMotto)}"></label><div class="od-emb">${ORG_EMBLEMS.map((e) => `<button data-info-emblem="${e.id}" aria-pressed="${e.id === currentEmblem}" aria-label="徽记：${e.label}">${e.label.slice(0, 1)}</button>`).join('')}</div><div class="sh-acts">${U.btn('取消', { tone: 'ink', size: 'sm', seed: 744, attrs: 'data-act="infox"' })}${U.btn('保存', { tone: 'red', size: 'sm', seed: 745, attrs: 'data-act="infook"' })}</div></div>
            ${L ? `<div class="od-os-row"><span><b>换一个邀请码</b><small>码外传了、或者不想再有人加入时用</small></span>${U.btn('换码', { tone: 'paper', size: 'sm', seed: 746, attrs: 'data-act="code"' })}</div>` : ''}</section>
          <section class="od-os">${ttl('成员', v.members.length + ' 人')}${v.members.filter((m) => m.userId !== v.me.userId).map((m, i) => `<div class="od-os-row"><span><b>${esc(m.codename)}</b> <small>${esc(m.tarotId || '未选牌')} · ${String(m.seat).padStart(2, '0')} 号</small></span>${L ? `${U.btn('转让', { tone: 'paper', size: 'sm', seed: 747 + i, attrs: `data-act="give" data-member="${m.id}"` })}${U.btn('请离', { tone: 'red', size: 'sm', seed: 752 + i, attrs: `data-act="kick" data-member="${m.id}"` })}` : ''}</div>`).join('') || '<p class="muted-d">还没有其他成员。</p>'}</section>
          ${blockedMembers.length ? `<section class="od-os">${ttl('屏蔽名单（只在本机生效）')}${blockedMembers.map((m) => `<div class="od-os-row"><span>${esc(m.codename)}</span>${U.btn('解除', { tone: 'ink', size: 'sm', seed: 757, attrs: `data-act="unblock" data-user="${m.userId}"` })}</div>`).join('')}</section>` : ''}
          <section class="od-os">${ttl('据点守则 · 别人能看到什么')}<button class="od-addline" data-act="rules">${rulesOpen ? '收起 ▲' : '展开 ▼'}</button><div class="od-os-rules" ${rulesOpen ? '' : 'hidden'}><p class="muted-d">名册：代表牌、代号、展示的面具、连续天数；公告板：你主动分享的动态；会议：你写的周目标。你的记录内容、点数明细都不会给别人看。</p></div></section>
          <section class="od-os danger">${L ? `<p class="muted-d">队长不能直接退出：先把队长转让给别人，或者解散组织。</p>${U.btn('解散组织', { tone: 'red', seed: 758, attrs: 'data-act="dissolve"' })}` : U.btn('退出组织', { tone: 'red', seed: 759, attrs: 'data-act="leave"' })}</section>`;
        wire(host);
      };
      draw();
      sh.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const button = target.closest('[data-act]') as HTMLElement | null;
        const emblem = target.closest('[data-info-emblem]') as HTMLElement | null;
        const mask = target.closest('[data-mask]') as HTMLElement | null;
        if (emblem) {
          currentEmblem = emblem.dataset.infoEmblem ?? currentEmblem;
          sh.querySelectorAll('[data-info-emblem]').forEach((x) => x.setAttribute('aria-pressed', x === emblem));
          return;
        }
        if (mask) {
          if (busy) return;
          const attr = mask.dataset.mask as AttributeId;
          const next = selectedMasks.includes(attr) ? selectedMasks.filter((x) => x !== attr) : selectedMasks.length >= ORG_MAX_SHOWN_MASKS ? null : [...selectedMasks, attr];
          if (next === null) return P5.toast(`最多展示 ${ORG_MAX_SHOWN_MASKS} 张：先去掉一张`);
          busy = true;
          try {
            await setShownMasksFromUi(ORG.id, next);
            selectedMasks = next;
            await refreshView();
            draw();
          } catch (error) {
            P5.toast(errText(error, '面具没保存，请重试'));
          } finally {
            busy = false;
          }
          return;
        }
        if (!button || busy) return;
        const act = button.dataset.act;
        if (act === 'card') {
          document.querySelector('.sheet-veil .x')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          openOrgOnboard('card');
          return;
        }
        if (act === 'titles') {
          openOrgTitles(!!orgView() && orgView()!.org.leaderId === orgView()!.me.userId);
          return;
        }
        if (act === 'info') {
          editing = true;
          const v = orgView();
          currentName = v?.org.name ?? currentName;
          currentMotto = v?.org.motto ?? currentMotto;
          currentEmblem = v?.org.emblem ?? currentEmblem;
          draw();
          return;
        }
        if (act === 'infox') {
          editing = false;
          draw();
          return;
        }
        if (act === 'rules') {
          rulesOpen = !rulesOpen;
          draw();
          return;
        }
        if (act === 'infook') {
          currentName = (sh.querySelector('[data-info-name]') as HTMLInputElement | null)?.value?.trim() ?? '';
          currentMotto = (sh.querySelector('[data-info-motto]') as HTMLInputElement | null)?.value?.trim() ?? '';
          busy = true;
          const done = markBusy(button, '保存中…');
          try {
            await updateOrgFromUi(ORG.id, { name: currentName, motto: currentMotto, emblem: currentEmblem });
            editing = false;
            await refreshView();
            draw();
            P5.toast('改好了');
          } catch (error) {
            P5.toast(errText(error, '没保存成功，请重试'));
          } finally {
            busy = false;
            done();
          }
          return;
        }
        if (act === 'code') {
          confirm('换一个邀请码？', '旧码会立即作废，已经在组织里的人不受影响。', '换码', async () => {
            try {
              await rotateCodeFromUi(ORG.id);
              await refreshView();
              draw();
              P5.toast('换好了，旧码已经作废');
            } catch (error) {
              P5.toast(errText(error, '换码失败，请重试'));
            }
          }, { danger: false });
          return;
        }
        if (act === 'kick') {
          const memberId = button.dataset.member ?? '';
          const member = orgView()?.members.find((m) => m.id === memberId);
          if (!member) return;
          sheet(`请「${esc(member.codename)}」离开？`, `<p class="sh-p">对方会从名册里消失；邀请码会一起换掉，旧码不能再用。</p><div class="tg"><b>同时删除 Ta 的动态和标签</b>${sw(true)}</div><div class="sh-acts">${U.btn('取消', { tone: 'ink', seed: 761, attrs: 'data-x' })}${U.btn('请离', { tone: 'red', size: 'lg', seed: 762, attrs: 'data-ok' })}</div>`, (s2, close) => {
            const swEl = s2.querySelector('.sw');
            s2.querySelector('[data-x]')?.addEventListener('click', close);
            s2.querySelector('[data-ok]')?.addEventListener('click', async (ev) => {
              const ok = ev.currentTarget as HTMLElement;
              const done = markBusy(ok, '请离中…');
              try {
                const rotated = await kickFromUi(ORG.id, member.id, swEl?.classList.contains('on') ?? true);
                close();
                await refreshView();
                draw();
                P5.toast(rotated ? `已请离「${member.codename}」，邀请码也换了新的` : `已请离「${member.codename}」；邀请码没换成，记得手动换一个`);
              } catch (error) {
                P5.toast(errText(error, '请离失败，请重试'));
              } finally {
                done();
              }
            });
          });
          return;
        }
        if (act === 'give') {
          const member = orgView()?.members.find((m) => m.id === button.dataset.member);
          if (!member) return;
          confirm(`把队长交给「${esc(member.codename)}」？`, '转让之后你是普通成员，改资料、换码、请离都由新队长来做。', '转让', async () => {
            try {
              await transferFromUi(ORG.id, member.id);
              await refreshView();
              draw();
              P5.toast(`队长已经交给「${member.codename}」`);
            } catch (error) {
              P5.toast(errText(error, '转让失败，请重试'));
            }
          }, { danger: false });
          return;
        }
        if (act === 'unblock') {
          try {
            setMemberBlocked(button.dataset.user ?? '', false);
            draw();
            P5.toast('已解除');
          } catch (error) {
            P5.toast(errText(error, '没解除成功，请重试'));
          }
          return;
        }
        if (act === 'dissolve') {
          confirm(`解散「${esc(ORG.name)}」？`, '组织、名册会一起删除，所有成员都会收到「你已不在」的提示。这一步不能撤销。', '解散', async () => {
            try {
              await dissolveFromUi(ORG.id);
              document.querySelector('.sheet-veil .x')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              P5.toast('组织已解散');
              P5.rerender();
            } catch (error) {
              P5.toast(errText(error, '解散失败，请重试'));
            }
          });
          return;
        }
        if (act === 'leave') {
          confirm(`退出「${esc(ORG.name)}」？`, '你的成员牌会从名册里拿掉，你在这里分享的动态和贴的标签也会一起删除；以后想回来要重新拿邀请码。', '退出', async () => {
            try {
              await leaveFromUi(ORG.id);
              document.querySelector('.sheet-veil .x')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              P5.toast('已退出');
              P5.rerender();
            } catch (error) {
              P5.toast(errText(error, '退出失败，请重试'));
            }
          });
        }
      });
    }, 79);
  }
  function openOrgTitles(_previewLeader = true) {
    const { view } = syncOrg();
    if (!view) return P5.toast('找不到这个组织了');
    const leader = view.org.leaderId === view.me.userId;
    let levels = [...(view.org.custom?.levelNames ?? [])];
    let names = { ...(view.org.custom?.titleNames ?? {}) };
    let titles: OrgCustomTitle[] = [...(view.org.custom?.titles ?? [])];
    let form: OrgCustomTitle | null = null;
    let editing: { type: 'level'; index: number } | { type: 'title'; id: string } | null = null;
    sheet('等级与称号', '<div data-host></div>', (sh) => {
      let busy = false;
      const draw = () => {
        const host = sh.querySelector('[data-host]');
        host.innerHTML = `<p class="sh-p">${leader ? '队长可以给每一级起名字、给称号改名，也可以加自己的称号。改名只影响之后的纪要，称号册里改名前后算同一个称号。' : '据点每一级的名字、每周纪要里发的称号都在这里。名字由队长定。'}</p>
          ${ttl('等级名字', `现在 Lv.${ORG.level}`)}<div class="od-lv">${ORG_LEVEL_NAMES.map((name, i) => `<label class="od-lv-r ${i + 1 === ORG.level ? 'cur' : ''}"><b>Lv.${i + 1}</b>${leader ? (editing?.type === 'level' && editing.index === i ? `<input class="inp" data-level="${i}" maxlength="${ORG_LEVEL_NAME_MAX}" value="${esc(levels[i] ?? '')}" placeholder="${name}" aria-label="Lv.${i + 1} 的名字">` : `<button class="od-mini" data-edit-level="${i}">${esc(levels[i] || name)}</button>`) : `<span>${esc(levels[i] || name)}</span>`}${i + 1 === ORG.level ? U.tag('现在') : ''}</label>`).join('')}</div>
          ${ttl('称号', `${ORG_BUILTIN_TITLES.length} 个`)}<div class="od-tt">${ORG_BUILTIN_TITLES.map((t) => `<div class="od-tt-r"><b>${esc(names[t.id] || t.name)}</b><small>${esc(t.how)}</small>${leader ? (editing?.type === 'title' && editing.id === t.id ? `<input class="inp" data-title="${t.id}" maxlength="${ORG_TITLE_NAME_MAX}" value="${esc(names[t.id] ?? '')}" placeholder="${esc(t.name)}" aria-label="称号「${esc(t.name)}」改名">` : `<button class="od-mini" data-edit-title="${t.id}">改</button>`) : ''}</div>`).join('')}</div>
          ${ttl('自定义称号', `${titles.length} / ${ORG_CUSTOM_TITLES_MAX}`)}<div class="od-tt" data-custom>${titles.map((t) => `<div class="od-tt-r"><b>${esc(t.name)}</b><small>${esc(condText(t.cond))}</small>${leader ? `<button class="od-mini" data-act="edit-custom" data-id="${t.id}">改</button><button class="od-mini" data-act="del-custom" data-id="${t.id}">删</button>` : ''}</div>`).join('') || '<p class="muted-d">还没有自定义称号。</p>'}</div>
          ${leader && !form ? `<button class="od-addline" data-act="add">＋ 加一个称号</button>` : ''}
          ${leader && form ? `<div class="od-tt-form"><label class="fld"><span>称号名字（最多 ${ORG_TITLE_NAME_MAX} 个字）</span><input class="inp" data-custom-name maxlength="${ORG_TITLE_NAME_MAX}" value="${esc(form.name)}" placeholder="给称号起个名字"></label><div class="fld"><span>条件</span>${seg(ORG_TITLE_CONDS.map((c) => [c.type, c.label]), form.cond.type, 'data-cond')}</div><div class="od-cond-v">${stepper(form.cond.value, `data-min="${ORG_TITLE_CONDS.find((c) => c.type === form!.cond.type)?.min ?? 1}" data-max="${ORG_TITLE_CONDS.find((c) => c.type === form!.cond.type)?.max ?? 999}"`)}<b data-unit>${esc(ORG_TITLE_CONDS.find((c) => c.type === form!.cond.type)?.unit ?? '')}</b></div><p class="muted-d" data-ct>每周一发纪要时，${esc(condText(form.cond))}的人拿到「${esc(form.name || '（称号名）')}」。</p><div class="sh-acts">${U.btn('取消', { tone: 'ink', size: 'sm', seed: 771, attrs: 'data-act="fx"' })}${U.btn('加上', { tone: 'red', seed: 772, attrs: 'data-act="fok"' })}</div></div>` : ''}
          ${leader ? `<div class="sh-acts">${U.btn('保存', { tone: 'red', size: 'lg', seed: 773, attrs: 'data-act="save"' })}</div>` : ''}`;
        wire(host);
        host.querySelectorAll('.stepper button').forEach((button, index) => {
          button.addEventListener('click', () => {
            if (!form) return;
            const def = ORG_TITLE_CONDS.find((c) => c.type === form!.cond.type) ?? ORG_TITLE_CONDS[0];
            form.cond = { ...form.cond, value: Math.max(def.min, Math.min(def.max, form.cond.value + (index === 1 ? 1 : -1))) };
          });
        });
        const condition = host.querySelector('[data-cond]');
        condition?.addEventListener('pick', (e) => {
          if (!form) return;
          const def = ORG_TITLE_CONDS.find((c) => c.type === (e as CustomEvent).detail) ?? ORG_TITLE_CONDS[0];
          form = { ...form, cond: { type: def.type, value: def.def } };
          draw();
        });
      };
      draw();
      sh.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const editLevel = target.closest('[data-edit-level]') as HTMLElement | null;
        const editTitle = target.closest('[data-edit-title]') as HTMLElement | null;
        const button = target.closest('[data-act]') as HTMLElement | null;
        if (editLevel) {
          editing = { type: 'level', index: Number(editLevel.dataset.editLevel) };
          draw();
          (sh.querySelector(`[data-level="${editing.index}"]`) as HTMLInputElement | null)?.focus();
          return;
        }
        if (editTitle) {
          editing = { type: 'title', id: editTitle.dataset.editTitle ?? '' };
          draw();
          (sh.querySelector(`[data-title="${editing.id}"]`) as HTMLInputElement | null)?.focus();
          return;
        }
        if (!button || busy) return;
        const act = button.dataset.act;
        if (act === 'add') {
          form = { id: newCustomTitleId(), name: '', cond: { type: 'week_days', value: 5 } };
          draw();
          return;
        }
        if (act === 'edit-custom') {
          const item = titles.find((t) => t.id === button.dataset.id);
          if (item) {
            form = { ...item, cond: { ...item.cond } };
            draw();
          }
          return;
        }
        if (act === 'del-custom') {
          titles = titles.filter((t) => t.id !== button.dataset.id);
          draw();
          return;
        }
        if (act === 'fx') {
          form = null;
          draw();
          return;
        }
        if (act === 'fok' && form) {
          const name = (sh.querySelector('[data-custom-name]') as HTMLInputElement | null)?.value?.trim() ?? '';
          if (!name) return P5.toast('给称号起个名字');
          const cond = form.cond;
          titles = titles.some((t) => t.id === form!.id)
            ? titles.map((t) => t.id === form!.id ? { ...t, name, cond } : t)
            : [...titles, { ...form, name, cond }];
          form = null;
          draw();
          return;
        }
        if (act === 'save') {
          sh.querySelectorAll<HTMLInputElement>('[data-level]').forEach((input) => { levels[Number(input.dataset.level)] = input.value.trim(); });
          sh.querySelectorAll<HTMLInputElement>('[data-title]').forEach((input) => { names = { ...names, [input.dataset.title!]: input.value.trim() }; });
          const custom: OrgCustom = {
            levelNames: levels.map((x) => (x ?? '').trim()).slice(0, ORG_LEVEL_NAMES.length),
            titleNames: names,
            titles: titles.slice(0, ORG_CUSTOM_TITLES_MAX),
          };
          busy = true;
          const done = markBusy(button, '存着…');
          try {
            await updateOrgCustomFromUi(ORG.id, custom);
            await refreshOrg(ORG.id);
            syncOrg();
            P5.toast('改好了：之后的纪要用新名字');
            document.querySelector('.sheet-veil .x')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          } catch (error) {
            P5.toast(errText(error, '没保存成功，请重试'));
          } finally {
            busy = false;
            done();
          }
        }
      });
    }, 81);
  }
  function openOpCreate(initialKind: 'small' | 'big' = 'small') {
    const { view } = syncOrg();
    if (!view) return P5.toast('找不到这个组织了');
    const range = opDeadlineRange(view.org.tz);
    const leader = view.org.leaderId === view.me.userId;
    let kind = initialKind === 'big' && leader ? 'big' : 'small';
    let days = 7;
    let deadline = shiftDayKey(range.min, days);
    let attr: AttributeId = 'guts';
    let chosen = new Set(view.members.map((m) => m.userId));
    let titleDraft = '';
    const taskDraft: Record<string, string> = {};
    sheet('发起目标 / 作战', '<div data-host></div>', (sh, close) => {
      let busy = false;
      const draw = () => {
        const host = sh.querySelector('[data-host]');
        host.innerHTML = `<div class="fld"><span>类型</span><div class="od-per two">${[['small', '目标', '一句话，大家做同一件事'], ['big', '作战', '一个作战目标，每人分一份 · 只有队长能发']].map(([k, l, d]) => `<button data-k="${k}" aria-pressed="${k === kind}" ${k === 'big' && !leader ? 'disabled' : ''}><b>${l}</b><small>${d}</small></button>`).join('')}</div></div>
          <label class="fld"><span data-gl>${kind === 'big' ? '作战目标' : '这次一起做什么'}</span><input class="inp" data-goal maxlength="20" value="${esc(titleDraft)}" placeholder="${kind === 'big' ? '比如：一起做完期末复习' : '比如：这周每人跑一次 5 公里'}"></label>
          <div class="fld"><span>截止日</span>${seg([['0', '今天'], ['3', '3 天'], ['7', '一周'], ['14', '两周'], ['30', '30 天']], String(days), 'data-due')}<p class="muted-d" data-dl>${days === 0 ? '今天截止' : `${days} 天后`}</p></div>
          <div class="fld"><span>这次练哪个属性</span>${seg(P5.ATTR_ORDER.map((a) => [a, AN(a)]), attr, 'data-attr-seg')}<p class="muted-d">每个人任务里那一条默认加这个属性（+3），自己可以改。</p></div>
          <div class="fld"><span>参与者</span><div class="od-chips">${view.members.map((m) => `<button type="button" class="od-chip ${chosen.has(m.userId) ? 'on' : ''}" data-participant="${m.userId}" aria-pressed="${chosen.has(m.userId)}">${chosen.has(m.userId) ? '✓ ' : ''}${esc(m.userId === view.me.userId ? '我' : m.codename)}</button>`).join('')}</div></div>
          <div class="fld" data-split ${kind === 'big' ? '' : 'hidden'}><span>分工（可以空着）</span><div class="od-row-acts"><button class="od-mini" disabled>AI 分工留计划10</button><small class="muted-d">现在可以自己写，真实 AI 拆解不在计划08内。</small></div>
            ${view.members.filter((m) => chosen.has(m.userId)).map((m) => `<label class="od-split"><b>${esc(m.userId === view.me.userId ? '我' : m.codename)}</b><input class="inp" data-task="${m.userId}" maxlength="20" value="${esc(taskDraft[m.userId] ?? '')}" placeholder="空着 = Ta 自己写" aria-label="${esc(m.codename)} 的子任务"></label>`).join('')}<p class="muted-d">空着的人会在作战里「写下我的一份」；没写之前，Ta 的任务就是作战目标本身。</p></div>
          <div class="sh-acts">${U.btn(`发起这个${kind === 'big' ? '作战' : '目标'}`, { tone: 'red', size: 'lg', seed: 782, attrs: 'data-ok' })}</div>`;
        wire(host);
        (host.querySelector('[data-goal]') as HTMLInputElement | null)?.addEventListener('input', (event) => {
          titleDraft = (event.currentTarget as HTMLInputElement).value;
        });
        host.querySelectorAll<HTMLInputElement>('[data-task]').forEach((input) => {
          input.addEventListener('input', () => { taskDraft[input.dataset.task!] = input.value; });
        });
      };
      draw();
      sh.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const k = target.closest('[data-k]') as HTMLElement | null;
        const p = target.closest('[data-participant]') as HTMLElement | null;
        const ok = target.closest('[data-ok]') as HTMLElement | null;
        if (k) {
          const next = k.dataset.k as 'small' | 'big';
          if (next === 'big' && !leader) return;
          kind = next;
          draw();
          return;
        }
        if (p) {
          const uid = p.dataset.participant ?? '';
          if (chosen.has(uid)) chosen.delete(uid); else chosen.add(uid);
          draw();
          return;
        }
        if (!ok || busy) return;
        const title = (sh.querySelector('[data-goal]') as HTMLInputElement | null)?.value?.trim() ?? '';
        if (!title) return P5.toast(kind === 'big' ? '先写作战目标' : '先写这次一起做什么');
        if (chosen.size < 2) return P5.toast('至少选 2 人');
        const assignments: Record<string, string> = {};
        sh.querySelectorAll<HTMLInputElement>('[data-task]').forEach((input) => {
          const text = input.value.trim();
          if (text) assignments[input.dataset.task!] = text;
        });
        const draft = normalizeOpDraft({
          kind, attr, title, deadline,
          participants: [...chosen],
          assignments,
        }, view.members);
        busy = true;
        const done = markBusy(ok, '发出中…');
        try {
          const op = await createOpFromUi(view.org.id, draft);
          await refreshOrg(view.org.id);
          close();
          P5.toast(op.participants.includes(view.me.userId) ? '发出去了：你的任务里也多了一条' : '发出去了');
          P5.rerender();
        } catch (error) {
          P5.toast(errText(error, '没发出去，请稍后再试'));
        } finally {
          busy = false;
          done();
        }
      });
      sh.querySelector('[data-due]')?.addEventListener('pick', (event) => {
        days = Number((event as CustomEvent).detail);
        deadline = shiftDayKey(range.min, days);
        const label = sh.querySelector('[data-dl]');
        if (label) label.textContent = days === 0 ? '今天截止' : `${days} 天后`;
      });
      sh.querySelector('[data-attr-seg]')?.addEventListener('pick', (event) => { attr = (event as CustomEvent).detail as AttributeId; });
    }, 83);
  }
  function openRaid(_state = 'night') {
    const { view } = syncOrg();
    if (!view) return P5.toast('找不到这个组织了');
    const panel = buildRaidPanelData(view);
    if (!panel) {
      sheet('满月团战', '<p class="od-warn">当前没有真实团战。等下一次满月开团后再来。</p>', () => {}, 85);
      return;
    }
    const persona = useAppStore.getState().persona;
    const attrs: AttributeId[] = ['knowledge', 'guts', 'dexterity', 'kindness', 'charm'];
    let mask = 0;
    let left = panel.state.left;
    let struck = panel.struckTonight;
    let allOutUsed = panel.options.allOutUsed;
    let busy = false;
    sheet('满月团战', '<div data-host></div>', (sh, close) => {
      const draw = () => {
        const host = sh.querySelector('[data-host]');
        const attr = attrs[mask];
        const maskName = persona?.attributePersonas?.[attr]?.name ?? AN(attr);
        const skills = [
          { name: '普攻', power: 10, plus: 0, sp: 0, type: '普攻' },
          ...(persona?.skills?.[attr] ?? []).slice(0, 4).map((s) => ({ name: s.name, power: s.power, plus: 0, sp: s.spCost, type: s.type })),
        ];
        const defeated = panel.state.defeated || left <= 0;
        const canStrike = panel.options.canStrike && !defeated && !struck;
        host.innerHTML = `<div class="od-raid-hd">${U.shp('div', { kind: 'cut', seed: 791, tone: 'ink', cls: 'od-raid-boss' }, `<small>满月团战 · ${esc(panel.current.phase)}</small><b>${esc(panel.raid.boss.name)}</b><span class="od-raid-sil">${P5.sil('crouch', { style: 'height:100%;width:auto' })}</span><div class="od-raid-hp" aria-label="首领还剩的血"><i style="width:${left / Math.max(1, panel.raid.hpMax) * 100}%"></i><em>${defeated ? '暗影击退' : `还剩 ${left} / ${panel.raid.hpMax}`}</em></div><span class="od-raid-ns">${panel.nights.map((n, i) => `<i class="${i === panel.current.nightIndex ? 'cur' : ''}">${esc(n)}${panel.myNights[i] ? '，我出过手' : ''}</i>`).join('')}</span>`)}</div>
          ${defeated ? `<div class="od-raid-down">${U.ransom('DOWN!', { h: 40, seed: 9 })}<p>暗影击退！出过手的人各 +${panel.reward} SP，据点每人 +20 经验。</p></div>`
          : panel.current.phase !== 'night' ? `<p class="od-warn">${panel.current.phase === 'day' ? '白天 · 18:00 开打。' : '这次团战已经结束。'}</p>`
          : struck ? `<p class="od-warn">今晚已出手 · ${esc(struck.skill)} · ${struck.damage}。明晚 18:00 再来。</p>`
          : `<section>${ttl('今日的锋芒', `弱点 ${AN(panel.raid.boss.weak)}`)}<div class="od-raid-mask"><button data-mk="-1" aria-label="上一张面具">‹</button><b data-mn>${esc(maskName)}</b><button data-mk="1" aria-label="下一张面具">›</button></div><div class="od-raid-sk">${skills.map((s, i) => `<button class="od-sk" data-skill="${esc(s.name)}" data-power="${s.power}" data-plus="${s.plus}" data-sp="${s.sp}" aria-pressed="${i === 0}" ${s.sp > 0 && !persona ? 'disabled' : ''}><b>${esc(s.name)}</b>${U.tag(s.type, 'ink')}<small>威力 ${s.power}${s.sp ? ` · ${s.sp} SP` : '，不花 SP'}</small></button>`).join('')}</div>
            ${canStrike ? `<div class="sh-acts">${U.btn('出手！普攻', { tone: 'red', size: 'lg', seed: 792, attrs: 'data-act="hit"' })}</div>` : ''}
            ${U.btn('总攻击！', { tone: 'ink', seed: 793, attrs: `data-act="allout" ${panel.options.canAllOut && !allOutUsed && !defeated ? '' : 'disabled'}`, cls: `od-wide ${panel.options.canAllOut && !allOutUsed ? '' : 'od-dis'}` })}<p class="muted-d">${allOutUsed ? '这次满月你已经用过了' : panel.options.allOutNeed > 0 ? `全队再出手 ${panel.options.allOutNeed} 次解锁` : '已解锁：每人每次满月一次，不花 SP'}</p></section>`}
          <section>${ttl('谁出过手', '只显示谁出过手，不排名次')}<div class="od-raid-hit">${panel.hitters.map((h) => `<span>${U.star('var(--red)', 'var(--ink)')}<b>${esc(view.members.find((m) => m.userId === h.userId)?.codename ?? '已离开的成员')}</b><small>出手 ${h.nights} 晚${h.allout ? ' · 总攻击' : ''}</small></span>`).join('') || '<p class="muted-d">还没有人出手。</p>'}</div></section>
          <p class="muted-d">满月那天的前一晚、当晚、后一晚，每晚 18:00 到第二天 07:00 能出手（按据点的时区）。</p>`;
        wire(host);
      };
      draw();
      sh.addEventListener('click', async (event) => {
        const target = event.target as HTMLElement;
        const maskButton = target.closest('[data-mk]') as HTMLElement | null;
        if (maskButton) {
          mask = (mask + Number(maskButton.dataset.mk) + attrs.length) % attrs.length;
          draw();
          return;
        }
        const skillButton = target.closest('.od-sk') as HTMLElement | null;
        const hitButton = target.closest('[data-act="hit"]') as HTMLElement | null;
        if (skillButton) {
          sh.querySelectorAll('.od-sk').forEach((x) => x.setAttribute('aria-pressed', x === skillButton));
          if (hitButton?.querySelector('span')) hitButton.querySelector('span')!.textContent = `释放 ${skillButton.dataset.skill}`;
          return;
        }
        const action = target.closest('[data-act]') as HTMLElement | null;
        if (!action || busy || action.hasAttribute('disabled')) return;
        if (action.dataset.act !== 'hit' && action.dataset.act !== 'allout') return;
        const selected = sh.querySelector('.od-sk[aria-pressed="true"]') as HTMLElement | null;
        busy = true;
        const done = markBusy(action, '出手中…');
        try {
          const result = action.dataset.act === 'allout'
            ? await allOutFromUi(view.org.id)
            : await strikeFromUi(view.org.id, {
                attr: attrs[mask],
                power: Number(selected?.dataset.power ?? 10),
                plus: Number(selected?.dataset.plus ?? 0),
                skill: selected?.dataset.skill ?? '普攻',
                spCost: Number(selected?.dataset.sp ?? 0),
              });
          left = Math.max(0, left - result.damage);
          if (action.dataset.act === 'allout') allOutUsed = true;
          else struck = { skill: selected?.dataset.skill ?? '普攻', damage: result.damage };
          const card = P5.cutIn(cutPanel(action.dataset.act === 'allout' ? 'ALL OUT' : result.isWeak ? 'WEAK!' : 'HIT!', `<div class="od-cut-paper"><b class="od-cut-n">−${result.damage}</b><div><b class="od-cut-big">${action.dataset.act === 'allout' ? '总攻击！' : result.isWeak ? '打中弱点！' : '出手！'}</b><p>${result.defeated ? '暗影击退' : '伤害已写回据点'}</p></div></div>`, { seed: 21 }), { autoMs: 1800, sfx: 'fanfare' });
          cutAnim(card);
          await refreshOrg(view.org.id);
          const next = buildRaidPanelData(orgView()!);
          if (next) {
            left = next.state.left;
            struck = next.struckTonight;
            allOutUsed = next.options.allOutUsed;
          }
          draw();
          P5.rerender();
        } catch (error) {
          P5.toast(errText(error, '出手失败，请重试'));
        } finally {
          busy = false;
          done();
        }
      });
    }, 85);
  }
  function openShareToOrg(_state = 'form') {
    const { view } = syncOrg();
    const activities = useAppStore.getState().activities ?? [];
    const activity = activities.find((a) => canShareActivity(a)) ?? null;
    const me = view?.me.userId ?? '';
    const left = view ? Math.max(0, ORG_POSTS_PER_DAY - myPostsToday(view.posts, me)) : 0;
    let text = activity ? defaultShareText(activity.description) : '';
    let done = false;
    sheet('分享到据点', '<div data-host></div>', (sh, close) => {
      let busy = false;
      const draw = () => {
        const host = sh.querySelector('[data-host]');
        host.innerHTML = done
          ? `<div class="od-ob-wel">${U.ransom('SHARED', { h: 34, seed: 2 })}<b class="od-cut-big">分享好了</b><p>大家打开据点的公告板就能看到，可以给你贴标签打气。</p><div class="sh-acts">${U.btn('好', { tone: 'ink', seed: 801, attrs: 'data-act="x"' })}${U.btn('去公告板看看', { tone: 'red', size: 'lg', seed: 802, attrs: 'data-act="board"' })}</div></div>`
          : `<p class="sh-p">大家打开据点的公告板就能看到，可以给你贴标签打气。</p>
            ${!view ? '<p class="od-warn">还没有组织，先在据点里建立或加入一个。</p>' : `<div class="fld"><span>分享到</span><div class="od-chips">${chip(`★ ${esc(view.org.name)}`, true, 'data-solo')}</div></div>
            <label class="fld"><span>说一句</span><input class="inp" data-say maxlength="20" value="${esc(text)}" placeholder="比如：跑完了第一个五公里" aria-label="分享的那一句"></label>
            ${!activity ? '<p class="od-warn">最近没有可分享的记录。</p>' : `<p class="muted-d">${left > 0 ? `今天还能在「${esc(view.org.name)}」分享 ${left} 条。` : `今天在「${esc(view.org.name)}」已经分享了 ${ORG_POSTS_PER_DAY} 条，明天再来。`}</p>`}
            <div class="sh-acts">${U.btn(left <= 0 ? `今天的 ${ORG_POSTS_PER_DAY} 条用完了` : '分享', { tone: 'red', size: 'lg', seed: 804, attrs: `data-act="share" ${!activity || left <= 0 ? 'disabled' : ''}`, cls: !activity || left <= 0 ? 'od-dis' : '' })}</div>`}`;
        wire(host);
        host.querySelector<HTMLInputElement>('[data-say]')?.addEventListener('input', (event) => {
          text = (event.currentTarget as HTMLInputElement).value;
        });
      };
      draw();
      sh.addEventListener('click', async (event) => {
        const target = event.target as HTMLElement;
        const button = target.closest('[data-act]') as HTMLElement | null;
        if (!button || busy) return;
        if (button.dataset.act === 'x') return close();
        if (button.dataset.act === 'board') {
          if (view) {
            useCloudSocialStore.getState().setHideoutOrgId(view.org.id);
            useCloudSocialStore.getState().setHideoutSection('board');
          }
          close();
          P5.go('hideout', { via: 'tear' });
          return;
        }
        if (button.dataset.act !== 'share' || !activity || !view) return;
        if (!text.trim()) return P5.toast('先写一句');
        busy = true;
        const doneButton = markBusy(button, '分享中…');
        try {
          await shareActivity(view.org.id, activity, text);
          done = true;
          draw();
        } catch (error) {
          P5.toast(errText(error, '没分享出去，稍后再试'));
        } finally {
          busy = false;
          doneButton();
        }
      });
    }, 87);
  }
  function openBorrowMask(st0 = 'ok') {
    const PS = [['亚森', 42, [['疾风斩', '伤害'], ['暴击连舞', '暴击']]], ['卡门', 38, [['火焰', '伤害'], ['易伤', '易伤：下次 +30%']]], ['佐罗', 30, [['回复之风', '回复 9 HP'], ['蓄力', '蓄力：下次伤害 ×2']]]];
    let i = 0;
    sheet('同调 · 坂本龙司', `${demoBar([['ok', '可借用'], ['nomask', '我没有面具'], ['none', 'Ta 没展示'], ['equip', '已装备']], st0)}<div data-host></div>`, (sh, close) => {
      stateful(sh, [], st0, (st) => {
        if (st === 'nomask') return '<p class="od-warn">你还没有自己的人格面具：先去逆影战场唤醒一张，才能同调别人的。</p>';
        if (st === 'none') return '<p class="sh-p">Ta 没有展示面具。</p>';
        const [n, pw, sk] = PS[i];
        return `<p class="sh-p">据点 Lv.${ORG.level} · 威力 ×1.2 · 只在本周有效 · 本周还能带进 <b>2</b> 场</p>
          <div class="od-bm" aria-label="坂本龙司 展示的面具，左右滑动切换"><button data-m="-1" aria-label="上一张">‹</button>${U.shp('div', { kind: 'torn', seed: 811 + i, tone: 'ink', cls: 'od-bm-c' }, `<span class="od-bm-sil">${P5.sil(['leap', 'point', 'crouch'][i], { style: 'height:100%;width:auto' })}</span><b>${n}</b><small>第 ${i + 1} 张：${n}</small><em>威力 ${pw} → ${Math.round(pw * 1.2)}</em>`)}<button data-m="1" aria-label="下一张">›</button></div>
          <span class="od-dots2 od-c">${PS.map((p, k) => `<i class="${k === i ? 'on' : ''}" aria-label="看第 ${k + 1} 张：${p[0]}"></i>`).join('')}</span>
          <div class="od-bm-sk">${sk.map(([a, b]) => `<span><b>${a}</b>${U.tag(b, 'ink')}</span>`).join('')}</div>
          <p class="muted-d">借用这里的任何一张都会替换它（你在面具切换栏最后一格的那张）。</p>
          <div class="sh-acts">${st === 'equip' && i === 0 ? '<span class="tag ink">✓ 已装备</span>' : U.btn('借用', { tone: 'red', size: 'lg', seed: 815, attrs: 'data-act="borrow"' })}</div>`;
      }, (h, st, draw) => h.addEventListener('click', (e) => { const m = e.target.closest('[data-m]'); if (m) { i = (i + +m.dataset.m + 3) % 3; draw(st); }
        const b = e.target.closest('[data-act="borrow"]'); if (b) { b.querySelector('span').textContent = '同调'; P5.sfx('level'); setTimeout(() => { close(); P5.toast(`同调成功：「${PS[i][0]}」在逆影战场面具切换栏的最后一格`); }, 300); } }));
    }, 89);
  }
  function openOrgCeleb(kind = 'level') {
    const K = { level: ['LEVEL UP', '据点升级', `「${ORG.name}」Lv.3 → Lv.4 · 作战本部`, '会议、目标、作战和团战攒下的经验'], raid: ['DOWN!', '满月团战 · 暗影击退', `「${ORG.name}」4 个人一起击退的`, '最后一击是你 · 岁时册 +1 枚印记 · 同调的面具伤害 ×1.2'], op: ['CLEAR!', '作战达成', `「${ORG.name}」的作战`, '大家都做完了 · 与 坂本龙司、高卷杏 亲密度 +2'] }[kind];
    const card = P5.cutIn(cutPanel(K[0], `<div class="od-cut-paper"><span class="od-emb-b">★</span><div><b class="od-cut-big">${K[1]}</b><p>${K[2]}</p><em>${K[3]}</em></div></div>`, { seed: 25 }), { autoMs: 3200, sfx: 'fanfare' });
    cutAnim(card);
  }
  function openHideoutMap(_state = 'raid') {
    const { data } = syncOrg();
    if (!data.hasData) return P5.toast('还没有据点');
    const myId = orgView()?.me.userId ?? '';
    stage({ title: '据点地图', en: 'HIDEOUT', seed: 101, cls: 'od-hm-st', body: '<div data-host></div><p class="od-note">据点分区：点分区跳到对应区块；点座位回到真实名册。</p>', onMount(w, close) {
      const raidPct = data.raid ? Math.round(data.raid.left / Math.max(1, data.raid.hpMax) * 100) : 0;
      w.querySelector('[data-host]').innerHTML = `${data.raid ? `<button class="od-hm-raid" data-act="raid">${U.tag('满月团战')}<b>「${esc(data.raid.boss)}」${data.raid.left <= 0 ? '已击退' : `还剩 ${raidPct}%`}</b><small>点了打开团战面板 ›</small></button>` : ''}
        <div class="od-hm" role="group" aria-label="据点分区"><svg class="od-hm-floor" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true"><polygon points="20,40 380,10 392,280 6,292" fill="#2a0306"/><polygon points="20,40 380,10 392,280 6,292" fill="url(#hmg)" opacity=".5"/><defs><pattern id="hmg" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)"><path d="M0 0H24M0 0V24" stroke="#F2E9DA" stroke-width=".6" opacity=".4"/></pattern></defs></svg>
          ${[['roster', '名册', 'ROSTER', 6, 8], ['board', '公告板', 'BOARD', 52, 6], ['meeting', '会议', 'MEETING', 8, 56], ['ops', '作战', 'OPS', 54, 54]].map(([k, n, en, x, y], i) => `<button class="od-hm-z" data-z="${k}" style="left:${x}%;top:${y}%;--r:${[-3, 2, 2.5, -2][i]}deg">${U.ransom(en, { h: 18, seed: 10 + i })}<b>${n}</b></button>`).join('')}
          </div><div class="od-hm-seats">${Array.from({ length: 7 }, (_, s) => { const m = ORG.members[s]; return `<button class="od-hm-seat ${m ? 'on' : ''} ${m && m[5] === myId ? 'me' : ''}" ${m ? `data-seat="${s}" aria-label="${s + 1} 号 ${esc(m[0])}：回到名册"` : `disabled aria-label="${s + 1} 号空座"`}><i>${s + 1}</i>${m ? `<b>${esc(m[0])}</b>` : ''}${data.raid && m && s < data.raid.hitters.length ? '<em>击</em>' : ''}</button>`; }).join('')}</div>`;
      wire(w);
      w.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('[data-act="raid"]')) return openRaid('night');
        const zone = (e.target as HTMLElement).closest('[data-z]') as HTMLElement | null;
        if (zone) {
          const section = zone.dataset.z as 'roster' | 'board' | 'meeting' | 'ops';
          useCloudSocialStore.getState().setHideoutSection(section);
          close();
          P5.go('hideout', { via: 'tear' });
          return;
        }
        if ((e.target as HTMLElement).closest('[data-seat]')) {
          useCloudSocialStore.getState().setHideoutSection('roster');
          close();
          P5.go('hideout', { via: 'tear' });
        }
      });
    } });
  }
  function openMeeting(_state = 'open') {
    const { view } = syncOrg();
    if (!view) return P5.toast('找不到这个组织了');
    const meet = meetingState(new Date(), view.org.tz);
    const week = meet.week;
    const mine = view.members.find((m) => m.userId === view.me.userId) ?? view.me;
    const goals = view.members.filter((m) => m.goalWeek === week && m.goal);
    const minutes = [...(view.posts ?? [])].find((p) => p.kind === 'minutes')?.minutes ?? null;
    let result: 'done' | 'partial' | 'missed' | null = null;
    let goal = mine.goalWeek === week ? mine.goal ?? '' : '';
    let editing = meet.open;
    stage({ title: '周日会议', en: 'MEETING', seed: 103, sil: 'cat', body: '<div data-host></div>', onMount(w, close) {
      let busy = false;
      const draw = () => {
        const host = w.querySelector('[data-host]');
        host.innerHTML = `${U.shp('section', { kind: 'torn', seed: 821, cls: 'od-mt' }, `<div class="od-mt-hd">${U.plate('周日会议', { fs: 17 })}${U.tag(meet.open ? '开会中' : '还没开', meet.open ? '' : 'ink')}</div>
          ${!meet.open ? '<p class="sh-p">周日会议还没开。到周日（周一凌晨 4 点前）再来写目标。</p>' : !editing ? `<p class="sh-p">你已经交了 · 本周目标：<b>「${esc(mine.goalWeek === week ? mine.goal ?? '' : '还没写')}」</b></p>${U.btn('改一改', { tone: 'ink', size: 'sm', seed: 822, attrs: 'data-act="edit"' })}`
          : `<p class="sh-p">${mine.goalWeek === week && mine.goal ? `这周的目标：「${esc(mine.goal)}」做到了吗？` : '先给这周写一句目标。'}</p><div class="seg od-seg" data-result-seg>${['done', 'partial', 'missed'].map((value, i) => `<button data-v="${value}" aria-pressed="${value === (result ?? 'done')}">${['做到了', '差一点', '没做到'][i]}</button>`).join('')}</div>
            <label class="fld"><span>下周想做到的一件事</span><input class="inp" data-meeting-goal maxlength="20" value="${esc(goal)}" placeholder="比如：每天背 30 个单词"></label><div class="sh-acts">${U.btn('交上去', { tone: 'red', size: 'lg', seed: 824, attrs: 'data-act="submit"' })}</div>`}
          <p class="muted-d">会议时间按组织所在的时区（${esc(view.org.tz)}）算。</p>`)}
          <section>${ttl('点名', '谁来了')}<div class="od-mt-roll">${view.members.map((m) => `<span class="${m.goalWeek === week && m.goal ? 'in' : ''}">${U.star(m.goalWeek === week && m.goal ? 'var(--red)' : '#cfc6b6', 'var(--ink)')}<b>${esc(m.codename)}${m.userId === view.me.userId ? '（我）' : ''}</b></span>`).join('')}</div></section>
          <section>${ttl('这周大家的目标')}<div class="od-mt-gl">${goals.map((m) => `<div class="q-row"><span class="q-k">${esc(m.userId === view.me.userId ? '我的' : m.codename)}</span><b>「${esc(m.goal ?? '')}」</b>${m.resultWeek === week ? U.tag(m.result === 'done' ? '做到了' : m.result === 'partial' ? '差一点' : '没做到', m.result === 'done' ? '' : 'ink') : ''}</div>`).join('') || '<p class="sh-p">这周还没人立目标。</p>'}</div></section>
          <section>${ttl('上一次的会议纪要', minutes?.week ?? '')}${minutes ? U.shp('div', { kind: 'quad', seed: 825, tone: 'ink', cls: 'od-mt-min' }, `<p>${minutes.rate.done}/${minutes.rate.total} 人做到了上周目标。</p><p>称号：${minutes.titles.map((t) => `${U.tag(t.title)} ${esc(t.codename)}`).join('　') || '无'} · 缺席：${minutes.absent.map((a) => esc(a.codename)).join('、') || '无'}</p>`) : '<p class="sh-p">还没有会议纪要。</p>'}</section>`;
        wire(host);
        host.querySelector<HTMLInputElement>('[data-meeting-goal]')?.addEventListener('input', (event) => {
          goal = (event.currentTarget as HTMLInputElement).value;
        });
        host.querySelector('[data-result-seg]')?.addEventListener('pick', (event) => {
          result = (event as CustomEvent).detail as 'done' | 'partial' | 'missed';
        });
      };
      draw();
      w.addEventListener('click', async (event) => {
        const button = (event.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
        if (!button || busy) return;
        if (button.dataset.act === 'edit') {
          editing = true;
          draw();
          return;
        }
        if (button.dataset.act !== 'submit') return;
        if (!goal.trim()) return P5.toast('写一句下周目标');
        busy = true;
        const done = markBusy(button, '提交中…');
        try {
          await submitMeeting(view.org.id, { result: result ?? undefined, goal });
          await refreshOrg(view.org.id);
          syncOrg();
          close();
          P5.toast('交上去了，下周见');
          P5.rerender();
        } catch (error) {
          P5.toast(errText(error, '没交上去，请重试'));
        } finally {
          busy = false;
          done();
        }
      });
    } });
  }

export const OD: any = { openOrgOnboard, openOrgSettings, openOrgTitles, openOpCreate, openRaid, openShareToOrg, openBorrowMask, openOrgCeleb, openHideoutMap, openMeeting, confirm, sheet, tarotFace, MAJ, ORG };
