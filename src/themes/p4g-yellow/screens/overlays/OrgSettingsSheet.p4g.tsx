/**
 * 据点设置（真实 src/components/org/OrgSettingsSheet.tsx）
 * 我的成员牌（修改/去选）· 在名册背面展示的面具（开关，最多 3 张）· 等级与称号（编辑/查看）·
 * 组织资料（队长：修改 组织名/口号/徽记，取消/保存）· 换一个邀请码（换码）· 成员（转让/请离）·
 * 屏蔽名单（解除）· 据点守则 · 别人能看到什么（展开/收起）· 解散组织 / 退出组织
 * 路由：#/overlay/hideout-settings?leader=0
 */
import { useEffect, useState } from 'react';
import type { OrgView } from '@/types';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Sheet, P4Button, P4Input, P4Switch, P4Section, useToast } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { ATTR_NAMES } from '@yellow/adapters/pkg4-tarot';
import { buildView, LEVEL, ORG_EMBLEMS, ORG_LEVEL_NAMES, ORG_MAX_SHOWN_MASKS, ORG_MOTTO_MAX, ORG_NAME_MAX, ORG_PRIVACY_NOTE, ORG_RULES } from '@yellow/adapters/pkg4-org';
import { displayCodename, MemberThumb } from '@yellow/screens/pkg4/org/common';
import { OrgSettingsConfirm, type SettingsConfirm } from './OrgSettingsSheetConfirm.p4g';

const MY_MASKS = [{ id: 'guts', name: '伊邪那岐' }, { id: 'knowledge', name: '智慧之书' }, { id: 'charm', name: '魅惑之镜' }, { id: 'kindness', name: '慈母观音' }];

export function OrgSettings({ view, open, onClose, leader, blocked, onUnblock, onEditCard, onEditTitles, onFlash, onGone }: {
  view: OrgView; open: boolean; onClose: () => void; leader: boolean; blocked: string[]; onUnblock: (uid: string) => void;
  onEditCard: () => void; onEditTitles: () => void; onFlash: (s: string) => void; onGone: () => void;
}) {
  const [shown, setShown] = useState<string[]>(['guts']);
  const [maskOn, setMaskOn] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(view.org.name);
  const [motto, setMotto] = useState(view.org.motto);
  const [emblem, setEmblem] = useState(view.org.emblem);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [confirm, setConfirm] = useState<SettingsConfirm | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  useEffect(() => { if (open) { setEditing(false); setError(''); setInfo(''); } }, [open]);
  const toggleMask = (id: string) => {
    setError('');
    if (shown.includes(id)) { setShown((s) => s.filter((x) => x !== id)); return; }
    if (shown.length >= ORG_MAX_SHOWN_MASKS) { setError(`最多展示 ${ORG_MAX_SHOWN_MASKS} 张：先去掉一张`); return; }
    setShown((s) => [...s, id]);
  };
  const others = view.members.filter((m) => m.userId !== view.me.userId);
  const blockedMembers = view.members.filter((m) => blocked.includes(m.userId));
  const sec = (t: string) => <div className="mb-2 flex items-center gap-1.5 font-display text-meta font-bold text-p4g-ink"><span aria-hidden className="inline-block h-3.5 w-1.5 -skew-x-12 bg-p4g-orange" />{t}</div>;
  const row = 'flex min-w-0 items-center gap-3 rounded-sm border-3 border-p4g-line px-3 py-2.5';
  const rowBg = { background: 'var(--p4g-surface-grad)' };
  const emb = ORG_EMBLEMS.find((e) => e.id === view.org.emblem);

  return (
    <>
      <P4Sheet open={open} onClose={onClose} title="据点设置" en="HIDEOUT SETTINGS" size="tall">
        <div className="space-y-5 pt-1">
          {(info || error) && <div className={cx('rounded-sm px-3 py-2 text-meta font-bold', error ? 'bg-p4g-danger text-[color:var(--p4g-danger-ink)]' : 'bg-p4g-black text-p4g-yellow')}>{error || info}</div>}
          <section>
            {sec('我的成员牌')}
            <div className={row} style={rowBg}>
              <MemberThumb m={view.me} width={28} />
              <div className="min-w-0 flex-1"><div className="truncate font-display text-body font-bold text-p4g-ink">{displayCodename(view.me)}</div><div className="text-2xs font-bold text-p4g-ink-soft">{view.me.tarotId ? '代表牌与代号' : '还没选代表牌'}</div></div>
              <P4Button size="sm" variant="secondary" onClick={onEditCard}>{view.me.tarotId ? '修改' : '去选'}</P4Button>
            </div>
            <div className="mt-2.5 rounded-sm border-3 border-p4g-line px-3 py-2.5" style={rowBg}>
              <div className="flex items-center gap-3"><div className="min-w-0 flex-1 font-display text-body font-bold text-p4g-ink">在名册背面展示的面具</div><P4Switch size="sm" checked={maskOn} onChange={setMaskOn} aria-label="在名册背面展示的面具" /></div>
              <div className="mt-0.5 text-2xs font-bold leading-relaxed text-p4g-ink-soft">最多 {ORG_MAX_SHOWN_MASKS} 张。队友可以同调其中一张，在逆影战场里用（每周 3 场）。</div>
              {maskOn && (
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {MY_MASKS.map((mk) => { const idx = shown.indexOf(mk.id); const on = idx >= 0; return (
                    <button key={mk.id} type="button" aria-pressed={on} aria-label={`${mk.name}（${ATTR_NAMES[mk.id as 'guts']}）${on ? `，第 ${idx + 1} 张` : ''}`} onClick={() => toggleMask(mk.id)} className={cx('p4g-press flex min-w-0 items-center gap-1.5 rounded-sm border-3 px-2 py-1.5 text-left', on ? 'border-p4g-select bg-p4g-select text-[color:var(--p4g-select-ink)]' : 'border-p4g-line bg-p4g-surface-2 text-p4g-ink')}>
                      <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded-xs p4g-num-upright text-2xs', on ? 'bg-p4g-orange text-p4g-black' : 'border-thin border-p4g-line')}>{on ? idx + 1 : ''}</span>
                      <span className="min-w-0 truncate font-display text-meta font-bold">{mk.name}</span><span className="ml-auto shrink-0 text-2xs opacity-75">{ATTR_NAMES[mk.id as 'guts']}</span>
                    </button>); })}
                </div>
              )}
            </div>
          </section>
          <section>
            {sec('等级与称号')}
            <div className={row} style={rowBg}>
              <div className="min-w-0 flex-1"><div className="truncate font-display text-body font-bold text-p4g-ink">据点 Lv.{LEVEL.level} · {ORG_LEVEL_NAMES[LEVEL.level - 1]}</div><div className="text-2xs font-bold text-p4g-ink-soft">{leader ? '给每一级起名字、给称号改名、加自己的称号' : '每一级叫什么、每个称号怎么拿'}</div></div>
              <P4Button size="sm" variant="secondary" onClick={onEditTitles}>{leader ? '编辑' : '查看'}</P4Button>
            </div>
          </section>
          {leader && (
            <section>
              {sec('组织资料')}
              {!editing ? (
                <div className={row} style={rowBg}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-p4g-black font-display text-h3 text-p4g-yellow">{emb?.glyph}</span>
                  <div className="min-w-0 flex-1"><div className="truncate font-display text-body font-bold text-p4g-ink">{name}</div><div className="truncate text-2xs font-bold text-p4g-ink-soft">{motto || '还没有口号'}</div></div>
                  <P4Button size="sm" variant="secondary" onClick={() => setEditing(true)}>修改</P4Button>
                </div>
              ) : (
                <div className="space-y-2 rounded-sm border-3 border-p4g-line bg-p4g-surface-2 p-3">
                  <P4Input aria-label="组织名" value={name} onChange={(e) => setName([...e.target.value].slice(0, ORG_NAME_MAX).join(''))} />
                  <P4Input aria-label="口号" placeholder="口号（可以不写）" value={motto} onChange={(e) => setMotto([...e.target.value].slice(0, ORG_MOTTO_MAX).join(''))} />
                  <div className="grid grid-cols-6 gap-1.5">{ORG_EMBLEMS.map((e) => <button key={e.id} type="button" aria-pressed={e.id === emblem} aria-label={`徽记：${e.label}`} onClick={() => setEmblem(e.id)} className={cx('p4g-press flex aspect-square items-center justify-center rounded-sm border-3 font-display text-h3', e.id === emblem ? 'border-p4g-black bg-p4g-black text-p4g-yellow night:border-p4g-yellow' : 'border-p4g-line bg-p4g-surface text-p4g-ink')}>{e.glyph}</button>)}</div>
                  <div className="flex justify-end gap-2"><P4Button size="sm" variant="secondary" onClick={() => setEditing(false)}>取消</P4Button><P4Button size="sm" disabled={!name.trim()} onClick={() => { setEditing(false); setInfo('改好了'); }}>保存</P4Button></div>
                </div>
              )}
              <div className={cx(row, 'mt-2.5')} style={rowBg}>
                <div className="min-w-0 flex-1"><div className="font-display text-body font-bold text-p4g-ink">换一个邀请码</div><div className="text-2xs font-bold text-p4g-ink-soft">码外传了、或者不想再有人加入时用</div></div>
                <P4Button size="sm" variant="secondary" onClick={() => setConfirm({ kind: 'rotate' })}>换码</P4Button>
              </div>
            </section>
          )}
          {leader && (
            <section>
              {sec('成员')}
              <div className="space-y-1.5">
                {others.map((m) => (
                  <div key={m.id} className={row} style={rowBg}>
                    <MemberThumb m={m} width={22} />
                    <div className="min-w-0 flex-1"><div className="truncate font-display text-body font-bold text-p4g-ink">{displayCodename(m)}</div><div className="text-2xs font-bold text-p4g-ink-soft">连续 {m.card.streak} 天</div></div>
                    <P4Button size="sm" variant="secondary" onClick={() => setConfirm({ kind: 'transfer', member: m })}>转让</P4Button>
                    <P4Button size="sm" variant="danger" onClick={() => setConfirm({ kind: 'kick', member: m })}>请离</P4Button>
                  </div>
                ))}
              </div>
            </section>
          )}
          {blockedMembers.length > 0 && (
            <section>
              {sec('屏蔽名单（只在本机生效）')}
              {blockedMembers.map((m) => <div key={m.id} className={row} style={rowBg}><span className="min-w-0 flex-1 truncate font-display text-body font-bold text-p4g-ink">{displayCodename(m)}</span><P4Button size="sm" variant="secondary" onClick={() => onUnblock(m.userId)}>解除</P4Button></div>)}
            </section>
          )}
          <section>
            <button type="button" onClick={() => setRulesOpen((v) => !v)} aria-expanded={rulesOpen} className="flex w-full items-center justify-between py-1 text-left">
              <span className="font-display text-meta font-bold tracking-wider text-p4g-ink">据点守则 · 别人能看到什么</span><span className="font-display text-meta font-bold text-p4g-ink-soft">{rulesOpen ? '收起' : '展开'}</span>
            </button>
            {rulesOpen && (
              <div className="mt-2 rounded-sm border-thin border-dashed border-p4g-line p-3">
                <ol className="list-decimal space-y-1.5 pl-5 text-meta font-bold leading-relaxed text-p4g-ink">{ORG_RULES.map((r) => <li key={r}>{r}</li>)}</ol>
                <p className="mt-3 text-meta leading-relaxed text-p4g-ink-soft">{ORG_PRIVACY_NOTE}</p>
              </div>
            )}
          </section>
          <section className="pt-1">
            {leader ? (
              <>
                <P4Button block variant="danger" onClick={() => setConfirm({ kind: 'dissolve' })}>解散组织</P4Button>
                <p className="mt-2 text-2xs font-bold leading-relaxed text-p4g-ink-soft">队长不能直接退出：先把队长转让给别人，或者解散组织。</p>
              </>
            ) : <P4Button block variant="danger" onClick={() => setConfirm({ kind: 'leave' })}>退出组织</P4Button>}
          </section>
        </div>
      </P4Sheet>
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
  return <OrgSettings view={buildView()} open={open} onClose={onClose} leader={params?.get('leader') !== '0'} blocked={blocked} onUnblock={(u) => setBlocked((b) => b.filter((x) => x !== u))}
    onEditCard={() => toast('打开选代表牌')} onEditTitles={() => toast('打开等级与称号')} onFlash={(s) => toast(s)} onGone={onClose} />;
}
