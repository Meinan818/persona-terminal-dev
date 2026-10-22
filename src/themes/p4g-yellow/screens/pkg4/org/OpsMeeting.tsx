/** 真实：src/components/org/OpsSection.tsx（作战）+ src/components/org/MeetingSection.tsx（周日会议） */
import { useState } from 'react';
import type { OrgOperation, OrgView } from '@real/types';
import { P4Button, P4Card, P4Input, P4Progress, P4Loading, useToast } from '@yellow/kit';
import { CollageStagger, CollageItem } from '@yellow/fx';
import { cx } from '@yellow/lib/cx';
import { navigate } from '@yellow/shell/shellBus';
import { ATTR_NAMES } from '@yellow/mock/pkg4-tarot';
import { OP_HISTORY, OP_KIND_LABEL, OP_STATE, OPS, RESULT_LABEL, POSTS } from '@yellow/mock/pkg4-org';
import { shiftKey, TODAY } from '@yellow/mock/pkg4-astro';
import { OpsDialogs, type OpsStep } from '@yellow/screens/overlays/OpsDialogs.p4g';
import { OpCreate } from '@yellow/screens/overlays/OpCreateSheet.p4g';
import { MeChip, displayCodename } from './common';

const md = (k: string) => `${Number(k.slice(5, 7))}月${Number(k.slice(8, 10))}日`;

export function OpsSection({ view, blocked, leader, state, onBlockToggle }: { view: OrgView; blocked: Set<string>; leader: boolean; state?: 'loading' | 'failed'; onBlockToggle: (uid: string) => void }) {
  const toast = useToast();
  const [ops, setOps] = useState<OrgOperation[]>(OPS);
  const [st, setSt] = useState(OP_STATE);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [dlgOp, setDlgOp] = useState<OrgOperation | null>(null);
  const [step, setStep] = useState<OpsStep>(null);
  if (state) return <P4Card tone="paper">{state === 'loading' ? <div className="flex items-center gap-3"><P4Loading size="sm" label="正在拉作战" /></div> : <div className="text-body font-bold text-p4g-ink-soft">作战暂时拉不到，稍后点右上角刷新再试。</div>}</P4Card>;
  const active = ops.filter((o) => o.status === 'active');
  return (
    <div className="space-y-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-display text-body font-bold text-[color:var(--p4g-on-stage)]">{active.length ? `进行中 ${active.length} 项` : '现在没有进行中的目标或作战'}</span>
        <P4Button size="sm" variant="black" onClick={() => setCreateOpen(true)}>＋ 发起</P4Button>
      </div>
      {!active.length && (
        <P4Card tone="paper" cut="br">
          <div className="font-display text-lead font-bold text-p4g-ink">一起做一件事</div>
          <ul className="mt-1.5 space-y-1 text-meta leading-relaxed text-p4g-ink-soft">
            <li>· <b className="text-p4g-ink">目标</b>：一句话 + 截止日，选几个人，谁都能发。</li>
            <li>· <b className="text-p4g-ink">作战</b>：一个作战目标，每人分一条子任务（可以让 AI 拆），只有队长能发。</li>
            <li>· 发出去之后，每个人的任务里会多一条；做完一次就算，全员做完就是达成：每人 +6 SP，公告板上出一张达成卡。</li>
          </ul>
        </P4Card>
      )}
      <CollageStagger className="space-y-3">
        {active.map((op) => (
          <CollageItem key={op.id}>
            <OpCard view={view} op={op} states={st[op.id] ?? {}} leader={leader}
              onWrite={(t) => { setSt((s) => ({ ...s, [op.id]: { ...s[op.id], [view.me.userId]: { ...s[op.id][view.me.userId], plan: t } } })); toast.success('写好了，任务里那条也跟着改了'); }}
              onOut={() => { setDlgOp(op); setStep('out'); }} onCancel={() => { setDlgOp(op); setStep('cancel'); }} onMore={op.initiatorId !== view.me.userId ? () => { setDlgOp(op); setStep('menu'); } : undefined} />
          </CollageItem>
        ))}
      </CollageStagger>
      <div>
        <button type="button" onClick={() => setHistoryOpen((v) => !v)} aria-expanded={historyOpen} className="flex w-full items-center justify-between py-1">
          <span className="font-display text-2xs font-bold tracking-[0.2em] text-[color:var(--p4g-on-stage)] opacity-80">最近 30 天结束的 {OP_HISTORY.length} 项</span>
          <span className="font-display text-meta font-bold text-[color:var(--p4g-on-stage)]">{historyOpen ? '收起' : '展开'}</span>
        </button>
        {historyOpen && (
          <div className="mt-1 space-y-1.5">
            {OP_HISTORY.map((h) => (
              <div key={h.id} className="flex min-w-0 items-center gap-2 border-3 border-p4g-line px-3 py-2" style={{ background: 'var(--p4g-surface-grad)' }}>
                <span className={cx('shrink-0 rounded-xs px-1.5 py-[2px] font-display text-2xs font-bold', h.status === 'achieved' ? 'bg-p4g-black text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black' : h.status === 'failed' ? 'bg-p4g-danger text-[color:var(--p4g-danger-ink)]' : 'border-thin border-p4g-line text-p4g-ink-soft')}>{h.status === 'achieved' ? '达成' : h.status === 'failed' ? '未达成' : '已取消'}</span>
                <span className="min-w-0 flex-1 truncate font-display text-body font-bold text-p4g-ink">{OP_KIND_LABEL[h.kind]} · {h.title}</span>
                <span className="shrink-0 text-2xs font-bold text-p4g-ink-soft">{h.done}/{Math.max(h.counted, h.done)} 人 · {md(h.day)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <OpCreate view={view} open={createOpen} onClose={() => setCreateOpen(false)} leader={leader} onDone={(m) => toast.success(m)} />
      <OpsDialogs op={dlgOp} step={step} onStep={setStep} blocked={!!dlgOp && blocked.has(dlgOp.initiatorId)} onClose={() => setStep(null)}
        onBlock={() => { if (!dlgOp) return; const on = blocked.has(dlgOp.initiatorId); onBlockToggle(dlgOp.initiatorId); toast(on ? '已解除屏蔽' : '已屏蔽，不再显示 Ta 的动态'); }}
        onReported={() => { setStep(null); toast.success('已举报，会在 2 天内处理'); }}
        onConfirm={(k) => {
          if (!dlgOp) return;
          if (k === 'out') { setSt((s) => ({ ...s, [dlgOp.id]: { ...s[dlgOp.id], [view.me.userId]: { state: 'out' } } })); toast('这次不参加了，任务里那条已经收起来'); }
          else { setOps((l) => l.map((o) => (o.id === dlgOp.id ? { ...o, status: 'cancelled' } : o))); toast(`${OP_KIND_LABEL[dlgOp.kind]}已取消`); }
        }} />
    </div>
  );
}

function OpCard({ view, op, states, leader, onWrite, onOut, onCancel, onMore }: { view: OrgView; op: OrgOperation; states: Record<string, { state: string; plan?: string }>; leader: boolean; onWrite: (t: string) => void; onOut: () => void; onCancel: () => void; onMore?: () => void }) {
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const big = op.kind === 'big';
  const initiator = view.members.find((m) => m.userId === op.initiatorId);
  const counted = op.participants.filter((u) => states[u]?.state !== 'out' && states[u]?.state !== 'gone').length;
  const done = op.participants.filter((u) => states[u]?.state === 'done').length;
  const mine = states[view.me.userId];
  const myTask = op.assignments[view.me.userId] || mine?.plan;
  const daysLeft = Math.round((Date.parse(op.deadline) - Date.parse(TODAY)) / 86400_000);
  const canCancel = op.initiatorId === view.me.userId || leader;
  const save = () => { setBusy(true); setTimeout(() => { setBusy(false); setWriting(false); onWrite(draft); }, 500); };
  return (
    <div className="relative min-w-0 overflow-hidden border-3 border-p4g-line shadow-hard" style={{ background: 'var(--p4g-surface-grad)' }}>
      <div className="flex min-w-0 items-center gap-2 bg-p4g-black px-3 py-1.5 text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black">
        <span className="shrink-0 font-display text-meta font-bold italic">{big ? 'OPERATION' : 'GOAL'}</span>
        <span className={cx('shrink-0 rounded-xs px-1.5 font-display text-2xs font-bold', daysLeft <= 1 ? 'bg-p4g-red text-white' : 'bg-p4g-yellow text-p4g-black night:bg-p4g-black night:text-p4g-yellow')}>{daysLeft <= 0 ? '今天截止' : daysLeft === 1 ? '明天截止' : `还剩 ${daysLeft} 天`}</span>
        <span className="ml-auto shrink-0 p4g-num-upright text-2xs font-bold">{md(op.deadline)}截止</span>
        {onMore && <button type="button" onClick={onMore} aria-label="更多操作" className="-mr-1 shrink-0 px-1.5 font-display text-h3 font-bold leading-none">⋯</button>}
      </div>
      <div className="px-3 py-2.5">
        <div className="font-display text-lead font-bold leading-snug text-p4g-ink">{big && <span className="mr-1 align-middle font-display text-meta font-bold text-p4g-tag night:text-p4g-orange">作战目标</span>}{op.title}</div>
        <div className="mt-0.5 text-2xs font-bold text-p4g-ink-soft">{initiator ? `${displayCodename(initiator)} 发起` : '发起人已离开'} · 练 {ATTR_NAMES[op.attr]}</div>
        <div className="mt-2 flex items-center gap-2"><P4Progress variant="segments" value={done} max={Math.max(counted, 1)} segments={Math.max(counted, 1)} className="min-w-0 flex-1" /><span className="shrink-0 font-display text-meta font-bold text-p4g-ink">{done} / {counted} 人做完</span></div>
        {mine && mine.state === 'todo' && (
          <div className="mt-2.5 rounded-sm border-thin border-dashed border-p4g-line bg-p4g-surface-2/70 px-2.5 py-2">
            {big && myTask && <div className="mb-1.5 text-meta font-bold text-p4g-ink">我负责的那一份：「{myTask}」</div>}
            {writing ? (
              <div className="space-y-2">
                <P4Input aria-label="我负责的那一份" placeholder="比如：整理第三章的笔记" value={draft} onChange={(e) => setDraft([...e.target.value].slice(0, 20).join(''))} />
                <div className="flex justify-end gap-2"><P4Button size="sm" variant="secondary" disabled={busy} onClick={() => setWriting(false)}>取消</P4Button><P4Button size="sm" disabled={busy || !draft.trim()} onClick={save}>{busy ? '保存中…' : '保存'}</P4Button></div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <P4Button size="sm" variant="black" onClick={() => navigate('actions', 'todos')}>去任务里完成</P4Button>
                {big && !op.assignments[view.me.userId] && <P4Button size="sm" variant="secondary" onClick={() => { setDraft(mine.plan ?? ''); setWriting(true); }}>{mine.plan ? '改写我的一份' : '写下我的一份'}</P4Button>}
              </div>
            )}
          </div>
        )}
        <ul className="mt-2.5 divide-y-2 divide-dashed divide-p4g-line/25">
          {op.participants.map((u) => {
            const m = view.members.find((x) => x.userId === u); const s = states[u]?.state ?? 'todo';
            const task = op.assignments[u] || states[u]?.plan;
            return (
              <li key={u} className="flex min-w-0 items-center gap-2 py-1.5">
                <span className="w-14 shrink-0 truncate font-display text-meta font-bold text-p4g-ink">{m ? displayCodename(m) : '已离开'}</span>
                {u === view.me.userId && <MeChip />}
                {big && <span className="min-w-0 flex-1 truncate text-2xs font-bold text-p4g-ink">{task ?? <span className="text-p4g-ink-soft">还没写自己那一份</span>}</span>}
                {!big && <span className="flex-1" />}
                <span className={cx('shrink-0 rounded-xs px-1.5 py-[1px] font-display text-2xs font-bold', s === 'done' ? 'bg-p4g-green text-p4g-black' : s === 'out' || s === 'gone' ? 'border-thin border-p4g-line text-p4g-ink-soft' : 'bg-p4g-orange text-p4g-black')}>{s === 'done' ? '✓ 做完了' : s === 'out' ? '不参加' : s === 'gone' ? '已离开' : '进行中'}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-1.5 flex flex-wrap justify-end gap-x-4 gap-y-1">
          {mine?.state === 'todo' && <button type="button" onClick={onOut} className="font-display text-meta font-bold text-p4g-ink-soft underline">这次不参加</button>}
          {canCancel && <button type="button" onClick={onCancel} className="font-display text-meta font-bold text-p4g-danger underline">取消{OP_KIND_LABEL[op.kind]}</button>}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── 周日会议 ─────────────────────────
type MeetMode = 'open' | 'submitted' | 'closed' | 'tomorrow' | 'empty';
export function MeetingSection({ view, mode: initMode }: { view: OrgView; mode: MeetMode }) {
  const toast = useToast();
  const mode = initMode;
  const days = mode === 'tomorrow' ? 1 : 5;
  const [editing, setEditing] = useState(initMode === 'open');
  const [result, setResult] = useState<'done' | 'partial' | 'missed' | null>(null);
  const [goal, setGoal] = useState('');
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<{ result: string; goal: string } | null>(initMode === 'submitted' ? { result: 'done', goal: '每天背 30 个单词' } : null);
  const open = mode === 'open' || mode === 'submitted';
  const wrote = !!mine;
  const wroteCount = 2 + (wrote ? 1 : 0);
  const submit = () => { setBusy(true); setTimeout(() => { setBusy(false); setMine({ result: result ?? 'done', goal }); setEditing(false); toast.success(wrote ? '改好了' : '交上去了，下周见'); }, 600); };
  const minutes = POSTS.find((p) => p.kind === 'minutes')!.minutes!;
  const others = view.members.filter((m) => m.userId !== view.me.userId && m.goal);
  return (
    <CollageStagger className="space-y-3">
      {open ? (
        <CollageItem>
          <P4Card tone="surface" cut="br">
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 animate-none rounded-xs bg-p4g-red px-1.5 py-0.5 font-display text-2xs font-bold text-white">开会中</span>
              <span className="min-w-0 flex-1 truncate font-display text-h3 font-bold text-p4g-ink">周日会议</span>
              <span className="shrink-0 text-2xs font-bold text-p4g-ink-soft">开到周一凌晨 4 点</span>
            </div>
            {wrote && !editing ? (
              <div className="mt-3">
                <div className="text-meta font-bold text-p4g-ink-soft">你已经交了</div>
                <div className="mt-1.5 text-body font-bold text-p4g-ink">这周的目标：<span className="text-p4g-tag night:text-p4g-yellow">{RESULT_LABEL[mine!.result as 'done']}</span></div>
                <div className="mt-1.5 font-display text-2xs font-bold tracking-wider text-p4g-ink-soft">下周目标</div>
                <div className="font-display text-lead font-bold text-p4g-ink">「{mine!.goal || '每天背 30 个单词'}」</div>
                <div className="mt-3"><P4Button size="sm" variant="secondary" onClick={() => { setGoal(mine!.goal); setEditing(true); }}>改一改</P4Button></div>
              </div>
            ) : (
              <div className="mt-3 space-y-4">
                <div>
                  <div className="text-body font-bold leading-relaxed text-p4g-ink">这周的目标<span className="font-display">「{view.me.goal}」</span>做到了吗？</div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(['done', 'partial', 'missed'] as const).map((r) => <button key={r} type="button" aria-pressed={result === r} onClick={() => setResult(r)} className={cx('p4g-press rounded-sm border-3 py-2 font-display text-body font-bold', result === r ? 'border-p4g-black bg-p4g-orange text-p4g-black shadow-hard-sm night:border-p4g-yellow' : 'border-p4g-line bg-p4g-surface-2 text-p4g-ink')}>{RESULT_LABEL[r]}</button>)}
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2"><span className="min-w-0 font-display text-body font-bold text-p4g-ink">下周想做到的一件事<span className="ml-1.5 whitespace-nowrap text-2xs text-p4g-ink-soft">{md(shiftKey(1))} 起</span></span></div>
                  <P4Input aria-label="下周目标" placeholder="比如：每天背 30 个单词" value={goal} onChange={(e) => setGoal([...e.target.value].slice(0, 20).join(''))} />
                </div>
                <div className="flex justify-end gap-2">
                  {wrote && <P4Button size="sm" variant="secondary" disabled={busy} onClick={() => setEditing(false)}>取消</P4Button>}
                  <P4Button size="sm" variant="black" disabled={busy || !goal.trim() || !result} onClick={submit}>{busy ? '提交中…' : wrote ? '保存' : '交上去'}</P4Button>
                </div>
                <p className="text-2xs font-bold leading-relaxed text-p4g-ink-soft">写好的目标组织里的人都能看到；会议结束后会出一份纪要，发到公告板上。</p>
              </div>
            )}
          </P4Card>
        </CollageItem>
      ) : (
        <CollageItem>
          <P4Card tone="black" cut="br">
            <div className="flex items-end gap-3">
              <div className="min-w-0 flex-1"><div className="font-display text-2xs font-bold uppercase tracking-[0.2em] text-p4g-yellow">NEXT MEETING</div><div className="mt-1 font-display text-h3 font-bold text-white">下一场：周日（{md(shiftKey(days))}）</div></div>
              <div className="shrink-0 text-center">{days > 1 && <div className="p4g-num text-mega leading-none text-p4g-yellow">{days}</div>}<div className="mt-0.5 text-2xs font-bold text-white/70">{days === 1 ? '明天就开' : '天后'}</div></div>
            </div>
            <p className="mt-2 text-meta leading-relaxed text-white/80">周日全天（到周一凌晨 4 点）来这里：给这周的目标打个分，再写一句下周目标。</p>
          </P4Card>
        </CollageItem>
      )}
      {open && (
        <CollageItem>
          <div className="border-3 border-p4g-line px-3 py-2.5" style={{ background: 'var(--p4g-surface-grad)' }}>
            <div className="flex items-center gap-2"><span className="font-display text-body font-bold text-p4g-ink">点名</span><span className="ml-auto p4g-num-upright text-2xs font-bold text-p4g-ink-soft">已写 {wroteCount} / {view.members.length}</span></div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {view.members.map((m, i) => { const did = i === 0 ? wrote : i < 3; return <span key={m.id} className={cx('rounded-xs px-1.5 py-0.5 font-display text-2xs font-bold', did ? 'bg-p4g-black text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black' : 'border-thin border-dashed border-p4g-line text-p4g-ink-soft')}>{did ? '✓ ' : ''}{displayCodename(m)}{i === 0 ? '（我）' : ''}</span>; })}
            </div>
          </div>
        </CollageItem>
      )}
      <CollageItem>
        <div className="border-3 border-p4g-line px-3 py-2.5" style={{ background: 'var(--p4g-surface-grad)' }}>
          <div className="font-display text-body font-bold text-p4g-ink">这周大家的目标</div>
          {mode === 'empty' ? <div className="mt-1.5 text-meta font-bold text-p4g-ink-soft">这周还没人立目标。周日会上写一句吧。</div> : (
            <>
              {view.me.goal && <div className="mt-2 rounded-sm bg-p4g-black px-2.5 py-1.5 text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black"><div className="font-display text-2xs font-bold tracking-wider opacity-80">我的</div><div className="font-display text-body font-bold">「{view.me.goal}」</div></div>}
              {others.length ? <ul className="mt-2 space-y-1">{others.map((m) => <li key={m.id} className="flex min-w-0 gap-2 text-meta"><span className="w-12 shrink-0 truncate font-display font-bold text-p4g-ink">{displayCodename(m)}</span><span className="min-w-0 text-p4g-ink">「{m.goal}」</span></li>)}</ul>
                : <div className="mt-2 text-meta font-bold text-p4g-ink-soft">其他人这周还没有目标。</div>}
            </>
          )}
        </div>
      </CollageItem>
      <CollageItem>
        <div className="mb-2 font-display text-2xs font-bold tracking-[0.2em] text-[color:var(--p4g-on-stage)] opacity-80">上一次的会议纪要</div>
        <div className="rounded-sm border-3 border-p4g-line bg-p4g-surface-2 px-3 py-2.5 text-meta text-p4g-ink">
          <div className="font-display font-bold">第 12 周 · <span className="p4g-num-upright">{minutes.rate.done}/{minutes.rate.total}</span> 人做到了</div>
          <div className="mt-1 text-2xs font-bold text-p4g-ink-soft">称号：{minutes.titles.map((t) => `${t.codename}·${t.title}`).join('、')} · 缺席：{minutes.absent.map((a) => a.codename).join('、')}</div>
        </div>
      </CollageItem>
    </CollageStagger>
  );
}
