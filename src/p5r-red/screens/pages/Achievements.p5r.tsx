/**
 * 【2026-10-21 parity 修复】页头 / 切换 / 添加入口回到原生 v3 pages_b.js achievements：AWARDS 剪报 +「成就 · 技能」标题牌 +「已解锁 x / n · 技能 m」+ 返回；
 *   seg 切换（成就 / 技能 / 图鉴）；成就墙末尾「＋ 添加自定义成就」徽章格；技能列表末尾「+ 添加技能」红钮。
 *   FIXLIST 保留的最小功能：筛选循环键（P1-12/13，v3 无，放在墙上方右侧小签）、图鉴为第三个 Tab（P0-11）、技能按属性分组 + 解锁 / 编辑（P1-13）。
 *   撤回此前自造的「纸方返回键 + 双词瓷砖头 + AWARD SHOW 纸条 + 背景板」。
 * 成就 · 技能 · 图鉴 Achievements（真实 src/pages/Achievements.tsx 的 p5 分支；图鉴 Tab 归 pkg4）。
 * 页头照真实：纸方返回键 + 拼贴双词瓷砖切换头（成就 / 技能 / 图鉴；激活 = 红底白字放大）+「AWARD SHOW」纸条 + 背后红八角板 / 星 / 网点。
 * 成就 Tab：筛选循环键（全部 / 未完成 / 已完成）+「添加成就」→ 徽章墙（v3 Awards 语汇 .badge5）：已解锁 = 星爆 + 剪报字母 + 解锁于日期；
 *   已达成未领 =「已达成，点击解锁 ✨」（点 → UnlockCutInP5「成就解锁！」）；未解锁 = ? + 描述 + 进度 x / y；隐藏成就 = ？？？ / 隐藏成就；
 *   自定义成就带 ✎（编辑 → AchievementForm，内含「删除成就」）。空 =「暂无成就」，筛选为空 =「暂无可展示的成就」。
 * 技能 Tab：筛选循环键（全部 / 未解锁 / 已解锁）+「添加技能」→ 按属性分组（名 + N/M 已解锁 + 合计 ×N）→ 技能条（v3 .req 黑条：
 *   ✓ 已解锁 / ! 可解锁 / 等级数字；名 + 需 Lv.X + 效果；可解锁 =「解锁」→ 技能解锁 Cut-in；✎ 编辑 → SkillForm）。空 =「暂无技能」。
 * 图鉴 Tab：pkg4 建 src/screens/pages/CodexTab.p5r.tsx（default export，收 { params, wide }）后自动接上（import.meta.glob）。
 * 直达：?tab=achievements|skills|codex  ?filter=locked|unlocked  ?state=empty  ?form=add|edit  ?skillform=add|edit
 */
import { Suspense, lazy, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import type { PageProps } from '@/p5r-red/registry/types';
import { P5BurstImg } from '@/p5r-red/kit/P5BurstImg';
import { P5Empty } from '@/p5r-red/kit/P5States';
import { P5Tag } from '@/p5r-red/kit/P5Tag';
import { P5Button } from '@/p5r-red/kit/P5Button';
import { P5PageHeader, P5Back } from '@/p5r-red/kit/P5PageHeader';
import { DevStateBar } from '@/p5r-red/kit/DevStateBar';
import { kitImg } from '@/p5r-red/lib/asset';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import { sfx } from '@/p5r-red/fx/sfx';
import { ATTR, ATTR_ORDER, type AttrId } from '@/p5r-red/mock/data';
import { ACHIEVEMENTS, SKILLS, SKILL_BONUS_MULT_CAP, skillEffect, type MockAch, type MockSkill } from '@/p5r-red/mock/pkg5-data';
import { unlockCutInP5 } from '@/p5r-red/screens/overlays/cutins.p5r';
import { AchievementForm } from '@/p5r-red/screens/overlays/AchievementForm.p5r';
import { SkillForm } from '@/p5r-red/screens/overlays/SkillForm.p5r';
import { AchievementsDeleteConfirm } from '@/p5r-red/screens/overlays/AchievementsDeleteConfirm.p5r';
import '../pkg5.p5r.css';

type Tab = 'achievements' | 'skills' | 'codex';
type Filter = 'all' | 'locked' | 'unlocked';
const CYCLE: Filter[] = ['all', 'locked', 'unlocked'];
const ACH_LABEL: Record<Filter, string> = { all: '全部', locked: '未完成', unlocked: '已完成' };
const SK_LABEL: Record<Filter, string> = { all: '全部', locked: '未解锁', unlocked: '已解锁' };
const LEVELS: Record<AttrId, number> = { knowledge: 3, guts: 2, dexterity: 2, kindness: 4, charm: 1 };
const fmt = (k: string) => new Date(k + 'T00:00').toLocaleDateString('zh-CN');

/* 图鉴 Tab（pkg4）：文件存在即接上，不存在显示待移植卡 */
const CODEX = import.meta.glob('./CodexTab.p5r.tsx') as Record<string, () => Promise<{ default: ComponentType<{ params: URLSearchParams; wide: boolean }> }>>;
const codexLoader = Object.values(CODEX)[0];
const CodexTab = codexLoader ? lazy(codexLoader) : null;

/** v3 .badge5.add「＋ 添加自定义成就」 */
const AddTile = ({ onClick }: { onClick: () => void }) => (
  <div className="ach5-cell"><button type="button" className="badge5 add" data-act="add" onClick={onClick}><span className="bd-medal"><b>＋</b></span><b className="bd-t">添加自定义成就</b></button></div>
);

function AchTab({ empty, filterInit, formInit }: { empty: boolean; filterInit: Filter; formInit: string | null }) {
  const [list, setList] = useState<MockAch[]>(() => (empty ? [] : ACHIEVEMENTS.map((a) => ({ ...a }))));
  const [filter, setFilter] = useState<Filter>(filterInit);
  const [form, setForm] = useState<{ open: boolean; ach: MockAch | null }>({ open: !!formInit, ach: formInit === 'edit' ? ACHIEVEMENTS.find((a) => a.id.startsWith('custom_'))! : null });
  const [del, setDel] = useState<MockAch | null>(null);
  useEffect(() => { try { localStorage.setItem('pg_achievements_filter', filter); } catch { /* */ } }, [filter]);
  const shown = list.filter((a) => filter === 'all' || (filter === 'unlocked' ? a.unlocked : !a.unlocked)).sort((a, b) => Number(!!a.hidden) - Number(!!b.hidden));
  const claim = (a: MockAch) => {
    sfx('level', 0.5);
    setList((p) => p.map((x) => (x.id === a.id ? { ...x, unlocked: true, unlockedDate: new Date().toISOString().slice(0, 10) } : x)));
    unlockCutInP5({ heading: '成就解锁！', name: a.title, lines: ['感谢您的努力，', '您是最棒的客人。'] });
  };
  return (
    <div className="ach5-tab">
      <div className="ach5-ctl">
        <button type="button" className="ach5-filter" onClick={() => setFilter(CYCLE[(CYCLE.indexOf(filter) + 1) % 3])}>{ACH_LABEL[filter]}</button>
      </div>
      {list.length === 0 ? <><P5Empty text="暂无成就" seed={3} /><div className="ach-grid"><AddTile onClick={() => setForm({ open: true, ach: null })} /></div></> : shown.length === 0 ? <P5Empty text="暂无可展示的成就" seed={4} /> : (
        <div className="ach-grid">
          {shown.map((a, i) => {
            const ready = !a.unlocked && !a.hidden && a.progress >= a.condition.value;
            const masked = a.hidden && !a.unlocked;
            const custom = a.id.startsWith('custom_');
            return (
              <div key={a.id} className="ach5-cell" style={{ ['--i' as string]: i }}>
                <button type="button" className={`badge5 ${a.unlocked ? 'on' : ''} ${ready ? 'ready' : ''}`} disabled={!ready} aria-label={masked ? '隐藏成就' : `${a.title}：${a.description}`} onClick={() => ready && claim(a)}>
                  <span className="bd-medal">{a.unlocked && <P5BurstImg sz={84} rot={i * 13} />}{a.unlocked || ready ? <img className="bd-l" src={kitImg('L_' + a.letter)} alt="" /> : <b>?</b>}</span>
                  <b className="bd-t">{masked ? '？？？' : a.title}</b>
                  <small>{masked ? '隐藏成就' : a.description}</small>
                  {ready ? <em className="ach5-ready">已达成，点击解锁 ✦</em> : a.unlocked ? <em className="ach5-date">解锁于 {fmt(a.unlockedDate!)}</em> : !masked && <em className="ach5-prog"><i><b style={{ transform: `scaleX(${Math.min(1, a.progress / a.condition.value)})` }} /></i>{a.progress} / {a.condition.value}</em>}
                </button>
                {custom && <button type="button" className="ach5-edit" aria-label={`编辑成就 ${a.title}`} onClick={() => setForm({ open: true, ach: a })}>✎</button>}
                {custom && <button type="button" className="ach5-del" aria-label={`删除成就 ${a.title}`} onClick={() => setDel(a)}>✕</button>}
              </div>
            );
          })}
          <AddTile onClick={() => setForm({ open: true, ach: null })} />
        </div>
      )}
      <AchievementForm open={form.open} initial={form.ach} isCustom={!form.ach || form.ach.id.startsWith('custom_')} onClose={() => setForm((f) => ({ ...f, open: false }))}
        onSave={(f) => setList((p) => form.ach ? p.map((x) => (x.id === form.ach!.id ? { ...x, ...f } : x)) : [...p, { id: `custom_${Date.now()}`, letter: 'C', progress: 0, unlocked: false, ...f }])}
        onDelete={() => setList((p) => p.filter((x) => x.id !== form.ach?.id))} />
      <AchievementsDeleteConfirm open={!!del} onClose={() => setDel(null)} onConfirm={() => { const id = del?.id; setList((p) => p.filter((x) => x.id !== id)); }} />
    </div>
  );
}

function SkillTab({ empty, filterInit, formInit }: { empty: boolean; filterInit: Filter; formInit: string | null }) {
  const [list, setList] = useState<MockSkill[]>(() => (empty ? [] : SKILLS.map((s) => ({ ...s }))));
  const [filter, setFilter] = useState<Filter>(filterInit);
  const [form, setForm] = useState<{ open: boolean; sk: MockSkill | null }>({ open: !!formInit, sk: formInit === 'edit' ? SKILLS.find((s) => s.id === 'custom_k5')! : null });
  useEffect(() => { try { localStorage.setItem('pg_skills_filter', filter); } catch { /* */ } }, [filter]);
  const can = (s: MockSkill) => !s.unlocked && LEVELS[s.requiredAttribute] >= s.requiredLevel;
  const groups = useMemo(() => ATTR_ORDER.map((a) => ({ a, all: list.filter((s) => s.requiredAttribute === a) })).filter((g) => g.all.length), [list]);
  const unlock = (s: MockSkill) => { sfx('level', 0.5); setList((p) => p.map((x) => (x.id === s.id ? { ...x, unlocked: true } : x))); unlockCutInP5({ heading: '技能解锁！', name: s.name, lines: ['新技能已激活', '属性加成自动生效'] }); };
  const visible = (s: MockSkill) => filter === 'all' || (filter === 'unlocked' ? s.unlocked : !s.unlocked);
  const anyVisible = groups.some((g) => g.all.some(visible));
  return (
    <div className="ach5-tab">
      <div className="ach5-ctl">
        <button type="button" className="ach5-filter" onClick={() => setFilter(CYCLE[(CYCLE.indexOf(filter) + 1) % 3])}>{SK_LABEL[filter]}</button>
      </div>
      {!anyVisible ? <P5Empty text="暂无技能" seed={6} /> : groups.map(({ a, all }) => {
        const shown = all.filter(visible).sort((x, y) => x.requiredLevel - y.requiredLevel); if (!shown.length) return null;
        const raw = all.filter((s) => s.unlocked).reduce((m, s) => m * s.bonusMultiplier, 1), capped = raw > SKILL_BONUS_MULT_CAP, total = Math.min(SKILL_BONUS_MULT_CAP, raw);
        return (
          <section key={a} className="ach5-grp">
            <header className="ach5-gh"><b>{ATTR[a].name}</b><span>{all.filter((s) => s.unlocked).length}/{all.length} 已解锁</span>
              {total > 1 && <em className={capped ? 'cap' : ''} title={capped ? `技能连乘已超过上限，按 ×${SKILL_BONUS_MULT_CAP.toFixed(1)} 生效` : '本属性已解锁技能的合计加成'}>{capped ? `已达上限 ×${SKILL_BONUS_MULT_CAP.toFixed(1)}` : `合计 ×${total.toFixed(2).replace(/0$/, '')}`}</em>}
            </header>
            <div className="req-rows">{shown.map((s, i) => (
              <div key={s.id} className={`req ach5-sk${s.unlocked ? ' on' : can(s) ? ' ready' : ''}`} style={{ ['--i' as string]: i }}>
                <i className="req-bg" /><i className="req-cur" />
                <span className="ach5-st" aria-hidden="true">{s.unlocked ? '✓' : can(s) ? '!' : s.requiredLevel}</span>
                <span className="req-main"><b className="req-t">{s.name}</b><span className="req-meta">{!s.unlocked && <P5Tag tone="line">需 Lv.{s.requiredLevel}</P5Tag>}{s.id.startsWith('custom_') && <P5Tag tone="paper">自定义</P5Tag>}</span><small className="ach5-desc">{s.description}</small></span>
                <span className="ach5-sk-act">
                  {can(s) && <P5Button tone="red" size="sm" seed={170 + i} onClick={() => unlock(s)}>解锁</P5Button>}
                  <button type="button" className="ach5-ic" aria-label={`编辑技能 ${s.name}`} onClick={() => setForm({ open: true, sk: s })}>✎</button>
                </span>
              </div>
            ))}</div>
          </section>
        );
      })}
      <div className="ach5-addsk"><P5Button tone="red" seed={160} onClick={() => setForm({ open: true, sk: null })}>+ 添加技能</P5Button></div>
      <SkillForm open={form.open} initial={form.sk} onClose={() => setForm((f) => ({ ...f, open: false }))}
        onSave={(v) => setList((p) => form.sk ? p.map((x) => (x.id === form.sk!.id ? { ...x, ...v, description: skillEffect(v.requiredAttribute, v.bonusMultiplier, ATTR) } : x)) : [...p, { id: `custom_${Date.now()}`, unlocked: false, description: skillEffect(v.requiredAttribute, v.bonusMultiplier, ATTR), ...v }])}
        onDelete={() => setList((p) => p.filter((x) => x.id !== form.sk?.id))} />
    </div>
  );
}

export default function Achievements({ params, wide }: PageProps) {
  const root = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>(((params.get('tab') as Tab) || 'achievements'));
  const empty = params.get('state') === 'empty';
  const filter = (params.get('filter') as Filter) || 'all';
  useEffect(() => {
    const r = root.current; if (!r || isLowMotion()) return;
    const a = [...r.querySelectorAll('.badge5, .ach5-sk, .ach5-gh')].map((b, i) => b.animate([{ opacity: 0, transform: 'rotateY(90deg) scale(.6)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: 80 + i * 45, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }));
    return () => a.forEach((x) => x.cancel());
  }, [tab]);
  const tabs: { k: Tab; l: string }[] = [{ k: 'achievements', l: '成就' }, { k: 'skills', l: '技能' }, { k: 'codex', l: '图鉴' }];
  return (
    <div className="ach5 ach5p" ref={root}>
      <P5PageHeader ransom="AWARDS" cn="成就 · 技能" sub={`已解锁 ${empty ? 0 : ACHIEVEMENTS.filter((a) => a.unlocked).length} / ${empty ? 0 : ACHIEVEMENTS.length} · 技能 ${empty ? 0 : SKILLS.filter((s) => s.unlocked).length}`} seed={71} right={<P5Back to="menu" />} />
      <div className="seg ach-tabs" role="tablist">{tabs.map((t) => (
        <button key={t.k} type="button" role="tab" aria-pressed={tab === t.k} aria-selected={tab === t.k} onClick={() => { if (tab === t.k) return; sfx('nav', 0.4); setTab(t.k); }}>{t.l}</button>
      ))}</div>
      {tab === 'achievements' && <AchTab empty={empty} filterInit={filter} formInit={params.get('form')} />}
      {tab === 'skills' && <SkillTab empty={empty} filterInit={filter} formInit={params.get('skillform')} />}
      {tab === 'codex' && (CodexTab
        ? <Suspense fallback={null}><CodexTab params={params} wide={wide} /></Suspense>
        : <P5Empty text="图鉴 · 塔罗 78 / 岁时 44" hint="图鉴 Tab 待移植（pkg4：CodexTab.p5r.tsx）" seed={7} />)}
      <DevStateBar page="achievements" items={[
        { label: '成就', q: 'tab=achievements' }, { label: '成就·已完成', q: 'tab=achievements&filter=unlocked' }, { label: '成就·空', q: 'tab=achievements&state=empty' }, { label: '添加成就', q: 'tab=achievements&form=add' }, { label: '编辑成就', q: 'tab=achievements&form=edit' },
        { label: '技能', q: 'tab=skills' }, { label: '技能·未解锁', q: 'tab=skills&filter=locked' }, { label: '技能·空', q: 'tab=skills&state=empty' }, { label: '添加技能', q: 'tab=skills&skillform=add' }, { label: '编辑技能', q: 'tab=skills&skillform=edit' }, { label: '图鉴', q: 'tab=codex' },
      ]} />
    </div>
  );
}
