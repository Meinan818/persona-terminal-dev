/**
 * 菜单（真实 src/pages/Menu.tsx · p3 分支「p3-menu-reference-v2」阶梯瀑布）蓝白 P3R 重制。
 * 蓝斜块大标「菜单」+ 臂章红角 → MEMBER PASS 用户证（aria「用户资料：X，等级 N」：照片位 / 名字 / LV / 总点数 / 连续 / 状态签 / 底缘条码或 GOAL 进度）
 * → 游戏化入口列（aria「功能入口」）：统计（连续 N 天）/ 逆影战场（影时间）/ 主题（当前 粉）/ 成就·技能（N 待解锁）/ 占卜 /
 *   宣告卡（用户追加：占卜之后，真实暂无）/ 记账 / 设置 / 关于（有新版本红点）。
 * 交互同真实 beginPress / trackPress / endPress：按下即高亮（蓝从左揭入 + 行伸长），松手 200ms 后进入；移动 >8px 视为滚动取消。
 * 左缘 SYSTEM 竖排幽灵字。点用户证 → 用户资料抽屉；主题 / 关于 → 抽屉。
 * 路由：?battle=0（隐藏逆影战场）?ledger=0（隐藏记账）?update=1（关于红点）?sheet=profile|theme|about（直接开抽屉）
 */
import { useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PageProps } from '@blue/registry/types';
import { P3R, slantClip, tickClip } from '@blue/kit';
import { navigate } from '@blue/shell/shellBus';
import { useBoldness } from '@blue/lib/prefs';
import { usePresence, presetOf, goalPct } from '@blue/screens/pkg5/presence';
import { UserProfileCardView } from '@blue/screens/overlays/UserProfileCard.p3r';
import { MenuThemeSheetView } from '@blue/screens/overlays/MenuThemeSheet.p3r';
import { MenuAboutSheetView } from '@blue/screens/overlays/MenuAboutSheet.p3r';
import { ACHIEVEMENTS, CURRENT_STREAK, THEME_SWATCHES, TOTAL_LEVEL, TOTAL_POINTS, achievementProgress } from '@blue/mock/pkg5';

const I = (d: ReactNode) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="miter" aria-hidden>{d}</svg>;
const ICONS: Record<string, ReactNode> = {
  statistics: I(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />),
  battle: I(<path d="M13 2 4 14h7l-1 8 9-12h-7z" />),
  theme: I(<><circle cx="12" cy="12" r="9" /><circle cx="8" cy="10" r="1.4" fill="currentColor" /><circle cx="12" cy="7" r="1.4" fill="currentColor" /><circle cx="16" cy="10" r="1.4" fill="currentColor" /></>),
  achievements: I(<path d="M7 3h10v4a5 5 0 0 1-10 0zM5 4H3v2a3 3 0 0 0 4 3M19 4h2v2a3 3 0 0 1-4 3M12 12v5M8 21h8l-1-4H9z" />),
  astrology: I(<path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z" />),
  callingcards: I(<><path d="M3 6h18v12H3z" /><path d="m3 6 9 7 9-7" /></>),
  ledger: I(<><path d="M3 7h18v13H3zM3 7l3-4h12l3 4" /><circle cx="16" cy="13.5" r="1.6" fill="currentColor" /></>),
  settings: I(<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></>),
  about: I(<><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7v.5" /></>),
};

export default function Menu({ params }: PageProps) {
  const bold = useBoldness();
  const p = usePresence();
  const battleVisible = params.get('battle') !== '0';
  const ledgerVisible = params.get('ledger') !== '0';
  const hasUpdate = params.get('update') === '1';
  const inShadowTime = params.get('shadow') !== '0';
  const sheet = params.get('sheet');
  const [profileOpen, setProfileOpen] = useState(sheet === 'profile');
  const [themeOpen, setThemeOpen] = useState(sheet === 'theme');
  const [aboutOpen, setAboutOpen] = useState(sheet === 'about');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const press = useRef({ active: false, x: 0, y: 0, key: '' });
  const pendingUnlocks = ACHIEVEMENTS.filter((a) => !a.unlocked && (achievementProgress[a.id] ?? 0) >= a.condition.value).length + 1;
  const themeLabel = THEME_SWATCHES.find((t) => t.value === p.theme)?.label ?? '粉';
  const preset = presetOf(p.statusId);
  const pct = goalPct(p.goal);

  const go = (id: string) => () => navigate(id, undefined, { transition: 'wave' });
  const items: { key: string; label: string; onPress: () => void; extra?: (sel: boolean) => ReactNode; aria: string }[] = [
    { key: 'statistics', label: '统计', onPress: go('statistics'), extra: (sel) => <span className="shrink-0 text-[11px] font-bold" style={{ color: sel ? 'rgba(255,255,255,0.88)' : P3R.grey }}>连续 {CURRENT_STREAK} 天</span>, aria: `统计：当前连续 ${CURRENT_STREAK} 天` },
    ...(battleVisible ? [{
      key: 'battle', label: '逆影战场', onPress: go('battle'),
      extra: (sel: boolean) => inShadowTime ? <span className="bk-glint shrink-0 px-2 py-0.5 text-[11px] font-black" style={{ clipPath: slantClip(5), background: sel ? 'var(--p3r-cream)' : P3R.blue, color: sel ? '#335bb8' : P3R.onBlue }}>影时间 ✦</span> : undefined,
      aria: inShadowTime ? '逆影战场：影时间进行中' : '逆影战场',
    }] : []),
    { key: 'theme', label: '主题', onPress: () => setThemeOpen(true), extra: (sel) => <span className="shrink-0 text-[11px] font-bold" style={{ color: sel ? 'rgba(255,255,255,0.88)' : P3R.grey }}>当前 · {themeLabel}</span>, aria: `主题：当前 ${themeLabel}` },
    { key: 'achievements', label: '成就·技能', onPress: go('achievements'), extra: (sel) => pendingUnlocks > 0 ? <span className="shrink-0 px-2 py-0.5 text-[11px] font-black" style={{ clipPath: slantClip(5), background: sel ? 'var(--p3r-cream)' : P3R.magenta, color: sel ? '#c2410c' : '#fff' }}>{pendingUnlocks} 待解锁</span> : undefined, aria: pendingUnlocks > 0 ? `成就·技能：${pendingUnlocks} 项待解锁` : '成就·技能' },
    { key: 'astrology', label: '占卜', onPress: go('astrology'), aria: '占卜' },
    { key: 'callingcards', label: '宣告卡', onPress: go('calling-cards'), extra: (sel) => <span className="shrink-0 text-[11px] font-bold" style={{ color: sel ? 'rgba(255,255,255,0.88)' : P3R.grey }}>进行中 3</span>, aria: '宣告卡：3 张进行中' },
    ...(ledgerVisible ? [{ key: 'ledger', label: '记账', onPress: go('ledger'), aria: '记账' }] : []),
    { key: 'settings', label: '设置', onPress: go('settings'), aria: '设置' },
    { key: 'about', label: '关于', onPress: () => setAboutOpen(true), aria: hasUpdate ? '关于：有新版本' : '关于', extra: () => hasUpdate ? <span aria-label="有新版本" className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: P3R.magenta, boxShadow: '0 0 0 2px rgba(255,255,255,0.6)' }} /> : undefined },
  ];

  const keyAt = (t: EventTarget | null) => (t as HTMLElement | null)?.closest?.('[data-menu-key]')?.getAttribute('data-menu-key') ?? '';
  const beginPress = (e: React.PointerEvent) => { const k = keyAt(e.target); if (!k) return; press.current = { active: true, x: e.clientX, y: e.clientY, key: k }; setSelectedKey(k); };
  const trackPress = (e: React.PointerEvent) => { if (!press.current.active) return; if (Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > 8) { press.current.active = false; setSelectedKey(null); } };
  const endPress = () => {
    if (!press.current.active) return;
    press.current.active = false;
    const k = press.current.key;
    window.setTimeout(() => { items.find((m) => m.key === k)?.onPress(); }, 200);
  };

  return (
    <div className="relative mx-auto min-w-0 max-w-2xl pb-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-[300px] flex h-[760px] w-[168px] select-none items-center justify-center">
          <span className="whitespace-nowrap font-cond leading-none" style={{ fontSize: '9.5rem', color: 'var(--p3r-ghost)', transform: 'rotate(90deg)' }}>SYSTEM</span>
        </div>
      </div>
      <div className="relative inline-block pt-2">
        <motion.h1 className="relative px-9 py-2.5 font-heavy text-[32px] leading-none" style={{ clipPath: slantClip(16), background: P3R.blue, color: P3R.onBlue }}
          initial={bold ? { clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' } : false} animate={{ clipPath: slantClip(16) }} transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}>菜单</motion.h1>
        <span aria-hidden className="absolute bottom-0 right-2 h-[10px] w-[24px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
      </div>

      {/* MEMBER PASS */}
      <motion.button type="button" onClick={() => setProfileOpen(true)} aria-label={`用户资料：${p.name || '客人'}，等级 ${TOTAL_LEVEL}`}
        initial={bold ? { opacity: 0, y: -8 } : false} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.98 }}
        className="relative mt-6 block w-full max-w-[372px] text-left focus-visible:outline-none" style={{ filter: 'drop-shadow(0 16px 30px rgb(var(--p3r-ink-rgb) / 0.14))' }}>
        <span className="relative block" style={{ clipPath: slantClip(20), background: P3R.panel }}>
          <span className="flex items-center justify-between gap-2 py-1.5 pl-8 pr-7" style={{ background: P3R.blue }}>
            <span className="shrink-0 font-cond text-[12px] tracking-[0.22em]" style={{ color: P3R.onBlue }}>MEMBER PASS</span>
            {preset ? <span className="min-w-0 truncate px-2 py-px text-[11px] font-black" style={{ background: 'var(--p3r-cream)', color: '#335bb8', clipPath: slantClip(4) }}>{preset.emoji} {preset.label}</span> : <span className="font-cond text-[11px]" style={{ color: P3R.onBlue }}>ROOM 03</span>}
          </span>
          <span className="relative flex items-center gap-3.5 py-3 pl-9 pr-6">
            <span className="relative h-[58px] w-[58px] shrink-0 overflow-hidden" style={{ clipPath: slantClip(8), background: P3R.cyanPale }}>
              {p.avatar ? <img src={p.avatar} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <span className="absolute inset-0 flex items-center justify-center font-heavy text-[26px]" style={{ color: P3R.blue }}>{(p.name || '客').trim().charAt(0).toUpperCase()}</span>}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-heavy text-[clamp(16px,5vw,21px)] leading-none" style={{ color: P3R.ink }}>{p.name || '客人'}</span>
                <span className="relative inline-flex shrink-0 items-baseline gap-1 px-3 py-1" style={{ clipPath: slantClip(7), background: P3R.blue, color: P3R.onBlue }}>
                  <span className="text-[10px] font-black opacity-85">LV</span><span className="font-cond text-[15px] leading-none">{TOTAL_LEVEL}</span>
                </span>
              </span>
              <span className="mt-2 flex items-baseline gap-2 text-[12.5px] font-black" style={{ color: P3R.inkSoft }}>
                <span>总点数</span><span aria-hidden className="flex-1 border-b-2 border-dotted" style={{ borderColor: 'rgb(var(--p3r-cyan-rgb) / 0.6)' }} /><span className="font-cond text-[15px]" style={{ color: P3R.blue }}>{TOTAL_POINTS}</span>
              </span>
              <span className="mt-1 flex items-baseline gap-2 text-[12.5px] font-black" style={{ color: P3R.inkSoft }}>
                <span>连续</span><span aria-hidden className="flex-1 border-b-2 border-dotted" style={{ borderColor: 'rgb(var(--p3r-cyan-rgb) / 0.6)' }} /><span className="font-cond text-[15px]" style={{ color: P3R.blue }}>{CURRENT_STREAK} 天</span>
              </span>
            </span>
          </span>
          {pct != null ? (
            <span className="flex items-center gap-2 pb-3 pl-9 pr-7">
              <span className="font-cond text-[10px] tracking-[0.2em]" style={{ color: P3R.grey }}>GOAL</span>
              <span className="relative h-[6px] min-w-0 flex-1 overflow-hidden" style={{ background: 'var(--p3r-track)', clipPath: slantClip(2) }}><span className="absolute inset-y-0 left-0 w-full origin-left" style={{ background: `linear-gradient(90deg, ${P3R.blue}, ${P3R.cyan})`, transform: `scaleX(${pct / 100})` }} /></span>
              <span className="font-cond text-[13px]" style={{ color: P3R.blue }}>{pct}%</span>
            </span>
          ) : (
            <span aria-hidden className="flex gap-[3px] pb-3 pl-9 pr-7">{Array.from({ length: 34 }).map((_, i) => <span key={`bc-${i}`} className="h-[10px]" style={{ width: [2, 1, 3, 1, 2][i % 5], background: i % 3 ? P3R.cyan : P3R.blue, opacity: 0.8 }} />)}</span>
          )}
        </span>
        <span aria-hidden className="absolute bottom-[3px] right-4 h-[8px] w-[20px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
      </motion.button>

      {/* 游戏化入口列 */}
      <nav className="relative mt-7 space-y-2.5" aria-label="功能入口" style={{ touchAction: 'pan-y' }}
        onPointerDown={beginPress} onPointerMove={trackPress} onPointerUp={endPress} onPointerCancel={() => { press.current.active = false; setSelectedKey(null); }}>
        {items.map((m, i) => {
          const selected = m.key === selectedKey;
          const indent = i * 4.2;
          const ml = selected ? 0 : indent;
          const w = selected ? 100 : Math.max(46, 100 - indent - 6);
          const content = (white: boolean) => (
            <>
              <span aria-hidden style={{ color: white ? P3R.onBlue : P3R.blue }}>{ICONS[m.key]}</span>
              <span className="min-w-0 flex-1 truncate font-heavy text-[17px]" style={{ color: white ? P3R.onBlue : P3R.ink }}>{m.label}</span>
              {m.extra?.(white)}
            </>
          );
          return (
            <motion.div key={m.key} initial={bold ? { opacity: 0, x: 24 } : false} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 300, delay: i * 0.045 }}>
              <button type="button" data-menu-key={m.key} aria-label={m.aria} aria-current={selected ? 'true' : undefined}
                onClick={(e) => { if (e.detail === 0) { setSelectedKey(m.key); m.onPress(); } }}
                className="relative block overflow-hidden py-3.5 text-left focus-visible:outline-none active:scale-[0.99]"
                style={{ clipPath: slantClip(16), background: i % 2 ? 'var(--p3r-row-alt)' : 'var(--p3r-row)', marginLeft: `${ml}%`, width: `${w}%`, transition: 'margin-left 0.36s cubic-bezier(0.16,1,0.3,1), width 0.36s cubic-bezier(0.16,1,0.3,1)' }}>
                <span className="flex items-center gap-3.5 pl-7 pr-5">{content(false)}</span>
                <AnimatePresence>
                  {selected && (
                    <motion.span key="hl" className="absolute inset-0 flex items-center gap-3.5 pl-7 pr-5" style={{ background: P3R.blue }}
                      initial={bold ? { clipPath: 'inset(0 100% 0 0)' } : { opacity: 0 }} animate={{ clipPath: 'inset(0 0% 0 0)', opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}>
                      {content(true)}
                      <span aria-hidden className="absolute bottom-0 right-3 h-[9px] w-[22px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </motion.div>
          );
        })}
      </nav>

      <UserProfileCardView open={profileOpen} onClose={() => setProfileOpen(false)} />
      <MenuThemeSheetView open={themeOpen} onClose={() => setThemeOpen(false)} />
      <MenuAboutSheetView open={aboutOpen} onClose={() => setAboutOpen(false)} hasUpdate={hasUpdate} />
    </div>
  );
}
