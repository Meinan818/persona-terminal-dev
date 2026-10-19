import { useEffect, useReducer, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '@/store';
import { umbraThemeFor } from '@/umbra/themes';
import {
  createExplorationState,
  createFloorMap,
  disarmTrap,
  listen,
  move,
  openChest,
  resolveEncounter,
  restInSafeRoom,
  takeKey,
  triggerTrap,
} from '@/umbra/engine/floor-map';
import { createDefaultBattle } from '@/umbra/engine/p5-combat-rules';
import { getPersona } from '@/umbra/engine/p5r-compendium';
import {
  EQUIPMENT,
  MAX_EQUIP_LEVEL,
  SLOT_LABELS,
  equipmentEffects,
  equipmentSellPrice,
  upgradeCost,
} from '@/umbra/engine/equipment';
import { EQUIPMENT_DEFS, ITEM_DEFS, SHOP_DEFS } from '@/umbra/engine/economy-rules';
import { equipmentSummary } from '@/umbra/engine/inventory';
import { rollBattleLoot, rollChestLoot } from '@/umbra/engine/loot-rules';
import { createUmbraRunRecord } from '@/umbra/runtime';
import { createRuntimePayload, restoreExploration, UMBRA_RUN_ID } from '@/umbra/run';
import { buyUmbraShopItem } from '@/umbra/shop';
import {
  addUmbraSp,
  damageUmbraProfile,
  grantUmbraLoot,
  restUmbraProfile,
  sellUmbraInventoryItem,
  umbraInventoryEntries,
  upgradeUmbraEquipment,
} from '@/umbra/inventory';
import {
  createDefaultUmbraCombat,
  equipUmbraItem,
  setUmbraActivePersona,
  useUmbraItem,
} from '@/umbra/state';
import '@/styles/umbra-runtime.css';

const equipmentById = EQUIPMENT as Record<string, any>;
const itemDefs = ITEM_DEFS as Record<string, any>;
const slotLabels = SLOT_LABELS as Record<string, string>;
const equipmentDefs = EQUIPMENT_DEFS as Record<string, any>;
const shopDefs = SHOP_DEFS as Record<string, any>;
const battleRewardItems: Record<string, string> = {
  阴影碎片: 'echoShard',
  诡辩的碎片: 'echoShard',
  刻薄的碎片: 'wanderShard',
};

const migrationLabel = (source: 'legacy-battle' | 'fresh' | undefined): string => {
  if (source === 'legacy-battle') return '旧战场已归档，永久资源已迁移';
  if (source === 'fresh') return '新档案已建立';
  return 'UMBRA 永久资料尚未建立';
};

const roomGlyph = (room: any): string => {
  if (!room) return '';
  if (room.type === 'start') return '入';
  if (room.type === 'exit') return '出';
  if (room.type === 'guardian') return '守';
  if (room.type === 'shadow') return '影';
  if (room.type === 'chest') return '匣';
  if (room.type === 'key') return '钥';
  if (room.type === 'trap') return '机';
  if (room.type === 'safe') return '安';
  if (room.type === 'event') return '异';
  return '·';
};

const roomLabel = (type: string | undefined): string => ({
  start: '入口',
  exit: '出口',
  guardian: '守卫',
  shadow: '影子',
  chest: '月匣',
  key: '钥匙',
  trap: '机关',
  safe: '安全屋',
  event: '异变',
  empty: '空房间',
}[type ?? ''] ?? '房间');

export function UmbraRuntimeCheck() {
  const theme = useAppStore(s => s.user?.theme);
  const visual = umbraThemeFor(theme);
  const profile = useAppStore(s => s.umbraProfile);
  const run = useAppStore(s => s.umbraRun);
  const initialSeed = Number(run?.payload?.seed) || 7;
  const [seed, setSeed] = useState(initialSeed);
  const [exploration, setExploration] = useState<any>(() => (
    restoreExploration(run?.payload)
    ?? createExplorationState(createFloorMap({ floor: 1, seed: initialSeed }))
  ));
  const [, refresh] = useReducer(value => value + 1, 0);
  const [blocked, setBlocked] = useState(false);
  const [activeShop, setActiveShop] = useState('clinic');
  const [notice, setNotice] = useState('寻找守卫或钥匙，打开出口。');
  const [battle, setBattle] = useState<any>(null);
  const [targetId, setTargetId] = useState('encounter');
  const [battleNotice, setBattleNotice] = useState('');
  const hydratedRunRef = useRef(Boolean(run?.payload));
  const battleSettledRef = useRef(false);
  const map = exploration.map;
  const combat = profile?.combat ?? createDefaultUmbraCombat();
  const inventory = profile
    ? umbraInventoryEntries(profile)
    : { consumables: [], materials: [], equipment: [] };

  useEffect(() => {
    if (hydratedRunRef.current || !run?.payload) return;
    const restored = restoreExploration(run.payload);
    hydratedRunRef.current = true;
    if (!restored) return;
    setExploration(restored);
    setSeed(Number(run.payload.seed) || 7);
  }, [run?.id, run?.payload]);

  const saveCheckpoint = (nextExploration = exploration, nextSeed = seed) => {
    const payload = createRuntimePayload({
      floor: Number(nextExploration.map?.floor) || 1,
      maxFloor: Number(nextExploration.map?.maxFloor) || 40,
      stratum: 'echo',
      seed: nextSeed,
      exploration: nextExploration,
    });
    const record = createUmbraRunRecord(run?.id ?? UMBRA_RUN_ID, payload);
    void useAppStore.getState().saveUmbraRun(record).catch(error => {
      console.warn('[umbra] run checkpoint failed', error);
    });
  };

  const saveProfile = (nextProfile: typeof profile, context: string) => {
    if (!nextProfile) return;
    void useAppStore.getState().saveUmbraProfile(nextProfile).catch(error => {
      console.warn(`[umbra] ${context} checkpoint failed`, error);
    });
  };

  const selectPersona = (personaId: string) => {
    if (!profile) return;
    const updated = setUmbraActivePersona(profile, personaId);
    if (updated === profile) return;
    saveProfile(updated, 'persona');
  };

  const selectEquipment = (itemId: string) => {
    if (!profile) return;
    const updated = equipUmbraItem(profile, itemId);
    if (updated === profile) return;
    saveProfile(updated, 'equipment');
  };

  const consumeItem = (itemId: string) => {
    if (!profile) return;
    const used = useUmbraItem(profile, itemId);
    if (!used.result.ok) {
      setNotice(used.result.reason ?? '这个道具现在不能使用。');
      return;
    }
    setNotice(`使用了 ${used.result.label}${used.result.amount ? `，回复 ${used.result.amount}` : ''}。`);
    saveProfile(used.profile, 'item');
    refresh();
  };

  const purchase = (itemId: string) => {
    if (!profile) return;
    const bought = buyUmbraShopItem(profile, activeShop, itemId);
    if (!bought.ok) {
      setNotice(bought.reason ?? '这个商品现在买不了。');
      return;
    }
    setNotice(`买下 ${bought.label}，花费 ¥${bought.spent ?? 0}。`);
    saveProfile(bought.profile, 'shop');
    refresh();
  };

  const sellItem = (itemId: string) => {
    if (!profile) return;
    const sold = sellUmbraInventoryItem(profile, itemId);
    if (!sold.ok) {
      setNotice(sold.reason ?? '这件东西现在不能卖。');
      return;
    }
    setNotice(`卖掉了 ${sold.label}，获得 ¥${sold.gain ?? 0}。`);
    saveProfile(sold.profile, 'sell');
    refresh();
  };

  const upgradeItem = (itemId: string) => {
    if (!profile) return;
    const upgraded = upgradeUmbraEquipment(profile, itemId);
    if (!upgraded.ok) {
      setNotice(upgraded.reason ?? '这件装备现在不能强化。');
      return;
    }
    setNotice(`${upgraded.label} 强化到 Lv.${upgraded.level}。`);
    saveProfile(upgraded.profile, 'upgrade');
    refresh();
  };

  const returnLegacy = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('umbra');
    url.searchParams.set('legacy', '1');
    url.hash = 'battle';
    window.location.href = url.toString();
  };

  const walk = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (blocked) return;
    const result = move(exploration, direction);
    if (!result.ok) setNotice(result.reason ?? '这一步走不通。');
    else if (result.encounter) {
      setBlocked(true);
      startBattle(result.encounter.guardian ? '月台守卫' : '游荡之影');
      setNotice(`遭遇 ${result.encounter.guardian ? '守卫' : '影子'}，进入战斗。`);
    } else {
      setNotice(`进入${roomLabel(result.room?.type)}，月光 -1。`);
    }
    saveCheckpoint(exploration, seed);
    refresh();
  };

  const observe = () => {
    if (blocked) return;
    const result = listen(exploration);
    setNotice(result.ok ? '听见了更多房间，警戒也升高了。' : (result.reason ?? '什么也没听见。'));
    saveCheckpoint(exploration, seed);
    refresh();
  };

  const roomAction = (action: string) => {
    let changed = false;
    const room: any = map.rooms[`${exploration.player.x},${exploration.player.y}`];
    if (action === 'key') changed = takeKey(exploration);
    else if (action === 'chest' || action === 'chest-inspect') {
      const result = openChest(exploration, { inspect: action === 'chest-inspect' });
      changed = result.ok;
      if (result.ok && profile) {
        const loot = (rollChestLoot as any)({
          floor: Number(map.floor) || 1,
          maxFloor: Number(map.maxFloor) || 40,
          tier: Number(room?.chestTier) || 1,
        });
        const granted = grantUmbraLoot(profile, loot);
        const updated = result.trapped ? damageUmbraProfile(granted.profile, 15) : granted.profile;
        saveProfile(updated, 'chest');
        setNotice(
          `${result.trapped ? '月匣触发了机关，HP -15。' : '月匣已经打开。'}`
          + `${granted.text ? ` 获得 ${granted.text}。` : ''}`,
        );
      } else {
        setNotice(result.ok ? '月匣已经打开。' : (result.reason ?? '这个月匣不能打开。'));
      }
    } else if (action === 'trap-disarm') {
      changed = disarmTrap(exploration);
      setNotice(changed ? '机关已经拆开。' : '这个机关已经处理过。');
    } else if (action === 'trap-force') {
      changed = triggerTrap(exploration);
      if (changed && profile) saveProfile(damageUmbraProfile(profile, 12), 'trap');
      setNotice(changed ? '硬闯机关，警戒上升，HP -12。' : '这个机关已经处理过。');
    } else if (action === 'safe') {
      changed = restInSafeRoom(exploration);
      if (changed && profile) saveProfile(restUmbraProfile(profile), 'safe-room');
      setNotice(changed ? '在安全屋休息了一次。' : '这里已经休息过。');
    } else if (action === 'exit' && exploration.exitUnlocked) {
      const nextFloor = (Number(map.floor) || 1) + 1;
      const nextSeed = nextFloor * 7919;
      const nextExploration = createExplorationState(createFloorMap({ floor: nextFloor, seed: nextSeed }));
      setExploration(nextExploration);
      saveCheckpoint(nextExploration, nextSeed);
      setNotice(`进入 ${nextFloor}F。`);
      refresh();
      return;
    }
    if (changed) {
      saveCheckpoint(exploration, seed);
      refresh();
    }
  };

  const resetMap = () => {
    const nextSeed = seed + 1;
    const nextExploration = createExplorationState(createFloorMap({ floor: 1, seed: nextSeed }));
    setBlocked(false);
    setNotice('新的 5×5 房间已经展开。');
    setSeed(nextSeed);
    setExploration(nextExploration);
    setBattle(null);
    setBattleNotice('');
    saveCheckpoint(nextExploration, nextSeed);
  };

  const startBattle = (name = '训练之影', activePersonaId = combat.activePersonaId) => {
    battleSettledRef.current = false;
    const next = (createDefaultBattle as any)({
      heroPersonaIds: combat.heroPersonaIds,
      activePersonaId,
      allyPersonaIds: combat.allyPersonaIds,
      enemies: [{
        id: 'encounter',
        name,
        maxHp: 92,
        attack: 12,
        defense: 4,
        element: 'phys',
        weakness: 'electric',
        resist: 'curse',
        personality: 'proud',
        recruitPersonaId: 'pixie',
      }],
    });
    const hero = next.party.find((member: any) => member.isPlayer);
    if (hero) {
      const maxHp = combat.maxHp + combat.equipmentBonuses.hp;
      const maxSp = combat.maxSp + combat.equipmentBonuses.sp;
      hero.hp = Math.max(1, Math.min(maxHp, combat.hp + combat.equipmentBonuses.hp));
      hero.maxHp = maxHp;
      hero.sp = Math.max(0, Math.min(maxSp, combat.sp + combat.equipmentBonuses.sp));
      hero.maxSp = maxSp;
      hero.attackBonus = combat.equipmentBonuses.attack;
      hero.defenseBonus = combat.equipmentBonuses.defense;
    }
    setBattle(next);
    setTargetId('encounter');
    setBattleNotice(`${name} 挡住了路。`);
    refresh();
  };

  const runBattleAction = (action: any) => {
    if (!battle) return;
    const result = battle.act({
      type: action.type,
      id: action.id,
      targetId,
    });
    setBattleNotice(result.ok ? '' : (result.reason ?? '这个行动不能执行。'));
    refresh();
  };

  const holdUpAction = (action: any) => {
    if (!battle) return;
    const result = battle.holdUp(action);
    setBattleNotice(result.ok ? '' : (result.reason ?? '这个选择不能执行。'));
    refresh();
  };

  const chooseBattleResult = (type: 'recruit' | 'reward') => {
    if (!battle) return;
    const result = battle.chooseResult(type);
    setBattleNotice(result.ok ? '' : (result.reason ?? '这个选择不能执行。'));
    refresh();
  };

  const finishBattle = () => {
    if (battleSettledRef.current) return;
    battleSettledRef.current = true;
    resolveEncounter(exploration, { won: true });
    const hero = battle?.party?.find((member: any) => member.isPlayer);
    let noticeText = '遭遇已解决，出口状态已更新。';
    if (profile) {
      const room: any = map.rooms[`${exploration.player.x},${exploration.player.y}`];
      const result = battleSnapshot?.result;
      const effects = equipmentEffects(combat.equipment, combat.equipmentLevels);
      const loot: any = rollBattleLoot({
        floor: Number(map.floor) || 1,
        maxFloor: Number(map.maxFloor) || 40,
        stratum: map.stratum,
        kind: room?.type === 'guardian' ? 'guardian' : 'shadow',
        dropBonus: Number(effects.drop) || 0,
      });
      if (result?.type === 'reward') {
        const rewardItemId = battleRewardItems[result.item];
        if (rewardItemId) loot.items.push({ id: rewardItemId, qty: 1 });
      }
      const granted = grantUmbraLoot(profile, loot);
      let updated = hero ? {
        ...granted.profile,
        combat: {
          ...granted.profile.combat,
          hp: Math.max(1, Math.round(hero.hp) - combat.equipmentBonuses.hp),
          maxHp: Math.max(1, combat.maxHp),
          sp: Math.max(0, Math.round(hero.sp) - combat.equipmentBonuses.sp),
          maxSp: Math.max(0, combat.maxSp),
        },
      } : granted.profile;
      if (result?.type === 'reward') updated = addUmbraSp(updated, Number(result.sp) || 0);
      if (result?.type === 'recruited' && result.personaId) {
        updated = {
          ...updated,
          combat: {
            ...updated.combat,
            heroPersonaIds: [...new Set([...updated.combat.heroPersonaIds, result.personaId])],
          },
        };
      }
      saveProfile(updated, 'combat');
      const rewardLabel = result?.type === 'recruited'
        ? `收服了 ${result.name ?? result.personaId}。`
        : result?.type === 'reward'
          ? `交涉报酬：SP +${Number(result.sp) || 0}。`
          : '';
      noticeText = `遭遇已解决。${rewardLabel}${granted.text ? `战利品：${granted.text}。` : ''}`;
    }
    saveCheckpoint(exploration, seed);
    setBlocked(false);
    setBattle(null);
    setBattleNotice('');
    setNotice(noticeText);
    refresh();
  };

  const battleSnapshot = battle?.snapshot?.() ?? null;
  const currentRoom = map.rooms[`${exploration.player.x},${exploration.player.y}`];
  const currentRoomActions = (() => {
    if (!currentRoom) return [];
    if (currentRoom.type === 'safe' && !currentRoom.rested) return [{ action: 'safe', label: '休息一次' }];
    if (currentRoom.type === 'exit' && exploration.exitUnlocked) return [{ action: 'exit', label: '进入下一层' }];
    if (currentRoom.cleared) return [];
    if (currentRoom.type === 'key') return [{ action: 'key', label: '收下钥匙' }];
    if (currentRoom.type === 'chest') return [
      { action: 'chest-inspect', label: '检查后打开' },
      { action: 'chest', label: '直接打开' },
    ];
    if (currentRoom.type === 'trap') return [
      { action: 'trap-disarm', label: '拆解机关' },
      { action: 'trap-force', label: '硬闯' },
    ];
    return [];
  })();

  return createPortal(
    <main
      className="umbra-runtime min-h-[calc(100vh-5rem)] px-4 py-6 sm:px-6 lg:px-8"
      data-umbra-skin={visual.skin}
      data-umbra-channel={visual.channel}
    >
      <div className="umbra-shell mx-auto max-w-[1380px] space-y-5">
        <header className="umbra-header umbra-rule flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div className="umbra-hero">
            <p className="umbra-accent umbra-terminal-label text-[11px] font-black">{visual.terminalLabel}</p>
            <h1 className="umbra-title mt-1 text-3xl font-black text-gray-900 dark:text-gray-100">
              <span>{visual.identity.zh}</span>
              <small>UMBRA</small>
            </h1>
            <p className="umbra-subtitle mt-2 text-sm text-gray-500 dark:text-gray-400">
              {visual.terminalNote}。战斗、探索、装备和存档已经接通正式数据。
            </p>
          </div>
          <button
            type="button"
            onClick={returnLegacy}
            className="umbra-back-button inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            <span aria-hidden>←</span>
            返回旧战场
          </button>
        </header>

        <section className="umbra-stat-grid grid gap-3 sm:grid-cols-3">
          <article className="umbra-stat rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <span className="umbra-marker inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-black">01</span>
            <p className="mt-3 text-xs font-bold text-gray-400">永久资料</p>
            <p className="mt-1 text-xl font-black text-gray-900 dark:text-gray-100">
              {profile ? `SP ${profile.economy.sp}` : '等待建立'}
            </p>
          </article>
          <article className="umbra-stat rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <span className="umbra-marker inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-black">02</span>
            <p className="mt-3 text-xs font-bold text-gray-400">当前行程</p>
            <p className="mt-1 text-xl font-black text-gray-900 dark:text-gray-100">
              {run ? `第 ${String(run.payload.floor ?? 1)} 层` : '尚未开始'}
            </p>
          </article>
          <article className="umbra-stat rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <span className="umbra-marker inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-black">03</span>
            <p className="mt-3 text-xs font-bold text-gray-400">迁移状态</p>
            <p className="mt-1 text-sm font-bold leading-relaxed text-gray-800 dark:text-gray-200">
              {migrationLabel(profile?.migration.source)}
            </p>
          </article>
        </section>

        <section className="umbra-panel umbra-persona-panel rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="umbra-accent text-[10px] font-black tracking-[0.25em]">PERSONA LOADOUT</p>
              <h2 className="mt-1 text-sm font-black text-gray-900 dark:text-gray-100">出战 Persona</h2>
            </div>
            <span className="text-xs text-gray-400">
              当前 · {getPersona(combat.activePersonaId)?.name ?? combat.activePersonaId}
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            {combat.heroPersonaIds.map(personaId => {
              const persona = getPersona(personaId);
              const active = combat.activePersonaId === personaId;
              return (
                <button
                  key={personaId}
                  type="button"
                  data-umbra-persona={personaId}
                  aria-pressed={active}
                  onClick={() => selectPersona(personaId)}
                  className={`umbra-persona-option ${active ? 'is-active' : ''}`}
                >
                  <b>{persona?.name ?? personaId}</b>
                  <small>Lv.{persona?.level ?? '—'}</small>
                </button>
              );
            })}
          </div>
        </section>

        <section
          className="umbra-panel umbra-armory-panel rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          data-umbra-equipment
          data-equipment-bonus={`${combat.equipmentBonuses.attack}/${combat.equipmentBonuses.defense}/${combat.equipmentBonuses.hp}/${combat.equipmentBonuses.sp}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="umbra-accent text-[10px] font-black tracking-[0.25em]">ARMORY</p>
              <h2 className="mt-1 text-sm font-black text-gray-900 dark:text-gray-100">装备与补给</h2>
            </div>
            <span className="text-xs font-bold text-gray-400">¥{profile?.economy.money ?? 0}</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {Object.entries(SLOT_LABELS).map(([slot, label]) => {
              const itemId = (combat.equipment as Record<string, string | null>)[slot];
              const item = itemId ? equipmentById[itemId] : null;
              return (
                <div key={slot} className="rounded-lg border border-gray-200 p-2.5 dark:border-gray-800">
                  <span className="text-[10px] font-bold text-gray-400">{label}</span>
                  <b className="mt-1 block text-xs text-gray-800 dark:text-gray-100">{item?.name ?? '未装备'}</b>
                  <small className="mt-1 block text-[10px] text-gray-400">
                    {item ? `攻 ${item.attack} · 防 ${item.defense} · HP ${item.hp} · SP ${item.sp}` : '—'}
                  </small>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {combat.ownedEquipment.map(itemId => {
              const item = equipmentById[itemId];
              if (!item) return null;
              const equipped = (combat.equipment as Record<string, string | null>)[item.slot] === itemId;
              return (
                <button
                  key={itemId}
                  type="button"
                  data-umbra-equip={itemId}
                  aria-pressed={equipped}
                  onClick={() => selectEquipment(itemId)}
                  className={`umbra-persona-option ${equipped ? 'is-active' : ''}`}
                >
                  <b>{item.name}</b>
                  <small>{slotLabels[item.slot]} · Lv.{Number(combat.equipmentLevels[itemId]) || 0}</small>
                </button>
              );
            })}
          </div>
          <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400">战斗补给</span>
              {Object.entries(combat.battleItems).filter(([, qty]) => qty > 0).map(([itemId, qty]) => (
                <button
                  key={itemId}
                  type="button"
                  data-umbra-item={itemId}
                  onClick={() => consumeItem(itemId)}
                  className="umbra-secondary-button"
                >
                  {itemDefs[itemId]?.name ?? itemId} ×{qty}
                </button>
              ))}
              {!Object.values(combat.battleItems).some(qty => qty > 0) && (
                <span className="text-[11px] text-gray-400">暂无战斗补给</span>
              )}
            </div>
          </div>
        </section>

        <section className="umbra-panel umbra-inventory-panel rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900" data-umbra-inventory>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="umbra-accent text-[10px] font-black tracking-[0.25em]">INVENTORY</p>
              <h2 className="mt-1 text-sm font-black text-gray-900 dark:text-gray-100">背包、素材与强化</h2>
            </div>
            <span className="text-xs font-bold text-gray-400">
              消耗品 {inventory.consumables.length} · 素材 {inventory.materials.length} · 装备 {inventory.equipment.length}
            </span>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {[...inventory.consumables, ...inventory.materials].map(entry => (
              <div key={entry.id} className="umbra-inventory-row">
                <span>
                  <b>{entry.item.name}</b>
                  <small>{entry.item.kind === 'material' ? '素材' : '战斗补给'} · 持有 {entry.qty}</small>
                </span>
                <button
                  type="button"
                  data-umbra-sell={entry.id}
                  onClick={() => sellItem(entry.id)}
                  className="umbra-secondary-button"
                >
                  卖出 ¥{(Number(entry.item.sell) || 0) * entry.qty}
                </button>
              </div>
            ))}
            {inventory.consumables.length + inventory.materials.length === 0 && (
              <p className="text-xs text-gray-400">背包还是空的。月匣和战斗会在这里留下补给与素材。</p>
            )}
          </div>
          <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
            <p className="text-[10px] font-bold text-gray-400">装备强化与出售</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {inventory.equipment.map(entry => {
                const maxed = entry.level >= MAX_EQUIP_LEVEL;
                const cost = upgradeCost(entry.item, entry.level);
                return (
                  <div key={entry.item.id} className="umbra-inventory-row" data-umbra-equipment-row={entry.item.id}>
                    <span>
                      <b>{entry.item.name} · Lv.{entry.level}</b>
                      <small>{equipmentSummary(entry.item, entry.level) || '无附加效果'}</small>
                    </span>
                    <span className="flex flex-wrap justify-end gap-1.5">
                      <button
                        type="button"
                        data-umbra-upgrade={entry.item.id}
                        disabled={maxed}
                        onClick={() => upgradeItem(entry.item.id)}
                        className="umbra-secondary-button"
                      >
                        {maxed ? '已满级' : `强化 ¥${cost.money} · 石${cost.stones}`}
                      </button>
                      <button
                        type="button"
                        data-umbra-sell={entry.item.id}
                        disabled={entry.equipped || equipmentSellPrice(entry.item) <= 0}
                        onClick={() => sellItem(entry.item.id)}
                        className="umbra-secondary-button"
                      >
                        {entry.equipped ? '装备中' : `卖出 ¥${entry.sell}`}
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="umbra-panel umbra-shop-panel rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="umbra-accent text-[10px] font-black tracking-[0.25em]">SHOP</p>
              <h2 className="mt-1 text-sm font-black text-gray-900 dark:text-gray-100">
                {shopDefs[activeShop]?.name ?? '商店'}
              </h2>
            </div>
            <span className="text-xs font-bold text-gray-400">持有 ¥{profile?.economy.money ?? 0}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(shopDefs).map(([shopId, shop]) => (
              <button
                key={shopId}
                type="button"
                data-umbra-shop={shopId}
                aria-pressed={activeShop === shopId}
                onClick={() => setActiveShop(shopId)}
                className={`umbra-secondary-button ${activeShop === shopId ? 'umbra-shop-active' : ''}`}
              >
                {shop.name}
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(shopDefs[activeShop]?.stock ?? []).map((itemId: string) => {
              const item: any = itemDefs[itemId] ?? equipmentDefs[itemId];
              const price = Number(item?.price) || 0;
              const owned = Boolean(equipmentDefs[itemId] && profile?.combat.ownedEquipment.includes(itemId));
              const disabled = price > (profile?.economy.money ?? 0) || owned;
              return (
                <button
                  key={itemId}
                  type="button"
                  data-umbra-buy={itemId}
                  disabled={disabled}
                  onClick={() => purchase(itemId)}
                  className="umbra-shop-item"
                >
                  <span>
                    <b>{item?.name ?? itemId}</b>
                    <small>{owned ? '已经拥有' : (item?.desc ?? item?.slot ?? '')}</small>
                  </span>
                  <strong>¥{price}</strong>
                </button>
              );
            })}
          </div>
        </section>

        <section className="umbra-note umbra-mission rounded-xl border border-dashed p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="umbra-accent text-sm font-black">正式房间地图已接入</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setBlocked(true);
                  startBattle('训练之影', 'pixie');
                }}
                className="umbra-secondary-button"
              >
                测试战斗
              </button>
              <button type="button" onClick={resetMap} className="umbra-secondary-button">
                换一张地图
              </button>
            </div>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            地图、战斗、月匣、商店、装备和存档均来自幽影协议正式引擎。各主题保留独立皮肤。
          </p>
        </section>

        <section className="umbra-map-panel grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="umbra-panel rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-black text-gray-900 dark:text-gray-100">{map.floor}F · 房间探索</h2>
              <span className="umbra-accent text-xs font-bold">已走 {exploration.turn} 步</span>
            </div>
            <div className="umbra-map-grid grid grid-cols-5 gap-1.5" data-umbra-map>
              {(Object.values(map.rooms) as any[]).map(room => {
                const current = room.x === exploration.player.x && room.y === exploration.player.y;
                return (
                  <div
                    key={room.id}
                    data-room-id={room.id}
                    data-room-type={room.type}
                    data-current={current ? 'true' : 'false'}
                    className={[
                      'flex aspect-square items-center justify-center rounded-md border text-sm font-black',
                      current ? 'umbra-map-current' : '',
                      room.revealed ? 'umbra-map-open' : 'umbra-map-fog',
                      room.cleared && room.revealed ? 'umbra-map-clear' : '',
                    ].join(' ')}
                    aria-label={room.revealed ? roomLabel(room.type) : '未探明房间'}
                  >
                    {room.revealed ? roomGlyph(room) : '?'}
                  </div>
                );
              })}
            </div>
            {currentRoomActions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2" data-umbra-room-actions>
                {currentRoomActions.map(item => (
                  <button
                    key={item.action}
                    type="button"
                    data-umbra-room-action={item.action}
                    onClick={() => roomAction(item.action)}
                    className="umbra-secondary-button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="umbra-side-card rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
                <span className="block text-[10px] font-bold text-gray-400">月光</span>
                <b className="text-base text-gray-900 dark:text-gray-100">{exploration.time}</b>
              </div>
              <div className="umbra-side-card rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
                <span className="block text-[10px] font-bold text-gray-400">警戒</span>
                <b className="text-base text-gray-900 dark:text-gray-100">{exploration.security}%</b>
              </div>
              <div className="umbra-side-card rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
                <span className="block text-[10px] font-bold text-gray-400">钥匙</span>
                <b className="text-base text-gray-900 dark:text-gray-100">{exploration.keys}</b>
              </div>
            </div>
            <div className="umbra-side-card rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">{notice}</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <span />
                <button type="button" disabled={blocked} onClick={() => walk('up')} className="umbra-move-button">↑</button>
                <span />
                <button type="button" disabled={blocked} onClick={() => walk('left')} className="umbra-move-button">←</button>
                <button type="button" disabled={blocked} onClick={observe} className="umbra-move-button">听</button>
                <button type="button" disabled={blocked} onClick={() => walk('right')} className="umbra-move-button">→</button>
                <span />
                <button type="button" disabled={blocked} onClick={() => walk('down')} className="umbra-move-button">↓</button>
                <span />
              </div>
            </div>
          </aside>
        </section>

        {battle && battleSnapshot && (
          <section className="umbra-battle-panel rounded-xl border p-4" data-umbra-battle>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="umbra-accent text-[10px] font-black tracking-[0.3em]">P5 BATTLE ENGINE</p>
                <h2 className="mt-1 text-lg font-black text-gray-900 dark:text-gray-100">
                  第 {battleSnapshot.round} 回合 · {battleSnapshot.actor ?? '敌方回合'}
                </h2>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {battleSnapshot.phase}
              </span>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.3fr]">
              <div className="space-y-2">
                <p className="text-xs font-black text-gray-400">我方</p>
                {battleSnapshot.party.map((member: any) => (
                  <div key={member.id} className={`rounded-lg border p-2.5 ${member.id === battleSnapshot.currentId ? 'umbra-battle-active' : 'border-gray-200 dark:border-gray-800'}`}>
                    <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-200">
                      <span>{member.name}</span>
                      <span>HP {member.hp}/{member.maxHp} · SP {member.sp}/{member.maxSp}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-black text-gray-400">敌方</p>
                {battleSnapshot.enemies.map((enemy: any) => (
                  <button
                    key={enemy.id}
                    type="button"
                    onClick={() => setTargetId(enemy.id)}
                    className={`w-full rounded-lg border p-2.5 text-left ${targetId === enemy.id ? 'umbra-battle-target' : 'border-gray-200 dark:border-gray-800'}`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-200">
                      <span>{enemy.name}{enemy.down ? ' · DOWN' : ''}</span>
                      <span>HP {enemy.hp}/{enemy.maxHp}</span>
                    </div>
                    <div className="mt-1 text-[10px] text-gray-400">
                      {enemy.status ? `状态：${enemy.status}` : '状态：正常'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {battleSnapshot.phase === 'party' && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {battle.actions.filter((action: any) => !action.disabled).map((action: any) => (
                  <button
                    key={`${action.type}:${action.id ?? ''}:${action.targetId ?? ''}`}
                    type="button"
                    onClick={() => runBattleAction(action)}
                    className="umbra-battle-action"
                  >
                    <span>{action.label}</span>
                    <small>{action.detail}{action.cost ? ` · ${action.cost} SP` : ''}</small>
                  </button>
                ))}
              </div>
            )}

            {battleSnapshot.phase === 'holdUp' && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => holdUpAction({ type: 'allOut' })} className="umbra-battle-action">总攻击</button>
                <button
                  type="button"
                  onClick={() => holdUpAction({ type: 'negotiate', enemyId: targetId, option: 'reason' })}
                  className="umbra-battle-action"
                >
                  交涉
                </button>
              </div>
            )}

            {battleSnapshot.phase === 'negotiation' && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => chooseBattleResult('recruit')} className="umbra-battle-action">收服</button>
                <button type="button" onClick={() => chooseBattleResult('reward')} className="umbra-battle-action">拿报酬</button>
              </div>
            )}

            {(battleSnapshot.phase === 'result' || battleSnapshot.phase === 'victory') && (
              <button type="button" onClick={finishBattle} className="umbra-battle-action mt-4 w-full">结算并返回房间</button>
            )}

            {battleSnapshot.phase === 'defeat' && (
              <button type="button" onClick={resetMap} className="umbra-battle-action mt-4 w-full">战斗失败，重开地图</button>
            )}

            <div className="mt-3 space-y-1 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
              {battleNotice && <p className="font-bold text-rose-500">{battleNotice}</p>}
              {battleSnapshot.log.slice(-4).map((line: string, index: number) => <p key={`${index}:${line}`}>{line}</p>)}
            </div>
          </section>
        )}
      </div>
    </main>,
    document.body,
  );
}
