// 轻量 DOM HUD（复用 m3 p5r-red 皮肤的头像/字体素材；版式按原作参考帧 108245 f029/f033）。
import * as THREE from 'three';

const CSS = `
@font-face{font-family:R5D;src:url(/hud/r5-latin-display.woff2)}
@font-face{font-family:R5N;src:url(/hud/r5-num.woff2)}
@font-face{font-family:CJKB;src:url(/hud/cjk-black.woff2)}
#hud{position:fixed;inset:0;pointer-events:none;overflow:hidden;font-family:CJKB,'Noto Sans CJK SC','Microsoft YaHei',system-ui,sans-serif;color:#fff}
#hud .vig{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 55%,rgba(0,0,0,0) 45%,rgba(2,4,18,.65) 100%)}
#hud .layer{position:absolute;left:0;top:0;transform-origin:0 0}
.cmd{position:absolute;left:0;top:0;width:0;height:0;transition:none}
.cmd .burst{position:absolute;left:-150px;top:-120px;width:300px;height:250px}
.cmd .it{position:absolute;white-space:nowrap;transform-origin:0 50%}
.cmd .it .w{font-family:R5D,Impact,sans-serif;font-size:40px;line-height:40px;letter-spacing:-1px;color:#fff;background:#000;padding:2px 14px 2px 34px;clip-path:polygon(0 8%,100% 0,96% 100%,3% 92%);display:inline-block;-webkit-text-stroke:1px #000}
.cmd .it.sel .w{background:#fff;color:#000}
.cmd .it .w b{font-size:50px;color:inherit}
.cmd .it .s{position:absolute;left:44px;bottom:-15px;font-size:12px;font-weight:700;background:#000;padding:0 6px;color:#fff}
.cmd .it .k{position:absolute;left:4px;top:9px;width:24px;height:24px;border-radius:50%;background:#fff;color:#000;font:700 14px/24px sans-serif;text-align:center}
.cmd .it.sel .k{background:#e60012;color:#fff}
.party{position:absolute;right:10px;bottom:6px;transform:scale(1.3);transform-origin:100% 100%;display:flex;gap:6px;align-items:flex-end}
.card{position:relative;width:118px;height:64px}
.card .bg{position:absolute;inset:8px 0 0 18px;background:#000;clip-path:polygon(6% 0,100% 8%,94% 100%,0 90%)}
.card.on .bg{background:#e60012}
.card img{position:absolute;left:-4px;bottom:2px;width:66px;height:66px;object-fit:contain;filter:grayscale(1) brightness(1.8) contrast(1.6)}
.card .hp,.card .sp{position:absolute;left:56px;font-family:R5N,Impact,sans-serif;font-style:italic;font-size:22px;line-height:22px}
.card .hp{top:12px;color:#5cf2a0}.card .sp{top:34px;color:#ff7ac8;left:74px;font-size:19px}
.card .lb{position:absolute;left:46px;top:14px;font:700 9px sans-serif;color:#fff}
.card .bar{position:absolute;left:58px;height:3px;background:#5cf2a0}
.plate{position:absolute;left:28px;top:20px;transform:rotate(-4deg);background:#000;border:3px solid #fff;padding:6px 30px 6px 18px;font-size:22px;font-weight:900;letter-spacing:2px;clip-path:polygon(0 0,100% 0,97% 100%,2% 100%)}
.hint{position:absolute;left:12px;bottom:8px;font-size:12px;font-weight:700;display:flex;gap:10px}
.hint span{background:#000;padding:1px 6px;border:1px solid #fff}
.nav{position:absolute;top:14px;right:84px;background:#fff;color:#000;font-weight:900;font-size:15px;padding:12px 36px;border-radius:50%/50%;border:3px solid #000}
.navhead{position:absolute;top:6px;right:10px;width:70px;height:70px;border-radius:50%;background:#000;overflow:hidden}
.navhead img{width:100%;height:100%;object-fit:cover}
.weak{position:absolute;font-family:R5D,Impact,sans-serif;font-size:44px;color:#fff;background:#e60012;padding:0 10px;transform:rotate(-14deg);-webkit-text-stroke:1.5px #000}
.tri{position:absolute;width:0;height:0;border-left:16px solid transparent;border-right:16px solid transparent;border-top:24px solid #e60012}
`;

const ITEMS = [
  { w: 'ORDER', s: '作战指令', k: 'L2', x: -185, y: -70, r: -22 },
  { w: 'GUN', s: '枪械射击', k: '○', x: -175, y: -8, r: -8 },
  { w: 'PERSONA', s: '使用技能', k: '△', x: 40, y: -58, r: -12 },
  { w: 'SWORD', s: '近战攻击', k: '○', x: 52, y: 6, r: -4, sel: true },
  { w: 'ITEM', s: '使用道具', k: '□', x: -110, y: 56, r: 6 },
  { w: 'GUARD', s: '防御', k: '×', x: 30, y: 74, r: 24 },
];
const PARTY = [['joker', 163, 76, true], ['skull', 131, 74], ['panther', 160, 58], ['queen', 140, 84]];

export class Hud {
  constructor(root) {
    this.root = root;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    root.innerHTML = '<div class="vig"></div>';
    this.layer = document.createElement('div'); this.layer.className = 'layer'; root.appendChild(this.layer);
    const burst = '' && `<svg class="burst" viewBox="-150 -125 300 250"><polygon fill="#e60012" points="${starPts(150, 46, 22)}"/><polygon fill="#000" points="${starPts(78, 26, 16, 0.3)}"/></svg>`;
    this.cmd = el('div', 'cmd', burst + ITEMS.map((i) => `<div class="it${i.sel ? ' sel' : ''}" style="left:${i.x}px;top:${i.y}px;transform:rotate(${i.r}deg)"><span class="k">${i.k}</span><span class="w"><b>${i.w[0]}</b>${i.w.slice(1)}</span><span class="s">${i.s}</span></div>`).join(''));
    this.party = el('div', 'party', PARTY.map(([id, hp, sp, on]) => `<div class="card${on ? ' on' : ''}"><div class="bg"></div><img src="/hud/head.${id}.webp"><span class="lb">HP</span><span class="hp">${hp}</span><span class="sp">${sp}</span><span class="bar" style="top:31px;width:${hp / 4}px"></span><span class="bar" style="top:54px;width:${sp / 2}px;background:#ff7ac8;left:72px"></span></div>`).join(''));
    this.plate = el('div', 'plate', '嘲笑的雪人');
    this.hint = el('div', 'hint', '<span>L1 分析</span><span>✚ 选择对象</span><span>✚ 切换队员</span><span>R3 辅助</span>');
    this.nav = el('div', 'nav', '好机会！可以攻击弱点！');
    this.navhead = el('div', 'navhead', '<img src="/hud/head.mona.webp">');
    this.weak = el('div', 'weak', 'WEAK!!');
    this.tri = el('div', 'tri', '');
    for (const e of [this.cmd, this.party, this.plate, this.hint, this.nav, this.navhead, this.weak, this.tri]) { this.layer.appendChild(e); e.style.display = 'none'; }
  }
  resize(w, h) { this.s = h / 720; this.w = w / this.s; this.layer.style.transform = `scale(${this.s})`; this.layer.style.width = this.w + 'px'; this.layer.style.height = '720px'; }
  proj(v, cam) { const p = v.clone().project(cam); return [(p.x + 1) / 2 * this.w, (1 - p.y) / 2 * 720]; }
  update(shot, lt, cam, { joker, jf, at, hit }) {
    const show = (e, v) => (e.style.display = v ? '' : 'none');
    const menu = shot === 'menu', atk = shot === 'attack';
    show(this.cmd, menu); show(this.party, menu || atk); show(this.plate, menu || atk); show(this.hint, menu || atk);
    show(this.nav, atk); show(this.navhead, atk); show(this.weak, atk && hit > 0.05); show(this.tri, atk && at < 0.6);
    if (menu) {
      const [x, y] = this.proj(joker.holder.position.clone().add(new THREE.Vector3(0, 0.95, 0)), cam);
      const k = Math.min(1, lt / 0.18);
      this.cmd.style.transform = `translate(${x}px,${y}px) scale(${(0.6 + 0.4 * k) * 1.25})`; this.cmd.style.opacity = k;
    }
    if (atk) {
      const [ex, ey] = this.proj(jf.holder.position.clone().add(new THREE.Vector3(0, 1.3, 0)), cam);
      this.tri.style.left = ex - 16 + 'px'; this.tri.style.top = ey - 30 + 'px';
      this.weak.style.left = ex + 10 + 'px'; this.weak.style.top = ey - 20 + 'px'; this.weak.style.transform = `rotate(-14deg) scale(${0.8 + hit * 0.4})`;
    }
  }
}
function el(tag, cls, html) { const e = document.createElement(tag); e.className = cls; e.innerHTML = html; return e; }
function starPts(R, r, n, rot = 0) { const p = []; for (let i = 0; i < n * 2; i++) { const a = rot + i / (n * 2) * Math.PI * 2; const rr = i % 2 ? r : R * (0.75 + 0.25 * Math.abs(Math.sin(i * 1.7))); p.push((Math.cos(a) * rr).toFixed(1) + ',' + (Math.sin(a) * rr * 0.8).toFixed(1)); } return p.join(' '); }
