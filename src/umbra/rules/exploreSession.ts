export type ExploreBattleKind = 'mob' | 'elite' | 'guardian' | 'boss';

export interface ExploreSession {
  floor: number;
  battles: number;
  guardianDefeated: boolean;
  eliteDefeated: boolean;
  bossDefeated: boolean;
}

export const MIN_EXPLORE_BATTLES = 4;

export function createExploreSession(floor = 1): ExploreSession {
  return {
    floor: Math.max(1, Math.floor(floor)),
    battles: 0,
    guardianDefeated: false,
    eliteDefeated: false,
    bossDefeated: false,
  };
}

export function recordExploreBattle(
  session: ExploreSession,
  kind: ExploreBattleKind,
): ExploreSession {
  const next = { ...session, battles: session.battles + 1 };
  if (kind === 'guardian') next.guardianDefeated = true;
  if (kind === 'elite') next.eliteDefeated = true;
  if (kind === 'boss') next.bossDefeated = true;
  return next;
}

export function canExitExplore(session: ExploreSession): boolean {
  return session.guardianDefeated && session.battles >= MIN_EXPLORE_BATTLES;
}
