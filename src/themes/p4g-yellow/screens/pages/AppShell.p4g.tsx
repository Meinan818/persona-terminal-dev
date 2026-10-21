/**
 * AppShell.p4g —— 页面舞台 & 背景层（真实 App.tsx：PageSwitcher/PageShell + P4StageDecor + BackgroundAnimation + 背景图）。
 * 舞台本体（黄方块阵 / 扫描线 / 导航留白 / max-w-page 居中列）由外壳 src/shell/AppShell 提供；本页补齐并演示：
 *   · 黄舞台装饰：巨型橙弧环 / 大花剪影 / 四角星（StageDecor）
 *   · 背景动画四种「极光 / 粒子 / 渐变波 / 脉冲」，最多同时两个（BackgroundAnim）
 *   · 背景图片：透明度、填充模式（铺满 / 完整显示），横竖屏自动换图（BackgroundImage）
 *   · 页对页转场：导航 = 黄方块推屏；轮盘/远跳 = 跳台噪点；同页切 tab = 直切（外壳 navigate）
 * 首页 #/p/dashboard?bg=anim|image 同样可以看到这些层。
 */
import { useState } from 'react';
import type { PageProps } from '@yellow/registry/types';
import { P4PageHeader, P4Section, P4Card, P4Chip, P4Switch, P4Slider, P4SegmentTabs, P4Button, showToast } from '@yellow/kit';
import { navigate } from '@yellow/shell/shellBus';
import { StageDecor, BackgroundAnim, BackgroundImage, BG_ANIM_LABEL, type BgAnimKind } from '@yellow/screens/pkg1/StageLayers';

export default function AppShellStage({ params }: PageProps) {
  const [decor, setDecor] = useState(true);
  const [anims, setAnims] = useState<BgAnimKind[]>(params.get('bg') === 'none' ? [] : ['aurora', 'particles']);
  const [img, setImg] = useState(params.get('bg') === 'image');
  const [op, setOp] = useState(30);
  const [fit, setFit] = useState<'cover' | 'contain'>('cover');
  const toggle = (k: BgAnimKind) => setAnims((a) => (a.includes(k) ? a.filter((x) => x !== k) : a.length >= 2 ? (showToast('背景动画最多同时开两个'), a) : [...a, k]));
  return (
    <>
      {img && <BackgroundImage opacity={op / 100} fit={fit} />}
      {decor && <StageDecor />}
      <BackgroundAnim kinds={anims} />
      <div className="relative z-[1] flex min-w-0 flex-col gap-6">
        <P4PageHeader title="舞台" en="STAGE & BACKGROUND" weather="fog" subtitle="页面舞台 & 背景层" />
        <P4Section title="舞台装饰" en="STAGE DECOR">
          <P4Card padding="md"><div className="flex items-center justify-between gap-3"><span className="min-w-0 font-display text-body font-bold">巨型橙弧环 / 大花剪影 / 四角星</span><P4Switch checked={decor} onChange={setDecor} aria-label="舞台装饰" /></div></P4Card>
        </P4Section>
        <P4Section title="背景动画" en="BACKGROUND ANIMATION · MAX 2">
          <P4Card padding="md">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(BG_ANIM_LABEL) as BgAnimKind[]).map((k) => <P4Chip key={k} tone="outline" selected={anims.includes(k)} onClick={() => toggle(k)}>{BG_ANIM_LABEL[k]}</P4Chip>)}
            </div>
            <p className="mt-2 text-meta text-p4g-ink-soft">已开 {anims.length}/2 · 低动效时动画静止</p>
          </P4Card>
        </P4Section>
        <P4Section title="背景图片" en="BACKGROUND IMAGE">
          <P4Card padding="md" className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3"><span className="font-display text-body font-bold">使用背景图片</span><P4Switch checked={img} onChange={setImg} aria-label="背景图片" /></div>
            <P4Slider label="透明度" value={op} onChange={setOp} min={5} max={100} showValue suffix="%" disabled={!img} />
            <P4SegmentTabs value={fit} onChange={(v) => setFit(v as 'cover' | 'contain')} items={[{ id: 'cover', label: '铺满' }, { id: 'contain', label: '完整显示' }]} />
            <p className="text-meta text-p4g-ink-soft">横屏 / 竖屏自动换横版 / 竖版图（town-day / town-night）。</p>
          </P4Card>
        </P4Section>
        <P4Section title="页对页转场" en="PAGE SWITCH">
          <div className="flex flex-wrap gap-2">
            <P4Button onClick={() => navigate('dashboard', undefined, { transition: 'wipe' })}>黄方块推屏 → 首页</P4Button>
            <P4Button variant="black" onClick={() => navigate('dashboard', undefined, { transition: 'noise' })}>跳台噪点 → 首页</P4Button>
            <P4Button variant="secondary" onClick={() => navigate('navigation', undefined, { transition: 'none' })}>直切 → 导航核对</P4Button>
          </div>
        </P4Section>
      </div>
    </>
  );
}
