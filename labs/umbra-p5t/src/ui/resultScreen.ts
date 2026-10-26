// r16b：标题/GET!!/CLEAR!!/继续/NONE/怪盗团 LV./TURN 换原版 result/titles 贴图（umbra-assets 新导出，2160p 切图 ÷2 = prefab 节点尺寸，完全吻合）；无贴图时退回 CSS/SVG 重建。
// r12：原版结算画面（result_1610 第 1 页 money/exp/persona exp、result_1613/2606 第 2 页 item/award/turn）。
// 布局 = prefab_ui2d_result_win 的 RectTransform（tools/gen-result-layout.py → ui/data/result-layout.json，画布 1920×1080，按屏高缩放居中）。
// 贴图全部运行时绑定（serialized_null），image/battle/result 尚未导出 → RESULT_TEX 为 null 时画纯色块并标「待原版贴图」；填上路径即替换。
// 背景红色斜带（ResultLineManager Line1–4 是脚本画的线，参数未导出）= 自制近似；背景是战场 3D 画面 + 结算机位（A_CA9999_BTL0070 系列镜头未导出，自定）。
// 金额/经验 = stage_rewards.csv 对应 StageId 的 Money / StageBaseExp / StagePersonaExp（注意：原版帧 result_1610 显示 ¥160，表里 1010 为 60，差额来源未查明）。
import L from './data/result-layout.json';
import { p5, PORTRAIT } from './p5tHud';
/** 原版贴图（fetch-p5t-ui.sh → public/p5t-hud 短名）；没有 → RESULT_TEX 里的手填路径 → 占位 */
const T = (short: string, k: string) => (p5.has(short) ? p5.url(short) : RESULT_TEX[k] ?? null);
// 每块底板 = 红底（大）+ 黑底：prefab 两个同名 *_base 兄弟，红底相对黑底的 anchoredPosition / sizeDelta（Unity y 向上）
const RED: Record<string, [number, number, number, number]> = { money: [10, 4, 534, 168], exp: [8, 2, 536, 228], personaexp: [4, -1, 872, 518], item_small: [-2, 4, 712, 201], turn: [2, -1, 458, 238], award: [-9, 6, 742, 298] };
function redBox(b: Box, k: string): Box { const r = RED[k]; const cx = b[0] + b[2] / 2 + r[0], cy = b[1] + b[3] / 2 - r[1]; return [cx - r[2] / 2, cy - r[3] / 2, r[2], r[3]]; }
function base2(b: Box, k: string, inner: string) {
  const red = T(`rs_red_${k}`, k), blk = T(`rs_black_${k}`, k);
  if (!red || !blk) return slot('base', b, null, inner);
  return `<div class="rs tex" style="${px(redBox(b, k))};background-image:url(${red})"></div><div class="rs base tex" style="${px(b)};background-image:url(${blk})">${inner}</div>`;
}

type Box = number[];
/** r16b：「继续」牌（重建）。prefab next 节点 361×172（第 2 页 288.8×137.6 = 0.8 倍）：箭头 + next_button（Ⓐ，网页按规则隐藏）+ 文字牌。
 *  形状按 result_1610 640/720 左下放大量：白箭头黑粗描边指向左下；「继续」= 黑色锯齿外框 + 白色锯齿底 + 黑字。viewBox 用 361×172。 */
const NEXT_SVG = `<svg class="rsn" viewBox="0 0 361 172" aria-hidden="true">
  <path d="M66 4 L128 0 L100 54 L140 40 L58 168 L4 128 L44 110 L26 98 Z" fill="#0a0a0a"/>
  <path d="M72 12 L116 9 L86 64 L120 54 L58 152 L20 124 L56 108 L40 98 Z" fill="#fff"/>
  <path d="M186 40 L212 30 L222 18 L246 28 L276 16 L300 30 L330 26 L338 52 L356 70 L340 92 L348 122 L318 128 L300 150 L270 138 L240 152 L222 134 L192 138 L190 110 L172 92 L188 70 Z" fill="#0a0a0a"/>
  <path d="M198 48 L218 40 L228 30 L248 38 L274 28 L296 40 L320 36 L326 58 L340 72 L328 90 L334 114 L310 118 L296 136 L270 126 L242 138 L226 122 L202 126 L200 104 L186 92 L200 72 Z" fill="#fff"/>
  <text x="262" y="100" text-anchor="middle" font-family="'UMBRA SC','Noto Sans SC',sans-serif" font-weight="900" font-size="52" fill="#0a0a0a" transform="rotate(-6 262 88)">继续</text>
</svg>`;
/** 原版录像里实际看到的结算金额（result_1610 = L01 / 原版 1010） */
const MONEY_SEEN: Record<string, number> = { L01: 160 };
export const RESULT_TEX: Record<string, string | null> = {
  money_base: null, money_title: null, money_icon: null, exp_base: null, exp_title: null, exp_gauge: null, pexp_base: null, pexp_title: null, face: null,
  item_base: null, item_title: null, item_none: null, turn_base: null, turn_title: null, award_base: null, award_title: null, check: null, next: null, clear: null,
};
export interface ResultData {
  level: string; turns: number; awards: { ok: boolean; label: string }[]; won: boolean;
  party: { id: string; name: string; persona: string; lv: number; face?: string }[];
  /** r15：红色斜带由 3D 层画（在角色之后） */
  band3d?: boolean;
}
const px = (b: Box) => `left:${b[0]}px;top:${b[1]}px;width:${b[2]}px;height:${b[3]}px`;
function slot(cls: string, b: Box, tex: string | null, inner = '', ph = false) { // r14：不再显示「待原版贴图」占位字
  if (tex && /^title/.test(cls)) inner = ''; // r16b：有原版标题贴图时去掉 CSS 退路文字（之前小字 money/exp/item/turn 漏在贴图左上角）
  return `<div class="rs ${cls}${tex ? ' tex' : ''}" style="${px(b)}${tex ? `;background-image:url(${tex})` : ''}">${inner}${!tex && ph ? '<em class="ph">待原版贴图</em>' : ''}</div>`;
}
/** r16：原版 ResultBackManager 序列帧（flash_01–22 入场闪光 / smoke_01–22 翻页烟雾，fetch-p5t-result.sh）。
 *  原版节点默认关闭、由脚本激活，播放速率未导出 → 按 30fps 播一遍（推测；result_1613 帧里翻页时可见白色烟雾）。 */
const SEQ = 'p5t-hud/result_seq/';
// r16：未达成 award = 原版 brc_award_not 删除线（prefab Toggle/Text/Image 412×8）
function playSeq(stage: HTMLElement, kind: 'flash' | 'smoke', fps = 30) {
  const img = document.createElement('img'); img.className = `rs-seq ${kind}`; img.alt = '';
  for (let i = 1; i <= 22; i++) { const pre = new Image(); pre.src = `${SEQ}${kind}_${String(i).padStart(2, '0')}.webp`; }
  stage.appendChild(img);
  const t0 = performance.now();
  const tick = () => {
    const f = Math.floor(((performance.now() - t0) / 1000) * fps) + 1;
    if (f > 22) { img.remove(); return; }
    const src = `${SEQ}${kind}_${String(f).padStart(2, '0')}.webp`; if (!img.src.endsWith(src)) img.src = src;
    requestAnimationFrame(tick);
  };
  tick();
}
export function showResultScreen(host: HTMLElement, d: ResultData, onDone: () => void, onPage?: (page: number) => void): { next: () => void; el: HTMLElement } {
  const p1 = L.p1 as Record<string, Box>, p2raw = L.p2 as unknown as Record<string, Box> & { award_rows: { box: Box; text: Box }[] };
  // r16b：第 2 页三块面板与 result_2606 黑底逐块互相关（1280×720 下 item 低 40px、turn 高 18px、award 偏右 15px；原版 page2 入场动画终点不在 prefab 静态值上，推断）→ 按 1080 画布校正
  const NUDGE: Record<string, [number, number]> = { item: [0, -60], turn: [0, 101], award: [-56, 0] }; // r16b 二测：黑底掩膜互相关（/tmp/r16c/xc.py）turn 再低 49px@720、award 再左 23px@720，item 已对齐
  const nb = (k: string, b: Box): Box => { const g = Object.keys(NUDGE).find((n) => k.startsWith(n)); return g ? [b[0] + NUDGE[g][0], b[1] + NUDGE[g][1], b[2], b[3]] : b; };
  const p2 = Object.fromEntries(Object.entries(p2raw).map(([k, v]) => [k, k === 'award_rows' ? (v as unknown as { box: Box; text: Box }[]).map((r) => ({ box: nb('award', r.box), text: nb('award', r.text) })) : nb(k, v as Box)])) as typeof p2raw;
  const rw = (L.rewards as Record<string, { money: number; exp: number; personaExp: number }>)[d.level] ?? { money: 0, exp: 0, personaExp: 0 };
  // r15：金额——stage_rewards.csv 1010 的 Money=60，但原版帧 result_1610 显示 ¥160（差额来源未查明，可能是首通/敌人掉落）→ 有帧证据的关按帧显示
  const money = MONEY_SEEN[d.level] ?? rw.money;
  const el = document.createElement('div'); el.id = 'rs'; el.className = 'rs-wrap';
  if (p5.has('rs_hyphen')) el.style.setProperty('--rs-hyphen', `url(${p5.url('rs_hyphen')}) 0 50% / contain`);
  const lines = `<div class="rs-lines"><i style="--r:-18deg;--y:12%"></i><i style="--r:14deg;--y:46%"></i><i style="--r:-9deg;--y:70%"></i><i style="--r:24deg;--y:90%"></i></div>`;
  const page1 = `<div class="rs-page p1">
    ${base2(p1.money_base, 'money', '')}${slot('micon', p1.money_icon, T('rs_money_icon', 'money_icon'), T('rs_money_icon', 'money_icon') ? '' : '¥', false)}
    <b class="rs num money2" style="left:${p1.money_num[0] - 8}px;top:${p1.money_num[1] - 52}px">${money.toLocaleString()}</b>${T('rst_get', 'x') ? `<img class="rs get3" src="${T('rst_get', 'x')}" alt="GET!!" style="left:1190px;top:170px;width:236px;height:139px">` : '<span class="rs get2">GET!!</span>'}
    ${slot('title', p1.money_title, T('rst_money', 'money_title'), '<span>money</span>')}
    ${base2(p1.exp_base, 'exp', `${T('rst_thieves', 'x') ? '' : '<span class="lbl">怪盗团 LV.</span>'}<b class="num">1</b>`)}
    ${T('rst_thieves', 'x') ? slot('lblimg', p1.exp_label, T('rst_thieves', 'x'), '', false) : ''}
    ${slot('title', p1.exp_title, T('rst_exp', 'exp_title'), '<span>exp</span>')}
    ${slot('gauge' + (T('rs_lv_base', 'exp_gauge') ? ' lvtex' : ''), p1.exp_gauge, T('rs_lv_base', 'exp_gauge'), `<i style="width:82%${T('rs_lv_white', 'x') ? `;background:url(${T('rs_lv_white', 'x')}) 0 50%/381px 18px no-repeat` : ''}"></i>`, false)}
    ${base2(p1.pexp_base, 'personaexp', '')}
    ${slot('title', p1.pexp_title, T('rst_personaexp', 'pexp_title'), '<span class="two">persona<br>exp</span>')}
    ${[1, 2, 3].map((i) => { const c = d.party[i - 1]; if (!c) return ''; return `
      ${slot('face', p1[`c${i}_face`], c.face ?? (PORTRAIT[c.id] && p5.has(`party_${PORTRAIT[c.id]}`) ? p5.url(`party_${PORTRAIT[c.id]}`) : RESULT_TEX.face), '', false)}
      ${slot('gauge hy', p1[`c${i}_gauge`], T('rs_hyphen', 'x'), '', false)}`; }).join('')}
    ${slot('next', p1.next, T('rst_next', 'next'), T('rst_next', 'next') ? '' : NEXT_SVG)}
  </div>`;
  const page2 = `<div class="rs-page p2">
    ${base2(p2.item_base, 'item_small', '')}
    ${slot('title', p2.item_title, T('rst_item', 'item_title'), '<span>item</span>')}
    ${slot('none', p2.item_none, T('rst_none', 'item_none'), T('rst_none', 'item_none') ? '' : '<b>NONE</b>', false)}
    ${base2(p2.turn_base, 'turn', `<b class="num big">${d.turns}</b>${T('rst_turn_icon', 'x') ? `<i class="tt2" style="background-image:url(${T('rst_turn_icon', 'x')})"></i>` : '<span class="tt">TURN</span>'}`)}
    ${slot('title', p2.turn_title, T('rst_turn', 'turn_title'), '<span>turn</span>')}
    ${base2(p2.award_base, 'award', '')}
    ${slot('title', p2.award_title, T('rst_award', 'award_title'), '<span>award</span>')}
    ${p2.award_rows.map((r, i) => { const a = d.awards[i]; if (!a) return ''; return `<div class="rs chk${a.ok ? ' ok' : ''}${T('rs_check_box', 'check') ? ' tex' : ''}" style="${px(r.box)}${T('rs_check_box', 'check') ? `;background-image:url(${T('rs_check_box', 'check')})` : ''}">${a.ok && T('rs_check', 'check') ? `<img class="ck" src="${T('rs_check', 'check')}">` : '<i></i>'}</div><div class="rs txt award${a.ok ? '' : ' ng'}" style="${px(r.text)}">${a.label}${!a.ok && T('rs_award_not', 'x') ? `<img class="anot" src="${T('rs_award_not', 'x')}" alt="">` : ''}</div>`; }).join('')}
    ${d.awards.every((a) => a.ok) ? (T('rst_clear', 'x') ? `<img class="rs clear3" src="${T('rst_clear', 'x')}" alt="CLEAR!!" style="left:1070px;top:890px;width:315px;height:189px">` : `<div class="rs clear" style="left:1125px;top:900px;width:240px;height:120px">CLEAR!!</div>`) : ''}
    ${slot('next', p2.next, T('rst_next', 'next'), T('rst_next', 'next') ? '' : NEXT_SVG)}
  </div>`;
  el.innerHTML = `<div class="rs-stage">${d.band3d ? '' : lines}${page1}${page2}</div>`; // r15：3D 斜带（main.ts resultBand）时不画 DOM 红线
  host.appendChild(el); document.body.classList.add('result-on');
  const stage = el.querySelector<HTMLElement>('.rs-stage')!;
  const fit = () => { const W = host.clientWidth || innerWidth, H = host.clientHeight || innerHeight, s = H / 1080; stage.style.transform = `translate(${(W - 1920 * s) / 2}px,0) scale(${s})`; };
  fit(); addEventListener('resize', fit);
  playSeq(stage, 'flash');
  let page = 1;
  el.classList.add('pg1');
  const t0 = performance.now();
  const next = () => {
    if (performance.now() - t0 < 700) return; // r13：结算出现前的那次点击/按键不翻页（r12 录像页1只露 0.2s）
    if (page === 1) { page = 2; el.classList.remove('pg1'); el.classList.add('pg2'); playSeq(stage, 'smoke'); onPage?.(2); return; }
    removeEventListener('resize', fit); el.remove(); document.body.classList.remove('result-on'); onDone();
  };
  el.addEventListener('click', next);
  return { next, el };
}
