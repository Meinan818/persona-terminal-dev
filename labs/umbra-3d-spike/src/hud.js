// DOM HUD v2（版式按原作参考帧 108245 f029/f033；复用 m3 p5r-red 头像/字体）。
// 新增：REWARD + 任务条、敌名牌（字号错落 + 白底小字）、勒索信式指令字、锯齿对话气泡、手柄键帽提示条、命中 WEAK 弹出。
import * as THREE from 'three';

const CSS = `
@font-face{font-family:R5D;src:url(/hud/r5-latin-display.woff2)}
@font-face{font-family:R5N;src:url(/hud/r5-num.woff2)}
@font-face{font-family:CJKB;src:url(/hud/cjk-black-v2.woff)}
@font-face{font-family:SERB;src:url(/hud/serif-black-v2.woff)}
#hud{position:fixed;inset:0;pointer-events:none;overflow:hidden;font-family:CJKB,'Noto Sans SC','PingFang SC','Microsoft YaHei',system-ui,sans-serif;color:#fff}
#hud .layer{position:absolute;left:0;top:0;transform-origin:0 0}
.cmd{position:absolute;left:0;top:0;width:0;height:0}
.cmd .it{position:absolute;white-space:nowrap;transform-origin:0 50%}
.cmd .it .w{font-family:R5D,Impact,sans-serif;line-height:40px;color:#fff;background:#000;padding:2px 14px 2px 34px;clip-path:polygon(0 8%,100% 0,96% 100%,3% 92%);display:inline-block}
.cmd .it .w i{font-style:normal;display:inline-block}
.cmd .it.sel .w{background:#fff;color:#000}
.cmd .it .s{position:absolute;left:44px;bottom:-15px;font-size:12px;background:#000;padding:0 6px;color:#fff}
.cmd .it .k{position:absolute;left:4px;top:9px;width:24px;height:24px;border-radius:50%;background:#fff;color:#000;font:700 14px/24px sans-serif;text-align:center;box-shadow:0 0 0 2px #000}
.cmd .it.sel .k{background:#e60012;color:#fff}
.party{position:absolute;right:8px;bottom:4px;transform:scale(1.3);transform-origin:100% 100%;display:flex;gap:4px;align-items:flex-end}
.card{position:relative;width:120px;height:66px}
.card .bg{position:absolute;inset:10px 0 2px 16px;background:#000;clip-path:polygon(6% 0,100% 10%,95% 100%,0 88%);box-shadow:none}
.card .bd{position:absolute;inset:7px -3px -1px 13px;background:#fff;clip-path:polygon(6% 0,100% 10%,95% 100%,0 88%)}
.card.on .bd{background:#e60012}
.card img{position:absolute;left:-6px;bottom:2px;width:68px;height:68px;object-fit:contain;filter:grayscale(1) brightness(1.9) contrast(1.7)}
.card .hp,.card .sp{position:absolute;font-family:R5N,Impact,sans-serif;font-style:italic;line-height:22px}
.card .hp{left:58px;top:13px;font-size:23px;color:#fff;-webkit-text-stroke:.4px #000}
.card .sp{left:80px;top:35px;font-size:18px;color:#ff7ac8}
.card .lb{position:absolute;left:47px;top:16px;font:900 9px Arial,sans-serif;color:#5cf2a0}
.card .lb2{position:absolute;left:70px;top:39px;font:900 8px Arial,sans-serif;color:#ff7ac8}
.card .bar{position:absolute;height:3px}
.plate{position:absolute;left:34px;top:34px;transform:rotate(-6deg) scale(1.45);transform-origin:0 0}
.plate .o{position:absolute;inset:-5px -10px -5px -6px;background:#fff;clip-path:polygon(0 4%,100% 0,98% 100%,1% 92%)}
.plate .b{position:relative;background:#000;padding:5px 34px 7px 20px;clip-path:polygon(0 6%,100% 0,97% 100%,2% 92%);white-space:nowrap}
.plate .b span{display:inline-block;font-weight:900;letter-spacing:1px;margin-right:6px}
.plate .b span.sm{background:#fff;color:#000;font-size:13px;padding:0 3px;margin:0 3px;transform:translateY(-3px) rotate(4deg)}
.plate .tail{position:absolute;left:-30px;right:-140px;top:100%;height:5px;margin-top:9px;background:#fff;clip-path:polygon(0 30%,100% 0,100% 70%,0 100%)}
.reward{position:absolute;left:600px;top:24px;font-family:SERB,serif;font-style:italic;font-size:19px;color:#bfc6d8;letter-spacing:1px;text-shadow:0 0 3px #000}
.reward b{font-size:25px;color:#e9edf5;margin-left:8px}
.mission{position:absolute;right:40px;top:22px;text-align:right;font-size:21px;line-height:38px;text-shadow:0 0 2px #000,0 0 2px #000,1px 1px 0 #000}
.mission em{font-style:normal;color:#ff2a3a;font-size:27px;font-family:R5N,CJKB,sans-serif;margin-left:4px}
.hint{position:absolute;left:14px;bottom:10px;font-size:12px;display:flex;gap:12px;align-items:center;transform:scale(1.55);transform-origin:0 100%}
.hint .h{display:flex;align-items:center;gap:3px}
.hint .kc{background:#fff;color:#000;border-radius:3px;font:900 10px/15px Arial,sans-serif;padding:0 4px;min-width:14px;text-align:center}
.hint .tx{background:#000;padding:0 5px;line-height:17px;border:1px solid #fff;transform:skewX(-8deg)}
.navw{position:absolute;top:10px;right:40px;width:380px;height:86px;transform-origin:100% 0}
.navw svg{position:absolute;left:0;top:0}
.navw .t{position:absolute;left:58px;top:31px;color:#000;font-weight:900;font-size:15px;letter-spacing:1px}
.navhead{position:absolute;top:6px;right:8px;width:104px;height:104px;border-radius:50%;background:#000;overflow:hidden;box-shadow:0 0 0 3px #fff}
.navhead img{width:100%;height:100%;object-fit:cover}
.weak{position:absolute;font-family:R5D,Impact,sans-serif;font-size:46px;line-height:46px;color:#fff;background:#e60012;padding:2px 12px;transform-origin:0 50%;-webkit-text-stroke:1.5px #000;box-shadow:4px 4px 0 #000;clip-path:polygon(0 0,100% 6%,96% 100%,3% 94%)}
.tri{position:absolute;width:0;height:0;border-left:17px solid transparent;border-right:17px solid transparent;border-top:26px solid #e60012;filter:drop-shadow(0 0 1px #000)}
`;

// 勒索信式字：字号/基线逐字错落（固定种子，稳定）
function ransom(word, base, sel) {
  return [...word].map((ch, i) => { const k = i === 0 ? 1.28 : [0.94, 1.06, 0.88, 1.0, 1.1, 0.92][i % 6]; const dy = i === 0 ? 0 : [1, -2, 2, -1, 0, 1][i % 6]; return `<i style="font-size:${Math.round(base * k)}px;transform:translateY(${dy}px)">${ch}</i>`; }).join('');
}

const ITEMS = [
  { w: 'ORDER', s: '作战指令', k: 'L2', x: -185, y: -70, r: -22 },
  { w: 'GUN', s: '枪械射击', k: 'R2', x: -175, y: -8, r: -8 },
  { w: 'PERSONA', s: '使用技能', k: '△', x: 40, y: -58, r: -12 },
  { w: 'SWORD', s: '近战攻击', k: '○', x: 52, y: 6, r: -4, sel: true },
  { w: 'ITEM', s: '使用道具', k: '□', x: -110, y: 56, r: 6 },
  { w: 'GUARD', s: '防御', k: '×', x: 30, y: 74, r: 24 },
];
const PARTY = [['joker', 163, 76, true], ['skull', 131, 74], ['panther', 160, 58], ['queen', 140, 84]];

function balloon(w, h) {
  // 锯齿白气泡 + 黑描边（原作导航对话框）
  const pts = []; const n = 22; const cx = w / 2 - 20, cy = h / 2, rx = w / 2 - 34, ry = h / 2 - 12;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const k = i % 2 ? 1 : 0.9 + 0.08 * Math.sin(i * 2.7); pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  pts.splice(5, 0, [w - 6, cy + 4]); // 指向头像的尖角
  const d = 'M' + pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join('L') + 'Z';
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path d="${d}" fill="#fff" stroke="#000" stroke-width="5" stroke-linejoin="round"/></svg>`;
}

export const HUD_TEXT = ['嘲笑的雪人', '作战指令枪械射击使用技能近战攻击使用道具防御', '分析选择对象切换队员辅助', '好机会！可以攻击弱点！', '20次行动以内的话疾风属性攻击时获得分数否×倍+,'];

export class Hud {
  constructor(root) {
    this.root = root;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    this.layer = document.createElement('div'); this.layer.className = 'layer'; root.appendChild(this.layer);
    this.cmd = el('div', 'cmd', ITEMS.map((i) => `<div class="it${i.sel ? ' sel' : ''}" style="left:${i.x}px;top:${i.y}px;transform:rotate(${i.r}deg)"><span class="k">${i.k}</span><span class="w">${ransom(i.w, 38, i.sel)}</span><span class="s">${i.s}</span></div>`).join(''));
    this.party = el('div', 'party', PARTY.map(([id, hp, sp, on]) => `<div class="card${on ? ' on' : ''}"><div class="bd"></div><div class="bg"></div><img src="/hud/head.${id}.webp"><span class="lb">HP</span><span class="hp">${hp}</span><span class="lb2">SP</span><span class="sp">${sp}</span><span class="bar" style="left:58px;top:33px;width:${hp / 3.6}px;background:#5cf2a0"></span><span class="bar" style="left:76px;top:56px;width:${sp / 2.2}px;background:#ff7ac8"></span></div>`).join(''));
    const nm = [['嘲', 25, -2], ['笑', 21, 2], ['的', 0, 0, 'sm'], ['雪', 24, -1], ['人', 21, 2]];
    this.plate = el('div', 'plate', `<div class="o"></div><div class="b">${nm.map(([c, s, dy, cl]) => `<span class="${cl || ''}" style="${s ? `font-size:${s}px;transform:translateY(${dy}px)` : ''}">${c}</span>`).join('')}</div><div class="tail"></div>`);
    this.reward = el('div', 'reward', 'REWARD<b>25,000</b>');
    this.mission = el('div', 'mission', '20次行动以内的话<em>+10,000</em><br>疾风属性攻击时获得分数<em>×3倍</em><br>否攻击时获得分数<em>×7倍</em>');
    const keys = [['L1', '分析'], ['✚', '选择对象'], ['✚', '切换队员'], ['R3', '辅助']];
    this.hint = el('div', 'hint', keys.map(([k, t]) => `<span class="h"><span class="kc">${k}</span><span class="tx">${t}</span></span>`).join(''));
    this.nav = el('div', 'navw', balloon(330, 86) + '<span class="t">好机会！可以攻击弱点！</span>');
    this.navhead = el('div', 'navhead', '<img src="/hud/head.mona.webp">');
    this.weak = el('div', 'weak', 'WEAK!!');
    this.tri = el('div', 'tri', '');
    this.all = [this.cmd, this.party, this.plate, this.reward, this.mission, this.hint, this.nav, this.navhead, this.weak, this.tri];
    for (const e of this.all) { this.layer.appendChild(e); e.style.display = 'none'; }
  }
  resize(w, h) {
    this.s = h / 720; this.w = w / this.s; this.layer.style.transform = `scale(${this.s})`; this.layer.style.width = this.w + 'px'; this.layer.style.height = '720px';
    // 窄屏（手机横屏 844×390 → 逻辑宽 1558）：REWARD 跟着居中
    this.reward.style.left = Math.round(this.w * 0.47) + 'px';
  }
  proj(v, cam) { const p = v.clone().project(cam); return [(p.x + 1) / 2 * this.w, (1 - p.y) / 2 * 720]; }
  update(phase, lt, cam, { joker, jf, at, hit }) {
    const show = (e, v) => (e.style.display = v ? '' : 'none');
    const menu = phase === 'menu', atk = phase === 'attack', top = menu || atk;
    show(this.cmd, menu); show(this.party, top); show(this.plate, top); show(this.hint, top);
    show(this.reward, top); show(this.mission, menu);
    show(this.nav, atk); show(this.navhead, atk); show(this.weak, atk && hit > 0.05); show(this.tri, atk && at < 0.6);
    if (menu) {
      const [x, y] = this.proj(joker.holder.position.clone().add(new THREE.Vector3(0, 0.95, 0)), cam);
      const k = Math.min(1, lt / 0.18);
      this.cmd.style.transform = `translate(${x}px,${y}px) scale(${(0.6 + 0.4 * k) * 1.05}) rotate(${(1 - k) * -12}deg)`; this.cmd.style.opacity = k;
    }
    if (atk) {
      const [ex, ey] = this.proj(jf.holder.position.clone().add(new THREE.Vector3(0, 1.3, 0)), cam);
      this.tri.style.left = ex - 17 + 'px'; this.tri.style.top = ey - 32 + 'px';
      const pop = hit > 0.7 ? 1 + (1 - hit) * 0.6 : 0.8 + hit * 0.4;
      this.weak.style.left = ex + 6 + 'px'; this.weak.style.top = ey - 24 + 'px'; this.weak.style.transform = `rotate(-14deg) scale(${pop})`;
      const nk = Math.min(1, Math.max(0, (at + 0.2) / 0.15));
      this.nav.style.transform = `scale(${(0.7 + 0.3 * nk) * 1.6})`; this.nav.style.opacity = nk;
    }
  }
}
function el(tag, cls, html) { const e = document.createElement(tag); e.className = cls; e.innerHTML = html; return e; }
