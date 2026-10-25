// @ts-nocheck —— 逐字迁移自 v3 原生 pages/todos.js（任务子视图；类名 = legacy/css/todos.css），按 FIXLIST / 真实 src/pages/Todos.tsx 改：
//   · 切换头（记录 / 任务）归行动页壳 Actions.p5r.tsx（P0-09），这里只留 [data-tabs-slot] 让壳 portal 进来；
//   · 目标区 GoalDeck：本周目标面 = WeeklyGoalSection 全态（OD.weeklyCard）；倒计时面 = CallingCardSection（P0-07）：
//     「倒计时 / CALLING CARD」+「+ 新建」→ CallingCardEditor 抽屉；点卡 → 编辑；⋯ → 📌 钉到主页 / 编辑 / 手动归档 / 删除；
//     删除 → ConfirmDialog「删除「X」？/ 归档的倒计时不可恢复。历史"留下记录"保留不动。」；手动归档 → 收进归档区 + CallingCardCutIn（已收）；
//     归档区「› 归档 · N」展开，长按 = 删除确认；一张没有 =「✦ 还没有倒计时 — 立下约定」；
//     sessionStorage velvet:todos-goal-panel=countdown（首页宣告卡提示条写入）→ 直接打开倒计时面并滚到 #calling-card-section；
//   · 「＋ 添加新任务」/ 长按→编辑 → TodoFormSheet（P1-05 校验 / AI 拆步 / 编辑预填；📷 课表导入 P1-04）；
//   · 删除任务 → ConfirmDialog「删除任务 / 任务「X」将被永久删除，无法撤销。」（P1-06 同协议）；
//   · 命运抽签 / 委托板 / 设定本周目标 / 愿望面 / BIG DEAL 卡 → 调完整组件（OD.*，P0-13：不留简版 sheet）；
//   · 空态：「还没有任务，添加一个开始吧」/「归档区暂无内容」。
import { P5 } from './p5';
import { OD } from './d4';
import { openTodoForm } from './todoform4';
import { openOverlay } from '@/p5r-red/shell/shellBus';
import { useAppStore } from '@/store';
import { CALLING_ARCHIVED } from '@/p5r-red/mock/pkg5-data';
import { completeRedTask } from '@/p5r-red/screens/taskGrowth';
const U = P5.ui;
const WK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], WKC = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const slot = (h) => (h < 7 ? '清晨' : h < 12 ? '上午' : h < 13 ? '午休' : h < 16 ? '下午' : h < 19 ? '放学后' : '夜晚');
const daysLeft = (k) => Math.max(0, Math.round((new Date(k + 'T00:00:00') - new Date(new Date().toDateString())) / 864e5));
const freq = (t) => t.frequency === 'count' ? `多次 · ${t.targetCount}次` : '单次';
const empty = (text, seed) => P5.emptyHTML(text, seed);
const clone = (x) => JSON.parse(JSON.stringify(x));

/** 页面状态（每次进入由 applyTodosParams 重置） */
export const st = { pane: 'todos', goal: 'weekly', weekly: 'progress', empty: false, cards: [], archivedCards: [], arcOpen: false, todos: [], archived: [] };

/** 路由参数 → 状态：?deck=weekly|countdown &goal=empty|progress|done|claimed &cc=empty|archived &pane=wish &state=empty */
export function applyTodosParams(q) {
  st.pane = q.get('pane') === 'wish' ? 'wish' : 'todos';
  let deck = q.get('deck');
  try { if (sessionStorage.getItem('velvet:todos-goal-panel') === 'countdown') { deck = 'countdown'; sessionStorage.removeItem('velvet:todos-goal-panel'); st.jump = true; } } catch { /* ignore */ }
  st.goal = deck === 'countdown' ? 'countdown' : 'weekly';
  const g = q.get('goal'); st.weekly = ['empty', 'progress', 'done', 'claimed'].includes(g) ? g : 'empty'; // parity：默认 = v3（D.weeklyGoal = null →「设定本周目标」）
  st.empty = q.get('state') === 'empty';
  st.todos = st.empty ? [] : clone(P5.D.todos);
  st.archived = st.empty ? [] : clone(P5.D.archived);
  const cc = q.get('cc');
  st.cards = cc === 'empty' ? [] : clone(P5.D.callingCards);
  st.archivedCards = cc === 'empty' ? [] : CALLING_ARCHIVED.map((c) => ({ id: c.id, title: c.title, subtitle: c.subtitle, mode: c.mode, target: c.targetDate, start: c.startDate, archived: true, result: c.archiveReason === 'auto_date' ? '时之至' : c.archiveReason === 'auto_todos' ? '达成' : '已收' }));
  st.arcOpen = cc === 'archived';
}

const calHUD = () => {
  const n = new Date(), y = new Date(n.getTime() - 864e5), wd = n.getDay();
  return `<div class="cal5" role="img" aria-label="${n.getMonth() + 1}月${n.getDate()}日 ${WKC[wd]} ${slot(n.getHours())}">
    <span class="cal-m">${n.getMonth() + 1}</span><span class="cal-sl">/</span>
    <span class="cal-d"><span class="cal-roll"><b class="old">${String(y.getDate()).padStart(2, '0')}</b><b class="new">${String(n.getDate()).padStart(2, '0')}</b></span></span>
    <span class="cal-side"><span class="cal-wd ${wd === 0 || wd === 6 ? 'we' : ''}">${WK[wd]}</span><span class="cal-slot">${slot(n.getHours())}</span></span></div>`;
};
const bubble = () => {
  const c = st.cards.find((x) => x.pinned); if (!c) return '';
  const [, m, d] = c.target.split('-');
  return `<button class="cd-bubble" data-act="open-cd" aria-label="倒计时 ${c.title}"><span class="cdb-in"><span class="cdb-k">倒计时 <em>· ${m}.${d}</em></span><span class="cdb-t">${c.title}</span><span class="cdb-n"><b>${daysLeft(c.target)}</b>天<span class="cdb-clock">00:00:00</span></span></span></button>`;
};

/* ── 倒计时面：CallingCardSection + CallingCardCard ── */
const ccPct = (c) => Math.max(0, Math.min(100, Math.round(c.mode === 'both' || c.mode === 'todos' ? (c.todosDone || 0) / (c.todosTotal || 1) * 100 : (1 - daysLeft(c.target) / Math.max(1, Math.round((new Date(c.target) - new Date(c.start)) / 864e5))) * 100)));
const ccCard = (c, i, arch = false) => `<button class="ccard ${arch ? 'p4-cc-arch' : ''}" data-act="${arch ? 'arc-cc' : 'open-cc'}" data-i="${i}" style="--r:${i % 2 ? 1.6 : -1.4}deg">
    <img src="${P5.A('card_emblem')}" alt="" class="cc-em"><span class="cc-body"><span class="cc-k">${arch ? `ARCHIVED · ${c.result || '已收'}` : c.pinned ? 'PINNED · 宣言' : 'CALLING CARD'}</span><b class="cc-t">${c.title}</b><span class="cc-s">${c.subtitle}</span>
    <span class="cc-bar"><i style="width:${arch ? 100 : ccPct(c)}%"></i></span></span>
    <span class="cc-n">${arch ? '<small>已</small><b>✓</b><small>归档</small>' : `<small>还剩</small><b>${daysLeft(c.target)}</b><small>天</small>`}</span><span class="cc-menu" data-act="${arch ? 'arc-menu' : 'cc-menu'}" data-i="${i}" role="button" aria-label="菜单">⋯</span></button>`;
const countdownFace = () => {
  const a = st.cards, ar = st.archivedCards;
  return `<div class="cd-head"><span class="p4-cd-h"><b>倒计时</b><em>CALLING CARD</em></span>${U.btn('+ 新建', { tone: 'red', size: 'sm', seed: 61, attrs: 'data-act="new-cc"' })}</div>
    ${!a.length && !ar.length ? `<button class="p4-cc-empty" data-act="new-cc"><span>✦</span><span>还没有倒计时 — 立下约定</span></button>` : ''}
    ${a.map((c, i) => ccCard(c, i)).join('')}
    ${ar.length ? `<div class="p4-cc-arc"><button class="p4-cc-arc-h" data-act="arc-toggle" aria-expanded="${st.arcOpen}"><i style="transform:rotate(${st.arcOpen ? 90 : 0}deg)">›</i><b>归档</b><span>· ${ar.length}</span></button>
      <div class="p4-cc-arc-l" ${st.arcOpen ? '' : 'hidden'}>${ar.map((c, i) => ccCard(c, i, true)).join('')}</div></div>` : ''}`;
};
const goalDeck = () => `<section class="goal5" id="calling-card-section">
    <div class="goal-hd"><div>${U.plate('目标', { fs: 20 })}<p class="goal-sub">本周推进和重要倒计时</p></div>
    <div class="seg goal-tabs"><button aria-pressed="${st.goal === 'weekly'}" data-act="goal" data-v="weekly">本周目标</button><button aria-pressed="${st.goal === 'countdown'}" data-act="goal" data-v="countdown">倒计时</button></div></div>
    <div class="goal-body" data-goal="${st.goal}">${st.goal === 'weekly' ? OD.weeklyCard(st.weekly) : countdownFace()}</div></section>`;

const row = (t, i) => {
  const done = t.count >= t.target;
  return `<div class="req ${done ? 'done' : ''}" data-id="${t.id}" style="--i:${i}">
    <i class="req-bg"></i><i class="req-cur"></i>
    <span class="req-no">${String(i + 1).padStart(2, '0')}</span>
    <span class="req-main">
      <span class="req-tags">${t.important ? U.tag('★ 重要') : ''}${t.fate ? U.tag('✦ 签', 'paper') : ''}${t.deadlineDays ? U.tag(`剩 ${t.deadlineDays} 天`, 'line') : ''}</span>
      <b class="req-t">${t.title}</b>
      <span class="req-meta">${U.tag(`${P5.ATTR[t.attribute].name} +${t.points}`)}${(t.extra || []).map((b) => U.tag(`${P5.ATTR[b.attribute].name} +${b.points}`, 'paper')).join('')}${U.tag(freq(t), 'line')}${t.repeatDaily ? U.tag('每日', 'line') : ''}</span>
      <span class="req-prog"><small>今日进度</small><i><b style="width:${Math.round(t.count / t.target * 100)}%"></b></i><em>${t.count}/${t.target}</em></span>
    </span>
    ${done ? '<span class="req-clear">CLEAR!</span>' : ''}
    ${done ? '<button class="req-arc" data-act="undo" title="撤销今日完成（同时回退点数和记录）" aria-label="撤销今日完成（同时回退点数和记录）">↶</button>' : '<button class="req-arc" data-act="archive" title="归档（不启用）" aria-label="归档（不启用）"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M3 7h18v3H3zM5 10v10h14V10M10 14h4"/></svg></button>'}
  </div>`;
};
/** 愿望面（WishBoard 行：距离环 + 标题 + 次数；⋯ 菜单） */
const wishRow = (w, i) => `<div class="od-wish" data-i="${i}" style="--i:${i}"><i class="req-bg"></i>
    <button class="od-wish-ring" data-act="w-panel" aria-label="打开「${w.title}」的进度面板">${OD.ring(w.progress, { size: 54, evaluated: w.evaluated, color: 'var(--red)', track: '#4a4440', fg: 'var(--paper)' })}</button>
    <span class="od-wish-m"><b>${w.title}</b><small>${w.count ? `已完成相关任务 <b>${w.count}</b> 次` : w.subs.length ? `子任务 ${w.subs.filter((s) => s.done).length}/${w.subs.length}` : '还没有记录挂到这里'}</small></span>
    <button class="od-more" data-act="w-menu" aria-label="「${w.title}」的操作">⋯</button></div>`;
const wishPane = () => { OD.syncWishes(); return `<div class="wish5 od-wish-list">${OD.WISHES.map(wishRow).join('')}<p class="wish-note">它不会出现在今日任务里。记录时把事挂上去，你就能看见自己在靠近它。</p></div>`; };
const mainCard = () => {
  OD.syncWishes();
  const ts = st.todos, wish = st.pane === 'wish';
  return `<section class="main5">
    <div class="main-hd">${U.plate(wish ? '愿望' : '今日任务', { fs: 22, tag: 'button', attrs: 'data-act="pane" aria-label="切换今日任务 / 愿望"', suffix: '<span class="swap">⇄</span>' })}
      ${U.burst(wish ? OD.WISHES.length + '个' : ts.length + '项', { sz: 60 })}</div>
    ${wish ? '' : `<div class="tools"><button class="tool fate" data-act="fate"><span class="tl-s">✦</span><span class="ph">让命运替你挑一件</span><span class="wd">不知道做什么好？命运会替你选择</span><span class="tl-a">›</span></button>
      <span class="tool-q"><button class="tool quest" data-act="quest" aria-label="委托板，${P5.D.quests.claimable} 张可领取"><span>📜</span><span>委托</span></button><b class="q-badge">${P5.D.quests.claimable}</b></span></div>
      ${st.empty ? '' : `<div class="p4-bdh">${OD.bigHome('progress')}</div>`}`}
    ${U.shp('div', { kind: 'torn', seed: 371, tone: 'red', cls: 'req-list' }, `<div class="req-head"><span>REQUEST</span><span>${wish ? 'WISH' : 'TARGET / STATUS'}</span></div>
      <div class="req-rows">${wish ? wishPane() : ts.length ? ts.map(row).join('') : empty('还没有任务，添加一个开始吧', 3)}</div>
      <div class="req-add">${U.btn(wish ? '添加愿望' : '添加新任务', { tone: 'paper', size: 'lg', seed: 77, attrs: 'data-act="add"', icon: '<b style="font-size:22px;line-height:0">＋</b>' })}</div>`)}
  </section>`;
};
const archive = () => {
  const a = st.archived;
  const lab = { pending: '未到日期', done: '已完成', inactive: '未启用' };
  return `<section class="arch5"><div class="main-hd">${U.plate('已归档', { fs: 19, rot: -1.6 })}${U.burst(a.length + '项', { tone: 'cream', sz: 52, rot: 10 })}</div>
    ${U.shp('div', { kind: 'torn', seed: 381, cls: 'arch-list' }, a.length ? ['pending', 'done', 'inactive'].map((k) => {
      const items = a.filter((x) => x.state === k); if (!items.length) return '';
      return `<div class="arch-k">${lab[k]}</div>` + items.map((x) => `<div class="arch-row" data-id="${x.id}"><b>${x.title}</b>${U.tag(`${P5.ATTR[x.attribute].name} +${x.points}`, 'ink')}${x.weekdays ? `<small>${x.weekdays.map((d) => WKC[d]).join(' ')}</small>` : ''}
        <span class="arch-acts">${k === 'done' ? `<button data-act="undo" title="撤销今日完成（同时回退点数和记录）">↶</button>` : k === 'inactive' ? `<button data-act="restore" title="恢复（重置为未完成）">⟲</button><button data-act="del" title="删除">✕</button>` : `<button data-act="del" title="删除">✕</button>`}</span></div>`).join('');
    }).join('') : empty('归档区暂无内容', 5))}</section>`;
};

export function todosRender(wide) {
  return `<div class="todos5 ${wide ? 'wd' : 'ph'}">
    <header class="t-hd">${calHUD()}<span class="p4-tabs-slot" data-tabs-slot></span><div class="t-hd-r">${bubble()}${P5.maskHTML(wide ? 120 : 62)}</div></header>
    <div class="t-grid"><div class="t-col-a">${goalDeck()}${wide ? archive() : ''}</div><div class="t-col-b">${mainCard()}${wide ? '' : archive()}</div></div>
    <button class="fab5" data-act="add" aria-label="添加任务"><svg viewBox="0 0 100 100"><polygon points="${P5.shape.starPts(52, 56, 48)}" fill="#111"/><polygon points="${P5.shape.starPts(50, 52, 48)}" fill="#F2E9DA"/><polygon points="${P5.shape.starPts(50, 52, 40)}" fill="#D7000F"/><path d="M50 36v30M35 51h30" stroke="#fff" stroke-width="7"/></svg></button>
  </div>`;
}

export function todosMount(root, wide) {
  // 「委托」角标读本周真实未领取张数，回来后重画角标（覆盖 mock 写死的演示值）
  void OD.syncQuestBadge().then(() => {
    if (!document.contains(root)) return;
    const n = P5.D.quests.claimable;
    const badge = root.querySelector('.q-badge');
    if (badge) badge.textContent = String(n);
    const btn = root.querySelector('.tool.quest');
    if (btn) btn.setAttribute('aria-label', `委托板，${n} 张可领取`);
  }).catch(() => {});
  const iv = setInterval(() => {
    const c = st.cards.find((x) => x.pinned), el = root.querySelector('.cdb-clock'); if (!el || !document.contains(el) || !c) { if (!document.contains(root)) clearInterval(iv); return; }
    const ms = new Date(c.target + 'T00:00:00') - Date.now(); const h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3); el.textContent = [h, m, s].map((v) => String(Math.max(0, v)).padStart(2, '0')).join(':');
  }, 1000);
  const bindRows = () => root.querySelectorAll('.req').forEach((r) => {
    if (!r._tap) {
      r._tap = 1;
      r.addEventListener('click', (e) => {
        if (e._longPress || e.target.closest('button')) return;
        const t = st.todos.find((x) => x.id === r.dataset.id);
        if (!t) return;
        void completeRedTask(t).then((result) => {
          if (!result.accepted) return;
          if (!result.completed) {
            t.count = Math.min(t.target, t.count + 1);
            redrawMain();
            return;
          }
          const saved = useAppStore.getState().todos.find((x) => x.id === t.id);
          if (saved?.isActive) {
            t.count = useAppStore.getState().getTodayTodoProgress(t.id).count;
          } else {
            st.todos = st.todos.filter((x) => x.id !== t.id);
          }
          redrawMain();
        });
      });
    }
    if (r._lp) return;
    r._lp = 1;
    P5.longPress(r, () => {
      const t = st.todos.find((x) => x.id === r.dataset.id); if (!t) return; r.animate([{ transform: 'scale(.97)' }, { transform: 'none' }], { duration: 150 });
      P5.actionSheet(t.title, [
        { label: '编辑', onClick: () => openTodoForm({ todo: t, onSaved: (d) => {
          void useAppStore.getState().updateTodo(t.id, { title: d.title, attribute: d.attribute, points: d.points, frequency: d.frequency, targetCount: d.targetCount, isBigDeal: d.isBigDeal, steps: d.steps, repeatDaily: d.repeatDaily, important: d.important, ...(d.deadline ? { deadline: d.deadline } : {}) })
            .then(() => { Object.assign(t, d); redrawMain(); P5.toast('任务已保存'); })
            .catch(() => P5.toast('保存失败，任务没有改变'));
        } }) },
        { label: '归档', onClick: () => archiveRow(r) },
        { label: '删除', tone: 'danger', onClick: () => confirmDel(t.title, async () => {
          await useAppStore.getState().deleteTodo(t.id);
          {
            st.todos = st.todos.filter((x) => x !== t);
            r.remove();
            redrawMain();
          }
        }) },
      ]);
    });
  });
  const bindArc = () => root.querySelectorAll('.p4-cc-arch').forEach((r) => { if (r._lp) return; r._lp = 1; P5.longPress(r, () => ccDelete(st.archivedCards[+r.dataset.i], true)); });
  bindRows(); bindArc(); bindWeekly(root);
  const redrawGoal = (dir = 0) => swapGoal(root, dir, () => { bindArc(); bindWeekly(root); });
  const redrawMain = () => { const m = root.querySelector('.main5'); const tmp = document.createElement('div'); tmp.innerHTML = mainCard(); m.replaceWith(tmp.firstElementChild); bindRows(); P5.panelIn(root.querySelectorAll('.main5 .req,.main5 .od-wish'), { from: 'right', stagger: .04 }); };
  const redrawBubble = () => { const r = root.querySelector('.t-hd-r'); const old = r.querySelector('.cd-bubble'); const tmp = document.createElement('div'); tmp.innerHTML = bubble(); old ? (tmp.firstElementChild ? old.replaceWith(tmp.firstElementChild) : old.remove()) : tmp.firstElementChild && r.prepend(tmp.firstElementChild); };
  /** 宣告卡：编辑器保存后回写 */
  const ccSaved = (card, data) => {
    if (card) Object.assign(card, data); else st.cards.unshift({ id: 'cc' + Date.now(), start: new Date().toISOString().slice(0, 10), ...data });
    if (data.pinned) st.cards.forEach((c) => { if (c !== card && c.id !== (card || {}).id && c.title !== data.title) c.pinned = false; });
    const next = { ...(card || {}), ...data, id: card ? card.id : crypto.randomUUID(), startDate: data.start || card?.start, targetDate: data.target || card?.target, tone: card?.tone || 'lines', icon: card?.icon || '★', pinned: !!data.pinned, archived: card?.archived || false };
    void useAppStore.getState().saveCallingCard(next).catch(() => {});
    st.goal = 'countdown'; redrawGoal(0); redrawBubble();
  };
  const ccDelete = (c, arch) => P5.confirmDlg({ title: `删除「${c.title}」？`, description: '归档的倒计时不可恢复。\n历史"留下记录"保留不动。', tone: 'danger', confirmText: '删除', cancelText: '取消', onConfirm: () => { if (arch) st.archivedCards = st.archivedCards.filter((x) => x !== c); else st.cards = st.cards.filter((x) => x !== c); void useAppStore.getState().deleteCallingCard(c.id).catch(() => {}); redrawGoal(0); redrawBubble(); P5.toast('已删除'); } });
  function ccMenu(i) {
    const c = st.cards[i];
    P5.actionSheet(c.title, [
      { label: c.pinned ? '取消钉选' : '📌 钉到主页', onClick: () => { const was = c.pinned; st.cards.forEach((x) => (x.pinned = x === c ? !was : false)); void useAppStore.getState().pinCallingCard(was ? null : c.id).catch(() => {}); redrawGoal(0); redrawBubble(); P5.toast(was ? '已取消钉选' : '已钉到主页'); } },
      { label: '编辑', onClick: () => OD.openCCEditor(true, { card: c, onSaved: (d) => ccSaved(c, d) }) },
      { label: '手动归档', onClick: () => { st.cards = st.cards.filter((x) => x !== c); st.archivedCards.unshift({ ...c, pinned: false, archived: true, result: '已收' }); void useAppStore.getState().archiveCallingCard(c.id).catch(() => {}); st.arcOpen = true; redrawGoal(0); redrawBubble(); openOverlay('fx-calling-archived', { title: c.title }); } },
      { label: '删除', tone: 'danger', onClick: () => ccDelete(c, false) },
    ]);
  }
  function arcMenu(i) {
    const c = st.archivedCards[i];
    P5.actionSheet(c.title, [
      { label: '取消归档', onClick: () => { st.archivedCards = st.archivedCards.filter((x) => x !== c); st.cards.push({ ...c, archived: false }); void useAppStore.getState().unarchiveCallingCard(c.id).catch(() => {}); redrawGoal(0); P5.toast('已取消归档'); } },
      { label: '删除', tone: 'danger', onClick: () => ccDelete(c, true) },
    ]);
  }
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b || !root.contains(b)) return; const a = b.dataset.act;
    if (a === 'goal') { if (st.goal === b.dataset.v) return; st.goal = b.dataset.v; redrawGoal(b.dataset.v === 'countdown' ? 1 : -1); }
    if (a === 'open-cd') { if (st.goal !== 'countdown') { st.goal = 'countdown'; redrawGoal(1); } root.querySelector('#calling-card-section').scrollIntoView({ behavior: P5.reduced() ? 'auto' : 'smooth' }); }
    if (a === 'pane') { st.pane = st.pane === 'wish' ? 'todos' : 'wish'; const m = root.querySelector('.main5'); if (P5.reduced()) return redrawMain(); m.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-18px)' }], { duration: 120, fill: 'both' }).onfinish = redrawMain; }
    if (a === 'fate') return OD.openFateDraw();
    if (a === 'quest') return OD.openQuestBoard();
    if (a === 'add') return st.pane === 'wish' ? wishSheet(() => redrawMain()) : openTodoForm({ onSaved: (t) => {
      void useAppStore.getState().addTodo({ title: t.title, attribute: t.attribute, points: t.points, frequency: t.frequency, targetCount: t.targetCount, repeatDaily: t.repeatDaily !== false, important: !!t.important, deadline: t.deadline, isActive: true, isBigDeal: !!t.isBigDeal, steps: t.steps })
        .then((real) => { st.todos.push({ ...t, id: real.id }); redrawMain(); P5.toast('任务已添加'); })
        .catch(() => P5.toast('添加失败，任务没有写入'));
    } });
    if (a === 'archive') { e.stopPropagation(); return archiveRow(b.closest('.req')); }
    if (a === 'new-cc') { e.stopPropagation(); return OD.openCCEditor(false, { onSaved: (d) => ccSaved(null, d) }); }
    if (a === 'cc-menu') { e.stopPropagation(); return ccMenu(+b.dataset.i); }
    if (a === 'arc-menu') { e.stopPropagation(); return arcMenu(+b.dataset.i); }
    if (a === 'open-cc') { const i = +b.dataset.i; return OD.openCCEditor(true, { card: st.cards[i], onSaved: (d) => ccSaved(st.cards[i], d) }); }
    if (a === 'arc-cc') return; // 归档卡不进编辑；长按 = 删除确认
    if (a === 'arc-toggle') { st.arcOpen = !st.arcOpen; b.setAttribute('aria-expanded', st.arcOpen); b.querySelector('i').style.transform = `rotate(${st.arcOpen ? 90 : 0}deg)`; const l = root.querySelector('.p4-cc-arc-l'); l.hidden = !st.arcOpen; if (st.arcOpen) P5.panelIn(l.children, { from: 'up' }); }
    if (a === 'w-panel') { const w = OD.WISHES[+b.closest('.od-wish').dataset.i]; return OD.openWishPanel(w); }
    if (a === 'w-menu') { const row = b.closest('.od-wish'), w = OD.WISHES[+row.dataset.i]; if (!w) return; return P5.actionSheet(w.title, [{ label: '拆子任务', onClick: () => OD.openWishPanel(w) }, { label: '愿望已实现', onClick: () => OD.openWishFulfill(w) }, { label: '收起', onClick: () => { void useAppStore.getState().setWishStatus(w.id, 'archived').then(() => { row.remove(); P5.toast('已收起 · 在 菜单 → 归档 里'); }).catch(() => P5.toast('收起失败，请重试')); } }, { label: '删除', tone: 'danger', onClick: () => OD.confirm('删除愿望', `「${w.title}」和挂在它下面的进度记录会一起删掉。`, '删除', () => { void useAppStore.getState().deleteWish(w.id).then(() => { row.remove(); P5.toast('已删除'); }).catch(() => P5.toast('删除失败，请重试')); }) }]); }
    if (a === 'undo') {
      const r = b.closest('.arch-row,.req'), id = r?.dataset.id;
      if (!id) return;
      void useAppStore.getState().undoTodayTodoCompletion(id).then(() => {
        const live = st.todos.find((x) => x.id === id);
        if (live) { live.count = Math.max(0, live.count - 1); redrawMain(); }
        else r.remove();
        P5.toast('已撤销今日完成，点数与记录已回退');
      }).catch(() => P5.toast('撤销失败，数据没有改变'));
    }
    if (a === 'restore') {
      const r = b.closest('.arch-row'), id = r?.dataset.id;
      if (!id) return;
      void useAppStore.getState().updateTodo(id, { isActive: true, archivedAt: undefined }).then(() => {
        r.animate([{ transform: 'none' }, { transform: 'translateX(60px) rotate(3deg)', opacity: 0 }], { duration: P5.reduced() ? 0 : 240, fill: 'both' }).onfinish = () => r.remove();
        P5.toast('已恢复到今日任务');
      }).catch(() => P5.toast('恢复失败，任务没有改变'));
    }
    if (a === 'del') {
      const r = b.closest('.arch-row'), id = r?.dataset.id;
      if (!id) return;
      confirmDel(r.querySelector('b').textContent, async () => {
        await useAppStore.getState().deleteTodo(id);
        r.remove();
      });
    }
  });
  // BIG DEAL 卡：点卡 → 二级面板；⋯ / 长按 → 管理菜单
  const bd = () => root.querySelector('.p4-bdh .od-bdh');
  root.addEventListener('click', (e) => { const c = bd(); if (!c || !c.contains(e.target)) return; if (e.target.closest('[data-act="manage"]')) { e.stopPropagation(); return bdMenu(); } OD.openBigPanel(); });
  const c0 = bd(); if (c0) P5.longPress(c0, bdMenu);
  // 目标区左右滑切面
  const g = root.querySelector('.goal5'); let x0 = null;
  g.addEventListener('pointerdown', (e) => { if (e.target.closest('button,[role=button]')) return; x0 = e.clientX; });
  g.addEventListener('pointerup', (e) => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 48) { const v = dx < 0 ? 'countdown' : 'weekly'; if (v !== st.goal) { st.goal = v; redrawGoal(dx < 0 ? 1 : -1); } } });
  if (st.jump) { st.jump = false; setTimeout(() => root.querySelector('#calling-card-section')?.scrollIntoView({ behavior: 'auto', block: 'start' }), 60); }
  return () => clearInterval(iv);
}
const bdMenu = () => P5.actionSheet(OD.BIG.title, [{ label: '打开二级面板', onClick: () => OD.openBigPanel() }, { label: '编辑', onClick: () => openTodoForm({ todo: { id: 'big', title: OD.BIG.title, attribute: 'knowledge', points: OD.BIG.pts, frequency: 'big', steps: OD.BIG.steps } }) }, { label: '归档', onClick: () => P5.toast('已归档') }, { label: '删除', tone: 'danger', onClick: () => confirmDel(OD.BIG.title, () => P5.toast('已删除')) }]);
/** 本周目标卡（WeeklyGoalSection）：设定 / ⋯ 修改选项 / 长按菜单 / 领取 → 达成 → 已领取 */
function bindWeekly(root) {
  const body = root.querySelector('.goal-body[data-goal="weekly"]'); if (!body || body._w) return; body._w = 1;
  const redraw = (s) => { st.weekly = s; body.innerHTML = OD.weeklyCard(s); body._lp = 0; lp(); P5.panelIn(body.children, { from: 'up' }); };
  const menu = () => P5.actionSheet('本周目标', [{ label: '修改选项', onClick: () => OD.openGoalSetup() }, { label: '重置本周目标', onClick: () => OD.confirm('重置本周目标', '本周的目标设定会清空，已获得的点数不受影响。', '重置', () => { void OD.resetWeeklyGoal().then(() => { redraw('empty'); P5.toast('已重置'); }).catch(() => P5.toast('重置失败')); }) }, { label: '删除本周目标记录', tone: 'danger', onClick: () => OD.confirm('删除本周目标记录', '这条本周目标将被删除。', '删除', () => { void OD.resetWeeklyGoal().then(() => { redraw('empty'); P5.toast('已删除'); }).catch(() => P5.toast('删除失败')); }) }]);
  const lp = () => { const c = body.querySelector('.od-wg'); if (c && !body._lp) { body._lp = 1; P5.longPress(c, menu); } };
  lp();
  body.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act; if (a === 'setup') OD.openGoalSetup(); if (a === 'opts') menu(); if (a === 'claim') OD.openCelebration(() => { OD.openClaimed(); redraw('claimed'); }); });
}

export function todosEnter(root) {
  const old = root.querySelector('.cal-roll .old'), nw = root.querySelector('.cal-roll .new');
  old.animate([{ transform: 'translateY(0) rotate(0)', opacity: 1 }, { transform: 'translateY(-120%) rotate(-14deg)', opacity: 0 }], { duration: 260, delay: 160, easing: 'cubic-bezier(.6,0,.8,.4)', fill: 'both' });
  nw.style.opacity = 0;
  P5.spring({ stiffness: 520, damping: 22, delay: .38, onUpdate: (p) => { nw.style.opacity = Math.min(1, p * 2); nw.style.transform = `translateY(${P5.lerp(110, 0, p)}%) scale(${P5.lerp(1.6, 1, p)}) rotate(${P5.lerp(10, 0, p)}deg)`; } });
  root.querySelector('.cal5').animate([{ transform: 'rotate(-6deg) translateX(-60px)', opacity: 0 }, { transform: 'rotate(-6deg)', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
  const bb = root.querySelector('.cd-bubble'); bb && bb.animate([{ transform: 'scale(0) rotate(-30deg)' }, { transform: 'scale(1.2) rotate(8deg)', offset: .62 }, { transform: 'none' }], { duration: 460, delay: 140, easing: 'cubic-bezier(.2,1.45,.4,1)', fill: 'backwards' });
  P5.panelIn(root.querySelectorAll('.goal5,.main-hd,.tools,.p4-bdh,.arch5'), { stagger: .06, delay: .12 });
  root.querySelectorAll('.req,.od-wish').forEach((r, i) => r.animate([{ opacity: 0, transform: 'translateX(60px) skewX(-10deg)' }, { opacity: 1, transform: 'translateX(-4px) skewX(2deg)', offset: .7 }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 260 + i * 40, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'backwards' }));
  const fab = root.querySelector('.fab5'); P5.spring({ stiffness: 420, damping: 18, delay: .5, onUpdate: (p) => fab.style.transform = `scale(${p}) rotate(${P5.lerp(-120, -8, p)}deg)` });
}

function swapGoal(root, dir, after) {
  root.querySelectorAll('.goal-tabs button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === st.goal));
  const body = root.querySelector('.goal-body');
  const put = () => {
    const tmp = document.createElement('div'); tmp.innerHTML = goalDeck(); body.replaceWith(tmp.querySelector('.goal-body'));
    const nb = root.querySelector('.goal-body'); after && after();
    if (P5.reduced() || !dir) return;
    nb.animate([{ opacity: 0, transform: `translateX(${18 * dir}px)` }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'ease-out' });
    P5.panelIn(nb.querySelectorAll('.ccard'), { from: 'right', stagger: .05 });
  };
  if (P5.reduced() || !dir) return put();
  body.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-18 * dir}px)` }], { duration: 120, fill: 'both' }).onfinish = put;
}
function archiveRow(r) {
  const go = async () => {
    const id = r.dataset.id;
    try {
      await useAppStore.getState().updateTodo(id, { isActive: false });
      st.todos = st.todos.filter((x) => x.id !== id);
      if (P5.reduced()) r.remove();
      else r.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateX(-30px) rotate(-4deg) scale(.96)', opacity: 0 }], { duration: 260, easing: 'cubic-bezier(.6,0,.8,.4)', fill: 'both' }).onfinish = () => r.remove();
      P5.toast('已归档（不启用）');
    } catch {
      P5.toast('归档失败，任务没有改变');
    }
  };
  void go();
}
/** 删除任务确认（真实 Todos.tsx 页面级 ConfirmDialog） */
export function confirmDel(title, done) {
  return P5.confirmDlg({ title: '删除任务', description: `任务「${title}」将被永久删除，无法撤销。`, tone: 'danger', confirmText: '删除', cancelText: '取消', onConfirm: async () => {
    try {
      if (done) await done();
      P5.toast('已删除');
    } catch {
      P5.toast('删除失败，任务没有改变');
    }
  } });
}
/** 记下一个愿望（真实 Todos.tsx wishAddOpen SheetModal） */
export function wishSheet(onSaved) {
  return P5.sheet('记下一个愿望', `<p class="sh-p">它不会出现在今日任务里。记录时把事挂上去，你就能看见自己在靠近它。</p><input class="inp" placeholder="想实现的事…" aria-label="愿望标题"><div class="sh-acts">${U.btn('记下', { tone: 'red', seed: 21, size: 'lg', attrs: 'data-ok' })}</div>`, { onMount: (sh, close) => {
    const i = sh.querySelector('input'), ok = sh.querySelector('[data-ok]');
    ok.onclick = () => { const v = i.value.trim(); if (!v) { i.classList.add('p4-bad'); i.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 240 }); i.focus(); return; } void useAppStore.getState().addWish({ title: v, source: 'manual' }).then(() => { close(); P5.sfx('success'); P5.toast('愿望已记下'); onSaved && onSaved(); }).catch(() => P5.toast('记下失败，请重试')); };
    i.oninput = () => i.classList.remove('p4-bad');
  } });
}
