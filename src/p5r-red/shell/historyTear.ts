/**
 * 浏览器前进 / 后退 / 手改 hash 的转场（= 原生 v3：history 变化播星形反撕，与 P4G 黄色版「POP 也走重转场」同口径）。
 * 做法：在 HashRouter 之前挂一个 popstate 监听（main.tsx 里 render 前安装 → 先于 react-router 的监听执行）：
 *   页面路由（#/ 或 #/p/<id>）之间、且页面 id 变了 → 拦下这次 popstate（stopImmediatePropagation，路由暂不切页），
 *   播 starTear，在它盖满屏幕的 swap 点（260ms）再补发一次 popstate 放行给路由 → 旧页被撕走、新页露出。
 * 低动效 / 转场进行中 / 弹层预览与索引页 / 同页只改查询（?tab= 等）：不拦截，直接切。
 */
import { starTear } from '@/p5r-red/fx/transitions';
import { isLowMotion } from '@/p5r-red/lib/prefs';

const pageOf = (hash: string): string | null => {
  const p = hash.replace(/^#/, '').split('?')[0];
  if (p === '' || p === '/') return 'dashboard';
  const m = p.match(/^\/p\/([\w-]+)/);
  return m ? m[1] : null;
};

export function installHistoryTear(): void {
  let last = location.hash;
  let passing = false;
  window.addEventListener('popstate', (e) => {
    const now = location.hash;
    if (passing) { passing = false; last = now; return; }
    const from = pageOf(last), to = pageOf(now);
    if (!from || !to || from === to || isLowMotion() || new URLSearchParams(now.split('?')[1] || '').get('__motion') === 'low') { last = now; return; }
    e.stopImmediatePropagation();
    starTear(() => { passing = true; window.dispatchEvent(new PopStateEvent('popstate', { state: history.state })); window.scrollTo(0, 0); });
  });
  // 路由 push / replace（pushState 不触发 popstate / hashchange）：包一层同步 last
  for (const k of ['pushState', 'replaceState'] as const) {
    const orig = history[k].bind(history);
    history[k] = (...a: Parameters<History['pushState']>) => { orig(...a); last = location.hash; };
  }
  window.addEventListener('hashchange', () => { if (!passing) last = location.hash; });
}
