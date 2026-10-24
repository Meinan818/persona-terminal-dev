/**
 * 助手对话窗（真实 src/components/navigator/NavigatorWindow.tsx）—— P4G 对话框 1:1：
 *   · 背景 = 小镇实景（昼/夜）压暗 + 雪花 + 扫描线，像游戏里 3D 场景上叠 UI；
 *   · 助手发言 = P4G 消息框（暗棕半透明 + 黄/橙偏移底板 + 左上黄色名牌 + "> " 起首 + 右下橙色 ◉）；
 *   · 用户发言 = 白色圆头选项条（"Goho-M × 0" 式）；快捷 chips = P4G 选项列表（橙色圆头高亮）；
 *   · 头部 = 队伍头像框（黄框斜放）+ 白字描边人格名 + 黑色地点条「万能记录 · 有事直说」。
 * 子状态：人格菜单（?menu=persona）、动作确认卡（?demo=card）、选择要完成的任务（?sheet=complete / ?state=picker-empty）、
 * 录音（?state=recording | mic-error）、卡住提示（?state=stuck）、待发图片（?state=image）。
 * 注册为 overlays.NavigatorWindow 后，外壳底导中央◈短按 / 侧栏「助手」自动用本组件。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { OverlayProps } from '@yellow/registry/types';
import { Portal, useEscape, useScrollLock, P4Outline, P4DateWeather, useToast } from '@yellow/kit';
import { NoiseLayer, tvPowerVariants, TVFlash } from '@yellow/fx';
import { useLowMotion, usePrefs } from '@yellow/lib/prefs';
import { p4gAsset } from '@yellow/lib/asset';
import { cx } from '@yellow/lib/cx';
import { navigate } from '@yellow/shell/shellBus';
import { ACTION_META, CHAT_CARD_DEMO, type ChatMsg, type DraftKind } from '@yellow/mock/pkg6';
import { navigatorThemeOps, useNavigatorThemeData } from '@yellow/adapters/pkg6';
import { activePreset, attrLabel, updateSettings, useSettings } from '@yellow/screens/pkg6/settingsStore';
import { P6Sheet } from '@yellow/screens/pkg6/sheet';
import { ActionForm, emptyForm, type FormState } from './NavigatorActionForm.p4g';
import { Notebook } from './NavigatorNotebook.p4g';
import { CropDialog } from './ImageCropDialog.p4g';
import { Glyph } from './NavigatorPersonaEditor.p4g';
import { useBackHandler } from '@/utils/useBackHandler';
import '@yellow/screens/pkg6/pkg6.css';

type MicState = 'idle' | 'recording' | 'transcribing';
type FormKind = Exclude<DraftKind, 'completeTodo'>;
const OWN_DAY: Record<string, string> = { 'builtin-cat': '在窗台上晒了一下午太阳，顺便盯着楼下的雾', 'builtin-toaster': '自检完毕，今日面包烤得刚刚好', 'builtin-bear': '在电视里等了一整天，熊有点想你熊', 'c-glove': '把银器擦了三遍，等候主人吩咐' };

/** P4G 消息框（助手发言） */
function MsgBox({ name, children, last }: { name: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className="relative mr-6 min-w-0 pt-3 wide:mr-10">
      <div aria-hidden className="absolute inset-x-0 bottom-0 top-3 translate-x-[7px] translate-y-[7px] rounded-[10px] bg-[color:var(--p4g-msg-plate-2)]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 top-3 translate-x-[3px] translate-y-[3px] rounded-[10px] bg-[color:var(--p4g-msg-plate)]" />
      <span className="absolute left-3 top-0 z-[1] -skew-x-6 rounded-[3px] bg-p4g-yellow px-2.5 py-0.5 font-display text-meta font-bold text-p4g-black shadow-[2px_2px_0_var(--p4g-black)]"><span className="inline-block skew-x-6">{name}</span></span>
      <div className="relative rounded-[10px] border-2 border-[rgb(var(--p4g-black-rgb)/0.8)] bg-[color:var(--p4g-msg)] px-4 pb-3 pt-4 text-body leading-relaxed text-[color:var(--p4g-msg-ink)] night:border-p4g-yellow/60">
        <span aria-hidden className="mr-1 text-p4g-yellow">&gt;</span>{children}
        {last && <span aria-hidden className="p6-next-dot absolute -bottom-2 right-3 flex h-5 w-5 items-center justify-center rounded-pill border-[3px] border-p4g-orange bg-[color:var(--p4g-msg)]"><span className="h-1.5 w-1.5 rounded-pill bg-p4g-orange" /></span>}
      </div>
    </div>
  );
}
/** 白色圆头选项条（用户发言） */
function UserPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-10 flex justify-end wide:ml-16">
      <div className="max-w-full rounded-l-pill rounded-r-[4px] border-2 border-p4g-black bg-p4g-white py-2 pl-5 pr-4 text-body font-bold leading-snug text-p4g-black shadow-[3px_3px_0_var(--p4g-orange)] night:border-p4g-yellow">{children}</div>
    </div>
  );
}

function ActionCard({ m, busy, onConfirm, onEdit, onCancel }: { m: ChatMsg; busy: boolean; onConfirm: () => void; onEdit: () => void; onCancel: () => void }) {
  const meta = ACTION_META[m.draftKind!];
  const done = m.status === 'done', cancelled = m.status === 'cancelled', failed = m.status === 'failed';
  return (
    <div className={cx('relative mr-6 min-w-0 wide:mr-10', cancelled && 'opacity-60')}>
      <div className="relative overflow-hidden rounded-[4px] border-3 border-p4g-black bg-p4g-yellow text-p4g-black shadow-[5px_5px_0_var(--p4g-black)] night:border-p4g-yellow night:shadow-[5px_5px_0_var(--p4g-orange)]">
        <div className="flex min-w-0 items-center gap-2 bg-p4g-black px-3 py-1.5 text-p4g-yellow">
          <span aria-hidden>{meta.icon}</span><span className="min-w-0 flex-1 truncate font-display text-body font-bold">{meta.label}</span>
          <span className="shrink-0 font-display text-2xs font-bold italic tracking-[0.2em] text-p4g-white/70">{meta.en}</span>
        </div>
        <div className="space-y-0.5 px-3 py-2.5">
          {m.lines?.map((l, i) => <p key={i} className={cx('min-w-0 break-words', i === 0 ? 'font-display text-body font-bold' : 'text-meta')}>{l}</p>)}
        </div>
        {m.status === 'pending' && (
          <div className="flex gap-1.5 border-t-2 border-dashed border-p4g-black/30 px-3 py-2">
            <button type="button" disabled={busy} onClick={onConfirm} className="p4g-press flex-1 rounded-l-pill rounded-r-[3px] bg-p4g-black px-3 py-1.5 font-display text-body font-bold text-p4g-yellow disabled:opacity-60">{busy ? '记录中…' : '✓ 确认'}</button>
            <button type="button" disabled={busy} onClick={onEdit} className="p4g-press rounded-[3px] border-2 border-p4g-black bg-p4g-white px-3 py-1 font-display text-meta font-bold">编辑</button>
            <button type="button" disabled={busy} onClick={onCancel} className="rounded-[3px] px-2 py-1 font-display text-meta font-bold underline">取消</button>
          </div>
        )}
        {done && <span className="absolute right-2 top-9 -rotate-12 rounded-[3px] border-[3px] border-p4g-red px-2 py-0.5 font-display text-meta font-bold text-p4g-red">已记录 ✓</span>}
        {cancelled && <span className="absolute right-2 top-9 -rotate-6 rounded-[3px] border-2 border-p4g-black/60 px-2 font-display text-meta font-bold text-p4g-black/70">已取消</span>}
      </div>
      {(done || failed) && m.receipt && (
        <p className={cx('mt-1.5 flex min-w-0 items-start gap-1.5 rounded-[3px] px-2 py-1 text-meta font-bold', failed ? 'bg-p4g-danger text-p4g-white' : 'bg-p4g-black/70 text-p4g-white')}>
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
  useBackHandler(open, onClose);
  const q = params ?? new URLSearchParams();
  const { CHAT_MESSAGES, PICKER_TODOS } = useNavigatorThemeData();
  const qState = q.get('state');
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => q.get('demo') === 'card' ? [...CHAT_CARD_DEMO] : [...CHAT_MESSAGES]);
  const [older, setOlder] = useState(false);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [shot, setShot] = useState<string | null>(qState === 'image' ? p4gAsset('town-day.webp') : null);
  const [menu, setMenu] = useState(q.get('menu') === 'persona');
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
  useEscape(open && !menu && !picker && !form.open && !notebook, onClose);
  useEffect(() => {
    if (q.get('demo') === 'card') return;
    setMsgs(CHAT_MESSAGES);
  }, [CHAT_MESSAGES, q]);

  useEffect(() => { if (open) setTimeout(() => listRef.current?.scrollTo({ top: 1e6 }), 60); }, [open, msgs.length, typing]);
  const isP = !!q.get('menu') || !!q.get('sheet');
  void isP;

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
    if (!t && !shot) return;
    navigatorThemeOps.pushUser(t, shot ?? undefined);
    setInput(''); setShot(null);
    if (/卡住|不知道从哪|好难|拖延/.test(t)) { navigatorThemeOps.pushCat('嗯……这件事听起来有点大。'); setTimeout(() => setStuck('ask'), 1300); return; }
    const money = t.match(/(\d+(?:\.\d+)?)\s*(块|元|¥)/) || t.match(/¥\s*(\d+(?:\.\d+)?)/);
    if (money) {
      navigatorThemeOps.pushCard({
        kind: 'ledger',
        direction: 'expense',
        amount: Number(money[1]),
        note: t.replace(money[0], '').trim(),
        type: 'food',
        incomeType: 'labor',
        channel: '',
      });
      return;
    }
    navigatorThemeOps.pushCat('AI 对话接入等待确认；这条消息已经保存，尚未发起模型请求。');
  };
  const confirmCard = async (id: string) => {
    setBusyId(id);
    const target = msgs.find((message) => message.id === id);
    try {
      if (!target?.draft) {
        setMsgs((items) => items.map((item) => item.id === id ? { ...item, status: 'failed', receipt: '这张卡没有可执行的真实草稿，未写入任何数据。' } : item));
        return;
      }
      const receipt = await navigatorThemeOps.executeDraft(target.draft);
      navigatorThemeOps.updateCard(id, { cardStatus: 'done', receipt });
      setMsgs((items) => items.map((item) => item.id === id ? { ...item, status: 'done', receipt } : item));
      toast.success('已记录');
    } catch (error) {
      const receipt = `执行失败：${error instanceof Error ? error.message : '请重试'}`;
      navigatorThemeOps.updateCard(id, { cardStatus: 'pending', receipt });
      setMsgs((items) => items.map((item) => item.id === id ? { ...item, status: 'failed', receipt } : item));
      toast(receipt);
    } finally {
      setBusyId(null);
    }
  };
  const openForm = (kind: DraftKind) => { if (kind === 'completeTodo') { setPicker(true); return; } setForm({ kind, open: true }); };
  const jump = (page: string, tab?: string) => { onClose(); setTimeout(() => navigate(page, tab, { transition: 'noise' }), 120); };
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

  const showMic = !!s.audioModel;
  const personaBtn = (
    <button type="button" aria-label="人格菜单" onClick={() => setMenu((v) => !v)}
      className="p4g-press relative h-[60px] w-[60px] shrink-0 -rotate-6 border-[3px] border-p4g-yellow bg-p4g-black shadow-[4px_4px_0_var(--p4g-orange)]">
      <span className="absolute inset-[3px] flex items-center justify-center bg-gradient-to-b from-p4g-yellow-hi to-p4g-orange text-p4g-black"><Glyph id={preset.avatar} size={38} /></span>
      <span aria-hidden className="absolute -bottom-2 -right-2 flex h-5 w-5 rotate-6 items-center justify-center rounded-pill bg-p4g-yellow font-display text-2xs font-bold text-p4g-black">▾</span>
    </button>
  );

  const bg = prefs.mode === 'night' ? 'town-night' : 'town-day';
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="navwin" className="fixed inset-0 flex justify-end" style={{ zIndex: 'var(--p4g-z-sheet)' as unknown as number }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2, delay: 0.12 } }}>
            <div className="absolute inset-0 bg-[color:var(--p4g-scrim)]" onClick={onClose} />
            <motion.section role="dialog" aria-modal="true" aria-label="助手" variants={tvPowerVariants(low)} initial="off" animate="on" exit="off"
              className="relative flex h-full w-full min-w-0 flex-col overflow-hidden bg-p4g-black text-p4g-white wide:max-w-[480px] wide:border-l-[6px] wide:border-p4g-yellow">
              {/* 实景底 */}
              <picture aria-hidden className="pointer-events-none absolute inset-0">
                <source media="(min-width: 768px)" srcSet={p4gAsset(`${bg}.webp`)} />
                <img src={p4gAsset(`${bg}.webp`)} alt="" className="h-full w-full object-cover opacity-80" />
              </picture>
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-p4g-black/70 via-p4g-black/35 to-p4g-black/80" />
              <NoiseLayer opacity={0.06} />

              {/* 头部 */}
              <header className="relative z-[2] shrink-0 px-3 pb-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
                <div aria-hidden className="absolute inset-x-0 top-0 h-2 p4g-candy" />
                <div className="flex min-w-0 items-start gap-3 pt-1">
                  {personaBtn}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <P4Outline as="h2" size="clamp(22px, 6.4vw, 30px)" stroke={5} className="block max-w-full overflow-hidden text-ellipsis">{preset.name}</P4Outline>
                    <button type="button" onClick={() => setOwnOpen((v) => !v)} aria-label={`${preset.name}今天：${OWN_DAY[preset.id] ?? '安静地待着'}`}
                      className={cx('mt-0.5 block max-w-full text-left text-meta text-p4g-white/90', ownOpen ? '' : 'truncate')}>
                      <span className="font-bold text-p4g-yellow">{preset.name}今天：</span>{OWN_DAY[preset.id] ?? '安静地待着'}
                    </button>
                  </div>
                  <P4DateWeather variant="compact" weather={prefs.mode === 'night' ? 'night' : 'rain'} className="hidden shrink-0 sm:flex" />
                  <button type="button" aria-label="关闭助手" onClick={onClose} className="p4g-press flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border-3 border-p4g-black bg-p4g-yellow font-bold text-p4g-black shadow-[3px_3px_0_var(--p4g-orange)]">✕</button>
                </div>
                <div className="mt-2 inline-flex max-w-full -skew-x-12 bg-p4g-black/85 px-4 py-1 shadow-[3px_3px_0_var(--p4g-yellow)]"><span className="block skew-x-12 truncate font-display text-meta font-bold">万能记录 · 有事直说</span></div>

                {/* 人格菜单 */}
                <AnimatePresence>
                  {menu && (
                    <>
                      <div className="fixed inset-0 z-[3]" onClick={() => setMenu(false)} />
                      <motion.div key="menu" className="absolute left-3 top-[calc(100%-8px)] z-[4] w-[min(300px,calc(100%-24px))] origin-top-left"
                        initial={low ? { opacity: 0 } : { opacity: 0, scaleY: 0.2, skewX: -8 }} animate={low ? { opacity: 1 } : { opacity: 1, scaleY: 1, skewX: 0 }} exit={{ opacity: 0, scaleY: 0.6 }} transition={{ duration: 0.2, ease: [0.2, 0.9, 0.1, 1] }}>
                        <div aria-hidden className="absolute inset-0 translate-x-[6px] translate-y-[6px] rounded-[8px] bg-[color:var(--p4g-msg-plate)]" />
                        <div className="relative overflow-hidden rounded-[8px] border-2 border-p4g-black bg-[color:var(--p4g-msg)] p-2 night:border-p4g-yellow">
                          <div className="px-2 pb-1 pt-0.5 font-display text-meta font-bold text-p4g-yellow">切换人格</div>
                          <ul className="grid grid-cols-1 gap-0.5">
                            {s.personas.map((p) => {
                              const on = p.id === preset.id;
                              return (
                                <li key={p.id}><button type="button" onClick={() => { updateSettings({ activePersona: p.id }); setMenu(false); setMsgs((m) => [...m, { id: `h${Date.now()}`, role: 'divider' }]); catSay(p.id === 'builtin-bear' ? '锵锵——！帅熊登场熊！接下来交给熊吧！' : p.id === 'builtin-toaster' ? '接管确认。本机体已上线，开始执行陪伴与记录支援任务。' : p.id === 'builtin-cat' ? '（跳上桌子）吾辈回来了。继续。' : '在。今天有什么吩咐？', 400); }}
                                  className={cx('group flex w-full min-w-0 items-center gap-2 rounded-l-pill rounded-r-[3px] px-3 py-1.5 text-left font-display text-body font-bold', on ? 'bg-p4g-white text-p4g-black' : 'text-p4g-white hover:bg-p4g-orange hover:text-p4g-black')}>
                                  <Glyph id={p.avatar} size={18} /><span className="min-w-0 flex-1 truncate">{p.name}</span>{on && <span className="shrink-0 rounded-[2px] bg-p4g-black px-1 text-2xs text-p4g-yellow">当前</span>}
                                </button></li>
                              );
                            })}
                          </ul>
                          <div className="my-1.5 h-px bg-p4g-white/15" />
                          {[{ label: `上传头像（${preset.name}）`, onPick: () => avatarRef.current?.click() }, { label: '记事本', onPick: () => setNotebook(true) }, { label: '更多设置…', onPick: () => jump('settings', 'navigator') }].map((it) => (
                            <button key={it.label} type="button" onClick={() => { setMenu(false); it.onPick(); }} className="flex w-full min-w-0 items-center gap-2 rounded-l-pill rounded-r-[3px] px-3 py-1.5 text-left font-display text-body font-bold text-p4g-white hover:bg-p4g-orange hover:text-p4g-black">
                              <span aria-hidden className="h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-current" /><span className="truncate">{it.label}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
                <input ref={avatarRef} type="file" accept="image/*" className="sr-only" aria-label="上传助手头像" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCrop(URL.createObjectURL(f)); e.target.value = ''; }} />
              </header>

              {/* 消息流 */}
              <div ref={listRef} className="relative z-[1] min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 pb-4 pt-2">
                {!older ? (
                  <button type="button" onClick={() => { void navigatorThemeOps.loadOlder().then(setOlder); }} className="mx-auto block rounded-pill bg-p4g-black/60 px-3 py-1 text-cap font-bold text-p4g-white/80">上拉查看更早的对话</button>
                ) : null}
                {msgs.map((m, i) => {
                  if (m.role === 'divider') return <p key={m.id} className="text-center text-cap font-bold text-p4g-white/60">—— 早前的对话已收进记忆 ——</p>;
                  if (m.role === 'time') return <p key={m.id} className="text-center"><span className="rounded-pill bg-p4g-black/70 px-2.5 py-0.5 p4g-num text-cap text-p4g-yellow">{m.text}</span></p>;
                  const isLastCat = m.role === 'cat' && !msgs.slice(i + 1).some((x) => x.role === 'cat');
                  return (
                    <motion.div key={m.id} initial={low ? false : { opacity: 0, y: 10, x: m.role === 'user' ? 12 : -12 }} animate={{ opacity: 1, y: 0, x: 0 }} transition={{ duration: 0.22, ease: [0.2, 0.9, 0.1, 1] }}>
                      {m.role === 'cat' && <MsgBox name={preset.name} last={isLastCat && !typing}>{m.text}</MsgBox>}
                      {m.role === 'user' && <UserPill>{m.text}</UserPill>}
                      {m.role === 'image' && <div className="ml-10 flex justify-end"><img src={m.image} alt="发送的图片" className="max-h-48 rounded-[4px] border-3 border-p4g-white shadow-[4px_4px_0_var(--p4g-orange)]" /></div>}
                      {m.role === 'card' && <ActionCard m={m} busy={busyId === m.id} onConfirm={() => confirmCard(m.id)} onCancel={() => setMsgs((x) => x.map((y) => (y.id === m.id ? { ...y, status: 'cancelled' } : y)))}
                        onEdit={() => m.draftKind !== 'completeTodo' && setForm({ kind: m.draftKind as FormKind, open: true, editId: m.id, initial: m.draftKind === 'activity' ? { text: '图书馆看书两小时 + 帮菜菜子做手工', points: { ...emptyForm().points, knowledge: 2, kindness: 1 } } : undefined })} />}
                    </motion.div>
                  );
                })}
                {typing && (
                  <div role="status" aria-label="助手正在输入"><MsgBox name={preset.name}><span className="p6-typing inline-flex gap-1 align-middle text-p4g-yellow"><i /><i /><i /></span></MsgBox></div>
                )}
              </div>

              {/* 底部操作区 */}
              <div className="relative z-[2] shrink-0 border-t-[3px] border-p4g-yellow bg-p4g-black/90" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                {stuck !== 'off' && (
                  <div className="flex min-w-0 items-center gap-2 border-b-2 border-dashed border-p4g-white/20 px-3 py-2">
                    <button type="button" disabled={stuck === 'busy'} onClick={() => { setStuck('busy'); setTimeout(() => { setStuck('off'); setForm({ kind: 'bigdeal', open: true, initial: { title: '准备面试', steps: ['把简历打印两份', '查一下公司最近的新闻', '对着镜子练一遍自我介绍'] } }); }, 1000); }}
                      className="min-w-0 flex-1 rounded-l-pill rounded-r-[3px] bg-p4g-orange px-3 py-1.5 text-left font-display text-meta font-bold text-p4g-black">
                      {stuck === 'busy' ? '正在拆成能下手的小步…' : `听起来卡住了——要${preset.id === 'builtin-cat' ? '吾辈' : '我'}把它拆成小步吗？`}
                    </button>
                    <button type="button" aria-label="先不拆" onClick={() => setStuck('off')} className="shrink-0 p-1.5 text-body font-bold text-p4g-white/60">✕</button>
                  </div>
                )}
                <div className="p6-noscroll flex gap-1.5 overflow-x-auto px-3 pb-1.5 pt-2">
                  {(['activity', 'todo', 'ledger', 'completeTodo'] as DraftKind[]).map((k) => (
                    <button key={k} type="button" onClick={() => openForm(k)} className="shrink-0 rounded-l-pill rounded-r-[3px] border-2 border-p4g-white/25 px-3 py-1.5 font-display text-meta font-bold text-p4g-white hover:border-p4g-orange hover:bg-p4g-orange hover:text-p4g-black">{ACTION_META[k].icon} {ACTION_META[k].label}</button>
                  ))}
                  <button type="button" onClick={() => jump('astrology')} className="shrink-0 rounded-l-pill rounded-r-[3px] border-2 border-p4g-white/25 px-3 py-1.5 font-display text-meta font-bold text-p4g-white hover:border-p4g-orange hover:bg-p4g-orange hover:text-p4g-black">🔮 去抽塔罗</button>
                  <button type="button" onClick={() => jump('actions', 'activities')} className="shrink-0 rounded-l-pill rounded-r-[3px] border-2 border-p4g-yellow px-3 py-1.5 font-display text-meta font-bold text-p4g-yellow hover:bg-p4g-orange hover:text-p4g-black">📜 看总结</button>
                </div>
                {shot && (
                  <div className="flex min-w-0 items-center gap-2 px-3 pb-1.5">
                    <span className="relative shrink-0"><img src={shot} alt="待发送的图片" className="h-12 w-12 rounded-[3px] border-2 border-p4g-white object-cover" />
                      <button type="button" aria-label="移除图片" onClick={() => setShot(null)} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-pill bg-p4g-red text-2xs font-bold text-p4g-white">✕</button></span>
                    <span className="text-cap font-bold text-p4g-white/70">随下一条消息发出</span>
                  </div>
                )}
                {(micHint || mic !== 'idle') && (
                  <div className="px-3 pb-1">
                    {mic === 'recording' ? (
                      <div className="relative flex items-center justify-center gap-2 overflow-hidden rounded-[4px] bg-p4g-red py-2 font-display text-meta font-bold text-p4g-white">
                        <NoiseLayer opacity={0.15} />
                        <span className="relative flex h-3 w-3"><span className="p6-rec-ring absolute inset-0 rounded-pill bg-p4g-white" /><span className="relative h-3 w-3 rounded-pill bg-p4g-white" /></span>
                        <span className="relative">● REC　松手结束录音 · 上滑取消</span>
                      </div>
                    ) : mic === 'transcribing' ? <p className="text-center text-meta font-bold text-p4g-yellow">转写中…</p>
                      : <p className="text-center text-meta font-bold text-p4g-orange">{micHint}</p>}
                  </div>
                )}
                <div className="flex min-w-0 items-center gap-2 px-3 pb-3 pt-1">
                  <input ref={fileRef} type="file" accept="image/*" className="sr-only" aria-label="选择图片" onChange={(e) => { const f = e.target.files?.[0]; if (f) setShot(URL.createObjectURL(f)); e.target.value = ''; }} />
                  <button type="button" aria-label="发送图片" title="发送图片（票据 / 日程表 / 截图都行）" onClick={() => fileRef.current?.click()} className="p4g-press flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border-2 border-p4g-white/40 text-p4g-white"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round"><path d="M3 8h4l2-3h6l2 3h4v11H3z" /><circle cx="12" cy="13" r="3.5" /></svg></button>
                  <div className="relative min-w-0 flex-1">
                    <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
                      placeholder={`跟${preset.name}说点什么…`} aria-label={`给${preset.name}的消息`}
                      className="h-11 w-full min-w-0 rounded-l-pill rounded-r-[4px] border-2 border-p4g-yellow bg-[color:var(--p4g-msg)] px-4 text-body text-[color:var(--p4g-msg-ink)] placeholder:text-[color:var(--p4g-msg-ink)]/50 focus:outline-none focus:ring-2 focus:ring-p4g-orange" />
                  </div>
                  {showMic && (
                    <button type="button" aria-label={mic === 'recording' ? '松手结束录音' : '按住说话'} title={mic === 'recording' ? '松手结束' : '按住说话'}
                      onPointerDown={startMic} onPointerMove={moveMic} onPointerUp={endMic} onPointerCancel={endMic} onContextMenu={(e) => e.preventDefault()}
                      className={cx('flex h-11 w-11 shrink-0 touch-none select-none items-center justify-center rounded-sm border-2 text-h3', mic === 'recording' ? 'scale-110 border-p4g-red bg-p4g-red' : 'border-p4g-white/40')}><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg></button>
                  )}
                  <button type="button" onClick={send} disabled={!input.trim() && !shot} aria-label="发送" className="p4g-press flex h-11 shrink-0 items-center justify-center rounded-sm border-3 border-p4g-black bg-p4g-yellow px-3 font-display text-body font-bold text-p4g-black shadow-[3px_3px_0_var(--p4g-orange)] disabled:opacity-40">发送</button>
                </div>
              </div>
              <TVFlash low={low} />
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 完成任务：候选拣选 */}
      <P6Sheet open={open && picker} onClose={() => setPicker(false)} title="今天做到了哪件？" en="QUEST CLEAR · 选择要完成的任务" z="confirm">
        {qState === 'picker-empty' ? <p className="rounded-[4px] border-2 border-dashed border-p4g-line/40 px-3 py-6 text-center text-body text-p4g-ink-soft">今天没有待完成的任务——要么全清了，要么清单还空着。</p> : (
          <ul aria-label="选择要完成的任务" className="grid grid-cols-1 gap-[6px] pt-1">
            {PICKER_TODOS.map((t) => (
              <li key={t.id}><button type="button" onClick={() => { setPicker(false); navigatorThemeOps.pushCard({ kind: 'completeTodo', todoId: t.id, todoTitle: t.title }); }}
                className="group flex w-full min-w-0 items-center gap-3 rounded-[4px] bg-p4g-yellow-pale px-3 py-2.5 text-left text-p4g-black hover:bg-p4g-select hover:text-[color:var(--p4g-select-ink)] night:bg-p4g-surface night:text-p4g-ink">
                <span aria-hidden className="h-0 w-0 shrink-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-current opacity-0 group-hover:opacity-100" />
                <span className="min-w-0 flex-1 truncate font-display text-body font-bold">{t.title}</span>
                <span className="shrink-0 text-meta font-bold">{attrLabel(s, t.attribute)} +{t.points}{t.repeatDaily ? ' · 每日' : ''}</span>
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
