/**
 * 云同步说明（真实 src/components/auth/CloudConsentNotice.tsx）。五条实话 + 「先不用云同步 / 先不同意」「我明白了，继续」+ 脚注。
 * variant=gate：登录弹窗首步（嵌在 LoginModal 里）；variant=catchup：已登录老账号补说明弹窗「关于这朵云，补一份说明」。
 */
import type { OverlayProps } from '@yellow/registry/types';
import { AnimatePresence, motion } from 'framer-motion';
import { Portal, P4Button, useToast } from '@yellow/kit';
import { tvPowerVariants, TVFlash } from '@yellow/fx';
import { useLowMotion } from '@yellow/lib/prefs';

export const CLAUSES = [
  { icon: '🕯', title: '用爱发电，不保证永远在线', body: '同步服务器由开发者个人自费维护，没有服务等级承诺，也可能因为费用或精力而停运。真要关，会尽力提前公告并留出导出时间。' },
  { icon: '🔒', title: '不看，不用，不给别人', body: '你的数据只用于"把这台设备的记录搬到另一台"这一件事。开发者不会翻阅内容，不做分析、不训练模型、不交给第三方。' },
  { icon: '🏠', title: '有些东西根本不出门', body: '记账的每一笔、与助手和同伴的聊天原文，只存在你的设备里，永远不上传。愿望清单、助手的记忆默认也留在本地，要不要上云由你在「数据类目选择」里勾。' },
  { icon: '🔑', title: 'AI 的 API Key 默认只留在本机', body: 'Key 默认不上传。想换设备不用重填的话，在「数据类目选择」里打开「AI 模型 API」，它才会随设置同步。' },
  { icon: '🧺', title: '重要的东西请自己也存一份', body: '云端是方便，不是保险箱。随时可以关闭同步并一键删除云端数据；也建议偶尔用「数据与备份」导出一份放在自己手里。' },
];

export function CloudConsentBody({ variant, onAccept, onDecline, busy }: { variant: 'gate' | 'catchup'; onAccept: () => void; onDecline: () => void; busy?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-2">
        {CLAUSES.map((c, i) => (
          <div key={c.title} className="relative flex min-w-0 gap-3 rounded-sm border-thin border-white/15 bg-white/5 p-3">
            <span className="absolute -left-[2px] -top-[2px] rounded-br-sm bg-p4g-yellow px-1.5 p4g-num text-2xs text-p4g-black">{String(i + 1).padStart(2, '0')}</span>
            <span aria-hidden className="shrink-0 pt-1 text-lead leading-none">{c.icon}</span>
            <div className="min-w-0">
              <div className="font-display text-body font-bold text-p4g-yellow">{c.title}</div>
              <p className="mt-1 text-meta leading-relaxed text-[color:var(--p4g-msg-ink)]/85">{c.body}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 pt-4">
        <P4Button variant="secondary" disabled={busy} onClick={onDecline}>{variant === 'gate' ? '先不用云同步' : '先不同意'}</P4Button>
        <P4Button disabled={busy} onClick={onAccept}>我明白了，继续</P4Button>
      </div>
      <p className="mt-3 text-center text-2xs text-[color:var(--p4g-msg-ink)]/70">{variant === 'gate' ? '不同意也能照常使用，只是数据只留在这台设备上' : '账号已在使用云同步；不同意的话下次进这一页还会再问一次'}</p>
    </div>
  );
}

/** 消息框式全屏弹窗壳（登录 / 补说明共用）：CRT 开机弹出 + 黄色偏移底板 */
export function MsgModal({ open, children, header, onBackdrop, wide }: { open: boolean; children: React.ReactNode; header?: React.ReactNode; onBackdrop?: () => void; wide?: boolean }) {
  const low = useLowMotion();
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div key="m" className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 'var(--p4g-z-system)' as unknown as number }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { delay: 0.12 } }}>
            <div className="absolute inset-0 bg-[color:var(--p4g-scrim)]" onClick={onBackdrop} />
            <motion.div variants={tvPowerVariants(low)} initial="off" animate="on" exit="off" className={`relative w-full min-w-0 ${wide ? 'max-w-[480px]' : 'max-w-[440px]'}`} role="dialog" aria-modal="true">
              <div aria-hidden className="absolute inset-0 translate-x-[10px] translate-y-[10px] rounded-sm bg-[color:var(--p4g-msg-plate-2)]" />
              <div aria-hidden className="absolute inset-0 translate-x-[5px] translate-y-[5px] rounded-sm bg-[color:var(--p4g-msg-plate)]" />
              <div className="relative flex max-h-[calc(100dvh-7rem)] flex-col overflow-hidden rounded-sm border-3 border-p4g-black bg-[color:var(--p4g-msg)] text-[color:var(--p4g-msg-ink)] night:border-p4g-yellow">
                <div aria-hidden className="h-[6px] shrink-0 p4g-candy" />
                {header}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
              </div>
              <TVFlash low={low} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export const MsgHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="shrink-0 px-5 pb-3 pt-4 text-center">
    <div className="font-display text-2xs font-bold tracking-[0.5em] text-p4g-yellow">MASKARIA</div>
    <div className="my-1.5 flex items-center justify-center gap-2" aria-hidden><span className="h-[3px] w-10 bg-p4g-yellow" /><span className="text-p4g-orange">◆</span><span className="h-[3px] w-10 bg-p4g-yellow" /></div>
    <h2 className="font-display text-h2 font-bold text-white">{title}</h2>
    {subtitle && <p className="mt-1.5 text-meta leading-relaxed text-[color:var(--p4g-msg-ink)]/80">{subtitle}</p>}
  </div>
);

export default function CloudConsentNotice({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const gate = params?.get('variant') === 'gate';
  return (
    <MsgModal open={open} header={gate ? <MsgHeader title="把数据交给云端之前" subtitle="几句实话，读完再决定" /> : <MsgHeader title="关于这朵云，补一份说明" subtitle="你的账号已经在用云同步了——这些话本该更早说" />}>
      <CloudConsentBody variant={gate ? 'gate' : 'catchup'} onAccept={() => { onClose(); toast.success('已记下你的同意'); }} onDecline={() => { onClose(); toast('好的，下次再说'); }} />
    </MsgModal>
  );
}
