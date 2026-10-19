export type UmbraEntryMode = 'legacy' | 'runtime';

/**
 * 显式入口开关。默认永远是旧战场，只有 URL 写 umbra=1 才进入 UMBRA runtime；
 * umbra=0 可强制回旧入口，便于迁移期排查和回退。
 */
export function resolveUmbraEntry(search: string): UmbraEntryMode {
  const values = new URLSearchParams(search.split('#')[0]).getAll('umbra');
  return values.length === 1 && values[0] === '1' ? 'runtime' : 'legacy';
}
