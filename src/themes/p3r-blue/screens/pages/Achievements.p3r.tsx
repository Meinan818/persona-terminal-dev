/**
 * 成就页（真实 src/pages/Achievements.tsx · p3 分支 + components/codex/**）蓝白 P3R 重制。
 * 页头「成就·技能」+ LB/RB 斜块 Tab：成就 / 技能 / 图鉴（内容左右滑入 18px）。
 *  成就：筛选循环按钮（全部/未完成/已完成）+「添加成就」；成就斜卡（徽记·标题·描述·进度条·「已达成，点击解锁 ✨」·「解锁于…」蓝底·隐藏 ？？？·编辑铅笔 / 删除）；
 *        属性等级类按属性归组分档（横滑切档 / 档位点「切到第 N 档」）。点可解锁项 → 盖章前奏 → 成就解锁 Cut-in（achv-unlock-stamp）。
 *  技能：筛选（全部/未解锁/已解锁）+「添加技能」；按属性分组卡（Lv.N · n/m 已解锁 · 合计 ×N / 已达上限 ×3.0）；技能行（赐福开关、解锁、编辑、删除）→ 技能解锁 Cut-in。
 *  图鉴：子切换 塔罗 / 岁时；塔罗（大阿卡纳 N / 44、小阿卡纳 N / 112 按花色）/ 岁时（年份、春夏秋冬翻页、印记）→ 翻面卡。
 * 路由：?tab=achievements|skills|codex &sub=tarot|season &state=empty &fx=unlock（直接播放盖章 + 解锁演出）
 * 状态机 / 假数据改写自黄色版 Achievements（只读参考）。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import type { PageProps } from '@blue/registry/types';
import type { Achievement, AttributeId, Skill } from '@/types';
import { P3PageHeader, P3LRTabs, P3Segment, P3Button, P3OnOff, P3Empty, P3Progress, SectionMark, P3R, slantClip, tickClip, IconEdit, IconTrash, IconPlus, useToast } from '@blue/kit';
import { P3Stagger, P3StaggerItem } from '@blue/fx';
import { navigate } from '@blue/shell/shellBus';
import { useBoldness } from '@blue/lib/prefs';
import { AchievementFormView, type AchForm } from '@blue/screens/overlays/AchievementForm.p3r';
import { AchievementDeleteView } from '@blue/screens/overlays/AchievementsDeleteConfirm.p3r';
import { SkillFormView, effectText, type SkillFormValue } from '@blue/screens/overlays/SkillForm.p3r';
import { SkillDeleteView } from '@blue/screens/overlays/AchievementsSkillDeleteConfirm.p3r';
import { TarotFace, TarotFlipViewView, suitOf } from '@blue/screens/overlays/TarotFlipView.p3r';
import { SeasonCard, SeasonFlipView } from '@blue/screens/overlays/FlipCardView.p3r';
import { UnlockCutIn } from '@blue/screens/pkg5/UnlockCutIn';
import { ACHIEVEMENTS, ATTRIBUTES, ATTR_IDS, ATTR_NAMES, HIDDEN_IDS, SEALED_IDS, SEASON_COLLECTED, SEASON_EXTRAS, SKILLS, SKILL_BONUS_MULT_CAP, TAROT_COLLECTED, achievementProgress } from '@blue/adapters/pkg5';
import { useRealCodex, useCodexCollections, useAchievementProgressMap, useTarotCollectedMap, useSeasonCollectedMap } from '@blue/adapters/pkg5';
import { P5_MAJOR, P5_MINOR, type P5TarotCard } from '@blue/adapters/pkg5-tarot';
import { P5_SEASON_PAGES, type P5SeasonMark } from '@blue/adapters/pkg5-season';

type Filter = 'all' | 'locked' | 'unlocked';
const CYCLE: Filter[] = ['all', 'locked', 'unlocked'];

/* ───────── 成就 ───────── */
function AchievementCard({ a, onUnlock, onEdit, onDelete, tiers, stamping }: { a: Achievement; onUnlock: () => void; onEdit: () => void; onDelete: () => void; tiers?: { count: number; idx: number; set: (i: number) => void }; stamping?: boolean }) {
  const anim = useBoldness();
  const progressMap = useAchievementProgressMap();
  const hidden = HIDDEN_IDS.has(a.id) && !a.unlocked;
  const face = hidden ? { title: '？？？', description: '隐藏成就', icon: '？' } : a;
  const progress = progressMap[a.id] ?? 0;
  const canUnlock = !a.unlocked && progress >= a.condition.value && !hidden;
  const sealed = SEALED_IDS.has(a.id);
  const custom = a.id.startsWith('custom_');
  const pct = Math.min(1, progress / a.condition.value);
  const onPanEnd = (_: unknown, info: PanInfo) => { if (!tiers) return; if (info.offset.x < -40 && tiers.idx < tiers.count - 1) tiers.set(tiers.idx + 1); if (info.offset.x > 40 && tiers.idx > 0) tiers.set(tiers.idx - 1); };
  const bg = a.unlocked ? P3R.blue : canUnlock ? P3R.panel : 'var(--p3r-row)';
  const ink = a.unlocked ? P3R.onBlue : P3R.ink;
  return (
    <motion.div onClick={() => { if (canUnlock) onUnlock(); }} onPanEnd={onPanEnd} whileTap={canUnlock ? { scale: 0.97 } : undefined}
      className="relative h-full min-w-0 cursor-pointer touch-pan-y" style={{ filter: canUnlock ? 'drop-shadow(0 0 0 transparent) drop-shadow(6px 8px 0 rgb(var(--p3r-blue-rgb) / 0.35))' : 'drop-shadow(0 10px 18px rgb(var(--p3r-ink-rgb) / 0.08))' }}>
      <div className="relative flex h-full min-w-0 flex-col items-center px-4 pb-3 pt-5 text-center" style={{ clipPath: slantClip(14), background: bg, color: ink }}>
        {canUnlock && <motion.span aria-hidden className="absolute inset-0" style={{ boxShadow: `inset 0 0 0 3px ${P3R.blue}` }} animate={anim ? { opacity: [0.4, 1, 0.4] } : undefined} transition={{ duration: 1.6, repeat: Infinity }} />}
        {a.unlocked && <span aria-hidden className="absolute -left-6 top-3 w-24 -rotate-45 py-0.5 text-center font-cond text-[9px] tracking-widest" style={{ background: 'var(--p3r-cream)', color: '#335bb8' }}>CLEAR</span>}
        <div className="absolute right-3 top-2 flex gap-1">
          {!sealed && <button type="button" aria-label={`编辑成就 ${a.title}`} onClick={(e) => { e.stopPropagation(); onEdit(); }} className="flex h-7 w-7 items-center justify-center" style={{ clipPath: slantClip(4), background: a.unlocked ? 'rgba(255,255,255,0.25)' : 'var(--p3r-chip)' }}><IconEdit size={13} /></button>}
          {custom && <button type="button" aria-label={`删除成就 ${a.title}`} onClick={(e) => { e.stopPropagation(); onDelete(); }} className="flex h-7 w-7 items-center justify-center" style={{ clipPath: slantClip(4), background: a.unlocked ? 'rgba(255,255,255,0.25)' : 'var(--p3r-chip)', color: a.unlocked ? undefined : 'var(--p3r-coral-ink)' }}><IconTrash size={13} /></button>}
        </div>
        <span className="mb-1.5 flex h-12 w-12 items-center justify-center font-heavy text-[22px]" style={{ clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)', background: a.unlocked ? 'var(--p3r-cream)' : canUnlock ? P3R.blue : 'var(--p3r-track)', color: a.unlocked ? '#335bb8' : canUnlock ? P3R.onBlue : P3R.grey }}>{face.icon}</span>
        <h3 className="w-full truncate font-heavy text-[15px]">{face.title}</h3>
        <p className="mb-2 w-full text-[12px] leading-snug opacity-80 p3r-clamp-2">{face.description}</p>
        <div className="mt-auto w-full">
          {!a.unlocked ? (
            <>
              {!hidden && !canUnlock && <P3Progress value={pct} className="mx-auto max-w-[80%]" thick={6} />}
              <div className="mt-1.5 text-[11px] font-black">
                {canUnlock ? <span className="inline-block px-2.5 py-1" style={{ clipPath: slantClip(5), background: P3R.blue, color: P3R.onBlue }}>已达成，点击解锁 ✦</span> : <span style={{ color: P3R.grey }}>{hidden ? '？？？' : `${progress} / ${a.condition.value}`}</span>}
              </div>
            </>
          ) : a.unlockedDate && <div className="text-[11px] font-black opacity-90">解锁于 {a.unlockedDate.toLocaleDateString('zh-CN')}</div>}
          {tiers && tiers.count > 1 && (
            <div className="mt-2 flex justify-center gap-1.5">
              {Array.from({ length: tiers.count }, (_, i) => (
                <button key={`t-${i}`} type="button" aria-label={`切到第 ${i + 1} 档`} onClick={(e) => { e.stopPropagation(); tiers.set(i); }} className="h-[6px] transition-all duration-200"
                  style={{ width: i === tiers.idx ? 20 : 8, background: i === tiers.idx ? (a.unlocked ? 'var(--p3r-cream)' : P3R.blue) : (a.unlocked ? 'rgba(255,255,255,0.4)' : 'var(--p3r-track)'), clipPath: 'polygon(30% 0, 100% 0, 70% 100%, 0 100%)' }} />
              ))}
            </div>
          )}
        </div>
        {/* 盖章前奏 */}
        <AnimatePresence>
          {stamping && (
            <motion.span key="stamp" aria-hidden className="absolute left-1/2 top-1/2 px-3 py-1 font-cond text-[26px] leading-none" style={{ x: '-50%', y: '-50%', color: P3R.magenta, boxShadow: `inset 0 0 0 3px ${P3R.magenta}`, background: 'rgba(255,255,255,0.85)', clipPath: slantClip(5) }}
              initial={{ scale: 3, rotate: -18, opacity: 0 }} animate={{ scale: 1, rotate: -10, opacity: 1 }} transition={{ type: 'spring', stiffness: 700, damping: 18 }}>UNLOCK</motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function AchievementsTab({ empty, autoFx }: { empty: boolean; autoFx: boolean }) {
  const toast = useToast();
  const anim = useBoldness();
  const realCodex = useRealCodex();
  const [list, setList] = useState<Achievement[]>(empty ? [] : (realCodex.achievements.length ? realCodex.achievements : ACHIEVEMENTS));
  const [filter, setFilter] = useState<Filter>('all');
  const [form, setForm] = useState<{ open: boolean; editing: Achievement | null }>({ open: false, editing: null });
  const [del, setDel] = useState<string | null>(null);
  const [delOpen, setDelOpen] = useState(false);
  const [tierIdx, setTierIdx] = useState<Record<string, number>>({});
  const [tierDir, setTierDir] = useState<Record<string, number>>({});
  const [stamping, setStamping] = useState<string | null>(null);
  const [cut, setCut] = useState<Achievement | null>(null);
  const label = { all: '全部', locked: '未完成', unlocked: '已完成' }[filter];
  const visible = list.filter((a) => (filter === 'all' ? true : filter === 'unlocked' ? a.unlocked : !a.unlocked));
  const groups: Array<{ key: string; items: Achievement[] }> = [];
  const byAttr: Record<string, Achievement[]> = {};
  visible.forEach((a) => {
    if (a.condition.type === 'attribute_level' && a.condition.attribute) {
      const k = a.condition.attribute; (byAttr[k] ??= []).push(a);
      if (byAttr[k].length === 1) groups.push({ key: `attr-${k}`, items: byAttr[k] });
    } else groups.push({ key: a.id, items: [a] });
  });
  const unlock = (a: Achievement) => {
    if (stamping) return;
    setStamping(a.id);
    window.setTimeout(() => { setStamping(null); setList((xs) => xs.map((x) => (x.id === a.id ? { ...x, unlocked: true, unlockedDate: new Date(2026, 9, 20) } : x))); setCut(a); }, anim ? 620 : 0);
  };
  const fired = useRef(false);
  useEffect(() => {
    if (!autoFx || fired.current || empty) return;
    fired.current = true;
    const target = ACHIEVEMENTS.find((a) => a.id === 'dexterity_5');
    if (target) { setTierIdx((t) => ({ ...t, dexterity: 1 })); window.setTimeout(() => unlock(target), 700); }
  }, [autoFx, empty]); // eslint-disable-line react-hooks/exhaustive-deps
  const saveForm = (f: AchForm) => {
    const cond = { type: f.type, value: f.value, attribute: f.type === 'attribute_level' ? f.attribute : undefined, keywords: f.type === 'keyword_match' ? f.keywords.split(/[,，]/).map((s) => s.trim()).filter(Boolean) : undefined } as Achievement['condition'];
    if (form.editing) setList((xs) => xs.map((x) => (x.id === form.editing!.id ? { ...x, title: f.title, description: f.description, icon: f.icon, condition: cond } : x)));
    else setList((xs) => [...xs, { id: `custom_${Date.now()}`, title: f.title, description: f.description, icon: f.icon, unlocked: false, condition: cond }]);
    toast.success(form.editing ? '成就已保存' : '成就已添加');
  };
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        <P3Button size="sm" tone="soft" onClick={() => setFilter(CYCLE[(CYCLE.indexOf(filter) + 1) % 3])} trailing={<span aria-hidden className="text-[10px]">▸</span>}>{label}</P3Button>
        <P3Button size="sm" tone="ink" leading={<IconPlus size={14} />} onClick={() => setForm({ open: true, editing: null })}>添加成就</P3Button>
      </div>
      {list.length === 0 ? (
        <P3Empty text="暂无成就" sub="完成记录、任务与目标后，成就会出现在这里" ghost="ACHIEVE" />
      ) : visible.length === 0 ? (
        <P3Empty text="暂无可展示的成就" sub="换个筛选看看" />
      ) : (
        <P3Stagger key={filter} className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
          {groups.map((g) => {
            const attr = g.key.startsWith('attr-') ? g.key.slice(5) : null;
            const idx = attr ? Math.min(tierIdx[attr] ?? 0, g.items.length - 1) : 0;
            const a = g.items[idx];
            const dir = tierDir[attr ?? ''] ?? 1;
            return (
              <P3StaggerItem key={g.key} className="min-w-0">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={a.id} className="h-full" initial={anim ? { x: dir * 30, opacity: 0 } : { opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={anim ? { x: dir * -30, opacity: 0 } : { opacity: 0 }} transition={{ duration: 0.18 }}>
                    <AchievementCard a={a} stamping={stamping === a.id} onUnlock={() => unlock(a)} onEdit={() => setForm({ open: true, editing: a })} onDelete={() => { setDel(a.id); setDelOpen(true); }}
                      tiers={attr ? { count: g.items.length, idx, set: (i) => { setTierDir((d) => ({ ...d, [attr]: i > idx ? 1 : -1 })); setTierIdx((t) => ({ ...t, [attr]: i })); } } : undefined} />
                  </motion.div>
                </AnimatePresence>
              </P3StaggerItem>
            );
          })}
        </P3Stagger>
      )}
      <AchievementFormView open={form.open} editing={form.editing} onClose={() => setForm((f) => ({ ...f, open: false }))} onSave={saveForm} onDelete={() => { if (form.editing) { setDel(form.editing.id); setDelOpen(true); } }} />
      <AchievementDeleteView open={delOpen} onClose={() => setDelOpen(false)} onConfirm={() => { setList((xs) => xs.filter((x) => x.id !== del)); toast('成就已删除'); }} />
      <UnlockCutIn open={!!cut} onClose={() => setCut(null)} icon={cut?.icon ?? '✦'} name={cut?.title ?? ''} sub={cut?.description} />
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
        <P3Button size="sm" tone="soft" onClick={() => setFilter(CYCLE[(CYCLE.indexOf(filter) + 1) % 3])} trailing={<span aria-hidden className="text-[10px]">▸</span>}>{{ all: '全部', locked: '未解锁', unlocked: '已解锁' }[filter]}</P3Button>
        <P3Button size="sm" tone="ink" leading={<IconPlus size={14} />} onClick={() => setForm({ open: true, editing: null })}>添加技能</P3Button>
      </div>
      {byAttr.length === 0 ? <P3Empty text={skills.length ? '暂无可展示的技能' : '暂无技能'} sub={skills.length ? '换个筛选看看' : '属性升级后会解锁对应技能'} ghost="SKILL" /> : (
        <P3Stagger className="grid grid-cols-1 gap-4 wide:grid-cols-2">
          {byAttr.map((g) => {
            const all = skills.filter((s) => s.requiredAttribute === g.id);
            const raw = all.filter((s) => s.unlocked && s.bonusMultiplier).reduce((m, s) => m * (s.bonusMultiplier as number), 1);
            const capped = raw > SKILL_BONUS_MULT_CAP;
            const total = Math.min(SKILL_BONUS_MULT_CAP, raw);
            return (
              <P3StaggerItem key={g.id} className="min-w-0">
                <div className="min-w-0" style={{ clipPath: slantClip(16), background: P3R.panelGlass, filter: 'drop-shadow(0 10px 20px rgb(var(--p3r-ink-rgb) / 0.08))' }}>
                  <div className="flex min-w-0 items-center gap-2 py-2 pl-6 pr-5" style={{ background: P3R.ink }}>
                    <span className="font-heavy text-[17px]" style={{ color: 'var(--p3r-on-ink)' }}>{ATTR_NAMES[g.id]}</span>
                    <span className="px-1.5 font-cond text-[12px]" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(3) }}>Lv.{lvOf(g.id)}</span>
                    <span className="ml-auto shrink-0 text-[11px] font-black" style={{ color: 'var(--bk-bubble-a)' }}>{all.filter((s) => s.unlocked).length}/{all.length} 已解锁</span>
                    {total > 1 && <span title={capped ? `技能连乘已超过上限，按 ×${SKILL_BONUS_MULT_CAP.toFixed(1)} 生效` : '本属性已解锁技能的合计加成'} className="shrink-0 px-1.5 py-0.5 font-cond text-[12px]" style={{ background: capped ? P3R.magenta : P3R.cyan, color: capped ? '#fff' : 'var(--p3r-mulberry)', clipPath: slantClip(3) }}>{capped ? `已达上限 ×${SKILL_BONUS_MULT_CAP.toFixed(1)}` : `合计 ×${total.toFixed(2)}`}</span>}
                  </div>
                  <div className="flex flex-col gap-1 p-2">
                    {g.items.map((s, i) => {
                      const blessing = s.id.startsWith('blessing_');
                      const custom = s.id.startsWith('custom_');
                      const can = !blessing && !s.unlocked && lvOf(s.requiredAttribute) >= s.requiredLevel;
                      return (
                        <div key={s.id} className="relative flex min-w-0 items-center gap-3 py-2 pl-4 pr-3" style={{ clipPath: slantClip(10), background: can ? P3R.cyanPale : i % 2 ? 'var(--p3r-row-alt)' : 'var(--p3r-row)' }}>
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center font-cond text-[16px]" style={{ clipPath: slantClip(6), background: s.unlocked ? P3R.blue : can ? P3R.magenta : 'var(--p3r-track)', color: s.unlocked || can ? '#fff' : P3R.grey }}>
                            {blessing ? (s.unlocked ? '✦' : '✧') : s.unlocked ? '✓' : can ? '!' : s.requiredLevel}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span className="min-w-0 truncate text-[15px] font-black" style={{ color: P3R.ink }}>{s.name}</span>
                              {blessing && <span className="shrink-0 px-1.5 text-[10px] font-black" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(3) }}>赐福</span>}
                              {!blessing && !s.unlocked && <span className="shrink-0 px-1.5 font-cond text-[11px]" style={{ background: can ? P3R.ink : 'var(--p3r-chip)', color: can ? 'var(--p3r-on-ink)' : P3R.grey, clipPath: slantClip(3) }}>需 Lv.{s.requiredLevel}</span>}
                            </div>
                            <p className="truncate text-[12px]" style={{ color: P3R.grey }}>{s.description}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {blessing && <P3OnOff value={s.unlocked} onChange={(v) => setSkills((xs) => xs.map((x) => (x.id === s.id ? { ...x, unlocked: v } : x)))} ariaLabel={`赐福 ${s.name}`} />}
                            {can && <P3Button size="sm" corner onClick={() => { setSkills((xs) => xs.map((x) => (x.id === s.id ? { ...x, unlocked: true } : x))); setCut(s); }}>解锁</P3Button>}
                            {!blessing && (!s.unlocked || custom) && <button type="button" aria-label={`编辑技能 ${s.name}`} onClick={() => setForm({ open: true, editing: s })} className="flex h-8 w-8 items-center justify-center" style={{ clipPath: slantClip(4), background: 'var(--p3r-chip)', color: P3R.ink }}><IconEdit size={13} /></button>}
                            {!blessing && custom && !s.unlocked && <button type="button" aria-label={`删除技能 ${s.name}`} onClick={() => { setDel(s.id); setDelOpen(true); }} className="flex h-8 w-8 items-center justify-center" style={{ color: 'var(--p3r-coral-ink)' }}><IconTrash size={13} /></button>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </P3StaggerItem>
            );
          })}
        </P3Stagger>
      )}
      <SkillFormView open={form.open} editing={form.editing} onClose={() => setForm((f) => ({ ...f, open: false }))} onSave={save} onDelete={() => { if (form.editing) { setDel(form.editing.id); setDelOpen(true); } }} />
      <SkillDeleteView open={delOpen} onClose={() => setDelOpen(false)} onConfirm={() => { setSkills((xs) => xs.filter((x) => x.id !== del)); toast('技能已删除'); }} />
      <UnlockCutIn open={!!cut} onClose={() => setCut(null)} title="技能解锁！" eyebrow="SKILL" icon="✦" name={cut?.name ?? ''} sub={cut?.description} />
    </div>
  );
}

/* ───────── 图鉴 ───────── */
const slots = (cards: P5TarotCard[], tarotMap: Record<string, { upright: { count: number }; reversed: { count: number } }>) => cards.reduce((t, c) => t + (tarotMap[c.id]?.upright.count ? 1 : 0) + (tarotMap[c.id]?.reversed.count ? 1 : 0), 0);
function TarotCell({ card, onOpen, empty }: { card: P5TarotCard; onOpen: (c: P5TarotCard) => void; empty: boolean }) {
  const e = empty ? undefined : TAROT_COLLECTED[card.id];
  const up = !!e?.upright.count; const rev = !!e?.reversed.count;
  return (
    <button type="button" onClick={() => onOpen(card)} aria-label={`${card.name}${up || rev ? '' : '（未收录）'}`} className="group flex min-w-0 flex-col items-center gap-1 active:scale-95">
      <span className="block w-full [container-type:inline-size]"><span className="flex justify-center"><TarotFace card={card} width={64} dim={!up && !rev} /></span></span>
      <span className="w-full truncate text-center text-[11px] font-black" style={{ color: P3R.ink }}>{card.name}</span>
      <span className="flex gap-0.5 text-[9px] font-black leading-none">
        <span className="px-1 py-0.5" style={{ clipPath: slantClip(2), background: up ? P3R.blue : 'var(--p3r-chip)', color: up ? P3R.onBlue : P3R.grey }}>正{up ? ` ${e!.upright.count}` : ''}</span>
        <span className="px-1 py-0.5" style={{ clipPath: slantClip(2), background: rev ? P3R.ink : 'var(--p3r-chip)', color: rev ? 'var(--p3r-on-ink)' : P3R.grey }}>逆{rev ? ` ${e!.reversed.count}` : ''}</span>
      </span>
    </button>
  );
}
function TarotBook({ empty }: { empty: boolean }) {
  const tarotMap = useTarotCollectedMap();
  const [open, setOpen] = useState<P5TarotCard | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const show = (c: P5TarotCard) => { setOpen(c); setIsOpen(true); };
  const major = empty ? 0 : slots(P5_MAJOR, tarotMap);
  const minor = empty ? 0 : slots(P5_MINOR, tarotMap);
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <section>
        <SectionMark title="大阿卡纳" en="MAJOR" className="mb-2" meta={<span className="font-cond text-[13px]" style={{ color: P3R.inkSoft }}>{major} / 44 · 正逆各算一格</span>} />
        <P3Progress value={major} max={44} variant="segments" className="mb-3" />
        <div className="grid grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-6 wide:grid-cols-8">{P5_MAJOR.map((c) => <TarotCell key={c.id} card={c} onOpen={show} empty={empty} />)}</div>
      </section>
      <section>
        <SectionMark title="小阿卡纳" en="MINOR" className="mb-2" meta={<span className="font-cond text-[13px]" style={{ color: P3R.inkSoft }}>{minor} / 112 · 正逆各算一格</span>} />
        <div className="flex flex-col gap-5">
          {(['wands', 'cups', 'swords', 'pentacles'] as const).map((suit) => {
            const cards = P5_MINOR.filter((c) => c.suit === suit);
            return (
              <div key={suit} className="min-w-0">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <h4 className="px-3 py-0.5 text-[14px] font-black" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(5) }}><span style={{ color: P3R.blue }}>{suitOf(suit)?.glyph}</span> {suitOf(suit)?.name}</h4>
                  <span className="font-cond text-[12px]" style={{ color: P3R.inkSoft }}>{empty ? 0 : slots(cards, tarotMap)} / 28</span>
                </div>
                <div className="grid grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-7">{cards.map((c) => <TarotCell key={c.id} card={c} onOpen={show} empty={empty} />)}</div>
              </div>
            );
          })}
        </div>
      </section>
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
  useEffect(() => { const el = pager.current; if (el) el.scrollTo({ left: page * el.clientWidth }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const onScroll = () => { const el = pager.current; if (!el) return; const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth)); if (i !== page) setPage(i); };
  const kindLabel: Record<string, string> = { moon: '满月', quest: '委托', raid: '团战' };
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <section>
        <SectionMark title={`岁时 · ${year}`} en="SEASON" className="mb-2" meta={<span className="flex gap-1.5">{[2026, 2025].map((y) => <button key={y} type="button" aria-pressed={y === year} onClick={() => { setYear(y); const p = y === 2026 ? 2 : 0; setTimeout(() => goTo(p), 0); }} className="px-2.5 py-0.5 font-cond text-[13px]" style={{ clipPath: slantClip(4), background: y === year ? P3R.blue : 'var(--p3r-chip)', color: y === year ? P3R.onBlue : P3R.ink }}>{y}</button>)}</span>} />
        <div className="mb-1 flex flex-wrap items-baseline gap-1.5" style={{ color: P3R.inkSoft }}><span className="font-cond text-[14px]">{collected} / {all.length}</span><span className="text-[12px] font-bold">· 节气或节日当天记一条就收一枚</span></div>
        <P3Progress value={collected} max={all.length} />
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {pages.map((p, i) => {
            const n = p.marks.filter(isCol).length; const on = i === page;
            return (
              <button key={p.key} type="button" aria-pressed={on} aria-label={`${p.name} ${n} / ${p.marks.length}`} onClick={() => goTo(i)} className="relative flex flex-col items-center py-1.5">
                <span aria-hidden className="absolute inset-0" style={{ clipPath: slantClip(8), background: on ? P3R.blue : 'var(--p3r-row)' }} />
                <span className="relative font-heavy text-[20px] leading-none" style={{ color: on ? P3R.onBlue : P3R.ink }}>{p.name}</span>
                <span className="relative mt-0.5 font-cond text-[9px]" style={{ color: on ? P3R.onBlue : P3R.grey }}>{p.en} {n}/{p.marks.length}</span>
              </button>
            );
          })}
        </div>
        <div ref={pager} onScroll={onScroll} className="no-scrollbar -mx-4 mt-3 flex snap-x snap-mandatory overflow-x-auto wide:mx-0">
          {pages.map((p, pi) => (
            <div key={p.key} className="w-full shrink-0 snap-center px-4 wide:px-0">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 wide:grid-cols-6">
                {p.marks.map((m) => (
                  <button key={m.key} type="button" aria-label={`${m.name}${isCol(m) ? '' : '（未收录）'}`} onClick={() => { setOpenMark(m); setIsOpen(true); }} className="min-w-0 transition-transform active:scale-95">
                    <SeasonCard mark={m} collected={isCol(m)} eager={Math.abs(pi - page) <= 1} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-center gap-1.5" aria-hidden>{pages.map((p, i) => <span key={p.key} className="h-1.5 transition-all" style={{ width: i === page ? 20 : 8, background: i === page ? P3R.blue : 'var(--p3r-track)', clipPath: 'polygon(30% 0, 100% 0, 70% 100%, 0 100%)' }} />)}</div>
      </section>
      {!empty && SEASON_EXTRAS.length > 0 && (
        <section>
          <SectionMark title="印记" en="STAMPS" className="mb-2" meta={<span className="font-cond text-[13px]" style={{ color: P3R.inkSoft }}>{SEASON_EXTRAS.length} 枚</span>} />
          <div className="flex flex-wrap gap-2">{SEASON_EXTRAS.map((s, i) => <span key={s.id} className="px-3 py-1 text-[12px] font-black" style={{ clipPath: slantClip(5), background: i % 2 ? P3R.cyan : P3R.blue, color: i % 2 ? 'var(--p3r-mulberry)' : P3R.onBlue }}>{kindLabel[s.kind] ?? s.kind} · {s.name} · {s.date.slice(5)}</span>)}</div>
        </section>
      )}
      <SeasonFlipView mark={openMark} open={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
function CodexTab({ sub0, empty }: { sub0: string; empty: boolean }) {
  const [sub, setSub] = useState(sub0 === 'season' ? 'season' : 'tarot');
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <P3Segment value={sub} onChange={setSub} items={[{ id: 'tarot', label: '塔罗' }, { id: 'season', label: '岁时' }]} />
      {sub === 'tarot' ? <TarotBook empty={empty} /> : <SeasonBook empty={empty} />}
    </div>
  );
}

export default function Achievements({ tab, params }: PageProps) {
  const anim = useBoldness();
  const [active, setActive] = useState(tab === 'skills' || tab === 'codex' ? tab : 'achievements');
  const empty = params.get('state') === 'empty';
  const pending = useMemo(() => (empty ? 0 : ACHIEVEMENTS.filter((a) => !a.unlocked && (achievementProgress[a.id] ?? 0) >= a.condition.value && !HIDDEN_IDS.has(a.id)).length), [empty]);
  const order = ['achievements', 'skills', 'codex'];
  const prev = useRef(active);
  const dir = order.indexOf(active) >= order.indexOf(prev.current) ? 1 : -1;
  useEffect(() => { prev.current = active; }, [active]);
  return (
    <div className="relative mx-auto min-w-0 max-w-3xl pb-8">
      <P3PageHeader title="成就·技能" en="ACHIEVEMENT" onBack={() => navigate('menu')}
        actions={pending > 0 ? <span className="px-2.5 py-1 text-[12px] font-black text-white" style={{ background: P3R.magenta, clipPath: slantClip(5) }}>{pending} 待解锁</span> : undefined} />
      <P3LRTabs value={active} onChange={setActive} className="mb-5" items={[{ id: 'achievements', label: '成就', en: 'ACHV' }, { id: 'skills', label: '技能', en: 'SKILL' }, { id: 'codex', label: '图鉴', en: 'CODEX' }]} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={active} initial={anim ? { opacity: 0, x: 18 * dir } : { opacity: 0 }} animate={{ opacity: 1, x: 0 }} exit={anim ? { opacity: 0, x: -18 * dir } : { opacity: 0 }} transition={{ duration: 0.2 }}>
          {active === 'achievements' ? <AchievementsTab empty={empty} autoFx={params.get('fx') === 'unlock'} /> : active === 'skills' ? <SkillsTab empty={empty} /> : <CodexTab sub0={params.get('sub') ?? 'tarot'} empty={empty} />}
        </motion.div>
      </AnimatePresence>
      <span aria-hidden className="pointer-events-none absolute -right-2 top-24 h-4 w-6" style={{ background: P3R.cyan, clipPath: tickClip }} />
    </div>
  );
}
