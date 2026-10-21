/**
 * 年度回顾舞台（真实 src/components/annual/YearRecapStage.tsx）—— 全屏分幕，点击翻幕、「跳过 ›」、底部「点击屏幕继续 · i/N」。
 * 幕：这一年的你 / 来过的日子 / 最晚的一夜 / 长成的样子 / 没断过的日子 / 待办打卡 / 照片 / 高光时刻 / 倒计时 / 命运与愿望 / 你的记忆 / 天气 / 一封信。
 * P4G 版式：黄方块舞台 + 白字黑描边题板 + 大号斜体数字 + 拼贴块分层入场 + 每幕黄黑条纹扫过。?act=N 直达某幕；?letter=writing|failed 信的状态。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { Portal, P4Outline, P4Stripe, useEscape, useScrollLock } from '@yellow/kit';
import { ScanlineOverlay } from '@yellow/fx';
import { useLowMotion } from '@yellow/lib/prefs';
import { p4gAsset } from '@yellow/lib/asset';
import { cx } from '@yellow/lib/cx';

const Big = ({ value, unit, prefix }: { value: ReactNode; unit: string; prefix?: string }) => (
  <div className="flex items-baseline gap-1 text-p4g-black">
    {prefix && <span className="p4g-num text-[clamp(32px,9vw,56px)]">{prefix}</span>}
    <span className="p4g-num leading-none [-webkit-text-stroke:2px_var(--p4g-black)]" style={{ fontSize: 'clamp(72px,24vw,150px)' }}>{value}</span>
    <span className="font-display text-h2 font-black">{unit}</span>
  </div>
);
const Sub = ({ children }: { children: ReactNode }) => <div className="mt-2 max-w-full rounded-sm bg-p4g-black px-3 py-1.5 font-display text-lead font-bold text-white">{children}</div>;
const Cap = ({ children }: { children: ReactNode }) => <div className="mt-3 text-body font-bold text-p4g-black/80">{children}</div>;
const Plate = ({ children }: { children: ReactNode }) => (
  <div className="relative mb-4 inline-block -rotate-2">
    <div aria-hidden className="absolute inset-0 translate-x-2 translate-y-2 bg-p4g-orange" />
    <div className="relative bg-p4g-black px-4 py-1.5"><P4Outline size="clamp(24px,7vw,36px)" stroke={0} fill="var(--p4g-yellow)" strokeColor="transparent">{children}</P4Outline></div>
  </div>
);

export default function YearRecapStage({ open, onClose, params }: OverlayProps) {
  const low = useLowMotion();
  const [i, setI] = useState(0);
  const [letter, setLetter] = useState<'ready' | 'writing' | 'failed' | 'opened'>('ready');
  useEffect(() => { if (open) { setI(Math.max(0, Number(params?.get('act') ?? 0))); setLetter((params?.get('letter') as 'writing') ?? 'ready'); } }, [open]); // eslint-disable-line
  useScrollLock(open);
  useEscape(open, onClose);

  const pages: { key: string; node: ReactNode }[] = [
    { key: 'you', node: <><Plate>这一年的你</Plate><Sub>直斗，这是你的一整个 2025</Sub><Cap>按一下屏幕，从一月开始翻。</Cap></> },
    { key: 'days', node: <><Plate>来过的日子</Plate><Big value={286} unit="天" /><Sub>365 天里来过 286 天，记下 388 条</Sub><Cap>7 月来得最勤（52 条）；多半是夜里写下的</Cap></> },
    { key: 'night', node: <><Plate>最晚的一夜</Plate><div className="p4g-num text-[clamp(56px,18vw,110px)] leading-none text-p4g-black">03:12</div><Sub>11月3日 周一 · 凌晨</Sub><Cap>那天夜里，你写下了这一句。</Cap><div className="mt-2 rounded-sm border-3 border-p4g-black bg-white px-3 py-2 text-body font-bold text-p4g-black shadow-hard">「终于把论文的第一章写完了，窗外在下雨。」</div></> },
    { key: 'grow', node: <><Plate>长成的样子</Plate><Big prefix="+" value={612} unit="点" /><Sub>长得最多的是「知识」，+188</Sub><Cap>比去年多 140 点（去年 +472）</Cap></> },
    { key: 'streak', node: <><Plate>没断过的日子</Plate><Big value={41} unit="天" /><Sub>6月2日到7月12日，一天没落下</Sub><Cap>待办打卡 512 次，最勤的是「晨跑 3 公里」（203 次）</Cap></> },
    { key: 'photos', node: <><Plate>照片</Plate><div className="grid grid-cols-3 gap-2" aria-label="这一年留下的 6 张照片">{['town-day.webp', 'town-night.webp', 'tv-world-fog.webp', 'menu-squares.webp', 'town-day-wide.webp', 'town-night-wide.webp'].map((s, k) => <img key={s} src={p4gAsset(s)} alt="" className={cx('aspect-square w-full border-3 border-p4g-black object-cover shadow-hard-sm', k % 2 ? 'rotate-2' : '-rotate-2')} />)}</div></> },
    { key: 'high', node: <><Plate>高光时刻</Plate><div className="grid grid-cols-1 gap-2">{['🏆 成就解锁：「连续记录 30 天」', '✦ 倒计时达成：「驾照科目二」', 'BIG DEAL 收官：搬家'].map((t) => <div key={t} className="truncate rounded-sm border-3 border-p4g-black bg-white px-3 py-2 font-display text-body font-bold text-p4g-black shadow-hard-sm">{t}</div>)}</div></> },
    { key: 'cards', node: <><Plate>倒计时</Plate><Big value={3} unit="个" /><Sub>倒计时走到了终点</Sub><div className="mt-2 flex flex-col gap-1">{[['驾照科目二', '达成'], ['期末考试', '到了']].map(([t, h]) => <div key={t} className="flex items-center justify-between gap-2 rounded-xs bg-white/70 px-2 py-1 text-body font-bold text-p4g-black"><span className="truncate">{t}</span><span className="shrink-0 text-p4g-orange-deep">{h}</span></div>)}</div><Cap>这一年一共立下 5 个倒计时</Cap></> },
    { key: 'fate', node: <><Plate>命运与愿望</Plate><div className="flex items-baseline gap-1 text-p4g-black"><span className="p4g-num text-[clamp(64px,20vw,120px)] leading-none">27</span><span className="font-display text-h3 font-black">次</span></div><div className="font-display text-body font-bold text-p4g-black/80">这一年抽过的牌</div><Sub>来得最勤的是「战车」，6 次</Sub><div className="mt-3 space-y-1 text-body font-bold text-p4g-black"><div>实现了 1 个愿望：「跑完一次半程马拉松」</div><div>离「一年读完 24 本书」近了 31%<span className="whitespace-nowrap">（现在 58%）</span></div></div></> },
    { key: 'memory', node: <><Plate>你的记忆</Plate><div className="grid grid-cols-1 gap-2">{[['这一年的第一条', '1月1日', '新年第一天，去神社求了签，中吉。'], ['最近的一条', '12月30日', '把今年的照片整理成了一本小相册']].map(([l, d, t], k) => <div key={l} className="rounded-sm border-3 border-p4g-black bg-white p-3 text-p4g-black shadow-hard-sm"><div className="font-display text-cap font-bold text-p4g-orange-deep">{l} · {d}</div><div className="mt-1 text-body font-bold">{t}</div>{k === 0 && <div className="mt-2 font-display text-meta font-black text-p4g-orange-deep">中间隔着 363 天、386 条</div>}</div>)}</div></> },
    { key: 'weather', node: <><Plate>雨天你记了 74 条</Plate><div className="flex items-baseline gap-1 text-p4g-black"><span className="p4g-num text-[clamp(64px,20vw,120px)] leading-none">212</span><span className="font-display text-h3 font-black">条</span></div><div className="font-display text-body font-bold text-p4g-black/80">这一年带着天气的记录</div><div className="mt-3 flex flex-wrap gap-2 font-display text-meta font-bold">{['☀️ 晴 98', '🌧️ 雨 74', '❄️ 雪 9', '其余 31'].map((t) => <span key={t} className="rounded-xs bg-p4g-black px-2 py-0.5 text-white">{t}</span>)}</div></> },
    { key: 'letter', node: <><Plate>一封信</Plate><div className="font-display text-lead font-bold text-p4g-black">🦋温柔馆长给你写了一封信</div>
      {letter === 'writing' && <><Cap>正在落笔，已经写了 320 字…</Cap><button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }} className="mt-3 rounded-sm border-3 border-p4g-black bg-white px-4 py-2 font-display text-body font-bold text-p4g-black shadow-hard">先去看它边写 ›</button></>}
      {letter === 'failed' && <><Cap>信没写成：网络请求失败</Cap><button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }} className="mt-3 rounded-sm border-3 border-p4g-black bg-white px-4 py-2 font-display text-body font-bold text-p4g-black shadow-hard">回去看看 ›</button></>}
      {letter === 'ready' && <button type="button" onClick={(e) => { e.stopPropagation(); setLetter('opened'); }} className="mt-4 rotate-[-2deg] rounded-sm border-3 border-p4g-black bg-p4g-orange px-6 py-4 font-display text-h3 font-black text-p4g-black shadow-hard-lg">✉ 拆开这封信</button>}
      {letter === 'opened' && <div className="mt-3 max-h-[40vh] overflow-y-auto rounded-sm border-3 border-p4g-black bg-white p-3 text-body leading-relaxed text-p4g-black shadow-hard">这一年，你像在雾里走路的人——看不清远处，却一步也没停……<br /><br />明年，也请继续把小事记下来。</div>}
    </> },
  ];
  const n = pages.length;
  const next = () => (i < n - 1 ? setI(i + 1) : onClose());

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="yr" role="dialog" aria-modal="true" aria-label="2025 年度回顾" onClick={next}
            className="fixed inset-0 flex cursor-pointer flex-col overflow-hidden text-p4g-black" style={{ zIndex: 'var(--p4g-z-celebration)' as unknown as number, background: 'var(--p4g-yellow)' }}
            initial={low ? { opacity: 0 } : { opacity: 0, scaleY: 0.02 }} animate={{ opacity: 1, scaleY: 1 }} exit={low ? { opacity: 0 } : { opacity: 0, scaleY: 0.02 }} transition={{ duration: 0.28, ease: [0.2, 0.9, 0.1, 1] }}>
            <div aria-hidden className="absolute inset-0 opacity-40" style={{ backgroundImage: `url(${p4gAsset('paper-collage.webp')})`, backgroundSize: '320px' }} />
            <div aria-hidden className="absolute -right-24 top-1/3 h-[140%] w-40 rotate-[20deg] p4g-candy opacity-90" />
            <ScanlineOverlay />
            <div className="relative flex shrink-0 items-center gap-3 px-4 pb-2" style={{ paddingTop: 'calc(14px + env(safe-area-inset-top))' }}>
              <span className="rounded-xs bg-p4g-black px-2 py-1 p4g-date-type text-meta text-p4g-yellow">2025 年度回顾</span>
              <div className="flex flex-1 gap-1">{pages.map((p, k) => <span key={p.key} className={cx('h-1.5 flex-1 border border-p4g-black', k <= i ? 'bg-p4g-black' : 'bg-transparent')} />)}</div>
              <button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }} className="shrink-0 rounded-sm border-3 border-p4g-black bg-white px-3 py-1 font-display text-meta font-bold shadow-hard-sm">跳过 ›</button>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center px-6">
              <AnimatePresence mode="wait">
                <motion.div key={pages[i].key} className="w-full max-w-[560px] min-w-0"
                  initial={low ? { opacity: 0 } : { opacity: 0, x: 60, rotate: 2 }} animate={{ opacity: 1, x: 0, rotate: 0 }} exit={low ? { opacity: 0 } : { opacity: 0, x: -60, rotate: -2 }} transition={{ duration: 0.24, ease: [0.2, 0.9, 0.1, 1] }}>
                  {!low && <motion.div aria-hidden className="pointer-events-none absolute inset-x-[-40px] top-1/2 z-10" initial={{ x: '-120%' }} animate={{ x: '120%' }} transition={{ duration: 0.45 }}><P4Stripe variant="hazard" height={18} /></motion.div>}
                  {pages[i].node}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="relative shrink-0 pb-6 text-center font-display text-meta font-bold" style={{ paddingBottom: 'calc(18px + env(safe-area-inset-bottom))' }}>
              <span className="rounded-pill bg-p4g-black px-3 py-1 text-white">点击屏幕继续 · {i + 1}/{n}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
