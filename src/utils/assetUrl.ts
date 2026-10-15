/**
 * 资源地址解析 —— 把后端给的**相对路径**补成当前运行环境能真正取到的绝对地址。
 *
 * 由来（2026-10-16 缺陷 B）：后端 `AvatarController` 存的是 `/api/avatar/{userId}` 这样的
 * 相对路径（库里只存可访问路径，头像本体在磁盘）。前端直接把它当 `<img src>` 用：
 *   · 网页端（origin 就是 http://192.144.227.216）→ 同源解析，正常；
 *   · 手机 APP（Capacitor 的 androidScheme:'https'，WebView origin 是 https://localhost）
 *     → 变成 https://localhost/api/avatar/…，APP 本地没有这个地址 → 404 → 图裂。
 * 于是同一张头像「电脑端正常、手机端裂」。
 *
 * 本函数对三类输入都安全：
 *   · 绝对地址 http(s)://、协议相对 //host、data:、blob: → 原样返回；
 *   · 以 / 开头的相对路径 → 拼后端根地址；
 *   · 其余（相对片段）→ 补一个斜杠再拼。
 * `apiBaseUrl` 未配置（纯离线构建）时原样返回，网页端同源场景仍可用。
 */
import { apiBaseUrl } from '@/services/velvetApi';

const ABSOLUTE_RE = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;

export const isAbsoluteAssetUrl = (url: string): boolean =>
  ABSOLUTE_RE.test(url) || url.startsWith('data:') || url.startsWith('blob:');

export const resolveAssetUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  const raw = url.trim();
  if (!raw) return undefined;
  if (isAbsoluteAssetUrl(raw)) return raw;
  if (!apiBaseUrl) return raw;
  return `${apiBaseUrl}${raw.startsWith('/') ? '' : '/'}${raw}`;
};
