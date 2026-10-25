// r8：伤害数字照原版 prefab_ui2d_damageview（Codex a53ccda）——
//   结构：Damage(alpha) > ofs(位移) > AnimScaler(缩放) > CodeScaler > GameObject(scaleX .75、绕 Z 转 5°) > 数字
//   动画：原版 anime_btl_damage（AnimScaler 0.5→1.2→1.0、ofs.y −100→0→+100、alpha 0→1→0，0.8s 结束）、
//         anime_btl_heal（回复）、anim_ui2d_damage_resist（resist 标）——按 Unity Hermite 曲线逐帧求值。
// 数字字形 = 原版 TMP SDF 字体 FOT_YURUKASTD_UB_SDF_BattleNumber2（原 prefab 的数字是运行时赋值的 Sprite，没导出 → 用同风格的原版战斗数字字体代替，已标明）。
// 画布单位 → 像素：原版 Canvas 1920×1080（prefab_ui2d_skillrange_target 尺寸），按屏高匹配：1u = innerHeight/1080 px。
// CodeScaler 由代码按距离设置（值未知）→ 取 CODE_SCALE（自定，已标明）。
import { DMG_CLIPS, DMG_LAYOUT } from './damageClips';

type Key = [number, number, number, number];
/** Unity AnimationCurve 求值（Hermite，切线 = inSlope/outSlope；超出范围取端点） */
export function evalCurve(keys: Key[] | undefined, t: number, dflt = 0): number {
  if (!keys || !keys.length) return dflt;
  if (t <= keys[0][0]) return keys[0][1];
  const last = keys[keys.length - 1];
  if (t >= last[0]) return last[1];
  let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const [t0, v0, , o0] = keys[i]; const [t1, v1, i1] = keys[i + 1];
  const dt = t1 - t0; if (dt <= 0) return v1;
  if (!isFinite(o0) || !isFinite(i1)) return v0; // 阶梯
  const s = (t - t0) / dt, s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * v0 + (s3 - 2 * s2 + s) * o0 * dt + (-2 * s3 + 3 * s2) * v1 + (s3 - s2) * i1 * dt;
}
export const CODE_SCALE = 0.5;
const G = DMG_LAYOUT['Damage/ofs/AnimScaler/CodeScaler/GameObject'];
export const DIGIT_H = DMG_LAYOUT['Damage/ofs/AnimScaler/CodeScaler/GameObject/number1'].size_delta.y; // 124u

/** 包一层原版节点结构，返回根元素；canvas = 已用 SDF 字体画好的数字 */
export function buildDamageView(content: HTMLElement, resist?: HTMLElement): { root: HTMLElement; ofs: HTMLElement; scaler: HTMLElement; resist?: HTMLElement } {
  const root = document.createElement('div'); root.className = 'dmgv';
  const ofs = document.createElement('div'); ofs.className = 'dmgv-ofs';
  const scaler = document.createElement('div'); scaler.className = 'dmgv-sc';
  const go = document.createElement('div'); go.className = 'dmgv-go';
  // 原版 GameObject：scale (0.75, 1)、rotation z = +5°（Unity 逆时针 → CSS 负角）
  go.style.transform = `rotate(${-G.rotation_euler_deg.z}deg) scale(${G.scale.x}, ${G.scale.y})`;
  go.appendChild(content);
  scaler.appendChild(go); ofs.appendChild(scaler); root.appendChild(ofs);
  if (resist) { resist.classList.add('dmgv-resist'); root.appendChild(resist); }
  return { root, ofs, scaler, resist };
}
/** 播原版剪辑；body.frozen（顿帧）时暂停计时。结束回调 */
export function playDamageClip(v: ReturnType<typeof buildDamageView>, clipName: 'anime_btl_damage' | 'anime_btl_heal', onEnd: () => void) {
  const clip = DMG_CLIPS[clipName]; const c = clip.curves;
  const rs = DMG_CLIPS.anim_ui2d_damage_resist.curves['.:m_AnchoredPosition.y'];
  const end = clipName === 'anime_btl_damage' ? 0.8 : 0.75;
  let t = 0; let last = performance.now();
  const u = () => window.innerHeight / 1080;
  const step = (now: number) => {
    const dt = (now - last) / 1000; last = now;
    if (!document.body.classList.contains('frozen')) t += dt;
    const k = u() * CODE_SCALE;
    const a = evalCurve(c['.:m_Alpha'], t, 1);
    const sx = evalCurve(c['ofs/AnimScaler:scale.x'], t, 1), sy = evalCurve(c['ofs/AnimScaler:scale.y'], t, 1);
    const ox = evalCurve(c['ofs:m_AnchoredPosition.x'], t, 0), oy = evalCurve(c['ofs:m_AnchoredPosition.y'], t, 0);
    v.root.style.opacity = String(a);
    v.ofs.style.transform = `translate(${ox * k}px, ${-oy * k}px)`; // Unity y 向上
    v.scaler.style.transform = `scale(${sx}, ${sy})`;
    if (v.resist) v.resist.style.transform = `translate(-50%, ${-evalCurve(rs, t, -190) * k * 0.6}px) scale(.6)`;
    if (t < end) requestAnimationFrame(step); else onEnd();
  };
  requestAnimationFrame(step);
}
/** 数字字形高度（px）：原版数字格 124u × CodeScaler × 屏幕比例 */
export const digitPx = (heavy: boolean) => DIGIT_H * (window.innerHeight / 1080) * CODE_SCALE * (heavy ? 1.15 : 1);
