/**
 * 偏好桥：真实设置 → demo 外壳偏好（demo 原来由 Dev 胶囊 / localStorage 控制）。
 *   settings.darkMode → prefs.mode（日/夜）
 *   useBoldness()===false（校直 / 系统减弱动效 / 低帧降级）→ prefs.motion='low'
 *   生产环境隐藏 Dev 胶囊（devHidden）；开发时 URL 带 ?__dev=1 可显示
 */
import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { useBoldness } from '@/utils/boldness';
import { setPrefs, getPrefs } from '@pink/lib/prefs';

export function PrefsBridge() {
  const dark = useAppStore((s) => !!s.settings.darkMode);
  const bold = useBoldness();
  useEffect(() => {
    const want = { mode: (dark ? 'night' : 'day') as 'night' | 'day', motion: (bold ? 'full' : 'low') as 'full' | 'low', devHidden: !(import.meta.env.DEV && location.search.includes('__dev=1')) };
    const p = getPrefs();
    if (p.mode !== want.mode || p.motion !== want.motion || p.devHidden !== want.devHidden) setPrefs(want);
  }, [dark, bold]);
  return null;
}
