// r12：原版回合切换横幅 YOUR TURN / ENEMY TURN（other_3405、enemy_turn_1305_5/3536_5）。
// 结构 = prefab_ui2d_turn_change_{ally,enemy} 的 RectTransform/Image/RectMask2D/CanvasGroup 原值（tools/gen-turn-change.py → ui/data/turn-change.json），
// 动画 = 原版 AnimationClip turn_start / turn_start_enemy（2.0s，Hermite 切线照原值），贴图 = 原版 sprite（tools/fetch-p5t-turn.sh → public/p5t-turn，不入库）。
// 画布 1920×1080，按屏高等比缩放、水平居中（CanvasScaler 设置未导出，按高度匹配是推断）。turn_text_image 绑字样 sprite 为推断（prefab 无 Image）。
import TC from '../ui/data/turn-change.json';

interface N { n: string; off?: number; am?: number[]; aM?: number[]; ap?: number[]; sd?: number[]; pv?: number[]; sc?: number[]; rz?: number; img?: { sp: string | null; type: number; fm?: number; fo?: number; fa?: number; col: number[] }; mask?: number[]; smask?: number; alpha?: number; k?: N[] }
interface Curve { p: string; a: string; k: number[][] }
const BASE = 'p5t-turn/';
let avail: boolean | null = null;
export async function turnChangeReady(): Promise<boolean> {
  if (avail != null) return avail;
  try { const r = await fetch(BASE + 'ENEMY_TURN_ENEMY.webp', { method: 'HEAD' }); avail = r.ok && (r.headers.get('content-type') ?? '').includes('image'); } catch { avail = false; }
  return avail;
}
export const turnChangeAvailable = () => !!avail;

function evalCurve(k: number[][], t: number): number {
  if (t <= k[0][0]) return k[0][1];
  const L = k[k.length - 1]; if (t >= L[0]) return L[1];
  for (let i = 0; i < k.length - 1; i++) {
    const [t0, p0, , o0] = k[i], [t1, p1, i1] = k[i + 1];
    if (t > t1) continue;
    const dt = t1 - t0; if (dt <= 0) return p1;
    if (!isFinite(o0) || !isFinite(i1)) return p0; // 常量切线 = 阶跃
    const s = (t - t0) / dt, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * o0 * dt + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * i1 * dt;
  }
  return L[1];
}

class Node {
  el: HTMLDivElement; img: HTMLElement | null = null; kids: Node[] = [];
  ap: number[]; sc: number[]; rz: number; fa: number; fo: number; alpha = 1; ia = 1; mask: number[] | null;
  constructor(public d: N, public path: string) {
    this.el = document.createElement('div'); this.el.className = 'tcn'; this.el.dataset.n = d.n;
    this.ap = [...(d.ap ?? [0, 0])]; this.sc = [...(d.sc ?? [1, 1])]; this.rz = d.rz ?? 0;
    this.fa = d.img?.fa ?? 1; this.fo = d.img?.fo ?? 0; this.mask = d.mask ? [...d.mask] : null; this.alpha = d.alpha ?? 1;
    if (d.img && d.img.sp) {
      this.img = document.createElement('i'); this.img.style.backgroundImage = `url(${BASE}${d.img.sp}.webp)`; this.ia = d.img.col[3]; this.el.appendChild(this.img);
    }
    if (d.smask != null && d.img?.sp) { // Unity Mask（模板）：子节点只在本 sprite 的 alpha 内可见；m_ShowMaskGraphic=0 时自身不画
      const u = `url(${BASE}${d.img.sp}.webp)`; const st = this.el.style as CSSStyleDeclaration & { webkitMaskImage: string; webkitMaskSize: string };
      st.maskImage = u; st.webkitMaskImage = u; st.maskSize = '100% 100%'; st.webkitMaskSize = '100% 100%'; st.maskRepeat = 'no-repeat';
      if (!d.smask && this.img) this.img.style.visibility = 'hidden';
    }
    if (d.off) this.el.style.display = 'none';
    for (const k of d.k ?? []) { const c = new Node(k, path ? `${path}/${k.n}` : k.n); this.kids.push(c); this.el.appendChild(c.el); }
  }
  layout(pw: number, ph: number) {
    const d = this.d; if (!d.am) return;
    const w = (d.aM![0] - d.am[0]) * pw + d.sd![0], h = (d.aM![1] - d.am[1]) * ph + d.sd![1];
    const px = (d.am[0] + (d.aM![0] - d.am[0]) * d.pv![0]) * pw + this.ap[0], py = (d.am[1] + (d.aM![1] - d.am[1]) * d.pv![1]) * ph + this.ap[1];
    const bx = px - d.pv![0] * w, by = py - d.pv![1] * h;
    const s = this.el.style;
    s.left = `${bx}px`; s.top = `${ph - (by + h)}px`; s.width = `${w}px`; s.height = `${h}px`;
    s.transformOrigin = `${d.pv![0] * 100}% ${(1 - d.pv![1]) * 100}%`;
    s.transform = `rotate(${-this.rz}deg) scale(${this.sc[0]},${this.sc[1]})`;
    s.opacity = String(this.alpha);
    if (this.mask) { const [l, b, r, t] = this.mask; s.clipPath = `inset(${t}px ${r}px ${b}px ${l}px)`; }
    if (this.img && d.img) {
      this.img.style.opacity = String(this.ia);
      if (d.img.type === 3) {
        const c = `${(1 - Math.max(0, Math.min(1, this.fa))) * 100}%`, o = Math.round(this.fo);
        this.img.style.clipPath = d.img.fm === 1 ? (o === 1 ? `inset(0 0 ${c} 0)` : `inset(${c} 0 0 0)`) : (o === 1 ? `inset(0 0 0 ${c})` : `inset(0 ${c} 0 0)`);
      }
    }
    for (const k of this.kids) k.layout(w, h);
  }
  find(p: string): Node | null { if (this.path === p) return this; for (const k of this.kids) { const f = k.find(p); if (f) return f; } return null; }
}

/** 播放原版回合切换。side = 'ally'（YOUR TURN）/ 'enemy'；speed = 时间倍率；返回在动画结束时 resolve */
export function playTurnChange(side: 'ally' | 'enemy', speed = 1, host: HTMLElement = document.getElementById('app') ?? document.body): Promise<void> {
  const data = (side === 'ally' ? TC.ally : TC.enemy) as unknown as N;
  const clip = (side === 'ally' ? TC.clipAlly : TC.clipEnemy) as unknown as { len: number; curves: Curve[] };
  const wrap = document.createElement('div'); wrap.className = 'tc-wrap';
  const stage = document.createElement('div'); stage.className = 'tc-stage';
  const root = new Node(data, '');
  // r12 修正（按原版帧 other_3405 校准，非 prefab 数据）：原值下红色细带 bar_3_image_0 比原版帧高约 12px（720p），
  // 盖住 YOUR TURN 字样下沿；下移 18 单位（1080 画布）后字样完整、红带上沿与原版帧对齐。原因未查明（疑 CanvasScaler/sprite 网格差异）。
  if (side === 'ally') { const b = findByName(root, 'bar_3_image_0'); if (b) b.ap[1] -= 18; }
  // 动画路径相对 GameObject（Animation 组件所在节点）
  const anim = root.kids.find((k) => k.d.n === 'GameObject')!;
  for (const k of anim.kids) k.path = k.d.n, fixPaths(k);
  stage.appendChild(root.el); wrap.appendChild(stage); host.appendChild(wrap);
  const fit = () => { const W = host.clientWidth || innerWidth, H = host.clientHeight || innerHeight, s = H / 1080; stage.style.transform = `translate(${(W - 1920 * s) / 2}px,0) scale(${s})`; };
  fit();
  const bind = clip.curves.map((c) => ({ c, n: c.p === '' ? anim : anim.find(c.p) })).filter((b) => b.n);
  const apply = (t: number) => {
    for (const { c, n } of bind) {
      const v = evalCurve(c.k, t), nn = n!;
      switch (c.a) {
        case 'm_Alpha': nn.alpha = v; break;
        case 'm_FillAmount': nn.fa = v; break;
        case 'm_FillOrigin': nn.fo = v; break;
        case 'm_Color.a': nn.ia = v; break;
        case 'm_AnchoredPosition.x': nn.ap[0] = v; break;
        case 'm_AnchoredPosition.y': nn.ap[1] = v; break;
        case 'm_LocalScale.x': nn.sc[0] = v; break;
        case 'm_LocalScale.y': nn.sc[1] = v; break;
        case 'rz': nn.rz = v; break;
        default: if (c.a.startsWith('m_Padding.') && nn.mask) nn.mask['xyzw'.indexOf(c.a.slice(-1))] = v;
      }
    }
    root.layout(1920, 1080);
  };
  apply(0);
  return new Promise((res) => {
    const t0 = performance.now();
    const step = () => {
      const t = ((performance.now() - t0) / 1000) * speed;
      if (t >= clip.len) { wrap.remove(); res(); return; }
      apply(t); requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
function findByName(n: Node, name: string): Node | null { if (n.d.n === name) return n; for (const k of n.kids) { const f = findByName(k, name); if (f) return f; } return null; }
function fixPaths(n: Node) { for (const k of n.kids) { k.path = `${n.path}/${k.d.n}`; fixPaths(k); } }
