// P5 式演出（Hark 美术区）：增援斜切横幅、宝箱拿到道具提示。纯 DOM + CSS（样式在 style.css「fx」段）。

const host = () => document.getElementById('app') ?? document.body;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitFrozen() { while (document.body.classList.contains('frozen')) await wait(50); }

/** 红黑斜切横幅：「增援」大字 + REINFORCEMENTS 小字，从右切入、停顿、向左切出 */
export async function slashBanner(big = '增援', small = 'REINFORCEMENTS', ms = 1100) {
  const el = document.createElement('div');
  el.className = 'fx-slash';
  el.innerHTML = `<div class="sl-k"></div><div class="sl-r"></div><div class="sl-w"></div>
    <div class="sl-txt"><b>${[...big].map((c, i) => `<i style="--i:${i}">${c}</i>`).join('')}</b><small>${small}</small></div>`;
  host().appendChild(el);
  document.body.classList.add('slashing');
  await wait(ms);
  await waitFrozen();
  el.classList.add('out');
  await wait(260);
  el.remove();
  document.body.classList.remove('slashing');
}

const REWARD_NAME: Record<string, string> = { gp: 'GP', sp: '技能点', skillPoint: '技能点', weapon: '武器', item: '道具', money: '金币', exp: 'EXP' };
/** 宝箱道具提示：白底黑字斜框 + 红色 TREASURE 标签 */
export function itemToast(reward: Record<string, number>, who?: string) {
  const el = document.createElement('div');
  el.className = 'fx-item';
  const items = Object.entries(reward).map(([k, n]) => `<span>${REWARD_NAME[k] ?? k.toUpperCase()} <b>×${n}</b></span>`).join('');
  el.innerHTML = `<div class="tag">TREASURE GET!</div><div class="body">${items}</div>${who ? `<div class="who">${who}</div>` : ''}`;
  host().appendChild(el);
  const rm = async () => { await waitFrozen(); el.classList.add('out'); setTimeout(() => el.remove(), 300); };
  setTimeout(rm, 1700);
  return el;
}
