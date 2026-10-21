import type { DirectorEvent, DirectorSpeed } from '../director';

export type ExploreEventName = 'explore:move' | 'explore:cover' | 'explore:spotted' | 'explore:interact';

export const EXPLORE_EVENT_DURATIONS: Record<ExploreEventName, number> = {
  'explore:move': 800,
  'explore:cover': 500,
  'explore:spotted': 900,
  'explore:interact': 600,
};

export function exploreDirectorEvent(
  name: ExploreEventName,
  speed: DirectorSpeed = 1,
  id?: string,
): DirectorEvent {
  return {
    id: id ?? name,
    name,
    durationMs: EXPLORE_EVENT_DURATIONS[name] / speed,
    track: 'main',
  };
}
