import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';

const root = process.cwd();
const bin = path.join(
  root,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tailwindcss.cmd' : 'tailwindcss',
);
const outDir = path.join(root, 'src/styles/generated');
fs.mkdirSync(outDir, { recursive: true });

const jobs = [
  {
    name: 'p4g',
    config: 'tailwind.p4g-yellow.config.js',
    input: 'src/themes/p4g-yellow/tailwind-entry.css',
    scope: '[data-p4g-scope]',
  },
  {
    name: 'p3r',
    config: 'tailwind.p3r-blue.config.js',
    input: 'src/themes/p3r-blue/tailwind-entry.css',
    content: 'src/themes/p3r-blue/**/*.{ts,tsx},src/themes/p3r-pink/**/*.{ts,tsx}',
    scope: '[data-p3r-scope]',
  },
];

/** Tailwind 的 utility 是全局类名，直接引入会污染主应用与幽影协议。
 *  这里给每条规则加容器作用域：demo 渲染在 [data-p4g-scope] / [data-p3r-scope] 内，
 *  Portal 到 body 的弹层由宿主补同一个属性。demo 源码保持原样。 */
function scopeSelector(selector, scope) {
  const sel = selector.trim();
  if (!sel) return [];
  if (sel === 'body' || sel === 'html') return [scope];

  if (sel.startsWith(':root')) {
    if (/^:root\.dark\b/.test(sel)) return [sel.replace(/^:root\.dark\b/, `:root.dark ${scope}`)];
    if (/^:root\[data-boldness/.test(sel)) return [sel.replace(/^(:root\[[^\]]+\])/, `$1 ${scope}`)];
    return [];
  }

  // 日/夜、低动效、扫描线开关都挂在 <html> 上，scope 只能是它的后代。
  const mode = sel.match(/^(\[data-p4g-mode=[^\]]+\]|\[data-p4g-motion=[^\]]+\]|\[data-p4g-scanlines=[^\]]+\])/);
  if (mode) {
    const rest = sel.slice(mode[1].length).trim();
    if (!rest) return [];
    if (/\s/.test(rest)) return [`${mode[1]} ${scope} ${rest}`];
    return [`${mode[1]} ${scope} ${rest}`, `${mode[1]} ${scope}${rest}`];
  }

  if (/\s/.test(sel)) return [`${scope} ${sel}`];
  return [`${scope} ${sel}`, `${scope}${sel}`];
}

function scopeCss(file, scope) {
  const root = postcss.parse(fs.readFileSync(file, 'utf8'));
  root.walkRules((rule) => {
    const parent = rule.parent;
    if (parent && parent.type === 'atrule' && /keyframes$/i.test(parent.name)) return;
    const next = [];
    for (const sel of rule.selectors) next.push(...scopeSelector(sel, scope));
    if (next.length === 0) {
      rule.remove();
      return;
    }
    rule.selectors = [...new Set(next)];
  });
  fs.writeFileSync(file, root.toString());
}

for (const job of jobs) {
  const out = path.join(outDir, `${job.name}.css`);
  const args = ['-c', job.config, '-i', job.input, '-o', out, '--minify'];
  if (job.content) args.push('--content', job.content);
  const result = spawnSync(bin, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
  scopeCss(out, job.scope);
  console.log(`${job.name}: ${fs.statSync(out).size} bytes`);
}
