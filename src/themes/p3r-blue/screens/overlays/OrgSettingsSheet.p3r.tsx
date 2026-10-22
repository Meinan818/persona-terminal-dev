/**
 * 据点设置（真实 src/components/org/OrgSettingsSheet.tsx，蓝白 p3：CONFIG 行 + ON·OFF）
 * 我的成员牌（修改/去选）· 在名册背面展示的面具（开关，最多 3 张）· 等级与称号（编辑/查看）·
 * 组织资料（队长：修改 组织名/口号/徽记，取消/保存）· 换一个邀请码（换码）· 成员（转让/请离）·
 * 屏蔽名单（解除）· 据点守则 · 别人能看到什么（展开/收起）· 解散组织 / 退出组织
 * 路由：#/overlay/hideout-settings?leader=0&edit=1
 */
import { useEffect, useState, type ReactNode } from 'react';
import type { OrgView } from '@real/types';
import type { OverlayProps } from '@blue/registry/types';
import { P3Sheet, P3Button, P3Input, P3OnOff, P3R, SectionMark, slantClip, chamferClip, useToast } from '@blue/kit';
import { ATTR_NAMES } from '@blue/mock/pkg4-tarot';
import { buildView, LEVEL, ORG_EMBLEMS, ORG_LEVEL_NAMES, ORG_MAX_SHOWN_MASKS, ORG_MOTTO_MAX, ORG_NAME_MAX, ORG_PRIVACY_NOTE, ORG_RULES } from '@blue/mock/pkg4-org';
import { displayCodename, MemberThumb } from '@blue/screens/pkg4/org/common';
import { OrgSettingsConfirm, type SettingsConfirm } from './OrgSettingsSheetConfirm.p3r';

const MY_MASKS = [{ id: 'guts', name: '伊邪那岐' }, { id: 'knowledge', name: '智慧之书' }, { id: 'charm', name: '魅惑之镜' }, { id: 'kindness', name: '慈母观音' }];
const Row = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`relative flex min-w-0 items-center gap-3 py-2.5 pl-5 pr-3 ${className}`}>
    <span aria-hidden className="absolute inset-0" style={{ background: 'var(--p3r-row)', clipPath: slantClip(10), boxShadow: 'inset 0 0 0 1px var(--p3r-track)' }} />
    <span aria-hidden className="absolute bottom-0 left-0 top-0 w-[7px]" style={{ background: P3R.blue, clipPath: 'polygon(0 0, 100% 0, 30% 100%, 0 100%)' }} />
    <div className="relative flex min-w-0 flex-1 items-center gap-3">{children}</div>
  </div>
);

export function OrgSettings({ view, open, onClose, leader, blocked, onUnblock, onEditCard, onEditTitles, onFlash, onGone, startEditing }: {
  view: OrgView; open: boolean; onClose: () => void; leader: boolean; blocked: string[]; onUnblock: (uid: string) => void;
  onEditCard: () => void; onEditTitles: () => void; onFlash: (s: string) => void; onGone: () => void; startEditing?: boolean;
}) {
  const [shown, setShown] = useState<string[]>(['guts']);
  const [maskOn, setMaskOn] = useState(true);
  const [editing, setEditing] = useState(!!startEditing);
  const [name, setName] = useState(view.org.name);
  const [motto, setMotto] = useState(view.org.motto ?? '');
  const [emblem, setEmblem] = useState(view.org.emblem);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [confirm, setConfirm] = useState<SettingsConfirm | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  useEffect(() => { if (open) { setEditing(!!startEditing); setError(''); setInfo(''); } }, [open, startEditing]);
  const toggleMask = (id: string) => {
    setError('');
    if (shown.includes(id)) { setShown((s) => s.filter((x) => x !== id)); return; }
    if (shown.length >= ORG_MAX_SHOWN_MASKS) { setError(`最多展示 ${ORG_MAX_SHOWN_MASKS} 张：先去掉一张`); return; }
    setShown((s) => [...s, id]);
  };
  const others = view.members.filter((m) => m.userId !== view.me.userId);
  const blockedMembers = view.members.filter((m) => blocked.includes(m.userId));
  const sub = (t: string) => <div className="text-[10.5px] font-bold" style={{ color: P3R.grey }}>{t}</div>;
  const emb = ORG_EMBLEMS.find((e) => e.id === emblem);

  return (
    <>
      <P3Sheet open={open} onClose={onClose} title="据点设置" en="HIDEOUT SETTINGS" size="tall">
        <div className="space-y-5 pt-1">
          {(info || error) && <div className="px-4 py-2 text-[12.5px] font-black" role="status" style={{ clipPath: slantClip(8), background: error ? P3R.magenta : P3R.ink, color: error ? '#fff' : 'var(--p3r-on-ink)' }}>{error || info}</div>}
          <section className="space-y-2">
            <SectionMark title="我的成员牌" en="MY CARD" />
            <Row>
              <MemberThumb m={view.me} width={28} />
              <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-black" style={{ color: P3R.ink }}>{displayCodename(view.me)}</div>{sub(view.me.tarotId ? '代表牌与代号' : '还没选代表牌')}</div>
              <P3Button size="sm" tone="soft" onClick={onEditCard}>{view.me.tarotId ? '修改' : '去选'}</P3Button>
            </Row>
            <div className="px-4 py-3" style={{ background: 'var(--p3r-cyan-pale)', clipPath: slantClip(10) }}>
              <div className="flex items-center gap-3"><div className="min-w-0 flex-1 text-[14px] font-black" style={{ color: P3R.ink }}>在名册背面展示的面具</div><P3OnOff value={maskOn} onChange={setMaskOn} ariaLabel="在名册背面展示的面具" /></div>
              <div className="mt-0.5 text-[11px] font-bold leading-relaxed" style={{ color: P3R.inkSoft }}>最多 {ORG_MAX_SHOWN_MASKS} 张。队友可以同调其中一张，在逆影战场里用（每周 3 场）。</div>
              {maskOn && (
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {MY_MASKS.map((mk) => { const idx = shown.indexOf(mk.id); const on = idx >= 0; return (
                    <button key={mk.id} type="button" aria-pressed={on} aria-label={`${mk.name}（${ATTR_NAMES[mk.id as 'guts']}）${on ? `，第 ${idx + 1} 张` : ''}`} onClick={() => toggleMask(mk.id)} className="flex min-w-0 items-center gap-1.5 px-2 py-1.5 text-left" style={{ clipPath: slantClip(6), background: on ? P3R.blue : 'var(--p3r-panel)', color: on ? P3R.onBlue : P3R.ink }}>
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center font-cond text-[12px]" style={{ background: on ? 'var(--p3r-cream)' : 'var(--p3r-track)', color: 'var(--p3r-blue-deep)', clipPath: slantClip(3) }}>{on ? idx + 1 : ''}</span>
                      <span className="min-w-0 truncate text-[12.5px] font-black">{mk.name}</span><span className="ml-auto shrink-0 text-[10px] opacity-75">{ATTR_NAMES[mk.id as 'guts']}</span>
                    </button>); })}
                </div>
              )}
            </div>
          </section>
          <section className="space-y-2">
            <SectionMark title="等级与称号" en="RANK & TITLES" />
            <Row>
              <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-black" style={{ color: P3R.ink }}>据点 Lv.{LEVEL.level} · {ORG_LEVEL_NAMES[LEVEL.level - 1]}</div>{sub(leader ? '给每一级起名字、给称号改名、加自己的称号' : '每一级叫什么、每个称号怎么拿')}</div>
              <P3Button size="sm" tone="soft" onClick={onEditTitles}>{leader ? '编辑' : '查看'}</P3Button>
            </Row>
          </section>
          {leader && (
            <section className="space-y-2">
              <SectionMark title="组织资料" en="PROFILE" />
              {!editing ? (
                <Row>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center text-[20px] font-black" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: chamferClip(8, 8) }}>{emb?.glyph}</span>
                  <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-black" style={{ color: P3R.ink }}>{name}</div>{sub(motto || '还没有口号')}</div>
                  <P3Button size="sm" tone="soft" onClick={() => setEditing(true)}>修改</P3Button>
                </Row>
              ) : (
                <div className="space-y-2 px-4 py-3" style={{ background: 'var(--p3r-cyan-pale)', clipPath: slantClip(10) }}>
                  <P3Input aria-label="组织名" value={name} onChange={(e) => setName([...e.target.value].slice(0, ORG_NAME_MAX).join(''))} />
                  <P3Input aria-label="口号" placeholder="口号（可以不写）" value={motto} onChange={(e) => setMotto([...e.target.value].slice(0, ORG_MOTTO_MAX).join(''))} />
                  <div className="grid grid-cols-6 gap-1.5">{ORG_EMBLEMS.map((e) => <button key={e.id} type="button" aria-pressed={e.id === emblem} aria-label={`徽记：${e.label}`} onClick={() => setEmblem(e.id)} className="flex aspect-square items-center justify-center text-[18px] font-black" style={{ clipPath: slantClip(6), background: e.id === emblem ? P3R.blue : 'var(--p3r-panel)', color: e.id === emblem ? P3R.onBlue : P3R.ink }}>{e.glyph}</button>)}</div>
                  <div className="flex justify-end gap-2"><P3Button size="sm" tone="ghost" onClick={() => setEditing(false)}>取消</P3Button><P3Button size="sm" disabled={!name.trim()} onClick={() => { setEditing(false); setInfo('改好了'); }}>保存</P3Button></div>
                </div>
              )}
              <Row>
                <div className="min-w-0 flex-1"><div className="text-[14px] font-black" style={{ color: P3R.ink }}>换一个邀请码</div>{sub('码外传了、或者不想再有人加入时用')}</div>
                <P3Button size="sm" tone="soft" onClick={() => setConfirm({ kind: 'rotate' })}>换码</P3Button>
              </Row>
            </section>
          )}
          {leader && (
            <section className="space-y-2">
              <SectionMark title="成员" en="MEMBERS" meta={<span className="font-cond text-[14px]" style={{ color: P3R.blue }}>{view.members.length} / 7</span>} />
              {others.map((m) => (
                <Row key={m.id}>
                  <MemberThumb m={m} width={22} />
                  <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-black" style={{ color: P3R.ink }}>{displayCodename(m)}</div>{sub(`连续 ${m.card.streak} 天`)}</div>
                  <P3Button size="sm" tone="soft" onClick={() => setConfirm({ kind: 'transfer', member: m })}>转让</P3Button>
                  <P3Button size="sm" tone="danger" onClick={() => setConfirm({ kind: 'kick', member: m })}>请离</P3Button>
                </Row>
              ))}
            </section>
          )}
          {blockedMembers.length > 0 && (
            <section className="space-y-2">
              <SectionMark title="屏蔽名单（只在本机生效）" />
              {blockedMembers.map((m) => <Row key={m.id}><span className="min-w-0 flex-1 truncate text-[14px] font-black" style={{ color: P3R.ink }}>{displayCodename(m)}</span><P3Button size="sm" tone="soft" onClick={() => onUnblock(m.userId)}>解除</P3Button></Row>)}
            </section>
          )}
          <section>
            <button type="button" onClick={() => setRulesOpen((v) => !v)} aria-expanded={rulesOpen} className="flex w-full items-center justify-between py-1 text-left">
              <span className="text-[13px] font-black tracking-wider" style={{ color: P3R.ink }}>据点守则 · 别人能看到什么</span><span className="text-[12px] font-black" style={{ color: P3R.roseInk }}>{rulesOpen ? '收起' : '展开'}</span>
            </button>
            {rulesOpen && (
              <div className="mt-2 px-4 py-3" style={{ background: 'var(--p3r-cyan-pale)', clipPath: slantClip(10) }}>
                <ol className="list-decimal space-y-1.5 pl-5 text-[12.5px] font-bold leading-relaxed" style={{ color: P3R.ink }}>{ORG_RULES.map((r) => <li key={r}>{r}</li>)}</ol>
                <p className="mt-3 text-[12px] leading-relaxed" style={{ color: P3R.inkSoft }}>{ORG_PRIVACY_NOTE}</p>
              </div>
            )}
          </section>
          <section className="pt-1">
            {leader ? (
              <>
                <P3Button block tone="danger" onClick={() => setConfirm({ kind: 'dissolve' })}>解散组织</P3Button>
                <p className="mt-2 text-[11px] font-bold leading-relaxed" style={{ color: P3R.grey }}>队长不能直接退出：先把队长转让给别人，或者解散组织。</p>
              </>
            ) : <P3Button block tone="danger" onClick={() => setConfirm({ kind: 'leave' })}>退出组织</P3Button>}
          </section>
        </div>
      </P3Sheet>
      <OrgSettingsConfirm confirm={confirm} orgName={view.org.name} onClose={() => setConfirm(null)} onConfirm={(c) => {
        if (c.kind === 'rotate') setInfo('换好了，旧码已经作废');
        else if (c.kind === 'kick') setInfo(`已请离「${displayCodename(c.member)}」，邀请码也换了新的`);
        else if (c.kind === 'transfer') setInfo(`队长已经交给「${displayCodename(c.member)}」`);
        else { onFlash(c.kind === 'leave' ? `已退出「${view.org.name}」` : `「${view.org.name}」已解散`); onGone(); }
      }} />
    </>
  );
}

export default function OrgSettingsSheet({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const [blocked, setBlocked] = useState<string[]>(['u4']);
  return <OrgSettings view={buildView()} open={open} onClose={onClose} leader={params?.get('leader') !== '0'} blocked={blocked} onUnblock={(u) => setBlocked((b) => b.filter((x) => x !== u))} startEditing={params?.get('edit') === '1'}
    onEditCard={() => toast('打开选代表牌')} onEditTitles={() => toast('打开等级与称号')} onFlash={(s) => toast(s)} onGone={onClose} />;
}
