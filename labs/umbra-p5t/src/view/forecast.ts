// P5T 式攻击预测面板（Hark 美术区）：只读 Battle，不改规则。
// 数值全部来自 battle.previewDamage / coverOf / hitBonus；击退落点为只读模拟（镜像 battle.push 的逐格规则，不改状态）。
import type { Battle, SkillDef, Unit, Vec } from '../rules';
import { MELEE_KNOCKBACK, SWEEP_DIST, DAREDEVIL_KNOCK, eq } from '../rules';

export type FKind = 'melee' | 'gun' | 'skill';
export interface Forecast {
  kind: FKind;
  attacker: Unit;
  target: Unit;
  skill?: SkillDef;
  spCost: number;
  amount: number;
  hit: number; // 0..100（本引擎无命中掷骰：必中，全掩体/盾牌正面 = 0）
  cover: 0 | 1 | 2;
  height: number; // 攻击者高出目标层数（>0 = 高低差优势）
  weak: boolean; // 目标暴露（无 Resistance）可被打倒
  willDown: boolean;
  lethal: boolean;
  push: { from: Vec; to: Vec; blocked: boolean; fly: boolean } | null;
  aoe: Vec[]; // 受影响格（含目标格）
}

const add = (a: Vec, d: Vec, k = 1) => ({ x: a.x + d.x * k, y: a.y + d.y * k });

/** 只读模拟 battle.push 的落点 */
function simPush(b: Battle, t: Unit, d: Vec, dist: number, fly: boolean): Forecast['push'] {
  const from = { ...t.pos };
  if (t.role === 'shielder') return { from, to: from, blocked: true, fly };
  if (t.role === 'launcher') dist = Math.floor(dist / 2);
  const h0 = b.grid.h(from);
  if (fly) {
    for (let k = dist; k >= 1; k--) {
      const p = add(from, d, k);
      if (!b.grid.walkable(p) || b.unitAt(p) || b.grid.h(p) > h0) continue;
      return { from, to: p, blocked: false, fly };
    }
    return { from, to: from, blocked: true, fly };
  }
  let cur = from;
  let stop = false;
  for (let i = 0; i < dist; i++) {
    const n = add(cur, d);
    if (b.unitAt(n) || !b.grid.walkable(n) || b.grid.h(n) > b.grid.h(cur)) { stop = true; break; }
    const drop = b.grid.h(n) < b.grid.h(cur);
    cur = n;
    if (drop) break;
  }
  return { from, to: cur, blocked: stop, fly };
}

export function computeForecast(b: Battle, a: Unit, t: Unit, kind: FKind, skill: SkillDef | undefined, from: Vec): Forecast {
  const p = b.previewDamage(a, t, kind, skill, from);
  const cb = b.chargeBonus(a);
  const dir = b.dirFrom(from, t.pos);
  let push: Forecast['push'] = null;
  const lethal = !p.miss && p.amount >= t.hp && !(t.passives?.includes('endure') && !t.used.includes('endure'));
  if (!lethal && !p.miss) {
    if (kind === 'melee') push = simPush(b, t, dir, MELEE_KNOCKBACK + cb.knock + (a.passives?.includes('daredevil') ? DAREDEVIL_KNOCK : 0), false);
    else if (kind === 'skill' && skill) {
      if (skill.effect === 'burn') push = simPush(b, t, dir, 1, false);
      else if (skill.effect === 'sweep') push = simPush(b, t, dir, SWEEP_DIST, true);
      else if (skill.knockAll) push = simPush(b, t, dir, MELEE_KNOCKBACK, false);
    }
  }
  // AoE 形状
  let aoe: Vec[] = [t.pos];
  const inB = (q: Vec) => b.grid.inBounds(q);
  const diamond = (c: Vec, r: number) => {
    const out: Vec[] = [];
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) if (Math.abs(dx) + Math.abs(dy) <= r) { const q = { x: c.x + dx, y: c.y + dy }; if (inB(q)) out.push(q); }
    return out;
  };
  if (kind === 'skill' && skill) {
    const area = (skill.radius ?? 0) + (skill.kind === 'attack' ? cb.skillArea : 0);
    if (skill.shape === 'area') aoe = diamond(t.pos, area);
    else if (skill.shape === 'self') aoe = diamond(from, area);
    else if (skill.shape === 'line') aoe = Array.from({ length: skill.length ?? 1 }, (_, i) => add(from, dir, i + 1)).filter(inB);
  } else if (kind === 'gun' && a.gun?.shape && a.gun.shape !== 'single') aoe = diamond(t.pos, 1);
  return {
    kind, attacker: a, target: t, skill,
    spCost: skill ? (skill.voltage ? 0 : b.spCost(a, skill)) : 0,
    amount: p.amount,
    hit: p.miss ? 0 : 100,
    cover: p.cover as 0 | 1 | 2,
    height: Math.max(0, b.grid.h(from) - b.grid.h(t.pos)),
    weak: !p.resist && !p.miss,
    willDown: p.willDown && !lethal,
    lethal,
    push: push && !eq(push.to, push.from) ? push : push?.blocked ? push : null,
    aoe,
  };
}

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
const initials = (n: string) => (n.split(' ').pop() ?? n).slice(0, 2).toUpperCase();
const COVER_SVG = (full: boolean) => `<svg viewBox="0 0 20 20" class="cv"><path d="M10 1 18 4v6c0 5-4 8-8 9-4-1-8-4-8-9V4z" fill="${full ? '#fff' : 'none'}" stroke="#fff" stroke-width="2"/>${full ? '' : '<path d="M10 3v15" stroke="#fff" stroke-width="2"/><path d="M10 3 16.5 5.4V10c0 4-3 6.5-6.5 7.6z" fill="#fff"/>'}</svg>`;

/** 面板 HTML */
export function forecastHtml(f: Forecast, colorOf: (id: string) => string): string {
  const t = f.target, a = f.attacker;
  const name = f.kind === 'melee' ? '近战 MELEE' : f.kind === 'gun' ? '枪击 GUN' : f.skill!.name;
  const cost = f.kind === 'skill' ? (f.skill?.voltage ? '<span class="cost v">VOLTAGE</span>' : `<span class="cost">SP ${f.spCost}</span>`) : f.kind === 'gun' ? `<span class="cost">弹 ${a.ammo === Infinity ? '∞' : a.ammo}</span>` : '';
  const after = Math.max(0, t.hp - f.amount);
  const pct = (n: number) => `${(100 * n) / Math.max(1, t.maxHp)}%`;
  const tags: string[] = [];
  if (f.lethal) tags.push('<i class="tg kill">✖ KILL 击杀</i>');
  if (f.cover) tags.push(`<i class="tg cover">${COVER_SVG(f.cover === 2)}掩体 ${f.cover === 2 ? '全' : '半'}</i>`);
  if (f.height > 0) tags.push(`<i class="tg hi">▲ 高低差 优势</i>`);
  if (f.weak && !f.lethal) tags.push('<i class="tg weak">WEAK</i>');
  if (f.willDown) tags.push('<i class="tg down">击倒 → 1 MORE</i>');
  if (f.push) tags.push(`<i class="tg push">${f.push.blocked && eq(f.push.to, f.push.from) ? '推人 ✕ 被挡' : `推人 ➜ ${Math.abs(f.push.to.x - f.push.from.x) + Math.abs(f.push.to.y - f.push.from.y)}格${f.push.fly ? '(吹飞)' : ''}`}</i>`);
  if (f.aoe.length > 1) tags.push(`<i class="tg aoe">范围 ${f.aoe.length}格</i>`);
  return `<div class="fc-in">
    <div class="fc-head"><span class="fc-sk">${esc(name)}</span>${cost}</div>
    <div class="fc-row">
      <div class="fc-face me" style="--c:${colorOf(a.id)}">${initials(a.name)}</div>
      <div class="fc-mid">
        <div class="fc-dmg"><small>DMG</small><b>${f.amount}</b></div>
        <div class="fc-hit"><small>HIT</small><b>${f.hit}</b><small>%</small></div>
      </div>
      <div class="fc-face foe">${initials(t.name)}${f.lethal ? '<em class="kill">KILL</em>' : ''}</div>
    </div>
    <div class="fc-hp"><span class="nm">${esc(t.name)}</span><span class="num">${t.hp}<small>→</small><b>${after}</b><small>/${t.maxHp}</small></span>
      <div class="bar"><i class="rest" style="width:${pct(after)}"></i><i class="lose" style="left:${pct(after)};width:${pct(t.hp - after)}"></i></div></div>
    ${tags.length ? `<div class="fc-tags">${tags.join('')}</div>` : ''}
    <div class="fc-btns"><button data-fc="cancel">✕ 取消</button><button data-fc="ok" class="ok">${f.lethal ? '斩杀' : '确认'} ▶</button></div>
  </div>`;
}
