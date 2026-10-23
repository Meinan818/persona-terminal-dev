/** 真实：src/components/org/OpsSection.tsx（作战）+ src/components/org/MeetingSection.tsx（周日会议），蓝白 p3 皮 */
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { OrgOperation, OrgView } from '@real/types';
import { P3R, P3Button, P3Input, P3Progress, P3Loading, P3Error, slantClip, useToast } from '@blue/kit';
import { useLowMotion } from '@blue/lib/prefs';
import { navigate } from '@blue/shell/shellBus';
import { ATTR_NAMES } from '@blue/mock/pkg4-tarot';
import { OP_KIND_LABEL, RESULT_LABEL } from '@blue/mock/pkg4-org';
import { shiftKey, TODAY } from '@blue/adapters/pkg4-astro';
import { activeOrgOps, buildOrgOpsState, endedOrgOps } from '@/themes/orgData';
import { cancelOperation, createCheckin, saveMeeting } from '@/services/orgs';
import { weekRangeOf } from '@/utils/questBoard';
import { OpsDialogs, type OpsStep } from '@blue/screens/overlays/OpsDialogs.p3r';
import { OpCreate } from '@blue/screens/overlays/OpCreateSheet.p3r';
import { MeChip, displayCodename, panel } from './common';

const md = (k: string) => `${Number(k.slice(5, 7))}月${Number(k.slice(8, 10))}日`;
const stag = (low: boolean) => (i: number) => ({ initial: low ? { opacity: 0 } : { opacity: 0, x: -18 }, animate: { opacity: 1, x: 0 }, transition: { delay: low ? 0 : i * 0.05, duration: 0.24 } });

export function OpsSection({ view, blocked, leader, state, onBlockToggle }: { view: OrgView; blocked: Set<string>; leader: boolean; state?: 'loading' | 'failed'; onBlockToggle: (uid: string) => void }) {
  const toast = useToast();
  const low = useLowMotion();
  const item = stag(low);
  const [ops, setOps] = useState<OrgOperation[]>(() => activeOrgOps(view));
  const [st, setSt] = useState(() => buildOrgOpsState(view));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [dlgOp, setDlgOp] = useState<OrgOperation | null>(null);
  const [step, setStep] = useState<OpsStep>(null);
  const history = endedOrgOps(view, TODAY);
  useEffect(() => { setOps(activeOrgOps(view)); setSt(buildOrgOpsState(view)); }, [view]);
  if (state === 'loading') return <P3Loading text="正在拉作战…" />;
  if (state === 'failed') return <P3Error title="作战暂时拉不到" text="作战暂时拉不到，稍后点右上角刷新再试。" />;
  const active = ops.filter((o) => o.status === 'active');
  return (
    <div className="space-y-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[14px] font-black" style={{ color: P3R.ink }}>{active.length ? <>进行中 <span className="font-cond text-[18px]" style={{ color: P3R.blue }}>{active.length}</span> 项</> : '现在没有进行中的目标或作战'}</span>
        <P3Button size="sm" corner onClick={() => setCreateOpen(true)}>＋ 发起</P3Button>
      </div>
      {!active.length && (
        <div className="px-5 py-4" style={panel(14)}>
          <div className="font-heavy text-[16px]" style={{ color: P3R.ink }}>一起做一件事</div>
          <ul className="mt-1.5 space-y-1 text-[12.5px] leading-relaxed" style={{ color: P3R.inkSoft }}>
            <li>· <b style={{ color: P3R.ink }}>目标</b>：一句话 + 截止日，选几个人，谁都能发。</li>
            <li>· <b style={{ color: P3R.ink }}>作战</b>：一个作战目标，每人分一条子任务（可以让 AI 拆），只有队长能发。</li>
            <li>· 发出去之后，每个人的任务里会多一条；做完一次就算，全员做完就是达成：每人 +6 SP，公告板上出一张达成卡。</li>
          </ul>
        </div>
      )}
      <div className="space-y-3">
        {active.map((op, i) => (
          <motion.div key={op.id} {...item(i)}>
            <OpCard view={view} op={op} states={st[op.id] ?? {}} leader={leader}
              onWrite={(t) => { void createCheckin(op, 'plan', { text: t }).then(() => { setSt((s) => ({ ...s, [op.id]: { ...s[op.id], [view.me.userId]: { ...s[op.id][view.me.userId], plan: t } } })); toast.success('写好了，任务里那条也跟着改了'); }).catch((error) => toast(error instanceof Error ? error.message : '没写进去，请重试')); }}
              onOut={() => { setDlgOp(op); setStep('out'); }} onCancel={() => { setDlgOp(op); setStep('cancel'); }} onMore={op.initiatorId !== view.me.userId ? () => { setDlgOp(op); setStep('menu'); } : undefined} />
          </motion.div>
        ))}
      </div>
      <div>
        <button type="button" onClick={() => setHistoryOpen((v) => !v)} aria-expanded={historyOpen} className="flex w-full items-center justify-between py-1">
          <span className="text-[11px] font-black tracking-[0.12em]" style={{ color: P3R.grey }}>最近 30 天结束的 {history.length} 项</span>
          <span className="text-[12px] font-black" style={{ color: P3R.roseInk }}>{historyOpen ? '收起' : '展开'}</span>
        </button>
        {historyOpen && (
          <div className="mt-1 space-y-1.5">
            {history.map((h) => (
              <div key={h.id} className="flex min-w-0 items-center gap-2 px-4 py-2" style={{ background: 'var(--p3r-row)', clipPath: slantClip(10) }}>
                <span className="shrink-0 px-1.5 py-[2px] text-[10px] font-black" style={h.status === 'achieved' ? { background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(3) } : h.status === 'failed' ? { background: P3R.magenta, color: '#fff', clipPath: slantClip(3) } : { color: P3R.grey, boxShadow: 'inset 0 0 0 1px var(--p3r-track)' }}>{h.status === 'achieved' ? '达成' : h.status === 'failed' ? '未达成' : '已取消'}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-black" style={{ color: P3R.ink }}>{OP_KIND_LABEL[h.kind]} · {h.title}</span>
                <span className="shrink-0 text-[10.5px] font-bold" style={{ color: P3R.grey }}>{h.done}/{Math.max(h.counted, h.done)} 人 · {md(h.day)}</span>
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
          if (k === 'out') { void createCheckin(dlgOp, 'out').then(() => { setSt((s) => ({ ...s, [dlgOp.id]: { ...s[dlgOp.id], [view.me.userId]: { state: 'out' } } })); toast('这次不参加了，任务里那条已经收起来'); }).catch(() => toast('没退出成功，请重试')); }
          else { void cancelOperation(dlgOp.id).then(() => { setOps((l) => l.map((o) => (o.id === dlgOp.id ? { ...o, status: 'cancelled' } : o))); toast(`${OP_KIND_LABEL[dlgOp.kind]}已取消`); }).catch(() => toast('取消失败，请重试')); }
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
  const save = () => { setBusy(true); window.setTimeout(() => { setBusy(false); setWriting(false); onWrite(draft); }, 500); };
  return (
    <div className="relative min-w-0 overflow-hidden" style={panel(16)}>
      <div className="flex min-w-0 items-center gap-2 px-5 py-1.5" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)' }}>
        <span className="shrink-0 font-cond text-[14px]" style={{ color: P3R.blue }}>{big ? 'OPERATION' : 'GOAL'}</span>
        <span className="shrink-0 px-1.5 text-[10px] font-black" style={{ background: daysLeft <= 1 ? P3R.magenta : 'rgba(255,255,255,0.16)', color: daysLeft <= 1 ? '#fff' : 'var(--p3r-on-ink)', clipPath: slantClip(3) }}>{daysLeft <= 0 ? '今天截止' : daysLeft === 1 ? '明天截止' : `还剩 ${daysLeft} 天`}</span>
        <span className="ml-auto shrink-0 text-[10.5px] font-bold">{md(op.deadline)}截止</span>
        {onMore && <button type="button" onClick={onMore} aria-label="更多操作" className="-mr-1 shrink-0 px-1.5 text-[18px] font-black leading-none">⋯</button>}
      </div>
      <div className="px-5 py-3">
        <div className="text-[16px] font-black leading-snug" style={{ color: P3R.ink }}>{big && <span className="mr-1 align-middle text-[12px] font-black" style={{ color: P3R.roseInk }}>作战目标</span>}{op.title}</div>
        <div className="mt-0.5 text-[11px] font-bold" style={{ color: P3R.grey }}>{initiator ? `${displayCodename(initiator)} 发起` : '发起人已离开'} · 练 {ATTR_NAMES[op.attr]}</div>
        <div className="mt-2 flex items-center gap-2"><P3Progress variant="segments" value={done} max={Math.max(counted, 1)} className="min-w-0 flex-1" /><span className="shrink-0 text-[12px] font-black" style={{ color: P3R.ink }}>{done} / {counted} 人做完</span></div>
        {mine && mine.state === 'todo' && (
          <div className="mt-2.5 px-3 py-2" style={{ background: 'var(--p3r-cyan-pale)', clipPath: slantClip(8) }}>
            {big && myTask && <div className="mb-1.5 text-[12.5px] font-bold" style={{ color: P3R.ink }}>我负责的那一份：「{myTask}」</div>}
            {writing ? (
              <div className="space-y-2">
                <P3Input aria-label="我负责的那一份" placeholder="比如：整理第三章的笔记" value={draft} onChange={(e) => setDraft([...e.target.value].slice(0, 20).join(''))} />
                <div className="flex justify-end gap-2"><P3Button size="sm" tone="ghost" disabled={busy} onClick={() => setWriting(false)}>取消</P3Button><P3Button size="sm" busy={busy} busyText="保存中…" disabled={!draft.trim()} onClick={save}>保存</P3Button></div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <P3Button size="sm" onClick={() => navigate('actions', 'todos')}>去任务里完成</P3Button>
                {big && !op.assignments[view.me.userId] && <P3Button size="sm" tone="soft" onClick={() => { setDraft(mine.plan ?? ''); setWriting(true); }}>{mine.plan ? '改写我的一份' : '写下我的一份'}</P3Button>}
              </div>
            )}
          </div>
        )}
        <ul className="mt-2.5">
          {op.participants.map((u) => {
            const m = view.members.find((x) => x.userId === u); const s = states[u]?.state ?? 'todo';
            const task = op.assignments[u] || states[u]?.plan;
            return (
              <li key={u} className="flex min-w-0 items-center gap-2 py-1.5" style={{ borderTop: '1px dashed var(--p3r-track)' }}>
                <span className="w-14 shrink-0 truncate text-[12.5px] font-black" style={{ color: P3R.ink }}>{m ? displayCodename(m) : '已离开'}</span>
                {u === view.me.userId && <MeChip />}
                {big ? <span className="min-w-0 flex-1 truncate text-[11px] font-bold" style={{ color: task ? P3R.ink : P3R.grey }}>{task ?? '还没写自己那一份'}</span> : <span className="flex-1" />}
                <span className="shrink-0 px-1.5 py-[1px] text-[10px] font-black" style={s === 'done' ? { background: 'var(--p3r-mint)', color: 'var(--p3r-mulberry)', clipPath: slantClip(3) } : s === 'out' || s === 'gone' ? { color: P3R.grey, boxShadow: 'inset 0 0 0 1px var(--p3r-track)' } : { background: P3R.cyan, color: 'var(--p3r-mulberry)', clipPath: slantClip(3) }}>{s === 'done' ? '✓ 做完了' : s === 'out' ? '不参加' : s === 'gone' ? '已离开' : '进行中'}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-1.5 flex flex-wrap justify-end gap-x-4 gap-y-1">
          {mine?.state === 'todo' && <button type="button" onClick={onOut} className="text-[12px] font-black underline" style={{ color: P3R.grey }}>这次不参加</button>}
          {canCancel && <button type="button" onClick={onCancel} className="text-[12px] font-black underline" style={{ color: 'var(--p3r-coral-ink)' }}>取消{OP_KIND_LABEL[op.kind]}</button>}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── 周日会议 ─────────────────────────
export type MeetMode = 'open' | 'submitted' | 'closed' | 'tomorrow' | 'empty';
export function MeetingSection({ view, mode }: { view: OrgView; mode: MeetMode }) {
  const toast = useToast();
  const low = useLowMotion();
  const item = stag(low);
  const days = mode === 'tomorrow' ? 1 : 5;
  const [editing, setEditing] = useState(mode === 'open');
  const [result, setResult] = useState<'done' | 'partial' | 'missed' | null>(null);
  const [goal, setGoal] = useState('');
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<{ result: string; goal: string } | null>(view.me.goal ? { result: view.me.result ?? 'done', goal: view.me.goal } : null);
  useEffect(() => { setMine(view.me.goal ? { result: view.me.result ?? 'done', goal: view.me.goal } : null); }, [view.me.goal, view.me.result]);
  const open = mode === 'open' || mode === 'submitted';
  const wrote = !!mine;
  const currentWeek = weekRangeOf(new Date()).weekKey;
  const nextWeek = weekRangeOf(new Date(Date.now() + 7 * 86_400_000)).weekKey;
  const wroteCount = view.members.filter((member) => !!member.goal).length;
  const submit = () => {
    setBusy(true);
    void saveMeeting(view.me.id, { week: currentWeek, nextWeek, result: result ?? 'done', goal })
      .then(() => { setMine({ result: result ?? 'done', goal }); setEditing(false); toast.success(wrote ? '改好了' : '交上去了，下周见'); })
      .catch((error) => toast(error instanceof Error ? error.message : '没交上去，请重试'))
      .finally(() => setBusy(false));
  };
  const minutes = view.posts?.find((post) => post.kind === 'minutes')?.minutes ?? null;
  const others = view.members.filter((m) => m.userId !== view.me.userId && m.goal);
  return (
    <div className="space-y-3">
      {open ? (
        <motion.div {...item(0)} className="px-5 py-4" style={panel(16)}>
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-black" style={{ background: P3R.magenta, color: '#fff', clipPath: slantClip(3) }}>开会中</span>
            <span className="min-w-0 flex-1 truncate font-heavy text-[19px]" style={{ color: P3R.ink }}>周日会议</span>
            <span className="shrink-0 text-[10.5px] font-bold" style={{ color: P3R.grey }}>开到周一凌晨 4 点</span>
          </div>
          {wrote && !editing ? (
            <div className="mt-3">
              <div className="text-[12px] font-bold" style={{ color: P3R.grey }}>你已经交了</div>
              <div className="mt-1.5 text-[14px] font-black" style={{ color: P3R.ink }}>这周的目标：<span style={{ color: P3R.roseInk }}>{RESULT_LABEL[mine!.result as 'done']}</span></div>
              <div className="mt-1.5 font-cond text-[11px] tracking-wider" style={{ color: P3R.grey }}>下周目标</div>
              <div className="text-[16px] font-black" style={{ color: P3R.ink }}>「{mine!.goal || '每天背 30 个单词'}」</div>
              <div className="mt-3"><P3Button size="sm" tone="soft" onClick={() => { setGoal(mine!.goal); setEditing(true); }}>改一改</P3Button></div>
            </div>
          ) : (
            <div className="mt-3 space-y-4">
              <div>
                <div className="text-[14px] font-bold leading-relaxed" style={{ color: P3R.ink }}>这周的目标<span className="font-black">「{view.me.goal}」</span>做到了吗？</div>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {(['done', 'partial', 'missed'] as const).map((r) => <button key={r} type="button" aria-pressed={result === r} onClick={() => setResult(r)} className="py-2 text-[14px] font-black" style={{ clipPath: slantClip(8), background: result === r ? P3R.blue : 'var(--p3r-row)', color: result === r ? P3R.onBlue : P3R.ink, boxShadow: result === r ? undefined : 'inset 0 0 0 1.5px var(--p3r-track)' }}>{RESULT_LABEL[r]}</button>)}
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-[14px] font-black" style={{ color: P3R.ink }}>下周想做到的一件事<span className="ml-1.5 whitespace-nowrap text-[10.5px] font-bold" style={{ color: P3R.grey }}>{md(shiftKey(1))} 起</span></div>
                <P3Input aria-label="下周目标" placeholder="比如：每天背 30 个单词" value={goal} onChange={(e) => setGoal([...e.target.value].slice(0, 20).join(''))} />
              </div>
              <div className="flex justify-end gap-2">
                {wrote && <P3Button size="sm" tone="ghost" disabled={busy} onClick={() => setEditing(false)}>取消</P3Button>}
                <P3Button size="sm" corner busy={busy} busyText="提交中…" disabled={!goal.trim() || !result} onClick={submit}>{wrote ? '保存' : '交上去'}</P3Button>
              </div>
              <p className="text-[11px] font-bold leading-relaxed" style={{ color: P3R.grey }}>写好的目标组织里的人都能看到；会议结束后会出一份纪要，发到公告板上。</p>
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div {...item(0)} className="relative overflow-hidden px-5 py-4" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(16) }}>
          <div className="flex items-end gap-3">
            <div className="min-w-0 flex-1"><div className="font-cond text-[12px] uppercase tracking-[0.2em]" style={{ color: P3R.blue }}>NEXT MEETING</div><div className="mt-1 font-heavy text-[19px]">下一场：周日（{md(shiftKey(days))}）</div></div>
            <div className="shrink-0 text-center">{days > 1 && <div className="font-cond text-[64px] leading-none" style={{ color: P3R.blue }}>{days}</div>}<div className="mt-0.5 text-[11px] font-bold opacity-75">{days === 1 ? '明天就开' : '天后'}</div></div>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed opacity-85">周日全天（到周一凌晨 4 点）来这里：给这周的目标打个分，再写一句下周目标。</p>
        </motion.div>
      )}
      {open && (
        <motion.div {...item(1)} className="px-5 py-3" style={panel(12)}>
          <div className="flex items-center gap-2"><span className="text-[14px] font-black" style={{ color: P3R.ink }}>点名</span><span className="ml-auto text-[11px] font-bold" style={{ color: P3R.grey }}>已写 {wroteCount} / {view.members.length}</span></div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {view.members.map((m) => { const did = !!m.goal; return <span key={m.id} className="px-1.5 py-0.5 text-[11px] font-black" style={did ? { background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(3) } : { color: P3R.grey, boxShadow: 'inset 0 0 0 1px var(--p3r-track)' }}>{did ? '✓ ' : ''}{displayCodename(m)}{m.userId === view.me.userId ? '（我）' : ''}</span>; })}
          </div>
        </motion.div>
      )}
      <motion.div {...item(2)} className="px-5 py-3" style={panel(12)}>
        <div className="text-[14px] font-black" style={{ color: P3R.ink }}>这周大家的目标</div>
        {mode === 'empty' ? <div className="mt-1.5 text-[12.5px] font-bold" style={{ color: P3R.grey }}>这周还没人立目标。周日会上写一句吧。</div> : (
          <>
            {view.me.goal && <div className="mt-2 px-3 py-1.5" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(6) }}><div className="font-cond text-[10px] tracking-wider opacity-80">我的</div><div className="text-[14px] font-black">「{view.me.goal}」</div></div>}
            {others.length ? <ul className="mt-2 space-y-1">{others.map((m) => <li key={m.id} className="flex min-w-0 gap-2 text-[12.5px]"><span className="w-12 shrink-0 truncate font-black" style={{ color: P3R.ink }}>{displayCodename(m)}</span><span className="min-w-0" style={{ color: P3R.ink }}>「{m.goal}」</span></li>)}</ul>
              : <div className="mt-2 text-[12.5px] font-bold" style={{ color: P3R.grey }}>其他人这周还没有目标。</div>}
          </>
        )}
      </motion.div>
      <motion.div {...item(3)}>
        <div className="mb-2 text-[11px] font-black tracking-[0.12em]" style={{ color: P3R.grey }}>上一次的会议纪要</div>
        {minutes ? (
          <div className="px-5 py-3 text-[12.5px]" style={{ background: 'var(--p3r-cyan-pale)', color: P3R.ink, clipPath: slantClip(12) }}>
            <div className="font-black">{minutes.week} · <span className="font-cond text-[15px]" style={{ color: P3R.blue }}>{minutes.rate.done}/{minutes.rate.total}</span> 人做到了</div>
            <div className="mt-1 text-[11px] font-bold" style={{ color: P3R.grey }}>称号：{minutes.titles.map((t) => `${t.codename}·${t.title}`).join('、') || '暂无'} · 缺席：{minutes.absent.map((a) => a.codename).join('、') || '无'}</div>
          </div>
        ) : <div className="text-[12px] font-bold" style={{ color: P3R.grey }}>还没有会议纪要。</div>}
      </motion.div>
    </div>
  );
}
