/**
 * 静态素材路径助手 —— public/ 下素材都必须经由它取路径（dist 要能 file:// 打开，绝对 /assets 会指到磁盘根）。
 *   asset('tarot/pink/major_0.webp') → ./assets/tarot/pink/major_0.webp
 */
export const asset = (path: string): string => {
  const clean = path.replace(/^\/?(assets\/)?/, '');
  return `${import.meta.env.BASE_URL}assets/${clean}`;
};
/** 粉主题塔罗牌面（复制自真实 public/tarot/pink/，文件名与真实一致） */
export const tarotAsset = (file: string): string => asset(`tarot/pink/${file}`);
/** 粉主题岁时 / 节气图鉴（复制自真实 public/season/pink/） */
export const seasonAsset = (file: string): string => asset(`season/pink/${file}`);
