/**
 * 宣告卡结算屏 CallingCardCutIn（真实 src/components/callingCard/CallingCardCutIn.tsx，App 顶层）。
 * 视觉 / 版式 / 演出 = v3 d.js openCCCutIn 1:1（parity 2026-10-21 撤回 pkg5 加的 CALLING CARD 眉标、CLEARED/EXPIRED 印章、尘屑、Velvet 落款、黑幕）：
 *   红放射舞台 .od-veil.od-cci → 印章「宣告 · 达成 / 时之至 / 已收」→ 预告信 .od-ccl 从右上旋入 → 黑条台词 → 小字 → 留下记录（纸）/ 收下卡片（红大）。
 * 功能照真实（FIXLIST 宣告卡更正）：三种结算原因；「留下记录」→ 正在落墨… → ✓ 已留下记录；不自动关，点「收下卡片」或 Esc 关闭。
 *   ?variant=cleared（auto_todos）| expired（auto_date，默认 = v3 默认「时之至」）| archived（manual）  ?ledger=1 已留下记录
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { Portal } from '@/p5r-red/kit/Portal';
import { P5Button } from '@/p5r-red/kit/P5Button';
import { P5BgSVG } from '@/p5r-red/fx/bg';
import { slamTiles, panelIn } from '@/p5r-red/fx/motion';
import { sfx } from '@/p5r-red/fx/sfx';
import { useWide } from '@/p5r-red/lib/layout';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import { CCLetter, type CCTexture } from './CallingCardLetter.p5r';
import '../pkg5.p5r.css';

export type CCReason = 'auto_todos' | 'auto_date' | 'manual';
export interface CCCutInCard { id: string; title: string; subtitle?: string; icon?: string; texture?: CCTexture; archiveReason: CCReason; ledgerWritten?: boolean }
const HEAD: Record<CCReason, string> = { auto_date: '宣告 · 时之至', auto_todos: '宣告 · 达成', manual: '宣告 · 已收' };
const HINT: Record<CCReason, string> = { auto_date: '约定的那一日已经到来。', auto_todos: '所有任务已被你跨过。', manual: '收存于档案。' };

export function CallingCardCutIn({ card, onClose, demo }: { card: CCCutInCard | null; onClose: () => void; demo?: { value: CCReason; onPick: (r: CCReason) => void } }) {
  const wide = useWide();
  const v = useRef<HTMLDivElement>(null);
  const [writing, setWriting] = useState(false), [ledgered, setLedgered] = useState(!!card?.ledgerWritten);
  useEffect(() => { setLedgered(!!card?.ledgerWritten); setWriting(false); if (!card) return; sfx('fanfare', 0.55); }, [card?.id, card?.archiveReason]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!card) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); });

  // 演出 = v3 d.js openCCCutIn 原值：卡片从右上旋入 800ms → 印章 700ms 后砸下 → 剪报字 slam → 台词 / 小字 / 按钮 1s 后 panelIn
  useLayoutEffect(() => {
    const el = v.current; if (!el || !card) return;
    if (isLowMotion()) return;
    const a: Animation[] = [];
    a.push(el.querySelector('.od-cci-card')!.animate([{ transform: 'translate(60vw,-50vh) rotate(-50deg) scale(.4)', opacity: 0 }, { transform: 'rotate(-6deg) scale(1.08)', opacity: 1, offset: 0.6 }, { transform: 'rotate(-4deg)', opacity: 1 }], { duration: 800, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' }));
    a.push(el.querySelector('.od-cci-stamp')!.animate([{ transform: 'scale(2.6) rotate(-24deg)', opacity: 0 }, { transform: 'rotate(-8deg)', opacity: 1 }], { duration: 320, delay: 700, easing: 'cubic-bezier(.15,.95,.1,1)', fill: 'backwards' }));
    const stops = [slamTiles(el.querySelectorAll('.od-ccl .ransom img'), 0.03), panelIn(el.querySelectorAll('.od-cci-line, .od-cci-sub, .od-cci-in .sh-acts'), { stagger: 0.1, delay: 1 })];
    return () => { a.forEach((x) => x.cancel()); stops.forEach((s) => s()); };
  }, [card?.id, card?.archiveReason]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => { const el = v.current; if (!el) { onClose(); return; } el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'both' }).onfinish = onClose; };
  const ledger = () => { if (ledgered || writing) return; setWriting(true); setTimeout(() => { setWriting(false); setLedgered(true); }, 900); };
  if (!card) return null;
  const r = card.archiveReason;
  return (
    <Portal>
      <div ref={v} className="od-veil od-cci" role="dialog" aria-modal="true" aria-label={HEAD[card.archiveReason]}>
        <div className="od-bg" aria-hidden="true"><P5BgSVG seed={71} wide={wide} fx={wide ? 800 : 500} fy={360} /></div>
        {/* 版式 = v3 openCCCutIn：印章 → 预告信（od-cci-card 斜 -4°）→ 黑条台词 → 小字 → 留下记录（纸）/ 收下卡片（红大）。真实三种结算原因与「正在落墨… / ✓ 已留下记录」保留 */}
        <div className="od-cci-in" onClick={(e) => e.stopPropagation()}>
          <span className="od-cci-stamp">{HEAD[r]}</span>
          <div className="od-cci-card"><CCLetter title={card.title} line={card.subtitle} texture={card.texture} icon={card.icon || '★'} /></div>
          <p className="od-cci-line">{HINT[r]}</p>
          <small className="od-cci-sub">宣告卡 · {HEAD[r].replace('宣告 · ', '')} · 共 17 天</small>
          <div className="sh-acts">
            <P5Button tone="paper" seed={701} disabled={ledgered || writing} onClick={ledger}>{ledgered ? '✓ 已留下记录' : writing ? '正在落墨…' : '留下记录'}</P5Button>
            <P5Button tone="red" size="lg" seed={702} onClick={close}>收下卡片</P5Button>
          </div>
        </div>
        {demo && (
          <div className="od-demo od-cci-demo" onClick={(e) => e.stopPropagation()}><small>演示态</small>
            {([['auto_date', '时之至'], ['auto_todos', '达成'], ['manual', '已收']] as [CCReason, string][]).map(([k, l]) => <button key={k} type="button" aria-pressed={demo.value === k} onClick={() => demo.onPick(k)}>{l}</button>)}
          </div>
        )}
      </div>
    </Portal>
  );
}

const V2R: Record<string, CCReason> = { cleared: 'auto_todos', expired: 'auto_date', archived: 'manual' };
export default function CallingCardCutInPreview({ open, onClose, params }: OverlayProps) {
  const [r, setR] = useState<CCReason>(V2R[params?.get('variant') ?? 'cleared'] ?? 'auto_todos');
  // 预览卡 = v3 同一张（期末考试全科通过 /「偷走懒惰之心」）
  const card: CCCutInCard | null = open ? { id: `cc-${r}`, title: '期末考试全科通过', subtitle: '偷走懒惰之心', icon: '★', texture: 'lines', archiveReason: r, ledgerWritten: params?.get('ledger') === '1' } : null;
  return <CallingCardCutIn card={card} onClose={onClose} demo={params?.get('demo') === '0' ? undefined : { value: r, onPick: setR }} />;
}
