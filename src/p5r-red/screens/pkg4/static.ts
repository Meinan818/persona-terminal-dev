/**
 * pkg4 命令式层用的「静态 SVG / HTML 字符串」——替代 react-dom/server 的 renderToStaticMarkup。
 * 原因：接入正式仓库后，vite dev 预构建 react-dom/server.browser.js 不提供具名导出 renderToStaticMarkup，
 *       行动 / 星象 / 记账页一打开就 pageerror（演练 dryrun2 实测）。正式仓库 vite.config.ts 不许改，所以 demo 侧去掉该依赖。
 * 输出与 <P5BgSVG/>、<P5Empty text seed/> 的静态渲染结果逐字节一致（qa/jobs/static-eq.mjs 校验）。
 */
import { rng } from '@/p5r-red/lib/rng';
import { shape } from '@/p5r-red/lib/shape';
import { SIL_DATA } from '@/p5r-red/fx/silData';
import type { BgOpts } from '@/p5r-red/fx/bg';

const f = (n: number) => n.toFixed(1);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');

function dots(x0: number, y0: number, w: number, h: number, step: number, rMax: number, dir: string, fill: string, rot = 0): string {
  let c = '';
  for (let y = 0; y <= h; y += step) for (let x = (Math.round(y / step) % 2) * step / 2; x <= w; x += step) {
    const t = dir === 'x' ? x / w : dir === '-x' ? 1 - x / w : dir === 'y' ? y / h : dir === '-y' ? 1 - y / h : Math.min(1, Math.hypot(x / w - 0.5, y / h - 0.5) * 1.6);
    const r = rMax * (1 - t); if (r < 0.5) continue;
    c += `<circle cx="${f(x0 + x)}" cy="${f(y0 + y)}" r="${f(r)}"></circle>`;
  }
  return `<g fill="${fill}" transform="rotate(${rot} ${x0 + w / 2} ${y0 + h / 2})">${c}</g>`;
}

/** = <P5BgSVG {...o}/> 的静态 SVG 串（几何算法逐字抄 fx/bg.tsx） */
export function bgSVGString({ seed = 5, fx = 640, fy = 380, wide = false, rays = 30, cream = 3, dense = 1 }: BgOpts = {}): string {
  const r = rng(seed);
  const W = wide ? 1600 : 1000, H = 1000, R = 2400;
  const ray: string[] = [];
  for (let i = 0; i < rays; i++) {
    const a0 = (i / rays) * Math.PI * 2 + r() * 0.03, a1 = a0 + (Math.PI * 2 / rays) * (0.42 + r() * 0.22);
    if (i % 2) continue;
    ray.push(`${fx},${fy} ${f(fx + Math.cos(a0) * R)},${f(fy + Math.sin(a0) * R)} ${f(fx + Math.cos(a1) * R)},${f(fy + Math.sin(a1) * R)}`);
  }
  const p = (aa: number, d: number) => `${f(fx + Math.cos(aa) * d)},${f(fy + Math.sin(aa) * d)}`;
  const wedge: string[] = [];
  for (let i = 0; i < cream; i++) { const a = r() * Math.PI * 2, w = 0.035 + r() * 0.05, near = 120 + r() * 160; wedge.push(`${p(a, near)} ${p(a - w, R)} ${p(a + w, R)}`); }
  const ink: string[] = [];
  for (let i = 0; i < 2; i++) { const a = r() * Math.PI * 2, d0 = 380 + r() * 200; ink.push(`${p(a, d0)} ${p(a - 0.012, R)} ${p(a + 0.03, R)}`); }
  const poly = (l: string[]) => l.map((pts) => `<polygon points="${pts}"></polygon>`).join('');
  return `<svg class="p5r-bg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">`
    + `<rect width="${W}" height="${H}" fill="var(--p5r-bg-a)"></rect>`
    + `<g fill="var(--p5r-bg-b)">${poly(ray)}</g>`
    + `<g fill="var(--p5r-bg-wedge)" opacity=".92">${poly(wedge)}</g>`
    + `<g fill="var(--p5r-bg-ink)">${poly(ink)}</g>`
    + dots(-20, H - 330, 420 * dense, 360, 15, 6.4, '-x', 'var(--p5r-bg-dot)', -8)
    + dots(W - 360, -30, 400, 300, 15, 6, 'x', 'var(--p5r-bg-dot)', 12)
    + dots(W - 300, H - 240, 320, 260, 13, 5, 'r', 'var(--p5r-bg-dot2)')
    + `</svg>`;
}

/** = <P5Empty text={text} seed={seed} hint={hint}/> 的静态串（kit/P5States.tsx，无 icon / action 的形态） */
export function emptyString(text: string, seed = 1, hint?: string): string {
  const q = shape.quad, jag = 5, s0 = 900 + seed;
  const rough = `<i class="oa-r" aria-hidden="true">`
    + `<i style="background:#111;clip-path:${q(s0 + 11, jag)};transform:translate(3px,4px)"></i>`
    + `<i style="background:#111;clip-path:${q(s0, jag)}"></i>`
    + `<i style="background:var(--p5r-paper);clip-path:${q(s0 + 5, jag)};inset:3px"></i></i>`;
  const s = SIL_DATA.cat, rw = 4;
  const sil = `<svg class="sil" viewBox="${-rw} ${-rw} ${s.w + rw * 2} ${s.h + rw * 2}" style="height:54px;width:auto" aria-hidden="true">`
    + `<path d="${s.d}" fill="#9b9791" fill-rule="evenodd" stroke="#111" stroke-width="${rw}" stroke-linejoin="round" paint-order="stroke"></path></svg>`;
  const star = `<svg class="oa-star oa-empty-s1" width="18" height="18" viewBox="0 0 100 100" aria-hidden="true" style="transform:rotate(-12deg)">`
    + `<polygon points="${shape.starPts(50, 52, 48, -90)}" fill="var(--red)" stroke="#111" stroke-width="8" stroke-linejoin="miter"></polygon></svg>`;
  return `<div class="oa-empty" style="--r:${seed % 2 ? -1.6 : 1.2}deg">${rough}<span class="oa-empty-ic" aria-hidden="true">${sil}</span>`
    + `<div class="oa-empty-t"><p>${esc(text)}</p>${hint ? `<small>${esc(hint)}</small>` : ''}</div>${star}</div>`;
}
