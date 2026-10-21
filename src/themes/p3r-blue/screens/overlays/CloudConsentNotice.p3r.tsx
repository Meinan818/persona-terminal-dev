/**
 * 云同步说明（真实 src/components/auth/CloudConsentNotice.tsx）。五条实话 +「先不用云同步 / 先不同意」「我明白了，继续」+ 脚注。
 * variant=gate：登录弹窗首步（LoginModal 内嵌，标题「把数据交给云端之前」）；默认 catchup：已登录老账号补说明「关于这朵云，补一份说明」。
 * 条目原 emoji 图标（🕯🔒🏠🔑🧺）粉版换 01–05 斜块编号。
 */
import type { OverlayProps } from '@blue/registry/types';
import { motion } from 'framer-motion';
import { P3Button, P3R, slantClip, useToast } from '@blue/kit';
import { useBoldness } from '@blue/lib/prefs';
import { SysModal } from '@blue/screens/pkg5/sysmodal';

export const CLAUSES = [
  { title: '用爱发电，不保证永远在线', body: '同步服务器由开发者个人自费维护，没有服务等级承诺，也可能因为费用或精力而停运。真要关，会尽力提前公告并留出导出时间。' },
  { title: '不看，不用，不给别人', body: '你的数据只用于"把这台设备的记录搬到另一台"这一件事。开发者不会翻阅内容，不做分析、不训练模型、不交给第三方。' },
  { title: '有些东西根本不出门', body: '记账的每一笔、与助手和同伴的聊天原文，只存在你的设备里，永远不上传。愿望清单、助手的记忆默认也留在本地，要不要上云由你在「数据类目选择」里决定。' },
  { title: 'AI 的 API Key 默认只留在本机', body: 'Key 默认不上传。想换设备不用重填的话，在「数据类目选择」里打开「AI 模型 API」，它才会随设置同步。' },
  { title: '重要的东西请自己也存一份', body: '云端是方便，不是保险箱。随时可以关闭同步并一键删除云端数据；也建议偶尔用「数据与备份」导出一份放在自己手里。' },
];

export function CloudConsentBody({ variant, onAccept, onDecline, busy }: { variant: 'gate' | 'catchup'; onAccept: () => void; onDecline: () => void; busy?: boolean }) {
  const anim = useBoldness();
  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-2">
        {CLAUSES.map((c, i) => (
          <motion.div key={c.title} className="relative flex min-w-0 gap-3 py-2.5 pl-4 pr-4" style={{ clipPath: slantClip(10), background: i % 2 ? 'var(--p3r-row-alt)' : 'var(--p3r-row)' }}
            initial={anim ? { opacity: 0, x: -16 } : false} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i, type: 'spring', stiffness: 420, damping: 32 }}>
            <span className="flex h-7 w-8 shrink-0 items-center justify-center font-cond text-[14px]" style={{ background: i % 2 ? P3R.cyan : P3R.blue, color: i % 2 ? 'var(--p3r-mulberry)' : P3R.onBlue, clipPath: slantClip(5) }}>{String(i + 1).padStart(2, '0')}</span>
            <div className="min-w-0">
              <div className="text-[14px] font-black" style={{ color: P3R.ink }}>{c.title}</div>
              <p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: P3R.inkSoft }}>{c.body}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2 pt-4 sm:grid-cols-2">
        <P3Button corner disabled={busy} onClick={onAccept} className="sm:order-2">我明白了，继续</P3Button>
        <P3Button tone="soft" disabled={busy} onClick={onDecline} className="sm:order-1">{variant === 'gate' ? '先不用云同步' : '先不同意'}</P3Button>
      </div>
      <p className="mt-3 text-center text-[11px] font-bold" style={{ color: P3R.grey }}>{variant === 'gate' ? '不同意也能照常使用，只是数据只留在这台设备上' : '账号已在使用云同步；不同意的话下次进这一页还会再问一次'}</p>
    </div>
  );
}

export default function CloudConsentNotice({ open, onClose, params }: OverlayProps) {
  const toast = useToast();
  const gate = params?.get('variant') === 'gate';
  return (
    <SysModal open={open} onClose={onClose} title={gate ? '把数据交给云端之前' : '关于这朵云，补一份说明'} subtitle={gate ? '几句实话，读完再决定' : '你的账号已经在用云同步了——这些话本该更早说'}>
      <CloudConsentBody variant={gate ? 'gate' : 'catchup'} onAccept={() => { onClose(); toast.success('已记下你的同意'); }} onDecline={() => { onClose(); toast('好的，下次再说'); }} />
    </SysModal>
  );
}
