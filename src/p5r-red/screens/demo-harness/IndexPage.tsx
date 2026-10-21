/**
 * 隐藏索引 #/__index（v3 registry.js 的 .ix 风格）：读 src/inventory.ts（按分组列全部界面 / 子步骤 / 状态，▶ 直达）
 * + src/fxCatalog.ts「演出总览」分组（fx id、红色对位、真实文件、状态、▶ 单播、⏩ 从此连播；顶部一键连播）。
 * 过滤：全部 / TODO / DONE、工作包 pkg1..5、类型、关键字。另列「已登记但不在清单」。
 */
import { useMemo, useState } from 'react';
import { INVENTORY, INVENTORY_GROUPS, type InvItem } from '@/p5r-red/inventory';
import { FX_CATALOG } from '@/p5r-red/fxCatalog';
import { pkgOf } from '@/p5r-red/inventorySplit';
import { PAGES } from '@/p5r-red/registry/pages';
import { OVERLAYS } from '@/p5r-red/registry/overlays';
import { useWide } from '@/p5r-red/lib/layout';
import { P5Stage, defaultStage } from '@/p5r-red/fx/bg';
import { P5Plate } from '@/p5r-red/kit/P5Plate';
import { P5Seg } from '@/p5r-red/kit/P5Seg';
import { toggleLowMotion, toggleMode, usePrefs } from '@/p5r-red/lib/prefs';

type St = 'all' | 'todo' | 'done'; type Pk = 'all' | '1' | '2' | '3' | '4' | '5';
const FX_GROUP = '演出总览';

export function IndexPage() {
  const wide = useWide();
  const p = usePrefs();
  const [filter, setFilter] = useState<St>('all');
  const [pkg, setPkg] = useState<Pk>('all');
  const [kind, setKind] = useState<'all' | InvItem['kind'] | 'fx'>('all');
  const [kw, setKw] = useState('');
  const hit = (s: string) => !kw || s.toLowerCase().includes(kw.toLowerCase());
  const groups = useMemo(() => {
    const m = new Map<string, InvItem[]>();
    for (const it of INVENTORY) {
      if (filter !== 'all' && it.status !== filter) continue;
      if (pkg !== 'all' && String(pkgOf(it.id)) !== pkg) continue;
      if (kind !== 'all' && it.kind !== kind) continue;
      if (!hit(`${it.title}${it.id}${it.realPath}${it.route}`)) continue;
      const a = m.get(it.group) ?? []; a.push(it); m.set(it.group, a);
    }
    return INVENTORY_GROUPS.filter((g) => m.has(g)).map((g) => [g, m.get(g)!] as const);
  }, [filter, pkg, kind, kw]); // eslint-disable-line react-hooks/exhaustive-deps
  const fx = FX_CATALOG.filter((f) => (filter === 'all' || f.status === filter) && (pkg === 'all' || String(f.pkg) === pkg) && (kind === 'all' || kind === 'fx') && hit(`${f.title}${f.id}${f.yellow ?? ''}${f.realPath}`));
  const done = INVENTORY.filter((i) => i.status === 'done').length;
  const fxDone = FX_CATALOG.filter((f) => f.status === 'done').length;
  const ids = new Set([...INVENTORY.map((i) => i.id), ...FX_CATALOG.map((f) => f.id)]);
  const routed = new Set(INVENTORY.map((i) => (i.route.match(/^#\/(?:p|overlay)\/([^?]+)/) || [])[1]));
  const extra = [...Object.keys(PAGES).filter((k) => !routed.has(k)).map((k) => ({ k, t: PAGES[k].title, r: `#/p/${k}` })), ...Object.keys(OVERLAYS).filter((k) => !ids.has(k) && !routed.has(k)).map((k) => ({ k, t: OVERLAYS[k].title, r: `#/overlay/${k}` }))];
  const btn = { padding: '6px 10px', font: '900 11px/1 var(--f-title)', color: 'var(--paper)', background: 'rgba(17,17,17,.85)', boxShadow: 'inset 0 0 0 1.5px var(--paper)' } as const;
  return (
    <>
      <P5Stage stage={defaultStage(wide, { sil: null, seed: 3 })} />
      <main id="view">
        <div className="page" data-page="__index">
          <div className="ix">
            <h1 className="ix-h"><P5Plate fs={26}>INVENTORY · 清单</P5Plate></h1>
            <p className="ix-sum">界面 {INVENTORY.length} 项 · 完成 {done} · 待移植 {INVENTORY.length - done}；演出 {FX_CATALOG.length} 项 · 完成 {fxDone} · <a href="#/p/dashboard">进入外壳</a> · <a href="#/__kit">Kit 展示</a> · <a href="#/overlay/fx-showreel">⏩ 一键连播</a></p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '0 0 12px' }}>
              <button style={btn} onClick={toggleMode}>{p.mode === 'day' ? '日间 → 夜间' : '夜间 → 日间'}</button>
              <button style={btn} onClick={toggleLowMotion}>{p.motion === 'low' ? '低动效 ✓' : '低动效'}</button>
              <input className="inp" style={{ maxWidth: 260, padding: '6px 10px', fontSize: 13 }} placeholder="搜索标题 / id / 真实路径" value={kw} onChange={(e) => setKw(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, margin: '0 0 18px' }}>
              <P5Seg value={filter} onChange={setFilter} items={[{ id: 'all', label: '全部' }, { id: 'todo', label: 'TODO' }, { id: 'done', label: 'DONE' }]} />
              <P5Seg value={pkg} onChange={setPkg} items={[{ id: 'all', label: '全部包' }, ...(['1', '2', '3', '4', '5'] as const).map((n) => ({ id: n, label: `pkg${n}` }))]} />
              <P5Seg value={kind} onChange={setKind} items={[{ id: 'all', label: '全类型' }, { id: 'page', label: '页面' }, { id: 'subpage', label: '子步骤' }, { id: 'tab', label: 'Tab' }, { id: 'overlay', label: '弹层' }, { id: 'state', label: '状态' }, { id: 'shell', label: '外壳' }, { id: 'fx', label: '演出' }]} />
            </div>
            {groups.map(([g, list]) => (
              <section className="ix-g" key={g}>
                <h2>{g} · {list.filter((i) => i.status === 'done').length}/{list.length}</h2>
                {list.map((it) => (
                  <a key={it.id} className="ix-row" href={it.route}>
                    <b>{it.title}</b><span>{it.id} · {it.kind} · pkg{pkgOf(it.id) ?? '?'} · {it.realPath}</span>
                    <i className={`ix-st ${it.status === 'done' ? '' : 'wip'}`}>{it.status === 'done' ? '✔ DONE ▶' : '… TODO ▶'}</i>
                  </a>
                ))}
              </section>
            ))}
            {fx.length > 0 && (
              <section className="ix-g">
                <h2>{FX_GROUP} · {fx.filter((f) => f.status === 'done').length}/{fx.length} · <a href="#/overlay/fx-showreel">⏩ 一键连播</a> · <a href="#/overlay/fx-showreel?todo=0">⏩ 只播已完成</a></h2>
                {fx.map((f) => (
                  <div key={f.id} className="ix-row" style={{ display: 'grid' }}>
                    <b><a href={f.route}>▶ {f.title}</a></b>
                    <span>{f.id} · {f.group} · pkg{f.pkg} · 约 {(f.ms / 1000).toFixed(1)}s · {f.realPath}{f.yellow ? ` · 黄色：${f.yellow}` : ''} · <a href={`#/overlay/fx-showreel?from=${f.id}`}>⏩ 从此连播</a></span>
                    <i className={`ix-st ${f.status === 'done' ? '' : 'wip'}`}>{f.status === 'done' ? '✔ DONE' : '… TODO'}</i>
                  </div>
                ))}
              </section>
            )}
            {extra.length > 0 && (
              <section className="ix-g"><h2>已登记但不在清单</h2>{extra.map((e) => <a key={e.k} className="ix-row" href={e.r}><b>{e.t}</b><span>{e.k}</span><i className="ix-st skip">额外</i></a>)}</section>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
