/**
 * 记账完成 LedgerSavedModal（真实 → TodoCompleteP5 heading=记账完成）：单笔「−¥28 · 咖啡」/ 批量「共 3 笔已入账」。?variant=single|batch
 * 内容：@/screens/pkg4（v3 命令式逐字迁移）；本文件只把它接成 OverlayProps 弹层（open 时打开，用户关掉 → onClose；卸载时撤层）。
 */
import { v3Overlay } from '@/p5r-red/screens/pkg4/bridge';
import { playSaved } from '@/p5r-red/screens/pkg4/ledger4';

export default v3Overlay((p) => (playSaved as any)(p.get('variant') === 'batch' ? [{ note: '午饭', amount: 32, dir: 'expense' }, { note: '地铁', amount: 4, dir: 'expense' }, { note: '奶茶', amount: 18, dir: 'expense' }] : [{ note: '咖啡', amount: 28, dir: 'expense' }]));
