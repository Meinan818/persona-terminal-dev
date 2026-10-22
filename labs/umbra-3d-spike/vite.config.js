// 多页：/ = P5R 战斗试样；/p3r-summon = P3R 召唤器举枪召唤 + 玻璃碎裂试样
import { resolve } from 'path';
import { defineConfig } from 'vite';
export default defineConfig({
  plugins: [{ name: 'p3r-summon-route', configureServer(s) { s.middlewares.use((req, _res, next) => { if (req.url && /^\/p3r-summon(\?|$|\/$)/.test(req.url)) req.url = req.url.replace(/^\/p3r-summon\/?/, '/p3r-summon.html'); next(); }); } }],
  build: { rollupOptions: { input: { main: resolve(__dirname, 'index.html'), p3r: resolve(__dirname, 'p3r-summon.html') } } },
});
