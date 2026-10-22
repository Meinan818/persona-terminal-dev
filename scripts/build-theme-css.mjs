import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

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
  },
  {
    name: 'p3r',
    config: 'tailwind.p3r-blue.config.js',
    input: 'src/themes/p3r-blue/tailwind-entry.css',
    content: 'src/themes/p3r-blue/**/*.{ts,tsx},src/themes/p3r-pink/**/*.{ts,tsx}',
  },
];

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
  console.log(`${job.name}: ${fs.statSync(out).size} bytes`);
}
