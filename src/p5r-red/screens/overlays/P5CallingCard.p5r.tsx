/**
 * P5CallingCard 验证码预告函（真实 src/components/auth/P5CallingCard.tsx，红频道专属；视觉 = v3 overlays/a.js callingCardHTML）。
 * 登录 → 验证码 → 发送验证码后，红频道的 LoginModal 头部换成预告函：MASKARIA / CLOUD · ACCESS 黑条 → 「预 告 函」三字砖砸入
 * （slam 360ms / 间隔 60ms）→ 五行剪报逐字纸片（PastedLine：每字独立纸片、固定种子、首字红纸；loud 行每 4 字一红；逐字弹入 200ms / 间隔 18ms）
 * → 落款「MASKARIA，参上！」。文案改写：验证码已发送 →「预告函已送达，请查收邮箱。」；验证码错误 →「暗号不正确或已过期…」。
 * 路由：#/overlay/auth-p5-calling-card（= 登录弹层的验证码步）· ?state=error（试输 0000 的报错态）· fx-p5-calling-card（演出单播 3.6s）。
 */
import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5OaRough, collageSlam } from '@/p5r-red/kit/P5Layer';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import LoginModal from './LoginModal.p5r';

const ANG = [-7, 4, -3, 6, -5, 2, -4, 5, -2, 7, -6], OFF = [1, -2, 3, 0, -3, 2, -1, 4, -2], SC = [1.12, 0.94, 1.02, 0.97, 1.08, 0.92, 1.04];

/** PastedLine：逐字独立纸片（固定种子），首字红纸；loud 时每 4 字一红 */
function PastedLine({ text, seed, loud = false, rot = 0 }: { text: string; seed: number; loud?: boolean; rot?: number }) {
  return (
    <p className="oa-pl" style={{ transform: `rotate(${rot}deg)` }}>
      <span className="sr">{text}</span>
      {[...text].map((ch, i) => {
        const n = seed + i, redP = i === 0 || (loud && i % 4 === 1), lightP = !redP && n % 7 === 0, redInk = !redP && !lightP && n % 4 === 0, pun = /[，。：！「」—]/.test(ch);
        const face = redP ? 'var(--red)' : lightP ? 'var(--p5r-paper)' : '#111';
        const st: CSSProperties = { width: `${pun ? 0.74 : 1.2}em`, height: `${n % 3 === 0 ? 1.5 : 1.36}em`, fontSize: `${((pun ? 0.9 : SC[n % 7]) * (loud ? 1.15 : 1)).toFixed(3)}em`, marginTop: OFF[n % 9], transform: `rotate(${ANG[n % 11]}deg)`, color: lightP ? '#111' : redInk ? '#ff454b' : '#f8f8f6', zIndex: n % 3 };
        return <span key={i} aria-hidden="true" className="oa-pt" style={st}><P5OaRough seed={n * 1.71} face={face} frame="var(--p5r-paper)" sh="#000" jag={3} d={[2, 3]} inset={1.3} /><i>{ch}</i></span>;
      })}
    </p>
  );
}

export function P5CallingCardSection() {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const r = ref.current; if (!r || isLowMotion()) return;
    collageSlam(r.querySelectorAll('.oa-cc-head .oa-ct'), 60);
    const anims = Array.from(r.querySelectorAll<HTMLElement>('.oa-pt')).map((t, i) => t.animate([{ opacity: 0, transform: t.style.transform + ' scale(1.6)' }, { opacity: 1, transform: t.style.transform }], { duration: 200, delay: 200 + i * 18, easing: 'cubic-bezier(.2,1.4,.4,1)', fill: 'backwards' }));
    return () => anims.forEach((a) => a.cancel());
  }, []);
  const head: [string, string, string, number, number, number][] = [['预', 'var(--red)', '#f8f8f6', 1.13, -9, 0], ['告', '#111', 'var(--p5r-paper)', 0.97, 4, 8], ['函', '#111', '#ff1a2a', 1.05, -5, 4]];
  return (
    <section className="oa-cc" aria-label="预告函已送达" ref={ref}>
      <i className="oa-cc-bg" aria-hidden="true" />
      <div className="oa-cc-top"><span>MASKARIA</span><span>CLOUD · ACCESS</span></div>
      <h2 className="sr">预告函已送达</h2>
      <div className="oa-cc-head" aria-hidden="true">
        {head.map(([c, bg, fg, s, r, dy]) => <b key={c} className="oa-ct" data-r={r} style={{ ['--s' as string]: `${33 * s}px`, background: bg, color: fg, transform: `rotate(${r}deg)`, marginTop: dy }}>{c}</b>)}
      </div>
      <div className="oa-cc-body">
        <PastedLine text="致一成不变的日常：" seed={12} rot={-3} /><PastedLine text="封锁下一幕的门，" seed={37} rot={1.8} /><PastedLine text="已被我等锁定。" seed={53} rot={-1.4} />
        <PastedLine text="揭下面具，" seed={76} loud rot={2.2} /><PastedLine text="夺回你的可能性！" seed={91} loud rot={-2} />
      </div>
      <div className="oa-cc-sign"><PastedLine text="MASKARIA，参上！" seed={115} rot={-3} /></div>
    </section>
  );
}

/** 独立预览：登录弹层直接落在验证码步（预告函）；?state=error 预填 0000 并显示报错 */
export default function P5CallingCardPreview({ open, onClose, params }: OverlayProps) {
  const q = new URLSearchParams(params); q.set('step', 'code'); q.set('consent', '0');
  return <LoginModal open={open} onClose={onClose} params={q} />;
}
