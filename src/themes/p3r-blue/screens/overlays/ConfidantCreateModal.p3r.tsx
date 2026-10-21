/**
 * 结识一位同伴（真实 ConfidantCreateModal）：basic → description → trait（4 个小问题）→ matching（星象匹配中）→ result（塔罗的回响）/ error。
 *   #/overlay/bond-create?step=basic|description|trait|matching|result|error   （每阶段直达；?fail=error|nokey|offline 走 AI 失败分支）
 * AI：matching = useAIStream 思考约 2.4s；result 的「为什么是这张牌」逐字输出（可 SKIP / 截断续写）；失败 → error（返回修改 / 重试）；未配密钥 → 离线匹配提示。
 * 入口：同伴页右下 + FAB / 卡墙空白牌 / 空状态「邀请第一位同伴」；「在线同伴」卡 → 邀请在线同伴。
 */
import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/store';
import { aiConfigured } from '@/utils/aiClient';
import { matchConfidant, type ConfidantMatchResult } from '@/utils/confidantAI';
import type { OverlayProps } from '@blue/registry/types';
import { P3Button, P3Field, P3Input, P3OnOff, P3R, P3Sheet, P3Textarea, slantClip, tickClip } from '@blue/kit';
import { AIText, useAIStream, type AIFail } from '@blue/fx';
import { INTIMACY_LABELS, MAJOR_ARCANA_IDS, TAROT_BY_ID, TRAIT_QUESTIONS } from '@blue/screens/pkg3/arcana';
import { LevelGrid, MatchingSpinner, MiniLabel, Panel, Sparkle, Tarot, TraitQuiz } from '@blue/screens/pkg3/ui';

type Stage = 'basic' | 'description' | 'trait' | 'matching' | 'result' | 'error';
export interface CreateResult { id: string; name: string; arcanaId: string; orientation: 'upright' | 'reversed'; level: number; description: string; decay: boolean }

export function ConfidantCreateSheet({ isOpen, onClose, onCreated, onPickOnline, initialStage = 'basic', remaining = 15, fail }: {
  isOpen: boolean; onClose: () => void; onCreated?: (id: string) => void; onPickOnline?: () => void; initialStage?: Stage; remaining?: number; fail?: AIFail;
}) {
  const { settings, confidants, addConfidant, updateConfidant } = useAppStore(useShallow((store) => ({
    settings: store.settings,
    confidants: store.confidants,
    addConfidant: store.addConfidant,
    updateConfidant: store.updateConfidant,
  })));
  const [stage, setStage] = useState<Stage>(initialStage);
  const [kind, setKind] = useState<'offline' | 'online'>('offline');
  const [name, setName] = useState(initialStage === 'basic' ? '' : '友近');
  const [decay, setDecay] = useState(false);
  const [desc, setDesc] = useState(initialStage === 'basic' || initialStage === 'description' ? '' : '剑道部的同学，嘴贫但很讲义气，失恋了会拉着我去吃拉面。');
  const [traitStep, setTraitStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(initialStage === 'trait' ? [] : TRAIT_QUESTIONS.map((q) => q.options[1]));
  const [err, setErr] = useState<string | null>(null);
  const [picked, setPicked] = useState(1);
  const [match, setMatch] = useState<ConfidantMatchResult | null>(null);
  const takenIds = useMemo(() => confidants.filter((c) => !c.archivedAt).map((c) => c.arcanaId), [confidants]);
  const left = remaining ?? MAJOR_ARCANA_IDS.length - takenIds.length;
  const aiFail: AIFail = initialStage === 'error' && !fail ? 'error' : fail;
  const ai = useAIStream({ text: match?.interpretation ?? '', fail: aiFail, initialPhase: initialStage === 'matching' ? 'thinking' : initialStage === 'result' ? 'streaming' : initialStage === 'error' ? 'error' : 'idle', failAt: initialStage === 'result' ? 0.08 : 0.45 });
  const offline = !aiConfigured(settings);
  useEffect(() => {
    if (!isOpen) return;
    setStage(initialStage);
    setTraitStep(0);
    setMatch(null);
    setPicked(1);
  }, [isOpen, initialStage]);
  // AI 相位 → 阶段
  useEffect(() => {
    if (stage !== 'matching') return;
    if (ai.phase === 'streaming' || ai.phase === 'done' || ai.phase === 'truncated') setStage('result');
    if (ai.phase === 'error') setStage('error');
    if (ai.phase === 'nokey') { ai.skip(); setStage('result'); }
  }, [ai.phase, stage]); // eslint-disable-line react-hooks/exhaustive-deps

  const back = () => {
    if (stage === 'description') setStage('basic');
    else if (stage === 'trait' && traitStep > 0) setTraitStep(traitStep - 1);
    else if (stage === 'trait') setStage('description');
    else if (stage === 'result') { setStage('trait'); setTraitStep(TRAIT_QUESTIONS.length - 1); }
  };
  const nextBasic = () => {
    if (kind === 'online') { onPickOnline?.(); return; }
    if (!name.trim()) return setErr('请先告诉我 Ta 叫什么名字');
    if (left <= 0) return setErr('22 张大阿卡纳都已占用，请先归档一位同伴再添加');
    setErr(null); setStage('description');
  };
  const nextDesc = () => { if (desc.trim().length < 4) return setErr('请用至少几个字描述 Ta，让塔罗有内容可参考'); setErr(null); setStage('trait'); setTraitStep(0); };
  const startMatch = async (nextAnswers: string[]) => {
    setErr(null);
    setStage('matching');
    try {
      let result: ConfidantMatchResult | null = null;
      const traits = TRAIT_QUESTIONS.map((q, i) => ({ question: q.question, answer: nextAnswers[i] ?? '' }));
      for (let i = 0; i < 3; i += 1) {
        const candidate = await matchConfidant({
          settings,
          name: name.trim(),
          description: desc.trim(),
          takenArcanaIds: takenIds,
          traits,
        });
        if (!takenIds.includes(candidate.arcanaId)) {
          result = candidate;
          break;
        }
      }
      if (!result) throw new Error('未能找到合适的阿卡纳，请调整描述后再试');
      setMatch(result);
      setPicked(Math.max(1, result.initialIntimacy));
      setStage('result');
      window.setTimeout(() => { ai.reset(); ai.start(); }, 0);
    } catch (error) {
      setErr(error instanceof Error ? error.message : '匹配失败');
      setStage('error');
    }
  };
  const answer = (v: string) => {
    const a = [...answers]; a[traitStep] = v; setAnswers(a);
    if (traitStep < TRAIT_QUESTIONS.length - 1) window.setTimeout(() => setTraitStep(traitStep + 1), 160);
    else window.setTimeout(() => { void startMatch(a); }, 200);
  };
  const title = stage === 'result' ? '塔罗的回响' : '结识一位同伴';
  const step = stage === 'basic' ? 0 : stage === 'description' ? 1 : stage === 'trait' ? 2 : 3;
  const card = match ? TAROT_BY_ID[match.arcanaId] : null;

  return (
    <P3Sheet open={isOpen} onClose={onClose} title={title} en="NEW LINK" size="tall" busy={stage === 'matching'}
      footer={stage === 'basic' ? <P3Button block size="lg" corner onClick={nextBasic}>{kind === 'online' ? '去邀请在线同伴' : '下一步'}</P3Button>
        : stage === 'description' ? <P3Button block size="lg" corner onClick={nextDesc}>下一步（还有 4 个小问题）</P3Button>
        : stage === 'result' ? (
          <div className="grid grid-cols-2 gap-3">
            <P3Button tone="soft" block onClick={back}>回去改一改</P3Button>
            <P3Button block corner disabled={!match || ai.phase === 'streaming' || ai.phase === 'thinking'} onClick={async () => {
              if (!match) return;
              try {
                const created = await addConfidant({ name: name.trim(), description: desc.trim(), match, source: 'offline', initialLevel: picked });
                if (decay) await updateConfidant(created.id, { decayEnabled: true });
                onCreated?.(created.id);
                onClose();
              } catch (error) {
                setErr(error instanceof Error ? error.message : '保存失败');
                setStage('error');
              }
            }}>就是 Ta 了</P3Button>
          </div>
        ) : stage === 'error' ? (
          <div className="grid grid-cols-2 gap-3"><P3Button tone="soft" block onClick={() => { setStage('trait'); setTraitStep(TRAIT_QUESTIONS.length - 1); }}>返回修改</P3Button><P3Button block onClick={() => { setStage('matching'); ai.retry(); }}>重新匹配</P3Button></div>
        ) : undefined}>
      <div className="mb-4 flex min-w-0 items-center gap-2">
        {(stage === 'description' || stage === 'trait' || stage === 'result') && (
          <button type="button" aria-label="返回上一步" onClick={back} className="flex h-9 w-9 shrink-0 items-center justify-center" style={{ background: P3R.cyanFaint, clipPath: slantClip(6) }}>
            <span aria-hidden className="block h-[12px] w-[10px]" style={{ background: P3R.ink, clipPath: 'polygon(100% 0, 100% 100%, 0 50%)' }} />
          </button>
        )}
        <div className="flex min-w-0 flex-1 gap-1" aria-hidden>{[0, 1, 2, 3].map((i) => <span key={i} className="h-[7px] min-w-0 flex-1" style={{ clipPath: slantClip(3), background: i <= step ? P3R.blue : 'var(--p3r-track)' }} />)}</div>
        <span className="shrink-0 px-2 py-0.5 font-cond text-[12px]" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(5) }}>ARCANA {left} / {MAJOR_ARCANA_IDS.length}</span>
      </div>

      {stage === 'basic' && (
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-2 gap-3">
            {([['offline', '离线同伴', '本地塔罗匹配', '身边的人 / 自己的关系'], ['online', '在线同伴', '按 UserID 邀请', '缔结双向羁绊']] as const).map(([id, t, a, b]) => {
              const on = kind === id;
              return (
                <button key={id} type="button" aria-pressed={on} onClick={() => setKind(id)} className="relative min-w-0 px-4 py-3 text-left" style={{ clipPath: slantClip(10), background: on ? P3R.blue : P3R.panel, color: on ? P3R.onBlue : P3R.ink, boxShadow: on ? undefined : 'var(--p3r-shadow)' }}>
                  <div className="flex items-center gap-1.5 font-heavy text-[15px]"><Sparkle size={13} />{t}</div>
                  <div className="mt-1 text-[11px] font-bold leading-snug" style={{ opacity: 0.85 }}>{a}<br />{b}</div>
                  {on && <span aria-hidden className="absolute bottom-0 right-3 h-[6px] w-[14px]" style={{ background: P3R.magenta, clipPath: tickClip }} />}
                </button>
              );
            })}
          </div>
          {kind === 'offline' ? <>
            <P3Field label="Ta 的名字 / 称呼" error={err ?? undefined} count={`${name.length} / 20`}><P3Input placeholder="朋友、家人、老师、恋人……" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} invalid={!!err} /></P3Field>
            <Panel tone="blush" className="flex items-center gap-3">
              <div className="min-w-0 flex-1"><div className="text-[14px] font-black">开启「逆流」模式</div><div className="text-[12px]" style={{ color: P3R.grey }}>连续 3 天无互动，亲密度每日 -1。</div></div>
              <P3OnOff value={decay} onChange={setDecay} ariaLabel="开启「逆流」模式" />
            </Panel>
            {offline && <p className="px-3 py-2 text-[12px] font-bold" style={{ background: P3R.cyanFaint, color: P3R.inkSoft, clipPath: slantClip(6) }}>未配置 AI API，将使用离线模式进行匹配</p>}
          </> : <Panel tone="blush"><p className="text-[13px] leading-relaxed" style={{ color: P3R.inkSoft }}>在线同伴需要对方的 UserID：发出邀请后，对方同意即在双方的同伴墙上落座，可以互相祈愿、缔结 COOP、一起讨伐羁绊之影。</p></Panel>}
        </div>
      )}

      {stage === 'description' && (
        <div>
          <MiniLabel en="TELL THE STARS">告诉星象</MiniLabel>
          <P3Field label="你们的关系 / Ta 是什么样的人？" error={err ?? undefined} count={`${desc.length} / 500`}>
            <P3Textarea rows={6} maxLength={500} value={desc} onChange={(e) => setDesc(e.target.value)} invalid={!!err} placeholder="比如：一起长大的朋友，总能包容我的不安；最近很忙，但只要我需要，Ta 都会接电话……" />
          </P3Field>
          <p className="mt-2 text-[12px]" style={{ color: P3R.grey }}>写得越具体，牌越准。名字：<b style={{ color: P3R.ink }}>{name || '友近'}</b></p>
        </div>
      )}

      {stage === 'trait' && <TraitQuiz step={traitStep} answers={answers} onAnswer={answer} onPrev={() => setTraitStep(traitStep - 1)} />}
      {stage === 'matching' && <MatchingSpinner />}

      {stage === 'result' && (
        <div className="grid grid-cols-1 gap-4">
          <div className="relative flex min-w-0 items-center gap-4 overflow-hidden px-4 py-3" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(14) }}>
            <span aria-hidden className="pointer-events-none absolute -right-2 -top-3 font-cond text-[72px] leading-none opacity-20">{card?.roman}</span>
            <Tarot arcanaId={match?.arcanaId ?? 'fool'} width={80} />
            <div className="relative min-w-0">
              <div className="font-cond text-[12px] tracking-[0.2em] opacity-85">ARCANA MATCHED</div>
              <div className="font-heavy text-[clamp(22px,6vw,28px)] leading-tight">《{card?.name}》正位</div>
              <div className="mt-1 text-[13px] font-black">星象建议 Lv.{match?.initialIntimacy ?? 1} · {INTIMACY_LABELS[match?.initialIntimacy ?? 1]}</div>
            </div>
          </div>
          <Panel>
            <div className="mb-2 flex min-w-0 items-center justify-between gap-2"><span className="text-[13px] font-black">当前亲密度（由你决定）</span><span className="shrink-0 font-cond text-[15px]" style={{ color: P3R.roseInk }}>Lv.{picked} · {INTIMACY_LABELS[picked]}</span></div>
            <LevelGrid value={picked} onChange={setPicked} />
            <p className="mt-2 text-[11px]" style={{ color: P3R.grey }}>AI 只给参考，最终等级由你判断。不同等级会立即解锁对应的日常/战斗能力。</p>
          </Panel>
          <Panel tone="blush">
            <MiniLabel en="WHY">为什么是这张牌</MiniLabel>
            <AIText ai={ai} className="text-[14px]" />
            {ai.phase === 'truncated' && <div className="mt-2"><P3Button size="sm" onClick={ai.resume}>接着写 ›</P3Button></div>}
            {ai.phase === 'error' && <div className="mt-2 flex items-center gap-2"><span className="text-[12px] font-bold" style={{ color: 'var(--p3r-coral-ink)' }}>{ai.error?.message}</span><P3Button size="sm" tone="danger" onClick={ai.retry}>重试</P3Button></div>}
          </Panel>
          {(ai.phase === 'done' || ai.phase === 'idle') && (
            <div className="relative px-4 py-3" style={{ background: 'var(--p3r-mulberry)', color: 'var(--p3r-cream)', clipPath: slantClip(12) }}>
              <div className="mb-1 font-cond text-[12px] tracking-[0.2em]" style={{ color: 'var(--bk-bubble-a)' }}>FUTURE · 未来</div>
              <p className="text-[14px] leading-relaxed">{match?.advice ?? ''}</p>
            </div>
          )}
          {offline && <div className="text-center text-[12px]" style={{ color: P3R.grey }}>· 本次为离线匹配 ·</div>}
        </div>
      )}

      {stage === 'error' && (
        <div className="py-8 text-center">
          <div className="mx-auto mb-3 w-fit px-4 py-1 font-cond text-[26px]" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(8) }}>NO MATCH</div>
          <p className="text-[15px] font-black" style={{ color: 'var(--p3r-coral-ink)' }}>{ai.error?.code === 'offline' ? '当前离线：星象暂时联系不上' : '未能找到合适的阿卡纳，请调整描述后再试'}</p>
          <p className="mt-1 text-[12px]" style={{ color: P3R.grey }}>{ai.error?.message ?? '解读服务暂时无法连接'} · 已填写的内容都还在</p>
        </div>
      )}
    </P3Sheet>
  );
}

export default function ConfidantCreateModal({ open, onClose, params }: OverlayProps) {
  const step = (params?.get('step') as Stage) || 'basic';
  return <ConfidantCreateSheet isOpen={open} onClose={onClose} initialStage={step} fail={params?.get('fail') as AIFail} onPickOnline={() => { window.location.hash = '#/overlay/bond-add-online'; }} />;
}
