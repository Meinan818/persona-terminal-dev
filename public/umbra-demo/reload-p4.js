/* MASKARIA · P4G 午夜电视台主题装饰层（reload-p4.js）· 第二轮
 * 只在 data-theme=p4 时运行。手段（按 RELOAD-BRIEF 第二轮放宽规则）：
 *   - 插入 aria-hidden + pointer-events:none 的装饰节点（日历、雪花、跑马灯、天气图、Shuffle 卡、片尾字幕……）
 *   - 给已有节点加 class / data-ui-* / style 自定义属性（--v、--dial 等），只读取文本，不改文本
 * 不拦截点击、不移动/删除/克隆带 data-* 钩子的节点；reduced-motion 时不做闪屏/分镜；手机降级；页面隐藏时暂停。 */
(function () {
  'use strict';
  var root = document.documentElement;
  if (root.dataset.theme !== 'p4') return;
  var reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var mobile = function () { return innerWidth < 820 || document.body.classList.contains('sh-m'); };

  function deco(tag, cls, html) {
    var n = document.createElement(tag);
    n.className = cls;
    n.setAttribute('aria-hidden', 'true');
    n.style.pointerEvents = 'none';
    if (html) n.innerHTML = html;
    return n;
  }
  function once(parent, cls, tag, html, where) {
    if (!parent || parent.querySelector(':scope > .' + cls.split(' ')[0])) return null;
    var n = deco(tag || 'div', cls, html);
    if (where === 'first') parent.insertBefore(n, parent.firstChild); else parent.appendChild(n);
    return n;
  }
  function txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }
  var MASK_SVG = '<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M8 22c6-12 38-12 44 0-2 14-10 26-22 30C18 48 10 36 8 22Z"/><path class="eye" d="M17 27l9 3-9 3ZM43 27l-9 3 9 3Z"/></svg>';
  function tarotCard(numeral, en, cn, sub) {
    return '<div class="p4-card"><span class="no">' + numeral + '</span>' + MASK_SVG + '<b>' + en + '</b><em>' + cn + '</em>' + (sub ? '<small>' + sub.replace(/[<>&]/g, '') + '</small>' : '') + '</div>';
  }
  function num(s) { var m = String(s).replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : 0; }

  /* ---------- 天气 / 日历 ---------- */
  var ICON = {
    rain: '<svg viewBox="0 0 32 32"><path d="M9 20h15a6 6 0 0 0 0-12 8 8 0 0 0-15 2 5 5 0 0 0 0 10Z" fill="currentColor"/><path d="M11 24l-2 5M17 24l-2 5M23 24l-2 5" stroke="#1f5bd8" stroke-width="2.6" stroke-linecap="round"/></svg>',
    fog: '<svg viewBox="0 0 32 32"><path d="M4 11h20M8 16h22M3 21h21M9 26h16" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
    cloud: '<svg viewBox="0 0 32 32"><path d="M8 24h16a6 6 0 0 0 0-12 8 8 0 0 0-15 2 5 5 0 0 0-1 10Z" fill="currentColor"/></svg>',
    sun: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="6.5" fill="#e8203a"/><path d="M16 2v5M16 25v5M2 16h5M25 16h5M6 6l3.5 3.5M22.5 22.5 26 26M26 6l-3.5 3.5M9.5 22.5 6 26" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>'
  };
  var WEATHER = [['rain', '雨'], ['fog', '雾'], ['rain', '雨'], ['cloud', '阴'], ['sun', '晴'], ['rain', '雨'], ['fog', '雾']];
  var DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  var DAYS_CN = ['日', '月', '火', '水', '木', '金', '土'];
  function slot(h) {
    if (h < 5) return ['MIDNIGHT', '深夜']; if (h < 8) return ['EARLY MORNING', '清晨']; if (h < 12) return ['MORNING', '早上'];
    if (h < 15) return ['DAYTIME', '白天']; if (h < 18) return ['AFTER SCHOOL', '放学后']; if (h < 23) return ['EVENING', '晚上']; return ['MIDNIGHT', '深夜'];
  }
  function weatherAt(offset) {
    var d = new Date(); d.setDate(d.getDate() + (offset || 0));
    return WEATHER[(d.getFullYear() * 400 + (d.getMonth() + 1) * 31 + d.getDate()) % WEATHER.length];
  }
  function calHtml() {
    var d = new Date(), w = weatherAt(0), s = slot(d.getHours()), dow = d.getDay();
    return '<span class="d">' + (d.getMonth() + 1) + '<small>/</small>' + String(d.getDate()).padStart(2, '0') + '</span>' +
      '<span class="w"><b class="' + (dow === 0 ? 'sun' : dow === 6 ? 'sat' : '') + '">' + DAYS[dow] + '</b>' + DAYS_CN[dow] + '</span>' +
      '<span class="t">' + ICON[w[0]] + s[1] + '·' + w[1] + '<i>' + s[0] + '</i></span>';
  }
  function tearOffHtml() {
    var d = new Date(), w = weatherAt(0), dow = d.getDay();
    var mon = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][d.getMonth()];
    return '<i class="rings"></i><b class="mo">' + (d.getMonth() + 1) + '月 · ' + mon + '</b><b class="dd">' + d.getDate() + '</b>' +
      '<b class="dw ' + (dow === 0 ? 'sun' : dow === 6 ? 'sat' : '') + '">' + DAYS[dow] + ' · ' + DAYS_CN[dow] + '曜日</b><span class="wx">' + ICON[w[0]] + '<em>' + w[1] + '</em></span><i class="torn"></i>';
  }

  /* ---------- 页面级装饰（每次 #content 重绘后执行） ---------- */
  function decorate() {
    var c = document.getElementById('content');
    if (!c) return;

    /* 战斗首页：雨夜 + 0:00 午夜电视台 */
    var hero = c.querySelector('.home-grid .hero-stage');
    if (hero) {
      once(hero, 'p4-rain', 'div', '<i></i>');
      once(hero, 'p4-midnight', 'div', '<b>0:00</b><small>雨夜 · 午夜零点</small>');
      var mName = (txt(c.querySelector('.mission .mini-prep b')) || '').split(/\s/)[0];
      once(hero, 'p4-herocard', 'div', tarotCard('0', 'THE FOOL', '愚者', mName));
    }

    /* 据点：Junes 电视墙 */
    var base = c.querySelector('.night-base');
    if (base) {
      base.dataset.uiP4 = 'tvwall';
      once(base, 'p4-junes', 'div', '<b>Junes</b><span>家电卖场 · 电视墙</span><em>Every Day\'s Great at Junes!</em>', 'first');
      var st = base.querySelector('.night-base-stats');
      var list = base.querySelector('.tower-strata-list');
      if (list) {
        var btns = [].slice.call(list.querySelectorAll('button'));
        var idx = Math.max(0, btns.findIndex(function (b) { return b.classList.contains('active'); }));
        list.style.setProperty('--dial', idx);
        list.style.setProperty('--n', btns.length || 3);
        once(list, 'p4-knob', 'div', '<i></i><b></b><span>CH</span>', 'first');
      }
      var aw = base.querySelector('.night-base-awaken');
      if (aw) once(aw, 'p4-ticker', 'div', '<span>' + Array(4).join('緊急速報 ── 面具在等你回应 ── EMERGENCY BROADCAST ── 今晚零点，午夜电视台 ── ') + '</span>', 'first');
      [].forEach.call(base.querySelectorAll('.night-base-card'), function (card, i) {
        card.dataset.uiTv = String((i % 5) + 1);
      });
      var gate = base.querySelector('.night-base-gate');
      if (gate) once(gate, 'p4-gatefx', 'div', '<i></i><i></i><i></i><b>' + (gate.classList.contains('is-open') ? 'ENTER THE TV' : 'PLEASE STAND BY') + '</b>');
      var npcs = base.querySelector('.night-npcs');
      if (npcs) once(npcs, 'p4-credits-h', 'div', '<b>CAST</b><span>出演</span>', 'first');
    }

    /* 地图：电视里的迷宫 —— 跑马灯 + 当前格子标记 */
    var hud = c.querySelector('.map-hud');
    if (hud && !c.querySelector('.p4-ticker-map')) {
      var region = txt(c.querySelector('.map-region'));
      var bits = [].map.call(hud.querySelectorAll('span'), function (s) { return txt(s); }).join(' ／ ');
      var t = deco('div', 'p4-ticker p4-ticker-map', '<span>' + ('▶ 午夜电视台现场 ── ' + region + ' ── ' + bits + ' ── ').repeat(3) + '</span>');
      hud.parentNode.insertBefore(t, hud.nextSibling);
    }
    var board = c.querySelector('.map-board');
    void board;

    /* Persona：属性条 */
    [].forEach.call(c.querySelectorAll('.persona-stats span, .stat-line span'), function (s) {
      var v = num(txt(s.querySelector('b')));
      var max = s.closest('.persona-stats') ? (/HP|SP/.test(s.textContent) ? 120 : 40) : 20;
      s.style.setProperty('--v', Math.min(1, v / max).toFixed(3));
    });
    var tabs = c.querySelector('.mask-tabs');
    if (tabs) { var n = tabs.children.length; [].forEach.call(tabs.children, function (b, i) { b.style.setProperty('--i', i - (n - 1) / 2); }); }

    /* 结算：Shuffle Time */
    var mark = c.querySelector('.victory .result-mark, .result-mark');
    if (mark) once(mark.parentNode, 'p4-shuffle', 'div', '<i style="--k:0"></i><i style="--k:1"></i><i style="--k:2"></i><i style="--k:3"></i><b>SHUFFLE TIME</b>', 'first');

    /* 装备：人台 */
    var slots = c.querySelector('.gear-slots');
    if (slots) once(slots, 'p4-mannequin', 'div', tarotCard('VII', 'THE CHARIOT', '战车', 'DRESS UP'), 'first');

    /* 背包：Junes 收据 */
    var inv = c.querySelector('.inventory-list');
    if (inv) {
      var d = new Date();
      once(inv, 'p4-rc-head', 'div', '<b>Junes</b><span>八十稻羽店 · 夜间收据</span><em>' + d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate() + ' 00:00 · REG 04</em>', 'first');
      once(inv, 'p4-rc-foot', 'div', '<span>ITEMS ' + inv.querySelectorAll('article').length + '</span><i></i><em>THANK YOU · 欢迎再次光临</em>');
    }

    /* AI LAB 白昼：天气预报 */
    var aside = c.querySelector('.slice-day .slice-aside');
    if (aside) {
      var fc = [0, 1, 2, 3].map(function (o) { var w = weatherAt(o), dd = new Date(); dd.setDate(dd.getDate() + o); return '<li><b>' + (o ? DAYS_CN[dd.getDay()] : '今') + '</b>' + ICON[w[0]] + '<em>' + w[1] + '</em></li>'; }).join('');
      once(aside, 'p4-weather', 'div', '<b class="ttl">八十稻羽 · 天气预报</b><svg class="mp" viewBox="0 0 200 110"><path d="M20 70c10-30 40-50 70-46s40 22 62 18 30 8 30 22-20 30-52 30-48-6-70-4-46-6-40-20Z"/><circle cx="96" cy="58" r="5"/></svg><ol>' + fc + '</ol><small>雨夜之后会起雾。</small>', 'first');
    }
    /* AI LAB 夜层 / 区层显形：调台 */
    var rev = c.querySelector('.reveal-layout');
    if (rev) once(rev, 'p4-tuner', 'div', '<i class="band"></i><i class="needle"></i><b>TUNING</b><span>88 · 92 · 96 · 100 · 104 · 108</span>', 'first');
    /* 回望 / 终局：片尾字幕 */
    var fin = c.querySelector('.finale-layout, .recap-ascent');
    if (fin) once(fin, 'p4-credits', 'div', '<span>MASKARIA<br><small>MIDNIGHT CHANNEL</small><br><br>出演<br>你<br>同行的面具们<br><br>导航<br>后台导航员<br><br>THANK YOU FOR WATCHING<br>— 完 —</span>');
    var sc = c.querySelector('[data-tower-scene],[data-scene]');
    if (sc) {
      var key = sc.dataset.towerScene || sc.dataset.scene;
      if (/^(safe|interlude)$/.test(key) || sc.querySelector('.safehouse-layout')) { var sb = once(sc, 'p4-standby', 'div', '<b>WE\'LL BE RIGHT BACK</b><span>节目暂停 · 稍后回来</span>'); var hd = sc.querySelector(':scope > .scene-heading'); if (sb && hd) hd.insertAdjacentElement('afterend', sb); }
    }
  }


  /* ================= 战斗攻击 / 命中特效（午夜电视台 FX） =================
   * 只读信号：
   *   1) window 捕获阶段的 click（只读，不 preventDefault）：在 [data-action=execute] / [data-switch-mask] /
   *      [data-battle-item] / [data-holdup-engine=allOut] 被点下时，记录当前 aria-pressed 的行动键
   *      （data-battle-action，如 basic: / gun: / skill:Agi）、其 <small> 里的属性文字（“火焰 · 敌方”）、
   *      选中目标 data-target-id、Persona 名与行动者名。
   *   2) MutationObserver(body) 发现 combat-motion 插入的 .battle-impact[data-impact]
   *      （slash / star=弱点 / critical=暴击·TECHNICAL·SHOWTIME / insight=无效或洞察 / guard / player-hit /
   *      heal / buff / one-more / allout），读取 .damage-number 文字和 --hit-x/--hit-y。
   *   3) 每次 #content 重绘后比较 .enemy-targets [data-target-id] 的 .down 状态：存活→倒下 = 电视关机。
   * 全部效果插在 body 末尾的 .p4-fx 层（aria-hidden、pointer-events:none），≤900ms 自删；
   * reduced-motion 时整套不运行（保留原 .battle-impact）；手机 / 低帧率减量。 */
  var FX = (function () {
    var ELS = { '物理': 'phys', '枪击': 'gun', '火焰': 'fire', '冰冻': 'ice', '电击': 'elec', '疾风': 'wind', '念动': 'psy', '核热': 'nuke', '祝福': 'bless', '咒怨': 'curse', '万能': 'almighty', '恢复': 'heal', '辅助': 'support', '异常': 'ailment' };
    var TAG = { phys: 'SLASH', gun: 'GUN', fire: 'AGI', ice: 'BUFU', elec: 'ZIO', wind: 'GARU', psy: 'PSI', nuke: 'FREI', bless: 'HAMA', curse: 'MUDO', almighty: 'MEGIDO', heal: 'DIA', support: 'BUFF', ailment: 'STATUS' };
    var ARCANA = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
    var layer = null, last = null, alive = {}, inBattle = false, timers = [];
    function enabled() { return !reduced.matches; }
    function lite() { return mobile() || document.body.classList.contains('p4-static'); }
    function k() { var s = parseFloat(getComputedStyle(root).getPropertyValue('--sh-s')) || 1; return mobile() ? s * 0.66 : Math.max(.6, s); }
    function rectOf(el) { if (!el) return null; var r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 ? r : null; }
    function mid(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
    function firstText(el) { if (!el) return ''; for (var i = 0; i < el.childNodes.length; i++) { var n = el.childNodes[i]; if (n.nodeType === 3 && n.textContent.trim()) return n.textContent.trim(); } return txt(el); }
    function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
    function hash(s) { var h = 0; s = String(s || ''); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

    function ensureLayer() {
      if (layer && layer.isConnected) return layer;
      layer = deco('div', 'p4-fx');
      document.body.appendChild(layer);
      return layer;
    }
    /* 一个以 (x,y) 为原点、按舞台比例缩放的效果容器 */
    function spot(cls, x, y, html, life, scaleMul) {
      var n = deco('div', 'p4-f ' + cls, html);
      n.style.left = Math.round(x) + 'px';
      n.style.top = Math.round(y) + 'px';
      n.style.setProperty('--k', (k() * (scaleMul || 1)).toFixed(3));
      ensureLayer().appendChild(n);
      later(function () { n.remove(); }, life || 880);
      return n;
    }
    function full(cls, html, life) {
      var n = deco('div', 'p4-ff ' + cls, html);
      n.style.setProperty('--k', k().toFixed(3));
      ensureLayer().appendChild(n);
      later(function () { n.remove(); }, life || 600);
      return n;
    }

    /* ---------- 读取出手意图（只读快照） ---------- */
    function snapshot(ev) {
      if (!enabled()) return;
      var t = ev.target && ev.target.closest ? ev.target.closest('button') : null;
      var st = document.querySelector('.sh-stage');
      if (!t || t.disabled || !st) return;
      var key = '', detail = '', label = '';
      if (t.matches('[data-action="execute"]')) {
        var p = st.querySelector('[data-battle-action][aria-pressed="true"]');
        if (!p) return;
        key = p.dataset.battleAction; detail = txt(p.querySelector('small')); label = firstText(p.querySelector('span'));
      } else if (t.dataset.switchMask) {
        key = 'switchMask:' + t.dataset.switchMask; detail = txt(t.querySelector('small')); label = firstText(t.querySelector('span'));
      } else if (t.dataset.battleItem) {
        key = 'item:' + t.dataset.battleItem; label = firstText(t.querySelector('span'));
      } else if (t.dataset.holdupEngine === 'allOut') {
        key = 'allOut:';
      } else return;
      var type = key.split(':')[0];
      var el = type === 'basic' ? 'phys' : type === 'gun' ? 'gun' : type === 'showtime' ? 'almighty'
        : type === 'skill' ? (ELS[detail.split('·')[0].trim()] || 'almighty') : null;
      var tgt = st.querySelector('.enemy-targets [data-target-id][aria-pressed="true"]');
      var personaEl = st.querySelector('.player-tag span');
      var actorEl = st.querySelector('.party-rail > span.active');
      last = {
        key: key, type: type, el: el, label: label, detail: detail,
        all: /全体敌人/.test(detail), target: tgt ? tgt.dataset.targetId : '',
        persona: firstText(personaEl) || label, actor: firstText(actorEl) || '你',
        actorRect: rectOf(actorEl), t: performance.now(), used: false
      };
    }
    function takeIntent() {
      if (last && !last.used && performance.now() - last.t < 700) { last.used = true; return last; }
      return null;
    }

    /* ---------- 定位 ---------- */
    function enemyPoint(intent) {
      var st = document.querySelector('.sh-stage');
      var tv = rectOf(document.querySelector('.sh-stage .p4-tv .scr'));
      if (intent && intent.all && tv) return { x: tv.left + tv.width / 2, y: tv.top + tv.height * .58, all: true };
      var u = null;
      if (st && intent && intent.target) u = st.querySelector('.enemy-unit[data-target-id="' + intent.target + '"]');
      if (!rectOf(u) && st) u = st.querySelector('.enemy-unit.is-active');
      var r = rectOf(u && (u.querySelector('.enemy-unit-face') || u));
      if (r) return { x: r.left + r.width / 2, y: r.top + r.height / 2, unit: u };
      if (tv) return { x: tv.left + tv.width / 2, y: tv.top + tv.height * .55 };
      return { x: innerWidth * .6, y: innerHeight * .4 };
    }
    function actorPoint(intent) {
      /* 出手时快照的行动者位置优先（结算后 .active 已经换成下一位） */
      var r = (intent && intent.actorRect) || rectOf(document.querySelector('.sh-stage .party-rail > span.active'));
      if (r) return { x: r.left + r.width / 2, y: r.top, bottom: r.bottom };
      return { x: innerWidth * .25, y: innerHeight * .7 };
    }

    /* ---------- 基础部件 ---------- */
    function glitch(tone) {
      var n = lite() ? 2 : 5, h = '';
      for (var i = 0; i < n; i++) h += '<i style="--y:' + (8 + Math.random() * 80).toFixed(1) + '%;--h:' + (2 + Math.random() * (lite() ? 5 : 9)).toFixed(1) + '%;--x:' + ((Math.random() - .5) * 60).toFixed(0) + 'px;--d:' + (i * 22) + 'ms"></i>';
      full('p4-glitch' + (tone ? ' is-' + tone : ''), h + '<b></b>', 320);
    }
    function tvHit(p, strong) {
      var tv = document.querySelector('.sh-stage .p4-tv');
      if (tv) {
        tv.classList.remove('p4-tvhit'); void tv.offsetWidth; tv.classList.add('p4-tvhit');
        var scr = tv.querySelector('.scr');
        if (scr) { var sn = deco('div', 'p4-snowhit'); scr.appendChild(sn); later(function () { sn.remove(); }, 520); }
        later(function () { tv.classList.remove('p4-tvhit'); }, 520);
      }
      if (p.unit) {
        p.unit.classList.remove('p4-hitjit'); void p.unit.offsetWidth; p.unit.classList.add('p4-hitjit');
        later(function () { p.unit.classList.remove('p4-hitjit'); }, 520);
      }
      spot('p4-static-patch' + (strong ? ' is-strong' : ''), p.x, p.y, '<i></i><i></i>', 520, p.all ? 2.1 : 1);
    }
    function damageTag(p, value, sub, tone, delay) {
      later(function () {
        var dx = p.all ? 0 : 74, dy = p.all ? -40 : -96;
        spot('p4-dmg' + (tone ? ' is-' + tone : ''), p.x, p.y,
          '<div style="--dx:' + dx + 'px;--dy:' + dy + 'px"><b>' + esc(value) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>', 900 - (delay || 0));
      }, delay || 0);
    }
    function slash(p, triple) {
      var cuts = triple ? [[-24, -22], [0, 0], [24, 22]] : [[0, 0]];
      spot('p4-slash' + (p.all ? ' is-wide' : ''), p.x, p.y, cuts.map(function (c, i) { return '<i style="--ox:' + c[0] + 'px;--oy:' + c[1] + 'px;--d:' + (i * 55) + 'ms"></i>'; }).join('') + '<em></em>', 560, p.all ? 1.8 : 1);
    }
    function gun(p) {
      var h = '';
      for (var i = 0; i < 3; i++) h += '<i style="--ox:' + [-40, 22, -6][i] + 'px;--oy:' + [-18, -34, 26][i] + 'px;--d:' + (i * 70) + 'ms"></i>';
      spot('p4-gun', p.x, p.y, h, 620);
    }
    function element(p, el, delay) {
      later(function () {
        var n = { fire: 4, ice: 5, elec: 3, wind: 3, psy: 3, nuke: 2, bless: 4, curse: 4, almighty: 2, heal: 4, support: 3, ailment: 3 }[el] || 3;
        if (lite()) n = Math.max(2, n - 1);
        var h = '';
        for (var i = 0; i < n; i++) h += '<i style="--i:' + i + ';--n:' + n + ';--r:' + (i - (n - 1) / 2).toFixed(1) + '"></i>';
        if (el === 'elec') h = '<svg viewBox="-100 -200 200 260">' + [-46, 4, 48].slice(0, n).map(function (x, i) { return '<polyline style="--i:' + i + '" points="' + (x + 14) + ',-200 ' + (x - 10) + ',-120 ' + (x + 16) + ',-100 ' + (x - 18) + ',-30 ' + (x + 8) + ',-40 ' + x + ',40"/>'; }).join('') + '</svg>' + h;
        spot('p4-el p4-el-' + el, p.x, p.y, h + '<b>' + TAG[el] + '</b>', 900 - delay, p.all ? 1.7 : 1);
      }, delay);
    }
    function tarot(intent, big) {
      var a = actorPoint(intent), w = 124, hgt = 196;
      var numeral = ARCANA[hash(intent.persona) % ARCANA.length];
      var face = '<div class="cf"><span class="no">' + numeral + '</span><svg viewBox="0 0 60 60"><path d="M8 22c6-12 38-12 44 0-2 14-10 26-22 30C18 48 10 36 8 22Z"/><path class="eye" d="M17 27l9 3-9 3ZM43 27l-9 3 9 3Z"/></svg><b>' + esc(intent.persona) + '</b></div>';
      var shards = '';
      var pts = [[0, 0], [50, 0], [100, 0], [100, 40], [100, 100], [55, 100], [0, 100], [0, 55]];
      var count = lite() ? 5 : pts.length;
      var step = pts.length / count;
      for (var i = 0; i < count; i++) {
        var p1 = pts[Math.floor(i * step)], p2 = pts[Math.floor((i + 1) * step) % pts.length];
        var cx = 44 + Math.random() * 12, cy = 42 + Math.random() * 16;
        var ang = Math.atan2((p1[1] + p2[1]) / 2 - cy, (p1[0] + p2[0]) / 2 - cx);
        shards += '<i style="clip-path:polygon(' + cx + '% ' + cy + '%,' + p1[0] + '% ' + p1[1] + '%,' + p2[0] + '% ' + p2[1] + '%);--tx:' + (Math.cos(ang) * (90 + Math.random() * 60)).toFixed(0) + 'px;--ty:' + (Math.sin(ang) * (80 + Math.random() * 50) - 30).toFixed(0) + 'px;--rot:' + ((Math.random() - .5) * 240).toFixed(0) + 'deg">' + face + '</i>';
      }
      var flames = '';
      var fn = lite() ? 3 : 6;
      for (var f = 0; f < fn; f++) flames += '<i style="--fx:' + ((f - (fn - 1) / 2) * 22).toFixed(0) + 'px;--d:' + (f % 3 * 45) + 'ms;--s:' + (0.7 + (f % 2) * .45).toFixed(2) + '"></i>';
      var y = big ? a.y - 30 : a.y - 22;
      /* 手机：出演阵容在屏幕顶部，牌放到卡片下方，避免出屏 */
      var kk = k() * (big ? 1.15 : 1);
      if (y - 250 * kk < 0 && a.bottom) y = a.bottom + 210 * kk;
      spot('p4-tarot' + (big ? ' is-summon' : ''), a.x, y,
        '<div class="card" style="--w:' + w + 'px;--h:' + hgt + 'px">' + face + '<svg class="crack" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M50 48 30 10M50 48 82 22M50 48 90 70M50 48 46 96M50 48 8 64"/></svg></div>' +
        '<div class="shards" style="--w:' + w + 'px;--h:' + hgt + 'px">' + shards + '</div><div class="flames">' + flames + '</div>' +
        '<em>' + (big ? 'PERSONA CHANGE!' : 'PERSONA!') + '</em>', big ? 880 : 780, big ? 1.15 : 1);
    }
    function comicWord(x, y, word, sub, cls, delay) {
      later(function () { spot('p4-word ' + (cls || ''), x, y, '<div><b>' + esc(word) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>', 880 - (delay || 0)); }, delay || 0);
    }
    function eyes(intent) {
      var who = intent ? intent.actor : '';
      full('p4-eyes', '<div class="band"><div class="haz"></div><svg class="pair" viewBox="0 0 420 120"><path class="brow" d="M30 34 170 18 178 34 40 50Z"/><path class="brow" d="M390 34 250 18 242 34 380 50Z"/><path class="lid" d="M40 70C80 40 150 38 186 62 150 86 82 92 40 70Z"/><path class="lid" d="M380 70C340 40 270 38 234 62 270 86 338 92 380 70Z"/><circle class="iris" cx="118" cy="64" r="20"/><circle class="iris" cx="302" cy="64" r="20"/><circle class="pupil" cx="122" cy="64" r="8"/><circle class="pupil" cx="298" cy="64" r="8"/><circle class="hl" cx="112" cy="57" r="5"/><circle class="hl" cx="296" cy="57" r="5"/></svg><div class="cap"><b>CRITICAL</b><span>' + esc(who) + '</span></div><i class="glint"></i></div>', 700);
    }
    function noSignal(p) {
      spot('p4-nosig', p.x, p.y, '<div class="bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><b>NO SIGNAL</b><small>MISS · 未命中</small>', 860, p.all ? 1.6 : 1);
    }
    function scan(p) {
      spot('p4-scan', p.x, p.y, '<i class="ln"></i><i class="box"></i><b>ANALYZE</b><small>CH 13 · 信号解析</small>', 820);
    }
    function shield(x, y, word) {
      spot('p4-osdshield', x, y, '<svg viewBox="0 0 100 116"><path d="M50 6 92 22v34c0 28-20 46-42 54C28 102 8 84 8 56V22Z"/><path class="ck" d="m30 58 14 14 26-30"/></svg><b>' + esc(word) + '</b><i class="vol">' + '<span></span>'.repeat(8) + '</i>', 880);
    }
    function shopStar(x, y, value, word) {
      var sp = '';
      for (var i = 0; i < (lite() ? 4 : 7); i++) sp += '<i style="--a:' + (i * 51 + 10) + 'deg;--d:' + (i * 30) + 'ms"></i>';
      spot('p4-shop', x, y, '<div class="star"><small>' + esc(word || 'SALE!') + '</small><b>' + esc(value) + '</b></div>' + sp + '<em>☎ 现在订购!</em>', 880);
    }
    function dust(p, value) {
      var h = '';
      var n = lite() ? 4 : 7;
      for (var i = 0; i < n; i++) h += '<i style="--a:' + (i * 360 / n) + 'deg;--d:' + (i * 25) + 'ms"></i>';
      spot('p4-dust', p.x, p.y, '<div class="cloud">' + h + '</div><div class="pops"><span>★</span><span>✦</span><span>★</span><span>POW!</span></div>', 880, 1.2);
      damageTag(p, value, 'ALL-OUT ATTACK', 'big', 240);
    }
    function powerOff(unit) {
      var face = unit.querySelector('.enemy-unit-face') || unit;
      var r = rectOf(face) || rectOf(unit);
      if (!r) return;
      unit.classList.add('p4-killed');
      later(function () {
        var n = spot('p4-off', r.left + r.width / 2, r.top + r.height / 2, '<i class="flash"></i><i class="line"></i><i class="dot"></i><b>OFF AIR</b>', 600);
        n.style.setProperty('--w', Math.round(r.width) + 'px');
        n.style.setProperty('--h', Math.round(r.height) + 'px');
        n.style.setProperty('--k', '1');
      }, 300);
    }

    /* ---------- 命中分发 ---------- */
    function onImpact(node) {
      if (!enabled()) return;
      document.body.classList.add('p4-fxon');
      var kind = node.dataset.impact || '';
      var raw = txt(node.querySelector('.damage-number'));
      var amount = Math.abs(num(raw));
      var hx = parseFloat(node.style.getPropertyValue('--hit-x')) || innerWidth / 2;
      var hy = parseFloat(node.style.getPropertyValue('--hit-y')) || innerHeight / 2;
      var intent = takeIntent();
      var type = intent ? intent.type : '';
      var el = intent && intent.el ? intent.el : 'phys';
      var persona = type === 'skill';

      if (kind === 'slash' || kind === 'star' || kind === 'critical') {
        var p = enemyPoint(intent);
        var lead = persona ? 300 : 0;
        glitch(kind === 'critical' ? 'hard' : '');
        if (persona) tarot(intent, false);
        if (kind === 'critical' && type !== 'showtime') eyes(intent);
        later(function () {
          if (el === 'phys') slash(p, kind !== 'slash' || type === 'showtime');
          else if (el === 'gun') gun(p);
          tvHit(p, kind !== 'slash');
        }, lead + 40);
        if (el !== 'phys' && el !== 'gun') element(p, el, Math.max(0, lead - 40));
        if (amount > 0) damageTag(p, amount, kind === 'star' ? 'WEAK' : kind === 'critical' ? (type === 'showtime' ? 'SHOWTIME' : 'CRITICAL') : '', kind === 'critical' ? 'crit' : kind === 'star' ? 'weak' : '', lead + 120);
        if (kind === 'star') comicWord(p.x, p.y, 'DOWN!', '弱点 · 倒地', 'is-down', lead + 200);
        return;
      }
      if (kind === 'insight') {
        var q = enemyPoint(intent);
        if (type === 'analyze') { scan(q); return; }
        if (persona) tarot(intent, false);
        later(function () { glitch(''); noSignal(q); }, persona ? 280 : 0);
        return;
      }
      if (kind === 'allout') { glitch('hard'); dust(enemyPoint(null), amount); return; }
      if (kind === 'one-more') {
        var a = actorPoint(intent);
        comicWord(Math.min(innerWidth - 140 * k(), Math.max(140 * k(), a.x)), a.y - 60 * k(), '1 MORE!', type === 'batonPass' ? 'PASS → 下一位' : '再行动一次', 'is-more', 0);
        return;
      }
      if (kind === 'guard') { shield(hx, hy, type === 'guard' ? 'GUARD' : 'BLOCK'); return; }
      if (kind === 'player-hit') {
        glitch('red');
        spot('p4-static-patch is-party', hx, hy, '<i></i><i></i>', 460, .8);
        if (amount > 0) damageTag({ x: hx, y: hy, all: true }, amount, '', 'taken', 60);
        return;
      }
      if (kind === 'heal' || kind === 'buff') {
        if (type === 'item') { shopStar(hx, hy, kind === 'heal' && amount ? '+' + amount : 'UP!', intent.label || 'ITEM'); return; }
        if (type === 'switchMask') { tarot(intent, true); return; }
        if (persona) { tarot(intent, false); element({ x: hx, y: hy, all: false }, kind === 'heal' ? 'heal' : 'support', 300); if (kind === 'heal' && amount) damageTag({ x: hx, y: hy, all: true }, '+' + amount, '', 'heal', 420); return; }
        element({ x: hx, y: hy }, kind === 'heal' ? 'heal' : 'support', 0);
        if (kind === 'heal' && amount) damageTag({ x: hx, y: hy, all: true }, '+' + amount, '', 'heal', 120);
      }
    }

    /* ---------- 敌人倒下：比较两次重绘的存活状态 ---------- */
    function scanDowns() {
      var st = document.querySelector('.sh-stage');
      if (!st) { alive = {}; inBattle = false; return; }
      var btns = st.querySelectorAll('.enemy-targets [data-target-id]');
      var fresh = !inBattle; inBattle = true;
      [].forEach.call(btns, function (b) {
        var id = b.dataset.targetId, up = !b.classList.contains('down');
        if (!fresh && enabled() && alive[id] === true && !up) {
          var u = st.querySelector('.enemy-unit[data-target-id="' + id + '"]');
          if (u) powerOff(u);
        }
        alive[id] = up;
      });
    }
    function clear() { timers.forEach(clearTimeout); timers = []; if (layer) layer.innerHTML = ''; }

    function init() {
      if (enabled()) document.body.classList.add('p4-fxon');
      if (reduced.addEventListener) reduced.addEventListener('change', function () { document.body.classList.toggle('p4-fxon', enabled()); if (!enabled()) clear(); });
      addEventListener('click', snapshot, true);
      new MutationObserver(function (list) {
        for (var i = 0; i < list.length; i++) {
          var added = list[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            var n = added[j];
            if (n.nodeType === 1 && n.classList.contains('battle-impact')) { try { onImpact(n); } catch (e) { /* 装饰失败不影响战斗 */ } }
          }
        }
      }).observe(document.body, { childList: true });
    }
    return { init: init, scan: scanDowns, clear: clear };
  })();

  var coveredKey = '', cal, crt, chan, comic, lastKey = '', lastHold = false, lastShow = false;
  var channelNames = { battle: ['01', 'Mayonaka TV'], tower: ['02', '登塔'], persona: ['03', 'PERSONA'], arsenal: ['04', '武库'] };
  function sceneKey() {
    var c = document.getElementById('content');
    if (!c) return '';
    var s = c.querySelector('[data-tower-scene],[data-slice-scene],[data-scene],.velvet-room,.sh-stage,.map-shell');
    var tag = s ? (s.dataset.towerScene || s.dataset.sliceScene || s.dataset.scene || s.className.split(' ')[0]) : (c.firstElementChild ? c.firstElementChild.className.split(' ')[0] : '');
    return (location.hash || '#battle') + '|' + tag;
  }
  /* 电视雪花转场：新画面已在遮罩后重建 → 同一帧盖上雪花 → 显像管“开机”式纵向收拢揭开。
   * 单个合成层，只动 transform / opacity；雪花纹理在初始化时用 canvas 生成一张小 PNG（不再用 SVG turbulence 实时栅格化）。 */
  var tvx = null, tvxAnims = [];
  function snowURL() {
    try {
      var cv = document.createElement('canvas'); cv.width = cv.height = 192;
      var g = cv.getContext('2d'), im = g.createImageData(192, 192), d = im.data;
      for (var i = 0; i < d.length; i += 4) { var v = Math.random() < .5 ? 20 + Math.random() * 60 : 120 + Math.random() * 135; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
      g.putImageData(im, 0, 0);
      return cv.toDataURL('image/png');
    } catch (e) { return ''; }
  }
  function tvCover() {
    if (!tvx || reduced.matches) return;
    tvxAnims.forEach(function (a) { try { a.cancel(); } catch (e) { /* noop */ } });
    var snow = tvx.firstChild, line = tvx.lastChild;
    tvx.classList.add('on');
    tvx.style.willChange = 'transform,opacity';
    var ease = 'cubic-bezier(.16,1,.3,1)';
    tvxAnims = [
      snow.animate([{ transform: 'scale3d(1,1,1)', opacity: 1 }, { transform: 'scale3d(1,1,1)', opacity: 1, offset: .12 }, { transform: 'scale3d(1,.004,1)', opacity: .9 }], { duration: 460, easing: ease, fill: 'forwards' }),
      line.animate([{ transform: 'scale3d(1,1,1)', opacity: 0 }, { transform: 'scale3d(1,1,1)', opacity: .95, offset: .45 }, { transform: 'scale3d(0,1,1)', opacity: 0 }], { duration: 600, easing: ease, fill: 'forwards' })
    ];
    tvxAnims[1].onfinish = function () { tvx.classList.remove('on'); tvx.style.willChange = ''; tvxAnims.forEach(function (x) { x.cancel(); }); tvxAnims = []; };
  }

  function channelFlash() {
    if (!chan) return;
    var h = (location.hash || '#battle').slice(1).split(/[/?]/)[0];
    var meta = channelNames[h] || ['00', h.toUpperCase()];
    var c = document.getElementById('content');
    if (c && c.querySelector('.velvet-room')) meta = ['??', 'VELVET ROOM'];
    else if (c && c.querySelector('.sh-stage')) meta = ['13', 'MIDNIGHT CHANNEL'];
    else if (c && c.querySelector('.map-shell')) meta = ['13', 'TV WORLD'];
    else if (c && c.querySelector('[data-slice-scene]')) meta = ['99', 'TEST SIGNAL'];
    chan.innerHTML = '<b>CH ' + meta[0] + '<small>' + meta[1] + '</small></b><i></i>';
    chan.classList.remove('on'); void chan.offsetWidth; chan.classList.add('on');
  }

  /* ================= 动效编排（只动 transform / opacity / clip-path） =================
   * 切页：背景 → 主视觉 → 标题 → 内容块 → 按钮，分层入场，stagger 36ms，总时长 ≤ 400ms 起跳；
   * 选择：滑动选框在选项之间平移（重绘前后记住位置，接着上一次的位置滑过去）；
   * 数值：HP/SP 条宽度变化用 scaleX 从旧值补间到新值。 */
  var EASE_IN = 'cubic-bezier(.16,1,.3,1)';
  function anim(el, frames, o) {
    if (!el || !el.animate) return null;
    try { var a = el.animate(frames, o); a.onfinish = function () { el.style.willChange = ''; }; el.style.willChange = 'transform,opacity'; return a; } catch (e) { return null; }
  }
  function enter(list, base, step, dy) {
    var seen = [];
    list.forEach(function (el) { if (el && seen.indexOf(el) < 0 && el.getBoundingClientRect().height > 0) seen.push(el); });
    seen.slice(0, 14).forEach(function (el, i) {
      var delay = (base || 0) + Math.min(360, i * (step || 36));
      if (reduced.matches) { anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 140, easing: 'ease-out', fill: 'backwards' }); return; }
      anim(el, [{ opacity: 0, transform: 'translate3d(0,' + (dy == null ? 12 : dy) + 'px,0) scale(.985)' }, { opacity: 1, transform: 'none' }],
        { duration: 440, delay: delay, easing: EASE_IN, fill: 'backwards' });
    });
  }
  function kids(sel) { var n = document.querySelector(sel); return n ? [].slice.call(n.children).filter(function (k) { return !k.matches('[aria-hidden=true]:not(.p4-junes)'); }) : []; }
  function choreograph(off) {
    off = off || 0;
    var c = document.getElementById('content');
    if (!c) return;
    if (c.querySelector('.sh-stage')) {
      var st = c.querySelector('.sh-stage');
      /* 战斗舞台：只编排 4 个大组（电视 → 敌方资料 → 指令区 → 出演阵容），减少首帧新建合成层 */
      enter([st.querySelector('.p4-tv')], off, 0, 0);
      enter([st.querySelector('.enemy-name'), st.querySelector('.command-deck'), st.querySelector('.party-rail')], off + 60, 50, 12);
      return;
    }
    var head = c.querySelector('.page-heading, .scene-heading');
    var main = c.querySelector('.hero-stage, .night-base-head, .map-board, .result-mark, .velvet-room .vr-top, .shop-head, .mask-display, .slice-talk-stage, .story-layout .scene-emblem, .loot-object, .reveal-layout, .recap-ascent');
    var flow = [];
    if (c.querySelector('.night-base')) flow = kids('.night-base').reduce(function (acc, k) { return acc.concat(k.classList.contains('night-base-grid') ? [].slice.call(k.children) : [k]); }, []);
    else if (c.querySelector('.map-shell')) flow = [c.querySelector('.map-hud'), c.querySelector('.p4-ticker-map'), c.querySelector('.map-region')].concat(kids('.map-side, .map-aside, .map-shell > aside'));
    else if (c.querySelector('.home-grid')) flow = [c.querySelector('.mission')].concat(kids('.mission'));
    else if (c.querySelector('.shop-sections')) flow = kids('.shop-sections');
    else if (c.querySelector('.velvet-room')) flow = kids('.vr-layout');
    else if (c.querySelector('.result-content')) flow = kids('.result-content');
    else if (c.querySelector('.persona-info')) flow = [c.querySelector('.persona-info')].concat(kids('.mask-tabs'));
    else {
      var scope = c.querySelector('.experience-scene, .tower-scene, .slice-scene, [data-tower-scene], [data-slice-scene]') || c;
      flow = [].slice.call(scope.children).filter(function (k) { return !k.matches('.page-heading, .scene-heading, [aria-hidden=true]'); });
      if (flow.length === 1) flow = [].slice.call(flow[0].children);
    }
    enter([main], off, 0, 14);
    enter([head], off + 50, 0, 10);
    enter(flow.filter(function (n) { return n && n !== main && n !== head; }), off + 100, 36);
  }

  /* 滑动选框：每个容器一个，重绘后从上一次位置滑到新的选中项 */
  var lastSel = {};
  function slider(key, container, selected, cls) {
    if (!container) return;
    var ind = container.querySelector(':scope > .p4-sel');
    if (!selected || !selected.offsetParent) { if (ind) ind.style.opacity = '0'; return; }
    if (getComputedStyle(container).position === 'static') container.classList.add('p4-rel');
    if (!ind) { ind = deco('i', 'p4-sel ' + (cls || '')); container.appendChild(ind); }
    var x = selected.offsetLeft, y = selected.offsetTop, w = selected.offsetWidth, h = selected.offsetHeight;
    var prev = lastSel[key];
    var to = 'translate3d(' + x + 'px,' + y + 'px,0)';
    ind.style.width = w + 'px'; ind.style.height = h + 'px';
    ind.style.opacity = '1';
    if (prev && !reduced.matches && (prev.x !== x || prev.y !== y || prev.w !== w)) {
      ind.style.transform = to;
      anim(ind, [{ transform: 'translate3d(' + prev.x + 'px,' + prev.y + 'px,0) scale(' + (prev.w / w).toFixed(3) + ',' + (prev.h / h).toFixed(3) + ')' }, { transform: to }], { duration: 320, easing: EASE_IN });
    } else ind.style.transform = to;
    lastSel[key] = { x: x, y: y, w: w, h: h };
  }
  function sliders() {
    var c = document.getElementById('content');
    if (!c) return;
    slider('cmd', c.querySelector('.sh-stage .command-grid'), c.querySelector('.sh-stage .command-grid > button[aria-pressed=true]'), 'is-cmd');
    slider('skill', c.querySelector('.sh-stage .skill-list'), c.querySelector('.sh-stage .skill-list > [aria-pressed=true], .sh-stage .skill-list > .selected'), 'is-skill');
    slider('target', c.querySelector('.sh-stage .enemy-targets'), c.querySelector('.sh-stage .enemy-targets > [aria-pressed=true]'), 'is-target');
    slider('strata', c.querySelector('.tower-strata-list'), c.querySelector('.tower-strata-list > button.active'), 'is-strata');
    var nav = document.querySelector('.room-nav');
    if (nav && !mobile()) slider('nav', nav, nav.querySelector('a[aria-current=page]'), 'is-nav');
    else if (nav) slider('navm', nav, nav.querySelector('a[aria-current=page]'), 'is-navm');
  }

  /* HP / SP 等数值条：宽度变化用 scaleX 补间（只读旧宽度，不改结构） */
  var lastMeter = {};
  function meters() {
    var c = document.getElementById('content');
    if (!c || reduced.matches) { lastMeter = {}; return; }
    var bars = c.querySelectorAll('.meter > i');
    var seen = {};
    [].forEach.call(bars, function (b, i) {
      var host = b.closest('[data-target-id], .player-hud > div, .enemy-scene, .party-rail > span, section, article') || c;
      var key = (host.dataset && host.dataset.targetId ? 't' + host.dataset.targetId : host.className.split(' ')[0]) + ':' + i;
      var w = parseFloat(b.style.width) || (b.getBoundingClientRect().width / Math.max(1, b.parentNode.getBoundingClientRect().width) * 100);
      seen[key] = w;
      var p = lastMeter[key];
      if (p != null && Math.abs(p - w) > .5 && w > 0) {
        b.style.transformOrigin = '0 50%';
        anim(b, [{ transform: 'scaleX(' + Math.min(4, p / w).toFixed(3) + ')' }, { transform: 'scaleX(1)' }], { duration: 560, easing: EASE_IN });
      }
    });
    lastMeter = seen;
  }

  function comicBurst(kind) {
    if (reduced.matches || !comic) return;
    var t = kind === 'hold' ? ['ALL-OUT', 'ATTACK!!', '总攻击的机会！'] : ['SHOWTIME', 'ONE MORE!', '连携出击'];
    comic.innerHTML = '<i class="pn a"></i><i class="pn b"></i><i class="pn c"></i><b class="w1">' + t[0] + '</b><b class="w2">' + t[1] + '</b><em>' + t[2] + '</em>';
    comic.classList.remove('on'); void comic.offsetWidth; comic.classList.add('on');
  }
  function tick() {
    var key = sceneKey();
    var changed = key !== lastKey;
    if (changed) { if (lastKey) channelFlash(); }
    var c = document.getElementById('content');
    var hold = !!(c && c.querySelector('.engine-hold-up'));
    var show = !!document.querySelector('.showtime-cutin');
    if (hold && !lastHold) comicBurst('hold');
    if (show && !lastShow) comicBurst('show');
    lastHold = hold; lastShow = show;
    document.body.classList.toggle('p4-fighting', !!(c && c.querySelector('.sh-stage')));
    document.body.classList.toggle('p4-lite', mobile());
    try { decorate(); } catch (e) { /* 装饰失败不影响功能 */ }
    try {
      if (changed) { var keepNav = { nav: lastSel.nav, navm: lastSel.navm }; lastSel = keepNav; choreograph(coveredKey === key ? 120 : 0); }
      sliders(); meters();
    } catch (e) { /* 动效失败不影响功能 */ }
    lastKey = key;
    try { FX.scan(); if (!document.querySelector('.sh-stage')) FX.clear(); } catch (e) { /* 同上 */ }
  }

  /* 帧率守护：手机上测到持续低帧率就切静态（body.p4-static） */
  function fpsGuard() {
    if (reduced.matches || !window.requestAnimationFrame) return;
    var frames = 0, t0 = performance.now();
    function loop(t) {
      frames++;
      if (t - t0 < 2000) { requestAnimationFrame(loop); return; }
      var fps = frames * 1000 / (t - t0);
      if (fps < 32 && mobile()) document.body.classList.add('p4-static');
    }
    requestAnimationFrame(loop);
  }

  /* 地图移动：重建后的新视口默认 scrollTop=0，tower-flow 两帧后才居中 → 中间会闪一帧错位。
   * 在新 DOM 首次绘制前同步居中（tower-flow 随后的居中变成 no-op），
   * 再让 .map-grid 从旧位置用 transform 滑到新位置（只动 transform，320ms expo-out）。 */
  var mapScroll = null;
  document.addEventListener('scroll', function (e) {
    var t = e.target;
    if (t && t.matches && t.matches('[data-map-viewport]')) mapScroll = { l: t.scrollLeft, t: t.scrollTop };
  }, true);
  function mapGlide(sameScene) {
    var v = document.querySelector('[data-map-viewport]');
    if (!v) { mapScroll = null; return; }
    var cell = v.querySelector('.map-cell.is-current'), grid = v.firstElementChild;
    if (!cell || !grid) return;
    var vr = v.getBoundingClientRect(), cr = cell.getBoundingClientRect();
    var l = Math.max(0, Math.min(v.scrollWidth - v.clientWidth, v.scrollLeft + cr.left - vr.left + cr.width / 2 - v.clientWidth / 2));
    var t = Math.max(0, Math.min(v.scrollHeight - v.clientHeight, v.scrollTop + cr.top - vr.top + cr.height / 2 - v.clientHeight / 2));
    var prev = mapScroll;
    v.scrollLeft = l; v.scrollTop = t;
    mapScroll = { l: v.scrollLeft, t: v.scrollTop };
    if (!sameScene || !prev || reduced.matches) return;
    var dx = mapScroll.l - prev.l, dy = mapScroll.t - prev.t;
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
    anim(grid, [{ transform: 'translate3d(' + dx + 'px,' + dy + 'px,0)' }, { transform: 'translate3d(0,0,0)' }], { duration: 320, easing: EASE_IN });
  }

  function init() {
    document.body.classList.add('p4r');
    var mast = document.querySelector('.masthead');
    if (mast && !mast.querySelector('.p4-cal')) {
      cal = deco('div', 'p4-cal', calHtml());
      mast.appendChild(cal);
      setInterval(function () { if (!document.hidden) cal.innerHTML = calHtml(); }, 60000);
    }
    crt = deco('div', 'p4-crt', '<i></i><b></b>');
    chan = deco('div', 'p4-chan');
    comic = deco('div', 'p4-comic');
    document.body.appendChild(crt); document.body.appendChild(chan); document.body.appendChild(comic);
    tvx = deco('div', 'p4-tvx', '<i class="snow"></i><i class="line"></i>');
    var su = snowURL(); if (su) tvx.firstChild.style.backgroundImage = 'url(' + su + ')';
    document.body.appendChild(tvx);
    FX.init();
    var c = document.getElementById('content'), pending = 0;
    var mo = new MutationObserver(function (recs) {
      /* 场景切换：只在 #content 真正重建时（同一任务内、新 DOM 首次绘制之前）盖上雪花。
       * hashchange 先于重建触发 body 子节点变化，若据此盖一次，会在重建前揭开、重建后再盖一次（两次雪花 = 闪帧）。 */
      var k = sceneKey();
      var rebuilt = recs.some(function (r) { return r.target === c; });
      var sceneCut = rebuilt && lastKey && k !== lastKey && k !== coveredKey;
      if (sceneCut) { coveredKey = k; tvCover(); }
      if (rebuilt) { try { mapGlide(k === lastKey); } catch (e) { /* 动效失败不影响功能 */ } }
      if (pending) return;
      pending = requestAnimationFrame(function () { pending = 0; tick(); });
    });
    if (c) mo.observe(c, { childList: true });
    mo.observe(document.body, { childList: true });
    addEventListener('hashchange', function () { setTimeout(tick, 30); });
    document.addEventListener('visibilitychange', function () { document.body.classList.toggle('p4-paused', document.hidden); });
    tick();
    setTimeout(fpsGuard, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
