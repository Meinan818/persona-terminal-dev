// 灰盒表现层：three.js 方块 + HTML HUD。只读 Battle 状态、只调用 Battle 指令、只消费事件。
import * as THREE from 'three';
import { Battle, MAPS, key, eq, VOLTAGE_MAX, PASSIVE_INFO } from './rules';
import type { BattleEvent, SkillDef, Unit, Vec, StatusId } from './rules';

type Mode = 'auto' | 'melee' | 'gun' | 'skill' | 'unique';

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

const COLORS: Record<string, number> = {
  joker: 0x1a1a1a, skull: 0xf2c200, panther: 0xe8335a, mona: 0xf0f0f0, fox: 0x2f6bff, queen: 0x5b3aa8,
  noir: 0x9a6b3a, erina: 0xff7a00, kasumi: 0xd8202f, toshiro: 0x6aa0a0, crow: 0xe8e0d0,
};
const CHARGE_NAME: Record<string, string> = {
  foresight: 'Foresight 射程+1', phantomStep: 'Phantom Step 移动+1', lightningSpeed: 'Lightning Speed 移动+2', ferociousLion: 'Ferocious Lion 击退+1',
  overPowered: 'Over Powered 攻×1.2', bulletBreak: 'Bullet Break 枪击必倒', springStorm: 'Spring Storm 射程+1', clairvoyance: 'Clairvoyance 射程+2', essenceOfSorcery: 'Essence of Sorcery 技能范围+1',
};
const SWITCH_COL = { hold: 0x22d3ee, toggle: 0xd946ef, elevator: 0x22c55e } as const;
const LEVEL = 0.6; // 每层高度
const ST_NAME: Record<StatusId, string> = { burn: '灼烧', freeze: '冻结', shock: '感电', dizzy: '眩晕', despair: '绝望', forget: '遗忘', sleep: '睡眠' };
const ST_SHORT: Record<StatusId, string> = { burn: '灼', freeze: '冻', shock: '电', dizzy: '晕', despair: '绝', forget: '忘', sleep: '睡' };
const ACT_NAME = { melee: '近战', gun: '枪', skill: '技能' } as const;

const params = new URLSearchParams(location.search);
let mapIdx = Math.max(0, MAPS.findIndex((m) => m.id === params.get('map')));
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

const gh = (p: Vec) => (battle ? battle.grid.h(p) * LEVEL : 0);
const w2v = (p: Vec, y = 0) => new THREE.Vector3(p.x, y + gh(p), p.y);
const std = (color: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });

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
  for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
    const t = battle.grid.tile({ x, y });
    const h = battle.grid.h({ x, y });
    const door = battle.map.doors?.find((d) => d.cells.some((c) => c.x === x && c.y === y));
    const lift = battle.map.elevators?.some((e) => e.cells.some((c) => c.x === x && c.y === y));
    const light = (x + y) % 2 === 0;
    const colH = h > 0 ? (light ? 0x4a4656 : 0x423e4d) : light ? 0x3b3b44 : 0x33333b;
    const top = 0.2 + h * LEVEL;
    const tile = new THREE.Mesh(new THREE.BoxGeometry(0.96, top, 0.96), std(t === 'exit' ? 0x2a6b3a : lift ? 0x2f6b46 : colH, { roughness: 0.9 }));
    tile.position.set(x, h * LEVEL - top / 2, y);
    tile.receiveShadow = true; tile.castShadow = h > 0;
    tile.userData = { x, y };
    world.add(tile);
    tileMeshes.push(tile);
    if (door && t !== 'wall') {
      // 开着的门：只画门框
      for (const off of [-0.42, 0.42]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.08), std(0x3a6bd8, { emissive: 0x0a1a40 }));
        post.position.copy(w2v({ x, y }, 0.7)); post.position.x += off;
        world.add(post);
      }
    }
    if (t === 'wall' || t === 'half' || t === 'full') {
      const bh = t === 'wall' ? 1.6 : t === 'full' ? 1.1 : 0.5;
      const col = door ? 0x3a6bd8 : t === 'wall' ? 0x55555f : t === 'full' ? 0x8a1f24 : 0xb5623a;
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, bh, 0.9), std(col));
      b.position.copy(w2v({ x, y }, bh / 2));
      b.castShadow = true; b.receiveShadow = true;
      b.userData = { x, y };
      world.add(b);
      tileMeshes.push(b);
    }
  }
  // 梯子 / 跳台：竖直贴在高台侧壁上（两格交界处）
  for (const l of battle.grid.links) {
    const [lo, hi] = battle.grid.h(l.a) <= battle.grid.h(l.b) ? [l.a, l.b] : [l.b, l.a];
    const y0 = battle.grid.h(lo) * LEVEL, y1 = battle.grid.h(hi) * LEVEL;
    const len = Math.max(0.3, y1 - y0);
    const g = new THREE.Group();
    const mat = std(0xd8b060, { emissive: 0x221800 });
    for (const off of [-0.2, 0.2]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, len + 0.25, 0.05), mat);
      rail.position.set(off, len / 2, 0);
      g.add(rail);
    }
    for (let i = 1; i <= 3; i++) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.04), mat);
      rung.position.set(0, (len * i) / 4, 0);
      g.add(rung);
    }
    g.position.set((lo.x * 0.62 + hi.x * 0.38), y0, (lo.y * 0.62 + hi.y * 0.38));
    g.rotation.y = hi.x !== lo.x ? Math.PI / 2 : 0;
    world.add(g);
  }
  // 开关踏板 / 摄像头
  for (const sw of battle.map.switches ?? []) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.08, 20), std(SWITCH_COL[sw.kind], { emissive: SWITCH_COL[sw.kind], emissiveIntensity: 0.35 }));
    pad.position.copy(w2v(sw.pos, 0.04));
    world.add(pad);
  }
  for (const cam of battle.map.cameras ?? []) {
    if (battle.rt.cameras.has(cam.id)) continue;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.12), std(0x444444));
    post.position.copy(w2v(cam.pos, 0.65));
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.4), std(0x222222, { emissive: 0xff2020, emissiveIntensity: 0.4 }));
    head.position.copy(w2v(cam.pos, 1.35));
    world.add(post, head);
  }
  for (const u of battle.units) addUnitMesh(u);
  fitCamera();
}

function addUnitMesh(u: Unit) {
  const g = new THREE.Group();
  if (u.prop) {
    if (u.prop === 'barrel') {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.6, 16), std(0xc0161c));
      body.position.y = 0.3;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.08, 16), std(0xffd400, { emissive: 0x332200 }));
      band.position.y = 0.36;
      g.add(body, band);
    } else if (u.prop === 'flag') {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 8), std(0xdddddd));
      pole.position.y = 0.75;
      const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.36, 0.03), std(0xff7a00, { emissive: 0x401800 }));
      cloth.position.set(0.3, 1.3, 0);
      g.add(pole, cloth);
    } else if (u.prop === 'box') {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), std(0x8a5a2b));
      box.position.y = 0.4;
      g.add(box);
    } else {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.3), std(0x777777));
      post.position.y = 0.35;
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.4, 12, 1, true), std(0xdddddd, { side: THREE.DoubleSide }));
      horn.position.set(0, 0.75, 0.1); horn.rotation.x = Math.PI / 2;
      g.add(post, horn);
    }
  } else if (u.side === 'ally') {
    const mat = std(u.decoy ? 0x9fd0ff : COLORS[u.id] ?? 0xffffff, { roughness: 0.5, transparent: !!u.decoy, opacity: u.decoy ? 0.55 : 1 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.55, 16), mat);
    body.position.y = 0.3;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat);
    head.position.y = 0.75;
    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.05), std(u.id === 'joker' ? 0xffffff : 0x111111));
    mask.position.set(0, 0.78, 0.18);
    g.add(body, head, mask);
  } else {
    const roleCol: Record<string, number> = { revenger: 0xb3127a, shielder: 0x1f4f9a, teleporter: 0x2aa198, launcher: 0x8a6b12, supporter: 0x2f9a3a };
    const mat = std(roleCol[u.role ?? ''] ?? 0x7a0d18, { roughness: 0.5, emissive: 0x220000 });
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.9, 6), mat);
    body.position.y = 0.45;
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.06), std(0xffd400, { emissive: 0xffd400 }));
    eye.position.set(0, 0.55, 0.2);
    g.add(body, eye);
    if (u.role === 'shielder') {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.08), std(0x8fb8ff, { emissive: 0x112244 }));
      sh.position.set(0, 0.4, 0.38);
      sh.name = 'shield';
      g.add(sh);
    }
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

function fitCamera() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  const m = battle.map;
  const center = new THREE.Vector3((m.width - 1) / 2, 0, (m.height - 1) / 2);
  const dir = new THREE.Vector3(1, 1.25, 1).normalize();
  camera.position.copy(center).addScaledVector(dir, 30);
  camera.lookAt(center);
  camera.updateMatrixWorld();
  const pts = [[-0.5, -0.5], [m.width - 0.5, -0.5], [-0.5, m.height - 0.5], [m.width - 0.5, m.height - 0.5]]
    .flatMap(([x, z]) => [new THREE.Vector3(x, 0, z), new THREE.Vector3(x, 1.4, z)]);
  const inv = camera.matrixWorldInverse;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) { const q = p.clone().applyMatrix4(inv); minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x); minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y); }
  const aspect = w / h;
  const padX = 1.12 + (aspect > 1.6 ? 0.22 : 0.05), padY = 1.1;
  let halfW = ((maxX - minX) / 2) * padX, halfH = ((maxY - minY) / 2) * padY;
  if (halfW / halfH < aspect) halfW = halfH * aspect; else halfH = halfW / aspect;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2 - halfH * 0.04;
  camera.left = cx - halfW; camera.right = cx + halfW; camera.top = cy + halfH; camera.bottom = cy - halfH;
  camera.updateProjectionMatrix();
}

// ---------- 覆盖层 ----------
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
  overlay.add(new THREE.Mesh(new THREE.TubeGeometry(curve, path.length * 8, 0.06, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })));
  const end = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  end.position.copy(w2v(path[path.length - 1], 0.35));
  end.rotation.x = Math.PI;
  overlay.add(end);
}
function triangleMesh(ids: string[], color = 0xffd400) {
  const ps = ids.map((id) => battle.unit(id).pos);
  const geo = new THREE.BufferGeometry().setFromPoints(ps.map((p) => new THREE.Vector3(p.x, 0.05 + Math.max(...ps.map(gh)), p.y)));
  geo.setIndex([0, 1, 2]);
  overlay.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })));
  overlay.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ps.map((p) => w2v(p, 0.07))), new THREE.LineBasicMaterial({ color })));
}

const tileUnique = (u: Unit) => !!u.unique && (!!u.unique.decoys || !!u.unique.flag);
let uniqueTile: Vec | null = null;
const curSkill = (u: Unit): SkillDef | undefined => (mode === 'unique' ? u.unique : skillId ? u.skills.find((s) => s.id === skillId) : u.skills[0]);
function attackFrom(u: Unit, from: Vec, t: Unit): { kind: 'melee' | 'gun' | 'skill'; skill?: SkillDef } | null {
  const sk = curSkill(u);
  if (mode === 'melee') return battle.canMelee(u, t, from) ? { kind: 'melee' } : null;
  if (mode === 'gun') return battle.canShoot(u, t, from) ? { kind: 'gun' } : null;
  if (mode === 'skill' || mode === 'unique') return sk && battle.canSkill(u, sk, t, from) ? { kind: 'skill', skill: sk } : null;
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
  for (const s of battle.speakerBans()) for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) {
    const p = { x: s.pos.x + dx, y: s.pos.y + dy };
    if (Math.abs(dx) + Math.abs(dy) <= 3 && battle.grid.inBounds(p)) tileQuad(p, 0xffd400, 0.12, 0.012);
  }
  for (const cam of battle.map.cameras ?? []) if (!battle.rt.cameras.has(cam.id)) for (const c of cam.cells) tileQuad(c, 0xffd400, 0.3, 0.014);
  for (const f of battle.units) if (!f.ko && f.prop === 'flag') {
    const r = f.aura ?? 3;
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
      const p = { x: f.pos.x + dx, y: f.pos.y + dy };
      if (Math.abs(dx) + Math.abs(dy) <= r && battle.grid.inBounds(p)) tileQuad(p, 0xff7a00, 0.14, 0.013);
    }
  }
  const pt = battle.pendingTriple;
  if (pt) triangleMesh(battle.mainAllies().map((a) => a.id));
  if (!selected) return;
  const u = battle.unit(selected);
  if (mode === 'unique' && tileUnique(u)) {
    const from = previewTile ?? u.pos;
    for (let y = 0; y < battle.map.height; y++) for (let x = 0; x < battle.map.width; x++) if (battle.canSkillAt(u, u.unique!, { x, y }, from)) tileQuad({ x, y }, 0xffd400, 0.18, 0.016);
    if (uniqueTile) tileQuad(uniqueTile, 0xffd400, 0.6, 0.03);
  }
  ring(u.pos, 0xffffff);
  for (const p of battle.moveTiles(u)) tileQuad(p, 0x2a8cff, 0.42);
  if (!eq(u.anchor, u.pos)) tileQuad(u.anchor, 0x2a8cff, 0.25);
  const from = previewTile ?? u.pos;
  if (previewTile) { pathLine(battle.pathFor(u, previewTile)); tileQuad(previewTile, 0xffffff, 0.55, 0.03); }
  if (!u.acted) for (const e of battle.units) if (!e.ko && e.side !== 'ally' && e.prop !== 'speaker' && attackFrom(u, from, e)) ring(e.pos, previewTarget === e.id ? 0xffd400 : 0xe60012);
  const sk = curSkill(u);
  if ((mode === 'skill' || mode === 'unique') && sk && sk.kind !== 'attack') for (const a of battle.alive('ally')) if (battle.canSkill(u, sk, a, from)) ring(a.pos, previewTarget === a.id ? 0xffd400 : 0x2fd36b);
}

// ---------- HUD ----------
function refreshHud() {
  $('#turn').textContent = `TURN ${battle.turn}${battle.map.turnLimit ? `/${battle.map.turnLimit}` : ''}`;
  $('#objective').textContent = `目标：${battle.map.objective ?? '击败全部敌人'}`;
  const ph = $('#phase');
  ph.textContent = battle.phase === 'enemy' ? 'ENEMY PHASE' : battle.phase === 'player' ? 'PLAYER PHASE' : battle.phase.toUpperCase();
  ph.classList.toggle('enemy', battle.phase === 'enemy');
  const vfull = battle.voltage >= VOLTAGE_MAX;
  $('#volt').classList.toggle('full', vfull);
  ($('#volt .vbar i') as HTMLElement).style.width = `${(100 * battle.voltage) / VOLTAGE_MAX}%`;
  $('#volt-n').textContent = vfull ? 'MAX' : String(battle.voltage);
  const bans = battle.speakerBans();
  $('#ban').classList.toggle('hidden', !bans.length);
  $('#ban').textContent = bans.length ? `喇叭禁止：${bans.map((b) => ACT_NAME[b.ban]).join('、')}（黄色范围内）` : '';
  const card = $('#unit-card');
  const u = selected ? battle.unit(selected) : inspectEnemy ? battle.unit(inspectEnemy) : null;
  if (u) {
    card.classList.remove('hidden');
    const gun = u.gun ? `枪 ${u.gun.power}/${battle.gunRange(u)}格${u.gun.shape && u.gun.shape !== 'single' ? `(${u.gun.shape === 'aoe' ? '散射' : '爆炸'})` : ''}` : '';
    const role = u.role ? ({ shooter: '射手', brute: '近战', revenger: '反击者', shielder: '盾兵', teleporter: '传送者', launcher: '投掷者', supporter: '支援者' } as Record<string, string>)[u.role] : '';
    const st = [role, u.oneMore ? '1 MORE' : '', u.charged ? `CHARGE(${u.charge})` : '', u.acted && !u.decoy ? '已行动' : '', u.downed ? '倒地' : '',
      battle.hasResistance(u, { x: -99, y: -99 }, 'melee') ? 'GUARD' : '', u.escort ? '护送对象' : '', u.decoy ? '诱饵' : '',
      u.role === 'revenger' ? (u.counterReady ? '反击待命' : '反击已用') : '', u.bossPhase ? `阶段${u.bossPhase}` : '',
      ...u.status.map((s) => ST_NAME[s.id]), ...u.buffs.map((b) => `${b.id}↑`)].filter(Boolean).join(' · ');
    card.classList.toggle('enemy', u.side !== 'ally');
    card.innerHTML = `<div><div class="name">${u.name} <small>高度${battle.grid.h(u.pos)}</small><b class="more-btn">${cardOpen ? '▲' : 'ⓘ'}</b></div>
      <div class="vit"><span class="lab">HP</span><span class="num">${u.hp}<small>/${u.maxHp}</small></span><div class="bar"><i style="width:${(100 * u.hp) / u.maxHp}%"></i></div></div>
      ${u.maxSp && u.side === 'ally' ? `<div class="vit"><span class="lab">SP</span><span class="num">${u.sp}<small>/${u.maxSp}</small></span><div class="bar sp"><i style="width:${(100 * u.sp) / u.maxSp}%"></i></div></div>` : ''}
      ${st ? `<div class="st">${st}</div>` : ''}
      <div class="more"><div>移动 ${battle.moveRange(u)} · 近战 ${u.melee} · ${gun}</div>
      ${u.passives?.length ? `<div class="pas">被动：${u.passives.map((p) => PASSIVE_INFO[p].name).join('、')}</div>` : ''}</div>
      ${u.side === 'ally' && u.charges?.length && battle.phase === 'player' ? `<div class="chg">${u.charges.map((c) => `<button class="small${c === u.charge ? ' sel' : ''}" data-charge="${c}">${CHARGE_NAME[c] ?? c}</button>`).join('')}</div>` : ''}</div>`;
  } else card.classList.add('hidden');
  const sel = selected ? battle.unit(selected) : null;
  document.querySelectorAll<HTMLButtonElement>('#actions button').forEach((b) => {
    const a = b.dataset.act!;
    b.classList.toggle('sel', a === mode);
    if (a === 'triple') b.classList.toggle('hidden', !battle.pendingTriple);
    else if (a === 'end') b.disabled = battle.phase !== 'player' || busy;
    else if (a === 'unique') b.disabled = !sel || sel.acted || busy || battle.phase !== 'player' || !sel.unique || !vfull;
    else b.disabled = !sel || sel.acted || busy || battle.phase !== 'player';
  });
  const skEl = $('#skills');
  if (mode === 'skill' && sel) {
    skEl.classList.remove('hidden');
    skEl.innerHTML = sel.skills.map((s) => `<button data-skill="${s.id}" class="${s.id === skillId ? 'sel' : ''}" ${sel.sp < s.sp ? 'disabled' : ''}>${s.name} · SP${s.sp} · ${s.kind === 'attack' ? `${s.range}格${s.radius ? ` 范围${s.radius}` : ''}${s.effect ? ` · ${s.effect}` : ''}` : s.kind === 'heal' ? '回复' : '辅助'}</button>`).join('');
  } else skEl.classList.add('hidden');
  // Baton Pass
  const bt = $('#baton');
  const ko = battle.phase === 'player' && !busy ? battle.units.find((x) => x.side === 'ally' && x.ko && !x.escort) : undefined;
  if (ko && battle.reserves.length && battle.batonLeft > 0) {
    bt.classList.remove('hidden');
    bt.innerHTML = `<div>${ko.name} 倒下 · BATON PASS（剩 ${battle.batonLeft === Infinity ? '∞' : battle.batonLeft} 次）</div>` +
      battle.reserves.map((r) => `<button data-out="${ko.id}" data-in="${r.id}">换上 ${r.name}</button>`).join('');
  } else bt.classList.add('hidden');
  // 预览卡
  const pv = $('#preview');
  if (busy) pv.classList.add('hidden');
  else if (sel && previewTarget) {
    const t = battle.unit(previewTarget);
    const from = previewTile ?? sel.pos;
    const sk = curSkill(sel);
    if (t.side === 'ally' && sk && sk.kind !== 'attack') {
      pv.classList.remove('hidden');
      pv.innerHTML = `${sk.name} → ${t.name}　再点一次确认`;
    } else {
      const direct = attackFrom(sel, from, t);
      const via = direct ? null : meleeViaMove(sel, t);
      const at = direct ?? (via ? { kind: 'melee' as const } : null);
      if (at) {
        const p = battle.previewDamage(sel, t, at.kind, at.skill, via ? via.via : from);
        const tName = at.kind === 'melee' ? '近战(击退4格)' : at.kind === 'gun' ? '枪击' : at.skill!.name;
        pv.classList.remove('hidden');
        pv.innerHTML = `${tName} → ${t.name}　伤害 ${p.amount}${p.miss ? '（被挡住）' : p.resist ? '（Resistance·减伤）' : ''}<br/>${p.willDown ? '<span class="getem">GET EM!!</span>' : ''}　再点一次确认`;
      } else pv.classList.add('hidden');
    }
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
    const el = labelEl.get(u.id);
    const g = unitMesh.get(u.id);
    if (!el || !g) continue;
    g.visible = !u.ko;
    if (u.ko) { el.style.display = 'none'; continue; }
    const shield = g.getObjectByName('shield');
    if (shield && u.facing) { g.rotation.y = Math.atan2(u.facing.x, u.facing.y); }
    if (u.prop) { el.style.display = 'none'; continue; }
    const v = g.position.clone().add(new THREE.Vector3(0, 1.05, 0)).project(camera);
    el.style.display = '';
    el.style.left = `${((v.x + 1) / 2) * w}px`;
    el.style.top = `${((1 - v.y) / 2) * h}px`;
    const res = battle.hasResistance(u, { x: -99, y: -99 }, 'melee');
    const tags = [
      u.downed ? '<span class="tag down">DOWN</span>' : res ? '<span class="tag res">盾</span>' : '',
      u.oneMore ? '<span class="tag">1MORE</span>' : '',
      u.charged ? '<span class="tag chg">CHG</span>' : '',
      ...u.status.map((s) => `<span class="tag st">${ST_SHORT[s.id]}</span>`),
    ].join('');
    el.innerHTML = `${u.name.split(' ').pop()}${tags}<div class="hp"><i style="width:${(100 * u.hp) / u.maxHp}%"></i></div>`;
    if (!busy) {
      g.rotation.z = u.downed ? 1.2 : 0;
      g.position.y = gh(u.pos) + (u.downed ? 0.15 : 0);
    }
    g.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (m && 'opacity' in m && u.side === 'ally') { m.transparent = true; m.opacity = u.acted && battle.phase === 'player' ? 0.55 : 1; } });
  }
}

function refreshAll() { refreshOverlay(); refreshHud(); }

// ---------- 事件动画 ----------
function banner(text: string, yellow = false) {
  const b = $('#banner');
  b.textContent = text;
  b.className = yellow ? 'yellow' : '';
  b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
}
function toast(text: string) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.remove('hidden');
  clearTimeout((toast as unknown as { h: number }).h);
  (toast as unknown as { h: number }).h = window.setTimeout(() => t.classList.add('hidden'), 1800);
}
function popAt(pos: THREE.Vector3, text: string, cls = '') {
  const v = pos.clone().add(new THREE.Vector3(0, 1.2, 0)).project(camera);
  const el = document.createElement('div');
  el.className = `dmg ${cls}`;
  el.textContent = text;
  el.style.left = `${((v.x + 1) / 2) * window.innerWidth}px`;
  el.style.top = `${((1 - v.y) / 2) * window.innerHeight}px`;
  $('#labels').appendChild(el);
  const rm = () => (document.body.classList.contains('frozen') ? setTimeout(rm, 200) : el.remove());
  setTimeout(rm, 950);
}
function popDamage(unitId: string, text: string, cls = '') {
  const g = unitMesh.get(unitId);
  if (g) popAt(g.position, text, cls);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function tweenPath(id: string, path: Vec[], msPerTile = 90, arc = 0) {
  const g = unitMesh.get(id);
  if (!g) return;
  for (let i = 1; i < path.length; i++) {
    const a = w2v(path[i - 1]), b = w2v(path[i]);
    const dur = msPerTile * Math.max(1, Math.abs(path[i].x - path[i - 1].x) + Math.abs(path[i].y - path[i - 1].y)) * (arc ? 0.6 : 1);
    const t0 = performance.now();
    await new Promise<void>((res) => {
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / dur);
        g.position.lerpVectors(a, b, k);
        if (arc) g.position.y += Math.sin(k * Math.PI) * arc;
        if (k < 1) requestAnimationFrame(step); else res();
      };
      step();
    });
  }
}
function flash(at: Vec, radius: number) {
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffa020, transparent: true, opacity: 0.8 }));
  s.position.copy(w2v(at, 0.4));
  world.add(s);
  const t0 = performance.now();
  const step = () => {
    if (document.body.classList.contains('frozen')) { requestAnimationFrame(step); return; }
    const k = Math.min(1, (performance.now() - t0) / 420);
    s.scale.setScalar(1 + k * radius * 2);
    (s.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k);
    if (k < 1) requestAnimationFrame(step); else world.remove(s);
  };
  step();
}

const SPEED = Number(params.get('speed') ?? '1');
const hook = { pauseOn: null as string | null, pauseDelay: 0, paused: false, released: false, resume() { hook.released = true; } };
async function play(events: BattleEvent[]) {
  busy = true;
  clearOverlay();
  refreshHud();
  let rebuild = false;
  for (const e of events) {
    let pausing = false;
    if (hook.pauseOn === e.type) {
      // 截图钩子：事件开始 pauseDelay 毫秒后冻结画面（CSS 动画与爆炸闪光），等 resume
      hook.pauseOn = null;
      pausing = true;
      setTimeout(() => { document.body.classList.add('frozen'); hook.paused = true; }, hook.pauseDelay);
    }
    switch (e.type) {
      case 'phaseStart':
        if (e.phase === 'enemy') { banner('ENEMY PHASE'); refreshHud(); await sleep(700 / SPEED); }
        if (e.phase === 'player' && e.turn > 1) { banner(`TURN ${e.turn}`); await sleep(500 / SPEED); }
        break;
      case 'move': await tweenPath(e.unitId, e.path.length ? e.path : [e.from, battle.unit(e.unitId).pos], 90 / SPEED); break;
      case 'dash': popDamage(e.unitId, e.kind === 'ladder' ? 'DASH↕' : 'JUMP'); break;
      case 'knockback':
        if (!e.blocked || !eq(e.from, e.to)) await tweenPath(e.unitId, [e.from, e.to], 70 / SPEED, e.fly ? 1.2 : 0);
        if (e.blocked) popDamage(e.unitId, e.collidedWith ? '撞击!' : '挡住');
        break;
      case 'pull': await tweenPath(e.unitId, e.path.length ? e.path : [e.from, e.to], 80 / SPEED); popDamage(e.unitId, e.effect === 'hypno' ? '催眠' : '漩涡'); break;
      case 'dizzyMove': await tweenPath(e.unitId, [e.from, e.to], 90 / SPEED, 0.3); popDamage(e.unitId, '眩晕'); break;
      case 'fall': popDamage(e.unitId, '坠落!', 'big'); await sleep(220 / SPEED); break;
      case 'followUp': banner('FOLLOW UP!', true); toast(`${battle.unit(e.shooterId).name} 追击！${battle.unit(e.creditId).name} 获得 1 MORE`); await sleep(600 / SPEED); break;
      case 'meleeStep': unitMesh.get(e.unitId)?.position.copy(w2v(e.to)); break;
      case 'damage': popDamage(e.unitId, `${e.amount}${e.resist ? '▼' : ''}`); await sleep(240 / SPEED); break;
      case 'heal': popDamage(e.unitId, `+${e.amount}`, 'heal'); await sleep(200 / SPEED); break;
      case 'miss': popDamage(e.unitId, e.reason === 'shield' ? '盾挡!' : 'MISS'); await sleep(240 / SPEED); break;
      case 'down': popDamage(e.unitId, 'DOWN!'); break;
      case 'oneMore': banner('1 MORE!'); await sleep(650 / SPEED); break;
      case 'tripleThreat': banner('TRIPLE THREAT', true); await sleep(900 / SPEED); break;
      case 'resistBroken': popDamage(e.unitId, '破防'); break;
      case 'status': popDamage(e.unitId, ST_NAME[e.status]); break;
      case 'statusEnd': if (e.reason === 'damage') popDamage(e.unitId, `${ST_NAME[e.status]}解除`); break;
      case 'buff': popDamage(e.unitId, e.buff === 'move' ? '移动↑' : e.buff === 'atk' ? '攻击↑' : '防御↑', 'heal'); break;
      case 'charge': popDamage(e.unitId, 'CHARGE', 'heal'); break;
      case 'chargeUsed': popDamage(e.unitId, 'CHARGE!'); break;
      case 'uniqueSkill': banner(battle.unit(e.unitId).unique?.name ?? 'UNIQUE', true); await sleep(800 / SPEED); break;
      case 'counter': popDamage(e.unitId, '反击!', 'big'); await tweenPath(e.unitId, [e.from, e.to], 60 / SPEED, 1); break;
      case 'teleportSwap': popDamage(e.unitId, '换位!'); for (const id of [e.unitId, e.withId]) unitMesh.get(id)?.position.copy(w2v(battle.unit(id).pos)); break;
      case 'throw': popDamage(e.unitId, '投掷!'); await tweenPath(e.targetId, [e.from, e.to], 70 / SPEED, 1.6); break;
      case 'explode': flash(e.at, e.radius); popAt(w2v(e.at), 'BOOM!', 'big'); await sleep(300 / SPEED); break;
      case 'penalty': popDamage(e.unitId, '违规!', 'big'); toast(`喇叭禁止「${ACT_NAME[e.action]}」→ 惩罚`); break;
      case 'speakerBan': toast(`喇叭：本回合禁止「${e.bans.map((b) => ACT_NAME[b]).join('、')}」`); break;
      case 'skipTurn': popDamage(e.unitId, ST_NAME[e.reason]); break;
      case 'ko': popDamage(e.unitId, 'KO'); await sleep(200 / SPEED); break;
      case 'batonPassReady': toast(`${battle.unit(e.koId).name} 倒下：可 Baton Pass 换替补`); break;
      case 'batonPass': rebuild = true; banner('BATON PASS', true); break;
      case 'error': toast(e.message); break;
      case 'message': toast(e.text); await sleep(300 / SPEED); break;
      case 'guard': if (e.on) popDamage(e.unitId, 'GUARD', 'heal'); else if (battle.phase !== 'won') popDamage(e.unitId, '掩护消失'); break;
      case 'door': build(); toast(`门 ${e.id} ${e.open ? '打开' : '关上'}`); break;
      case 'elevator': build(); toast(`升降台${e.up ? '升起' : '降下'}`); break;
      case 'switch': popDamage(e.unitId, '开关!'); break;
      case 'alarm': banner('ALERT!', true); toast('被摄像头发现：敌方援军出现'); break;
      case 'reinforce': build(); toast(`援军 ×${e.unitIds.length}`); await sleep(700 / SPEED); break;
      case 'bossPhase': banner(`PHASE ${e.phase}`, true); await sleep(700 / SPEED); break;
      case 'decoy': build(); popDamage(e.unitId, '诱饵'); await sleep(200 / SPEED); break;
      case 'flagPlaced': build(); clearOverlay(); popDamage(e.unitId, 'FLAG!', 'big'); await sleep(300 / SPEED); break;
      case 'passive': popDamage(e.unitId, PASSIVE_INFO[e.passive].name, 'heal'); await sleep(200 / SPEED); break;
      case 'swap': popDamage(e.unitId, '换位!'); for (const id of [e.unitId, e.withId]) unitMesh.get(id)?.position.copy(w2v(battle.unit(id).pos)); break;
      case 'result': showResult(e); break;
      default: break;
    }
    refreshLabels();
    if (pausing) {
      while (!hook.released) await sleep(20);
      hook.released = false;
      hook.paused = false;
      document.body.classList.remove('frozen');
    }
  }
  if (rebuild) build();
  for (const u of battle.units) unitMesh.get(u.id)?.position.copy(w2v(u.pos));
  busy = false;
  if (selected && (battle.unit(selected).acted || battle.unit(selected).ko)) selected = null;
  if (battle.phase === 'player' && !selected) {
    const next = battle.alive('ally').find((a) => a.oneMore) ?? null;
    if (next) selected = next.id;
  }
  previewTile = null; previewTarget = null; uniqueTile = null;
  if (mode === 'unique') mode = 'auto';
  refreshAll();
}

function showResult(e: Extract<BattleEvent, { type: 'result' }>) {
  const r = $('#result');
  r.classList.remove('hidden');
  const row = (ok: boolean, t: string) => `<div class="${ok ? 'ok' : 'ng'}">${ok ? '♛' : '♔'} ${t}</div>`;
  r.innerHTML = `<h1>${e.outcome === 'won' ? 'MISSION CLEAR' : 'GAME OVER'}</h1>${e.reason ? `<div>${e.reason}</div>` : ''}
    <div class="crowns">${e.crowns.items.map((i) => row(i.ok, i.label)).join('')}<div class="ng">用了 ${e.turn} 回合</div></div>
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
      // 回复/辅助技能：点友方作为目标
      const s = selected ? battle.unit(selected) : null;
      const sk = s ? curSkill(s) : undefined;
      if (s && (mode === 'skill' || mode === 'unique') && sk && sk.kind !== 'attack' && battle.canSkill(s, sk, u, previewTile ?? s.pos)) {
        if (previewTarget !== u.id) { previewTarget = u.id; return refreshAll(); }
        const evs: BattleEvent[] = [];
        if (previewTile && !eq(previewTile, s.pos)) evs.push(...battle.move(s.id, previewTile));
        evs.push(...battle.skill(s.id, sk.id, u.id));
        void play(evs);
        return;
      }
      if (selected === u.id && previewTile) { previewTile = null; previewTarget = null; }
      else if (u.decoy) toast('诱饵：敌人会优先攻击它，被打一下就消失');
      else if (!u.acted) { selected = u.id; inspectEnemy = null; previewTile = null; previewTarget = null; mode = 'auto'; skillId = null; }
      else toast(`${u.name} 已行动`);
      return refreshAll();
    }
    if (u.prop === 'speaker') { toast('喇叭：在黄色范围内做被禁止的行动会受惩罚'); return; }
    if (u.prop === 'flag') { toast('自由之旗：橙色范围内敌人没有掩护，我方回合结束回复'); return; }
    if (!selected) { inspectEnemy = inspectEnemy === u.id ? null : u.id; return refreshAll(); }
    const s = battle.unit(selected);
    const from = previewTile ?? s.pos;
    const at = attackFrom(s, from, u);
    const via = !at ? meleeViaMove(s, u) : null;
    if (!at && !via) { inspectEnemy = u.prop ? null : u.id; previewTarget = null; toast('打不到：换模式或先移动'); return refreshAll(); }
    if (previewTarget !== u.id) { previewTarget = u.id; return refreshAll(); }
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
  if (h.tile && selected && mode === 'unique' && tileUnique(battle.unit(selected))) {
    const s = battle.unit(selected);
    if (!battle.canSkillAt(s, s.unique!, h.tile, previewTile ?? s.pos)) { toast('超出射程'); return; }
    if (!uniqueTile || !eq(uniqueTile, h.tile)) { uniqueTile = h.tile; toast('再点一次同一格确认'); return refreshAll(); }
    const evs: BattleEvent[] = [];
    if (previewTile && !eq(previewTile, s.pos)) evs.push(...battle.move(s.id, previewTile));
    evs.push(...battle.uniqueAt(s.id, h.tile));
    uniqueTile = null;
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
  if (a === 'unique') {
    const u = battle.unit(selected);
    if (u.unique?.shape === 'self') {
      const evs: BattleEvent[] = [];
      if (previewTile && !eq(previewTile, u.pos)) evs.push(...battle.move(u.id, previewTile));
      evs.push(...battle.unique(u.id));
      void play(evs);
      return;
    }
  }
  mode = mode === a ? 'auto' : (a as Mode);
  if (mode === 'skill') skillId = battle.unit(selected).skills[0]?.id ?? null;
  previewTarget = null;
  refreshAll();
});
let cardOpen = false;
$('#unit-card').addEventListener('click', (ev) => {
  if ((ev.target as HTMLElement).closest('.name')) { cardOpen = !cardOpen; $('#unit-card').classList.toggle('open', cardOpen); refreshAll(); return; }
  const b = (ev.target as HTMLElement).closest('button');
  if (!b || busy || !selected || !b.dataset.charge) return;
  void play(battle.selectCharge(selected, b.dataset.charge as never));
});
$('#skills').addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest('button');
  if (!b) return;
  skillId = b.dataset.skill!;
  previewTarget = null;
  refreshAll();
});
$('#baton').addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest('button');
  if (!b || busy) return;
  void play(battle.batonPass(b.dataset.out!, b.dataset.in!));
});
$('#btn-threat').addEventListener('click', () => { showThreat = !showThreat; $('#btn-threat').classList.toggle('on', showThreat); refreshAll(); });
$('#btn-volt').addEventListener('click', () => { battle.voltage = VOLTAGE_MAX; refreshAll(); });
$('#btn-restart').addEventListener('click', restart);
const sel = $<HTMLSelectElement>('#map-select');
sel.innerHTML = MAPS.map((m, i) => `<option value="${i}">${m.name}</option>`).join('');
sel.value = String(mapIdx);
sel.addEventListener('change', () => { mapIdx = Number(sel.value); restart(); });
window.addEventListener('resize', () => { fitCamera(); refreshLabels(); });

function restart() {
  $('#result').classList.add('hidden');
  battle = new Battle(MAPS[mapIdx].make());
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
  setSkill(id: string) { mode = 'skill'; skillId = id; refreshAll(); },
  tap: onTap,
  select(id: string) { onTap({ unit: id }); },
  loadMap(i: number) { mapIdx = i; sel.value = String(i); restart(); },
  hook,
  play,
  key,
};
