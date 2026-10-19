/**
 * P3 影时间专属演出：失衡（ONE MORE/SHIFT）与总攻击（ALL-OUT）。
 *
 * 这两个效果只负责画面与时长，不改变战斗结果。返回的 finished 在演出结束
 * 后 resolve，调用方再继续结算/渲染。非 P3 主题或缺少舞台时返回 null，
 * 由调用方回落到原有 impact 动画。
 */

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function stage() {
  if (document.documentElement.dataset.theme !== 'p3') return null;
  return document.querySelector('.sh-stage');
}

function isMobileStage() {
  return document.body.classList.contains('sh-m');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

function removeNode(node) {
  node?.remove();
}

export function clearSignatureFx() {
  document.querySelectorAll('.p3-stagger, .p3-aoa').forEach(removeNode);
  document.body.classList.remove('p3-aoa-running');
  document.querySelectorAll('.enemy-scene.p3-stagger-hit').forEach(node => node.classList.remove('p3-stagger-hit'));
}

/**
 * 失衡：白色斜切 ONE MORE / SHIFT + 碎晶。
 * @param {{targetName?: string, batonName?: string}} options
 * @returns {{finished: Promise<void>} | null}
 */
export function playStagger({ targetName = '', batonName = '' } = {}) {
  const host = stage();
  if (!host) return null;

  host.querySelector('.p3-stagger')?.remove();
  const node = document.createElement('div');
  node.className = 'p3-stagger';
  node.setAttribute('aria-hidden', 'true');
  node.innerHTML = `
    <div class="slab">
      <b>ONE <span>MORE!</span></b>
      <i>${targetName ? `${escapeHtml(targetName)} 失衡 · 再行动一次` : '弱点命中 · 再行动一次'}</i>
    </div>
    <div class="shards"></div>
    ${batonName ? `<div class="shift"><b>SHIFT ▸</b><span>把行动交给 ${escapeHtml(batonName)} · 下一击增强</span></div>` : ''}
  `;
  host.append(node);

  const enemy = host.querySelector('.enemy-scene');
  enemy?.classList.add('p3-stagger-hit');

  const shards = node.querySelector('.shards');
  const mobile = isMobileStage();
  const reduce = reducedMotion();
  for (let index = 0; index < 10; index += 1) {
    const shard = document.createElement('i');
    const x = (mobile ? 170 : 600) + Math.random() * (mobile ? 160 : 240);
    const y = (mobile ? 240 : 300) + Math.random() * (mobile ? 140 : 160);
    const size = mobile ? 70 : 120;
    shard.style.left = `${x}px`;
    shard.style.top = `${y}px`;
    shard.style.width = `${size}px`;
    shard.style.height = `${size}px`;
    shard.style.clipPath = `polygon(${Math.random() * 50}% 0,100% ${Math.random() * 60}%,${30 + Math.random() * 60}% 100%,0 ${30 + Math.random() * 60}%)`;
    shards.append(shard);
    if (reduce) {
      shard.style.opacity = '.7';
      continue;
    }
    shard.animate([
      { transform: 'translate(0,0) rotate(0)', opacity: 1 },
      {
        transform: `translate(${(Math.random() - .5) * (mobile ? 260 : 700)}px,${(Math.random() - .5) * (mobile ? 220 : 500)}px) rotate(${Math.random() * 360}deg)`,
        opacity: 0,
      },
    ], { duration: 900, fill: 'forwards' });
  }

  const duration = reduce ? 180 : 1600;
  const finished = new Promise(resolve => {
    window.setTimeout(() => {
      node.remove();
      enemy?.classList.remove('p3-stagger-hit');
      resolve();
    }, duration);
  });
  return { finished };
}

/**
 * 总攻击：黑场闪白 / 三道斩线 / 玻璃碎片 / 伤害数字 / 终幕文字。
 * @param {{damage?: number, finishLine?: string}} options
 * @returns {{finished: Promise<void>} | null}
 */
export function playAllOut({ damage = 0, finishLine = '' } = {}) {
  const host = stage();
  if (!host) return null;

  host.querySelector('.p3-aoa')?.remove();
  const node = document.createElement('div');
  node.className = 'p3-aoa';
  node.setAttribute('aria-hidden', 'true');
  node.innerHTML = `
    <div class="sky"></div>
    <div class="ln"></div><div class="ln"></div><div class="ln"></div>
    <!-- 素材位 P3-F：队伍剪影穿梭 / 斩线，设计尺寸 2400×1120；替换时保留 .sil 的占位与层级。 -->
    <div class="sil"><span>P3-F</span><b>总攻击 · 队伍剪影穿梭 / 斩线</b><small>2400×1120</small></div>
    <div class="glass"></div>
    <div class="dmg">${Math.max(0, Math.round(Number(damage) || 0))}</div>
    <div class="fin"><b>THE DARK HOUR ENDS</b><span>${escapeHtml(finishLine || '影子退散 · 影时间重归安静')}</span></div>
  `;
  host.append(node);
  document.body.classList.add('p3-aoa-running');

  const mobile = isMobileStage();
  const width = mobile ? 390 : 1440;
  const height = mobile ? 844 : 900;
  const glass = node.querySelector('.glass');
  const reduce = reducedMotion();
  for (let index = 0; index < 22; index += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const shard = document.createElement('i');
    const size = (mobile ? 30 : 60) + Math.random() * (mobile ? 55 : 140);
    shard.style.left = `${x}px`;
    shard.style.top = `${y}px`;
    shard.style.width = `${size}px`;
    shard.style.height = `${size}px`;
    shard.style.clipPath = `polygon(${Math.random() * 40}% 0,100% ${Math.random() * 50}%,${50 + Math.random() * 50}% 100%,0 ${40 + Math.random() * 60}%)`;
    shard.style.setProperty('--x', `${(x - width / 2) * .6}px`);
    shard.style.setProperty('--y', `${(y - height / 2) * .6}px`);
    shard.style.setProperty('--a', `${Math.random() * 180}deg`);
    if (reduce) shard.style.opacity = '.35';
    glass.append(shard);
  }

  const duration = reduce ? 260 : 4200;
  const finished = new Promise(resolve => {
    window.setTimeout(() => {
      node.remove();
      document.body.classList.remove('p3-aoa-running');
      resolve();
    }, duration);
  });
  return { finished };
}
