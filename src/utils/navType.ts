/**
 * navType —— 判断本次页面加载是「进入」还是「刷新」。
 *
 * 用途：开屏动画只在**真正进入 App** 时播放；用户按 F5 / 下拉刷新
 * （即 location.reload()）不该再看一遍。见 App.tsx 的 showSplash 初值。
 *
 * 依据：PerformanceNavigationTiming.type（W3C Navigation Timing Level 2）——
 *   · 'navigate'    地址栏输入 / 点链接 / 首次打开  → 「进入」，放动画
 *   · 'reload'      刷新（F5 / Ctrl+R / 下拉刷新 / location.reload()）→ 跳过
 *   · 'back_forward' 后退/前进（bfcache 恢复）→ 跳过（不是「新进」）
 *   · 'prerender'   预渲染 → 跳过
 *
 * 为什么不自己记 sessionStorage：那是"每次会话"而非"每次进入"——用户在同一
 * 标签页里刷新，sessionStorage 还在，判不出区别；关掉标签重开一个新会话又
 * 会重放，与"每次进入放一遍"也不完全等价。浏览器给的这个 type 是唯一**权威**
 * 且不需要我们维护状态的信号。旧实现（类库 performance.navigation.type）已废弃，
 * 这里只读标准 API，并保留旧接口兜底。
 *
 * 测试见 src/utils/__tests__/navType.test.ts。
 */

/** 只依赖浏览器 navigation entry 的最小形状，便于测试注入 */
export interface NavTimingLike {
  type?: string;
}

/**
 * 本次加载是否为「刷新」（应跳过开屏动画）。
 *
 * @param entry 已取到的 navigation timing；省略则内部去取（便于测试传入替身）
 * @returns true = 是刷新，应跳过开屏；false = 照常播放
 */
export function isReloadNavigation(entry?: NavTimingLike | null): boolean {
  const e = entry !== undefined ? entry : readNavEntry();
  // 取不到任何信息时**保守起见照常播放**：宁可多放一次，也不要让用户
  // 以为 App 坏了（没有开屏 = 门面消失）。这是 fail-open 而非 fail-closed 的取舍。
  if (!e || typeof e.type !== 'string') return false;
  return e.type === 'reload' || e.type === 'back_forward' || e.type === 'prerender';
}

/** 读取当前的 navigation entry（拿不到返回 null） */
function readNavEntry(): NavTimingLike | null {
  try {
    if (typeof performance === 'undefined') return null;
    // 标准 API：Navigation Timing Level 2
    const nav = performance.getEntriesByType?.('navigation')?.[0];
    if (nav && typeof (nav as NavTimingLike).type === 'string') return nav as NavTimingLike;
    // 旧接口兜底（type 数字：0=navigate, 1=reload, 2=back_forward, 255=reserved）
    const legacy = (performance as unknown as { navigation?: { type?: number } }).navigation;
    if (legacy && typeof legacy.type === 'number') {
      return { type: ['navigate', 'reload', 'back_forward'][legacy.type] ?? 'navigate' };
    }
  } catch { /* 隐私模式 / 老浏览器：取不到就当作 navigate */ }
  return null;
}
