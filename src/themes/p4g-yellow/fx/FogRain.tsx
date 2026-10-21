/**
 * 雾 / 雨层（P4G 小镇母题）。填满父容器（父需 relative overflow-hidden），pointer-events none。
 *   <FogRain fog rain />          雾 + 雨
 *   <FogRain fog intensity={0.5}/> 只雾
 * 素材 fog-layer.webp（横向无缝，黑底→screen 混合）、rain-layer.webp（双向无缝）。
 * 动画：只用 translate 循环。低动效：静止。素材缺失：CSS 渐变兜底。
 */
import { p4gAsset } from '@yellow/lib/asset';
import { useImageOk } from '@yellow/lib/slots';
import { useLowMotion } from '@yellow/lib/prefs';
import { cx } from '@yellow/lib/cx';

export interface FogRainProps { fog?: boolean; rain?: boolean; intensity?: number; className?: string; speed?: number }

export function FogRain({ fog = true, rain = false, intensity = 1, className, speed = 1 }: FogRainProps) {
  const low = useLowMotion();
  const fogUrl = p4gAsset('fog-layer.webp');
  const rainUrl = p4gAsset('rain-layer.webp');
  const fogOk = useImageOk(fogUrl);
  const rainOk = useImageOk(rainUrl);
  return (
    <div aria-hidden className={cx('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {fog && (
        <div className="absolute inset-y-0 left-0 w-[200%]" style={{
          backgroundImage: fogOk === false ? 'linear-gradient(0deg, rgba(255,255,255,.55), rgba(255,255,255,0) 70%)' : `url(${fogUrl})`,
          backgroundRepeat: 'repeat-x', backgroundSize: 'auto 100%', mixBlendMode: 'screen', opacity: 0.45 * intensity,
          animation: low ? undefined : `p4g-drift-x ${60 / speed}s linear infinite`,
        }} />
      )}
      {rain && (<>
        <div className="absolute -left-[10%] top-0 h-[200%] w-[130%]" style={{
          backgroundImage: rainOk === false ? 'repeating-linear-gradient(105deg, rgba(255,255,255,0) 0 14px, rgba(255,255,255,.35) 14px 15px)' : `url(${rainUrl})`,
          backgroundSize: '256px 256px', mixBlendMode: 'screen', opacity: 0.55 * intensity,
          animation: low ? undefined : `p4g-rain ${0.9 / speed}s linear infinite`,
        }} />
        <div className="absolute -left-[10%] top-0 h-[200%] w-[130%]" style={{
          backgroundImage: rainOk === false ? undefined : `url(${rainUrl})`,
          backgroundSize: '400px 400px', mixBlendMode: 'screen', opacity: 0.3 * intensity,
          animation: low ? undefined : `p4g-rain ${1.5 / speed}s linear infinite`,
        }} />
      </>)}
    </div>
  );
}
