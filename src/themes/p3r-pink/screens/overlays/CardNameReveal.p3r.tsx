/**
 * 牌名揭晓演出（真实 src/components/astrology/CardNameReveal.tsx p3 皮）—— #/overlay/astro-card-name-reveal（2.6s）
 *   1 入场（卡背弹入）→ 2 翻牌（rotateY 0.7s easeInOut，= DailyDraw FlipReveal）→ 3 牌名逐字（spring 460/24，每字 .07s）
 *   → 4 逆位珊瑚签晚半拍旋入 + 高光横扫 + 英文名淡入 → 停留（可切牌 / 正逆 / 重播）
 * 参数：?card=<id>（默认 lovers）&rev=1|0（默认逆位，演示「· 逆位」）
 */
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import { P3R, slantClip } from '@pink/kit';
import { useLowMotion } from '@pink/lib/prefs';
import { TAROT_BY_ID } from '@pink/mock/pkg4-tarot';
import { FxFrame } from '@pink/screens/pkg4/FxFrame';
import { Arcana, PinkBack, FlipCard, CardNameReveal } from '@pink/screens/pkg4/tarot';

const STAGES = ['入场', '翻牌', '逐字', '逆位签 · 高光'];
const PICKS = ['lovers', 'star', 'wheel_of_fortune', 'hanged_man'];

export default function CardNameRevealFx({ open, onClose, params }: OverlayProps) {
  const low = useLowMotion();
  const [id, setId] = useState(TAROT_BY_ID[params?.get('card') ?? ''] ? params!.get('card')! : 'lovers');
  const [rev, setRev] = useState(params?.get('rev') !== '0');
  const [run, setRun] = useState(0);
  const [stage, setStage] = useState(0);
  const card = TAROT_BY_ID[id];
  const n = Array.from(card.name).length;
  useEffect(() => {
    if (!open) return;
    setStage(0);
    if (low) { setStage(3); return; }
    const ts = [window.setTimeout(() => setStage(1), 420), window.setTimeout(() => setStage(2), 420 + 700), window.setTimeout(() => setStage(3), 420 + 700 + 100 + n * 70 + 120)];
    return () => ts.forEach(clearTimeout);
  }, [open, run, id, rev, low, n]);
  return (
    <FxFrame open={open} onClose={onClose} eyebrow="CARD NAME REVEAL" title="牌名揭晓" ghost="ARCANA" stages={STAGES} stage={stage} onReplay={() => setRun((r) => r + 1)}
      footer={<>
        {PICKS.map((p) => <button key={p} type="button" onClick={() => { setId(p); setRun((r) => r + 1); }} aria-pressed={p === id} className="h-10 px-3 text-[13px] font-black" style={{ clipPath: slantClip(8), background: p === id ? P3R.blue : 'var(--p3r-row)', color: p === id ? P3R.onBlue : P3R.ink }}>{TAROT_BY_ID[p].name}</button>)}
        <button type="button" onClick={() => { setRev((v) => !v); setRun((r) => r + 1); }} className="h-10 px-4 text-[13px] font-black" style={{ clipPath: slantClip(8), background: P3R.ink, color: 'var(--p3r-on-ink)' }}>{rev ? '逆位' : '正位'}</button>
      </>}>
      <div className="flex min-h-[380px] flex-col items-center justify-center gap-3">
        <motion.div key={`card-${run}-${id}-${rev}`} initial={low ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.86 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
          <FlipCard width={150} flipped={stage >= 1} back={<PinkBack width={150} />} front={<Arcana id={id} orientation={rev ? 'reversed' : 'upright'} width={150} />} />
        </motion.div>
        <div className="min-h-[86px]">
          {stage >= 2 && <CardNameReveal key={`name-${run}-${id}-${rev}`} name={card.name} nameEn={card.nameEn} reversed={rev} delay={0.1} />}
        </div>
      </div>
    </FxFrame>
  );
}
