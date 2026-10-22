/**
 * 建立 / 加入组织引导（真实 src/components/org/OrgOnboardingSheet.tsx + TarotCoverflow.tsx），粉白 p3
 * 步骤：rules 据点守则 → form 建立组织 | code 加入组织（查找）→ preview（加入）→ card 选代表牌 → codename 定代号 → welcome 入队欢迎（全屏斜带 + 樱瓣）
 * 路由：#/overlay/hideout-onboarding?step=rules|create|join|preview|card|codename|welcome（&mode=join|card；&err=bad|gone）
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import { P3Sheet, P3Button, P3Input, P3Field, P3R, Portal, slantClip, chamferClip, useToast } from '@pink/kit';
import { PetalBurst } from '@pink/fx';
import { useLowMotion } from '@pink/lib/prefs';
import { useViewportWidth } from '@pink/lib/layout';
import { MAJOR, TAROT_BY_ID } from '@pink/mock/pkg4-tarot';
import { ORG, ORG_CODENAME_MAX, ORG_EMBLEMS, ORG_MOTTO_MAX, ORG_NAME_MAX, ORG_RULES } from '@pink/mock/pkg4-org';
import { Coverflow } from '@pink/screens/pkg4/org/common';
import { Arcana } from '@pink/screens/pkg4/tarot';

export type OnbMode = 'create' | 'join' | 'card';
type Step = 'rules' | 'form' | 'code' | 'preview' | 'card' | 'codename' | 'welcome';
const TAKEN = new Set(['chariot', 'empress', 'magician']);
const VALID_CODE = /^[A-HJ-NP-Z2-9]{8}$/;
const pick3 = (on: boolean) => ({ clipPath: slantClip(8), background: on ? P3R.blue : 'var(--p3r-row)', color: on ? P3R.onBlue : P3R.ink, boxShadow: on ? undefined : 'inset 0 0 0 1.5px var(--p3r-track)' });

export function OrgOnboarding({ mode, open, onClose, initialStep, err, onDone }: { mode: OnbMode | null; open: boolean; onClose: () => void; initialStep?: Step; err?: 'bad' | 'gone'; onDone: (orgName: string) => void }) {
  const low = useLowMotion();
  const vw = useViewportWidth();
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
  useEffect(() => { if (open) { setStep(initialStep ?? first); setError(''); setBusy(false); if (initialStep === 'codename') setTarotId('fool'); if (initialStep === 'preview' || initialStep === 'code') setCode('NIGHT7RD'); } }, [open, mode]); // eslint-disable-line react-hooks/exhaustive-deps
  const nickname = '夜读人';
  const pick = MAJOR[idx];
  const pickTaken = TAKEN.has(pick.id);
  const preview = kind === 'tarot' ? (TAROT_BY_ID[tarotId]?.name ?? '（先选一张牌）') : kind === 'nickname' ? nickname : (custom.trim() || '（写一个代号）');
  const run = (fn: () => void, ms = 700) => { setBusy(true); setError(''); window.setTimeout(() => { setBusy(false); fn(); }, ms); };
  const titles: Record<Step, string> = { rules: '据点守则', form: '建立组织', code: '加入组织', preview: '加入组织', card: mode === 'card' ? '换代表牌' : '选代表牌', codename: mode === 'card' ? '我的成员牌' : '定代号', welcome: '' };
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);

  const footer = (() => {
    if (step === 'rules') return <P3Button block size="lg" corner onClick={() => setStep(mode === 'create' ? 'form' : 'code')}>同意并继续</P3Button>;
    if (step === 'form') return <P3Button block size="lg" corner disabled={!name.trim()} busy={busy} busyText="建立中…" onClick={() => run(() => { setOrgName(name.trim()); setStep('card'); })}>建立组织</P3Button>;
    if (step === 'code') return <P3Button block size="lg" corner disabled={normalized.length !== 8} busy={busy} busyText="查找中…" onClick={() => run(() => { if (err === 'bad' || !VALID_CODE.test(normalized)) setError('邀请码不对，或者组织已经换了新码'); else setStep('preview'); })}>查找</P3Button>;
    if (step === 'preview') return <div className="flex gap-2"><P3Button tone="soft" disabled={busy} onClick={() => { setStep('code'); setError(''); }}>换个码</P3Button><P3Button className="flex-1" corner busy={busy} busyText="加入中…" onClick={() => run(() => { if (err === 'gone') setError('找不到这个组织了'); else setStep('card'); })}>加入</P3Button></div>;
    if (step === 'card') return <P3Button block size="lg" corner disabled={pickTaken} onClick={() => { setTarotId(pick.id); setStep('codename'); }}>{pickTaken ? '这张已经有人了' : `就选「${pick.name}」`}</P3Button>;
    if (step === 'codename') return <div className="flex gap-2"><P3Button tone="soft" disabled={busy} onClick={() => { setStep('card'); setError(''); }}>换一张</P3Button><P3Button className="flex-1" corner disabled={!tarotId} busy={busy} busyText="保存中…" onClick={() => run(() => { if (kind === 'custom' && !custom.trim()) { setError('写一个代号'); return; } if (mode === 'card') { onDone(orgName); onClose(); } else setStep('welcome'); })}>{mode === 'card' ? '保存' : '放进名册'}</P3Button></div>;
    return null;
  })();

  const cw = Math.min(150, Math.max(110, Math.floor(Math.min(vw, 560) * 0.32)));

  return (
    <>
      <P3Sheet open={open && step !== 'welcome'} onClose={onClose} busy={busy} title={titles[step]} en="HIDEOUT · ONBOARDING" size="tall" footer={footer}>
        <div className="space-y-4 pt-1">
          {step === 'rules' && (
            <div className="space-y-3">
              <p className="text-[14px] leading-relaxed" style={{ color: P3R.ink }}>组织是一小群人互相看见、互相打气的地方。第一次建立或加入之前，先读一下这几条：</p>
              <ol className="space-y-2">
                {ORG_RULES.map((r, i) => (
                  <motion.li key={r} initial={low ? { opacity: 0 } : { opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: low ? 0 : i * 0.06 }} className="flex gap-2.5 px-4 py-2 text-[13.5px] font-bold leading-relaxed" style={{ background: 'var(--p3r-row)', color: P3R.ink, clipPath: slantClip(10), boxShadow: 'inset 0 0 0 1px var(--p3r-track)' }}>
                    <span className="mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center font-cond text-[14px]" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(4) }}>{i + 1}</span><span className="min-w-0">{r}</span>
                  </motion.li>
                ))}
              </ol>
            </div>
          )}
          {step === 'form' && (
            <>
              <P3Field label="组织名" count={`${[...name].length} / ${ORG_NAME_MAX}`}><P3Input aria-label="组织名" value={name} placeholder="比如：夜读小队" onChange={(e) => setName([...e.target.value].slice(0, ORG_NAME_MAX).join(''))} /></P3Field>
              <P3Field label="口号（可以不写）" count={`${[...motto].length} / ${ORG_MOTTO_MAX}`}><P3Input aria-label="口号" value={motto} placeholder="一句大家都认的话" onChange={(e) => setMotto([...e.target.value].slice(0, ORG_MOTTO_MAX).join(''))} /></P3Field>
              <P3Field label="徽记">
                <div className="grid grid-cols-6 gap-1.5">{ORG_EMBLEMS.map((e) => <button key={e.id} type="button" aria-pressed={e.id === emblem} aria-label={`徽记：${e.label}`} onClick={() => setEmblem(e.id)} className="flex aspect-square items-center justify-center text-[18px] font-black" style={pick3(e.id === emblem)}>{e.glyph}</button>)}</div>
              </P3Field>
              <p className="text-[12.5px] leading-relaxed" style={{ color: P3R.inkSoft }}>建好之后你是队长，坐 1 号座位；把邀请码发给朋友，最多 7 个人。每人最多自建一个、加入一个组织。</p>
            </>
          )}
          {step === 'code' && (
            <>
              <P3Field label="邀请码" error={error || undefined}>
                <P3Input aria-label="邀请码" value={code} placeholder="8 位字母和数字" autoCapitalize="characters" invalid={!!error} className="tracking-[0.3em]" onChange={(e) => { setCode(e.target.value.slice(0, 12)); setError(''); }} />
              </P3Field>
              <p className="text-[12.5px] leading-relaxed" style={{ color: P3R.inkSoft }}>邀请码在队长的据点页底部。码里没有 0、O、1、I，看着像的都按别的字母输。</p>
              {error && <P3Button size="sm" tone="soft" onClick={() => { setCode(''); setError(''); }}>换个码</P3Button>}
            </>
          )}
          {step === 'preview' && (
            <div className="relative overflow-hidden px-5 py-4" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(16) }}>
              <span aria-hidden className="absolute -right-6 top-0 h-full w-24" style={{ background: 'rgba(255,255,255,0.14)', clipPath: 'polygon(40% 0, 100% 0, 60% 100%, 0 100%)' }} />
              <div className="relative flex items-center gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center text-[28px] font-black" style={{ background: 'var(--p3r-cream)', color: 'var(--p3r-blue-deep)', clipPath: chamferClip(8, 8) }}>☾</span>
                <div className="min-w-0"><div className="truncate font-heavy text-[22px]">{ORG.name}</div><div className="truncate text-[12px] font-bold opacity-85">「{ORG.motto}」</div><div className="mt-1 text-[12px] font-black">5 / 7 人 · 队长 夜读人</div></div>
              </div>
              {error && <div className="relative mt-3 px-2 py-1 text-[12px] font-black" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(4) }}>{error}</div>}
            </div>
          )}
          {step === 'card' && (
            <div className="space-y-2">
              <Coverflow items={MAJOR} index={idx} onIndex={setIdx} cardW={cw} height={Math.round(cw * 1.66) + 24} ariaLabel="代表牌"
                itemLabel={(c) => `${c.name}${TAKEN.has(c.id) ? '（已有人持有）' : ''}`}
                render={(c) => (
                  <span className="relative block" style={{ height: Math.round(cw * 1.66) }}>
                    <span className={TAKEN.has(c.id) ? 'block opacity-40' : 'block'}><Arcana id={c.id} width={cw} tag={false} /></span>
                    {TAKEN.has(c.id) && <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 py-1 text-center text-[12px] font-black tracking-[0.1em]" style={{ background: 'color-mix(in srgb, var(--p3r-mulberry) 85%, transparent)', color: '#fff' }}>已有人持有</span>}
                  </span>
                )} />
              <div className="text-center">
                <div className="font-heavy text-[19px]" style={{ color: P3R.ink }}>{pick.roman} · {pick.name}</div>
                <div className="mx-auto mt-0.5 max-w-[32ch] p3r-clamp-2 text-[12.5px] leading-relaxed" style={{ color: P3R.inkSoft }}>{pickTaken ? '这张已经有人持有了，滑到别的牌看看。' : pick.upright.meaning}</div>
                <p className="mt-1 text-[10.5px] font-bold" style={{ color: P3R.grey }}>左右滑动挑一张 · 同一组织里每张只能一个人</p>
              </div>
            </div>
          )}
          {step === 'codename' && (
            <>
              <div className="flex items-center gap-3">
                {tarotId && <Arcana id={tarotId} width={60} tag={false} />}
                <div className="min-w-0 font-heavy text-[18px]" style={{ color: P3R.ink }}>{TAROT_BY_ID[tarotId]?.name ?? ''}</div>
              </div>
              <P3Field label="代号" error={error || undefined}>
                <div className="grid grid-cols-3 gap-1.5">
                  {([['nickname', '用昵称'], ['tarot', '用牌名'], ['custom', '自己写']] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className="py-2 text-[14px] font-black" style={pick3(kind === k)}>{l}</button>)}
                </div>
                {kind === 'custom' && <div className="mt-2"><P3Input aria-label="自己写代号" value={custom} placeholder={`最多 ${ORG_CODENAME_MAX} 个字`} onChange={(e) => setCustom([...e.target.value].slice(0, ORG_CODENAME_MAX).join(''))} /></div>}
              </P3Field>
              <div className="text-[12.5px] font-bold" style={{ color: P3R.grey }}>名册上显示为：<span style={{ color: P3R.ink }}>{preview}</span></div>
            </>
          )}
        </div>
      </P3Sheet>
      <Welcome open={open && step === 'welcome'} orgName={orgName} onClose={() => { onDone(orgName); onClose(); }} low={low} />
    </>
  );
}

/** 入队欢迎：全屏玫红斜带对冲切入 + WELCOME 斜签 + 大字逐行 + 樱瓣迸散；4.2s 自动收 / 点击继续 */
function Welcome({ open, orgName, onClose, low }: { open: boolean; orgName: string; onClose: () => void; low: boolean }) {
  const [burst, setBurst] = useState(false);
  useEffect(() => { if (!open) return; const b = window.setTimeout(() => setBurst(true), low ? 0 : 520); const t = window.setTimeout(onClose, 4200); return () => { clearTimeout(t); clearTimeout(b); }; }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const line = (d: number) => ({ initial: low ? { opacity: 0 } : { opacity: 0, x: -30 }, animate: { opacity: 1, x: 0 }, transition: { delay: low ? 0 : d, duration: 0.32, ease: [0.22, 0.9, 0.3, 1] as const } });
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.button key="w" type="button" onClick={onClose} aria-label="点一下继续" className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden" style={{ zIndex: 'var(--p3r-z-celebration)' as unknown as number, background: 'var(--p3r-bg)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div aria-hidden className="absolute -inset-x-20 top-[34%] h-20" style={{ background: 'var(--pk-band)', rotate: -12 }} initial={low ? { opacity: 0 } : { x: '-110%' }} animate={low ? { opacity: 1 } : { x: '0%' }} transition={{ duration: 0.4, ease: [0.2, 0.9, 0.1, 1] }} />
            <motion.div aria-hidden className="absolute -inset-x-20 top-[60%] h-3" style={{ background: P3R.blue, rotate: -12 }} initial={low ? { opacity: 0 } : { x: '110%' }} animate={low ? { opacity: 1 } : { x: '0%' }} transition={{ duration: 0.4, delay: 0.1, ease: [0.2, 0.9, 0.1, 1] }} />
            <div className="relative flex flex-col items-center gap-3 px-6">
              <motion.span {...line(0.25)} className="inline-block px-3 py-1 font-cond text-[14px] tracking-[0.3em]" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(6) }}>WELCOME TO THE HIDEOUT</motion.span>
              <motion.div {...line(0.37)} className="max-w-[90vw] text-center font-heavy text-[clamp(26px,7.5vw,46px)] leading-tight" style={{ color: P3R.ink }}>今天起，你是「{orgName}」的一员</motion.div>
              <motion.span {...line(0.49)} className="inline-block px-3 py-0.5 text-[14px] font-black" style={{ background: P3R.panel, color: P3R.blueDeep, clipPath: slantClip(6) }}>名册上多了一张牌</motion.span>
            </div>
            <PetalBurst active={burst} count={18} onDone={() => setBurst(false)} />
            <div className="absolute bottom-10 text-[12px] font-bold" style={{ color: P3R.grey }}>点一下继续</div>
          </motion.button>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export default function OrgOnboardingSheet({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const s = params?.get('step') ?? 'rules';
  const step: Step = s === 'create' ? 'form' : s === 'join' ? 'code' : (['rules', 'form', 'code', 'preview', 'card', 'codename', 'welcome'].includes(s) ? s : 'rules') as Step;
  const mode: OnbMode = (params?.get('mode') as OnbMode) ?? (s === 'join' || s === 'preview' ? 'join' : 'create');
  return <OrgOnboarding mode={mode} open={open} onClose={onClose} initialStep={step} err={(params?.get('err') as 'bad') ?? undefined} onDone={(n) => toast.success(mode === 'card' ? '成员牌改好了' : `已加入「${n}」`)} />;
}
