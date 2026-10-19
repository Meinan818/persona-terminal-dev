import { useAppStore } from '@/store';
import { umbraIdentityForTheme } from '@/utils/umbraIdentity';

// 按用户实际主题命名，不按可自定义的视觉频道命名。
export const useUmbraIdentity = () => useAppStore(s => umbraIdentityForTheme(s.user?.theme));
