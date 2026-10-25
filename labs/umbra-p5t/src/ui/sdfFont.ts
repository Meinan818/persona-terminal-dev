// r7：原版 P5T TextMeshPro SDF 字体在网页里自绘（Unity TMP 着色器网页跑不了 → 按原版图集 + 字形表 + 材质参数重建，已标明）。
// 资源：public/p5t-hud/font/<名>/{atlas.png,glyphs.json,materials.json,summary.json}（tools/fetch-p5t-hud.sh 从 umbra-assets 拷入，不入库）。
// 着色近似 TMP_SDF.shader：距离场 a∈[0,1]，0.5 = 字形边缘；面 = a ≥ 0.5 − dilate/2，描边外缘 = a ≥ 0.5 − (dilate + outline)/2（ScaleRatioA 取 1）。
const BASE = 'p5t-hud/font/';

interface Glyph { ch: string; x: number; y: number; w: number; h: number; bx: number; by: number; adv: number }
interface Font {
  atlas: HTMLImageElement; aw: number; ah: number; size: number; ascent: number;
  glyphs: Map<string, Glyph>; pad: number; face: string; outline: string; ow: number; dil: number;
  cache: Map<string, HTMLCanvasElement>;
}
const fonts = new Map<string, Promise<Font | null>>();
const ready = new Map<string, Font>();

type C = { r: number; g: number; b: number; a: number };
const css = (c: C) => `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${c.a})`;

export function loadSdfFont(name: string): Promise<Font | null> {
  let p = fonts.get(name);
  if (p) return p;
  p = (async () => {
    try {
      const [g, m, s] = await Promise.all(['glyphs', 'materials', 'summary'].map((f) => fetch(`${BASE}${name}/${f}.json`).then((r) => (r.ok ? r.json() : Promise.reject(r.status)))));
      const img = new Image(); img.src = `${BASE}${name}/atlas.png`; await img.decode();
      const mat = m[0];
      const glyphs = new Map<string, Glyph>();
      for (const e of g as { character: string; rect: { x: number; y: number; width: number; height: number }; metrics: { horizontal_bearing_x: number; horizontal_bearing_y: number; horizontal_advance: number } }[]) {
        glyphs.set(e.character, { ch: e.character, x: e.rect.x, y: e.rect.y, w: e.rect.width, h: e.rect.height, bx: e.metrics.horizontal_bearing_x, by: e.metrics.horizontal_bearing_y, adv: e.metrics.horizontal_advance });
      }
      const f: Font = { atlas: img, aw: s.atlas_width, ah: s.atlas_height, size: s.point_size, ascent: s.ascent_line, glyphs, pad: Math.max(2, Math.floor((mat.gradient_scale ?? 8) / 2)), face: css(mat.face_color), outline: css(mat.outline_color), ow: mat.outline_width, dil: mat.face_dilate, cache: new Map() };
      ready.set(name, f);
      return f;
    } catch { return null; }
  })();
  fonts.set(name, p);
  return p;
}
export const sdfReady = (name: string) => ready.has(name);

/** 单个字形按 px 字号渲染成画布（缓存）：face/outline 颜色可覆盖（暴击黄等） */
function glyphCanvas(f: Font, gl: Glyph, scale: number, face: string, outline: string, ow: number): HTMLCanvasElement {
  const key = `${gl.ch}|${scale.toFixed(3)}|${face}|${outline}|${ow}`;
  const hit = f.cache.get(key);
  if (hit) return hit;
  const pad = f.pad; // 距离场延伸到 rect 外 ≈ gradientScale/2 像素
  const w = Math.max(1, Math.ceil((gl.w + pad * 2) * scale)), h = Math.max(1, Math.ceil((gl.h + pad * 2) * scale));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.imageSmoothingEnabled = true;
  // TMP 图集原点在左下；PNG 已是常规上下方向（rect.y 从下往上数）→ 换算到图片坐标
  const sy = f.ah - gl.y - gl.h;
  g.drawImage(f.atlas, gl.x - pad, sy - pad, gl.w + pad * 2, gl.h + pad * 2, 0, 0, w, h);
  const id = g.getImageData(0, 0, w, h); const d = id.data;
  const tFace = 0.5 - f.dil / 2, tOut = 0.5 - (f.dil + ow) / 2;
  const soft = 0.5 / Math.max(1, scale * 6); // 抗锯齿带宽（随缩放）
  const fc = parse(face), oc = parse(outline);
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255;
    const kf = smooth(tFace - soft, tFace + soft, a), ko = ow > 0 ? smooth(tOut - soft, tOut + soft, a) : kf;
    // 面叠在描边上
    const r = oc[0] + (fc[0] - oc[0]) * kf, gg = oc[1] + (fc[1] - oc[1]) * kf, b = oc[2] + (fc[2] - oc[2]) * kf;
    d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255 * Math.max(kf * fc[3], ko * oc[3]);
  }
  g.putImageData(id, 0, 0);
  f.cache.set(key, c);
  return c;
}
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function parse(c: string): [number, number, number, number] {
  const m = c.match(/rgba?\(([^)]+)\)/); if (m) { const p = m[1].split(',').map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; }
  let h = c.replace('#', ''); if (h.length === 3) h = h.split('').map((x) => x + x).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
}

export interface SdfOpts { px?: number; face?: string; outline?: string; outlineWidth?: number; tracking?: number; /** TMP characterSpacing（em/100） */ spacing?: number }
/** 一行文字 → 画布（失败 / 字体未加载 → null，调用方回退 CSS 文字） */
export function renderSdf(name: string, text: string, o: SdfOpts = {}): HTMLCanvasElement | null {
  const f = ready.get(name);
  if (!f) return null;
  const px = o.px ?? 48; const scale = px / f.size;
  const face = o.face ?? f.face, outline = o.outline ?? f.outline, ow = o.outlineWidth ?? f.ow;
  const gls = [...text].map((ch) => f.glyphs.get(ch) ?? null);
  if (gls.some((g) => !g)) return null;
  const pad = f.pad * scale;
  let x = pad; const items: { c: HTMLCanvasElement; x: number; y: number }[] = [];
  const top = f.ascent * scale + pad;
  for (const gl of gls as Glyph[]) {
    if (gl.w > 0) { const c = glyphCanvas(f, gl, scale, face, outline, ow); items.push({ c, x: x + gl.bx * scale - pad, y: top - gl.by * scale - pad }); }
    x += (gl.adv + (o.tracking ?? 0) + ((o.spacing ?? 0) / 100) * f.size) * scale;
  }
  const W = Math.ceil(x + pad * 2), H = Math.ceil(top + (f.size - f.ascent) * scale * 0.4 + pad * 2);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  for (const it of items) g.drawImage(it.c, it.x, it.y);
  return c;
}

// r8：HUD 文字换原版 TMP 字体——任何带 data-sdf 的元素按其 CSS 字号用原版 SDF 字体重绘（字体只有 ASCII：数字/拉丁字母；中文仍是 CSS 文字）。
// data-sdf=字体名  data-col=TMP font_color（原版 RectTransform/TMP 组件导出值）  data-out / data-ow=描边  data-sp=characterSpacing  data-back=前导零底字颜色
const DPR = Math.min(3, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
export function hydrateSdf(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-sdf]').forEach((el) => {
    const font = el.dataset.sdf!; const txt = el.dataset.txt ?? el.textContent ?? '';
    if (el.dataset.done === txt) return;
    if (!ready.has(font)) { void loadSdfFont(font).then((f) => { if (f) hydrateSdf(root); }); return; }
    const px = parseFloat(getComputedStyle(el).fontSize) || 16;
    const o: SdfOpts = { px: px * DPR, face: el.dataset.col, outline: el.dataset.out, outlineWidth: el.dataset.ow ? +el.dataset.ow : undefined, spacing: el.dataset.sp ? +el.dataset.sp : undefined };
    const pad = el.dataset.pad ? +el.dataset.pad : 0;
    const front = renderSdf(font, txt, o);
    if (!front) return; // 缺字形 → 保留 CSS 文字
    const box = document.createElement('span'); box.className = 'sdfbox';
    const put = (c: HTMLCanvasElement, cls: string) => { c.className = cls; c.style.width = `${c.width / DPR}px`; c.style.height = `${c.height / DPR}px`; box.appendChild(c); };
    if (pad && txt.length < pad && el.dataset.back) { const back = renderSdf(font, txt.padStart(pad, '0'), { ...o, face: el.dataset.back }); if (back) put(back, 'sdf-back'); }
    put(front, 'sdf-front');
    el.dataset.txt = txt; el.dataset.done = txt; el.setAttribute('aria-label', txt);
    el.replaceChildren(box); el.classList.add('sdf-on');
  });
}
