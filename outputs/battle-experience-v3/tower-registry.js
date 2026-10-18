/**
 * 逆影战场塔层注册表。
 * 三个塔层共用战斗、Persona 和商店规则，只改变路线密度与警戒压力。
 */

export const TOWER_STRATA = [
  {
    id: 'echo',
    name: '回声之庭',
    subtitle: 'ECHO COURT',
    rule: '标准警戒。每层一张房间图，每 10 层有安全屋。',
    riskBonus: 0,
    eliteBias: 0,
    trapBias: 0,
  },
  {
    id: 'vanity',
    name: '虚荣剧场',
    subtitle: 'VANITY STAGE',
    rule: '灯光更亮，影子更吵。警戒上升更快，强敌与宝箱更多。',
    riskBonus: 2,
    eliteBias: 1,
    trapBias: 0,
  },
  {
    id: 'escape',
    name: '逃避回廊',
    subtitle: 'ESCAPE CORRIDOR',
    rule: '路更窄，机关更多。警戒上升稍慢，陷阱与钥匙更常见。',
    riskBonus: -1,
    eliteBias: 0,
    trapBias: 1,
  },
];

export function getStratum(id) {
  return TOWER_STRATA.find(stratum => stratum.id === id) ?? TOWER_STRATA[0];
}

export function adjustRoute(route, stratum) {
  const next = [...route];
  if (stratum.eliteBias > 0) {
    for (let i = next.length - 1; i >= 0; i -= 1) {
      if (next[i] !== 'elite') {
        next[i] = 'elite';
        break;
      }
    }
  }
  if (stratum.trapBias > 0) {
    for (let i = 0; i < next.length; i += 1) {
      if (next[i] !== 'trap') {
        next[i] = i === 0 ? 'trap' : 'key';
        break;
      }
    }
  }
  return next;
}
