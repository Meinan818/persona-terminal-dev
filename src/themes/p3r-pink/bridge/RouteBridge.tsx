/**
 * 路由桥：demo 用 HashRouter（#/p/<pageId>?tab=…），真实 App 用 useAppStore.currentPage。
 *  - 地址变化 → setCurrentPage(pageId)（真实代码里读 currentPage 的逻辑照常工作）
 *  - 别处调用 setCurrentPage('ledger')（通知、旧逻辑）→ 跳到 #/p/ledger（走 demo 的转场）
 */
import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { navigate, normalizePage } from '@pink/shell/shellBus';

const pageOfHash = (): { page: string; tab?: string } => {
  const h = window.location.hash.replace(/^#/, '') || '/';
  const [pathPart, qs] = h.split('?');
  const q = new URLSearchParams(qs || '');
  const m = pathPart.match(/^\/p\/([\w-]+)/);
  if (m) return { page: m[1], tab: q.get('tab') ?? undefined };
  return { page: pathPart === '/' ? 'dashboard' : '' };
};

export function RouteBridge() {
  // 地址 → store
  useEffect(() => {
    const sync = () => {
      const { page, tab } = pageOfHash();
      if (!page) return; // #/overlay/… #/__index 等调试路由不同步
      const st = useAppStore.getState();
      if (st.currentPage !== page) useAppStore.setState({ currentPage: page });
      if (page === 'actions' && (tab === 'todos' || tab === 'activities') && st.actionsSubTab !== tab) st.setActionsSubTab(tab);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  // store → 地址
  useEffect(() => useAppStore.subscribe((s, prev) => {
    if (s.currentPage === prev.currentPage) return;
    const cur = pageOfHash().page;
    const n = normalizePage(s.currentPage);
    if (cur !== n.pageId) navigate(s.currentPage);
  }), []);
  return null;
}
