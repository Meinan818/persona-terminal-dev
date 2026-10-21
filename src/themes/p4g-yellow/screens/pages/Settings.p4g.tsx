/**
 * 设置页（真实 src/pages/Settings.tsx）—— P4G Golden「Config」画面 1:1：
 * 顶部 [Q] 主题 | AI 服务 | … [E] 标签条（快速跳转）+ 分组手风琴（点击展开/收起 ▲▼，同一时间只开一组，与真实一致）
 * + 浅黄横条设置行（聚焦整行反黑、取值青柠）+ 页底「账号与数据」入口 + 紫字「Config」条纹页头。
 * 路由：#/p/settings?tab=theme|ai|summary|personalize|navigator|notifications&block=weather|bgm
 */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PageProps } from '@yellow/registry/types';
import { navigate } from '@yellow/shell/shellBus';
import { useLowMotion } from '@yellow/lib/prefs';
import { P4DateWeather, P4KeyHint } from '@yellow/kit';
import { CollageItem, CollageStagger } from '@yellow/fx';
import { CfgConfigBand, CfgTabBar } from '@yellow/screens/pkg6/cfg';
import { ThemeSection } from '@yellow/screens/pkg6/settings/ThemeSection';
import { AISection } from '@yellow/screens/pkg6/settings/AISection';
import { SummarySection } from '@yellow/screens/pkg6/settings/SummarySection';
import { PersonalizeSection } from '@yellow/screens/pkg6/settings/PersonalizeSection';
import { NavigatorSection } from '@yellow/screens/pkg6/settings/NavigatorSection';
import { NotificationSection } from '@yellow/screens/pkg6/settings/NotificationSection';
import { cx } from '@yellow/lib/cx';

type SectionId = 'theme' | 'ai' | 'summary' | 'personalize' | 'navigator' | 'notifications';
const SECTIONS: { id: SectionId; label: string; en: string; icon: string }[] = [
  { id: 'theme', label: '主题', en: 'THEME', icon: '🎨' },
  { id: 'ai', label: 'AI 服务', en: 'AI SERVICE', icon: '🔑' },
  { id: 'summary', label: 'AI 总结', en: 'SUMMARY', icon: '✨' },
  { id: 'personalize', label: '体验个性化', en: 'CUSTOMIZE', icon: '🎚' },
  { id: 'navigator', label: '助手', en: 'NAVIGATOR', icon: '◈' },
  { id: 'notifications', label: '通知提醒', en: 'NOTIFY', icon: '🔔' },
];

export default function Settings({ tab, params }: PageProps) {
  const low = useLowMotion();
  const initial = (SECTIONS.some((s) => s.id === tab) ? tab : params.get('block') ? 'theme' : 'theme') as SectionId;
  const [active, setActive] = useState<SectionId | null>(initial);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const block = params.get('block') ?? undefined;

  useEffect(() => { if (tab && SECTIONS.some((s) => s.id === tab)) { setActive(tab as SectionId); setTimeout(() => refs.current[tab]?.scrollIntoView({ block: 'start', behavior: low ? 'auto' : 'smooth' }), 260); } }, [tab]); // eslint-disable-line
  const jump = (id: SectionId) => { setActive(id); setTimeout(() => refs.current[id]?.scrollIntoView({ block: 'start', behavior: low ? 'auto' : 'smooth' }), 60); };

  return (
    <div className="relative min-w-0 pb-6">
      {/* 左上黄色方块阵（Config 背景） */}
      <div aria-hidden className="p6-squares pointer-events-none absolute -left-4 top-24 h-40 w-[60%] opacity-70 night:opacity-10" />
      <CfgConfigBand title="设置" en="Settings" onBack={() => navigate('menu')} right={<P4DateWeather variant="compact" weather="rain" className="hidden sm:flex" />} />

      <div className="sticky top-0 z-[5] -mx-4 mt-2 wide:-mx-8"><CfgTabBar items={SECTIONS} value={active} onChange={jump} /></div>

      <CollageStagger className="relative mt-4 grid grid-cols-1 gap-3">
        {SECTIONS.map((sec, i) => {
          const open = active === sec.id;
          return (
            <CollageItem key={sec.id}>
              <div ref={(el) => { refs.current[sec.id] = el; }} data-settings-section={sec.id} className="scroll-mt-16">
                <button type="button" onClick={() => setActive(open ? null : sec.id)} aria-expanded={open}
                  className={cx('p4g-press group relative flex w-full min-w-0 items-center gap-3 overflow-hidden px-3 py-2.5 text-left transition-colors duration-fast',
                    open ? 'bg-p4g-orange text-p4g-black shadow-hard' : 'bg-[rgb(var(--p4g-black-rgb)/0.82)] text-p4g-white hover:bg-p4g-black night:border-2 night:border-p4g-yellow/50')}>
                  <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border-2 font-display text-meta font-bold', open ? 'border-p4g-black' : 'border-p4g-white')}>{i + 1}</span>
                  {sec.id === 'navigator' && <span aria-hidden className="shrink-0 text-h3">{sec.icon}</span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-h2 font-bold tracking-tight">{sec.label}</span>
                  </span>
                  <span className={cx('hidden shrink-0 font-display text-meta font-bold italic tracking-[0.2em] sm:block', open ? 'text-p4g-black/70' : 'text-p4g-yellow')}>{sec.en}</span>
                  <span aria-hidden className="shrink-0 font-display text-body">{open ? '▲' : '▼'}</span>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div key="body" className="origin-top"
                      initial={low ? { opacity: 0 } : { opacity: 0, scaleY: 0.92, y: -8 }} animate={low ? { opacity: 1 } : { opacity: 1, scaleY: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}
                      transition={{ duration: 0.22, ease: [0.2, 0.9, 0.1, 1] }}>
                      <div className="relative mt-[6px] min-w-0 border-l-[6px] border-p4g-orange pb-2 pl-3 pt-1 wide:pl-4">
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
            </CollageItem>
          );
        })}

        {/* 账号与数据（页底入口） */}
        <CollageItem tilt={-0.6}>
          <button type="button" onClick={() => navigate('account')} className="p4g-press group relative mt-3 flex w-full min-w-0 items-center gap-3 overflow-hidden border-3 border-p4g-black bg-p4g-black px-4 py-3 text-left text-p4g-white shadow-[5px_5px_0_var(--p4g-orange)] night:border-p4g-yellow">
            <span aria-hidden className="absolute inset-y-0 right-0 w-24 -skew-x-12 translate-x-6 bg-p4g-yellow" />
            <span aria-hidden className="relative text-h2">☁</span>
            <span className="relative min-w-0 flex-1">
              <span className="block truncate font-display text-h3 font-bold text-p4g-yellow">账号与数据</span>
              <span className="block truncate text-meta text-p4g-white/85">云同步 · 数据管理 · 备份导出</span>
            </span>
            <span aria-hidden className="relative pr-1 font-display text-h2 font-bold text-p4g-black">›</span>
          </button>
        </CollageItem>
        {/* 图片备份：真实只在账号页「数据管理」（src/pages/Account.tsx → ImagesBackupBlock），设置页不重复放 */}
      </CollageStagger>

      <div className="mt-5 flex justify-end">
        <P4KeyHint items={[{ key: '□', label: '默认' }, { key: '○', label: '确认' }, { key: '×', label: '返回' }]} />
      </div>
    </div>
  );
}
