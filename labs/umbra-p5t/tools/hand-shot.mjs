// 持武器手目检：同一姿势分别把正版枪/近战武器挂到 L / R 挂点各拍一张
import { chromium } from 'playwright';
import { preview } from 'vite';
const OUT = '/workspace/work/notes/shots/2026-10-26';
const server = await preview({ preview: { port: 4336, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const [level, ids] = [process.argv[2], process.argv[3].split(',')];
const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
await page.goto(`http://127.0.0.1:4336/?speed=1&noaim&level=${level}`);
await page.waitForFunction(() => window.__p5t && !window.__p5t.busy && window.__p5t.sceneKit.ready, null, { timeout: 90000 });
for (const id of ids) await page.waitForFunction((id) => window.__p5t.rigs.get(id)?.mixer, id, { timeout: 90000 });
await page.waitForTimeout(800);
for (const id of ids) for (const kind of ['gun', 'melee']) for (const side of ['L', 'R']) {
  await page.evaluate(([id, kind, side]) => {
    const P = window.__p5t, r = P.rigs.get(id), g = P.unitMesh.get(id);
    const W = kind === 'gun' ? 'Gun' : 'Sword';
    const w = r.root.getObjectByName(`wp_Loc_Wp_${W}_R`) || r.root.getObjectByName(`wp_Loc_Wp_${W}_L`);
    const to = r.root.getObjectByName(`Loc_Wp_${W}_${side}`); if (w && to && w.parent !== to) to.add(w);
    r.endAim(); r.faceTo({ x: g.position.x, y: 0, z: g.position.z + 5 });
    P.portrait(id, 0.9, 1.6, 0.5);
    setTimeout(() => r.aim({ x: g.position.x, y: 0, z: g.position.z + 5 }, kind, 1e9), 1200);
  }, [id, kind, side]);
  await page.waitForTimeout(1200 + (kind === 'gun' ? 1300 : 330));
  await page.screenshot({ path: `${OUT}/hand-${id}-${kind}-${side}.png` });
}
await browser.close(); server.httpServer.close();
