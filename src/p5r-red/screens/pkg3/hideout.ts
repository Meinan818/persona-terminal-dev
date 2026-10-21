// @ts-nocheck —— 逐字迁移自 v3 原生 pages/org.p5.js（据点页 + BondTitle「羁绊 / 组织」切换头 + 羁绊页补件 coopKit）。
// 改动（按 FIXLIST 第五节）：+ 加载中 / 分区拉取失败 / 队长·成员视角 三个 DEMO 状态；列表名字套 ConfidantNameFx（nameFx）。
import { P5 } from './p5';
import { OC } from './oc';
import { OD } from './od';
/* ═══════════════════════════════════════════════════════════════════
   据点 / 组织（红频道）—— 覆盖 pages_b.js 里的旧 P5.page('org')
   真实文件：src/pages/Hideout.tsx（p5 分支）+ components/org/{BondTitle, OrgHome, HideoutMap, RaidSheet·RaidBanner,
            MemberCard·MemberTile, RosterWall, BoardSection, OpsSection, MeetingSection, orgUi}
   P5R 对照：怪盗团阁楼隐秘据点的作战会议 —— 剪报瓷砖大标题、红黑白三色、斜切纸片、硬投影、黑底斜条节标。

   构图（与原版同序）：
     页头  BondTitle「羁绊 / 组织」逐字瓷砖切换头（点「羁绊」回 #/coop；横拖 40px 也切）+ 刷新 / 据点设置
     ① OrgNoticeBar 本机提示（知道了）   ② OrgSwitcher 两个组织时的切换条
     ③ TitleBlock：HIDEOUT 剪报字 + 组织名瓷砖 + 徽记章 + 口号黑条 + 「n / 7 人 · LEADER · 会议日」+ OrgLevelLine（点开说明）
     ④ 代表牌冲突 / 未选牌提示（去选）
     ⑤ HideoutMap：城市夜景，四角地标 = 分区页签（名册 / 公告板 / 会议 / 作战，红点）、座位（点开成员牌）、中心徽记；
        团战三晚：月亮 + 中心首领与血条（点开团战）；右上「⤢」全屏地图
     ⑥ RaidBanner 满月团战横条（出手 / 查看 ›）
     ⑦ SectionTitle 黑斜条节标（名册标题可点：格子 ⇄ 专辑墙，红字 = 专辑墙）+ 计数
     ⑧ 分区内容：名册格子（MemberTile + 空座位邀请）/ 名册专辑墙（RosterWall）/ 公告板 / 作战 / 会议
     ⑨ InvitePanel 邀请码（默认收起）  ⑩ SlotLinks「还可以 加入一个组织」
     未登录 → OrgLoginPrompt；没有组织 → OrgEmptyPanel（底部 DEMO 状态条切换，只用于演示）
   入口 → P5.od：openHideoutMap / openRaid / openOpCreate / openMeeting / openShareToOrg / openOrgSettings /
          openOrgTitles / openBorrowMask / openOrgOnboard / openOrgCeleb
   动效只走 transform / opacity；P5.reduced() 时只保留终态。
   ═══════════════════════════════════════════════════════════════════ */
const U = P5.ui, SH = P5.shape;
  const RM = () => P5.reduced();
  const od = (k, ...a) => { if (OD[k]) OD[k](...a); else P5.toast(k); };
  const pad2 = (n) => String(n).padStart(2, '0');
  const WK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const NOW = new Date();
  const dOff = (n) => new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + n);
  const md = (d) => `${d.getMonth() + 1}月${d.getDate()}日`;
  const dayLabel = (n) => n === 0 ? '今天' : n === -1 ? '昨天' : `${md(dOff(n))} ${WK[dOff(n).getDay()]}`;

  /* ── 假数据（字段对齐 types/OrgView；与 overlays/d.js 的 ORG 同一套） ── */
  const ORG = { name: '夜读小队', motto: '一起熬过期末', code: 'MASK7Q2K', emblem: 'star', level: 3, lvName: '特别活动部', xp: 296, floor: 180, next: 380, mult: 1.2, tz: 'Asia/Shanghai' };
  const ORG2 = { name: '晨跑同盟', emblem: 'moon', n: 4 };
  const ATTR = (k) => (P5.ATTR[k] || { name: k }).name;
  const MEM = [
    { id: 'm1', seat: 1, name: '野鸡', card: ['愚者', 'THE FOOL', '0'], me: true, leader: true, lv: 24, status: '📚 期末周', streak: 12, week: 0b11, titles: ['月下同行'], goal: '每天背 30 个单词', result: '做到了', masks: ['亚森', '卡门', '佐罗'], joined: '2026.09.13', stats: [3, 2, 2, 4, 1] },
    { id: 'm2', seat: 2, name: '坂本龙司', card: ['战车', 'THE CHARIOT', 'VII'], lv: 19, status: '🏃 训练中', streak: 9, week: 0b11, titles: ['本周出勤王'], goal: '跑三次 5 公里', result: '做到了', masks: ['凯德', '阿尔塞斯'], joined: '2026.09.14', stats: [1, 5, 3, 2, 2] },
    { id: 'm3', seat: 3, name: '高卷杏', card: ['恋人', 'THE LOVERS', 'VI'], lv: 17, status: null, streak: 4, week: 0b01, titles: [], goal: '早睡 5 天', result: '差一点', masks: ['卡门'], joined: '2026.09.14', stats: [2, 3, 2, 3, 5] },
    { id: 'm5', seat: 5, name: '新岛真', card: ['女祭司', 'THE HIGH PRIESTESS', 'II'], lv: 21, status: '📖 图书馆', streak: 21, week: 0b11, titles: ['言出必行 · 3 周'], goal: '读完一本书', result: '做到了', masks: ['约翰娜'], joined: '2026.09.20', stats: [5, 3, 2, 3, 2] },
    { id: 'm6', seat: 6, name: '佐仓双叶', card: ['隐士', 'THE HERMIT', 'IX'], lv: 15, status: '🎮 闭关', streak: 0, week: 0, titles: [], absent: true, goal: null, masks: [], joined: '2026.10.02', stats: [5, 1, 4, 2, 1] },
  ];
  const TAGS = [['strong', '太强了'], ['same', '🤣👉'], ['steady', '中'], ['envy', '羡慕'], ['metoo', '带我一个'], ['hug', '别似']];
  const POSTS = [
    { id: 'p1', kind: 'moment', by: 'm2', day: 0, ago: '12 分钟前', text: '跑完了第一个五公里！', chips: ['胆量 +2', '重要'], tags: { strong: ['m1', 'm3'], same: ['m5'] }, mine: 'strong' },
    { id: 'p2', kind: 'op', day: 0, text: '周六一起去图书馆', won: '10月17日 达成', who: [['野鸡', ''], ['坂本龙司', ''], ['高卷杏', ''], ['新岛真', '']], tags: { strong: ['m2'] } },
    { id: 'p3', kind: 'moment', by: 'm5', day: -1, ago: '昨天 22:14', text: '读完《罪与罚》上册', chips: ['知识 +3', '愿望实现'], tags: { metoo: ['m3'] } },
    { id: 'p4', kind: 'moment', by: 'm3', day: -3, ago: '3 天前', text: '第一次自己做了咖喱', chips: ['灵巧 +2', '补记'], tags: { envy: ['m1', 'm2'], hug: ['m6'] } },
    { id: 'p5', kind: 'raid', day: -23, boss: '暴食之影', hitters: 4, last: '坂本龙司' },
  ];
  const OPS = [
    { id: 'o1', big: true, title: '全员期中周冲刺', due: 3, by: 'm1', attr: 'knowledge', done: 2, counted: 4,
      rows: [['m1', '', 'goal', 'todo'], ['m2', '刷两套真题', 'assigned', 'done'], ['m3', '做思维导图', 'assigned', 'todo'], ['m5', '出 20 道自测题', 'assigned', 'done'], ['m6', '整理错题本', 'assigned', 'out']] },
    { id: 'o2', big: false, title: '这周每人跑一次 5 公里', due: 1, by: 'm2', attr: 'guts', done: 3, counted: 4,
      rows: [['m1', '这周每人跑一次 5 公里', 'goal', 'done'], ['m2', '这周每人跑一次 5 公里', 'goal', 'done'], ['m3', '这周每人跑一次 5 公里', 'goal', 'todo'], ['m5', '这周每人跑一次 5 公里', 'goal', 'done']] },
  ];
  const HIST = [['achieved', '周六一起去图书馆', '4/4', -3], ['failed', '连续早睡 5 天', '2/5', -9], ['cancelled', '周末一起爬山', '0/5', -12]];
  const MIN = { week: 6, day: dOff(-(NOW.getDay() || 7)), att: 4, of: 5, did: 3, set: 4, titles: [['本周出勤王', '坂本龙司'], ['言出必行 · 3 周', '新岛真'], ['月下同行', '野鸡']], next: [['野鸡', '每天背 30 个单词'], ['坂本龙司', '跑三次 5 公里'], ['高卷杏', '早睡 5 天'], ['新岛真', '读完一本书']], absent: ['佐仓双叶'] };
  const mem = (id) => MEM.find((m) => m.id === id);

  /* ── 页面状态（模块级，横竖屏重渲染时保留） ── */
  export const st = { demo: 'normal', leader: true, raid: true, sec: 'roster', roster: 'grid', face: 'card', wall: 0, invite: false, lv: false, filter: 'all', hist: false, minOpen: true, lastMin: false, org: 0, writing: false, myPart: '', blocked: new Set(), reacted: {}, spin: false };
  const seen = { board: false, ops: false };

  /* ══════════ 小件 ══════════ */
  const q = (seed, jag) => SH.quad(seed, jag);
  /** OrgPanel 红频道皮：红影 → 墨框 → 纸面（三层，aria-hidden，clip 只在装饰层） */
  const pn = (seed, inner, { cls = '', tag = 'div', attrs = '', tone = '' } = {}) =>
    `<${tag} class="og-pn ${tone} ${cls}" ${attrs}><i class="og-l og-l1" aria-hidden="true" style="clip-path:${q(seed + .13, 6)}"></i><i class="og-l og-l2" aria-hidden="true" style="clip-path:${q(seed + .29, 5)}"></i><i class="og-l og-l3" aria-hidden="true" style="clip-path:${q(seed + .47, 4)}"></i><div class="og-pn-c">${inner}</div></${tag}>`;
  /** OrgButton → P5Btn（primary=红 / ghost=纸 / danger=墨） */
  const btn = (label, { tone = 'red', seed = 1, attrs = '', sm = true } = {}) => U.btn(label, { tone: tone === 'ghost' ? 'paper' : tone === 'danger' ? 'ink' : 'red', seed, size: sm ? 'sm' : '', attrs, cls: 'og-btn' });
  const chip = (t, tone = 'red', seed = 3) => `<span class="og-chip ${tone}" style="clip-path:${q(seed + 2.3, 2)}">${t}</span>`;
  const star = (fill = 'var(--red)', stroke = 'var(--ink)', sw = 1.6, cls = 'og-star') => U.star(fill, stroke, sw, cls);
  const EMB = {
    star: 'M12 2.4L14.59 9.04L21.7 9.45L16.18 13.96L18 20.85L12 17L6 20.85L7.82 13.96L2.3 9.45L9.41 9.04Z',
    moon: 'M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79Z',
  };
  const emblem = (id = 'star', size = 40, seed = 4.5) => `<span class="og-emb" style="width:${size}px;height:${size}px" aria-hidden="true"><i style="clip-path:${q(seed + .3, 4)}"></i><i style="clip-path:${q(seed + .5, 3)}"></i><i style="clip-path:${q(seed + .7, 3)}"></i><svg viewBox="0 0 24 24" width="${Math.round(size * .52)}" height="${Math.round(size * .52)}"><path d="${EMB[id] || EMB.star}" fill="var(--white)"/></svg></span>`;
  /** 代表牌小牌面 = 素材槽 slots/tarot/p5/<真实文件名>.webp（用户决定 2026-10-21：据点也读素材槽，同名覆盖即换真图；尺寸 / 投影 / 头像切换框架不变） */
  const TAROT_EN = { 'THE FOOL': 'fool', 'THE MAGICIAN': 'magician', 'THE HIGH PRIESTESS': 'high_priestess', 'THE PRIESTESS': 'high_priestess', 'THE EMPRESS': 'empress', 'THE EMPEROR': 'emperor', 'THE HIEROPHANT': 'hierophant', 'THE LOVERS': 'lovers', 'THE CHARIOT': 'chariot', 'JUSTICE': 'justice', 'THE HERMIT': 'hermit', 'WHEEL OF FORTUNE': 'wheel_of_fortune', 'FORTUNE': 'wheel_of_fortune', 'STRENGTH': 'strength', 'THE HANGED MAN': 'hanged_man', 'DEATH': 'death', 'TEMPERANCE': 'temperance', 'THE DEVIL': 'devil', 'THE TOWER': 'tower', 'THE STAR': 'star', 'THE MOON': 'moon', 'THE SUN': 'sun', 'JUDGEMENT': 'judgement', 'THE WORLD': 'world' };
  const TAROT_ID = { FOOL: 'fool', MAGICIAN: 'magician', PRIESTESS: 'high_priestess', EMPRESS: 'empress', EMPEROR: 'emperor', HIEROPHANT: 'hierophant', LOVERS: 'lovers', CHARIOT: 'chariot', JUSTICE: 'justice', HERMIT: 'hermit', FORTUNE: 'wheel_of_fortune', STRENGTH: 'strength', HANGED: 'hanged_man', DEATH: 'death', TEMPERANCE: 'temperance', DEVIL: 'devil', TOWER: 'tower', STAR: 'star', MOON: 'moon', SUN: 'sun', JUDGEMENT: 'judgement', WORLD: 'world' };
  const slotTarot = (file) => `slots/tarot/p5/${file || 'fool'}.webp`;
  const face = (m, w = 26, { big = false, avatar = st.face === 'avatar' } = {}) => {
    const [, en] = m.card, h = Math.round(w * 42 / 26);
    if (avatar) return `<span class="og-face av" style="width:${w}px;height:${h}px" aria-hidden="true"><b style="font-size:${Math.round(w * .55)}px">${[...m.name][0]}</b></span>`;
    return `<img class="og-face og-face-img${big ? ' big' : ''}" width="${w}" height="${h}" src="${slotTarot(TAROT_EN[en])}" alt="" aria-hidden="true" draggable="false" decoding="async">`;
  };
  const week = (bits, today = (NOW.getDay() + 6) % 7, size = 8) => `<span class="og-wk" aria-label="本周出勤 ${[...Array(7)].filter((_, i) => bits & (1 << i)).length} 天">${['一', '二', '三', '四', '五', '六', '日'].map((l, i) => `<i class="${bits & (1 << i) ? 'on' : ''} ${i === today ? 'td' : ''}" style="width:${size}px;height:${size}px"></i>`).join('')}</span>`;
  const subBar = (segs, { alt = false, rot = -1 } = {}) => `<span class="og-sb ${alt ? 'alt' : ''}" style="--r:${rot}deg">${segs.map((s, i) => `<b class="${i ? 'en' : ''}">${s}</b>`).join('')}<svg viewBox="0 0 100 100" width="15" height="15" aria-hidden="true"><polygon points="${SH.starPts(50, 52, 46)}" fill="none" stroke="currentColor" stroke-width="10"/></svg></span>`;
  /** P5CollageTitle：中文逐字剪报瓷砖（配色循环 / 旋转 / 跳位与仓库同组） */
  const CYC = [['paper', 'red'], ['paper', 'ink'], ['red', 'white'], ['ink', 'white'], ['grey', 'ink']];
  const ROT = [-3.5, 2.4, -2, 3, -2.8, 1.8, -3.2, 2.6], DY = [0, 6, 2, 7, 3, 5, 1, 6];
  const collage = (text, cls = '') => `<span class="og-col ${cls}" role="img" aria-label="${text}">${[...text].map((ch, i) => `<span class="og-ct ${CYC[i % 5][0]} f-${CYC[i % 5][1]}" data-r="${ROT[i % 8]}" data-dy="${DY[i % 8]}" style="--r:${ROT[i % 8]}deg;--dy:${DY[i % 8]}px">${ch}</span>`).join('')}${star('var(--red)', 'var(--ink)', 1.4, 'og-col-star')}</span>`;

  /* ══════════ BondTitle：「羁绊 / 组织」切换头（红频道 = 逐字瓷砖 + 红斜杠） ══════════ */
  const TILE = [['#f0e9df', '#c00008'], ['#050505', '#f8f8f6'], ['#c00008', '#f8f8f6'], ['#9b9791', '#050505']];
  const bondDot = () => true; // 组织里有新动静（演示：公告板有新动态）
  export const bondTitle = (view) => {
    const tabs = [['coop', '羁绊'], ['org', '组织']];
    return `<div class="og-bt" role="tablist" aria-label="同伴 / 组织切换" data-bond-head="${view}">${tabs.map(([k, l], i) => {
      const on = k === view;
      return `${i ? '<span class="og-bt-sl" aria-hidden="true">/</span>' : ''}<button type="button" role="tab" class="og-bt-b ${on ? 'on' : ''}" aria-selected="${on}" data-bond="${k}" aria-label="${on ? `${l}（现在这页）` : `点一下切换到${l}${k === 'org' && bondDot() ? '（组织里有新动静）' : ''}`}">${[...l].map((ch, ci) => { const p = TILE[(ci + (k === 'org' ? 2 : 0)) % 4], r = on ? (ci % 2 ? 2.6 : -3) : (ci % 2 ? -2 : 2); const y = on ? (ci % 2 ? 5 : 0) : (ci % 2 ? 3 : 0); return `<span class="og-bt-t" data-r="${r}" data-y="${y}" style="--r:${r}deg;--y:${y}px;${on ? `background:${p[0]};color:${p[1]}` : ''}">${ch}</span>`; }).join('')}${!on && k === 'org' && bondDot() ? '<i class="og-bt-dot" aria-hidden="true"></i>' : ''}</button>`;
    }).join('')}</div>`;
  };
  /** 羁绊页 / 据点页共用的页头 */
  export const bondHead = (view, right = '') => `<header class="pg-hd og-bhd">${bondTitle(view)}<div class="pg-hd-r">${right}</div></header>`;
  const bondGo = (to, from) => { if (to === from) return; P5.sfx('nav', .48); const h = document.querySelector(`[data-bond-head="${from}"]`); if (h && !RM()) h.querySelectorAll(`[data-bond="${to}"] .og-bt-t`).forEach((t, i) => t.animate([{ transform: `translateY(${t.dataset.y}px) rotate(${t.dataset.r}deg)` }, { transform: `translateY(-6px) rotate(${-t.dataset.r}deg) scale(1.35)` }], { duration: 140, delay: i * 30, fill: 'forwards', easing: 'cubic-bezier(.34,1.56,.64,1)' })); setTimeout(() => P5.go(to, { via: 'tear' }), RM() ? 0 : 120); };
  // 委托：点另一个词切过去；横拖 40px（左拖 → 组织，右拖 → 羁绊）
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-bond]'); if (!b) return; const head = b.closest('[data-bond-head]'); bondGo(b.dataset.bond, head.dataset.bondHead); });
  let drag = null;
  document.addEventListener('pointerdown', (e) => { const h = e.target.closest('[data-bond-head]'); drag = h ? { h, x: e.clientX, y: e.clientY } : null; });
  document.addEventListener('pointerup', (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = Math.abs(e.clientY - drag.y), from = drag.h.dataset.bondHead; drag = null; if (dy > 40) return; if (dx < -40) bondGo('org', from); else if (dx > 40) bondGo('coop', from); });

  /* ══════════ 页头右侧：刷新 / 据点设置（几何图标 + 纸面不规则框） ══════════ */
  const GEAR = (() => { const pts = []; for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2 - Math.PI / 2 + Math.PI / 32, r = i % 4 < 2 ? 10.6 : 8.1; pts.push(`${(12 + r * Math.cos(a)).toFixed(2)},${(12 + r * Math.sin(a)).toFixed(2)}`); } return `M${pts.join(' L')} Z M12 8.4 A3.6 3.6 0 1 0 12.01 8.4 Z`; })();
  const hIcon = (k, label, svg, seed) => `<button type="button" class="og-hi" data-act="${k}" aria-label="${label}" title="${label}"><i class="og-l" aria-hidden="true" style="clip-path:${q(seed + .3, 2)}"></i><i class="og-l" aria-hidden="true" style="clip-path:${q(seed + .6, 2)}"></i><i class="og-l" aria-hidden="true" style="clip-path:${q(seed + .9, 1.5)}"></i><span class="og-hi-g">${svg}</span></button>`;
  const ICON_R = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.3-4.9"/><path d="M5.2 2.8v3.6h3.6"/><path d="M4 13a8 8 0 0 0 14.3 4.9"/><path d="M18.8 21.2v-3.6h-3.6"/></svg>`;
  const ICON_G = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="${GEAR}"/></svg>`;

  /* ══════════ ③ TitleBlock + OrgLevelLine ══════════ */
  const titleBlock = () => {
    const pct = Math.round((ORG.xp - ORG.floor) / (ORG.next - ORG.floor) * 100);
    return `<section class="og-ttl">
      <div class="og-ttl-k">${U.ransom('HIDEOUT', { h: P5.isWide() ? 26 : 21, seed: 101 })}<span class="og-ttl-no">NO.${pad2(MEM.length)} / 07</span></div>
      <div class="og-ttl-n">${emblem(ORG.emblem, P5.isWide() ? 54 : 44)}${collage(ORG.name)}</div>
      <div class="og-ttl-m">${subBar([ORG.motto], { rot: -1.2 }).replace('og-sb', 'og-sb motto')}</div>
      <div class="og-meta"><span>${MEM.length} / 7 人</span><i aria-hidden="true">·</i>${MEM[0].leader ? chip('LEADER', 'red', 4.2) : chip('MEMBER', 'ink', 4.2)}${NOW.getDay() === 0 ? chip('会议日', 'red', 3.7) : ''}</div>
      <button type="button" class="og-lvl" data-act="lv" aria-expanded="${st.lv}" aria-label="据点 Lv.${ORG.level} ${ORG.lvName}，离 Lv.${ORG.level + 1} 还差 ${ORG.next - ORG.xp}，同调威力 ×${ORG.mult.toFixed(1)}">
        <span class="og-lvl-r"><span class="og-lvl-b" style="clip-path:${q(ORG.level + 2.3, 1.5)}">据点 Lv.${ORG.level}<small>· ${ORG.lvName}</small></span><span class="og-lvl-t"><i style="--p:${pct / 100}"></i></span><b>${ORG.xp} / ${ORG.next}</b></span>
        <span class="og-lvl-s">同调威力 ×${ORG.mult.toFixed(1)} · 离 Lv.${ORG.level + 1} 还差 ${ORG.next - ORG.xp} <em aria-hidden="true">${st.lv ? '▴' : '▾'}</em></span>
      </button>
      <div class="og-lvl-x" ${st.lv ? '' : 'hidden'}><p>经验怎么来：周日会议上每个写了下周目标的人 +2；每个达成的目标或作战，每个参与者 +5（作战 +8），每周最多算 3 个；满月团战击退暗影，每个出过手的人 +3。等级越高，队友同调走的面具在战场上越强（Lv.6 ×1.5），地图上的据点也会一点点长起来。</p><button type="button" class="og-link" data-act="titles">等级与称号 ›</button></div>
    </section>`;
  };

  /* ══════════ ⑤ HideoutMap（红：城市夜景） ══════════ */
  const HQ = { x: 180, y: 110 };
  const SEATS = Array.from({ length: 7 }, (_, i) => { const a = ((-90 + i * 360 / 7) * Math.PI) / 180; return { x: HQ.x + 70 * Math.cos(a), y: HQ.y + 42 * Math.sin(a) }; });
  const LM = [['roster', '名册', 'MEMBERS', 62, 46], ['board', '公告板', 'BOARD', 298, 46], ['meeting', '会议', 'MEETING', 62, 176], ['ops', '作战', 'OPS', 298, 176]];
  const ROADS = [`M180 110 L118 78 L62 46`, `M180 110 L242 78 L298 46`, `M180 110 L118 146 L62 176`, `M180 110 L242 146 L298 176`];
  const at = (x, y) => `left:${(x / 360 * 100).toFixed(2)}%;top:${(y / 220 * 100).toFixed(2)}%`;
  const mapSVG = (lv) => {
    const back = 'M0 150 L0 96 L22 96 L22 70 L48 70 L48 104 L70 104 L70 58 L96 58 L96 92 L122 92 L122 76 L150 76 L150 110 L176 110 L176 64 L204 64 L204 98 L230 98 L230 52 L256 52 L256 88 L284 88 L284 66 L312 66 L312 100 L336 100 L336 78 L360 78 L360 150 Z';
    const front = 'M0 220 L0 150 L30 150 L30 132 L58 132 L58 160 L92 160 L92 126 L118 126 L118 154 L146 154 L146 170 L214 170 L214 140 L242 140 L242 124 L270 124 L270 158 L300 158 L300 136 L330 136 L330 150 L360 150 L360 220 Z';
    const win = [[28, 80, 1], [76, 66, 0], [84, 76, 1], [182, 72, 1], [236, 60, 0], [244, 70, 1], [290, 74, 1], [34, 140, 0], [100, 134, 1], [250, 132, 1], [306, 144, 0], [52, 112, 1], [206, 84, 0], ...(lv >= 2 ? [[58, 78, 1], [128, 84, 0], [262, 70, 0], [318, 84, 1], [342, 92, 0], [150, 140, 0], [278, 140, 1], [10, 104, 1]] : [])];
    let dots = ''; for (let y = 4; y < 60; y += 7) for (let x = 252 + ((y / 7) % 2) * 3.5; x < 360; x += 7) dots += `<circle cx="${x.toFixed(1)}" cy="${y}" r="${(1.5 * (1 - y / 70)).toFixed(2)}"/>`;
    return `<svg class="og-map-bg" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id="og-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--og-sky-a)"/><stop offset="1" stop-color="var(--og-sky-b)"/></linearGradient></defs>
      <rect width="360" height="220" fill="url(#og-sky)"/>
      <g fill="var(--og-dot)">${dots}</g>
      <polygon points="0,0 60,0 0,46" fill="var(--p5r-paper)" opacity=".1"/>
      ${lv >= 4 ? '<polygon points="22,220 4,0 44,0" fill="#f0e9df" fill-opacity=".08"/><polygon points="326,220 312,0 352,0" fill="#f0e9df" fill-opacity=".08"/>' : ''}
      <path d="${back}" fill="var(--og-city-b)"/>
      <polygon points="0,168 360,76 360,104 0,196" fill="var(--red)"/>
      <polygon points="0,196 360,104 360,108 0,200" fill="var(--p5r-paper)" opacity=".85"/>
      <path d="${front}" fill="var(--og-city-f)"/>
      ${win.map(([x, y, r]) => `<rect x="${x}" y="${y}" width="5" height="7" fill="${r ? 'var(--red)' : '#f0e9df'}" fill-opacity="${r ? .95 : .7}"/>`).join('')}
      ${lv >= 3 ? '<path d="M243 52V24M238 52L243 36L248 52M239 42H247" fill="none" stroke="#4a3a3a" stroke-width="1.6"/><circle cx="243" cy="22" r="2.6" fill="var(--red)"/><circle cx="243" cy="22" r="6" fill="var(--red)" fill-opacity=".3"/>' : ''}
      ${lv >= 5 ? '<rect x="216" y="128" width="24" height="10" fill="var(--red)"/>' : ''}
      ${ROADS.map((d) => `<path d="${d}" fill="none" stroke="#f0e9df" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`).join('')}
      ${LM.map(([, , , x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="#111" stroke="#f0e9df" stroke-width="3"/>`).join('')}
    </svg>`;
  };
  const mapDots = () => ({ board: st.sec !== 'board' && !seen.board, ops: st.sec !== 'ops' && !seen.ops, meeting: NOW.getDay() === 0 });
  const mapBlock = () => {
    const raid = st.raid, dots = mapDots();
    return `<section class="og-map-wrap">
      <div class="og-map-sh"><div class="og-map" style="clip-path:${q(5.5, 6)}">${mapSVG(ORG.level)}
        ${raid ? `<span class="og-moon" style="${at(180, 26)}" aria-hidden="true"><i class="og-moon-h"></i><i class="og-moon-d"></i></span>` : ''}
        <span class="og-pulse" style="${at(HQ.x, HQ.y)}" aria-hidden="true"><i></i></span>
        ${raid ? `<button type="button" class="og-boss" style="${at(HQ.x, HQ.y)}" data-act="raid" aria-label="满月团战：「暴食之影」还剩 62%，今晚你还没出手。点了打开团战面板"><span class="og-boss-m" style="clip-path:${q(4.2, 3)}"><i style="clip-path:${q(5.1, 3)}"></i><svg viewBox="0 0 24 24" width="22" height="22"><path d="${EMB.moon}" fill="#f0e9df"/></svg></span><span class="og-boss-hp"><i style="--p:.62"></i></span><i class="og-dot"></i></button>`
          : `<span class="og-hq" style="${at(HQ.x, HQ.y)}">${emblem(ORG.emblem, 44)}</span>`}
        ${MEM.map((m) => { const p = SEATS[m.seat - 1]; return `<button type="button" class="og-seat ${m.me ? 'me' : ''} ${st.blocked.has(m.id) ? 'dim' : ''}" data-seat="${m.id}" style="${at(p.x, p.y)}" title="${m.seat} 号" aria-label="${pad2(m.seat)} 号 ${m.name}${m.me ? '（我）' : ''}${m.leader ? '（队长）' : ''}：打开成员牌"><i style="clip-path:${q(m.seat + .9, 2.5)}"></i><b>${[...m.name][0]}</b></button>`; }).join('')}
        <div class="og-lms" role="tablist" aria-label="据点分区">${LM.map(([k, l, en, x, y]) => `<button type="button" role="tab" class="og-lm ${st.sec === k ? 'on' : ''}" data-sec="${k}" aria-selected="${st.sec === k}" style="${at(x, y)}"><span class="og-lm-f"><i style="clip-path:${q(l.length + .2, 3)}"></i><i style="clip-path:${q(l.length + .6, 3)}"></i><b>${l}</b><small>${en}</small>${dots[k] ? '<em class="og-dot"></em>' : ''}</span></button>`).join('')}</div>
        <button type="button" class="og-map-x" data-act="map" aria-label="展开据点地图">⤢</button>
      </div></div>
      ${raid && st.demo === 'error' ? pn(41, `<p class="og-mu pk3-fail">团战暂时拉不到（可能是网络，或者服务器还没准备好）。稍后刷新再看看。</p>`, { cls: 'og-raid-pn' }) : raid ? pn(41, `<button type="button" class="og-raid" data-act="raid" aria-label="满月团战 · 满月夜：「暴食之影」还剩 62% · 今晚还没出手。点了打开团战面板"><span class="og-raid-i" style="clip-path:${q(3.3, 2)}"><svg viewBox="0 0 24 24" width="18" height="18"><path d="${EMB.moon}" fill="#fff"/></svg></span><span class="og-raid-m"><small>满月团战 · 满月夜</small><b>「暴食之影」还剩 62% · 今晚还没出手</b><span class="og-raid-hp"><i style="--p:.62"></i></span></span><span class="og-raid-go">出手 ›<i class="og-dot"></i></span></button>`, { cls: 'og-raid-pn' }) : ''}
    </section>`;
  };

  /* ══════════ ⑦ SectionTitle ══════════ */
  const SEC = { roster: ['名册', 'MEMBERS'], board: ['公告板', 'BOARD'], meeting: ['会议', 'MEETING'], ops: ['作战', 'OPERATIONS'] };
  const secTitle = () => {
    const [t, en] = SEC[st.sec], alt = st.sec === 'roster' && st.roster === 'wall';
    const bar = subBar([t, en], { alt });
    const meta = st.sec === 'roster' ? `${MEM.length} / 7` : st.sec === 'meeting' && NOW.getDay() !== 0 ? '每周日' : '';
    return `<div class="og-st">${st.sec === 'roster' ? `<button type="button" class="og-st-b" data-act="rview" aria-pressed="${alt}" aria-label="名册：现在是${alt ? '专辑墙' : '格子'}样式，点一下换成${alt ? '格子' : '专辑墙'}">${bar}</button>` : bar}${meta ? `<span class="og-st-m">${meta}</span>` : ''}</div>`;
  };

  /* ══════════ ⑧-a 名册 · 格子（MemberTile） ══════════ */
  const tile = (m) => {
    const bl = st.blocked.has(m.id);
    return `<div class="og-mt ${m.me ? 'me' : ''}" role="button" tabindex="0" data-open="${m.id}" aria-label="${pad2(m.seat)} 号 ${m.name}">
      <i class="og-l og-l1" aria-hidden="true" style="clip-path:${q(m.seat + .13, 5)}"></i><i class="og-l og-l2" aria-hidden="true" style="clip-path:${q(m.seat + .29, 4)}"></i><i class="og-l og-l3" aria-hidden="true" style="clip-path:${q(m.seat + .47, 3)}"></i>
      <div class="og-mt-c" style="${bl ? 'opacity:.55' : ''}">
        <span class="og-mt-seat" aria-hidden="true">${pad2(m.seat)}</span>
        <button type="button" class="og-mt-f" data-face aria-label="在代表牌 / 头像之间切换">${face(m, 30)}<em>${m.streak ? m.streak : ''}</em></button>
        <div class="og-mt-m"><div class="og-mt-tags"><span class="og-lv" style="clip-path:${q(m.lv + .4, 1.5)}">LV ${m.lv}</span>${m.leader ? '<span aria-label="队长">👑</span>' : ''}${m.me ? '<span class="og-mine">我</span>' : ''}${bl ? '<small>已屏蔽</small>' : ''}</div>
          <b class="og-mt-n">${m.name}</b><small class="og-mt-s">${m.status || `${m.card[2]} ${m.card[0]}`}</small>${week(m.week)}</div>
      </div>
      ${m.titles.length || m.absent ? `<div class="og-mt-h">${m.titles.map((t) => `<span class="og-hon">${t}</span>`).join('')}${m.absent ? '<span class="og-hon mu">本周缺席</span>' : ''}</div>` : ''}
      <button type="button" class="og-more" data-more="${m.id}" aria-label="${m.name} 的更多操作">⋯</button>
    </div>`;
  };
  const rosterGrid = () => `<div class="og-grid">${MEM.map(tile).join('')}<button type="button" class="og-empty" data-act="invite"><b>＋</b><span>还有 ${7 - MEM.length} 个空座位</span><small>点这里把邀请码发给朋友</small></button></div>`;

  /* ══════════ ⑧-b 名册 · 专辑墙（RosterWall） ══════════ */
  const rosterWall = () => {
    const n = MEM.length + 1, i0 = st.wall, m = MEM[i0];
    const plate = m ? pn(70 + i0, `<div class="og-pl-h"><span class="og-pl-arc">${m.card[2]} · ${m.card[1]}</span><span class="og-lv" style="clip-path:${q(m.lv + .4, 1.5)}">LV ${m.lv}</span></div>
        <b class="og-pl-n">${m.name}${m.me ? ' <span class="og-mine">我</span>' : ''}${m.leader ? ' 👑' : ''}</b><small class="og-mt-s">${m.status || `${m.card[2]} ${m.card[0]}`}</small>
        <div class="og-pl-w">${week(m.week, undefined, 10)}<span>连续 ${m.streak} 天</span></div>
        ${m.titles.length || m.absent ? `<div class="og-mt-h">${m.titles.map((t) => `<span class="og-hon">${t}</span>`).join('')}${m.absent ? '<span class="og-hon mu">本周缺席</span>' : ''}</div>` : ''}
        <div class="og-pl-a">${!m.me && m.masks.length ? btn('同调', { seed: 600, attrs: `data-sync="${m.id}"` }) : ''}<button type="button" class="og-more st" data-more="${m.id}" aria-label="${m.name} 的更多操作">⋯</button></div>`, { cls: 'og-plate' })
      : pn(77, `<b class="og-pl-n">还有 ${7 - MEM.length} 个空座位</b><small class="og-mt-s">点空白牌，把邀请码发给朋友</small><div class="og-pl-a">${btn('发邀请码', { seed: 601, attrs: 'data-act="invite"' })}</div>`, { cls: 'og-plate' });
    return `<div class="og-wall" aria-roledescription="专辑墙" aria-label="名册专辑墙，左右切换，点中间那张翻面">
      <svg class="og-wall-bg" viewBox="0 0 100 100" aria-hidden="true" style="--rot:${i0 * 60}deg">${[48, 37, 26, 15].map((r) => `<polygon points="${SH.starPts(50, 50, r, -76)}" fill="none" stroke="var(--og-wall-star)" stroke-width="2.6"/>`).join('')}</svg>
      <button type="button" class="og-wall-sw" data-face aria-label="在代表牌 / 头像之间切换">⇄</button>
      <div class="og-wall-row">${MEM.map((mm, i) => `<button type="button" class="og-wc ${i === i0 ? 'mid' : ''}" data-wi="${i}" style="--d:${i - i0}" aria-label="${mm.name}${i === i0 ? '：点一下翻面' : ''}"><span class="og-wc-in">${face(mm, 112, { big: true })}</span></button>`).join('')}<button type="button" class="og-wc inv ${i0 === MEM.length ? 'mid' : ''}" data-wi="${MEM.length}" style="--d:${MEM.length - i0}" aria-label="空座位：发邀请码"><span class="og-wc-in"><b>＋</b><small>空座位</small></span></button></div>
      <div class="og-wall-nav"><button type="button" data-wn="-1" aria-label="上一张">‹</button><span>${Array.from({ length: n }, (_, i) => `<i class="${i === i0 ? 'on' : ''}"></i>`).join('')}</span><button type="button" data-wn="1" aria-label="下一张">›</button></div>
      ${plate}</div>`;
  };

  /* ══════════ ⑧-c 公告板 ══════════ */
  const counts = () => { const vis = POSTS.filter((p) => !(p.by && st.blocked.has(p.by))); return { all: vis.length + 1, moment: vis.filter((p) => p.kind === 'moment').length, operation: vis.filter((p) => p.kind !== 'moment').length, minutes: 1 }; };
  const minutesCard = ({ compact = false, open = true } = {}) => pn(55, `<button type="button" class="og-min-h" ${compact ? 'data-act="lastmin"' : 'data-act="minopen"'} aria-expanded="${open}"><span class="og-min-b">会议纪要</span><b>第 ${MIN.week} 周<small>${md(MIN.day)}</small></b><span class="og-min-a">出席 ${MIN.att} / ${MIN.of}</span><em>${open ? '收起' : '展开'}</em></button>
      ${open ? `<div class="og-min-c"><span class="og-lab">这周的目标</span><p><b class="og-big">${MIN.did}</b> / ${MIN.set} 人做到了</p>
        <span class="og-lab">本周称号</span><div class="og-min-t">${MIN.titles.map(([t, n]) => `<span>${chip(t, 'red', t.length)}<small>${n}</small></span>`).join('')}</div>
        <span class="og-lab">下周目标</span><ul class="og-min-g">${MIN.next.map(([n, g]) => `<li><b>${n}</b>「${g}」</li>`).join('')}</ul>
        <small class="og-mu">缺席：${MIN.absent.join('、')}</small></div>` : ''}`, { cls: 'og-min' });
  const tagRow = (p) => `<div class="og-tags">${TAGS.map(([k, l], i) => { const who = (p.tags[k] || []).filter((id) => !st.blocked.has(id)); const mine = (st.reacted[p.id] ?? p.mine) === k; const c = who.length + (mine && !who.includes('m1') ? 1 : 0) - (!mine && who.includes('m1') ? 1 : 0); return `<button type="button" class="og-tag ${mine ? 'on' : ''}" data-tag="${p.id}:${k}" aria-pressed="${mine}" style="clip-path:${q(i + 2.1, 2)}">${l}${c > 0 ? `<b>${c}</b>` : ''}</button>`; }).join('')}</div>`;
  const whoLine = (p) => { const r = st.reacted[p.id] ?? p.mine; const line = TAGS.map(([k, l]) => { let who = (p.tags[k] || []).filter((id) => id !== 'm1' && !st.blocked.has(id)).map((id) => mem(id).name); if (r === k) who = ['我', ...who]; return who.length ? `${who.join('、')}：${l}` : ''; }).filter(Boolean).join(' · '); return line ? `<p class="og-who">${line}</p>` : ''; };
  const postCard = (p, i) => {
    if (p.kind === 'moment') { const a = mem(p.by); return pn(60 + i, `<div class="og-po-h">${face(a, 26)}<span><b>${a.name}</b><small>${p.ago}</small></span><button type="button" class="og-more st" data-pmore="${p.id}" aria-label="更多操作">⋯</button></div><p class="og-po-t">${p.text}</p><div class="og-snap">${p.chips.map((c) => `<span>${c}</span>`).join('')}</div>${tagRow(p)}${whoLine(p)}`, { cls: 'og-po', attrs: `data-lp="${p.id}"` }); }
    if (p.kind === 'op') return pn(60 + i, `<div class="og-po-h"><span class="og-win" style="clip-path:${q(3.1, 2)}">目标达成</span><span><b>${p.text}</b><small>${p.won}</small></span><button type="button" class="og-more st" data-pmore="${p.id}" aria-label="更多操作">⋯</button></div><div class="og-win-who">${p.who.map(([n]) => `<span>${star('var(--red)', 'var(--ink)', 1.4)}${n}</span>`).join('')}</div><p class="og-mu">每人 +6 SP · 据点经验 +5</p>${tagRow(p)}${whoLine(p)}`, { cls: 'og-po', attrs: `data-lp="${p.id}"` });
    return pn(60 + i, `<div class="og-rr"><span class="og-rr-sil" aria-hidden="true">${P5.sil('crouch', { style: 'height:100%;width:auto' })}</span><span class="og-rr-m"><small>满月团战 · 战报</small><b>「${p.boss}」已击退</b><span>${p.hitters} 人出手 · 最后一击 ${p.last}</span></span>${U.ransom('DOWN', { h: 26, seed: 9 })}</div>`, { cls: 'og-po og-po-rr' });
  };
  const boardSec = () => {
    const c = counts(), F = [['all', '全部'], ['moment', '动态'], ['operation', '作战'], ['minutes', '纪要']];
    const list = (st.demo === 'error' ? [] : POSTS).filter((p) => !(p.by && st.blocked.has(p.by))).filter((p) => st.filter === 'all' || (st.filter === 'moment' ? p.kind === 'moment' : st.filter === 'operation' ? p.kind !== 'moment' : false));
    let last = null, html = '';
    list.forEach((p, i) => { if (p.day !== last) { last = p.day; html += `<div class="og-day"><span>${dayLabel(p.day)}</span></div>`; } html += postCard(p, i); });
    const blockedN = POSTS.filter((p) => p.by && st.blocked.has(p.by)).length;
    return `<div class="og-flt" role="tablist" aria-label="公告板筛选">${F.map(([k, l], i) => `<button type="button" role="tab" class="og-fc ${st.filter === k ? 'on' : ''}" data-flt="${k}" aria-selected="${st.filter === k}" style="clip-path:${q(i + 1.7, 2.5)}">${l}<b>${c[k]}</b></button>`).join('')}</div>
      ${st.filter === 'all' || st.filter === 'minutes' ? minutesCard({ open: st.minOpen }) : ''}
      ${html || (st.filter === 'minutes' ? '' : `<p class="og-note">${st.filter === 'moment' ? '最近 30 天没有人分享动态' : '最近 30 天还没有达成的目标、作战或团战'}</p>`)}
      ${blockedN ? `<p class="og-note">已屏蔽 ${blockedN} 条（据点设置里可以解除）</p>` : ''}
      <p class="og-note">公告板只显示最近 30 天 · 长按一条可以举报或屏蔽 · <button type="button" class="og-link" data-act="share">分享一条到据点 ›</button></p>`;
  };

  /* ══════════ ⑧-d 作战 ══════════ */
  const opBoard = (o, i) => {
    const ini = mem(o.by), mineIni = ini.me, pct = Math.round(o.done / o.counted * 100), dueT = o.due <= 0 ? '今天截止' : o.due === 1 ? '明天截止' : `还剩 ${o.due} 天`;
    const rows = o.rows.map(([id, task, src, s]) => { const m = mem(id), me = m.me, dim = s === 'out'; const t = me && st.myPart && o.big ? st.myPart : task;
      return `<div class="og-or ${me ? 'me' : ''} ${dim ? 'dim' : ''}">${face(m, 20)}<span class="og-or-m"><b>${m.name}${me ? '<em>我</em>' : ''}</b><small>${src === 'goal' && o.big && !t ? '<i class="og-mu">还没写自己那一份</i>' : t}</small></span><span class="og-or-s ${s}">${s === 'done' ? '✓ 做完了' : s === 'out' ? '不参加' : '进行中'}</span>
        ${me && s === 'todo' ? `<span class="og-or-a">${btn('去任务里完成', { tone: 'ghost', seed: 610 + i, attrs: 'data-act="todos"' })}${o.big ? btn(st.myPart ? '改写我的一份' : '写下我的一份', { tone: 'ghost', seed: 612 + i, attrs: 'data-act="write"' }) : ''}</span>` : ''}
        ${me && o.big && st.writing ? `<span class="og-or-w"><label><span>我负责的那一份</span><input class="inp" data-part maxlength="30" placeholder="比如：整理第三章的笔记" aria-label="我负责的那一份" value="${st.myPart}"></label><span class="og-or-a">${btn('取消', { tone: 'ghost', seed: 614, attrs: 'data-act="wx"' })}${btn('保存', { seed: 615, attrs: 'data-act="wok"' })}</span></span>` : ''}</div>`; }).join('');
    const myRow = o.rows.find((r) => mem(r[0]).me);
    return pn(80 + i, `<div class="og-ob-h"><span class="og-kind ${o.big ? 'big' : ''}" style="clip-path:${q(o.big ? 4.4 : 3.3, 2)}">${o.big ? '作战' : '目标'}</span><span class="og-due ${o.due <= 1 ? 'hot' : ''}">${dueT}</span><span class="og-ob-d">${md(dOff(o.due))}截止</span>${mineIni ? '' : `<button type="button" class="og-more st" data-omore="${o.id}" aria-label="更多操作">⋯</button>`}</div>
      <p class="og-ob-t">${o.big ? '<em>作战目标</em>' : ''}${o.title}</p><small class="og-ob-i">${ini.name} 发起 · 练 ${ATTR(o.attr)}</small>
      <div class="og-prog"><span><i style="--p:${pct / 100}"></i></span><b>${o.done} / ${o.counted} 人做完</b></div>
      <div class="og-ors">${rows}</div>
      <div class="og-ob-f">${myRow && myRow[3] === 'todo' ? `<button type="button" class="og-ta" data-out="${o.id}">这次不参加</button>` : ''}${mineIni || MEM[0].leader ? `<button type="button" class="og-ta dg" data-cancel="${o.id}">取消${o.big ? '作战' : '目标'}</button>` : ''}</div>`, { cls: 'og-ob' });
  };
  const opsSec = () => st.demo === 'error' ? pn(61, '<p class="og-mu pk3-fail">作战暂时拉不到，稍后点右上角刷新再试。</p>') : `<div class="og-ops-h"><span>进行中 ${OPS.length} 项</span>${btn('＋ 发起', { seed: 620, attrs: 'data-act="opnew"' })}</div>
    ${OPS.map(opBoard).join('')}
    <button type="button" class="og-hist-h" data-act="hist" aria-expanded="${st.hist}"><span>最近 30 天结束的 ${HIST.length} 项</span><em>${st.hist ? '收起' : '展开'}</em></button>
    ${st.hist ? `<div class="og-hist">${HIST.map(([s, t, n, d]) => `<div class="og-hr ${s}"><span class="og-hr-b">${s === 'achieved' ? '达成' : s === 'failed' ? '未达成' : '已取消'}</span><b>${t}</b><small>${n} 人 · ${md(dOff(d))}</small></div>`).join('')}</div>` : ''}`;

  /* ══════════ ⑧-e 会议 ══════════ */
  const meetingSec = () => {
    const open = NOW.getDay() === 0 || (NOW.getDay() === 1 && NOW.getHours() < 4);
    const days = (7 - NOW.getDay()) % 7 || 7, sun = dOff(days);
    const goals = `${pn(91, `<b class="og-h4">这周大家的目标</b>
        <div class="og-mg me"><small>我的</small><b>「${MEM[0].goal}」</b></div>
        ${MEM.slice(1).filter((m) => m.goal && !st.blocked.has(m.id)).map((m) => `<div class="og-mg">${face(m, 18)}<span><b>${m.name}</b>「${m.goal}」</span></div>`).join('')}`, { cls: 'og-mt-goals' })}`;
    if (open) return `${pn(90, `<div class="og-mo-h"><b>周日会议</b><span class="og-live">开会中</span><small>开到周一凌晨 4 点</small></div>
        <p>这周的目标<b>「${MEM[0].goal}」</b>做到了吗？</p><div class="og-rate" role="radiogroup">${['做到了', '差一点', '没做到'].map((t, i) => `<button type="button" role="radio" aria-checked="${!i}" data-rate="${i}" style="clip-path:${q(i + 2.3, 2.5)}">${t}</button>`).join('')}</div>
        <label class="og-fld"><span>下周想做到的一件事</span><input class="inp" maxlength="30" placeholder="比如：每天背 30 个单词" aria-label="下周目标"></label>
        <div class="og-acts">${btn('交上去', { seed: 630, attrs: 'data-act="msubmit"' })}</div><p class="og-mu">写好的目标组织里的人都能看到；会议结束后会出一份纪要，发到公告板上。</p>`, { cls: 'og-mo' })}
      ${pn(92, `<div class="og-mo-h"><b>点名</b><small>已写 2 / ${MEM.length}</small></div><div class="og-roll">${MEM.map((m, i) => `<span class="${i < 2 ? 'ok' : ''} ${m.me ? 'me' : ''}">${m.name}${m.me ? '（我）' : ''}</span>`).join('')}</div>`)}${goals}`;
    return `${pn(90, `<div class="og-mc"><span class="og-mc-d"><b>${days}</b><small>${days === 1 ? '明天就开' : '天后'}</small></span><span class="og-mc-m"><small>NEXT MEETING</small><b>下一场：周日（${sun.getMonth() + 1} 月 ${sun.getDate()} 日）</b></span></div>
        <p class="og-mu">周日全天（到周一凌晨 4 点）来这里：给这周的目标打个分，再写一句下周目标。会上写了目标的人，据点经验各 +2。</p><div class="og-acts">${btn('先看看会议室 ›', { tone: 'ghost', seed: 631, attrs: 'data-act="meeting"' })}</div>`, { cls: 'og-mclosed' })}
      ${goals}
      <span class="og-lab st">上一次的会议纪要</span>${minutesCard({ compact: true, open: st.lastMin })}`;
  };

  const secBody = () => st.sec === 'roster' ? (st.roster === 'wall' ? rosterWall() : rosterGrid()) : st.sec === 'board' ? boardSec() : st.sec === 'ops' ? opsSec() : meetingSec();

  /* ══════════ ⑨ InvitePanel  ⑩ SlotLinks  · 状态面板 ══════════ */
  const invitePanel = () => pn(33, `<button type="button" class="og-inv-h" data-act="inv" aria-expanded="${st.invite}" aria-controls="og-inv-b"><span>INVITE · 邀请码</span><em>${st.invite ? '收起' : '展开'}<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" style="transform:rotate(${st.invite ? 180 : 0}deg)"><path d="M2.5 4.5L6 8L9.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></em></button>
    <div class="og-inv-b" id="og-inv-b" ${st.invite ? '' : 'hidden'}><div><b class="og-code">${ORG.code.slice(0, 4)} ${ORG.code.slice(4)}</b><small>羁绊页点标题切到「组织」输入</small></div><span class="og-inv-a">${btn('分享', { seed: 640, attrs: 'data-act="ishare"' })}${btn('复制', { tone: 'ghost', seed: 641, attrs: 'data-act="icopy"' })}</span></div>`, { cls: 'og-inv' });
  const slotLinks = () => st.demo === 'two' ? '' : `<p class="og-slot"><span>还可以</span><button type="button" data-act="join">加入一个组织</button></p>`;
  const noticeBar = () => st.demo === 'notice' ? pn(11, `<div class="og-notice"><span>「晨跑同盟」的队长请你离开了组织。之前分享的动态已经收起来。</span><button type="button" data-act="notice">知道了</button></div>`, { cls: 'og-notice-pn' }) : '';
  const switcher = () => st.demo === 'two' ? `<div class="og-sw" role="tablist" aria-label="我的组织">${[[ORG.name, ORG.emblem, '我建的', MEM.length, false], [ORG2.name, ORG2.emblem, '我加入的', ORG2.n, true]].map(([n, e, s, c, dot], i) => `<button type="button" role="tab" class="og-swb ${st.org === i ? 'on' : ''}" data-org="${i}" aria-selected="${st.org === i}"><i style="clip-path:${q(i + 2.7, 3)}"></i>${emblem(e, 26, i + 1)}<span><b>${n}</b><small>${s} · ${c} / 7</small></span>${dot ? '<em class="og-dot rel"></em>' : ''}</button>`).join('')}</div>` : '';
  const conflict = () => st.demo === 'nocard' ? pn(17, `<div class="og-cf"><span>还没选代表牌：选一张，名册上才有你的牌面。</span>${btn('去选', { seed: 650, attrs: 'data-act="pick"' })}</div>`) : '';
  const loginPanel = () => pn(7, `<b class="og-h3">登录之后才能用组织</b><p class="og-mu">和几个朋友建一个据点：名册、公告板、周日会议，最多 7 人。组织放在云端，要先登录账号。</p><div class="og-acts l">${btn('去登录', { seed: 660, attrs: 'data-act="login"' })}</div>`, { cls: 'og-solo' });
  const emptyPanel = () => pn(7, `<div class="og-ep-h"><b class="og-h3">还没有组织</b><span>HIDEOUT</span></div><p class="og-mu">和几个朋友建一个据点：名册上挂着大家的代表牌，公告板上互相打气，每周日开个小会写下周目标。最多 7 人；每人最多自建一个、加入一个。</p><div class="og-acts l">${btn('建立组织', { seed: 661, attrs: 'data-act="create"' })}${btn('输入邀请码', { tone: 'ghost', seed: 662, attrs: 'data-act="join"' })}</div>`, { cls: 'og-solo' });
  const DEMO = [['normal', '正常'], ['two', '两个组织'], ['notice', '本机提示'], ['nocard', '未选代表牌'], ['error', '分区拉取失败'], ['loading', '加载中'], ['empty', '还没有组织'], ['login', '未登录']];
  const demoStrip = () => `<div class="og-demo" aria-label="DEMO 状态（只用于演示，不接入）"><small>DEMO 状态 · 不接入</small><div>${DEMO.map(([k, l]) => `<button type="button" data-demo="${k}" aria-pressed="${st.demo === k}">${l}</button>`).join('')}<button type="button" data-demo-raid aria-pressed="${st.raid}">团战三晚 ${st.raid ? '开' : '关'}</button><button type="button" data-demo-lead aria-pressed="${!MEM[0].leader}">${MEM[0].leader ? '队长视角' : '成员视角'}</button><button type="button" data-celeb="level">演出：据点升级</button><button type="button" data-celeb="raid">演出：团战击退</button><button type="button" data-celeb="op">演出：作战达成</button></div></div>`;

  /* ══════════ 成员牌放大翻面（FlipCardView + MemberCardFront / Back） ══════════ */
  const radar = (v) => { const pts = (r) => v.map((_, i) => { const a = (-90 + i * 72) * Math.PI / 180; return `${(50 + Math.cos(a) * r * (typeof _ === 'number' ? 1 : 1)).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`; }).join(' ');
    const val = v.map((x, i) => { const a = (-90 + i * 72) * Math.PI / 180, r = 8 + x / 5 * 34; return `${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`; }).join(' ');
    return `<svg class="og-radar" viewBox="0 0 100 100" aria-hidden="true"><polygon points="${pts(42)}" fill="#111" stroke="var(--p5r-paper)" stroke-width="2"/><polygon points="${pts(28)}" fill="none" stroke="#3a3a3a" stroke-width="1"/><polygon points="${val}" fill="var(--red)" stroke="var(--p5r-paper)" stroke-width="1.6" stroke-linejoin="bevel"/>${P5.ATTR_ORDER.map((k, i) => { const a = (-90 + i * 72) * Math.PI / 180; return `<text x="${(50 + Math.cos(a) * 48).toFixed(1)}" y="${(52 + Math.sin(a) * 48).toFixed(1)}" text-anchor="middle" font-size="6.5" font-weight="900" fill="var(--ink)">${P5.ATTR[k].name}</text>`; }).join('')}</svg>`; };
  function openFlip(id) {
    const m = mem(id); if (!m) return;
    const v = document.createElement('div'); v.className = 'og-fv'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-label', `${m.name} 的成员牌`);
    const backTab = (t) => t === 'masks' ? `<div class="og-fb-ms">${m.masks.length ? m.masks.slice(0, 3).map((n, i) => `<div class="og-fb-mk"><span class="og-fb-sil">${P5.sil(['leap', 'point', 'crouch'][i], { style: 'height:100%;width:auto' })}</span><b>${n}</b><small>${['疾风斩 · 伤害', '火焰 · 伤害', '回复之风 · 回复'][i]}</small></div>`).join('') : '<p class="og-mu">Ta 没有展示面具。</p>'}</div><div class="og-fb-g"><small>本周目标</small><b>${m.goal ? `「${m.goal}」` : '这周没写'}</b>${m.result ? `<small>上周自评：${m.result}</small>` : ''}</div>`
      : `${radar(m.stats)}<div class="og-fb-st"><span><small>总等级</small><b>LV ${m.lv}</b></span><span><small>总点数</small><b>${m.lv * 31}</b></span></div>`;
    v.innerHTML = `<button type="button" class="og-fv-x" aria-label="关闭">✕</button><div class="og-fv-stage"><div class="og-fv-card" tabindex="0" aria-label="点一下或左右拖动翻面">
        <div class="og-fv-f">${face(m, 150, { big: true, avatar: false })}<span class="og-fv-seat">${pad2(m.seat)}</span><b class="og-fv-n">${m.name}${m.leader ? ' 👑' : ''}</b><small>${m.status || `${m.card[2]} ${m.card[0]}`}</small><div class="og-fv-r">${'<span class="og-lv">LV ' + m.lv + '</span>'}<span>连续 ${m.streak} 天</span></div>${week(m.week, undefined, 11)}<div class="og-mt-h">${m.titles.map((t) => `<span class="og-hon">${t}</span>`).join('')}${m.absent ? '<span class="og-hon mu">本周缺席</span>' : ''}</div></div>
        <div class="og-fv-b"><div class="og-fb-tabs" role="tablist">${[['stats', '五维'], ['masks', '面具']].map(([k, l], i) => `<button type="button" role="tab" data-ft="${k}" aria-selected="${!i}">${l}</button>`).join('')}</div><div class="og-fb-body">${backTab('stats')}</div><small class="og-fb-j">${m.joined} 加入</small></div>
      </div></div><p class="og-fv-hint">点一下或左右拖动翻面</p>${!m.me && m.masks.length ? `<div class="og-fv-ft">${btn('同调', { seed: 670, sm: false, attrs: 'data-sync="' + m.id + '"' })}</div>` : ''}`;
    document.body.appendChild(v);
    const card = v.querySelector('.og-fv-card'); let fl = false;
    const close = () => v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: RM() ? 0 : 160, fill: 'both' }).onfinish = () => v.remove();
    const flip = () => { fl = !fl; card.classList.toggle('fl', fl); P5.sfx('tarot', .4); };
    v.addEventListener('click', (e) => {
      if (e.target === v || e.target.closest('.og-fv-x')) return close();
      const t = e.target.closest('[data-ft]'); if (t) { e.stopPropagation(); v.querySelectorAll('[data-ft]').forEach((x) => x.setAttribute('aria-selected', x === t)); v.querySelector('.og-fb-body').innerHTML = backTab(t.dataset.ft); return; }
      const s = e.target.closest('[data-sync]'); if (s) { close(); od('openBorrowMask'); return; }
      if (e.target.closest('.og-fv-card')) flip();
    });
    let x0 = null; card.addEventListener('pointerdown', (e) => x0 = e.clientX); card.addEventListener('pointerup', (e) => { if (x0 !== null && Math.abs(e.clientX - x0) > 40) { flip(); card.dataset.dragged = 1; } x0 = null; });
    card.addEventListener('click', (e) => { if (card.dataset.dragged) { e.stopPropagation(); delete card.dataset.dragged; } }, true);
    addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); removeEventListener('keydown', k); } });
    if (!RM()) { v.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: 'both' }); card.animate([{ transform: 'translateY(60px) rotate(-6deg) scale(.7)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }); }
  }

  /* ══════════ 菜单 / 确认 ══════════ */
  const confirmBox = (title, desc, ok, fn, cancel = '取消') => P5.sheet(title, `<p class="sh-p">${desc}</p><div class="sh-acts">${U.btn(cancel, { tone: 'ink', seed: 680, attrs: 'data-x' })}${U.btn(ok, { tone: 'red', size: 'lg', seed: 681, attrs: 'data-ok' })}</div>`, { seed: 45, onMount: (sh, close) => { sh.querySelector('[data-x]').onclick = close; sh.querySelector('[data-ok]').onclick = () => { close(); fn && fn(); }; } });
  const REASONS = ['骚扰 / 攻击', '不当内容', '广告 / 引流', '其他'];
  const report = (what, done) => P5.actionSheet('举报的理由', REASONS.map((r) => ({ label: r, onClick: () => { P5.toast(what === 'op' ? '已举报，会在 2 天内处理' : '已举报，这条不再显示；会在 2 天内处理'); done && done(); } })));
  const memberMenu = (id, root) => {
    const m = mem(id), list = [{ label: '查看成员牌', onClick: () => openFlip(id) }];
    if (m.me) list.push({ label: '修改我的牌', onClick: () => od('openOrgOnboard', 'create') });
    else { const b = st.blocked.has(id); if (m.masks.length) list.push({ label: '同调', onClick: () => od('openBorrowMask') }); list.push({ label: b ? '解除屏蔽' : '屏蔽此人（只在本机生效）', onClick: () => { b ? st.blocked.delete(id) : st.blocked.add(id); P5.toast(b ? '已解除屏蔽' : '已屏蔽，之后不再显示 Ta 的动态'); refresh(root); } }); if (MEM[0].leader) list.push({ label: '转让队长 / 请离…', onClick: () => od('openOrgSettings', true) }); }
    P5.actionSheet(m.name, list);
  };
  const postMenu = (pid, root) => {
    const p = POSTS.find((x) => x.id === pid), list = [];
    if (p.by && !mem(p.by).me) { const b = st.blocked.has(p.by); list.push({ label: '举报这条', onClick: () => report('post', () => { POSTS.splice(POSTS.indexOf(p), 1); refresh(root); }) }); list.push({ label: b ? '解除屏蔽' : '屏蔽此人（只在本机生效）', onClick: () => { b ? st.blocked.delete(p.by) : st.blocked.add(p.by); P5.toast(b ? '已解除屏蔽' : '已屏蔽，之后不再显示 Ta 的动态'); refresh(root); } }); }
    if (p.kind === 'op') list.push({ label: '举报这条', onClick: () => report('post') });
    if (p.kind === 'moment' && MEM[0].leader) list.push({ label: '删除这条（队长）', tone: 'danger', onClick: () => confirmBox('删除这条动态？', `「${p.text}」和它上面的标签会一起删除。`, '删除', () => { POSTS.splice(POSTS.indexOf(p), 1); P5.toast('删掉了'); refresh(root); }) });
    P5.actionSheet(p.kind === 'op' ? '目标达成' : mem(p.by).name, list);
  };

  /* ══════════ 局部刷新 ══════════ */
  const animIn = (els, from = 'right') => { if (RM()) return; [...els].forEach((el, i) => el.animate([{ opacity: 0, transform: from === 'right' ? 'translateX(46px) skewX(-8deg)' : 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: 280, delay: i * 40, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'backwards' })); };
  function refresh(root, { sec = true, map = true, anim = false } = {}) {
    if (!root || !root.isConnected || !root.querySelector('.og-st')) return;
    if (map) { const mw = root.querySelector('.og-map-wrap'); if (mw) { mw.outerHTML = mapBlock(); fitMap(root); } }
    if (sec) { root.querySelector('.og-st').outerHTML = secTitle(); const b = root.querySelector('.og-sec-b'); b.innerHTML = secBody(); if (anim) animIn(b.children); }
  }
  /** 叠在地图上的地标 / 座位是固定像素：跟着地图宽度缩放（.72–1.15，同 HideoutMap） */
  const fitMap = (root) => root.querySelectorAll('.og-map').forEach((m) => m.style.setProperty('--sc', Math.max(.74, Math.min(1.15, m.clientWidth / 360)).toFixed(3)));
  function setSec(root, k) {
    if (k === st.sec) return; st.sec = k; if (k === 'board') seen.board = true; if (k === 'ops') seen.ops = true;
    P5.sfx('nav', .4); refresh(root, { anim: true });
    const lm = root.querySelector(`.og-lm[data-sec="${k}"] .og-lm-f`); if (lm && !RM()) lm.animate([{ transform: 'scale(1.4) rotate(-8deg)' }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    if (!P5.isWide()) { const t = root.querySelector('.og-st'); const y = t.getBoundingClientRect().top; if (y > innerHeight * .7 || y < 0) scrollTo({ top: scrollY + y - 70, behavior: RM() ? 'auto' : 'smooth' }); }
  }

  /* ══════════ 页面 ══════════ */
  export const orgPage = {
    nav: 'coop', title: '据点',
    render(wide) {
      const has = st.demo !== 'empty' && st.demo !== 'login' && st.demo !== 'loading';
      if (st.demo === 'loading') return `<div class="og ${wide ? 'wd' : ''}">${bondHead('org', '')}<div class="og-solo-w">${pn(9, '<b class="og-h3 pk3-loading">正在找你的组织…</b>', { cls: 'og-solo' })}</div>${demoStrip()}</div>`;
      const head = bondHead('org', has ? hIcon('refresh', st.spin ? '刷新中' : '刷新', ICON_R, 7) + hIcon('settings', '据点设置', ICON_G, 4) : '');
      if (!has) return `<div class="og ${wide ? 'wd' : ''}">${head}<div class="og-solo-w">${st.demo === 'login' ? loginPanel() : emptyPanel()}</div>${demoStrip()}</div>`;
      return `<div class="og ${wide ? 'wd' : ''}">${head}
        <div class="og-body">
          <div class="og-cl">${noticeBar()}${switcher()}${titleBlock()}${conflict()}${mapBlock()}</div>
          <div class="og-cr"><section class="og-sec" aria-live="polite">${secTitle()}<div class="og-sec-b">${secBody()}</div></section></div>
          <div class="og-cf2">${invitePanel()}${slotLinks()}</div>
        </div>${demoStrip()}</div>`;
    },
    mount(root) {
      fitMap(root); requestAnimationFrame(() => fitMap(root));
      const onR = () => { if (!document.contains(root)) return removeEventListener('resize', onR); fitMap(root); }; addEventListener('resize', onR);
      const sc = root.querySelector('.og-sec-b');
      root.addEventListener('click', (e) => {
        const t = e.target;
        const dm = t.closest('[data-demo]'); if (dm) { st.demo = dm.dataset.demo; st.org = 0; P5.rerender(); return; }
        if (t.closest('[data-demo-raid]')) { st.raid = !st.raid; P5.rerender(); return; }
        if (t.closest('[data-demo-lead]')) { setLeader(!MEM[0].leader); P5.rerender(); return; }
        const ce = t.closest('[data-celeb]'); if (ce) { od('openOrgCeleb', ce.dataset.celeb); return; }
        const sec = t.closest('[data-sec]'); if (sec) { setSec(root, sec.dataset.sec); return; }
        const seat = t.closest('[data-seat]'); if (seat) { openFlip(seat.dataset.seat); return; }
        const fc = t.closest('[data-face]'); if (fc) { e.stopPropagation(); st.face = st.face === 'card' ? 'avatar' : 'card'; refresh(root, { map: false }); return; }
        const mo = t.closest('[data-more]'); if (mo) { e.stopPropagation(); memberMenu(mo.dataset.more, root); return; }
        const sy = t.closest('[data-sync]'); if (sy) { od('openBorrowMask'); return; }
        const op = t.closest('[data-open]'); if (op) { openFlip(op.dataset.open); return; }
        const wi = t.closest('[data-wi]'), wn = t.closest('[data-wn]');
        if (wi || wn) { const n = wn ? Math.max(0, Math.min(MEM.length, st.wall + +wn.dataset.wn)) : +wi.dataset.wi;
          if (n === st.wall && wi) { if (n === MEM.length) { P5.toast('邀请语已复制，发给朋友吧'); return; } const c = wi.querySelector('.og-wc-in'); if (!RM()) c.animate([{ transform: 'rotateY(0)' }, { transform: 'rotateY(90deg) scale(1.05)' }, { transform: 'rotateY(0)' }], { duration: 520, easing: 'cubic-bezier(.65,0,.35,1)' }); setTimeout(() => openFlip(MEM[n].id), RM() ? 0 : 260); return; }
          if (n !== st.wall) { st.wall = n; P5.sfx('tarot', .4); const wall = root.querySelector('.og-wall'); const bgEl = wall.querySelector('.og-wall-bg'); wall.querySelectorAll('.og-wc').forEach((c, i) => { c.style.setProperty('--d', i - n); c.classList.toggle('mid', i === n); }); bgEl.style.setProperty('--rot', `${n * 60}deg`); wall.querySelectorAll('.og-wall-nav i').forEach((d, i) => d.classList.toggle('on', i === n)); const pl = wall.querySelector('.og-plate'); const tmp = document.createElement('div'); tmp.innerHTML = rosterWall(); pl.replaceWith(tmp.querySelector('.og-plate')); animIn([wall.querySelector('.og-plate')]); }
          return; }
        const flt = t.closest('[data-flt]'); if (flt) { st.filter = flt.dataset.flt; sc.innerHTML = secBody(); animIn(sc.children); return; }
        const tg = t.closest('[data-tag]'); if (tg) { const [pid, k] = tg.dataset.tag.split(':'); const p = POSTS.find((x) => x.id === pid); const cur = st.reacted[pid] ?? p.mine; st.reacted[pid] = cur === k ? null : k; const card = tg.closest('.og-po'); const tmp = document.createElement('div'); tmp.innerHTML = postCard(p, POSTS.indexOf(p)); card.querySelector('.og-tags').outerHTML = tmp.querySelector('.og-tags').outerHTML; const w = card.querySelector('.og-who'), nw = tmp.querySelector('.og-who'); if (w) w.remove(); if (nw) card.querySelector('.og-tags').after(nw); if (st.reacted[pid] && !RM()) { const nb = card.querySelector(`[data-tag="${pid}:${k}"]`); nb.animate([{ transform: 'scale(1.35) rotate(-6deg)' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.34,1.56,.64,1)' }); } return; }
        const pm = t.closest('[data-pmore]'); if (pm) { postMenu(pm.dataset.pmore, root); return; }
        const om = t.closest('[data-omore]'); if (om) { const o = OPS.find((x) => x.id === om.dataset.omore); P5.actionSheet(o.title, [{ label: `举报这个${o.big ? '作战' : '目标'}`, onClick: () => report('op') }, { label: '屏蔽发起人（只在本机生效）', onClick: () => { st.blocked.add(o.by); P5.toast('已屏蔽，不再显示 Ta 的动态'); refresh(root); } }]); return; }
        const ou = t.closest('[data-out]'); if (ou) { confirmBox('这次不参加？', '你会从这场作战的名单里退出，任务里那条会收起来。退出之后不能再回来。', '不参加了', () => { const o = OPS.find((x) => x.id === ou.dataset.out); o.rows.find((r) => mem(r[0]).me)[3] = 'out'; o.counted--; P5.toast('这次不参加了，任务里那条已经收起来'); refresh(root, { map: false }); }, '再想想'); return; }
        const cn = t.closest('[data-cancel]'); if (cn) { const o = OPS.find((x) => x.id === cn.dataset.cancel); const L = o.big ? '作战' : '目标'; confirmBox(`取消这个${L}？`, `「${o.title}」：所有人任务里的这一条都会收起来，已经做完的不受影响。这一步不能撤销。`, `取消${L}`, () => { OPS.splice(OPS.indexOf(o), 1); HIST.unshift(['cancelled', o.title, `${o.done}/${o.counted}`, 0]); P5.toast(`${L}已取消`); refresh(root, { map: false }); }, '再想想'); return; }
        const rt = t.closest('[data-rate]'); if (rt) { root.querySelectorAll('[data-rate]').forEach((x) => x.setAttribute('aria-checked', x === rt)); return; }
        const a = t.closest('[data-act]'); if (!a) return;
        const A = a.dataset.act;
        ({
          refresh: () => { const g = a.querySelector('.og-hi-g'); if (!RM()) g.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: 900, easing: 'linear' }); },
          settings: () => od('openOrgSettings', MEM[0].leader),
          lv: () => { st.lv = !st.lv; a.setAttribute('aria-expanded', st.lv); a.querySelector('em').textContent = st.lv ? '▴' : '▾'; const x = root.querySelector('.og-lvl-x'); x.hidden = !st.lv; if (st.lv) animIn([x], 'up'); },
          titles: () => od('openOrgTitles', true),
          raid: () => od('openRaid', 'night'),
          map: () => od('openHideoutMap', st.raid ? 'raid' : 'calm'),
          rview: () => { st.roster = st.roster === 'wall' ? 'grid' : 'wall'; P5.sfx('switch', .4); refresh(root, { map: false, anim: true }); },
          invite: () => P5.toast('邀请语已复制，发给朋友吧'),
          minopen: () => { st.minOpen = !st.minOpen; sc.innerHTML = secBody(); },
          lastmin: () => { st.lastMin = !st.lastMin; sc.innerHTML = secBody(); },
          share: () => od('openShareToOrg'),
          opnew: () => od('openOpCreate', 'small'),
          todos: () => P5.go('todos', { via: 'tear' }),
          write: () => { st.writing = true; sc.innerHTML = secBody(); const i = sc.querySelector('[data-part]'); i && i.focus(); },
          wx: () => { st.writing = false; sc.innerHTML = secBody(); },
          wok: () => { const v = (sc.querySelector('[data-part]').value || '').trim(); if (!v) return P5.toast('先写一句'); st.myPart = v; st.writing = false; sc.innerHTML = secBody(); P5.toast('写好了，任务里那条也跟着改了'); },
          hist: () => { st.hist = !st.hist; sc.innerHTML = secBody(); if (st.hist) animIn(sc.querySelectorAll('.og-hr')); },
          meeting: () => od('openMeeting', 'before'),
          msubmit: () => P5.toast('交上去了，下周见'),
          inv: () => { st.invite = !st.invite; a.setAttribute('aria-expanded', st.invite); a.querySelector('em').firstChild.textContent = st.invite ? '收起' : '展开'; a.querySelector('svg').style.transform = `rotate(${st.invite ? 180 : 0}deg)`; const b = root.querySelector('.og-inv-b'); b.hidden = !st.invite; if (st.invite) animIn([b], 'up'); },
          ishare: () => P5.toast('邀请语已复制，发给朋友吧'),
          icopy: () => P5.toast('邀请码已复制'),
          join: () => od('openOrgOnboard', 'join'),
          create: () => od('openOrgOnboard', 'create'),
          pick: () => od('openOrgOnboard', 'create'),
          login: () => P5.go('account', { via: 'tear' }),
          notice: () => { const n = root.querySelector('.og-notice-pn'); const done = () => { st.demo = 'normal'; n.remove(); root.querySelectorAll('[data-demo]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.demo === 'normal')); }; if (RM()) done(); else n.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateX(40px)' }], { duration: 200, fill: 'both' }).onfinish = done; },
        }[A] || (() => {}))();
      });
      root.addEventListener('click', (e) => { const o = e.target.closest('[data-org]'); if (!o) return; st.org = +o.dataset.org; root.querySelectorAll('[data-org]').forEach((x) => { const on = +x.dataset.org === st.org; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); }); if (st.org === 1) P5.toast(`切到「${ORG2.name}」（演示共用一套数据）`); });
      root.addEventListener('keydown', (e) => { const t = e.target.closest('[data-open]'); if (t && (e.key === 'Enter' || e.key === ' ') && e.target === t) { e.preventDefault(); openFlip(t.dataset.open); } if (st.sec === 'roster' && st.roster === 'wall' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.target.closest('.og-wall')) { const b = root.querySelector(`[data-wn="${e.key === 'ArrowLeft' ? -1 : 1}"]`); b && b.click(); } });
      // 长按动态 = 「⋯」菜单（500ms / 10px 容差）
      const lp = (el) => P5.longPress(el, () => postMenu(el.dataset.lp, root));
      new MutationObserver(() => root.querySelectorAll('[data-lp]:not([data-lpb])').forEach((el) => { el.dataset.lpb = 1; lp(el); })).observe(root, { childList: true, subtree: true });
      root.querySelectorAll('[data-lp]').forEach((el) => { el.dataset.lpb = 1; lp(el); });
      // 专辑墙横拖切换
      let wx = null; root.addEventListener('pointerdown', (e) => { if (e.target.closest('.og-wall-row')) wx = e.clientX; });
      root.addEventListener('pointerup', (e) => { if (wx === null) return; const dx = e.clientX - wx; wx = null; if (Math.abs(dx) > 40) { const b = root.querySelector(`[data-wn="${dx < 0 ? 1 : -1}"]`); b && b.click(); } });
    },
    enter(root) {
      const tiles = root.querySelectorAll('.og-bt-b.on .og-bt-t');
      tiles.forEach((t, i) => t.animate([{ opacity: 0, transform: `translateY(${t.dataset.y}px) scale(1.7) rotate(${t.dataset.r * 4}deg)` }, { opacity: 1, transform: `translateY(${t.dataset.y}px) scale(.94) rotate(${-t.dataset.r * .5}deg)`, offset: .7 }, { opacity: 1, transform: `translateY(${t.dataset.y}px) rotate(${t.dataset.r}deg)` }], { duration: 420, delay: i * 60, easing: 'cubic-bezier(.15,.95,.1,1)', fill: 'backwards' }));
      root.querySelectorAll('.og-col .og-ct').forEach((t, i) => t.animate([{ opacity: 0, transform: `translateY(${t.dataset.dy}px) scale(1.5) rotate(${t.dataset.r * 3}deg)` }, { opacity: 1, transform: `translateY(${t.dataset.dy}px) rotate(${t.dataset.r}deg)` }], { duration: 380, delay: 160 + i * 45, easing: 'cubic-bezier(.34,1.4,.64,1)', fill: 'backwards' }));
      P5.panelIn(root.querySelectorAll('.og-ttl-k, .og-ttl-m, .og-meta, .og-lvl, .og-notice-pn, .og-sw, .og-cf, .og-solo'), { stagger: .05, delay: .1 });
      const map = root.querySelector('.og-map'); if (map) map.animate([{ opacity: 0, transform: 'translateY(30px) rotate(-2.5deg) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 460, delay: 200, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
      root.querySelectorAll('.og-lm-f, .og-seat, .og-hq, .og-boss').forEach((el, i) => el.animate([{ opacity: 0, transform: 'scale(0) rotate(-20deg)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: 420 + i * 40, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }));
      P5.panelIn(root.querySelectorAll('.og-raid-pn, .og-st, .og-sec-b > *, .og-inv, .og-slot'), { from: 'right', stagger: .045, delay: .3 });
    },
  };

  /* ══════════ 羁绊页补件（Cooperation.tsx：筛选 Tabs / 专辑墙 ⇄ 列表 / 列表条目 / 在线好友卡 / 快捷祈愿 / 新增同伴 FAB） ══════════
     coop 页（pages/pages_a.js）调用；样式在 pages/pages.css 末尾的 .cp- 段。 */
  /** ConfidantNameFx（红频道）：waiting = 待回祈流光（窗口高光横扫，只动 transform）；max = 满级猩红 + 三颗上浮粒子 */
  const nameFx = (name, { waiting = false, max = false } = {}) => !waiting && !max ? `<b>${name}</b>` : `<b class="cp-nfx ${waiting ? 'wait' : ''} ${max ? 'max' : ''}"><span class="nf-t">${name}</span>${waiting ? `<span class="nf-hl" aria-hidden="true"><span class="nf-hi">${name}</span></span>` : ''}${max ? '<i class="nf-sp" aria-hidden="true"><i></i><i></i><i></i></i>' : ''}</b>`;
  const LVL = ['初见', '初识', '熟面孔', '伙伴', '友人', '挚友', '知己', '羁绊', '共鸣', '灵魂伙伴', '圆满'];
  const FRIENDS = [
    { id: 'f1', name: '喜多川祐介', uid: 'yusuke_k', lv: 18, status: '🎨 写生中', goal: '这周画完一幅油画', pact: false, waiting: false },
    { id: 'f2', name: '明智吾郎', uid: 'goro_a', lv: 26, status: null, goal: '每天读 30 页推理小说', pact: true, waiting: true },
  ];
  const prayed = new Set();
  const cf = (i) => (OC.CF && OC.CF[i]) || {};
  const coopMeta = (i) => { const x = cf(i); return { online: x.source === 'online', archived: !!x.archivedAt, pts: x.intimacyPoints || 0, base: x.base || 0, next: x.next || 0, rev: x.orientation === 'reversed', decay: !!x.decayEnabled, waiting: i === 3, shadow: i === 3 ? 62 : null }; };
  const coopVis = (filter) => P5.D.confidants.map((_, i) => i).filter((i) => { const m = coopMeta(i); return filter === 'archived' ? m.archived : !m.archived && (filter === 'all' || (filter === 'online' ? m.online : !m.online)); })
    .sort((a, b) => (coopMeta(a).online ? 0 : 1) - (coopMeta(b).online ? 0 : 1));
  const FILTERS = [['all', '全部'], ['offline', '离线'], ['online', '在线'], ['archived', '归档']];
  const coopBar = (filter, view) => `<div class="cp-bar"><div class="cp-tabs" role="tablist" aria-label="同伴筛选">${FILTERS.map(([k, l], i) => `<button type="button" role="tab" class="cp-tab ${filter === k ? 'on' : ''}" data-cpf="${k}" aria-selected="${filter === k}"><i aria-hidden="true" style="clip-path:polygon(${3 + (k.length % 3)}px 1px, calc(100% - 1px) 3px, calc(100% - 4px) calc(100% - 1px), 1px calc(100% - 3px))"></i><i aria-hidden="true"></i><span>${l}</span></button>`).join('')}</div>
    <button type="button" class="cp-view" data-cpv aria-label="${view === 'wall' ? '切换到列表视图' : '切换到专辑墙视图'}" title="${view === 'wall' ? '列表视图' : '专辑墙视图'}"><i aria-hidden="true"></i><span>${view === 'wall' ? '☰' : '🃏'}</span></button></div>`;
  const prayBtn = (key, waiting) => { const done = prayed.has(key); return `<button type="button" class="cp-pray ${done ? 'done' : ''} ${waiting && !done ? 'wait' : ''}" data-pray="${key}" ${done ? 'disabled' : ''} aria-label="${done ? '今日已祈愿' : '为 Ta 祈愿'}" title="${done ? '今日已祈愿' : waiting ? '回敬祈愿 · 双方 +3 SP' : '祈愿 · 双方各 +2 SP'}"><i aria-hidden="true"></i><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">${done ? '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>' : '<path d="M12 1.5l2.6 7.9 7.9 2.6-7.9 2.6L12 22.5l-2.6-7.9L1.5 12l7.9-2.6z" fill="currentColor"/>'}</svg></button>`; };
  const miniTarot = (arcana) => `<img class="cp-li-face" width="40" height="65" src="${slotTarot(TAROT_ID[arcana])}" alt="" aria-hidden="true" draggable="false" decoding="async">`;
  const prayLine = (key, waiting) => prayed.has(key) ? '今日已祈愿 · 凌晨 4 点刷新' : waiting ? 'Ta 今天为你祈愿了 · 回敬一下双方各 +3 SP' : '祈愿 · 双方各 +2 SP';
  const friendCard = (f, i) => `<div class="cp-li cp-fr" role="button" tabindex="0" data-cpfr="${f.id}" aria-label="${f.name}（在线好友）：打开名片">
      <i class="og-l og-l1" aria-hidden="true" style="clip-path:${q(i + 21.13, 5)}"></i><i class="og-l og-l2" aria-hidden="true" style="clip-path:${q(i + 21.29, 4)}"></i><i class="og-l og-l3" aria-hidden="true" style="clip-path:${q(i + 21.47, 3)}"></i>
      <span class="cp-fr-av" aria-hidden="true">${[...f.name][0]}</span>
      <span class="cp-li-m"><span class="cp-li-n"><svg class="cp-ostar ${f.waiting && !prayed.has(f.id) ? 'glow' : ''}" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 1.5l2.6 7.9 7.9 2.6-7.9 2.6L12 22.5l-2.6-7.9L1.5 12l7.9-2.6z" fill="var(--red)"/></svg>${nameFx(f.name, { waiting: f.waiting && !prayed.has(f.id) })}<em class="cp-on">ONLINE</em>${f.waiting && !prayed.has(f.id) ? '<em class="cp-wait">待回应</em>' : ''}</span>
        <small>@${f.uid} · ${f.status ? f.status : `LV ${f.lv}`}</small>
        ${f.pact ? '<span class="cp-li-tags"><em class="cp-pact">一起进步</em></span>' : ''}
        <small class="cp-goal">目标 · ${f.goal}</small><small class="cp-pl">${prayLine(f.id, f.waiting)}</small></span>
      ${prayBtn(f.id, f.waiting)}</div>`;
  const confCard = (i, k) => { const c = P5.D.confidants[i], m = coopMeta(i), gap = Math.max(0, m.next - m.pts), max = c.rank >= 10;
    return `<div class="cp-li ${m.online ? 'on' : ''}" role="button" tabindex="0" data-cpi="${i}" aria-label="${c.name}：打开详情">
      <i class="og-l og-l1" aria-hidden="true" style="clip-path:${q(i + 31.13, 5)}"></i><i class="og-l og-l2" aria-hidden="true" style="clip-path:${q(i + 31.29, 4)}"></i><i class="og-l og-l3" aria-hidden="true" style="clip-path:${q(i + 31.47, 3)}"></i>
      ${miniTarot(c.arcana)}
      <span class="cp-li-m"><span class="cp-li-n">${m.online ? `<svg class="cp-ostar ${m.waiting && !prayed.has('c' + i) ? 'glow' : ''}" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 1.5l2.6 7.9 7.9 2.6-7.9 2.6L12 22.5l-2.6-7.9L1.5 12l7.9-2.6z" fill="var(--red)"/></svg>` : ''}${nameFx(c.name, { waiting: m.waiting && !prayed.has('c' + i), max: c.rank >= 10 })}${m.online ? '<em class="cp-on">ONLINE</em>' : ''}${m.waiting && !prayed.has('c' + i) ? '<em class="cp-wait">待回应</em>' : ''}${m.decay ? '<em class="cp-tag">逆流</em>' : ''}${m.archived ? '<em class="cp-tag">归档</em>' : ''}</span>
        <small>《${c.arcanaCn}》${m.rev ? '逆位' : '正位'} · ${LVL[c.rank] || ''}</small>
        <span class="cp-li-lv"><b>羁绊 LV ${c.rank}</b><span class="cp-li-bar"><i style="--p:${max ? 1 : Math.min(1, Math.max(.06, (m.pts - m.base) / Math.max(1, m.next - m.base))).toFixed(2)}"></i></span></span>
        <small class="cp-gap">${max ? '圆满' : `还差 ${gap} 点到 Lv ${c.rank + 1}`}</small></span>
      <span class="cp-li-r">${m.shadow ? `<button type="button" class="cp-shadow" data-cpsh="${i}" title="羁绊之影 · HP ${m.shadow}%" aria-label="羁绊之影 · HP ${m.shadow}%">⚔<b>${m.shadow}%</b></button>` : ''}${m.online && !m.archived ? prayBtn('c' + i, m.waiting) : ''}</span></div>`; };
  const coopEmpty = (filter) => `<div class="cp-empty"><svg class="cp-empty-s" viewBox="0 0 24 24" width="52" height="52" aria-hidden="true"><path d="M12 1.5l2.6 7.9 7.9 2.6-7.9 2.6L12 22.5l-2.6-7.9L1.5 12l7.9-2.6z" fill="none" stroke="var(--p5r-paper)" stroke-width="1.6" stroke-linejoin="miter"/></svg><p>${filter === 'archived' ? '暂无归档的同伴' : '尚未与任何同伴建立羁绊'}</p>${filter !== 'archived' ? '<button type="button" class="cp-empty-b" data-act="new">邀请第一位同伴</button>' : ''}</div>`;
  const coopList = (vis, filter) => { const fr = filter === 'all' || filter === 'online' ? FRIENDS : []; if (!vis.length && !fr.length) return coopEmpty(filter); return `<div class="cp-list">${fr.map(friendCard).join('')}${vis.map(confCard).join('')}</div>`; };
  const coopFab = (remaining, filter) => remaining > 0 && filter !== 'archived' ? `<button type="button" class="cp-fab" data-act="new" aria-label="新增同伴（还能缔结 ${remaining} 张）"><svg class="cp-fab-s" viewBox="0 0 100 100" aria-hidden="true"><polygon points="${SH.starPts(55, 57, 46, -90, .5)}" fill="#111"/><polygon points="${SH.starPts(50, 52, 46, -90, .5)}" fill="var(--red)" stroke="var(--p5r-paper)" stroke-width="4" stroke-linejoin="round"/></svg><svg class="cp-fab-p" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M12 4.5v15m7.5-7.5h-15" stroke-linecap="round"/></svg><small class="cp-fab-n">余 ${remaining} 张</small></button>` : '';
  const pray = (key, el) => { if (prayed.has(key)) return; const waiting = key === 'c3' || key === 'f2'; prayed.add(key); const name = key[0] === 'f' ? FRIENDS.find((f) => f.id === key).name : P5.D.confidants[+key.slice(1)].name; if (OC.prayer) OC.prayer({ kind: waiting ? 'reciprocal' : 'sent', target: name }); else P5.toast('祈愿已送达'); const card = el.closest('.cp-li'); const t = document.createElement('div'); t.innerHTML = key[0] === 'f' ? friendCard(FRIENDS.find((f) => f.id === key), FRIENDS.findIndex((f) => f.id === key)) : confCard(+key.slice(1)); card.replaceWith(t.firstElementChild); };
  export const coopKit = { vis: coopVis, bar: coopBar, list: coopList, empty: coopEmpty, fab: coopFab, pray, total: 22 };

  /** 队长 / 成员视角（DEMO）：我 ⇄ 坂本龙司 互换队长 */
  export function setLeader(on) { MEM[0].leader = on; MEM[1].leader = !on; }
  /** 路由参数 → 页面状态（#/p/hideout?state=&tab=&view=&raid=） */
  export function applyParams(q) {
    const s = q.get('state') || 'normal';
    const map = { 'signed-out': 'login', login: 'login', loading: 'loading', empty: 'empty', error: 'error', two: 'two', notice: 'notice', nocard: 'nocard', normal: 'normal' };
    if (s && map[s]) st.demo = map[s];
    if (s === 'member') { st.demo = 'normal'; setLeader(false); } else if (s) setLeader(true);
    const tab = q.get('tab'); if (tab && ['roster', 'board', 'ops', 'meeting'].includes(tab)) { st.sec = tab; if (tab === 'board') seen.board = true; if (tab === 'ops') seen.ops = true; }
    const v = q.get('view'); if (v === 'wall' || v === 'grid') st.roster = v;
    if (q.get('raid') === '0') st.raid = false; else if (q.get('raid') === '1') st.raid = true;
  }
  export { openFlip, nameFx, memberMenu, postMenu, confirmBox, report, OPS, MEM };

