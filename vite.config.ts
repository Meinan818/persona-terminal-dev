import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json'

/** 普通网页构建允许本地/离线用途；正式 Android 包另由发布脚本严格校验产物。 */
function assertCloudEnv() {
  return {
    name: 'velvet-assert-cloud-env',
    apply: 'build' as const,
    configResolved(cfg: { env: Record<string, string> }) {
      const url = (cfg.env.VITE_API_URL ?? '').trim();
      if (!url) console.warn('云同步后端 VITE_API_URL 未配置，此构建仅供离线使用');
      else if (/^https?:\/\/(localhost|127\.)/i.test(url)) console.warn('当前构建使用本机开发后端，不可作为手机正式安装包发布');
      else console.log('云同步后端：' + url);
    },
  };
}

export default defineConfig({
  plugins: [
    assertCloudEnv(),
    react(),
    VitePWA({
      // ⚠️ 这里用 'prompt' 而不是 'autoUpdate'。原因：
      //   - autoUpdate 依赖浏览器自己调度 SW 更新检查；iOS Safari PWA 下这个调度很保守
      //     （进程不重启就几乎不检查），会导致用户一直拿不到新版本，误以为"热更新失效"。
      //   - prompt 模式下我们自己在页面里配合 useRegisterSW 定期调 registration.update()，
      //     检测到 waiting SW 时提示"立即更新"；用户确认后通过 SKIP_WAITING + reload 接管。
      //   - 现有的 PWAUpdateToast UI 就是 prompt 模式设计的（"✦ 有新版本可用 · 立即更新"）。
      registerType: 'prompt',
      workbox: {
        // webp 故意不进预缓存：塔罗三套共 66 张（~3.8 MB），全塞进安装包会显著拖慢
        // 首次安装与 iOS 的磁盘占用。改由下面的 runtimeCaching 在首次看到时收编。
        globPatterns: ['**/*.{js,css,html,ico,png,svg,mp3}'],
        /**
         * 上面那条 glob 是按**扩展名**扫 dist/ 的，扫不出"谁其实用不到"。
         * 两类东西因此被卷进了预缓存 —— 而 SW 安装时会把清单里的东西**全部**拉下来存好，
         * 于是每个装了 PWA 的用户都在为自己永远打不开的东西付下载和磁盘（实测 6.18 MB / 62 条）：
         *
         *   · eruda（485 KB）——手机调试台，只有 ?debug=1 才 init。
         *     main.tsx 那句"不带 ?debug=1 时 chunk 完全不下载"只对**动态 import** 成立，
         *     预缓存是从它背后绕过去的另一条路。
         *   · assets/terminal/*.png（p4-cloud-sky.png 单张 1.66 MB）——黄频道的实景云天舞台，
         *     只有 theme==='yellow' 用得到，却人人预下。
         *
         * 云天图改走下面的 runtimeCaching，与塔罗图 / 字体同口径：见过一次即长期离线可用。
         * eruda 干脆不缓存 —— 会开 ?debug=1 的人不在乎多等一次网络。
         */
        globIgnores: ['**/eruda-*.js', 'assets/terminal/*.png'],
        runtimeCaching: [
          {
            // 岁时四套共 176 张 WebP，按需加载并缓存，不加入首次安装预缓存。
            urlPattern: ({ url }) => url.pathname.startsWith('/season/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'season-art-v1',
              expiration: { maxEntries: 176, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // 黄频道实景舞台（见上方 globIgnores）。CacheFirst：素材是静态的，
            // 换图时文件名不变——真要换，改这里的 cacheName 版本号即可。
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/terminal/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'velvet-terminal-v1',
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/tarot/'),
            handler: 'CacheFirst',
            options: {
              // v1 → v2（2026-10-16）：服务器曾长时间缺少 public/tarot 目录，nginx 的
              // `try_files … /index.html` 把每个 /tarot/*.webp 请求都兜底成 200 的 HTML；
              // 本规则的 cacheableResponse 认 200 即成功，于是那批 HTML 被当成图片
              // 缓存了 180 天——素材补传上服务器后，老浏览器仍吐缓存里的 HTML、塔罗
              // 一直显示程序化占位卡（CacheFirst 根本不发网络请求）。
              // 换 cacheName 即弃用旧缓存桶，让客户端重新按网络取图。
              cacheName: 'tarot-art-v2',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // 内嵌中文字体子集（2.6 MB）。与塔罗图同一策略：**不进预缓存**，
            // 免得把 PWA 的首次安装体积顶上去；首屏用系统字兜底（font-display:swap），
            // 见过一次即长期离线可用。原生 APK 里这些文件本就打进安装包，走不到这条。
            urlPattern: ({ url }) => url.pathname.startsWith('/fonts/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'velvet-fonts-v1',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // 导航请求（HTML）→ 预缓存里的 index.html。
        // ⚠️ 这**不是** NetworkFirst（旧注释写错了，FS7 审查核对生成的 dist/sw.js 确认：
        // 全文只有一个 CacheFirst——塔罗图——加一个 createHandlerBoundToURL，无 NetworkFirst）。
        // 即：导航永远秒开缓存版；拿新版本靠的是 registerType:'prompt' 那条链——
        // PWAUpdateToast 启动时 registration.update() → 有 waiting SW → 弹「立即更新」。
        // 排查"更新不生效"时请顺着 SW 更新链看，不要去找并不存在的网络优先超时。
        navigateFallback: '/index.html',
        // 明确清理旧版本的预缓存条目，避免 iOS 磁盘上残留过多旧 chunk
        cleanupOutdatedCaches: true,
      },
      // 只列真实存在的文件：favicon.ico / masked-icon.svg 从来没进过 public/，
      // 挂在这里既不会报错也不会生效，纯粹是误导后来人的死配置（v2.6 上线前清掉）
      includeAssets: ['apple-touch-icon.png', 'icon.png'],
      manifest: {
        name: 'MASKARIA',
        short_name: 'MASKARIA',
        description: '个人成长追踪器',
        // 不写 lang 的话 vite-plugin-pwa 默认填 'en'——一个全中文的应用
        // 在系统/应用商店那里被标成英文，安装卡片与朗读都会走错语言
        lang: 'zh-CN',
        dir: 'ltr',
        /**
         * 应用身份。不写 id 时浏览器用 start_url 当身份：
         * 哪天 start_url 动一下（加个 query、换个入口路径），已装的 PWA 会被当成
         * **另一个应用**，用户桌面上多出一个图标、旧的那个成了孤儿。
         * 显式钉死一个与路径解耦的 id，是上线前最便宜的一道保险。
         */
        id: '/',
          theme_color: '#3B82F6',
          background_color: '#111827',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone'],
          orientation: 'portrait',
        scope: '/',
        start_url: '/',
        /**
         * any 与 maskable 必须是**两套图**，不能像原来那样一张图挂 'any maskable'。
         * 挂了 maskable 就等于告诉系统「这张图可以随便裁」，Android 会按圆 / squircle /
         * 泪滴各种遮罩去切，只有落在中心 80% 直径圆内的内容才保证不被切掉。
         * 实测原图的标记外接圆半径 239px，而安全半径只有 205px——四角会被啃掉一圈。
         * maskable-*.png 由 scripts/MaskariaIcons.java 把同一张图缩到 80% 居中生成（复核后半径 190px，进了安全区）。
         */
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // 只扫描应用入口：仓库内另有 Android 生成页、历史构建与素材预览，
  // 默认的 HTML 自动发现会把它们也卷进首次依赖扫描。
  optimizeDeps: {
    entries: ['index.html'],
    // 明确列出浏览器依赖，跳过冷启动时的全源码递归发现。
    // 新增浏览器 CJS 依赖时要同步此表；原生/构建 CLI 不进入浏览器预构建。
    noDiscovery: true,
    include: [
      'react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'motion/react',
      'gsap', 'gsap/DrawSVGPlugin', 'gsap/SplitText', 'gsap/MorphSVGPlugin', '@gsap/react',
      'dexie', 'dexie-react-hooks', 'zustand', 'zustand/react/shallow', 'dompurify', 'recharts', 'uuid',
      'embla-carousel', 'embla-carousel-react', 'tweakpane', 'eruda',
      '@capacitor/core', '@capacitor/app', '@capacitor/filesystem', '@capacitor/local-notifications', '@capacitor/share',
    ],
  },
  server: {
    // Vite 5 预转换首屏模块，避免浏览器拿到网址后再串行等待整条 import 链。
    warmup: {
      clientFiles: ['./src/main.tsx', './src/pages/p3/DashboardP3.tsx', './src/pages/p5/DashboardP5.tsx'],
    },
    watch: {
      // 打包产物不参与 HMR，否则 cap sync / Gradle 写 HTML 会重载正在使用的页面。
      ignored: ['**/android/**', '**/ios/**', '**/.rivet/**', '**/outputs/**'],
    },
  },
  define: {
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(pkg.version),
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          // motion v12 是薄壳，真实实现在其依赖的 framer-motion，两层归同一 chunk
          motion: ['motion', 'framer-motion'],
          // 动线层（DrawSVG 引导线、SplitText 标题逐字）；独立 chunk 优化缓存。
          // 插件是 gsap 的独立子入口（gsap/DrawSVGPlugin 等），不在 'gsap' 主入口的
          // 模块图里——必须逐个列出，否则会漏进体积庞大、改动频繁的 index 主 chunk。
          // 注：MorphSVGPlugin 暂不列入——它只被 dev-only 的 StarTearOverlay 用，列进
          // 来会被 manualChunks 强制打包、抵消 tree-shaking。真接入导航转场后再加回。
          gsap: ['gsap', 'gsap/DrawSVGPlugin', 'gsap/SplitText', '@gsap/react'],
          charts: ['recharts'],  // Dashboard 也依赖 recharts，需保留独立 chunk 以优化缓存
          db: ['dexie', 'dexie-react-hooks']
        }
      }
    }
  }
})
