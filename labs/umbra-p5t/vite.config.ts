import { defineConfig, type Plugin } from 'vite';
import { createReadStream, existsSync, cpSync, mkdirSync } from 'node:fs';
import { resolve, join, normalize } from 'node:path';

// 复用仓库 public/fonts 里的思源黑体 Black 分片（中文 HUD）；dev/preview 直接代理，build 时只拷贝需要的部分
const FONT_ROOT = resolve(__dirname, '../../public/fonts');
function repoFonts(): Plugin {
  const mw = (req: { url?: string }, res: { setHeader: (k: string, v: string) => void } & NodeJS.WritableStream, next: () => void) => {
    if (!req.url?.startsWith('/fonts/')) return next();
    const p = normalize(join(FONT_ROOT, decodeURIComponent(req.url.slice(7).split('?')[0])));
    if (!p.startsWith(FONT_ROOT) || !existsSync(p)) return next();
    res.setHeader('Content-Type', p.endsWith('.css') ? 'text/css' : 'font/woff2');
    createReadStream(p).pipe(res);
  };
  return {
    name: 'repo-fonts',
    configureServer(s) { s.middlewares.use(mw as never); },
    configurePreviewServer(s) { s.middlewares.use(mw as never); },
    closeBundle() {
      const out = resolve(__dirname, 'dist/fonts');
      mkdirSync(out, { recursive: true });
      cpSync(join(FONT_ROOT, 'noto-sc-black'), join(out, 'noto-sc-black'), { recursive: true });
      cpSync(join(FONT_ROOT, 'noto-sc-black.v2.css'), join(out, 'noto-sc-black.v2.css'));
      cpSync(join(FONT_ROOT, 'OFL.txt'), join(out, 'OFL.txt'));
    },
  };
}

// css.postcss 置空：避免向上读到仓库根的 tailwind postcss 配置
export default defineConfig({ base: './', plugins: [repoFonts()], css: { postcss: {} }, server: { host: true }, build: { chunkSizeWarningLimit: 800 } });
