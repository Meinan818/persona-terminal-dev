export type ExploreNodeKind =
  | 'mob'
  | 'elite'
  | 'guardian'
  | 'boss'
  | 'safe'
  | 'chest'
  | 'trap'
  | 'interact';

export interface ExplorePlanNode {
  id: string;
  kind: ExploreNodeKind;
}

export interface ExplorePlan {
  floor: number;
  seed: number;
  nodes: ExplorePlanNode[];
}

const mulberry = (seed: number): (() => number) => {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export function buildExplorePlan(seed: number, floor = 1): ExplorePlan {
  const rng = mulberry(seed);
  const optionalPool: ExploreNodeKind[] = ['chest', 'trap', 'interact', 'safe'];
  const extras = Math.max(2, Math.floor(floor / 3));
  const nodes: ExplorePlanNode[] = [
    { id: 'start', kind: 'mob' },
    { id: 'elite', kind: 'elite' },
  ];
  for (let index = 0; index < extras; index += 1) {
    const kind = optionalPool[Math.floor(rng() * optionalPool.length)];
    nodes.push({ id: `extra-${index + 1}`, kind });
  }
  nodes.push(
    { id: 'guardian', kind: 'guardian' },
    { id: 'boss', kind: 'boss' },
    { id: 'exit', kind: 'safe' },
  );
  return { floor, seed, nodes };
}

export function planBattleCount(plan: ExplorePlan): number {
  return plan.nodes.filter(node => ['mob', 'elite', 'guardian', 'boss'].includes(node.kind)).length;
}
