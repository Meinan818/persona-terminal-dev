/**
 * 星象演出单播：洗牌 ShuffleAnim / 牌名逐字 CardNameReveal / 每日翻牌 → 解读中 / 中长期六选三 / AI 逐字解读。?variant=shuffle|name|daily|picking|reading
 * 内容：@/screens/pkg4（v3 命令式逐字迁移）；本文件只把它接成 OverlayProps 弹层（open 时打开，用户关掉 → onClose；卸载时撤层）。
 */
import { v3Overlay } from '@/p5r-red/screens/pkg4/bridge';
import { OD } from '@/p5r-red/screens/pkg4/d4';

export default v3Overlay((p) => { const v = p.get('variant') || 'shuffle'; if (v === 'shuffle') OD.openShuffle(); else if (v === 'name') OD.openNameReveal(); else if (v === 'daily') OD.openDailyDraw('idle'); else if (v === 'picking') OD.openLongReading('picking'); else OD.openLongReading('reading'); }, (p) => { const v = p.get('variant'); return v === 'daily' ? [['.od-astro [data-act="begin"]', 500], ['.od-dd-pick', 1800]] : v === 'picking' ? [['.od-lr-c[data-i="0"]', 600], ['.od-lr-c[data-i="2"]', 300], ['.od-lr-c[data-i="4"]', 300], ['[data-act="reveal"]', 500]] : []; });
