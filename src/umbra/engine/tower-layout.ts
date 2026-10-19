// @ts-nocheck -- 从已通过 234 项 Demo 测试的纯规则模块机械迁移；类型收口随 U2 后续节点完成。
/** Shared length for new runs; saved runs retain their own maxFloor. */
export const DUNGEON_FLOORS = 40;
export const safeFloorsFor = (maxFloor = DUNGEON_FLOORS) => Array.from(
  { length: Math.max(0, Math.floor((maxFloor - 1) / 10)) }, (_, index) => (index + 1) * 10,
);
export const SAFE_FLOORS = safeFloorsFor();
export const CALLING_FLOOR = DUNGEON_FLOORS - 1;
