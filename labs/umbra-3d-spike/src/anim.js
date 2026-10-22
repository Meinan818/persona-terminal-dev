// 动作接入层：接收 ingest 流水线（extract-kit/ingest/p5r_gfd_to_gltf.py）产出的「每角色一个 GLB、内嵌战斗动作」。
// 换真动作只改配置：MODELS 里填 glb 路径，CLIP_MAP 里填（或靠默认正则命中）动作名。没命中的角色/语义自动回落到程序化姿态。
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { applyToon, Char } from './chars.js';

/** 战斗语义（main.js 的时间轴只说这些词） */
export const ROLES = ['idle', 'attack', 'skill', 'hit', 'down', 'dodge', 'summon'];

/**
 * 语义 → 动作名候选（按顺序：字符串=精确名，RegExp=正则）。
 * P5R 战斗 GAP 的具体文件名要等真文件跑过 ingest 才知道；拿到后在对应角色下补精确名即可，默认正则作兜底。
 * 例：joker: { attack: ['bc0001_attack01', /atk/i] }
 */
export const CLIP_MAP = {
  default: {
    idle: [/idle|wait|stand|loop_?0*1?$/i],
    attack: [/attack|atk|slash|melee/i],
    skill: [/skill|magic|cast|spell/i],
    hit: [/hit|damage|dmg|hurt/i],
    down: [/down|dead|die|faint|knock/i],
    dodge: [/dodge|evade|miss|avoid/i],
    summon: [/summon|persona|mask/i],
  },
  joker: {}, skull: {}, panther: {}, queen: {}, jackfrost: {}, pyrojack: {},
  // 自测用：Pyro Jack FBX → GLTFExporter 导出的 GLB（动作名 idle_00 / attack_00 / damage_00 一类）
  test_pyro: { idle: [/idle/i], attack: [/attack/i], hit: [/damage/i] },
};

/**
 * 模型表。glb 有值就用 GLB（含动作），否则用当前公开素材（DAE/FBX）+ 程序化姿态。
 * ingest 产物放进 public/models/<id>/<id>.glb 后把这里改成路径即可；也可用 URL 参数 ?glb=joker:/models/joker/joker.glb 临时覆盖。
 */
export const MODELS = {
  joker: { glb: null }, skull: { glb: null }, jackfrost: { glb: null }, pyrojack: { glb: null },
};

export function resolveClips(clips, id) {
  const map = { ...CLIP_MAP.default };
  for (const [k, v] of Object.entries(CLIP_MAP[id] || {})) map[k] = [...v, ...(CLIP_MAP.default[k] || [])];
  const out = {};
  for (const role of ROLES) {
    for (const cand of map[role] || []) {
      const hit = clips.find((c) => (typeof cand === 'string' ? c.name === cand : cand.test(c.name)));
      if (hit) { out[role] = hit; break; }
    }
  }
  return out;
}

/** 确定性动作播放：给定 (语义, 本地时间, 上一段语义/时间, 混合比例) 直接摆姿势，固定 t 截图和实时一致。 */
export class ActorAnim {
  constructor(root, clips, id) {
    this.mixer = new THREE.AnimationMixer(root);
    this.byRole = resolveClips(clips, id);
    this.actions = {};
    for (const [role, clip] of Object.entries(this.byRole)) { const a = this.mixer.clipAction(clip); a.play(); a.setEffectiveWeight(0); this.actions[role] = a; }
    this.loops = { idle: true };
  }
  has(role) { return !!this.actions[role]; }
  report() { return Object.fromEntries(ROLES.map((r) => [r, this.byRole[r] ? this.byRole[r].name : null])); }
  /** seg = {role, lt}；prev 可选，blend 0..1 是当前段权重 */
  pose(seg, prev = null, blend = 1) {
    for (const a of Object.values(this.actions)) a.setEffectiveWeight(0);
    const set = (s, w) => { const a = this.actions[s.role]; if (!a) return false; const d = a.getClip().duration || 1; a.time = this.loops[s.role] ? s.lt % d : Math.min(s.lt, d - 1e-3); a.setEffectiveWeight(w); return true; };
    const ok = set(seg, prev ? blend : 1);
    if (prev && blend < 1) set(prev, 1 - blend);
    this.mixer.update(0);
    return ok;
  }
}

/** 时间轴：[{t, role}] → 当前段 + 上一段 + 混合 */
export function segAt(track, T, fade = 0.15) {
  let i = -1; for (let k = 0; k < track.length; k++) if (track[k].t <= T) i = k;
  if (i < 0) return { seg: { role: track[0].role, lt: T }, prev: null, blend: 1 };
  const cur = track[i], seg = { role: cur.role, lt: T - cur.t };
  if (i === 0 || seg.lt >= fade) return { seg, prev: null, blend: 1 };
  const p = track[i - 1];
  return { seg, prev: { role: p.role, lt: T - p.t }, blend: seg.lt / fade };
}

export async function loadGlb(id, url, opt = {}) {
  const g = await new GLTFLoader().loadAsync(url);
  const root = g.scene;
  applyToon(root, id, { ...opt, glb: true });
  const ch = new Char(id, root, opt);
  ch.anim = new ActorAnim(root, g.animations, opt.clipKey || id);
  ch.clips = g.animations;
  return ch;
}

export function glbOverrides(params) {
  const o = {}; for (const v of params.getAll('glb')) { const [id, ...u] = v.split(':'); o[id] = u.join(':'); } return o;
}
