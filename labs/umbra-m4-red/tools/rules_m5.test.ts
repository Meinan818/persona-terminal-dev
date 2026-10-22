// M5 规则自测（零 DOM）：战斗背包带入/消耗、装备修正进伤害与减伤、全体回复药、P5R 合成表抽查、继承限制。
// 运行：node_modules/.bin/esbuild tools/rules_m5.test.ts --bundle --platform=node --outfile=work/rules_m5.cjs && node work/rules_m5.cjs
(globalThis as any).localStorage = { getItem: () => null, setItem: () => {} };
import { Battle } from '../src/game/battle';
import { Save } from '../src/game/run';
import { buy, equip, compare, sell } from '../src/game/shop';
import { result, preview, fuse, newOwned, canInherit, BY_ID, battleSkills } from '../src/game/fusion';
const out: [string, boolean, string?][] = []; const ok = (n: string, c: boolean, d = '') => out.push([n, c, d]);
// ---- 背包
const b = new Battle(); b.bag = { medicine: 2, 'takemedic-all': 1, 'revival-bead': 1 }; b.reset();
ok('bag→battle items', JSON.stringify(b.items.map((i) => i.id + ':' + i.n)) === JSON.stringify(['medicine:2', 'takemedic-all:1', 'revival-bead:1']), JSON.stringify(b.items));
for (const id of b.party) { const u = b.u(id); u.hp = 10; }
const p = b.useItem('takemedic-all') as any; ok('takemedic-all heals party', p.hits.length === b.party.length && p.hits.every((h: any) => h.dmg === 50), JSON.stringify(p.hits.map((h: any) => h.dmg)));
ok('item count decremented', b.items.find((i) => i.id === 'takemedic-all')!.n === 0);
// ---- 装备修正：同种子同技能，phys +x 伤害更高；def 减伤
const dmg = (eq?: any) => { const t = new Battle(); t.carry = eq ? { joker: { lv: 12, hp: 412, hpMax: 412, sp: 126, spMax: 126, exp: 0, eq } } : null; t.reset(); t.actor = 'joker'; const e = t.enemies[0]; const r: any = t.act('cleave', e); return r.payload.hits[0].dmg; };
const d0 = dmg(), d1 = dmg({ phys: 0.12, gun: 0, mag: 0, def: 0, hp: 0, sp: 0 });
ok('melee eq raises phys dmg', d1 > d0, `${d0}→${d1}`);
const hurt = (def: number) => { const t = new Battle(); t.carry = Object.fromEntries(['joker', 'skull', 'mona', 'panther'].map((k) => [k, { lv: 12, hp: 400, hpMax: 400, sp: 100, spMax: 100, exp: 0, eq: { phys: 0, gun: 0, mag: 0, def, hp: 0, sp: 0 } }])); t.reset(); const a = t.enemyTurn(); return a.filter((x) => x.kind === 'attack').reduce((s, x) => s + x.payload.hits[0].dmg, 0); };
const h0 = hurt(0), h1 = hurt(0.2); ok('armor reduces dmg taken', h1 < h0, `${h0}→${h1}`);
// ---- 商店
const s = new Save(); const m0 = s.money;
ok('buy kris', buy(s, 'kris', 1).ok && s.money === m0 - 3600 && s.items.kris === 1);
ok('compare kris joker ▲', compare(s, 'joker', 'kris')!.d === 18);
ok('kris not for skull', compare(s, 'skull', 'kris') === null);
ok('equip kris', equip(s, 'joker', 'kris') && s.equip.joker.melee === 'kris' && !s.items.kris);
ok('eq bonus in carry', Math.abs(s.eqOf('joker').phys - (68 - 50) / 300) < 1e-9);
ok('sell jade', sell(s, 'jade', 1).ok && s.money === m0 - 3600 + 12000);
ok('poor buy refused', (() => { s.money = 10; const r = buy(s, 'kopis', 1); return !r.ok && r.reason === 'money' && s.money === 10; })());
// ---- 合成（P5R 表抽查：Magician×Lovers=Devil；Fool×Chariot=Moon；同阿尔卡纳取低于均值最高）
const r1 = result(newOwned('pixie'), newOwned('jack-o-lantern')).p!; ok('pixie+jack → incubus (Devil)', r1.id === 'incubus', r1.id);
const r2 = result(newOwned('arsene', 12), newOwned('agathion')).p!; ok('arsene12+agathion → Moon ≥8', r2.arc === 'moon' && r2.lv >= 8, r2.id + ' ' + r2.lv);
const r3 = result(newOwned('pixie'), newOwned('pixie')); ok('same persona pair', !!r3.p || r3.reason === 'none', JSON.stringify(r3.p?.id ?? r3.reason));
ok('inherit limit: fire persona cannot inherit ice', canInherit(BY_ID['jack-o-lantern'], 'Bufu') === false && canInherit(BY_ID['jack-o-lantern'], 'Agi') === true);
const s2 = new Save(); const n0 = s2.stock.length; const ia = s2.stock.findIndex((o) => o.id === 'pixie'), ib = s2.stock.findIndex((o) => o.id === 'jack-o-lantern');
const pv = preview(s2, s2.stock[ia], s2.stock[ib]); const o = fuse(s2, ia, ib)!;
ok('fuse consumes 2, adds 1', s2.stock.length === n0 - 1 && o.id === 'incubus' && JSON.stringify(o.skills) === JSON.stringify([...pv.base!, ...pv.inherit!]));
ok('too high level refused', (() => { s2.members.joker.lv = 1; const q = preview(s2, s2.stock[0], s2.stock[1]); return !q.ok; })());
ok('arsene battle skills', JSON.stringify(battleSkills(newOwned('arsene', 12))) === JSON.stringify(['eiha', 'cleave', 'sukunda']), JSON.stringify(battleSkills(newOwned('arsene', 12))));
for (const [n, c, d] of out) console.log((c ? 'OK   ' : 'FAIL ') + n + (d ? '  ' + d : ''));
const f = out.filter((x) => !x[1]).length; console.log(`${out.length - f}/${out.length} passed`); process.exit(f ? 1 : 0);
