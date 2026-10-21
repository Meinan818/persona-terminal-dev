/**
 * 助手对话窗（真实 src/components/navigator/NavigatorWindow.tsx · bright 皮肤 = p3 频道「深夜站内信 / 白日水面」）粉白 P3R 版：
 *   · 舞台 = 樱色水面渐变 + 细水纹 + 樱色黄昏底图淡化（夜间翻深莓紫海面）；
 *   · 信头 = 白色斜切板（头像方框 + 超粗斜体人格名 + 「今天：…」一行 + 日期 HUD + 关闭）；
 *   · 助手气泡 = 平行四边形樱粉面 + 右下藕紫硬切小三角（真实 catBubbleStyle 315° 渐变 13px 硬切）；
 *   · 用户气泡 = 反向平行四边形玫红面；chips / 输入框 / 发送 = 斜切白条 + 玫红斜钮；
 *   · 动作确认卡 = 白色斜卡 + 墨色卡头（图标 / 动作名 / 英文签）+ 确认 · 编辑 · 取消 + 已记录印章。
 * AI 回复（useAIStream）：思考约 2.4s → 逐字（SKIP / 停止）→ 完成；中断恢复（关窗或「停止」→ 继续）、截断续写、出错重试、离线兜底、未配密钥引导。
 * 直达：?state=thinking|streaming|error|truncated|aborted|offline|nokey · ?fail=error|midError|truncate|offline|nokey（下一次发送按此失败一次）
 *       ?menu=persona · ?demo=card · ?sheet=complete · ?state=picker-empty|recording|mic-error|stuck|image
 * 注册为 overlays.NavigatorWindow 后，外壳底导中央猫钮短按 / 侧栏「助手」自动用本组件。
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { OverlayProps } from '@pink/registry/types';
import { Portal, useEscape, useScrollLock, useToast, P3R, SelectWedge, slantClip, tickClip } from '@pink/kit';
import { useAIStream, AIThinking, type AIFail, type AIPhase } from '@pink/fx';
import { useLowMotion, usePrefs } from '@pink/lib/prefs';
import { cx } from '@pink/lib/cx';
import { navigate } from '@pink/shell/shellBus';
import { ACTION_META, CHAT_CARD_DEMO, CHAT_SEED, PICKER_TODOS, type ChatMsg, type DraftKind } from '@pink/adapters/pkg6';
import { activePreset, attrLabel, updateSettings, useSettings } from '@pink/screens/pkg6/settingsStore';
import { P6Sheet } from '@pink/screens/pkg6/sheet';
import { DateHud, WaterLayer, popVariants, sampleImg } from '@pink/screens/pkg6/compat';
import { ActionForm, emptyForm, type FormState } from './NavigatorActionForm.p3r';
import { Notebook } from './NavigatorNotebook.p3r';
import { CropDialog } from './ImageCropDialog.p3r';
import { Glyph } from './NavigatorPersonaEditor.p3r';
import '@pink/screens/pkg6/pkg6.css';

type MicState = 'idle' | 'recording' | 'transcribing';
type FormKind = Exclude<DraftKind, 'completeTodo'>;
const OWN_DAY: Record<string, string> = { 'builtin-cat': '在窗台上晒了一下午太阳，顺便盯着楼下的樱花', 'builtin-toaster': '自检完毕，今日面包烤得刚刚好', 'builtin-bear': '在电视里等了一整天，熊有点想你熊', 'c-glove': '把银器擦了三遍，等候主人吩咐' };
const AI_STATES: AIPhase[] = ['thinking', 'streaming', 'error', 'truncated', 'aborted', 'nokey'];
const DEMO_Q = '最近总觉得时间不够用，晚上回家就只想躺着';
const replyOf = (pid: string) => pid === 'builtin-bear'
  ? '熊懂熊！白天把力气都用完了，晚上想躺着很正常熊。不如今晚只做一件小事：睡前把明天最想完成的一件事写进待办，写完就躺，熊陪你。要熊现在帮你记下来吗熊？'
  : pid === 'builtin-toaster'
    ? '收到。检测到能量不足状态。建议执行低功耗方案：今晚只保留一项十分钟以内的任务，其余延后。需要本机体为你生成一条待办吗？'
    : '哼……吾辈看你这几天确实跑得太满了。时间不够用，多半是事情都挤在一起。今晚别硬撑，只挑一件十分钟能做完的小事，做完就去躺着——这也算数。要吾辈把它记成明天的待办吗？';
const OFFLINE_FALLBACK = '（离线中）吾辈先记着这句话，等连上了再好好回你。累了就早点休息。';

/* ── 气泡：真实 bright 皮肤 1:1（平行四边形 + 藕紫硬切角） ── */
const CAT_CLIP = 'polygon(14px 0, 100% 0, calc(100% - 14px) 100%, 0 100%)';
const USER_CLIP = 'polygon(0 0, calc(100% - 14px) 0, 100% 100%, 14px 100%)';
function CatBubble({ name, children, last, tail }: { name?: string; children: React.ReactNode; last?: boolean; tail?: React.ReactNode }) {
  return (
    <div className="relative mr-8 min-w-0 wide:mr-12">
      {name && <div className="mb-0.5 pl-4 font-cond text-[11px] uppercase tracking-wider" style={{ color: 'var(--p3r-lilac-ink)' }}>{name}</div>}
      <div className="relative min-w-0 px-6 py-3 text-[15px] font-bold leading-relaxed" style={{ clipPath: CAT_CLIP, background: 'linear-gradient(315deg, var(--p3r-cyan) 13px, var(--p3r-cyan-pale) 13px)', color: P3R.ink }}>
        {children}
        {last && <span aria-hidden className="p6-next-dot ml-1.5 inline-block h-0 w-0 translate-y-[-1px] border-x-[5px] border-t-[7px] border-x-transparent align-middle" style={{ borderTopColor: P3R.blue }} />}
      </div>
      {tail}
    </div>
  );
}
function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-12 flex justify-end wide:ml-16">
      <div className="max-w-full px-6 py-2.5 text-[15px] font-bold leading-snug" style={{ clipPath: USER_CLIP, background: P3R.blue, color: P3R.onBlue }}>{children}</div>
    </div>
  );
}
const MiniBtn = ({ children, onClick, tone = 'rose', disabled }: { children: React.ReactNode; onClick?: () => void; tone?: 'rose' | 'soft' | 'ink'; disabled?: boolean }) => (
  <button type="button" disabled={disabled} onClick={onClick} className="p6-press relative inline-flex min-h-[32px] shrink-0 items-center px-3.5 text-[12px] font-black disabled:opacity-40"
    style={{ clipPath: slantClip(6), background: tone === 'rose' ? P3R.blue : tone === 'ink' ? P3R.ink : 'var(--p3r-cyan-pale)', color: tone === 'rose' ? P3R.onBlue : tone === 'ink' ? 'var(--p3r-on-ink)' : P3R.ink }}>{children}</button>
);

function ActionCard({ m, busy, onConfirm, onEdit, onCancel }: { m: ChatMsg; busy: boolean; onConfirm: () => void; onEdit: () => void; onCancel: () => void }) {
  const meta = ACTION_META[m.draftKind!];
  const done = m.status === 'done', cancelled = m.status === 'cancelled', failed = m.status === 'failed';
  return (
    <div className={cx('relative mr-8 min-w-0 pb-[6px] pr-[6px] wide:mr-12', cancelled && 'opacity-60')}>
      <span aria-hidden className="absolute bottom-0 left-[6px] right-0 top-[6px]" style={{ background: failed ? P3R.magenta : 'var(--p3r-slab-back)', opacity: failed ? 0.5 : 1, clipPath: CAT_CLIP }} />
      <div className="relative min-w-0 overflow-hidden" style={{ background: P3R.panel, clipPath: CAT_CLIP }}>
        <div className="flex min-w-0 items-center gap-2 px-6 py-1.5" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)' }}>
          <span aria-hidden className="font-cond text-[15px]" style={{ color: P3R.blue }}>{meta.icon}</span>
          <span className="min-w-0 flex-1 truncate font-heavy text-[15px]">{meta.label}</span>
          <span className="shrink-0 font-cond text-[11px] tracking-[0.2em]" style={{ color: P3R.cyan }}>{meta.en}</span>
        </div>
        <div className="space-y-0.5 px-6 py-2.5" style={{ color: P3R.ink }}>
          {m.lines?.map((l, i) => <p key={i} className={cx('min-w-0 break-words', i === 0 ? 'text-[15px] font-black' : 'text-[12px] font-bold')} style={i ? { color: P3R.inkSoft } : undefined}>{l}</p>)}
        </div>
        {m.status === 'pending' && (
          <div className="flex flex-wrap items-center gap-1.5 px-6 pb-3 pt-1">
            <MiniBtn disabled={busy} onClick={onConfirm}>{busy ? '记录中…' : '✓ 确认'}</MiniBtn>
            <MiniBtn tone="soft" disabled={busy} onClick={onEdit}>编辑</MiniBtn>
            <button type="button" disabled={busy} onClick={onCancel} className="min-h-[32px] px-2 text-[12px] font-bold underline disabled:opacity-40" style={{ color: P3R.grey }}>取消</button>
          </div>
        )}
        {done && <span className="absolute right-6 top-10 -rotate-12 px-2 py-0.5 font-heavy text-[12px]" style={{ color: 'var(--p3r-rose-ink)', boxShadow: `inset 0 0 0 2.5px ${P3R.blue}` }}>已记录 ✓</span>}
        {cancelled && <span className="absolute right-6 top-10 -rotate-6 px-2 font-heavy text-[12px]" style={{ color: P3R.grey, boxShadow: `inset 0 0 0 2px ${P3R.grey}` }}>已取消</span>}
      </div>
      {(done || failed) && m.receipt && (
        <p className="relative mt-1.5 flex min-w-0 items-start gap-1.5 px-4 py-1 text-[12px] font-bold" style={{ clipPath: slantClip(6), background: failed ? P3R.magenta : P3R.ink, color: failed ? '#fff' : 'var(--p3r-on-ink)' }}>
          <Glyph id="cat" size={14} className="mt-0.5 shrink-0" /><span className="min-w-0">{m.receipt}</span>
        </p>
      )}
    </div>
  );
}

export default function NavigatorWindow({ open, onClose, params }: OverlayProps) {
  const low = useLowMotion();
  const toast = useToast();
  const prefs = usePrefs();
  const s = useSettings();
  const preset = activePreset(s);
  useScrollLock(open);
  const q = params ?? new URLSearchParams();
  const qState = q.get('state');
  const aiDirect = (qState === 'offline' ? 'error' : AI_STATES.includes(qState as AIPhase) ? qState : null) as AIPhase | null;
  const failParam = (q.get('fail') as AIFail) ?? null;
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => {
    const base = q.get('demo') === 'card' ? [...CHAT_SEED.slice(3), ...CHAT_CARD_DEMO] : CHAT_SEED.slice(3);
    return aiDirect ? [...base, { id: 'tq', role: 'time', text: '今天 21:40' }, { id: 'uq', role: 'user', text: DEMO_Q }] : base;
  });
  const [older, setOlder] = useState(false);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [shot, setShot] = useState<string | null>(qState === 'image' ? sampleImg('day') : null);
  const [menu, setMenu] = useState(q.get('menu') === 'persona');
  const [menuFocus, setMenuFocus] = useState(0);
  const [ownOpen, setOwnOpen] = useState(false);
  const [picker, setPicker] = useState(q.get('sheet') === 'complete' || qState === 'picker-empty');
  const [form, setForm] = useState<{ kind: FormKind; open: boolean; editId?: string; initial?: Partial<FormState> }>({ kind: 'activity', open: false });
  const [notebook, setNotebook] = useState(false);
  const [crop, setCrop] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [stuck, setStuck] = useState<'off' | 'ask' | 'busy'>(qState === 'stuck' ? 'ask' : 'off');
  const [mic, setMic] = useState<MicState>(qState === 'recording' ? 'recording' : 'idle');
  const [micHint, setMicHint] = useState(qState === 'mic-error' ? '没能开始录音——检查一下麦克风权限' : '');
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const micStart = useRef<{ y: number; cancel: boolean } | null>(null);

  /* ── AI 回复（单条进行中的作业） ── */
  const [job, setJob] = useState<{ id: number; text: string; fail: AIFail; active: boolean }>(() => ({
    id: 0, text: replyOf(preset.id), active: !!aiDirect,
    fail: qState === 'offline' ? 'offline' : qState === 'error' ? 'error' : qState === 'truncated' ? 'truncate' : qState === 'nokey' ? 'nokey' : failParam,
  }));
  const ai = useAIStream({ text: job.text, fail: job.fail, initialPhase: aiDirect ?? 'idle', cps: 26 });
  const pendingStart = useRef(false);
  useEffect(() => { if (pendingStart.current) { pendingStart.current = false; ai.start(); } }, [job.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // 完成 → 落成一条普通助手消息
  useEffect(() => {
    if (job.active && ai.phase === 'done') {
      setMsgs((m) => [...m, { id: `a${job.id}-${Date.now()}`, role: 'cat', text: ai.full }]);
      setJob((j) => ({ ...j, active: false }));
    }
  }, [ai.phase]); // eslint-disable-line react-hooks/exhaustive-deps
  // 关窗 = 中断（回来可「继续」）
  useEffect(() => { if (!open && (ai.phase === 'thinking' || ai.phase === 'streaming')) ai.abort(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const aiBusy = job.active && (ai.phase === 'thinking' || ai.phase === 'streaming');
  const askAI = (text: string) => {
    pendingStart.current = true;
    setJob((j) => ({ id: j.id + 1, text, fail: failParam && j.id === 0 ? failParam : null, active: true }));
  };
  const keepOffline = () => { setMsgs((m) => [...m, { id: `o${Date.now()}`, role: 'cat', text: OFFLINE_FALLBACK }]); setJob((j) => ({ ...j, active: false })); ai.reset(); };
  const dropAI = () => { setJob((j) => ({ ...j, active: false })); ai.reset(); };

  const anySub = menu || picker || form.open || notebook || !!crop;
  useEscape(open && !anySub, onClose);
  useEffect(() => { if (open) setTimeout(() => listRef.current?.scrollTo({ top: 1e6 }), 60); }, [open, msgs.length, typing, ai.phase, job.id]);
  useEffect(() => { if (ai.phase === 'streaming') listRef.current?.scrollTo({ top: 1e6 }); }, [ai.text.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const catSay = (text: string, delay = 900) => {
    setTyping(true);
    const parts = s.realisticTyping ? text.split(/(?<=[。！？])/).filter(Boolean) : [text];
    parts.forEach((p, i) => setTimeout(() => {
      setMsgs((m) => [...m, { id: `c${Date.now()}${i}`, role: 'cat', text: p }]);
      if (i === parts.length - 1) setTyping(false);
    }, delay + (s.realisticTyping ? i * 1200 : 0)));
  };
  const send = () => {
    const t = input.trim();
    if ((!t && !shot) || aiBusy) return;
    const now = new Date();
    const add: ChatMsg[] = [{ id: `t${Date.now()}`, role: 'time', text: `今天 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` }];
    if (shot) add.push({ id: `i${Date.now()}`, role: 'image', image: shot });
    if (t) add.push({ id: `u${Date.now()}`, role: 'user', text: t });
    setMsgs((m) => [...m, ...add]); setInput(''); setShot(null);
    if (/卡住|不知道从哪|好难|拖延/.test(t)) { catSay('嗯……这件事听起来有点大。'); setTimeout(() => setStuck('ask'), 1300); return; }
    const money = t.match(/(\d+(?:\.\d+)?)\s*(块|元|¥)/) || t.match(/¥\s*(\d+(?:\.\d+)?)/);
    if (money) {
      setTyping(true);
      setTimeout(() => { setTyping(false); setMsgs((m) => [...m, { id: `k${Date.now()}`, role: 'card', draftKind: 'ledger', status: 'pending', lines: [`支出 ¥${money[1]}（餐饮）`, `备注：${t.replace(money[0], '').trim() || '—'}`] }]); }, 900);
      return;
    }
    askAI(t ? replyOf(preset.id) : '收到图片了。看起来像一张票据——要吾辈帮你记一笔账吗？');
  };
  const confirmCard = (id: string) => {
    setBusyId(id);
    setTimeout(() => {
      setBusyId(null);
      setMsgs((m) => m.map((x) => (x.id === id ? { ...x, status: 'done', receipt: x.draftKind === 'ledger' ? '记下了。本月还能花 ¥1,222。' : x.draftKind === 'bigdeal' ? '拆好了，第一步已经放进任务清单。' : '记下了，这次的成长吾辈都看见了。' } : x)));
      toast.success('已记录');
    }, 800);
  };
  const openForm = (kind: DraftKind) => { if (kind === 'completeTodo') { setPicker(true); return; } setForm({ kind, open: true }); };
  const jump = (page: string, tab?: string) => { onClose(); setTimeout(() => navigate(page, tab, { transition: 'wave' }), 120); };
  const startMic = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    micStart.current = { y: e.clientY, cancel: false }; setMicHint(''); setMic('recording');
  };
  const moveMic = (e: React.PointerEvent) => { if (micStart.current) micStart.current.cancel = micStart.current.y - e.clientY > 60; };
  const endMic = () => {
    if (!micStart.current) { if (mic === 'recording') setMic('idle'); return; }
    const c = micStart.current.cancel; micStart.current = null;
    if (c) { setMic('idle'); setMicHint('已取消'); return; }
    setMic('transcribing');
    setTimeout(() => { setMic('idle'); setInput((v) => (v ? `${v} ` : '') + '今天下雨，在家做了一顿咖喱'); }, 900);
  };
  const switchPersona = (pid: string) => {
    updateSettings({ activePersona: pid }); setMenu(false);
    setMsgs((m) => [...m, { id: `h${Date.now()}`, role: 'divider' }]);
    catSay(pid === 'builtin-bear' ? '锵锵——！帅熊登场熊！接下来交给熊吧！' : pid === 'builtin-toaster' ? '接管确认。本机体已上线，开始执行陪伴与记录支援任务。' : pid === 'builtin-cat' ? '（跳上桌子）吾辈回来了。继续。' : '在。今天有什么吩咐？', 400);
  };

  const showMic = !!s.audioModel;
  const menuItems = [
    ...s.personas.map((p) => ({ id: p.id, label: p.name, glyph: p.avatar, current: p.id === preset.id, run: () => switchPersona(p.id) })),
    { id: '__avatar', label: `上传头像（${preset.name}）`, run: () => { setMenu(false); avatarRef.current?.click(); } },
    { id: '__nb', label: '记事本', run: () => { setMenu(false); setNotebook(true); } },
    { id: '__more', label: '更多设置…', run: () => { setMenu(false); jump('settings', 'navigator'); } },
  ];

  /* AI 进行中气泡（各 phase） */
  const aiBubble = () => {
    if (!job.active) return null;
    const ph = ai.phase;
    if (ph === 'idle') return null;
    if (ph === 'thinking') return <CatBubble name={preset.name}><AIThinking label={`${preset.name}正在想…`} sub="THINKING" ring={false} /></CatBubble>;
    if (ph === 'nokey') return (
      <CatBubble name="SYSTEM" tail={<div className="mt-1.5 flex flex-wrap gap-1.5 pl-3"><MiniBtn onClick={() => jump('settings', 'ai')}>前往 AI 服务 ›</MiniBtn><MiniBtn tone="soft" onClick={() => jump('settings', 'navigator')}>助手设置</MiniBtn><MiniBtn tone="soft" onClick={dropAI}>先不了</MiniBtn></div>}>
        <span className="block font-black" style={{ color: 'var(--p3r-coral-ink)' }}>还没配置对话模型的密钥</span>
        <span className="block text-[13px] font-bold" style={{ color: P3R.inkSoft }}>chips 快捷动作照常能用；想自由聊天，先去「设置 · AI 服务」填一个密钥。</span>
      </CatBubble>
    );
    if (ph === 'error') {
      const offline = ai.error?.code === 'offline';
      return (
        <CatBubble name={preset.name} tail={
          <div className="mt-1.5 flex flex-wrap gap-1.5 pl-3">
            <MiniBtn onClick={ai.retry}>重试</MiniBtn>
            {offline && <MiniBtn tone="soft" onClick={keepOffline}>先离线记下</MiniBtn>}
            <MiniBtn tone="soft" onClick={dropAI}>算了</MiniBtn>
          </div>}>
          {ai.text && <span className="mb-1 block">{ai.text}<span style={{ color: P3R.grey }}>……</span></span>}
          <span className="flex items-center gap-2 text-[13px] font-black" style={{ color: 'var(--p3r-coral-ink)' }}>
            <span aria-hidden className="h-[11px] w-[8px] shrink-0" style={{ background: P3R.magenta, clipPath: tickClip }} />
            {offline ? '当前离线 · 回复没能送达' : ai.text ? '回复中断：连接被重置' : '回复失败：对话服务暂时连不上'}
          </span>
        </CatBubble>
      );
    }
    const stopped = ph === 'aborted' || ph === 'truncated';
    return (
      <CatBubble name={preset.name} tail={
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-3">
          {ph === 'streaming' && <><MiniBtn tone="soft" onClick={ai.skip}>SKIP ›</MiniBtn><MiniBtn tone="ink" onClick={ai.abort}>■ 停止</MiniBtn></>}
          {ph === 'aborted' && <><span className="text-[12px] font-bold" style={{ color: P3R.grey }}>回复被打断了</span><MiniBtn onClick={ai.resume}>继续 ›</MiniBtn><MiniBtn tone="soft" onClick={ai.skip}>直接看全文</MiniBtn></>}
          {ph === 'truncated' && <><span className="text-[12px] font-bold" style={{ color: P3R.grey }}>回复被截断了</span><MiniBtn onClick={ai.resume}>接着写 ›</MiniBtn></>}
        </div>}>
        {ai.text}
        {ph === 'streaming' && <span aria-hidden className="pk-caret ml-0.5 inline-block h-[1.05em] w-[3px] translate-y-[3px]" style={{ background: P3R.blue }} />}
        {stopped && <span style={{ color: P3R.grey }}>……</span>}
      </CatBubble>
    );
  };

  const night = prefs.mode === 'night';
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="navwin" className="fixed inset-0 flex justify-end" style={{ zIndex: 'var(--p3r-z-sheet)' as unknown as number }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2, delay: 0.1 } }}>
            <div className="absolute inset-0" style={{ background: 'var(--p3r-scrim)' }} onClick={onClose} />
            <motion.section role="dialog" aria-modal="true" aria-label="助手" variants={popVariants(low)} initial="off" animate="on" exit="off"
              className="relative flex h-full w-full min-w-0 flex-col overflow-hidden wide:max-w-[480px]"
              style={{ background: 'linear-gradient(168deg, var(--p3r-bg) 0%, var(--p3r-cyan-faint) 52%, var(--p3r-cyan-pale) 100%)' }}>
              {/* 舞台：樱色黄昏底图淡化 + 水纹 + 左缘玫红细带 */}
              <img aria-hidden src={sampleImg(night ? 'night' : 'day')} alt="" className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] w-full object-cover" style={{ opacity: night ? 0.35 : 0.28, maskImage: 'linear-gradient(to top, #000 30%, transparent)', WebkitMaskImage: 'linear-gradient(to top, #000 30%, transparent)' }} />
              <WaterLayer opacity={0.7} drift />
              <span aria-hidden className="pointer-events-none absolute left-0 top-0 hidden h-full w-[5px] wide:block" style={{ background: P3R.blue }} />
              <span aria-hidden className="pointer-events-none absolute -right-6 top-[88px] select-none font-cond text-[86px] leading-none" style={{ color: 'var(--p3r-ghost)', transform: 'rotate(-12deg)' }}>NAVI</span>

              {/* 信头 */}
              <header className="relative z-[2] shrink-0 px-3 pb-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
                <div className="relative pb-[6px] pr-[6px]">
                  <span aria-hidden className="absolute bottom-0 left-[6px] right-0 top-[6px]" style={{ background: 'var(--p3r-slab-back)', clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)' }} />
                  <div className="relative flex min-w-0 items-center gap-3 px-4 py-2.5" style={{ background: P3R.panel, clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)' }}>
                    <button type="button" aria-label="人格菜单" aria-expanded={menu} onClick={() => { setMenu((v) => !v); setMenuFocus(0); }}
                      className="p6-press relative flex h-[52px] w-[52px] shrink-0 items-center justify-center" style={{ background: 'var(--p3r-cyan-pale)', color: 'var(--p3r-rose-ink)', clipPath: slantClip(8) }}>
                      <Glyph id={preset.avatar} size={32} />
                      <span aria-hidden className="absolute bottom-0 right-0 h-[10px] w-[14px]" style={{ background: P3R.blue, clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-heavy text-[clamp(20px,6vw,26px)] leading-tight" style={{ color: P3R.ink }}>{preset.name}<span aria-hidden style={{ color: P3R.magenta }}>.</span></h2>
                      <button type="button" onClick={() => setOwnOpen((v) => !v)} aria-label={`${preset.name}今天：${OWN_DAY[preset.id] ?? '安静地待着'}`}
                        className={cx('block max-w-full text-left text-[12px] font-bold', ownOpen ? 'whitespace-normal' : 'truncate')} style={{ color: P3R.inkSoft }}>
                        <span style={{ color: 'var(--p3r-rose-ink)' }}>{preset.name}今天：</span>{OWN_DAY[preset.id] ?? '安静地待着'}
                      </button>
                    </div>
                    <DateHud weather={night ? 'night' : 'rain'} className="hidden shrink-0 sm:flex" />
                    <button type="button" aria-label="关闭助手" onClick={onClose} className="p6-press flex h-10 w-10 shrink-0 items-center justify-center text-[16px] font-black" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(6) }}>✕</button>
                  </div>
                </div>
                <div className="mt-1.5 inline-flex max-w-full items-center gap-2 px-4 py-1" style={{ background: P3R.ink, clipPath: slantClip(6) }}>
                  <span aria-hidden className="h-[10px] w-[7px]" style={{ background: P3R.blue, clipPath: tickClip }} />
                  <span className="truncate text-[12px] font-black" style={{ color: 'var(--p3r-on-ink)' }}>万能记录 · 有事直说</span>
                </div>

                {/* 人格菜单（P3R 暂停菜单子项 + 光标楔） */}
                <AnimatePresence>
                  {menu && (
                    <>
                      <div className="fixed inset-0 z-[3]" onClick={() => setMenu(false)} />
                      <motion.div key="menu" role="menu" aria-label="人格菜单" className="absolute left-3 top-[calc(100%-6px)] z-[4] w-[min(310px,calc(100%-24px))] origin-top-left pb-[6px] pr-[6px]"
                        onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setMenuFocus((f) => (f + 1) % menuItems.length); } if (e.key === 'ArrowUp') { e.preventDefault(); setMenuFocus((f) => (f - 1 + menuItems.length) % menuItems.length); } if (e.key === 'Enter') menuItems[menuFocus]?.run(); if (e.key === 'Escape') setMenu(false); }}
                        initial={low ? { opacity: 0 } : { opacity: 0, x: -16, scale: 0.94 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2, ease: [0.2, 0.9, 0.1, 1] }}>
                        <span aria-hidden className="absolute bottom-0 left-[6px] right-0 top-[6px]" style={{ background: 'var(--p3r-slab-back)', clipPath: slantClip(12) }} />
                        <div className="relative px-3 pb-3 pt-2.5" style={{ background: P3R.panel, clipPath: slantClip(12) }}>
                          <div className="flex items-center gap-2 px-2 pb-1.5"><span className="font-heavy text-[14px]" style={{ color: P3R.ink }}>切换人格</span><span className="font-cond text-[10px] tracking-wider" style={{ color: 'var(--p3r-lilac-ink)' }}>PERSONA</span><span className="h-px flex-1" style={{ background: P3R.ink, opacity: 0.3 }} /></div>
                          {menuItems.map((it, i) => {
                            const on = menuFocus === i;
                            const sep = it.id === '__avatar';
                            return (
                              <div key={it.id}>
                                {sep && <div className="my-1.5 h-px" style={{ background: 'rgb(var(--p3r-cyan-rgb) / 0.4)' }} />}
                                <button type="button" role="menuitem" onPointerEnter={() => setMenuFocus(i)} onFocus={() => setMenuFocus(i)} onClick={it.run}
                                  className="relative flex min-h-[40px] w-full min-w-0 items-center gap-2 px-4 text-left">
                                  {on && <SelectWedge className="-left-1 -right-2 inset-y-0" />}
                                  {'glyph' in it ? <span className="relative shrink-0" style={{ color: on ? 'var(--p3r-mulberry)' : 'var(--p3r-rose-ink)' }}><Glyph id={it.glyph as string} size={18} /></span>
                                    : <span aria-hidden className="relative h-0 w-0 shrink-0 border-y-[5px] border-l-[8px] border-y-transparent" style={{ borderLeftColor: on ? 'var(--p3r-mulberry)' : P3R.blue }} />}
                                  <span className="relative min-w-0 flex-1 truncate font-heavy text-[15px]" style={{ color: on ? 'var(--p3r-mulberry)' : P3R.ink }}>{it.label}</span>
                                  {'current' in it && it.current && <span className="relative shrink-0 px-1.5 font-cond text-[10px]" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(3) }}>NOW</span>}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
                <input ref={avatarRef} type="file" accept="image/*" className="sr-only" aria-label="上传助手头像" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCrop(URL.createObjectURL(f)); e.target.value = ''; }} />
              </header>

              {/* 消息流 */}
              <div ref={listRef} className="relative z-[1] min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 pb-4 pt-2">
                {!older && (
                  <button type="button" onClick={() => { setOlder(true); setMsgs((m) => [...CHAT_SEED.slice(0, 3), ...m]); }} className="mx-auto block px-4 py-1 text-[11px] font-bold" style={{ background: 'var(--p3r-panel-glass)', color: P3R.inkSoft, clipPath: slantClip(5) }}>上拉查看更早的对话</button>
                )}
                {msgs.map((m, i) => {
                  if (m.role === 'divider') return <p key={m.id} className="flex items-center gap-2 text-[11px] font-bold" style={{ color: P3R.grey }}><span className="h-px flex-1" style={{ background: 'currentColor', opacity: 0.4 }} />早前的对话已收进记忆<span className="h-px flex-1" style={{ background: 'currentColor', opacity: 0.4 }} /></p>;
                  if (m.role === 'time') return <p key={m.id} className="text-center"><span className="inline-block px-3 py-0.5 font-cond text-[12px] tabular" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(4) }}>{m.text}</span></p>;
                  const isLastCat = m.role === 'cat' && !msgs.slice(i + 1).some((x) => x.role === 'cat') && !job.active;
                  const prevCat = m.role === 'cat' && msgs[i - 1]?.role === 'cat';
                  return (
                    <motion.div key={m.id} initial={low ? false : { opacity: 0, y: 10, x: m.role === 'user' ? 14 : -14 }} animate={{ opacity: 1, y: 0, x: 0 }} transition={{ duration: 0.22, ease: [0.2, 0.9, 0.1, 1] }}>
                      {m.role === 'cat' && <CatBubble name={prevCat ? undefined : preset.name} last={isLastCat && !typing}>{m.text}</CatBubble>}
                      {m.role === 'user' && <UserBubble>{m.text}</UserBubble>}
                      {m.role === 'image' && <div className="ml-12 flex justify-end"><img src={m.image} alt="发送的图片" className="max-h-48 object-cover" style={{ clipPath: USER_CLIP }} /></div>}
                      {m.role === 'card' && <ActionCard m={m} busy={busyId === m.id} onConfirm={() => confirmCard(m.id)} onCancel={() => setMsgs((x) => x.map((y) => (y.id === m.id ? { ...y, status: 'cancelled' } : y)))}
                        onEdit={() => m.draftKind !== 'completeTodo' && setForm({ kind: m.draftKind as FormKind, open: true, editId: m.id, initial: m.draftKind === 'activity' ? { text: '图书馆看书两小时 + 帮由加莉做手工', points: { ...emptyForm().points, knowledge: 2, kindness: 1 } } : undefined })} />}
                    </motion.div>
                  );
                })}
                {typing && <div role="status" aria-label="助手正在输入"><CatBubble name={preset.name}><span className="p6-typing inline-flex gap-1 align-middle" style={{ color: P3R.blue }}><i /><i /><i /></span></CatBubble></div>}
                {aiBubble()}
              </div>

              {/* 底部操作区 */}
              <div className="relative z-[2] shrink-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)', background: 'linear-gradient(to top, var(--p3r-cyan-pale) 60%, transparent)' }}>
                {stuck !== 'off' && (
                  <div className="flex min-w-0 items-center gap-2 px-3 pt-2">
                    <button type="button" disabled={stuck === 'busy'} onClick={() => { setStuck('busy'); setTimeout(() => { setStuck('off'); setForm({ kind: 'bigdeal', open: true, initial: { title: '准备面试', steps: ['把简历打印两份', '查一下公司最近的新闻', '对着镜子练一遍自我介绍'] } }); }, 1000); }}
                      className="relative min-w-0 flex-1 px-4 py-2 text-left text-[13px] font-black" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(8) }}>
                      <span className="mr-1.5" style={{ color: P3R.blue }}>◆</span>{stuck === 'busy' ? '正在拆成能下手的小步…' : `听起来卡住了——要${preset.id === 'builtin-cat' ? '吾辈' : '我'}把它拆成小步吗？`}
                    </button>
                    <button type="button" aria-label="先不拆" onClick={() => setStuck('off')} className="shrink-0 p-1.5 text-[15px] font-black" style={{ color: P3R.grey }}>✕</button>
                  </div>
                )}
                <div className="p6-noscroll flex gap-1.5 overflow-x-auto px-3 pb-1.5 pt-2">
                  {(['activity', 'todo', 'ledger', 'completeTodo'] as DraftKind[]).map((k) => (
                    <button key={k} type="button" onClick={() => openForm(k)} className="p6-press shrink-0 px-4 py-1.5 text-[13px] font-black" style={{ background: P3R.panel, color: P3R.ink, clipPath: 'polygon(9px 0, 100% 0, calc(100% - 9px) 100%, 0 100%)' }}>
                      <span className="mr-1 font-cond" style={{ color: 'var(--p3r-rose-ink)' }}>{ACTION_META[k].icon}</span>{ACTION_META[k].label}
                    </button>
                  ))}
                  <button type="button" onClick={() => jump('astrology')} className="p6-press shrink-0 px-4 py-1.5 text-[13px] font-black" style={{ background: P3R.panel, color: P3R.ink, clipPath: 'polygon(9px 0, 100% 0, calc(100% - 9px) 100%, 0 100%)' }}><span className="mr-1" style={{ color: 'var(--p3r-lilac-ink)' }}>☾</span>去抽塔罗</button>
                  <button type="button" onClick={() => jump('actions', 'activities')} className="p6-press shrink-0 px-4 py-1.5 text-[13px] font-black" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: 'polygon(9px 0, 100% 0, calc(100% - 9px) 100%, 0 100%)' }}>看总结 ›</button>
                </div>
                {shot && (
                  <div className="flex min-w-0 items-center gap-2 px-3 pb-1.5">
                    <span className="relative shrink-0"><img src={shot} alt="待发送的图片" className="h-12 w-12 object-cover" style={{ clipPath: slantClip(6) }} />
                      <button type="button" aria-label="移除图片" onClick={() => setShot(null)} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-white" style={{ background: P3R.magenta }}>✕</button></span>
                    <span className="text-[11px] font-bold" style={{ color: P3R.inkSoft }}>随下一条消息发出</span>
                  </div>
                )}
                {(micHint || mic !== 'idle') && (
                  <div className="px-3 pb-1">
                    {mic === 'recording' ? (
                      <div className="relative flex items-center justify-center gap-2 overflow-hidden py-2 text-[13px] font-black" style={{ background: P3R.magenta, color: '#fff', clipPath: slantClip(8) }}>
                        <span className="relative flex h-3 w-3"><span className="p6-rec-ring absolute inset-0 rounded-full bg-white" /><span className="relative h-3 w-3 rounded-full bg-white" /></span>
                        <span className="relative"><span className="font-cond tracking-wider">REC</span>　松手结束录音 · 上滑取消</span>
                      </div>
                    ) : mic === 'transcribing' ? <p className="text-center text-[12px] font-black" style={{ color: 'var(--p3r-rose-ink)' }}>转写中…</p>
                      : <p className="text-center text-[12px] font-black" style={{ color: 'var(--p3r-coral-ink)' }}>{micHint}</p>}
                  </div>
                )}
                <div className="flex min-w-0 items-center gap-2 px-3 pb-3 pt-1">
                  <input ref={fileRef} type="file" accept="image/*" className="sr-only" aria-label="选择图片" onChange={(e) => { const f = e.target.files?.[0]; if (f) setShot(URL.createObjectURL(f)); e.target.value = ''; }} />
                  <button type="button" aria-label="发送图片" title="发送图片（票据 / 日程表 / 截图都行）" onClick={() => fileRef.current?.click()} className="p6-press flex h-11 w-11 shrink-0 items-center justify-center" style={{ background: P3R.panel, color: P3R.ink, clipPath: slantClip(7) }}><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round"><path d="M3 8h4l2-3h6l2 3h4v11H3z" /><circle cx="12" cy="13" r="3.5" /></svg></button>
                  <div className="relative min-w-0 flex-1">
                    <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
                      placeholder={aiBusy ? `${preset.name}正在回复…` : `跟${preset.name}说点什么…`} aria-label={`给${preset.name}的消息`}
                      className="h-12 w-full min-w-0 px-5 text-[15px] font-bold outline-none placeholder:text-p3r-grey/80" style={{ background: P3R.panel, color: P3R.ink, clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)' }} />
                  </div>
                  {showMic && (
                    <button type="button" aria-label={mic === 'recording' ? '松手结束录音' : '按住说话'} title={mic === 'recording' ? '松手结束' : '按住说话'}
                      onPointerDown={startMic} onPointerMove={moveMic} onPointerUp={endMic} onPointerCancel={endMic} onContextMenu={(e) => e.preventDefault()}
                      className={cx('flex h-11 w-11 shrink-0 touch-none select-none items-center justify-center transition-transform', mic === 'recording' && 'scale-110')}
                      style={{ background: mic === 'recording' ? P3R.magenta : P3R.panel, color: mic === 'recording' ? '#fff' : P3R.ink, clipPath: slantClip(7) }}><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg></button>
                  )}
                  <button type="button" onClick={send} disabled={(!input.trim() && !shot) || aiBusy} aria-label="发送" className="p6-press flex h-12 w-16 shrink-0 items-center justify-center text-[15px] font-black disabled:opacity-40" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)' }}>发送</button>
                </div>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 完成任务：候选拣选 */}
      <P6Sheet open={open && picker} onClose={() => setPicker(false)} title="今天做到了哪件？" en="QUEST CLEAR" z="confirm">
        {qState === 'picker-empty' ? <div className="px-4 py-8 text-center text-[14px] font-bold" style={{ background: 'var(--p3r-row)', color: P3R.inkSoft, clipPath: slantClip(14) }}>今天没有待完成的任务——要么全清了，要么清单还空着。</div> : (
          <ul aria-label="选择要完成的任务" className="grid grid-cols-1 gap-[6px] pt-1">
            {PICKER_TODOS.map((t) => (
              <li key={t.id}><button type="button" onClick={() => { setPicker(false); setMsgs((m) => [...m, { id: `k${Date.now()}`, role: 'card', draftKind: 'completeTodo', status: 'pending', lines: [`把「${t.title}」标记为完成`, '完成加点与反馈按任务设置发放'] }]); }}
                className="p6-row group relative flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left">
                <span aria-hidden className="p6-row-bg absolute inset-0" style={{ clipPath: slantClip(10) }} />
                <span aria-hidden className="p6-row-wedge pointer-events-none absolute -left-1.5 top-1/2 h-[24px] w-[22px] -translate-y-1/2"><SelectWedge className="inset-0" /></span>
                <span className="p6-row-label relative min-w-0 flex-1 truncate text-[15px] font-black">{t.title}</span>
                <span className="p6-row-hint relative shrink-0 text-[12px] font-bold">{attrLabel(s, t.attribute)} +{t.points}{t.repeatDaily ? ' · 每日' : ''}</span>
              </button></li>
            ))}
          </ul>
        )}
      </P6Sheet>
      <ActionForm kind={form.kind} open={open && form.open} initial={form.initial} onClose={() => setForm((f) => ({ ...f, open: false }))}
        onSubmit={(lines) => {
          if (form.editId) setMsgs((m) => m.map((x) => (x.id === form.editId ? { ...x, lines } : x)));
          else setMsgs((m) => [...m, { id: `k${Date.now()}`, role: 'card', draftKind: form.kind, status: 'pending', lines }]);
        }} />
      <Notebook open={open && notebook} onClose={() => setNotebook(false)} />
      <CropDialog open={!!crop} src={crop ?? undefined} title={`调整${preset.name}的头像`} onClose={() => setCrop(null)}
        onDone={(url) => { updateSettings({ personas: s.personas.map((p) => (p.id === preset.id ? { ...p, avatar: url } : p)) }); setCrop(null); toast.success('头像已更新'); }} />
    </Portal>
  );
}
