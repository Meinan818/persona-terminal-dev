export type UmbraEntryMode = 'legacy' | 'demo' | 'runtime';

/**
 * 默认由 UMBRA Demo 整体取代旧战场。
 * legacy=1 / umbra=0 仅供回退；umbra=runtime 仅供迁移开发核对正式引擎接线。
 */
export function resolveUmbraEntry(search: string): UmbraEntryMode {
  const params = new URLSearchParams(search.split('#')[0]);
  if (params.get('legacy') === '1') return 'legacy';
  const values = params.getAll('umbra');
  if (values.length === 0) return 'demo';
  if (values.length !== 1) return 'legacy';
  if (values[0] === '1') return 'demo';
  if (values[0] === 'runtime') return 'runtime';
  if (values[0] === '0') return 'legacy';
  return 'legacy';
}
