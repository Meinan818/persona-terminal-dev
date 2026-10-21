/** 影时间 Dark Hour 切换宿主（蓝白专属 B2）：toggleMode 日→夜时播 DarkHourFreeze，onCovered 才加 .dark。挂在 App 根。 */
import { useEffect, useState } from 'react';
import { DarkHourFreeze } from '@blue/fx/motifs';
import { __registerDarkHourHost, setPrefs } from '@blue/lib/prefs';

export function DarkHourHost() {
  const [run, setRun] = useState(0);
  useEffect(() => {
    __registerDarkHourHost(true);
    const on = () => setRun((n) => n + 1);
    window.addEventListener('bk:darkhour', on);
    return () => { __registerDarkHourHost(false); window.removeEventListener('bk:darkhour', on); };
  }, []);
  if (!run) return null;
  return <DarkHourFreeze key={run} active onCovered={() => setPrefs({ mode: 'night' })} onDone={() => setRun(0)} />;
}
