#!/usr/bin/env node
/**
 * 三套主题 demo → 真实 App 的「机械接入」工具包（复制 / 别名 / 配置 / 隔离 / 胶水文件）。
 * 只做不需要判断力的步骤；数据接线（adapters）仍需按 INTEGRATE-THEMES.md 第 6 步手工做。
 *
 * 用法（在真实仓库根目录，即有 package.json 和 src/ 的那一层）：
 *   node <本文件路径> --theme all            # 三套全部（推荐）
 *   node <本文件路径> --theme yellow         # 只做黄（pink / blue 同理）
 *   node <本文件路径> --check                # 只检查，不写任何文件
 * 可选：--repo <真实仓库根>（默认当前目录） --demo <demo 根>（默认 <repo>/demo）
 *       --force-copy  已存在 src/themes/<dir> 时仍覆盖复制（会丢掉你在主题目录里的改动！默认不覆盖）
 *
 * 幂等：重复运行不会重复插入；每一步打印 [做了] / [跳过] / [错误]。
 * 不碰：src/pages、src/components、src/store 等旧代码（除了 App.tsx 插入 1 行开关 + 1 行 import、
 *       index.css 等旧样式的「:not([data-kit])」隔离闸）。
 */
import fs from 'node:fs';
import path from 'node:path';

// ───────────────────────── 参数 ─────────────────────────
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const has = (k) => argv.includes(k);
const REPO = path.resolve(arg('--repo', process.cwd()));
const DEMO = path.resolve(arg('--demo', path.join(REPO, 'demo')));
const CHECK = has('--check');
const FORCE_COPY = has('--force-copy');
const which = arg('--theme', 'all');

export const THEMES = {
  yellow: { demo: 'p4g-yellow', dir: 'p4g-yellow', alias: '@yellow' },
  pink: { demo: 'p3r-pink', dir: 'p3r-pink', alias: '@pink' },
  blue: { demo: 'p3r-blue', dir: 'p3r-blue', alias: '@blue' },
};
const selected = which === 'all' ? Object.keys(THEMES) : which.split(',');
for (const t of selected) if (!THEMES[t]) { console.error(`[错误] 未知主题 ${t}（只能是 yellow / pink / blue / all）`); process.exit(2); }

let errors = 0;
const log = (tag, msg) => console.log(`[${tag}] ${msg}`);
const done = (m) => log(CHECK ? '将做' : '做了', m);
const skip = (m) => log('跳过', m);
const fail = (m) => { errors++; log('错误', m); };
const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, s) => { if (CHECK) return; fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
const rel = (p) => path.relative(REPO, p) || '.';

if (!fs.existsSync(path.join(REPO, 'package.json')) || !fs.existsSync(path.join(REPO, 'src', 'App.tsx'))) {
  console.error(`[错误] ${REPO} 不是真实仓库根（找不到 package.json 或 src/App.tsx）。请 cd 到仓库根再运行。`);
  process.exit(2);
}

// ───────────────────────── 1. 复制 demo 源码 ─────────────────────────
const SKIP_NAMES = new Set(['node_modules', 'dist', 'shots', '.DS_Store']);
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP_NAMES.has(ent.name)) continue;
    const s = path.join(src, ent.name), d = path.join(dst, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else if (!fs.existsSync(d)) fs.copyFileSync(s, d);
  }
}
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

function stepCopy(t) {
  const { demo, dir } = THEMES[t];
  const src = path.join(DEMO, demo, 'src');
  const dst = path.join(REPO, 'src', 'themes', dir);
  if (!fs.existsSync(src)) return fail(`找不到 demo 源码 ${src}`);
  if (fs.existsSync(dst) && !FORCE_COPY) return skip(`${rel(dst)} 已存在（不覆盖；要重来先删掉该目录或加 --force-copy）`);
  if (FORCE_COPY && fs.existsSync(dst) && !CHECK) fs.rmSync(dst, { recursive: true, force: true });
  if (!CHECK) copyDir(src, dst);
  // demo 的入口文件不用（ThemeApp.tsx 代替它）
  if (!CHECK) for (const f of ['main.tsx', 'vite-env.d.ts']) { const p = path.join(dst, f); if (fs.existsSync(p)) fs.rmSync(p); }
  done(`复制 ${rel(src)} → ${rel(dst)}（排除 node_modules/dist/shots，删掉 demo 的 main.tsx）`);
}

// ───────────────────────── 2. 改写 import 别名 ─────────────────────────
function stepRewrite(t) {
  const { dir, alias } = THEMES[t];
  const root = path.join(REPO, 'src', 'themes', dir);
  let n = 0;
  for (const f of walk(root)) {
    if (!/\.(tsx?|css)$/.test(f)) continue;
    const s = read(f);
    let o = s
      // demo 的 @/ = demo 自己的 src → 改成主题别名
      .replace(/(['"])@\/(?!\/)/g, `$1${alias}/`)
      // demo 的 @real/ = 真实仓库 src → 真实仓库里就是 @/
      .replace(/(['"])@real\//g, '$1@/');
    // 数据层：页面 / 弹窗 / 外壳 import mock → 改为 import adapters（adapters 初始 = 原样转发 mock，外观不变）
    if (!f.includes(`${path.sep}mock${path.sep}`) && !f.includes(`${path.sep}adapters${path.sep}`)) {
      o = o.replace(new RegExp(`(['"])${alias.replace('/', '\\/')}/mock/`, 'g'), `$1${alias}/adapters/`);
    }
    if (o !== s) { n++; if (!CHECK) fs.writeFileSync(f, o); }
  }
  if (!fs.existsSync(root)) return CHECK ? done(`${rel(root)}：复制后改写 import`) : fail(`${rel(root)} 不存在`);
  n ? done(`${rel(root)}：改写 ${n} 个文件的 import（@/→${alias}/，@real/→@/，mock→adapters）`) : skip(`${rel(root)} import 已改写过`);
}

// ───────────────────────── 3. adapters 初始层（原样转发 mock） ─────────────────────────
function stepAdapters(t) {
  const { dir } = THEMES[t];
  const root = path.join(REPO, 'src', 'themes', dir);
  const mockDir = path.join(root, 'mock');
  if (!fs.existsSync(mockDir)) return CHECK ? done(`${rel(root)}/adapters：复制后生成转发文件`) : fail(`${rel(mockDir)} 不存在（先跑复制步骤）`);
  let n = 0;
  for (const f of fs.readdirSync(mockDir)) {
    if (!/\.ts$/.test(f)) continue;
    const mod = f.replace(/\.ts$/, '');
    const p = path.join(root, 'adapters', `${mod}.ts`);
    if (fs.existsSync(p)) continue;
    write(p, `/**
 * 数据适配层：${mod}
 * 初始状态 = 原样转发 demo 假数据（外观与 demo 完全一致，用来先验收版式）。
 * 接真实数据时：在下面「真实数据覆盖区」写同名导出覆盖掉 mock 的同名导出（ES 规则：本文件显式导出优先于 export *）。
 * 规则：只在这里接 store / utils，不改 screens/ 里的 JSX、className、style、动画。
 */
export * from '../mock/${mod}';

// ───── 真实数据覆盖区（按 INTEGRATE-THEMES.md 第 6 步填写）─────
`);
    n++;
  }
  n ? done(`${rel(root)}/adapters：生成 ${n} 个转发文件`) : skip(`${rel(root)}/adapters 已存在`);
}

// ───────────────────────── 4. 主题入口 ThemeApp.tsx + 桥接 ─────────────────────────
function stepThemeApp(t) {
  const { demo, dir, alias } = THEMES[t];
  const root = path.join(REPO, 'src', 'themes', dir);
  const mainSrc = path.join(DEMO, demo, 'src', 'main.tsx');
  if (!fs.existsSync(mainSrc)) return fail(`找不到 ${mainSrc}`);
  // 4a. 收敛 demo 的 App.tsx：调试路由（索引 / Kit / 弹层预览）只在开发环境挂
  const appP = path.join(root, 'App.tsx');
  if (CHECK && !fs.existsSync(root)) done(`${rel(appP)}：复制后收敛调试路由`);
  if (fs.existsSync(appP)) {
    const s = read(appP);
    if (!s.includes('KIT_DEV_ROUTES')) {
      let o = s.replace(/(\s*)(<Route path="\/(?:__index|__kit|overlay\/:id)"[^\n]*\/>)/g, '$1{KIT_DEV_ROUTES && $2}');
      o = o.replace(/(import [^\n]+\n)(?![\s\S]*import [^\n]+\n)/, `$1/** 调试路由（#/__index、#/__kit、#/overlay/:id）只在 npm run dev 或 URL 带 ?__kitdev=1 时挂载 */\nconst KIT_DEV_ROUTES = import.meta.env.DEV || location.search.includes('__kitdev=1');\n`);
      if (o !== s) { write(appP, o); done(`${rel(appP)}：调试路由改为仅开发环境挂载`); }
      else fail(`${rel(appP)}：没找到 <Route path="/__index" …/> 这类行，调试路由未收敛（手动用 KIT_DEV_ROUTES && 包起来）`);
    } else skip(`${rel(appP)} 调试路由已收敛`);
  }
  // 4b. ThemeApp.tsx：= demo main.tsx 的 CSS import + init 调用，渲染 demo 的 App，外加两座桥
  const p = path.join(root, 'ThemeApp.tsx');
  if (fs.existsSync(p)) return skip(`${rel(p)} 已存在`);
  const main = read(mainSrc);
  const cssImports = [...main.matchAll(/^import '(\.\/[^']+\.css)';$/gm)].map((m) => m[1]);
  const initImports = [...main.matchAll(/^import \{([^}]+)\} from '@\/([^']+)';$/gm)].filter((m) => !/react/.test(m[2]));
  const initCalls = [...main.matchAll(/^(\w+)\(\);$/gm)].map((m) => m[1]);
  write(p, `/**
 * ${t} 主题整套入口（由 tools/integrate.mjs 生成，可手改）。
 * 等价于 demo 的 src/main.tsx：同样的 CSS 引入顺序 + 同样的 init 调用，渲染 demo 原 App（HashRouter + 外壳 + 页面注册表）。
 * 两座桥：RouteBridge（store.currentPage ⇄ #/p/<page>）、PrefsBridge（settings.darkMode / 低动效 ⇄ demo prefs）。
 */
${cssImports.map((c) => `import '${c}';`).join('\n')}
import DemoApp from './App';
${initImports.map((m) => `import {${m[1]}} from '${alias}/${m[2]}';`).join('\n')}
import { RouteBridge } from './bridge/RouteBridge';
import { PrefsBridge } from './bridge/PrefsBridge';
import { GlobalOverlayHost } from './bridge/GlobalOverlayHost';

let inited = false;
function initOnce() {
  if (inited) return;
  inited = true;
${initCalls.map((c) => `  ${c}();`).join('\n')}
}

export default function ThemeApp() {
  initOnce();
  return (
    <>
      <PrefsBridge />
      <RouteBridge />
      <DemoApp />
      <GlobalOverlayHost />
    </>
  );
}
`);
  done(`生成 ${rel(p)}（CSS：${cssImports.join(', ')}；init：${initCalls.join(', ') || '无'}）`);
  // 4c. RouteBridge
  const rb = path.join(root, 'bridge', 'RouteBridge.tsx');
  if (!fs.existsSync(rb)) {
    write(rb, `/**
 * 路由桥：demo 用 HashRouter（#/p/<pageId>?tab=…），真实 App 用 useAppStore.currentPage。
 *  - 地址变化 → setCurrentPage(pageId)（真实代码里读 currentPage 的逻辑照常工作）
 *  - 别处调用 setCurrentPage('ledger')（通知、旧逻辑）→ 跳到 #/p/ledger（走 demo 的转场）
 */
import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { navigate, normalizePage } from '${alias}/shell/shellBus';

const pageOfHash = (): { page: string; tab?: string } => {
  const h = window.location.hash.replace(/^#/, '') || '/';
  const [pathPart, qs] = h.split('?');
  const q = new URLSearchParams(qs || '');
  const m = pathPart.match(/^\\/p\\/([\\w-]+)/);
  if (m) return { page: m[1], tab: q.get('tab') ?? undefined };
  return { page: pathPart === '/' ? 'dashboard' : '' };
};

export function RouteBridge() {
  // 地址 → store
  useEffect(() => {
    const sync = () => {
      const { page, tab } = pageOfHash();
      if (!page) return; // #/overlay/… #/__index 等调试路由不同步
      const st = useAppStore.getState();
      if (st.currentPage !== page) useAppStore.setState({ currentPage: page });
      if (page === 'actions' && (tab === 'todos' || tab === 'activities') && st.actionsSubTab !== tab) st.setActionsSubTab(tab);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  // store → 地址
  useEffect(() => useAppStore.subscribe((s, prev) => {
    if (s.currentPage === prev.currentPage) return;
    const cur = pageOfHash().page;
    const n = normalizePage(s.currentPage);
    if (cur !== n.pageId) navigate(s.currentPage);
  }), []);
  return null;
}
`);
    done(`生成 ${rel(rb)}`);
  }
  // 4d. PrefsBridge
  const pb = path.join(root, 'bridge', 'PrefsBridge.tsx');
  if (!fs.existsSync(pb)) {
    write(pb, `/**
 * 偏好桥：真实设置 → demo 外壳偏好（demo 原来由 Dev 胶囊 / localStorage 控制）。
 *   settings.darkMode → prefs.mode（日/夜）
 *   useBoldness()===false（校直 / 系统减弱动效 / 低帧降级）→ prefs.motion='low'
 *   生产环境隐藏 Dev 胶囊（devHidden）；开发时 URL 带 ?__dev=1 可显示
 */
import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { useBoldness } from '@/utils/boldness';
import { setPrefs, getPrefs } from '${alias}/lib/prefs';

export function PrefsBridge() {
  const dark = useAppStore((s) => !!s.settings.darkMode);
  const bold = useBoldness();
  useEffect(() => {
    const want = { mode: (dark ? 'night' : 'day') as 'night' | 'day', motion: (bold ? 'full' : 'low') as 'full' | 'low', devHidden: !(import.meta.env.DEV && location.search.includes('__dev=1')) };
    const p = getPrefs();
    if (p.mode !== want.mode || p.motion !== want.motion || p.devHidden !== want.devHidden) setPrefs(want);
  }, [dark, bold]);
  return null;
}
`);
    done(`生成 ${rel(pb)}`);
  }
  // 4e. GlobalOverlayHost（空壳，第 7 步按表填）
  const gh = path.join(root, 'bridge', 'GlobalOverlayHost.tsx');
  if (!fs.existsSync(gh)) {
    write(gh, `/**
 * 全局弹层宿主：真实 App.tsx 顶层由 store 状态触发的弹层/演出（升级、成就、技能、愿望进度、宣告卡结算、
 * BIG DEAL 收官、组织庆祝、羁绊升级、星移、同步冲突…）在这里改挂 demo 版本。
 * 按 INTEGRATE-THEMES.md 第 7 步的表逐个填写；未填的演出在主题下不会出现（=漏演出，验收不通过）。
 */
export function GlobalOverlayHost() {
  return null;
}
`);
    done(`生成 ${rel(gh)}`);
  }
}

// ───────────────────────── 5. KitHost（按 user.theme 选整套） ─────────────────────────
function stepKitHost() {
  const p = path.join(REPO, 'src', 'themes', 'KitHost.tsx');
  // 工具自有文件：每次按「src/themes 下实际存在的主题目录」重新生成（不要手改）
  const present = Object.entries(THEMES).filter(([, v]) => fs.existsSync(path.join(REPO, 'src', 'themes', v.dir, 'ThemeApp.tsx')) || CHECK);
  if (!present.length) return fail('src/themes 下没有任何主题目录');
  const body = `/**
 * 【工具生成，勿手改；重跑 tools/integrate.mjs 会覆盖】主题整套切换。
 * user.theme ∈ {${present.map(([k]) => k).join(', ')}} → 渲染对应 src/themes/<dir>/ThemeApp（整页替换，不再走旧页面）。
 * 其余主题（red / custom / 尚未接入的）→ kitThemeOf 返回 null，App.tsx 照旧渲染旧界面（红色 p5 一行不改）。
 * 紧急回退：浏览器控制台执行 localStorage.setItem('kit:off','1'); location.reload()  → 全部回旧界面。
 */
import { lazy, Suspense, useEffect, useLayoutEffect } from 'react';
import type { ThemeType } from '@/types';

const LOADERS = {
${present.map(([k, v]) => `  ${k}: lazy(() => import('${v.alias}/ThemeApp')),`).join('\n')}
} as const;
export type KitTheme = keyof typeof LOADERS;
const KIT_NAME: Record<KitTheme, string> = { ${present.map(([k, v]) => `${k}: '${v.dir}'`).join(', ')} };

export const kitThemeOf = (theme: ThemeType | undefined | null): KitTheme | null => {
  try { if (localStorage.getItem('kit:off') === '1') return null; } catch { /* ignore */ }
  return theme && theme in LOADERS ? (theme as KitTheme) : null;
};

/** 记住本次加载的是哪套；切到另一套（或切回红/自定义）时整页刷新，保证同一时刻页面里只有一套主题的 CSS */
const LOADED_KEY = '__kitLoaded';
export function useKitReloadGuard(theme: ThemeType | undefined | null) {
  useEffect(() => {
    if (!theme) return; // 未登录 / 尚未读到用户时不判断
    const w = window as unknown as Record<string, string | null | undefined>;
    const now = kitThemeOf(theme);
    if (w[LOADED_KEY] === undefined) { w[LOADED_KEY] = now; return; }
    if (w[LOADED_KEY] !== now) window.location.reload();
  }, [theme]);
}

export function KitHost({ theme }: { theme: KitTheme }) {
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-kit', KIT_NAME[theme]);
    return () => document.documentElement.removeAttribute('data-kit');
  }, [theme]);
  const C = LOADERS[theme];
  return <Suspense fallback={null}><C /></Suspense>;
}
`;
  if (fs.existsSync(p) && read(p) === body) return skip(`${rel(p)} 已是最新`);
  write(p, body);
  done(`生成 ${rel(p)}（接入的主题：${present.map(([k]) => k).join(', ')}）`);
}

// ───────────────────────── 6. App.tsx 插入开关 ─────────────────────────
function stepAppTsx() {
  const p = path.join(REPO, 'src', 'App.tsx');
  let s = read(p);
  if (s.includes('kitThemeOf(')) return skip('src/App.tsx 已插入主题开关');
  const imp = "import { KitHost, kitThemeOf, useKitReloadGuard } from '@/themes/KitHost';\n";
  // import：放在第一行 import 之后
  s = s.replace(/^(import [^\n]+\n)/, `$1${imp}`);
  // 开关：插在 App 组件主 return 之前（该 return 前一行是注释「红频道（P5）不响应夜间」）
  const marker = /\n(\s*)return \(\n(\s*)\/\/ 红频道（P5）不响应夜间/;
  if (!marker.test(s)) return fail('src/App.tsx：找不到主 return（标记注释「红频道（P5）不响应夜间」）。请按 INTEGRATE-THEMES.md 第 3 步手动插入。');
  s = s.replace(marker, (m, ind, ind2) => `\n${ind}// 主题整套接入：黄/粉/蓝整页换成 src/themes/<dir>（红/自定义继续走下面旧界面）\n${ind}const kitTheme = kitThemeOf(user?.theme);\n${ind}if (user && kitTheme) return <KitHost theme={kitTheme} />;\n${ind}return (\n${ind2}// 红频道（P5）不响应夜间`);
  // reload guard：挂在 App 里第一个 useAppStore(s => s.currentPage) 之后（hook 必须在所有 return 之前）
  const hookMarker = /(\n(\s*)const currentPage = useAppStore\(s => s\.currentPage\);\n)/;
  if (!hookMarker.test(s)) return fail('src/App.tsx：找不到 `const currentPage = useAppStore(s => s.currentPage);`，useKitReloadGuard 未插入');
  s = s.replace(hookMarker, (m, all, ind) => `${all}${ind}useKitReloadGuard(useAppStore(s => s.user?.theme));\n`);
  write(p, s);
  done('src/App.tsx：插入 import + useKitReloadGuard + 「if (user && kitTheme) return <KitHost/>」');
}

// ───────────────────────── 7. vite / tsconfig / tailwind / package.json ─────────────────────────
function stepVite() {
  const p = path.join(REPO, 'vite.config.ts');
  let s = read(p); const o = s;
  for (const t of selected) {
    const { dir, alias } = THEMES[t];
    if (!s.includes(`'${alias}':`)) s = s.replace(/('@': path\.resolve\(__dirname, '\.\/src'\),)/, `$1\n      '${alias}': path.resolve(__dirname, './src/themes/${dir}'),`);
  }
  for (const dep of ['framer-motion', 'react-router-dom']) {
    if (!s.includes(`'${dep}'`)) s = s.replace(/(include: \[\n\s*)/, `$1'${dep}', `);
  }
  if (s !== o) { write(p, s); done(`vite.config.ts：加别名 ${selected.map((t) => THEMES[t].alias).join(' ')} + optimizeDeps.include 加 framer-motion / react-router-dom`); }
  else skip('vite.config.ts 已配置');
  if (!/'@yellow':|'@pink':|'@blue':/.test(s) && !CHECK) fail('vite.config.ts：别名没加上（找不到 `\'@\': path.resolve(__dirname, \'./src\'),` 这一行），请手动加');
}
function stepTsconfig() {
  const p = path.join(REPO, 'tsconfig.json');
  const j = JSON.parse(read(p));
  const co = j.compilerOptions; let changed = false;
  co.paths = co.paths || {};
  for (const t of selected) { const { dir, alias } = THEMES[t]; if (!co.paths[`${alias}/*`]) { co.paths[`${alias}/*`] = [`./src/themes/${dir}/*`]; changed = true; } }
  // demo 是在 noUnusedLocals/Parameters=false 下写的；真实仓库开着会让 tsc 在主题文件上报几十条「未使用变量」
  if (co.noUnusedLocals !== false || co.noUnusedParameters !== false) { co.noUnusedLocals = false; co.noUnusedParameters = false; changed = true; }
  if (changed) { write(p, JSON.stringify(j, null, 2) + '\n'); done('tsconfig.json：加 paths 别名；noUnusedLocals/noUnusedParameters 改 false（demo 代码按此编写）'); }
  else skip('tsconfig.json 已配置');
}
function stepTailwind(t) {
  const { demo, dir } = THEMES[t];
  const src = path.join(DEMO, demo, 'tailwind.config.js');
  const dst = path.join(REPO, `tailwind.${dir}.config.js`);
  if (!fs.existsSync(dst)) {
    let s = read(src);
    s = s.replace(/content:\s*\[[^\]]*\]/, `content: ['./src/themes/${dir}/**/*.{ts,tsx}']`);
    write(dst, `/* 由 tools/integrate.mjs 从 ${rel(src)} 复制：只改了 content 指向 src/themes/${dir}。不要合并进根 tailwind.config.js。 */\n${s}`);
    done(`生成 ${rel(dst)}`);
  } else skip(`${rel(dst)} 已存在`);
  // 主题 index.css 顶部加 @config，让这份 CSS 用自己的 tailwind 配置
  const css = path.join(REPO, 'src', 'themes', dir, 'index.css');
  if (!fs.existsSync(css)) return CHECK ? done(`${rel(css)}：复制后首行加 @config`) : fail(`${rel(css)} 不存在`);
  const c = read(css);
  if (c.includes('@config')) skip(`${rel(css)} 已有 @config`);
  else { write(css, `@config "../../../tailwind.${dir}.config.js";\n${c}`); done(`${rel(css)}：首行加 @config "../../../tailwind.${dir}.config.js"`); }
}
function stepRootTailwind() {
  const p = path.join(REPO, 'tailwind.config.js');
  let s = read(p);
  if (s.includes("!./src/themes/**")) return skip('tailwind.config.js 已排除 src/themes');
  s = s.replace(/("\.\/src\/\*\*\/\*\.\{js,ts,jsx,tsx\}",?)/, `$1\n    "!./src/themes/**",`);
  if (!s.includes('!./src/themes/**')) return fail('tailwind.config.js：没找到 "./src/**/*.{js,ts,jsx,tsx}"，请手动在 content 里加 "!./src/themes/**"');
  write(p, s); done('tailwind.config.js：content 加 "!./src/themes/**"（旧配置不再给主题代码生成同名工具类）');
}
function stepPackage() {
  const p = path.join(REPO, 'package.json');
  const j = JSON.parse(read(p));
  const want = { 'framer-motion': '11.18.2', 'react-router-dom': '6.30.1' };
  let changed = false;
  for (const [k, v] of Object.entries(want)) if (!j.dependencies[k]) { j.dependencies[k] = v; changed = true; }
  if (changed) { write(p, JSON.stringify(j, null, 2) + '\n'); done('package.json：dependencies 加 framer-motion@11.18.2、react-router-dom@6.30.1（版本钉死与 demo 一致）→ 之后必须 npm install'); }
  else skip('package.json 依赖已在');
}

// ───────────────────────── 8. public 素材 ─────────────────────────
function stepPublic(t) {
  const { demo } = THEMES[t];
  const src = path.join(DEMO, demo, 'public', 'assets');
  const dst = path.join(REPO, 'public', 'assets');
  if (!fs.existsSync(src)) return skip(`${rel(src)} 不存在`);
  let n = 0;
  for (const f of walk(src)) {
    const d = path.join(dst, path.relative(src, f));
    if (!fs.existsSync(d)) { n++; if (!CHECK) { fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(f, d); } }
  }
  n ? done(`复制 ${n} 个素材 ${rel(src)} → ${rel(dst)}（不覆盖已有文件）`) : skip(`${t} 素材已在 public/assets`);
}

// ───────────────────────── 9. 旧样式隔离闸 ─────────────────────────
/** 旧 CSS 里「按频道/主题一刀切」的后代规则（:root[data-ui-channel="p4"] … button / .text-gray-700 / input …）
 *  会用 !important 盖掉 demo 的文字颜色/字体/圆角。给这些选择器加 :not([data-kit])：主题整套接入时（<html data-kit>）失效，
 *  红/自定义及回退旧界面时（无 data-kit）完全照旧。只处理带后代选择器的规则；只定义变量的块不动；p5（红）不动。 */
export function guardCss(text) {
  let count = 0;
  const KEYS = ['data-ui-channel="p4"', "data-ui-channel='p4'", 'data-ui-channel="p3"', "data-ui-channel='p3'", 'data-theme="yellow"', 'data-theme="pink"', 'data-theme="blue"'];
  // 只改「选择器」部分：逐个 {…} 块前的选择器文本
  const out = text.replace(/(^|[}\n;])([^{}@;]*?)\{/g, (whole, lead, sel) => {
    if (!KEYS.some((k) => sel.includes(k))) return whole;
    const parts = sel.split(',');
    const fixed = parts.map((part) => {
      if (part.includes(':not([data-kit])')) return part;
      if (!KEYS.some((k) => part.includes(k))) return part;
      // 是否有后代/子选择器：key 所在复合选择器之后还有空格/>/+/~ 接其他选择器
      const m = part.match(/(:root(?:\.dark)?|html(?:\.dark)?)?(\[(?:data-ui-channel|data-theme)=['"][^'"]+['"]\])([^\s>+~]*)(\s*[>+~]?\s*)(\S.*)?$/s);
      if (!m) return part;
      const after = (m[5] || '').trim();
      if (!after) return part; // 纯变量块：:root[data-ui-channel="p4"] { --x: … }
      count++;
      return part.replace(m[0], `${m[1] || ''}${m[2]}${m[3]}:not([data-kit])${m[4]}${m[5]}`);
    });
    return lead + fixed.join(',') + '{';
  });
  return { out, count };
}
function stepGuard() {
  const files = [path.join(REPO, 'src', 'index.css'), ...walk(path.join(REPO, 'src', 'styles')).filter((f) => f.endsWith('.css'))];
  for (const f of files) {
    const s = read(f);
    const { out, count } = guardCss(s);
    if (count) { write(f, out); done(`${rel(f)}：${count} 条旧的频道/主题后代规则加 :not([data-kit])`); }
    else skip(`${rel(f)}：无需隔离或已隔离`);
  }
}

// ───────────────────────── 10. 自检 ─────────────────────────
function stepVerify() {
  const problems = [];
  for (const t of selected) {
    const { dir } = THEMES[t];
    const root = path.join(REPO, 'src', 'themes', dir);
    for (const f of walk(root)) {
      if (!/\.tsx?$/.test(f)) continue;
      const s = read(f);
      if (/from '@\/(kit|fx|shell|lib|screens|registry|mock|tokens|assets|inventory|fxCatalog)\b/.test(s)) problems.push(`${rel(f)} 仍有 demo 的 @/ 引用`);
      if (/from '@real\//.test(s)) problems.push(`${rel(f)} 仍有 @real/ 引用`);
    }
    if (!fs.existsSync(path.join(root, 'ThemeApp.tsx'))) problems.push(`${rel(root)}/ThemeApp.tsx 缺失`);
  }
  if (!read(path.join(REPO, 'src', 'App.tsx')).includes('kitThemeOf(')) problems.push('src/App.tsx 未插入主题开关');
  if (problems.length) { problems.slice(0, 30).forEach((x) => fail(x)); }
  else log('通过', '自检：主题目录 import 已全部改写、入口与开关齐全');
}

// ───────────────────────── 执行 ─────────────────────────
console.log(`仓库：${REPO}\ndemo：${DEMO}\n主题：${selected.join(', ')}${CHECK ? '（--check 只检查不写）' : ''}\n`);
for (const t of selected) { console.log(`── ${t} ──`); stepCopy(t); stepRewrite(t); stepAdapters(t); stepThemeApp(t); stepTailwind(t); stepPublic(t); }
console.log('── 公共配置 ──');
stepKitHost(); stepAppTsx(); stepVite(); stepTsconfig(); stepRootTailwind(); stepPackage(); stepGuard();
if (!CHECK) { console.log('── 自检 ──'); stepVerify(); }
console.log(errors ? `\n结束：${errors} 个错误（看上面 [错误] 行，按 INTEGRATE-THEMES.md「常见错误」处理）` : '\n结束：0 错误。下一步：npm install && npm run build');
process.exit(errors ? 1 : 0);
