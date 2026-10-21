/**
 * 通用状态页（P6）：#/p/states?state=lazy|local-error|empty
 *   lazy        —— 分包加载占位「加载中…」（真实 App.tsx#LazyFallback：>400ms 才出现；首页变体留白）
 *   local-error —— 局部错误边界「这一块的内容有问题，先跳过了。」（真实 ui/LocalErrorBoundary.tsx）
 *   empty       —— 空状态基座（真实 EmptyState.tsx + Todos.tsx#P4EmptyBloom）：插画 + 文案 + 提示 + 轻 CTA
 */
import { useEffect, useState } from 'react';
import type { PageProps } from '@yellow/registry/types';
import { P4EmptyState, P4Loading, P4PageHeader, P4SegmentTabs, P4Section, P4Card, P4Button } from '@yellow/kit';
import { NoiseLayer, SignalGlitch } from '@yellow/fx';
import { pageHref } from '@yellow/shell/shellBus';
import { p4gAsset } from '@yellow/lib/asset';

type S = 'lazy' | 'local-error' | 'empty';

/** 分包加载占位：400ms 后才出现（之前留白），雪花噪点小电视 */
export function LazyFallback({ blank }: { blank?: boolean }) {
  const [show, setShow] = useState(false);
  useEffect(() => { if (blank) return; const t = setTimeout(() => setShow(true), 400); return () => clearTimeout(t); }, [blank]);
  return show ? <div className="flex h-64 items-center justify-center"><P4Loading label="加载中…" /></div> : <div className="h-64" />;
}

/** 局部错误边界的兜底文案（P4G：一小块"信号中断"磁带条） */
export function LocalErrorFallback() {
  return (
    <SignalGlitch active noise={false}>
      <div role="status" className="relative flex min-w-0 items-center gap-2 overflow-hidden rounded-[3px] border-2 border-dashed border-p4g-line/60 bg-p4g-surface px-3 py-2">
        <NoiseLayer opacity={0.12} />
        <span aria-hidden className="relative h-4 w-6 shrink-0 bg-cover" style={{ backgroundImage: `url(${p4gAsset('color-bars.webp')})` }} />
        <p className="relative min-w-0 text-cap text-p4g-ink-soft">这一块的内容有问题，先跳过了。</p>
      </div>
    </SignalGlitch>
  );
}

/** 空状态基座：插画 + 主文案 + hint + 文字按钮 CTA */
export function EmptyBase({ text, hint, action }: { text: string; hint?: string; action?: { label: string; onClick: () => void } }) {
  return <P4EmptyState title={text} hint={hint} action={action ? <P4Button variant="ghost" size="sm" onClick={action.onClick}>{action.label}</P4Button> : undefined} />;
}

export default function States({ params }: PageProps) {
  const [st, setSt] = useState<S>((params.get('state') as S) || 'lazy');
  const [gen, setGen] = useState(0);
  useEffect(() => { const s = params.get('state') as S; if (s) setSt(s); }, [params]);
  const go = (s: string) => { setSt(s as S); window.history.replaceState(null, '', pageHref('states', undefined, { state: s })); };
  return (
    <>
      <P4PageHeader title="状态" en="STATES" hud={false} />
      <P4SegmentTabs className="mb-5" value={st} onChange={go} items={[{ id: 'lazy', label: '加载中' }, { id: 'local-error', label: '局部错误' }, { id: 'empty', label: '空状态' }]} />
      {st === 'lazy' && (
        <P4Section title="分包加载占位" en="LAZY FALLBACK" action={<P4Button size="sm" variant="secondary" onClick={() => setGen((g) => g + 1)}>重播</P4Button>}>
          <P4Card tone="paper"><LazyFallback key={gen} /></P4Card>
          <p className="mt-2 text-meta font-bold text-[color:var(--p4g-on-stage)]">懒加载页 400ms 内未到时才出现「加载中…」；首页变体始终留白：</p>
          <P4Card tone="paper" className="mt-2"><LazyFallback blank /><p className="text-center text-cap text-p4g-muted">（首页变体留白）</p></P4Card>
        </P4Section>
      )}
      {st === 'local-error' && (
        <P4Section title="局部错误边界" en="LOCAL ERROR">
          <P4Card tone="paper" className="space-y-3">
            <div className="font-display text-body font-bold">通知 · NOTICE</div>
            <div className="rounded-[3px] bg-p4g-surface px-3 py-2 text-body">堂岛菜菜子 想和你一起看电视</div>
            <LocalErrorFallback />
            <div className="rounded-[3px] bg-p4g-surface px-3 py-2 text-body">花村阳介 给你发来了委托</div>
          </P4Card>
        </P4Section>
      )}
      {st === 'empty' && (
        <div className="grid grid-cols-1 gap-4 wide:grid-cols-2">
          <P4Card tone="paper"><EmptyBase text="还没有任务，添加一个开始吧" hint="点右下角 + 写下第一件事" action={{ label: '＋ 添加任务', onClick: () => undefined }} /></P4Card>
          <P4Card tone="paper"><EmptyBase text="归档区暂无内容" /></P4Card>
          <P4Card tone="paper" className="wide:col-span-2"><EmptyBase text="这天暂无记录" hint="雾天也是日子" /></P4Card>
        </div>
      )}
    </>
  );
}
