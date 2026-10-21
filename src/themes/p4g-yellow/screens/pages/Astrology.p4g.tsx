/**
 * 星象页（真实 src/pages/Astrology.tsx，P4 分支）—— 三 Tab：今日塔罗 / 中长期占卜 / 档案
 * 路由：#/p/astrology?tab=daily|long|archive
 *   daily：?state=intro|pick|flipping|reading|done|error|resume|truncated|noai，?sec=glimpse&glimpse=eligible|buff|partial
 *   long ：?step=form|base|picking|reading，?state=noai|cap|resume
 *   archive：?state=empty，?detail=1（打开第一条详情）
 */
import { useEffect, useState } from 'react';
import type { LongReading } from '@/types';
import type { PageProps } from '@yellow/registry/types';
import { P4Tabs } from '@yellow/kit';
import { ChannelNoise } from '@yellow/fx';
import { useLowMotion } from '@yellow/lib/prefs';
import { navigate } from '@yellow/shell/shellBus';
import { LONG_READINGS } from '@yellow/adapters/pkg4-astro';
import { PkgHeader, DevStrip, StateFade } from '@yellow/screens/pkg4/ui';
import { DailyDraw, type DailyPhase } from '@yellow/screens/pkg4/DailyDraw';
import { LongReadingFlow, ReadingArchive, ReadingDetail, type LongStep } from '@yellow/screens/pkg4/LongReading';

type Tab = 'daily' | 'long' | 'archive';

const DAILY_STATES: Record<string, { phase: DailyPhase; err?: 'resume' | 'truncated' | 'fail'; noai?: boolean }> = {
  intro: { phase: 'intro' }, pick: { phase: 'pick' }, flipping: { phase: 'flipping' }, reading: { phase: 'calling' }, done: { phase: 'done' },
  error: { phase: 'error', err: 'fail' }, resume: { phase: 'error', err: 'resume' }, truncated: { phase: 'error', err: 'truncated' }, noai: { phase: 'pick', noai: true },
};

export default function Astrology({ tab: tabQ, params }: PageProps) {
  const low = useLowMotion();
  const [tab, setTab] = useState<Tab>((['daily', 'long', 'archive'].includes(tabQ ?? '') ? tabQ : 'daily') as Tab);
  const qState = params.get('state') ?? '';
  const sec = params.get('sec');
  // daily：默认「今日已抽」（?sec=glimpse 也显示结果 + 七日连星）
  const [dailyKey, setDailyKey] = useState<string>(tab === 'daily' && DAILY_STATES[qState] ? qState : 'intro');
  const [glimpse, setGlimpse] = useState<'eligible' | 'buff' | 'partial'>((params.get('glimpse') as 'buff') ?? 'eligible');
  const [longKey, setLongKey] = useState<string>(tab === 'long' ? (params.get('step') ?? qState) || 'form' : 'form');
  const [readings, setReadings] = useState<LongReading[]>(tab === 'archive' && qState === 'empty' ? [] : LONG_READINGS);
  const [detail, setDetail] = useState<LongReading | null>(tab === 'archive' && params.get('detail') ? LONG_READINGS[0] : null);
  const [noise, setNoise] = useState(false);
  useEffect(() => { if (sec === 'glimpse') setDailyKey('done'); }, [sec]);
  useEffect(() => { if (sec === 'glimpse') setTimeout(() => document.getElementById('fate-glimpse')?.scrollIntoView({ block: 'center' }), 400); }, [sec]);

  const switchTab = (t: string) => { if (t === tab) return; if (!low) setNoise(true); setTab(t as Tab); setDetail(null); };
  const ds = DAILY_STATES[dailyKey] ?? DAILY_STATES.intro;
  const activeCount = readings.filter((r) => !r.archived).length;
  const longStep = (['form', 'base', 'picking', 'reading'].includes(longKey) ? longKey : 'form') as LongStep;

  const tabs = [
    { id: 'daily', label: <TabLabel t="今日塔罗" h="每日一抽" /> },
    { id: 'long', label: <TabLabel t="中长期占卜" h="14 天效力" /> },
    { id: 'archive', label: <TabLabel t="档案" h={`${readings.length}`} /> },
  ];

  return (
    <div className="relative mx-auto max-w-xl space-y-5 pb-8">
      <PkgHeader title="星象" en="ARCANA" onBack={() => navigate('dashboard')} backLabel="返回首页" weather="night" />
      <P4Tabs items={tabs} value={tab} onChange={switchTab} fill ariaLabel="星象" />
      <ChannelNoise active={noise} duration={160} onDone={() => setNoise(false)} />

      <StateFade k={tab + (detail ? ':d' : '')}>
        {tab === 'daily' && (
          <div id="fate-glimpse" className="pb-4">
            <DailyDraw key={dailyKey + glimpse} initial={ds.phase} noApiKey={!!ds.noai} errorKind={ds.err} glimpse={glimpse} />
          </div>
        )}
        {tab === 'long' && (
          <LongReadingFlow key={longKey} initialStep={longStep} noApiKey={longKey === 'noai'} activeCount={longKey === 'cap' ? 2 : Math.min(activeCount, 1)} resume={longKey === 'resume'}
            onSaved={(r) => setReadings((l) => [r, ...l])} onBack={() => switchTab('archive')} />
        )}
        {tab === 'archive' && detail && (
          <ReadingDetail reading={detail} canFollowUp onBack={() => setDetail(null)}
            onArchive={(a) => { const r = { ...detail, archived: a }; setDetail(r); setReadings((l) => l.map((x) => (x.id === r.id ? r : x))); }}
            onDelete={() => { setReadings((l) => l.filter((x) => x.id !== detail.id)); setDetail(null); }}
            onFollowSaved={(f) => { const r = { ...detail, followUps: [f] }; setDetail(r); setReadings((l) => l.map((x) => (x.id === r.id ? r : x))); }} />
        )}
        {tab === 'archive' && !detail && <ReadingArchive readings={readings} onOpen={setDetail} />}
      </StateFade>

      {tab === 'daily' && (
        <DevStrip value={dailyKey} onChange={setDailyKey} items={[
          { id: 'intro', label: '洗牌' }, { id: 'pick', label: '选牌' }, { id: 'reading', label: '解读中' }, { id: 'done', label: '结果' },
          { id: 'error', label: '失败' }, { id: 'resume', label: '中断恢复' }, { id: 'truncated', label: '截断' }, { id: 'noai', label: '无 Key' },
        ]} />
      )}
      {tab === 'daily' && dailyKey === 'done' && (
        <DevStrip title="DEV · 七日连星" value={glimpse} onChange={(v) => setGlimpse(v as 'eligible')} items={[{ id: 'eligible', label: '可窥探' }, { id: 'buff', label: '祝福生效' }, { id: 'partial', label: '未集齐' }]} />
      )}
      {tab === 'long' && (
        <DevStrip value={longKey} onChange={setLongKey} items={[
          { id: 'form', label: '提问' }, { id: 'base', label: '注入波纹' }, { id: 'picking', label: '六选三' }, { id: 'reading', label: '解读' },
          { id: 'noai', label: '无 Key' }, { id: 'cap', label: '活跃上限' }, { id: 'resume', label: '未完成恢复' },
        ]} />
      )}
      {tab === 'archive' && (
        <DevStrip value={readings.length ? 'list' : 'empty'} onChange={(v) => { setDetail(null); setReadings(v === 'empty' ? [] : LONG_READINGS); }} items={[{ id: 'list', label: '有档案' }, { id: 'empty', label: '空' }]} />
      )}
    </div>
  );
}

function TabLabel({ t, h }: { t: string; h: string }) {
  return (
    <span className="flex min-w-0 flex-col items-center leading-tight">
      <span className="truncate">{t}</span>
      <span className="truncate text-2xs font-bold opacity-75">{h}</span>
    </span>
  );
}
