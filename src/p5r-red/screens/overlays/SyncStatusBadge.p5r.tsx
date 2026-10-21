/**
 * SyncStatusBadge 同步状态浮标（真实 src/components/auth/SyncStatusBadge.tsx，App 顶层：固定在顶栏右侧，账号已登录且云同步可用时）。
 * 视觉 = v3 b.js openBadge。?state=all（全部状态一览）| live（一次完整同步：同步中 → 已同步 → 2.4s 淡出 / 模拟失败 → 登录已失效）。
 */
import { useRef, useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import { ObSheet, ObBtn } from './ObKit';

const M: Record<string, [string, string] | null> = { idle: null, pull: ['busy', '拉取中…'], push: ['busy', '上传中…'], sync: ['busy', '同步中…'], okpull: ['ok', '已从云端拉取'], okpush: ['ok', '已同步到云端'], err: ['err', '同步失败'], exp: ['err', '登录已失效 · 本机数据仍在'] };
export function SyncBadge({ k }: { k: string }) {
  const m = M[k]; if (!m) return <span className="ob-dim">（idle：不渲染）</span>;
  return <span className={`ob-badge ${m[0]}`} role="status"><i aria-hidden="true">{m[0] === 'busy' ? '⟳' : m[0] === 'ok' ? '✓' : '!'}</i>{m[1]}</span>;
}
export default function SyncStatusBadge({ open, onClose, params }: OverlayProps) {
  const [st, setSt] = useState(params?.get('state') ?? 'all');
  const [live, setLive] = useState('idle');
  const box = useRef<HTMLDivElement>(null);
  const run = (ok: boolean) => {
    setLive('push');
    setTimeout(() => { setLive(ok ? 'okpush' : 'exp'); if (ok) setTimeout(() => { const b = box.current?.firstElementChild as HTMLElement | null; if (b && !isLowMotion()) b.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'both' }).onfinish = () => setLive('idle'); else setLive('idle'); }, 2400); }, 1100);
  };
  return (
    <ObSheet open={open} onClose={onClose} title="同步状态徽章" seed={261} states={[['all', '全部状态'], ['live', '一次完整同步']]} state={st} onState={setSt}>
      {st === 'all' ? (
        <><p className="ob-p">固定在顶栏右侧（账号已登录且云同步可用时）。成功态 2.4 秒后自动淡出。</p><div className="ob-badges">{['pull', 'push', 'sync', 'okpull', 'okpush', 'err', 'exp', 'idle'].map((k) => <div key={k}><small>{k}</small><SyncBadge k={k} /></div>)}</div></>
      ) : (
        <><p className="ob-p">点「立即同步」看徽章从 同步中 → 已同步 → 淡出。</p><div className="ob-badge-live" ref={box}><SyncBadge k={live} /></div>
          <div className="ob-acts"><ObBtn seed={262} onClick={() => run(true)}>立即同步</ObBtn><ObBtn tone="paper" seed={263} onClick={() => run(false)}>模拟失败</ObBtn></div></>
      )}
    </ObSheet>
  );
}
