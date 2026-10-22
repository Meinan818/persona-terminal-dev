// @ts-nocheck —— 心相记账 · 记账 Tab（真实 src/pages/Ledger.tsx p5 分支；视觉 = v3 pages/pages_b.js ledger + legacy/css/pages.css 的 .led*）。
// 按 FIXLIST P1-07 ~ P1-11 / P0-13 补全（v3 只有单屏 + 一个简版「确认这一笔」sheet，React 版不保留简版）：
//   余额牌：月余额 / 本月已花 ⇄ 总余额（点切换）、本月预算剩 · 今日可花 / 本月已超 / 本月还没设预算；「设置预算 / 编辑预算」→ BudgetSheet；「对账」→ ReconcileSheet
//   首次未设余额：引导卡「先设置你当前的余额」→ ReconcileSheet(initial)
//   一句话记多笔 + 📷 拍小票（读图中… → 看图读的，核对一下金额 / 看图读出多笔，核对一下 / 这张没读出来，手动填吧 / 未配视觉）+「记一笔」
//     → 单笔：确认这一笔（AI 解析中 → 草稿）；多笔：确认 N 笔（batch）；保存 → LedgerSavedModal（TodoCompleteP5 heading=记账完成）
//   近 9 日支出；流水 / 统计 切换；月份切换（上个月 / 下个月 · 收入）；流水行点开 / 长按 → ConfirmDialog「删除这一笔？」
//   空态：「还没有记录，记一笔开始吧」/「这个月还没有记录」
// 文案均取自真实 Ledger.tsx。
import { P5 } from './p5';
import { OD, INLINE } from './d4';
import { todoCompleteP5 } from '@/p5r-red/screens/overlays/cutins.p5r';
const U = P5.ui;
const fmt = (n) => Math.abs(n).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
const yen = (n) => `¥${fmt(n)}`;
const signed = (n) => `${n < 0 ? '−' : ''}¥${fmt(n)}`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shake = (el) => { if (el && !P5.reduced()) el.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 240 }); };
const CATS = ['餐饮', '交通', '学习', '娱乐', '日用', '其它'];
const CHANNELS = ['微信', '支付宝', '银行卡', '信用卡'];
const SOURCES = ['工资', '兼职', '红包', '奖学金'];
export const FLOW = [
  { note: '午饭 · 拉面', amount: 32, dir: 'expense', ch: '微信', d: 0 }, { note: '地铁', amount: 4, dir: 'expense', ch: '支付宝', d: 0 },
  { note: '奶茶', amount: 18, dir: 'expense', ch: '微信', d: 1 }, { note: '家教收入', amount: 300, dir: 'income', ch: '银行卡', d: 1 },
  { note: '二手书', amount: 45, dir: 'expense', ch: '支付宝', d: 2 },
];

/** 页面状态（applyLedgerParams 每次进入重置） */
export const L = { view: 'list', bal: 'total', month: 0, empty: false, first: false, budget: true, over: false, rows: [], ocr: 'ok' };
/** ?view=list|stats  ?state=empty|first|over|nobudget  ?ocr=ok|multi|none|novision|fail */
export function applyLedgerParams(q) {
  L.view = q.get('view') === 'stats' ? 'stats' : 'list'; L.bal = q.get('bal') === 'month' ? 'month' : 'total'; // parity：默认 = v3 总余额 L.month = 0;
  const s = q.get('state'); L.empty = s === 'empty' || s === 'first'; L.first = s === 'first'; L.over = s === 'over'; L.budget = s !== 'nobudget' && s !== 'first';
  L.rows = L.empty ? [] : FLOW.map((r) => ({ ...r }));
  L.ocr = q.get('ocr') || 'ok';
}
const sums = () => { const ex = L.rows.filter((r) => r.dir === 'expense').reduce((a, r) => a + r.amount, 0) + (L.empty ? 0 : 1361) + (L.over ? 1400 : 0), inc = L.rows.filter((r) => r.dir === 'income').reduce((a, r) => a + r.amount, 0) + (L.empty ? 0 : 2900); return { ex, inc }; };

const balCard = () => {
  const { ex, inc } = sums(), lim = 2600, left = lim - ex, total = L.empty ? 0 : 3268, todayLeft = Math.round(left / 11);
  const month = L.bal === 'month';
  const label = month ? (L.budget ? '月余额' : '本月已花') : '总余额';
  const num = month ? (L.budget ? signed(left) : yen(ex)) : signed(total);
  const sub = month ? (L.budget ? (left < 0 ? `本月已超 ${yen(-left)}` : `本月预算剩 ${yen(left)}${todayLeft > 0 ? ` · 今日可花 ${yen(todayLeft)}` : ''}`) : '本月还没设预算') : '';
  // parity：总余额态 = v3 原样（「总余额 ⇄」+ 大数 +「本月预算剩 ¥ 1,140 · 日均 ¥ 38」+ 预算条，无按钮）；月余额态为 FIXLIST P1-07 补充
  if (!month) return U.shp('div', { kind: 'cut', seed: 181, tone: 'ink', cls: 'lb-card' }, `<button class="lb-sw" data-act="bal" aria-label="切换到月余额">总余额 ⇄</button><b class="lb-n">${L.empty ? '¥0' : `¥${fmt(total)}`}</b><small>${L.budget ? `本月预算剩 ¥ ${fmt(Math.max(0, left))} · 日均 ¥ ${L.empty ? 0 : 38}` : '本月还没设预算'}</small>${L.budget ? `<span class="lb-bud"><i style="width:${L.empty ? 0 : 62}%"></i></span>` : ''}`);
  return U.shp('div', { kind: 'cut', seed: 181, tone: 'ink', cls: 'lb-card' }, `<button class="lb-sw" data-act="bal" aria-label="切换到总余额">${label} ⇄</button>
    <b class="lb-n ${month && left < 0 && L.budget ? 'p4-over' : ''}">${num}</b><small>${month ? (L.budget ? `预算 ${yen(lim)}` : '未设预算') : '∇ 点击看本月'}</small><small class="p4-lb-sub">${sub}</small>
    ${month && L.budget ? `<span class="lb-bud"><i style="width:${Math.min(100, Math.round(ex / lim * 100))}%"></i></span>` : ''}
    <span class="p4-lb-acts">${U.btn(L.budget ? '编辑预算' : '设置预算', { tone: 'ink', size: 'sm', seed: 321, attrs: 'data-act="budget"' })}</span>`);
};
const flowList = () => {
  if (L.month !== 0 || !L.rows.length) return `<div class="od-empty p4-led-empty"><b>${L.empty && L.month === 0 ? '还没有记录，记一笔开始吧' : '这个月还没有记录'}</b></div>`;
  return `<div class="led-list">${L.rows.map((r, i) => `<div class="led-row" data-i="${i}" role="button" tabindex="0" style="--i:${i}"><i class="req-bg"></i><b>${esc(r.note)}</b><small>${r.ch}</small><span class="led-price ${r.dir === 'income' ? 'in' : ''}">${r.dir === 'income' ? '+' : '−'}¥${fmt(r.amount)}</span></div>`).join('')}</div>`;
};
const monthNav = () => { const m = ((new Date().getMonth() + L.month) % 12 + 12) % 12 + 1; const { inc } = sums(); return `<div class="led-mon"><button data-act="mon" data-d="-1" aria-label="上个月">◀</button><b>${m} 月</b><small class="p4-mon-in"> · 收入 ${yen(L.month === 0 ? inc : 0)}</small><button data-act="mon" data-d="1" aria-label="下个月" ${L.month >= 0 ? 'disabled' : ''}>▶</button></div>`; };

export function ledgerRender() {
  const bars = L.empty ? [0, 0, 0, 0, 0, 0, 0, 0, 0] : [80, 30, 120, 60, 45, 150, 20, 70, 99];
  return `<div class="led5">
    ${L.first ? `<button class="p4-led-setup" data-act="setup"><i class="oa-r" aria-hidden="true"></i>${U.star('var(--red)', 'var(--ink)', 1.4, 'star p4-led-st')}<span><b>先设置你当前的余额</b><small>告诉我你现在大概有多少钱，记账才准——之后随时可「对账」修正。</small></span><em>›</em></button>` : ''}
    <div class="led-grid"><section class="led-a">
      <div class="led-bal">${balCard()}</div>
      ${U.shp('div', { kind: 'torn', seed: 182, cls: 'led-in' }, `${U.plate('一句话记多笔', { fs: 15 })}<textarea class="inp" rows="2" data-quick placeholder="一句话记多笔；空着点 = 手动填">${L.empty ? '' : '午饭拉面32 地铁4'}</textarea><p class="p4-ocr-msg" data-ocrmsg hidden></p>
        <div class="sh-acts" style="justify-content:space-between"><span class="p4-led-l">${U.btn('对账', { tone: 'ink', seed: 183, attrs: 'data-act="reconcile"' })}${L.ocr === 'novision' ? '' : U.btn('📷 拍小票', { tone: 'paper', size: 'sm', seed: 187, attrs: 'data-act="ocr"' })}</span>${U.btn('记一笔', { tone: 'red', size: 'lg', seed: 184, attrs: 'data-act="rec"' })}</div>`)}
      ${U.shp('div', { kind: 'torn', seed: 185, cls: 'led-chart' }, `${U.plate('近 9 日支出', { fs: 15 })}<div class="lc-bars" aria-label="近 9 日支出">${bars.map((v, i) => `<span><i style="height:${Math.max(2, v / 1.5)}%"></i><small>${new Date(Date.now() - (8 - i) * 864e5).getDate()}</small></span>`).join('')}</div>`)}
    </section><section class="led-b">
      <div data-vhost>${L.view === 'list' ? monthNav() + flowList() : ''}</div>
      <div class="led-pay">${U.tag('发薪日 · 决定何时提醒你规划新一程', 'line')}</div></section></div></div>`;
}

export function ledgerMount(root) {
  const host = () => root.querySelector('[data-vhost]');
  const drawView = () => {
    const h = host();
    if (L.view === 'stats') { INLINE.host = h; OD.openLedgerStats(L.empty ? 'empty' : L.over ? 'over' : 'data'); INLINE.host = null; return; }
    h.innerHTML = monthNav() + flowList(); bindRows(); P5.panelIn(h.querySelectorAll('.led-row'), { from: 'right', stagger: .04 });
  };
  const drawBal = () => { const b = root.querySelector('.led-bal'); b.innerHTML = balCard(); };
  const bindRows = () => root.querySelectorAll('.led-row').forEach((r) => { if (r._lp) return; r._lp = 1; P5.longPress(r, () => delRow(+r.dataset.i)); });
  const delRow = (i) => { const r = L.rows[i]; if (!r) return; P5.confirmDlg({ title: '删除这一笔？', description: `${r.note || (r.dir === 'income' ? '收入' : '支出')} · ¥${fmt(r.amount)}`, tone: 'danger', confirmText: '删除', cancelText: '取消', onConfirm: () => { L.rows.splice(i, 1); drawView(); drawBal(); P5.toast('已删除'); } }); };
  const saved = (rows) => { rows.forEach((r) => L.rows.unshift(r)); L.empty = false; drawView(); drawBal(); playSaved(rows); };
  bindRows();
  if (L.view === 'stats') drawView();
  root.querySelector('[data-view]')?.addEventListener('pick', (e) => { L.view = e.detail; drawView(); });
  root.addEventListener('click', (e) => {
    const row = e.target.closest('.led-row'); if (row && root.contains(row)) return delRow(+row.dataset.i);
    const b = e.target.closest('[data-act]'); if (!b || !root.contains(b) || b.disabled) return; const a = b.dataset.act;
    if (a === 'bal') { L.bal = L.bal === 'month' ? 'total' : 'month'; drawBal(); }
    if (a === 'budget') openBudgetSheet({ mode: L.budget ? 'edit' : 'first', onSaved: () => { L.budget = true; drawBal(); } });
    if (a === 'reconcile') openReconcileSheet({});
    if (a === 'setup') openReconcileSheet({ initial: true, onSaved: () => { L.first = false; root.querySelector('.p4-led-setup')?.remove(); } });
    if (a === 'mon') { L.month = Math.min(0, L.month + +b.dataset.d); drawView(); }
    if (a === 'rec') {
      const txt = root.querySelector('[data-quick]').value.trim(), nums = txt.match(/\d+(\.\d+)?/g) || [];
      if (nums.length > 1) openBatchSheet({ text: txt, onSaved: saved }); else openEntrySheet({ text: txt, onSaved: saved });
    }
    if (a === 'ocr') {
      const msg = root.querySelector('[data-ocrmsg]'), s = b.querySelector('span'); s.textContent = '读图中…'; b.disabled = true; msg.hidden = true;
      setTimeout(() => {
        s.textContent = '📷 拍小票'; b.disabled = false;
        const say = (t) => { msg.hidden = false; msg.textContent = t; };
        if (L.ocr === 'none') return say('这张没读出来，手动填吧');
        if (L.ocr === 'fail') return say('图片读取失败，换一张试试');
        if (L.ocr === 'multi') return openBatchSheet({ text: '便利店 饭团 8.5 咖啡 15 纸巾 6', hint: '看图读出多笔，核对一下', onSaved: saved });
        openEntrySheet({ text: '咖啡 28', hint: '看图读的，核对一下金额', onSaved: saved });
      }, P5.reduced() ? 0 : 1200);
    }
  });
}
export function ledgerEnter(root) {
  const n = root.querySelector('.lb-n'); n && n.animate([{ transform: 'scale(1.3)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, delay: 120, easing: 'cubic-bezier(.15,.95,.1,1)', fill: 'backwards' });
  root.querySelector('.lb-card').animate([{ transform: 'translateX(80px) rotate(10deg) scale(1.3)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.15,.95,.1,1)', fill: 'backwards' });
  root.querySelectorAll('.lc-bars i').forEach((b, i) => b.animate([{ transform: 'scaleY(0)' }, { transform: 'none' }], { duration: 400, delay: 200 + i * 40, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }));
  root.querySelectorAll('.led-row').forEach((r, i) => r.animate([{ opacity: 0, transform: 'translateX(60px)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: 160 + i * 45, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'backwards' }));
  P5.panelIn(root.querySelectorAll('.p4-led-setup,.led-in,.led-chart,.p4-led-vs'), { stagger: .06, delay: .1 });
}

/** 记账完成（LedgerSavedModal → TodoCompleteP5 heading=记账完成）：单笔「−¥28 · 咖啡」/ 批量「共 N 笔已入账」 */
export function playSaved(rows, onClose) {
  const title = rows.length > 1 ? `共 ${rows.length} 笔已入账` : `${rows[0].dir === 'income' ? '+' : '−'}¥${fmt(rows[0].amount)} · ${rows[0].note}`;
  return todoCompleteP5({ title, points: rows.some((r) => r.labor) ? 10 : 0, heading: '记账完成', onClose });
}

/* ── chips 行（单选；可「＋新…」追加） ── */
const chips = (key, list, sel, add) => `<div class="p4-chips" data-chips="${key}">${list.map((x) => `<button type="button" class="od-chip ${x === sel ? 'on' : ''}" aria-pressed="${x === sel}" data-v="${esc(x)}">${x === sel ? '✓ ' : ''}${esc(x)}</button>`).join('')}${add ? `<span class="p4-chip-add"><input class="inp" placeholder="${add}" aria-label="${add}"><button type="button" class="od-chip" data-add>＋</button></span>` : ''}</div>`;
const bindChips = (root, onPick) => root.addEventListener('click', (e) => {
  const box = e.target.closest('[data-chips]'); if (!box) return;
  if (e.target.closest('[data-add]')) { const i = box.querySelector('.p4-chip-add input'), v = i.value.trim(); if (!v) return shake(i); const b = document.createElement('button'); b.type = 'button'; b.className = 'od-chip'; b.dataset.v = v; b.textContent = v; box.insertBefore(b, box.querySelector('.p4-chip-add')); i.value = ''; b.click(); return; }
  const c = e.target.closest('.od-chip[data-v]'); if (!c) return;
  const on = !c.classList.contains('on') || box.dataset.req;
  box.querySelectorAll('.od-chip[data-v]').forEach((x) => { x.classList.remove('on'); x.setAttribute('aria-pressed', false); x.textContent = x.dataset.v; });
  if (on) { c.classList.add('on'); c.setAttribute('aria-pressed', true); c.textContent = '✓ ' + c.dataset.v; }
  onPick && onPick(box.dataset.chips, on ? c.dataset.v : null);
});
const parse = (text) => { const m = (text || '').match(/^(.*?)(\d+(?:\.\d+)?)/); return m ? { note: m[1].trim() || '一笔', amount: m[2] } : { note: '', amount: '' }; };

/** 确认这一笔（真实 Ledger.tsx draft SheetModal）：AI 解析中 → 草稿；支出 / 收入两套字段 */
export function openEntrySheet({ text = '', hint = '', dir: d0 = 'expense', parsing = true, saving = false, onSaved } = {}) {
  const p = parse(text); let dir = d0, labor = false;
  return P5.sheet('确认这一笔', `<div data-body>${parsing && text ? `<div class="od-c p4-parse">${OD.thinking('AI 解析中', '正在把这句话拆成金额 / 类目')}</div>` : ''}</div>`, { seed: 41, onMount: (sh, close) => {
    const body = sh.querySelector('[data-body]');
    const draw = () => {
      body.innerHTML = `${hint ? `<p class="p4-ocr-msg">${hint}</p>` : ''}
        <div class="p4-amt"><div class="seg" data-dir>${['expense', 'income'].map((k) => `<button type="button" aria-pressed="${dir === k}" data-v="${k}">${k === 'expense' ? '支出' : '收入'}</button>`).join('')}</div><span class="p4-amt-y">¥</span><input class="inp p4-amt-in" data-amt inputmode="decimal" value="${esc(p.amount)}" placeholder="0" aria-label="金额"></div>
        <label class="fld"><span>日期</span><input class="inp" type="date" value="${new Date().toISOString().slice(0, 10)}"></label>
        ${dir === 'expense' ? `<div class="fld"><span>细分类目 <small class="muted-d">可选</small></span>${chips('cat', CATS, '餐饮')}<input class="inp p4-mt" placeholder="如：早餐" aria-label="细分类目"></div>
          <div class="fld"><span>支付渠道</span>${chips('ch', CHANNELS, '微信', '新渠道')}</div>
          <div class="fld"><span>这笔值得吗？</span>${chips('worth', ['值得', '不值'], '')}</div>`
        : `<div class="fld"><span>来源</span>${chips('src', SOURCES, '兼职', '新来源')}</div>
          <div class="tg"><b>劳动所得 · 记账 +10 SP</b><small>选了才加点 · 每日封顶 +2</small>${OD.sw(labor, 'data-labor aria-label="劳动所得"')}</div>
          <div class="fld"><span>到账账户 <small class="muted-d">可选</small></span>${chips('acct', CHANNELS, '', '新账户')}</div>`}
        <label class="fld"><span>备注</span><input class="inp" data-note placeholder="备注（可选）" value="${esc(p.note)}"></label>
        <div class="sh-acts">${U.btn(saving ? '保存中…' : '保存', { tone: 'red', size: 'lg', seed: 186, attrs: `data-ok ${saving ? 'disabled' : ''}` })}</div>`;
      OD.wire(body);
      body.querySelector('[data-dir]').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; p.amount = body.querySelector('[data-amt]').value; p.note = body.querySelector('[data-note]').value; dir = b.dataset.v; draw(); };
      const lb = body.querySelector('[data-labor]'); if (lb) lb.addEventListener('click', () => (labor = lb.classList.contains('on')));
      body.querySelector('[data-ok]').onclick = (e) => {
        const amt = parseFloat(body.querySelector('[data-amt]').value); if (!(amt > 0)) { shake(body.querySelector('.p4-amt')); body.querySelector('[data-amt]').classList.add('p4-bad'); return; }
        const b = e.currentTarget; b.querySelector('span').textContent = '保存中…'; b.disabled = true;
        setTimeout(() => { close(); onSaved ? onSaved([{ note: body.querySelector('[data-note]').value.trim() || (dir === 'income' ? '收入' : '支出'), amount: amt, dir, ch: body.querySelector('[data-chips="ch"] .on, [data-chips="acct"] .on')?.dataset.v || '微信', d: 0, labor }]) : playSaved([{ note: '咖啡', amount: amt, dir, labor }]); }, P5.reduced() ? 0 : 600);
      };
      bindChips(body);
      if (!P5.reduced()) P5.panelIn(body.children, { stagger: .03 });
    };
    if (parsing && text) setTimeout(draw, P5.reduced() ? 0 : 900); else draw();
  } });
}

/** 确认 N 笔（真实 Ledger.tsx batch SheetModal） */
export function openBatchSheet({ text = '午饭拉面32 地铁4', hint = '', onSaved } = {}) {
  const rows = []; (text.match(/[^\d\s.]*\s*\d+(?:\.\d+)?/g) || []).forEach((seg) => { const p = parse(seg.trim()); rows.push({ dir: 'expense', cat: /地铁|公交|打车/.test(p.note) ? '交通' : '餐饮', amount: p.amount, ch: '微信', note: p.note }); });
  if (!rows.length) rows.push({ dir: 'expense', cat: '餐饮', amount: '', ch: '微信', note: '' });
  let close0;
  const rowHTML = (r, i) => `<div class="p4-brow" data-i="${i}" style="--r:${i % 2 ? .5 : -.5}deg">
      <div class="seg p4-bdir" data-bdir>${['expense', 'income'].map((k) => `<button type="button" aria-pressed="${r.dir === k}" data-v="${k}">${k === 'expense' ? '支' : '收'}</button>`).join('')}</div>
      <select class="inp p4-bsel" data-f="cat" aria-label="类目">${(r.dir === 'expense' ? CATS : SOURCES).map((c) => `<option ${c === r.cat ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <input class="inp p4-bamt" data-f="amount" inputmode="decimal" value="${esc(r.amount)}" placeholder="金额" aria-label="金额">
      <select class="inp p4-bsel" data-f="ch" aria-label="${r.dir === 'expense' ? '渠道' : '到账账户'}"><option value="">${r.dir === 'expense' ? '渠道…' : '到账账户…'}</option>${CHANNELS.map((c) => `<option ${c === r.ch ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <input class="inp p4-bnote" data-f="note" value="${esc(r.note)}" placeholder="备注" aria-label="备注">
      <button type="button" class="od-del" data-act="rm" aria-label="删除此行">✕</button></div>`;
  return P5.sheet(`确认 ${rows.length} 笔`, `<div data-body></div>`, { seed: 43, onMount: (sh, close) => {
    close0 = close; const body = sh.querySelector('[data-body]'), h3 = sh.querySelector('h3 .plate span');
    const draw = () => {
      body.innerHTML = `${hint ? `<p class="p4-ocr-msg">${hint}</p>` : ''}<p class="sh-p">识别到多笔，逐行确认 / 增删后一次保存</p><div class="p4-brows">${rows.map(rowHTML).join('')}</div>
        <button class="od-addline" data-act="addrow">＋ 再加一行</button>
        <label class="fld"><span>日期（应用到全部）</span><input class="inp" type="date" value="${new Date().toISOString().slice(0, 10)}"></label>
        <div class="sh-acts">${U.btn(`全部保存（${rows.length}）`, { tone: 'red', size: 'lg', seed: 187, attrs: `data-ok ${rows.length ? '' : 'disabled'}`, cls: rows.length ? '' : 'od-dis' })}</div>`;
      if (h3) h3.textContent = `确认 ${rows.length} 笔`;
    };
    draw();
    body.addEventListener('input', (e) => { const r = e.target.closest('.p4-brow'), f = e.target.dataset.f; if (r && f) rows[+r.dataset.i][f] = e.target.value; });
    body.addEventListener('change', (e) => { const r = e.target.closest('.p4-brow'), f = e.target.dataset.f; if (r && f) rows[+r.dataset.i][f] = e.target.value; });
    body.addEventListener('click', (e) => {
      const d = e.target.closest('[data-bdir] button'); if (d) { const i = +d.closest('.p4-brow').dataset.i; rows[i].dir = d.dataset.v; rows[i].cat = d.dataset.v === 'expense' ? '餐饮' : '兼职'; draw(); return; }
      const b = e.target.closest('[data-act]'); if (b) { if (b.dataset.act === 'rm') { rows.splice(+b.closest('.p4-brow').dataset.i, 1); draw(); } if (b.dataset.act === 'addrow') { rows.push({ dir: 'expense', cat: '餐饮', amount: '', ch: '微信', note: '' }); draw(); P5.panelIn([body.querySelector('.p4-brows').lastElementChild], { from: 'right' }); } return; }
      const ok = e.target.closest('[data-ok]'); if (!ok || ok.disabled) return;
      const bad = rows.findIndex((r) => !(parseFloat(r.amount) > 0)); if (bad >= 0) { const el = body.querySelectorAll('.p4-brow')[bad]; el.querySelector('.p4-bamt').classList.add('p4-bad'); shake(el); return; }
      ok.querySelector('span').textContent = '保存中…'; ok.disabled = true;
      setTimeout(() => { close(); const out = rows.map((r) => ({ note: r.note || r.cat, amount: parseFloat(r.amount), dir: r.dir, ch: r.ch || '微信', d: 0 })); onSaved ? onSaved(out) : playSaved(out); }, P5.reduced() ? 0 : 600);
    });
  } });
}

/** 本月预算 / 新的一程（真实 Ledger.tsx#BudgetSheet）：mode first | edit；locked = 本月修改次数已用完 */
export function openBudgetSheet({ mode = 'edit', locked = false, onSaved } = {}) {
  const first = mode === 'first';
  return P5.sheet(first ? '新的一程 · 立个目标' : '本月预算', `<p class="sh-p">${first ? '新的一程开始了——给自己定个花费节奏，和一个想攒下的小目标。' : '设一个本月的花费上限——它是你的纪律线，不影响总余额。'}</p>
    <label class="fld"><span>花费目标 <small class="muted-d">本月</small></span><input class="inp p4-amt-in" data-lim inputmode="decimal" value="${first ? '' : '2600'}" placeholder="¥ 0"></label>
    <div class="fld"><span>🏆 省钱挑战 · 这个月想省下 <small class="${locked ? 'od-err' : 'muted-d'}">${locked ? '本月修改次数已用完' : '还可改 2 次'}</small></span><input class="inp" inputmode="decimal" value="${first ? '' : '300'}" placeholder="¥ 0" ${locked ? 'disabled' : ''}><small class="muted-d">月底「预算 − 实际花费」达到这个数，次月结算 +10 SP 🎉</small></div>
    <div class="fld"><span>每月重置日 <small class="muted-d">发薪日 · 决定何时提醒你规划新一程</small></span><select class="inp" aria-label="每月重置日">${Array.from({ length: 28 }, (_, i) => `<option ${i + 1 === 10 ? 'selected' : ''} value="${i + 1}">${i + 1} 日起算${i === 0 ? '（自然月初）' : ''}</option>`).join('')}</select></div>
    <div class="sh-acts">${U.btn('就这么定', { tone: 'red', size: 'lg', seed: 331, attrs: 'data-ok' })}</div>`, { seed: 45, onMount: (sh, close) => {
    sh.querySelector('[data-ok]').onclick = () => { const v = parseFloat(sh.querySelector('[data-lim]').value); if (!(v > 0)) { sh.querySelector('[data-lim]').classList.add('p4-bad'); shake(sh.querySelector('[data-lim]')); return; } close(); onSaved && onSaved(v); };
  } });
}

/** 余额对账 / 设置当前余额（真实 Ledger.tsx#ReconcileSheet）：initial 首次；remaining 剩余轮数；fail 演示对账失败 */
const ACCTS = [{ name: '支付宝', bal: 1268 }, { name: '微信', bal: 860 }, { name: '银行卡', bal: 2400 }, { name: '信用卡', bal: -1260, debt: true }, { name: '未分配', bal: 0, unassigned: true }];
export function openReconcileSheet({ initial = false, remaining = 2, fail = false, onSaved } = {}) {
  const vals = {};
  return P5.sheet(initial ? '设置当前余额' : '余额对账', `<p class="sh-p p4-rc-p">${initial ? '按账户填入你现在的余额（支付宝 / 微信 / 银行卡…，只填一个也行），之后随时可「对账」修正；这一次不占对账轮数。' : `把各账户校准到真实余额（打开支付宝 / 微信对一下）。一次提交算一轮，本月还可对账 <b>${Math.max(0, remaining)}</b> 轮。信用卡这类负债账户余额可以是负数。`}</p>
    <div class="p4-rc">${ACCTS.filter((a) => !(initial && a.unassigned)).map((a) => `<div class="p4-rc-row"><span class="p4-rc-n"><b>${a.name}</b>${a.debt ? '<i class="tag">负债</i>' : ''}${a.unassigned ? '<i class="tag line">没填账户的流水</i>' : ''}<small>${initial ? '' : a.debt && a.bal < 0 ? `欠 ¥${fmt(-a.bal)}` : signed(a.bal)}</small></span><input class="inp" inputmode="decimal" data-a="${a.name}" placeholder="${a.debt ? (a.bal < 0 ? `-${fmt(-a.bal)}` : '0（欠款填负数）') : initial ? '0' : fmt(a.bal)}" aria-label="${a.name} 余额"></div>`).join('')}</div>
    <p class="od-err p4-rc-err" data-err hidden></p>
    <div class="sh-acts">${U.btn('', { tone: 'red', size: 'lg', seed: 341, attrs: 'data-ok' })}</div>`, { seed: 47, onMount: (sh, close) => {
    const ok = sh.querySelector('[data-ok]'), lab = ok.querySelector('span');
    const upd = () => { const n = Object.values(vals).filter((v) => v !== '' && v !== '-' && Number.isFinite(Number(v))).length; const can = (initial || remaining > 0) && n > 0;
      lab.textContent = initial ? (n ? `就这么记（${n} 个账户）` : '填一个账户的余额') : remaining > 0 ? (n ? `校准 ${n} 个账户` : '改了哪个账户就校准哪个') : '本月对账已用完';
      ok.disabled = !can; ok.classList.toggle('od-dis', !can); };
    sh.addEventListener('input', (e) => { const a = e.target.dataset.a; if (!a) return; e.target.value = e.target.value.replace(/[^\d.-]/g, ''); vals[a] = e.target.value; upd(); });
    upd();
    ok.onclick = () => { if (ok.disabled) return; lab.textContent = '记录中…'; ok.disabled = true; const er = sh.querySelector('[data-err]'); er.hidden = true;
      setTimeout(() => { if (fail) { er.hidden = false; er.textContent = '对账失败'; ok.disabled = false; upd(); return; } close(); P5.toast(initial ? '余额已设置' : '已校准'); onSaved && onSaved(); }, P5.reduced() ? 0 : 700); };
  } });
}
