/**
 * 通用状态页 #/p/states?state=（视觉迁移自 v3 overlays/a.js §2 openLazy / §11 openEmpty / openError('block')）：
 *   lazy         真实 src/App.tsx#LazyFallback：分包 400ms 内到了不闪字，超过才出现「加载中…」；首页变体留白（?blank=1）
 *   local-error  src/components/ui/LocalErrorBoundary.tsx：某一块渲染抛错 → 只换成一行「这一块的内容有问题，先跳过了。」
 *                （?retry=1 演示 resetKey 变化后重新渲染）
 *   empty        src/components/EmptyState.tsx（+ Todos.tsx#P5EmptyBloom）：4 处变体（任务列表 / 归档区 / 无记录 / 筛选为空）
 * 普通页面（有底栏 / 侧栏）。底部 Dev 状态条切换。
 */
import { useEffect, useRef, useState } from 'react';
import type { PageProps } from '@/p5r-red/registry/types';
import { P5Shp } from '@/p5r-red/kit/P5Shp';
import { P5Plate } from '@/p5r-red/kit/P5Plate';
import { P5PageHeader } from '@/p5r-red/kit/P5PageHeader';
import { P5Empty } from '@/p5r-red/kit/P5States';
import { P5OaStar } from '@/p5r-red/kit/P5Layer';
import { P5Button } from '@/p5r-red/kit/P5Button';
import { DevStateBar } from '@/p5r-red/kit/DevStateBar';
import { toast } from '@/p5r-red/kit/P5Toast';
import { panelIn } from '@/p5r-red/fx/motion';
import { isLowMotion } from '@/p5r-red/lib/prefs';

function Lazy({ blank }: { blank: boolean }) {
  const [show, setShow] = useState(false);
  const [gen, setGen] = useState(0);
  useEffect(() => { setShow(false); if (blank) return; const t = setTimeout(() => setShow(true), 400); return () => clearTimeout(t); }, [blank, gen]);
  return (
    <div className="oa-lazy-c" style={{ margin: '8px auto 0' }}>
      {blank ? <div style={{ height: 256 }} aria-hidden="true" /> : show ? (
        <>
          <div className="oa-lazy-hd"><P5Plate fs={22}>LOADING</P5Plate><span className="oa-lazy-t" role="status">加载中…</span></div>
          <div className="oa-sk">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="oa-sk-row" style={{ ['--i' as string]: i }}><i className="oa-sk-blk a" /><i className="oa-sk-blk b" /><i className="oa-sk-blk c" /></div>)}</div>
        </>
      ) : <div style={{ height: 256 }} aria-hidden="true" />}
      <p className="oa-note">LazyFallback：分包 400ms 内到了不闪字；超过才出现「加载中…」。首页变体留白（blank）。</p>
      <P5Button tone="ink" seed={9} onClick={() => setGen((g) => g + 1)}>重播 400ms</P5Button>
    </div>
  );
}

/** 局部错误边界（真实 LocalErrorBoundary：坏了只换成一行提示，不让整个 App 崩；resetKey 变了重新尝试） */
function LocalError({ retry }: { retry: boolean }) {
  const [failed, setFailed] = useState(!retry);
  return (
    <P5Shp className="oa-errp-card" kind="torn" seed={141} tone="paper" style={{ maxWidth: 460, margin: '8px auto 0' }}>
      <p className="oa-k">首页 · 某张同伴卡（别人写来的数据）</p>
      <div className="oa-fake-row" />
      {failed
        ? <div className="oa-blockfail"><P5OaStar size={16} fill="var(--red)" stroke="#111" sw={8} /><span>这一块的内容有问题，先跳过了。</span></div>
        : <div className="oa-fake-row" style={{ background: 'var(--red)' }} aria-label="重新渲染成功的内容块" />}
      <div className="oa-fake-row s" />
      <p className="oa-fine l">LocalErrorBoundary：坏了只换成一行提示，不让整个 App 崩；数据变了（resetKey）会重新尝试渲染。</p>
      <div className="oa-row"><P5Button tone="ink" size="sm" seed={143} onClick={() => setFailed((f) => !f)}>{failed ? '（demo）resetKey 变化 → 重试' : '（demo）再抛一次错'}</P5Button></div>
    </P5Shp>
  );
}

function Empties() {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!isLowMotion() && box.current) return panelIn(box.current.querySelectorAll('.oa-empty'), { stagger: 0.06 }); }, []);
  return (
    <P5Shp className="oa-errp-card" kind="torn" seed={147} tone="paper" style={{ maxWidth: 520, margin: '8px auto 0', textAlign: 'left' }}>
      <div className="oa-empty-list" ref={box}>
        <p className="oa-k">行动 · 任务列表</p><P5Empty text="还没有任务，添加一个开始吧" seed={1} />
        <p className="oa-k">行动 · 归档区</p><P5Empty text="归档区暂无内容" seed={2} />
        <p className="oa-k">记录 · 无记录</p><P5Empty icon="📭" text="还没有任何记录" hint="把今天做过的一件小事记下来吧" seed={3} />
        <p className="oa-k">记录 · 筛选为空</p><P5Empty icon="📭" text="没有符合条件的记录" hint="试试调整或清除筛选条件" action="清除筛选" onAction={() => toast('已清除筛选')} seed={4} />
      </div>
    </P5Shp>
  );
}

export default function States({ params }: PageProps) {
  const st = params.get('state') ?? 'lazy';
  const T: Record<string, [string, string]> = { lazy: ['LOADING', '分包加载占位'], 'local-error': ['ERROR', '局部错误边界'], empty: ['EMPTY', '空状态基座'] };
  const [en, cn] = T[st] ?? T.lazy;
  return (
    <div className="st5" style={{ paddingBottom: 24 }}>
      <P5PageHeader ransom={en} cn={cn} sub="通用状态 · 空 / 加载 / 报错" seed={33} />
      {st === 'local-error' ? <LocalError retry={params.get('retry') === '1'} /> : st === 'empty' ? <Empties /> : <Lazy blank={params.get('blank') === '1'} />}
      <DevStateBar page="states" items={[{ label: '加载中…', q: 'state=lazy' }, { label: '加载 · 首页留白', q: 'state=lazy&blank=1' }, { label: '局部错误', q: 'state=local-error' }, { label: '局部错误 · 重试后', q: 'state=local-error&retry=1' }, { label: '空状态 4 变体', q: 'state=empty' }]} />
    </div>
  );
}
