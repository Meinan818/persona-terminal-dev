/**
 * NavigatorNotebook 记事本（真实 src/components/navigator/NavigatorNotebook.tsx；视觉 = v3 chat/chat.js openNotebook）。
 * 三段：TA 眼里的你（长期画像，可改 + 保存画像）/ 约好的事（改日子 · 删 → ConfirmDialog「删掉这个约定？」）/
 *       零散记忆（置顶 · 改 · 删 → ConfirmDialog「删除这条记忆？」）—— 删除确认 = P1-17 新补（tone=danger）。
 * 独立预览：#/overlay/assistant-notebook（在助手窗里弹出）；?empty=1 空态文案。
 */
import { useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { cx, ChatSheet, chatToast } from './NavigatorChatKit';
import { NotebookDeleteConfirm } from './NavigatorNotebookConfirm.p5r';
import NavigatorWindow from './NavigatorWindow.p5r';

interface Promise_ { id: string; t: string; d: string; s: string }
interface Memo { id: string; t: string; imp: number; pin?: boolean; date: string }
const PROMISES: Promise_[] = [{ id: 'p1', t: '周五下午的面试', d: '10/23 · 下午', s: '还没到' }, { id: 'p2', t: '体检出结果', d: '10/19', s: '问过了' }];
const MEMOS: Memo[] = [
  { id: 'm1', t: '喝咖啡会失眠，下午三点后不喝', imp: 5, pin: true, date: '2026/10/12' },
  { id: 'm2', t: '在准备一份季度报告，开头最难写', imp: 3, date: '2026/10/18' },
  { id: 'm3', t: '周末喜欢去河边跑步', imp: 2, date: '2026/10/03' },
];

export function NotebookSheet({ onClose, empty = false }: { onClose: () => void; empty?: boolean }) {
  const [profile, setProfile] = useState(empty ? '' : '做事认真但容易被第一步卡住；晚上效率高、常常睡太晚。压力大时话会变少，被夸会不好意思。');
  const [promises, setPromises] = useState(empty ? [] : PROMISES);
  const [memos, setMemos] = useState(empty ? [] : MEMOS);
  const [dateEdit, setDateEdit] = useState<string | null>(null);
  const [memoEdit, setMemoEdit] = useState<{ id: string; text: string } | null>(null);
  const [del, setDel] = useState<{ kind: 'memory' | 'promise'; id: string } | null>(null);
  return (
    <>
      <ChatSheet title="记事本" ghost="MEMO" onClose={onClose}>
        <div className={cx('sec')}>
          <h4>TA 眼里的你（长期画像，可直接修改）</h4>
          <p className={cx('hint')}>每次对话都会带上这段画像；它会在整理对话时自动更新，你的手改优先。</p>
          <textarea className={cx('ta')} value={profile} placeholder="还没有画像——多聊几天，它会写下对你的整体印象；你也可以现在直接写给它。" onChange={(e) => setProfile(e.target.value)} />
          <div style={{ textAlign: 'right', marginTop: 10 }}><button type="button" className={cx('p5btn')} onClick={() => chatToast('画像已保存')}>保存画像</button></div>
        </div>
        <div className={cx('sec')}>
          <h4>约好的事（过后问你一句结果，只问一次）</h4>
          {!promises.length && <p className={cx('hint')}>还没有——聊天时说到带日子的事（面试、考试、体检……），它会记下，过后问你一句结果。</p>}
          {promises.map((p) => (
            <div key={p.id} className={cx('memo')}>
              {dateEdit === p.id ? (
                <><div className={cx('c')}>{p.t}<input className={cx('inp')} type="date" defaultValue="2026-10-23" aria-label={`「${p.t}」改到哪天`} style={{ marginTop: 6, height: 36 }} /></div>
                  <div className={cx('acts')}><button type="button" onClick={() => { setDateEdit(null); chatToast('日子改好了'); }}>存</button><button type="button" onClick={() => setDateEdit(null)}>取消</button></div></>
              ) : (
                <><div className={cx('c')}>{p.t}<span className={cx('s')}>{p.d} · {p.s}</span></div>
                  <div className={cx('acts')}><button type="button" aria-label={`改「${p.t}」的日子`} onClick={() => setDateEdit(p.id)}>改日子</button><button type="button" aria-label={`删掉约定「${p.t}」`} onClick={() => setDel({ kind: 'promise', id: p.id })}>删</button></div></>
              )}
            </div>
          ))}
        </div>
        <div className={cx('sec')}>
          <h4>零散记忆（按相关性取用；置顶的永不遗忘）</h4>
          {!memos.length && <p className={cx('hint')}>还没有记忆——多聊几天，它会自己记住重要的事。</p>}
          {memos.map((m) => (
            <div key={m.id} className={cx('memo', m.pin && 'pin')}>
              {memoEdit?.id === m.id ? (
                <><div className={cx('c')}><textarea className={cx('ta')} style={{ minHeight: 64 }} value={memoEdit.text} onChange={(e) => setMemoEdit({ id: m.id, text: e.target.value })} /></div>
                  <div className={cx('acts')}><button type="button" onClick={() => { setMemos(memos.map((x) => (x.id === m.id ? { ...x, t: memoEdit.text } : x))); setMemoEdit(null); }}>存</button><button type="button" onClick={() => setMemoEdit(null)}>取消</button></div></>
              ) : (
                <><div className={cx('c')}>{m.t}<span className={cx('s')}>{m.date} · 重要度 {m.imp}{m.pin ? ' · 置顶' : ''}</span></div>
                  <div className={cx('acts')}>
                    <button type="button" aria-label={m.pin ? '取消置顶' : '置顶'} onClick={() => setMemos(memos.map((x) => (x.id === m.id ? { ...x, pin: !x.pin, imp: !x.pin ? 5 : x.imp } : x)))}>{m.pin ? '取消置顶' : '置顶'}</button>
                    <button type="button" aria-label="编辑记忆" onClick={() => setMemoEdit({ id: m.id, text: m.t })}>改</button>
                    <button type="button" aria-label="删除记忆" onClick={() => setDel({ kind: 'memory', id: m.id })}>删</button>
                  </div></>
              )}
            </div>
          ))}
        </div>
      </ChatSheet>
      <NotebookDeleteConfirm kind={del?.kind ?? 'memory'} open={!!del} onClose={() => setDel(null)}
        onConfirm={() => { if (!del) return; if (del.kind === 'memory') setMemos((l) => l.filter((x) => x.id !== del.id)); else setPromises((l) => l.filter((x) => x.id !== del.id)); }} />
    </>
  );
}

/** 独立预览：在助手窗里直接打开记事本 */
export default function NavigatorNotebookPreview({ open, onClose, params }: OverlayProps) {
  const q = new URLSearchParams(params); q.set('sheet', 'notebook');
  return <NavigatorWindow open={open} onClose={onClose} params={q} />;
}
