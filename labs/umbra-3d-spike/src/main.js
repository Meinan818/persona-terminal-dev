import * as THREE from 'three';
import { SHARED } from './toon.js';
import { buildArena, blobShadow } from './scene.js';
import { loadDae, loadPyro, aim, twist } from './chars.js';
import { Hud } from './hud.js';
import { pickTier, TIERS, ORDER, Governor } from './tiers.js';
import { Post } from './post.js';
import { Director } from './camera.js';
import { ActorAnim, MODELS, loadGlb, glbOverrides, segAt } from './anim.js';

const P = new URLSearchParams(location.search);
const SHOT = P.get('shot') || 'clip';
const FIXED_T = P.has('t') ? +P.get('t') : null;
const NOHUD = P.has('nohud');
let tier = pickTier(P);

// 雾色压暗（原作背景近黑藏青）
SHARED.fogCol.value.set(0x050820); SHARED.fogNear.value = 12; SHARED.fogFar.value = 40;

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 200);
const arena = buildArena(scene, tier);
const post = new Post(renderer, scene, camera, tier);
const hud = new Hud(document.getElementById('hud'));

function resize() {
  const w = window.innerWidth, h = window.innerHeight, dpr = Math.min(window.devicePixelRatio || 1, tier.dprCap);
  renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
  camera.aspect = w / h; camera.updateProjectionMatrix(); hud.resize(w, h); post.setSize(w, h, dpr); arena.resize(w, h, dpr);
}
window.addEventListener('resize', resize);
function setTier(t) { tier = t; post.setTier(t); arena.setTier(t); resize(); window.__tier = t.name; console.log('tier', t.name); }

// —— 战斗事件时间轴（8 秒循环）。镜头、动作、HUD 都由这些事件驱动 ——
const EVENTS = [
  { t: 0.0, name: 'battle:start' },
  { t: 2.6, name: 'turn:menu' },
  { t: 4.7, name: 'cmd:confirm' },
  { t: 5.0, name: 'attack:launch' },
  { t: 5.85, name: 'attack:hit' },
  { t: 6.9, name: 'attack:end' },
];
const SHOT_OFFSET = { idle: 0, menu: 2.6, attack: 5.0, wide: 6.9 };
const HITSTOP = { t: 5.85, dur: 0.07 }; // 命中顿帧：角色动作时间冻结 70ms，镜头照常震
const director = new Director(EVENTS);
// 每个角色的语义动作轨（有真动作就播真动作，否则回落程序化姿态）
const TRACKS = {
  joker: [{ t: 0, role: 'idle' }, { t: 5.0, role: 'attack' }, { t: 7.3, role: 'idle' }],
  skull: [{ t: 0, role: 'idle' }],
  jf: [{ t: 0, role: 'idle' }, { t: 5.85, role: 'hit' }, { t: 6.5, role: 'idle' }],
  jf2: [{ t: 0, role: 'idle' }],
  pyro: [{ t: 0, role: 'idle' }],
};
// 动作接入自测：?animtest=1 让 Pyro Jack 依次播 idle → attack → hit（验证语义切换 + 交叉淡入）
if (P.has('animtest')) TRACKS.pyro = [{ t: 0, role: 'idle' }, { t: 5.0, role: 'attack' }, { t: 6.5, role: 'hit' }];

const W = (x, y, z) => new THREE.Vector3(x, y, z);
const L = {}; // actors
const knife = new THREE.Group();
{
  const blade = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.24, 4), new THREE.MeshBasicMaterial({ color: 0xd8dde6 }));
  blade.scale.z = 0.3; blade.position.y = 0.16; knife.add(blade);
  const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.09, 6), new THREE.MeshBasicMaterial({ color: 0x1a1a1a }));
  knife.add(hilt);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 0.02), new THREE.MeshBasicMaterial({ color: 0x777777 })); guard.position.y = 0.045; knife.add(guard);
}
// 斩击弧（HDR 颜色进 Bloom）
const slash = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.25, 48, 1, 0, Math.PI * 1.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x38c8ff).multiplyScalar(1.15), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, fog: false }));
const slash2 = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.1, 48, 1, 0, Math.PI * 1.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(1.3), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, fog: false }));
slash.scale.setScalar(0.75); slash2.scale.setScalar(0.75); scene.add(slash, slash2);
// 命中火花（放射线）
const spark = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.translate(128, 128);
  for (let i = 0; i < 18; i++) { g.rotate(Math.PI * 2 / 18 + (i % 3) * 0.05); g.fillStyle = i % 2 ? '#fff' : '#9fe8ff'; g.beginPath(); g.moveTo(0, -4); g.lineTo(60 + (i * 37 % 60), 0); g.lineTo(0, 4); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(1, 1, 1).multiplyScalar(1.4), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); scene.add(m); return m; })();
// 指令簇红色爆发底板：放进 3D，画在 Joker 身后（原作 Joker 压在爆发图案之上）
const burst = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 420; const g = c.getContext('2d'); g.translate(256, 210);
  const star = (R, r, n, rot, col) => { g.fillStyle = col; g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i / (n * 2) * Math.PI * 2; const rr = i % 2 ? r : R * (0.7 + 0.3 * Math.abs(Math.sin(i * 1.7))); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.82); } g.closePath(); g.fill(); };
  star(250, 70, 22, 0, '#e60012'); star(120, 40, 16, 0.3, '#000');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.9), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false })); m.visible = false; scene.add(m); return m; })();

const OVR = glbOverrides(P);
async function loadActor(id, fallback, opt) {
  const url = OVR[id] || (MODELS[id] && MODELS[id].glb);
  if (url) { try { return await loadGlb(id, url, opt); } catch (e) { console.warn('GLB 加载失败，回落', id, e.message); } }
  return fallback();
}
async function load() {
  const [joker, skull, jf, jf2, pyro] = await Promise.all([
    loadActor('joker', () => loadDae('joker', '/models/joker/joker.dae', { height: 1.72, outline: 0.9 }), { height: 1.72, outline: 0.9 }),
    loadActor('skull', () => loadDae('skull', '/models/skull/skull.dae', { height: 1.74, outline: 0.9 }), { height: 1.74, outline: 0.9 }),
    loadActor('jackfrost', () => loadDae('jackfrost', '/models/jackfrost/jackfrost.dae', { yaw: -Math.PI / 2, height: 1.2, outline: 1.2, shadeTint: 0x8e9ae0, rim: 0.35 }), { yaw: -Math.PI / 2, height: 1.2, outline: 1.2, shadeTint: 0x8e9ae0, rim: 0.35 }),
    loadDae('jackfrost', '/models/jackfrost/jackfrost.dae', { yaw: -Math.PI / 2, height: 0.95, outline: 1.2, shadeTint: 0x8e9ae0, rim: 0.35 }),
    loadActor('pyrojack', async () => { const c = await loadPyro({ height: 1.55 }); c.anim = new ActorAnim(c.root, c.root.animations, 'test_pyro'); return c; }, { height: 1.55, outline: 1.1, clipKey: 'test_pyro', mapUrl: '/models/pyrojack/tex_dvl_mdl_jackolantern_alb.png', shadeTint: 0x6058a0 }),
  ]);
  Object.assign(L, { joker, skull, jf, jf2, pyro });
  for (const k of Object.keys(L)) { const c = L[k]; scene.add(c.holder); const s = blobShadow(k === 'pyro' ? 0.7 : 0.55); c.holder.add(s); }
  scene.add(knife);
  joker.holder.position.set(-0.5, 0, 2.6); skull.holder.position.set(-1.6, 0, 1.0);
  jf.holder.position.set(2.9, 0, -0.6); jf2.holder.position.set(1.2, 0, -2.3); pyro.holder.position.set(4.8, 0, -1.9);
  face(joker, jf.holder.position); face(skull, jf.holder.position);
  face(jf, W(1.2, 0, 6)); face(jf2, W(0.5, 0, 6)); face(pyro, W(1.5, 0, 5));
  window.__info = { tier: tier.name, anim: Object.fromEntries(Object.entries(L).map(([k, c]) => [k, c.anim ? c.anim.report() : 'procedural'])) };
}
function face(c, target) { const p = c.holder.position; c.holder.rotation.y = Math.atan2(target.x - p.x, target.z - p.z); }
/** 有真动作就播（返回 true），没有就交给程序化姿态 */
function playClip(c, key, TA) { if (!c.anim) return false; const s = segAt(TRACKS[key], TA); if (!c.anim.has(s.seg.role)) return false; c.anim.pose(s.seg, s.prev && c.anim.has(s.prev.role) ? s.prev : null, s.blend); return true; }

// —— 程序化姿态（骨骼驱动；原作战斗动作 GAP 不在模型包里）——
const ease = (x) => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
function charDir(c, x, y, z) { return W(x, y, z).applyQuaternion(c.holder.quaternion); }
function humanPose(c, t, o = {}) {
  c.resetPose();
  const b = (k, ...n) => c.bone(k, ...n);
  const pel = b('pel', 'Bip01 Pelvis', 'Bip01_Pelvis'), sp = b('sp', 'Bip01 Spine', 'Bip01_Spine'), sp1 = b('sp1', 'Bip01 Spine1', 'Bip01_Spine1');
  const head = b('head', 'Bip01 Head', 'Bip01_Head'), neck = b('neck', 'Bip01 Neck', 'Bip01_Neck');
  const side = (s) => s === 'R' ? -1 : 1; // 角色坐标：+x 为角色左手
  const breathe = Math.sin(t * 2.2 + (o.ph || 0)) * 0.025;
  const up = W(0, 1, 0);
  for (const s of ['L', 'R']) {
    const th = b('th' + s, `Bip01 ${s} Thigh`), ca = b('ca' + s, `Bip01 ${s} Calf`), ft = b('ft' + s, `Bip01 ${s} Foot`);
    const st = o.stance ?? 0.16;
    const fwd = s === (o.lead || 'L') ? 0.18 : -0.12;
    aim(th, ca, charDir(c, side(s) * st, -1, fwd + (o.lunge || 0) * (s === (o.lead || 'L') ? 0.7 : -0.5)));
    aim(ca, ft, charDir(c, side(s) * st * 0.6, -1, fwd * 0.2 - 0.08 - (o.crouch || 0) * 0.3));
  }
  if (sp) twist(sp, charDir(c, 1, 0, 0), 0.10 + (o.lean || 0) + breathe);
  if (sp && o.turn) twist(sp, up, o.turn);
  for (const s of ['L', 'R']) {
    const ua = b('ua' + s, `Bip01 ${s} UpperArm`), fa = b('fa' + s, `Bip01 ${s} Forearm`), hd = b('hd' + s, `Bip01 ${s} Hand`);
    const arm = (o.arms && o.arms[s]) || null;
    if (arm) { aim(ua, fa, charDir(c, ...arm[0])); aim(fa, hd, charDir(c, ...arm[1])); }
    else {
      aim(ua, fa, charDir(c, side(s) * 0.32, -0.94, 0.05 + breathe));
      aim(fa, hd, charDir(c, side(s) * 0.18, -0.8, 0.45));
    }
  }
  if (head && o.look) twist(head, up, o.look);
  if (pel && o.bob) c.inner.position.y = c.baseY + o.bob;
}


function phaseAt(T) { return T < 2.6 ? 'idle' : T < 4.7 ? 'menu' : 'attack'; }
function globalT(t) { return SHOT === 'clip' ? t : (SHOT_OFFSET[SHOT] || 0) + t; }

let lastT = 0;
function frame(t) {
  const T = globalT(t);
  const { joker, skull, jf, jf2, pyro } = L;
  if (!joker) return;
  if (joker.baseY === undefined) for (const c of Object.values(L)) c.baseY = c.inner.position.y;
  const TA = T - Math.min(Math.max(T - HITSTOP.t, 0), HITSTOP.dur); // 顿帧后的动作时间
  const phase = phaseAt(T);
  const at = T >= 4.7 ? TA - 5.0 : -1;
  const atk = at >= 0 ? at : -1;
  const lunge = atk < 0 ? 0 : ease((atk - 0.15) / 0.45) * (1 - ease((atk - 2.0) / 0.6));
  const swing = atk < 0 ? 0 : ease((atk - 0.55) / 0.22);
  const home = W(-0.5, 0, 2.6), strike = W(0.4, 0, 1.9);
  joker.holder.position.lerpVectors(home, strike, lunge);
  face(joker, jf.holder.position);
  if (!playClip(joker, 'joker', TA)) {
    const armsIdle = { R: [[-0.45, -0.75, 0.45], [-0.1, -0.35, 0.95]], L: [[0.42, -0.85, 0.2], [0.25, -0.75, 0.6]] };
    const armsWind = { R: [[-0.85, 0.35, -0.35], [-0.6, 0.75, 0.1]], L: [[0.6, -0.45, 0.6], [0.3, -0.2, 0.95]] };
    const armsFollow = { R: [[0.55, -0.35, 0.75], [0.85, -0.45, 0.25]], L: [[0.5, -0.8, -0.2], [0.3, -0.9, 0.2]] };
    let arms = armsIdle;
    if (atk >= 0) {
      const wnd = ease((atk - 0.1) / 0.4);
      const mix = (A, B, k) => ({ R: A.R.map((v, i) => v.map((x, j) => x + (B.R[i][j] - x) * k)), L: A.L.map((v, i) => v.map((x, j) => x + (B.L[i][j] - x) * k)) });
      arms = swing > 0 ? mix(armsWind, armsFollow, swing) : mix(armsIdle, armsWind, wnd);
      if (atk > 2.0) arms = mix(armsFollow, armsIdle, ease((atk - 2.0) / 0.6));
    }
    humanPose(joker, TA, { stance: 0.2, lean: 0.12 + lunge * 0.25, crouch: 0.4 + lunge * 0.4, lunge: lunge * 0.35, turn: atk >= 0 ? (-0.5 + swing * 1.0) * (1 - ease((atk - 2) / 0.6)) : -0.15, arms, lead: 'L' });
  }
  if (!playClip(skull, 'skull', TA)) humanPose(skull, TA, { ph: 1.3, stance: 0.24, lean: 0.06, crouch: 0.15, arms: { R: [[-0.3, -0.9, 0.3], [-0.05, -0.2, 1]], L: [[0.3, -0.9, 0.1], [0.2, -0.85, 0.4]] }, lead: 'R' });
  const hand = joker.bone('hdR', 'Bip01 R Hand'), fa = joker.bone('faR', 'Bip01 R Forearm');
  if (hand && fa) {
    const hp = hand.getWorldPosition(new THREE.Vector3()), fp = fa.getWorldPosition(new THREE.Vector3());
    const dir = hp.clone().sub(fp).normalize();
    knife.position.copy(hp).addScaledVector(dir, 0.07);
    knife.quaternion.setFromUnitVectors(W(0, 1, 0), dir.clone().lerp(charDir(joker, 0, -0.3, 1).normalize(), 0.5).normalize());
  }
  const so = atk < 0 ? 0 : Math.max(0, 1 - Math.abs(atk - 0.75) / 0.3);
  slash.material.opacity = so * 0.9; slash2.material.opacity = so;
  slash.position.copy(joker.holder.position).add(W(0, 1.05, 0)); slash2.position.copy(slash.position);
  slash.rotation.set(-1.2, joker.holder.rotation.y, -0.6 - swing * 1.2); slash2.rotation.copy(slash.rotation);
  const hit = atk < 0 ? 0 : Math.max(0, 1 - Math.abs(atk - 0.85) / 0.35);
  for (const [c, ph, key] of [[jf, 0, 'jf'], [jf2, 1.7, 'jf2']]) {
    if (playClip(c, key, TA)) continue;
    c.resetPose();
    const bob = Math.abs(Math.sin(TA * 3.2 + ph)) * 0.06;
    c.inner.position.y = c.baseY + bob;
    const sw = Math.sin(TA * 3.2 + ph) * 0.35;
    const b = (k, n) => c.bone(k, n);
    aim(b('uaR', 'Bip01 R UpperArm'), b('faR', 'Bip01 R Forearm'), charDir(c, -0.8, 0.2 + sw, 0.3));
    aim(b('uaL', 'Bip01 L UpperArm'), b('faL', 'Bip01 L Forearm'), charDir(c, 0.8, 0.5 - sw, 0.2));
  }
  if (hit > 0) {
    jf.setFlash(hit * 0.8, 0xffffff);
    jf.holder.position.set(2.9 + hit * 0.15, 0, -0.6 - hit * 0.2);
    twist(jf.bone('sp', 'Bip01 Spine'), charDir(jf, 1, 0, 0), -hit * 0.5);
  } else { jf.setFlash(0); jf.holder.position.set(2.9, 0, -0.6); }
  // 火花
  const sk = atk < 0 ? 0 : Math.max(0, 1 - Math.abs(atk - 0.88) / 0.18);
  spark.material.opacity = sk; spark.position.copy(jf.holder.position).add(W(-0.2, 0.75, 0.35)); spark.scale.setScalar(0.6 + (atk - 0.7) * 2.5);
  if (!playClip(pyro, 'pyro', TA) && pyro.mixer) pyro.mixer.setTime(TA % 2);
  burst.visible = phase === 'menu' && !NOHUD;
  // 相机：事件编排
  const fx = director.apply(camera, T, {});
  if (burst.visible) { const lt = T - 2.6; const k = Math.min(1, lt / 0.18); const jp = joker.holder.position; const away = jp.clone().sub(camera.position).setY(0).normalize(); burst.position.copy(jp).addScaledVector(away, 0.35).setY(0.95); burst.quaternion.copy(camera.quaternion); burst.scale.setScalar(0.5 + 0.5 * k); }
  spark.quaternion.copy(camera.quaternion);
  SHARED.lightDir.value.copy(W(-0.5, 0.9, 0.6)).normalize().transformDirection(camera.matrixWorldInverse);
  arena.update(T);
  const hitFlash = T >= HITSTOP.t && T < HITSTOP.t + 0.06 ? 0.22 : 0;
  post.frame(T, { blurX: fx.blurX, flash: hitFlash, flashCol: 0xffffff, bloomBoost: 1 + sk * 0.25 });
  if (!NOHUD) hud.update(phase, phase === 'menu' ? T - 2.6 : T, camera, { joker, jf, at, hit });
  lastT = T;
}

window.__render = (t) => frame(t);
window.__setTier = (n) => setTier(TIERS[n]);
load().then(async () => {
  resize();
  await document.fonts.ready;
  await new Promise((r) => setTimeout(r, 1500));
  if (FIXED_T !== null) { const a = performance.now(); frame(FIXED_T); renderer.getContext().finish(); const b = performance.now(); frame(FIXED_T); renderer.getContext().finish(); console.log('frame ms', Math.round(b - a), Math.round(performance.now() - b)); window.__info.render = 'ok'; document.title = 'ready'; return; }
  document.title = 'ready';
  const gov = new Governor(() => { const i = ORDER.indexOf(tier.name); if (i < ORDER.length - 1) setTier(TIERS[ORDER[i + 1]]); });
  const t0 = performance.now(); let prev = t0;
  const loop = () => { const now = performance.now(); gov.sample(now - prev); prev = now; frame((now - t0) / 1000 % 8); requestAnimationFrame(loop); };
  loop();
}).catch((e) => { console.error(e); document.title = 'ready'; });
