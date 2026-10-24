/**
 * 愿望进度面板（真实 src/components/wish/WishPanel.tsx）：
 * 「离这个愿望 · 刚上路/起步了/走到一半/看得见了/几乎到了」/「还没评估过距离」；「已完成相关任务 N 次 · 子任务 N/M」；
 * 「✦ 评估一次距离 / ↻ 重新评估距离」（评估中…）；「手动设定」刻度条「你觉得走到哪了？」（0–99，100% 留给「愿望已实现」）；
 * 「现在走到哪了」输入；子任务「完成这一步 / 撤销这一步」、删除子任务、空「还没有子任务——先拆一个够得着的」；
 * 「拆一个够得着的小步…」+「添加」；「✦ AI 拆下一组」（正在拆…）；开关「完成任务后自动重估」；说明「不加点」。
 * ?state=fresh 未评估 + 无子任务；?state=manual 展开手动设定；?state=evaluating 评估中。
 */
import { useEffect, useRef, useState } from 'react';
import type { TodoStep, Wish } from '@real/types';
import type { OverlayProps } from '@pink/registry/types';
import { P3Button, P3ConfigRow, P3Field, P3Gauge, P3Input, P3OnOff, P3Sheet, P3Tag, P3R, slantClip } from '@pink/kit';
import { AIThinking } from '@pink/fx';
import { actionsOps, useActionsData } from '@pink/adapters/pkg2';
import { useAppStore } from '@/store';
import { MiniHead, Ring } from '@pink/screens/pkg2/common';
import { StepList } from '@pink/screens/pkg2/StepList';

const distance = (p: number) => (p >= 90 ? '几乎到了' : p >= 70 ? '看得见了' : p >= 45 ? '走到一半' : p >= 20 ? '起步了' : '刚上路');
const EMPTY_WISH: Wish = { id: '', title: '', status: 'archived', source: 'manual', createdAt: new Date(0) };

export default function WishPanel({ open, onClose, params, wish, onChange }: OverlayProps & { wish?: Wish | null; onChange?: (w: Wish) => void }) {
  const st = params?.get('state');
  const { WISHES, WISH_TIMES } = useActionsData();
  const base = wish ?? (st === 'fresh' ? WISHES[2] : WISHES[0]) ?? EMPTY_WISH;
  const [w, setW] = useState<Wish>(base);
  const [manual, setManual] = useState(st === 'manual');
  const [evalBusy, setEvalBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [auto, setAuto] = useState(true);
  const saveTimer = useRef<number | null>(null);
  const upd = (p: Partial<Wish>) => setW((cur) => {
    const n = { ...cur, ...p };
    onChange?.(n);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      if (!useAppStore.getState().wishes.some((w) => w.id === n.id)) return;
      void actionsOps.saveWish(n).catch(() => setNotice('保存失败，愿望仍保持原值；请重试'));
    }, 300);
    return n;
  });
  const refreshWish = () => {
    const fresh = useAppStore.getState().wishes.find((item) => item.id === w.id);
    if (fresh) setW(fresh);
  };
  const steps = w.steps ?? [];
  const done = steps.filter((s) => s.done).length;
  const times = WISH_TIMES[w.id] ?? 0;
  const evaluated = typeof w.progressPct === 'number';
  const pct = w.progressPct ?? 0;
  const evaluate = () => { setEvalBusy(true); setNotice(null); window.setTimeout(() => { setEvalBusy(false); const np = Math.min(99, pct + (evaluated ? 4 : 12)); setNotice(`${np}%（+${np - pct}）· 你这周多读了两本，节奏回来了`); upd({ progressPct: np, progressSource: 'ai' }); }, 2400); };
  const aiSplit = () => { setAiBusy(true); window.setTimeout(() => { setAiBusy(false); const add: TodoStep[] = [{ id: `a${Date.now()}`, title: '列一张下个月想读的书单', source: 'ai' }, { id: `b${Date.now()}`, title: '周末去旧书店逛一次', source: 'ai' }]; upd({ steps: [...steps, ...add] }); setNotice(`AI 拆了 ${add.length} 条——不合适的直接删`); }, 1800); };
  useEffect(() => { if (open) { setW(base); setNotice(null); setManual(st === 'manual'); if (st === 'evaluating') evaluate(); } }, [open]); // eslint-disable-line
  useEffect(() => () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); }, []);
  return (
    <P3Sheet open={open} onClose={onClose} title={w.title} en="WISH" size="tall">
      <div className="space-y-4">
        <div className="relative">
          <span aria-hidden className="absolute inset-0 translate-x-[6px] translate-y-[6px]" style={{ background: 'var(--p3r-slab-back)', clipPath: slantClip(14) }} />
          <div className="relative flex min-w-0 items-center gap-4 px-5 py-3" style={{ background: P3R.panel, clipPath: slantClip(14) }}>
            <Ring pct={pct} size={76} stroke={6} dim={!evaluated} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 font-heavy text-[18px] leading-tight" style={{ color: P3R.ink }}>{evaluated ? `离这个愿望 · ${distance(pct)}` : '还没评估过距离'}<P3Tag tone="lilac">愿望</P3Tag></div>
              <div className="mt-1 text-[12px]" style={{ color: P3R.grey }}>{times > 0 ? `已完成相关任务 ${times} 次` : '还没有记录挂到这里'}{steps.length > 0 && ` · 子任务 ${done}/${steps.length}`}</div>
              {w.progressSource && evaluated && <div className="mt-0.5 font-cond text-[11px]" style={{ color: P3R.lilacInk }}>{w.progressSource === 'ai' ? 'AI ESTIMATE' : w.progressSource === 'local' ? 'LOCAL · 本地估算' : 'MANUAL'}</div>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <P3Button block tone="ink" busy={evalBusy} busyText="评估中…" onClick={evaluate}>{evaluated ? '↻ 重新评估距离' : '✦ 评估一次距离'}</P3Button>
          <P3Button className="shrink-0 whitespace-nowrap" tone={manual ? 'primary' : 'soft'} onClick={() => setManual((v) => !v)}>手动设定</P3Button>
        </div>
        {evalBusy && <AIThinking label="正在估算你离它还有多远…" sub="读你挂上来的记录和「现在走到哪了」" />}
        {notice && <p className="px-4 py-2 text-[12px] font-black" style={{ background: P3R.cyanFaint, color: P3R.ink, clipPath: slantClip(8) }}>▶ {notice}</p>}
        {manual && (
          <div className="px-4 py-3" style={{ background: 'var(--p3r-row)', clipPath: slantClip(10) }}>
            <div className="flex items-center justify-between text-[13px] font-black" style={{ color: P3R.ink }}><span>你觉得走到哪了？</span></div>
            <div className="mt-1 flex justify-center"><P3Gauge value={pct} min={0} max={99} steps={20} width={220} onChange={(v) => {
              const next = Math.round(v);
              setW((cur) => ({ ...cur, progressPct: next, progressSource: 'manual' }));
              void actionsOps.setWishProgress(w.id, next).then(refreshWish).catch(() => setNotice('进度保存失败，请重试'));
            }} ariaLabel="愿望进度百分比" /></div>
            <p className="mt-1 text-[11px]" style={{ color: P3R.grey }}>100% 留给「愿望已实现」——那一下要你自己按。</p>
          </div>
        )}
        <P3Field label="现在走到哪了" hint="AI 评估会读它"><P3Input placeholder="一句话说说现在的位置…" aria-label="愿望现状" value={w.currentState ?? ''} onChange={(e) => upd({ currentState: e.target.value })} /></P3Field>
        <section className="space-y-2">
          <MiniHead title="子任务" en="STEPS" right={steps.length ? <span className="font-cond text-[13px]" style={{ color: P3R.roseInk }}>{done}/{steps.length}</span> : undefined} />
          {steps.length === 0 ? <p className="py-2 text-center text-[13px]" style={{ color: P3R.grey }}>还没有子任务——先拆一个够得着的</p>
            : <StepList steps={steps} delLabel="删除子任务"
              onToggle={(i) => { const step = steps[i]; if (step) void actionsOps.toggleWishStep(w.id, step.id).then(refreshWish).catch(() => setNotice('子任务更新失败，请重试')); }}
              onDelete={(i) => { const step = steps[i]; if (step) void actionsOps.removeWishStep(w.id, step.id).then(refreshWish).catch(() => setNotice('子任务删除失败，请重试')); }} />}
          <div className="flex min-w-0 gap-2">
            <div className="min-w-0 flex-1"><P3Input placeholder="拆一个够得着的小步…" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="新的子任务" /></div>
            <P3Button disabled={!draft.trim()} onClick={() => { const title = draft.trim(); void actionsOps.addWishStep(w.id, title).then(() => { setDraft(''); refreshWish(); }).catch(() => setNotice('子任务添加失败，请重试')); }}>添加</P3Button>
          </div>
          <P3Button block tone="outline" busy={aiBusy} busyText="正在拆…" onClick={aiSplit}>✦ AI 拆下一组</P3Button>
        </section>
        <P3ConfigRow label="完成任务后自动重估" hint="挂到愿望的记录一落，就重算距离并弹一张卡（作用于所有愿望）"><P3OnOff value={auto} onChange={(v) => { setAuto(v); void actionsOps.updateSettings({ wishAutoEvaluate: v }).catch(() => setNotice('设置保存失败，请重试')); }} ariaLabel="完成任务后自动重估愿望进度" /></P3ConfigRow>
        <p className="text-[12px]" style={{ color: P3R.grey }}>愿望的子任务勾掉<b style={{ color: P3R.ink }}>不加点</b>——它只是把路标出来。要拿点数，去今日任务建一条挂到这个愿望上。</p>
      </div>
    </P3Sheet>
  );
}
