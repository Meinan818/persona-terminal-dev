/**
 * 塔罗共用件（kit）：从 P4 pkg4/tarot.tsx 上收，供 P2 命运抽签 / P4 星象 / P5 图鉴复用。
 *   <ArcanaFace name number nameEn orientation width offline />  大阿卡纳程序牌面（粉套仓库无牌面图 → TarotFace 罗马数 + 牌名 + 八芒星 + 逆位签 + 离线角标）
 *   <PinkBack width selected />                                   粉卡背：1:1 真实 CardBack.tsx skin==='pink'（固定玫红，不随日夜）
 *   cardH(w)                                                      牌高（1.66 比例）
 */
import { useId } from 'react';
import { TarotFace } from './surfaces';
import { P3R, slantClip } from './base';
import { cx } from '@pink/lib/cx';

export const cardH = (w: number) => Math.round(w * 1.66);
export const ROMAN_NUMERALS = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];

export function ArcanaFace({ name, number, roman, nameEn, orientation = 'upright', width = 96, offline, glow, className, tag = true }: { name?: string; number?: number; roman?: string; nameEn?: string; orientation?: 'upright' | 'reversed'; width?: number; offline?: boolean; glow?: boolean; className?: string; tag?: boolean }) {
  const rev = orientation === 'reversed';
  return (
    <span className={cx('relative inline-block shrink-0', className)} style={{ width, height: cardH(width) }} role="img" aria-label={name ? `${name}${rev ? '（逆位）' : ''}` : '塔罗牌'}>
      <TarotFace name={name ?? '?'} roman={number !== undefined ? ROMAN_NUMERALS[number] ?? roman : roman} en={width >= 70 ? nameEn : undefined} reversed={rev && tag} width={width} glow={glow} />
      {offline && width >= 56 && (
        <span className="absolute -right-1 top-2 px-1.5 py-[1px] text-[10px] font-black leading-[14px]" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(4) }}>离线</span>
      )}
    </span>
  );
}

/** 粉卡背：1:1 真实 CardBack.tsx（skin === 'pink'）的 SVG（固定玫红，不随日夜） */
export function PinkBack({ width = 96, selected, className }: { width?: number; selected?: boolean; className?: string }) {
  const W = 200, H = 320;
  const gid = `pk-back-bg-${useId().replace(/:/g, '')}`;
  return (
    <span className={cx('relative inline-block shrink-0 select-none', className)} style={{ width, height: cardH(width) }}>
      {selected && <span aria-hidden className="absolute -inset-[5px]" style={{ background: 'color-mix(in srgb, var(--p3r-blue) 45%, transparent)', borderRadius: 14 }} />}
      <svg viewBox={`0 0 ${W} ${H}`} width={width} height={cardH(width)} preserveAspectRatio="none" style={{ display: 'block', position: 'relative' }} aria-hidden>
        <defs>
          <linearGradient id={gid} x1="12%" y1="4%" x2="86%" y2="100%">
            <stop offset="0%" stopColor="#EF2C8B" />
            <stop offset="48%" stopColor="#DC1673" />
            <stop offset="100%" stopColor="#BE1264" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={W} height={H} rx="12" fill={`url(#${gid})`} />
        <polygon points={`${W},0 ${W},128 34,${H} 0,${H} 0,244`} fill="#F8409F" opacity="0.42" />
        <polygon points="0,44 62,0 92,0 0,74" fill="#F8409F" opacity="0.3" />
        <rect x="11" y="11" width={W - 22} height={H - 22} fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.95" />
        <path d={`M${W - 11} 11 L${W - 52} 11 L${W - 11} 52 Z`} fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.9" />
        <path d={`M11 ${H - 11} L52 ${H - 11} L11 ${H - 52} Z`} fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.9" />
        <path d="M11 11 L52 11 L11 46 Z" fill="#ffffff" opacity="0.9" />
        <path d={`M${W - 11} ${H - 11} L${W - 52} ${H - 11} L${W - 11} ${H - 46} Z`} fill="#ffffff" opacity="0.9" />
        <circle cx="30" cy="36" r="5.5" fill="none" stroke="#ffffff" strokeWidth="1" />
        <circle cx={W / 2} cy={H / 2} r="66" fill="none" stroke="#ffffff" strokeWidth="1.1" opacity="0.85" />
        <circle cx={W / 2} cy={H / 2} r="56" fill="none" stroke="#ffffff" strokeWidth="0.5" opacity="0.45" />
        <path d={`M${W / 2} 32 L${W / 2 + 6.5} 148 L${W} 160 L${W / 2 + 6.5} 172 L${W / 2} 288 L${W / 2 - 6.5} 172 L0 160 L${W / 2 - 6.5} 148 Z`} fill="#ffffff" />
        <path d="M154 86 L156 96 L166 98 L156 100 L154 110 L152 100 L142 98 L152 96 Z" fill="#ffffff" opacity="0.95" />
        <path d="M46 240 L47.5 246 L54 248 L47.5 250 L46 256 L44.5 250 L38 248 L44.5 246 Z" fill="#ffffff" opacity="0.8" />
      </svg>
    </span>
  );
}
