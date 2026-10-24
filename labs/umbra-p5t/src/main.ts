// 灰盒表现层：three.js 方块 + HTML HUD。只读 Battle 状态、只调用 Battle 指令、只消费事件。
import * as THREE from 'three';
import { Battle, MAPS, key, eq, VOLTAGE_MAX, PASSIVE_INFO, SKILLS, UNIQUES, parseMap, enemy, JOKER, SKULL, PANTHER } from './rules';
import type { BattleEvent, SkillDef, Unit, Vec, StatusId, MapDef } from './rules';
import { mountLevelSelect } from './game/levelSelect'; // Q12 关卡选择（最简按钮，Hark 美化）
import { levelMap } from './game/levels';
import { CameraRig } from './view/cameraRig';
import { attachCameraInput } from './view/cameraInput';
import { MapObjects } from './view/mapObjects';
import { makeFlag, makeSpeaker, waveFlag, pulseSpeaker } from './view/props';
import { slashBanner, itemToast, enemyTurnBanner } from './fx/banners';
import { updateObjectiveHud, mountCamButtons } from './ui/hud';
import { oneMoreCutIn, tripleThreatSeq, Skip, setFxSpeed, fxMs } from './fx/cutins';
import type { CutWho } from './fx/cutins';
import { TripleFx } from './view/tripleFx';
import { SceneKit, themeFor, cobbleTex, preloadKit } from './view/sceneKit';
void preloadKit(); // CC0 布景模型提前加载
import { computeForecast, forecastHtml } from './view/forecast';
import type { Forecast } from './view/forecast';
import { preloadJoker, makeJoker, jokerReady } from './view/jokerModel';
import type { UnitRig } from './view/chibiRig';
import { makeSkull, makeMona, makeShadow } from './view/partyModels';
// 角色模型：Joker = 私用 GLB（缺文件时占位胶囊，加载完成后就地替换）；Skull/Mona/敌兵 = 程序化 Q 版（chibiRig 共用动画）
const rigs = new Map<string, UnitRig>();
const wantsRig = (u: Unit) => !u.decoy && !u.prop && (u.side === 'enemy' || (u.side === 'ally' && (u.id === 'joker' || u.id === 'skull' || u.id === 'mona')));
function makeRigFor(u: Unit): UnitRig | null {
  if (!wantsRig(u)) return null;
  if (u.side === 'enemy') return makeShadow(u.role);
  if (u.id === 'joker') return makeJoker();
  return u.id === 'skull' ? makeSkull() : makeMona();
}
void preloadJoker().then((ok) => { if (ok && battle) swapInRigs(); });
function swapInRigs() {
  for (const u of battle.units) {
    const g = unitMesh.get(u.id);
    if (!g || !wantsRig(u) || rigs.has(u.id)) continue;
    const r = makeRigFor(u); if (!r) continue;
    while (g.children.length) g.remove(g.children[0]);
    attachRig(g, r, u);
  }
}
function attachRig(g: THREE.Group, r: UnitRig, u: Unit) {
  g.add(r.root);
  r.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.userData = { ...o.userData, unit: u.id }; } });
  if (u.facing) r.faceTo(new THREE.Vector3(g.position.x + u.facing.x, 0, g.position.z + u.facing.y));
  else r.faceTo(new THREE.Vector3(g.position.x, 0, g.position.z + (u.side === 'enemy' ? -1 : 1)));
  rigs.set(u.id, r);
}

type Mode = 'auto' | 'melee' | 'gun' | 'skill' | 'unique';

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
const canvas = $<HTMLCanvasElement>('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.shadowMap.enabled = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x141418);
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
// 过肩瞄准镜头（P5T 开枪时切到射手肩后透视镜头，推近→开火→切回俯视）
const aimCam = new THREE.PerspectiveCamera(44, 2, 0.05, 100);
let viewCam: THREE.Camera = camera;
const hemi = new THREE.HemisphereLight(0xffffff, 0x302020, 1.4);
scene.add(hemi);
const sceneKit = new SceneKit();
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(6, 12, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

const COLORS: Record<string, number> = {
  joker: 0x1a1a1a, skull: 0xf2c200, panther: 0xe8335a, mona: 0xf0f0f0, fox: 0x2f6bff, queen: 0x5b3aa8,
  noir: 0x9a6b3a, erina: 0xff7a00, kasumi: 0xd8202f, toshiro: 0x6aa0a0, crow: 0xe8e0d0,
};
const hexOf = (id: string) => '#' + (COLORS[id] ?? 0x888888).toString(16).padStart(6, '0');
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
  unitMesh.clear(); rigs.clear();
  tileMeshes.length = 0;
  $('#labels').innerHTML = '';
  labelEl.clear();
  const m = battle.map;
  const th = themeFor(m.id);
  scene.background = new THREE.Color(th.bg);
  scene.fog = th.fogNear < 900 ? new THREE.Fog(th.bg, th.fogNear, th.fogFar) : null;
  hemi.color.set(th.hemiSky); hemi.groundColor.set(th.hemiGround); hemi.intensity = th.hemiInt;
  sun.color.set(th.sunColor); sun.intensity = th.sunInt;
  const claimed = sceneKit.build(world, m);
  for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
    const t = battle.grid.tile({ x, y });
    const h = battle.grid.h({ x, y });
    const door = battle.map.doors?.find((d) => d.cells.some((c) => c.x === x && c.y === y));
    const lift = battle.map.elevators?.some((e) => e.cells.some((c) => c.x === x && c.y === y));
    const light = (x + y) % 2 === 0;
    const colH = h > 0 ? (light ? th.tileHigh : th.tileHighB) : light ? th.tileA : th.tileB;
    const top = 0.2 + h * LEVEL;
    const tile = new THREE.Mesh(new THREE.BoxGeometry(0.96, top, 0.96), std(t === 'exit' ? 0x2a6b3a : lift ? 0x2f6b46 : colH, { roughness: 0.9, ...(th.cobble && !lift && t !== 'exit' ? { map: cobbleTex() } : {}) }));
    tile.position.set(x, h * LEVEL - top / 2, y);
    tile.receiveShadow = true; tile.castShadow = h > 0;
    tile.userData = { x, y };
    world.add(tile);
    tileMeshes.push(tile);
    if (door) continue; // 门（开/关）由 MapObjects 画门板 + 门框
    if (claimed.has(`${x},${y}`)) continue; // 布景（房屋/喷泉）已占用
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
  // 梯子 / 跳台、开关拉杆、宝箱、门、未解锁区域：见 view/mapObjects.ts
  for (const cam of battle.map.cameras ?? []) {
    if (battle.rt.cameras.has(cam.id)) continue;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.12), std(0x444444));
    post.position.copy(w2v(cam.pos, 0.65));
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.4), std(0x222222, { emissive: 0xff2020, emissiveIntensity: 0.4 }));
    head.position.copy(w2v(cam.pos, 1.35));
    world.add(post, head);
  }
  for (const u of battle.units) addUnitMesh(u);
  mapObj.build(world, battle, tileMeshes);
  fitCamera(!freshMap);
  freshMap = false;
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
      makeFlag(g);
    } else if (u.prop === 'box') {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), std(0x8a5a2b));
      box.position.y = 0.4;
      g.add(box);
    } else {
      makeSpeaker(g);
    }
  } else if (wantsRig(u) && (u.id !== 'joker' || jokerReady())) {
    // 实体模型分支在 traverse 之后挂（见下）
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
  if (wantsRig(u) && !g.children.length) { const r = makeRigFor(u); if (r) attachRig(g, r, u); }
  g.userData = { unit: u.id };
  world.add(g);
  unitMesh.set(u.id, g);
  const el = document.createElement('div');
  el.className = `lbl ${u.side}`;
  $('#labels').appendChild(el);
  labelEl.set(u.id, el);
}

// P5T 镜头（Hark）：拖动平移 / 捏合·滚轮缩放 / 90° 步进旋转，见 view/cameraRig.ts
const rig = new CameraRig(camera);
const mapObj = new MapObjects({ w2v: (p, y = 0) => w2v(p, y), level: LEVEL });
let freshMap = true;
function fitCamera(keep = true) {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  const m = battle.map;
  let maxH = 0;
  for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) maxH = Math.max(maxH, battle.grid.h({ x, y }));
  rig.setMap({ width: m.width, height: m.height, maxY: 1.4 + maxH * LEVEL }, w / h, keep);
}
/** 敌方回合镜头（Hark 演出）：推近并跟随行动者；null = 我方回合开始，对准当前可行动角色 */
function camFocus(p: Vec | null, zoom = 1.35) {
  if (!p) {
    const a = (selected ? battle.unit(selected) : null) ?? battle.alive('ally').find((x) => !x.prop && !x.decoy && !x.acted);
    rig.focus(a ? w2v(a.pos) : null);
    return;
  }
  rig.focus(w2v(p), Math.max(rig.userZoom, zoom));
}
function camStep() { rig.update(); }

// ---------- 覆盖层 ----------
function clearOverlay() { while (overlay.children.length) overlay.remove(overlay.children[0]); }
function tileQuad(p: Vec, color: number, opacity = 0.45, y = 0.02) {
  const q = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.92), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  q.rotation.x = -Math.PI / 2;
  q.position.copy(w2v(p, y));
  overlay.add(q);
}
/** P5T 目标格：红底+黑斜纹（CanvasTexture，只建一次） */
let stripeTex: THREE.CanvasTexture | null = null;
function stripeTile(p: Vec, y = 0.03) {
  if (!stripeTex) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d')!;
    x.fillStyle = '#e60012'; x.fillRect(0, 0, 64, 64);
    x.strokeStyle = '#140004'; x.lineWidth = 8;
    for (let k = -64; k < 128; k += 21) { x.beginPath(); x.moveTo(k, 64); x.lineTo(k + 64, 0); x.stroke(); }
    x.strokeStyle = '#fff'; x.lineWidth = 4; x.strokeRect(2, 2, 60, 60);
    stripeTex = new THREE.CanvasTexture(c); stripeTex.colorSpace = THREE.SRGBColorSpace;
  }
  const q = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.94), new THREE.MeshBasicMaterial({ map: stripeTex, transparent: true, opacity: 0.88, depthWrite: false }));
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

/** 击退预览：白色箭头 + 落点格（P5T 推人预测） */
function pushArrow(a: Vec, b: Vec) {
  tileQuad(b, 0xffffff, 0.55, 0.04);
  const p0 = w2v(a, 0.12), p1 = w2v(b, 0.12);
  const dir = p1.clone().sub(p0); const len = dir.length(); dir.normalize();
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true });
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, Math.max(0.01, len - 0.35)), mat);
  shaft.position.copy(p0.clone().add(dir.clone().multiplyScalar((len - 0.35) / 2)));
  shaft.lookAt(p1); shaft.renderOrder = 10;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 3), mat);
  head.position.copy(p1.clone().sub(dir.clone().multiplyScalar(0.2)));
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); head.renderOrder = 10;
  const outline = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, Math.max(0.01, len - 0.3)), new THREE.MeshBasicMaterial({ color: 0xe60012, depthTest: false, transparent: true }));
  outline.position.copy(shaft.position); outline.position.y -= 0.01; outline.lookAt(p1.x, outline.position.y, p1.z); outline.renderOrder = 9;
  overlay.add(outline, shaft, head);
}

/** 当前选中目标的攻击预测（只对敌方/可打物件；回复辅助不走这里） */
function currentForecast(): Forecast | null {
  if (!selected || !previewTarget || busy || battle.phase !== 'player') return null;
  const s = battle.unit(selected), t = battle.unit(previewTarget);
  if (s.acted || t.side === 'ally' || t.ko) return null;
  const from = previewTile ?? s.pos;
  const direct = attackFrom(s, from, t);
  const via = direct ? null : meleeViaMove(s, t);
  const at = direct ?? (via ? { kind: 'melee' as const } : null);
  if (!at) return null;
  return computeForecast(battle, s, t, at.kind, at.skill, via ? via.via : from);
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
  const fc = currentForecast();
  if (fc) {
    for (const p of fc.aoe) if (!eq(p, fc.target.pos)) tileQuad(p, 0xe60012, 0.38, 0.034);
    stripeTile(fc.target.pos, 0.036);
    if (fc.push && !eq(fc.push.to, fc.push.from)) pushArrow(fc.push.from, fc.push.to);
    else if (fc.push) tileQuad(fc.push.from, 0xffffff, 0.3, 0.038);
  }
  const sk = curSkill(u);
  if ((mode === 'skill' || mode === 'unique') && sk && sk.kind !== 'attack') for (const a of battle.alive('ally')) if (battle.canSkill(u, sk, a, from)) ring(a.pos, previewTarget === a.id ? 0xffd400 : 0x2fd36b);
}

// ---------- HUD ----------
function refreshHud() {
  updateObjectiveHud(battle); // 右上目标框：胜利条件 + 回合 x/上限 + 剩余敌人，点开看败北条件
  const ph = $('#phase');
  const showPh = busy && vPhase === 'enemy' ? 'enemy' : battle.phase; // 播放事件时按演出进度显示（规则层已结算到下回合）
  ph.textContent = showPh === 'enemy' ? 'ENEMY PHASE' : showPh === 'player' ? 'PLAYER PHASE' : showPh.toUpperCase();
  ph.classList.toggle('enemy', showPh === 'enemy');
  const vfull = battle.voltage >= VOLTAGE_MAX;
  $('#volt').classList.toggle('full', vfull);
  ($('#volt .vbar i') as HTMLElement).style.width = `${(100 * battle.voltage) / VOLTAGE_MAX}%`;
  $('#volt-n').textContent = vfull ? 'MAX' : String(battle.voltage);
  // P5T 布局：右下 Voltage 星 + 队伍头像排（Hark 美术，依据 docs/design/P5T-UI-LAYOUT.md）
  ($('#volt-star .star i') as HTMLElement).style.height = `${(100 * battle.voltage) / VOLTAGE_MAX}%`;
  $('#volt-star').classList.toggle('full', vfull);
  ($('#endbar button') as HTMLButtonElement).disabled = battle.phase !== 'player' || busy;
  const allies = battle.units.filter((x) => x.side === 'ally' && !x.ko && !x.decoy && !x.prop);
  $('#party').innerHTML = allies.map((a) => `<div class="pm${a.id === selected ? ' cur' : ''}${a.acted ? ' done' : ''}${a.oneMore && !a.acted && battle.phase === 'player' ? ' om' : ''}" data-uid="${a.id}">
    <div class="face" style="--c:${'#' + (COLORS[a.id] ?? 0x888888).toString(16).padStart(6, '0')}">${(a.name.split(' ').pop() ?? a.name).slice(0, 1)}</div>
    ${!a.acted && battle.phase === 'player' ? '<b class="act">ACTION</b>' : ''}
    <div class="nums"><span class="hp"><small>HP</small>${a.hp}</span><span class="sp"><small>SP</small>${a.sp}</span></div>
    </div>`).join('') + (() => { const a = selected ? battle.unit(selected) : null; return a && a.charges?.length && battle.phase === 'player' ? `<div class="chgs">${a.charges.map((c) => `<i data-charge="${c}" class="${c === a.charge ? 'sel' : ''}">CHARGE · ${CHARGE_NAME[c] ?? c}</i>`).join('')}</div>` : ''; })();
  const bans = battle.speakerBans();
  $('#ban').classList.toggle('hidden', !bans.length);
  $('#ban').textContent = bans.length ? `喇叭禁止：${bans.map((b) => ACT_NAME[b.ban]).join('、')}（黄色范围内）` : '';
  const card = $('#unit-card');
  const u = inspectEnemy ? battle.unit(inspectEnemy) : null;
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
  const fcEl = $('#forecast');
  fcEl.classList.add('hidden');
  try {
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
      const fc = currentForecast();
      if (fc) {
        pv.classList.add('hidden');
        fcEl.classList.remove('hidden');
        fcEl.innerHTML = forecastHtml(fc, hexOf);
        fcEl.classList.toggle('lethal', fc.lethal);
      } else if (at) {
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
  } finally {
    // 预测面板打开时收起技能列表（P5T：确认阶段只留面板），VOLTAGE 星避让见 refreshLabels
    $('#app').classList.toggle('fc-open', !fcEl.classList.contains('hidden'));
  }
}

function meleeViaMove(u: Unit, t: Unit): { kind: 'melee'; via: Vec } | null {
  if (u.acted || (mode !== 'auto' && mode !== 'melee')) return null;
  const tiles = [u.pos, ...battle.moveTiles(u)];
  let best: Vec | null = null;
  for (const p of tiles) if (battle.canMelee(u, t, p) && (!best || battle.grid.hasAnyCover(p) > battle.grid.hasAnyCover(best))) best = p;
  return best ? { kind: 'melee', via: best } : null;
}

/** 预测面板与右下 VOLTAGE 星（含标签）重叠时，把星整体左移到面板左侧外（只动视图，不动面板） */
function avoidVoltStar(fcEl: HTMLElement, fcOn: boolean) {
  const vs = $('#volt-star') as HTMLElement;
  if (!fcOn) { if (vs.style.transform) vs.style.transform = ''; return; }
  const prev = vs.style.transform;
  // 用 offset*（不受 transform/过渡影响）取星的原始位置，避免每帧重置 transform 打断过渡
  const ar = (vs.offsetParent as HTMLElement | null)?.getBoundingClientRect() ?? { left: 0, top: 0 };
  const b = { left: ar.left + vs.offsetLeft, top: ar.top + vs.offsetTop, right: ar.left + vs.offsetLeft + vs.offsetWidth, bottom: ar.top + vs.offsetTop + vs.offsetHeight, height: vs.offsetHeight };
  const a = fcEl.getBoundingClientRect();
  const pad = 10;
  const hit = a.left < b.right + pad && a.right + pad > b.left && a.top < b.bottom + pad && a.bottom + pad > b.top;
  let want = '';
  if (hit) {
    // 优先往下挪到面板下方（不压地图）；放不下（会压到队伍头像/CHARGE）再左移到面板外侧
    const pr = ($('#party') as HTMLElement).getBoundingClientRect();
    const dy = Math.ceil(a.bottom + 4 - b.top);
    const avail = pr.top - 2 - (a.bottom + 4);
    if (b.bottom + dy <= pr.top - 2) want = `translateY(${dy}px)`;
    else if (avail >= b.height * 0.7) want = `translateY(${dy}px) scale(${(avail / b.height).toFixed(3)})`;
    else want = `translateX(${-Math.ceil(b.right - a.left + pad)}px)`;
  }
  if (prev !== want) { vs.style.transform = want; vs.classList.toggle('dodge', !!want); }
}

/** 预测卡贴在目标头顶（屏幕空间）：水平居中对准目标、夹在屏幕内；上方放不下就放到脚下，箭头始终指向目标 */
function placeForecast(fcEl: HTMLElement, id: string, w: number, h: number) {
  const g = unitMesh.get(id);
  if (!g) return;
  const head = g.position.clone().add(new THREE.Vector3(0, 1.25, 0)).project(viewCam);
  const foot = g.position.clone().project(viewCam);
  const sx = ((head.x + 1) / 2) * w, hy = ((1 - head.y) / 2) * h, fy = ((1 - foot.y) / 2) * h;
  const cw = fcEl.offsetWidth || 148, ch = fcEl.offsetHeight || 96;
  const left = Math.round(Math.min(w - cw - 8, Math.max(8, sx - cw / 2)));
  let top = Math.round(hy - ch - 12);
  const below = top < 6;
  if (below) top = Math.round(Math.min(h - ch - 6, fy + 14));
  fcEl.classList.toggle('below', below);
  fcEl.style.left = `${left}px`; fcEl.style.top = `${top}px`;
  fcEl.style.setProperty('--ax', `${Math.round(Math.min(cw - 12, Math.max(12, sx - left)))}px`);
}

function refreshLabels() {
  const w = window.innerWidth, h = window.innerHeight;
  const act = $('#actions');
  const su = selected ? battle.unit(selected) : null;
  const sg = su ? unitMesh.get(su.id) : null;
  const fcEl = $('#forecast');
  const fcOn = !fcEl.classList.contains('hidden');
  if (fcOn && previewTarget) placeForecast(fcEl, previewTarget, w, h);
  avoidVoltStar(fcEl, fcOn);
  if (sg && battle.phase === 'player' && !busy && !fcOn) {
    const v = sg.position.clone().add(new THREE.Vector3(0, 0.5, 0)).project(viewCam);
    const sx = ((v.x + 1) / 2) * w, sy = ((1 - v.y) / 2) * h;
    act.style.right = `${Math.max(8, w - sx + 34)}px`; act.style.left = 'auto';
    act.style.top = `${Math.min(h - 200, Math.max(60, sy - 70))}px`; act.style.bottom = 'auto';
    act.classList.remove('hidden');
  } else act.classList.add('hidden');
  for (const u of battle.units) {
    const el = labelEl.get(u.id);
    const g = unitMesh.get(u.id);
    if (!el || !g) continue;
    const hidden = battle.isHidden(u); // 未解锁区域的敌人不画（HARK-NOTES-ENGINE #8）
    const gone = u.ko && !fxKeep.has(u.id); // 本批事件里还没播到 ko 的单位先留着（总攻/1 MORE 演出要看见它挨打）
    g.visible = !gone && !hidden;
    if (gone || hidden || (fcOn && u.id === previewTarget)) { el.style.display = 'none'; continue; }
    const shield = g.getObjectByName('shield');
    if (shield && u.facing) { g.rotation.y = Math.atan2(u.facing.x, u.facing.y); }
    if (u.prop && u.prop !== 'flag' && u.prop !== 'speaker') { el.style.display = 'none'; continue; }
    if (u.prop) {
      // 红旗 / 喇叭：头顶 HP 条（可破坏物件）
      const v = g.position.clone().add(new THREE.Vector3(0, u.prop === 'flag' ? 2.45 : 1.6, 0)).project(viewCam);
      el.style.display = '';
      el.style.left = `${((v.x + 1) / 2) * w}px`;
      el.style.top = `${((1 - v.y) / 2) * h}px`;
      el.className = `lbl prop ${u.prop}`;
      el.innerHTML = `<span class="pn">${u.prop === 'flag' ? '敌旗' : '喇叭'}</span><b>${u.hp}</b><div class="hp"><i style="width:${(100 * u.hp) / Math.max(1, u.maxHp)}%"></i></div>`;
      continue;
    }
    const rg = rigs.get(u.id);
    const v = g.position.clone().add(new THREE.Vector3(0, rg ? rg.height + 0.2 : 1.05, 0)).project(viewCam);
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
    el.innerHTML = u.side === 'enemy'
      ? `<div class="heart"><b>${u.hp}</b></div>${tags}` // P5T：敌人头顶心形 + HP 数字
      : `${u.name.split(' ').pop()}${tags}<div class="hp"><i style="width:${(100 * u.hp) / u.maxHp}%"></i></div>`;
    if (rg) {
      if (!busy) rg.setDowned(u.downed);
      if (!u.ko && rg.pose === 'dead') rg.revive();
      if (!busy && u.role === 'shielder' && u.facing) rg.faceTo(new THREE.Vector3(g.position.x + u.facing.x, 0, g.position.z + u.facing.y)); // 盾兵朝向 = 盾的方向
      rg.setDim(u.acted && battle.phase === 'player');
      if (!busy) g.position.y = gh(u.pos);
      continue;
    }
    if (!busy) {
      g.rotation.z = u.downed ? 1.2 : 0;
      g.position.y = gh(u.pos) + (u.downed ? 0.15 : 0);
    }
    g.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (m && 'opacity' in m && u.side === 'ally') { m.transparent = true; m.opacity = u.acted && battle.phase === 'player' ? 0.55 : 1; } });
  }
}

function refreshAll() { refreshOverlay(); refreshHud(); mapObj.refresh(); }

// ---------- 事件动画 ----------
// 召唤切入（Hark 演出）：P5 式——黑幕+蓝焰升腾+面具撕裂碎片+人格面具名+技能名。正版素材到后换角色切入立绘
const PERSONA_NAME: Record<string, string> = { joker: 'ARSÈNE', skull: 'CAPTAIN KIDD', panther: 'CARMEN', mona: 'ZORRO', fox: 'GOEMON', queen: 'JOHANNA',
  noir: 'MILADY', erina: 'CELESTINE', kasumi: 'CENDRILLON', crow: 'ROBIN HOOD', toshiro: 'PERSONA' };
let lastSummon = '';
async function summonCutIn(unitId: string, skillId: string) {
  const sig = unitId + ':' + skillId + ':' + battle.turn;
  if (sig === lastSummon) return; lastSummon = sig;
  const u = battle.unit(unitId);
  const sk = (SKILLS as Record<string, SkillDef>)[skillId] ?? (UNIQUES as Record<string, SkillDef>)[skillId];
  const el = $('#summon');
  const shards = Array.from({ length: 9 }, (_, i) => `<i class="sh" style="--a:${i * 40 + 10}deg;--d:${60 + (i % 3) * 30}px"></i>`).join('');
  el.innerHTML = `<div class="flame"></div><div class="mask">${shards}</div><div class="strip"><div class="who">${u.name}</div><div class="per">${PERSONA_NAME[u.id] ?? 'PERSONA'}!</div></div><div class="sk">${sk?.name ?? skillId}</div>`;
  el.classList.remove('hidden'); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  await sleep(950 / SPEED);
  el.classList.add('hidden');
}

function banner(text: string, yellow = false) {
  const b = $('#banner');
  // P5 式「勒索信」字块：每个字随机黑底/白底/红底、微旋转、大小不一，压在扫过的斜色带上
  const pal = ['k', 'w', 'r', 'k', 'w'];
  let seed = text.length * 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  b.innerHTML = `<div class="band"></div><div class="word">${[...text].map((ch, i) => ch === ' ' ? '<i class="sp"></i>'
    : `<span class="c ${pal[(i + Math.floor(rnd() * 3)) % pal.length]}" style="--r:${(rnd() * 16 - 8).toFixed(1)}deg;--s:${(0.85 + rnd() * 0.35).toFixed(2)};--d:${i * 22}ms">${ch}</span>`).join('')}</div>`;
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
  const v = pos.clone().add(new THREE.Vector3(0, 1.2, 0)).project(viewCam);
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
    const rg = rigs.get(id);
    if (rg) { rg.faceTo(b); rg.setRunning(!arc); }
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
  rigs.get(id)?.setRunning(false);
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

let aimActive = false;
let aimAnim: { t0: number; dur: number; from: THREE.Vector3; to: THREE.Vector3; look: THREE.Vector3; fov0: number; fov1: number } | null = null;
/** 过肩瞄准：射手右肩后上方 → 目标胸口；450ms 推近 + FOV 收窄，叠准星/黑边（P5T 枪击机位） */
async function aimShot(attackerId: string, targetId: string, reticle = true) {
  const SPEED = aimSpeed(); // 敌方回合点屏快进时整体加速
  const a = unitMesh.get(attackerId), t = unitMesh.get(targetId);
  if (!a || !t) return;
  const ap = a.position.clone(), tp = t.position.clone();
  const dir = tp.clone().sub(ap); dir.y = 0;
  if (dir.lengthSq() < 1e-4) return;
  dir.normalize();
  const right = new THREE.Vector3(-dir.z, 0, dir.x);
  const look = tp.clone().add(new THREE.Vector3(0, 0.55, 0));
  const from = ap.clone().addScaledVector(dir, -2.1).addScaledVector(right, 0.85).add(new THREE.Vector3(0, 1.55, 0));
  const to = ap.clone().addScaledVector(dir, -1.05).addScaledVector(right, 0.5).add(new THREE.Vector3(0, 1.05, 0));
  const el = canvas;
  aimCam.aspect = el.clientWidth / Math.max(1, el.clientHeight);
  aimCam.position.copy(from); aimCam.lookAt(look); aimCam.fov = 50; aimCam.updateProjectionMatrix();
  aimAnim = { t0: performance.now(), dur: 450 / SPEED, from, to, look, fov0: 50, fov1: 34 };
  viewCam = aimCam; aimActive = true; document.body.classList.add('aiming');
  const ov = $('#aim'); ov.classList.remove('hidden', 'fire'); ov.classList.toggle('noret', !reticle); ov.classList.toggle('foe', battle.unit(attackerId).side !== 'ally'); void ov.offsetWidth; ov.classList.add('on');
  const r = ov.querySelector('.reticle') as HTMLElement | null;
  if (r) { const v = look.clone().project(aimCam); r.style.left = `${(v.x + 1) * 50}%`; r.style.top = `${(1 - v.y) * 50}%`; }
  await sleep((reticle ? 520 : 420) / SPEED);
  if (reticle) ov.classList.add('fire');
  await sleep(90 / SPEED);
}
function aimStep() {
  if (!aimAnim) return;
  const k = Math.min(1, (performance.now() - aimAnim.t0) / aimAnim.dur), e = 1 - Math.pow(1 - k, 3);
  aimCam.position.lerpVectors(aimAnim.from, aimAnim.to, e);
  aimCam.fov = aimAnim.fov0 + (aimAnim.fov1 - aimAnim.fov0) * e;
  aimCam.lookAt(aimAnim.look); aimCam.updateProjectionMatrix();
  const r = document.querySelector('#aim .reticle') as HTMLElement | null;
  if (r) { const v = aimAnim.look.clone().project(aimCam); r.style.left = `${(v.x + 1) * 50}%`; r.style.top = `${(1 - v.y) * 50}%`; }
}
async function endAim(hold = 260) {
  if (!aimActive) return;
  await sleep(hold / aimSpeed());
  aimActive = false; aimAnim = null; viewCam = camera; document.body.classList.remove('aiming');
  const ov = $('#aim'); ov.classList.remove('on', 'fire'); ov.classList.add('hidden');
}

const SPEED = Number(params.get('speed') ?? '1');
setFxSpeed(SPEED);

// ---------- 敌方回合镜头（Hark 演出，P5T 式；只动视图） ----------
// 规则层 endPlayerPhase() 一次性结算完整个敌方回合，battle.phase 已是下一阶段，所以演出阶段用 vPhase 跟踪。
let vPhase: 'player' | 'enemy' = 'player';
const enemyCam = { saved: null as ReturnType<CameraRig['saveTarget']> | null, actor: null as string | null, skip: false };
let camFollow: string | null = null; // 每帧跟随的单位（敌人走格时）
const efast = () => SPEED > 1 || enemyCam.skip;
function aimSpeed() { return vPhase === 'enemy' && enemyCam.skip ? SPEED * 3 : SPEED; }
const isFoe = (id: string) => { const u = battle.unit(id); return !!u && u.side !== 'ally' && !u.prop; };
async function startEnemyCam() {
  vPhase = 'enemy';
  enemyCam.saved = rig.saveTarget(); enemyCam.actor = null; enemyCam.skip = false;
  document.body.classList.add('enemy-turn');
  refreshHud();
  await enemyTurnBanner(efast() ? 520 / SPEED : 900);
}
function endEnemyCam() {
  if (vPhase !== 'enemy') return false;
  vPhase = 'player'; camFollow = null; enemyCam.actor = null;
  document.body.classList.remove('enemy-turn');
  if (enemyCam.saved) { rig.restoreTarget(enemyCam.saved); enemyCam.saved = null; return true; }
  return false;
}
/** 换到新的行动敌人：先把镜头平移推近到它身上，停一下再行动 */
async function enemyActorIntro(id: string) {
  if (vPhase !== 'enemy' || enemyCam.actor === id || !isFoe(id)) return;
  enemyCam.actor = id;
  const g = unitMesh.get(id);
  rig.focus(g ? g.position.clone() : w2v(battle.unit(id).pos), Math.max(rig.userZoom, Math.min(rig.zMax, 1.45)));
  if (g) actorPing(g.position.clone());
  await sleep(efast() ? 90 / SPEED : 460);
}
/** 行动者脚下红色扩散环（谁在动一眼可见） */
function actorPing(p: THREE.Vector3) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.46, 32), new THREE.MeshBasicMaterial({ color: 0xe60012, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, p.y + 0.04, p.z); ring.renderOrder = 5;
  world.add(ring);
  const t0 = performance.now(), dur = efast() ? 260 : 520;
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / dur);
    ring.scale.setScalar(1 + k * 1.6); (ring.material as THREE.MeshBasicMaterial).opacity = 0.95 * (1 - k);
    if (k < 1) requestAnimationFrame(step); else { world.remove(ring); ring.geometry.dispose(); }
  };
  step();
}
// 敌方回合点屏任意处 = 快进（剩余镜头停顿压到最短）
window.addEventListener('pointerdown', () => { if (busy && vPhase === 'enemy') { enemyCam.skip = true; document.body.classList.add('enemy-skip'); } }, true);
const hook = { pauseOn: null as string | null, pauseDelay: 0, paused: false, released: false, resume() { hook.released = true; document.body.classList.remove('frozen'); } }; // 解冻立即生效：物件动画（扫开/开箱）在事件处理中被 await
async function play(events: BattleEvent[]) {
  busy = true;
  clearOverlay();
  refreshHud();
  let rebuild = false;
  let sawDown = false; // 本次 1 MORE 之前是否有「打倒」（Truth Seeker 发的 1 MORE 不做切入）
  const handled = new Set<BattleEvent>();
  fxKeep.clear();
  for (const e of events) if (e.type === 'ko') fxKeep.add(e.unitId);
  for (const [ei, e] of events.entries()) {
    if (handled.has(e)) continue;
    let pausing = false;
    if (hook.pauseOn === e.type) {
      // 截图钩子：事件开始 pauseDelay 毫秒后冻结画面（CSS 动画与爆炸闪光），等 resume
      hook.pauseOn = null;
      pausing = true;
      setTimeout(() => { document.body.classList.add('frozen'); hook.paused = true; }, hook.pauseDelay);
    }
    switch (e.type) {
      case 'phaseStart':
        if (e.phase === 'enemy') await startEnemyCam();
        if (e.phase === 'player') { document.body.classList.remove('enemy-skip'); if (!endEnemyCam()) camFocus(null); refreshHud(); } // 我方回合：回到玩家镜头（无存档则对准可行动角色）
        if (e.phase === 'player' && e.turn > 1) { banner(`TURN ${e.turn}`); await sleep(500 / SPEED); }
        break;
      case 'move': {
        const foeCam = vPhase === 'enemy' && isFoe(e.unitId);
        if (foeCam) { await enemyActorIntro(e.unitId); camFollow = e.unitId; }
        await tweenPath(e.unitId, e.path.length ? e.path : [e.from, battle.unit(e.unitId).pos], (foeCam && !efast() ? 150 : 90) / SPEED);
        if (foeCam) { camFollow = null; await sleep(efast() ? 0 : 160); }
        break;
      }
      case 'dash': popDamage(e.unitId, e.kind === 'ladder' ? 'DASH↕' : 'JUMP'); break;
      case 'knockback':
        if (!e.blocked || !eq(e.from, e.to)) await tweenPath(e.unitId, [e.from, e.to], 70 / SPEED, e.fly ? 1.2 : 0);
        if (e.blocked) popDamage(e.unitId, e.collidedWith ? '撞击!' : '挡住');
        break;
      case 'pull': await tweenPath(e.unitId, e.path.length ? e.path : [e.from, e.to], 80 / SPEED); popDamage(e.unitId, e.effect === 'hypno' ? '催眠' : '漩涡'); break;
      case 'dizzyMove': await tweenPath(e.unitId, [e.from, e.to], 90 / SPEED, 0.3); popDamage(e.unitId, '眩晕'); break;
      case 'fall': popDamage(e.unitId, '坠落!', 'big'); await sleep(220 / SPEED); break;
      case 'followUp': sawDown = true; banner('FOLLOW UP!', true); toast(`${battle.unit(e.shooterId).name} 追击！${battle.unit(e.creditId).name} 获得 1 MORE`); await sleep(600 / SPEED); break;
      case 'meleeStep': unitMesh.get(e.unitId)?.position.copy(w2v(e.to)); break;
      case 'attack': {
        const foeAtk = vPhase === 'enemy' && isFoe(e.attackerId);
        if (foeAtk) await enemyActorIntro(e.attackerId);
        { const tg = unitMesh.get(e.targetId); const ar = rigs.get(e.attackerId); if (tg && ar) ar.aim(tg.position, e.kind === 'melee' || e.kind === 'counter' ? 'melee' : e.kind === 'skill' || e.kind === 'unique' ? 'skill' : 'gun', 2400 / SPEED); const tr = rigs.get(e.targetId); const ag = unitMesh.get(e.attackerId); if (tr && ag) tr.faceTo(ag.position); }
        if (e.skillId && battle.unit(e.attackerId).side === 'ally') await summonCutIn(e.attackerId, e.skillId);
        if (e.kind === 'gun' && !params.has('noaim')) await aimShot(e.attackerId, e.targetId);
        else if (foeAtk && !params.has('noaim')) await aimShot(e.attackerId, e.targetId, false); // 敌方近战/技能：过肩机位 + 上下黑边，无准星
        break;
      }
      case 'damage': rigs.get(e.unitId)?.flinch(); popDamage(e.unitId, `${e.amount}${e.resist ? '▼' : ''}`); await sleep(240 / SPEED); await endAim(vPhase === 'enemy' && !efast() ? 420 : 260); break;
      case 'heal': popDamage(e.unitId, `+${e.amount}`, 'heal'); await sleep(200 / SPEED); break;
      case 'miss': popDamage(e.unitId, e.reason === 'shield' ? '盾挡!' : 'MISS'); await sleep(240 / SPEED); await endAim(); break;
      case 'down': { popDamage(e.unitId, 'DOWN!'); sawDown = true; const g = unitMesh.get(e.unitId); const dr = rigs.get(e.unitId); if (dr) dr.setDowned(true); else if (g) { g.rotation.z = 1.2; g.position.y = gh(battle.unit(e.unitId).pos) + 0.15; } break; }
      case 'oneMore': {
        const u = battle.unit(e.unitId);
        if (!sawDown || u.prop) { banner('1 MORE!'); await sleep(650 / SPEED); break; }
        sawDown = false;
        await oneMoreFx(u);
        break;
      }
      case 'tripleThreat': {
        const dmgs = events.slice(ei + 1).filter((x): x is Extract<BattleEvent, { type: 'damage' }> => x.type === 'damage' && x.source === 'triple');
        for (const d of dmgs) handled.add(d);
        await tripleFx(e, dmgs);
        break;
      }
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
      case 'ko': { popDamage(e.unitId, 'KO'); const kr = rigs.get(e.unitId); if (kr) kr.die(); await sleep((kr ? 650 : 200) / SPEED); } fxKeep.delete(e.unitId); break;
      case 'batonPassReady': toast(`${battle.unit(e.koId).name} 倒下：可 Baton Pass 换替补`); break;
      case 'batonPass': rebuild = true; banner('BATON PASS', true); break;
      case 'error': toast(e.message); break;
      case 'message': toast(e.text); await sleep(300 / SPEED); break;
      case 'guard': if (e.on) popDamage(e.unitId, 'GUARD', 'heal'); else if (battle.phase !== 'won') popDamage(e.unitId, '掩护消失'); break;
      case 'door': toast(`门 ${e.id} ${e.open ? '打开' : '关上'}`); await mapObj.onEvent(e); break;
      case 'elevator': build(); toast(`升降台${e.up ? '升起' : '降下'}`); break;
      case 'switch': popDamage(e.unitId, '开关!'); await mapObj.onEvent(e); break;
      case 'chest': await mapObj.onEvent(e); itemToast(e.reward, battle.unit(e.unitId).name); await sleep(300 / SPEED); break;
      case 'zoneUnlocked': { const c = zoneCenter(e.zone); if (c) camFocus(c, 1); toast('新区域解锁'); await mapObj.onEvent(e); break; }
      case 'alarm': banner('ALERT!', true); toast('被摄像头发现：敌方援军出现'); break;
      case 'reinforce': {
        build();
        const ps = e.unitIds.map((id) => battle.unit(id)).filter((u) => !battle.isHidden(u)).map((u) => u.pos);
        if (ps.length) camFocus({ x: Math.round(ps.reduce((s, p) => s + p.x, 0) / ps.length), y: Math.round(ps.reduce((s, p) => s + p.y, 0) / ps.length) }, 1.2);
        for (const id of e.unitIds) { const g = unitMesh.get(id); if (g) g.position.y += 40; }
        await slashBanner('增援', `REINFORCEMENTS ×${e.unitIds.length}`, 900 / SPEED);
        await dropIn(e.unitIds);
        break;
      }
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
  await endAim(0);
  camFollow = null;
  if (endEnemyCam()) document.body.classList.remove('enemy-skip'); // 敌方回合中途结算（败北等）也还原镜头
  fxKeep.clear();
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

// ---------- 1 MORE / Triple Threat 演出（Hark）：DOM 切入见 fx/cutins.ts，地图三角见 view/tripleFx.ts ----------
const fxKeep = new Set<string>();
const tfx = new TripleFx();
scene.add(tfx.group);
let freezeUntil = 0; // 顿帧：这之前不渲染新帧
const UNIT_TAG: Record<string, string> = { joker: 'LEADER', skull: 'CAPTAIN KIDD', panther: 'CARMEN', mona: 'ZORRO', fox: 'GOEMON', queen: 'JOHANNA', noir: 'MILADY', erina: 'CELESTINE', kasumi: 'CENDRILLON', crow: 'ROBIN HOOD' };
const cutWho = (u: Unit): CutWho => ({ id: u.id, name: u.name, side: u.side, color: u.side === 'enemy' ? '#7a0d18' : hexOf(u.id), tag: UNIT_TAG[u.id] });
/** 1 MORE：顿帧 0.15s（画面去色）→ 镜头推近行动者 → 红黑斜切切入 + 「1 MORE!」→ 镜头回到原处；之后 HUD 显示可再行动 */
async function oneMoreFx(u: Unit) {
  const skip = new Skip();
  refreshLabels();
  freezeUntil = performance.now() + fxMs(150);
  document.body.classList.add('hitstop');
  await skip.wait(150);
  document.body.classList.remove('hitstop');
  freezeUntil = 0;
  const saved = rig.saveTarget();
  const g = unitMesh.get(u.id);
  rig.focus(g ? g.position.clone() : w2v(u.pos), Math.min(rig.zMax, Math.max(rig.userZoom, rig.cur.zoom) * 1.5));
  await oneMoreCutIn(cutWho(u), skip, () => rig.restoreTarget(saved));
  rig.restoreTarget(saved);
  refreshHud();
}
/** Triple Threat：三角红光 + 镜头框住三角 → 勒索信横幅 → 三人切入带 → 逐个命中 → FINISH 收尾（≤3.5s，点屏跳过） */
async function tripleFx(e: Extract<BattleEvent, { type: 'tripleThreat' }>, dmgs: Extract<BattleEvent, { type: 'damage' }>[]) {
  const allies = e.allies.map((id) => battle.unit(id));
  const pos = (id: string) => unitMesh.get(id)?.position.clone() ?? w2v(battle.unit(id).pos);
  const aPos = allies.map((a) => pos(a.id)), vPos = e.victims.map(pos);
  const saved = rig.saveTarget();
  clearOverlay();
  await tripleThreatSeq(allies.map(cutWho), {
    victims: dmgs.length,
    showTriangle() { tfx.show(aPos, vPos, fxMs(380)); rig.fitPoints([...aPos, ...vPos], 2); },
    hit(i) { const d = dmgs[i]; tfx.hit(pos(d.unitId)); popDamage(d.unitId, String(d.amount), 'tt'); },
    done() { tfx.clear(); rig.restoreTarget(saved); },
  }, new Skip());
}

/** 增援落地：从高空砸下 + 红色冲击环 */
async function dropIn(ids: string[]) {
  await Promise.all(ids.map((id, i) => new Promise<void>((res) => {
    const g = unitMesh.get(id);
    if (!g) return res();
    const to = w2v(battle.unit(id).pos), from = to.clone().add(new THREE.Vector3(0, 6, 0));
    g.position.copy(from);
    const t0 = performance.now() + i * 120 / SPEED, dur = 380 / SPEED;
    const step = () => {
      const k = Math.max(0, Math.min(1, (performance.now() - t0) / dur));
      g.position.lerpVectors(from, to, k * k);
      if (k < 1) { requestAnimationFrame(step); return; }
      const r = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 6), new THREE.MeshBasicMaterial({ color: 0xe60012, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
      r.rotation.x = -Math.PI / 2; r.position.copy(to).add(new THREE.Vector3(0, 0.05, 0));
      world.add(r);
      void mapObj.tween(360, (q) => { r.scale.setScalar(1 + q * 2.2); (r.material as THREE.MeshBasicMaterial).opacity = 1 - q; }, () => world.remove(r));
      res();
    };
    step();
  })));
  await sleep(150 / SPEED);
}
function zoneCenter(z: string): Vec | null {
  const zs = battle.map.zones;
  if (!zs) return null;
  let sx = 0, sy = 0, n = 0;
  zs.forEach((row, y) => row.forEach((c, x) => { if (c === z) { sx += x; sy += y; n++; } }));
  return n ? { x: Math.round(sx / n), y: Math.round(sy / n) } : null;
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

// 单指拖 >8px = 平移镜头，否则 = 点击；捏合/滚轮缩放；双指扭转或 Q/E = 旋转 90°
attachCameraInput(canvas, rig, (e) => onTap(pick(e)), () => !aimActive);
mountCamButtons((d) => rig.rotate(d));

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
    commitAttack(s, u);
    return;
  }
  onTapTile(h);
}
/** 执行对敌攻击（第二次点目标 / 预测面板「确认」） */
function commitAttack(s: Unit, u: Unit) {
    const from = previewTile ?? s.pos;
    const at = attackFrom(s, from, u);
    const via = !at ? meleeViaMove(s, u) : null;
    if (!at && !via) return;
    const evs: BattleEvent[] = [];
    const dest = via ? via.via : previewTile;
    if (dest && !eq(dest, s.pos)) evs.push(...battle.move(s.id, dest));
    const kind = at ? at.kind : 'melee';
    if (kind === 'melee') evs.push(...battle.melee(s.id, u.id));
    else if (kind === 'gun') evs.push(...battle.shoot(s.id, u.id));
    else evs.push(...battle.skill(s.id, at!.skill!.id, u.id));
    void play(evs);
}
function onTapTile(h: { tile?: Vec; unit?: string }) {
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

$('#endbar').addEventListener('click', () => { if (busy || battle.phase !== 'player') return; selected = null; void play(battle.endPlayerPhase()); });
$('#party').addEventListener('click', (ev) => {
  const c = (ev.target as HTMLElement).closest('[data-charge]') as HTMLElement | null;
  if (c && selected && !busy) { void play(battle.selectCharge(selected, c.dataset.charge as never)); return; }
  const p = (ev.target as HTMLElement).closest('[data-uid]') as HTMLElement | null;
  if (p) { onTap({ unit: p.dataset.uid! }); const u = battle.unit(p.dataset.uid!); if (!rig.inView(w2v(u.pos))) camFocus(u.pos, rig.userZoom); }
});
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
$('#forecast').addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest('button');
  if (!b || busy || !selected || !previewTarget) return;
  if (b.dataset.fc === 'cancel') { previewTarget = null; return refreshAll(); }
  if (b.dataset.fc === 'ok') commitAttack(battle.unit(selected), battle.unit(previewTarget));
});
const sel = $<HTMLSelectElement>('#map-select');
sel.innerHTML = MAPS.map((m, i) => `<option value="${i}">${m.name}</option>`).join('');
sel.value = String(mapIdx);
sel.addEventListener('change', () => { mapIdx = Number(sel.value); makeMap = () => MAPS[mapIdx].make(); restart(); });
let makeMap: () => MapDef = () => MAPS[mapIdx].make();
mountLevelSelect({ onPick: (make) => { makeMap = make; restart(); return battle; } });
window.addEventListener('resize', () => { fitCamera(true); refreshLabels(); });

function restart() {
  $('#result').classList.add('hidden');
  battle = new Battle(makeMap());
  freshMap = true; mapObj.reset();
  selected = null; previewTile = null; previewTarget = null; inspectEnemy = null; mode = 'auto';
  build();
  void play(battle.start());
}

function loop() {
  if (performance.now() < freezeUntil) { requestAnimationFrame(loop); return; } // 1 MORE 顿帧
  tfx.update();
  if (camFollow) { const g = unitMesh.get(camFollow); if (g) rig.focus(g.position.clone(), rig.tgt.zoom); }
  camStep();
  aimStep();
  mapObj.update();
  for (const r of rigs.values()) r.update();
  const t = performance.now() / 1000;
  sceneKit.update(rig.cur.yaw, t);
  for (const u of battle.units) if (u.prop === 'flag' || u.prop === 'speaker') { const g = unitMesh.get(u.id); if (g) (u.prop === 'flag' ? waveFlag : pulseSpeaker)(g, t); }
  renderer.render(scene, viewCam);
  refreshLabels();
  requestAnimationFrame(loop);
}

if (params.get('level')) { const lv = params.get('level')!; makeMap = () => levelMap(lv); }
restart();
loop();

// 调试/截图钩子
declare global { interface Window { __p5t: unknown } }
window.__p5t = {
  get battle() { return battle; },
  sceneKit,
  renderInfo() { return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries }; },
  get busy() { return busy; },
  rigs,
  get jokerModel() { return rigs.size > 0; },
  /** 截图用特写机位：从单位前方 ang 弧度方向、距离 dist 看它（null 还原俯视） */
  portrait(id: string | null, ang = 0, dist = 2.2, h = 0.9) {
    if (!id) { viewCam = camera; return; }
    const g = unitMesh.get(id); if (!g) return;
    const c = g.position.clone().add(new THREE.Vector3(0, 0.55, 0));
    aimCam.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight); aimCam.fov = 40;
    aimCam.position.copy(c).add(new THREE.Vector3(Math.sin(ang) * dist, h, Math.cos(ang) * dist));
    aimCam.lookAt(c); aimCam.updateProjectionMatrix(); viewCam = aimCam;
  },
  banner,
  summonCutIn,
  setMode(m: Mode) { mode = m; refreshAll(); },
  setSkill(id: string) { mode = 'skill'; skillId = id; refreshAll(); },
  tap: onTap,
  select(id: string) { onTap({ unit: id }); },
  rig,
  mapObj,
  slashBanner,
  enemyTurnBanner,
  get vPhase() { return vPhase; },
  enemyCam,
  /** 读 L01–L10 关卡 JSON 开局（截图/调试用） */
  loadLevel(id: string) { makeMap = () => levelMap(id); restart(); },
  loadMap(i: number) { mapIdx = i; sel.value = String(i); makeMap = () => MAPS[mapIdx].make(); restart(); },
  hook,
  play,
  key,
  /** 演出 demo（截图用）：'oneMore' = Joker 枪击打倒 e1；'triple' = 同局再发动总攻（三角内 e1/e2/e3，e4 在外） */
  demo(kind: 'oneMore' | 'triple' = 'triple') {
    const rows = ['. . . . . . . .', '. S . . . . P .', '. . . . . . . .', '. . . 1 2 . . .', '. . . . 3 . . .', '. . . . . . . .', '. . . J . . 4 .'];
    const foe = (id: string, name: string, hp: number) => enemy(id, name, 'brute', hp, { move: 0 });
    makeMap = () => ({ id: `demo-${kind}`, name: '演出 demo', turnTarget: 3, win: { type: 'defeatAll' },
      ...parseMap(rows, { J: JOKER, S: SKULL, P: PANTHER, '1': foe('e1', 'Musketeer', 260), '2': foe('e2', 'Grenadier', 90), '3': foe('e3', 'Drummer', 260), '4': foe('e4', 'Musketeer', 260) }) });
    restart();
    return battle;
  },
  get fxKeep() { return fxKeep; },
  /** 攻击预测截图 demo：'gun' 半掩体+高处 / 'skill' 弱点 1 MORE / 'push' 近战推人 / 'lethal' 斩杀 */
  forecastDemo(kind: 'gun' | 'skill' | 'push' | 'lethal') {
    const foe = (id: string, name: string, hp: number) => enemy(id, name, 'brute', hp, { move: 0 });
    const L: Record<string, { rows: string[]; heights?: string[] }> = {
      gun: { rows: ['. . . . . . . .', '. . . 1 . . . .', '. . . h . . . .', '. . . . . . . .', '. . . . . . . .', '. . . J . . . .', '. . . . . . . .'],
        heights: ['00000000', '00000000', '00000000', '00000000', '00011000', '00011000', '00011000'] },
      skill: { rows: ['. . . . . . . .', '. . . . . . . .', '. . . 1 . 2 . .', '. . . . . . . .', '. . . . . . . .', '. . . P . . . .', '. . . . . . . .'] },
      push: { rows: ['. . . . . . . .', '. . . . . . . .', '. . . . . . . .', '. . J 1 . . . .', '. . . . . . # .', '. . . . . . . .', '. . . . . . . .'] },
      lethal: { rows: ['. . . . . . . .', '. . . . . . . .', '. . . 2 . . . .', '. . . 1 . . . .', '. . . . . . . .', '. . . S . . . .', '. . . . . . . .'] },
    };
    const d = L[kind];
    const units = { J: JOKER, S: SKULL, P: PANTHER, '1': foe('e1', kind === 'lethal' ? 'Grenadier' : 'Musketeer', kind === 'lethal' ? 14 : 180), '2': foe('e2', 'Drummer', 180) };
    makeMap = () => ({ id: `fc-${kind}`, name: '预测 demo', turnTarget: 3, win: { type: 'defeatAll' }, ...parseMap(d.rows, units, d.heights) });
    restart();
    return battle;
  },
};
