/**
 * 用户资料抽屉（真实 src/pages/Menu.tsx profileSheetOpen + src/components/UserProfileCard.tsx
 * + src/components/profile/ProfilePresenceEditor.tsx）。
 * 头像菜单（更换头像/上传头像 · 移除头像 · 取消，真实可选图）/ 修改用户名（保存·取消）/ LV + ＋状态 / UserID 点击复制（已复制 ✓ / 复制失败）/ ☁ 邮箱
 * / GOAL 进度条 或「＋ 挂一张宣告卡作为目标」/ 状态面板（19 预设、24 小时后自动消失、清除状态）/ 目标面板（宣告卡单选、对外显示为、取下目标·取消·挂上名片）
 * / 总点数：N + N 级累计 ▼ 五维展开。
 * 换头像（红色审计回补 2026-10-21）：真实 UserProfileCard 选图后先进**裁切弹窗**（复用 ImageCropDialog，title「调整我的头像」，可取消）→ 确认才 updateUser({ avatarDataUrl }) → 上传中遮罩 → 失败 2.5s 红字「上传失败」；
 *   非图片「请选择图片文件」。真实仓库里没有第二套 ImageCropModal（红色 v3 审计里的 B_ImageCrop 就是这一处 ImageCropDialog 实例）。
 * 演示：?panel=status|goal  ?variant=nogoal|audit|missing|nocards|guest|nostatus  ?crop=1（直接打开「调整我的头像」裁切，用 demo 图）  ?crop=error（裁切报错态）
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Sheet, P4Input, P4Button, P4Progress, IconEdit, useToast } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { useLowMotion } from '@yellow/lib/prefs';
import { presetOf, goalPct, setPresence, statusAgeText, usePresence } from '@yellow/screens/pkg5/presence';
import { p4gAsset } from '@yellow/lib/asset';
import { CropDialog } from './ImageCropDialog.p4g';
import { ATTRIBUTES, CALLING_CARDS, CLOUD_USER, LEVEL_MAX, STATUS_PRESETS, TOTAL_LEVEL, TOTAL_POINTS } from '@yellow/adapters/pkg5';

type Panel = null | 'status' | 'goal';

export function UserProfileCardView({ open, onClose, initialPanel = null, cloud = true, noCards = false, initialCrop = null }: { open: boolean; onClose: () => void; initialPanel?: Panel; cloud?: boolean; noCards?: boolean; initialCrop?: null | 'demo' | 'error' }) {
  const toast = useToast();
  const low = useLowMotion();
  const p = usePresence();
  const [panel, setPanel] = useState<Panel>(initialPanel);
  const [avatarMenu, setAvatarMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(p.name);
  const [copied, setCopied] = useState<null | 'ok' | 'err'>(null);
  const [attrsOpen, setAttrsOpen] = useState(false);
  const [cardId, setCardId] = useState<string | null>(p.goal?.cardId ?? null);
  const [alias, setAlias] = useState(p.goal?.alias ?? '');
  const [err, setErr] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  /** 真实 pendingFile：选好图 → 裁切弹窗；null = 关 */
  const [pending, setPending] = useState<null | { file?: File; src?: string; err?: boolean }>(null);
  useEffect(() => { if (open) { setPanel(initialPanel); setEditing(false); setAvatarMenu(false); setNameDraft(p.name); } }, [open]); // eslint-disable-line
  useEffect(() => { if (!open || !initialCrop) return; const t = window.setTimeout(() => setPending(initialCrop === 'error' ? { err: true } : { src: p4gAsset('town-day.webp') }), 450); return () => window.clearTimeout(t); }, [open, initialCrop]);
  const preset = presetOf(p.statusId);
  const pct = goalPct(p.goal);
  const cards = noCards ? [] : CALLING_CARDS;
  const toggle = (x: Exclude<Panel, null>) => setPanel((cur) => (cur === x ? null : x));
  const saveName = () => { const v = nameDraft.trim(); if (v) setPresence({ name: v }); setEditing(false); };
  const copy = () => { navigator.clipboard?.writeText(CLOUD_USER.username).then(() => setCopied('ok'), () => setCopied('err')); if (!navigator.clipboard) setCopied('err'); window.setTimeout(() => setCopied(null), 1500); };
  const pick = (f: File) => {
    if (!f.type.startsWith('image/')) { toast.error('请选择图片文件'); return; }
    setPending({ file: f });
  };
  /** 真实 handleCropConfirm：先关裁切 → uploading → updateUser({ avatarDataUrl }) → 失败「上传失败」 */
  const cropConfirm = (dataUrl: string) => {
    setPending(null); setUploading(true);
    window.setTimeout(() => { setPresence({ avatar: dataUrl }); setUploading(false); }, 700);
  };
  const saveGoal = () => {
    if (!cardId) { setErr('先挑一张宣告卡'); return; }
    if (/傻|笨/.test(alias)) { setErr('文字需要稍微调整下措辞'); return; }
    setPresence({ goal: { cardId, alias: alias.trim() || undefined }, goalIssue: null }); setPanel(null);
  };
  const chip = 'p4g-press inline-flex h-8 items-center gap-1 rounded-xs border-thin px-2.5 font-display text-meta font-bold';

  return (
    <P4Sheet open={open} onClose={onClose} title="用户资料" en="STUDENT PROFILE">
      <div className="flex min-w-0 flex-col gap-3 pt-1">
        <div className="relative min-w-0 overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-yellow-pale text-p4g-black shadow-hard night:border-p4g-yellow">
          <div className="flex items-center justify-between bg-p4g-black px-3 py-1.5">
            <span className="font-display text-meta font-bold tracking-[0.14em] text-p4g-yellow">✿ STUDENT PASS</span>
            <span className="p4g-date-type text-2xs text-white/80">CH 04</span>
          </div>
          <div className="flex min-w-0 gap-3 p-3">
            <div className="relative shrink-0">
              <button type="button" aria-label="头像菜单" onClick={() => setAvatarMenu((v) => !v)} disabled={uploading}
                className="p4g-press relative flex h-[84px] w-[70px] items-center justify-center overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-orange shadow-hard-sm">
                {p.avatar ? <img src={p.avatar} alt="" className="h-full w-full object-cover" /> : <span className="font-display text-[34px] font-bold text-white" style={{ WebkitTextStroke: '1.5px var(--p4g-black)' }}>{p.name.slice(0, 1)}</span>}
                {uploading && <span className="absolute inset-0 flex items-center justify-center bg-p4g-black/60 text-meta font-bold text-white">…</span>}
              </button>
              <AnimatePresence>
                {avatarMenu && !uploading && (
                  <motion.div initial={low ? { opacity: 0 } : { opacity: 0, y: -6, skewX: -6 }} animate={{ opacity: 1, y: 0, skewX: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }}
                    className="absolute left-0 top-[92px] z-10 w-36 overflow-hidden rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] p-1 shadow-plate night:border-p4g-yellow">
                    {[{ id: 'pick', label: p.avatar ? '更换头像' : '上传头像' }, ...(p.avatar ? [{ id: 'rm', label: '移除头像' }] : []), { id: 'x', label: '取消' }].map((it) => (
                      <button key={it.id} type="button" onClick={() => { setAvatarMenu(false); if (it.id === 'pick') fileRef.current?.click(); if (it.id === 'rm') setPresence({ avatar: null }); }}
                        className={cx('block w-full rounded-pill px-3 py-2 text-left font-display text-body font-bold hover:bg-p4g-orange hover:text-p4g-black', it.id === 'rm' ? 'text-[#ff8a7a]' : 'text-[color:var(--p4g-msg-ink)]')}>{it.label}</button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) pick(f); }} />
            </div>
            <div className="min-w-0 flex-1">
              {editing ? (
                <div className="flex min-w-0 items-center gap-1.5">
                  <input autoFocus value={nameDraft} maxLength={20} onChange={(e) => setNameDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditing(false); setNameDraft(p.name); } }}
                    className="h-9 min-w-0 flex-1 rounded-xs border-thin border-p4g-black bg-white px-2 font-display text-lead font-bold text-p4g-black outline-none" aria-label="用户名" />
                  <button type="button" onClick={saveName} className="h-9 shrink-0 rounded-xs bg-p4g-black px-2.5 font-display text-meta font-bold text-p4g-yellow">保存</button>
                  <button type="button" onClick={() => { setEditing(false); setNameDraft(p.name); }} className="h-9 shrink-0 rounded-xs border-thin border-p4g-black px-2 font-display text-meta font-bold">取消</button>
                </div>
              ) : (
                <div className="flex min-w-0 items-center gap-2">
                  <h3 className="min-w-0 truncate font-display text-[clamp(18px,5vw,22px)] font-bold leading-tight">{p.name}</h3>
                  <button type="button" aria-label="修改用户名" onClick={() => { setNameDraft(p.name); setEditing(true); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xs border-thin border-p4g-black bg-white"><IconEdit size={14} /></button>
                </div>
              )}
              <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
                <span className="rounded-pill bg-p4g-black px-2 py-[3px] p4g-num text-meta leading-none text-white">LV {TOTAL_LEVEL}</span>
                {preset ? (
                  <button type="button" title="改状态" aria-expanded={panel === 'status'} onClick={() => toggle('status')} className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-pill bg-p4g-orange px-2 py-[3px] font-display text-meta font-bold leading-none text-p4g-black">
                    <span aria-hidden>{preset.emoji}</span><span className="truncate">{preset.label}</span>
                  </button>
                ) : <button type="button" aria-expanded={panel === 'status'} onClick={() => toggle('status')} className="rounded-pill border-thin border-dashed border-p4g-black px-2 py-[2px] font-display text-meta font-bold leading-none">＋状态</button>}
              </div>
              {cloud && (
                <div className="mt-1.5 min-w-0 space-y-0.5">
                  <button type="button" title="点击复制 UserID" onClick={copy} className="flex max-w-full items-center gap-1 font-display text-meta font-bold text-[color:var(--p4g-orange-deep)]">
                    <span className="opacity-70">@</span><span className="truncate font-mono">{CLOUD_USER.username}</span>
                    <span className="shrink-0 text-2xs">{copied === 'ok' ? '已复制 ✓' : copied === 'err' ? '复制失败' : '⧉'}</span>
                  </button>
                  <div className="truncate text-2xs font-bold opacity-75">☁ {CLOUD_USER.email}</div>
                </div>
              )}
            </div>
          </div>
          {/* 目标 */}
          {!p.goal ? (
            <button type="button" aria-expanded={panel === 'goal'} onClick={() => toggle('goal')} className="mx-3 mb-3 flex h-9 w-[calc(100%-1.5rem)] items-center justify-center rounded-xs border-thin border-dashed border-p4g-black font-display text-meta font-bold">＋ 挂一张宣告卡作为目标</button>
          ) : p.goalIssue ? (
            <button type="button" onClick={() => toggle('goal')} className={cx('mx-3 mb-3 block w-[calc(100%-1.5rem)] rounded-xs px-2 py-1.5 text-left text-meta font-bold', p.goalIssue === 'audit' ? 'bg-p4g-danger text-[color:var(--p4g-danger-ink)]' : 'bg-p4g-black/10')}>
              {p.goalIssue === 'audit' ? '目标的文字需要稍微调整下措辞 · 点这里改' : '挂着的宣告卡不在这台设备上 · 点这里重新挑'}
            </button>
          ) : (
            <button type="button" aria-expanded={panel === 'goal'} aria-label={`目标进度 ${pct}%，点开修改`} onClick={() => toggle('goal')} className="flex w-full min-w-0 items-center gap-2 px-3 pb-3">
              <span className="shrink-0 font-display text-2xs font-bold tracking-[0.2em]">GOAL</span>
              <span className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-pill border-thin border-p4g-black bg-white">
                <span className="absolute inset-y-0 left-0 w-full origin-left bg-p4g-orange transition-transform duration-slow" style={{ transform: `scaleX(${(pct ?? 0) / 100})` }} />
              </span>
              <span className="shrink-0 p4g-num text-meta">{pct}%</span>
            </button>
          )}
        </div>

        <AnimatePresence initial={false} mode="wait">
          {panel && (
            <motion.div key={panel} initial={low ? { opacity: 0 } : { opacity: 0, scaleY: 0.6 }} animate={{ opacity: 1, scaleY: 1 }} exit={{ opacity: 0, scaleY: 0.6 }} transition={{ duration: 0.18 }} className="origin-top">
              <div className="rounded-sm border-3 border-p4g-line bg-p4g-surface p-3" style={{ background: 'var(--p4g-surface-grad)' }}>
                {panel === 'status' ? (
                  <>
                    <div className="mb-2 flex min-w-0 items-baseline justify-between gap-2">
                      <span className="shrink-0 font-display text-2xs font-bold tracking-[0.25em] text-p4g-ink-soft">STATUS</span>
                      <span className="min-w-0 truncate text-2xs font-bold text-p4g-ink-soft">{preset && p.statusSetAt ? `设于${statusAgeText(p.statusSetAt)} · ` : ''}24 小时后自动消失</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_PRESETS.map((s) => (
                        <button key={s.id} type="button" aria-pressed={preset?.id === s.id} onClick={() => setPresence({ statusId: s.id, statusSetAt: Date.now() })}
                          className={cx(chip, preset?.id === s.id ? 'border-p4g-select bg-p4g-select text-[color:var(--p4g-select-ink)]' : 'border-p4g-line bg-p4g-surface-2 text-p4g-ink')}>
                          <span aria-hidden>{s.emoji}</span>{s.label}
                        </button>
                      ))}
                    </div>
                    {preset && <div className="mt-2.5 flex justify-end"><P4Button size="sm" variant="ghost" className="text-p4g-danger" onClick={() => setPresence({ statusId: null, statusSetAt: null })}>清除状态</P4Button></div>}
                  </>
                ) : (
                  <>
                    <div className="mb-2 flex min-w-0 items-baseline justify-between gap-2">
                      <span className="shrink-0 font-display text-2xs font-bold tracking-[0.25em] text-p4g-ink-soft">GOAL</span>
                      <span className="min-w-0 truncate text-2xs font-bold text-p4g-ink-soft">挂一张宣告卡，进度跟着它走</span>
                    </div>
                    {cards.length ? (
                      <>
                        <div className="flex flex-col gap-1">
                          {cards.map((c) => {
                            const on = cardId === c.id;
                            return (
                              <button key={c.id} type="button" aria-pressed={on} onClick={() => { setCardId(c.id); setErr(''); }}
                                className={cx('relative flex w-full min-w-0 items-center gap-2 rounded-pill py-2 pl-7 pr-3 text-left font-display text-body font-bold', on ? 'bg-p4g-orange text-p4g-black' : 'bg-p4g-surface-2 text-p4g-ink')}>
                                {on && <span aria-hidden className="absolute left-2.5 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[6px] border-l-[9px] border-y-transparent border-l-p4g-black" />}
                                <span aria-hidden>{c.icon}</span><span className="min-w-0 flex-1 truncate">{c.title}</span><span className="shrink-0 p4g-num text-meta opacity-70">{c.pct}%</span>
                              </button>
                            );
                          })}
                        </div>
                        <P4Input wrapClassName="mt-2.5" label="对外显示为（可选：别人眼里你的目标叫什么）" value={alias} maxLength={24} onChange={(e) => { setAlias(e.target.value); setErr(''); }} placeholder={CALLING_CARDS.find((c) => c.id === cardId)?.title || '不写就用宣告卡的标题'} />
                      </>
                    ) : <p className="text-meta leading-relaxed text-p4g-ink-soft">还没有进行中的宣告卡——先去首页立一张，再回来把它挂上名片。</p>}
                    {err && <p className="mt-2 text-meta font-bold text-p4g-danger">{err}</p>}
                    <div className="mt-2.5 flex min-w-0 flex-wrap items-center justify-end gap-1.5">
                      {p.goal && <P4Button size="sm" variant="ghost" className="mr-auto text-p4g-danger" onClick={() => { setPresence({ goal: null, goalIssue: null }); setPanel(null); }}>取下目标</P4Button>}
                      <P4Button size="sm" variant="secondary" onClick={() => setPanel(null)}>取消</P4Button>
                      {cards.length > 0 && <P4Button size="sm" variant="black" onClick={saveGoal}>挂上名片</P4Button>}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="min-w-0 rounded-sm border-3 border-p4g-line bg-p4g-surface-2">
          <button type="button" aria-expanded={attrsOpen} onClick={() => setAttrsOpen((v) => !v)} className="flex w-full min-w-0 items-center justify-between gap-2 px-3 py-2.5">
            <span className="font-display text-body font-bold text-p4g-ink">总点数：<span className="p4g-num text-h3 text-[color:var(--p4g-rank)]">{TOTAL_POINTS}</span></span>
            <span className="flex shrink-0 items-center gap-1 font-display text-meta font-bold text-p4g-ink-soft"><span>{TOTAL_LEVEL} 级累计</span><span>{attrsOpen ? '▲' : '▼'}</span></span>
          </button>
          {attrsOpen && (
            <div className="flex flex-col gap-1.5 border-t-2 px-3 py-2.5" style={{ borderColor: 'var(--p4g-line-soft)' }}>
              {ATTRIBUTES.map((a) => (
                <div key={a.id} className="flex min-w-0 items-center gap-2.5">
                  <span className="w-12 shrink-0 font-display text-meta font-bold text-p4g-ink">{a.displayName}</span>
                  <P4Progress className="min-w-0 flex-1" value={a.level} max={LEVEL_MAX} variant="segments" />
                  <span className="w-9 shrink-0 text-right p4g-num text-meta text-p4g-ink">Lv.{a.level}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* 裁切弹窗（可取消）——真实 <ImageCropDialog title="调整我的头像" /> */}
      <CropDialog open={!!pending} onClose={() => setPending(null)} file={pending?.file} src={pending?.src} title="调整我的头像" forceState={pending?.err ? 'error' : undefined} onDone={cropConfirm} />
    </P4Sheet>
  );
}

export default function UserProfileCard({ open, onClose, params }: OverlayProps) {
  const v = params?.get('variant');
  useEffect(() => {
    if (v === 'nogoal') setPresence({ goal: null, goalIssue: null });
    else if (v === 'audit' || v === 'missing') setPresence({ goal: { cardId: 'cc_1' }, goalIssue: v });
    else setPresence({ goal: { cardId: 'cc_1' }, goalIssue: null });
    if (v === 'nostatus') setPresence({ statusId: null, statusSetAt: null });
  }, [v]);
  const panel = params?.get('panel');
  return <UserProfileCardView open={open} onClose={onClose} initialPanel={panel === 'status' || panel === 'goal' ? panel : null} cloud={v !== 'guest'} noCards={v === 'nocards'} initialCrop={params?.get('crop') === 'error' ? 'error' : params?.get('crop') ? 'demo' : null} />;
}
