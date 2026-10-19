import { useMemo, useReducer, useState } from 'react';
import { useAppStore } from '@/store';
import { umbraThemeFor } from '@/umbra/themes';
import {
  createExplorationState,
  createFloorMap,
  listen,
  move,
} from '@/umbra/engine/floor-map';
import '@/styles/umbra-runtime.css';

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
  const [seed, setSeed] = useState(7);
  const [, refresh] = useReducer(value => value + 1, 0);
  const [blocked, setBlocked] = useState(false);
  const [notice, setNotice] = useState('寻找守卫或钥匙，打开出口。');
  const exploration: any = useMemo(
    () => createExplorationState(createFloorMap({ floor: 1, seed })),
    [seed],
  );
  const map = exploration.map;

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
      setNotice(`遭遇 ${result.encounter.guardian ? '守卫' : '影子'}，战斗引擎将在下一节点接入。`);
    } else {
      setNotice(`进入${roomLabel(result.room?.type)}，月光 -1。`);
    }
    refresh();
  };

  const observe = () => {
    if (blocked) return;
    const result = listen(exploration);
    setNotice(result.ok ? '听见了更多房间，警戒也升高了。' : (result.reason ?? '什么也没听见。'));
    refresh();
  };

  const resetMap = () => {
    setBlocked(false);
    setNotice('新的 5×5 房间已经展开。');
    setSeed(value => value + 1);
  };

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

        <section className="umbra-note rounded-xl border border-dashed p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="umbra-accent text-sm font-black">正式房间地图已接入</p>
            <button
              type="button"
              onClick={resetMap}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              换一张地图
            </button>
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
      </div>
    </main>
  );
}
