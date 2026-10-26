// r12：原版透视战斗镜头 / 回合切换 prefab+曲线 / 结算布局 / 指令菜单 的数据钉子
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CameraRig, SHOTS, BATTLE_FOV } from '../src/view/cameraRig';
import TC from '../src/ui/data/turn-change.json';
import RL from '../src/ui/data/result-layout.json';

const W = 1280, H = 720;
function idleRig(focus: THREE.Vector3) {
  const rig = new CameraRig(new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100));
  rig.baseYaw = 0;
  rig.setMap({ width: 9, height: 18, maxY: 1.4 }, W / H, false, H);
  rig.focus(focus); rig.cur = { ...rig.tgt }; rig.apply();
  return rig;
}
const px = (rig: CameraRig, x: number, z: number) => { const v = new THREE.Vector3(x, 0, z).project(rig.pcam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };

describe('r12 原版常规战斗镜头（hud_idle_1212 反求）', () => {
  it('参数在帧拟合值附近', () => {
    expect(BATTLE_FOV).toBeCloseTo(41, 0);
    expect(SHOTS.idle.pitch).toBeCloseTo(19, 0); expect(SHOTS.idle.dist).toBeCloseTo(11, 0);
    expect(SHOTS.unit.pitch).toBeGreaterThan(SHOTS.idle.pitch);
  });
  it('对准 Joker(5,14) 时已知格点落在原版帧像素附近（±30px）', () => {
    const rig = idleRig(new THREE.Vector3(5, 0, 14));
    const cases: [number, number, number, number][] = [[5, 14, 632, 585], [3, 14, 345, 590], [4, 10.45, 542, 395], [2, 10.45, 352, 395], [6, 10.45, 737, 395], [1, 5.45, 378, 277], [7, 5.45, 770, 278]];
    for (const [x, z, u, v] of cases) { const [a, b] = px(rig, x, z); expect(Math.abs(a - u)).toBeLessThan(30); expect(Math.abs(b - v)).toBeLessThan(30); }
  });
  it('?cam=ortho 回退：persp=false 时 view 为正交镜头', () => {
    const rig = new CameraRig(new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100)); rig.persp = false;
    expect(rig.view).toBe(rig.cam);
  });
});

describe('r12 回合切换（prefab_ui2d_turn_change_* + turn_start 曲线）', () => {
  it('两套 prefab 与 2.0s 曲线齐全，字样 sprite 已绑定', () => {
    expect(TC.clipAlly.len).toBeCloseTo(2, 3); expect(TC.clipEnemy.len).toBeCloseTo(2, 3);
    const s = JSON.stringify(TC.enemy);
    for (const sp of ['ENEMY_TURN_1', 'ENEMY_TURN_2', 'ENEMY_TURN_3', 'ENEMY_TURN_4', 'ENEMY_TURN_card', 'ENEMY_TURN_kuroobi', 'ENEMY_TURN_ENEMY']) expect(s).toContain(sp);
    expect(JSON.stringify(TC.ally)).toContain('YOUR_TURN_YOUR_TURN');
    const attrs = TC.clipEnemy.curves.map((c) => c.a);
    for (const a of ['m_Alpha', 'm_FillAmount', 'm_Padding.z', 'm_Color.a', 'm_AnchoredPosition.x']) expect(attrs).toContain(a);
  });
});

describe('r12 结算布局（prefab_ui2d_result_win）', () => {
  const p1 = RL.p1 as Record<string, number[]>, p2 = RL.p2 as unknown as Record<string, number[]>;
  it('与原版帧大致对位（1920 画布 = 720p×1.5）', () => {
    // result_1610：money 牌 x480–870 y20–170（720p）；persona exp 右下；继续键下方居中
    expect(p1.money_base[0]).toBeGreaterThan(680); expect(p1.money_base[0] + p1.money_base[2]).toBeLessThan(1320);
    expect(p1.pexp_base[0]).toBeGreaterThan(960);
    expect(p1.next[1]).toBeGreaterThan(850);
    // result_2606：turn 牌右侧 x970–1240（720p）、award 中下
    expect(p2.turn_base[0]).toBeGreaterThan(1400); expect(p2.award_base[1]).toBeGreaterThan(650);
    expect((RL.p2 as { award_rows: unknown[] }).award_rows.length).toBe(3);
  });
  it('L01 奖励取 stage_rewards 1010', () => { expect((RL.rewards as Record<string, { money: number }>).L01.money).toBe(60); });
});
