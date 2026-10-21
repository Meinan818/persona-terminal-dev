/**
 * 洗牌演出（真实 src/components/astrology/ShuffleAnim.tsx + CardBack.tsx skin='p3'）—— #/overlay/astro-shuffle（3.2s）
 *   1 入场（斜板切入 340ms + SHUFFLE TIME 斜带横扫）→ 2 洗牌（1800ms 的前 70%：五张左右交错 0.9s × repeat 1）
 *   → 3 收叠（后 30%：收成一叠 0.4s 停住）→ 4 展开三张（spring，delay i×0.12，= DailyDraw pick 入场）→ 停在选牌态（可重播 / 关闭）
 * ?view=backs —— 粉卡背 · 牌面框图鉴（astro-card-back）：卡背尺寸档、选中光晕、大阿卡纳程序卡面（正 / 逆 / 离线）、小阿卡纳粉套实图。
 */
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { P3R, TarotFace, slantClip, SectionMark } from '@blue/kit';
import { CutInSweep } from '@blue/fx';
import { useLowMotion } from '@blue/lib/prefs';
import { tarotAsset } from '@blue/lib/asset';
import { FxFrame } from '@blue/screens/pkg4/FxFrame';
import { PinkBack, ShuffleDeck, Arcana } from '@blue/screens/pkg4/tarot';

const STAGES = ['入场', '洗牌', '收叠', '展开'];

export default function ShuffleAnimFx({ open, onClose, params }: OverlayProps) {
  if (params?.get('view') === 'backs') return <BacksGallery open={open} onClose={onClose} />;
  return <ShuffleFx open={open} onClose={onClose} />;
}

function ShuffleFx({ open, onClose }: { open: boolean; onClose: () => void }) {
  const low = useLowMotion();
  const [run, setRun] = useState(0);
  const [stage, setStage] = useState(0);
  const [sweep, setSweep] = useState(false);
  useEffect(() => {
    if (!open) return;
    setStage(0); setSweep(!low);
    const t = window.setTimeout(() => setStage(1), low ? 0 : 340);
    return () => clearTimeout(t);
  }, [open, run, low]);
  return (
    <FxFrame open={open} onClose={onClose} eyebrow="SHUFFLE TIME" title="洗牌" ghost="SHUFFLE" stages={STAGES} stage={stage} onReplay={() => setRun((r) => r + 1)}>
      <CutInSweep active={sweep} text="SHUFFLE TIME" sub="今日的星象正在汇聚" onDone={() => setSweep(false)} />
      <div className="text-center">
        <div className="font-heavy text-[19px] tracking-[2px]" style={{ color: P3R.blueDeep }}>{stage < 3 ? '正在洗牌…' : '从三张牌中选择一张'}</div>
        <div className="mt-1 text-[12px] font-bold" style={{ color: P3R.grey }}>{stage < 3 ? '今日的星象正在汇聚' : '每日仅一次，慎重选择'}</div>
      </div>
      <div className="relative mt-6 flex min-h-[200px] w-full items-center justify-center">
        {stage >= 1 && stage < 3 && (
          <ShuffleDeck key={`run-${run}`} duration={1800} cardWidth={92} onStage={(s) => { if (s === 'stack') setStage(2); }} onComplete={() => setStage(3)} />
        )}
        {stage === 3 && (
          <div className="flex items-center justify-center gap-3">
            {[0, 1, 2].map((i) => (
              <motion.div key={`fan-${run}-${i}`} initial={low ? { opacity: 0 } : { opacity: 0, y: 30, rotate: -6 + i * 6, x: (1 - i) * 90 }} animate={{ opacity: 1, y: 0, x: 0, rotate: -6 + i * 6 }} transition={{ delay: i * 0.12, type: 'spring', damping: 18, stiffness: 200 }}>
                <PinkBack width={92} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </FxFrame>
  );
}

const MINOR = [
  { file: 'cups_3.webp', name: '圣杯三' }, { file: 'wands_1.webp', name: '权杖王牌' }, { file: 'swords_7.webp', name: '宝剑七' }, { file: 'pentacles_10.webp', name: '星币十' },
];

function BacksGallery({ open, onClose }: { open: boolean; onClose: () => void }) {
  const low = useLowMotion();
  const item = (i: number) => ({ initial: low ? { opacity: 0 } : { opacity: 0, x: -18 }, animate: { opacity: 1, x: 0 }, transition: { delay: low ? 0 : 0.2 + i * 0.06 } });
  return (
    <FxFrame open={open} onClose={onClose} eyebrow="CARD BACK · P3" title="P3 卡背 · 牌面" ghost="ARCANA">
      <div className="w-full space-y-6">
        <motion.section {...item(0)} className="px-5 py-4" style={{ background: P3R.panel, clipPath: slantClip(14), boxShadow: 'var(--p3r-shadow)' }}>
          <SectionMark title="卡背" en="BACK SKIN · P3" />
          <p className="mt-1 text-[12px]" style={{ color: P3R.grey }}>真实 CardBack.tsx skin=p3：深蓝夜幕 + 白描边 + 青 / 红角 + 中央星盘白眼 + 四角小星（不随日夜变色）</p>
          <div className="mt-3 flex flex-wrap items-end gap-4">
            {[40, 72, 92].map((w) => <div key={`bw${w}`} className="flex flex-col items-center gap-1"><PinkBack width={w} /><span className="font-cond text-[11px]" style={{ color: P3R.grey }}>{w}px</span></div>)}
            <div className="flex flex-col items-center gap-1"><PinkBack width={92} selected /><span className="text-[11px] font-bold" style={{ color: P3R.roseInk }}>选中</span></div>
          </div>
        </motion.section>
        <motion.section {...item(1)} className="px-5 py-4" style={{ background: P3R.panel, clipPath: slantClip(14), boxShadow: 'var(--p3r-shadow)' }}>
          <SectionMark title="大阿卡纳" en="MAJOR · public/tarot/p3" />
          <p className="mt-1 text-[12px]" style={{ color: P3R.grey }}>蓝套 22 张大阿卡纳真图（翻牌时牌背玻璃碎开）；逆位整张倒转 + 臂章红签；离线角标。</p>
          <div className="mt-3 flex flex-wrap items-end gap-4 pb-2">
            <Arcana id="star" width={92} />
            <Arcana id="tower" orientation="reversed" width={92} />
            <Arcana id="moon" width={92} offline />
            <Arcana id="fool" width={56} />
          </div>
        </motion.section>
        <motion.section {...item(2)} className="px-5 py-4" style={{ background: P3R.panel, clipPath: slantClip(14), boxShadow: 'var(--p3r-shadow)' }}>
          <SectionMark title="小阿卡纳" en="MINOR · public/tarot/p3" />
          <div className="mt-3 flex flex-wrap items-end gap-4">
            {MINOR.map((m) => <div key={m.file} className="flex flex-col items-center gap-1"><TarotFace src={tarotAsset(m.file)} name={m.name} width={80} /><span className="text-[11px] font-bold" style={{ color: P3R.grey }}>{m.name}</span></div>)}
          </div>
        </motion.section>
      </div>
    </FxFrame>
  );
}
