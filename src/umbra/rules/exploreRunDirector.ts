import type { DirectorEvent, DirectorSpeed } from '../director';
import { exploreDirectorEvent } from './exploreEvents';
import type { ExploreRun } from './exploreRun';

export function directorEventForExploreNode(
  run: ExploreRun,
  speed: DirectorSpeed = 1,
): DirectorEvent | null {
  const node = run.plan.nodes[run.index];
  if (!node) return null;
  if (node.kind === 'mob' || node.kind === 'elite' || node.kind === 'guardian' || node.kind === 'boss') {
    return {
      id: `encounter:${node.id}`,
      name: 'map:encounter',
      durationMs: 900 / speed,
      track: 'main',
    };
  }
  const eventName = node.kind === 'chest' || node.kind === 'trap'
    ? 'explore:interact'
    : node.kind === 'safe'
      ? 'explore:cover'
      : 'explore:move';
  return exploreDirectorEvent(eventName, speed, node.id);
}
