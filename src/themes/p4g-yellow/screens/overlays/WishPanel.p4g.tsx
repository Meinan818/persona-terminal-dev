/**
 * 愿望进度面板（真实 src/components/wish/WishPanel.tsx）：
 * 「离这个愿望 · 刚上路/起步了/走到一半/看得见了/几乎到了」/「还没评估过距离」；「已完成相关任务 N 次 · 子任务 N/M」；
 * 「✦ 评估一次距离 / ↻ 重新评估距离」（评估中…）；手动设定 滑杆「你觉得走到哪了？」（0–99，100% 留给「愿望已实现」）；
 * 「现在走到哪了（AI 评估会读它）」输入；子任务「完成这一步/撤销这一步」、删除子任务、空「还没有子任务——先拆一个够得着的」；
 * 「拆一个够得着的小步…」+「添加」；「✦ AI 拆下一组」（正在拆…）；开关「完成任务后自动重估」；说明「不加点」。
 */
import { useEffect, useRef, useState } from 'react';
import type { TodoStep, Wish } from '@real/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Input, P4Sheet, P4Slider, P4Switch, IconCheck, IconTrash } from '@yellow/kit';
import { actionsOps, useActionsData } from '@yellow/adapters/pkg2';
import { useAppStore } from '@/store';
import { Ring } from '@yellow/screens/pkg2/common';
import { cx } from '@yellow/lib/cx';

const distance = (p: number) => (p >= 90 ? '几乎到了' : p >= 70 ? '看得见了' : p >= 45 ? '走到一半' : p >= 20 ? '起步了' : '刚上路');
const EMPTY_WISH: Wish = { id: '', title: '', status: 'archived', source: 'manual', createdAt: new Date(0) };

export default function WishPanel({ open, onClose, wish, onChange }: OverlayProps & { wish?: Wish | null; onChange?: (w: Wish) => void }) {
  const { WISHES, WISH_TIMES } = useActionsData();
  const base = wish ?? WISHES[0] ?? EMPTY_WISH;
  const [w, setW] = useState<Wish>(base);
  const [manual, setManual] = useState(false);
  const [evalBusy, setEvalBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [auto, setAuto] = useState(true);
  const saveTimer = useRef<number | null>(null);
  useEffect(() => { if (open) { setW(base); setNotice(null); setManual(false); } }, [open]); // eslint-disable-line
  useEffect(() => () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); }, []);
  const upd = (p: Partial<Wish>) => {
    const n = { ...w, ...p };
    setW(n);
    onChange?.(n);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      if (!useAppStore.getState().wishes.some((item) => item.id === n.id)) return;
      void actionsOps.saveWish(n).catch(() => setNotice('保存失败，愿望仍保持原值；请重试'));
    }, 300);
  };
  const refreshWish = () => {
    const fresh = useAppStore.getState().wishes.find((item) => item.id === w.id);
    if (fresh) setW(fresh);
  };
  const steps = w.steps ?? [];
  const done = steps.filter((s) => s.done).length;
  const times = WISH_TIMES[w.id] ?? 0;
  const evaluated = typeof w.progressPct === 'number';
  const pct = w.progressPct ?? 0;
  const evaluate = () => { setEvalBusy(true); setTimeout(() => { setEvalBusy(false); const np = Math.min(99, pct + 4); setNotice(`${np}%（+${np - pct}）`); upd({ progressPct: np, progressSource: 'ai' }); }, 900); };
  const aiSplit = () => { setAiBusy(true); setTimeout(() => { setAiBusy(false); const add: TodoStep[] = [{ id: `a${Date.now()}`, title: '列一张下个月想读的书单', source: 'ai' }, { id: `b${Date.now()}`, title: '周末去旧书店逛一次', source: 'ai' }]; upd({ steps: [...steps, ...add] }); setNotice(`AI 拆了 ${add.length} 条——不合适的直接删`); }, 900); };
  return (
    <P4Sheet open={open} onClose={onClose} title={w.title} en="WISH PROGRESS" size="tall">
      <div className="space-y-4">
        <div className="flex min-w-0 items-center gap-4 rounded-sm border-3 border-p4g-black bg-p4g-yellow p-3 text-p4g-black shadow-hard">
          <Ring pct={pct} size={76} stroke={9} dim={!evaluated} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 font-display text-lead font-bold">{evaluated ? `离这个愿望 · ${distance(pct)}` : '还没评估过距离'}<span className="rounded-xs bg-p4g-black px-1.5 text-2xs text-p4g-yellow">愿望</span></div>
            <div className="mt-0.5 text-meta">{times > 0 ? `已完成相关任务 ${times} 次` : '还没有记录挂到这里'}{steps.length > 0 && ` · 子任务 ${done}/${steps.length}`}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <P4Button block variant="black" disabled={evalBusy} onClick={evaluate}>{evalBusy ? '评估中…' : evaluated ? '↻ 重新评估距离' : '✦ 评估一次距离'}</P4Button>
          <P4Button className="shrink-0 whitespace-nowrap px-4" variant={manual ? 'primary' : 'secondary'} onClick={() => setManual((v) => !v)} aria-pressed={manual}>手动设定</P4Button>
        </div>
        {notice && <p className="rounded-sm bg-p4g-msg px-3 py-1.5 text-meta font-bold text-[color:var(--p4g-msg-ink)]">▶ {notice}</p>}
        {manual && (
          <div className="rounded-sm border-3 border-p4g-line bg-p4g-surface p-3">
            <div className="flex items-center justify-between font-display text-meta font-bold text-p4g-ink"><span>你觉得走到哪了？</span><span className="p4g-num text-h3">{pct}%</span></div>
            <P4Slider value={pct} min={0} max={99} onChange={(v) => {
              setW((cur) => ({ ...cur, progressPct: v, progressSource: 'manual' }));
              void actionsOps.setWishProgress(w.id, v).then(refreshWish).catch(() => setNotice('进度保存失败，请重试'));
            }} label="愿望进度百分比" />
            <p className="mt-1 text-cap text-p4g-ink-soft">100% 留给「愿望已实现」——那一下要你自己按。</p>
          </div>
        )}
        <P4Input label="现在走到哪了（AI 评估会读它）" placeholder="一句话说说现在的位置…" aria-label="愿望现状" value={w.currentState ?? ''} onChange={(e) => upd({ currentState: e.target.value })} />
        <section>
          <div className="mb-1.5 inline-block bg-p4g-black px-2 py-0.5 font-display text-meta font-bold text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black">子任务</div>
          {steps.length === 0 ? <p className="py-2 text-center text-meta text-p4g-ink-soft">还没有子任务——先拆一个够得着的</p> : (
            <div className="overflow-hidden rounded-sm border-3 border-p4g-black night:border-p4g-yellow">
              {steps.map((s, i) => (
                <div key={s.id} className={cx('flex min-w-0 items-center gap-2 border-b-2 border-[color:var(--p4g-separator-a)] px-2.5 py-2', s.done ? 'bg-p4g-surface-2' : 'bg-p4g-surface')}>
                  <button type="button" aria-label={s.done ? '撤销这一步' : '完成这一步'} onClick={() => void actionsOps.toggleWishStep(w.id, s.id).then(refreshWish).catch(() => setNotice('子任务更新失败，请重试'))}
                    className={cx('flex h-7 w-7 shrink-0 items-center justify-center border-3 border-p4g-black', s.done ? 'bg-p4g-orange text-p4g-black' : 'bg-white text-transparent')}><IconCheck size={13} /></button>
                  <span className={cx('min-w-0 flex-1 truncate text-body font-bold text-p4g-ink', s.done && 'line-through opacity-50')}>{s.title}</span>
                  {s.source === 'ai' && <span className="shrink-0 text-2xs font-bold text-p4g-ink-soft">AI</span>}
                  <button type="button" aria-label="删除子任务" onClick={() => void actionsOps.removeWishStep(w.id, s.id).then(refreshWish).catch(() => setNotice('子任务删除失败，请重试'))} className="flex h-8 w-8 shrink-0 items-center justify-center text-p4g-ink-soft"><IconTrash size={14} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex min-w-0 gap-2">
            <P4Input wrapClassName="min-w-0 flex-1" placeholder="拆一个够得着的小步…" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="新的子任务" />
            <P4Button disabled={!draft.trim()} onClick={() => { const title = draft.trim(); void actionsOps.addWishStep(w.id, title).then(() => { setDraft(''); refreshWish(); }).catch(() => setNotice('子任务添加失败，请重试')); }}>添加</P4Button>
          </div>
          <P4Button block variant="secondary" className="mt-2" disabled={aiBusy} onClick={aiSplit}>{aiBusy ? '正在拆…' : '✦ AI 拆下一组'}</P4Button>
        </section>
        <div className="flex items-start gap-3 rounded-sm border-3 border-p4g-line bg-p4g-surface p-3">
          <div className="min-w-0 flex-1"><div className="font-display text-meta font-bold text-p4g-ink">完成任务后自动重估</div><div className="text-cap text-p4g-ink-soft">挂到愿望的记录一落，就重算距离并弹一张卡（作用于所有愿望）。</div></div>
          <P4Switch checked={auto} onChange={(v) => { setAuto(v); void actionsOps.setWishAutoEvaluate(v).catch(() => setNotice('设置保存失败，请重试')); }} aria-label="完成任务后自动重估愿望进度" size="sm" />
        </div>
        <p className="text-cap text-p4g-ink-soft">愿望的子任务勾掉<b className="text-p4g-ink">不加点</b>——它只是把路标出来。要拿点数，去今日任务建一条挂到这个愿望上。</p>
      </div>
    </P4Sheet>
  );
}
