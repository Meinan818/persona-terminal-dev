/**
 * 岁时小签组件（SeasonStampBadge 的 p5 渲染件，单独成文件以免首页 ⇄ 预览循环引用）。说明见 SeasonStampBadge.p5r.tsx。
 */
import { useEffect, useRef, useState } from 'react';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import './SeasonStampBadge.p5r.css';

export const SEASON_NOTE: Record<string, string> = {
  秋分: '昼夜再度平分，从今天起夜长了。', 寒露: '露水带了寒意，夜里别再穿凉鞋。', 霜降: '早晚添衣，霜要来了。', 立冬: '冬天开始，把厚被子翻出来。',
  小雪: '开始飘雪的时节，南方是冷雨。', 大雪: '雪大了，路滑，慢一点。', 冬至: '一年最长的夜，从今天起白天一天天回来。', 元旦: '新的一年，先把今天记下来。',
};

export function SeasonStampBadgeP5({ name, collected = false, align = 'left', pop = 'below', className = '', autoOpen = false }: { name: string; collected?: boolean; align?: 'left' | 'right'; pop?: 'above' | 'below'; className?: string; autoOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  const bub = useRef<HTMLSpanElement>(null);
  const note = SEASON_NOTE[name] ?? '';
  useEffect(() => { if (!autoOpen) return; const t = setTimeout(() => setOpen(true), 600); return () => clearTimeout(t); }, [autoOpen]);
  useEffect(() => { if (!open) return; const t = setTimeout(() => setOpen(false), 4500); return () => clearTimeout(t); }, [open]);
  useEffect(() => { const b = bub.current; if (!open || !b || isLowMotion()) return; b.animate([{ opacity: 0, transform: `translateY(${pop === 'above' ? 6 : -6}px) rotate(-2deg)` }, { opacity: 1, transform: 'rotate(-1deg)' }], { duration: 200, easing: 'cubic-bezier(.2,1.2,.4,1)' }); }, [open, pop]);
  return (
    <span className={`ssb5 ${className}`.trim()}>
      <button type="button" className={`ssb5-chip${collected ? ' on' : ''}`} onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label={`${name}：${note}${collected ? '（已收进岁时册）' : ''}`} aria-expanded={open}>{name}</button>
      {open && (
        <span ref={bub} role="status" className={`ssb5-pop ${pop} ${align}`}>
          <b>{name}</b><span className="ssb5-dot">·</span>{note}
          <span className="ssb5-sub">{collected ? '岁时册 · 已收录' : '今天记一条，就收进岁时册'}</span>
        </span>
      )}
    </span>
  );
}

