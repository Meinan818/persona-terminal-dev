/**
 * 空 / 错 / 载入状态。
 *   <P5Empty text hint action onAction seed icon/>   迁移自 overlays/a.js emptyHTML（EmptyState 4 处变体的基座）
 *   <P5Loading label/>                                 简易载入（LazyFallback 的完整版由 A 组移植）
 *   <P5ErrorBlock title detail onRetry/>               局部报错块（LocalErrorBoundary 的完整版由 A 组移植）
 */
import type { ReactNode } from 'react';
import { P5OaRough, P5OaStar } from './P5Layer';
import { P5Sil } from '@/p5r-red/fx/sil';

export function P5Empty({ icon, text, hint, action, onAction, seed = 1 }: { icon?: ReactNode; text: string; hint?: string; action?: string; onAction?: () => void; seed?: number }) {
  return (
    <div className="oa-empty" style={{ ['--r' as string]: `${seed % 2 ? -1.6 : 1.2}deg` }}>
      <P5OaRough seed={900 + seed} face="var(--p5r-paper)" frame="#111" jag={5} />
      <span className="oa-empty-ic" aria-hidden="true">{icon ? <em>{icon}</em> : <P5Sil name="cat" style={{ height: 54, width: 'auto' }} fill="#9b9791" rim="#111" rw={4} />}</span>
      <div className="oa-empty-t"><p>{text}</p>{hint && <small>{hint}</small>}{action && <button className="oa-empty-a" onClick={onAction}>{action}</button>}</div>
      <P5OaStar size={18} fill="var(--red)" className="oa-empty-s1" stroke="#111" sw={8} rot={-12} />
    </div>
  );
}

export function P5Loading({ label = '加载中…' }: { label?: string }) {
  return <div className="oa-empty-s" style={{ color: 'var(--p5r-paper)' }}><b>{label}</b></div>;
}

export function P5ErrorBlock({ title = '这里出错了', detail, onRetry }: { title?: string; detail?: string; onRetry?: () => void }) {
  return (
    <div className="oa-empty" style={{ ['--r' as string]: '-1deg' }}>
      <P5OaRough seed={913} face="var(--p5r-paper)" frame="#111" jag={5} />
      <span className="oa-empty-ic" aria-hidden="true"><em>⚠️</em></span>
      <div className="oa-empty-t"><p>{title}</p>{detail && <small>{detail}</small>}{onRetry && <button className="oa-empty-a" onClick={onRetry}>重试</button>}</div>
    </div>
  );
}
