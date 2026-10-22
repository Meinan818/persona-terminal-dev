/**
 * 一起进步 · 发起 / 回应（真实 PactModals：PactProposeModal / PactRespondModal）。
 *   #/overlay/bond-pact-create   ?state=sent（已送出）
 *   #/overlay/bond-pact-respond  ?goal=different（不同目标：写自己的）&state=expired|accepted|declined
 */
import { useEffect, useState, type ReactNode } from 'react';
import type { AttributeId } from '@real/types';
import type { OverlayProps } from '@blue/registry/types';
import { P3Button, P3Input, P3R, P3Sheet, P3Stepper, slantClip, tickClip } from '@blue/kit';
import { ATTR_IDS, ATTR_NAMES } from '@blue/screens/pkg3/arcana';
import { Sparkle } from '@blue/screens/pkg3/ui';

const PACT_DAYS_OPTIONS = [7, 14, 30, 0];
const md = (k: string) => { const d = new Date(`${k}T12:00:00`); return `${d.getMonth() + 1}月${d.getDate()}日`; };
export const describePactTerms = (p: { kind: 'daily' | 'once'; days?: number; deadline?: string; mode: 'same' | 'different' }) => {
  const when = p.kind === 'daily' ? (p.days ? `每天打卡 · ${p.days} 天` : '每天打卡 · 不设期限') : `一次性目标 · ${p.deadline ? `${md(p.deadline)}前` : '无截止日'}`;
  return `${when} · ${p.mode === 'same' ? '共同目标' : '各做各的'}`;
};
const Label = ({ children }: { children: ReactNode }) => (
  <div className="mb-1.5 mt-4 flex items-center gap-1.5 first:mt-0"><span aria-hidden className="h-[10px] w-[7px]" style={{ background: P3R.blue, clipPath: tickClip }} /><span className="text-[13px] font-black" style={{ color: P3R.ink }}>{children}</span></div>
);
function Seg<T extends string | number>({ value, onChange, options, compact }: { value: T; onChange: (v: T) => void; options: { v: T; label: string; hint?: string }[]; compact?: boolean }) {
  return (
    <div className={compact ? 'grid grid-cols-4 gap-1.5' : 'grid grid-cols-2 gap-2'}>
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button key={String(o.v)} type="button" aria-pressed={on} onClick={() => onChange(o.v)} className={`relative min-w-0 px-3 ${compact ? 'py-2 text-center' : 'py-2.5 text-left'}`}
            style={{ clipPath: slantClip(8), background: on ? P3R.blue : P3R.cyanFaint, color: on ? P3R.onBlue : P3R.ink }}>
            <span className="block truncate text-[14px] font-black">{o.label}</span>
            {o.hint && <span className="block text-[11px] leading-snug" style={{ opacity: 0.8 }}>{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
function AttrRewardPicker({ value, onChange }: { value: { attribute: AttributeId; points: number }[]; onChange: (v: { attribute: AttributeId; points: number }[]) => void }) {
  const toggle = (a: AttributeId) => {
    const i = value.findIndex((x) => x.attribute === a);
    if (i >= 0) { if (value.length > 1) onChange(value.filter((_, j) => j !== i)); return; }
    onChange(value.length >= 2 ? [value[0], { attribute: a, points: value[1].points }] : [...value, { attribute: a, points: 1 }]);
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">{ATTR_IDS.map((a) => { const on = value.some((x) => x.attribute === a); return <button key={a} type="button" aria-pressed={on} onClick={() => toggle(a)} className="px-3 py-1 text-[13px] font-black" style={{ clipPath: slantClip(6), background: on ? P3R.ink : P3R.cyanFaint, color: on ? 'var(--p3r-on-ink)' : P3R.ink }}>{ATTR_NAMES[a]}</button>; })}</div>
      <div className="mt-2 grid grid-cols-1 gap-2">
        {value.map((x, i) => (
          <div key={x.attribute} className="flex items-center gap-3">
            <span className="w-14 truncate text-[12px] font-black" style={{ color: P3R.inkSoft }}>{ATTR_NAMES[x.attribute]}</span>
            <span className="text-[12px]" style={{ color: P3R.grey }}>每次</span>
            <P3Stepper value={x.points} min={1} max={5} onChange={(n) => onChange(value.map((y, j) => (j === i ? { ...y, points: n } : y)))} unit="点" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PactProposeSheet({ isOpen, onClose, partnerName, isConfidant = true, initialSent = false, onSent }: { isOpen: boolean; onClose: () => void; partnerName: string; isConfidant?: boolean; initialSent?: boolean; onSent?: () => void }) {
  const [kind, setKind] = useState<'daily' | 'once'>('daily');
  const [mode, setMode] = useState<'same' | 'different'>('same');
  const [title, setTitle] = useState('');
  const [days, setDays] = useState(14);
  const [deadline, setDeadline] = useState('2026-10-31');
  const [message, setMessage] = useState('');
  const [rewards, setRewards] = useState<{ attribute: AttributeId; points: number }[]>([{ attribute: 'guts', points: 1 }]);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(initialSent);
  useEffect(() => { if (isOpen) setSent(initialSent); }, [isOpen, initialSent]);
  const send = () => { setBusy(true); window.setTimeout(() => { setBusy(false); setSent(true); onSent?.(); }, 700); };
  return (
    <P3Sheet open={isOpen} onClose={onClose} title={`和 ${partnerName} 一起进步`} en="TOGETHER" size="tall" busy={busy}
      footer={sent ? <P3Button block size="lg" onClick={onClose}>好的</P3Button> : <div className="grid grid-cols-2 gap-3"><P3Button tone="soft" block disabled={busy} onClick={onClose}>再想想</P3Button><P3Button block corner busy={busy} busyText="发送中…" disabled={!title.trim()} onClick={send}>发出邀请</P3Button></div>}>
      {sent ? (
        <div className="py-8 text-center">
          <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center" style={{ background: P3R.blue, clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' }}><Sparkle size={28} style={{ color: P3R.onBlue }} /></span>
          <p className="mb-1 font-heavy text-[19px]" style={{ color: P3R.ink }}>邀请已送出</p>
          <p className="text-[13px] leading-relaxed" style={{ color: P3R.grey }}>{partnerName} 接受后，这件事会出现在你们各自的今日任务里。<br />3 天没回应会自动过期。</p>
        </div>
      ) : (
        <div>
          <p className="mb-3 px-4 py-3 text-[13px] leading-relaxed" style={{ background: 'var(--p3r-mulberry)', color: 'var(--p3r-cream)', clipPath: slantClip(10) }}>{isConfidant ? '约好一件事各自去做。同一天两人都完成，你们的亲密度 +1；连续同步满 7 天再 +2。' : '约好一件事各自去做，互相看得到进度，没完成可以催一下。（普通好友不涨亲密度）'}</p>
          <Label>怎么约</Label>
          <Seg value={kind} onChange={setKind} options={[{ v: 'daily', label: '每日打卡', hint: '一段时间里每天各做一次' }, { v: 'once', label: '一次性目标', hint: '截止日前各完成一次' }]} />
          <Label>目标</Label>
          <Seg value={mode} onChange={setMode} options={[{ v: 'same', label: '共同目标', hint: '两人做同一件事' }, { v: 'different', label: '不同目标', hint: `各做各的，${partnerName} 接受时写 Ta 的` }]} />
          <Label>{mode === 'same' ? '一起做的事' : '你这边要做的事'}</Label>
          <P3Input value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'daily' ? (mode === 'same' ? '比如：背 50 个单词' : '比如：晨跑 3 公里') : (mode === 'same' ? '比如：读完一本书' : '比如：把简历改完')} />
          {kind === 'daily' ? (<><Label>约多久</Label><Seg compact value={days} onChange={setDays} options={PACT_DAYS_OPTIONS.map((d) => ({ v: d, label: d ? `${d} 天` : '不设期限' }))} /></>)
            : (<><Label>截止日</Label><P3Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></>)}
          <Label>完成时加到（最多两项）</Label>
          <AttrRewardPicker value={rewards} onChange={setRewards} />
          <Label>对 {partnerName} 说一句（可选）</Label>
          <P3Input value={message} maxLength={120} onChange={(e) => setMessage(e.target.value)} placeholder="比如：这次一起坚持下来" />
          <p className="mt-3 font-cond text-[13px]" style={{ color: P3R.lilacInk }}>{describePactTerms({ kind, days, deadline, mode })}</p>
        </div>
      )}
    </P3Sheet>
  );
}

export function PactRespondSheet({ isOpen, onClose, name, mode = 'same', initialDone = null, expired = false, onDone }: { isOpen: boolean; onClose: () => void; name: string; mode?: 'same' | 'different'; initialDone?: 'accepted' | 'declined' | null; expired?: boolean; onDone?: (a: 'accepted' | 'declined') => void }) {
  const [done, setDone] = useState<'accepted' | 'declined' | null>(initialDone);
  const [busy, setBusy] = useState<'' | 'accept' | 'decline'>('');
  const [titleTo, setTitleTo] = useState('');
  useEffect(() => { if (isOpen) setDone(initialDone); }, [isOpen, initialDone]);
  const act = (k: 'accept' | 'decline') => { setBusy(k); window.setTimeout(() => { setBusy(''); const r = k === 'accept' ? 'accepted' : 'declined'; setDone(r); onDone?.(r); }, 600); };
  const pact = { titleFrom: '晨跑 3 公里', kind: 'daily' as const, days: 14, mode, message: '这次一起坚持下来' };
  return (
    <P3Sheet open={isOpen} onClose={onClose} title={`${name} 想和你一起进步`} en="INVITE" busy={!!busy}
      footer={done || expired ? <P3Button block size="lg" onClick={onClose}>好的</P3Button> : <div className="grid grid-cols-2 gap-3"><P3Button tone="soft" block disabled={!!busy} busy={busy === 'decline'} busyText="…" onClick={() => act('decline')}>婉拒</P3Button><P3Button block corner busy={busy === 'accept'} busyText="处理中…" disabled={mode === 'different' && !titleTo.trim()} onClick={() => act('accept')}>接受</P3Button></div>}>
      {expired ? <p className="py-6 text-center text-[13px]" style={{ color: P3R.grey }}>这份邀请已经不能回应了（已处理或过期）。</p> : done ? (
        <div className="py-8 text-center">
          <div className="mb-3 font-cond text-[56px] leading-none" style={{ color: done === 'accepted' ? P3R.blue : P3R.grey }}>{done === 'accepted' ? '✦' : '·'}</div>
          <p className="mb-1 font-heavy text-[19px]" style={{ color: P3R.ink }}>{done === 'accepted' ? '约好了' : '已婉拒'}</p>
          <p className="text-[13px]" style={{ color: P3R.grey }}>{done === 'accepted' ? '这件事已经放进你的今日任务，完成就算打卡。' : `${name} 会收到你的回应。`}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          <div className="relative px-5 py-3" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(12) }}>
            <span aria-hidden className="absolute bottom-0 right-4 h-[6px] w-[14px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
            <div className="text-[12px] font-black opacity-85">{pact.mode === 'same' ? '一起做的事' : `${name} 要做的事`}</div>
            <div className="mt-0.5 font-heavy text-[22px]">「{pact.titleFrom}」</div>
            <div className="mt-1 text-[12px] font-bold opacity-90">{describePactTerms(pact)}</div>
          </div>
          <div className="px-4 py-3 text-[13px]" style={{ background: 'var(--p3r-mulberry)', color: 'var(--p3r-cream)', clipPath: slantClip(10) }}>{name}：「{pact.message}」</div>
          {pact.mode === 'different' && (<><Label>你这边要做的事</Label><P3Input value={titleTo} maxLength={40} onChange={(e) => setTitleTo(e.target.value)} placeholder="比如：每天读 20 页书" /></>)}
          <p className="text-[12px]" style={{ color: P3R.grey }}>接受后，同一天两人都完成，你们的亲密度 +1。</p>
        </div>
      )}
    </P3Sheet>
  );
}

export default function PactModals({ open, onClose, params }: OverlayProps) {
  return <PactProposeSheet isOpen={open} onClose={onClose} partnerName="由加莉" initialSent={params?.get('state') === 'sent'} />;
}
export function PactRespondDemo({ open, onClose, params }: OverlayProps) {
  const st = params?.get('state');
  return <PactRespondSheet isOpen={open} onClose={onClose} name="由加莉" mode={(params?.get('goal') as 'same' | 'different') || 'same'} initialDone={st === 'accepted' || st === 'declined' ? st : null} expired={st === 'expired'} />;
}
