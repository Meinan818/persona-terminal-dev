/** 页面宿主：#/p/:pageId → 注册表组件；未登记 → 待移植卡。wide 变化时重挂载（同原生 mq change → render + enter）。 */
import { Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { PAGES } from '@/p5r-red/registry/pages';
import { lazyOf } from '@/p5r-red/shell/lazyRegistry';
import { useWide } from '@/p5r-red/lib/layout';
import { TodoCard } from './Placeholders';

export function PageHost({ pageId }: { pageId: string }) {
  const loc = useLocation();
  const wide = useWide();
  const q = new URLSearchParams(loc.search);
  const entry = PAGES[pageId];
  if (!entry) return <TodoCard id={pageId} />;
  const C = lazyOf(`page:${pageId}`, entry.load);
  return <Suspense fallback={null}><C key={wide ? 'w' : 'n'} pageId={pageId} tab={q.get('tab') ?? undefined} params={q} wide={wide} /></Suspense>;
}
export const isChromeless = (pageId?: string) => !!(pageId && PAGES[pageId]?.chromeless);
