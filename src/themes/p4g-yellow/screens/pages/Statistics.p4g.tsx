/**
 * 统计页（真实 src/pages/Statistics.tsx）—— P4G「Status」版式：
 *   成长轨迹（累计点数曲线，电视屏）→ 六格大数字 → 属性趋势（近7天/近30天/全部 + 图例开关）→ 属性分布（Status 行）
 * 路由：#/p/statistics；?state=empty 数据不足
 */
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { AttributeId } from '@real/types';
import type { PageProps } from '@yellow/registry/types';
import { P4Card, P4DataBlock, P4Section, P4SegmentTabs, P4EmptyState } from '@yellow/kit';
import { CollageStagger, CollageItem } from '@yellow/fx';
import { useLowMotion } from '@yellow/lib/prefs';
import { cx } from '@yellow/lib/cx';
import { navigate } from '@yellow/shell/shellBus';
import type { StatActivity } from '@yellow/mock/pkg4-stats';
import { useStatisticsData } from '@yellow/adapters/pkg4-stats';
import { ATTR_IDS, ATTR_NAMES, ATTR_COLOR } from '@yellow/mock/pkg4-tarot';
import { PkgHeader, DevStrip, Kicker, StateFade } from '@yellow/screens/pkg4/ui';

type Range = '7' | '30' | 'all';
const md = (k: string) => `${Number(k.slice(5, 7))}/${Number(k.slice(8, 10))}`;

function streaks(days: string[]) {
  const set = [...new Set(days)].sort();
  let max = 0, run = 0, prev: number | null = null;
  for (const k of set) { const t = Date.parse(k); run = prev !== null && t - prev <= 86400_000 * 1.01 ? run + 1 : 1; max = Math.max(max, run); prev = t; }
  // current（今天或昨天结尾）
  let cur = 0; const d = new Date();
  const has = (dd: Date) => set.includes(`${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`);
  if (!has(d)) d.setDate(d.getDate() - 1);
  while (has(d)) { cur++; d.setDate(d.getDate() - 1); }
  return { max, cur };
}

export default function Statistics({ params }: PageProps) {
  const { ACTIVITIES, ATTR_LEVELS, ACHIEVEMENTS, SKILLS, ATTR_NAMES } = useStatisticsData();
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
  const trend = useMemo(() => {
    if (range === 'all') return byDay;
    const cut = new Date(); cut.setDate(cut.getDate() - Number(range));
    return byDay.filter(([k]) => new Date(k) >= cut);
  }, [byDay, range]);

  return (
    <div className="relative mx-auto max-w-2xl space-y-6 pb-8">
      <PkgHeader title="统计" en="STATUS" onBack={() => navigate('menu')} backLabel="返回" weather="cloudy" sub={<Kicker tone="orange">命运轨迹</Kicker>} />
      <StateFade k={mode}>
        <CollageStagger className="space-y-6">
          <CollageItem>
            <P4Section title="成长轨迹" en="GROWTH" action={<span className="font-display text-meta font-bold text-[color:var(--p4g-on-stage)]">累计点数</span>}>
              <GrowthTV data={growth} total={totalPoints} records={acts.length} top={top.total > 0 ? ATTR_NAMES[top.id] : ''} />
            </P4Section>
          </CollageItem>

          <CollageItem>
            <div className="grid grid-cols-2 gap-3 wide:grid-cols-3">
              <Stat label="累计点数" value={totalPoints} sub="所有属性总和" tone="orange" />
              <Stat label="记录天数" value={uniqueDays} sub={`共 ${acts.length} 条记录`} tone="yellow" />
              <Stat label="最长连续" value={maxStreak} unit="天" sub={todayStreak > 0 ? `当前连续 ${todayStreak} 天` : '继续加油！'} tone="black" />
              <Stat label="日均点数" value={avg} sub={top.total > 0 ? `最强：${ATTR_NAMES[top.id]}` : '平均每日获得'} tone="surface" />
              <Stat label="成就解锁" value={mode === 'empty' ? 0 : ACHIEVEMENTS.unlocked} sub={`共 ${ACHIEVEMENTS.total} 项`} tone="surface" />
              <Stat label="技能解锁" value={mode === 'empty' ? 0 : SKILLS.unlocked} sub={`共 ${SKILLS.total} 项`} tone="surface" />
            </div>
          </CollageItem>

          <CollageItem>
            <P4Section title="属性趋势" en="TREND">
              <P4Card tone="paper">
                <P4SegmentTabs className="mb-3" value={range} onChange={(v) => setRange(v as Range)} items={[{ id: '7', label: '近7天' }, { id: '30', label: '近30天' }, { id: 'all', label: '全部' }]} />
                <TrendChart key={range} data={trend} range={range} />
              </P4Card>
            </P4Section>
          </CollageItem>

          <CollageItem>
            <P4Section title="属性分布" en="DISTRIBUTION">
              <Distribution totals={totals} />
            </P4Section>
          </CollageItem>
        </CollageStagger>
      </StateFade>
      <DevStrip value={mode} onChange={setMode} items={[{ id: 'data', label: '有数据' }, { id: 'empty', label: '数据不足' }]} />
    </div>
  );
}

function Stat({ label, value, unit, sub, tone }: { label: string; value: number; unit?: string; sub: string; tone: 'orange' | 'yellow' | 'black' | 'surface' }) {
  return (
    <div className="min-w-0">
      <P4DataBlock label={label} value={value} unit={unit} tone={tone} />
      <div className="mt-1 truncate pl-1 font-display text-2xs font-bold text-[color:var(--p4g-on-stage)] opacity-80">{sub}</div>
    </div>
  );
}

/** 成长轨迹：黑电视屏 + 黄色面积曲线；左上 PLV 式大数字 */
function GrowthTV({ data, total, records, top }: { data: { k: string; v: number }[]; total: number; records: number; top: string }) {
  const low = useLowMotion();
  const W = 320, H = 150;
  const max = Math.max(1, ...data.map((d) => d.v));
  const pts = data.map((d, i) => [data.length > 1 ? (i / (data.length - 1)) * W : W / 2, H - 10 - (d.v / (max * 1.1)) * (H - 24)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <div className="relative overflow-hidden rounded-lg border-[5px] border-p4g-black bg-[#151208] shadow-hard-lg night:border-p4g-yellow">
      <div aria-hidden className="absolute inset-x-0 top-0 h-2 p4g-candy-h" />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ background: 'repeating-linear-gradient(0deg, rgba(255,255,255,.6) 0 1px, transparent 1px 3px)' }} />
      <div className="relative flex min-w-0 items-start gap-3 px-3 pt-4">
        <div className="shrink-0 bg-p4g-orange px-2.5 py-1.5 shadow-[3px_3px_0_#000]">
          <div className="font-display text-2xs font-bold uppercase tracking-[0.2em] text-p4g-black">累计点数</div>
          <div className="p4g-num text-[clamp(34px,10vw,52px)] leading-none text-white" style={{ WebkitTextStroke: '1.5px #111' }}>{total}</div>
        </div>
        <div className="min-w-0 pt-1 font-display text-meta font-bold leading-snug text-white/85">
          {records > 0 ? <>共 <span className="p4g-num text-p4g-yellow">{records}</span> 条记录 · {top ? <>最强 <span className="text-p4g-yellow">{top}</span></> : '继续加油'}</> : '记录更多后这里会出现成长曲线 ✨'}
        </div>
      </div>
      {data.length < 2 ? (
        <div className="relative flex h-[150px] items-center justify-center px-6 text-center font-display text-body font-bold text-white/80">记录更多后这里会出现成长轨迹</div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="relative block h-[150px] w-full" preserveAspectRatio="none" role="img" aria-label="成长轨迹曲线">
          {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="rgba(255,229,0,.14)" strokeDasharray="4 4" />)}
          <motion.path d={`${line} L${W},${H} L0,${H} Z`} fill="rgba(255,229,0,.22)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: low ? 0 : 0.6 }} />
          <motion.path d={line} fill="none" stroke="#FFE500" strokeWidth="3" vectorEffect="non-scaling-stroke" initial={low ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} />
        </svg>
      )}
      {data.length >= 2 && <div className="relative flex justify-between px-2 pb-1.5 font-display text-2xs font-bold text-white/60"><span>{md(data[0].k)}</span><span>{md(data[data.length - 1].k)}</span></div>}
    </div>
  );
}

function TrendChart({ data, range }: { data: [string, Record<AttributeId, number>][]; range: Range }) {
  const { ATTR_NAMES } = useStatisticsData();
  const low = useLowMotion();
  const [on, setOn] = useState<Set<AttributeId>>(new Set(ATTR_IDS));
  const [hi, setHi] = useState<number | null>(null);
  const toggle = (id: AttributeId) => setOn((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  if (!data.length) return <div className="flex h-40 items-center justify-center font-display text-body font-bold text-p4g-ink-soft">{range === '7' ? '近7天' : range === '30' ? '近30天' : '全部'}暂无记录</div>;
  const W = 320, H = 170;
  const max = Math.max(1, ...data.flatMap(([, r]) => ATTR_IDS.filter((id) => on.has(id)).map((id) => r[id])));
  const x = (i: number) => (data.length > 1 ? (i / (data.length - 1)) * (W - 8) + 4 : W / 2);
  const y = (v: number) => H - 8 - (v / max) * (H - 20);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {ATTR_IDS.map((id) => (
          <button key={id} type="button" onClick={() => toggle(id)} aria-pressed={on.has(id)} className={cx('p4g-press inline-flex items-center gap-1 rounded-xs border-thin border-p4g-line px-2 py-0.5 font-display text-meta font-bold', on.has(id) ? 'bg-p4g-surface text-p4g-ink' : 'bg-transparent text-p4g-muted line-through opacity-60')}>
            <span className="inline-block h-2.5 w-2.5 rounded-xs border border-p4g-black" style={{ background: ATTR_COLOR[id] }} />{ATTR_NAMES[id]}
          </button>
        ))}
      </div>
      <div className="relative rounded-sm border-3 border-p4g-line bg-p4g-surface-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-44 w-full" preserveAspectRatio="none" onPointerLeave={() => setHi(null)}>
          {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="var(--p4g-line-soft)" strokeDasharray="4 4" />)}
          {ATTR_IDS.filter((id) => on.has(id)).map((id) => (
            <motion.path key={id} fill="none" stroke={ATTR_COLOR[id]} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round"
              d={data.map(([, r], i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(r[id]).toFixed(1)}`).join(' ')}
              initial={low ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} />
          ))}
          {data.map((_, i) => <rect key={i} x={x(i) - W / data.length / 2} y="0" width={W / data.length} height={H} fill="transparent" onPointerEnter={() => setHi(i)} onClick={() => setHi(i)} />)}
          {hi !== null && <line x1={x(hi)} x2={x(hi)} y1="0" y2={H} stroke="var(--p4g-line)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
        </svg>
        {hi !== null && data[hi] && (
          <div className={cx('pointer-events-none absolute top-2 min-w-[96px] rounded-sm border-thin border-p4g-black bg-p4g-black px-2 py-1 text-white shadow-[3px_3px_0_var(--p4g-orange)]', hi > data.length / 2 ? 'left-2' : 'right-2')}>
            <div className="font-display text-2xs font-bold text-p4g-yellow">{md(data[hi][0])}</div>
            {ATTR_IDS.filter((id) => on.has(id)).map((id) => <div key={id} className="flex justify-between gap-3 text-2xs"><span>{ATTR_NAMES[id]}</span><span className="p4g-num-upright">{data[hi][1][id]}</span></div>)}
          </div>
        )}
        <div className="flex justify-between px-2 pb-1 font-display text-2xs font-bold text-p4g-ink-soft"><span>{md(data[0][0])}</span><span>{md(data[data.length - 1][0])}</span></div>
      </div>
    </div>
  );
}

/** Status 行：属性名（白字描边）+ Lv + pts 大数字 + 条 */
function Distribution({ totals }: { totals: { id: AttributeId; total: number }[] }) {
  const { ATTR_NAMES, ATTR_LEVELS } = useStatisticsData();
  const max = Math.max(1, ...totals.map((t) => t.total));
  return (
    <div className="overflow-hidden rounded-sm border-3 border-p4g-line" style={{ background: 'var(--p4g-surface-grad)' }}>
      {totals.map((t, i) => (
        <div key={t.id} className={cx('flex min-w-0 items-center gap-3 px-3 py-2.5', i && 'border-t-2 border-p4g-green/70')}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border-3 border-p4g-black font-display text-body font-bold text-white" style={{ background: ATTR_COLOR[t.id] }}>{ATTR_NAMES[t.id].slice(0, 1)}</span>
          <div className="w-[76px] shrink-0">
            <div className="truncate font-display text-body font-bold text-p4g-ink">{ATTR_NAMES[t.id]}</div>
            <div className="font-display text-2xs font-bold text-p4g-tag night:text-p4g-yellow">Lv.<span className="p4g-num">{ATTR_LEVELS[t.id]}</span></div>
          </div>
          <div className="h-[12px] min-w-0 flex-1 overflow-hidden rounded-[2px] border-thin border-p4g-black bg-p4g-black">
            <div className="h-full origin-left bg-p4g-orange" style={{ transform: `scaleX(${t.total / max})` }} />
          </div>
          <div className="w-14 shrink-0 text-right"><span className="p4g-num text-h2 leading-none text-p4g-ink">{t.total}</span><span className="ml-0.5 text-2xs font-bold text-p4g-ink-soft">pts</span></div>
        </div>
      ))}
    </div>
  );
}
