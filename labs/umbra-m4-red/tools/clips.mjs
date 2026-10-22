// 动态效果录屏：逐帧定格推进主线（15fps，演出时钟精确），截图后 ffmpeg 合成 mp4 + gif（844×390）。
// node tools/clips.mjs [which=summon,attack,allout]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const which = (process.argv[2] ?? 'summon,attack,allout,showtime').split(',');
const W = 844, H = 390, FPS = 15, STEP = 1000 / FPS, OUT = 'shots/clips';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: '/workspace/work/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux-arm64/chrome-headless-shell',
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const page = await (await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage();
await page.goto('http://127.0.0.1:8766/?auto=0&maxdt=400', { waitUntil: 'load' });
const until = (fn, arg, t = 60000) => page.waitForFunction(fn, arg, { timeout: t, polling: 50 });
await until(() => window.__umbra && window.__umbra.mode === 'command' && !window.__umbra.busy);
let n = 0; const tmp = '/workspace/work/umbra-next/m3/work/clip-tmp';   // /tmp 会被清空，帧缓存放工作区 
async function record(name, start, evs) {
  fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp); n = 0;
  for (let i = 0; i < 8; i++) { await page.screenshot({ path: `${tmp}/${String(n++).padStart(4, '0')}.png` }); }   // 0.5s 待机（呼吸/摆动）
  await page.evaluate(([e]) => window.__umbra.freezeOn(e, 1), [evs[0][0]]);
  await page.evaluate(start);
  for (const [ev, len] of evs) {
    for (let t = 1; t <= len; t += STEP) {
      await page.evaluate(([e, x]) => window.__umbra.freezeOn(e, x), [ev, t]);
      try { await until(([e, x]) => window.__umbra.ev === e && window.__umbra.showT >= x - 1, [ev, t], 8000); } catch { break; }
      await page.screenshot({ path: `${tmp}/${String(n++).padStart(4, '0')}.png` });
    }
    await page.evaluate(() => window.__umbra.release());
  }
  await page.evaluate(() => window.__umbra.release());
  await until(() => !window.__umbra.busy, null, 20000).catch(() => {});
  for (let i = 0; i < 6; i++) await page.screenshot({ path: `${tmp}/${String(n++).padStart(4, '0')}.png` });
  execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${tmp}/%04d.png -c:v libx264 -pix_fmt yuv420p -crf 26 ${OUT}/${name}.mp4`);
  execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${tmp}/%04d.png -vf "fps=${FPS},scale=844:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer" ${OUT}/${name}.gif`);
  console.log(name, n, 'frames');
}
if (which.includes('summon')) await record('summon-eiha', () => { window.__umbra.enemy('noisy'); window.__umbra.cmd('persona'); window.__umbra.row(0); window.__umbra.row(0); }, [['action', 1700], ['onemore', 440]]);
await until(() => window.__umbra.mode === 'command' && !window.__umbra.busy);
if (which.includes('attack')) await record('attack', () => { window.__umbra.enemy('echo'); window.__umbra.cmd('attack'); }, [['action', 1100], ['holdup', 950]]);   // 第五阶段：普攻打倒最后一只 → HOLD UP 环绕镜头
if (which.includes('allout')) {
  await until(() => window.__umbra.mode === 'holdup' && !window.__umbra.busy);
  await record('allout', () => window.__umbra.cmd('allout'), [['allout', 3060]]);
}
if (which.includes('showtime')) {
  await until(() => !window.__umbra.busy, null, 30000).catch(() => {});
  await record('showtime', () => { window.__umbra.showtime('joker', 'skull'); }, [['highlight', 3360]]);
}
if (which.includes('start')) {
  await until(() => !window.__umbra.busy, null, 30000).catch(() => {});
  await record('battlestart', () => { window.__umbra.hud.setMode('hidden'); window.__umbra.dir.play('battle:start', { enemyIds: window.__umbra.B.enemies, leadId: 'joker' }, {}); }, [['battle:start', 860]]);
}
await browser.close();
