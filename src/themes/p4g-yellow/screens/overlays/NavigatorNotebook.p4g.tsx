/**
 * 助手记事本（真实 src/components/navigator/NavigatorNotebook.tsx）：
 * 「TA 眼里的你（长期画像，可直接修改）」+ 保存；「约好的事」列表（状态 / 改日子 → 日期 + 存 / 取消 / 删）；
 * 「零散记忆」列表（置顶 / 取消置顶、改 → 存、删）；空态。?state=empty
 * 外观：P4G 的「笔记本」（Persona 4 的 Notebook）—— 横格纸 + 黄色索引签 + 红色页边线。
 */
import { useEffect, useMemo, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P6Sheet } from '@yellow/screens/pkg6/sheet';
import { CfgBtn, CfgInput, CfgTextarea } from '@yellow/screens/pkg6/cfg';
import { navigatorNotebookOps, useNavigatorNotebook } from '@yellow/adapters/pkg6';
import { NotebookDeleteDialog } from './NavigatorNotebookConfirm.p4g';
import { useToast } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';

type Promise_ = { id: string; topic: string; dueDate: string; when: string; state: string; phase: string };
type Memo_ = { id: string; text: string; pinned: boolean; createdAt: string; importance: number; followUp?: string };
const WHEN: Record<string, string> = { morning: '上午', day: '', evening: '晚上' };
const statusOf = (p: Promise_) => p.state === 'asked' ? '问过了' : p.state === 'resolved' ? '你说过结果了' : p.state === 'expired' ? '没来得及问' : p.phase === 'today' ? '就是今天' : p.phase === 'due' ? '该问了' : p.phase === 'late' ? '没来得及问' : '还没到';

const Tab = ({ children, en }: { children: React.ReactNode; en: string }) => (
  <div className="mb-2 flex min-w-0 items-end gap-2">
    <span className="-skew-x-12 rounded-t-[3px] bg-p4g-yellow px-3 py-1 font-display text-body font-bold text-p4g-black shadow-[3px_0_0_var(--p4g-black)] night:shadow-[3px_0_0_var(--p4g-orange)]"><span className="inline-block skew-x-12">{children}</span></span>
    <span className="min-w-0 truncate pb-1 font-display text-2xs font-bold uppercase tracking-[0.2em] text-p4g-ink-soft">{en}</span>
  </div>
);
const Paper = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cx('relative min-w-0 overflow-hidden rounded-[3px] border-2 border-p4g-black bg-p4g-cream pl-5 text-p4g-black night:border-p4g-yellow night:bg-p4g-surface night:text-p4g-ink', className)}
    style={{ backgroundImage: 'repeating-linear-gradient(180deg, transparent 0 27px, rgb(var(--p4g-cyan-rgb) / 0.28) 27px 28px)' }}>
    <span aria-hidden className="absolute inset-y-0 left-3 w-[2px] bg-p4g-red/60" />
    {children}
  </div>
);

export function Notebook({ open, onClose, empty }: { open: boolean; onClose: () => void; empty?: boolean }) {
  const toast = useToast();
  const live = useNavigatorNotebook(open);
  const realPromises = useMemo(() => live.promises.map((item) => ({ id: item.id, topic: item.promiseTopic ?? item.text, dueDate: item.dueDate ?? '', when: item.dueWhen ?? 'day', state: item.promiseState ?? 'waiting', phase: item.dueDate && item.dueDate < new Date().toISOString().slice(0, 10) ? 'late' : item.dueDate === new Date().toISOString().slice(0, 10) ? 'today' : 'future' })), [live.promises]);
  const realMemos = useMemo(() => live.memos.map((item) => ({ id: item.id, text: item.text, pinned: !!item.pinned, createdAt: new Date(item.createdAt).toLocaleDateString('zh-CN'), importance: item.importance, followUp: item.followUp })), [live.memos]);
  const [profile, setProfile] = useState(empty ? '' : live.profile);
  const [savedProfile, setSavedProfile] = useState(profile);
  const [promises, setPromises] = useState<Promise_[]>(empty ? [] : realPromises);
  const [memos, setMemos] = useState<Memo_[]>(empty ? [] : realMemos);
  const [dateEdit, setDateEdit] = useState<{ id: string; date: string } | null>(null);
  const [memoEdit, setMemoEdit] = useState<{ id: string; text: string } | null>(null);
  const [delMemo, setDelMemo] = useState<string | null>(null);
  const [delPromise, setDelPromise] = useState<string | null>(null);
  useEffect(() => { if (open) { const p = empty ? '' : live.profile; setProfile(p); setSavedProfile(p); setPromises(empty ? [] : realPromises); setMemos(empty ? [] : realMemos); } }, [open, empty, live.profile, realPromises, realMemos]);
  const dirty = profile !== savedProfile;
  const commit = () => { if (dirty) { setSavedProfile(profile); void navigatorNotebookOps.saveProfile(profile).then(() => toast.success('画像已保存')).catch(() => toast('保存失败，请重试')); } };

  return (
    <>
      <P6Sheet open={open} onClose={() => { commit(); onClose(); }} title="记事本" en="NOTEBOOK" size="tall"
        headerExtra={dirty ? <CfgBtn tone="primary" onClick={commit}>保存画像</CfgBtn> : undefined}>
        <div className="space-y-5 pt-1">
          <section>
            <div className="flex items-end justify-between gap-2">
              <Tab en="PROFILE">TA 眼里的你（长期画像，可直接修改）</Tab>
              {dirty && <button type="button" onClick={commit} className="mb-2 shrink-0 font-display text-meta font-bold text-p4g-tag underline">保存</button>}
            </div>
            <Paper className="pr-2">
              <CfgTextarea rows={4} value={profile} onChange={(e) => setProfile(e.target.value)} placeholder="还没有画像——多聊几天，它会写下对你的整体印象；你也可以现在直接写给它。"
                className="border-0 bg-transparent leading-[28px] focus:ring-0 night:bg-transparent" aria-label="长期画像" />
            </Paper>
            <p className="mt-1 text-2xs text-p4g-muted">每次对话都会带上这段画像；它会在整理对话时自动更新，你的手改优先。</p>
          </section>

          <section>
            <Tab en="PROMISES">约好的事（过后问你一句结果，只问一次）</Tab>
            {promises.length === 0 ? <Paper className="p-3 pl-6 text-meta">还没有——聊天时说到带日子的事（面试、考试、体检……），它会记下，过后问你一句结果。</Paper> : (
              <ul className="grid grid-cols-1 gap-1.5">
                {promises.map((m) => {
                  const st = statusOf(m);
                  return (
                    <li key={m.id} className="flex min-w-0 flex-wrap items-center gap-2 rounded-[3px] bg-p4g-surface px-3 py-2">
                      <span className="p4g-num shrink-0 rounded-[2px] bg-p4g-black px-1.5 text-meta text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black">{m.dueDate.slice(5).replace('-', '/')}{WHEN[m.when] ? ` ${WHEN[m.when]}` : ''}</span>
                      <span className="min-w-0 flex-1 truncate font-display text-body font-bold">{m.topic}</span>
                      <span className={cx('shrink-0 rounded-[2px] px-1.5 text-2xs font-bold', st === '就是今天' || st === '该问了' ? 'bg-p4g-orange text-p4g-black' : 'bg-p4g-line/15')}>{st}</span>
                      {dateEdit?.id === m.id ? (
                        <span className="flex w-full min-w-0 items-center gap-1.5">
                          <CfgInput type="date" className="h-9" value={dateEdit.date} onChange={(e) => setDateEdit({ id: m.id, date: e.target.value })} aria-label={`「${m.topic}」改到哪天`} />
                          <CfgBtn tone="primary" onClick={() => { void navigatorNotebookOps.updatePromiseDate(m.id, dateEdit.date, m.when as 'morning' | 'day' | 'evening').then(() => { setPromises(promises.map((p) => (p.id === m.id ? { ...p, dueDate: dateEdit.date } : p))); setDateEdit(null); }).catch(() => toast('改期失败，请重试')); }}>存</CfgBtn>
                          <CfgBtn onClick={() => setDateEdit(null)}>取消</CfgBtn>
                        </span>
                      ) : (
                        <span className="flex shrink-0 gap-1">
                          {m.state === 'waiting' && <button type="button" onClick={() => setDateEdit({ id: m.id, date: m.dueDate })} aria-label={`改「${m.topic}」的日子`} className="rounded-[3px] px-1.5 py-0.5 text-meta font-bold underline">改日子</button>}
                          <button type="button" onClick={() => setDelPromise(m.id)} aria-label={`删掉约定「${m.topic}」`} className="rounded-[3px] px-1.5 py-0.5 text-meta font-bold text-p4g-danger">删</button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <Tab en="MEMORIES">零散记忆（按相关性取用；置顶的永不遗忘）</Tab>
            {memos.length === 0 ? <Paper className="p-3 pl-6 text-meta">还没有记忆——多聊几天，它会自己记住重要的事。</Paper> : (
              <ul className="grid grid-cols-1 gap-1.5">
                {memos.map((m) => (
                  <li key={m.id} className={cx('min-w-0 rounded-[3px] px-3 py-2', m.pinned ? 'border-2 border-p4g-black bg-p4g-yellow text-p4g-black night:border-p4g-yellow' : 'bg-p4g-surface')}>
                    {memoEdit?.id === m.id ? (
                      <div className="flex min-w-0 gap-1.5">
                        <CfgInput className="h-9" value={memoEdit.text} onChange={(e) => setMemoEdit({ id: m.id, text: e.target.value })} aria-label="编辑记忆" />
                        <CfgBtn tone="primary" onClick={() => { void navigatorNotebookOps.saveMemo(m.id, { text: memoEdit.text }).then(() => { setMemos(memos.map((x) => (x.id === m.id ? { ...x, text: memoEdit.text } : x))); setMemoEdit(null); }).catch(() => toast('保存失败，请重试')); }}>存</CfgBtn>
                        <CfgBtn onClick={() => setMemoEdit(null)}>取消</CfgBtn>
                      </div>
                    ) : (
                      <div className="flex min-w-0 items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-body leading-snug">{m.pinned && <span aria-hidden>📌 </span>}{m.text}</p>
                          <p className="mt-0.5 text-2xs opacity-70">{m.createdAt} · 重要度 {m.importance}{m.followUp ? ' · 有待追问话头' : ''}</p>
                        </div>
                        <div className="flex shrink-0 gap-0.5">
                          <button type="button" onClick={() => { void navigatorNotebookOps.saveMemo(m.id, { pinned: !m.pinned, importance: m.pinned ? 3 : 5 }).then(() => setMemos(memos.map((x) => (x.id === m.id ? { ...x, pinned: !x.pinned } : x)))); }} aria-label={m.pinned ? '取消置顶' : '置顶'} className="rounded-[3px] px-1.5 py-0.5 text-meta font-bold">{m.pinned ? '取消置顶' : '置顶'}</button>
                          <button type="button" onClick={() => setMemoEdit({ id: m.id, text: m.text })} aria-label="编辑记忆" className="rounded-[3px] px-1.5 py-0.5 text-meta font-bold underline">改</button>
                          <button type="button" onClick={() => setDelMemo(m.id)} aria-label="删除记忆" className="rounded-[3px] px-1.5 py-0.5 text-meta font-bold text-p4g-danger">删</button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </P6Sheet>
      <NotebookDeleteDialog kind="memo" open={!!delMemo} onClose={() => setDelMemo(null)} onConfirm={() => { const id = delMemo; setDelMemo(null); if (id) void navigatorNotebookOps.deleteMemo(id).then(() => setMemos((items) => items.filter((x) => x.id !== id))); }} />
      <NotebookDeleteDialog kind="promise" open={!!delPromise} onClose={() => setDelPromise(null)} onConfirm={() => { const id = delPromise; setDelPromise(null); if (id) void navigatorNotebookOps.deletePromise(id).then(() => setPromises((items) => items.filter((x) => x.id !== id))); }} />
    </>
  );
}

export default function NavigatorNotebook({ open, onClose, params }: OverlayProps) {
  return <Notebook open={open} onClose={onClose} empty={params?.get('state') === 'empty'} />;
}
