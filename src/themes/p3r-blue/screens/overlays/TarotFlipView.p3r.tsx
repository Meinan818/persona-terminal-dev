/**
 * 塔罗翻面卡（真实 src/components/codex/TarotFlipView.tsx + FlipCardView.tsx）→ 蓝白 P3R。
 * 「X · 图鉴」；正面牌图（蓝塔罗：public/assets/tarot/p3 78 张原画，大阿卡纳按罗马数取图）；
 * 背面牌名 / 英文 / 罗马数字 / 正位·逆位关键词与牌意 / 正位·逆位「首次 日期 · N 次 / 尚未抽到」；提示「点一下或左右拖动翻面 · 背面是牌意」。
 * 路由：?card=<id>（默认 chariot）；?anim=1 = 演出版 achv-tarot-flip-anim（2.6s：斜带横扫 → 飞入翻正 → 1.6s 自动翻面 → 2.2s 提示）。
 */
import type { OverlayProps } from '@blue/registry/types';
import { TarotFace as KitTarotFace, P3R, slantClip } from '@blue/kit';
import { tarotAsset } from '@blue/lib/asset';
import { FlipBackPanel, FlipCardView } from './FlipCardView.p3r';
import { P5_MAJOR, P5_MINOR, type P5TarotCard } from '@blue/mock/pkg5-tarot';
import { TAROT_COLLECTED } from '@blue/mock/pkg5';

const SUIT: Record<string, { name: string; glyph: string }> = { wands: { name: '权杖', glyph: '✦' }, cups: { name: '圣杯', glyph: '◆' }, swords: { name: '宝剑', glyph: '✧' }, pentacles: { name: '星币', glyph: '❖' } };
export const suitOf = (s?: string) => (s ? SUIT[s] : null);

/** 牌面：小阿卡纳用原画，大阿卡纳程序卡面；dim = 未收录灰化 */
export function TarotFace({ card, width, dim }: { card: P5TarotCard; width: number; dim?: boolean }) {
  return (
    <span className="block" style={{ filter: dim ? 'grayscale(1)' : undefined, opacity: dim ? 0.42 : 1 }}>
      <KitTarotFace width={width} src={card.arcana === 'minor' ? tarotAsset(`${card.id}.webp`) : undefined} roman={card.arcana === 'major' ? card.roman : suitOf(card.suit)?.glyph} name={card.name} en={card.nameEn} />
    </span>
  );
}

export function TarotFlipViewView({ card, open, onClose, intro }: { card: P5TarotCard | null; open: boolean; onClose: () => void; intro?: boolean }) {
  if (!card) return null;
  const e = TAROT_COLLECTED[card.id];
  const up = !!e?.upright.count;
  const rev = !!e?.reversed.count;
  return (
    <FlipCardView open={open} onClose={onClose} label={`${card.name} · 图鉴`} resetKey={card.id} hint="点一下或左右拖动翻面 · 背面是牌意" intro={intro}
      front={(w, h) => <span className="flex h-full w-full items-center justify-center" style={{ background: P3R.panel }}><KitTarotFace width={Math.min(w, Math.round(h / 1.66))} src={card.arcana === 'minor' ? tarotAsset(`${card.id}.webp`) : undefined} roman={card.arcana === 'major' ? card.roman : suitOf(card.suit)?.glyph} name={card.name} en={card.nameEn} /></span>}
      back={() => (
        <FlipBackPanel>
          <div className="flex items-baseline justify-between gap-2">
            <div className="min-w-0"><div className="font-heavy text-[24px] leading-none">{card.name}</div><div className="mt-1 text-[11px] font-bold tracking-[0.2em]" style={{ color: P3R.grey }}>{card.nameEn.toUpperCase()}</div></div>
            {card.roman ? <div className="font-cond text-[30px] leading-none" style={{ color: P3R.cyan }}>{card.roman}</div> : <div className="text-[12px] font-black" style={{ color: P3R.roseInk }}>{suitOf(card.suit)?.name}</div>}
          </div>
          <div className="mt-4 flex flex-col gap-3 text-[13px] leading-relaxed">
            {(['upright', 'reversed'] as const).map((o) => (
              <div key={o}>
                <div className="mb-1 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] font-black">
                  <span className="shrink-0 px-2 py-0.5" style={{ clipPath: slantClip(4), background: o === 'upright' ? P3R.blue : P3R.ink, color: o === 'upright' ? P3R.onBlue : 'var(--p3r-on-ink)' }}>{o === 'upright' ? '正位' : '逆位'}</span>
                  <span className="min-w-0" style={{ color: P3R.roseInk }}>{card[o].keywords.join(' · ')}</span>
                </div>
                <p>{card[o].meaning}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t-2 border-dotted pt-3 text-[11px] font-black" style={{ borderColor: 'rgb(var(--p3r-cyan-rgb) / 0.6)', color: P3R.inkSoft }}>
            <div>正位 {up ? `首次 ${e!.upright.first} · ${e!.upright.count} 次` : '尚未抽到'}</div>
            <div className="mt-0.5">逆位 {rev ? `首次 ${e!.reversed.first} · ${e!.reversed.count} 次` : '尚未抽到'}</div>
          </div>
        </FlipBackPanel>
      )} />
  );
}

export default function TarotFlipView({ open, onClose, params }: OverlayProps) {
  const id = params?.get('card') ?? (params?.get('anim') === '1' ? 'cups_3' : 'chariot');
  const card = [...P5_MAJOR, ...P5_MINOR].find((c) => c.id === id) ?? P5_MAJOR[7];
  return <TarotFlipViewView card={card} open={open} onClose={onClose} intro={params?.get('anim') === '1'} />;
}
