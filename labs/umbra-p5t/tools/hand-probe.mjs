// 实测各角色持枪/持近战武器的手：原版 GunLoop 姿势里在身前的 Loc_Wp_Gun_*，Attack 里移动路程最长的 Loc_Wp_Sword_*。
// 用法：npx vite build && node tools/hand-probe.mjs
import { chromium } from 'playwright';
import { preview } from 'vite';
const server = await preview({ preview: { port: 4335, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4335/?level=L01');
await page.waitForFunction(() => window.__p5t && window.__p5t.chars, null, { timeout: 60000 });
const keys = (process.argv[2] || 'skull,mona,panther,fox,queen,erina,panther_bw,fox_bw').split(',');
for (const k of keys) {
  const r = await page.evaluate(async (k) => {
    const C = window.__p5t.chars; if (!(await C.preloadChar(k))) return k + ': 缺';
    const r = C.makeChar(k); const m = r.root; let now = performance.now() + 10;
    const loc = (n) => { m.updateMatrixWorld(true); const o = m.getObjectByName(n); if (!o) return null; const v = o.getWorldPosition(o.position.clone()); return [v.x, v.y, v.z]; };
    const run = (kind, ms) => { r.aim(null, kind, 1e9); const out = { L: [], R: [] }; for (let t = 0; t < ms; t += 33) { now += 33; r.update(now); for (const s of ['L', 'R']) out[s].push(loc(`Loc_Wp_${kind === 'gun' ? 'Gun' : 'Sword'}_${s}`)); } return out; };
    const g = run('gun', 1500);
    const last = (a) => a[a.length - 1];
    const gL = last(g.L), gR = last(g.R);
    r.endAim(); for (let t = 0; t < 1500; t += 33) { now += 33; r.update(now); }
    const a = run('melee', 1200);
    const path = (arr) => arr.reduce((s, p, i) => i ? s + Math.hypot(p[0] - arr[i - 1][0], p[1] - arr[i - 1][1], p[2] - arr[i - 1][2]) : 0, 0);
    return `${k}: gun L z=${gL?.[2].toFixed(2)} y=${gL?.[1].toFixed(2)} | R z=${gR?.[2].toFixed(2)} y=${gR?.[1].toFixed(2)} ; sword path L=${path(a.L).toFixed(2)} R=${path(a.R).toFixed(2)}`;
  }, k);
  console.log(r);
}
await browser.close(); server.httpServer.close();
