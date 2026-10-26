// r16c：武器手部特写探针页（只渲染一个角色 + 武器，无地图/HUD）。tools/r16c-weapon-shot.mjs 驱动。
import * as THREE from 'three';
import { preloadChar, makeChar } from '../src/view/p5tChar';
const W = 640, H = 360;
const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(W, H); renderer.outputColorSpace = THREE.SRGBColorSpace; document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x8a8fa0);
scene.add(new THREE.HemisphereLight(0xffffff, 0x666677, 2.2)); const sun = new THREE.DirectionalLight(0xffffff, 2); sun.position.set(2, 4, 3); scene.add(sun);
const cam = new THREE.PerspectiveCamera(30, W / H, 0.01, 50);
type Rig = ReturnType<typeof makeChar> & Record<string, any>;
let rig: Rig | null = null;
(window as any).__wp = {
  async load(key: string) { if (!(await preloadChar(key))) return false; if (rig) scene.remove(rig.root); rig = makeChar(key) as Rig; if (!rig) return false; scene.add(rig.root); return true; },
  pose(clip: string, kind: 'gun' | 'melee', t: number) {
    const r = rig!; const Wn = kind === 'gun' ? 'Gun' : 'Sword';
    if (!r.act.has(clip)) return { missing: true };
    let wp: THREE.Object3D | null = null;
    for (const w of r.wps) { const mine = w.obj.name.includes(`_${Wn}_`); w.show = () => mine; if (mine) wp = w.obj; }
    if (!wp) return { noWeapon: true };
    r.seq = []; r.oneShot = null; r.dead = false; r.downed = false; r.aimUntil = 1e15; r.baseKey = clip;
    r.mixer.stopAllAction(); r.cur = null; r.play(clip, 0); r.setYaw(0);
    r.mixer.update(t); r.updateWeapons(); r.root.updateMatrixWorld(true);
    const w = wp as THREE.Object3D; const loc = w.parent!, hand = loc.parent!;
    const hw = hand.getWorldPosition(new THREE.Vector3()), lw = loc.getWorldPosition(new THREE.Vector3());
    const fire = w.getObjectByName('Loc_WpGun_Fire'); let fireDir: number[] | null = null;
    if (fire) { const a = fire.getWorldPosition(new THREE.Vector3()), c = (w.getObjectByName('Jnt_C_WpGunCenter_00') ?? loc).getWorldPosition(new THREE.Vector3()); fireDir = a.sub(c).normalize().toArray().map((v) => +v.toFixed(2)); }
    const side = /_L$/.test(loc.name) ? 1 : -1; // 角色朝 +z；左手在 +x
    const focus = hw.clone().lerp(new THREE.Box3().setFromObject(w).getCenter(new THREE.Vector3()), 0.5);
    cam.position.copy(focus).add(new THREE.Vector3(side * 0.55, 0.12, 0.75)); cam.lookAt(focus);
    renderer.render(scene, cam);
    // r16c：握持方向 = 武器包围盒中心 − 挂点，换到手骨局部坐标（各状态与参照状态比夹角 → 握持是否一致）；枪另算枪管与角色正前方 +z 的夹角
    const bc = new THREE.Box3().setFromObject(w).getCenter(new THREE.Vector3());
    const gripDir = bc.sub(lw).transformDirection(new THREE.Matrix4().copy(hand.matrixWorld).invert()).normalize().toArray().map((v) => +v.toFixed(4));
    const aimDeg = fireDir ? +THREE.MathUtils.radToDeg(new THREE.Vector3(...fireDir).normalize().angleTo(new THREE.Vector3(0, 0, 1))).toFixed(1) : null;
    return { gripDir, aimDeg, loc: loc.name, hand: hand.name, locHandDist_cm: +(lw.distanceTo(hw) * 100).toFixed(1), fireDir, clipDrivesLoc: r.act.get(clip).getClip().tracks.some((tr: THREE.KeyframeTrack) => tr.name.startsWith(loc.name + '.')), locScale: +loc.scale.x.toFixed(3) };
  },
};
  /** 求枪的瞄准校正：GunLoop（射击循环，原版就是朝正前方瞄准目标）里枪管方向（Jnt_C_WpGunCenter_00 → Loc_WpGun_Fire）应 = 角色正前方 +z。
   *  返回挂点空间里的最小旋转 C（欧拉 XYZ，弧度）：world = locWorld · C · weapon。 */
(window as any).__wp.aimFix = (t = 0.4) => {
  const r = rig!; const res = (window as any).__wp.pose('GunLoop', 'gun', t); if (res.missing || res.noWeapon) return res;
  const w = r.wps.find((x: any) => x.obj.name.includes('_Gun_')).obj as THREE.Object3D; const loc = w.parent!;
  w.rotation.set(0, 0, 0); r.root.updateMatrixWorld(true);
  const toLoc = new THREE.Matrix4().copy(loc.matrixWorld).invert();
  const f = w.getObjectByName('Loc_WpGun_Fire')!.getWorldPosition(new THREE.Vector3()).applyMatrix4(toLoc);
  const c = (w.getObjectByName('Jnt_C_WpGunCenter_00') ?? loc).getWorldPosition(new THREE.Vector3()).applyMatrix4(toLoc);
  const b = f.sub(c).normalize();
  const fw = new THREE.Vector3(0, 0, 1).transformDirection(toLoc).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(b, fw); const e = new THREE.Euler().setFromQuaternion(q);
  return { deg: +THREE.MathUtils.radToDeg(b.angleTo(fw)).toFixed(1), euler: [e.x, e.y, e.z].map((v) => +v.toFixed(4)) };
};
(window as any).__wpReady = true;
