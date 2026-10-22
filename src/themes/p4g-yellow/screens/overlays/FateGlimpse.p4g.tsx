/**
 * 真实：src/components/astrology/FateGlimpse.tsx 的两个弹层
 *   DayReview  —— 当日塔罗回看（点七日连星某天）：电视画面弹出（P4Dialog）
 *   GlimpseFlow —— 窥探命运：七牌聚拢 → 长按中央命运之牌 → 翻面 → 解读（总结/展望/建议）→ 收下命运的低语
 * 路由：#/overlay/astro-day-review、#/overlay/astro-glimpse-flow（?view=review 直接看上次结果；?state=error 解读中断；?state=offline 离线兜底）
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import type { DailyDivination, FateGlimpse } from '@real/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Dialog, P4Button, P4Outline, Portal, useEscape, useScrollLock, IconClose } from '@yellow/kit';
import { FogRain, TVFlash, tvPowerVariants } from '@yellow/fx';
import { useLowMotion } from '@yellow/lib/prefs';
import { cx } from '@yellow/lib/cx';
import { TAROT_BY_ID, ORI_LABEL, ATTR_NAMES } from '@yellow/mock/pkg4-tarot';
import { WINDOW_DAYS, LAST_GLIMPSE, WEEKDAY_CN } from '@yellow/mock/pkg4-astro';
import { TarotFace, TarotBack, Markdownish, ThinkingTV, useHold, useFakeProgress, useTypewriter, cardH } from '@yellow/screens/pkg4/tarot';
import { MsgBox, Kicker } from '@yellow/screens/pkg4/ui';

// ───────────────────────── 当日塔罗回看 ─────────────────────────
export function DayReviewDialog({ d, open, onClose }: { d: DailyDivination | null; open: boolean; onClose: () => void }) {
  const card = d ? TAROT_BY_ID[d.cardId] : null;
  const date = d ? new Date(d.date) : new Date();
  return (
    <P4Dialog open={open && !!d} onClose={onClose} role="dialog" actions="buttons" confirmText="关闭" cancelText={null}
      speaker={`${date.getMonth() + 1}/${date.getDate()} · 周${WEEKDAY_CN[date.getDay()]}`}
      title={card ? `${card.name}${d!.orientation === 'reversed' ? ' · 逆位' : ' · 正位'}` : ''}>
      {d && card && (
        <div aria-label="当日塔罗回看" className="flex min-w-0 gap-3">
          <TarotFace id={d.cardId} orientation={d.orientation} width={78} offline={d.source === 'offline'} />
          <div className="min-w-0 flex-1">
            <div className="inline-block rounded-xs bg-p4g-yellow px-1.5 py-0.5 font-display text-meta font-bold text-p4g-black">当日加成：{ATTR_NAMES[d.effect.attribute]} × {d.effect.multiplier}</div>
            <div className="mt-2 font-display text-2xs font-bold uppercase tracking-[0.2em] text-p4g-yellow">当日解读</div>
            <div className="mt-1 max-h-[38vh] overflow-y-auto pr-1 text-meta"><Markdownish text={d.narration} className="text-meta" /></div>
          </div>
        </div>
      )}
    </P4Dialog>
  );
}

// ───────────────────────── 窥探命运 ─────────────────────────
type Stage = 'gather' | 'await' | 'flipping' | 'revealed';
type Ai = 'pending' | 'streaming' | 'error' | 'done';

function FateCardFace({ verdict, width }: { verdict: string | null; width: number }) {
  return (
    <div className="relative flex flex-col items-center justify-between overflow-hidden rounded-[6px] border-3 border-p4g-yellow bg-p4g-black px-2 py-2.5 shadow-[4px_4px_0_var(--p4g-orange)]" style={{ width, height: cardH(width) }}>
      <div className="font-display text-[8px] font-bold tracking-[0.35em] text-p4g-yellow">FATE</div>
      <svg viewBox="0 0 40 40" width={width * 0.42} height={width * 0.42} aria-hidden><path d="M20 2 C22 15 25 18 38 20 C25 22 22 25 20 38 C18 25 15 22 2 20 C15 18 18 15 20 2Z" fill="#FFE500" /></svg>
      <div className={`min-h-[30px] px-0.5 text-center font-display font-bold leading-tight text-white ${width < 90 ? 'text-2xs' : 'text-meta'}`}>{verdict ?? '……'}</div>
      <div className="font-display text-[7px] font-bold tracking-[0.3em] text-white/50">MASKARIA</div>
      <div aria-hidden className="absolute inset-x-0 top-0 h-1.5 p4g-candy-h" />
    </div>
  );
}

function ReadingBlock({ label, en, text, delay }: { label: string; en: string; text: string; delay: number }) {
  const low = useLowMotion();
  return (
    <motion.div initial={{ opacity: 0, y: low ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.22 }}>
      <MsgBox speaker={<span>{label}<span className="ml-1.5 text-2xs italic tracking-[0.18em]">{en}</span></span>}>
        <div className="whitespace-pre-line text-body leading-relaxed">{text}</div>
      </MsgBox>
    </motion.div>
  );
}

export function GlimpseFlowOverlay({ open, onClose, mode = 'new', glimpse = LAST_GLIMPSE, days = WINDOW_DAYS.map((d) => d.drawn!).filter(Boolean), forceError, forceOffline }: {
  open: boolean; onClose: () => void; mode?: 'new' | 'review'; glimpse?: FateGlimpse; days?: DailyDivination[]; forceError?: boolean; forceOffline?: boolean;
}) {
  const low = useLowMotion();
  useScrollLock(open);
  useEscape(open, onClose);
  const [stage, setStage] = useState<Stage>(mode === 'review' ? 'revealed' : 'gather');
  const [ai, setAi] = useState<Ai>(mode === 'review' ? 'done' : 'pending');
  const [offline, setOffline] = useState(!!forceOffline || glimpse.source === 'offline');
  const [continued, setContinued] = useState(0);
  useEffect(() => {
    if (!open) return;
    setStage(mode === 'review' ? 'revealed' : 'gather'); setAi(mode === 'review' ? 'done' : 'pending'); setOffline(!!forceOffline);
    if (mode === 'review') return;
    const t = setTimeout(() => setStage('await'), low ? 200 : 1300);
    return () => clearTimeout(t);
  }, [open, mode, low, forceOffline]);
  const onCharged = useCallback(() => { setStage('flipping'); setTimeout(() => setStage('revealed'), low ? 100 : 650); }, [low]);
  const hold = useHold(low ? 600 : 2200, onCharged, stage === 'await');
  // 解读：思索 → 流式 → 完成 / 出错
  const thinking = stage === 'revealed' && ai === 'pending';
  const prog = useFakeProgress(thinking, 2400);
  useEffect(() => { if (thinking && prog >= 1) setAi(forceError && !continued ? 'error' : 'streaming'); }, [thinking, prog, forceError, continued]);
  const full = `${glimpse.summary}`;
  const tw = useTypewriter(full, ai === 'streaming', 90);
  useEffect(() => { if (ai === 'streaming' && tw.done) setAi('done'); }, [ai, tw.done]);
  const revealed = stage === 'revealed';
  const verdict = revealed ? glimpse.verdict : null;
  const w = revealed ? 44 : 54;
  const top = days.slice(0, 4), bottom = days.slice(4, 7);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="fate" role="dialog" aria-modal="true" aria-label="窥探命运" className="fixed inset-0 flex justify-center overflow-hidden bg-[#0b0a07]" style={{ zIndex: 'var(--p4g-z-sheet)' as unknown as number }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FogRain fog rain intensity={0.5} />
            <div aria-hidden className="absolute inset-x-0 top-0 h-3 p4g-candy-h" />
            <motion.div className="relative flex h-full w-full max-w-[560px] min-w-0 flex-col" variants={tvPowerVariants(low)} initial="off" animate="on" exit="off">
              <button type="button" aria-label="关闭" onClick={onClose} className="p4g-press absolute right-3 top-14 z-10 flex h-10 w-10 items-center justify-center rounded-sm border-3 border-p4g-yellow bg-p4g-black text-p4g-yellow"><IconClose size={16} /></button>
              <div className="shrink-0 px-5 pt-7 text-center">
                <Kicker tone="yellow">GLIMPSE OF FATE</Kicker>
                <div className="mt-1"><P4Outline size="clamp(28px,8vw,40px)" stroke={5} fill="var(--p4g-yellow)" strokeColor="#000" italic>窥探命运</P4Outline></div>
                <div className="mt-1 min-h-[20px] font-display text-meta font-bold text-white/85" aria-live="polite">
                  {stage === 'gather' && '七日的牌正在聚拢……'}
                  {stage === 'await' && (hold.progress > 0.04 ? '别松手——命运正在显形' : '长按中央的命运之牌')}
                  {stage === 'flipping' && '……'}
                  {revealed && (ai === 'pending' ? '命运正在凝聚成文字……' : ' ')}
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
                {/* 牌阵：上四 · 中央 · 下三 */}
                <div className={cx('mx-auto flex flex-col items-center', revealed ? 'gap-2 pt-1' : 'gap-3 pt-3')}>
                  <Row cards={top} w={w} stage={stage} offset={0} />
                  <div className="relative flex items-center justify-center" style={{ padding: revealed ? 4 : 14 }}>
                    {/* 蓄力环（分段，黄） */}
                    {stage !== 'gather' && (
                      <svg aria-hidden viewBox="0 0 100 100" className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: (revealed ? 92 : 150) * 1.2, height: (revealed ? 92 : 150) * 1.2 }}>
                        {Array.from({ length: 36 }, (_, i) => {
                          const a = (i / 36) * Math.PI * 2 - Math.PI / 2; const lit = revealed || i / 36 < hold.progress;
                          return <line key={i} x1={50 + Math.cos(a) * 40} y1={50 + Math.sin(a) * 40} x2={50 + Math.cos(a) * 48} y2={50 + Math.sin(a) * 48} stroke={lit ? '#FFE500' : 'rgba(255,229,0,.18)'} strokeWidth="3.4" />;
                        })}
                      </svg>
                    )}
                    <motion.div
                      {...hold.handlers}
                      role={stage === 'await' ? 'button' : undefined} tabIndex={stage === 'await' ? 0 : -1} aria-label={stage === 'await' ? '长按中央的命运之牌' : undefined}
                      className={cx('relative select-none', stage === 'await' && 'cursor-pointer touch-none')}
                      style={{ perspective: 900 }}
                      animate={{ scale: stage === 'await' && hold.progress > 0 ? 1 + hold.progress * 0.06 : 1 }}
                    >
                      <motion.div style={{ transformStyle: 'preserve-3d', width: revealed ? 84 : 96, height: cardH(revealed ? 84 : 96) }} animate={{ rotateY: low ? 0 : stage === 'flipping' || revealed ? 180 : 0 }} transition={{ duration: 0.6 }} className="relative">
                        {low ? (revealed ? <FateCardFace verdict={verdict} width={84} /> : <TarotBack width={96} />) : (
                          <>
                            <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}><TarotBack width={revealed ? 84 : 96} /></div>
                            <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}><FateCardFace verdict={verdict} width={revealed ? 84 : 96} /></div>
                          </>
                        )}
                      </motion.div>
                    </motion.div>
                  </div>
                  <Row cards={bottom} w={w} stage={stage} offset={4} />
                </div>

                {/* 解读面板 */}
                {revealed && (
                  <div className="mt-5 space-y-4">
                    {ai === 'pending' && <div className="flex justify-center"><ThinkingTV progress={prog} label={prog < 0.6 ? '七张牌正在被逐一推演' : '七张牌的线索正在汇成一段命运'} /></div>}
                    {ai === 'streaming' && <ReadingBlock label="总结" en="RETROSPECT" delay={0} text={tw.text || '…'} />}
                    {ai === 'error' && (
                      <>
                        <ReadingBlock label="总结" en="RETROSPECT" delay={0} text={glimpse.summary.slice(0, 48) + '…'} />
                        <div className="rounded-sm border-3 border-p4g-yellow bg-p4g-black p-3 text-center">
                          <div className="font-display text-body font-bold text-p4g-yellow">命运仍在落笔……</div>
                          <div className="mt-3 flex flex-wrap justify-center gap-2">
                            <P4Button size="sm" onClick={() => { setContinued((c) => c + 1); setAi('streaming'); }}>接着写</P4Button>
                            <P4Button size="sm" variant="secondary" onClick={() => { setContinued((c) => c + 1); setAi('pending'); }}>{continued ? '重试 AI 解读' : '重新解读'}</P4Button>
                            <P4Button size="sm" variant="secondary" onClick={() => { setOffline(true); setAi('done'); }}>使用离线兜底</P4Button>
                          </div>
                        </div>
                      </>
                    )}
                    {ai === 'done' && (
                      <>
                        <ReadingBlock label="总结" en="RETROSPECT" delay={0} text={glimpse.summary} />
                        <ReadingBlock label="展望" en="OUTLOOK" delay={0.12} text={glimpse.outlook} />
                        <ReadingBlock label="建议" en="GUIDANCE" delay={0.24} text={glimpse.advice} />
                        <motion.div initial={{ opacity: 0, y: low ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }} className="relative overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-yellow p-3 text-p4g-black shadow-[5px_5px_0_var(--p4g-orange)]">
                          <div aria-hidden className="absolute inset-y-0 right-0 w-16 p4g-hazard opacity-30" />
                          <div className="relative flex items-center gap-2">
                            <span className="font-display text-body font-bold tracking-[0.12em]">命运的祝福 · 三日</span>
                            {offline && <span className="rounded-xs border-thin border-p4g-black bg-white px-1 font-display text-2xs font-bold">离线</span>}
                          </div>
                          <div className="relative mt-1 text-meta font-bold">逆影战场伤害 <b className="p4g-num text-body">+10%</b> · 每日首次记录，最高的那项属性加点额外 <b className="p4g-num text-body">+1</b></div>
                        </motion.div>
                        <P4Button block size="lg" variant="black" onClick={onClose}>收下命运的低语</P4Button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <TVFlash low={low} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

function Row({ cards, w, stage, offset }: { cards: DailyDivination[]; w: number; stage: Stage; offset: number }) {
  const low = useLowMotion();
  const charged = stage !== 'gather';
  return (
    <div className="flex justify-center gap-2">
      {cards.map((d, i) => {
        const idx = i + offset;
        const c = TAROT_BY_ID[d.cardId];
        return (
          <motion.div key={d.id} className="flex flex-col items-center gap-0.5"
            initial={low ? { opacity: 0 } : { opacity: 0, y: offset ? 60 : -60, rotate: (idx - 3) * 9, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }} transition={{ delay: low ? 0 : idx * 0.09, duration: 0.42, ease: [0.2, 0.9, 0.1, 1] }}>
            <div className={cx(charged && 'ring-2 ring-p4g-yellow/60')}><TarotFace id={d.cardId} orientation={d.orientation} width={w} showTag={false} /></div>
            <span className="max-w-[60px] truncate font-display text-[9px] font-bold text-white/75">{c?.name}{d.orientation === 'reversed' ? '·逆' : ''}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ───────────────────────── Harness 默认导出 ─────────────────────────
export function DayReview({ open, onClose, params }: OverlayProps) {
  const i = Number(params?.get('day') ?? 4);
  const d = WINDOW_DAYS[Math.max(0, Math.min(6, i))].drawn ?? WINDOW_DAYS[6].drawn;
  return <DayReviewDialog d={d} open={open} onClose={onClose} />;
}
export function GlimpseFlow({ open, onClose, params }: OverlayProps) {
  return <GlimpseFlowOverlay open={open} onClose={onClose} mode={params?.get('view') === 'review' ? 'review' : 'new'} forceError={params?.get('state') === 'error'} forceOffline={params?.get('state') === 'offline'} />;
}
export default GlimpseFlow;
