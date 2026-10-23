// P5T 公开数据子集导入：node tools/import-p5t-data.mjs [umbra-assets 路径]
// 读 umbra-assets/p5t/data/skills.json + personas.json（来源/许可见那边 README-data.md：私用参考，不随游戏发布原样分发）
// → src/rules/data/p5t-skills.json、p5t-personas.json（只留引擎要的字段），并写 docs/p5t-data-mapping.md（data.ts 技能名 ↔ 表，含未匹配）
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = process.argv[2] ?? '/workspace/work/umbra-assets';
const SRC = join(ASSETS, 'p5t/data');
const OUT = join(ROOT, 'src/rules/data');
mkdirSync(OUT, { recursive: true });

const names = (n) => ({ en: n?.en ?? null, ja: n?.ja ?? null, 'zh-CN': n?.['zh-CN'] ?? null });
const skills = JSON.parse(readFileSync(join(SRC, 'skills.json'), 'utf8')).map((s) => ({
  id: s.id,
  name: s.name,
  names: names(s.names),
  element: s.elem,
  range: s.range ?? null,
  area: s.area ?? null,
  // cost ≥ 1000（1100）= Unique 的特殊槽，不是 SP（README-data.md）
  sp: typeof s.cost === 'number' && s.cost < 1000 ? s.cost : null,
  gauge: typeof s.cost === 'number' && s.cost >= 1000,
  power: s.power ?? 0,
  passive: s.kind === 'passive' || s.elem === 'pas',
}));
const personas = JSON.parse(readFileSync(join(SRC, 'personas.json'), 'utf8')).map((p) => ({
  name: p.name,
  names: names(p.names),
  lvl: p.lvl,
  stats: p.stats,
  growth: p.growth,
  innate: p.skill ?? null,
}));
writeFileSync(join(OUT, 'p5t-skills.json'), JSON.stringify(skills, null, 0).replace(/\},\{/g, '},\n{') + '\n');
writeFileSync(join(OUT, 'p5t-personas.json'), JSON.stringify(personas, null, 0).replace(/\},\{/g, '},\n{') + '\n');

// ---- 映射文档：data.ts 里的技能（SKILLS + UNIQUES）按英文名找表 ----
const dataTs = readFileSync(join(ROOT, 'src/rules/data.ts'), 'utf8');
const used = [];
for (const m of dataTs.matchAll(/atk\('(\w+)', '([^']+)'/g)) used.push({ id: m[1], name: m[2] });
for (const m of dataTs.matchAll(/\{ id: '(\w+)', name: (['"])(.+?)\2, kind:/g)) used.push({ id: m[1], name: m[3] });
const byName = new Map(skills.map((s) => [s.name.toLowerCase(), s]));
const rows = used.map((u) => ({ ...u, t: byName.get(u.name.toLowerCase()) }));
const unmatched = rows.filter((r) => !r.t);
const md = [
  '# P5T 数据表 ↔ data.ts 技能映射（tools/import-p5t-data.mjs 生成，勿手改）',
  '',
  `来源：umbra-assets/p5t/data/skills.json（${skills.length} 技能）、personas.json（${personas.length} 人格）。许可：私用参考，见 umbra-assets/p5t/data/README-data.md。`,
  '',
  '套用规则（src/rules/p5tData.ts `applyP5t`）：按英文名匹配；伤害公式不变（公开数据没有公式），只换输入。',
  '- 普通技能：sp = 表 cost；power = 表 power；range = 表 range（≥99 记 99；shape=self 的全体技能如 Media 保持 self）。',
  '- 范围（PH 换算）：攻击技能表 area `1x1` → 单体；`WxH` → 以目标为中心的曼哈顿半径 round((W+H−2)/4)（3x3→1、3x5→2、3x7→2、5x9→3、5x11→4、7x13→5）。回复/辅助技能保持原形状。',
  '- Unique（表 cost 1100 = 特殊槽）：只套 power；sp 仍 0（耗 Voltage），射程/形状不换（表的 99 格/3x7 等是 P5T 的放置范围，和引擎 line/self 形状语义不同）。',
  '',
  '| data.ts id | 名字 | 表 id | 元素 | 表 range | 表 area | 表 SP | 表 Power |',
  '|---|---|---|---|---|---|---|---|',
  ...rows.map((r) => r.t
    ? `| ${r.id} | ${r.name} | ${r.t.id} | ${r.t.element} | ${r.t.range} | ${r.t.area} | ${r.t.sp ?? (r.t.gauge ? '槽' : '-')} | ${r.t.power} |`
    : `| ${r.id} | ${r.name} | **未匹配** | | | | | |`),
  '',
  '## 未匹配（保留 data.ts 原值）',
  ...(unmatched.length ? unmatched.map((r) => `- \`${r.id}\` ${r.name}`) : ['- 无']),
  '',
];
writeFileSync(join(ROOT, 'docs/p5t-data-mapping.md'), md.join('\n'));
console.log(`skills ${skills.length}, personas ${personas.length}, data.ts 技能 ${rows.length}，未匹配: ${unmatched.map((r) => r.name).join(', ') || '无'}`);
