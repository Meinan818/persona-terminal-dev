// P5T 式战斗演出（Hark 美术区）：1 MORE 切入、Triple Threat（总攻）横幅 / 三人切入带 / FINISH 红色收尾。
// 纯 DOM + CSS（样式在 style.css「cutin」段）。时间轴由这里的 FxClock 驱动：
//   - body.frozen（截图钩子）时整条时间轴暂停（CSS 动画也由 .frozen 规则暂停）
//   - 点屏幕可跳过（Skip.fire()：剩余等待全部立即结束）
//   - prefers-reduced-motion：只缩短（×0.55），不去掉

export interface CutWho { id: string; name: string; color: string; side: 'ally' | 'enemy' | 'neutral'; tag?: string }

const host = () => document.getElementById('app') ?? document.body;
export const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let scale = 1; // 毫秒 → 实际毫秒（速度参数 + reduced-motion）
export function setFxSpeed(speed: number) { scale = (REDUCED ? 0.55 : 1) / Math.max(0.05, speed); document.documentElement.style.setProperty('--fxk', String(scale)); }
setFxSpeed(1);
export const fxMs = (ms: number) => ms * scale;

/** 可跳过 + 跟随 body.frozen 暂停的计时器 */
export class Skip {
  skipped = false;
  private wakers = new Set<() => void>();
  fire() { this.skipped = true; for (const w of this.wakers) w(); this.wakers.clear(); }
  /** 等 ms（逻辑毫秒，自动乘速度系数）；冻结时不计时；跳过时立即返回 */
  wait(ms: number): Promise<void> {
    if (this.skipped) return Promise.resolve();
    const total = fxMs(ms);
    return new Promise((res) => {
      let acc = 0, last = performance.now(), done = false;
      const fin = () => { if (!done) { done = true; this.wakers.delete(fin); res(); } };
      this.wakers.add(fin);
      const tick = () => {
        if (done) return;
        const now = performance.now();
        if (!document.body.classList.contains('frozen')) acc += now - last;
        last = now;
        if (acc >= total) fin(); else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
}

const initial = (w: CutWho) => (w.name.split(' ').pop() ?? w.name).slice(0, 1).toUpperCase();
const shortName = (w: CutWho) => (w.name.split(' ').pop() ?? w.name).toUpperCase();
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
/** 头像槽：正版立绘到之前用角色色 + 网点 + 首字母 + 面具条 */
function portrait(w: CutWho, cls = '') {
  return `<div class="pt ${cls} ${w.side}" style="--c:${w.color}"><i class="dots"></i><i class="ini">${esc(initial(w))}</i><i class="msk"></i></div>`;
}

/** 截图/调试：把一层演出挂上并返回节点 */
function layer(cls: string, html: string) {
  const el = document.createElement('div');
  el.className = `fx-cut ${cls}`;
  el.innerHTML = html;
  host().appendChild(el);
  return el;
}

// ---------------------------------------------------------------- 1 MORE
/**
 * 1 MORE 切入：白闪 → 红黑斜切带从左扫入（带头像槽）→ 倾斜「1 MORE!」大字（白描边）逐字弹入 → 向右切出。
 * 约 1.0s（速度 1）。onPeak 在大字到位时回调（主程序借此做镜头推近的回拉）。
 */
export async function oneMoreCutIn(who: CutWho, skip = new Skip(), onPeak?: () => void) {
  const chars = [...'1 MORE!'].map((c, i) => c === ' ' ? '<i class="gap"></i>' : `<b style="--i:${i}">${c}</b>`).join('');
  const el = layer(`om ${who.side}`, `<div class="fl"></div>
    <div class="slab k"></div><div class="slab r"></div><div class="slab w"></div>
    <div class="slot">${portrait(who)}<div class="nm">${esc(shortName(who))}</div></div>
    <div class="big"><span class="t">${chars}</span><small>${who.side === 'enemy' ? 'ENEMY ' : ''}EXTRA ACTION</small></div>`);
  const tapper = tapToSkip(skip);
  await skip.wait(560);
  onPeak?.();
  await skip.wait(300);
  el.classList.add('out');
  await skip.wait(200);
  el.remove(); tapper.remove();
}

// ---------------------------------------------------------------- TRIPLE THREAT
/** P5 勒索信字块：每个字不同底色 / 字体 / 旋转 / 大小 */
export function ransom(text: string, seed0 = 7) {
  let seed = seed0 + text.length * 13;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const pal = ['k', 'w', 'r', 'w', 'k', 'y'];
  const fonts = ['f1', 'f2', 'f3', 'f4'];
  return [...text].map((ch, i) => ch === ' ' ? '<i class="sp"></i>'
    : `<span class="c ${pal[Math.floor(rnd() * pal.length)]} ${fonts[Math.floor(rnd() * fonts.length)]}" style="--r:${(rnd() * 18 - 9).toFixed(1)}deg;--s:${(0.82 + rnd() * 0.4).toFixed(2)};--y:${(rnd() * 10 - 5).toFixed(0)}px;--d:${i * 30}ms">${esc(ch)}</span>`).join('');
}

export interface TripleHooks {
  /** 0ms：画三角 + 敌人高亮 + 镜头拉远框住三角 */
  showTriangle(): void;
  /** 三人切入带结束后：对三角内每个敌人闪白 + 伤害数字（i = 第几个） */
  hit(i: number): void;
  victims: number;
  /** 结束（含跳过）：清理三角、镜头复位 */
  done(): void;
}

/**
 * Triple Threat 全套（速度 1 名义约 3.0s，低帧率设备实测 ≤3.5s）：
 *  0.00 三角红光连线 + 敌人高亮 + 镜头拉远框住三角
 *  0.42 「TRIPLE THREAT」勒索信横幅
 *  1.12 三条角色切入带依次（0.14s 错开）
 *  1.88 每个三角内敌人：闪白 + 伤害数字（0.09s 错开）+ 屏幕震动
 *  2.30 FINISH! 红色放射收尾板
 *  2.98 结束
 * 点屏幕任意时刻跳过：剩余命中立刻全打出，直接收尾。
 */
export async function tripleThreatSeq(allies: CutWho[], hooks: TripleHooks, skip = new Skip()) {
  const root = layer('tt', '');
  document.body.classList.add('fx-tt');
  const tapper = tapToSkip(skip);
  let hitsDone = 0;
  const hitAll = () => { while (hitsDone < hooks.victims) hooks.hit(hitsDone++); };
  try {
    hooks.showTriangle();
    root.innerHTML = `<div class="vig"></div>`;
    await skip.wait(420);
    if (!skip.skipped) {
      const ban = document.createElement('div');
      ban.className = 'ttb';
      ban.innerHTML = `<div class="band"></div><div class="band b2"></div><div class="word">${ransom('TRIPLE', 3)}<br/>${ransom('THREAT', 11)}</div><div class="sub">ALL-OUT ATTACK</div>`;
      root.appendChild(ban);
      await skip.wait(700);
      ban.classList.add('out');
    }
    if (!skip.skipped) {
      const bands = document.createElement('div');
      bands.className = 'ttc';
      bands.innerHTML = allies.slice(0, 3).map((a, i) => `<div class="bd b${i}" style="--i:${i};--c:${a.color}">
        <i class="stripe"></i>${portrait(a, 'sm')}<div class="tx"><b>${esc(shortName(a))}</b><small>${esc(a.tag ?? 'PHANTOM THIEF')}</small></div></div>`).join('');
      root.appendChild(bands);
      await skip.wait(760);
      bands.classList.add('out');
    }
    if (!skip.skipped) {
      document.body.classList.add('fx-shake');
      for (let i = 0; i < hooks.victims && !skip.skipped; i++) { hooks.hit(hitsDone++); await skip.wait(90); }
      await skip.wait(Math.max(0, 420 - 90 * hooks.victims));
    }
    hitAll();
    document.body.classList.remove('fx-shake');
    root.innerHTML = `<div class="fin"><div class="burst"></div><div class="burst b2"></div><div class="ft">${ransom('FINISH!', 5)}</div></div>`;
    const finSkip = new Skip(); // 收尾板跳过时也闪一下（0.25s），让玩家知道结束了
    await (skip.skipped ? finSkip.wait(250) : skip.wait(560));
    root.classList.add('out');
    await finSkip.wait(120);
  } finally {
    hitAll();
    document.body.classList.remove('fx-shake');
    root.remove(); tapper.remove();
    document.body.classList.remove('fx-tt');
    hooks.done();
  }
}

/** 透明全屏层：点一下跳过当前演出 */
function tapToSkip(skip: Skip) {
  const t = document.createElement('div');
  t.className = 'fx-tap';
  t.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); skip.fire(); });
  host().appendChild(t);
  return t;
}
