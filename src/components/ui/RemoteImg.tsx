/**
 * RemoteImg —— 远程图片的 <img> 替身：在 App 原生壳里改走原生通道取回。
 *
 * 为什么需要它（2026-10-16 缺陷 B 的真机定论）：
 * App 的 WebView origin 是 `https://localhost`（Capacitor androidScheme:'https'），
 * 后端是 `http://<公网IP>`。Chromium 把这种跨协议的图片请求判为 mixed-content 直接拦掉，
 * 而「允许混合内容」开关在现代 Chromium 上已经不管用——桌面 Chromium 实测：两种开关方式
 * （--allow-running-insecure-content / --blink-settings=allowRunningInsecureContent=true）
 * 之下仍被拦，blockedReason 依旧是 mixed-content。于是「同一张头像，网页端正常、App 里裂」。
 * 详见 src/utils/remoteAsset.ts 的完整取证记录。
 *
 * 行为刻意与原 <img> 保持一致：
 *   · 不需要走原生时（网页端 / https / data: / blob: / 相对路径）→ 原样渲染，零变化；
 *   · 需要走原生时 → 先按原地址渲染（维持现状），取回成功后再替换成 data URL；
 *   · 取失败 → 保持原样，不比改之前更差。
 */
import type { ImgHTMLAttributes } from 'react';
import { useRemoteAssetSrc } from '@/ui/useRemoteAssetSrc';

export function RemoteImg({ src, ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  // 逻辑全在 useRemoteAssetSrc 里（同为 motion.img 一类不能换标签的场景复用）
  return <img src={useRemoteAssetSrc(src)} {...rest} />;
}

export default RemoteImg;
