// HUD 扩展（Hark 美术区）：右上目标框（胜利条件 + 回合 x/上限 + 剩余敌人，点开看败北条件）、左下镜头旋转按钮。
import type { Battle, LoseCondition } from '../rules';

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

export function loseText(b: Battle, l: LoseCondition): string {
  if (l.type === 'allKo') return '我方全员倒下';
  if (l.type === 'turnLimit') return `超过 ${l.n} 回合`;
  const u = b.units.find((x) => x.id === l.unitId);
  return `${u?.name ?? l.unitId} 倒下`;
}
export function winText(b: Battle): string {
  if (b.map.objective) return b.map.objective;
  const w = b.map.win;
  switch (w.type) {
    case 'defeatAll': case 'defeatAllExcept': return '击败全部敌人';
    case 'defeatTarget': return '击败目标';
    case 'reachExit': return w.all ? '全员抵达出口' : '抵达出口';
    case 'survive': return `坚持 ${w.turns} 回合`;
  }
}
export function turnLimitOf(b: Battle): number | undefined {
  return b.map.turnLimit ?? b.map.lose?.find((l): l is Extract<LoseCondition, { type: 'turnLimit' }> => l.type === 'turnLimit')?.n;
}

let open = false;
/** 每次 refreshHud 调用：重写 #turn / #objective，并维护败北条件下拉 */
export function updateObjectiveHud(b: Battle) {
  const tl = document.getElementById('hud-tl');
  const turn = document.getElementById('turn');
  const obj = document.getElementById('objective');
  if (!tl || !turn || !obj) return;
  const lim = turnLimitOf(b);
  const surv = b.map.win.type === 'survive' ? b.map.win.turns : undefined;
  const cap = lim ?? surv;
  turn.innerHTML = `<small>TURN</small><b>${b.turn}</b>${cap ? `<small>/${cap}</small>` : ''}`;
  turn.classList.toggle('warn', !!lim && lim - b.turn <= 1);
  const foes = b.units.filter((u) => u.side === 'enemy' && !u.ko && !u.prop && !b.isHidden(u)).length;
  const hidden = b.units.some((u) => u.side === 'enemy' && !u.ko && !u.prop && b.isHidden(u));
  obj.innerHTML = `<span class="lab">目标</span><span class="txt">${esc(winText(b))}</span><i class="caret">${open ? '▲' : '▼'}</i>`;
  let foe = document.getElementById('obj-foes');
  if (!foe) { foe = document.createElement('div'); foe.id = 'obj-foes'; obj.after(foe); }
  foe.innerHTML = `<i class="sk"></i>×${foes}${hidden ? '<em>+?</em>' : ''}${b.map.turnTarget ? `<span class="crown">♛ ${b.map.turnTarget} 回合内</span>` : ''}`;
  let lose = document.getElementById('obj-lose');
  if (!lose) {
    lose = document.createElement('div'); lose.id = 'obj-lose'; foe.after(lose);
  }
  const ls = b.map.lose?.length ? b.map.lose : [{ type: 'allKo' } as LoseCondition, ...(lim ? [{ type: 'turnLimit', n: lim } as LoseCondition] : [])];
  lose.innerHTML = `<div class="h">败北条件 · LOSE</div>${ls.map((l) => `<div>✕ ${esc(loseText(b, l))}</div>`).join('')}`;
  lose.classList.toggle('hidden', !open);
  if (!obj.dataset.wired) {
    obj.dataset.wired = '1';
    obj.addEventListener('click', () => { open = !open; updateObjectiveHud(b0 ?? b); });
  }
  b0 = b;
}
let b0: Battle | null = null;
export function setObjectiveOpen(v: boolean) { open = v; if (b0) updateObjectiveHud(b0); }

/** 左下（结束回合旁）旋转按钮 */
export function mountCamButtons(onRotate: (dir: 1 | -1) => void) {
  const el = document.createElement('div');
  el.id = 'camctl';
  el.className = 'hud';
  el.innerHTML = `<button data-r="-1" title="向左旋转 (Q)"><span>⟲</span><small>Q</small></button><button data-r="1" title="向右旋转 (E)"><span>⟳</span><small>E</small></button>`;
  el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (b) onRotate(Number(b.dataset.r) as 1 | -1);
  });
  (document.getElementById('app') ?? document.body).appendChild(el);
  return el;
}
