/**
 * 统计页（真实 src/pages/Statistics.tsx 的 p3 分支「p3-statistics-reference-v2」，蓝白重画）
 *   P3PageHeader ticks「统计」+ 命运轨迹斜纹 · GhostWords TRACE →
 *   成长轨迹（白大斜卡 + 出血蓝斜体大数字 + 累计曲线描线）→ 六格窄卡（左缘蓝竖斜片 + 大斜体数字）→
 *   属性趋势（斜块切换 近7天/近30天/全部 + 图例开关 + 点选读数）→ 属性分布（SOCIAL STATS 五维叠圆 + 名 Lv 行内 + 樱条臂章红端点 + pts）
 * 路由：#/p/statistics；?state=empty 数据不足
 */
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { AttributeId } from '@/types';
import type { PageProps } from '@blue/registry/types';
import { P3R, P3PageHeader, GhostWords, SectionMark, P3Empty, slantClip } from '@blue/kit';
import { PageEnter } from '@blue/fx';
import { useLowMotion } from '@blue/lib/prefs';
import { navigate } from '@blue/shell/shellBus';
import { ACTIVITIES, ATTR_LEVELS, ACHIEVEMENTS, SKILLS, type StatActivity } from '@blue/adapters/pkg4-stats';
import { ATTR_IDS, ATTR_NAMES, ATTR_COLOR } from '@blue/adapters/pkg4-tarot';
import { DevStrip, StateFade } from '@blue/screens/pkg4/ui';

type Range = '7' | '30' | 'all';
const md = (k: string) => `${Number(k.slice(5, 7))}/${Number(k.slice(8, 10))}`;
const wideSlant = (n: number) => `polygon(${n}px 0, 100% 0, calc(100% - ${n}px) 100%, 0 100%)`;
const card = (n = 20) => ({ clipPath: wideSlant(n), background: 'var(--p3r-panel-glass)', boxShadow: 'var(--p3r-shadow)' });

function streaks(days: string[]) {
  const set = [...new Set(days)].sort();
  let max = 0, run = 0, prev: number | null = null;
  for (const k of set) { const t = Date.parse(k); run = prev !== null && t - prev <= 86400_000 * 1.01 ? run + 1 : 1; max = Math.max(max, run); prev = t; }
  let cur = 0; const d = new Date();
  const has = (dd: Date) => set.includes(`${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`);
  if (!has(d)) d.setDate(d.getDate() - 1);
  while (has(d)) { cur++; d.setDate(d.getDate() - 1); }
  return { max, cur };
}

export default function Statistics({ params }: PageProps) {
  const low = useLowMotion();
  const [mode, setMode] = useState(params.get('state') === 'empty' ? 'empty' : 'data');
  const [range, setRange] = useState<Range>('30');
  const acts: StatActivity[] = mode === 'empty' ? [] : ACTIVITIES;
  const totals = useMemo(() => ATTR_IDS.map((id) => ({ id, total: acts.reduce((s, a) => s + (a.pts[id] ?? 0), 0) })), [acts]);
  const totalPoints = totals.reduce((s, t) => s + t.total, 0);
  const uniqueDays = new Set(acts.map((a) => a.date)).size;
  const { max: maxStreak, cur: todayStreak } = streaks(acts.map((a) => a.date));
  const avg = uniqueDays ? Math.round(totalPoints / uniqueDays) : 0;
  const top = [...totals].sort((a, b) => b.total - a.total)[0];
  const byDay = useMemo(() => {
    const m = new Map<string, Record<AttributeId, number>>();
    acts.forEach((a) => { if (!m.has(a.date)) m.set(a.date, { knowledge: 0, guts: 0, dexterity: 0, kindness: 0, charm: 0 }); const r = m.get(a.date)!; Object.entries(a.pts).forEach(([k, v]) => { r[k as AttributeId] += v ?? 0; }); });
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [acts]);
  const growth = useMemo(() => { let s = 0; return byDay.map(([k, r]) => { s += Object.values(r).reduce((x, y) => x + y, 0); return { k, v: s }; }); }, [byDay]);
  const trend = useMemo(() => { if (range === 'all') return byDay; const cut = new Date(); cut.setDate(cut.getDate() - Number(range)); return byDay.filter(([k]) => new Date(k) >= cut); }, [byDay, range]);
  const enter = (d: number) => ({ initial: low ? { opacity: 0 } : { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay: low ? 0 : d, duration: low ? 0.12 : 0.5 } });

  return (
    <PageEnter k="statistics">
      <div className="relative mx-auto max-w-2xl space-y-6 pb-8">
        <GhostWords words={['TRACE']} className="right-[8px] top-[-12px] text-right text-[78px]" />
        <div className="relative">
          <P3PageHeader ticks title="统计" en="STATUS" ghost={false} onBack={() => navigate('menu')} className="pt-2" />
          <div className="mt-1.5 inline-block pl-1">
            <span className="text-[15px] font-black" style={{ color: P3R.blue }}>命运轨迹</span>
            <span aria-hidden className="mt-0.5 block h-[3px] w-full" style={{ background: 'var(--p3r-cyan)', transform: 'skewX(-24deg)' }} />
          </div>
        </div>
        <StateFade k={mode}>
          <div className="space-y-6">
            {mode === 'empty' && <P3Empty text="数据还不够画出轨迹" sub="记录几条行动、给属性加点之后，这里会长出成长曲线和五维分布。" ghost="TRACE" />}
            <motion.div {...enter(0.05)}>
              <SectionMark title="成长轨迹" meta={<span className="text-[13px] font-black" style={{ color: P3R.blue }}>累计点数</span>} className="mb-3" />
              <div className="relative px-4 pb-4 pt-3" style={card(18)}>
                <div aria-hidden className="pointer-events-none absolute left-7 top-2 select-none font-cond text-[64px] leading-none" style={{ color: P3R.blue, opacity: 0.92 }}>{totalPoints}</div>
                <div className="relative pt-16"><GrowthCurve data={growth} records={acts.length} top={top.total > 0 ? ATTR_NAMES[top.id] : ''} /></div>
                <span aria-hidden className="absolute bottom-0 right-8 h-4 w-8" style={{ background: 'var(--p3r-cyan)', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
              </div>
            </motion.div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { l: '累计点数', v: totalPoints, s: '所有属性总和' },
                { l: '记录天数', v: uniqueDays, s: `共 ${acts.length} 条记录` },
                { l: '最长连续', v: `${maxStreak}天`, s: todayStreak > 0 ? `当前连续 ${todayStreak} 天` : '继续加油！' },
                { l: '日均点数', v: avg, s: top.total > 0 ? `最强：${ATTR_NAMES[top.id]}` : '平均每日获得' },
                { l: '成就已解锁', v: mode === 'empty' ? 0 : ACHIEVEMENTS.unlocked, s: `共 ${ACHIEVEMENTS.total} 项` },
                { l: '技能已解锁', v: mode === 'empty' ? 0 : SKILLS.unlocked, s: `共 ${SKILLS.total} 项` },
              ].map((c, i) => (
                <motion.div key={c.l} {...enter(0.15 + i * 0.05)} className="relative min-w-0 py-2.5 pl-6 pr-3" style={{ clipPath: wideSlant(8), background: 'var(--p3r-panel-glass)', boxShadow: 'var(--p3r-shadow)' }}>
                  <span aria-hidden className="absolute bottom-2.5 left-2 top-2.5 w-[4px]" style={{ background: P3R.blue, transform: 'skewX(-18deg)' }} />
                  <div className="flex min-w-0 flex-col">
                    <span className="text-[11px] font-black leading-tight" style={{ color: P3R.ink }}>{c.l}</span>
                    <span className="font-cond text-[24px] leading-none" style={{ color: P3R.blue }}>{c.v}</span>
                    <span className="mt-0.5 truncate text-[10px] font-semibold" style={{ color: P3R.grey }}>{c.s}</span>
                  </div>
                </motion.div>
              ))}
            </div>
            <motion.div {...enter(0.35)} className="p-5" style={card(20)}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <SectionMark title="属性趋势" />
                <div className="flex" role="tablist" aria-label="时间范围">
                  {([['7', '近7天'], ['30', '近30天'], ['all', '全部']] as const).map(([v, l]) => (
                    <button key={v} type="button" role="tab" aria-selected={range === v} onClick={() => setRange(v)} className="px-3 py-1 text-[12px] font-black" style={{ clipPath: slantClip(7), background: range === v ? P3R.blue : 'var(--p3r-chip)', color: range === v ? P3R.onBlue : P3R.ink, marginLeft: -3 }}>{l}</button>
                  ))}
                </div>
              </div>
              <TrendChart key={range} data={trend} range={range} />
            </motion.div>
            <motion.div {...enter(0.4)} className="p-5" style={card(20)}>
              <SectionMark title="属性分布" en="SOCIAL STATS" className="mb-4" />
              <Distribution totals={totals} />
            </motion.div>
          </div>
        </StateFade>
        <DevStrip value={mode} onChange={setMode} items={[{ id: 'data', label: '有数据' }, { id: 'empty', label: '数据不足' }]} />
      </div>
    </PageEnter>
  );
}

function GrowthCurve({ data, records, top }: { data: { k: string; v: number }[]; records: number; top: string }) {
  const low = useLowMotion();
  const W = 320, H = 130;
  if (data.length < 2) return <div className="flex h-[130px] items-center justify-center px-6 text-center text-[14px] font-bold" style={{ color: P3R.grey }}>记录更多后这里会出现成长轨迹</div>;
  const max = Math.max(1, ...data.map((d) => d.v));
  const pts = data.map((d, i) => [(i / (data.length - 1)) * W, H - 8 - (d.v / (max * 1.08)) * (H - 18)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <div>
      <div className="mb-1 text-[12px] font-bold" style={{ color: P3R.inkSoft }}>共 <span className="font-cond text-[15px]" style={{ color: P3R.blue }}>{records}</span> 条记录{top && <> · 最强 <b style={{ color: P3R.ink }}>{top}</b></>}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-[130px] w-full" preserveAspectRatio="none" role="img" aria-label="成长轨迹曲线">
        {[0.25, 0.5, 0.75].map((f) => <line key={`g${f}`} x1="0" x2={W} y1={H * f} y2={H * f} style={{ stroke: 'var(--p3r-track)' }} strokeDasharray="4 4" />)}
        <motion.path d={`${line} L${W},${H} L0,${H} Z`} style={{ fill: 'var(--p3r-cyan)' }} fillOpacity={0.35} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: low ? 0 : 0.6 }} />
        <motion.path d={line} fill="none" style={{ stroke: 'var(--p3r-blue)' }} strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinejoin="round" initial={low ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: 'easeOut' }} />
      </svg>
      <div className="flex justify-between text-[10.5px] font-bold" style={{ color: P3R.grey }}><span>{md(data[0].k)}</span><span>{md(data[data.length - 1].k)}</span></div>
    </div>
  );
}

function TrendChart({ data, range }: { data: [string, Record<AttributeId, number>][]; range: Range }) {
  const low = useLowMotion();
  const [on, setOn] = useState<Set<AttributeId>>(new Set(ATTR_IDS));
  const [hi, setHi] = useState<number | null>(null);
  const toggle = (id: AttributeId) => setOn((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  if (!data.length) return <div className="flex h-40 items-center justify-center text-[14px] font-bold" style={{ color: P3R.grey }}>{range === '7' ? '近7天' : range === '30' ? '近30天' : '全部'}暂无记录</div>;
  const W = 320, H = 170;
  const max = Math.max(1, ...data.flatMap(([, r]) => ATTR_IDS.filter((id) => on.has(id)).map((id) => r[id])));
  const x = (i: number) => (data.length > 1 ? (i / (data.length - 1)) * (W - 8) + 4 : W / 2);
  const y = (v: number) => H - 8 - (v / max) * (H - 20);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {ATTR_IDS.map((id) => (
          <button key={id} type="button" onClick={() => toggle(id)} aria-pressed={on.has(id)} className="inline-flex items-center gap-1 px-2 py-0.5 text-[12px] font-black" style={{ clipPath: slantClip(4), background: on.has(id) ? 'var(--p3r-chip)' : 'transparent', color: on.has(id) ? P3R.ink : P3R.grey, textDecoration: on.has(id) ? undefined : 'line-through' }}>
            <span className="inline-block h-2.5 w-2.5" style={{ background: ATTR_COLOR[id], clipPath: slantClip(2) }} />{ATTR_NAMES[id]}
          </button>
        ))}
      </div>
      <div className="relative" style={{ background: 'var(--p3r-row)', clipPath: slantClip(10) }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-44 w-full" preserveAspectRatio="none" onPointerLeave={() => setHi(null)}>
          {[0.25, 0.5, 0.75].map((f) => <line key={`t${f}`} x1="0" x2={W} y1={H * f} y2={H * f} style={{ stroke: 'var(--p3r-track)' }} strokeDasharray="4 4" />)}
          {ATTR_IDS.filter((id) => on.has(id)).map((id) => (
            <motion.path key={id} fill="none" stroke={ATTR_COLOR[id]} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round"
              d={data.map(([, r], i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(r[id]).toFixed(1)}`).join(' ')}
              initial={low ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} />
          ))}
          {data.map((d, i) => <rect key={d[0]} x={x(i) - W / data.length / 2} y="0" width={W / data.length} height={H} fill="transparent" onPointerEnter={() => setHi(i)} onClick={() => setHi(i)} />)}
          {hi !== null && <line x1={x(hi)} x2={x(hi)} y1="0" y2={H} style={{ stroke: 'var(--p3r-ink)' }} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
        </svg>
        {hi !== null && data[hi] && (
          <div className={`pointer-events-none absolute top-2 min-w-[96px] px-2.5 py-1 ${hi > data.length / 2 ? 'left-3' : 'right-3'}`} style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(5) }}>
            <div className="font-cond text-[12px]" style={{ color: 'var(--p3r-cyan)' }}>{md(data[hi][0])}</div>
            {ATTR_IDS.filter((id) => on.has(id)).map((id) => <div key={id} className="flex justify-between gap-3 text-[10.5px]"><span>{ATTR_NAMES[id]}</span><span className="font-cond">{data[hi][1][id]}</span></div>)}
          </div>
        )}
        <div className="flex justify-between px-3 pb-1 text-[10.5px] font-bold" style={{ color: P3R.grey }}><span>{md(data[0][0])}</span><span>{md(data[data.length - 1][0])}</span></div>
      </div>
    </div>
  );
}

/** SOCIAL STATS：五维叠圆（半径 ∝ 点数，五圆绕中心交叠，transform scale 入场）+ 分布行 */
function Distribution({ totals }: { totals: { id: AttributeId; total: number }[] }) {
  const low = useLowMotion();
  const max = Math.max(1, ...totals.map((t) => t.total));
  const sorted = [...totals].sort((a, b) => b.total - a.total);
  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <svg viewBox="0 0 200 150" className="h-[150px] w-full max-w-[260px]" role="img" aria-label={`五维叠圆：${sorted.map((t) => `${ATTR_NAMES[t.id]} ${t.total}`).join('、')}`}>
          {totals.map((t, i) => {
            const a = (-90 + i * 72) * (Math.PI / 180);
            const r = 18 + (t.total / max) * 30;
            const cx = 100 + Math.cos(a) * 26, cy = 76 + Math.sin(a) * 26;
            return (
              <g key={t.id}>
                <motion.circle cx={cx} cy={cy} r={r} fill={ATTR_COLOR[t.id]} fillOpacity={0.42} stroke={ATTR_COLOR[t.id]} strokeWidth="1.5" style={{ transformOrigin: `${cx}px ${cy}px` }}
                  initial={low ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + i * 0.07, type: 'spring', stiffness: 220, damping: 18 }} />
                <text x={100 + Math.cos(a) * 62} y={76 + Math.sin(a) * 62 + 4} textAnchor="middle" fontSize="10" fontWeight="900" style={{ fill: 'var(--p3r-ink)' }}>{ATTR_NAMES[t.id]}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="space-y-4">
        {sorted.map((t) => (
          <div key={t.id} className="min-w-0">
            <div className="mb-1.5 flex min-w-0 items-baseline gap-2">
              <span className="text-[14px] font-black" style={{ color: P3R.ink }}>{ATTR_NAMES[t.id]}</span>
              <span className="font-cond text-[12px]" style={{ color: P3R.roseInk }}>Lv.{ATTR_LEVELS[t.id]}</span>
              <span className="ml-auto font-cond text-[20px] leading-none" style={{ color: P3R.blue }}>{t.total}<span className="ml-0.5 text-[10px] font-bold" style={{ color: P3R.grey }}>pts</span></span>
            </div>
            <div className="relative h-[8px] w-full" style={{ background: 'var(--p3r-track)', clipPath: slantClip(3) }}>
              <span className="absolute inset-y-0 left-0 block w-full origin-left" style={{ background: 'var(--p3r-cyan)', transform: `scaleX(${t.total / max})` }} />
              <span className="absolute inset-y-0 block w-[8px]" style={{ left: `calc(${(t.total / max) * 100}% - 8px)`, background: P3R.magenta }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
