// 灰盒表现层：three.js 方块 + HTML HUD。只读 Battle 状态、只调用 Battle 指令、只消费事件。
import * as THREE from 'three';
import { PostFx } from './view/postFx';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Battle, MAPS, key, eq, VOLTAGE_MAX, PASSIVE_INFO, SKILLS, UNIQUES, parseMap, enemy, JOKER, SKULL, PANTHER } from './rules';
import type { BattleEvent, SkillDef, Unit, Vec, StatusId, MapDef } from './rules';
import { mountLevelSelect } from './game/levelSelect'; // Q12 关卡选择（最简按钮，Hark 美化）
import { levelMap } from './game/levels';
import { CameraRig } from './view/cameraRig';
import { attachCameraInput } from './view/cameraInput';
import { MapObjects } from './view/mapObjects';
import { makeFlag, makeSpeaker, waveFlag, pulseSpeaker } from './view/props';
import { slashBanner, itemToast, enemyTurnBanner } from './fx/banners';
import { playTurnChange, turnChangeAvailable, turnChangeReady } from './fx/turnChange';
import { updateObjectiveHud, mountCamButtons } from './ui/hud';
import { p5, PORTRAIT, initP5tHud, letterPop } from './ui/p5tHud';
import './p5t-hud.css';
import './skill-list.css';
import { SkillList, skillNameZh, SKL_TEX } from './ui/skillList';
import { CommandMenu } from './ui/commandMenu';
import { showResultScreen } from './ui/resultScreen';
import type { CmdKey } from './ui/commandMenu';
import { oneMoreCutIn, tripleThreatSeq, Skip, setFxSpeed, fxMs } from './fx/cutins';
import type { CutWho } from './fx/cutins';
import { TripleFx } from './view/tripleFx';
import { SceneKit, themeFor, cobbleTex, preloadKit } from './view/sceneKit';
import { sfx, installUnlock, preloadSfx } from './view/sfx';
import { playLevelBgm, stopBgm } from './view/bgm';
import { buildDamageView, playDamageClip, digitPx } from './view/damagePop';
import { attachGimmicks, swapPropModel, releaseGimmicks } from './view/gimmick';
import { SKILL_CAM, poseSkillCam } from './view/skillCam';
import { origCfg, origFailed, attachOrigMap, releaseOrigMap, updateOrigMap, setOrigCamCut, origSurfaceY, applyOrigSun, origTone, setAimSeeThrough } from './view/origMap';
void preloadKit(); // CC0 布景模型提前加载
import { computeForecast, forecastHtml } from './view/forecast';
import type { Forecast } from './view/forecast';
import { preloadJoker, makeJoker, jokerReady } from './view/jokerModel';
import type { UnitRig } from './view/chibiRig';
import { RUN_MS_PER_TILE } from './view/chibiRig';
import { makeSkull, makeMona, makeShadow } from './view/partyModels';
import { preloadChar, makeChar, charReady, SPECS } from './view/p5tChar';
import RESULT_CAM from './view/data/result-cam.json';
import RESULT_BANDS_JSON from './view/data/result-bands.json';
import { SummonDim, skillHit, CASTER_LAYER } from './view/skillFx';
import { origSkillHit, hasOrigSkillFx, preloadSkillFx, setSkillFxCamera, showPersona, summonAura, personaKeyOf, preloadPersonas } from './view/skillFxOrig';
import { hitstopMs, shake, applyShake, undoShake, spark, updateHitFx, recoil, preloadHitFx, lastSparkKind } from './view/hitFx';
import type { HitSpec } from './view/hitFx';
import { loadSdfFont, renderSdf, hydrateSdf } from './ui/sdfFont';
// 角色模型：全部优先 P5T 正版模型 + 原版动作（p5tChar.ts；私用 GLB 不入库，缺文件时 → 程序化 chibiRig 回退，加载完成后就地替换）。
// Joker 另有社区模型回退（jokerModel.ts）。敌兵：火枪手系（shooter / teleporter）= Em0001_110；被洗脑的 Skull = Skull 模型；Marie = Em0501；
// 守卫（Grenadier）/伴奏者（Drummer）等原版模型（Em0002/Em0003…）还没提取 → 程序化回退（已列入 HARK-TO-CODEX 请求）。
const rigs = new Map<string, UnitRig>();
const wantsRig = (u: Unit) => !u.decoy && !u.prop && (u.side === 'enemy' || (u.side === 'ally' && (u.id === 'joker' || u.id in SPECS)));
/**
 * 单位 → 正版角色 key（null = 没有对应原版模型）。敌兵按关卡里原版单位名/职能对到原版模型：
 *   Musketeer 火枪手 10001xxx → Em0001_110（狙击 10001015 → Em0001_016）；Grenadier 10002xxx → Em0002_010；Drummer 10003xxx → Em0003_010；
 *   举止异常的 SKULL/FOX/PANTHER（2052/2054、5054、4054）→ Skull PC0002_151 / 被洗脑 PC0005_053 / PC0004_053（053 是导出到的洗脑款，054 未单独导出）。
 *   本作自编关卡里的「盾兵/护卫 Grenadier」也用 Em0002_010（原版盾兵外观未导出）。
 */
function p5tKeyFor(u: Unit): string | null {
  if (u.side === 'ally') return u.id === 'joker' ? null : u.id in SPECS ? u.id : null;
  if (/Marie/.test(u.name) || u.id === 'boss' && /玛丽|Marie/.test(u.name)) return 'marie';
  if (/FOX|Fox/.test(u.name)) return 'fox_bw';
  if (/PANTHER|Panther/.test(u.name)) return 'panther_bw';
  if (/龙司|SKULL|Skull/.test(u.name)) return 'skull';
  if (/狙击|Sniper/.test(u.name)) return 'em0001_016';
  if (/Drummer|鼓手|伴奏/.test(u.name) || u.role === 'supporter') return 'em0003_010';
  if (u.role === 'shooter' || u.role === 'teleporter' || /Musketeer|火枪手/.test(u.name)) return 'em0001_110';
  if (/Grenadier|守卫|看守|侍卫|护卫/.test(u.name) || u.role === 'revenger' || u.role === 'brute' || u.role === 'shielder' || u.role === 'launcher') return 'em0002_010';
  return null;
}
function makeRigFor(u: Unit): UnitRig | null {
  if (!wantsRig(u)) return null;
  if (u.side === 'ally' && u.id === 'joker') return makeJoker();
  const k = p5tKeyFor(u);
  const real = k ? makeChar(k) : null;
  if (real) return real;
  if (u.side === 'enemy') return makeShadow(u.role);
  return u.id === 'skull' ? makeSkull() : u.id === 'mona' ? makeMona() : null;
}
// r13：Joker 没有程序化回退 → 正版模型到之前只有黑色占位胶囊（r12 选目标截图里那个黑胶囊就是首载 ~18s 内截的图）。
// 修：开战时盖一层 LOADING（原版换关也是 LOADING 黑屏；贴图未导出 → 自绘黑底白字，重建），等所有正版角色模型加载完/失败（最多 25s）再揭开。
let charPending = 1;
void preloadJoker().then((ok) => { if (ok && battle) swapInRigs(); }).finally(() => { charPending--; });
const charsReady = () => charPending <= 0 && (!battle || battle.units.every((u) => !(u.side === 'ally' && u.id === 'joker') || rigs.has(u.id) || !jokerReady()));
/** 只加载当前战斗用得到的正版模型（全部 13 个约 140MB，不一次性拉） */
function ensureChars() {
  const keys = new Set<string>();
  for (const u of battle.units) { const k = wantsRig(u) ? p5tKeyFor(u) : null; if (k) keys.add(k); }
  for (const k of keys) { charPending++; void preloadChar(k).then((ok) => { if (ok && battle) swapInRigs(k); }).finally(() => { charPending--; }); }
}
/** 正版模型加载完：把还是占位/程序化的单位就地换掉（key 给定时只换该角色） */
function swapInRigs(key?: string) {
  for (const u of battle.units) {
    const g = unitMesh.get(u.id);
    if (!g || !wantsRig(u)) continue;
    const old = rigs.get(u.id);
    if (old && !key) continue;
    if (key && (u.id === 'joker' ? 'joker' : p5tKeyFor(u)) !== key) continue;
    if (old && 'key' in old) continue; // 已是正版
    const r = makeRigFor(u); if (!r || r === old) continue;
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
const resultCam = new THREE.PerspectiveCamera(40, 1, 0.05, 400); // r14：结算专用机位（不被瞄准/特写动画覆盖）
let viewCam: THREE.Camera = camera;
const skillCam = new THREE.PerspectiveCamera(SKILL_CAM.fov, 2, 0.1, 300);
let skCam: { look: THREE.Vector3; yaw: number; dist: number; pitch: number } | null = null;
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
let LEVEL = 0.6; // 每层高度（原版地图关卡 = 原版两层可走高度差，见 view/origMap.ts）
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
/** r10：技能流程阶段（原版：指令牌 → 技能列表 → 选目标(左上技能名牌) → 切入 → 释放） */
let skillPhase: 'none' | 'list' | 'target' = 'none';
let previewTile: Vec | null = null;
let previewTarget: string | null = null;
let showThreat = false;
let inspectEnemy: string | null = null;
let busy = false;

const gh = (p: Vec) => (battle ? battle.grid.h(p) * LEVEL : 0);
const w2v = (p: Vec, y = 0) => new THREE.Vector3(p.x, y + gh(p), p.y);
const std = (color: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });

let gimmickCount = 0, placeholderCount = -1;
function build() {
  preloadHitFx(); preloadSfx(); preloadSkillFx();
  if (battle) preloadPersonas(battle.units.filter((u) => u.side === 'ally').map((u) => u.id)); // r16：本关上场者的原版 Persona
  if (world) scene.remove(world);
  world = new THREE.Group();
  overlay = new THREE.Group();
  scene.add(world);
  world.add(overlay);
  unitMesh.clear(); rigs.clear();
  ensureChars();
  tileMeshes.length = 0;
  $('#labels').innerHTML = '';
  labelEl.clear();
  const m = battle.map;
  const th = themeFor(m.id);
  scene.background = new THREE.Color(th.bg);
  scene.fog = th.fogNear < 900 ? new THREE.Fog(th.bg, th.fogNear, th.fogFar) : null;
  hemi.color.set(th.hemiSky); hemi.groundColor.set(th.hemiGround); hemi.intensity = th.hemiInt;
  sun.color.set(th.sunColor); sun.intensity = th.sunInt;
  // r7：L01–L06/L08 用原版 P5T 关卡场景（缺文件 → 回退 Kenney 布景）
  const oc = origCfg(m.id);
  const useOrig = !!oc && !origFailed(m.id);
  LEVEL = useOrig ? oc!.step : 0.6;
  let claimed: Set<string>;
  if (useOrig) {
    const cfg = oc!;
    scene.background = new THREE.Color(cfg.bg); scene.fog = null;
    hemi.color.set(cfg.hemi[0]); hemi.groundColor.set(cfg.hemi[1]); hemi.intensity = cfg.hemi[2];
    sun.color.set(cfg.sun[0]); sun.intensity = cfg.sun[1];
    sun.position.set((m.width - 1) / 2 + cfg.sunDir[0], cfg.sunDir[1], (m.height - 1) / 2 + cfg.sunDir[2]); sun.target.position.set((m.width - 1) / 2, 0, (m.height - 1) / 2); scene.add(sun.target);
    // r9：方向按原版 Directional Light（地图材质的直射强度/颜色也按原版，见 origMap.applyOrigSun）
    applyOrigSun(sun, cfg, new THREE.Vector3((m.width - 1) / 2, 0, (m.height - 1) / 2));
    const R = Math.max(m.width, m.height) * 0.75 + 4; const sc = sun.shadow.camera; sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 0.5; sc.far = 60; sc.updateProjectionMatrix();
    sceneKit.build(world, { ...m, id: '__none__' });
    claimed = new Set();
    for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) claimed.add(`${x},${y}`); // 掩体/墙都在原版场景里
    origLoading = true; sceneKit.ready = false;
    attachOrigMap(world, m.id, { w: m.width, h: m.height }, (ok, st) => {
      origLoading = false; origStats = st ?? null;
      if (!ok) { build(); return; }
      // r8：原版掩体 = 关卡运行时生成的 gimmick 单位 → 按原版 m_GimmickList 摆原版预制体（view/gimmick.ts）；
      // 剩下的掩体格若原版场景里也没有实物，才用 Kenney 掩体占位（自制占位，已标明）
      world.updateMatrixWorld(true);
      const orig = attachGimmicks(world, m.id, (x, y) => battle.grid.h({ x, y }) * LEVEL, (n) => { gimmickCount = n; });
      const miss = new Set<string>();
      for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
        const t = battle.grid.tile({ x, y }); if (t !== 'half' && t !== 'full') continue;
        if (orig.has(`${x},${y}`)) continue;
        const sy = origSurfaceY(x, y); const base = battle.grid.h({ x, y }) * LEVEL;
        if (sy === null || sy < base + 0.3) miss.add(`${x},${y}`);
      }
      placeholderCount = miss.size;
      if (miss.size) sceneKit.coverOnly(world, m, miss, LEVEL);
      sceneKit.ready = true;
    });
  } else {
    releaseOrigMap(); releaseGimmicks(); gimmickCount = 0; placeholderCount = -1;
    claimed = sceneKit.build(world, m);
  }
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
    if (useOrig) tile.visible = false; // 原版场景自带地面：格子只留作点选射线目标
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
  const fresh = freshMap;
  fitCamera(!freshMap);
  freshMap = false;
  if (fresh) { // 开局：P5T 式近景对准第一个可行动的我方角色（立即到位）
    const a = battle.alive('ally').find((x) => !x.prop && !x.decoy && !x.acted);
    if (a) { rig.focus(w2v(a.pos)); rig.cur = { ...rig.tgt }; rig.apply(); }
  }
}

function addUnitMesh(u: Unit) {
  const g = new THREE.Group();
  if (u.prop) {
    if (u.prop === 'barrel') {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.6, 16), std(0xc0161c));
      body.position.y = 0.3;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.08, 16), std(0xffd400, { emissive: 0x332200 }));
      band.position.y = 0.36;
      body.userData.placeholder = band.userData.placeholder = true;
      g.add(body, band);
      swapPropModel(g, 'barrel'); // r8：原版炸弹桶 unit_20001010（缺文件保留占位）
    } else if (u.prop === 'flag') {
      makeFlag(g);
      for (const c of g.children) c.userData.placeholder = true;
      swapPropModel(g, 'flag'); // r8：原版「真理惠军的不祥旗帜」unit_20001240（静态网格，原版布料动画未导出）
    } else if (u.prop === 'box') {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), std(0x8a5a2b));
      box.position.y = 0.4;
      g.add(box);
    } else {
      makeSpeaker(g);
    }
  } else if (wantsRig(u) && (u.id !== 'joker' || jokerReady()) && (u.side === 'enemy' || u.id === 'joker' || u.id === 'skull' || u.id === 'mona' || charReady(u.id))) {
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
const cmdMenu = new CommandMenu($('#app'), (a) => doAct(a));
document.body.classList.add('cmd-p5');
const rig = new CameraRig(camera);
rig.persp = params.get('cam') !== 'ortho'; // r12：原版透视战斗镜头（?cam=ortho = 旧正交俯视）
const baseCam = () => rig.view;
/** r12：开局镜头方位 = 从敌方看向我方的反向（相机在我方身后看向敌人，hud_idle_1212），按 90° 取整 */
function baseYawFor(): number {
  const al = battle.units.filter((u) => u.side === 'ally' && !u.prop && !u.decoy && !u.ko), en = battle.units.filter((u) => u.side === 'enemy' && !u.ko);
  if (!al.length || !en.length) return Math.PI / 4;
  const c = (us: Unit[]) => us.reduce((a, u) => ({ x: a.x + u.pos.x / us.length, y: a.y + u.pos.y / us.length }), { x: 0, y: 0 });
  const a = c(al), e = c(en);
  return Math.round(Math.atan2(a.x - e.x, a.y - e.y) / (Math.PI / 2)) * (Math.PI / 2);
}
const mapObj = new MapObjects({ w2v: (p, y = 0) => w2v(p, y), get level() { return LEVEL; }, get origScene() { return !!battle && !!origCfg(battle.map.id) && !origFailed(battle.map.id); } });
let origLoading = false;
let origStats: { tris: number; meshes: number; bytes: number } | null = null;
let freshMap = true;
function fitCamera(keep = true) {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  const m = battle.map;
  let maxH = 0;
  for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) maxH = Math.max(maxH, battle.grid.h({ x, y }));
  if (!keep) rig.baseYaw = baseYawFor();
  rig.setMap({ width: m.width, height: m.height, maxY: 1.4 + maxH * LEVEL }, w / h, keep, h);
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
let aimIds: string[] = []; // r14：瞄准中的射手/目标（红描边 + 目标标签保留）
let aimChance = false;
let resultHold = false; // r14：结算 3D 站位期间
// r14：局内表现贴图一律原版（tools/fetch-p5t-r14.sh → public/p5t-fieldfx，umbra-assets p5t/1_battle/field_fx）；缺图时回退到旧的重建画法。
const ffxTex = new Map<string, THREE.Texture | null>();
function ffx(n: string, wrap = false): THREE.Texture | null {
  if (!ffxTex.has(n)) {
    ffxTex.set(n, null);
    new THREE.TextureLoader().load(`p5t-fieldfx/${n}.png`, (t) => { t.colorSpace = THREE.SRGBColorSpace; if (wrap) t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; ffxTex.set(n, t); refreshOverlay(); }, undefined, () => {});
  }
  return ffxTex.get(n) ?? null;
}
/** 原版贴图平铺在格子上（mesh_panel.glb = 1×1、Y=0 的 quad，见 field_fx/meshes/README） */
function texTile(p: Vec, n: string, y = 0.03, opacity = 1, size = 1): boolean {
  const t = ffx(n); if (!t) return false;
  const q = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity, depthWrite: false }));
  q.rotation.x = -Math.PI / 2; q.position.copy(w2v(p, y)); q.renderOrder = 11; overlay.add(q); return true;
}
/** 原版条带贴图（Trail_*：横向渐变，V 方向 = 条带宽）沿曲线铺成贴地/竖直带 */
function ribbon(curve: THREE.Curve<THREE.Vector3>, n: string, width: number, segs: number, opts: { up?: boolean; additive?: boolean; depthTest?: boolean; opacity?: number; order?: number } = {}): boolean {
  const t = ffx(n); if (!t) return false;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const k = i / segs, c = curve.getPoint(k), tg = curve.getTangent(k);
    const side = opts.up ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(-tg.z, 0, tg.x).normalize();
    const a = c.clone().addScaledVector(side, width / 2), b = c.clone().addScaledVector(side, -width / 2);
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z); uv.push(k, 1, k, 0);
    if (i) { const o = (i - 1) * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: opts.opacity ?? 1, depthWrite: false, depthTest: opts.depthTest ?? true, side: THREE.DoubleSide, blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
  m.renderOrder = opts.order ?? 12; overlay.add(m); return true;
}
/** r10：白描边格（技能范围格：红色半透明 + 白描边，skill_list_2459 / predict_2501_2） */
function tileEdge(p: Vec) {
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.96, 0.96)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false }));
  e.rotation.x = -Math.PI / 2; e.position.copy(w2v(p, 0.04)); e.renderOrder = 12; overlay.add(e);
}

// ---------- r12：原版移动格样式（move_1346/1419/3532/3544/3805、command_1255） ----------
// 可移动范围 = 整块区域外轮廓白色细线（不填色）；站位/终点格 = 红色半透明 + 白描边；移动光标 = 黄色粗下箭头；
// 掩体（进入后可隐蔽）= 黑白盾牌图标，挂在掩体格朝单位一侧；其他队友脚下粉色圆环；路径 = 青蓝发光粗线（move_3805，推断为路径）。
const MOVE_EDGE = 0xffffff, STAND_RED = 0xe60012, PATH_CYAN = 0x29d8ff, CURSOR_YEL = 0xffd21a, MATE_PINK = 0xff5fae;
function rangeOutline(tiles: Vec[]) {
  const set = new Set(tiles.map((t) => key(t)));
  const mat = new THREE.MeshBasicMaterial({ color: MOVE_EDGE, transparent: true, opacity: 0.95, depthWrite: false });
  const W = 0.045;
  for (const t of tiles) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const n = { x: t.x + dx, y: t.y + dy };
    if (set.has(key(n)) && battle.grid.h(n) === battle.grid.h(t)) continue;
    const g = new THREE.PlaneGeometry(dx ? W : 1 + W, dx ? 1 + W : W);
    const m = new THREE.Mesh(g, mat); m.rotation.x = -Math.PI / 2;
    const c = w2v(t, 0.035); m.position.set(c.x + dx * 0.5, c.y, c.z + dy * 0.5); m.renderOrder = 11; overlay.add(m);
  }
}
function standTile(p: Vec) {
  if (texTile(p, 'stand', 0.03)) return; // r14：原版 panel/cursor_new01_white（红色发光方格，command_3456 脚下）
  tileQuad(p, STAND_RED, 0.5, 0.03);
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.9, 0.9)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthTest: false }));
  e.rotation.x = -Math.PI / 2; e.position.copy(w2v(p, 0.04)); e.renderOrder = 12; overlay.add(e);
}
function glowPath(path: Vec[]) {
  if (path.length < 2) return;
  const curve = new THREE.CatmullRomCurve3(path.map((p) => w2v(p, 0.07)), false, 'catmullrom', 0.05);
  if (ribbon(curve, 'trail_blue', 0.34, path.length * 8, { opacity: 0.95 })) return; // r14：原版 shotline/Trail_Blue 贴地条带（move_3805 青白发光带；网格重建）
  overlay.add(new THREE.Mesh(new THREE.TubeGeometry(curve, path.length * 8, 0.11, 6), new THREE.MeshBasicMaterial({ color: PATH_CYAN, transparent: true, opacity: 0.35, depthWrite: false })));
  overlay.add(new THREE.Mesh(new THREE.TubeGeometry(curve, path.length * 8, 0.05, 6), new THREE.MeshBasicMaterial({ color: 0xc8f6ff })));
}
let arrowGeo: THREE.BufferGeometry | null = null;
function moveCursor(p: Vec) {
  if (!arrowGeo) { // 粗下箭头（平面外形挤出，黑边由第二层放大实现）
    const s = new THREE.Shape(); s.moveTo(-0.13, 0.5); s.lineTo(0.13, 0.5); s.lineTo(0.13, 0.18); s.lineTo(0.3, 0.18); s.lineTo(0, -0.18); s.lineTo(-0.3, 0.18); s.lineTo(-0.13, 0.18); s.closePath();
    arrowGeo = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false }); arrowGeo.translate(0, 0, -0.04);
  }
  const g = new THREE.Group();
  const a = new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({ color: CURSOR_YEL }));
  const b = new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.BackSide })); b.scale.setScalar(1.18);
  g.add(b, a); g.position.copy(w2v(p, 1.25)); g.userData.billboard = true; g.name = 'moveCursor'; overlay.add(g);
}
let shieldTex: THREE.CanvasTexture | null = null;
function coverShield(cover: Vec, from: Vec) {
  if (!shieldTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d')!;
    const path = () => { x.beginPath(); x.moveTo(64, 10); x.quadraticCurveTo(100, 22, 112, 22); x.quadraticCurveTo(112, 92, 64, 118); x.quadraticCurveTo(16, 92, 16, 22); x.quadraticCurveTo(28, 22, 64, 10); x.closePath(); };
    x.lineJoin = 'round'; path(); x.lineWidth = 14; x.strokeStyle = '#e60012'; x.stroke(); x.fillStyle = '#111'; x.fill();
    x.save(); path(); x.clip(); x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 64); x.fillRect(64, 64, 64, 64); x.restore();
    path(); x.lineWidth = 5; x.strokeStyle = '#fff'; x.stroke();
    shieldTex = new THREE.CanvasTexture(c); shieldTex.colorSpace = THREE.SRGBColorSpace;
  }
  // r13：原版 prefab_covering_cursor = 贴在掩体朝单位那一面上的竖直平面（n/e/s/w × 100/50），贴图 menu_guard_icon_red（field_fx 原版）；
  // 用户反馈 r12 的 Sprite 广告牌「歪/浮空」→ 改成竖直平面贴在掩体面上（move_1346：盾牌占面宽 ~70%、半透明、中心在箱子中部偏上）。
  // 尺寸/高度/透明度按帧估（prefab 子物体 Transform 未导出 → 推断）。
  if (!guardTex) { guardTex = new THREE.TextureLoader().load('p5t-fieldfx/guard_icon_red.webp', undefined, undefined, () => { guardTex = shieldTex; }); guardTex.colorSpace = THREE.SRGBColorSpace; }
  const top = (origSurfaceY(cover.x, cover.y) ?? (gh(cover) + (battle.grid.tile(cover) === 'full' ? 1.0 : 0.55))) - gh(from);
  const h = Math.max(0.35, Math.min(1.3, top));
  const dx = from.x - cover.x, dz = from.y - cover.y;
  const c = w2v(cover, 0);
  if (guardGeo === undefined) { guardGeo = null; new GLTFLoader().load('p5t-fieldfx/guard_mesh.glb', (g) => { g.scene.traverse((o) => { const mm = o as THREE.Mesh; if (mm.isMesh && o.name.includes('guard')) guardGeo = mm.geometry; }); if (!guardGeo) g.scene.traverse((o) => { const mm = o as THREE.Mesh; if (mm.isMesh && !guardGeo && mm.geometry.attributes.position.count > 24) guardGeo = mm.geometry; }); refreshOverlay(); }, undefined, () => {}); }
  if (guardGeo) { // r14：原版 cover_cursor/guard_mesh（盾形厚片 0.78×0.87×0.13）+ mat_cover_100（menu_guard_icon_red，_BaseColor.a=0.784）
    const m = new THREE.Mesh(guardGeo, new THREE.MeshBasicMaterial({ map: guardTex, transparent: true, opacity: 0.784, depthWrite: false }));
    const g = new THREE.Group(); m.rotation.x = -Math.PI / 2; g.add(m);
    const sz = Math.min(0.8, h * 1.0); // prefab 缩放未导出 → 按 move_1346 盾宽约占面宽 ~60–70% 推断
    g.scale.setScalar(sz); g.position.set(c.x + dx * 0.5, gh(from) + h * 0.55 - 0.06 * sz, c.z + dz * 0.5); g.rotation.y = Math.atan2(dx, dz); m.renderOrder = 13; overlay.add(g);
    return;
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: guardTex, transparent: true, opacity: 0.78, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, side: THREE.DoubleSide }));
  m.position.set(c.x + dx * 0.47, gh(from) + h * 0.55, c.z + dz * 0.47);
  m.rotation.y = Math.atan2(dx, dz); const sz = Math.min(0.62, h * 0.9); m.scale.set(sz, sz, 1); m.renderOrder = 13; overlay.add(m);
}
let guardTex: THREE.Texture | null = null;
let guardGeo: THREE.BufferGeometry | null | undefined;
/** r15：单位是否「躲在掩体后」：相邻掩体格里朝向最近对手最正的那一格（夹角 < ~70°）。返回背离掩体的朝向与探头侧（L/R 判定为推断）。
 *  选中待操作的我方单位站起来（move_3544：Joker 选中时贴墙站立） */
function coverPose(u: Unit): { side: 'L' | 'R'; fx: number; fz: number } | null {
  if (u.ko || u.downed || u.side === 'neutral') return null;
  if (battle.phase === 'player' && u.side === 'ally' && u.id === selected && !u.acted) return null;
  const foes = battle.alive(u.side === 'ally' ? 'enemy' : 'ally');
  if (!foes.length) return null;
  let foe = foes[0], best = 1e9;
  for (const f of foes) { const d = Math.abs(f.pos.x - u.pos.x) + Math.abs(f.pos.y - u.pos.y); if (d < best) { best = d; foe = f; } }
  const vx = foe.pos.x - u.pos.x, vz = foe.pos.y - u.pos.y, vl = Math.hypot(vx, vz) || 1;
  let pick: Vec | null = null, pd = 0.35;
  for (const c of adjCovers(u.pos)) { const dx = c.x - u.pos.x, dz = c.y - u.pos.y; const dot = (dx * vx + dz * vz) / vl; if (dot > pd) { pd = dot; pick = c; } }
  if (!pick) return null;
  const fx = -(pick.x - u.pos.x), fz = -(pick.y - u.pos.y);
  const lx = fz, lz = -fx; // 面朝 f 时角色左手方向
  return { side: vx * lx + vz * lz >= 0 ? 'L' : 'R', fx, fz };
}
function adjCovers(p: Vec): Vec[] {
  const out: Vec[] = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = { x: p.x + dx, y: p.y + dy }; if (!battle.grid.inBounds(n)) continue; const t = battle.grid.tile(n); if (t === 'half' || t === 'full') out.push(n); }
  return out;
}

/** r17：瞄准阶段场上表现——
 *  ① 射程边界红色锁链（o_t1 / o_guard：粗红链沿射程区外沿与高低差边缘铺在地面；原版 chain 贴图/网格未导出 → 按帧重建：链环长 ≈1/4 格、平/立交替，颜色 #ff2436）；
 *  ② GUARD 目标脚下黄黑斜纹（o_guard：原版 DangerZone 图集左上格，eff_011600；铺在目标格及周围可站格）。 */
let chainGeo: THREE.TorusGeometry | null = null;
function gunAimOverlay() {
  if (!gunAim) return;
  const u = battle.unit(gunAim.sid), from = u.pos, R = battle.gunRange(u);
  const tiles: Vec[] = [];
  for (let y = 0; y < battle.map.height; y++) for (let x = 0; x < battle.map.width; x++) {
    const p = { x, y }; if (Math.abs(x - from.x) + Math.abs(y - from.y) > R) continue;
    const t = battle.grid.tile(p); if (t === 'wall') continue; tiles.push(p);
  }
  const set = new Set(tiles.map((t) => key(t)));
  const edges: { c: THREE.Vector3; along: 'x' | 'z' }[] = [];
  for (const t of tiles) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const n = { x: t.x + dx, y: t.y + dy };
    if (set.has(key(n)) && battle.grid.h(n) === battle.grid.h(t)) continue;
    const c = w2v(t, 0.07); c.x += dx * 0.46; c.z += dy * 0.46;
    edges.push({ c, along: dx ? 'z' : 'x' });
  }
  chainGeo ??= new THREE.TorusGeometry(0.07, 0.024, 5, 12);
  const per = 4, cnt = edges.length * per;
  const mat = new THREE.MeshBasicMaterial({ color: 0xff2436 });
  const flat = new THREE.InstancedMesh(chainGeo, mat, Math.ceil(cnt / 2)), up = new THREE.InstancedMesh(chainGeo, mat, Math.ceil(cnt / 2));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1.75, 1, 1), e1 = new THREE.Euler();
  let nf = 0, nu = 0;
  for (const e of edges) for (let i = 0; i < per; i++) {
    const o = -0.5 + (i + 0.5) / per; const p = e.c.clone(); if (e.along === 'x') p.x += o; else p.z += o;
    const yaw = e.along === 'x' ? 0 : Math.PI / 2;
    if (i % 2 === 0) { e1.set(-Math.PI / 2, yaw, 0, 'YXZ'); q.setFromEuler(e1); m4.compose(p, q, sc); flat.setMatrixAt(nf++, m4); }
    else { e1.set(0, yaw, 0, 'YXZ'); q.setFromEuler(e1); m4.compose(p, q, sc); up.setMatrixAt(nu++, m4); }
  }
  flat.count = nf; up.count = nu; flat.renderOrder = up.renderOrder = 11; flat.raycast = up.raycast = () => {};
  overlay.add(flat, up);
  // GUARD 目标：黄黑斜纹
  const t = battle.unit(gunTid()!);
  if (t && (t.guard || battle.hasResistance(t, from))) {
    const dz = ffx('dangerzone');
    let tex: THREE.Texture | null = null;
    if (dz) { tex = (dz.userData.q0 as THREE.Texture | undefined) ?? null; if (!tex) { tex = dz.clone(); tex.repeat.set(0.5, 0.5); tex.offset.set(0, 0.5); tex.needsUpdate = true; dz.userData.q0 = tex; } }
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const p = { x: t.pos.x + dx, y: t.pos.y + dy }; if (!battle.grid.inBounds(p) || !battle.grid.walkable(p) || battle.grid.h(p) !== battle.grid.h(t.pos)) continue;
      const qd = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.98), tex ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }) : new THREE.MeshBasicMaterial({ color: 0xffe100, transparent: true, opacity: 0.5, depthWrite: false }));
      qd.rotation.x = -Math.PI / 2; qd.position.copy(w2v(p, 0.045)); qd.renderOrder = 11; overlay.add(qd);
    }
  }
}
function aimArc(a: Vec, b: Vec) {
  const p0 = w2v(a, 0.9), p2 = w2v(b, 0.9), mid = p0.clone().lerp(p2, 0.5); mid.y += 0.25 + p0.distanceTo(p2) * 0.12;
  const c = new THREE.QuadraticBezierCurve3(p0, mid, p2);
  if (ribbon(c, 'trail_red_ol', 0.07, 32, { up: true, depthTest: false, order: 14 })) return; // r14：原版 shotline_outline 材质贴图 Trail_Red_Outline（红芯黑边）
  const m = new THREE.Mesh(new THREE.TubeGeometry(c, 24, 0.022, 5), new THREE.MeshBasicMaterial({ color: 0xff1a2a, transparent: true, opacity: 0.9, depthTest: false }));
  m.renderOrder = 14; overlay.add(m);
}
let xTex: THREE.CanvasTexture | null = null;
function guardX(p: Vec) {
  const hw = ffx('hit_wall'); // r14：原版 shotline_hit_wall（红边黑芯 X = 射线被挡/打不穿，command_3410）
  if (hw) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: hw, depthTest: false, transparent: true })); sp.position.copy(w2v(p, 0.6)); sp.scale.setScalar(0.9); sp.renderOrder = 15; overlay.add(sp); return; }
  if (!xTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d')!;
    x.lineCap = 'round'; for (const [w, col] of [[30, '#111'], [18, '#ff1a2a']] as const) { x.lineWidth = w; x.strokeStyle = col; x.beginPath(); x.moveTo(24, 24); x.lineTo(104, 104); x.moveTo(104, 24); x.lineTo(24, 104); x.stroke(); }
    xTex = new THREE.CanvasTexture(c); xTex.colorSpace = THREE.SRGBColorSpace;
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: xTex, depthTest: false, transparent: true }));
  sp.position.copy(w2v(p, 0.6)); sp.scale.setScalar(0.9); sp.renderOrder = 15; overlay.add(sp);
}

let thornTex: { fill: THREE.Texture | null; line: THREE.Texture | null } | null = null;
function thornsReticle(p: Vec) {
  if (!thornTex) {
    const ld = new THREE.TextureLoader(), get = (n: string) => (p5.has(n) ? ld.load(p5.url(n), () => refreshOverlay()) : null);
    thornTex = { fill: get('thorns_fill'), line: get('thorns_line') };
    for (const t of [thornTex.fill, thornTex.line]) if (t) t.colorSpace = THREE.SRGBColorSpace;
  }
  const g = new THREE.Group(); g.name = 'thorns';
  const mk = (map: THREE.Texture | null, color: number, op: number, sc: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity: op, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.scale.setScalar(sc); m.renderOrder = 16; return m;
  };
  if (thornTex.fill && thornTex.line) { g.add(mk(thornTex.fill, 0xff2030, 0.55, 1.15), mk(thornTex.line, 0xff4050, 1, 1.6)); }
  else { // 缺贴图：画 10 角锯齿星
    const sh = new THREE.Shape(); for (let i = 0; i < 20; i++) { const r = i % 2 ? 0.36 : 0.62, a = (i / 20) * Math.PI * 2; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(r, 0); }
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: 0xe60012, transparent: true, opacity: 0.8, depthTest: false })); m.rotation.x = -Math.PI / 2; m.renderOrder = 16; g.add(m);
  }
  g.position.copy(w2v(p, 0.06)); overlay.add(g);
}
function chainLine(a: Vec, b: Vec) {
  const p0 = w2v(a, 0.55), p2 = w2v(b, 0.55), mid = p0.clone().lerp(p2, 0.5); mid.y += 0.35 + p0.distanceTo(p2) * 0.08;
  const c = new THREE.QuadraticBezierCurve3(p0, mid, p2), L = c.getLength(), n = Math.max(4, Math.round(L / 0.16));
  const geo = new THREE.TorusGeometry(0.07, 0.022, 5, 10), mat = new THREE.MeshBasicMaterial({ color: 0xff1a2a, depthTest: false });
  for (let i = 0; i <= n; i++) {
    const t = i / n, q = c.getPoint(t), tg = c.getTangent(t);
    const m = new THREE.Mesh(geo, mat); m.position.copy(q);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(-tg.z, 0, tg.x).normalize()); // 环面含切线
    if (i % 2) m.rotateOnWorldAxis(tg, Math.PI / 2);
    m.renderOrder = 15; overlay.add(m);
  }
}
let lastPreviewKey = '';
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
  if (!texTile(b, 'panelh_13', 0.04, 0.9)) tileQuad(b, 0xffffff, 0.55, 0.04); // r14：落点格 = 原版 battle_panel_heal 白格（对应关系推测）；箭头重建
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
  if (aimActive) { if (gunAim && gunAim.ready && !aimFiring) gunAimOverlay(); return; } // r17：过肩瞄准时只画射程锁链 + GUARD 斜纹
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
  standTile(u.pos);
  for (const a of battle.alive('ally')) if (a.id !== u.id && !a.prop && !a.decoy) ring(a.pos, MATE_PINK);
  const skr = curSkill(u);
  if (skillPhase !== 'none' && skr && skr.kind === 'attack') {
    // r10：技能射程格（skill_list_2459：列表打开时场上同步画范围；红色半透明）
    const from0 = previewTile ?? u.pos;
    // r12：红色半透明 + 白描边（skill_list_2459；格子贴图未导出 → 按帧颜色重建）
    for (let y = 0; y < battle.map.height; y++) for (let x = 0; x < battle.map.width; x++) if (battle.canSkillAt(u, skr, { x, y }, from0)) { if (!texTile({ x, y }, 'panel_8', 0.014)) { tileQuad({ x, y }, 0xe60012, 0.3, 0.014); tileEdge({ x, y }); } } // r14：原版 battle_panel_8（红格+白边）
  }
  if (skillPhase === 'none') { const mt = battle.moveTiles(u); const mates = battle.alive('ally').filter((a) => a.id !== u.id && mt.some((m) => Math.abs(m.x - a.pos.x) + Math.abs(m.y - a.pos.y) === 1)).map((a) => a.pos); // 队友站的格算进区域（不在边界上画框）
    rangeOutline([u.pos, ...(eq(u.anchor, u.pos) ? [] : [u.anchor]), ...mt, ...mates]); }
  const from = previewTile ?? u.pos;
  if (previewTile) { glowPath(battle.pathFor(u, previewTile)); standTile(previewTile); moveCursor(previewTile); }
  { const pk = previewTile ? key(previewTile) : ''; if (pk !== lastPreviewKey) { lastPreviewKey = pk; if (previewTile && skillPhase === 'none' && !previewTarget) rig.focus(w2v(previewTile)); } } // r12：镜头跟到站位格（原版角色真的走过去，镜头跟随）
  if (skillPhase === 'none') for (const c of adjCovers(from)) coverShield(c, from);
  if (!u.acted) for (const e of battle.units) if (!e.ko && e.side !== 'ally' && e.prop !== 'speaker' && attackFrom(u, from, e)) ring(e.pos, previewTarget === e.id ? 0xffd400 : 0xe60012);
  // r12：红色弧形瞄准线连向可射击敌人（command_2448/3429、aim_1458）；射程内处于 GUARD 的敌人画红色大 X（command_3410）
  if (!u.acted && skillPhase === 'none' && (mode === 'auto' || mode === 'gun')) for (const e of battle.units) {
    if (e.ko || e.side === 'ally' || e.prop || battle.isHidden(e)) continue;
    const inR = Math.abs(e.pos.x - from.x) + Math.abs(e.pos.y - from.y) <= battle.gunRange(u);
    if (e.guard && inR) guardX(e.pos); // GUARD 中的敌人：红色大 X（command_3410，INDEX/验收要求）
    else if (battle.canShoot(u, e, from)) aimArc(from, e.pos);
  }
  const fc = currentForecast();
  if (fc) {
    for (const p of fc.aoe) if (!eq(p, fc.target.pos)) { if (!texTile(p, 'panel_8', 0.034)) { tileQuad(p, 0xe60012, 0.42, 0.034); if (fc.kind === 'skill') tileEdge(p); } }
    if (fc.kind === 'skill') { // r12：选技能目标——中心红色锯齿准星（原版 sprite bom04_icon_thorns_01/02，乘红为推断）+ 施法者→目标红色锁链线（重建）（predict_1719_5/2501_2）
      if (!texTile(fc.target.pos, 'panel_8', 0.034)) { tileQuad(fc.target.pos, 0xe60012, 0.42, 0.034); tileEdge(fc.target.pos); }
      thornsReticle(fc.target.pos); chainLine(from, fc.target.pos);
    } else if (!texTile(fc.target.pos, 'cursor_red', 0.036)) stripeTile(fc.target.pos, 0.036); // r14：原版 panel/cursor_new02（红框光标，对应关系推测）
    if (fc.push && !eq(fc.push.to, fc.push.from)) pushArrow(fc.push.from, fc.push.to);
    else if (fc.push) tileQuad(fc.push.from, 0xffffff, 0.3, 0.038);
  }
  const sk = curSkill(u);
  if ((mode === 'skill' || mode === 'unique') && sk && sk.kind !== 'attack') for (const a of battle.alive('ally')) if (battle.canSkill(u, sk, a, from)) ring(a.pos, previewTarget === a.id ? 0xffd400 : 0x2fd36b);
}

// ---------- HUD ----------
/** P5T 正版头像条：party_<角色> 头像（HP≤25% 换 dying_ 头像，阈值为推测）+ panel_gage_window 底 + HP/SP 原版字样 + 原版色条；ACTION / 1MORE ACTION 原版标签。数字是 TMP 字体（未提取）→ 文字 */
function partyP5(a: Unit) {
  const pk = PORTRAIT[a.id];
  const low = a.hp <= a.maxHp * 0.25;
  const face = pk && p5.has(`party_${pk}`) ? p5.img(`${low && p5.has(`dying_${pk}`) ? 'dying' : 'party'}_${pk}`, 'face')
    : `<div class="face" style="--c:${'#' + (COLORS[a.id] ?? 0x888888).toString(16).padStart(6, '0')}">${(a.name.split(' ').pop() ?? a.name).slice(0, 1)}</div>`;
  const canAct = !a.acted && battle.phase === 'player';
  // r10：原版 ACTION 牌只挂在当前操作角色卡上（hud_idle_1212 待机无 ACTION；command_* 当前角色放大 + ACTION）
  const tag = canAct && a.id === selected ? (a.oneMore ? p5.img('word_1more', 'act om') : p5.img('word_action', 'act')) : '';
  const pct = (n: number, m: number) => `${Math.max(0, Math.min(100, (100 * n) / Math.max(1, m)))}%`;
  return `<div class="pm p5${a.id === selected ? ' cur' : ''}${a.acted ? ' done' : ''}${a.oneMore && canAct ? ' om' : ''}" data-uid="${a.id}">
    <div class="pf">${face}${tag}</div>
    <div class="gw">${p5.img('word_hp', 'whp')}${p5.img('word_sp', 'wsp')}<b class="nh" data-sdf="FOT_YURUKASTD_UB_SDF" data-col="#68ffe1" data-back="#338776" data-pad="4" data-out="#000000" data-ow="0.3" data-sp="-26">${a.hp}</b>${p5.img('gage_slash', 'sl')}<b class="ns" data-sdf="FOT_YURUKASTD_UB_SDF" data-col="#ef51f8" data-back="#783671" data-pad="3" data-out="#000000" data-ow="0.3" data-sp="-26">${a.sp}</b>
      <i class="bar hp" style="--p:${pct(a.hp, a.maxHp)}"></i><i class="bar sp" style="--p:${pct(a.sp, a.maxSp ?? 100)}"></i></div>
    </div>`;
}
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
  $('#party').innerHTML = allies.map((a) => p5.has('gage_window') ? partyP5(a) : `<div class="pm${a.id === selected ? ' cur' : ''}${a.acted ? ' done' : ''}${a.oneMore && !a.acted && battle.phase === 'player' ? ' om' : ''}" data-uid="${a.id}">
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
  hydrateSdf(document.body); // r8：原版 TMP 字体（HP/SP/TURN/敌人数）
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
  // r10：旧版技能按钮列表停用（换成原版技能列表 SkillList）
  if ((false as boolean) && sel) {
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
        // r10：原版没有独立预测面板 → 伤害数字 + 骷髅画在敌人头顶（refreshLabels），这里不再弹面板
        pv.classList.add('hidden');
        void forecastHtml; void hexOf;
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
    // r10：单位操作（指令/移动/选目标）与我方行动演出时隐藏 TURN/目标面板；技能列表打开时显示（原版 command_3429 / skill_list_1717_2）
    const app = $('#app');
    app.classList.toggle('enemy-ph', busy && vPhase === 'enemy');
    app.classList.toggle('unit-op', ((!!selected && battle.phase === 'player') || (busy && vPhase === 'player')) && skillPhase !== 'list');
    app.classList.toggle('sk-open', skillPhase === 'list');
    app.classList.toggle('sk-target', skillPhase === 'target');
    if (skillPhase !== 'none' && (!selected || busy)) { if (!busy) endSkillFlow(); }
    keyguide.classList.toggle('hidden', skillPhase === 'none' || busy);
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
  if (resultHold) { for (const el of labelEl.values()) el.style.display = 'none'; cmdMenu.hide(); $('#actions').classList.add('hidden'); return; }
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
  // r12：原版指令菜单——站位格（移动预览格）上方角色头顶旁；技能列表/选目标/瞄准时不显示
  if (su && sg && battle.phase === 'player' && !busy && !fcOn && skillPhase === 'none' && !su.acted && !aimActive) {
    const from = previewTile ?? su.pos;
    const hp = w2v(from, (rigs.get(su.id)?.height ?? 1.1) + 0.05).project(viewCam);
    const keys: CmdKey[] = [];
    if (su.skills.length) keys.push('persona');
    keys.push('gun');
    // r14 核对：SWORD 只在有近战目标时出现（command_2448 只有 PERSONA/GUN、command_3410 只有 GUN；3456 有 SWORD 是因为敌人贴身）
    if (battle.units.some((t) => !t.ko && t.side !== 'ally' && !t.prop && battle.canMelee(su, t, from))) keys.push('sword');
    cmdMenu.show(((hp.x + 1) / 2) * w, ((1 - hp.y) / 2) * h, keys, key(from), mode === 'auto' ? null : mode, h);
  } else cmdMenu.hide();
  for (const u of battle.units) {
    const el = labelEl.get(u.id);
    const g = unitMesh.get(u.id);
    if (!el || !g) continue;
    const hidden = battle.isHidden(u); // 未解锁区域的敌人不画（HARK-NOTES-ENGINE #8）
    const gone = u.ko && !fxKeep.has(u.id); // 本批事件里还没播到 ko 的单位先留着（总攻/1 MORE 演出要看见它挨打）
    g.visible = !gone && !hidden;
    if (gone || hidden) { el.style.display = 'none'; continue; }
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
    const pf = u.side === 'enemy' && u.id === previewTarget && skillPhase !== 'list' ? currentForecast() : null;
    // r10 头顶预测：伤害数字（青）+ 骷髅（可击杀，原版 target_kill 贴图）；枪击瞄准无掩体敌人 → CHANCE!!（暴击/打倒预告，aim_1420_3）
    const aimT = aimIds[1] === u.id;
    const showChance = (pf && pf.kind === 'gun' && pf.weak && !pf.lethal) || (aimT && aimChance);
    // r14：CHANCE!! = 原版 attack_CHANCE sprite，贴在目标身上（脸部高度），随目标在屏幕上的大小缩放（command_3456 宽≈0.36×身高、aim_1420_3 同比）
    const chance = showChance ? (p5.has('chance') ? `<img class="chance-i" src="${p5.url('chance')}" alt=""/>` : '<div class="chance">CHANCE!!</div>') : '';
    // r15：枪击原版（command_3456 / aim_1420_3）头顶只有心形 HP 数字，不另显示伤害数字（预计伤害 = 心形红段）
    const pred = pf && (pf.kind !== 'gun' || pf.lethal) ? `<div class="pred">${pf.kind !== 'gun' && !aimT ? `<b>${pf.amount}</b>` : ''}${pf.lethal ? (p5.has('target_kill') ? p5.img('target_kill', 'sk') : '<i class="sk css"></i>') : ''}</div>` : '';
    // r14：头顶心形 = 原版 target_gage_black（黑底）+ target_gage_white（青色填充）/ target_gage_red（被锁定时红色），HP 数字 = 原版 TMP 字体
    // r15：心形 = HP 量表（aim_1420_3 放大核对：横向，青色 = 打完剩下的 HP、红色 = 这一击预计扣掉的、暗色 = 已损失；
    //   锁定时外圈 target_gage_red 红色光圈 + 左上青色 HP 数字）。r14 把 target_gage_red 当成整颗心的填充 → 整颗心变红；命中后又画满格青心 → 看不出掉血。
    const hv = hpView.get(u.id);
    if (hv && !busy && performance.now() > hv.hitUntil) hpView.delete(u.id);
    const hitShow = !!hv && performance.now() < hv.hitUntil;
    const locked = u.id === previewTarget || aimT || hitShow;
    const hpNow = shownHp(u), mx = Math.max(1, u.maxHp);
    const dmgPred = Math.min(hpNow, pf ? pf.amount : hv && !hv.t0 && aimT ? hv.pred : 0);
    const pc = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 1000) / 10;
    const cyan = `clip-path:inset(0 ${pc(1 - (hpNow - dmgPred) / mx)}% 0 0)`, red = dmgPred > 0 ? `clip-path:inset(0 ${pc(1 - hpNow / mx)}% 0 ${pc((hpNow - dmgPred) / mx)}%)` : '';
    const heart = p5.has('heart_ol') ? `<div class="heart p5h${locked ? ' red' : ''}">${locked && p5.has('heart_red') ? p5.img('heart_red', 'ring') : ''}${p5.img('heart_ol', 'ol')}<i class="fill" style="${cyan}"></i>${red ? `<i class="fill pr" style="${red}"></i>` : ''}${locked ? `<b data-sdf="FOT_YURUKASTD_UB_SDF" data-col="#68ffe1" data-out="#000000" data-ow="0.3" data-sp="-10">${hpNow}</b>` : ''}</div>` : `<div class="heart"><b>${hpNow}</b></div>`;
    // r17：锁定标 = 原版 bom04_icon_thorns_01/02 锯齿圈贴在目标身上（o_t2 红色 = 普通锁定；o_t1 青色 + attack_GUARD = GUARD 目标），瞄准阶段显示、开火时收起
    const lockOn = aimT && !!gunAim && gunAim.ready && !aimFiring;
    const grd = lockOn && (u.guard || battle.hasResistance(u, battle.unit(gunAim!.sid).pos));
    const lock = lockOn && p5.has('thorns_fill') ? `<div class="lockr${grd ? ' g' : ''}"><i class="t2"></i><i class="t1"></i>${grd && p5.has('guard_word') ? `<img class="gw" src="${p5.url('guard_word')}" alt=""/>` : ''}</div>` : '';
    if (chance || lock) { const ft = g.position.clone().project(viewCam); el.style.setProperty('--uh', String(Math.max(20, (v.y - ft.y) / 2 * h))); }
    const html = u.side === 'enemy'
      ? `${pred}${heart}${grd ? '' : chance}${lock}${tags}` // P5T：敌人头顶心形 + HP 数字
      : `${u.name.split(' ').pop()}${tags}<div class="hp"><i style="width:${(100 * u.hp) / u.maxHp}%"></i></div>`;
    if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; if (html.includes('data-sdf')) hydrateSdf(el); }
    if (rg) {
      // r14：选中我方 / 锁定目标 / 瞄准中的射手与目标 → 红色描边（command_3456、aim_1420_3）
      rg.setHighlight?.(!u.ko && ((aimIds.includes(u.id) && !aimFiring) || (!busy && battle.phase === 'player' && (u.id === selected && !u.acted || u.id === previewTarget))));
      if (!busy) rg.setDowned(u.downed);
      if (!u.ko && rg.pose === 'dead') rg.revive();
      if (!busy && u.role !== 'shielder') { // r15：掩体后待机 = 原版 HideL/HideR 蹲姿（背靠掩体，探头朝最近的对手一侧）
        const cv = coverPose(u);
        (rg as { setCover?: (s: 'L' | 'R' | null) => void }).setCover?.(cv ? cv.side : null);
        if (cv) rg.faceTo(new THREE.Vector3(g.position.x + cv.fx, 0, g.position.z + cv.fz));
      }
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
  // 10-26 r6：暗屏改在 3D 里「只压背景」（SummonDim 三遍渲染，施法者画在暗幕之上）；蓝焰在施法者身后；面具碎片对准施法者头部；
  //   文字条放到施法者对侧，不盖住 Skill 动作
  const g = unitMesh.get(unitId);
  const ms = 950 / SPEED;
  if (g) { scene.traverse((o) => { if ((o as THREE.Light).isLight) o.layers.enable(CASTER_LAYER); }); sdim.start(g, ms); }
  const sp = sdim.screenOf(viewCam, (rigs.get(unitId)?.height ?? 1.1) * 0.85) ?? { x: 0.3, y: 0.46 };
  el.innerHTML = `<div class="mask" style="left:${(sp.x * 100).toFixed(1)}%;top:${(sp.y * 100).toFixed(1)}%">${shards}</div><div class="strip"><div class="who">${u.name}</div><div class="per">${PERSONA_NAME[u.id] ?? 'PERSONA'}!</div></div><div class="sk">${sk ? skillNameZh(sk) : skillId}</div>`;
  el.classList.toggle('l', sp.x > 0.5);
  el.classList.remove('hidden'); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; el.style.animationDuration = `${ms}ms`;
  await sleep(ms);
  el.classList.add('hidden');
}
const sdim = new SummonDim();
const postFx = new PostFx(); postFx.enabled = params.get('postfx') !== '0'; // r14：原版 L01 Volume 后处理（Bloom/色差/SMH）

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
function popAt(pos: THREE.Vector3, text: string, cls = '', yOff = 1.2, track?: THREE.Object3D) {
  const v = pos.clone().add(new THREE.Vector3(0, yOff, 0)).project(viewCam);
  const follow = (el: HTMLElement) => { if (!track) return; const tick = () => { if (!el.isConnected) return; const q = track.position.clone().add(new THREE.Vector3(0, yOff, 0)).project(viewCam); el.style.left = `${((q.x + 1) / 2) * window.innerWidth}px`; el.style.top = `${((1 - q.y) / 2) * window.innerHeight}px`; requestAnimationFrame(tick); }; requestAnimationFrame(tick); };
  const el = document.createElement('div');
  // DOWN / 盾挡 → P5T 原版字母贴图 + anim_ui2d_down_start 时序（缺图时保持文字）
  const pop = text === 'DOWN!' ? letterPop('down') : text === '盾挡!' ? letterPop('block') : '';
  // r7：伤害数字用原版 TMP 字体 FOT_YURUKASTD_UB_SDF_BattleNumber2（白面黑描边，原版材质参数）自绘；缺字体 → CSS 文字
  // r8：普通命中数字 → 原版 prefab_ui2d_damageview 结构 + anime_btl_damage 曲线（view/damagePop.ts）；总攻（tt）沿用 r7 尺寸
  const orig = !pop && (cls === '' || cls.startsWith('hit')) && /^\d+▼?$/.test(text);
  const num = !pop && /^\d+▼?$/.test(text) && (cls === '' || cls === 'tt' || cls.startsWith('hit')) ? renderSdf(BN_FONT, text.replace('▼', ''), { px: (orig ? digitPx(cls.includes('heavy')) / 0.8 : cls === 'tt' ? 58 : 46) * DPR }) : null;
  if (num) num.style.width = `${num.width / DPR}px`;
  if (orig && num) {
    const rz = text.endsWith('▼') ? Object.assign(document.createElement('i'), { className: 'resist', textContent: '▼' }) : undefined;
    const dv = buildDamageView(num, rz);
    dv.root.classList.add('dmg', 'orig'); if (cls.includes('heavy')) dv.root.classList.add('heavy');
    dv.root.style.left = `${((v.x + 1) / 2) * window.innerWidth}px`;
    dv.root.style.top = `${((1 - v.y) / 2) * window.innerHeight}px`;
    $('#labels').appendChild(dv.root); follow(dv.root);
    playDamageClip(dv, 'anime_btl_damage', () => dv.root.remove());
    return;
  }
  if (cls === 'heal' && /^\+\d+$/.test(text)) { // 回复：原版 anime_btl_heal 曲线（数字字形仍是 CSS 文字）
    const sp = document.createElement('span'); sp.textContent = text;
    const dv = buildDamageView(sp); dv.root.classList.add('dmg', 'orig', 'heal');
    dv.root.style.left = `${((v.x + 1) / 2) * window.innerWidth}px`;
    dv.root.style.top = `${((1 - v.y) / 2) * window.innerHeight}px`;
    $('#labels').appendChild(dv.root);
    playDamageClip(dv, 'anime_btl_heal', () => dv.root.remove());
    return;
  }
  el.className = `dmg ${cls}${pop ? ' p5' : ''}${num ? ' sdf' : ''}`;
  if (pop) el.innerHTML = pop; else if (num) { el.appendChild(num); if (text.endsWith('▼')) { const r = document.createElement('i'); r.className = 'resist'; r.textContent = '▼'; el.appendChild(r); } } else el.textContent = text;
  el.style.left = `${((v.x + 1) / 2) * window.innerWidth}px`;
  el.style.top = `${((1 - v.y) / 2) * window.innerHeight}px`;
  $('#labels').appendChild(el);
  const rm = () => (document.body.classList.contains('frozen') ? setTimeout(rm, 200) : el.remove());
  setTimeout(rm, pop ? fxMs(1400) : 950);
}
const BN_FONT = 'FOT_YURUKASTD_UB_SDF_BattleNumber2';
const DPR = Math.min(3, window.devicePixelRatio || 1);
void loadSdfFont(BN_FONT);
function popDamage(unitId: string, text: string, cls = '') {
  const g = unitMesh.get(unitId);
  // r17：过肩镜头里伤害数字贴在目标身上（o_hit：白字在目标胸口），并逐帧跟随目标投影（r16 只在弹出时算一次位置，镜头后拉后数字落到屏幕下方）
  const h = rigs.get(unitId)?.height ?? 1.1;
  if (g) popAt(g.position, text, cls, aimActive ? h * 0.55 : h * 0.95, aimActive ? g : undefined);
}
/** r17：CRITICAL!!（hit_1422_8：原版 bot01_critical_icon_dialog 872×324，按 damageview 画布比例 ×CODE_SCALE 摆在目标上方；出现/消失曲线未导出 → 0.12s 放大入、0.9s 后淡出，重建） */
function popCritical(unitId: string) {
  const g = unitMesh.get(unitId); if (!g || !p5.has('critical')) return;
  const h = rigs.get(unitId)?.height ?? 1.1;
  const el = document.createElement('img'); el.className = 'crit-pop'; el.src = p5.url('critical'); el.alt = '';
  el.style.width = `${872 * (window.innerHeight / 1080) * 0.5}px`;
  $('#labels').appendChild(el);
  const t0 = performance.now();
  const step = () => {
    if (!el.isConnected) return;
    const v = g.position.clone().add(new THREE.Vector3(0, h * 1.05, 0)).project(viewCam);
    el.style.left = `${((v.x + 1) / 2) * window.innerWidth}px`; el.style.top = `${((1 - v.y) / 2) * window.innerHeight}px`;
    const k = (performance.now() - t0) / 1000;
    el.style.transform = `translate(-50%, -100%) scale(${k < 0.12 ? 0.6 + (k / 0.12) * 0.4 : 1})`;
    el.style.opacity = String(k < 0.9 ? 1 : Math.max(0, 1 - (k - 0.9) / 0.2));
    if (k < 1.1) requestAnimationFrame(step); else el.remove();
  };
  step();
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** 走格时长：按该单位原版 Run 步速（p5tChar.msPerTile；程序化 rig 用 RUN_MS_PER_TILE），快进时 ÷ SPEED */
const walkMs = (id: string) => (rigs.get(id)?.msPerTile ?? RUN_MS_PER_TILE) / SPEED;
/** 等单位当前单次动作（攻击/受击）播完再继续；快进（敌方回合点屏 / speed>1）时封顶更短 */
const settleRig = (id: string | null | undefined, max = 2500) => { const r = id ? rigs.get(id) : undefined; return r?.settle ? r.settle(efast() ? Math.min(max, 400) : max) : Promise.resolve(); };
/** 等攻击者动作到原版命中帧（无正版 rig → 等动作播完的旧逻辑） */
const impactRig = (id: string | null | undefined, max = 2600) => { const r = id ? rigs.get(id) : undefined; return r?.impact ? r.impact(efast() ? Math.min(max, 500) : max) : settleRig(id, max); };
let lastAtkKind: HitSpec['kind'] = 'other';
/** 本次受击的力度：伤害占最大 HP 比例；之后紧跟 DOWN/KO 或打出弱点 = 重击 */
function hitSpecFor(e: Extract<BattleEvent, { type: 'damage' }>, events: BattleEvent[], i: number): HitSpec {
  const u = battle.unit(e.unitId);
  const ratio = u ? e.amount / Math.max(1, u.maxHp) : 0.2;
  let heavy = ratio >= 0.45;
  for (let j = i + 1; j < Math.min(events.length, i + 5); j++) { const n = events[j]; if ((n.type === 'down' || n.type === 'ko') && n.unitId === e.unitId) heavy = true; if (n.type === 'damage') break; }
  return { ratio, heavy, kind: e.source === 'triple' ? 'other' : lastAtkKind };
}
/** 命中：顿帧 + 震屏 + 命中火花（自制）+ 受击后仰 */
function hitImpact(id: string, hs: HitSpec) {
  const g = unitMesh.get(id); if (!g) return;
  const h = rigs.get(id)?.height ?? 1.1;
  const at = g.position.clone().add(new THREE.Vector3(0, h * 0.55, 0));
  spark(world, at, hs);
  shake(hs);
  const a = lastAttacker ? unitMesh.get(lastAttacker) : null;
  if (a && a !== g) recoil(g, g.position.clone().sub(a.position), hs);
  if (!efast()) freezeUntil = Math.max(freezeUntil, performance.now() + fxMs(hitstopMs(hs)));
}
let lastAttacker: string | null = null;
/** 当前攻击是技能时的技能 id（受击时在目标身上播技能命中特效） */
let lastSkill: string | null = null;
let personaFx: { end: () => void } | null = null;
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
/** r17：过肩镜头动画——step(k) 摆机位（k 0→1），aimLook = 当前注视点（半透圆柱 / 切目标转向用） */
let aimAnim: { t0: number; dur: number; step: (k: number) => void } | null = null;
const aimLook = new THREE.Vector3();
/** r17：开火阶段（SHOT/BACK/描边/锁定标已收起） */
let aimFiring = false;
/** r17：本枪是 CRITICAL（目标无掩体 → 正面特写 + CRITICAL!!，hit_1422 / hit_1422_8） */
let aimCrit = false;
/** r17：玩家枪击瞄准阶段（o_aim / o_t1：按 GUN 后直接进过肩镜头并锁定默认目标，点其他敌人切目标，SHOT/再点目标 = 开火，BACK = 回指令牌） */
let gunAim: { sid: string; targets: string[]; idx: number; ready: boolean } | null = null;
const gunTid = () => (gunAim ? gunAim.targets[gunAim.idx] : null);
/**
 * 过肩机位（10-26 r6：我方/敌方同一算法）：按射手当前姿势的实际包围盒（含帽子、手里的枪）求机位，
 * 先试右肩、再试左肩，侧移/后退逐级加大，直到「机位 → 目标胸口」视线不穿过射手自身模型；Joker 身高下与原机位一致（后 1.05、侧 0.5、高 1.05）。
 */
// r15：aim_1420_3 原版射手全身入画、占屏高约 60%、位于画面左 1/3，目标在中间偏右 → 镜头拉远（身后 2.7、右 0.85、头高）
// r17：按 o_aim.png（54.75s）/ o_t1（54.85s）重量：射手包围盒中心 (0.324,0.600)、高 0.66 屏（头顶 195px、衣摆 ≈670px@720）、目标在画面中偏右 → 机位见下（tools/rec-gun 实测迭代）
// r17b：在原版 M01 上按第一章 aim_1420_3 重标（/workspace/work/cal7 #12 = cal8 #0：剪影中心误差 0.026/0.020、高度 0.010、IoU 0.820）；cal4#6 是按 DLC 帧标的，作废
const AIM_CAM = { back: 2.8, lat: 1.3, h: 0.95, lookY: 0.45, fov: 34, mix: 0.28 };
const SWOOP_MS = 250; // r17b：原版快速硬切感（0.25–0.5s 内到位）
function shoulderCam(attackerId: string, ap: THREE.Vector3, dir: THREE.Vector3, look: THREE.Vector3) {
  const right = new THREE.Vector3(-dir.z, 0, dir.x);
  const g = unitMesh.get(attackerId);
  const h = rigs.get(attackerId)?.height ?? 1.1;
  const box = new THREE.Box3();
  if (g) {
    g.updateMatrixWorld(true);
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.visible || o.userData.outline || o.name === 'rigHit') return;
      const sm = m as THREE.SkinnedMesh;
      if (sm.isSkinnedMesh) { sm.computeBoundingBox(); const b = sm.boundingBox!.clone().applyMatrix4(sm.matrixWorld); box.union(b); }
      else box.expandByObject(m);
    });
  }
  if (box.isEmpty()) box.setFromCenterAndSize(ap.clone().add(new THREE.Vector3(0, h / 2, 0)), new THREE.Vector3(0.6, h, 0.6));
  box.expandByScalar(0.04);
  const hs = Math.max(0.8, Math.min(1.6, box.max.y - ap.y)) / 1.1; // 机位高度跟射手实际高度（含帽子）
  const half = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
  const ray = new THREE.Ray();
  const clear = (c: THREE.Vector3) => {
    if (box.containsPoint(c)) return false;
    ray.origin.copy(c); ray.direction.copy(look).sub(c).normalize();
    const hit = ray.intersectBox(box, new THREE.Vector3());
    if (hit && hit.distanceTo(c) <= look.distanceTo(c)) return false;
    const w = losBlockedAt(c, look); // r13：镜头—目标之间不能有场景几何（用户反馈：掩体箱整个挡住敌人）
    return w == null;
  };
  let to: THREE.Vector3 | null = null, side = 1, back = 1.05, lat = 0.5;
  outer: for (const extra of [0, 0.15, 0.3, 0.45, 0.65]) for (const sd of [1, -1]) {
    // r14：按 aim_1420_3 压低拉近——镜头约在射手头部高度（0.82×身高）、身后 ~0.9、右侧 ~0.45，射手占画面左 1/3、只露上半身
    const b = Math.max(AIM_CAM.back, half + 0.45) + extra * 0.6, l = Math.max(AIM_CAM.lat, half * 0.8) + extra;
    const c = ap.clone().addScaledVector(dir, -b).addScaledVector(right, sd * l).add(new THREE.Vector3(0, AIM_CAM.h * hs, 0));
    if (clear(c)) { to = c; side = sd; back = b; lat = l; break outer; }
  }
  // r15：全部候选都被挡（射手贴着全掩体时视线必穿过掩体）→ 用标准机位，掩体交给 setAimSeeThrough 半透（之前回退到 1.05m 贴脑后机位，Joker 后脑勺占半屏）
  if (!to) { back = Math.max(AIM_CAM.back, half + 0.45); lat = Math.max(AIM_CAM.lat, half * 0.8); to = ap.clone().addScaledVector(dir, -back).addScaledVector(right, lat).add(new THREE.Vector3(0, AIM_CAM.h * hs, 0)); }
  const from = ap.clone().addScaledVector(dir, -back * 2).addScaledVector(right, side * (lat + 0.35)).add(new THREE.Vector3(0, 1.55 * hs, 0));
  return { from, to };
}
// r13：视线检测（场景几何，不含单位/叠加层）。返回第一处遮挡距离，无遮挡 null。
const losRay = new THREE.Raycaster();
function losBlockedAt(p: THREE.Vector3, t: THREE.Vector3): number | null {
  const d = t.clone().sub(p); const len = d.length(); if (len < 0.05) return null;
  losRay.set(p, d.divideScalar(len)); losRay.camera = viewCam as THREE.Camera; losRay.near = 0.05; // r15：Sprite.raycast 需要 camera（否则场景里有 Sprite 时瞄准直接抛错） losRay.far = Math.max(0.1, len - 0.45);
  for (const h of losRay.intersectObject(world, true)) {
    let o: THREE.Object3D | null = h.object, skip = !(h.object as THREE.Mesh).visible || (h.object as THREE.Sprite).isSprite;
    while (o && !skip) { if (o === overlay || o.userData.unit) skip = true; o = o.parent; }
    if (!skip) return h.distance;
  }
  return null;
}
// r13：原版躲在掩体后开枪 = 侧移出掩体（≈半格，带残影冲刺）→ 原过肩机位开火 → 回到掩体后（录像 12:49.75–12:51.5 Joker、12:57.3–12:58.6 Mona）。
// 原版 PC 有 A_PC0001_BTL0015/0016 HideL/HideR，但我们导出的 GLB 里没有（只 20 条）→ 位移为重建，动作用 Run 片段。
let stepped: { id: string; home: THREE.Vector3 } | null = null;
async function tweenMesh(g: THREE.Object3D, to: THREE.Vector3, ms: number) {
  const from = g.position.clone(), t0 = performance.now();
  for (;;) { const k = Math.min(1, (performance.now() - t0) / Math.max(1, ms)); g.position.lerpVectors(from, to, 1 - Math.pow(1 - k, 2)); if (k >= 1) break; await sleep(16); }
}
async function stepOutIfCovered(aid: string, tid: string) {
  const a = unitMesh.get(aid), t = unitMesh.get(tid); if (!a || !t) return;
  // r17：半掩体（木箱）后不闪出、直接隔箱开火（V3 第 5 段 5:51–5:54）；全掩体墙后的闪出保留 r13 做法（原版证据待核）
  { const au = battle.unit(aid), tu = battle.unit(tid); if (au && tu && battle.grid.coverAgainst(au.pos, tu.pos) < 2) return; }
  const up = new THREE.Vector3(0, 0.6, 0), ap = a.position.clone().add(up), tp = t.position.clone().add(up);
  const d0 = losBlockedAt(ap, tp); if (d0 == null || d0 > 1.4) return;
  const dir = tp.clone().sub(ap).setY(0).normalize(), right = new THREE.Vector3(-dir.z, 0, dir.x);
  let off: THREE.Vector3 | null = null;
  outer: for (const m of [0.5, 0.7]) for (const sd of [1, -1]) { const o = right.clone().multiplyScalar(sd * m); if (losBlockedAt(ap.clone().add(o), tp) == null) { off = o; break outer; } }
  if (!off) off = right.clone().multiplyScalar(0.5);
  stepped = { id: aid, home: a.position.clone() };
  const r = rigs.get(aid); r?.setRunning(true);
  await tweenMesh(a, a.position.clone().add(off), 220 / aimSpeed());
  r?.setRunning(false); r?.raise?.(t.position); // r17：开火动作由 attack 分支统一触发
}
async function stepBackToCover() {
  if (!stepped) return; const s = stepped; stepped = null;
  const g = unitMesh.get(s.id); if (!g) return;
  const r = rigs.get(s.id); r?.setRunning(true);
  await tweenMesh(g, s.home, 300 / aimSpeed()); r?.setRunning(false);
}
/** r17：正面特写（hit_1422：CRITICAL 那一枪切到射手正前方、胸口高度略仰，射手在画面右半、持枪手在画面左侧，枪口朝镜头左前）。
 *  r13 版机位偏低且朝天（gun_cmp.jpg）→ 按 hit_1422 重定：射手前 1.55m、看点在射手身侧（世界 right +0.32 = 画面左），高 0.55×身高，FOV 40（按帧估，原版镜头数据无对应 → 重建）。
 *  时序：切入后等原版 GunFire 开火帧（impactRig）+0.12s → 硬切回过肩机位（hit_1422_8），命中与 CRITICAL!! 在过肩机位里出。触发 = 目标无掩体（CHANCE），仅 1 个正样本，标「推断」。 */
async function frontCloseUp(aid: string, tid: string) {
  const a = unitMesh.get(aid), t = unitMesh.get(tid); if (!a || !t) return;
  const { pos, look } = frontPose(aid, tid)!;
  const keep = { p: aimCam.position.clone(), q: aimCam.quaternion.clone(), fov: aimCam.fov, look: aimLook.clone() };
  aimAnim = null; aimCam.position.copy(pos); aimCam.fov = FRONT_CAM.fov; aimCam.lookAt(look); aimCam.updateProjectionMatrix();
  setAimSeeThrough(pos, look, a.position.y);
  document.body.classList.add('aim-front');
  rigs.get(aid)?.aim(t.position, 'gun', 2400 / aimSpeed());
  await sleep(90 / aimSpeed());
  await impactRig(aid, 900);
  await sleep(120 / aimSpeed());
  document.body.classList.remove('aim-front');
  aimCam.position.copy(keep.p); aimCam.quaternion.copy(keep.q); aimCam.fov = keep.fov; aimCam.updateProjectionMatrix(); aimLook.copy(keep.look);
  setAimSeeThrough(keep.p, keep.look, t.position.y);
}
// r17b：hit_1422 重看——枪口指向画面左、Joker 脸朝镜头 → 机位在瞄准线的「射手左侧」（-right，GunLoop 身体正面朝 -right，o_aim 过肩看到的是背），
// 不是 r17 的瞄准线正前方（那样枪口直指镜头、只看到侧面举枪，f00344）。dist=沿 -right 距离、fwd=沿瞄准方向、look 偏向枪那侧让射手落在画面右半。
const FRONT_CAM = { dist: 1.1, fwd: 0.5, h: 0.7, lookFwd: 0.19, lookH: 0.7, fov: 40 }; // r17b：M01 上按 hit_1422 标定（/workspace/work/rcal2 #4 + lookFwd 插值）
function frontPose(aid: string, tid: string) {
  const a = unitMesh.get(aid), t = unitMesh.get(tid); if (!a || !t) return null;
  const dir = t.position.clone().sub(a.position).setY(0).normalize(), right = new THREE.Vector3(-dir.z, 0, dir.x);
  const h = rigs.get(aid)?.height ?? 1.1;
  const look = a.position.clone().addScaledVector(dir, FRONT_CAM.lookFwd).add(new THREE.Vector3(0, h * FRONT_CAM.lookH, 0));
  const pos = a.position.clone().addScaledVector(right, -FRONT_CAM.dist).addScaledVector(dir, FRONT_CAM.fwd).add(new THREE.Vector3(0, h * FRONT_CAM.h, 0));
  return { pos, look };
}
const easeIO = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);
/** r17：从当前画面镜头快速飞入过肩机位（o_011→o_015：俯视 → 过肩约 0.4s 一气呵成，无中途远景机位 → 去掉 r16 开火前那帧空白紫屏：旧版从身后 5m 外的 from 机位起推，常落在建筑体内） */
function camSwoop(pos: THREE.Vector3, look: THREE.Vector3, fov: number, ms: number) {
  const src = viewCam as THREE.PerspectiveCamera;
  aimCam.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
  const dc = new THREE.PerspectiveCamera(); dc.position.copy(pos); dc.lookAt(look); dc.updateMatrixWorld();
  const p1 = pos.clone(), q1 = dc.quaternion.clone();
  const p0 = src.getWorldPosition(new THREE.Vector3()), q0 = src.getWorldQuaternion(new THREE.Quaternion()), f0 = src.isPerspectiveCamera ? src.fov : fov;
  aimLook.copy(look);
  const step = (k: number) => { const e = easeIO(k); aimCam.position.lerpVectors(p0, p1, e); aimCam.quaternion.slerpQuaternions(q0, q1, e); aimCam.fov = f0 + (fov - f0) * e; aimCam.updateProjectionMatrix(); };
  step(ms > 0 ? 0 : 1);
  aimAnim = ms > 0 ? { t0: performance.now(), dur: ms, step } : null;
  viewCam = aimCam;
}
/** r17：以射手为轴转向新目标（o_022→o_024 ≈0.25–0.3s） */
function camOrbit(center: THREE.Vector3, pos: THREE.Vector3, look: THREE.Vector3, ms: number) {
  const p0 = aimCam.position.clone(), l0 = aimLook.clone();
  const a0 = Math.atan2(p0.x - center.x, p0.z - center.z), a1 = Math.atan2(pos.x - center.x, pos.z - center.z);
  const r0 = Math.hypot(p0.x - center.x, p0.z - center.z), r1 = Math.hypot(pos.x - center.x, pos.z - center.z);
  let da = a1 - a0; da = Math.atan2(Math.sin(da), Math.cos(da));
  const step = (k: number) => {
    const e = easeOut(k), a = a0 + da * e, r = r0 + (r1 - r0) * e;
    aimCam.position.set(center.x + Math.sin(a) * r, p0.y + (pos.y - p0.y) * e, center.z + Math.cos(a) * r);
    aimLook.lerpVectors(l0, look, e); aimCam.lookAt(aimLook);
  };
  aimAnim = { t0: performance.now(), dur: Math.max(1, ms), step };
}
/** r17：开火镜头：SHOT/BACK 收起后约 0.25s 内机位升高、注视点向射手偏（r17b 按第一章 hit_1304 重标；r17 依据的 o_hit 是 DLC 关，作废） */
// r17b：在原版 M01 上按第一章 hit_1304 标定（/workspace/work/fcal5 #2）：机位后退不变、侧移×0.8、升高 1.2，注视点向射手偏 0.5 → 射手居中偏左、目标右上
const FIRE_CAM = { pull: 1.0, up: 1.2, ms: 260, lookDy: 0, fov: 34, latK: 0.8, lookMix: 0.5 };
let lastFire: { aid: string; tid: string | null; p0: THREE.Vector3; look: THREE.Vector3 } | null = null;
function fireEnd(aid: string, p0: THREE.Vector3, look0: THREE.Vector3) {
  // r17b：机位相对射手分解为 后退(沿 -dir)/侧移(right)/高度 → 后退×pull、侧移×latK、高度+up（hit_1304：射手几乎居中、目标在其右上）
  const c = unitMesh.get(aid)!.position.clone();
  const dir = look0.clone().sub(c).setY(0).normalize(), right = new THREE.Vector3(-dir.z, 0, dir.x), rel = p0.clone().sub(c);
  const bk = rel.dot(dir), lt = rel.dot(right);
  const p1 = c.clone().addScaledVector(dir, bk * FIRE_CAM.pull).addScaledVector(right, lt * FIRE_CAM.latK).add(new THREE.Vector3(0, rel.y + FIRE_CAM.up, 0));
  const lk = look0.clone().lerp(new THREE.Vector3(c.x, look0.y, c.z), FIRE_CAM.lookMix).add(new THREE.Vector3(0, FIRE_CAM.lookDy, 0)); // lookMix：注视点向射手（同高）偏移
  return { p1, look: lk };
}
function fireCam(aid: string, tid: string | null = null) {
  const a = unitMesh.get(aid); if (!a) return;
  const p0 = aimCam.position.clone(), l0 = aimLook.clone(), f0 = aimCam.fov;
  lastFire = { aid, tid, p0, look: l0 };
  const { p1, look } = fireEnd(aid, p0, l0);
  aimAnim = { t0: performance.now(), dur: FIRE_CAM.ms / aimSpeed(), step: (k) => { const e = easeOut(k); aimCam.position.lerpVectors(p0, p1, e); aimCam.fov = f0 + (FIRE_CAM.fov - f0) * e; aimCam.updateProjectionMatrix(); aimCam.lookAt(new THREE.Vector3().lerpVectors(l0, look, e)); } };
}
function aimPose(attackerId: string, targetId: string) {
  const a = unitMesh.get(attackerId)!, t = unitMesh.get(targetId)!;
  const ap = a.position.clone(), tp = t.position.clone();
  const dir = tp.clone().sub(ap); dir.y = 0; dir.normalize();
  // mix：注视点从目标向射手胸口偏移的比例（让目标落在画面中偏右，o_aim）
  const look = tp.clone().add(new THREE.Vector3(0, AIM_CAM.lookY, 0)).lerp(ap.clone().add(new THREE.Vector3(0, AIM_CAM.lookY, 0)), AIM_CAM.mix);
  const { to } = shoulderCam(attackerId, ap, dir, look);
  return { pos: to, look };
}
/** 过肩瞄准（敌方回合 / 未经瞄准阶段的开枪）：从当前镜头飞入过肩机位，射手+目标红描边，目标头顶红心+CHANCE（aim_1420_3） */
async function aimShot(attackerId: string, targetId: string, _reticle = true) {
  const SPEED = aimSpeed(); // 敌方回合点屏快进时整体加速
  const a = unitMesh.get(attackerId), t = unitMesh.get(targetId);
  if (!a || !t) return;
  const dir = t.position.clone().sub(a.position); dir.y = 0;
  if (dir.lengthSq() < 1e-4) return;
  const { pos, look } = aimPose(attackerId, targetId);
  if (aimActive && viewCam === aimCam) camOrbit(a.position, pos, look, 280 / SPEED);
  else camSwoop(pos, look, AIM_CAM.fov, SWOOP_MS / SPEED);
  aimActive = true; aimFiring = false; document.body.classList.add('aiming');
  const ov = $('#aim'); ov.classList.remove('hidden', 'fire', 'on');
  aimIds = [attackerId, targetId]; labelEl.get(targetId)?.classList.add('aimt');
  rigs.get(attackerId)?.raise?.(t.position);
  await sleep(SWOOP_MS / SPEED + 380 / SPEED); // 飞入 0.25s + 举枪瞄准停留（原版敌兵瞄准约 0.4s，按录像目估）
}
/** r11：技能列表/选目标期间切到原版式透视镜头；平滑跟随光标所在技能的目标。离开技能流程 → 回到俯视镜头 */
function skillCamStep() {
  const on = skillPhase !== 'none' && !!selected && !aimActive && battle.phase === 'player';
  if (!on) { if (viewCam === skillCam) { viewCam = baseCam(); setOrigCamCut(rig.persp ? 0.4 : null); } skCam = null; return; }
  const u = battle.unit(selected!);
  const a = w2v(previewTile ?? u.pos);
  const t = previewTarget ? battle.unit(previewTarget) : null;
  let b = t ? w2v(t.pos) : null;
  let look: THREE.Vector3;
  if (b) look = a.clone().add(b).multiplyScalar(0.5);
  else { // 射程内没有目标：仍朝最近的敌人看（视点放在施法者前方 2 格）
    let nb: THREE.Vector3 | null = null, nd = 1e9;
    for (const e of battle.units) if (!e.ko && e.side === 'enemy' && !battle.isHidden(e)) { const v = w2v(e.pos); const d = v.distanceTo(a); if (d < nd) { nd = d; nb = v; } }
    look = nb ? a.clone().add(nb.clone().sub(a).setY(0).normalize().multiplyScalar(Math.min(2, nd / 2))) : a.clone();
    b = nb && nd > 0.5 ? nb : null;
  }
  // 从施法者身后看向目标（skill_list_1756_8 沿红地毯看向敌人）；无目标时沿用当前俯视镜头的方位
  let yaw = rig.cur.yaw;
  if (b && (Math.abs(b.x - a.x) + Math.abs(b.z - a.z)) > 0.5) yaw = Math.atan2(a.x - b.x, a.z - b.z);
  const span = t && b ? Math.hypot(b.x - a.x, b.z - a.z) : 0;
  const dist = Math.max(SKILL_CAM.dist, span * 1.6 + 6);
  const pitch = THREE.MathUtils.degToRad(SKILL_CAM.pitchDeg);
  if (!skCam) skCam = { look: look.clone(), yaw, dist: dist * 1.25, pitch: pitch + 0.45 }; // 打开时从更高处落下来（过渡自定）
  const k = SKILL_CAM.ease;
  skCam.look.lerp(look, k);
  let dy = yaw - skCam.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); skCam.yaw += dy * k;
  skCam.dist += (dist - skCam.dist) * k; skCam.pitch += (pitch - skCam.pitch) * k;
  // 视点落在画面中心偏右下（列表压在左侧；1717_2 施法者—目标中点 ≈ (715,440)/1280×720）
  poseSkillCam(skillCam, skCam.look, skCam.yaw, skCam.dist, skCam.pitch, canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight);
  viewCam = skillCam; setOrigCamCut(0.4);
}
function aimStep() {
  resultStep();
  if (!aimAnim) return;
  const k = Math.min(1, (performance.now() - aimAnim.t0) / aimAnim.dur);
  aimAnim.step(k);
  setAimSeeThrough(aimCam.position, aimLook, aimLook.y - 0.55);
  if (k >= 1) aimAnim = null;
}
async function endAim(hold = 260) {
  if (!aimActive) return;
  await sleep(hold / aimSpeed());
  if (resultHold) { aimAnim = null; document.body.classList.remove('aiming'); $('#aim').classList.add('hidden'); return; } // r14：结算已接管镜头
  aimActive = false; aimAnim = null; viewCam = baseCam(); document.body.classList.remove('aiming'); setAimSeeThrough(null);
  const ov = $('#aim'); ov.classList.remove('on', 'fire'); ov.classList.add('hidden');
  for (const id of aimIds) labelEl.get(id)?.classList.remove('aimt'); aimIds = []; aimChance = false; aimFiring = false; aimCrit = false; gunAim = null;
  await stepBackToCover();
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
  if (turnChangeAvailable()) { sfx('ui_confirm_3', 0.8) /* 原版回合切换 SE 未导出，借用 ui_confirm_3 */; await playTurnChange('enemy', efast() ? SPEED * 1.7 : SPEED); } // r12：原版 ENEMY TURN（turn_start_enemy 2.0s）
  else await enemyTurnBanner(efast() ? 520 / SPEED : 900);
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
/** r15：敌人头顶心形显示的 HP（用户 r14 视频：挨打时心形变红再变回青色，但数字/血量不掉）。
 *  原因：规则层先结算，u.hp 在演出开始前就是扣血后的值；心形只在锁定时显示数字，命中后解除锁定 → 只剩满格青心，看不到掉血。
 *  改：演出期间按 damage 事件的 hpLeft 逐次扣（450ms 缩减），命中后保持红心+数字 1.3s；心形青色填充（target_gage_white，「gage」= 血槽）按 HP 比例从上往下缩。 */
const hpView = new Map<string, { from: number; to: number; t0: number; hitUntil: number; pred: number }>();
function shownHp(u: Unit) { const v = hpView.get(u.id); if (!v) return u.hp; const k = Math.min(1, (performance.now() - v.t0) / 450); return Math.round(v.from + (v.to - v.from) * (1 - Math.pow(1 - k, 2))); }
async function play(events: BattleEvent[]) {
  for (const ev of events) if (ev.type === 'damage') {
    const v = hpView.get(ev.unitId);
    if (!v) { const h0 = ev.hpLeft + ev.amount; hpView.set(ev.unitId, { from: h0, to: h0, t0: 0, hitUntil: 0, pred: ev.amount }); } else if (!v.t0) v.pred += ev.amount;
  }
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
        if (e.phase === 'player' && e.turn >= 1) { // r13：开战第 1 回合也播 YOUR TURN（原版每次我方回合开始都有；第 1 回合是否有按印象推断，参考录像开战段未截到）
          // r12：原版 YOUR TURN（prefab_ui2d_turn_change_ally + turn_start 2.0s，other_3405）；缺贴图回退旧横幅
          if (turnChangeAvailable()) { sfx('ui_confirm_3', 0.8) /* 原版回合切换 SE 未导出，借用 ui_confirm_3 */; await playTurnChange('ally', SPEED); } else { banner(`TURN ${e.turn}`); await sleep(500 / SPEED); }
        }
        break;
      case 'move': {
        const foeCam = vPhase === 'enemy' && isFoe(e.unitId);
        if (foeCam) { await enemyActorIntro(e.unitId); camFollow = e.unitId; }
        await settleRig(e.unitId, 1500); // 上一个动作（如受击）播完再起步
        await tweenPath(e.unitId, e.path.length ? e.path : [e.from, battle.unit(e.unitId).pos], walkMs(e.unitId));
        if (foeCam) { camFollow = null; await sleep(efast() ? 0 : 160); }
        break;
      }
      case 'dash': popDamage(e.unitId, e.kind === 'ladder' ? 'DASH↕' : 'JUMP'); break;
      case 'knockback':
        // r13：原版近战击退（录像 35:04.5–35:05.25）：敌人被打飞后贴地滑行 3–4 格、带尘土，≈0.5s，随后 CRITICAL/DOWN。
        // 原 70ms/格太快看不清 → 135ms/格 + 原版 SE damage_blow_away（尘土拖尾暂缺：原版特效未导出）。
        if (!e.blocked || !eq(e.from, e.to)) { sfx('damage_blow_away', 0.9); const kr = rigs.get(e.unitId); const ag = lastAttacker ? unitMesh.get(lastAttacker) : null; const kg = unitMesh.get(e.unitId);
          if (kg && !e.fly) {
            // r14：原版是「被打飞」不是后退步（melee_v67_1619 / 2419_5 低机位：敌人离地向后飞、落地扬尘；v98 37:32 击飞到空中）。
            // 动作 = 原版 DownStart→DownStartLoop（空中）→ DownGround（落地）→ DownReturn；抛物线高度/时长按帧估（重建，原版位移曲线在 C# 里未导出）。
            if (kr && ag) kr.faceTo(ag.position);
            const tiles = Math.max(1, Math.abs(e.to.x - e.from.x) + Math.abs(e.to.y - e.from.y));
            const air = (kr as { knockAir?: () => boolean } | undefined)?.knockAir?.() ?? false; if (!air) kr?.flinch();
            const from = kg.position.clone(), to = w2v(e.to), H = air ? 0.5 + 0.15 * tiles : 0, ms = (180 + tiles * 110) / SPEED, t0 = performance.now();
            for (;;) { const k = Math.min(1, (performance.now() - t0) / ms); kg.position.lerpVectors(from, to, 1 - Math.pow(1 - k, 1.6)); kg.position.y += 4 * H * k * (1 - k); if (k >= 1) break; await sleep(16); }
            if (air) { sfx('damage_blow_away', 0.5); (kr as { knockLand?: (d: boolean) => void }).knockLand?.(!!battle.unit(e.unitId).downed || battle.unit(e.unitId).ko); await sleep(260 / SPEED); }
          }
          else await tweenPath(e.unitId, [e.from, e.to], 135 / SPEED, e.fly ? 1.2 : 0); }
        if (e.blocked) { if (e.collidedWith) sfx('damage_hit_wall'); popDamage(e.unitId, e.collidedWith ? '撞击!' : '挡住'); }
        break;
      case 'pull': await tweenPath(e.unitId, e.path.length ? e.path : [e.from, e.to], 80 / SPEED); popDamage(e.unitId, e.effect === 'hypno' ? '催眠' : '漩涡'); break;
      case 'dizzyMove': await tweenPath(e.unitId, [e.from, e.to], walkMs(e.unitId), 0.3); popDamage(e.unitId, '眩晕'); break;
      case 'fall': popDamage(e.unitId, '坠落!', 'big'); await sleep(220 / SPEED); break;
      case 'followUp': sawDown = true; banner('FOLLOW UP!', true); toast(`${battle.unit(e.shooterId).name} 追击！${battle.unit(e.creditId).name} 获得 1 MORE`); await sleep(600 / SPEED); break;
      case 'meleeStep': unitMesh.get(e.unitId)?.position.copy(w2v(e.to)); break;
      case 'attack': {
        const foeAtk = vPhase === 'enemy' && isFoe(e.attackerId);
        if (foeAtk) await enemyActorIntro(e.attackerId);
        lastAttacker = e.attackerId;
        lastAtkKind = e.kind === 'gun' ? 'gun' : e.kind === 'melee' || e.kind === 'counter' ? 'melee' : e.kind === 'skill' || e.kind === 'unique' ? 'skill' : 'other';
        lastSkill = (e.kind === 'skill' || e.kind === 'unique') && e.skillId ? e.skillId : null;
        const gunCam = e.kind === 'gun' && !params.has('noaim'); // r17：枪击的开火动作在镜头就位、SHOT/BACK 收起后才放（sheet_b 第 9→10 帧）
        { const tg = unitMesh.get(e.targetId); const ar = rigs.get(e.attackerId); if (tg && ar) { if (gunCam) ar.faceTo(tg.position); else ar.aim(tg.position, e.kind === 'melee' || e.kind === 'counter' ? 'melee' : e.kind === 'skill' || e.kind === 'unique' ? 'skill' : 'gun', 2400 / SPEED); } const tr = rigs.get(e.targetId); const ag = unitMesh.get(e.attackerId); if (tr && ag) tr.faceTo(ag.position); }
        if (e.skillId && battle.unit(e.attackerId).side === 'ally') await summonCutIn(e.attackerId, e.skillId);
        // r14/r16：切入后原版 Persona（Joker=Arsene、Skull=Kidd、Mona=Zorro…）在身后现身 + 共通层 10300 蓝焰（原版贴图 Fire_5x2），直到命中结算后
        if (e.skillId && battle.unit(e.attackerId).side === 'ally' && (e.kind === 'skill' || e.kind === 'unique')) {
          const ag = unitMesh.get(e.attackerId), tg = unitMesh.get(e.targetId); const hh = rigs.get(e.attackerId)?.height ?? 1.1;
          personaFx?.end(); personaFx = null;
          if (ag && tg && personaKeyOf(e.attackerId)) personaFx = showPersona(world, ag, tg.position.clone(), hh, SPEED, e.attackerId, e.kind === 'unique'); // r16：全员原版 Persona（batch-10）
          if (ag) void summonAura(world, ag.position.clone(), hh, 1500 / SPEED);
        }
        if (gunCam) {
          const dmg = events.slice(ei + 1).find((x) => x.type === 'damage' && x.unitId === e.targetId) as Extract<BattleEvent, { type: 'damage' }> | undefined;
          const crit = !!dmg && !dmg.resist && dmg.cover === 0 && !isFoe(e.attackerId);
          // r17：玩家瞄准阶段已在过肩机位、锁定同一目标 → 不再重新切镜；敌方回合 / 未经瞄准阶段 → 飞入过肩机位（同一套镜头，无 SHOT/BACK）
          const pre = aimActive && viewCam === aimCam && aimIds[0] === e.attackerId && aimIds[1] === e.targetId;
          aimChance = crit; // aim_1420_3：瞄准时目标身上挂 CHANCE!!
          if (!pre) await aimShot(e.attackerId, e.targetId, false);
          // 确认后：SHOT/BACK、射程锁链、锁定标、红描边先收起（sheet_b 第 9 帧）
          aimFiring = true; aimCrit = crit; $('#aim').classList.remove('on'); clearOverlay(); refreshLabels();
          await stepOutIfCovered(e.attackerId, e.targetId);
          const ar = rigs.get(e.attackerId), tg = unitMesh.get(e.targetId);
          if (crit) await frontCloseUp(e.attackerId, e.targetId); // hit_1422 → 切回过肩（1422_8）
          else { fireCam(e.attackerId, e.targetId); if (ar && tg) ar.aim(tg.position, 'gun', 2400 / SPEED); }
        }
        else if (foeAtk && !params.has('noaim')) await aimShot(e.attackerId, e.targetId, false); // 敌方近战/技能：过肩机位 + 上下黑边，无准星
        break;
      }
      case 'damage': {
        const hv = battle.unit(e.unitId); const nowT = performance.now();
        hpView.set(e.unitId, { from: hv ? shownHp(hv) : e.hpLeft + e.amount, to: e.hpLeft, t0: nowT, hitUntil: nowT + 1300 / SPEED, pred: 0 });
      }
        // 攻击动作（GunStart→GunFire / Attack / Skill*）播完才结算受击，受击 Damage 播完才往下走（原版 clip 没导出动画事件点 → 以 clip 结束为准）
        // r7：等到攻击动作的原版命中帧（AnimationEvent：GunFire 开火帧 / Attack flag 2 / SkillActStart 末标记）就结算，不再等整段 clip 播完
        if (e.source !== 'triple') await impactRig(lastAttacker, 2600);
        // r8 原版 SE：枪 = 开火帧（原版 AnimationEvent GunFire）放 gun_fire + 命中 gun_impact；近战 = 命中帧 attack_hit
        if (e.source !== 'triple') { if (lastAtkKind === 'gun') { sfx('gun_fire'); sfx('gun_impact', 0.9); } else if (lastAtkKind === 'melee') sfx('melee_hit'); else sfx('gun_hit_v1', 0.8); }
        if (lastSkill && e.source !== 'triple') {
          const tg = unitMesh.get(e.unitId); const th = rigs.get(e.unitId)?.height ?? 1.1;
          if (tg) void (hasOrigSkillFx(lastSkill) ? origSkillHit(world, tg.position.clone(), lastSkill, th, SPEED) : skillHit(world, tg.position.clone(), lastSkill, th, SPEED));
          const pf = personaFx; if (pf) setTimeout(() => { pf.end(); if (personaFx === pf) personaFx = null; }, 700 / SPEED);
        }
        {
          const hs = hitSpecFor(e, events, ei);
          rigs.get(e.unitId)?.flinch();
          hitImpact(e.unitId, hs);
          popDamage(e.unitId, `${e.amount}${e.resist ? '▼' : ''}`, hs.heavy ? 'hit heavy' : 'hit');
          if (lastAtkKind === 'gun' && aimCrit && aimActive) popCritical(e.unitId); // r17：1422_8 CRITICAL!!（原版 bot01_critical_icon_dialog）
        }
        if (lastAtkKind === 'gun' && aimActive && aimFiring) { // r17：命中后在同一镜头停留约 0.8s 再回俯视（o_hit 58.25s → 回俯视）
          await sleep(800 / aimSpeed()); await endAim(0); break;
        }
        await sleep(240 / SPEED);
        await settleRig(e.unitId, 1800);
        await endAim(vPhase === 'enemy' && !efast() ? 420 : 260); break;
      case 'heal': popDamage(e.unitId, `+${e.amount}`, 'heal'); await sleep(200 / SPEED); break;
      case 'miss': if (lastAtkKind === 'gun') sfx('gun_fire'); popDamage(e.unitId, e.reason === 'shield' ? '盾挡!' : 'MISS'); await sleep(240 / SPEED); await endAim(); break;
      case 'down': { sfx('down_fall_ground'); popDamage(e.unitId, 'DOWN!'); sawDown = true; const g = unitMesh.get(e.unitId); const dr = rigs.get(e.unitId); if (dr) dr.setDowned(true); else if (g) { g.rotation.z = 1.2; g.position.y = gh(battle.unit(e.unitId).pos) + 0.15; } break; }
      case 'oneMore': {
        const u = battle.unit(e.unitId);
        sfx('one_more');
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
      case 'standUp': { // r15：倒地单位在己方阶段开始起身（规则层 beginSidePhase）→ 先播原版 DownReturn（batch-08 BTL0040）再行动；之前 busy 时不刷新姿势，敌兵趴着开枪
        const r = rigs.get(e.unitId); if (r) { r.setDowned(false); await (r.settle?.(1400) ?? sleep(400)); }
        else { const g = unitMesh.get(e.unitId); if (g) { g.rotation.z = 0; g.position.y = gh(battle.unit(e.unitId).pos); } }
        break;
      }
      case 'skipTurn': popDamage(e.unitId, ST_NAME[e.reason]); break;
      case 'ko': { sfx('damage_blow_away', 0.7); popDamage(e.unitId, 'KO'); const kr = rigs.get(e.unitId); if (kr) { await settleRig(e.unitId, 1500); kr.die(); await sleep(250 / SPEED); await settleRig(e.unitId, 2500); } else await sleep(200 / SPEED); } fxKeep.delete(e.unitId); break;
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
    if (next) { selected = next.id; rig.focus(w2v(next.pos)); }
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
  sfx('all_out_in');
  let ttHit = 0;
  await tripleThreatSeq(allies.map(cutWho), {
    victims: dmgs.length,
    showTriangle() { sfx('all_out_cutin', 0.8); tfx.show(aPos, vPos, fxMs(380)); rig.fitPoints([...aPos, ...vPos], 2); },
    hit(i) { if (!ttHit++) sfx('all_out_attack'); else sfx('gun_hit_v2', 0.8); const d = dmgs[i]; tfx.hit(pos(d.unitId)); popDamage(d.unitId, String(d.amount), 'tt'); },
    done() { sfx('all_out_end', 0.8); tfx.clear(); rig.restoreTarget(saved); },
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

let resultCtl: { next: () => void } | null = null;
let resultWipe: HTMLElement | null = null;
const RS_WIPE_MS = 120, RS_PRERED_MS = 1200; // 擦入 0.12s + 纯红 1.2s（实机 16:05.15→16:05.27→16:06.47）
const RS_RED_MS = 1500; // ResultIn 后背景仍是纯红、只有角色跳入（实机 16:06.47→16:07.97，红色占比 0.99 → 16:08.0 起场景出现）
const RS_LAYER = 3; // 结算角色单独一遍画在红带之上（原版红带是 UI 层压在 3D 背景上、角色再压在红带上）
const bandScene = new THREE.Scene(); const bandCam = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 10); bandCam.position.z = 1;
/** r16b：结算三遍渲染 —— ① 背景（RS_LAYER 外的场景；ResultIn 头 1.5s 用纯红代替）② 红带（屏幕空间，按帧重描）③ 清深度后只画结算角色。
 *  之前红带是世界空间平面夹在角色与背景之间：半透明/镂空的背景物体走透明队列会画到红带上面（红带区域 IoU 被吃掉），第 2 页前景物体会挡住角色。 */
function renderResult(r: THREE.WebGLRenderer) {
  const cam = resultCam, mask = cam.layers.mask, ac = r.autoClear;
  const dbg = (window as unknown as { __rsDbg?: string | null }).__rsDbg; // 'key' = 背景纯绿且无红带（IoU 去角色用）；'noband' = 背景照常但无红带（IoU 去地毯用）
  const red = !dbg && !!resultAnim && performance.now() - resultAnim.t0 < RS_RED_MS;
  if (dbg === 'key') { const cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha(); r.setClearColor(0x00ff00, 1); r.clear(); r.setClearColor(cc, ca); }
  else if (red) { const cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha(); r.setClearColor(0xf71400, 1); r.clear(); r.setClearColor(cc, ca); }
  else { cam.layers.set(0); r.render(scene, cam); }
  r.autoClear = false;
  if (!red && !dbg && resultBandMesh) r.render(bandScene, bandCam);
  r.clearDepth(); cam.layers.set(RS_LAYER);
  const bg = scene.background; scene.background = null; r.render(scene, cam); scene.background = bg;
  cam.layers.mask = mask; r.autoClear = ac;
}
function showResult(e: Extract<BattleEvent, { type: 'result' }>) {
  skillTag.classList.add('hidden'); // r12：结算前收起技能名牌
  stopBgm(1200); // r13：原版结算曲不是战斗曲（录像 16:08/26:04 与战斗段互相关 ≤0.21），且未导出 → 战斗曲淡出（推断）
  // r16b：进结算的原版 SE se_btl_wipe_win（battle_result.acb）——与实机视频 4 场结算前窗口滑动比对 chroma 0.80–0.81 / spec 0.81–0.85，4 场同一时刻（结算画面出现前约 5s 的切入），
  //   notes/r16b/audio/REPORT.md。胜利 BGM 不接（085_bgm_s05 最高 0.65–0.81，未到 ~0.9 门槛）。
  if (e.outcome === 'won' && !resultWipe) { // r16b：ResultIn 前的原版整屏红底（实机 16:05.15 红色星形从右缘 0.12s 扩满 → 16:05.27–16:06.47 纯红 #f71400 1.2s → ResultIn）。
    //   颜色/时长按实机逐帧量（30fps）；星形擦入的外形是重建（原版擦入 shader/贴图未导出）。SE se_btl_wipe_win 与擦入同一时刻（音频比对 b1 @965.1s）。
    sfx('se_btl_wipe_win'); skillTag.classList.add('hidden');
    const w = document.createElement('div'); w.className = 'rs-wipe'; document.body.appendChild(w); resultWipe = w;
    setTimeout(() => { showResult(e); }, RS_WIPE_MS + RS_PRERED_MS);
    return;
  }
  if (resultWipe) { resultWipe.remove(); resultWipe = null; }
  if (e.outcome === 'won') { // r12：原版结算两页（prefab_ui2d_result_win 布局；贴图待导出 → 占位）
    const party = battle.mainAllies().filter((u) => !u.prop && !u.decoy).slice(0, 3);
    const lead = party.find((u) => !u.ko) ?? party[0];
    const g = lead ? unitMesh.get(lead.id) : null;
    const staged = g ? stageResult(party, lead!) : null;
    resultCtl = showResultScreen($('#app'), {
      level: battle.map.id, turns: e.turn, won: true, band3d: !!staged, awards: e.crowns.items.map((i) => ({ ok: i.ok, label: i.label })),
      party: party.map((u) => ({ id: u.id, name: u.name, persona: PERSONA_NAME[u.id] ?? 'PERSONA', lv: 1 })),
    }, () => { for (const r of rigs.values()) (r as { setRim?: (on: boolean) => void }).setRim?.(false); world.getObjectByName('origGimmicks')?.children.forEach((o) => { if (o.userData.rsHid) { o.visible = true; delete o.userData.rsHid; } }); for (const g of unitMesh.values()) g.traverse((o) => { if (o.userData.rsLM !== undefined) { o.layers.mask = o.userData.rsLM; delete o.userData.rsLM; } }); resultCtl = null; resultHold = false; resultAnim = null; resultBandMesh?.removeFromParent(); setAimSeeThrough(null); aimActive = false; viewCam = baseCam(); showResultPlain(e); }, (page) => { if (page === 2 && staged) staged.cut(); });
    return;
  }
  showResultPlain(e);
}
/** r14：结算 3D 站位 + 原版 Result 动作（result_1610：前排中央一人举枪 ResultFront、后排左右 ResultBackL/R；镜头正面略低、三人占满画面）。
 *  原版结算镜头 A_CA9999_BTL0070 系列与站位数据未导出 → 站位/机位按 result_1610 构图重建；动作 = 角色 GLB 里的原版 BTL0070–0079。
 *  Joker/Skull/Mona 现有 GLB 只有 20 个 clip、无 Result（等 Codex batch-08）→ 退回原版 Idle，并记缺口。 */
// r15：结算镜头 = 原版 A_CA9999_BTL0070–0073 Timeline 轨道（tools/gen-result-cam.py 解出：相机局部位置/FOV/脚本角 + 轴心 Y 旋转）。
//   原版相机自身朝向没有轨道 → 推断：水平看向轴心（局部 -Z），脚本角按「水平摇镜」用（静止 6.5°；也可能是 Dutch 滚转，未查明）。
//   Unity→three 的左右手性：x 与轴心旋转方向的正负号按 result_1610 构图（前排在画面左中、后排在右）选定。
//   站位：三人同站轴心原点、同朝镜头，后排左右位移来自各自原版 Result clip 的 Jnt_C_Center 平移（BackR/BackL InLoop 自带约 1.2m 后移 + 左右错开）。
const RCAM = RESULT_CAM as unknown as Record<string, { dur: number; frames: number[][] }>;
let resultAnim: { P: THREE.Vector3; fwd: THREE.Vector3; t0: number; cut: number; cast: { g: THREE.Object3D; id: string; role: RsRole; center: THREE.Object3D | null; r?: { faceTo: (p: THREE.Vector3) => void } }[] } | null = null;
/** r16b：结算站位「按画面锚定」（重建）。原版角色落点/朝向由 IL2CPP 运行时编排，bundle 里没有（tracks/README：未导出总时间线）；
 *  「三人同站轴心 + 各自 Result clip 的 Jnt_C_Center 位移」拟合不上原版两页（notes/r16b/fit2-root-motion.py）。
 *  所以：相机走原版 CA9999 轨道（位置/注视/FOV/轴心转），角色每帧按目标「画面横坐标 x（0–1）+ 沿镜头深度 d（米）+ 高度偏移 y（米）」摆到 Center 骨骼上，
 *  朝向 = 面向相机 + yaw（度）。x/d/y 由 tools/r16b-fit.mjs 在与原版「同一时间点」（第 1 页 = ResultIn 开始后 3.53s，对应实机 16:10.0；
 *  第 2 页 = 翻页后 1.95s，对应 16:14.25 / 26:06.0）把每个角色的头部框（Jnt_C_Head 及子骨骼主导的顶点投影）对齐原版帧里量的头部框，属于按帧重建。
 *  角色（实机视频 16:12–16:17 与 26:02–26:07 两场核对）：hero1 = 前排（最后一击者；ResultFront 动作）——第 1 页左前，第 2 页「挥拳特写 + 青色描边」也是他；
 *  other = Mona（第 1 页中、第 2 页左）；hero2 = 第三人（第 1 页右后，第 2 页不在画面）。 */
type RsRole = 'hero1' | 'hero2' | 'other';
type RsT = { x: number; d: number; y?: number; yaw: number; hide?: boolean };
const RS_TARGET: Record<1 | 2, Record<RsRole, RsT>> = { // r16b/r16c：tools/r16b-fit.mjs 拟合值（/workspace/work/notes/r16b/fit/fit-A.json），头部框误差 0.0%（≤5% 门槛）
  1: { hero1: { x: 0.2415, d: 1.8541, y: 0.0843, yaw: 20 }, other: { x: 0.5023, d: 2.9145, y: 0.0717, yaw: 30 }, hero2: { x: 0.8055, d: 2.3792, y: 0.2516, yaw: 40 } },
  2: { hero1: { x: 0.5945, d: 0.9944, y: -0.0269, yaw: 75 }, hero2: { x: 1.4000, d: 2.0000, y: 0.0000, yaw: 0, hide: true }, other: { x: 0.1972, d: 1.6524, y: -0.0334, yaw: 30 } },
};
/** r16b：第 2 页前排按角色覆盖（场景 B：Joker 最后一击，对 result_2606 拟合）；没有的角色用 RS_TARGET[2].hero1 */
const RS_P2_FRONT: Record<string, RsT> = { joker: { x: 0.6339, d: 0.7712, y: -0.0677, yaw: 75 } }; // 场景 B 拟合（fit-B.json，对 result_2606 / b3p2_1566.0）
(window as unknown as { __rsP2F?: typeof RS_P2_FRONT }).__rsP2F = RS_P2_FRONT;
/** 原版帧里量的头部框（1280×720 像素：中心 x、中心 y、宽）——r16b-fit 与验收用（notes/r16b/ref/*.png，网格读数） */
export const RS_REF_HEAD = {
  p1: { hero1: [365, 165, 160], other: [685, 230, 170], hero2: [1010, 122, 150] }, // 16:10.0 = result_1610（Skull / Mona / Joker）
  p2: { hero1: [920, 167, 260], other: [255, 365, 210] }, // 16:14.25（Skull 前排特写 / Mona）；26:06.0 = result_2606 同构图（Joker 前排 [842,152,285] / Mona [255,365,210]）
};
(window as unknown as { __rsT?: typeof RS_TARGET }).__rsT = RS_TARGET; // 调参/截图钩子
(window as unknown as { __rsCam?: THREE.Camera }).__rsCam = resultCam;
/** r16b 验收/拟合：每个结算角色的头部框（Jnt_C_Head_00 及子骨骼为主权重的顶点，蒙皮后投影到 1280×720 像素）→ {role: [cx, cy, w, h]} */
const _rsHeadIdx = new WeakMap<THREE.SkinnedMesh, number[]>();
(window as unknown as { __rsHead?: () => unknown }).__rsHead = () => {
  if (!resultAnim) return null; const out: Record<string, number[]> = {}; const v = new THREE.Vector3();
  for (const c of resultAnim.cast) {
    if (!c.g.visible) continue; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; c.g.updateMatrixWorld(true);
    c.g.traverse((o) => {
      const m = o as THREE.SkinnedMesh; if (!m.isSkinnedMesh || !m.visible || m.name.endsWith('_red')) return;
      let idx = _rsHeadIdx.get(m);
      if (!idx) {
        const bones = m.skeleton.bones, isHead = bones.map((b) => { for (let q: THREE.Object3D | null = b; q; q = q.parent) if (q.name === 'Jnt_C_Head_00') return true; return false; });
        const si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight; idx = [];
        for (let i = 0; i < si.count; i += 2) { let bi = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; bi = si.getComponent(i, k); } } if (isHead[bi]) idx.push(i); }
        _rsHeadIdx.set(m, idx);
      }
      for (const i of idx) { m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld).project(resultCam); const px = (v.x + 1) * 640, py = (1 - v.y) * 360; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; }
    });
    if (x1 > x0) out[c.role] = [Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2), Math.round(x1 - x0), Math.round(y1 - y0)];
  }
  return out;
};

(window as unknown as { __rsProbe?: () => unknown }).__rsProbe = () => resultAnim?.cast.map((c) => { const w = c.center?.getWorldPosition(new THREE.Vector3()); return { role: c.role, vis: c.g.visible, g: c.g.position.toArray().map((v) => +v.toFixed(2)), c: w?.toArray().map((v) => +v.toFixed(2)), cam: resultCam.position.toArray().map((v) => +v.toFixed(2)), dist: w ? +w.distanceTo(resultCam.position).toFixed(2) : null, act: (c.r as unknown as { baseKey?: string; oneShot?: string })?.baseKey + '/' + (c.r as unknown as { oneShot?: string })?.oneShot }; });
// 正负号按 result_1610 定：相机在前排右侧（x=+0.66）、摇镜 +6.5° 向左 → 前排在画面左中（≈0.34）、BackR 在最右且更近（≈0.88）、BackL 居中靠后（≈0.76），与原版 Skull/Mona/Joker 构图一致
const RC_FLIP = new URLSearchParams(location.search).has('rcflip');
function resultCamFrame(clip: string, t: number) {
  const c = RCAM[clip]; const f = Math.min(c.frames.length - 1, t * 30); const i = Math.floor(f), k = f - i, A = c.frames[i], B = c.frames[Math.min(c.frames.length - 1, i + 1)];
  return A.map((v, j) => v + (B[j] - v) * k);
}
/** r15：结算红色斜带（ResultLineManager 脚本画的，参数未导出 → 重建）。原版斜带在角色「后面」（result_1610 人物压在红带上），
 *  之前画在 DOM 层整个盖住 3D 角色 → 改成跟随结算相机的 3D 平面：放在后排角色之后、背景之前，铺满视锥。 */
let resultBandMesh: THREE.Mesh | null = null;
let resultBandPage = 0;
/** r16：结算红带按原版帧逐页重描（ResultLineManager Line1–4 是脚本运行时画的，prefab 里 RectTransform 为空、无参数 → 不可能拿到原始数据）。
 *  做法：把 result_1610（第 1 页）/ result_2606（第 2 页）按「纯红 R>170,G<60,B<70」做掩膜（notes/r16/mask-*.png），
 *  去掉 UI 面板与角色后的大块红色区域描成多边形（坐标 = 1280×720 帧像素）。无黑描边（原版红带直接压在背景上）。属于「按帧重建」，非原始数据。 */
// r16b：改为由 tools/r16b-trace-bands.py 从原版帧红色掩膜（R>170,G<70,B<80）自动描边：闭运算 9px + 开运算 5px、填内洞（被 UI 面板/角色挡住的部分按红带连续处理）、
//   approxPolyDP ε=2px → src/view/data/result-bands.json（1280×720 帧像素）。仍属「按帧重建」：ResultLineManager 线条参数不在 bundle 里。
const RESULT_BANDS = RESULT_BANDS_JSON as unknown as Record<string, number[][][]>;
function resultBand(page = 1) {
  if (!resultBandMesh) {
    const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 720;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    // r16b：不再靠深度夹在角色与背景之间（第 2 页机位离背景建筑近，红带平面被建筑挡掉 → IoU 只有 0.18）。改成「不透明 + alphaTest 镂空、关深度测试」，
    //   renderOrder 1 画在背景之后，结算角色 renderOrder 2 再画在红带上（placeResultCast 里设置）。
    resultBandMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false }));
    resultBandMesh.name = 'resultBand'; resultBandMesh.frustumCulled = false; // r16b：屏幕空间（bandScene 正交相机铺满视口），renderResult 第②遍画
  }
  if (resultBandPage !== page) {
    resultBandPage = page;
    const tex = (resultBandMesh.material as THREE.MeshBasicMaterial).map as THREE.CanvasTexture; const cv = tex.image as HTMLCanvasElement; const c = cv.getContext('2d')!;
    c.clearRect(0, 0, 1280, 720); c.fillStyle = '#fa0000'; // r16b：原版红带取色（b1p1 红带像素中位数 BGR 0/0/250）
    for (const pts of RESULT_BANDS[String(page)] ?? []) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); }
    tex.needsUpdate = true;
  }
  return resultBandMesh;
}
function resultStep() {
  if (!resultAnim || viewCam !== resultCam) { if (resultBandMesh?.parent && !resultHold) resultBandMesh.removeFromParent(); return; }
  const now = performance.now();
  let fr: number[];
  if (resultAnim.cut) {
    const t = (now - resultAnim.cut) / 1000, d0 = RCAM.ResultCutchange.dur;
    fr = t < d0 ? resultCamFrame('ResultCutchange', t) : resultCamFrame('ResultCutEndLoop', Math.min(RCAM.ResultCutEndLoop.dur, t - d0));
  } else {
    const t = (now - resultAnim.t0) / 1000, d0 = RCAM.ResultIn.dur, dl = RCAM.ResultLoop.dur;
    fr = t < d0 ? resultCamFrame('ResultIn', t) : resultCamFrame('ResultLoop', (t - d0) % dl);
  }
  // r16：CA9999 tracks（右手系）：相机局部位置 + 注视点 camera1_aim，均在 camera1_group 坐标系（绕 Y 转 gy 弧度）里；?rcflip=1 时左右镜像（核对用）
  const [x, y, z, fov, ax, ay, az, gy] = fr;
  const { P, fwd } = resultAnim;
  const sx = RC_FLIP ? -1 : 1;
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(fwd.x, fwd.z) + sx * gy);
  resultCam.position.copy(P).add(new THREE.Vector3(sx * x, y, z).applyQuaternion(q));
  const aimW = P.clone().add(new THREE.Vector3(sx * ax, ay, az).applyQuaternion(q));
  resultCam.up.set(0, 1, 0); resultCam.lookAt(aimW);
  const focus = resultAnim.cast.find((c) => c.role === 'hero1')?.center?.getWorldPosition(new THREE.Vector3()) ?? P.clone().add(new THREE.Vector3(0, 0.6, 0));
  // r16b：原版 gimmick（旗杆/木箱/炸弹桶）不走地图材质的镂空 → 机位与当页主角之间 1.2m 内的整件隐藏（结束时恢复）
  { const gm = world.getObjectByName('origGimmicks'); const ab = focus.clone().sub(resultCam.position), L2 = Math.max(1e-4, ab.lengthSq());
    gm?.children.forEach((o) => { const w = o.getWorldPosition(new THREE.Vector3()); w.y = focus.y; const t = THREE.MathUtils.clamp(w.clone().sub(resultCam.position).dot(ab) / L2, 0, 1.05);
      const near = w.distanceTo(resultCam.position.clone().addScaledVector(ab, t)) < 1.2; if (near && o.visible) { o.visible = false; o.userData.rsHid = true; } else if (!near && o.userData.rsHid) { o.visible = true; delete o.userData.rsHid; } }); }
  setAimSeeThrough(resultCam.position, focus, P.y, true); // r16b：半透圆柱指向当页主角（第 2 页 = Joker 特写）；r16：结算机位与角色之间的场景物体半透（第 2 页机位在 3.5m 外，常被柱/雕像挡住）
  resultCam.fov = fov; resultCam.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight); resultCam.updateProjectionMatrix();
  resultCam.updateMatrixWorld();
  placeResultCast(resultAnim.cut ? Math.min(1, (now - resultAnim.cut) / 1000 / RCAM.ResultCutchange.dur) : 0);
  const band = resultBand(resultAnim.cut ? 2 : 1); if (!band.parent) bandScene.add(band);
}
const _rsV = new THREE.Vector3(), _rsC = new THREE.Vector3(), _rsF = new THREE.Vector3();
function placeResultCast(k: number) {
  if (!resultAnim) return;
  const T = (window as unknown as { __rsT?: typeof RS_TARGET }).__rsT ?? RS_TARGET;
  resultCam.getWorldDirection(_rsF);
  for (const c of resultAnim.cast) {
    const a = T[1][c.role], b = (c.role === 'hero1' && RS_P2_FRONT[c.id]) || T[2][c.role]; // 第 2 页前排按角色单独拟合（Skull 场 vs Joker 场原版帧构图不同）
    const x = a.x + (b.x - a.x) * k, d = a.d + (b.d - a.d) * k, yaw = a.yaw + (b.yaw - a.yaw) * k;
    const yo = (a.y ?? 0) + ((b.y ?? 0) - (a.y ?? 0)) * k; c.g.position.y = resultAnim.P.y + yo;
    c.g.visible = !(k > 0.5 ? b.hide : a.hide);
    _rsV.set(x * 2 - 1, 0, 0.5).unproject(resultCam).sub(resultCam.position).normalize();
    const pt = resultCam.position.clone().addScaledVector(_rsV, d / Math.max(0.05, _rsV.dot(_rsF)));
    const fy = Math.atan2(resultCam.position.x - pt.x, resultCam.position.z - pt.z) + THREE.MathUtils.degToRad(yaw);
    // 绝对定位：g = 目标点 − (Center 世界坐标 − g)（只动水平；Result clip 自带的 Center 位移/跳跃高度保留在 y 上）
    if (c.center) { c.center.getWorldPosition(_rsC); c.g.position.x = pt.x - (_rsC.x - c.g.position.x); c.g.position.z = pt.z - (_rsC.z - c.g.position.z); }
    else { c.g.position.x = pt.x; c.g.position.z = pt.z; }
    (c.r as unknown as { setYaw?: (y: number) => void } | undefined)?.setYaw?.(fy);
  }
}
function stageResult(party: Unit[], lead: Unit) {
  const g0 = unitMesh.get(lead.id)!;
  const fwd = baseCam().position.clone().sub(g0.position).setY(0); // 指向当前俯视镜头一侧
  if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, 1); fwd.normalize();
  const qs = new URLSearchParams(location.search); // 截图核对用：?rsfront=joker&rsparty=joker,mona（复现 26:02 那场：Joker 最后一击、两人队）
  if (qs.get('rsparty')) { const ids = qs.get('rsparty')!.split(','); party = party.filter((u) => ids.includes(u.id)); }
  const la = qs.get('rsfront') ? party.find((u) => u.id === qs.get('rsfront')) : lastAttacker ? party.find((u) => u.id === lastAttacker && !u.ko) : undefined;
  const front = la ?? party.find((u) => u.id === 'skull' && !u.ko) ?? party.find((u) => u.id !== 'joker' && !u.ko) ?? lead; // result_1610：前排 = 打出最后一击的 Skull，Joker 在后排右（推断：最后一击者在前，样本 1）
  const P = (unitMesh.get(front.id) ?? g0).position.clone();
  const rest = party.filter((u) => u !== front);
  const other = rest.find((u) => u.id === 'mona') ?? rest[1] ?? rest[0]; // 两场实机里 Mona 都在「第 1 页中 / 第 2 页左」
  const third = rest.filter((u) => u !== other);
  const order = [front, ...third, ...(other ? [other] : [])];
  const slots = order.map((u, i) => (i === 0 ? 'front' : u === other ? 'backL' : 'backR')) as ('front' | 'backR' | 'backL')[];
  const roles = order.map((u, i) => (i === 0 ? 'hero1' : u === other ? 'other' : 'hero2')) as RsRole[];
  const cast: NonNullable<typeof resultAnim>['cast'] = [];
  const missing: string[] = [];
  order.forEach((u, i) => {
    const g = unitMesh.get(u.id), r = rigs.get(u.id); if (!g) return;
    g.visible = true; g.position.copy(P); g.rotation.set(0, 0, 0);
    if (r) {
      r.revive(); r.setHighlight?.(false); (r as { setCover?: (s: null) => void }).setCover?.(null);
      // 前排 ResultFront clip 的 Jnt_C_Center 自带约 +90° 侧身（root 朝镜头时前排侧对镜头、脸朝画面右）→ 前排 root 转 +75°，
      //   按 result_1610 前排约 3/4 正面朝镜头、举枪手在画面左校正（角度为目测拟合）
      const fy = Math.atan2(fwd.x, fwd.z) + (i === 0 ? THREE.MathUtils.degToRad(75) : 0);
      r.faceTo(P.clone().add(new THREE.Vector3(Math.sin(fy), 0, Math.cos(fy))));
      if (!(r as { playResult?: (s: string) => boolean }).playResult?.(slots[i])) missing.push(u.id);
    }
    g.traverse((o) => { o.userData.rsLM ??= o.layers.mask; o.layers.set(RS_LAYER); }); // r16b：结算角色单独一遍画（renderResult ③）
    cast.push({ g, id: u.id, role: roles[i], center: g.getObjectByName('Jnt_C_Center_00') ?? null, r: r as { faceTo: (p: THREE.Vector3) => void } | undefined });
  });
  scene.traverse((o) => { if ((o as THREE.Light).isLight) o.layers.enable(RS_LAYER); }); // 灯光也要在角色那一遍的层上
  for (const u of battle.units) if (!order.includes(u)) { const g = unitMesh.get(u.id); if (g) g.visible = false; }
  for (const el of labelEl.values()) el.style.display = 'none';
  clearOverlay();
  resultAnim = { P: P.clone(), fwd: fwd.clone(), t0: performance.now(), cut: 0, cast };
  aimAnim = null; viewCam = resultCam; aimActive = true; resultHold = true; setAimSeeThrough(null); resultStep();
  (window as unknown as { __resultMissing?: string[] }).__resultMissing = missing;
  return { cut: () => { if (resultAnim) resultAnim.cut = performance.now(); const h2 = order[0] && rigs.get(order[0].id); (h2 as { setRim?: (on: boolean) => void } | undefined)?.setRim?.(true); order.forEach((u, i) => (rigs.get(u.id) as { playResult?: (s: string, c: boolean) => boolean } | undefined)?.playResult?.(slots[i], true)); } };
}
function showResultPlain(e: Extract<BattleEvent, { type: 'result' }>) {
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
  ray.setFromCamera(ndc, viewCam === skillCam ? skillCam : baseCam());
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
const camOverview = () => { const a = selected ? battle.unit(selected) : battle.alive('ally').find((x) => !x.prop && !x.decoy && !x.acted); rig.toggleOverview(a ? w2v(a.pos) : null); };
attachCameraInput(canvas, rig, (e) => onTap(pick(e)), () => !aimActive, camOverview);
mountCamButtons((d) => rig.rotate(d), camOverview);

function onTap(h: { tile?: Vec; unit?: string }) {
  if (busy || battle.phase !== 'player') return;
  if (gunAim) { if (h.unit) gunAimTap(h.unit); return; } // r17：瞄准阶段只认敌人（切目标 / 再点当前目标 = 开火）
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
        sfx('ui_confirm_1'); skillPhase = 'none'; void play(evs).then(() => skillTag.classList.add('hidden')); // r12：辅助技能释放后也收起名牌
        return;
      }
      if (selected === u.id && previewTile) { previewTile = null; previewTarget = null; }
      else if (u.decoy) toast('诱饵：敌人会优先攻击它，被打一下就消失');
      else if (!u.acted) { endSkillFlow(); sfx('ui_confirm_short', 0.7); selected = u.id; inspectEnemy = null; previewTile = null; previewTarget = null; mode = 'auto'; skillId = null; rig.focus(w2v(u.pos)); } // 镜头跟随选中角色
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
// ---------- r17 枪击瞄准阶段（原版 part9 0:53–1:01 逐帧：o_011 俯视 → o_015 过肩 + SHOT/BACK → o_018/o_022 切目标 → sheet_b 开火） ----------
/** 射程内可打的敌人，默认目标排第一：最近（同距离时无 GUARD 的优先） */
function gunTargetsOf(u: Unit, from: Vec): string[] {
  const md = (e: Unit) => Math.abs(e.pos.x - from.x) + Math.abs(e.pos.y - from.y);
  return battle.units.filter((e) => !e.ko && e.side !== 'ally' && !e.prop && !battle.isHidden(e) && battle.canShoot(u, e, from))
    .sort((a, b) => md(a) - md(b) || Number(!!a.guard) - Number(!!b.guard)).map((e) => e.id);
}
function gunAimChance(sid: string, tid: string) {
  const s = battle.unit(sid), t = battle.unit(tid), p = battle.previewDamage(s, t, 'gun', undefined, s.pos);
  return !p.resist && p.cover === 0 && !p.miss;
}
function startGunAim(): boolean {
  if (!selected || busy || battle.phase !== 'player' || aimActive) return false;
  const u = battle.unit(selected);
  if (u.acted || !u.gun) return false;
  // 站位格还没确认（只预览）→ 维持旧流程（先移动再开枪，事件里会飞入过肩机位）
  if (previewTile && !eq(previewTile, u.pos)) return false;
  const targets = gunTargetsOf(u, u.pos);
  if (!targets.length) return false;
  sfx('ui_confirm_short', 0.7);
  mode = 'gun'; gunAim = { sid: u.id, targets, idx: 0, ready: false };
  previewTarget = targets[0];
  aimActive = true; // 指令牌收起、镜头手势停用
  refreshAll();
  const ga = gunAim;
  // o_011 → o_015：按 GUN 后约 0.1s 开始、0.4s 飞入过肩机位；SHOT/BACK 在镜头到位时滑入
  setTimeout(() => {
    if (gunAim !== ga) return;
    const t = gunTid()!; const { pos, look } = aimPose(ga.sid, t);
    camSwoop(pos, look, AIM_CAM.fov, SWOOP_MS / SPEED);
    document.body.classList.add('aiming');
    aimIds = [ga.sid, t]; labelEl.get(t)?.classList.add('aimt'); aimChance = gunAimChance(ga.sid, t);
    rigs.get(ga.sid)?.raise?.(unitMesh.get(t)!.position);
    const ov = $('#aim'); ov.classList.remove('hidden', 'fire', 'on');
    setTimeout(() => { if (gunAim !== ga) return; ga.ready = true; ov.classList.add('on'); refreshAll(); }, SWOOP_MS / SPEED);
    refreshAll();
  }, 100 / SPEED);
  return true;
}
/** 切到另一个可打目标：锁定标跳过去，镜头以射手为轴转向（o_022→o_024 ≈0.3s） */
function gunAimSwitch(idx: number) {
  if (!gunAim || !gunAim.ready) return;
  const n = gunAim.targets.length; idx = ((idx % n) + n) % n;
  if (idx === gunAim.idx) return;
  const old = gunTid()!; labelEl.get(old)?.classList.remove('aimt');
  gunAim.idx = idx; const t = gunTid()!;
  previewTarget = t; aimIds = [gunAim.sid, t]; labelEl.get(t)?.classList.add('aimt'); aimChance = gunAimChance(gunAim.sid, t);
  sfx('ui_confirm_short', 0.5);
  const a = unitMesh.get(gunAim.sid)!, tp = unitMesh.get(t)!.position;
  rigs.get(gunAim.sid)?.raise?.(tp);
  const { pos, look } = aimPose(gunAim.sid, t);
  camOrbit(a.position, pos, look, 300 / SPEED);
  refreshAll();
}
function gunAimFire() {
  if (!gunAim || !gunAim.ready || busy) return;
  const s = battle.unit(gunAim.sid), t = battle.unit(gunTid()!);
  gunAim = null; previewTarget = t.id;
  commitAttack(s, t);
  mode = 'auto';
}
function gunAimBack() {
  if (!gunAim) return;
  const sid = gunAim.sid; gunAim = null;
  sfx('ui_confirm_3', 0.6);
  rigs.get(sid)?.lower?.();
  previewTarget = null; mode = 'auto';
  void endAim(0).then(() => refreshAll());
}
function gunAimTap(id: string) {
  if (!gunAim || !gunAim.ready) return;
  const i = gunAim.targets.indexOf(id);
  if (i < 0) return; // 打不到的敌人点了没反应（原版光标只在可打目标间切换）
  if (i === gunAim.idx) gunAimFire(); else gunAimSwitch(i);
}
$('#aim').addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-aim]'); if (!b) return;
  ev.stopPropagation();
  if (b.dataset.aim === 'shot') gunAimFire(); else gunAimBack();
});
window.addEventListener('keydown', (e) => {
  if (!gunAim || busy) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { gunAimSwitch(gunAim.idx - 1); e.preventDefault(); }
  else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { gunAimSwitch(gunAim.idx + 1); e.preventDefault(); }
  else if (e.key === 'Enter' || e.key === 'z') { gunAimFire(); e.preventDefault(); }
  else if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'x') { gunAimBack(); e.preventDefault(); }
});
/** 执行对敌攻击（第二次点目标 / 预测面板「确认」） */
function commitAttack(s: Unit, u: Unit) {
    const from = previewTile ?? s.pos;
    const at = attackFrom(s, from, u);
    const via = !at ? meleeViaMove(s, u) : null;
    if (!at && !via) return;
    sfx('ui_confirm_1');
    const evs: BattleEvent[] = [];
    const dest = via ? via.via : previewTile;
    if (dest && !eq(dest, s.pos)) evs.push(...battle.move(s.id, dest));
    const kind = at ? at.kind : 'melee';
    if (kind === 'melee') evs.push(...battle.melee(s.id, u.id));
    else if (kind === 'gun') evs.push(...battle.shoot(s.id, u.id));
    else evs.push(...battle.skill(s.id, at!.skill!.id, u.id));
    // r10：技能名牌在切入/释放期间保持（other_1759_6、hit_1722），演出结束后收起
    if (kind === 'skill') { skillPhase = 'none'; skillTag.classList.remove('hidden'); }
    void play(evs).then(() => { skillTag.classList.add('hidden'); refreshAll(); });
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
    if (previewTile && eq(previewTile, h.tile)) { sfx('ui_confirm_short'); void play(battle.move(s.id, h.tile)); return; }
    previewTile = h.tile; previewTarget = null;
    return refreshAll();
  }
  inspectEnemy = null; selected = null;
  refreshAll();
}

// ---------- r10 技能列表流程 ----------
const skillTag = document.createElement('div'); skillTag.id = 'skill-tag'; skillTag.className = 'hidden'; $('#app').appendChild(skillTag);
const keyguide = document.createElement('div'); keyguide.id = 'keyguide'; keyguide.className = 'hidden';
keyguide.innerHTML = '<button data-k="a"><i>A</i>确定</button><button data-k="b"><i>B</i>返回</button>'; // 原版还有「≡暂停」：本作暂停菜单未做 → 不放假按钮
$('#app').appendChild(keyguide);
/** 列表里光标所在技能的默认目标：射程内最近的敌人（镜头转过去、画范围格） */
function defaultSkillTarget(u: Unit, sk: SkillDef): Unit | null {
  const from = previewTile ?? u.pos;
  let best: Unit | null = null, bd = 1e9;
  for (const e of battle.units) if (!e.ko && e.side === 'enemy' && !battle.isHidden(e) && battle.canSkill(u, sk, e, from)) { const d = Math.abs(e.pos.x - from.x) + Math.abs(e.pos.y - from.y); if (d < bd) { bd = d; best = e; } }
  return best;
}
const skillList = new SkillList($('#app'), {
  onHover(id) {
    if (!selected) return;
    const u = battle.unit(selected); skillId = id; mode = 'skill';
    const sk = curSkill(u); const t = sk && sk.kind === 'attack' ? defaultSkillTarget(u, sk) : null;
    previewTarget = t ? t.id : null;
    sfx('ui_confirm_short', 0.45);
    // 打开时镜头转向目标（skill_list_2459）：对准施法者与目标的中点
    if (t) { const a = w2v(previewTile ?? u.pos), b = w2v(t.pos); rig.focus(a.add(b).multiplyScalar(0.5), rig.userZoom); }
    refreshAll();
  },
  onPick(id) {
    if (!selected) return;
    skillId = id; skillList.hide(); skillPhase = 'target';
    const sk = curSkill(battle.unit(selected));
    skillTag.textContent = sk ? skillNameZh(sk) : '';
    skillTag.style.cssText = p5.has(SKL_TEX.tag) ? `background:url("${p5.url(SKL_TEX.tag)}") 0 0/100% 100% no-repeat` : '';
    skillTag.classList.remove('hidden');
    sfx('ui_confirm_1');
    refreshAll();
  },
  onBack() { sfx('ui_confirm_3', 0.6); endSkillFlow(); refreshAll(); },
});
function openSkillList() {
  if (!selected) return;
  const u = battle.unit(selected);
  if (!u.skills.length) { toast('没有可用技能'); return; }
  skillPhase = 'list'; mode = 'skill'; skillTag.classList.add('hidden');
  sfx('ui_confirm_short', 0.8);
  skillList.show(u, u.skills, skillId);
}
/** 回到指令牌（B / 返回 / 换人） */
function endSkillFlow() {
  if (skillPhase === 'none' && !skillList.open) return;
  skillList.hide(); skillTag.classList.add('hidden');
  skillPhase = 'none'; mode = 'auto'; skillId = null; previewTarget = null;
  if (selected) rig.focus(w2v(previewTile ?? battle.unit(selected).pos), rig.userZoom);
}
keyguide.addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest('button'); if (!b || busy) return;
  if (b.dataset.k === 'b') { if (skillPhase === 'target') { sfx('ui_confirm_3', 0.6); openSkillList(); } else { sfx('ui_confirm_3', 0.6); endSkillFlow(); refreshAll(); } return; }
  if (skillPhase === 'list') { const s = skillList.current; if (s && skillList.usable(s)) skillList['hooks'].onPick(s.id); return; }
  if (skillPhase === 'target' && selected && previewTarget) commitAttack(battle.unit(selected), battle.unit(previewTarget));
});
window.addEventListener('keydown', (e) => {
  if (skillPhase !== 'target' || busy) return;
  if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'x') { sfx('ui_confirm_3', 0.6); openSkillList(); e.preventDefault(); }
  else if ((e.key === 'Enter' || e.key === 'z') && selected && previewTarget) { commitAttack(battle.unit(selected), battle.unit(previewTarget)); e.preventDefault(); }
});

installUnlock();
// r13：调试工具栏/关卡按钮/旋转按钮/旧指令按钮/单位名牌默认隐藏（原版画面没有），?debug 显示
if (params.has('debug')) document.body.classList.add('debug');
$('#hintbar').addEventListener('click', (ev) => {
  const h = (ev.target as HTMLElement).closest<HTMLElement>('[data-h]')?.dataset.h;
  if (!h) return;
  if (h === 'end') { $<HTMLButtonElement>('#endbar button').click(); return; }
  if (h === 'range') { $('#btn-threat').click(); return; }
  if (h === 'cycle' && battle.phase === 'player' && !busy) { const al = battle.units.filter((u) => u.side === 'ally' && !u.ko && !u.acted && !u.prop && !u.decoy); if (al.length) { const i = al.findIndex((u) => u.id === selected); onTap({ unit: al[(i + 1) % al.length].id }); } }
});
$('#endbar').addEventListener('click', () => { if (busy || battle.phase !== 'player') return; sfx('ui_confirm_2'); endSkillFlow(); skillTag.classList.add('hidden'); selected = null; void play(battle.endPlayerPhase()); }); // r12：结束回合时收起技能流程/名牌（之前选目标未释放时名牌会一直挂到敌方回合）
$('#party').addEventListener('click', (ev) => {
  const c = (ev.target as HTMLElement).closest('[data-charge]') as HTMLElement | null;
  if (c && selected && !busy) { void play(battle.selectCharge(selected, c.dataset.charge as never)); return; }
  const p = (ev.target as HTMLElement).closest('[data-uid]') as HTMLElement | null;
  if (p) { onTap({ unit: p.dataset.uid! }); const u = battle.unit(p.dataset.uid!); if (!rig.inView(w2v(u.pos))) camFocus(u.pos, rig.userZoom); }
});
$('#actions').addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest('button');
  if (!b || busy) return;
  doAct(b.dataset.act!);
});
function doAct(a: string) {
  if (busy) return;
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
  if (a === 'skill') { openSkillList(); return; }
  if (a === 'gun' && startGunAim()) return; // r17：GUN = 直接进过肩瞄准（射程内没有可打目标时退回旧的选目标模式）
  sfx('ui_confirm_short', 0.7);
  mode = mode === a ? 'auto' : (a as Mode);
  previewTarget = null;
  refreshAll();
}
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

function showLoadCover(): Promise<void> {
  let el = document.getElementById('loadcover');
  if (!el) { el = document.createElement('div'); el.id = 'loadcover'; el.innerHTML = '<span>LOADING</span>'; document.body.appendChild(el); }
  el.classList.remove('gone');
  const t0 = performance.now();
  return new Promise((res) => { const tick = () => { if (charsReady() || performance.now() - t0 > 45000) { el!.classList.add('gone'); res(); return; } setTimeout(tick, 150); }; tick(); });
}
let started = false;
function restart() {
  $('#result').classList.add('hidden');
  battle = new Battle(makeMap());
  freshMap = true; mapObj.reset();
  selected = null; previewTile = null; previewTarget = null; inspectEnemy = null; mode = 'auto';
  if (typeof skillList !== 'undefined') endSkillFlow();
  build();
  const b = battle; started = false; busy = true; // 遮罩期间不接受操作
  void showLoadCover().then(() => {
    if (battle !== b) return;
    busy = false; started = true;
    playLevelBgm(battle.map.id); // r13：原版 BgmId（stages.csv）对应曲目，无缝循环
    void play(battle.start());
  });
}

function loop() {
  if (performance.now() < freezeUntil) { // 顿帧（1 MORE / r7 命中）：角色动画时钟停住，火花照放
    const now = performance.now(); for (const r of rigs.values()) r.freeze?.(now);
    if (!document.body.classList.contains('hitstop')) { updateHitFx(viewCam, world); setSkillFxCamera(viewCam); const so = applyShake(viewCam); sdim.render(renderer, scene, viewCam as THREE.PerspectiveCamera); undoShake(viewCam, so); }
    requestAnimationFrame(loop); return;
  }
  tfx.update();
  if (camFollow) { const g = unitMesh.get(camFollow); if (g) rig.focus(g.position.clone(), rig.tgt.zoom); }
  // r12：镜头档位——敌方行动者 / 选中单位（指令·移动）/ 待机
  rig.shot = vPhase === 'enemy' ? (enemyCam.actor ? 'enemy' : 'idle') : selected ? 'unit' : 'idle';
  camStep();
  if (viewCam === camera || viewCam === rig.pcam) { viewCam = baseCam(); if (rig.persp) setOrigCamCut(0.4); }
  skillCamStep();
  { const mc = overlay?.getObjectByName('moveCursor'); if (mc) { const cp = (viewCam as THREE.Camera).position; mc.rotation.y = Math.atan2(cp.x - mc.position.x, cp.z - mc.position.z); mc.position.y = (mc.userData.y0 ??= mc.position.y) + Math.abs(Math.sin(performance.now() / 260)) * 0.12; } }
  aimStep();
  mapObj.update();
  for (const r of rigs.values()) r.update();
  const t = performance.now() / 1000;
  sceneKit.update(rig.cur.yaw, t);
  updateOrigMap(viewCam === skillCam ? skillCam : baseCam());
  for (const u of battle.units) if (u.prop === 'flag' || u.prop === 'speaker') { const g = unitMesh.get(u.id); if (g) (u.prop === 'flag' ? waveFlag : pulseSpeaker)(g, t); }
  updateHitFx(viewCam, world); setSkillFxCamera(viewCam);
  const so = applyShake(viewCam);
  postFx.render(renderer, () => (resultAnim && viewCam === resultCam ? renderResult(renderer) : sdim.render(renderer, scene, viewCam as THREE.PerspectiveCamera)));
  undoShake(viewCam, so);
  refreshLabels();
  requestAnimationFrame(loop);
}

if (params.get('level')) { const lv = params.get('level')!; makeMap = () => levelMap(lv); }
restart();
void initP5tHud(() => refreshAll());
void turnChangeReady(); // P5T 正版 HUD 贴图（有 public/p5t-hud/ 才启用）
loop();

// 调试/截图钩子
declare global { interface Window { __p5t: unknown } }
window.__p5t = {
  get battle() { return battle; },
  get world() { return world; },
  get scene() { return scene; },
  renderer,
  origTone,
  THREE,
  sceneKit,
  renderInfo() { return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, texs: renderer.info.memory.textures, origLoading, origStats, gimmickCount, placeholderCount, lastSparkKind }; },
  get busy() { return busy; },
  get charsReady() { return charsReady(); },
  get started() { return started; },
  rigs,
  unitMesh,
  camera,
  get jokerModel() { return rigs.size > 0; },
  chars: { preloadChar, makeChar },
  /** 截图用特写机位：从单位前方 ang 弧度方向、距离 dist 看它（null 还原俯视） */
  portrait(id: string | null, ang = 0, dist = 2.2, h = 0.9) {
    if (!id) { viewCam = baseCam(); return; }
    const g = unitMesh.get(id); if (!g) return;
    const c = g.position.clone().add(new THREE.Vector3(0, 0.55, 0));
    aimCam.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight); aimCam.fov = 40;
    aimCam.position.copy(c).add(new THREE.Vector3(Math.sin(ang) * dist, h, Math.cos(ang) * dist));
    aimCam.lookAt(c); aimCam.updateProjectionMatrix(); viewCam = aimCam;
  },
  banner,
  summonCutIn,
  turnChange: (side: 'ally' | 'enemy', speed = 1) => playTurnChange(side, speed),
  cmdMenu,
  resultNext() { resultCtl?.next(); },
  showResult: (won = true) => showResult({ type: 'result', outcome: won ? 'won' : 'lost', turn: battle.turn, crowns: battle.crowns(won ? 'won' : 'lost'), reason: '' } as never),
  /** P5T 正版 HUD 截图钩子 */
  p5,
  fx: {
    oneMore: (id = 'joker') => oneMoreFx(battle.unit(id)),
    pop: (id: string, text: string) => popDamage(id, text),
    skillHit: (id: string, skill = 'eiha', speed = SPEED) => { const g = unitMesh.get(id); return g ? (hasOrigSkillFx(skill) ? origSkillHit : skillHit)(world, g.position.clone(), skill, rigs.get(id)?.height ?? 1.1, speed) : null; },
    aimShot: (a: string, t: string, ret = true) => aimShot(a, t, ret),
    endAim: (ms = 0) => endAim(ms),
  },
  /** r7 对齐检查：在原版场景上叠格子（白=可走 青=半掩体 蓝=全掩体 红=墙，数字=引擎层） */
  gridOverlay(on = true) {
    world.getObjectByName('gridOverlay')?.removeFromParent();
    if (!on) return;
    const g = new THREE.Group(); g.name = 'gridOverlay';
    const col: Record<string, number> = { wall: 0xff2030, half: 0x30e0ff, full: 0x2050ff, exit: 0x30ff60 };
    const edge = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.8, depthTest: false });
    for (let y = 0; y < battle.map.height; y++) for (let x = 0; x < battle.map.width; x++) {
      const t = battle.grid.tile({ x, y });
      const q = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ color: col[t] ?? 0xffffff, transparent: true, opacity: t === 'floor' ? 0.25 : 0.55, depthTest: false, depthWrite: false }));
      q.rotation.x = -Math.PI / 2; q.position.copy(w2v({ x, y }, 0.04)); q.renderOrder = 50; g.add(q);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)), edge); e.rotation.x = -Math.PI / 2; e.position.copy(q.position); e.renderOrder = 51; g.add(e);
    }
    world.add(g);
  },
  setMode(m: Mode) { mode = m; refreshAll(); },
  setSkill(id: string) { mode = 'skill'; skillId = id; refreshAll(); },
  /** r10：打开原版技能列表 / 列表里移光标 / 确定 / 返回 */
  openSkills() { openSkillList(); },
  skillCursor(id: string) { skillList['hooks'].onHover(id); },
  skillPick() { const s = skillList.current; if (s) skillList['hooks'].onPick(s.id); },
  skillBack() { if (skillPhase === 'target') openSkillList(); else { endSkillFlow(); refreshAll(); } },
  get skillPhase() { return skillPhase; },
  tap: onTap,
  /** r17 验收：某单位在当前画面里的剪影——同一机位各渲染一次「有/无该单位」，返回两张 PNG dataURL（差分即剪影，含红描边壳） */
  maskOf(id: string) {
    const g = unitMesh.get(id); if (!g) return null;
    const cam = viewCam as THREE.PerspectiveCamera;
    const sh: THREE.Object3D[] = []; g.traverse((o) => { if (o.castShadow) { sh.push(o); o.castShadow = false; } }); // 影子不算剪影
    renderer.render(scene, cam); const a = renderer.domElement.toDataURL('image/png');
    g.visible = false; renderer.render(scene, cam); const b = renderer.domElement.toDataURL('image/png'); g.visible = true;
    for (const o of sh) o.castShadow = true;
    return { a, b };
  },
  /** r17 机位标定：改 AIM_CAM 后按当前射手/目标重摆过肩机位，返回剪影图对 + 目标投影 */
  aimTune(cfg: Partial<typeof AIM_CAM> & { yawOff?: number; clipT?: number }) {
    const { yawOff, clipT, ...cc } = cfg; Object.assign(AIM_CAM, cc); if (aimIds.length < 2) return null;
    if (clipT != null) { const r = rigs.get(aimIds[0]) as unknown as { gunLoopAt?: (k: number) => void }; r.gunLoopAt?.(clipT); } // r17c：GunLoop 取帧（0..1 归一化）
    if (yawOff != null) { const r = rigs.get(aimIds[0]) as unknown as { setYaw?: (y: number) => void }; const a = unitMesh.get(aimIds[0])!.position, t = unitMesh.get(aimIds[1])!.position; r.setYaw?.(Math.atan2(t.x - a.x, t.z - a.z) + yawOff * Math.PI / 180); }
    const { pos, look } = aimPose(aimIds[0], aimIds[1]); aimAnim = null;
    aimCam.position.copy(pos); aimCam.fov = AIM_CAM.fov; aimCam.lookAt(look); aimCam.updateProjectionMatrix(); aimCam.updateMatrixWorld(true); aimLook.copy(look);
    const tg = unitMesh.get(aimIds[1])!, th = rigs.get(aimIds[1])?.height ?? 1.1; const tv = tg.position.clone().add(new THREE.Vector3(0, th / 2, 0)).project(aimCam);
    const rr = rigs.get(aimIds[0]) as unknown as { baseKey?: string; oneShot?: string; cur?: THREE.AnimationAction };
    return { m: (this as { maskOf: (id: string) => unknown }).maskOf(aimIds[0]), tgt: [(tv.x + 1) / 2, (1 - tv.y) / 2], st: [rr?.baseKey, rr?.oneShot, rr?.cur?.getClip().name] };
  },
  /** r17b 标定：开火镜头终点（FIRE_CAM）按 cfg 直接摆好，返回射手/目标剪影图对 */
  fireTune(cfg: Partial<typeof FIRE_CAM> & { lookDy?: number; fov?: number }) {
    if (!lastFire) return null; const { lookDy, fov, ...cc } = cfg; Object.assign(FIRE_CAM, cc); if (lookDy != null) FIRE_CAM.lookDy = lookDy; if (fov != null) FIRE_CAM.fov = fov;
    const { p1, look } = fireEnd(lastFire.aid, lastFire.p0, lastFire.look); aimAnim = null; viewCam = aimCam;
    aimCam.position.copy(p1); aimCam.fov = FIRE_CAM.fov; aimCam.updateProjectionMatrix(); aimCam.lookAt(look);
    const self = this as { maskOf: (id: string) => unknown }; return { a: self.maskOf(lastFire.aid), t: lastFire.tid ? self.maskOf(lastFire.tid) : null };
  },
  /** r17b 标定：正面特写机位（FRONT_CAM）按 cfg 摆好，返回射手剪影图对 */
  frontTune(aid: string, tid: string, cfg: Partial<typeof FRONT_CAM>) {
    Object.assign(FRONT_CAM, cfg); const r = frontPose(aid, tid); if (!r) return null; aimAnim = null; viewCam = aimCam;
    aimCam.position.copy(r.pos); aimCam.fov = FRONT_CAM.fov; aimCam.lookAt(r.look); aimCam.updateProjectionMatrix();
    return (this as { maskOf: (id: string) => unknown }).maskOf(aid);
  },
  aimCardRects() { return Array.from(document.querySelectorAll("#aim .aimcard")).map((e) => { const r = e.getBoundingClientRect(); return { cls: e.className, x: r.x, y: r.y, w: r.width, h: r.height }; }); },
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
