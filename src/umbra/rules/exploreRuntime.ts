import type { DirectorEvent, DirectorSpeed } from '../director';
import {
  moveExplore,
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
