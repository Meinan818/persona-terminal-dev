/**
 * 页面底部 Dev 状态条（FIXLIST 六：「页面底部 Dev 状态条（只用于演示，接入时去掉）」+ 路由 ?state=）。
 *   <DevStateBar page="dashboard" items={[{ label:'默认', q:'' }, { label:'今日任务为空', q:'state=empty' }]} />
 * ?__dev=0（截图）时不渲染。点选 = 替换查询串（直接切，不播转场）。
 */
import { useLocation } from 'react-router-dom';
import { usePrefs } from '@/p5r-red/lib/prefs';
import { pageHref } from '@/p5r-red/shell/shellBus';

export function DevStateBar({ page, items }: { page: string; items: { label: string; q: string }[] }) {
  const p = usePrefs(); const loc = useLocation();
  if (!import.meta.env.DEV && new URLSearchParams(window.location.search).get('__dev') !== '1') return null;
  if (p.devHidden) return null;
  const cur = loc.search.replace(/^\?/, '');
  return (
    <nav className="p5-devbar" aria-label="DEMO 状态">
      <b>DEMO 状态</b>
      {items.map((it) => {
        const href = pageHref(page, Object.fromEntries(new URLSearchParams(it.q)));
        return <a key={it.label} href={href} aria-current={cur === it.q}>{it.label}</a>;
      })}
    </nav>
  );
}
