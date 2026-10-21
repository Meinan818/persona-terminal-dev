// @ts-nocheck —— 逐字迁移自 v3 原生 pages/pages_a.js 的「羁绊」页（卡墙 + 右侧详情；筛选 / 专辑墙⇄列表 / 在线好友卡 / 快捷祈愿 / 余 N 张 FAB 走 coopKit）。
// 按 FIXLIST 改：P0-12 / P1-16 头部三散键 → ✧ 同伴系统菜单（真实 Cooperation.tsx menuOpen：关于（就地展开）/ 谏言 / 谏言归档库 / 通知）；
//              P0-13 「缔结新的羁绊」/ FAB / 空态 → ConfidantCreateModal；页面不再保留任何简版 sheet；
//              「加点」→ ConfidantInteractionModal →「就这样记下」→ RANK UP → 恭喜 → 星移（升级链真实触发）。
import { P5 } from './p5';
import { OC } from './oc';
import { bondHead, coopKit } from './hideout';
const U = P5.ui, D = P5.D;
const COUNSEL_ARCH = 3, UNREAD = 1;

/** ✧ 同伴系统菜单（真实：纸底 + 两层不规则黑描边，打开翻猩红；有新通知带点；下拉 = 黑纸卡 p5-menu-surface） */
const coopMenuHTML = (n) => `<span class="pk3-cnt" aria-label="已缔结 ${n} / 22"><b>${n} / 22</b>${U.star('#f8f8f6', '#f8f8f6', 0.5, 'pk3-cnt-s')}</span>
  <div class="pk3-menu-a" data-menu-anchor>${menuInner()}</div>`;
const menuInner = () => `<button type="button" class="pk3-mt ${cs.menu ? 'on' : ''}" data-act="menu" aria-expanded="${cs.menu}" aria-haspopup="menu" aria-label="${!cs.ack ? `同伴系统菜单（${UNREAD} 条新通知）` : '同伴系统菜单'}"><i class="l1" aria-hidden="true"></i><i class="l2" aria-hidden="true"></i><i class="l3" aria-hidden="true"></i><span>✧</span>${!cs.ack ? '<em class="pk3-mt-dot" aria-hidden="true"></em>' : ''}</button>
  ${cs.menu ? `<div class="pk3-menu" role="menu">
    <button type="button" role="menuitem" class="pk3-mi" data-act="m-about"><i>✦</i><span><b>关于同伴系统</b><small>展开 / 收起简介</small></span></button>
    <button type="button" role="menuitem" class="pk3-mi" data-act="m-counsel"><i>✧</i><span><b>谏言</b><small>每 3 天可用一次</small></span></button>
    <button type="button" role="menuitem" class="pk3-mi" data-act="m-arch"><i>▤</i><span><b>谏言归档库</b><small>${COUNSEL_ARCH} 条旧谈话</small></span></button>
    <button type="button" role="menuitem" class="pk3-mi" data-act="m-notice"><i class="nb">◈${UNREAD ? `<em>${UNREAD}</em>` : ''}</i><span><b>通知</b><small>${UNREAD ? `${UNREAD} 条未读` : '暂无新消息'}</small></span></button>
  </div>` : ''}`;
/** 说明面板：默认收起；菜单里点「关于」就地展开 */
const infoHTML = () => `<div class="pk3-info" ${cs.info ? '' : 'hidden'}><p>每一段关系都对应一张塔罗大阿卡纳。记录下 Ta，让这段羁绊随着你的真诚一起成长——亲密度提升会解锁日常加成、战斗道具与永久技能。</p><small>· 22 张大阿卡纳，每位同伴唯一占用一张<br>· 长按详情页的塔罗牌可换为自定义头像（仅保留本地）<br>· 详情页中部右侧的灰色 ✧ 可一键进入「谏言」，直接聊聊这段关系</small></div>`;
function drawMenu(root) {
  const a = root.querySelector('[data-menu-anchor]'); if (!a) return; a.innerHTML = menuInner();
  const m = a.querySelector('.pk3-menu'); if (m && !P5.reduced()) m.animate([{ opacity: 0, transform: 'translateY(-4px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 150, easing: 'ease-out' });
}
function drawInfo(root) {
  const el = root.querySelector('.pk3-info'); if (!el) return; el.hidden = !cs.info;
  if (cs.info && !P5.reduced()) el.animate([{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'ease-out' });
}
/** 菜单外点击关闭（真实：window pointerdown） */
addEventListener('pointerdown', (e) => { if (!cs.menu) return; const a = document.querySelector('[data-menu-anchor]'); if (a && !a.contains(e.target)) { cs.menu = false; const r = a.closest('.coop5'); r && drawMenu(r.parentElement); } });

/* ══════════ 羁绊（app: pages/Cooperation.tsx → ConfidantAlbumWall / DetailModal / InteractionModal / RankUpCutInP5） ══════════
   P5R 对照：Confidant 界面 —— 塔罗卡墙（罗马数字 + 牌名 + 等级星条 1–10），背后同心五角星随翻牌转 60°（spring 140/15/0.9）；
   加点 → RANK UP 演出（「羁绊等级提升」大字 + 星条点亮）。 */
export const cs = { idx: 0, filter: 'all', view: localStorage.getItem('p5demo_coop_view') || 'wall', empty: false, menu: false, info: false, ack: false };
let coopIdx = 0, coopFilter = 'all', coopView = cs.view;
const rankStars = (r) => `<span class="rk">${Array.from({ length: 10 }, (_, i) => `<i class="${i < r ? 'on' : ''}"></i>`).join('')}</span>`;
/* 专辑墙牌面 = 素材槽 slots/tarot/p5（用户决定 2026-10-21）；牌框 / 罗马数字 / 牌名 / RANK 牌照不变，只换中间画面 */
const tarot = (c, i) => `<button class="tarot5" data-i="${i}"><span class="tr-no">${c.no}</span><span class="tr-art"><img class="tr-img" src="${OC.tarotSrc(c.arcana)}" alt="" aria-hidden="true" draggable="false" decoding="async"></span><span class="tr-arc">${c.arcana}</span><span class="tr-rank">RANK <b>${c.rank}</b></span></button>`;
/* 筛选 / 视图（Cooperation.tsx：全部 / 离线 / 在线 / 归档 + 专辑墙 ⇄ 列表，右上角持久记忆）；列表条目、在线好友卡、快捷祈愿、FAB 在 P5.coopKit（pages/org.p5.js） */
const K = () => coopKit;
const coopVis = () => cs.empty ? [] : K().vis(coopFilter);
const activeCount = () => cs.empty ? 0 : D.confidants.filter((_, i) => !(OC.CF && OC.CF[i] && OC.CF[i].archivedAt)).length;
const remaining = () => K().total - activeCount();
const canCreate = () => remaining() > 0 && coopFilter !== 'archived';
const coopBody = (vis) => {
  if (coopView === 'list') return cs.empty ? K().empty(coopFilter) : K().list(vis, coopFilter);
  if (!vis.length) return K().empty(coopFilter);
  const c = D.confidants[vis[coopIdx]];
  return `<div class="cp-grid">
        <section class="cp-wall"><div class="cp-spin"><svg viewBox="0 0 100 100">${[50, 39, 28, 17, 6].map((r) => `<polygon points="${P5.shape.starPts(50, 50, r, -76)}" fill="none" stroke="#4a0004" stroke-width="2.4" stroke-linejoin="miter"/>`).join('')}</svg></div>
          <div class="cp-row">${vis.map((i, p) => tarot(D.confidants[i], p)).join('')}${canCreate() ? '<button class="tarot5 empty" data-act="new" aria-label="新增同伴"><span class="tr-no">+</span><span class="tr-arc">缔结新的羁绊</span></button>' : ''}</div>
          <div class="cp-dots">${vis.map((_, p) => `<i class="${p === coopIdx ? 'on' : ''}"></i>`).join('')}</div><p class="cp-hint">左右切换 · 点中间那张查看</p></section>
        <section class="cp-detail">${detail(c)}</section>
      </div>`;
};
export const coopPage = {
  nav: 'coop', title: '羁绊',
  render(wide) {
    const vis = coopVis(); if (coopIdx >= vis.length + 1) coopIdx = 0;
    return `<div class="coop5 ${coopView === 'list' ? 'cp-lv' : ''}">${bondHead('coop', coopMenuHTML(activeCount()))}${infoHTML()}
      ${K().bar(coopFilter, coopView)}
      <div class="cp-body">${coopBody(vis)}</div>${K().fab(remaining(), coopFilter)}</div>`;
  },
  mount(root, wide) {
    let vis = coopVis(), row, spin, rot, cur, stop;
    const layout = () => root.querySelectorAll('.cp-row .tarot5').forEach((t, i) => { const d = i - coopIdx; t.style.setProperty('--d', d); t.classList.toggle('mid', d === 0); });
    const go = (n) => {
      if (!row) return;
      n = Math.max(0, Math.min(vis.length - (canCreate() ? 0 : 1), n)); if (n === coopIdx) return; const from = cur; rot = n * 60; coopIdx = n; layout(); P5.sfx('tarot', .4);
      stop && stop(); stop = P5.spring({ stiffness: 140, damping: 15, mass: .9, onUpdate: (p) => { cur = P5.lerp(from, rot, p); spin.style.transform = `rotate(${cur}deg)`; } });
      root.querySelectorAll('.cp-dots i').forEach((d, i) => d.classList.toggle('on', i === n));
      if (n < vis.length) { const det = root.querySelector('.cp-detail'); det.innerHTML = detail(D.confidants[vis[n]]); P5.panelIn(det.querySelectorAll('.cd-sec'), { from: 'right', stagger: .05 }); }
    };
    const bindBody = () => {
      row = root.querySelector('.cp-row'); spin = root.querySelector('.cp-spin');
      if (!row) return;
      rot = coopIdx * 60; cur = rot; spin.style.transform = `rotate(${rot}deg)`; layout();
      let x0 = null; row.addEventListener('pointerdown', (e) => x0 = e.clientX); row.addEventListener('pointerup', (e) => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) go(coopIdx + (dx < 0 ? 1 : -1)); });
    };
    /** 换筛选 / 换视图：只重画筛选条 + 内容 + FAB，不重播页头 */
    const redraw = () => {
      vis = coopVis(); if (coopIdx >= Math.max(1, vis.length)) coopIdx = 0;
      root.querySelector('.coop5').classList.toggle('cp-lv', coopView === 'list');
      root.querySelector('.cp-bar').outerHTML = K().bar(coopFilter, coopView);
      const body = root.querySelector('.cp-body'); body.innerHTML = coopBody(vis);
      const fab = root.querySelector('.cp-fab'); const nf = K().fab(remaining(), coopFilter);
      if (fab) fab.outerHTML = nf || ''; else if (nf) root.querySelector('.coop5').insertAdjacentHTML('beforeend', nf);
      bindBody();
      if (!P5.reduced()) [...body.querySelectorAll('.cp-li, .tarot5, .cd-sec, .cp-empty')].forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateX(46px) skewX(-8deg)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: i * 35, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'backwards' }));
    };
    bindBody();
    root.addEventListener('click', (e) => {
      const f = e.target.closest('[data-cpf]'); if (f) { if (f.dataset.cpf === coopFilter) return; coopFilter = cs.filter = f.dataset.cpf; coopIdx = 0; P5.sfx('nav', .4); redraw(); return; }
      if (e.target.closest('[data-cpv]')) { coopView = cs.view = coopView === 'wall' ? 'list' : 'wall'; localStorage.setItem('p5demo_coop_view', coopView); P5.sfx('switch', .4); redraw(); return; }
      const pr = e.target.closest('[data-pray]'); if (pr) { e.stopPropagation(); K().pray(pr.dataset.pray, pr); return; }
      const sh = e.target.closest('[data-cpsh]'); if (sh) { e.stopPropagation(); OC.shadowBattle(); return; }
      const fr = e.target.closest('[data-cpfr]'); if (fr) { OC.profileCard({ coop: 'none' }); return; }
      const li = e.target.closest('[data-cpi]'); if (li) { OC.detail(OC.CF[+li.dataset.cpi]); return; }
      const t = e.target.closest('.tarot5'); if (t && !t.dataset.act) { const i = +t.dataset.i; if (i !== coopIdx) go(i); else { t.classList.add('flip'); setTimeout(() => { t.classList.remove('flip'); OC.detail(OC.CF[vis[coopIdx]]); }, 520); } return; }
      const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
      // 同伴系统菜单（P0-12 / P1-16）：✧ 触发键 → 关于（就地展开）/ 谏言 / 谏言归档库 / 通知
      if (a === 'menu') { cs.menu = !cs.menu; if (cs.menu) cs.ack = true; drawMenu(root); return; }
      if (a === 'm-about') { cs.menu = false; cs.info = !cs.info; drawMenu(root); drawInfo(root); return; }
      if (a === 'm-counsel') { cs.menu = false; drawMenu(root); OC.counselChat({}); return; }
      if (a === 'm-arch') { cs.menu = false; drawMenu(root); OC.counselArchive(); return; }
      if (a === 'm-notice') { cs.menu = false; drawMenu(root); OC.notifications(); return; }
      // 页面按钮一律调完整弹层（P0-13：缔结新的羁绊 → ConfidantCreateModal，不保留简版 sheet）
      const cf = OC.CF[vis[coopIdx]];
      const ACT = { new: () => OC.createModal(), pts: () => OC.interaction(cf), counsel: () => OC.counselChat({ mention: cf }), shift: (ev) => OC.sweep('STAR SHIFT', () => OC.starShift(cf), { x: ev.clientX, y: ev.clientY }) };
      if (ACT[a]) ACT[a](e);
    });
    root.addEventListener('keydown', (e) => { const li = e.target.closest('[data-cpi],[data-cpfr]'); if (li && e.target === li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); li.click(); } });
    addEventListener('keydown', root._k = (e) => { if (!document.contains(root)) return removeEventListener('keydown', root._k); if (e.target.closest && e.target.closest('input,textarea')) return; if (e.key === 'ArrowRight') go(coopIdx + 1); if (e.key === 'ArrowLeft') go(coopIdx - 1); });
  },
  enter(root) {
    root.querySelectorAll('.tarot5').forEach((t, i) => t.animate([{ opacity: 0, translate: '0 120px', rotate: '20deg' }, { opacity: 1, translate: '0 0', rotate: '0deg' }], { duration: 420, delay: 80 + i * 60, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }));
    const sp = root.querySelector('.cp-spin'); if (sp) sp.animate([{ scale: .3, opacity: 0 }, { scale: 1, opacity: 1 }], { duration: 700, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
    P5.panelIn(root.querySelectorAll('.cd-sec, .cp-li, .cp-tab, .cp-view'), { from: 'right', stagger: .05, delay: .2 });
    const fab = root.querySelector('.cp-fab'); if (fab) fab.animate([{ opacity: 0, transform: 'scale(0) rotate(-90deg)' }, { opacity: 1, transform: 'none' }], { duration: 460, delay: 400, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' });
  },
};
function detail(c) {
  if (!c) return `<div class="cd-sec"><p class="sh-p" style="color:var(--paper)">点一下这张空白牌开始</p></div>`;
  return `<div class="cd-sec cd-name"><span class="cd-arc">${c.no} · ${c.arcanaCn} ${c.arcana}</span><b class="cd-n">${c.name}</b>${U.burst('R' + c.rank, { sz: 64, rot: 8, cls: 'cd-burst' })}</div>
    <div class="cd-sec"><span class="cd-k">羁绊等级</span>${rankStars(c.rank)}<small class="cd-next">距 RANK ${c.rank + 1} 还差 3 点</small></div>
    <div class="cd-sec cd-desc"><span class="cd-k">关系描述</span><p>${c.desc}</p></div>
    <div class="cd-sec cd-desc"><span class="cd-k">解读</span><p>正位 · 你们之间有着坚定的信任。</p><span class="cd-k">未来</span><p>多一点耐心。</p></div>
    <div class="cd-sec cd-acts">${U.btn('加点', { tone: 'red', size: 'lg', seed: 95, attrs: 'data-act="pts"' })}${U.btn('谏言', { tone: 'paper', seed: 96, attrs: 'data-act="counsel"' })}${U.btn('星移', { tone: 'ink', seed: 97, attrs: 'data-act="shift"' })}</div>`;
}

/** 路由参数 → 页面状态（#/p/cooperation?state=empty&view=wall|list&filter=all|offline|online|archived&menu=1&info=1） */
export function applyCoopParams(q) {
  cs.empty = q.get('state') === 'empty';
  const v = q.get('view'); if (v === 'wall' || v === 'list') cs.view = v;
  const f = q.get('filter'); cs.filter = ['all', 'offline', 'online', 'archived'].includes(f) ? f : q.get('state') === 'archived' ? 'archived' : 'all';
  cs.menu = q.get('menu') === '1'; if (cs.menu) cs.ack = true; cs.info = q.get('info') === '1';
  coopFilter = cs.filter; coopView = cs.view; coopIdx = 0;
}
