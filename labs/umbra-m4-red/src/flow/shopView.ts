// M5 据点商店（D-007：Untouchable 武器防具 / 武见内科 医院 / 药妆店 道具）+ 天鹅绒房间（断头台二体合成）。
// 规则在 game/shop + game/fusion（零 DOM）；这里只做 P5R 原作版式的 DOM 画面与输入，进/离店与合成演出走 Director recipe（shop:enter / shop:exit / fusion:result）。
import { Assets, Texture } from 'pixi.js';
import { EQUIP, CONS, TREASURE, SHOPS, SLOTS, kindOf, priceOf, sellPriceOf, compare, buy, sell, equip, sellable, statOf, type Slot } from '../game/shop';
import { BY_ID, ARC_ABBR, SKILL_EL, STOCK_MAX, preview, fuse, type Owned } from '../game/fusion';
import SHOP from '../game/data/shop.json';

type SX = any;
const yen = (n: number) => '¥' + n.toLocaleString('en-US');
const ICON: Record<string, string> = {
  melee: '<path d="M2 15 L15 2 L18 5 L5 18 Z M3 17 L1 19" stroke="#fff" stroke-width="1.6" fill="#fff"/>',
  gun: '<path d="M1 6 H17 V10 H9 L7 16 H3 L5 10 H1 Z" fill="#fff"/>',
  armor: '<path d="M5 2 L8 4 H12 L15 2 L19 6 L16 9 V18 H4 V9 L1 6 Z" fill="#fff"/>',
  acc: '<path d="M10 2 L13 8 L19 9 L14.5 13 L16 19 L10 16 L4 19 L5.5 13 L1 9 L7 8 Z" fill="#fff"/>',
  cons: '<path d="M2 12 L10 4 a4 4 0 0 1 6 6 L8 18 a4 4 0 0 1 -6 -6 Z M6 8 L12 14" stroke="#fff" stroke-width="1.6" fill="none"/>',
  treasure: '<path d="M4 3 H16 L19 8 L10 18 L1 8 Z M1 8 H19 M7 3 L10 18 L13 3" stroke="#fff" stroke-width="1.4" fill="none"/>',
};
const iconOf = (id: string) => { const e = EQUIP[id]; const k = e ? e.slot : CONS[id] ? 'cons' : 'treasure'; return `<i class="ic ic-${k}"><svg viewBox="0 0 20 20">${ICON[k]}</svg></i>`; };
const tw = (el: HTMLElement | null, from: number, to: number, ms = 300) => { if (!el) return; const t0 = performance.now(); const f = (t: number) => { const k = Math.min(1, (t - t0) / ms); el.textContent = yen(Math.round(from + (to - from) * k)); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); };

// ==================================================================== 商店
export async function shopFlow(sx: SX) {
  const { L, save, F, screen, tapOnce, wipe, setHubBg, ransom } = sx;
  F.visited ??= new Set<string>();
  for (;;) {
    let pick = '';
    await wipe(async () => {
      F.screen = 'shop:street'; setHubBg('bg.hideout'); sx.bgm('hub.home');
      screen('', `<div class="dim"></div><div class="board-title">${ransom(L('shop.street'))}</div><div class="hub-sub st-sub">${L('shop.street.sub')}</div>
        <div class="st-list">${Object.entries(SHOPS).map(([id, s]) => `<button class="st-btn st-${s.theme}" data-id="shop:${id}"><img src="${sx.SK}${s.keeper}.webp" alt=""><span class="zh">${L('shop.name.' + id)}</span><span class="en">${L('shop.kind.' + id)}</span></button>`).join('')}</div>
        <div class="fl-row">${back(L)}</div><div class="st-money"><b>${L('flow.hub.money')}</b>${yen(save.money)}</div>`);
    });
    const d = sx.host.querySelector('.fl-screen') as HTMLElement;
    pick = await tapOnce(d);
    if (pick === 'back') return;
    await shop(sx, pick.slice(5));
  }
}
const back = (L: any, id = 'back', k = 'shop.back') => `<button class="fl-btn" data-id="${id}"><span class="zh">${L(k)}</span><span class="en">BACK</span></button>`;

async function shop(sx: SX, sid: string) {
  const { L, save, F, show, host, eng } = sx; const S = SHOPS[sid];
  const first = !F.visited.has(sid); F.visited.add(sid);
  host.innerHTML = ''; sx.setHubBg(null);
  await eng.loadGroup('shop');
  sx.bgm('shop.' + sid);
  await show('shop:enter', { shopId: S.kind, skinShopId: sid, firstVisitToday: first }, { kind: sid + (first ? '.full' : '.short') });
  let purchased = false;
  for (;;) {
    const cat = S.menu.length === 1 ? S.menu[0].id : await shopHome(sx, sid);
    if (cat === 'back') break;
    const r = cat === 'sell' ? await sellList(sx, sid) : await buyList(sx, sid, cat);
    purchased ||= r;
    if (S.menu.length === 1) break;
  }
  host.innerHTML = '';
  await show('shop:exit', { shopId: S.kind, purchased, bye: L(purchased ? `shop.${sid}.bye.buy` : `shop.${sid}.bye`) }, { kind: sid });
  F.log.push(`shop ${sid} exit purchased=${purchased}`);
  void save;
}
function frame(sx: SX, sid: string, inner: string, line: string, extra = '') {
  const { L, save, SK } = sx; const S = SHOPS[sid];
  return `<div class="sh sh-${S.theme}${extra}"><div class="sh-bg"></div><img class="sh-keeper" src="${SK}${S.keeper}.webp" alt=""><div class="sh-fence"></div>
    ${inner}
    <div class="sh-money"><em>${line}</em><b data-money>${yen(save.money)}</b><i data-delta></i></div>
    <div class="sh-prompt">${L('shop.prompt')}</div></div>`;
}
async function shopHome(sx: SX, sid: string): Promise<string> {
  const { L, F, screen, tapOnce, ui } = sx; const S = SHOPS[sid];
  F.screen = 'shop:home:' + sid;
  const btns = S.menu.map((m, i) => `<button class="sh-cat${m.id === 'sell' ? ' sell' : ''}" style="--i:${i}" data-id="cat:${m.id}"><b>${L('shop.cat.' + m.id + '.en')}</b><small>${L('shop.cat.' + m.id)}</small></button>`).join('');
  const d = screen('', frame(sx, sid, `<div class="sh-sign">${L('shop.sign.' + sid)}</div><div class="sh-cats">${btns}</div><div class="sh-home-back">${back(L)}</div>`, L(`shop.${sid}.hello`), ' home'));
  void ui;
  const id = await tapOnce(d); return id === 'back' ? 'back' : id.slice(4);
}

/** 购买列表（P5R：左上角色名牌 + L1/R1 换人、斜排商品条、右侧滚动条、左下 EFFECT INFO、右下台词 + 持有金 + 预扣金额） */
async function buyList(sx: SX, sid: string, cat: string): Promise<boolean> {
  const { L, save, F, screen, ui, toast } = sx; const S = SHOPS[sid];
  const items = S.menu.find((m) => m.id === cat)!.items!;
  const party = save.party as string[];
  let cur = items[0], mem = party.find((p) => EQUIP[cur]?.who.includes(p)) ?? party[0], bought = false;
  const isEq = cat !== 'medicine' && cat !== 'item';
  const sub = (): string => {
    if (!isEq) return '';
    const heads = party.map((p) => { const c = compare(save, p, cur); const cls = !c ? 'na' : c.d > 0 ? 'up' : c.d < 0 ? 'dn' : 'eq';
      return `<button class="sh-head ${cls}${p === mem ? ' on' : ''}" data-id="mem:${p}"><img src="${sx.SK}head.${p}.webp" alt=""><i>${!c ? '—' : c.d > 0 ? '▲' + c.d : c.d < 0 ? '▼' + -c.d : '='}</i></button>`; }).join('');
    return `<div class="sh-tag"><b>${L('unit.' + mem)}</b><small>${L('shop.arcana.' + mem)}</small><button class="sh-lr" data-id="memnext">R1</button></div><div class="sh-heads">${heads}</div>`;
  };
  const row = (id: string, i: number) => {
    const have = save.items[id] ?? 0, c = isEq ? compare(save, mem, id) : null;
    const arrow = !isEq ? '' : !c ? '<s class="ar na">—</s>' : c.d > 0 ? '<s class="ar up">▲</s>' : c.d < 0 ? '<s class="ar dn">▼</s>' : '<s class="ar eq">=</s>';
    return `<button class="sh-row${id === cur ? ' sel' : ''}${priceOf(id) > save.money ? ' poor' : ''}" style="--i:${i}" data-id="row:${id}">${iconOf(id)}<span class="nm">${L('item.' + id + '.name')}</span>${arrow}<span class="pr">${yen(priceOf(id))}</span><span class="hv">× ${have}</span></button>`;
  };
  const info = () => { const e = EQUIP[cur]; const st = e ? statLine(L, cur) : ''; const eqd = e && Object.values(save.equip).some((q: any) => SLOTS.some((s) => q[s] === cur));
    return `<div class="sh-info"><div class="sh-ist">${L(e ? 'shop.info.equip' : 'shop.info.effect')}</div><div class="tx"><b>${L('item.' + cur + '.name')}</b>${st}<p>${L('item.' + cur + '.desc')}</p></div>${eqd ? `<span class="eqd">${L('shop.equipped')}</span>` : ''}<span class="have"><i>Have</i>${save.items[cur] ?? 0}</span></div>`; };
  const draw = () => {
    F.screen = `shop:list:${sid}:${cat}`;
    const d = screen('', frame(sx, sid, `${sub()}<div class="sh-list">${items.map(row).join('')}<div class="sh-scroll"><i style="--p:${items.indexOf(cur) / Math.max(1, items.length - 1)}"></i></div></div>
      <div class="sh-stamp">${L('shop.cat.' + cat + '.en')}</div>${info()}<div class="sh-act">${back(L)}<button class="fl-btn hot" data-id="confirm"><span class="zh">${L('shop.buy')}</span><span class="en">CONFIRM</span></button></div>`, L(`shop.${sid}.which`), ''));
    const dl = d.querySelector('[data-delta]') as HTMLElement; dl.textContent = '-' + yen(priceOf(cur)).slice(1); dl.className = 'neg';
    return d;
  };
  for (;;) {
    const id = await sx.tapOnce(draw());
    if (id === 'back') return bought;
    if (id.startsWith('row:')) { const n = id.slice(4); if (n !== cur) { cur = n; if (isEq && !EQUIP[cur].who.includes(mem)) mem = party.find((p) => EQUIP[cur].who.includes(p)) ?? mem; continue; } }
    else if (id.startsWith('mem:')) { mem = id.slice(4); continue; }
    else if (id === 'memnext') { mem = party[(party.indexOf(mem) + 1) % party.length]; continue; }
    // 确认 / 再点选中行 → 数量框
    const q = await qtyBox(sx, sid, cur, 'buy'); if (!q) continue;
    const m0 = save.money; const r = buy(save, cur, q);
    if (!r.ok) { ui('cancel'); toast(L('shop.fail.' + r.reason), true); F.log.push(`buy fail ${cur} ${r.reason}`); continue; }
    bought = true; sx.eng.audio.play('se.shop.buy'); F.log.push(`buy ${cur} x${q} ${m0}→${save.money}`);
    const d = draw(); tw(d.querySelector('[data-money]'), m0, save.money); toast(L(`shop.${sid}.thanks`));
    if (EQUIP[cur]) await equipPrompt(sx, sid, cur);
  }
}
function statLine(L: any, id: string) {
  const e = EQUIP[id]; const s = statOf(id); const out: string[] = [];
  if (e.slot === 'melee' || e.slot === 'gun') out.push(`<u>ATTACK</u><em>${String(s.atk).padStart(3, '0')}</em>`);
  if (e.slot === 'armor') out.push(`<u>DEFENSE</u><em>${String(s.def).padStart(3, '0')}</em>`);
  if (s.hp) out.push(`<u>HP</u><em>+${s.hp}</em>`); if (s.sp) out.push(`<u>SP</u><em>+${s.sp}</em>`); if (s.mag) out.push(`<u>MAG</u><em>+${Math.round(s.mag * 100)}%</em>`);
  void L; return `<span class="st">${out.join('')}</span>`;
}
/** 数量框（武见内科截图：Qty. ▲▼ + Total；P5R 弹出约 120ms） */
async function qtyBox(sx: SX, sid: string, id: string, mode: 'buy' | 'sell'): Promise<number> {
  const { L, save, host, F } = sx; const unit = mode === 'buy' ? priceOf(id) : sellPriceOf(id);
  const max = mode === 'buy' ? Math.max(1, Math.min(SHOP.maxStack - (save.items[id] ?? 0), Math.floor(save.money / Math.max(1, unit)))) : save.items[id] ?? 0;
  let q = 1; F.screen += ':qty';
  const box = document.createElement('div'); box.className = 'sh-qty sh-' + SHOPS[sid].theme; host.querySelector('.fl-screen')!.appendChild(box);
  const draw = () => { box.innerHTML = `<div class="qb"><div class="qn">${iconOf(id)}<b>${L('item.' + id + '.name')}</b><span>${yen(unit)}</span></div>
    <div class="qq"><i>Qty.</i><button class="qa" data-id="qty-">▼</button><b>${q}</b><button class="qa" data-id="qty+">▲</button></div><div class="qt"><i>Total</i><b>${yen(unit * q)}</b></div>
    <div class="qh"><i>Have</i>${save.items[id] ?? 0}</div><div class="qbtn"><button class="fl-btn" data-id="qno"><span class="zh">${L('shop.back')}</span><span class="en">BACK</span></button><button class="fl-btn hot" data-id="qok"><span class="zh">${L(mode === 'buy' ? 'shop.buy' : 'shop.sell')}</span><span class="en">CONFIRM</span></button></div></div>`;
    const dl = host.querySelector('[data-delta]') as HTMLElement | null; if (dl) { dl.textContent = (mode === 'buy' ? '-' : '+') + yen(unit * q).slice(1); dl.className = mode === 'buy' ? 'neg' : 'pos'; } };
  for (;;) {
    draw();
    const id2 = await sx.tapOnce(box);
    if (id2 === 'qty+') { q = q >= max ? 1 : q + 1; continue; }
    if (id2 === 'qty-') { q = q <= 1 ? Math.max(1, max) : q - 1; continue; }
    box.remove(); F.screen = F.screen.replace(/:qty$/, '');
    return id2 === 'qok' ? q : 0;
  }
}
/** 买到装备后：P5R 问「要现在装备吗？」→ 选人（显示 ▲▼ 对比） */
async function equipPrompt(sx: SX, sid: string, item: string) {
  const { L, save, host, F, toast } = sx; const e = EQUIP[item];
  const who = (save.party as string[]).filter((p) => e.who.includes(p));
  if (!who.length) return;
  F.screen = 'shop:equip';
  const box = document.createElement('div'); box.className = 'sh-qty sh-eqp sh-' + SHOPS[sid].theme; host.querySelector('.fl-screen')!.appendChild(box);
  box.innerHTML = `<div class="qb"><div class="qn">${iconOf(item)}<b>${L('item.' + item + '.name')}</b></div><p class="ask">${L('shop.equip.ask')}</p><div class="eq-who">${who.map((p) => { const c = compare(save, p, item)!; const cur = save.equip[p]?.[e.slot as Slot];
    return `<button class="eq-m ${c.d > 0 ? 'up' : c.d < 0 ? 'dn' : 'eq'}" data-id="eqm:${p}"><img src="${sx.SK}head.${p}.webp" alt=""><b>${L('unit.' + p)}</b><small>${cur ? L('item.' + cur + '.name') : '—'}</small><em>${c.cur} → ${c.next} ${c.d > 0 ? '▲' : c.d < 0 ? '▼' : '='}</em></button>`; }).join('')}</div>
    <div class="qbtn"><button class="fl-btn" data-id="eqlater"><span class="zh">${L('shop.equip.later')}</span><span class="en">LATER</span></button></div></div>`;
  const id = await sx.tapOnce(box); box.remove();
  if (id.startsWith('eqm:')) { const p = id.slice(4); if (equip(save, p, item)) { F.log.push(`equip ${p} ${item}`); toast(`${L('unit.' + p)} ← ${L('item.' + item + '.name')}`); } }
}
/** 卖出（P5R 卖宝物黄底列表 + Sell All Treasure） */
async function sellList(sx: SX, sid: string): Promise<boolean> {
  const { L, save, F, screen, toast } = sx; let sold = false; let cur = '';
  for (;;) {
    const list = sellable(save); if (!list.includes(cur)) cur = list[0] ?? '';
    F.screen = `shop:sell:${sid}`;
    const rows = list.map((id, i) => `<button class="sh-row${id === cur ? ' sel' : ''}" style="--i:${i}" data-id="row:${id}">${iconOf(id)}<span class="nm">${L('item.' + id + '.name')}</span><span class="pr">${yen(sellPriceOf(id))}</span><span class="hv">× ${save.items[id]}</span></button>`).join('') || `<div class="sh-empty">${L('shop.sell.empty')}</div>`;
    const tre = list.filter((k) => TREASURE[k] != null); const treSum = tre.reduce((a, k) => a + sellPriceOf(k) * save.items[k], 0);
    const d = screen('', frame(sx, sid, `<button class="sh-sellall" data-id="sellall"><s>— —</s>${L('shop.sellall')}<s>— —</s></button><div class="sh-list sell">${rows}</div><div class="sh-stamp">${L('shop.cat.sell.en')}</div>
      <div class="sh-info"><div class="sh-ist">${L('shop.info.effect')}</div><div class="tx">${cur ? `<b>${L('item.' + cur + '.name')}</b><p>${L('item.' + cur + '.desc')}</p>` : ''}</div></div>
      <div class="sh-act">${back(L)}<button class="fl-btn hot" data-id="confirm"><span class="zh">${L('shop.sell')}</span><span class="en">CONFIRM</span></button></div>`, L(`shop.${sid}.sellq`), ' selling'));
    const dl = d.querySelector('[data-delta]') as HTMLElement; dl.textContent = '+' + yen(treSum).slice(1); dl.className = 'pos';
    const id = await sx.tapOnce(d);
    if (id === 'back') return sold;
    if (id.startsWith('row:') && id.slice(4) !== cur) { cur = id.slice(4); continue; }
    if (id === 'sellall') { if (!tre.length) continue; const m0 = save.money; for (const k of tre) sell(save, k, save.items[k]); sold = true; F.log.push(`sellall treasure +${save.money - m0}`); tw(sx.host.querySelector('[data-money]'), m0, save.money); toast(L(`shop.${sid}.thanks`)); continue; }
    if (!cur) continue;
    const q = await qtyBox(sx, sid, cur, 'sell'); if (!q) continue;
    const m0 = save.money; const r = sell(save, cur, q); if (r.ok) { sold = true; F.log.push(`sell ${cur} x${q} ${m0}→${save.money}`); toast(L(`shop.${sid}.thanks`)); }
  }
}

// ==================================================================== 天鹅绒房间
const loadComp = async (sx: SX, ids: string[]) => {
  const { eng, SK } = sx; const need = ids.filter((id) => !eng.tex['comp.' + id + '.l']);
  if (!need.length) return;
  const got = await Assets.load(need.map((id) => ({ alias: 'p5r-red:comp.' + id + '.l', src: SK + 'comp/' + id + '.l.webp' })));
  for (const id of need) eng.tex['comp.' + id + '.l'] = got['p5r-red:comp.' + id + '.l'] as Texture;
};
const arcChip = (arc: string) => `<i class="arc">${ARC_ABBR[arc]}</i>`;
const pRow = (o: Owned) => { const p = BY_ID[o.id]; return `${arcChip(p.arc)}<em>${o.lv}</em><span>· ${p.en}</span>`; };

export async function velvetFlow(sx: SX) {
  const { L, save, F, show, host, eng, screen, tapOnce, SK } = sx;
  host.innerHTML = ''; sx.setHubBg(null);
  await eng.loadGroup('velvet'); sx.bgm('velvet');
  const first = !F.visited?.has('velvet'); (F.visited ??= new Set()).add('velvet');
  await show('shop:enter', { shopId: 'velvet', skinShopId: 'velvet', firstVisitToday: first }, { kind: first ? 'velvet.full' : 'velvet.short' });
  const vbg = `<div class="vr-bg" style="background-image:url(${SK}bg.velvet.webp)"></div>`;
  const igor = (k: string) => `<div class="vr-talk"><b>${L('vel.igor')}</b><p>${L(k)}</p></div>`;
  for (;;) {
    // 1) 主菜单：星芒爆炸形拼贴字（原作 G26477）
    F.screen = 'velvet:home';
    const d = screen('', `<div class="vr">${vbg}<img class="vr-igor" src="${SK}npc.igor.webp" alt="">
      <button class="vr-burst b1 on" data-id="vel:create"><b>${L('vel.create')}</b><small>${L('vel.create.en')}</small></button>
      <button class="vr-burst b2 off" data-id="vel:lock1"><b>${L('vel.train')}</b><small>${L('vel.train.en')}</small></button>
      <button class="vr-burst b3 off" data-id="vel:lock2"><b>${L('vel.comp')}</b><small>${L('vel.comp.en')} ${save.compendium.length}/232</small></button>
      ${igor('vel.desire')}<div class="vr-act">${back(L, 'back', 'vel.leave')}</div></div>`);
    const id = await tapOnce(d);
    if (id === 'back') break;
    if (id !== 'vel:create') { sx.toast(L('vel.locked'), true); continue; }
    // 2) 合成方式（G26478）：Normal Fusion（断头台）/ Advanced（锁）
    F.screen = 'velvet:method';
    const m = await tapOnce(screen('', `<div class="vr">${vbg}<img class="vr-igor small" src="${SK}npc.igor.webp" alt="">
      <button class="vr-meth on" data-id="meth:normal"><b>Normal<br>Fusion</b><small>Dyad Guillotine</small></button>
      <button class="vr-meth off m2" data-id="meth:adv"><b>Advanced<br>Fusion</b><small>Group Guillotine</small></button>
      <button class="vr-meth off m3" data-id="meth:res"><b>Fuse by<br>Result</b><small>Guillotine Search</small></button>
      <button class="vr-meth off m4" data-id="meth:net"><b>Network<br>Fusion</b><small>Public Execution</small></button>
      ${igor('vel.method')}<div class="vr-act">${back(L)}</div></div>`));
    if (m !== 'meth:normal') { if (m !== 'back') sx.toast(L('vel.locked'), true); continue; }
    await fusionList(sx, vbg, igor);
  }
  host.innerHTML = '';
  await show('shop:exit', { shopId: 'velvet', purchased: false, bye: '' }, { kind: 'velvet' });
  void tapOnce;
}
/** 断头台列表（G26480：左「Persona」黑底列表 → 右「Result」白底列表，选第一张后右侧逐行显示结果 / IMPOSSIBLE） */
async function fusionList(sx: SX, vbg: string, igor: (k: string) => string) {
  const { L, save, F, screen, tapOnce } = sx;
  let a = -1;
  for (;;) {
    F.screen = a < 0 ? 'velvet:list1' : 'velvet:list2';
    const jlv = save.members.joker.lv;
    const left = save.stock.map((o: Owned, i: number) => `<button class="fu-row${i === a ? ' first' : ''}${i === save.activePersona ? ' act' : ''}" style="--i:${i}" data-id="p:${i}">${i === a ? '<s class="tag">1ST</s>' : ''}${pRow(o)}</button>`).join('');
    const right = a < 0 ? '' : save.stock.map((o: Owned, i: number) => {
      if (i === a) return `<div class="fu-res imp" style="--i:${i}"><b>—</b></div>`;
      const pv = preview(save, save.stock[a], o); const p = pv.result;
      return pv.ok && p ? `<button class="fu-res" style="--i:${i}" data-id="p:${i}">${arcChip(p.arc)}<em>${p.lv}</em><span>· ${p.en}</span></button>` : `<div class="fu-res imp" style="--i:${i}"><b>${pv.reason === 'level' && p ? `${p.en} Lv${p.lv}` : pv.reason === 'owned' && p ? `${p.en} · ${L('vel.owned')}` : 'IMPOSSIBLE'}</b></div>`;
    }).join('');
    const d = screen('', `<div class="vr list">${vbg}<div class="fu-head"><span class="h1">Persona</span><svg class="fu-arrow" viewBox="0 0 140 40"><path d="M2 20 L40 6 L36 16 L96 12 L92 4 L138 20 L92 36 L96 28 L36 24 L40 34 Z" fill="#fff" stroke="#0a0a0a" stroke-width="3"/></svg><span class="h2">Result</span></div>
      <div class="fu-lv"><i>LV</i><b>${jlv}</b><span>${L('unit.joker')}</span></div>
      <div class="fu-left">${left}</div><div class="fu-right${a < 0 ? ' empty' : ''}">${right || `<p>${L('vel.pick.hint')}</p>`}</div>
      ${igor(a < 0 ? 'vel.pick1' : 'vel.pick2')}<div class="vr-act">${back(L)}<span class="fu-cnt">${save.stock.length}/${STOCK_MAX}</span></div></div>`);
    const id = await tapOnce(d);
    if (id === 'back') { if (a >= 0) { a = -1; continue; } return; }
    const i = +id.slice(2);
    if (a < 0) { a = i; continue; }
    if (i === a) { a = -1; continue; }
    const done = await fusionPreview(sx, vbg, igor, a, i);
    if (done) a = -1;
  }
}
/** 合成确认（结果卡：阿尔卡纳 / LV / 技能（先天 + 继承，可点换继承）/ 两张素材）→ fusion:result 演出 → 新面具 */
async function fusionPreview(sx: SX, vbg: string, igor: (k: string) => string, ia: number, ib: number): Promise<boolean> {
  const { L, save, F, screen, tapOnce, show, SK, host } = sx;
  const A = save.stock[ia], B = save.stock[ib];
  let pick: string[] | undefined;
  for (;;) {
    const pv = preview(save, A, B, pick); const p = pv.result!; pick = pv.inherit;
    F.screen = 'velvet:preview'; F.fusePreview = { a: A.id, b: B.id, result: p.id, lv: p.lv, base: pv.base, inherit: pv.inherit, k: pv.k };
    const sk = (s: string, inh: boolean) => `<li class="${inh ? 'inh' : ''}"><i class="el el-${SKILL_EL[s] ?? 'passive'}"></i>${s}${inh ? '<u>INHERIT</u>' : ''}</li>`;
    const cands = pv.cands!.map((s) => `<button class="fu-c${pick!.includes(s) ? ' on' : ''}" data-id="inh:${s}"><i class="el el-${SKILL_EL[s] ?? 'passive'}"></i>${s}</button>`).join('');
    const d = screen('', `<div class="vr pv">${vbg}
      <div class="fu-mat m1"><img src="${SK}comp/${A.id}.webp" alt="">${pRow(A)}</div><b class="fu-plus">+</b><div class="fu-mat m2"><img src="${SK}comp/${B.id}.webp" alt="">${pRow(B)}</div>
      <div class="fu-card"><img src="${SK}comp/${p.id}.l.webp" alt=""><div class="fu-name">${arcChip(p.arc)}<em>LV ${p.lv}</em><b>${p.en}</b></div></div>
      <div class="fu-skills"><h4>SKILL</h4><ul>${pv.base!.map((s) => sk(s, false)).join('')}${pv.inherit!.map((s) => sk(s, true)).join('')}</ul>
        <h5>${L('vel.inherit')} <em>${pick!.length}/${pv.k}</em></h5><div class="fu-cands">${cands || `<small>${L('vel.inherit.none')}</small>`}</div></div>
      ${igor(pv.ok ? 'vel.confirm' : pv.reason === 'owned' ? 'vel.owned.t' : 'vel.toohigh')}<div class="vr-act">${back(L)}<button class="fl-btn hot${pv.ok ? '' : ' off'}" data-id="fuse"><span class="zh">${L('vel.fuse')}</span><span class="en">FUSE</span></button></div></div>`);
    const id = await tapOnce(d);
    if (id === 'back') return false;
    if (id.startsWith('inh:')) { const s = id.slice(4); pick = pick!.includes(s) ? pick!.filter((x) => x !== s) : pick!.length < pv.k! ? [...pick!, s] : [...pick!.slice(1), s]; continue; }
    if (id === 'fuse') {
      if (!pv.ok) { sx.toast(L(pv.reason === 'owned' ? 'vel.owned.t' : 'vel.toohigh'), true); continue; }
      await loadComp(sx, [A.id, B.id, p.id]);
      const o = fuse(save, ia, ib, pick); if (!o) { F.errors.push('fuse failed'); return true; }
      F.log.push(`fuse ${A.id}+${B.id}→${o.id} lv${o.lv} [${o.skills.join(',')}]`);
      host.innerHTML = '';
      await show('fusion:result', { personaId: o.id, accident: false, a: A.id, b: B.id, name: p.en });
      F.screen = 'velvet:result';
      await tapOnce(screen('', `<div class="vr res">${vbg}<div class="fu-new"><img src="${SK}comp/${o.id}.l.webp" alt=""><div class="fu-name">${arcChip(p.arc)}<em>LV ${o.lv}</em><b>${p.en}</b></div>
        <ul class="fu-sk2">${o.skills.map((s) => `<li><i class="el el-${SKILL_EL[s] ?? 'passive'}"></i>${s}</li>`).join('')}</ul></div>
        <div class="vr-talk"><b>${L('vel.igor')}</b><p>${L('vel.done')}</p></div><div class="vr-act"><button class="fl-btn hot" data-id="done"><span class="zh">${L('vel.ok')}</span><span class="en">OK</span></button></div></div>`));
      return true;
    }
  }
}
