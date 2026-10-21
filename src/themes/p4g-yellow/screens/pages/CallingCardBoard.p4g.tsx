/**
 * 宣告卡 · 独立总览页（#/p/callingcard）——**真实 app 暂无此页**，用户决定三色都加（2026-10-21）；参考红色 p5r-v3 `#/callingcard` 页 + 菜单条目，按 P4G 视觉重画。
 * 数据：与 行动·任务「倒计时」面（GoalDeck / CallingCardSection）共用 src/screens/pkg2/callingCardStore.ts（初值 mock/pkg2#CALLING_CARDS），两处改动互相可见。
 * 分组：📌 钉选（未归档且钉到主页，最多一张）/ 进行中 / 已收（手动收存 manual、任务全清 auto_todos）/ 过期（到期自动收存 auto_date，及目标日已过仍未收的）。
 * 每张卡：「CALLING CARD」黑签 + 模式（日期 / 任务清单 / 兼有）+ icon + 标题 + 台词 + 大号剩余 / 状态 + 进度条；
 *   动作：钉到主页 / 取消钉选（互斥）· 编辑 → 现有宣告卡编辑抽屉（CallingCardEditor）· 归档 → 宣告卡结算演出「宣告 · 已收」（CallingCardCutIn manual）
 *   · 已收 / 过期卡：取消归档 · 删除 → 确认框（CallingCardSectionDeleteConfirm「删除「X」？」）。
 * 空态：NO SIGNAL「还没有宣告卡」+「✦ 立下约定」（?state=empty）。宽屏两列。接入时：真实无此页，需新增 currentPage 'callingcard' 与菜单条目（占卜之后）。
 */
import { useState } from 'react';
import type { CallingCard } from '@/types';
import type { PageProps } from '@yellow/registry/types';
import { P4Button, P4DataBlock, P4EmptyState, P4PageHeader, P4Section, useToast, IconClose } from '@yellow/kit';
import { CollageItem, CollageStagger } from '@yellow/fx';
import { navigate } from '@yellow/shell/shellBus';
import { cx } from '@yellow/lib/cx';
import { TODAY_KEY } from '@yellow/adapters/pkg2';
import { daysBetween } from '@yellow/screens/pkg2/common';
import { toneBg } from '@yellow/screens/pkg2/tones';
import { cardProgress } from '@yellow/screens/pkg2/GoalDeck';
import { removeCard, saveCard, updateCard, useCallingCards } from '@yellow/screens/pkg2/callingCardStore';
import CallingCardEditor from '@yellow/screens/overlays/CallingCardEditor.p4g';
import CallingCardSectionDeleteConfirm from '@yellow/screens/overlays/CallingCardSectionDeleteConfirm.p4g';
import CallingCardCutIn, { type Reason } from '@yellow/screens/overlays/CallingCardCutIn.p4g';

const MODE: Record<CallingCard['mode'], string> = { deadline: '日期', todos: '任务清单', both: '兼有' };
const overdue = (c: CallingCard) => !c.archived && !!c.targetDate && c.targetDate < TODAY_KEY;
type Kind = 'pinned' | 'active' | 'archived' | 'expired';
const kindOf = (c: CallingCard): Kind => (c.archived ? (c.archiveReason === 'auto_date' ? 'expired' : 'archived') : overdue(c) ? 'expired' : c.pinned ? 'pinned' : 'active');

function BigCount({ c }: { c: CallingCard }) {
  if (c.archived) return <span className="font-display text-h3 font-bold">{c.archiveReason === 'auto_todos' ? '已达成' : c.archiveReason === 'auto_date' ? '已至期' : '已收存'}</span>;
  if (overdue(c)) return <span className="font-display text-h3 font-bold">已过期</span>;
  if (c.targetDate === TODAY_KEY) return <span className="font-display text-h2 font-bold">就是今天</span>;
  if (c.mode === 'todos' || !c.targetDate) return <span className="font-display text-h3 font-bold">{cardProgress(c).summary}</span>;
  return (
    <span className="flex items-baseline gap-1 leading-none"><small className="text-cap font-bold">还剩</small><b className="p4g-num text-[clamp(30px,9vw,40px)] leading-none">{daysBetween(TODAY_KEY, c.targetDate)}</b><small className="text-cap font-bold">天</small></span>
  );
}

function CardTile({ c, onPin, onEdit, onArchive, onUnarchive, onDelete }: { c: CallingCard; onPin: () => void; onEdit: () => void; onArchive: () => void; onUnarchive: () => void; onDelete: () => void }) {
  const k = kindOf(c);
  const live = k === 'pinned' || k === 'active';
  const { overall, summary } = cardProgress(c);
  return (
    <article aria-label={`宣告卡：${c.title}，${summary}，${overall}%`}
      className={cx('relative min-w-0 overflow-hidden rounded-sm border-3 border-p4g-black shadow-hard night:border-p4g-yellow', live ? 'bg-p4g-yellow text-p4g-black' : 'bg-p4g-surface-2 text-p4g-ink')}
      style={{ backgroundImage: live ? toneBg(c.tone) : undefined }}>
      <div className="flex min-w-0 items-center justify-between gap-2 bg-p4g-black px-3 py-1">
        <span className="truncate font-display text-cap font-bold tracking-[0.2em] text-p4g-yellow">{k === 'pinned' ? '📌 PINNED · 钉到主页' : k === 'expired' ? 'CALLING CARD · EXPIRED' : k === 'archived' ? 'CALLING CARD · CLEARED' : 'CALLING CARD'}</span>
        <span className="shrink-0 rounded-[2px] bg-p4g-yellow px-1.5 font-display text-2xs font-bold text-p4g-black">{MODE[c.mode]}</span>
      </div>
      <div className={cx('flex min-w-0 items-start gap-3 px-3 pb-2 pt-3', !live && 'opacity-90')}>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xs border-3 border-p4g-black bg-white text-[24px] text-p4g-black">{c.icon ?? '✦'}</span>
        <div className="min-w-0 flex-1">
          <h3 className="p4g-clamp-2 font-display text-h3 font-bold leading-tight">{c.title}</h3>
          {c.subtitle && <p className={cx('mt-0.5 truncate text-meta italic', live ? 'text-p4g-black/70' : 'text-p4g-ink-soft')}>「{c.subtitle}」</p>}
          {c.targetDate && <p className={cx('mt-0.5 p4g-date-type text-2xs', live ? 'text-p4g-black/70' : 'text-p4g-muted')}>{c.startDate.slice(5).replace('-', '/')} → {c.targetDate.slice(5).replace('-', '/')}</p>}
        </div>
        <div className="shrink-0 text-right"><BigCount c={c} /></div>
      </div>
      <div className="mx-3 mb-2 flex items-center gap-2">
        <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-[2px] border-thin border-p4g-black bg-p4g-black/80"><div className="h-full origin-left bg-p4g-orange" style={{ transform: `scaleX(${overall / 100})` }} /></div>
        <span className="w-10 shrink-0 text-right p4g-num text-body">{overall}%</span>
      </div>
      <div className="flex min-w-0 flex-wrap gap-1.5 border-t-2 border-dashed border-p4g-black/25 px-3 py-2">
        {live ? (
          <>
            <P4Button size="sm" variant={c.pinned ? 'black' : 'secondary'} onClick={onPin}>{c.pinned ? '取消钉选' : '📌 钉到主页'}</P4Button>
            <P4Button size="sm" variant="secondary" onClick={onEdit}>编辑</P4Button>
            <P4Button size="sm" variant="secondary" onClick={onArchive}>归档</P4Button>
          </>
        ) : (
          <P4Button size="sm" variant="secondary" onClick={onUnarchive}>取消归档</P4Button>
        )}
        <P4Button size="sm" variant="danger" className="ml-auto" onClick={onDelete}>删除</P4Button>
      </div>
    </article>
  );
}

export default function CallingCardBoard({ params }: PageProps) {
  const toast = useToast();
  const [shared] = useCallingCards();
  const [demoEmpty, setDemoEmpty] = useState(params?.get('state') === 'empty');
  const cards = demoEmpty ? [] : shared;
  const [editor, setEditor] = useState<false | { card: CallingCard | null }>(false);
  const [del, setDel] = useState<CallingCard | null>(null);
  const [cut, setCut] = useState<null | { card: CallingCard; reason: Reason }>(null);
  const [hint, setHint] = useState(true);

  const groups: { k: Kind; title: string; en: string; empty: string }[] = [
    { k: 'pinned', title: '钉选', en: 'PINNED', empty: '还没有钉到主页的宣告卡 · 在卡上点「📌 钉到主页」' },
    { k: 'active', title: '进行中', en: 'ON AIR', empty: '没有进行中的宣告卡' },
    { k: 'archived', title: '已收', en: 'CLEARED', empty: '还没有收存的宣告卡' },
    { k: 'expired', title: '过期', en: 'EXPIRED', empty: '没有过期的宣告卡' },
  ];
  const by = (k: Kind) => cards.filter((c) => kindOf(c) === k);
  const live = by('pinned').length + by('active').length;

  const archive = (c: CallingCard) => { updateCard(c.id, { archived: true, archiveReason: 'manual', archivedAt: new Date(), pinned: false } as Partial<CallingCard>); setCut({ card: c, reason: 'manual' }); };

  return (
    <>
      <P4PageHeader title="宣告卡" en="CALLING CARD" onBack={() => navigate('menu')} weather="cloudy" subtitle="为重要的事写一张「宣告卡」" />
      <div className="flex min-w-0 flex-col gap-6 pb-6">
        {cards.length === 0 ? (
          <div className="rounded-sm border-3 border-p4g-black bg-p4g-surface shadow-hard night:border-p4g-line">
            <P4EmptyState title="还没有宣告卡" hint="为重要的事写一张「宣告卡」，倒计时随时在此映入眼帘"
              action={<P4Button variant="black" onClick={() => setEditor({ card: null })}>✦ 立下约定</P4Button>} />
          </div>
        ) : (
          <>
            {hint && (
              <div className="flex min-w-0 items-center gap-2 rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] px-3 py-2 text-meta font-bold text-[color:var(--p4g-msg-ink)] shadow-plate night:border-p4g-yellow">
                <span aria-hidden className="text-p4g-yellow">&gt;</span>
                <span className="min-w-0 flex-1 leading-snug">与「行动 · 倒计时」是同一批卡；钉到主页的那张会出现在首页问候卡下。</span>
                <button type="button" aria-label="不再提示" onClick={() => setHint(false)} className="flex h-8 w-8 shrink-0 items-center justify-center text-p4g-yellow"><IconClose size={12} /></button>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <P4DataBlock tone="yellow" label="进行中" value={live} unit="张" />
              <P4DataBlock tone="orange" label="已收" value={by('archived').length} unit="张" />
              <P4DataBlock tone="black" label="过期" value={by('expired').length} unit="张" />
            </div>
            <P4Button variant="black" block onClick={() => setEditor({ card: null })}>✦ 立下新的宣告</P4Button>
            {groups.map((g) => {
              const list = by(g.k);
              return (
                <P4Section key={g.k} title={`${g.title} · ${list.length}`} en={g.en}>
                  {list.length === 0 ? (
                    <div className="rounded-sm border-thin border-dashed border-p4g-line px-3 py-3 text-meta text-[color:var(--p4g-on-stage)]">{g.empty}</div>
                  ) : (
                    <CollageStagger className="grid grid-cols-1 gap-3 wide:grid-cols-2">
                      {list.map((c, i) => (
                        <CollageItem key={c.id} tilt={i % 2 ? 0.5 : -0.5}>
                          <CardTile c={c}
                            onPin={() => { updateCard(c.id, { pinned: !c.pinned }); toast(c.pinned ? '已取消钉选' : '已钉到主页'); }}
                            onEdit={() => setEditor({ card: c })}
                            onArchive={() => archive(c)}
                            onUnarchive={() => { updateCard(c.id, { archived: false, archiveReason: undefined }); toast('已取消归档'); }}
                            onDelete={() => setDel(c)} />
                        </CollageItem>
                      ))}
                    </CollageStagger>
                  )}
                </P4Section>
              );
            })}
          </>
        )}
      </div>
      <CallingCardEditor open={!!editor} onClose={() => setEditor(false)} initialCard={editor ? editor.card : null} onSave={(c) => { saveCard(c); setDemoEmpty(false); }} />
      <CallingCardSectionDeleteConfirm open={!!del} onClose={() => setDel(null)} title={del?.title} onConfirm={() => { if (del) removeCard(del.id); toast.success('已删除'); }} />
      <CallingCardCutIn open={!!cut} onClose={() => setCut(null)} card={cut?.card} reason={cut?.reason} />
    </>
  );
}
