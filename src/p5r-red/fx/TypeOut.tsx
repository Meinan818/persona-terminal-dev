/**
 * TypeOut 逐字（AI 流式输出的演示件：成长总结 / 中长期占卜解读 / 记录关键词分析共用）。
 *   <TypeOut text="…" cps={28} onDone={…} />   低动效：直接整段出现。只改文本内容，不做布局动画。
 */
import { useEffect, useState } from 'react';
import { useLowMotion } from '@/p5r-red/lib/prefs';
export function TypeOut({ text, cps = 28, delay = 0, onDone, caret = true, className }: { text: string; cps?: number; delay?: number; onDone?: () => void; caret?: boolean; className?: string }) {
  const low = useLowMotion();
  const [n, setN] = useState(low ? text.length : 0);
  useEffect(() => {
    if (low) { setN(text.length); onDone?.(); return; }
    setN(0); let i = 0, t = 0;
    const start = window.setTimeout(() => { t = window.setInterval(() => { i += 1; setN(i); if (i >= text.length) { clearInterval(t); onDone?.(); } }, 1000 / cps); }, delay);
    return () => { clearTimeout(start); clearInterval(t); };
  }, [text, low]); // eslint-disable-line react-hooks/exhaustive-deps
  const chars = Array.from(text);
  return <span className={className}>{chars.slice(0, n).join('')}{caret && n < chars.length && <i aria-hidden="true" style={{ display: 'inline-block', width: '.5em', borderBottom: '2px solid currentColor', marginLeft: 1 }} />}</span>;
}
