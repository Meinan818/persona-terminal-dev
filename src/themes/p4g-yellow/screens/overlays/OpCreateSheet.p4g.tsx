/**
 * 发起目标 / 作战（真实 src/components/org/OpCreateSheet.tsx）
 * 类型 目标/作战（作战只有队长能发）· 作战目标/这次一起做什么 · 截止日（今天/3 天/一周/两周/30 天 + 日期）· 这次练哪个属性 ·
 * 参与者 · 分工（可以空着）+ ✦ AI 拆解分工 · 发起这个X
 * 路由：#/overlay/hideout-op-create?kind=big&leader=0&ai=0
 */
import { useEffect, useState } from 'react';
import type { AttributeId, OrgOpKind, OrgView } from '@/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Sheet, P4Button, P4Input, P4Field, P4Chip, useToast } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { ATTR_IDS, ATTR_NAMES, ATTR_COLOR } from '@yellow/adapters/pkg4-tarot';
import { buildView, OP_KIND_LABEL, ORG_OP_MIN_PEOPLE, ORG_OP_TITLE_MAX } from '@yellow/adapters/pkg4-org';
import { shiftKey, TODAY } from '@yellow/adapters/pkg4-astro';
import { displayCodename, MemberThumb } from '@yellow/screens/pkg4/org/common';

const QUICK: Array<[string, number]> = [['今天', 0], ['3 天', 3], ['一周', 7], ['两周', 14], ['30 天', 30]];
const AI_SPLIT = ['整理第三章的笔记', '背完公式表', '做两套模拟卷', '把错题本过一遍', '画一张思维导图'];

export function OpCreate({ view, open, onClose, leader, aiOk = true, initialKind = 'small', onDone }: { view: OrgView; open: boolean; onClose: () => void; leader: boolean; aiOk?: boolean; initialKind?: OrgOpKind; onDone: (msg: string) => void }) {
  const [kind, setKind] = useState<OrgOpKind>(initialKind);
  const [title, setTitle] = useState('');
  const [days, setDays] = useState(7);
  const [deadline, setDeadline] = useState(shiftKey(7));
  const [attr, setAttr] = useState<AttributeId>('guts');
  const [chosen, setChosen] = useState<string[]>(view.members.map((m) => m.userId));
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [aiBusy, setAiBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setKind(leader ? initialKind : 'small'); setTitle(''); setError(''); setAssign({}); } }, [open]); // eslint-disable-line
  const len = [...title].length;
  const daysLeft = Math.round((Date.parse(deadline) - Date.parse(TODAY)) / 86400_000);
  const problem = chosen.length < ORG_OP_MIN_PEOPLE ? `至少 ${ORG_OP_MIN_PEOPLE} 人` : '';
  const toggle = (uid: string) => setChosen((c) => (c.includes(uid) ? c.filter((x) => x !== uid) : [...c, uid]));
  const ai = () => { if (!title.trim()) return; setAiBusy(true); setError(''); setTimeout(() => { setAiBusy(false); setAssign(Object.fromEntries(chosen.map((u, i) => [u, AI_SPLIT[i % AI_SPLIT.length]]))); }, 900); };
  const submit = () => { if (!title.trim() || problem) return; setBusy(true); setTimeout(() => { setBusy(false); onDone(chosen.includes(view.me.userId) ? '发出去了：你的任务里也多了一条' : '发出去了'); onClose(); }, 700); };
  const kl = OP_KIND_LABEL[kind];
  return (
    <P4Sheet open={open} onClose={() => !busy && onClose()} title={`发起${kl}`} en="NEW OPERATION" size="tall"
      footer={<P4Button block size="lg" variant="black" busy={busy} disabled={busy || !title.trim() || !!problem} onClick={submit}>{busy ? '发出中…' : problem && title.trim() ? problem : `发起这个${kl}`}</P4Button>}>
      <div className="space-y-4 pt-1">
        <P4Field label="类型">
          <div className="grid grid-cols-2 gap-2">
            {(['small', 'big'] as OrgOpKind[]).map((k) => {
              const dis = k === 'big' && !leader; const on = kind === k;
              return (
                <button key={k} type="button" disabled={dis} aria-pressed={on} onClick={() => setKind(k)} className={cx('p4g-press min-w-0 rounded-sm border-3 px-3 py-2 text-left disabled:opacity-45', on ? 'border-p4g-black bg-p4g-black text-p4g-yellow shadow-[3px_3px_0_var(--p4g-orange)] night:border-p4g-yellow night:bg-p4g-yellow night:text-p4g-black' : 'border-p4g-line bg-p4g-surface text-p4g-ink')}>
                  <div className="font-display text-lead font-bold">{OP_KIND_LABEL[k]}</div>
                  <div className="mt-0.5 text-2xs font-bold opacity-80">{k === 'small' ? '一句话，大家做同一件事' : leader ? '一个作战目标，每人分一份' : '只有队长能发'}</div>
                </button>
              );
            })}
          </div>
        </P4Field>
        <P4Field label={kind === 'big' ? '作战目标' : '这次一起做什么'} counter={`${len} / ${ORG_OP_TITLE_MAX}`}>
          <P4Input aria-label={kind === 'big' ? '作战目标' : '这次一起做什么'} value={title} onChange={(e) => setTitle([...e.target.value].slice(0, ORG_OP_TITLE_MAX).join(''))} placeholder={kind === 'big' ? '比如：一起做完期末复习' : '比如：这周每人跑一次 5 公里'} />
        </P4Field>
        <P4Field label="截止日" counter={daysLeft <= 0 ? '今天截止' : `${daysLeft} 天后`}>
          <div className="flex flex-wrap gap-1.5">{QUICK.map(([l, d]) => <P4Chip key={l} tone="outline" selected={days === d} onClick={() => { setDays(d); setDeadline(shiftKey(d)); }}>{l}</P4Chip>)}</div>
          <P4Input type="date" aria-label="截止日" value={deadline} min={TODAY} max={shiftKey(30)} onChange={(e) => { setDeadline(e.target.value || TODAY); setDays(-1); }} />
        </P4Field>
        <P4Field label="这次练哪个属性" hint="每个人任务里那一条默认加这个属性（+3），自己可以改。">
          <div className="grid grid-cols-5 gap-1.5">
            {ATTR_IDS.map((a) => (
              <button key={a} type="button" aria-pressed={attr === a} onClick={() => setAttr(a)} className={cx('p4g-press min-w-0 rounded-sm border-3 py-1.5 font-display text-meta font-bold', attr === a ? 'border-p4g-black text-white shadow-hard-sm night:border-p4g-yellow' : 'border-p4g-line bg-p4g-surface text-p4g-ink')} style={attr === a ? { background: ATTR_COLOR[a] } : undefined}>{ATTR_NAMES[a]}</button>
            ))}
          </div>
        </P4Field>
        <P4Field label="参与者" counter={`${chosen.length} / ${view.members.length}`} hint={`至少 ${ORG_OP_MIN_PEOPLE} 人；你自己可以不参加。发出去之后名单就定了。`}>
          <div className="grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-3">
            {view.members.map((m) => {
              const on = chosen.includes(m.userId);
              return (
                <button key={m.id} type="button" onClick={() => toggle(m.userId)} aria-pressed={on} aria-label={`${displayCodename(m)}${on ? '（已选）' : ''}`} className={cx('p4g-press flex min-w-0 items-center gap-2 rounded-sm border-3 px-2 py-1.5 text-left', on ? 'border-p4g-select bg-p4g-select text-[color:var(--p4g-select-ink)]' : 'border-p4g-line bg-p4g-surface text-p4g-ink')}>
                  <MemberThumb m={m} width={18} />
                  <span className="min-w-0 truncate font-display text-meta font-bold">{displayCodename(m)}</span>
                  {m.userId === view.me.userId && <span className="-ml-1 shrink-0 text-2xs font-bold opacity-80">我</span>}
                </button>
              );
            })}
          </div>
        </P4Field>
        {kind === 'big' && (
          <P4Field label="分工（可以空着）" hint="空着的人会在作战里「写下我的一份」；没写之前，Ta 的任务就是作战目标本身。">
            <div className="flex flex-wrap items-center gap-2">
              <P4Button size="sm" variant="black" disabled={!aiOk || !title.trim() || aiBusy} busy={aiBusy} onClick={ai}>{aiBusy ? '拆解中…' : '✦ AI 拆解分工'}</P4Button>
              <span className="min-w-0 flex-1 text-2xs font-bold text-p4g-ink-soft">{aiOk ? (title.trim() ? '按作战目标和每个人的代表牌、面具拆，拆完还能改' : '先写作战目标') : '要先在「设置 → AI 服务」里填好 API Key'}</span>
            </div>
            <div className="mt-1 space-y-1.5">
              {view.members.filter((m) => chosen.includes(m.userId)).map((m) => (
                <div key={m.id} className="flex min-w-0 items-center gap-2">
                  <span className="w-14 shrink-0 truncate font-display text-meta font-bold text-p4g-ink">{displayCodename(m)}</span>
                  <P4Input wrapClassName="min-w-0 flex-1" aria-label={`${displayCodename(m)} 的子任务`} placeholder="空着 = Ta 自己写" value={assign[m.userId] ?? ''} onChange={(e) => setAssign((a) => ({ ...a, [m.userId]: [...e.target.value].slice(0, 20).join('') }))} />
                </div>
              ))}
            </div>
          </P4Field>
        )}
        {error && <div className="text-meta font-bold text-p4g-danger">{error}</div>}
      </div>
    </P4Sheet>
  );
}

export default function OpCreateSheet({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  return <OpCreate view={buildView()} open={open} onClose={onClose} leader={params?.get('leader') !== '0'} aiOk={params?.get('ai') !== '0'} initialKind={params?.get('kind') === 'big' ? 'big' : 'small'} onDone={(m) => toast.success(m)} />;
}
