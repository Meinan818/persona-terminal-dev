/* 由 tools/integrate.mjs 从 demo\p4g-yellow\tailwind.config.js 复制：只改了 content 指向 src/themes/p4g-yellow。不要合并进根 tailwind.config.js。 */
import plugin from 'tailwindcss/plugin';

/** 颜色全部映射到 --p4g-*（RGB 三元组 → 支持 bg-p4g-yellow/40 这类透明度修饰符）。
 *  语义色（stage/surface/ink/line/tag/select…）随 [data-p4g-mode] 自动切换日/夜。 */
const rgb = (name) => `rgb(var(--p4g-${name}-rgb) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/themes/p4g-yellow/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-p4g-mode="night"]'],
  theme: {
    extend: {
      colors: {
        p4g: {
          // 固定色板
          yellow: rgb('yellow'),
          'yellow-hi': rgb('yellow-hi'),
          'yellow-pale': rgb('yellow-pale'),
          cream: rgb('cream'),
          black: rgb('black'),
          white: rgb('white'),
          orange: rgb('orange'),
          'orange-deep': rgb('orange-deep'),
          red: rgb('red'),
          green: rgb('green'),
          cyan: rgb('cyan'),
          purple: rgb('purple'),
          blue: rgb('blue'),
          maroon: rgb('maroon'),
          brown: rgb('brown'),
          hp: rgb('hp'),
          sp: rgb('sp'),
          // 语义（日/夜自动切换）
          stage: rgb('stage'),
          surface: rgb('surface'),
          'surface-2': rgb('surface-2'),
          ink: rgb('ink'),
          'ink-soft': rgb('ink-soft'),
          muted: rgb('muted'),
          line: rgb('line'),
          accent: rgb('accent'),
          tag: rgb('tag'),
          select: rgb('select'),
          msg: rgb('msg'),
          danger: rgb('danger'),
          success: rgb('success'),
          info: rgb('info'),
          warn: rgb('warn'),
          'success-ink': rgb('success-ink'),
          'info-ink': rgb('info-ink'),
          'warn-ink': rgb('warn-ink'),
        },
      },
      fontFamily: {
        display: 'var(--p4g-font-display)',
        body: 'var(--p4g-font-body)',
        num: 'var(--p4g-font-num)',
      },
      fontSize: {
        // P4G 字号阶梯（移动端基准）：见 KIT.md「字号阶梯」
        '2xs': ['10px', { lineHeight: '14px' }],
        cap: ['11px', { lineHeight: '15px' }],
        meta: ['12px', { lineHeight: '16px' }],
        body: ['14px', { lineHeight: '20px' }],
        lead: ['16px', { lineHeight: '22px' }],
        h3: ['18px', { lineHeight: '24px' }],
        h2: ['22px', { lineHeight: '26px' }],
        h1: ['clamp(28px, 8vw, 40px)', { lineHeight: '1' }],
        mega: ['clamp(40px, 13vw, 72px)', { lineHeight: '0.9' }],
      },
      borderRadius: {
        none: 'var(--p4g-radius-0)',
        xs: 'var(--p4g-radius-xs)',
        sm: 'var(--p4g-radius-sm)',
        DEFAULT: 'var(--p4g-radius-md)',
        md: 'var(--p4g-radius-md)',
        lg: 'var(--p4g-radius-lg)',
        pill: 'var(--p4g-radius-pill)',
      },
      borderWidth: {
        hair: 'var(--p4g-stroke-hair)',
        thin: 'var(--p4g-stroke-thin)',
        DEFAULT: 'var(--p4g-stroke)',
        3: 'var(--p4g-stroke)',
        bold: 'var(--p4g-stroke-bold)',
      },
      boxShadow: {
        hard: '4px 4px 0 var(--p4g-shadow-color)',
        'hard-sm': '2px 2px 0 var(--p4g-shadow-color)',
        'hard-lg': '6px 6px 0 var(--p4g-shadow-color)',
        plate: '6px 6px 0 var(--p4g-msg-plate)',
        none: 'none',
      },
      transitionTimingFunction: {
        snap: 'var(--p4g-ease-snap)',
        out: 'var(--p4g-ease-out)',
        tv: 'var(--p4g-ease-tv)',
      },
      transitionDuration: {
        instant: 'var(--p4g-dur-instant)',
        fast: 'var(--p4g-dur-fast)',
        base: 'var(--p4g-dur-base)',
        slow: 'var(--p4g-dur-slow)',
      },
      zIndex: {
        decor: 'var(--p4g-z-decor)',
        content: 'var(--p4g-z-content)',
        nav: 'var(--p4g-z-nav)',
        sheet: 'var(--p4g-z-sheet)',
        confirm: 'var(--p4g-z-confirm)',
        celebration: 'var(--p4g-z-celebration)',
        cutin: 'var(--p4g-z-cutin)',
        system: 'var(--p4g-z-system)',
        toast: 'var(--p4g-z-toast)',
        transition: 'var(--p4g-z-transition)',
        dev: 'var(--p4g-z-dev)',
      },
      maxWidth: { page: 'var(--p4g-page-max)' },
    },
  },
  plugins: [
    // 与真实仓库一致：宽屏左侧栏布局只在 <html class="layout-wide"> 时生效（src/ui/layoutMode.ts）
    plugin(({ addVariant }) => {
      addVariant('wide', '@media (min-width: 768px) { :root.layout-wide & }');
      addVariant('wide-lg', '@media (min-width: 1024px) { :root.layout-wide & }');
      addVariant('night', '[data-p4g-mode="night"] &');
      addVariant('lowmo', '[data-p4g-motion="low"] &');
    }),
  ],
};
