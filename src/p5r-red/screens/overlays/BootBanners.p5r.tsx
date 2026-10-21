/**
 * 启动横幅（P1-18；真实 src/App.tsx bootNotice / staleResetNotice 两条 fixed 顶部横幅，y -16→0 / 0.22s 入、y -12 淡出）。
 * v3 无此件，按红主题语汇做：墨色撕纸条 + 红错位硬影（看门狗）/ 红纸条 + 墨影（旧版重置链接），✕ 为 oa-sum-x 硬角键。
 *   ?variant=watchdog（默认）「上次打开没走完就重新开始了（连续 N 次）」+ 复制诊断信息三态（?copy=ok|fail 直达）  ?n=2
 *   ?variant=stale   「这条密码重置链接已不再支持」
 * 文案逐字抄真实。✕ 关闭（看门狗 = ackBootFailures）。
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { Portal } from '@/p5r-red/kit/Portal';
import { P5Shp } from '@/p5r-red/kit/P5Shp';
import { P5XGlyph } from '@/p5r-red/kit/P5Layer';
import { useLowMotion } from '@/p5r-red/lib/prefs';
import './BootBanners.p5r.css';

export default function BootBanners({ open, onClose, params }: OverlayProps) {
  const v = params?.get('variant') ?? 'watchdog';
  const n = Number(params?.get('n') ?? 2);
  const q = params?.get('copy');
  const [copied, setCopied] = useState<null | boolean>(q === 'ok' ? true : q === 'fail' ? false : null);
  const [show, setShow] = useState(open);
  const low = useLowMotion();
  useEffect(() => setShow(open), [open]);
  const copy = async () => { try { await navigator.clipboard.writeText(JSON.stringify({ ua: navigator.userAgent, failures: n, tables: { activities: 86 } }, null, 1)); setCopied(true); } catch { setCopied(false); } };
  const close = () => { setShow(false); setTimeout(onClose, 240); };
  const stale = v === 'stale';
  return (
    <Portal>
      <AnimatePresence>
        {show && (
          <motion.div key={v} className="bb5" role="alert" data-testid={stale ? undefined : 'boot-notice'}
            initial={{ opacity: 0, y: low ? 0 : -16, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: low ? 0 : -12, x: '-50%' }} transition={{ duration: 0.22 }}>
            <P5Shp kind="torn" seed={stale ? 233 : 231} tone={stale ? 'paper' : 'ink'} className={`bb5-card ${stale ? 'stale' : ''}`}>
              <span className="bb5-ic" aria-hidden="true">{stale ? '⚠' : '🛟'}</span>
              <div className="bb5-m">
                {stale ? (
                  <>
                    <b>这条密码重置链接已不再支持</b>
                    <p>重置密码的入口已迁移到新的页面。请到登录弹窗点"忘记密码"重新申请一份邮件，直接点击新邮件里的按钮即可完成重置。</p>
                  </>
                ) : (
                  <>
                    <b>上次打开没走完就重新开始了（连续 {n} 次）</b>
                    <p>这次用轻量模式进来（开屏不放动画、不预热）。如果反复出现，点下面把诊断信息复制给我们：里面只有机型、系统和各表的条数，没有记录内容。</p>
                    <button type="button" className="bb5-copy" onClick={() => void copy()}>{copied === true ? '已复制，粘贴给开发者即可' : copied === false ? '复制失败，可截图这条' : '复制诊断信息'}</button>
                  </>
                )}
              </div>
              <button type="button" className="bb5-x" aria-label="关闭提示" onClick={close}><P5XGlyph s={13} c={stale ? '#111' : 'var(--p5r-paper)'} /></button>
            </P5Shp>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
