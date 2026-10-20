import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '@/store';
import type { ThemeType } from '@/types';
import {
  DEMO_STORAGE_KEYS,
  demoRunSeed,
  isDemoStorageKey,
  mergeDemoP5rState,
  mergeDemoRunState,
  mergeDemoSliceState,
  parseStorageRecord,
  readDemoLocalState,
  seedDemoStorage,
} from '@/umbra/demoBridge';
import '@/styles/umbra-demo-frame.css';

const demoThemeFor = (theme: ThemeType | undefined): string => {
  if (theme === 'pink') return 'hamuko';
  if (theme === 'yellow') return 'p4';
  if (theme === 'red') return 'p5';
  return 'p3';
};

export function UmbraDemoFrame() {
  const theme = useAppStore(state => state.user?.theme);
  const demoTheme = useMemo(() => demoThemeFor(theme), [theme]);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const syncChainRef = useRef<Promise<void>>(Promise.resolve());
  const [loaded, setLoaded] = useState(false);
  const [bridgeReady, setBridgeReady] = useState(false);
  const [seedStatus, setSeedStatus] = useState('pending');

  const enqueueSync = useCallback((task: () => Promise<void>) => {
    syncChainRef.current = syncChainRef.current
      .then(task)
      .catch(error => {
        console.warn('[umbra] demo storage bridge failed', error);
      });
  }, []);

  const exitDemo = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('umbra');
    url.searchParams.delete('legacy');
    url.hash = '';
    window.location.href = url.toString();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') exitDemo();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [exitDemo]);

  useEffect(() => {
    let disposed = false;
    let started = false;
    let unsubscribe = () => {};

    const prepare = async () => {
      if (started) return;
      const state = useAppStore.getState();
      const currentProfile = state.umbraProfile;
      const currentRun = state.umbraRun;
      if (!currentProfile) return;
      started = true;

      let nextProfile = currentProfile;
      let nextRun = currentRun;
      const local = readDemoLocalState(window.localStorage);
      if (!currentProfile.demo?.p5r && local.p5r) {
        nextProfile = mergeDemoP5rState(nextProfile, local.p5r);
      }
      if (!currentProfile.demo?.slice && local.slice) {
        nextProfile = mergeDemoSliceState(nextProfile, local.slice);
      }
      if (!demoRunSeed(currentRun) && local.run) {
        nextRun = mergeDemoRunState(currentRun, local.run);
      }

      if (nextProfile !== currentProfile) await state.saveUmbraProfile(nextProfile);
      if (nextRun !== currentRun && nextRun) await state.saveUmbraRun(nextRun);

      const latest = useAppStore.getState();
      if (latest.umbraProfile) {
        setSeedStatus(JSON.stringify(
          seedDemoStorage(window.localStorage, latest.umbraProfile, latest.umbraRun),
        ));
      }
      if (!disposed) setBridgeReady(true);
    };
    const handleFailure = (error: unknown) => {
      console.warn('[umbra] demo initial sync failed', error);
      if (!disposed) setBridgeReady(true);
    };
    void prepare().catch(handleFailure);
    unsubscribe = useAppStore.subscribe((state, previous) => {
      if (
        state.umbraProfile !== previous.umbraProfile
        || state.umbraRun !== previous.umbraRun
      ) void prepare().catch(handleFailure);
    });
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!isDemoStorageKey(event.key)) return;
      const raw = parseStorageRecord(event.newValue);
      if (event.key === DEMO_STORAGE_KEYS.run) {
        if (!event.newValue) {
          enqueueSync(async () => {
            const currentId = useAppStore.getState().umbraRun?.id ?? 'current';
            await useAppStore.getState().clearUmbraRun(currentId);
          });
          return;
        }
        if (!raw) return;
        enqueueSync(async () => {
          const current = useAppStore.getState().umbraRun;
          await useAppStore.getState().saveUmbraRun(mergeDemoRunState(current, raw));
        });
        return;
      }
      if (!raw) return;
      enqueueSync(async () => {
        const current = useAppStore.getState().umbraProfile;
        if (!current) return;
        const next = event.key === DEMO_STORAGE_KEYS.p5r
          ? mergeDemoP5rState(current, raw)
          : mergeDemoSliceState(current, raw);
        await useAppStore.getState().saveUmbraProfile(next);
      });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [enqueueSync]);

  return createPortal(
    <div
      className="umbra-demo-frame"
      data-demo-theme={demoTheme}
      data-bridge-ready={bridgeReady ? 'true' : 'false'}
      data-bridge-seed={seedStatus}
    >
      {!loaded && (
        <div className="umbra-demo-loading" role="status">
          <span>UMBRA</span>
          <small>正在载入幽影协议</small>
        </div>
      )}
      {bridgeReady && (
        <iframe
          ref={frameRef}
          title="MASKARIA 幽影协议"
          src={`/umbra-demo/index.html?theme=${demoTheme}`}
          onLoad={() => {
            setLoaded(true);
            frameRef.current?.contentDocument?.addEventListener('keydown', event => {
              if (event.key === 'Escape') exitDemo();
            });
          }}
        />
      )}
    </div>,
    document.body,
  );
}
