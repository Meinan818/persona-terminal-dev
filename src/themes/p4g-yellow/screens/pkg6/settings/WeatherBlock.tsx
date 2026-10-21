/** 设置 · 天气（真实 components/settings/WeatherSettings.tsx） */
import { useEffect, useRef, useState } from 'react';
import { CfgBlock, CfgBtn, CfgInput, CfgMsg, CfgSeg } from '../cfg';
import { updateSettings, useSettings } from '../settingsStore';
import { WeatherIcon } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { fetchWeatherNow, searchCity, weatherConfigOf } from '@/utils/weather';

const CITIES = [
  { name: '杭州', adm: '浙江省 · 杭州市' }, { name: '西湖', adm: '浙江省 · 杭州市' }, { name: '朝阳', adm: '北京市' }, { name: '朝阳', adm: '辽宁省 · 朝阳市' },
];

export function WeatherBlock({ highlight }: { highlight?: boolean }) {
  const s = useSettings();
  const ref = useRef<HTMLDivElement>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Array<{ id?: string; name: string; adm?: string; lat: number; lon: number }>>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { if (highlight) setTimeout(() => ref.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 350); }, [highlight]);

  const qw = s.weatherProvider === 'qweather';
  const missing = [qw && !s.weatherKey.trim() && 'API KEY', qw && !s.weatherHost.trim() && 'API Host', !s.weatherCity && '城市'].filter(Boolean) as string[];
  const ready = missing.length === 0;
  const canSearch = !qw || (s.weatherKey.trim() && s.weatherHost.trim());
  const weatherCfg = () => weatherConfigOf({ weatherProvider: s.weatherProvider, weatherApiKey: s.weatherKey, weatherApiHost: s.weatherHost, weatherCity: s.weatherCity as never });
  const search = async () => {
    if (!q.trim()) return;
    setBusy(true); setMsg(null);
    try {
      const list = await searchCity(q, weatherCfg());
      setResults(list as typeof results);
      if (!list.length) setMsg({ ok: false, text: '没找到这个地名，换个写法试试（区县名通常比街道名好用）' });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : '城市检索失败' });
    } finally { setBusy(false); }
  };
  const test = async () => {
    setBusy(true); setMsg(null);
    try {
      const w = await fetchWeatherNow(weatherCfg(), { force: true });
      setMsg({ ok: true, text: `✓ ${s.weatherCity?.name ?? ''}　${w.text} ${w.temp}°C　体感 ${w.feelsLike}°` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : '天气取不到' });
    } finally { setBusy(false); }
  };

  return (
    <div ref={ref} className={cx('scroll-mt-24', highlight && 'outline outline-4 outline-offset-4 outline-p4g-orange')}>
      <CfgBlock title={<span className="flex items-center gap-2"><WeatherIcon kind="rain" size={26} />天气</span>} en="WEATHER · 月相 ⇄ 天气"
        aside={<span className="rounded-[3px] bg-p4g-black px-2 py-0.5 font-display text-2xs font-bold text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black">月相</span>}>
        <p className="text-meta leading-relaxed text-p4g-ink-soft">配好之后，首页的<b className="text-p4g-ink">月相</b>点一下就能切成天气，切换会被记住。<b className="text-p4g-ink">Key 与城市只存本机</b>——不随云同步上传，但会进本地备份文件。</p>
        <div role="radiogroup" aria-label="天气服务商" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {([['qweather', '和风天气', '需 KEY · 国内节点 · 区县级'], ['openmeteo', 'Open-Meteo', '免 Key · 服务器在欧美']] as const).map(([id, name, sub]) => {
            const on = s.weatherProvider === id;
            return (
              <button key={id} type="button" role="radio" aria-checked={on} onClick={() => { updateSettings({ weatherProvider: id }); setMsg(null); }}
                className={cx('p4g-press min-w-0 rounded-[3px] border-2 px-3 py-2 text-left', on ? 'border-p4g-black bg-p4g-select text-[color:var(--p4g-select-ink)] shadow-hard-sm night:border-p4g-yellow' : 'border-p4g-line/40 bg-p4g-surface')}>
                <span className="block truncate font-display text-body font-bold">{on ? '▶ ' : ''}{name}</span>
                <span className="block truncate text-2xs opacity-80">{sub}</span>
              </button>
            );
          })}
        </div>
        {qw && (
          <>
            <div className="rounded-[3px] border-2 border-dashed border-p4g-line/40">
              <button type="button" onClick={() => setGuideOpen((v) => !v)} aria-expanded={guideOpen} className="flex w-full min-w-0 items-center justify-between gap-2 px-3 py-2 text-left">
                <span className="truncate font-display text-meta font-bold">三步拿到 API KEY 和 API Host</span><span aria-hidden>{guideOpen ? '▲' : '▼'}</span>
              </button>
              {guideOpen && (
                <div className="space-y-1.5 px-3 pb-3 text-meta leading-relaxed text-p4g-ink-soft">
                  <p>① 打开 <a href="https://console.qweather.com" target="_blank" rel="noopener noreferrer" className="font-bold text-p4g-tag underline">和风天气控制台 ↗</a>，注册登录后进「项目管理」→「创建项目」，名字随便填。</p>
                  <p>② 进入这个项目，点「添加凭据」，身份认证方式选 <b>API KEY</b>（不要选 JSON Web Token），保存后复制那一长串 KEY。</p>
                  <p>③ 回到控制台左侧「设置」，复制 <b>API Host</b>（形如 abc123xyz.re.qweatherapi.com），填到下面。</p>
                  <p className="text-2xs">每月 5 万次以内免费，超出部分按量计费；本 App 每 10 分钟最多取一次，一般用不完。不要给这条凭据设「应用限制」，否则 App 的请求会被拒。</p>
                </div>
              )}
            </div>
            <label className="block"><span className="mb-1 block font-display text-meta font-bold">API KEY</span>
              <CfgInput value={s.weatherKey} onChange={(e) => updateSettings({ weatherKey: e.target.value })} placeholder="控制台 → 项目管理 → 凭据里的 API KEY" aria-label="和风天气 API KEY" /></label>
            <label className="block"><span className="mb-1 block font-display text-meta font-bold">API Host <span className="ml-1 rounded-[2px] bg-p4g-tag px-1 text-2xs text-p4g-white">必填</span></span>
              <CfgInput value={s.weatherHost} onChange={(e) => updateSettings({ weatherHost: e.target.value })} placeholder="如 abc123xyz.re.qweatherapi.com" aria-label="和风天气 API Host" /></label>
            <p className="text-meta text-p4g-ink-soft">不想注册？<button type="button" onClick={() => updateSettings({ weatherProvider: 'openmeteo' })} className="font-bold text-p4g-tag underline">先用 Open-Meteo</button>，免 Key，但服务器在欧美，国内偶尔连不上。</p>
          </>
        )}
        <div>
          <div className="mb-1 flex items-center justify-between gap-2"><span className="font-display text-meta font-bold">城市</span>
            {s.weatherCity && <span className="flex min-w-0 items-center gap-2"><span className="truncate text-meta font-bold">📍 {s.weatherCity.name}{s.weatherCity.adm ? ` · ${s.weatherCity.adm}` : ''}</span><CfgBtn onClick={() => updateSettings({ weatherCity: undefined })}>清除</CfgBtn></span>}</div>
          {canSearch ? (
            <>
              <div className="flex min-w-0 gap-2">
                <CfgInput value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="搜城市 / 区县，如「杭州」「朝阳」" aria-label="搜索城市" />
                <CfgBtn tone="primary" onClick={search} disabled={busy}>{busy ? '…' : '搜索'}</CfgBtn>
              </div>
              {results.length > 0 && (
                <ul className="mt-2 grid grid-cols-1 gap-1">
                  {results.map((c, i) => (
                    <li key={i}><button type="button" onClick={() => { updateSettings({ weatherCity: c }); setResults([]); setQ(''); }} className="flex w-full min-w-0 items-center gap-2 rounded-[3px] bg-p4g-surface px-3 py-2 text-left hover:bg-p4g-select hover:text-[color:var(--p4g-select-ink)]">
                      <span className="shrink-0 font-display text-body font-bold">{c.name}</span><span className="truncate text-meta opacity-75">{c.adm ?? `${c.lat.toFixed(3)}, ${c.lon.toFixed(3)}`}</span></button></li>
                  ))}
                </ul>
              )}
            </>
          ) : <p className="text-meta text-p4g-ink-soft">先填好 API KEY 和 API Host，才能用和风搜城市。</p>}
        </div>
        {!ready && <p className="text-meta font-bold text-p4g-tag">还差：{missing.join('、')}</p>}
        <CfgBtn tone="primary" className="w-full" disabled={!ready || busy} onClick={test}>{ready ? (busy ? '…' : '测试取数') : '填齐上面几项再测试'}</CfgBtn>
        {msg && <CfgMsg ok={msg.ok}>{msg.text}</CfgMsg>}
        <p className="text-2xs text-p4g-muted">{qw ? <>天气服务由 <a className="underline" href="https://www.qweather.com" target="_blank" rel="noopener noreferrer">和风天气</a> 驱动</> : <>天气数据来自 <a className="underline" href="https://open-meteo.com" target="_blank" rel="noopener noreferrer">Open-Meteo</a>（CC BY 4.0）</>}</p>
      </CfgBlock>
    </div>
  );
}
