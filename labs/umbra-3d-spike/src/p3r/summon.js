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
const wings = makeWings(); scene.add(wings.group);
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

// —— 召唤者姿态 ——
function posePlayer(T) {
  const c = L.joker; c.resetPose();
  const b = (k, n) => c.bone(k, n);
  const breathe = Math.sin(T * 2.2) * 0.02;
  // 腿：站定，略分开
  for (const s of ['L', 'R']) {
    const sd = s === 'R' ? -1 : 1;
    aim(b('th' + s, `Bip01 ${s} Thigh`), b('ca' + s, `Bip01 ${s} Calf`), charDir(c, sd * 0.2, -1, s === 'L' ? 0.12 : -0.1));
    aim(b('ca' + s, `Bip01 ${s} Calf`), b('ft' + s, `Bip01 ${s} Foot`), charDir(c, sd * 0.12, -1, -0.06));
  }
  const sp = b('sp', 'Bip01 Spine'), head = b('head', 'Bip01 Head'), neck = b('neck', 'Bip01 Neck');
  const raise = smooth((T - TL.dim + 0.05) / 0.28);        // 举枪
  const shot = T >= TL.shatter ? smooth((T - TL.shatter) / 0.1) : 0;  // 扣扳机后的后坐（头被「打」偏）
  const lower = smooth((T - (TL.attack + 0.5)) / 0.6);      // 出招后放下
  const arm = raise * (1 - lower);
  twist(sp, charDir(c, 1, 0, 0), 0.06 + breathe - shot * 0.12 * (1 - lower) - arm * 0.05);
  twist(sp, UP, -0.12 * arm);
  // 左手：攥拳下垂，略张开（紧绷）
  aim(b('uaL', 'Bip01 L UpperArm'), b('faL', 'Bip01 L Forearm'), charDir(c, 0.38 + arm * 0.12, -0.9, 0.05));
  aim(b('faL', 'Bip01 L Forearm'), b('hdL', 'Bip01 L Hand'), charDir(c, 0.3 + arm * 0.1, -0.88, 0.2));
  // 头：特写时略低头、扣扳机后猛地偏向左侧（远离枪口），随后慢慢回正
  const tremble = T > TL.close && T < TL.shatter ? Math.sin(T * 47) * 0.006 : 0;
  if (head) {
    twist(head, charDir(c, 1, 0, 0), arm * 0.12 + tremble);                 // 低头
    twist(head, charDir(c, 0, 0, 1), arm * 0.08 + shot * 0.28 * (1 - lower * 0.8) - (T > TL.shatter + 0.3 ? 0.06 * smooth((T - TL.shatter - 0.3) / 0.6) : 0)); // 侧偏
  }
  c.root.updateMatrixWorld(true);
  const ua = b('uaR', 'Bip01 R UpperArm'), fa = b('faR', 'Bip01 R Forearm'), hd = b('hdR', 'Bip01 R Hand');
  const hp = wp(head);
  // 太阳穴：头骨骼往上 9cm、往右 10cm
  const temple = hp.clone().addScaledVector(UP, 0.085).addScaledVector(charDir(c, -1, 0, 0), 0.095).addScaledVector(charDir(c, 0, 0, 1), 0.02);
  const gunZ = charDir(c, 1, 0, 0.05).normalize();                // 枪管朝头内（角色左）
  // 枪的摆放：举起时枪口顶在太阳穴；放下时垂在身侧
  const downZ = charDir(c, -0.1, -0.6, 0.8).normalize();
  const z = downZ.clone().lerp(gunZ, arm).normalize();
  const yv = UP.clone().lerp(charDir(c, 0, 0.3, -1).normalize(), (1 - arm) * 0.6).normalize();
  const xv = yv.clone().cross(z).normalize(); const y2 = z.clone().cross(xv).normalize();
  const gunAtTemple = temple.clone().addScaledVector(z, -0.16).addScaledVector(y2, -0.03);
  const gripOff = (zz, yy) => zz.clone().multiplyScalar(-0.02).addScaledVector(yy, -0.045); // 握把中心相对枪原点
  const handAt = gunAtTemple.clone().add(gripOff(z, y2)).addScaledVector(charDir(c, -1, 0, 0), 0.02);
  const handRest = wp(ua).addScaledVector(UP, -0.55).addScaledVector(charDir(c, -1, 0, 0), 0.12).addScaledVector(charDir(c, 0, 0, 1), 0.12);
  const target = handRest.clone().lerp(handAt, arm);
  ik2(ua, fa, hd, target, charDir(c, -0.7, -0.6 + arm * 1.5, -0.1).normalize());
  // 手腕：手掌朝前、握把竖直
  c.root.updateMatrixWorld(true);
  // 手指握拳
  const f1 = b('f1', 'Bip01 R Finger1'), f4 = b('f4', 'Bip01 R Finger4');
  if (f1 && f4) {
    const ax = wp(f4).sub(wp(f1)).normalize();
    for (const n of ['1', '2', '3', '4']) for (const seg of ['', '1', '2']) { const fb = b('fR' + n + seg, `Bip01 R Finger${n}${seg}`); if (fb) twist(fb, ax, CURL * (seg === '' ? 1.1 : 1.3)); }
    const th = b('fR0', 'Bip01 R Finger0'); if (th) twist(th, ax, CURL * 0.4);
  }
  c.root.updateMatrixWorld(true);
  const hpos = wp(hd);
  evoker.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xv, y2, z));
  // 举起时以枪口为准（顶住太阳穴），放下时以手为准
  const gunAtHand = hpos.clone().sub(gripOff(z, y2));
  evoker.position.copy(gunAtHand).lerp(gunAtTemple, arm * 0.85);
  evoker.updateMatrixWorld(true);
  return { temple, head: hp };
}

// —— 人格面具 ——
function personaBase(T) {
  const appear = smooth((T - TL.shatter) / 0.5);
  const lunge = smooth((T - TL.attack + 0.05) / 0.3) * (1 - smooth((T - TL.back + 0.6) / 0.6)); // 出招：人格面具越过召唤者头顶前冲
  return S0.clone().addScaledVector(FWD, lunge * 2.0).addScaledVector(RT, -lunge * 0.4).add(V(0, -lunge * 0.55, 0)).addScaledVector(FWD, -1.1).addScaledVector(RT, 0.2).add(V(0, 0.9 + appear * 0.6 + Math.sin(T * 1.6) * 0.05, 0));
}
function posePersona(T) {
  const c = L.pyro;
  const vis = T >= TL.shatter && T < TL.back;
  c.holder.visible = vis;
  const out = { vis, k: 0 };
  if (!vis) return out;
  const fadeOut = smooth((T - TL.back + 0.35) / 0.35);
  c.holder.position.copy(personaBase(T));
  face(c, c.holder.position.clone().add(FWD).sub(RT.clone().multiplyScalar(0.15)));
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
  const lt = T - TL.close;
  const h = ctx.head.clone().add(V(0, 0.02, 0));
  const pos = h.clone().addScaledVector(FWD, 1.35 - lt * 0.12).addScaledVector(RT, 0.5).add(V(0, -0.08, 0));
  const tgt = h.clone().add(V(0, -0.2, 0)).addScaledVector(RT, 0.02);
  return { pos, tgt, fov: 36, roll: -0.05 + lt * 0.03 };
}
function shotReveal(T) {
  const lt = T - TL.shatter; const pc = personaBase(T).add(V(0, 0.95, 0));
  const a = 0.42 - lt * 0.07;
  const dir = FWD.clone().applyAxisAngle(UP, a);
  const pos = S0.clone().addScaledVector(dir, 3.6 - lt * 0.15).addScaledVector(RT, 0.5).add(V(0, 0.3 + lt * 0.06, 0));
  const tgt = pc.clone().add(V(0, 0.15, 0));
  return { pos, tgt, fov: 50 - lt * 2.5, roll: 0.05 };
}
function shotAttack(T) {
  const lt = T - TL.attack;
  // 斜后方全景：左侧是召唤者 + 头顶的人格面具，右中是敌人（对 B 26.50 构图）
  const pos = S0.clone().addScaledVector(FWD, -3.4 + lt * 0.15).addScaledVector(RT, 3.3).add(V(0, 1.55, 0));
  const tgtEnd = S0.clone().lerp(E0, 0.45).add(V(0, 1.25, 0));
  const tgtStart = S0.clone().addScaledVector(FWD, -2.2).addScaledVector(RT, -1.0).add(V(0, 1.6, 0));
  // 甩镜：0.2s 内视线从人格面具甩到敌人
  const k = cl(lt / 0.2); const kk = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const da = tgtStart.clone().sub(pos).normalize(), db = tgtEnd.clone().sub(pos).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(da, db); const qk = new THREE.Quaternion().slerp(q, kk);
  const tgt = pos.clone().add(da.applyQuaternion(qk).multiplyScalar(6));
  return { pos, tgt, fov: 52, roll: -0.06 * (1 - kk) + 0.02 };
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
function applyCam(p) { camera.position.copy(p.pos); camera.fov = p.fov; camera.updateProjectionMatrix(); camera.lookAt(p.tgt); camera.rotateZ(p.roll); camera.updateMatrixWorld(); }

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
  else if (T >= TL.shatter && T < TL.attack) dim = 0.3;
  else if (T >= TL.attack && T < TL.back) dim = 0.45;
  else if (T >= TL.back) dim = 0.45 + 0.55 * smooth((T - TL.back) / 0.5);
  arena.update(T, dim);
  SHARED.exposure.value = 0.84 * (0.55 + 0.45 * dim);
  // 蓝焰：特写起点燃（扣扳机前已在脚下涌起），显形最旺，出招后减弱，回战斗熄灭
  const fk = T < TL.close ? 0 : T < TL.shatter ? 0.45 + 0.3 * smooth((T - TL.close) / 0.5) : T < TL.back ? 1 : Math.max(0, 1 - (T - TL.back) / 0.6);
  flame.group.position.copy(S0); flame.update(T, fk, camera);
  // 光柱：显形段
  pillar.mesh.position.copy(personaBase(T)).setY(0);
  pillar.update(T, T >= TL.shatter && T < TL.attack ? smooth((T - TL.shatter) / 0.2) * (1 - smooth((T - TL.attack + 0.4) / 0.4)) : 0);
  // 晶翼：显形 0.15s 后展开
  const wo = smooth((T - TL.shatter - 0.15) / 0.7);
  if (pers.vis) { const c = L.pyro; const back = wp(c.holder).add(V(0, 1.25 * c.holder.scale.x, 0)).addScaledVector(FWD, -0.35); wings.group.position.copy(back); wings.group.quaternion.copy(c.holder.quaternion); wings.group.scale.setScalar(c.holder.scale.x * 0.85); }
  wings.update(T, wo, pers.vis ? pers.k : 0);
  // 碎屑 + 羽毛：扣扳机时从太阳穴迸出（特写镜头里看不到，显形镜头里环绕人格面具）
  debris.update(T - TL.shatter, ctx.temple.clone().lerp(personaBase(T).add(V(0, 1.0, 0)), 0.5), 1 - smooth((T - TL.attack + 0.3) / 0.5), camera);
  fire.group.position.copy(E0).addScaledVector(FWD, 0.35); fire.update(T - TL.hit, camera);
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
  state.shatterOn = T >= TL.shatter && T < TL.shatter + 1.1;
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
    shatter.update(T - TL.shatter);
  }
  const wv = setWorld(T);
  // 甩镜方向模糊：按视线角速度（同一镜头内；硬切不算）
  let blurX = 0;
  { const prev = cameraAt(Math.max(0, T - 1 / 60), wv.ctx); const a = wv.cam, d1 = a.tgt.clone().sub(a.pos).normalize(), d0 = prev.tgt.clone().sub(prev.pos).normalize();
    if (a.pos.distanceTo(prev.pos) < 0.3) { const yaw = Math.atan2(d1.x, d1.z) - Math.atan2(d0.x, d0.z); blurX = Math.max(-0.06, Math.min(0.06, yaw * 0.9)); if (Math.abs(blurX) < 0.004) blurX = 0; } }
  // 后处理：特写和显形时暗角加重、色差加大；碎裂瞬间白闪
  const lsh = T - TL.shatter;
  const flash = lsh >= 0 && lsh < 0.04 ? 0.12 : (T - TL.hit >= 0 && T - TL.hit < 0.05 ? 0.25 : 0);
  const close = T >= TL.close && T < TL.attack;
  post.frame(T, { blurX, flash, flashCol: lsh >= 0 && lsh < 0.05 ? 0xd8f4ff : 0xfff0e0, vig: close ? 0.85 : 0.6, ca: close ? 0.0032 : 0.0018, bloomBoost: lsh >= 0 && lsh < 0.6 ? 1.1 : (T >= TL.hit && T < TL.hit + 0.8 ? 1.12 : 1.05) });
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
