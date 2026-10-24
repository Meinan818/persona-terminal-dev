/**
 * 在线同伴名片 GUEST PROFILE（真实 OnlineConfidantProfileCard）——P4G Status 页版式：
 * 五维人格雷达 + 属性等级条、一起进步（发起共同行动）、祈愿、COOP 状态按钮（邀请/等待/响应/冷却/已缔结）、解除好友。
 * #/overlay/bond-online-profile?coop=none|pending|incoming|cooldown|linked&prayed=1&login=0
 */
import { useEffect, useState } from 'react';
import type { CloudProfile } from '@real/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Avatar, P4Button, P4Dialog, P4Sheet } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { ATTR_IDS, ATTR_NAMES } from '@yellow/screens/pkg3/arcana';
import { Sparkle, StatusTag } from '@yellow/screens/pkg3/ui';
import { PK3_PROFILES } from '@yellow/mock/pkg3';
import { PactPanelBody } from './PactPanel.p4g';

export type CoopStatus = 'none' | 'pending' | 'incoming' | 'cooldown_rejected' | 'cooldown_severed' | 'linked';

function Radar({ levels, max }: { levels: number[]; max: number }) {
  const R = 70; const pt = (i: number, r: number) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return `${100 + r * Math.cos(a)},${100 + r * Math.sin(a)}`; };
  return (
    <svg viewBox="0 0 200 200" className="h-auto w-full max-w-[200px]" aria-hidden>
      {[1, 0.66, 0.33].map((k) => <polygon key={k} points={[0, 1, 2, 3, 4].map((i) => pt(i, R * k)).join(' ')} fill={k === 1 ? 'var(--p4g-black)' : 'none'} stroke="var(--p4g-yellow)" strokeOpacity={0.5} strokeWidth={1.5} />)}
      <polygon points={levels.map((v, i) => pt(i, (R * Math.min(v, max)) / max)).join(' ')} fill="var(--p4g-yellow)" fillOpacity={0.85} stroke="var(--p4g-orange)" strokeWidth={3} />
      {ATTR_IDS.map((a, i) => { const [x, y] = pt(i, R + 18).split(',').map(Number); return <text key={a} x={x} y={y + 4} textAnchor="middle" fontSize="12" fontWeight={700} fill="var(--p4g-black)" fontFamily="var(--p4g-font-display)">{ATTR_NAMES[a]}</text>; })}
    </svg>
  );
}

export function OnlineProfileSheet({ isOpen, onClose, profile, initialCoop = 'none', loggedIn = true, initialPrayed = false, onProposeCoop, onAcceptCoop, onPray }: {
  isOpen: boolean; onClose: () => void; profile: CloudProfile; initialCoop?: CoopStatus; loggedIn?: boolean; initialPrayed?: boolean; onProposeCoop?: () => void; onAcceptCoop?: () => void; onPray?: () => void;
}) {
  const [prayed, setPrayed] = useState(initialPrayed);
  const [pending, setPending] = useState(false);
  const [sever, setSever] = useState(false);
  const [severing, setSevering] = useState(false);
  useEffect(() => { if (isOpen) setPrayed(initialPrayed); }, [isOpen, initialPrayed]);
  const name = profile.nickname || profile.userId || '未命名客人';
  const levels = ATTR_IDS.map((a) => profile.attributeLevels?.[a] ?? 0);
  const radarMax = Math.max(10, ...levels);
  const resetText = '凌晨 4 点';
  const coop = initialCoop;
  const pray = () => { if (prayed || pending || !loggedIn) return; setPending(true); window.setTimeout(() => { setPending(false); setPrayed(true); onPray?.(); }, 600); };
  const coopBtn = {
    linked: { t: '已缔结 COOP', s: '在同伴列表里找 Ta', run: undefined, tone: 'done' },
    pending: { t: '等 Ta 响应', s: '14 天内未响应过期', run: undefined, tone: 'wait' },
    incoming: { t: '响应 COOP', s: 'Ta 发来了提议', run: onAcceptCoop, tone: 'hot' },
    cooldown_rejected: { t: '冷却中', s: '3 天后可重试', run: undefined, tone: 'wait' },
    cooldown_severed: { t: '冷却中', s: '7 天后可重试', run: undefined, tone: 'wait' },
    none: { t: '邀请 COOP', s: '缔结在线同伴', run: onProposeCoop, tone: 'go' },
  }[coop];
  return (
    <>
      <P4Sheet open={isOpen} onClose={onClose} title={name} en="GUEST PROFILE" size="tall">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-3">
              <P4Avatar name={name} size={64} ring="orange" />
              <div className="min-w-0">
                <div className="truncate font-display text-meta font-bold text-p4g-ink-soft">@{profile.userId ?? '—'}</div>
                <div className="flex items-baseline gap-1"><span className="font-display text-lead font-bold italic text-[color:var(--p4g-rank)]">LV</span><span className="p4g-num text-h1 leading-none">{profile.totalLv}</span></div>
                <StatusTag tone="online" className="mt-1">ONLINE</StatusTag>
              </div>
            </div>
            <div className="mt-2 rounded-sm bg-p4g-surface px-3 py-2 text-meta">▸ 本周目标：每天背 50 个单词 · 4/7</div>
            <div className="mt-3 grid grid-cols-1 gap-1">
              {ATTR_IDS.map((a, i) => (
                <div key={a} className="flex min-w-0 items-center gap-2 rounded-[2px] px-2 py-1" style={{ background: 'var(--p4g-surface-grad)' }}>
                  <span className="w-10 shrink-0 font-display text-meta font-bold">{ATTR_NAMES[a]}</span>
                  <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-[2px] bg-p4g-black/80"><div className="h-full origin-left bg-p4g-orange" style={{ transform: `scaleX(${levels[i] / radarMax})` }} /></div>
                  <span className="w-8 shrink-0 text-right p4g-num text-meta">{levels[i]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex min-w-0 flex-col items-center rounded-sm border-3 border-p4g-black bg-p4g-yellow p-2 text-p4g-black">
            <Radar levels={levels} max={radarMax} />
            <div className="text-2xs font-bold">外圈 = LV {radarMax}</div>
          </div>
        </div>

        <div className="mt-4"><PactPanelBody partnerId={profile.userId ?? ''} partnerName={name} isConfidant={coop === 'linked'} initialState={loggedIn ? 'none' : 'guest'} proposeLabel="发起共同行动" /></div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" disabled={prayed || pending || !loggedIn} onClick={pray} className={cx('p4g-press flex min-w-0 flex-col items-center justify-center rounded-sm border-3 px-2 py-2.5 text-center disabled:cursor-default', prayed || !loggedIn ? 'border-p4g-line bg-p4g-surface-2 text-p4g-muted' : 'border-p4g-black bg-p4g-yellow text-p4g-black shadow-hard')}>
            <span className="flex items-center gap-1 font-display text-body font-bold"><span className="text-base">✦</span><span>{!loggedIn ? '登录后可祈愿' : pending ? '祈愿中…' : prayed ? '今日已祈愿' : '为 Ta 祈愿'}</span></span>
            <span className="text-2xs opacity-80">{prayed ? `今天已祈愿 · ${resetText}刷新` : '双方各 +2 SP'}</span>
          </button>
          <button type="button" disabled={!coopBtn.run || !loggedIn} onClick={coopBtn.run} className={cx('p4g-press flex min-w-0 flex-col items-center justify-center rounded-sm border-3 px-2 py-2.5 text-center disabled:cursor-default',
            coopBtn.tone === 'go' ? 'border-p4g-black bg-p4g-black text-p4g-yellow shadow-[4px_4px_0_var(--p4g-orange)]' : coopBtn.tone === 'hot' ? 'border-p4g-black bg-p4g-orange text-p4g-black shadow-hard' : coopBtn.tone === 'done' ? 'border-p4g-black bg-p4g-success text-p4g-success-ink' : 'border-p4g-line bg-p4g-surface-2 text-p4g-ink-soft')}>
            <span className="flex items-center gap-1 font-display text-body font-bold"><Sparkle size={12} /><span>{coopBtn.t}</span></span>
            <div className="mt-0.5 text-2xs opacity-85">{coopBtn.s}</div>
          </button>
        </div>
        <p className="mt-2 text-2xs text-p4g-ink-soft">Ta 给你的 SP 会先攒在通知里；开启逆影战场后自动入账。</p>
        <div className="mt-3 flex items-center justify-between gap-3 border-t-2 border-dashed border-p4g-line pt-3 text-cap text-p4g-ink-soft">
          <span>最近同步：2 小时前</span>
          <button type="button" onClick={() => setSever(true)} className="font-display font-bold text-p4g-danger underline underline-offset-2">解除好友关系</button>
        </div>
      </P4Sheet>
      <P4Dialog open={sever} onClose={() => !severing && setSever(false)} danger actions="none" title="解除好友关系" message={<>确认要与 {name} 解除好友？<br />解除后 7 天内无法再次相互邀请。</>}>
        <div className="flex gap-3 pb-1">
          <P4Button variant="secondary" block disabled={severing} onClick={() => setSever(false)}>再想想</P4Button>
          <P4Button variant="danger" block busy={severing} onClick={() => { setSevering(true); window.setTimeout(() => { setSevering(false); setSever(false); onClose(); }, 700); }}>{severing ? '处理中…' : '确认解除'}</P4Button>
        </div>
      </P4Dialog>
    </>
  );
}

export default function OnlineConfidantProfileCard({ open, onClose, params }: OverlayProps) {
  return <OnlineProfileSheet isOpen={open} onClose={onClose} profile={PK3_PROFILES.yosuke} initialCoop={(params?.get('coop') as CoopStatus) || 'none'} loggedIn={params?.get('login') !== '0'} initialPrayed={params?.get('prayed') === '1'}
    onProposeCoop={() => { window.location.hash = '#/overlay/bond-coop-propose'; }} onAcceptCoop={() => { window.location.hash = '#/overlay/bond-coop-accept'; }} />;
}
