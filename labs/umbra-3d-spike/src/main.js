import * as THREE from 'three';
import { SHARED } from './toon.js';
import { buildArena, blobShadow } from './scene.js';
import { loadDae, loadPyro, aim, twist } from './chars.js';
import { Hud } from './hud.js';

const P = new URLSearchParams(location.search);
const SHOT = P.get('shot') || 'clip';
const FIXED_T = P.has('t') ? +P.get('t') : null;
const NOHUD = P.has('nohud');

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3)); // 按设备像素比渲染，不发糊
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 200);
const arena = buildArena(scene);
const hud = new Hud(document.getElementById('hud'));

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
  camera.aspect = w / h; camera.updateProjectionMatrix(); hud.resize(w, h);
}
window.addEventListener('resize', resize);

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
// 斩击弧
const slash = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.25, 48, 1, 0, Math.PI * 1.2), new THREE.MeshBasicMaterial({ color: 0x38c8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, fog: false }));
const slash2 = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.1, 48, 1, 0, Math.PI * 1.2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, fog: false }));
slash.scale.setScalar(0.75); slash2.scale.setScalar(0.75); scene.add(slash, slash2);
// 指令簇红色爆发底板：放进 3D，画在 Joker 身后（原作 Joker 压在爆发图案之上）
const burst = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 420; const g = c.getContext('2d'); g.translate(256, 210);
  const star = (R, r, n, rot, col) => { g.fillStyle = col; g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i / (n * 2) * Math.PI * 2; const rr = i % 2 ? r : R * (0.7 + 0.3 * Math.abs(Math.sin(i * 1.7))); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.82); } g.closePath(); g.fill(); };
  star(250, 70, 22, 0, '#e60012'); star(120, 40, 16, 0.3, '#000');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.9), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false })); m.visible = false; scene.add(m); return m; })();

async function load() {
  const [joker, skull, jf, jf2, pyro] = await Promise.all([
    loadDae('joker', '/models/joker/joker.dae', { height: 1.72, outline: 0.9 }),
    loadDae('skull', '/models/skull/skull.dae', { height: 1.74, outline: 0.9 }),
    loadDae('jackfrost', '/models/jackfrost/jackfrost.dae', { yaw: -Math.PI / 2, height: 1.2, outline: 1.2, shadeTint: 0x8e9ae0, rim: 0.3 }),
    loadDae('jackfrost', '/models/jackfrost/jackfrost.dae', { yaw: -Math.PI / 2, height: 0.95, outline: 1.2, shadeTint: 0x8e9ae0, rim: 0.3 }),
    loadPyro({ height: 1.55 }),
  ]);
  Object.assign(L, { joker, skull, jf, jf2, pyro });
  for (const k of Object.keys(L)) { const c = L[k]; scene.add(c.holder); const s = blobShadow(k === 'pyro' ? 0.7 : 0.55); c.holder.add(s); }
  scene.add(knife);
  pyro.mixer.clipAction(pyro.clips.idle_00).play();
  // 站位（世界）：队伍 z>0，敌人 z<0
  joker.holder.position.set(-0.5, 0, 2.6); skull.holder.position.set(-1.6, 0, 1.0);
  jf.holder.position.set(2.9, 0, -0.6); jf2.holder.position.set(1.2, 0, -2.3); pyro.holder.position.set(4.8, 0, -1.9);
  face(joker, jf.holder.position); face(skull, jf.holder.position);
  face(jf, W(1.2, 0, 6)); face(jf2, W(0.5, 0, 6)); face(pyro, W(1.5, 0, 5));
  window.__info = { bones: Object.fromEntries(Object.entries(L).map(([k, c]) => [k, c.rest.size])) };
}
function face(c, target) { const p = c.holder.position; c.holder.rotation.y = Math.atan2(target.x - p.x, target.z - p.z); }

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

// —— 镜头 ——
const SHOTS = {
  // 待机全景：低机位在队伍身后偏右，看向敌群（参考 f017）
  idle: (t) => ({ pos: W(2.55 + Math.sin(t * 0.3) * 0.25, 0.62, 2.3), tgt: W(2.9, 0.95, -1.8), fov: 50 }),
  // 指令菜单：Joker 背后偏左过肩（参考 f029）
  menu: (t) => ({ pos: W(-0.4 - t * 0.04, 1.5, 5.95), tgt: W(1.8, 0.95, 0.4), fov: 52 }),
  // 出招：侧后方看 Joker 冲向杰克霜精（参考 f033）
  attack: (t) => ({ pos: W(-0.3, 1.3, 5.7), tgt: W(2.0, 0.9, 0.2), fov: 52 }),
  lineup: () => ({ pos: W(0, 2.2, 9), tgt: W(0, 0.9, 0), fov: 50 }),
};

function stateAt(t) {
  if (SHOT !== 'clip') return { shot: SHOT, lt: t };
  if (t < 2.6) return { shot: 'idle', lt: t };
  if (t < 5.0) return { shot: 'menu', lt: t - 2.6 };
  return { shot: 'attack', lt: t - 5.0 };
}

const clock = { t0: performance.now() };
let lastT = 0;
function frame(t) {
  const st = stateAt(t);
  const dt = Math.max(0, Math.min(0.1, t - lastT)); lastT = t;
  const { joker, skull, jf, jf2, pyro } = L;
  if (!joker) return;
  if (joker.baseY === undefined) for (const c of Object.values(L)) c.baseY = c.inner.position.y;
  // 攻击时间轴（attack 镜头内 lt）
  const at = st.shot === 'attack' ? (SHOT === 'attack' && FIXED_T !== null ? FIXED_T : st.lt) : -1;
  const lunge = at < 0 ? 0 : ease((at - 0.15) / 0.45) * (1 - ease((at - 2.0) / 0.6));
  const swing = at < 0 ? 0 : ease((at - 0.55) / 0.22);
  // Joker 位移
  const home = W(-0.5, 0, 2.6), strike = W(0.4, 0, 1.9);
  joker.holder.position.lerpVectors(home, strike, lunge);
  face(joker, jf.holder.position);
  const armsIdle = { R: [[-0.45, -0.75, 0.45], [-0.1, -0.35, 0.95]], L: [[0.42, -0.85, 0.2], [0.25, -0.75, 0.6]] };
  const armsWind = { R: [[-0.85, 0.35, -0.35], [-0.6, 0.75, 0.1]], L: [[0.6, -0.45, 0.6], [0.3, -0.2, 0.95]] };
  const armsFollow = { R: [[0.55, -0.35, 0.75], [0.85, -0.45, 0.25]], L: [[0.5, -0.8, -0.2], [0.3, -0.9, 0.2]] };
  let arms = armsIdle;
  if (at >= 0) {
    const wnd = ease((at - 0.1) / 0.4);
    const mix = (A, B, k) => ({ R: A.R.map((v, i) => v.map((x, j) => x + (B.R[i][j] - x) * k)), L: A.L.map((v, i) => v.map((x, j) => x + (B.L[i][j] - x) * k)) });
    arms = swing > 0 ? mix(armsWind, armsFollow, swing) : mix(armsIdle, armsWind, wnd);
    if (at > 2.0) arms = mix(armsFollow, armsIdle, ease((at - 2.0) / 0.6));
  }
  humanPose(joker, t, { stance: 0.2, lean: 0.12 + lunge * 0.25, crouch: 0.4 + lunge * 0.4, lunge: lunge * 0.35, turn: at >= 0 ? (-0.5 + swing * 1.0) * (1 - ease((at - 2) / 0.6)) : -0.15, arms, lead: 'L' });
  humanPose(skull, t, { ph: 1.3, stance: 0.24, lean: 0.06, crouch: 0.15, arms: { R: [[-0.3, -0.9, 0.3], [-0.05, -0.2, 1]], L: [[0.3, -0.9, 0.1], [0.2, -0.85, 0.4]] }, lead: 'R' });
  // 刀：贴右手
  const hand = joker.bone('hdR', 'Bip01 R Hand'), fa = joker.bone('faR', 'Bip01 R Forearm');
  if (hand && fa) {
    const hp = hand.getWorldPosition(new THREE.Vector3()), fp = fa.getWorldPosition(new THREE.Vector3());
    const dir = hp.clone().sub(fp).normalize();
    knife.position.copy(hp).addScaledVector(dir, 0.07);
    knife.quaternion.setFromUnitVectors(W(0, 1, 0), dir.clone().lerp(charDir(joker, 0, -0.3, 1).normalize(), 0.5).normalize());
  }
  // 斩击弧
  const so = at < 0 ? 0 : Math.max(0, 1 - Math.abs(at - 0.75) / 0.3);
  slash.material.opacity = so * 0.9; slash2.material.opacity = so;
  slash.position.copy(joker.holder.position).add(W(0, 1.05, 0)); slash2.position.copy(slash.position);
  slash.rotation.set(-1.2, joker.holder.rotation.y, -0.6 - swing * 1.2); slash2.rotation.copy(slash.rotation);
  // 敌人
  const hit = at < 0 ? 0 : Math.max(0, 1 - Math.abs(at - 0.85) / 0.35);
  for (const [c, ph] of [[jf, 0], [jf2, 1.7]]) {
    c.resetPose();
    const bob = Math.abs(Math.sin(t * 3.2 + ph)) * 0.06;
    c.inner.position.y = c.baseY + bob;
    const sw = Math.sin(t * 3.2 + ph) * 0.35;
    const b = (k, n) => c.bone(k, n);
    aim(b('uaR', 'Bip01 R UpperArm'), b('faR', 'Bip01 R Forearm'), charDir(c, -0.8, 0.2 + sw, 0.3));
    aim(b('uaL', 'Bip01 L UpperArm'), b('faL', 'Bip01 L Forearm'), charDir(c, 0.8, 0.5 - sw, 0.2));
  }
  if (hit > 0) {
    jf.setFlash(hit * 0.8, 0xffffff);
    jf.holder.position.set(2.9 + hit * 0.15, 0, -0.6 - hit * 0.2); jf.holder.rotation.z = 0;
    twist(jf.bone('sp', 'Bip01 Spine'), charDir(jf, 1, 0, 0), -hit * 0.5);
  } else { jf.setFlash(0); jf.holder.position.set(2.9, 0, -0.6); }
  pyro.mixer.setTime(t % pyro.clips.idle_00.duration);
  burst.visible = st.shot === 'menu' && !NOHUD;
  // 相机
  const sh = SHOTS[st.shot](st.lt);
  let pos = sh.pos, tgt = sh.tgt;
  if (st.shot === 'attack') { const k = ease((at - 0.2) / 1.0); pos = pos.clone().lerp(W(0.1, 1.2, 4.9), k * 0.4); tgt = tgt.clone().lerp(W(2.4, 0.95, -0.4), k * 0.4); if (hit > 0) pos.x += Math.sin(t * 80) * 0.03 * hit; }
  camera.position.copy(pos); camera.fov = sh.fov; camera.updateProjectionMatrix(); camera.lookAt(tgt);
  camera.updateMatrixWorld();
  if (burst.visible) { const k = Math.min(1, st.lt / 0.18); const jp = joker.holder.position; const away = jp.clone().sub(camera.position).setY(0).normalize(); burst.position.copy(jp).addScaledVector(away, 0.35).setY(0.95); burst.quaternion.copy(camera.quaternion); burst.scale.setScalar(0.5 + 0.5 * k); }
  SHARED.lightDir.value.copy(W(-0.5, 0.9, 0.6)).normalize().transformDirection(camera.matrixWorldInverse);
  arena.update(t);
  renderer.render(scene, camera);
  if (!NOHUD) hud.update(st.shot, st.lt, camera, { joker, jf, at, hit });
}

window.__render = (t) => frame(t);
load().then(async () => {
  resize();
  await document.fonts.ready;
  await new Promise((r) => setTimeout(r, 1500)); // 贴图到位
  if (FIXED_T !== null) { frame(FIXED_T); frame(FIXED_T); document.title = 'ready'; return; }
  document.title = 'ready';
  const loop = () => { frame((performance.now() - clock.t0) / 1000 % 8); requestAnimationFrame(loop); };
  loop();
}).catch((e) => { console.error(e); document.title = 'ready'; });
