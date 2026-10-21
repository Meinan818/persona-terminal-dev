/**
 * 年度回顾舞台（真实 src/components/annual/YearRecapStage.tsx 的 p3 分支）：整屏分幕，一页一张卡，点屏幕翻下一张，右上「跳过 ›」直达最后的信。
 *   p3 舞台：P3R.bg + 水面底图（粉版 = 樱色舞台 PinkStage 纹理）+ veil 渐变；每翻一页从中心推开一圈藕紫水波（scale .2→18，1.1s）；
 *   每页背景一个幽灵英文大字；卡面 = panel-glass 斜切（slantClip 22）+ 右下藕紫三角；标题 = 玫红竖斜片 + 粗斜体；
 *   入场 spring(320/30)：x 72 → 0、skewX -8 → 0；退场 x -72 / skewX 6；数字 count-up 900ms。
 *   顶部进度段 + 跳过；底部「点击屏幕继续 · i/N」（.8s 后淡入）；← → / Enter / 空格键盘翻页。
 * 幕：这一年的你 / 来过的日子 / 最晚的一夜 / 长成的样子 / 没断过的日子 / 待办打卡 / 照片 / 高光时刻 / 倒计时 / 命运与愿望 / 你的记忆 / 天气 / 一封信
 *    （「拆开这封信」→ 信正文逐字；写信中「先去看它边写 ›」；失败「回去看看 ›」）。
 * 直达：?page=letter（末页一封信）| ?act=N；?letter=writing|failed；演出直达（无 page/act）时前几幕每 1.9s 自动翻页，任一点击即交还手动。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import { Portal, useScrollLock, GhostWords, P3R, slantClip } from '@pink/kit';
import { PinkStage, useAIStream } from '@pink/fx';
import { useBoldness } from '@pink/lib/prefs';
import { Photo } from '@pink/screens/pkg2/common';

const LETTER = `直斗：

这一年，你像在雾里走路的人——看不清远处，却一步也没停。

你来过 286 天，记下 388 条。最晚的那一夜是 11 月 3 日凌晨三点，你写下「终于把论文的第一章写完了」。我记得那一句，因为后面跟着的是连续 41 天没有断过的日子。

你长得最多的是知识，但我更想说的是温柔：那些给家里打的电话、帮同桌讲的题，都被你好好记下来了。

明年，也请继续把小事记下来。我会在这里。

—— 温柔馆长`;

function useCountUp(target: number, run: boolean, ms = 900): number {
  const anim = useBoldness();
  const [v, setV] = useState(anim ? 0 : target);
  useEffect(() => {
    if (!run || !anim) { setV(target); return; }
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => { const p = Math.min(1, (t - t0) / ms); setV(Math.round(target * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms, anim]);
  return v;
}
const Num = ({ value, unit, prefix }: { value: number; unit: string; prefix?: string }) => {
  const shown = useCountUp(value, true);
  return (
    <div className="mt-4 flex items-baseline gap-1.5 leading-none" style={{ color: P3R.blue }}>
      {prefix && <span className="font-cond text-[40px]">{prefix}</span>}
      <span className="font-cond tabular" style={{ fontSize: 'min(26vw, 120px)' }}>{shown}</span>
      <span className="font-heavy text-[22px]" style={{ color: P3R.ink }}>{unit}</span>
    </div>
  );
};
const Title = ({ text }: { text: string }) => (
  <div className="flex items-center gap-2.5">
    <span aria-hidden className="h-[26px] w-[11px] shrink-0" style={{ background: P3R.blue, clipPath: slantClip(4) }} />
    <span className="font-heavy text-[clamp(22px,6.6vw,26px)] leading-none" style={{ color: P3R.ink }}>{text}</span>
  </div>
);
const Sub = ({ children }: { children: ReactNode }) => <div className="mt-2 text-[15px] font-black leading-snug" style={{ color: P3R.ink }}>{children}</div>;
const Cap = ({ children }: { children: ReactNode }) => <div className="mt-2 text-[13px] leading-relaxed" style={{ color: P3R.grey }}>{children}</div>;
const Quote = ({ children }: { children: ReactNode }) => <div className="mt-3 px-4 py-2.5 text-[14px] font-bold" style={{ background: P3R.cyanFaint, clipPath: slantClip(10), color: P3R.ink }}>{children}</div>;
const Chip = ({ children }: { children: ReactNode }) => <span className="shrink-0 px-2 py-0.5 font-cond text-[12px]" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(5) }}>{children}</span>;
const stagger = (anim: boolean, i: number) => ({ initial: anim ? { opacity: 0, x: 18 } : false as const, animate: { opacity: 1, x: 0 }, transition: { delay: 0.25 + i * 0.08 } });

type LetterState = 'ready' | 'writing' | 'failed' | 'opened';
function LetterPage({ state, setState, onClose, anim }: { state: LetterState; setState: (s: LetterState) => void; onClose: () => void; anim: boolean }) {
  const ai = useAIStream({ text: LETTER, thinkMs: 600, cps: 46 });
  const ready = state === 'ready' || state === 'opened';
  useEffect(() => { if (state === 'opened' && ai.phase === 'idle') ai.start(); }, [state]); // eslint-disable-line
  return (
    <>
      <Title text="一封信" />
      <div className="mt-2 text-[14px] font-black" style={{ color: P3R.ink }}>✧ 温柔馆长给你写了一封信</div>
      {state !== 'opened' && (
        <motion.div className="relative mx-auto mt-5 h-[120px] w-[180px]" animate={anim && ready ? { y: [0, -8, 0] } : undefined} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} aria-hidden>
          <div className="absolute inset-0" style={{ background: P3R.cyanPale, clipPath: slantClip(10) }} />
          <motion.div className="absolute inset-x-0 top-0 h-[60%] origin-top" style={{ background: P3R.blue, clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} animate={{ rotateX: ready ? 0 : 0 }} />
          <div className="absolute left-1/2 top-[44%] -ml-[18px] flex h-9 w-9 items-center justify-center rounded-full text-[16px]" style={{ background: P3R.magenta, color: '#fff' }}>✦</div>
        </motion.div>
      )}
      {state === 'writing' && (
        <>
          <Cap>正在落笔，已经写了 320 字…</Cap>
          <div className="relative mt-2 h-[6px] overflow-hidden" style={{ background: 'var(--p3r-track)', clipPath: slantClip(3) }}>
            {anim && <motion.span className="absolute inset-y-0 w-1/3" style={{ background: P3R.blue }} animate={{ x: ['-100%', '300%'] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }} />}
          </div>
          <button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }} className="mt-4 px-5 py-2.5 text-[14px] font-black" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(8) }}>先去看它边写 ›</button>
        </>
      )}
      {state === 'failed' && (
        <>
          <Cap>信没写成：网络请求失败。总结页里可以重试。</Cap>
          <button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }} className="mt-4 px-5 py-2.5 text-[14px] font-black" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(8) }}>回去看看 ›</button>
        </>
      )}
      {state === 'ready' && (
        <button type="button" onClick={(e) => { e.stopPropagation(); setState('opened'); }} className="mt-5 w-full py-3.5 text-[17px] font-black" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(12) }}>拆开这封信</button>
      )}
      {state === 'opened' && (
        <div className="mt-3 max-h-[42vh] overflow-y-auto pr-1" onClick={(e) => e.stopPropagation()}>
          <div className="whitespace-pre-wrap text-[14px] leading-[1.9]" style={{ color: P3R.ink }}>
            {ai.text}{(ai.phase === 'streaming' || ai.phase === 'thinking') && <span aria-hidden className="pk-caret ml-0.5 inline-block h-[1em] w-[3px] translate-y-[2px]" style={{ background: P3R.blue }} />}
            {ai.phase === 'streaming' && <button type="button" onClick={ai.skip} className="ml-2 font-cond text-[12px]" style={{ color: P3R.roseInk }}>SKIP ›</button>}
          </div>
          {ai.phase === 'done' && <button type="button" onClick={onClose} className="mt-3 w-full py-2.5 text-[14px] font-black" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(8) }}>收下这封信</button>}
        </div>
      )}
    </>
  );
}

export default function YearRecapStage({ open, onClose, params }: OverlayProps) {
  const anim = useBoldness();
  const [letter, setLetter] = useState<LetterState>((params?.get('letter') as LetterState) || 'ready');
  const pages: { key: string; ghost: string; node: ReactNode }[] = [
    { key: 'you', ghost: 'YOU', node: <><div className="font-cond text-[13px] tracking-[0.3em]" style={{ color: P3R.roseInk }}>2025 年度回顾</div><div className="mt-3 font-cond leading-none" style={{ fontSize: 'min(34vw, 150px)', color: P3R.blue }}>2025</div><div className="mt-2 flex items-center gap-2"><span className="font-heavy text-[26px]" style={{ color: P3R.ink }}>这一年的你</span></div><Cap>直斗，这是你的一整个 2025。按一下屏幕，从一月开始翻。</Cap></> },
    { key: 'days', ghost: 'DAYS', node: <><Title text="来过的日子" /><Num value={286} unit="天" /><Sub>365 天里来过 286 天，记下 388 条</Sub><Cap>7 月来得最勤（52 条）；多半是夜里写下的</Cap>
      <div className="mt-4 flex h-[72px] items-end gap-[5px]" aria-hidden>{[18, 22, 30, 26, 34, 40, 52, 44, 30, 36, 28, 28].map((n, i) => <div key={i} className="flex flex-1 flex-col items-center gap-1"><motion.span className="block w-full origin-bottom" style={{ height: n, background: i === 6 ? P3R.blue : P3R.cyan, clipPath: slantClip(2) }} initial={anim ? { scaleY: 0 } : false} animate={{ scaleY: 1 }} transition={{ delay: 0.3 + i * 0.04 }} /><span className="font-cond text-[9px]" style={{ color: P3R.grey }}>{i + 1}</span></div>)}</div></> },
    { key: 'night', ghost: 'NIGHT', node: <><Title text="最晚的一夜" /><div className="mt-4 font-cond leading-none" style={{ fontSize: 'min(24vw, 110px)', color: P3R.blue }}>03:12</div><Sub>11月3日 周一 · 凌晨</Sub><Cap>那天夜里，你写下了这一句。</Cap><Quote>「终于把论文的第一章写完了，窗外在下雨。」</Quote></> },
    { key: 'grow', ghost: 'GROWTH', node: <><Title text="长成的样子" /><Num prefix="+" value={612} unit="点" /><Sub>长得最多的是「知识」，+188</Sub>
      <div className="mt-3 space-y-1.5">{[['知识', 188], ['胆量', 131], ['温柔', 120], ['灵巧', 96], ['魅力', 77]].map(([n, v], i) => <motion.div key={n as string} className="flex items-center gap-2.5" {...stagger(anim, i)}><span className="w-8 shrink-0 text-[12px] font-black" style={{ color: P3R.ink }}>{n}</span><span className="h-[8px] min-w-0 flex-1" style={{ background: 'var(--p3r-track)', clipPath: slantClip(3) }}><span className="block h-full origin-left" style={{ background: i === 0 ? P3R.blue : P3R.cyan, transform: `scaleX(${(v as number) / 188})` }} /></span><span className="w-9 shrink-0 text-right font-cond text-[13px]" style={{ color: P3R.ink }}>+{v}</span></motion.div>)}</div>
      <Cap>比去年多 140 点（去年 +472）</Cap></> },
    { key: 'streak', ghost: 'STREAK', node: <><Title text="没断过的日子" /><Num value={41} unit="天" /><Sub>6月2日到7月12日，一天没落下</Sub><Cap>断过之后又接上的次数：9 次</Cap></> },
    { key: 'todo', ghost: 'CHECK', node: <><Title text="待办打卡" /><Num value={512} unit="次" /><Sub>最勤的是「晨跑 3 公里」，203 次</Sub>
      <ul className="mt-3 space-y-1.5">{[['晨跑 3 公里', 203], ['背 30 个单词', 141], ['练字 20 分钟', 88]].map(([t, n], i) => <motion.li key={t as string} className="flex items-center gap-3" {...stagger(anim, i)}><Chip>{n as number}</Chip><span className="min-w-0 truncate text-[14px] font-bold" style={{ color: P3R.ink }}>{t}</span></motion.li>)}</ul></> },
    { key: 'photos', ghost: 'PHOTO', node: <><Title text="照片" /><Sub>这一年留下了 46 张，挑了 6 张</Sub><div className="mt-3 grid grid-cols-3 gap-2" aria-label="这一年留下的 6 张照片">{['bailu.webp', 'chunfen.webp', 'dongzhi.webp', 'chushu.webp', 'dashu.webp', 'daxue.webp'].map((s, k) => <motion.div key={s} className="aspect-square overflow-hidden" style={{ clipPath: slantClip(6) }} {...stagger(anim, k)}><Photo src={s} /></motion.div>)}</div></> },
    { key: 'high', ghost: 'HIGHLIGHT', node: <><Title text="高光时刻" /><ul className="mt-4 space-y-2">{[['3/14', '成就解锁：「连续记录 30 天」'], ['10/14', '倒计时达成：「驾照科目二」'], ['10/17', 'BIG DEAL 收官：搬家'], ['9/22', '愿望实现：跑完一次半程马拉松']].map(([d, t], i) => <motion.li key={t} className="flex items-start gap-3" {...stagger(anim, i)}><Chip>{d}</Chip><span className="min-w-0 text-[14px] font-bold leading-snug" style={{ color: P3R.ink }}>{t}</span></motion.li>)}</ul></> },
    { key: 'cards', ghost: 'COUNTDOWN', node: <><Title text="倒计时" /><Num value={3} unit="个" /><Sub>倒计时走到了终点</Sub><div className="mt-2 space-y-1">{[['驾照科目二', '达成'], ['期末考试', '到了'], ['社团演出', '达成']].map(([t, h]) => <div key={t} className="flex items-center justify-between gap-2 px-3 py-1" style={{ background: P3R.cyanFaint, clipPath: slantClip(6) }}><span className="truncate text-[14px] font-bold" style={{ color: P3R.ink }}>{t}</span><span className="shrink-0 text-[12px] font-black" style={{ color: P3R.roseInk }}>{h}</span></div>)}</div><Cap>这一年一共立下 5 个倒计时</Cap></> },
    { key: 'fate', ghost: 'FATE', node: <><Title text="命运与愿望" /><div className="mt-4 flex items-center gap-4"><motion.div className="h-[86px] w-[58px] shrink-0" style={{ background: `linear-gradient(165deg, ${P3R.blue}, var(--p3r-mulberry))`, clipPath: slantClip(6), transformPerspective: 600 }} initial={anim ? { rotateY: 90, opacity: 0 } : false} animate={{ rotateY: 0, opacity: 1 }} transition={{ delay: 0.25, duration: 0.6, ease: [0.2, 0.8, 0.3, 1] }} /><div><div className="flex items-baseline gap-1.5 leading-none" style={{ color: P3R.blue }}><span className="font-cond text-[44px] tabular">27</span><span className="font-heavy text-[18px]" style={{ color: P3R.ink }}>次</span></div><div className="text-[12px] font-bold" style={{ color: P3R.grey }}>这一年抽过的牌 · 最常见「战车」6 次</div></div></div><div className="mt-4 space-y-1 text-[14px] font-bold" style={{ color: P3R.ink }}><div>实现了 1 个愿望：「跑完一次半程马拉松」</div><div>离「一年读完 24 本书」近了 31%（现在 58%）</div></div></> },
    { key: 'memory', ghost: 'MEMORY', node: <><Title text="你的记忆" /><div className="mt-4 space-y-2">{[['这一年的第一条', '1月1日', '新年第一天，去神社求了签，中吉。'], ['最近的一条', '12月30日', '把今年的照片整理成了一本小相册']].map(([l, d, t], k) => <motion.div key={l} className="px-4 py-2.5" style={{ background: P3R.cyanFaint, clipPath: slantClip(10) }} {...stagger(anim, k)}><div className="font-cond text-[12px]" style={{ color: P3R.roseInk }}>{l} · {d}</div><div className="mt-1 text-[14px] font-bold" style={{ color: P3R.ink }}>{t}</div>{k === 0 && <div className="mt-1.5 text-[12px] font-black" style={{ color: P3R.roseInk }}>中间隔着 363 天、386 条</div>}</motion.div>)}</div></> },
    { key: 'weather', ghost: 'WEATHER', node: <><Title text="雨天你记了 74 条" /><Num value={212} unit="条" /><Sub>这一年带着天气的记录</Sub><div className="mt-3 flex flex-wrap gap-2">{['晴天 98', '雨天 74', '雪天 9', '其余 31'].map((t, i) => <span key={t} className="px-3 py-1 text-[12px] font-black" style={{ clipPath: slantClip(5), background: i === 1 ? P3R.blue : P3R.cyanFaint, color: i === 1 ? P3R.onBlue : P3R.ink }}>{t}</span>)}</div><Cap>下雨的夜里，你更愿意多写两句。</Cap></> },
    { key: 'letter', ghost: 'LETTER', node: null },
  ];
  const n = pages.length;
  const last = n - 1;
  const startIdx = params?.get('page') === 'letter' ? last : Math.max(0, Math.min(last, Number(params?.get('act') ?? 0)));
  const [idx, setIdx] = useState(startIdx);
  const autoplay = useRef(!params?.get('page') && !params?.get('act'));
  useScrollLock(open);
  const next = useCallback(() => setIdx((i) => Math.min(last, i + 1)), [last]);
  const prev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);
  // 演出直达：前几幕自动翻（1.9s / 幕，最多到第 4 幕），任一交互即停
  useEffect(() => {
    if (!open || !autoplay.current || !anim) return;
    if (idx >= 3) { autoplay.current = false; return; }
    const t = window.setTimeout(() => { if (autoplay.current) next(); }, 1900);
    return () => clearTimeout(t);
  }, [open, idx, anim, next]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if ((e.key === 'Enter' || e.key === ' ') && (e.target as HTMLElement | null)?.closest?.('button')) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); autoplay.current = false; next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); autoplay.current = false; prev(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, next, prev, onClose]);
  const page = pages[idx];
  const variants = anim
    ? { initial: { x: 72, opacity: 0, skewX: -8 }, animate: { x: 0, opacity: 1, skewX: 0 }, exit: { x: -72, opacity: 0, skewX: 6 }, transition: { type: 'spring' as const, stiffness: 320, damping: 30 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } };
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div role="dialog" aria-modal="true" aria-label="2025 年度回顾" className="fixed inset-0 z-celebration flex select-none flex-col overflow-hidden"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
            onClick={() => { autoplay.current = false; if (idx < last) next(); }}>
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ background: P3R.bg }}>
              <PinkStage variant="plain" />
              {anim && <motion.div key={idx} className="absolute left-1/2 top-1/2 h-10 w-10 rounded-full" style={{ x: '-50%', y: '-50%', border: `10px solid ${P3R.cyan}` }}
                initial={{ scale: 0.2, opacity: 0.55 }} animate={{ scale: 18, opacity: 0 }} transition={{ duration: 1.1, ease: [0.16, 0.7, 0.35, 1] }} />}
            </div>
            <GhostWords key={`g-${page.key}`} words={[page.ghost]} className="left-[-18px] top-[10%]" style={{ fontSize: '4.6rem' }} />
            <div className="relative z-10 flex items-center gap-3 px-4" style={{ paddingTop: 'max(env(safe-area-inset-top), 14px)' }}>
              <span className="hidden shrink-0 font-cond text-[12px] min-[400px]:inline" style={{ color: P3R.roseInk }}>2025 年度回顾</span>
              <div className="flex flex-1 gap-1" aria-hidden>{pages.map((p, i) => <span key={p.key} className="h-[4px] flex-1" style={{ background: i <= idx ? P3R.blue : 'rgb(var(--p3r-ink-rgb) / 0.18)' }} />)}</div>
              {page.key !== 'letter' && <button type="button" onClick={(e) => { e.stopPropagation(); autoplay.current = false; setIdx(last); }} className="shrink-0 px-2 py-1 text-[13px] font-black" style={{ color: P3R.ink }}>跳过 ›</button>}
              {page.key === 'letter' && <button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="关闭" className="shrink-0 px-2 py-1 text-[16px] font-black" style={{ color: P3R.ink }}>✕</button>}
            </div>
            <div className="relative z-10 flex flex-1 items-center justify-center overflow-hidden px-5 pb-4 pt-2">
              <AnimatePresence mode="wait" initial={false}>
                <motion.section key={page.key} className="w-full max-w-[380px]" aria-live="polite" initial={variants.initial} animate={variants.animate} exit={variants.exit} transition={variants.transition}>
                  <div className="relative" style={{ filter: 'drop-shadow(0 16px 28px rgb(var(--p3r-blue-rgb) / 0.16))' }}>
                    <div className="relative px-7 pb-7 pt-6" style={{ clipPath: slantClip(22), background: P3R.panelGlass }}>
                      <span aria-hidden className="absolute bottom-0 right-4 h-4 w-6" style={{ background: P3R.cyan, clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
                      {page.key === 'letter' ? <LetterPage state={letter} setState={setLetter} onClose={onClose} anim={anim} /> : page.node}
                    </div>
                  </div>
                </motion.section>
              </AnimatePresence>
            </div>
            <div className="relative z-10 h-12 text-center" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
              {page.key !== 'letter' && <motion.span key={idx} className="text-[12px] font-bold" style={{ color: P3R.inkSoft }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>点击屏幕继续 · {idx + 1}/{n}</motion.span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
