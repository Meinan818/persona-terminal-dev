/**
 * P5 × P3 battle rules.
 *
 * Persona identity, levels, five stats, ten affinities and skill learn levels
 * come from the shared P5R catalog. HP/SP and damage numbers are the demo's
 * own balance layer, kept explicit in p5r-battle-adapter.js.
 */
import {
  P5_ELEMENTS,
  P5_STATUS,
  buildBattlePersona,
  buildPersonaLoadout,
  catalogPersonaChoices,
  recruitDataForPersona,
  setPersonaOverride,
} from './p5r-battle-adapter.js';

export const ELEMENTS = P5_ELEMENTS;
export const STATUS = P5_STATUS;

const DEFAULT_HERO_PERSONAS = ['arsene', 'pixie', 'jack-o-lantern', 'angel'];
const DEFAULT_ALLY_PERSONAS = ['silky', 'cait-sith', 'kelpie'];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const roll = (rng, probability) => rng() < probability;
const elementLabel = element => ELEMENTS[element]?.label ?? element;
const affinityLabel = affinity => ({
  weak: '弱点',
  resist: '抗性',
  null: '无效',
  absorb: '吸收',
  repel: '反弹',
  normal: '普通',
}[affinity] ?? affinity);

const PERSONALITY_MODS = {
  proud: { threaten: -20, flatter: 20, reason: 5, bribe: -5 },
  cowardly: { threaten: 25, flatter: 0, reason: 10, bribe: 10 },
  greedy: { threaten: -5, flatter: 5, reason: 0, bribe: 30 },
  wrathful: { threaten: 10, flatter: -15, reason: -10, bribe: 0 },
  calm: { threaten: -10, flatter: 5, reason: 25, bribe: 5 },
};

function affinityOfPersona(persona, element) {
  const code = persona?.resistances?.[element] ?? '-';
  return {
    wk: 'weak',
    rs: 'resist',
    nu: 'null',
    ab: 'absorb',
    rp: 'repel',
  }[code] ?? 'normal';
}

function affinityOfEnemy(enemy, element) {
  if (enemy.affinities?.[element]) return enemy.affinities[element];
  if (enemy.weakness === element) return 'weak';
  if (enemy.resist === element) return 'resist';
  if (enemy.null?.includes(element)) return 'null';
  if (enemy.absorb?.includes(element)) return 'absorb';
  if (enemy.repel?.includes(element)) return 'repel';
  return 'normal';
}

function personaFor(actor) {
  if (!actor) return null;
  if (actor.isPlayer) return actor.masks[actor.activeMask] ?? null;
  return actor.activePersona ?? null;
}

function actorSkills(actor) {
  if (!actor) return [];
  return actor.isPlayer
    ? actor.masks[actor.activeMask]?.skills ?? []
    : actor.skills ?? [];
}

function makePartyMember(persona) {
  return {
    id: `ally:${persona.id}`,
    name: persona.name,
    side: 'party',
    hp: persona.maxHp,
    maxHp: persona.maxHp,
    sp: persona.maxSp,
    maxSp: persona.maxSp,
    ammo: 0,
    isPlayer: false,
    guarding: false,
    attackUp: 0,
    oneMoreUsed: false,
    acted: false,
    activePersona: persona,
    skills: persona.skills,
  };
}

function makeEnemy(spec) {
  const maxHp = Number(spec.maxHp ?? spec.hp) || 60;
  return {
    id: spec.id,
    name: spec.name,
    level: spec.level ?? 1,
    hp: maxHp,
    maxHp,
    attack: spec.attack ?? 16,
    defense: spec.defense ?? 5,
    element: spec.element ?? 'phys',
    weakness: spec.weakness ?? null,
    resist: spec.resist ?? null,
    null: spec.null ?? [],
    absorb: spec.absorb ?? [],
    repel: spec.repel ?? [],
    status: null,
    statusTurns: 0,
    statusAppliedRound: 0,
    skills: (buildBattlePersona(spec.recruitPersonaId)?.skills ?? [])
      .filter(item => (item.power ?? 0) > 0)
      .slice(0, 3),
    down: false,
    personality: spec.personality ?? 'proud',
    enraged: false,
    recruit: recruitDataForPersona(spec.recruitPersonaId),
    reward: spec.reward ?? { sp: 20, item: '阴影碎片' },
    debuffs: {},
    knownAffinities: {},
  };
}

export function createDefaultBattle({
  rng = Math.random,
  heroPersonaIds = DEFAULT_HERO_PERSONAS,
  activePersonaId,
  allyPersonaIds = DEFAULT_ALLY_PERSONAS,
  enemies: enemySpecs,
} = {}) {
  const masks = buildPersonaLoadout(heroPersonaIds);
  const maskIds = Object.keys(masks);
  if (!maskIds.length) throw new Error('至少需要一张有效的 Persona。');
  const activeMask = masks[activePersonaId] ? activePersonaId : maskIds[0];
  const active = masks[activeMask];
  const hero = {
    id: 'hero',
    name: '你',
    side: 'party',
    hp: active.maxHp,
    maxHp: active.maxHp,
    sp: active.maxSp,
    maxSp: active.maxSp,
    ammo: 3,
    isPlayer: true,
    activeMask,
    switched: false,
    oneMoreUsed: false,
    guarding: false,
    attackUp: 0,
    acted: false,
    masks,
  };

  const allies = allyPersonaIds
    .map(buildBattlePersona)
    .filter(Boolean)
    .map(makePartyMember);

  const enemies = (enemySpecs ?? [
    {
      id: 'a',
      name: '诡辩之影',
      maxHp: 72,
      attack: 18,
      defense: 6,
      element: 'phys',
      weakness: 'electric',
      resist: 'curse',
      personality: 'proud',
      recruitPersonaId: 'agathion',
      reward: { sp: 30, item: '诡辩的碎片' },
    },
    {
      id: 'b',
      name: '刻薄之影',
      maxHp: 64,
      attack: 16,
      defense: 5,
      element: 'curse',
      weakness: 'bless',
      resist: 'fire',
      personality: 'greedy',
      recruitPersonaId: 'angel',
      reward: { sp: 24, item: '刻薄的碎片' },
    },
  ]).map(makeEnemy);

  return new P5Battle({ rng, party: [hero, ...allies], enemies });
}

export class P5Battle {
  constructor({ rng = Math.random, party, enemies }) {
    this.rng = rng;
    this.party = party;
    this.enemies = enemies;
    this.round = 1;
    this.phase = 'party';
    this.currentId = party[0].id;
    this.extraId = null;
    this.extraPending = false;
    this.currentIsExtra = false;
    this.batonChain = 0;
    this.batonBoost = 0;
    this.showtimeUsed = false;
    this.result = null;
    this.log = [];
    this.push(`第 1 回合：${party.map(p => p.name).join(' / ')} vs ${enemies.map(e => e.name).join(' / ')}`);
    this.prepareIntents();
  }

  prepareIntents() {
    this.enemies.forEach((enemy, index) => {
      const options = (enemy.skills ?? []).filter(skill => (skill.power ?? 0) > 0);
      const skill = options.length ? options[(this.round + index) % options.length] : null;
      const element = skill?.element ?? enemy.element;
      enemy.intent = {
        skill,
        label: skill?.name ?? `${elementLabel(element)}攻击`,
        element,
        elementLabel: elementLabel(element),
        power: skill?.power ?? null,
      };
    });
  }

  push(text) {
    this.log.push(text);
    if (this.log.length > 90) this.log.splice(0, this.log.length - 90);
  }

  get actor() {
    return this.party.find(p => p.id === this.currentId && p.hp > 0) ?? null;
  }

  get aliveParty() {
    return this.party.filter(p => p.hp > 0);
  }

  get aliveEnemies() {
    return this.enemies.filter(e => e.hp > 0);
  }

  get allDown() {
    const alive = this.aliveEnemies;
    return alive.length > 0 && alive.every(e => e.down);
  }

  get currentPersona() {
    return personaFor(this.actor);
  }

  get elementOf() {
    return this.currentPersona?.element ?? 'phys';
  }

  get actions() {
    if (this.phase !== 'party' || !this.actor) return [];
    const actor = this.actor;
    const actions = [];
    for (const item of actorSkills(actor)) {
      actions.push({
        type: 'skill',
        id: item.id,
        label: item.name,
        detail: `${elementLabel(item.element)} · ${item.target === 'ally' ? '我方' : item.target === 'allAllies' ? '全体我方' : item.target === 'allEnemies' ? '全体敌人' : '敌方'}${item.status ? ` · ${STATUS[item.status]?.label ?? item.status}` : ''}`,
        cost: item.sp,
        disabled: actor.sp < item.sp
          || (
            item.power <= 0
            && !item.heal
            && !item.debuff
            && !item.status
            && !item.attackUp
            && !item.guard
            && !item.revive
            && !item.instantKill
            && !item.cleanseBuffs
            && !item.cleanseDebuffs
          ),
      });
    }
    actions.push({
      type: 'analyze',
      label: '洞察',
      detail: '2 SP · 发现目标的一项未知耐性',
      cost: 2,
      disabled: actor.sp < 2,
    });
    actions.push({ type: 'basic', label: '普攻', detail: '物理 · 18', cost: 0 });
    if (actor.isPlayer && actor.ammo > 0) {
      actions.push({ type: 'gun', label: '手枪', detail: `枪击 · 26 · 弹药 ${actor.ammo}`, cost: 0 });
    }
    actions.push({ type: 'guard', label: '防御', detail: '本回合承伤减半', cost: 0 });
    if (actor.isPlayer) {
      if (!this.showtimeUsed && this.round >= 2) {
        actions.push({ type: 'showtime', label: 'SHOWTIME', detail: '双人合击 · 每战一次', cost: 0 });
      }
      for (const [maskId, mask] of Object.entries(actor.masks)) {
        if (maskId === actor.activeMask) continue;
        actions.push({
          type: 'switchMask',
          id: maskId,
          label: `换面具 · ${mask.name}`,
          detail: `${mask.elementLabel ?? elementLabel(mask.element)} · 消耗本回合行动`,
          cost: 0,
          disabled: actor.switched,
        });
      }
    }
    if (this.enemies.some(e => e.hp > 0 && e.down) && this.aliveParty.length > 1) {
      for (const target of this.aliveParty) {
        if (target.id === actor.id) continue;
        actions.push({
          type: 'batonPass',
          targetId: target.id,
          label: `接力 → ${target.name}`,
          detail: `BATON PASS · 伤害 +${Math.min(3, this.batonChain + 1) * 25}%`,
          cost: 0,
        });
      }
    }
    return actions;
  }

  act(action) {
    if (this.phase !== 'party' || !this.actor) return { ok: false, reason: '现在不是你的回合。' };
    const actor = this.actor;
    const isExtra = this.extraId === actor.id && this.extraPending;
    this.currentIsExtra = isExtra;
    if (isExtra) this.extraPending = false;

    if (action.type === 'switchMask') {
      if (!actor.isPlayer) return { ok: false, reason: '只有主角能换面具。' };
      if (!actor.masks[action.id]) return { ok: false, reason: '没有这张面具。' };
      if (actor.masks[action.id].id === actor.activeMask) return { ok: false, reason: '已经装备这张面具。' };
      actor.activeMask = action.id;
      actor.switched = true;
      this.push(`你换上了「${actor.masks[action.id].name}」，本次行动结束。`);
      this.finishActor(actor);
      return { ok: true };
    }

    if (action.type === 'batonPass') {
      const target = this.party.find(p => p.id === action.targetId && p.hp > 0);
      if (!target || target.id === actor.id) return { ok: false, reason: '不能把回合传给自己。' };
      if (!this.enemies.some(e => e.hp > 0 && e.down)) return { ok: false, reason: '需要先让至少一个影子倒地。' };
      actor.acted = true;
      this.batonChain = clamp(this.batonChain + 1, 1, 3);
      this.batonBoost = this.batonChain * 0.25;
      this.currentId = target.id;
      this.extraId = target.id;
      this.extraPending = true;
      this.push(`BATON PASS → ${target.name}，伤害 +${this.batonChain * 25}%。`);
      return { ok: true };
    }

    if (action.type === 'analyze') {
      const target = action.targetId
        ? this.aliveEnemies.find(e => e.id === action.targetId)
        : this.aliveEnemies[0];
      if (!target) return { ok: false, reason: '没有目标。' };
      if (actor.sp < 2) return { ok: false, reason: 'SP 不足 2。' };
      const elements = Object.keys(P5_ELEMENTS).filter(
        element => !['healing', 'support', 'ailment', 'passive', 'trait'].includes(element),
      );
      const unseen = elements.filter(element => !target.knownAffinities[element]);
      const reveal = target.weakness && !target.knownAffinities[target.weakness]
        ? target.weakness
        : unseen[0];
      if (!reveal) {
        this.push(`${target.name} 的耐性已经被看穿了。`);
        return { ok: true };
      }
      actor.sp -= 2;
      target.knownAffinities[reveal] = affinityOfEnemy(target, reveal);
      this.push(`洞察：发现 ${target.name} 对${elementLabel(reveal)}的反应是「${affinityLabel(target.knownAffinities[reveal])}」。`);
      this.afterAction(actor);
      return { ok: true };
    }

    if (action.type === 'guard') {
      actor.guarding = true;
      this.push(`${actor.name} 进入防御。`);
      this.afterAction(actor);
      return { ok: true };
    }

    if (action.type === 'showtime') {
      if (!actor.isPlayer) return { ok: false, reason: '只有主角能发动 SHOWTIME。' };
      if (this.showtimeUsed) return { ok: false, reason: '这一战已经用过 SHOWTIME。' };
      if (this.round < 2) return { ok: false, reason: '第一回合还不能发动。' };
      this.showtimeUsed = true;
      const damage = 72 + this.round * 10;
      this.push(`SHOWTIME —— ${actor.name}与同伴的合击。`);
      for (const enemy of this.aliveEnemies) {
        enemy.hp = Math.max(0, enemy.hp - damage);
        if (enemy.hp > 0) enemy.down = true;
        this.push(`${enemy.name} 受到 ${damage} 伤害。`);
      }
      this.afterAction(actor);
      return { ok: true, showtime: true };
    }

    if (action.type === 'basic' || action.type === 'gun') {
      const target = action.targetId
        ? this.aliveEnemies.find(e => e.id === action.targetId)
        : this.aliveEnemies[0];
      if (!target) return { ok: false, reason: '没有目标。' };
      if (action.type === 'gun') {
        if (actor.ammo <= 0) return { ok: false, reason: '没有子弹了。' };
        actor.ammo -= 1;
        this.hitEnemy(actor, target, {
          id: 'gun',
          name: '手枪',
          element: 'gun',
          power: 26,
          crit: 0.2,
        });
      } else {
        this.hitEnemy(actor, target, {
          id: 'basic',
          name: '普攻',
          element: 'phys',
          power: 18,
        });
      }
      this.afterAction(actor);
      return { ok: true };
    }

    if (action.type === 'skill') {
      const item = actorSkills(actor).find(s => s.id === action.id);
      if (!item) return { ok: false, reason: '没有这个技能。' };
      if (actor.sp < item.sp) return { ok: false, reason: 'SP 不足。' };
      actor.sp -= item.sp;
      this.useSkill(actor, item, action);
      this.afterAction(actor);
      return { ok: true };
    }
    return { ok: false, reason: '未知行动。' };
  }

  useSkill(actor, item, action) {
    if (item.revive) {
      const target = this.party.find(member => member.hp <= 0);
      if (target) {
        target.hp = Math.max(1, Math.round(target.maxHp * (item.revivePct ?? 0.5)));
        this.push(`${actor.name} 使用「${item.name}」→ ${target.name} 以 ${target.hp} HP 复活。`);
      }
      return;
    }
    if (item.cleanseBuffs) {
      for (const target of this.aliveEnemies) target.debuffs = {};
      this.push(`${actor.name} 使用「${item.name}」→ 敌方强化效果被清除。`);
      return;
    }
    if (item.cleanseDebuffs) {
      for (const target of this.aliveParty) target.attackUp = 0;
      this.push(`${actor.name} 使用「${item.name}」→ 我方弱化效果被清除。`);
      return;
    }
    if (item.heal) {
      const targets = item.target === 'allAllies'
        ? this.aliveParty
        : [this.aliveParty.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]];
      for (const target of targets) {
        if (!target) continue;
        const healed = Math.min(target.maxHp - target.hp, item.power);
        target.hp += healed;
        if (item.cure) target.status = null;
        this.push(`${actor.name} 使用「${item.name}」→ ${target.name} 回复 ${healed} HP${item.cure ? '，异常状态解除' : ''}。`);
      }
      return;
    }
    if (item.attackUp) {
      const target = this.aliveParty.find(p => p.id !== actor.id) ?? actor;
      target.attackUp = Math.max(target.attackUp, item.attackUp);
      this.push(`${actor.name} 使用「${item.name}」→ ${target.name} 攻击提升。`);
      return;
    }
    if (item.guard) {
      actor.guarding = true;
      this.push(`${actor.name} 使用「${item.name}」→ 进入防御。`);
      return;
    }
    if (item.debuff) {
      const target = action.targetId
        ? this.aliveEnemies.find(e => e.id === action.targetId)
        : this.aliveEnemies[0];
      if (target) {
        target.debuffs[item.debuff] = true;
        this.push(`${actor.name} 使用「${item.name}」→ ${target.name} 的${item.debuff === 'defense' ? '防御' : '命中'}下降。`);
      }
      return;
    }
    if (item.target === 'allEnemies') {
      for (const target of this.aliveEnemies) this.hitEnemy(actor, target, item);
      return;
    }
    if (item.target === 'enemy') {
      const target = action.targetId
        ? this.aliveEnemies.find(e => e.id === action.targetId)
        : this.aliveEnemies[0];
      if (!target) return;
      this.hitEnemy(actor, target, item);
      return;
    }
    this.push(`${actor.name} 使用「${item.name}」，但没有可结算的效果。`);
  }

  hitEnemy(actor, target, item) {
    const affinity = item.ignoreAffinity ? 'normal' : affinityOfEnemy(target, item.element);
    const newAffinity = !item.ignoreAffinity && !target.knownAffinities[item.element];
    if (!item.ignoreAffinity && affinity !== 'normal') {
      target.knownAffinities[item.element] = affinity;
    }
    const technical = Boolean(
      target.status
      && STATUS[target.status]?.technicalWith?.includes(item.element),
    );
    const crit = !item.ignoreAffinity && roll(this.rng, item.crit ?? 0.08);
    const stat = (item.element === 'phys' || item.element === 'gun'
      ? actor.strength ?? 5
      : actor.magic ?? 5) + (actor.attackBonus ?? 0);
    const attackFactor = 1 + Math.max(0, stat - 5) * 0.03;
    const defenseFactor = 1 - Math.min(0.45, (target.defense ?? 0) * 0.02);
    let mult = affinity === 'weak' ? 1.25 : affinity === 'resist' ? 0.5 : 1;
    if (technical) mult *= 1.5;
    if (crit) mult *= 1.5;
    if (this.batonBoost > 0) mult *= 1 + this.batonBoost;
    if (actor.attackUp > 1) mult *= actor.attackUp;
    if (target.debuffs?.defense) mult *= 1.25;
    let damage = item.power > 0
      ? Math.max(1, Math.round(item.power * attackFactor * defenseFactor * mult))
      : 0;
    const labels = [];
    if (affinity === 'weak') labels.push('弱点');
    if (affinity === 'resist') labels.push('抗性');
    if (affinity === 'null') labels.push('无效');
    if (affinity === 'absorb') labels.push('吸收');
    if (affinity === 'repel') labels.push('反弹');
    if (technical) labels.push('TECHNICAL');
    if (crit) labels.push('暴击');

    if (affinity === 'null') {
      damage = 0;
    } else if (affinity === 'absorb') {
      target.hp = Math.min(target.maxHp, target.hp + damage);
      damage = 0;
    } else if (affinity === 'repel') {
      actor.hp = Math.max(0, actor.hp - damage);
      damage = 0;
    }

    if (damage > 0) target.hp = Math.max(0, target.hp - damage);
    if (newAffinity && affinity !== 'normal') {
      this.push(`发现 ${target.name} 对${elementLabel(item.element)}「${affinityLabel(affinity)}」。`);
    }
    if (item.instantKill) {
      if (!['null', 'absorb', 'repel'].includes(affinity) && roll(this.rng, item.instantKillChance ?? 0.15)) {
        target.hp = 0;
        target.down = true;
        this.push(`${actor.name} 使用「${item.name}」→ ${target.name} 被即死。`);
      } else {
        this.push(`${actor.name} 使用「${item.name}」→ ${target.name} 抵抗了即死。`);
      }
      actor.attackUp = 0;
      this.batonBoost = 0;
      return;
    }
    if (item.power > 0 || damage > 0) {
      this.push(
        `${actor.name} 使用「${item.name}」→ ${target.name} ${damage ? `受到 ${damage} 伤害` : '没有受伤'}${labels.length ? `（${labels.join(' / ')}）` : ''}。`,
      );
    }
    if (item.status && target.hp > 0) {
      target.status = item.status;
      target.statusTurns = item.statusTurns ?? 3;
      target.statusAppliedRound = this.round;
      this.push(`${target.name} 陷入【${STATUS[item.status]?.label ?? item.status}】。`);
    }
    actor.attackUp = 0;
    this.batonBoost = 0;
    if (
      (affinity === 'weak' || crit)
      && !['null', 'absorb', 'repel'].includes(affinity)
      && target.hp > 0
      && !target.down
    ) {
      target.down = true;
      this.push(`${target.name} 倒下了。`);
      if (!actor.oneMoreUsed) {
        actor.oneMoreUsed = true;
        this.extraId = actor.id;
        this.extraPending = true;
        this.push(`${actor.name} 获得 1 MORE！`);
      }
    }
  }

  afterAction(actor) {
    if (this.aliveEnemies.length === 0) {
      this.phase = 'victory';
      this.result = { type: 'victory' };
      this.push('战斗胜利。');
      return;
    }
    if (this.allDown) {
      this.phase = 'holdUp';
      this.push('HOLD UP！所有影子都倒下了。');
      return;
    }
    if (this.currentIsExtra) {
      this.extraId = null;
      this.extraPending = false;
      this.currentIsExtra = false;
      this.finishActor(actor);
      return;
    }
    if (this.extraPending) return;
    this.finishActor(actor);
  }

  finishActor(actor) {
    actor.acted = true;
    if (this.extraId === actor.id && !this.extraPending) this.extraId = null;
    this.advance();
  }

  advance() {
    if (this.phase !== 'party') return;
    if (this.extraId) {
      this.currentId = this.extraId;
      return;
    }
    const next = this.party.find(p => p.hp > 0 && !p.acted);
    if (next) {
      this.currentId = next.id;
      return;
    }
    this.enemyPhase();
  }

  enemyPhase() {
    for (const enemy of this.aliveEnemies) {
      if (enemy.down) {
        this.push(`${enemy.name} 倒在地上，跳过了行动。`);
        enemy.down = false;
        continue;
      }
      if (enemy.status && ['sleep', 'freeze', 'shock', 'dizzy'].includes(enemy.status)) {
        this.push(`${enemy.name} 因【${STATUS[enemy.status].label}】无法行动。`);
      }
      const disabled = enemy.status && ['sleep', 'freeze', 'shock', 'dizzy'].includes(enemy.status);
      if (!disabled) {
        const targets = this.aliveParty;
        const target = targets[Math.floor(this.rng() * targets.length)];
        if (target) {
        const persona = personaFor(target);
          const enemySkill = enemy.intent?.skill ?? null;
        const attackElement = enemySkill?.element ?? enemy.element;
        const affinity = affinityOfPersona(persona, attackElement);
        const skillFactor = enemySkill
          ? Math.max(0.75, Math.min(1.5, (enemySkill.power ?? 24) / 24))
          : 1;
        const raw = Math.max(1, Math.round(enemy.attack * skillFactor * (0.9 + this.rng() * 0.2) * (enemy.enraged ? 1.4 : 1)));
          let damage = Math.max(1, Math.round((raw - ((persona?.defense ?? 0) + (target.defenseBonus ?? 0)) * 0.5) * (
            target.guarding ? 0.5 : 1
          )));
          const labels = [];
          if (affinity === 'weak') { damage = Math.round(damage * 1.25); labels.push('弱点'); }
          else if (affinity === 'resist') { damage = Math.round(damage * 0.5); labels.push('抗性'); }
          else if (affinity === 'null') { damage = 0; labels.push('无效'); }
          else if (affinity === 'absorb') { target.hp = Math.min(target.maxHp, target.hp + damage); damage = 0; labels.push('吸收'); }
          else if (affinity === 'repel') { enemy.hp = Math.max(0, enemy.hp - damage); damage = 0; labels.push('反弹'); }
          if (damage > 0) target.hp = Math.max(0, target.hp - damage);
          this.push(`${enemy.name} ${enemySkill ? `使用「${enemySkill.name}」` : `以${elementLabel(enemy.element)}攻击`} ${target.name}，${damage ? `造成 ${damage} 伤害` : '没有造成伤害'}${labels.length ? `（${labels.join(' / ')}）` : ''}。`);
          if (target.hp <= 0) this.push(`${target.name} 倒下了。`);
        }
      }
      if (enemy.status && enemy.statusAppliedRound !== this.round) {
        enemy.statusTurns = Math.max(0, enemy.statusTurns - 1);
        if (enemy.statusTurns === 0) {
          this.push(`${enemy.name} 的【${STATUS[enemy.status]?.label ?? enemy.status}】解除了。`);
          enemy.status = null;
          enemy.statusAppliedRound = 0;
        }
      }
    }
    if (this.aliveParty.length === 0) {
      this.phase = 'defeat';
      this.result = { type: 'defeat' };
      this.push('全员倒下。战斗失败。');
      return;
    }
    for (const enemy of this.aliveEnemies) {
      enemy.down = false;
      enemy.debuffs = {};
    }
    for (const member of this.party) {
      member.acted = false;
      member.guarding = false;
      member.oneMoreUsed = false;
      member.switched = false;
    }
    this.extraId = null;
    this.extraPending = false;
    this.currentIsExtra = false;
    this.batonChain = 0;
    this.batonBoost = 0;
    this.round++;
    this.prepareIntents();
    this.currentId = this.aliveParty[0].id;
    this.push(`第 ${this.round} 回合。`);
  }

  holdUp(action) {
    if (this.phase !== 'holdUp') return { ok: false, reason: '现在不是 Hold Up。' };
    const actor = this.actor;
    if (action.type === 'allOut') {
      const power = 30 + this.aliveParty.length * 10;
      for (const enemy of this.aliveEnemies) {
        enemy.hp = Math.max(0, enemy.hp - power);
        enemy.down = false;
        this.push(`总攻击！${enemy.name} 受到 ${power} 伤害。`);
      }
      if (this.aliveEnemies.length === 0) {
        this.phase = 'victory';
        this.result = { type: 'victory' };
        this.push('总攻击收尾。战斗胜利。');
        return { ok: true };
      }
      this.phase = 'party';
      if (actor) this.finishActor(actor);
      return { ok: true };
    }
    if (action.type === 'negotiate') {
      const enemy = this.enemies.find(e => e.id === action.enemyId && e.hp > 0);
      if (!enemy) return { ok: false, reason: '没有这个影子。' };
      if (action.option === 'bribe' && this.actor.sp < 20) return { ok: false, reason: 'SP 不足 20。' };
      const base = 50 + (PERSONALITY_MODS[enemy.personality]?.[action.option] ?? 0) + 10 + (enemy.hp / enemy.maxHp < 0.35 ? 5 : 0);
      const finalChance = action.option === 'bribe' && this.actor.sp < 20 ? 0 : clamp(base, 10, 90);
      if (action.option === 'bribe') this.actor.sp -= 20;
      const success = roll(this.rng, finalChance / 100);
      this.push(`交涉（${action.option}）：把握 ${finalChance}% → ${success ? '成功' : '失败'}。`);
      if (success) {
        this.phase = 'negotiation';
        this.result = {
          type: 'negotiation',
          enemyId: enemy.id,
          enemyName: enemy.name,
          recruit: enemy.recruit,
          reward: enemy.reward,
        };
        return { ok: true };
      }
      enemy.down = false;
      enemy.enraged = true;
      this.push(`${enemy.name} 被激怒了。`);
      this.phase = 'party';
      if (actor) this.finishActor(actor);
      return { ok: true };
    }
    if (action.type === 'continue') {
      for (const enemy of this.aliveEnemies) enemy.down = false;
      this.phase = 'party';
      this.push('你们没有理会它，继续战斗。');
      if (actor) this.finishActor(actor);
      return { ok: true };
    }
    return { ok: false, reason: '未知 Hold Up 行动。' };
  }

  chooseResult(type) {
    if (this.phase !== 'negotiation' || !this.result) return { ok: false, reason: '没有可领取的结果。' };
    const result = this.result;
    if (type === 'recruit') this.result = { type: 'recruited', ...result.recruit };
    else this.result = { type: 'reward', ...result.reward };
    this.phase = 'result';
    return { ok: true };
  }

  snapshot() {
    return {
      phase: this.phase,
      round: this.round,
      currentId: this.currentId,
      actor: this.actor?.name ?? null,
      persona: this.currentPersona?.name ?? null,
      extraId: this.extraId,
      batonChain: this.batonChain,
      batonBoost: this.batonBoost,
      party: this.party.map(p => ({
        id: p.id,
        name: p.name,
        hp: p.hp,
        maxHp: p.maxHp,
        sp: p.sp,
        maxSp: p.maxSp,
        activeMask: p.activeMask,
        activePersona: p.activePersona?.name,
        guarding: p.guarding,
      })),
      enemies: this.enemies.map(e => ({
        id: e.id,
        name: e.name,
        hp: e.hp,
        maxHp: e.maxHp,
        status: e.status,
        statusTurns: e.statusTurns,
        down: e.down,
        weakness: e.weakness,
        personality: e.personality,
        enraged: e.enraged,
        recruit: e.recruit?.name,
        knownAffinities: { ...e.knownAffinities },
      })),
      result: this.result,
      log: [...this.log],
    };
  }
}

export { buildBattlePersona, catalogPersonaChoices, setPersonaOverride };
