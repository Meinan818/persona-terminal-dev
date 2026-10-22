/**
 * 在线同伴名片 GUEST PROFILE（真实 OnlineConfidantProfileCard）—— P3R Status 页版式：
 * 五维人格雷达（粉藕双层）+ 属性等级斜条、一起进步（发起共同行动）、祈愿、COOP 状态按钮（邀请 / 等待 / 响应 / 冷却 / 已缔结）、解除好友。
 *   #/overlay/bond-online-profile?coop=none|pending|incoming|cooldown_rejected|cooldown_severed|linked&prayed=1&login=0
 * 入口：卡墙好友牌下滑 / 牌背 @UserID · 同伴详情 @UserID · 通知。
 */
import { useEffect, useState } from 'react';
import type { CloudProfile } from '@real/types';
import type { OverlayProps } from '@blue/registry/types';
import { P3Avatar, P3Dialog, P3R, P3Sheet, showToast, slantClip, tickClip } from '@blue/kit';
import { ATTR_IDS, ATTR_NAMES } from '@blue/screens/pkg3/arcana';
import { Sparkle, StatusTag } from '@blue/screens/pkg3/ui';
import { PK3_PROFILES } from '@blue/mock/pkg3';
import { PactPanelBody } from './PactPanel.p3r';
import { PrayerEffect } from './PrayerEffectOverlay.p3r';

export type CoopStatus = 'none' | 'pending' | 'incoming' | 'cooldown_rejected' | 'cooldown_severed' | 'linked';

function Radar({ levels, max }: { levels: number[]; max: number }) {
  const R = 66; const pt = (i: number, r: number) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return [100 + r * Math.cos(a), 100 + r * Math.sin(a)] as const; };
  const poly = (r: (i: number) => number) => [0, 1, 2, 3, 4].map((i) => pt(i, r(i)).join(',')).join(' ');
  return (
    <svg viewBox="0 0 200 200" className="h-auto w-full max-w-[210px]" role="img" aria-label={`五维：${ATTR_IDS.map((a, i) => `${ATTR_NAMES[a]} ${levels[i]}`).join('，')}`}>
      <polygon points={poly(() => R)} fill="var(--p3r-cyan-faint)" stroke="var(--p3r-cyan)" strokeWidth={2} />
      {[0.66, 0.33].map((k) => <polygon key={k} points={poly(() => R * k)} fill="none" stroke="var(--p3r-cyan)" strokeOpacity={0.6} strokeWidth={1.2} strokeDasharray="3 3" />)}
      <polygon points={poly((i) => (R * Math.min(levels[i], max)) / max + 4)} fill="var(--p3r-cyan)" fillOpacity={0.45} transform="translate(4 4)" />
      <polygon points={poly((i) => (R * Math.min(levels[i], max)) / max)} fill="var(--p3r-blue)" fillOpacity={0.88} stroke="var(--p3r-panel)" strokeWidth={2.5} strokeLinejoin="round" />
      {ATTR_IDS.map((a, i) => { const [x, y] = pt(i, R + 20); return <text key={a} x={x} y={y + 4} textAnchor="middle" fontSize="12" fontWeight={900} fill="var(--p3r-ink)">{ATTR_NAMES[a]}</text>; })}
    </svg>
  );
}

export function OnlineProfileSheet({ isOpen, onClose, profile, initialCoop = 'none', loggedIn = true, initialPrayed = false, onProposeCoop, onAcceptCoop }: {
  isOpen: boolean; onClose: () => void; profile: CloudProfile; initialCoop?: CoopStatus; loggedIn?: boolean; initialPrayed?: boolean; onProposeCoop?: () => void; onAcceptCoop?: () => void;
}) {
  const [prayed, setPrayed] = useState(initialPrayed);
  const [pending, setPending] = useState(false);
  const [fx, setFx] = useState(false);
  const [sever, setSever] = useState(false);
  const [severing, setSevering] = useState(false);
  useEffect(() => { if (isOpen) setPrayed(initialPrayed); }, [isOpen, initialPrayed]);
  const name = profile.nickname || profile.userId || '未命名客人';
  const levels = ATTR_IDS.map((a) => profile.attributeLevels?.[a] ?? 0);
  const radarMax = Math.max(10, ...levels);
  const pray = () => { if (prayed || pending || !loggedIn) return; setPending(true); window.setTimeout(() => { setPending(false); setPrayed(true); setFx(true); }, 600); };
  const coopBtn = ({
    linked: { t: '已缔结 COOP', s: '在同伴列表里找 Ta', run: undefined, tone: 'done' },
    pending: { t: '等 Ta 响应', s: '14 天内未响应过期', run: undefined, tone: 'wait' },
    incoming: { t: '响应 COOP', s: 'Ta 发来了提议', run: onAcceptCoop, tone: 'hot' },
    cooldown_rejected: { t: '冷却中', s: '3 天后可重试', run: undefined, tone: 'wait' },
    cooldown_severed: { t: '冷却中', s: '7 天后可重试', run: undefined, tone: 'wait' },
    none: { t: '邀请 COOP', s: '缔结在线同伴', run: onProposeCoop, tone: 'go' },
  } as const)[initialCoop];
  const coopBg = coopBtn.tone === 'go' ? P3R.blue : coopBtn.tone === 'hot' ? P3R.magenta : coopBtn.tone === 'done' ? P3R.cyan : P3R.cyanFaint;
  const coopFg = coopBtn.tone === 'go' ? P3R.onBlue : coopBtn.tone === 'hot' ? '#fff' : coopBtn.tone === 'done' ? 'var(--p3r-mulberry)' : P3R.grey;
  return (
    <>
      <P3Sheet open={isOpen} onClose={onClose} title={name} en="GUEST PROFILE" size="tall">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-3">
              <P3Avatar name={name} size={62} />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-black" style={{ color: P3R.inkSoft }}>@{profile.userId ?? '—'}</div>
                <div className="flex items-baseline gap-1"><span className="font-cond text-[16px]" style={{ color: P3R.roseInk }}>LV</span><span className="font-cond text-[40px] leading-none" style={{ color: P3R.ink }}>{profile.totalLv}</span></div>
                <StatusTag tone="online" className="mt-1">ONLINE</StatusTag>
              </div>
            </div>
            <div className="mt-2 truncate px-3 py-1.5 text-[12px] font-bold" style={{ background: 'var(--p3r-row)', color: P3R.inkSoft, clipPath: slantClip(6) }}>◎ 本周目标：每天背 50 个单词 · 4/7</div>
            <div className="mt-3 grid grid-cols-1 gap-1">
              {ATTR_IDS.map((a, i) => (
                <div key={a} className="flex min-w-0 items-center gap-2 px-3 py-1" style={{ background: i % 2 ? 'var(--p3r-row-alt)' : 'var(--p3r-row)', clipPath: slantClip(5) }}>
                  <span className="w-10 shrink-0 text-[13px] font-black" style={{ color: P3R.ink }}>{ATTR_NAMES[a]}</span>
                  <div className="h-2.5 min-w-0 flex-1 overflow-hidden" style={{ background: 'var(--p3r-track)', clipPath: slantClip(3) }}><div className="h-full w-full origin-left" style={{ background: `linear-gradient(90deg, ${P3R.cyan}, ${P3R.blue})`, transform: `scaleX(${levels[i] / radarMax})` }} /></div>
                  <span className="w-8 shrink-0 text-right font-cond text-[15px]" style={{ color: P3R.roseInk }}>{levels[i]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative flex min-w-0 flex-col items-center px-2 py-2" style={{ background: P3R.panel, clipPath: slantClip(12), boxShadow: 'var(--p3r-shadow)' }}>
            <span aria-hidden className="absolute bottom-0 right-4 h-[6px] w-[14px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
            <Radar levels={levels} max={radarMax} />
            <div className="font-cond text-[11px]" style={{ color: P3R.grey }}>外圈 = LV {radarMax}</div>
          </div>
        </div>
        <div className="mt-4"><PactPanelBody partnerName={name} isConfidant={initialCoop === 'linked'} initialState={loggedIn ? 'none' : 'guest'} proposeLabel="发起共同行动" /></div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" disabled={prayed || pending || !loggedIn} onClick={pray} className="relative flex min-w-0 flex-col items-center justify-center px-2 py-2.5 text-center"
            style={{ clipPath: slantClip(10), background: prayed || !loggedIn ? P3R.cyanFaint : 'var(--p3r-mulberry)', color: prayed || !loggedIn ? P3R.grey : 'var(--p3r-cream)' }}>
            <span className="flex items-center gap-1 text-[14px] font-black"><Sparkle size={13} /><span>{!loggedIn ? '登录后可祈愿' : pending ? '祈愿中…' : prayed ? '今日已祈愿' : '为 Ta 祈愿'}</span></span>
            <span className="text-[11px] opacity-80">{prayed ? '今天已祈愿 · 凌晨 4 点刷新' : '双方各 +2 SP'}</span>
          </button>
          <button type="button" disabled={!coopBtn.run || !loggedIn} onClick={coopBtn.run} className="flex min-w-0 flex-col items-center justify-center px-2 py-2.5 text-center" style={{ clipPath: slantClip(10), background: coopBg, color: coopFg }}>
            <span className="flex items-center gap-1 text-[14px] font-black"><Sparkle size={12} /><span>{coopBtn.t}</span></span>
            <span className="mt-0.5 text-[11px] opacity-85">{coopBtn.s}</span>
          </button>
        </div>
        <p className="mt-2 text-[11px]" style={{ color: P3R.grey }}>Ta 给你的 SP 会先攒在通知里；开启逆影战场后自动入账。</p>
        <div className="mt-3 flex items-center justify-between gap-3 pt-3 text-[12px]" style={{ borderTop: '2px dashed rgb(var(--p3r-cyan-rgb) / 0.45)', color: P3R.grey }}>
          <span>最近同步：2 小时前</span>
          <button type="button" onClick={() => setSever(true)} className="font-black underline underline-offset-2" style={{ color: 'var(--p3r-coral-ink)' }}>解除好友关系</button>
        </div>
      </P3Sheet>
      <P3Dialog open={sever} onClose={() => setSever(false)} tone="danger" title="解除好友关系" busy={severing} busyText="处理中…" confirmText="确认解除" cancelText="再想想"
        description={<>确认要与 {name} 解除好友？{'\n'}解除后 7 天内无法再次相互邀请。</>}
        onConfirm={() => { setSevering(true); window.setTimeout(() => { setSevering(false); setSever(false); showToast(`已与 ${name} 解除好友`); onClose(); }, 700); }} />
      <PrayerEffect isOpen={fx} kind="sent" targetName={name} onDismiss={() => setFx(false)} />
    </>
  );
}

export default function OnlineConfidantProfileCard({ open, onClose, params }: OverlayProps) {
  return <OnlineProfileSheet isOpen={open} onClose={onClose} profile={PK3_PROFILES.junpei} initialCoop={(params?.get('coop') as CoopStatus) || 'none'} loggedIn={params?.get('login') !== '0'} initialPrayed={params?.get('prayed') === '1'}
    onProposeCoop={() => { window.location.hash = '#/overlay/bond-coop-propose'; }} onAcceptCoop={() => { window.location.hash = '#/overlay/bond-coop-accept'; }} />;
}
