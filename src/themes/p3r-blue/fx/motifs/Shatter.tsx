/**
 * B4 玻璃碎裂（召唤 / Evoker 的瞬间）—— 蓝专属。只用「碎裂 + 召唤字样」表达，不画枪形 / 指头。
 *   <Shatter active origin onCovered onDone variant="day|darkhour" />
 *        HeavyTransition 蓝主档：玻璃盖板 → 裂纹 60ms → onCovered（外壳此刻切页）→ 12–14 片碎片向外 + 下落 420ms → 露出新页
 *        darkhour：夜间变体，裂开前绿闪 + 定格 1 帧
 *   <ShardCheck />          成功勾的碎片版（CutInBand 右侧主视觉；夜间自动绿）
 *   <ShardFrame>…</ShardFrame>  玻璃碎片框：状态页「脸映在碎片上」（插槽 slot:status-shard-face，demo 放焦散）
 * 只动 transform / opacity；低动效：淡入淡出（同步回调）。
 */
import { memo, useMemo, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Portal, rng, useBoldness, useSyncFallback, useTimeline, zVar } from './_env';
import { Caustics } from './Water';

type Pt = [number, number];
interface Shard { pts: Pt[]; c: Pt; }

/** 以撞击点为心：内圈三角 + 外圈四边形，共 2n 片（n=6..7），角度与半径抖动 → 锐角多边形 */
export function shardsFor(W: number, H: number, o: Pt, n = 7, seed = 3): Shard[] {
  const r = rng(seed);
  const far = Math.hypot(W, H) * 1.2;
  const r1 = Math.min(W, H) * (0.22 + r() * 0.08);
  const angs = Array.from({ length: n }, (_, i) => ((i + (r() - 0.5) * 0.55) / n) * Math.PI * 2);
  const inner = angs.map((a) => [o[0] + Math.cos(a) * r1 * (0.75 + r() * 0.5), o[1] + Math.sin(a) * r1 * (0.75 + r() * 0.5)] as Pt);
  const outer = angs.map((a) => [o[0] + Math.cos(a) * far, o[1] + Math.sin(a) * far] as Pt);
  const out: Shard[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const tri: Pt[] = [o, inner[i], inner[j]];
    const quad: Pt[] = [inner[i], outer[i], outer[j], inner[j]];
    for (const pts of [tri, quad]) {
      const c: Pt = [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
      out.push({ pts, c });
    }
  }
  return out;
}

interface ShatterProps {
  active: boolean;
  origin?: { x: number; y: number } | null;
  onCovered?: () => void;
  onDone?: () => void;
  variant?: 'day' | 'darkhour';
  /** 中央召唤字样（可空） */
  word?: string;
}

/**
 * 时序（day，总 980ms）：0–140 玻璃盖板淡入（白闪）→ 140–200 裂纹自撞击点射出 → onCovered@220 →
 * 260–680 碎片向外 + 下落 + 旋转 + 淡出 → onDone@980。darkhour：0–90 绿闪，90–140 定格一帧，其余后移 60ms。
 */
export const Shatter = ({ active, origin, onCovered, onDone, variant = 'day', word = 'PERSONA' }: ShatterProps) => {
  const anim = useBoldness();
  const dh = variant === 'darkhour';
  const shift = dh ? 0.06 : 0;
  useSyncFallback(active, anim, onCovered, onDone);
  useTimeline(active, anim, 220 + shift * 1000, 980 + shift * 1000, onCovered, onDone);
  const W = typeof window === 'undefined' ? 390 : window.innerWidth;
  const H = typeof window === 'undefined' ? 844 : window.innerHeight;
  const o: Pt = origin ? [origin.x, origin.y] : [W * 0.56, H * 0.44];
  const shards = useMemo(() => (active ? shardsFor(W, H, o, 7, Math.round(o[0] + o[1])) : []), [active, W, H, o[0], o[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!active || !anim) return null;
  const face = dh ? 'var(--bk-abyss-2)' : 'var(--bk-shard)';
  const edge = dh ? 'var(--bk-darkhour)' : 'var(--bk-shard-edge)';
  return (
    <Portal>
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: zVar('transition'), pointerEvents: 'auto', overflow: 'hidden' }}>
        {dh && (
          <motion.div style={{ position: 'absolute', inset: 0, background: 'var(--bk-darkhour)' }}
            initial={{ opacity: 0 }} animate={{ opacity: [0, 0.85, 0.85, 0] }} transition={{ duration: 0.2, times: [0, 0.3, 0.7, 1], ease: 'linear' }} />
        )}
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          {shards.map((s, i) => {
            const dx = s.c[0] - o[0], dy = s.c[1] - o[1];
            const len = Math.hypot(dx, dy) || 1;
            const push = 40 + (i % 4) * 26;
            const tx = (dx / len) * push;
            const ty = (dy / len) * push * 0.6 + 220 + (i % 3) * 60;
            const rot = (i % 2 ? 1 : -1) * (14 + (i % 5) * 7);
            return (
              <motion.polygon key={i} points={s.pts.map((p) => p.join(',')).join(' ')}
                style={{ fill: face, stroke: edge, strokeWidth: 1.6, transformBox: 'fill-box', originX: 0.5, originY: 0.5 }}
                initial={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
                animate={{ opacity: [0, 1, 1, 0.9, 0], x: [0, 0, 0, tx * 0.7, tx], y: [0, 0, 0, ty * 0.55, ty], rotate: [0, 0, 0, rot * 0.6, rot] }}
                transition={{ duration: 0.82, delay: shift, times: [0, 0.17, 0.32, 0.75, 1], ease: 'easeIn' }} />
            );
          })}
          {/* 裂纹：撞击点放射白线（先于碎片出现，60ms 内画完） */}
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 0.4, delay: 0.14 + shift, times: [0, 0.15, 0.6, 1] }}>
            {shards.filter((_, i) => i % 2 === 0).map((s, i) => (
              <motion.polyline key={i} points={`${o[0]},${o[1]} ${s.pts[1][0]},${s.pts[1][1]}`} fill="none" style={{ stroke: dh ? 'var(--bk-darkhour)' : 'var(--p3r-cream)', strokeWidth: 2.2 }}
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.06, delay: 0.14 + shift + i * 0.006 }} />
            ))}
            <circle cx={o[0]} cy={o[1]} r={7} style={{ fill: dh ? 'var(--bk-darkhour)' : 'var(--p3r-cream)' }} />
          </motion.g>
        </svg>
        {word && (
          <motion.div style={{ position: 'absolute', left: 0, right: 0, top: o[1] - 40, textAlign: 'center', fontFamily: 'var(--p3r-font-cond)', fontStyle: 'italic', fontWeight: 800, fontSize: 'clamp(44px, 15vw, 120px)', lineHeight: 1, letterSpacing: '0.04em', color: dh ? 'var(--bk-darkhour)' : 'var(--p3r-blue)', rotate: -8 }}
            initial={{ opacity: 0, scale: 1.3 }} animate={{ opacity: [0, 1, 1, 0], scale: [1.3, 1, 1, 0.96] }} transition={{ duration: 0.6, delay: 0.16 + shift, times: [0, 0.15, 0.6, 1] }}>
            {word}
          </motion.div>
        )}
      </div>
    </Portal>
  );
};

/** 碎片勾（成功主视觉）：长短两片构成勾形 + 3 粒飞屑；夜间 --p3r-blue 自动为影时间绿 */
export const ShardCheck = memo(({ className, style }: { className?: string; style?: CSSProperties }) => (
  <svg viewBox="0 0 220 180" className={className} style={style} aria-hidden>
    <polygon points="22,100 58,82 96,128 78,154 40,122" style={{ fill: 'var(--p3r-cyan)', stroke: 'var(--bk-shard-edge)' }} strokeWidth="2" />
    <polygon points="96,128 178,30 190,34 204,46 114,156 78,154" style={{ fill: 'var(--p3r-blue)', stroke: 'var(--bk-shard-edge)' }} strokeWidth="2" />
    <polygon points="122,92 160,50 152,82" style={{ fill: 'var(--bk-shard-edge)' }} opacity="0.55" />
    <polygon points="190,6 210,0 200,24" style={{ fill: 'var(--p3r-cyan)' }} />
    <polygon points="16,66 32,60 26,80" style={{ fill: 'var(--bk-red)' }} />
    <polygon points="110,166 126,156 118,178" style={{ fill: 'var(--p3r-blue)' }} opacity="0.55" />
  </svg>
));

/** 玻璃碎片框：锐角多边形 clip + 白边；默认内容 = 焦散（官方素材插槽 slot:status-shard-face） */
export const ShardFrame = ({ size = 72, children, className, style }: { size?: number; children?: ReactNode; className?: string; style?: CSSProperties }) => {
  const clip = 'polygon(18% 0, 86% 8%, 100% 52%, 72% 100%, 8% 88%, 0 34%)';
  return (
    <div className={className} style={{ position: 'relative', width: size, height: size * 1.1, ...style }}>
      <div style={{ position: 'absolute', inset: -3, clipPath: clip, background: 'var(--bk-shard-edge)' }} />
      <div data-slot="status-shard-face" style={{ position: 'absolute', inset: 0, clipPath: clip, background: 'linear-gradient(160deg, var(--bk-sea-1), var(--bk-sea-3))', overflow: 'hidden' }}>
        {children ?? <Caustics opacity={0.7} fps={2} scale={0.6} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(125deg, transparent 40%, var(--bk-shard-edge) 41%, transparent 48%)', opacity: 0.6 }} />
      </div>
    </div>
  );
};
