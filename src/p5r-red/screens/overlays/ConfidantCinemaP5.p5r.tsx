/** 升级链连播 RANK UP → 恭喜 → 星移（自动推进；?auto=0 手动）
 *  实现：src/screens/pkg3/*（v3 原生命令式组件逐字迁移），直达入口表见 pkg3/openers.ts。 */
import '../pkg3/pkg3.css';
import { overlayFor } from '../pkg3/host';
import { OPEN } from '../pkg3/openers';
export default overlayFor('bond-p5-cinema', OPEN);
