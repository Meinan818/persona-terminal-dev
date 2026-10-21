export type ExploreCellType =
  | 'empty'
  | 'cover'
  | 'wall'
  | 'guard'
  | 'chest'
  | 'interact'
  | 'exit'
  | 'enemy';

export type ExploreDirection = 'up' | 'down' | 'left' | 'right';

export interface ExploreCell {
  x: number;
  y: number;
  type: ExploreCellType;
  blocked: boolean;
  seen: boolean;
}

export interface ExploreActor {
  id: string;
  x: number;
  y: number;
  facing: ExploreDirection;
  covered: boolean;
  aware: boolean;
}

export interface ExploreState {
  width: number;
  height: number;
  cells: ExploreCell[];
  player: ExploreActor;
  enemies: ExploreActor[];
  turn: number;
  spottedIds: string[];
}

const DELTA: Record<ExploreDirection, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const cellKey = (x: number, y: number): string => `${x},${y}`;

export function createExploreState(width: number, height: number, walls: [number, number][] = []): ExploreState {
  const blocked = new Set(walls.map(([x, y]) => cellKey(x, y)));
  const cells: ExploreCell[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const isWall = blocked.has(cellKey(x, y));
      cells.push({ x, y, type: isWall ? 'wall' : 'empty', blocked: isWall, seen: false });
    }
  }
  return {
    width,
    height,
    cells,
    player: { id: 'hero', x: 0, y: height - 1, facing: 'up', covered: false, aware: false },
    enemies: [],
    turn: 0,
    spottedIds: [],
  };
}

export function setExploreCell(
  state: ExploreState,
  x: number,
  y: number,
  patch: Partial<ExploreCell>,
): ExploreState {
  return {
    ...state,
    cells: state.cells.map(cell => (
      cell.x === x && cell.y === y ? { ...cell, ...patch } : cell
    )),
  };
}

export function addExploreEnemy(state: ExploreState, enemy: ExploreActor): ExploreState {
  return { ...state, enemies: [...state.enemies, enemy] };
}

function inBounds(state: ExploreState, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < state.width && y < state.height;
}

function cellAt(state: ExploreState, x: number, y: number): ExploreCell | null {
  return state.cells.find(cell => cell.x === x && cell.y === y) ?? null;
}

export function moveExplore(
  state: ExploreState,
  direction: ExploreDirection,
): { ok: boolean; reason?: string; state: ExploreState; events: string[] } {
  const delta = DELTA[direction];
  const next = { x: state.player.x + delta.x, y: state.player.y + delta.y };
  if (!inBounds(state, next.x, next.y)) {
    return { ok: false, reason: 'outside', state, events: [] };
  }
  const cell = cellAt(state, next.x, next.y);
  if (!cell || cell.blocked) {
    return { ok: false, reason: 'blocked', state, events: [] };
  }
  const player = {
    ...state.player,
    x: next.x,
    y: next.y,
    facing: direction,
  };
  const events = ['explore:move'];
  const updated = {
    ...state,
    player,
    turn: state.turn + 1,
  };
  return { ok: true, state: updated, events };
}

export function coverExplore(state: ExploreState): { ok: boolean; state: ExploreState; events: string[] } {
  const cell = cellAt(state, state.player.x, state.player.y);
  if (!cell || cell.type !== 'cover') return { ok: false, state, events: [] };
  return {
    ok: true,
    state: { ...state, player: { ...state.player, covered: true } },
    events: ['explore:cover'],
  };
}

export function spotExplore(state: ExploreState, enemyId: string): ExploreState {
  if (state.spottedIds.includes(enemyId)) return state;
  const enemy = state.enemies.find(item => item.id === enemyId);
  if (!enemy) return state;
  const delta = DELTA[state.player.facing];
  const target = { x: state.player.x + delta.x, y: state.player.y + delta.y };
  const visible = target.x === enemy.x && target.y === enemy.y;
  return {
    ...state,
    spottedIds: visible ? [...state.spottedIds, enemyId] : state.spottedIds,
    enemies: state.enemies.map(item => item.id === enemyId ? { ...item, aware: item.aware || visible } : item),
  };
}

export function interactExplore(state: ExploreState): { ok: boolean; type?: ExploreCellType; state: ExploreState } {
  const cell = cellAt(state, state.player.x, state.player.y);
  if (!cell || !['chest', 'interact', 'exit'].includes(cell.type)) {
    return { ok: false, state };
  }
  return { ok: true, type: cell.type, state };
}

export function canBackstab(state: ExploreState, enemyId: string): boolean {
  const enemy = state.enemies.find(item => item.id === enemyId);
  if (!enemy) return false;
  const delta = DELTA[state.player.facing];
  return state.player.x + delta.x === enemy.x && state.player.y + delta.y === enemy.y;
}
