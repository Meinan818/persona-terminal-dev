/**
 * 结识一位同伴（真实 ConfidantCreateModal）：basic → description → trait(4 问) → matching → result / error。
 * 路由 #/overlay/bond-create?step=basic|description|trait|matching|result|error
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Input, P4Sheet, P4Switch, P4Textarea, P4Outline } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { INTIMACY_LABELS, MAJOR_ARCANA_IDS, TAROT_BY_ID, TRAIT_QUESTIONS } from '@yellow/screens/pkg3/arcana';
import { LevelGrid, MatchingSpinner, MiniLabel, Sparkle, TarotCard, TraitQuiz } from '@yellow/screens/pkg3/ui';

type Stage = 'basic' | 'description' | 'trait' | 'matching' | 'result' | 'error';

export interface CreateResult { name: string; arcanaId: string; orientation: 'upright' | 'reversed'; level: number; description: string; decay: boolean }

export function ConfidantCreateSheet({ isOpen, onClose, onCreated, onPickOnline, initialStage = 'basic', remaining = 15, aiConfigured = false }: {
  isOpen: boolean; onClose: () => void; onCreated?: (r: CreateResult) => void; onPickOnline?: () => void; initialStage?: Stage; remaining?: number; aiConfigured?: boolean;
}) {
  const [stage, setStage] = useState<Stage>(initialStage);
  const [name, setName] = useState(initialStage === 'basic' ? '' : '花村');
  const [decay, setDecay] = useState(false);
  const [desc, setDesc] = useState(initialStage === 'basic' || initialStage === 'description' ? '' : '转学第一天就主动搭话的同学，嘴贫但很讲义气。');
  const [traitStep, setTraitStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(initialStage === 'error' ? '未能找到合适的阿卡纳，请调整描述后再试' : null);
  const [picked, setPicked] = useState(4);
  const match = { arcanaId: 'magician', orientation: 'upright' as 'upright' | 'reversed', initialIntimacy: 4, interpretation: '魔术师正位：他手里永远握着下一个点子。你们的关系靠「一起折腾」点燃——那些看似胡闹的计划，其实是他表达在乎的方式。', advice: '下次他提出离谱的点子，先说「好啊」，再一起想怎么让它成真。' };
  useEffect(() => { if (isOpen) { setStage(initialStage); setTraitStep(0); } }, [isOpen, initialStage]);
  useEffect(() => {
    if (stage !== 'matching') return;
    const t = window.setTimeout(() => setStage('result'), 1800);
    return () => clearTimeout(t);
  }, [stage]);

  const back = () => {
    if (stage === 'description') setStage('basic');
    else if (stage === 'trait' && traitStep > 0) setTraitStep(traitStep - 1);
    else if (stage === 'trait') setStage('description');
    else if (stage === 'result') setStage('trait');
  };
  const nextBasic = () => {
    if (!name.trim()) return setErr('请先告诉我 Ta 叫什么名字');
    if (remaining <= 0) return setErr('22 张大阿卡纳都已占用，请先归档一位同伴再添加');
    setErr(null); setStage('description');
  };
  const nextDesc = () => {
    if (desc.trim().length < 4) return setErr('请用至少几个字描述 Ta，让塔罗有内容可参考');
    setErr(null); setStage('trait'); setTraitStep(0);
  };
  const answer = (v: string) => {
    const a = [...answers]; a[traitStep] = v; setAnswers(a);
    if (traitStep < TRAIT_QUESTIONS.length - 1) window.setTimeout(() => setTraitStep(traitStep + 1), 160);
    else window.setTimeout(() => setStage('matching'), 200);
  };
  const title = stage === 'result' ? '塔罗的回响' : '结识一位同伴';
  const step = stage === 'basic' ? 0 : stage === 'description' ? 1 : stage === 'trait' ? 2 : 3;
  const card = TAROT_BY_ID[match.arcanaId];

  return (
    <P4Sheet open={isOpen} onClose={onClose} title={title} en="NEW S.LINK" size="tall" dismissible={stage !== 'matching'}
      footer={stage === 'basic' ? <P4Button block size="lg" onClick={nextBasic}>下一步</P4Button>
        : stage === 'description' ? <P4Button block size="lg" onClick={nextDesc}>下一步（还有 4 个小问题）</P4Button>
        : stage === 'result' ? (
          <div className="flex gap-3"><P4Button variant="secondary" block onClick={() => { setStage('trait'); setTraitStep(TRAIT_QUESTIONS.length - 1); }}>回去改一改</P4Button><P4Button block onClick={() => { onCreated?.({ name: name || '花村', arcanaId: match.arcanaId, orientation: match.orientation, level: picked, description: desc, decay }); onClose(); }}>就是 Ta 了</P4Button></div>
        ) : stage === 'error' ? <P4Button block variant="secondary" onClick={() => setStage('trait')}>返回修改</P4Button> : undefined}
    >
      <div className="mb-3 flex items-center gap-2">
        {(stage === 'description' || stage === 'trait' || stage === 'result') && (
          <button type="button" aria-label="返回上一步" onClick={back} className="p4g-press flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border-3 border-p4g-line bg-p4g-surface font-bold">‹</button>
        )}
        <div className="flex flex-1 gap-1" aria-hidden>{[0, 1, 2, 3].map((i) => <span key={i} className={cx('h-2 flex-1 -skew-x-12', i <= step ? 'bg-p4g-orange' : 'bg-[color:var(--p4g-line-soft)]')} />)}</div>
        <span className="shrink-0 rounded-[2px] bg-p4g-black px-2 py-0.5 p4g-num text-cap text-p4g-yellow">剩余阿卡纳：{remaining} / {MAJOR_ARCANA_IDS.length}</span>
      </div>

      {stage === 'basic' && (
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="p4g-press min-w-0 rounded-sm border-3 border-p4g-black bg-p4g-black p-3 text-left text-white shadow-[4px_4px_0_var(--p4g-orange)]">
              <div className="flex items-center gap-1.5 font-display text-body font-bold text-p4g-yellow"><Sparkle size={14} />离线同伴</div>
              <div className="mt-1 text-cap leading-snug text-white/80">本地塔罗匹配<br />身边的人 / 自己的关系</div>
            </button>
            <button type="button" onClick={onPickOnline} className="p4g-press min-w-0 rounded-sm border-3 border-p4g-line bg-p4g-surface p-3 text-left text-p4g-ink shadow-hard-sm">
              <div className="flex items-center gap-1.5 font-display text-body font-bold"><span className="text-p4g-success">✦</span>在线同伴</div>
              <div className="mt-1 text-cap leading-snug text-p4g-ink-soft">按 UserID 邀请<br />缔结双向羁绊</div>
            </button>
          </div>
          <P4Input label="Ta 的名字 / 称呼" placeholder="朋友、家人、老师、恋人……" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} error={err ?? undefined} />
          <div className="flex items-center gap-3 rounded-sm border-3 border-p4g-line bg-p4g-surface p-3">
            <div className="min-w-0 flex-1"><div className="font-display text-body font-bold">开启「逆流」模式</div><div className="text-cap text-p4g-ink-soft">连续 3 天无互动，亲密度每日 -1。</div></div>
            <P4Switch checked={decay} onChange={setDecay} aria-label="开启「逆流」模式" />
          </div>
          {!aiConfigured && <p className="rounded-sm border-2 border-dashed border-p4g-line px-3 py-2 text-cap text-p4g-ink-soft">未配置 AI API，将使用离线模式进行匹配</p>}
        </div>
      )}

      {stage === 'description' && (
        <div>
          <MiniLabel>告诉星象</MiniLabel>
          <P4Textarea label="你们的关系 / Ta 是什么样的人？" rows={6} maxLength={500} showCount value={desc} onChange={(e) => setDesc(e.target.value)} error={err ?? undefined}
            placeholder="比如：一起长大的朋友，总能包容我的不安；最近很忙，但只要我需要，Ta 都会接电话……" />
        </div>
      )}

      {stage === 'trait' && <TraitQuiz step={traitStep} answers={answers} onAnswer={answer} onPrev={() => setTraitStep(traitStep - 1)} />}
      {stage === 'matching' && <MatchingSpinner />}

      {stage === 'result' && (
        <div className="grid grid-cols-1 gap-4">
          <div className="flex min-w-0 items-center gap-4 rounded-sm border-3 border-p4g-black bg-p4g-yellow p-3 text-p4g-black">
            <TarotCard arcanaId={match.arcanaId} orientation={match.orientation} width={88} />
            <div className="min-w-0">
              <P4Outline size="clamp(22px,6vw,30px)" stroke={5} className="max-w-full">《{card?.name}》{match.orientation === 'reversed' ? '逆位' : '正位'}</P4Outline>
              <div className="mt-1 font-display text-meta font-bold">星象建议 Lv.{match.initialIntimacy} · {INTIMACY_LABELS[match.initialIntimacy]}</div>
            </div>
          </div>
          <div className="rounded-sm border-3 border-p4g-line bg-p4g-surface p-3">
            <div className="mb-2 flex items-center justify-between gap-2"><span className="font-display text-meta font-bold">当前亲密度（由你决定）</span><span className="p4g-num text-meta text-[color:var(--p4g-rank)]">Lv.{picked} · {INTIMACY_LABELS[picked]}</span></div>
            <LevelGrid value={picked} onChange={setPicked} />
            <p className="mt-2 text-2xs text-p4g-ink-soft">AI 只给参考，最终等级由你判断。不同等级会立即解锁对应的日常/战斗能力。</p>
          </div>
          <div className="rounded-sm border-3 border-p4g-line bg-p4g-surface-2 p-3"><MiniLabel>为什么是这张牌</MiniLabel><p className="text-body leading-relaxed">{match.interpretation}</p></div>
          <div className="rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] p-3 text-[color:var(--p4g-msg-ink)]"><div className="mb-1 font-display text-cap font-bold tracking-[0.18em] text-p4g-yellow">未来</div><p className="text-body leading-relaxed">{match.advice}</p></div>
          {!aiConfigured && <div className="text-center text-cap text-p4g-ink-soft">· 本次为离线匹配 ·</div>}
        </div>
      )}

      {stage === 'error' && (
        <div className="py-8 text-center">
          <div className="mx-auto mb-3 w-fit rounded-sm border-3 border-p4g-black bg-p4g-black px-3 py-1 font-display text-h3 font-bold italic text-p4g-yellow">NO MATCH</div>
          <p className="text-body font-bold text-p4g-danger">{err || '出了点问题'}</p>
        </div>
      )}
    </P4Sheet>
  );
}

export default function ConfidantCreateModal({ open, onClose, params }: OverlayProps) {
  const step = (params?.get('step') as Stage) || 'basic';
  return <ConfidantCreateSheet isOpen={open} onClose={onClose} initialStage={step} onPickOnline={() => { window.location.hash = '#/overlay/bond-add-online'; }} />;
}
