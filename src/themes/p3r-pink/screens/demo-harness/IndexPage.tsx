/**
 * #/__index —— 全部界面索引：分组、搜索、日夜 / 低动效开关、done/todo 计数、按包筛选；
 * 顶部虚拟分组「演出总览」= 全部 kind=fx 条目，可「▶ 一键播放全部演出」（按 fxMs 自动连播，顶部 REEL 条控制）。
 * 完成状态来自 status/pkgN.json（lib/status.ts）。
 */
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { INVENTORY_GROUPS, PKG_NAMES, type InvItem } from '@pink/inventory';
import { INVENTORY_LIVE } from '@pink/lib/status';
import { startReel } from '@pink/lib/reel';
import { toggleLowMotion, toggleMode, usePrefs } from '@pink/lib/prefs';
import { P3R, P3Button, P3Input, P3OnOff, P3SlantTabs, P3Tag, P3Progress, SectionMark, TitlePeriod, slantClip, IconSearch } from '@pink/kit';
import { PinkStage } from '@pink/fx/PinkStage';

const FX = '演出总览';
const KIND_LABEL: Record<string, string> = { page: '页面', subpage: '区块', tab: 'Tab', overlay: '弹窗', state: '状态·阶段', shell: '外壳', fx: '演出' };

export function IndexPage() {
  const loc = useLocation();
  const p = usePrefs();
  const initG = new URLSearchParams(loc.search).get('g') === 'fx' ? FX : 'all';
  const [q, setQ] = useState('');
  const [g, setG] = useState<string>(initG);
  const [pkg, setPkg] = useState(0);
  const [onlyTodo, setOnlyTodo] = useState(false);
  const all = INVENTORY_LIVE;
  const fxAll = useMemo(() => all.filter((i) => i.kind === 'fx'), [all]);
  const done = all.filter((i) => i.status === 'done').length;

  const list = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return all.filter((i) =>
      (g === 'all' || (g === FX ? i.kind === 'fx' : i.group === g)) &&
      (!pkg || i.pkg === pkg) && (!onlyTodo || i.status === 'todo') &&
      (!kw || `${i.id} ${i.title} ${i.realPath} ${i.p3r}`.toLowerCase().includes(kw)));
  }, [all, q, g, pkg, onlyTodo]);

  const grouped = useMemo(() => {
    if (g === FX) return [[FX, list] as [string, InvItem[]]];
    const m = new Map<string, InvItem[]>();
    list.forEach((i) => { if (!m.has(i.group)) m.set(i.group, []); m.get(i.group)!.push(i); });
    return [...m.entries()];
  }, [list, g]);

  const tabs = [{ id: 'all', label: '全部', badge: all.length }, { id: FX, label: `▶ ${FX}`, badge: fxAll.length }, ...INVENTORY_GROUPS.map((x) => ({ id: x, label: x, badge: all.filter((i) => i.group === x).length }))];

  return (
    <div className="relative min-h-screen" style={{ overflowX: 'clip' }}>
      <PinkStage variant="page" petals={4} />
      <div className="relative z-10 mx-auto max-w-[1100px] px-4 pb-24 pt-[calc(18px+env(safe-area-inset-top))] wide:px-8">
        <header className="relative mb-4">
          <div className="font-cond text-[13px] tracking-[0.2em]" style={{ color: P3R.blue }}>INDEX · 粉白 P3R DEMO</div>
          <h1 className="flex items-end font-heavy text-[clamp(32px,8vw,46px)] leading-none" style={{ color: P3R.ink }}>全部界面<TitlePeriod className="mb-1.5 ml-1" /></h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="flex items-baseline gap-1"><span className="font-cond text-[26px] leading-none" style={{ color: P3R.blue }}>{done}</span><span className="font-cond text-[14px]" style={{ color: P3R.grey }}>/ {all.length} DONE</span></span>
            <span className="text-[12px] font-bold" style={{ color: P3R.inkSoft }}>todo {all.length - done} · 演出 {fxAll.length}</span>
            <P3Progress value={done} max={all.length} className="w-[160px]" />
          </div>
          {/* 按类型计数：页面 / 子页 / Tab / 弹窗 / 状态·阶段 / 外壳 / 演出（done / total） */}
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="按类型计数">
            {(Object.keys(KIND_LABEL) as InvItem['kind'][]).map((k) => {
              const xs = all.filter((i) => i.kind === k);
              if (!xs.length) return null;
              return <P3Tag key={k} tone={k === 'fx' ? 'coral' : k === 'page' ? 'rose' : 'soft'}>{KIND_LABEL[k]} {xs.filter((i) => i.status === 'done').length}/{xs.length}</P3Tag>;
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-[12px] font-black" style={{ color: P3R.ink }}>日 / 夜 <P3OnOff value={p.mode === 'night'} onChange={toggleMode} labels={['夜', '日']} ariaLabel="夜间模式" /></span>
            <span className="flex items-center gap-1 text-[12px] font-black" style={{ color: P3R.ink }}>低动效 <P3OnOff value={p.motion === 'low'} onChange={toggleLowMotion} ariaLabel="低动效" /></span>
            <P3Button size="sm" tone="soft" onClick={() => { window.location.hash = '#/__kit'; }}>Kit 展示</P3Button>
            <P3Button size="sm" tone="soft" onClick={() => { window.location.hash = '#/'; }}>回首页</P3Button>
          </div>
        </header>

        {/* 演出总览横幅 */}
        <div className="relative mb-4 flex flex-wrap items-center gap-3 px-5 py-3" style={{ background: 'var(--pk-band)', clipPath: slantClip(14) }}>
          <div className="min-w-0 flex-1">
            <div className="font-cond text-[12px] tracking-[0.2em]" style={{ color: 'var(--p3r-cream)' }}>SHOWREEL</div>
            <div className="font-heavy text-[18px] leading-tight" style={{ color: 'var(--p3r-cream)' }}>演出总览 · {fxAll.length} 个演出 / 阶段</div>
          </div>
          <P3Button tone="ink" corner onClick={() => startReel(fxAll)}>▶ 一键播放全部演出</P3Button>
        </div>

        <div className="sticky top-0 z-20 -mx-4 mb-3 px-4 pb-1 pt-2 wide:-mx-8 wide:px-8" style={{ background: 'color-mix(in srgb, var(--p3r-bg) 92%, transparent)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[200px] flex-1"><P3Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索 id / 标题 / 真实文件 / P3R 画面" lead={<IconSearch size={16} />} aria-label="搜索" /></div>
            <select value={pkg} onChange={(e) => setPkg(Number(e.target.value))} aria-label="按工作包筛选" className="h-10 px-2 text-[13px] font-bold" style={{ background: P3R.panel, color: P3R.ink, clipPath: slantClip(6) }}>
              <option value={0}>全部包</option>
              {PKG_NAMES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
            </select>
            <label className="flex items-center gap-1 text-[12px] font-black" style={{ color: P3R.ink }}><input type="checkbox" checked={onlyTodo} onChange={(e) => setOnlyTodo(e.target.checked)} />只看 todo</label>
          </div>
          <P3SlantTabs className="mt-2" size="sm" items={tabs} value={g} onChange={setG} />
        </div>

        {grouped.map(([name, items]) => (
          <section key={name} className="mb-6">
            <SectionMark title={name} en={`${items.length} ITEMS`} className="mb-2"
              meta={items.some((i) => i.kind === 'fx') ? <P3Button size="sm" tone="primary" onClick={() => startReel(items.filter((i) => i.kind === 'fx'))}>▶ 播放本组演出</P3Button> : undefined} />
            <ul className="grid grid-cols-1 gap-1.5 wide-lg:grid-cols-2">
              {items.map((it) => <Row key={it.id} it={it} reelList={g === FX ? items : undefined} />)}
            </ul>
          </section>
        ))}
        {!list.length && <p className="py-10 text-center text-[14px] font-bold" style={{ color: P3R.grey }}>没有匹配的条目</p>}
      </div>
    </div>
  );
}

function Row({ it, reelList }: { it: InvItem; reelList?: InvItem[] }) {
  const isDone = it.status === 'done';
  return (
    <li className="relative">
      <a href={it.route} className={`relative flex min-w-0 items-center gap-2.5 py-2 pl-5 ${reelList ? 'pr-3 wide:pr-11' : 'pr-3'}`} title={`${it.realPath}\n对照：${it.p3r}`}>
        <span aria-hidden className="absolute inset-0" style={{ background: 'var(--p3r-row)', clipPath: slantClip(9) }} />
        <span aria-hidden className="absolute bottom-0 left-0 top-0 w-[8px]" style={{ background: isDone ? P3R.cyan : it.kind === 'fx' ? P3R.magenta : P3R.blue, clipPath: 'polygon(0 0, 100% 0, 30% 100%, 0 100%)' }} />
        <span className="relative min-w-0 flex-1">
          <span className="block truncate text-[14px] font-black" style={{ color: P3R.ink }}>{it.title}</span>
          <span className="block truncate font-cond-up text-[11px]" style={{ color: P3R.grey }}>{it.id} · P{it.pkg}{it.fxMs ? ` · ${(it.fxMs / 1000).toFixed(1)}s` : ''}</span>
        </span>
        <P3Tag tone={it.kind === 'fx' ? 'coral' : it.kind === 'page' ? 'rose' : 'soft'} className="relative">{KIND_LABEL[it.kind]}</P3Tag>
        <P3Tag tone={isDone ? 'lilac' : 'outline'} className="relative">{isDone ? 'DONE' : 'TODO'}</P3Tag>
      </a>
      {reelList && (
        <button type="button" aria-label={`从这里开始连播：${it.title}`} onClick={() => startReel(reelList, reelList.indexOf(it))} className="absolute right-1.5 top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center text-[11px] font-black wide:flex" style={{ background: P3R.blue, color: '#fff', clipPath: slantClip(4) }}>▶</button>
      )}
    </li>
  );
}
