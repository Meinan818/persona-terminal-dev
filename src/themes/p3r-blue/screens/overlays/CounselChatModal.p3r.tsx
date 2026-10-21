/**
 * 谏言（真实 CounselChatModal）：P3R 剧情台词框版式 —— 夜色天鹅绒舞台 + 台词框气泡（残响 / 你）+ @同伴 + 打断 + 归档。
 * 状态：intro（开始对话）/ live（聊天 · 一小时窗口倒计时）/ expired（窗口已过）/ cooldown（冷却中，每 3 天一次）
 * 弹层：leave（要离开了吗？暂离 / 结束并归档 / 再想想 —— P3R 系统框三选项）/ archive（归档这次谈话？）
 *   #/overlay/bond-counsel-chat?state=intro|live|expired|cooldown&dialog=leave|archive&ai=0&neterr=1&locked=1
 *   ?fail=error|midError|truncate|offline 残响回复走 AI 失败分支（离线兜底 / 中断续写）
 * AI：残响回复 = useAIStream（思考约 2.4s「正在说…」→ 逐字）；回复中可直接插话（打断，保留已说部分）。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { EqBars } from '@blue/fx/motifs';
import { useEffect, useRef, useState } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { P3Button, P3Dialog, P3R, Portal, showToast, slantClip, tickClip, useEscape, useScrollLock } from '@blue/kit';
import { useAIStream, type AIFail } from '@blue/fx';
import { useBoldness } from '@blue/lib/prefs';
import { cx } from '@blue/lib/cx';
import { PK3_CONFIDANTS } from '@blue/adapters/pkg3';
import { Tarot } from '@blue/screens/pkg3/ui';

type CState = 'intro' | 'live' | 'expired' | 'cooldown';
interface Msg { id: string; role: 'user' | 'assistant'; content: string; interrupted?: boolean }
const SEED: Msg[] = [
  { id: 'm1', role: 'assistant', content: '你来了。今晚的月亮很亮——是什么压在你心上？' },
  { id: 'm2', role: 'user', content: '@由加莉 最近因为比赛的事，我们好像有点别扭。' },
  { id: 'm3', role: 'assistant', content: '你说的「别扭」，是她先沉默，还是你先把担心说成了责备？' },
];
const REPLY = '担心和责备有时候长得很像。先把「我怕你受伤」说出来，比「你又逞强」更接近你真正想说的话。她会听见的。';

export function CounselChat({ isOpen, onClose, initialState = 'intro', initialDialog = null, aiConfigured = true, netError = false, locked = false, fail }: {
  isOpen: boolean; onClose: () => void; initialState?: CState; initialDialog?: 'leave' | 'archive' | null; aiConfigured?: boolean; netError?: boolean; locked?: boolean; fail?: AIFail;
}) {
  const bold = useBoldness();
  const ai = useAIStream({ text: REPLY, fail, thinkMs: 1400, onDone: (t) => setMsgs((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', content: t }]) });
  const [state, setState] = useState<CState>(initialState);
  const [msgs, setMsgs] = useState<Msg[]>(initialState === 'live' ? SEED : []);
  const [input, setInput] = useState('');
  const [exitOpen, setExitOpen] = useState(initialDialog === 'leave');
  const [archiveConfirm, setArchiveConfirm] = useState(initialDialog === 'archive');
  const [archiving, setArchiving] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [connErr, setConnErr] = useState<string | null>(netError ? 'Failed to fetch' : null);
  const [left, setLeft] = useState(52 * 60 + 18);
  const listRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useEffect(() => { if (isOpen) { setState(initialState); setMsgs(initialState === 'live' ? SEED : []); setExitOpen(initialDialog === 'leave'); setArchiveConfirm(initialDialog === 'archive'); } }, [isOpen, initialState, initialDialog]);
  useEffect(() => { if (state !== 'live') return; const t = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000); return () => clearInterval(t); }, [state]);
  useEffect(() => { listRef.current?.scrollTo({ top: 1e6 }); }, [msgs, ai.text, ai.phase]);
  // 回复出错：退回离线兜底（真实：临时退回离线回复 + 顶部红条）
  useEffect(() => {
    if (ai.phase === 'error') {
      setConnErr(ai.error?.code === 'offline' ? 'offline' : 'Failed to fetch');
      setMsgs((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', content: ai.text ? `${ai.text}……` : '（离线回复）我在听。先把最想说的那句写下来。', interrupted: !!ai.text }]);
    }
  }, [ai.phase]); // eslint-disable-line react-hooks/exhaustive-deps
  const replying = ai.phase === 'thinking' || ai.phase === 'streaming';
  const sessionLive = state === 'live';
  const requestExit = () => (sessionLive && msgs.length > 0 ? setExitOpen(true) : onClose());
  useEscape(isOpen && !exitOpen && !archiveConfirm, requestExit);
  const interrupt = () => { if (!replying) return; ai.abort(); setMsgs((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', content: ai.text || '……', interrupted: true }]); };
  const send = () => {
    if (!input.trim() || !sessionLive) return;
    if (replying) interrupt();
    setMsgs((m) => [...m, { id: `u${Date.now()}`, role: 'user', content: input.trim() }]);
    setInput(''); window.setTimeout(() => ai.start(), 30);
  };
  const start = () => { setState('live'); setMsgs([{ id: 'm1', role: 'assistant', content: SEED[0].content }]); };
  const doArchive = () => { setArchiving(true); window.setTimeout(() => { setArchiving(false); setExitOpen(false); setArchiveConfirm(false); showToast('已归档到谏言归档库'); onClose(); }, 900); };
  const mm = String(Math.floor(left / 60)).padStart(2, '0'); const ss = String(left % 60).padStart(2, '0');
  const onInk = 'var(--p3r-cream)';

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div key="counsel" className="fixed inset-0 flex items-stretch justify-center wide:items-center wide:p-6" style={{ zIndex: 'var(--p3r-z-sheet)' as unknown as number, background: 'var(--p3r-scrim)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div aria-label="谏言" role="dialog" aria-modal="true" className="relative flex h-full w-full min-w-0 max-w-[720px] flex-col overflow-hidden wide:h-[min(86vh,820px)]"
              style={{ background: 'linear-gradient(180deg, var(--p3r-mulberry), rgb(var(--p3r-mulberry-rgb) / 0.94) 60%, rgb(var(--p3r-blue-deep-rgb) / 0.55))' }}
              initial={bold ? { opacity: 0, y: 24 } : { opacity: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
              <span aria-hidden className="pointer-events-none absolute -right-6 top-16 select-none font-cond text-[120px] leading-none" style={{ color: 'rgba(255,255,255,0.05)', transform: 'rotate(-12deg)' }}>COUNSEL</span>
              {/* 页头 */}
              <div className="relative flex shrink-0 items-center gap-3 px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top))]" style={{ color: onInk }}>
                <span aria-hidden className="absolute bottom-0 left-0 h-[3px] w-full" style={{ background: P3R.blue }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-heavy text-[22px]" style={{ color: 'var(--bk-bubble-b)' }}><span aria-hidden>✧</span>谏言</div>
                  <div className="mt-0.5 truncate text-[12px] opacity-75">房间的尽头，有人一直注视着你</div>
                </div>
                {sessionLive && <div className="shrink-0 text-right" aria-label={`窗口还剩 ${mm} 分 ${ss} 秒`} data-counsel-timer><div className="font-cond text-[11px] tracking-widest opacity-60">LEFT</div><div className="font-cond text-[24px] leading-none" style={{ color: 'var(--bk-bubble-a)' }}>{mm}:{ss}</div></div>}
                <button type="button" onClick={requestExit} disabled={archiving} aria-label="关闭" className="flex h-10 w-11 shrink-0 items-center justify-center font-black" style={{ clipPath: slantClip(8), background: P3R.blue, color: P3R.onBlue }}>✕</button>
              </div>
              {!aiConfigured && <Banner tone="warn" text="尚未配置 AI 密钥。" sub="现在是简版离线回复；到「设置 → AI 服务」填入密钥后，残响才会真正用心听你说。" />}
              {connErr && <Banner tone="error" text={connErr === 'offline' ? '当前离线。' : '无法连接到 AI 服务。'} sub="刚才这次临时退回了离线回复。网络恢复后再发一条试试。" detail={connErr === 'offline' ? null : connErr} onClose={() => setConnErr(null)} />}

              <div ref={listRef} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
                {state === 'intro' && (
                  <div className="flex h-full flex-col items-center justify-center text-center" style={{ color: onInk }}>
                    <motion.div initial={bold ? { opacity: 0, scale: 0.9 } : false} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.35 }} className="mb-5 font-cond text-[64px] leading-none" style={{ color: 'var(--bk-bubble-a)' }} aria-hidden>✧</motion.div>
                    <p className="text-[15px] leading-relaxed opacity-90">房间的尽头，有人一直注视着你——<br />准备好了就按下去，Ta 会先开口。</p>
                    <P3Button size="lg" corner className="mt-6" onClick={start}>开始对话</P3Button>
                    <p className="mt-6 max-w-[26rem] text-[12px] leading-relaxed opacity-70">每 3 天可以开一次，开始后一小时内随便聊，到点原文就散了；想留个念想可以归档成一小段摘要。关于哪位同伴，聊天时 @ Ta。</p>
                  </div>
                )}
                {(state === 'expired' || state === 'cooldown') && (
                  <div className="flex h-full flex-col items-center justify-center text-center" style={{ color: onInk }}>
                    <div className="mb-4 font-cond text-[70px] leading-none opacity-40" aria-hidden>✧</div>
                    <h4 className="font-heavy text-[24px]" style={{ color: 'var(--bk-bubble-b)' }}>{state === 'expired' ? '这次谈话已经过去了' : '谏言冷却中'}</h4>
                    {state === 'expired'
                      ? <p className="mt-2 text-[14px] leading-relaxed opacity-85">一小时的窗口已经合上，聊天记录随之散去。{locked ? <><br />这次的冷却会到 <b>10/24</b>，之后再来找残响。</> : <><br />想说的话还没说完，可以再开一次。</>}</p>
                      : <p className="mt-2 text-[14px] leading-relaxed opacity-85">每 3 天一次，留出余地给沉淀。<br />下一次可在 <b>10/24</b> 开启（还有 2 天）。</p>}
                    <div className="mt-6 flex gap-3">
                      {state === 'expired' && !locked && <P3Button corner onClick={start}>再开一次</P3Button>}
                      <P3Button tone="soft" onClick={onClose}>{state === 'expired' ? '离开' : '先回到房间'}</P3Button>
                    </div>
                  </div>
                )}
                {state === 'live' && (
                  <div className="grid grid-cols-1 gap-4">
                    {msgs.map((m) => <Bubble key={m.id} m={m} />)}
                    {replying && (
                      <div className="flex justify-start" role="status" aria-label="残响正在说">
                        <Speech who="残响" user={false}>{ai.phase === 'thinking' ? <span className="inline-flex items-end gap-[3px] align-middle" aria-hidden><EqBars bars={5} height={12} barWidth={2} gap={2} /><span className="ml-2 text-[13px] opacity-70">正在说…</span></span>
                          : <>{ai.text}<span aria-hidden className="bk-caret ml-0.5 inline-block h-[1.05em] w-[3px] translate-y-[3px]" style={{ background: P3R.blue }} /></>}</Speech>
                      </div>
                    )}
                    {ai.phase === 'truncated' && <div className="flex justify-start"><P3Button size="sm" onClick={ai.resume}>让 Ta 说完 ›</P3Button></div>}
                  </div>
                )}
              </div>

              {(state === 'live' || state === 'intro') && (
                <div className="relative shrink-0 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2" style={{ background: 'rgba(0,0,0,0.18)' }}>
                  <AnimatePresence>
                    {mentionOpen && (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-2 px-3 py-2" style={{ background: P3R.panel, clipPath: slantClip(10) }}>
                        <div className="mb-1 flex items-center justify-between text-[11px]"><span className="font-black tracking-widest" style={{ color: P3R.grey }}>关心的人</span><button type="button" onClick={() => setMentionOpen(false)} className="font-black" style={{ color: P3R.roseInk }}>收起</button></div>
                        <div className="no-scrollbar flex gap-2 overflow-x-auto">
                          {PK3_CONFIDANTS.filter((c) => !c.archivedAt).map((c) => (
                            <button key={c.id} type="button" onClick={() => { setInput((v) => `${v}@${c.name} `); setMentionOpen(false); }} className="flex shrink-0 flex-col items-center gap-1 px-1 py-1">
                              <Tarot arcanaId={c.arcanaId} width={34} /><span className="max-w-[56px] truncate text-[11px] font-black" style={{ color: P3R.ink }}>{c.name}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="flex items-end gap-2">
                    <button type="button" aria-label="选择同伴" disabled={!sessionLive} onClick={() => setMentionOpen((v) => !v)} className="flex h-11 w-11 shrink-0 items-center justify-center font-cond text-[22px] disabled:opacity-40" style={{ clipPath: slantClip(8), background: 'rgba(255,255,255,0.12)', color: 'var(--bk-bubble-a)' }}>@</button>
                    <textarea value={input} onChange={(e) => setInput(e.target.value)} disabled={!sessionLive} rows={1} aria-label="给残响的话" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                      placeholder={!sessionLive ? '先按上面的「开始对话」吧' : replying ? '想插话就直接说' : '把它说出来…'}
                      className="max-h-28 min-h-[44px] min-w-0 flex-1 resize-none px-3 py-2.5 text-[15px] outline-none disabled:opacity-50" style={{ background: 'var(--p3r-cream)', color: 'var(--p3r-mulberry)', clipPath: slantClip(6) }} />
                    {replying && <button type="button" onClick={interrupt} className="h-11 shrink-0 px-3 text-[14px] font-black" style={{ clipPath: slantClip(8), background: P3R.magenta, color: '#fff' }}>打断</button>}
                    <button type="button" onClick={send} disabled={!input.trim() || !sessionLive} className="h-11 shrink-0 px-4 text-[14px] font-black disabled:opacity-40" style={{ clipPath: slantClip(8), background: P3R.blue, color: P3R.onBlue }}>发送</button>
                  </div>
                  {sessionLive && (
                    <div className="mt-2 flex items-center justify-between text-[11px]" style={{ color: onInk }}>
                      <span className="opacity-60">{msgs.length} 条消息{replying ? ' · 正在说' : ''}</span>
                      <button type="button" onClick={() => setArchiveConfirm(true)} disabled={msgs.length === 0} className="font-black underline decoration-2 underline-offset-4 disabled:opacity-40" style={{ color: 'var(--bk-bubble-a)', textDecorationColor: 'var(--p3r-blue)' }}>归档这次谈话</button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
            <P3Dialog open={exitOpen} onClose={() => !archiving && setExitOpen(false)} variant="system" title="要离开了吗？" busy={archiving} busyText="正在归档…"
              description="可以先暂离，一小时内回来接着聊；也可以就此结束，把这次谈话归档成一小段摘要。"
              actions={[
                { label: '暂离 · 一小时内可回来', tone: 'primary', onClick: () => { setExitOpen(false); onClose(); } },
                { label: '结束对话 · 归档这次谈话', tone: 'danger', onClick: doArchive },
                { label: '再想想', onClick: () => setExitOpen(false) },
              ]} />
            <P3Dialog open={archiveConfirm} onClose={() => !archiving && setArchiveConfirm(false)} title="归档这次谈话？" description="会把刚才的聊天浓缩成 ≤100 字的摘要放进归档库，原文随窗口关闭散去。"
              confirmText="归档" cancelText="再想想" busy={archiving} busyText="正在压缩…" onConfirm={doArchive} />
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

function Speech({ who, user, children }: { who: string; user: boolean; children: React.ReactNode }) {
  return (
    <div className="relative max-w-[86%] min-w-0 pt-3">
      <span className={cx('absolute top-0 z-10 px-3 py-0.5 font-heavy text-[13px]', user ? 'right-3' : 'left-3')} style={{ clipPath: slantClip(5), background: user ? 'var(--p3r-cream)' : P3R.blue, color: user ? 'var(--p3r-mulberry)' : P3R.onBlue }}>{who}</span>
      <div className="bk-dialog-shape relative px-5 pb-3 pt-4 text-[15px] leading-relaxed" style={{ background: user ? P3R.blue : 'rgba(255,255,255,0.94)', color: user ? P3R.onBlue : 'var(--p3r-mulberry)', boxShadow: `0 0 0 2px ${user ? 'rgba(255,255,255,0.4)' : 'rgb(var(--p3r-blue-rgb) / 0.55)'}` }}>{children}</div>
    </div>
  );
}
function Bubble({ m }: { m: Msg }) {
  const isUser = m.role === 'user';
  return (
    <div className={cx('flex', isUser ? 'justify-end' : 'justify-start')}>
      <Speech who={isUser ? '你' : '残响'} user={isUser}>
        <span className="whitespace-pre-wrap break-words">{m.content.split(/(@\S+)/).map((s, i) => (s.startsWith('@') ? <b key={i} style={{ color: isUser ? 'var(--p3r-on-blue)' : 'var(--p3r-blue-deep)', textDecoration: 'underline' }}>{s}</b> : s))}</span>
        {m.interrupted && !isUser && <span className="ml-1 px-1 text-[10px] font-black" style={{ background: P3R.cyanPale, color: P3R.roseInk }}>已打断</span>}
      </Speech>
    </div>
  );
}
function Banner({ tone, text, sub, detail, onClose }: { tone: 'warn' | 'error'; text: string; sub: string; detail?: string | null; onClose?: () => void }) {
  return (
    <div className="relative flex shrink-0 items-start gap-2 px-4 py-2 text-[12px]" style={{ background: tone === 'warn' ? P3R.amber : P3R.magenta, color: tone === 'warn' ? 'var(--p3r-mulberry)' : '#fff' }}>
      <div className="min-w-0 flex-1"><b>{text}</b> <span className="opacity-90">{sub}</span>{detail && <div className="mt-0.5 truncate font-mono text-[10px] opacity-75">{detail}</div>}</div>
      {onClose && <button type="button" onClick={onClose} className="shrink-0 px-1 text-xs" aria-label="关闭提示">✕</button>}
    </div>
  );
}

export default function CounselChatModal({ open, onClose, params }: OverlayProps) {
  const st = (params?.get('state') as CState) || (params?.get('dialog') ? 'live' : 'intro');
  return <CounselChat isOpen={open} onClose={onClose} initialState={st} initialDialog={(params?.get('dialog') as 'leave' | 'archive') || null} aiConfigured={params?.get('ai') !== '0'} netError={params?.get('neterr') === '1'} locked={params?.get('locked') === '1'} fail={params?.get('fail') as AIFail} />;
}
