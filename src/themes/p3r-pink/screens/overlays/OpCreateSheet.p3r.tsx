/**
 * 发起目标 / 作战（真实 src/components/org/OpCreateSheet.tsx，p3 = 底部抽屉顶缘单斜 / 宽屏居中卡）
 * 类型 目标/作战（作战只有队长能发）· 作战目标/这次一起做什么 · 截止日（今天/3 天/一周/两周/30 天 + 日期）· 这次练哪个属性 ·
 * 参与者 · 分工（可以空着）+ ✦ AI 拆解分工 · 发起这个X
 * 路由：#/overlay/hideout-op-create?kind=big&leader=0&ai=0
 */
import { useEffect, useState } from 'react';
import type { AttributeId, OrgOpKind, OrgView } from '@/types';
import type { OverlayProps } from '@pink/registry/types';
import { P3Sheet, P3Button, P3Input, P3Field, P3R, slantClip, useToast } from '@pink/kit';
import { ATTR_IDS, ATTR_NAMES, ATTR_COLOR } from '@pink/adapters/pkg4-tarot';
import { buildView, OP_KIND_LABEL, ORG_OP_MIN_PEOPLE, ORG_OP_TITLE_MAX } from '@pink/adapters/pkg4-org';
import { shiftKey, TODAY } from '@pink/adapters/pkg4-astro';
import { displayCodename, MemberThumb } from '@pink/screens/pkg4/org/common';

const QUICK: Array<[string, number]> = [['今天', 0], ['3 天', 3], ['一周', 7], ['两周', 14], ['30 天', 30]];
const AI_SPLIT = ['整理第三章的笔记', '背完公式表', '做两套模拟卷', '把错题本过一遍', '画一张思维导图'];
const chip = (on: boolean) => ({ clipPath: slantClip(6), background: on ? P3R.blue : 'var(--p3r-row)', color: on ? P3R.onBlue : P3R.ink, boxShadow: on ? undefined : 'inset 0 0 0 1.5px var(--p3r-track)' });

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
  useEffect(() => { if (open) { setKind(leader ? initialKind : 'small'); setTitle(initialKind === 'big' && leader ? '一起做完期末复习' : ''); setAssign({}); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const len = [...title].length;
  const daysLeft = Math.round((Date.parse(deadline) - Date.parse(TODAY)) / 86400_000);
  const problem = chosen.length < ORG_OP_MIN_PEOPLE ? `至少 ${ORG_OP_MIN_PEOPLE} 人` : '';
  const toggle = (uid: string) => setChosen((c) => (c.includes(uid) ? c.filter((x) => x !== uid) : [...c, uid]));
  const ai = () => { if (!title.trim()) return; setAiBusy(true); window.setTimeout(() => { setAiBusy(false); setAssign(Object.fromEntries(chosen.map((u, i) => [u, AI_SPLIT[i % AI_SPLIT.length]]))); }, 900); };
  const submit = () => { if (!title.trim() || problem) return; setBusy(true); window.setTimeout(() => { setBusy(false); onDone(chosen.includes(view.me.userId) ? '发出去了：你的任务里也多了一条' : '发出去了'); onClose(); }, 700); };
  const kl = OP_KIND_LABEL[kind];
  return (
    <P3Sheet open={open} onClose={onClose} busy={busy} title={`发起${kl}`} en="NEW OPERATION" size="tall"
      footer={<P3Button block size="lg" corner busy={busy} busyText="发出中…" disabled={!title.trim() || !!problem} onClick={submit}>{problem && title.trim() ? problem : `发起这个${kl}`}</P3Button>}>
      <div className="space-y-4 pt-1">
        <P3Field label="类型">
          <div className="grid grid-cols-2 gap-2">
            {(['small', 'big'] as OrgOpKind[]).map((k) => {
              const dis = k === 'big' && !leader; const on = kind === k;
              return (
                <button key={k} type="button" disabled={dis} aria-pressed={on} onClick={() => setKind(k)} className="min-w-0 px-3 py-2 text-left disabled:opacity-45" style={{ ...chip(on), clipPath: slantClip(10) }}>
                  <div className="text-[16px] font-black">{OP_KIND_LABEL[k]}</div>
                  <div className="mt-0.5 truncate text-[10.5px] font-bold opacity-80">{k === 'small' ? '一句话，大家做同一件事' : leader ? '一个作战目标，每人分一份' : '只有队长能发'}</div>
                </button>
              );
            })}
          </div>
        </P3Field>
        <P3Field label={kind === 'big' ? '作战目标' : '这次一起做什么'} count={`${len} / ${ORG_OP_TITLE_MAX}`}>
          <P3Input aria-label={kind === 'big' ? '作战目标' : '这次一起做什么'} value={title} onChange={(e) => setTitle([...e.target.value].slice(0, ORG_OP_TITLE_MAX).join(''))} placeholder={kind === 'big' ? '比如：一起做完期末复习' : '比如：这周每人跑一次 5 公里'} />
        </P3Field>
        <P3Field label="截止日" count={daysLeft <= 0 ? '今天截止' : `${daysLeft} 天后`}>
          <div className="mb-2 flex flex-wrap gap-1.5">{QUICK.map(([l, d]) => <button key={l} type="button" aria-pressed={days === d} onClick={() => { setDays(d); setDeadline(shiftKey(d)); }} className="px-3 py-1 text-[12px] font-black" style={chip(days === d)}>{l}</button>)}</div>
          <P3Input type="date" aria-label="截止日" value={deadline} min={TODAY} max={shiftKey(30)} onChange={(e) => { setDeadline(e.target.value || TODAY); setDays(-1); }} />
        </P3Field>
        <P3Field label="这次练哪个属性" hint="每个人任务里那一条默认加这个属性（+3），自己可以改。">
          <div className="grid grid-cols-5 gap-1.5">
            {ATTR_IDS.map((a) => <button key={a} type="button" aria-pressed={attr === a} onClick={() => setAttr(a)} className="min-w-0 py-1.5 text-[12px] font-black" style={attr === a ? { clipPath: slantClip(6), background: ATTR_COLOR[a], color: 'var(--p3r-mulberry)' } : chip(false)}>{ATTR_NAMES[a]}</button>)}
          </div>
        </P3Field>
        <P3Field label="参与者" count={`${chosen.length} / ${view.members.length}`} hint={`至少 ${ORG_OP_MIN_PEOPLE} 人；你自己可以不参加。发出去之后名单就定了。`}>
          <div className="grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-3">
            {view.members.map((m) => {
              const on = chosen.includes(m.userId);
              return (
                <button key={m.id} type="button" onClick={() => toggle(m.userId)} aria-pressed={on} aria-label={`${displayCodename(m)}${on ? '（已选）' : ''}`} className="flex min-w-0 items-center gap-2 px-2 py-1.5 text-left" style={{ ...chip(on), clipPath: slantClip(8) }}>
                  <MemberThumb m={m} width={18} />
                  <span className="min-w-0 truncate text-[12.5px] font-black">{displayCodename(m)}</span>
                  {m.userId === view.me.userId && <span className="-ml-1 shrink-0 text-[10px] font-bold opacity-80">我</span>}
                </button>
              );
            })}
          </div>
        </P3Field>
        {kind === 'big' && (
          <P3Field label="分工（可以空着）" hint="空着的人会在作战里「写下我的一份」；没写之前，Ta 的任务就是作战目标本身。">
            <div className="flex flex-wrap items-center gap-2">
              <P3Button size="sm" tone="ink" disabled={!aiOk || !title.trim()} busy={aiBusy} busyText="拆解中…" onClick={ai} leading={<span aria-hidden>✦</span>}>AI 拆解分工</P3Button>
              <span className="min-w-0 flex-1 text-[11px] font-bold" style={{ color: P3R.grey }}>{aiOk ? (title.trim() ? '按作战目标和每个人的代表牌、面具拆，拆完还能改' : '先写作战目标') : '要先在「设置 → AI 服务」里填好 API Key'}</span>
            </div>
            <div className="mt-2 space-y-1.5">
              {view.members.filter((m) => chosen.includes(m.userId)).map((m) => (
                <div key={m.id} className="flex min-w-0 items-center gap-2">
                  <span className="w-14 shrink-0 truncate text-[12.5px] font-black" style={{ color: P3R.ink }}>{displayCodename(m)}</span>
                  <span className="min-w-0 flex-1"><P3Input aria-label={`${displayCodename(m)} 的子任务`} placeholder="空着 = Ta 自己写" value={assign[m.userId] ?? ''} onChange={(e) => setAssign((a) => ({ ...a, [m.userId]: [...e.target.value].slice(0, 20).join('') }))} /></span>
                </div>
              ))}
            </div>
          </P3Field>
        )}
      </div>
    </P3Sheet>
  );
}

export default function OpCreateSheet({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  return <OpCreate view={buildView()} open={open} onClose={onClose} leader={params?.get('leader') !== '0'} aiOk={params?.get('ai') !== '0'} initialKind={params?.get('kind') === 'big' ? 'big' : 'small'} onDone={(m) => toast.success(m)} />;
}
