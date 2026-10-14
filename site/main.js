/* MASKARIA 官网 demo · 脚本
 *
 * 只做四件事，没有框架、没有请求、没有第三方：
 *   1. 换皮肤——四块语言牌（加上海蓝/玫瑰、六个主色），整页跟着换一整套设计语言；
 *   2. 顶栏换墨——顶栏的底和字跟着它下面那一章走（章节色场的「色随章走」）；
 *   3. 入场——每个章节的件按阅读顺序依次进场，一次，不重播；
 *   4. 致谢名单的灯——一次一个名字亮起来。
 *
 * 所有动效都在 CSS 的 prefers-reduced-motion: no-preference 里，脚本只负责加类。
 * 脚本挂了/关了：默认那套红色皮肤照样是完成态。
 */
(() => {
  'use strict';
  const root = document.documentElement;
  const FIELD_INK = (n) => getComputedStyle(root).getPropertyValue('--f' + n + '-fg').trim();
  const SKINS = ['red', 'water-blue', 'water-pink', 'yellow', 'custom'];

  /* ── 1 · 皮肤 ─────────────────────────────────────────────────── */
  const tiles = [...document.querySelectorAll('.stab')];
  const setters = [...document.querySelectorAll('[data-skin-set]')];
  let skinTimer = 0;

  function applySkin(name, accent) {
    if (!SKINS.includes(name)) name = 'red';
    root.classList.add('skinning');
    clearTimeout(skinTimer);
    skinTimer = setTimeout(() => root.classList.remove('skinning'), 460);

    root.dataset.skin = name;
    if (name === 'custom') {
      const a = accent || root.dataset.accent || '#3B82F6';
      root.dataset.accent = a;
      /* 整族从主色派生：大色块压暗到 62% 才托得住白字（六个色都过了 4.5:1），
         焦点环和色板预览仍用原色。 */
      const deep = 'color-mix(in srgb, ' + a + ' 62%, #000)';
      root.style.setProperty('--accent', deep);
      root.style.setProperty('--accent-2', a);
      root.style.setProperty('--on-accent', '#ffffff');
      root.style.setProperty('--card-chip', deep);
      root.style.setProperty('--card-hot', deep);
      root.style.setProperty('--btn', deep);
      root.style.setProperty('--btn-hover', 'color-mix(in srgb, ' + a + ' 48%, #000)');
    } else {
      for (const p of ['--accent', '--accent-2', '--on-accent', '--card-chip', '--card-hot', '--btn', '--btn-hover']) {
        root.style.removeProperty(p);
      }
      delete root.dataset.accent;
    }

    for (const s of setters) {
      if (s.classList.contains('stab')) s.setAttribute('aria-pressed', String(s.dataset.skinSet === name));
    }
    for (const t of tiles) {
      t.dataset.on = String(t.dataset.skinSet === name);
    }

    const tail = name === 'custom' && root.dataset.accent ? '-' + root.dataset.accent.replace('#', '') : '';
    history.replaceState(null, '', '#skin-' + name + tail);
    paintBar();
  }

  for (const s of setters) {
    s.addEventListener('click', (e) => {
      e.preventDefault();
      applySkin(s.dataset.skinSet, s.dataset.accent);
    });
  }

  const fromHash = (location.hash || '').match(/^#skin-([a-z-]+)(?:-([0-9a-fA-F]{6}))?$/);
  if (fromHash) applySkin(fromHash[1], fromHash[2] ? '#' + fromHash[2] : null);

  /* ── 2 · 顶栏换墨：取压在顶栏下面那一章的底与墨 ─────────────────── */
  const bands = [...document.querySelectorAll('.hero, .band, .foot')];
  let raf = 0;
  function paintBar() {
    if (!bands.length) return;
    const y = 30;
    let cur = bands[0];
    for (const b of bands) if (b.getBoundingClientRect().top <= y) cur = b;
    const cs = getComputedStyle(cur);
    const ink = cur.dataset.field ? FIELD_INK(cur.dataset.field) : cs.color;
    root.style.setProperty('--bar-bg', cs.backgroundColor);
    root.style.setProperty('--bar-ink', ink || cs.color);
  }
  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; paintBar(); });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  paintBar();

  /* ── 3 · 入场：每个件自己进场，一次，不重播 ─────────────────────── */
  const reveals = [...document.querySelectorAll('[data-reveal]')];
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    reveals.forEach((el, i) => {
      el.style.transitionDelay = (i % 4) * 70 + 'ms';
      io.observe(el);
    });
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* ── 4 · 致谢名单：一次亮一个名字 ───────────────────────────────── */
  const names = [...document.querySelectorAll('.names li')];
  if (names.length) {
    let idx = 0, timer = 0, inView = false;
    const tick = () => {
      names[idx % names.length].classList.remove('is-lit');
      idx += 1;
      names[idx % names.length].classList.add('is-lit');
    };
    const start = () => { if (!timer && inView && !document.hidden) timer = setInterval(tick, 2000); };
    const stop = () => { clearInterval(timer); timer = 0; };
    names[0].classList.add('is-lit');
    const host = names[0].closest('section, footer, div');
    if ('IntersectionObserver' in window && host) {
      new IntersectionObserver(([e]) => { inView = e.isIntersecting; inView ? start() : stop(); }, { threshold: 0.1 }).observe(host);
    } else { inView = true; start(); }
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  }

  /* ── 顺手：把黄频道要用的衬线体先热一下，换过去不闪 ─────────────── */
  if (document.fonts && document.fonts.load) {
    try { document.fonts.load('1em "Velvet Serif SC"'); } catch (e) { /* 加载失败就退到系统衬线 */ }
  }

  /* ── 5 · 章节标题拆成「赎金信」字母块 ─────────────────────────────────
     官方站的分区标题就是一块块字母拼的；这里把每个字包成一块，三色交替。
     没脚本时就是一行普通标题（CSS 里 :not(:has(span)) 接住）。 */
  for (const h of document.querySelectorAll('.p5t__cn')) {
    const text = (h.textContent || '').trim();
    if (!text) continue;
    h.textContent = '';
    for (const ch of text) {
      const s = document.createElement('span');
      s.textContent = ch;
      h.appendChild(s);
    }
  }

  /* ── 6 · 抠像的白描边：同一张面具的白色剪影垫在后面一圈 ───────────── */
  for (const art of document.querySelectorAll('.hero__art, .kv__art')) {
    const face = art.querySelector('.art__face');
    if (!face || art.querySelector('.art__key')) continue;
    const key = face.cloneNode(true);
    key.className = 'art__key';
    key.removeAttribute('loading');
    key.setAttribute('aria-hidden', 'true');
    key.setAttribute('alt', '');
    art.insertBefore(key, face);
  }

  /* ── 7 · 下滑时的视差：碎片、网点、爆裂星、幽灵大字各走一点点 ─────── */
  const parallax = [...document.querySelectorAll('.hero__kv svg, .hero__burst, .hero__dots, .ghost svg, .spark--star svg')];
  if (parallax.length && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let praf = 0;
    const walk = () => {
      const y = window.scrollY || 0;
      for (const el of parallax) {
        const speed = el.classList.contains('hero__kv') ? 0 : 0.05;
        el.style.transform = `translate3d(0,${(y * (el.dataset.speed || speed)).toFixed(2)}px,0)`;
      }
    };
    addEventListener('scroll', () => { if (!praf) praf = requestAnimationFrame(() => { praf = 0; walk(); }); }, { passive: true });
    walk();
  }
})();
