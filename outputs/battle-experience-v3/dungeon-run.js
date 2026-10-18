/**
 * 第一座塔的 run 状态：12 层、三条路线、警戒、机关、安全屋、预告信、Boss。
 *
 * 这里只管路线与风险结算；战斗、Persona 和掉落仍由现有 P5Battle 负责。
 * 选择路线会推高警戒，安全屋可以压回一部分；警戒满时下一场战斗会被先制。
 */

import { encounterFor } from './tower-journey.js';
import { adjustRoute, getStratum } from './tower-registry.js';

export const DUNGEON_FLOORS = 12;
export const SAFE_FLOORS = [4, 8];
export const CALLING_FLOOR = 11;

const RISK = {
  mob: 8,
  elite: 14,
  chest: 2,
  event: 3,
  trap: 10,
  key: 4,
  safe: 0,
  calling: 0,
  boss: 0,
};

const ROUTES = [
  ['mob', 'chest', 'event'],
  ['event', 'mob', 'chest'],
  ['chest', 'trap', 'mob'],
  ['mob', 'elite', 'event'],
  ['key', 'mob', 'chest'],
  ['trap', 'event', 'mob'],
  ['elite', 'chest', 'event'],
  ['mob', 'key', 'event'],
  ['chest', 'mob', 'trap'],
  ['event', 'elite', 'mob'],
];

export function routesForFloor(floor, maxFloor = DUNGEON_FLOORS, stratumId = 'echo') {
  if (floor >= maxFloor) return ['boss'];
  if (floor === maxFloor - 1) return ['calling'];
  if (SAFE_FLOORS.includes(floor)) return ['safe'];
  const stratum = getStratum(stratumId);
  return adjustRoute(ROUTES[(Math.max(1, floor) - 1) % ROUTES.length], stratum);
}

export function createDungeonRun({ floors = DUNGEON_FLOORS, stratum = 'echo' } = {}) {
  const journey = {
    active: false,
    floor: 0,
    maxFloor: floors,
    pending: null,
    selected: 'mob',
    history: [],
    buffs: [],
    loot: [],
    ended: null,
    security: 0,
    alert: false,
    callingCardSent: false,
    keys: 0,
    stratum: getStratum(stratum).id,
    endless: false,
    cycle: 1,
  };

  const choices = () => {
    if (journey.ended) return [];
    const floor = journey.pending ? journey.floor : Math.min(journey.maxFloor, journey.floor + 1);
    return routesForFloor(floor, journey.maxFloor, journey.stratum);
  };

  const start = (stratumId = journey.stratum) => {
    Object.assign(journey, {
      active: true,
      floor: 0,
      maxFloor: floors,
      pending: null,
      selected: 'mob',
      history: [],
      buffs: [],
      loot: [],
      ended: null,
      security: 0,
      alert: false,
      callingCardSent: false,
      keys: 0,
      stratum: getStratum(stratumId).id,
      endless: false,
      cycle: 1,
    });
  };

  const startEndless = (stratumId = journey.stratum) => {
    start(stratumId);
    journey.endless = true;
    journey.cycle = 1;
    journey.security = 20;
  };

  const setStratum = stratumId => {
    if (journey.pending) return false;
    journey.stratum = getStratum(stratumId).id;
    return true;
  };

  const select = kind => {
    if (journey.pending || journey.ended) return false;
    if (!choices().includes(kind)) return false;
    journey.selected = kind;
    return true;
  };

  const enter = () => {
    if (journey.ended || journey.pending) return null;
    if (!choices().includes(journey.selected)) return null;
    if (journey.selected === 'boss' && !journey.callingCardSent) return null;

    journey.floor += 1;
    const kind = journey.selected;
    const risk = Math.max(0, (RISK[kind] ?? 0) + getStratum(journey.stratum).riskBonus);
    if (kind !== 'safe') journey.security = Math.min(100, journey.security + risk);
    const ambush = journey.security >= 100;
    if (ambush) {
      journey.alert = true;
      journey.security = Math.max(60, journey.security - 35);
    }
    let encounter = null;
    if (kind === 'mob' || kind === 'boss' || kind === 'elite') {
      const cycleOffset = journey.endless ? (journey.cycle - 1) * 12 : 0;
      const base = encounterFor(journey.floor + cycleOffset, kind === 'boss' ? 'boss' : 'mob');
      encounter = kind === 'elite'
        ? {
          ...base,
          name: journey.floor === 7 ? '失衡的守层者' : '回声的看门人',
          level: journey.floor + cycleOffset,
          maxHp: Math.round(base.maxHp * 1.6),
          attack: Math.round(base.attack * 1.25),
          defense: base.defense + 2,
        }
        : base;
      encounter = { ...encounter, ambush };
    }
    journey.pending = {
      floor: journey.floor,
      kind,
      resolved: false,
      result: null,
      rewarded: false,
      ambush,
      encounter,
    };
    return journey.pending;
  };

  const resolve = result => {
    const pending = journey.pending;
    if (!pending || pending.resolved || journey.ended) return false;
    pending.resolved = true;
    pending.result = result;
    journey.history.push({ floor: pending.floor, kind: pending.kind, ...result });
    return true;
  };

  const advance = () => {
    if (journey.ended || !journey.pending?.resolved) return false;
    const last = journey.pending.kind;
    journey.pending = null;
    if (last === 'boss' && journey.endless) {
      journey.cycle += 1;
      journey.floor = 0;
      journey.pending = null;
      journey.callingCardSent = false;
      journey.security = Math.min(100, 20 + journey.cycle * 10);
      journey.selected = choices()[0] ?? 'mob';
      return true;
    }
    if (last === 'boss') {
      journey.ended = 'clear';
      return true;
    }
    journey.selected = choices()[0] ?? 'boss';
    return true;
  };

  const end = reason => {
    if (journey.ended) return false;
    journey.ended = reason;
    return true;
  };

  const addLoot = (reward = {}) => {
    if (!journey.pending || journey.pending.rewarded || journey.ended) return false;
    journey.pending.rewarded = true;
    journey.loot.push({ floor: journey.floor, label: reward.item ?? '回响之线', sp: reward.sp ?? 10 });
    return true;
  };

  const rest = () => {
    if (journey.pending?.kind !== 'safe' || journey.pending.rested) return false;
    journey.pending.rested = true;
    journey.security = Math.max(0, journey.security - 20);
    journey.alert = false;
    return true;
  };

  const sendCallingCard = () => {
    if (journey.pending?.kind !== 'calling' || journey.callingCardSent) return false;
    journey.callingCardSent = true;
    return true;
  };

  const takeKey = () => {
    if (journey.pending?.kind !== 'key') return false;
    journey.keys += 1;
    return true;
  };

  const disarmTrap = () => {
    if (journey.pending?.kind !== 'trap') return false;
    journey.security = Math.max(0, journey.security - 10);
    return true;
  };

  const forceTrap = () => {
    if (journey.pending?.kind !== 'trap') return false;
    journey.security = Math.min(100, journey.security + 15);
    return true;
  };

  return {
    journey,
    choices,
    start,
    select,
    enter,
    resolve,
    advance,
    end,
    addLoot,
    rest,
    sendCallingCard,
    takeKey,
    disarmTrap,
    forceTrap,
    setStratum,
    startEndless,
  };
}
