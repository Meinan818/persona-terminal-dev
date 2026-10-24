/**
 * 主题抽屉（真实 src/pages/Menu.tsx · themeSheetOpen，p3 与默认形态共用）：标题「主题」、说明「选择你喜欢的主题，整个房间随之换色。」
 * 色板 蓝 / 黄 / 红 / 粉 / 自定义（aria「切换主题：X」，点击即切 + toast）+「更多主题设置（自定义色 / 音效）→」（→ 设置·主题）。
 * 蓝主题禁蓝：「蓝」色板用墨色斜块 + 「P3」签示意（不渲染蓝色像素），自定义用暖色锥形渐变。
 */
import type { OverlayProps } from '@blue/registry/types';
import { P3Sheet, P3Button, P3R, slantClip, SelectWedge, useToast } from '@blue/kit';
import { navigate } from '@blue/shell/shellBus';
import { THEME_SWATCHES } from '@blue/mock/pkg5';
import { selectAppTheme, useSelectedTheme } from '@/themes/themeSelection';

const TAG: Record<string, string> = { blue: 'P3', yellow: 'P4G', red: 'P5R', pink: 'P3P' };

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
    <P3Sheet open={open} onClose={onClose} title="主题" en="THEME">
      <div className="flex min-w-0 flex-col gap-4 pt-1">
        <p className="text-[14px] font-bold" style={{ color: P3R.inkSoft }}>选择你喜欢的主题，整个房间随之换色。</p>
        <div className="grid grid-cols-5 gap-2">
          {THEME_SWATCHES.map((t) => {
            const on = theme === t.value;
            return (
              <button key={t.value} type="button" aria-label={`切换主题：${t.label}`} aria-pressed={on} onClick={() => void switchTheme(t.value, t.label)} className="relative flex min-w-0 flex-col items-center gap-1.5 active:scale-95">
                <span className="relative flex aspect-square w-full max-w-[64px] items-center justify-center" style={{ transform: on ? 'rotate(-4deg)' : undefined }}>
                  {on && <span aria-hidden className="absolute -inset-[3px]" style={{ background: P3R.blue, clipPath: slantClip(10) }} />}
                  <span className="absolute inset-0" style={{ background: t.color ?? 'conic-gradient(#4a79e6, #F59E0B, #EF3043, #8bd4e6, #4a79e6)', clipPath: slantClip(9) }} />
                  {on && <span aria-hidden className="relative font-cond text-[24px] text-white" style={{ textShadow: '0 1px 0 rgba(0,0,0,0.35)' }}>✓</span>}
                  {TAG[t.value] && <span className="absolute -right-1 -top-2 px-1 font-cond text-[9px]" style={{ background: P3R.ink, color: 'var(--p3r-on-ink)', clipPath: slantClip(3) }}>{TAG[t.value]}</span>}
                </span>
                <span className="relative max-w-full truncate px-1.5 text-[12px] font-black" style={{ color: on ? 'var(--p3r-mulberry)' : P3R.inkSoft }}>
                  {on && <SelectWedge className="-inset-x-1 inset-y-0" />}<span className="relative">{t.label}</span>
                </span>
              </button>
            );
          })}
        </div>
        <P3Button tone="soft" block trailing={<span aria-hidden>→</span>} onClick={() => { onClose(); navigate('settings', 'theme'); }}>更多主题设置（自定义色 / 音效）</P3Button>
      </div>
    </P3Sheet>
  );
}

export default function MenuThemeSheet({ open, onClose }: OverlayProps) { return <MenuThemeSheetView open={open} onClose={onClose} />; }
