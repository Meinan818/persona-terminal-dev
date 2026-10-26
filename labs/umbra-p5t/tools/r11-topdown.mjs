// r11：逐关正交俯视截图（只留原版场景，藏单位/掩体/HUD），统计关卡格子矩形内「地毯红」像素占比，对照 tools/r11-carpet-truth.mjs 的原版真值。
// 用法: node tools/r11-topdown.mjs OUTDIR L01 L02 ...  → OUTDIR/topdown-Lxx.png + JSON
import { chromium } from 'playwright';
import { preview } from 'vite';
import { createRequire } from 'node:module';
const req = createRequire('/workspace/work/gltf-tools/package.json');
const sharp = (await import(req.resolve('sharp'))).default;
const [OUT, ...LVS] = process.argv.slice(2);
const isRed = (r, g, b) => r > 70 && r > 2.2 * g && r > 2.2 * b;
const port = 4440 + Math.floor(Math.random() * 40);
const server = await preview({ preview: { port, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const res = {};
for (const LV of LVS) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
  await page.goto(`http://127.0.0.1:${port}/?speed=1&level=${LV}`);
  await page.waitForFunction(() => window.__p5t && !window.__p5t.busy && window.__p5t.sceneKit.ready && window.__p5t.renderInfo().origStats, null, { timeout: 120000, polling: 300 });
  await page.waitForTimeout(2000);
  const info = await page.evaluate(() => {
    const P = window.__p5t, T = P.THREE, W = P.battle.map.width, H = P.battle.map.height;
    const hide = () => { for (const c of P.world.children) c.visible = c.name === 'origMap'; for (const c of P.scene.children) if (c !== P.world && c.isGroup) c.visible = false; };
    hide(); setInterval(hide, 30);
    const st = document.createElement('style'); st.textContent = 'body *{visibility:hidden!important}'; document.head.appendChild(st);
    P.renderer.domElement.style.setProperty('visibility', 'visible', 'important');
    const cam = P.camera, vw = innerWidth, vh = innerHeight, asp = vw / vh;
    let hw = W / 2 + 0.3, hh = H / 2 + 0.3; if (hw / hh < asp) hw = hh * asp; else hh = hw / asp;
    P.rig.apply = () => { cam.position.set((W - 1) / 2, 40, (H - 1) / 2); cam.up.set(0, 0, -1); cam.lookAt((W - 1) / 2, 0, (H - 1) / 2); cam.left = -hw; cam.right = hw; cam.top = hh; cam.bottom = -hh; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); };
    P.rig.apply();
    // 格子矩形的像素范围
    const px = (x) => ((x - ((W - 1) / 2 - hw)) / (2 * hw)) * vw, pz = (z) => ((z - ((H - 1) / 2 - hh)) / (2 * hh)) * vh;
    return { W, H, x0: px(-0.5), x1: px(W - 0.5), y0: pz(-0.5), y1: pz(H - 0.5) };
  });
  await page.waitForTimeout(1500);
  const f = `${OUT}/topdown-${LV}.png`;
  await page.screenshot({ path: f });
  const { data, info: im } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let n = 0, red = 0, sr = [0, 0, 0], so = [0, 0, 0], no = 0;
  for (let y = Math.ceil(info.y0); y < Math.floor(info.y1); y++) for (let x = Math.ceil(info.x0); x < Math.floor(info.x1); x++) {
    const o = (y * im.width + x) * 3, r = data[o], g = data[o + 1], b = data[o + 2]; n++;
    if (isRed(r, g, b)) { red++; sr[0] += r; sr[1] += g; sr[2] += b; } else { no++; so[0] += r; so[1] += g; so[2] += b; }
  }
  res[LV] = { red: +(red / n).toFixed(3), redMean: sr.map((v) => Math.round(v / Math.max(1, red))), otherMean: so.map((v) => Math.round(v / Math.max(1, no))), rect: [info.x0, info.y0, info.x1, info.y1].map(Math.round) };
  console.error(LV, JSON.stringify(res[LV]));
  await page.close();
}
console.log(JSON.stringify(res));
await browser.close(); await server.close();
