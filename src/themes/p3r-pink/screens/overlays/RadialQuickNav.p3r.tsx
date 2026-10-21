/**
 * RadialQuickNav.p3r —— 长按轮盘分阶段演示（真实 RadialQuickNav p3 分支 + RadialWheelP3）。底导中央猫钮按住 500ms 打开。
 *   ?state=idle    按住蓄力环 500ms → 轮盘展开（环爆 + MASKED/TIME + 七条弹起），提示「滑向目标」；可真的拖动 / 点选（松手跳转，滑回下方取消）
 *   ?state=active&pick=N  手指从猫钮出发依次扫过 0…N 条（每条 .16s），停在第 N 条：条翻玫红 + scale 1.16 + 运动三角高亮，提示 = 选中项名；1.2s 后「松开」→ 三斜板幕布跳转演示后复位
 *   ?state=cancel  先滑上第 2 条 → 滑回条带下缘 26px 以下 → 高亮清空，提示「取消」→ 松手 → 轮盘收起（条 scaleY .06 回落 + 淡出）
 *   ?state=reduced 低动效 D0：纵向菜单七项（图标 + 名称 + 英文），点选跳转
 * 七项：塔罗 / 记录 / 任务 / 羁绊 / 记账 / 成就 / 设置（真实 emoji 🔮 等换单色字形——粉主题禁蓝像素）。
 */
import { motion } from 'framer-motion';
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { OverlayProps } from '@pink/registry/types';
import { P3R, IconCat, tickClip, slantClip } from '@pink/kit';
import { useBoldness } from '@pink/lib/prefs';
import { navigate } from '@pink/shell/shellBus';
import { WHEEL_ITEMS, WheelD0Menu, p3Pick, p3Strip } from '@pink/shell/RadialWheelP3.p3r';
import { RadialWheelStage } from './RadialWheel.p3r';
import { WaveSliceP3 } from './HeavyTransition.p3r';
import { StageChip } from '@pink/screens/pkg1/fxbits';

type S = 'idle' | 'active' | 'cancel' | 'reduced';

export default function RadialQuickNavDemo({ open, onClose, params }: OverlayProps) {
  const anim = useBoldness();
  const st: S = (params?.get('state') as S) || 'idle';
  const state: S = !anim ? 'reduced' : st;
  const pick = Math.max(0, Math.min(6, Number(params?.get('pick') ?? 3) || 0));
  const [vw, setVw] = useState(window.innerWidth);
  const [vh, setVh] = useState(window.innerHeight);
  useEffect(() => { const on = () => { setVw(window.innerWidth); setVh(window.innerHeight); }; window.addEventListener('resize', on); return () => window.removeEventListener('resize', on); }, []);
  const origin = { x: vw / 2, y: vh - 32 };
  const strip = p3Strip(origin, WHEEL_ITEMS.length);
  const barCenter = (i: number) => ({ x: strip.x0 + i * strip.pitch + strip.pitch / 2, y: strip.bottom - strip.barH * 0.45 });

  const [wheel, setWheel] = useState(false);
  const [charging, setCharging] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [finger, setFinger] = useState<{ x: number; y: number } | null>(null);
  const [hint, setHint] = useState<string>('滑向目标');
  const [wave, setWave] = useState<null | 'in' | 'out'>(null);
  const timers = useRef<number[]>([]);
  const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));

  useEffect(() => {
    timers.current.forEach(clearTimeout); timers.current = [];
    if (!open || state === 'reduced') return;
    setWheel(false); setActive(null); setFinger({ ...origin }); setHint('滑向目标'); setCharging(true);
    at(500, () => { setCharging(false); setWheel(true); });
    if (state === 'active') {
      for (let i = 0; i <= pick; i++) at(900 + i * 160, () => { setFinger(barCenter(i)); setActive(i); setHint(WHEEL_ITEMS[i].label); });
      const tRel = 900 + pick * 160 + 1200;
      at(tRel, () => { setHint(`松开 → ${WHEEL_ITEMS[pick].label}`); });
      at(tRel + 400, () => { setWheel(false); setFinger(null); setWave('in'); });
      at(tRel + 700, () => setWave('out'));
      at(tRel + 1040, () => setWave(null));
    }
    if (state === 'cancel') {
      at(900, () => { setFinger(barCenter(2)); setActive(2); setHint(WHEEL_ITEMS[2].label); });
      at(1450, () => { setFinger({ x: barCenter(2).x, y: strip.bottom + 60 }); setActive(null); setHint('取消'); });
      at(2000, () => { setWheel(false); setFinger(null); });
      at(2500, () => onClose());
    }
    return () => timers.current.forEach(clearTimeout);
  }, [open, state, pick, vw, vh]); // eslint-disable-line react-hooks/exhaustive-deps

  // idle：真的可以拖 / 点（手势模式口径：移动选中，抬起前往；滑回下方取消）
  const onMove = (e: RPointerEvent) => {
    if (state !== 'idle' || !wheel) return;
    const n = p3Pick(origin, WHEEL_ITEMS.length, e.clientX, e.clientY);
    setActive(n); setHint(n === null ? '取消' : WHEEL_ITEMS[n].label); setFinger({ x: e.clientX, y: e.clientY });
  };
  const go = (i: number) => { setWheel(false); navigate(WHEEL_ITEMS[i].id, undefined, { transition: 'wave' }); };

  if (!open) return null;
  if (state === 'reduced') return (<><StageChip text="WHEEL · D0" /><WheelD0Menu open origin={origin} onClose={onClose} /><FakeNav cat /></>);
  return (
    <div className="fixed inset-0" style={{ zIndex: 45 }} onPointerMove={onMove}>
      <StageChip text={`WHEEL · ${state.toUpperCase()}${state === 'active' ? ` · ${pick}` : ''}`} />
      <FakeNav cat charging={charging} />
      <RadialWheelStage open={wheel} origin={origin} active={active} hint={hint} gesture
        onPick={state === 'idle' ? go : undefined} onBackdrop={state === 'idle' ? () => { setWheel(false); window.setTimeout(onClose, 260); } : undefined}>
        {finger && (
          <motion.span aria-hidden className="pointer-events-none absolute z-[80] h-11 w-11 rounded-full" style={{ left: -22, top: -22, background: 'rgba(255,255,255,0.28)', boxShadow: '0 0 0 2px rgba(255,255,255,0.85), 0 0 0 7px rgb(var(--p3r-blue-rgb) / 0.35)' }}
            initial={{ x: origin.x, y: origin.y, scale: 0.6 }} animate={{ x: finger.x, y: finger.y, scale: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
        )}
      </RadialWheelStage>
      {wave && <WaveSliceP3 phase={wave} />}
    </div>
  );
}

/** 演示底栏：中央裸猫（按住蓄力环 500ms） */
const FakeNav = ({ cat, charging }: { cat?: boolean; charging?: boolean }) => (
  <div className="fixed inset-x-0 bottom-0 flex h-[64px] items-center border-t" style={{ zIndex: 44, background: P3R.panel, borderColor: 'rgb(var(--p3r-cyan-rgb) / 0.45)' }}>
    {['首页', '行动'].map((t, i) => <span key={t} className="relative flex h-full flex-1 items-center justify-center text-[11px] font-black" style={{ color: i === 0 ? 'var(--p3r-on-blue)' : P3R.grey }}>{i === 0 && <span aria-hidden className="absolute inset-x-1 bottom-1.5 top-1" style={{ background: P3R.blue, clipPath: slantClip(10) }} />}<span className="relative">{t}</span></span>)}
    <span className="relative flex h-full flex-1 items-center justify-center" style={{ color: 'var(--p3-cat)' }}>
      {cat && <IconCat size={38} />}
      <span aria-hidden className="absolute bottom-[9px] right-[calc(50%-24px)] h-[6px] w-[11px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
      {charging && (
        <svg aria-hidden className="absolute h-[58px] w-[58px] -rotate-90" viewBox="0 0 58 58">
          <motion.circle cx="29" cy="29" r="26" fill="none" stroke="var(--p3r-blue)" strokeWidth="3" strokeDasharray="164" initial={{ strokeDashoffset: 164 }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 0.5, ease: 'linear' }} />
        </svg>
      )}
    </span>
    {['羁绊', '菜单'].map((t) => <span key={t} className="flex h-full flex-1 items-center justify-center text-[11px] font-black" style={{ color: P3R.grey }}>{t}</span>)}
  </div>
);
