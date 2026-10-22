/**
 * 一起进步 · 发起 / 回应（真实 PactModals：PactProposeModal / PactRespondModal）。
 * #/overlay/bond-pact-create?state=sent ； #/overlay/bond-pact-respond?goal=different&state=expired|accepted|declined
 */
import { useEffect, useState, type ReactNode } from 'react';
import type { AttributeId } from '@real/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Button, P4Input, P4Sheet } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { ATTR_IDS, ATTR_NAMES } from '@yellow/screens/pkg3/arcana';
import { Sparkle } from '@yellow/screens/pkg3/ui';

const PACT_DAYS_OPTIONS = [7, 14, 30, 0];
const md = (k: string) => { const d = new Date(`${k}T12:00:00`); return `${d.getMonth() + 1}月${d.getDate()}日`; };
export const describePactTerms = (p: { kind: 'daily' | 'once'; days?: number; deadline?: string; mode: 'same' | 'different' }) => {
  const when = p.kind === 'daily' ? (p.days ? `每天打卡 · ${p.days} 天` : '每天打卡 · 不设期限') : `一次性目标 · ${p.deadline ? `${md(p.deadline)}前` : '无截止日'}`;
  return `${when} · ${p.mode === 'same' ? '共同目标' : '各做各的'}`;
};

const Label = ({ children }: { children: ReactNode }) => <div className="mb-1.5 mt-4 font-display text-meta font-bold first:mt-0">{children}</div>;
function Seg<T extends string | number>({ value, onChange, options, compact }: { value: T; onChange: (v: T) => void; options: { v: T; label: string; hint?: string }[]; compact?: boolean }) {
  return (
    <div className={cx('grid gap-2', compact ? 'grid-cols-4' : 'grid-cols-2')}>
      {options.map((o) => (
        <button key={String(o.v)} type="button" onClick={() => onChange(o.v)} className={cx('p4g-press min-w-0 rounded-sm border-3 px-2 text-left', compact ? 'py-2 text-center' : 'py-2.5', value === o.v ? 'border-p4g-black bg-p4g-orange text-p4g-black shadow-hard-sm' : 'border-p4g-line bg-p4g-surface')}>
          <span className="block truncate font-display text-body font-bold">{o.label}</span>
          {o.hint && <span className={cx('block text-2xs leading-snug', value === o.v ? 'text-p4g-black/75' : 'text-p4g-ink-soft')}>{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

function AttrRewardPicker({ value, onChange }: { value: { attribute: AttributeId; points: number }[]; onChange: (v: { attribute: AttributeId; points: number }[]) => void }) {
  const toggle = (a: AttributeId) => {
    const i = value.findIndex((x) => x.attribute === a);
    if (i >= 0) { if (value.length > 1) onChange(value.filter((_, j) => j !== i)); return; }
    onChange(value.length >= 2 ? [value[0], { attribute: a, points: value[1].points }] : [...value, { attribute: a, points: 1 }]);
  };
  const setPts = (i: number, n: number) => onChange(value.map((x, j) => (j === i ? { ...x, points: Math.max(1, Math.min(5, n)) } : x)));
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">{ATTR_IDS.map((a) => { const on = value.some((x) => x.attribute === a); return <button key={a} type="button" onClick={() => toggle(a)} className={cx('rounded-full border-2 px-3 py-1 font-display text-meta font-bold', on ? 'border-p4g-black bg-p4g-black text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black' : 'border-p4g-line bg-p4g-surface-2')}>{ATTR_NAMES[a]}</button>; })}</div>
      <div className="mt-2 grid grid-cols-1 gap-2">
        {value.map((x, i) => (
          <div key={x.attribute} className="flex items-center gap-3">
            <span className="w-14 truncate text-cap font-bold text-p4g-ink-soft">{ATTR_NAMES[x.attribute]}</span>
            <span className="text-cap text-p4g-ink-soft">每次</span>
            <button type="button" aria-label={`${ATTR_NAMES[x.attribute]}减一点`} onClick={() => setPts(i, x.points - 1)} className="p4g-press h-8 w-8 rounded-sm border-3 border-p4g-line bg-p4g-surface font-bold">−</button>
            <span className="w-8 text-center p4g-num text-body">+{x.points}</span>
            <button type="button" aria-label={`${ATTR_NAMES[x.attribute]}加一点`} onClick={() => setPts(i, x.points + 1)} className="p4g-press h-8 w-8 rounded-sm border-3 border-p4g-line bg-p4g-surface font-bold">+</button>
            <span className="text-cap text-p4g-ink-soft">点</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PactProposeSheet({ isOpen, onClose, partnerName, isConfidant = true, initialSent = false }: { isOpen: boolean; onClose: () => void; partnerName: string; isConfidant?: boolean; initialSent?: boolean }) {
  const [kind, setKind] = useState<'daily' | 'once'>('daily');
  const [mode, setMode] = useState<'same' | 'different'>('same');
  const [title, setTitle] = useState('');
  const [days, setDays] = useState(14);
  const [deadline, setDeadline] = useState('2026-10-31');
  const [message, setMessage] = useState('');
  const [rewards, setRewards] = useState<{ attribute: AttributeId; points: number }[]>([{ attribute: 'guts', points: 1 }]);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(initialSent);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (isOpen) setSent(initialSent); }, [isOpen, initialSent]);
  const send = () => {
    setError(null); setBusy(true); window.setTimeout(() => { setBusy(false); setSent(true); }, 700);
  };
  return (
    <P4Sheet open={isOpen} onClose={onClose} title={`和 ${partnerName} 一起进步`} en="TOGETHER · 一起进步" size="tall"
      footer={sent ? <P4Button block onClick={onClose}>好的</P4Button> : <div className="flex gap-3"><P4Button variant="secondary" block disabled={busy} onClick={onClose}>再想想</P4Button><P4Button block busy={busy} disabled={!title.trim()} onClick={send}>{busy ? '发送中…' : '发出邀请'}</P4Button></div>}>
      {sent ? (
        <div className="py-8 text-center">
          <Sparkle size={52} className="pk3-twinkle mx-auto mb-3 text-p4g-orange" />
          <p className="mb-1 font-display text-lead font-bold">邀请已送出</p>
          <p className="text-meta text-p4g-ink-soft">{partnerName} 接受后，这件事会出现在你们各自的今日任务里。<br />3 天没回应会自动过期。</p>
        </div>
      ) : (
        <div>
          <p className="mb-3 rounded-sm bg-[color:var(--p4g-msg)] p-3 text-meta text-[color:var(--p4g-msg-ink)]"><span className="mr-1 text-p4g-yellow">&gt;</span>{isConfidant ? '约好一件事各自去做。同一天两人都完成，你们的亲密度 +1；连续同步满 7 天再 +2。' : '约好一件事各自去做，互相看得到进度，没完成可以催一下。（普通好友不涨亲密度）'}</p>
          <Label>怎么约</Label>
          <Seg value={kind} onChange={setKind} options={[{ v: 'daily', label: '每日打卡', hint: '一段时间里每天各做一次' }, { v: 'once', label: '一次性目标', hint: '截止日前各完成一次' }]} />
          <Label>目标</Label>
          <Seg value={mode} onChange={setMode} options={[{ v: 'same', label: '共同目标', hint: '两人做同一件事' }, { v: 'different', label: '不同目标', hint: `各做各的，${partnerName} 接受时写 Ta 的` }]} />
          <Label>{mode === 'same' ? '一起做的事' : '你这边要做的事'}</Label>
          <P4Input value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} error={error ?? undefined} placeholder={kind === 'daily' ? (mode === 'same' ? '比如：背 50 个单词' : '比如：晨跑 3 公里') : (mode === 'same' ? '比如：读完一本书' : '比如：把简历改完')} />
          {kind === 'daily' ? (<><Label>约多久</Label><Seg compact value={days} onChange={setDays} options={PACT_DAYS_OPTIONS.map((d) => ({ v: d, label: d ? `${d} 天` : '不设期限' }))} /></>)
            : (<><Label>截止日</Label><P4Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></>)}
          <Label>完成时加到（最多两项）</Label>
          <AttrRewardPicker value={rewards} onChange={setRewards} />
          <Label>对 {partnerName} 说一句（可选）</Label>
          <P4Input value={message} maxLength={120} onChange={(e) => setMessage(e.target.value)} placeholder="比如：这次一起坚持下来" />
          <p className="mt-3 text-cap text-p4g-ink-soft">{describePactTerms({ kind, days, deadline, mode })}</p>
        </div>
      )}
    </P4Sheet>
  );
}

export function PactRespondSheet({ isOpen, onClose, name, mode = 'same', initialDone = null, expired = false }: { isOpen: boolean; onClose: () => void; name: string; mode?: 'same' | 'different'; initialDone?: 'accepted' | 'declined' | null; expired?: boolean }) {
  const [done, setDone] = useState<'accepted' | 'declined' | null>(initialDone);
  const [busy, setBusy] = useState<'' | 'accept' | 'decline'>('');
  const [titleTo, setTitleTo] = useState('');
  useEffect(() => { if (isOpen) setDone(initialDone); }, [isOpen, initialDone]);
  const act = (k: 'accept' | 'decline') => { setBusy(k); window.setTimeout(() => { setBusy(''); setDone(k === 'accept' ? 'accepted' : 'declined'); }, 600); };
  const pact = { titleFrom: '晨跑 3 公里', kind: 'daily' as const, days: 14, mode, message: '这次一起坚持下来' };
  return (
    <P4Sheet open={isOpen} onClose={onClose} title={`${name} 想和你一起进步`} en="TOGETHER · 邀请"
      footer={done || expired ? <P4Button block onClick={onClose}>好的</P4Button> : <div className="flex gap-3"><P4Button variant="secondary" block disabled={!!busy} onClick={() => act('decline')}>{busy === 'decline' ? '…' : '婉拒'}</P4Button><P4Button block busy={busy === 'accept'} onClick={() => act('accept')}>{busy === 'accept' ? '处理中…' : '接受'}</P4Button></div>}>
      {expired ? <p className="py-6 text-center text-meta text-p4g-ink-soft">这份邀请已经不能回应了（已处理或过期）。</p> : done ? (
        <div className="py-8 text-center">
          <div className="mb-3 font-display text-mega font-bold text-p4g-orange">{done === 'accepted' ? '✦' : '·'}</div>
          <p className="mb-1 font-display text-lead font-bold">{done === 'accepted' ? '约好了' : '已婉拒'}</p>
          <p className="text-meta text-p4g-ink-soft">{done === 'accepted' ? '这件事已经放进你的今日任务，完成就算打卡。' : `${name} 会收到你的回应。`}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-sm border-3 border-p4g-black bg-p4g-yellow p-3 text-p4g-black">
            <div className="font-display text-cap font-bold">{pact.mode === 'same' ? '一起做的事' : `${name} 要做的事`}</div>
            <div className="mt-0.5 font-display text-h3 font-bold">「{pact.titleFrom}」</div>
            <div className="mt-1 text-cap">{describePactTerms(pact)}</div>
          </div>
          <div className="rounded-sm bg-[color:var(--p4g-msg)] p-3 text-meta text-[color:var(--p4g-msg-ink)]"><span className="mr-1 text-p4g-yellow">&gt;</span>「{pact.message}」</div>
          {pact.mode === 'different' && (<><Label>你这边要做的事</Label><P4Input value={titleTo} maxLength={40} onChange={(e) => setTitleTo(e.target.value)} placeholder="比如：每天读 20 页书" /></>)}
        </div>
      )}
    </P4Sheet>
  );
}

export default function PactModals({ open, onClose, params }: OverlayProps) {
  return <PactProposeSheet isOpen={open} onClose={onClose} partnerName="千枝" initialSent={params?.get('state') === 'sent'} />;
}
export function PactRespondDemo({ open, onClose, params }: OverlayProps) {
  const st = params?.get('state');
  return <PactRespondSheet isOpen={open} onClose={onClose} name="千枝" mode={(params?.get('goal') as 'same' | 'different') || 'same'} initialDone={st === 'accepted' || st === 'declined' ? st : null} expired={st === 'expired'} />;
}
