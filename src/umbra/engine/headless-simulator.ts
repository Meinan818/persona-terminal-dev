import { createDefaultBattle } from './p5-combat-rules';

export type BattlePolicy = 'basic' | 'weakness' | 'advanced' | 'random';

export interface HeadlessBattleOptions {
  seed: number;
  policy?: BattlePolicy;
  maxRounds?: number;
  enemySpecs?: unknown[];
  activePersonaId?: string;
  heroPersonaIds?: string[];
  allyPersonaIds?: string[];
}

export interface HeadlessBattleResult {
  seed: number;
  policy: BattlePolicy;
  phase: string;
  rounds: number;
  actionCount: number;
  victory: boolean;
  defeated: boolean;
  result: unknown;
  snapshot: Record<string, unknown>;
  actions: string[];
}

/** Deterministic PRNG: same seed always produces the same stream. */
export function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const terminalPhase = (phase: string): boolean => (
  phase === 'victory' || phase === 'defeat' || phase === 'result'
);

const actorSkills = (battle: any): any[] => {
  const actor = battle.actor;
  if (!actor) return [];
  return actor.isPlayer
    ? actor.masks[actor.activeMask]?.skills ?? []
    : actor.skills ?? [];
};

function pickAction(battle: any, policy: BattlePolicy, rng: () => number): Record<string, unknown> | null {
  if (battle.phase === 'holdUp') {
    return policy === 'basic' ? { type: 'continue' } : { type: 'allOut' };
  }
  if (battle.phase !== 'party' || !battle.actor) return null;

  const enemies = battle.aliveEnemies ?? [];
  const target = enemies[0];
  if (!target) return null;

  if (policy === 'weakness') {
    const actor = battle.actor;
    const skill = actorSkills(battle).find((item: any) => (
      item.element === target.weakness
      && (item.power ?? 0) > 0
      && actor.sp >= (item.sp ?? 0)
    ));
    if (skill) return { type: 'skill', id: skill.id, targetId: target.id };
    return { type: 'basic', targetId: target.id };
  }

  if (policy === 'advanced') {
    const actor = battle.actor;
    const skills = actorSkills(battle);
    const weakSkill = skills.find((item: any) => (
      item.element === target.weakness
      && (item.power ?? 0) > 0
      && actor.sp >= (item.sp ?? 0)
    ));
    if (weakSkill) return { type: 'skill', id: weakSkill.id, targetId: target.id };

    const switchAction = (battle.actions ?? []).find((item: any) => (
      item.type === 'switchMask'
      && actor.masks?.[item.id]?.skills?.some((skill: any) => skill.element === target.weakness)
    ));
    if (switchAction) return switchAction;

    const baton = (battle.actions ?? []).find((item: any) => item.type === 'batonPass');
    if (baton) return baton;

    return { type: 'basic', targetId: target.id };
  }

  if (policy === 'random') {
    const actions = battle.actions ?? [];
    const usable = actions.filter((action: any) => !action.disabled);
    if (!usable.length) return { type: 'guard' };
    const action = usable[Math.floor(rng() * usable.length)];
    return action.type === 'basic' || action.type === 'skill' || action.type === 'gun'
      ? { ...action, targetId: target.id }
      : action;
  }

  return { type: 'basic', targetId: target.id };
}

/**
 * Pure, DOM-free battle harness for balance calibration. It drives the same
 * `createDefaultBattle` rule object used by the formal runtime and never touches
 * Pixi, localStorage, or React.
 */
export function runHeadlessBattle(options: HeadlessBattleOptions): HeadlessBattleResult {
  const policy = options.policy ?? 'basic';
  const maxRounds = Math.max(1, options.maxRounds ?? 100);
  const rng = mulberry32(options.seed);
  const battle: any = (createDefaultBattle as any)({
    rng,
    activePersonaId: options.activePersonaId,
    heroPersonaIds: options.heroPersonaIds,
    allyPersonaIds: options.allyPersonaIds,
    enemies: options.enemySpecs,
  });

  const actions: string[] = [];
  let actionCount = 0;
  let guard = 0;
  const maxActions = maxRounds * 20;

  while (!terminalPhase(battle.phase) && guard < maxRounds && actionCount < maxActions) {
    const action = pickAction(battle, policy, rng);
    if (!action) break;
    let response: any;
    if (battle.phase === 'holdUp') response = battle.holdUp(action);
    else if (battle.phase === 'negotiation') response = battle.chooseResult('reward');
    else if (battle.phase === 'result') break;
    else response = battle.act(action);
    actionCount += 1;
    actions.push(response?.ok ? String(action.type ?? 'unknown') : `invalid:${action.type ?? 'unknown'}`);
    if (!response?.ok) guard += 1;
    else guard = 0;
  }

  const snapshot = battle.snapshot();
  const phase = String(battle.phase ?? '');
  const result = battle.result ?? snapshot.result ?? null;
  return {
    seed: options.seed,
    policy,
    phase,
    rounds: Number(snapshot.round ?? 0),
    actionCount,
    victory: phase === 'victory' || phase === 'result',
    defeated: phase === 'defeat',
    result,
    snapshot,
    actions,
  };
}
