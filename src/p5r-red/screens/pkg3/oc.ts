// @ts-nocheck —— 逐字迁移自 v3 原生 overlays/c.js（命令式 DOM，类名 .oc-*，样式 = legacy/css/c.css）。见 ./p5.ts 垫片说明。
import { P5 } from './p5';
import { RANKS } from '@/p5r-red/mock/data';
import { useAppStore } from '@/store';
import { matchConfidant } from '@/utils/confidantAI';
import { evaluateInteraction } from '@/utils/confidantAI';
import { aiConfigured } from '@/utils/aiClient';
/* ═══════════════════════════════════════════════════════════════════
   overlays/c.js — C 组「羁绊」全部弹层 / 演出（红主题 P5R 版）
   对应仓库 src/components/cooperation/*（红主题：*P5.tsx / confidantP5Fx.tsx / confidantP5Scenery.tsx /
   styles/confidant-*-p5.css / coop-p5-skin.css）。假数据，纯视觉 demo。
   类名前缀 .oc-；全屏层 z-index 840–895。
   演出只动 transform / opacity；P5.reduced() 时直达终态；手机档（≤640）减量。
   ═══════════════════════════════════════════════════════════════════ */
const U = P5.ui;
export const OC: any = {};
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const compact = () => innerWidth <= 640;
  const RD = () => P5.reduced();
  const EXP = 'cubic-bezier(.16,1,.3,1)', SLAM = 'cubic-bezier(.15,.95,.1,1)', OVER = 'cubic-bezier(.34,1.56,.64,1)', EASE2 = 'cubic-bezier(.65,0,.2,1)';
  const A = (el, kf, o = {}) => (el && el.animate ? el.animate(kf, Object.assign({ duration: 400, easing: EXP, fill: 'forwards' }, o)) : null);
  const star = (cx, cy, R, rot = -90, inner = .42) => P5.shape.starPts(cx, cy, R, rot, inner);

  /* ══════════ 假数据（字段对齐 ptd/src/types Confidant / CloudProfile / Notification / Pact / CoopShadow） ══════════ */
  const TAROT = [['FOOL', '0', 'THE FOOL', '愚者'], ['MAGICIAN', 'I', 'THE MAGICIAN', '魔术师'], ['PRIESTESS', 'II', 'THE PRIESTESS', '女教皇'], ['EMPRESS', 'III', 'THE EMPRESS', '女帝'], ['EMPEROR', 'IV', 'THE EMPEROR', '皇帝'], ['HIEROPHANT', 'V', 'THE HIEROPHANT', '教皇'], ['LOVERS', 'VI', 'THE LOVERS', '恋爱'], ['CHARIOT', 'VII', 'THE CHARIOT', '战车'], ['JUSTICE', 'VIII', 'JUSTICE', '正义'], ['HERMIT', 'IX', 'THE HERMIT', '隐者'], ['FORTUNE', 'X', 'FORTUNE', '命运'], ['STRENGTH', 'XI', 'STRENGTH', '力量'], ['HANGED', 'XII', 'THE HANGED MAN', '倒吊人'], ['DEATH', 'XIII', 'DEATH', '死神'], ['TEMPERANCE', 'XIV', 'TEMPERANCE', '节制'], ['DEVIL', 'XV', 'THE DEVIL', '恶魔'], ['TOWER', 'XVI', 'THE TOWER', '塔'], ['STAR', 'XVII', 'THE STAR', '星星'], ['MOON', 'XVIII', 'THE MOON', '月亮'], ['SUN', 'XIX', 'THE SUN', '太阳'], ['JUDGEMENT', 'XX', 'JUDGEMENT', '审判'], ['WORLD', 'XXI', 'THE WORLD', '世界']].map(([id, no, en, cn], i) => ({ id, no, en, cn, i }));
  const T = Object.fromEntries(TAROT.map((t) => [t.id, t]));
  const LBL = { 0: '初见', 1: '初识', 2: '熟面孔', 3: '伙伴', 4: '友人', 5: '挚友', 6: '知己', 7: '羁绊', 8: '共鸣', 9: '灵魂伙伴', 10: '圆满' };
  const ATTR_N = () => Object.fromEntries(P5.ATTR_ORDER.map((k) => [k, P5.ATTR[k].name]));
  const nextHint = (lv) => lv < 2 ? '到 Lv.2 解锁「Ta 的指引」：该属性每次加点乘区外 +1' : lv < 4 ? '到 Lv.4 解锁「Ta 的慰藉」：战斗中回复 5 点 HP（每 2 天一次）' : lv < 7 ? '到 Lv.7 解锁「Ta 的共鸣」：该属性技能永久 +1 固定伤害' : '到 Lv.10 达成圆满，所有能力增强并解锁 SP 回复';
  const BUFFS = [[2, 'Ta 的指引', '%A 每次加点乘区外 +1'], [4, 'Ta 的慰藉', '战斗中回复 5 点 HP（每 2 天一次）'], [7, 'Ta 的共鸣', '%A 技能永久 +1 固定伤害'], [10, '圆满', '所有能力增强并解锁 SP 回复']];
  const EXTRA = {
    CHARIOT: { attr: 'guts', pts: 63, base: 60, next: 75, charges: 1, interp: '正位 · 你们之间是一起往前冲的信任：Ta 替你挡下的东西，比 Ta 说出口的多。', advice: '下次换你先开口约 Ta —— 跑完步一起吃碗拉面就很好。' },
    LOVERS: { attr: 'charm', pts: 48, base: 45, next: 60, charges: 0, interp: '正位 · 选择与真诚。Ta 在人前张扬，对你却很坦白。', advice: '别只在 Ta 难过时出现。' },
    MAGICIAN: { attr: 'knowledge', pts: 88, base: 84, next: 100, charges: 2, interp: '正位 · 有主意的向导，嘴硬心软。', advice: '把计划说给 Ta 听，Ta 会给你更好的。' },
    PRIESTESS: { attr: 'knowledge', pts: 37, base: 33, next: 45, charges: 1, online: { userId: 'queen_makoto', nickname: '新岛真', lv: 31 }, interp: '正位 · 冷静与直觉。Ta 习惯一个人扛，但愿意听你分析。', advice: '约一次图书馆自习，再一起去吃可丽饼。' },
    HERMIT: { attr: 'dexterity', pts: 100, base: 96, next: 110, charges: 0, interp: '正位 · 从房间里走出来的那一步，你也在场。', advice: '耐心比热情更重要。' },
    EMPRESS: { attr: 'kindness', pts: 22, base: 21, next: 33, charges: 1, interp: '正位 · 丰饶与照料。Ta 的温柔需要被回应。', advice: '去屋顶菜园帮 Ta 浇一次水。' },
  };
  const buildCF = () => {
    const liveConfidants = useAppStore.getState().confidants.filter((c) => !c.archivedAt);
    return P5.D.confidants.map((c, i) => {
      const t = T[c.arcana] || TAROT[i], x = EXTRA[c.arcana] || EXTRA.CHARIOT;
      const live = liveConfidants[i];
      return {
        id: live?.id || 'cf' + i, realId: live?.id, name: c.name, arcanaId: live?.arcanaId || t.id, card: t, intimacy: c.rank, description: c.desc, orientation: live?.orientation || (i === 3 ? 'reversed' : 'upright'),
        aiInterpretation: live?.aiInterpretation || x.interp, aiAdvice: live?.aiAdvice || x.advice, skillAttribute: live?.skillAttribute || x.attr, intimacyPoints: live?.intimacyPoints ?? x.pts, base: x.base, next: x.next, starShiftCharges: live?.starShiftCharges ?? x.charges,
        source: live?.source || (x.online ? 'online' : 'offline'), linkedProfile: live?.linkedProfile || x.online || null, decayEnabled: live?.decayEnabled ?? (i % 2 === 0), archivedAt: live?.archivedAt || null,
        buffs: BUFFS.filter((b) => b[0] <= c.rank).map(([lv, t1, d]) => ({ id: 'b' + lv, unlockAtLevel: lv, title: t1, description: d.replace('%A', P5.ATTR[x.attr].name) })),
        memorials: live?.coopMemorials?.map((m) => ({ shadowName: m.shadowName, weak: m.weaknessAttribute, date: String(m.defeatedAt).slice(0, 10), contribution: 0 })) || (x.online ? [{ shadowName: '嫉妒之影 · 双面镜', weak: 'kindness', date: '2026-10-11', contribution: 58 }, { shadowName: '怠惰之影 · 沉睡钟', weak: 'guts', date: '2026-09-27', contribution: 44 }] : []),
      };
    });
  };
  const CF = buildCF();
  OC.CF = CF;
  const DEMO_EVENTS = [
    { date: '10-20', type: 'conversation', delta: 2, userInput: '下午一起去了涩谷的拉面店，Ta 说想重新回田径部看看。', narrative: '战车正位：被搁置的目标重新亮起，你是那个陪 Ta 回头看的人。', advice: '下次陪 Ta 去操场跑一圈。' },
    { date: '10-17', type: 'level_up', delta: 0, narrative: '羁绊等级提升至 Lv.6 · 知己' },
    { date: '10-15', type: 'conversation', delta: 1, userInput: '帮 Ta 补了数学作业。', narrative: '默默的照顾也算一种前进。', advice: '' },
    { date: '10-09', type: 'buff_unlocked', delta: 0, narrative: '解锁「Ta 的慰藉」' },
    { date: '10-03', type: 'decay', delta: -1, narrative: '3 天无互动，逆流 −1' },
    { date: '09-12', type: 'created', delta: 0, narrative: '初识 · 塔罗选择了《战车》' },
  ];
  const EV_LBL = { created: '初识', intimacy_up: '增进', intimacy_down: '波折', level_up: '升级', buff_unlocked: '解锁能力', conversation: '互动', item_used: '战斗援助', archived: '归档', decay: '逆流', bound: '绑定', unbound: '解绑' };

  /* ══════════ 层栈：Esc 关最上层；z 自增 ══════════ */
  const stack = [];
  let zTop = 840;
  const pushLayer = (close) => { stack.push(close); return ++zTop > 858 ? (zTop = 858) : zTop; };
  const popLayer = (close) => { const i = stack.lastIndexOf(close); if (i >= 0) stack.splice(i, 1); if (!stack.length) zTop = 840; };
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && stack.length) { e.stopPropagation(); stack[stack.length - 1](); } });

  /** demo 状态切换条（只为演示空 / 加载 / 报错等状态；真实 app 里不存在） */
  const demoBar = (states, cur) => `<div class="oc-demo" data-demo-bar><b>DEMO 状态</b>${states.map(([k, l]) => `<button type="button" data-demo="${k}" aria-pressed="${k === cur}">${l}</button>`).join('')}</div>`;

  /**
   * 通用对话框（红主题：红网点遮罩 + 撕边纸卡 + 斜标题牌 + 红闸门擦入 + spring 弹入）
   * opts: { eyebrow, title, sub, tone:'paper'|'ink', size:'s'|'m'|'l', seed, demo:[[k,l]], demoCur, onDemo(k), on:{action:fn}, back:fn, closable, closeOnVeil }
   * 返回 api { el, dlg, body, foot, set(bodyHTML, footHTML, anim), head(sub), close }
   */
  function dialog(o) {
    const veil = document.createElement('div');
    veil.className = 'oc-veil';
    const seed = o.seed || 71;
    veil.innerHTML = (o.demo ? demoBar(o.demo, o.demoCur) : '') + U.shp('section', { cls: `oc-dlg oc-${o.size || 'm'} ${o.cls || ''}`, kind: 'torn', seed, tone: o.tone || 'paper', attrs: `role="dialog" aria-modal="true" aria-label="${esc(o.aria || o.title)}"` },
      `<header class="oc-hd">${o.back ? '<button type="button" class="oc-back" data-a="__back" aria-label="返回上一步">‹</button>' : ''}<div class="oc-ttl">${o.eyebrow ? `<span class="oc-eb">${o.eyebrow}</span>` : ''}<h3>${U.plate(o.title, { fs: o.size === 's' ? 18 : 21 })}</h3><p class="oc-sub">${o.sub || ''}</p></div>${o.closable === false ? '' : '<button type="button" class="oc-x" data-a="__close" aria-label="关闭">✕</button>'}</header>
       <div class="oc-bd"></div><footer class="oc-ft"></footer>`);
    document.body.appendChild(veil);
    const dlg = veil.querySelector('.oc-dlg'), body = dlg.querySelector('.oc-bd'), foot = dlg.querySelector('.oc-ft');
    let closed = false;
    const close = () => {
      if (closed) return; closed = true; popLayer(close); o.onClose && o.onClose();
      veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'both' });
      dlg.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(50px) rotate(2deg)', opacity: 0 }], { duration: 200, fill: 'both' }).onfinish = () => veil.remove();
    };
    veil.style.zIndex = pushLayer(close);
    const api = {
      el: veil, dlg, body, foot, close,
      set(b, f, anim = true) {
        if (b != null) body.innerHTML = b;
        if (f != null) { foot.innerHTML = f; foot.hidden = !f; }
        body.scrollTop = 0;
        if (anim) P5.panelIn(body.children, { from: 'right', stagger: .04 });
        if (anim && f) P5.panelIn(foot.children, { from: 'up', stagger: .05, delay: .08 });
      },
      head(sub, title) { if (sub != null) dlg.querySelector('.oc-sub').innerHTML = sub; if (title != null) dlg.querySelector('.plate > span').textContent = title; },
      hideClose(h) { const x = dlg.querySelector('.oc-x'); if (x) x.style.visibility = h ? 'hidden' : ''; },
    };
    veil.addEventListener('click', (e) => {
      const d = e.target.closest('[data-demo]');
      if (d) { veil.querySelectorAll('[data-demo]').forEach((b) => b.setAttribute('aria-pressed', b === d)); o.onDemo && o.onDemo(d.dataset.demo, api); return; }
      if (e.target === veil && o.closeOnVeil !== false && !api.locked) return close();
      const t = e.target.closest('[data-a]'); if (!t || !veil.contains(t) || t.disabled) return;
      const a = t.dataset.a;
      if (a === '__close') return close();
      if (a === '__back') return o.back && o.back(api);
      o.on && o.on[a] && o.on[a](t, e, api);
    });
    veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: 'both' });
    if (!RD()) {
      const gate = document.createElement('i'); gate.className = 'oc-gate'; veil.appendChild(gate);
      gate.animate([{ transform: 'translateX(-120%)' }, { transform: 'translateX(130%)' }], { duration: 560, easing: 'cubic-bezier(.72,0,.28,1)', fill: 'both' }).onfinish = () => gate.remove();
      dlg.style.transform = 'translateY(110%)';
      P5.spring({ stiffness: 300, damping: 26, delay: .12, onUpdate: (p) => { dlg.style.transform = `translateY(${P5.lerp(110, 0, p)}%) rotate(${P5.lerp(-4, 0, p)}deg)`; }, onDone: () => { dlg.style.transform = ''; } });
    }
    if (o.body != null) api.set(o.body, o.foot || '', false);
    else foot.hidden = true;
    o.onMount && o.onMount(api);
    return api;
  }
  OC.dialog = dialog;

  /** 二次确认（P5R：小纸卡 + 红危险键） */
  function confirmDlg({ title, text = '', list, ok = '确认', okTone = 'red', cancel = '再想想', onOk, eyebrow = 'CONFIRM' }) {
    const d = dialog({ size: 's', eyebrow, title, seed: 83, body: `${text ? `<p class="oc-p">${text}</p>` : ''}${list ? `<ul class="oc-ul">${list.map((l) => `<li>${l}</li>`).join('')}</ul>` : ''}`,
      foot: U.btn(cancel, { tone: 'paper', seed: 84, attrs: 'data-a="no"' }) + U.btn(ok, { tone: okTone, seed: 85, attrs: 'data-a="ok"' }),
      on: { no: (t, e, api) => api.close(), ok: (t, e, api) => { api.close(); onOk && onOk(); } } });
    return d;
  }
  OC.confirm = confirmDlg;

  /* ══════════ 塔罗牌面 = 素材槽 slots/tarot/p5/<真实文件名>.webp（用户决定 2026-10-21：羁绊也读素材槽，同名覆盖即换真图）
   *  视觉框架不变：外框 .oc-tc（宽 --w、100:156、硬投影）原样；牌面图 object-fit: cover 填满（5:8 真图上下各裁约 1%）。逆位 = 旋转 180°。 ══════════ */
  const TAROT_FILE = { FOOL: 'fool', MAGICIAN: 'magician', PRIESTESS: 'high_priestess', EMPRESS: 'empress', EMPEROR: 'emperor', HIEROPHANT: 'hierophant', LOVERS: 'lovers', CHARIOT: 'chariot', JUSTICE: 'justice', HERMIT: 'hermit', FORTUNE: 'wheel_of_fortune', STRENGTH: 'strength', HANGED: 'hanged_man', DEATH: 'death', TEMPERANCE: 'temperance', DEVIL: 'devil', TOWER: 'tower', STAR: 'star', MOON: 'moon', SUN: 'sun', JUDGEMENT: 'judgement', WORLD: 'world' };
  const tarotSrc = (id) => `slots/tarot/p5/${TAROT_FILE[id] || 'fool'}.webp`;
  OC.tarotSrc = tarotSrc;
  function cardSVG(t, { rev = false } = {}) {
    return `<img class="oc-tc-img" src="${tarotSrc(t.id)}" alt="" aria-hidden="true" draggable="false" decoding="async"${rev ? ' style="transform:rotate(180deg)"' : ''}>`;
  }
  const backSVG = () => `<svg viewBox="0 0 100 156" aria-hidden="true"><rect width="100" height="156" fill="#D7000F"/><rect x="4" y="4" width="92" height="148" fill="none" stroke="#F2E9DA" stroke-width="2.5"/><rect x="8.5" y="8.5" width="83" height="139" fill="none" stroke="#000" stroke-width="1.4" opacity=".55"/><path d="M50 38 L58.5 78 L50 118 L41.5 78 Z" fill="#F2E9DA"/><path d="M10 78 L50 69.5 L90 78 L50 86.5 Z" fill="#F2E9DA"/><circle cx="50" cy="78" r="6.4" fill="#D7000F" stroke="#000" stroke-width="2"/><text x="50" y="146.5" text-anchor="middle" font-size="7.6" font-weight="900" fill="#F2E9DA" letter-spacing="2.2" font-family="Noto Sans SC Black, sans-serif">MASKARIA</text></svg>`;
  const cardHTML = (t, w = 84, { rev, cls = '' } = {}) => `<span class="oc-tc ${cls}" style="--w:${w}px">${cardSVG(t, { rev })}</span>`;
  OC.cardHTML = cardHTML;

  /* ══════════ 羁绊链布景（confidantP5Scenery：同心星 / 散落描边星 / 圆环 / 网点 / 暗角） —— 红版：星带改红系为主，黑只做细环 ══════════ */
  const BANDS = ['#8E0010', '#D7000F', '#a3000e', '#D7000F', '#6d0009', '#c2000e', '#2a0003', '#D7000F', '#8E0010'];
  const ringLayers = (max) => { let R = 100, i = 0, s = ''; while (R > .6 && (!max || i < max)) { s += `<polygon points="${star(100, 100, R, -90 + i * 1.6)}" fill="${BANDS[i % BANDS.length]}"/>`; R *= .912; i++; } return s; };
  const SCATTER = [[-14, '12%', 96, -16, '#2a0003'], [-10, '16%', 70, 14, '#F2E9DA'], [6, '10%', 58, -8, '#F2E9DA'], [10, '26%', 80, 20, '#111'], [-16, '30%', 64, -22, '#F2E9DA']];
  const scatterHTML = () => SCATTER.map(([x, y, s, rot, c], i) => `<svg viewBox="0 0 200 200" style="${i % 2 ? `right:${x}px` : `left:${x}px`};${i < 3 ? 'top' : 'bottom'}:${y};width:${s}px;height:${s}px"><polygon points="${star(100, 100, 88, rot)}" fill="none" stroke="${c}" stroke-width="9"/></svg>`).join('');
  const hoopsHTML = () => `<i style="left:-78px;top:8%;width:200px;height:200px;border:14px solid #5c0004"></i><i style="left:-28px;top:calc(8% + 52px);width:108px;height:108px;border:11px solid #F2E9DA"></i><i style="right:-64px;bottom:11%;width:172px;height:172px;border:13px solid #111"></i><i style="right:-18px;bottom:calc(11% + 46px);width:84px;height:84px;border:9px solid #5c0004"></i>`;
  const scenery = (pre = 'oc-sc', { rings = true, still = false } = {}) => `<div class="${pre}" aria-hidden="true">
      <div class="oc-sc-half"></div>
      ${rings ? `<div class="oc-sc-rings${still ? ' still' : ''}"><svg viewBox="0 0 200 200">${ringLayers(compact() ? 24 : 0)}</svg></div>` : ''}
      <div class="oc-sc-slab a"></div><div class="oc-sc-slab b"></div>
      <div class="oc-sc-hoops">${hoopsHTML()}</div>
      <div class="oc-sc-stars${still ? ' still' : ''}">${scatterHTML()}</div><div class="oc-sc-vig"></div></div>`;
  OC.scenery = scenery;

  /* ══════════ 转场四件套（confidantP5Fx.runP5Sweep）：红斜杠 + 巨字横掠 + 白闪 + 点击点双圆环；180ms 执行 apply ══════════ */
  let swBusy = false;
  function sweep(word, apply, origin, dir = 1) {
    if (swBusy || RD()) { apply(); return; }
    swBusy = true;
    const vw = innerWidth, vh = innerHeight, o = origin && (origin.x || origin.y) ? origin : { x: vw / 2, y: vh / 2 };
    const sw = document.createElement('div'); sw.className = 'oc-sw'; sw.setAttribute('aria-hidden', 'true');
    sw.innerHTML = `<i class="sl"></i><span class="wd">${word}</span><span class="rg" style="left:${o.x}px;top:${o.y}px"><i></i><i></i></span><i class="fl"></i>`;
    document.body.appendChild(sw);
    A(sw.querySelector('.sl'), [{ transform: 'translateX(-160px) skewX(-14deg)' }, { transform: `translateX(${vw + 160}px) skewX(-14deg)` }], { duration: 560, easing: 'cubic-bezier(.7,0,.2,1)' });
    A(sw.querySelector('.fl'), [{ opacity: 0 }, { opacity: .5, offset: .3 }, { opacity: 0 }], { duration: 320 });
    const wd = sw.querySelector('.wd'), tw = wd.offsetWidth || vw;
    A(wd, [{ transform: `translateX(${dir > 0 ? vw + 20 : -tw - 60}px)` }, { transform: `translateX(${dir > 0 ? -tw - 60 : vw + 20}px)` }], { duration: 1050, easing: 'cubic-bezier(.45,0,.2,1)' });
    const n = (Math.max(vw, vh) / 40) * 2.4;
    sw.querySelectorAll('.rg i').forEach((r, k) => A(r, [{ opacity: .9, transform: 'scale(0)' }, { opacity: 0, transform: `scale(${k ? n * .85 : n})` }], { delay: (dir > 0 ? 280 : 380) + k * 110, duration: 760, easing: EASE2 }));
    setTimeout(apply, 180);
    setTimeout(() => { swBusy = false; sw.remove(); }, 1100);
  }
  OC.sweep = sweep;
  const originOf = (e, el) => { const r = (el || e.currentTarget || e.target).getBoundingClientRect(); return { x: e.clientX || r.left + r.width / 2, y: e.clientY || r.top + r.height / 2 }; };
  /** 圆形揭示 → 本 demo 只用 opacity + 缩放回弹（遵守「只动 transform/opacity」；app 手机档也是纯透明度） */
  const revealIn = (el, inner) => { if (RD()) return; A(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: EASE2, fill: 'backwards' }); inner && A(inner, [{ transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 760, easing: EASE2, fill: 'none' }); };
  const popIn = (els, dir = 1) => { if (RD()) return; [...els].forEach((el, k) => A(el, [{ opacity: 0, transform: `translateX(${dir * 60}px) skewX(-10deg)` }, { opacity: 1, transform: 'none' }], { delay: 380 + k * 90, duration: 540, easing: OVER, fill: 'backwards' })); };

  /* ══════════ 主角牌 #hero（跨界面存活：待命 app / 演出 show / 恭喜 page2 / 星移 page3） ══════════ */
  let hero = null, heroClaims = 0, heroPose = 'hidden', heroHideT = 0;
  function heroEl() {
    if (hero) return hero;
    hero = document.createElement('div'); hero.className = 'oc-hero'; hero.setAttribute('aria-hidden', 'true');
    hero.innerHTML = `<div class="halo"></div><div class="bob"><div class="h3d"><div class="face"><div class="art"></div><span class="glint"></span></div><div class="back">${backSVG()}</div></div></div>`;
    hero.style.display = 'none'; document.body.appendChild(hero);
    addEventListener('resize', () => heroPose !== 'hidden' && poseHero(heroPose, true));
    return hero;
  }
  const heroArt = (t) => { heroEl().querySelector('.art').innerHTML = cardSVG(t); };
  function poseTarget(name) {
    const h = heroEl(), vw = innerWidth, vh = innerHeight, cw = h.offsetWidth || 220, ch = h.offsetHeight || 355, mob = vw <= 640;
    if (name === 'app') return mob ? { x: vw - 30, y: vh * .7 - ch / 2, rot: -13, flip: true, s: 1 } : { x: vw - cw * .62, y: vh * .56 - ch / 2, rot: -13, flip: true, s: 1 };
    if (name === 'show') { const r = document.querySelector('[data-oc-slot="stage"]')?.getBoundingClientRect(); return r ? { x: r.left - (mob ? 0 : vw * .03), y: r.top, rot: mob ? -6 : -11, flip: false, s: 1 } : { x: vw / 2 - cw / 2, y: vh * .3 - ch / 2, rot: -11, flip: false, s: 1 }; }
    if (mob) { const s = .4; return name === 'page2' ? { x: vw - cw * s - 10 - cw * (1 - s) / 2, y: 12 - ch * (1 - s) / 2, rot: 7, flip: false, s } : { x: vw - cw * s - 6 - cw * (1 - s) / 2, y: 8 - ch * (1 - s) / 2, rot: -9, flip: true, s }; }
    const an = document.querySelector(`[data-oc-anchor="${name}"]`)?.getBoundingClientRect();
    if (name === 'page2') { const ml = an ? an.left : vw * .1; return { x: ml - cw > 26 ? (ml - cw) / 2 : 14 - cw, y: vh * .32 - ch / 2, rot: 7, flip: false, s: 1 }; }
    const mr = an ? vw - an.right : vw * .1; return { x: mr - cw > 26 ? vw - mr / 2 - cw / 2 : vw - 14, y: vh * .58 - ch / 2, rot: -9, flip: true, s: 1 };
  }
  function poseHero(name, instant) {
    const h = heroEl(), h3 = h.querySelector('.h3d');
    if (name === 'hidden') { heroPose = 'hidden'; h.style.display = 'none'; return; }
    h.style.display = 'block';
    h.getAnimations().forEach((a) => a.cancel()); h3.getAnimations().forEach((a) => a.cancel());
    const from = heroPose; heroPose = name;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const t = poseTarget(name), tf = `translate(${t.x}px,${t.y}px) rotate(${t.rot}deg) scale(${t.s})`, ff = `rotateY(${t.flip ? 180 : 0}deg)`;
      if (instant || RD()) { h.style.transform = tf; h3.style.transform = ff; return; }
      if (name === 'app' && from === 'hidden') { h.style.transform = tf; h3.style.transform = ff; A(h, [{ transform: `translate(${t.x}px,${t.y - innerHeight}px) rotate(320deg)` }, { transform: tf }], { duration: 1600, easing: 'cubic-bezier(.2,.9,.25,1.1)', fill: 'none' }); return; }
      const a = A(h, [{ transform: h.style.transform || tf }, { transform: tf }], { duration: 900, easing: 'cubic-bezier(.34,1.3,.5,1)' });
      const b = A(h3, [{ transform: h3.style.transform || ff }, { transform: ff }], { duration: 780, easing: 'cubic-bezier(.34,1.2,.5,1)' });
      a.onfinish = () => { h.style.transform = tf; a.cancel(); }; b.onfinish = () => { h3.style.transform = ff; b.cancel(); };
    }));
  }
  const claimHero = (t) => { heroClaims++; clearTimeout(heroHideT); heroArt(t); let done = false; return () => { if (done) return; done = true; heroClaims = Math.max(0, heroClaims - 1); if (!heroClaims) heroHideT = setTimeout(() => !heroClaims && poseHero('hidden'), 600); }; };
  const heroBeat = () => {
    const h = heroEl();
    if (RD()) { h.querySelector('.halo').style.opacity = .6; return; }
    A(h.querySelector('.halo'), [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.4)' }, { opacity: .85, transform: 'translate(-50%,-50%) scale(1)', offset: .55 }, { opacity: .5, transform: 'translate(-50%,-50%) scale(1.12)' }], { duration: 1500, delay: 240 });
    A(h.querySelector('.face'), [{ transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: 320, delay: 420, easing: OVER });
    A(h.querySelector('.glint'), [{ opacity: 0, transform: 'translateX(-140%) skewX(-18deg)' }, { opacity: 1, transform: 'translateX(-10%) skewX(-18deg)', offset: .5 }, { opacity: 0, transform: 'translateX(140%) skewX(-18deg)' }], { duration: 880, delay: 1220, easing: 'linear' });
  };
  const heroHalo = (on) => { const h = heroEl().querySelector('.halo'); h.getAnimations().forEach((a) => a.cancel()); h.style.opacity = on ? '' : 0; };

  /* ══════════ ConfidantRankUpCutInP5 —— 羁绊 RANK UP 演出（时间线逐段照 P5 原实现 ①→⑩） ══════════
     入场：主角牌坠到右缘待命(背面) → 转场 COOPERATION → 舞台显形 + cast 1.13→1 + 牌飞到演出位翻面 → 260ms 开演
     ① 0     同心星定场 850 / 星涟漪 ×3（i*240）/ 集中线 1500(d180) / 斜带 A 760(d80) B 700(d220)
     ② 0     牌：光晕 d240 · 落地顿挫 d420 · 高光扫过 d1220
     ③ 1560  命运行（罗马数字 + 牌名 + 中文）
     ④ 2100  旧级 RANK n 浮出
     ⑤ 2880  盖印砸下 560 SLAM（RANK UP · 羁绊提升）
     ⑥ 3000  旧级炸散 + 剪报碎片 36/16 + 散落星入场闪烁；3220 冲击框 + 椭圆波 + 火星 24/10
     ⑦ 3300  新级 RANK n+1 砸落（2.6→1.16→.94→1.03→1）+ 星芒；3470 RANK 星逐颗点亮（10 格）
     ⑧ 4050  誓约带「汝即我，我即汝」  ⑨ 4650 受领胶囊（解锁能力 · 星移 +1）  ⑩ 5250 确认区（不自动划走）
     确认 → 转场 INTIMACY UP → 恭喜页。Esc 任何时刻跳过。 */
  function rankUp(cf = CF[0], { oldLevel, newLevel, starShiftGained = 1, onDone } = {}) {
    oldLevel = oldLevel != null ? oldLevel : cf.intimacy; newLevel = newLevel != null ? newLevel : Math.min(10, oldLevel + 1);
    const t = cf.card, cmp = compact(), red = RD();
    const unlocked = BUFFS.filter((b) => b[0] > oldLevel && b[0] <= newLevel).map((b) => b[1]);
    const R = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('');
    const rr = P5.rng(1500);
    const root = document.createElement('div'); root.className = 'oc-rk'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', `羁绊升级！${cf.name} 亲密度 RANK ${newLevel}`);
    root.innerHTML = `
      <div class="oc-sc-half"></div>
      <div class="rk-rings"><svg viewBox="0 0 200 200">${ringLayers(cmp ? 24 : 0)}</svg></div>
      <div class="rk-ripples">${R(3, (i) => `<svg viewBox="0 0 200 200"><polygon points="${star(100, 100, 90, -90 + i * 12)}" fill="none" stroke="#2a0003" stroke-width="6"/></svg>`)}</div>
      <div class="oc-sc-hoops">${hoopsHTML()}</div>
      <div class="rk-collect">${R(cmp ? 14 : 28, (i) => `<i style="transform:rotate(${(i * 360 / (cmp ? 14 : 28)).toFixed(1)}deg)"></i>`)}</div>
      <div class="oc-sc-slab a rk-slab-a"></div><div class="oc-sc-slab b rk-slab-b"></div>
      <div class="oc-sc-stars rk-stars">${scatterHTML()}</div>
      <div class="oc-sc-vig"></div>
      <div class="rk-cast">
        <div class="rk-slot" data-oc-slot="stage"></div>
        <div class="rk-arcana"><span class="num">${t.no}</span><span class="name">${t.en}</span><span class="cn">${t.cn} · ${esc(cf.name)}</span></div>
        <div class="rk-zone">
          <span class="rk-rank old">RANK ${oldLevel}</span><span class="rk-rank new">RANK <b>${newLevel}</b></span>
          <div class="rk-stamp"><i class="sh"></i><i class="pl"></i><span class="tx">RANK UP</span><em class="sub">羁绊提升</em></div>
          <div class="rk-shock"></div><div class="rk-wave"></div>
          <div class="rk-sparks">${R(cmp ? 10 : 24, () => { const a = Math.random() * 6.283, x0 = Math.cos(a) * (60 + Math.random() * 152), y0 = Math.sin(a) * (17 + Math.random() * 46), f = 26 + Math.random() * 58, s = 2 + Math.random() * 4; return `<i data-k="${x0.toFixed(1)},${y0.toFixed(1)},${(x0 + Math.cos(a) * f).toFixed(1)},${(y0 + Math.sin(a) * f).toFixed(1)}" style="width:${s.toFixed(1)}px;height:${s.toFixed(1)}px;background:${Math.random() < .7 ? '#F2E9DA' : '#111'}"></i>`; })}</div>
          <div class="rk-burst">${R(cmp ? 14 : 28, (i) => `<i style="transform:rotate(${(i * 360 / (cmp ? 14 : 28)).toFixed(1)}deg);height:${(112 + Math.random() * 96).toFixed(0)}px"></i>`)}</div>
        </div>
        <div class="rk-stars10" aria-label="RANK ${newLevel} / 10">${R(10, (i) => `<svg viewBox="0 0 200 200" class="${i < newLevel ? 'on' : ''}${i === newLevel - 1 ? ' last' : ''}${i < oldLevel ? ' had' : ''}" style="transform:rotate(${i % 2 ? -3.5 : 2.5}deg)"><polygon points="${star(100, 100, 80, -90, .44)}" fill="#111" transform="translate(9 10)"/><polygon class="pf" points="${star(100, 100, 80, -90, .44)}" stroke="#111" stroke-width="13" stroke-linejoin="round"/></svg>`)}</div>
        <div class="rk-shards">${R(cmp ? 16 : 36, (i) => { const j = () => ((rr() * 2 - 1) * 24), c = (v) => Math.max(0, Math.min(100, v)).toFixed(1); return `<i data-k="${(rr() * 26 - 13).toFixed(1)}vw,${(rr() * 22 - 4).toFixed(1)}vh,${(rr() * 180).toFixed(0)}deg" style="width:${(9 + rr() * 28).toFixed(0)}px;height:${(7 + rr() * 17).toFixed(0)}px;background:${['#111', '#F2E9DA', '#8E0010'][i % 3]};clip-path:polygon(${c(j())}% ${c(j())}%,${c(100 - j())}% ${c(j())}%,${c(100 - j())}% ${c(100 - j())}%,${c(j())}% ${c(100 - j())}%)"></i>`; })}</div>
        <div class="rk-vow"><p>汝即我，我即汝 —— <b>汝已缔结新的誓约</b></p></div>
        <div class="rk-unlock"><i>✦</i><span>${unlocked.length ? `解锁 ${unlocked.join('、')}` : '羁绊加深'} · 星移 +${starShiftGained}</span></div>
      </div>
      <div class="rk-confirm"><span class="hint">羁绊等级提升</span><button type="button" class="go">确 认</button></div>`;
    root.style.display = 'none';
    document.body.appendChild(root);
    const $ = (s) => root.querySelector(s), $$ = (s) => root.querySelectorAll(s);
    const timers = []; const TT = (ms, fn) => timers.push(setTimeout(fn, ms));
    const release = claimHero(t);
    let closed = false;
    const end = () => { if (closed) return; closed = true; timers.forEach(clearTimeout); popLayer(skip); heroHalo(false); root.remove(); release(); };
    const skip = () => { end(); poseHero('hidden'); };
    pushLayer(skip); root.style.zIndex = 862;
    P5.sfx('level', .5);
    poseHero('app', true);
    const play = () => {
      if (red) {
        [...$$('.rk-arcana,.rk-rank.new,.rk-vow,.rk-unlock,.rk-rings,.oc-sc-slab,.rk-confirm')].forEach((e) => e.style.opacity = 1);
        $$('.rk-stars10 svg').forEach((s) => s.style.opacity = 1); $('.rk-confirm').classList.add('on'); return;
      }
      A($('.rk-rings'), [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.42) rotate(-22deg)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1) rotate(-9deg)' }], { duration: 850, delay: 60 });
      $$('.rk-ripples svg').forEach((s, i) => A(s, [{ opacity: .9, transform: 'scale(.32) rotate(-14deg)' }, { opacity: 0, transform: 'scale(1.5) rotate(-2deg)' }], { duration: 820, delay: i * 240 }));
      A($('.rk-collect'), [{ opacity: 0, transform: 'scale(.1) rotate(-18deg)' }, { opacity: 1, transform: 'scale(1) rotate(0)', offset: .4 }, { opacity: 0, transform: 'scale(1) rotate(0)' }], { duration: 1500, delay: 180 });
      A($('.rk-slab-a'), [{ opacity: 0, transform: 'scale(1.5) rotate(-8deg)' }, { opacity: 1, transform: 'scale(1) rotate(-3deg)' }], { duration: 760, delay: 80 });
      A($('.rk-slab-b'), [{ opacity: 0, transform: 'translateX(-44px) rotate(-1.4deg)' }, { opacity: 1, transform: 'translateX(0) rotate(-1.4deg)' }], { duration: 700, delay: 220 });
      heroBeat();
      TT(1560, () => A($('.rk-arcana'), [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: 520 }));
      TT(2100, () => A($('.rk-rank.old'), [{ opacity: 0, transform: 'translateY(22px)' }, { opacity: .95, transform: 'none' }], { duration: 460 }));
      TT(2880, () => A($('.rk-stamp'), [{ opacity: 0, transform: 'translate(-50%,-210%) rotate(-19deg) scale(1.5)' }, { opacity: 1, transform: 'translate(-50%,-50%) rotate(-4deg) scale(1)', offset: .58 }, { opacity: 1, transform: 'translate(-50%,-46%) rotate(-2.4deg) scale(.985)', offset: .72 }, { opacity: 1, transform: 'translate(-50%,-52%) rotate(-3deg) scale(1)' }], { duration: 560, easing: SLAM }));
      TT(3000, () => {
        A($('.rk-rank.old'), [{ opacity: .95, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.28)' }], { duration: 320, easing: 'ease-out' });
        $$('.rk-shards i').forEach((g) => { const [dx, dy, r] = g.dataset.k.split(','); A(g, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.35)' }, { opacity: .95, transform: 'translate(-50%,-50%) scale(1)', offset: .22 }, { opacity: 0, transform: `translate(calc(-50% + ${dx}),calc(-50% + ${dy})) scale(.7) rotate(${r})` }], { delay: Math.random() * 110, duration: 1250, easing: 'cubic-bezier(.2,.7,.3,1)' }); });
        A($('.rk-stamp'), [{ opacity: 1 }, { opacity: 1, offset: .62 }, { opacity: 0 }], { duration: 520, delay: 150, easing: 'ease-out' });
        $$('.rk-stars svg').forEach((s, i) => { A(s, [{ opacity: 0, transform: 'scale(0) rotate(-90deg)' }, { opacity: 1, transform: 'none' }], { delay: 60 + i * 70, duration: 420, easing: OVER }); if (!cmp) A(s, [{ opacity: 1 }, { opacity: .35 }, { opacity: 1 }], { delay: 700 + i * 70, duration: 1400, iterations: 2, easing: 'ease-in-out' }); });
      });
      TT(3220, () => {
        A($('.rk-shock'), [{ opacity: .92, transform: 'translate(-50%,-50%) scale(.68) rotate(-3deg)' }, { opacity: 0, transform: 'translate(-50%,-50%) scale(2.1) rotate(-5.5deg)' }], { duration: 620, easing: SLAM });
        A($('.rk-wave'), [{ opacity: .72, transform: 'translate(-50%,-50%) scale(.42)' }, { opacity: 0, transform: 'translate(-50%,-50%) scale(2.5)' }], { duration: 760, delay: 40, easing: 'cubic-bezier(.12,.9,.2,1)' });
        $$('.rk-sparks i').forEach((s) => { const [x0, y0, x1, y1] = s.dataset.k.split(','); A(s, [{ opacity: 0, transform: `translate(${x0}px,${y0}px) scale(.4)` }, { opacity: 1, transform: `translate(${x0}px,${y0}px) scale(1)`, offset: .14 }, { opacity: 0, transform: `translate(${x1}px,${y1}px) scale(.32)` }], { duration: 520 + Math.random() * 440, easing: 'cubic-bezier(.18,.72,.3,1)', delay: Math.random() * 80 }); });
      });
      TT(3300, () => {
        A($('.rk-rank.new'), [{ opacity: 0, transform: 'scale(2.6)' }, { opacity: 1, transform: 'scale(1.16)', offset: .42 }, { opacity: 1, transform: 'scale(.94)', offset: .62 }, { opacity: 1, transform: 'scale(1.03)', offset: .8 }, { opacity: 1, transform: 'scale(1)' }], { duration: 640, easing: SLAM });
        A($('.rk-burst'), [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.2)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: .35 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.35)' }], { duration: 760 });
        root.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-8px,5px)' }, { transform: 'translate(7px,-4px)' }, { transform: 'translate(-4px,3px)' }, { transform: 'translate(2px,-1px)' }, { transform: 'none' }], { duration: 360, delay: 120 });
      });
      // ⑦·2 RANK 星：已有的星先依次「落定」，新点亮的那颗最后单独砸下 + 白闪（P5R 逐颗点亮）
      TT(3470, () => {
        const ss = [...$$('.rk-stars10 svg')];
        ss.forEach((s, i) => {
          const isNew = i >= oldLevel && i < newLevel;
          if (isNew) s.classList.remove('on');
          A(s, [{ opacity: 0, transform: `scale(2.4) rotate(${i % 2 ? -3.5 : 2.5}deg)` }, { opacity: 1, transform: `scale(1.12) rotate(${i % 2 ? -3.5 : 2.5}deg)`, offset: .55 }, { opacity: 1, transform: `scale(.94) rotate(${i % 2 ? -3.5 : 2.5}deg)`, offset: .76 }, { opacity: 1, transform: `scale(1) rotate(${i % 2 ? -3.5 : 2.5}deg)` }], { delay: i * 60, duration: 300, easing: SLAM });
          if (isNew) TT(i * 60 + 380 + (i - oldLevel) * 160, () => { s.classList.add('on', 'lit'); A(s, [{ transform: `scale(1.7) rotate(-20deg)` }, { transform: `scale(.9) rotate(4deg)`, offset: .5 }, { transform: `scale(1) rotate(${i % 2 ? -3.5 : 2.5}deg)` }], { duration: 420, easing: OVER, fill: 'none' }); P5.sfx('switch', .35); });
        });
      });
      TT(4050, () => A($('.rk-vow'), [{ opacity: 0, transform: 'translateX(-7%)' }, { opacity: 1, transform: 'none' }], { duration: 620 }));
      TT(4650, () => A($('.rk-unlock'), [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: OVER }));
      TT(5250, () => { A($('.rk-confirm'), [{ opacity: 0, transform: 'translate(-50%,14px)' }, { opacity: 1, transform: 'translate(-50%,0)' }], { duration: 460, easing: OVER }); $('.rk-confirm').classList.add('on'); });
    };
    const o = { x: innerWidth / 2, y: innerHeight / 2 };
    sweep('COOPERATION', () => {
      root.style.display = 'block';
      requestAnimationFrame(() => { revealIn(root); A($('.rk-cast'), [{ transform: 'scale(1.13)' }, { transform: 'scale(1)' }], { duration: 820, easing: EASE2, fill: 'none' }); poseHero('show'); TT(red ? 0 : 260, play); });
    }, o, 1);
    $('.go').addEventListener('click', (e) => {
      const og = originOf(e);
      sweep('INTIMACY UP', () => { end(); cf.intimacy = newLevel; cf.starShiftCharges = (cf.starShiftCharges || 0) + starShiftGained; celebrate(cf); onDone && onDone(); }, og, 1);
    });
    return { close: skip };
  }
  OC.rankUp = rankUp;

  /* ══════════ ConfidantCelebrateScreenP5 —— 升级「恭喜」整页（拼贴标题 / RANK 巨字 / 称号 / 解锁能力 / 星移机会 / 按钮组） ══════════ */
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const TONES = [['#D7000F', '#F2E9DA'], ['#111', '#F2E9DA'], ['#F2E9DA', '#111'], ['#111', '#D7000F'], ['#F2E9DA', '#D7000F'], ['#F2E9DA', '#8E0010']];
  const collage = (text, seed = 333) => { const r = mulberry(seed); return [...text].map((ch) => { if (ch === ' ') return '<span class="sp"></span>'; const [bg, fg] = TONES[Math.floor(r() * TONES.length)]; return `<span class="oc-tile" style="--bg:${bg};--fg:${fg};--rot:${((r() * 2 - 1) * 7).toFixed(1)}deg">${ch}</span>`; }).join(''); };
  OC.collage = collage;
  function celebrate(cf = CF[0], { charges } = {}) {
    const lv = cf.intimacy, t = cf.card, ch = charges != null ? charges : cf.starShiftCharges || 0;
    const unlocked = BUFFS.filter((b) => b[0] > lv - 1 && b[0] <= lv);
    const root = document.createElement('div'); root.className = 'oc-cl'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', `亲密度升级！${cf.name} 达到亲密度 RANK ${lv}`);
    root.innerHTML = `${scenery('oc-sc', { still: true })}
      <div class="cl-wrap" data-oc-anchor="page2">
        <div class="cl-head cl-anim"><span class="cl-tiles" aria-label="亲密度升级">${collage('亲密度升级')}</span><em class="cl-en">INTIMACY UP</em></div>
        <div class="cl-rank cl-anim">RANK <b>${lv}</b></div>
        <div class="cl-sub cl-anim">《${t.cn}》· ${LBL[lv]}</div>
        <div class="cl-note cl-anim">亲密度到达 RANK ${lv}</div>
        ${unlocked.length ? `<div class="cl-panel cl-anim"><span class="k">新解锁的能力</span>${unlocked.map((b) => `<div><b>${b[1]}</b><small>${b[2].replace('%A', P5.ATTR[cf.skillAttribute].name)}</small></div>`).join('')}</div>` : ''}
        <div class="cl-panel cl-anim"><span class="k">✧ 获得一次星移机会（余 ${ch}）</span><small>星移可以以当前的相处状态，为这段关系重新撰写描述、解读与未来；若关系发生质变（上一阶段 vs 现在），很值得用一次。</small></div>
        ${ch > 0 ? `<div class="cl-acts cl-anim"><button type="button" class="cl-btn ghost" data-a="later">稍后再说</button><button type="button" class="cl-btn main" data-a="shift">✧ 使用星移</button></div>`
        : `<div class="cl-acts single cl-anim"><button type="button" class="cl-btn main" data-a="accept">欣然接受</button></div>`}
      </div>`;
    document.body.appendChild(root);
    const release = claimHero(t);
    let closed = false;
    const end = () => { if (closed) return; closed = true; popLayer(esc1); root.remove(); release(); };
    const esc1 = () => { end(); poseHero('hidden'); };
    pushLayer(esc1); root.style.zIndex = 861;
    revealIn(root, root.querySelector('.cl-wrap')); popIn(root.querySelectorAll('.cl-anim'));
    P5.slamTiles(root.querySelectorAll('.oc-tile'), .05);
    poseHero('page2', heroPose === 'hidden');
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const og = originOf(e, b);
      if (b.dataset.a === 'shift') sweep('STAR SHIFT', () => { end(); starShift(cf); }, og, 1);
      else sweep('COOPERATION', () => { poseHero('app'); end(); }, og, -1);
    });
    return { close: esc1 };
  }
  OC.celebrate = celebrate;

  /* ══════════ ConfidantStarShiftModalP5 —— 星移（input / thinking / preview / done / error；useStarShiftFlow 同口径） ══════════ */
  const RECENT = [['10-20', '一起去涩谷吃拉面，Ta 说想回田径部看看'], ['10-15', '帮 Ta 补数学作业到很晚'], ['10-11', '在天台聊了很久以前的事'], ['10-06', '吵了一架，第二天 Ta 先发来消息']];
  function starShift(cf = CF[0], { stage = 'input', offline = true } = {}) {
    const t = cf.card;
    let st = stage, note = '';
    const root = document.createElement('div'); root.className = 'oc-sf';
    root.innerHTML = `${scenery('oc-sc', { still: true })}<div class="sf-sheet" data-oc-anchor="page3" role="dialog" aria-modal="true" aria-label="星移"><div class="sf-body"></div></div>`;
    document.body.appendChild(root);
    const sheet = root.querySelector('.sf-sheet'), body = root.querySelector('.sf-body');
    const release = claimHero(t);
    let closed = false, autoT = 0;
    const end = () => { if (closed) return; closed = true; clearTimeout(autoT); popLayer(closeSw); root.remove(); release(); };
    const closeSw = (og) => sweep('COOPERATION', () => { poseHero('app'); end(); }, og && og.x ? og : null, -1);
    pushLayer(closeSw); root.style.zIndex = 860;
    const head = (sub, hide) => `<div class="sf-head"><div class="sf-who"><span class="tag">${esc(cf.name)} · Lv.${cf.intimacy}</span><span class="sf-sub">《${t.cn}》${sub ? ` · ${sub}` : ''}</span></div>${hide ? '' : '<button type="button" class="sf-x" data-a="close" aria-label="关闭">✕</button>'}</div>`;
    const diff = (k, a, b) => `<div class="sf-diff"><span class="sf-dt">${k}</span><div class="sf-old">${esc(a) || '（无）'}</div><div class="sf-new">${esc(b)}</div></div>`;
    const charges = () => cf.starShiftCharges || 0;
    const render = () => {
      let h = '';
      if (st === 'input') h = `${head(`星移 · 余 ${charges()}`)}<div class="sf-field"><label class="sf-label" for="oc-sf-in">你觉得你们的关系发生了什么变化？（可不填）</label><div class="sf-inw"><textarea id="oc-sf-in" rows="5" maxlength="300" placeholder="例如：最近几次见面 Ta 愿意和我谈更深入的事情了 / 吵了一架之后我们之间多了一份小心翼翼……">${esc(note)}</textarea></div><div class="sf-count"><b>${note.length}</b> / 300</div></div>
        <div class="sf-box"><span class="k">最近 ${RECENT.length} 条与 Ta 相关的记录（一同纳入星象推演）</span><div class="sf-scroll">${RECENT.map(([d, x]) => `<div class="sf-row"><span class="d">${d}</span><span>${x}</span></div>`).join('')}</div></div>
        <div class="sf-acts single"><button type="button" class="sf-btn main" data-a="start" ${charges() <= 0 ? 'disabled' : ''}>✧ 重新落墨（消耗 1 次）</button></div>`;
      if (st === 'thinking') h = `${head('星象正在重写这段关系', true)}<div class="sf-center sf-pad"><div class="sf-spin">✦</div><p class="sf-sub">星移中……</p></div>`;
      if (st === 'preview') h = `${head('预览新的落墨')}<div class="sf-box"><span class="k">✧ 这次的变化</span><small class="sf-strong">从「一起冲的伙伴」走向「会回头等对方的人」——你们开始照顾彼此的节奏。</small></div>
        ${diff('关系描述', cf.description, '秀尽学园二年级的老搭档。冲在前面的人，现在也会回头等你。')}${diff('解读', cf.aiInterpretation, '战车正位 · 速度之外多了方向感，你们在为同一件事用力。')}${diff('未来', cf.aiAdvice, '把「下次一定」换成一个具体日期。')}
        <div class="sf-box"><span class="k">牌面将调整</span><small>从 <b>${cf.orientation === 'reversed' ? '逆位' : '正位'}</b> 改为 <b>${cf.orientation === 'reversed' ? '正位' : '逆位'}</b></small></div>
        <div class="sf-acts"><button type="button" class="sf-btn ghost" data-a="again">再想想</button><button type="button" class="sf-btn main" data-a="ink">落墨</button></div>${offline ? '<div class="sf-sub sf-center">· 本次为离线星移 ·</div>' : ''}`;
      if (st === 'done') h = `<div class="sf-center sf-pad"><div class="sf-done">✧</div><p class="sf-sub">这一次的落墨已经收进档案</p></div>`;
      if (st === 'error') h = `<div class="sf-center sf-pad"><div class="sf-cloud">☁</div><p class="sf-title">星象暂时没有回应（网络错误）</p></div><div class="sf-acts single"><button type="button" class="sf-btn ghost" data-a="again">返回重试</button></div>`;
      body.innerHTML = h;
      popIn(body.children);
      if (st === 'done' && !RD()) A(body.querySelector('.sf-done'), [{ transform: 'scale(0) rotate(0)' }, { transform: 'scale(1.1) rotate(15deg)', offset: .6 }, { transform: 'scale(1) rotate(0)' }], { duration: 620, easing: OVER });
      const ta = body.querySelector('textarea'); if (ta) ta.addEventListener('input', () => { note = ta.value; body.querySelector('.sf-count b').textContent = note.length; });
    };
    const go = (s) => { st = s; render(); bar && bar.querySelectorAll('[data-demo]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.demo === s)); };
    root.addEventListener('click', (e) => {
      const d = e.target.closest('[data-demo]'); if (d) return go(d.dataset.demo);
      if (e.target === root || e.target.closest('.oc-sc')) { if (st !== 'thinking') closeSw({ x: e.clientX, y: e.clientY }); return; }
      const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
      const a = b.dataset.a;
      if (a === 'close') closeSw(originOf(e, b));
      if (a === 'start') { go('thinking'); setTimeout(() => !closed && st === 'thinking' && go('preview'), 1600); }
      if (a === 'again') go('input');
      if (a === 'ink') { cf.starShiftCharges = Math.max(0, charges() - 1); go('done'); autoT = setTimeout(() => !closed && closeSw(), 1400); }
    });
    root.insertAdjacentHTML('beforeend', demoBar([['input', '输入'], ['thinking', '生成中'], ['preview', '预览'], ['done', '完成'], ['error', '报错']], st));
    const bar = root.querySelector('[data-demo-bar]');
    revealIn(root, sheet);
    render();
    poseHero('page3', heroPose === 'hidden');
    return { close: () => closeSw() };
  }
  OC.starShift = starShift;

  /* ══════════ 小件 ══════════ */
  const stars10 = (lv) => `<span class="oc-st10" aria-label="RANK ${lv} / 10">${Array.from({ length: 10 }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span>`;
  const sec = (k, inner, cls = '') => `<div class="oc-sec ${cls}"><span class="oc-k">${k}</span>${inner}</div>`;
  const chk = (on, label, sub, a) => `<button type="button" class="oc-chk" data-a="${a}" aria-pressed="${!!on}"><i></i><span><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</span></button>`;
  const lvPicker = (cur, a = 'lv') => `<div class="oc-lvs">${Array.from({ length: 10 }, (_, i) => `<button type="button" data-a="${a}" data-v="${i + 1}" aria-pressed="${cur === i + 1}">${i + 1}</button>`).join('')}</div>`;
  const attrChips = (cur, a = 'attr', multi) => `<div class="seg oc-attrs">${P5.ATTR_ORDER.map((k) => `<button type="button" data-a="${a}" data-v="${k}" aria-pressed="${multi ? cur.includes(k) : cur === k}">${P5.ATTR[k].name}</button>`).join('')}</div>`;
  const note = (t, tone = '') => `<p class="oc-note ${tone}">${t}</p>`;
  const press = (t, sel) => t.parentElement.querySelectorAll(sel || 'button').forEach((b) => b.setAttribute('aria-pressed', b === t));

  /* ══════════ ConfidantDetailModal —— 同伴详情（头部牌面/长按菜单/谏言星/Lv/在线/SHADOW/进度/三 Tab/操作区/逆流/归档/删除/解除 COOP） ══════════ */
  function detail(cf = CF[0], { readonly = false, shadow } = {}) {
    let tab = 'info', expanded = -1;
    const online = cf.source === 'online', isMax = cf.intimacy >= 10;
    const events = cf.realId ? useAppStore.getState().confidantEvents
      .filter((e) => e.confidantId === cf.realId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((e) => ({
        date: String(e.date).slice(5),
        type: e.type,
        delta: e.delta,
        userInput: e.userInput,
        narrative: e.narrative,
        advice: e.advice,
      })) : DEMO_EVENTS;
    const pct = isMax ? 100 : Math.round(((cf.intimacyPoints - cf.base) / (cf.next - cf.base)) * 100);
    shadow = shadow !== undefined ? shadow : online ? { identified: true, hp: 62 } : null;
    const headHTML = () => `
      <div class="dt-top">
        <div class="dt-av" data-lp="avatar" tabindex="0" aria-label="长按：头像 / 卡面设置">${cardHTML(cf.card, compact() ? 92 : 112, { rev: cf.orientation === 'reversed' })}<span class="dt-lp">长按</span></div>
        <div class="dt-id">
          <b class="dt-name">${esc(cf.name)}</b>
          <span class="dt-arc">《${cf.card.cn}》${cf.orientation === 'reversed' ? '逆位' : '正位'} · ${cf.card.no} ${cf.card.en}</span>
          <button type="button" class="dt-lv" data-a="lvswap" title="点击切换：等级 / 状态">Lv.${cf.intimacy} · ${LBL[cf.intimacy]}</button>
          ${online ? `<span class="dt-on">ONLINE · <button type="button" data-a="profile" title="点击查看 GUEST PROFILE">@${cf.linkedProfile.userId}</button></span><span class="dt-goal">◎ 目标：期末全科 A · 还剩 12 天</span>` : ''}
          ${shadow ? `<button type="button" class="dt-shadow ${shadow.identified ? 'id' : ''}" data-a="shadow" title="${shadow.identified ? `羁绊之影 · HP ${shadow.hp}%` : '羁绊之影 · 未识破'}">⚔ SHADOW <i>${shadow.identified ? shadow.hp + '%' : '未识破'}</i></button>` : ''}
        </div>
        ${online && readonly ? '' : `<button type="button" class="dt-counsel" data-a="counsel" aria-label="谏言 · 关于这段关系" title="谏言：关于这段关系">${U.star('var(--paper)', 'var(--ink)', 1.6)}<span>谏言</span></button>`}
      </div>
      <div class="dt-prog"><div class="dt-pl"><span>羁绊等级</span><span>${isMax ? '已达圆满' : `${cf.intimacyPoints - cf.base} / ${cf.next - cf.base}（到 Lv.${cf.intimacy + 1} 还差 ${cf.next - cf.intimacyPoints} 点）`}</span></div>${stars10(cf.intimacy)}<div class="dt-bar"><i style="--p:${pct / 100}"></i></div></div>
      ${readonly ? `<div class="oc-warn"><b>只读模式 · 未登录云端</b><span>这是一位在线同伴，任何编辑操作都需要登录后才能同步给对方 —— 暂时只能查看，登录后可恢复全部功能。</span></div>` : ''}
      <div class="oc-tabs" role="tablist">${[['info', '信息'], ['abilities', '能力'], ['history', '历史']].map(([k, l]) => `<button type="button" role="tab" data-a="tab" data-v="${k}" aria-selected="${tab === k}">${l}</button>`).join('')}</div>
      <div class="dt-pane"></div>
      ${readonly ? '' : actsHTML()}`;
    const paneHTML = () => {
      if (tab === 'info') return sec('关系描述', `<p>${esc(cf.description) || '（未填写）'}</p>`) + sec('解读', `<p>${esc(cf.aiInterpretation)}</p>`) + sec('未来', `<p>${esc(cf.aiAdvice)}</p>`) +
        (online && cf.memorials.length ? `<button type="button" class="dt-mem" data-a="memorial"><span class="ic">◈</span><span><b>共战纪念</b><small>${cf.memorials.length} 次共同封印羁绊之影</small></span><em>›</em></button>` : '');
      if (tab === 'abilities') return (cf.buffs.length ? cf.buffs.map((b) => `<div class="dt-buff"><span class="tag">Lv.${b.unlockAtLevel}</span><b>${b.title}</b><p>${b.description}</p></div>`).join('') : `<p class="oc-empty">亲密度到 Lv.2 将解锁日常加成。</p>`) +
        (isMax ? '' : `<div class="dt-next"><span>即将解锁</span><p>${nextHint(cf.intimacy)}</p></div>`);
      return events.length ? `<ol class="dt-tl">${events.map((e, i) => { const conv = e.type === 'conversation', has = conv && (e.narrative || e.advice); return `<li><div class="m"><span>${e.date}</span><em>${EV_LBL[e.type] || '互动'}</em>${e.delta ? `<i class="${e.delta > 0 ? 'up' : 'dn'}">${e.delta > 0 ? '+' + e.delta : e.delta}</i>` : ''}${has ? `<button type="button" data-a="exp" data-v="${i}">${expanded === i ? '收起 ▲' : '查看解读 ▼'}</button>` : ''}</div><p>${esc(conv ? e.userInput : e.narrative)}</p>${has && expanded === i ? `<div class="dt-rd"><span>解读</span><p>${e.narrative}</p>${e.advice ? `<span>未来</span><p>${e.advice}</p>` : ''}</div>` : ''}</li>`; }).join('')}</ol>` : `<p class="oc-empty">还没有记录</p>`;
    };
    const decayText = () => online ? (cf.decayEnabled ? '逆流 · 双方同意，3 天无互动 −1/天' : '逆流未开启') : cf.decayEnabled ? '逆流 · 3 天无互动 −1/天' : '逆流未开启';
    const actsHTML = () => cf.archivedAt ? `<div class="dt-acts">${U.btn('恢复关系', { tone: 'paper', seed: 121, attrs: 'data-a="archive"' })}${U.btn('彻底删除', { tone: 'red', seed: 122, attrs: 'data-a="del"' })}<p class="oc-note">归档后能力暂停生效，但历史记录仍会保留</p></div>` : `<div class="dt-acts">
        <div class="dt-row1${online ? ' two' : ''}">${U.btn(isMax ? '已圆满 ✧' : '今日互动 · 由 AI 解读加点', { tone: 'red', size: 'lg', seed: 117, attrs: `data-a="interact" ${isMax ? 'disabled' : ''}` })}${online ? `<button type="button" class="dt-pact" data-a="pact"><b>立下约定</b><small>每日打卡 · 第 3 天 / 共 14 天</small></button>` : ''}</div>
        ${cf.starShiftCharges > 0 ? `<button type="button" class="dt-shift" data-a="shift"><span>✧ 星移</span><em>余 ${cf.starShiftCharges}</em><small>以当前状态重新落墨</small></button>` : ''}
        <div class="dt-row3">${U.btn('暂时归档', { tone: 'paper', seed: 118, attrs: 'data-a="archive"' })}${U.btn('彻底删除', { tone: 'ink', seed: 119, attrs: 'data-a="del"' })}</div>
        ${online ? `<button type="button" class="dt-sever" data-a="sever">解除与 ${esc(cf.linkedProfile.nickname)} 的 COOP 契约</button>` : ''}
        <div class="dt-decay"><span>${decayText()}</span><button type="button" class="sw ${cf.decayEnabled ? 'on' : ''}" data-a="decay" aria-label="切换逆流" aria-pressed="${cf.decayEnabled}"></button></div></div>`;
    let lvAlt = false;
    const d = dialog({
      eyebrow: `${cf.card.no} · CONFIDANT`, title: '同伴详情', sub: online ? '在线同伴 · 双向羁绊' : '离线同伴', size: 'l', seed: 101, aria: '同伴详情', cls: 'oc-detail',
      body: headHTML(),
      demo: [['normal', '离线'], ['online', '在线'], ['readonly', '在线·只读'], ['archived', '已归档']], demoCur: readonly ? 'readonly' : online ? 'online' : 'normal',
      onDemo: (k, api) => { api.close(); const c2 = k === 'normal' ? CF[0] : k === 'archived' ? Object.assign({}, CF[1], { archivedAt: '2026-10-19' }) : CF[3]; detail(c2, { readonly: k === 'readonly' }); },
      on: {
        tab: (t) => { tab = t.dataset.v; d.dlg.querySelectorAll('.oc-tabs [data-a]').forEach((b) => b.setAttribute('aria-selected', b === t)); pane(); },
        exp: (t) => { expanded = expanded === +t.dataset.v ? -1 : +t.dataset.v; pane(false); },
        lvswap: (t) => { lvAlt = !lvAlt; t.textContent = lvAlt ? (online ? '◎ 状态：备考中' : `${cf.intimacyPoints} 点 · ${LBL[cf.intimacy]}`) : `Lv.${cf.intimacy} · ${LBL[cf.intimacy]}`; },
        profile: () => profileCard(),
        shadow: () => shadowBattle(),
        counsel: () => counselChat({ mention: cf }),
        memorial: () => memorial(cf),
        interact: () => interaction(cf),
        pact: () => pactPanelModal(cf.linkedProfile.nickname, 'active'),
        shift: (t, e) => { const og = originOf(e, t); sweep('STAR SHIFT', () => starShift(cf), og, 1); },
        archive: async (t, e, api) => { if (!cf.realId) return; if (cf.archivedAt) await useAppStore.getState().unarchiveConfidant(cf.realId); else await useAppStore.getState().archiveConfidant(cf.realId); cf.archivedAt = cf.archivedAt ? null : '2026-10-20'; P5.toast(cf.archivedAt ? '已暂时归档' : '已恢复关系'); api.set(headHTML(), null, false); pane(false); },
        del: () => confirmDlg({ eyebrow: 'DANGER', title: `确认彻底删除 ${cf.name}？`, text: '此操作不可撤销', list: ['这位同伴的档案、亲密度、能力解锁将一并被抹去', '所有互动记录与星移痕迹也会被清空', 'Ta 所占用的塔罗大阿卡纳将被释放，可重新分配给新的同伴', '如果只是暂时不想看见 Ta，建议使用「暂时归档」'], ok: '确认删除', onOk: async () => { if (cf.realId) await useAppStore.getState().deleteConfidant(cf.realId); d.close(); P5.toast('已删除'); } }),
        sever: () => confirmDlg({ eyebrow: 'SEVER COOP', title: `解除与 ${cf.linkedProfile.nickname} 的 COOP 契约`, text: '解除后，本端的同伴卡会自动归档；对方下次同步时，那边的卡也会归档。<br>7 天内无法再次缔结 COOP。已积累的羁绊与历史会保留在归档里。', ok: '确认解除', onOk: () => P5.toast('已解除 COOP · 同伴卡已归档') }),
        decay: (t) => { cf.decayEnabled = !cf.decayEnabled; if (cf.realId) void useAppStore.getState().updateConfidant(cf.realId, { decayEnabled: cf.decayEnabled }); t.classList.toggle('on', cf.decayEnabled); t.setAttribute('aria-pressed', cf.decayEnabled); t.previousElementSibling.textContent = decayText(); },
      },
    });
    const pane = (anim = true) => { const p = d.dlg.querySelector('.dt-pane'); p.innerHTML = paneHTML(); if (anim) P5.panelIn(p.children, { from: 'right', stagger: .04 }); };
    pane(false);
    P5.panelIn(d.body.children, { from: 'right', stagger: .05, delay: .15 });
    // 长按头像：头像 / 卡面菜单（只读模式禁用）
    const av = d.dlg.querySelector('[data-lp="avatar"]');
    const avMenu = () => !readonly && P5.actionSheet(`${online ? '在线同伴' : '离线同伴'} · 图片仅保留在本地`, [
      { label: '上传头像替换塔罗', onClick: () => confirmDlg({ eyebrow: 'CARD FACE', title: '同步换成卡面？', text: '选「同步」会把羁绊墙上这位同伴的整张塔罗牌面换成刚上传的图；选「只当头像」则仅在档案里用它，牌面保持塔罗。', ok: '同步卡面', cancel: '只当头像', onOk: () => P5.toast('已同步为卡面') }) },
      { label: '卡面：塔罗（点此换成头像）', onClick: () => P5.toast('卡面已换成头像') },
      { label: '重新裁切卡面', onClick: () => P5.toast(`裁切 ${cf.name} 的卡面（1:1.6）`) },
      { label: '取消头像 · 恢复为塔罗牌', tone: 'danger', onClick: () => P5.toast('已恢复为塔罗牌') },
    ]);
    P5.longPress(av, avMenu);
    av.addEventListener('click', () => !RD() && av.animate([{ transform: 'none' }, { transform: 'scale(.95) rotate(-2deg)' }, { transform: 'none' }], { duration: 220 }));
    return d;
  }
  OC.detail = detail;

  /* ══════════ ConfidantInteractionModal —— 今日互动（input → thinking → result(+0..+5) → done；error） ══════════ */
  const DELTA_L = { 0: '波澜未起', 1: '日常维系', 2: '稳稳升温', 3: '明显推进', 4: '深度共享', 5: '关键节点' };
  function interaction(cf = CF[0], { stage = 'input', alreadyToday = false, onlineNoLogin = false } = {}) {
    let st = stage, text = '', sync = true, attr = cf.skillAttribute, pts = 2, delta = 1, evaluation = null;
    const sync3 = (hint) => `${chk(sync, '同步到「记录」（带「同伴」标签）', hint, 'sync')}${sync ? `<div class="oc-sub2"><span class="oc-k">选择加点属性（可不选）</span>${attrChips(attr)}<div class="it-pts"><span>加点</span>${[1, 2, 3].map((n) => `<button type="button" data-a="pts" data-v="${n}" aria-pressed="${pts === n}">+${n}</button>`).join('')}</div></div>` : ''}`;
    const view = () => {
      if (st === 'input') return [`${alreadyToday ? note('今天已经记录过和 Ta 的互动了。同一天反复加点容易失真，明天再来吧。', 'warn') : ''}${onlineNoLogin ? note('这是一位在线同伴 —— 需要登录云端后才能让 AI 读懂你们之间的互动。<span> 当前会退回到通用模板记录，不会调 AI。</span>', 'warn') : ''}
        <label class="fld"><span>今天和 Ta 做了什么？发生了什么？</span><textarea class="inp" rows="4" data-in="t" placeholder="可以很具体——一起吃了什么饭、聊了什么话题、Ta 说了一句让你印象深刻的话…… 也可以写下一点感受。">${esc(text)}</textarea></label>
        ${sync3('会在记录列表里生成一条专属条目；可选择将这次相处经验换算为某一属性的加点（最多 +3）。')}<p class="oc-err" hidden></p>`, U.btn('解读这一段', { tone: 'red', size: 'lg', seed: 131, attrs: `data-a="eval" ${alreadyToday ? 'disabled' : ''}` })];
      if (st === 'thinking') return [`<div class="it-think"><div class="it-orb">${U.star('var(--red)', 'var(--ink)', 1.4)}</div><p>水晶球散发出了淡蓝色的微光……</p></div>`, ''];
      if (st === 'result') return [`${sec('解读', `<p>${esc(evaluation?.narrative || '')}</p>`)}${sec('未来', `<p>${esc(evaluation?.advice || '')}</p>`)}
        <div class="oc-sec"><div class="it-dh"><span class="oc-k">建议加点（可调整）</span><b>${cf.intimacy < 10 ? `+${delta} · ${DELTA_L[delta]}` : '已达圆满'}</b></div><div class="it-deltas">${[0, 1, 2, 3, 4, 5].map((n) => `<button type="button" data-a="delta" data-v="${n}" aria-pressed="${delta === n}">+${n}${n === evaluation?.delta ? '<small>AI 荐</small>' : ''}</button>`).join('')}</div><p class="oc-note">${LBL[cf.intimacy]}（当前） → Lv.${cf.intimacy} + ${delta} 点</p></div>
        ${sync3('勾选后可选任一属性加 1–3 点，确认时会有音符弹起～')}${evaluation?.source !== 'ai' ? note('· 本次为离线评估 ·', 'c') : ''}`, U.btn('修改描述', { tone: 'paper', seed: 132, attrs: 'data-a="edit"' }) + U.btn('就这样记下', { tone: 'red', size: 'lg', seed: 133, attrs: 'data-a="ok"' })];
      if (st === 'done') return [`<div class="it-done"><div class="it-check">✓<i></i></div><p>今日的这一页被写进了你们的故事里</p>${sync && attr ? `<small>♪ ${P5.ATTR[attr].name} +${pts}</small>` : ''}</div>`, ''];
      return [`<div class="it-done"><div class="it-cloud">☁</div><p>AI 判断失败：网络超时</p></div>`, U.btn('返回重试', { tone: 'paper', seed: 134, attrs: 'data-a="edit"' })];
    };
    const draw = (anim = true) => { const [b, f] = view(); d.set(b, f, anim); const ta = d.body.querySelector('[data-in="t"]'); ta && ta.addEventListener('input', () => text = ta.value); d.hideClose(st === 'thinking'); d.locked = st === 'thinking'; };
    const go = (s) => { st = s; draw(); };
    const d = dialog({ eyebrow: 'TODAY · INTERACTION', title: `今日与 ${cf.name} 的互动`, sub: `《${cf.card.cn}》${cf.orientation === 'reversed' ? '逆位' : '正位'} · Lv.${cf.intimacy} · 每日一次`, seed: 137,
      demo: [['input', '输入'], ['today', '今日已记'], ['thinking', '解读中'], ['result', '结果'], ['done', '完成'], ['error', '报错']], demoCur: stage,
      onDemo: (k) => { alreadyToday = k === 'today'; go(k === 'today' ? 'input' : k); },
      on: {
        sync: () => { sync = !sync; draw(false); }, attr: (t) => { attr = attr === t.dataset.v ? null : t.dataset.v; draw(false); }, pts: (t) => { pts = +t.dataset.v; press(t); },
        delta: (t) => { delta = +t.dataset.v; draw(false); },
        eval: async () => { if (text.trim().length < 4) { const e = d.body.querySelector('.oc-err'); e.hidden = false; e.textContent = '请再多描述一点，星象才能照见'; return; } go('thinking'); try {
          const s = useAppStore.getState();
          const live = s.confidants.find((c2) => c2.id === cf.realId);
          if (!live) throw new Error('同伴档案已不存在');
          evaluation = await evaluateInteraction({
            settings: s.settings, confidantName: live.name, arcanaName: cf.card.cn,
            orientation: live.orientation, currentLevel: live.intimacy, description: text.trim(),
            relationshipSummary: live.description,
            recentUserInputs: s.confidantEvents.filter((e2) => e2.confidantId === live.id && e2.type === 'conversation' && e2.userInput).slice(0, 2).map((e2) => ({ date: e2.date, text: e2.userInput })),
          }, undefined, live.source !== 'online' || !!s.user);
          delta = evaluation.delta;
          go('result');
        } catch { go('error'); } },
        edit: () => go('input'),
        ok: async () => { if (!evaluation) return; try {
          const s = useAppStore.getState();
          const live = s.confidants.find((c2) => c2.id === cf.realId);
          if (!live) throw new Error('同伴档案已不存在');
          await s.recordConfidantInteraction({ id: live.id, description: text.trim(), delta, narrative: evaluation.narrative, advice: evaluation.advice, createActivity: sync, activityAttribute: sync && attr ? attr : undefined, activityPoints: sync && attr ? pts : 0 });
          const after = useAppStore.getState().confidants.find((c2) => c2.id === live.id);
          cf.intimacy = after?.intimacy ?? cf.intimacy;
          cf.intimacyPoints = after?.intimacyPoints ?? cf.intimacyPoints + delta;
          go('done'); if (sync && attr) P5.toast(`♪ ${P5.ATTR[attr].name} +${pts}`);
          if (after && after.intimacy > live.intimacy) setTimeout(() => { d.close(); rankUp(cf, { oldLevel: live.intimacy, newLevel: after.intimacy }); }, 1300);
        } catch (error) { P5.toast(error instanceof Error ? error.message : '保存失败'); } },
      } });
    draw(false);
    return d;
  }
  OC.interaction = interaction;

  /* ══════════ ArcanaPickerForm —— 选牌（22 张，占用不可选）/ 正逆位 / 期望等级 / 加成属性 / 留言 / 不使用 AI ══════════ */
  const TAKEN = new Set(CF.map((c) => c.arcanaId));
  OC.refreshConfidants = () => {
    const next = buildCF();
    CF.splice(0, CF.length, ...next);
    TAKEN.clear();
    next.forEach((c) => TAKEN.add(c.arcanaId));
    OC.CF = CF;
  };
  function pickerHTML(v, { hint, messagePlaceholder } = {}) {
    const sel = v.arcanaId ? T[v.arcanaId] : null;
    return `<div class="ap">
      <div class="ap-sel">${sel ? `${cardHTML(sel, 54, { rev: v.orientation === 'reversed' })}<div><b>《${sel.cn}》${v.orientation === 'reversed' ? '逆位' : '正位'}</b><small>${sel.no} · ${sel.en}</small><div class="seg"><button type="button" data-a="ori" data-v="upright" aria-pressed="${v.orientation === 'upright'}">正位</button><button type="button" data-a="ori" data-v="reversed" aria-pressed="${v.orientation === 'reversed'}">逆位</button></div></div>` : `<p class="oc-note c">${hint || '从下方挑一张塔罗代表 Ta'}</p>`}</div>
      <div class="ap-grid">${TAROT.map((t) => { const tk = TAKEN.has(t.id) && t.id !== v.keep; return `<button type="button" class="ap-c" data-a="card" data-v="${t.id}" aria-pressed="${v.arcanaId === t.id}" ${tk ? 'disabled' : ''}>${cardHTML(t, 40)}<span>${t.cn}</span>${tk ? '<i>占</i>' : ''}</button>`; }).join('')}</div>
      <div class="oc-sec"><div class="it-dh"><span class="oc-k">羁绊等级（期望值）</span><b>Lv.${v.level} · ${LBL[v.level]}</b></div>${lvPicker(v.level)}<p class="oc-note">双方的期望值不同时，最终按 <b>取中</b>（下取整）生效。</p></div>
      <div class="oc-sec"><span class="oc-k">能力加成属性</span>${attrChips(v.attr)}<p class="oc-note">Lv2 日常加点、Lv7 战斗固伤、Lv10 SP 道具都会指向这个属性。</p></div>
      <label class="fld"><span>留一句话（可选，≤ 200 字）</span><textarea class="inp" rows="2" maxlength="200" placeholder="${esc(messagePlaceholder || '想对 Ta 说的话……')}"></textarea></label>
      ${chk(v.noAi, '不使用 AI 内容', '默认：契约建立后 AI 会根据塔罗 + 对方留言生成「解读 / 未来」。勾上则跳过 AI，用对方留言或牌意模板兜底。', 'noai')}
    </div>`;
  }
  const pickerOn = (v, redraw) => ({
    card: (t) => { v.arcanaId = t.dataset.v; redraw(); P5.sfx('tarot', .3); }, ori: (t) => { v.orientation = t.dataset.v; redraw(); },
    lv: (t) => { v.level = +t.dataset.v; redraw(); }, attr: (t) => { v.attr = t.dataset.v; press(t); }, noai: (t) => { v.noAi = !v.noAi; t.setAttribute('aria-pressed', v.noAi); },
  });
  function arcanaPicker() {
    const v = { arcanaId: 'STAR', orientation: 'upright', level: 3, attr: 'kindness', noAi: false };
    const d = dialog({ eyebrow: 'ARCANA PICKER', title: '挑一张塔罗', sub: '（ArcanaPickerForm · 嵌在提议 / 接受 COOP 的「手动输入」里）', seed: 141, size: 'l',
      body: pickerHTML(v), foot: U.btn('完成', { tone: 'red', seed: 142, attrs: 'data-a="__close"' }) });
    const redraw = () => { const ta = d.body.querySelector('textarea').value; d.set(pickerHTML(v), null, false); d.body.querySelector('textarea').value = ta; };
    Object.assign(d, { on: null }); d.el.addEventListener('click', (e) => { const t = e.target.closest('[data-a]'); if (t && !t.disabled && pickerOn(v, redraw)[t.dataset.a]) pickerOn(v, redraw)[t.dataset.a](t); });
    return d;
  }
  OC.arcanaPicker = arcanaPicker;

  /* ══════════ 4 个补充问题（Create / AiMatch 共用） ══════════ */
  const TRAITS = [
    ['Ta 给你的整体印象更接近：', '性格基调', ['温和包容，让人安心', '直率有棱角，说话不绕圈', '慢热敏感，需要时间打开', '情绪丰富，起伏鲜明', '稳重克制，什么都先留一手']],
    ['你们在一起时，你通常感觉：', '相处压力', ['完全放松，什么都能说', '大致轻松，偶有小心翼翼', '有些绷着，但依然珍贵', '常觉得累，但戒不掉', '像在博弈，时时权衡']],
    ['这段关系里，你更多是：', '关系位置', ['我更多是给予的那一方', '我更多是被陪伴/照顾的一方', '相互依赖，彼此撑着', '保持距离，但彼此信任', '暧昧不定，角色在变']],
    ['你们已经认识：', '认识时长', ['不到半年', '半年到两年', '两到五年', '五年以上', '很难说清，像是很久了']],
  ];
  const traitHTML = (step, answers) => `<div class="tr-prog">${TRAITS.map((q, i) => `<i class="${i < step ? 'done' : i === step ? 'on' : ''}">${q[1]}</i>`).join('')}</div>
    <p class="tr-q"><em>Q${step + 1}/4</em>${TRAITS[step][0]}</p><div class="tr-opts">${TRAITS[step][2].map((o, i) => `<button type="button" class="tr-o" data-a="trait" data-v="${esc(o)}" aria-pressed="${answers[step] === o}"><i>${'ABCDE'[i]}</i>${o}</button>`).join('')}</div>
    ${step > 0 ? '<button type="button" class="oc-link" data-a="tprev">‹ 上一题</button>' : ''}`;
  const matchingHTML = () => `<div class="mt-run"><div class="mt-fan">${[0, 1, 2, 3, 4].map((i) => `<span style="--i:${i}">${backSVG()}</span>`).join('')}</div><b>星象正在翻动塔罗……</b><p>一段关系的倒影，正从 22 张牌里浮现</p></div>`;
  const startFan = (root) => !RD() && root.querySelectorAll('.mt-fan span').forEach((s, i) => s.animate([{ transform: `rotate(${(i - 2) * 4}deg)` }, { transform: `translateX(${(i - 2) * 26}px) rotate(${(i - 2) * 14}deg)`, offset: .5 }, { transform: `rotate(${(i - 2) * 4}deg)` }], { duration: 1100, iterations: Infinity, delay: i * 60, easing: 'cubic-bezier(.65,0,.35,1)' }));
  const flipReveal = (el) => { if (RD() || !el) return; el.animate([{ transform: 'rotateY(90deg) scale(.8)', opacity: 0 }, { transform: 'rotateY(0) scale(1.06)', opacity: 1, offset: .7 }, { transform: 'none', opacity: 1 }], { duration: 700, easing: 'cubic-bezier(.2,.9,.3,1)' }); P5.sfx('tarot', .5); };

  /* ══════════ ConfidantCreateModal —— 结识一位同伴（basic → description → trait×4 → matching → result；error） ══════════ */
  function createModal({ stage = 'basic', noAi = true } = {}) {
    let st = stage, step = 0; const ans = []; const v = { name: '', desc: '', decay: false, level: 4 };
    let res = T.STAR;
    let matchResult = null;
    const view = () => {
      if (st === 'basic') return [`<div class="cr-modes"><button type="button" class="cr-mode on" data-a="offline"><b>离线同伴</b><small>本地塔罗匹配<br>身边的人 / 自己的关系</small></button><button type="button" class="cr-mode hot" data-a="online"><b>在线同伴</b><small>按 UserID 邀请<br>缔结双向羁绊</small><em>›</em></button></div>
        <label class="fld"><span>Ta 的名字 / 称呼</span><input class="inp" data-in="name" maxlength="20" placeholder="朋友、家人、老师、恋人……" value="${esc(v.name)}"></label>
        ${chk(v.decay, '开启「逆流」模式', '连续 3 天无互动，亲密度每日 -1。', 'decay')}${noAi ? note('未配置 AI API，将使用离线模式进行匹配', 'warn') : ''}<p class="oc-err" hidden></p>`, U.btn('下一步', { tone: 'red', size: 'lg', seed: 151, attrs: 'data-a="n1"' })];
      if (st === 'description') return [`<p class="oc-eb2">告诉星象</p><label class="fld"><span>你们的关系 / Ta 是什么样的人？</span><textarea class="inp" rows="5" data-in="desc" placeholder="比如：一起长大的朋友，总能包容我的不安；最近很忙，但只要我需要，Ta 都会接电话……">${esc(v.desc)}</textarea></label><p class="oc-err" hidden></p>`, U.btn('下一步（还有 4 个小问题）', { tone: 'red', size: 'lg', seed: 152, attrs: 'data-a="n2"' })];
      if (st === 'trait') return [traitHTML(step, ans), ''];
      if (st === 'matching') return [matchingHTML(), ''];
      if (st === 'result') return [`<div class="cr-res">${cardHTML(res, compact() ? 110 : 130, { cls: 'cr-card' })}<div><b class="cr-n">《${res.cn}》正位</b><small>${res.no} · ${res.en}</small><span class="tag">星象建议 Lv.3 · ${LBL[3]}</span></div></div>
        <div class="oc-sec"><div class="it-dh"><span class="oc-k">当前亲密度（由你决定）</span><b>Lv.${v.level} · ${LBL[v.level]}</b></div>${lvPicker(v.level)}<p class="oc-note">AI 只给参考，最终等级由你判断。不同等级会立即解锁对应的日常/战斗能力。</p></div>
        ${sec('为什么是这张牌', `<p>${esc(matchResult?.interpretation || '')}</p>`)}${sec('未来', `<p>${esc(matchResult?.advice || '')}</p>`)}${matchResult?.source !== 'ai' ? note('· 本次为离线匹配 ·', 'c') : ''}`, U.btn('回去改一改', { tone: 'paper', seed: 153, attrs: 'data-a="redo"' }) + U.btn('就是 Ta 了', { tone: 'red', size: 'lg', seed: 154, attrs: 'data-a="ok"' })];
      return [`<div class="it-done"><div class="it-cloud">☁</div><p>未能找到合适的阿卡纳，请调整描述后再试</p></div>`, U.btn('返回修改', { tone: 'paper', seed: 155, attrs: 'data-a="totrait"' })];
    };
    const title = () => st === 'result' ? '塔罗的回响' : '结识一位同伴';
    const draw = (anim = true) => {
      const [b, f] = view(); d.set(b, f, anim);
      d.dlg.querySelector('.cr-tiles').innerHTML = collage(title(), 21); d.dlg.querySelector('.cr-tiles').setAttribute('aria-label', title());
      d.dlg.querySelector('.oc-back').style.visibility = ['description', 'trait'].includes(st) ? '' : 'hidden';
      d.hideClose(st === 'matching'); d.locked = st === 'matching';
      d.body.querySelectorAll('[data-in]').forEach((i) => i.addEventListener('input', () => v[i.dataset.in] = i.value));
      if (st === 'matching') startFan(d.body);
      if (st === 'result') { flipReveal(d.body.querySelector('.cr-card')); }
      if (anim && st !== 'matching') P5.slamTiles(d.dlg.querySelectorAll('.oc-tile'), .04);
    };
    const err = (m) => { const e = d.body.querySelector('.oc-err'); e.hidden = false; e.textContent = m; };
    const go = (s) => { st = s; draw(); };
    const d = dialog({ eyebrow: 'NEW CONFIDANT', title: '结识一位同伴', sub: `剩余阿卡纳：${22 - TAKEN.size} / 22`, seed: 157, cls: 'oc-create',
      back: () => { if (st === 'description') go('basic'); else if (st === 'trait') { if (step > 0) { step--; draw(); } else go('description'); } },
      demo: [['basic', '基本'], ['description', '描述'], ['trait', '小问题'], ['matching', '匹配中'], ['result', '结果'], ['error', '报错']], demoCur: stage, onDemo: (k) => { step = 0; go(k); },
      on: {
        offline: () => P5.toast('离线就是本流程，已在这一页'), online: () => { d.close(); addOnline(); },
        decay: (t) => { v.decay = !v.decay; t.setAttribute('aria-pressed', v.decay); },
        n1: () => { if (!v.name.trim()) return err('请先告诉我 Ta 叫什么名字'); go('description'); },
        n2: () => { if (v.desc.trim().length < 6) return err('请用至少几个字描述 Ta，让塔罗有内容可参考'); step = 0; go('trait'); },
        trait: (t) => { ans[step] = t.dataset.v; press(t); setTimeout(async () => { if (step < 3) { step++; draw(); } else {
          go('matching');
          try {
            const settings = useAppStore.getState().settings;
            matchResult = await matchConfidant({
              settings,
              name: v.name.trim(),
              description: v.desc.trim(),
              takenArcanaIds: [...TAKEN],
              traits: TRAITS.map((q, i) => ({ question: q[0], answer: ans[i] || '' })),
            });
            res = TAROT.find((t2) => t2.id === matchResult.arcanaId) || T.STAR;
            v.level = Math.max(1, Math.min(10, matchResult.initialIntimacy + 1));
            go('result');
          } catch {
            go('error');
          }
        } }, 220); },
        tprev: () => { step--; draw(); }, lv: (t) => { v.level = +t.dataset.v; draw(false); },
        redo: () => go('description'), totrait: () => { step = 0; go('trait'); },
        ok: async () => {
          if (!matchResult) return;
          try {
            const created = await useAppStore.getState().addConfidant({
              name: v.name.trim(), description: v.desc.trim(), match: matchResult,
              source: 'offline', initialLevel: v.level,
            });
            if (v.decay) await useAppStore.getState().updateConfidant(created.id, { decayEnabled: true });
            TAKEN.add(created.arcanaId);
            const card = TAROT.find((t2) => t2.id === created.arcanaId) || T.STAR;
            CF.push({
              id: created.id, realId: created.id, name: created.name, arcanaId: created.arcanaId, card,
              intimacy: created.intimacy, description: created.description, orientation: created.orientation,
              aiInterpretation: created.aiInterpretation, aiAdvice: created.aiAdvice,
              skillAttribute: created.skillAttribute, intimacyPoints: created.intimacyPoints,
              starShiftCharges: created.starShiftCharges ?? 0, source: created.source,
              linkedProfile: created.linkedProfile || null, decayEnabled: created.decayEnabled,
              archivedAt: created.archivedAt || null, buffs: created.buffs || [], memorials: [],
            });
            P5.rerender?.();
            d.close();
            P5.toast(`已缔结：${created.name} ·《${res.cn}》`);
          } catch (error) {
            P5.toast(error instanceof Error ? error.message : '保存失败');
          }
        },
      } });
    d.dlg.querySelector('.oc-ttl h3').insertAdjacentHTML('afterend', '<span class="cr-tiles" role="heading" aria-level="2"></span>');
    d.dlg.querySelector('.oc-ttl h3').classList.add('sr');
    draw(false);
    return d;
  }
  OC.createModal = createModal;

  /* ══════════ CoopAiMatchModal —— STAR MATCH 星象匹配（description → trait → matching → result；error） ══════════ */
  function aiMatch(targetName = '新岛真', { stage = 'description', onApply } = {}) {
    let st = stage, step = 0, desc = ''; const ans = []; const v = { level: 4, attr: 'knowledge' }; const res = T.PRIESTESS;
    const view = () => {
      if (st === 'description') { const ok = desc.trim().length >= 6; return [`<p class="oc-eb2">告诉星象 · 只给 AI 参考</p><label class="fld"><span>你眼中的 ${esc(targetName)} 是怎样的人？</span><textarea class="inp" rows="5" data-in="d" placeholder="比如：跟我一起十年的朋友，会在我说不出话的夜里发一段没头没尾的语音……">${esc(desc)}</textarea></label>${note('这段不会发给对方，只用来推荐塔罗。<br>对方看到的"留一句话"在结果页填。')}${note('未配置 AI API，将使用离线模式进行匹配', 'warn')}`, U.btn(ok ? '下一步（4 个小问题）' : '至少几个字，让塔罗有内容可参考', { tone: ok ? 'red' : 'ink', size: 'lg', seed: 161, attrs: `data-a="n" ${ok ? '' : 'disabled'}` })]; }
      if (st === 'trait') return [traitHTML(step, ans), ''];
      if (st === 'matching') return [matchingHTML(), ''];
      if (st === 'result') return [`<div class="cr-res">${cardHTML(res, 110, { cls: 'cr-card' })}<div><b class="cr-n">《${res.cn}》正位</b><small>${res.no} · ${res.en}</small><span class="tag">星象建议起点 Lv.3 · ${LBL[3]}</span></div></div>
        ${sec('为什么是这张牌', '<p>女教皇正位：冷静、克制、洞察。Ta 习惯一个人扛，却总能看穿你的逞强。</p>')}${sec('未来', '<p>多分享你的计划，Ta 会帮你补上漏洞。</p>')}
        <div class="oc-sec"><div class="it-dh"><span class="oc-k">起点羁绊（你最终决定）</span><b>Lv.${v.level} · ${LBL[v.level]}</b></div>${lvPicker(v.level)}</div>
        <div class="oc-sec"><div class="it-dh"><span class="oc-k">能力加成属性</span><small>默认来自塔罗花色</small></div>${attrChips(v.attr)}<p class="oc-note">Lv2 日常加点、Lv7 战斗固伤、Lv10 SP 道具都会指向这个属性。</p></div>
        <label class="fld"><span>留一句话（给对方看，可选，≤ 200 字）</span><textarea class="inp" rows="2" maxlength="200" placeholder="想对 ${esc(targetName)} 说的话……"></textarea></label>${note('· 本次为离线匹配 ·', 'c')}`, U.btn('重新匹配', { tone: 'paper', seed: 162, attrs: 'data-a="redo"' }) + U.btn('就用这份 ✦', { tone: 'red', size: 'lg', seed: 163, attrs: 'data-a="apply"' })];
      return [`<div class="it-done"><div class="it-cloud">☁</div><p>匹配失败：网络超时</p></div>`, U.btn('回去改一改', { tone: 'paper', seed: 164, attrs: 'data-a="redo"' })];
    };
    const draw = (anim = true) => { const [b, f] = view(); d.set(b, f, anim); d.locked = st === 'matching'; d.hideClose(st === 'matching');
      const ta = d.body.querySelector('[data-in="d"]'); ta && ta.addEventListener('input', () => { const was = desc.trim().length >= 6; desc = ta.value; if ((desc.trim().length >= 6) !== was) { const [, f2] = view(); d.foot.innerHTML = f2; } });
      if (st === 'matching') startFan(d.body); if (st === 'result') flipReveal(d.body.querySelector('.cr-card')); };
    const go = (s) => { st = s; draw(); };
    const d = dialog({ eyebrow: '✦ STAR MATCH · 星象匹配', title: '星象匹配', sub: `星象为 ${esc(targetName)} 推演一张塔罗`, seed: 167,
      demo: [['description', '描述'], ['trait', '小问题'], ['matching', '匹配中'], ['result', '结果'], ['error', '报错']], demoCur: stage, onDemo: (k) => { step = 0; go(k); },
      on: { n: () => { step = 0; go('trait'); }, trait: (t) => { ans[step] = t.dataset.v; press(t); setTimeout(() => { if (step < 3) { step++; draw(); } else { go('matching'); setTimeout(() => st === 'matching' && go('result'), 1800); } }, 220); },
        tprev: () => { step--; draw(); }, lv: (t) => { v.level = +t.dataset.v; draw(false); }, attr: (t) => { v.attr = t.dataset.v; press(t); },
        redo: () => go('description'), apply: () => { d.close(); onApply ? onApply(res) : P5.toast(`已采用《${res.cn}》`); } } });
    draw(false);
    return d;
  }
  OC.aiMatch = aiMatch;

  /* ══════════ CoopProposeModal —— 和 X 缔结契约（choice → manual(ArcanaPicker) / ai → success） ══════════ */
  const choiceHTML = (name, lead) => `<p class="oc-p">${lead}</p><div class="cp-choice"><button type="button" class="cp-ch" data-a="ai"><span class="ic">${U.star('var(--red)', 'var(--ink)', 1.4)}</span><span><b>星象匹配</b><small>星象从 22 张里推演一张。结果页可改加成属性和留言。</small></span></button><button type="button" class="cp-ch" data-a="manual"><span class="ic">✎</span><span><b>手动输入</b><small>自己挑塔罗、正逆位、等级、加成属性，写一句想说的话。</small></span></button></div>`;
  function propose(targetName = '新岛真', { phase = 'choice' } = {}) {
    let ph = phase; const v = { arcanaId: null, orientation: 'upright', level: 4, attr: 'knowledge', noAi: false };
    const view = () => {
      if (ph === 'choice') return [choiceHTML(targetName, `选一种方式为 ${esc(targetName)} 挑一张塔罗 —— 两种方式最终都会发出提议，对方接受后建立 COOP 契约。`), ''];
      if (ph === 'manual') return [`<button type="button" class="oc-link" data-a="back">‹ 换一种方式</button>${pickerHTML(v, { hint: '从下方 22 张大阿卡纳中挑一张', messagePlaceholder: `对 ${targetName} 说点什么（可选）` })}<p class="oc-err" hidden></p>`, U.btn('再想想', { tone: 'paper', seed: 171, attrs: 'data-a="__close"' }) + U.btn('发出提议', { tone: 'red', size: 'lg', seed: 172, attrs: `data-a="send" ${v.arcanaId ? '' : 'disabled'}` })];
      if (ph === 'ai') return [`<div class="it-think"><p>星象匹配进行中……<br>在弹出的窗口里完成几个小问题即可返回。</p></div>`, ''];
      return [`<div class="it-done"><div class="it-check">✓<i></i></div><p>提议已送出</p><small>${esc(targetName)} 收到后会挑一张自己的塔罗。<br>接受后，你们的在线同伴卡会自动建立。14 天未响应会自动过期。</small></div>`, U.btn('好的', { tone: 'red', seed: 173, attrs: 'data-a="__close"' })];
    };
    const draw = (anim = true) => { const [b, f] = view(); d.set(b, f, anim); };
    const go = (s) => { ph = s; draw(); };
    const d = dialog({ eyebrow: 'COOP · PROPOSE', title: `和 ${targetName} 缔结契约`, sub: '挑一张塔罗代表 Ta 在你眼里的样子。Ta 接受后，你们的在线同伴卡会自动建立。', seed: 175, size: 'l',
      demo: [['choice', '选择方式'], ['manual', '手动'], ['success', '已送出']], demoCur: phase, onDemo: (k) => go(k),
      on: Object.assign(pickerOn(v, () => draw(false)), { ai: () => { go('ai'); aiMatch(targetName, { onApply: (r) => { v.arcanaId = r.id; go('manual'); } }); }, manual: () => go('manual'), back: () => go('choice'), send: (t) => { t.querySelector('span').textContent = '发送中…'; setTimeout(() => go('success'), 600); } }) });
    draw(false);
    return d;
  }
  OC.propose = propose;

  /* ══════════ CoopAcceptModal —— X 想与你缔结契约（Ta 眼里的你 / 回应方式 / 拒绝(3 天冷却) / 接受 & 缔结；已失效态） ══════════ */
  function accept(name = '坂本龙司', { phase = 'choice', status = 'pending', theyPicked = true } = {}) {
    let ph = phase, stt = status; const v = { arcanaId: 'CHARIOT', keep: 'CHARIOT', orientation: 'upright', level: 5, attr: 'guts', noAi: false };
    const mine = T.SUN;
    const view = () => {
      const them = theyPicked ? `<div class="ac-them"><span class="oc-k">Ta 眼里的你</span><div class="ac-row">${cardHTML(mine, 70)}<div><b>《${mine.cn}》</b><small>${mine.no} · ${mine.en}</small><p>光明、坦率，和你在一起的人会觉得被照亮。</p><span class="tag">Ta 希望起点 Lv.5</span> <span class="tag ink">能力倾向「胆量」</span></div></div></div>` : note('对方尚未挑选塔罗。', 'c');
      if (stt !== 'pending') return [`${them}<p class="oc-p c">${{ linked: '此 COOP 已缔结，无需再响应。', rejected: '此提议已被拒绝。', expired: '此提议已过期。', severed: '此 COOP 已解除。' }[stt]}</p>`, U.btn('拒绝这次提议（3 天冷却）', { tone: 'paper', seed: 181, attrs: 'data-a="rej"' }) + U.btn('知道了', { tone: 'red', seed: 182, attrs: 'data-a="__close"' })];
      let mid = '';
      if (ph === 'choice') mid = `<div class="oc-sec"><span class="oc-k">在你眼里的 ${esc(name)}</span>${choiceHTML(name, '选一种方式回应 —— 两种方式最终都会完成接受。').replace('星象从 22 张里推演一张。', '星象推演一张塔罗。').replace('写一句想说的话。', '写一句回给 Ta 的话。')}</div>`;
      if (ph === 'manual') mid = `<button type="button" class="oc-link" data-a="back">‹ 换一种方式</button><p class="oc-k">在你眼里的 ${esc(name)}</p>${pickerHTML(v, { hint: '挑一张塔罗代表 Ta（已为你预选 Ta 那张）', messagePlaceholder: `回给 ${name} 的一句话（可选）` })}`;
      if (ph === 'ai') mid = `<div class="it-think"><p>星象匹配进行中……<br>在弹出的窗口里完成几个小问题即可返回。</p></div>`;
      return [them + mid, U.btn('拒绝（3 天冷却）', { tone: 'paper', seed: 183, attrs: 'data-a="rej"' }) + U.btn('接受 & 缔结', { tone: 'red', size: 'lg', seed: 184, attrs: `data-a="ok" ${ph === 'manual' ? '' : 'disabled'}` })];
    };
    const draw = (anim = true) => { const [b, f] = view(); d.set(b, f, anim); };
    const d = dialog({ eyebrow: 'COOP · PROPOSAL', title: `${name} 想与你缔结契约`, sub: 'Ta 为你选了一张塔罗。看看代表你的这张牌 —— 然后挑一张代表 Ta。', seed: 187, size: 'l',
      demo: [['choice', '待响应'], ['manual', '手动'], ['nopick', '对方未选牌'], ['expired', '已失效']], demoCur: phase,
      onDemo: (k) => { theyPicked = k !== 'nopick'; stt = k === 'expired' ? 'expired' : 'pending'; ph = k === 'manual' ? 'manual' : 'choice'; draw(); },
      on: Object.assign(pickerOn(v, () => draw(false)), { ai: () => { ph = 'ai'; draw(); aiMatch(name, { onApply: (r) => { v.arcanaId = r.id; ph = 'manual'; draw(); } }); }, manual: () => { ph = 'manual'; draw(); }, back: () => { ph = 'choice'; draw(); },
        rej: (t) => { t.querySelector('span').textContent = '处理中…'; setTimeout(() => { d.close(); P5.toast('已拒绝 · 3 天冷却'); }, 500); },
        ok: (t) => { t.querySelector('span').textContent = '缔结中…'; setTimeout(() => { d.close(); P5.cutIn(`<div class="oc-coopin">${U.ransom('COOP!', { h: 54, seed: 31 })}<b>已与 ${esc(name)} 缔结契约</b><span>在线同伴卡已建立</span></div>`, { autoMs: 2600 }); }, 600); } }) });
    draw(false);
    return d;
  }
  OC.accept = accept;

  /* ══════════ AddOnlineConfidantModal —— 邀请在线同伴（未登录 / search / found / sent） ══════════ */
  function addOnline({ phase = 'search', loggedIn = true } = {}) {
    let ph = loggedIn ? phase : 'nologin', id = '', msg = '';
    const found = { userId: 'queen_makoto', nickname: '新岛真', totalLv: 31 };
    const view = () => {
      if (ph === 'nologin') return [note('邀请在线同伴之前，请先在设置页登录云端账号。', 'warn'), U.btn('去登录', { tone: 'red', seed: 191, attrs: 'data-a="login"' })];
      if (ph === 'search') return [`<label class="fld"><span>对方的 UserID</span><div class="ao-row"><input class="inp" data-in="id" placeholder="alice_in_velvet" value="${esc(id)}" autocapitalize="off">${U.btn('搜索', { tone: 'red', seed: 192, attrs: 'data-a="search"' })}</div></label><p class="oc-err" hidden></p>${note('UserID 是对方在注册时选的唯一标识（3-18 位小写字母/数字/._-），<br>不区分大小写，精确匹配后才能找到。')}`, ''];
      if (ph === 'found') return [`<div class="ao-card"><span class="ao-av">${P5.maskHTML(54, 'white')}</span><div><b>${found.nickname}</b><small>@${found.userId}</small></div><span class="ao-lv">LV <b>${found.totalLv}</b></span></div><label class="fld"><span>留言（可选，≤ 200 字）</span><textarea class="inp" rows="3" maxlength="200" placeholder="嗨，是我……">${esc(msg)}</textarea></label>`, U.btn('返回搜索', { tone: 'paper', seed: 193, attrs: 'data-a="back"' }) + U.btn('发送申请', { tone: 'red', size: 'lg', seed: 194, attrs: 'data-a="send"' })];
      return [`<div class="it-done"><div class="it-check">✓<i></i></div><p>申请已送出</p><small>对方接受后，你们会在各自的同伴列表顶部出现。<br>21 天未响应，申请会自动作废。</small></div>`, U.btn('好的', { tone: 'red', seed: 195, attrs: 'data-a="__close"' })];
    };
    const draw = (anim = true) => { const [b, f] = view(); d.set(b, f, anim); const i = d.body.querySelector('[data-in="id"]'); i && i.addEventListener('input', () => id = i.value); };
    const err = (m) => { const e = d.body.querySelector('.oc-err'); e.hidden = false; e.textContent = m; };
    const d = dialog({ eyebrow: 'ONLINE · INVITE', title: '邀请在线同伴', sub: '输入对方的 UserID 来发起好友申请', seed: 197,
      demo: [['search', '搜索'], ['found', '找到'], ['sent', '已送出'], ['nologin', '未登录']], demoCur: ph, onDemo: (k) => { ph = k; draw(); },
      on: { login: () => P5.toast('前往 设置 → 账号 登录'), back: () => { ph = 'search'; draw(); },
        search: (t) => { const v = id.trim().toLowerCase(); if (!/^[a-z0-9._-]{3,18}$/.test(v)) return err('UserID 应为 3-18 位小写字母 / 数字 / ._-'); if (v === 'joker') return err('不能加自己为好友'); t.querySelector('span').textContent = '查找中…'; setTimeout(() => { if (v !== found.userId && v !== 'queen_makoto') { t.querySelector('span').textContent = '搜索'; return err('没找到这个 UserID（试试 queen_makoto）'); } ph = 'found'; draw(); }, 500); },
        send: (t) => { t.querySelector('span').textContent = '发送中…'; setTimeout(() => { ph = 'sent'; draw(); }, 500); } } });
    draw(false);
    return d;
  }
  OC.addOnline = addOnline;

  /* ══════════ OnlineConfidantProfileCard —— GUEST PROFILE（五维雷达 / TOGETHER 约定 / 祈愿 / COOP 状态键 / 解除好友） ══════════ */
  const COOP_ST = { linked: ['已缔结 COOP', '在同伴列表里找 Ta', 'ok'], pending_out: ['等 Ta 响应', '14 天内未响应过期', 'wait'], pending_in: ['响应 COOP', 'Ta 发来了提议', 'hot'], cooldown_rejected: ['冷却中', '3 天后可重试', 'cd'], cooldown_severed: ['冷却中', '7 天后可重试', 'cd'], none: ['邀请 COOP', '缔结在线同伴', 'hot'] };
  function radarSVG(vals, max, sel) {
    const c = 80, R = 64, pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return [c + Math.cos(a) * r, c + Math.sin(a) * r]; };
    const poly = (r) => [0, 1, 2, 3, 4].map((i) => pt(i, r).map((n) => n.toFixed(1)).join(',')).join(' ');
    return `<svg viewBox="0 0 160 160" class="pf-radar" aria-hidden="true">${[1, .66, .33].map((k, j) => `<polygon points="${poly(R * k)}" fill="${j % 2 ? '#F2E9DA' : '#e4d8c4'}" stroke="#111" stroke-width="${j ? 1 : 2.4}"/>`).join('')}
      ${[0, 1, 2, 3, 4].map((i) => `<line x1="${c}" y1="${c}" x2="${pt(i, R)[0].toFixed(1)}" y2="${pt(i, R)[1].toFixed(1)}" stroke="#111" stroke-width="1"/>`).join('')}
      <polygon class="pf-val" points="${vals.map((v, i) => pt(i, R * v / max).map((n) => n.toFixed(1)).join(',')).join(' ')}" fill="rgba(215,0,15,.78)" stroke="#111" stroke-width="2.4" stroke-linejoin="round"/>
      ${vals.map((v, i) => `<circle cx="${pt(i, R * v / max)[0].toFixed(1)}" cy="${pt(i, R * v / max)[1].toFixed(1)}" r="${i === sel ? 5 : 3}" fill="${i === sel ? '#F2E9DA' : '#111'}" stroke="#111" stroke-width="2"/>`).join('')}</svg>`;
  }
  function profileCard({ coop = 'linked', prayed = false, friend = true, loggedIn = true, pactState = 'active' } = {}) {
    let tab = 'attrs', sel = 0, cs = coop, pr = prayed;
    const p = { nickname: '新岛真', userId: 'queen_makoto', totalLv: 31, hard: false, totalPoints: 4280, unlocked: 17, lv: { knowledge: 5, guts: 3, dexterity: 2, kindness: 3, charm: 2 }, goal: { title: '期末全科 A', subtitle: '还剩 12 天 · 每天自习 3 小时' } };
    const vals = P5.ATTR_ORDER.map((k) => p.lv[k]);
    const attrsHTML = () => `<div class="pf-att"><div class="pf-rw">${radarSVG(vals, 5, sel)}<small>外圈 = LV 5</small></div>
      <div class="pf-axes">${P5.ATTR_ORDER.map((k, i) => `<button type="button" data-a="ax" data-v="${i}" aria-pressed="${sel === i}"><b>${P5.ATTR[k].name}</b><small>LV${vals[i]}</small></button>`).join('')}</div>
      <div class="pf-selr"><span>${P5.ATTR[P5.ATTR_ORDER[sel]].en}</span><b>LV${vals[sel]}: ${RANKS[P5.ATTR_ORDER[sel]][vals[sel]] || ''}</b></div>
      <div class="pf-mini"><div><span>TOTAL POINTS</span><b>${p.totalPoints.toLocaleString()}</b></div><div><span>UNLOCKED</span><b>${p.unlocked}</b></div></div><p class="oc-note c">最近同步：12 分钟前</p></div>`;
    const actsHTML = () => { const [l, s, tone] = COOP_ST[cs]; return `<div class="pf-acts">
        <button type="button" class="pf-btn pray ${pr || !loggedIn ? 'off' : ''}" data-a="pray" ${pr || !loggedIn ? 'disabled' : ''}><b>${U.star('var(--paper)', 'var(--ink)', 1.4)}${!loggedIn ? '登录后可祈愿' : pr ? '今日已祈愿' : '为 Ta 祈愿'}</b><small>${pr ? '凌晨 4 点刷新' : '双方各 +2 SP'}</small></button>
        <button type="button" class="pf-btn coop ${tone}" data-a="coop" ${tone === 'cd' || tone === 'wait' || tone === 'ok' ? 'aria-disabled="true"' : ''}><b>${l}</b><small>${s}</small></button></div>
        <p class="oc-note c">Ta 给你的 SP 会先攒在通知里；开启逆影战场后自动入账。</p>
        ${friend ? '<button type="button" class="oc-link danger" data-a="sever">解除好友关系</button>' : ''}`; };
    const bodyHTML = () => `<div class="pf-top"><span class="pf-av">${P5.maskHTML(64, 'white')}</span><div class="pf-id"><b>${p.nickname}</b><small>@${p.userId}</small><span class="pf-tags"><i class="tag">ONLINE</i><i class="pf-lv${p.hard ? ' hard' : ''}">LV ${p.totalLv}</i></span></div></div>
      <div class="pf-goal"><b>◎ ${p.goal.title}</b><small>${p.goal.subtitle}</small></div>
      ${friend ? `<div class="oc-tabs">${[['attrs', 'FIVE ATTRIBUTES'], ['pact', 'TOGETHER']].map(([k, l]) => `<button type="button" data-a="tab" data-v="${k}" aria-selected="${tab === k}">${l}${k === 'pact' ? '<i class="dot"></i>' : ''}</button>`).join('')}</div>` : '<p class="oc-k">FIVE ATTRIBUTES</p>'}
      <div class="pf-pane">${tab === 'attrs' ? attrsHTML() : pactPanelHTML(p.nickname, pactState, true)}</div>${actsHTML()}`;
    const d = dialog({ eyebrow: 'GUEST PROFILE', title: p.nickname, sub: '在线同伴 · 名片', seed: 201, cls: 'oc-prof', body: bodyHTML(),
      demo: [['linked', '已缔结'], ['pending_out', '等响应'], ['pending_in', '待我响应'], ['cooldown_rejected', '冷却'], ['none', '未缔结'], ['prayed', '已祈愿'], ['stranger', '非好友']], demoCur: coop,
      onDemo: (k, api) => { if (k === 'prayed') pr = true; else if (k === 'stranger') { friend = false; tab = 'attrs'; } else { cs = k; friend = true; pr = false; } api.set(bodyHTML(), null); },
      on: Object.assign(pactOn(p.nickname, (s) => { pactState = s; d.set(bodyHTML(), null, false); }), {
        tab: (t) => { tab = t.dataset.v; d.set(bodyHTML(), null, false); P5.panelIn(d.body.querySelectorAll('.pf-pane > *'), { from: 'right' }); },
        ax: (t) => { sel = +t.dataset.v; d.body.querySelector('.pf-pane').innerHTML = attrsHTML(); },
        pray: () => { pr = true; d.set(bodyHTML(), null, false); prayer({ kind: 'sent', target: p.nickname }); },
        coop: () => { if (cs === 'pending_in') accept(p.nickname); else if (cs === 'none') propose(p.nickname); else P5.toast(COOP_ST[cs][1]); },
        sever: () => confirmDlg({ eyebrow: 'UNFRIEND', title: '解除好友关系', text: `确认要与 ${p.nickname} 解除好友？<br>解除后 7 天内无法再次相互邀请。`, ok: '确认解除', onOk: () => { d.close(); P5.toast('已解除好友'); } }),
      }) });
    return d;
  }
  OC.profileCard = profileCard;

  /* ══════════ PrayerEffectOverlay —— 祈愿特效（sent 1.8s / reciprocal 2.4s，自动消失） ══════════ */
  function prayer({ kind = 'sent', target = '新岛真' } = {}) {
    const rec = kind === 'reciprocal', dur = rec ? 2400 : 1800, cmp = compact();
    const v = document.createElement('div'); v.className = 'oc-pray'; v.setAttribute('role', 'status');
    const n = cmp ? 10 : 18;
    v.innerHTML = `<div class="pr-glow"></div><div class="pr-rays">${Array.from({ length: 16 }, (_, i) => `<i style="transform:rotate(${i * 22.5}deg)"></i>`).join('')}</div>
      <svg class="pr-star" viewBox="0 0 200 200"><path d="M100 4 C108 70 130 92 196 100 C130 108 108 130 100 196 C92 130 70 108 4 100 C70 92 92 70 100 4Z" fill="#111" transform="translate(8 9)"/><path d="M100 4 C108 70 130 92 196 100 C130 108 108 130 100 196 C92 130 70 108 4 100 C70 92 92 70 100 4Z" fill="#F2E9DA" stroke="#111" stroke-width="5"/>${rec ? '<path d="M100 40 C104 84 116 96 160 100 C116 104 104 116 100 160 C96 116 84 104 40 100 C84 96 96 84 100 40Z" fill="#D7000F"/>' : '<circle cx="100" cy="100" r="16" fill="#D7000F" stroke="#111" stroke-width="4"/>'}</svg>
      <div class="pr-txt"><em>${rec ? 'RECIPROCAL' : 'A PRAYER SENT'}</em><b>${rec ? '愿望之光交汇' : '愿望已送达'}</b><span>${rec ? `你与 <i>${esc(target)}</i> 今日互祈` : `送给 <i>${esc(target)}</i> · 双方 +2 SP`}</span></div>
      ${Array.from({ length: n }, (_, i) => `<i class="pr-p" data-i="${i}" style="background:${i % 3 ? '#F2E9DA' : '#111'}"></i>`).join('')}`;
    document.body.appendChild(v); v.style.zIndex = 880;
    P5.sfx('success', .4);
    const done = () => v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, fill: 'both' }).onfinish = () => v.remove();
    v.onclick = done; setTimeout(done, dur);
    if (RD()) return;
    A(v, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'backwards' });
    A(v.querySelector('.pr-star'), [{ transform: 'scale(0) rotate(-120deg)' }, { transform: 'scale(1.15) rotate(8deg)', offset: .55 }, { transform: 'scale(1) rotate(0)' }], { duration: 640, easing: OVER });
    A(v.querySelector('.pr-rays'), [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.3) rotate(0)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1) rotate(20deg)', offset: .4 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.2) rotate(40deg)' }], { duration: dur - 200 });
    A(v.querySelector('.pr-glow'), [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.4)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: .4 }, { opacity: .5, transform: 'translate(-50%,-50%) scale(1.1)' }], { duration: dur - 200 });
    A(v.querySelector('.pr-txt'), [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 260, fill: 'backwards' });
    v.querySelectorAll('.pr-p').forEach((p, i) => { const a = i / n * 6.283 + .2, r = 120 + (i * 41) % 110; A(p, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.4)' }, { opacity: 1, offset: .3 }, { opacity: 0, transform: `translate(calc(-50% + ${(Math.cos(a) * r).toFixed(0)}px),calc(-50% + ${(Math.sin(a) * r).toFixed(0)}px)) scale(.3) rotate(${i * 40}deg)` }], { duration: rec ? 1400 : 1000, delay: 120 + (i % 5) * 40, easing: 'ease-out' }); });
  }
  OC.prayer = prayer;

  /* ══════════ PactPanel + PactQuickEntry + PactModals（TOGETHER · 一起进步） ══════════ */
  const PACT = { title: '每天背 50 个单词', kind: 'daily', days: 14, idx: 3, synced: 2, streak: 2, mode: 'same' };
  const pactTerms = (p) => `${p.kind === 'daily' ? (p.days ? `每天打卡 · ${p.days} 天` : '每天打卡 · 不设期限') : `一次性目标 · 截止 ${p.deadline || '11-01'}`} · ${p.mode === 'same' ? '共同目标' : '各做各的'}`;
  function pactPanelHTML(name, s, bare) {
    let b = '';
    if (s === 'nologin') b = `<p class="oc-note">登录后可以和 ${esc(name)} 约一起进步。</p>`;
    if (s === 'none') b = `<p class="oc-note">约好一件事各自去做：每天打卡，或者截止日前各完成一次。同一天两人都完成，亲密度 +1。</p>${U.btn(bare ? '发起共同行动' : '发起一起进步', { tone: 'red', seed: 211, attrs: 'data-a="pnew"' })}`;
    if (s === 'out') b = `<b class="pc-t">已邀请：「${PACT.title}」</b><small class="pc-s">${pactTerms(PACT)} · 等 ${esc(name)} 回应（3 天内有效）</small><button type="button" class="oc-link" data-a="pend">撤回邀请</button>`;
    if (s === 'in') b = `<b class="pc-t">${esc(name)} 邀请你：「${PACT.title}」</b><small class="pc-s">${pactTerms(PACT)}</small>${U.btn('查看并回应', { tone: 'red', seed: 212, attrs: 'data-a="pview"' })}`;
    if (s === 'active' || s === 'ending') b = `<b class="pc-t">「${PACT.title}」</b><small class="pc-s">第 ${PACT.idx} 天 / 共 ${PACT.days} 天 · 同步 ${PACT.synced} 天 · 连续 ${PACT.streak} 天</small>
      <div class="pc-me"><span class="ok">你今天：已完成 ✓</span><span>${esc(name)}今天：还没完成</span></div><p class="pc-nudged">${esc(name)} 今天催你了</p><p class="oc-note">同一天都完成，亲密度 +1；连续同步满 7 天再 +2。</p>
      <div class="pc-acts">${s === 'ending' ? U.btn('不结束', { tone: 'paper', seed: 213, attrs: 'data-a="pnoend"', size: 'sm' }) + U.btn('确定结束', { tone: 'red', seed: 214, attrs: 'data-a="pend"', size: 'sm' }) : U.btn('催一下', { tone: 'red', seed: 215, attrs: 'data-a="pnudge"', size: 'sm' }) + U.btn('结束约定', { tone: 'paper', seed: 216, attrs: 'data-a="pask"', size: 'sm' })}</div>`;
    return `<div class="pc ${bare ? 'bare' : ''}">${bare ? '' : '<div class="pc-h"><em>TOGETHER</em><b>一起进步</b></div>'}${b}</div>`;
  }
  const pactOn = (name, set) => ({
    pnew: () => pactPropose(name), pview: () => pactAccept(name), pend: () => { set('none'); P5.toast('约定已结束'); }, pask: () => set('ending'), pnoend: () => set('active'),
    pnudge: (t) => { t.querySelector('span').textContent = '今天催过了'; t.disabled = true; P5.toast(`已催 ${name}`); },
  });
  function pactPanelModal(name = '新岛真', state = 'active') {
    let s = state;
    const d = dialog({ eyebrow: 'TOGETHER · 一起进步', title: `和 ${name} 一起进步`, sub: 'PactPanelModal（同伴详情「立下约定」打开）', seed: 221, size: 's', body: pactPanelHTML(name, s),
      demo: [['none', '无约定'], ['out', '已邀请'], ['in', '收到邀请'], ['active', '进行中'], ['nologin', '未登录']], demoCur: state, onDemo: (k, api) => { s = k; api.set(pactPanelHTML(name, s)); },
      on: pactOn(name, (n) => { s = n; d.set(pactPanelHTML(name, s), null, false); }) });
    return d;
  }
  OC.pactPanelModal = pactPanelModal; OC.pactQuick = pactQuick;
  function pactQuick() {
    const d = dialog({ eyebrow: 'PactQuickEntry', title: '立下约定（快捷入口）', sub: '同伴详情「今日互动」右侧那颗按钮的三种状态', seed: 223, size: 's',
      body: ['还没有约定', '每日打卡 · 第 3 天 / 共 14 天', '新岛真 邀请你 · 待回应'].map((s2, i) => `<button type="button" class="dt-pact${i === 2 ? ' hot' : ''}" data-a="open"><b>立下约定</b><small>${s2}</small></button>`).join(''),
      on: { open: () => pactPanelModal() } });
    return d;
  }
  function prefsHTML(pf) {
    return `<div class="oc-sec"><span class="oc-k">完成时加到（最多两项）</span>${attrChips(pf.map((x) => x.attribute), 'pattr', true)}
      ${pf.map((x, i) => `<div class="pp-pt"><b>${P5.ATTR[x.attribute].name}</b><span>每次</span><button type="button" data-a="pdec" data-v="${i}" aria-label="${P5.ATTR[x.attribute].name}减一点">−</button><em>${x.points}</em><button type="button" data-a="pinc" data-v="${i}" aria-label="${P5.ATTR[x.attribute].name}加一点">＋</button><span>点</span></div>`).join('')}</div>`;
  }
  const prefsOn = (pf, redraw) => ({
    pattr: (t) => { const k = t.dataset.v, idx = pf.findIndex((x) => x.attribute === k); if (idx >= 0) { if (pf.length > 1) pf.splice(idx, 1); } else if (pf.length < 2) pf.push({ attribute: k, points: 1 }); else pf[1] = { attribute: k, points: 1 }; redraw(); },
    pdec: (t) => { const x = pf[+t.dataset.v]; x.points = Math.max(1, x.points - 1); redraw(); }, pinc: (t) => { const x = pf[+t.dataset.v]; x.points = Math.min(5, x.points + 1); redraw(); },
  });
  function pactPropose(name = '新岛真', { isConfidant = true } = {}) {
    const v = { kind: 'daily', mode: 'same', title: '', days: 14, deadline: '', msg: '' }, pf = [{ attribute: 'knowledge', points: 2 }]; let sent = false;
    const seg = (a, cur, opts) => `<div class="seg pp-seg">${opts.map(([k, l, h]) => `<button type="button" data-a="${a}" data-v="${k}" aria-pressed="${String(cur) === String(k)}">${l}${h ? `<small>${h}</small>` : ''}</button>`).join('')}</div>`;
    const view = () => sent ? [`<div class="it-done"><div class="it-check">✓<i></i></div><p>邀请已送出</p><small>${esc(name)} 接受后，这件事会出现在你们各自的今日任务里。<br>3 天没回应会自动过期。</small></div>`, U.btn('好的', { tone: 'red', seed: 231, attrs: 'data-a="__close"' })]
      : [`<div class="fld"><span>怎么约</span>${seg('kind', v.kind, [['daily', '每日打卡', '一段时间里每天各做一次'], ['once', '一次性目标', '截止日前各完成一次']])}</div>
        <div class="fld"><span>目标</span>${seg('mode', v.mode, [['same', '共同目标', '两人做同一件事'], ['different', '不同目标', `各做各的，${esc(name)} 接受时写 Ta 的`]])}</div>
        <label class="fld"><span>${v.mode === 'same' ? '一起做的事' : '你这边要做的事'}</span><input class="inp" data-in="title" maxlength="30" value="${esc(v.title)}" placeholder="${v.kind === 'daily' ? (v.mode === 'same' ? '比如：背 50 个单词' : '比如：晨跑 3 公里') : (v.mode === 'same' ? '比如：读完一本书' : '比如：交完论文初稿')}"></label>
        ${v.kind === 'daily' ? `<div class="fld"><span>约多久</span>${seg('days', v.days, [[7, '7 天'], [14, '14 天'], [30, '30 天'], [0, '不设期限']])}</div>` : `<label class="fld"><span>截止日</span><input class="inp" type="date" data-in="deadline" value="${v.deadline}"></label>`}
        ${prefsHTML(pf)}<label class="fld"><span>对 ${esc(name)} 说一句（可选）</span><input class="inp" data-in="msg" maxlength="120" value="${esc(v.msg)}" placeholder="比如：这次一起坚持到底！"></label><p class="oc-err" hidden></p>`,
        U.btn('取消', { tone: 'paper', seed: 232, attrs: 'data-a="__close"' }) + U.btn('发出邀请', { tone: 'red', size: 'lg', seed: 233, attrs: 'data-a="send"' })];
    const draw = (anim = true) => { const [b, f] = view(); d.set(b, f, anim); d.body.querySelectorAll('[data-in]').forEach((i) => i.addEventListener('input', () => v[i.dataset.in] = i.value)); };
    const d = dialog({ eyebrow: 'TOGETHER · 一起进步', title: `和 ${name} 一起进步`, sub: isConfidant ? '约好一件事各自去做。同一天两人都完成，你们的亲密度 +1；连续同步满 7 天再 +2。' : '约好一件事各自去做，互相看得到进度，没完成可以催一下。（普通好友不涨亲密度）', seed: 235,
      on: Object.assign(prefsOn(pf, () => draw(false)), { kind: (t) => { v.kind = t.dataset.v; draw(false); }, mode: (t) => { v.mode = t.dataset.v; draw(false); }, days: (t) => { v.days = +t.dataset.v; press(t); },
        send: (t) => { if (!v.title.trim()) { const e = d.body.querySelector('.oc-err'); e.hidden = false; e.textContent = '先写下要一起做的事'; return; } t.querySelector('span').textContent = '发送中…'; setTimeout(() => { sent = true; draw(); }, 500); } }) });
    draw(false);
    return d;
  }
  OC.pactPropose = pactPropose;
  function pactAccept(name = '新岛真', { state = 'open', mode = 'different' } = {}) {
    let st = state; const pf = [{ attribute: 'knowledge', points: 2 }]; const p = Object.assign({}, PACT, { mode });
    const view = () => {
      if (st === 'invalid') return [`<p class="oc-empty">这份邀请已经不能回应了（已处理或过期）。</p>`, U.btn('知道了', { tone: 'paper', seed: 241, attrs: 'data-a="__close"' })];
      if (st === 'accepted' || st === 'declined') return [`<div class="it-done"><div class="it-check">${st === 'accepted' ? '✓' : '✕'}<i></i></div><p>${st === 'accepted' ? '约好了' : '已婉拒'}</p><small>${st === 'accepted' ? '这件事已经放进你的今日任务，完成就算打卡。' : `${esc(name)} 会收到你的回应。`}</small></div>`, U.btn('好的', { tone: 'red', seed: 242, attrs: 'data-a="__close"' })];
      return [`<div class="pa-t"><span class="oc-k">${p.mode === 'same' ? '一起做的事' : `${esc(name)} 要做的事`}</span><b>「${p.title}」</b><small>「这次一起坚持到底！」</small></div>
        ${p.mode === 'different' ? `<label class="fld"><span>你这边要做的事</span><input class="inp" maxlength="30" placeholder="比如：每天读 20 页书"></label>` : ''}${prefsHTML(pf)}`,
        U.btn('婉拒', { tone: 'paper', seed: 243, attrs: 'data-a="no"' }) + U.btn('接受', { tone: 'red', size: 'lg', seed: 244, attrs: 'data-a="yes"' })];
    };
    const draw = (anim = true) => { const [b, f] = view(); d.set(b, f, anim); };
    const d = dialog({ eyebrow: 'TOGETHER · 邀请', title: `${name} 想和你一起进步`, sub: pactTerms(p), seed: 247,
      demo: [['open', '待回应'], ['accepted', '已接受'], ['declined', '已婉拒'], ['invalid', '已失效']], demoCur: state, onDemo: (k) => { st = k; draw(); },
      on: Object.assign(prefsOn(pf, () => draw(false)), { no: (t) => { t.querySelector('span').textContent = '…'; setTimeout(() => { st = 'declined'; draw(); }, 400); }, yes: (t) => { t.querySelector('span').textContent = '处理中…'; setTimeout(() => { st = 'accepted'; draw(); }, 400); } }) });
    draw(false);
    return d;
  }
  OC.pactAccept = pactAccept;

  /* ══════════ NotificationsPanel —— 通知（未读/已读分区、全部已读、筛选战斗消息、长按多选删除、各类型行内动作） ══════════ */
  const NTF = [
    { id: 1, type: 'friend_request', from: '喜多川祐介', t: '3 分钟前', msg: '能一起去美术馆写生吗？' },
    { id: 2, type: 'coop_proposal', from: '坂本龙司', t: '20 分钟前', msg: '一起变强吧！', bond: 'pending' },
    { id: 3, type: 'pact_invite', from: '新岛真', t: '1 小时前', pact: 'pending' },
    { id: 4, type: 'prayer_received', from: '奥村春', t: '2 小时前' },
    { id: 5, type: 'coop_shadow_spawned', from: '系统', t: '5 小时前', battle: true },
    { id: 6, type: 'coop_shadow_attacked', from: '新岛真', t: '6 小时前', battle: true },
    { id: 7, type: 'coop_accepted', from: '高卷杏', t: '昨天', read: true },
    { id: 8, type: 'pact_invite', from: '佐仓双叶', t: '2 天前', read: true, pact: 'expired' },
    { id: 9, type: 'coop_proposal', from: '明智吾郎', t: '3 天前', read: true, bond: 'rejected' },
    { id: 10, type: 'coop_shadow_defeated', from: '新岛真', t: '4 天前', read: true, battle: true },
  ];
  const N_TITLE = { friend_request: '好友申请', friend_accepted: '接受了你的申请', prayer_received: '为你祈愿', coop_proposal: 'COOP 关系提议', coop_accepted: '接受了 COOP 提议', coop_shadow_spawned: '羁绊之影降临', coop_shadow_attacked: '对羁绊之影出手了', coop_shadow_defeated: '共同封印了羁绊之影', pact_invite: '邀请你一起进步' };
  const N_BODY = (n) => ({ friend_request: `想加你为好友：「${n.msg}」`, prayer_received: n.read ? '送来了 2 点 SP（已入账）。' : '送来了 2 点 SP，待入账。', coop_proposal: `想与你缔结 COOP：「${n.msg || ''}」`, coop_accepted: '接受了你的 COOP 提议 —— 在同伴列表里看 Ta。', coop_shadow_spawned: '一只羁绊之影降临了。10 天之内，每晚 18:00 到次日 07:00 可以挑战它。', coop_shadow_attacked: '使用 Johanna · 核热 · 共鸣 · 弱点 · 造成 312 伤害 · Boss 剩余 HP 1840', coop_shadow_defeated: '一起封印了这只影 —— 进入「同伴」卡片中的「共战纪念」查看图章。', pact_invite: '想和你一起：「每天背 50 个单词」（每天打卡 · 14 天 · 共同目标） 「这次一起坚持到底！」' }[n.type] || '系统消息');
  function notifications({ state = 'list' } = {}) {
    let list = NTF.map((n) => Object.assign({}, n)), hideBattle = false, selMode = false, sel = new Set(), st = state;
    const card = (n) => {
      let act = '';
      if (!n.read || n.bond || n.pact) {
        if (n.type === 'friend_request') act = U.btn('接受', { tone: 'red', size: 'sm', seed: 251, attrs: `data-a="nacc" data-v="${n.id}"` }) + U.btn('拒绝', { tone: 'paper', size: 'sm', seed: 252, attrs: `data-a="nrej" data-v="${n.id}"` });
        else if (n.type === 'coop_proposal') act = n.bond === 'pending' ? U.btn('响应', { tone: 'red', size: 'sm', seed: 253, attrs: `data-a="ncoop" data-v="${n.id}"` }) + U.btn('拒绝', { tone: 'paper', size: 'sm', seed: 254, attrs: `data-a="nrej" data-v="${n.id}"` }) : `<small class="nt-st">${{ linked: '· 已缔结 COOP，无需再响应。', rejected: '· 已拒绝这次提议。', severed: '· 此 COOP 已被解除。', expired: '· 提议已过期。' }[n.bond]}</small>`;
        else if (n.type === 'pact_invite') act = n.pact === 'pending' ? U.btn('查看', { tone: 'red', size: 'sm', seed: 255, attrs: `data-a="npact" data-v="${n.id}"` }) + U.btn('婉拒', { tone: 'paper', size: 'sm', seed: 256, attrs: `data-a="nrej" data-v="${n.id}"` }) : `<small class="nt-st">${{ active: '· 已接受这份约定。', declined: '· 已婉拒。', expired: '· 邀请已过期。' }[n.pact]}</small>`;
        if (!n.read && !['friend_request', 'coop_proposal', 'pact_invite'].includes(n.type)) act = U.btn('标为已读', { tone: 'ink', size: 'sm', seed: 257, attrs: `data-a="nread" data-v="${n.id}"` }) + U.btn('删除', { tone: 'paper', size: 'sm', seed: 258, attrs: `data-a="ndel" data-v="${n.id}"` });
      }
      if (n.read && !act.includes('btn')) act += U.btn('删除', { tone: 'paper', size: 'sm', seed: 259, attrs: `data-a="ndel" data-v="${n.id}"` });
      return `<div class="nt ${n.read ? 'rd' : ''} ${sel.has(n.id) ? 'sel' : ''}" data-n="${n.id}">${selMode ? `<i class="nt-ck">${sel.has(n.id) ? '✓' : ''}</i>` : ''}<span class="nt-av">${esc(n.from.slice(0, 1))}</span><div class="nt-m"><div class="nt-h"><b>${esc(n.from)}</b><em>${n.type.startsWith('coop_shadow') ? (n.type.endsWith('attacked') ? '' : '') : ''}${N_TITLE[n.type]}</em><small>${n.t}</small></div><p>${esc(N_BODY(n))}</p>${selMode ? '' : `<div class="nt-a">${act}</div>`}</div></div>`;
    };
    const bodyHTML = () => {
      const vis = list.filter((n) => !(hideBattle && n.battle)), un = vis.filter((n) => !n.read), rd = vis.filter((n) => n.read);
      const filt = `<div class="nt-filter"><span>筛选</span><button type="button" class="oc-pill ${hideBattle ? 'on' : ''}" data-a="hideb">${hideBattle ? '已隐藏战斗消息' : '显示战斗消息'}</button><small>长按通知进入多选</small></div>`;
      if (st === 'loading') return filt + `<p class="oc-empty">加载中…</p>`;
      if (st === 'empty' || !vis.length) return filt + `<div class="oc-empty big">${P5.sil('cat', { style: 'height:90px;width:auto' })}<p>这里空无一物。<br>好友申请、回应、祈愿都会在这里提醒你。</p></div>`;
      return filt + (un.length ? `<h4 class="nt-sec">新消息</h4>${un.map(card).join('')}` : '') + (rd.length ? `<h4 class="nt-sec">已读</h4>${rd.map(card).join('')}` : '') + `<p class="nt-bad">这条通知的内容有问题，先跳过了（长按可以删）。</p>`;
    };
    const headSync = () => {
      const unread = list.filter((n) => !n.read).length;
      const h = d.dlg.querySelector('.nt-tools');
      h.innerHTML = selMode ? `<span class="nt-selm"><b>多选模式</b><small>已选 ${sel.size} 条</small></span><button type="button" class="nt-tool danger" data-a="delsel" aria-label="删除所选" title="删除 ${sel.size} 条" ${sel.size ? '' : 'disabled'}>🗑 删除</button><button type="button" class="nt-tool" data-a="cancelsel">取消</button>`
        : (unread ? `<button type="button" class="nt-tool" data-a="allread">全部已读</button>` : '');
      d.head(unread ? `${unread} 条未读` : '没有新消息');
    };
    const draw = (anim) => { d.set(bodyHTML(), null, anim); headSync(); bind(); };
    const bind = () => d.body.querySelectorAll('.nt').forEach((el) => { P5.longPress(el, () => { if (!selMode) { selMode = true; sel = new Set([+el.dataset.n]); draw(false); } }); el.addEventListener('click', (e) => { if (!selMode || e.target.closest('[data-a]')) return; const id = +el.dataset.n; sel.has(id) ? sel.delete(id) : sel.add(id); draw(false); }); });
    const find = (t) => list.find((n) => n.id === +t.dataset.v);
    const d = dialog({ eyebrow: 'NOTICE', title: '通知', sub: '', seed: 261, cls: 'oc-ntf', body: '',
      demo: [['list', '有消息'], ['loading', '加载中'], ['empty', '空']], demoCur: state, onDemo: (k) => { st = k; draw(true); },
      on: {
        allread: () => { list.forEach((n) => n.read = true); draw(false); }, hideb: () => { hideBattle = !hideBattle; draw(false); },
        cancelsel: () => { selMode = false; sel.clear(); draw(false); }, delsel: () => { list = list.filter((n) => !sel.has(n.id)); P5.toast(`已删除 ${sel.size} 条`); selMode = false; sel.clear(); draw(false); },
        nacc: (t) => { const n = find(t); n.read = true; n.type = 'friend_accepted'; P5.toast('已接受好友申请'); draw(false); },
        nrej: (t) => { const n = find(t); n.read = true; if (n.bond) n.bond = 'rejected'; if (n.pact) n.pact = 'declined'; P5.toast('已处理'); draw(false); },
        ncoop: (t) => accept(find(t).from), npact: (t) => pactAccept(find(t).from, { mode: 'same' }),
        nread: (t) => { find(t).read = true; draw(false); }, ndel: (t) => { list = list.filter((n) => n !== find(t)); draw(false); },
      } });
    d.dlg.querySelector('.oc-hd').insertAdjacentHTML('beforeend', '<div class="nt-tools"></div>');
    draw(false);
    return d;
  }
  OC.notifications = notifications;

  /* ══════════ CounselChatModal —— 谏言（开始前 / 对话中 / 冷却 / 已过期；@同伴；打断；暂离；归档） ══════════ */
  const REPLIES = ['我在听。你说「又搞砸了」——是哪一部分让你最在意？', '换个角度：如果是龙司遇到这件事，你会怎么劝他？', '你已经做了你能做的那部分。剩下的，交给明天的你。'];
  function counselChat({ state = 'start', mention, noKey = true, connErr = false } = {}) {
    let st = state, msgs = [], replying = false, picker = false, mentions = mention ? [mention.id] : [], timerT = 0, left = 59 * 60 + 12, replyT = 0, ri = 0;
    const live = () => st === 'live';
    const mm = () => `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
    const msgHTML = (m, i) => `<div class="cc-m ${m.u ? 'u' : 'r'}">${(i === 0 || msgs[i - 1].u !== m.u) ? `<span class="cc-who">${m.u ? '你' : '残响'}</span>` : ''}<p>${esc(m.t)}</p>${m.cut ? '<small>已打断</small>' : ''}</div>`;
    const banners = () => `${noKey ? `<div class="cc-ban warn"><b>⚠ 尚未配置 AI 密钥。</b><span>现在是简版离线回复；到「设置 → AI 服务」填入密钥后，残响才会真正用心听你说。</span></div>` : ''}${connErr ? `<div class="cc-ban err"><b>⚠ 无法连接到 AI 服务。</b><span>刚才这次临时退回了离线回复。网络恢复后再发一条试试。</span><small>Failed to fetch</small><button type="button" data-a="xban" aria-label="关闭提示">✕</button></div>` : ''}`;
    const view = () => {
      if (st === 'expired') return `<div class="cc-state"><h4>这次谈话已经过去了</h4><p>一小时的窗口已经合上，聊天记录随之散去。<br>想说的话还没说完，可以再开一次。</p><div class="oc-row2">${U.btn('再开一次', { tone: 'red', seed: 271, attrs: 'data-a="start"' })}${U.btn('离开', { tone: 'paper', seed: 272, attrs: 'data-a="__close"' })}</div></div>`;
      if (st === 'cooldown') return `<div class="cc-state"><h4>谏言冷却中</h4><p>每 3 天一次，留出余地给沉淀。<br>下一次可在 <b>10-22</b> 开启（还有 2 天）。</p>${U.btn('先回到房间', { tone: 'paper', seed: 273, attrs: 'data-a="__close"' })}</div>`;
      const pickList = CF.map((c) => `<button type="button" class="cc-chip ${mentions.includes(c.id) ? 'on' : ''}" data-a="mtog" data-v="${c.id}">@${esc(c.name)}</button>`).join('');
      return `${banners()}<div class="cc-log" aria-live="polite">${st === 'start' ? `<div class="cc-intro">${P5.sil('point', { style: 'height:120px;width:auto' })}<p>房间的尽头，有人一直注视着你——<br>准备好了就按下去，Ta 会先开口。</p>${U.btn('开始对话', { tone: 'red', size: 'lg', seed: 274, attrs: 'data-a="start"' })}<small>每 3 天可以开一次，开始后一小时内随便聊，到点原文就散了；想留个念想可以归档成一小段摘要。</small></div>` : msgs.map(msgHTML).join('') + (replying ? '<div class="cc-m r typing" role="status" aria-label="残响正在说"><span class="cc-who">残响</span><p><i></i><i></i><i></i> 正在说…</p></div>' : '')}</div>
        ${mentions.length ? `<div class="cc-ments">${mentions.map((id) => { const c = CF.find((x) => x.id === id); return `<button type="button" class="cc-chip on" data-a="mtog" data-v="${id}">@${esc(c.name)} ✕</button>`; }).join('')}</div>` : ''}
        ${picker ? `<div class="cc-pick"><div><span>关心的人</span><button type="button" class="oc-link" data-a="pick">收起</button></div><div class="cc-pl">${pickList || '<p class="oc-note">还没有登记过同伴。可以先在同伴页里新建一位。</p>'}</div></div>` : ''}
        <div class="cc-in"><button type="button" class="cc-at" data-a="pick" aria-label="选择同伴">@</button><textarea rows="1" data-in="m" aria-label="给残响的话" placeholder="${!live() ? '先按上面的「开始对话」吧' : replying ? '想插话就直接说' : '把它说出来…'}" ${live() ? '' : 'disabled'}></textarea>${replying ? `<button type="button" class="cc-stop" data-a="cut">打断</button>` : ''}<button type="button" class="cc-send" data-a="send" disabled>发送</button></div>
        <div class="cc-meta"><span>${msgs.length} 条消息${replying ? ' · 正在说' : ''}</span><button type="button" class="oc-link" data-a="arch" ${msgs.length ? '' : 'disabled'}>归档这次谈话</button></div>`;
    };
    const draw = (anim = false) => {
      d.set(view(), null, anim);
      const ta = d.body.querySelector('[data-in="m"]'), sb = d.body.querySelector('[data-a="send"]');
      if (ta) { ta.addEventListener('input', () => { sb.disabled = !ta.value.trim() || !live(); }); ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sb.click(); } }); }
      const log = d.body.querySelector('.cc-log'); if (log) log.scrollTop = log.scrollHeight;
      d.dlg.querySelector('.cc-timer').hidden = !live(); d.dlg.querySelector('.cc-timer b').textContent = mm();
    };
    const reply = () => { replying = true; draw(); replyT = setTimeout(() => { replying = false; msgs.push({ u: 0, t: REPLIES[ri++ % REPLIES.length] }); draw(); }, 1400); };
    const startLive = () => { st = 'live'; msgs = [{ u: 0, t: '你来了。今天想从哪里说起？' }]; clearInterval(timerT); timerT = setInterval(() => { left = Math.max(0, left - 1); const b = d.dlg.querySelector('.cc-timer b'); if (b) { b.textContent = mm(); b.parentElement.classList.toggle('warn', left < 300); } }, 1000); draw(true); };
    const d = dialog({ eyebrow: '✧ COUNSEL', title: '谏言', sub: '房间的尽头，有人一直注视着你', seed: 281, cls: 'oc-cc', size: 'l', closeOnVeil: false,
      demo: [['start', '开始前'], ['live', '对话中'], ['err', '连接失败'], ['cooldown', '冷却中'], ['expired', '已过期']], demoCur: state,
      onDemo: (k) => { clearTimeout(replyT); replying = false; connErr = k === 'err'; if (k === 'live' || k === 'err') { startLive(); msgs.push({ u: 1, t: '今天组会又搞砸了。' }, { u: 0, t: REPLIES[0] }); draw(); } else { st = k; clearInterval(timerT); draw(true); } },
      onClose: () => { clearInterval(timerT); clearTimeout(replyT); },
      on: {
        start: startLive, xban: () => { connErr = false; draw(); }, pick: () => { picker = !picker; draw(); },
        mtog: (t) => { const id = t.dataset.v; mentions = mentions.includes(id) ? mentions.filter((x) => x !== id) : [...mentions, id]; draw(); },
        send: () => { const ta = d.body.querySelector('[data-in="m"]'); const v = ta.value.trim(); if (!v) return; if (replying) { clearTimeout(replyT); replying = false; msgs.push({ u: 0, t: '……', cut: 1 }); } msgs.push({ u: 1, t: v }); reply(); },
        cut: () => { clearTimeout(replyT); replying = false; msgs.push({ u: 0, t: '……', cut: 1 }); draw(); },
        arch: () => confirmDlg({ eyebrow: 'ARCHIVE', title: '归档这次谈话？', text: '会把刚才的聊天浓缩成 ≤100 字的摘要放进归档库，原文随窗口关闭散去。', ok: '归档', onOk: () => { d.close(); P5.toast('已归档到谏言归档库'); } }),
      } });
    // 关闭键 = 要离开了吗？（对话中才问）
    const x = d.dlg.querySelector('.oc-x'); x.dataset.a = 'exit';
    d.el.addEventListener('click', (e) => {
      if (!e.target.closest('[data-a="exit"]')) return;
      if (!live()) return d.close();
      const ex = dialog({ size: 's', eyebrow: 'LEAVE?', title: '要离开了吗？', seed: 283, body: `<p class="oc-p">可以先暂离，一小时内回来接着聊；也可以就此结束，把这次谈话归档成一小段摘要。</p>`,
        foot: `<div class="oc-col">${U.btn('暂离 · 一小时内可回来', { tone: 'ink', seed: 284, attrs: 'data-a="stay"' })}${U.btn('结束对话 · 归档这次谈话', { tone: 'red', seed: 285, attrs: 'data-a="end"' })}${U.btn('再想想', { tone: 'paper', seed: 286, attrs: 'data-a="__close"' })}</div>`,
        on: { stay: () => { ex.close(); d.close(); P5.toast('已暂离 · 一小时内可回来'); }, end: (t) => { t.querySelector('span').textContent = '正在归档…'; setTimeout(() => { ex.close(); d.close(); P5.toast('已归档到谏言归档库'); }, 500); } } });
    });
    d.dlg.querySelector('.oc-ttl').insertAdjacentHTML('afterend', `<div class="cc-timer" aria-label="窗口剩余时间" hidden><b>${mm()}</b></div>`);
    if (st === 'live') startLive(); else draw();
    return d;
  }
  OC.counselChat = counselChat;

  /* ══════════ CounselArchiveModal —— 谏言归档库（列表 / @同伴 / 删除确认 / 空） ══════════ */
  function counselArchive({ empty = false } = {}) {
    let items = empty ? [] : [{ id: 1, d: '2026-10-18', n: 23, m: [CF[0]], s: '关于龙司：你怕的不是吵架，是吵完之后没人先开口。下次你可以先发那条消息。' }, { id: 2, d: '2026-10-12', n: 15, m: [CF[3], CF[1]], s: '期中前的焦虑。你把「做不完」拆成了三件今天能做的小事。' }, { id: 3, d: '2026-09-30', n: 8, m: [], s: '一个人的晚上，聊了很久以前的事。' }];
    const html = () => items.length ? items.map((a) => `<div class="ca-it"><div class="ca-h"><span>${a.d} · ${a.n} 条</span><button type="button" class="oc-link danger" data-a="del" data-v="${a.id}" aria-label="删除 ${a.d} 的归档">删除</button></div>${a.m.length ? `<div class="ca-m">${a.m.map((c) => `<i>@${esc(c.name)}</i>`).join('')}</div>` : ''}<p>${esc(a.s)}</p></div>`).join('') : `<div class="oc-empty big">${U.star('var(--red)', 'var(--ink)', 1.4)}<p>归档库还是空的。<br>聊完之后点「归档」，这次谈话的摘要会留在这里。</p></div>`;
    const d = dialog({ eyebrow: '✧ ARCHIVE', title: '谏言归档库', sub: `${items.length} 次被你亲手存下的谈话`, seed: 291, body: html(),
      demo: [['list', '有归档'], ['empty', '空']], demoCur: empty ? 'empty' : 'list', onDemo: (k, api) => { api.close(); counselArchive({ empty: k === 'empty' }); },
      on: { del: (t) => confirmDlg({ eyebrow: 'DELETE', title: '删除这条归档？', text: '删除后不可恢复。', ok: '删除', onOk: () => { items = items.filter((a) => a.id !== +t.dataset.v); d.set(html(), null); d.head(`${items.length} 次被你亲手存下的谈话`); } }) } });
    return d;
  }
  OC.counselArchive = counselArchive;

  /* ══════════ CoopMemorialPanel —— 共战纪念（图章列表 / 空） ══════════ */
  function memorial(cf = CF[3], { empty = false } = {}) {
    const ms = empty ? [] : cf.memorials.length ? cf.memorials : CF[3].memorials;
    const d = dialog({ eyebrow: 'MEMORIAL · 共战纪念', title: '共战纪念', sub: `与 <b>${esc(cf.name)}</b> 共击暗影的全部记录`, seed: 301,
      body: ms.length ? ms.map((m, i) => `<div class="mm"><span class="mm-st" style="--r:${i % 2 ? 6 : -8}deg"><svg viewBox="0 0 100 100"><polygon points="${star(50, 52, 48)}" fill="#D7000F" stroke="#111" stroke-width="4"/></svg><b>封</b></span><div><b>${m.shadowName}</b><span class="tag ink">弱点 · ${P5.ATTR[m.weak].name}</span><small>${m.date} · 你的贡献 <b>${m.contribution}%</b></small></div></div>`).join('') : `<div class="oc-empty big">${P5.sil('crouch', { style: 'height:80px;width:auto' })}<p>还没有共战记录。<br>下一次月相之夜，等待羁绊之影的降临。</p></div>`,
      demo: [['list', '有图章'], ['empty', '空']], demoCur: empty ? 'empty' : 'list', onDemo: (k, api) => { api.close(); memorial(cf, { empty: k === 'empty' }); } });
    if (!RD()) d.dlg.querySelectorAll('.mm-st').forEach((s, i) => A(s, [{ transform: 'scale(2.2) rotate(-30deg)', opacity: 0 }, { transform: 'scale(1) rotate(var(--r))', opacity: 1 }], { duration: 420, delay: 300 + i * 120, easing: SLAM, fill: 'backwards' }));
    return d;
  }
  OC.memorial = memorial;

  /* ══════════ CoopShadowBattleModal —— COOP SHADOW HUNT（识破 → 入场 → 战斗：HP / COMBO / 共鸣 / 共享增益 / 日志 / ALL-OUT / 属性 Tab / 技能卡） ══════════ */
  const SKILLS = { knowledge: [['核热', 'damage', 48, 6], ['冰冻', 'damage', 40, 4], ['集中', 'charge', 0, 8, 2], ['易伤', 'debuff', 0, 6, 3]], guts: [['猛击', 'damage', 52, 7], ['会心一击', 'crit', 60, 9]], dexterity: [['连射', 'damage', 36, 3]], kindness: [['治愈之风', 'heal', 0, 5], ['攻击强化', 'attack_boost', 0, 6, 3]], charm: [] };
  const SK_T = { damage: '伤害', crit: '暴击', charge: '蓄力', buff: '强化', debuff: '弱化', heal: '治疗', attack_boost: '攻击强化' };
  const shadowSVG = (hp) => `<svg viewBox="0 0 120 120" class="sb-boss" aria-hidden="true"><polygon points="${star(60, 62, 56, -90, .5)}" fill="#111"/><polygon points="${star(60, 62, 44, -54, .55)}" fill="#8E0010"/><ellipse cx="44" cy="58" rx="9" ry="5" fill="#F2E9DA"/><ellipse cx="76" cy="58" rx="9" ry="5" fill="#F2E9DA"/><circle cx="44" cy="58" r="3" fill="#D7000F"/><circle cx="76" cy="58" r="3" fill="#D7000F"/><path d="M40 80 L48 74 L56 82 L64 74 L72 82 L80 76" fill="none" stroke="#F2E9DA" stroke-width="3"/>${hp < 50 ? '<path d="M28 30 L52 52 M90 26 L70 50" stroke="#F2E9DA" stroke-width="3"/>' : ''}</svg>`;
  function shadowBattle({ phase = 'battle', partner = '新岛真' } = {}) {
    let ph = phase, attr = 'knowledge', exp = -1, combo = 3, hp = 1840, myId = false, err = '', status = 'ok';
    const HPM = 3000, weak = 'knowledge';
    const log = [['新岛真', 'Johanna · 核热', 312, '共鸣 ×1.5', '弱点'], ['你', 'Arsène · 易伤', 0, '施加易伤'], ['新岛真', 'Johanna · 冰冻', 188, '', '']];
    const skillCard = (s, i) => { const [n, ty, pwr, sp, turns] = s, dmg = ty === 'damage' || ty === 'crit'; return `<div class="sk ${exp === i ? 'ex' : ''}"><button type="button" class="sk-main" data-a="fire" data-v="${i}" ${status !== 'ok' ? 'disabled' : ''}><span class="sk-r1"><b>${n}</b><i class="sk-ty ${ty}">${SK_T[ty]}</i></span><span class="sk-r2">${dmg ? `<em>PWR ${pwr}</em>` : `<em><small>持续</small> ${turns || 1} <small>回合</small></em>`}<span>SP ${sp}</span></span></button><button type="button" class="sk-ex" data-a="skex" data-v="${i}">${exp === i ? '收起' : '简介'}</button>${exp === i ? `<p class="sk-d">${dmg ? '对羁绊之影造成伤害；命中弱点时伤害 ×1.3 并累计 COMBO。' : '为双方施加效果，持续数回合。'}</p>` : ''}${attr === weak && dmg ? '<i class="sk-badge w">弱点</i>' : ''}${i === 0 && dmg ? '<i class="sk-badge r">共鸣</i>' : ''}</div>`; };
    const view = () => {
      const errH = err ? `<p class="oc-err">${err}</p>` : '';
      if (ph === 'identify') return `<div class="sb-boss-w unknown">${shadowSVG(100)}<b>？？？</b><p>一只躲在阴影里的羁绊之影。它模仿着你们之间说不出口的那件事。</p></div>
        <div class="sb-idp"><span class="oc-k">识破进度 · BREAK THROUGH</span><div class="sb-pills"><span class="${myId ? 'ok' : ''}"><i>${myId ? '✓' : '…'}</i>你</span><em>×</em><span class="ok"><i>✓</i>@${partner}</span></div></div>${errH}
        ${myId ? `<p class="sb-wait">✓ 你已识破 · 等待 @${partner} 一起揭开真相</p>` : U.btn('🌑 识破 SHADOW', { tone: 'red', size: 'lg', seed: 311, attrs: 'data-a="identify"', cls: 'sb-idbtn' })}<p class="oc-note c">两人都识破后，这只影的真身才会现形。</p>`;
      if (ph === 'entering') return `<div class="sb-enter">${shadowSVG(100)}<b>嫉妒之影 · 双面镜</b><q>"你们终于看清我了。"</q></div>`;
      const pct = Math.round(hp / HPM * 100), sk = SKILLS[attr];
      const stMsg = { done: `你今日已出手 · 明天 18:00 后再来${combo >= 5 ? '<small>（总攻击仍可使用）</small>' : ''}`, closed: '月相攻击窗口已闭合（每日 18:00 – 次日 07:00）', defeated: '羁绊之影已封印', nopersona: '你还没有创建 Persona —— 先去「逆影战场」召唤一位面具' }[status];
      return `<div class="sb-top"><div class="sb-boss-w">${shadowSVG(pct)}</div><div class="sb-info"><b>嫉妒之影 · 双面镜</b><span class="tag">弱点：${P5.ATTR[weak].name}</span><small>×1.3 伤害 · 弱点命中 COMBO +1</small>
        <div class="sb-hp"><span>HP</span><div class="bar"><i style="--p:${pct / 100}"></i></div><em>${hp.toLocaleString()} / ${HPM.toLocaleString()}</em></div>
        <div class="sb-chips">${combo >= 5 ? '<span class="sb-ready">ALL-OUT READY</span>' : `<span class="sb-combo">COMBO × ${combo}</span>`}<span class="sb-buff" title="双方伤害 ×1.2">⚔ 攻击强化 · 剩 2 回合</span><span class="sb-buff" title="Boss 受到的伤害 ×1.15">◎ 易伤 · 剩 1 回合</span></div></div></div>
        <div class="sb-res"><b>@${partner} 留下了共鸣印记</b><small>接力出手 · 下一击伤害 ×1.5 · 还剩 5h 12m</small></div>
        <div class="sb-log"><span class="oc-k">战斗日志</span>${log.length ? log.map((l) => `<div><b>${l[0]}</b><span>${l[1]}</span>${l[2] ? `<em>−${l[2]}</em>` : `<em class="b">${l[3]}</em>`}${l[2] && l[3] ? `<i class="r">${l[3]}</i>` : ''}${l[4] ? '<i class="w">弱点</i>' : ''}</div>`).join('') : '<p class="oc-note">尚无交手记录 —— 谁先出手？</p>'}</div>
        ${combo >= 5 ? `<button type="button" class="sb-allout" data-a="allout"><b>⚡ ALL-OUT ATTACK ⚡</b><small>(Lv14 + Lv15) × COMBO 5 ≈ 1450</small></button>` : ''}
        ${stMsg ? `<p class="sb-stmsg">${stMsg}</p>` : ''}${errH}
        ${status === 'ok' || status === 'done' ? `<div class="sb-eq"><span>装备中 · <b>Arsène · ${P5.ATTR[attr].name}</b></span></div><div class="oc-tabs sm">${P5.ATTR_ORDER.map((k) => `<button type="button" data-a="sattr" data-v="${k}" aria-selected="${attr === k}">${P5.ATTR[k].name}</button>`).join('')}</div>
        <div class="sk-grid">${sk.length ? sk.map(skillCard).join('') : '<p class="oc-note c">此属性尚无可用技能（需要提升等级）</p>'}</div>` : ''}`;
    };
    const draw = (anim = false) => d.set(view(), null, anim);
    const d = dialog({ eyebrow: '⚔ COOP SHADOW HUNT', title: `与 @${partner} 共战`, sub: '月相之夜 · 每日 18:00 – 次日 07:00', seed: 321, size: 'l', cls: 'oc-sb',
      demo: [['identify', '识破'], ['entering', '入场'], ['battle', '战斗'], ['ready', 'ALL-OUT'], ['done', '已出手'], ['closed', '窗口闭合'], ['nopersona', '无面具']], demoCur: phase,
      onDemo: (k) => { err = ''; status = 'ok'; combo = 3; if (k === 'identify' || k === 'entering') { ph = k; myId = false; if (k === 'entering') setTimeout(() => ph === 'entering' && (ph = 'battle', draw(true)), 2200); } else { ph = 'battle'; if (k === 'ready') combo = 5; if (['done', 'closed', 'nopersona'].includes(k)) status = k; } draw(true); if (ph === 'entering') entr(); },
      on: {
        identify: () => { myId = true; ph = 'entering'; draw(true); entr(); setTimeout(() => { if (ph === 'entering') { ph = 'battle'; draw(true); } }, 2200); },
        sattr: (t) => { attr = t.dataset.v; exp = -1; draw(); }, skex: (t) => { exp = exp === +t.dataset.v ? -1 : +t.dataset.v; draw(); },
        fire: (t) => { const s = SKILLS[attr][+t.dataset.v], dmg = Math.round(s[2] * (attr === weak ? 1.3 : 1) * 5); if (dmg) { hp = Math.max(0, hp - dmg); if (attr === weak) combo = Math.min(5, combo + 1); log.unshift(['你', `Arsène · ${s[0]}`, dmg, '', attr === weak ? 1 : 0]); } else log.unshift(['你', `Arsène · ${s[0]}`, 0, s[1] === 'debuff' ? '施加易伤' : '施加攻击强化']); status = combo >= 5 ? 'ok' : 'done'; draw(); hit(dmg); },
        allout: () => { allOut({ persona: 'ARSÈNE', partner, damage: 1450, onEnd: () => { d.close(); victory({ partner }); } }); },
      } });
    const entr = () => { if (RD()) return; const e = d.body.querySelector('.sb-enter'); if (!e) return; A(e.querySelector('svg'), [{ transform: 'scale(.2) rotate(-40deg)', opacity: 0 }, { transform: 'scale(1.2) rotate(6deg)', opacity: 1, offset: .6 }, { transform: 'none', opacity: 1 }], { duration: 900, easing: OVER }); A(e.querySelector('b'), [{ opacity: 0, transform: 'translateX(-40px) skewX(-12deg)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: 600, fill: 'backwards' }); A(e.querySelector('q'), [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 1000, fill: 'backwards' }); };
    const hit = (dmg) => { if (RD() || !dmg) return; const b = d.body.querySelector('.sb-boss-w'); b.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-8px,4px)' }, { transform: 'translate(7px,-3px)' }, { transform: 'none' }], { duration: 300 }); const n = document.createElement('b'); n.className = 'sb-dmg'; n.textContent = '−' + dmg; b.appendChild(n); A(n, [{ transform: 'translate(-50%,-50%) scale(2.4)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: .3 }, { transform: 'translate(-50%,-120%) scale(1)', opacity: 0 }], { duration: 900, easing: SLAM }).onfinish = () => n.remove(); };
    draw();
    if (ph === 'entering') entr();
    return d;
  }
  OC.shadowBattle = shadowBattle;

  /* ══════════ AllOutOverlay —— 总攻击（1.8s）：红黑斜刀交叉 + 剪影群跃 + ALL-OUT ATTACK 剪报字 + 伤害砸落 + 上下电影黑边 ══════════ */
  function allOut({ persona = 'ARSÈNE', partner = '新岛真', damage = 1450, onEnd } = {}) {
    const cmp = compact(), v = document.createElement('div'); v.className = 'oc-ao'; v.setAttribute('role', 'status'); v.setAttribute('aria-label', 'ALL-OUT ATTACK');
    v.innerHTML = `<div class="ao-bg"></div><i class="ao-cut a"></i><i class="ao-cut b"></i>
      <div class="ao-sils">${['leap', 'point', 'crouch'].slice(0, cmp ? 2 : 3).map((s, i) => `<span class="ao-s s${i}">${P5.sil(s, { style: 'height:100%;width:auto', flip: i === 1 })}</span>`).join('')}</div>
      <div class="ao-txt">${U.ransom('ALL-OUT', { h: cmp ? 46 : 70, seed: 41 })}<br>${U.ransom('ATTACK!', { h: cmp ? 38 : 56, seed: 43 })}<span class="ao-who">${esc(persona)} <i>×</i> @${esc(partner)}</span><b class="ao-dmg">−${damage}</b></div>
      ${Array.from({ length: cmp ? 10 : 24 }, (_, i) => `<i class="ao-p" style="background:${i % 3 ? '#F2E9DA' : '#111'}"></i>`).join('')}
      <i class="ao-bar t"></i><i class="ao-bar bt"></i>`;
    document.body.appendChild(v); v.style.zIndex = 885; P5.bgInto(v.querySelector('.ao-bg'), { seed: 9, fx: 500, fy: 500, rays: cmp ? 20 : 30 });
    P5.sfx('fanfare', .5);
    const end = () => { if (!v.isConnected) return; v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'both' }).onfinish = () => { v.remove(); onEnd && onEnd(); }; };
    setTimeout(end, 1800);
    if (RD()) return;
    A(v.querySelector('.ao-cut.a'), [{ transform: 'translateX(-130%) skewX(-18deg)' }, { transform: 'translateX(130%) skewX(-18deg)' }], { duration: 800, delay: 150, easing: EXP });
    A(v.querySelector('.ao-cut.b'), [{ transform: 'translateX(130%) skewX(18deg)' }, { transform: 'translateX(-130%) skewX(18deg)' }], { duration: 800, delay: 350, easing: EXP });
    v.querySelectorAll('.ao-s').forEach((s, i) => A(s, [{ transform: `translateX(${i % 2 ? 60 : -60}vw) scale(.8)`, opacity: 0 }, { transform: 'translateX(0) scale(1)', opacity: 1, offset: .35 }, { transform: `translateX(${i % 2 ? -6 : 6}vw) scale(1.04)`, opacity: 1, offset: .8 }, { transform: `translateX(${i % 2 ? -10 : 10}vw) scale(1.06)`, opacity: 0 }], { duration: 1500, delay: 120 + i * 90, easing: 'cubic-bezier(.2,.8,.3,1)' }));
    A(v.querySelector('.ao-txt'), [{ transform: 'scale(.3) rotate(-4deg)', opacity: 0 }, { transform: 'scale(1.15) rotate(-4deg)', opacity: 1, offset: .2 }, { transform: 'scale(1) rotate(-4deg)', opacity: 1, offset: .78 }, { transform: 'scale(1) rotate(-2deg)', opacity: 0 }], { duration: 1550, delay: 250 });
    P5.slamTiles(v.querySelectorAll('.ao-txt .ransom img'), .03);
    A(v.querySelector('.ao-dmg'), [{ transform: 'translateY(-10px) scale(2.4)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, delay: 700, easing: SLAM, fill: 'backwards' });
    ['t', 'bt'].forEach((k) => A(v.querySelector('.ao-bar.' + k), [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)', offset: .14 }, { transform: 'scaleY(1)', offset: .8 }, { transform: 'scaleY(0)' }], { duration: 1800 }));
    v.querySelectorAll('.ao-p').forEach((p, i) => { const a = i / 24 * 6.283, r = 140 + (i * 53) % 160; A(p, [{ transform: 'translate(-50%,-50%) scale(.5)', opacity: 0 }, { opacity: 1, offset: .3 }, { transform: `translate(calc(-50% + ${(Math.cos(a) * r).toFixed(0)}px),calc(-50% + ${(Math.sin(a) * r).toFixed(0)}px)) scale(.3) rotate(${i * 45}deg)`, opacity: 0 }], { duration: 900, delay: 300 + (i % 6) * 30, easing: 'ease-out' }); });
    setTimeout(() => v.animate([{ transform: 'none' }, { transform: 'translate(-9px,5px)' }, { transform: 'translate(7px,-4px)' }, { transform: 'none' }], { duration: 300 }), 700);
  }
  OC.allOut = allOut;

  /* ══════════ CoopVictoryScreen —— COOP VICTORY / SHADOW RETREATED ══════════ */
  function victory({ partner = '新岛真', win = true, streak = 3 } = {}) {
    const rows = win ? [['📘', '知识（弱点属性）', '+3'], ['♡', `与 @${partner} 的羁绊${streak >= 3 ? ' · 连胜加成' : ''}`, '+3 亲密度'], ['✦', 'SP · 战斗点数', '+14', '基础 8 · 连胜 +2 · 羁绊 +2 · 终结者 +2'], ['◈', '羁绊纪念', '已刻入']] : [['♡', '虽然没封印，但我们都在。', '+1 亲密度'], ['✦', '慰问 SP', '+3']];
    const card = P5.cutIn(`<div class="oc-vic ${win ? '' : 'lose'}">
      <div class="vc-h">${U.ransom(win ? 'VICTORY' : 'RETREAT', { h: compact() ? 40 : 50, seed: 51 })}<em>${win ? 'COOP VICTORY' : 'SHADOW RETREATED'}</em></div>
      <b class="vc-t">${win ? '你们封印了《<i>嫉妒之影 · 双面镜</i>》' : '《嫉妒之影 · 双面镜》悄然离去'}</b><small class="vc-s">与 @${esc(partner)} 的共战记录</small>
      ${win && streak > 1 ? `<span class="vc-streak">🔥 连胜 ×${streak}</span>` : ''}
      <div class="vc-rows">${rows.map((r) => `<div><i>${r[0]}</i><span>${r[1]}${r[3] ? `<small>${r[3]}</small>` : ''}</span><b>${r[2]}</b></div>`).join('')}</div>
      ${win ? `<div class="vc-mem"><span class="mm-st"><svg viewBox="0 0 100 100"><polygon points="${star(50, 52, 48)}" fill="#D7000F" stroke="#111" stroke-width="4"/></svg><b>封</b></span><div><em>MEMORIAL · 共战纪念</em><p>"2026/10/20 · 与 @${esc(partner)} 共击 嫉妒之影 · 双面镜"</p><small>在同伴详情页「共战纪念」中查看所有图章</small></div></div>` : ''}
      <button type="button" class="vc-btn">${win ? '不负相见' : '下次再战'}</button></div>`, { autoMs: 60000, sfx: 'fanfare' });
    card.addEventListener('click', (e) => { if (!e.target.closest('.vc-btn')) e.stopPropagation(); });
    P5.slamTiles(card.querySelectorAll('.ransom img'), .045);
    if (!RD()) card.querySelectorAll('.vc-rows > div').forEach((r, i) => A(r, [{ opacity: 0, transform: 'translateX(-30px) skewX(-10deg)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: 700 + i * 110, easing: OVER, fill: 'backwards' }));
    return card;
  }
  OC.victory = victory;

  /* ══════════ ConfidantSupportRow —— 战斗中的同伴援助（HP / SP 两键，展开可回应同伴） ══════════ */
  function supportRow() {
    let ex = null;
    const heal = CF.filter((c) => c.intimacy >= 4).slice(0, 3), sp = CF.filter((c) => c.intimacy >= 10);
    const html = () => `<p class="oc-note">在逆影战场的战斗 HUD 里，位于指令区上方。羁绊 Lv.4 起可回 HP，Lv.10 起可回 SP。</p>
      <div class="su-row"><button type="button" class="su-b hp" data-a="ex" data-v="battle_heal" aria-pressed="${ex === 'battle_heal'}" ${heal.length ? '' : 'disabled'}><b>♥ 同伴援助 · HP</b><small>${heal.length} 位可回应</small></button><button type="button" class="su-b sp" data-a="ex" data-v="battle_sp" aria-pressed="${ex === 'battle_sp'}" ${sp.length ? '' : 'disabled'}><b>✦ 同伴援助 · SP</b><small>${sp.length} 位可回应</small></button></div>
      ${ex ? `<div class="su-list">${(ex === 'battle_heal' ? heal : sp).map((c) => `<button type="button" class="su-it" data-a="use" data-v="${c.id}">${cardHTML(c.card, 30)}<span><b>${esc(c.name)}</b><small>《${c.card.cn}》 · ${ex === 'battle_heal' ? 'Ta 的慰藉' : '圆满'}</small></span><em>${ex === 'battle_heal' ? '+8 HP' : '+10 SP'}</em></button>`).join('') || '<p class="oc-note c">暂无可回应的同伴</p>'}</div>` : ''}`;
    const d = dialog({ eyebrow: 'BATTLE · SUPPORT', title: '同伴援助', sub: 'ConfidantSupportRow（战斗 HUD 内的一行）', seed: 331, size: 's', body: html(),
      on: { ex: (t) => { ex = ex === t.dataset.v ? null : t.dataset.v; d.set(html(), null, false); }, use: (t) => { const c = CF.find((x) => x.id === t.dataset.v); P5.toast(`${c.name} 回应了你 · ${ex === 'battle_heal' ? '+8 HP' : '+10 SP'}`); ex = null; d.set(html(), null, false); } } });
    return d;
  }
  OC.supportRow = supportRow;

  /* ══════════ WallSpinBackdrop —— 卡墙铭牌背后的同心五角星（每翻一张转 ±60°，spring 140/15/0.9） ══════════ */
  function wallSpin() {
    let idx = 0, cur = 0, stop;
    const d = dialog({ eyebrow: 'WallSpinBackdrop', title: '翻牌背景星', sub: '羁绊卡墙 / 据点名册共用：每翻一张转 60°（有过冲）', seed: 341, size: 's',
      body: `<div class="ws-stage"><div class="ws-spin"><svg viewBox="0 0 100 100">${[50, 39, 28, 17, 6].map((r) => `<polygon points="${star(50, 50, r, -76)}" fill="none" stroke="#8E0010" stroke-width="2.4"/>`).join('')}</svg></div><div class="ws-plate">${U.plate(CF[0].name, { fs: 20 })}</div></div><div class="oc-row2">${U.btn('‹ 上一张', { tone: 'paper', seed: 342, attrs: 'data-a="p"' })}${U.btn('下一张 ›', { tone: 'red', seed: 343, attrs: 'data-a="n"' })}</div>`,
      on: { p: () => go(-1), n: () => go(1) } });
    const sp = d.body.querySelector('.ws-spin');
    const go = (k) => { idx = (idx + k + CF.length) % CF.length; d.body.querySelector('.ws-plate .plate span').textContent = CF[idx].name; const from = cur, to = cur + k * 60; stop && stop(); P5.sfx('tarot', .3); if (RD()) { cur = to; sp.style.transform = `rotate(${to}deg)`; return; } stop = P5.spring({ stiffness: 140, damping: 15, mass: .9, onUpdate: (p) => { cur = P5.lerp(from, to, p); sp.style.transform = `rotate(${cur}deg)`; } }); };
    return d;
  }
  OC.wallSpin = wallSpin;

/** React 宿主用：关掉全部羁绊层（Esc 栈逆序执行）+ 收起主角牌 */
OC.closeAll = () => { stack.slice().reverse().forEach((f) => { try { f(); } catch (e) { /* 已关 */ } }); stack.length = 0; zTop = 840; };
OC.hideHero = () => { if (hero) poseHero('hidden'); };
