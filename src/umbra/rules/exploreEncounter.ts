import { generateEncounter, type EncounterEnemySpec, type EncounterKind } from './encounter';
import {
  buildExplorePlan,
  type ExplorePlan,
  type ExplorePlanNode,
} from './explorePlanner';

export function encounterKindForNode(node: ExplorePlanNode): EncounterKind | null {
  if (node.kind === 'mob') return 'mob';
  if (node.kind === 'elite' || node.kind === 'guardian') return 'elite';
  if (node.kind === 'boss') return 'boss';
  return null;
}

export function encounterForExploreNode(
  plan: ExplorePlan,
  nodeIndex: number,
  rng: () => number = Math.random,
): EncounterEnemySpec[] | null {
  const node = plan.nodes[nodeIndex];
  if (!node) return null;
  const kind = encounterKindForNode(node);
  if (!kind) return null;
  return generateEncounter({
    kind,
    floor: plan.floor,
    alert: kind === 'boss' ? 70 : kind === 'elite' ? 45 : 20,
    rng,
  });
}

export function explorePlanWithEncounters(seed: number, floor = 1): {
  plan: ExplorePlan;
  battleCount: number;
} {
  const plan = buildExplorePlan(seed, floor);
  const battleCount = plan.nodes.filter(node => encounterKindForNode(node)).length;
  return { plan, battleCount };
}
