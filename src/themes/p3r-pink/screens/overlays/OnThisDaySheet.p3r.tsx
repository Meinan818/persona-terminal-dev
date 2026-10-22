/**
 * OnThisDaySheet.p3r —— 当年今日抽屉（真实 src/components/dashboard/OnThisDaySheet.tsx → SheetModal，p3 频道 = 顶缘单斜底部抽屉 / 宽屏居中卡）。
 *   标题「一年前的今天」；日期大字；「那天记了 N 条 · 那时连续 N 天 · 抽到 X · 正位/逆位」；当天记录列表（时间 · ★重要 · 文本 · 属性 +N 标签）；
 *   「从第一条记录起已经过了 N 天。」；底部主按钮「去记录页看这一天 →」（→ 行动·记录，跳到那一天）。下滑 / 点遮罩关闭。
 * 演示：?state=loading 先显示塔罗读取中（真实 db 查询）；?tarot=0 那天没抽塔罗。
 */
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import { P3Sheet, P3Button, P3R, slantClip, P3Tag } from '@pink/kit';
import { navigate } from '@pink/shell/shellBus';
import { ATTR_NAMES, MOCK_ON_THIS_DAY, onThisDayLabel } from '@pink/mock/pkg1';

export const OnThisDaySheetP3 = ({ isOpen, onClose, tarot = true, loading = false }: { isOpen: boolean; onClose: () => void; tarot?: boolean; loading?: boolean }) => {
  const v = MOCK_ON_THIS_DAY;
  const [tarotReady, setTarotReady] = useState(!loading);
  useEffect(() => { if (!isOpen || tarotReady) return; const t = window.setTimeout(() => setTarotReady(true), 900); return () => clearTimeout(t); }, [isOpen, tarotReady]);
  const goRecords = () => { onClose(); navigate('actions', 'activities', { params: { date: `${v.date.getFullYear()}-${String(v.date.getMonth() + 1).padStart(2, '0')}-${String(v.date.getDate()).padStart(2, '0')}` } }); };
  return (
    <P3Sheet open={isOpen} onClose={onClose} title="一年前的今天" en="ON THIS DAY" swipeToClose
      footer={<P3Button block size="lg" corner onClick={goRecords}>去记录页看这一天 →</P3Button>}>
      <div className="space-y-4 pb-2">
        <div className="relative px-4 py-3.5" style={{ background: 'rgb(var(--p3r-wash) / 0.7)', clipPath: slantClip(10) }}>
          <div className="font-heavy text-[19px] leading-tight" style={{ color: P3R.ink }}>{onThisDayLabel(v.date)}</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-semibold" style={{ color: P3R.inkSoft }}>
            <span>那天记了 {v.items.length} 条</span>
            {v.streakThen > 0 && <span>那时连续 {v.streakThen} 天</span>}
            {tarot && (tarotReady ? <span>抽到 {v.tarot.name} · {v.tarot.orientation === 'reversed' ? '逆位' : '正位'}</span> : <span className="pk-shimmer-text" style={{ color: P3R.grey }}>读取当日塔罗…</span>)}
          </div>
        </div>
        <div className="space-y-2">
          {v.items.map((a) => (
            <div key={a.id} className="relative px-3.5 py-3" style={{ background: P3R.panel, clipPath: slantClip(8), boxShadow: 'inset 0 0 0 1px rgb(var(--p3r-cyan-rgb) / 0.25)' }}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 font-cond text-[13px] tabular" style={{ color: P3R.grey }}>{a.time}</span>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap break-words text-[14px] font-semibold leading-snug" style={{ color: P3R.ink }}>
                    {a.important && <span className="mr-1" style={{ color: 'var(--p3r-gold)' }}>★</span>}{a.text}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">{a.pts.map((p) => <P3Tag key={p.attr} tone="soft">{ATTR_NAMES[p.attr]} +{p.n}</P3Tag>)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="px-1 text-[11px]" style={{ color: P3R.grey }}>从第一条记录起已经过了 {v.daysSince} 天。</p>
      </div>
    </P3Sheet>
  );
};

export default function OnThisDayOverlay({ open, onClose, params }: OverlayProps) {
  return <OnThisDaySheetP3 isOpen={open} onClose={onClose} tarot={params?.get('tarot') !== '0'} loading={params?.get('state') === 'loading'} />;
}
