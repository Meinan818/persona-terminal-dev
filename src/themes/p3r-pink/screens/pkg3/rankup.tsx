/**
 * 羁绊升级链（真实 ConfidantRankUpCutIn#RankUpCutInP3 → ConfidantStarShiftInvite → ConfidantCelebrateScreen#CelebrateP3 → ConfidantStarShiftModal#StarShiftP3）。
 *
 * 时序逐段移植真实 p3 时间线（WAAPI，duration / delay 原值）：
 *   ① 0ms 白闪 450ms + 牌自左上坠入 700ms(OVER) · 说明行 350ms 起淡入
 *   ② 700ms RANK UP! 砸下 380ms(OVER) · 碎片 14 片 1500ms 飞散 · 星星逐个弹入 + 闪烁两轮
 *   ③ 1300ms 副题滑入 · ④ 1900ms 等级数字旧→新 弹跳高亮 · ⑤ 2300ms 奖励胶囊滑入 · ⑥ 2400ms 牌轻摆两次
 *   ⑦ 主内容全部结束 + 500ms → 碎裂退场（牌一沉 140ms → 各元素 260ms 淡出 + 碎片炸散 1.2–2.3s）
 *   ⑧ 退场动画真结束 → 确认态（「羁绊等级提升 / 确 认」），等用户点；Esc 任何时刻可跳过
 * 确认 → 恭喜整页（有星移次数 = 两键「稍后再说 / ✧ 使用星移」；无 = 单键「欣然接受」）→ 星移（输入 → 推演中 → 预览 → 落墨 → 完成 1.4s 自动关 / 出错）。
 * 粉 = 浅底：底色 / 叠影 / 碎片全部走 --p3r-*，日夜自动跟随。低动效：直出终态 + 确认态（与真实 reduce 分支一致）。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Confidant } from '@real/types';
import { Portal, P3Button, P3R, slantClip } from '@pink/kit';
import { useAIStream, type AIFail, type AIPhase } from '@pink/fx';
import { useBoldness } from '@pink/lib/prefs';
import { navigate } from '@pink/shell/shellBus';
import { ATTR_NAMES, INTIMACY_LABELS, TAROT_BY_ID } from './arcana';
import { Tarot } from './ui';
import { PK3_STARSHIFT, pk3Events } from '@pink/mock/pkg3';
import './rankup.css';

export const EXP = 'cubic-bezier(.16,1,.3,1)';
export const OVER = 'cubic-bezier(.34,1.56,.64,1)';
const rand = (n: number) => (Math.random() - 0.5) * n;
const compactFx = () => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 640px)').matches;

export interface RankUpNotice { oldLevel: number; newLevel: number; starShiftGained: number }
export type ChainPage = 'playing' | 'confirm' | 'celebrate' | 'shift';
export type ShiftStage = 'input' | 'thinking' | 'preview' | 'done' | 'error';

/** 牌高：真实 clamp(160px, 46vh, 430px)；手机 clamp(120px, 25vh, 230px)；比例 0.6 */
function useCardWidth(): number {
  const calc = () => {
    if (typeof window === 'undefined') return 160;
    const h = window.innerHeight; const w = window.innerWidth;
    const ch = w <= 640 ? Math.max(120, Math.min(230, h * 0.25)) : h <= 460 ? Math.max(110, Math.min(200, h * 0.5)) : Math.max(160, Math.min(430, h * 0.46));
    return Math.round(ch / 1.66);
  };
  const [cw, setCw] = useState(calc);
  useEffect(() => { const f = () => setCw(calc()); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  return cw;
}

const unlockedIn = (c: Confidant, from: number, to: number) => (c.buffs ?? []).filter((b) => b.unlockAtLevel > from && b.unlockAtLevel <= to);

// ═════════════════════════ ① RANK UP 演出 ═════════════════════════
export function RankUpCutIn({ confidant, notice, startPhase = 'playing', onFinish, auto = false }: { confidant: Confidant; notice: RankUpNotice; startPhase?: 'playing' | 'confirm'; onFinish: () => void; auto?: boolean }) {
  const bold = useBoldness();
  const card = TAROT_BY_ID[confidant.arcanaId];
  const cw = useCardWidth();
  const [phase, setPhase] = useState<'playing' | 'confirm'>(startPhase);
  const flashRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const lvRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const capRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const compact = compactFx();
  const spawn = useMemo(() => ({
    stars: Array.from({ length: compact ? 6 : 9 }, (_, k) => ({ k, left: 32 + Math.random() * 56, top: 12 + Math.random() * 52, size: 14 + Math.random() * 18 })),
    glass: Array.from({ length: compact ? 24 : 48 }, () => ({ left: 14 + Math.random() * 70, top: 14 + Math.random() * 56, w: 10 + Math.random() * 36, h: 8 + Math.random() * 24, rot: Math.random() * 180 })),
  }), [compact]);
  const bubbles = useMemo(() => Array.from({ length: compact ? 8 : 16 }, () => ({ x: Math.random() * 100, size: 6 + Math.random() * 16, dur: 5 + Math.random() * 7, dx: (Math.random() - 0.5) * 8, delay: -Math.random() * 10 })), [compact]);

  const finish = useCallback(() => onFinish(), [onFinish]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [finish]);

  // ── 时间线（照真实逐段移植）──
  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];
    const T = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    const A = (el: Element | null, kf: Keyframe[], opts: KeyframeAnimationOptions = {}) => (el ? el.animate(kf, { duration: 400, easing: EXP, fill: 'forwards', ...opts }) : null);
    const lv = lvRef.current;
    if (lv) { lv.textContent = String(notice.oldLevel); lv.className = ''; }
    if (startPhase === 'confirm') {
      // 直达确认段：主演出已退场，只剩水面 + 确认键（真实 ⑧ 之后的画面）；星星留一层余辉
      if (lv) { lv.textContent = String(notice.newLevel); lv.className = 'hl'; }
      if (bold) Array.from(starsRef.current?.children ?? []).forEach((st, k) => A(st, [{ opacity: 0, scale: '0' }, { opacity: 0.55, scale: '1', offset: 0.3 }, { opacity: 0, scale: '.6' }], { delay: 80 + k * 90, duration: 1500, easing: 'ease-out', fill: 'none' }));
      setPhase('confirm');
      return () => { timers.forEach(clearTimeout); };
    }
    if (!bold) {
      [cardRef, titleRef, subRef, pillRef, capRef].forEach((r) => { if (r.current) r.current.style.opacity = '1'; });
      if (lv) { lv.textContent = String(notice.newLevel); lv.className = 'hl'; }
      setPhase('confirm');
      return;
    }
    setPhase('playing');
    // ① 白闪 + 牌从左上坠入
    A(flashRef.current, [{ opacity: 0.55 }, { opacity: 0 }], { duration: 450, easing: 'linear' });
    const cardIn = A(cardRef.current, [{ opacity: 1, translate: '-20vw -60vh', rotate: '-40deg' }, { opacity: 1, translate: '0 0', rotate: '-8deg' }], { duration: 700, easing: OVER });
    const capIn = A(capRef.current, [{ opacity: 0 }, { opacity: 1 }], { delay: 350, duration: 400 });
    // ② 巨字砸下 + 碎片 + 星星
    const titleIn = A(titleRef.current, [{ opacity: 0, translate: '16vw 0', scale: '1.7' }, { opacity: 1, translate: '0 0', scale: '1' }], { delay: 700, duration: 380, easing: OVER });
    T(700, () => {
      Array.from(glassRef.current?.children ?? []).slice(0, 14).forEach((g, k) => A(g, [{ opacity: 0, scale: '.3', translate: '0 0' }, { opacity: 0.85, scale: '1', offset: 0.25 }, { opacity: 0, translate: `${rand(6).toFixed(1)}vw 5vh` }], { delay: 60 + k * 20, duration: 1500, easing: 'ease-out' }));
      Array.from(starsRef.current?.children ?? []).forEach((st, k) => {
        A(st, [{ opacity: 0, scale: '0', rotate: '-90deg' }, { opacity: 1, scale: '1', rotate: '0deg' }], { delay: 120 + k * 60, duration: 420, easing: OVER });
        A(st, [{ opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }], { delay: 700 + k * 60, duration: 1400, iterations: 2, easing: 'ease-in-out' });
      });
    });
    // ③ 副题
    const subIn = A(subRef.current, [{ opacity: 0, translate: '-4vw 0' }, { opacity: 1, translate: '0 0' }], { delay: 1300, duration: 420 });
    // ④ 旧级 → 新级
    T(1900, () => { if (!lv) return; lv.textContent = String(notice.newLevel); lv.className = 'hl'; A(lv, [{ scale: '2' }, { scale: '1' }], { duration: 320, easing: OVER }); });
    // ⑤ 奖励胶囊
    const pillIn = A(pillRef.current, [{ opacity: 0, translate: '10vw 0' }, { opacity: 1, translate: '0 0' }], { delay: 2300, duration: 420 });
    // ⑥ 牌轻摆
    const sway = A(cardRef.current, [{ rotate: '-8deg' }, { rotate: '-6deg' }], { delay: 2400, duration: 600, direction: 'alternate', iterations: 2, easing: 'ease-in-out' });
    // ⑦ 碎裂退场
    const runExit = () => {
      if (cancelled) return;
      const exits: Animation[] = [];
      const push = (a: Animation | null) => { if (a) exits.push(a); };
      push(A(cardRef.current, [{ rotate: '-8deg', scale: '1' }, { rotate: '-3deg', scale: '1.06' }], { duration: 140 }));
      [cardRef, titleRef, subRef, pillRef, capRef].forEach((r) => push(A(r.current, [{ opacity: 1 }, { opacity: 0 }], { delay: 140, duration: 260, easing: 'linear' })));
      Array.from(starsRef.current?.children ?? []).forEach((el) => push(A(el, [{ opacity: 1 }, { opacity: 0 }], { delay: 140, duration: 260, easing: 'linear' })));
      Array.from(glassRef.current?.children ?? []).forEach((g) => {
        const dx = `${(Math.random() * 30 - 15).toFixed(1)}vw`; const dy = `${(Math.random() * 26 - 6).toFixed(1)}vh`; const rot = `${(Math.random() * 360 - 180).toFixed(0)}deg`;
        push(A(g, [{ opacity: 0, scale: '1', translate: '0 0', rotate: '0deg' }, { opacity: 0.9, offset: 0.12 }, { opacity: 0.75, offset: 0.6 }, { opacity: 0, scale: '.7', translate: `${dx} ${dy}`, rotate: rot }],
          { delay: 140 + Math.random() * 120, duration: (compact ? 1200 : 1700) + Math.random() * (compact ? 400 : 600), easing: 'cubic-bezier(.2,.7,.3,1)' }));
      });
      // ⑧ 退场真结束才露确认键
      Promise.allSettled(exits.map((a) => a.finished)).then(() => { if (!cancelled) setPhase('confirm'); });
    };
    const main = [cardIn, capIn, titleIn, subIn, pillIn, sway].filter((a): a is Animation => !!a);
    if (main.length) Promise.allSettled(main.map((a) => a.finished)).then(() => { if (!cancelled) T(500, runExit); });
    else T(3600, runExit);
    return () => {
      cancelled = true; timers.forEach(clearTimeout);
      [cardRef, titleRef, subRef, pillRef, capRef, starsRef, glassRef, flashRef].forEach((r) => { r.current?.getAnimations?.().forEach((a) => a.cancel()); Array.from(r.current?.children ?? []).forEach((ch) => ch.getAnimations?.().forEach((a) => a.cancel())); });
    };
  }, [bold, startPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  // 一镜到底：确认态停留 1.2s 后自动「确认」
  useEffect(() => { if (!auto || phase !== 'confirm') return; const t = window.setTimeout(finish, 1200); return () => clearTimeout(t); }, [auto, phase, finish]);

  const unlocked = unlockedIn(confidant, notice.oldLevel, notice.newLevel);
  const attrNames = ATTR_NAMES;
  void attrNames;
  const unlockedText = unlocked.map((b) => b.title).join('、');
  return (
    <Portal>
      <div className="pk3-rk" role="dialog" aria-modal="true" aria-label={`羁绊升级！${confidant.name} 亲密度 RANK ${notice.newLevel}`} data-phase={phase}>
        <div className="pk3-rk-sea" aria-hidden>
          <i /><i />
          <b style={{ left: '18vw' }} /><b style={{ left: '46vw', width: '9vw' }} />
          {bubbles.map((b, k) => <span key={k} className="pk3-rk-bub" style={{ left: `${b.x}%`, ['--s' as string]: `${b.size}px`, ['--dur' as string]: `${b.dur}s`, ['--dx' as string]: `${b.dx}vw`, animationDelay: `${b.delay}s` }} />)}
        </div>
        <div className="pk3-rk-flash" ref={flashRef} />
        <div className="pk3-rk-cast">
          <div className="pk3-rk-card" ref={cardRef} style={startPhase === 'confirm' ? { visibility: 'hidden' } : undefined}>
            <Tarot arcanaId={confidant.arcanaId} reversed={confidant.orientation === 'reversed'} width={cw} />
          </div>
          <div className="pk3-rk-title" ref={titleRef} style={startPhase === 'confirm' ? { visibility: 'hidden' } : undefined}>RANK UP!</div>
          <div className="pk3-rk-sub" ref={subRef} style={startPhase === 'confirm' ? { visibility: 'hidden' } : undefined}>
            亲密度 RANK<b ref={lvRef as never}>{notice.newLevel}</b>· 《{card?.name}》
          </div>
          <div className="pk3-rk-pill" ref={pillRef} style={startPhase === 'confirm' ? { visibility: 'hidden' } : undefined}>
            <span className="ic">✦</span>
            <i className="bar" />
            <span className="ic r">+{notice.starShiftGained}</span>
            <span className="min-w-0">
              {unlockedText ? `解锁 ${unlockedText}` : '羁绊加深'}
              <small>亲密度提升带来的奖励 · {INTIMACY_LABELS[notice.newLevel] ?? ''}</small>
            </span>
          </div>
          <div className="pk3-rk-cap" ref={capRef} style={startPhase === 'confirm' ? { visibility: 'hidden' } : undefined}>22 位同伴，和好友一起进步。</div>
          <div ref={starsRef} aria-hidden>
            {spawn.stars.map((s) => <i key={s.k} className="pk3-rk-star" style={{ left: `${s.left}vw`, top: `${s.top}vh`, fontSize: s.size }}>{s.k % 2 ? '✦' : '✧'}</i>)}
          </div>
          <div ref={glassRef} aria-hidden>
            {spawn.glass.map((g, k) => <i key={k} className="pk3-rk-glass" style={{ left: `${g.left}%`, top: `${g.top}%`, ['--w' as string]: `${g.w}px`, ['--h' as string]: `${g.h}px`, rotate: `${g.rot}deg` }} />)}
          </div>
          <div className={`pk3-rk-confirm ${phase === 'confirm' ? 'on' : ''}`} style={!bold && startPhase !== 'confirm' ? { top: 'auto', bottom: '4vh', transform: 'translateX(-50%)' } : undefined}>
            <span className="hint">羁绊等级提升</span>
            <button type="button" className="go" onClick={finish}>确 认<span aria-hidden className="absolute bottom-0 right-3 h-[6px] w-[16px]" style={{ background: P3R.magenta, clipPath: 'polygon(30% 0, 100% 0, 70% 100%, 0 100%)' }} /></button>
          </div>
          {phase === 'playing' && (
            <button type="button" onClick={finish} className="pk3-rk-skip px-3 py-1.5 font-cond text-[13px] tracking-wider" style={{ clipPath: slantClip(6), background: 'rgb(var(--p3r-ink-rgb) / 0.82)', color: 'var(--p3r-on-ink)' }}>SKIP ›</button>
          )}
        </div>
      </div>
    </Portal>
  );
}

// ═════════════════════════ ② 恭喜整页 ═════════════════════════
export function CelebrateScreen({ confidant, level, charges, onClose, onUseStarShift, auto = false }: { confidant: Confidant; level: number; charges: number; onClose: () => void; onUseStarShift: () => void; auto?: boolean }) {
  const card = TAROT_BY_ID[confidant.arcanaId];
  const unlocked = unlockedIn(confidant, level - 1, level);
  const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 844;
  const cardW = Math.round(vw <= 640 ? Math.max(118, Math.min(190, vh * 0.23)) : Math.max(108, Math.min(150, vh * 0.17)));
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  useEffect(() => { if (!auto) return; const t = window.setTimeout(() => (charges > 0 ? onUseStarShift() : onClose()), 2200); return () => clearTimeout(t); }, [auto, charges, onUseStarShift, onClose]);
  const delay = (s: number) => ({ animationDelay: `${s}s` });
  return (
    <Portal>
      <div className="pk3-cl" role="dialog" aria-modal="true" aria-label={`亲密度升级！${confidant.name} 达到亲密度 RANK ${level}`}>
        <span aria-hidden className="pointer-events-none fixed -right-6 top-24 select-none font-cond text-[clamp(90px,26vw,220px)] leading-none" style={{ color: 'var(--p3r-ghost)', transform: 'rotate(-12deg)' }}>RANK</span>
        <div className="pk3-cl-wrap">
          <div className="pk3-cl-head pk3-cl-anim" style={delay(0.04)}><span className="tag">亲密度升级</span><em className="en">INTIMACY UP</em></div>
          <div className="pk3-cl-card pk3-cl-anim" style={delay(0.12)}><Tarot arcanaId={confidant.arcanaId} reversed={confidant.orientation === 'reversed'} width={cardW} /></div>
          <div className="pk3-cl-rank pk3-cl-anim" style={delay(0.2)}>RANK <b>{level}</b></div>
          <div className="pk3-cl-sub pk3-cl-anim" style={delay(0.26)}>《{card?.name ?? '塔罗'}》· {INTIMACY_LABELS[level] ?? ''}</div>
          <div className="pk3-cl-note pk3-cl-anim" style={delay(0.3)}>{confidant.name} · 亲密度到达 RANK {level}</div>
          {unlocked.length > 0 && (
            <div className="pk3-cl-panel pk3-cl-anim" style={delay(0.36)}>
              <span className="k">新解锁的能力</span>
              {unlocked.map((b) => <div key={b.id}><b>{b.title}</b><small>{b.description}</small></div>)}
            </div>
          )}
          <div className="pk3-cl-panel soft pk3-cl-anim" style={delay(0.36)}>
            <span className="k">✧ 获得一次星移机会（余 {charges}）</span>
            <small>星移可以以当前的相处状态，为这段关系重新撰写描述、解读与未来；若关系发生质变（上一阶段 vs 现在），很值得用一次。</small>
          </div>
          {charges > 0 ? (
            <div className="pk3-cl-actions pk3-cl-anim" style={delay(0.46)}>
              <button type="button" className="pk3-cl-btn ghost" onClick={onClose}>稍后再说</button>
              <button type="button" className="pk3-cl-btn main" onClick={onUseStarShift}>✧ 使用星移<span aria-hidden className="absolute bottom-0 right-4 h-[6px] w-[16px]" style={{ background: P3R.magenta, clipPath: 'polygon(30% 0, 100% 0, 70% 100%, 0 100%)' }} /></button>
            </div>
          ) : (
            <div className="pk3-cl-actions single pk3-cl-anim" style={delay(0.46)}>
              <button type="button" className="pk3-cl-btn main" onClick={onClose}>欣然接受</button>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}

// ═════════════════════════ ③ 星移弹窗 ═════════════════════════
const SEP = '\n¶\n';
const SHIFT_TEXT = [PK3_STARSHIFT.summary, PK3_STARSHIFT.description, PK3_STARSHIFT.interpretation, PK3_STARSHIFT.advice].join(SEP);

export function StarShiftModal({ confidant, charges, initialStage = 'input', fail, onClose, auto = false }: { confidant: Confidant; charges: number; initialStage?: ShiftStage; fail?: AIFail; onClose: () => void; auto?: boolean }) {
  const bold = useBoldness();
  const card = TAROT_BY_ID[confidant.arcanaId];
  const initialPhase: AIPhase = initialStage === 'thinking' ? 'thinking' : initialStage === 'preview' ? (fail === 'truncate' ? 'truncated' : 'streaming') : initialStage === 'done' ? 'done' : initialStage === 'error' ? (fail === 'nokey' ? 'nokey' : 'error') : 'idle';
  const ai = useAIStream({ text: SHIFT_TEXT, fail: initialStage === 'error' && !fail ? 'error' : fail, initialPhase, cps: 64, failAt: initialStage === 'preview' && !fail ? 0.06 : 0.45 });
  const [stage, setStage] = useState<ShiftStage>(initialStage);
  const [note, setNote] = useState(initialStage === 'input' ? '' : '最近她愿意和我谈她父亲的事了，也会在白天问我「今天还好吗」。');
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const reversedNext = false;
  const recentActs = useMemo(() => pk3Events(confidant.id).filter((e) => e.type === 'conversation').map((e) => ({ date: e.date, text: `事件：${e.userInput}${e.advice ? `\n当时的建议：${e.advice}` : ''}` }))
    .concat([{ date: '2026/10/16', text: '事件：一起在巴黎咖啡复习到关门' }, { date: '2026/10/9', text: '事件：影时间后在月光馆屋顶聊到天亮' }]), [confidant.id]);

  // AI 相位 → 星移阶段
  useEffect(() => {
    if (stage === 'done' || stage === 'input') return;
    if (ai.phase === 'thinking') setStage('thinking');
    else if (ai.phase === 'streaming' || ai.phase === 'done' || ai.phase === 'truncated') setStage('preview');
    else if (ai.phase === 'error' || ai.phase === 'nokey') setStage(ai.phase === 'error' && ai.progress > 0 && ai.progress < 1 ? 'preview' : 'error');
  }, [ai.phase]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && stage !== 'thinking') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [stage, onClose]);
  // 完成：1.4s 自动关（真实 setTimeout 1400）
  useEffect(() => { if (stage !== 'done') return; const t = window.setTimeout(onClose, 1400); return () => clearTimeout(t); }, [stage, onClose]);
  // 一镜到底：输入停 1s 自动落墨，预览写完停 1.2s 自动确认
  useEffect(() => { if (!auto) return; if (stage === 'input') { const t = window.setTimeout(() => start(), 1000); return () => clearTimeout(t); } if (stage === 'preview' && ai.phase === 'done') { const t = window.setTimeout(() => setStage('done'), 1200); return () => clearTimeout(t); } }, [auto, stage, ai.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => { if (charges <= 0) return; setSaveErr(null); setStage('thinking'); ai.start(); };
  const parts = ai.text.split(SEP);
  const [summary = '', desc = '', interp = '', advice = ''] = parts;
  const streaming = ai.phase === 'streaming';
  const errMsg = saveErr ?? (ai.phase === 'nokey' ? '尚未配置 AI 密钥' : ai.error?.code === 'offline' ? '当前离线：星移需要联网才能重新落墨' : ai.error?.message ?? '星移失败');

  const Head = ({ subtitle, hideClose }: { subtitle?: string; hideClose?: boolean }) => (
    <div className="pk3-sf-head">
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="tag self-start">{confidant.name} · Lv.{confidant.intimacy}</span>
        <span className="pk3-sf-sub">《{card?.name}》{subtitle ? ` · ${subtitle}` : ''}</span>
      </div>
      {!hideClose && <button type="button" className="close" onClick={onClose} aria-label="关闭">✕</button>}
    </div>
  );
  const Diff = ({ title, prev, next, live }: { title: string; prev: string; next: string; live: boolean }) => (
    <div className="pk3-sf-body" style={{ gap: 6 }}>
      <span className="font-heavy text-[12px] tracking-[0.12em]" style={{ color: P3R.roseInk }}>{title}</span>
      <div className="pk3-sf-old">{prev || '（无）'}</div>
      <div className="pk3-sf-new">{next}{live && <span aria-hidden className="pk-caret ml-0.5 inline-block h-[1.05em] w-[3px] translate-y-[3px]" style={{ background: P3R.blue }} />}</div>
    </div>
  );
  const fade = bold ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } : { initial: false as const, animate: { opacity: 1 } };
  const curSection = parts.length - 1;

  return (
    <Portal>
      <div className="pk3-sf-scrim" onClick={stage === 'thinking' ? undefined : onClose}>
        <motion.div className="pk3-sf" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="星移"
          initial={bold ? { scale: 0.92, opacity: 0, y: 12 } : false} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 22, stiffness: 280 }}>
          <AnimatePresence mode="wait">
            {stage === 'input' && (
              <motion.div key="input" {...fade} className="pk3-sf-body">
                <Head subtitle={`星移 · 余 ${charges}`} />
                <label className="flex flex-col gap-1.5">
                  <span className="pk3-sf-sub">你觉得你们的关系发生了什么变化？（可不填）</span>
                  <textarea className="w-full resize-none px-4 py-3 text-[14px] font-semibold leading-[1.7] outline-none" rows={5} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder="例如：最近几次见面 Ta 愿意和我谈更深入的事情了 / 吵了一架之后我们之间多了一份小心翼翼……"
                    style={{ background: P3R.cyanFaint, color: P3R.ink, clipPath: slantClip(12) }} />
                  <span className="text-right text-[11px] font-bold" style={{ color: P3R.grey }}>{note.length} / 300</span>
                </label>
                <div className="pk3-sf-box">
                  <span className="k">最近 {recentActs.length} 条与 Ta 相关的记录（一同纳入星象推演）</span>
                  <div className="max-h-40 overflow-y-auto no-scrollbar">
                    {recentActs.map((a, i) => <div key={i} className="pk3-sf-row"><span className="d">{a.date}</span>{a.text}</div>)}
                  </div>
                </div>
                {charges <= 0 && <div className="pk3-sf-sub" style={{ color: P3R.magenta }}>星移次数已用完：下一次亲密度升级会再给一次。</div>}
                <div className="pk3-sf-actions single">
                  <button type="button" className="pk3-sf-btn main" onClick={start} disabled={charges <= 0}>✧ 重新落墨（消耗 1 次）</button>
                </div>
              </motion.div>
            )}
            {stage === 'thinking' && (
              <motion.div key="thinking" {...fade} className="pk3-sf-body">
                <Head subtitle="星象正在重写这段关系" hideClose />
                <div className="py-9 text-center">
                  <div className="pk3-sf-spin">✦</div>
                  <p className="pk3-sf-sub mt-4">星移中……</p>
                  <div className="mx-auto mt-3 flex w-40 gap-1" aria-hidden>{[0, 1, 2, 3].map((i) => <span key={i} className="pk3-twinkle h-[5px] flex-1" style={{ background: i % 2 ? P3R.cyan : P3R.blue, clipPath: slantClip(3), animationDelay: `${i * 0.2}s` }} />)}</div>
                </div>
              </motion.div>
            )}
            {stage === 'preview' && (
              <motion.div key="preview" {...fade} className="pk3-sf-body">
                <Head subtitle="预览新的落墨" />
                <div className="pk3-sf-box"><span className="k">✧ 这次的变化</span><small style={{ color: P3R.ink, fontWeight: 900 }}>{summary}{streaming && curSection === 0 && <span aria-hidden className="pk-caret ml-0.5 inline-block h-[1em] w-[3px]" style={{ background: P3R.blue }} />}</small></div>
                {curSection >= 1 && <Diff title="关系描述" prev={confidant.description} next={desc} live={streaming && curSection === 1} />}
                {curSection >= 2 && <Diff title="解读" prev={confidant.aiInterpretation} next={interp} live={streaming && curSection === 2} />}
                {curSection >= 3 && <Diff title="未来" prev={confidant.aiAdvice} next={advice} live={streaming && curSection === 3} />}
                {reversedNext && <div className="pk3-sf-box"><span className="k">牌面将调整</span></div>}
                {streaming && <button type="button" onClick={ai.skip} className="self-end font-cond text-[13px] tracking-wider" style={{ color: P3R.roseInk }}>SKIP ›</button>}
                {ai.phase === 'truncated' && (
                  <div className="pk3-sf-box"><span className="k">落墨被截断了</span><small>这次的推演只写到一半，可以让它接着写完。</small>
                    <div className="mt-1"><P3Button size="sm" onClick={ai.resume}>接着写 ›</P3Button></div></div>
                )}
                {ai.phase === 'error' && (
                  <div className="pk3-sf-box"><span className="k" style={{ color: 'var(--p3r-coral-ink)' }}>输出中断</span><small>{ai.error?.message}，已写下的部分保留。</small>
                    <div className="mt-1"><P3Button size="sm" tone="danger" onClick={ai.retry}>重试 ›</P3Button></div></div>
                )}
                {ai.phase === 'aborted' && (
                  <div className="pk3-sf-box"><span className="k">推演被中断</span><small>可以从断点继续。</small><div className="mt-1"><P3Button size="sm" onClick={ai.resume}>继续 ›</P3Button></div></div>
                )}
                <div className="pk3-sf-actions">
                  <button type="button" className="pk3-sf-btn ghost" onClick={() => { ai.abort(); setStage('input'); }}>再想想</button>
                  <button type="button" className="pk3-sf-btn main" disabled={ai.phase !== 'done'} onClick={() => setStage('done')}>落墨</button>
                </div>
                {fail === 'offline' && <div className="pk3-sf-sub text-center">· 本次为离线星移 ·</div>}
              </motion.div>
            )}
            {stage === 'done' && (
              <motion.div key="done" initial={bold ? { opacity: 0, scale: 0.9 } : false} animate={{ opacity: 1, scale: 1 }} className="pk3-sf-body">
                <div className="py-6 text-center">
                  <motion.div className="pk3-sf-done" initial={bold ? { scale: 0 } : false} animate={{ scale: 1, rotate: bold ? [0, 15, 0] : 0 }} transition={{ type: 'spring', damping: 10, stiffness: 200 }}>✧</motion.div>
                  <p className="pk3-sf-sub mt-4">这一次的落墨已经收进档案</p>
                  <p className="mt-1 font-cond text-[12px] tracking-wider" style={{ color: P3R.lilacInk }}>STAR SHIFT · 余 {Math.max(0, charges - 1)}</p>
                </div>
              </motion.div>
            )}
            {stage === 'error' && (
              <motion.div key="error" {...fade} className="pk3-sf-body">
                <div className="py-6 text-center">
                  <div className="mx-auto flex h-14 w-16 items-center justify-center font-cond text-[30px]" style={{ background: P3R.magenta, color: '#fff', clipPath: slantClip(12) }}>!</div>
                  <p className="pk3-sf-title mt-3">{errMsg || '出了点问题'}</p>
                  <p className="pk3-sf-sub">星移次数没有被扣掉。</p>
                </div>
                {ai.phase === 'nokey' ? (
                  <div className="pk3-sf-actions">
                    <button type="button" className="pk3-sf-btn ghost" onClick={() => { ai.abort(); setStage('input'); }}>返回</button>
                    <button type="button" className="pk3-sf-btn main" onClick={() => { onClose(); navigate('settings', undefined, { params: { group: 'ai' } }); }}>去配置密钥</button>
                  </div>
                ) : (
                  <div className="pk3-sf-actions single">
                    <button type="button" className="pk3-sf-btn ghost" onClick={() => { ai.abort(); setStage('input'); }}>返回重试</button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </Portal>
  );
}

// ═════════════════════════ 链路编排 ═════════════════════════
export function RankUpChain({ open, onClose, confidant, notice, start = 'playing', auto = false, charges, shiftStage = 'input', fail }: {
  open: boolean; onClose: () => void; confidant: Confidant; notice: RankUpNotice; start?: ChainPage; auto?: boolean; charges?: number; shiftStage?: ShiftStage; fail?: AIFail;
}) {
  const [page, setPage] = useState<ChainPage>(start);
  const ch = charges ?? (confidant.starShiftCharges ?? 0);
  useEffect(() => { if (open) setPage(start); }, [open, start]);
  if (!open) return null;
  const c = { ...confidant, intimacy: notice.newLevel };
  return (
    <>
      {(page === 'playing' || page === 'confirm') && <RankUpCutIn key={page === 'confirm' && start === 'confirm' ? 'c' : 'p'} confidant={c} notice={notice} startPhase={start === 'confirm' ? 'confirm' : 'playing'} auto={auto} onFinish={() => setPage('celebrate')} />}
      {page === 'celebrate' && <CelebrateScreen confidant={c} level={notice.newLevel} charges={ch} auto={auto} onClose={onClose} onUseStarShift={() => setPage('shift')} />}
      {page === 'shift' && <StarShiftModal confidant={c} charges={ch} initialStage={start === 'shift' ? shiftStage : 'input'} fail={fail} auto={auto} onClose={onClose} />}
      {auto && (
        <div className="pointer-events-none fixed left-1/2 top-[calc(10px+env(safe-area-inset-top))] -translate-x-1/2 px-3 py-1 font-cond text-[12px] tracking-wider" style={{ zIndex: 'var(--p3r-z-system)' as unknown as number, clipPath: slantClip(6), background: 'rgb(var(--p3r-ink-rgb) / 0.82)', color: 'var(--p3r-on-ink)' }}>
          AUTO · {page === 'playing' || page === 'confirm' ? 'RANK UP' : page === 'celebrate' ? 'CELEBRATE' : 'STAR SHIFT'}
        </div>
      )}
    </>
  );
}
