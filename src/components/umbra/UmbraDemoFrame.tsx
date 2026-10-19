import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '@/store';
import type { ThemeType } from '@/types';
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
  const [loaded, setLoaded] = useState(false);

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

  return createPortal(
    <div className="umbra-demo-frame" data-demo-theme={demoTheme}>
      {!loaded && (
        <div className="umbra-demo-loading" role="status">
          <span>UMBRA</span>
          <small>正在载入幽影协议</small>
        </div>
      )}
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
    </div>,
    document.body,
  );
}
