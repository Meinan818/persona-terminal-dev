import { encounterForExploreNode } from './exploreEncounter';
import {
  buildExplorePlan,
  type ExplorePlan,
  type ExplorePlanNode,
} from './explorePlanner';
import {
  canExitExplore,
  createExploreSession,
  recordExploreBattle,
  type ExploreBattleKind,
  type ExploreSession,
} from './exploreSession';

export interface ExploreRun {
  plan: ExplorePlan;
  index: number;
  session: ExploreSession;
}

export function createExploreRun(seed: number, floor = 1): ExploreRun {
  return {
    plan: buildExplorePlan(seed, floor),
    index: 0,
    session: createExploreSession(floor),
  };
}

export function currentExploreNode(run: ExploreRun): ExplorePlanNode | null {
  return run.plan.nodes[run.index] ?? null;
}

export function advanceExploreRun(run: ExploreRun): ExploreRun {
  const node = currentExploreNode(run);
  if (!node) return run;
  const next: ExploreRun = { ...run, index: run.index + 1 };
  if (['mob', 'elite', 'guardian', 'boss'].includes(node.kind)) {
    next.session = recordExploreBattle(run.session, node.kind as ExploreBattleKind);
  }
  return next;
}

export function isExploreRunComplete(run: ExploreRun): boolean {
  return run.index >= run.plan.nodes.length && canExitExplore(run.session);
}

export function encounterForCurrentNode(
  run: ExploreRun,
  rng: () => number = Math.random,
) {
  return encounterForExploreNode(run.plan, run.index, rng);
}
