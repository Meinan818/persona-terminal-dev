// r11：技能列表 / 选目标镜头参数（原版 skill_list_1716_5/1717_2/1733_5/1756_8 估算，见 notes/P5T-R11-2026-10-26.md）。
// 帧上：地平线在 y≈17/720 附近 → 俯角 ≈ 半个垂直 FOV；红地毯 6.18m 在 y=430 宽 ≈560px、敌人 ≈85px。
// FOV 与俯角只能约束在「俯角 ≈ FOV/2」这条线上 → 取 vFOV 40°（推断；原版镜头参数 ScriptableObject 未导出）、俯角 19°、视点距离 11m。
import * as THREE from 'three';
export const SKILL_CAM = { fov: 40, pitchDeg: 19, dist: 11, offX: 0.05, offY: 0.1, ease: 0.12 };
/** 由视点、方位（相机在视点的 (sin yaw, cos yaw) 方向）、距离、俯角摆相机；视点落在画面 (0.5+offX, 0.5+offY) */
export function poseSkillCam(cam: THREE.PerspectiveCamera, look: THREE.Vector3, yaw: number, dist: number, pitch: number, W: number, H: number) {
  const cp = Math.cos(pitch);
  cam.position.set(look.x + Math.sin(yaw) * cp * dist, look.y + Math.sin(pitch) * dist, look.z + Math.cos(yaw) * cp * dist);
  cam.up.set(0, 1, 0); cam.lookAt(look);
  cam.aspect = W / Math.max(1, H); cam.fov = SKILL_CAM.fov;
  cam.setViewOffset(W, H, -SKILL_CAM.offX * W, -SKILL_CAM.offY * H, W, H);
  cam.updateProjectionMatrix(); cam.updateMatrixWorld();
}
