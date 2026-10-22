/**
 * 菜单（真实 src/pages/Menu.tsx · P4 分支）—— 1:1 复刻 P4G 暂停菜单：
 * 场景底图上竖立一条彩虹糖条带，黑色粗体条目（白描边光晕），选中项放大 + 左侧黑三角，带底部说明；
 * 左下黑色斜条（原作 ¥ 金额条 → 总点数），右下 ○ OK × Back 按键提示，右上日期天气 HUD。
 * 学生证吊牌（STUDENT PASS）：照片 / 名字（缺省「客人」）/ LV / 总点数 / 连续 / 入学 / 状态签 / 条码或 GOAL 条，点开用户资料。
 * 交互同真实：按下即高亮、松手 200ms 后进入；移动 >8px 视为滚动取消；键盘 ↑↓ + Enter。
 * 条目：统计（连续 N 天）/ 逆影战场（battleEnabled，影时间 ✦，只做入口 → 占位）/ 主题（当前 · X）/ 成就 · 技能（待解锁角标）
 *      / 占卜 / 宣告卡（demo 新增，真实暂无 → #/p/callingcard）/ 心相记账（ledgerEnabled）/ 设置 / 关于（新版本红点）。
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { PageProps } from '@yellow/registry/types';
import { P4Badge, P4DateWeather, P4KeyHint, P4Outline, P4Sheet, P4EmptyState, P4Button, IconHeart } from '@yellow/kit';
import { navigate } from '@yellow/shell/shellBus';
import { cx } from '@yellow/lib/cx';
import { useLowMotion, useMode } from '@yellow/lib/prefs';
import { p4gAsset } from '@yellow/lib/asset';
import { useSlotExists, slotUrl } from '@yellow/lib/slots';
import { DevStateBar } from '@yellow/screens/pkg5/ui';
import { goalPct, presetOf, usePresence } from '@yellow/screens/pkg5/presence';
import { UserProfileCardView } from '@yellow/screens/overlays/UserProfileCard.p4g';
import { MenuThemeSheetView } from '@yellow/screens/overlays/MenuThemeSheet.p4g';
import { MenuAboutSheetView } from '@yellow/screens/overlays/MenuAboutSheet.p4g';
import { CURRENT_STREAK, THEME_SWATCHES, TOTAL_LEVEL, TOTAL_POINTS, USER } from '@yellow/mock/pkg5';

interface Row { key: string; label: string; caption?: ReactNode; desc: string; badge?: ReactNode; big?: boolean; onPress: () => void }

const BARCODE = [3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 3];

/** 学生证吊牌（P4PassStatus / P4PassGoal 同口径）*/
function StudentPass({ onOpen, className }: { onOpen: () => void; className?: string }) {
  const p = usePresence();
  const preset = presetOf(p.statusId);
  const pct = goalPct(p.goal);
  const low = useLowMotion();
  const admission = `${USER.createdAt.getFullYear()}.${String(USER.createdAt.getMonth() + 1).padStart(2, '0')}.${String(USER.createdAt.getDate()).padStart(2, '0')}`;
  return (
    <motion.button type="button" onClick={onOpen} aria-label={`用户资料：${p.name || '客人'}，等级 ${TOTAL_LEVEL}`}
      initial={low ? { opacity: 0 } : { opacity: 0, y: -14, rotate: 6 }} animate={{ opacity: 1, y: 0, rotate: 2.5 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.26, ease: [0.2, 0.9, 0.1, 1] }}
      className={cx('relative block w-full min-w-0 text-left', className)}>
      {/* 挂绳 */}
      <span aria-hidden className="absolute -top-5 left-1/2 h-6 w-10 -translate-x-1/2 rounded-t-pill border-x-[5px] border-t-[5px] border-p4g-black night:border-p4g-yellow" />
      <span aria-hidden className="absolute inset-0 translate-x-[6px] translate-y-[6px] rounded-sm bg-p4g-black night:bg-p4g-orange" />
      <span className="relative block overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-yellow-pale text-p4g-black">
        <span className="flex items-center justify-between gap-2 bg-p4g-black px-3 py-1.5">
          <span className="shrink-0 font-display text-meta font-bold tracking-[0.14em] text-p4g-yellow">✿ STUDENT PASS</span>
          {preset ? (
            <span className="inline-flex min-w-0 max-w-[52%] items-center gap-1 rounded-pill bg-p4g-orange px-2 py-[1px] font-display text-2xs font-bold text-p4g-black"><span aria-hidden>{preset.emoji}</span><span className="truncate">{preset.label}</span></span>
          ) : <span className="p4g-date-type text-2xs text-white/80">CH 04</span>}
        </span>
        <span className="flex min-w-0 gap-3 px-3 py-2.5">
          <span className="relative h-[72px] w-[60px] shrink-0 overflow-hidden rounded-sm border-3 border-p4g-black bg-p4g-orange">
            {p.avatar ? <img src={p.avatar} alt="" className="h-full w-full object-cover" /> : <span className="absolute inset-0 flex items-center justify-center font-display text-[30px] font-bold text-white" style={{ WebkitTextStroke: '1.5px var(--p4g-black)' }}>✿</span>}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-baseline gap-1.5">
              <span className="min-w-0 flex-1 truncate font-display text-[clamp(16px,4.6vw,20px)] font-bold leading-tight">{p.name || '客人'}</span>
              <span className="shrink-0 rounded-pill bg-p4g-black px-2 py-[3px] p4g-num text-meta leading-none text-white">LV {TOTAL_LEVEL}</span>
            </span>
            {[['总点数', <span key="p" className="text-[color:var(--p4g-orange-deep)]">{TOTAL_POINTS}</span>], ['连续', `${CURRENT_STREAK} 天`], ['入学', admission]].map(([k, v]) => (
              <span key={k as string} className="mt-1 flex items-baseline gap-2 font-display text-meta font-bold">
                <span className="shrink-0">{k}</span><span aria-hidden className="flex-1 border-b-2 border-dotted border-p4g-black/30" /><span className="shrink-0 p4g-num-upright">{v}</span>
              </span>
            ))}
          </span>
        </span>
        {pct === null ? (
          <span aria-hidden className="flex h-4 items-stretch gap-[3px] px-3 pb-2.5 opacity-75">{BARCODE.map((w, i) => <span key={i} className="bg-p4g-black" style={{ width: w }} />)}</span>
        ) : (
          <span className="flex h-4 items-center gap-1.5 px-3 pb-2.5" aria-label={`目标进度 ${pct}%`}>
            <span className="shrink-0 font-display text-[9px] font-bold tracking-[0.18em]">GOAL</span>
            <span className="relative h-[6px] flex-1 overflow-hidden rounded-pill bg-p4g-black/15"><span className="absolute inset-y-0 left-0 w-full origin-left rounded-pill bg-p4g-orange" style={{ transform: `scaleX(${pct / 100})` }} /></span>
            <span className="shrink-0 p4g-num text-2xs">{pct}%</span>
          </span>
        )}
      </span>
    </motion.button>
  );
}

export default function Menu(_: PageProps) {
  const low = useLowMotion();
  const mode = useMode();
  const officialBand = useSlotExists('menu-bg');
  const [selected, setSelected] = useState('statistics');
  const [profile, setProfile] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [battleOpen, setBattleOpen] = useState(false);
  const [dev, setDev] = useState({ battle: true, ledger: true, shadow: true, update: true, pending: 3 });
  const { theme } = usePresence();
  const themeLabel = THEME_SWATCHES.find((t) => t.value === theme)?.label ?? '默认';
  const press = useRef({ active: false, key: '', x: 0, y: 0 });
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const rows: Row[] = useMemo(() => [
    { key: 'statistics', label: '统计', big: true, caption: `连续 ${CURRENT_STREAK} 天`, desc: '查看成长统计与连续记录', onPress: () => navigate('statistics') },
    ...(dev.battle ? [{ key: 'battle', label: '逆影战场', desc: dev.shadow ? '影时间进行中 · 前往逆影战场' : '前往逆影战场', badge: dev.shadow ? <span className="inline-block text-lead leading-none text-p4g-orange" style={{ animation: low ? undefined : 'p4g-blink 1.4s steps(2) infinite', WebkitTextStroke: '1px var(--p4g-black)' }}>✦</span> : undefined, caption: dev.shadow ? '✦ 影时间' : undefined, onPress: () => setBattleOpen(true) }] : []),
    { key: 'theme', label: '主题', caption: `当前 · ${themeLabel}`, desc: '选择主题，整个房间随之换色', onPress: () => setThemeOpen(true) },
    { key: 'achievements', label: '成就 · 技能', desc: dev.pending > 0 ? `成就·技能：${dev.pending} 项待解锁` : '查看成就、技能与图鉴', badge: dev.pending > 0 ? <P4Badge count={dev.pending} /> : undefined, onPress: () => navigate('achievements') },
    { key: 'astrology', label: '占卜', desc: '每日塔罗与星象', onPress: () => navigate('astrology') },
    // 宣告卡总览（真实 app 暂无此条目；用户决定三色都加，放在占卜之后，2026-10-21）
    { key: 'callingcard', label: '宣告卡', desc: '倒计时与宣告卡 · 钉选 / 进行中 / 已收 / 过期', onPress: () => navigate('callingcard') },
    ...(dev.ledger ? [{ key: 'ledger', label: '心相记账', desc: '记账、预算与资产', onPress: () => navigate('ledger') }] : []),
    { key: 'settings', label: '设置', desc: '外观、提醒、数据与账号', onPress: () => navigate('settings') },
    { key: 'about', label: '关于', desc: dev.update ? '有新版本 · 查看版本信息' : '版本信息与作者', badge: dev.update ? <span aria-label="有新版本" className="inline-block h-2.5 w-2.5 rounded-pill border-thin border-white bg-p4g-red" /> : undefined, onPress: () => setAboutOpen(true) },
  ], [dev, themeLabel, low]);
  const cur = rows.find((r) => r.key === selected) ?? rows[0];

  const begin = (e: React.PointerEvent) => {
    const el = (e.target as HTMLElement).closest('[data-menu-key]');
    if (!el) return;
    const key = el.getAttribute('data-menu-key') || '';
    press.current = { active: true, key, x: e.clientX, y: e.clientY };
    setSelected(key);
  };
  const track = (e: React.PointerEvent) => { if (press.current.active && Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > 8) press.current.active = false; };
  const end = () => {
    if (!press.current.active) return;
    const key = press.current.key;
    press.current.active = false;
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => rows.find((r) => r.key === key)?.onPress(), 200);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const i = rows.findIndex((r) => r.key === selected);
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(rows[(i + 1) % rows.length].key); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(rows[(i - 1 + rows.length) % rows.length].key); }
    if (e.key === 'Enter') { e.preventDefault(); cur.onPress(); }
  };
  const scene = p4gAsset(mode === 'night' ? 'town-night.webp' : 'town-day.webp');
  const sceneWide = p4gAsset(mode === 'night' ? 'town-night-wide.webp' : 'town-day-wide.webp');

  return (
    <>
      <header className="relative -mx-4 mb-3 px-4 pt-1 wide:-mx-8 wide:px-8">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-4 h-[18px] p4g-candy-h wide:-top-8" />
        <div className="flex min-w-0 items-end justify-between gap-3 pt-4">
          <div className="min-w-0">
            <P4Outline as="h1" size="clamp(40px, 12vw, 60px)" stroke={6} italic>菜单</P4Outline>
            <div className="mt-1 whitespace-nowrap font-display text-2xs font-bold tracking-[0.18em] text-[color:var(--p4g-on-stage)]">CHANNEL DIRECTORY <span className="rounded-xs bg-p4g-orange px-1 text-p4g-black">04</span></div>
          </div>
          <P4DateWeather weather="rain" variant="hud" className="shrink-0" />
        </div>
      </header>

      <div className="grid min-w-0 grid-cols-1 gap-6 min-[1100px]:grid-cols-[minmax(0,1fr)_300px] min-[1100px]:items-start">
        <div className="mx-auto w-full max-w-[340px] pt-5 min-[1100px]:order-2 min-[1100px]:max-w-none min-[1100px]:pt-8"><StudentPass onOpen={() => setProfile(true)} /></div>

        {/* 暂停菜单舞台 */}
        <section className="relative min-w-0 overflow-hidden rounded-sm border-3 border-p4g-black shadow-hard-lg night:border-p4g-yellow" style={{ minHeight: 560 }}>
          <picture>
            <source media="(min-width: 768px)" srcSet={sceneWide} />
            <img src={scene} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: 'center 70%' }} />
          </picture>
          <div aria-hidden className="absolute inset-0 bg-p4g-black/25" />
          {/* 彩虹糖条带 */}
          <motion.div aria-hidden className="absolute inset-y-0 left-[6%] w-[min(72%,420px)] origin-top border-x-[3px] border-p4g-black"
            style={officialBand ? { backgroundImage: `url(${slotUrl('menu-bg')})`, backgroundSize: 'cover' } : { background: 'var(--p4g-candy)' }}
            initial={low ? { opacity: 0 } : { scaleY: 0 }} animate={low ? { opacity: 1 } : { scaleY: 1 }} transition={{ duration: 0.26, ease: [0.2, 0.9, 0.1, 1] }}>
            <span className="absolute inset-y-0 left-[18%] w-[6px] bg-white/70" /><span className="absolute inset-y-0 right-[12%] w-[4px] bg-white/60" />
          </motion.div>
          <nav aria-label="功能入口" tabIndex={0} onKeyDown={onKey}
            className="relative ml-[6%] flex w-[min(72%,420px)] flex-col px-4 pb-28 pt-6 outline-none"
            style={{ touchAction: 'pan-y', containerType: 'inline-size' }}
            onPointerDown={begin} onPointerMove={track} onPointerUp={end} onPointerCancel={() => { press.current.active = false; }}>
            {rows.map((r, i) => {
              const on = r.key === selected;
              return (
                <motion.button key={r.key} type="button" data-menu-key={r.key} aria-current={on ? 'true' : undefined}
                  onClick={(e) => { if (e.detail === 0) { setSelected(r.key); r.onPress(); } }}
                  onMouseEnter={() => setSelected(r.key)}
                  initial={low ? { opacity: 0 } : { opacity: 0, x: -36 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: low ? 0 : 0.12 + i * 0.035, duration: 0.2, ease: [0.2, 0.9, 0.1, 1] }}
                  className="relative flex min-w-0 flex-col items-start py-[3px] text-left">
                  <span className="relative flex min-w-0 max-w-full items-center gap-2">
                    {on && <span aria-hidden className="absolute -left-4 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[9px] border-l-[12px] border-y-transparent border-l-p4g-black" />}
                    <span className="min-w-0 truncate font-display font-bold leading-[1.05] text-p4g-black"
                      style={{ fontSize: on ? 'clamp(22px, 15cqw, 48px)' : 'clamp(16px, 9.5cqw, 28px)', textShadow: ['2px 0','-2px 0','0 2px','0 -2px','2px 2px','-2px -2px','2px -2px','-2px 2px'].map((o) => `${o} 0 var(--p4g-white)`).join(','), transition: 'font-size 140ms cubic-bezier(.2,.9,.1,1)' }}>
                      {r.label}
                    </span>
                    {r.badge && <span className="relative shrink-0">{r.badge}</span>}
                  </span>
                  {r.caption && <span className="ml-0.5 mt-0.5 max-w-full truncate rounded-xs bg-p4g-black px-1.5 py-[1px] font-display text-2xs font-bold text-p4g-yellow">{r.caption}</span>}
                </motion.button>
              );
            })}
            <div className="mt-5 min-h-[40px] p4g-outline-sm font-display text-body font-bold p4g-clamp-2" aria-live="polite">{cur.desc}</div>
          </nav>
          {/* 左下：原作 ¥ 金额条 → 总点数 */}
          <div className="absolute bottom-5 left-0 flex max-w-[78%] items-center gap-3 bg-p4g-black py-1.5 pl-4 pr-8" style={{ clipPath: 'polygon(0 0,100% 0,calc(100% - 18px) 100%,0 100%)' }}>
            <IconHeart size={18} filled className="shrink-0 text-p4g-yellow" />
            <span className="p4g-num text-[clamp(20px,6vw,26px)] leading-none text-white">{TOTAL_POINTS.toLocaleString('de-DE')}</span>
            <span className="shrink-0 font-display text-2xs font-bold text-p4g-yellow">总点数</span>
          </div>
          <P4KeyHint className="absolute bottom-16 right-3 flex-col items-end wide:bottom-5 wide:flex-row" items={[{ key: '○', label: 'OK' }, { key: '×', label: 'Back' }]} />
        </section>
      </div>

      <DevStateBar value="" onChange={(id) => setDev((d) => ({ ...d, [id]: id === 'pending' ? (d.pending ? 0 : 3) : !d[id as 'battle'] }))}
        items={[{ id: 'battle', label: `逆影战场 ${dev.battle ? 'ON' : 'OFF'}` }, { id: 'ledger', label: `记账 ${dev.ledger ? 'ON' : 'OFF'}` }, { id: 'shadow', label: `影时间 ${dev.shadow ? 'ON' : 'OFF'}` }, { id: 'update', label: `新版本 ${dev.update ? 'ON' : 'OFF'}` }, { id: 'pending', label: `待解锁 ${dev.pending}` }]} />

      <UserProfileCardView open={profile} onClose={() => setProfile(false)} />
      <MenuThemeSheetView open={themeOpen} onClose={() => setThemeOpen(false)} />
      <MenuAboutSheetView open={aboutOpen} onClose={() => setAboutOpen(false)} hasUpdate={dev.update} />
      <P4Sheet open={battleOpen} onClose={() => setBattleOpen(false)} title="逆影战场" en="SHADOW ARENA · 占位">
        <P4EmptyState compact title="逆影战场不在本次重制范围" hint="入口外观已保留；点进去后的战场本体沿用原实现。" action={<P4Button variant="black" onClick={() => setBattleOpen(false)}>返回菜单</P4Button>} className="[&_div]:!text-p4g-ink" />
      </P4Sheet>
    </>
  );
}
