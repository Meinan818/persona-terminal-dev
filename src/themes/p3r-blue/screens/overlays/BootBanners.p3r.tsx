/**
 * BootBanners.p3r —— 启动期顶部横幅（真实 App.tsx bootNotice / staleResetNotice）。
 *   入场：opacity 0 / y -16 → 1 / 0（.22s），退场 y -12；居中、max-w-md、top = 1rem + 安全区，z 210，role=alert。
 *   看门狗横幅（boot-watchdog-banner）：「上次打开没走完就重新开始了（连续 N 次）」+ 说明 + 「复制诊断信息」（→ 已复制，粘贴给开发者即可 / 复制失败，可截图这条）+ ✕「关闭提示」
 *   旧版重置链接横幅（boot-stale-reset-banner）：「这条密码重置链接已不再支持」+ 迁移说明 + ✕「关闭提示」（真实琥珀色警示条 → 粉版琥珀斜条）
 * 粉版：真实的圆角深灰 / 琥珀条 → P3R 系统提示斜条（深蓝墨底 + 蓝楔标 / 琥珀底），🛟 ⚠ emoji → 单色字形。
 * 演示：?failures=3；?copy=fail 复制失败分支。
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import { Portal, P3R, slantClip } from '@blue/kit';
import { useBoldness } from '@blue/lib/prefs';
import { MOCK_DIAG } from '@blue/adapters/pkg1';
import { TRI_CLIP } from '@blue/screens/pkg1/fxbits';

const Shell = ({ open, children, tone }: { open: boolean; children: ReactNode; tone: 'ink' | 'amber' }) => {
  const anim = useBoldness();
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div role="alert" initial={anim ? { opacity: 0, y: -16 } : { opacity: 0 }} animate={{ opacity: 1, y: 0 }} exit={anim ? { opacity: 0, y: -12 } : { opacity: 0 }} transition={{ duration: 0.22 }}
            className="fixed inset-x-0 flex justify-center px-4" style={{ top: 'calc(1rem + env(safe-area-inset-top))', zIndex: 210 }}>
            <div className="relative w-full max-w-md">
              <span aria-hidden className="absolute inset-0" style={{ background: tone === 'ink' ? 'var(--p3r-mulberry)' : 'var(--p3r-amber)', clipPath: slantClip(12), boxShadow: '0 16px 40px rgba(13,22,42,0.3)' }} />
              <span aria-hidden className="absolute left-0 top-0 h-full w-[10px]" style={{ background: tone === 'ink' ? P3R.blue : P3R.magenta, clipPath: 'polygon(0 0, 100% 0, 30% 100%, 0 100%)' }} />
              <div className="relative flex items-start gap-3 py-3 pl-6 pr-4" style={{ color: tone === 'ink' ? '#fff' : 'var(--p3r-mulberry)' }}>{children}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};
const CloseX = ({ onClick, dark }: { onClick: () => void; dark: boolean }) => (
  <button type="button" onClick={onClick} aria-label="关闭提示" className="flex h-7 w-7 shrink-0 items-center justify-center text-sm font-black" style={{ background: dark ? 'rgba(255,255,255,0.18)' : 'rgba(13,22,42,0.15)', clipPath: slantClip(4) }}>✕</button>
);

export const WatchdogBanner = ({ open, onClose, failures = 2, copyFails = false }: { open: boolean; onClose: () => void; failures?: number; copyFails?: boolean }) => {
  const [copied, setCopied] = useState<null | boolean>(null);
  const copy = async () => {
    try {
      if (copyFails) throw new Error('denied');
      await navigator.clipboard.writeText(JSON.stringify(MOCK_DIAG, null, 1));
      setCopied(true);
    } catch { setCopied(false); }
  };
  return (
    <Shell open={open} tone="ink">
      <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="9" fill="none" stroke="var(--bk-bubble-a)" strokeWidth="3" /><circle cx="12" cy="12" r="4" fill="none" stroke="var(--bk-bubble-a)" strokeWidth="2" /><path d="M5.6 5.6l3.6 3.6M18.4 5.6l-3.6 3.6M5.6 18.4l3.6-3.6M18.4 18.4l-3.6-3.6" stroke="var(--bk-bubble-a)" strokeWidth="2" /></svg>
      <div className="min-w-0 flex-1 text-xs leading-relaxed">
        <div className="mb-0.5 font-black">上次打开没走完就重新开始了（连续 {failures} 次）</div>
        <div className="opacity-90">这次用轻量模式进来（开屏不放动画、不预热）。如果反复出现，点下面把诊断信息复制给我们：里面只有机型、系统和各表的条数，没有记录内容。</div>
        <button type="button" onClick={() => void copy()} className="mt-2 px-3 py-1.5 font-black" style={{ background: copied === true ? P3R.blue : 'rgba(255,255,255,0.15)', color: '#fff', clipPath: slantClip(6) }}>
          {copied === true ? '已复制，粘贴给开发者即可' : copied === false ? '复制失败，可截图这条' : '复制诊断信息'}
        </button>
      </div>
      <CloseX onClick={onClose} dark />
    </Shell>
  );
};

export const StaleResetBanner = ({ open, onClose }: { open: boolean; onClose: () => void }) => (
  <Shell open={open} tone="amber">
    <span aria-hidden className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-[13px] font-black" style={{ background: 'var(--p3r-mulberry)', color: 'var(--p3r-amber)', clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }}>!</span>
    <div className="min-w-0 flex-1 text-xs leading-relaxed">
      <div className="mb-0.5 font-black">这条密码重置链接已不再支持</div>
      <div className="opacity-90">重置密码的入口已迁移到新的页面。请到登录弹窗点"忘记密码"重新申请一份邮件，直接点击新邮件里的按钮即可完成重置。</div>
    </div>
    <span aria-hidden className="hidden" style={{ clipPath: TRI_CLIP }} />
    <CloseX onClick={onClose} dark={false} />
  </Shell>
);

export const WatchdogOverlay = ({ open, onClose, params }: OverlayProps) => <WatchdogBanner open={open} onClose={onClose} failures={Number(params?.get('failures') ?? 2) || 2} copyFails={params?.get('copy') === 'fail'} />;
export const StaleResetOverlay = ({ open, onClose }: OverlayProps) => <StaleResetBanner open={open} onClose={onClose} />;
export default WatchdogOverlay;
