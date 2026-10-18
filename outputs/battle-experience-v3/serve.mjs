import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
const fontRoot = fileURLToPath(new URL('../../public/fonts/', import.meta.url));
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.woff2':'font/woff2', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.avif':'image/avif' };
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const fonts = pathname.startsWith('/fonts/');
    const base = fonts ? fontRoot : root;
    const relative = fonts ? pathname.slice(7) : pathname === '/' ? 'index.html' : pathname.slice(1);
    const target = resolve(base, relative);
    if (!target.startsWith(resolve(base) + sep) || !types[extname(target)] || !(await stat(target)).isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type':types[extname(target)], 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
    createReadStream(target).pipe(res);
  } catch { res.writeHead(404).end(); }
}).listen(5187, '127.0.0.1', () => console.log('Battle preview ready: http://127.0.0.1:5187/'));
