/**
 * 模拟 AI 引擎（demo 不联网）：思考约 2.4s → 逐字输出；可出错 / 截断 / 续写 / 跳过 / 中断恢复；低动效直接全文。
 *
 *   const ai = useAIStream({ text: READING, fail: params.get('fail') as AIFail });
 *   ai.start();            // idle → thinking → streaming → done
 *   ai.skip();             // 跳过动画，直接全文
 *   ai.abort();            // 中断（离开页面 / 关窗）→ phase 'aborted'，保留已输出部分
 *   ai.resume();           // 中断恢复 / 截断续写：从断点继续流
 *   ai.retry();            // 出错后重试（重新思考）
 *   <AIThinking label="解读者正在思索" />   <AIText ai={ai} />
 *
 * fail 模式（对应真实各 AI 流程的失败分支）：
 *   'error'    思考结束时报错（网络 / 服务出错）——phase 'error'
 *   'midError' 输出到 failAt 处报错（已输出的保留）
 *   'truncate' 输出到 failAt 处截断（真实 job.truncated）——phase 'truncated'，可 resume() 续写
 *   'offline'  离线：phase 'error' + error.code='offline'（页面给离线兜底文案）
 *   'nokey'    未配密钥：start() 直接 phase 'nokey'
 * phase 起始也可直接指定（直达路由用）：initialPhase='thinking' | 'streaming'(停在 failAt 处继续流) | 'done' | 'error' | 'truncated' | 'aborted' | 'nokey'
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { EqBars } from './motifs/Music';
import { useBoldness } from '@blue/lib/prefs';
import { cx } from '@blue/lib/cx';
import { P3R, tickClip } from '@blue/kit/base';

export type AIPhase = 'idle' | 'thinking' | 'streaming' | 'done' | 'error' | 'truncated' | 'aborted' | 'nokey';
export type AIFail = 'none' | 'error' | 'midError' | 'truncate' | 'offline' | 'nokey' | null | undefined;
export interface AIOptions {
  text: string;
  thinkMs?: number;
  /** 每秒字数（默认 32） */
  cps?: number;
  fail?: AIFail;
  /** 出错 / 截断位置（0–1，默认 0.45） */
  failAt?: number;
  initialPhase?: AIPhase;
  /** 自动开始 */
  auto?: boolean;
  onDone?: (text: string) => void;
}
export interface AIState {
  phase: AIPhase;
  text: string;
  full: string;
  progress: number;
  error: { code: 'network' | 'offline' | 'nokey' | 'truncated'; message: string } | null;
  start: () => void;
  skip: () => void;
  abort: () => void;
  resume: () => void;
  retry: () => void;
  reset: () => void;
}

export function useAIStream({ text, thinkMs = 2400, cps = 32, fail, failAt = 0.45, initialPhase = 'idle', auto = false, onDone }: AIOptions): AIState {
  const anim = useBoldness();
  const cut = Math.max(1, Math.floor(text.length * failAt));
  const startPos = initialPhase === 'done' ? text.length
    : (initialPhase === 'streaming' || initialPhase === 'truncated' || initialPhase === 'aborted' || (initialPhase === 'error' && fail === 'midError')) ? cut : 0;
  const [phase, setPhase] = useState<AIPhase>(initialPhase);
  const [pos, setPos] = useState(startPos);
  const [error, setError] = useState<AIState['error']>(initialPhase === 'error' ? { code: fail === 'offline' ? 'offline' : 'network', message: fail === 'offline' ? '当前离线，已切换为离线兜底解读' : '解读服务暂时无法连接' } : initialPhase === 'nokey' ? { code: 'nokey', message: '尚未配置 AI 密钥' } : null);
  const timers = useRef<number[]>([]);
  const failed = useRef(initialPhase === 'truncated' || initialPhase === 'error' || initialPhase === 'streaming');   // 失败只触发一次：重试 / 续写后不再重复失败
  const doneCb = useRef(onDone); doneCb.current = onDone;
  const clear = () => { timers.current.forEach((t) => { clearTimeout(t); clearInterval(t); }); timers.current = []; };
  useEffect(() => clear, []);

  const stream = useCallback((from: number) => {
    clear();
    if (!anim) { setPos(text.length); setPhase('done'); doneCb.current?.(text); return; }
    setPhase('streaming');
    let p = from;
    const step = Math.max(1, Math.round(cps / 30));
    const iv = window.setInterval(() => {
      p = Math.min(text.length, p + step);
      if (!failed.current && p >= cut && (fail === 'truncate' || fail === 'midError')) {
        failed.current = true;
        p = cut; setPos(p); clearInterval(iv);
        if (fail === 'truncate') { setPhase('truncated'); setError({ code: 'truncated', message: '解读被截断了，可以让它接着写' }); }
        else { setPhase('error'); setError({ code: 'network', message: '输出中断：连接被重置' }); }
        return;
      }
      setPos(p);
      if (p >= text.length) { clearInterval(iv); setPhase('done'); doneCb.current?.(text); }
    }, 1000 / 30);
    timers.current.push(iv);
  }, [anim, text, cps, cut, fail]);

  const think = useCallback((from = 0) => {
    clear();
    setError(null);
    if (fail === 'nokey') { setPhase('nokey'); setError({ code: 'nokey', message: '尚未配置 AI 密钥' }); return; }
    if (!anim) { if ((fail === 'error' || fail === 'offline') && !failed.current) { failed.current = true; setPhase('error'); setError({ code: fail === 'offline' ? 'offline' : 'network', message: fail === 'offline' ? '当前离线，已切换为离线兜底解读' : '解读服务暂时无法连接' }); return; } stream(from); return; }
    setPhase('thinking');
    const t = window.setTimeout(() => {
      if ((fail === 'error' || fail === 'offline') && !failed.current) {
        failed.current = true;
        setPhase('error');
        setError({ code: fail === 'offline' ? 'offline' : 'network', message: fail === 'offline' ? '当前离线，已切换为离线兜底解读' : '解读服务暂时无法连接' });
        return;
      }
      stream(from);
    }, thinkMs);
    timers.current.push(t);
  }, [anim, fail, thinkMs, stream]);

  const start = useCallback(() => { setPos(0); think(0); }, [think]);
  const skip = useCallback(() => { clear(); setPos(text.length); setPhase('done'); setError(null); doneCb.current?.(text); }, [text]);
  const abort = useCallback(() => { clear(); setPhase((ph) => (ph === 'thinking' || ph === 'streaming' ? 'aborted' : ph)); }, []);
  const resume = useCallback(() => { setError(null); stream(pos); }, [stream, pos]);
  const retry = useCallback(() => { think(error?.code === 'network' && pos > 0 ? pos : 0); }, [think, error, pos]);
  const reset = useCallback(() => { clear(); failed.current = false; setPos(0); setPhase('idle'); setError(null); }, []);

  // 直达路由：initialPhase='thinking' / 'streaming' 时自动开跑；auto=true 时 idle 也自动开始
  useEffect(() => {
    if (initialPhase === 'thinking') think(0);
    else if (initialPhase === 'streaming') stream(startPos);
    else if (auto && initialPhase === 'idle') start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { phase, text: text.slice(0, pos), full: text, progress: text.length ? pos / text.length : 1, error, start, skip, abort, resume, retry, reset };
}

/** 推理中指示：三枚斜片起伏 + 文案 +（可选）蓝光圈呼吸 */
export const AIThinking = ({ label = '正在思索…', sub, ring = true, className }: { label?: ReactNode; sub?: ReactNode; ring?: boolean; className?: string }) => (
  <div className={cx('flex items-center gap-3', className)} role="status" aria-live="polite">
    {/* 蓝白 B6：耳机里的音乐 —— 5 根均衡条步进跳动（代替粉版三楔跳 / 通用思考点）；外框 = 斜切耳机罩 */}
    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
      {ring && <span aria-hidden className="absolute inset-0" style={{ boxShadow: 'inset 0 0 0 2px var(--p3r-blue)', clipPath: 'polygon(18% 0, 100% 0, 82% 100%, 0 100%)', background: 'color-mix(in srgb, var(--p3r-cyan) 14%, transparent)' }} />}
      <EqBars bars={5} height={18} barWidth={3} gap={2} />
    </span>
    <span className="min-w-0">
      <span className="block truncate text-[14px] font-black" style={{ color: P3R.ink }}>{label}</span>
      {sub && <span className="block truncate text-[12px]" style={{ color: P3R.grey }}>{sub}</span>}
    </span>
  </div>
);

/** 逐字文本：流式中带闪烁光标；done 后可显示「跳过」已无效 */
export const AIText = ({ ai, className, onSkip }: { ai: AIState; className?: string; onSkip?: () => void }) => (
  <div className={cx('relative whitespace-pre-wrap text-[15px] leading-[1.85]', className)} style={{ color: P3R.ink }} aria-live="polite">
    {ai.text}
    {(ai.phase === 'streaming' || ai.phase === 'thinking') && <span aria-hidden className="bk-caret ml-0.5 inline-block h-[1.05em] w-[3px] translate-y-[3px]" style={{ background: P3R.blue }} />}
    {ai.phase === 'streaming' && (
      <button type="button" onClick={() => { ai.skip(); onSkip?.(); }} className="ml-3 align-middle font-cond text-[12px] tracking-wider" style={{ color: P3R.roseInk }}>SKIP ›</button>
    )}
  </div>
);
