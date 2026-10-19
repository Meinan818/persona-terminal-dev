// @ts-nocheck -- 从已通过 234 项 Demo 测试的纯规则模块机械迁移；类型收口随 U2 后续节点完成。
/**
 * 月匣、战斗和守卫掉落表。
 *
 * 所有结果只返回 id；写进背包由 inventory.js 的 grantLoot 负责。
 */

import { DUNGEON_FLOORS } from './tower-layout.js';

const pick = (rng, list) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
const chance = (rng, value) => rng() < Math.max(0, Math.min(1, value));
const amount = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));

const GEAR_POOLS = {
  1: ['scout-knife', 'kevlar-vest', 'old-watch'],
  2: ['iron-knife', 'kevlar-vest', 'old-watch', 'silver-ring'],
  3: ['black-fang', 'kevlar-vest', 'moonlight-coat', 'silver-ring'],
  4: ['razor-fang', 'night-vest', 'compass-charm', 'moonlight-coat'],
  5: ['eclipse-blade', 'void-cloak', 'heart-locket', 'night-vest'],
};

const UNIQUE_GEAR = {
  echo: 'echo-crown',
  vanity: 'vanity-edge',
  escape: 'escape-boots',
};

const CONSUMABLES = ['painkiller', 'sportsDrink', 'energyDrink', 'strongPainkiller', 'revive', 'smokeBomb'];
const SHARDS = ['emberShard', 'frostShard', 'windShard', 'psyShard', 'physShard'];

export function gearTierForFloor(floor = 1, maxFloor = DUNGEON_FLOORS) {
  const value = Math.max(1, Number(floor) || 1);
  return Math.max(1, Math.min(5, Math.ceil(value / (maxFloor / 5))));
}

export function chestTierForFloor(floor = 1, chestBonus = 0, maxFloor = DUNGEON_FLOORS) {
  const value = Math.max(1, Number(floor) || 1);
  const base = value <= maxFloor * 0.2 ? 1 : value <= maxFloor * 0.6 ? 2 : 3;
  return Math.max(1, Math.min(3, base + Math.max(0, Number(chestBonus) || 0)));
}

export function chestTierForKind(kind = 'wood', floor = 1, chestBonus = 0, maxFloor = DUNGEON_FLOORS) {
  const base = kind === 'wood' ? 1 : kind === 'silver' ? 2 : kind === 'gold' ? 3 : chestTierForFloor(floor, 0, maxFloor);
  return Math.max(1, Math.min(3, base + Math.max(0, Number(chestBonus) || 0)));
}

export function rollGear(floor = 1, { rng = Math.random, bonusTier = 0, maxFloor = DUNGEON_FLOORS } = {}) {
  const tier = Math.max(1, Math.min(5, gearTierForFloor(floor, maxFloor) + (Number(bonusTier) || 0)));
  return pick(rng, GEAR_POOLS[tier]);
}

export function rollChestLoot({ floor = 1, tier, rng = Math.random, chestBonus = 0, maxFloor = DUNGEON_FLOORS } = {}) {
  const chestTier = Math.max(1, Math.min(3, Number(tier) || chestTierForFloor(floor, chestBonus, maxFloor)));
  const money = chestTier === 1 ? amount(rng, 300, 700)
    : chestTier === 2 ? amount(rng, 700, 1400)
      : amount(rng, 1400, 2600);
  const items = [];
  const equipment = [];
  items.push({ id: pick(rng, CONSUMABLES), qty: 1 });
  if (chestTier >= 2 && chance(rng, 0.45)) items.push({ id: 'enhanceStone', qty: 1 });
  if (chance(rng, 0.45)) items.push({ id: pick(rng, SHARDS), qty: 1 });
  const gearChance = chestTier === 1 ? 0.3 : chestTier === 2 ? 0.6 : 1;
  if (chance(rng, gearChance)) equipment.push(rollGear(floor, { rng, bonusTier: Math.max(0, chestTier - 2), maxFloor }));
  if (chestTier === 3 && chance(rng, 0.35)) items.push({ id: 'revive', qty: 1 });
  return { money, items, equipment };
}

export function rollBattleLoot({ floor = 1, kind = 'shadow', stratum = 'echo', rng = Math.random, dropBonus = 0, blockBoss = false, maxFloor = DUNGEON_FLOORS } = {}) {
  const bonus = Math.max(0, Number(dropBonus) || 0);
  const items = [];
  const equipment = [];
  if (kind === 'boss') {
    items.push({ id: 'obsessionShard', qty: 1 }, { id: 'enhanceStone', qty: 2 });
    const unique = UNIQUE_GEAR[stratum] ?? UNIQUE_GEAR.echo;
    equipment.push(unique);
    return { money: 0, items, equipment };
  }
  if (kind === 'guardian' || kind === 'elite') {
    items.push({ id: 'enhanceStone', qty: blockBoss ? 2 : 1 });
    if (chance(rng, 0.55 + bonus)) items.push({ id: 'echoShard', qty: 1 });
    if (blockBoss || chance(rng, 0.35 + bonus)) equipment.push(rollGear(floor, { rng, maxFloor }));
    return { money: 0, items, equipment };
  }
  if (chance(rng, 0.55 + bonus)) items.push({ id: 'echoShard', qty: 1 });
  if (chance(rng, 0.35 + bonus)) items.push({ id: 'wanderShard', qty: 1 });
  if (chance(rng, 0.22 + bonus)) items.push({ id: pick(rng, CONSUMABLES), qty: 1 });
  if (chance(rng, 0.1 + bonus)) equipment.push(rollGear(floor, { rng, maxFloor }));
  return { money: 0, items, equipment };
}

export function rollRequestLoot(requestId) {
  if (requestId === 'elite') return { items: [{ id: 'enhanceStone', qty: 1 }], equipment: [] };
  if (requestId === 'keys') return { items: [{ id: 'oldKey', qty: 1 }], equipment: [] };
  if (requestId === 'safe') return { items: [{ id: 'sleepIncense', qty: 1 }], equipment: [] };
  if (requestId === 'boss') return { items: [{ id: 'obsessionShard', qty: 1 }], equipment: [] };
  return { items: [], equipment: [] };
}
