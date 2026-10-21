/**
 * 统计 Statistics（真实 src/pages/Statistics.tsx 的 p5 分支）—— 版式 1:1 回到原生 v3 pages_b.js stats「SOCIAL STATS」（用户验收版）：
 *   页头 → ss-grid【左 ss-list 五维竖排（名 + 英文 + 等级称号 + 刻度 + 点数条 + 大号等级）｜右 ss-side：4 张 KPI（累计点数 / 记录天数 / 最长连续 / 日均点数）
 *   → 属性趋势（星点折线）→ 属性分布（五柱）→ 解锁签 + 命运轨迹 → / 成就 →】。
 * FIXLIST 第五节「统计：近7天/近30天/全部 暂无记录 / 数据不足」只做最小功能补丁：属性趋势牌右侧加 7天/30天/全部 分段（v3 无），空态在图内显示文案。
 * 2026-10-21 parity 修复：此前按「真实结构」改成 成长轨迹 + 六卡 + 多折线 + 属性分布下移，已撤回。
 * 入场（v3）：行从左甩入 .06、刻度逐格点亮、数字滚动计数、折线描出、卡从右切入。
 * 直达：?state=empty（数据不足）  ?range=7|30|all
 */
import { useEffect, useRef, useState } from 'react';
import type { PageProps } from '@/p5r-red/registry/types';
import { P5PageHeader, P5Back } from '@/p5r-red/kit/P5PageHeader';
import { P5Shp } from '@/p5r-red/kit/P5Shp';
import { P5Plate } from '@/p5r-red/kit/P5Plate';
import { P5Seg } from '@/p5r-red/kit/P5Seg';
import { DevStateBar } from '@/p5r-red/kit/DevStateBar';
import { shape } from '@/p5r-red/lib/shape';
import { P5Tag } from '@/p5r-red/kit/P5Tag';
import { P5Button } from '@/p5r-red/kit/P5Button';
import { navigate } from '@/p5r-red/shell/shellBus';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import { spring } from '@/p5r-red/fx/spring';
import { panelIn } from '@/p5r-red/fx/motion';
import { ATTR, ATTR_ORDER, D, RANKS } from '@/p5r-red/mock/data';
import { useAppStore } from '@/store';
import { calcMaxStreak, streakDates } from '@/utils/streak';
import '../pkg5.p5r.css';

type Range = '7' | '30' | 'all';

function Empty({ text }: { text: string }) {
  return <div className="st5-empty"><svg viewBox="0 0 100 100" aria-hidden="true"><polygon points={shape.starPts(50, 52, 48)} fill="rgba(17,17,17,.1)" /></svg><span>{text}</span></div>;
}

export default function Statistics({ params }: PageProps) {
  const empty = params.get('state') === 'empty';
  const root = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<Range>((params.get('range') as Range) || 'all'); // parity：默认「全部」= v3 的 14 点折线
  // 真实数据：五维、活动、成就、技能
  const activities = useAppStore((s) => s.activities);
  const realAttrs = useAppStore((s) => s.attributes);
  const realAchievements = useAppStore((s) => s.achievements);
  const realSkills = useAppStore((s) => s.skills);
  const perDay = new Map<string, number>();
  for (const a of activities) {
    const k = a.date instanceof Date ? a.date.toISOString().slice(0, 10) : String(a.date).slice(0, 10);
    perDay.set(k, (perDay.get(k) ?? 0) + Object.values(a.pointsAwarded ?? {}).reduce((x, y) => x + (Number(y) || 0), 0));
  }
  const allDays = [...perDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  const ranged = range === '7' ? allDays.slice(-7) : range === '30' ? allDays.slice(-30) : allDays;
  const maxDay = Math.max(1, ...ranged);
  const days = ranged.map((v) => Math.round((v / maxDay) * 9));
  const totalPoints = empty ? 0 : realAttrs.reduce((s, a) => s + a.points, 0);
  const recordDays = empty ? 0 : perDay.size;
  const maxStreak = empty ? 0 : calcMaxStreak(streakDates(activities));
  const avg = recordDays ? (totalPoints / recordDays).toFixed(1) : '0';
  const kpi: [string, string][] = empty ? [['累计点数', '0'], ['记录天数', '0'], ['最长连续', '0'], ['日均点数', '0']] : [['累计点数', String(totalPoints)], ['记录天数', String(recordDays)], ['最长连续', String(maxStreak)], ['日均点数', avg]];
  const achN = empty ? 0 : realAchievements.filter((a) => a.unlocked).length, skN = empty ? 0 : realSkills.filter((s) => s.unlocked).length;
  const step = 280 / Math.max(1, days.length - 1);

  useEffect(() => {
    const r = root.current; if (!r || isLowMotion()) return;
    const a: Animation[] = []; const stops: (() => void)[] = [];
    r.querySelectorAll('.ss-row').forEach((el, i) => a.push(el.animate([{ opacity: 0, transform: 'translateX(-80px) skewX(14deg)' }, { opacity: 1, transform: 'none' }], { duration: 340, delay: 60 + i * 60, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' })));
    r.querySelectorAll('.ss-ticks i.on').forEach((t, i) => a.push(t.animate([{ transform: 'skewX(-24deg) scale(0) rotate(-45deg)' }, { transform: 'skewX(-24deg) scale(1.3)', offset: 0.6 }, { transform: 'skewX(-24deg)' }], { duration: 260, delay: 400 + i * 50, fill: 'backwards' })));
    r.querySelectorAll<HTMLElement>('[data-n]').forEach((el) => { const raw = el.dataset.n!, n = parseFloat(raw), dec = raw.includes('.'); if (!n) return; stops.push(spring({ stiffness: 120, damping: 20, delay: 0.2, onUpdate: (p) => { el.textContent = dec ? (n * p).toFixed(1) : String(Math.round(n * p)); } })); });
    r.querySelectorAll('.ss-bar i, .ss-dist i').forEach((b) => a.push(b.animate([{ transform: 'scale(0,1)' }, { transform: 'none' }], { duration: 600, delay: 300, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' })));
    r.querySelectorAll<SVGPolylineElement>('.ss-line polyline').forEach((pl) => { const L = pl.getTotalLength(); pl.style.strokeDasharray = String(L); a.push(pl.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 900, delay: 300, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'backwards' })); });
    stops.push(panelIn(r.querySelectorAll('.kpi, .ss-chart'), { from: 'right', stagger: 0.06, delay: 0.15 }));
    return () => { a.forEach((x) => x.cancel()); stops.forEach((s) => s()); };
  }, []);

  const rangeLabel = range === '7' ? '近7天' : range === '30' ? '近30天' : '全部';
  return (
    <div className="stats5 st5" ref={root}>
      <P5PageHeader ransom="SOCIAL STATS" cn="统计" sub="五维社会属性 · 成长轨迹" seed={61} right={<P5Back to="menu" />} />
      <div className="ss-grid">
        <section className="ss-list" aria-label="五维社会属性">{ATTR_ORDER.map((id, i) => { const a = empty ? { level: 1, pts: 0, next: 20 } : D.attrs[id]; return (
          <div key={id} className="ss-row" style={{ ['--i' as string]: i }}>
            <span className="ss-name">{ATTR[id].name}<small>{ATTR[id].en}</small></span>
            <span className="ss-mid"><b className="ss-rank">{RANKS[id][a.level - 1]}</b><span className="ss-ticks">{Array.from({ length: 5 }, (_, k) => <i key={k} className={k < a.level ? 'on' : ''} />)}</span><span className="ss-bar"><i style={{ width: `${Math.round(a.pts / a.next * 100)}%` }} /></span><small>{a.pts} / {a.next}</small></span>
            <b className="ss-lv" data-n={String(a.level)}>{a.level}</b>
          </div>
        ); })}</section>
        <section className="ss-side">
          <div className="ss-kpi">{kpi.map(([k, v], i) => (
            <P5Shp key={k} kind="cut" seed={120 + i} tone={i === 0 ? 'paper' : i === 3 ? 'red' : 'ink'} className="kpi"><small>{k}</small><b data-n={v}>{v}</b></P5Shp>
          ))}</div>
          <P5Shp kind="torn" seed={130} className="ss-chart">
            <div className="st5-ch-hd"><P5Plate fs={15}>属性趋势</P5Plate><P5Seg items={[{ id: '7', label: '7天' }, { id: '30', label: '30天' }, { id: 'all', label: '全部' }]} value={range} onChange={setRange} className="st5-range" /></div>
            {empty ? <Empty text={`${rangeLabel}暂无记录`} /> : (
              <svg viewBox="0 0 280 110" className="ss-line" role="img" aria-label="属性趋势">
                <polyline key={range} points={days.map((d, i) => `${i * step},${100 - d * 10}`).join(' ')} fill="none" stroke="#D7000F" strokeWidth="5" strokeLinejoin="bevel" />
                {days.map((d, i) => <polygon key={i} points={shape.starPts(i * step, 100 - d * 10, 6)} fill="#111" />)}
              </svg>
            )}
          </P5Shp>
          <P5Shp kind="torn" seed={140} className="ss-chart">
            <P5Plate fs={15}>属性分布</P5Plate>
            {empty ? <Empty text="记录更多后这里会出现属性分布" /> : (
              <div className="ss-dist">{ATTR_ORDER.map((id) => <span key={id}><i style={{ height: `${D.attrs[id].pts}%` }} /><b>{ATTR[id].name}</b></span>)}</div>
            )}
          </P5Shp>
          <div className="ss-unlock">
            <P5Tag>成就已解锁 {achN}</P5Tag><P5Tag tone="ink">技能已解锁 {skN}</P5Tag>
            <P5Button tone="paper" size="sm" seed={150} onClick={() => navigate('astrology', { via: 'tear' })}>命运轨迹 →</P5Button>
            <P5Button tone="red" size="sm" seed={151} onClick={() => navigate('achievements', { via: 'tear' })}>成就 →</P5Button>
          </div>
        </section>
      </div>
      <DevStateBar page="statistics" items={[{ label: '默认', q: '' }, { label: '数据不足', q: 'state=empty' }, { label: '近30天', q: 'range=30' }, { label: '全部', q: 'range=all' }, { label: '空 · 30天', q: 'state=empty&range=30' }]} />
    </div>
  );
}
