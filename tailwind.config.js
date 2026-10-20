import plugin from 'tailwindcss/plugin';

const p4gRgb = (name) => `rgb(var(--p4g-${name}-rgb) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // rgb + <alpha-value> 形式才能让透明度修饰符类（bg-primary/10 等）生成；
        // 三元组变量见 index.css 主题块与 store 的 applyCustomThemeColor
        primary: 'rgb(var(--color-primary-rgb, 59 130 246) / <alpha-value>)',
        secondary: 'var(--color-secondary)',
        // 域色（固定身份、不跟主题；三元组见 index.css :root）。透明度修饰符可用，
        // 如 bg-battle/30。battle 取深紫主色；亮紫 / 渐变末端在内联样式里走 rgb(var(--...-rgb))。
        battle: 'rgb(var(--color-battle-rgb, 124 58 237) / <alpha-value>)',
        bond: 'rgb(var(--color-bond-rgb, 99 102 241) / <alpha-value>)',
        gold: 'rgb(var(--color-gold-rgb, 245 158 11) / <alpha-value>)',
        p4g: {
          yellow: p4gRgb('yellow'),
          'yellow-hi': p4gRgb('yellow-hi'),
          'yellow-pale': p4gRgb('yellow-pale'),
          cream: p4gRgb('cream'),
          black: p4gRgb('black'),
          white: p4gRgb('white'),
          orange: p4gRgb('orange'),
          'orange-deep': p4gRgb('orange-deep'),
          red: p4gRgb('red'),
          green: p4gRgb('green'),
          cyan: p4gRgb('cyan'),
          purple: p4gRgb('purple'),
          blue: p4gRgb('blue'),
          maroon: p4gRgb('maroon'),
          brown: p4gRgb('brown'),
          hp: p4gRgb('hp'),
          sp: p4gRgb('sp'),
          stage: p4gRgb('stage'),
          surface: p4gRgb('surface'),
          'surface-2': p4gRgb('surface-2'),
          ink: p4gRgb('ink'),
          'ink-soft': p4gRgb('ink-soft'),
          muted: p4gRgb('muted'),
          line: p4gRgb('line'),
          accent: p4gRgb('accent'),
          tag: p4gRgb('tag'),
          select: p4gRgb('select'),
          msg: p4gRgb('msg'),
          danger: p4gRgb('danger'),
          success: p4gRgb('success'),
          info: p4gRgb('info'),
          warn: p4gRgb('warn'),
          'success-ink': p4gRgb('success-ink'),
          'info-ink': p4gRgb('info-ink'),
          'warn-ink': p4gRgb('warn-ink'),
        },
      },
      fontFamily: {
        'p4g-display': 'var(--p4g-font-display)',
        'p4g-body': 'var(--p4g-font-body)',
        'p4g-num': 'var(--p4g-font-num)',
      },
      fontSize: {
        // 字号阶梯最低档（UI_AUDIT_V2.5.md §4.1）：eyebrow/徽章/计数专用，
        // 替换全站 text-[9px]/[10px]/[11px] 任意值
        '2xs': ['10px', { lineHeight: '14px' }],
        'p4g-cap': ['11px', { lineHeight: '15px' }],
        'p4g-meta': ['12px', { lineHeight: '16px' }],
        'p4g-body': ['14px', { lineHeight: '20px' }],
        'p4g-lead': ['16px', { lineHeight: '22px' }],
        'p4g-h3': ['18px', { lineHeight: '24px' }],
        'p4g-h2': ['22px', { lineHeight: '26px' }],
        'p4g-h1': ['clamp(28px, 8vw, 40px)', { lineHeight: '1' }],
        'p4g-mega': ['clamp(40px, 13vw, 72px)', { lineHeight: '0.9' }],
      },
      borderRadius: {
        'p4g-xs': 'var(--p4g-radius-xs)',
        'p4g-sm': 'var(--p4g-radius-sm)',
        'p4g-md': 'var(--p4g-radius-md)',
        'p4g-lg': 'var(--p4g-radius-lg)',
        'p4g-pill': 'var(--p4g-radius-pill)',
      },
      borderWidth: {
        'p4g-hair': 'var(--p4g-stroke-hair)',
        'p4g-thin': 'var(--p4g-stroke-thin)',
        'p4g-3': 'var(--p4g-stroke)',
        'p4g-bold': 'var(--p4g-stroke-bold)',
      },
      boxShadow: {
        'p4g-hard': '4px 4px 0 var(--p4g-shadow-color)',
        'p4g-hard-sm': '2px 2px 0 var(--p4g-shadow-color)',
        'p4g-hard-lg': '6px 6px 0 var(--p4g-shadow-color)',
        'p4g-plate': '6px 6px 0 var(--p4g-msg-plate)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 20px var(--color-primary)' },
          '50%': { opacity: 0.8, boxShadow: '0 0 40px var(--color-primary)' },
        },
      },
    },
  },
  plugins: [
    // 宽屏布局（左侧栏）只在 <html class="layout-wide"> 时生效（第 20 批 · iPad，src/ui/layoutMode.ts）：
    // iPad / 宽横屏可以在设置里关掉左侧栏，关掉后不管多宽都是手机布局。
    // 换布局的样式一律写 wide: / wide-lg:，别再写 md: / lg:——那样手机布局在宽窗口里会半截变成桌面样式。
    plugin(({ addVariant }) => {
      addVariant('wide', '@media (min-width: 768px) { :root.layout-wide & }');
      addVariant('wide-lg', '@media (min-width: 1024px) { :root.layout-wide & }');
      addVariant('night', ':root.dark[data-ui-channel="p4"] &');
      addVariant('lowmo', ':root[data-boldness="0"] &');
    }),
  ],
}
