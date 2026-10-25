import { chromium } from 'playwright';
import { preview } from 'vite';
const server = await preview({ preview: { port: 4344, host: '127.0.0.1' } });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const lv = process.argv[2] || 'L01';
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
await page.goto(`http://127.0.0.1:4344/?speed=1&level=${lv}`);
await page.waitForFunction(() => window.__p5t && window.__p5t.sceneKit.ready, null, { timeout: 120000 });
const r = await page.evaluate(() => {
  const P = window.__p5t; const T = P.THREE;
  let map; P.unitMesh.values().next().value.parent.traverse((o) => { if (o.name === 'origMap') map = o; });
  map.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(map);
  const ray = new T.Raycaster(); const out = [];
  const b = P.battle;
  for (let y = 0; y < b.map.height; y++) { let line = '';
    for (let x = 0; x < b.map.width; x++) {
      ray.set(new T.Vector3(x, 40, y), new T.Vector3(0, -1, 0));
      const hits = ray.intersectObject(map, true).filter((h) => h.object.visible && !/sky/i.test(h.object.material.name));
      const hy = hits.length ? hits[0].point.y : -9; const t = b.grid.tile({ x, y })[0];
      line += t + (hy < -5 ? '?' : hy > 1.2 ? '#' : hy > 0.15 ? '+' : hy < -0.15 ? '_' : '.') + ' ';
    } out.push(line); }
  return { box: [box.min.toArray(), box.max.toArray()], out };
});
console.log(JSON.stringify(r.box)); console.log(r.out.join('\n'));
await browser.close(); await server.close();
