/**
 * iconSync —— 主题 ↔ 应用图标 联动。
 *
 * 需求：应用内切换主题时，同步更换「软件图标」。
 *
 * 分平台能力（用户已确认 Android 优先、放弃 iOS）：
 *   · Android 桌面图标：activity-alias ×5 + PackageManager.setComponentEnabledSetting（原生插件 IconSwitcher）
 *   · Web favicon：「标签页图标」可随主题换；已安装 PWA 的桌面图标是 manifest 静态定义，运行时改不了（平台限制）
 *   · 应用内 logo：Navigation 的 <img>，见 themeIconSrc()
 *
 * 注意：判定主题必须用 user.theme（ThemeType 五值），**不能**用 data-ui-channel——
 * 后者把 blue 与 pink 都映射成 'p3'（见 src/ui/channel.ts），会漏切。
 */
import type { ThemeType } from '@/types';

/** 与 public/theme-icons/ 下的文件名一一对应；ThemeType 的 'custom' 即文件名 'custom'。 */
export const THEME_ICON_NAMES: Record<ThemeType, string> = {
  blue: 'blue',
  yellow: 'yellow',
  red: 'red',
  pink: 'pink',
  custom: 'custom',
};

/** 应用内 logo 资源路径（public 下）。 */
export function themeIconSrc(theme: ThemeType | undefined): string {
  const name = theme ? THEME_ICON_NAMES[theme] : undefined;
  // 兜底：主题缺失/未知时退回默认图标，避免 404 破图
  return name ? `/theme-icons/${name}.png` : '/icon.png';
}

/** 该主题对应的 Web favicon 路径。 */
export function themeFaviconHref(theme: ThemeType): string {
  return `/theme-icons/${THEME_ICON_NAMES[theme]}.png`;
}

function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  // Capacitor 注入的运行时标记；未注入即视为 Web
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return typeof cap?.isNativePlatform === 'function' && cap.isNativePlatform();
}

/**
 * 把当前主题应用到「软件图标」。幂等：可在冷启动与每次 setTheme 后安全调用。
 */
export async function applyThemeIcon(theme: ThemeType): Promise<void> {
  const name = THEME_ICON_NAMES[theme];
  if (!name) return;

  // 1) 应用内 logo（Web 与原生都适用）
  try {
    for (const el of document.querySelectorAll<HTMLImageElement>('img[data-theme-logo]')) {
      const next = themeIconSrc(theme);
      if (el.getAttribute('src') !== next) el.setAttribute('src', next);
    }
  } catch {
    /* 无 DOM（测试环境）时忽略 */
  }

  // 2) Android 桌面图标——原生插件
  if (isNativePlatform()) {
    try {
      const mod = await import('@capacitor/core');
      const plugin = mod.registerPlugin<{ setIcon: (o: { name: string }) => Promise<void> }>('IconSwitcher');
      await plugin.setIcon({ name });
    } catch {
      /* 插件缺失（旧壳/Web 预览）时静默——图标不切换，不影响应用功能 */
    }
    return;
  }

  // 3) Web：换 favicon（已安装 PWA 的桌面图标改不了，平台限制）
  try {
    const links = document.querySelectorAll<HTMLLinkElement>(
      'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]',
    );
    const href = themeFaviconHref(theme);
    for (const link of links) {
      if (link.getAttribute('href') !== href) link.setAttribute('href', href);
    }
  } catch {
    /* 忽略 */
  }
}
