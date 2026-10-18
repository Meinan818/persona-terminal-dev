/**
 * 影时间据点 NPC。当前只做关系温度与短句，不接主 App 的 Coop 正文。
 */

export const NPCS = [
  {
    id: 'velvet',
    name: '双子看守',
    role: '天鹅绒房间',
    line: '“名字留下，门才会记得你。”',
  },
  {
    id: 'gunsmith',
    name: '军品店老板',
    role: '武器与防具',
    line: '“别问它杀过谁。问它还撑不撑得住。”',
  },
  {
    id: 'doctor',
    name: '诊所医生',
    role: '恢复与药品',
    line: '“坐下。你的手比昨天抖。”',
  },
  {
    id: 'shopkeeper',
    name: '便利店店员',
    role: '补给与传闻',
    line: '“今晚的月亮，看起来不太对。”',
  },
];

export function trustLabel(value = 0) {
  const trust = Math.max(0, Math.min(5, Math.floor(Number(value) || 0)));
  return ['陌生', '眼熟', '会点头', '愿意多說一句', '记得你的习惯', '等你回来'][trust];
}

export function createNpcTrust() {
  return Object.fromEntries(NPCS.map(npc => [npc.id, 0]));
}
