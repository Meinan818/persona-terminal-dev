/**
 * NavigatorWindow 助手对话窗（真实 src/components/navigator/NavigatorWindow.tsx 的 p5 渲染；视觉 / 时序 = v3 chat/（P5 IM 1:1 复刻）。
 * 登记为 overlays['assistant-window'] 后，底栏中键短按 / 侧栏「助手」自动打开它（AppShell 读注册表）。
 *
 * 结构：会话列表（= 人格切换的新位置，手机两屏切换 / 桌面横屏左列表右会话）→ 会话页：页头黑牌（头像 → 人格菜单 / 名字 / 「自己的一天」小状态）
 *   → 记录（对方气泡 白框黑面 / 己方气泡 黑框白面 / 连接黑带 / 时间戳 / 「早前的对话已收进记忆」/ 确认卡 / ！？贴纸）→ 递刀纸条 → 快捷 chips → 输入栏（📷 / 🎤 / SEND）。
 * 面板：动作表单（NavigatorActionForm，含 P1-17 修改待办）/ 完成任务拣选 / 记事本（NavigatorNotebook，删除走 ConfirmDialog）；「更多设置…」= 关窗 + 去设置页（真实）。
 * 头像上传：选图 → 裁切（ImageCropDialog 步骤位，P1-17 新补）→ 同 id 影子行覆盖内置。
 *
 * 直达（每个子状态一条路由参数）：
 *   ?view=list 会话列表（手机）· ?thread=ann|ryuji · ?menu=persona 人格菜单 · ?demo=card 动作确认卡 · ?demo=play 自动播放示例
 *   ?sheet=complete 拣选 · ?sheet=notebook 记事本 · ?form=activity|todo|editTodo|ledger|bigdeal 表单
 *   ?state=typing 打字中 · ?state=recording 录音中 · ?state=transcribing 转写中 · ?state=stuck 递刀纸条 · ?crop=1 头像裁切
 * 低动效：入场直接终态、打字点常亮、转场 / 迸星关闭。
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { OverlayProps } from '@/p5r-red/registry/types';
import { usePrefs, isLowMotion } from '@/p5r-red/lib/prefs';
import { navigate, openOverlay } from '@/p5r-red/shell/shellBus';
import { ObCrop } from './ObKit';
import { cx, CHARS, charOf, Avatar, ChatToasts, chatToast, ChatSheet, ChatStage, chatImg, anim, EASE_BACK, sleep, hhmm, pts, playMsg, ATTR_CN, type ChatChar } from './NavigatorChatKit';
import { ActionFormSheet, KIND, previewLines, type Draft, type DraftKind } from './NavigatorActionForm.p5r';
import { NotebookSheet } from './NavigatorNotebook.p5r';
import { useAppStore, toLocalDateKey } from '@/store';
import { useNavigatorStore, type NavigatorMessage } from '@/store/navigator';
import { executeDraft, type NavigatorDraft } from '@/utils/navigatorRegistry';
import { useBackHandler } from '@/utils/useBackHandler';
import type { Todo } from '@/types';

/* ── 数据 ── */
interface Msg { id: string; role: 'cat' | 'user' | 'summary' | 'card'; text?: string; img?: string; at: number; draft?: Draft; status?: 'pending' | 'done' | 'cancelled'; busy?: boolean; receipt?: string; fresh?: boolean; from?: DOMRect | null }
let uid = 0; const nid = () => `m${++uid}`;
const NOW = Date.now(); const T = (minAgo: number) => NOW - minAgo * 60000;
const seedThreads = (): Record<string, Msg[]> => ({
  morgana: [
    { id: nid(), role: 'summary', text: '聊过这周的复习计划：每天先做最难的一科；周五有面试，记得问结果。', at: T(1500) },
    { id: nid(), role: 'cat', text: '昨天的行动报告吾辈看过了。三件事完成两件，还算及格。', at: T(1440) },
    { id: nid(), role: 'user', text: '今天继续！', at: T(1438) },
  ],
  ann: [
    { id: nid(), role: 'cat', text: '嘿！今天放学去吃可丽饼吗？新出了草莓芝士的！', at: T(190) },
    { id: nid(), role: 'user', text: '下次一定', at: T(185) },
    { id: nid(), role: 'cat', text: '又是下次！……好吧，那你答应我，周末一定要出来透透气哦。', at: T(184) },
    { id: nid(), role: 'cat', text: '别一个人憋着，有什么事都可以跟我说！', at: T(184) },
  ],
  ryuji: [
    { id: nid(), role: 'cat', text: '喂喂！听说你今天跑了五公里？超赞的啊！', at: T(60 * 26) },
    { id: nid(), role: 'cat', text: '下次叫上我！前田径部王牌可不是吹的！', at: T(60 * 26) },
    { id: nid(), role: 'user', text: '你先把作业补完再说吧', at: T(60 * 26 - 2) },
    { id: nid(), role: 'cat', text: '呃……这、这个就别提了吧！', at: T(60 * 26 - 3) },
  ],
});
const emptyThreads = (): Record<string, Msg[]> => Object.fromEntries(CHARS.map((c) => [c.key, []]));
const toThreadMessage = (m: NavigatorMessage): Msg => {
  if (m.role === 'summary') return { id: m.id, role: 'summary', text: m.text, at: m.createdAt };
  if (m.role === 'card') return { id: m.id, role: 'card', draft: m.draft as Draft | undefined, status: m.cardStatus, receipt: m.receipt, at: m.createdAt };
  return { id: m.id, role: m.role, text: m.text, img: m.imageDataUrl, at: m.createdAt };
};
const SCRIPT: ({ t: 'typing'; ms: number } | { t: 'cat'; text: string } | { t: 'user'; text: string } | { t: 'card'; draft: Draft })[] = [
  { t: 'typing', ms: 900 }, { t: 'cat', text: '喂，你回来了啊。今天的情报，吾辈都替你整理好了。' },
  { t: 'typing', ms: 700 }, { t: 'cat', text: '清单上还剩两件事没动。先解决哪个？' },
  { t: 'user', text: '先写报告吧……但我有点不想动。' },
  { t: 'typing', ms: 1200 }, { t: 'cat', text: '哼，就知道你会这么说。那就先写开头三百字，剩下的明天再说。' },
  { t: 'card', draft: { kind: 'todo', title: '报告开头三百字', attribute: 'knowledge', points: 2, repeatDaily: false, deadline: '' } },
  { t: 'typing', ms: 800 }, { t: 'cat', text: '还有——今天也早点睡吧。吾辈可不是在关心你，只是怕明天的行动出岔子。' },
  { t: 'user', text: '知道啦。话说你真的不是猫吗？' },
  { t: 'typing', ms: 600 }, { t: 'cat', text: '吾辈才不是猫！' },
  { t: 'typing', ms: 900 }, { t: 'cat', text: '……总之，写完记得跟吾辈说一声？' },
];
const STUCK_RE = /卡住|卡在|拖延|不想动|动不了|做不下去|没动力|不知道从哪/;
const markOf = (t = '') => (/[?？]\s*$/.test(t) ? 'q' : /[!！]\s*$/.test(t) ? 'e' : null);
const listTime = (t?: number) => { if (!t) return ''; const d = new Date(t); return d.toDateString() === new Date().toDateString() ? hhmm(t) : `${d.getMonth() + 1}/${d.getDate()}`; };
const useDesktop = () => {
  const q = '(min-width:1024px) and (min-aspect-ratio:5/4)';
  const [m, setM] = useState(() => matchMedia(q).matches);
  useEffect(() => { const mq = matchMedia(q); const f = () => setM(mq.matches); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f); }, []);
  return m;
};

/* ── 贴纸 ── */
const QMark = () => (<svg className={cx('mark')} viewBox="0 0 51 68"><path fill="#fff" d="M0,23.425L8.81,4.146L34,0L50.48,14.096L46.96,37.417L32.86,49.233L24.88,67.268L2.39,61.464L6.43,40.838L13.17,28.607L0,23.425Z" /><path d="M9.64,17.931C10.04,14.373 15.86,7.255 25.24,7.255C37.42,7.255 44.78,15.029 44.78,22.699C44.78,30.369 37.32,36.484 32.86,37.625C28.4,38.765 26.21,40.631 25.630,44.777L14.35,40.876C14.98,37.503 17.71,32.856 20.14,31.103C24.49,27.973 31.13,28.86 31.13,22.67C31.13,21.07 29.15,17.679 25.71,17.679C21,17.679 19.76,22.583 19.59,23.609L9.64,17.931Z" /><path d="M12.32,46.424L25.24,50.284L21.6,61.831L8.77,58.231L12.32,46.424Z" /></svg>);
const EMark = () => (<svg className={cx('mark')} viewBox="0 0 51 68"><path fill="#fff" d="M10,2L44,0L40,44L30,48L34,66L10,68L12,48L18,44Z" /><path fill="#D7000F" d="M16,7L38,6L33,40L21,41Z" /><path fill="#D7000F" d="M17,49L30,49L29,61L16,62Z" /></svg>);

/* ── 气泡几何（P5 IM：对方 = 白外框 + 黑内面 + 白字；己方 = 黑外框 + 白内面 + 黑字），px 锚定 ── */
const stemY = (textH: number, avH: number) => (textH + 4 > avH ? avH - 16 : textH - 5);
function drawShape(bub: HTMLElement, side: 'l' | 'r', fresh: boolean, delay = 0) {
  const w = bub.offsetWidth, hh = bub.offsetHeight; if (!w || !hh) return;
  const svg = bub.querySelector('svg.nv-shape') as SVGSVGElement | null; if (!svg) return;
  if (svg.dataset.w === String(w) && svg.dataset.h === String(hh)) return;
  svg.dataset.w = String(w); svg.dataset.h = String(hh);
  svg.setAttribute('width', String(w)); svg.setAttribute('height', String(hh)); svg.setAttribute('viewBox', `0 0 ${w} ${hh}`);
  if (side === 'l') {
    const vo = stemY(hh, 90), pivot = `32.4px ${vo}px`;
    svg.innerHTML = `<g class="nv-box" style="transform-box:view-box;transform-origin:${pivot}"><polygon fill="#fff" points="${pts([[31.7, 3.1], [w, 0], [w - 23, hh], [15.6, hh - 8]])}"/></g>
      <polygon fill="#fff" points="${pts([[0, vo - 19.2], [19.5, vo - 37.2], [20.8, vo - 31.5], [32.4, vo - 39.3], [30.6, vo - 15.8], [11.7, vo - 12.6], [10, vo - 20]])}"/>
      <polygon fill="#000" points="${pts([[4.6, vo - 22.2], [17, vo - 33.2], [19.3, vo - 28.1], [34.4, vo - 36.5], [34, vo - 21.4], [14.4, vo - 18.6], [12.8, vo - 25.4]])}"/>
      <g class="nv-box" style="transform-box:view-box;transform-origin:${pivot}"><polygon fill="#000" points="${pts([[33, 7.7], [w - 13, 3.7], [w - 25.7, hh - 4.6], [20.4, hh - 12]])}"/></g>`;
  } else {
    const vo = hh;
    svg.innerHTML = `<g class="nv-box" style="transform-box:view-box;transform-origin:${w}px ${hh / 2}px">
      <polygon fill="#000" points="${pts([[0, 0], [w - 35, 4], [w - 10.7, hh - 6.6], [35.5, hh]])}"/>
      <polygon fill="#000" points="${pts([[w - 37.6, vo - 42.3], [w - 20.8, vo - 30.2], [w - 19.4, vo - 36.8], [w, vo - 19.6], [w - 10.3, vo - 19.6], [w - 12, vo - 12.3], [w - 27.6, vo - 15.2]])}"/>
      <polygon fill="#fff" points="${pts([[w - 33.1, vo - 33.2], [w - 19.3, vo - 26.3], [w - 16.4, vo - 31.6], [w - 4.2, vo - 21], [w - 12.4, vo - 23.4], [w - 14, vo - 17.2], [w - 28.6, vo - 21.2]])}"/>
      <polygon fill="#fff" points="${pts([[12, 5], [w - 36, 9.5], [w - 16.4, hh - 11.7], [36.5, hh - 3.5]])}"/></g>`;
  }
  // 参考：messageHorizontalScale 0.3→1 / Vertical 0.8→1，180ms easeOutBack（轴心在茎）
  if (fresh) svg.querySelectorAll('.nv-box').forEach((g) => anim(g, [{ transform: 'scale(.3,.8)' }, { transform: 'scale(1,1)' }], { duration: 180, delay, easing: EASE_BACK, fill: 'backwards' }));
}
function Bubble({ side, text, img, fresh, from }: { side: 'l' | 'r'; text?: string; img?: string; fresh?: boolean; from?: DOMRect | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const b = ref.current!; drawShape(b, side, !!fresh, from ? 120 : 0);
    const txt = b.querySelector('.nv-txt');
    if (fresh && side === 'r' && from) {
      // 发送：气泡从发送键处飞出（缩小 + 反向倾斜 → 过冲落位），随后 P5 原生的横向拍开
      const r = b.getBoundingClientRect();
      const dx = from.left + from.width / 2 - (r.left + r.width / 2), dy = from.top + from.height / 2 - (r.top + r.height / 2);
      anim(b, [{ transform: `translate(${dx}px,${dy}px) scale(.22) rotate(-14deg)`, opacity: 0 }, { transform: `translate(${dx * 0.35}px,${dy * 0.35}px) scale(.7) rotate(-6deg)`, opacity: 1, offset: 0.35 }, { transform: 'translate(0,0) scale(1.06) rotate(1.5deg)', offset: 0.78 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });
      anim(txt, [{ opacity: 0 }, { opacity: 1 }], { duration: 130, delay: 220, fill: 'backwards' });
    } else if (fresh) {
      anim(txt, [{ opacity: 0 }, { opacity: 1 }], { duration: 130, delay: 100, fill: 'backwards' });
      anim(b.querySelector('.nv-mark'), [{ transform: 'scale(.4)' }, { transform: 'scale(1)' }], { duration: 100, delay: 130, easing: EASE_BACK, fill: 'backwards' });
    }
    const ro = new ResizeObserver(() => drawShape(b, side, false)); ro.observe(b);
    return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const mk = side === 'l' ? markOf(text) : null;
  return (
    <div ref={ref} className={cx('bub')} data-side={side}>
      <svg className={cx('shape')} />
      {img && <img className={cx('shot txt')} src={img} alt="发送的图片" />}
      {text ? <span className={cx('txt')}>{text}</span> : null}
      {mk === 'q' ? <QMark /> : mk === 'e' ? <EMark /> : null}
    </div>
  );
}

function CardRow({ m, c, photo, onConfirm, onEdit, onCancel }: { m: Msg; c: ChatChar; photo?: string; onConfirm: () => void; onEdit: () => void; onCancel: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { if (m.fresh) anim(ref.current, [{ transform: 'translateY(40px) rotate(-6deg) scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: EASE_BACK, fill: 'backwards' }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const d = m.draft!, meta = KIND[d.kind];
  return (
    <div className={cx('row card')} data-id={m.id} data-anchor="card">
      <div ref={ref} className={cx('card-box', m.status === 'cancelled' && 'cancelled')}>
        <div className={cx('ttl')}><span>{meta.icon}</span><span className={cx('kind')}>{meta.label}</span>
          {m.status === 'done' && <span className={cx('done-stamp')}>已记录 ✓</span>}
          {m.status === 'cancelled' && <span className={cx('cancel-note')}>已取消</span>}</div>
        {previewLines(d).map((l, i) => <p key={i} className={cx(i === 0 ? 'l0' : 'sub')}>{l}</p>)}
        {m.status === 'pending' && (
          <div className={cx('btns')}>
            <button type="button" className={cx('p5btn')} onClick={onConfirm}>{m.busy ? '记录中…' : '✓ 确认'}</button>
            <button type="button" className={cx('p5btn ink')} onClick={onEdit}>编辑</button>
            <button type="button" className={cx('p5btn ghost')} onClick={onCancel}>取消</button>
          </div>
        )}
        {m.status === 'done' && m.receipt && <div className={cx('receipt')}><Avatar c={c} size="xs" photo={photo} /><span>{m.receipt}</span></div>}
      </div>
    </div>
  );
}

/** 打字中：暗红锯齿泡 + 红点依次亮（300/300/300 亮，400/100/100 灭——参考 DotsState） */
function Typing() {
  const ref = useRef<HTMLDivElement>(null);
  const rot = useMemo(() => -6 + Math.random() * 18, []);
  const [dots, setDots] = useState([0, 0, 0]);
  useEffect(() => {
    if (isLowMotion()) { setDots([1, 1, 1]); return; }
    anim(ref.current?.querySelector('svg'), [{ transform: `rotate(${rot}deg) scale(0)` }, { transform: `rotate(${rot}deg) scale(0)`, offset: 0.608 }, { transform: `rotate(${rot}deg) scale(.6)`, offset: 0.609 }, { transform: `rotate(${rot}deg) scale(1)` }], { duration: 296, easing: 'linear', fill: 'backwards' });
    const seq: [number, number, number][] = [[300, 0, 1], [300, 1, 1], [300, 2, 1], [400, 0, 0], [100, 1, 0], [100, 2, 0]];
    let i = 0, t: ReturnType<typeof setTimeout>;
    const tick = () => { const [ms, k, v] = seq[i % seq.length]; t = setTimeout(() => { setDots((d) => d.map((x, j) => (j === k ? v : x))); i++; tick(); }, ms); };
    tick(); return () => clearTimeout(t);
  }, [rot]);
  return (
    <div ref={ref} className={cx('typing')} role="status" aria-label="助手正在输入">
      <svg viewBox="0 0 230 116" style={{ transform: `rotate(${rot.toFixed(1)}deg)` }}>
        <path fill="#6C0100" d="M0,113.32L57.06,69.28L62.57,81.2L71.44,68.68L58.43,34.59L222.6,0L229.6,98.05L88.69,115.1L84.25,102.98L52.92,114.9L47.89,95.68L0,113.32Z" />
        <g fill="#C41001" transform="translate(112 50) scale(2.6)">
          <path opacity={dots[0]} d="M2.97,0C5.74,0 6.23,2.2 6.23,3.92C6.23,5.63 4.37,6.12 3.13,6.12C1.49,6.12 0,4.93 0,3.29C0,1.64 1.240,0 2.97,0Z" />
          <path opacity={dots[1]} transform="translate(12 0)" d="M2.97,0C5.2,0 6.05,1.89 6.05,3.31C6.05,4.73 4.61,5.99 3.06,5.99C1.51,5.99 0,4.64 0,3.33C0,2.03 1.17,0 2.97,0Z" />
          <path opacity={dots[2]} transform="translate(24 0)" d="M3.11,0C4.7,0 6.01,2.03 6.01,3.31C6.01,4.59 4.61,5.65 3.08,5.65C1.55,5.65 0,4.48 0,3.11C0,1.73 1.1,0 3.11,0Z" />
        </g>
      </svg>
    </div>
  );
}

/* ── 连接黑带（P5 IM 招牌：每条消息之间一条粗黑斜带；新消息到来时 180ms 伸过去） ── */
function rand(seed: number) { let s = seed; return (a: number, b: number) => { s = (s * 16807) % 2147483647; return a + ((s - 1) / 2147483646) * (b - a); }; }
function drawLines(inner: HTMLElement, svg: SVGSVGElement, geo: Map<string, { w: number; shift: number }>, growing: { toId: string; t0: number } | null): boolean {
  const rows = Array.from(inner.querySelectorAll<HTMLElement>('.nv-row[data-anchor]'));
  const last = rows[rows.length - 1];
  svg.setAttribute('width', String(inner.clientWidth));
  svg.setAttribute('height', String(last ? last.offsetTop + last.offsetHeight + 40 : 0));
  const anchor = (row: HTMLElement, idx: number) => {
    const id = row.dataset.id!;
    if (!geo.has(id)) { const r = rand([...id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) % 2147483646 + 1); const w = r(44, 60); geo.set(id, { w, shift: idx > 0 ? r(16, 48) * (idx % 2 === 0 ? 1 : -1) : 0 }); }
    const g = geo.get(id)!; const x0 = row.offsetLeft, y0 = row.offsetTop, W = row.offsetWidth;
    let cx_: number, cy: number;
    if (row.dataset.anchor === 'entry') { const av = row.querySelector<HTMLElement>('.nv-avatar')!; cx_ = x0 + av.offsetLeft + av.offsetWidth / 2 + g.shift; cy = y0 + av.offsetTop + av.offsetHeight / 2; }
    else if (row.dataset.anchor === 'reply') { cx_ = x0 + W - 60; cy = y0 + 28; }
    else { cx_ = x0 + W / 2 + g.shift * 0.5; cy = y0 + row.offsetHeight / 2; }
    return { l: [cx_ - g.w / 2, cy], r: [cx_ + g.w / 2, cy] };
  };
  const segs: string[] = []; let more = false;
  for (let i = 0; i < rows.length - 1; i++) {
    const a = anchor(rows[i], i), b = anchor(rows[i + 1], i + 1);
    let p = 1;
    if (growing && growing.toId === rows[i + 1].dataset.id && !isLowMotion()) { p = Math.min(1, (performance.now() - growing.t0) / 180); if (p < 1) more = true; }
    const bl = [a.l[0] + (b.l[0] - a.l[0]) * p, a.l[1] + (b.l[1] - a.l[1]) * p], br = [a.r[0] + (b.r[0] - a.r[0]) * p, a.r[1] + (b.r[1] - a.r[1]) * p];
    segs.push(pts([a.l, a.r, br, bl]));
  }
  svg.innerHTML = `<defs><filter id="nvlnblur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter></defs>
    <g transform="translate(0 16)" filter="url(#nvlnblur)" opacity=".5">${segs.map((s) => `<polygon points="${s}" fill="#000"/>`).join('')}</g>
    <g>${segs.map((s) => `<polygon points="${s}" fill="#000"/>`).join('')}</g>`;
  return more;
}

/* ═════════════════════════════════════════════════════════════════ */
type SheetReq = null | { t: 'notebook' } | { t: 'picker' } | { t: 'form'; kind: DraftKind; cardId?: string };

export default function NavigatorWindow({ open, onClose, params }: OverlayProps) {
  const q = params ?? new URLSearchParams();
  const prefs = usePrefs();
  const desktop = useDesktop();
  const navMessages = useNavigatorStore((s) => s.messages);
  const navPhase = useNavigatorStore((s) => s.phase);
  const activePresetId = useAppStore((s) => s.settings.navigatorPresetId);
  const todos = useAppStore((s) => s.todos);
  const activeKey = CHARS.find((ch) => ch.id === activePresetId)?.key ?? 'morgana';
  const initialKey = q.get('thread') && CHARS.some((ch) => ch.key === q.get('thread')) ? q.get('thread')! : activeKey;
  const [threads, setThreads] = useState(emptyThreads);
  const [current, setCurrent] = useState(initialKey);
  const [view, setView] = useState<'list' | 'chat'>(q.get('view') === 'list' ? 'list' : 'chat');
  const [typing, setTyping] = useState(q.get('state') === 'typing');
  const [menu, setMenu] = useState(q.get('menu') === 'persona');
  const [sheet, setSheet] = useState<SheetReq>(() => {
    const s = q.get('sheet'), f = q.get('form');
    if (f && f in KIND && f !== 'completeTodo') return { t: 'form', kind: f as DraftKind };
    if (s === 'complete') return { t: 'picker' }; if (s === 'notebook') return { t: 'notebook' };
    return null;
  });
  const [input, setInput] = useState(q.get('state') === 'stuck' ? '报告一直卡住，不想动' : '');
  const [shot, setShot] = useState<string | null>(null);
  const [stuckText, setStuckText] = useState<string | null>(null);
  const [stuckDismissed, setStuckDismissed] = useState<string | null>(null);
  const [mic, setMic] = useState<'idle' | 'rec' | 'tr' | 'cancel'>(q.get('state') === 'recording' ? 'rec' : q.get('state') === 'transcribing' ? 'tr' : 'idle');
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [ownOpen, setOwnOpen] = useState(false);
  const [crop, setCrop] = useState<{ key: string; src?: string } | null>(q.get('crop') ? { key: 'morgana' } : null);
  const [wiping, setWiping] = useState(false);
  const txRef = useRef<HTMLDivElement>(null), innerRef = useRef<HTMLDivElement>(null), linesRef = useRef<SVGSVGElement>(null), sendRef = useRef<HTMLButtonElement>(null);
  const camRef = useRef<HTMLInputElement>(null), avRef = useRef<HTMLInputElement>(null), avTarget = useRef<string | null>(null);
  const geo = useRef(new Map<string, { w: number; shift: number }>()), growing = useRef<{ toId: string; t0: number } | null>(null);
  const token = useRef(0);
  const curRef = useRef(current); curRef.current = current;
  const c = charOf(current);
  const msgs = threads[current];
  const showTyping = typing || navPhase === 'collecting' || navPhase === 'thinking';

  /* 连接带：每次渲染后重画（新消息伸展用 rAF 续画） */
  const redraw = useCallback(() => {
    const inner = innerRef.current, svg = linesRef.current; if (!inner || !svg) return;
    const step = () => { if (drawLines(inner, svg, geo.current, growing.current)) requestAnimationFrame(step); else growing.current = null; };
    requestAnimationFrame(step);
  }, []);
  useLayoutEffect(() => { redraw(); });
  useEffect(() => { const inner = innerRef.current; if (!inner) return; const ro = new ResizeObserver(redraw); ro.observe(inner); addEventListener('resize', redraw); return () => { ro.disconnect(); removeEventListener('resize', redraw); }; }, [redraw, open]);

  const smoothBottom = useCallback(() => {
    const tx = txRef.current; if (!tx) return;
    if (isLowMotion()) { tx.scrollTop = tx.scrollHeight; return; }
    const from = tx.scrollTop, t0 = performance.now();
    const step = (t: number) => { const to = tx.scrollHeight - tx.clientHeight, k = Math.min(1, (t - t0) / 280); tx.scrollTop = from + (to - from) * (1 - Math.pow(1 - k, 3)); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }, []);
  useEffect(() => {
    if (q.get('demo') === 'play' || charOf(current).id !== activePresetId) return;
    setThreads((all) => ({ ...all, [current]: navMessages.map(toThreadMessage) }));
    requestAnimationFrame(smoothBottom);
  }, [navMessages, activePresetId, current, smoothBottom]); // eslint-disable-line react-hooks/exhaustive-deps
  // 切会话：贴底、重置连接带锚
  useLayoutEffect(() => { geo.current = new Map(); const tx = txRef.current; if (tx) tx.scrollTop = tx.scrollHeight; setStuckText(null); setStuckDismissed(null); }, [current]);

  const push = useCallback((m: Msg, key = curRef.current) => {
    setThreads((t) => ({ ...t, [key]: [...t[key].map((x) => (x.fresh ? { ...x, fresh: false, from: null } : x)), { ...m, fresh: true }] }));
    growing.current = { toId: m.id, t0: performance.now() };
    if (m.role === 'cat') playMsg('in');
    requestAnimationFrame(smoothBottom);
  }, [smoothBottom]);
  const patchMsg = (id: string, p: Partial<Msg>) => setThreads((t) => ({ ...t, [current]: t[current].map((x) => (x.id === id ? { ...x, ...p, fresh: false } : x)) }));

  /* 斜切转场（红 → 奶白 → 黑三道 -18° 斜刀，620ms；中点 260ms 换内容） */
  const wipe = useCallback(async (mid?: () => void) => {
    if (isLowMotion()) { mid?.(); return; }
    setWiping(false); await sleep(16); setWiping(true);
    await sleep(260); mid?.(); await sleep(400); setWiping(false);
  }, []);
  const openThread = (k: string) => {
    setMenu(false);
    if (k === current && (desktop || view === 'chat')) return;
    token.current++;
    setTyping(false);
    const next = charOf(k);
    void wipe(() => { setCurrent(k); setView('chat'); });
    void useNavigatorStore.getState().switchPreset(next.id).then(() => useNavigatorStore.getState().greet());
  };
  const backToList = () => void wipe(() => setView('list'));
  useBackHandler(open, () => {
    if (crop) { setCrop(null); return; }
    if (sheet) { setSheet(null); return; }
    if (menu) { setMenu(false); return; }
    if (!desktop && view === 'chat') { backToList(); return; }
    onClose();
  });

  /* 打开即问候（真实 greet）；?demo=play 自动播放示例；?demo=card 动作确认卡 */
  useEffect(() => {
    if (!open) return;
    const tok = ++token.current;
    const demo = q.get('demo'), st = q.get('state');
    if (demo === 'card') { push({ id: nid(), role: 'card', draft: { kind: 'todo', title: '报告开头三百字', attribute: 'knowledge', points: 2, repeatDaily: false, deadline: '' }, status: 'pending', at: Date.now() }); return; }
    if (demo === 'play') { void autoplay(tok); return; }
    if (st || q.get('sheet') || q.get('form') || q.get('menu') || q.get('view') || q.get('crop')) return;
    void useNavigatorStore.getState().switchPreset(charOf(curRef.current).id)
      .then(() => useNavigatorStore.getState().greet());
    return () => { token.current++; };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function typeInto(text: string, tok: number) { for (const ch of text) { if (tok !== token.current) return false; setInput((v) => v + ch); await sleep(55); } await sleep(250); return tok === token.current; }
  async function autoplay(tok: number) {
    setCurrent('morgana'); setView('chat'); setThreads((t) => ({ ...t, morgana: seedThreads().morgana }));
    await sleep(900);
    for (const st of SCRIPT) {
      if (tok !== token.current) return;
      if (st.t === 'typing') { setTyping(true); await sleep(st.ms); setTyping(false); }
      else if (st.t === 'cat') { push({ id: nid(), role: 'cat', text: st.text, at: Date.now() }, 'morgana'); await sleep(650); }
      else if (st.t === 'user') { if (!(await typeInto(st.text, tok))) return; doSend(st.text, true); await sleep(500); }
      else { push({ id: nid(), role: 'card', draft: st.draft, status: 'pending', at: Date.now() }, 'morgana'); await sleep(900); }
    }
  }

  /* 发送（仲裁器语义：连续发话在 900ms 收口窗口内合并成一轮，窗口过了才开始「思考」） */
  function burst() {
    const btn = sendRef.current; if (!btn || isLowMotion()) return;
    const b = document.createElement('span'); b.className = 'nv-burst';
    b.innerHTML = `<img class="nv-ring" src="${chatImg('starburst_cream')}" alt="">` + Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + Math.random() * 0.4, dist = 40 + Math.random() * 36, s = 7 + Math.random() * 9;
      return `<span class="nv-shard" style="width:${s}px;height:${s * 1.6}px;background:${['#F2E9DA', '#D7000F', '#111111'][i % 3]};box-shadow:0 0 0 1px #111;--dx:${Math.cos(a) * dist}px;--dy:${Math.sin(a) * dist}px;--r:${Math.round(a * 57 + 180)}deg"></span>`;
    }).join('');
    btn.append(b); setTimeout(() => b.remove(), 650);
    anim(btn, [{ transform: 'scale(1)' }, { transform: 'scale(.86) rotate(-6deg)' }, { transform: 'scale(1.08) rotate(3deg)' }, { transform: 'none' }], { duration: 300, easing: 'ease-out' });
  }
  function doSend(textOverride?: string, scripted = false) {
    const text = (textOverride ?? input).trim();
    if (!text && !shot) return;
    const rect = sendRef.current?.getBoundingClientRect() ?? null;
    burst(); playMsg('out');
    if (scripted) {
      push({ id: nid(), role: 'user', text, img: shot || undefined, at: Date.now(), from: rect });
    } else {
      useNavigatorStore.getState().userSend(text, shot || undefined);
    }
    if (text && STUCK_RE.test(text)) setStuckText(text);
    setInput(''); setShot(null);
  }
  useEffect(() => { if (showTyping) smoothBottom(); }, [showTyping, smoothBottom]);

  const stuckShown = (STUCK_RE.test(input) ? input.trim() : stuckText);
  const runStuck = (t: string) => {
    setStuckDismissed(t); setStuckText(null);
    useNavigatorStore.getState().pushCard({
      kind: 'bigdeal',
      title: t.replace(/[，。！？,.!?].*$/, '').slice(0, 16) || '眼前这件事',
      attribute: 'guts',
      points: 2,
      currentState: t,
      deadline: '',
      steps: ['打开文档，只写标题', '列三个小标题', '先写最熟的那一段'],
    });
  };
  const confirmCard = async (m: Msg) => {
    patchMsg(m.id, { busy: true }); await sleep(500);
    const d = m.draft!;
    const live = useNavigatorStore.getState().messages.some((item) => item.id === m.id);
    if (live) {
      try {
        const receipt = await executeDraft(d as NavigatorDraft);
        useNavigatorStore.getState().updateCard(m.id, { cardStatus: 'done', receipt });
        patchMsg(m.id, { busy: false, status: 'done', receipt });
        playMsg('in');
      } catch (error) {
        const receipt = `执行失败：${error instanceof Error ? error.message : '请重试'}`;
        useNavigatorStore.getState().updateCard(m.id, { cardStatus: 'pending', receipt });
        patchMsg(m.id, { busy: false, status: 'pending', receipt });
      }
      return;
    }
    const store = useAppStore.getState();
    try {
      if (d.kind === 'activity') {
        await store.addActivity(String(d.text ?? '').trim() || '一件小事', d.points ?? {}, 'local', { important: !!d.important });
      } else if (d.kind === 'todo') {
        await store.addTodo({ title: d.title, attribute: d.attribute, points: d.points, frequency: 'single', repeatDaily: !!d.repeatDaily, isActive: true, deadline: d.deadline || undefined });
      } else if (d.kind === 'ledger') {
        await store.addLedgerEntry({ direction: d.direction === 'income' ? 'income' : 'expense', amount: Number(d.amount), type: d.direction === 'income' ? undefined : d.type, note: d.note || undefined, date: toLocalDateKey(), source: 'ai', channel: d.channel || undefined, incomeType: d.direction === 'income' ? d.incomeType : undefined });
      } else if (d.kind === 'completeTodo') {
        const todo = store.todos.find((t) => t.id === d.todoId) ?? store.todos.find((t) => t.title === d.todoTitle);
        if (todo) await store.completeTodo(todo.id);
      } else if (d.kind === 'bigdeal') {
        const steps = (d.steps as string[]).filter((s) => s.trim()).map((title) => ({ id: crypto.randomUUID(), title, attribute: d.attribute, source: 'ai' as const }));
        await store.addTodo({ title: d.title, attribute: d.attribute, points: d.points, frequency: 'single', repeatDaily: false, isActive: true, isBigDeal: true, steps });
      } else if (d.kind === 'editTodo') {
        const target = store.todos.find((t) => t.id === d.todoId) ?? store.todos.find((t) => t.title === d.todoTitle);
        if (target) {
          if (d.archive) await store.updateTodo(target.id, { isActive: false, archivedAt: new Date() });
          else {
            const updates: Partial<Todo> = {};
            if (d.title !== undefined) updates.title = d.title;
            if (d.attribute !== undefined) updates.attribute = d.attribute;
            if (d.points !== undefined) updates.points = d.points;
            if (d.repeatDaily !== undefined) updates.repeatDaily = d.repeatDaily;
            if (d.deadline !== undefined) updates.deadline = d.deadline || undefined;
            if (Object.keys(updates).length) await store.updateTodo(target.id, updates);
          }
        }
      }
    } catch { /* 写回失败仍保留原演出，避免打断对话 */ }
    const receipt = d.kind === 'todo' ? `记下了。${ATTR_CN[d.attribute]} +${d.points} 等你去拿。` : d.kind === 'ledger' ? '账记好了。' : d.kind === 'completeTodo' ? `「${d.todoTitle}」完成，干得漂亮。` : d.kind === 'bigdeal' ? '拆好了，先做第一步就行。' : d.kind === 'editTodo' ? (d.archive ? '收进归档了，想重启随时说。' : '改好了。') : '记录好了。';
    patchMsg(m.id, { busy: false, status: 'done', receipt }); playMsg('in');
  };

  /* 🎤 按住说话：松手转写回填（不自动发送），移出取消 */
  const micDown = (e: React.PointerEvent) => { e.preventDefault(); setMic('rec'); };
  const micUp = async () => { if (mic !== 'rec') return; setMic('tr'); await sleep(600); setInput((v) => `${v.trim() ? v.trim() + ' ' : ''}今天先写三百字`); setMic('idle'); };
  const micLeave = () => { if (mic === 'rec') { setMic('cancel'); setTimeout(() => setMic((m) => (m === 'cancel' ? 'idle' : m)), 900); } };

  const tools = [
    { label: `上传头像（${c.name}）`, fn: () => { avTarget.current = current; avRef.current?.click(); } },
    { label: '记事本', fn: () => setSheet({ t: 'notebook' }) },
    { label: '更多设置…', fn: () => { onClose(); navigate('settings', { via: 'tear' }); } },
  ];
  const lastPreview = (k: string): [string, number | undefined] => { const m = threads[k][threads[k].length - 1]; if (!m) return ['', undefined]; return [m.role === 'card' ? '［确认卡］' : m.role === 'summary' ? '早前的对话已收进记忆' : m.img && !m.text ? '［图片］' : m.text ?? '', m.at]; };

  // 列表入场：斜排黑牌逐张从左甩入
  const listRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open || (view !== 'list' && !desktop)) return;
    listRef.current?.querySelectorAll<HTMLElement>('.nv-thread').forEach((el, i) => { const tl = el.style.getPropertyValue('--tilt'); anim(el, [{ opacity: 0, transform: `translateX(-70px) skewX(-16deg) rotate(${tl})` }, { opacity: 1, transform: `translateX(0) rotate(${tl})` }], { duration: 380, delay: 80 + i * 50, easing: EASE_BACK, fill: 'backwards' }); });
  }, [view, open]); // eslint-disable-line react-hooks/exhaustive-deps
  const menuRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { if (menu) menuRef.current?.querySelectorAll('.nv-pm-item,.nv-pm-tool').forEach((el, i) => anim(el, [{ opacity: 0, transform: 'translateX(-40px) rotate(-4deg)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: i * 35, easing: EASE_BACK, fill: 'backwards' })); }, [menu]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !sheet && menu) setMenu(false); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [sheet, menu]);

  if (!open) return null;
  const ransomW: Record<string, number> = { C: 160, H: 174, A: 250, T: 225 };
  const sheetEl = sheet?.t === 'notebook' ? <NotebookSheet onClose={() => setSheet(null)} />
    : sheet?.t === 'picker' ? (
      <ChatSheet title="今天做到了哪件？" ghost="DONE" onClose={() => setSheet(null)}>
        <div>{todos.filter((x) => x.isActive !== false && !x.archivedAt).map((x) => (
          <button key={x.id} type="button" className={cx('todo-pick')} onClick={() => { setSheet(null); useNavigatorStore.getState().pushCard({ kind: 'completeTodo', todoId: x.id, todoTitle: x.title }); }}><b>{x.title}</b><small>{ATTR_CN[x.attribute]} +{x.points}{x.repeatDaily ? ' · 每日' : ''}</small></button>
        ))}</div>
      </ChatSheet>
    ) : sheet?.t === 'form' ? (
      <ActionFormSheet key={sheet.kind + (sheet.cardId ?? '')} kind={sheet.kind} draft={sheet.cardId ? msgs.find((m) => m.id === sheet.cardId)?.draft : undefined} onClose={() => setSheet(null)}
        onDone={(d) => {
          const id = sheet.cardId;
          setSheet(null);
          if (id && useNavigatorStore.getState().messages.some((item) => item.id === id)) useNavigatorStore.getState().updateCard(id, { draft: d as NavigatorDraft, userEdited: true });
          else if (id) patchMsg(id, { draft: d });
          else useNavigatorStore.getState().pushCard(d as NavigatorDraft);
        }} />
    ) : null;

  return (
    <div className="nvw" data-view={view} role="dialog" aria-modal="true" aria-label={`助手 · ${c.name}`}>
      <ChatStage />
      <div className={cx('layout')}>
        {/* 会话列表（= 人格切换的新位置） */}
        <section className={cx('pane pane-list')} aria-label="会话列表">
          <div className={cx('stage-bg-list')}><img className={cx('rays')} src={chatImg('bg_tall')} alt="" /></div>
          <div className={cx('list-head')}>
            <img className={cx('torn')} src={chatImg('torn_strip_red')} alt="" />
            <div className={cx('row')}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 8, transform: 'rotate(-4deg)' }}>
                <span className={cx('ransom')} role="img" aria-label="CHAT">{[...'CHAT'].map((ch, i) => { const hgt = i % 3 === 1 ? 40 : 35; return <img key={i} src={chatImg('L_' + ch)} alt="" style={{ height: hgt, width: (hgt * ransomW[ch]) / 256, marginLeft: i ? -2 : 0, transform: `rotate(${[-6, 4, -3, 7][i]}deg)` }} />; })}</span>
                <span style={{ marginBottom: 4, fontSize: 12, fontWeight: 900, letterSpacing: '.1em', color: 'var(--paper)' }}>怪盗热线</span>
              </div>
              <span className={cx('mask-blink')} style={{ width: 62, height: 30, transform: 'rotate(8deg)' }}><img src={chatImg('mask_red_base')} alt="" /><img className={cx('open')} src={chatImg('mask_red_eyes_open')} alt="" /><img className={cx('closed')} src={chatImg('mask_red_eyes_closed')} alt="" /></span>
              <button type="button" className={cx('icon-btn')} aria-label="关闭助手" onClick={onClose}>✕</button>
            </div>
            <div className={cx('list-sub')}>{CHARS.length} 条会话线 · 点一条切换人格</div>
          </div>
          <div className={cx('threads')} role="list" ref={listRef}>
            {CHARS.map((ch, i) => {
              const [pv, at] = lastPreview(ch.key), tilt = i % 2 === 0 ? -1.6 : 1.2, on = ch.key === current;
              return (
                <button key={ch.key} type="button" className={cx('thread', on && 'active')} role="listitem" aria-current={on ? 'true' : undefined} style={{ marginLeft: [0, 14, 4, 18][i % 4], transform: `rotate(${tilt}deg)`, '--tilt': `${tilt}deg` } as CSSProperties} onClick={() => openThread(ch.key)}>
                  <span className={cx('plate')} /><span className={cx('plate-in')} /><Avatar c={ch} size="sm" photo={photos[ch.key]} />
                  <span className={cx('meta')}><span className={cx('name')}><b>{ch.name}</b>{on ? <span className={cx('now')}>当前</span> : null}</span><span className={cx('preview')}>{pv || '还没聊过'}</span></span>
                  <span className={cx('time')}>{listTime(at)}</span>
                </button>
              );
            })}
            <div className={cx('tools')}>{tools.map((t, i) => <button key={t.label} type="button" className={cx('tool')} style={{ marginLeft: 22 + i * 12 }} onClick={t.fn}><span>{t.label}</span></button>)}</div>
          </div>
          <img className={cx('list-sil')} src={chatImg('sil_leap_red')} alt="" />
        </section>

        {/* 会话 */}
        <section className={cx('pane pane-chat')} aria-label="会话">
          <div className={cx('chat-col')}>
            <header className={cx('chat-head')}>
              <div className={cx('head-plate')}>
                <button type="button" className={cx('icon-btn only-mobile')} aria-label="回到会话列表" onClick={backToList}>◀</button>
                <button type="button" className={cx('av-btn')} aria-label="人格菜单" aria-expanded={menu} onClick={() => setMenu(!menu)}><Avatar c={c} size="sm" photo={photos[current]} /></button>
                <div className={cx('head-name')}><b><span className={cx('cap')}>{c.name[0]}</span>{c.name.slice(1)}</b><button type="button" className={cx('own', ownOpen && 'open')} aria-label={`${c.name}今天：${c.own}`} onClick={() => setOwnOpen(!ownOpen)}>{c.own || '万能记录 · 有事直说'}</button></div>
                <button type="button" className={cx('icon-btn')} aria-label="关闭助手" onClick={onClose}>✕</button>
              </div>
              {menu && (
                <div>
                  <div className={cx('menu-veil')} onClick={() => setMenu(false)} />
                  <div className={cx('persona-menu')} role="menu" aria-label="人格菜单" ref={menuRef}>
                    <div className={cx('lab')}>切换人格</div>
                    {CHARS.map((ch, i) => <button key={ch.key} type="button" className={cx('pm-item', ch.key === current && 'on')} role="menuitem" style={{ width: `calc(100% - ${i * 8}px)`, marginLeft: i * 8 }} onClick={() => { setMenu(false); if (ch.key !== current) openThread(ch.key); }}><Avatar c={ch} size="xs" photo={photos[ch.key]} /><span className={cx('nm')}>{ch.name}</span>{ch.key === current ? <span>当前</span> : null}</button>)}
                    {tools.map((t, i) => <button key={t.label} type="button" className={cx('pm-tool')} role="menuitem" style={{ width: `calc(100% - ${i * 10}px)`, marginLeft: i * 10 }} onClick={() => { setMenu(false); t.fn(); }}><span>{t.label}</span></button>)}
                  </div>
                </div>
              )}
            </header>
            <div className={cx('transcript')} ref={txRef}>
              <div className={cx('tx-inner')} ref={innerRef}>
                <svg className={cx('tx-lines')} ref={linesRef} />
                <div className={cx('older')}>⌃ 上拉查看更早的对话</div>
                {msgs.map((m, i) => {
                  const prev = msgs[i - 1];
                  const stamp = !prev || m.at - prev.at > 5 * 60000;
                  return (
                    <FragmentRow key={m.id} stamp={stamp ? m.at : 0}>
                      {m.role === 'summary' ? <div className={cx('summary-row')}>—— 早前的对话已收进记忆 ——<br />{m.text}</div>
                        : m.role === 'cat' ? <div className={cx('row entry')} data-id={m.id} data-anchor="entry"><Avatar c={c} photo={photos[current]} fresh={m.fresh} /><Bubble side="l" text={m.text} fresh={m.fresh} /></div>
                          : m.role === 'user' ? <div className={cx('row reply')} data-id={m.id} data-anchor="reply"><Bubble side="r" text={m.text} img={m.img} fresh={m.fresh} from={m.from} /></div>
                            : <CardRow m={m} c={c} photo={photos[current]} onConfirm={() => void confirmCard(m)} onEdit={() => setSheet({ t: 'form', kind: m.draft!.kind, cardId: m.id })} onCancel={() => patchMsg(m.id, { status: 'cancelled' })} />}
                    </FragmentRow>
                  );
                })}
                {showTyping && <Typing />}
              </div>
            </div>
            <div className={cx('dock')}>
              <div>{stuckShown && stuckShown !== stuckDismissed && (
                <div className={cx('stuck')}><button type="button" className={cx('go')} onClick={() => runStuck(stuckShown)}><i>◆</i><span>听起来卡住了——要{c.me}把它拆成小步吗？</span></button><button type="button" className={cx('x')} aria-label="先不拆" onClick={() => { setStuckDismissed(stuckShown); setStuckText(null); }}>✕</button></div>
              )}</div>
              <div className={cx('chips')}>
                {([['activity', '✍️ 记录活动'], ['todo', '📌 添加待办'], ['ledger', '💰 记账'], ['completeTodo', '✅ 完成任务']] as [DraftKind, string][]).map(([k, lb]) => <button key={k} type="button" className={cx('chip')} onClick={() => setSheet(k === 'completeTodo' ? { t: 'picker' } : { t: 'form', kind: k })}><span>{lb}</span></button>)}
                <button type="button" className={cx('chip')} onClick={() => { onClose(); navigate('astrology', { via: 'tear' }); }}><span>🔮 去抽塔罗</span></button>
                <button type="button" className={cx('chip red')} onClick={() => { onClose(); navigate('actions', { via: 'tear', tab: 'activities' }); }}><span>📜 看总结</span></button>
              </div>
              <div>{shot && <div className={cx('shot-prev')}><span className={cx('th')} style={{ backgroundImage: `url(${shot})` }}><button type="button" aria-label="移除图片" onClick={() => setShot(null)}>✕</button></span>随下一条消息发出</div>}</div>
              <div className={cx('compose')}>
                <button type="button" className={cx('round')} aria-label="发送图片" title="发送图片（票据 / 日程表 / 截图都行）" onClick={() => camRef.current?.click()}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 3 7.2 5.4H4a2 2 0 0 0-2 2V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7.4a2 2 0 0 0-2-2h-3.2L15 3H9Zm3 5.2a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2Zm0 2a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2Z" /></svg></button>
                <input type="file" ref={camRef} accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; const r = new FileReader(); r.onload = () => setShot(String(r.result)); r.readAsDataURL(f); }} />
                <label className={cx('field')}><input value={input} autoComplete="off" size={1} placeholder={`跟${c.name}说点什么…`} aria-label={`给${c.name}的消息`} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) doSend(); }} /></label>
                <button type="button" className={cx('round', mic === 'rec' && 'rec')} aria-label={mic === 'rec' ? '松手结束录音' : '按住说话'} title={mic === 'rec' ? '松手结束' : '按住说话'} disabled={mic === 'tr'} style={{ touchAction: 'none' }}
                  onPointerDown={micDown} onPointerUp={() => void micUp()} onPointerLeave={micLeave} onContextMenu={(e) => e.preventDefault()}>
                  {mic === 'tr' ? <span style={{ fontSize: 18 }}>…</span> : <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a3.4 3.4 0 0 0-3.4 3.4v6.2a3.4 3.4 0 0 0 6.8 0V5.4A3.4 3.4 0 0 0 12 2Zm-6.6 9.2a1 1 0 0 1 1 1 5.6 5.6 0 0 0 11.2 0 1 1 0 1 1 2 0 7.6 7.6 0 0 1-6.6 7.5V22h-2v-2.3a7.6 7.6 0 0 1-6.6-7.5 1 1 0 0 1 1-1Z" /></svg>}
                </button>
                <button type="button" ref={sendRef} className={cx('send')} aria-label="发送" disabled={!input.trim() && !shot} onClick={() => doSend()}><span className={cx('face2')} /><span className={cx('face')} /><span className={cx('lbl')}>SEND ▶</span></button>
              </div>
              {mic !== 'idle' && <div className={cx('mic-hint')}>{mic === 'rec' ? '录音中…松手结束' : mic === 'tr' ? '转写中…' : '已取消'}</div>}
            </div>
          </div>
        </section>
      </div>
      <div className={cx('wipe', wiping && 'play')} aria-hidden="true"><i className={cx('w1')} /><i className={cx('w3')} /><i className={cx('w2')} /></div>
      <div>{sheetEl}</div>
      <input type="file" ref={avRef} accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; const k = avTarget.current || current; avTarget.current = null; const r = new FileReader(); r.onload = () => setCrop({ key: k, src: String(r.result) }); r.readAsDataURL(f); }} />
      <ObCrop open={!!crop} src={crop?.src} title={`调整${(CHARS.find((ch) => ch.key === crop?.key) ?? c).name}的头像`} onClose={() => setCrop(null)} onDone={() => { if (crop?.src) { setPhotos((p) => ({ ...p, [crop.key]: crop.src! })); chatToast('头像已更新（只存本机）'); } }} />
      <ChatToasts />
      {!prefs.devHidden && (
        <div className={cx('demo-bar')}>
          <button type="button" onClick={() => { setSheet(null); const tok = ++token.current; void wipe(() => void autoplay(tok)); }}>▶ 重播示例</button>
          <button type="button" onClick={() => openOverlay('bond-counsel-chat')}>谏言</button>
          <button type="button" onClick={() => setCrop({ key: current })}>头像裁切</button>
        </div>
      )}
    </div>
  );
}

function FragmentRow({ stamp, children }: { stamp: number; children: React.ReactNode }) {
  return <>{stamp ? <div className={cx('stamp-row')}><span className={cx('stamp')}><span>{hhmm(stamp)}</span></span></div> : null}{children}</>;
}
