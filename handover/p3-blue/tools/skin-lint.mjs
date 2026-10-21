#!/usr/bin/env node
// UMBRA 皮肤本地校验（三皮共用，不进仓库）。依据 TASK-THEMES v1.2：§0 §1 §2 §3 §4 §5 §7.3。
// 只做静态检查：JSON 时间轴 / 预算 / source / 插槽 / 模板 / index.ts import 规则。引擎实测（skin:check/timing）不在此。
// 用法：node skin-lint.mjs <skinDir> [--json]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const dir = path.resolve(process.argv[2] || '.');
const asJson = process.argv.includes('--json');
const errs = [], warns = [], info = {};
const E = (m) => errs.push(m), W = (m) => warns.push(m);
const rd = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const has = (f) => fs.existsSync(path.join(dir, f));
const KB = (n) => Math.round(n / 102.4) / 10;

// ---------- §3 事件上限（完整/标准，ms） ----------
const LIMIT = { 'battle:start': 900, 'turn:start': 300, action: 1800, 'unit:down': 500, onemore: 450, highlight: 3500,
  holdup: 1000, allout: 3500, 'talk:start': 800, 'talk:result': 1200, 'battle:end': 1500, 'scene:enter': 600,
  'scene:leave': 600, 'map:move': 800, 'map:encounter': 900, 'env:change': 600 };
const NOT_DIRECTOR = ['ui:open', 'ui:close'];
// ---------- §1 原语：时长上限 + 参数上限 ----------
const PRIM = {
  tween: {}, show: { inst: 1 }, hide: { inst: 1 }, sfx: { inst: 1 }, vibrate: { inst: 1, max: { ms: 40 } },
  title: { dur: 800 }, dim: { max: { alpha: 0.7 } }, radialBurst: { dur: 2200, max: { rays: 24 } },
  hitStop: { inst: 1, max: { ms: 90 } }, shake: { dur: 400, max: { px: 24 } }, flashSprite: { inst: 1, max: { ms: 60 } },
  flashScreen: { dur: 200, max: { alpha: 0.9, ms: 200 } }, squashHit: { inst: 1, max: { squash: 0.22, recoverMs: 320 } },
  particles: { inst: 1 }, afterimage: { dur: 300, max: { n: 3 } }, slashLine: { dur: 200 }, damageNumber: { dur: 1100 },
  tag: { dur: 920 }, shockwave: { dur: 520, max: { amp: 60 } }, rgbSplit: { dur: 150, max: { offset: 10 } },
  cutin: { dur: 560 }, speedLines: {}, banner: { dur: 450 }, silhouetteDash: { dur: 1800, max: { count: 8 }, min: { interval: 160 } },
  freezeFrame: { dur: 800, max: { ms: 800 } }, finishCard: { dur: 1000, max: { zoom: 1.04 } }, totalDamage: { dur: 800 },
  slashPanels: { dur: 900, min: { stagger: 50 } }, maskWipe: { dur: 900 }, blockPush: { dur: 900, max: { cols: 8, rows: 5 } },
  tvStatic: { dur: 600 }, glassShatter: { dur: 700, max: { shards: 40 } }, cardFlip: { dur: 500, max: { flips: 2 } },
  cardShatter: { dur: 600, max: { pieces: 24 } }, dateFlip: { dur: 900, max: { pages: 3 } }, bakedSwap: { dur: 400 },
  portraitDown: { dur: 600 }, skinFilter: {},
};
const LAYERS = ['bg', 'enemy', 'ally', 'fx', 'dmg', 'hud', 'cutin', 'allout', 'trans'];
const EASES = ['linear', 'outCubic', 'inCubic', 'outQuart', 'inOutCubic', 'outBack', 'outElastic'];
const PEAK = 600;

// ---------- manifest ----------
let manifest = { assets: [], fonts: [], filters: [] };
if (!has('manifest.json')) E('缺 manifest.json'); else manifest = rd('manifest.json');
const ids = new Set();
const files = new Map(); // file -> {first, src, w,h, isAtlas}
for (const a of manifest.assets || []) {
  if (ids.has(a.id)) E(`manifest 重复 id ${a.id}`); ids.add(a.id);
  if (!['official', 'generated'].includes(a.source)) E(`manifest ${a.id} source 非 official|generated`);
  if (typeof a.firstPack !== 'boolean') E(`manifest ${a.id} 缺 firstPack`);
  if (!(a.w > 0 && a.h > 0)) E(`manifest ${a.id} 缺 w/h`);
  if (!a.file || !has(a.file)) { E(`manifest ${a.id} 文件不存在 ${a.file}`); continue; }
  if (!/\.webp$/i.test(a.file)) E(`manifest ${a.id} 非 webp`);
  const f = files.get(a.file) || { first: false, srcs: new Set(), ids: [] };
  f.first = f.first || a.firstPack; f.srcs.add(a.source); f.ids.push(a.id);
  if (!a.atlas) { f.w = a.w; f.h = a.h; f.self = a; }
  files.set(a.file, f);
}
let imgFirst = 0, imgFirstN = 0, nOff = 0, nGen = 0;
for (const [file, f] of files) {
  const sz = fs.statSync(path.join(dir, file)).size;
  if (f.srcs.size > 1) E(`${file} 被标了多个 source`);
  const isAtlas = /atlas/i.test(file) || (f.ids.length > 1);
  if (isAtlas && (f.w > 2048 || f.h > 2048)) E(`${file} ${f.w}×${f.h} 图集超 2048²`);
  if (!isAtlas && (f.w > 2048 || f.h > 2048)) W(`${file} ${f.w}×${f.h} 单图超 2048（背景出血需要时属正常，注意低端机纹理上限）`);
  if (!isAtlas && sz > 200 * 1024) E(`${file} ${KB(sz)}KB > 200KB（单张全屏图）`);
  if (!isAtlas && f.w && f.w <= 1400 && (f.w > 1280 || f.h > 720)) W(`${file} ${f.w}×${f.h} 超 1280×720（非背景）`);
  if (f.first) { imgFirst += sz; imgFirstN++; }
  if (f.srcs.has('official')) nOff++; else nGen++;
}
info.images = { firstPackKB: KB(imgFirst), firstPackFiles: imgFirstN, officialFiles: nOff, generatedFiles: nGen,
  officialEntries: (manifest.assets || []).filter((a) => a.source === 'official').length,
  generatedEntries: (manifest.assets || []).filter((a) => a.source === 'generated').length };
if (imgFirst > 780 * 1024) E(`首包图 ${KB(imgFirst)}KB > 780KB`);
if (imgFirstN > 14) E(`首包图片 ${imgFirstN} 张 > 14`);
// 背景
for (const a of manifest.assets || []) if (/^bg\./.test(a.id) && !/tile/.test(a.id) && a.w < 2240) W(`${a.id} 宽 ${a.w} < 2240（若可平铺请在 id/note 标 tile）`);
// 字体
let fontKB = 0;
for (const f of manifest.fonts || []) {
  if (!['display', 'number'].includes(f.role)) E(`字体 ${f.family} role 非 display|number`);
  if (!has(f.file)) { E(`字体文件不存在 ${f.file}`); continue; }
  if (f.pack === 'first') fontKB += fs.statSync(path.join(dir, f.file)).size;
}
info.fontsKB = KB(fontKB);
if (fontKB > 120 * 1024) E(`首包字体 ${KB(fontKB)}KB > 120KB`);
for (const r of ['display', 'number']) if (!(manifest.fonts || []).some((f) => f.role === r)) E(`manifest.fonts 缺 ${r}`);
for (const f of manifest.filters || []) if (!['ColorMatrix', 'Displacement', 'CRT', 'Glitch'].includes(f)) E(`filters 非白名单 ${f}`);

// ---------- tokens ----------
if (has('tokens.json')) {
  const t = rd('tokens.json');
  const need = { color: ['primary', 'secondary', 'ink', 'paper', 'accent', 'hp', 'sp', 'weak', 'crit', 'resist', 'shadow', 'overlay'],
    font: ['display', 'body', 'number'], stroke: ['thin', 'bold'], shape: ['slant', 'radius', 'panelSkew'],
    motion: ['uiOpen', 'uiClose', 'press'], ease: ['enter', 'exit', 'pop'], hud: ['commandShape', 'commandLayout', 'partyStyle'] };
  for (const [k, arr] of Object.entries(need)) for (const f of arr) if (t?.[k]?.[f] === undefined || t[k][f] === '') E(`tokens.${k}.${f} 缺`);
  if (t.motion && (t.motion.uiOpen < 180 || t.motion.uiOpen > 280)) E('tokens.motion.uiOpen 不在 180–280');
  for (const k of ['enter', 'exit', 'pop']) if (t.ease && !EASES.includes(t.ease[k])) E(`tokens.ease.${k} 非法`);
  if (t.hud && !['arc', 'list', 'grid', 'custom'].includes(t.hud.commandShape)) E('commandShape 非法');
  if (t.hud && !['fivePlusMore', 'twoColumn'].includes(t.hud.commandLayout)) E('commandLayout 非法');
  if (t.hud && !['card', 'bar', 'portrait'].includes(t.hud.partyStyle)) E('partyStyle 非法');
  const fams = (manifest.fonts || []).map((f) => f.family);
  for (const r of ['display', 'number']) if (t.font && !fams.some((fm) => String(t.font[r]).includes(fm))) E(`tokens.font.${r} 未引用 manifest 字体族`);
} else E('缺 tokens.json');

// ---------- labels ----------
let labels = {};
if (has('labels.json')) {
  labels = rd('labels.json');
  for (const k of ['requestBoard', 'heartCard', 'holdup', 'allout', 'onemore', 'highlight', 'rank', 'world', 'dive', 'totalDamage', 'more', 'darkHour'])
    if (!labels['label.' + k]) E(`labels 缺 label.${k}`);
} else E('缺 labels.json');

// ---------- slots ----------
const inRect = (r, R) => r.x >= R.x && r.y >= R.y && r.x + r.w <= R.x + R.w && r.y + r.h <= R.y + R.h;
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
if (has('slots.json')) {
  const s = rd('slots.json');
  for (const k of ['hud.order', 'hud.system', 'hud.enemyOver', 'hud.party', 'hud.command', 'hud.intent', 'fx.allout', 'scene.battle.bg', 'scene.map.bg', 'scene.hub.bg'])
    if (!s[k]) E(`slots 缺必填 ${k}`);
  const portraits = Object.keys(s).filter((k) => /^unit\..+\.portrait$/.test(k));
  if (portraits.length < 4) E(`我方立绘 ${portraits.length} < 4`);
  for (const k of portraits) {
    const p = s[k]; if ((p.layers || []).length > 5) E(`${k} 层数 > 5`);
    const m = p.meshIdle; if (!m) { W(`${k} 无 meshIdle`); continue; }
    if (m.breath < 0.009 || m.breath > 0.012) E(`${k} breath 越界`);
    if (m.period < 2600 || m.period > 3500) E(`${k} period 越界`);
    if (m.swayPx > 9) E(`${k} swayPx > 9`);
    const z = m.swayZone;
    if (typeof z === 'string') { if (!(p.layers || []).includes(z)) E(`${k} swayZone 图层名不在 layers`); }
    else if (Array.isArray(z)) for (const poly of z) { if (!Array.isArray(poly) || poly.length < 6 || poly.length % 2) E(`${k} swayZone 多边形格式错`);
      else if (p.size && poly.some((v, i) => v < 0 || v > p.size[i % 2])) E(`${k} swayZone 超出立绘尺寸`); }
    else E(`${k} swayZone 缺`);
  }
  const heroCut = Object.keys(s).some((k) => /^unit\..+\.cutin$/.test(k)), heroHl = Object.keys(s).some((k) => /^unit\..+\.highlight$/.test(k));
  if (!heroCut) E('缺主角 unit.<id>.cutin'); if (!heroHl) E('缺主角 unit.<id>.highlight');
  const C = s['hud.command'];
  if (C) {
    const R = { x: 780, y: 220, w: 476, h: 476 };
    const items = [...(C.items || []), ...(C.more ? [C.more] : [])];
    if (C.layout === 'fivePlusMore') { if ((C.items || []).length > 5) E('fivePlusMore 超 5 项'); if (!C.more) E('fivePlusMore 缺 more'); if (!labels['label.more']) E('fivePlusMore 缺 label.more'); }
    items.forEach((it, i) => {
      if (!inRect(it.rect, R)) E(`指令 ${it.id} 出 hud.command 范围`);
      const min = it.primary ? 96 : 86; if (it.rect.w < min || it.rect.h < min) E(`指令 ${it.id} 命中区 < ${min}`);
      items.slice(i + 1).forEach((jt) => { if (overlap(it.rect, jt.rect)) E(`指令 ${it.id} 与 ${jt.id} 重叠`); });
    });
    if (!items.some((i) => i.primary)) W('指令区没有主按钮');
    if (C.more?.menu && !inRect(C.more.menu.rect, R)) E('更多菜单出 hud.command 范围');
    if (C.more?.menu && (C.more.menu.itemW < 86 || C.more.menu.itemH < 86)) E('更多菜单项 < 86');
  }
  const S = s['hud.system'];
  if (S) for (const b of S.buttons || []) { const h = b.hit || b.rect; if (h.w < 86 || h.h < 86) E(`hud.system ${b.id} 命中区 < 86`);
    if (!inRect(h, { x: 1000, y: 24, w: 256, h: 66 })) W(`hud.system ${b.id} 命中区出插槽范围（x1000–1256,y24–90）`); }
  const rects = { 'hud.order': { x: 24, y: 24, w: 496, h: 86 }, 'hud.party': { x: 24, y: 600, w: 636, h: 96 }, 'hud.topInfo': { x: 520, y: 24, w: 480, h: 66 } };
  for (const [k, R] of Object.entries(rects)) if (s[k]?.rect && !inRect(s[k].rect, R)) E(`${k} 出范围`);
} else E('缺 slots.json');

// ---------- templates ----------
if (has('templates.json')) {
  const t = rd('templates.json'); const h = t.talk?.html || '';
  const OK = new Set('section div span p ul ol li button img input textarea header footer strong em br'.split(' '));
  for (const m of h.matchAll(/<\s*\/?\s*([a-zA-Z0-9-]+)/g)) if (!OK.has(m[1].toLowerCase())) E(`模板标签不在白名单 <${m[1]}>`);
  if (/\son[a-z]+\s*=/i.test(h)) E('模板含 on* 事件');
  if (/\s(src|href|srcset)\s*=/i.test(h)) E('模板含 src/href/srcset');
  if (/url\(/i.test(h)) E('模板含 url()');
  for (const sl of ['line', 'choices', 'choice']) if (!h.includes(`data-slot="${sl}"`)) E(`模板缺 data-slot=${sl}`);
  if (h.includes('data-slot="input"') !== h.includes('data-slot="send"')) E('input/send 必须成对');
  for (const m of h.matchAll(/data-asset="([^"]+)"/g)) if (!ids.has(m[1])) E(`模板 data-asset ${m[1]} 不在 manifest`);
}
// ---------- ui.css ----------
let cssGz = 0;
if (has('ui.css')) {
  const css = fs.readFileSync(path.join(dir, 'ui.css'), 'utf8'); cssGz = zlib.gzipSync(css).length;
  if (/@import/i.test(css)) E('ui.css 含 @import');
  if (/url\(\s*['"]?(https?:|\/\/)/i.test(css)) E('ui.css 外链 url()');
  const id = path.basename(dir);
  for (const rule of css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@keyframes[^{]+\{([^{}]*\{[^}]*\})*[^}]*\}/g, '').split('}')) {
    const sel = rule.split('{')[0].trim(); if (!sel || sel.startsWith('@')) continue;
    for (const one of sel.split(',')) if (!one.trim().startsWith(`.umbra-skin-${id}`)) E(`ui.css 选择器不在根下: ${one.trim()}`);
  }
  if (/transition\s*:[^;]*(width|height|top|left|margin|padding)/i.test(css)) W('ui.css transition 含布局属性');
}
info.uiCssGzKB = KB(cssGz);
if (cssGz > 24 * 1024) E('ui.css gzip > 24KB');

// ---------- index.ts ----------
if (has('index.ts')) {
  const ts = fs.readFileSync(path.join(dir, 'index.ts'), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  if (/\bimport\s*\(/.test(ts)) E('index.ts 动态 import()');
  if (/\brequire\s*\(/.test(ts)) E('index.ts require');
  if (/import\.meta\.glob/.test(ts)) E('index.ts import.meta.glob');
  if (/^\s*import\s+['"]/m.test(ts)) E('index.ts 副作用导入');
  for (const m of ts.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const p = m[1]; const ok = /(^|\/)engine(\/index)?$/.test(p) || /_contract/.test(p) || /^\.\/[\w./-]+\.json$/.test(p);
    if (!ok) E(`index.ts import 不在白名单: ${p}`);
  }
  if (!/registerSkin\s*\(/.test(ts)) E('index.ts 未调用 registerSkin');
  if (/\b(function|=>)\b[\s\S]*\b(setTimeout|requestAnimationFrame|new\s+\w*Filter|PIXI)\b/.test(ts)) E('index.ts 疑似演出代码');
  if (/localStorage|indexedDB|Dexie|postMessage|fetch\s*\(|XMLHttpRequest|WebSocket/.test(ts)) E('index.ts 存储/网络调用');
} else E('缺 index.ts');

// ---------- recipes ----------
const recDir = path.join(dir, 'recipes');
const recipes = fs.existsSync(recDir) ? fs.readdirSync(recDir).filter((f) => f.endsWith('.json')).sort() : [];
let dataBytes = 0;
const recTable = [];
const rids = new Set();
const assetRefKeys = ['art', 'artId', 'asset', 'cardArt'];
function collectAssetRefs(v, out) {
  if (Array.isArray(v)) v.forEach((x) => collectAssetRefs(x, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) {
    if (assetRefKeys.includes(k) && typeof x === 'string' && !x.startsWith('$') && !x.startsWith('#')) out.push(x);
    else if (k === 'frames' && Array.isArray(x)) x.forEach((f) => typeof f === 'string' && out.push(f));
    else collectAssetRefs(x, out);
  }
}
for (const f of recipes) {
  const raw = fs.readFileSync(path.join(recDir, f), 'utf8'); dataBytes += zlib.gzipSync(raw).length;
  let r; try { r = JSON.parse(raw); } catch (e) { E(`${f} JSON 解析失败`); continue; }
  const tag = `${f}(${r.id})`;
  if (rids.has(r.id)) E(`${tag} id 重复`); rids.add(r.id);
  if (NOT_DIRECTOR.includes(r.event)) E(`${tag} ui:open/close 不进 Director，不应写 recipe`);
  if (!(r.event in LIMIT)) { E(`${tag} event 非法 ${r.event}`); continue; }
  let lim = LIMIT[r.event];
  if (r.event === 'action' && /^action\.default$/.test(r.id)) lim = 1000;
  if (r.event === 'action' && r.match?.side === 'enemy') lim = 1500;
  if (r.event === 'highlight' && (/short/i.test(r.id) || r.match?.short)) lim = 1200;
  if (r.merges) { if (r.event !== 'map:encounter') E(`${tag} merges 只能用于 map:encounter`); lim = 1200; }
  if (!(r.duration > 0)) E(`${tag} 缺 duration`);
  if (r.duration > lim) E(`${tag} duration ${r.duration} > 上限 ${lim}`);
  // 展开 repeatEvery
  const tracks = [];
  for (const t of r.tracks || []) {
    if ((t.repeatEvery == null) !== (t.times == null)) E(`${tag} repeatEvery/times 必须同时出现`);
    const n = t.times || 1;
    for (let i = 0; i < n; i++) tracks.push({ ...t, at: t.at + i * (t.repeatEvery || 0), _i: i });
  }
  if (tracks.length > 64) E(`${tag} 展开后轨道 ${tracks.length} > 64`);
  const created = new Set((r.create || []).map((c) => '#' + c.name));
  for (const c of r.create || []) { if (!ids.has(c.asset)) E(`${tag} create.asset ${c.asset} 不在 manifest`); if (!LAYERS.includes(c.layer)) E(`${tag} create.layer 非法`); }
  const parts = [];
  let endMax = 0;
  for (const t of tracks) {
    const P = PRIM[t.prim]; const a = t.args || {};
    if (!P) { E(`${tag} 未知原语 ${t.prim}`); continue; }
    if (t.layer && !LAYERS.includes(t.layer)) E(`${tag} ${t.prim} layer 非法`);
    if (t.ease && !EASES.includes(t.ease)) E(`${tag} ${t.prim} ease 非法`);
    if (t.at < 0) E(`${tag} ${t.prim} at < 0`);
    let end = t.at + (t.dur || 0);
    if (P.dur && (t.dur || 0) > P.dur) E(`${tag} ${t.prim}@${t.at} dur ${t.dur} > 原语上限 ${P.dur}`);
    if (!P.inst && !P.dur && t.prim !== 'tween' && t.prim !== 'show' && t.dur == null && !['speedLines', 'skinFilter'].includes(t.prim)) W(`${tag} ${t.prim}@${t.at} 未写 dur`);
    for (const [k, v] of Object.entries(P.max || {})) if (typeof a[k] === 'number' && a[k] > v) E(`${tag} ${t.prim}.${k}=${a[k]} > ${v}`);
    for (const [k, v] of Object.entries(P.min || {})) if (typeof a[k] === 'number' && a[k] < v) E(`${tag} ${t.prim}.${k}=${a[k]} < ${v}`);
    if (t.prim === 'hitStop' && typeof a.ms === 'number') end = Math.max(end, t.at + a.ms);
    if (t.prim === 'flashSprite' && typeof a.ms === 'number') end = Math.max(end, t.at + a.ms);
    if (t.prim === 'squashHit') end = Math.max(end, t.at + 50 + (a.recoverMs || 0));
    if (t.prim === 'freezeFrame' && typeof a.ms === 'number') { end = Math.max(end, t.at + a.ms); if (t.dur != null && a.ms > t.dur) E(`${tag} freezeFrame ms > dur`); }
    if (t.prim === 'shake' && t.dur == null) end = Math.max(end, t.at + 400);
    if (t.prim === 'particles') {
      if (!(a.life > 0)) E(`${tag} particles@${t.at} 缺 life`); else if (a.life > 900) E(`${tag} particles life ${a.life} > 900`);
      end = Math.max(end, t.at + (a.life || 0));
      parts.push([t.at, t.at + (a.life || 0), a.count || 0]);
    }
    if (t.prim === 'cutin') {
      const sl = a.speedLines || {}; if (sl.layers > 2) E(`${tag} cutin speedLines.layers > 2`); if (sl.count > 46) E(`${tag} cutin speedLines.count > 46`);
      if ((a.panels || []).length < 1 || (a.panels || []).length > 4) E(`${tag} cutin panels 1–4`);
    }
    if (t.prim === 'slashPanels' && (a.colors || []).length > 4) E(`${tag} slashPanels colors > 4`);
    if (t.prim === 'maskWipe' && Array.isArray(a.shape) && a.shape.length / 2 > 64) E(`${tag} maskWipe 顶点 > 64`);
    if (t.prim === 'dim' && t.dur == null) E(`${tag} dim 需要 dur`);
    if (t.prim === 'skinFilter' && !(manifest.filters || []).includes(a.kind || a.filter)) E(`${tag} skinFilter 未在 manifest.filters 声明`);
    if (t.prim === 'damageNumber' && ('value' in a || 'text' in a)) E(`${tag} damageNumber 不能填数字`);
    for (const ref of JSON.stringify(a).match(/"#[\w.-]+"/g) || []) { const n = ref.slice(1, -1); if (/^#[0-9a-fA-F]{3,8}$/.test(n)) continue; if (!created.has(n) && !/^#layer\./.test(n)) E(`${tag} 引用未创建节点 ${n}`); }
    if (typeof t.minimal === 'object' && t.minimal && t.minimal.dur != null && t.minimal.dur > (t.dur || Infinity)) W(`${tag} ${t.prim} minimal.dur 大于 dur`);
    if (end > r.duration) E(`${tag} ${t.prim}@${t.at}${t._i ? '#' + t._i : ''} 结束 ${end} > duration ${r.duration}`);
    endMax = Math.max(endMax, end);
  }
  // 滤镜错开
  const fl = tracks.filter((t) => t.prim === 'rgbSplit' || t.prim === 'shockwave').map((t) => t.at).sort((a, b) => a - b);
  for (let i = 1; i < fl.length; i++) if (fl[i] - fl[i - 1] < 150) E(`${tag} rgbSplit/shockwave 起点相距 ${fl[i] - fl[i - 1]} < 150`);
  // 粒子峰值
  let peak = 0; for (const [s] of parts) { const c = parts.filter(([a, b]) => a <= s && s < b).reduce((x, p) => x + p[2], 0); peak = Math.max(peak, c); }
  if (peak > PEAK) E(`${tag} 高档粒子峰值 ${peak} > ${PEAK}`);
  // hitMarks
  const hm = r.hitMarks || [];
  hm.forEach((h, i) => { if (h < 0) E(`${tag} hitMark 负数`); if (i && h <= hm[i - 1]) E(`${tag} hitMarks 非升序`); });
  if (hm.length && hm[hm.length - 1] > r.duration - 200) E(`${tag} 末个 hitMark ${hm[hm.length - 1]} > duration−200`);
  if (['action', 'allout', 'highlight'].includes(r.event) && !hm.length) W(`${tag} 无 hitMarks`);
  // 素材引用
  const refs = []; collectAssetRefs(r.tracks, refs);
  for (const x of new Set([...refs, ...(r.assets || [])])) if (!ids.has(x)) E(`${tag} 素材 ${x} 不在 manifest`);
  for (const x of new Set(refs)) if (!(r.assets || []).includes(x) && !(r.create || []).some((c) => c.asset === x)) W(`${tag} 用到 ${x} 但未列入 assets`);
  if (r.event === 'allout') { if (!tracks.some((t) => t.prim === 'finishCard')) E(`${tag} allout 缺 finishCard`); if (!tracks.some((t) => t.prim === 'freezeFrame')) E(`${tag} allout 缺 freezeFrame`); }
  // label key
  for (const m of JSON.stringify(r.tracks).matchAll(/"(label\.[\w.-]+|skill\.[\w.-]+\.name)"/g)) if (!labels[m[1]]) W(`${tag} 文案 key ${m[1]} 不在 labels`);
  recTable.push({ id: r.id, event: r.event, duration: r.duration, limit: lim, tracks: tracks.length, lastEnd: endMax, particlePeak: peak, hitMarks: hm.length });
}
for (const f of ['manifest.json', 'labels.json', 'templates.json', 'tokens.json', 'slots.json']) if (has(f)) dataBytes += zlib.gzipSync(fs.readFileSync(path.join(dir, f))).length;
for (const a of new Set((manifest.assets || []).filter((x) => x.atlas).map((x) => x.file.replace(/\.webp$/, '.json')))) if (has(a)) dataBytes += zlib.gzipSync(fs.readFileSync(path.join(dir, a))).length;
info.dataGzKB = KB(dataBytes);
if (dataBytes > 40 * 1024) E(`数据 gzip ${KB(dataBytes)}KB > 40KB`);
info.skinFirstPackKB = Math.round((imgFirst + dataBytes + cssGz + fontKB) / 102.4) / 10;
if (imgFirst + dataBytes + cssGz + fontKB > 964 * 1024) E('皮肤首包份额 > 964KB');
info.recipes = recTable;

if (asJson) console.log(JSON.stringify({ dir, errors: errs, warnings: warns, info }, null, 1));
else {
  console.log(`skin-lint ${dir}`);
  console.log('INFO', JSON.stringify({ ...info, recipes: undefined }));
  console.table(recTable);
  warns.forEach((w) => console.log('WARN ', w));
  errs.forEach((e) => console.log('ERROR', e));
  console.log(errs.length ? `✗ ${errs.length} errors, ${warns.length} warnings` : `✓ 0 errors, ${warns.length} warnings`);
}
process.exit(errs.length ? 1 : 0);
