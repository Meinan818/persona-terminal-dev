/**
 * BootLoading.p3r —— 启动期全屏状态（真实 App.tsx#BootLoading / error 分支 · main.tsx#ErrorBoundary · vite:preloadError 兜底 HTML），P3R「NOW LOADING / SIGNAL LOST」重画。
 *   ?state=loading  开屏结束而初始化未完成：600ms 内什么都不画（一闪而过的字比空白更扎眼），之后三斜片 + NOW LOADING +「正在读取本地数据…」；20s 自动转 stuck
 *   ?state=stuck    看门狗：「已经等了 20 秒还没读完——这不正常。」+「重新加载」「复制诊断信息」（→ 已复制，发给开发者 / 复制失败）
 *   ?state=error    initializeApp 抛错：「出错了」+ 错误信息（缺省「初始化失败」）+「重新加载」
 *   ?state=crash    全局错误边界：「应用出错了」+ 错误信息（缺省「未知错误」）+ 折叠「查看错误详情」+「重新加载」
 *   ?state=chunk    分包加载失败：「页面加载失败」+「网络不稳或版本已更新，刷新即可重试。」+「刷新」
 *   &msg=… 自定错误信息；&copy=fail 复制失败分支。状态切换交叉淡入 160ms。
 * 「重新加载 / 刷新」在 demo 里重放本状态（不真刷新页面，免得丢路由）。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import type { PageProps } from '@pink/registry/types';
import { P3Button, P3R, slantClip, GhostWords, TitlePeriod } from '@pink/kit';
import { PeriodMark } from '@pink/fx';
import { useBoldness } from '@pink/lib/prefs';
import { MOCK_CRASH, MOCK_DIAG } from '@pink/mock/pkg1';
import { TRI_CLIP } from '@pink/screens/pkg1/fxbits';

type BootState = 'loading' | 'stuck' | 'error' | 'crash' | 'chunk';

const Loader = () => (
  <span className="pk-think flex items-end gap-1.5" aria-hidden>
    {[P3R.blue, P3R.cyan, P3R.magenta].map((c, i) => <i key={i} className="block h-[18px] w-[13px]" style={{ background: c, clipPath: TRI_CLIP }} />)}
  </span>
);

const Frame = ({ children, ghost, tone = 'rose' }: { children: ReactNode; ghost: string; tone?: 'rose' | 'coral' }) => (
  <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-6">
    <GhostWords words={[ghost]} className="left-[-4%] top-[14%] text-[clamp(80px,24vw,220px)]" />
    <div aria-hidden className="absolute -left-[10%] top-[62%] h-[46px] w-[130%] -rotate-[9deg]" style={{ background: tone === 'coral' ? 'rgb(var(--p3r-magenta-rgb) / 0.85)' : 'var(--pk-band)' }} />
    <div className="relative w-full max-w-md">{children}</div>
  </div>
);

export default function BootLoading({ params }: PageProps) {
  const anim = useBoldness();
  const init = (params.get('state') as BootState) || 'loading';
  const [state, setState] = useState<BootState>(init);
  const [show, setShow] = useState(init !== 'loading');
  const [copied, setCopied] = useState<null | boolean>(null);
  const [detail, setDetail] = useState(false);
  const [gen, setGen] = useState(0);
  const msg = params.get('msg');

  useEffect(() => {
    if (state !== 'loading') return;
    setShow(false);
    const t = window.setTimeout(() => setShow(true), 600);
    const t2 = window.setTimeout(() => setState('stuck'), 20000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [state, gen]);

  const reload = () => { setCopied(null); setDetail(false); setState(init === 'stuck' ? 'loading' : init); setGen((g) => g + 1); };
  const copy = async () => {
    try { if (params.get('copy') === 'fail') throw new Error('denied'); await navigator.clipboard.writeText(JSON.stringify(MOCK_DIAG, null, 1)); setCopied(true); }
    catch { setCopied(false); }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div key={`${state}-${gen}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
        {(state === 'loading' || state === 'stuck') && (
          <Frame ghost="LOADING">
            {(show || state === 'stuck') ? (
              <div className="flex flex-col items-center text-center" role="status" aria-live="polite" data-testid={state === 'stuck' ? 'boot-stuck' : undefined}>
                <Loader />
                <span className="mt-4 font-cond text-[15px] tracking-[0.34em]" style={{ color: P3R.roseInk }}>NOW LOADING</span>
                <p className="mt-2 text-[15px] font-black" style={{ color: P3R.ink }}>正在读取本地数据…</p>
                {state === 'stuck' && (
                  <motion.div className="mt-6 w-full space-y-3 px-5 py-4 text-left" style={{ background: P3R.panel, clipPath: slantClip(12), boxShadow: 'var(--p3r-shadow)' }}
                    initial={anim ? { y: 12, opacity: 0 } : false} animate={{ y: 0, opacity: 1 }}>
                    <p className="text-[13px] font-bold" style={{ color: P3R.inkSoft }}>已经等了 20 秒还没读完——这不正常。</p>
                    <div className="flex flex-wrap gap-2">
                      <P3Button size="sm" corner onClick={reload}>重新加载</P3Button>
                      <P3Button size="sm" tone={copied === true ? 'ink' : copied === false ? 'danger' : 'soft'} onClick={() => void copy()}>
                        {copied === true ? '已复制，发给开发者' : copied === false ? '复制失败' : '复制诊断信息'}
                      </P3Button>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : <div className="h-40" aria-hidden />}
          </Frame>
        )}

        {(state === 'error' || state === 'crash' || state === 'chunk') && (
          <Frame ghost={state === 'chunk' ? 'RETRY' : 'SIGNAL LOST'} tone={state === 'chunk' ? 'rose' : 'coral'}>
            <div className="relative px-6 pb-6 pt-8 text-center" style={{ background: P3R.panel, clipPath: slantClip(18), boxShadow: 'var(--p3r-shadow-lg)' }} role="alert">
              <span aria-hidden className="absolute -left-6 top-3 h-6 w-[130%] -rotate-[6deg]" style={{ background: state === 'chunk' ? P3R.blue : P3R.magenta, opacity: 0.9 }} />
              <span className="relative -mt-2 mb-3 block font-cond text-[12px] tracking-[0.3em]" style={{ color: '#fff' }}>{state === 'chunk' ? 'NOW LOADING' : 'SIGNAL LOST'}</span>
              <h2 className="relative inline-flex items-end font-heavy text-[30px] leading-tight" style={{ color: state === 'chunk' ? P3R.ink : 'var(--p3r-coral-ink)' }}>
                {state === 'error' ? '出错了' : state === 'crash' ? '应用出错了' : '页面加载失败'}<TitlePeriod className="mb-2 ml-1.5" />
              </h2>
              <p className="relative mt-2 break-words text-[14px] font-bold" style={{ color: P3R.inkSoft }}>
                {state === 'error' ? (msg || '初始化失败') : state === 'crash' ? (msg || MOCK_CRASH.message || '未知错误') : '网络不稳或版本已更新，刷新即可重试。'}
              </p>
              {state === 'crash' && (
                <div className="relative mt-4 text-left">
                  <button type="button" aria-expanded={detail} onClick={() => setDetail((d) => !d)} className="flex items-center gap-1.5 text-[13px] font-black" style={{ color: P3R.roseInk }}>
                    <span aria-hidden className="inline-block h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent transition-transform" style={{ borderLeftColor: P3R.blue, transform: detail ? 'rotate(90deg)' : undefined }} />查看错误详情
                  </button>
                  <AnimatePresence initial={false}>
                    {detail && (
                      <motion.pre initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="no-scrollbar mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all px-3 py-2 font-mono text-[11px] leading-relaxed"
                        style={{ background: 'var(--p3r-row)', color: P3R.inkSoft, clipPath: slantClip(6) }}>{MOCK_CRASH.stack}</motion.pre>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <div className="relative mt-5 flex justify-center"><P3Button size="lg" corner onClick={reload}>{state === 'chunk' ? '刷新' : '重新加载'}</P3Button></div>
              <div className="relative mt-4 flex justify-center"><PeriodMark size={0.5} /></div>
            </div>
          </Frame>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
