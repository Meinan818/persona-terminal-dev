/**
 * 星象匹配（真实 CoopAiMatchModal）：description → trait(4 问) → matching → result / error。
 * #/overlay/bond-coop-ai-match?step=description|trait|matching|result|error&ai=0
 */
import { useEffect, useState } from 'react';
import type { AttributeId } from '@/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Outline, P4Sheet, P4Textarea } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { ATTR_IDS, ATTR_NAMES, INTIMACY_LABELS, TAROT_BY_ID, TRAIT_QUESTIONS } from '@yellow/screens/pkg3/arcana';
import { LevelGrid, MatchingSpinner, MiniLabel, TarotCard, TraitQuiz } from '@yellow/screens/pkg3/ui';

type Step = 'description' | 'trait' | 'matching' | 'result' | 'error';
export interface AiMatchResult { arcanaId: string; orientation: 'upright' | 'reversed'; level: number; attr: AttributeId; message: string }

export function CoopAiMatchSheet({ isOpen, onClose, targetName, onConfirm, initialStep = 'description', aiConfigured = true }: { isOpen: boolean; onClose: () => void; targetName: string; onConfirm?: (r: AiMatchResult) => void; initialStep?: Step; aiConfigured?: boolean }) {
  const [step, setStep] = useState<Step>(initialStep);
  const [desc, setDesc] = useState(initialStep === 'description' ? '' : '一起搞过很多荒唐计划的损友，关键时刻从不掉链子。');
  const [ts, setTs] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const m = { arcanaId: 'magician', orientation: 'upright' as 'upright' | 'reversed', initialIntimacy: 3, interpretation: '魔术师：他总能把手边的东西变成一场冒险。你们之间的能量来自「一起动手」。', advice: '把下一次的胡闹，变成一次真正完成的小项目。' };
  const [level, setLevel] = useState(m.initialIntimacy);
  const [attr, setAttr] = useState<AttributeId>(TAROT_BY_ID[m.arcanaId].attr);
  const [message, setMessage] = useState('');
  useEffect(() => { if (isOpen) { setStep(initialStep); setTs(0); } }, [isOpen, initialStep]);
  useEffect(() => { if (step !== 'matching') return; const t = window.setTimeout(() => setStep('result'), 1700); return () => clearTimeout(t); }, [step]);
  const valid = desc.trim().length >= 4;
  const answer = (v: string) => { const a = [...answers]; a[ts] = v; setAnswers(a); if (ts < TRAIT_QUESTIONS.length - 1) window.setTimeout(() => setTs(ts + 1), 160); else window.setTimeout(() => setStep('matching'), 200); };
  const card = TAROT_BY_ID[m.arcanaId];
  return (
    <P4Sheet open={isOpen} onClose={onClose} title={`星象为 ${targetName} 推演一张塔罗`} en="✨ STAR MATCH · 星象匹配" size="tall" dismissible={step !== 'matching'}
      footer={step === 'description' ? <P4Button block size="lg" disabled={!valid} onClick={() => { setStep('trait'); setTs(0); }}>{valid ? '下一步（4 个小问题）' : '至少几个字，让塔罗有内容可参考'}</P4Button>
        : step === 'result' ? <div className="grid grid-cols-3 gap-2"><P4Button size="sm" variant="secondary" onClick={() => { setStep('trait'); setTs(TRAIT_QUESTIONS.length - 1); }}>回去改一改</P4Button><P4Button size="sm" variant="secondary" onClick={() => setStep('matching')}>重新匹配</P4Button><P4Button size="sm" onClick={() => { onConfirm?.({ arcanaId: m.arcanaId, orientation: m.orientation, level, attr, message }); onClose(); }}>就用这份 ✨</P4Button></div>
        : step === 'error' ? <P4Button block variant="secondary" onClick={() => setStep('trait')}>回去改一改</P4Button> : undefined}>
      {step === 'description' && (
        <div>
          <MiniLabel>告诉星象 · 只给 AI 参考</MiniLabel>
          <P4Textarea label={`你眼中的 ${targetName} 是怎样的人？`} rows={5} maxLength={500} showCount value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="比如：跟我一起十年的朋友，会在我说不出话的夜里发一段没头没尾的语音……" />
          <p className="mt-2 text-cap text-p4g-ink-soft">这段不会发给对方，只用来推荐塔罗。<br />对方看到的"留一句话"在结果页填。</p>
          {!aiConfigured && <p className="mt-2 rounded-sm border-2 border-dashed border-p4g-line px-3 py-2 text-cap text-p4g-ink-soft">未配置 AI API，将使用离线模式进行匹配</p>}
        </div>
      )}
      {step === 'trait' && <TraitQuiz step={ts} answers={answers} onAnswer={answer} onPrev={() => setTs(ts - 1)} />}
      {step === 'matching' && <MatchingSpinner />}
      {step === 'result' && (
        <div className="grid grid-cols-1 gap-3">
          <div className="flex min-w-0 items-center gap-4 rounded-sm border-3 border-p4g-black bg-p4g-yellow p-3 text-p4g-black">
            <TarotCard arcanaId={m.arcanaId} orientation={m.orientation} width={80} />
            <div className="min-w-0"><P4Outline size="clamp(20px,6vw,28px)" stroke={5}>《{card.name}》{m.orientation === 'reversed' ? '逆位' : '正位'}</P4Outline><div className="mt-1 font-display text-meta font-bold">星象建议起点 Lv.{m.initialIntimacy} · {INTIMACY_LABELS[m.initialIntimacy]}</div></div>
          </div>
          <div className="rounded-sm border-3 border-p4g-line bg-p4g-surface-2 p-3"><MiniLabel>为什么是这张牌</MiniLabel><p className="text-body">{m.interpretation}</p></div>
          <div className="rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] p-3 text-[color:var(--p4g-msg-ink)]"><div className="mb-1 font-display text-cap font-bold tracking-[0.18em] text-p4g-yellow">未来</div><p className="text-body">{m.advice}</p></div>
          <div><MiniLabel>起点羁绊（你最终决定）</MiniLabel><LevelGrid value={level} onChange={setLevel} /></div>
          <div>
            <MiniLabel>能力加成属性 <span className="normal-case tracking-normal opacity-70">· 默认来自塔罗花色</span></MiniLabel>
            <div className="flex flex-wrap gap-1.5">{ATTR_IDS.map((a) => <button key={a} type="button" onClick={() => setAttr(a)} className={cx('rounded-full border-2 px-3 py-1 font-display text-meta font-bold', attr === a ? 'border-p4g-black bg-p4g-orange text-p4g-black' : 'border-p4g-line bg-p4g-surface-2')}>{ATTR_NAMES[a]}</button>)}</div>
            <p className="mt-1.5 text-2xs text-p4g-ink-soft">Lv2 日常加点、Lv7 战斗固伤、Lv10 SP 道具都会指向这个属性。</p>
          </div>
          <P4Textarea label="留一句话（给对方看，可选，≤ 200 字）" rows={3} maxLength={200} showCount value={message} onChange={(e) => setMessage(e.target.value)} placeholder={`想对 ${targetName} 说的话……`} />
          {!aiConfigured && <div className="text-center text-cap text-p4g-ink-soft">· 本次为离线匹配 ·</div>}
        </div>
      )}
      {step === 'error' && <div className="py-10 text-center text-body font-bold text-p4g-danger">未能找到合适的阿卡纳，请调整描述后再试</div>}
    </P4Sheet>
  );
}

export default function CoopAiMatchModal({ open, onClose, params }: OverlayProps) {
  return <CoopAiMatchSheet isOpen={open} onClose={onClose} targetName="阿介" initialStep={(params?.get('step') as Step) || 'description'} aiConfigured={params?.get('ai') !== '0'} />;
}
