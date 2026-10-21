// @ts-nocheck —— 逐字迁移自 v3 原生 overlays/d.js 的「通用件 + 据点 org/*」段（类名 .od-*，样式 = legacy/css/d.css）。
// 据点页（pages/org.p5.js）里的入口都调这里：openHideoutMap / openRaid / openOpCreate / openMeeting / openShareToOrg /
// openOrgSettings / openOrgTitles / openBorrowMask / openOrgOnboard / openOrgCeleb。
import { P5 } from './p5';
import { thinkingCircleHTML } from '@/p5r-red/fx/thinkingCircle';
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
  const ORG = { name: '夜读小队', motto: '一起熬过期末', code: 'MASK7Q2K', level: 3, emblem: '★', members: [['野鸡', '愚者', '0', true], ['坂本龙司', '战车', 'VII'], ['高卷杏', '恋人', 'VI'], ['新岛真', '女祭司', 'II'], ['佐仓双叶', '隐士', 'IX']] };

  /* ══════════════════ 据点 org/* ══════════════════ */
  const memCard = (m, i, { sm = false, sel = false } = {}) => { const c = MAJ.find((x) => x.name === m[1]) || MAJ[0]; return `<span class="od-mem ${sm ? 'sm' : ''} ${sel ? 'sel' : ''}">${tarotFace(c, { w: sm ? 64 : 96 })}<b>${m[0]}${m[3] ? ' <i class="tag">队长</i>' : ''}</b></span>`; };
  function openOrgOnboard(flow = 'create') {
    let step = 'rules';
    const steps = { create: ['rules', 'info', 'card', 'name', 'welcome'], join: ['rules', 'code', 'preview', 'card', 'name', 'welcome'] };
    sheet(flow === 'create' ? '建立组织' : '加入组织', `${demoBar([['create', '建立流程'], ['join', '加入流程']], flow)}<div class="od-ob-steps" data-steps></div><div data-host></div>`, (sh) => {
      let ci = 7;
      const render = (st) => {
        if (st === 'rules') return `${ttl('据点守则')}<p class="sh-p">组织是一小群人互相看见、互相打气的地方。第一次建立或加入之前，先读一下这几条：</p><ol class="od-rules"><li>这里是一小群人互相打气的地方。不发广告、不留联系方式和链接。</li><li>不骚扰、不攻击任何人，不发色情、暴力、违法或让人不适的内容。</li><li>违反守则的内容会被删除；队长可以请离成员，严重的账号会被限制使用。</li><li>看到不合适的内容，长按就能举报或屏蔽；举报会在 2 天内处理。</li></ol><div class="sh-acts">${U.btn('同意并继续', { tone: 'red', size: 'lg', seed: 731, attrs: 'data-next' })}</div>`;
        if (st === 'info') return `${ttl('建立组织')}<label class="fld"><span>组织名</span><input class="inp" placeholder="比如：夜读小队"></label><label class="fld"><span>口号（可以不写）</span><input class="inp" placeholder="一句大家都认的话"></label><div class="fld"><span>徽记</span><div class="od-emb">${['星', '月', '日', '钥匙', '面具', '鸦', '蝶', '狐', '猫', '火', '浪', '冠'].map((e, i) => `<button aria-pressed="${i === 0}" aria-label="徽记：${e}">${e}</button>`).join('')}</div></div><p class="muted-d">建好之后你是队长，坐 1 号座位；把邀请码发给朋友，最多 7 个人。每人最多自建一个、加入一个组织。</p><div class="sh-acts">${U.btn('建立组织', { tone: 'red', size: 'lg', seed: 732, attrs: 'data-next data-busy="建立中…"' })}</div>`;
        if (st === 'code') return `${ttl('加入组织')}<label class="fld"><span>邀请码</span><input class="inp od-code" maxlength="8" placeholder="8 位字母和数字" value="MASK7Q2"></label><p class="muted-d">邀请码在队长的据点页底部。码里没有 0、O、1、I，看着像的都按别的字母输。</p><p class="od-err" data-err hidden>邀请码不对，或者组织已经换了新码</p><div class="sh-acts">${U.btn('（演示：码错）', { tone: 'paper', size: 'sm', seed: 733, attrs: 'data-bad' })}${U.btn('查找', { tone: 'red', size: 'lg', seed: 734, attrs: 'data-next data-busy="查找中…"' })}</div>`;
        if (st === 'preview') return `${U.shp('div', { kind: 'cut', seed: 735, tone: 'ink', cls: 'od-ob-pv' }, `<span class="od-emb-b">★</span><b>${ORG.name}</b><small>「${ORG.motto}」· ${ORG.members.length} 人 · Lv.${ORG.level}</small>`)}<div class="sh-acts">${U.btn('换个码', { tone: 'ink', seed: 736, attrs: 'data-prev' })}${U.btn('加入', { tone: 'red', size: 'lg', seed: 737, attrs: 'data-next data-busy="加入中…"' })}</div>`;
        if (st === 'card') return `${ttl('选一张代表牌', '左右滑动挑一张 · 同一组织里每张只能一个人')}<div class="od-ob-cf"><button class="od-ob-nav" data-cf="-1" aria-label="上一张">‹</button><div class="od-ob-cards">${[-1, 0, 1].map((d) => { const c = MAJ[(ci + d + 22) % 22], taken = ORG.members.some((m) => m[1] === c.name); return `<span class="${d ? 'side' : 'mid'} ${taken ? 'taken' : ''}">${tarotFace(c, { w: d ? 78 : 120 })}${taken && !d ? '<em>这张已经有人了</em>' : ''}</span>`; }).join('')}</div><button class="od-ob-nav" data-cf="1" aria-label="下一张">›</button></div><div class="sh-acts">${U.btn(`就选「${MAJ[ci].name}」`, { tone: 'red', size: 'lg', seed: 738, attrs: `data-next ${ORG.members.some((m) => m[1] === MAJ[ci].name) ? 'disabled' : ''}`, cls: ORG.members.some((m) => m[1] === MAJ[ci].name) ? 'od-dis' : '' })}</div>`;
        if (st === 'name') return `${ttl('写一个代号')}<div class="fld"><span>代号</span>${seg([['nick', '用昵称'], ['card', '用牌名'], ['own', '自己写']], 'nick', 'data-cn')}</div><input class="inp" data-cv maxlength="8" value="野鸡" placeholder="（写一个代号）"><p class="muted-d">最多 8 个字 · 名册上显示为：<b data-cp>野鸡</b></p><div class="sh-acts">${U.btn('放进名册', { tone: 'red', size: 'lg', seed: 739, attrs: 'data-next data-busy="保存中…"' })}</div>`;
        return `<div class="od-ob-wel">${tarotFace(MAJ[ci], { w: 120 })}<b class="od-cut-big">${flow === 'create' ? `今天起，你是「${ORG.name}」的一员` : `欢迎加入「${ORG.name}」`}</b><p>「${ORG.name}」收下了你的名字</p><small class="muted-d">点一下继续</small></div>`;
      };
      const host = sh.querySelector('[data-host]');
      const draw = () => { const S = steps[flow]; sh.querySelector('[data-steps]').innerHTML = S.map((s, i) => `<i class="${i <= S.indexOf(step) ? 'on' : ''}"></i>`).join(''); host.innerHTML = render(step); wire(host); P5.panelIn(host.children, { from: 'right', stagger: .04 });
        const cn = host.querySelector('[data-cn]'); if (cn) { const cv = host.querySelector('[data-cv]'), cp = host.querySelector('[data-cp]'); cn.addEventListener('pick', (e) => { cv.value = e.detail === 'nick' ? '野鸡' : e.detail === 'card' ? MAJ[ci].name : ''; cp.textContent = cv.value || '（写一个代号）'; if (e.detail === 'own') cv.focus(); }); cv.oninput = () => cp.textContent = cv.value || '（写一个代号）'; }
        const w = host.querySelector('.od-ob-wel'); if (w) { P5.sfx('fanfare', .5); w.onclick = () => { document.querySelector('.sheet-veil .x').click(); P5.toast('进入据点'); }; } };
      host.addEventListener('click', (e) => { const n = e.target.closest('[data-next]'); if (n && !n.disabled) { const S = steps[flow]; const go = () => { step = S[S.indexOf(step) + 1]; draw(); }; if (n.dataset.busy) { n.querySelector('span').textContent = n.dataset.busy; setTimeout(go, 500); } else go(); }
        if (e.target.closest('[data-prev]')) { step = 'code'; draw(); } if (e.target.closest('[data-bad]')) host.querySelector('[data-err]').hidden = false;
        const cf = e.target.closest('[data-cf]'); if (cf) { ci = (ci + +cf.dataset.cf + 22) % 22; draw(); } const em = e.target.closest('.od-emb button'); if (em) host.querySelectorAll('.od-emb button').forEach((x) => x.setAttribute('aria-pressed', x === em)); });
      sh.querySelector('.od-demo').addEventListener('click', (e) => { const b = e.target.closest('[data-st]'); if (!b) return; flow = b.dataset.st; step = 'rules'; sh.querySelectorAll('.od-demo button').forEach((x) => x.setAttribute('aria-pressed', x === b)); draw(); });
      draw();
    }, 77);
  }
  function openOrgSettings(leader = true) {
    sheet('据点设置', `${demoBar([['leader', '队长视角'], ['member', '成员视角']], leader ? 'leader' : 'member')}<div data-host></div>`, (sh) => {
      stateful(sh, [], leader ? 'leader' : 'member', (st) => { const L = st === 'leader';
        return `<section class="od-os">${ttl('我的成员牌')}<div class="od-os-me">${memCard(ORG.members[0], 0, { sm: true })}<span><b>代表牌与代号</b><small>愚者 · 野鸡</small></span>${U.btn('修改', { tone: 'ink', size: 'sm', seed: 741, attrs: 'data-act="card"' })}</div>
          <div class="od-os-masks"><b>在名册背面展示的面具</b><small>最多展示 3 张</small><div>${['亚森', '卡门', '佐罗'].map((n, i) => `<button class="od-chip on" aria-label="${n}，第 ${i + 1} 张">✓ ${n}</button>`).join('')}<button class="od-chip" data-act="mask4">阿尔塞斯</button></div></div></section>
          <section class="od-os">${ttl('等级与称号', L ? '给每一级起名字、给称号改名、加自己的称号' : '每一级叫什么、每个称号怎么拿')}<div class="od-os-row"><span>Lv.${ORG.level} · 特别活动部</span>${U.btn(L ? '编辑' : '查看', { tone: 'ink', size: 'sm', seed: 742, attrs: 'data-act="titles"' })}</div></section>
          <section class="od-os">${ttl('组织资料')}<div class="od-os-row"><span><b>${ORG.name}</b> · 「${ORG.motto}」 · 徽记：星</span>${L ? U.btn('修改', { tone: 'ink', size: 'sm', seed: 743, attrs: 'data-act="info"' }) : ''}</div><div class="od-os-edit" hidden><label class="fld"><span>组织名</span><input class="inp" value="${ORG.name}"></label><label class="fld"><span>口号（可以不写）</span><input class="inp" value="${ORG.motto}"></label><div class="od-emb">${['星', '月', '日', '钥匙', '面具', '鸦'].map((e, i) => `<button aria-pressed="${i === 0}" aria-label="徽记：${e}">${e}</button>`).join('')}</div><div class="sh-acts">${U.btn('取消', { tone: 'ink', size: 'sm', seed: 744, attrs: 'data-act="infox"' })}${U.btn('保存', { tone: 'red', size: 'sm', seed: 745, attrs: 'data-act="infook"' })}</div></div>
            ${L ? `<div class="od-os-row"><span><b>换一个邀请码</b><small>码外传了、或者不想再有人加入时用</small></span>${U.btn('换码', { tone: 'paper', size: 'sm', seed: 746, attrs: 'data-act="code"' })}</div>` : ''}</section>
          <section class="od-os">${ttl('成员', ORG.members.length + ' 人')}${ORG.members.slice(1).map((m, i) => `<div class="od-os-row"><span><b>${m[0]}</b> <small>${m[1]} · ${i + 2} 号</small></span>${L ? `${U.btn('转让', { tone: 'paper', size: 'sm', seed: 747 + i, attrs: `data-act="give" data-n="${m[0]}"` })}${U.btn('请离', { tone: 'red', size: 'sm', seed: 752 + i, attrs: `data-act="kick" data-n="${m[0]}"` })}` : ''}</div>`).join('')}</section>
          <section class="od-os">${ttl('屏蔽名单（只在本机生效）')}<div class="od-os-row"><span>路人甲</span>${U.btn('解除', { tone: 'ink', size: 'sm', seed: 757, attrs: 'data-act="unblock"' })}</div></section>
          <section class="od-os">${ttl('据点守则 · 别人能看到什么')}<button class="od-addline" data-act="rules">展开 ▼</button><div class="od-os-rules" hidden><p class="muted-d">名册：代表牌、代号、展示的面具、连续天数；公告板：你主动分享的动态；会议：你写的周目标。你的记录内容、点数明细都不会给别人看。</p></div></section>
          <section class="od-os danger">${L ? `<p class="muted-d">队长不能直接退出：先把队长转让给别人，或者解散组织。</p>${U.btn('解散组织', { tone: 'red', seed: 758, attrs: 'data-act="dissolve"' })}` : U.btn('退出组织', { tone: 'red', seed: 759, attrs: 'data-act="leave"' })}</section>`; },
      (h) => h.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act, n = b.dataset.n;
        if (a === 'card') openOrgOnboard('create'); if (a === 'titles') openOrgTitles(); if (a === 'mask4') P5.toast('最多展示 3 张：先去掉一张');
        if (a === 'info') h.querySelector('.od-os-edit').hidden = false; if (a === 'infox') h.querySelector('.od-os-edit').hidden = true; if (a === 'infook') { h.querySelector('.od-os-edit').hidden = true; P5.toast('改好了'); }
        if (a === 'code') confirm('换一个邀请码？', '旧码会立即作废，已经在组织里的人不受影响。', '换码', () => P5.toast('换好了，旧码已经作废'), { danger: false });
        if (a === 'kick') sheet(`请「${n}」离开？`, `<p class="sh-p">对方会从名册里消失；邀请码会一起换掉，旧码不能再用。</p><div class="tg"><b>同时删除 Ta 的动态和标签</b>${sw(false)}</div><div class="sh-acts">${U.btn('取消', { tone: 'ink', seed: 761, attrs: 'data-x' })}${U.btn('请离', { tone: 'red', size: 'lg', seed: 762, attrs: 'data-ok' })}</div>`, (s2, c2) => { s2.querySelector('[data-x]').onclick = c2; s2.querySelector('[data-ok]').onclick = () => { c2(); P5.toast(`已请离「${n}」，邀请码也换了新的`); }; });
        if (a === 'give') confirm(`把队长交给「${n}」？`, '转让之后你是普通成员，改资料、换码、请离都由新队长来做。', '转让', () => P5.toast(`队长已经交给「${n}」`), { danger: false });
        if (a === 'unblock') { b.closest('.od-os-row').remove(); P5.toast('已解除'); }
        if (a === 'rules') { const r = h.querySelector('.od-os-rules'); r.hidden = !r.hidden; b.textContent = r.hidden ? '展开 ▼' : '收起 ▲'; }
        if (a === 'dissolve') confirm(`解散「${ORG.name}」？`, '组织、名册会一起删除，所有成员都会收到「你已不在」的提示。这一步不能撤销。', '解散', () => P5.toast('组织已解散'));
        if (a === 'leave') confirm(`退出「${ORG.name}」？`, '你的成员牌会从名册里拿掉，你在这里分享的动态和贴的标签也会一起删除；以后想回来要重新拿邀请码。', '退出', () => P5.toast('已退出'));
      }));
    }, 79);
  }
  function openOrgTitles(leader = true) {
    const LV = ['据点', '秘密基地', '特别活动部', '作战本部', '要塞', '不夜城'];
    const BT = [['本周出勤王', '这周记录的天数全队最多（至少 5 天，并列都给）'], ['全勤', '这周 7 天都有记录'], ['周末不打烊', '周六、周日都有记录'], ['连续 7 天', '连续记录 7 天以上'], ['连续 14 天', '连续记录 14 天以上'], ['连续 30 天', '连续记录 30 天以上'], ['言出必行', '做到了会上写的目标；连续几周做到会写「· N 周」'], ['作战完成者', '这周有目标或作战达成，而且你在名单里'], ['月下同行', '这周的满月团战出过手']];
    const CONDS = [['week_days', '这周记录天数', '天', 5], ['weekend', '周六周日都记', '', 0], ['streak', '连续记录天数', '天', 21], ['goal_weeks', '连续做到会上的目标', '周', 3], ['ops', '这周完成的作战', '场', 2], ['raid', '这周团战出手', '次', 3], ['lv', '总等级', '级', 20]];
    sheet('等级与称号', `${demoBar([['leader', '队长'], ['member', '成员']], leader ? 'leader' : 'member')}<div data-host></div>`, (sh) => {
      stateful(sh, [], leader ? 'leader' : 'member', (st) => { const L = st === 'leader';
        return `<p class="sh-p">${L ? '队长可以给每一级起名字、给称号改名，也可以加自己的称号。改名只影响之后的纪要，称号册里改名前后算同一个称号。' : '据点每一级的名字、每周纪要里发的称号都在这里。名字由队长定。'}</p>
          ${ttl('等级名字', `现在 Lv.${ORG.level}`)}<div class="od-lv">${LV.map((d, i) => `<label class="od-lv-r ${i + 1 === ORG.level ? 'cur' : ''}"><b>Lv.${i + 1}</b>${L ? `<input class="inp" maxlength="6" placeholder="${d}" aria-label="Lv.${i + 1} 的名字（默认：${d}）">` : `<span>${d}</span>`}${i + 1 === ORG.level ? U.tag('现在') : ''}</label>`).join('')}</div>
          ${ttl('称号', `${BT.length} 个`)}<div class="od-tt">${BT.map(([n, h]) => `<div class="od-tt-r"><b>${n}</b><small>${h}</small>${L ? `<button class="od-mini" data-act="ren" aria-label="称号「${n}」改名">改</button>` : ''}</div>`).join('')}</div>
          ${ttl('自定义称号')}<div class="od-tt" data-custom><div class="od-tt-r"><b>夜猫子</b><small>这周记录天数 ≥ 6 天</small>${L ? '<button class="od-mini" data-act="edit">改</button><button class="od-mini" data-act="delc">删</button>' : ''}</div></div>
          ${L ? `<button class="od-addline" data-act="add">＋ 加一个称号</button><div class="od-tt-form" hidden><label class="fld"><span>称号名字（最多 8 个字）</span><input class="inp" maxlength="8" placeholder="给称号起个名字"></label><div class="fld"><span>条件</span>${seg(CONDS.map(([k, l]) => [k, l]), 'week_days', 'data-cond')}</div><div class="od-cond-v">${stepper(5, 'data-min="1" data-max="7"')}<b data-unit>天</b></div><p class="muted-d" data-ct>每周一发纪要时，这周记录天数 ≥ 5 天的人拿到「（称号名）」。</p><div class="sh-acts">${U.btn('取消', { tone: 'ink', size: 'sm', seed: 771, attrs: 'data-act="fx"' })}${U.btn('加上', { tone: 'red', seed: 772, attrs: 'data-act="fok"' })}</div></div>
            <div class="sh-acts">${U.btn('保存', { tone: 'red', size: 'lg', seed: 773, attrs: 'data-act="save"' })}</div>` : '<p class="muted-d">队长还没加。</p>'}`; },
      (h) => { const cs = h.querySelector('[data-cond]'); if (cs) cs.addEventListener('pick', (e) => { const c = CONDS.find((x) => x[0] === e.detail); h.querySelector('.od-cond-v').hidden = !c[2]; h.querySelector('[data-unit]').textContent = c[2]; h.querySelector('.od-cond-v b').textContent = c[3]; h.querySelector('[data-ct]').textContent = `每周一发纪要时，${c[1]}${c[2] ? ` ≥ ${c[3]} ${c[2]}` : ''}的人拿到「（称号名）」。`; });
        h.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
          if (a === 'add' || a === 'edit') { h.querySelector('.od-tt-form').hidden = false; } if (a === 'fx') h.querySelector('.od-tt-form').hidden = true;
          if (a === 'fok') { const n = h.querySelector('.od-tt-form input').value.trim() || '新称号'; h.querySelector('[data-custom]').insertAdjacentHTML('beforeend', `<div class="od-tt-r"><b>${esc(n)}</b><small>${h.querySelector('[data-ct]').textContent.replace(/^每周一发纪要时，|的人拿到.*$/g, '')}</small><button class="od-mini" data-act="edit">改</button><button class="od-mini" data-act="delc">删</button></div>`); h.querySelector('.od-tt-form').hidden = true; }
          if (a === 'delc') b.closest('.od-tt-r').remove(); if (a === 'ren') { const r = b.closest('.od-tt-r'); const bb = r.querySelector('b'); bb.contentEditable = true; bb.focus(); P5.toast('直接改字，改完点保存'); }
          if (a === 'save') { b.querySelector('span').textContent = '存着…'; setTimeout(() => { b.querySelector('span').textContent = '保存'; P5.toast('改好了：之后的纪要用新名字'); }, 600); } }); });
    }, 81);
  }
  function openOpCreate(kind = 'small') {
    sheet('发起目标 / 作战', `<div class="fld"><span>类型</span><div class="od-per two">${[['small', '目标', '一句话，大家做同一件事'], ['big', '作战', '一个作战目标，每人分一份 · 只有队长能发']].map(([k, l, d]) => `<button data-k="${k}" aria-pressed="${k === kind}"><b>${l}</b><small>${d}</small></button>`).join('')}</div></div>
      <label class="fld"><span data-gl>${kind === 'big' ? '作战目标' : '这次一起做什么'}</span><input class="inp" data-goal placeholder="${kind === 'big' ? '比如：一起做完期末复习' : '比如：这周每人跑一次 5 公里'}"></label>
      <div class="fld"><span>截止日</span>${seg([['0', '今天'], ['3', '3 天'], ['7', '一周'], ['14', '两周'], ['30', '30 天']], '7', 'data-due')}<p class="muted-d" data-dl>7 天后</p></div>
      <div class="fld"><span>这次练哪个属性</span>${seg(P5.ATTR_ORDER.map((a) => [a, AN(a)]), 'guts')}<p class="muted-d">每个人任务里那一条默认加这个属性（+3），自己可以改。</p></div>
      <div class="fld"><span>参与者</span><div class="od-chips">${ORG.members.map((m, i) => chip(i === 0 ? '我' : m[0], true)).join('')}</div></div>
      <div class="fld" data-split ${kind === 'big' ? '' : 'hidden'}><span>分工（可以空着）</span><div class="od-row-acts">${U.btn('✦ AI 拆解分工', { tone: 'red', size: 'sm', seed: 781, attrs: 'data-act="ai"' })}<small class="muted-d">按作战目标和每个人的代表牌、面具拆，拆完还能改</small></div>
        ${ORG.members.slice(0, 4).map((m, i) => `<label class="od-split"><b>${i === 0 ? '我' : m[0]}</b><input class="inp" placeholder="空着 = Ta 自己写" aria-label="${m[0]} 的子任务"></label>`).join('')}<p class="muted-d">空着的人会在作战里「写下我的一份」；没写之前，Ta 的任务就是作战目标本身。</p></div>
      <div class="sh-acts">${U.btn(`发起这个${kind === 'big' ? '作战' : '目标'}`, { tone: 'red', size: 'lg', seed: 782, attrs: 'data-ok' })}</div>`, (sh, close) => {
      sh.querySelectorAll('[data-k]').forEach((b) => b.onclick = () => { const k = b.dataset.k; sh.querySelectorAll('[data-k]').forEach((x) => x.setAttribute('aria-pressed', x === b)); sh.querySelector('[data-split]').hidden = k !== 'big'; sh.querySelector('[data-gl]').textContent = k === 'big' ? '作战目标' : '这次一起做什么'; sh.querySelector('[data-goal]').placeholder = k === 'big' ? '比如：一起做完期末复习' : '比如：这周每人跑一次 5 公里'; sh.querySelector('[data-ok] span').textContent = `发起这个${k === 'big' ? '作战' : '目标'}`; });
      sh.querySelector('[data-due]').addEventListener('pick', (e) => sh.querySelector('[data-dl]').textContent = e.detail === '0' ? '今天截止' : `${e.detail} 天后`);
      sh.querySelector('[data-act="ai"]').onclick = (e) => { const g = sh.querySelector('[data-goal]').value.trim(); if (!g) return P5.toast('先写作战目标'); const s = e.currentTarget.querySelector('span'); s.textContent = '拆解中…'; setTimeout(() => { s.textContent = '✦ AI 拆解分工'; const t = ['整理第 1–3 章笔记', '刷两套真题', '做思维导图', '出 20 道自测题']; sh.querySelectorAll('.od-split input').forEach((i, k) => i.value = t[k]); }, 800); };
      sh.querySelector('[data-ok]').onclick = (e) => { e.currentTarget.querySelector('span').textContent = '发出中…'; setTimeout(() => { close(); P5.toast('发出去了：你的任务里也多了一条'); }, 500); };
    }, 83);
  }
  function openRaid(st0 = 'night') {
    const MASKS = [['亚森', [['疾风斩', 18, 0, '伤害'], ['暴击连舞', 26, 8, '暴击'], ['鼓舞', 0, 4, '增益']]], ['卡门', [['火焰', 22, 6, '伤害'], ['蓄力', 0, 5, '蓄力']]], ['佐罗', [['回复之风', 0, 4, '回复'], ['削弱', 0, 3, '削弱']]]];
    let mi = 0;
    sheet('满月团战', `${demoBar([['night', '今晚可出手'], ['day', '白天'], ['struck', '今晚已出手'], ['allout', '总攻击已解锁'], ['nosp', '无 SP'], ['down', '暗影击退'], ['failed', '拉取失败']], st0)}<div data-host></div>`, (sh) => {
      stateful(sh, [], st0, (st) => { const hp = st === 'down' ? 0 : 62, sp = st === 'nosp' ? 0 : 24;
        return `<div class="od-raid-hd">${U.shp('div', { kind: 'cut', seed: 791, tone: 'ink', cls: 'od-raid-boss' }, `<small>满月团战 · ${st === 'day' ? '前一晚' : '满月夜'} · ${md(addD(1))} 满月</small><b>暴食之影</b><span class="od-raid-sil">${P5.sil('crouch', { style: 'height:100%;width:auto' })}</span><div class="od-raid-hp" aria-label="首领还剩的血"><i style="width:${hp}%"></i><em>${st === 'down' ? '暗影击退' : `还剩 ${hp}%`}</em></div><span class="od-raid-ns">${['前一晚', '满月夜', '后一晚'].map((n, i) => `<i class="${i === 1 ? 'cur' : i === 0 ? 'past' : ''}">${n}${i === 0 ? '，我出过手' : i === 1 ? '（满月，伤害 ×1.2）' : ''}</i>`).join('')}</span>`)}</div>
          ${st === 'down' ? `<div class="od-raid-down">${U.ransom('DOWN!', { h: 40, seed: 9 })}<p>暗影击退！出过手的人各 +30 SP，岁时册多一枚印记，据点每人 +20 经验。</p><p class="muted-d">最后一击：坂本龙司</p></div>`
          : st === 'failed' ? `<p class="od-warn">团战暂时拉不到（可能是网络，或者服务器还没准备好）。稍后刷新再看看。</p>`
          : st === 'day' ? `<p class="od-warn">白天 · 18:00 开打 · 白天不能出手，18:00 开打。</p>`
          : st === 'struck' ? `<p class="od-warn">今晚已出手 · 明晚 18:00 再来。</p>`
          : `<section>${ttl('今日的锋芒', `现在有 ${sp} SP`)}${sp ? `<div class="od-raid-mask"><button data-mk="-1" aria-label="上一张面具">‹</button><b data-mn>${MASKS[mi][0]}</b><button data-mk="1" aria-label="下一张面具">›</button></div><div class="od-raid-sk" data-sk>${skills(MASKS[mi][1], sp)}</div>` : '<p class="od-warn">逆影战场还没开始，没有 SP：这次先用普攻。</p>'}
            <div class="sh-acts">${U.btn(sp ? '释放 疾风斩' : '出手！普攻', { tone: 'red', size: 'lg', seed: 792, attrs: 'data-act="hit"' })}</div>
            ${U.btn('总攻击！', { tone: st === 'allout' ? 'red' : 'ink', seed: 793, attrs: `data-act="allout" ${st === 'allout' ? '' : 'disabled'}`, cls: `od-wide ${st === 'allout' ? '' : 'od-dis'}` })}<p class="muted-d">${st === 'allout' ? '已解锁：每人每次满月一次，不花 SP' : '全队再出手 3 次解锁 · 先出一次手才能发动'}</p></section>`}
          <section>${ttl('谁出过手', '只显示谁出过手，不排名次')}<div class="od-raid-hit">${ORG.members.slice(0, 4).map((m, i) => `<span>${U.star(i < 3 ? 'var(--red)' : '#cfc6b6', 'var(--ink)')}<b>${m[0]}</b><small>${i < 3 ? `出手 ${3 - i} 晚${i === 1 ? ' · 总攻击' : ''}` : '还没出手'}</small></span>`).join('')}<span>${U.star('#cfc6b6', 'var(--ink)')}<b>已离开的成员</b><small>出手 1 晚</small></span></div></section>
          <p class="muted-d">满月那天的前一晚、当晚、后一晚，每晚 18:00 到第二天 07:00 能出手（按据点的时区）。首领的等级就是开团时的据点等级，血量按名册和它定（每高一级 +5%），三晚里据点升级也不变；之后进来的人也能出手。</p>`; },
      (h, st, draw) => {
        h.addEventListener('click', (e) => { const mk = e.target.closest('[data-mk]'); if (mk) { mi = (mi + +mk.dataset.mk + 3) % 3; h.querySelector('[data-mn]').textContent = MASKS[mi][0]; h.querySelector('[data-sk]').innerHTML = skills(MASKS[mi][1], 24); return; }
          const sk = e.target.closest('.od-sk'); if (sk && !sk.disabled) { h.querySelectorAll('.od-sk').forEach((x) => x.setAttribute('aria-pressed', x === sk)); h.querySelector('[data-act="hit"] span').textContent = '释放 ' + sk.dataset.n; return; }
          const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
          if (b.dataset.act === 'hit' || b.dataset.act === 'allout') { b.querySelector('span').textContent = '出手中…'; setTimeout(() => { const card = P5.cutIn(cutPanel(b.dataset.act === 'allout' ? 'ALL OUT' : 'WEAK!', `<div class="od-cut-paper"><b class="od-cut-n">−${b.dataset.act === 'allout' ? 96 : 32}</b><div><b class="od-cut-big">${b.dataset.act === 'allout' ? '总攻击！' : '打中弱点！'}</b><p>× 弱点 1.5 × 满月 1.2</p></div></div>`, { seed: 21 }), { autoMs: 1800, sfx: 'fanfare' }); cutAnim(card); draw('struck'); }, 400); }
        });
      });
    }, 85);
    function skills(arr, sp) { return arr.map(([n, d, c, t], i) => `<button class="od-sk" data-n="${n}" aria-pressed="${i === 0}" ${c > sp ? 'disabled' : ''}><b>${n}</b>${U.tag(t, 'ink')}<small>预估 ${d || '—'}${c ? ` · ${c} SP` : '，不花 SP'}${c > sp ? '，SP 不够' : ''}</small></button>`).join(''); }
  }
  function openShareToOrg(st0 = 'form') {
    sheet('分享到据点', `${demoBar([['form', '可分享'], ['used', '今天用完了'], ['ok', '分享好了']], st0)}<div data-host></div>`, (sh, close) => {
      stateful(sh, [], st0, (st) => st === 'ok' ? `<div class="od-ob-wel">${U.ransom('SHARED', { h: 34, seed: 2 })}<b class="od-cut-big">分享好了</b><p>大家打开据点的公告板就能看到，可以给你贴标签打气。</p><div class="sh-acts">${U.btn('好', { tone: 'ink', seed: 801, attrs: 'data-act="x"' })}${U.btn('去公告板看看', { tone: 'red', size: 'lg', seed: 802, attrs: 'data-act="board"' })}</div></div>`
        : `<p class="sh-p">大家打开据点的公告板就能看到，可以给你贴标签打气。</p><div class="fld"><span>分享到</span><div class="od-chips">${chip(`★ ${ORG.name}`, true, 'data-solo')}</div></div><label class="fld"><span>说一句</span><input class="inp" data-say maxlength="40" placeholder="比如：跑完了第一个五公里" aria-label="分享的那一句"></label>
          <div class="fld"><span>大家会看到</span>${U.shp('div', { kind: 'quad', seed: 803, tone: 'ink', cls: 'od-share-pv' }, `<b>野鸡</b><small>刚刚</small><p data-pv>（写一句）</p>${U.tag('胆量 +2')}`)}</div>
          <p class="muted-d">${st === 'used' ? `今天在「${ORG.name}」已经分享了 3 条，明天再来。` : `今天还能在「${ORG.name}」分享 2 条。`}</p>
          <div class="sh-acts">${U.btn(st === 'used' ? '今天的 3 条用完了' : '分享', { tone: 'red', size: 'lg', seed: 804, attrs: `data-act="share" ${st === 'used' ? 'disabled' : ''}`, cls: st === 'used' ? 'od-dis' : '' })}</div>`,
      (h, st, draw) => { const i = h.querySelector('[data-say]'); if (i) i.oninput = () => h.querySelector('[data-pv]').textContent = i.value || '（写一句）';
        h.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b || b.disabled) return; if (b.dataset.act === 'share') { b.querySelector('span').textContent = '分享中…'; setTimeout(() => draw('ok'), 500); } if (b.dataset.act === 'x') close(); if (b.dataset.act === 'board') { close(); P5.go('hideout', { via: 'tear' }); } }); });
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
  function openHideoutMap(st0 = 'raid') {
    stage({ title: '据点地图', en: 'HIDEOUT', seed: 101, cls: 'od-hm-st', body: `${demoBar([['raid', '团战进行中'], ['down', '已击退'], ['calm', '无团战']], st0)}<div data-host></div><p class="od-note">据点分区：点分区跳到对应区块；点座位打开成员牌（可同调面具）。</p>`, onMount(w) {
      stateful(w, [], st0, (st) => `${st === 'calm' ? '' : `<button class="od-hm-raid" data-act="raid">${U.tag('满月团战')}<b>「暴食之影」${st === 'down' ? '已击退' : '还剩 62%，今晚你还没出手'}</b><small>点了打开团战面板 ›</small></button>`}
        <div class="od-hm" role="group" aria-label="据点分区"><svg class="od-hm-floor" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true"><polygon points="20,40 380,10 392,280 6,292" fill="#2a0306"/><polygon points="20,40 380,10 392,280 6,292" fill="url(#hmg)" opacity=".5"/><defs><pattern id="hmg" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)"><path d="M0 0H24M0 0V24" stroke="#F2E9DA" stroke-width=".6" opacity=".4"/></pattern></defs></svg>
          ${[['roster', '名册', 'ROSTER', 6, 8], ['board', '公告板', 'BOARD', 52, 6], ['meeting', '会议', 'MEETING', 8, 56], ['ops', '作战', 'OPS', 54, 54]].map(([k, n, en, x, y], i) => `<button class="od-hm-z" data-z="${k}" style="left:${x}%;top:${y}%;--r:${[-3, 2, 2.5, -2][i]}deg">${U.ransom(en, { h: 18, seed: 10 + i })}<b>${n}</b></button>`).join('')}
          </div><div class="od-hm-seats">${Array.from({ length: 8 }, (_, s) => { const m = ORG.members[s]; return `<button class="od-hm-seat ${m ? 'on' : ''} ${s === 0 ? 'me' : ''}" ${m ? `data-seat="${s}" aria-label="${s + 1} 号 ${m[0]}${s === 0 ? '（我）（队长）' : ''}：打开成员牌"` : `disabled aria-label="${s + 1} 号空座"`}><i>${s + 1}</i>${m ? `<b>${m[0]}</b>` : ''}${st === 'raid' && m && s < 3 ? '<em>击</em>' : ''}</button>`; }).join('')}</div>`,
      (h) => h.addEventListener('click', (e) => { if (e.target.closest('[data-act="raid"]')) return openRaid(st0 === 'down' ? 'down' : 'night'); const z = e.target.closest('[data-z]'); if (z) { if (z.dataset.z === 'meeting') return openMeeting(); if (z.dataset.z === 'ops') return openOpCreate(); P5.toast('跳到「' + z.querySelector('b').textContent + '」区'); } const s = e.target.closest('[data-seat]'); if (s) openBorrowMask(); }));
    } });
  }
  function openMeeting(st0 = 'open') {
    stage({ title: '周日会议', en: 'MEETING', seed: 103, sil: 'cat', body: `${demoBar([['before', '还没开'], ['open', '开会中'], ['submitted', '已交'], ['empty', '没人立目标']], st0)}<div data-host></div>`, onMount(w) {
      stateful(w, [], st0, (st) => {
        const goals = st === 'empty' ? '<p class="sh-p">这周还没人立目标。周日会上写一句吧。</p>' : `<div class="od-mt-gl">${[['我的', '每天背 30 个单词', true], ['坂本龙司', '跑三次 5 公里', true], ['高卷杏', '早睡 5 天', false], ['新岛真', '读完一本书', true]].map(([n, g, ok]) => `<div class="q-row"><span class="q-k">${n}</span><b>「${g}」</b>${U.tag(ok ? '做到了' : '还在路上', ok ? '' : 'ink')}</div>`).join('')}</div>`;
        return `${U.shp('section', { kind: 'torn', seed: 821, cls: 'od-mt' }, `<div class="od-mt-hd">${U.plate('周日会议', { fs: 17 })}${U.tag(st === 'before' ? '明天就开' : st === 'open' ? '开会中' : '开到周一凌晨 4 点', st === 'open' ? '' : 'ink')}</div>
          ${st === 'before' ? '<p class="sh-p">周日会议 · 明天就开（开到周一凌晨 4 点）。</p>' : st === 'submitted' ? `<p class="sh-p">你已经交了 · 下周目标：<b>「每天背 30 个单词」</b></p>${U.btn('改一改', { tone: 'ink', size: 'sm', seed: 822, attrs: 'data-act="edit"' })}`
          : `<p class="sh-p">这周的目标：<b>「每天背 20 个单词」</b>做到了吗？</p><div class="seg od-seg">${['做到了', '差一点', '没做到'].map((t, i) => `<button data-v="${i}" aria-pressed="${i === 0}">${t}</button>`).join('')}</div>
            <label class="fld"><span>下周想做到的一件事</span><input class="inp" placeholder="比如：每天背 30 个单词"></label><div class="sh-acts">${U.btn('取消', { tone: 'ink', seed: 823, attrs: 'data-act="cancel"' })}${U.btn('交上去', { tone: 'red', size: 'lg', seed: 824, attrs: 'data-act="submit"' })}</div>`}
          <p class="muted-d">会议时间按组织所在的时区（Asia/Shanghai）算。</p>`)}
          <section>${ttl('点名', '谁来了')}<div class="od-mt-roll">${ORG.members.map((m, i) => `<span class="${i < 3 || st === 'submitted' && i === 0 ? 'in' : ''}">${U.star(i < 3 ? 'var(--red)' : '#cfc6b6', 'var(--ink)')}<b>${m[0]}${i === 0 ? '（我）' : ''}</b></span>`).join('')}</div></section>
          <section>${ttl('这周大家的目标')}${goals}</section>
          <section>${ttl('上一次的会议纪要', md(addD(-((today.getDay()) || 7))))}${U.shp('div', { kind: 'quad', seed: 825, tone: 'ink', cls: 'od-mt-min' }, `<p>4 人到场 · 3 人做到了上周目标。</p><p>称号：${U.tag('本周出勤王')} 坂本龙司　${U.tag('言出必行 · 3 周')} 新岛真　${U.tag('月下同行')} 野鸡</p>`)}</section>`;
      }, (h, st, draw) => h.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act; if (a === 'submit') { b.querySelector('span').textContent = '提交中…'; setTimeout(() => { P5.toast('交上去了，下周见'); draw('submitted'); }, 500); } if (a === 'edit') draw('open'); if (a === 'cancel') P5.toast('已取消'); }));
    } });
  }

export const OD: any = { openOrgOnboard, openOrgSettings, openOrgTitles, openOpCreate, openRaid, openShareToOrg, openBorrowMask, openOrgCeleb, openHideoutMap, openMeeting, confirm, sheet, tarotFace, MAJ, ORG };
