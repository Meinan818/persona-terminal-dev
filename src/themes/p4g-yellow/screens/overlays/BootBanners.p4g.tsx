/**
 * BootBanners.p4g —— 真实 App.tsx 顶部的两条横幅：
 *   · 启动看门狗（bootNotice）：「上次打开没走完就重新开始了（连续 N 次）」+ 说明 +「复制诊断信息」
 *     （→「已复制，粘贴给开发者即可」/「复制失败，可截图这条」）+ ✕「关闭提示」
 *   · 旧版重置密码链接（staleResetNotice）：「这条密码重置链接已不再支持」+ 说明 + ✕「关闭提示」
 * 视觉：P4G 消息框式斜切条从顶部滑入 + 黄黑条纹 + CRT 扫描线一闪。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import { Portal, P4Button, IconClose } from '@yellow/kit';
import { useLowMotion } from '@yellow/lib/prefs';
import { MOCK_DIAG } from '@yellow/mock/pkg1';

function Banner({ open, onClose, icon, title, children, tone = 'warn' }: { open: boolean; onClose: () => void; icon: string; title: string; children: ReactNode; tone?: 'warn' | 'info' }) {
  const low = useLowMotion();
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="b" role="alert" className="fixed inset-x-0 top-[calc(52px+env(safe-area-inset-top))] mx-auto w-[min(94vw,640px)]" style={{ zIndex: 'var(--p4g-z-toast)' as unknown as number }}
            initial={low ? { opacity: 0 } : { y: -40, opacity: 0, scaleY: 0.2 }} animate={{ y: 0, opacity: 1, scaleY: 1 }} exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }} transition={{ duration: 0.26, ease: [0.2, 0.9, 0.1, 1] }}>
            <div className="relative overflow-hidden rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] text-[color:var(--p4g-msg-ink)] shadow-[6px_6px_0_var(--p4g-orange)] night:border-p4g-yellow">
              <div aria-hidden className={tone === 'warn' ? 'h-2 p4g-hazard' : 'h-2 p4g-candy'} />
              <div className="flex min-w-0 items-start gap-3 px-4 py-3">
                <span aria-hidden className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-p4g-yellow font-display text-h2 font-bold italic text-p4g-black">{icon}</span>
                <div className="min-w-0 flex-1 text-meta">
                  <div className="mb-0.5 font-display text-body font-bold text-p4g-yellow">{title}</div>
                  {children}
                </div>
                <button type="button" aria-label="关闭提示" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xs border-2 border-p4g-yellow text-p4g-yellow active:scale-95"><IconClose size={14} /></button>
              </div>
              {!low && <motion.div aria-hidden className="pointer-events-none absolute inset-0 bg-white/25" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.35, delay: 0.15 }} />}
              <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 1px, transparent 1px 3px)' }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export function WatchdogBanner({ open, onClose, failures = 2 }: OverlayProps & { failures?: number }) {
  const [copied, setCopied] = useState<boolean | null>(null);
  const copy = async () => { try { await navigator.clipboard.writeText(MOCK_DIAG); setCopied(true); } catch { setCopied(false); } };
  return (
    <Banner open={open} onClose={onClose} icon="!" title={`上次打开没走完就重新开始了（连续 ${failures} 次）`}>
      <p className="leading-relaxed opacity-90">这次用轻量模式进来（开屏不放动画、不预热）。如果反复出现，点下面把诊断信息复制给我们：里面只有机型、系统和各表的条数，没有记录内容。</p>
      <P4Button size="sm" className="mt-2" onClick={copy} variant={copied === false ? 'danger' : 'primary'}>
        {copied === true ? '已复制，粘贴给开发者即可' : copied === false ? '复制失败，可截图这条' : '复制诊断信息'}
      </P4Button>
    </Banner>
  );
}

export function StaleResetBanner({ open, onClose }: OverlayProps) {
  return (
    <Banner open={open} onClose={onClose} icon="?" tone="info" title="这条密码重置链接已不再支持">
      <p className="leading-relaxed opacity-90">重置密码的入口已迁移到新的页面。请到登录弹窗点"忘记密码"重新申请一份邮件，直接点击新邮件里的按钮即可完成重置。</p>
    </Banner>
  );
}

export const StaleResetBannerOverlay = StaleResetBanner;
export default function BootBanners(p: OverlayProps) { return <WatchdogBanner {...p} />; }
