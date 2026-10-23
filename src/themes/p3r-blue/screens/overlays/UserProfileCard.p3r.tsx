/**
 * 用户资料抽屉（真实 src/pages/Menu.tsx p3 分支 profileSheetOpen → SheetModal「用户资料」+ src/components/UserProfileCard.tsx
 * + src/components/profile/ProfilePresenceEditor.tsx）。蓝白 P3R：MEMBER PASS 斜卡。
 * 头像菜单（更换头像/上传头像 · 移除头像 · 取消，可真实选图）/ 修改用户名（保存·取消）/ LV + ＋状态 / UserID 点击复制（已复制 ✓ / 复制失败）/ 云邮箱
 * / GOAL 进度条 或「＋ 挂一张宣告卡作为目标」/ 状态面板（19 预设、设于… · 24 小时后自动消失、清除状态）
 * / 目标面板（宣告卡单选、对外显示为、问题提示、取下目标·取消·挂上名片、空态）/ 总点数：N + 五维展开。
 * 路由：?panel=status|goal  ?variant=nogoal|audit|missing|nocards|guest|nostatus。状态机改写自黄色版（只读参考）。
 * 换头像第二步（真实 pendingFile → <ImageCropDialog title="调整我的头像" />）：选图后先进 P3R 取景器裁切（可取消）→「完成裁切」才
 *   updateUser({ avatarDataUrl }) → 头像上「上传中」遮罩 → 成功换图；非图片「请选择图片文件」。?crop=1 直接打开裁切（demo 图）、?crop=error 裁切报错态。
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { OverlayProps } from '@blue/registry/types';
import { P3Sheet, P3Input, P3Button, P3Field, P3Progress, P3R, slantClip, tickClip, SelectWedge, IconEdit, useToast } from '@blue/kit';
import { useBoldness } from '@blue/lib/prefs';
import { Chip } from '@blue/screens/pkg5/ui';
import { presetOf, goalPct, setPresence, statusAgeText, usePresence } from '@blue/screens/pkg5/presence';
import { CropDialog } from './ImageCropDialog.p3r';
import { sampleImg } from '@blue/screens/pkg6/compat';
import { STATUS_PRESETS } from '@/constants/profileStatus';
import { useAppStore } from '@/store';
import { useCloudStore } from '@/store/cloud';

type Panel = null | 'status' | 'goal';

export function UserProfileCardView({ open, onClose, initialPanel = null, cloud = true, noCards = false, initialCrop = null }: { open: boolean; onClose: () => void; initialPanel?: Panel; cloud?: boolean; noCards?: boolean; initialCrop?: null | 'demo' | 'error' }) {
  const toast = useToast();
  const anim = useBoldness();
  const p = usePresence();
  const attributes = useAppStore((state) => state.attributes);
  const callingCards = useAppStore((state) => state.callingCards);
  const cloudUser = useCloudStore((state) => state.cloudUser);
  const totalPoints = attributes.reduce((sum, attribute) => sum + attribute.points, 0);
  const totalLevel = cloudUser?.total_lv ?? attributes.reduce((sum, attribute) => sum + attribute.level, 0);
  const levelMax = Math.max(6, ...attributes.map((attribute) => attribute.level));
  const cardPct = (id: string) => Math.round(Math.max(0, Math.min(1, useAppStore.getState().getCallingCardProgress(id)?.overallProgress ?? 0)) * 100);
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
  useEffect(() => { if (open) { setPanel(initialPanel); setEditing(false); setAvatarMenu(false); setNameDraft(p.name); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!open || !initialCrop) return; const t = window.setTimeout(() => setPending(initialCrop === 'error' ? { err: true } : { src: sampleImg('town-day.webp') }), 450); return () => window.clearTimeout(t); }, [open, initialCrop]);
  const preset = presetOf(p.statusId);
  const pct = goalPct(p.goal);
  const cards = noCards ? [] : callingCards.filter((card) => !card.archived);
  const toggle = (x: Exclude<Panel, null>) => setPanel((cur) => (cur === x ? null : x));
  const saveName = () => { const v = nameDraft.trim(); if (v) setPresence({ name: v }); setEditing(false); };
  const copy = () => {
    if (!navigator.clipboard) setCopied('err'); else navigator.clipboard.writeText(cloudUser?.username ?? p.name).then(() => setCopied('ok'), () => setCopied('err'));
    window.setTimeout(() => setCopied(null), 1500);
  };
  const pick = (f: File) => {
    if (!f.type.startsWith('image/')) { toast.error('请选择图片文件'); return; }
    setPending({ file: f });
  };
  /** 真实 handleCropConfirm：先关裁切 → uploading → updateUser({ avatarDataUrl }) */
  const cropConfirm = (dataUrl: string) => {
    setPending(null); setUploading(true);
    window.setTimeout(() => { setPresence({ avatar: dataUrl }); setUploading(false); toast.success('头像已更新'); }, 700);
  };
  const saveGoal = () => {
    if (!cardId) { setErr('先挑一张宣告卡'); return; }
    if (/傻|笨/.test(alias)) { setErr('文字需要稍微调整下措辞'); return; }
    setPresence({ goal: { cardId, alias: alias.trim() || undefined }, goalIssue: null }); setPanel(null);
  };
  return (
    <P3Sheet open={open} onClose={onClose} title="用户资料" en="PROFILE">
      <div className="flex min-w-0 flex-col gap-3 pt-1">
        {/* MEMBER PASS */}
        <div className="relative min-w-0" style={{ filter: 'drop-shadow(0 12px 24px rgb(var(--p3r-ink-rgb) / 0.12))' }}>
          <div className="relative" style={{ clipPath: slantClip(18), background: P3R.panel }}>
            <div className="flex items-center justify-between py-1.5 pl-8 pr-7" style={{ background: P3R.blue }}>
              <span className="shrink-0 font-cond text-[12px] tracking-[0.22em]" style={{ color: P3R.onBlue }}>MEMBER PASS</span>
              <span className="font-cond text-[11px]" style={{ color: P3R.onBlue, opacity: 0.8 }}>ROOM 03</span>
            </div>
            <div className="flex min-w-0 gap-3 py-3 pl-7 pr-5">
              <div className="relative shrink-0">
                <button type="button" aria-label="头像菜单" onClick={() => setAvatarMenu((v) => !v)} disabled={uploading} className="relative flex h-[72px] w-[64px] items-center justify-center overflow-hidden active:scale-95" style={{ clipPath: slantClip(8), background: P3R.cyanPale }}>
                  {p.avatar ? <img src={p.avatar} alt="" className="h-full w-full object-cover" /> : <span className="font-heavy text-[30px]" style={{ color: P3R.blue }}>{p.name.slice(0, 1)}</span>}
                  {uploading && <span className="absolute inset-0 flex items-center justify-center text-[12px] font-black text-white" style={{ background: 'rgb(var(--p3r-mulberry-rgb) / 0.6)' }}>上传中</span>}
                </button>
              </div>
              <div className="min-w-0 flex-1">
                {editing ? (
                  <div className="flex min-w-0 items-center gap-1.5">
                    <P3Input autoFocus value={nameDraft} maxLength={20} onChange={(e) => setNameDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditing(false); setNameDraft(p.name); } }} aria-label="用户名" />
                    <P3Button size="sm" onClick={saveName}>保存</P3Button>
                    <P3Button size="sm" tone="soft" onClick={() => { setEditing(false); setNameDraft(p.name); }}>取消</P3Button>
                  </div>
                ) : (
                  <div className="flex min-w-0 items-center gap-2">
                    <h3 className="min-w-0 truncate font-heavy text-[clamp(18px,5vw,22px)] leading-tight" style={{ color: P3R.ink }}>{p.name}</h3>
                    <button type="button" aria-label="修改用户名" onClick={() => { setNameDraft(p.name); setEditing(true); }} className="flex h-8 w-8 shrink-0 items-center justify-center" style={{ clipPath: slantClip(5), background: 'var(--p3r-chip)', color: P3R.ink }}><IconEdit size={14} /></button>
                  </div>
                )}
                <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="relative inline-flex items-baseline gap-1 px-3 py-0.5" style={{ clipPath: slantClip(6), background: P3R.blue, color: P3R.onBlue }}>
                    <span className="text-[10px] font-black opacity-85">LV</span><span className="font-cond text-[15px] leading-none">{totalLevel}</span>
                  </span>
                  {preset ? (
                    <button type="button" title="改状态" aria-expanded={panel === 'status'} onClick={() => toggle('status')} className="inline-flex min-w-0 max-w-full items-center gap-1 px-2.5 py-0.5 text-[12px] font-black" style={{ clipPath: slantClip(5), background: P3R.cyan, color: 'var(--p3r-mulberry)' }}>
                      <span aria-hidden className="font-heavy not-italic">{preset.emoji}</span><span className="truncate">{preset.label}</span>
                    </button>
                  ) : <button type="button" aria-expanded={panel === 'status'} onClick={() => toggle('status')} className="px-2.5 py-0.5 text-[12px] font-black" style={{ clipPath: slantClip(5), boxShadow: 'inset 0 0 0 1.5px var(--p3r-blue)', color: P3R.roseInk }}>＋状态</button>}
                </div>
                {cloud && (
                  <div className="mt-1.5 min-w-0 space-y-0.5">
                    <button type="button" title="点击复制 UserID" onClick={copy} className="flex max-w-full items-center gap-1 text-[12px] font-black" style={{ color: P3R.roseInk }}>
                      <span className="opacity-70">@</span><span className="truncate font-mono">{cloudUser?.username ?? p.name}</span>
                      <span className="shrink-0 text-[11px]">{copied === 'ok' ? '已复制 ✓' : copied === 'err' ? '复制失败' : '· 点击复制'}</span>
                    </button>
                    <div className="truncate text-[11px] font-bold" style={{ color: P3R.grey }}>云端 · {cloudUser?.email ?? '未登录'}</div>
                  </div>
                )}
              </div>
            </div>
            {!p.goal ? (
              <button type="button" aria-expanded={panel === 'goal'} onClick={() => toggle('goal')} className="mx-6 mb-3 flex h-9 w-[calc(100%-3rem)] items-center justify-center text-[13px] font-black" style={{ clipPath: slantClip(7), boxShadow: 'inset 0 0 0 1.5px rgb(var(--p3r-blue-rgb) / 0.6)', color: P3R.roseInk }}>＋ 挂一张宣告卡作为目标</button>
            ) : p.goalIssue ? (
              <button type="button" onClick={() => toggle('goal')} className="mx-6 mb-3 block w-[calc(100%-3rem)] px-3 py-1.5 text-left text-[12px] font-black" style={{ clipPath: slantClip(7), background: p.goalIssue === 'audit' ? 'var(--bk-danger-wash)' : P3R.cyanPale, color: p.goalIssue === 'audit' ? 'var(--p3r-coral-ink)' : P3R.ink }}>
                {p.goalIssue === 'audit' ? '目标的文字需要稍微调整下措辞 · 点这里改' : '挂着的宣告卡不在这台设备上 · 点这里重新挑'}
              </button>
            ) : (
              <button type="button" aria-expanded={panel === 'goal'} aria-label={`目标进度 ${pct}%，点开修改`} onClick={() => toggle('goal')} className="flex w-full min-w-0 items-center gap-2 pb-3 pl-7 pr-6">
                <span className="shrink-0 font-cond text-[11px] tracking-[0.2em]" style={{ color: P3R.grey }}>GOAL</span>
                <P3Progress value={(pct ?? 0) / 100} className="min-w-0 flex-1" thick={6} />
                <span className="shrink-0 font-cond text-[14px]" style={{ color: P3R.blue }}>{pct}%</span>
              </button>
            )}
          </div>
          <span aria-hidden className="absolute bottom-[3px] right-4 h-[8px] w-[20px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
          {/* 头像菜单（P3R 系统小框：光标楔） */}
          <AnimatePresence>
            {avatarMenu && !uploading && (
              <motion.div className="absolute left-6 top-[118px] z-10 w-40 p-1.5" style={{ background: P3R.ink, clipPath: slantClip(10) }}
                initial={anim ? { opacity: 0, x: -12 } : { opacity: 0 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }}>
                {[{ id: 'pick', label: p.avatar ? '更换头像' : '上传头像' }, ...(p.avatar ? [{ id: 'rm', label: '移除头像' }] : []), { id: 'x', label: '取消' }].map((it, i) => (
                  <button key={it.id} type="button" onClick={() => { setAvatarMenu(false); if (it.id === 'pick') fileRef.current?.click(); if (it.id === 'rm') setPresence({ avatar: null }); }} className="relative block w-full px-3 py-2 text-left text-[14px] font-black">
                    {i === 0 && <SelectWedge className="-left-1 -right-1 inset-y-0" />}
                    <span className="relative" style={{ color: i === 0 ? 'var(--p3r-mulberry)' : it.id === 'rm' ? P3R.magenta : 'var(--p3r-on-ink)' }}>{it.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) pick(f); }} />
        </div>

        <AnimatePresence initial={false} mode="wait">
          {panel && (
            <motion.div key={panel} initial={anim ? { opacity: 0, x: -18 } : { opacity: 0 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 18 }} transition={{ duration: 0.18 }}>
              <div className="px-5 py-3" style={{ clipPath: slantClip(12), background: 'var(--p3r-row)' }}>
                {panel === 'status' ? (
                  <>
                    <div className="mb-2 flex min-w-0 items-baseline justify-between gap-2">
                      <span className="shrink-0 font-cond text-[11px] tracking-[0.25em]" style={{ color: P3R.roseInk }}>STATUS</span>
                      <span className="min-w-0 truncate text-[11px] font-bold" style={{ color: P3R.grey }}>{preset && p.statusSetAt ? `设于${statusAgeText(p.statusSetAt)} · ` : ''}24 小时后自动消失</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_PRESETS.map((s) => <Chip key={s.id} on={preset?.id === s.id} onClick={() => setPresence({ statusId: s.id, statusSetAt: Date.now() })}><span aria-hidden className="font-heavy not-italic opacity-80">{s.emoji}</span>{s.label}</Chip>)}
                    </div>
                    {preset && <div className="mt-2.5 flex justify-end"><P3Button size="sm" tone="ghost" onClick={() => setPresence({ statusId: null, statusSetAt: null })}><span style={{ color: 'var(--p3r-coral-ink)' }}>清除状态</span></P3Button></div>}
                  </>
                ) : (
                  <>
                    <div className="mb-2 flex min-w-0 items-baseline justify-between gap-2">
                      <span className="shrink-0 font-cond text-[11px] tracking-[0.25em]" style={{ color: P3R.roseInk }}>GOAL</span>
                      <span className="min-w-0 truncate text-[11px] font-bold" style={{ color: P3R.grey }}>挂一张宣告卡，进度跟着它走</span>
                    </div>
                    {cards.length ? (
                      <>
                        <div className="flex flex-col gap-1">
                          {cards.map((c) => {
                            const on = cardId === c.id;
                            return (
                              <button key={c.id} type="button" aria-pressed={on} onClick={() => { setCardId(c.id); setErr(''); }} className="relative flex w-full min-w-0 items-center gap-2 py-2 pl-7 pr-4 text-left text-[14px] font-black">
                                {on ? <SelectWedge className="-left-1 -right-1 inset-y-0" /> : <span aria-hidden className="absolute inset-0" style={{ background: 'var(--p3r-chip)', clipPath: slantClip(8) }} />}
                                <span aria-hidden className="relative font-heavy not-italic" style={{ color: on ? 'var(--p3r-mulberry)' : P3R.blue }}>{c.icon}</span>
                                <span className="relative min-w-0 flex-1 truncate" style={{ color: on ? 'var(--p3r-mulberry)' : P3R.ink }}>{c.title}</span>
                                <span className="relative shrink-0 font-cond text-[14px]" style={{ color: on ? 'var(--p3r-mulberry)' : P3R.grey }}>{cardPct(c.id)}%</span>
                              </button>
                            );
                          })}
                        </div>
                        <P3Field className="mt-2.5" label="对外显示为（可选：别人眼里你的目标叫什么）" count={`${alias.length}/24`}>
                          <P3Input value={alias} maxLength={24} onChange={(e) => { setAlias(e.target.value); setErr(''); }} placeholder="不写就用宣告卡的标题" />
                        </P3Field>
                      </>
                    ) : <p className="text-[13px] font-bold leading-relaxed" style={{ color: P3R.grey }}>还没有进行中的宣告卡——先去首页立一张，再回来把它挂上名片。</p>}
                    {err && <p className="mt-2 text-[12px] font-black" style={{ color: 'var(--p3r-coral-ink)' }}>{err}</p>}
                    <div className="mt-2.5 flex min-w-0 flex-wrap items-center justify-end gap-1.5">
                      {p.goal && <P3Button size="sm" tone="ghost" className="mr-auto" onClick={() => { setPresence({ goal: null, goalIssue: null }); setPanel(null); }}><span style={{ color: 'var(--p3r-coral-ink)' }}>取下目标</span></P3Button>}
                      <P3Button size="sm" tone="soft" onClick={() => setPanel(null)}>取消</P3Button>
                      {cards.length > 0 && <P3Button size="sm" corner onClick={saveGoal}>挂上名片</P3Button>}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="min-w-0" style={{ clipPath: slantClip(12), background: 'var(--p3r-row-alt)' }}>
          <button type="button" aria-expanded={attrsOpen} onClick={() => setAttrsOpen((v) => !v)} className="flex w-full min-w-0 items-center justify-between gap-2 py-2.5 pl-5 pr-5">
          <span className="text-[14px] font-black" style={{ color: P3R.ink }}>总点数：<span className="font-cond text-[22px]" style={{ color: P3R.blue }}>{totalPoints}</span></span>
          <span className="flex shrink-0 items-center gap-1 text-[12px] font-black" style={{ color: P3R.grey }}><span>{totalLevel} 级累计</span><span>{attrsOpen ? '▲' : '▼'}</span></span>
          </button>
          {attrsOpen && (
            <div className="flex flex-col gap-1.5 px-5 pb-3">
              {attributes.map((a) => (
                <div key={a.id} className="flex min-w-0 items-center gap-2.5">
                  <span className="w-12 shrink-0 text-[13px] font-black" style={{ color: P3R.ink }}>{a.displayName}</span>
                  <P3Progress className="min-w-0 flex-1" value={a.level} max={levelMax} variant="segments" />
                  <span className="w-10 shrink-0 text-right font-cond text-[14px]" style={{ color: P3R.ink }}>Lv.{a.level}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* 裁切弹窗（可取消）——真实 <ImageCropDialog title="调整我的头像" /> */}
      <CropDialog open={!!pending} onClose={() => setPending(null)} file={pending?.file} src={pending?.src} title="调整我的头像" forceState={pending?.err ? 'error' : undefined} onDone={cropConfirm} />
    </P3Sheet>
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
