/**
 * 同伴详情（真实 ConfidantDetailModal）：头部（塔罗长按换头像 / 卡面 · 谏言 ✧ · 关闭）+ 羁绊等级（分段 + 等级内进度）+
 * 信息 / 能力 / 历史（LB·RB 切页）+ 操作区（今日互动 · 一起进步 · ✧ 星移 · 暂时归档 / 恢复 · 彻底删除 · 解除 COOP · 逆流开关）。
 *   #/overlay/bond-detail?tab=info|abilities|history&id=c-yukari&login=0&celebrate=1（补弹未庆祝的升级恭喜页）
 *   #/overlay/bond-delete-confirm   彻底删除确认（危险）     #/overlay/bond-unbind-confirm   解除 COOP 确认（busy 处理中）
 * 未登录 + 在线同伴 = 只读模式；归档 = 能力暂停提示。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Confidant } from '@real/types';
import type { OverlayProps } from '@blue/registry/types';
import { P3Button, P3Dialog, P3LRTabs, P3OnOff, P3Progress, P3R, P3Sheet, SelectWedge, showToast, slantClip, tickClip } from '@blue/kit';
import { cx } from '@blue/lib/cx';
import { EVENT_LABEL, INTIMACY_LABELS, MAX_INTIMACY, TAROT_BY_ID, levelProgress, nextUnlockHint } from '@blue/screens/pkg3/arcana';
import { MiniLabel, PactTag, ShadowBadge, Sparkle, StatusTag, Tarot } from '@blue/screens/pkg3/ui';
import { CelebrateScreen } from '@blue/screens/pkg3/rankup';
import { coopBondOps, cooperationOps, pk3Events, shadowForConfidant, useCooperationData } from '@blue/adapters/pkg3';
import { useCloudSocialStore } from '@/store/cloudSocial';
import { AvatarSyncConfirm } from './ConfidantDetailModalAvatarConfirm.p3r';

export type DetailTab = 'info' | 'abilities' | 'history';
export interface DetailProps {
  isOpen: boolean; onClose: () => void; confidant: Confidant | null; loggedIn?: boolean; initialTab?: DetailTab; initialDialog?: 'delete' | 'unbind' | 'avatar' | null;
  interactedToday?: boolean; hasShadow?: boolean; celebratePending?: boolean;
  shadow?: { identifiedByMe: boolean; identifiedByPartner: boolean; hpCurrent: number; hpMax: number } | null;
  onUpdate?: (patch: Partial<Confidant>) => void; onOpenCounsel?: () => void; onOpenInteraction?: () => void; onOpenStarShift?: () => void;
  onOpenPact?: () => void; onOpenMemorial?: () => void; onViewOnlineProfile?: () => void; onOpenCoopShadow?: () => void;
}

export function ConfidantDetailSheet(p: DetailProps) {
  const { isOpen, onClose, confidant, loggedIn = true, initialTab = 'info', initialDialog = null, interactedToday = false } = p;
  const [tab, setTab] = useState<DetailTab>(initialTab);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [delOpen, setDelOpen] = useState(initialDialog === 'delete');
  const [unbindOpen, setUnbindOpen] = useState(initialDialog === 'unbind');
  const [avatarAsk, setAvatarAsk] = useState(initialDialog === 'avatar');
  const [avatarMenu, setAvatarMenu] = useState(false);
  const [menuIdx, setMenuIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState(!!p.celebratePending);
  const [local, setLocal] = useState<Confidant | null>(confidant);
  const fileRef = useRef<HTMLInputElement>(null);
  const press = useRef<number | null>(null);
  useEffect(() => { setLocal(confidant); }, [confidant]);
  useEffect(() => { if (isOpen) { setTab(initialTab); setDelOpen(initialDialog === 'delete'); setUnbindOpen(initialDialog === 'unbind'); setAvatarAsk(initialDialog === 'avatar'); } }, [isOpen, initialTab, initialDialog]);
  if (!local) return null;
  const c = local;
  const patch = (x: Partial<Confidant>) => { setLocal({ ...c, ...x }); p.onUpdate?.(x); };
  const card = TAROT_BY_ID[c.arcanaId];
  const prog = levelProgress(c);
  const isOnline = c.source === 'online';
  const locked = isOnline && !loggedIn;
  const archived = !!c.archivedAt;
  const memorials = (c.coopMemorials ?? []).filter((m) => !m.shadowId.startsWith('retreat-')).length;
  const events = pk3Events(c.id);
  const face = c.avatarAsCardFace ? (c.cardFaceDataUrl || c.customAvatarDataUrl) : undefined;
  const half = isOnline && !!c.linkedCloudUserId;
  const interactionLabel = c.intimacy >= MAX_INTIMACY ? '已圆满 ✧' : interactedToday ? '今日已解读' : half ? '今日互动' : '今日互动 · 由 AI 解读加点';
  const otherSideDecay = c.id === 'c-yukari';
  const decayText = half
    ? c.decayEnabled ? (otherSideDecay ? '逆流 · 双方同意，3 天无互动 −1/天' : '逆流 · 你已开启，等 Ta 同意') : (otherSideDecay ? '逆流 · 对方已开启，等你同意' : '逆流未开启')
    : c.decayEnabled ? '逆流 · 3 天无互动 −1/天' : '逆流未开启';
  const startPress = () => { if (locked) return; press.current = window.setTimeout(() => { setAvatarMenu(true); press.current = null; }, 480); };
  const endPress = () => { if (press.current) { clearTimeout(press.current); press.current = null; } };
  const onFile = (f?: File | null) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { showToast('请选择图片', { kind: 'error' }); return; }
    patch({ customAvatarDataUrl: URL.createObjectURL(f) });
    setAvatarAsk(true);
  };
  const messageOf = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
  const toggleArchive = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (archived) {
        await cooperationOps.unarchive(c.id);
        setLocal({ ...c, archivedAt: undefined });
        showToast(`已恢复与 ${c.name} 的关系`);
      } else {
        await cooperationOps.archive(c.id);
        setLocal({ ...c, archivedAt: new Date() });
        showToast(`已暂时归档 ${c.name}`);
      }
    } catch (error) {
      showToast(messageOf(error, archived ? '恢复失败' : '归档失败'), { kind: 'error' });
    } finally {
      setBusy(false);
    }
  };
  const deleteConfidant = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await cooperationOps.remove(c.id);
      setDelOpen(false);
      onClose();
      showToast(`已删除 ${c.name}`);
    } catch (error) {
      showToast(messageOf(error, '删除失败'), { kind: 'error' });
    } finally {
      setBusy(false);
    }
  };
  const severCoop = async () => {
    if (busy) return;
    const bond = useCloudSocialStore.getState().coopBonds.find((item) =>
      item.status === 'linked'
      && !!c.linkedCloudUserId
      && (item.userAId === c.linkedCloudUserId || item.userBId === c.linkedCloudUserId),
    );
    if (!bond) {
      showToast('没有找到可解除的 COOP 契约', { kind: 'error' });
      return;
    }
    setBusy(true);
    try {
      await coopBondOps.sever(bond.id, c.id);
      setLocal({ ...c, archivedAt: new Date() });
      setUnbindOpen(false);
      showToast('已解除 COOP 契约');
    } catch (error) {
      showToast(messageOf(error, '解除失败'), { kind: 'error' });
    } finally {
      setBusy(false);
    }
  };
  const menuItems = [
    { k: 'up', t: c.customAvatarDataUrl ? '更换头像' : '上传头像替换塔罗', run: () => fileRef.current?.click() },
    ...(c.customAvatarDataUrl ? [
      { k: 'face', t: `卡面：${c.avatarAsCardFace ? '头像（点此改回塔罗）' : '塔罗（点此换成头像）'}`, run: () => patch({ avatarAsCardFace: !c.avatarAsCardFace }) },
      { k: 'crop', t: '重新裁切卡面', run: () => showToast(`裁切 ${c.name} 的卡面`) },
      { k: 'rm', t: '取消头像 · 恢复为塔罗牌', run: () => patch({ customAvatarDataUrl: undefined, avatarAsCardFace: false }) },
    ] : []),
  ];

  return (
    <>
      <P3Sheet open={isOpen} onClose={onClose} size="tall" showHandle headerExtra={
        <div className="flex gap-2">
          <button type="button" aria-label="谏言 · 关于这段关系" title="谏言：关于这段关系" onClick={p.onOpenCounsel} className="flex h-9 w-10 items-center justify-center text-[16px]" style={{ clipPath: slantClip(6), background: P3R.cyanFaint, color: P3R.grey }}>✧</button>
          <button type="button" aria-label="关闭" onClick={onClose} className="flex h-9 w-10 items-center justify-center font-black" style={{ clipPath: slantClip(6), background: P3R.blue, color: P3R.onBlue }}>✕</button>
        </div>
      } title={<span className="font-cond text-[15px] tracking-[0.2em]" style={{ color: P3R.roseInk }}>{isOnline ? 'ONLINE LINK' : 'SOCIAL LINK'}</span>}>
        <div aria-label="同伴详情" className="relative">
          <span aria-hidden className="pointer-events-none absolute -right-4 -top-6 select-none font-cond text-[96px] leading-none" style={{ color: 'var(--p3r-ghost)', transform: 'rotate(-12deg)' }}>{card?.roman}</span>
          {/* 头部 */}
          <div className="relative flex min-w-0 gap-4">
            <div className="relative shrink-0">
              <button type="button" onPointerDown={startPress} onPointerUp={endPress} onPointerLeave={endPress} onContextMenu={(e) => { e.preventDefault(); if (!locked) setAvatarMenu(true); }} aria-label="长按更换头像" className="block">
                <Tarot arcanaId={c.arcanaId} reversed={c.orientation === 'reversed'} width={88} faceUrl={face} dim={archived} />
              </button>
              {c.customAvatarDataUrl && !c.avatarAsCardFace && <img src={c.customAvatarDataUrl} alt="" className="absolute -bottom-2 -right-3 h-11 w-11 object-cover" style={{ clipPath: slantClip(5) }} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-cond text-[12px] uppercase tracking-[0.18em]" style={{ color: P3R.lilacInk }}>{isOnline ? '在线同伴 · ONLINE' : '离线同伴 · OFFLINE'}</div>
              <h2 className="truncate pr-[0.18em] font-heavy text-[clamp(28px,7.6vw,38px)] leading-tight" style={{ color: P3R.ink }}>{c.name}</h2>
              <div className="text-[13px] font-bold" style={{ color: P3R.inkSoft }}>《{card?.name}》{c.orientation === 'reversed' ? '逆位' : '正位'}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="relative px-3 py-0.5 text-[12px] font-black" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(6) }}>Lv.{c.intimacy} · {INTIMACY_LABELS[c.intimacy]}</span>
                {archived && <StatusTag tone="archived">归档</StatusTag>}
                {c.decayEnabled && <StatusTag tone="decay">逆流</StatusTag>}
              </div>
              {isOnline && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px] font-black" style={{ color: P3R.lilacInk }}>
                  <span>ONLINE ·</span>
                  {c.linkedProfile?.userId ? <button type="button" onClick={p.onViewOnlineProfile} title="点击查看 GUEST PROFILE" className="underline decoration-dotted underline-offset-2" style={{ color: P3R.roseInk }}>@{c.linkedProfile.userId}</button>
                    : <span>{c.linkedCloudUserId ? '已缔结 COOP' : '（待绑定）'}</span>}
                </div>
              )}
              {isOnline && (c.linkedProfile as { goal?: string } | undefined)?.goal && <div className="mt-1 truncate text-[12px] font-bold" style={{ color: P3R.inkSoft }}>◎ 本周目标：{(c.linkedProfile as { goal?: string }).goal}</div>}
              {p.hasShadow && p.shadow && <div className="mt-1.5"><ShadowBadge identified={p.shadow.identifiedByMe && p.shadow.identifiedByPartner} hpPct={Math.round((p.shadow.hpCurrent / p.shadow.hpMax) * 100)} onClick={() => p.onOpenCoopShadow?.()} /></div>}
            </div>
          </div>

          {/* 头像长按菜单（P3R 子菜单 + 光标楔） */}
          <AnimatePresence>
            {avatarMenu && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative z-20 mt-3 overflow-hidden py-1" role="menu" style={{ background: P3R.panel, clipPath: slantClip(10), boxShadow: 'var(--p3r-shadow)' }}>
                {menuItems.map((it, i) => (
                  <button key={it.k} type="button" role="menuitem" onPointerEnter={() => setMenuIdx(i)} onClick={() => { setAvatarMenu(false); it.run(); }} className="relative flex w-full items-center gap-2 px-5 py-2.5 text-left font-heavy text-[15px]" style={{ color: menuIdx === i ? 'var(--p3r-mulberry)' : P3R.ink }}>
                    {menuIdx === i && <SelectWedge className="inset-x-1 inset-y-0.5" />}<span className="relative">{it.t}</span>
                  </button>
                ))}
                <div className="flex items-center justify-between px-5 py-1.5 text-[11px]" style={{ color: P3R.grey }}><span>图片仅保留在本地</span><button type="button" onClick={() => setAvatarMenu(false)} className="font-black" style={{ color: P3R.roseInk }}>关闭</button></div>
              </motion.div>
            )}
          </AnimatePresence>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />

          {/* 羁绊等级 */}
          <div className="mt-5 px-4 py-3" style={{ background: P3R.panel, clipPath: slantClip(12), boxShadow: 'var(--p3r-shadow)' }}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="font-cond text-[15px]" style={{ color: P3R.roseInk }}>羁绊等级 · RANK {c.intimacy}</span>
              <span className="text-[12px]" style={{ color: P3R.grey }}>{prog.isMax ? '已达圆满' : `${prog.inLevel} / ${prog.span}（到 Lv.${c.intimacy + 1} 还差 ${prog.gap} 点）`}</span>
            </div>
            <P3Progress variant="segments" value={c.intimacy} max={10} />
            <P3Progress className="mt-2" value={prog.pct} max={100} color="var(--p3r-cyan)" />
          </div>
          {locked && (
            <div className="mt-3 px-4 py-3 text-[13px]" style={{ background: P3R.cyanPale, color: P3R.ink, clipPath: slantClip(10) }}>
              <b>只读模式 · 未登录云端</b><br /><span style={{ color: P3R.inkSoft }}>这是一位在线同伴，任何编辑操作都需要登录后才能同步给对方 —— 暂时只能查看，登录后可恢复全部功能。</span>
            </div>
          )}

          <P3LRTabs className="mt-4" value={tab} onChange={(v) => setTab(v as DetailTab)} items={[{ id: 'info', label: '信息', en: 'INFO' }, { id: 'abilities', label: '能力', en: 'SKILL' }, { id: 'history', label: '历史', en: 'LOG' }]} />
          <div className="mt-3 min-h-[180px]">
            {tab === 'info' && (
              <div className="grid grid-cols-1 gap-3">
                <InfoBlock title="关系描述" en="ABOUT">{c.description || '（未填写）'}</InfoBlock>
                <InfoBlock title="解读" en="READING">{c.aiInterpretation}</InfoBlock>
                <InfoBlock title="未来" en="FUTURE" msg>{c.aiAdvice}</InfoBlock>
                {isOnline && memorials > 0 && (
                  <button type="button" onClick={p.onOpenMemorial} className="relative flex min-w-0 items-center gap-3 px-4 py-3 text-left" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(12) }}>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center font-cond text-[20px]" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(6) }}>◎</span>
                    <span className="min-w-0 flex-1"><b className="block font-heavy text-[15px]" style={{ color: 'var(--bk-bubble-a)' }}>共战纪念</b><span className="block truncate text-[12px] opacity-80">{memorials} 次共同封印羁绊之影</span></span>
                    <span aria-hidden className="h-[12px] w-[9px]" style={{ background: 'var(--bk-bubble-a)', clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }} />
                  </button>
                )}
              </div>
            )}
            {tab === 'abilities' && (
              <div className="grid grid-cols-1 gap-2">
                {c.buffs.length === 0 ? <div className="px-4 py-4 text-center text-[13px]" style={{ background: P3R.cyanFaint, color: P3R.grey, clipPath: slantClip(10) }}>亲密度到 Lv.2 将解锁日常加成。</div> : c.buffs.map((b) => (
                  <div key={b.id} className="flex min-w-0 items-start gap-3 px-4 py-3" style={{ background: P3R.panel, clipPath: slantClip(10), boxShadow: 'var(--p3r-shadow)' }}>
                    <span className="shrink-0 px-2 py-0.5 font-cond text-[13px]" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(4) }}>Lv.{b.unlockAtLevel}</span>
                    <div className="min-w-0"><b className="block font-heavy text-[15px]" style={{ color: P3R.ink }}>{b.title}</b><p className="text-[12px]" style={{ color: P3R.inkSoft }}>{b.description}</p></div>
                  </div>
                ))}
                {c.intimacy < MAX_INTIMACY && (
                  <div className="relative px-4 py-3" style={{ background: P3R.cyanFaint, clipPath: slantClip(10) }}>
                    <span aria-hidden className="absolute bottom-0 right-3 h-[6px] w-[14px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
                    <div className="font-cond text-[12px] tracking-[0.16em]" style={{ color: P3R.roseInk }}>NEXT · 即将解锁</div>
                    <div className="mt-0.5 text-[13px]" style={{ color: P3R.ink }}>{nextUnlockHint(c.intimacy)}</div>
                  </div>
                )}
              </div>
            )}
            {tab === 'history' && (
              <div className="relative grid grid-cols-1 gap-2 pl-5">
                <span aria-hidden className="absolute bottom-2 left-[6px] top-2 w-[3px]" style={{ background: P3R.blue, transform: 'skewX(-8deg)' }} />
                {events.map((e) => {
                  const conv = e.type === 'conversation';
                  const primary = conv ? (e.userInput || e.narrative || '（未填写事件）') : e.narrative;
                  const hasReading = conv && (e.narrative || e.advice);
                  const ex = expanded === e.id;
                  return (
                    <div key={e.id} className="relative min-w-0 px-4 py-2.5" style={{ background: P3R.panel, clipPath: slantClip(8), boxShadow: 'var(--p3r-shadow)' }}>
                      <span aria-hidden className="absolute left-0 top-0 h-full w-[3px]" style={{ background: e.type === 'intimacy_down' ? P3R.magenta : P3R.cyan }} />
                      <div className="flex flex-wrap items-center gap-2 text-[12px]">
                        <span className="px-1.5 font-black" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(3) }}>{EVENT_LABEL[e.type] ?? e.type}</span>
                        <span className="font-cond tabular-nums" style={{ color: P3R.grey }}>{e.date}</span>
                        {typeof e.delta === 'number' && e.delta !== 0 && <span className="font-cond text-[14px]" style={{ color: e.delta > 0 ? P3R.roseInk : 'var(--p3r-coral-ink)' }}>{e.delta > 0 ? `+${e.delta}` : e.delta}</span>}
                        {hasReading && <button type="button" onClick={() => setExpanded(ex ? null : e.id)} className="ml-auto font-black" style={{ color: P3R.roseInk }}>{ex ? '收起 ▲' : '查看解读 ▼'}</button>}
                      </div>
                      {primary && <p className="mt-1 text-[13px]" style={{ color: P3R.ink }}>{primary}</p>}
                      <AnimatePresence initial={false}>
                        {ex && hasReading && (
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 grid grid-cols-1 gap-2">
                            {e.narrative && <div className="px-3 py-2" style={{ background: P3R.cyanFaint, clipPath: slantClip(6) }}><div className="font-cond text-[11px] tracking-widest" style={{ color: P3R.lilacInk }}>解读</div><p className="text-[12px]" style={{ color: P3R.ink }}>{e.narrative}</p></div>}
                            {e.advice && <div className="px-3 py-2" style={{ background: 'var(--p3r-mulberry)', color: 'var(--p3r-cream)', clipPath: slantClip(6) }}><div className="font-cond text-[11px] tracking-widest" style={{ color: 'var(--bk-bubble-a)' }}>未来</div><p className="text-[12px]">{e.advice}</p></div>}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 操作区 */}
          {!locked && (
            <div className="mt-5 grid grid-cols-1 gap-3 pt-4" style={{ borderTop: '2px dashed rgb(var(--p3r-cyan-rgb) / 0.45)' }}>
              {!archived && (
                <>
                  {half ? (
                    <div className="grid grid-cols-2 gap-3">
                      <P3Button size="lg" block corner disabled={interactedToday || c.intimacy >= MAX_INTIMACY} onClick={p.onOpenInteraction} leading={<Sparkle size={15} />}>{interactionLabel}</P3Button>
                      <button type="button" onClick={p.onOpenPact} className="flex min-w-0 flex-col items-start justify-center px-4 py-1.5 text-left" style={{ background: P3R.cyanPale, clipPath: slantClip(10) }}>
                        <span className="font-heavy text-[15px]" style={{ color: P3R.ink }}>一起进步</span>
                        <span className="w-full truncate text-[11px] font-bold" style={{ color: P3R.inkSoft }}>第 6 天 / 共 14 天 · 同步 5 天</span>
                      </button>
                    </div>
                  ) : <P3Button size="lg" block corner disabled={interactedToday || c.intimacy >= MAX_INTIMACY} onClick={p.onOpenInteraction} leading={<Sparkle size={15} />}>{interactionLabel}</P3Button>}
                  {(c.starShiftCharges ?? 0) > 0 && (
                    <button type="button" onClick={p.onOpenStarShift} className="relative flex min-w-0 items-center justify-between gap-2 px-5 py-2.5" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(12) }}>
                      <span className="min-w-0 text-left"><span className="block font-heavy text-[15px]" style={{ color: 'var(--bk-bubble-a)' }}>✧ 星移</span><span className="block truncate text-[12px] opacity-80">以当前状态重新落墨</span></span>
                      <span className="shrink-0 font-cond text-[24px]" style={{ color: 'var(--bk-bubble-b)' }}>×{c.starShiftCharges}</span>
                    </button>
                  )}
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <P3Button tone="soft" block busy={busy} disabled={busy} onClick={toggleArchive}>{archived ? '恢复关系' : '暂时归档'}</P3Button>
                <P3Button tone="danger" block onClick={() => setDelOpen(true)}>彻底删除</P3Button>
              </div>
              {half && !archived && (
                <button type="button" onClick={() => setUnbindOpen(true)} className="w-full py-2 text-center text-[13px] font-black" style={{ background: 'var(--bk-danger-wash)', color: 'var(--p3r-coral-ink)', clipPath: slantClip(8) }}>
                  解除与 {c.linkedProfile?.nickname || c.name} 的 COOP 契约
                </button>
              )}
              {!archived && (
                <div className="flex min-w-0 items-center justify-between gap-3 px-4 py-2" style={{ background: 'var(--p3r-row)', clipPath: slantClip(8) }}>
                  <span className="min-w-0 text-[13px] font-black" style={{ color: c.decayEnabled ? 'var(--p3r-coral-ink)' : P3R.inkSoft }}>{decayText}</span>
                  <P3OnOff value={c.decayEnabled} onChange={(v) => patch({ decayEnabled: v })} ariaLabel="切换逆流" />
                </div>
              )}
              {archived && <p className="text-center text-[12px]" style={{ color: P3R.grey }}>归档后能力暂停生效，但历史记录仍会保留</p>}
            </div>
          )}
        </div>
      </P3Sheet>

      <P3Dialog open={delOpen} onClose={() => setDelOpen(false)} tone="danger" busy={busy} busyText="删除中…" title={`确认彻底删除 ${c.name}？`} confirmText="确认删除" cancelText="再想想"
        onConfirm={deleteConfidant}
        description={<b style={{ color: 'var(--p3r-coral-ink)' }}>此操作不可撤销</b>}>
        <ul className="list-disc space-y-1 pl-5 text-[13px]" style={{ color: P3R.inkSoft }}>
          <li>这位同伴的档案、亲密度、能力解锁将一并被抹去</li>
          <li>所有互动记录与星移痕迹也会被清空</li>
          <li>Ta 所占用的塔罗大阿卡纳将被释放，可重新分配给新的同伴</li>
          <li>如果只是暂时不想看见 Ta，建议使用「暂时归档」</li>
        </ul>
      </P3Dialog>
      <P3Dialog open={unbindOpen} onClose={() => setUnbindOpen(false)} tone="danger" busy={busy} busyText="处理中…" title={`解除与 ${c.linkedProfile?.nickname || c.name} 的 COOP 契约`} confirmText="确认解除" cancelText="再想想"
        description={<>解除后，本端的同伴卡会自动归档；对方下次同步时，那边的卡也会归档。{'\n'}7 天内无法再次缔结 COOP。已积累的羁绊与历史会保留在归档里。</>}
        onConfirm={severCoop} />
      <AvatarSyncConfirm open={avatarAsk} onClose={() => setAvatarAsk(false)} name={c.name} arcanaId={c.arcanaId} onSync={() => patch({ avatarAsCardFace: true })} onAvatarOnly={() => patch({ avatarAsCardFace: false })} />
      {celebrate && isOpen && <CelebrateScreen confidant={c} level={c.intimacy} charges={c.starShiftCharges ?? 0} onClose={() => setCelebrate(false)} onUseStarShift={() => { setCelebrate(false); p.onOpenStarShift?.(); }} />}
    </>
  );
}

function InfoBlock({ title, en, children, msg }: { title: string; en: string; children: ReactNode; msg?: boolean }) {
  return msg ? (
    <section className="relative min-w-0 px-5 py-3" style={{ background: 'var(--p3r-mulberry)', color: 'var(--p3r-cream)', clipPath: slantClip(12) }}>
      <span aria-hidden className="absolute bottom-0 right-4 h-[6px] w-[14px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
      <div className="mb-1 flex items-center gap-2"><span className="font-heavy text-[13px]" style={{ color: 'var(--bk-bubble-a)' }}>{title}</span><span className="font-cond text-[11px] tracking-[0.18em] opacity-70">{en}</span></div>
      <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">{children}</p>
    </section>
  ) : (
    <section className={cx('min-w-0 px-5 py-3')} style={{ background: P3R.panel, clipPath: slantClip(12), boxShadow: 'var(--p3r-shadow)' }}>
      <MiniLabel en={en}>{title}</MiniLabel>
      <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed" style={{ color: P3R.ink }}>{children}</p>
    </section>
  );
}

const goto = (h: string) => () => { window.location.hash = h; };
export default function ConfidantDetailModal({ open, onClose, params }: OverlayProps) {
  const { confidants, activeShadows, cloudUser } = useCooperationData();
  const c = confidants.find((x) => x.id === params?.get('id')) ?? confidants[0] ?? null;
  const shadow = activeShadows[0] ? shadowForConfidant(activeShadows[0], cloudUser?.id) : null;
  if (!c) return <P3Sheet open={open} onClose={onClose} title="同伴详情" en="SOCIAL LINK"><div className="py-8 text-center text-[13px] font-bold" style={{ color: P3R.grey }}>还没有可以查看的同伴。</div></P3Sheet>;
  return <ConfidantDetailSheet isOpen={open} onClose={onClose} confidant={c} loggedIn={params?.get('login') !== '0'} hasShadow={!!shadow} shadow={shadow} celebratePending={params?.get('celebrate') === '1'}
    initialTab={(params?.get('tab') as DetailTab) || 'info'} initialDialog={(params?.get('dialog') as 'delete' | 'unbind' | 'avatar') || null}
    onUpdate={(patch) => { void cooperationOps.update(c.id, patch); }}
    onOpenCounsel={goto('#/overlay/bond-counsel-chat')} onOpenInteraction={goto('#/overlay/bond-interaction')} onOpenStarShift={goto('#/overlay/bond-starshift?stage=input')}
    onOpenPact={goto('#/overlay/bond-pact-panel')} onOpenMemorial={goto('#/overlay/bond-memorial')} onViewOnlineProfile={goto('#/overlay/bond-online-profile')} onOpenCoopShadow={goto('#/overlay/bond-shadow-battle')} />;
}
/** #/overlay/bond-delete-confirm：详情上直接弹出删除确认 */
export function DeleteConfirmDemo({ open, onClose }: OverlayProps) {
  const { confidants } = useCooperationData();
  const c = confidants[2] ?? confidants[0] ?? null;
  return <ConfidantDetailSheet isOpen={open} confidant={c} onClose={onClose} initialDialog={open ? 'delete' : null} />;
}
/** #/overlay/bond-unbind-confirm：在线同伴详情 + 解除 COOP 确认 */
export function UnbindConfirmDemo({ open, onClose }: OverlayProps) {
  const { confidants, activeShadows, cloudUser } = useCooperationData();
  const c = confidants[0] ?? null;
  const shadow = activeShadows[0] ? shadowForConfidant(activeShadows[0], cloudUser?.id) : null;
  return <ConfidantDetailSheet isOpen={open} confidant={c} onClose={onClose} hasShadow={!!shadow} shadow={shadow} initialDialog={open ? 'unbind' : null} />;
}
