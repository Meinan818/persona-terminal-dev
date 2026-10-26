// 虚拟时钟：performance.now / Date.now / setTimeout / setInterval / rAF 全部由 __vc.step(ms) 推进；CSS/WAAPI 动画按虚拟时间拨。
(() => {
  const oST = window.setTimeout.bind(window), oSI = window.setInterval.bind(window), oCI = window.clearInterval.bind(window);
  const oNow = performance.now.bind(performance), oDateNow = Date.now;
  const base = oDateNow();
  let T = 0, seq = 1;
  const timers = new Map(); // id -> {at, fn, args, every}
  let rafs = new Map();
  // seeded random
  let s = 0x2f6b1a3c;
  Math.random = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  performance.now = () => T;
  Date.now = () => base + T;
  window.setTimeout = (fn, d = 0, ...a) => { const id = seq++; timers.set(id, { at: T + Math.max(0, +d || 0), fn, args: a, o: id }); return id; };
  window.setInterval = (fn, d = 0, ...a) => { const id = seq++; timers.set(id, { at: T + Math.max(1, +d || 0), fn, args: a, every: Math.max(1, +d || 0), o: id }); return id; };
  window.clearTimeout = window.clearInterval = (id) => { timers.delete(id); };
  window.requestAnimationFrame = (fn) => { const id = seq++; rafs.set(id, fn); return id; };
  window.cancelAnimationFrame = (id) => { rafs.delete(id); };
  const mc = new MessageChannel(); const q = [];
  mc.port1.onmessage = () => { const r = q.shift(); r && r(); };
  const flush = () => new Promise((r) => { q.push(r); mc.port2.postMessage(0); });
  const aStart = new WeakMap();
  function syncAnims() {
    for (const a of document.getAnimations()) {
      if (!aStart.has(a)) aStart.set(a, T);
      if (a.playState !== 'paused') a.pause();
      const ct = T - aStart.get(a);
      a.currentTime = ct;
    }
  }
  let busyStep = false;
  async function step(ms) {
    busyStep = true;
    const end = T + ms;
    for (;;) {
      let best = null;
      for (const [id, t] of timers) if (t.at <= end && (!best || t.at < best[1].at || (t.at === best[1].at && t.o < best[1].o))) best = [id, t];
      if (!best) break;
      const [id, t] = best;
      if (t.at > T) T = t.at;
      if (t.every) { t.at += t.every; t.o = seq++; } else timers.delete(id);
      try { typeof t.fn === 'function' ? t.fn(...t.args) : eval(t.fn); } catch (e) { console.error(e); }
      await flush();
    }
    T = end;
    const cur = rafs; rafs = new Map();
    for (const fn of cur.values()) { try { fn(T); } catch (e) { console.error(e); } }
    await flush();
    syncAnims();
    busyStep = false;
  }
  let auto = null;
  function setAuto(on) {
    if (on && !auto) auto = oSI(() => { if (!busyStep) step(16); }, 16);
    if (!on && auto) { oCI(auto); auto = null; }
  }
  // 快进时跳过 WebGL 绘制
  window.__ff = false;
  for (const P of [window.WebGL2RenderingContext?.prototype, window.WebGLRenderingContext?.prototype]) {
    if (!P) continue;
    for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements', 'clear']) {
      const f = P[k]; if (!f) continue;
      P[k] = function (...a) { if (window.__ff) return; return f.apply(this, a); };
    }
  }
  window.__vc = { step, setAuto, get T() { return T; }, syncAnims };
  setAuto(true);
})();
