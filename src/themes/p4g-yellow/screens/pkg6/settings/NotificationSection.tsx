/** 设置 · 通知提醒（真实 components/NotificationSettings.tsx） */
import { useState } from 'react';
import { CfgBtn, CfgInput, CfgList, CfgRow, CfgToggle } from '../cfg';
import { updateSettings, useSettings } from '../settingsStore';
import { NOTIF_CONTENTS } from '@yellow/mock/pkg6';
import { cx } from '@yellow/lib/cx';

export function NotificationSection() {
  const s = useSettings();
  const [sent, setSent] = useState(false);
  const slots = s.notifSlots;
  const upd = (id: string, p: Partial<(typeof slots)[number]>) => updateSettings({ notifSlots: slots.map((x) => (x.id === id ? { ...x, ...p } : x)) });

  return (
    <div className="space-y-2">
      <div className="flex min-w-0 items-start gap-3 rounded-[4px] border-2 border-dashed border-p4g-black bg-p4g-white p-3 text-p4g-black night:border-p4g-yellow night:bg-p4g-black night:text-p4g-ink">
        <span aria-hidden className="text-h2">📱</span>
        <div className="min-w-0"><h4 className="font-display text-body font-bold">本地提醒</h4><p className="text-meta leading-relaxed opacity-80">本地通知在 <b>Android / iOS 客户端</b> 送达（网页版没有这个能力）。你仍可在此预先配置时段与内容，装上客户端后即生效。</p></div>
      </div>
      <CfgList>
        <CfgRow inline label="每日提醒" hint="在你选的时段提醒抽塔罗、未竟待办、逆流预警等。内容在端上生成，不经服务器。">
          <CfgToggle ariaLabel="每日提醒总开关" checked={s.notificationsEnabled} onChange={(v) => updateSettings({ notificationsEnabled: v })} />
        </CfgRow>
      </CfgList>
      {s.notificationsEnabled && (
        <>
          {!s.notifPermission && (
            <div className="flex min-w-0 items-center gap-2 rounded-[4px] border-2 border-p4g-black bg-p4g-orange px-3 py-2 text-p4g-black night:border-p4g-yellow">
              <span className="min-w-0 flex-1 text-meta font-bold">⚠ <span>通知权限未授予，提醒不会送达。</span></span>
              <CfgBtn onClick={() => updateSettings({ notifPermission: true })}>去授权</CfgBtn>
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
          {slots.length === 0 && <p className="rounded-[4px] bg-p4g-surface px-3 py-4 text-center text-meta text-p4g-ink">还没有提醒时段，点下方添加一个。</p>}
          <ul className="grid grid-cols-1 gap-2">
            {slots.map((slot) => (
              <li key={slot.id} className={cx('min-w-0 overflow-hidden rounded-[4px] border-3 border-p4g-black bg-p4g-surface-2 text-p4g-ink shadow-hard-sm night:border-p4g-yellow', !slot.enabled && 'opacity-70')}>
                <div className="flex min-w-0 items-center gap-2 bg-p4g-black px-2.5 py-2 text-p4g-white">
                  <CfgToggle onDark ariaLabel={`启用「${slot.label}」`} checked={slot.enabled} onChange={(v) => upd(slot.id, { enabled: v })} />
                  <input type="time" value={slot.time} onChange={(e) => upd(slot.id, { time: e.target.value })} aria-label={`「${slot.label}」时间`}
                    className="p4g-num w-[6.2em] shrink-0 rounded-[3px] bg-p4g-yellow px-1.5 py-1 text-h3 text-p4g-black focus:outline-none" />
                  <CfgInput value={slot.label} placeholder="名称" aria-label="时段名称" onChange={(e) => upd(slot.id, { label: e.target.value })} className="h-9 border-p4g-white/40 bg-transparent text-p4g-white placeholder:text-p4g-white/50 night:bg-transparent" />
                  <button type="button" aria-label="删除时段" onClick={() => updateSettings({ notifSlots: slots.filter((x) => x.id !== slot.id) })} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] text-p4g-white hover:bg-p4g-danger">✕</button>
                </div>
                <div className="flex min-w-0 flex-wrap gap-1.5 p-2.5">
                  {NOTIF_CONTENTS.map((c) => {
                    const on = slot.contents.includes(c.id);
                    return (
                      <button key={c.id} type="button" title={c.hint} aria-pressed={on} onClick={() => upd(slot.id, { contents: on ? slot.contents.filter((x) => x !== c.id) : [...slot.contents, c.id] })}
                        className={cx('p4g-press rounded-[3px] border-2 px-2 py-1 font-display text-meta font-bold', on ? 'border-p4g-black bg-p4g-yellow text-p4g-black night:border-p4g-yellow' : 'border-dashed border-p4g-line/40 opacity-75')}>
                        {c.icon} {c.label}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => updateSettings({ notifSlots: [...slots, { id: `n${Date.now()}`, time: '12:00', enabled: true, label: '新的提醒', contents: ['tarot'] }] })}
            className="p4g-press w-full rounded-[4px] border-3 border-dashed border-p4g-black bg-p4g-yellow py-2.5 font-display text-body font-bold text-p4g-black night:border-p4g-yellow">＋ 添加提醒时段</button>
          <CfgBtn className="w-full" onClick={() => { setSent(true); setTimeout(() => setSent(false), 3000); }}>{sent ? '✓ 已发送，请查看通知栏' : '发送一条测试通知'}</CfgBtn>
        </>
      )}
    </div>
  );
}
