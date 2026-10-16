import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { useCloudStore } from '@/store/cloud';
import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { AttributeId, AttributeNames } from '@/types';
import { isNative } from '@/utils/native';
import { prefersReducedMotion } from '@/utils/boldness';
import { LoginModal } from '@/components/auth/LoginModal';
import { syncOnLogin } from '@/services/sync';
import { P3R, SlantButton, P3EmptySlab, SectionMark, TitlePeriod, slantClip } from '@/components/p3r/kit';
// 引导巨名的展示字体（与已验收的 demo 同一款）；只在引导 chunk 里加载，不影响其它页面
import '@/styles/syncopate.css';

// ═══════════════════════════════════════════════════════════════════════
// 首次打开引导 · P3R 语言版
//
// 视觉口径来自用户已验收的引导 demo（outputs/p3r-guide-demo/index.html），
// 落地方式是用项目自家的 p3r/kit 组件重画：浅底水面场 + 斜切平行四边形 +
// 巨名排版 + 左上信息卡 + 右下按键提示条。
//
// 流程与数据流一行未改：Step 状态机、createUser / importData / syncOnLogin、
// 各步校验、LoginModal 接线，全部照旧；本文件换掉的是外观与版式。
// ═══════════════════════════════════════════════════════════════════════

const PRESETS: Array<{
  label: string;
  desc: string;
  names: AttributeNames;
  isCustom?: boolean;
}> = [
  {
    label: '学习成长',
    desc: '看重知识积累，也照顾综合成长 · 知识 胆量 灵巧 温柔 魅力',
    names: { knowledge: '知识', guts: '胆量', dexterity: '灵巧', kindness: '温柔', charm: '魅力' },
  },
  {
    label: '冒险勇士',
    desc: '喜欢挑战，认行动不认空想 · 智慧 勇气 敏捷 仁慈 威望',
    names: { knowledge: '智慧', guts: '勇气', dexterity: '敏捷', kindness: '仁慈', charm: '威望' },
  },
  {
    label: '自定义',
    desc: '从空白开始，五个名字都由你定',
    isCustom: true,
    names: { knowledge: '', guts: '', dexterity: '', kindness: '', charm: '' },
  },
];

const ATTR_IDS: AttributeId[] = ['knowledge', 'guts', 'dexterity', 'kindness', 'charm'];

const ATTR_ORDINAL: Record<AttributeId, string> = {
  knowledge: '01',
  guts: '02',
  dexterity: '03',
  kindness: '04',
  charm: '05',
};

const DEFAULT_ATTR_PLACEHOLDERS: Record<AttributeId, string> = {
  knowledge: '如：知识、智慧、学识…',
  guts: '如：胆量、勇气、意志…',
  dexterity: '如：灵巧、敏捷、技艺…',
  kindness: '如：温柔、仁慈、共情…',
  charm: '如：魅力、威望、气质…',
};

/**
 * 快速上手的七件事（照 demo 的精简口径）。
 *
 * 口径变更（相对旧的七张滑卡）：demo 把每块的四五条细则收成一句话，
 * 一屏排完，不再需要左右翻页；用户已按这一版验收。
 */
const SEVEN_THINGS: Array<{ title: string; desc: string }> = [
  { title: '记录今天', desc: '一句话就够。它会进你的时间线。' },
  { title: '任务', desc: '设目标、拆步骤，完成时给属性加点。' },
  { title: '记账', desc: '收支与人格指数同屏，钱和成长一起看。' },
  { title: '同伴', desc: '每张牌是一位同伴，亲密度随记录上涨。' },
  { title: '属性', desc: '五项指数由你的行为自然长出来。' },
  { title: '影时间', desc: '深夜的那一格，留给只有你能打的仗。' },
  { title: '主题', desc: '四套频道皮肤：红 / 黄 / 蓝 / 粉，随时换。' },
];

/** 引导的场：浅底 + 水面素材 30% + 白 veil + 斜线纹理（照 P3RPage 的场，自铺一份不依赖 store） */
const GuideField = () => (
  <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden" style={{ background: P3R.bg }}>
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: 'url(/assets/terminal/p3-water-wide.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        opacity: 0.3,
      }}
    />
    {/* 都市斜线层：等距同向，极淡；是这套语言里"都市感"的那一半 */}
    <svg className="absolute inset-0 h-full w-full" style={{ color: 'rgba(27,87,255,0.13)' }} preserveAspectRatio="none">
      <defs>
        <pattern id="guide-lines" width="46" height="46" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">
          <line x1="0" y1="0" x2="0" y2="46" stroke="currentColor" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#guide-lines)" />
    </svg>
    <div
      className="absolute inset-0"
      style={{
        background:
          'linear-gradient(180deg, rgba(238,245,249,0.16) 0%, rgba(238,245,249,0.62) 62%, rgba(238,245,249,0.94) 100%)',
      }}
    />
  </div>
);

/** 背景浮牌：八屏各飘一张自家塔罗（蓝频道那副大阿卡纳），按这一步的含义挑牌。
 *  位置与倾角照已验收 demo 的定值；牌只做背景，所以压得淡（.26），各自错开浮动节拍。 */
const CARD_OF: Record<string, string> = {
  welcome: 'fool', // 旅程起点
  name: 'magician', // 自我
  preset: 'wheel_of_fortune', // 选择
  customize: 'temperance', // 微调
  done: 'sun', // 完成
  guide: 'hierophant', // 教导
  blessing: 'empress', // 赐福
};

const FLOATER_POS: Record<string, { pos: CSSProperties; rot: number }> = {
  welcome: { pos: { right: '2%', top: '11%' }, rot: -9 },
  name: { pos: { left: '1%', bottom: '7%' }, rot: 7 },
  preset: { pos: { right: '3%', bottom: '5%' }, rot: -6 },
  customize: { pos: { left: '2%', top: '9%' }, rot: 8 },
  done: { pos: { right: '2%', top: '13%' }, rot: -11 },
  guide: { pos: { left: '1%', bottom: '2%' }, rot: 5 },
  blessing: { pos: { right: '1%', top: '7%' }, rot: -7 },
};

const CARD_ORDER = Object.keys(CARD_OF);

/** 转场牌的基准尺寸（与已验收 demo 的 .hero 一致）：背景浮牌按高度比例换算成它的位移与缩放，
 *  这样桌面/手机、八屏各自不同的落点都能自动对齐，不用为每屏写死坐标。 */
const HERO_W = 260;
const HERO_H = 416;

type Pose = { x: number; y: number; s: number };

const heroPose = (el: HTMLElement): Pose => {
  const r = el.getBoundingClientRect();
  return {
    x: Math.round(r.left + r.width / 2 - window.innerWidth / 2),
    y: Math.round(r.top + r.height / 2 - window.innerHeight / 2),
    s: r.height ? +(r.height / HERO_H).toFixed(3) : 1,
  };
};

const floaterEl = (slug: string) => document.querySelector<HTMLElement>(`img[data-for="${slug}"]`);

/** 收尾转场翻出的那张牌：世界——呼应 demo 里「翻到新篇章」用的那张 */
const FINISH_CARD = 'world';

const Floaters = ({ step, hidden }: { step: string; hidden: string[] }) => {
  const reduce = prefersReducedMotion();
  return (
    <>
      {CARD_ORDER.map((slug, i) => {
        const active = slug === step;
        // 转场期间被临时隐去的牌：「隐去」要瞬时（转场牌要在同一位置无缝接上），「回来」走 420ms 淡入
        const isOut = hidden.includes(slug);
        const opacity = isOut ? 0 : active ? 0.26 : 0;
        const { pos, rot } = FLOATER_POS[slug];
        return (
          <motion.img
            key={slug}
            data-for={slug}
            src={`/tarot/p3/${CARD_OF[slug]}.webp`}
            alt=""
            aria-hidden
            className="pointer-events-none absolute select-none"
            initial={false}
            animate={reduce ? { opacity } : { y: [0, -14, 0], rotate: [rot, rot + 1.6, rot], opacity }}
            transition={
              reduce
                ? { opacity: { duration: isOut ? 0 : 0.42 } }
                : {
                    y: { duration: 9, repeat: Infinity, ease: 'easeInOut', delay: i * -1.1 },
                    rotate: { duration: 9, repeat: Infinity, ease: 'easeInOut', delay: i * -1.1 },
                    opacity: { duration: isOut ? 0 : 0.42 },
                  }
            }
            style={{ height: 'clamp(150px,30vh,330px)', width: 'auto', filter: 'saturate(.92)', ...pos }}
          />
        );
      })}
    </>
  );
};

/** 左上的白底信息卡：当前第几步 + 版本（真图每屏左上角都有） */
const InfoCard = ({ step, total }: { step: number; total: number }) => (
  <div className="flex items-center gap-2">
    <span className="px-2 py-[3px] text-[12px] font-black" style={{ background: P3R.blue, color: '#fff', clipPath: slantClip(5) }}>
      MASKARIA
    </span>
    <span className="text-[12px] font-black tracking-wide" style={{ color: P3R.inkSoft }}>
      第 {step} 步 · 共 {total} 步
    </span>
  </div>
);

/** 右下的按键提示条：每屏显示这一步能按什么（键盘绑定在 Wave 2 接上） */
const KeyHint = ({ items }: { items: string[] }) => (
  <div className="flex items-center gap-3">
    {items.map((t) => (
      <span key={t} className="flex items-center gap-1.5 text-[12px] font-black" style={{ color: P3R.inkSoft }}>
        <span className="px-1.5 py-[1px] text-[11px] font-black" style={{ background: '#fff', color: P3R.ink, clipPath: slantClip(4), boxShadow: `inset 0 0 0 1.5px ${P3R.ink}` }}>
          {t.split(' ')[0]}
        </span>
        {t.split(' ').slice(1).join(' ')}
      </span>
    ))}
  </div>
);

/** 每屏的操作条：返回（ghost）+ 主按钮（primary / soft） */
const ActBar = ({
  onBack,
  backLabel = '返回',
  primary,
  primaryLabel,
  primaryTone = 'primary',
  disabled = false,
  onPrimary,
}: {
  onBack?: () => void;
  backLabel?: string;
  primary?: boolean;
  primaryLabel: string;
  primaryTone?: 'primary' | 'soft';
  disabled?: boolean;
  onPrimary: () => void;
}) => (
  <div className="mt-[clamp(16px,3vh,34px)] flex flex-wrap items-center gap-3">
    {onBack && (
      <SlantButton tone="ghost" onClick={onBack} className="min-w-[104px]">
        {backLabel}
      </SlantButton>
    )}
    {primary !== false && (
      <SlantButton tone={primaryTone} onClick={onPrimary} disabled={disabled} magentaCorner>
        {primaryLabel}
      </SlantButton>
    )}
  </div>
);

// 以下为引导主组件（分块写入中：逻辑层 → 八屏版式层）

// ── 主组件 ────────────────────────────────────────────────────────────

type Step =
  | 'welcome'
  | 'name'
  | 'preset'
  | 'customize'
  | 'done'
  | 'guide'
  | 'blessing'
  | 'import';

const STEP_ORDER: Step[] = ['welcome', 'name', 'preset', 'customize', 'done', 'guide', 'blessing'];

export const WelcomeModal = () => {
  const { user, createUser, importData } = useAppStore(
    useShallow(s => ({ user: s.user, createUser: s.createUser, importData: s.importData }))
  );
  const cloudEnabled = useCloudStore(s => s.cloudEnabled);

  const [step, setStep] = useState<Step>('welcome');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [name, setName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [attrNames, setAttrNames] = useState<AttributeNames>({
    knowledge: '',
    guts: '',
    dexterity: '',
    kindness: '',
    charm: '',
  });
  const [blessingAttr, setBlessingAttr] = useState<AttributeId | null>(null);
  /** 建档失败时的可见反馈：以前 createUser 一抛错就是「按钮点了没反应」，用户完全没法自救 */
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Import state
  const [importJson, setImportJson] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 转场牌：从背景那张浮牌的实际位置滑出来、翻面成下一屏的牌、再滑回下一屏的位置。
  // p0 / p1 是出发与到达两张浮牌换算出来的位移与缩放；busyRef 把转场期间的输入锁住。
  const [hero, setHero] = useState<{ from: Step; to: Step; p0: Pose; p1: Pose } | null>(null);
  const [heroPhase, setHeroPhase] = useState<'out' | 'back'>('out');
  const [hiddenFloaters, setHiddenFloaters] = useState<string[]>([]);
  // 收尾转场（建档提交那一下）：幕布从点击点铺满 + 牌翻面 + 英文巨词横穿，走完才真正建档
  const [finish, setFinish] = useState<{ x: number; y: number; p0: Pose } | null>(null);
  const [finishWord, setFinishWord] = useState<'in' | 'out'>('in');
  const busyRef = useRef(false);

  // 注意：本组件的「提前 return」必须放在所有 Hook 之后。
  // 建档成功那一刻 user 从 null 变成有值，若那句 return 排在 useEffect 之前，
  // 这一次渲染就会少执行两个 Hook，React 直接抛
  // "Rendered fewer hooks than expected"（用户 2026-10-16 报的最后一屏崩溃）。
  // 下面第一个真正的提前 return 在键盘 effect 之后。

  const isCustomMode = selectedPreset === 2;
  const stepIndex = STEP_ORDER.indexOf(step);
  const stepNo = step === 'import' ? 0 : stepIndex + 1;

  const handleSelectPreset = (index: number) => {
    setSelectedPreset(index);
    if (index !== 2) {
      setAttrNames({ ...PRESETS[index].names });
    } else {
      setAttrNames(prev => ({
        knowledge: prev.knowledge || '',
        guts: prev.guts || '',
        dexterity: prev.dexterity || '',
        kindness: prev.kindness || '',
        charm: prev.charm || '',
      }));
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createUser(name.trim(), attrNames, blessingAttr ?? undefined);
      // 成功即 user 落库 → 本组件整体卸载，不需要复位 submitting
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '建档失败，请重试');
      setSubmitting(false);
      // 收尾转场失败：把幕布与牌收掉，否则用户只看到一片蓝、看不到错误
      setFinish(null);
      setHiddenFloaters([]);
      busyRef.current = false;
    }
  };

  const canProceedName = name.trim().length > 0;
  const canProceedPreset =
    selectedPreset !== null && (!isCustomMode || ATTR_IDS.every(id => attrNames[id].trim().length > 0));
  const canProceedCustomize = ATTR_IDS.every(id => attrNames[id].trim().length > 0);

  const handlePresetNext = () => {
    if (isCustomMode) navigate('done');
    else navigate('customize');
  };

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      setImportError('请选择 JSON 格式的备份文件');
      return;
    }
    setImportError(null);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      if (text) setImportJson(text);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleImport = async () => {
    if (!importJson.trim()) return;
    setImportLoading(true);
    setImportError(null);
    try {
      await importData(importJson);
      // 成功即 user 落库 → 本组件整体卸载，不需要复位 importLoading
    } catch (error) {
      setImportError(error instanceof Error ? error.message : '导入失败，请检查备份文件格式');
      setImportLoading(false);
    }
  };

  /** 右下角按键提示条的内容：每屏只写这一步真能按的键 */
  const keyHints: Record<Step, string[]> = {
    welcome: ['Enter 开始设定', 'Esc —'],
    name: ['Enter 下一步', 'Esc 返回'],
    preset: ['↓ 选择', 'Enter 下一步', 'Esc 返回'],
    customize: ['Enter 下一项', 'Esc 返回'],
    done: ['Enter 继续', 'Esc 返回'],
    guide: ['Enter 继续', 'Esc 返回'],
    blessing: ['↓ 选择', 'Enter 确认', 'Esc 返回'],
    import: ['Esc 返回'],
  };

  /** 换屏统一入口：带塔罗翻牌转场；转场期间锁住输入，避免连点把时序打乱。
   *  降级路径：用户开了「减少动态效果」或找不到对应浮牌时，直接换页。 */
  const navigate = (to: Step, after?: () => void) => {
    if (busyRef.current || to === step) return;
    const fromEl = floaterEl(step);
    const toEl = floaterEl(to);
    if (prefersReducedMotion() || !fromEl || !toEl) {
      setStep(to);
      after?.();
      return;
    }
    busyRef.current = true;
    setHero({ from: step, to, p0: heroPose(fromEl), p1: heroPose(toEl) });
    setHeroPhase('out');
    setHiddenFloaters([step]); // 出发那张瞬时隐去，由转场牌在同一位置无缝接上
    after?.();
  };

  // 转场时序（照已验收 demo）：700ms 滑到屏心、620ms 起翻面 460ms、830ms 换页；
  // 换页后再过 130ms 牌才滑回下一屏的位置并淡出——早了会实心盖住刚显示出来的页面。
  useEffect(() => {
    if (user || !hero) return;
    const t1 = setTimeout(() => {
      setStep(hero.to);
      setHiddenFloaters([hero.from, hero.to]); // 目标那张先隐着，等转场牌落进它的位置再接上
    }, 830);
    const t2 = setTimeout(() => {
      setHeroPhase('back');
      setHiddenFloaters([hero.from]); // 目标浮牌淡入（420ms），转场牌同时滑回 + 淡出
    }, 960);
    const t3 = setTimeout(() => {
      // 收尾必须把「所有」浮牌的临时隐去清掉：中途换页后只按 from/to 清会漏，
      // 下次回到那一屏它就是不可见的（demo 踩过这个坑）。
      setHero(null);
      setHeroPhase('out');
      setHiddenFloaters([]);
      busyRef.current = false;
    }, 1340);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [hero]);

  /** 收尾转场 + 建档：点「接受赐福」后先让幕布从点击点铺满、牌翻成「世界」，
   *  再扫一段英文巨词，约 1.45s 后才真正提交建档。
   *  成功了引导整体卸载、主界面接上（幕布随组件一起消失，所以中间不会露出赐福屏）；
   *  失败了把幕布收掉、露出错误条（见 handleSubmit 的 catch）。
   *  时序照已验收 demo：幕布 760ms 铺满、巨词 760ms 起滑入 / 1060ms 起滑出。 */
  const startFinish = () => {
    if (busyRef.current || submitting) return;
    busyRef.current = true;
    const el = floaterEl('blessing');
    setFinish({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      p0: el ? heroPose(el) : { x: 0, y: 0, s: 1 },
    });
    setHiddenFloaters(['blessing']);
    setFinishWord('in');
    setTimeout(() => setFinishWord('out'), 1060);
    setTimeout(() => {
      void handleSubmit();
    }, 1450);
  };

  /** 键盘与按钮共用的前进/后退：可用条件与各步按钮完全一致（不满足时静默不动） */
  const goNext = () => {
    if (step === 'welcome') navigate('name');
    else if (step === 'name') {
      if (canProceedName) navigate('preset');
    } else if (step === 'preset') {
      if (canProceedPreset) navigate(isCustomMode ? 'done' : 'customize');
    } else if (step === 'customize') {
      if (canProceedCustomize) navigate('done');
    } else if (step === 'done') navigate('guide');
    else if (step === 'guide') navigate('blessing');
    else if (step === 'blessing') {
      if (blessingAttr && !submitting) startFinish();
    }
  };

  const prevStep = () => {
    if (step === 'name') navigate('welcome');
    else if (step === 'preset') navigate('name');
    else if (step === 'customize') navigate('preset');
    else if (step === 'done') navigate(isCustomMode ? 'preset' : 'customize');
    else if (step === 'guide') navigate('done');
    else if (step === 'blessing') navigate('guide');
    else if (step === 'import') {
      setImportJson('');
      setImportError(null);
      navigate('welcome');
    }
  };

  // 键盘：Enter 前进 / Esc 返回 / 上下键选择。
  // 输入框里的按键交给元素自己处理（它有自己的 Enter 行为），这里不抢。
  // 不写依赖数组：每次渲染重挂，避免闭包里的 step 与选中项过期。
  useEffect(() => {
    // 引导不显示时（已建档 / 已登录）不接管键盘，免得在主界面上误触
    if (user) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        prevStep();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const down = e.key === 'ArrowDown';
        if (step === 'preset') {
          e.preventDefault();
          const cur = selectedPreset ?? -1;
          handleSelectPreset(down ? Math.min(cur + 1, PRESETS.length - 1) : Math.max(cur - 1, 0));
        } else if (step === 'blessing') {
          e.preventDefault();
          const cur = blessingAttr ? ATTR_IDS.indexOf(blessingAttr) : -1;
          setBlessingAttr(ATTR_IDS[down ? Math.min(cur + 1, ATTR_IDS.length - 1) : Math.max(cur - 1, 0)]);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // 所有 Hook 执行完之后才允许提前返回（原因见上方注释）
  if (user) return null;

  const reduce = prefersReducedMotion();
  const VIEW_CLS =
    'relative z-10 flex min-h-[100dvh] items-center justify-center py-16';
  const WRAP_CLS = 'w-full max-w-[1180px]';
  const viewMotion = (k: string) => ({
    key: k,
    initial: reduce ? (false as const) : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    exit: reduce ? { opacity: 0 } : { opacity: 0, y: -14 },
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: P3R.bg }}>
      <GuideField />
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
        <Floaters step={step} hidden={hiddenFloaters} />
      </div>

      {/* 转场牌：一张牌从背景那张浮牌的实际位置滑出来、翻面成下一屏的牌、再滑回下一屏的位置。
          翻面用两个面（正面=本屏的牌 / 背面=下一屏的牌，各自隐藏背面）——所以翻完自然就是新牌。 */}
      {hero && (
        <motion.div
          aria-hidden
          data-hero="1"
          className="pointer-events-none fixed left-1/2 top-1/2 z-[3]"
          style={{
            width: HERO_W,
            height: HERO_H,
            marginLeft: -HERO_W / 2,
            marginTop: -HERO_H / 2,
            perspective: 1200,
          }}
          initial={{ x: hero.p0.x, y: hero.p0.y, scale: hero.p0.s, opacity: 1 }}
          animate={
            heroPhase === 'back'
              ? { x: hero.p1.x, y: hero.p1.y, scale: hero.p1.s, opacity: 0 }
              : { x: 0, y: 0, scale: 1, opacity: 1 }
          }
          transition={
            heroPhase === 'back'
              ? { duration: 0.38, ease: [0.16, 1, 0.3, 1] }
              : { duration: 0.7, ease: [0.34, 1.38, 0.5, 1] }
          }
        >
          <motion.div
            className="relative h-full w-full"
            style={{ transformStyle: 'preserve-3d' }}
            initial={{ rotateY: 0 }}
            animate={{ rotateY: 180 }}
            transition={{ delay: 0.62, duration: 0.46, ease: [0.65, 0, 0.2, 1] }}
          >
            <img
              src={`/tarot/p3/${CARD_OF[hero.from]}.webp`}
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
              style={{ backfaceVisibility: 'hidden' }}
            />
            <img
              src={`/tarot/p3/${CARD_OF[hero.to]}.webp`}
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            />
          </motion.div>
        </motion.div>
      )}

      {/* 收尾转场（建档提交那一下）：幕布从点击点铺满 → 牌翻成「世界」 → 英文巨词横穿 → 才真正提交。
          时序见 startFinish；幕布一直铺到组件卸载，所以中间不会露出赐福屏。 */}
      {finish && (
        <>
          <motion.div
            aria-hidden
            data-finish="veil"
            className="pointer-events-none fixed inset-0 z-[60]"
            style={{ background: P3R.blue }}
            initial={{ clipPath: `circle(0px at ${finish.x}px ${finish.y}px)` }}
            animate={{ clipPath: `circle(170vmax at ${finish.x}px ${finish.y}px)` }}
            transition={{ duration: 0.76, ease: [0.65, 0, 0.2, 1] }}
          />
          <motion.div
            aria-hidden
            data-finish="card"
            className="pointer-events-none fixed left-1/2 top-1/2 z-[65]"
            style={{
              width: HERO_W,
              height: HERO_H,
              marginLeft: -HERO_W / 2,
              marginTop: -HERO_H / 2,
              perspective: 1200,
            }}
            initial={{ x: finish.p0.x, y: finish.p0.y, scale: finish.p0.s }}
            animate={{ x: 0, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.34, 1.38, 0.5, 1] }}
          >
            <motion.div
              className="relative h-full w-full"
              style={{ transformStyle: 'preserve-3d' }}
              initial={{ rotateY: 0 }}
              animate={{ rotateY: 180 }}
              transition={{ delay: 0.62, duration: 0.46, ease: [0.65, 0, 0.2, 1] }}
            >
              <img
                src={`/tarot/p3/${CARD_OF.blessing}.webp`}
                alt=""
                className="absolute inset-0 h-full w-full object-contain"
                style={{ backfaceVisibility: 'hidden' }}
              />
              <img
                src={`/tarot/p3/${FINISH_CARD}.webp`}
                alt=""
                className="absolute inset-0 h-full w-full object-contain"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              />
            </motion.div>
          </motion.div>
          <motion.span
            aria-hidden
            data-finish="word"
            className="pointer-events-none fixed left-0 top-1/2 z-[70] whitespace-nowrap font-black text-white"
            style={{
              fontFamily: "'Syncopate', 'Velvet Sans SC', sans-serif",
              fontSize: 'clamp(110px,28vw,430px)',
              lineHeight: 0.78,
              letterSpacing: '-0.05em',
            }}
            initial={{ x: '-42%', y: '-50%', opacity: 0 }}
            animate={
              finishWord === 'out'
                ? { x: '34%', y: '-50%', opacity: 0 }
                : { x: '-4%', y: '-50%', opacity: 1 }
            }
            transition={
              finishWord === 'out' ? { duration: 0.3, ease: [0.16, 1, 0.3, 1] } : { duration: 0.3, delay: 0.76, ease: [0.16, 1, 0.3, 1] }
            }
          >
            MASKARIA
          </motion.span>
        </>
      )}

      {/* 楼层信息卡（左上）与按键提示条（右下）：真图每屏都有，用固定层挂住 */}
      <div
        className="pointer-events-none fixed left-0 right-0 top-0 z-20 flex items-start justify-start"
        style={{ padding: 'clamp(14px,2vh,28px) clamp(18px,3.4vw,64px)' }}
      >
        <InfoCard step={stepNo} total={STEP_ORDER.length} />
      </div>
      <div
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-20 flex items-end justify-end"
        style={{ padding: 'clamp(14px,2vh,26px) clamp(18px,3.4vw,64px)' }}
      >
        <KeyHint items={keyHints[step]} />
      </div>

      <AnimatePresence mode="wait">
        {/* ── 一 · 面具庭园 ── */}
        {step === 'welcome' && (
          <motion.section {...viewMotion('welcome')} className={VIEW_CLS}>
            {/* 首屏巨名不受内容区 1180px 限制：它要像 demo 那样几乎占满整幅 */}
            <div className="w-full" style={{ padding: '0 clamp(18px,3.4vw,64px)' }}>
              <h1 className="relative">
                <span
                  className="block font-black leading-[0.82] tracking-[-0.04em]"
                  style={{
                    fontSize: 'clamp(42px,12.5vw,225px)',
                    color: P3R.ink,
                    fontFamily: "'Syncopate', 'Velvet Sans SC', sans-serif",
                  }}
                >
                  MASKARIA
                </span>
                <span className="mt-[-0.06em] flex items-center">
                  <span
                    className="inline-block font-black leading-none"
                    style={{
                      fontSize: 'calc(clamp(42px,12.5vw,225px) * 0.4)',
                      color: '#fff',
                      background: P3R.blue,
                      padding: '.06em .44em .12em .12em',
                      clipPath: 'polygon(0 0, 100% 0, calc(100% - .30em) 100%, 0 100%)',
                    }}
                  >
                    面具庭园
                  </span>
                  <span className="inline-block" style={{ marginLeft: 14 }}>
                    <TitlePeriod />
                  </span>
                </span>
              </h1>

              <p
                className="mt-8 max-w-[660px] text-[clamp(14px,1.05vw,17px)] font-black leading-[2]"
                style={{ color: P3R.inkSoft }}
              >
                <b style={{ color: P3R.ink }}>每一次行动，都化作灵魂成长的印记。</b>
                <br />
                写下今天做了什么，它会变成你的五项人格指数。记录、任务、记账、同伴，与影时间的战斗，都从这里开始。
              </p>

              <ActBar primaryLabel="开始设定" onPrimary={() => navigate('name')} />

              <button
                type="button"
                onClick={() => navigate('import')}
                className="mt-6 block text-[13px] font-black underline-offset-4 hover:underline"
                style={{ color: P3R.grey }}
              >
                我已经是客人了
              </button>
            </div>
          </motion.section>
        )}

        {/* ── 二 · 名字 ── */}
        {step === 'name' && (
          <motion.section {...viewMotion('name')} className={VIEW_CLS}>
            <div className={WRAP_CLS}>
              <SectionMark
                title="你叫什么名字"
                meta={<span className="text-[12px] font-black" style={{ color: P3R.grey }}>01 / 07</span>}
              />
              <p className="mt-5 text-[14px] font-black leading-relaxed" style={{ color: P3R.inkSoft }}>
                这将是你在面具庭园里的称呼。真名、笔名、代号都行。
              </p>

              <div className="mt-7">
                <label htmlFor="guide-name" className="sr-only">你的昵称</label>
                <input
                  id="guide-name"
                  type="text"
                  value={name}
                  maxLength={16}
                  autoFocus
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && canProceedName) navigate('preset');
                  }}
                  placeholder="写下你的称呼"
                  className="w-full max-w-[560px] px-5 py-4 text-[clamp(20px,2.2vw,30px)] font-black outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.95)',
                    color: P3R.ink,
                    clipPath: slantClip(10),
                    boxShadow: `inset 0 0 0 2px ${P3R.blue}`,
                  }}
                />
                <p className="mt-3 text-[12px] font-black" style={{ color: P3R.grey }}>
                  按 Enter 直接进入下一步，之后随时能在设置里改。
                </p>
              </div>

              <ActBar
                onBack={() => navigate('welcome')}
                primaryLabel="接入"
                primaryTone="soft"
                disabled={!canProceedName}
                onPrimary={() => navigate('preset')}
              />
            </div>
          </motion.section>
        )}

        {/* ── 三 · 成长风格 ── */}
        {step === 'preset' && (
          <motion.section {...viewMotion('preset')} className={VIEW_CLS}>
            <div className={WRAP_CLS}>
              <SectionMark
                title="选择成长风格"
                meta={<span className="text-[12px] font-black" style={{ color: P3R.grey }}>02 / 07</span>}
              />
              <p className="mt-5 text-[14px] font-black leading-relaxed" style={{ color: P3R.inkSoft }}>
                它会预置你五项属性的名称。之后在设置里随时能改。
              </p>

              <div className="mt-7 flex max-w-[880px] flex-col gap-2.5" role="group" aria-label="成长风格">
                {PRESETS.map((preset, index) => {
                  const selected = selectedPreset === index;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => handleSelectPreset(index)}
                      className="relative flex items-center gap-4 px-5 py-4 text-left"
                      style={{
                        clipPath: slantClip(10),
                        background: selected ? P3R.blue : 'rgba(255,255,255,0.94)',
                        color: selected ? '#fff' : P3R.ink,
                        boxShadow: selected ? 'none' : 'inset 0 0 0 2px rgba(27,87,255,0.20)',
                      }}
                    >
                      <span
                        aria-hidden
                        className="h-[18px] w-[13px] shrink-0"
                        style={{
                          background: selected ? '#fff' : P3R.blue,
                          clipPath: 'polygon(32% 0, 100% 0, 68% 100%, 0 100%)',
                        }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[19px] font-black leading-none">{preset.label}</span>
                        <span
                          className="mt-1.5 block text-[12px] font-black leading-relaxed"
                          style={{ color: selected ? 'rgba(255,255,255,0.88)' : P3R.grey }}
                        >
                          {preset.desc}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <ActBar
                onBack={() => navigate('name')}
                primaryLabel="记录"
                primaryTone="soft"
                disabled={!canProceedPreset}
                onPrimary={handlePresetNext}
              />
            </div>
          </motion.section>
        )}

        {/* ── 四 · 属性名 ── */}
        {step === 'customize' && (
          <motion.section {...viewMotion('customize')} className={VIEW_CLS}>
            <div className={WRAP_CLS}>
              <div className="flex items-end gap-5">
                <h2
                  className="font-black leading-[1.1]"
                  style={{ fontSize: 'clamp(26px,3.4vw,44px)', color: P3R.ink }}
                >
                  逐个改属性名
                  <span className="ml-2 inline-block align-[0.35em]">
                    <TitlePeriod />
                  </span>
                </h2>
                <span
                  className="font-black italic leading-none"
                  style={{ fontSize: 'clamp(44px,6vw,86px)', color: P3R.blue }}
                >
                  5
                </span>
              </div>
              <p className="mt-5 text-[14px] font-black leading-relaxed" style={{ color: P3R.inkSoft }}>
                下面是预设的名，都能换成你更顺口的说法。两个字最好看。
              </p>

              <div className="mt-7 flex max-w-[760px] flex-col gap-2">
                {ATTR_IDS.map((id, i) => (
                  <div key={id} className="flex items-center gap-3">
                    <span className="w-7 shrink-0 text-[13px] font-black" style={{ color: P3R.blue }}>
                      {ATTR_ORDINAL[id]}
                    </span>
                    <label htmlFor={`guide-attr-${id}`} className="sr-only">
                      第 {i + 1} 项属性名称
                    </label>
                    <input
                      id={`guide-attr-${id}`}
                      type="text"
                      value={attrNames[id]}
                      maxLength={8}
                      placeholder={DEFAULT_ATTR_PLACEHOLDERS[id]}
                      onChange={e => setAttrNames(prev => ({ ...prev, [id]: e.target.value }))}
                      className="w-full max-w-[420px] px-4 py-3 text-[19px] font-black outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.95)',
                        color: P3R.ink,
                        clipPath: slantClip(8),
                        boxShadow: 'inset 0 0 0 2px rgba(27,87,255,0.22)',
                      }}
                    />
                  </div>
                ))}
              </div>

              <ActBar
                onBack={() => navigate('preset')}
                primaryLabel="归档"
                disabled={!canProceedCustomize}
                onPrimary={() => navigate('done')}
              />
            </div>
          </motion.section>
        )}

        {/* ── 五 · 完成 ── */}
        {step === 'done' && (
          <motion.section {...viewMotion('done')} className={VIEW_CLS}>
            <div className={WRAP_CLS}>
              <h2 className="font-black leading-tight" style={{ fontSize: 'clamp(30px,4.2vw,56px)', color: P3R.ink }}>
                你好，{name || '客人'}
                <span className="ml-2 inline-block align-[0.35em]">
                  <TitlePeriod />
                </span>
              </h2>
              <p className="mt-5 max-w-[660px] text-[14px] font-black leading-relaxed" style={{ color: P3R.inkSoft }}>
                五项属性已经就位。所有技能说明与成就文案，会跟着属性名一起变。
              </p>

              <div className="mt-8 flex max-w-[820px] flex-wrap gap-2.5">
                {ATTR_IDS.map(id => (
                  <div
                    key={id}
                    className="flex min-w-[96px] flex-1 flex-col items-center gap-2 px-3 py-5"
                    style={{ background: 'rgba(255,255,255,0.95)', clipPath: slantClip(8) }}
                  >
                    <span className="text-[30px] font-black italic leading-none" style={{ color: P3R.blue }}>
                      1
                    </span>
                    <span className="text-[13px] font-black" style={{ color: P3R.ink }}>
                      {attrNames[id]}
                    </span>
                  </div>
                ))}
              </div>

              <ActBar
                onBack={() => setStep(isCustomMode ? 'preset' : 'customize')}
                primaryLabel="继续"
                onPrimary={() => navigate('guide')}
              />
            </div>
          </motion.section>
        )}

        {/* ── 六 · 七件事 ── */}
        {step === 'guide' && (
          <motion.section {...viewMotion('guide')} className={VIEW_CLS}>
            <div className={WRAP_CLS}>
              <div className="flex items-end gap-5">
                <h2
                  className="font-black leading-[1.1]"
                  style={{ fontSize: 'clamp(26px,3.4vw,44px)', color: P3R.ink }}
                >
                  七件事，看完就能开始
                  <span className="ml-2 inline-block align-[0.35em]">
                    <TitlePeriod />
                  </span>
                </h2>
                <span
                  className="font-black italic leading-none"
                  style={{ fontSize: 'clamp(44px,6vw,86px)', color: P3R.blue }}
                >
                  7
                </span>
              </div>
              <p className="mt-5 text-[14px] font-black leading-relaxed" style={{ color: P3R.inkSoft }}>
                {name || '客人'}，七件事，看完就能开始。
              </p>

              <div className="mt-7 grid max-w-[960px] gap-x-10 gap-y-3.5 md:grid-cols-2">
                {SEVEN_THINGS.map((t, i) => (
                  <div key={t.title} className="flex items-baseline gap-3">
                    <span className="shrink-0 text-[12px] font-black" style={{ color: P3R.blue }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p className="text-[13px] font-black leading-relaxed" style={{ color: P3R.inkSoft }}>
                      <b className="mr-2 text-[16px]" style={{ color: P3R.ink }}>
                        {t.title}
                      </b>
                      {t.desc}
                    </p>
                  </div>
                ))}
              </div>

              <P3EmptySlab className="mt-8 max-w-[560px]" />

              <ActBar
                onBack={() => navigate('done')}
                primaryLabel="继续"
                onPrimary={() => navigate('blessing')}
              />
            </div>
          </motion.section>
        )}

        {/* ── 七 · 馆长的赐福 ── */}
        {step === 'blessing' && (
          <motion.section {...viewMotion('blessing')} className={VIEW_CLS}>
            <div className={WRAP_CLS}>
              <SectionMark
                title="馆长的赐福"
                meta={<span className="text-[12px] font-black" style={{ color: P3R.grey }}>07 / 07</span>}
              />
              <p className="mt-5 max-w-[720px] text-[14px] font-black leading-relaxed" style={{ color: P3R.inkSoft }}>
                既然你踏进了面具庭园，说明不是等闲之辈。初次来访有一份礼遇，挑一项你最擅长的，往后每次加点都额外 +1。
              </p>

              <div className="mt-7 flex max-w-[880px] flex-wrap gap-2.5">
                {ATTR_IDS.map(id => {
                  const selected = blessingAttr === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setBlessingAttr(id)}
                      className="px-7 py-3.5 text-[18px] font-black"
                      style={{
                        clipPath: slantClip(10),
                        background: selected ? P3R.magenta : 'rgba(255,255,255,0.95)',
                        color: selected ? '#fff' : P3R.ink,
                        boxShadow: selected ? 'none' : `inset 0 0 0 2px ${P3R.blue}`,
                      }}
                    >
                      {attrNames[id] || '未命名'}
                    </button>
                  );
                })}
              </div>

              {submitError && (
                <div
                  role="alert"
                  className="mt-6 max-w-[720px] px-4 py-3 text-[12px] font-black leading-relaxed"
                  style={{ background: 'rgba(240,65,127,0.12)', color: P3R.magenta, clipPath: slantClip(8) }}
                >
                  <span className="mr-1">建档没能完成：</span>
                  <span className="break-all">{submitError}</span>
                </div>
              )}

              <ActBar
                onBack={() => navigate('guide')}
                primaryLabel={submitting ? '正在建档…' : submitError ? '再试一次' : '接受赐福，开始旅程'}
                disabled={!blessingAttr || submitting}
                onPrimary={startFinish}
              />
            </div>
          </motion.section>
        )}

        {/* ── 旁支 · 我已经是客人了（登录 / 备份导入）── */}
        {step === 'import' && (
          <motion.section {...viewMotion('import')} className={VIEW_CLS}>
            <div className={WRAP_CLS}>
              <SectionMark title="我已经是客人了" />
              <p className="mt-5 max-w-[660px] text-[14px] font-black leading-relaxed" style={{ color: P3R.inkSoft }}>
                登录云端同步，自动拉取你的所有数据；或用本地备份文件导入。
              </p>

              <div className="mt-7 flex max-w-[660px] flex-col gap-4">
                {cloudEnabled && (
                  <SlantButton onClick={() => setShowLoginModal(true)} magentaCorner>
                    登录云端同步
                  </SlantButton>
                )}

                <textarea
                  rows={4}
                  placeholder={'粘贴备份 JSON 文本\n（以 {"user":... 开头）'}
                  value={importJson}
                  onChange={e => {
                    setImportJson(e.target.value);
                    setImportError(null);
                  }}
                  className="w-full resize-none px-4 py-3 text-[12px] font-black outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.95)',
                    color: P3R.ink,
                    clipPath: slantClip(8),
                    boxShadow: 'inset 0 0 0 2px rgba(27,87,255,0.22)',
                  }}
                />

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                    e.target.value = '';
                  }}
                />

                <SlantButton tone="ghost" onClick={() => fileInputRef.current?.click()}>
                  {importJson ? '✓ 文件已加载' : isNative() ? '从文件管理器选择备份文件' : '选择备份文件（或拖拽至此）'}
                </SlantButton>

                {importError && (
                  <p role="alert" className="text-[12px] font-black" style={{ color: P3R.magenta }}>
                    {importError}
                  </p>
                )}
              </div>

              <ActBar
                onBack={() => {
                  navigate('welcome');
                  setImportJson('');
                  setImportError(null);
                }}
                primaryLabel={importLoading ? '正在导入…' : '确认导入'}
                disabled={!importJson.trim() || importLoading}
                onPrimary={handleImport}
              />
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* 云端登录弹窗 —— 首屏「我已经是客人了」入口 */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        origin="welcome"
        onSuccess={async () => {
          try {
            const result = await syncOnLogin();
            if (result === 'conflict') {
              useCloudStore.getState().setConflictPending(true);
            }
          } catch {
            /* 错误已由 sync 内部记录到 cloudStore.lastError */
          }
        }}
      />
    </div>
  );
};
