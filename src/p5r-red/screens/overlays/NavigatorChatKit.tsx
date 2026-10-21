/**
 * 助手对话窗共用件（迁移自 v3 /workspace/work/p5r/chat/chat.js 的「角色 / 头像盒 / 面板骨架 / toast / toggle」）。
 * NavigatorWindow / NavigatorActionForm / NavigatorNotebook 共用；样式 = NavigatorWindow.p5r.css（根 .nvw，类名 nv- 前缀）。
 * 角色 = 真实 navigatorPresets 三条内置人格 id（builtin-cat / builtin-toaster / builtin-bear）的 P5 换名版（HANDOFF §4）。
 */
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { isLowMotion, soundEnabled } from '@/p5r-red/lib/prefs';
import { kitImg } from '@/p5r-red/lib/asset';
import './NavigatorWindow.p5r.css';

const CHAT = import.meta.glob('../../assets/chat/*', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const CHAT_BY = Object.fromEntries(Object.entries(CHAT).map(([k, v]) => [k.split('/').pop()!.replace(/\.\w+$/, ''), v]));
/** 聊天素材：先找 assets/chat，再退到 assets/kit */
export const chatImg = (n: string): string => CHAT_BY[n] ?? kitImg(n);

/** 类名助手：cx('thread active') → 'nv-thread nv-active'（假值跳过） */
export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ').split(/\s+/).filter(Boolean).map((c) => 'nv-' + c).join(' ');

export const EASE_BACK = 'cubic-bezier(.34,1.56,.64,1)';
export const anim = (el: Element | null | undefined, kf: Keyframe[], opt: KeyframeAnimationOptions): Animation | null => (!el || isLowMotion() || !(el as HTMLElement).animate ? null : (el as HTMLElement).animate(kf, opt));
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const hhmm = (t: number) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
export const pts = (arr: number[][]) => arr.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/* ── 声音（app playSound 口径：音量 × 静音开关；接 DevCapsule 音效开关） ── */
export function playMsg(k: 'in' | 'out'): void {
  if (!soundEnabled()) return;
  try { const a = new Audio(chatImg(k === 'in' ? 'msg_in' : 'msg_out')); a.volume = k === 'in' ? 0.55 : 0.45; void a.play().catch(() => {}); } catch { /* 无声 */ }
}

/* ── 角色 ── */
export interface ChatChar { key: string; id: string; name: string; color: string; sil: string; img: { x: number; y: number; w: number; h: number }; me: string; own: string; prompt: string }
export const CHARS: ChatChar[] = [
  { key: 'morgana', id: 'builtin-cat', name: '摩尔加纳', color: '#EDE6D6', sil: 'sil_morgana', img: { x: 30, y: -2, w: 72, h: 82 }, me: '吾辈', own: '今天在窗台上晒了一下午太阳。……才不是因为犯困！',
    prompt: '你是摩尔加纳——《女神异闻录5》怪盗团的引路者，外形是只黑白相间的猫，但坚称自己「才不是猫」，自称「吾辈」。性格：自信、爱摆前辈架子、讲究计划和效率，嘴上逞强但非常可靠、重视同伴。' },
  { key: 'ann', id: 'builtin-toaster', name: '高卷杏', color: '#FE93C9', sil: 'sil_ann', img: { x: 6, y: 4, w: 108, h: 76 }, me: '我', own: '刚拍完杂志，正在找新开的甜点店～',
    prompt: '你是高卷杏——《女神异闻录5》怪盗团的一员，秀尽学园二年级，兼职模特。性格：开朗直率、表情丰富、讲义气，看不惯欺负人的事。' },
  { key: 'ryuji', id: 'builtin-bear', name: '坂本龙司', color: '#F0EA40', sil: 'sil_ryuji', img: { x: 26, y: -4, w: 76, h: 86 }, me: '我', own: '晨跑完腿还在抖，不过超爽的！',
    prompt: '你是坂本龙司——《女神异闻录5》怪盗团的一员，秀尽学园二年级，前田径部王牌。性格：冲动热血、直来直去、讲义气。' },
];
export const charOf = (k: string) => CHARS.find((c) => c.key === k) ?? CHARS[0];
export const ATTR_CN: Record<string, string> = { knowledge: '知识', guts: '胆量', dexterity: '灵巧', kindness: '温柔', charm: '魅力' };

/* ── 头像盒（P5 IM 三层斜四边形：黑 → 白 → 角色色；立绘越出顶边） ── */
export function Avatar({ c, size = '', photo, fresh = false, style }: { c: ChatChar; size?: '' | 'sm' | 'xs'; photo?: string; fresh?: boolean; style?: CSSProperties }) {
  const id = 'avc' + useId().replace(/:/g, '');
  const ref = useRef<HTMLDivElement>(null);
  const im = c.img;
  useLayoutEffect(() => {
    if (!fresh || !ref.current) return;
    // 参考时序：底框 0.6→1（300ms easeOutBack）；立绘 160ms 后 0.8→1（150ms）
    anim(ref.current.querySelector('.nv-bg'), [{ transform: 'scale(.6)' }, { transform: 'scale(1)' }], { duration: 300, easing: EASE_BACK, fill: 'backwards' });
    anim(ref.current.querySelector('.nv-fg'), [{ transform: 'scale(0)' }, { transform: 'scale(0)', offset: 0.5156 }, { transform: 'scale(.8)', offset: 0.5157 }, { transform: 'scale(1)' }], { duration: 310, easing: 'linear', fill: 'backwards' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div ref={ref} className={cx('avatar', size)} aria-hidden="true" style={style}>
      <svg viewBox="0 0 110 90" preserveAspectRatio="none">
        <defs><clipPath id={id}><polygon points="10.3,-14 114.7,-14 114.7,65.6 40,76.6" /></clipPath></defs>
        <g className="nv-bg" style={{ transformBox: 'view-box', transformOrigin: '55px 50px' }}>
          <polygon points="0,17 100.5,27.2 110,72.7 33.4,90" fill="#000" />
          <polygon points="16.4,20.5 96.7,30.4 106.4,70 37.8,80.4" fill="#fff" />
          <polygon points="22.5,28 94.4,31.4 104.3,67.5 40,76.6" fill={c.color} />
        </g>
        <g clipPath={`url(#${id})`}><g className="nv-fg" style={{ transformBox: 'view-box', transformOrigin: '62px 92px' }}>
          {photo
            ? <image href={photo} x="20" y="-6" width="96" height="84" preserveAspectRatio="xMidYMid slice" />
            : <image href={chatImg(c.sil)} x={im.x} y={im.y} width={im.w} height={im.h} preserveAspectRatio="xMidYMax meet" />}
        </g></g>
      </svg>
    </div>
  );
}

/* ── 窗内 toast（v3：.toast 挂在 .app 里，1.9s 自毁） ── */
export const chatToast = (t: string) => window.dispatchEvent(new CustomEvent('nvw-toast', { detail: t }));
export function ChatToasts() {
  const [list, setList] = useState<{ id: number; t: string }[]>([]);
  useEffect(() => {
    let n = 0;
    const on = (e: Event) => { const id = ++n; setList((l) => [...l, { id, t: (e as CustomEvent<string>).detail }]); setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 1900); };
    window.addEventListener('nvw-toast', on); return () => window.removeEventListener('nvw-toast', on);
  }, []);
  return <>{list.map((x) => <div key={x.id} className={cx('toast')}>{x.t}</div>)}</>;
}

/* ── 面板骨架（奶白纸纹斜切卡 + 黑硬影 8/9px；入场 translateY 70 + -3° + .92 → 1，320ms easeOutBack） ── */
export function ChatSheet({ title, ghost, children, foot, onClose }: { title: string; ghost: string; children: ReactNode; foot?: ReactNode; onClose: () => void }) {
  const veil = useRef<HTMLDivElement>(null), sh = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    anim(veil.current, [{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
    anim(sh.current, [{ transform: 'translateY(70px) rotate(-3deg) scale(.92)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: EASE_BACK });
  }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.oa-layer,.ob-dlg-veil')) { e.stopPropagation(); onClose(); } }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div ref={veil} className={cx('sheet-veil')} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={sh} className={cx('sheet')} role="dialog" aria-modal="true" aria-label={title}>
        <div className={cx('ghost-word')} aria-hidden="true">{ghost}</div>
        <div className={cx('sheet-head')}><span className={cx('t')}>{title}</span><button className={cx('x')} aria-label="关闭" onClick={onClose}>✕</button></div>
        <div className={cx('sheet-body')}>{children}</div>
        {foot}
      </div>
    </div>
  );
}

export function Toggle({ label, sub, on: init = true, onChange }: { label: string; sub?: ReactNode; on?: boolean; onChange?: (v: boolean) => void }) {
  const [on, setOn] = useState(init);
  return (
    <button type="button" role="switch" aria-checked={on} className={cx('toggle', on && 'on')} onClick={() => { setOn(!on); onChange?.(!on); }}>
      <span className={cx('tx')}>{label}{sub ? <small>{sub}</small> : null}</span><span className={cx('sw')} />
    </button>
  );
}

/** 窗口壳：舞台背景（红底泼墨 + 墨点漂移）。独立预览 NavigatorNotebook / NavigatorActionForm 时也用它包一层，保证样式作用域。 */
export function ChatStage() {
  return <div className={cx('stage-bg')}><img className={cx('splat')} src={chatImg('bg_red')} alt="" /><div className={cx('dots')} /></div>;
}
