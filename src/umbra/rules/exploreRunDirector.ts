import {
  DIRECTOR_LIMITS,
  scaledDuration,
  type DirectorEvent,
  type DirectorLevel,
  type DirectorSpeed,
} from '../director';
import { exploreDirectorEvent } from './exploreEvents';
import type { ExploreRun } from './exploreRun';

const ENCOUNTER_START_MS = 900;

const isBattleNode = (kind: string): boolean => (
  kind === 'mob' || kind === 'elite' || kind === 'guardian' || kind === 'boss'
);

export function directorEventsForExploreNode(
  run: ExploreRun,
  speed: DirectorSpeed = 1,
  level: DirectorLevel = 'full',
): DirectorEvent[] {
  const node = run.plan.nodes[run.index];
  if (!node) return [];

  if (isBattleNode(node.kind)) {
    const budget = level === 'minimal'
      ? DIRECTOR_LIMITS.encounterStartComboMinimal
      : DIRECTOR_LIMITS.encounterStartCombo;
    const total = scaledDuration(budget, speed);
    const encounterMs = Math.min(Math.round(ENCOUNTER_START_MS / speed), Math.max(1, total - 1));
    const battleStartMs = Math.max(1, total - encounterMs);
    return [
      {
        id: `encounter:${node.id}`,
        name: 'map:encounter',
        durationMs: encounterMs,
        track: 'main',
      },
      {
        id: `battle-start:${node.id}`,
        name: 'battle:start',
        durationMs: battleStartMs,
        track: 'overlap',
      },
    ];
  }

  const eventName = node.kind === 'chest' || node.kind === 'trap'
    ? 'explore:interact'
    : node.kind === 'safe'
      ? 'explore:cover'
      : 'explore:move';
  return [exploreDirectorEvent(eventName, speed, node.id)];
}

export function directorEventForExploreNode(
  run: ExploreRun,
  speed: DirectorSpeed = 1,
): DirectorEvent | null {
  const node = run.plan.nodes[run.index];
  if (!node) return null;
  if (isBattleNode(node.kind)) {
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
