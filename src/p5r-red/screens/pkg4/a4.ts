// @ts-nocheck —— 逐字迁移自 v3 原生 overlays/a.js（A 组）中 pkg4 名下的屏：成长总结 SummaryModal（生成 / 流式 / 归档 / 详情 / 追问 / 重新生成确认）、
// 图片灯箱 ImageLightbox、记录图片抽屉 ActivityImagesSheet、写一句鼓励 DanmakuCompose。类名 .oa-*，样式 = legacy/css/a.css。
// 改动：openConfirm → ConfirmDialog（kit P5Confirm）；openSummary 增加 { state }（busy=生成中 / noai=未配置 AI / none=无进行中）直达。
import { P5 } from './p5';
const R = () => P5.reduced();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const openConfirm = (o) => P5.confirmDlg(o);
  const stack = [];
  /** 全屏层：返回 { el, close, $, $$ }；Esc 只关最上层 */
  function layer(cls, html, { z = 840, onClose, escClose = true, fade = true } = {}) {
    const el = document.createElement('div');
    el.className = 'oa-layer ' + cls; el.style.zIndex = z; el.innerHTML = html;
    document.body.appendChild(el);
    let done = false;
    const api = { el, $: (s) => el.querySelector(s), $$: (s) => [...el.querySelectorAll(s)] };
    api.close = (instant) => {
      if (done) return; done = true;
      const i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1);
      onClose && onClose();
      if (instant || R()) { el.remove(); return; }
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'both' }).onfinish = () => el.remove();
    };
    api.escClose = escClose;
    stack.push(api);
    if (fade && !R()) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: 'backwards' });
    return api;
  }
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !stack.length) return;
    const top = stack[stack.length - 1]; if (top.escClose) top.close();
  });

  /** 三层粗糙壳（影 / 框 / 面），放在 position:relative 的元素里当底 */
  function rough(seed, { face = 'var(--red)', frame = '#111', sh = '#111', jag = 4, d = [3, 4], inset = 3 } = {}) {
    const q = P5.shape.quad;
    return `<i class="oa-r" aria-hidden="true"><i style="background:${sh};clip-path:${q(seed + 11, jag)};transform:translate(${d[0]}px,${d[1]}px)"></i><i style="background:${frame};clip-path:${q(seed, jag)}"></i><i style="background:${face};clip-path:${q(seed + 5, jag)};inset:${inset}px"></i></i>`;
  }
  const starPts = (R0, inner) => P5.shape.starPts(50, 52, R0, -90, inner);
  function star(size, fill = 'var(--red)', { stroke = '', sw = 0, rot = 0, cls = '', style = '' } = {}) {
    return `<svg class="oa-star ${cls}" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true" style="transform:rotate(${rot}deg);${style}"><polygon points="${starPts(48)}" fill="${fill}" ${stroke ? `stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="miter"` : ''}/></svg>`;
  }
  /** 多环巨星（黑/纸/红/纸/黑） */
  const ringStar = (size, cls = '') => `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">${[[49, '#111'], [42, 'var(--p5r-paper)'], [34, 'var(--red)'], [24, 'var(--p5r-paper)'], [15, '#111']].map(([r, c]) => `<polygon points="${starPts(r)}" fill="${c}"/>`).join('')}</svg>`;
  /** 硬角 ✕ */
  const xg = (s = 17, c = '#111') => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><path d="M4.6 1.8 L12 9.2 L19.4 1.8 L22.2 4.6 L14.8 12 L22.2 19.4 L19.4 22.2 L12 14.8 L4.6 22.2 L1.8 19.4 L9.2 12 L1.8 4.6 Z" fill="${c}"/></svg>`;
  /** P5CloseKey：tile=纸片黑✕ · star=黑星纸✕ */
  function closeKey(variant = 'tile', cls = '', attrs = '') {
    if (variant === 'star') return `<button type="button" class="oa-xk star ${cls}" aria-label="关闭" ${attrs}><svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="${starPts(49)}" fill="var(--p5r-paper)"/><polygon points="${starPts(43)}" fill="#111"/></svg><span>${xg(18, 'var(--p5r-paper)')}</span></button>`;
    return `<button type="button" class="oa-xk tile ${cls}" aria-label="关闭" ${attrs}>${rough(471, { face: 'var(--p5r-paper)', frame: 'var(--p5r-paper)', jag: 4 })}<span class="oa-xk-in">${xg(17)}</span></button>`;
  }
  /** P5CollageTitle：逐字瓷砖标题（纸红 / 纸黑 / 红白 / 黑白 / 灰黑 循环） */
  const CYC = [['var(--p5r-paper)', 'var(--red)'], ['var(--p5r-paper)', '#111'], ['var(--red)', '#fbf7ef'], ['#111', '#fbf7ef'], ['#9b9791', '#111']];
  const TROT = [-3.5, 2.4, -2, 3, -2.8, 1.8, -3.2, 2.6], TDY = [0, 6, 2, 7, 3, 5, 1, 6];
  function collage(text, size = 40, cls = '') {
    let k = 0;
    return `<span class="oa-collage ${cls}" role="img" aria-label="${esc(text)}" style="--s:${size}px">` + [...text].map((ch) => {
      if (/[\s·、，。：；（）()「」【】…—-]/.test(ch)) return `<i class="oa-cp">${ch === ' ' ? '&nbsp;' : ch}</i>`;
      const [bg, fg] = CYC[k % 5]; const t = `<b class="oa-ct" data-r="${TROT[k % 8]}" style="background:${bg};color:${fg};transform:rotate(${TROT[k % 8]}deg);margin-top:${TDY[k % 8]}px">${ch}</b>`; k++; return t;
    }).join('') + '</span>';
  }
  /** 瓷砖砸落（scale 1.5→1、rotate ×3→1，spring 520/26 近似，间隔 45ms） */
  function slam(els, gap = 45, delay = 0) {
    if (R()) return;
    [...els].forEach((el, i) => {
      const r = +(el.dataset.r || 0);
      el.animate([{ transform: `rotate(${r * 3}deg) scale(1.5)`, opacity: 0 }, { transform: `rotate(${r}deg) scale(1)`, opacity: 1 }], { duration: 360, delay: delay + i * gap, easing: 'cubic-bezier(.2,1.5,.4,1)', fill: 'backwards' });
    });
  }
  /** 撕边/四角错动 壳快捷 */
  const shp = (tag, o, inner) => P5.ui.shp(tag, o, inner);
  const btn = (label, o = {}) => P5.ui.btn(label, o);

  /* 假图片（矢量风景，data URI；不引用外部素材） */
  const PAL = [['#D7000F', '#8E0010', '#F2E9DA'], ['#1d3557', '#e63946', '#f1faee'], ['#2b2d42', '#ef233c', '#edf2f4'], ['#3d0c11', '#d4a373', '#fefae0'], ['#003049', '#f77f00', '#fcbf49']];
  function fakeImg(i, w = 800, h = 600) {
    const [a, b, c] = PAL[i % PAL.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><circle cx="${w * (.25 + (i % 3) * .2)}" cy="${h * .32}" r="${h * .13}" fill="${c}"/><polygon points="0,${h} ${w * .3},${h * .5} ${w * .55},${h * .78} ${w * .78},${h * .42} ${w},${h * .7} ${w},${h}" fill="#111" opacity=".82"/><polygon points="0,${h} ${w * .2},${h * .72} ${w * .5},${h} " fill="${b}"/><text x="24" y="${h - 24}" font-family="sans-serif" font-weight="900" font-size="${h * .06}" fill="${c}">IMG ${i + 1}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* ═════════════════════════════════════════════════════════════════
     ═════════════════════════════════════════════════════════════════ */

  /* ═════════════════════════════════════════════════════════════════
     8 · 成长总结 SummaryModal（生成 / 流式结果 / 归档 / 单条查看 / 追问 / 年度信）
     ═════════════════════════════════════════════════════════════════ */
  const FAM = [['elizabeth', '🦋', '蓝蝶'], ['theodore', '🌿', '青侍'], ['margaret', '📖', '典藏'], ['caroline-justine', '⚔️', '双子审官']];
  const OTHER = [['igor', '馆长'], ['navi', '助手'], ['custom', '自定义']];
  const LETTER = `客人，这一周你把「知识」推高了 9 点——图书馆那三个小时是最扎实的一块砖。\n\n「胆量」只动了 2 点。晨跑断了两天，但你在社团面试里站了出来，这比跑步更难。\n\n下周的建议：把吉他练习从 30 分钟拆成两个 15 分钟；给「魅力」留一格，哪怕只是主动和一个人打招呼。\n\n——我在天鹅绒房间等你的下一页。`;
  function openSummary({ view: v0 = 'generate', state = '' } = {}) {
    const S = { view: v0, period: 'week', off: 0, preset: 'elizabeth', auto: true, special: false, job: null, archive: [
      { id: 's1', kind: 'week', label: '10月第2周 总结', pts: 21, n: 14, fu: 1, auto: true, unread: true, preset: '蓝蝶', range: '2026-10-05 ~ 2026-10-11' },
      { id: 's2', kind: 'month', label: '2026年9月 总结', pts: 86, n: 52, fu: 0, auto: false, unread: false, preset: '馆长', range: '2026-09-01 ~ 2026-09-30' },
      { id: 's3', kind: 'year', label: '2025年 年度总结', pts: 812, n: 433, fu: 2, auto: false, unread: false, preset: '典藏', range: '2025-01-01 ~ 2025-12-31' } ], sel: null, confirmDel: null, fu: [], noKey: false };
    const L = layer('oa-sum', `<div class="oa-sum-card" role="dialog" aria-modal="true" aria-label="成长总结">${rough(601, { face: 'var(--p5r-paper)', frame: '#111', jag: 7, d: [6, 7] })}<div class="oa-sum-hd"></div><div class="oa-sum-body"></div><div class="oa-sum-ft"></div></div>`, { z: 870 });
    const hd = L.$('.oa-sum-hd'), bd = L.$('.oa-sum-body'), ft = L.$('.oa-sum-ft');
    let stream = 0;
    const range = () => { const d = new Date(); if (S.period === 'week') { const s = new Date(d - (d.getDay() + 6) % 7 * 864e5 + S.off * 7 * 864e5), e = new Date(+s + 6 * 864e5), f = (x) => `${x.getMonth() + 1}/${x.getDate()}`; return `${s.getFullYear()}年 ${f(s)} ~ ${f(e)}`; } const m = new Date(d.getFullYear(), d.getMonth() + S.off, 1); return `${m.getFullYear()}年${m.getMonth() + 1}月`; };
    const titleOf = () => S.view === 'generate' ? '生成成长总结' : S.view === 'archive' ? '历史总结归档' : S.view === 'view' ? (S.sel ? S.sel.label : '总结详情') : !S.job ? '总结预览' : S.job.status === 'preparing' ? '正在整理简报…' : S.job.status === 'streaming' ? '✨ AI 正在书写…' : S.job.status === 'error' ? '生成失败' : `${S.job.label} · 草稿`;
    const stats = (a, b, c) => `<div class="oa-sum-stats">${[['总加点', a], ['记录数', b], ['风格', c]].map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>`;
    const sw = (on, k) => `<button class="oa-sw ${on ? 'on' : ''}" role="switch" aria-checked="${on}" data-tog="${k}"><i></i></button>`;
    const followUps = () => `<div class="oa-fu">${S.fu.map((q, i) => `<div class="oa-fu-q"><small>追问 ${i + 1}</small>${esc(q.q)}</div><div class="oa-fu-a">${esc(q.a)}</div>`).join('')}
        ${S.fu.length < 3 ? `<p class="oa-fu-h">${S.fu.length === 0 ? '还有疑问？可以追问' : `还可以追问 ${3 - S.fu.length} 次`}</p>${S.fu.length === 0 ? '<button class="oa-fu-sug" data-sug>回答对方的问题：下周你最想先动哪一项？</button>' : ''}
        <div class="oa-fu-in"><input class="inp" placeholder="${S.fu.length === 0 ? '回答上面的问题，或者问点别的' : '例如：如何具体提升知识属性？'}">${btn('发送', { seed: 71, size: 'sm', attrs: 'data-ask' })}</div>` : '<p class="oa-fu-h">追问机会已用完。</p>'}</div>`;
    const render = () => {
      hd.innerHTML = `<div class="oa-sum-tt">${P5.ui.plate(esc(titleOf()), { fs: 19 })}<p>${S.view === 'generate' ? '由 AI 分析你的成长记录，生成一封给你的信' : S.job && S.view === 'result' && S.job.status !== 'done' ? '关掉也没关系，它会在后台写完，回来就能看。' : ''}</p></div>
        <div class="oa-sum-hb">${S.view !== 'archive' ? `<button class="oa-chip" data-v="archive">归档</button>` : `<button class="oa-chip" data-v="generate">‹ 返回</button>`}<button class="oa-sum-x" data-x aria-label="关闭">${xg(14, 'var(--p5r-paper)')}</button></div>`;
      let b = '', f = '';
      if (S.view === 'generate') {
        b = `${S.noKey ? '<div class="oa-warn"><b>未配置 AI API</b><p>请前往「设置 → AI 服务」配置 API 密钥后再使用此功能</p></div>' : ''}
          ${S.archive.some((a) => a.unread) ? `<button class="oa-fresh" data-open="s1"><span>${star(22, 'var(--red)', { stroke: '#111', sw: 6 })}</span><span><b>「10月第2周 总结」写好了</b><small>按你的设置在后台写好的，还没看过</small></span><em>查看 ›</em></button>` : ''}
          <button class="oa-annual ${S.annual ? 'on' : ''}" data-annual><b>2025年 年度总结 ${S.annual ? '<i class="tag">已选</i>' : ''}</b><small>成功的更生 — 回顾去年全部成长历程</small><small class="oa-annual-w">2026/1/2 写过一份，再生成会另存一份 <u data-open="s3">查看 ›</u></small></button>
          <div class="oa-sum-k">选择时间范围</div>
          <div class="oa-per"><div class="seg">${['week', 'month'].map((p) => `<button aria-pressed="${S.period === p}" data-per="${p}">${p === 'week' ? '周总结' : '月总结'}</button>`).join('')}</div>
            <div class="oa-per-nav"><button data-off="-1" aria-label="上一期">‹</button><b>${range()}</b><button data-off="1" aria-label="下一期" ${S.off >= 0 ? 'disabled' : ''}>›</button></div></div>
          <div class="oa-sum-k">当前风格</div>
          <div class="oa-styles"><div class="oa-fam">${FAM.map(([id, e, n]) => `<button class="${S.preset === id ? 'on' : ''}" data-pre="${id}" aria-label="${n}" title="${n}">${e}</button>`).join('')}<span>${(FAM.find((x) => x[0] === S.preset) || [])[2] || ''}</span></div>
            <div class="oa-oth">${OTHER.map(([id, n]) => `<button class="${S.preset === id ? 'on' : ''}" data-pre="${id}">${n}${S.preset === id ? ' ✓' : ''}</button>`).join('')}</div>
            <p class="oa-fine l">点击切换；在设置「AI 总结」里可新增 / 编辑自定义风格</p></div>
          <div class="oa-sum-opt"><div><span class="oa-sum-k">自动撰写</span><b>自动撰写上一期总结</b><p>新的一周、一个月第一次打开时，上一期还没写就在后台写好，写完提醒你一次。用当前选的风格。</p></div>${sw(S.auto, 'auto')}</div>
          <div class="oa-sum-opt"><div><span class="oa-sum-k">统计口径</span><b>同时统计"特殊条目"</b><p>包括：逆影战场击破、本周目标、逆流、升级 / 成就 / 技能解锁 等。同伴（带"同伴"标签的条目）始终会被统计。</p></div>${sw(S.special, 'special')}</div>
          <button class="oa-link" data-nokey>（demo）切换「未配置 API」状态</button>`;
        f = btn(`${(FAM.find((x) => x[0] === S.preset) || ['', '✦'])[1]} 生成总结`, { seed: 73, size: 'lg', attrs: 'data-gen' + (S.noKey ? ' disabled' : ''), cls: 'oa-wide' + (S.noKey ? ' oa-dis' : '') });
      } else if (S.view === 'result') {
        const j = S.job;
        if (!j) b = '<div class="oa-empty-s">没有正在进行的总结。</div>';
        else if (j.status === 'preparing') b = `<div class="oa-prep"><div class="oa-spin sm">${star(46, 'var(--red)', { stroke: '#111', sw: 6 })}</div><p>正在整理这一期的简报…</p></div>`;
        else b = `${stats(`+${21}`, 14, j.preset)}<div class="oa-sum-meta"><button class="oa-chip" data-replay>✦ 重温开场</button>${j.status === 'streaming' ? '<span class="oa-live">正在读你的记录 <i class="oa-dots"><i>.</i><i>.</i><i>.</i></i></span>' : ''}</div>
            <article class="oa-letter">${esc(j.text).replace(/\n/g, '<br>')}${j.status === 'streaming' ? '<i class="oa-caret"></i>' : ''}</article>
            ${j.status === 'error' ? '<div class="oa-err" role="alert">网络请求失败：无法连接到 API 服务。<div class="oa-row">' + btn('取消', { tone: 'paper', seed: 75, size: 'sm', attrs: 'data-v="generate"' }) + btn('重试', { seed: 76, size: 'sm', attrs: 'data-gen' }) + '</div></div>' : ''}
            ${j.status === 'truncated' ? `<div class="oa-warn"><p>这封信写到一半断了（输出被截断或连接中途断开）。可以让它从断处接着写。</p>${btn('接着写', { tone: 'ink', seed: 77, size: 'sm', attrs: 'data-cont' })}</div>` : ''}
            ${j.status === 'done' ? followUps() : ''}`;
        if (j) f = j.status === 'streaming' || j.status === 'preparing' ? btn('停止', { tone: 'paper', seed: 78, attrs: 'data-stop' }) + btn('生成中…', { seed: 79, attrs: 'disabled', cls: 'oa-dis' })
          : btn('重新生成', { tone: 'paper', seed: 78, attrs: 'data-regen' }) + btn('归档保存', { seed: 79, attrs: 'data-save' });
        f += `<button class="oa-link" data-trunc>（demo）模拟中途断开</button>`;
      } else if (S.view === 'archive') {
        b = S.archive.length ? `<div class="oa-arc">${S.archive.map((a, i) => `<div class="oa-arc-row" style="--r:${i % 2 ? .5 : -.5}deg"><div class="oa-arc-m" data-open="${a.id}"><div class="oa-arc-t"><i class="tag ${a.kind === 'year' ? '' : 'ink'}">${a.kind === 'week' ? '周' : a.kind === 'year' ? '年' : '月'}</i><b>${a.label}</b>${a.auto ? '<i class="tag paper">自动</i>' : ''}${a.unread ? '<i class="oa-dot" aria-label="未读"></i>' : ''}</div><small><span>+${a.pts} 点</span><span>${a.n} 条记录</span>${a.fu ? `<span>追问 ${a.fu}</span>` : ''}</small></div>
            <div class="oa-arc-b"><button class="oa-chip" data-open="${a.id}">查看</button>${S.confirmDel === a.id ? `<button class="oa-chip red" data-delok="${a.id}">确认</button>` : `<button class="oa-chip ghost" data-del="${a.id}">删除</button>`}</div></div>`).join('')}</div>`
          : `<div class="oa-empty-s">${P5.sil('cat', { style: 'height:70px;width:auto' })}<b>暂无归档总结</b><small>生成的总结保存后将在此显示</small></div>`;
        f = btn('生成新总结', { seed: 80, size: 'lg', attrs: 'data-v="generate"', cls: 'oa-wide' });
      } else if (S.view === 'view' && S.sel) {
        const a = S.sel;
        b = `${a.kind === 'year' ? `<div class="oa-yl">✦ 2025 · 年度的信 ✦</div>` : ''}${stats(`+${a.pts}`, a.n, a.preset)}<p class="oa-fine l">${a.range} · 生成于 2026/10/12</p><div class="oa-sum-meta"><button class="oa-chip" data-replay>✦ 重温开场</button></div><article class="oa-letter">${esc(LETTER).replace(/\n/g, '<br>')}</article>${followUps()}`;
        f = btn(S.job ? '回到草稿' : '生成新总结', { seed: 81, size: 'lg', attrs: `data-v="${S.job ? 'result' : 'generate'}"`, cls: 'oa-wide' });
      }
      bd.innerHTML = b; ft.innerHTML = f; ft.hidden = !f;
      if (!R()) P5.panelIn(bd.children, { stagger: .03 });
    };
    const startGen = () => {
      clearInterval(stream); S.view = 'result'; S.job = { status: 'preparing', text: '', label: range(), preset: (FAM.find((x) => x[0] === S.preset) || OTHER.find((x) => x[0] === S.preset) || ['', '', ''])[2] || (OTHER.find((x) => x[0] === S.preset) || [])[1] }; S.fu = []; render();
      setTimeout(() => { if (!S.job || S.job.status !== 'preparing') return; S.job.status = 'streaming'; let k = 0; render();
        stream = setInterval(() => { k += 3; S.job.text = LETTER.slice(0, k); const art = bd.querySelector('.oa-letter'); if (art) art.innerHTML = esc(S.job.text).replace(/\n/g, '<br>') + '<i class="oa-caret"></i>'; if (k >= LETTER.length) { clearInterval(stream); S.job.status = 'done'; render(); } }, 40); }, 900);
    };
    const replay = () => { const v = document.createElement('div'); v.className = 'oa-replay'; v.innerHTML = `${P5.ui.ransom('YOUR WEEK', { h: 54, seed: 12 })}<p>${range()}</p>`; L.el.appendChild(v); slam(v.querySelectorAll('img'), 50); setTimeout(() => v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'both' }).onfinish = () => v.remove(), 1400); };
    L.el.addEventListener('click', (e) => {
      const t = e.target, g = (s) => t.closest(s);
      if (t === L.el || g('[data-x]')) { clearInterval(stream); return L.close(); }
      let n;
      if ((n = g('[data-v]'))) { S.view = n.dataset.v; S.confirmDel = null; return render(); }
      if ((n = g('[data-per]'))) { S.period = n.dataset.per; S.off = 0; return render(); }
      if ((n = g('[data-off]'))) { S.off = Math.min(0, S.off + +n.dataset.off); return render(); }
      if ((n = g('[data-pre]'))) { S.preset = n.dataset.pre; return render(); }
      if ((n = g('[data-tog]'))) { S[n.dataset.tog] = !S[n.dataset.tog]; return render(); }
      if ((n = g('[data-open]'))) { e.stopPropagation(); S.sel = S.archive.find((a) => a.id === n.dataset.open); if (S.sel) { S.sel.unread = false; S.view = 'view'; S.fu = S.sel.fu ? [{ q: '我该先补哪一项？', a: '先补「魅力」：它最低，也最容易从一句问候开始。' }] : []; } return render(); }
      if (g('[data-annual]')) { S.annual = !S.annual; return render(); }
      if (g('[data-nokey]')) { S.noKey = !S.noKey; return render(); }
      if (g('[data-gen]')) return startGen();
      if (g('[data-regen]')) return openConfirm({ title: '重新生成？', description: '这份草稿还没归档，重新生成会把它丢掉。', tone: 'danger', confirmText: '丢弃并重新生成', onConfirm: startGen });
      if (g('[data-stop]')) { clearInterval(stream); S.job.status = 'done'; return render(); }
      if (g('[data-trunc]')) { clearInterval(stream); if (!S.job) return; S.job.status = 'truncated'; return render(); }
      if (g('[data-cont]')) { S.job.status = 'done'; return render(); }
      if (g('[data-save]')) { P5.toast('保存中…'); setTimeout(() => { S.archive.unshift({ id: 's' + Date.now(), kind: S.period, label: S.job.label + ' 总结', pts: 21, n: 14, fu: S.fu.length, auto: false, unread: false, preset: S.job.preset, range: range() }); S.job = null; S.view = 'archive'; render(); P5.toast('已归档'); }, 500); return; }
      if (g('[data-replay]')) return replay();
      if ((n = g('[data-del]'))) { S.confirmDel = n.dataset.del; return render(); }
      if ((n = g('[data-delok]'))) { S.archive = S.archive.filter((a) => a.id !== n.dataset.delok); S.confirmDel = null; return render(); }
      if (g('[data-sug]')) { const i = bd.querySelector('.oa-fu-in input'); i.value = '下周你最想先动哪一项？'; i.focus(); return; }
      if (g('[data-ask]')) { const i = bd.querySelector('.oa-fu-in input'); if (!i.value.trim()) return; S.fu.push({ q: i.value, a: '我会先从最低的那一项下手：每天一件 5 分钟能做完的小事，连着做七天。' }); return render(); }
    });
    render();
    if (v0 === 'result' || state === 'busy') startGen();
    if (state === 'noai') { S.noKey = true; render(); }
    if (state === 'none') { S.view = 'result'; S.job = null; render(); }
    if (v0 === 'detail') { S.sel = S.archive[0]; S.view = 'view'; S.fu = [{ q: '我该先补哪一项？', a: '先补「魅力」：它最低，也最容易从一句问候开始。' }]; render(); }
    if (v0 === 'preview') { clearInterval(stream); S.view = 'result'; S.job = { status: 'done', text: LETTER, label: range(), preset: '蓝蝶' }; S.fu = []; render(); }
    if (state === 'regen') setTimeout(() => L.el.querySelector('[data-regen]')?.click(), 300);
  }
  function openLightbox({ images = [fakeImg(0), fakeImg(1), fakeImg(2)], index = 0, caption = null, onDelete = null } = {}) {
    let i = index, confirmDel = false, hint = null;
    const L = layer('oa-lb', `<div class="oa-stage dark">${P5.bgSVG({ seed: 71, wide: P5.isWide() })}</div>
      <div class="oa-lb-top"><button class="oa-lb-x" data-x aria-label="关闭">${xg(16, '#111')}</button><span class="oa-lb-no"></span><div class="oa-lb-acts"></div></div>
      <div class="oa-lb-stage" aria-label="查看图片"><div class="oa-lb-track"></div><button class="oa-lb-nav p" data-nav="-1" aria-label="上一张">‹</button><button class="oa-lb-nav n" data-nav="1" aria-label="下一张">›</button></div>
      <div class="oa-lb-bot"><p class="oa-lb-hint"></p><div class="oa-lb-dots"></div></div>`, { z: 900 });
    const track = L.$('.oa-lb-track');
    const draw = (anim = 0) => {
      track.innerHTML = `<div class="oa-lb-frame">${rough(700 + i, { face: '#111', frame: 'var(--p5r-paper)', sh: 'var(--red)', jag: 6, d: [6, 7] })}<img src="${images[i]}" alt="第 ${i + 1} 张"></div>`;
      L.$('.oa-lb-no').textContent = `${i + 1} / ${images.length}`;
      L.$('.oa-lb-acts').innerHTML = (onDelete !== false ? (confirmDel ? `<button class="oa-chip red" data-delok>确认删除</button>` : `<button class="oa-chip ghost" data-del>删除</button>`) : '') + `<button class="oa-chip" data-save>保存</button>`;
      L.$('.oa-lb-hint').textContent = hint ?? caption ?? (images.length > 1 ? '左右滑动切换 · 点空白处关闭' : '点空白处关闭');
      L.$('.oa-lb-dots').innerHTML = images.length > 1 ? images.map((_, k) => `<button aria-label="第 ${k + 1} 张" class="${k === i ? 'on' : ''}" data-dot="${k}"></button>`).join('') : '';
      L.$('[data-nav="-1"]').hidden = i === 0; L.$('[data-nav="1"]').hidden = i >= images.length - 1;
      if (anim && !R()) track.firstElementChild.animate([{ transform: `translateX(${anim * 60}px) rotate(${anim * 3}deg)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.2,.9,.2,1)' });
    };
    const to = (k) => { if (k < 0 || k >= images.length || k === i) return; const d = k > i ? 1 : -1; i = k; confirmDel = false; hint = null; draw(d); };
    L.el.addEventListener('click', (e) => {
      const t = e.target, g = (s) => t.closest(s); let n;
      if (g('[data-x]') || t.classList.contains('oa-lb-stage') || t.classList.contains('oa-lb-track')) return L.close();
      if ((n = g('[data-nav]'))) return to(i + +n.dataset.nav);
      if ((n = g('[data-dot]'))) return to(+n.dataset.dot);
      if (g('[data-del]')) { confirmDel = true; return draw(); }
      if (g('[data-delok]')) { images.splice(i, 1); onDelete && onDelete(i); if (!images.length) return L.close(); i = Math.min(i, images.length - 1); confirmDel = false; return draw(); }
      if (g('[data-save]')) { hint = '已保存到相册（demo）'; return draw(); }
    });
    let x0 = null;
    track.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
    track.addEventListener('pointerup', (e) => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 50) { e.stopPropagation(); to(i + (dx < 0 ? 1 : -1)); } });
    const kd = (e) => { if (!document.body.contains(L.el)) return document.removeEventListener('keydown', kd); if (e.key === 'ArrowLeft') to(i - 1); if (e.key === 'ArrowRight') to(i + 1); };
    document.addEventListener('keydown', kd);
    draw();
    return L;
  }
  function openActivityImages({ title = '记录图片', count = 2 } = {}) {
    const MAX = 3; let imgs = Array.from({ length: count }, (_, k) => fakeImg(k)), confirmId = null, hint = '', busy = false;
    P5.sheet(title, '<div class="oa-ai"></div>', {
      seed: 37,
      onMount: (sh) => {
        const root = sh.querySelector('.oa-ai');
        const draw = () => {
          const room = MAX - imgs.length;
          root.innerHTML = `<div class="oa-ai-grid">${imgs.map((src, k) => `<div class="oa-ai-cell" style="--r:${[-2, 1.5, -1][k % 3]}deg"><button class="oa-ai-th" data-view="${k}" aria-label="查看第 ${k + 1} 张"><img src="${src}" alt=""></button>
              ${confirmId === k ? `<div class="oa-ai-cf"><button class="oa-chip red" data-delok="${k}">删除</button><button class="oa-chip" data-delno>取消</button></div>` : `<button class="oa-ai-del" data-del="${k}" aria-label="删除这张图">${xg(11, 'var(--p5r-paper)')}</button>`}</div>`).join('')}
            ${room > 0 ? `<button class="oa-ai-add" data-add ${busy ? 'disabled' : ''}><b>+</b><span>${busy ? '处理中…' : `添加（还可 ${room} 张）`}</span></button>` : ''}</div>
            ${hint ? `<p class="oa-info">${hint}</p>` : ''}
            ${imgs.length ? '' : '<p class="oa-fine">这条记录还没有图片。</p>'}
            <p class="oa-fine">图片只存在本机，不上云，可在「账号与数据」单独导出图片包。</p>
            <input type="file" accept="image/*" multiple hidden>`;
        };
        root.addEventListener('click', (e) => {
          const g = (s) => e.target.closest(s); let n;
          if ((n = g('[data-view]'))) return openLightbox({ images: imgs.slice(), index: +n.dataset.view, onDelete: (k) => { imgs.splice(k, 1); draw(); } });
          if ((n = g('[data-del]'))) { confirmId = +n.dataset.del; return draw(); }
          if (g('[data-delno]')) { confirmId = null; return draw(); }
          if ((n = g('[data-delok]'))) { imgs.splice(+n.dataset.delok, 1); confirmId = null; hint = ''; return draw(); }
          if (g('[data-add]')) root.querySelector('input[type=file]').click();
        });
        root.addEventListener('change', (e) => {
          const files = [...e.target.files]; if (!files.length) return; const room = MAX - imgs.length, take = files.slice(0, room);
          busy = true; draw();
          Promise.all(take.map((f) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(f); }))).then((urls) => {
            imgs.push(...urls); busy = false; hint = files.length > take.length ? `每条记录最多 ${MAX} 张，多出的没有加` : !take.length ? '已经满了' : ''; draw();
          });
        });
        draw();
      },
    });
  }
  /* 13 · 弹幕 DanmakuCompose */
  const SEEDS = ['我也是这么过来的，加油', '第一步真是又难又轻松，加油啊', '希望我们都能更加勇敢', '慢一点也是在往前', '你不是一个人', '完成比完美重要', '一步一步看来吧', '彼此加油吧'];
  let tokens = 2;
  function openCompose() {
    const MAX = 20;
    const L = layer('oa-dm', `<div class="oa-dm-card" role="dialog" aria-modal="true">${rough(1001, { face: 'var(--p5r-paper)', frame: '#111', jag: 6, d: [6, 7] })}<div class="oa-dm-hd">${P5.ui.plate('写一句鼓励', { fs: 20 })}<button class="oa-sum-x" data-x aria-label="关闭">${xg(14, 'var(--p5r-paper)')}</button></div><div class="oa-dm-b"></div></div>`, { z: 905 });
    const b = L.$('.oa-dm-b'); let busy = false, text = '', err = '';
    const draw = (sent) => {
      if (sent) { b.innerHTML = `<div class="oa-dm-ok">${star(56, 'var(--red)', { stroke: '#111', sw: 6, rot: -10 })}<p><b>已送出。</b>过审后，它会出现在同样卡住的人面前。</p><p class="oa-fine">过审后下次打开时会告诉你。</p>${btn('好', { seed: 101, attrs: 'data-x', cls: 'oa-wide' })}</div>`; return; }
      const len = [...text].length, can = len > 0 && len <= MAX && !busy && tokens > 0;
      b.innerHTML = `<p class="oa-fine l">匿名发送弹幕鼓励一同努力的人，审核通过将会发出，慎言即可。还剩 ${tokens} 次机会。</p>
        <textarea class="inp oa-dm-ta" rows="3" maxlength="${MAX + 10}" placeholder="比如：我也熬过来了，你可以的">${esc(text)}</textarea>
        <div class="oa-dm-meta"><span class="${len > MAX ? 'over' : ''}">${len}/${MAX}</span>${err ? `<span class="oa-dm-err">${esc(err)}</span>` : ''}</div>
        ${btn(busy ? '送出中…' : '送出鼓励', { seed: 103, attrs: 'data-send' + (can ? '' : ' disabled'), cls: 'oa-wide' + (can ? '' : ' oa-dis') })}`;
      const ta = b.querySelector('textarea'); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    };
    L.el.addEventListener('input', (e) => { if (e.target.tagName !== 'TEXTAREA') return; text = e.target.value; const len = [...text].length, m = b.querySelector('.oa-dm-meta span'); m.textContent = `${len}/${MAX}`; m.classList.toggle('over', len > MAX); const ok = len > 0 && len <= MAX && tokens > 0, s = b.querySelector('[data-send]'); s.disabled = !ok; s.classList.toggle('oa-dis', !ok); });
    L.el.addEventListener('click', (e) => {
      if (busy) return;
      if (e.target === L.el || e.target.closest('[data-x]')) return L.close();
      if (e.target.closest('[data-send]')) { if (tokens <= 0) { err = '暂时没有鼓励机会了'; return draw(); } busy = true; draw(); setTimeout(() => { busy = false; tokens--; draw(true); }, 700); }
    });
    if (tokens <= 0) err = '还要等 3 天才能再发一条——留点时间给上一句';
    draw();
  }
export const OA4: any = { openSummary, openLightbox, openActivityImages, openCompose, fakeImg, layer, rough, star, xg, collage, slam };
