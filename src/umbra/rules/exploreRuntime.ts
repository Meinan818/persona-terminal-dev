import type { DirectorEvent, DirectorSpeed } from '../director';
import {
  coverExplore,
  interactExplore,
  moveExplore,
  spotExplore,
  type ExploreDirection,
  type ExploreState,
} from './explore';
import { exploreDirectorEvent } from './exploreEvents';

export interface ExploreRuntimeMove {
  ok: boolean;
  reason?: string;
  state: ExploreState;
  event?: DirectorEvent;
}

export function handleExploreCover(
  state: ExploreState,
  speed: DirectorSpeed = 1,
): ExploreRuntimeMove {
  const result = coverExplore(state);
  return result.ok
    ? { ok: true, state: result.state, event: exploreDirectorEvent('explore:cover', speed) }
    : { ok: false, state };
}

export function handleExploreSpot(
  state: ExploreState,
  enemyId: string,
  speed: DirectorSpeed = 1,
): ExploreRuntimeMove {
  const next = spotExplore(state, enemyId);
  const event = exploreDirectorEvent('explore:spotted', speed, `spotted:${enemyId}`);
  return { ok: true, state: next, event };
}

export function handleExploreInteract(
  state: ExploreState,
  speed: DirectorSpeed = 1,
): ExploreRuntimeMove {
  const result = interactExplore(state);
  return result.ok
    ? { ok: true, state: result.state, event: exploreDirectorEvent('explore:interact', speed) }
    : { ok: false, state };
}

export function handleExploreMove(
  state: ExploreState,
  direction: ExploreDirection,
  speed: DirectorSpeed = 1,
): ExploreRuntimeMove {
  const result = moveExplore(state, direction);
  return result.ok
    ? {
      ok: true,
      state: result.state,
      event: exploreDirectorEvent('explore:move', speed, `move:${direction}`),
    }
    : { ok: false, reason: result.reason, state: result.state };
}
