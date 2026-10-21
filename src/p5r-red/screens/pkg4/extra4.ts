// @ts-nocheck —— 记录页日历的年月跳转浮层（真实 src/pages/Activities.tsx showPicker：点日历顶部「YYYY年M月」弹出；年份 ‹ › + 12 月格 + 回到今天）。
// v3 无此屏，按 v3 语汇（.oa-layer 纸卡 + rough 壳 + 斜切月格）新画；类名 .p4-cal-*。
import { P5 } from './p5';
import { OA4 } from './a4';
export function openCalendarPicker({ onPick } = {}) {
  const now = new Date(); let y = now.getFullYear(), m = now.getMonth();
  const L = OA4.layer('p4-cal', `<div class="p4-cal-card" role="dialog" aria-modal="true" aria-label="选择年月">${OA4.rough(1201, { face: 'var(--p5r-paper)', frame: '#111', sh: 'var(--red)', jag: 6, d: [5, 6] })}<div class="p4-cal-in"></div></div>`, { z: 880 });
  const box = L.$('.p4-cal-in');
  const draw = (dir = 0) => {
    box.innerHTML = `<div class="p4-cal-y"><button data-y="-1" aria-label="上一年">‹</button><b>${y}年</b><button data-y="1" aria-label="下一年" ${y >= now.getFullYear() ? 'disabled' : ''}>›</button></div>
      <div class="p4-cal-g">${Array.from({ length: 12 }, (_, i) => { const fut = y === now.getFullYear() && i > now.getMonth(); return `<button data-m="${i}" class="${i === m ? 'on' : ''} ${y === now.getFullYear() && i === now.getMonth() ? 'now' : ''}" ${fut ? 'disabled' : ''} style="--r:${[-1.5, 1, -.5, 1.4][i % 4]}deg">${i + 1}月</button>`; }).join('')}</div>
      <div class="p4-cal-f">${P5.ui.btn('回到今天', { tone: 'ink', size: 'sm', seed: 1202, attrs: 'data-today' })}</div>`;
    if (dir && !P5.reduced()) box.querySelector('.p4-cal-g').animate([{ opacity: 0, transform: `translateX(${dir * 24}px)` }, { opacity: 1, transform: 'none' }], { duration: 180, easing: 'ease-out' });
  };
  draw();
  if (!P5.reduced()) { L.$('.p4-cal-card').animate([{ transform: 'translateY(-16px) scale(.94) rotate(-2deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.2,1.3,.4,1)' }); P5.panelIn(box.querySelectorAll('.p4-cal-g button'), { stagger: .015, from: 'up' }); }
  L.el.addEventListener('click', (e) => {
    const t = e.target, g = (s) => t.closest(s); let n;
    if (t === L.el) return L.close();
    if ((n = g('[data-y]')) && !n.disabled) { y += +n.dataset.y; draw(+n.dataset.y); }
    if ((n = g('[data-m]')) && !n.disabled) { m = +n.dataset.m; if (onPick) onPick(y, m); else P5.toast(`${y}年${m + 1}月`); L.close(); }
    if (g('[data-today]')) { onPick && onPick(now.getFullYear(), now.getMonth()); L.close(); }
  });
  return L;
}
