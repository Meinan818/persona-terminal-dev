/** Compare the original ZIPs with the integration, without changing either.
 * Requires Windows PowerShell (ZIP reader) and the project's TypeScript.
 * File and registry presence are evidence of preservation, not working flows.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import ts from 'typescript';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  if (i < 0) return fallback;
  if (!process.argv[i + 1] || process.argv[i + 1].startsWith('--')) throw new Error(`Missing ${name}`);
  return resolve(process.argv[i + 1]);
};
const repo = arg('--repo', process.cwd());
const demos = arg('--demos', 'D:/下载/DEMO');
const cache = arg('--cache', 'E:/MASKARIA/.cache/demo-packages');
const out = arg('--out', resolve(repo, 'outputs', `theme-demo-audit-${new Date().toISOString().replace(/[:.]/g, '-')}`));
if (existsSync(out)) throw new Error(`Output already exists: ${out}`);
const quotePS = (s) => `'${s.replaceAll("'", "''")}'`;
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sensitive = (p) => /(?:^|[/\\])\.env(?:[./\\]|$)|credentials\.|private.*key|token|secret/i.test(p);

// The cache is only used for AST inspection after comparing every consumed
// file to its ZIP entry. A stale extraction cannot silently become the baseline.
const ps = String.raw`
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$repo=${quotePS(repo)}; $demos=${quotePS(demos)}; $cache=${quotePS(cache)}
function Hash-Bytes($b) {
  $h=[Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($h.ComputeHash($b))).Replace('-','').ToLowerInvariant() } finally {$h.Dispose()}
}
$themes=@('p3r-blue','p3r-pink','p4g-yellow','p5r-red')
$result=@(foreach($theme in $themes) {
  $zipPath=Join-Path $demos ($theme+'-demo.zip')
  $root=if($theme -eq 'p5r-red'){'p5r-red-demo'}else{$theme}
  $z=[IO.Compression.ZipFile]::OpenRead($zipPath)
  try {
    $rows=@(foreach($e in $z.Entries) {
      if($e.FullName.EndsWith('/')) {continue}
      $rel=$e.FullName.Substring($root.Length+1)
      if(!$e.FullName.StartsWith($root+'/') -or $rel -match '(^|/)\.\.(/|$)') {throw 'Unexpected ZIP path'}
      if($theme -eq 'p5r-red') {
        if(!$rel.StartsWith('integration/')) {continue}
        $dest=$rel.Substring(12)
      } else {
        if($rel.StartsWith('src/')) {$dest='src/themes/'+$theme+'/'+$rel.Substring(4)}
        elseif($rel.StartsWith('public/')) {$dest=$rel}
        else {continue}
      }
      $target=Join-Path $repo $dest
      $cached=Join-Path (Join-Path (Join-Path $cache ($theme+'-demo')) $root) $rel
      if($e.FullName -match '(^|/)\.env($|[./])|credentials\.|private.*key|token|secret') {
        [pscustomobject]@{source=$e.FullName;path=$dest;bytes=$e.Length;state=if([IO.File]::Exists($target)){'presence-only'}else{'missing'};hash=$null;targetHash=$null;cacheOK=$false}
        continue
      }
      $s=$e.Open(); $ms=[IO.MemoryStream]::new()
      try {$s.CopyTo($ms);$hash=Hash-Bytes ($ms.ToArray())}finally{$s.Dispose();$ms.Dispose()}
      $targetHash=if([IO.File]::Exists($target)){Hash-Bytes ([IO.File]::ReadAllBytes($target))}else{$null}
      $cacheOK=[IO.File]::Exists($cached) -and (Hash-Bytes ([IO.File]::ReadAllBytes($cached))) -eq $hash
      [pscustomobject]@{source=$e.FullName;path=$dest;bytes=$e.Length;hash=$hash;targetHash=$targetHash;cacheOK=$cacheOK;state=if(!$targetHash){'missing'}elseif($targetHash -eq $hash){'identical'}else{'changed'}}
    })
    [pscustomobject]@{theme=$theme;zip=$zipPath;zipHash=(Hash-Bytes ([IO.File]::ReadAllBytes($zipPath)));files=$rows}
  }finally{$z.Dispose()}
})
ConvertTo-Json -InputObject $result -Depth 6 -Compress
`;
const raw = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(ps, 'utf16le').toString('base64')], {
  encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, windowsHide: true,
}).replace(/^\uFEFF/, '');
const themes = JSON.parse(raw);
const sourcePath = (t, f) => resolve(cache, `${t.theme}-demo`, f.source);
const originalText = (t, f) => {
  if (!f.cacheOK) throw new Error(`Unverified cache: ${f.source}`);
  if (sensitive(f.source)) throw new Error('Sensitive path');
  return readFileSync(sourcePath(t, f), 'utf8');
};
const propertyName = (n) => n && (ts.isIdentifier(n) || ts.isStringLiteral(n) || ts.isNumericLiteral(n)) ? n.text : null;
const property = (obj, key) => obj.properties.find((p) => ts.isPropertyAssignment(p) && propertyName(p.name) === key)?.initializer;
function exportedLiteral(text, file, name) {
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  for (const stmt of ast.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const d of stmt.declarationList.declarations) {
      if (ts.isIdentifier(d.name) && d.name.text === name) return d.initializer;
    }
  }
  return undefined;
}
function registry(text, file, name) {
  const literal = exportedLiteral(text, file, name);
  if (!literal || !ts.isObjectLiteralExpression(literal)) throw new Error(`Registry is not a literal: ${file}`);
  return literal.properties.map((p) => propertyName(p.name)).filter(Boolean);
}
function inventory(text, file) {
  const literal = exportedLiteral(text, file, 'INVENTORY');
  if (!literal || !ts.isArrayLiteralExpression(literal)) throw new Error(`Inventory is not a literal: ${file}`);
  return literal.elements.filter(ts.isObjectLiteralExpression).map((obj) => Object.fromEntries(
    ['id', 'title', 'route', 'kind', 'demoFile'].map((key) => [key, propertyName(property(obj, key))]),
  ));
}
const category = (p) => /\.(png|webp|jpg|jpeg|gif|svg|woff2?|ttf|otf|mp3|ogg|wav|mp4)$/i.test(p) ? 'asset'
  : /\.(css)$/i.test(p) ? 'css' : p.includes('/registry/') ? 'registry' : p.includes('/screens/') ? 'screen'
    : /\/(fx|shell|kit|legacy)\//.test(p) ? 'visual-code' : 'other';
const normalizeAliases = (s) => s.replaceAll('\r\n', '\n').replace(/(['"])@(blue|pink|yellow)\//g, '$1@/');
for (const t of themes) {
  const groups = { pages: { original: [], current: [] }, overlays: { original: [], current: [] } };
  for (const f of t.files) {
    f.category = category(f.path);
    if (f.state === 'changed' && /\.(ts|tsx|css)$/.test(f.path)) {
      if (normalizeAliases(originalText(t, f)) === normalizeAliases(readFileSync(resolve(repo, f.path), 'utf8'))) f.state = 'alias-or-line-endings';
    }
    const match = f.path.match(/\/registry\/(pages|overlays)\.pkg\d+\.ts$/);
    if (!match) continue;
    const name = match[1];
    groups[name].original.push(...registry(originalText(t, f), f.path, name));
    if (f.state !== 'missing') groups[name].current.push(...registry(readFileSync(resolve(repo, f.path), 'utf8'), f.path, name));
  }
  const prefix = t.theme === 'p5r-red' ? 'src/p5r-red/' : `src/themes/${t.theme}/`;
  const invFile = t.files.find((f) => f.path === `${prefix}inventory.ts`);
  const original = inventory(originalText(t, invFile), invFile.path);
  const current = inventory(readFileSync(resolve(repo, invFile.path), 'utf8'), invFile.path);
  const currentIds = new Map(current.map((i) => [i.id, i]));
  t.registry = Object.fromEntries(Object.entries(groups).map(([name, { original: a, current: b }]) => [name, {
    original: new Set(a).size, current: new Set(b).size, missing: a.filter((k) => !b.includes(k)), added: b.filter((k) => !a.includes(k)),
  }]));
  t.inventory = {
    original: original.length, current: current.length,
    kinds: Object.fromEntries([...new Set(original.map((i) => i.kind))].map((kind) => [kind, original.filter((i) => i.kind === kind).length])),
    missing: original.filter((i) => !currentIds.has(i.id)),
    changedRoutes: original.filter((i) => currentIds.has(i.id) && currentIds.get(i.id).route !== i.route),
    unresolvedRoutes: original.filter((i) => {
      const m = i.route?.match(/^#\/(p|overlay)\/([^?]+)/);
      return m && !groups[m[1] === 'p' ? 'pages' : 'overlays'].current.includes(m[2]);
    }),
  };
  t.summary = Object.fromEntries(['identical', 'alias-or-line-endings', 'changed', 'missing', 'presence-only'].map((state) => [state, t.files.filter((f) => f.state === state).length]));
}
const report = {
  createdAt: new Date().toISOString(), repo,
  head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(),
  scope: 'Original ZIP source/public files (red: integration payload). Filename/registry/inventory comparison; not visual or functional acceptance. Sensitive paths: existence only.',
  themes,
};
const lines = [
  '# 四主题原始包对照', '', `时间：${report.createdAt}；HEAD：${report.head}`, '',
  '只核对原包文件、资源哈希、登记入口和清单。文件存在不代表功能已接通；哈希不同也不直接等于视觉丢失。含敏感命名的路径只检查是否存在，不读内容。', '',
  '| 主题 | 文件 | 原字节一致 | 仅别名/换行 | 有改动待审 | 缺文件 | 仅查存在 | 清单 | 页面入口 | 弹层入口 |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
];
for (const t of themes) {
  const s = t.summary;
  lines.push(`| ${t.theme} | ${t.files.length} | ${s.identical} | ${s['alias-or-line-endings']} | ${s.changed} | ${s.missing} | ${s['presence-only']} | ${t.inventory.current}/${t.inventory.original} | ${t.registry.pages.current}/${t.registry.pages.original} | ${t.registry.overlays.current}/${t.registry.overlays.original} |`);
}
for (const t of themes) {
  lines.push('', `## ${t.theme}`, '', `原包：${t.zip}`, '', `SHA-256：${t.zipHash}`, '');
  const assets = t.files.filter((f) => f.category === 'asset');
  const css = t.files.filter((f) => f.category === 'css');
  lines.push(`资源文件 ${assets.length}：原字节一致 ${assets.filter((f) => f.state === 'identical').length}，缺失 ${assets.filter((f) => f.state === 'missing').length}，有改动 ${assets.filter((f) => f.state === 'changed').length}。`, '',
    `CSS 文件 ${css.length}：改动 ${css.filter((f) => f.state === 'changed').length}；仅查存在 ${css.filter((f) => f.state === 'presence-only').length}。`, '',
    `缺清单项 ${t.inventory.missing.length}；清单路由改变 ${t.inventory.changedRoutes.length}；清单指向未登记入口 ${t.inventory.unresolvedRoutes.length}。`, '');
  for (const f of t.files.filter((f) => f.state === 'missing' || f.state === 'changed')) lines.push(`- ${f.state === 'missing' ? '缺失' : '改动待审'} [${f.category}]：${f.path}`);
  if (t.inventory.unresolvedRoutes.length) lines.push('', ...t.inventory.unresolvedRoutes.map((i) => `- 未登记：${i.id} → ${i.route}`));
}
mkdirSync(out, { recursive: true });
writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
writeFileSync(resolve(out, 'report.md'), lines.join('\n') + '\n', { flag: 'wx' });
console.log(`Report: ${relative(repo, resolve(out, 'report.md'))}`);
for (const t of themes) console.log(t.theme, JSON.stringify({ files: t.files.length, ...t.summary, inventory: t.inventory, registry: t.registry }));
if (themes.some((t) => t.summary.missing || t.inventory.missing.length || t.inventory.unresolvedRoutes.length || Object.values(t.registry).some((r) => r.missing.length))) process.exitCode = 1;
