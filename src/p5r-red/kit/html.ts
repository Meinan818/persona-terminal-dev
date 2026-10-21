/**
 * 原 P5.ui.* 的**字符串**版本（逐字迁移）。只给命令式特效层用（fx/transitions 的 Cut-in、fx/surprise 等
 * 直接操作 DOM 的场景）。React 组件里请用 <P5Shp/> <P5Button/> <P5Ransom/> … 同名组件。
 */
import { shape as S, type ShapeKind } from '@/p5r-red/lib/shape';
import { rng } from '@/p5r-red/lib/rng';
import { kitImg } from '@/p5r-red/lib/asset';

const f = (n: number) => n.toFixed(2);
export const clipFor = (kind: ShapeKind | string, s: number, jag?: number) =>
  kind === 'torn' ? S.torn(s, jag ? { jag } : {}) : kind === 'cut' ? S.cut(s) : kind === 'plate' ? S.plate : S.quad(s, jag || 6);

export const ui = {
  shp(tag: string, { cls = '', kind = 'quad', seed = 1, tone = 'paper', attrs = '', shadow = true, jag }: { cls?: string; kind?: string; seed?: number; tone?: string; attrs?: string; shadow?: boolean; jag?: number } = {}, inner = '') {
    const style = `--clip:${clipFor(kind, seed, jag)};--clip2:${clipFor(kind, seed + 5, jag)};--clip-sh:${clipFor(kind, seed + 11, jag)}`;
    return `<${tag} class="shp ${tone} ${cls}" style="${style}" ${attrs}>${shadow ? '<i class="lyr sh"></i>' : ''}<i class="lyr fr"></i><i class="lyr fc"></i>${inner}</${tag}>`;
  },
  btn(label: string, { tone = 'red', seed = 7, cls = '', attrs = '', icon = '', size = '' } = {}) {
    return ui.shp('button', { cls: `btn ${tone === 'paper' ? 'paper' : ''} ${size} ${cls}`, kind: 'cut', seed, tone, attrs: `type="button" ${attrs}` }, `${icon}<span>${label}</span>`);
  },
  star(fill = 'var(--red)', stroke = 'var(--paper)', sw = 1.6, cls = 'star') {
    return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><polygon points="${S.starPts(12, 12.6, 11)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/></svg>`;
  },
  plate(text: string, { fs = 22, rot = -2, attrs = '', tag = 'span', suffix = '' } = {}) {
    return `<${tag} class="shp plate" style="--clip:${S.plate};--fs:${fs}px;--rot:${rot}deg" ${attrs}><i class="lyr sh"></i><i class="lyr fr"></i><span>${text}</span>${suffix}${ui.star()}</${tag}>`;
  },
  burst(text: string | null, { tone = 'red', sz = 56, rot = -8, cls = '' } = {}) {
    return `<span class="burst ${tone} ${cls}" style="--sz:${sz}px;--rot:${rot}deg"><img src="${kitImg('starburst_' + tone)}" alt="">${text != null ? `<b>${text}</b>` : ''}</span>`;
  },
  tag(text: string, tone = '') { return `<span class="tag ${tone}">${text}</span>`; },
  /** 剪报字母标题（letters 素材，逐字旋转 / 跳位） */
  ransom(text: string, { h = 40, seed = 1, cls = '' } = {}) {
    return `<span class="ransom ${cls}" role="img" aria-label="${text}" style="--h:${h}px">${ransomTiles(text, h, seed).map((t) => t.key
      ? `<img data-l="${t.i}" src="${kitImg('L_' + t.key)}" alt="" style="height:${t.height}px;margin-left:${t.ml}px;transform:${t.transform}">`
      : `<span style="width:${h * 0.3}px"></span>`).join('')}</span>`;
  },
};

/** 剪报逐字的确定性布局（P5Ransom 与 ui.ransom 共用，保证同 seed 同形） */
export interface RansomTile { i: number; key: string; height: string; ml: number; transform: string }
export function ransomTiles(text: string, h: number, seed: number): RansomTile[] {
  const r = rng(seed), used: Record<string, number> = {};
  return [...text.toUpperCase()].map((ch, i) => {
    let k = ch === '!' ? 'EXCL' : ch === '?' ? 'QMARK' : /[A-Z]/.test(ch) ? ch : '';
    if (!k) return { i, key: '', height: '', ml: 0, transform: '' };
    used[k] = (used[k] || 0) + 1; if (used[k] === 2 && (k === 'I' || k === 'J')) k += '_alt';
    const rot = (r() - 0.5) * 14, dy = (r() - 0.5) * h * 0.18, sc = 0.9 + r() * 0.16;
    return { i, key: k, height: f(h * sc), ml: i ? -h * 0.04 : 0, transform: `translateY(${f(dy)}px) rotate(${f(rot)}deg)` };
  });
}
