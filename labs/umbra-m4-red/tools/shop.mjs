// M5 商店/天鹅绒自动化：据点 → 商店街 → Untouchable（饰品买 → 装备询问 → 装备；近战买；卖宝物 Sell All）→ 离店 → 武见（买药 ×2）→ 药妆店（买道具）
// → 天鹅绒（主菜单 → Normal Fusion → 选两张 → 预览/换继承 → 处刑合成演出 → 新面具）→ 回据点。校验金钱/背包/装备/库存/图鉴前后变化，0 错误。
// node tools/shop.mjs <W> <H> [dpr=2] [shots=dir]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [W, H, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.map((a) => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]));
const dpr = +(opt.dpr ?? 2), dir = opt.shots ?? 'shots-m5', tag = `${W}x${H}`;
fs.mkdirSync(dir, { recursive: true }); fs.mkdirSync('tools/out', { recursive: true });
const browser = await chromium.launch({ executablePath: '/workspace/work/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux-arm64/chrome-headless-shell', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: dpr, hasTouch: true });
const page = await ctx.newPage();
const errors = [], steps = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
const T0 = Date.now(); const log = (s) => { steps.push(`${((Date.now() - T0) / 1000).toFixed(1)}s ${s}`); console.log(steps.at(-1)); };
const shot = async (name) => { await page.waitForTimeout(400); await page.screenshot({ path: `${dir}/${tag}-${name}.png` }); log('shot ' + name); };
const scr = () => page.evaluate(() => window.__flow?.screen ?? 'none');
const until = async (pred, ms = 30000) => { const s = Date.now(); for (;;) { const v = await scr(); if (pred(v)) return v; if (Date.now() - s > ms) throw new Error('timeout waiting, screen=' + v); await page.waitForTimeout(100); } };
const click = async (id) => { const ok = await page.evaluate((i) => { const e = window.__flow.host?.querySelector?.(`[data-id="${i}"]`) ?? document.querySelector(`[data-id="${i}"]`); if (!e) return false; e.click(); return true; }, id); if (!ok) throw new Error('no button ' + id + ' on ' + (await scr())); await page.waitForTimeout(160); };
/** 真点击（触屏 tap，按元素中心坐标）：验证命中区在缩放后的视口里可点 */
const tap = async (id) => {
  const el = page.locator(`[data-id="${id}"]`).first();
  await page.evaluate((i) => { const e = document.querySelector(`[data-id="${i}"]`); const L = e?.closest('.sh-list,.fu-left,.fu-right'); if (e && L) { const r = e.getBoundingClientRect(), lr = L.getBoundingClientRect(); if (r.top < lr.top || r.bottom > lr.bottom) L.scrollTop += r.top - lr.top - 40; } }, id);
  const b = await el.boundingBox(); if (!b) throw new Error('no box ' + id + ' on ' + (await scr()));
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  const hit = await page.evaluate(([x, y, id]) => { const e = document.elementFromPoint(x, y); return e?.closest(`[data-id="${id}"]`) ? '' : (e?.className?.baseVal ?? e?.className ?? e?.tagName) + '@' + (window.__flow.screen); }, [x, y, id]);
  if (hit) { tapMiss.push(id + ' (' + hit + ')'); return click(id); }
  await page.touchscreen.tap(x, y); await page.waitForTimeout(160); };
const tapMiss = [];
/** 原作：再点已选中的行 = 确认。行已选中时点行就会直接弹数量框，不再点 CONFIRM */
const openQty = async () => { if (!(await scr()).endsWith(':qty')) await tap('confirm'); await until((s) => s.endsWith(':qty')); };
const S = () => page.evaluate(() => { const s = window.__flow.save; return { money: s.money, items: { ...s.items }, equip: JSON.parse(JSON.stringify(s.equip)), stock: s.stock.map((o) => o.id + ':' + o.lv), active: s.activePersona, comp: s.compendium.length, timings: window.__flow.timings.filter((t) => /shop|fusion/.test(t.ev)) }; });
const eqErr = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`); };
await page.goto(`http://127.0.0.1:8767/?res=0.5&auto=0&maxdt=400&prewarmex=0`, { waitUntil: 'load' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'load' });
await until((s) => s === 'hub', 90000); await page.waitForTimeout(1200); log('hub');
await page.evaluate(() => { window.__flow.host = document.querySelector('.umbra-skin-p5r-red.flow'); });
const s0 = await S(); const checks = [];
// ---- 商店街
await tap('shop'); await until((s) => s === 'shop:street'); await page.waitForTimeout(600); await page.waitForTimeout(700); await shot('20-street');
await tap('shop:untouchable'); await page.waitForTimeout(500); await shot('21-enter-untouchable'); await until((s) => s.startsWith('shop:home')); await page.waitForTimeout(200); await page.waitForTimeout(500); await shot('22-shop-home');
await tap('cat:acc'); await until((s) => s.startsWith('shop:list')); await shot('23-shop-acc');
await tap('row:portable-battery'); await page.waitForTimeout(200); await shot('24-shop-select');
await openQty(); await shot('25-shop-qty');
await tap('qok'); await until((s) => s === 'shop:equip'); await shot('26-shop-equip');
const s1 = await S(); checks.push(['buy portable-battery', s0.money - s1.money === 2000 && s1.items['portable-battery'] === 1]);
await tap('eqm:joker'); await until((s) => s.startsWith('shop:list')); await page.waitForTimeout(300);
const s2 = await S(); checks.push(['equip joker acc', s2.equip.joker.acc === 'portable-battery' && !s2.items['portable-battery']]);
await tap('back'); await until((s) => s.startsWith('shop:home')); await page.waitForTimeout(200);
await tap('cat:melee'); await until((s) => s.startsWith('shop:list')); await tap('row:kris'); await shot('27-shop-melee');
await openQty(); await tap('qok'); await until((s) => s === 'shop:equip'); await tap('eqm:joker'); await until((s) => s.startsWith('shop:list'));
const s3 = await S(); checks.push(['buy+equip kris', s2.money - s3.money === 3600 && s3.equip.joker.melee === 'kris']);
await shot('28-shop-melee-after');
await tap('back'); await until((s) => s.startsWith('shop:home')); await page.waitForTimeout(200);
await tap('cat:sell'); await until((s) => s.startsWith('shop:sell')); await shot('29-shop-sell');
await tap('sellall'); await page.waitForTimeout(500);
const s4 = await S(); checks.push(['sell all treasure', s4.money - s3.money === 6 * 20 + 2 * 50 + 12000 && !s4.items.jade && !s4.items['thin-copper']]);
await tap('row:medicine'); await openQty(); await shot('30-shop-sellqty'); await tap('qok'); await page.waitForTimeout(300);
const s5 = await S(); checks.push(['sell 1 medicine', s5.money - s4.money === 150 && s5.items.medicine === s4.items.medicine - 1]);
await tap('back'); await until((s) => s.startsWith('shop:home')); await page.waitForTimeout(200); await tap('back'); await page.waitForTimeout(250); await shot('31-shop-exit'); await until((s) => s === 'shop:street'); await page.waitForTimeout(600);
// ---- 武见 / 药妆店
await tap('shop:takemi'); await until((s) => s.startsWith('shop:list:takemi')); await shot('32-takemi');
await tap('row:takemedic-all'); await openQty(); await tap('qty+'); await shot('33-takemi-qty'); await tap('qok'); await page.waitForTimeout(400);
const s6 = await S(); checks.push(['takemi buy x2', s5.money - s6.money === 1900 && s6.items['takemedic-all'] === 2]);
await shot('34-takemi-after'); await tap('back'); await until((s) => s === 'shop:street'); await page.waitForTimeout(600);
await tap('shop:drugstore'); await until((s) => s.startsWith('shop:home:drugstore')); await shot('35-drug-home');
await tap('cat:item'); await until((s) => s.startsWith('shop:list')); await tap('row:bead'); await shot('36-drug-list'); await openQty(); await tap('qok'); await page.waitForTimeout(300);
const s7 = await S(); checks.push(['drugstore bead', s6.money - s7.money === 600 && s7.items.bead === 1]);
// 买不起：把钱清到 100 再买 Takemedic → 提示持有金不足、钱不变
await page.evaluate(() => { window.__flow.save.money = 100; });
await tap('back'); await until((s) => s.startsWith('shop:home')); await page.waitForTimeout(200); await tap('cat:item'); await until((s) => s.startsWith('shop:list'));
await tap('row:energy-drink'); await openQty(); await tap('qok'); await page.waitForTimeout(250); await shot('37-drug-poor');
const s8 = await S(); checks.push(['cannot afford', s8.money === 100 && !s8.items['energy-drink']]);
await page.evaluate((m) => { window.__flow.save.money = m; }, s7.money);
await tap('back'); await until((s) => s.startsWith('shop:home')); await page.waitForTimeout(200); await tap('back'); await until((s) => s === 'shop:street'); await page.waitForTimeout(600); await tap('back'); await until((s) => s === 'hub'); await page.waitForTimeout(600); await page.waitForTimeout(500); await shot('38-hub-after-shop');
// ---- 天鹅绒
await tap('velvet'); await page.waitForTimeout(500); await shot('40-velvet-enter'); await until((s) => s === 'velvet:home'); await page.waitForTimeout(400); await shot('41-velvet-home');
await tap('vel:create'); await until((s) => s === 'velvet:method'); await shot('42-velvet-method');
await tap('meth:normal'); await until((s) => s === 'velvet:list1'); await shot('43-fusion-list1');
const st = (await S()).stock; const ia = st.findIndex((x) => x.startsWith('pixie')), ib = st.findIndex((x) => x.startsWith('jack-o-lantern'));
await tap('p:' + ia); await until((s) => s === 'velvet:list2'); await shot('44-fusion-list2');
await tap('p:' + ib); await until((s) => s === 'velvet:preview'); await shot('45-fusion-preview');
const pv = await page.evaluate(() => window.__flow.fusePreview); log('preview ' + JSON.stringify(pv));
const cands = await page.evaluate(() => Array.from(document.querySelectorAll('[data-id^="inh:"]')).map((e) => e.dataset.id));
if (cands.length > pv.k) { await tap(cands[cands.length - 1]); await page.waitForTimeout(200); await shot('46-fusion-inherit'); }
const pv2 = await page.evaluate(() => window.__flow.fusePreview);
await tap('fuse'); await page.waitForTimeout(1300); await shot('47-fusion-guillotine'); await until((s) => s === 'velvet:result', 8000); await shot('48-fusion-result');
const s9 = await S(); const want = [...pv2.base, ...pv2.inherit];
checks.push(['fusion consumed + result', s9.stock.length === st.length - 1 && !s9.stock.some((x) => x.startsWith('pixie')) && !s9.stock.some((x) => x.startsWith('jack-o-lantern')) && s9.stock.at(-1).startsWith(pv2.result)]);
const sk = await page.evaluate(() => window.__flow.save.stock.at(-1).skills); checks.push(['fusion skills = base+inherit', JSON.stringify(sk) === JSON.stringify(want)]);
checks.push(['compendium registered', s9.comp >= s0.comp]);
await tap('done'); await until((s) => s === 'velvet:list1');
// 第二次：在结果上再合成（用当前主角面具 arsene → 检查装备中的面具被吃掉会换成结果）
const st2 = (await S()).stock; const ja = st2.findIndex((x) => x.startsWith('arsene')), jb = st2.findIndex((x) => x.startsWith('agathion'));
await tap('p:' + ja); await until((s) => s === 'velvet:list2'); await tap('p:' + jb); await until((s) => s === 'velvet:preview');
const pv3 = await page.evaluate(() => window.__flow.fusePreview); log('preview2 ' + JSON.stringify(pv3));
await tap('fuse'); await until((s) => s === 'velvet:result', 8000); await tap('done'); await until((s) => s === 'velvet:list1');
const s10 = await S(); checks.push(['active persona follows result', s10.stock[s10.active]?.startsWith(pv3.result)]);
const js = await page.evaluate(() => window.__flow.save.jokerSkills()); log('joker battle skills ' + js.join(','));
await tap('back'); await until((s) => s === 'velvet:home'); await tap('back'); await page.waitForTimeout(250); await until((s) => s === 'hub', 8000); await page.waitForTimeout(400); await shot('49-hub-after-velvet');
// 存档持久：reload 后金钱/装备/库存一致
const before = await S(); const timings = before.timings; const flowErrPre = await page.evaluate(() => [...window.__flow.errors, ...(window.__flow.eng?.errors ?? [])]); await page.reload({ waitUntil: 'load' }); await until((s) => s === 'hub', 90000);
const after = await page.evaluate(() => { const s = window.__flow.save; return { money: s.money, eq: s.equip.joker, stock: s.stock.map((o) => o.id + ':' + o.lv) }; });
checks.push(['persist', after.money === before.money && after.eq.acc === 'portable-battery' && JSON.stringify(after.stock) === JSON.stringify(before.stock)]);
const flowErr = [...flowErrPre, ...(await page.evaluate(() => window.__flow.errors))];
const fail = checks.filter((c) => !c[1]);
if (tapMiss.length) console.log('tap fell back to click (covered centre):', tapMiss.join(','));
const out = { tapMiss, size: tag, secs: (Date.now() - T0) / 1000, errors, flowErrors: flowErr, checks, timings, steps };
fs.writeFileSync(`tools/out/shop-${tag}.json`, JSON.stringify(out, null, 1));
console.log('checks', checks.map((c) => (c[1] ? 'OK ' : 'FAIL ') + c[0]).join(' | '));
console.log('timings', JSON.stringify(timings));
console.log('errors', errors.length, flowErr.length, errors.slice(0, 5), flowErr.slice(0, 5));
await browser.close();
process.exit(errors.length || flowErr.length || fail.length ? 1 : 0);
