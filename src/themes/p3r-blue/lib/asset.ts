/**
 * 静态素材路径助手 —— public/ 下素材都必须经由它取路径（dist 要能 file:// 打开，绝对 /assets 会指到磁盘根）。
 *   asset('tarot/p3/major_0.webp') → ./assets/tarot/p3/major_0.webp
 */
export const asset = (path: string): string => {
  const clean = path.replace(/^\/?(assets\/)?/, '');
  return `${import.meta.env.BASE_URL}assets/${clean}`;
};
/** 蓝主题塔罗牌面（复制自真实 public/tarot/p3/，文件名与真实一致） */
export const tarotAsset = (file: string): string => asset(`tarot/p3/${file}`);
/** 蓝主题岁时 / 节气图鉴（复制自真实 public/season/p3/） */
export const seasonAsset = (file: string): string => asset(`season/p3/${file}`);
