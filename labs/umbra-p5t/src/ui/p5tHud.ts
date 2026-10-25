// P5T 正版战斗 HUD 贴图（Codex 提取，tools/fetch-p5t-hud.sh 拷到 public/p5t-hud/，不入 git）。
// 读 manifest.json：有图 → body.p5hud + 每张图一个 CSS 变量 --p5-<短名>；没有 → 什么都不做（保留原 CSS 版 HUD）。
// 尺寸单位：原图是 2160p 贴图，Unity 画布参考 1920×1080（锚点坐标按 1080 高）。CSS 用 --u = 一个 2160p 像素。

export interface HudImg { w: number; h: number }
const imgs = new Map<string, HudImg>();
const BASE = `${import.meta.env.BASE_URL ?? '/'}p5t-hud/`.replace(/\/\/+/g, '/');
let ready = false;

export const p5 = {
  get on() { return ready; },
  has: (n: string) => ready && imgs.has(n),
  url: (n: string) => `${BASE}${n}.png`,
  size: (n: string) => imgs.get(n),
  /** <img> 标签（缺图返回 ''） */
  img(n: string, cls = '', style = '') { return this.has(n) ? `<img class="p5i ${cls}" src="${this.url(n)}" alt="" draggable="false" style="--w:${imgs.get(n)!.w};--h:${imgs.get(n)!.h};${style}"/>` : ''; },
};

/** 我方单位 id → P5T 头像贴图名（party_* / dying_*） */
export const PORTRAIT: Record<string, string> = {
  joker: 'hero', skull: 'ryuji', panther: 'ann', mona: 'mona', fox: 'yusuke', queen: 'makoto',
  noir: 'haru', crow: 'akechi', kasumi: 'kasumi', erina: 'eru', toshiro: 'toshiro',
};

/** 启动时调用；加载完成后回调（用来刷新 HUD）。?p5hud=0 可强制关（对比截图用）。 */
export async function initP5tHud(onReady?: () => void) {
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('p5hud') === '0') return;
  try {
    const r = await fetch(`${BASE}manifest.json`, { cache: 'no-cache' });
    if (!r.ok) return;
    const m = (await r.json()) as Record<string, HudImg>;
    const names = Object.keys(m);
    if (!names.length) return;
    const root = document.documentElement.style;
    const abs = new URL(BASE, location.href).href; // CSS 变量里的 url 要绝对路径（否则按样式表 /assets/ 解析）
    for (const n of names) { imgs.set(n, m[n]); root.setProperty(`--p5-${n.replace(/_/g, '-')}`, `url("${abs}${n}.png")`); }
    // 关键贴图先解码，避免第一帧闪 CSS 版
    await Promise.all(['turn_win', 'enemy_win', 'gage_window', 'volt_base', 'volt_fill', 'word_action'].filter((n) => imgs.has(n)).map((n) => new Promise<void>((res) => { const i = new Image(); i.onload = i.onerror = () => res(); i.src = `${BASE}${n}.png`; })));
    ready = true;
    document.body.classList.add('p5hud');
    for (const n of ['om_anime_1', 'om_anime_2', 'om_anime_3', 'om_anime_4', 'om_anime_5', 'om_anime_6', 'om_text', 'om_effect', 'tri_go', 'allout_ba', 'allout_zu']) if (imgs.has(n)) new Image().src = `${BASE}${n}.png`;
    onReady?.();
  } catch { /* 无贴图：保持 CSS 版 */ }
}

/**
 * 原版字母弹出（DOWN / BLOCK）：anim_ui2d_down_start（60fps，Unity 画布单位）：
 * 每个字母 y 从 +100 落到 0（0.167s），回弹 +10 再落 0，字母间隔 0.083s；停留后 y 落 -100 并淡出（第 1 个字母 0.833→1.083s）。
 * 阴影层同曲线、alpha 0.76。返回 HTML（字母缺图返回 ''）。
 */
export function letterPop(word: 'down' | 'block'): string {
  const ls = word === 'down' ? ['d', 'o', 'w', 'n'] : ['b', 'l', 'o', 'c', 'k'];
  if (!ls.every((l) => p5.has(`${word}_${l}`))) return '';
  return `<span class="p5pop ${word}">${ls.map((l, i) => {
    const sh = p5.has(`${word}_${l}_sh`) ? p5.img(`${word}_${l}_sh`, 'sh') : '';
    return `<span class="lt" style="--i:${i}">${sh}${p5.img(`${word}_${l}`, 'fg')}</span>`;
  }).join('')}</span>`;
}
