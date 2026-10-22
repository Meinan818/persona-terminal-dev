// 同伴专属面具数据表（D-005 / SKINS-V1 §4）。
// 这些面具不在共享 P5R 图鉴里，作为战斗演员注册，但不伪造图鉴条目。

import { registerSyntheticPersona } from './p5r-battle-adapter';

export interface CompanionSkill {
  id: string;
  name: string;
  element: string;
  sourceElement: string;
  sp: number;
  power: number;
  target: string;
}

export interface CompanionPersonaDef {
  id: string;
  name: string;
  level: number;
  element: string;
  elementLabel: string;
  maxHp: number;
  maxSp: number;
  attack: number;
  defense: number;
  resistances: Record<string, string>;
  skills: CompanionSkill[];
}

const skill = (
  id: string,
  name: string,
  element: string,
  power: number,
  sp = 0,
): CompanionSkill => ({ id, name, element, sourceElement: element, sp, power, target: 'enemy' });

const basic = (id: string): CompanionSkill => skill(`${id}-phys`, '普通攻击', 'phys', 18);

const define = (
  id: string,
  name: string,
  element: string,
  elementLabel: string,
  skillPower: number,
  skillName: string,
): CompanionPersonaDef => ({
  id,
  name,
  level: 8,
  element,
  elementLabel,
  maxHp: 80,
  maxSp: 48,
  attack: 20,
  defense: 12,
  resistances: {},
  skills: [
    basic(id),
    skill(`${id}-skill`, skillName, element, skillPower, 6),
  ],
});

export const COMPANION_PERSONAS: CompanionPersonaDef[] = [
  define('captain-kidd', 'Captain Kidd', 'electric', '电击', 30, 'Zio'),
  define('zorro', 'Zorro', 'wind', '疾风', 30, 'Garu'),
  define('carmen', 'Carmen', 'fire', '火焰', 30, 'Agi'),
  define('goemon', 'Goemon', 'ice', '冰冻', 30, 'Bufu'),
  define('johanna', 'Johanna', 'nuclear', '核热', 30, 'Frei'),
  define('milady', 'Milady', 'psy', '念动', 30, 'Psi'),
  define('robin-hood', 'Robin Hood', 'bless', '祝福', 30, 'Kouha'),
  define('cendrillon', 'Cendrillon', 'bless', '祝福', 30, 'Kouha'),
  define('necronomicon', 'Necronomicon', 'almighty', '万能', 24, 'Megido'),
  define('io', 'Io', 'wind', '疾风', 30, 'Garu'),
  define('hermes', 'Hermes', 'fire', '火焰', 30, 'Agi'),
  define('polydeuces', 'Polydeuces', 'electric', '电击', 30, 'Zio'),
  define('penthesilea', 'Penthesilea', 'ice', '冰冻', 30, 'Bufu'),
  define('palladion', 'Palladion', 'phys', '物理', 24, 'Cleave'),
  define('nemesis', 'Nemesis', 'bless', '祝福', 30, 'Kouha'),
  define('cerberus', 'Cerberus', 'fire', '火焰', 30, 'Agi'),
  define('castor', 'Castor', 'phys', '物理', 24, 'Cleave'),
  define('lucia', 'Lucia', 'almighty', '万能', 24, 'Megido'),
  define('jiraiya', 'Jiraiya', 'wind', '疾风', 30, 'Garu'),
  define('tomoe', 'Tomoe', 'ice', '冰冻', 30, 'Bufu'),
  define('konohana-sakuya', 'Konohana Sakuya', 'fire', '火焰', 30, 'Agi'),
  define('take-mikazuchi', 'Take-Mikazuchi', 'electric', '电击', 30, 'Zio'),
  define('kintoki-douji', 'Kintoki-Douji', 'ice', '冰冻', 30, 'Bufu'),
  define('sukuna-hikona', 'Sukuna-Hikona', 'almighty', '万能', 24, 'Megido'),
  define('himiko', 'Himiko', 'almighty', '万能', 24, 'Megido'),
];

let registered = false;

export function registerCompanionPersonas(): void {
  if (registered) return;
  for (const def of COMPANION_PERSONAS) registerSyntheticPersona(def);
  registered = true;
}
