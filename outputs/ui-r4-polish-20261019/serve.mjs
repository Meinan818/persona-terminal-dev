import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./battle-experience-v3/', import.meta.url));
const fontRoot = fileURLToPath(new URL('./public/fonts/', import.meta.url));
const port = Math.max(1, Number(process.env.PORT) || 5188);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.txt': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const fonts = pathname.startsWith('/fonts/');
    const base = fonts ? fontRoot : root;
    const relative = fonts ? pathname.slice(7) : pathname === '/' ? 'index.html' : pathname.slice(1);
    const target = resolve(base, relative);
    if (!target.startsWith(resolve(base) + sep) || !types[extname(target)] || !(await stat(target)).isFile()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': types[extname(target)],
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    createReadStream(target).pipe(res);
  } catch {
    res.writeHead(404).end();
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`MASKARIA Demo ready: http://127.0.0.1:${port}/`);
  console.log('Keep this window open while testing. Press Ctrl+C to stop.');
});
