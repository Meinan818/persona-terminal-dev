// @ts-nocheck —— 添加 / 编辑任务抽屉（真实 src/pages/Todos.tsx showAdd SheetModal）+ 课表导入确认（FS3.4-②）。
// 外观沿用 v3 pages/todos.js addSheet（.fld/.seg/.stepper/.tg/details.more/.sched，样式 legacy/css/todos.css + components）；按 FIXLIST 补：
//   P1-05 必填校验（任务名空 → 红框抖动 + 聚焦，真实为静默拦截）、BIG DEAL「✦ AI 帮我拆」：正在拆… → 小步逐条出现 → 可增删
//         （失败文案照抄真实：「这次没拆出能用的小步。换个说法，或手写一条吧」/「AI 未接通，先放了一条离线拆步——可改可删」）、编辑态预填 + 锁模式；
//   P1-04 📷 课表导入：仅新建 + 配了视觉档时出现 →「📷 正在读取课表…」→「课表导入 · 确认」逐条勾选（带星期 = 按周重复 / 无星期 = 每日；统一归入五属性）
//         →「导入 N 项」；没读出 / 解析失败两种报错原文照抄。
// 演示参数：openTodoForm({ todo, mode, ai: 'ok'|'fail'|'offline', sched: 'ok'|'none'|'fail', vision: true|false, invalid })
import { P5 } from './p5';
const U = P5.ui;
const WKC = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const shake = (el) => { if (!P5.reduced()) el.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-3px)' }, { transform: 'none' }], { duration: 260 }); };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const AI_STEPS = ['把题型和评分标准过一遍', '每周两篇大作文，限时 40 分钟', '整理一页写作模板句', '约一次口语模考'];

const stepRow = (s, i) => `<div class="od-step p4-fstep ${s.done ? 'done' : ''}" data-i="${i}"><span class="od-ck" aria-hidden="true">${s.done ? '✓' : ''}</span><input class="inp" value="${esc(s.t)}" placeholder="一个够得着的小步…" aria-label="子步 ${i + 1}" ${s.done ? 'disabled' : ''}>${s.done ? '' : '<button class="od-del" data-act="rmstep" aria-label="删除子步">✕</button>'}</div>`;

export function openTodoForm({ todo = null, mode: m0, ai = 'ok', sched = 'ok', vision = true, invalid = false, onSaved } = {}) {
  const t = todo;
  let mode = m0 || (t ? (t.frequency === 'count' ? 'count' : t.frequency === 'big' ? 'big' : 'single') : 'single');
  let attr = t ? t.attribute : 'knowledge', pts = t ? t.points : 2, cnt = t ? t.targetCount || 3 : 3;
  let steps = t && t.steps ? t.steps.map((s) => ({ ...s })) : [];
  P5.sheet(t ? '编辑任务' : '添加任务', `
    <label class="fld" data-f="title"><span>任务</span><input class="inp" data-title placeholder="今日要完成什么？" value="${t ? esc(t.title) : ''}" aria-required="true"></label>
    <div class="fld"><span>模式</span><div class="seg modes" data-modes>${[['single', '单次', '做完即归档', '✓'], ['count', '计数', '重复 N 次', '∞'], ['big', 'BIG DEAL', '大事拆小步', '◆']].map(([k, n, h, g]) => `<button aria-pressed="${k === mode}" data-m="${k}" ${t && k !== mode ? 'disabled' : ''}><b>${g}</b> ${n}<small>${h}</small></button>`).join('')}</div>${t ? '<small class="muted-d">编辑中不可切换模式</small>' : ''}</div>
    <div class="fld m-count" ${mode === 'count' ? '' : 'hidden'}><span>目标次数</span><div class="stepper" data-cnt><button type="button" aria-label="减一">−</button><b>${cnt}</b><button type="button" aria-label="加一">＋</button></div></div>
    <div class="fld m-big" ${mode === 'big' ? '' : 'hidden'}><span>大事</span>
      <input class="inp" data-state placeholder="现在到哪一步了？一句话（可选，AI 拆解会参考）" value="${t && t.frequency === 'big' ? '听力稳了，写作还虚' : ''}">
      <label class="fld"><span>截止日（可选）</span><input class="inp" type="date"></label>
      <div class="p4-fsteps" data-steps></div>
      <p class="p4-ai-msg" data-aimsg hidden></p>
      <div class="sh-acts" style="justify-content:flex-start">${U.btn('+ 手写一步', { tone: 'ink', size: 'sm', seed: 16, attrs: 'data-act="addstep"' })}${U.btn('✦ AI 帮我拆', { tone: 'red', size: 'sm', seed: 15, attrs: 'data-act="ai"' })}</div>
      <small class="muted-d" data-bighint>每完成一子步得主属性 +${pts}；全部完成触发收官奖励（SP + 触及属性各 +1）</small></div>
    <div class="fld"><span>奖励 · 主属性</span><div class="seg attrs" data-attrs>${P5.ATTR_ORDER.map((id) => `<button aria-pressed="${attr === id}" data-a="${id}">${P5.ATTR[id].name}</button>`).join('')}</div></div>
    <div class="fld"><span>点数</span><div class="stepper" data-pts><button type="button" aria-label="减一">−</button><b>${pts}</b><button type="button" aria-label="加一">＋</button></div></div>
    <details class="more"><summary>更多设置 ▼</summary>
      <div class="tg"><b>每日重置</b><small>每天刷新任务，包括进度</small><i class="sw ${!t || t.repeatDaily ? 'on' : ''}"></i></div>
      <div class="tg"><b>⭐ 标记为重要</b><small>重要任务将在首页置顶显示，并记录在历史中</small><i class="sw ${t && t.important ? 'on' : ''}"></i></div>
      <label class="fld"><span>截止日 DDL（可选）</span><input class="inp" type="date"></label>
      <div class="fld"><span>每周几执行（可选）</span><div class="seg" data-multi>${WKC.map((d) => `<button aria-pressed="false">${d.slice(1)}</button>`).join('')}</div></div>
      <label class="fld"><span>指定启用日期（可选）</span><input class="inp" type="date"></label>
      <div class="fld"><span>副奖励（可选，最多 2 条）</span>${U.btn('+ 添加副奖励', { tone: 'paper', size: 'sm', seed: 17 })}</div>
    </details>
    ${!t && vision ? `<button class="sched" data-act="sched">📷 拍一张课表 / 日程表，一次导入一批（走视觉档）</button><p class="p4-sched-err" data-schederr hidden></p>` : ''}
    <div class="sh-acts">${U.btn('取消', { tone: 'ink', seed: 18, attrs: 'data-x' })}${U.btn(t ? '保存' : '添加', { tone: 'red', seed: 19, attrs: 'data-ok', size: 'lg' })}</div>`,
    { onMount: (sh, close) => {
      const $ = (s) => sh.querySelector(s), title = $('[data-title]');
      const drawSteps = (fresh = []) => { const box = $('[data-steps]'); box.innerHTML = steps.map(stepRow).join(''); fresh.forEach((i) => { const el = box.children[i]; if (el && !P5.reduced()) el.animate([{ opacity: 0, transform: 'translateX(40px) rotate(3deg)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,.9,.2,1)', fill: 'backwards' }); }); };
      drawSteps();
      sh.addEventListener('input', (e) => { const r = e.target.closest('.p4-fstep'); if (r) steps[+r.dataset.i].t = e.target.value; if (e.target === title) title.classList.remove('p4-bad'); });
      $('[data-modes]').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || b.disabled) return; mode = b.dataset.m; sh.querySelectorAll('[data-modes] button').forEach((x) => x.setAttribute('aria-pressed', x === b)); $('.m-count').hidden = mode !== 'count'; $('.m-big').hidden = mode !== 'big'; });
      $('[data-attrs]').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; attr = b.dataset.a; sh.querySelectorAll('[data-attrs] button').forEach((x) => x.setAttribute('aria-pressed', x === b)); });
      $('[data-multi]').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); });
      const step = (sel, get, set, min, max) => { const s = $(sel), [mi, pl] = s.querySelectorAll('button'), v = s.querySelector('b'); mi.onclick = () => { set(Math.max(min, get() - 1)); v.textContent = get(); }; pl.onclick = () => { set(Math.min(max, get() + 1)); v.textContent = get(); }; };
      step('[data-cnt]', () => cnt, (x) => (cnt = x), 2, 99);
      step('[data-pts]', () => pts, (x) => { pts = x; $('[data-bighint]').textContent = `每完成一子步得主属性 +${pts}；全部完成触发收官奖励（SP + 触及属性各 +1）`; }, 1, 5);
      sh.querySelectorAll('.sw').forEach((w) => (w.onclick = () => w.classList.toggle('on')));
      const aiMsg = (m) => { const p = $('[data-aimsg]'); p.hidden = !m; p.textContent = m || ''; };
      sh.addEventListener('click', (e) => {
        const b = e.target.closest('[data-act]'); if (!b || b.disabled) return; const a = b.dataset.act;
        if (a === 'rmstep') { const r = b.closest('.p4-fstep'); steps.splice(+r.dataset.i, 1); drawSteps(); }
        if (a === 'addstep') { steps.push({ t: '', done: false }); drawSteps([steps.length - 1]); $('[data-steps]').lastElementChild?.querySelector('input')?.focus(); }
        if (a === 'ai') {
          if (!title.value.trim()) { title.classList.add('p4-bad'); shake($('[data-f="title"]')); title.focus(); return; }
          const s = b.querySelector('span'); s.textContent = '正在拆…'; b.disabled = true; b.classList.add('od-dis'); aiMsg('');
          const box = $('[data-steps]'); const th = document.createElement('div'); th.className = 'p4-ai-think'; th.innerHTML = '<span class="od-think-c" aria-hidden="true"><i></i><i></i><i></i></span><small>正在拆成够得着的小步…</small>'; box.after(th);
          setTimeout(() => {
            th.remove(); s.textContent = '✦ AI 帮我拆'; b.disabled = false; b.classList.remove('od-dis');
            if (ai === 'fail') { aiMsg('这次没拆出能用的小步。换个说法，或手写一条吧'); return; }
            const add = ai === 'offline' ? ['先列出要做的第一件小事'] : AI_STEPS;
            if (ai === 'offline') aiMsg('AI 未接通，先放了一条离线拆步——可改可删');
            add.forEach((x, k) => setTimeout(() => { steps.push({ t: x, done: false }); drawSteps([steps.length - 1]); }, P5.reduced() ? 0 : k * 260));
          }, P5.reduced() ? 0 : 1300);
        }
        if (a === 'sched') {
          b.disabled = true; b.textContent = '📷 正在读取课表…'; const er = $('[data-schederr]'); er.hidden = true;
          setTimeout(() => {
            b.disabled = false; b.textContent = '📷 拍一张课表 / 日程表，一次导入一批（走视觉档）';
            if (sched === 'none') { er.hidden = false; er.textContent = '这张图里没读出可导入的条目——换一张更清晰/更正的试试'; return; }
            if (sched === 'fail') { er.hidden = false; er.textContent = '解析失败，稍后再试'; return; }
            openScheduleImport({ onDone: () => { close(); } });
          }, P5.reduced() ? 0 : 1200);
        }
      });
      $('[data-x]').onclick = close;
      $('[data-ok]').onclick = () => {
        const v = title.value.trim();
        if (!v) { title.classList.add('p4-bad'); shake($('[data-f="title"]')); title.focus(); return; }
        close();
        onSaved && onSaved({ id: 't' + Date.now(), title: v, attribute: attr, points: pts, frequency: mode === 'count' ? 'count' : 'single', targetCount: mode === 'count' ? cnt : undefined, repeatDaily: true, count: 0, target: mode === 'count' ? cnt : 1 });
      };
      if (invalid) setTimeout(() => $('[data-ok]').click(), 400);
    } });
}

/** 课表导入 · 确认（真实 Todos.tsx SheetModal「课表导入 · 确认」） */
const SCHED = [{ title: '高等数学', weekdays: [1, 3], time: '08:00' }, { title: '大学英语', weekdays: [2, 4], time: '10:00' }, { title: '程序设计实验', weekdays: [5], time: '14:00' }, { title: '晨读 20 分钟', weekdays: [], time: '07:10' }, { title: '体育 · 羽毛球', weekdays: [3], time: '16:00' }];
export function openScheduleImport({ onDone } = {}) {
  const rows = SCHED.map((x) => ({ ...x, on: true })); let attr = 'knowledge';
  P5.sheet('课表导入 · 确认', `<p class="sh-p p4-sched-hint">带星期的条目会建成<b>按周重复</b>的任务，没有星期信息的建成<b>每日</b>任务；点数默认 +1，导入后可逐条编辑。</p>
    <div class="fld"><span>统一归入：</span><div class="seg" data-attr>${P5.ATTR_ORDER.map((id) => `<button aria-pressed="${id === attr}" data-a="${id}">${P5.ATTR[id].name}</button>`).join('')}</div></div>
    <div class="p4-sched-list" data-list></div>
    <div class="sh-acts">${U.btn('取消', { tone: 'ink', seed: 25, attrs: 'data-x' })}${U.btn('', { tone: 'red', size: 'lg', seed: 26, attrs: 'data-ok' })}</div>`, { seed: 39, onMount: (sh, close) => {
    const list = sh.querySelector('[data-list]'), ok = sh.querySelector('[data-ok]');
    const draw = () => {
      list.innerHTML = rows.map((r, i) => `<button class="p4-sched-row ${r.on ? 'on' : ''}" data-i="${i}" aria-pressed="${r.on}"><i aria-hidden="true">✓</i><span><b>${r.title}</b><small>${r.weekdays.length ? r.weekdays.map((d) => WKC[d]).join(' ') : '每日'}${r.time ? ` · ${r.time}` : ''}</small></span></button>`).join('');
      const n = rows.filter((r) => r.on).length; ok.querySelector('span').textContent = `导入 ${n} 项`; ok.disabled = !n; ok.classList.toggle('od-dis', !n);
    };
    draw(); P5.panelIn(list.children, { from: 'right', stagger: .05, delay: .2 });
    list.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (!b) return; rows[+b.dataset.i].on = !rows[+b.dataset.i].on; draw(); });
    sh.querySelector('[data-attr]').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; attr = b.dataset.a; sh.querySelectorAll('[data-attr] button').forEach((x) => x.setAttribute('aria-pressed', x === b)); });
    sh.querySelector('[data-x]').onclick = close;
    ok.onclick = () => { const n = rows.filter((r) => r.on).length; if (!n) return; close(); P5.sfx('success'); onDone ? onDone(n) : P5.toast(`已导入 ${n} 项`); };
  } });
}
