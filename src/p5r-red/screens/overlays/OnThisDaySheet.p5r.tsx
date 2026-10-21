/**
 * 「一年前的今天」OnThisDaySheet（真实 src/components/dashboard/OnThisDaySheet.tsx，第 6 轮）：今日仪式轮播里的一张小卡（OnThisDaySlide，
 * 首页 RitualSlabP5 + 沙漏 OnThisDayGlyph）点开后的整天回看抽屉。结构抄真实：
 *   顶卡：「2025年10月21日 · 星期二」+「那天记了 N 条 / 那时连续 N 天 / 抽到 牌名 · 正位|逆位」
 *   列表：每条记录（时间 / ★重要 / 内容 / 属性 +N 签 / 配图缩略）
 *   脚注：「从第一条记录起已经过了 N 天。」   底部主按钮「去记录页看这一天 →」（setActivitiesJumpDate → 记录页）
 * 视觉：v3 P5.sheet 底部抽屉（红闸门 + 撕纸）+ 墨条 .q-row + 红签 .tag（v3 overlays/d.js openOnThisDay 语汇）。
 *   ?state=notarot（那天没抽牌）| nostreak（那时没有连续）| images（第一条带 2 张配图，默认已带）
 */
import { useEffect, useRef } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Sheet } from '@/p5r-red/kit/P5Sheet';
import { P5Button } from '@/p5r-red/kit/P5Button';
import { panelIn } from '@/p5r-red/fx/motion';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import { navigate } from '@/p5r-red/shell/shellBus';
import { ATTR, ATTR_ORDER, type AttrId } from '@/p5r-red/mock/data';
import { fakeImg } from './ImageCropDialog.p5r';
import './OnThisDaySheet.p5r.css';

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
interface OtdItem { id: string; time: string; description: string; important?: boolean; points: Partial<Record<AttrId, number>>; images?: number }
export interface OtdView { date: Date; total: number; streakThen: number; daysSince: number; tarot: { name: string; reversed: boolean } | null; items: OtdItem[] }
const lastYear = () => { const d = new Date(); return new Date(d.getFullYear() - 1, d.getMonth(), d.getDate()); };
/** demo 假数据（字段对齐真实 OnThisDayView：items / total / streakThen / daysSince + 当日 dailyDivinations） */
export const OTD_VIEW: OtdView = {
  date: lastYear(), total: 3, streakThen: 9, daysSince: 412, tarot: { name: '星星', reversed: false },
  items: [
    { id: 'o1', time: '09:12', description: '和室友去看了海', important: true, points: { kindness: 2, charm: 1 }, images: 2 },
    { id: 'o2', time: '18:40', description: '第一次跑完 10 公里', points: { guts: 3 } },
    { id: 'o3', time: '23:05', description: '读完《小王子》', points: { knowledge: 2 } },
  ],
};
/** 卡片副标题：「记了 3 条 · 和室友去看了海」（真实 onThisDaySub，首条超 18 字截断加 …） */
export function onThisDaySub(v: OtdView): string { const first = (v.items[0]?.description || '').replace(/\s+/g, ' ').trim(); return `记了 ${v.total} 条 · ${first.length > 18 ? `${first.slice(0, 18)}…` : first}`; }
export const onThisDayLabel = (d: Date) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 · ${WEEKDAYS[d.getDay()]}`;
/** 沙漏小图（真实 OnThisDayGlyph，P5 仪式卡图标位） */
export const OnThisDayGlyph = ({ color = 'currentColor', size = 22 }: { color?: string; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <path d="M6 3h12v2.2c0 2.4-1.6 4.5-3.6 5.6L13 12l1.4 1.2c2 1.1 3.6 3.2 3.6 5.6V21H6v-2.2c0-2.4 1.6-4.5 3.6-5.6L11 12 9.6 10.8C7.6 9.7 6 7.6 6 5.2V3Zm2 2v.2c0 1.6 1.1 3.1 2.6 3.9l1.4.8 1.4-.8C14.9 8.3 16 6.8 16 5.2V5H8Zm4 9.1-1.4.8C9.1 15.7 8 17.2 8 18.8v.2h8v-.2c0-1.6-1.1-3.1-2.6-3.9L12 14.1Z" fill={color} />
  </svg>
);

export default function OnThisDaySheet({ open, onClose, params }: OverlayProps) {
  const st = params?.get('state');
  const v: OtdView = { ...OTD_VIEW, tarot: st === 'notarot' ? null : OTD_VIEW.tarot, streakThen: st === 'nostreak' ? 0 : OTD_VIEW.streakThen };
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open && body.current && !isLowMotion()) { const b = body.current; const t = setTimeout(() => panelIn(b.querySelectorAll('.otd5-row'), { from: 'right', stagger: 0.04 }), 160); return () => clearTimeout(t); } }, [open]);
  const goRecords = () => { onClose(); navigate('actions', { via: 'tear', tab: 'activities', params: { jump: `${v.date.getFullYear()}-${String(v.date.getMonth() + 1).padStart(2, '0')}-${String(v.date.getDate()).padStart(2, '0')}` } }); };
  return (
    <P5Sheet open={open} onClose={onClose} title="一年前的今天" seed={55} className="otd5">
      <div className="otd5-body" ref={body}>
        <div className="otd5-head">
          <b>{onThisDayLabel(v.date)}</b>
          <div className="otd5-meta">
            <span>那天记了 {v.items.length} 条</span>
            {v.streakThen > 0 && <span>那时连续 {v.streakThen} 天</span>}
            {v.tarot && <span>抽到 {v.tarot.name} · {v.tarot.reversed ? '逆位' : '正位'}</span>}
          </div>
        </div>
        <div className="otd5-list">
          {v.items.map((a) => (
            <div key={a.id} className="otd5-row">
              <span className="otd5-t">{a.time}</span>
              <div className="otd5-m">
                <p>{a.important && <i className="otd5-imp">★</i>}{a.description}</p>
                {Object.keys(a.points).length > 0 && <div className="otd5-pts">{ATTR_ORDER.filter((k) => (a.points[k] ?? 0) > 0).map((k) => <span key={k} className="tag">{ATTR[k].name} +{a.points[k]}</span>)}</div>}
                {!!a.images && <div className="otd5-th">{Array.from({ length: a.images }, (_, i) => <span key={i}><img src={fakeImg(i, 160, 160)} alt="" draggable={false} loading="lazy" /></span>)}</div>}
              </div>
            </div>
          ))}
        </div>
        <p className="otd5-foot">从第一条记录起已经过了 {v.daysSince} 天。</p>
        <P5Button size="lg" seed={591} className="otd5-go" onClick={goRecords}>去记录页看这一天 →</P5Button>
      </div>
    </P5Sheet>
  );
}
