// P3R 风「召唤器举枪召唤 + 玻璃碎裂」实时演出试样（three.js）。页面：/p3r-summon（= p3r-summon.html）。
// 不含任何 P3R 解包素材：场景/特效/枪模全程序化；人物与人格面具用工程现有占位模型（Joker / Pyro Jack / Jack Frost）。
// 时间轴对齐参考视频 108246 召唤段（见 P3R-SUMMON-REPORT.md「时间轴」）。URL：?t=秒（固定帧）、?tier=high|mid|low、?nohud、?sfx=1、?loop=0。
import * as THREE from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import { SHARED } from '../toon.js';
import { loadDae, loadPyro, aim, twist } from '../chars.js';
import { blobShadow } from '../scene.js';
import { pickTier, TIERS, ORDER, Governor } from '../tiers.js';
import { Post } from '../post.js';
import { buildArena } from './arena.js';
import { Shatter } from './shatter.js';
import { makeEvoker, makeBlueFlame, makePillar, makeDebris, makeWings, makeFireball, smooth } from './fx.js';
import { Sfx } from './sfx.js';

const P = new URLSearchParams(location.search);
const FIXED_T = P.has('t') ? +P.get('t') : null;
const NOHUD = P.has('nohud');
let tier = pickTier(P);

// —— 时间轴（秒）。参考 108246：B 段 24.30 特写→24.67 扣扳机→25.23 显形→26.50 出招→~28.3 回战斗；A 段 11.87 压暗→13.23 碎裂→14.00 回场 ——
export const TL = {
  dim: 1.0,        // 场景压暗（A 11.87–12.17）
  close: 1.25,     // 硬切：举枪抵太阳穴特写（B 24.30–24.63）
  shatter: 1.85,   // 扣扳机前一帧硬切碎裂（A 13.23 / B 24.67）
  shardLife: 0.8,  // v2：碎片总时长（A 13.23–13.97 ≈ 0.75s），之后硬切低机位显形镜头
  reveal: 2.65,    // v2：硬切到低机位显形（召唤者左下、面具右上；B 25.23）
  slowEnd: 0.42,   // 碎片慢动作结束（本地时间）
  attack: 3.70,    // 甩镜 → 面具出招（B 26.50）
  hit: 3.90,       // 命中闪光（B 26.67）
  weak: 4.30,      // WEAK（B 27.20）
  back: 5.50,      // 回战斗视角（B ~28.3）
  end: 8.0,
};
const FREEZE = TL.shatter - 1 / 30;

SHARED.fogCol.value.set(0x03121a); SHARED.fogNear.value = 14; SHARED.fogFar.value = 42;
SHARED.rimCol.value.set(0x7fd8ff);

// —— P3R 调色：黑位冷青、中间调偏青蓝、蓝/青加饱和、红略收，高光偏冷白 ——
export function p3rGrade([r, g, b]) {
  const sc = (x) => { const k = 1.18, m = 0.45; return x < m ? m * Math.pow(x / m, k) : 1 - (1 - m) * Math.pow((1 - x) / (1 - m), k); };
  r = sc(r); g = sc(g); b = sc(b);
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
  if (d > 1e-5) { if (mx === r) h = ((g - b) / d + 6) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; } h *= 60;
  const near = (a, c, w) => Math.max(0, 1 - Math.min(Math.abs(a - c), 360 - Math.abs(a - c)) / w);
  const satK = 1.08 + 0.25 * near(h, 205, 50) + 0.18 * near(h, 230, 40) - 0.05 * near(h, 0, 30);
  r = l + (r - l) * satK; g = l + (g - l) * satK; b = l + (b - l) * satK;
  const sh = Math.pow(1 - Math.min(1, l * 1.7), 2.2);
  r = r * (1 - sh * 0.5) + 0.01 * sh; g = g * (1 - sh * 0.5) + 0.045 * sh; b = b * (1 - sh * 0.4) + 0.085 * sh;
  const hi = Math.max(0, l - 0.7) / 0.3; r = r * (1 - hi * 0.04); b = b + hi * 0.02;
  return [r, g, b].map((x) => Math.min(1, Math.max(0, x * 0.95)));
}

// —— 渲染器 / 场景 ——
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace; app.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.03, 200);
const arena = buildArena(scene, tier);
const shatter = new Shatter(renderer, tier.name);
const state = { shatterOn: false, shatterLT: 0, snapKey: '', impactUv: new THREE.Vector2(0.4, 0.6) };

/** 自定义场景 Pass：正常渲染场景；碎裂期间在同一个 HDR 缓冲上再叠碎玻璃（之后统一 Bloom + 调色） */
class SummonPass extends Pass {
  constructor() { super(); this.needsSwap = false; }
  render(r, writeBuffer, readBuffer) {
    r.setRenderTarget(this.renderToScreen ? null : readBuffer); r.clear();
    r.render(scene, camera);
    if (state.shatterOn) shatter.render(r);
  }
}
const post = new Post(renderer, scene, camera, tier, { lutFn: p3rGrade, renderPass: new SummonPass() });

// —— HUD（DOM，P3R 风格自制，不用原作贴图/字体）——
const hudEl = document.getElementById('hud');
hudEl.innerHTML = `<style>
@font-face{font-family:R5D;src:url(/hud/r5-latin-display.woff2)}
#hud{position:fixed;inset:0;pointer-events:none;overflow:hidden;color:#fff;font-family:R5D,Impact,sans-serif}
#hud .skill{position:absolute;left:4.5%;top:5.5%;padding:.35em 3.2em .35em 1.2em;background:linear-gradient(90deg,#1a3cff,#2a70ff 70%,rgba(40,120,255,.0));clip-path:polygon(0 0,100% 0,94% 100%,0 100%);font-size:calc(1.15vw + 8px);letter-spacing:.12em;transform-origin:0 50%;box-shadow:inset 0 -2px 0 #9fe6ff}
#hud .skill i{font-style:normal;color:#9fe6ff;margin-right:.6em;font-size:.7em}
#hud .tgt{position:absolute;width:0;height:0}
#hud .tgt b{position:absolute;left:-14px;top:-30px;width:28px;height:22px;background:#ffd23a;clip-path:polygon(0 0,100% 0,50% 100%);filter:drop-shadow(0 0 4px #ff8a00)}
#hud .weak{position:absolute;font-style:italic;font-size:calc(3.2vw + 10px);color:#c8f6ff;-webkit-text-stroke:2px #0a1c6a;text-shadow:3px 3px 0 #0a1c6a,0 0 12px #4ab8ff;transform-origin:50% 60%;white-space:nowrap}
#hud .weak small{display:block;font-size:.45em;color:#fff;text-align:right;-webkit-text-stroke:1px #0a1c6a}
#hud .cue{position:absolute;right:1%;top:1%;font:11px monospace;color:#7fe;opacity:.8;text-align:right;white-space:pre}
</style><div class="skill"><i>PERSONA</i>AGI</div><div class="tgt"><b></b></div><div class="weak">WEAK!<small>113</small></div><div class="cue"></div>`;
const H = { skill: hudEl.querySelector('.skill'), tgt: hudEl.querySelector('.tgt'), weak: hudEl.querySelector('.weak'), cue: hudEl.querySelector('.cue') };
if (NOHUD) hudEl.style.display = 'none';
const sfx = new Sfx(P.get('sfx') === '1');
if (!P.has('cues')) H.cue.style.display = 'none';

// —— 演员 ——
const L = {};
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const S0 = V(-1.6, 0, 2.3), E0 = V(2.1, 0, -1.3), E2 = V(3.4, 0, 0.6);
const FWD = E0.clone().sub(S0).setY(0).normalize();
const RT = FWD.clone().cross(UP).normalize(); // 召唤者自己的右手方向
const evoker = makeEvoker(); scene.add(evoker);
const flame = makeBlueFlame(tier); scene.add(flame.group);
const pillar = makePillar(); scene.add(pillar.mesh);
const debris = makeDebris(tier); scene.add(debris.group);
const wings = makeWings(tier); scene.add(wings.group);
const fire = makeFireball(tier); scene.add(fire.group);

async function load() {
  const [joker, jf, jf2, pyro] = await Promise.all([
    loadDae('joker', '/models/joker/joker.dae', { height: 1.72, outline: 0.9 }),
    loadDae('jackfrost', '/models/jackfrost/jackfrost.dae', { yaw: -Math.PI / 2, height: 1.1, outline: 1.2, shadeTint: 0x6e9ad0, rim: 0.35 }),
    loadDae('jackfrost', '/models/jackfrost/jackfrost.dae', { yaw: -Math.PI / 2, height: 0.95, outline: 1.2, shadeTint: 0x6e9ad0, rim: 0.35 }),
    loadPyro({ height: 2.1 }),
  ]);
  Object.assign(L, { joker, jf, jf2, pyro });
  for (const k of ['joker', 'jf', 'jf2']) { scene.add(L[k].holder); L[k].holder.add(blobShadow(0.55)); }
  scene.add(pyro.holder);
  joker.holder.position.copy(S0); face(joker, E0);
  jf.holder.position.copy(E0); face(jf, S0); jf2.holder.position.copy(E2); face(jf2, S0);
  for (const c of Object.values(L)) c.baseY = c.inner.position.y;
  // 人格面具（Pyro Jack 占位）：更强边缘光 + 冷色暗部
  pyro.root.traverse((o) => { if (o.isMesh && o.material.uniforms && o.material.uniforms.rimStr) { o.material.uniforms.rimStr.value = 0.9; o.material.uniforms.shadeTint.value.set(0x4050b0); } });
  const names = Object.keys(pyro.clips);
  pyro.act = {
    idle: pyro.mixer.clipAction(pyro.clips[names.find((n) => /idle|wait/i.test(n)) || names[0]]),
    attack: pyro.mixer.clipAction(pyro.clips[names.find((n) => /attack|skill/i.test(n)) || names[0]]),
  };
  window.__info = { tier: tier.name, pyroClips: names, shards: 0 };
  if (P.has('meshes')) { const ms = []; joker.root.traverse((o) => { if (o.isMesh && o.visible) ms.push(o.name + ':' + o.geometry.attributes.position.count); }); window.__info.meshes = ms; }
  if (P.has('hide')) { const re = new RegExp(P.get('hide'), 'i'); joker.root.traverse((o) => { if (o.isMesh && re.test(o.name)) { o.visible = false; if (o.userData.outline) o.userData.outline.visible = false; } }); }
}
function face(c, target) { const p = c.holder.position; c.holder.rotation.y = Math.atan2(target.x - p.x, target.z - p.z); }
function charDir(c, x, y, z) { return V(x, y, z).applyQuaternion(c.holder.quaternion); }
const CURL = +(P.get('curl') ?? 1.2);
const wp = (o) => o.getWorldPosition(new THREE.Vector3());

/** 两段 IK：让 ua→fa→hd 的手腕落到 target，肘部朝 pole 方向 */
function ik2(ua, fa, hd, target, pole) {
  ua.updateMatrixWorld(true);
  const s = wp(ua), e0 = wp(fa), h0 = wp(hd);
  const a = s.distanceTo(e0), b = e0.distanceTo(h0);
  const to = target.clone().sub(s); const d = Math.min(Math.max(to.length(), Math.abs(a - b) + 1e-3), a + b - 1e-3); const u = to.normalize();
  const x = (a * a - b * b + d * d) / (2 * d), hh = Math.sqrt(Math.max(a * a - x * x, 0));
  const pp = pole.clone().sub(u.clone().multiplyScalar(pole.dot(u))).normalize();
  const elbow = s.clone().addScaledVector(u, x).addScaledVector(pp, hh);
  aim(ua, fa, elbow.clone().sub(s));
  aim(fa, hd, target.clone().sub(wp(fa)));
}

// —— 召唤者姿态 v2：关键帧动画（用 Joker 现有骨骼）——
// 每条通道是 [时间, 值] 关键帧，Catmull-Rom 插值（纯 T 函数）。通道驱动举枪/抬肘/扣扳机后坐/仰头/弓背/屈膝/左臂张开；
// 外套下摆、披肩、头发用二级运动（脚下蓝焰的上升气流 + 举枪和扣扳机两次冲量的阻尼振荡），作用在模型自带的布料/头发骨骼链上。
function kf(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  const n = keys.length; if (t >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0; while (t > keys[i + 1][0]) i++;
  const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
  const vp = i > 0 ? keys[i - 1][1] : v0, vn = i + 2 < n ? keys[i + 2][1] : v1;
  const tp = i > 0 ? keys[i - 1][0] : t0 - (t1 - t0), tn = i + 2 < n ? keys[i + 2][0] : t1 + (t1 - t0);
  const u = (t - t0) / (t1 - t0), dt = t1 - t0;
  const m0 = (v1 - vp) / (t1 - tp) * dt, m1 = (vn - v0) / (tn - t0) * dt;
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * m1;
}
const TRIG = TL.shatter + 0.015; // 扣扳机（碎裂硬切当帧之后，给显形镜头里的后坐）
const KF = {
  raise:  [[0, 0], [TL.dim, 0], [TL.dim + 0.2, 1.06], [TL.dim + 0.3, 1], [TL.attack + 0.55, 1], [TL.attack + 1.15, 0]],
  elbow:  [[0, 0], [TL.dim, 0], [TL.dim + 0.25, 1], [TL.shatter - 0.02, 1.05], [TRIG + 0.04, 1.35], [TRIG + 0.5, 1.1], [TL.attack + 0.6, 1], [TL.attack + 1.1, 0]],
  recoil: [[0, 0], [TRIG - 0.01, 0], [TRIG + 0.025, 1], [TRIG + 0.12, 0.78], [TRIG + 0.4, 0.42], [TRIG + 0.95, 0.22], [TL.attack + 0.4, 0.1], [TL.back, 0]],
  headUp: [[0, 0], [TL.dim, 0], [TL.dim + 0.3, -0.12], [TL.shatter - 0.02, -0.14], [TRIG + 0.06, 0.06], [TRIG + 0.45, 0.32], [TL.attack - 0.1, 0.36], [TL.attack + 0.6, 0.05], [TL.back, 0]],
  lean:   [[0, 0], [TL.dim, 0], [TL.dim + 0.3, 0.03], [TRIG, 0.03], [TRIG + 0.08, 0.16], [TRIG + 0.7, 0.11], [TL.attack + 0.6, 0.02], [TL.back, 0]],
  knee:   [[0, 0.05], [TL.dim, 0.05], [TL.dim + 0.3, 0.28], [TRIG, 0.3], [TRIG + 0.1, 0.5], [TRIG + 0.8, 0.38], [TL.back, 0.12]],
  armL:   [[0, 0.1], [TL.dim, 0.1], [TL.dim + 0.3, 0.5], [TRIG, 0.55], [TRIG + 0.1, 0.85], [TRIG + 1.0, 0.65], [TL.back + 0.5, 0.15]],
  twistS: [[0, 0], [TL.dim, 0], [TL.dim + 0.3, -0.12], [TRIG, -0.12], [TRIG + 0.1, -0.2], [TL.attack, -0.12], [TL.back, 0]],
};
// 阻尼振荡冲量（举枪、扣扳机）
const IMPULSES = [[TL.dim + 0.05, 0.6], [TRIG, 1.0], [TL.attack + 0.6, 0.4]];
function impulse(T, w = 13, d = 4.5) { let v = 0; for (const [t0, a] of IMPULSES) { const x = T - t0; if (x > 0) v += a * Math.exp(-x * d) * Math.sin(x * w); } return v; }
function windAt(T) { return T < TL.close ? 0 : T < TL.shatter ? 0.45 + 0.3 * smooth((T - TL.close) / 0.5) : T < TL.back ? 1 : Math.max(0, 1 - (T - TL.back) / 0.6); }
const CLOTH = [
  // [骨骼名前缀, 段数, 轴(char 局部), 方向符号, 幅度]
  ['b r b_jacket0', 3, 'x', 1, 0.35], ['b l b_jacket0', 3, 'x', 1, 0.35],
  ['b r f_jacket0', 3, 'x', -1, 0.6], ['b l f_jacket0', 3, 'x', -1, 0.6],
  ['b l fs_jacket0', 3, 'z', 1, 0.8], ['b r fs_jacket0', 3, 'z', -1, 0.8],
  ['b l mant0', 4, 'z', 1, 0.5], ['b r mant0', 4, 'z', -1, 0.5],
  ['b l suso01', 1, 'z', 1, 0.6], ['b r suso01', 1, 'z', -1, 0.6],
];
const HAIR = ['b b_hair01', 'b b_hair02', 'b b_hair03', 'b b_hair04', 'b r_hair01', 'b r_hair03', 'b r_hair05', 'b r_hair07', 'b l_hair01', 'b l_hair03', 'b l_hair05', 'b l_hair07', 'b f_hair01x', 'b f_hair03', 'b f_hair05', 'b f_hair07', 'b f_Ahair01', 'b f_Ahair03', 'b f_Ahair05'];

function posePlayer(T) {
  const c = L.joker; c.resetPose();
  const b = (k, n) => c.bone(k, n);
  const K = Object.fromEntries(Object.entries(KF).map(([k, v]) => [k, kf(v, T)]));
  const breathe = Math.sin(T * 2.2) * 0.02;
  const imp = impulse(T), wind = windAt(T);
  c.inner.position.y = c.baseY - K.knee * 0.07;
  // 腿：分开站，屈膝（扣扳机时一沉）
  for (const s of ['L', 'R']) {
    const sd = s === 'R' ? -1 : 1;
    aim(b('th' + s, `Bip01 ${s} Thigh`), b('ca' + s, `Bip01 ${s} Calf`), charDir(c, sd * (0.22 + K.knee * 0.12), -1, (s === 'L' ? 0.12 : -0.1) + K.knee * 0.55));
    aim(b('ca' + s, `Bip01 ${s} Calf`), b('ft' + s, `Bip01 ${s} Foot`), charDir(c, sd * 0.14, -1, -0.06 - K.knee * 0.45));
  }
  const sp = b('sp', 'Bip01 Spine'), sp1 = b('sp1', 'Bip01 Spine1'), head = b('head', 'Bip01 Head'), neck = b('neck', 'Bip01 Neck');
  const arm = Math.max(0, Math.min(1.1, K.raise));
  // 脊柱：扣扳机后弓背后仰 + 上身转向枪侧
  twist(sp, charDir(c, 1, 0, 0), 0.06 + breathe - K.lean - K.recoil * 0.05);
  twist(sp, UP, K.twistS);
  if (sp1) twist(sp1, charDir(c, 0, 0, 1), -K.recoil * 0.06 + imp * 0.02);
  // 左手：攥拳，向外张（紧绷），扣扳机时甩开
  aim(b('uaL', 'Bip01 L UpperArm'), b('faL', 'Bip01 L Forearm'), charDir(c, 0.3 + K.armL * 0.45, -0.9 + K.armL * 0.15, 0.05 + K.armL * 0.1));
  aim(b('faL', 'Bip01 L Forearm'), b('hdL', 'Bip01 L Hand'), charDir(c, 0.25 + K.armL * 0.3, -0.85, 0.25));
  const fL1 = b('fL1', 'Bip01 L Finger1'), fL4 = b('fL4', 'Bip01 L Finger4');
  if (fL1 && fL4) { const ax = wp(fL4).sub(wp(fL1)).normalize(); for (const n of ['1', '2', '3', '4']) for (const seg of ['', '1', '2']) { const fb = b('fL' + n + seg, `Bip01 L Finger${n}${seg}`); if (fb) twist(fb, ax, -CURL * (seg === '' ? 1.1 : 1.3)); } }
  // 头：举枪时低头 → 扣扳机后被「打」偏 + 慢慢仰起
  const tremble = T > TL.close && T < TL.shatter ? Math.sin(T * 47) * 0.006 : 0;
  if (neck) twist(neck, charDir(c, 1, 0, 0), -K.headUp * 0.4);
  if (head) {
    twist(head, charDir(c, 1, 0, 0), -K.headUp * 0.6 + tremble);
    twist(head, charDir(c, 0, 0, 1), arm * 0.07 + K.recoil * 0.3);
  }
  c.root.updateMatrixWorld(true);
  const ua = b('uaR', 'Bip01 R UpperArm'), fa = b('faR', 'Bip01 R Forearm'), hd = b('hdR', 'Bip01 R Hand');
  const hp = wp(head);
  const temple = hp.clone().addScaledVector(UP, 0.085).addScaledVector(charDir(c, -1, 0, 0), 0.095).addScaledVector(charDir(c, 0, 0, 1), 0.02);
  // 枪：举起时枪管朝头内；扣扳机后坐 = 枪口上扬 + 稍离开太阳穴
  const gunZ = charDir(c, 1, 0.0 + K.recoil * 0.35, 0.05).normalize();
  const downZ = charDir(c, -0.1, -0.6, 0.8).normalize();
  const z = downZ.clone().lerp(gunZ, Math.min(1, arm)).normalize();
  const yv = UP.clone().lerp(charDir(c, 0, 0.3, -1).normalize(), (1 - Math.min(1, arm)) * 0.6).normalize();
  const xv = yv.clone().cross(z).normalize(); const y2 = z.clone().cross(xv).normalize();
  const gunAtTemple = temple.clone().addScaledVector(z, -0.16 - K.recoil * 0.035).addScaledVector(y2, -0.03).addScaledVector(UP, K.recoil * 0.025);
  const gripOff = (zz, yy) => zz.clone().multiplyScalar(-0.02).addScaledVector(yy, -0.045);
  const handAt = gunAtTemple.clone().add(gripOff(z, y2)).addScaledVector(charDir(c, -1, 0, 0), 0.02);
  const handRest = wp(ua).addScaledVector(UP, -0.55).addScaledVector(charDir(c, -1, 0, 0), 0.12).addScaledVector(charDir(c, 0, 0, 1), 0.12);
  const target = handRest.clone().lerp(handAt, Math.min(1, arm));
  // 肘：举枪时向外上抬（原作肘外张），扣扳机时再顶一下
  ik2(ua, fa, hd, target, charDir(c, -0.75, -0.6 + K.elbow * 1.65, -0.1 - K.elbow * 0.15).normalize());
  c.root.updateMatrixWorld(true);
  const f1 = b('f1', 'Bip01 R Finger1'), f4 = b('f4', 'Bip01 R Finger4');
  if (f1 && f4) {
    const ax = wp(f4).sub(wp(f1)).normalize();
    for (const n of ['1', '2', '3', '4']) for (const seg of ['', '1', '2']) { const fb = b('fR' + n + seg, `Bip01 R Finger${n}${seg}`); if (fb) twist(fb, ax, CURL * (seg === '' ? 1.1 : 1.3) + (n === '1' && T >= TRIG && T < TRIG + 0.08 ? 0.3 : 0)); }
    const th = b('fR0', 'Bip01 R Finger0'); if (th) twist(th, ax, CURL * 0.4);
  }
  // 二级运动：外套 / 披肩 / 下摆（气流上扬 + 冲量振荡），逐段相位递增 = 布料波
  const CF = P.get('cloth') ? new RegExp(P.get('cloth')) : null;
  for (const [pre, nSeg, axis, sg, amp] of CLOTH) {
    if (CF && !CF.test(pre)) continue;
    const ax = axis === 'x' ? charDir(c, 1, 0, 0) : charDir(c, 0, 0, 1);
    for (let i = 1; i <= nSeg; i++) {
      const bn = b('cl:' + pre + i, nSeg === 1 ? pre : pre + i); if (!bn) continue;
      const ph = i * 0.9 + (pre.includes(' l ') ? 0 : 1.3);
      const lift = wind * (0.16 + 0.08 * Math.sin(T * 9.5 + ph) + 0.04 * Math.sin(T * 17 + ph * 2)) + imp * 0.16 + K.recoil * 0.06;
      twist(bn, ax, sg * amp * lift * (i === 1 ? 1 : 0.7));
    }
  }
  // 头发：上升气流吹起 + 扣扳机甩动
  const hx = charDir(c, 1, 0, 0);
  if (!P.has('nohair')) HAIR.forEach((n, i) => { const bn = b('h:' + n, n); if (!bn) return; const ph = i * 0.7; twist(bn, hx, (n.includes('_f') || n.includes(' f') ? -1 : 1) * (wind * (0.1 + 0.07 * Math.sin(T * 11 + ph)) + imp * 0.18)); });
  c.root.updateMatrixWorld(true);
  const hpos = wp(hd);
  evoker.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xv, y2, z));
  const gunAtHand = hpos.clone().sub(gripOff(z, y2));
  evoker.position.copy(gunAtHand).lerp(gunAtTemple, Math.min(1, arm) * 0.85);
  evoker.updateMatrixWorld(true);
  return { temple, head: hp, K };
}

// —— 人格面具 ——
function personaBase(T) {
  const appear = smooth((T - TL.shatter) / 0.5);
  const lunge = smooth((T - TL.attack + 0.05) / 0.3) * (1 - smooth((T - TL.back + 0.6) / 0.6)); // 出招：人格面具越过召唤者头顶前冲
  return S0.clone().addScaledVector(FWD, lunge * 2.0).addScaledVector(RT, -lunge * 0.4).add(V(0, -lunge * 0.55, 0)).addScaledVector(FWD, -1.1).addScaledVector(RT, -1.2).add(V(0, 0.9 + appear * 0.6 + Math.sin(T * 1.6) * 0.05, 0));
}
function posePersona(T) {
  const c = L.pyro;
  const vis = T >= TL.shatter && T < TL.back;
  c.holder.visible = vis;
  const out = { vis, k: 0 };
  if (!vis) return out;
  const fadeOut = smooth((T - TL.back + 0.35) / 0.35);
  c.holder.position.copy(personaBase(T));
  // v2：显形段转成 3/4 侧身（朝画面左），后掠翼才能在低机位里展开成剪影（对 B 25.40）；出招时转回朝敌
  const side34 = 1 - smooth((T - TL.attack + 0.1) / 0.2);
  const fdir = FWD.clone().multiplyScalar(1 - side34 * 0.35).addScaledVector(RT, -side34 * 1.25 - 0.15).normalize();
  face(c, c.holder.position.clone().add(fdir));
  const sc = 1.05 + 0.3 * smooth((T - TL.shatter) / 0.45);
  const lungeS = smooth((T - TL.attack + 0.05) / 0.3);
  c.holder.scale.setScalar(sc * (1 - fadeOut * 0.3) * (1 - 0.22 * lungeS));
  // 显形：白 → 蓝 → 本色；消散：变蓝白
  const lt = T - TL.shatter;
  const fl = lt < 0.25 ? 1 : lt < 0.7 ? 1 - smooth((lt - 0.25) / 0.45) : 0;
  c.setFlash(Math.max(fl * 0.95, fadeOut * 0.9), fl > 0.5 ? 0xffffff : 0x8fd0ff);
  // 动作：显形=idle，出招=attack
  const atk = T >= TL.attack;
  for (const a of Object.values(c.act)) a.stop();
  const a = atk ? c.act.attack : c.act.idle; a.reset().play();
  c.mixer.setTime(atk ? Math.min(T - TL.attack + 0.15, a.getClip().duration - 0.01) : (lt % a.getClip().duration));
  out.k = 1 - fadeOut;
  return out;
}

function poseEnemies(T) {
  for (const [c, ph, pos] of [[L.jf, 0, E0], [L.jf2, 1.7, E2]]) {
    c.resetPose();
    const hitLT = T - TL.hit;
    const isMain = c === L.jf;
    const b = (k, n) => c.bone(k, n);
    const bob = Math.abs(Math.sin(T * 3.2 + ph)) * 0.05;
    c.inner.position.y = c.baseY + bob;
    const sw = Math.sin(T * 3.2 + ph) * 0.35;
    aim(b('uaR', 'Bip01 R UpperArm'), b('faR', 'Bip01 R Forearm'), charDir(c, -0.8, 0.2 + sw, 0.3));
    aim(b('uaL', 'Bip01 L UpperArm'), b('faL', 'Bip01 L Forearm'), charDir(c, 0.8, 0.5 - sw, 0.2));
    c.holder.position.copy(pos); c.holder.rotation.x = 0; c.holder.rotation.z = 0; face(c, S0);
    if (isMain && hitLT >= 0) {
      const kb = smooth(hitLT / 0.25);
      c.holder.position.addScaledVector(FWD, kb * 0.6);
      const down = smooth((hitLT - 0.45) / 0.35);
      c.inner.position.y = c.baseY + Math.sin(Math.min(hitLT, 0.4) / 0.4 * Math.PI) * 0.25;
      c.holder.rotateX(-down * 1.25);
      c.setFlash(hitLT < 0.5 ? 0.85 * (1 - hitLT / 0.5) : 0, hitLT < 0.1 ? 0xffffff : 0xff7a2a);
      twist(b('sp', 'Bip01 Spine'), charDir(c, 1, 0, 0), -kb * 0.5);
    } else c.setFlash(0);
  }
}

// —— 镜头（硬切 + 推 + 甩镜 + 震屏；纯函数） ——
const cl = (x) => Math.max(0, Math.min(1, x));
const noise = (t, s) => Math.sin(t * 37.1 + s) * 0.5 + Math.sin(t * 61.7 + s * 2.3) * 0.3 + Math.sin(t * 97.3 + s * 4.1) * 0.2;
function shotBattle(T, k = 0) {
  const pos = S0.clone().addScaledVector(FWD, -2.5).addScaledVector(RT, 1.05 - T * 0.05).add(V(0, 1.42, 0));
  const tgt = E0.clone().addScaledVector(RT, -0.4).add(V(0, 0.75, 0));
  pos.lerp(S0.clone().add(V(0, 1.4, 0)), k * 0.18);
  return { pos, tgt, fov: 44 - k * 4, roll: 0 };
}
function shotClose(T, ctx) {
  // v2：正面居中（原作 B 24.45：镜头正对召唤者，头在上三分之一，举枪手在画面左上）
  const lt = T - TL.close;
  const h = ctx.head.clone();
  const pos = h.clone().addScaledVector(FWD, 1.6 - lt * 0.14).addScaledVector(RT, 0.04).add(V(0, -0.02, 0));
  const tgt = h.clone().add(V(0, -0.22, 0)).addScaledVector(RT, 0.06);
  return { pos, tgt, fov: 40, roll: -0.02 + lt * 0.02 };
}
function shotShatterBG(T) {
  // v2：碎片后面的镜头（原作 A 13.40）：正面中景，召唤者居中、脚下冰晶蓝焰，人格面具在侧后方浮现，背景压到深蓝黑
  const lt = T - TL.shatter;
  const pos = S0.clone().addScaledVector(FWD, 4.8 - lt * 0.35).add(V(0, 1.2 - lt * 0.1, 0));
  const tgt = S0.clone().addScaledVector(FWD, -0.4).addScaledVector(RT, -0.45).add(V(0, 2.0, 0));
  return { pos, tgt, fov: 50, roll: 0.0 };
}
function shotReveal(T) {
  // v2：低机位仰拍，召唤者压在左下，人格面具在右上（原作 B 25.40）
  const lt = T - TL.reveal;
  const pc = personaBase(T);
  const pos = S0.clone().addScaledVector(FWD, 2.7 - lt * 0.12).addScaledVector(RT, -2.7 + lt * 0.08).add(V(0, 0.25 + lt * 0.05, 0));
  const tgt = S0.clone().lerp(pc, 0.6).setY(2.3 + lt * 0.1);
  return { pos, tgt, fov: 54 - lt * 2, roll: 0.03 };
}
function shotAttack(T) {
  const lt = T - TL.attack;
  // v2：先宽（左远处召唤者+人格面具前冲，右中敌人），命中后快速推近火球（原作 B 26.60 → 26.90 火团占满画面）
  const wide = E0.clone().addScaledVector(FWD, -4).addScaledVector(RT, 5).add(V(0, 0.4, 0));
  const near = E0.clone().addScaledVector(FWD, -3.6).addScaledVector(RT, 3.1).add(V(0, 0.5, 0));
  const kin = smooth((T - TL.hit + 0.02) / 0.32);
  const pos = wide.clone().lerp(near, kin);
  const tgtWide = E0.clone().lerp(S0, 0.4).setY(1.0);
  const tgtNear = E0.clone().addScaledVector(FWD, -0.15).add(V(0, 1.0, 0));
  const tgtEnd = tgtWide.clone().lerp(tgtNear, kin);
  // 甩镜：0.2s 内视线从人格面具甩到敌人
  const tgtStart = personaBase(TL.attack).add(V(0, 1.6, 0));
  const k = cl(lt / 0.2); const kk = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const da = tgtStart.clone().sub(pos).normalize(), db = tgtEnd.clone().sub(pos).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(da, db); const qk = new THREE.Quaternion().slerp(q, kk);
  const tgt = pos.clone().add(da.applyQuaternion(qk).multiplyScalar(6));
  return { pos, tgt, fov: 60 - kin * 8, roll: -0.06 * (1 - kk) + 0.02 };
}
function shotReturn(T) {
  const lt = T - TL.back;
  const pos = S0.clone().addScaledVector(FWD, -3.4 - lt * 0.08).addScaledVector(RT, -1.5 - lt * 0.05).add(V(0, 1.85, 0));
  const tgt = S0.clone().lerp(E0.clone().lerp(E2, 0.4), 0.62).add(V(0, 0.55, 0));
  return { pos, tgt, fov: 50, roll: 0 };
}
function cameraAt(T, ctx) {
  let p;
  if (T < TL.close) p = shotBattle(T, smooth((T - TL.dim) / 0.25));
  else if (T < TL.shatter) p = shotClose(T, ctx);
  else if (T < TL.reveal) p = shotShatterBG(T);
  else if (T < TL.attack) p = shotReveal(T);
  else if (T < TL.back) p = shotAttack(T);
  else p = shotReturn(T);
  // 震屏：碎裂 + 命中
  let sh = 0; const lsh = T - TL.shatter, lh = T - TL.hit;
  if (lsh >= 0 && lsh < 0.35) sh = Math.max(sh, 0.03 * Math.pow(1 - lsh / 0.35, 2));
  if (lh >= 0 && lh < 0.45) sh = Math.max(sh, 0.06 * Math.pow(1 - lh / 0.45, 2));
  if (sh) { p.pos.x += noise(T, 1) * sh; p.pos.y += noise(T, 7) * sh * 0.7; p.tgt.x += noise(T, 3) * sh * 0.5; }
  if (lh >= 0 && lh < 0.3) p.fov -= 4 * Math.sin(lh / 0.3 * Math.PI);
  return p;
}
const DBG = P.get('dbgcam'); // 调试：front|side 固定机位看召唤者动作
function applyCam(p) {
  if (DBG) { const d = DBG === 'side' ? RT.clone().multiplyScalar(-3.2) : FWD.clone().multiplyScalar(3.2); p = { pos: S0.clone().add(d).add(V(0, 1.1, 0)), tgt: S0.clone().add(V(0, 1.0, 0)), fov: 45, roll: 0 }; } camera.position.copy(p.pos); camera.fov = p.fov; camera.updateProjectionMatrix(); camera.lookAt(p.tgt); camera.rotateZ(p.roll); camera.updateMatrixWorld(); }

// —— 世界状态（T 的纯函数） ——
function setWorld(T) {
  const ctx = posePlayer(T);
  const pers = posePersona(T);
  poseEnemies(T);
  const p = cameraAt(T, ctx); applyCam(p);
  // 场景压暗：压暗 → 特写保持偏暗 → 显形时最暗（只剩蓝光）→ 出招回到半亮 → 回战斗全亮
  let dim = 1;
  if (T >= TL.dim && T < TL.close) dim = 1 - 0.8 * smooth((T - TL.dim) / 0.22);
  else if (T >= TL.close && T < TL.shatter) dim = 0.55;
  else if (T >= TL.shatter && T < TL.reveal) dim = 0.05;   // v2：碎裂瞬间背景压到深蓝黑（A 13.40）
  else if (T >= TL.reveal && T < TL.attack) dim = 0.22;
  else if (T >= TL.attack && T < TL.back) dim = 0.45;
  else if (T >= TL.back) dim = 0.45 + 0.55 * smooth((T - TL.back) / 0.5);
  arena.update(T, dim);
  SHARED.exposure.value = 0.84 * (0.55 + 0.45 * dim);
  const bgDark = T >= TL.shatter && T < TL.reveal;
  scene.background.set(bgDark ? 0x01030c : 0x02060c);
  SHARED.fogCol.value.set(bgDark ? 0x01030f : 0x03121a); SHARED.fogNear.value = bgDark ? 6 : 14; SHARED.fogFar.value = bgDark ? 12 : 42; if (bgDark) SHARED.exposure.value *= 0.75; SHARED.rimCol.value.set(bgDark ? 0x5aa0ff : 0x7fd8ff);
  // 蓝焰：特写起点燃（扣扳机前已在脚下涌起），显形最旺，出招后减弱，回战斗熄灭
  const fk = T < TL.shatter ? 0 : T < TL.back ? smooth((T - TL.shatter) / 0.15) : Math.max(0, 1 - (T - TL.back) / 0.6); // v2：扣扳机后才从脚下冒出（B 24.75）
  flame.group.position.copy(S0); flame.update(T, fk, camera);
  // 光柱：显形段
  pillar.mesh.position.copy(personaBase(T)).setY(0);
  pillar.update(T, T >= TL.reveal && T < TL.attack ? 0.55 * smooth((T - TL.reveal) / 0.2) * (1 - smooth((T - TL.attack + 0.4) / 0.4)) : 0);
  // 晶翼：显形 0.15s 后展开
  const wo = smooth((T - TL.shatter - 0.15) / 0.7);
  if (pers.vis) { const c = L.pyro; c.holder.updateMatrixWorld(true); wings.group.position.copy(c.holder.position); wings.group.quaternion.copy(c.holder.quaternion); wings.group.scale.setScalar(c.holder.scale.x); }
  wings.update(T, wo, pers.vis ? pers.k : 0);
  // 碎屑 + 羽毛：扣扳机时从太阳穴迸出（特写镜头里看不到，显形镜头里环绕人格面具）
  debris.update(T - TL.shatter, ctx.temple.clone().lerp(personaBase(T).add(V(0, 1.0, 0)), 0.5), 1 - smooth((T - TL.attack + 0.3) / 0.5), camera);
  fire.group.position.copy(E0).addScaledVector(FWD, 0.6).add(FWD.clone().multiplyScalar(3.6).addScaledVector(RT, -3.1).normalize().multiplyScalar(0.7)); // v2：火球包住被击退的敌人（在敌人身后一点，敌人在火团前）
  fire.update(T - TL.hit, camera);
  return { ctx, cam: p };
}

function updateHud(T) {
  if (NOHUD) return;
  const w = window.innerWidth, h = window.innerHeight;
  const sk = (T < TL.dim ? 1 : 0) || (T >= TL.attack && T < TL.back);
  H.skill.style.opacity = sk ? 1 : 0;
  H.skill.style.transform = `scaleX(${T >= TL.attack ? smooth((T - TL.attack) / 0.12) : 1})`;
  const showT = T < TL.dim;
  H.tgt.style.display = showT ? 'block' : 'none';
  if (showT) { const s = E0.clone().add(V(0, 1.35 + Math.abs(Math.sin(T * 5)) * 0.06, 0)).project(camera); H.tgt.style.left = ((s.x + 1) / 2 * w) + 'px'; H.tgt.style.top = ((1 - s.y) / 2 * h) + 'px'; }
  const wl = T - TL.weak;
  H.weak.style.display = wl >= 0 && T < TL.back ? 'block' : 'none';
  if (wl >= 0) {
    const s = E0.clone().add(V(0, 1.2, 0)).project(camera);
    const pop = wl < 0.12 ? 0.4 + 0.9 * smooth(wl / 0.12) : 1.3 - 0.3 * smooth((wl - 0.12) / 0.15);
    H.weak.style.left = ((s.x + 1) / 2 * w - 40) + 'px'; H.weak.style.top = ((1 - s.y) / 2 * h - 60) + 'px';
    H.weak.style.transform = `rotate(-12deg) scale(${pop})`;
  }
  H.cue.textContent = sfx.log.slice(-6).join('\n');
}

// —— 一帧 ——
let size = { w: 1, h: 1, dpr: 1 };
function frame(T) {
  if (!L.joker) return;
  state.shatterOn = !P.has('noshatter') && T >= TL.shatter && T < TL.shatter + TL.shardLife;
  if (state.shatterOn) {
    const key = `${size.w}x${size.h}@${size.dpr}|${tier.name}`;
    if (state.snapKey !== key) {
      // 扣扳机前一帧：完整渲染进快照（HDR），并求太阳穴枪口的屏幕位置作冲击点
      const w0 = setWorld(FREEZE);
      const prevOn = state.shatterOn; state.shatterOn = false;
      renderer.setRenderTarget(shatter.snapRT); renderer.clear(); renderer.render(scene, camera); renderer.setRenderTarget(null);
      state.shatterOn = prevOn;
      const m = evoker.localToWorld(evoker.userData.muzzle.clone()).lerp(w0.ctx.temple, 0.5).project(camera);
      state.impactUv.set((m.x + 1) / 2, (m.y + 1) / 2);
      shatter.build(state.impactUv, size.w / size.h, tier.name);
      state.snapKey = key; window.__info.shards = shatter.count; window.__info.impact = [+state.impactUv.x.toFixed(3), +state.impactUv.y.toFixed(3)];
    }
    shatter.update(T - TL.shatter, TL.shardLife);
  }
  const wv = setWorld(T);
  // 甩镜方向模糊：按视线角速度（同一镜头内；硬切不算）
  let blurX = 0;
  { const prev = cameraAt(Math.max(0, T - 1 / 60), wv.ctx); const a = wv.cam, d1 = a.tgt.clone().sub(a.pos).normalize(), d0 = prev.tgt.clone().sub(prev.pos).normalize();
    if (a.pos.distanceTo(prev.pos) < 0.3) { const yaw = Math.atan2(d1.x, d1.z) - Math.atan2(d0.x, d0.z); blurX = Math.max(-0.06, Math.min(0.06, yaw * 0.9)); if (Math.abs(blurX) < 0.004) blurX = 0; } }
  // 后处理：特写和显形时暗角加重、色差加大；碎裂瞬间白闪
  const lsh = T - TL.shatter;
  const flash = T - TL.hit >= 0 && T - TL.hit < 0.05 ? 0.22 : 0; // v2：碎裂不再白闪（去白雾）
  const close = T >= TL.close && T < TL.attack;
  post.frame(T, { blurX, flash, flashCol: lsh >= 0 && lsh < 0.05 ? 0xd8f4ff : 0xfff0e0, vig: close ? 0.85 : 0.6, ca: close ? 0.0032 : 0.0018, bloomBoost: lsh >= 0 && lsh < 0.8 ? 0.95 : (T >= TL.hit && T < TL.hit + 0.8 ? 0.95 : 1.05) });
  updateHud(T);
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight, dpr = Math.min(window.devicePixelRatio || 1, tier.dprCap);
  size = { w, h, dpr };
  renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
  camera.aspect = w / h; camera.updateProjectionMatrix(); post.setSize(w, h, dpr); arena.resize(w, h, dpr); shatter.setSize(w, h, dpr); state.snapKey = '';
}
window.addEventListener('resize', resize);
function setTier(t) { tier = t; post.setTier(t); arena.setTier(t); resize(); window.__tier = t.name; }

window.__render = (t) => frame(t);
window.__setTier = (n) => setTier(TIERS[n]);
window.__TL = TL;
load().then(async () => {
  resize();
  await document.fonts.ready;
  await new Promise((r) => setTimeout(r, 1200));
  if (FIXED_T !== null) { const a = performance.now(); frame(FIXED_T); renderer.getContext().finish(); console.log('frame ms', Math.round(performance.now() - a)); document.title = 'ready'; return; }
  document.title = 'ready';
  const gov = new Governor(() => { const i = ORDER.indexOf(tier.name); if (i < ORDER.length - 1) setTier(TIERS[ORDER[i + 1]]); });
  const loop = P.get('loop') !== '0';
  const t0 = performance.now(); let prev = t0, prevT = 0;
  const tick = () => {
    const now = performance.now(); gov.sample(now - prev); prev = now;
    let T = (now - t0) / 1000; T = loop ? T % TL.end : Math.min(T, TL.end - 0.001);
    sfx.tick(prevT, T); prevT = T;
    frame(T); requestAnimationFrame(tick);
  };
  tick();
}).catch((e) => { console.error(e); document.title = 'ready'; });
