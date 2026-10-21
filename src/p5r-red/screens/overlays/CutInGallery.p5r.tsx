/**
 * Cut-in 总览 + CutInBackdrop 四纹理（fxCatalog red-cutin-gallery；真实 src/components/p5r/cutins.tsx · p5r/CutInBackdrop.tsx）。
 * 迁移自 v3 overlays/a.js §7 openCutGallery：CutInBackdrop 只画一次的固定纹理 bands 同心星带 / rings 同心圆环 / lines 集中线 / ripple 星形涟漪，
 * 下面一排触发键：恭喜升级 / 精通提升 / 今日完成 / 记录成功 / 记账完成 / 成就解锁 / 技能解锁 / 基座 CelebrationCutIn（点后抽屉收起 220ms 再播）。
 */
import { useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Sheet } from '@/p5r-red/kit/P5Sheet';
import { P5Button } from '@/p5r-red/kit/P5Button';
import { starPts, levelUpP5, todoCompleteP5, unlockCutInP5, celebrationCutIn } from './cutins.p5r';

const KINDS: [string, string][] = [['bands', '同心星带'], ['rings', '同心圆环'], ['lines', '集中线'], ['ripple', '星形涟漪']];
function Backdrop({ k }: { k: string }) {
  if (k === 'bands') return <svg viewBox="0 0 100 100">{['#2a0003', '#5c0004', '#110000', '#8e0010', '#1a0000', '#5c0004', '#000', '#8e0010', '#2a0003'].map((c, i) => <polygon key={i} points={starPts(49 * (1 - i * 0.085))} fill={c} />)}</svg>;
  if (k === 'rings') return <i className="oa-bd-rings" />;
  if (k === 'lines') return <i className="oa-bd-lines" />;
  return <svg viewBox="0 0 100 100"><polygon points={starPts(46)} fill="none" stroke="#7d0007" strokeWidth="3" /><polygon points={starPts(30)} fill="none" stroke="#7d0007" strokeWidth="3" /></svg>;
}
const CI: [string, string, () => void][] = [
  ['lv', '恭喜升级', () => levelUpP5({ attr: '知识', level: 4 })], ['ms', '精通提升', () => levelUpP5({ attr: '温柔', level: 5, stars: 2 })],
  ['td', '今日完成', () => todoCompleteP5({ title: '晨跑 5 公里', points: 2, unlock: true })], ['sv', '记录成功', () => todoCompleteP5({ title: '图书馆自习三小时', points: 3, heading: '记录成功' })],
  ['lg', '记账完成', () => todoCompleteP5({ title: '午餐 ¥32 · 便利店', points: 0, heading: '记账完成' })], ['ac', '成就解锁', () => unlockCutInP5({ heading: '成就解锁！', name: '野生之心', lines: ['感谢您的努力，', '您是最棒的客人。'] })],
  ['sk', '技能解锁', () => unlockCutInP5({ heading: '技能解锁！', name: '博闻强识', lines: ['新技能已激活', '属性加成自动生效'] })], ['cb', '基座 CelebrationCutIn', () => celebrationCutIn()],
];

export default function CutInGallery({ open, onClose }: OverlayProps) {
  const [pending, setPending] = useState<(() => void) | null>(null);
  return (
    <P5Sheet open={open && !pending} onClose={onClose} title="CUT-IN 演出" seed={31} onClosed={() => { if (pending) { const f = pending; setTimeout(() => { f(); setPending(null); }, 20); } }}>
      <p className="oa-note ink">CutInBackdrop：大面积装饰只画一次的固定纹理（bands / rings / lines / ripple）。</p>
      <div className="oa-bd-grid">{KINDS.map(([k, n]) => <figure key={k} className="oa-bd"><div className="oa-bd-sw"><Backdrop k={k} /></div><figcaption>{k} · {n}</figcaption></figure>)}</div>
      <div className="oa-bd-btns">{CI.map(([k, l, f], i) => <P5Button key={k} size="sm" seed={60 + i} tone={i % 3 === 2 ? 'ink' : i % 2 ? 'paper' : 'red'} onClick={() => setPending(() => f)}>{l}</P5Button>)}</div>
    </P5Sheet>
  );
}
