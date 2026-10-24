/**
 * 主题抽屉（真实 src/pages/Menu.tsx · themeSheetOpen）：「选择你喜欢的主题，整个房间随之换色。」
 * 色板 蓝/黄/红/粉/自定义（aria「切换主题：X」，点击即切）+「更多主题设置（自定义色 / 音效）→」（→ 设置·主题）。
 * 色板颜色是真实主题色数据（THEME_SWATCHES），不是 UI 配色。
 */
import type { OverlayProps } from '@yellow/registry/types';
import { P4Sheet, P4Button, useToast } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';
import { navigate } from '@yellow/shell/shellBus';
import { THEME_SWATCHES } from '@yellow/mock/pkg5';
import { selectAppTheme, useSelectedTheme } from '@/themes/themeSelection';

export function MenuThemeSheetView({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const theme = useSelectedTheme();
  const switchTheme = async (value: string, label: string) => {
    try {
      await selectAppTheme(value);
      toast(`已切换：${label}`);
    } catch {
      toast('主题切换失败，请重试');
    }
  };
  return (
    <P4Sheet open={open} onClose={onClose} title="主题" en="THEME">
      <div className="flex min-w-0 flex-col gap-4 pt-1">
        <p className="text-body text-p4g-ink-soft">选择你喜欢的主题，整个房间随之换色。</p>
        <div className="grid grid-cols-5 gap-2">
          {THEME_SWATCHES.map((t) => {
            const on = theme === t.value;
            return (
              <button key={t.value} type="button" aria-label={`切换主题：${t.label}`} aria-pressed={on} onClick={() => void switchTheme(t.value, t.label)} className="group flex min-w-0 flex-col items-center gap-1.5">
                <span className={cx('relative flex aspect-square w-full max-w-[64px] items-center justify-center rounded-sm border-3 transition-transform duration-fast', on ? 'border-p4g-black shadow-[4px_4px_0_var(--p4g-orange)] night:border-p4g-yellow' : 'border-p4g-line group-active:translate-y-[2px]')}
                  style={{ background: t.color ?? 'conic-gradient(#3B82F6, #F59E0B, #EF4444, #EC4899, #3B82F6)', transform: on ? 'rotate(-4deg)' : undefined }}>
                  {on && <span aria-hidden className="font-display text-h2 font-bold text-white" style={{ WebkitTextStroke: '2px var(--p4g-black)' }}>✓</span>}
                  {t.value === 'yellow' && <span className="absolute -right-2 -top-2 rotate-6 rounded-xs border-thin border-p4g-black bg-p4g-yellow px-1 font-display text-[9px] font-bold italic text-p4g-black">P4G</span>}
                </span>
                <span className={cx('truncate font-display text-meta font-bold', on ? 'rounded-xs bg-p4g-select px-1.5 text-[color:var(--p4g-select-ink)]' : 'text-p4g-ink-soft')}>{t.label}</span>
              </button>
            );
          })}
        </div>
        <P4Button variant="secondary" block trailing={<span aria-hidden>→</span>} onClick={() => { onClose(); navigate('settings', 'theme'); }}>更多主题设置（自定义色 / 音效）</P4Button>
      </div>
    </P4Sheet>
  );
}

export default function MenuThemeSheet({ open, onClose }: OverlayProps) { return <MenuThemeSheetView open={open} onClose={onClose} />; }
