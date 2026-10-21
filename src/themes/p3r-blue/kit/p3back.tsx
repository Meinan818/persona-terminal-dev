/**
 * P3 卡背 SVG：1:1 真实 src/components/astrology/CardBack.tsx（skin === 'p3'，p3-astrology 设计稿）——
 * 深蓝夜幕 + 白描边 + 内白细框 + 左上青角 / 右下臂章红角（src 洋红 → 红）+ 对角细虚线 + 中央星盘白眼 + 四角小四角星。固定色，不随日夜。
 */
import { useId } from 'react';

export function P3BackSvg({ width, height, className }: { width: number | string; height: number | string; className?: string }) {
  const W = 200, H = 320;
  const gid = `p3-back-bg-${useId().replace(/:/g, '')}`;
  const sparkle = (cx: number, cy: number, r: number) => `M${cx} ${cy - r} L${cx + r * 0.28} ${cy - r * 0.28} L${cx + r} ${cy} L${cx + r * 0.28} ${cy + r * 0.28} L${cx} ${cy + r} L${cx - r * 0.28} ${cy + r * 0.28} L${cx - r} ${cy} L${cx - r * 0.28} ${cy - r * 0.28} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={width} height={height} preserveAspectRatio="none" className={className} style={{ display: 'block' }} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2b63ff" />
          <stop offset="100%" stopColor="#1443d6" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width={W - 4} height={H - 4} rx="10" fill={`url(#${gid})`} stroke="#ffffff" strokeWidth="2.5" />
      <rect x="12" y="12" width={W - 24} height={H - 24} rx="6" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
      <path d="M6 6 L66 6 L6 60 Z" fill="#35d1e8" opacity="0.92" />
      <path d={`M${W - 6} ${H - 6} L${W - 46} ${H - 6} L${W - 6} ${H - 40} Z`} fill="#e8283c" opacity="0.88" />
      <line x1="22" y1="298" x2="178" y2="24" stroke="rgba(255,255,255,0.32)" strokeWidth="0.7" strokeDasharray="3 4" />
      <line x1="14" y1="236" x2="186" y2="86" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" strokeDasharray="2 5" />
      <g transform={`translate(${W / 2}, ${H / 2})`} stroke="rgba(255,255,255,0.9)" fill="none">
        <circle r="62" strokeWidth="0.8" strokeDasharray="2 4" opacity="0.7" />
        <circle r="50" strokeWidth="1.1" />
        <circle r="38" strokeWidth="0.6" strokeDasharray="1 3" opacity="0.8" />
        <line x1="0" y1="-72" x2="0" y2="-44" strokeWidth="0.6" opacity="0.6" />
        <line x1="0" y1="44" x2="0" y2="72" strokeWidth="0.6" opacity="0.6" />
        <line x1="-72" y1="0" x2="-44" y2="0" strokeWidth="0.6" opacity="0.6" />
        <line x1="44" y1="0" x2="72" y2="0" strokeWidth="0.6" opacity="0.6" />
        <circle cx="50" cy="0" r="3" fill="#ffffff" stroke="none" />
        <circle cx="-35.4" cy="-35.4" r="2.2" fill="#ffffff" stroke="none" />
        <circle cx="0" cy="-62" r="2.6" strokeWidth="1" />
        <circle cx="-50" cy="0" r="1.8" fill="#ffffff" stroke="none" opacity="0.85" />
        <circle cx="26.9" cy="26.9" r="2" fill="#ffffff" stroke="none" opacity="0.9" />
        <path d="M -27 0 Q 0 -17 27 0 Q 0 17 -27 0 Z" fill="#ffffff" stroke="none" />
        <circle r="8.5" fill="#1443d6" stroke="none" />
        <path d="M 2 -6.2 A 6.6 6.6 0 1 1 2 6.2 A 8.6 8.6 0 0 0 2 -6.2 Z" fill="#ffffff" stroke="none" />
      </g>
      {[[24, 28], [W - 24, 28], [24, H - 28], [W - 24, H - 28]].map(([cx, cy], i) => <path key={i} d={sparkle(cx, cy, 5)} fill="#ffffff" opacity="0.85" />)}
    </svg>
  );
}

/** 大阿卡纳 0–XXI → 真实 public/tarot/p3/ 文件名（蓝套 78 张全图，含 22 张大阿卡纳） */
export const MAJOR_FILES = ['fool', 'magician', 'high_priestess', 'empress', 'emperor', 'hierophant', 'lovers', 'chariot', 'strength', 'hermit', 'wheel_of_fortune', 'justice', 'hanged_man', 'death', 'temperance', 'devil', 'tower', 'star', 'moon', 'sun', 'judgement', 'world'] as const;
export const ROMAN_LIST = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
export const majorFileOf = (roman?: string): string | undefined => { const i = roman ? ROMAN_LIST.indexOf(roman) : -1; return i >= 0 ? `${MAJOR_FILES[i]}.webp` : undefined; };
