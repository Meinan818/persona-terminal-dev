/**
 * 成就页（真实 src/pages/Achievements.tsx + components/codex/**）P4G 重制。
 * Tab：成就 / 技能 / 图鉴。
 *  成就：筛选（全部/未完成/已完成，点击循环）+ 添加成就；成就卡（图标·标题·描述·进度·「已达成，点击解锁 ✨」·解锁于·隐藏成就 ？？？·编辑/删除）；
 *        属性等级类按属性归组分档（左右滑 / 「切到第 N 档」点）。
 *  技能：筛选（全部/未解锁/已解锁）+ 添加技能；按属性分组（N/M 已解锁、合计 ×N / 已达上限 ×3.0）；技能行（赐福开关、解锁、加成说明、编辑、删除）。
 *  图鉴：塔罗（大阿卡纳 N / 44、小阿卡纳 N / 112、按花色）/ 岁时（年份、春夏秋冬翻页、印记）→ 翻面卡。
 * 路由：?tab=achievements|skills|codex &sub=tarot|season &state=empty
 */
import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import type { PageProps } from '@yellow/registry/types';
import type { Achievement, AttributeId, Skill } from '@/types';
import { P4PageHeader, P4Tabs, P4SegmentTabs, P4Button, P4Switch, P4Section, P4Progress, P4EmptyState, IconEdit, IconTrash, IconPlus, useToast } from '@yellow/kit';
import { CollageStagger, CollageItem, CutInFrame } from '@yellow/fx';
import { navigate } from '@yellow/shell/shellBus';
import { cx } from '@yellow/lib/cx';
import { useLowMotion } from '@yellow/lib/prefs';
import { DevStateBar } from '@yellow/screens/pkg5/ui';
import { AchievementFormView, type AchForm } from '@yellow/screens/overlays/AchievementForm.p4g';
import { AchievementDeleteView } from '@yellow/screens/overlays/AchievementsDeleteConfirm.p4g';
import { SkillFormView, effectText, type SkillFormValue } from '@yellow/screens/overlays/SkillForm.p4g';
import { SkillDeleteView } from '@yellow/screens/overlays/AchievementsSkillDeleteConfirm.p4g';
import { TarotFace, TarotFlipViewView } from '@yellow/screens/overlays/TarotFlipView.p4g';
import { SeasonCard, SeasonFlipView } from '@yellow/screens/overlays/FlipCardView.p4g';
import { ACHIEVEMENTS, ATTRIBUTES, ATTR_IDS, ATTR_NAMES, HIDDEN_IDS, SEALED_IDS, SEASON_COLLECTED, SEASON_EXTRAS, SKILLS, SKILL_BONUS_MULT_CAP, TAROT_COLLECTED, achievementProgress } from '@yellow/adapters/pkg5';
import { useRealCodex, useCodexCollections, useAchievementProgressMap, useTarotCollectedMap, useSeasonCollectedMap } from '@yellow/adapters/pkg5';
import { P5_MAJOR, P5_MINOR, P5_SUIT_META, type P5TarotCard } from '@yellow/adapters/pkg5-tarot';
import { P5_SEASON_PAGES, type P5SeasonMark } from '@yellow/adapters/pkg5-season';

type Filter = 'all' | 'locked' | 'unlocked';
const CYCLE: Filter[] = ['all', 'locked', 'unlocked'];
const RIBBON = 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))';

/* ───────── 成就 ───────── */
function AchievementCard({ a, onUnlock, onEdit, onDelete, tiers }: { a: Achievement; onUnlock: () => void; onEdit: () => void; onDelete: () => void; tiers?: { count: number; idx: number; set: (i: number) => void; dir: number } }) {
  const progressMap = useAchievementProgressMap();
  const hidden = HIDDEN_IDS.has(a.id) && !a.unlocked;
  const face = hidden ? { title: '？？？', description: '隐藏成就', icon: '❔' } : a;
  const progress = progressMap[a.id] ?? 0;
  const canUnlock = !a.unlocked && progress >= a.condition.value && !hidden;
  const sealed = SEALED_IDS.has(a.id);
  const custom = a.id.startsWith('custom_');
  const pct = Math.min(1, progress / a.condition.value);
  const onPanEnd = (_: unknown, info: PanInfo) => { if (!tiers) return; if (info.offset.x < -40 && tiers.idx < tiers.count - 1) tiers.set(tiers.idx + 1); if (info.offset.x > 40 && tiers.idx > 0) tiers.set(tiers.idx - 1); };
  return (
    <motion.div onClick={() => { if (canUnlock) onUnlock(); }} onPanEnd={onPanEnd} whileTap={canUnlock ? { scale: 0.97 } : undefined}
      className={cx('relative h-full min-w-0 cursor-pointer touch-pan-y', canUnlock && 'drop-shadow-[4px_4px_0_var(--p4g-orange)]')} style={{ filter: canUnlock ? undefined : 'drop-shadow(4px 4px 0 var(--p4g-shadow-color))' }}>
      <div className="h-full p-[3px]" style={{ clipPath: RIBBON, background: 'var(--p4g-line)' }}>
        <div className={cx('relative flex h-full min-w-0 flex-col items-center px-3 pb-3 pt-4 text-center', a.unlocked ? 'bg-p4g-orange text-p4g-black' : canUnlock ? 'bg-p4g-yellow text-p4g-black' : 'bg-p4g-surface-2 text-p4g-ink')} style={{ clipPath: RIBBON }}>
          {a.unlocked && <span aria-hidden className="absolute -left-6 top-3 w-24 -rotate-45 bg-p4g-black py-0.5 text-center font-display text-[9px] font-bold tracking-widest text-p4g-yellow">CLEAR</span>}
          <div className="absolute right-3 top-2 flex gap-1">
            {!sealed && <button type="button" aria-label={`编辑成就 ${a.title}`} onClick={(e) => { e.stopPropagation(); onEdit(); }} className="flex h-7 w-7 items-center justify-center rounded-xs border-thin border-current bg-white/40"><IconEdit size={12} /></button>}
            {custom && <button type="button" aria-label={`删除成就 ${a.title}`} onClick={(e) => { e.stopPropagation(); onDelete(); }} className="flex h-7 w-7 items-center justify-center rounded-xs border-thin border-current bg-white/40 text-p4g-danger"><IconTrash size={12} /></button>}
          </div>
          <span className="mb-1.5 flex h-12 w-12 items-center justify-center rounded-pill border-[3px] border-p4g-black bg-p4g-yellow-pale text-2xl">{face.icon}</span>
          <h3 className="w-full truncate font-display text-lead font-bold">{face.title}</h3>
          <p className="mb-2 w-full text-meta leading-snug opacity-80 p4g-clamp-2">{face.description}</p>
          <div className="mt-auto w-full">
            {!a.unlocked ? (
              <>
                {!hidden && !canUnlock && <P4Progress value={pct * 100} max={100} variant="bar" className="mx-auto max-w-[80%]" />}
                <div className={cx('mt-1.5 font-display text-2xs font-bold', canUnlock ? 'inline-block rounded-pill bg-p4g-black px-2.5 py-1 text-p4g-yellow' : 'opacity-75')}>{canUnlock ? '已达成，点击解锁 ✨' : hidden ? '？？？' : <span className="p4g-num">{progress} / {a.condition.value}</span>}</div>
              </>
            ) : a.unlockedDate && <div className="font-display text-2xs font-bold opacity-80">解锁于 {a.unlockedDate.toLocaleDateString('zh-CN')}</div>}
            {tiers && tiers.count > 1 && (
              <div className="mt-2 flex justify-center gap-1.5">
                {Array.from({ length: tiers.count }, (_, i) => (
                  <button key={i} type="button" aria-label={`切到第 ${i + 1} 档`} onClick={(e) => { e.stopPropagation(); tiers.set(i); }} className={cx('h-[6px] -skew-x-12 transition-all duration-fast', i === tiers.idx ? 'w-5 bg-p4g-black' : 'w-2 bg-p4g-black/30')} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AchievementsTab({ empty }: { empty: boolean }) {
  const toast = useToast();
  const low = useLowMotion();
  const realCodex = useRealCodex();
  const collections = useCodexCollections();
  const [list, setList] = useState<Achievement[]>(empty ? [] : (realCodex.achievements.length ? realCodex.achievements : ACHIEVEMENTS));
  const [filter, setFilter] = useState<Filter>('all');
  const [form, setForm] = useState<{ open: boolean; editing: Achievement | null }>({ open: false, editing: null });
  const [del, setDel] = useState<string | null>(null);
  const [delOpen, setDelOpen] = useState(false);
  const [tierIdx, setTierIdx] = useState<Record<string, number>>({});
  const [tierDir, setTierDir] = useState<Record<string, number>>({});
  const [cut, setCut] = useState<Achievement | null>(null);
  const label = { all: '全部', locked: '未完成', unlocked: '已完成' }[filter];
  const visible = list.filter((a) => (filter === 'all' ? true : filter === 'unlocked' ? a.unlocked : !a.unlocked));
  // 属性等级类按属性分档
  const groups: Array<{ key: string; items: Achievement[] }> = [];
  const byAttr: Record<string, Achievement[]> = {};
  visible.forEach((a) => { if (a.condition.type === 'attribute_level' && a.condition.attribute) { (byAttr[a.condition.attribute] ??= []).push(a); if (byAttr[a.condition.attribute].length === 1) groups.push({ key: `attr-${a.condition.attribute}`, items: byAttr[a.condition.attribute] }); } else groups.push({ key: a.id, items: [a] }); });
  const unlock = (a: Achievement) => { setList((xs) => xs.map((x) => (x.id === a.id ? { ...x, unlocked: true, unlockedDate: new Date(2026, 9, 20) } : x))); setCut(a); };
  const saveForm = (f: AchForm) => {
    const cond = { type: f.type, value: f.value, attribute: f.type === 'attribute_level' ? f.attribute : undefined, keywords: f.type === 'keyword_match' ? f.keywords.split(/[,，]/).map((s) => s.trim()).filter(Boolean) : undefined } as Achievement['condition'];
    if (form.editing) setList((xs) => xs.map((x) => (x.id === form.editing!.id ? { ...x, title: f.title, description: f.description, icon: f.icon, condition: cond } : x)));
    else setList((xs) => [...xs, { id: `custom_${Date.now()}`, title: f.title, description: f.description, icon: f.icon, unlocked: false, condition: cond }]);
    toast.success(form.editing ? '成就已保存' : '成就已添加');
  };
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        <P4Button size="sm" variant="secondary" onClick={() => setFilter(CYCLE[(CYCLE.indexOf(filter) + 1) % 3])} trailing={<span aria-hidden className="text-2xs">▸</span>}>{label}</P4Button>
        <P4Button size="sm" variant="black" leading={<IconPlus size={14} />} onClick={() => setForm({ open: true, editing: null })}>添加成就</P4Button>
      </div>
      {list.length === 0 ? (
        <P4EmptyState title="暂无成就" hint="完成记录、任务与目标后，成就会出现在这里" />
      ) : visible.length === 0 ? (
        <P4EmptyState title="暂无可展示的成就" hint="换个筛选看看" />
      ) : (
        <CollageStagger key={filter} className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 wide:grid-cols-3">
          {groups.map((g, gi) => {
            const attr = g.key.startsWith('attr-') ? g.key.slice(5) : null;
            const idx = attr ? Math.min(tierIdx[attr] ?? 0, g.items.length - 1) : 0;
            const a = g.items[idx];
            return (
              <CollageItem key={g.key} tilt={gi % 3 === 1 ? 0.8 : gi % 3 === 2 ? -0.6 : 0} className="min-w-0">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={a.id} className="h-full" initial={low ? { opacity: 0 } : { x: (tierDir[attr ?? ''] ?? 1) * 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={low ? { opacity: 0 } : { x: (tierDir[attr ?? ''] ?? 1) * -30, opacity: 0 }} transition={{ duration: 0.16 }}>
                    <AchievementCard a={a} onUnlock={() => unlock(a)} onEdit={() => setForm({ open: true, editing: a })} onDelete={() => { setDel(a.id); setDelOpen(true); }}
                      tiers={attr ? { count: g.items.length, idx, dir: 1, set: (i) => { setTierDir((d) => ({ ...d, [attr]: i > idx ? 1 : -1 })); setTierIdx((t) => ({ ...t, [attr]: i })); } } : undefined} />
                  </motion.div>
                </AnimatePresence>
              </CollageItem>
            );
          })}
        </CollageStagger>
      )}
      <AchievementFormView open={form.open} editing={form.editing} onClose={() => setForm((f) => ({ ...f, open: false }))} onSave={saveForm} onDelete={() => { if (form.editing) { setDel(form.editing.id); setDelOpen(true); } }} />
      <AchievementDeleteView open={delOpen} onClose={() => setDelOpen(false)} onConfirm={() => { setList((xs) => xs.filter((x) => x.id !== del)); toast('成就已删除'); }} />
      <CutInFrame open={!!cut} onClose={() => setCut(null)} eyebrow="ACHIEVEMENT" title="成就解锁!!" subtitle={cut ? `${cut.icon} ${cut.title}` : ''} autoCloseMs={2400} />
    </div>
  );
}

/* ───────── 技能 ───────── */
function SkillsTab({ empty }: { empty: boolean }) {
  const toast = useToast();
  const [skills, setSkills] = useState<Skill[]>(empty ? [] : SKILLS);
  const [filter, setFilter] = useState<Filter>('all');
  const [form, setForm] = useState<{ open: boolean; editing: Skill | null }>({ open: false, editing: null });
  const [del, setDel] = useState<string | null>(null);
  const [delOpen, setDelOpen] = useState(false);
  const [cut, setCut] = useState<Skill | null>(null);
  const lvOf = (id: AttributeId) => ATTRIBUTES.find((a) => a.id === id)?.level ?? 0;
  const vis = skills.filter((s) => (filter === 'all' ? true : filter === 'unlocked' ? s.unlocked : !s.unlocked));
  const byAttr = ATTR_IDS.map((id) => ({ id, items: vis.filter((s) => s.requiredAttribute === id).sort((a, b) => a.requiredLevel - b.requiredLevel) })).filter((g) => g.items.length);
  const save = (v: SkillFormValue) => {
    if (form.editing) setSkills((xs) => xs.map((x) => (x.id === form.editing!.id ? { ...x, ...v, description: effectText(v.requiredAttribute, v.bonusMultiplier) } : x)));
    else setSkills((xs) => [...xs, { id: `custom_${Date.now()}`, ...v, description: effectText(v.requiredAttribute, v.bonusMultiplier), unlocked: false }]);
    toast.success(form.editing ? '技能已保存' : '技能已添加');
  };
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        <P4Button size="sm" variant="secondary" onClick={() => setFilter(CYCLE[(CYCLE.indexOf(filter) + 1) % 3])} trailing={<span aria-hidden className="text-2xs">▸</span>}>{{ all: '全部', locked: '未解锁', unlocked: '已解锁' }[filter]}</P4Button>
        <P4Button size="sm" variant="black" leading={<IconPlus size={14} />} onClick={() => setForm({ open: true, editing: null })}>添加技能</P4Button>
      </div>
      {byAttr.length === 0 ? <P4EmptyState title="暂无技能" hint="属性升级后会解锁对应技能" /> : (
        <CollageStagger className="grid grid-cols-1 gap-4 wide:grid-cols-2">
          {byAttr.map((g) => {
            const all = skills.filter((s) => s.requiredAttribute === g.id);
            const raw = all.filter((s) => s.unlocked && s.bonusMultiplier).reduce((m, s) => m * (s.bonusMultiplier as number), 1);
            const capped = raw > SKILL_BONUS_MULT_CAP;
            const total = Math.min(SKILL_BONUS_MULT_CAP, raw);
            return (
              <CollageItem key={g.id} className="min-w-0">
                <div className="min-w-0 overflow-hidden rounded-sm border-3 border-p4g-line shadow-hard">
                  <div className="flex min-w-0 items-center gap-2 bg-p4g-black px-3 py-2 text-white night:bg-p4g-surface">
                    <span className="font-display text-lead font-bold text-p4g-yellow">{ATTR_NAMES[g.id]}</span>
                    <span className="rounded-xs bg-white/15 px-1.5 p4g-num text-2xs">Lv.{lvOf(g.id)}</span>
                    <span className="ml-auto shrink-0 font-display text-2xs font-bold text-white/80">{all.filter((s) => s.unlocked).length}/{all.length} 已解锁</span>
                    {total > 1 && <span title={capped ? `技能连乘已超过上限，按 ×${SKILL_BONUS_MULT_CAP.toFixed(1)} 生效` : '本属性已解锁技能的合计加成'} className={cx('shrink-0 rounded-xs px-1.5 py-0.5 p4g-num text-2xs', capped ? 'bg-p4g-red text-white' : 'bg-p4g-orange text-p4g-black')}>{capped ? `已达上限 ×${SKILL_BONUS_MULT_CAP.toFixed(1)}` : `合计 ×${total.toFixed(2).replace(/0$/, '')}`}</span>}
                  </div>
                  {g.items.map((s) => {
                    const blessing = s.id.startsWith('blessing_');
                    const custom = s.id.startsWith('custom_');
                    const can = !blessing && !s.unlocked && lvOf(s.requiredAttribute) >= s.requiredLevel;
                    return (
                      <div key={s.id} className={cx('relative flex min-w-0 items-center gap-3 px-3 py-2.5', can && 'bg-p4g-yellow text-p4g-black')} style={can ? undefined : { background: 'var(--p4g-surface-grad)' }}>
                        <span className={cx('flex h-9 w-9 shrink-0 -skew-x-6 items-center justify-center border-3 font-display text-body font-bold', blessing ? (s.unlocked ? 'border-p4g-black bg-p4g-orange text-p4g-black' : 'border-p4g-line bg-p4g-surface-2 text-p4g-muted') : s.unlocked ? 'border-p4g-black bg-p4g-black text-p4g-yellow night:border-p4g-yellow' : can ? 'border-p4g-black bg-p4g-red text-white' : 'border-p4g-line bg-p4g-surface-2 text-p4g-ink-soft')}>
                          <span className="skew-x-6">{blessing ? (s.unlocked ? '✦' : '✧') : s.unlocked ? '✓' : can ? '!' : s.requiredLevel}</span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span className={cx('min-w-0 truncate font-display text-lead font-bold', !can && 'text-p4g-ink')}>{s.name}</span>
                            {blessing && <span className="shrink-0 rounded-xs bg-p4g-orange px-1.5 font-display text-2xs font-bold text-p4g-black">赐福</span>}
                            {!blessing && !s.unlocked && <span className={cx('shrink-0 rounded-xs px-1.5 p4g-num text-2xs', can ? 'bg-p4g-black text-p4g-yellow' : 'bg-p4g-surface-2 text-p4g-ink-soft')}>需 Lv.{s.requiredLevel}</span>}
                          </div>
                          <p className={cx('truncate text-meta', can ? 'opacity-80' : 'text-p4g-ink-soft')}>{s.description}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {blessing && (<><P4Switch size="sm" checked={s.unlocked} onChange={(v) => setSkills((xs) => xs.map((x) => (x.id === s.id ? { ...x, unlocked: v } : x)))} aria-label={`赐福 ${s.name}`} /><button type="button" aria-label={`删除技能 ${s.name}`} onClick={() => { setDel(s.id); setDelOpen(true); }} className="flex h-8 w-8 items-center justify-center text-p4g-danger"><IconTrash size={14} /></button></>)}
                          {can && <P4Button size="sm" variant="black" onClick={() => { setSkills((xs) => xs.map((x) => (x.id === s.id ? { ...x, unlocked: true } : x))); setCut(s); }}>解锁</P4Button>}
                          {!blessing && (!s.unlocked || custom) && <button type="button" aria-label={`编辑技能 ${s.name}`} onClick={() => setForm({ open: true, editing: s })} className="flex h-8 w-8 items-center justify-center rounded-xs border-thin border-current"><IconEdit size={13} /></button>}
                          {!blessing && custom && !s.unlocked && <button type="button" aria-label={`删除技能 ${s.name}`} onClick={() => { setDel(s.id); setDelOpen(true); }} className="flex h-8 w-8 items-center justify-center text-p4g-danger"><IconTrash size={13} /></button>}
                        </div>
                        <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: 'var(--p4g-separator-b)' }} />
                      </div>
                    );
                  })}
                </div>
              </CollageItem>
            );
          })}
        </CollageStagger>
      )}
      <SkillFormView open={form.open} editing={form.editing} onClose={() => setForm((f) => ({ ...f, open: false }))} onSave={save} onDelete={() => { if (form.editing) { setDel(form.editing.id); setDelOpen(true); } }} />
      <SkillDeleteView open={delOpen} onClose={() => setDelOpen(false)} onConfirm={() => { setSkills((xs) => xs.filter((x) => x.id !== del)); toast('技能已删除'); }} />
      <CutInFrame open={!!cut} onClose={() => setCut(null)} eyebrow="SKILL UNLOCK" title="技能解锁!!" subtitle={cut ? `${cut.name} · ${cut.description}` : ''} autoCloseMs={2400} />
    </div>
  );
}

/* ───────── 图鉴 ───────── */
function TarotCell({ card, onOpen }: { card: P5TarotCard; onOpen: (c: P5TarotCard) => void }) {
  const tarotMap = useTarotCollectedMap();
  const e = tarotMap[card.id];
  const up = !!e?.upright.count; const rev = !!e?.reversed.count;
  return (
    <button type="button" onClick={() => onOpen(card)} aria-label={`${card.name}${up || rev ? '' : '（未收录）'}`} className="group flex min-w-0 flex-col items-center gap-1 active:scale-95">
      <span className={cx('relative block aspect-[5/8] w-full overflow-hidden rounded-xs border-3 [container-type:inline-size]', up || rev ? 'border-p4g-black shadow-hard-sm night:border-p4g-yellow' : 'border-dashed border-p4g-line')}>
        <TarotFace card={card} dim={!up && !rev} />
      </span>
      <span className="w-full truncate text-center font-display text-2xs font-bold text-[color:var(--p4g-on-stage)]">{card.name}</span>
      <span className="flex gap-0.5 font-display text-[9px] font-bold leading-none">
        <span className={cx('rounded-[2px] px-1 py-0.5', up ? 'bg-p4g-black text-p4g-yellow' : 'bg-p4g-surface-2 text-p4g-muted')}>正{up ? ` ${e!.upright.count}` : ''}</span>
        <span className={cx('rounded-[2px] px-1 py-0.5', rev ? 'bg-p4g-orange text-p4g-black' : 'bg-p4g-surface-2 text-p4g-muted')}>逆{rev ? ` ${e!.reversed.count}` : ''}</span>
      </span>
    </button>
  );
}
const slots = (cards: P5TarotCard[], tarotMap: Record<string, { upright: { count: number }; reversed: { count: number } }>) => cards.reduce((t, c) => t + (tarotMap[c.id]?.upright.count ? 1 : 0) + (tarotMap[c.id]?.reversed.count ? 1 : 0), 0);

function TarotBook({ empty }: { empty: boolean }) {
  const tarotMap = useTarotCollectedMap();
  const [open, setOpen] = useState<P5TarotCard | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const show = (c: P5TarotCard) => { setOpen(c); setIsOpen(true); };
  const major = empty ? 0 : slots(P5_MAJOR, tarotMap);
  const minor = empty ? 0 : slots(P5_MINOR, tarotMap);
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <P4Section title="大阿卡纳" en="MAJOR ARCANA" action={<span className="p4g-num text-meta text-[color:var(--p4g-on-stage)]">{major} / 44 · 正逆各算一格</span>}>
        <P4Progress value={major} max={44} variant="segments" segments={22} className="mb-3" />
        <div className="grid grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-6 wide:grid-cols-8">{P5_MAJOR.map((c) => <TarotCell key={c.id} card={c} onOpen={show} />)}</div>
      </P4Section>
      <P4Section title="小阿卡纳" en="MINOR ARCANA" action={<span className="p4g-num text-meta text-[color:var(--p4g-on-stage)]">{minor} / 112 · 正逆各算一格</span>}>
        <div className="flex flex-col gap-5">
          {(['wands', 'cups', 'swords', 'pentacles'] as const).map((suit) => {
            const cards = P5_MINOR.filter((c) => c.suit === suit);
            return (
              <div key={suit} className="min-w-0">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <h4 className="rounded-xs bg-p4g-black px-2 py-0.5 font-display text-body font-bold text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black">{P5_SUIT_META[suit].symbol} {P5_SUIT_META[suit].name}</h4>
                  <span className="p4g-num text-2xs text-[color:var(--p4g-on-stage)]">{empty ? 0 : slots(cards, tarotMap)} / 28</span>
                </div>
                <div className="grid grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-7">{cards.map((c) => <TarotCell key={c.id} card={c} onOpen={show} />)}</div>
              </div>
            );
          })}
        </div>
      </P4Section>
      <TarotFlipViewView card={open} open={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}

function SeasonBook({ empty }: { empty: boolean }) {
  const seasonMap = useSeasonCollectedMap();
  const [year, setYear] = useState(2026);
  const pages = P5_SEASON_PAGES[year];
  const all = pages.flatMap((p) => p.marks);
  const isCol = (m: P5SeasonMark) => !empty && !!seasonMap[m.date];
  const collected = all.filter(isCol).length;
  const [page, setPage] = useState(2);
  const pager = useRef<HTMLDivElement>(null);
  const [openMark, setOpenMark] = useState<P5SeasonMark | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const goTo = (i: number) => { setPage(i); const el = pager.current; if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' }); };
  const onScroll = () => { const el = pager.current; if (!el) return; const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth)); if (i !== page) setPage(i); };
  const kindLabel: Record<string, string> = { moon: '满月', quest: '委托', raid: '团战' };
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <P4Section title={`岁时 · ${year}`} en="SEASON BOOK" action={<span className="flex gap-1.5">{[2026, 2025].map((y) => <button key={y} type="button" onClick={() => { setYear(y); setPage(y === 2026 ? 2 : 0); setTimeout(() => goTo(y === 2026 ? 2 : 0), 0); }} className={cx('rounded-xs border-thin px-1.5 py-0.5 p4g-num text-2xs', y === year ? 'border-p4g-select bg-p4g-select text-[color:var(--p4g-select-ink)]' : 'border-p4g-line bg-p4g-surface-2 text-p4g-ink')}>{y}</button>)}</span>}>
        <div className="mb-1 p4g-num text-meta text-[color:var(--p4g-on-stage)]">{collected} / {all.length} · <span className="font-display not-italic">节气或节日当天记一条就收一枚</span></div>
        <P4Progress value={collected} max={all.length} variant="bar" />
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {pages.map((p, i) => {
            const n = p.marks.filter(isCol).length; const on = i === page;
            return (
              <button key={p.key} type="button" aria-pressed={on} aria-label={`${p.name} ${n} / ${p.marks.length}`} onClick={() => goTo(i)}
                className={cx('relative flex flex-col items-center py-1.5', on ? 'text-[color:var(--p4g-select-ink)]' : 'text-p4g-ink')}>
                <span aria-hidden className={cx('absolute inset-0 -skew-x-12 border-3', on ? 'border-p4g-select bg-p4g-select shadow-hard-sm' : 'border-p4g-line bg-p4g-surface-2')} />
                <span className="relative font-display text-h3 font-bold leading-none">{p.name}</span>
                <span className="relative mt-0.5 p4g-num text-[9px] opacity-80">{p.en} {n}/{p.marks.length}</span>
              </button>
            );
          })}
        </div>
        <div ref={pager} onScroll={onScroll} className="p4g-noscroll -mx-4 mt-3 flex snap-x snap-mandatory overflow-x-auto wide:-mx-0">
          {pages.map((p) => (
            <div key={p.key} className="w-full shrink-0 snap-center px-4 wide:px-0">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 wide:grid-cols-6">
                {p.marks.map((m) => (
                  <button key={m.key} type="button" aria-label={`${m.name}${isCol(m) ? '' : '（未收录）'}`} onClick={() => { setOpenMark(m); setIsOpen(true); }} className="min-w-0 transition-transform active:scale-95">
                    <SeasonCard mark={m} collected={isCol(m)} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-center gap-1.5" aria-hidden>{pages.map((p, i) => <span key={p.key} className={cx('h-1.5 -skew-x-12 transition-all', i === page ? 'w-5 bg-p4g-orange' : 'w-2 bg-[color:var(--p4g-on-stage)] opacity-40')} />)}</div>
      </P4Section>
      {!empty && SEASON_EXTRAS.length > 0 && (
        <P4Section title="印记" en="STAMPS" action={<span className="p4g-num text-meta text-[color:var(--p4g-on-stage)]">{SEASON_EXTRAS.length} 枚</span>}>
          <div className="flex flex-wrap gap-2">{SEASON_EXTRAS.map((s) => <span key={s.id} className="rounded-xs border-thin border-p4g-black bg-p4g-orange px-2 py-1 font-display text-meta font-bold text-p4g-black">{kindLabel[s.kind] ?? s.kind} · {s.name} · {s.date}</span>)}</div>
        </P4Section>
      )}
      <SeasonFlipView mark={openMark} open={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}

function CodexTab({ sub0, empty }: { sub0: string; empty: boolean }) {
  const [sub, setSub] = useState(sub0 === 'season' ? 'season' : 'tarot');
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <P4SegmentTabs value={sub} onChange={setSub} items={[{ id: 'tarot', label: '塔罗' }, { id: 'season', label: '岁时' }]} />
      {sub === 'tarot' ? <TarotBook empty={empty} /> : <SeasonBook empty={empty} />}
    </div>
  );
}

export default function Achievements({ tab, params }: PageProps) {
  const [active, setActive] = useState(tab === 'skills' || tab === 'codex' ? tab : 'achievements');
  const [state, setState] = useState(params.get('state') ?? 'normal');
  const empty = state === 'empty';
  const realCodex = useRealCodex();
  const progressMap = useAchievementProgressMap();
  const pending = useMemo(() => (empty ? 0 : (realCodex.achievements.length ? realCodex.achievements : ACHIEVEMENTS).filter((a) => !a.unlocked && (progressMap[a.id] ?? 0) >= a.condition.value && !HIDDEN_IDS.has(a.id)).length), [empty, realCodex.achievements, progressMap]);
  return (
    <>
      <P4PageHeader title="成就" en="TROPHIES" onBack={() => navigate('menu')} weather="sunny" />
      <P4Tabs value={active} onChange={setActive} className="-mx-2 mb-5" items={[{ id: 'achievements', label: '成就', badge: pending || undefined }, { id: 'skills', label: '技能' }, { id: 'codex', label: '图鉴' }]} />
      <div key={`${active}-${state}`}>
        {active === 'achievements' && <AchievementsTab empty={empty} />}
        {active === 'skills' && <SkillsTab empty={empty} />}
        {active === 'codex' && <CodexTab sub0={params.get('sub') ?? 'tarot'} empty={empty} />}
      </div>
      <DevStateBar value={state} onChange={setState} items={[{ id: 'normal', label: '正常' }, { id: 'empty', label: '空' }]} />
    </>
  );
}
