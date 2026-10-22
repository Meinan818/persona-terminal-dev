/**
 * BootLoading.p4g —— 启动类全屏状态（#/p/boot?state=…，无导航）：
 *   loading  启动加载页「正在读取本地数据…」（真实 App.tsx#BootLoading，开屏后初始化仍未完成 >600ms 才显示）
 *   stuck    看门狗 20 秒：「已经等了 20 秒还没读完——这不正常。」+「重新加载」「复制诊断信息」（→「已复制，发给开发者」/「复制失败」）
 *   error    初始化失败：「出错了」+ 错误信息（缺省「初始化失败」）+「重新加载」
 *   crash    全局错误边界（main.tsx#ErrorBoundary）：「应用出错了」+ 信息（缺省「未知错误」）+ 折叠「查看错误详情」+「重新加载」
 *   chunk    分包加载失败：「页面加载失败」「网络不稳或版本已更新，刷新即可重试。」+「刷新」
 * 视觉：午夜频道老电视（crt-frame）——加载 = 雪花 + 转圈，报错 = 劣化彩条 + 信号中断抖动；下方黑底消息框。
 * 「重新加载/刷新」在 demo 里做一次电视关机→开机重放（不真的刷新页面）。底部 Dev 条可切换五种状态。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { PageProps } from '@yellow/registry/types';
import { P4Button, P4Outline } from '@yellow/kit';
import { NoiseLayer, SignalGlitch, ScanlineOverlay, TVFlash, tvPowerVariants } from '@yellow/fx';
import { useLowMotion } from '@yellow/lib/prefs';
import { p4gAsset } from '@yellow/lib/asset';
import { cx } from '@yellow/lib/cx';
import { MOCK_DIAG } from '@yellow/mock/pkg1';

type S = 'loading' | 'stuck' | 'error' | 'crash' | 'chunk';
const STATES: { id: S; label: string }[] = [
  { id: 'loading', label: '加载' }, { id: 'stuck', label: '20 秒' }, { id: 'error', label: '初始化失败' }, { id: 'crash', label: '错误边界' }, { id: 'chunk', label: '分包失败' },
];
const STACK = `TypeError: Cannot read properties of undefined (reading 'level')
    at AttrDetailInlineP4 (AttrDetailInlineP4.tsx:31:22)
    at renderWithHooks (react-dom.development.js:16305:18)
    at mountIndeterminateComponent (react-dom.development.js:20074:13)`;

function Spinner() {
  const low = useLowMotion();
  return (
    <span className="relative inline-flex h-10 w-10 items-center justify-center" role="progressbar" aria-label="加载中">
      <span className="absolute inset-0 rounded-pill border-[5px] border-p4g-yellow/25" />
      <span className="absolute inset-0 rounded-pill border-[5px] border-transparent border-t-p4g-yellow" style={{ animation: low ? undefined : 'p4g-spin .8s linear infinite' }} />
    </span>
  );
}

export default function BootLoading({ params }: PageProps) {
  const low = useLowMotion();
  const initial = (params.get('state') as S) || 'loading';
  const [st, setSt] = useState<S>(STATES.some((x) => x.id === initial) ? initial : 'loading');
  const [gen, setGen] = useState(0);
  const [copied, setCopied] = useState<boolean | null>(null);
  const [detail, setDetail] = useState(false);
  useEffect(() => { setSt(STATES.some((x) => x.id === initial) ? initial : 'loading'); }, [initial]);
  const reload = () => { setCopied(null); setDetail(false); setGen((g) => g + 1); };
  const copy = async () => { try { await navigator.clipboard.writeText(MOCK_DIAG); setCopied(true); } catch { setCopied(false); } };
  const broken = st === 'error' || st === 'crash' || st === 'chunk';

  const msg = {
    loading: { title: null as string | null, body: '正在读取本地数据…' },
    stuck: { title: null, body: '正在读取本地数据…' },
    error: { title: '出错了', body: '初始化失败' },
    crash: { title: '应用出错了', body: "Cannot read properties of undefined (reading 'level')" },
    chunk: { title: '页面加载失败', body: '网络不稳或版本已更新，刷新即可重试。' },
  }[st];

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#0f0d08] text-p4g-cream">
      <ScanlineOverlay />
      <div aria-hidden className="absolute inset-0 opacity-40" style={{ backgroundImage: `url(${p4gAsset('tv-world-fog.webp')})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <AnimatePresence mode="wait">
        <motion.main key={`${st}-${gen}`} className="relative z-[1] mx-auto flex w-full max-w-[980px] flex-1 flex-col items-center justify-center gap-6 px-5 py-10 sm:flex-row sm:gap-10"
          variants={tvPowerVariants(low)} initial="off" animate="on" exit="off">
          {/* 电视 */}
          <div className="relative w-[min(78vw,420px)] shrink-0 sm:w-[min(40vw,420px)]" style={{ aspectRatio: '1000/701' }}>
            <div className="absolute overflow-hidden bg-black" style={{ left: '20.5%', top: '32.1%', right: '31%', bottom: '18.97%', borderRadius: '7%' }}>
              {broken ? (
                <div className="absolute inset-0"><SignalGlitch active loop={!low} className="h-full w-full">
                  <div className="h-full w-full" style={{ backgroundImage: `url(${p4gAsset('color-bars.webp')})`, backgroundSize: 'cover', aspectRatio: '4/3' }} />
                </SignalGlitch></div>
              ) : <NoiseLayer opacity={0.85} />}
              <div className="absolute inset-0 flex items-center justify-center">
                {broken
                  ? <span className="bg-p4g-black px-2 py-0.5 font-display text-[clamp(10px,2.6vw,16px)] font-bold italic tracking-[0.2em] text-white">NO SIGNAL</span>
                  : <Spinner />}
              </div>
            </div>
            <img src={p4gAsset('crt-frame.webp')} alt="" className="pointer-events-none absolute inset-0 h-full w-full" style={{ filter: 'drop-shadow(0 0 1px var(--p4g-yellow)) drop-shadow(0 0 1px var(--p4g-yellow))' }} />
          </div>
          {/* 消息框 */}
          <div className="relative w-full max-w-[440px] min-w-0">
            <div aria-hidden className="absolute inset-0 translate-x-[8px] translate-y-[8px] rounded-sm bg-p4g-orange" />
            <div className="relative overflow-hidden rounded-sm border-3 border-p4g-yellow bg-[color:var(--p4g-msg)] text-[color:var(--p4g-msg-ink)]">
              <div aria-hidden className={cx('h-2', broken ? 'p4g-hazard' : 'p4g-candy')} />
              <div className="px-5 pb-5 pt-4">
                <div className="font-display text-2xs font-bold uppercase tracking-[0.3em] text-p4g-yellow/80">{broken ? 'SIGNAL LOST' : 'NOW LOADING'}</div>
                {msg.title && <h2 className="mt-1"><P4Outline size="clamp(26px,7vw,36px)" stroke={5} fill="var(--p4g-yellow)" strokeColor="#000">{msg.title}</P4Outline></h2>}
                {st === 'loading' || st === 'stuck' ? (
                  <p className="mt-2 flex items-center gap-2 font-display text-lead font-bold"><span aria-hidden className="text-p4g-yellow">&gt;</span>{msg.body}<span aria-hidden className="text-p4g-yellow" style={{ animation: low ? undefined : 'p4g-blink 1s steps(1) infinite' }}>▌</span></p>
                ) : (
                  <p className="mt-2 break-words text-body leading-relaxed text-p4g-cream/90">{msg.body}</p>
                )}
                {st === 'stuck' && (
                  <div className="mt-4 border-t-2 border-dashed border-white/15 pt-3 text-meta">
                    <p className="font-bold text-[#ffb08a]">已经等了 20 秒还没读完——这不正常。</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <P4Button size="sm" onClick={reload}>重新加载</P4Button>
                      <P4Button size="sm" variant={copied === false ? 'danger' : 'secondary'} onClick={copy}>{copied === true ? '已复制，发给开发者' : copied === false ? '复制失败' : '复制诊断信息'}</P4Button>
                    </div>
                  </div>
                )}
                {st === 'crash' && (
                  <div className="mt-3">
                    <button type="button" aria-expanded={detail} onClick={() => setDetail((v) => !v)} className="font-display text-meta font-bold text-p4g-yellow underline underline-offset-2">{detail ? '▾' : '▸'} 查看错误详情</button>
                    {detail && <pre className="mt-2 max-h-40 overflow-auto rounded-xs bg-black/60 p-2 text-2xs leading-snug text-p4g-cream/80">{STACK}</pre>}
                  </div>
                )}
                {(st === 'error' || st === 'crash') && <P4Button className="mt-4" block onClick={reload}>重新加载</P4Button>}
                {st === 'chunk' && <P4Button className="mt-4" block onClick={reload}>刷新</P4Button>}
              </div>
            </div>
          </div>
          <TVFlash low={low} />
        </motion.main>
      </AnimatePresence>
      {/* Dev 切换条 */}
      <nav aria-label="启动状态切换（Dev）" className="relative z-[2] mx-auto mb-[calc(12px+env(safe-area-inset-bottom))] flex max-w-full flex-wrap justify-center gap-1.5 px-3">
        {STATES.map((x) => (
          <a key={x.id} href={`#/p/boot?state=${x.id}`} className={cx('rounded-xs border-2 px-2 py-1 font-display text-cap font-bold', st === x.id ? 'border-p4g-yellow bg-p4g-yellow text-p4g-black' : 'border-white/30 text-white/80')}>{x.label}</a>
        ))}
        <a href="#/" className="rounded-xs border-2 border-white/30 px-2 py-1 font-display text-cap font-bold text-white/80">进入首页 ›</a>
      </nav>
    </div>
  );
}
