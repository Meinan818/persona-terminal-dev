/**
 * 菜单 ·「主题」Sheet（真实 src/pages/Menu.tsx themeSheetOpen：SheetModal bottom「主题」；色板点击即切 + 精调入口）。
 * 视觉迁移自 v3 overlays/b.js P5.openThemePicker（.ob-swatches 五色板 · 入场砸落 stagger 50ms · 选中旋转放大 + ✓）。
 * 文案抄真实：「选择你喜欢的主题，整个房间随之换色。」/「更多主题设置（自定义色 / 音效）→」→ 关抽屉 → 设置页（主题分区）。
 * 正式用户使用统一主题存储；独立 demo 保留选中态和演示吐司。
 */
import { useLayoutEffect, useRef, useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Sheet } from '@/p5r-red/kit/P5Sheet';
import { P5Button } from '@/p5r-red/kit/P5Button';
import { toast } from '@/p5r-red/kit/P5Toast';
import { sfx } from '@/p5r-red/fx/sfx';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import { navigate } from '@/p5r-red/shell/shellBus';
import { selectAppTheme, useSelectedTheme } from '@/themes/themeSelection';

const THEMES: [string, string, string][] = [['blue', '蓝', '#3B82F6'], ['yellow', '黄', '#F59E0B'], ['red', '红', '#D7000F'], ['pink', '粉', '#EC4899'], ['custom', '自定义', 'conic-gradient(#3B82F6,#F59E0B,#EF4444,#EC4899,#3B82F6)']];

export default function MenuThemeSheet({ open, onClose }: OverlayProps) {
  const [sel, setSel] = useState('red');
  const liveTheme = useSelectedTheme();
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open || !box.current || isLowMotion()) return;
    box.current.querySelectorAll('.ob-swatch').forEach((s, i) => s.animate([{ opacity: 0, transform: 'translateY(40px) rotate(-14deg) scale(1.3)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: 160 + i * 50, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }));
  }, [open]);
  const pick = async (v: string, l: string, el: HTMLElement) => {
    if (liveTheme) { try { await selectAppTheme(v); } catch { toast('主题切换失败，请重试'); return; } }
    setSel(v); sfx('switch', 0.5); toast(liveTheme ? `已切换主题：${l}` : `已切换主题：${l}（demo 仅演示红）`);
    if (!isLowMotion()) el.animate([{ transform: 'scale(1.25) rotate(-8deg)' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  };
  return (
    <P5Sheet open={open} onClose={onClose} title="主题" seed={451} className="ob-sheet">
      <div className="ob-sbody" ref={box}>
        <p className="ob-p">选择你喜欢的主题，整个房间随之换色。</p>
        <div className="ob-swatches">
          {THEMES.map(([v, l, c], i) => (
            <button key={v} type="button" className="ob-swatch" aria-label={`切换主题：${l}`} aria-pressed={(liveTheme ?? sel) === v} style={{ ['--sw' as string]: c, ['--i' as string]: i }} onClick={(e) => { void pick(v, l, e.currentTarget); }}>
              <span className="ob-swatch-c"><i>✓</i></span><b>{l}</b>
            </button>
          ))}
        </div>
        <P5Button tone="paper" seed={452} className="ob-wide" onClick={() => { onClose(); setTimeout(() => navigate('settings', { via: 'tear', tab: 'theme' }), 200); }}>更多主题设置（自定义色 / 音效）→</P5Button>
      </div>
    </P5Sheet>
  );
}
