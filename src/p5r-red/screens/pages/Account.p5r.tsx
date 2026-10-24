/**
 * 【2026-10-21 parity 修复】页面默认 = 原生 v3 pages_b.js account 版式 1:1：SAVE DATA 页头 + 三个存档槽（01 云同步 · Cloud / 02 本机存档 / 03 从备份恢复）+ 危险区域撕纸卡；
 *   点槽 = v3 的 P5.B.openCloud() / openData()：进入下方全量区块（云同步 CloudCard / 数据管理 DataCards）；危险区域三钮 → account-confirms（logout / reset / deleteCloud）。
 *   直达 ?state= / ?view= / ?sec= / ?consent= 直接进全量区块（保持清单路由）；全量区块顶部「◀ 账号与数据」回到存档槽。
 * 账号与数据 Account（真实 src/pages/Account.tsx 的 p5 分支：页头 → 数据管理 DATA（备份导出 / 从备份恢复 / 危险区域）→ 云同步 CLOUD）。
 * 长相 = v3 pages_b.js 页头（SAVE DATA / 账号与数据）+ overlays/b.js 的 openData / openCloud 全量区块（.ob-card 撕纸卡）。
 * 进入页面时：已登录老用户若还没同意云同步说明 → 补弹 CloudConsentNotice（?consent=1 演示）。
 *
 * 路由状态：
 *   ?state=signed-in（默认）| noid（未设 UserID）| syncing（同步中）| fail（同步失败）| signed-out（未登录）| expired（登录已失效）| unconf（未配置）
 *   ?view=export&step=idle|exporting|download|shared|copied|copyfail|exportfail（备份导出全流程，滚到数据管理）
 *   ?view=restore&step=loaded|importing|imported|importfail|imgpack|readfail（从备份恢复全流程，滚到从备份恢复）
 *   ?sec=data|privacy|cloud（滚到对应区块）· ?consent=1（补弹云同步说明）
 */
import { useLayoutEffect, useRef, useState } from 'react';
import type { PageProps } from '@/p5r-red/registry/types';
import { P5PageHeader, P5Back } from '@/p5r-red/kit/P5PageHeader';
import { DevStateBar } from '@/p5r-red/kit/DevStateBar';
import { P5Shp } from '@/p5r-red/kit/P5Shp';
import { P5Plate } from '@/p5r-red/kit/P5Plate';
import { P5Button } from '@/p5r-red/kit/P5Button';
import { sfx } from '@/p5r-red/fx/sfx';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import { ATTR_ORDER, D } from '@/p5r-red/mock/data';
import { panelIn } from '@/p5r-red/fx/motion';
import { openOverlay } from '@/p5r-red/shell/shellBus';
import { CloudCard, DataCards, CLOUD_STATES, DATA_STATES } from '@/p5r-red/screens/overlays/AccountBlocks';
import { useAccountIdentity } from '@/themes/accountAuth';
import { useAppStore } from '@/store';
import { useCloudStore } from '@/store/cloud';
import { SESSION_EXPIRED_MESSAGE } from '@/services/velvetApi';
import { streakDates } from '@/utils/streak';
import './Settings.p5r.css';

type Full = 'cloud' | 'data' | null;
const TOTAL = ATTR_ORDER.reduce((s, k) => s + D.attrs[k].pts, 0);
const EXPORT_STEPS = ['idle', 'exporting', 'download', 'shared', 'copied', 'copyfail', 'exportfail'];
export default function Account({ params }: PageProps) {
  // 登录态从真实 cloudUser 派生；路由参数 ?state= 仍可覆盖（演示/验收用）。
  const identity = useAccountIdentity();
  const cloudStatus = useCloudStore((s) => s.syncStatus);
  const lastCloudError = useCloudStore((s) => s.lastError);
  const derivedState = identity.cloudEnabled
    ? (!identity.signedIn && lastCloudError === SESSION_EXPIRED_MESSAGE
      ? 'expired'
      : identity.signedIn
        ? (cloudStatus === 'syncing' ? 'syncing' : cloudStatus === 'error' ? 'fail' : identity.username ? 'signed-in' : 'noid')
        : 'signed-out')
    : 'unconf';
  const state = params.get('state') ?? derivedState;
  // 存档槽文案走真实值（原来写死"已登录 · 上次同步 10.20 16:02" / "记录 42 天"）。
  const activities = useAppStore((s) => s.activities);
  const activeDays = new Set(streakDates(activities)).size;
  const SLOTS: [string, string, string, string][] = [
    ['云同步 · Cloud', identity.signedIn ? identity.lastSyncLabel : '未登录', '登录云端 / 从云端拉取', 'cloud'],
    ['本机存档', `总点数 ${TOTAL} · 记录 ${activeDays} 天`, '备份导出', 'local'],
    ['从备份恢复', '或拖拽 .json 到这里 · 背景图与 API Key 不会在备份中', '选择文件', 'restore'],
  ];
  const view = params.get('view');
  const step = params.get('step') ?? (view === 'restore' ? 'loaded' : 'idle');
  const sec = params.get('sec') ?? (view === 'export' ? 'data' : view === 'restore' ? 'restore' : null);
  const root = useRef<HTMLDivElement>(null);
  const init: Full = params.has('view') || sec === 'data' || sec === 'restore' ? 'data' : (params.has('state') || params.has('sec') || params.has('consent')) ? 'cloud' : null;
  const [full, setFull] = useState<Full>(init);
  const [sel, setSel] = useState(0);
  useLayoutEffect(() => {
    const r = root.current; if (!r) return;
    if (!full) {
      if (isLowMotion()) return;
      const a = [...r.querySelectorAll('.slot5')].map((x, i) => x.animate([{ opacity: 0, transform: 'translateY(-30px) rotateX(70deg)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: 80 + i * 90, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }));
      const s2 = panelIn(r.querySelectorAll('.acc-danger'), { delay: 0.35 });
      return () => { a.forEach((x) => x.cancel()); s2(); };
    }
    const stop = panelIn(r.querySelectorAll('.st5-body > *'), { from: 'right', stagger: 0.06, delay: 0.1 });
    const t = sec ? r.querySelector(`#sec-${sec}`) : null;
    if (t) setTimeout(() => t.scrollIntoView({ block: 'start' }), 60);
    if (params.get('consent') === '1') setTimeout(() => openOverlay('account-consent', { variant: 'catchup' }), 500);
    return stop;
  }, [full]); // eslint-disable-line react-hooks/exhaustive-deps
  const dataState = view === 'export' ? (EXPORT_STEPS.includes(step) ? step : 'idle') : view === 'restore' ? step : 'idle';
  return (
    <div className="st5 acc5 acc5x" ref={root}>
      <P5PageHeader ransom="SAVE DATA" cn="账号与数据" sub="云同步 · 数据管理 · 备份导出" seed={111} right={<P5Back to="settings" />} />
      {!full ? (<>
        <section className="acc-slots">{SLOTS.map(([tt, s, a, k], i) => (
          <button key={k} type="button" className={`slot5${i === sel ? ' sel' : ''}`} data-k={k} style={{ ['--i' as string]: i }} onClick={() => { sfx('nav', 0.4); setSel(i); setFull(k === 'cloud' ? 'cloud' : 'data'); window.scrollTo(0, 0); }}>
            <i className="req-bg" /><i className="req-cur" /><span className="sl-no">{String(i + 1).padStart(2, '0')}</span><span className="sl-m"><b>{tt}</b><small>{s}</small></span><span className="tag">{a}</span>
          </button>
        ))}</section>
        <P5Shp as="section" kind="torn" seed={112} className="acc-danger">
          <P5Plate fs={16}>危险区域</P5Plate><p className="sh-p">此操作无法撤销！删除全部数据，无法恢复。</p>
          <div className="sh-acts" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
            <P5Button tone="ink" seed={113} onClick={() => openOverlay('account-confirms', { variant: 'logout' })}>退出登录</P5Button>
            <P5Button tone="red" seed={114} onClick={() => openOverlay('account-confirms', { variant: 'reset' })}>重置所有数据</P5Button>
            <P5Button tone="red" seed={115} onClick={() => openOverlay('account-confirms', { variant: 'deleteCloud' })}>永久删除云端账号</P5Button>
          </div>
        </P5Shp>
      </>) : (
      <div className="ob-pn-body st5-body">
        <button type="button" className="st5-tolist" onClick={() => { sfx('nav', 0.35); setFull(null); window.scrollTo(0, 0); }}>◀ 账号与数据</button>
        {full === 'data' && <DataCards key={dataState} state={dataState} />}
        {full === 'cloud' && <CloudCard key={state} state={state} />}
      </div>)}
      <DevStateBar page="account" items={[
        { label: 'v3 存档槽', q: '' },
        ...CLOUD_STATES.map(([k, l]) => ({ label: `云同步·${l}`, q: `state=${k}` })),
        { label: '补弹云同步说明', q: 'consent=1' }, { label: '数据类目', q: 'sec=privacy' },
        ...DATA_STATES.map(([k, l]) => ({ label: `数据·${l}`, q: EXPORT_STEPS.includes(k) ? `view=export&step=${k}` : `view=restore&step=${k}` })),
      ]} />
    </div>
  );
}
