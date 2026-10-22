/**
 * 建立 / 加入组织引导（真实 src/components/org/OrgOnboardingSheet.tsx + TarotCoverflow.tsx）
 * 步骤：rules 据点守则 → form 建立组织 | code 加入组织（查找）→ preview（加入）→ card 选代表牌 → codename 定代号 → welcome 入队欢迎
 * 路由：#/overlay/hideout-onboarding?step=rules|create|join|card|welcome（&mode=join|card；&err=bad|gone）
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { P4Sheet, P4Button, P4Input, P4Field, P4Outline, Portal, useToast } from '@yellow/kit';
import { CollageStagger, CollageItem } from '@yellow/fx';
import { cx } from '@yellow/lib/cx';
import { useLowMotion } from '@yellow/lib/prefs';
import { MAJOR, TAROT_BY_ID, tarotImg } from '@yellow/mock/pkg4-tarot';
import { ORG, ORG_CODENAME_MAX, ORG_EMBLEMS, ORG_MOTTO_MAX, ORG_NAME_MAX, ORG_RULES } from '@yellow/mock/pkg4-org';
import { Coverflow } from '@yellow/screens/pkg4/org/Coverflow';

export type OnbMode = 'create' | 'join' | 'card';
type Step = 'rules' | 'form' | 'code' | 'preview' | 'card' | 'codename' | 'welcome';
const TAKEN = new Set(['chariot', 'empress', 'magician']);
const VALID_CODE = /^[A-HJ-NP-Z2-9]{8}$/;

export function OrgOnboarding({ mode, open, onClose, initialStep, err, onDone }: { mode: OnbMode | null; open: boolean; onClose: () => void; initialStep?: Step; err?: 'bad' | 'gone'; onDone: (orgName: string) => void }) {
  const low = useLowMotion();
  const first: Step = mode === 'card' ? 'card' : 'rules';
  const [step, setStep] = useState<Step>(initialStep ?? first);
  const [name, setName] = useState('');
  const [motto, setMotto] = useState('');
  const [emblem, setEmblem] = useState('moon');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [idx, setIdx] = useState(0);
  const [tarotId, setTarotId] = useState<string>('');
  const [kind, setKind] = useState<'nickname' | 'tarot' | 'custom'>('nickname');
  const [custom, setCustom] = useState('');
  const [orgName, setOrgName] = useState(ORG.name);
  useEffect(() => { if (open) { setStep(initialStep ?? first); setError(''); setBusy(false); if (initialStep === 'codename') setTarotId('fool'); } }, [open, mode]); // eslint-disable-line
  const nickname = '夜读人';
  const pick = MAJOR[idx];
  const pickTaken = TAKEN.has(pick.id);
  const preview = kind === 'tarot' ? (TAROT_BY_ID[tarotId]?.name ?? '（先选一张牌）') : kind === 'nickname' ? nickname : (custom.trim() || '（写一个代号）');
  const run = (fn: () => void, ms = 700) => { setBusy(true); setError(''); setTimeout(() => { setBusy(false); fn(); }, ms); };
  const titles: Record<Step, string> = { rules: '据点守则', form: '建立组织', code: '加入组织', preview: '加入组织', card: mode === 'card' ? '换代表牌' : '选代表牌', codename: mode === 'card' ? '我的成员牌' : '定代号', welcome: '' };
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);

  const footer = (() => {
    if (step === 'rules') return <P4Button block size="lg" variant="black" onClick={() => setStep(mode === 'create' ? 'form' : 'code')}>同意并继续</P4Button>;
    if (step === 'form') return <P4Button block size="lg" variant="black" disabled={busy || !name.trim()} busy={busy} onClick={() => run(() => { setOrgName(name.trim()); setStep('card'); })}>{busy ? '建立中…' : '建立组织'}</P4Button>;
    if (step === 'code') return <P4Button block size="lg" variant="black" disabled={busy || normalized.length !== 8} busy={busy} onClick={() => run(() => { if (err === 'bad' || !VALID_CODE.test(normalized)) setError('邀请码不对，或者组织已经换了新码'); else setStep('preview'); })}>{busy ? '查找中…' : '查找'}</P4Button>;
    if (step === 'preview') return <div className="flex gap-2"><P4Button variant="secondary" disabled={busy} onClick={() => { setStep('code'); setError(''); }}>换个码</P4Button><P4Button className="flex-1" variant="black" disabled={busy} busy={busy} onClick={() => run(() => { if (err === 'gone') setError('找不到这个组织了'); else setStep('card'); })}>{busy ? '加入中…' : '加入'}</P4Button></div>;
    if (step === 'card') return <P4Button block size="lg" variant="black" disabled={pickTaken} onClick={() => { setTarotId(pick.id); setStep('codename'); }}>{pickTaken ? '这张已经有人了' : `就选「${pick.name}」`}</P4Button>;
    if (step === 'codename') return <div className="flex gap-2"><P4Button variant="secondary" disabled={busy} onClick={() => { setStep('card'); setError(''); }}>换一张</P4Button><P4Button className="flex-1" variant="black" disabled={busy || !tarotId} busy={busy} onClick={() => run(() => { if (kind === 'custom' && !custom.trim()) { setError('写一个代号'); return; } if (mode === 'card') { onDone(orgName); onClose(); } else setStep('welcome'); })}>{busy ? '保存中…' : mode === 'card' ? '保存' : '放进名册'}</P4Button></div>;
    return null;
  })();

  const vw = typeof window === 'undefined' ? 390 : window.innerWidth;
  const cw = Math.min(150, Math.max(110, Math.floor(vw * 0.32)));

  return (
    <>
      <P4Sheet open={open && step !== 'welcome'} onClose={() => !busy && onClose()} title={titles[step]} en="HIDEOUT · ONBOARDING" size="tall" footer={footer}>
        <div className="space-y-4 pt-1">
          {step === 'rules' && (
            <div className="space-y-3">
              <p className="text-body leading-relaxed text-p4g-ink">组织是一小群人互相看见、互相打气的地方。第一次建立或加入之前，先读一下这几条：</p>
              <ol className="space-y-2">
                {ORG_RULES.map((r, i) => (
                  <li key={i} className="flex gap-2.5 rounded-sm border-3 border-p4g-line px-3 py-2 text-body font-bold leading-relaxed text-p4g-ink" style={{ background: 'var(--p4g-surface-grad)' }}>
                    <span className="mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-xs bg-p4g-black p4g-num-upright text-meta text-p4g-yellow night:bg-p4g-yellow night:text-p4g-black">{i + 1}</span><span className="min-w-0">{r}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {step === 'form' && (
            <>
              <P4Field label="组织名" counter={`${[...name].length} / ${ORG_NAME_MAX}`}><P4Input aria-label="组织名" value={name} placeholder="比如：夜读小队" onChange={(e) => setName([...e.target.value].slice(0, ORG_NAME_MAX).join(''))} /></P4Field>
              <P4Field label="口号（可以不写）" counter={`${[...motto].length} / ${ORG_MOTTO_MAX}`}><P4Input aria-label="口号" value={motto} placeholder="一句大家都认的话" onChange={(e) => setMotto([...e.target.value].slice(0, ORG_MOTTO_MAX).join(''))} /></P4Field>
              <P4Field label="徽记">
                <div className="grid grid-cols-6 gap-1.5">{ORG_EMBLEMS.map((e) => <button key={e.id} type="button" aria-pressed={e.id === emblem} aria-label={`徽记：${e.label}`} onClick={() => setEmblem(e.id)} className={cx('p4g-press flex aspect-square items-center justify-center rounded-sm border-3 font-display text-h3', e.id === emblem ? 'border-p4g-black bg-p4g-black text-p4g-yellow shadow-[3px_3px_0_var(--p4g-orange)] night:border-p4g-yellow' : 'border-p4g-line bg-p4g-surface text-p4g-ink')}>{e.glyph}</button>)}</div>
              </P4Field>
              <p className="text-meta leading-relaxed text-p4g-ink-soft">建好之后你是队长，坐 1 号座位；把邀请码发给朋友，最多 7 个人。每人最多自建一个、加入一个组织。</p>
            </>
          )}
          {step === 'code' && (
            <>
              <P4Field label="邀请码" error={error || undefined}>
                <P4Input aria-label="邀请码" value={code} placeholder="8 位字母和数字" autoCapitalize="characters" className="p4g-num-upright tracking-[0.3em]" onChange={(e) => { setCode(e.target.value.slice(0, 12)); setError(''); }} />
              </P4Field>
              <p className="text-meta leading-relaxed text-p4g-ink-soft">邀请码在队长的据点页底部。码里没有 0、O、1、I，看着像的都按别的字母输。</p>
              {error && <P4Button size="sm" variant="secondary" onClick={() => { setCode(''); setError(''); }}>换个码</P4Button>}
            </>
          )}
          {step === 'preview' && (
            <div className="relative overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-yellow p-4 text-p4g-black shadow-hard-lg night:border-p4g-yellow">
              <div aria-hidden className="absolute inset-y-0 right-0 w-14 p4g-hazard opacity-40" />
              <div className="relative flex items-center gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm bg-p4g-black font-display text-h1 text-p4g-yellow">☾</span>
                <div className="min-w-0"><div className="truncate font-display text-h2 font-bold">{ORG.name}</div><div className="truncate text-meta font-bold opacity-80">「{ORG.motto}」</div><div className="mt-1 font-display text-meta font-bold">5 / 7 人 · 队长 夜读人</div></div>
              </div>
              {error && <div className="relative mt-3 rounded-xs bg-p4g-black px-2 py-1 text-meta font-bold text-p4g-yellow">{error}</div>}
            </div>
          )}
          {step === 'card' && (
            <div className="space-y-2">
              <Coverflow items={MAJOR} index={idx} onIndex={setIdx} cardW={cw} height={Math.round(cw * 1.6) + 24} ariaLabel="代表牌"
                itemLabel={(c) => `${c.name}${TAKEN.has(c.id) ? '（已有人持有）' : ''}`}
                render={(c) => (
                  <span className="relative block overflow-hidden rounded-[6px] border-3 border-p4g-black bg-p4g-black shadow-[4px_4px_0_var(--p4g-orange)] night:border-p4g-yellow" style={{ height: Math.round(cw * 1.6) }}>
                    <img src={tarotImg(c.id)} alt="" draggable={false} className={cx('h-full w-full object-cover', TAKEN.has(c.id) && 'opacity-40 grayscale')} />
                    {TAKEN.has(c.id) && <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-p4g-black/80 py-1 text-center font-display text-meta font-bold tracking-[0.1em] text-white">已有人持有</span>}
                  </span>
                )} />
              <div className="text-center">
                <div className="font-display text-h3 font-bold text-p4g-ink">{pick.roman} · {pick.name}</div>
                <div className="mx-auto mt-0.5 max-w-[32ch] p4g-clamp-2 text-meta leading-relaxed text-p4g-ink-soft">{pickTaken ? '这张已经有人持有了，滑到别的牌看看。' : pick.upright.meaning}</div>
                <p className="mt-1 text-2xs font-bold text-p4g-ink-soft">左右滑动挑一张 · 同一组织里每张只能一个人</p>
              </div>
            </div>
          )}
          {step === 'codename' && (
            <>
              <div className="flex items-center gap-3">
                {tarotId && <img src={tarotImg(tarotId)} alt="" className="h-24 w-[60px] shrink-0 rounded-[4px] border-3 border-p4g-black object-cover shadow-hard-sm" />}
                <div className="min-w-0 font-display text-lead font-bold text-p4g-ink">{TAROT_BY_ID[tarotId]?.name ?? ''}</div>
              </div>
              <P4Field label="代号" error={error || undefined}>
                <div className="grid grid-cols-3 gap-1.5">
                  {([['nickname', '用昵称'], ['tarot', '用牌名'], ['custom', '自己写']] as const).map(([k, l]) => (
                    <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={cx('p4g-press rounded-sm border-3 py-2 font-display text-body font-bold', kind === k ? 'border-p4g-select bg-p4g-select text-[color:var(--p4g-select-ink)]' : 'border-p4g-line bg-p4g-surface text-p4g-ink')}>{l}</button>
                  ))}
                </div>
                {kind === 'custom' && <P4Input aria-label="自己写代号" value={custom} placeholder={`最多 ${ORG_CODENAME_MAX} 个字`} onChange={(e) => setCustom([...e.target.value].slice(0, ORG_CODENAME_MAX).join(''))} />}
              </P4Field>
              <div className="font-display text-meta font-bold text-p4g-ink-soft">名册上显示为：<span className="text-p4g-ink">{preview}</span></div>
            </>
          )}
        </div>
      </P4Sheet>
      <Welcome open={open && step === 'welcome'} orgName={orgName} onClose={() => { onDone(orgName); onClose(); }} low={low} />
    </>
  );
}

function Welcome({ open, orgName, onClose, low }: { open: boolean; orgName: string; onClose: () => void; low: boolean }) {
  useEffect(() => { if (!open) return; const t = setTimeout(onClose, 4200); return () => clearTimeout(t); }, [open]); // eslint-disable-line
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.button key="w" type="button" onClick={onClose} aria-label="点一下继续" className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-p4g-yellow text-p4g-black" style={{ zIndex: 'var(--p4g-z-celebration)' as unknown as number }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div aria-hidden className="absolute -inset-x-20 top-[38%] h-16 -rotate-6 p4g-hazard border-y-3 border-p4g-black" initial={low ? { opacity: 0 } : { x: '-110%' }} animate={low ? { opacity: 1 } : { x: '0%' }} transition={{ duration: 0.4, ease: [0.2, 0.9, 0.1, 1] }} />
            <motion.div aria-hidden className="absolute -inset-x-20 top-[58%] h-6 rotate-3 p4g-candy-h" initial={low ? { opacity: 0 } : { x: '110%' }} animate={low ? { opacity: 1 } : { x: '0%' }} transition={{ duration: 0.4, delay: 0.1, ease: [0.2, 0.9, 0.1, 1] }} />
            <CollageStagger className="relative flex flex-col items-center gap-3 px-6" delay={0.25} stagger={0.1}>
              <CollageItem tilt={-3}><span className="inline-block bg-p4g-black px-3 py-1 font-display text-meta font-bold italic tracking-[0.3em] text-p4g-yellow">WELCOME TO THE HIDEOUT</span></CollageItem>
              <CollageItem tilt={2}><div className="max-w-[90vw] text-center"><P4Outline size="clamp(26px,7.5vw,48px)" stroke={6} wrap>今天起，你是「{orgName}」的一员</P4Outline></div></CollageItem>
              <CollageItem><span className="inline-block bg-white px-2 py-0.5 font-display text-body font-bold shadow-[3px_3px_0_#000]">名册上多了一张牌</span></CollageItem>
            </CollageStagger>
            <div className="absolute bottom-10 font-display text-meta font-bold text-p4g-black/60">点一下继续</div>
          </motion.button>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export default function OrgOnboardingSheet({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const s = params?.get('step') ?? 'rules';
  const step: Step = s === 'create' ? 'form' : s === 'join' ? 'code' : (s as Step);
  const mode: OnbMode = (params?.get('mode') as OnbMode) ?? (s === 'join' ? 'join' : 'create');
  return <OrgOnboarding mode={mode} open={open} onClose={onClose} initialStep={step} err={(params?.get('err') as 'bad') ?? undefined} onDone={(n) => toast.success(`已加入「${n}」`)} />;
}
