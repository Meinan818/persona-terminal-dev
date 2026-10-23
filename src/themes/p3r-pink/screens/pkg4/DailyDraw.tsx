/**
 * 今日塔罗（真实 src/components/astrology/DailyDraw.tsx 的 p3 分支 + FateGlimpse.tsx#FateGlimpseSection，粉白重画）
 * phase：intro（ShuffleAnim 1800ms：70% 交错 → 30% 收叠 → 自动进入选牌；「接入命运」快进）→ pick（三选一，spring 依次入场）
 *        → flipping（翻牌 700ms 后发起请求）→ calling（ThinkingCircle 五角星阵按预估进度生长 → 逐字落笔，useAIStream）
 *        → done（今日运势）/ error（重试 AI / 接着写 / 离线兜底）
 * 无 Key：intro/pick 顶部樱粉斜条 + pick 下方「未配置 API — 选择任意卡牌将使用离线兜底」，选牌后直接离线兜底完成。
 */
import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DailyDivination, TarotOrientation } from '@real/types';
import { P3R, P3Speech, P3Tag, slantClip, tickClip } from '@pink/kit';
import { useAIStream, AIText, type AIFail, type AIPhase } from '@pink/fx';
import { useLowMotion } from '@pink/lib/prefs';
import { useViewportWidth } from '@pink/lib/layout';
import { TAROT_BY_ID, ORI_LABEL, ATTR_NAMES, FORTUNE_LABEL } from '@pink/mock/pkg4-tarot';
import { useAstrologyData, useFateWindow, TODAY, WEEKDAY_CN, shiftKey } from '@pink/adapters/pkg4-astro';
import { TAROT_BY_ID as REAL_TAROT_BY_ID, drawRandomCards, MAJOR_ARCANA, randomOrientation, randomBonusMultiplier } from '@/constants/tarot';
import { buildOfflineDaily } from '@/utils/tarotOffline';
import { aiConfigured } from '@/utils/aiClient';
import { v4 as uuidv4 } from 'uuid';
import { Arcana, PinkBack, FlipCard, ShuffleDeck, CardNameReveal, ThinkingCircle, Markdownish, useFakeProgress } from './tarot';
import { PhaseTitle, HintStrip, ErrStrip, Label, SlantAction, StateFade } from './ui';
import { DayReviewSheet, GlimpseRitual } from '@pink/screens/overlays/FateGlimpse.p3r';

export type DailyPhase = 'intro' | 'pick' | 'flipping' | 'calling' | 'done' | 'error';
interface Cand { id: string; orientation: TarotOrientation }
export interface DailyInit {
  phase: DailyPhase;
  /** calling 内 AI 的起始阶段（直达：thinking / streaming / truncated / error） */
  ai?: AIPhase;
  fail?: AIFail;
  noApiKey?: boolean;
  /** 中断恢复：进程被杀过，牌留着，直接回到「重试 / 离线兜底」 */
  resume?: boolean;
  offline?: boolean;
}

export function DailyDraw({ init, glimpse }: { init: DailyInit; glimpse: 'eligible' | 'buff' | 'partial' }) {
  const low = useLowMotion();
  const vw = useViewportWidth();
  const astro = useAstrologyData(false);
  const today = TODAY;
  const [phase, setPhase] = useState<DailyPhase>(init.phase);
  const cands = useMemo<Cand[]>(() => drawRandomCards(3, MAJOR_ARCANA).map((card) => ({ id: card.id, orientation: randomOrientation() })), []);
  const [picked, setPicked] = useState<number | null>(init.phase === 'intro' || init.phase === 'pick' ? null : 0);
  const [result, setResult] = useState<DailyDivination | null>(
    astro.dailyDivination?.date === today ? astro.dailyDivination : init.phase === 'done' && init.offline ? offlineOf(cands[0]) : null,
  );
  const [resumeMsg, setResumeMsg] = useState<string | null>(init.resume ? '上次的解读没能完成——这张牌已经为你留着，直接继续就好。' : null);
  const [aborted, setAborted] = useState(false);
  const noApiKey = init.noApiKey || !aiConfigured(astro.settings);
  const ai = useAIStream({ text: '', fail: init.fail, initialPhase: 'idle', thinkMs: 0, cps: 30 });
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  useEffect(() => {
    if (astro.dailyDivination?.date !== today) return;
    setResult(astro.dailyDivination);
    setPhase('done');
  }, [astro.dailyDivination, today]);

  const finish = (offline: boolean) => {
    const c = cands[picked ?? 0];
    const next = offlineOf(c);
    setResult(next);
    void astro.saveDailyDivination(next);
    setPhase('done');
  };
  const pick = (i: number, useOffline = false, force = false) => {
    if (!force && phase !== 'pick') return;
    setPicked(i); setResumeMsg(null); setAborted(false);
    setPhase('flipping');
    later(() => finish(true), low ? 150 : 700);
  };

  // ?phase=flipping 直达 = 从翻牌阶段开播（真实：翻牌 700ms 后发起请求 → calling），而不是停在牌背
  useEffect(() => {
    if (init.phase !== 'flipping') return;
    later(() => {
      finish(true);
    }, low ? 150 : 700);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'done' && result) return (<><DoneView d={result} /><FateGlimpseSection variant={glimpse} /></>);

  const title = { intro: '正在洗牌…', pick: '从三张牌中选择一张', flipping: '揭示命运…', calling: ai.text ? '解读者正在落笔' : '正在解读星象…', error: '解读遇到了阻碍', done: '' }[phase];
  const sub = { intro: '今日的星象正在汇聚', pick: '每日仅一次，慎重选择', flipping: '正位 / 逆位皆有意义', calling: ai.phase === 'thinking' && !ai.text ? '解读者正在思索，离开这页也不会中断' : '结合您近期的处境', error: '可重试 AI 或改用离线兜底', done: '' }[phase];
  const pickW = Math.max(78, Math.min(104, Math.floor((Math.min(vw, 576) - 32 - 36) / 3)));
  const canContinue = ai.phase === 'truncated';
  const errText = resumeMsg ?? (ai.error?.code === 'offline' ? '当前离线：解读服务连不上。可以改用离线兜底，牌面会保持不变。' : ai.error?.code === 'truncated' ? '解读被截断了——半截解读已经留着，可以让它从断处接着写（最多三次）。' : ai.error ? `解读失败：${ai.error.message}` : '解读失败');

  return (
    <div className="space-y-5">
      {noApiKey && (phase === 'intro' || phase === 'pick') && (
        <HintStrip>尚未配置 AI API。可前往「设置 → AI 服务」配置后获得定制解读；或以离线兜底文案完成今日抽卡——将使用牌面描述生成通用解读。</HintStrip>
      )}
      <StateFade k={phase}><PhaseTitle title={title} sub={sub} /></StateFade>

      {/* 主舞台 */}
      <div className="relative flex min-h-[280px] items-center justify-center">
        {phase === 'intro' && (
          <div className="flex w-full flex-col items-center gap-9">
            <ShuffleDeck duration={1800} cardWidth={92} onComplete={() => setPhase((p) => (p === 'intro' ? 'pick' : p))} />
            {/* 接入命运：真实 p3 大梯形 CTA（点击即跳过洗牌直达选牌）——原浅青底换樱粉，蓝条纹换玫红 */}
            <button type="button" onClick={() => setPhase('pick')} className="relative block w-[88%] max-w-[420px] py-4 font-heavy text-[26px] tracking-[0.18em] active:brightness-95 focus-visible:outline-none"
              style={{ clipPath: 'polygon(8% 0, 100% 0, 92% 100%, 0 100%)', background: 'var(--p3r-cyan-pale)', color: P3R.blueDeep }}>
              <span aria-hidden className="absolute left-[9%] top-1/2 h-[22px] w-[24px] -translate-y-1/2" style={{ background: `repeating-linear-gradient(105deg, ${P3R.blue} 0 5px, transparent 5px 12px)` }} />
              接入命运
              <span aria-hidden className="absolute bottom-0 right-[7%] h-[9px] w-[22px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
            </button>
          </div>
        )}
        {phase === 'pick' && (
          <div className="flex items-center justify-center gap-3 sm:gap-6">
            {cands.map((_, i) => (
              <motion.button key={`pk-${i}`} type="button" aria-label={`第 ${i + 1} 张牌`} onClick={() => pick(i)}
                initial={low ? { opacity: 0 } : { opacity: 0, y: 30, rotate: -6 + i * 6 }} animate={{ opacity: 1, y: 0, rotate: -6 + i * 6 }}
                whileHover={low ? undefined : { y: -4 }} whileTap={low ? undefined : { scale: 0.97 }}
                transition={{ delay: i * 0.12, type: 'spring', damping: 18, stiffness: 200 }}>
                <PinkBack width={pickW} />
              </motion.button>
            ))}
          </div>
        )}
        {(phase === 'flipping' || phase === 'calling' || phase === 'error') && picked !== null && (
          <FlipReveal c={cands[picked]} revealed={phase !== 'flipping'} />
        )}
      </div>

      {phase === 'calling' && <StreamPanel ai={ai} onLeave={() => { ai.abort(); setAborted(true); }} />}
      {aborted && ai.phase === 'aborted' && (
        <div className="space-y-3">
          <HintStrip>你刚才离开了这页——解读者没有停笔，回来就接着看。</HintStrip>
          <div className="flex gap-2"><SlantAction onClick={() => { setAborted(false); setPhase('calling'); ai.resume(); }}>接着看</SlantAction></div>
        </div>
      )}

      {phase === 'error' && canContinue && !!ai.text && <StreamPanel ai={ai} still />}
      {phase === 'error' && (
        <div className="space-y-3">
          <ErrStrip>{errText}</ErrStrip>
          <div className="flex gap-2">
            {canContinue && <SlantAction onClick={() => { setPhase('calling'); ai.resume(); }}>接着写</SlantAction>}
            <SlantAction tone={canContinue ? 'soft' : 'primary'} onClick={() => pick(picked ?? 0, false, true)}>{canContinue ? '重新解读' : '重试 AI 解读'}</SlantAction>
            <SlantAction tone="soft" onClick={() => pick(picked ?? 0, true, true)}>使用离线兜底</SlantAction>
          </div>
        </div>
      )}

      {phase === 'pick' && noApiKey && (
        <div className="text-center text-[12px] font-bold underline" style={{ color: P3R.grey }}>未配置 API — 选择任意卡牌将使用离线兜底</div>
      )}
    </div>
  );
}

function offlineOf(c: Cand): DailyDivination {
  const card = TAROT_BY_ID[c.id];
  const offline = buildOfflineDaily(REAL_TAROT_BY_ID[c.id], c.orientation);
  return {
    id: uuidv4(),
    date: TODAY,
    drawnFrom: [c.id],
    pickedIndex: 0,
    cardId: c.id,
    orientation: c.orientation,
    effect: { attribute: offline.attribute, multiplier: randomBonusMultiplier(c.orientation) },
    narration: offline.narration,
    advice: offline.advice,
    fortune: offline.fortune,
    source: 'offline',
    createdAt: new Date(),
  };
}

/** 思维链阵图 / 流式落笔面板（真实 StreamPanel：今日运势 + 落笔中 / 思索中；无字时 ThinkingCircle pentagram 124） */
function StreamPanel({ ai, still, onLeave }: { ai: ReturnType<typeof useAIStream>; still?: boolean; onLeave?: () => void }) {
  const thinking = ai.phase === 'thinking';
  const prog = useFakeProgress(thinking, 2400);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative min-h-[96px] px-5 py-4" style={{ background: P3R.panel, clipPath: slantClip(14), boxShadow: 'var(--p3r-shadow)' }}>
      <div className="mb-2 flex items-center gap-2">
        <span className="font-cond text-[11px] uppercase tracking-[2px]" style={{ color: P3R.blue }}>今日运势</span>
        <span className="text-[11px] font-bold" style={{ color: P3R.grey }}>{ai.text ? (still ? '已停笔' : '落笔中') : thinking ? '思索中' : '解读中'}</span>
        {onLeave && !still && (ai.phase === 'thinking' || ai.phase === 'streaming') && (
          <button type="button" onClick={onLeave} className="ml-auto text-[11px] font-black underline" style={{ color: P3R.grey }}>离开这页</button>
        )}
      </div>
      {ai.text ? <AIText ai={ai} /> : (
        <div className="flex justify-center py-2"><ThinkingCircle variant="pentagram" progress={prog} size={124} label={thinking ? '解读者正在思索' : '正在解读星象'} /></div>
      )}
    </motion.div>
  );
}

/** 翻牌展示（真实 FlipReveal：150 宽，rotateY 0.7s easeInOut；翻面完成即 CardNameReveal delay .1） */
function FlipReveal({ c, revealed }: { c: Cand; revealed: boolean }) {
  const card = TAROT_BY_ID[c.id];
  return (
    <div className="flex flex-col items-center gap-3">
      <FlipCard width={150} flipped={revealed} back={<PinkBack width={150} />} front={<Arcana id={c.id} orientation={c.orientation} width={150} />} />
      {revealed && <CardNameReveal name={card.name} nameEn={card.nameEn} reversed={c.orientation === 'reversed'} delay={0.1} />}
    </div>
  );
}

/** 已完成视图：漂浮牌面 → 牌名 → 加成卡 → 本牌含义 → 今日运势（台词框）→ 总体运势 → 每日一抽，明日再会。 */
function DoneView({ d }: { d: DailyDivination }) {
  const low = useLowMotion();
  const card = TAROT_BY_ID[d.cardId];
  const m = card[d.orientation];
  const f = FORTUNE_LABEL[d.fortune ?? 'good'];
  const fade = (delay: number) => ({ initial: low ? { opacity: 0 } : { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: low ? 0 : delay, duration: 0.3 } });
  return (
    <div className="space-y-5">
      <div className="text-center"><span className="inline-block px-4 py-1 font-heavy text-[15px] tracking-[0.3em]" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(8) }}>今日运势</span></div>
      <div className="flex justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: low ? 0.1 : 0.6 }}>
          <motion.div animate={low ? undefined : { y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}>
            <Arcana id={d.cardId} orientation={d.orientation} width={150} offline={d.source === 'offline'} glow />
          </motion.div>
        </motion.div>
      </div>
      <CardNameReveal name={card.name} nameEn={card.nameEn} reversed={d.orientation === 'reversed'} delay={0.18} />

      <motion.div {...fade(0.15)} className="relative flex items-start gap-3 px-5 py-4" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(14) }}>
        <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center font-cond text-[24px]" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(8) }}>×</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-heavy text-[17px]" style={{ color: 'var(--p3r-on-ink)' }}>{ATTR_NAMES[d.effect.attribute]} <span className="font-cond text-[20px]" style={{ color: P3R.blue }}>× {d.effect.multiplier}</span></span>
            <P3Tag tone="lilac">{ORI_LABEL[d.orientation]}</P3Tag>
            {d.source === 'offline' && <P3Tag tone="soft">离线</P3Tag>}
          </div>
          <div className="mt-1 text-[12.5px] leading-relaxed" style={{ color: 'color-mix(in srgb, var(--p3r-on-ink) 86%, transparent)' }}>{d.advice}</div>
        </div>
      </motion.div>

      <motion.div {...fade(0.2)} className="px-5 py-4" style={{ background: P3R.panel, clipPath: slantClip(14), boxShadow: 'var(--p3r-shadow)' }}>
        <Label en="MEANING" right={<span className="text-[11px] font-bold" style={{ color: P3R.grey }}>{card.name} · {ORI_LABEL[d.orientation]}</span>}>本牌含义</Label>
        <div className="mb-2 flex flex-wrap gap-1.5">{m.keywords.map((k) => <P3Tag key={k} tone="soft">{k}</P3Tag>)}</div>
        <p className="text-[12.5px] leading-relaxed" style={{ color: P3R.inkSoft }}>{m.meaning}</p>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: P3R.ink }}>{m.reflection}</p>
      </motion.div>

      <motion.div {...fade(0.25)}>
        <P3Speech speaker={<span>今日运势{d.source === 'offline' && <span className="ml-1.5 text-[10px]">· 离线</span>}</span>} more={false}><Markdownish text={d.narration} /></P3Speech>
      </motion.div>

      <motion.div {...fade(0.35)} className="relative overflow-hidden px-5 py-4" style={{ background: P3R.blue, clipPath: slantClip(16) }}>
        <span aria-hidden className="absolute -right-4 top-0 h-full w-24" style={{ background: 'rgba(255,255,255,0.14)', clipPath: 'polygon(40% 0, 100% 0, 60% 100%, 0 100%)' }} />
        <div className="relative flex items-center gap-3">
          <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center text-[24px] font-black" style={{ background: 'var(--p3r-cream)', color: 'var(--p3r-blue-deep)', clipPath: slantClip(10) }}>{f.icon}</span>
          <div className="min-w-0">
            <div className="font-cond text-[11px] uppercase tracking-[2px]" style={{ color: 'color-mix(in srgb, var(--p3r-on-blue) 80%, transparent)' }}>总体运势 · {f.en}</div>
            <div className="font-heavy text-[30px] leading-none" style={{ color: P3R.onBlue, letterSpacing: 2 }}>{f.label}</div>
          </div>
        </div>
      </motion.div>
      <motion.div {...fade(0.4)} className="text-center text-[11px] font-bold" style={{ color: P3R.grey }}>每日一抽，明日再会。</motion.div>
    </div>
  );
}

/* ───────────────────────── 七日连星（抽完今日才现身） ───────────────────────── */
export function FateGlimpseSection({ variant: _variant }: { variant: 'eligible' | 'buff' | 'partial' }) {
  const low = useLowMotion();
  const vw = useViewportWidth();
  const fateWindow = useFateWindow();
  const days = fateWindow.days.length
    ? fateWindow.days
    : Array.from({ length: 7 }, (_, i) => ({ date: shiftKey(i - 6), drawn: null as DailyDivination | null }));
  const drawnCount = days.filter((d) => d.drawn).length;
  const buff = fateWindow.lastGlimpse;
  const [ritual, setRitual] = useState<null | 'new' | 'review'>(null);
  const [detail, setDetail] = useState<DailyDivination | null>(null);
  const slotW = Math.max(30, Math.min(46, Math.floor((Math.min(vw, 576) - 32 - 40 - 24) / 7)));
  const chip = { background: P3R.cyanPale, color: P3R.blueDeep, clipPath: slantClip(8) };
  return (
    <div className="mt-6" id="fate-glimpse">
      <div className="relative overflow-hidden px-5 pb-4 pt-3.5" style={{ background: P3R.panel, clipPath: slantClip(14), boxShadow: 'var(--p3r-shadow)' }}>
        <div className="relative flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2"><span aria-hidden className="font-cond text-[15px]" style={{ color: P3R.blue }}>✦</span><span className="font-heavy text-[14px] tracking-[0.2em]" style={{ color: P3R.ink }}>七日连星</span></div>
            <div className="mt-0.5 font-cond text-[11px] tracking-[0.14em]" style={{ color: P3R.grey }}>GLIMPSE OF FATE · {drawnCount}/7</div>
          </div>
          {buff && <div className="shrink-0 px-2.5 py-1 text-[10px] font-black" style={chip}>祝福生效中 · 余 3 天</div>}
        </div>
        <div className="relative mt-3 flex items-end justify-between gap-1">
          {days.map((d, i) => {
            const dt = new Date(d.date); const isToday = d.date === TODAY;
            const label = isToday ? '今日' : `${dt.getMonth() + 1}/${dt.getDate()}`;
            return (
              <div key={`day-${i}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                {d.drawn ? (
                  <button type="button" onClick={() => setDetail(d.drawn)} aria-label={`查看 ${label} 的塔罗解读`} className="relative active:scale-95">
                    {isToday && <span aria-hidden className="absolute -inset-[3px]" style={{ background: P3R.blue, clipPath: slantClip(4) }} />}
                    <span className="relative block"><Arcana id={d.drawn.cardId} orientation={d.drawn.orientation} width={slotW} tag={false} /></span>
                  </button>
                ) : (
                  <span className="block" style={{ width: slotW, height: Math.round(slotW * 1.66), background: isToday ? 'color-mix(in srgb, var(--p3r-blue) 12%, transparent)' : 'var(--p3r-track)', clipPath: slantClip(4), opacity: 0.8 }} />
                )}
                <span className="w-full truncate text-center text-[9px] font-bold leading-tight" style={{ color: isToday ? P3R.roseInk : P3R.grey }}>{label}{!isToday && <span className="hidden min-[420px]:inline"> 周{WEEKDAY_CN[dt.getDay()]}</span>}</span>
              </div>
            );
          })}
        </div>
        <div className="relative mt-3.5">
          {buff ? (
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 text-[11px] leading-relaxed" style={{ color: P3R.inkSoft }}>命运的祝福生效中：战场伤害 +10%，每日首次记录 +1 点。七日计数已重新开始。</p>
              <button type="button" onClick={() => setRitual('review')} className="shrink-0 px-3 py-1.5 text-[11px] font-black" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(10) }}>查看解读</button>
            </div>
          ) : drawnCount === 7 ? (
            <motion.button type="button" data-qa-allow-clip onClick={() => setRitual('new')} whileTap={low ? undefined : { scale: 0.97 }} className="relative block w-full overflow-hidden py-3 text-center font-heavy text-[15px] tracking-[0.3em]" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(10) }}>
              {!low && <motion.span aria-hidden className="absolute inset-y-0 left-0 w-16" style={{ background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.45), transparent)' }} animate={{ x: ['-120%', '900%'] }} transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut', repeatDelay: 1.2 }} />}
              窥 探 命 运
            </motion.button>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 text-[11px] leading-relaxed" style={{ color: P3R.inkSoft }}>连续七日抽取每日塔罗，七星连缀之时，可窥探一次命运。</p>
              <button type="button" onClick={() => setRitual('review')} className="shrink-0 px-3 py-1.5 text-[11px] font-black" style={chip}>回顾上次</button>
            </div>
          )}
        </div>
      </div>
      <GlimpseRitual open={!!ritual} onClose={() => setRitual(null)} mode={ritual ?? 'new'} />
      <DayReviewSheet d={detail} open={!!detail} onClose={() => setDetail(null)} />
    </div>
  );
}

