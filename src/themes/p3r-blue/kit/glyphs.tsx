/**
 * Glyph —— 单色 SVG 小图标（currentColor，1em 跟随字号，行内基线对齐）。
 * 用于替换彩色 emoji（🏆✨⭐📌🐷📜🔮…，Noto Color Emoji 带蓝像素）与两套字体都缺的符号（⏳ Ⓐ Ⓑ ⓪ ⧉ ⚿ 炼金 🜂🜄🜁🜃）。
 * 其余常见符号（▶◀✦✧◈⋯⇄✓✕☾♪…）由 index.css 的「P3R Glyph」单色兜底字体保证，不需要逐个替换。
 *   <Glyph name="trophy" />  <Glyph name="hourglass" size={14} />  <Glyph name="tri-r" className="ml-1" />
 */
import type { CSSProperties } from 'react';

const P: Record<string, string> = {
  // 形状
  'star4': 'M12 1 Q13.3 10.7 23 12 Q13.3 13.3 12 23 Q10.7 13.3 1 12 Q10.7 10.7 12 1Z',
  'star': 'M12 1.8l2.9 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.6l-6.5 3.9 1.8-7.3L1.6 9.3l7.5-.6z',
  'sparkles': 'M10 2 Q11 9 18 10 Q11 11 10 18 Q9 11 2 10 Q9 9 10 2Z M19 13 Q19.5 16.5 23 17 Q19.5 17.5 19 21 Q18.5 17.5 15 17 Q18.5 16.5 19 13Z',
  'tri-r': 'M6 3 L21 12 L6 21Z',
  'tri-l': 'M18 3 L3 12 L18 21Z',
  'tri-d': 'M3 6 L21 6 L12 21Z',
  'tri-u': 'M12 3 L21 18 L3 18Z',
  'diamond': 'M12 1 L23 12 L12 23 L1 12Z M12 6 L18 12 L12 18 L6 12Z',
  'dots': 'M3 10h4v4H3zM10 10h4v4h-4zM17 10h4v4h-4z',
  'heart': 'M12 21 C5 15.5 2 12 2 8.2 2 5.3 4.3 3 7.1 3 9.1 3 10.9 4.1 12 5.8 13.1 4.1 14.9 3 16.9 3 19.7 3 22 5.3 22 8.2 22 12 19 15.5 12 21Z',
  'moon': 'M15.5 2.5 A9.5 9.5 0 1 0 21.5 17 A8 8 0 0 1 15.5 2.5Z',
  'sun': 'M12 7a5 5 0 110 10 5 5 0 010-10zM11 0h2v4h-2zM11 20h2v4h-2zM0 11h4v2H0zM20 11h4v2h-4zM3.5 2.1l2.8 2.8-1.4 1.4-2.8-2.8zM17.7 19.1l2.8 2.8 1.4-1.4-2.8-2.8zM2.1 20.5l2.8-2.8 1.4 1.4-2.8 2.8zM19.1 6.3l2.8-2.8-1.4-1.4-2.8 2.8z',
  // 物件
  'trophy': 'M6 2h12v2h4v3a5 5 0 01-5 5h-.4A6 6 0 0113 15.9V19h4v3H7v-3h4v-3.1A6 6 0 017.4 12H7a5 5 0 01-5-5V4h4zM4 6v1a3 3 0 002.4 2.9A6 6 0 016 8V6zm16 0h-2v2a6 6 0 01-.4 1.9A3 3 0 0020 7z',
  'hourglass': 'M5 1h14v2h-1.5v3.2L13.3 12l4.2 5.8V21H19v2H5v-2h1.5v-3.2L10.7 12 6.5 6.2V3H5zm3.5 2v2.6L12 10.4l3.5-4.8V3zM12 13.6l-3.5 4.8V21h7v-2.6z M9.5 20h5l-2.5-3z',
  'pin': 'M9 2h6l-1 2v5l3 3v2h-4v7l-1 1-1-1v-7H7v-2l3-3V4z',
  'piggy': 'M10 4c3.4 0 6.4 1.6 7.8 4H20l-1 3.2c1 .9 1.5 1.9 1.6 2.8H22v3h-2.1c-.6 1-1.5 1.9-2.6 2.5V22h-3v-1.7c-.7.1-1.5.2-2.3.2s-1.5-.1-2.2-.2V22h-3v-2.6C4.5 18 3 15.8 3 13.2 3 8.1 6.1 4 10 4zm6 6.5a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4zM8.5 6.5v1.6h4.5V6.5z M1 10.5c0-1 .8-1.8 1.8-1.8v1.6c-.1 0-.2.1-.2.2s.1.2.2.2H3v1.6h-.2C1.8 12.3 1 11.5 1 10.5z',
  'scroll': 'M6 3h12a3 3 0 013 3v2h-3v10a3 3 0 01-3 3H5a3 3 0 01-3-3v-2h3V6a3 3 0 011-3zm2 2.5v1.5h7V5.5zm0 4v1.5h7V9.5zm0 4v1.5h5v-1.5z',
  'crystal': 'M12 2a8 8 0 016.3 12.9L20 17v2H4v-2l1.7-2.1A8 8 0 0112 2zm-3 4.5a4.5 4.5 0 00-1.8 3.6h2a2.5 2.5 0 011-2zM3 20.5h18V23H3z',
  'camera': 'M8 3h8l1.6 3H22v15H2V6h4.4zm4 5a5 5 0 100 10 5 5 0 000-10zm0 2.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5z',
  'trash': 'M8 1h8v2h6v3H2V3h6zM4 8h16l-1.3 15H5.3zm4.5 3v9h2v-9zm5 0v9h2v-9z',
  'copy': 'M8 2h14v14H8zm2.5 2.5v9h9v-9zM2 8h4v2.5H4.5v9h9V18H16v4H2z',
  'key': 'M8 3a6 6 0 015.7 7.9L22 19v3h-4v-2h-2v-2h-2.2l-1.9-1.9A6 6 0 118 3zm-1 3.5a2 2 0 100 4 2 2 0 000-4z',
  'swap': 'M16 2l6 5-6 5V8.5H4v-3h12zM8 12v3.5h12v3H8V22l-6-5z',
  'undo': 'M7 3v4.3A9 9 0 113 12h3a6 6 0 101.7-4.2L11 11H2V2z',
  'redo': 'M17 3v4.3A9 9 0 1021 12h-3a6 6 0 11-1.7-4.2L13 11h9V2z',
  // 炼金四元素（塔罗小阿卡纳花色）
  'alch-fire': 'M12 2 L23 21 H1Z M12 8.5 L6.2 18.5 H17.8Z',
  'alch-water': 'M1 3 H23 L12 22Z M6.2 6 L12 16 L17.8 6Z',
  'alch-air': 'M12 2 L23 21 H1Z M12 8.5 L6.2 18.5 H17.8Z M3 12.5 H21 V15 H3Z',
  'alch-earth': 'M1 3 H23 L12 22Z M6.2 6 L12 16 L17.8 6Z M3 9 H21 V11.5 H3Z',
};
/** 圆框字母（Ⓐ Ⓑ ⓪）：圆环 + 中心字 */
const CIRCLED = new Set(['A', 'B', '0']);

export type GlyphName = keyof typeof P | 'circle-A' | 'circle-B' | 'circle-0';
export const GLYPH_NAMES = [...Object.keys(P), 'circle-A', 'circle-B', 'circle-0'] as GlyphName[];

export function Glyph({ name, size, className, style, title }: { name: GlyphName; size?: number | string; className?: string; style?: CSSProperties; title?: string }) {
  const s = size ?? '1em';
  const common = { width: s, height: s, viewBox: '0 0 24 24', className: `inline-block shrink-0 ${className ?? ''}`, style: { verticalAlign: '-0.125em', ...style }, role: title ? 'img' : undefined, 'aria-label': title, 'aria-hidden': title ? undefined : true } as const;
  if (name.startsWith('circle-')) {
    const ch = name.slice(7);
    if (!CIRCLED.has(ch)) return null;
    return (
      <svg {...common}><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <text x="12" y="16.6" textAnchor="middle" fontSize="13" fontWeight="900" fill="currentColor" fontFamily="var(--p3r-font-cond)">{ch}</text></svg>
    );
  }
  return <svg {...common}><path d={P[name as keyof typeof P]} fill="currentColor" fillRule="evenodd" /></svg>;
}

/** 字符 → Glyph 名（给数据里存了字符的地方用：<GlyphText ch={meta.symbol} />） */
export const CHAR_GLYPH: Record<string, GlyphName> = {
  '🏆': 'trophy', '✨': 'sparkles', '⭐': 'star', '📌': 'pin', '🐷': 'piggy', '📜': 'scroll', '🔮': 'crystal', '📷': 'camera', '🗑': 'trash',
  '⏳': 'hourglass', '⧉': 'copy', '⚿': 'key', 'Ⓐ': 'circle-A', 'Ⓑ': 'circle-B', '⓪': 'circle-0',
  '🜂': 'alch-fire', '🜄': 'alch-water', '🜁': 'alch-air', '🜃': 'alch-earth',
};
export function GlyphText({ ch, className, size }: { ch: string; className?: string; size?: number | string }) {
  const n = CHAR_GLYPH[ch];
  return n ? <Glyph name={n} className={className} size={size} /> : <span className={className} aria-hidden>{ch}</span>;
}
