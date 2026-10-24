/**
 * WelcomeModal.p3r —— 欢迎引导（真实 src/components/WelcomeModal.tsx，本身即 P3R 版式：浅底水面场 + 斜切平行四边形 + 巨名排版 + 左上信息卡 + 底部状态条）。
 * 状态机 1:1：welcome → name → preset →（预设）customize →（自定义直达）done → guide → blessing → 建档；welcome →「我已经是客人了」→ import。
 *   前进条件与按钮一致：名字非空 / 选了风格（自定义要五个都填）/ 五个名字都填 / 选了赐福属性；键盘 Enter 前进、Esc 后退、↑↓ 选风格 / 赐福（输入框内不抢）。
 * 换屏转场（真实 navigate 时序）：背景浮牌（本屏的大阿卡纳，.26 透明）滑到屏心 .7s → .62s 起翻面 .46s 成下一屏的牌 → 830ms 换页 → 960ms 滑回下一屏位置并淡出 → 1340ms 收尾（期间锁输入）。
 * 收尾转场 startFinish：玫红幕布从屏心圆形铺满 .76s + 牌翻成「世界」+ MASKARIA 巨词 .76s 滑入 / 1.06s 滑出 → 1.45s 才真正建档；
 *   成功 → 引导整体卸载（demo：关闭 + toast）；失败 → 收幕、露出「建档没能完成：…」，按钮变「再试一次」。
 * 粉版：真实 /tarot/p3/*.webp（蓝套大阿卡纳）→ 粉套程序卡面 TarotFace（罗马数字 + 牌名）；水面底 → 粉舞台底图。
 * 演示：?step=welcome|name|preset|customize|done|guide|blessing|import 直达；?fail=1 第一次建档失败；?importFail=1 导入失败；?cloud=0 隐藏登录入口；?custom=1 以「自定义」进入。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { AttributeId } from '@real/types';
import type { OverlayProps } from '@pink/registry/types';
import { P3Button, P3R, SectionMark, TitlePeriod, TarotFace, slantClip, useScrollLock, showToast, P3Empty } from '@pink/kit';
import { PinkStage } from '@pink/fx';
import { useBoldness } from '@pink/lib/prefs';
import { ATTR_IDS, MOCK_USER_NAME, MOON_NAMES, SEVEN_THINGS, WELCOME_ATTR_PLACEHOLDERS, WELCOME_PRESETS } from '@pink/mock/pkg1';
import { OverlayByKey } from '@pink/screens/pkg1/DashboardParts';
import { useAppStore } from '@/store';
import { importImagesBundle, isImagesBundleJson } from '@/utils/activityImages';

type Step = 'welcome' | 'name' | 'preset' | 'customize' | 'done' | 'guide' | 'blessing' | 'import';
const STEP_ORDER: Step[] = ['welcome', 'name', 'preset', 'customize', 'done', 'guide', 'blessing'];
const ORDINAL: Record<AttributeId, string> = { knowledge: '01', guts: '02', dexterity: '03', kindness: '04', charm: '05' };
const CARD: Record<string, { roman: string; name: string; en: string }> = {
  welcome: { roman: '0', name: '愚者', en: 'THE FOOL' }, name: { roman: 'I', name: '魔术师', en: 'MAGICIAN' }, preset: { roman: 'X', name: '命运之轮', en: 'FORTUNE' },
  customize: { roman: 'XIV', name: '节制', en: 'TEMPERANCE' }, done: { roman: 'XIX', name: '太阳', en: 'THE SUN' }, guide: { roman: 'V', name: '教皇', en: 'HIEROPHANT' },
  blessing: { roman: 'III', name: '女帝', en: 'EMPRESS' }, world: { roman: 'XXI', name: '世界', en: 'THE WORLD' }, import: { roman: '0', name: '愚者', en: 'THE FOOL' },
};
const FLOATER_POS: Record<string, { pos: CSSProperties; rot: number }> = {
  welcome: { pos: { right: '2%', top: '11%' }, rot: -9 }, name: { pos: { left: '1%', bottom: '7%' }, rot: 7 }, preset: { pos: { right: '3%', bottom: '5%' }, rot: -6 },
  customize: { pos: { left: '2%', top: '9%' }, rot: 8 }, done: { pos: { right: '2%', top: '13%' }, rot: -11 }, guide: { pos: { left: '1%', bottom: '2%' }, rot: 5 }, blessing: { pos: { right: '1%', top: '7%' }, rot: -7 },
};
const HERO_W = 260, HERO_H = 416;
type Pose = { x: number; y: number; s: number };
const poseOf = (slug: string): Pose | null => {
  const el = document.querySelector<HTMLElement>(`[data-floater="${slug}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2 - window.innerWidth / 2), y: Math.round(r.top + r.height / 2 - window.innerHeight / 2), s: r.height ? +(r.height / HERO_H).toFixed(3) : 1 };
};
const EMPTY: Record<AttributeId, string> = { knowledge: '', guts: '', dexterity: '', kindness: '', charm: '' };
const isShadowTime = (d = new Date()) => { const h = d.getHours(); return [5, 6, 0].includes(d.getDay()) && (h >= 20 || h < 7); };
const moonPhase = (now: Date) => { const doy = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000); return ((((doy - 5) % 29.53) + 29.53) % 29.53) / 29.53; };
const moonPath = (phase: number) => {
  const r = 40, cx = 50, cy = 50;
  if (phase <= 0.02 || phase >= 0.98) return '';
  const lit = phase <= 0.5; const k = lit ? phase * 2 : (1 - phase) * 2; const rx = Math.abs(1 - 2 * k) * r;
  const sweep = (lit ? phase < 0.25 : phase > 0.75) ? 1 : 0;
  return `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${rx.toFixed(2)} ${r} 0 0 ${sweep} ${cx} ${cy - r} Z`;
};

const Floaters = ({ step, hidden }: { step: string; hidden: string[] }) => {
  const anim = useBoldness();
  return (
    <>
      {Object.keys(FLOATER_POS).map((slug, i) => {
        const isOut = hidden.includes(slug);
        const opacity = isOut ? 0 : slug === step ? 0.26 : 0;
        const { pos, rot } = FLOATER_POS[slug];
        return (
          <motion.div key={slug} data-floater={slug} aria-hidden className="pointer-events-none absolute select-none" style={{ height: 'clamp(150px,30vh,330px)', aspectRatio: '260 / 416', ...pos }}
            initial={false} animate={anim ? { y: [0, -14, 0], rotate: [rot, rot + 1.6, rot], opacity } : { opacity, rotate: rot }}
            transition={anim ? { y: { duration: 9, repeat: Infinity, ease: 'easeInOut', delay: i * -1.1 }, rotate: { duration: 9, repeat: Infinity, ease: 'easeInOut', delay: i * -1.1 }, opacity: { duration: isOut ? 0 : 0.42 } } : { opacity: { duration: isOut ? 0 : 0.42 } }}>
            <BigCard slug={slug} fill />
          </motion.div>
        );
      })}
    </>
  );
};
const BigCard = ({ slug, fill }: { slug: string; fill?: boolean }) => {
  const c = CARD[slug];
  return <div className={fill ? 'h-full w-full [&>span]:!h-full [&>span]:!w-full' : ''}><TarotFace name={c.name} roman={c.roman} en={c.en} width={fill ? 160 : HERO_W} /></div>;
};

const ActBar = ({ onBack, backLabel = '返回', primaryLabel, primaryTone = 'primary', disabled, onPrimary }: { onBack?: () => void; backLabel?: string; primaryLabel: ReactNode; primaryTone?: 'primary' | 'soft'; disabled?: boolean; onPrimary: () => void }) => (
  <div className="mt-[clamp(16px,3vh,34px)] flex flex-wrap items-center gap-3">
    {onBack && <P3Button tone="ghost" onClick={onBack} className="min-w-[104px]">{backLabel}</P3Button>}
    <P3Button tone={primaryTone} onClick={onPrimary} disabled={disabled} corner>{primaryLabel}</P3Button>
  </div>
);
const field: CSSProperties = { background: 'var(--p3r-panel-glass)', color: P3R.ink, clipPath: slantClip(10) };
const ring = (strong?: boolean): CSSProperties => ({ boxShadow: `inset 0 0 0 2px ${strong ? P3R.blue : 'rgb(var(--p3r-blue-rgb) / 0.22)'}` });

export default function WelcomeModal({ open, onClose, params }: OverlayProps) {
  const anim = useBoldness();
  useScrollLock(open);
  const init = (params?.get('step') as Step) || 'welcome';
  const cloud = params?.get('cloud') !== '0';
  const startCustom = params?.get('custom') === '1';
  const later = ['preset', 'customize', 'done', 'guide', 'blessing'].includes(init);
  const [step, setStep] = useState<Step>([...STEP_ORDER, 'import'].includes(init) ? init : 'welcome');
  const [name, setName] = useState(later ? MOCK_USER_NAME : '');
  const [preset, setPreset] = useState<number | null>(['customize', 'done', 'guide', 'blessing'].includes(init) ? (startCustom ? 2 : 0) : null);
  const [names, setNames] = useState<Record<AttributeId, string>>(['customize', 'done', 'guide', 'blessing'].includes(init) && !startCustom ? { ...WELCOME_PRESETS[0].names } : { ...EMPTY });
  const [blessing, setBlessing] = useState<AttributeId | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const failOnce = useRef(params?.get('fail') === '1');
  const importFail = useRef(params?.get('importFail') === '1');
  const busy = useRef(false);
  const [hero, setHero] = useState<{ from: string; to: string; p0: Pose; p1: Pose } | null>(null);
  const [heroPhase, setHeroPhase] = useState<'out' | 'back'>('out');
  const [hidden, setHidden] = useState<string[]>([]);
  const [finish, setFinish] = useState<{ p0: Pose } | null>(null);
  const [finishWord, setFinishWord] = useState<'in' | 'out'>('in');
  const [loginOpen, setLoginOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);

  const isCustom = preset === 2;
  const canName = name.trim().length > 0;
  const canPreset = preset !== null && (!isCustom || ATTR_IDS.every((id) => names[id].trim().length > 0));
  const canCustomize = ATTR_IDS.every((id) => names[id].trim().length > 0);
  const stepNo = step === 'import' ? 0 : STEP_ORDER.indexOf(step) + 1;

  const choosePreset = (i: number) => { setPreset(i); if (i !== 2) setNames({ ...WELCOME_PRESETS[i].names }); else setNames((p) => ({ ...p })); };

  const go = (to: Step, after?: () => void) => {
    if (busy.current || to === step) return;
    const p0 = poseOf(step), p1 = poseOf(to);
    if (!anim || !p0 || !p1) { setStep(to); after?.(); return; }
    busy.current = true;
    setHero({ from: step, to, p0, p1 }); setHeroPhase('out'); setHidden([step]); after?.();
  };
  useEffect(() => {
    if (!hero) return;
    const t1 = setTimeout(() => { setStep(hero.to as Step); setHidden([hero.from, hero.to]); }, 830);
    const t2 = setTimeout(() => { setHeroPhase('back'); setHidden([hero.from]); }, 960);
    const t3 = setTimeout(() => { setHero(null); setHeroPhase('out'); setHidden([]); busy.current = false; }, 1340);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [hero]);

  const submit = async () => {
    setSubmitting(true); setSubmitError(null);
    try {
      if (failOnce.current) {
        failOnce.current = false;
        setSubmitError('IndexedDB 写入失败：QuotaExceededError（存储空间不足）'); setSubmitting(false);
        setFinish(null); setHidden([]); busy.current = false; return;
      }
      await useAppStore.getState().createUser(name.trim(), names, blessing ?? undefined);
      setSubmitting(false); busy.current = false; setFinish(null);
      onClose(); showToast(`建档完成，欢迎来到面具庭园，${name || '客人'}`, { kind: 'success' });
    } catch (error) {
      setSubmitting(false); busy.current = false; setFinish(null); setHidden([]);
      setSubmitError(error instanceof Error ? error.message : '建档失败，请重试');
    }
  };
  const startFinish = () => {
    if (busy.current || submitting || !blessing) return;
    busy.current = true;
    if (!anim) { submit(); return; }
    setFinish({ p0: poseOf('blessing') ?? { x: 0, y: 0, s: 1 } }); setHidden(['blessing']); setFinishWord('in');
    window.setTimeout(() => setFinishWord('out'), 1060);
    window.setTimeout(submit, 1450);
  };
  const goNext = () => {
    if (step === 'welcome') go('name');
    else if (step === 'name') { if (canName) go('preset'); }
    else if (step === 'preset') { if (canPreset) go(isCustom ? 'done' : 'customize'); }
    else if (step === 'customize') { if (canCustomize) go('done'); }
    else if (step === 'done') go('guide');
    else if (step === 'guide') go('blessing');
    else if (step === 'blessing') startFinish();
  };
  const prevStep = () => {
    if (step === 'name') go('welcome');
    else if (step === 'preset') go('name');
    else if (step === 'customize') go('preset');
    else if (step === 'done') go(isCustom ? 'preset' : 'customize');
    else if (step === 'guide') go('done');
    else if (step === 'blessing') go('guide');
    else if (step === 'import') { setImportJson(''); setImportError(null); go('welcome'); }
  };
  useEffect(() => {
    if (!open || loginOpen) return;
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === 'Escape') { e.preventDefault(); prevStep(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const down = e.key === 'ArrowDown';
        if (step === 'preset') { e.preventDefault(); const c = preset ?? -1; choosePreset(down ? Math.min(c + 1, 2) : Math.max(c - 1, 0)); }
        else if (step === 'blessing') { e.preventDefault(); const c = blessing ? ATTR_IDS.indexOf(blessing) : -1; setBlessing(ATTR_IDS[down ? Math.min(c + 1, 4) : Math.max(c - 1, 0)]); }
      } else if (e.key === 'Enter') { e.preventDefault(); goNext(); }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.json') && f.type !== 'application/json') { setImportError('请选择 JSON 格式的备份文件'); return; }
    setImportError(null);
    const r = new FileReader(); r.onload = (e) => { const tx = e.target?.result as string; if (tx) setImportJson(tx); }; r.readAsText(f, 'utf-8');
  };
  const doImport = () => {
    if (!importJson.trim()) return;
    setImportLoading(true); setImportError(null);
    void (async () => {
      try {
        if (importFail.current || !importJson.trim().startsWith('{')) throw new Error('导入失败，请检查备份文件格式');
        if (isImagesBundleJson(importJson)) await importImagesBundle(importJson);
        else await useAppStore.getState().importData(importJson);
        importFail.current = false;
        setImportLoading(false); onClose(); showToast('备份已导入，欢迎回来', { kind: 'success' });
      } catch (error) {
        importFail.current = false;
        setImportError(error instanceof Error ? error.message : '导入失败，请检查备份文件');
        setImportLoading(false);
      }
    })();
  };

  if (!open) return null;
  const view = (k: string) => ({ key: k, initial: anim ? { opacity: 0, y: 18 } : false as const, animate: { opacity: 1, y: 0 }, exit: anim ? { opacity: 0, y: -14 } : { opacity: 0 }, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } });
  const VIEW = 'relative z-10 flex min-h-[100dvh] items-center justify-center px-[clamp(18px,3.4vw,64px)] py-16';
  const WRAP = 'w-full max-w-[1180px]';
  const phase = moonPhase(now);
  const shadow = isShadowTime(now);
  const stagger = { initial: anim ? 'h' : false as const, animate: 's', variants: { h: {}, s: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } } } };
  const item = { variants: { h: { opacity: 0, x: -20 }, s: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 32 } } } };

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: 'var(--p3r-z-sheet)' as unknown as number, background: P3R.bg }} role="dialog" aria-modal="true" aria-label="欢迎来到面具庭园">
      <PinkStage variant="page" petals={4} />
      <svg aria-hidden className="pointer-events-none fixed inset-0 z-0 h-full w-full" style={{ color: 'rgb(var(--p3r-blue-rgb) / 0.12)' }} preserveAspectRatio="none">
        <defs><pattern id="pk1-guide-lines" width="46" height="46" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)"><line x1="0" y1="0" x2="0" y2="46" stroke="rgb(var(--p3r-blue-rgb) / 0.12)" strokeWidth="1.5" /></pattern></defs>
        <rect width="100%" height="100%" fill="url(#pk1-guide-lines)" />
      </svg>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"><Floaters step={step} hidden={hidden} /></div>

      {hero && (
        <motion.div aria-hidden className="pointer-events-none fixed left-1/2 top-1/2 z-[3]" style={{ width: HERO_W, height: HERO_H, marginLeft: -HERO_W / 2, marginTop: -HERO_H / 2, perspective: 1200 }}
          initial={{ x: hero.p0.x, y: hero.p0.y, scale: hero.p0.s, opacity: 1 }}
          animate={heroPhase === 'back' ? { x: hero.p1.x, y: hero.p1.y, scale: hero.p1.s, opacity: 0 } : { x: 0, y: 0, scale: 1, opacity: 1 }}
          transition={heroPhase === 'back' ? { duration: 0.38, ease: [0.16, 1, 0.3, 1] } : { duration: 0.7, ease: [0.34, 1.38, 0.5, 1] }}>
          <motion.div className="relative h-full w-full" style={{ transformStyle: 'preserve-3d' }} initial={{ rotateY: 0 }} animate={{ rotateY: 180 }} transition={{ delay: 0.62, duration: 0.46, ease: [0.65, 0, 0.2, 1] }}>
            <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}><BigCard slug={hero.from} /></div>
            <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}><BigCard slug={hero.to} /></div>
          </motion.div>
        </motion.div>
      )}

      {finish && (
        <>
          <motion.div aria-hidden className="pointer-events-none fixed inset-0 z-[60]" style={{ background: P3R.blue }} initial={{ clipPath: 'circle(0px at 50% 50%)' }} animate={{ clipPath: 'circle(170vmax at 50% 50%)' }} transition={{ duration: 0.76, ease: [0.65, 0, 0.2, 1] }} />
          <motion.div aria-hidden className="pointer-events-none fixed left-1/2 top-1/2 z-[65]" style={{ width: HERO_W, height: HERO_H, marginLeft: -HERO_W / 2, marginTop: -HERO_H / 2, perspective: 1200 }}
            initial={{ x: finish.p0.x, y: finish.p0.y, scale: finish.p0.s }} animate={{ x: 0, y: 0, scale: 1 }} transition={{ duration: 0.7, ease: [0.34, 1.38, 0.5, 1] }}>
            <motion.div className="relative h-full w-full" style={{ transformStyle: 'preserve-3d' }} initial={{ rotateY: 0 }} animate={{ rotateY: 180 }} transition={{ delay: 0.62, duration: 0.46, ease: [0.65, 0, 0.2, 1] }}>
              <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}><BigCard slug="blessing" /></div>
              <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}><BigCard slug="world" /></div>
            </motion.div>
          </motion.div>
          <motion.span aria-hidden className="pointer-events-none fixed left-0 top-1/2 z-[70] whitespace-nowrap font-cond text-white" style={{ fontSize: 'clamp(110px,28vw,430px)', lineHeight: 0.78, letterSpacing: '-0.05em' }}
            initial={{ x: '-42%', y: '-50%', opacity: 0 }} animate={finishWord === 'out' ? { x: '34%', y: '-50%', opacity: 0 } : { x: '-4%', y: '-50%', opacity: 1 }}
            transition={finishWord === 'out' ? { duration: 0.3, ease: [0.16, 1, 0.3, 1] } : { duration: 0.3, delay: 0.76, ease: [0.16, 1, 0.3, 1] }}>MASKARIA</motion.span>
        </>
      )}

      {/* 左上信息卡 */}
      <div className="pointer-events-none fixed left-0 right-0 top-0 z-20 flex items-start" style={{ padding: 'clamp(14px,2vh,28px) clamp(18px,3.4vw,64px)' }}>
        <div className="flex items-center gap-2">
          <span className="px-2 py-[3px] text-[12px] font-black" style={{ background: P3R.blue, color: 'var(--p3r-on-blue)', clipPath: slantClip(5) }}>MASKARIA</span>
          <span className="text-[12px] font-black tracking-wide" style={{ color: P3R.inkSoft }}>第 {stepNo} 步 · 共 {STEP_ORDER.length} 步</span>
        </div>
      </div>
      {/* 底部状态条：月相 / 时钟 / 影时间 */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20">
        <div className="flex items-center justify-between gap-3 py-2.5 text-[13px] font-black" style={{ paddingLeft: 'clamp(18px,3.4vw,64px)', paddingRight: 'clamp(18px,3.4vw,64px)', background: 'var(--p3r-panel-glass)', color: P3R.ink }}>
          <span className="flex min-w-0 items-center gap-2">
            <svg viewBox="0 0 100 100" aria-hidden className="h-[30px] w-[30px] shrink-0"><circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="7" opacity=".5" /><path d={moonPath(phase)} fill="currentColor" /></svg>
            <b className="truncate">{MOON_NAMES[Math.round(phase * 8) % 8]} · {Math.round(phase * 100)}%</b>
          </span>
          <span className="whitespace-nowrap font-cond text-[15px]">{String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}</span>
          <span className="whitespace-nowrap" style={{ color: shadow ? 'var(--p3r-coral-ink)' : P3R.inkSoft }}>影时间 · {shadow ? '进行中' : '今夜降临'}</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <motion.section {...view('welcome')} className={VIEW}>
            <div className="w-full">
              <h1 className="relative">
                <motion.span className="block font-cond leading-[0.82] tracking-[-0.04em]" style={{ fontSize: 'clamp(42px,12.5vw,225px)', color: P3R.ink }}
                  initial={anim ? { clipPath: 'inset(-10% 102% -10% -2%)' } : false} animate={{ clipPath: 'inset(-10% -4% -10% -2%)' }} transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 0.9, 0.3, 1] }}>MASKARIA</motion.span>
                <span className="mt-[-0.06em] flex items-center">
                  <motion.span className="inline-block font-heavy leading-none" style={{ fontSize: 'calc(clamp(42px,12.5vw,225px) * 0.4)', color: 'var(--p3r-on-blue)', background: P3R.blue, padding: '.06em .44em .12em .12em', clipPath: 'polygon(0 0, 100% 0, calc(100% - .30em) 100%, 0 100%)' }}
                    initial={anim ? { x: -16, opacity: 0 } : false} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.45 }}>面具庭园</motion.span>
                  <span className="inline-block" style={{ marginLeft: 14 }}><TitlePeriod /></span>
                </span>
              </h1>
              <p className="mt-8 max-w-[660px] text-[clamp(14px,1.05vw,17px)] font-black leading-[2]" style={{ color: P3R.inkSoft }}>
                <b style={{ color: P3R.ink }}>每一次行动，都化作灵魂成长的印记。</b><br />
                写下今天做了什么，它会变成你的五项人格指数。记录、任务、记账、同伴，与影时间的战斗，都从这里开始。
              </p>
              <ActBar primaryLabel="开始设定" onPrimary={() => go('name')} />
              <button type="button" onClick={() => go('import')} className="mt-6 block text-[13px] font-black underline-offset-4 hover:underline" style={{ color: P3R.grey }}>我已经是客人了</button>
            </div>
          </motion.section>
        )}

        {step === 'name' && (
          <motion.section {...view('name')} className={VIEW}>
            <motion.div className={WRAP} {...stagger}>
              <motion.div {...item}><SectionMark title="你叫什么名字" meta={<span className="text-[12px] font-black" style={{ color: P3R.grey }}>01 / 07</span>} /></motion.div>
              <motion.p {...item} className="mt-5 text-[14px] font-black leading-relaxed" style={{ color: P3R.inkSoft }}>这将是你在面具庭园里的称呼。真名、笔名、代号都行。</motion.p>
              <motion.div {...item} className="mt-7">
                <label htmlFor="pk1-guide-name" className="sr-only">你的昵称</label>
                <input id="pk1-guide-name" type="text" value={name} maxLength={16} autoFocus onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && canName) go('preset'); }}
                  placeholder="写下你的称呼" className="w-full max-w-[560px] px-5 py-4 text-[clamp(20px,2.2vw,30px)] font-black outline-none placeholder:text-[color:var(--p3r-ph)]" style={{ ...field, ...ring(true) }} />
                <p className="mt-3 text-[12px] font-black" style={{ color: P3R.grey }}>按 Enter 直接进入下一步，之后随时能在设置里改。</p>
              </motion.div>
              <motion.div {...item}><ActBar onBack={() => go('welcome')} primaryLabel="接入" primaryTone="soft" disabled={!canName} onPrimary={() => go('preset')} /></motion.div>
            </motion.div>
          </motion.section>
        )}

        {step === 'preset' && (
          <motion.section {...view('preset')} className={VIEW}>
            <motion.div className={WRAP} {...stagger}>
              <motion.div {...item}><SectionMark title="选择成长风格" meta={<span className="text-[12px] font-black" style={{ color: P3R.grey }}>02 / 07</span>} /></motion.div>
              <motion.p {...item} className="mt-5 text-[14px] font-black leading-relaxed" style={{ color: P3R.inkSoft }}>它会预置你五项属性的名称。之后在设置里随时能改。</motion.p>
              <div className="mt-7 flex max-w-[880px] flex-col gap-2.5" role="group" aria-label="成长风格">
                {WELCOME_PRESETS.map((p, i) => {
                  const sel = preset === i;
                  return (
                    <motion.button {...item} key={p.label} type="button" aria-pressed={sel} onClick={() => choosePreset(i)} className="relative flex items-center gap-4 px-5 py-4 text-left"
                      style={{ clipPath: slantClip(10), background: sel ? P3R.blue : 'var(--p3r-panel-glass)', color: sel ? 'var(--p3r-on-blue)' : P3R.ink, ...(sel ? {} : ring()) }}>
                      <span aria-hidden className="h-[18px] w-[13px] shrink-0" style={{ background: sel ? 'var(--p3r-on-blue)' : P3R.blue, clipPath: 'polygon(32% 0, 100% 0, 68% 100%, 0 100%)' }} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[19px] font-black leading-none">{p.label}</span>
                        <span className="mt-1.5 block text-[12px] font-black leading-relaxed" style={{ opacity: sel ? 0.88 : 1, color: sel ? undefined : P3R.grey }}>{p.desc}</span>
                      </span>
                    </motion.button>
                  );
                })}
              </div>
              {isCustom && (
                <motion.div className="mt-4 grid max-w-[880px] grid-cols-1 gap-2 sm:grid-cols-2" initial={anim ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }}>
                  {ATTR_IDS.map((id, i) => (
                    <input key={id} aria-label={`第 ${i + 1} 项属性名称`} value={names[id]} maxLength={8} placeholder={WELCOME_ATTR_PLACEHOLDERS[id]} onChange={(e) => setNames((p) => ({ ...p, [id]: e.target.value }))}
                      className="w-full px-4 py-2.5 text-[16px] font-black outline-none placeholder:text-[color:var(--p3r-ph)]" style={{ ...field, clipPath: slantClip(8), ...ring() }} />
                  ))}
                </motion.div>
              )}
              <motion.div {...item}><ActBar onBack={() => go('name')} primaryLabel="记录" primaryTone="soft" disabled={!canPreset} onPrimary={() => go(isCustom ? 'done' : 'customize')} /></motion.div>
            </motion.div>
          </motion.section>
        )}

        {step === 'customize' && (
          <motion.section {...view('customize')} className={VIEW}>
            <motion.div className={WRAP} {...stagger}>
              <motion.div {...item} className="flex items-end gap-5">
                <h2 className="font-heavy leading-[1.1]" style={{ fontSize: 'clamp(26px,3.4vw,44px)', color: P3R.ink }}>逐个改属性名<span className="ml-2 inline-block align-[0.35em]"><TitlePeriod /></span></h2>
                <span className="font-cond leading-none" style={{ fontSize: 'clamp(44px,6vw,86px)', color: P3R.blue }}>5</span>
              </motion.div>
              <motion.p {...item} className="mt-5 text-[14px] font-black leading-relaxed" style={{ color: P3R.inkSoft }}>下面是预设的名，都能换成你更顺口的说法。两个字最好看。</motion.p>
              <div className="mt-7 flex max-w-[760px] flex-col gap-2">
                {ATTR_IDS.map((id, i) => (
                  <motion.div {...item} key={id} className="flex items-center gap-3">
                    <span className="w-7 shrink-0 font-cond text-[15px]" style={{ color: P3R.roseInk }}>{ORDINAL[id]}</span>
                    <label htmlFor={`pk1-attr-${id}`} className="sr-only">第 {i + 1} 项属性名称</label>
                    <input id={`pk1-attr-${id}`} type="text" value={names[id]} maxLength={8} placeholder={WELCOME_ATTR_PLACEHOLDERS[id]} onChange={(e) => setNames((p) => ({ ...p, [id]: e.target.value }))}
                      className="w-full min-w-0 max-w-[420px] px-4 py-3 text-[19px] font-black outline-none placeholder:text-[color:var(--p3r-ph)]" style={{ ...field, clipPath: slantClip(8), ...ring() }} />
                  </motion.div>
                ))}
              </div>
              <motion.div {...item}><ActBar onBack={() => go('preset')} primaryLabel="归档" disabled={!canCustomize} onPrimary={() => go('done')} /></motion.div>
            </motion.div>
          </motion.section>
        )}

        {step === 'done' && (
          <motion.section {...view('done')} className={VIEW}>
            <motion.div className={WRAP} {...stagger}>
              <motion.h2 {...item} className="font-heavy leading-tight" style={{ fontSize: 'clamp(30px,4.2vw,56px)', color: P3R.ink }}>你好，{name || '客人'}<span className="ml-2 inline-block align-[0.35em]"><TitlePeriod /></span></motion.h2>
              <motion.p {...item} className="mt-5 max-w-[660px] text-[14px] font-black leading-relaxed" style={{ color: P3R.inkSoft }}>五项属性已经就位。所有技能说明与成就文案，会跟着属性名一起变。</motion.p>
              <div className="mt-8 flex max-w-[820px] flex-wrap gap-2.5">
                {ATTR_IDS.map((id) => (
                  <motion.div {...item} key={id} className="flex min-w-[96px] flex-1 flex-col items-center gap-2 px-3 py-5" style={{ background: 'var(--p3r-panel-glass)', clipPath: slantClip(8) }}>
                    <span className="font-cond text-[32px] leading-none" style={{ color: P3R.blue }}>1</span>
                    <span className="text-[13px] font-black" style={{ color: P3R.ink }}>{names[id] || '未命名'}</span>
                  </motion.div>
                ))}
              </div>
              <motion.div {...item}><ActBar onBack={() => setStep(isCustom ? 'preset' : 'customize')} primaryLabel="继续" onPrimary={() => go('guide')} /></motion.div>
            </motion.div>
          </motion.section>
        )}

        {step === 'guide' && (
          <motion.section {...view('guide')} className={VIEW}>
            <motion.div className={WRAP} {...stagger}>
              <motion.div {...item} className="flex items-end gap-5">
                <h2 className="font-heavy leading-[1.1]" style={{ fontSize: 'clamp(26px,3.4vw,44px)', color: P3R.ink }}>七件事，看完就能开始<span className="ml-2 inline-block align-[0.35em]"><TitlePeriod /></span></h2>
                <span className="font-cond leading-none" style={{ fontSize: 'clamp(44px,6vw,86px)', color: P3R.blue }}>7</span>
              </motion.div>
              <motion.p {...item} className="mt-5 text-[14px] font-black leading-relaxed" style={{ color: P3R.inkSoft }}>{name || '客人'}，七件事，看完就能开始。</motion.p>
              <div className="mt-7 grid max-w-[960px] grid-cols-1 gap-x-10 gap-y-3.5 md:grid-cols-2">
                {SEVEN_THINGS.map((t, i) => (
                  <motion.div {...item} key={t.title} className="flex items-baseline gap-3">
                    <span className="shrink-0 font-cond text-[14px]" style={{ color: P3R.roseInk }}>{String(i + 1).padStart(2, '0')}</span>
                    <p className="min-w-0 text-[13px] font-black leading-relaxed" style={{ color: P3R.inkSoft }}>
                      <b className="mr-2 text-[16px]" style={{ color: P3R.ink }}>{t.title}</b>{t.desc}
                      {t.title === '影时间' && <span className="ml-1 whitespace-nowrap text-[12px]" style={{ color: shadow ? 'var(--p3r-coral-ink)' : P3R.lilacInk }}>（{MOON_NAMES[Math.round(phase * 8) % 8]} · {shadow ? '进行中' : '今夜降临'}）</span>}
                    </p>
                  </motion.div>
                ))}
              </div>
              <motion.div {...item}><P3Empty className="mt-8 max-w-[560px]" /></motion.div>
              <motion.div {...item}><ActBar onBack={() => go('done')} primaryLabel="继续" onPrimary={() => go('blessing')} /></motion.div>
            </motion.div>
          </motion.section>
        )}

        {step === 'blessing' && (
          <motion.section {...view('blessing')} className={VIEW}>
            <motion.div className={WRAP} {...stagger}>
              <motion.div {...item}><SectionMark title="馆长的赐福" meta={<span className="text-[12px] font-black" style={{ color: P3R.grey }}>07 / 07</span>} /></motion.div>
              <motion.p {...item} className="mt-5 max-w-[720px] text-[14px] font-black leading-relaxed" style={{ color: P3R.inkSoft }}>既然你踏进了面具庭园，说明不是等闲之辈。初次来访有一份礼遇，挑一项你最擅长的，往后每次加点都额外 +1。</motion.p>
              <div className="mt-7 flex max-w-[880px] flex-wrap gap-2.5" role="radiogroup" aria-label="赐福属性">
                {ATTR_IDS.map((id) => {
                  const sel = blessing === id;
                  return (
                    <motion.button {...item} key={id} type="button" role="radio" aria-checked={sel} onClick={() => setBlessing(id)} className="px-7 py-3.5 text-[18px] font-black"
                      style={{ clipPath: slantClip(10), background: sel ? P3R.magenta : 'var(--p3r-panel-glass)', color: sel ? '#fff' : P3R.ink, ...(sel ? {} : ring(true)) }}>{names[id] || '未命名'}</motion.button>
                  );
                })}
              </div>
              {submitError && (
                <motion.div role="alert" className="mt-6 max-w-[720px] px-4 py-3 text-[12px] font-black leading-relaxed" style={{ background: 'rgb(var(--p3r-magenta-rgb) / 0.14)', color: 'var(--p3r-coral-ink)', clipPath: slantClip(8) }}
                  initial={anim ? { x: -12, opacity: 0 } : false} animate={{ x: 0, opacity: 1 }}>
                  <span className="mr-1">建档没能完成：</span><span className="break-all">{submitError}</span>
                </motion.div>
              )}
              <motion.div {...item}><ActBar onBack={() => go('guide')} primaryLabel={submitting ? '正在建档…' : submitError ? '再试一次' : '接受赐福，开始旅程'} disabled={!blessing || submitting} onPrimary={startFinish} /></motion.div>
            </motion.div>
          </motion.section>
        )}

        {step === 'import' && (
          <motion.section {...view('import')} className={VIEW}>
            <motion.div className={WRAP} {...stagger}>
              <motion.div {...item}><SectionMark title="我已经是客人了" /></motion.div>
              <motion.p {...item} className="mt-5 max-w-[660px] text-[14px] font-black leading-relaxed" style={{ color: P3R.inkSoft }}>登录云端同步，自动拉取你的所有数据；或用本地备份文件导入。</motion.p>
              <div className="mt-7 flex max-w-[660px] flex-col gap-4">
                {cloud && <motion.div {...item}><P3Button corner onClick={() => setLoginOpen(true)}>登录云端同步</P3Button></motion.div>}
                <motion.div {...item}>
                  <textarea rows={4} placeholder={'粘贴备份 JSON 文本\n（以 {"user":... 开头）'} value={importJson} onChange={(e) => { setImportJson(e.target.value); setImportError(null); }}
                    className="w-full resize-none px-4 py-3 text-[12px] font-black outline-none placeholder:text-[color:var(--p3r-ph)]" style={{ ...field, clipPath: slantClip(8), ...ring() }} />
                </motion.div>
                <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
                <motion.div {...item} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}>
                  <P3Button tone={drag ? 'primary' : 'ghost'} block onClick={() => fileRef.current?.click()}>{importJson ? '✓ 文件已加载' : drag ? '松手导入这个文件' : '选择备份文件（或拖拽至此）'}</P3Button>
                </motion.div>
                {importError && <p role="alert" className="text-[12px] font-black" style={{ color: 'var(--p3r-coral-ink)' }}>{importError}</p>}
              </div>
              <motion.div {...item}><ActBar onBack={() => { go('welcome'); setImportJson(''); setImportError(null); }} primaryLabel={importLoading ? '正在导入…' : '确认导入'} disabled={!importJson.trim() || importLoading} onPrimary={doImport} /></motion.div>
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>
      <OverlayByKey k="account-login" open={loginOpen} onClose={() => setLoginOpen(false)} params={new URLSearchParams('origin=welcome')} />
    </div>
  );
}
