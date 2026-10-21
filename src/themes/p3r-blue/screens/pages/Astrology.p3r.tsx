/**
 * 星象页（真实 src/pages/Astrology.tsx 的 p3 分支，蓝白重画）—— 三 Tab：今日塔罗 / 中长期占卜 / 档案
 * 页头：GhostWords ARCANA + P3PageHeader ticks「星象」（返回首页）；切换头 = 真实 p3Tabs 双行斜块（选中蓝块 + 臂章红角，layoutId 滑动）
 * 路由（每阶段直达）：
 *   daily  ：默认 intro（洗牌）；?phase=pick|flipping|streaming|truncated|nokey|offline|resume；?state=reading|done|error；?fail=error|midError|truncate|offline
 *            ?sec=glimpse&glimpse=eligible|partial|buff（今日已抽 + 七日连星）
 *   long   ：默认 form；?step=base|picking|revealing|thinking|streaming|reading|error；?step=reading&follow=form|picking|reading；?state=noai|cap|resume
 *   archive：默认列表；?state=empty；?detail=1
 */
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { LongReading } from '@/types';
import type { PageProps } from '@blue/registry/types';
import { P3PageHeader, GhostWords, P3R, slantClip } from '@blue/kit';
import { PageEnter, type AIFail } from '@blue/fx';
import { useLowMotion } from '@blue/lib/prefs';
import { navigate } from '@blue/shell/shellBus';
import { LONG_READINGS } from '@blue/adapters/pkg4-astro';
import { DevStrip, StateFade } from '@blue/screens/pkg4/ui';
import { DailyDraw, type DailyInit } from '@blue/screens/pkg4/DailyDraw';
import { LongReadingFlow, ReadingArchive, ReadingDetail, type LongInit, type FollowPhase } from '@blue/screens/pkg4/LongReading';

type Tab = 'daily' | 'long' | 'archive';

const DAILY: Record<string, DailyInit> = {
  intro: { phase: 'intro' },
  pick: { phase: 'pick' },
  flipping: { phase: 'flipping' },
  reading: { phase: 'calling', ai: 'thinking' },
  streaming: { phase: 'calling', ai: 'streaming' },
  done: { phase: 'done' },
  error: { phase: 'error', ai: 'error', fail: 'error' },
  truncated: { phase: 'error', ai: 'truncated', fail: 'truncate' },
  nokey: { phase: 'intro', noApiKey: true },
  offline: { phase: 'done', offline: true },
  resume: { phase: 'error', resume: true },
  failoffline: { phase: 'error', ai: 'error', fail: 'offline' },
};
const LONG: Record<string, LongInit> = {
  form: { step: 'form' },
  base: { step: 'base' },
  picking: { step: 'picking' },
  revealing: { step: 'revealing' },
  thinking: { step: 'reading', ai: 'thinking' },
  streaming: { step: 'reading', ai: 'streaming' },
  reading: { step: 'done' },
  error: { step: 'reading', ai: 'truncated', fail: 'truncate' },
  noai: { step: 'form', noApiKey: true },
  cap: { step: 'form', cap: true },
  resume: { step: 'form', resume: true },
};

export default function Astrology({ tab: tabQ, params }: PageProps) {
  const low = useLowMotion();
  const [tab, setTab] = useState<Tab>((['daily', 'long', 'archive'].includes(tabQ ?? '') ? tabQ : 'daily') as Tab);
  const qState = params.get('state') ?? '';
  const qPhase = params.get('phase') ?? '';
  const sec = params.get('sec');
  const fail = params.get('fail') as AIFail;
  const reel = params.get('__reel') === '1' || params.get('demo') === '1';
  const initialDaily = sec === 'glimpse' ? 'done' : DAILY[qPhase] ? qPhase : DAILY[qState] ? qState : 'intro';
  const [dailyKey, setDailyKey] = useState(tab === 'daily' ? initialDaily : 'intro');
  const [glimpse, setGlimpse] = useState<'eligible' | 'buff' | 'partial'>((['buff', 'partial'].includes(params.get('glimpse') ?? '') ? params.get('glimpse') : 'eligible') as 'eligible');
  const lk = params.get('step') || qState;
  const [longKey, setLongKey] = useState(tab === 'long' && LONG[lk] ? lk : 'form');
  const follow = (['form', 'picking', 'reading'].includes(params.get('follow') ?? '') ? params.get('follow') : undefined) as FollowPhase | undefined;
  const [readings, setReadings] = useState<LongReading[]>(tab === 'archive' && qState === 'empty' ? [] : LONG_READINGS);
  const [detail, setDetail] = useState<LongReading | null>(tab === 'archive' && params.get('detail') ? LONG_READINGS[0] : null);

  useEffect(() => { if (sec === 'glimpse') { const t = window.setTimeout(() => document.getElementById('fate-glimpse')?.scrollIntoView({ block: 'center', behavior: low ? 'auto' : 'smooth' }), 900); return () => clearTimeout(t); } }, [sec, low]);

  const switchTab = (t: Tab) => { if (t === tab) return; setTab(t); setDetail(null); };
  const di = { ...(DAILY[dailyKey] ?? DAILY.intro), ...(fail && dailyKey === 'reading' ? { fail, ai: 'thinking' as const } : {}) };
  const li = { ...(LONG[longKey] ?? LONG.form), follow: longKey === 'reading' ? follow : undefined, autoHold: reel };
  const activeCount = readings.filter((r) => !r.archived && r.expiresAt >= new Date().toISOString().slice(0, 10)).length;

  const tabs: Array<{ id: Tab; label: string; hint: string }> = [
    { id: 'daily', label: '今日塔罗', hint: '每日一抽' },
    { id: 'long', label: '中长期占卜', hint: '14 天效力' },
    { id: 'archive', label: '档案', hint: `${readings.length}` },
  ];

  return (
    <PageEnter k="astrology">
      <div className="relative mx-auto max-w-xl space-y-5 pb-8">
        <GhostWords words={['ARCANA']} className="right-[8px] top-[-12px] text-right text-[72px]" />
        <P3PageHeader ticks title="星象" en="ARCANA" ghost={false} onBack={() => navigate('dashboard')} className="relative pt-2" />
        <div className="relative flex items-stretch" role="tablist" aria-label="星象">
          {tabs.map((t, i) => {
            const active = tab === t.id;
            return (
              <button key={t.id} type="button" role="tab" aria-selected={active} onClick={() => switchTab(t.id)}
                className="relative min-w-0 flex-1 px-1 py-2.5 text-center focus-visible:outline-none"
                style={{ clipPath: slantClip(12), background: P3R.panel, marginLeft: i > 0 ? -7 : 0, zIndex: active ? 2 : 1 }}>
                {active && <motion.span layoutId="astro-tab" aria-hidden className="absolute inset-0" style={{ background: P3R.blue }} transition={low ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 38 }} />}
                <div className="relative truncate text-[15px] font-black leading-tight" style={{ color: active ? P3R.onBlue : P3R.ink }}>{t.label}</div>
                <div className="relative mt-0.5 truncate text-[11px] font-bold leading-none" style={{ color: active ? 'color-mix(in srgb, var(--p3r-on-blue) 85%, transparent)' : P3R.grey }}>{t.hint}</div>
                {active && <span aria-hidden className="absolute bottom-0 right-3 h-[8px] w-[20px]" style={{ background: P3R.magenta, clipPath: 'polygon(30% 0, 100% 0, 70% 100%, 0 100%)' }} />}
              </button>
            );
          })}
        </div>

        <StateFade k={tab + (detail ? ':d' : '')}>
          {tab === 'daily' && <div className="pb-4"><DailyDraw key={`d-${dailyKey}-${glimpse}`} init={di} glimpse={glimpse} /></div>}
          {tab === 'long' && (
            <div className="pb-4">
              <LongReadingFlow key={`l-${longKey}-${follow ?? ''}`} init={li} activeCount={Math.min(activeCount, 1)} onSaved={(r) => setReadings((l) => [r, ...l])} onBack={() => switchTab('archive')} />
            </div>
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
            { id: 'intro', label: '洗牌' }, { id: 'pick', label: '三选一' }, { id: 'flipping', label: '翻牌' }, { id: 'reading', label: '推理中' }, { id: 'streaming', label: '逐字' },
            { id: 'done', label: '结果' }, { id: 'error', label: '失败' }, { id: 'failoffline', label: '离线失败' }, { id: 'truncated', label: '截断' }, { id: 'resume', label: '中断恢复' },
            { id: 'nokey', label: '无 Key' }, { id: 'offline', label: '离线兜底' },
          ]} />
        )}
        {tab === 'daily' && dailyKey === 'done' && (
          <DevStrip title="DEV · 七日连星" value={glimpse} onChange={(v) => setGlimpse(v as 'eligible')} items={[{ id: 'eligible', label: '可窥探' }, { id: 'partial', label: '未集齐' }, { id: 'buff', label: '祝福生效' }]} />
        )}
        {tab === 'long' && (
          <DevStrip value={longKey} onChange={setLongKey} items={[
            { id: 'form', label: '提问' }, { id: 'base', label: '注入波纹' }, { id: 'picking', label: '六选三' }, { id: 'revealing', label: '依次翻开' }, { id: 'thinking', label: '推理中' },
            { id: 'streaming', label: '逐字' }, { id: 'reading', label: '解读与追问' }, { id: 'error', label: '截断' }, { id: 'noai', label: '无 Key' }, { id: 'cap', label: '活跃上限' }, { id: 'resume', label: '未完成恢复' },
          ]} />
        )}
        {tab === 'archive' && (
          <DevStrip value={readings.length ? 'list' : 'empty'} onChange={(v) => { setDetail(null); setReadings(v === 'empty' ? [] : LONG_READINGS); }} items={[{ id: 'list', label: '有档案' }, { id: 'empty', label: '空' }]} />
        )}
      </div>
    </PageEnter>
  );
}
