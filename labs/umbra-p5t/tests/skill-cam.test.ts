// r11：技能列表镜头 —— 与原版帧估算值一致（地平线靠近画面上缘、视点在画面中心偏右下、人物 ≈85px@720、地毯 6.18m ≈ 500–620px）
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { SKILL_CAM, poseSkillCam } from '../src/view/skillCam';

const W = 1280, H = 720;
const px = (cam: THREE.Camera, p: THREE.Vector3) => { const v = p.clone().project(cam); return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H }; };
function cam() {
  const c = new THREE.PerspectiveCamera(SKILL_CAM.fov, W / H, 0.1, 300);
  poseSkillCam(c, new THREE.Vector3(0, 0, 0), 0, SKILL_CAM.dist, THREE.MathUtils.degToRad(SKILL_CAM.pitchDeg), W, H);
  return c;
}
describe('r11 skill camera', () => {
  it('视点落在 (0.55W, 0.6H)', () => {
    const p = px(cam(), new THREE.Vector3(0, 0, 0));
    expect(p.x).toBeCloseTo(W * (0.5 + SKILL_CAM.offX), 0); expect(p.y).toBeCloseTo(H * (0.5 + SKILL_CAM.offY), 0);
  });
  it('地平线在画面上缘附近（原版 1756_8 地毯边线消失点 y≈17）', () => {
    const p = px(cam(), new THREE.Vector3(0, 0, -1e5));
    expect(p.y).toBeGreaterThan(-40); expect(p.y).toBeLessThan(110);
  });
  it('视点处 1.1m 角色约 70–110px、6.18m 红地毯约 450–650px', () => {
    const c = cam();
    const h = px(c, new THREE.Vector3(0, 0, 0)).y - px(c, new THREE.Vector3(0, 1.1, 0)).y;
    expect(h).toBeGreaterThan(70); expect(h).toBeLessThan(110);
    const w = px(c, new THREE.Vector3(3.09, 0, 0)).x - px(c, new THREE.Vector3(-3.09, 0, 0)).x;
    expect(w).toBeGreaterThan(450); expect(w).toBeLessThan(650);
  });
});
