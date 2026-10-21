/** 红眼 / 白面具（原 P5.maskHTML）：外壳的 SurpriseFx 会让所有 .mask5 常驻眨眼。 */
import { kitImg } from '@/p5r-red/lib/asset';
export function P5Mask({ w = 80, tone = 'red', className = '' }: { w?: number; tone?: 'red' | 'white'; className?: string }) {
  return (
    <span className={`mask5 ${className}`.trim()} data-tone={tone} style={{ width: w, height: w * (tone === 'red' ? 171 : 178) / 360 }}>
      <img src={kitImg(`mask_${tone}_base`)} alt="" /><img className="eo" src={kitImg(`mask_${tone}_eyes_open`)} alt="" /><img className="ec" src={kitImg(`mask_${tone}_eyes_closed`)} alt="" />
    </span>
  );
}
