/**
 * 素材路径助手 —— 素材都在 src/assets（由 Vite 打包、带 hash，file:// 可用）。
 * **不要**手写 '/assets/…' 绝对路径（file:// 下会指向磁盘根）。
 *
 *   kitImg('L_A')            → 剪报字母等 v1 素材（原 P5.A(n) = shared/assets/kit/<n>.webp）
 *   sfxUrl('dd')             → 音效（原 shared/sfx/<n>.mp3）
 * CSS 里直接写相对路径 url('../assets/kit/x.webp')，Vite 会改写。
 */
const KIT = import.meta.glob('../assets/kit/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const SFX = import.meta.glob('../assets/sfx/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const byName = (m: Record<string, string>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k.split('/').pop()!.replace(/\.\w+$/, ''), v]));
const KIT_BY = byName(KIT);
const SFX_BY = byName(SFX);

/** 等价原 P5.A(n)：素材库切图 URL（不存在时返回空串并 console.warn） */
export const kitImg = (name: string): string => {
  const u = KIT_BY[name];
  if (!u && import.meta.env.DEV) console.warn('[kitImg] 素材不存在：', name);
  return u ?? '';
};
export const sfxUrl = (name: string): string => SFX_BY[name] ?? '';
export const KIT_NAMES = Object.keys(KIT_BY).sort();
