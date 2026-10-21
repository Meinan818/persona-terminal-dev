/**
 * 图鉴 Tab CodexTab（真实 src/components/codex/CodexTab.tsx；P0-11）——成就页第三个 Tab，由 pkg5 Achievements.p5r 自动挂载。
 * 塔罗（大阿卡纳 44 / 小阿卡纳 112，正逆各算一格）⇄ 岁时（年份切换 + 印记）；点牌 → TarotFlipView / 点岁时 → FlipCardView（翻面看小注）。
 * 内容 = v3 overlays/d.js openCodex 逐字迁移，以 inline 模式渲染进页面。?sub=tarot|season
 */
import { useLayoutEffect, useRef } from 'react';
import { INLINE, OD } from '@/p5r-red/screens/pkg4/d4';
import '@/p5r-red/screens/pkg4/pkg4.css';

export default function CodexTab({ params }: { params: URLSearchParams; wide: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const sub = params.get('sub') === 'season' ? 'season' : 'tarot';
  useLayoutEffect(() => { INLINE.host = ref.current; OD.openCodex(sub); INLINE.host = null; }, [sub]);
  return <div ref={ref} className="p4-codex" />;
}
