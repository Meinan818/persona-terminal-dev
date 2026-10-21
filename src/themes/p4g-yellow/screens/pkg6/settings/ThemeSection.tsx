/** 设置 · 主题（真实 Settings.tsx section=theme + SoundVolumeRow）：颜色与声音 / 显示 / 天气 / 背景图片 / 导入音乐 */
import { useEffect, useRef, useState } from 'react';
import { CfgBlock, CfgBtn, CfgInput, CfgList, CfgRow, CfgSeg, CfgSelect, CfgSlider, CfgSubhead, CfgToggle } from '../cfg';
import { updateSettings, useSettings } from '../settingsStore';
import { BG_ANIMS, SPLASH_STYLES, THEMES } from '@yellow/adapters/pkg6';
import { setPrefs, usePrefs } from '@yellow/lib/prefs';
import { p4gAsset } from '@yellow/lib/asset';
import { cx } from '@yellow/lib/cx';
import { useToast } from '@yellow/kit';
import { WeatherBlock } from './WeatherBlock';
import { BgmBlock } from './BgmBlock';

export function Flower({ size = 34, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse key={r} cx="20" cy="10.5" rx="7.2" ry="9.5" fill={color} stroke="var(--p4g-black)" strokeWidth="2.2" transform={`rotate(${r} 20 20)`} />
      ))}
      <circle cx="20" cy="20" r="5" fill="var(--p4g-yellow)" stroke="var(--p4g-black)" strokeWidth="2.2" />
    </svg>
  );
}
const Sparkle = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 20 20" width="16" height="16" className={className} aria-hidden><path d="M10 0l2.4 7.6L20 10l-7.6 2.4L10 20l-2.4-7.6L0 10l7.6-2.4z" fill="var(--p4g-cyan)" stroke="var(--p4g-black)" strokeWidth="1.2" /></svg>
);

const PIPE = ['音效通道：Web Audio 缓冲（音量可调）', '音效通道：原生播放 + 增益（音量可调）'];

export function ThemeSection({ focusBlock }: { focusBlock?: string }) {
  const s = useSettings();
  const prefs = usePrefs();
  const toast = useToast();
  const [draft, setDraft] = useState(s.customThemeColor);
  const [vol, setVol] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const showSidebarSetting = typeof window !== 'undefined' && (window.innerWidth >= 768 || new URLSearchParams(window.location.hash.split('?')[1]).has('all'));
  useEffect(() => { if (new URLSearchParams(window.location.hash.split('?')[1]).get('bgimg') === '1') updateSettings({ backgroundImage: p4gAsset('town-day.webp') }); }, []);

  return (
    <div className="space-y-2">
      {/* ── 颜色与声音 ── */}
      <CfgSubhead en="COLOR & SOUND" icon="🎨">颜色与声音</CfgSubhead>
      <CfgList>
        <CfgRow label="主题颜色" hint="选择你喜欢的主题颜色">
          <div role="radiogroup" aria-label="主题颜色" className="grid w-full max-w-[420px] grid-cols-5 gap-1.5">
            {THEMES.map((t) => {
              const on = s.theme === t.value;
              const color = t.value === 'custom' ? s.customThemeColor : t.color;
              return (
                <button key={t.value} type="button" role="radio" aria-checked={on} onClick={() => updateSettings({ theme: t.value })}
                  className={cx('p4g-press relative flex min-w-0 flex-col items-center gap-1 rounded-[4px] border-2 py-2 transition-colors',
                    on ? 'border-p4g-black bg-p4g-yellow text-p4g-black shadow-hard-sm night:border-p4g-yellow' : 'border-transparent')}>
                  <span className="relative"><Flower size={32} color={on ? 'var(--p4g-white)' : color} />{on && <Sparkle className="absolute -right-3 -top-1.5" />}</span>
                  <span className="w-full truncate text-center font-display text-meta font-bold">{t.label}</span>
                </button>
              );
            })}
          </div>
        </CfgRow>
        {s.theme === 'custom' && (
          <>
            <CfgRow label="自定义颜色" hint="输入 HEX 色值或使用色盘选取" htmlFor="p6-hex">
              <div className="flex w-full min-w-0 items-center gap-2">
                <input type="color" aria-label="色盘" value={/^#[0-9a-fA-F]{6}$/.test(draft) ? draft : '#000000'} onChange={(e) => { setDraft(e.target.value); updateSettings({ customThemeColor: e.target.value }); }}
                  className="h-10 w-12 shrink-0 cursor-pointer rounded-[3px] border-2 border-p4g-black bg-transparent p-0.5 night:border-p4g-yellow" />
                <CfgInput id="p6-hex" value={draft} placeholder="#6366F1" className="font-num" onChange={(e) => { setDraft(e.target.value); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) updateSettings({ customThemeColor: e.target.value }); }} />
              </div>
            </CfgRow>
            <CfgRow label="音效方案">
              <CfgSeg ariaLabel="音效方案" value={s.customSoundScheme} onChange={(v) => updateSettings({ customSoundScheme: v })}
                options={[{ value: 'blue', label: '清亮', sub: 'P3 风格' }, { value: 'yellow', label: '复古', sub: 'P4 风格' }, { value: 'red', label: '霓虹', sub: 'P5 风格' }]} />
            </CfgRow>
            <CfgRow label="塔罗卡面" hint="换的是星象页抽到的牌长什么样。小组件上的牌面不跟随，始终是蓝那套。">
              <CfgSeg ariaLabel="塔罗卡面" value={s.customTarotSet} onChange={(v) => updateSettings({ customTarotSet: v })}
                options={[{ value: 'p3', label: '▮ 蓝' }, { value: 'p4', label: '▮ 黄' }, { value: 'p5', label: '▮ 红' }]} />
            </CfgRow>
          </>
        )}
        <CfgRow inline label="静音模式" hint="开启后所有音效静音"><CfgToggle ariaLabel="静音模式" checked={s.soundMuted} onChange={(v) => updateSettings({ soundMuted: v })} /></CfgRow>
        {!s.soundMuted && (
          <CfgRow label="音量大小" hint={<>松手会响一声试听 · {PIPE[0]}</>}>
            <CfgSlider ariaLabel="音量大小" min={0} max={100} step={5} value={vol ?? s.soundVolume} suffix="%" left="🔈" right="🔊"
              onChange={setVol} onCommit={() => { if (vol != null) { updateSettings({ soundVolume: vol }); setVol(null); toast(`♪ 试听 ${vol}%`, { duration: 900 }); } }} />
          </CfgRow>
        )}
        <CfgRow inline label="夜间模式" hint="降低屏幕亮度，保护眼睛"><CfgToggle ariaLabel="夜间模式" checked={prefs.mode === 'night'} onChange={(v) => setPrefs({ mode: v ? 'night' : 'day' })} /></CfgRow>
      </CfgList>

      {/* ── 显示 ── */}
      <CfgSubhead en="DISPLAY" icon="🖼">显示</CfgSubhead>
      <CfgList>
        {showSidebarSetting && (
          <CfgRow inline label="左侧栏布局" hint={prefs.sidebar ? '宽屏时导航在左边一列；只影响这台设备' : '改用手机布局（底部导航），平板上按屏幕放大铺满'}>
            <CfgToggle ariaLabel="左侧栏布局" checked={prefs.sidebar} onChange={(v) => setPrefs({ sidebar: v })} />
          </CfgRow>
        )}
        {!s.backgroundImage && (
          <CfgRow label="背景动画" hint="最多同时开启两个，跟随主题色">
            <div className="grid w-full grid-cols-2 gap-1.5 sm:max-w-[420px]">
              {BG_ANIMS.map((o) => {
                const on = s.backgroundAnimation.includes(o.value);
                return (
                  <button key={o.value} type="button" aria-pressed={on} title={o.desc}
                    onClick={() => updateSettings({ backgroundAnimation: on ? s.backgroundAnimation.filter((v) => v !== o.value) : [...s.backgroundAnimation, o.value].slice(-2) })}
                    className={cx('p4g-press min-w-0 rounded-[3px] border-2 px-2.5 py-1.5 text-left transition-colors', on ? 'border-p4g-black bg-p4g-black text-p4g-yellow-hi night:border-p4g-yellow night:bg-p4g-yellow night:text-p4g-black' : 'border-current border-dashed')}>
                    <span className="flex min-w-0 items-center gap-1.5 font-display text-body font-bold"><span aria-hidden className={cx('h-3 w-3 shrink-0 border-2 border-current', on && 'bg-current')} /><span className="truncate">{o.label}</span></span>
                    <span className="block truncate pl-[18px] text-2xs opacity-80">{o.desc}</span>
                  </button>
                );
              })}
            </div>
          </CfgRow>
        )}
        <CfgRow label="开屏动画" hint="启动时的过场风格与速率"
          below={<div className="flex min-w-0 items-center gap-3 sm:justify-center"><span className="shrink-0 font-display text-body font-bold">速率</span>
            <CfgSeg ariaLabel="开屏速率" value={s.splashSpeed} onChange={(v) => updateSettings({ splashSpeed: v })} options={[{ value: 'fast', label: '快' }, { value: 'normal', label: '正常' }, { value: 'slow', label: '慢' }]} /></div>}>
          <div role="radiogroup" aria-label="开屏动画" className="grid w-full grid-cols-2 gap-1.5 sm:max-w-[420px]">
            {SPLASH_STYLES.map((o) => {
              const on = s.splashStyle === o.value;
              return (
                <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => updateSettings({ splashStyle: o.value })}
                  className={cx('p4g-press flex min-w-0 items-center gap-2 rounded-[3px] border-2 px-2 py-1.5 text-left', on ? 'border-p4g-black bg-p4g-yellow text-p4g-black shadow-hard-sm night:border-p4g-yellow' : 'border-current border-dashed')}>
                  <span aria-hidden className="text-h3">{o.icon}</span>
                  <span className="min-w-0"><span className="block truncate font-display text-body font-bold">{o.label}</span><span className="block truncate font-display text-2xs italic opacity-80">{o.sub}</span></span>
                </button>
              );
            })}
          </div>
        </CfgRow>
      </CfgList>

      {/* ── 天气 ── */}
      <div className="pt-2"><WeatherBlock highlight={focusBlock === 'weather'} /></div>

      {/* ── 背景图片 ── */}
      <CfgSubhead en="WALLPAPER">背景图片</CfgSubhead>
      <CfgList>
        <CfgRow label="背景图片" hint={s.backgroundImage ? '已设置 · 背景动画暂停' : '长边自动缩到 2400px，保住画质'}>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" aria-label="上传背景图片" onChange={(e) => {
              const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => updateSettings({ backgroundImage: ev.target?.result as string }); r.readAsDataURL(f);
            }} />
            <CfgBtn tone="primary" onClick={() => fileRef.current?.click()}>选择图片…</CfgBtn>
            {!s.backgroundImage && <CfgBtn onClick={() => updateSettings({ backgroundImage: p4gAsset('town-day.webp') })}>用示例图</CfgBtn>}
          </div>
        </CfgRow>
        {s.backgroundImage && (
          <CfgRow label="预览" below={
            <div className="space-y-3">
              <CfgSlider ariaLabel="透明度" min={0} max={1} step={0.05} value={s.backgroundOpacity} onChange={(v) => updateSettings({ backgroundOpacity: Math.round(v * 100) / 100 })} left={<span className="font-display text-body font-bold">透明度</span>} />
              <div className="flex min-w-0 gap-2">
                <CfgSelect aria-label="背景方向" className="min-w-0 flex-1" value={s.backgroundOrientation} onChange={(e) => updateSettings({ backgroundOrientation: e.target.value as 'landscape' | 'portrait' })}
                  options={[{ value: 'landscape', label: '横屏模式' }, { value: 'portrait', label: '竖屏模式' }]} />
                <CfgBtn tone="danger" onClick={() => updateSettings({ backgroundImage: undefined })}>移除</CfgBtn>
              </div>
            </div>}>
            <div className="relative h-28 w-full overflow-hidden rounded-[3px] border-2 border-p4g-black bg-p4g-black sm:max-w-[420px] night:border-p4g-yellow">
              <img src={s.backgroundImage} alt="背景预览" className="h-full w-full object-cover" style={{ opacity: 0.25 + s.backgroundOpacity * 0.75 }} />
            </div>
          </CfgRow>
        )}
      </CfgList>

      {/* ── 导入音乐（常态折叠） ── */}
      <div className="pt-3"><BgmBlock defaultOpen={focusBlock === 'bgm'} /></div>
    </div>
  );
}
