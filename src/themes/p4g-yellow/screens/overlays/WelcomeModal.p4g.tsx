/**
 * WelcomeModal.p4g —— 欢迎引导（真实 src/components/WelcomeModal.tsx，七步 + 旁支导入），逻辑 1:1：
 *   welcome → name → preset → (customize | 自定义直达 done) → done → guide → blessing → 建档
 *   welcome →「我已经是客人了」→ import（登录云端同步 / 粘贴 JSON / 选择或拖拽文件 / 确认导入）
 * 前进条件与按钮一致：名字非空 / 选了风格 / 五个名字都填了 / 选了赐福属性；键盘 Enter 前进、Esc 后退。
 * 视觉：P4G 暂停菜单式 —— 黄方块舞台 + 左侧彩虹竖条 + 左上信息卡（MASKARIA · 第 N 步 · 共 7 步）+
 *   描边大标题 + S.Link 行式选项；右侧塔罗浮牌（arcana 插槽，缺失用 CSS 卡面）；底部状态条（月相 / 时钟 / 影时间）。
 * 转场：步间横推 + 跳台噪点一帧；七件事与赐福用拼贴块分层入场；建档收尾 = 黄黑条纹扫过 + 英文巨词横穿。
 * 演示：?step=<step> 直达；?fail=1 第一次建档失败（看「建档没能完成：…」+「再试一次」）；?cloud=0 隐藏登录入口。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { AttributeId } from '@real/types';
import type { OverlayProps } from '@yellow/registry/types';
import { Portal, P4Outline, P4Button, P4Input, P4Textarea, SlotImg, useScrollLock, showToast } from '@yellow/kit';
import { CollageStagger, CollageItem, NoiseLayer } from '@yellow/fx';
import { useLowMotion } from '@yellow/lib/prefs';
import { p4gAsset } from '@yellow/lib/asset';
import { cx } from '@yellow/lib/cx';
import { MoonGlyph, OverlayByKey, Sparkle4 } from '@yellow/screens/pkg1/bits';
import { ATTR_IDS, MOON_NAMES, WELCOME_ATTR_PLACEHOLDERS, WELCOME_GUIDE, WELCOME_PRESETS } from '@yellow/mock/pkg1';
import { useAppStore } from '@/store';
import { importImagesBundle, isImagesBundleJson } from '@/utils/activityImages';

type Step = 'welcome' | 'name' | 'preset' | 'customize' | 'done' | 'guide' | 'blessing' | 'import';
const STEP_ORDER: Step[] = ['welcome', 'name', 'preset', 'customize', 'done', 'guide', 'blessing'];
const ARCANA: Record<Step, { slot: string; num: string; en: string; zh: string }> = {
  welcome: { slot: 'fool', num: '0', en: 'THE FOOL', zh: '愚者' },
  name: { slot: 'magician', num: 'I', en: 'THE MAGICIAN', zh: '魔术师' },
  preset: { slot: 'wheel_of_fortune', num: 'X', en: 'FORTUNE', zh: '命运之轮' },
  customize: { slot: 'temperance', num: 'XIV', en: 'TEMPERANCE', zh: '节制' },
  done: { slot: 'sun', num: 'XIX', en: 'THE SUN', zh: '太阳' },
  guide: { slot: 'hierophant', num: 'V', en: 'HIEROPHANT', zh: '教皇' },
  blessing: { slot: 'empress', num: 'III', en: 'THE EMPRESS', zh: '女帝' },
  import: { slot: 'fool', num: '0', en: 'THE FOOL', zh: '愚者' },
};
const EMPTY_NAMES: Record<AttributeId, string> = { knowledge: '', guts: '', dexterity: '', kindness: '', charm: '' };
const isShadowTime = (d = new Date()) => { const h = d.getHours(); const wd = d.getDay(); return [5, 6, 0].includes(wd) && (h >= 20 || h < 7); };
const dayPhase = (now: Date) => { const doy = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000); return ((((doy - 5) % 29.53) + 29.53) % 29.53) / 29.53; };

/** 塔罗浮牌：插槽 arcana-<name> 存在即用，缺失用黄黑卡面 + 罗马数字 */
function ArcanaCard({ step, className }: { step: Step; className?: string }) {
  const a = ARCANA[step];
  return (
    <div className={cx('relative aspect-[3/5] overflow-hidden rounded-[6px] border-[4px] border-p4g-black bg-p4g-black shadow-[6px_6px_0_var(--p4g-orange)]', className)}>
      <SlotImg slot={`arcana-${a.slot}`} fallback="" alt={a.en} className="absolute inset-0 h-full w-full object-cover"
        fallbackNode={
          <div className="absolute inset-[5px] flex flex-col items-center justify-between rounded-[3px] border-2 border-p4g-yellow bg-p4g-yellow py-2" style={{ backgroundImage: `url(${p4gAsset('paper-collage.webp')})`, backgroundSize: '160px' }}>
            <span className="p4g-num text-h2 text-p4g-black">{a.num}</span>
            <Sparkle4 size={44} color="#111" />
            <span className="w-full bg-p4g-black py-0.5 text-center font-display text-[10px] font-bold tracking-[0.16em] text-p4g-yellow">{a.en}</span>
          </div>
        } />
    </div>
  );
}

const SectionMark = ({ title, eyebrow }: { title: string; eyebrow?: string }) => (
  <div className="min-w-0">
    {eyebrow && <div className="mb-1 font-display text-cap font-bold italic tracking-[0.24em] text-p4g-black/70">{eyebrow}</div>}
    <P4Outline as="h2" size="clamp(30px,8.6vw,54px)" stroke={6} italic wrap className="leading-[1.05]">{title}</P4Outline>
  </div>
);

const ActBar = ({ onBack, primaryLabel, onPrimary, disabled, busy }: { onBack?: () => void; primaryLabel: string; onPrimary: () => void; disabled?: boolean; busy?: boolean }) => (
  <div className="mt-6 flex flex-wrap items-center gap-3">
    {onBack && <P4Button variant="secondary" onClick={onBack} className="min-w-[104px]">返回</P4Button>}
    <P4Button variant="black" size="lg" onClick={onPrimary} disabled={disabled} busy={busy} trailing={<span aria-hidden>▶</span>}>{primaryLabel}</P4Button>
  </div>
);

export default function WelcomeModal({ open, onClose, params }: OverlayProps) {
  const low = useLowMotion();
  useScrollLock(open);
  const init = (params?.get('step') as Step) || 'welcome';
  const cloudEnabled = params?.get('cloud') !== '0';
  const [step, setStep] = useState<Step>(STEP_ORDER.includes(init) || init === 'import' ? init : 'welcome');
  const [dir, setDir] = useState(1);
  const [noise, setNoise] = useState(0);
  const [name, setName] = useState(init === 'welcome' || init === 'name' ? '' : '鸣上');
  const [preset, setPreset] = useState<number | null>(['customize', 'done', 'guide', 'blessing'].includes(init) ? 0 : null);
  const [names, setNames] = useState<Record<AttributeId, string>>(['customize', 'done', 'guide', 'blessing'].includes(init) ? { ...WELCOME_PRESETS[0].names! } : EMPTY_NAMES);
  const [blessing, setBlessing] = useState<AttributeId | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const failOnce = useRef(params?.get('fail') === '1');
  const [finishing, setFinishing] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importFile, setImportFile] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);

  const isCustom = preset === 2;
  const canName = name.trim().length > 0;
  const canPreset = preset !== null;
  const canCustomize = ATTR_IDS.every((id) => names[id].trim().length > 0);
  const stepNo = step === 'import' ? 0 : STEP_ORDER.indexOf(step) + 1;

  const go = (to: Step) => {
    setDir(STEP_ORDER.indexOf(to) >= STEP_ORDER.indexOf(step) || to === 'import' ? 1 : -1);
    setNoise((n) => n + 1);
    setStep(to);
  };
  const choosePreset = (i: number) => { setPreset(i); setNames(i !== 2 ? { ...WELCOME_PRESETS[i].names! } : (p) => ({ ...p })); };
  const startFinish = async () => {
    if (!blessing || submitting) return;
    setSubmitting(true); setSubmitError(null);
    try {
      if (failOnce.current) { failOnce.current = false; setSubmitting(false); setSubmitError('IndexedDB 写入超时（QuotaExceededError）'); return; }
      await useAppStore.getState().createUser(name.trim(), names, blessing);
      setFinishing(true);
      window.setTimeout(() => { setSubmitting(false); setFinishing(false); onClose(); showToast('建档完成，欢迎来到面具庭园', { kind: 'success' }); }, low ? 400 : 1500);
    } catch (error) {
      setSubmitting(false);
      setSubmitError(error instanceof Error ? error.message : '建档失败，请重试');
    }
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
    else if (step === 'import') { setImportJson(''); setImportFile(false); setImportError(null); go('welcome'); }
  };
  useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === 'Escape') prevStep();
      else if (e.key === 'Enter' && tag !== 'TEXTAREA' && tag !== 'BUTTON') { e.preventDefault(); goNext(); }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  const readFile = (f?: File | null) => {
    if (!f) return;
    if (!f.name.endsWith('.json') && f.type !== 'application/json') { setImportError('请选择 JSON 格式的备份文件'); return; }
    setImportError(null);
    f.text().then((t) => { setImportJson(t); setImportFile(true); }).catch(() => setImportError('导入失败，请检查备份文件格式'));
  };
  const doImport = () => {
    setImportLoading(true); setImportError(null);
    void (async () => {
      try {
        const parsed = JSON.parse(importJson);
        if (!parsed || typeof parsed !== 'object') throw new Error('导入失败，请检查备份文件格式');
        if (isImagesBundleJson(importJson)) await importImagesBundle(importJson);
        else await useAppStore.getState().importData(importJson);
        setImportLoading(false); onClose(); showToast('导入完成', { kind: 'success' });
      } catch (error) {
        setImportLoading(false);
        setImportError(error instanceof Error && error.message.startsWith('导入') ? error.message : '导入失败，请检查备份文件格式');
      }
    })();
  };

  const phase = dayPhase(now);
  const inShadow = isShadowTime(now);
  const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  let body: ReactNode = null;
  if (step === 'welcome') body = (
    <div className="flex min-w-0 flex-col">
      <div className="font-display text-meta font-bold italic tracking-[0.3em] text-p4g-black/70">WELCOME TO</div>
      <P4Outline as="h1" size="clamp(56px,17vw,128px)" stroke={9} italic className="leading-none">面具庭园</P4Outline>
      <p className="mt-4 max-w-[560px] font-display text-lead font-bold text-p4g-black">每一次行动，都化作灵魂成长的印记。</p>
      <p className="mt-2 max-w-[560px] text-body leading-relaxed text-p4g-black/80">写下今天做了什么，它会变成你的五项人格指数。记录、任务、记账、同伴，与影时间的战斗，都从这里开始。</p>
      <ActBar primaryLabel="开始设定" onPrimary={() => go('name')} />
      <button type="button" onClick={() => go('import')} className="mt-4 self-start border-b-2 border-p4g-black font-display text-body font-bold text-p4g-black">我已经是客人了 ›</button>
    </div>
  );
  if (step === 'name') body = (
    <div className="min-w-0">
      <SectionMark eyebrow="NAME ENTRY" title="你叫什么名字" />
      <p className="mt-3 max-w-[560px] text-body text-p4g-black/80">这将是你在面具庭园里的称呼。真名、笔名、代号都行。</p>
      <div className="mt-5 max-w-[440px]">
        <label htmlFor="guide-name" className="sr-only">你的昵称</label>
        <P4Input id="guide-name" autoFocus value={name} maxLength={20} placeholder="写下你的称呼" onChange={(e) => setName(e.target.value)} className="text-h3" />
        <p className="mt-2 text-meta text-p4g-black/70">按 Enter 直接进入下一步，之后随时能在设置里改。</p>
      </div>
      <ActBar onBack={prevStep} primaryLabel="接入" onPrimary={goNext} disabled={!canName} />
    </div>
  );
  if (step === 'preset') body = (
    <div className="min-w-0">
      <SectionMark eyebrow="GROWTH STYLE" title="选择成长风格" />
      <p className="mt-3 max-w-[560px] text-body text-p4g-black/80">它会预置你五项属性的名称。之后在设置里随时能改。</p>
      <div className="mt-5 grid max-w-[720px] grid-cols-1 overflow-hidden rounded-sm border-3 border-p4g-black shadow-hard" role="group" aria-label="成长风格">
        {WELCOME_PRESETS.map((p, i) => {
          const on = preset === i;
          return (
            <button key={p.label} type="button" aria-pressed={on} onClick={() => choosePreset(i)}
              className={cx('relative flex min-w-0 items-center gap-3 px-3 py-3 text-left transition-colors duration-fast', on ? 'bg-p4g-black text-white' : 'text-p4g-black')}
              style={on ? undefined : { background: 'linear-gradient(90deg,#fff6a8,#ffe95a)' }}>
              {on && <span aria-hidden className="absolute -left-1 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[9px] border-l-[12px] border-y-transparent border-l-p4g-yellow" />}
              <span className={cx('p4g-num shrink-0 text-h2', on ? 'text-p4g-yellow' : 'text-p4g-orange-deep')}>0{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-h3 font-bold">{p.label}</span>
                <span className={cx('block p4g-clamp-2 text-meta', on ? 'text-white/80' : 'text-p4g-black/70')}>{p.desc}</span>
              </span>
              {on && <Sparkle4 size={18} color="var(--p4g-orange)" className="shrink-0" />}
              {!on && <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: i % 2 ? 'var(--p4g-separator-b)' : 'var(--p4g-separator-a)' }} />}
            </button>
          );
        })}
      </div>
      <ActBar onBack={prevStep} primaryLabel="记录" onPrimary={goNext} disabled={!canPreset} />
    </div>
  );
  if (step === 'customize') body = (
    <div className="min-w-0">
      <SectionMark eyebrow="CUSTOMIZE" title="逐个改属性名" />
      <p className="mt-3 max-w-[560px] text-body text-p4g-black/80">下面是预设的名，都能换成你更顺口的说法。两个字最好看。</p>
      <div className="mt-5 grid max-w-[720px] grid-cols-1 gap-3 sm:grid-cols-2">
        {ATTR_IDS.map((id, i) => (
          <div key={id} className="min-w-0">
            <label htmlFor={`attr-${id}`} className="mb-1 block font-display text-meta font-bold text-p4g-black">第 {i + 1} 项属性名称</label>
            <P4Input id={`attr-${id}`} value={names[id]} maxLength={6} placeholder={WELCOME_ATTR_PLACEHOLDERS[id]} onChange={(e) => setNames((n) => ({ ...n, [id]: e.target.value }))} />
          </div>
        ))}
      </div>
      <ActBar onBack={prevStep} primaryLabel="归档" onPrimary={goNext} disabled={!canCustomize} />
    </div>
  );
  if (step === 'done') body = (
    <div className="min-w-0">
      <SectionMark eyebrow="ARCHIVED" title={`你好，${name || '客人'}`} />
      <p className="mt-3 max-w-[560px] text-body text-p4g-black/80">五项属性已经就位。所有技能说明与成就文案，会跟着属性名一起变。</p>
      <CollageStagger className="mt-5 flex max-w-[720px] flex-wrap gap-2.5">
        {ATTR_IDS.map((id, i) => (
          <CollageItem key={id} tilt={i % 2 ? 1.5 : -1.5}>
            <span className="flex items-center gap-2 border-3 border-p4g-black bg-p4g-black px-3 py-2 shadow-[3px_3px_0_var(--p4g-orange)]" style={{ clipPath: 'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)' }}>
              <span className="p4g-num text-meta text-p4g-orange">0{i + 1}</span>
              <span className="font-display text-h3 font-bold text-p4g-yellow">{names[id] || '未命名'}</span>
            </span>
          </CollageItem>
        ))}
      </CollageStagger>
      <ActBar onBack={prevStep} primaryLabel="继续" onPrimary={goNext} />
    </div>
  );
  if (step === 'guide') body = (
    <div className="min-w-0">
      <SectionMark eyebrow="SEVEN THINGS" title="七件事，看完就能开始" />
      <p className="mt-3 text-body font-bold text-p4g-black/80">{name || '客人'}，七件事，看完就能开始。</p>
      <CollageStagger className="mt-4 grid max-w-[900px] grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3" stagger={0.05}>
        {WELCOME_GUIDE.map((g, i) => (
          <CollageItem key={g.title} tilt={i % 2 ? 0.8 : -0.8}>
            <div className="relative flex h-full min-w-0 gap-3 rounded-sm border-3 border-p4g-black bg-p4g-cream p-3 shadow-hard-sm">
              <span className="p4g-num shrink-0 text-h1 leading-none text-p4g-orange [text-shadow:2px_2px_0_#111]">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lead font-bold text-p4g-black">{g.title}</span>
                <span className="mt-0.5 block text-meta leading-snug text-p4g-black/75">{g.desc}</span>
                {g.title === '影时间' && (
                  <span className="mt-1.5 flex items-center gap-1.5 font-display text-cap font-bold text-p4g-black">
                    <MoonGlyph phase={phase} size={16} />{MOON_NAMES[Math.round(phase * 8) % 8]} · <span className={inShadow ? 'text-p4g-red' : 'text-p4g-black/60'}>影时间 · {inShadow ? '进行中' : '今夜降临'}</span>
                  </span>
                )}
              </span>
            </div>
          </CollageItem>
        ))}
      </CollageStagger>
      <ActBar onBack={prevStep} primaryLabel="继续" onPrimary={goNext} />
    </div>
  );
  if (step === 'blessing') body = (
    <div className="min-w-0">
      <SectionMark eyebrow="BLESSING" title="馆长的赐福" />
      <p className="mt-3 max-w-[620px] text-body text-p4g-black/80">既然你踏进了面具庭园，说明不是等闲之辈。初次来访有一份礼遇，挑一项你最擅长的，往后每次加点都额外 +1。</p>
      <CollageStagger className="mt-5 flex max-w-[880px] flex-wrap gap-2.5">
        {ATTR_IDS.map((id) => {
          const on = blessing === id;
          return (
            <CollageItem key={id}>
              <button type="button" aria-pressed={on} onClick={() => setBlessing(id)}
                className={cx('relative px-6 py-3 font-display text-h3 font-bold transition-transform duration-instant active:scale-95', on ? 'bg-p4g-orange text-p4g-black shadow-[4px_4px_0_#111]' : 'bg-p4g-white text-p4g-black shadow-[inset_0_0_0_3px_#111]')}
                style={{ clipPath: 'polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)' }}>
                {names[id] || '未命名'}{on && <span className="ml-1.5 p4g-num text-meta">+1</span>}
              </button>
            </CollageItem>
          );
        })}
      </CollageStagger>
      {submitError && (
        <div role="alert" className="mt-5 max-w-[720px] border-3 border-p4g-black bg-p4g-black px-4 py-3 font-display text-meta font-bold leading-relaxed text-[#ff8a7a]" style={{ clipPath: 'polygon(0 0,100% 0,calc(100% - 8px) 100%,0 100%)' }}>
          <span className="mr-1">建档没能完成：</span><span className="break-all">{submitError}</span>
        </div>
      )}
      <ActBar onBack={prevStep} primaryLabel={submitting ? '正在建档…' : submitError ? '再试一次' : '接受赐福，开始旅程'} onPrimary={startFinish} disabled={!blessing || submitting} busy={submitting} />
    </div>
  );
  if (step === 'import') body = (
    <div className="min-w-0">
      <SectionMark eyebrow="RETURNING GUEST" title="我已经是客人了" />
      <p className="mt-3 max-w-[560px] text-body text-p4g-black/80">登录云端同步，自动拉取你的所有数据；或用本地备份文件导入。</p>
      <div className="mt-5 flex max-w-[640px] flex-col gap-3">
        {cloudEnabled && <P4Button variant="black" size="lg" block onClick={() => setLoginOpen(true)} leading={<span aria-hidden>☁</span>}>登录云端同步</P4Button>}
        <P4Textarea rows={4} value={importJson} onChange={(e) => { setImportJson(e.target.value); setImportFile(false); setImportError(null); }} placeholder={'粘贴备份 JSON 文本\n（以 {"user":... 开头）'} />
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => readFile(e.target.files?.[0])} />
        <button type="button" onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); readFile(e.dataTransfer.files?.[0]); }}
          className={cx('flex min-h-[64px] w-full items-center justify-center rounded-sm border-3 border-dashed px-3 py-3 font-display text-body font-bold transition-colors', drag ? 'border-p4g-orange bg-p4g-black text-p4g-yellow' : importFile ? 'border-p4g-black bg-p4g-green text-p4g-black' : 'border-p4g-black bg-p4g-white/70 text-p4g-black')}>
          {importFile ? '✓ 文件已加载' : '选择备份文件（或拖拽至此）'}
        </button>
        {importError && <p role="alert" className="font-display text-meta font-bold text-p4g-red">{importError}</p>}
      </div>
      <ActBar onBack={prevStep} primaryLabel={importLoading ? '正在导入…' : '确认导入'} onPrimary={doImport} disabled={!importJson.trim() || importLoading} busy={importLoading} />
    </div>
  );

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="welcome" role="dialog" aria-modal="true" aria-label="欢迎引导"
            className="fixed inset-0 flex flex-col overflow-hidden bg-p4g-yellow text-p4g-black"
            style={{ zIndex: 'var(--p4g-z-sheet)' as unknown as number, backgroundImage: `url(${p4gAsset('menu-squares.webp')})`, backgroundSize: 'cover', backgroundPosition: 'center bottom' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }}>
            {/* 左侧彩虹竖条（暂停菜单）*/}
            <div aria-hidden className="absolute inset-y-0 left-0 w-[clamp(10px,3vw,48px)] p4g-candy" />
            {/* 顶部信息卡 */}
            <div className="relative flex shrink-0 items-center gap-2 px-[clamp(18px,6vw,80px)] pt-[calc(14px+env(safe-area-inset-top))]">
              <span className="bg-p4g-black px-2 py-[3px] font-display text-meta font-bold text-p4g-yellow" style={{ clipPath: 'polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%)' }}>MASKARIA</span>
              {stepNo > 0 && <span className="font-display text-meta font-bold tracking-wide text-p4g-black/80">第 {stepNo} 步 · 共 {STEP_ORDER.length} 步</span>}
              <span className="ml-auto flex gap-1">
                {STEP_ORDER.map((s, i) => <span key={s} className={cx('h-2 w-4', i < stepNo ? 'bg-p4g-black' : 'bg-p4g-black/20')} style={{ clipPath: 'polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)' }} />)}
              </span>
            </div>
            {/* 主体 */}
            <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              <div className="mx-auto flex min-h-full w-full max-w-[1180px] items-start gap-8 px-[clamp(18px,6vw,80px)] py-6 lg:items-center">
                <AnimatePresence mode="wait" custom={dir} initial={false}>
                  <motion.div key={step} className="min-w-0 flex-1"
                    initial={low ? { opacity: 0 } : { x: dir * 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={low ? { opacity: 0 } : { x: -dir * 60, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.2, 0.9, 0.1, 1] }}>
                    {body}
                  </motion.div>
                </AnimatePresence>
                <motion.div key={`card-${step}`} className="hidden w-[min(22vw,240px)] shrink-0 md:block" initial={low ? { opacity: 0 } : { rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1, rotate: 4 }} transition={{ duration: 0.32, ease: [0.2, 0.9, 0.1, 1] }}>
                  <ArcanaCard step={step} />
                  <div className="mt-3 text-center font-display text-meta font-bold">{ARCANA[step].zh} · {ARCANA[step].num}</div>
                </motion.div>
              </div>
            </div>
            {/* 底部状态条 */}
            <div className="relative flex shrink-0 items-center justify-between gap-3 bg-p4g-black px-[clamp(18px,6vw,80px)] py-2 pb-[calc(8px+env(safe-area-inset-bottom))] font-display text-meta font-bold text-p4g-cream">
              <span className="flex min-w-0 items-center gap-2"><MoonGlyph phase={phase} size={22} /><span className="truncate">{MOON_NAMES[Math.round(phase * 8) % 8]} · {Math.round(phase * 100)}%</span></span>
              <span className="p4g-num whitespace-nowrap text-p4g-yellow">{clock}</span>
              <span className={cx('whitespace-nowrap', inShadow ? 'text-p4g-orange' : 'text-p4g-cream/70')}>影时间 · {inShadow ? '进行中' : '今夜降临'}</span>
            </div>
            {/* 跳台噪点一帧 */}
            <AnimatePresence>
              {!low && noise > 0 && (
                <motion.div key={noise} aria-hidden className="pointer-events-none absolute inset-0" initial={{ opacity: 0.55 }} animate={{ opacity: 0 }} transition={{ duration: 0.14 }}>
                  <NoiseLayer />
                </motion.div>
              )}
            </AnimatePresence>
            {/* 建档收尾：黄黑条纹扫过 + 英文巨词横穿 */}
            <AnimatePresence>
              {finishing && (
                <motion.div key="fin" className="pointer-events-none absolute inset-0 flex items-center overflow-hidden bg-p4g-black" initial={low ? { opacity: 0 } : { x: '100%' }} animate={low ? { opacity: 1 } : { x: '0%' }} transition={{ duration: 0.3, ease: [0.2, 0.9, 0.1, 1] }}>
                  <div className="absolute inset-x-0 top-[18%] h-6 p4g-hazard" />
                  <div className="absolute inset-x-0 bottom-[18%] h-6 p4g-hazard" />
                  <motion.div className="whitespace-nowrap" initial={low ? { opacity: 0 } : { x: '60%' }} animate={low ? { opacity: 1 } : { x: '-60%' }} transition={{ duration: 1.3, ease: 'linear' }}>
                    <P4Outline size="clamp(64px,20vw,220px)" stroke={10} fill="var(--p4g-yellow)" strokeColor="#000" italic>WELCOME TO MASKARIA</P4Outline>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            <OverlayByKey k="account-login" open={loginOpen} onClose={() => setLoginOpen(false)} fallbackLabel="登录弹窗" />
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
