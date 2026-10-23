// P5T 公开数据子集（tools/import-p5t-data.mjs 从 umbra-assets/p5t/data 生成 src/rules/data/*.json；许可：私用参考）
// 用途：data.ts 的技能按英文名从这里取 sp / power / range / area。伤害公式不变（公开数据没有公式），只换输入。
// 规则说明与未匹配清单：docs/p5t-data-mapping.md
import skillsJson from './data/p5t-skills.json';
import personasJson from './data/p5t-personas.json';
import type { SkillDef } from './types';

export interface P5tSkill {
  id: number; name: string; names: { en: string | null; ja: string | null; 'zh-CN': string | null };
  element: string; range: number | null; area: string | null;
  /** SP 消耗；null = Unique 特殊槽（表 cost 1100） */
  sp: number | null; gauge: boolean; power: number; passive: boolean;
}
export interface P5tPersona {
  name: string; names: { en: string | null; ja: string | null; 'zh-CN': string | null };
  lvl: number; stats: { HP: number; SP: number; Melee: number; Gun: number };
  growth: { HP: number; SP: number; Melee: number; Gun: number }; innate: string | null;
}

export const P5T_SKILLS = skillsJson as P5tSkill[];
export const P5T_PERSONAS = personasJson as P5tPersona[];
const SK = new Map(P5T_SKILLS.map((s) => [s.name.toLowerCase(), s]));
const PE = new Map(P5T_PERSONAS.map((p) => [p.name.toLowerCase(), p]));
export const p5tSkill = (name: string): P5tSkill | undefined => SK.get(name.toLowerCase());
export const p5tPersona = (name: string): P5tPersona | undefined => PE.get(name.toLowerCase());

/** 表射程上限（99/100 = 全图） */
export const P5T_MAX_RANGE = 99;
/** PH 换算：P5T 的 WxH 范围 → 引擎曼哈顿半径（1x1 = 单体 → 0） */
export function areaRadius(area: string | null): number {
  const m = /^(\d+)x(\d+)$/.exec(area ?? '');
  if (!m) return 0;
  const w = Number(m[1]), h = Number(m[2]);
  return w === 1 && h === 1 ? 0 : Math.round((w + h - 2) / 4);
}

/** 没匹配上的 data.ts 技能名（docs/p5t-data-mapping.md 也有一份） */
export const P5T_UNMATCHED: string[] = [];

/** 一个技能套表：返回新 SkillDef（不改原对象）。没匹配 → 原样返回并记入 P5T_UNMATCHED */
export function applyP5t(s: SkillDef): SkillDef {
  const t = p5tSkill(s.name);
  if (!t || t.passive) { if (!P5T_UNMATCHED.includes(s.name)) P5T_UNMATCHED.push(s.name); return s; }
  if (s.voltage) return { ...s, power: t.power }; // Unique：只换 power，耗 Voltage、形状不换
  const out: SkillDef = { ...s, power: t.power };
  if (t.sp != null) out.sp = t.sp;
  if (s.shape !== 'self' && t.range != null) out.range = Math.min(t.range, P5T_MAX_RANGE);
  if (s.kind === 'attack' && (s.shape === 'single' || s.shape === 'area')) {
    const r = areaRadius(t.area);
    if (r > 0) { out.shape = 'area'; out.radius = r; } else { out.shape = 'single'; delete out.radius; }
  }
  return out;
}
export function applyP5tAll<T extends Record<string, SkillDef>>(o: T): T {
  return Object.fromEntries(Object.entries(o).map(([k, s]) => [k, applyP5t(s)])) as T;
}
