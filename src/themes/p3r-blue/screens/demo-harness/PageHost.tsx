/** 页面宿主：#/p/:pageId?tab=… → 注册表 lazy 组件；未登记 → 待实现卡。#/ → dashboard。 */
import { Suspense } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { PAGES } from '@blue/registry/pages';
import { lazyOf } from '@blue/shell/lazyRegistry';
import { P3Loading } from '@blue/kit';
import { normalizePage } from '@blue/shell/shellBus';
import { DashboardPlaceholder, TodoCard } from './Placeholders';

export function PageHost({ forceId }: { forceId?: string }) {
  const params = useParams();
  const loc = useLocation();
  const q = new URLSearchParams(loc.search);
  const raw = forceId ?? params.pageId ?? 'dashboard';
  const n = normalizePage(raw, q.get('tab') ?? undefined);
  const entry = PAGES[n.pageId];
  if (!entry) return n.pageId === 'dashboard' ? <DashboardPlaceholder /> : <TodoCard id={n.pageId} />;
  const C = lazyOf(`page:${n.pageId}`, entry.load);
  return (
    <Suspense fallback={<P3Loading />}>
      <C pageId={n.pageId} tab={n.tab} params={q} />
    </Suspense>
  );
}
export const isChromeless = (pageId?: string) => !!(pageId && PAGES[pageId]?.chromeless);
