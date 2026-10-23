/**
 * 今日互动（真实 ConfidantInteractionModal）：input → thinking → result → done / error。
 * 路由 #/overlay/bond-interaction?stage=input|thinking|result|done|error&today=1&login=0
 */
import { useEffect, useState } from 'react';
import type { Confidant } from '@real/types';
import type { AttributeId } from '@real/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Sheet, P4Stepper, P4Switch, P4Textarea } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { ATTR_IDS, ATTR_NAMES, INTIMACY_LABELS, MAX_INTIMACY, TAROT_BY_ID } from '@yellow/screens/pkg3/arcana';
import { MiniLabel, Sparkle, TarotCard } from '@yellow/screens/pkg3/ui';
import { useCooperationData } from '@yellow/adapters/pkg3';
import { useAppStore, toLocalDateKey } from '@/store';
import { evaluateInteraction, type InteractionEvalResult } from '@/utils/confidantAI';

type Stage = 'input' | 'thinking' | 'result' | 'done' | 'error';
const DELTA_LABELS: Record<number, string> = { 0: '波澜未起', 1: '日常维系', 2: '稳稳升温', 3: '明显推进', 4: '深度共享', 5: '关键节点' };

export function InteractionSheet({ isOpen, onClose, confidant, initialStage = 'input', alreadyToday = false, loggedIn = true, onSaved }: {
  isOpen: boolean; onClose: () => void; confidant: Confidant; initialStage?: Stage; alreadyToday?: boolean; loggedIn?: boolean; onSaved?: (delta: number) => void;
}) {
  const { settings, cloudUser, confidantEvents } = useCooperationData();
  const recordConfidantInteraction = useAppStore((state) => state.recordConfidantInteraction);
  const [stage, setStage] = useState<Stage>(initialStage);
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [sync, setSync] = useState(false);
  const [attr, setAttr] = useState<AttributeId | null>(null);
  const [pts, setPts] = useState(1);
  const [delta, setDelta] = useState(1);
  const [reading, setReading] = useState('');
  const [advice, setAdvice] = useState('');
  const [evalResult, setEvalResult] = useState<InteractionEvalResult | null>(null);
  const card = TAROT_BY_ID[confidant.arcanaId];
  const interactedToday = alreadyToday || confidant.lastInteractionDate === toLocalDateKey();
  useEffect(() => { if (isOpen) { setStage(initialStage); setText(''); setErr(null); setReading(''); setAdvice(''); setEvalResult(null); setDelta(1); } }, [isOpen, initialStage]);
  const submit = () => {
    if (text.trim().length < 4) { setErr('请再多描述一点，星象才能照见'); return; }
    setErr(null); setStage('thinking');
    const recentUserInputs = confidantEvents
      .filter((event) => event.confidantId === confidant.id && event.type === 'conversation' && typeof event.userInput === 'string' && event.userInput.trim())
      .slice(0, 2)
      .map((event) => ({ date: event.date, text: String(event.userInput).trim() }));
    void evaluateInteraction({
      settings,
      confidantName: confidant.name,
      arcanaName: card?.name ?? '塔罗',
      orientation: confidant.orientation,
      currentLevel: confidant.intimacy,
      description: text.trim(),
      relationshipSummary: confidant.description,
      recentUserInputs,
    }, undefined, confidant.source !== 'online' || !!cloudUser).then((result) => {
      setEvalResult(result);
      setReading(result.narrative);
      setAdvice(result.advice);
      setDelta(result.delta);
      setStage('result');
    }).catch(() => { setErr('解读失败，请稍后再试'); setStage('error'); });
  };
  const save = () => {
    if (!evalResult) return;
    setErr(null);
    void recordConfidantInteraction({
      id: confidant.id,
      description: text.trim(),
      delta,
      narrative: evalResult.narrative,
      advice: evalResult.advice,
      createActivity: sync,
      activityAttribute: sync && attr ? attr : undefined,
      activityPoints: sync && attr ? pts : 0,
    }).then(() => {
      setStage('done');
      onSaved?.(delta);
    }).catch((error) => {
      setErr(error instanceof Error ? error.message : '保存失败');
      setStage('error');
    });
  };

  return (
    <P4Sheet open={isOpen} onClose={() => stage !== 'thinking' && onClose()} title={`今日与 ${confidant.name} 的互动`} en="DAILY TALK" size="tall"
      footer={stage === 'input' ? <P4Button block size="lg" disabled={interactedToday} onClick={submit} leading={<Sparkle size={16} />}>解读这一段</P4Button>
        : stage === 'result' ? <div className="flex gap-3"><P4Button variant="secondary" block onClick={() => setStage('input')}>修改描述</P4Button><P4Button block onClick={save}>就这样记下</P4Button></div>
        : stage === 'done' ? <P4Button block onClick={onClose}>好的</P4Button>
        : stage === 'error' ? <P4Button block variant="secondary" onClick={() => setStage('input')}>返回重试</P4Button> : undefined}>
      <div className="mb-3 flex items-center gap-3">
        <TarotCard arcanaId={confidant.arcanaId} orientation={confidant.orientation} width={40} labels={false} />
        <div className="min-w-0 text-meta text-p4g-ink-soft">《{card?.name}》{confidant.orientation === 'reversed' ? '逆位' : '正位'} · Lv.{confidant.intimacy} · 每日一次</div>
      </div>

      {interactedToday && stage === 'input' && <div className="mb-3 rounded-sm border-3 border-p4g-black bg-p4g-orange p-3 text-meta font-bold text-p4g-black">今天已经记录过和 Ta 的互动了。同一天反复加点容易失真，明天再来吧。</div>}
      {confidant.source === 'online' && !loggedIn && stage === 'input' && (
        <div className="mb-3 rounded-sm border-2 border-dashed border-p4g-line p-3 text-meta text-p4g-ink-soft">这是一位在线同伴 —— 需要登录云端后才能让 AI 读懂你们之间的互动。<span className="opacity-70"> 当前会退回到通用模板记录，不会调 AI。</span></div>
      )}

      {stage === 'input' && (
        <div className="grid grid-cols-1 gap-3">
          <P4Textarea label="今天和 Ta 做了什么？发生了什么？" rows={6} maxLength={600} showCount value={text} onChange={(e) => setText(e.target.value)} error={err ?? undefined} disabled={interactedToday}
            placeholder="可以很具体——一起吃了什么饭、聊了什么话题、Ta 说了一句让你印象深刻的话…… 也可以写下一次小小的矛盾。" />
          <div className="rounded-sm border-3 border-p4g-line bg-p4g-surface p-3">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1"><div className="font-display text-body font-bold">同步到「记录」（带「同伴」标签）</div><p className="text-cap text-p4g-ink-soft">会在记录列表里生成一条专属条目；可选择将这次相处经验换算为某一属性的加点（最多 +3）。</p></div>
              <P4Switch checked={sync} onChange={setSync} aria-label="同步到「记录」" />
            </div>
            {sync && (
              <div className="mt-3">
                <MiniLabel>选择加点属性（可不选）</MiniLabel>
                <div className="flex flex-wrap gap-1.5">{ATTR_IDS.map((a) => <button key={a} type="button" onClick={() => setAttr(attr === a ? null : a)} className={cx('rounded-full border-2 px-3 py-1 font-display text-meta font-bold', attr === a ? 'border-p4g-black bg-p4g-orange text-p4g-black' : 'border-p4g-line bg-p4g-surface-2')}>{ATTR_NAMES[a]}</button>)}</div>
                {attr && <div className="mt-2 flex items-center gap-2"><span className="text-2xs text-p4g-ink-soft">加点</span><P4Stepper value={pts} min={1} max={3} onChange={setPts} /></div>}
              </div>
            )}
          </div>
        </div>
      )}

      {stage === 'thinking' && (
        <div className="flex flex-col items-center py-10 text-center">
          <div className="relative mb-4 flex h-24 w-24 items-center justify-center rounded-full border-[4px] border-p4g-black bg-p4g-cyan/40">
            <span className="pk3-twinkle text-h1 text-white">✧</span>
          </div>
          <p className="font-display text-body font-bold">水晶球散发出了淡蓝色的微光……</p>
        </div>
      )}

      {stage === 'result' && (
        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-sm border-3 border-p4g-line bg-p4g-surface p-3"><MiniLabel>解读</MiniLabel><p className="text-body">{reading}</p></div>
          <div className="rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] p-3 text-[color:var(--p4g-msg-ink)]"><div className="mb-1 font-display text-cap font-bold tracking-[0.18em] text-p4g-yellow">未来</div><p className="text-body">{advice}</p></div>
          <div className="rounded-sm border-3 border-p4g-line bg-p4g-surface p-3">
            <div className="mb-2 flex items-baseline justify-between gap-2"><span className="font-display text-meta font-bold">建议加点（可调整）</span><span className="text-meta font-bold text-[color:var(--p4g-rank)]">{confidant.intimacy < MAX_INTIMACY ? `+${delta} · ${DELTA_LABELS[delta]}` : '已达圆满'}</span></div>
            <div className="grid grid-cols-6 gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setDelta(n)} className={cx('relative h-11 min-w-0 rounded-[2px] border-2 p4g-num text-lead', delta === n ? 'border-p4g-black bg-p4g-black text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black' : 'border-p4g-line bg-p4g-surface-2')}>
                  +{n}{n === evalResult?.delta && <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[2px] bg-p4g-orange px-1 font-display text-[9px] not-italic leading-tight text-p4g-black">AI 荐</span>}
                </button>
              ))}
            </div>
            <p className="mt-2 text-cap text-p4g-ink-soft">{INTIMACY_LABELS[confidant.intimacy]}（当前）{confidant.intimacy < MAX_INTIMACY ? ` → Lv.${confidant.intimacy} + ${delta} 点` : ''}</p>
            {sync && <p className="mt-1 text-2xs text-p4g-ink-soft">勾选后可选任一属性加 1–3 点，确认时会有音符弹起～</p>}
          </div>
          <div className="text-center text-2xs text-p4g-ink-soft">{evalResult?.source === 'offline' ? '· 本次为离线评估 ·' : ''}</div>
        </div>
      )}

      {stage === 'done' && (
        <div className="flex flex-col items-center py-10 text-center">
          <Sparkle size={48} className="pk3-twinkle text-p4g-orange" />
          <p className="mt-3 font-display text-lead font-bold">今日的这一页被写进了你们的故事里</p>
          {sync && attr && <p className="mt-1 text-meta text-p4g-ink-soft">♪ {ATTR_NAMES[attr]} +{pts}</p>}
        </div>
      )}
      {stage === 'error' && <div className="py-10 text-center"><p className="text-body text-p4g-danger">{err || '出了点问题'}</p></div>}
    </P4Sheet>
  );
}

export default function ConfidantInteractionModal({ open, onClose, params }: OverlayProps) {
  const { confidants } = useCooperationData();
  const confidant = confidants.find((item) => item.id === params?.get('id')) ?? confidants[0];
  if (!confidant) return <P4Sheet open={open} onClose={onClose} title="今日互动" en="DAILY TALK"><div className="py-8 text-center text-meta text-p4g-ink-soft">还没有可以互动的同伴。</div></P4Sheet>;
  return <InteractionSheet isOpen={open} onClose={onClose} confidant={confidant} initialStage={(params?.get('stage') as Stage) || 'input'} alreadyToday={params?.get('today') === '1'} loggedIn={params?.get('login') !== '0'} />;
}
