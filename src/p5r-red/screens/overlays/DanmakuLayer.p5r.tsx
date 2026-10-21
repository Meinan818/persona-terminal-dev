/**
 * 弹幕层 DanmakuLayer（真实 src/components/danmaku/DanmakuLayer.tsx：BIG DEAL 通关演出、命运抽签抽屉背景飘弹幕）。
 * 迁移自 v3 overlays/a.js §13 openDanmakuLayer：官方种子 + 已过审投稿横向飘过（CSS translateX 合成器驱动）；
 * 云端条目（虚线框，id 非空）长按 1.5s（真实时长）→ 定格 → 跟随小胶囊「⚑ 反馈并隐藏」→ 点了立刻消失 +「已反馈」；点别处恢复飘动。
 *   ?state=hold   直达「长按定格 + 反馈胶囊」态
 * 「写一句鼓励」→ openOverlay('actions-danmaku-compose')（DanmakuCompose 归 pkg4）。
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Layer, P5OaCollage, collageSlam } from '@/p5r-red/kit/P5Layer';
import { P5Button } from '@/p5r-red/kit/P5Button';
import { useLongPress } from '@/p5r-red/kit/useLongPress';
import { P5BgSVG } from '@/p5r-red/fx/bg';
import { useWide } from '@/p5r-red/lib/layout';
import { openOverlay } from '@/p5r-red/shell/shellBus';

const SEEDS = ['我也是这么过来的，加油', '第一步真是又难又轻松，加油啊', '希望我们都能更加勇敢', '慢一点也是在往前', '你不是一个人', '完成比完美重要', '一步一步看来吧', '彼此加油吧'];
interface Item { id: string; text: string }

function Line({ it, i, held, onHold }: { it: Item; i: number; held: boolean; onHold: (el: HTMLElement) => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  const lp = useLongPress(() => ref.current && onHold(ref.current), 1500);
  return (
    <span ref={ref} className={`oa-dml-i ${it.id ? 'user' : ''}`} data-id={it.id} {...(it.id ? lp.handlers : {})}
      style={{ top: `${16 + i * 14}%`, ['--dur' as string]: `${12 + i * 4}s`, ['--del' as string]: `${-i * 2.5}s`, animationPlayState: held ? 'paused' : undefined }}
      {...(it.id ? { 'aria-label': `弹幕：${it.text}（长按可反馈）` } : { 'aria-hidden': true })}>{it.text}</span>
  );
}

export default function DanmakuLayer({ open, onClose, params }: OverlayProps) {
  const wide = useWide();
  const items = useMemo<Item[]>(() => { const pick = SEEDS.slice(0, 3).map((t, k) => ({ id: k === 1 ? 'u' + k : '', text: t })); pick.push({ id: 'u9', text: '就在今天！就在今天！' }); return pick; }, []);
  const [hidden, setHidden] = useState<string[]>([]);
  const [hold, setHold] = useState<{ id: string; x: number; y: number } | null>(null);
  const [fb, setFb] = useState(false);
  const c = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { if (open && c.current) collageSlam(c.current.querySelectorAll('.oa-ct'), 45); }, [open]);
  useEffect(() => {
    if (!open || params?.get('state') !== 'hold') return;
    const t = setTimeout(() => { const el = document.querySelector<HTMLElement>('.oa-dml-i.user'); if (el) grab(el); }, 600);
    return () => clearTimeout(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!fb) return; const t = setTimeout(() => setFb(false), 1800); return () => clearTimeout(t); }, [fb]);
  const grab = (el: HTMLElement) => { const r = el.getBoundingClientRect(); setHold({ id: el.dataset.id || '', x: Math.min(Math.max(r.left + r.width / 2, 86), innerWidth - 86), y: Math.max(r.top, 60) - 46 }); };
  return (
    <P5Layer open={open} onClose={onClose} cls="oa-dml" z={880} onBackdrop={() => {}}>
      <div className="oa-stage"><P5BgSVG seed={44} wide={wide} /></div>
      <div className="oa-dml-lines">{items.filter((it) => !hidden.includes(it.id || '#' + it.text)).map((it, i) => <Line key={it.id || it.text} it={it} i={i} held={hold?.id === it.id && !!it.id} onHold={grab} />)}</div>
      <div className="oa-dml-c" ref={c}>
        <P5OaCollage text="BIG DEAL" size={32} />
        <p className="oa-note">DanmakuLayer：官方种子 + 已过审投稿飘过；长按带 id 的用户弹幕（虚线框）1.5 秒 →「反馈并隐藏」。</p>
        <div className="oa-row"><P5Button seed={105} onClick={() => openOverlay('actions-danmaku-compose')}>写一句鼓励</P5Button><P5Button tone="ink" seed={106} onClick={onClose}>关闭</P5Button></div>
      </div>
      {hold && (
        <div className="oa-dml-hold">
          <i className="oa-dml-catch" onPointerDown={() => setHold(null)} />
          <button type="button" className="oa-dml-cap" style={{ left: hold.x, top: hold.y }} onClick={() => { setHidden((h) => [...h, hold.id]); setHold(null); setFb(true); }}>
            <svg viewBox="0 0 12 12" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M2.5 1a.5.5 0 0 1 .5.5V11a.5.5 0 0 1-1 0V1.5a.5.5 0 0 1 .5-.5Z" /><path d="M3.8 1.9 10 3.6 3.8 6.4Z" /></svg>反馈并隐藏
          </button>
        </div>
      )}
      {fb && <span className="oa-dml-toast">已反馈</span>}
    </P5Layer>
  );
}
