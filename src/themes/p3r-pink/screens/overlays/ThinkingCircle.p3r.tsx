/**
 * 推理中光圈演出（真实 src/components/astrology/ThinkingCircle.tsx）—— #/overlay/astro-thinking-circle（3.0s）
 *   1 入场 → 2 结阵（进度 0→1 约 2.4s：外环进度弧 + 24 格刻度依次点亮；按 variant 生长辐条 / 六芒星 / 五角星）
 *   → 3 阵成（光晕满、阵图慢转）→ 4 第一个字到达 → 切到逐字台词框（真实：正文一到就切走）
 * ?variant=pentagram（每日，默认）| hexagram（中长期 / 追问）| spokes（窥探命运）
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import { P3R, P3Speech, slantClip } from '@pink/kit';
import { useAIStream, AIText } from '@pink/fx';
import { useLowMotion } from '@pink/lib/prefs';
import { FxFrame } from '@pink/screens/pkg4/FxFrame';
import { ThinkingCircle } from '@pink/screens/pkg4/tarot';

type V = 'pentagram' | 'hexagram' | 'spokes';
const META: Record<V, { label: string; where: string; done: string }> = {
  pentagram: { label: '解读者正在思索', where: '每日塔罗', done: '星星落在你最近反复回看的那件事上——你以为它停滞了，其实它只是在雾里慢慢成形。' },
  hexagram: { label: '三张牌正在被放在一起推演', where: '中长期占卜 / 追问', done: '现状 · 隐者：你已经在独自想这件事很久了，提灯照见的不是答案，是你真正在意的那部分。' },
  spokes: { label: '七张牌正在被逐一推演', where: '窥探命运', done: '这七天你从「魔术师」的跃跃欲试出发，在「月亮」逆位里犹豫过一次，又被「力量」拉回原地站稳。' },
};
const STAGES = ['入场', '结阵', '阵成', '落笔'];

export default function ThinkingCircleFx({ open, onClose, params }: OverlayProps) {
  const [v, setV] = useState<V>((['hexagram', 'spokes'].includes(params?.get('variant') ?? '') ? params!.get('variant') : 'pentagram') as V);
  const [run, setRun] = useState(0);
  return (
    <FxFrame open={open} onClose={onClose} eyebrow="THINKING CIRCLE" title="推理中光圈" ghost="ORACLE" onReplay={() => setRun((r) => r + 1)}
      footer={(['pentagram', 'hexagram', 'spokes'] as V[]).map((x) => (
        <button key={x} type="button" aria-pressed={x === v} onClick={() => { setV(x); setRun((r) => r + 1); }} className="h-10 px-3 text-[13px] font-black" style={{ clipPath: slantClip(8), background: x === v ? P3R.blue : 'var(--p3r-row)', color: x === v ? P3R.onBlue : P3R.ink }}>{META[x].where}</button>
      ))}>
      <Run key={`${v}-${run}`} v={v} />
    </FxFrame>
  );
}

function Run({ v }: { v: V }) {
  const low = useLowMotion();
  const [p, setP] = useState(0);
  const [stage, setStage] = useState(0);
  const ai = useAIStream({ text: META[v].done, cps: 40 });
  useEffect(() => {
    if (low) { setP(1); setStage(3); ai.skip(); return; }
    const t0 = performance.now() + 300; let raf = 0;
    const tick = () => {
      const e = performance.now() - t0;
      const x = Math.max(0, Math.min(1, e / 2400));
      setP(x); setStage(e < 0 ? 0 : x < 1 ? 1 : 2);
      if (x >= 1) { window.setTimeout(() => { setStage(3); ai.resume(); }, 300); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="flex flex-wrap justify-center gap-1" aria-hidden>
        {STAGES.map((s, i) => <span key={s} className="px-2.5 py-1 text-[11px] font-black" style={{ clipPath: slantClip(5), background: i === stage ? P3R.blue : i < stage ? 'var(--p3r-cyan-pale)' : 'var(--p3r-row)', color: i === stage ? P3R.onBlue : i < stage ? P3R.ink : P3R.grey }}>{`${i + 1} ${s}`}</span>)}
      </div>
      <AnimatePresence mode="wait">
        {stage < 3 ? (
          <motion.div key="circle" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.06 }} transition={{ duration: 0.25 }} className="flex flex-col items-center gap-3 px-6 py-6" style={{ background: P3R.panel, clipPath: slantClip(18), boxShadow: 'var(--p3r-shadow)' }}>
            <ThinkingCircle variant={v} progress={p} size={176} label={stage >= 2 ? '正在展开' : META[v].label} showPercent />
            <span className="text-[12px] font-bold" style={{ color: P3R.grey }}>{stage >= 2 ? '阵已结成，等候第一个字…' : '离开这页也不会中断'}</span>
          </motion.div>
        ) : (
          <motion.div key="text" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="w-full max-w-[460px]">
            <P3Speech speaker={META[v].where} more={ai.phase === 'done'}><AIText ai={ai} /></P3Speech>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex gap-4 opacity-80" aria-hidden>
        {(['pentagram', 'hexagram', 'spokes'] as V[]).filter((x) => x !== v).map((x) => <ThinkingCircle key={x} variant={x} progress={p} size={64} showPercent={false} />)}
      </div>
    </div>
  );
}
