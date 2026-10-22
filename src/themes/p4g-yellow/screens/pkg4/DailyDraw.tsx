/**
 * 真实：src/components/astrology/DailyDraw.tsx + FateGlimpse.tsx#FateGlimpseSection（P4G 皮）
 * phase：intro（洗牌）→ pick（三选一）→ flipping（翻牌）→ calling（解读中：思维圈 → 流式落笔）→ done / error
 */
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { DailyDivination, TarotOrientation } from '@real/types';
import { P4Button, P4Card, P4Chip, P4Outline } from '@yellow/kit';
import { CollageStagger, CollageItem } from '@yellow/fx';
import { useLowMotion } from '@yellow/lib/prefs';
import { cx } from '@yellow/lib/cx';
import { TAROT_BY_ID, ORI_LABEL, ATTR_NAMES, FORTUNE_LABEL, drawRandom, randomOri } from '@yellow/mock/pkg4-tarot';
import { DAILY_TODAY, WINDOW_DAYS, WINDOW_DAYS_PARTIAL, LAST_GLIMPSE, STREAM_TEXT, TODAY, WEEKDAY_CN } from '@yellow/mock/pkg4-astro';
import { TarotFace, TarotBack, FlipCard, Markdownish, ThinkingTV, useFakeProgress, useTypewriter, CardNameReveal } from './tarot';
import { CardLabel, MsgBox, StateFade } from './ui';
import { DayReviewDialog, GlimpseFlowOverlay } from '@yellow/screens/overlays/FateGlimpse.p4g';

export type DailyPhase = 'intro' | 'pick' | 'flipping' | 'calling' | 'done' | 'error';
interface Cand { id: string; orientation: TarotOrientation }

const pickW = () => { const vw = typeof window === 'undefined' ? 390 : Math.min(window.innerWidth, 480); return Math.max(72, Math.min(96, Math.floor((vw - 32 - 24 - 20) / 3))); };

export function DailyDraw({ initial, noApiKey, errorKind, glimpse }: { initial: DailyPhase; noApiKey: boolean; errorKind?: 'resume' | 'truncated' | 'fail'; glimpse: 'eligible' | 'buff' | 'partial' }) {
  const low = useLowMotion();
  const [phase, setPhase] = useState<DailyPhase>(initial);
  const [cands, setCands] = useState<Cand[]>(() => DAILY_TODAY.drawnFrom.map((id, i) => ({ id, orientation: i === 0 ? 'upright' : randomOri() })));
  const [picked, setPicked] = useState<number | null>(initial === 'intro' || initial === 'pick' ? null : 0);
  const [result, setResult] = useState<DailyDivination | null>(initial === 'done' ? DAILY_TODAY : null);
  const [err, setErr] = useState<string | null>(errorKind === 'resume' ? '上次的解读没能完成——这张牌已经为你留着，直接继续就好。' : errorKind === 'fail' ? '解读失败：请求超时（30s）' : null);
  const [truncated, setTruncated] = useState(errorKind === 'truncated');
  useEffect(() => { setPhase(initial); setPicked(initial === 'intro' || initial === 'pick' ? null : 0); setResult(initial === 'done' ? DAILY_TODAY : null); }, [initial]);

  // intro：洗牌（真实 ShuffleAnim duration=1800：前 70% 五张牌左右交错 0.9s×2 → 后 30% 收成一叠）→ 自动进入选牌
  const [shuf, setShuf] = useState<'shuffle' | 'stack'>('shuffle');
  useEffect(() => {
    if (phase !== 'intro') return;
    setShuf('shuffle');
    const D = low ? 600 : 1800;
    const t1 = setTimeout(() => setShuf('stack'), Math.floor(D * 0.7));
    const t2 = setTimeout(() => setPhase('pick'), D);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phase, low]);

  const [flipNow, setFlipNow] = useState(initial !== 'flipping');
  useEffect(() => { if (phase === 'flipping') { setFlipNow(false); const t = setTimeout(() => setFlipNow(true), 60); return () => clearTimeout(t); } setFlipNow(true); }, [phase]);
  const thinkingRun = phase === 'calling';
  const prog = useFakeProgress(thinkingRun, 2200);
  const thinking = thinkingRun && prog < 1;
  const tw = useTypewriter(STREAM_TEXT, thinkingRun && prog >= 1, 60);
  useEffect(() => {
    if (phase === 'calling' && tw.done && prog >= 1) {
      const t = setTimeout(() => finish(false), 500); return () => clearTimeout(t);
    }
  }, [phase, tw.done, prog]); // eslint-disable-line

  const finish = (offline: boolean) => {
    const c = cands[picked ?? 0];
    setResult({ ...DAILY_TODAY, cardId: c.id, orientation: c.orientation, source: offline ? 'offline' : 'ai', narration: offline ? `${TAROT_BY_ID[c.id].name}${c.orientation === 'reversed' ? '逆位' : ''}：${TAROT_BY_ID[c.id][c.orientation].meaning}` : DAILY_TODAY.narration, advice: offline ? (TAROT_BY_ID[c.id].advice?.[c.orientation] ?? DAILY_TODAY.advice) : DAILY_TODAY.advice });
    setPhase('done');
  };
  const pick = (i: number, force = false) => {
    if (!force && phase !== 'pick') return;
    setPicked(i); setPhase('flipping');
    setTimeout(() => { if (noApiKey) finish(true); else setPhase('calling'); }, low ? 150 : 900);
  };

  if (phase === 'done' && result) return (
    <>
      <DailyResult d={result} />
      <FateGlimpseSection variant={glimpse} />
    </>
  );

  const title = { intro: '正在洗牌…', pick: '从三张牌中选择一张', flipping: '揭示命运…', calling: tw.text ? '解读者正在落笔' : '正在解读星象…', error: '解读遇到了阻碍', done: '' }[phase];
  const sub = { intro: '今日的星象正在汇聚', pick: '每日仅一次，慎重选择', flipping: '正位 / 逆位皆有意义', calling: thinking && !tw.text ? '解读者正在思索，离开这页也不会中断' : '结合您近期的处境', error: '可重试 AI 或改用离线兜底', done: '' }[phase];
  const w = pickW();

  return (
    <div className="space-y-4">
      {noApiKey && (phase === 'intro' || phase === 'pick') && (
        <P4Card tone="paper" padding="sm" shadow="sm">
          <div className="flex gap-2 text-meta leading-relaxed text-p4g-ink"><span aria-hidden className="mt-0.5 shrink-0 rounded-xs bg-p4g-orange px-1 font-display text-2xs font-bold text-p4g-black">NO KEY</span><span className="min-w-0">尚未配置 AI API。可前往「设置 → AI 服务」配置后获得定制解读；或以离线兜底文案完成今日抽卡——将使用牌面描述生成通用解读。</span></div>
        </P4Card>
      )}
      <StateFade k={phase}>
        <div className="text-center">
          <div className="inline-block"><P4Outline size="clamp(20px,6vw,28px)" stroke={4} italic>{title}</P4Outline></div>
          <div className="mt-1 font-display text-meta font-bold text-[color:var(--p4g-on-stage)] opacity-85">{sub}</div>
        </div>
      </StateFade>

      {/* 主舞台：电视屏 */}
      <div className="relative mx-auto flex min-h-[230px] max-w-[440px] items-center justify-center overflow-hidden rounded-lg border-[5px] border-p4g-black bg-p4g-black/90 px-3 py-5 shadow-hard-lg night:border-p4g-yellow">
        <div aria-hidden className="absolute inset-0 opacity-[0.16]" style={{ background: 'repeating-linear-gradient(0deg, rgba(255,255,255,.5) 0 1px, transparent 1px 3px)' }} />
        <div aria-hidden className="absolute inset-x-0 top-0 h-2 p4g-candy-h" />
        {phase === 'intro' && (
          <div className="relative flex flex-col items-center gap-5">
            <div className="relative" style={{ width: 96 + 60, height: 154 }}>
              {[0, 1, 2, 3, 4].map((i) => {
                const o = i - 2;
                return (
                  <motion.div key={i} className="absolute left-[30px] top-0" style={{ zIndex: i }} initial={{ x: 0, y: 0, rotate: 0, scale: 0.92 }}
                    animate={low ? { opacity: 1 } : shuf === 'shuffle' ? { x: [0, o * 34, o * -24, 0], y: [0, -10, 8, 0], rotate: [0, o * 8, o * -6, 0], scale: 0.92 } : { x: o * 1.5, y: o * -1.5, rotate: o * 0.6, scale: 0.96 }}
                    transition={low ? undefined : shuf === 'shuffle' ? { duration: 0.63, repeat: 1, ease: 'easeInOut' } : { duration: 0.4, ease: 'easeInOut' }}>
                    <TarotBack width={96} />
                  </motion.div>
                );
              })}
            </div>
            <button type="button" onClick={() => setPhase('pick')} className="p4g-press relative -skew-x-12 border-3 border-p4g-black bg-p4g-yellow px-8 py-2.5 shadow-[4px_4px_0_var(--p4g-orange)]">
              <span className="block skew-x-12 font-display text-lead font-bold tracking-[0.3em] text-p4g-black">接入命运</span>
            </button>
          </div>
        )}
        {phase === 'pick' && (
          <div className="relative flex items-end justify-center gap-3">
            {cands.map((c, i) => (
              <motion.button key={i} type="button" onClick={() => pick(i)} aria-label={`第 ${i + 1} 张牌`} className="relative"
                initial={low ? { opacity: 0 } : { opacity: 0, y: 30, rotate: (i - 1) * 10 }} animate={{ opacity: 1, y: i === 1 ? -10 : 0, rotate: (i - 1) * 4 }}
                whileHover={low ? undefined : { y: -16 }} whileTap={low ? undefined : { scale: 0.96 }} transition={{ duration: 0.24, delay: i * 0.06 }}>
                <TarotBack width={w} />
              </motion.button>
            ))}
          </div>
        )}
        {(phase === 'flipping' || phase === 'calling' || phase === 'error') && picked !== null && (
          <div className="relative flex flex-col items-center gap-3">
            <FlipCard width={112} flipped={flipNow} back={<TarotBack width={112} />} front={<TarotFace id={cands[picked].id} orientation={cands[picked].orientation} width={112} />} />
            <CardNameReveal key={picked} tone="dark" size={28} delay={0.55} name={TAROT_BY_ID[cands[picked].id].name} nameEn={TAROT_BY_ID[cands[picked].id].nameEn} reversed={cands[picked].orientation === 'reversed'} />
          </div>
        )}
      </div>

      {phase === 'pick' && noApiKey && (
        <div className="text-center font-display text-meta font-bold text-[color:var(--p4g-on-stage)]">未配置 API — 选择任意卡牌将使用离线兜底</div>
      )}

      {phase === 'calling' && (
        <div className="space-y-3">
          {thinking ? (
            <div className="flex justify-center"><ThinkingTV progress={prog} label={thinking ? '解读者正在思索' : '正在解读星象'} /></div>
          ) : (
            <MsgBox speaker={<span>今日运势 <span className="ml-1 text-2xs">{tw.text ? '落笔中' : thinking ? '思索中' : '解读中'}</span></span>}>
              <p className="text-body leading-relaxed">{tw.text}<span aria-hidden className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-p4g-yellow align-middle" /></p>
            </MsgBox>
          )}
        </div>
      )}

      {phase === 'error' && (
        <div className="space-y-3">
          {truncated && (
            <MsgBox speaker="今日运势"><p className="text-body leading-relaxed">{STREAM_TEXT.slice(0, 40)}…</p></MsgBox>
          )}
          {err && <P4Card tone="paper" padding="sm" shadow="sm"><div className="text-meta font-bold text-p4g-danger">{err}</div></P4Card>}
          <div className="flex flex-wrap justify-center gap-2">
            {truncated && <P4Button onClick={() => { setTruncated(false); setPhase('calling'); }}>接着写</P4Button>}
            <P4Button variant="black" onClick={() => { setErr(null); pick(picked ?? 0, true); }}>{truncated ? '重新解读' : '重试 AI 解读'}</P4Button>
            <P4Button variant="secondary" onClick={() => finish(true)}>使用离线兜底</P4Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DailyResult({ d }: { d: DailyDivination }) {
  const low = useLowMotion();
  const card = TAROT_BY_ID[d.cardId];
  const m = card[d.orientation];
  const fortune = FORTUNE_LABEL[d.fortune ?? 'good'];
  return (
    <CollageStagger className="space-y-4">
      <CollageItem>
        <div className="text-center"><span className="inline-block rotate-[-2deg] bg-p4g-black px-3 py-1 font-display text-body font-bold tracking-[0.3em] text-p4g-yellow shadow-[3px_3px_0_var(--p4g-orange)] night:bg-p4g-yellow night:text-p4g-black">今日运势</span></div>
      </CollageItem>
      <CollageItem>
        <div className="relative flex flex-col items-center">
          <motion.div animate={low ? undefined : { y: [0, -6, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}>
            <TarotFace id={d.cardId} orientation={d.orientation} width={150} offline={d.source === 'offline'} />
          </motion.div>
          <div className="mt-3 text-center">
            <P4Outline size="clamp(30px,9vw,44px)" stroke={5}>{card.name}{d.orientation === 'reversed' ? ' · 逆位' : ''}</P4Outline>
            <div className="font-display text-meta font-bold italic uppercase tracking-[0.3em] text-[color:var(--p4g-on-stage)]">{card.roman} · {card.nameEn}</div>
          </div>
        </div>
      </CollageItem>
      <CollageItem tilt={-0.6}>
        <P4Card tone="black" cut="br" padding="md">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-p4g-yellow font-display text-h2 font-bold text-p4g-black">⚡</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-h3 font-bold text-p4g-yellow">{ATTR_NAMES[d.effect.attribute]} <span className="p4g-num">× {d.effect.multiplier}</span></span>
                <P4Chip size="sm" tone="yellow">{ORI_LABEL[d.orientation]}</P4Chip>
                {d.source === 'offline' && <P4Chip size="sm" tone="outline">离线</P4Chip>}
              </div>
              <div className="mt-1 text-meta leading-relaxed text-white/90">{d.advice}</div>
            </div>
          </div>
        </P4Card>
      </CollageItem>
      <CollageItem>
        <P4Card tone="paper">
          <CardLabel en="MEANING" right={<span className="text-2xs text-p4g-ink-soft">{card.name} · {ORI_LABEL[d.orientation]}</span>}>本牌含义</CardLabel>
          <div className="mb-2 flex flex-wrap gap-1.5">{m.keywords.map((k) => <P4Chip key={k} size="sm" tone="outline">{k}</P4Chip>)}</div>
          <p className="text-meta leading-relaxed text-p4g-ink-soft">{m.meaning}</p>
          <p className="mt-2 text-body leading-relaxed text-p4g-ink">{m.reflection}</p>
        </P4Card>
      </CollageItem>
      <CollageItem>
        <MsgBox speaker={<span>今日运势{d.source === 'offline' && <span className="ml-1.5 rounded-xs bg-p4g-black px-1 text-2xs text-white">离线</span>}</span>}>
          <Markdownish text={d.narration} />
        </MsgBox>
      </CollageItem>
      <CollageItem tilt={0.5}>
        <div className="relative overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-orange p-3 shadow-hard night:border-p4g-yellow">
          <div aria-hidden className="absolute -right-6 -top-6 h-24 w-24 rotate-45 bg-p4g-black/10" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-pill border-3 border-p4g-black bg-white text-h2">{fortune.icon}</div>
            <div className="min-w-0">
              <div className="font-display text-2xs font-bold uppercase tracking-[0.24em] text-p4g-black/75">总体运势 · {fortune.en}</div>
              <div className="p4g-num text-[clamp(30px,9vw,40px)] leading-none text-p4g-black" style={{ letterSpacing: 2 }}>{fortune.label}</div>
            </div>
          </div>
        </div>
      </CollageItem>
      <CollageItem><div className="text-center font-display text-meta font-bold text-[color:var(--p4g-on-stage)] opacity-75">每日一抽，明日再会。</div></CollageItem>
    </CollageStagger>
  );
}

/** 七日连星：只在今日抽完之后出现 */
export function FateGlimpseSection({ variant }: { variant: 'eligible' | 'buff' | 'partial' }) {
  const days = variant === 'partial' ? WINDOW_DAYS_PARTIAL : WINDOW_DAYS;
  const drawnCount = days.filter((d) => d.drawn).length;
  const buff = variant === 'buff' ? LAST_GLIMPSE : null;
  const [ritual, setRitual] = useState<null | 'new' | 'review'>(null);
  const [detail, setDetail] = useState<DailyDivination | null>(null);
  const low = useLowMotion();
  return (
    <div className="mt-6">
      <P4Card tone="surface" cut="br" padding="md">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2"><span aria-hidden className="font-display text-h3 font-bold text-p4g-orange">✦</span><span className="font-display text-body font-bold tracking-[0.2em] text-p4g-ink">七日连星</span></div>
            <div className="mt-0.5 font-display text-2xs font-bold italic tracking-[0.14em] text-p4g-ink-soft">GLIMPSE OF FATE · <span className="p4g-num">{drawnCount}/7</span></div>
          </div>
          {buff && <span className="shrink-0 rounded-xs bg-p4g-black px-2 py-1 font-display text-2xs font-bold text-p4g-yellow">祝福生效中 · 余 3 天</span>}
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            const dt = new Date(d.date); const isToday = d.date === TODAY;
            const label = isToday ? '今日' : `${dt.getMonth() + 1}/${dt.getDate()}`;
            return (
              <div key={i} className="flex min-w-0 flex-col items-center gap-1">
                {d.drawn ? (
                  <button type="button" onClick={() => setDetail(d.drawn)} aria-label={`查看 ${label} 的塔罗解读`} className={cx('p4g-press w-full max-w-[44px]', isToday && 'outline outline-2 outline-offset-2 outline-p4g-orange')}>
                    <TarotFace id={d.drawn.cardId} orientation={d.drawn.orientation} width={40} showTag={false} style={{ width: '100%', height: 'auto', aspectRatio: '10/16' }} />
                  </button>
                ) : (
                  <div className={cx('aspect-[10/16] w-full max-w-[44px] rounded-[6px] border-thin border-dashed', isToday ? 'border-p4g-orange bg-p4g-orange/15' : 'border-p4g-line bg-p4g-black/5')} />
                )}
                <span className={cx('w-full truncate text-center font-display text-[9px] font-bold leading-tight', isToday ? 'text-p4g-tag night:text-p4g-yellow' : 'text-p4g-ink-soft')}>{label}{!isToday && <span className="hidden min-[400px]:inline"> 周{WEEKDAY_CN[dt.getDay()]}</span>}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-3.5">
          {buff ? (
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 text-meta leading-relaxed text-p4g-ink-soft">命运的祝福生效中：战场伤害 +10%，每日首次记录 +1 点。七日计数已重新开始。</p>
              <P4Button size="sm" variant="black" onClick={() => setRitual('review')}>查看解读</P4Button>
            </div>
          ) : drawnCount === 7 ? (
            <button type="button" onClick={() => setRitual('new')} className="p4g-press relative block w-full overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-black py-3 text-center shadow-[4px_4px_0_var(--p4g-orange)] night:border-p4g-yellow">
              {!low && <motion.span aria-hidden className="absolute inset-y-0 w-16" style={{ background: 'linear-gradient(100deg, transparent, rgba(255,229,0,0.5), transparent)' }} animate={{ x: ['-120%', '700%'] }} transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut', repeatDelay: 1.2 }} />}
              <span className="relative font-display text-lead font-bold tracking-[0.3em] text-p4g-yellow">窥 探 命 运</span>
            </button>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 text-meta leading-relaxed text-p4g-ink-soft">连续七日抽取每日塔罗，七星连缀之时，可窥探一次命运。</p>
              <P4Button size="sm" variant="secondary" onClick={() => setRitual('review')}>回顾上次</P4Button>
            </div>
          )}
        </div>
      </P4Card>
      <GlimpseFlowOverlay open={!!ritual} onClose={() => setRitual(null)} mode={ritual ?? 'new'} />
      <DayReviewDialog d={detail} open={!!detail} onClose={() => setDetail(null)} />
    </div>
  );
}

