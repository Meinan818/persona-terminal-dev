/**
 * useRemoteAssetSrc —— 把一个可能被混合内容拦掉的远程图片地址，换成 App 里真能显示的地址。
 *
 * 与 components/ui/RemoteImg 同源同理由，区别只是这个返回"值"而不是"标签"，
 * 给那些不能换标签的渲染点用（典型：MemberCard 的翻面用的是 motion.img，
 * 换成普通 <img> 会把翻牌动画弄丢）。
 *
 * 行为（刻意与不做处理时一致）：
 *   · 不需要走原生（网页端 / https / data: / blob: / 相对路径）→ 原样返回；
 *   · 需要走原生 → 先返回原地址（维持现状），取回成功后再换成 data URL；
 *   · 取失败 → 保持原地址，不比改之前更差。
 */
import { useEffect, useState } from 'react';
import { fetchRemoteAssetAsDataUrl, needsNativeAssetFetch } from '@/utils/remoteAsset';

export function useRemoteAssetSrc(src?: string): string | undefined {
  const [resolved, setResolved] = useState<string | undefined>(src);

  useEffect(() => {
    if (!needsNativeAssetFetch(src)) {
      setResolved(src);
      return;
    }
    let alive = true;
    setResolved(src);
    fetchRemoteAssetAsDataUrl(src as string)
      .then((dataUrl) => { if (alive) setResolved(dataUrl); })
      .catch(() => { /* 取不到就维持原样 */ });
    return () => { alive = false; };
  }, [src]);

  return resolved;
}

export default useRemoteAssetSrc;
