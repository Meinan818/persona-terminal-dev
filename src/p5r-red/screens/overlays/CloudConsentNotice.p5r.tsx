/**
 * CloudConsentNotice 云同步说明（真实 src/components/auth/CloudConsentNotice.tsx；视觉 = v3 b.js openConsent）。
 * ?variant=catchup（默认：已登录老用户进账号页时补弹「关于这朵云，补一份说明」）| gate（登录前闸门「开启云同步之前」，LoginModal 内嵌口径）。
 */
import { useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { toast } from '@/p5r-red/kit/P5Toast';
import { ObSheet, ObBtn } from './ObKit';

const CLAUSES: [string, string, string][] = [
  ['🕯', '用爱发电，不保证永远在线', '同步服务器由开发者个人自费维护，没有服务等级承诺，也可能因为费用或精力而停运。真要关，会尽力提前公告并留出导出时间。'],
  ['🔒', '不看，不用，不给别人', '你的数据只用于"把这台设备的记录搬到另一台"这一件事。开发者不会翻阅内容，不做分析、不训练模型、不交给第三方。'],
  ['🏠', '有些东西根本不出门', '记账的每一笔、与助手和同伴的聊天原文，只存在你的设备里，永远不上传。愿望清单、助手的记忆默认也留在本地，要不要上云由你在「数据类目选择」里勾。'],
  ['🔑', 'AI 的 API Key 默认只留在本机', 'Key 默认不上传。想换设备不用重填的话，在「数据类目选择」里打开「AI 模型 API」，它才会随设置同步。'],
  ['🧺', '重要的东西请自己也存一份', '云端是方便，不是保险箱。随时可以关闭同步并一键删除云端数据；也建议偶尔用「数据与备份」导出一份放在自己手里。'],
];
export default function CloudConsentNotice({ open, onClose, params }: OverlayProps) {
  const [st, setSt] = useState(params?.get('variant') === 'gate' ? 'gate' : 'catchup');
  return (
    <ObSheet open={open} onClose={onClose} title="云同步说明" seed={211} cls="ob-consent" states={[['catchup', '存量补弹（账号页）'], ['gate', '登录前闸门（LoginModal 内嵌）']]} state={st} onState={setSt}>
      {st === 'catchup'
        ? <div className="ob-consent-hd"><small>MASKARIA</small><b>◆</b><h4>关于这朵云，补一份说明</h4><p>你的账号已经在用云同步了——这些话本该更早说</p></div>
        : <div className="ob-consent-hd"><small>登录云端 · 第 1 步</small><h4>开启云同步之前</h4></div>}
      <ol className="ob-clauses">{CLAUSES.map(([i, t, b], k) => <li key={t} style={{ ['--k' as string]: k }}><span className="ob-cl-i" aria-hidden="true">{i}</span><div><b>{t}</b><p>{b}</p></div></li>)}</ol>
      <div className="ob-acts two">
        <ObBtn tone="paper" seed={212} onClick={() => { toast('已跳过：数据只留在这台设备上'); onClose(); }}>{st === 'gate' ? '先不用云同步' : '先不同意'}</ObBtn>
        <ObBtn seed={213} size="lg" onClick={() => { toast('已同意云同步说明'); onClose(); }}>我明白了，继续</ObBtn>
      </div>
      <p className="ob-foot">{st === 'gate' ? '不同意也能照常使用，只是数据只留在这台设备上' : '账号已在使用云同步；不同意的话下次进这一页还会再问一次'}</p>
    </ObSheet>
  );
}
