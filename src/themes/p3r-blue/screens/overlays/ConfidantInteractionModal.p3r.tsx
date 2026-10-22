/**
 * 今日互动（真实 ConfidantInteractionModal）：input → thinking（AI 解读中）→ result（解读 + 建议加点，可调整）→ done / error。
 *   #/overlay/bond-interaction?stage=input|thinking|result|done|error   &today=1（今日已记录）&login=0（在线同伴未登录 → 通用模板）
 *   ?fail=error|midError|truncate|offline|nokey   AI 失败分支（出错重试 / 截断续写 / 离线兜底 / 未配密钥引导）
 * AI：thinking = useAIStream 思考约 2.4s（水晶球微光 + 三斜片）；result 的「解读」逐字输出（SKIP ›）；thinking 中锁死关闭（中断会失去今日唯一一次）。
 * 加点导致升级 → 交给调用方（同伴页）弹 RANK UP 演出链。
 */
import { useEffect, useState } from 'react';
import type { AttributeId, Confidant } from '@real/types';
import type { OverlayProps } from '@blue/registry/types';
import { P3Button, P3Field, P3OnOff, P3R, P3Sheet, P3Stepper, P3Textarea, slantClip, tickClip } from '@blue/kit';
import { AIText, AIThinking, useAIStream, type AIFail } from '@blue/fx';
import { navigate } from '@blue/shell/shellBus';
import { ATTR_IDS, ATTR_NAMES, INTIMACY_LABELS, MAX_INTIMACY, TAROT_BY_ID } from '@blue/screens/pkg3/arcana';
import { MiniLabel, Panel, Sparkle, Tarot } from '@blue/screens/pkg3/ui';
import { PK3_CONFIDANTS, PK3_INTERACTION_AI } from '@blue/mock/pkg3';

type Stage = 'input' | 'thinking' | 'result' | 'done' | 'error';
const DELTA_LABELS: Record<number, string> = { 0: '波澜未起', 1: '日常维系', 2: '稳稳升温', 3: '明显推进', 4: '深度共享', 5: '关键节点' };
const SAMPLE = '放学后一起去了长鸣神社的夏日祭，她把最后一个章鱼烧推给我，说下周比赛要我去加油。';

export function InteractionSheet({ isOpen, onClose, confidant, initialStage = 'input', alreadyToday = false, loggedIn = true, fail, onSaved }: {
  isOpen: boolean; onClose: () => void; confidant: Confidant; initialStage?: Stage; alreadyToday?: boolean; loggedIn?: boolean; fail?: AIFail; onSaved?: (delta: number) => void;
}) {
  const aiFail: AIFail = initialStage === 'error' && !fail ? 'error' : fail;
  const ai = useAIStream({ text: PK3_INTERACTION_AI.interpretation, fail: aiFail, initialPhase: initialStage === 'thinking' ? 'thinking' : initialStage === 'result' ? 'streaming' : initialStage === 'error' ? 'error' : initialStage === 'done' ? 'done' : 'idle', failAt: initialStage === 'result' ? 0.1 : 0.45 });
  const [stage, setStage] = useState<Stage>(initialStage);
  const [text, setText] = useState(initialStage === 'input' ? '' : SAMPLE);
  const [err, setErr] = useState<string | null>(null);
  const [sync, setSync] = useState(initialStage === 'done');
  const [attr, setAttr] = useState<AttributeId | null>(initialStage === 'done' ? 'charm' : null);
  const [pts, setPts] = useState(1);
  const [delta, setDelta] = useState(PK3_INTERACTION_AI.delta);
  const card = TAROT_BY_ID[confidant.arcanaId];
  const templateOnly = confidant.source === 'online' && !loggedIn;
  useEffect(() => { if (isOpen) setStage(initialStage); }, [isOpen, initialStage]);
  useEffect(() => {
    if (stage !== 'thinking') return;
    if (ai.phase === 'streaming' || ai.phase === 'done' || ai.phase === 'truncated') setStage('result');
    if (ai.phase === 'error' && ai.progress === 0) setStage('error');
    if (ai.phase === 'error' && ai.progress > 0) setStage('result');
    if (ai.phase === 'nokey') setStage('error');
  }, [ai.phase, stage]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = () => {
    if (text.trim().length < 4) { setErr('请再多描述一点，星象才能照见'); return; }
    setErr(null); setStage('thinking');
    if (templateOnly) { ai.skip(); return; }
    ai.start();
  };
  const offlineNote = aiFail === 'offline' || templateOnly;
  const errText = ai.phase === 'nokey' ? '尚未配置 AI 密钥' : ai.error?.code === 'offline' ? '当前离线，AI 暂时读不到这段互动' : 'AI 判断失败';

  return (
    <P3Sheet open={isOpen} onClose={onClose} title={`今日与 ${confidant.name} 的互动`} en="DAILY TALK" size="tall" busy={stage === 'thinking'}
      footer={stage === 'input' ? <P3Button block size="lg" corner disabled={alreadyToday} onClick={submit} leading={<Sparkle size={15} />}>解读这一段</P3Button>
        : stage === 'result' ? <div className="grid grid-cols-2 gap-3"><P3Button tone="soft" block onClick={() => { ai.abort(); setStage('input'); }}>修改描述</P3Button><P3Button block corner disabled={ai.phase === 'streaming'} onClick={() => { setStage('done'); onSaved?.(delta); }}>就这样记下</P3Button></div>
        : stage === 'done' ? <P3Button block size="lg" onClick={onClose}>好的</P3Button>
        : stage === 'error' ? (ai.phase === 'nokey'
          ? <div className="grid grid-cols-2 gap-3"><P3Button tone="soft" block onClick={() => setStage('input')}>返回</P3Button><P3Button block onClick={() => { onClose(); navigate('settings', undefined, { params: { group: 'ai' } }); }}>去配置密钥</P3Button></div>
          : <div className="grid grid-cols-2 gap-3"><P3Button tone="soft" block onClick={() => setStage('input')}>返回重试</P3Button><P3Button block onClick={() => { setStage('thinking'); ai.retry(); }}>再解读一次</P3Button></div>) : undefined}>
      <div className="mb-3 flex min-w-0 items-center gap-3">
        <Tarot arcanaId={confidant.arcanaId} reversed={confidant.orientation === 'reversed'} width={40} />
        <div className="min-w-0">
          <div className="truncate text-[13px] font-black" style={{ color: P3R.ink }}>《{card?.name}》{confidant.orientation === 'reversed' ? '逆位' : '正位'} · Lv.{confidant.intimacy}</div>
          <div className="font-cond text-[12px] tracking-wider" style={{ color: P3R.lilacInk }}>ONCE A DAY · 每日一次</div>
        </div>
        <div className="ml-auto flex shrink-0 gap-1" aria-hidden>{(['input', 'thinking', 'result', 'done'] as Stage[]).map((s, i) => <span key={s} className="h-[6px] w-5" style={{ clipPath: slantClip(3), background: ['input', 'thinking', 'result', 'done'].indexOf(stage === 'error' ? 'thinking' : stage) >= i ? P3R.blue : 'var(--p3r-track)' }} />)}</div>
      </div>
      {alreadyToday && stage === 'input' && <div className="mb-3 px-4 py-3 text-[13px] font-black" style={{ background: P3R.magenta, color: '#fff', clipPath: slantClip(10) }}>今天已经记录过和 Ta 的互动了。同一天反复加点容易失真，明天再来吧。</div>}
      {templateOnly && stage === 'input' && <div className="mb-3 px-4 py-3 text-[12px]" style={{ background: P3R.cyanFaint, color: P3R.inkSoft, clipPath: slantClip(10) }}>这是一位在线同伴 —— 需要登录云端后才能让 AI 读懂你们之间的互动。<span style={{ color: P3R.grey }}> 当前会退回到通用模板记录，不会调 AI。</span></div>}

      {stage === 'input' && (
        <div className="grid grid-cols-1 gap-3">
          <P3Field label="今天和 Ta 做了什么？发生了什么？" error={err ?? undefined} count={`${text.length} / 600`}>
            <P3Textarea rows={6} maxLength={600} value={text} onChange={(e) => setText(e.target.value)} disabled={alreadyToday} invalid={!!err}
              placeholder="可以很具体——一起吃了什么饭、聊了什么话题、Ta 说了一句让你印象深刻的话…… 也可以写下一次小小的矛盾。" />
          </P3Field>
          <Panel>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1"><div className="text-[14px] font-black">同步到「记录」（带「同伴」标签）</div><p className="text-[12px]" style={{ color: P3R.grey }}>会在记录列表里生成一条专属条目；可选择将这次相处经验换算为某一属性的加点（最多 +3）。</p></div>
              <P3OnOff value={sync} onChange={setSync} ariaLabel="同步到「记录」" />
            </div>
            {sync && (
              <div className="mt-3">
                <MiniLabel>选择加点属性（可不选）</MiniLabel>
                <div className="flex flex-wrap gap-1.5">{ATTR_IDS.map((a) => <button key={a} type="button" aria-pressed={attr === a} onClick={() => setAttr(attr === a ? null : a)} className="px-3 py-1 text-[13px] font-black" style={{ clipPath: slantClip(6), background: attr === a ? P3R.blue : P3R.cyanFaint, color: attr === a ? P3R.onBlue : P3R.ink }}>{ATTR_NAMES[a]}</button>)}</div>
                {attr && <div className="mt-2 flex items-center gap-2"><span className="text-[12px]" style={{ color: P3R.grey }}>加点</span><P3Stepper value={pts} min={1} max={3} onChange={setPts} /></div>}
              </div>
            )}
          </Panel>
        </div>
      )}

      {stage === 'thinking' && (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="relative mb-5 flex h-28 w-28 items-center justify-center">
            <span aria-hidden className="bk-glint absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgb(var(--p3r-cyan-rgb) / 0.55), rgb(var(--p3r-blue-rgb) / 0.18) 60%, transparent 72%)' }} />
            <span aria-hidden className="absolute inset-3 rounded-full" style={{ boxShadow: 'inset 0 0 0 3px var(--p3r-blue)' }} />
            <Sparkle size={40} className="pk3-twinkle relative" style={{ color: P3R.blue }} />
          </div>
          <AIThinking label="水晶球散发出了淡粉色的微光……" sub={`星象正在读你和 ${confidant.name} 的这一天`} ring={false} />
        </div>
      )}

      {stage === 'result' && (
        <div className="grid grid-cols-1 gap-3">
          <Panel>
            <MiniLabel en="READING">解读</MiniLabel>
            <AIText ai={ai} className="text-[14px]" />
            {ai.phase === 'truncated' && <div className="mt-2 flex items-center gap-2"><span className="text-[12px]" style={{ color: P3R.grey }}>{ai.error?.message}</span><P3Button size="sm" onClick={ai.resume}>接着写 ›</P3Button></div>}
            {ai.phase === 'error' && <div className="mt-2 flex items-center gap-2"><span className="text-[12px] font-bold" style={{ color: 'var(--p3r-coral-ink)' }}>{ai.error?.message}</span><P3Button size="sm" tone="danger" onClick={ai.retry}>重试</P3Button></div>}
            {ai.phase === 'aborted' && <div className="mt-2"><P3Button size="sm" onClick={ai.resume}>继续解读 ›</P3Button></div>}
          </Panel>
          {ai.phase === 'done' && (
            <div className="relative px-5 py-3" style={{ background: 'var(--p3r-mulberry)', color: 'var(--p3r-cream)', clipPath: slantClip(12) }}>
              <div className="mb-1 font-cond text-[12px] tracking-[0.18em]" style={{ color: 'var(--bk-bubble-a)' }}>FUTURE · 未来</div>
              <p className="text-[14px] leading-relaxed">{PK3_INTERACTION_AI.advice}</p>
            </div>
          )}
          <Panel>
            <div className="mb-3 flex min-w-0 items-baseline justify-between gap-2"><span className="text-[13px] font-black">建议加点（可调整）</span><span className="shrink-0 font-cond text-[15px]" style={{ color: P3R.roseInk }}>{confidant.intimacy < MAX_INTIMACY ? `+${delta} · ${DELTA_LABELS[delta]}` : '已达圆满'}</span></div>
            <div className="grid grid-cols-6 gap-1.5 pt-1">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-pressed={delta === n} onClick={() => setDelta(n)} className="relative h-11 min-w-0 font-cond text-[18px]"
                  style={{ clipPath: slantClip(6), background: delta === n ? P3R.ink : P3R.cyanFaint, color: delta === n ? 'var(--p3r-on-ink)' : P3R.ink }}>
                  +{n}{n === PK3_INTERACTION_AI.delta && <span aria-hidden className="absolute bottom-0 right-1 h-[5px] w-[10px]" style={{ background: P3R.magenta, clipPath: tickClip }} />}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[12px]" style={{ color: P3R.grey }}><span style={{ color: 'var(--p3r-coral-ink)' }}>◆</span> AI 推荐 +{PK3_INTERACTION_AI.delta} · {INTIMACY_LABELS[confidant.intimacy]}（当前）{confidant.intimacy < MAX_INTIMACY ? ` → Lv.${confidant.intimacy} + ${delta} 点` : ''}</p>
            {sync && <p className="mt-1 text-[11px]" style={{ color: P3R.grey }}>勾选后可选任一属性加 1–3 点，确认时会有音符弹起～</p>}
          </Panel>
          {offlineNote && <div className="text-center text-[11px]" style={{ color: P3R.grey }}>· 本次为离线评估 ·</div>}
        </div>
      )}

      {stage === 'done' && (
        <div className="flex flex-col items-center py-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center" style={{ background: P3R.blue, clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' }}><Sparkle size={30} style={{ color: P3R.onBlue }} /></span>
          <p className="mt-4 font-heavy text-[18px]" style={{ color: P3R.ink }}>今日的这一页被写进了你们的故事里</p>
          <p className="mt-1 font-cond text-[14px]" style={{ color: P3R.roseInk }}>亲密度 +{delta}</p>
          {sync && attr && <p className="mt-1 text-[13px] font-black" style={{ color: P3R.lilacInk }}>♪ {ATTR_NAMES[attr]} +{pts}</p>}
        </div>
      )}
      {stage === 'error' && (
        <div className="py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-14 items-center justify-center font-cond text-[26px]" style={{ background: P3R.magenta, color: '#fff', clipPath: slantClip(10) }}>!</div>
          <p className="text-[15px] font-black" style={{ color: P3R.ink }}>{errText}</p>
          <p className="mt-1 text-[12px]" style={{ color: P3R.grey }}>{ai.phase === 'nokey' ? '配置后 AI 才能读懂你们之间的互动；也可以先用通用模板记录。' : `${ai.error?.message ?? '解读服务暂时无法连接'} · 今日机会没有被消耗，描述也还在。`}</p>
        </div>
      )}
    </P3Sheet>
  );
}

export default function ConfidantInteractionModal({ open, onClose, params }: OverlayProps) {
  return <InteractionSheet isOpen={open} onClose={onClose} confidant={PK3_CONFIDANTS[0]} initialStage={(params?.get('stage') as Stage) || 'input'} alreadyToday={params?.get('today') === '1'} loggedIn={params?.get('login') !== '0'} fail={params?.get('fail') as AIFail} />;
}
