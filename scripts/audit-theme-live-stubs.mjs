// Read-only inventory of demo markers, fake-success timers, and disabled
// production paths. This is a triage aid; every hit still needs reachability
// confirmation before it is deleted or wired to a real service.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const out = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Pass a new evidence directory');
if (existsSync(out)) throw new Error('Evidence directory already exists; use a new directory');
mkdirSync(out, { recursive: true });

const roots = ['src/themes', 'src/p5r-red/screens', 'src/components/settings', 'src/pages'];
const extensions = new Set(['.ts', '.tsx']);
const excluded = /(?:^|[\\/])(?:__tests__|mock|demo-harness|legacy)(?:[\\/]|$)|\.test\./;
const patterns = [
  { id: 'disabled-production-path', re: /尚未启用|待启用|尚未接入|AI 接入等待确认|真实连接测试尚未|不生成占位内容/g },
  { id: 'explicit-demo-path', re: /（demo）|\(demo\)|正在导入…（demo）/g },
  { id: 'fake-success-timer', re: /setTimeout\([\s\S]{0,360}?(?:成功|完成|已同步|已恢复|已推送|已拉取)/g },
];

const files = [];
function walk(path) {
  for (const name of readdirSync(path).sort()) {
    const full = join(path, name);
    const info = statSync(full);
    if (info.isDirectory()) {
      if (!excluded.test(full)) walk(full);
      continue;
    }
    if (extensions.has(extname(full)) && !excluded.test(full)) files.push(full);
  }
}
for (const path of roots) {
  const full = resolve(root, path);
  if (existsSync(full)) walk(full);
}

const lineAt = (text, index) => text.slice(0, index).split('\n').length;
const candidates = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const pattern of patterns) {
    pattern.re.lastIndex = 0;
    for (const match of text.matchAll(pattern.re)) {
      const line = lineAt(text, match.index ?? 0);
      const sourceLine = text.split('\n')[line - 1]?.trim() ?? '';
      candidates.push({
        file: relative(root, file).replace(/\\/g, '/'),
        line,
        kind: pattern.id,
        match: match[0].replace(/\s+/g, ' ').slice(0, 220),
        sourceLine: sourceLine.slice(0, 260),
      });
    }
  }
}

const grouped = Object.fromEntries(patterns.map((pattern) => [
  pattern.id,
  candidates.filter((item) => item.kind === pattern.id),
]));
const report = {
  scope: 'Static triage only. Hits are not automatically defects; demo routes and unreachable previews must be ruled out before edits.',
  roots,
  filesScanned: files.length,
  totalCandidates: candidates.length,
  counts: Object.fromEntries(Object.entries(grouped).map(([key, value]) => [key, value.length])),
  candidates,
};
writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  ok: true,
  filesScanned: report.filesScanned,
  counts: report.counts,
  totalCandidates: report.totalCandidates,
  report: resolve(out, 'report.json'),
}, null, 2));
