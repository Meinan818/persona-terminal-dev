// P5T 式攻击预测面板（Hark 美术区）：只读 Battle，不改规则。
// 数值全部来自 battle.previewDamage / coverOf / hitBonus；击退落点为只读模拟（镜像 battle.push 的逐格规则，不改状态）。
import { p5 } from '../ui/p5tHud';
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
/** P5T 心形掩护图标：full = 实心青心（全掩体），half = 左半实心（半掩体），none = 空心（暴露） */
const HEART = 'M12 21 C4 15 1 11 1 6.8 1 3.6 3.6 1 6.8 1 9 1 10.9 2.2 12 4 13.1 2.2 15 1 17.2 1 20.4 1 23 3.6 23 6.8 23 11 20 15 12 21Z';
export function heartSvg(cover: 0 | 1 | 2): string {
  const fill = cover === 2 ? '#2bd9e8' : 'none';
  const half = cover === 1 ? `<clipPath id="fch"><rect x="0" y="0" width="12" height="24"/></clipPath><path d="${HEART}" fill="#2bd9e8" clip-path="url(#fch)"/>` : '';
  return `<svg viewBox="0 0 24 22" class="fc-heart c${cover}"><path d="${HEART}" fill="${cover === 2 ? fill : '#0008'}"/>${half}<path d="${HEART}" fill="none" stroke="#fff" stroke-width="2"/></svg>`;
}

/**
 * 目标头顶的紧凑预测（P5T：不是侧边大面板，而是贴在目标头上的数字+心形掩护+标签）。
 * 位置由 main.ts refreshLabels 每帧按目标屏幕坐标摆放；箭头 --ax 指向目标。
 */
export function forecastHtml(f: Forecast, _colorOf?: (id: string) => string): string {
  const t = f.target, a = f.attacker;
  const after = Math.max(0, t.hp - f.amount);
  const pct = (n: number) => `${(100 * n) / Math.max(1, t.maxHp)}%`;
  const miss = f.hit === 0;
  // KILL / BLOCK：P5T 原版贴图（target_kill_red 骷髅标；BLOCK 原版字母块），缺图时文字
  const tag = f.lethal ? (p5.has('target_kill') ? `<i class="tg kill p5">${p5.img('target_kill')}KILL</i>` : '<i class="tg kill">KILL</i>')
    : miss ? (p5.has('block_k') ? `<i class="tg block p5">${['b', 'l', 'o', 'c', 'k'].map((l) => p5.img(`block_${l}`)).join('')}</i>` : '<i class="tg block">BLOCK</i>')
    : f.willDown ? '<i class="tg weak">WEAK</i><i class="tg down">1 MORE</i>'
    : f.weak ? '<i class="tg weak">WEAK</i>' : '<i class="tg res">RESIST</i>';
  const extra: string[] = [];
  if (f.height > 0) extra.push('<i class="mini hi">▲高</i>');
  if (f.push) extra.push(`<i class="mini push">${f.push.blocked && eq(f.push.to, f.push.from) ? '推✕' : `推${Math.abs(f.push.to.x - f.push.from.x) + Math.abs(f.push.to.y - f.push.from.y)}`}</i>`);
  if (f.aoe.length > 1) extra.push(`<i class="mini aoe">×${f.aoe.length}</i>`);
  // 只有技能才需要一条小字（技能名+SP），近战/枪击不需要
  const strip = f.kind === 'skill' && f.skill
    ? `<div class="fc-sk"><span>${esc(f.skill.name)}</span>${f.skill.voltage ? '<b class="v">VOLT</b>' : `<b>SP${f.spCost}</b>`}</div>` : '';
  const verb = f.kind === 'melee' ? 'ATTACK' : f.kind === 'gun' ? 'FIRE' : 'SKILL';
  return `<div class="fc-in" data-who="${esc(a.id)}">
    ${strip}
    <div class="fc-main">${heartSvg(f.cover)}<b class="fc-dmg">${miss ? '—' : f.amount}</b><span class="fc-hit"><b>${f.hit}</b>%</span></div>
    <div class="fc-bar"><i class="rest" style="width:${pct(after)}"></i><i class="lose" style="left:${pct(after)};width:${pct(t.hp - after)}"></i><span>${t.hp}→${after}</span></div>
    <div class="fc-tags">${tag}${extra.join('')}</div>
    <div class="fc-btns"><button data-fc="cancel" title="取消">✕</button><button data-fc="ok" class="ok">${verb} ▶</button></div>
  </div><i class="fc-arrow"></i>`;
}
