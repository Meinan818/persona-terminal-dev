/**
 * HeavyTransition.p3r —— 重转场演示（真实 src/components/transition/HeavyTransition.tsx 的 p3 分支 + App.tsx 圆形揭示 + P3RPage 入场）。
 *   WaveSliceAct（p3 频道幕布；侧栏 / 轮盘 / 菜单 / 页内入口）：五条竖栅（白 / 樱粉 / 玫红 / 藕紫 / 奶油）装在 skewX(-12°) 的出血容器里
 *     左右交错合拢（.26s，错帧 .035，ease [.16,1,.3,1]）→ 300ms midpoint 切页 → 中心藕紫 + 珊瑚句点 spring 戳入（delay .24）→
 *     400ms 反向滑开（.3s）→ 740ms 收场。
 *   WaterRippleAct（底导切页）：0ms 即切页（同帧开始），两圈环（粗玫红 .78 / 细藕紫 .65；真实 RIPPLE_PALETTE 无 pink 键）
 *     从指尖原点 scale 涨开（先慢后快 ease-in，.265s / .329s，第二圈 delay .07），衰减压在后段；新页同原点圆形揭示 540ms；760ms 收场。
 *   PageEnter（?demo=enter）：新页内容层斜切滑入 → 页头玫红斜块 / 标题 clip 揭示 / 双片句点 → SectionMark → 分层 stagger。
 * 演示：自动在 300ms 后开播一次；「再播一次」重放；?stage=cover 定格在合拢（遮满）帧；?stage=out 只看滑开；?to=… 切换目标页文案。
 * 低动效：同步切页（直出终态）+ 新页淡入。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import { P3Button, P3PageHeader, P3ListRow, SectionMark, P3R, slantClip, BigSlantTitle, TitlePeriod } from '@pink/kit';
import { P3Stagger, P3StaggerItem, PinkStage } from '@pink/fx';
import { useBoldness } from '@pink/lib/prefs';
import { StageChip, TRI_CLIP, cyanA } from '@pink/screens/pkg1/fxbits';

const SLATS = [
  { bg: '#ffffff', from: -1 },
  { bg: 'var(--p3r-cyan-pale)', from: 1 },
  { bg: 'var(--p3r-blue)', from: -1 },
  { bg: 'var(--p3r-cyan)', from: 1 },
  { bg: '#fff3f7', from: -1 },
];

/** WaveSliceAct（粉）：phase 由外部时间轴驱动，可定格 */
export const WaveSliceP3 = ({ phase }: { phase: 'in' | 'out' }) => (
  <div aria-hidden className="pointer-events-auto fixed inset-0 overflow-hidden" style={{ zIndex: 'var(--p3r-z-transition)' as unknown as number }}>
    <div className="absolute inset-[-30%]" style={{ transform: 'skewX(-12deg)' }}>
      {SLATS.map((sl, i) => (
        <motion.div key={i} className="absolute bottom-0 top-0" style={{ background: sl.bg, width: '21%', left: `${i * 20}%`, borderRight: i % 2 ? undefined : `2px solid ${cyanA(0.55)}` }}
          initial={{ x: `${sl.from * 160}vw` }} animate={{ x: phase === 'in' ? '0vw' : `${-sl.from * 160}vw` }}
          transition={{ duration: phase === 'in' ? 0.26 : 0.3, delay: i * 0.035, ease: [0.16, 1, 0.3, 1] }} />
      ))}
    </div>
    <motion.div className="absolute left-1/2 top-1/2" style={{ width: 84, height: 40, marginLeft: -42, marginTop: -20 }}
      initial={{ scale: 0, opacity: 0 }} animate={phase === 'in' ? { scale: 1, opacity: 1 } : { scale: 0.6, opacity: 0 }}
      transition={phase === 'in' ? { type: 'spring', stiffness: 420, damping: 18, delay: 0.24 } : { duration: 0.16 }}>
      <span className="absolute left-0 top-0 h-full w-[52px]" style={{ background: 'var(--p3r-cyan)', clipPath: TRI_CLIP }} />
      <span className="absolute left-[44px] top-[10px] h-[26px] w-[36px]" style={{ background: 'var(--p3r-magenta)', clipPath: TRI_CLIP }} />
    </motion.div>
  </div>
);

const RIPPLE_LINES = [
  { w: 41, reach: 1.0, d: 0.5, delay: 0, o: 0.72, c: 'var(--p3r-blue)', a: 0.78 },
  { w: 65, reach: 0.86, d: 0.62, delay: 0.07, o: 0.62, c: 'var(--p3r-cyan)', a: 0.65 },
];
/** WaterRippleAct（粉）：两圈环画成终态尺寸，只做合成器 scale + opacity（同真实 nav-ripple 关键帧） */
export const WaterRippleP3 = ({ origin, freeze }: { origin: { x: number; y: number }; freeze?: boolean }) => {
  const w = window.innerWidth, h = window.innerHeight;
  const full = Math.hypot(Math.max(origin.x, w - origin.x), Math.max(origin.y, h - origin.y)) * 2.1;
  const k = Math.min(1.5, Math.max(0.8, Math.min(w, h) / 390));
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 'var(--p3r-z-transition)' as unknown as number }}>
      <style>{`
        @keyframes pk1-nr-scale { from { transform: translate(-50%,-50%) scale(var(--nr-from)); } to { transform: translate(-50%,-50%) scale(1); } }
        @keyframes pk1-nr-fade { 0% { opacity: var(--nr-o); } 60% { opacity: calc(var(--nr-o) * 0.88); } 88% { opacity: calc(var(--nr-o) * 0.46); } 100% { opacity: 0; } }
      `}</style>
      {RIPPLE_LINES.map((ln, i) => {
        const dia = Math.round(full * ln.reach * 0.63);
        const dur = Math.round(ln.d * 0.53 * 1000);
        return (
          <span key={i} className="absolute rounded-full" style={{
            left: origin.x, top: origin.y, width: dia, height: dia, border: `${Math.round(ln.w * k)}px solid ${ln.c}`, boxSizing: 'border-box',
            ['--nr-from' as string]: Math.max(0.03, 76 / dia).toFixed(3), ['--nr-o' as string]: String(ln.o * ln.a),
            transform: freeze ? 'translate(-50%,-50%) scale(0.55)' : undefined, opacity: freeze ? ln.o * ln.a : undefined,
            animation: freeze ? undefined : `pk1-nr-scale ${dur}ms cubic-bezier(0.55,0.06,0.68,0.19) ${ln.delay}s both, pk1-nr-fade ${dur}ms linear ${ln.delay}s both`,
          } as CSSProperties} />
        );
      })}
    </div>
  );
};

/** 演示用两张页：首页（出发）/ 目标页（到达，带 P3RPage 入场） */
const PageHome = () => (
  <div className="px-4 pt-6 wide:px-10">
    <h1 className="relative inline-flex items-end font-heavy text-[clamp(40px,12vw,54px)] leading-[0.95]" style={{ color: P3R.ink }}>MASKARIA<TitlePeriod className="mb-1.5 ml-1.5" /></h1>
    <p className="mt-2 text-[15px] font-bold" style={{ color: P3R.roseInk }}>今天的努力从这里出发</p>
    <SectionMark className="mt-7" tri title="今日任务" />
    <div className="mt-3 space-y-2">{['晨跑 3 公里', '背 30 个单词', '给家里打电话'].map((t) => <P3ListRow key={t} title={t} meta="知识 +1" />)}</div>
  </div>
);
const PageTarget = ({ to, anim }: { to: string; anim: boolean }) => {
  const meta: Record<string, { t: string; en: string; rows: string[] }> = {
    actions: { t: '行动', en: 'ACTIONS', rows: ['今日记录 3 条', '任务 4 / 7', '本周目标 · 第 3 天'] },
    cooperation: { t: '羁绊', en: 'SOCIAL LINK', rows: ['由香里 · RANK 6', '顺平 · RANK 4', '风花 · RANK 3'] },
    ledger: { t: '记账', en: 'ACCOUNT', rows: ['本月支出 ¥ 1,284', '预算剩余 62%', '昨日 · 午餐 ¥ 32'] },
    menu: { t: '菜单', en: 'MENU', rows: ['成就图鉴', '统计', '设置'] },
  };
  const m = meta[to] ?? meta.actions;
  return (
    <motion.div className="px-4 pt-6 wide:px-10" initial={anim ? { opacity: 0, x: -18 } : { opacity: 0 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: anim ? 0.3 : 0.08, ease: [0.22, 0.9, 0.3, 1] }}>
      <P3PageHeader title={m.t} en={m.en} subtitle="新页内容层斜切滑入，分层错帧就位" />
      <SectionMark tri title="概况" en="OVERVIEW" />
      <P3Stagger className="mt-3 grid grid-cols-1 gap-2" gap={0.06}>
        {m.rows.map((r, i) => <P3StaggerItem key={r} from={i % 2 ? 'right' : 'left'}><P3ListRow title={r} eyebrow={`0${i + 1}`} trailing="chevron" /></P3StaggerItem>)}
      </P3Stagger>
      <P3StaggerItem from="up"><BigSlantTitle className="mt-6" title="本周" count="5/7" /></P3StaggerItem>
    </motion.div>
  );
};

function TransitionDemo({ kind, params }: { kind: 'wave' | 'water' | 'enter'; params?: URLSearchParams }) {
  const anim = useBoldness();
  const stage = params?.get('stage');
  const to = params?.get('to') ?? (kind === 'water' ? 'actions' : 'cooperation');
  const [run, setRun] = useState(0);
  const [page, setPage] = useState<'home' | 'target'>(kind === 'enter' || stage === 'out' ? 'target' : 'home');
  const [fx, setFx] = useState<null | 'in' | 'out'>(stage === 'cover' ? 'in' : null);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    if (stage === 'cover') { setPage('target'); return; }
    const ids: number[] = [];
    const at = (ms: number, fn: () => void) => ids.push(window.setTimeout(fn, ms));
    const o = { x: window.innerWidth * (kind === 'water' ? 0.3 : 0.5), y: window.innerHeight - 34 };
    setOrigin(o);
    if (kind === 'enter') { setPage('home'); at(300, () => setPage('target')); return () => ids.forEach(clearTimeout); }
    if (stage === 'out') { setPage('target'); setFx('in'); at(300, () => setFx('out')); at(640, () => setFx(null)); return () => ids.forEach(clearTimeout); }
    setPage('home'); setFx(null); setReveal(false);
    if (!anim) { at(300, () => setPage('target')); return () => ids.forEach(clearTimeout); }
    const T0 = 300;
    if (kind === 'wave') {
      at(T0, () => setFx('in'));
      at(T0 + 300, () => setPage('target'));          // midpoint
      at(T0 + 400, () => setFx('out'));
      at(T0 + 740, () => setFx(null));               // onDone
    } else {
      at(T0, () => { setFx('in'); setPage('target'); setReveal(true); }); // 0ms midpoint：与波纹同帧
      at(T0 + 760, () => setFx(null));
      at(T0 + 600, () => setReveal(false));
    }
    return () => ids.forEach(clearTimeout);
  }, [run, kind, stage, anim]);

  const R = Math.hypot(Math.max(origin.x, window.innerWidth - origin.x), Math.max(origin.y, window.innerHeight - origin.y));
  const chip = kind === 'wave' ? 'WAVE SLICE' : kind === 'water' ? 'WATER RIPPLE' : 'PAGE ENTER';
  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ background: 'var(--p3r-bg)' }}>
      <PinkStage variant="page" />
      <StageChip text={`${chip}${stage ? ` · ${stage.toUpperCase()}` : ''}`} />
      <div className="relative z-10 mx-auto max-w-page pb-28">
        <AnimatePresence mode="popLayout" initial={false}>
          {page === 'home' ? (
            <motion.div key="home" exit={{ opacity: 1 }}><PageHome /></motion.div>
          ) : (
            <motion.div key={`t${run}`} style={kind === 'water' && reveal ? { clipPath: `circle(${R}px at ${origin.x}px ${origin.y}px)` } : undefined}
              initial={kind === 'water' && anim && reveal ? { clipPath: `circle(0px at ${origin.x}px ${origin.y}px)` } : false}
              animate={kind === 'water' && anim && reveal ? { clipPath: `circle(${R + 40}px at ${origin.x}px ${origin.y}px)` } : undefined}
              transition={{ duration: 0.54, ease: [0.3, 0, 0.2, 1] }}>
              <PageTarget to={to} anim={anim} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* 演示底栏：指尖原点所在 */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex h-[64px] items-center justify-around border-t" style={{ background: P3R.panel, borderColor: cyanA(0.45) }}>
        {['首页', '行动', '●', '羁绊', '菜单'].map((t, i) => (
          <span key={t} className="relative flex h-full flex-1 items-center justify-center text-[11px] font-black" style={{ color: (page === 'target' ? (kind === 'water' ? 1 : 3) : 0) === i ? 'var(--p3r-on-blue)' : P3R.grey }}>
            {(page === 'target' ? (kind === 'water' ? 1 : 3) : 0) === i && <span aria-hidden className="absolute inset-x-1 bottom-1.5 top-1" style={{ background: P3R.blue, clipPath: slantClip(10) }} />}
            <span className="relative">{t}</span>
          </span>
        ))}
      </div>
      {fx && kind === 'wave' && <WaveSliceP3 phase={fx} />}
      {fx && kind === 'water' && <WaterRippleP3 origin={origin} freeze={stage === 'cover'} />}
      <div className="fixed bottom-[84px] right-3 z-30">
        <P3Button size="sm" tone="ink" onClick={() => { setRun((r) => r + 1); }}>再播一次</P3Button>
      </div>
    </div>
  );
}

export const WaveDemo = ({ params }: OverlayProps) => <TransitionDemo kind={params?.get('demo') === 'enter' ? 'enter' : 'wave'} params={params} />;
export const WaterDemo = ({ params }: OverlayProps) => <TransitionDemo kind="water" params={params} />;
export default WaveDemo;
export type { ReactNode };
