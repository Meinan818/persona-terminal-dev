// @ts-nocheck -- 从已通过 234 项 Demo 测试的纯规则模块机械迁移；类型收口随 U2 后续节点完成。
/**
 * 逆影战场 · 房间地图探索底层。
 *
 * 这一层不画 UI，只负责：
 * - 5×5 房间地图与迷雾
 * - 玩家移动、守卫/影子遭遇、钥匙与锁门
 * - 安全屋、宝箱、机关、出口
 * - 警戒值与探索回合
 *
 * UI 只读 state/rooms，调用 move/act，不直接改地图。
 */

import { DUNGEON_FLOORS } from './tower-layout.js';
import { chestTierForFloor } from './loot-rules.js';

export const FLOOR_WIDTH = 5;
export const FLOOR_HEIGHT = 5;
export const FLOOR_TIME = 16;

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const keyOf = (x, y) => `${x},${y}`;

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRoom(x, y, type = 'empty') {
  return {
    id: keyOf(x, y),
    x,
    y,
    type,
    revealed: false,
    cleared: !['guardian', 'shadow', 'chest', 'key', 'trap', 'event', 'exit'].includes(type),
    visited: false,
  };
}

function inBounds(x, y, width, height) {
  return x >= 0 && y >= 0 && x < width && y < height;
}

function reveal(state, x, y) {
  for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const room = state.map.rooms[keyOf(x + dx, y + dy)];
    if (room) room.revealed = true;
  }
}

export function createFloorMap({ floor = 1, maxFloor = DUNGEON_FLOORS, stratum = 'echo', seed = floor * 7919, width = FLOOR_WIDTH, height = FLOOR_HEIGHT } = {}) {
  const rng = seededRandom(seed);
  const rooms = {};
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) rooms[keyOf(x, y)] = makeRoom(x, y);
  }

  const start = { x: 0, y: height - 1 };
  const exit = { x: width - 1, y: 0 };
  const path = [{ ...start }];
  let x = start.x;
  let y = start.y;
  while (x !== exit.x || y !== exit.y) {
    if (x === exit.x) y -= 1;
    else if (y === exit.y) x += 1;
    else if (rng() < 0.5) x += 1;
    else y -= 1;
    path.push({ x, y });
  }

  const pathIds = new Set(path.map(point => keyOf(point.x, point.y)));
  const sideRooms = Object.values(rooms)
    .filter(room => !pathIds.has(room.id))
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const usedSide = new Set();
  const placeSide = () => {
    const candidates = sideRooms.filter(room => !usedSide.has(room.id));
    if (!candidates.length) return null;
    const room = candidates[Math.floor(rng() * candidates.length)];
    usedSide.add(room.id);
    return room;
  };

  const startRoom = rooms[keyOf(start.x, start.y)];
  startRoom.type = 'start';
  startRoom.cleared = true;

  const exitRoom = rooms[keyOf(exit.x, exit.y)];
  exitRoom.type = 'exit';
  exitRoom.cleared = false;

  const guardianPoint = path[Math.max(1, path.length - 2)];
  const guardianRoom = rooms[keyOf(guardianPoint.x, guardianPoint.y)];
  guardianRoom.type = 'guardian';
  guardianRoom.cleared = false;
  guardianRoom.blockBoss = floor % 10 === 0 && floor < maxFloor;

  const keyRoom = placeSide();
  if (keyRoom) {
    keyRoom.type = 'key';
    keyRoom.cleared = false;
  }

  if (floor % 10 === 0 && floor < maxFloor) {
    const safePoint = path[Math.max(1, Math.floor(path.length / 2))];
    const safeRoom = rooms[keyOf(safePoint.x, safePoint.y)];
    safeRoom.type = 'safe';
    safeRoom.cleared = true;
  }

  const chestKind = () => {
    if (floor >= 30 && rng() < 0.18) return 'trapped';
    return ['wood', 'silver', 'gold'][chestTier - 1];
  };
  const chestTier = chestTierForFloor(floor, 0, maxFloor);
  const chestRoom = placeSide();
  if (chestRoom) {
    chestRoom.type = 'chest';
    chestRoom.cleared = false;
    chestRoom.chestKind = chestKind();
    chestRoom.chestTier = chestTier;
  }
  const eventRoom = placeSide();
  if (eventRoom) eventRoom.type = 'event';
  const trapRoom = placeSide();
  if (trapRoom) {
    trapRoom.type = 'trap';
    trapRoom.cleared = false;
  }
  const shadowRoom = placeSide();
  if (shadowRoom) {
    shadowRoom.type = 'shadow';
    shadowRoom.cleared = false;
  }
  const secondShadow = placeSide();
  if (secondShadow) {
    secondShadow.type = 'shadow';
    secondShadow.cleared = false;
  }
  const secondChest = placeSide();
  if (secondChest) {
    secondChest.type = 'chest';
    secondChest.cleared = false;
    secondChest.chestKind = chestKind();
    secondChest.chestTier = chestTier;
  }

  return {
    floor,
    maxFloor,
    stratum,
    seed,
    width,
    height,
    rooms,
    start,
    exit,
    guardianId: guardianRoom.id,
    keyId: keyRoom?.id ?? null,
    path: path.map(point => keyOf(point.x, point.y)),
  };
}

export function createExplorationState(map, { maxTime = FLOOR_TIME, security = 0, keys = 0 } = {}) {
  const state = {
    map,
    player: { ...map.start },
    security: Math.max(0, Math.min(100, Number(security) || 0)),
    keys: Math.max(0, Number(keys) || 0),
    guardianDefeated: false,
    exitUnlocked: false,
    alert: security >= 100,
    turn: 0,
    maxTime: Math.max(1, Number(maxTime) || FLOOR_TIME),
    time: Math.max(0, Number(maxTime) || FLOOR_TIME),
    listened: new Set(),
    history: [],
    ended: null,
  };
  const startRoom = map.rooms[keyOf(state.player.x, state.player.y)];
  startRoom.visited = true;
  reveal(state, state.player.x, state.player.y);
  return state;
}

function bumpSecurity(state, amount) {
  state.security = Math.max(0, Math.min(100, state.security + amount));
  if (state.security >= 100) state.alert = true;
}

export function move(state, direction) {
  if (!state || state.ended) return { ok: false, reason: '探索已经结束。' };
  if (state.time <= 0) {
    state.ended = 'timeout';
    return { ok: false, reason: '这一层的月光已经用完了。' };
  }
  const delta = DIRECTIONS[direction];
  if (!delta) return { ok: false, reason: '没有这个方向。' };
  const next = { x: state.player.x + delta.x, y: state.player.y + delta.y };
  if (!inBounds(next.x, next.y, state.map.width, state.map.height)) {
    return { ok: false, reason: '前面是墙。' };
  }
  const room = state.map.rooms[keyOf(next.x, next.y)];
  if (!room) return { ok: false, reason: '前面是墙。' };
  if (room.type === 'exit' && !state.exitUnlocked) {
    const guardianRoom = state.map.rooms[state.map.guardianId];
    if (guardianRoom?.blockBoss && !state.guardianDefeated) {
      return { ok: false, reason: '区段守层者还站在门前，钥匙打不开。' };
    }
    if (state.keys > 0) {
      state.keys -= 1;
      state.exitUnlocked = true;
    } else {
      return { ok: false, reason: '门还锁着。先找到守卫或钥匙。' };
    }
  }
  if ((room.type === 'guardian' || room.type === 'shadow') && !room.cleared) {
    state.player = next;
    room.visited = true;
    reveal(state, next.x, next.y);
    bumpSecurity(state, 8);
    state.turn += 1;
    state.time = Math.max(0, state.time - 1);
    return { ok: true, room, encounter: { roomId: room.id, type: room.type, guardian: room.type === 'guardian' } };
  }

  state.player = next;
  room.visited = true;
  reveal(state, next.x, next.y);
  bumpSecurity(state, 1);
  state.turn += 1;
  state.time = Math.max(0, state.time - 1);
  state.history.push({ turn: state.turn, roomId: room.id, type: room.type });
  return { ok: true, room };
}

export function listen(state) {
  if (!state || state.ended) return { ok: false, reason: '探索已经结束。' };
  if (state.time <= 0) return { ok: false, reason: '这一层的月光已经用完了。' };
  state.time = Math.max(0, state.time - 1);
  state.turn += 1;
  bumpSecurity(state, 4);
  state.listened.add(`${state.player.x},${state.player.y}`);
  reveal(state, state.player.x, state.player.y);
  for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) {
    const room = state.map.rooms[keyOf(state.player.x + dx, state.player.y + dy)];
    if (room) room.revealed = true;
  }
  return { ok: true, time: state.time, security: state.security };
}

export function resolveEncounter(state, { won = false } = {}) {
  const room = state.map.rooms[keyOf(state.player.x, state.player.y)];
  if (!room || !['guardian', 'shadow'].includes(room.type)) {
    return { ok: false, reason: '这里没有遭遇。' };
  }
  if (!won) {
    state.ended = 'defeat';
    return { ok: true, won: false };
  }
  room.cleared = true;
  if (room.type === 'guardian') {
    state.guardianDefeated = true;
    state.exitUnlocked = true;
    bumpSecurity(state, 5);
  }
  return { ok: true, won: true, guardianDefeated: state.guardianDefeated };
}

export function unlockExitWithKey(state) {
  const room = state.map.rooms[keyOf(state.player.x, state.player.y)];
  if (!room || room.type !== 'exit' || state.exitUnlocked) return false;
  if (state.keys <= 0) return false;
  state.keys -= 1;
  state.exitUnlocked = true;
  return true;
}

export function takeKey(state) {
  const room = state.map.rooms[keyOf(state.player.x, state.player.y)];
  if (!room || room.type !== 'key' || room.cleared) return false;
  room.cleared = true;
  state.keys += 1;
  return true;
}

export function openChest(state, { inspect = false } = {}) {
  const room = state.map.rooms[keyOf(state.player.x, state.player.y)];
  if (!room || room.type !== 'chest' || room.cleared) return { ok: false, reason: '这里没有可开的月匣。' };
  if (inspect) {
    if (state.time <= 0) return { ok: false, reason: '月光已经用完，没时间检查这个匣子。' };
    state.time = Math.max(0, state.time - 1);
    state.turn += 1;
    bumpSecurity(state, 1);
  }
  room.cleared = true;
  return {
    ok: true,
    trapped: room.chestKind === 'trapped' && !inspect,
    inspected: Boolean(inspect),
  };
}

export function disarmTrap(state) {
  const room = state.map.rooms[keyOf(state.player.x, state.player.y)];
  if (!room || room.type !== 'trap' || room.cleared) return false;
  room.cleared = true;
  bumpSecurity(state, -8);
  return true;
}

export function triggerTrap(state) {
  const room = state.map.rooms[keyOf(state.player.x, state.player.y)];
  if (!room || room.type !== 'trap' || room.cleared) return false;
  room.cleared = true;
  bumpSecurity(state, 12);
  return true;
}

export function restInSafeRoom(state) {
  const room = state.map.rooms[keyOf(state.player.x, state.player.y)];
  if (!room || room.type !== 'safe' || room.rested) return false;
  if (state.map.rooms[state.map.guardianId]?.blockBoss && !state.guardianDefeated) return false;
  room.rested = true;
  bumpSecurity(state, -20);
  state.alert = false;
  return true;
}

export function roomAt(state, x, y) {
  return state.map.rooms[keyOf(x, y)] ?? null;
}

export function currentRoom(state) {
  return roomAt(state, state.player.x, state.player.y);
}

export function visibleRooms(state) {
  return Object.values(state.map.rooms).filter(room => room.revealed);
}
