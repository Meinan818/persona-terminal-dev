import { useAppStore } from '@/store';
import { useUmbraIdentity } from '@/ui/useUmbraIdentity';

const migrationLabel = (source: 'legacy-battle' | 'fresh' | undefined): string => {
  if (source === 'legacy-battle') return '旧战场已归档，永久资源已迁移';
  if (source === 'fresh') return '新档案已建立';
  return 'UMBRA 永久资料尚未建立';
};

export function UmbraRuntimeCheck() {
  const identity = useUmbraIdentity();
  const profile = useAppStore(s => s.umbraProfile);
  const run = useAppStore(s => s.umbraRun);

  const returnLegacy = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('umbra');
    url.hash = 'battle';
    window.location.href = url.toString();
  };

  return (
    <main className="min-h-[calc(100vh-5rem)] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-4 dark:border-gray-800">
          <div>
            <p className="text-[11px] font-black tracking-[0.35em] text-gray-400">UMBRA RUNTIME CHECK</p>
            <h1 className="mt-1 text-3xl font-black text-gray-900 dark:text-gray-100">{identity.full}</h1>
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
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/10 text-xs font-black text-violet-500">01</span>
            <p className="mt-3 text-xs font-bold text-gray-400">永久资料</p>
            <p className="mt-1 text-xl font-black text-gray-900 dark:text-gray-100">
              {profile ? `SP ${profile.economy.sp}` : '等待建立'}
            </p>
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/10 text-xs font-black text-cyan-500">02</span>
            <p className="mt-3 text-xs font-bold text-gray-400">当前行程</p>
            <p className="mt-1 text-xl font-black text-gray-900 dark:text-gray-100">
              {run ? `第 ${String(run.payload.floor ?? 1)} 层` : '尚未开始'}
            </p>
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-xs font-black text-amber-500">03</span>
            <p className="mt-3 text-xs font-bold text-gray-400">迁移状态</p>
            <p className="mt-1 text-sm font-bold leading-relaxed text-gray-800 dark:text-gray-200">
              {migrationLabel(profile?.migration.source)}
            </p>
          </article>
        </section>

        <section className="rounded-xl border border-dashed border-violet-300 bg-violet-50/70 p-5 dark:border-violet-800 dark:bg-violet-950/20">
          <p className="text-sm font-black text-violet-800 dark:text-violet-200">入口检查通过</p>
          <p className="mt-2 text-sm leading-relaxed text-violet-700/80 dark:text-violet-200/70">
            下一步会把静态 Demo 的战斗、房间地图、Persona、装备与天鹅绒模块接入这里，再把默认入口从旧战场切到 UMBRA。
          </p>
        </section>
      </div>
    </main>
  );
}
