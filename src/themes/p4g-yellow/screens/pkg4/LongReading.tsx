/**
 * 真实：src/components/astrology/LongReadingFlow.tsx（form / base / picking / revealing / reading / done + ReadingDetail + FollowUpPanel）
 *      + src/components/astrology/ReadingArchive.tsx
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import type { LongReading, LongReadingPeriod, TarotOrientation, DrawnCard } from '@/types';
import { P4Button, P4Card, P4Chip, P4Textarea, P4EmptyState, P4Dialog, IconBack } from '@yellow/kit';
import { CollageStagger, CollageItem } from '@yellow/fx';
import { useLowMotion } from '@yellow/lib/prefs';
import { cx } from '@yellow/lib/cx';
import { TAROT_BY_ID, ORI_LABEL, PERIOD_LABELS, spreadPositionsFor, periodHasBase, BASE_POSITION, drawRandom, randomOri } from '@yellow/adapters/pkg4-tarot';
import { LONG_STREAM_TEXT, TODAY, shiftKey } from '@yellow/adapters/pkg4-astro';
import { TarotFace, TarotBack, FlipCard, Markdownish, ThinkingTV, useHold, useFakeProgress, useTypewriter, cardH } from './tarot';
import { CardLabel, MsgBox, StateFade } from './ui';

export type LongStep = 'form' | 'base' | 'picking' | 'revealing' | 'reading' | 'done';
interface Cand { id: string; orientation: TarotOrientation }

const PERIODS: LongReadingPeriod[] = ['recent', 'midterm', 'longterm'];

export function LongReadingFlow({ initialStep = 'form', noApiKey, activeCount, resume, onSaved, onBack }: {
  initialStep?: LongStep; noApiKey: boolean; activeCount: number; resume?: boolean; onSaved: (r: LongReading) => void; onBack: () => void;
}) {
  const low = useLowMotion();
  const [phase, setPhase] = useState<LongStep>(initialStep);
  const [question, setQuestion] = useState(initialStep === 'form' ? '' : '我最近对工作的方向感到迷茫，接下来该如何取舍？');
  const [period, setPeriod] = useState<LongReadingPeriod>(initialStep === 'base' ? 'longterm' : 'midterm');
  const [cands, setCands] = useState<Cand[]>(() => drawRandom(6).map((id) => ({ id, orientation: randomOri() })));
  const [picks, setPicks] = useState<number[]>(initialStep === 'reading' || initialStep === 'revealing' ? [0, 2, 4] : []);
  const [base, setBase] = useState<Cand | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(!!resume);
  const [truncated, setTruncated] = useState(false);
  const [saved, setSaved] = useState<LongReading | null>(null);
  const cap = activeCount >= 2;
  const hasBase = periodHasBase(period);
  const positions = spreadPositionsFor(period, 3);

  useEffect(() => { setPhase(initialStep); }, [initialStep]);

  const start = () => {
    if (!question.trim() || cap || noApiKey) return;
    setCands(drawRandom(6).map((id) => ({ id, orientation: randomOri() }))); setPicks([]); setBase(null);
    setPhase(hasBase ? 'base' : 'picking');
  };
  const onBaseDone = () => {
    const id = drawRandom(1, cands.map((c) => c.id))[0];
    setBase({ id, orientation: randomOri() });
    setTimeout(() => setPhase('picking'), low ? 200 : 1100);
  };
  const reveal = () => {
    if (picks.length !== 3) return;
    if (noApiKey) { setError('请先在「设置 → AI 服务」中配置 API 密钥。中长期占卜无法离线完成。'); return; }
    setPhase('revealing');
    setTimeout(() => setPhase((p) => (p === 'revealing' ? 'reading' : p)), low ? 300 : 1500);
  };
  const reading = phase === 'reading';
  const prog = useFakeProgress(reading, 2400);
  const tw = useTypewriter(LONG_STREAM_TEXT, reading && prog >= 1, 80);
  const accept = () => {
    const picked: DrawnCard[] = [...(base ? [{ cardId: base.id, orientation: base.orientation }] : []), ...picks.map((i) => ({ cardId: cands[i].id, orientation: cands[i].orientation }))];
    const r: LongReading = { id: `lr-${Date.now()}`, question: question.trim() || '（演示）', period, drawnFrom: cands.map((c) => c.id), picked, content: tw.text || LONG_STREAM_TEXT, followUps: [], archived: false, createdAt: new Date(), expiresAt: shiftKey(14) };
    setSaved(r); onSaved(r); setPhase('done');
  };
  useEffect(() => { if (reading && tw.done && prog >= 1 && !truncated) { const t = setTimeout(accept, 600); return () => clearTimeout(t); } }, [reading, tw.done, prog, truncated]); // eslint-disable-line

  if (phase === 'done' && saved) return <ReadingDetail reading={saved} canFollowUp onBack={onBack} onArchive={(a) => setSaved({ ...saved, archived: a })} onDelete={onBack} onFollowSaved={(f) => setSaved({ ...saved, followUps: [f] })} />;

  return (
    <StateFade k={phase}>
      {phase === 'form' && (
        <div className="space-y-4">
          {pending && (
            <MsgBox speaker="系统">
              <div className="font-display text-body font-bold text-p4g-yellow">上次的占卜没有生成完</div>
              <div className="mt-1 text-meta opacity-85">「{'我最近对工作的方向感到迷茫…'}」· 一段时间</div>
              <div className="mt-3 flex gap-2">
                <P4Button size="sm" className="flex-1" onClick={() => { setPending(false); setQuestion('我最近对工作的方向感到迷茫，接下来该如何取舍？'); setPicks([0, 2, 4]); setPhase('reading'); }}>用同一副牌继续</P4Button>
                <P4Button size="sm" variant="secondary" onClick={() => setPending(false)}>放弃</P4Button>
              </div>
            </MsgBox>
          )}
          {cap && <P4Card tone="paper" padding="sm" shadow="sm"><div className="text-meta font-bold leading-relaxed text-p4g-ink">当前已有 {activeCount} 条活跃占卜（上限 2）。请先归档或等已有占卜过期（14 天）后再发起新的。</div></P4Card>}
          {noApiKey && (
            <P4Card tone="black" padding="sm" cut="br"><div className="flex gap-2 text-meta leading-relaxed text-white"><span className="shrink-0 rounded-xs bg-p4g-yellow px-1 font-display text-2xs font-bold text-p4g-black">NO KEY</span><span className="min-w-0">中长期占卜需要 AI 解读，请先在「设置 → AI 服务」中配置 API 密钥。</span></div></P4Card>
          )}
          <P4Card tone="paper">
            <CardLabel en="QUESTION">你想要询问什么？</CardLabel>
            <P4Textarea aria-label="你想要询问什么？" rows={4} maxLength={300} showCount value={question} onChange={(e) => setQuestion(e.target.value.slice(0, 300))} placeholder="例：我最近对工作的方向感到迷茫，接下来该如何取舍？" />
          </P4Card>
          <P4Card tone="paper">
            <CardLabel en="PERIOD">时间周期</CardLabel>
            <div className="grid grid-cols-3 gap-2">
              {PERIODS.map((p) => {
                const on = p === period;
                return (
                  <button key={p} type="button" onClick={() => setPeriod(p)} aria-pressed={on}
                    className={cx('p4g-press min-w-0 rounded-sm border-3 px-1.5 py-2 text-center', on ? 'border-p4g-black bg-p4g-black text-p4g-yellow shadow-[3px_3px_0_var(--p4g-orange)] night:border-p4g-yellow night:bg-p4g-yellow night:text-p4g-black' : 'border-p4g-line bg-p4g-surface text-p4g-ink')}>
                    <div className="truncate font-display text-body font-bold">{PERIOD_LABELS[p].label}</div>
                    <div className="mt-0.5 truncate text-2xs opacity-80">{PERIOD_LABELS[p].days}</div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex min-w-0 items-end gap-2 overflow-hidden">
              {spreadPositionsFor(period, hasBase ? 4 : 3).map((pos, i) => (
                <div key={pos} className="flex min-w-0 flex-col items-center gap-1">
                  <div style={{ transform: `rotate(${(i - 1.5) * 3}deg)` }}><TarotBack width={44} /></div>
                  <span className={cx('font-display text-2xs font-bold', pos === BASE_POSITION ? 'text-p4g-tag night:text-p4g-yellow' : 'text-p4g-ink-soft')}>{pos}</span>
                </div>
              ))}
              <div className="ml-auto min-w-0 pb-5 text-right text-2xs font-bold text-p4g-ink-soft">牌阵：{spreadPositionsFor(period, hasBase ? 4 : 3).join(' · ')}</div>
            </div>
          </P4Card>
          <P4Button block size="lg" variant="black" disabled={!question.trim() || cap || noApiKey} onClick={start}>🂠 开始洗牌</P4Button>
          {error && <P4Card tone="paper" padding="sm"><div className="whitespace-pre-wrap text-meta font-bold text-p4g-danger">{error}</div></P4Card>}
        </div>
      )}

      {phase === 'base' && (
        <div className="space-y-6 pt-2">
          <div className="text-center">
            <div className="font-display text-h3 font-bold tracking-[0.2em] text-[color:var(--p4g-on-stage)]">{base ? '命运的波纹已注入' : '请您注入命运的波纹'}</div>
            <div className="mt-1 text-meta font-bold text-[color:var(--p4g-on-stage)] opacity-80">{base ? `${BASE_POSITION}已定，稍后与三张牌一起翻开` : '长按牌堆，直到波纹注满'}</div>
          </div>
          <div className="flex justify-center"><HoldDeck done={!!base} onDone={onBaseDone} /></div>
          {!base && <div className="flex justify-center"><P4Button variant="secondary" onClick={() => setPhase('form')}>返回</P4Button></div>}
        </div>
      )}

      {phase === 'picking' && (
        <div className="space-y-4">
          {base && <div className="text-center text-meta font-bold text-[color:var(--p4g-on-stage)] opacity-85">{BASE_POSITION}已注入，尚未翻开 · 会与三张牌一起揭示</div>}
          <div className="text-center">
            <div className="font-display text-h3 font-bold text-[color:var(--p4g-on-stage)]">从六张牌中选出三张</div>
            <div className="mt-1 text-meta font-bold text-[color:var(--p4g-on-stage)] opacity-80">依次点击 = 依次进入牌阵：{positions.join(' → ')}</div>
          </div>
          <div className="mx-auto grid max-w-[420px] grid-cols-3 justify-items-center gap-3">
            {cands.map((c, i) => {
              const order = picks.indexOf(i);
              const on = order >= 0;
              return (
                <motion.button key={i} type="button" aria-pressed={on} aria-label={`第 ${i + 1} 张${on ? `（${positions[order]}）` : ''}`}
                  onClick={() => setPicks((p) => (on ? p.filter((x) => x !== i) : p.length < 3 ? [...p, i] : p))}
                  className="relative" animate={{ y: on && !low ? -10 : 0 }} transition={{ duration: 0.16 }}>
                  <TarotBack width={84} glow={on} />
                  {on && <span className="absolute -right-2 -top-2 flex h-7 min-w-[28px] items-center justify-center rounded-pill border-3 border-p4g-black bg-p4g-orange px-1.5 font-display text-meta font-bold text-p4g-black">{positions[order]}</span>}
                </motion.button>
              );
            })}
          </div>
          <div className="flex gap-3">
            <P4Button variant="secondary" className="flex-1" onClick={() => setPhase('form')}>返回</P4Button>
            <P4Button variant="black" className="flex-1" disabled={picks.length !== 3} onClick={reveal}>揭示（{picks.length}/3）</P4Button>
          </div>
          {error && <P4Card tone="paper" padding="sm"><div className="text-meta font-bold text-p4g-danger">{error}</div></P4Card>}
        </div>
      )}

      {(phase === 'revealing' || phase === 'reading') && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="font-display text-h3 font-bold text-[color:var(--p4g-on-stage)]">{phase === 'revealing' ? '揭示牌阵…' : '正在展开牌阵'}</div>
            {phase === 'revealing' && <div className="mt-1 text-meta font-bold text-[color:var(--p4g-on-stage)] opacity-80">三张牌依次翻开，等候星象的解读</div>}
          </div>
          <Spread cands={[...(base ? [base] : []), ...picks.map((i) => cands[i])]} positions={spreadPositionsFor(period, base ? 4 : 3)} sequential={phase === 'revealing'} />
          {phase === 'reading' && (
            <>
              {prog < 1 ? (
                <div className="flex justify-center"><ThinkingTV progress={prog} label={prog < 0.7 ? '三张牌正在被放在一起推演' : '正在展开牌阵'} /></div>
              ) : (
                <MsgBox speaker="解读"><Markdownish text={tw.text || '…'} /></MsgBox>
              )}
              {prog >= 1 && !tw.done && (
                <div className="flex flex-wrap justify-center gap-2">
                  <P4Button size="sm" variant="secondary" onClick={() => setTruncated(true)}>接着写</P4Button>
                  <P4Button size="sm" onClick={accept}>就用这些</P4Button>
                  <P4Button size="sm" variant="ghost" onClick={() => setPhase('picking')}>返回抽卡重试</P4Button>
                </div>
              )}
              <div className="text-center text-meta font-bold text-[color:var(--p4g-on-stage)] opacity-75">离开这页也不会中断，回来接着看。</div>
            </>
          )}
        </div>
      )}
    </StateFade>
  );
}

function Spread({ cands, positions, sequential }: { cands: Cand[]; positions: string[]; sequential: boolean }) {
  const low = useLowMotion();
  const [n, setN] = useState(sequential ? 0 : cands.length);
  useEffect(() => {
    if (!sequential) { setN(cands.length); return; }
    setN(0); const ts = cands.map((_, i) => setTimeout(() => setN(i + 1), low ? 50 : 250 + i * 320));
    return () => ts.forEach(clearTimeout);
  }, [sequential, cands.length, low]);
  const w = cands.length > 3 ? 70 : 84;
  return (
    <div className="flex justify-center gap-2.5">
      {cands.map((c, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <FlipCard width={w} flipped={i < n} back={<TarotBack width={w} />} front={<TarotFace id={c.id} orientation={c.orientation} width={w} />} />
          <span className={cx('rounded-xs px-1.5 font-display text-2xs font-bold', positions[i] === BASE_POSITION ? 'bg-p4g-orange text-p4g-black' : 'bg-p4g-black text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black')}>{positions[i]}</span>
        </div>
      ))}
    </div>
  );
}

/** 长按注入命运的波纹：牌堆 + 蓄力环 + 波纹（transform scale） */
function HoldDeck({ done, onDone }: { done: boolean; onDone: () => void }) {
  const low = useLowMotion();
  const hold = useHold(low ? 600 : 1800, onDone, !done);
  const p = done ? 1 : hold.progress;
  return (
    <div className="relative flex h-[230px] w-[230px] items-center justify-center">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} aria-hidden className="absolute rounded-pill border-3 border-p4g-orange" style={{ width: 200, height: 200 }}
          animate={{ scale: 0.3 + p * (0.5 + i * 0.25), opacity: p > 0 ? 0.9 - i * 0.25 : 0 }} transition={{ duration: low ? 0 : 0.12 }} />
      ))}
      <svg aria-hidden viewBox="0 0 100 100" className="absolute h-full w-full">
        {Array.from({ length: 40 }, (_, i) => { const a = (i / 40) * Math.PI * 2 - Math.PI / 2; const lit = i / 40 < p; return <line key={i} x1={50 + Math.cos(a) * 43} y1={50 + Math.sin(a) * 43} x2={50 + Math.cos(a) * 49} y2={50 + Math.sin(a) * 49} stroke={lit ? 'var(--p4g-orange)' : 'var(--p4g-line-soft)'} strokeWidth="3" />; })}
      </svg>
      <button type="button" {...hold.handlers} aria-label="长按注入命运的波纹" className="relative touch-none select-none" style={{ width: 92, height: cardH(92) + 10 }}>
        {[0, 1, 2].map((i) => <div key={i} className="absolute left-0" style={{ top: i * 4, transform: `rotate(${(i - 1) * 3}deg)` }}><TarotBack width={92} glow={done && i === 2} /></div>)}
      </button>
    </div>
  );
}

// ───────────────────────── 档案详情 ─────────────────────────
export function ReadingDetail({ reading, canFollowUp, onBack, onArchive, onDelete, onFollowSaved }: {
  reading: LongReading; canFollowUp: boolean; onBack: () => void; onArchive: (archived: boolean) => void; onDelete: () => void; onFollowSaved: (f: LongReading['followUps'][number]) => void;
}) {
  const positions = spreadPositionsFor(reading.period, reading.picked.length);
  const expired = reading.expiresAt < TODAY;
  const remaining = Math.max(0, Math.ceil((new Date(reading.expiresAt).getTime() - Date.now()) / 86400_000));
  const [confirmDel, setConfirmDel] = useState(false);
  const [followOpen, setFollowOpen] = useState(false);
  const canAsk = canFollowUp && reading.followUps.length === 0 && !reading.archived && !expired;
  return (
    <CollageStagger className="space-y-4">
      <CollageItem>
        <div className="flex items-start gap-3">
          <button type="button" onClick={onBack} aria-label="返回" className="p4g-press flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border-3 border-p4g-black bg-p4g-yellow text-p4g-black shadow-hard-sm night:border-p4g-yellow"><IconBack size={16} /></button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <P4Chip size="sm" tone="black">{PERIOD_LABELS[reading.period].label}</P4Chip>
              {reading.archived ? <P4Chip size="sm" tone="outline">已归档</P4Chip> : expired ? <P4Chip size="sm" tone="danger">已到期</P4Chip> : <P4Chip size="sm" tone="tag">活跃 · 剩 {remaining} 天</P4Chip>}
            </div>
            <div className="mt-1 p4g-clamp-2 font-display text-lead font-bold text-[color:var(--p4g-on-stage)]">{reading.question}</div>
            <div className="mt-0.5 text-meta font-bold text-[color:var(--p4g-on-stage)] opacity-75">{new Date(reading.createdAt).toLocaleDateString('zh-CN')} · 到期 {reading.expiresAt}</div>
          </div>
        </div>
      </CollageItem>
      <CollageItem>
        <div className="flex justify-center gap-2.5">
          {reading.picked.map((p, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <TarotFace id={p.cardId} orientation={p.orientation} width={reading.picked.length > 3 ? 70 : 82} />
              <span className="rounded-xs bg-p4g-black px-1.5 font-display text-2xs font-bold text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black">{positions[i]}</span>
            </div>
          ))}
        </div>
      </CollageItem>
      <CollageItem><MsgBox speaker="解读"><Markdownish text={reading.content} /></MsgBox></CollageItem>
      {reading.followUps.map((f) => (
        <CollageItem key={f.id}>
          <P4Card tone="paper">
            <CardLabel en="FOLLOW-UP">追问</CardLabel>
            <div className="flex gap-3">
              <TarotFace id={f.cardId} orientation={f.orientation} width={56} />
              <div className="min-w-0 flex-1">
                <div className="font-display text-body font-bold text-p4g-ink">「{f.question}」</div>
                <p className="mt-1 text-meta leading-relaxed text-p4g-ink-soft">{f.content}</p>
              </div>
            </div>
          </P4Card>
        </CollageItem>
      ))}
      <CollageItem>
        <P4Card tone="paper">
          <div className="mb-3 border-b-thin border-p4g-line/30 pb-2">
            <div className="font-display text-body font-bold tracking-[0.3em] text-p4g-tag night:text-p4g-yellow">窥探命运</div>
            <div className="mt-0.5 text-2xs font-bold tracking-wider text-p4g-ink-soft">{positions.join(' · ')}</div>
          </div>
          <div className="divide-y-2 divide-dashed divide-p4g-line/25">
            {[...reading.picked.map((p, i) => ({ k: `m${i}`, pos: positions[i], p })), ...reading.followUps.map((f, i) => ({ k: `f${i}`, pos: '追问', p: { cardId: f.cardId, orientation: f.orientation } }))].map(({ k, pos, p }) => {
              const c = TAROT_BY_ID[p.cardId]; const m = c[p.orientation];
              return (
                <div key={k} className="space-y-1.5 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-display text-lead font-bold text-p4g-ink">{c.name}</span><P4Chip size="sm" tone="tag">{pos}</P4Chip><span className="text-2xs font-bold text-p4g-ink-soft">{ORI_LABEL[p.orientation]}</span></div>
                  <div className="flex flex-wrap gap-1">{m.keywords.map((kw) => <P4Chip key={kw} size="sm" tone="outline">{kw}</P4Chip>)}</div>
                  <p className="text-meta leading-relaxed text-p4g-ink-soft">{m.meaning}</p>
                  <p className="text-body leading-relaxed text-p4g-ink">{m.reflection}</p>
                </div>
              );
            })}
          </div>
        </P4Card>
      </CollageItem>
      {followOpen && <CollageItem><FollowUpPanel onClose={() => setFollowOpen(false)} onSaved={(f) => { onFollowSaved(f); }} /></CollageItem>}
      <CollageItem>
        <div className="flex flex-wrap gap-2.5 pt-1">
          {canAsk && !followOpen && <P4Button className="flex-1" variant="black" onClick={() => setFollowOpen(true)}>追问（1/1）</P4Button>}
          {!reading.archived ? <P4Button className="flex-1" variant="secondary" onClick={() => onArchive(true)}>归档</P4Button> : <P4Button className="flex-1" variant="secondary" onClick={() => onArchive(false)}>取消归档</P4Button>}
          {confirmDel ? <P4Button className="flex-1" variant="danger" onClick={onDelete}>确认删除</P4Button> : <P4Button variant="ghost" onClick={() => setConfirmDel(true)}>删除</P4Button>}
        </div>
      </CollageItem>
    </CollageStagger>
  );
}

function FollowUpPanel({ onClose, onSaved }: { onClose: () => void; onSaved: (f: LongReading['followUps'][number]) => void }) {
  const [phase, setPhase] = useState<'form' | 'picking' | 'reading' | 'error' | 'done'>('form');
  const [q, setQ] = useState('');
  const [cands, setCands] = useState<Cand[]>([]);
  const [idx, setIdx] = useState<number | null>(null);
  const prog = useFakeProgress(phase === 'reading', 1800);
  const text = '节制说：稳不是退。你会在稳里慢慢调出自己想要的比例——只要别把「稳」当成「不再想」。';
  const tw = useTypewriter(text, phase === 'reading' && prog >= 1, 70);
  useEffect(() => {
    if (phase === 'reading' && tw.done && prog >= 1) {
      const c = cands[idx ?? 0];
      onSaved({ id: `fu-${Date.now()}`, question: q, drawnFrom: cands.map((x) => x.id), cardId: c.id, orientation: c.orientation, content: text, createdAt: new Date() });
      setPhase('done');
    }
  }, [phase, tw.done, prog]); // eslint-disable-line
  return (
    <P4Card tone="surface" cut="br">
      <CardLabel en="ONE MORE" right={phase !== 'done' && <button type="button" onClick={onClose} className="font-display text-meta font-bold text-p4g-ink-soft underline">收起</button>}>追问（仅一次）</CardLabel>
      {phase === 'form' && (
        <div className="space-y-2.5">
          <P4Textarea aria-label="追问" rows={3} maxLength={200} value={q} onChange={(e) => setQ(e.target.value)} placeholder="想对先前的解读再深入问什么？" />
          <P4Button block variant="black" disabled={!q.trim()} onClick={() => { setCands(drawRandom(3).map((id) => ({ id, orientation: randomOri() }))); setPhase('picking'); }}>抽一张牌</P4Button>
        </div>
      )}
      {phase === 'picking' && (
        <div>
          <div className="mb-2 text-center font-display text-body font-bold text-p4g-ink">从三张中选一张</div>
          <div className="flex justify-center gap-3">{cands.map((c, i) => <button key={i} type="button" aria-label={`第 ${i + 1} 张`} onClick={() => { setIdx(i); setPhase('reading'); }} className="p4g-press"><TarotBack width={72} /></button>)}</div>
        </div>
      )}
      {(phase === 'reading' || phase === 'error' || phase === 'done') && idx !== null && (
        <div className="flex gap-3">
          <TarotFace id={cands[idx].id} orientation={cands[idx].orientation} width={64} />
          <div className="min-w-0 flex-1">
            {phase === 'reading' && prog < 1 && <ThinkingTV size={70} progress={prog} label={prog < 0.6 ? '正在思索' : '正在回应'} />}
            {(phase !== 'reading' || prog >= 1) && <p className="text-body leading-relaxed text-p4g-ink">{phase === 'done' ? text : tw.text}</p>}
            {phase === 'reading' && prog >= 1 && !tw.done && (
              <div className="mt-2 flex flex-wrap gap-x-3 text-meta font-bold text-p4g-ink">
                <button type="button" className="underline" onClick={() => setPhase('error')}>接着写</button>
                <button type="button" className="underline" onClick={() => { setPhase('done'); onSaved({ id: `fu-${Date.now()}`, question: q, drawnFrom: [], cardId: cands[idx].id, orientation: cands[idx].orientation, content: tw.text, createdAt: new Date() }); }}>就用这些</button>
              </div>
            )}
            {phase === 'error' && <div className="mt-2 text-meta font-bold text-p4g-danger">回应失败<button type="button" className="ml-3 underline" onClick={() => setPhase('reading')}>重试</button></div>}
          </div>
        </div>
      )}
      {phase === 'done' && <div className="mt-3 text-center text-meta font-bold text-p4g-ink-soft">追问已记录，可在档案中回看。</div>}
    </P4Card>
  );
}

// ───────────────────────── 档案列表 ─────────────────────────
export function ReadingArchive({ readings, onOpen }: { readings: LongReading[]; onOpen: (r: LongReading) => void }) {
  const active = readings.filter((r) => !r.archived && r.expiresAt >= TODAY);
  const archived = readings.filter((r) => r.archived || r.expiresAt < TODAY);
  if (!readings.length) return <P4EmptyState title="尚未有中长期占卜记录" hint="发起一次占卜后，此处会保留全部档案" />;
  const Row = ({ r, state }: { r: LongReading; state: 'active' | 'archived' }) => {
    const first = r.picked[0];
    return (
      <P4Card as="button" interactive tone="surface" padding="sm" onClick={() => onOpen(r)} className="w-full" innerClassName="flex items-center gap-3">
        {first ? <TarotFace id={first.cardId} orientation={first.orientation} width={40} showTag={false} /> : <div className="flex h-16 w-10 items-center justify-center rounded-[6px] bg-p4g-black text-p4g-yellow">?</div>}
        <div className="min-w-0 flex-1 text-left">
          <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
            <P4Chip size="sm" tone={state === 'active' ? 'tag' : 'outline'}>{state === 'active' ? '活跃' : '已归档'}</P4Chip>
            <P4Chip size="sm" tone="black">{PERIOD_LABELS[r.period].label}</P4Chip>
            {r.followUps.length > 0 && <P4Chip size="sm" tone="yellow">+{r.followUps.length} 追问</P4Chip>}
          </div>
          <div className="p4g-clamp-1 font-display text-body font-bold text-p4g-ink">{r.question}</div>
          <div className="text-2xs font-bold text-p4g-ink-soft">{new Date(r.createdAt).toLocaleDateString('zh-CN')} · 到期 {r.expiresAt}</div>
        </div>
      </P4Card>
    );
  };
  return (
    <CollageStagger className="space-y-5">
      <CollageItem>
        <div className="mb-2 font-display text-meta font-bold tracking-[0.08em] text-[color:var(--p4g-on-stage)]">活跃 · <span className="p4g-num">{active.length} / 2</span></div>
        <div className="space-y-2.5">{active.map((r) => <Row key={r.id} r={r} state="active" />)}{!active.length && <div className="text-meta font-bold text-[color:var(--p4g-on-stage)] opacity-70">—</div>}</div>
      </CollageItem>
      {archived.length > 0 && (
        <CollageItem>
          <div className="mb-2 font-display text-meta font-bold tracking-[0.08em] text-[color:var(--p4g-on-stage)] opacity-80">归档 · <span className="p4g-num">{archived.length}</span></div>
          <div className="space-y-2.5">{archived.map((r) => <Row key={r.id} r={r} state="archived" />)}</div>
        </CollageItem>
      )}
    </CollageStagger>
  );
}
