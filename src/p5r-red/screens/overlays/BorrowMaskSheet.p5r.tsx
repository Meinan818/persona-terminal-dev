/** BorrowMaskSheet 同调：?state=ok|nomask|none|equip
 *  实现：src/screens/pkg3/*（v3 原生命令式组件逐字迁移），直达入口表见 pkg3/openers.ts。 */
import '../pkg3/pkg3.css';
import { overlayFor } from '../pkg3/host';
import { OPEN } from '../pkg3/openers';
export default overlayFor('hideout-borrow-mask', OPEN);
