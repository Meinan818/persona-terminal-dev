/**
 * 吐司（原 P5.toast(msg)）：顶部红条，2.2s 后淡出。命令式，任何地方可调：
 *   import { toast } from '@/p5r-red/kit'; toast('已保存');
 */
export function toast(msg: string): void {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  t.animate([{ transform: 'translate(-50%,-16px)', opacity: 0 }, { transform: 'translate(-50%,0)', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
  setTimeout(() => { t.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'both' }).onfinish = () => t.remove(); }, 2200);
}
/** 声明式写法（等价）：<P5ToastOnMount msg="…" /> 挂载即弹一次 */
import { useEffect } from 'react';
export function P5ToastOnMount({ msg }: { msg: string }) { useEffect(() => toast(msg), [msg]); return null; }
