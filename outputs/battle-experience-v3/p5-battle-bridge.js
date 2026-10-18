/**
 * Tower encounter -> P5Battle -> blue-demo presentation bridge.
 *
 * The engine owns turns, party members, targets and outcomes. This module only
 * translates catalog-backed encounters and snapshots into plain data the demo
 * can render without duplicating battle rules in app.js.
 */
import {
  createDefaultBattle,
  buildBattlePersona,
} from './p5-combat-rules.js';
import {
  getPersona,
  recruitCandidates,
} from './p5r-compendium.js';

export const DEFAULT_HERO_MASKS = [
  'arsene',
  'pixie',
  'jack-o-lantern',
  'silky',
  'succubus',
  'izanagi',
];

export const DEFAULT_ALLY_PERSONAS = ['cait-sith', 'agathion', 'kelpie'];

const ELEMENTS = ['electric', 'bless', 'fire', 'ice', 'wind', 'psy', 'nuclear', 'curse'];
const ATTACK_ELEMENTS = {
  electric: 'phys',
  bless: 'curse',
  fire: 'ice',
  ice: 'fire',
  wind: 'electric',
  psy: 'nuclear',
  nuclear: 'psy',
  curse: 'bless',
  phys: 'phys',
  gun: 'gun',
  almighty: 'almighty',
};
const PERSONALITY_BY_ELEMENT = {
  electric: 'proud',
  bless: 'calm',
  fire: 'wrathful',
  ice: 'cowardly',
  wind: 'cowardly',
  psy: 'calm',
  nuclear: 'proud',
  curse: 'greedy',
};
const ELEMENT_LABELS = {
  phys: '物理',
  gun: '枪击',
  fire: '火焰',
  ice: '冰冻',
  electric: '电击',
  wind: '疾风',
  psy: '念动',
  nuclear: '核热',
  bless: '祝福',
  curse: '咒怨',
  almighty: '万能',
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function normalizedElement(element, fallback = 'electric') {
  return ELEMENTS.includes(element) ? element : fallback;
}

function rowRecruit(weakness, level) {
  return recruitCandidates(weakness, level)[0]?.id ?? null;
}

function primaryEnemySpec({ encounter, floor, boss }) {
  const weakness = normalizedElement(encounter?.weakness);
  const level = Math.max(1, Number(encounter?.level) || floor || 1);
  const baseHp = Number(encounter?.maxHp) || (boss ? 180 + floor * 12 : 44 + floor * 6);
  const baseAttack = Number(encounter?.attack) || (boss ? 26 : 8 + floor * 2);
  const baseDefense = Number(encounter?.defense) || (boss ? 12 : 3 + floor);
  return {
    id: 'primary',
    name: encounter?.name || (boss ? '回声的执念' : '诡辩之影'),
    level,
    maxHp: boss ? Math.max(baseHp, 220) : baseHp,
    attack: boss ? Math.max(baseAttack, 28) : baseAttack,
    defense: boss ? Math.max(baseDefense, 12) : baseDefense,
    element: ATTACK_ELEMENTS[weakness] ?? 'phys',
    weakness,
    resist: weakness === 'curse' ? 'fire' : weakness === 'bless' ? 'curse' : null,
    personality: PERSONALITY_BY_ELEMENT[weakness] ?? 'proud',
    recruitPersonaId: encounter?.recruitPersonaId ?? rowRecruit(weakness, level),
    reward: {
      sp: Math.max(12, Math.round((Number(encounter?.level) || floor) * 3)),
      item: boss ? '执念的残片' : '回声碎片',
    },
  };
}

function secondaryEnemySpec({ encounter, floor }) {
  const main = normalizedElement(encounter?.weakness);
  const candidates = ['electric', 'fire', 'ice', 'curse'].filter(element => element !== main);
  const weakness = candidates[Math.max(0, floor - 2) % candidates.length];
  const level = Math.max(1, (Number(encounter?.level) || floor) - 1);
  return {
    id: 'echo',
    name: '游荡的回声',
    level,
    maxHp: Math.max(30, Math.round((Number(encounter?.maxHp) || 50 + floor * 6) * 0.55)),
    attack: Math.max(8, Math.round((Number(encounter?.attack) || 8 + floor * 2) * 0.72)),
    defense: Math.max(2, Math.round((Number(encounter?.defense) || 3 + floor) * 0.7)),
    element: ATTACK_ELEMENTS[weakness] ?? 'gun',
    weakness,
    personality: PERSONALITY_BY_ELEMENT[weakness] ?? 'cowardly',
    recruitPersonaId: rowRecruit(weakness, level),
    reward: { sp: 12, item: '游荡的碎片' },
  };
}

export function createTowerBattle({
  encounter = {},
  floor = 4,
  boss = false,
  rng = Math.random,
  heroPersonaIds = DEFAULT_HERO_MASKS,
  activePersonaId,
  allyPersonaIds = DEFAULT_ALLY_PERSONAS,
  heroHp,
  heroSp,
  partyVitals = {},
  equipmentBonuses = {},
} = {}) {
  const enemies = [primaryEnemySpec({ encounter, floor, boss })];
  if (!boss) enemies.push(secondaryEnemySpec({ encounter, floor }));
  const validHeroes = heroPersonaIds.filter(id => Boolean(buildBattlePersona(id)));
  const fallbackMask = validHeroes[0] ?? DEFAULT_HERO_MASKS[0];
  const battle = createDefaultBattle({
    rng,
    heroPersonaIds: validHeroes.length ? validHeroes : [fallbackMask],
    activePersonaId: activePersonaId && validHeroes.includes(activePersonaId)
      ? activePersonaId
      : fallbackMask,
    allyPersonaIds: allyPersonaIds.filter(id => Boolean(buildBattlePersona(id))),
    enemies,
  });
  const hero = battle.party.find(member => member.isPlayer);
  if (hero) {
    hero.attackBonus = Number(equipmentBonuses.attack) || 0;
    hero.defenseBonus = Number(equipmentBonuses.defense) || 0;
    const hpBonus = Number(equipmentBonuses.hp) || 0;
    const spBonus = Number(equipmentBonuses.sp) || 0;
    if (hpBonus) {
      hero.maxHp += hpBonus;
      hero.hp = Math.min(hero.maxHp, hero.hp + hpBonus);
    }
    if (spBonus) {
      hero.maxSp += spBonus;
      hero.sp = Math.min(hero.maxSp, hero.sp + spBonus);
    }
    if (Number.isFinite(heroHp)) hero.hp = clamp(Number(heroHp), 1, hero.maxHp);
    if (Number.isFinite(heroSp)) hero.sp = clamp(Number(heroSp), 0, hero.maxSp);
  }
  for (const member of battle.party) {
    if (member.isPlayer) continue;
    const vitals = partyVitals[member.id];
    if (!vitals) continue;
    if (Number.isFinite(vitals.hp)) member.hp = clamp(Number(vitals.hp), 0, member.maxHp);
    if (Number.isFinite(vitals.sp)) member.sp = clamp(Number(vitals.sp), 0, member.maxSp);
  }
  return battle;
}

function selectTarget(battle, selectedTargetId) {
  const alive = battle.aliveEnemies;
  return alive.find(enemy => enemy.id === selectedTargetId)
    ?? alive[0]
    ?? battle.enemies.find(enemy => enemy.id === selectedTargetId)
    ?? battle.enemies[0]
    ?? null;
}

function affinityView(enemy) {
  return Object.entries(enemy?.knownAffinities ?? {}).map(([element, affinity]) => ({
    element,
    label: ELEMENT_LABELS[element] ?? element,
    affinity,
    short: affinity === 'weak' ? '弱'
      : affinity === 'resist' ? '耐'
        : affinity === 'null' ? '无'
          : affinity === 'absorb' ? '吸'
            : affinity === 'repel' ? '反'
              : '普',
  }));
}

export function buildBattleView(battle, selectedTargetId) {
  if (!battle) return null;
  const actor = battle.actor;
  const target = selectTarget(battle, selectedTargetId);
  const persona = battle.currentPersona;
  const hero = battle.party.find(member => member.isPlayer);
  return {
    round: battle.round,
    phase: battle.phase,
    holdUp: battle.phase === 'holdUp',
    extraPending: battle.extraPending,
    batonChain: battle.batonChain,
    actorId: actor?.id ?? null,
    actorName: actor?.name ?? null,
    actorIsPlayer: Boolean(actor?.isPlayer),
    actorHp: actor?.hp ?? 0,
    actorMaxHp: actor?.maxHp ?? 1,
    actorSp: actor?.sp ?? 0,
    actorMaxSp: actor?.maxSp ?? 1,
    actorPersona: persona?.name ?? null,
    actorPersonaId: persona?.id ?? null,
    actorPersonaLevel: persona?.level ?? null,
    actorPersonaArcana: persona?.arcana ?? null,
    actorPersonaStats: persona ? {
      strength: persona.strength,
      magic: persona.magic,
      endurance: persona.endurance,
      agility: persona.agility,
      luck: persona.luck,
    } : null,
    actorPersonaResistances: persona?.resistances ?? {},
    hudHp: actor?.hp ?? hero?.hp ?? 0,
    hudMaxHp: actor?.maxHp ?? hero?.maxHp ?? 1,
    hudSp: actor?.sp ?? hero?.sp ?? 0,
    hudMaxSp: actor?.maxSp ?? hero?.maxSp ?? 1,
    selectedTargetId: target?.id ?? null,
    selectedTarget: target ? {
      id: target.id,
      name: target.name,
      level: target.level,
      hp: target.hp,
      maxHp: target.maxHp,
      attack: target.attack,
      defense: target.defense,
      element: target.element,
      elementLabel: ELEMENT_LABELS[target.element] ?? target.element,
      down: target.down,
      status: target.status,
      statusTurns: target.statusTurns,
      enraged: target.enraged,
      personality: target.personality,
      intent: target.intent
        ? { label: target.intent.label, elementLabel: target.intent.elementLabel, power: target.intent.power }
        : null,
      knownAffinities: affinityView(target),
      weaknessKnown: target.knownAffinities?.[target.weakness] === 'weak',
    } : null,
    party: battle.party.map(member => ({
      id: member.id,
      name: member.name,
      hp: member.hp,
      maxHp: member.maxHp,
      sp: member.sp,
      maxSp: member.maxSp,
      isPlayer: Boolean(member.isPlayer),
      active: member.id === actor?.id,
      down: member.hp <= 0,
      guarding: member.guarding,
      persona: member.isPlayer
        ? member.masks[member.activeMask]?.name
        : member.activePersona?.name,
    })),
    enemies: battle.enemies.map(enemy => ({
      id: enemy.id,
      name: enemy.name,
      level: enemy.level,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      element: enemy.element,
      elementLabel: ELEMENT_LABELS[enemy.element] ?? enemy.element,
      down: enemy.down,
      status: enemy.status,
      statusTurns: enemy.statusTurns,
      enraged: enemy.enraged,
      intent: enemy.intent
        ? { label: enemy.intent.label, elementLabel: enemy.intent.elementLabel, power: enemy.intent.power }
        : null,
      active: enemy.id === target?.id,
      alive: enemy.hp > 0,
      knownAffinities: affinityView(enemy),
    })),
    masks: actor?.isPlayer
      ? Object.values(actor.masks).map(mask => ({
          id: mask.id,
          name: mask.name,
          level: mask.level,
          element: mask.elementLabel ?? ELEMENT_LABELS[mask.element] ?? mask.element,
          active: mask.id === actor.activeMask,
        }))
      : [],
    activeMaskId: actor?.isPlayer ? actor.activeMask : null,
    showtimeUsed: Boolean(battle.showtimeUsed),
    actions: battle.actions.map(action => ({ ...action })),
    logs: battle.log.slice(-9),
    result: battle.result,
  };
}

export function buildActionPayload(action, targetId) {
  if (!action) return null;
  const payload = { type: action.type };
  if (action.id) payload.id = action.id;
  if (action.targetId) payload.targetId = action.targetId;
  if (
    targetId
    && ['skill', 'basic', 'gun', 'analyze'].includes(action.type)
    && !action.targetId
  ) payload.targetId = targetId;
  return payload;
}

export function applyBattleReward(battle, result) {
  if (!battle || !result) return 0;
  const reward = Number(result.sp) || 0;
  if (reward <= 0) return 0;
  const hero = battle.party.find(member => member.isPlayer);
  if (!hero) return 0;
  const before = hero.sp;
  hero.sp = clamp(hero.sp + reward, 0, hero.maxSp);
  return hero.sp - before;
}

export function applyBattleItem(battle, item, { targetId } = {}) {
  if (!battle || !item) return { ok: false, reason: '没有这件道具。' };
  if (battle.phase !== 'party' || !battle.actor) return { ok: false, reason: '现在不能使用道具。' };
  const actor = battle.actor;
  const chooseTarget = () => battle.party.find(member => member.id === targetId)
    ?? actor
    ?? battle.aliveParty[0];
  let target = null;
  let amount = 0;
  if (item.kind === 'heal') {
    target = chooseTarget();
    if (!target || target.hp <= 0) return { ok: false, reason: '需要选择一名站着的同伴。' };
    const before = target.hp;
    target.hp = Math.min(target.maxHp, target.hp + (Number(item.hp) || 0));
    amount = target.hp - before;
  } else if (item.kind === 'sp') {
    target = chooseTarget();
    if (!target || target.hp <= 0) return { ok: false, reason: '需要选择一名站着的同伴。' };
    const before = target.sp;
    target.sp = Math.min(target.maxSp, target.sp + (Number(item.sp) || 0));
    amount = target.sp - before;
  } else if (item.kind === 'revive') {
    target = battle.party.find(member => member.hp <= 0);
    if (!target) return { ok: false, reason: '没有倒下的同伴。' };
    target.hp = Math.max(1, Math.round(target.maxHp * (item.pct ?? 0.5)));
    amount = target.hp;
  } else if (item.kind === 'cure') {
    target = chooseTarget();
    if (!target) return { ok: false, reason: '没有可解除异常的目标。' };
    target.status = null;
  } else {
    return { ok: false, reason: '这件道具不能在战斗中使用。' };
  }
  const effectText = item.kind === 'heal'
    ? (amount ? `恢复 ${amount} HP` : 'HP 已满')
    : item.kind === 'sp'
      ? (amount ? `恢复 ${amount} SP` : 'SP 已满')
      : item.kind === 'revive'
        ? `以 ${amount} HP 复活`
        : '异常解除';
  battle.push(`${actor.name} 使用「${item.name}」→ ${target?.name ?? '目标'} ${effectText}。`);
  battle.finishActor(actor);
  return { ok: true, item, targetId: target?.id ?? actor.id, amount, kind: item.kind };
}

export function syncAppState(battle, state, selectedTargetId) {
  if (!battle) return null;
  const view = buildBattleView(battle, selectedTargetId);
  const hero = view.party.find(member => member.isPlayer);
  state.hp = hero?.hp ?? 0;
  state.sp = hero?.sp ?? 0;
  state.heroMaxHp = hero?.maxHp ?? state.heroMaxHp ?? 390;
  state.heroMaxSp = hero?.maxSp ?? state.heroMaxSp ?? 260;
  state.enemyHp = view.selectedTarget?.hp ?? 0;
  state.enemyMaxHp = view.selectedTarget?.maxHp ?? 1;
  state.stagger = view.selectedTarget?.down ? 2 : 0;
  state.turn = view.round;
  state.turnPhase = view.phase === 'party' ? 'player' : 'enemy';
  state.currentActorId = view.actorId;
  state.currentActorName = view.actorName;
  state.battlePhase = view.phase;
  state.log = view.logs.at(-1) ?? state.log;
  state.partyVitals = Object.fromEntries(view.party.map(member => [
    member.id,
    { hp: member.hp, sp: member.sp },
  ]));
  return view;
}

export function battleReceipt(battle) {
  if (!battle) return { won: false, phase: null, summary: '没有进行中的战斗。' };
  const result = battle.result;
  const won = ['victory', 'result', 'negotiation'].includes(battle.phase)
    || ['recruited', 'reward'].includes(result?.type);
  const recruited = result?.type === 'recruited' ? {
    id: result.personaId,
    name: result.name,
    skillName: result.skillName,
    skillDesc: result.skillDesc,
  } : null;
  const reward = result?.type === 'reward' ? {
    sp: Number(result.sp) || 0,
    item: result.item ?? '战利品',
  } : null;
  const summary = recruited
    ? `与影子达成交易，收服 ${recruited.name}。`
    : reward
      ? `与影子达成交易，取得 ${reward.item}${reward.sp ? ` 与 ${reward.sp} SP` : ''}。`
      : won
        ? '挡路的影子，散了。'
        : battle.phase === 'defeat'
          ? '全员倒下，今晚的探索暂时结束。'
          : '战斗尚未结束。';
  return {
    won,
    phase: battle.phase,
    result,
    recruited,
    reward,
    drops: battle.enemies
      .filter(enemy => enemy.hp <= 0 && enemy.reward)
      .map(enemy => ({ ...enemy.reward })),
    summary,
    rounds: battle.round,
    log: battle.log.slice(-4),
  };
}

export function promoteBossPhase(battle, { phase = 2 } = {}) {
  if (!battle) return null;
  const enemy = battle.aliveEnemies[0] ?? battle.enemies[0];
  if (!enemy) return null;
  enemy.maxHp = Math.max(enemy.maxHp + 80, Math.round(enemy.maxHp * 1.45));
  enemy.hp = enemy.maxHp;
  enemy.attack = Math.max(enemy.attack + 8, Math.round(enemy.attack * 1.2));
  enemy.defense = Math.max(enemy.defense + 3, Math.round(enemy.defense * 1.15));
  enemy.down = false;
  enemy.status = null;
  enemy.enraged = false;
  enemy.debuffs = {};
  enemy.knownAffinities = {};
  battle.phase = 'party';
  battle.result = null;
  battle.round += 1;
  battle.currentId = battle.party.find(member => member.isPlayer)?.id
    ?? battle.aliveParty[0]?.id;
  battle.extraId = null;
  battle.extraPending = false;
  battle.currentIsExtra = false;
  battle.batonChain = 0;
  battle.batonBoost = 0;
  for (const member of battle.party) {
    member.acted = false;
    member.guarding = false;
    member.oneMoreUsed = false;
    member.switched = false;
  }
  battle.push(`第 ${phase} 形态展开，敌人的耐性重新变得未知。`);
  return enemy;
}

export function activeHeroPersonaId(heroPersonaIds, maskIndex = 0) {
  return heroPersonaIds[Math.max(0, maskIndex) % heroPersonaIds.length]
    ?? DEFAULT_HERO_MASKS[0];
}

export function personaDisplayName(personaId) {
  return getPersona(personaId)?.name ?? personaId;
}
