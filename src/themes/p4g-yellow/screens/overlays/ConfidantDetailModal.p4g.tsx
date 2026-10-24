/**
 * 同伴详情（真实 ConfidantDetailModal）：头部（塔罗长按换头像 / 卡面）+ 羁绊等级 + 信息/能力/历史 三 Tab +
 * 操作区（今日互动、一起进步、星移、归档/删除、解除 COOP、逆流）+ 删除确认 / 解除确认 / 同步卡面确认。
 * 路由：#/overlay/bond-detail?tab=info|abilities|history&id=c-chie&login=0 ； #/overlay/bond-delete-confirm ； #/overlay/bond-unbind-confirm
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Confidant } from '@real/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Dialog, P4Outline, P4Progress, P4Sheet, P4Switch, P4Tabs, showToast } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { EVENT_LABEL, INTIMACY_LABELS, MAX_INTIMACY, TAROT_BY_ID, levelProgress, nextUnlockHint } from '@yellow/screens/pkg3/arcana';
import { MiniLabel, PactTag, ShadowBadge, Sparkle, StatusTag, TarotCard } from '@yellow/screens/pkg3/ui';
import { coopBondOps, cooperationOps, pk3Events, shadowForConfidant, useCooperationData } from '@yellow/adapters/pkg3';
import { useCloudSocialStore } from '@/store/cloudSocial';
import { AvatarSyncConfirm } from './ConfidantDetailModalAvatarConfirm.p4g';

export type DetailTab = 'info' | 'abilities' | 'history';

export interface DetailProps {
  isOpen: boolean;
  onClose: () => void;
  confidant: Confidant | null;
  loggedIn?: boolean;
  initialTab?: DetailTab;
  initialDialog?: 'delete' | 'unbind' | 'avatar' | null;
  interactedToday?: boolean;
  hasShadow?: boolean;
  shadow?: { identifiedByMe: boolean; identifiedByPartner: boolean; hpCurrent: number; hpMax: number } | null;
  onUpdate?: (patch: Partial<Confidant>) => void;
  onOpenCounsel?: () => void;
  onOpenInteraction?: () => void;
  onOpenStarShift?: () => void;
  onOpenPact?: () => void;
  onOpenMemorial?: () => void;
  onViewOnlineProfile?: () => void;
  onOpenCoopShadow?: () => void;
}

export function ConfidantDetailSheet(p: DetailProps) {
  const { isOpen, onClose, confidant, loggedIn = true, initialTab = 'info', initialDialog = null, interactedToday = false } = p;
  const [tab, setTab] = useState<DetailTab>(initialTab);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [delOpen, setDelOpen] = useState(initialDialog === 'delete');
  const [unbindOpen, setUnbindOpen] = useState(initialDialog === 'unbind');
  const [avatarAsk, setAvatarAsk] = useState(initialDialog === 'avatar');
  const [avatarMenu, setAvatarMenu] = useState(false);
  const [busy, setBusy] = useState(false);
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
  const otherSideDecay = c.id === 'c-chie';
  const decayText = isOnline && c.linkedCloudUserId
    ? c.decayEnabled ? (otherSideDecay ? '逆流 · 双方同意，3 天无互动 −1/天' : '逆流 · 你已开启，等 Ta 同意') : (otherSideDecay ? '逆流 · 对方已开启，等你同意' : '逆流未开启')
    : c.decayEnabled ? '逆流 · 3 天无互动 −1/天' : '逆流未开启';

  const startPress = () => { if (locked) return; press.current = window.setTimeout(() => { setAvatarMenu(true); press.current = null; }, 480); };
  const endPress = () => { if (press.current) { clearTimeout(press.current); press.current = null; } };
  const onFile = (f?: File | null) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { showToast('请选择图片', { kind: 'error' }); return; }
    const url = URL.createObjectURL(f);
    patch({ customAvatarDataUrl: url });
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

  return (
    <>
      <P4Sheet open={isOpen} onClose={onClose} size="tall" hideClose className="!max-w-[720px]">
        <div aria-label="同伴详情" className="relative pt-3">
          {/* 右上：谏言 ✧ + 关闭 */}
          <div className="absolute right-0 top-2 z-10 flex gap-2">
            <button type="button" aria-label="谏言 · 关于这段关系" title="谏言：关于这段关系" onClick={p.onOpenCounsel} className="p4g-press flex h-10 w-10 items-center justify-center rounded-sm border-3 border-p4g-line bg-p4g-surface text-lead text-p4g-ink-soft">✧</button>
            <button type="button" aria-label="关闭" onClick={onClose} className="p4g-press flex h-10 w-10 items-center justify-center rounded-sm border-3 border-p4g-black bg-p4g-yellow font-bold text-p4g-black shadow-hard-sm">✕</button>
          </div>

          {/* 头部 */}
          <div className="flex min-w-0 gap-4 pr-[96px] sm:pr-24">
            <div className="relative shrink-0">
              <button type="button" onPointerDown={startPress} onPointerUp={endPress} onPointerLeave={endPress} onContextMenu={(e) => { e.preventDefault(); if (!locked) setAvatarMenu(true); }} aria-label="长按更换头像" className="block">
                <TarotCard arcanaId={c.arcanaId} orientation={c.orientation} width={92} faceUrl={face} />
              </button>
              {c.customAvatarDataUrl && !c.avatarAsCardFace && (
                <img src={c.customAvatarDataUrl} alt="" className="absolute -bottom-2 -right-3 h-11 w-11 rounded-sm border-3 border-p4g-black object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-cap font-bold uppercase tracking-[0.18em] text-p4g-ink-soft">{isOnline ? '在线同伴' : '离线同伴'}</div>
              <P4Outline as="h2" size="clamp(26px,7vw,36px)" stroke={5} className="max-w-full overflow-hidden text-ellipsis">{c.name}</P4Outline>
              <div className="mt-0.5 text-meta text-p4g-ink-soft">《{card?.name}》{c.orientation === 'reversed' ? '逆位' : '正位'}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded-[2px] bg-p4g-tag px-2 py-0.5 font-display text-meta font-bold text-[color:var(--p4g-tag-ink)]">Lv.{c.intimacy} · {INTIMACY_LABELS[c.intimacy]}</span>
                {archived && <StatusTag tone="archived">归档</StatusTag>}
                {c.decayEnabled && <StatusTag tone="decay">逆流</StatusTag>}
              </div>
              {isOnline && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-cap font-bold text-p4g-success">
                  <span>ONLINE ·</span>
                  {c.linkedProfile?.userId ? (
                    <button type="button" onClick={p.onViewOnlineProfile} title="点击查看 GUEST PROFILE" className="underline decoration-dotted underline-offset-2">@{c.linkedProfile.userId}</button>
                  ) : <span>{c.linkedCloudUserId ? '已缔结 COOP' : '（待绑定）'}</span>}
                </div>
              )}
              {isOnline && <div className="mt-1 text-cap text-p4g-ink-soft">▸ 本周目标：备战市民运动会 · 跑步 12/20 km</div>}
              {p.hasShadow && p.shadow && <div className="mt-1.5"><ShadowBadge identified={p.shadow.identifiedByMe && p.shadow.identifiedByPartner} hpPct={Math.round((p.shadow.hpCurrent / p.shadow.hpMax) * 100)} onClick={() => p.onOpenCoopShadow?.()} /></div>}
            </div>
          </div>

          {/* 头像长按菜单 */}
          <AnimatePresence>
            {avatarMenu && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative z-20 mt-3 overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-black text-white shadow-[4px_4px_0_var(--p4g-orange)]">
                {[
                  { k: 'up', t: c.customAvatarDataUrl ? '更换头像' : '上传头像替换塔罗', run: () => fileRef.current?.click() },
                  ...(c.customAvatarDataUrl ? [
                    { k: 'face', t: `卡面：${c.avatarAsCardFace ? '头像（点此改回塔罗）' : '塔罗（点此换成头像）'}`, run: () => patch({ avatarAsCardFace: !c.avatarAsCardFace }) },
                    { k: 'crop', t: '重新裁切卡面', run: () => showToast(`裁切 ${c.name} 的卡面`) },
                    { k: 'rm', t: '取消头像 · 恢复为塔罗牌', run: () => patch({ customAvatarDataUrl: undefined, avatarAsCardFace: false }) },
                  ] : []),
                ].map((it) => (
                  <button key={it.k} type="button" onClick={() => { setAvatarMenu(false); it.run(); }} className="flex w-full items-center gap-2 border-b border-white/10 px-3 py-2.5 text-left font-display text-body font-bold hover:bg-p4g-orange hover:text-p4g-black">
                    <span aria-hidden className="text-p4g-yellow">▸</span>{it.t}
                  </button>
                ))}
                <div className="flex items-center justify-between px-3 py-1.5 text-2xs text-white/60"><span>图片仅保留在本地</span><button type="button" onClick={() => setAvatarMenu(false)} className="font-bold text-p4g-yellow">关闭</button></div>
              </motion.div>
            )}
          </AnimatePresence>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />

          {/* 羁绊等级 */}
          <div className="mt-5 rounded-sm border-3 border-p4g-line bg-p4g-surface p-3">
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 text-cap">
              <span className="font-display font-bold italic text-[color:var(--p4g-rank)]">羁绊等级 · Rank {c.intimacy}</span>
              <span className="text-p4g-ink-soft">{prog.isMax ? '已达圆满' : `${prog.inLevel} / ${prog.span}（到 Lv.${c.intimacy + 1} 还差 ${prog.gap} 点）`}</span>
            </div>
            <P4Progress variant="segments" value={c.intimacy} max={10} />
            <div className="mt-1.5"><P4Progress variant="bar" value={prog.pct} max={100} /></div>
          </div>

          {locked && (
            <div className="mt-3 rounded-sm border-3 border-p4g-black bg-p4g-orange p-3 text-meta text-p4g-black">
              <span className="font-bold">只读模式 · 未登录云端</span><br />这是一位在线同伴，任何编辑操作都需要登录后才能同步给对方 —— 暂时只能查看，登录后可恢复全部功能。
            </div>
          )}

          <P4Tabs className="mt-4" fill value={tab} onChange={(v) => setTab(v as DetailTab)} items={[{ id: 'info', label: '信息', en: 'INFO' }, { id: 'abilities', label: '能力', en: 'SKILL' }, { id: 'history', label: '历史', en: 'LOG' }]} />

          <div className="mt-3 min-h-[180px]">
            {tab === 'info' && (
              <div className="grid grid-cols-1 gap-3">
                <InfoBlock title="关系描述">{c.description || '（未填写）'}</InfoBlock>
                <InfoBlock title="解读">{c.aiInterpretation}</InfoBlock>
                <InfoBlock title="未来" msg>{c.aiAdvice}</InfoBlock>
                {isOnline && memorials > 0 && (
                  <button type="button" onClick={p.onOpenMemorial} className="p4g-press flex min-w-0 items-center gap-3 rounded-sm border-3 border-p4g-black bg-p4g-black p-3 text-left text-white shadow-[4px_4px_0_var(--p4g-orange)]">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-p4g-yellow text-h3">📿</span>
                    <span className="min-w-0 flex-1"><b className="block font-display text-body text-p4g-yellow">共战纪念</b><span className="block truncate text-cap text-white/80">{memorials} 次共同封印羁绊之影</span></span>
                    <span aria-hidden className="text-p4g-yellow">›</span>
                  </button>
                )}
              </div>
            )}
            {tab === 'abilities' && (
              <div className="grid grid-cols-1 gap-2">
                {c.buffs.length === 0 ? <div className="rounded-sm border-2 border-dashed border-p4g-line p-4 text-center text-meta text-p4g-ink-soft">亲密度到 Lv.2 将解锁日常加成。</div> : c.buffs.map((b) => (
                  <div key={b.id} className="flex min-w-0 items-start gap-3 rounded-sm border-3 border-p4g-line bg-p4g-surface p-3">
                    <span className="shrink-0 rounded-[2px] bg-p4g-tag px-2 py-0.5 p4g-num text-meta text-[color:var(--p4g-tag-ink)]">Lv.{b.unlockAtLevel}</span>
                    <div className="min-w-0"><b className="block font-display text-body">{b.title}</b><p className="text-meta text-p4g-ink-soft">{b.description}</p></div>
                  </div>
                ))}
                {c.intimacy < MAX_INTIMACY && (
                  <div className="rounded-sm border-3 border-dashed border-p4g-orange bg-p4g-surface-2 p-3">
                    <div className="font-display text-cap font-bold tracking-[0.16em] text-[color:var(--p4g-rank)]">即将解锁</div>
                    <div className="mt-0.5 text-meta">{nextUnlockHint(c.intimacy)}</div>
                  </div>
                )}
              </div>
            )}
            {tab === 'history' && (
              <div className="relative grid grid-cols-1 gap-2 pl-4">
                <span aria-hidden className="absolute bottom-2 left-[5px] top-2 w-[3px] bg-p4g-orange" />
                {events.length === 0 ? <div className="text-meta text-p4g-ink-soft">还没有记录</div> : events.map((e) => {
                  const conv = e.type === 'conversation';
                  const primary = conv ? (e.userInput || e.narrative || '（未填写事件）') : e.narrative;
                  const hasReading = conv && (e.narrative || e.advice);
                  const ex = expanded === e.id;
                  return (
                    <div key={e.id} className="relative min-w-0 rounded-sm border-3 border-p4g-line bg-p4g-surface p-2.5">
                      <span aria-hidden className="absolute -left-[17px] top-3.5 h-3 w-3 rotate-45 border-2 border-p4g-black bg-p4g-yellow" />
                      <div className="flex flex-wrap items-center gap-2 text-cap">
                        <span className="rounded-[2px] bg-p4g-black px-1.5 font-display font-bold text-p4g-yellow">{EVENT_LABEL[e.type] ?? e.type}</span>
                        <span className="p4g-num text-p4g-ink-soft">{e.date}</span>
                        {typeof e.delta === 'number' && e.delta !== 0 && <span className={cx('p4g-num', e.delta > 0 ? 'text-p4g-success' : 'text-p4g-danger')}>{e.delta > 0 ? `+${e.delta}` : e.delta}</span>}
                        {hasReading && <button type="button" onClick={() => setExpanded(ex ? null : e.id)} className="ml-auto font-bold text-[color:var(--p4g-rank)]">{ex ? '收起 ▲' : '查看解读 ▼'}</button>}
                      </div>
                      {primary && <p className="mt-1 text-meta">{primary}</p>}
                      <AnimatePresence initial={false}>
                        {ex && hasReading && (
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 grid grid-cols-1 gap-2">
                            {e.narrative && <div className="rounded-sm bg-p4g-surface-2 p-2"><div className="font-display text-2xs font-bold tracking-widest text-p4g-ink-soft">解读</div><p className="text-meta">{e.narrative}</p></div>}
                            {e.advice && <div className="rounded-sm bg-[color:var(--p4g-msg)] p-2 text-[color:var(--p4g-msg-ink)]"><div className="font-display text-2xs font-bold tracking-widest text-p4g-yellow">未来</div><p className="text-meta">{e.advice}</p></div>}
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
            <div className="mt-5 grid grid-cols-1 gap-3 border-t-3 border-dashed border-p4g-line pt-4">
              {!archived && (
                <>
                  {half ? (
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
                      <P4Button size="lg" block disabled={interactedToday || c.intimacy >= MAX_INTIMACY} onClick={p.onOpenInteraction} leading={<Sparkle size={16} />}>{interactionLabel}</P4Button>
                      <button type="button" onClick={p.onOpenPact} className="p4g-press flex min-w-0 flex-col items-start justify-center rounded-sm border-3 border-p4g-line bg-p4g-surface px-3 py-1.5 text-left shadow-hard-sm">
                        <span className="font-display text-body font-bold">一起进步</span>
                        <span className="w-full truncate text-2xs text-p4g-ink-soft">第 6 天 / 共 14 天 · 同步 5 天</span>
                      </button>
                    </div>
                  ) : <P4Button size="lg" block disabled={interactedToday || c.intimacy >= MAX_INTIMACY} onClick={p.onOpenInteraction} leading={<Sparkle size={16} />}>{interactionLabel}</P4Button>}
                  {(c.starShiftCharges ?? 0) > 0 && (
                    <button type="button" onClick={p.onOpenStarShift} className="p4g-press flex min-w-0 items-center justify-between gap-2 rounded-sm border-3 border-p4g-black bg-p4g-black px-4 py-2.5 text-white shadow-[4px_4px_0_var(--p4g-orange)]">
                      <span className="min-w-0 text-left"><span className="block font-display text-body font-bold text-p4g-yellow">✧ 星移</span><span className="block truncate text-cap font-normal text-white/80">以当前状态重新落墨</span></span>
                      <span className="shrink-0 p4g-num text-h3 text-p4g-orange">×{c.starShiftCharges}</span>
                    </button>
                  )}
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <P4Button variant="secondary" block busy={busy} disabled={busy} onClick={toggleArchive}>{archived ? '恢复关系' : '暂时归档'}</P4Button>
                <P4Button variant="danger" block onClick={() => setDelOpen(true)}>彻底删除</P4Button>
              </div>
              {isOnline && c.linkedCloudUserId && !archived && (
                <button type="button" onClick={() => setUnbindOpen(true)} className="w-full rounded-sm border-2 border-dashed border-p4g-danger py-2 text-center font-display text-meta font-bold text-p4g-danger">
                  解除与 {c.linkedProfile?.nickname || c.name} 的 COOP 契约
                </button>
              )}
              {!archived && (
                <div className="flex items-center justify-between gap-3 rounded-sm bg-p4g-surface-2 px-3 py-2">
                  <span className={cx('min-w-0 text-meta font-bold', c.decayEnabled ? 'text-p4g-danger' : 'text-p4g-ink-soft')}>{decayText}</span>
                  <P4Switch size="sm" checked={c.decayEnabled} onChange={(v) => patch({ decayEnabled: v })} aria-label="切换逆流" />
                </div>
              )}
              {archived && <p className="text-center text-cap text-p4g-ink-soft">归档后能力暂停生效，但历史记录仍会保留</p>}
            </div>
          )}
        </div>
      </P4Sheet>

      {/* 彻底删除 */}
      <P4Dialog open={delOpen} onClose={() => !busy && setDelOpen(false)} danger actions="buttons" busy={busy} busyText="删除中…" keepOpen title={`确认彻底删除 ${c.name}？`} confirmText="确认删除" cancelText="再想想" onConfirm={deleteConfidant}
        message={<b className="text-p4g-orange">此操作不可撤销</b>}>
        <ul className="list-disc space-y-1 pl-5 text-meta text-[color:var(--p4g-msg-ink)]/85">
          <li>这位同伴的档案、亲密度、能力解锁将一并被抹去</li>
          <li>所有互动记录与星移痕迹也会被清空</li>
          <li>Ta 所占用的塔罗大阿卡纳将被释放，可重新分配给新的同伴</li>
          <li>如果只是暂时不想看见 Ta，建议使用「暂时归档」</li>
        </ul>
      </P4Dialog>

      {/* 解除 COOP */}
      <P4Dialog open={unbindOpen} onClose={() => !busy && setUnbindOpen(false)} danger actions="none" title={`解除与 ${c.linkedProfile?.nickname || c.name} 的 COOP 契约`}
        message={<>解除后，本端的同伴卡会自动归档；对方下次同步时，那边的卡也会归档。<br />7 天内无法再次缔结 COOP。已积累的羁绊与历史会保留在归档里。</>}>
        <div className="flex gap-3 pb-1">
          <P4Button variant="secondary" block disabled={busy} onClick={() => setUnbindOpen(false)}>再想想</P4Button>
          <P4Button variant="danger" block busy={busy} disabled={busy} onClick={severCoop}>{busy ? '处理中…' : '确认解除'}</P4Button>
        </div>
      </P4Dialog>

      <AvatarSyncConfirm open={avatarAsk} onClose={() => setAvatarAsk(false)} name={c.name} onSync={() => patch({ avatarAsCardFace: true })} onAvatarOnly={() => patch({ avatarAsCardFace: false })} />
    </>
  );
}

function InfoBlock({ title, children, msg }: { title: string; children: ReactNode; msg?: boolean }) {
  return (
    <section className={cx('min-w-0 rounded-sm border-3 p-3', msg ? 'border-p4g-black bg-[color:var(--p4g-msg)] text-[color:var(--p4g-msg-ink)]' : 'border-p4g-line bg-p4g-surface')}>
      {msg ? <div className="mb-1 font-display text-cap font-bold tracking-[0.18em] text-p4g-yellow">{title}</div> : <MiniLabel>{title}</MiniLabel>}
      <p className="whitespace-pre-wrap break-words text-body leading-relaxed">{children}</p>
    </section>
  );
}

export default function ConfidantDetailModal({ open, onClose, params }: OverlayProps) {
  const { confidants, activeShadows, cloudUser } = useCooperationData();
  const c = confidants.find((x) => x.id === params?.get('id')) ?? confidants[0] ?? null;
  const shadow = activeShadows[0] ? shadowForConfidant(activeShadows[0], cloudUser?.id) : null;
  if (!c) return <P4Sheet open={open} onClose={onClose} title="同伴详情" en="SOCIAL LINK"><div className="py-8 text-center text-meta text-p4g-ink-soft">还没有可以查看的同伴。</div></P4Sheet>;
  return <ConfidantDetailSheet isOpen={open} onClose={onClose} confidant={c} loggedIn={params?.get('login') !== '0'} hasShadow={!!shadow} shadow={shadow}
    initialTab={(params?.get('tab') as DetailTab) || 'info'} initialDialog={(params?.get('dialog') as 'delete' | 'unbind' | 'avatar') || null}
    onUpdate={(patch) => { void cooperationOps.update(c.id, patch); }}
    onOpenCounsel={() => { window.location.hash = '#/overlay/bond-counsel-chat'; }} onOpenInteraction={() => { window.location.hash = '#/overlay/bond-interaction'; }}
    onOpenStarShift={() => { window.location.hash = '#/overlay/bond-starshift-p4'; }} onOpenPact={() => { window.location.hash = '#/overlay/bond-pact-panel'; }}
    onOpenMemorial={() => { window.location.hash = '#/overlay/bond-memorial'; }} onViewOnlineProfile={() => { window.location.hash = '#/overlay/bond-online-profile'; }}
    onOpenCoopShadow={() => { window.location.hash = '#/overlay/bond-shadow-battle'; }} />;
}

/** #/overlay/bond-delete-confirm：详情页上直接弹出删除确认 */
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
