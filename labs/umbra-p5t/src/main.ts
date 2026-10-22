// 灰盒表现层：three.js 方块 + HTML HUD。只读 Battle 状态、只调用 Battle 指令、只消费事件。
import * as THREE from 'three';
import { Battle, testMap, key, eq } from './rules';
import type { BattleEvent, SkillDef, Unit, Vec } from './rules';

type Mode = 'auto' | 'melee' | 'gun' | 'skill';

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
const canvas = $<HTMLCanvasElement>('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.shadowMap.enabled = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x141418);
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
scene.add(new THREE.HemisphereLight(0xffffff, 0x302020, 1.4));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(6, 12, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

const COLORS: Record<string, number> = { joker: 0x1a1a1a, skull: 0xf2c200, panther: 0xe8335a };
const TILE = 1;

let battle: Battle;
let world: THREE.Group;
let overlay: THREE.Group;
const unitMesh = new Map<string, THREE.Group>();
const labelEl = new Map<string, HTMLDivElement>();
const tileMeshes: THREE.Mesh[] = [];

// UI 状态
let selected: string | null = null;
let mode: Mode = 'auto';
let skillId: string | null = null;
let previewTile: Vec | null = null;
let previewTarget: string | null = null;
let showThreat = false;
let inspectEnemy: string | null = null;
let busy = false;

const w2v = (p: Vec, y = 0) => new THREE.Vector3(p.x * TILE, y, p.y * TILE);

function build() {
  if (world) scene.remove(world);
  world = new THREE.Group();
  overlay = new THREE.Group();
  scene.add(world);
  world.add(overlay);
  unitMesh.clear();
  tileMeshes.length = 0;
  $('#labels').innerHTML = '';
  labelEl.clear();
  const m = battle.map;
  const floorGeo = new THREE.BoxGeometry(0.96, 0.2, 0.96);
  for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
    const t = m.tiles[y][x];
    const light = (x + y) % 2 === 0;
    const mat = new THREE.MeshStandardMaterial({ color: t === 'exit' ? 0x2a6b3a : light ? 0x3b3b44 : 0x33333b, roughness: 0.9 });
    const tile = new THREE.Mesh(floorGeo, mat);
    tile.position.copy(w2v({ x, y }, -0.1));
    tile.receiveShadow = true;
    tile.userData = { x, y };
    world.add(tile);
    tileMeshes.push(tile);
    if (t === 'wall' || t === 'half' || t === 'full') {
      const h = t === 'wall' ? 1.6 : t === 'full' ? 1.1 : 0.5;
      const col = t === 'wall' ? 0x55555f : t === 'full' ? 0x8a1f24 : 0xb5623a;
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, h, 0.9), new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 }));
      b.position.copy(w2v({ x, y }, h / 2));
      b.castShadow = true; b.receiveShadow = true;
      b.userData = { x, y };
      world.add(b);
      tileMeshes.push(b);
    }
  }
  for (const u of battle.units) {
    const g = new THREE.Group();
    const col = u.side === 'ally' ? COLORS[u.id] ?? 0xffffff : 0x7a0d18;
    const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, emissive: u.side === 'enemy' ? 0x220000 : 0x000000 });
    if (u.side === 'ally') {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.55, 16), mat);
      body.position.y = 0.3;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat);
      head.position.y = 0.75;
      const mask = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.05), new THREE.MeshStandardMaterial({ color: u.id === 'joker' ? 0xffffff : 0x111111 }));
      mask.position.set(0, 0.78, 0.18);
      g.add(body, head, mask);
    } else {
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.9, 6), mat);
      body.position.y = 0.45;
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.06), new THREE.MeshStandardMaterial({ color: 0xffd400, emissive: 0xffd400 }));
      eye.position.set(0, 0.55, 0.2);
      g.add(body, eye);
    }
    g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.userData = { unit: u.id }; } });
    g.position.copy(w2v(u.pos));
    g.userData = { unit: u.id };
    world.add(g);
    unitMesh.set(u.id, g);
    const el = document.createElement('div');
    el.className = `lbl ${u.side}`;
    $('#labels').appendChild(el);
    labelEl.set(u.id, el);
  }
  fitCamera();
}

function fitCamera() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  const m = battle.map;
  const center = new THREE.Vector3((m.width - 1) / 2, 0, (m.height - 1) / 2);
  // 斜 45° 俯视
  const dir = new THREE.Vector3(1, 1.25, 1).normalize();
  camera.position.copy(center).addScaledVector(dir, 30);
  camera.lookAt(center);
  camera.updateMatrixWorld();
  // 求地图四角在相机空间的包围盒，自动缩放；留出左右 HUD 空间
  const pts = [[-0.5, -0.5], [m.width - 0.5, -0.5], [-0.5, m.height - 0.5], [m.width - 0.5, m.height - 0.5]]
    .flatMap(([x, z]) => [new THREE.Vector3(x, 0, z), new THREE.Vector3(x, 1.2, z)]);
  const inv = camera.matrixWorldInverse;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) { const q = p.clone().applyMatrix4(inv); minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x); minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y); }
  const aspect = w / h;
  const padX = 1.18 + (aspect > 1.6 ? 0.25 : 0.05), padY = 1.12;
  let halfW = ((maxX - minX) / 2) * padX, halfH = ((maxY - minY) / 2) * padY;
  if (halfW / halfH < aspect) halfW = halfH * aspect; else halfH = halfW / aspect;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2 - halfH * 0.04;
  camera.left = cx - halfW; camera.right = cx + halfW; camera.top = cy + halfH; camera.bottom = cy - halfH;
  camera.updateProjectionMatrix();
}

// ---------- 覆盖层（蓝格、红格、路线、三角） ----------
function clearOverlay() { while (overlay.children.length) overlay.remove(overlay.children[0]); }
function tileQuad(p: Vec, color: number, opacity = 0.45, y = 0.02) {
  const q = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.92), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  q.rotation.x = -Math.PI / 2;
  q.position.copy(w2v(p, y));
  overlay.add(q);
}
function ring(p: Vec, color: number) {
  const r = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.46, 24), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
  r.rotation.x = -Math.PI / 2;
  r.position.copy(w2v(p, 0.04));
  overlay.add(r);
}
function pathLine(path: Vec[]) {
  if (path.length < 2) return;
  const pts = path.map((p) => w2v(p, 0.08));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.05);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, path.length * 8, 0.06, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  overlay.add(tube);
  const end = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  end.position.copy(w2v(path[path.length - 1], 0.35));
  end.rotation.x = Math.PI;
  overlay.add(end);
}
function triangleMesh(ids: string[], color = 0xffd400) {
  const ps = ids.map((id) => battle.unit(id).pos);
  const geo = new THREE.BufferGeometry().setFromPoints(ps.map((p) => w2v(p, 0.05)));
  geo.setIndex([0, 1, 2]);
  overlay.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })));
  const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ps.map((p) => w2v(p, 0.07))), new THREE.LineBasicMaterial({ color }));
  overlay.add(line);
}

function attackFrom(u: Unit, from: Vec, t: Unit): { kind: 'melee' | 'gun' | 'skill'; skill?: SkillDef } | null {
  const sk = skillId ? u.skills.find((s) => s.id === skillId) : u.skills[0];
  if (mode === 'melee') return battle.canMelee(u, t, from) ? { kind: 'melee' } : null;
  if (mode === 'gun') return battle.canShoot(u, t, from) ? { kind: 'gun' } : null;
  if (mode === 'skill') return sk && battle.canSkill(u, sk, t, from) ? { kind: 'skill', skill: sk } : null;
  if (battle.canMelee(u, t, from)) return { kind: 'melee' };
  if (battle.canShoot(u, t, from)) return { kind: 'gun' };
  return null;
}

function refreshOverlay() {
  clearOverlay();
  if (battle.phase !== 'player') return;
  if (showThreat || inspectEnemy) {
    for (const it of battle.intents) {
      if (inspectEnemy && it.enemyId !== inspectEnemy) continue;
      if (battle.unit(it.enemyId).ko) continue;
      for (const p of it.threatTiles) tileQuad(p, 0xff2030, 0.28, 0.015);
      if (it.targetId && inspectEnemy) ring(battle.unit(it.targetId).pos, 0xff2030);
    }
  }
  const pt = battle.pendingTriple;
  if (pt) triangleMesh(battle.alive('ally').map((a) => a.id));
  if (!selected) return;
  const u = battle.unit(selected);
  ring(u.pos, 0xffffff);
  for (const p of battle.moveTiles(u)) tileQuad(p, 0x2a8cff, 0.42);
  if (!eq(u.anchor, u.pos)) tileQuad(u.anchor, 0x2a8cff, 0.25);
  const from = previewTile ?? u.pos;
  if (previewTile) { pathLine(battle.pathFor(u, previewTile)); tileQuad(previewTile, 0xffffff, 0.55, 0.03); }
  if (!u.acted) for (const e of battle.alive('enemy')) if (attackFrom(u, from, e)) ring(e.pos, previewTarget === e.id ? 0xffd400 : 0xe60012);
}

// ---------- HUD ----------
function refreshHud() {
  $('#turn').textContent = `TURN ${battle.turn}`;
  const ph = $('#phase');
  ph.textContent = battle.phase === 'enemy' ? 'ENEMY PHASE' : battle.phase === 'player' ? 'PLAYER PHASE' : battle.phase.toUpperCase();
  ph.classList.toggle('enemy', battle.phase === 'enemy');
  const card = $('#unit-card');
  const u = selected ? battle.unit(selected) : inspectEnemy ? battle.unit(inspectEnemy) : null;
  if (u) {
    card.classList.remove('hidden');
    const gun = u.gun ? `枪 ${u.gun.power}/${u.gun.range}格${Number.isFinite(u.ammo) ? ` 弹${u.ammo}` : ''}` : '';
    const st = [u.oneMore ? '1 MORE' : '', u.acted ? '已行动' : '', u.downed ? '倒地' : '', battle.grid.hasAnyCover(u.pos) && !u.resistBroken ? '掩护中' : '', ...u.status.map((s) => s.id)].filter(Boolean).join(' · ');
    card.innerHTML = `<div><div class="name">${u.name}</div>
      <div>HP ${u.hp}/${u.maxHp}</div><div class="bar"><i style="width:${(100 * u.hp) / u.maxHp}%"></i></div>
      ${u.maxSp ? `<div>SP ${u.sp}/${u.maxSp}</div><div class="bar sp"><i style="width:${(100 * u.sp) / u.maxSp}%"></i></div>` : ''}
      <div>移动 ${battle.moveRange(u)} · 近战 ${u.melee} · ${gun}</div><div>${st}</div></div>`;
  } else card.classList.add('hidden');
  const sel = selected ? battle.unit(selected) : null;
  document.querySelectorAll<HTMLButtonElement>('#actions button').forEach((b) => {
    const a = b.dataset.act!;
    b.classList.toggle('sel', a === mode);
    if (a === 'triple') b.classList.toggle('hidden', !battle.pendingTriple);
    else if (a === 'end') b.disabled = battle.phase !== 'player' || busy;
    else b.disabled = !sel || sel.acted || busy || battle.phase !== 'player';
  });
  const sk = $('#skills');
  if (mode === 'skill' && sel) {
    sk.classList.remove('hidden');
    sk.innerHTML = sel.skills.map((s) => `<button data-skill="${s.id}" class="${s.id === skillId ? 'sel' : ''}" ${sel.sp < s.sp ? 'disabled' : ''}>${s.name} · SP${s.sp} · ${s.range}格${s.radius ? ` 范围${s.radius}` : ''}</button>`).join('');
  } else sk.classList.add('hidden');
  // 预览卡
  const pv = $('#preview');
  if (busy) pv.classList.add('hidden');
  else if (sel && previewTarget) {
    const t = battle.unit(previewTarget);
    const from = previewTile ?? sel.pos;
    const direct = attackFrom(sel, from, t);
    const via = direct ? null : meleeViaMove(sel, t);
    const at: { kind: 'melee' | 'gun' | 'skill'; skill?: SkillDef } | null = direct ?? (via ? { kind: 'melee' } : null);
    if (at) {
      const kind = at.kind;
      const p = battle.previewDamage(sel, t, kind, at.skill, via ? via.via : from);
      pv.classList.remove('hidden');
      pv.innerHTML = `${kind === 'melee' ? '近战' : kind === 'gun' ? '枪击' : at.skill!.name} → ${t.name}　伤害 ${p.amount}${p.miss ? '（全掩体挡住）' : p.resist ? '（掩护中·减伤）' : ''}<br/>${p.willDown ? '<span class="getem">GET EM!!</span>' : ''}　再点一次确认`;
    } else pv.classList.add('hidden');
  } else if (sel && previewTile) {
    pv.classList.remove('hidden');
    pv.innerHTML = '再点一次同一格确认移动';
  } else pv.classList.add('hidden');
}

function meleeViaMove(u: Unit, t: Unit): { kind: 'melee'; via: Vec } | null {
  if (u.acted || (mode !== 'auto' && mode !== 'melee')) return null;
  const tiles = [u.pos, ...battle.moveTiles(u)];
  let best: Vec | null = null;
  for (const p of tiles) if (battle.canMelee(u, t, p) && (!best || battle.grid.hasAnyCover(p) > battle.grid.hasAnyCover(best))) best = p;
  return best ? { kind: 'melee', via: best } : null;
}

function refreshLabels() {
  const w = window.innerWidth, h = window.innerHeight;
  for (const u of battle.units) {
    const el = labelEl.get(u.id)!;
    const g = unitMesh.get(u.id)!;
    g.visible = !u.ko;
    if (u.ko) { el.style.display = 'none'; continue; }
    const v = g.position.clone().add(new THREE.Vector3(0, 1.05, 0)).project(camera);
    el.style.display = '';
    el.style.left = `${((v.x + 1) / 2) * w}px`;
    el.style.top = `${((1 - v.y) / 2) * h}px`;
    const res = battle.grid.hasAnyCover(u.pos) && !u.resistBroken && !u.status.length;
    el.innerHTML = `${u.name.split(' ').pop()}${u.downed ? '<span class="tag down">DOWN</span>' : res ? '<span class="tag res">盾</span>' : ''}${u.oneMore ? '<span class="tag">1MORE</span>' : ''}<div class="hp"><i style="width:${(100 * u.hp) / u.maxHp}%"></i></div>`;
    g.rotation.z = u.downed ? 1.2 : 0;
    g.position.y = u.downed ? 0.15 : 0;
    g.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (m && 'opacity' in m && u.side === 'ally') { m.transparent = true; m.opacity = u.acted && battle.phase === 'player' ? 0.55 : 1; } });
  }
}

function refreshAll() { refreshOverlay(); refreshHud(); }

// ---------- 事件动画 ----------
function banner(text: string, yellow = false) {
  const b = $('#banner');
  b.textContent = text;
  b.className = yellow ? 'yellow' : '';
  void b.offsetWidth;
  b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
}
function toast(text: string) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.remove('hidden');
  clearTimeout((toast as unknown as { h: number }).h);
  (toast as unknown as { h: number }).h = window.setTimeout(() => t.classList.add('hidden'), 1600);
}
function popDamage(unitId: string, text: string) {
  const g = unitMesh.get(unitId)!;
  const v = g.position.clone().add(new THREE.Vector3(0, 1.2, 0)).project(camera);
  const el = document.createElement('div');
  el.className = 'dmg';
  el.textContent = text;
  el.style.left = `${((v.x + 1) / 2) * window.innerWidth}px`;
  el.style.top = `${((1 - v.y) / 2) * window.innerHeight}px`;
  $('#labels').appendChild(el);
  setTimeout(() => el.remove(), 950);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function tweenPath(id: string, path: Vec[], msPerTile = 90) {
  const g = unitMesh.get(id)!;
  for (let i = 1; i < path.length; i++) {
    const a = w2v(path[i - 1]), b = w2v(path[i]);
    const t0 = performance.now();
    await new Promise<void>((res) => {
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / msPerTile);
        g.position.lerpVectors(a, b, k);
        if (k < 1) requestAnimationFrame(step); else res();
      };
      step();
    });
  }
}

const SPEED = Number(new URLSearchParams(location.search).get('speed') ?? '1');
async function play(events: BattleEvent[]) {
  busy = true;
  refreshHud();
  for (const e of events) {
    switch (e.type) {
      case 'phaseStart':
        if (e.phase === 'enemy') { banner('ENEMY PHASE'); refreshHud(); await sleep(700 / SPEED); }
        if (e.phase === 'player' && e.turn > 1) { banner(`TURN ${e.turn}`); await sleep(500 / SPEED); }
        break;
      case 'move': await tweenPath(e.unitId, e.path.length ? e.path : [e.from, battle.unit(e.unitId).pos], 90 / SPEED); break;
      case 'knockback': if (!e.blocked) await tweenPath(e.unitId, [e.from, e.to], 80 / SPEED); else popDamage(e.unitId, e.collidedWith ? '撞击!' : '挡住'); break;
      case 'meleeStep': unitMesh.get(e.unitId)!.position.copy(w2v(e.to)); break;
      case 'damage': popDamage(e.unitId, `${e.amount}${e.resist ? '▼' : ''}`); await sleep(260 / SPEED); break;
      case 'miss': popDamage(e.unitId, 'MISS'); await sleep(260 / SPEED); break;
      case 'down': popDamage(e.unitId, 'DOWN!'); break;
      case 'oneMore': banner('1 MORE!'); await sleep(650 / SPEED); break;
      case 'tripleThreat': banner('TRIPLE THREAT', true); await sleep(900 / SPEED); break;
      case 'resistBroken': popDamage(e.unitId, '破防'); break;
      case 'status': popDamage(e.unitId, e.status === 'burn' ? '灼烧' : e.status === 'shock' ? '感电' : '绝望'); break;
      case 'ko': popDamage(e.unitId, 'KO'); await sleep(200 / SPEED); break;
      case 'error': toast(e.message); break;
      case 'result': showResult(e); break;
      default: break;
    }
    refreshLabels();
  }
  for (const u of battle.units) unitMesh.get(u.id)!.position.copy(w2v(u.pos));
  busy = false;
  if (selected && (battle.unit(selected).acted || battle.unit(selected).ko)) selected = null;
  if (battle.phase === 'player' && !selected) {
    const next = battle.alive('ally').find((a) => a.oneMore) ?? null;
    if (next) selected = next.id;
  }
  previewTile = null; previewTarget = null;
  refreshAll();
}

function showResult(e: Extract<BattleEvent, { type: 'result' }>) {
  const r = $('#result');
  r.classList.remove('hidden');
  const c = e.crowns;
  const row = (ok: boolean, t: string) => `<div class="${ok ? 'ok' : 'ng'}">${ok ? '♛' : '♔'} ${t}</div>`;
  r.innerHTML = `<h1>${e.outcome === 'won' ? 'MISSION CLEAR' : 'GAME OVER'}</h1>
    <div class="crowns">${row(c.clear, '通关')}${row(c.withinTurns, `${battle.map.turnTarget} 回合内通关（用了 ${e.turn} 回合）`)}${row(c.noKo, '无人 KO')}</div>
    <button class="small" id="again">再来一次</button>`;
  $('#again').onclick = restart;
}

// ---------- 输入 ----------
const ray = new THREE.Raycaster();
function pick(ev: PointerEvent): { tile?: Vec; unit?: string } {
  const r = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const unitObjs = [...unitMesh.values()].filter((g) => g.visible);
  const hu = ray.intersectObjects(unitObjs, true)[0];
  if (hu) return { unit: hu.object.userData.unit };
  const ht = ray.intersectObjects(tileMeshes, false)[0];
  if (ht) {
    const t = { x: ht.object.userData.x, y: ht.object.userData.y };
    const u = battle.unitAt(t);
    return u ? { unit: u.id } : { tile: t };
  }
  return {};
}

let down: { x: number; y: number } | null = null;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12) return;
  down = null;
  onTap(pick(e));
});

function onTap(h: { tile?: Vec; unit?: string }) {
  if (busy || battle.phase !== 'player') return;
  if (h.unit) {
    const u = battle.unit(h.unit);
    if (u.side === 'ally') {
      if (selected === u.id && previewTile) { previewTile = null; previewTarget = null; }
      else if (!u.acted) { selected = u.id; inspectEnemy = null; previewTile = null; previewTarget = null; mode = 'auto'; skillId = null; }
      else { toast(`${u.name} 已行动`); }
      return refreshAll();
    }
    // 敌人
    if (!selected) { inspectEnemy = inspectEnemy === u.id ? null : u.id; return refreshAll(); }
    const s = battle.unit(selected);
    const from = previewTile ?? s.pos;
    const at = attackFrom(s, from, u);
    const via = !at ? meleeViaMove(s, u) : null;
    if (!at && !via) { inspectEnemy = u.id; previewTarget = null; toast('打不到：换模式或先移动'); return refreshAll(); }
    if (previewTarget !== u.id) { previewTarget = u.id; return refreshAll(); }
    // 确认
    const evs: BattleEvent[] = [];
    const dest = via ? via.via : previewTile;
    if (dest && !eq(dest, s.pos)) evs.push(...battle.move(s.id, dest));
    const kind = at ? at.kind : 'melee';
    if (kind === 'melee') evs.push(...battle.melee(s.id, u.id));
    else if (kind === 'gun') evs.push(...battle.shoot(s.id, u.id));
    else evs.push(...battle.skill(s.id, at!.skill!.id, u.id));
    void play(evs);
    return;
  }
  if (h.tile && selected) {
    const s = battle.unit(selected);
    const ok = battle.moveTiles(s).some((p) => eq(p, h.tile!)) || (eq(h.tile, s.anchor) && !eq(s.pos, s.anchor));
    if (!ok) { selected = null; previewTile = null; previewTarget = null; return refreshAll(); }
    if (previewTile && eq(previewTile, h.tile)) { void play(battle.move(s.id, h.tile)); return; }
    previewTile = h.tile; previewTarget = null;
    return refreshAll();
  }
  inspectEnemy = null; selected = null;
  refreshAll();
}

$('#actions').addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest('button');
  if (!b || busy) return;
  const a = b.dataset.act!;
  if (a === 'end') { selected = null; void play(battle.endPlayerPhase()); return; }
  if (a === 'triple') { void play(battle.tripleThreat()); return; }
  if (!selected) return;
  if (a === 'wait') { const id = selected; selected = null; void play(battle.wait(id)); return; }
  mode = mode === a ? 'auto' : (a as Mode);
  if (mode === 'skill') skillId = battle.unit(selected).skills[0]?.id ?? null;
  previewTarget = null;
  refreshAll();
});
$('#skills').addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest('button');
  if (!b) return;
  skillId = b.dataset.skill!;
  previewTarget = null;
  refreshAll();
});
$('#btn-threat').addEventListener('click', () => { showThreat = !showThreat; $('#btn-threat').classList.toggle('on', showThreat); refreshAll(); });
$('#btn-restart').addEventListener('click', restart);
window.addEventListener('resize', () => { fitCamera(); refreshLabels(); });

function restart() {
  $('#result').classList.add('hidden');
  battle = new Battle(testMap());
  selected = null; previewTile = null; previewTarget = null; inspectEnemy = null; mode = 'auto';
  build();
  void play(battle.start());
}

function loop() {
  renderer.render(scene, camera);
  refreshLabels();
  requestAnimationFrame(loop);
}

restart();
loop();

// 调试/截图钩子
declare global { interface Window { __p5t: unknown } }
window.__p5t = {
  get battle() { return battle; },
  get busy() { return busy; },
  setMode(m: Mode) { mode = m; refreshAll(); },
  tap: onTap,
  select(id: string) { onTap({ unit: id }); },
  play,
  key,
};
