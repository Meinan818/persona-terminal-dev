#!/usr/bin/env node
/**
 * P5R 红频道 · 给 src/App.tsx 加两行（接入件 · 不要改）。在正式仓库根目录运行：
 *   node scripts/p5r-red/patch-app.mjs            # 打补丁（已打过则什么都不做）
 *   node scripts/p5r-red/patch-app.mjs --check    # 只检查，不写
 *   node scripts/p5r-red/patch-app.mjs --revert   # 去掉这两行（回滚用）
 * 加的两行：
 *   ① 最后一条 import 之后：import RedChannelRoot from '@/p5r-red/RedChannelRoot';
 *   ② `if (error) { … }` 整块之后：  if ((uiChannel as string) === 'p5') return <RedChannelRoot battle={<BattleArena />} />;
 * 末行 RESULT: OK 才算成功。不要手改 App.tsx。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const f = resolve(process.cwd(), 'src/App.tsx');
const IMP = "import RedChannelRoot from '@/p5r-red/RedChannelRoot';";
// (uiChannel as string)：不让 TS 在这一行之后把 uiChannel 收窄成 'p3'|'p4'|'neutral'，否则后面 renderPage 里原有的 uiChannel === 'p5' 会报 TS2367
const RET = "  if ((uiChannel as string) === 'p5') return <RedChannelRoot battle={<BattleArena />} />;";
const fail = (m) => { console.log('✗ ' + m); console.log('RESULT: FAIL'); process.exit(1); };
if (!existsSync(f)) fail('找不到 src/App.tsx —— 请在正式仓库根目录运行');
let s = readFileSync(f, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';
const lines = s.split(/\r?\n/);
const has = (x) => lines.some((l) => l === x);
const mode = process.argv.includes('--revert') ? 'revert' : process.argv.includes('--check') ? 'check' : 'apply';

if (mode === 'revert') {
  const out = lines.filter((l) => l !== IMP && l !== RET);
  writeFileSync(f, out.join(nl));
  console.log(`已去掉 ${lines.length - out.length} 行`); console.log('RESULT: OK'); process.exit(0);
}
if (!/\bconst uiChannel = useUiChannel\(\)/.test(s)) fail('App.tsx 里找不到 `const uiChannel = useUiChannel()`（仓库版本不对？应为 7c88082）');
if (!/BattleArena/.test(s)) fail('App.tsx 里找不到 BattleArena（仓库版本不对？应为 7c88082）');
const iErr = lines.findIndex((l) => /^\s*if \(error\) \{\s*$/.test(l));
if (iErr < 0) fail('App.tsx 里找不到 `if (error) {`（仓库版本不对？应为 7c88082）');
const indent = lines[iErr].match(/^\s*/)[0];
let iEnd = -1; for (let i = iErr + 1; i < lines.length; i++) if (lines[i] === `${indent}}`) { iEnd = i; break; }
if (iEnd < 0) fail('找不到 `if (error) {` 块的结束括号');

if (mode === 'check') {
  const okImp = has(IMP), okRet = lines[iEnd + 1] === RET || lines[iEnd + 2] === RET;
  console.log(`import 行：${okImp ? '有' : '没有'}；红频道 return 行（紧跟 if (error) 块）：${okRet ? '有' : '没有'}`);
  console.log(okImp && okRet ? 'RESULT: OK' : 'RESULT: FAIL'); process.exit(okImp && okRet ? 0 : 1);
}
if (has(IMP) && has(RET)) { console.log('已经打过补丁，未改动'); console.log('RESULT: OK'); process.exit(0); }
if (has(IMP) !== has(RET)) fail('App.tsx 只有两行中的一行（被手改过？）——先 git checkout src/App.tsx 再运行');
lines.splice(iEnd + 1, 0, RET);
let iLastImp = -1; for (let i = 0; i < lines.length; i++) if (/^import\s.*from\s+['"][^'"]+['"];?\s*$/.test(lines[i]) || /^import\s+['"][^'"]+['"];?\s*$/.test(lines[i])) iLastImp = i;
if (iLastImp < 0) fail('找不到 import 语句');
lines.splice(iLastImp + 1, 0, IMP);
writeFileSync(f, lines.join(nl));
console.log(`已在第 ${iLastImp + 2} 行加 import，第 ${iEnd + 3} 行加红频道 return`);
console.log('RESULT: OK');
