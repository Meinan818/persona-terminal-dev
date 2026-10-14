/* MASKARIA 官网 · 编排
 *
 * 这里只有一件事：把页面当成一条时间线推着走。
 *
 *   1. 开屏与首屏是同一条时间线——幕布裂开的同时，首屏被一颗锯齿溅射冲开，
 *      然后面具、标题、相纸、信息带按先后进场。开屏不是另一段动画，是首屏的前半段。
 *   2. 每一章有自己的编排：擦除、拍上、钉住推进、交叉换人。用的是 ScrollTrigger，
 *      一章一个镜头，触发一次就注销，不重播、不叠触发。
 *   3. 「四步」那一节整节钉住，滚动进度直接推着四步横着走——全页唯一一处滚动即进度。
 *
 * 底线：这份脚本是「加分项」。没有 GSAP、或者系统开了「减少动态效果」时，
 * 它什么都不做，页面就是 styles.css 里的完成态——字在、图在、链接能点。
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fieldInk = (n) => getComputedStyle(root).getPropertyValue('--f' + n + '-fg').trim();
  /* ScrollTrigger 有没有落地，要看有没有真的加载到——刷新交给它自己算 */
  let refreshFn = null;
  let refreshQueued = 0;
  function scheduleRefresh(delay) {
    clearTimeout(refreshQueued);
    refreshQueued = setTimeout(() => { if (refreshFn) refreshFn(); }, delay || 240);
  }

  /* ══ 0 · 皮肤 ═══════════════════════════════════════════════════════
     五块语言牌换的是整套 token；自定义皮从主色派生一族的暗色。 */
  const SKINS = ['red', 'water-blue', 'water-pink', 'yellow', 'custom'];
  /* 抠像素材按主题换文件：水面的两件衣服共用蓝／玫两张图 */
  const DECO_FILE = { red: 'red', 'water-blue': 'blue', 'water-pink': 'pink', yellow: 'yellow', custom: 'custom' };
  const setters = $$('[data-skin-set]');
  const tabs = $$('.stab');
  let skinTimer = 0;
  let refreshTimer = 0;

  function applySkin(name, accent) {
    if (!SKINS.includes(name)) name = 'red';
    root.classList.add('skinning');
    clearTimeout(skinTimer);
    skinTimer = setTimeout(() => root.classList.remove('skinning'), 480);

    root.dataset.skin = name;
    if (name === 'custom') {
      const a = accent || root.dataset.accent || '#3B82F6';
      root.dataset.accent = a;
      /* 整族从主色派生：大色块压暗到 62% 才托得住白字，焦点环与色板仍用原色。 */
      const deep = 'color-mix(in srgb, ' + a + ' 62%, #000)';
      root.style.setProperty('--accent', deep);
      root.style.setProperty('--accent-2', a);
      root.style.setProperty('--on-accent', '#ffffff');
      root.style.setProperty('--card-chip', deep);
      root.style.setProperty('--card-hot', deep);
      root.style.setProperty('--btn', deep);
      root.style.setProperty('--btn-hover', 'color-mix(in srgb, ' + a + ' 48%, #000)');
      root.style.setProperty('--hot', a);
      root.style.setProperty('--hot-ink', '#ffffff');
    } else {
      for (const p of ['--accent', '--accent-2', '--on-accent', '--card-chip', '--card-hot',
        '--btn', '--btn-hover', '--hot', '--hot-ink']) {
        root.style.removeProperty(p);
      }
      delete root.dataset.accent;
    }

    for (const t of tabs) t.setAttribute('aria-pressed', String(t.dataset.skinSet === name));
    for (const t of tabs) t.dataset.on = String(t.dataset.skinSet === name);
    for (const d of $$('[data-deco]')) d.src = 'img/mask-' + DECO_FILE[name] + '.png';

    const tail = name === 'custom' && root.dataset.accent ? '-' + root.dataset.accent.replace('#', '') : '';
    history.replaceState(null, '', '#skin-' + name + tail);

    /* 换的是字体与色，版面高度会变：等它落定再让 ScrollTrigger 重算一次 */
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => paintBar(), 60);
    scheduleRefresh(520);
  }

  for (const s of setters) {
    s.addEventListener('click', (e) => {
      e.preventDefault();
      applySkin(s.dataset.skinSet, s.dataset.accent);
    });
  }

  const hashSkin = (location.hash || '').match(/^#skin-([a-z-]+)(?:-([0-9a-fA-F]{6}))?$/);

  /* ══ 1 · 顶栏：底与墨跟着压在它下面那一章走 ═════════════════════════ */
  const fields = $$('[data-field]');
  const hdr = $('.hdr');
  const navLinks = $$('[data-nav]');
  let barRaf = 0;

  function paintBar() {
    if (!hdr || !fields.length) return;
    const y = hdr.offsetHeight + 6;
    let cur = fields[0];
    for (const b of fields) if (b.getBoundingClientRect().top <= y) cur = b;
    const overHero = cur.classList.contains('hero') && scrollY < 40;
    const cs = getComputedStyle(cur);
    hdr.classList.toggle('is-over', overHero);
    if (overHero) {
      hdr.style.removeProperty('--bar-bg');
      hdr.style.removeProperty('--bar-ink');
      hdr.style.removeProperty('--hdr-solid');
    } else {
      const ink = cur.dataset.field ? fieldInk(cur.dataset.field) : cs.color;
      hdr.style.setProperty('--bar-bg', cs.backgroundColor);
      hdr.style.setProperty('--bar-ink', ink || cs.color);
      hdr.style.setProperty('--hdr-solid', cs.backgroundColor);
    }
    /* 导航上标一块「你现在在这儿」：压到哪一章，哪块牌子翻成主色 */
    const line = scrollY + hdr.offsetHeight + 60;
    let active = null;
    for (const a of navLinks) {
      const el = document.getElementById(a.dataset.nav);
      if (el && el.offsetTop <= line) active = a;
    }
    for (const a of navLinks) a.classList.toggle('is-here', a === active);
  }

  let lastY = scrollY;
  function onScroll() {
    if (!barRaf) barRaf = requestAnimationFrame(() => {
      barRaf = 0;
      paintBar();
      /* 往下滚过一屏半就收起来，往上滚立刻回来 */
      const dy = scrollY - lastY;
      if (Math.abs(dy) > 4) {
        hdr.classList.toggle('is-hidden', dy > 0 && scrollY > 1200);
        lastY = scrollY;
      }
    });
  }

  /* ══ 2 · 章节标题拆成一块块字母 ═════════════════════════════════════ */
  for (const w of $$('.word[data-tiles]')) {
    const text = (w.textContent || '').trim();
    if (!text) continue;
    w.textContent = '';
    for (const ch of text) {
      const s = document.createElement('span');
      s.className = 'tile';
      s.textContent = ch;
      w.appendChild(s);
    }
  }

  /* 抠像的白描边：同一张面具的白色剪影垫在后面一圈（现在直接写在 HTML 里，
     这里只兜住旧结构——万一某张图没带 .art__key，补一份）。 */
  for (const art of $$('.hero__art, .kv__art')) {
    const face = $('.art__face', art);
    if (!face || $('.art__key', art)) continue;
    const key = face.cloneNode(true);
    key.className = 'art__key';
    key.removeAttribute('loading');
    key.setAttribute('aria-hidden', 'true');
    key.setAttribute('alt', '');
    art.insertBefore(key, face);
  }

  /* ══ 3 · 数字滚动 / 名字点灯 / 命令行打字：与滚动无关的小机器 ═══════ */
  function countUp(el) {
    const target = Number(el.dataset.count || 0);
    const fig = $('.stat__fig', el);
    if (!fig) return;
    if (reduced() || !target) { fig.textContent = String(target); return; }
    const o = { v: 0 };
    gsap.to(o, {
      v: target, duration: 1.15, ease: 'power2.out',
      onUpdate() { fig.textContent = String(Math.round(o.v)); },
      onComplete() { fig.textContent = String(target); },
    });
  }

  function typeOut(el) {
    const full = el.dataset.type || '';
    if (reduced() || !full) { el.textContent = full; return; }
    el.textContent = '';
    const o = { i: 0 };
    gsap.to(o, {
      i: full.length, duration: Math.max(.5, full.length * .028), ease: 'none',
      onUpdate() { el.textContent = full.slice(0, Math.round(o.i)); },
      onComplete() { el.textContent = full; },
    });
  }

  const names = $$('.names li');
  if (names.length) {
    let idx = 0, timer = 0, inView = false;
    const tick = () => {
      names[idx % names.length].classList.remove('is-lit');
      idx += 1;
      names[idx % names.length].classList.add('is-lit');
    };
    const start = () => { if (!timer && inView && !document.hidden) timer = setInterval(tick, 1800); };
    const stop = () => { clearInterval(timer); timer = 0; };
    names[0].classList.add('is-lit');
    const host = names[0].closest('section');
    if ('IntersectionObserver' in window && host) {
      new IntersectionObserver(([e]) => {
        inView = e.isIntersecting;
        inView ? start() : stop();
      }, { threshold: .1 }).observe(host);
    }
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  }

  /* ══ 4 · 锚点、前进后退、刷新 ══════════════════════════════════════
     带锚点直接进来时不放开场（用户是奔着某一段来的），落地后立刻定位过去。 */
  const startAtAnchor = !!location.hash && !/^#skin-/.test(location.hash);
  function jumpTo(el, smooth) {
    if (!el) return;
    const y = el.getBoundingClientRect().top + scrollY - (hdr ? hdr.offsetHeight + 8 : 0);
    scrollTo({ top: y, behavior: smooth ? 'smooth' : 'instant' });
  }
  for (const a of $$('a[href^="#"]')) {
    const id = a.getAttribute('href');
    if (id === '#' || id.length < 2) continue;
    if (/^#skin-/.test(id)) continue;
    a.addEventListener('click', (e) => {
      const el = document.getElementById(id.slice(1));
      if (!el) return;
      e.preventDefault();
      jumpTo(el, !reduced());
      history.pushState(null, '', id);
    });
  }
  addEventListener('hashchange', () => {
    if (/^#skin-/.test(location.hash)) return;
    const el = document.getElementById((location.hash || '').slice(1));
    if (el) jumpTo(el, !reduced());
  });

  /* ══ 5 · 动效骨架 ══════════════════════════════════════════════════
     到这一步才需要 GSAP。没有它、或者系统要求减少动态效果，
     就到此为止：页面已经是完成态。 */
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (!hasGsap || reduced()) {
    root.classList.remove('js');
    if (hashSkin) applySkin(hashSkin[1], hashSkin[2] ? '#' + hashSkin[2] : null);
    if (startAtAnchor) addEventListener('load', () => jumpTo(document.getElementById(location.hash.slice(1)), false));
    else paintBar();
    addEventListener('scroll', onScroll, { passive: true });
    paintBar();
    if (hasGsap) { try { window.ScrollTrigger.config({ ignoreMobileResize: true }); } catch (e) { /* 旧版本没有这项，忽略 */ } }
    return;
  }

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  gsap.defaults({ ease: 'power3.out' });
  refreshFn = () => ScrollTrigger.refresh();

  /* ══ 6 · 开屏 + 首屏：同一条时间线 ═════════════════════════════════
     幕布不是「加载动画」，它是首屏的前半段：黑幕裂成三块滑走的同时，
     首屏被一颗锯齿溅射冲开，面具、标题、相纸、信息带依次落位。 */
  const SPLASH_IN = 'polygon(48.9% 19.8%,54.2% 34.9%,63.8% 21.6%,59% 39.9%,76.6% 31.3%,64% 44.6%,' +
    '79.5% 46.7%,63.6% 51.3%,77.9% 60.2%,63.9% 59.7%,68.6% 72.4%,56.3% 62.7%,57.9% 79.2%,' +
    '49.5% 63.8%,42.3% 78.6%,42.2% 65%,30% 71.2%,37.8% 58.5%,24.2% 59.5%,34.7% 52%,20.7% 45.9%,' +
    '36.2% 44.7%,24.6% 32%,39.5% 38.2%,35.6% 24.2%,46.5% 36.3%)';
  const SPLASH_OUT = 'polygon(48.1% -3%,64.7% -3%,75.8% -3%,97.3% -3%,103% 12.7%,103% 29.7%,' +
    '103% 44%,103% 55.2%,103% 69.4%,103% 86.8%,93.9% 103%,76.3% 103%,64.3% 103%,48.2% 103%,' +
    '35.7% 103%,22.5% 103%,0.1% 103%,-3% 86.9%,-3% 69.5%,-3% 57.1%,-3% 42.6%,-3% 29.7%,' +
    '-3% 12.5%,2.5% -3%,20.4% -3%,36.3% -3%)';

  const heroEls = $$('.hero__splash, .hero__art, .hero__shots .photo, .hero__tagline .slab, ' +
    '.hero__foot, .hero__cue, .hero__disc, .hdr, .hero__kicker, .wm__l, .wm__star, .wm__sub');
  const hero = $('.hero');

  const intro = gsap.timeline({
    paused: true,
    onComplete() {
      /* 首屏这一段收尾后把内联样式全部撤掉：
         各块的角度、相纸的悬停变形都是 CSS 写的，留着内联 transform 会把它们盖住。 */
      gsap.set(heroEls, { clearProps: 'all' });
      window.__maskariaIntroDone = true;
    },
  });

  /* 幕布：字母块一块块拍上 → 面具顶着溅射顶出来 → 三块幕布分别向左右滑走 */
  const curtain = $('.curtain');
  const bands = $$('.curtain__band');
  const letters = $$('.curtain__mark span');
  if (curtain) {
    gsap.set(curtain, { display: 'block' });
    intro
      .from(letters, { yPercent: 120, rotate: -14, opacity: 0, duration: .42, stagger: .055 }, .05)
      .from('.curtain__splash', { scale: .28, rotate: -46, opacity: 0, duration: .7, ease: 'back.out(1.5)' }, .28)
      .from('.curtain__note', { y: 26, opacity: 0, duration: .4 }, .55)
      .from('.curtain__pct', { opacity: 0, duration: .3 }, .6)
      .to('.curtain__fill', { width: '100%', duration: 1.2, ease: 'power1.inOut' }, .45)
      .to('.curtain__van', { x: () => ($('.curtain__rail') ? $('.curtain__rail').offsetWidth : 300), duration: 1.2, ease: 'power1.inOut' }, .45)
      .to('.curtain__pct', {
        duration: 1.2, ease: 'power1.inOut',
        onUpdate() { this.targets()[0].textContent = String(Math.round(this.progress() * 100)).padStart(3, '0'); },
      }, .45)
      /* 幕布裂成三块，上中下分别向左右滑走——首屏就是从这个口子里冲出来的 */
      .to('.curtain__core', { opacity: 0, scale: .93, duration: .28 }, 1.5)
      .to(bands[0], { xPercent: -106, duration: .5, ease: 'power3.inOut' }, 1.56)
      .to(bands[1], { xPercent: 106, duration: .5, ease: 'power3.inOut' }, 1.62)
      .to(bands[2], { xPercent: -106, duration: .5, ease: 'power3.inOut' }, 1.68)
      .set(curtain, { display: 'none' }, 2.16);
  }

  /* 首屏：锯齿溅射冲开 → 面具落位（黑错位与白描边一起合上来）→ 标题、相纸、信息带 */
  if (hero) {
    intro
      .fromTo(hero, { clipPath: SPLASH_IN },
        { clipPath: SPLASH_OUT, duration: .95, ease: 'power2.inOut' }, 1.6)
      .from('.hdr', { yPercent: -130, opacity: 0, duration: .5, ease: 'power3.out' }, 1.72)
      .from('.hero__splash', { scale: 1.5, rotate: 30, opacity: 0, duration: .8 }, 1.72)
      .from('.hero__kicker', { opacity: 0, x: -22, duration: .4 }, 1.78)
      /* 字标是这张海报的主角，给它最重的一拍：八块字母一块块从下往上拍上来 */
      .from('.wm__l', { yPercent: 132, rotate: -12, opacity: 0, duration: .42, stagger: .055, ease: 'back.out(1.25)' }, 1.84)
      .from('.wm__star', { scale: 0, rotate: -90, opacity: 0, duration: .42, ease: 'back.out(2)' }, 2.36)
      .from('.wm__sub', { x: -28, opacity: 0, duration: .42, ease: 'back.out(1.4)' }, 2.42)
      .from('.hero__disc', { opacity: 0, scale: .8, duration: .7 }, 1.95)
      .from('.hero__art', { yPercent: -40, scale: 1.22, rotate: 4, opacity: 0, duration: .72, ease: 'back.out(1.35)' }, 1.8)
      .from('.art__ink', { x: 0, y: 0, opacity: 0, duration: .26 }, 2.24)
      .from('.art__key', { scale: 1, opacity: 0, duration: .26 }, 2.24)
      .from('.hero__tagline .slab', { opacity: 0, scale: 1.26, duration: .34, stagger: .13, ease: 'power3.in' }, 2.52)
      .from('.hero__shots .photo', { y: 40, rotate: 0, opacity: 0, duration: .5, stagger: .12, ease: 'back.out(1.4)' }, 2.62)
      .from('.hero__foot', { yPercent: 110, duration: .6 }, 2.72)
      .from('.hero__cue', { opacity: 0, duration: .5 }, 2.96);
  }

  if (startAtAnchor) {
    /* 直接带锚点进来：不放开场，首屏就是完成态，然后落到目标那一段去 */
    gsap.set(heroEls, { clearProps: 'all' });
    if (curtain) gsap.set(curtain, { display: 'none' });
    window.__maskariaIntroDone = true;
  } else {
    intro.play(0);
    /* 兜底：万一标签页在开屏期间被挂起（rAF 被节流），最多 5 秒后直接落到完成态，
       首页不会停在黑幕上。 */
    setTimeout(() => { if (!window.__maskariaIntroDone) intro.progress(1); }, 5000);
  }

  /* ══ 7 · 固定舞台的视差：四层各走各的速度 ═════════════════════════ */
  const bodyTrigger = { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: true };
  gsap.to('.stage__ghost', { yPercent: -7, ease: 'none', scrollTrigger: { ...bodyTrigger } });
  gsap.to('.stage__dots', { yPercent: -13, ease: 'none', scrollTrigger: { ...bodyTrigger } });
  gsap.to('.stage__slash', { yPercent: 9, ease: 'none', scrollTrigger: { ...bodyTrigger } });
  gsap.to('.stage__star', {
    yPercent: -30, rotate: 140, ease: 'none',
    scrollTrigger: { ...bodyTrigger },
  });

  /* 单独的浮动块：给多少像素，就按自己的滚动区间走多少（相纸、卡片） */
  for (const el of $$('[data-drift]')) {
    gsap.to(el, {
      y: Number(el.dataset.drift), ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  }

  /* ══ 8 · 每章一个镜头 ═════════════════════════════════════════════ */
  /* 擦除：一行一条，从左边擦过来。这是「一句话」那种段落专用的揭示方式。 */
  function wipeIn(scope, rows, at, step) {
    return gsap.from(rows, {
      clipPath: 'inset(0 100% 0 0)', duration: .62, stagger: step == null ? .085 : step, ease: 'power2.out',
    }, at == null ? 0 : at);
  }
  /* 拍上：整体从略微放大／歪着的地方砸到位。用于板块、卡片这类「一块东西」。 */
  function slamIn(targets, opts) {
    const o = opts || {};
    return gsap.from(targets, {
      scale: o.scale == null ? .84 : o.scale,
      rotate: o.rotate == null ? -2.5 : o.rotate,
      opacity: 0, duration: .5, stagger: o.stagger == null ? .1 : o.stagger,
      ease: 'back.out(1.5)',
    });
  }

  function scene(triggerEl, build, start) {
    ScrollTrigger.create({
      trigger: triggerEl,
      start: start || 'top 76%',
      once: true,
      onEnter() {
        const tl = gsap.timeline();
        build(tl);
      },
    });
  }

  /* 二 · 没人看见的那些事：声明与正文一行条擦过来，相纸自己转正 */
  const about = $('.band--about');
  if (about) scene(about, (tl) => {
    tl.from('.band--about .kicker', { opacity: 0, x: -24, duration: .45 }, 0)
      .add(wipeIn(null, $$('.band--about .say .wipe__row'), .12), 0)
      .from('.band--about .say', { scale: .94, rotate: -5, duration: .6, ease: 'back.out(1.4)' }, 0)
      .add(wipeIn(null, $$('.band--about .about__cols .wipe__row'), .45, .1), 0)
      .from('.band--about .photo--tilt', { opacity: 0, y: 60, rotate: -13, duration: .7, ease: 'back.out(1.3)' }, .5);
  });

  /* 三 · 五个属性：三块读数依次拍上，账目从左滑进来，进度条自己长出来 */
  const attrs = $('.band--attrs');
  if (attrs) scene(attrs, (tl) => {
    tl.from('.band--attrs .head .word', { y: 34, opacity: 0, duration: .5 }, 0)
      .from('.band--attrs .head .kicker', { opacity: 0, x: -20, duration: .4 }, .05)
      .add(slamIn($$('.band--attrs .fig'), { scale: .82, rotate: -4, stagger: .14 }), .1)
      .from('.band--attrs .ledger li', { opacity: 0, x: -46, duration: .45, stagger: .09 }, .3)
      .fromTo('.band--attrs .fig--big .fig__bar i', { scaleX: 0 }, { scaleX: 1, duration: .7, ease: 'power2.out' }, .55)
      .add(slamIn($$('.band--attrs .spec'), { scale: .88, stagger: .12 }), .5)
      .from('.band--attrs .tail-note', { opacity: 0, y: 20, duration: .45 }, .7);
  });

  /* 四 · 记一笔的四步：整节钉住，滚动进度推着四步横着走 */
  const flow = $('.band--flow');
  const flowRow = $('.flow');
  if (flow && flowRow) {
    const flowHead = $('.head--flow', flow);
    const flowRibbon = $('.flow__ribbon i');
    if (flowHead) gsap.from(flowHead, {
      y: 30, opacity: 0, duration: .5,
      scrollTrigger: { trigger: flow, start: 'top 82%', once: true },
    });

    const mm = gsap.matchMedia();
    mm.add({
      /* 桌面：钉住一整屏，滚动多少就推多少 */
      desktop: '(min-width: 761px)',
      /* 手机：钉住撤掉，一摞牌子依次拍上来 */
      mobile: '(max-width: 760px)',
    }, (ctx) => {
      const { desktop } = ctx.conditions;
      if (desktop) {
        const distance = () => Math.max(0, flowRow.scrollWidth - innerWidth + 40);
        if (flowRibbon) gsap.set(flowRibbon, { scaleX: 0, transformOrigin: 'left center' });
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: flow,
            start: 'top top',
            end: () => '+=' + (distance() + innerHeight * .8),
            pin: '.flow__pin',
            scrub: .6,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
        tl.to(flowRow, { x: () => -distance(), ease: 'none' }, 0);
        if (flowRibbon) tl.to(flowRibbon, { scaleX: 1, ease: 'none' }, 0);
        /* 走到谁面前，谁就立正、抬起来；走过的那块退回半格 */
        $$('.flow__p').forEach((p, i) => {
          const n = $$('.flow__p').length;
          tl.fromTo(p, { y: 26, scale: .94, opacity: .55 },
            { y: 0, scale: 1, opacity: 1, ease: 'power2.out', duration: .5 / n * 2 }, (i / n) * .78)
            .to(p, { opacity: .62, scale: .97, duration: .4 / n * 2 }, Math.min(.98, (i + 1.35) / n * .78));
        });
      } else {
        gsap.set('.flow__p', { clearProps: 'all' });
        const tl = gsap.timeline({
          scrollTrigger: { trigger: flow, start: 'top 72%', once: true },
        });
        $$('.flow__p').forEach((p, i) => {
          tl.from(p, { opacity: 0, y: 40, rotate: -2, duration: .5, ease: 'back.out(1.4)' }, i * .12);
        });
      }
    });
  }

  /* 五 · 一句话进去：左边原话擦过来，右边卡片拍出来，相纸从右边滑进来 */
  const say = $('.band--say');
  if (say) scene(say, (tl) => {
    tl.from('.band--say .head .word', { y: 32, opacity: 0, duration: .5 }, 0)
      .add(wipeIn(null, $$('.band--say .say2__in .wipe__row'), .1), .1)
      .add(slamIn($$('.band--say .frag--ledger'), { scale: .86, rotate: 2, stagger: 0 }), .2)
      .from('.band--say .say2__out .frag__gain, .band--say .say2__out .frag__big2', {
        clipPath: 'inset(0 100% 0 0)', duration: .45, stagger: .1, ease: 'power2.out',
      }, .42)
      .add(wipeIn(null, $$('.band--say .say2__out .body .wipe__row'), .55), 0)
      .from('.band--say .photo--say', { opacity: 0, x: 70, rotate: 14, duration: .65, ease: 'back.out(1.3)' }, .5);
  });

  /* 六 · 功能：索引一条条从两侧交错落位，被打开的那条翻成主色 */
  const list = $('.band--list');
  if (list) scene(list, (tl) => {
    tl.from('.band--list .word--giant', { y: 40, opacity: 0, duration: .55 }, 0)
      .from('.band--list .head .kicker', { opacity: 0, x: -20, duration: .4 }, .05)
      .from('.band--list .row', {
        opacity: 0, x: (i) => (i % 2 ? 60 : -60), duration: .45, stagger: .07, ease: 'power2.out',
      }, .16);
  });
  /* 展开一条：面板用 clip-path 从上往下刷开（不是改高度那种抖动） */
  for (const d of $$('.row')) {
    d.addEventListener('toggle', () => {
      const panel = $('.row__panel', d);
      if (!panel || reduced()) return;
      if (d.open) {
        gsap.fromTo(panel, { clipPath: 'inset(0 0 100% 0)' },
          { clipPath: 'inset(0 0 0% 0)', duration: .38, ease: 'power2.out', clearProps: 'clipPath' });
      }
    });
  }

  /* 七 · 换主题：牌子横着落位，舞台上旧的那块往左退、新的那块从右边进 */
  const skinsBand = $('.band--skins');
  let kvTimeline = null;
  function swapStage() {
    const shown = $$('.kv').find((k) => getComputedStyle(k).display !== 'none');
    if (!shown || reduced()) return;
    if (kvTimeline) kvTimeline.kill();
    kvTimeline = gsap.timeline()
      .fromTo(shown, { opacity: 0, x: 64 },
        { opacity: 1, x: 0, duration: .45, ease: 'power3.out', clearProps: 'opacity,transform' }, 0)
      .fromTo($('.kv__art', shown), { scale: .9, rotate: -4 },
        { scale: 1, rotate: 0, duration: .5, ease: 'back.out(1.3)', clearProps: 'transform' }, .05)
      .fromTo($$('.kv__txt > *', shown), { opacity: 0, x: 26 },
        { opacity: 1, x: 0, duration: .35, stagger: .045, clearProps: 'opacity,transform' }, .1);
  }
  if (skinsBand) {
    scene(skinsBand, (tl) => {
      tl.from('.band--skins .head .word', { y: 32, opacity: 0, duration: .5 }, 0)
        .from('.band--skins .lead', { opacity: 0, x: -28, duration: .5 }, .1)
        .from('.band--skins .sel__hint', { opacity: 0, x: -20, duration: .4 }, .15)
        .from('.band--skins .stab', { opacity: 0, x: -34, duration: .42, stagger: .07 }, .2)
        .from('.band--skins .sel__desc', { opacity: 0, y: 22, duration: .45 }, .5);
      swapStage();
    });
    for (const t of tabs) t.addEventListener('click', () => swapStage());
  }

  /* 八 · 两条硬规矩：两块声明从左右对撞进来，× 转着砸下，警示带刷过去 */
  const rules = $('.band--rules');
  if (rules) scene(rules, (tl) => {
    tl.from('.band--rules .head .word', { y: 32, opacity: 0, duration: .5 }, 0)
      .from('.band--rules .rules__a .say--s', { opacity: 0, x: -90, rotate: -9, duration: .6, ease: 'back.out(1.3)' }, .1)
      .from('.band--rules .rules__b .say--s', { opacity: 0, x: 90, rotate: 9, duration: .6, ease: 'back.out(1.3)' }, .18)
      .from('.band--rules [data-cross]', { opacity: 0, scale: 3.2, rotate: -80, duration: .5, stagger: .1, ease: 'back.out(1.6)' }, .3)
      .from('.band--rules .rules__mark + .say--s .say__row', {
        clipPath: 'inset(0 100% 0 0)', duration: .4, stagger: .08, ease: 'power2.out',
      }, .38)
      .from('.band--rules .rules__sub', { opacity: 0, y: 20, duration: .45 }, .6)
      .from('.band--rules .stamp', { opacity: 0, scale: 1.6, rotate: -30, duration: .45, ease: 'back.out(1.8)' }, .68)
      .fromTo('.band--rules .rules__tape', { scaleX: 0 }, { scaleX: 1, duration: .7, ease: 'power2.out' }, .62);
  });

  /* 九 · 名单：整块先进来，之后一次点亮一个名字（点灯在 §3 那台小机器里） */
  const thanks = $('.band--thanks');
  if (thanks) scene(thanks, (tl) => {
    tl.from('.band--thanks .head .word', { y: 32, opacity: 0, duration: .5 }, 0)
      .from('.band--thanks .names', { opacity: 0, y: 30, duration: .6 }, .12)
      .from('.band--thanks .body', { opacity: 0, y: 22, duration: .5 }, .3);
  });

  /* 十 · 完成到哪一步：三块读数各自起立，数字自己滚到位 */
  const stats = $('.band--stats');
  if (stats) scene(stats, (tl) => {
    tl.from('.band--stats .head .word', { y: 32, opacity: 0, duration: .5 }, 0)
      .from('.band--stats .stat', {
        opacity: 0, y: 54, rotate: -2, duration: .55, stagger: .14, ease: 'back.out(1.4)',
        onComplete() { for (const s of $$('.band--stats .stat')) countUp(s); },
      }, .12);
  });

  /* 十一 · 拿一份：相纸起立、两张界面片段先后进、命令行自己打出来 */
  const get = $('.band--get');
  if (get) scene(get, (tl) => {
    tl.from('.band--get .head .word', { y: 32, opacity: 0, duration: .5 }, 0)
      .from('.band--get .get__l > *', { opacity: 0, x: -30, duration: .45, stagger: .08 }, .1)
      .from('.band--get .photo--get', { opacity: 0, y: 60, rotate: -9, duration: .65, ease: 'back.out(1.3)' }, .18)
      .from('.band--get [data-float]', { opacity: 0, y: 34, duration: .5, stagger: .12 }, .32)
      .add(() => { const c = $('[data-type]'); if (c) typeOut(c); }, .5);
  });

  /* ══ 9 · 顶栏与滚动监听 ═══════════════════════════════════════════ */
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => scheduleRefresh(300));
  paintBar();

  /* ══ 10 · 锚点定位与收尾 ═══════════════════════════════════════════ */
  if (hashSkin) applySkin(hashSkin[1], hashSkin[2] ? '#' + hashSkin[2] : null);

  function settle() {
    ScrollTrigger.refresh();
    if (startAtAnchor) {
      const el = document.getElementById((location.hash || '').slice(1));
      if (el) jumpTo(el, false);
    }
    /* 钉住那一节的起止位置跟字体、图片有关，落定后再算一次 */
    setTimeout(() => ScrollTrigger.refresh(), 320);
  }
  if (document.readyState === 'complete') settle();
  else addEventListener('load', settle);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => scheduleRefresh(120));

  /* 系统在浏览中途改成「减少动态效果」：把所有东西停回完成态 */
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const onPrefChange = () => {
    if (!mq.matches) return;
    for (const t of ScrollTrigger.getAll()) t.kill();
    gsap.globalTimeline.clear();
    gsap.set(heroEls, { clearProps: 'all' });
    gsap.set(['.stage__ghost', '.stage__dots', '.stage__slash', '.stage__star', '[data-drift]'],
      { clearProps: 'all' });
    root.classList.remove('js');
  };
  mq.addEventListener ? mq.addEventListener('change', onPrefChange) : mq.addListener(onPrefChange);

  /* 黄色频道要用的衬线体先热一下：换过去时不闪 */
  if (document.fonts && document.fonts.load) {
    try { document.fonts.load('1em "Velvet Serif SC"'); } catch (e) { /* 加载失败就退到系统衬线 */ }
  }
})();
