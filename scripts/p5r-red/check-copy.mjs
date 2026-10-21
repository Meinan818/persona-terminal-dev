#!/usr/bin/env node
/**
 * P5R 红频道 · 原样拷贝校验（接入件 · 不要改）。在正式仓库根目录运行：
 *   node scripts/p5r-red/check-copy.mjs
 * 检查：
 *   1. scripts/p5r-red/MANIFEST.txt 里每个文件都在、sha256 一个字节不差（唯一例外：src/p5r-red/adapter/ 下的文件，允许改）
 *   2. src/p5r-red/ 里没有清单外的多余文件（不许往包里塞自己写的东西）
 *   3. src/App.tsx 恰好有两处接入：import RedChannelRoot + `if ((uiChannel as string) === 'p5') return <RedChannelRoot …/>`（在 `if (error)` 之后）
 *   4. src/p5r-red/ 以外的源码没有 import '@/p5r-red/…'（App.tsx 除外）——禁止把 demo 拆开混进旧页面
 *   5. 有 git 时：除 src/App.tsx、package.json、package-lock.json 外，正式仓库原有的已跟踪文件一个都没改
 * 末行 RESULT: OK 才算过；否则 RESULT: FAIL 并列出每一处问题。
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(process.argv.includes('--repo') ? process.argv[process.argv.indexOf('--repo') + 1] : process.cwd());
const problems = [];
const walk = (d) => (existsSync(d) ? readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; }) : []);
const ALLOWED = (p) => p.startsWith('src/p5r-red/adapter/');

// 1 · 清单
const manPath = resolve(here, 'MANIFEST.txt');
if (!existsSync(manPath)) { console.log('找不到 scripts/p5r-red/MANIFEST.txt'); console.log('RESULT: FAIL'); process.exit(1); }
const man = readFileSync(manPath, 'utf8').trim().split('\n').map((l) => { const i = l.indexOf('  '); return { sha: l.slice(0, i), path: l.slice(i + 2) }; });
let ok = 0, changedAdapter = 0;
for (const { sha, path } of man) {
  const f = resolve(repo, path);
  if (!existsSync(f)) { problems.push(`缺文件：${path}`); continue; }
  const h = createHash('sha256').update(readFileSync(f)).digest('hex');
  if (h !== sha) { if (ALLOWED(path)) { changedAdapter++; continue; } problems.push(`被改过：${path}`); continue; }
  ok++;
}
// 2 · 多余文件
const listed = new Set(man.map((m) => m.path));
for (const f of walk(resolve(repo, 'src/p5r-red'))) { const p = relative(repo, f).split('\\').join('/'); if (!listed.has(p) && !ALLOWED(p)) problems.push(`清单外多余文件：${p}`); }
// 3 · App.tsx
const appPath = resolve(repo, 'src/App.tsx');
if (!existsSync(appPath)) problems.push('找不到 src/App.tsx');
else {
  const app = readFileSync(appPath, 'utf8');
  const imp = app.match(/^import\s+RedChannelRoot\s+from\s+['"]@\/p5r-red\/RedChannelRoot['"];?\s*$/gm) || [];
  const ret = app.match(/^\s*if\s*\(\s*\(?\s*uiChannel(\s+as\s+string\s*\))?\s*===\s*['"]p5['"]\s*\)\s*return\s*<RedChannelRoot\b[^\n]*\/>;?\s*$/gm) || [];
  if (imp.length !== 1) problems.push(`src/App.tsx：应有且只有 1 行 import RedChannelRoot from '@/p5r-red/RedChannelRoot'（现在 ${imp.length} 行）`);
  if (ret.length !== 1) problems.push(`src/App.tsx：应有且只有 1 行 if ((uiChannel as string) === 'p5') return <RedChannelRoot … />（现在 ${ret.length} 行）`);
  const iErr = app.search(/\n\s*if\s*\(\s*error\s*\)\s*\{/), iRet = ret.length ? app.indexOf(ret[0]) : -1;
  if (iErr < 0) problems.push('src/App.tsx：找不到 `if (error) {` 早返回');
  else if (iRet >= 0 && iRet < iErr) problems.push('src/App.tsx：红频道那一行必须放在 `if (error) { … }` 之后（之前会跳过开屏 / 加载 / 报错页）');
  const refs = (app.match(/p5r-red/g) || []).length;
  if (refs !== 1) problems.push(`src/App.tsx：除那 1 行 import 外不许再引用 p5r-red（现在出现 ${refs} 次）`);
}
// 4 · 混接
for (const f of walk(resolve(repo, 'src')).filter((x) => /\.(tsx?|css)$/.test(x))) {
  const p = relative(repo, f).split('\\').join('/');
  if (p.startsWith('src/p5r-red/') || p === 'src/App.tsx') continue;
  if (/['"]@\/p5r-red\/|['"][./]+p5r-red\//.test(readFileSync(f, 'utf8'))) problems.push(`混接：${p} 引用了 p5r-red（只许 src/App.tsx 引用 RedChannelRoot）`);
}
// 5 · git
try {
  const out = execFileSync('git', ['status', '--porcelain'], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const OKMOD = new Set(['src/App.tsx', 'package.json', 'package-lock.json']);
  for (const line of out.split('\n').filter(Boolean)) {
    const st = line.slice(0, 2), p = line.slice(3).replace(/^"|"$/g, '');
    if (st.includes('?')) continue; // 新增文件（src/p5r-red、public/slots、scripts/p5r-red、p5r-red-verify.html）在上面已逐个校验
    if (!OKMOD.has(p)) problems.push(`禁改文件被改：${p}（${st.trim()}）`);
  }
} catch { console.log('（没有 git，跳过第 5 项）'); }

console.log(`清单 ${man.length} 个文件：一致 ${ok}，adapter 已改 ${changedAdapter}（允许）`);
if (problems.length) { problems.slice(0, 200).forEach((p) => console.log('✗ ' + p)); console.log(`RESULT: FAIL（${problems.length} 处）`); process.exit(1); }
console.log('RESULT: OK');
