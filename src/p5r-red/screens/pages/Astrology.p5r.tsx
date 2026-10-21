/**
 * 【2026-10-21 parity 修复】页头回到原生 v3 pages_a.js astro：FORTUNE 剪报 +「今日星象」标题牌 +「从三张塔罗牌中抽取今日指引」+ 返回（首页）+ 背后同心环；
 *   今日塔罗未抽态（idle）= v3 占卜桌 1:1（牌堆 5 张 + 三张扇入 + 点一张 3D 翻面 → 牌名逐字 + 正位签 + 解读，洗牌 / 深度解读 / 占卜档案 三钮；
 *   深度解读 / 占卜档案 = 切到对应 Tab）。三 Tab（P0-10）用 v3 .seg 切换签，放在页头下；其余状态沿用 v3 overlays/d.js DailyDraw 等 inline 版。
 *   撤回此前自造的「返回方钮 + 星象瓷砖拼贴 + ARCANA 纸条 + 斜纸片段签」与未抽态的另一套牌背。
 * 星象页 Astrology（真实 src/pages/Astrology.tsx p5 分支；P0-10）。
 * 头：返回首页方钮 + P5 拼贴「星 象」+ ARCANA 纸条；三张斜纸片段签：今日塔罗（每日一抽）· 中长期占卜（14 天效力）· 档案（N）。
 * 三个 Tab 都是页内内容（不是弹层）——内容 = v3 overlays/d.js 的 DailyDraw / LongReadingFlow / ReadingArchive 逐字迁移，以 inline 模式渲染进页面：
 *   ?tab=daily&state=idle|noapi|reading|done|error|resume       今日塔罗全状态；下方挂七日连星 FateGlimpseSection（&sec=glimpse 滚到它；?glimpse=ready 七星连缀）
 *   ?tab=long&step=form|pending|base|picking|reading|stopped|error|done|followerr   中长期占卜各步；&state=noai 未配置 AI
 *   ?tab=archive[&state=empty][&detail=1]                      档案列表 / 空 / 详情（ReadingDetail，返回回到档案）
 * 窥探命运（仪式 → 解读 → 祝福）与当日塔罗回看为弹层（FateGlimpse.p5r）。
 */
import { useLayoutEffect, useRef, useState } from 'react';
import type { PageProps } from '@/p5r-red/registry/types';
import { P5PageHeader, P5Back } from '@/p5r-red/kit/P5PageHeader';
import { P5Button } from '@/p5r-red/kit/P5Button';
import { P5StarIcon } from '@/p5r-red/kit/P5StarIcon';
import { kitImg } from '@/p5r-red/lib/asset';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import { spring } from '@/p5r-red/fx/spring';
import './Astrology.p5r.css';
import { INLINE, OD } from '@/p5r-red/screens/pkg4/d4';
import { P5 } from '@/p5r-red/screens/pkg4/p5';
import { panelIn } from '@/p5r-red/fx/motion';
import { DevStateBar } from '@/p5r-red/kit/DevStateBar';
import { P5Empty } from '@/p5r-red/kit/P5States';
import '@/p5r-red/screens/pkg4/pkg4.css';
import { useAppStore } from '@/store';
import { useEffect } from 'react';

type Tab = 'daily' | 'long' | 'archive';

function Inline({ play, dep }: { play: () => void; dep: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { INLINE.host = ref.current; INLINE.onClose = null; play(); INLINE.host = null; }, [dep]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={ref} className="p4-astro-in" />;
}

function Archive({ empty, onOpen }: { empty: boolean; onOpen: (id?: string) => void }) {
  const { longReadings } = useAppStore();
  const [t, setT] = useState<'active' | 'archived'>('active');
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { if (ref.current) return panelIn(ref.current.children, { from: 'right' }); }, [t]);
  if (empty) return <div className="p4-astro-empty"><P5Empty text="尚未有中长期占卜记录" hint="发起一次占卜后，此处会保留全部档案" seed={7} /></div>;
  const todayKey = new Date().toISOString().slice(0, 10);
  const rows: Array<[string, string, string, 'active' | 'archived', string]> = longReadings.map((r) => [
    r.question,
    r.period,
    new Date(r.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace(/\//g, '.'),
    (r.archived || r.expiresAt < todayKey) ? 'archived' : 'active',
    r.id,
  ]);
  return (
    <div className="p4-arch">
      <div className="seg od-seg">{(['active', 'archived'] as const).map((k) => <button key={k} type="button" aria-pressed={t === k} onClick={() => setT(k)}>{k === 'active' ? '活跃' : '已归档'}</button>)}</div>
      <div className="od-arch" ref={ref}>
        {rows.filter((r) => r[3] === t).map(([q, p, d, , id], i) => (
          <button key={id} className="od-arch-r" data-i={i} onClick={() => onOpen(id)}><i className="req-bg" />
            <span className="od-arch-cs" dangerouslySetInnerHTML={{ __html: OD.LR_CARDS.map(([c, r]: [unknown, boolean]) => OD.tarotFace(c, { w: 30, rev: r })).join('') }} />
            <span className="od-arch-m"><b>{q}</b><small>{OD.PERIOD[p][0]} · {d}{t === 'archived' ? ' · 已归档' : ''}</small></span><em>›</em>
          </button>
        ))}
      </div>
    </div>
  );
}

/** v3 MAJOR 原值 */
const MAJOR: [string, string, string, string][] = [['THE STAR', '星星', 'XVII', '希望正在靠近。把今天交给一件小而确定的事。'], ['THE CHARIOT', '战车', 'VII', '意志驱动前进。先动起来，方向会在路上变清楚。'], ['THE MOON', '月亮', 'XVIII', '不安来自未知。把模糊的事写下来，它就小了一半。']];

/** v3 占卜桌（今日塔罗 · 未抽） */
function FortuneTable({ onLong, onArchive }: { onLong: () => void; onArchive: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [pick, setPick] = useState<number | null>(null);
  const [named, setNamed] = useState(false);
  const timers = useRef<number[]>([]);
  const low = isLowMotion();
  const shuffle = () => {
    const r = root.current; if (!r || low) return;
    r.querySelectorAll('.as-dk').forEach((d, i) => d.animate([{ transform: 'translateX(0) rotate(0)' }, { transform: `translateX(${(i % 2 ? 1 : -1) * 70}px) rotate(${(i % 2 ? 1 : -1) * 14}deg)`, offset: 0.35 }, { transform: `translateX(${(i % 2 ? -1 : 1) * 40}px) rotate(${(i % 2 ? -1 : 1) * 8}deg)`, offset: 0.7 }, { transform: 'none' }], { duration: 900, delay: i * 40, easing: 'cubic-bezier(.65,0,.35,1)' }));
    timers.current.push(window.setTimeout(() => r.querySelectorAll('.as-card').forEach((c, i) => c.animate([{ transform: 'translate(0,-40vh) rotate(0) scale(.5)', opacity: 0 }, { transform: `rotate(${(i - 1) * 9}deg)`, opacity: 1 }], { duration: 480, delay: 120 + i * 110, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' })), 700));
  };
  useLayoutEffect(() => { shuffle(); const ts = timers.current; return () => ts.forEach(clearTimeout); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const r = root.current; if (!r || !named || low) return;
    const stops: (() => void)[] = [];
    r.querySelectorAll<HTMLElement>('.as-name span').forEach((s, i) => { s.style.opacity = '0'; stops.push(spring({ stiffness: 460, damping: 24, delay: i * 0.07, onUpdate: (p) => { s.style.opacity = String(Math.min(1, p * 1.5)); s.style.transform = `translateY(${26 + (0 - 26) * p}px) scale(${0.7 + 0.3 * p})`; } })); });
    const em = r.querySelector<HTMLElement>('.as-name em'); if (em) { em.style.transform = 'scale(0) rotate(-18deg)'; stops.push(spring({ stiffness: 480, damping: 18, delay: 0.25, onUpdate: (p) => { em.style.transform = `scale(${p}) rotate(${-18 + 15 * p}deg)`; } })); }
    r.querySelector('.as-read')?.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 400, delay: 300, fill: 'backwards' });
    return () => stops.forEach((s) => s());
  }, [named]); // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (i: number, el: HTMLElement) => {
    if (pick !== null) return; P5.sfx('tarot', 0.6);
    const r = root.current!;
    if (!low) {
      r.querySelectorAll<HTMLElement>('.as-card').forEach((o, k) => { if (k !== i) o.animate([{ opacity: 1 }, { opacity: 0.2, transform: `rotate(${(k - 1) * 9}deg) scale(.88)` }], { duration: 300, fill: 'forwards' }); });
      el.animate([{ translate: '0 0', scale: 1 }, { translate: '0 -18px', scale: 1.12 }] as Keyframe[], { duration: 300, fill: 'forwards', easing: 'cubic-bezier(.34,1.56,.64,1)' });
    }
    timers.current.push(window.setTimeout(() => { setPick(i); timers.current.push(window.setTimeout(() => setNamed(true), low ? 0 : 700)); }, low ? 0 : 700));
  };
  const reset = () => { root.current?.querySelectorAll('.as-card').forEach((c) => c.getAnimations().forEach((a) => a.cancel())); setPick(null); setNamed(false); shuffle(); };
  const m = pick !== null ? MAJOR[pick] : null;
  return (
    <div className="as-table" ref={root}>
      <div className="as-deck">{[0, 1, 2, 3, 4].map((i) => <img key={i} className="as-dk" src={kitImg('card_emblem')} alt="" style={{ ['--i' as string]: i }} />)}</div>
      <div className="as-fan">{[0, 1, 2].map((i) => (
        <button key={i} type="button" className={`as-card${pick === i ? ' flip' : ''}${pick === i && named ? ' float' : ''}`} data-i={i} style={{ ['--r' as string]: `${(i - 1) * 9}deg` }} aria-label={`抽第 ${i + 1} 张`} onClick={(e) => choose(i, e.currentTarget)}>
          <span className="fc-in"><img className="fc-b" src={kitImg('card_emblem')} alt="" /><span className="fc-f as-face"><small>{MAJOR[i][2]}</small><P5StarIcon fill="var(--red)" stroke="var(--ink)" sw={1.4} className="as-st" /><b>{MAJOR[i][1]}</b><em>{MAJOR[i][0]}</em></span></span>
        </button>
      ))}</div>
      <div className="as-name" aria-live="polite">{m && named && <>{[...m[1]].map((ch, k) => <span key={k}>{ch}</span>)}<em>正位</em></>}</div>
      <p className="as-read">{m && named ? m[3] : ''}</p>
      <div className="as-acts">
        <P5Button tone="paper" seed={101} onClick={reset}>洗牌</P5Button>
        <P5Button tone="red" seed={102} onClick={onLong}>深度解读</P5Button>
        <P5Button tone="ink" seed={103} onClick={onArchive}>占卜档案</P5Button>
      </div>
    </div>
  );
}

export default function Astrology({ params }: PageProps) {
  const { longReadings, loadLongReadings, sweepExpiredReadings } = useAppStore();
  useEffect(() => { void loadLongReadings().then(() => sweepExpiredReadings()); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const t0 = params.get('tab') as Tab | null;
  const [tab, setTab] = useState<Tab>(t0 === 'long' || t0 === 'archive' ? t0 : 'daily');
  const [detail, setDetail] = useState(params.get('detail') === '1');
  const st = params.get('state') ?? '';
  const step = params.get('step') ?? '';
  const glimpseRef = useRef<HTMLDivElement>(null);
  const switchTab = (v: Tab) => { setTab(v); setDetail(false); P5.sfx('nav', 0.4); window.scrollTo(0, 0); };
  useLayoutEffect(() => { if (params.get('sec') === 'glimpse') setTimeout(() => glimpseRef.current?.scrollIntoView({ block: 'start' }), 80); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const daily = ['idle', 'noapi', 'reading', 'done', 'error', 'resume'].includes(st) ? st : 'idle';
  const longSt = st === 'noai' ? 'noapi' : ['form', 'pending', 'base', 'picking', 'reading', 'stopped', 'error', 'done', 'followerr'].includes(step) ? step : 'form';
  return (
    <div className="p4-astro astro5">
      <div className="astro-rings astro5-rings" aria-hidden="true" />
      <P5PageHeader ransom="FORTUNE" cn="今日星象" sub="从三张塔罗牌中抽取今日指引" seed={51} right={<P5Back to="dashboard" />} />
      <div className="seg astro5-tabs" role="tablist">{([['daily', '今日塔罗'], ['long', '中长期占卜'], ['archive', `档案 ${st === 'empty' ? 0 : longReadings.length}`]] as [Tab, string][]).map(([k, l]) => (
        <button key={k} type="button" role="tab" aria-pressed={tab === k} aria-selected={tab === k} onClick={() => switchTab(k)}>{l}</button>
      ))}</div>
      {tab === 'daily' && <>
        {daily === 'idle' ? <FortuneTable onLong={() => switchTab('long')} onArchive={() => switchTab('archive')} /> : <Inline dep={`d-${daily}`} play={() => OD.openDailyDraw(daily)} />}
        <div ref={glimpseRef} id="fate-glimpse"><Inline dep={`g-${params.get('glimpse')}`} play={() => OD.openFateGlimpse(params.get('glimpse') === 'ready' ? 'ready' : 'progress')} /></div>
      </>}
      {tab === 'long' && <Inline dep={`l-${longSt}`} play={() => OD.openLongReading(longSt)} />}
      {tab === 'archive' && (detail ? <>
        <button type="button" className="p4-detail-back" onClick={() => setDetail(false)}>‹ 返回档案</button>
        <Inline dep="detail" play={() => OD.openLongReading('done')} />
      </> : <Archive empty={st === 'empty'} onOpen={() => setDetail(true)} />)}
      <DevStateBar page="astrology" items={[
        { label: '今日 · 未抽', q: 'tab=daily' }, { label: '未配置 API', q: 'tab=daily&state=noapi' }, { label: '解读中', q: 'tab=daily&state=reading' }, { label: '已抽', q: 'tab=daily&state=done' },
        { label: '解读失败', q: 'tab=daily&state=error' }, { label: '上次未完成', q: 'tab=daily&state=resume' }, { label: '七星连缀', q: 'tab=daily&glimpse=ready&sec=glimpse' },
        { label: '中长期 · 提问', q: 'tab=long' }, { label: '未配置 AI', q: 'tab=long&state=noai' }, { label: '注入波纹', q: 'tab=long&step=base' }, { label: '六选三', q: 'tab=long&step=picking' },
        { label: '解读与追问', q: 'tab=long&step=reading' }, { label: '解读详情', q: 'tab=long&step=done' }, { label: '档案', q: 'tab=archive' }, { label: '档案空', q: 'tab=archive&state=empty' }, { label: '档案详情', q: 'tab=archive&detail=1' },
      ]} />
    </div>
  );
}
