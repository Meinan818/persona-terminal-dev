/**
 * 官方素材插槽（public/assets/p4g/official/）
 *
 * demo **不打包** Atlus 的商标 / Logo / 立绘 / 字体。用户可自行把官方素材按下表文件名放进
 * public/assets/p4g/official/（或 dist/assets/p4g/official/），组件检测到文件存在就用，否则用我们生成的兜底素材。
 *
 * 用法：
 *   const src = useSlot('logo', p4gAsset('logo-maskaria.webp'));   // 官方在则官方，不在用兜底
 *   const has = useSlotExists('char-navigator');                     // 只想知道有没有
 *   <SlotImg slot="arcana-chariot" fallback={p4gAsset('card-back.webp')} alt="" />
 *
 * 清单见 OFFICIAL_SLOTS（KIT.md 同步列出）。
 */
import { useEffect, useState } from 'react';
import { asset } from './asset';

export interface SlotDef { file: string; desc: string; size?: string }

/** 插槽清单：key → 文件名。char-* / arcana-* 为前缀族，任意后缀都可用（如 char-chie.webp）。 */
export const OFFICIAL_SLOTS: Record<string, SlotDef> = {
  logo: { file: 'logo.webp', desc: 'P4G 标题 Logo（开屏 / 侧栏顶部）', size: '≤1200×600 透明底' },
  'logo-small': { file: 'logo-small.webp', desc: '小号 Logo（侧栏 32px 方标）', size: '128×128' },
  'menu-bg': { file: 'menu-bg.webp', desc: '暂停菜单彩虹竖条背景贴图（替代 CSS 彩条）', size: '600×1600' },
  'stage-bg': { file: 'stage-bg.webp', desc: '黄色方块像素阵舞台底图（替代 SVG 平铺）', size: '≥1920×1080，可平铺' },
  'rankup-bg': { file: 'rankup-bg.webp', desc: 'Social Link Rank Up 背景（黄底+斜彩带）', size: '1920×1080' },
  'weather-sunny': { file: 'weather-sunny.webp', desc: '天气：晴', size: '128×128 透明底' },
  'weather-cloudy': { file: 'weather-cloudy.webp', desc: '天气：阴', size: '128×128' },
  'weather-rain': { file: 'weather-rain.webp', desc: '天气：雨（伞）', size: '128×128' },
  'weather-fog': { file: 'weather-fog.webp', desc: '天气：雾', size: '128×128' },
  'weather-snow': { file: 'weather-snow.webp', desc: '天气：雪', size: '128×128' },
  'weather-thunder': { file: 'weather-thunder.webp', desc: '天气：雷', size: '128×128' },
  'char-navigator': { file: 'char-navigator.webp', desc: '助手（黑猫位）立绘 / 头像，助手面板与 Cut-in 用', size: '≥800 高透明底' },
  'char-*': { file: 'char-<id>.webp', desc: '角色立绘族：char-protagonist / char-chie / char-yukiko …（羁绊、Cut-in 用）', size: '≥800 高透明底' },
  'arcana-*': { file: 'arcana-<name>.webp', desc: '塔罗牌面族：arcana-fool / arcana-chariot …（羁绊卡、Rank Up）', size: '300×500' },
  'card-back': { file: 'card-back.webp', desc: '塔罗牌背', size: '300×500' },
  'font-latin': { file: 'font-latin.woff2', desc: '英文 UI 字体（ITC Avant Garde Gothic Demi 等，需自持授权）→ 注入为 "P4G Official Latin"' },
  'font-cjk': { file: 'font-cjk.woff2', desc: '中日文 UI 字体（Fontworks スキップ / Skip 等，需自持授权）→ 注入为 "P4G Official CJK"' },
  'font-num': { file: 'font-num.woff2', desc: '数字字体（可选）→ 注入为 "P4G Official Num"' },
  'sfx-*': { file: 'sfx-<name>.mp3', desc: '音效族（可选，demo 暂不播放）' },
};

export const slotUrl = (key: string): string => {
  const def = OFFICIAL_SLOTS[key];
  const file = def ? def.file : key.includes('.') ? key : `${key}.webp`;
  return asset(`p4g/official/${file}`);
};

const cache = new Map<string, Promise<boolean>>();

/** 探测图片是否存在（Image 加载；file:// 下也可用）。结果按 URL 缓存。 */
export const probeImage = (url: string): Promise<boolean> => {
  let p = cache.get(url);
  if (!p) {
    p = new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth > 0);
      img.onerror = () => resolve(false);
      img.src = url;
    });
    cache.set(url, p);
  }
  return p;
};

/** 官方插槽存在 → 返回官方 URL；否则返回 fallback（首帧先给 fallback，探测成功后切换）。 */
export function useSlot(key: string, fallback: string): string {
  const url = slotUrl(key);
  const [src, setSrc] = useState(fallback);
  useEffect(() => {
    let alive = true;
    probeImage(url).then((ok) => alive && setSrc(ok ? url : fallback));
    return () => { alive = false; };
  }, [url, fallback]);
  return src;
}

/** 只关心插槽在不在（null = 探测中）。 */
export function useSlotExists(key: string): boolean | null {
  const url = slotUrl(key);
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    probeImage(url).then((v) => alive && setOk(v));
    return () => { alive = false; };
  }, [url]);
  return ok;
}

/** 通用素材存在性（生成素材可能还没到位时做 CSS 兜底用）。 */
export function useImageOk(url: string | undefined): boolean | null {
  const [ok, setOk] = useState<boolean | null>(url ? null : false);
  useEffect(() => {
    if (!url) { setOk(false); return; }
    let alive = true;
    probeImage(url).then((v) => alive && setOk(v));
    return () => { alive = false; };
  }, [url]);
  return ok;
}

/** 启动时注入官方字体插槽（文件不存在时 FontFace.load 失败，静默跳过，栈自动落到打包字体）。 */
export function installOfficialFonts(): void {
  if (typeof document === 'undefined' || !('FontFace' in window)) return;
  const pairs: Array<[string, string]> = [
    ['P4G Official Latin', slotUrl('font-latin')],
    ['P4G Official CJK', slotUrl('font-cjk')],
    ['P4G Official Num', slotUrl('font-num')],
  ];
  for (const [family, url] of pairs) {
    try {
      const face = new FontFace(family, `url(${url})`, { display: 'swap' });
      face.load().then((f) => document.fonts.add(f)).catch(() => { /* 插槽为空：正常 */ });
    } catch { /* ignore */ }
  }
}
