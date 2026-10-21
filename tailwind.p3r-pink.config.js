/* 由 tools/integrate.mjs 从 demo\p3r-pink\tailwind.config.js 复制：只改了 content 指向 src/themes/p3r-pink。不要合并进根 tailwind.config.js。 */
import plugin from 'tailwindcss/plugin';

/**
 * 颜色全部映射到 --p3r-*（-rgb 三元组 → 支持 bg-p3r-rose/40 透明度修饰符），日/夜随 html.dark 自动切换。
 * Tailwind 色名用「粉版语义名」，括号里是真实变量名（接入时对照 HANDOFF §1）：
 *   rose(--p3r-blue) rose-deep(--p3r-blue-deep) ink ink-soft grey lilac(--p3r-cyan) blush(--p3r-cyan-pale)
 *   blush-faint(--p3r-cyan-faint) coral(--p3r-magenta) bg panel track chip …
 * ⚠️ 粉主题禁止蓝/青：不要用 Tailwind 内置 blue/sky/cyan/indigo/teal（scripts/color-audit.py 会报）。
 */
const v = (name) => `rgb(var(--p3r-${name}-rgb) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/themes/p3r-pink/**/*.{ts,tsx}'],
  darkMode: ['selector', ':root.dark'],
  theme: {
    extend: {
      colors: {
        p3r: {
          rose: v('blue'),
          'rose-deep': v('blue-deep'),
          'rose-ink': v('rose-ink'),
          ink: v('ink'),
          'ink-soft': v('ink-soft'),
          grey: v('grey'),
          lilac: v('cyan'),
          'lilac-ink': v('lilac-ink'),
          blush: v('cyan-pale'),
          'blush-faint': v('cyan-faint'),
          coral: v('magenta'),
          'coral-ink': v('coral-ink'),
          bg: v('bg'),
          panel: v('panel'),
          track: v('track'),
          chip: v('chip'),
          claim: v('claim'),
          blessing: v('blessing-ink'),
          'skill-locked': v('skill-locked'),
          'skill-badge': v('skill-badge'),
          ph: v('ph'),
          'on-rose': v('on-blue'),
          'on-ink': v('on-ink'),
          mulberry: v('mulberry'),
          cream: v('cream'),
          gold: v('gold'),
          amber: v('amber'),
          mint: v('mint'),
        },
      },
      fontFamily: {
        cond: 'var(--p3r-font-cond)',
        heavy: 'var(--p3r-font-heavy)',
        body: 'var(--p3r-font-body)',
      },
      fontSize: {
        // P3R 字号阶梯（移动端基准）：见 KIT.md「字号」
        '2xs': ['10px', { lineHeight: '14px' }],
        cap: ['11px', { lineHeight: '15px' }],
        meta: ['12px', { lineHeight: '16px' }],
        body: ['14px', { lineHeight: '20px' }],
        lead: ['16px', { lineHeight: '22px' }],
        h3: ['19px', { lineHeight: '24px' }],
        h2: ['26px', { lineHeight: '30px' }],
        h1: ['clamp(32px, 10vw, 46px)', { lineHeight: '0.98' }],
        mega: ['clamp(48px, 16vw, 96px)', { lineHeight: '0.86' }],
      },
      boxShadow: {
        p3r: 'var(--p3r-shadow)',
        'p3r-lg': 'var(--p3r-shadow-lg)',
        hard: 'var(--p3r-hard)',
        none: 'none',
      },
      transitionTimingFunction: {
        snap: 'var(--p3r-ease-snap)',
        out: 'var(--p3r-ease-out)',
      },
      transitionDuration: {
        instant: 'var(--p3r-dur-instant)',
        fast: 'var(--p3r-dur-fast)',
        base: 'var(--p3r-dur-base)',
        slow: 'var(--p3r-dur-slow)',
      },
      zIndex: {
        decor: 'var(--p3r-z-decor)',
        content: 'var(--p3r-z-content)',
        nav: 'var(--p3r-z-nav)',
        sheet: 'var(--p3r-z-sheet)',
        confirm: 'var(--p3r-z-confirm)',
        celebration: 'var(--p3r-z-celebration)',
        cutin: 'var(--p3r-z-cutin)',
        system: 'var(--p3r-z-system)',
        toast: 'var(--p3r-z-toast)',
        transition: 'var(--p3r-z-transition)',
        dev: 'var(--p3r-z-dev)',
      },
      maxWidth: { page: 'var(--p3r-page-max)' },
    },
  },
  plugins: [
    // 与真实仓库一致：宽屏左侧栏只在 <html class="layout-wide"> 时生效（src/ui/layoutMode.ts）
    plugin(({ addVariant }) => {
      addVariant('wide', '@media (min-width: 768px) { :root.layout-wide & }');
      addVariant('wide-lg', '@media (min-width: 1024px) { :root.layout-wide & }');
      addVariant('night', ':root.dark &');
      addVariant('lowmo', ':root[data-boldness="0"] &');
    }),
  ],
};
