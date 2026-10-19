/**
 * 第一座塔的新 run：40 层（已有行程保留其 maxFloor）、10 层一区段、警戒、机关、安全屋、预告信、Boss。
 *
 * 这里只管路线与风险结算；战斗、Persona 和掉落仍由现有 P5Battle 负责。
 * 选择路线会推高警戒，安全屋可以压回一部分；警戒满时下一场战斗会被先制。
 */

import { encounterFor } from './tower-journey.js';
import { DUNGEON_FLOORS, SAFE_FLOORS, CALLING_FLOOR, safeFloorsFor } from './tower-layout.js';
import { regionForFloor } from './region-rules.js';
import { adjustRoute, getStratum } from './tower-registry.js';
import {
  createExplorationState,
  createFloorMap,
  currentRoom,
  disarmTrap as disarmMapTrap,
  listen as listenOnMap,
  move as moveOnMap,
  openChest as openMapChest,
  resolveEncounter,
  restInSafeRoom,
  takeKey as takeMapKey,
  triggerTrap,
} from './floor-map.js';

export { DUNGEON_FLOORS, SAFE_FLOORS, CALLING_FLOOR };

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
  if (safeFloorsFor(maxFloor).includes(floor)) return ['mob'];
  const stratum = getStratum(stratumId);
  return adjustRoute(ROUTES[(Math.max(1, floor) - 1) % ROUTES.length], stratum);
}

const randomRunSeed = () => Math.floor(Math.random() * 0xffffffff) >>> 0;

export function createDungeonRun({ floors = DUNGEON_FLOORS, stratum = 'echo', seed = null } = {}) {
  const fixedSeed = seed !== null && seed !== '' && Number.isFinite(Number(seed)) ? Number(seed) >>> 0 : null;
  const nextRunSeed = () => fixedSeed ?? randomRunSeed();
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
    runSeed: 0,
    stepBonus: 0,
    securityGuard: 0,
    chestBonus: 0,
    dropBonus: 0,
    nonCombatUsed: false,
    safeRoomPending: false,
    map: null,
    explore: null,
    timeLeft: 0,
    timeMax: 0,
    mapMessage: '',
    timeout: false,
  };

  const choices = () => {
    if (journey.ended) return [];
    if (journey.safeRoomPending) return ['safe'];
    if (journey.nonCombatUsed) return [getStratum(journey.stratum).eliteBias > 0 ? 'elite' : 'mob'];
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
      runSeed: nextRunSeed(),
      stepBonus: 0,
      securityGuard: 0,
      chestBonus: 0,
      dropBonus: 0,
      nonCombatUsed: false,
      safeRoomPending: false,
      map: null,
      explore: null,
      timeLeft: 0,
      timeMax: 0,
      mapMessage: '',
      timeout: false,
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

    const kind = journey.selected;
    const isSafeRoom = kind === 'safe' && journey.safeRoomPending;
    if (!isSafeRoom) journey.floor += 1;
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
      journey.nonCombatUsed = false;
      journey.safeRoomPending = false;
      journey.selected = choices()[0] ?? 'mob';
      return true;
    }
    if (last === 'boss') {
      journey.ended = 'clear';
      return true;
    }
    if (last === 'safe') {
      journey.safeRoomPending = false;
      journey.nonCombatUsed = false;
      journey.selected = choices()[0] ?? 'boss';
      return true;
    }
    if (last === 'calling') {
      journey.nonCombatUsed = false;
      journey.selected = 'boss';
      return true;
    }
    if (safeFloorsFor(journey.maxFloor).includes(journey.floor) && ['mob', 'elite'].includes(last)) {
      journey.safeRoomPending = true;
      journey.selected = 'safe';
      return true;
    }
    if (!['mob', 'elite'].includes(last)) {
      journey.nonCombatUsed = true;
      journey.floor = Math.max(0, journey.floor - 1);
      journey.selected = getStratum(journey.stratum).eliteBias > 0 ? 'elite' : 'mob';
      return true;
    }
    journey.nonCombatUsed = false;
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

  const syncExplore = () => {
    if (!journey.explore) return;
    journey.security = journey.explore.security;
    journey.keys = journey.explore.keys;
    journey.alert = journey.explore.alert;
    journey.timeLeft = journey.explore.time;
    journey.timeMax = journey.explore.maxTime;
  };

  const beginFloor = (floor = journey.floor + 1) => {
    if (journey.ended) return null;
    if (floor > journey.maxFloor) return null;
    journey.floor = floor;
    if (floor > 1) journey.security = Math.max(0, journey.security - 15);
    journey.pending = null;
    journey.mapMessage = '';
    journey.timeout = false;
    if (floor === journey.maxFloor - 1 || floor >= journey.maxFloor) {
      if (floor === journey.maxFloor - 1) journey.pending = { floor, kind: 'calling', resolved: false };
      journey.map = null;
      journey.explore = null;
      return null;
    }
    const stratumIndex = Math.max(0, ['echo', 'vanity', 'escape'].indexOf(journey.stratum));
    const floorSeed = (
      journey.runSeed
      ^ Math.imul(floor, 0x9e3779b1)
      ^ Math.imul(journey.cycle, 0x85ebca6b)
      ^ Math.imul(stratumIndex + 1, 0xc2b2ae35)
    ) >>> 0;
    const map = createFloorMap({
      floor,
      stratum: journey.stratum,
      seed: floorSeed,
      maxFloor: journey.maxFloor,
    });
    const region = regionForFloor(floor, journey.maxFloor);
    const explore = createExplorationState(map, {
      maxTime: (floor <= 10 ? 20 : floor <= journey.maxFloor / 2 ? 18 : 16)
        + (Number(journey.stepBonus) || 0)
        + (Number(region.steps) || 0),
      security: journey.security,
      keys: journey.keys,
    });
    journey.region = region.id;
    journey.regionName = region.name;
    journey.regionRule = region.rule;
    journey.regionChestBonus = region.chestBonus;
    journey.regionReward = region.reward;
    journey.regionSafeHeal = region.safeHeal;
    journey.map = map;
    journey.explore = explore;
    syncExplore();
    return explore;
  };

  const encounterForRoom = (kind, floor) => {
    const base = encounterFor(floor, 'mob');
    if (kind !== 'guardian') return base;
    const blockBoss = floor % 10 === 0;
    const region = regionForFloor(floor, journey.maxFloor);
    return {
      ...base,
      name: blockBoss
        ? `第${Math.ceil(floor / 10)}区段的守层者`
        : region.elite ? '镜厅的精英守卫' : floor >= 10 ? '回声的看门人' : '守层的假面',
      level: base.level + 1,
      maxHp: Math.round(base.maxHp * (blockBoss ? 1.5 : 1.3) * (region.elite ? 1.15 : 1)),
      attack: Math.round(base.attack * (blockBoss ? 1.15 : 1.1) * (region.elite ? 1.1 : 1)),
      defense: base.defense + (blockBoss ? 2 : 1) + (region.elite ? 1 : 0),
      blockBoss,
    };
  };

  const hasUnresolvedMapBattle = () => Boolean(
    journey.pending && !journey.pending.resolved
    && ['guardian', 'shadow'].includes(journey.pending.kind),
  );
  const encounterBlocked = () => ({ ok: false, reason: '先解决眼前的遭遇：交涉或战斗。' });

  const mapMove = direction => {
    if (!journey.explore || journey.ended) return { ok: false, reason: '这一层已经结束。' };
    if (hasUnresolvedMapBattle()) return encounterBlocked();
    const result = moveOnMap(journey.explore, direction);
    if (journey.securityGuard > 0 && journey.explore.security > 0) {
      journey.explore.security = Math.max(0, journey.explore.security - journey.securityGuard);
      journey.explore.alert = journey.explore.security >= 100;
    }
    syncExplore();
    if (!result.ok) {
      if (journey.explore.ended === 'timeout') {
        journey.timeout = true;
        journey.ended = 'timeout';
      }
      return result;
    }
    const room = result.room;
    if (result.encounter) {
      const kind = room.type === 'guardian' ? 'guardian' : 'shadow';
      const encounter = { ...encounterForRoom(kind, journey.floor), ambush: journey.explore.alert };
      journey.pending = {
        floor: journey.floor,
        kind,
        roomId: room.id,
        resolved: false,
        encounter,
        ambush: journey.explore.alert,
        blockBoss: Boolean(encounter.blockBoss),
      };
      return { ...result, pending: journey.pending };
    }
    if (room.type === 'safe') {
      journey.pending = { floor: journey.floor, kind: 'safe', roomId: room.id, resolved: false, rested: false };
    } else if (['chest', 'key', 'trap', 'event'].includes(room.type) && !room.cleared) {
      journey.pending = { floor: journey.floor, kind: room.type, roomId: room.id, resolved: false };
    }
    if (room.type === 'exit' && journey.explore.exitUnlocked) {
      journey.mapMessage = '门已经开了。确认后进入下一层。';
    }
    return result;
  };

  const mapAct = action => {
    if (!journey.explore || journey.ended) return { ok: false, reason: '这一层已经结束。' };
    if (hasUnresolvedMapBattle()) return encounterBlocked();
    if (action === 'listen') {
      const result = listenOnMap(journey.explore);
      syncExplore();
      return result;
    }
    const room = currentRoom(journey.explore);
    if (!room) return { ok: false, reason: '这里没有房间。' };
    if (action === 'take-key') {
      const ok = takeMapKey(journey.explore);
      syncExplore();
      if (ok) journey.pending = null;
      return { ok };
    }
    if (action === 'open-chest' || action === 'inspect-chest') {
      const result = openMapChest(journey.explore, { inspect: action === 'inspect-chest' });
      syncExplore();
      if (result.ok) {
        journey.pending = null;
        journey.mapMessage = result.trapped ? '匣子开了，机关弹了一下。' : '匣子开了，东西收进背包。';
      }
      return result;
    }
    if (action === 'disarm-trap') {
      const ok = disarmMapTrap(journey.explore);
      syncExplore();
      if (ok) journey.pending = null;
      return { ok };
    }
    if (action === 'force-trap') {
      const ok = triggerTrap(journey.explore);
      syncExplore();
      if (ok) journey.pending = null;
      return { ok };
    }
    if (action === 'rest') {
      const ok = restInSafeRoom(journey.explore);
      syncExplore();
      if (ok) journey.pending = null;
      return { ok };
    }
    if (action === 'event-heal' || action === 'event-buff') {
      if (room.type !== 'event' || room.cleared) return { ok: false };
      room.cleared = true;
      journey.pending = null;
      journey.mapMessage = action === 'event-heal' ? '水面映出一点暖意。' : '你把月光收进了掌心。';
      return { ok: true };
    }
    if (action === 'leave-floor') return { ok: completeFloor() };
    return { ok: false, reason: '这个房间没有这个动作。' };
  };

  const setRunBonuses = ({ steps = 0, securityGuard = 0, chestBonus = 0, dropBonus = 0 } = {}) => {
    journey.stepBonus = Math.max(0, Number(steps) || 0);
    journey.securityGuard = Math.max(0, Number(securityGuard) || 0);
    journey.chestBonus = Math.max(0, Number(chestBonus) || 0);
    journey.dropBonus = Math.max(0, Number(dropBonus) || 0);
  };

  const resolveMapBattle = (won, outcome = {}) => {
    if (!journey.explore || journey.ended || !hasUnresolvedMapBattle()) return false;
    const room = currentRoom(journey.explore);
    if (!room || room.id !== journey.pending.roomId || room.type !== journey.pending.kind || room.cleared) return false;
    const kind = journey.pending.kind;
    const ambush = Boolean(journey.pending.ambush);
    if (!resolveEncounter(journey.explore, { won }).ok) return false;
    syncExplore();
    if (!won) {
      journey.ended = 'defeat';
      return false;
    }
    if (ambush) {
      journey.explore.security = Math.max(60, journey.explore.security - 35);
      journey.explore.alert = journey.explore.security >= 100;
      syncExplore();
    }
    journey.history.push({
      floor: journey.floor,
      kind,
      label: outcome.label ?? (kind === 'guardian' ? (journey.pending.blockBoss ? '区段守层者倒下' : '守卫倒下') : '影子散去'),
      detail: outcome.detail ?? (kind === 'guardian'
        ? (journey.pending.blockBoss ? '区段守层者倒下，本段出口解锁。' : '出口已解锁。')
        : `警戒 ${journey.security}%`),
    });
    journey.mapMessage = outcome.message ?? (kind === 'guardian'
      ? (journey.pending.blockBoss ? '区段守层者倒下，本段出口解锁。' : '守卫倒下，出口解锁。')
      : '影子散了，继续走。');
    journey.pending = null;
    return true;
  };

  const adjustSecurity = amount => {
    if (!journey.explore) return false;
    const next = Math.max(0, Math.min(100, (Number(journey.explore.security) || 0) + (Number(amount) || 0)));
    journey.explore.security = next;
    journey.explore.alert = next >= 100;
    syncExplore();
    return true;
  };

  const completeFloor = () => {
    if (!journey.explore || journey.ended || hasUnresolvedMapBattle() || !journey.explore.exitUnlocked) return false;
    const room = currentRoom(journey.explore);
    if (!room || room.type !== 'exit') return false;
    journey.history.push({ floor: journey.floor, kind: 'exit', label: '层门已开', detail: `剩余 ${journey.explore.time} 步` });
    journey.map = null;
    journey.explore = null;
    journey.pending = null;
    journey.mapMessage = '';
    if (journey.floor >= journey.maxFloor - 2) {
      journey.floor = journey.maxFloor - 1;
      journey.pending = { floor: journey.floor, kind: 'calling', resolved: false };
      return true;
    }
    beginFloor(journey.floor + 1);
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
    setRunBonuses,
    beginFloor,
    mapMove,
    mapAct,
    resolveMapBattle,
    adjustSecurity,
    completeFloor,
    syncExplore,
  };
}
