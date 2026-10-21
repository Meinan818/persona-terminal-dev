import { useSyncExternalStore } from 'react';
import { useAppStore } from '@/store';
import type { ThemeType } from '@/types';

const themes = new Set<string>(['blue', 'yellow', 'red', 'pink', 'custom']);
export const getSelectedTheme = () => useAppStore.getState().user?.theme;
export const subscribeSelectedTheme = (notify: () => void) => useAppStore.subscribe((state, previous) => {
  if (state.user?.theme !== previous.user?.theme) notify();
});

export function useSelectedTheme(fallback?: ThemeType) {
  return useSyncExternalStore(subscribeSelectedTheme, getSelectedTheme, getSelectedTheme) ?? fallback;
}

/** 所有可见主题入口共用真实用户设置；持久化失败由调用方显示原有提示。 */
export async function selectAppTheme(value: string): Promise<void> {
  if (!themes.has(value)) throw new Error('无效的主题');
  const state = useAppStore.getState();
  if (!state.user) throw new Error('尚未载入用户档案');
  if (state.user.theme === value) return;
  await state.setTheme(value as ThemeType);
}
