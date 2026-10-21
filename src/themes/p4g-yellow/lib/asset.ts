/**
 * 静态素材路径助手 —— **所有 public/ 下素材都必须经由它取路径**。
 *
 * 为什么：dist/ 要能 file:// 直接打开（base './'），以 `/` 开头的绝对路径在 file:// 下会指向磁盘根目录。
 * `asset('p4g/tv-static.webp')` → `./assets/p4g/tv-static.webp`（dev 下是 `/assets/...`）。
 *
 * 也接受 BRIEF 里写的 `/assets/p4g/x.webp` 形式，会自动去掉前导 `/assets/`。
 */
export const asset = (path: string): string => {
  const clean = path.replace(/^\/?(assets\/)?/, '');
  return `${import.meta.env.BASE_URL}assets/${clean}`;
};

/** P4G 素材目录简写：p4gAsset('weather-sunny.webp') */
export const p4gAsset = (file: string): string => asset(`p4g/${file}`);
