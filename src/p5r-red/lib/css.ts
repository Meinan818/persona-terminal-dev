import type { CSSProperties } from 'react';
/** 'left:10px;bottom:0;--x:1' → React style 对象（迁移原生 style 字符串时用，保持逐字一致）。 */
export function cssText(s: string): CSSProperties {
  const o: Record<string, string> = {};
  for (const part of s.split(';')) {
    const i = part.indexOf(':'); if (i < 0) continue;
    const k = part.slice(0, i).trim(), v = part.slice(i + 1).trim(); if (!k) continue;
    o[k.startsWith('--') ? k : k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
  }
  return o as CSSProperties;
}
