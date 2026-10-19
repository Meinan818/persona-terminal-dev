import { describe, expect, it } from 'vitest';
import {
  createExplorationState,
  createFloorMap,
  listen,
  move,
  resolveEncounter,
  takeKey,
  visibleRooms,
} from '@/umbra/engine/floor-map';

describe('UMBRA formal floor map', () => {
  it('生成 5×5 入口、出口、守卫、钥匙与侧房', () => {
    const map: any = createFloorMap({ floor: 1, seed: 7 });
    expect(map.width).toBe(5);
    expect(map.height).toBe(5);
    expect(map.rooms[`${map.start.x},${map.start.y}`].type).toBe('start');
    expect(map.rooms[`${map.exit.x},${map.exit.y}`].type).toBe('exit');
    expect(map.rooms[map.guardianId].type).toBe('guardian');
    expect(map.rooms[map.keyId].type).toBe('key');
    expect(Object.values(map.rooms).some((room: any) => room.type === 'chest')).toBe(true);
  });

  it('移动会推进回合并扩开可见房间', () => {
    const exploration: any = createExplorationState(createFloorMap({ floor: 1, seed: 7 }));
    const beforeTurn = exploration.turn;
    const beforeVisible = visibleRooms(exploration).length;
    const moved = move(exploration, 'right');
    expect(moved.ok).toBe(true);
    expect(exploration.turn).toBe(beforeTurn + 1);
    expect(visibleRooms(exploration).length).toBeGreaterThanOrEqual(beforeVisible);
  });

  it('守卫战后解锁出口', () => {
    const map: any = createFloorMap({ floor: 1, seed: 7 });
    const exploration: any = createExplorationState(map);
    const guardian = map.rooms[map.guardianId];
    const neighbor = [
      { x: guardian.x - 1, y: guardian.y, direction: 'right' },
      { x: guardian.x + 1, y: guardian.y, direction: 'left' },
      { x: guardian.x, y: guardian.y - 1, direction: 'down' },
      { x: guardian.x, y: guardian.y + 1, direction: 'up' },
    ].find(point => point.x >= 0 && point.y >= 0 && point.x < map.width && point.y < map.height);
    expect(neighbor).toBeTruthy();
    exploration.player = { x: neighbor!.x, y: neighbor!.y };
    const encounter = move(exploration, neighbor!.direction);
    expect(encounter.encounter?.guardian).toBe(true);
    expect(resolveEncounter(exploration, { won: true }).guardianDefeated).toBe(true);
    expect(exploration.exitUnlocked).toBe(true);
  });

  it('钥匙只收一次，倾听消耗夜色并提高警戒', () => {
    const map: any = createFloorMap({ floor: 1, seed: 7 });
    const exploration: any = createExplorationState(map);
    const key = map.rooms[map.keyId];
    exploration.player = { x: key.x, y: key.y };
    expect(takeKey(exploration)).toBe(true);
    expect(takeKey(exploration)).toBe(false);
    const time = exploration.time;
    const security = exploration.security;
    expect(listen(exploration).ok).toBe(true);
    expect(exploration.time).toBe(time - 1);
    expect(exploration.security).toBeGreaterThan(security);
  });
});
