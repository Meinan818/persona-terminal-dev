/** Shared length for new runs; saved runs retain their own maxFloor. */
export const DUNGEON_FLOORS = 40;
export const safeFloorsFor = (maxFloor: number = DUNGEON_FLOORS): number[] => Array.from(
  { length: Math.max(0, Math.floor((maxFloor - 1) / 10)) }, (_, index) => (index + 1) * 10,
);
export const SAFE_FLOORS = safeFloorsFor();
export const CALLING_FLOOR = DUNGEON_FLOORS - 1;
