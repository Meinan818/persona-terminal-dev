/**
 * 谏言（真实 CounselChatModal）：P4G 对话框版式——电视里的雾舞台 + 暗棕消息框 + 黄名牌。
 * 状态：intro（开始对话）/ live（聊天、@同伴、打断、归档）/ expired（窗口已过）/ cooldown（冷却中）
 * 弹层：leave（要离开了吗？）/ archive（归档这次谈话？）
 * #/overlay/bond-counsel-chat?state=intro|live|expired|cooldown&dialog=leave|archive&ai=0&neterr=1
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { Portal, useEscape, useScrollLock, showToast } from '@yellow/kit';
import { TVPowerOn } from '@yellow/fx';
import { p4gAsset } from '@yellow/lib/asset';
import { cx } from '@yellow/lib/cx';
import { PK3_CONFIDANTS } from '@yellow/adapters/pkg3';
import { TarotCard } from '@yellow/screens/pkg3/ui';

type CState = 'intro' | 'live' | 'expired' | 'cooldown';
interface Msg { id: string; role: 'user' | 'assistant'; content: string; interrupted?: boolean; mentions?: string[] }

const SEED: Msg[] = [
  { id: 'm1', role: 'assistant', content: '你来了。今晚的雾很重——是什么压在你心上？' },
  { id: 'm2', role: 'user', content: '@千枝 最近因为比赛的事，我们好像有点别扭。', mentions: ['c-chie'] },
  { id: 'm3', role: 'assistant', content: '你说的「别扭」，是她先沉默，还是你先把担心说成了责备？' },
];
const REPLY = '担心和责备有时候长得很像。先把「我怕你受伤」说出来，比「你又逞强」更接近你真正想说的话。';

export function CounselChat({ isOpen, onClose, initialState = 'intro', initialDialog = null, aiConfigured = true, netError = false, locked = false }: {
  isOpen: boolean; onClose: () => void; initialState?: CState; initialDialog?: 'leave' | 'archive' | null; aiConfigured?: boolean; netError?: boolean; locked?: boolean;
}) {
  const [state, setState] = useState<CState>(initialState);
  const [msgs, setMsgs] = useState<Msg[]>(initialState === 'live' ? SEED : []);
  const [input, setInput] = useState('');
  const [replying, setReplying] = useState(false);
  const [typed, setTyped] = useState('');
  const [exitOpen, setExitOpen] = useState(initialDialog === 'leave');
  const [archiveConfirm, setArchiveConfirm] = useState(initialDialog === 'archive');
  const [archiving, setArchiving] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [connErr, setConnErr] = useState<string | null>(netError ? 'Failed to fetch' : null);
  const [left, setLeft] = useState(52 * 60 + 18);
  const timer = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useEffect(() => { if (isOpen) { setState(initialState); setMsgs(initialState === 'live' ? SEED : []); setExitOpen(initialDialog === 'leave'); setArchiveConfirm(initialDialog === 'archive'); } }, [isOpen, initialState, initialDialog]);
  useEffect(() => { if (state !== 'live') return; const t = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000); return () => clearInterval(t); }, [state]);
  useEffect(() => { listRef.current?.scrollTo({ top: 1e6 }); }, [msgs, typed]);
  const sessionLive = state === 'live';
  const requestExit = () => (sessionLive && msgs.length > 0 ? setExitOpen(true) : onClose());
  useEscape(isOpen && !exitOpen && !archiveConfirm, requestExit);

  const stream = () => {
    setReplying(true); setTyped('');
    let i = 0;
    const tick = () => {
      i += 2; setTyped(REPLY.slice(0, i));
      if (i < REPLY.length) timer.current = window.setTimeout(tick, 40);
      else { setMsgs((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', content: REPLY }]); setTyped(''); setReplying(false); }
    };
    timer.current = window.setTimeout(tick, 600);
  };
  const interrupt = () => {
    if (timer.current) clearTimeout(timer.current);
    setMsgs((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', content: typed || '……', interrupted: true }]);
    setTyped(''); setReplying(false);
  };
  const send = () => {
    if (!input.trim() || !sessionLive) return;
    if (replying) interrupt();
    setMsgs((m) => [...m, { id: `u${Date.now()}`, role: 'user', content: input.trim() }]);
    setInput(''); stream();
  };
  const start = () => { setState('live'); setMsgs([{ id: 'm1', role: 'assistant', content: SEED[0].content }]); };
  const doArchive = () => { setArchiving(true); window.setTimeout(() => { setArchiving(false); setExitOpen(false); setArchiveConfirm(false); showToast('已归档到谏言归档库'); onClose(); }, 900); };
  const mm = String(Math.floor(left / 60)).padStart(2, '0'); const ss = String(left % 60).padStart(2, '0');

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div key="counsel" className="fixed inset-0 flex items-stretch justify-center bg-p4g-black wide:items-center wide:p-6" style={{ zIndex: 'var(--p4g-z-sheet)' as unknown as number }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <img src={p4gAsset('tv-world-fog.webp')} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
            <div className="absolute inset-0 bg-p4g-black/35" />
            <TVPowerOn className="relative flex h-full w-full max-w-[720px] min-w-0 flex-col wide:h-[min(86vh,820px)]">
              <div aria-label="谏言" className="relative flex h-full min-h-0 flex-col overflow-hidden border-p4g-black wide:rounded-sm wide:border-3 wide:shadow-[8px_8px_0_var(--p4g-orange)]">
                {/* 页头 */}
                <div className="flex shrink-0 items-center gap-3 bg-p4g-black px-4 py-3 text-white">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-display text-h3 font-bold text-p4g-yellow"><span aria-hidden>✧</span>谏言</div>
                    <div className="mt-0.5 truncate text-cap text-white/70">房间的尽头，有人一直注视着你</div>
                  </div>
                  {sessionLive && <div className="shrink-0 text-right" aria-label={`窗口还剩 ${mm} 分 ${ss} 秒`} data-counsel-timer><div className="font-display text-2xs font-bold tracking-widest text-white/60">LEFT</div><div className="p4g-num text-h3 text-p4g-orange">{mm}:{ss}</div></div>}
                  <button type="button" onClick={requestExit} disabled={archiving} aria-label="关闭" className="p4g-press flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border-3 border-p4g-yellow bg-p4g-yellow font-bold text-p4g-black">✕</button>
                </div>
                <div aria-hidden className="h-[6px] shrink-0 p4g-candy" />
                {!aiConfigured && <Banner tone="warn" text="尚未配置 AI 密钥。" sub="现在是简版离线回复；到「设置 → AI 服务」填入密钥后，残响才会真正用心听你说。" />}
                {connErr && <Banner tone="error" text="无法连接到 AI 服务。" sub="刚才这次临时退回了离线回复。网络恢复后再发一条试试。" detail={connErr} onClose={() => setConnErr(null)} />}

                {/* 主体 */}
                <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                  {state === 'intro' && (
                    <div className="flex h-full flex-col items-center justify-center text-center text-white">
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.35 }} className="mb-5 text-mega text-p4g-yellow/70" aria-hidden>✧</motion.div>
                      <p className="text-body leading-relaxed text-white/90">房间的尽头，有人一直注视着你——<br />准备好了就按下去，Ta 会先开口。</p>
                      <button type="button" onClick={start} className="p4g-press mt-5 rounded-full border-3 border-p4g-black bg-p4g-yellow px-8 py-3 font-display text-lead font-bold text-p4g-black shadow-[4px_4px_0_var(--p4g-orange)]">开始对话</button>
                      <p className="mt-5 max-w-[26rem] text-cap leading-relaxed text-white/65">每 3 天可以开一次，开始后一小时内随便聊，到点原文就散了；想留个念想可以归档成一小段摘要。关于哪位同伴，聊天时 @ Ta。</p>
                    </div>
                  )}
                  {state === 'expired' && (
                    <div className="flex h-full flex-col items-center justify-center text-center text-white">
                      <div className="mb-4 text-6xl text-p4g-yellow/40" aria-hidden>✧</div>
                      <h4 className="font-display text-h2 font-bold text-p4g-yellow">这次谈话已经过去了</h4>
                      <p className="mt-2 text-body text-white/85">一小时的窗口已经合上，聊天记录随之散去。{locked ? <><br />这次的冷却会到 <b>10/22</b>，之后再来找残响。</> : <><br />想说的话还没说完，可以再开一次。</>}</p>
                      <div className="mt-6 flex gap-3">
                        {!locked && <button type="button" onClick={start} className="p4g-press rounded-full border-3 border-p4g-black bg-p4g-yellow px-5 py-2.5 font-display font-bold text-p4g-black">再开一次</button>}
                        <button type="button" onClick={onClose} className="rounded-full border-3 border-white/40 px-5 py-2.5 font-display font-bold text-white">离开</button>
                      </div>
                    </div>
                  )}
                  {state === 'cooldown' && (
                    <div className="flex h-full flex-col items-center justify-center text-center text-white">
                      <div className="mb-4 text-6xl text-p4g-yellow/40" aria-hidden>✧</div>
                      <h4 className="font-display text-h2 font-bold text-p4g-yellow">谏言冷却中</h4>
                      <p className="mt-2 text-body text-white/85">每 3 天一次，留出余地给沉淀。<br />下一次可在 <b>10/22</b> 开启（还有 2 天）。</p>
                      <button type="button" onClick={onClose} className="mt-6 rounded-full border-3 border-white/40 px-5 py-2.5 font-display font-bold text-white">先回到房间</button>
                    </div>
                  )}
                  {state === 'live' && (
                    <div className="grid grid-cols-1 gap-3">
                      {msgs.map((m) => <Bubble key={m.id} m={m} />)}
                      {replying && (
                        <div className="flex justify-start pt-1.5" role="status" aria-label="残响正在说">
                          <div className="relative max-w-[85%] rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] px-3 pb-2 pt-5 text-body text-[color:var(--p4g-msg-ink)] shadow-[4px_4px_0_var(--p4g-yellow)]">
                            <span className="absolute left-2 top-0 -translate-y-1/2 rounded-[2px] bg-p4g-yellow px-2 font-display text-cap font-bold text-p4g-black">残响</span>
                            {typed || <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }}>正在说…</motion.span>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 输入区 */}
                {(state === 'live' || state === 'intro') && (
                  <div className="shrink-0 border-t-3 border-p4g-black bg-p4g-black/85 px-3 pb-3 pt-2">
                    <AnimatePresence>
                      {mentionOpen && (
                        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-2 rounded-sm border-3 border-p4g-yellow bg-p4g-black p-2">
                          <div className="mb-1 flex items-center justify-between text-2xs"><span className="tracking-widest text-white/60">关心的人</span><button type="button" onClick={() => setMentionOpen(false)} className="font-bold text-p4g-yellow">收起</button></div>
                          {PK3_CONFIDANTS.length === 0 ? <p className="py-3 text-center text-cap text-white/60">还没有登记过同伴。可以先在同伴页里新建一位。</p> : (
                            <div className="pk3-noscroll flex gap-2 overflow-x-auto">
                              {PK3_CONFIDANTS.filter((c) => !c.archivedAt).map((c) => (
                                <button key={c.id} type="button" onClick={() => { setInput((v) => `${v}@${c.name} `); setMentionOpen(false); }} className="flex shrink-0 flex-col items-center gap-1 rounded-sm px-1 py-1 hover:bg-white/10">
                                  <TarotCard arcanaId={c.arcanaId} width={34} labels={false} /><span className="max-w-[56px] truncate text-2xs font-bold text-white">{c.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="flex items-end gap-2">
                      <button type="button" aria-label="选择同伴" disabled={!sessionLive} onClick={() => setMentionOpen((v) => !v)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border-3 border-p4g-yellow font-display text-h3 font-bold text-p4g-yellow disabled:opacity-40">@</button>
                      <textarea value={input} onChange={(e) => setInput(e.target.value)} disabled={!sessionLive} rows={1} aria-label="给残响的话"
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                        placeholder={!sessionLive ? '先按上面的「开始对话」吧' : replying ? '想插话就直接说' : '把它说出来…'}
                        className="max-h-28 min-h-[44px] min-w-0 flex-1 resize-none rounded-sm border-3 border-p4g-yellow bg-p4g-cream px-3 py-2 text-body text-p4g-black placeholder:text-p4g-black/45 focus:outline-none disabled:opacity-50" />
                      {replying && <button type="button" onClick={interrupt} className="h-11 shrink-0 rounded-sm border-3 border-p4g-red px-3 font-display font-bold text-p4g-red">打断</button>}
                      <button type="button" onClick={send} disabled={!input.trim() || !sessionLive} className="p4g-press h-11 shrink-0 rounded-sm border-3 border-p4g-black bg-p4g-yellow px-4 font-display font-bold text-p4g-black disabled:opacity-40">发送</button>
                    </div>
                    {sessionLive && (
                      <div className="mt-2 flex items-center justify-between text-2xs text-white/60">
                        <span>{msgs.length} 条消息{replying ? ' · 正在说' : ''}</span>
                        <button type="button" onClick={() => setArchiveConfirm(true)} disabled={msgs.length === 0} className="font-display text-cap font-bold text-p4g-yellow underline decoration-p4g-orange decoration-2 underline-offset-4 disabled:opacity-40">归档这次谈话</button>
                      </div>
                    )}
                  </div>
                )}

                {/* 要离开了吗？ */}
                <MiniDialog open={exitOpen} label="要离开了吗">
                  <h4 className="mb-1.5 font-display text-h3 font-bold text-p4g-yellow">要离开了吗？</h4>
                  <p className="text-meta text-[color:var(--p4g-msg-ink)]/85">可以先暂离，一小时内回来接着聊；也可以就此结束，把这次谈话归档成一小段摘要。</p>
                  <div className="mt-4 grid grid-cols-1 gap-2">
                    <button type="button" disabled={archiving} onClick={() => { setExitOpen(false); onClose(); }} className="p4g-press w-full rounded-full border-3 border-p4g-black bg-p4g-yellow py-2.5 font-display font-bold text-p4g-black">暂离 · 一小时内可回来</button>
                    <button type="button" disabled={archiving} onClick={doArchive} className="w-full rounded-full border-3 border-p4g-red bg-p4g-red py-2.5 font-display font-bold text-white">{archiving ? '正在归档…' : '结束对话 · 归档这次谈话'}</button>
                    <button type="button" disabled={archiving} onClick={() => setExitOpen(false)} className="w-full py-2 font-display font-bold text-white/80">再想想</button>
                  </div>
                </MiniDialog>
                <MiniDialog open={archiveConfirm} label="归档这次谈话">
                  <h4 className="mb-2 font-display text-h3 font-bold text-p4g-yellow">归档这次谈话？</h4>
                  <p className="text-meta text-[color:var(--p4g-msg-ink)]/85">会把刚才的聊天浓缩成 ≤100 字的摘要放进归档库，原文随窗口关闭散去。</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button type="button" disabled={archiving} onClick={() => setArchiveConfirm(false)} className="rounded-full border-3 border-white/40 py-2.5 font-display font-bold text-white">再想想</button>
                    <button type="button" disabled={archiving} onClick={doArchive} className="rounded-full border-3 border-p4g-red bg-p4g-red py-2.5 font-display font-bold text-white">{archiving ? '正在压缩…' : '归档'}</button>
                  </div>
                </MiniDialog>
              </div>
            </TVPowerOn>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

function Bubble({ m }: { m: Msg }) {
  const isUser = m.role === 'user';
  return (
    <div className={cx('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cx('relative max-w-[85%] min-w-0 rounded-sm border-3 px-3 pb-2 pt-5 text-body', isUser ? 'border-p4g-black bg-p4g-yellow text-p4g-black shadow-[4px_4px_0_var(--p4g-black)]' : 'border-p4g-black bg-[color:var(--p4g-msg)] text-[color:var(--p4g-msg-ink)] shadow-[4px_4px_0_var(--p4g-yellow)]')}>
        <span className={cx('absolute top-0 -translate-y-1/2 rounded-[2px] px-2 font-display text-cap font-bold', isUser ? 'right-2 bg-p4g-black text-p4g-yellow' : 'left-2 bg-p4g-yellow text-p4g-black')}>{isUser ? '你' : '残响'}</span>
        <span className="whitespace-pre-wrap break-words">{m.content.split(/(@\S+)/).map((s, i) => s.startsWith('@') ? <b key={i} className="text-[color:var(--p4g-orange-deep)]">{s}</b> : s)}</span>
        {m.interrupted && !isUser && <span className="ml-1 rounded-[2px] bg-white/15 px-1 text-2xs">已打断</span>}
      </div>
    </div>
  );
}

function Banner({ tone, text, sub, detail, onClose }: { tone: 'warn' | 'error'; text: string; sub: string; detail?: string | null; onClose?: () => void }) {
  return (
    <div className={cx('flex shrink-0 items-start gap-2 border-b-3 border-p4g-black px-4 py-2 text-meta', tone === 'warn' ? 'bg-p4g-orange text-p4g-black' : 'bg-p4g-red text-white')}>
      <div className="min-w-0 flex-1"><b>{text}</b> <span className="opacity-85">{sub}</span>{detail && <div className="mt-0.5 truncate font-mono text-2xs opacity-75">{detail}</div>}</div>
      {onClose && <button type="button" onClick={onClose} className="shrink-0 px-1 text-xs" aria-label="关闭提示">✕</button>}
    </div>
  );
}

function MiniDialog({ open, label, children }: { open: boolean; label: string; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div key={label} className="absolute inset-0 z-20 flex items-center justify-center bg-p4g-black/70 p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="alertdialog" aria-label={label} className="w-full max-w-xs rounded-sm border-3 border-p4g-yellow bg-[color:var(--p4g-msg)] p-4 shadow-[6px_6px_0_var(--p4g-orange)]" initial={{ scaleY: 0.05 }} animate={{ scaleY: 1 }} transition={{ duration: 0.22 }}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function CounselChatModal({ open, onClose, params }: OverlayProps) {
  const st = (params?.get('state') as CState) || (params?.get('dialog') ? 'live' : 'intro');
  return <CounselChat isOpen={open} onClose={onClose} initialState={st} initialDialog={(params?.get('dialog') as 'leave' | 'archive') || null} aiConfigured={params?.get('ai') !== '0'} netError={params?.get('neterr') === '1'} locked={params?.get('locked') === '1'} />;
}
