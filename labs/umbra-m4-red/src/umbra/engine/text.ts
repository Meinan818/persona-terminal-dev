// 文字：皮肤字体加载（manifest.fonts，带 unicode-range 分片）、P5 剪报字、斜切牌。
import { Container, Graphics, Text, TextStyleOptions } from 'pixi.js';
import type { Manifest, Tokens } from '../skins/_contract';

export async function loadFonts(m: Manifest, base: string) {
  const faces: FontFace[] = [];
  for (const f of m.fonts) {
    if (f.pack !== 'first') continue;
    const ff = new FontFace(f.family, `url(${base}${f.file})`, f.unicodeRange ? { unicodeRange: f.unicodeRange } : {});
    faces.push(ff);
  }
  const done = await Promise.allSettled(faces.map((f) => f.load()));
  done.forEach((r, i) => { if (r.status === 'fulfilled') (document.fonts as any).add(faces[i]); });
  return faces;
}
export function unloadFonts(faces: FontFace[]) { for (const f of faces) (document.fonts as any).delete(f); }

export interface Fonts { display: string; number: string; body: string; cjk: string }
export function fontsFrom(t: Tokens): Fonts {
  return { display: t.font.display, number: t.font.number, body: t.font.body, cjk: t.font.display };
}

export function txt(text: string, size: number, o: Partial<TextStyleOptions> & { font?: string } = {}) {
  const { font, ...rest } = o;
  const t = new Text({ text, style: { fontFamily: font ?? 'sans-serif', fontSize: size, fill: 0xffffff, ...rest }, resolution: 2 });
  return t;
}

/** P5 剪报字：逐字母不同大小/倾斜，指定下标反色（白底黑字），其余白字黑描边。 */
export function ransom(word: string, size: number, font: string, o: { invert?: number[]; red?: number[]; seed?: number; fill?: number; ink?: number; stroke?: number } = {}) {
  const c = new Container();
  let x = 0, seed = o.seed ?? 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const fill = o.fill ?? 0xffffff, ink = o.ink ?? 0x0a0a0a;
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    if (ch === ' ') { x += size * 0.32; continue; }
    const inv = o.invert?.includes(i), red = o.red?.includes(i);
    const s = size * (0.9 + rnd() * 0.22) * (inv ? 1.08 : 1);
    const t = txt(ch, s, { font, fill: inv ? ink : fill, stroke: inv ? undefined : { color: ink, width: o.stroke ?? Math.max(3, s * 0.12), join: 'round' } });
    t.anchor.set(0, 0.5);
    const g = new Container();
    if (inv || red) {
      const w = t.width, h = s * 1.02;
      const pl = new Graphics().poly([-4, -h / 2, w + 4, -h / 2 - 3, w + 6, h / 2, -2, h / 2 + 3]).fill(red ? 0xe5191c : fill).stroke({ color: ink, width: 3 });
      g.addChild(pl);
    }
    g.addChild(t);
    g.position.set(x, (rnd() - 0.5) * size * 0.12);
    g.rotation = (rnd() - 0.5) * 0.16;
    c.addChild(g);
    x += t.width * 0.94 + (inv ? 6 : 0);
  }
  return c;
}

/** 斜切牌（平行四边形，可描边、可偏移投影） */
export function plate(w: number, h: number, o: { fill?: number; stroke?: number; sw?: number; skew?: number; shadow?: number; sx?: number; sy?: number } = {}) {
  const k = o.skew ?? 12;
  const g = new Graphics();
  if (o.shadow !== undefined) g.poly([k + (o.sx ?? 6), (o.sy ?? 6), w + (o.sx ?? 6), (o.sy ?? 6), w - k + (o.sx ?? 6), h + (o.sy ?? 6), (o.sx ?? 6), h + (o.sy ?? 6)]).fill(o.shadow);
  g.poly([k, 0, w, 0, w - k, h, 0, h]).fill(o.fill ?? 0x0a0a0a);
  if (o.stroke !== undefined) g.stroke({ color: o.stroke, width: o.sw ?? 3 });
  return g;
}

export const hex = (s: string | number) => (typeof s === 'number' ? s : parseInt(s.replace('#', ''), 16));
