/**
 * 窥探命运 FateGlimpse（七日连星 → 仪式长按 → 解读 → 祝福）/ 当日塔罗回看。
 * ?state=progress|ready|ritual|read|bless|active  ?step=review（当日塔罗回看）  ?auto=1 仪式自动长按
 * 内容：@/screens/pkg4（v3 命令式逐字迁移）；本文件只把它接成 OverlayProps 弹层（open 时打开，用户关掉 → onClose；卸载时撤层）。
 */
import { v3Overlay } from '@/p5r-red/screens/pkg4/bridge';
import { OD } from '@/p5r-red/screens/pkg4/d4';

export default v3Overlay((p) => p.get('step') === 'review' ? OD.openDayReview(+(p.get('day') ?? 6)) : OD.openFateGlimpse(p.get('state') || 'progress'), (p) => p.get('auto') === '1' ? [['.od-gl-core', 1200, 'hold']] : []);
