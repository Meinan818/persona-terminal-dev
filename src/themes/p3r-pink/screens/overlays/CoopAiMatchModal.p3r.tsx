/**
 * 星象匹配（真实 CoopAiMatchModal）：description → trait（4 问）→ matching（AI 思考）→ result（逐字解读 + 起点 / 属性 / 留言）/ error。
 *   #/overlay/bond-coop-ai-match?step=description|trait|matching|result|error&ai=0（离线匹配）&fail=error|truncate|offline
 * 入口：发起 COOP / 响应 COOP 的「星象匹配」卡（叠在其上弹出，确认后自动提交）。
 */
import { useEffect, useState } from 'react';
import type { AttributeId } from '@real/types';
import type { OverlayProps } from '@pink/registry/types';
import { P3Button, P3Field, P3R, P3Sheet, P3Textarea, slantClip } from '@pink/kit';
import { AIText, useAIStream, type AIFail } from '@pink/fx';
import { ATTR_IDS, ATTR_NAMES, INTIMACY_LABELS, TAROT_BY_ID, TRAIT_QUESTIONS } from '@pink/screens/pkg3/arcana';
import { LevelGrid, MatchingSpinner, MiniLabel, Panel, Tarot, TraitQuiz } from '@pink/screens/pkg3/ui';
import { useAppStore } from '@/store';
import { matchConfidant, type ConfidantMatchResult } from '@/utils/confidantAI';

type Step = 'description' | 'trait' | 'matching' | 'result' | 'error';
export interface AiMatchResult { arcanaId: string; orientation: 'upright' | 'reversed'; level: number; attr: AttributeId; message: string }
const M = { arcanaId: 'magician', orientation: 'upright' as const, initialIntimacy: 3, interpretation: '魔术师：他总能把手边的东西变成一场冒险。你们之间的能量来自「一起动手」——那些半途而废的计划，其实都是他递过来的邀请。', advice: '把下一次的胡闹，变成一次真正完成的小项目。' };

export function CoopAiMatchSheet({ isOpen, onClose, targetName, onConfirm, initialStep = 'description', aiConfigured = true, fail }: { isOpen: boolean; onClose: () => void; targetName: string; onConfirm?: (r: AiMatchResult) => void; initialStep?: Step; aiConfigured?: boolean; fail?: AIFail }) {
  const [matchResult, setMatchResult] = useState<ConfidantMatchResult | null>(null);
  const [reading, setReading] = useState(M.interpretation);
  const aiFail: AIFail = initialStep === 'error' && !fail ? 'error' : fail;
  const ai = useAIStream({ text: reading, fail: aiFail, initialPhase: initialStep === 'matching' ? 'thinking' : initialStep === 'result' ? 'streaming' : initialStep === 'error' ? 'error' : 'idle', failAt: initialStep === 'result' ? 0.08 : 0.45 });
  const [step, setStep] = useState<Step>(initialStep);
  const [desc, setDesc] = useState(initialStep === 'description' ? '' : '一起搞过很多荒唐计划的损友，关键时刻从不掉链子。');
  const [ts, setTs] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [level, setLevel] = useState(M.initialIntimacy);
  const [attr, setAttr] = useState<AttributeId>(TAROT_BY_ID[M.arcanaId].attr);
  const [message, setMessage] = useState('');
  useEffect(() => { if (isOpen) { setStep(initialStep); setTs(0); } }, [isOpen, initialStep]);
  useEffect(() => {
    if (step === 'result' && matchResult && ai.phase === 'idle') ai.start();
  }, [ai, matchResult, step]);
  useEffect(() => {
    if (step !== 'matching') return;
    if (ai.phase === 'streaming' || ai.phase === 'done' || ai.phase === 'truncated') setStep('result');
    if (ai.phase === 'error') setStep('error');
  }, [ai.phase, step]);
  const valid = desc.trim().length >= 4;
  const match = async (traits = answers) => {
    setStep('matching');
    try {
      const result = await matchConfidant({
        settings: useAppStore.getState().settings,
        name: targetName,
        description: desc.trim(),
        takenArcanaIds: useAppStore.getState().confidants.map((item) => item.arcanaId),
        traits: TRAIT_QUESTIONS.map((q, i) => ({ question: q.question, answer: traits[i] ?? '' })),
      });
      setMatchResult(result);
      setReading(result.interpretation);
      setLevel(Math.max(1, Math.min(10, result.initialIntimacy)));
      setAttr(TAROT_BY_ID[result.arcanaId]?.attr ?? TAROT_BY_ID[M.arcanaId].attr);
      setStep('result');
    } catch {
      setStep('error');
    }
  };
  const answer = (v: string) => { const a = [...answers]; a[ts] = v; setAnswers(a); if (ts < TRAIT_QUESTIONS.length - 1) window.setTimeout(() => setTs(ts + 1), 160); else window.setTimeout(() => { void match(a); }, 200); };
  const matched = matchResult ?? M;
  const card = TAROT_BY_ID[matched.arcanaId];
  return (
    <P3Sheet open={isOpen} onClose={onClose} title={`星象为 ${targetName} 推演一张塔罗`} en="STAR MATCH" size="tall" busy={step === 'matching'}
      footer={step === 'description' ? <P3Button block size="lg" corner disabled={!valid} onClick={() => { setStep('trait'); setTs(0); }}>{valid ? '下一步（4 个小问题）' : '至少几个字，让塔罗有内容可参考'}</P3Button>
        : step === 'result' ? <div className="grid grid-cols-3 gap-2"><P3Button size="sm" tone="soft" onClick={() => { setStep('trait'); setTs(TRAIT_QUESTIONS.length - 1); }}>回去改一改</P3Button><P3Button size="sm" tone="soft" onClick={() => { void match(); }}>重新匹配</P3Button><P3Button size="sm" corner disabled={ai.phase === 'streaming'} onClick={() => { onConfirm?.({ arcanaId: matched.arcanaId, orientation: matched.orientation, level, attr, message }); onClose(); }}>就用这份 ✧</P3Button></div>
        : step === 'error' ? <div className="grid grid-cols-2 gap-3"><P3Button tone="soft" block onClick={() => setStep('trait')}>回去改一改</P3Button><P3Button block onClick={() => { void match(); }}>重新匹配</P3Button></div> : undefined}>
      {step === 'description' && (
        <div>
          <MiniLabel en="FOR AI ONLY">告诉星象 · 只给 AI 参考</MiniLabel>
          <P3Field label={`你眼中的 ${targetName} 是怎样的人？`} count={`${desc.length} / 500`}><P3Textarea rows={5} maxLength={500} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="比如：跟我一起十年的朋友，会在我说不出话的夜里发一段没头没尾的语音……" /></P3Field>
          <p className="mt-2 text-[12px] leading-relaxed" style={{ color: P3R.grey }}>这段不会发给对方，只用来推荐塔罗。<br />对方看到的"留一句话"在结果页填。</p>
          {!aiConfigured && <p className="mt-2 px-3 py-2 text-[12px] font-bold" style={{ background: P3R.cyanFaint, color: P3R.inkSoft, clipPath: slantClip(6) }}>未配置 AI API，将使用离线模式进行匹配</p>}
        </div>
      )}
      {step === 'trait' && <TraitQuiz step={ts} answers={answers} onAnswer={answer} onPrev={() => setTs(ts - 1)} />}
      {step === 'matching' && <MatchingSpinner sub={`星象正在为 ${targetName} 翻动 22 张大阿卡纳`} />}
      {step === 'result' && (
        <div className="grid grid-cols-1 gap-3">
          <div className="flex min-w-0 items-center gap-4 px-4 py-3" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(14) }}>
            <Tarot arcanaId={matched.arcanaId} width={74} />
            <div className="min-w-0"><div className="font-heavy text-[clamp(20px,6vw,26px)]">《{card.name}》{matched.orientation === 'reversed' ? '逆位' : '正位'}</div><div className="mt-1 text-[13px] font-black">星象建议起点 Lv.{level} · {INTIMACY_LABELS[level]}</div></div>
          </div>
          <Panel tone="blush"><MiniLabel en="WHY">为什么是这张牌</MiniLabel><AIText ai={ai} className="text-[14px]" />{ai.phase === 'truncated' && <div className="mt-2"><P3Button size="sm" onClick={ai.resume}>接着写 ›</P3Button></div>}</Panel>
          {ai.phase === 'done' && <div className="px-5 py-3" style={{ background: 'var(--p3r-mulberry)', color: 'var(--p3r-cream)', clipPath: slantClip(12) }}><div className="mb-1 font-cond text-[12px] tracking-[0.18em]" style={{ color: 'var(--pk-petal-a)' }}>FUTURE · 未来</div><p className="text-[14px]">{matched.advice}</p></div>}
          <div><MiniLabel>起点羁绊（你最终决定）</MiniLabel><LevelGrid value={level} onChange={setLevel} /></div>
          <div>
            <MiniLabel>能力加成属性 · 默认来自塔罗花色</MiniLabel>
            <div className="flex flex-wrap gap-1.5">{ATTR_IDS.map((a) => <button key={a} type="button" aria-pressed={attr === a} onClick={() => setAttr(a)} className="px-3 py-1 text-[13px] font-black" style={{ clipPath: slantClip(6), background: attr === a ? P3R.blue : P3R.cyanFaint, color: attr === a ? P3R.onBlue : P3R.ink }}>{ATTR_NAMES[a]}</button>)}</div>
            <p className="mt-1.5 text-[11px]" style={{ color: P3R.grey }}>Lv2 日常加点、Lv7 战斗固伤、Lv10 SP 道具都会指向这个属性。</p>
          </div>
          <P3Field label="留一句话（给对方看，可选，≤ 200 字）" count={`${message.length} / 200`}><P3Textarea rows={3} maxLength={200} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={`想对 ${targetName} 说的话……`} /></P3Field>
          {(!aiConfigured || aiFail === 'offline' || matchResult?.source === 'offline') && <div className="text-center text-[12px]" style={{ color: P3R.grey }}>· 本次为离线匹配 ·</div>}
        </div>
      )}
      {step === 'error' && (
        <div className="py-10 text-center">
          <div className="mx-auto mb-3 w-fit px-4 py-1 font-cond text-[24px]" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(8) }}>NO MATCH</div>
          <p className="text-[15px] font-black" style={{ color: 'var(--p3r-coral-ink)' }}>未能找到合适的阿卡纳，请调整描述后再试</p>
          <p className="mt-1 text-[12px]" style={{ color: P3R.grey }}>{ai.error?.message}</p>
        </div>
      )}
    </P3Sheet>
  );
}

export default function CoopAiMatchModal({ open, onClose, params }: OverlayProps) {
  return <CoopAiMatchSheet isOpen={open} onClose={onClose} targetName="顺平" initialStep={(params?.get('step') as Step) || 'description'} aiConfigured={params?.get('ai') !== '0'} fail={params?.get('fail') as AIFail} />;
}
