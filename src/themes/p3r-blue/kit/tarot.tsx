/**
 * 塔罗共用件（kit）：从 P4 pkg4/tarot.tsx 上收，供 P2 命运抽签 / P4 星象 / P5 图鉴复用。
 *   <ArcanaFace name number nameEn orientation width offline />  大阿卡纳牌面（蓝套 public/tarot/p3 有 22 张真图 → TarotFace 自动按罗马数取图；缺图兜底程序卡面）+ 逆位签 + 离线角标
 *   <P3Back width selected />（= PinkBack 别名）                  P3 卡背：1:1 真实 CardBack.tsx skin==='p3'
 *   cardH(w)                                                      牌高（1.66 比例）
 */
import { P3BackSvg } from './p3back';
import { TarotFace } from './surfaces';
import { P3R, slantClip } from './base';
import { cx } from '@blue/lib/cx';

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

/** P3 卡背：1:1 真实 CardBack.tsx（skin === 'p3'）——深蓝夜幕 + 青 / 红角 + 星盘白眼（固定色，不随日夜）。保留 PinkBack 名以便粉版调用点零改动。 */
export function P3Back({ width = 96, selected, className }: { width?: number; selected?: boolean; className?: string }) {
  return (
    <span className={cx('relative inline-block shrink-0 select-none', className)} style={{ width, height: cardH(width) }}>
      {selected && <span aria-hidden className="absolute -inset-[5px]" style={{ background: 'color-mix(in srgb, var(--p3r-cyan) 55%, transparent)', clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }} />}
      <span className="relative block"><P3BackSvg width={width} height={cardH(width)} /></span>
    </span>
  );
}
export const PinkBack = P3Back;
