/** 设置 · 通知提醒（真实 components/NotificationSettings.tsx） */
import { useEffect, useState } from 'react';
import { CfgBtn, CfgInput, CfgList, CfgRow, CfgToggle } from '../cfg';
import { updateSettings, useSettings } from '../settingsStore';
import { NOTIF_CONTENTS } from '@pink/mock/pkg6';
import { cx } from '@pink/lib/cx';
import { getNotifPermission, notifPlatformSupported, requestNotifPermission, sendTestNotification, type NotifPermission } from '@/utils/notifications';

export function NotificationSection() {
  const s = useSettings();
  const [perm, setPerm] = useState<NotifPermission>('prompt');
  const [testMsg, setTestMsg] = useState('');
  const supported = notifPlatformSupported();
  const slots = s.notifSlots;
  const upd = (id: string, p: Partial<(typeof slots)[number]>) => updateSettings({ notifSlots: slots.map((x) => (x.id === id ? { ...x, ...p } : x)) });
  useEffect(() => {
    if (!supported) return;
    void getNotifPermission().then(setPerm);
  }, [supported, s.notificationsEnabled]);
  const authorize = async () => {
    const next = await requestNotifPermission();
    setPerm(next);
    if (next === 'granted') updateSettings({ notifPermission: true });
  };
  const toggleEnabled = async (on: boolean) => {
    if (!on) {
      updateSettings({ notificationsEnabled: false });
      return;
    }
    if (supported) {
      const next = await requestNotifPermission();
      setPerm(next);
      if (next !== 'granted') return;
    }
    updateSettings({ notificationsEnabled: true });
  };
  const testNotification = async () => {
    setTestMsg('');
    let current = perm;
    if (supported && current !== 'granted') {
      current = await requestNotifPermission();
      setPerm(current);
    }
    if (!supported) {
      setTestMsg('测试通知只在 Android / iOS 客户端可用。');
      return;
    }
    if (current !== 'granted') {
      setTestMsg('通知权限未授予，无法发送。');
      return;
    }
    const ok = await sendTestNotification();
    setTestMsg(ok ? '✓ 已发送，请查看通知栏' : '发送失败，请检查系统通知权限。');
  };

  return (
    <div className="space-y-2">
      <div className="flex min-w-0 items-start gap-3 rounded-none border-2 border-dashed border-p3r-lilac/50 bg-p3r-panel p-3 text-p3r-ink">
        <span aria-hidden className="font-heavy text-h2">机</span>
        <div className="min-w-0"><h4 className="font-heavy text-body font-bold">本地提醒</h4><p className="text-meta leading-relaxed opacity-80">本地通知在 <b>Android / iOS 客户端</b> 送达（网页版没有这个能力）。你仍可在此预先配置时段与内容，装上客户端后即生效。</p></div>
      </div>
      <CfgList>
        <CfgRow inline label="每日提醒" hint="在你选的时段提醒抽塔罗、未竟待办、逆流预警等。内容在端上生成，不经服务器。">
          <CfgToggle ariaLabel="每日提醒总开关" checked={s.notificationsEnabled} onChange={(v) => void toggleEnabled(v)} />
        </CfgRow>
      </CfgList>
      {s.notificationsEnabled && (
        <>
          {supported && s.notificationsEnabled && perm !== 'granted' && (
            <div className="flex min-w-0 items-center gap-2 rounded-none border-2 border-p3r-lilac/50 bg-p3r-coral px-3 py-2 text-p3r-ink">
              <span className="min-w-0 flex-1 text-meta font-bold">！ <span>通知权限未授予，提醒不会送达。</span></span>
              <CfgBtn onClick={() => void authorize()}>去授权</CfgBtn>
            </div>
          )}
          <CfgList>
            <CfgRow inline label="让助手来写提醒文案" hint={<>每天用<b>当前人格</b>的口吻生成一套推送文案（走助手档模型，一天一次）。没配 AI、离线或生成失败时自动退回内置文案，提醒本身不受影响。</>}>
              <CfgToggle ariaLabel="让助手来写提醒文案" checked={s.notifAiCopy} onChange={(v) => updateSettings({ notifAiCopy: v })} />
            </CfgRow>
            <CfgRow inline label="助手会主动找你" hint="每天最多一条：约好的事过后问你一句结果、认识满一个月这样的日子、好几天没见时说一次想念。夜里 22:30～08:30 不发；锁屏上只写「〈助手的名字〉有话想跟你说」，点开再说是什么事。">
              <CfgToggle ariaLabel="助手会主动找你" checked={s.notifProactive} onChange={(v) => updateSettings({ notifProactive: v })} />
            </CfgRow>
          </CfgList>
          {slots.length === 0 && <p className="rounded-none bg-p3r-panel px-3 py-4 text-center text-meta text-p3r-ink">还没有提醒时段，点下方添加一个。</p>}
          <ul className="grid grid-cols-1 gap-2">
            {slots.map((slot) => (
              <li key={slot.id} className={cx('min-w-0 overflow-hidden rounded-none border-2 border-p3r-lilac/50 bg-p3r-blush-faint text-p3r-ink', !slot.enabled && 'opacity-70')}>
                <div className="flex min-w-0 items-center gap-1.5 bg-p3r-ink px-2 py-2 text-p3r-on-ink">
                  <CfgToggle onDark ariaLabel={`启用「${slot.label}」`} checked={slot.enabled} onChange={(v) => upd(slot.id, { enabled: v })} />
                  <input type="time" value={slot.time} onChange={(e) => upd(slot.id, { time: e.target.value })} aria-label={`「${slot.label}」时间`}
                    className="font-cond tabular w-[5.4em] shrink-0 rounded-none bg-p3r-rose px-1.5 py-1 text-h3 text-p3r-on-rose focus:outline-none" />
                  <CfgInput value={slot.label} placeholder="名称" aria-label="时段名称" onChange={(e) => upd(slot.id, { label: e.target.value })} className="h-9 w-auto flex-1 border-p3r-panel/40 bg-transparent text-p3r-on-ink placeholder:text-p3r-on-ink/50 night:bg-transparent" />
                  <button type="button" aria-label="删除时段" onClick={() => updateSettings({ notifSlots: slots.filter((x) => x.id !== slot.id) })} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none text-p3r-on-ink hover:bg-p3r-coral">✕</button>
                </div>
                <div className="flex min-w-0 flex-wrap gap-1.5 p-2.5">
                  {NOTIF_CONTENTS.map((c) => {
                    const on = slot.contents.includes(c.id);
                    return (
                      <button key={c.id} type="button" title={c.hint} aria-pressed={on} onClick={() => upd(slot.id, { contents: on ? slot.contents.filter((x) => x !== c.id) : [...slot.contents, c.id] })}
                        className={cx('p6-press rounded-none border-2 px-2 py-1 font-heavy text-meta font-bold', on ? 'border-p3r-lilac/50 bg-p3r-rose text-p3r-on-rose' : 'border-dashed border-p3r-lilac/40 opacity-75')}>
                        {c.icon} {c.label}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => updateSettings({ notifSlots: [...slots, { id: `n${Date.now()}`, time: '12:00', enabled: true, label: '新的提醒', contents: ['tarot'] }] })}
            className="p6-press w-full rounded-none border-2 border-dashed border-p3r-lilac/50 bg-p3r-rose py-2.5 font-heavy text-body font-bold text-p3r-on-rose">＋ 添加提醒时段</button>
          <CfgBtn className="w-full" disabled={!supported} onClick={() => void testNotification()}>{testMsg.startsWith('✓') ? '✓ 已发送，请查看通知栏' : supported ? '发送一条测试通知' : '测试通知仅支持客户端'}</CfgBtn>
          {testMsg && <p className="text-meta font-bold text-p3r-lilac-ink">{testMsg}</p>}
        </>
      )}
    </div>
  );
}
