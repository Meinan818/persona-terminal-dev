/** 隐藏索引页 #/__index：读 src/inventory.ts，按 group 分组列出，可点进，显示 done/todo 计数；附注册表、官方插槽状态。 */
import { useMemo, useState } from 'react';
import * as Inv from '@yellow/inventory';
import type { InvItem } from '@yellow/inventory';

const InvMod = Inv as unknown as Record<string, unknown>;
import { PAGES } from '@yellow/registry/pages';
import { OVERLAYS } from '@yellow/registry/overlays';
import { OFFICIAL_SLOTS, useSlotExists } from '@yellow/lib/slots';
import { P4Outline, P4Section, P4Chip, P4SegmentTabs, P4Input, P4Button, IconSearch } from '@yellow/kit';
import { toggleMode, toggleLowMotion, toggleScanlines, usePrefs } from '@yellow/lib/prefs';
import { ScanlineOverlay } from '@yellow/fx';
import { cx } from '@yellow/lib/cx';
import { FX, FX_GROUPS, FX_PLAYLIST, type FxStatus } from '@yellow/fxCatalog';

const FX_TAG: Record<FxStatus, { label: string; cls: string }> = {
  ok: { label: '完整', cls: 'bg-p4g-green text-p4g-black' },
  fixed: { label: '已补全', cls: 'bg-p4g-orange text-p4g-black' },
  added: { label: '新做', cls: 'bg-p4g-yellow text-p4g-black' },
  entry: { label: '新入口', cls: 'bg-p4g-blue text-white' },
  dev: { label: '偏差', cls: 'bg-p4g-black text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black' },
  na: { label: '不适用', cls: 'bg-p4g-black/30 text-p4g-ink' },
};

/** 演出总览：一键连播 + 全部演出直达（src/fxCatalog.ts，与 FX-AUDIT.md 同源） */
function FxOverview() {
  const [open, setOpen] = useState(true);
  return (
    <P4Section title="演出总览" en={`FX ${FX.length} 项 · 连播 ${FX_PLAYLIST.length} 段`}>
      <div className="rounded-sm border-3 border-p4g-line bg-p4g-surface-2 p-3 text-p4g-ink shadow-hard">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <P4Button size="lg" variant="black" onClick={() => { window.location.hash = '#/overlay/fx-showreel'; }}>▶ 一键播放全部演出</P4Button>
          <P4Button size="sm" variant="secondary" onClick={() => { window.location.hash = '#/overlay/global-levelup?variant=mastery'; }}>精通提升</P4Button>
          <P4Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>{open ? '收起清单' : '展开清单'}</P4Button>
          <span className="min-w-0 text-cap text-p4g-ink-soft">每一段演出（含变体 / 阶段）都能直达；状态：完整 / 已补全 / 新做 / 新入口 / 偏差 / 不适用</span>
        </div>
        {open && (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {FX_GROUPS.map((g) => (
              <div key={g} className="min-w-0">
                <div className="mb-1 font-display text-meta font-bold">{g}</div>
                <div className="overflow-hidden rounded-sm border-2 border-p4g-line bg-p4g-surface">
                  {FX.filter((f) => f.group === g).map((f, i) => (
                    <div key={f.id} className={cx('flex min-w-0 items-center gap-2 px-2 py-1.5', i > 0 && 'border-t')} style={{ borderColor: 'var(--p4g-line-soft)' }}>
                      <span className={cx('w-12 shrink-0 rounded-xs text-center font-display text-2xs font-bold leading-5', FX_TAG[f.status].cls)}>{FX_TAG[f.status].label}</span>
                      <a href={f.route} className="min-w-0 flex-1 truncate font-display text-meta font-bold text-p4g-ink hover:underline" title={`${f.real}${f.note ? ` · ${f.note}` : ''}`}>{f.title}</a>
                      {f.play && <a href={`#/overlay/fx-showreel?only=${f.id}`} aria-label={`单播 ${f.title}`} className="shrink-0 rounded-xs bg-p4g-black px-1.5 font-display text-2xs font-bold leading-5 text-p4g-yellow">▶</a>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </P4Section>
  );
}

// 兼容清单文件的导出名（INVENTORY / inventory / default）
const items: InvItem[] = (InvMod.INVENTORY ?? InvMod.inventory ?? InvMod.default ?? []) as InvItem[];
const GROUP_ORDER: readonly string[] = (InvMod.INVENTORY_GROUPS as readonly string[] | undefined) ?? [];

const SlotRow = ({ k }: { k: string }) => {
  const ok = useSlotExists(k.includes('*') ? '__wild__' : k);
  return (
    <div className="flex min-w-0 items-center gap-2 border-b-2 border-p4g-line-soft py-1.5 text-meta" style={{ borderColor: 'var(--p4g-line-soft)' }}>
      <code className="w-40 shrink-0 truncate font-bold">{OFFICIAL_SLOTS[k].file}</code>
      <span className="min-w-0 flex-1 truncate text-p4g-ink-soft">{OFFICIAL_SLOTS[k].desc}</span>
      <span className={cx('shrink-0 rounded-xs px-1.5 font-display text-2xs font-bold', k.includes('*') ? 'bg-p4g-black/20' : ok ? 'bg-p4g-green text-p4g-black' : 'bg-p4g-black text-white')}>{k.includes('*') ? '族' : ok ? '已放入' : '空'}</span>
    </div>
  );
};

export function IndexPage() {
  const p = usePrefs();
  const [filter, setFilter] = useState<'all' | 'todo' | 'done'>('all');
  const [kw, setKw] = useState('');
  const groups = useMemo(() => {
    const m = new Map<string, InvItem[]>();
    for (const it of items) {
      if (filter !== 'all' && it.status !== filter) continue;
      if (kw && !`${it.title}${it.id}${it.realPath}${it.route}`.toLowerCase().includes(kw.toLowerCase())) continue;
      const arr = m.get(it.group) ?? []; arr.push(it); m.set(it.group, arr);
    }
    const order = (g: string) => { const i = GROUP_ORDER.indexOf(g); return i < 0 ? 999 : i; };
    return [...m.entries()].sort((a, b) => order(a[0]) - order(b[0]));
  }, [filter, kw]);
  const done = items.filter((i) => i.status === 'done').length;
  const inInv = new Set(items.map((i) => i.route));
  const extraPages = Object.keys(PAGES).filter((k) => !inInv.has(`#/p/${k}`));
  const extraOverlays = Object.keys(OVERLAYS).filter((k) => !inInv.has(`#/overlay/${k}`));
  const href = (r: string) => (r.startsWith('#') ? r : `#${r.startsWith('/') ? r : `/${r}`}`);

  return (
    <div className="p4g-stage min-h-screen pb-16">
      <ScanlineOverlay />
      <div className="h-4 p4g-candy-h" />
      <div className="mx-auto max-w-page px-4 pt-4">
        <div className="flex min-w-0 flex-wrap items-end gap-3">
          <P4Outline size="clamp(30px,9vw,48px)" stroke={5} italic>INDEX</P4Outline>
          <span className="pb-1 font-display text-body font-bold text-[color:var(--p4g-on-stage)]">隐藏索引 · 全部界面清单</span>
          <span className="ml-auto flex gap-1.5 pb-1">
            <P4Chip tone="black">共 {items.length}</P4Chip>
            <P4Chip tone="yellow">DONE {done}</P4Chip>
            <P4Chip tone="tag">TODO {items.length - done}</P4Chip>
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <P4Button size="sm" onClick={() => { window.location.hash = '#/'; }}>进入外壳</P4Button>
          <P4Button size="sm" variant="black" onClick={() => { window.location.hash = '#/__kit'; }}>Kit 展示</P4Button>
          <P4Button size="sm" variant="secondary" onClick={toggleMode}>{p.mode === 'day' ? '日 → 夜' : '夜 → 日'}</P4Button>
          <P4Button size="sm" variant="secondary" onClick={toggleLowMotion}>{p.motion === 'low' ? '低动效 ✓' : '低动效'}</P4Button>
          <P4Button size="sm" variant="secondary" onClick={toggleScanlines}>{p.scanlines ? '扫描线 ✓' : '扫描线'}</P4Button>
        </div>
        <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-[1fr_260px]">
          <P4Input placeholder="搜索标题 / id / 真实路径" value={kw} onChange={(e) => setKw(e.target.value)} prefix={<IconSearch size={14} />} />
          <P4SegmentTabs value={filter} onChange={(v) => setFilter(v as typeof filter)} items={[{ id: 'all', label: '全部' }, { id: 'todo', label: 'TODO' }, { id: 'done', label: 'DONE' }]} />
        </div>

        {items.length === 0 && <div className="mt-6 rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] p-4 text-[color:var(--p4g-msg-ink)]">&gt; inventory.ts 目前是空 stub，清单代理生成后这里会自动列出。</div>}

        <div className="mt-6 flex flex-col gap-6">
          {!kw && filter !== 'todo' && <FxOverview />}
          {groups.filter(([g]) => kw || g !== '演出总览').map(([g, list]) => {
            const d = list.filter((i) => i.status === 'done').length;
            return (
              <P4Section key={g} title={g} en={`${d} / ${list.length} DONE`}>
                <div className="overflow-hidden rounded-sm border-3 border-p4g-line bg-p4g-surface-2 shadow-hard">
                  {list.map((it, i) => (
                    <a key={it.id} href={href(it.route)} className={cx('flex min-w-0 items-center gap-3 px-3 py-2 text-p4g-ink hover:bg-p4g-yellow/40', i > 0 && 'border-t-2')} style={{ borderColor: 'var(--p4g-line-soft)' }}>
                      <span className={cx('w-12 shrink-0 rounded-xs text-center font-display text-2xs font-bold leading-5', it.status === 'done' ? 'bg-p4g-green text-p4g-black' : 'bg-p4g-black text-white night:bg-p4g-yellow night:text-p4g-black')}>{it.status.toUpperCase()}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-body font-bold">{it.title}</span>
                        <span className="block truncate text-2xs text-p4g-ink-soft">{it.kind} · {it.realPath} → {it.demoFile}</span>
                      </span>
                      <code className="hidden shrink-0 text-2xs text-p4g-ink-soft sm:block">{it.route}</code>
                    </a>
                  ))}
                </div>
              </P4Section>
            );
          })}

          {(extraPages.length > 0 || extraOverlays.length > 0) && (
            <P4Section title="已登记但不在清单" en="REGISTRY">
              <div className="flex flex-wrap gap-2">
                {extraPages.map((k) => <a key={k} href={`#/p/${k}`}><P4Chip tone="outline">页 · {PAGES[k].title}</P4Chip></a>)}
                {extraOverlays.map((k) => <a key={k} href={`#/overlay/${k}`}><P4Chip tone="outline">弹 · {OVERLAYS[k].title}</P4Chip></a>)}
              </div>
            </P4Section>
          )}

          <P4Section title="官方素材插槽" en="public/assets/p4g/official/">
            <div className="rounded-sm border-3 border-p4g-line bg-p4g-surface-2 px-3 py-1 text-p4g-ink shadow-hard">
              {Object.keys(OFFICIAL_SLOTS).map((k) => <SlotRow key={k} k={k} />)}
            </div>
          </P4Section>
        </div>
      </div>
    </div>
  );
}
