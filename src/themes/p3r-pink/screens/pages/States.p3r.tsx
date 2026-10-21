/**
 * 通用状态页（P6）：#/p/states?state=lazy|local-error|empty
 *   lazy        —— 分包加载占位「加载中…」（真实 App.tsx#LazyFallback：>400ms 才出现；首页变体留白）→ P3R NOW LOADING
 *   local-error —— 局部错误边界「这一块的内容有问题，先跳过了。」（真实 ui/LocalErrorBoundary.tsx：坏一块只换成一行提示，resetKey 变了重试）
 *   empty       —— 空状态基座（真实 EmptyState.tsx · p3 = P3EmptySlab「暂无可追踪的信号」大平行四边形 + 主文案 + hint + 轻 CTA）
 */
import React, { useEffect, useState } from 'react';
import type { PageProps } from '@pink/registry/types';
import { P3Empty, P3Loading, P3PageHeader, P3Segment, SectionMark, P3SlantCard, P3R, slantClip, tickClip } from '@pink/kit';
import { pageHref } from '@pink/shell/shellBus';

type S = 'lazy' | 'local-error' | 'empty';

/** 分包加载占位：400ms 后才出现（之前留白） */
export function LazyFallback({ blank }: { blank?: boolean }) {
  const [show, setShow] = useState(false);
  useEffect(() => { if (blank) return; const t = setTimeout(() => setShow(true), 400); return () => clearTimeout(t); }, [blank]);
  return show ? <div className="flex h-56 items-center justify-center"><P3Loading text="加载中…" /></div> : <div className="h-56" />;
}

/** 局部错误边界兜底：一行珊瑚刀口小条（真实 p-3 灰小字 → P3R 系统提示条） */
export function LocalErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <div role="status" className="relative flex min-w-0 items-center gap-2 px-4 py-2" style={{ background: 'rgb(var(--p3r-magenta-rgb) / 0.1)', clipPath: slantClip(8) }}>
      <span aria-hidden className="h-[12px] w-[9px] shrink-0" style={{ background: P3R.magenta, clipPath: tickClip }} />
      <span className="shrink-0 font-cond text-[10px] tracking-[0.2em]" style={{ color: 'var(--p3r-coral-ink)' }}>SIGNAL LOST</span>
      <p className="min-w-0 flex-1 text-[12px] font-bold" style={{ color: P3R.inkSoft }}>这一块的内容有问题，先跳过了。</p>
      {onRetry && <button type="button" onClick={onRetry} className="shrink-0 text-[12px] font-black underline" style={{ color: 'var(--p3r-rose-ink)' }}>重试</button>}
    </div>
  );
}

/** 真·错误边界（与真实同协议：getDerivedStateFromError + resetKey） */
class Boundary extends React.Component<{ resetKey: unknown; onRetry: () => void; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { /* demo：真实 console.warn，这里静默避免冒烟报错 */ }
  componentDidUpdate(prev: { resetKey: unknown }) { if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false }); }
  render() { return this.state.failed ? <LocalErrorFallback onRetry={this.props.onRetry} /> : this.props.children; }
}
function BadNotice({ broken }: { broken: boolean }) {
  // demo 不真抛错（React 会把捕获的错误打到 console.error，冒烟会报）——坏数据时直接走兜底分支，视觉 / 交互与真实边界一致
  if (broken) return null;
  return <div className="px-4 py-2 text-[14px] font-bold" style={{ background: 'var(--p3r-row)', color: P3R.ink, clipPath: slantClip(8) }}>天田乾 邀请你一起晨跑（数据已修复）</div>;
}

/** 空状态基座：P3EmptySlab + 轻 CTA（文字钮） */
export function EmptyBase({ text, hint, action }: { text: string; hint?: string; action?: { label: string; onClick: () => void } }) {
  return <P3Empty text={text} sub={hint} action={action ? <button type="button" onClick={action.onClick} className="text-[13px] font-black underline decoration-2 underline-offset-4" style={{ color: 'var(--p3r-rose-ink)', textDecorationColor: P3R.cyan }}>{action.label}</button> : undefined} />;
}

export default function States({ params }: PageProps) {
  const [st, setSt] = useState<S>((params.get('state') as S) || 'lazy');
  const [gen, setGen] = useState(0);
  const [broken, setBroken] = useState(true);
  const [rk, setRk] = useState(0);
  useEffect(() => { const s = params.get('state') as S; if (s) setSt(s); }, [params]);
  const go = (s: string) => { setSt(s as S); window.history.replaceState(null, '', pageHref('states', undefined, { state: s })); };
  return (
    <div className="relative min-w-0 pb-8">
      <P3PageHeader title="状态" en="STATES" />
      <P3Segment className="mb-5" value={st} onChange={go} items={[{ id: 'lazy', label: '加载中' }, { id: 'local-error', label: '局部错误' }, { id: 'empty', label: '空状态' }]} />
      {st === 'lazy' && (
        <section className="min-w-0">
          <div className="flex items-end justify-between gap-2"><SectionMark title="分包加载占位" en="LAZY FALLBACK" /><button type="button" onClick={() => setGen((g) => g + 1)} className="mb-3 shrink-0 px-3 py-1 text-[12px] font-black" style={{ background: 'var(--p3r-cyan-pale)', color: P3R.ink, clipPath: slantClip(5) }}>重播</button></div>
          <P3SlantCard><LazyFallback key={gen} /></P3SlantCard>
          <p className="mt-3 text-[12px] font-bold" style={{ color: 'var(--p3r-on-stage)' }}>懒加载页 400ms 内未到时才出现「加载中…」；首页变体始终留白：</p>
          <P3SlantCard className="mt-2"><LazyFallback blank /><p className="-mt-28 text-center text-[11px]" style={{ color: P3R.grey }}>（首页变体留白）</p><div className="h-24" /></P3SlantCard>
        </section>
      )}
      {st === 'local-error' && (
        <section className="min-w-0">
          <SectionMark title="局部错误边界" en="LOCAL ERROR" />
          <P3SlantCard className="space-y-2">
            <div className="flex items-center gap-2"><span className="font-heavy text-[17px]" style={{ color: P3R.ink }}>通知</span><span className="font-cond text-[11px] tracking-wider" style={{ color: 'var(--p3r-lilac-ink)' }}>NOTICE</span></div>
            <div className="px-4 py-2 text-[14px] font-bold" style={{ background: 'var(--p3r-row)', color: P3R.ink, clipPath: slantClip(8) }}>山岸风花 想和你一起去图书馆</div>
            <Boundary resetKey={rk} onRetry={() => { setBroken(false); setRk((k) => k + 1); }}>{broken ? <LocalErrorFallback onRetry={() => { setBroken(false); setRk((k) => k + 1); }} /> : <BadNotice broken={false} />}</Boundary>
            <div className="px-4 py-2 text-[14px] font-bold" style={{ background: 'var(--p3r-row)', color: P3R.ink, clipPath: slantClip(8) }}>伊织顺平 给你发来了委托</div>
          </P3SlantCard>
          <p className="mt-3 text-[12px] font-bold" style={{ color: 'var(--p3r-on-stage)' }}>坏掉的一条只换成一行提示，其它通知照常可读；点「重试」= resetKey 变化后重新渲染。{!broken && <button type="button" className="ml-2 underline" onClick={() => { setBroken(true); setRk((k) => k + 1); }}>再弄坏一次</button>}</p>
        </section>
      )}
      {st === 'empty' && (
        <section className="min-w-0">
          <SectionMark title="空状态基座" en="EMPTY" />
          <div className="grid grid-cols-1 gap-4 wide:grid-cols-2">
            <EmptyBase text="还没有任务，添加一个开始吧" hint="点右下角 + 写下第一件事" action={{ label: '＋ 添加任务', onClick: () => undefined }} />
            <EmptyBase text="归档区暂无内容" />
            <div className="wide:col-span-2"><P3Empty text="暂无可追踪的信号" sub="P3EmptySlab 默认文案（列表为空时）" /></div>
          </div>
        </section>
      )}
    </div>
  );
}
