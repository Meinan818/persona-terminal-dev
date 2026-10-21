/**
 * 设置页（真实 src/pages/Settings.tsx · p3 分支「p3-settings 设计稿」）蓝白 P3R 版：
 *   页头 = 幽灵字 CONFIG / SYSTEM + P3PageHeader「设置」(ticks, 返回 → 菜单) + 9 枚青斜片刻度；
 *   分组 = 斜切 panelGlass 手风琴（蓝图标 + 16px 超粗标题 + ▲▼ 三角），同一时间只开一组（与真实一致）；
 *   组内 = CONFIG 行（悬停 / 聚焦整行翻墨 + 光标楔，ON·OFF / ‹值› / 刻度条）；
 *   页底「账号与数据」入口（云同步 · 数据管理 · 备份导出 → 账号页）；右下 GUIDE 操作指引。
 * 路由：#/p/settings?tab=theme|ai|summary|personalize|navigator|notifications&block=weather|bgm
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PageProps } from '@blue/registry/types';
import { navigate } from '@blue/shell/shellBus';
import { useLowMotion } from '@blue/lib/prefs';
import { GhostWords, GuideBox, P3PageHeader, P3R, slantClip, tickClip } from '@blue/kit';
import { P3Stagger, P3StaggerItem } from '@blue/fx';
import { ThemeSection } from '@blue/screens/pkg6/settings/ThemeSection';
import { AISection } from '@blue/screens/pkg6/settings/AISection';
import { SummarySection } from '@blue/screens/pkg6/settings/SummarySection';
import { PersonalizeSection } from '@blue/screens/pkg6/settings/PersonalizeSection';
import { NavigatorSection } from '@blue/screens/pkg6/settings/NavigatorSection';
import { NotificationSection } from '@blue/screens/pkg6/settings/NotificationSection';
import '@blue/screens/pkg6/pkg6.css';

type SectionId = 'theme' | 'ai' | 'summary' | 'personalize' | 'navigator' | 'notifications';
const ic = (d: string) => () => <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
const SECTIONS: { id: SectionId; label: string; en: string; Icon: () => ReactNode }[] = [
  { id: 'theme', label: '主题', en: 'THEME', Icon: ic('M12 3a9 9 0 100 18c1.1 0 1.6-.8 1.6-1.6 0-.5-.2-.8-.5-1.2-.3-.4-.5-.7-.5-1.2 0-.9.7-1.6 1.6-1.6H16a5 5 0 005-5C21 6.4 17 3 12 3zM7.5 11.5h.01M9.5 7.5h.01M14.5 7.5h.01M17 11h.01') },
  { id: 'ai', label: 'AI 服务', en: 'AI SERVICE', Icon: ic('M15 7a4 4 0 11-3.7 5.5L4 19.8V21h2.5v-2h2v-2h2l1.3-1.3A4 4 0 0115 7zM16 9.5h.01') },
  { id: 'summary', label: 'AI 总结', en: 'SUMMARY', Icon: ic('M12 3l1.8 4.9L19 9.7l-4.3 3 1.4 5.3L12 15l-4.1 3 1.4-5.3L5 9.7l5.2-1.8L12 3z') },
  { id: 'personalize', label: '体验个性化', en: 'CUSTOMIZE', Icon: ic('M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4') },
  { id: 'navigator', label: '助手', en: 'NAVIGATOR', Icon: ic('M12 3l8 9-8 9-8-9 8-9zM12 8l4 4-4 4-4-4 4-4z') },
  { id: 'notifications', label: '通知提醒', en: 'NOTIFY', Icon: ic('M6 16V11a6 6 0 1112 0v5l1.5 2h-15L6 16zM10 20a2 2 0 004 0') },
];
const SEC_CLIP = 'polygon(14px 0, 100% 0, calc(100% - 14px) 100%, 0 100%)';

export default function Settings({ tab, params }: PageProps) {
  const low = useLowMotion();
  const block = params.get('block') ?? undefined;
  const initial = (SECTIONS.some((s) => s.id === tab) ? tab : 'theme') as SectionId;
  const [active, setActive] = useState<SectionId | null>(initial);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollTo = (id: string, delay: number) => setTimeout(() => refs.current[id]?.scrollIntoView({ block: 'start', behavior: low ? 'auto' : 'smooth' }), delay);

  useEffect(() => { if (tab && SECTIONS.some((s) => s.id === tab)) { setActive(tab as SectionId); scrollTo(tab, 260); } }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  const jump = (id: SectionId) => { setActive(id); scrollTo(id, 80); };
  // Q / E 键快速切组（P3R LB / RB）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,textarea,select,[contenteditable]')) return;
      const i = SECTIONS.findIndex((s) => s.id === active);
      if (e.key === 'q' || e.key === 'Q') jump(SECTIONS[(i - 1 + SECTIONS.length) % SECTIONS.length].id);
      if (e.key === 'e' || e.key === 'E') jump(SECTIONS[(i + 1) % SECTIONS.length].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative min-w-0 pb-6">
      {/* 页头：CONFIG / SYSTEM 幽灵字 + 设置 + 青刻度 */}
      <div className="relative">
        <GhostWords words={['CONFIG', <span key="s" style={{ fontSize: '0.88em' }}>SYSTEM</span>]} className="right-[8px] top-[-14px] text-right text-[clamp(56px,18vw,80px)]" style={{ lineHeight: 1.04 }} />
        <P3PageHeader ticks title="设置" en="SETTINGS" ghost={false} onBack={() => navigate('menu')} className="relative mb-2 pt-2" />
        <div aria-hidden className="flex gap-1 pl-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className="h-[8px] w-[10px]" style={{ background: `rgb(var(--p3r-cyan-rgb) / ${i < 5 ? 0.85 : 0.38})`, clipPath: 'polygon(35% 0, 100% 0, 65% 100%, 0 100%)' }} />
          ))}
        </div>
      </div>

      <P3Stagger className="relative mt-5 grid grid-cols-1 gap-4">
        {SECTIONS.map((sec) => {
          const open = active === sec.id;
          return (
            <P3StaggerItem key={sec.id}>
              <div ref={(el) => { refs.current[sec.id] = el; }} data-settings-section={sec.id} className="relative min-w-0 scroll-mt-4" style={{ clipPath: SEC_CLIP, background: 'var(--p3r-panel-glass)' }}>
                <button type="button" onClick={() => setActive(open ? null : sec.id)} aria-expanded={open}
                  className="relative flex w-full min-w-0 items-center gap-3 px-7 py-4 text-left">
                  {open && <span aria-hidden className="absolute inset-y-0 left-0 w-[60%]" style={{ background: 'linear-gradient(90deg, rgb(var(--p3r-blue-rgb) / 0.14), transparent)' }} />}
                  <span aria-hidden className="relative shrink-0" style={{ color: 'var(--p3r-rose-ink)' }}><sec.Icon /></span>
                  <span className="relative min-w-0 flex-1 truncate text-[16px] font-black" style={{ color: P3R.ink }}>{sec.label}</span>
                  <span className="relative hidden shrink-0 font-cond text-[12px] tracking-[0.2em] sm:block" style={{ color: open ? 'var(--p3r-rose-ink)' : 'var(--p3r-lilac-ink)' }}>{sec.en}</span>
                  <span aria-hidden className="relative h-0 w-0 shrink-0" style={open
                    ? { borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: `9px solid ${P3R.blue}` }
                    : { borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `9px solid ${P3R.blue}` }} />
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div key="body" className="origin-top overflow-hidden"
                      initial={low ? { opacity: 0 } : { opacity: 0, height: 0 }} animate={low ? { opacity: 1 } : { opacity: 1, height: 'auto' }} exit={low ? { opacity: 0 } : { opacity: 0, height: 0, transition: { duration: 0.16 } }}
                      transition={{ duration: 0.26, ease: [0.2, 0.9, 0.1, 1] }}>
                      <div className="relative min-w-0 px-5 pb-6 wide:px-7">
                        {sec.id === 'theme' && <ThemeSection focusBlock={block} />}
                        {sec.id === 'ai' && <AISection />}
                        {sec.id === 'summary' && <SummarySection onJumpAI={() => jump('ai')} />}
                        {sec.id === 'personalize' && <PersonalizeSection />}
                        {sec.id === 'navigator' && <NavigatorSection />}
                        {sec.id === 'notifications' && <NotificationSection />}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </P3StaggerItem>
          );
        })}

        {/* 账号与数据（页底入口） */}
        <P3StaggerItem>
          <button type="button" onClick={() => navigate('account')} className="p6-press relative mt-2 flex w-full min-w-0 items-center gap-3 px-6 py-4 text-left" style={{ background: P3R.ink, clipPath: SEC_CLIP }}>
            <span aria-hidden className="absolute inset-y-0 right-0 w-28" style={{ background: P3R.blue, clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 0 100%)' }} />
            <span aria-hidden className="relative h-[22px] w-[15px] shrink-0" style={{ background: P3R.blue, clipPath: tickClip }} />
            <span className="relative min-w-0 flex-1">
              <span className="block truncate font-heavy text-[18px]" style={{ color: 'var(--p3r-on-ink)' }}>账号与数据</span>
              <span className="block truncate text-[12px] font-bold" style={{ color: 'color-mix(in srgb, var(--p3r-on-ink) 72%, transparent)' }}>云同步 · 数据管理 · 备份导出</span>
            </span>
            <span aria-hidden className="relative mr-1 h-0 w-0 border-y-[8px] border-l-[12px] border-y-transparent" style={{ borderLeftColor: P3R.onBlue }} />
          </button>
        </P3StaggerItem>
      </P3Stagger>

      <div className="mt-6 flex justify-end">
        <div className="px-4 py-2" style={{ background: 'var(--p3r-panel-glass)', clipPath: slantClip(8) }}>
          <GuideBox text="调整设置" keys={[{ k: 'Q', label: '上一组' }, { k: 'E', label: '下一组' }, { k: '×', label: '返回' }]} />
        </div>
      </div>
    </div>
  );
}
