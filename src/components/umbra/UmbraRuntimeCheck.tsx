import { useEffect, useReducer, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { umbraThemeFor } from '@/umbra/themes';
import {
  createExplorationState,
  createFloorMap,
  listen,
  move,
  resolveEncounter,
} from '@/umbra/engine/floor-map';
import { createDefaultBattle } from '@/umbra/engine/p5-combat-rules';
import { getPersona } from '@/umbra/engine/p5r-compendium';
import { EQUIPMENT, SLOT_LABELS } from '@/umbra/engine/equipment';
import { ITEM_DEFS } from '@/umbra/engine/economy-rules';
import { createUmbraRunRecord } from '@/umbra/runtime';
import { createRuntimePayload, restoreExploration, UMBRA_RUN_ID } from '@/umbra/run';
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
  const [notice, setNotice] = useState('寻找守卫或钥匙，打开出口。');
  const [battle, setBattle] = useState<any>(null);
  const [targetId, setTargetId] = useState('encounter');
  const [battleNotice, setBattleNotice] = useState('');
  const hydratedRunRef = useRef(Boolean(run?.payload));
  const map = exploration.map;
  const combat = profile?.combat ?? createDefaultUmbraCombat();

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
      floor: 1,
      maxFloor: 40,
      stratum: 'echo',
      seed: nextSeed,
      exploration: nextExploration,
    });
    const record = createUmbraRunRecord(run?.id ?? UMBRA_RUN_ID, payload);
    void useAppStore.getState().saveUmbraRun(record).catch(error => {
      console.warn('[umbra] run checkpoint failed', error);
    });
  };

  const selectPersona = (personaId: string) => {
    if (!profile) return;
    const updated = setUmbraActivePersona(profile, personaId);
    if (updated === profile) return;
    void useAppStore.getState().saveUmbraProfile(updated).catch(error => {
      console.warn('[umbra] persona checkpoint failed', error);
    });
  };

  const selectEquipment = (itemId: string) => {
    if (!profile) return;
    const updated = equipUmbraItem(profile, itemId);
    if (updated === profile) return;
    void useAppStore.getState().saveUmbraProfile(updated).catch(error => {
      console.warn('[umbra] equipment checkpoint failed', error);
    });
  };

  const consumeItem = (itemId: string) => {
    if (!profile) return;
    const used = useUmbraItem(profile, itemId);
    if (!used.result.ok) {
      setNotice(used.result.reason ?? '这个道具现在不能使用。');
      return;
    }
    setNotice(`使用了 ${used.result.label}${used.result.amount ? `，回复 ${used.result.amount}` : ''}。`);
    void useAppStore.getState().saveUmbraProfile(used.profile).catch(error => {
      console.warn('[umbra] item checkpoint failed', error);
    });
    refresh();
  };

  const returnLegacy = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('umbra');
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
    resolveEncounter(exploration, { won: true });
    const hero = battle?.party?.find((member: any) => member.isPlayer);
    if (profile && hero) {
      void useAppStore.getState().saveUmbraProfile({
        ...profile,
        combat: {
          ...combat,
          hp: Math.max(1, Math.round(hero.hp) - combat.equipmentBonuses.hp),
          maxHp: Math.max(1, combat.maxHp),
          sp: Math.max(0, Math.round(hero.sp) - combat.equipmentBonuses.sp),
          maxSp: Math.max(0, combat.maxSp),
        },
      }).catch(error => {
        console.warn('[umbra] combat profile checkpoint failed', error);
      });
    }
    saveCheckpoint(exploration, seed);
    setBlocked(false);
    setBattle(null);
    setBattleNotice('');
    setNotice('遭遇已解决，出口状态已更新。');
    refresh();
  };

  const battleSnapshot = battle?.snapshot?.() ?? null;

  return (
    <main className="umbra-runtime min-h-[calc(100vh-5rem)] px-4 py-6 sm:px-6" data-umbra-skin={visual.skin}>
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="umbra-rule flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div>
            <p className="umbra-accent text-[11px] font-black tracking-[0.35em]">UMBRA RUNTIME CHECK</p>
            <h1 className="mt-1 text-3xl font-black text-gray-900 dark:text-gray-100">{visual.identity.full}</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              正式数据底座已接管。战斗、爬塔与 Persona 引擎正在迁移，本页只读取正式存档，不修改旧战场。
            </p>
          </div>
          <button
            type="button"
            onClick={returnLegacy}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            <span aria-hidden>←</span>
            返回旧战场
          </button>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <span className="umbra-marker inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-black">01</span>
            <p className="mt-3 text-xs font-bold text-gray-400">永久资料</p>
            <p className="mt-1 text-xl font-black text-gray-900 dark:text-gray-100">
              {profile ? `SP ${profile.economy.sp}` : '等待建立'}
            </p>
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <span className="umbra-marker inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-black">02</span>
            <p className="mt-3 text-xs font-bold text-gray-400">当前行程</p>
            <p className="mt-1 text-xl font-black text-gray-900 dark:text-gray-100">
              {run ? `第 ${String(run.payload.floor ?? 1)} 层` : '尚未开始'}
            </p>
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <span className="umbra-marker inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-black">03</span>
            <p className="mt-3 text-xs font-bold text-gray-400">迁移状态</p>
            <p className="mt-1 text-sm font-bold leading-relaxed text-gray-800 dark:text-gray-200">
              {migrationLabel(profile?.migration.source)}
            </p>
          </article>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
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
          className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
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
                  <small>{slotLabels[item.slot]}</small>
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

        <section className="umbra-note rounded-xl border border-dashed p-5">
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
            地图规则来自幽影协议正式引擎。移动、迷雾、警戒、钥匙与出口已经生效；战斗结算将在下一节点接入。
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-black text-gray-900 dark:text-gray-100">1F · 房间探索</h2>
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
          </div>

          <aside className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
                <span className="block text-[10px] font-bold text-gray-400">月光</span>
                <b className="text-base text-gray-900 dark:text-gray-100">{exploration.time}</b>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
                <span className="block text-[10px] font-bold text-gray-400">警戒</span>
                <b className="text-base text-gray-900 dark:text-gray-100">{exploration.security}%</b>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
                <span className="block text-[10px] font-bold text-gray-400">钥匙</span>
                <b className="text-base text-gray-900 dark:text-gray-100">{exploration.keys}</b>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
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
    </main>
  );
}
