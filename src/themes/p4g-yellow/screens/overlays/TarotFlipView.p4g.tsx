/**
 * 塔罗翻面卡（真实 src/components/codex/TarotFlipView.tsx）：「X · 图鉴」；正面牌图，背面牌名 / 英文 / 罗马数字 / 正位·逆位关键词与牌意
 * / 正位·逆位「首次 日期 · N 次 / 尚未抽到」；提示「点一下或左右拖动翻面 · 背面是牌意」。?card=<id>
 * 牌面：大阿卡纳用 public/assets/tarot/p4/<id>.webp（P4 包已拷入；缺失时 P4G 生成式牌面兜底），小阿卡纳用生成式牌面。
 */
import type { OverlayProps } from '@yellow/registry/types';
import { asset } from '@yellow/lib/asset';
import { useImageOk } from '@yellow/lib/slots';
import { cx } from '@yellow/lib/cx';
import { FlipBackPanel, FlipCardView } from './FlipCardView.p4g';
import { P5_MAJOR, P5_MINOR, P5_SUIT_META, type P5TarotCard } from '@yellow/mock/pkg5-tarot';
import { TAROT_COLLECTED } from '@yellow/mock/pkg5';

/** 牌面：有图用图，否则 P4G 风格生成牌面（黄底黑框 + 巨号罗马数字 + 名字条）*/
export function TarotFace({ card, dim, className }: { card: P5TarotCard; dim?: boolean; className?: string }) {
  const src = card.arcana === 'major' ? asset(`tarot/p4/${card.id}.webp`) : undefined;
  const ok = useImageOk(src);
  const suit = card.suit ? P5_SUIT_META[card.suit] : null;
  return (
    <span className={cx('relative block h-full w-full overflow-hidden', className)} style={{ filter: dim ? 'grayscale(1)' : undefined, opacity: dim ? 0.45 : 1 }}>
      {src && ok !== false ? (
        <img src={src} alt={card.name} draggable={false} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full flex-col items-center justify-between bg-p4g-yellow p-[7%] text-p4g-black">
          <span className="w-full border-y-2 border-p4g-black py-[2%] text-center font-display text-[clamp(7px,2.2cqw,11px)] font-bold tracking-[0.2em]">{card.arcana === 'major' ? 'MAJOR' : suit?.name}</span>
          <span className="p4g-num leading-none" style={{ fontSize: 'clamp(18px, 40cqw, 120px)' }}>{card.arcana === 'major' ? card.roman : suit?.symbol}</span>
          <span className="w-full -skew-x-6 bg-p4g-black py-[3%] text-center font-display text-[clamp(8px,2.6cqw,14px)] font-bold text-p4g-yellow">{card.name}</span>
        </span>
      )}
    </span>
  );
}

export function TarotFlipViewView({ card, open, onClose }: { card: P5TarotCard | null; open: boolean; onClose: () => void }) {
  if (!card) return null;
  const e = TAROT_COLLECTED[card.id];
  const up = !!e?.upright.count;
  const rev = !!e?.reversed.count;
  return (
    <FlipCardView open={open} onClose={onClose} label={`${card.name} · 图鉴`} resetKey={card.id} hint="点一下或左右拖动翻面 · 背面是牌意"
      front={() => <span className="block h-full w-full [container-type:inline-size]"><TarotFace card={card} /></span>}
      back={() => (
        <FlipBackPanel>
          <div className="flex items-baseline justify-between gap-2">
            <div className="min-w-0"><div className="font-display text-[22px] font-bold leading-none">{card.name}</div><div className="mt-1 text-2xs font-bold tracking-[0.2em] opacity-60">{card.nameEn.toUpperCase()}</div></div>
            {card.roman && <div className="p4g-num text-[28px] leading-none opacity-30">{card.roman}</div>}
          </div>
          <div className="mt-4 flex flex-col gap-3 text-meta leading-relaxed">
            {(['upright', 'reversed'] as const).map((o) => (
              <div key={o}>
                <div className="mb-1 flex min-w-0 items-center gap-2 text-2xs font-bold"><span className={cx('shrink-0 rounded-xs px-1.5 py-0.5', o === 'upright' ? 'bg-p4g-black text-p4g-yellow' : 'bg-p4g-orange text-p4g-black')}>{o === 'upright' ? '正位' : '逆位'}</span><span className="min-w-0 truncate opacity-60">{card[o].keywords.join(' · ')}</span></div>
                <p>{card[o].meaning}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t-2 border-dashed border-p4g-black/25 pt-3 text-2xs font-bold opacity-75">
            <div>正位 {up ? `首次 ${e!.upright.first} · ${e!.upright.count} 次` : '尚未抽到'}</div>
            <div className="mt-0.5">逆位 {rev ? `首次 ${e!.reversed.first} · ${e!.reversed.count} 次` : '尚未抽到'}</div>
          </div>
        </FlipBackPanel>
      )} />
  );
}

export default function TarotFlipView({ open, onClose, params }: OverlayProps) {
  const id = params?.get('card') ?? 'chariot';
  const card = [...P5_MAJOR, ...P5_MINOR].find((c) => c.id === id) ?? P5_MAJOR[7];
  return <TarotFlipViewView card={card} open={open} onClose={onClose} />;
}
