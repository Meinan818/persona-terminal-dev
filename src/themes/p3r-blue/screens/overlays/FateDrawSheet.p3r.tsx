/**
 * 命运抽签（真实 src/components/fate/FateDrawSheet.tsx，p3 = 全屏水面舞台，粉版深莓夜 + 樱点水纹）：
 *   闸门 gate：FATE DRAW /「不知道做什么好？」/「命运会替你选择」+ 来源开关（今日待办 / 愿望 / 旧事 / 委托，斜切 chip）+ 卡背扇（≤7，±7°）
 *              +「N 张候选在池中」/「命运的力量正在苏醒…请多记录几条再来」+「抽一张」「今天先不抽」
 *   洗牌 spin：五张卡背 rotate/x/y 三段抖动 1.05s（不可打断）→ 1150ms 进揭示
 *   揭示 reveal：卡面 rotateY 90→0（.38s，[.16,1,.3,1]）+ 标签 + 标题 + 说明 +「完成它会有额外奖励」+「去完成」「再想想」+（旧事）「以后别抽这件」+「关闭会重新抽取其他的可能性」
 *   弹幕层（揭示时停）：官方种子 + 云端条目长按反馈。
 * 直达：?step=spin（自动抽 → 洗牌 → 揭示）；?step=reveal（直接翻面揭示）；?state=empty（空池）。今日委托 →「去完成」打开委托板。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { Portal, useEscape, useScrollLock, useToast, P3R, slantClip } from '@blue/kit';
import { useBoldness } from '@blue/lib/prefs';
import { DANMAKU } from '@blue/adapters/pkg2';
import { DanmakuLayer, DarkStage } from '@blue/screens/pkg2/cutins';

type Kind = 'todo' | 'wish' | 'history' | 'quest';
const SOURCE_LABEL: Record<Kind, string> = { todo: '今日待办', wish: '愿望', history: '旧事', quest: '委托' };
const KIND_META: Record<Kind, { tag: string; hint: string }> = {
  todo: { tag: '今日待办', hint: '可能性的辉光折射出了新的方向' },
  wish: { tag: '愿望纸片', hint: '接住就转正成今天的任务，纸片功成身退' },
  history: { tag: '旧日回响', hint: '你做过的事，再做一次不需要勇气' },
  quest: { tag: '今日委托', hint: '委托板今天给的新鲜事，接住就进今日任务' },
};
const CANDS: { key: string; kind: Kind; title: string; hint?: string }[] = [
  { key: 'c1', kind: 'todo', title: '背 30 个单词' },
  { key: 'c2', kind: 'todo', title: '练字 20 分钟' },
  { key: 'c3', kind: 'wish', title: '每晚睡前读 20 分钟' },
  { key: 'c4', kind: 'history', title: '给家里打电话', hint: '这两个月做过 6 次，上次是 9 天前，再做一次不需要勇气' },
  { key: 'c5', kind: 'quest', title: '去河堤散步 20 分钟' },
  { key: 'c6', kind: 'history', title: '自己做一顿饭' },
];
const BACK_CLIP = 'polygon(6% 0, 100% 2%, 94% 100%, 0 98%)';
const CardBack = ({ big }: { big?: boolean }) => (
  <div className="relative h-full w-full" style={{ clipPath: BACK_CLIP, background: 'linear-gradient(165deg, var(--p3r-blue) 0%, var(--p3r-blue-deep) 45%, #15203b 100%)' }}>
    <div className="absolute inset-[5px]" style={{ clipPath: BACK_CLIP, boxShadow: 'inset 0 0 0 1.5px rgba(214,226,255,0.7)', background: 'repeating-linear-gradient(45deg, rgba(214,226,255,0.08) 0 4px, transparent 4px 9px)' }} />
    <span className={`absolute inset-0 flex items-center justify-center ${big ? 'text-3xl' : 'text-xl'}`} style={{ color: 'rgba(236,247,255,0.9)' }}>✦</span>
  </div>
);

export default function FateDrawSheet({ open, onClose, params, onGo }: OverlayProps & { onGo?: (kind: Kind, title: string) => void }) {
  const bold = useBoldness();
  const toast = useToast();
  const empty = params?.get('state') === 'empty';
  const step = params?.get('step');
  const [sources, setSources] = useState<Record<Kind, boolean>>({ todo: true, wish: true, history: true, quest: true });
  const [banned, setBanned] = useState<string[]>([]);
  const [phase, setPhase] = useState<'gate' | 'spin' | 'reveal'>('gate');
  const [picked, setPicked] = useState<(typeof CANDS)[number] | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const pool = useMemo(() => (empty ? [] : CANDS.filter((c) => sources[c.kind] && !banned.includes(c.key))), [sources, banned, empty]);
  const draw = (forced?: (typeof CANDS)[number]) => {
    if (!pool.length) return;
    const p = forced ?? pool[Math.floor(Math.random() * pool.length)];
    setPicked(p);
    if (!bold) { setPhase('reveal'); return; }
    setPhase('spin');
    timers.current.push(window.setTimeout(() => setPhase('reveal'), 1150));
  };
  useEffect(() => {
    if (!open) return;
    if (step === 'reveal' && !empty) { setPicked(CANDS[3]); setPhase('reveal'); }
    else if (step === 'spin' && !empty) { setPhase('gate'); timers.current.push(window.setTimeout(() => draw(CANDS[3]), 500)); }
    else { setPhase('gate'); setPicked(null); }
  }, [open]); // eslint-disable-line
  useScrollLock(open);
  const close = () => { if (phase === 'spin') return; setPhase('gate'); setPicked(null); onClose(); };
  useEscape(open, close);
  const dm = DANMAKU.slice(0, 4).map((t, i) => ({ id: i % 2 ? `fd${i}` : '', text: t }));
  const chipStyle = (on: boolean) => ({ clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)', background: on ? P3R.blue : 'transparent', color: on ? P3R.onBlue : 'rgba(236,247,255,0.5)', boxShadow: on ? undefined : 'inset 0 0 0 1px rgba(236,247,255,0.3)' });
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <DarkStage onBackdrop={close}>
            {bold && phase !== 'reveal' && <DanmakuLayer items={dm} topBase={6} topStep={22} durBase={14} durStep={5} />}
            <div role="dialog" aria-modal="true" aria-label="命运抽签" className="relative w-full max-w-sm" onMouseDown={(e) => e.stopPropagation()}>
              <AnimatePresence mode="wait">
                {phase === 'gate' && (
                  <motion.div key="gate" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center">
                    <div className="font-cond text-[12px] tracking-[0.4em]" style={{ color: 'var(--bk-bubble-a)' }}>FATE DRAW</div>
                    <h2 className="mt-1 font-heavy text-[clamp(24px,7vw,28px)]" style={{ color: 'var(--p3r-cream)' }}>不知道做什么好？</h2>
                    <p className="mt-1.5 text-[14px] font-bold" style={{ color: 'rgba(236,247,255,0.6)' }}>命运会替你选择</p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      {(Object.keys(SOURCE_LABEL) as Kind[]).map((k) => (
                        <button key={k} type="button" aria-pressed={sources[k]} onClick={() => setSources((s) => ({ ...s, [k]: !s[k] }))} className="px-3.5 py-1.5 text-[12px] font-black" style={chipStyle(sources[k])}>{SOURCE_LABEL[k]}</button>
                      ))}
                    </div>
                    <div className="relative mx-auto mt-7 h-36 w-full">
                      {pool.slice(0, 7).map((c, i, arr) => {
                        const off = i - (arr.length - 1) / 2;
                        return (
                          <motion.div key={c.key} aria-hidden className="absolute left-1/2 top-2 h-28 w-20" style={{ transformOrigin: '50% 130%', marginLeft: -40 }}
                            initial={bold ? { rotate: 0, x: 0, opacity: 0 } : false} animate={{ rotate: off * 7, x: off * 34, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 22, delay: i * 0.03 }}>
                            <CardBack />
                          </motion.div>
                        );
                      })}
                      {pool.length === 0 && <p className="pt-10 text-[14px]" style={{ color: 'rgba(236,247,255,0.55)' }}>命运的力量正在苏醒…请多记录几条再来</p>}
                    </div>
                    <div className="mt-1 h-4 text-[11px]" style={{ color: 'rgba(236,247,255,0.45)' }}>{pool.length > 0 ? `${pool.length} 张候选在池中` : ''}</div>
                    <button type="button" onClick={() => draw()} disabled={pool.length === 0} className="mt-5 w-full py-3 text-[16px] font-black disabled:opacity-50" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(10) }}>抽一张</button>
                    <button type="button" onClick={close} className="mt-3 text-[14px] font-bold" style={{ color: 'rgba(236,247,255,0.5)' }}>今天先不抽</button>
                  </motion.div>
                )}
                {phase === 'spin' && (
                  <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-64 items-center justify-center" aria-live="polite" aria-label="洗牌中">
                    <div className="relative h-40 w-28">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div key={i} aria-hidden className="absolute inset-0"
                          animate={{ rotate: [i * 4 - 8, -(i * 3) + 6, i * 5 - 10, 0], x: [0, i % 2 ? 14 : -14, i % 2 ? -10 : 10, 0], y: [0, -6, 4, 0] }} transition={{ duration: 1.05, ease: 'easeInOut' }}>
                          <CardBack big />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
                {phase === 'reveal' && picked && (
                  <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                    <motion.div className="relative mx-auto w-full max-w-[300px] overflow-hidden px-5 pb-6 pt-5 text-left" style={{ transformPerspective: 700, background: 'var(--p3r-cream)', clipPath: 'polygon(0 3.5%, 100% 0, 98.5% 100%, 1% 100%)' }}
                      initial={bold ? { rotateY: 90, scale: 0.9 } : false} animate={{ rotateY: 0, scale: 1 }} transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}>
                      <span aria-hidden className="pointer-events-none absolute -right-4 -top-6 select-none font-heavy text-[90px] leading-none" style={{ color: 'rgba(21,32,59,0.06)' }}>✦</span>
                      {bold && <motion.span aria-hidden className="absolute inset-y-0 w-[30%]" style={{ background: 'rgba(255,255,255,0.7)', skewX: -20 }} initial={{ x: '-120%' }} animate={{ x: '420%' }} transition={{ duration: 0.6, delay: 0.3 }} />}
                      <span className="inline-block px-2.5 py-1 font-cond text-[11px] tracking-wide" style={{ background: P3R.blue, color: '#fff', clipPath: slantClip(6) }}>{KIND_META[picked.kind].tag}</span>
                      <h3 className="mt-3 break-words font-heavy text-[21px] leading-snug" style={{ color: 'var(--p3r-mulberry)' }}>{picked.title}</h3>
                      <p className="mt-2.5 text-[12px] font-bold leading-relaxed" style={{ color: 'rgba(21,32,59,0.7)' }}>{picked.hint ?? KIND_META[picked.kind].hint}</p>
                      <p className="mt-1 text-[11px] font-black" style={{ color: '#335bb8' }}>完成它会有额外奖励</p>
                    </motion.div>
                    <div className="mx-auto mt-5 flex max-w-[300px] gap-2.5">
                      <button type="button" className="relative flex-1 py-3 text-[16px] font-black" style={{ background: P3R.blue, color: P3R.onBlue, clipPath: slantClip(10) }}
                        onClick={() => { const p = picked; setPhase('gate'); setPicked(null); onClose(); if (onGo) onGo(p.kind, p.title); else toast.success('已加入今日任务 · ✦ 签'); }}>去完成</button>
                      <button type="button" onClick={close} className="px-5 py-3 text-[14px] font-black" style={{ background: 'var(--p3r-cream)', color: 'var(--p3r-mulberry)', clipPath: slantClip(10) }}>再想想</button>
                    </div>
                    {picked.kind === 'history' && (
                      <button type="button" onClick={() => { setBanned((b) => [...b, picked.key]); toast('以后不会再抽到这件'); setPhase('gate'); setPicked(null); }} className="mt-3 text-[12px] font-bold underline underline-offset-2" style={{ color: 'rgba(236,247,255,0.6)' }}>以后别抽这件</button>
                    )}
                    <p className="mt-3 text-[11px] font-bold" style={{ color: 'rgba(236,247,255,0.35)' }}>关闭会重新抽取其他的可能性</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </DarkStage>
        )}
      </AnimatePresence>
    </Portal>
  );
}
