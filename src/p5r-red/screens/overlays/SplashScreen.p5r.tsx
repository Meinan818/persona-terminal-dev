/**
 * 开屏 SplashScreen（真实 src/components/SplashScreen.tsx：P5Splash / VelvetSplash → splash/VelvetRoomSplash.tsx）。
 * 视觉 / 时序逐字迁移自 v3 overlays/a.js §1（splashP5 / splashVelvet），DOM 与 .oa-sp-* / .oa-vv-* 类名不变（legacy/css/a.css）。
 *   ?style=p5（默认）| velvet      ?state=reduced  = 启动看门狗安全模式轻开屏（真实 SplashScreen reduced=bootInfo.safeMode：
 *   速率 s = min(splashSpeed, 0.35)；天鹅绒不放 3D 推进段直接到标题）      ?speed=fast|normal|slow（0.55 / 1 / 1.65）
 * P5：strobe 35ms → p1 红幕斜扫 + 雷电 / 斜刀 / 城市 / 剪影（120ms·s）→ p2 标题砖砸落（480ms·s）→ p3 碎片字（900ms·s）
 *     → p4 红黑出幕（1800ms·s）→ 2600ms·s 结束；点任意处跳过。
 * 天鹅绒：travel（两壁门板 3D 推进）→ open 1350 → flood 1770 → title 2300 → 2100ms·s 后结束；点一下先跳到标题，再点结束。
 * P0-14：v3 里 .oa-sp-red 的 clip-path 过渡与 oa-bolt 的 clip-path 关键帧，改由 SplashScreen.p5r.css 用 transform/opacity 实现（形状不变）。
 */
import { useEffect, useRef, useState } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { P5Layer } from '@/p5r-red/kit/P5Layer';
import { P5BgSVG } from '@/p5r-red/fx/bg';
import { P5Sil } from '@/p5r-red/fx/sil';
import { sfx } from '@/p5r-red/fx/sfx';
import { cssText } from '@/p5r-red/lib/css';
import { useWide } from '@/p5r-red/lib/layout';
import { isLowMotion } from '@/p5r-red/lib/prefs';
import './SplashScreen.p5r.css';

const SPEED: Record<string, number> = { fast: 0.55, normal: 1, slow: 1.65 };
const BOLTS = [
  { d: 'M160,0 L340,0 L290,90 L400,90 L170,320 L250,190 L110,190 L210,60 L90,60 Z', st: 'top:-8%;left:-12%;width:75%;height:60%', clip: 'r', delay: 220 },
  { d: 'M320,0 L400,140 L290,140 L380,320 L200,320 L300,170 L180,170 L280,20 Z', st: 'top:25%;right:-12%;width:65%;height:55%', clip: 'b', delay: 320 },
  { d: 'M60,450 L200,220 L110,220 L240,0 L310,0 L170,230 L280,230 L90,530 Z', st: 'bottom:-8%;left:-8%;width:60%;height:50%', clip: 't', delay: 420 },
];
const SLASHES: [number, number, number, number, number, number, string][] = [[-15, 18, 115, 42, 4, 320, 'var(--p5r-sil)'], [-10, 55, 110, 38, 3, 360, 'var(--p5r-paper)'], [-5, 75, 105, 60, 5, 400, 'var(--p5r-sil)'], [20, -5, 45, 105, 3, 440, 'var(--p5r-paper)'], [60, -5, 85, 105, 2, 420, 'var(--p5r-sil)']];
const STROBE = [0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1];
const CITY = 'M0,80 L0,55 L15,55 L15,30 L25,30 L25,45 L35,45 L35,20 L50,20 L50,35 L55,35 L55,10 L65,10 L65,40 L80,40 L80,25 L95,25 L95,50 L105,50 L105,15 L115,15 L115,35 L125,35 L125,55 L140,55 L140,22 L155,22 L155,42 L170,42 L170,8 L182,8 L182,38 L198,38 L198,26 L214,26 L214,50 L228,50 L228,18 L240,18 L240,44 L258,44 L258,30 L272,30 L272,12 L284,12 L284,46 L300,46 L300,24 L316,24 L316,52 L330,52 L330,16 L344,16 L344,40 L360,40 L360,28 L376,28 L376,48 L390,48 L390,34 L400,34 L400,80 Z';
const STAR4 = 'M25,0 L29,19 L50,25 L29,31 L25,50 L21,31 L0,25 L21,19 Z';
const STAR5 = 'M12,2 L14.5,8.5 L21,9.5 L16,14 L17.5,21 L12,17.5 L6.5,21 L8,14 L3,9.5 L9.5,8.5 Z';

export function P5Splash({ open, onDone, s = 1 }: { open: boolean; onDone: () => void; s?: number }) {
  const wide = useWide();
  const [ph, setPh] = useState(0);
  const [shown, setShown] = useState(open);
  const strobe = useRef<HTMLDivElement>(null);
  const fin = useRef<() => void>(() => {});
  useEffect(() => {
    if (!open) return;
    setShown(true); setPh(0);
    const low = isLowMotion();
    let idx = 0, finished = false;
    const timers: number[] = [];
    const iv = window.setInterval(() => { idx = (idx + 1) % STROBE.length; if (strobe.current) strobe.current.style.background = STROBE[idx] ? 'var(--red)' : 'var(--p5r-bg-ink)'; }, 35);
    const finish = () => {
      if (finished) return; finished = true; timers.forEach(clearTimeout); clearInterval(iv);
      setPh(4);
      timers.push(window.setTimeout(() => { setShown(false); onDone(); }, low ? 0 : 420));
    };
    fin.current = finish;
    if (low) { clearInterval(iv); setPh(3); timers.push(window.setTimeout(finish, 900)); }
    else {
      timers.push(window.setTimeout(() => { clearInterval(iv); setPh(1); }, 120 * s), window.setTimeout(() => setPh(2), 480 * s), window.setTimeout(() => setPh(3), 900 * s), window.setTimeout(() => setPh(4), 1800 * s), window.setTimeout(finish, 2600 * s));
      timers.push(window.setTimeout(() => sfx('switch', 0.5), 480 * s));
    }
    return () => { timers.forEach(clearTimeout); clearInterval(iv); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const cls = ['oa-splash', 'sp5r', ...[1, 2, 3, 4].filter((n) => ph >= n).map((n) => 'p' + n)].join(' ');
  return (
    <P5Layer open={shown} onClose={() => fin.current()} cls={cls} z={950} escClose={false} fade={false} style={{ ['--sps' as string]: s }}>
      <div onClick={() => fin.current()} style={{ position: 'absolute', inset: 0 }}>
        <div className="oa-sp-strobe" ref={strobe} />
        <div className="oa-sp-red"><P5BgSVG seed={17} wide={wide} fx={wide ? 800 : 500} fy={470} rays={34} /></div>
        <div className="oa-sp-fx">
          {BOLTS.map((b, i) => <svg key={i} className={`oa-sp-bolt k${b.clip}`} viewBox="0 0 400 600" preserveAspectRatio="none" style={{ ...cssText(b.st), ['--d' as string]: `${b.delay}ms` }} aria-hidden="true"><path d={b.d} fill="var(--p5r-sil)" stroke="var(--p5r-sil-rim)" strokeWidth="5" vectorEffect="non-scaling-stroke" /></svg>)}
          {([[28, 32, 20, 550], [72, 44, 16, 620], [42, 60, 14, 680], [16, 74, 18, 600]] as const).map(([x, y, sz, d], i) => <svg key={i} className="oa-sp-so" viewBox="0 0 24 24" style={{ left: `${x}%`, top: `${y}%`, width: sz, height: sz, ['--d' as string]: `${d}ms` }}><path d={STAR5} fill="none" stroke="#111" strokeWidth="2" /></svg>)}
          <i className="oa-sp-dots" /><i className="oa-sp-stripes" />
          <i className="oa-sp-pan" style={{ clipPath: 'polygon(0 0,9% 0,5% 100%,0 100%)', ['--x' as string]: '-80px', ['--d' as string]: '180ms' }} />
          <i className="oa-sp-pan" style={{ clipPath: 'polygon(100% 0,91% 0,95% 100%,100% 100%)', ['--x' as string]: '80px', ['--d' as string]: '220ms' }} />
          <i className="oa-sp-pan thin" style={{ clipPath: 'polygon(0 0,100% 0,100% 6%,0 10%)', ['--x' as string]: '-60px', ['--d' as string]: '260ms' }} />
          <i className="oa-sp-pan thin" style={{ clipPath: 'polygon(0 92%,100% 88%,100% 100%,0 100%)', ['--x' as string]: '60px', ['--d' as string]: '300ms' }} />
          <svg className="oa-sp-city" viewBox="0 0 400 80" preserveAspectRatio="none" aria-hidden="true"><path d={CITY} fill="var(--p5r-sil)" /></svg>
          <div className="oa-sp-sil"><P5Sil name="leap" style={{ height: '100%', width: 'auto', display: 'block' }} /></div>
          <svg className="oa-sp-slash" aria-hidden="true">{SLASHES.map(([x1, y1, x2, y2, w, d, c], i) => <line key={i} x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`} stroke={c} strokeWidth={w} pathLength={1} style={{ ['--d' as string]: `${d}ms` }} />)}</svg>
        </div>
        <div className="oa-sp-title" aria-label="面具庭园 MASKARIA">
          <div className="oa-sp-row"><span className="oa-sp-blk l"><b>面具</b></span><span className="oa-sp-blk r"><b>庭园</b></span></div>
          <span className="oa-sp-blk sub"><b>MASKARIA</b></span>
        </div>
        <div className="oa-sp-deco">
          {([['top:14%;left:10%', 38, 0, 0], ['top:72%;right:8%', 32, 15, 60], ['top:20%;right:14%', 28, -10, 30], ['top:80%;left:12%', 24, 30, 90]] as const).map(([p, sz, r, d], i) => <svg key={i} className="oa-sp-cs" viewBox="0 0 50 50" style={{ ...cssText(p), width: sz, height: sz, ['--r' as string]: `${r}deg`, ['--d' as string]: `${d}ms` }}><path d={STAR4} fill="var(--p5r-paper)" stroke="#111" strokeWidth="1.5" /></svg>)}
          {([['PERSONA', 'top:26%;left:5%', -12, 50], ['TERMINAL', 'top:28%;left:20%', 5, 80], ['PERSONA', 'top:66%;right:5%', -8, 100], ['TERMINAL', 'top:68%;right:18%', 6, 130]] as const).map(([t, p, r, d], i) => <span key={i} className="oa-sp-frag" style={{ ...cssText(p), ['--r' as string]: `${r}deg`, ['--d' as string]: `${d}ms` }}>{t}</span>)}
        </div>
        <i className="oa-sp-frame" /><i className="oa-sp-bar" />
        <span className="oa-sp-skip">点击任意处跳过</span>
        <i className="oa-sp-exit" />
      </div>
    </P5Layer>
  );
}

export function VelvetSplash({ open, onDone, s = 1, reduced = false }: { open: boolean; onDone: () => void; s?: number; reduced?: boolean }) {
  const wide = useWide();
  const [cls, setCls] = useState<string[]>([]);
  const [shown, setShown] = useState(open);
  const api = useRef({ title: () => {}, end: () => {} });
  const st = useRef<string[]>([]);
  const set = (c: string[]) => { st.current = c; setCls(c); };
  useEffect(() => {
    if (!open) return;
    setShown(true);
    const low = isLowMotion() || reduced;
    const t: number[] = [];
    let done = false;
    const end = () => { if (done) return; done = true; t.forEach(clearTimeout); setShown(false); onDone(); };
    const title = () => { if (st.current.includes('title')) return; set(['title']); t.push(window.setTimeout(end, low ? Math.max(900, 2100 * s) : 2100 * s)); };
    api.current = { title, end };
    if (low) title();
    else { set(['travel']); t.push(window.setTimeout(() => set(['travel', 'open']), 1350 * s), window.setTimeout(() => set(['travel', 'open', 'flood']), 1770 * s), window.setTimeout(() => { set(['travel', 'open']); title(); }, 2300 * s)); }
    return () => t.forEach(clearTimeout);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const doors = Array.from({ length: 10 }, (_, i) => ({ side: i % 2 ? 'r' : 'l', delay: Math.floor(i / 2) * 0.52 + (i % 2) * 0.26 }));
  return (
    <P5Layer open={shown} onClose={() => api.current.end()} cls={`oa-velvet ${cls.join(' ')}`} z={950} escClose={false} fade={false}>
      <div style={{ position: 'absolute', inset: 0 }} onClick={() => (st.current.includes('title') ? api.current.end() : api.current.title())}>
        <div className="oa-vv-bg"><P5BgSVG seed={41} wide={wide} fx={wide ? 800 : 500} fy={420} rays={40} cream={0} /></div>
        <div className="oa-vv-scene">
          {doors.map((d, i) => <i key={i} className={`oa-vv-sd ${d.side}`} style={{ ['--d' as string]: `${d.delay * s}s` }} />)}
          <div className="oa-vv-door"><i className="oa-vv-leaf l" /><i className="oa-vv-leaf r" /><i className="oa-vv-glow" /></div>
        </div>
        <i className="oa-vv-flood" />
        <div className="oa-vv-title">
          <div className="oa-vv-mq t">MASKARIA</div><div className="oa-vv-mq b">MASKARIA</div>
          {[0, 1, 2].map((i) => <i key={i} className="oa-vv-ring" style={{ ['--d' as string]: `${i * 0.36}s` }} />)}
          <h1 aria-label="MASKARIA">{[...'MASKARIA'].map((c, i) => <span key={i} style={{ ['--d' as string]: `${0.1 + i * 0.085}s` }}>{c}</span>)}</h1>
          <p>MASKARIA · 面具庭园</p>
        </div>
        <span className="oa-sp-skip">点击任意处跳过</span>
      </div>
    </P5Layer>
  );
}

export default function SplashScreen({ open, onClose, params }: OverlayProps) {
  const style = params?.get('style') ?? 'p5';
  const reduced = params?.get('state') === 'reduced';
  const base = SPEED[params?.get('speed') ?? 'normal'] ?? 1;
  const s = reduced ? Math.min(base, 0.35) : base;
  return style === 'velvet'
    ? <VelvetSplash open={open} onDone={onClose} s={s} reduced={reduced} />
    : <P5Splash open={open} onDone={onClose} s={s} />;
}
